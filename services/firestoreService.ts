import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, setDoc } from 'firebase/firestore';
import { Order, Quote, AppSettings } from '../types';

// Collection References
const QUOTES_COL = 'quotes';
const ORDERS_COL = 'orders';
const SETTINGS_COL = 'settings';
const SETTINGS_DOC_ID = 'general_settings';

// Helper to strip undefined values for Firestore
const cleanData = (data: any) => {
    const cleaned: any = {};
    Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
            cleaned[key] = data[key];
        }
    });
    return cleaned;
};

export const FirestoreService = {
    subscribeToQuotes: (callback: (quotes: Quote[]) => void) => {
        if (!db) return () => {};
        const q = query(collection(db, QUOTES_COL));
        return onSnapshot(q, (snapshot) => {
            const quotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quote));
            callback(quotes);
        });
    },

    addQuote: async (quote: Quote) => {
        if (!db) return;
        const { id, ...data } = quote; // Let firestore generate ID or use provided
        await addDoc(collection(db, QUOTES_COL), cleanData(data));
    },

    updateQuote: async (quote: Quote) => {
        if (!db) return;
        const quoteRef = doc(db, QUOTES_COL, quote.id);
        const { id, ...data } = quote;
        await updateDoc(quoteRef, cleanData(data));
    },

    deleteQuote: async (id: string) => {
        if (!db) return;
        await deleteDoc(doc(db, QUOTES_COL, id));
    },

    subscribeToOrders: (callback: (orders: Order[]) => void) => {
        if (!db) return () => {};
        const q = query(collection(db, ORDERS_COL));
        return onSnapshot(q, (snapshot) => {
            const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
            callback(orders);
        });
    },

    addOrder: async (order: Order) => {
        if (!db) return;
        const { id, ...data } = order;
        await addDoc(collection(db, ORDERS_COL), cleanData(data));
    },

    updateOrder: async (order: Order) => {
        if (!db) return;
        const orderRef = doc(db, ORDERS_COL, order.id);
        const { id, ...data } = order;
        await updateDoc(orderRef, cleanData(data));
    },

    deleteOrder: async (id: string) => {
        if (!db) return;
        await deleteDoc(doc(db, ORDERS_COL, id));
    },

    subscribeToSettings: (callback: (settings: AppSettings | null) => void) => {
        if (!db) return () => {};
        return onSnapshot(doc(db, SETTINGS_COL, SETTINGS_DOC_ID), (doc) => {
            if (doc.exists()) {
                callback(doc.data() as AppSettings);
            } else {
                callback(null);
            }
        });
    },

    updateSettings: async (settings: AppSettings) => {
        if (!db) return;
        await setDoc(doc(db, SETTINGS_COL, SETTINGS_DOC_ID), cleanData(settings));
    }
};
