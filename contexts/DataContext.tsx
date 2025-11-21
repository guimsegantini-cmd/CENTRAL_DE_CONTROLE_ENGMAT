import React, { createContext, useContext, useState, useEffect } from 'react';
import { Quote, Order, AppSettings } from '../types';
import { StorageService, getFromStorage, saveToStorage } from '../services/storageService';
import { FirestoreService } from '../services/firestoreService';
import { isFirebaseConfigured } from '../lib/firebase';
import { DEFAULT_LEAD_TIME_DAYS, addDays, parseISO, format } from '../constants';
import { useAuth } from './AuthContext';

interface DataContextType {
  quotes: Quote[];
  orders: Order[];
  settings: AppSettings;
  addQuote: (quote: Quote) => void;
  updateQuote: (quote: Quote) => void;
  deleteQuote: (id: string) => void;
  addOrder: (order: Order) => void;
  updateOrder: (order: Order) => void;
  deleteOrder: (id: string) => void;
  updateSettings: (settings: AppSettings) => void;
  getLeadTime: (product: string) => number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const defaultSettings: AppSettings = {
  products: {},
  targets: {}
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    if (isFirebaseConfigured) {
        if (user) {
            // Real-time subscriptions only if authenticated
            const unsubQuotes = FirestoreService.subscribeToQuotes(setQuotes);
            const unsubOrders = FirestoreService.subscribeToOrders(setOrders);
            const unsubSettings = FirestoreService.subscribeToSettings((data) => {
                if (data) setSettings(data);
            });

            return () => {
                unsubQuotes();
                unsubOrders();
                unsubSettings();
            };
        } else {
            // Clear data on logout
            setQuotes([]);
            setOrders([]);
        }
    } else {
        // Fallback to Local Storage
        setQuotes(getFromStorage(StorageService.QUOTES, []));
        setOrders(getFromStorage(StorageService.ORDERS, []));
        setSettings(getFromStorage(StorageService.SETTINGS, defaultSettings));
    }
  }, [user]);

  // --- Handlers (Switch between Firebase and Local Storage) ---

  const addQuote = (quote: Quote) => {
    if (isFirebaseConfigured) {
        FirestoreService.addQuote(quote);
    } else {
        const newQuotes = [...quotes, quote];
        setQuotes(newQuotes);
        saveToStorage(StorageService.QUOTES, newQuotes);
    }
  };

  const updateQuote = (quote: Quote) => {
    if (isFirebaseConfigured) {
        FirestoreService.updateQuote(quote);
    } else {
        const newQuotes = quotes.map(q => q.id === quote.id ? quote : q);
        setQuotes(newQuotes);
        saveToStorage(StorageService.QUOTES, newQuotes);
    }
  };

  const deleteQuote = (id: string) => {
    if (isFirebaseConfigured) {
        FirestoreService.deleteQuote(id);
    } else {
        const newQuotes = quotes.filter(q => q.id !== id);
        setQuotes(newQuotes);
        saveToStorage(StorageService.QUOTES, newQuotes);
    }
  };

  const getLeadTime = (product: string) => {
    return settings.products[product]?.leadTimeDays || DEFAULT_LEAD_TIME_DAYS;
  };

  const addOrder = (order: Order) => {
    let finalOrder = { ...order };
    if (!finalOrder.poNumber) {
        const count = orders.length + 1;
        finalOrder.poNumber = `OC-${new Date().getFullYear()}-${count.toString().padStart(4, '0')}`;
    }
    
    if (!finalOrder.isManualDeliveryDate) {
        const leadTime = getLeadTime(finalOrder.product);
        const sendDate = parseISO(finalOrder.sendDate);
        finalOrder.deliveryDate = format(addDays(sendDate, leadTime), 'yyyy-MM-dd');
    }

    if (isFirebaseConfigured) {
        FirestoreService.addOrder(finalOrder);
    } else {
        const newOrders = [...orders, finalOrder];
        setOrders(newOrders);
        saveToStorage(StorageService.ORDERS, newOrders);
    }
  };

  const updateOrder = (order: Order) => {
    let finalOrder = { ...order };
    
    // Logic to recalculate delivery date if needed (shared)
    const oldOrder = orders.find(o => o.id === order.id);
    if (oldOrder) {
        const needsRecalc = !finalOrder.isManualDeliveryDate && 
            (finalOrder.sendDate !== oldOrder.sendDate || finalOrder.product !== oldOrder.product);
        
        if (needsRecalc) {
             const leadTime = getLeadTime(finalOrder.product);
             const sendDate = parseISO(finalOrder.sendDate);
             finalOrder.deliveryDate = format(addDays(sendDate, leadTime), 'yyyy-MM-dd');
        }
    }

    if (isFirebaseConfigured) {
        FirestoreService.updateOrder(finalOrder);
    } else {
        const newOrders = orders.map(o => o.id === order.id ? finalOrder : o);
        setOrders(newOrders);
        saveToStorage(StorageService.ORDERS, newOrders);
    }
  };

  const deleteOrder = (id: string) => {
    if (isFirebaseConfigured) {
        FirestoreService.deleteOrder(id);
    } else {
        const newOrders = orders.filter(o => o.id !== id);
        setOrders(newOrders);
        saveToStorage(StorageService.ORDERS, newOrders);
    }
  };

  const updateSettings = (newSettings: AppSettings) => {
    if (isFirebaseConfigured) {
        FirestoreService.updateSettings(newSettings);
    } else {
        setSettings(newSettings);
        saveToStorage(StorageService.SETTINGS, newSettings);
    }
  };

  return (
    <DataContext.Provider value={{
      quotes,
      orders,
      settings,
      addQuote,
      updateQuote,
      deleteQuote,
      addOrder,
      updateOrder,
      deleteOrder,
      updateSettings,
      getLeadTime
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
