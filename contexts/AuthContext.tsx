import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import { StorageService, getFromStorage, saveToStorage } from '../services/storageService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                setUser({
                    email: firebaseUser.email || '',
                    name: firebaseUser.email?.split('@')[0] || 'Usuário'
                });
            } else {
                setUser(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    } else {
        // Fallback to local storage for demo mode if keys aren't set
        const storedUser = getFromStorage<User | null>(StorageService.USER, null);
        if (storedUser) setUser(storedUser);
        setLoading(false);
    }
  }, []);

  const login = async (email: string, password?: string) => {
    setError(null);
    if (isFirebaseConfigured && auth && password) {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (e: any) {
            setError(e.message);
            throw e;
        }
    } else {
        // Demo Login
        const newUser: User = {
            email,
            name: email.split('@')[0],
        };
        setUser(newUser);
        saveToStorage(StorageService.USER, newUser);
    }
  };

  const register = async (email: string, password: string) => {
     setError(null);
     if (isFirebaseConfigured && auth) {
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (e: any) {
            setError(e.message);
            throw e;
        }
     } else {
         // In demo mode, register just logs in
         login(email);
     }
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth) {
        await signOut(auth);
    } else {
        setUser(null);
        saveToStorage(StorageService.USER, null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user, loading, error }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
