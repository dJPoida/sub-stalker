import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useState, useEffect } from 'react';
import { Toaster } from './components/ui/sonner';
import Dashboard from './components/Dashboard';
import Subscriptions from './components/Subscriptions';
import Settings from './components/Settings';
import Status from './components/Status';
import Tools from './components/Tools';
import SignIn from './components/auth/SignIn';
import SignUp from './components/auth/SignUp';
import Layout from './components/Layout';
import AuthLayout from './components/auth/AuthLayout';

// Mock authentication context
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly' | 'weekly' | 'quarterly';
  nextChargeDate: string;
  category: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface AppSettings {
  currency: string;
  dateFormat: string;
  reminderDays: number;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

interface AppContextType {
  user: User | null;
  subscriptions: Subscription[];
  settings: AppSettings;
  signIn: (email: string, password: string) => void;
  signUp: (email: string, password: string, name: string) => void;
  signOut: () => void;
  addSubscription: (subscription: Omit<Subscription, 'id' | 'createdAt'>) => void;
  updateSubscription: (id: string, subscription: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
}

export const AppContext = React.createContext<AppContextType | null>(null);

import React from 'react';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    currency: 'USD',
    dateFormat: 'MM/dd/yyyy',
    reminderDays: 3,
    emailNotifications: true,
    pushNotifications: false,
  });

  // Load from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedSubscriptions = localStorage.getItem('subscriptions');
    const savedSettings = localStorage.getItem('settings');

    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedSubscriptions) setSubscriptions(JSON.parse(savedSubscriptions));
    if (savedSettings) setSettings(JSON.parse(savedSettings));
  }, []);

  // Save to localStorage when data changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('subscriptions', JSON.stringify(subscriptions));
  }, [subscriptions]);

  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));
  }, [settings]);

  const signIn = (email: string, password: string) => {
    // Mock sign in
    setUser({
      id: '1',
      email,
      name: email.split('@')[0],
    });
  };

  const signUp = (email: string, password: string, name: string) => {
    // Mock sign up
    setUser({
      id: '1',
      email,
      name,
    });
  };

  const signOut = () => {
    setUser(null);
    setSubscriptions([]);
  };

  const addSubscription = (subscription: Omit<Subscription, 'id' | 'createdAt'>) => {
    const newSubscription: Subscription = {
      ...subscription,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };
    setSubscriptions([...subscriptions, newSubscription]);
  };

  const updateSubscription = (id: string, updates: Partial<Subscription>) => {
    setSubscriptions(subscriptions.map(sub => 
      sub.id === id ? { ...sub, ...updates } : sub
    ));
  };

  const deleteSubscription = (id: string) => {
    setSubscriptions(subscriptions.filter(sub => sub.id !== id));
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings({ ...settings, ...newSettings });
  };

  const contextValue: AppContextType = {
    user,
    subscriptions,
    settings,
    signIn,
    signUp,
    signOut,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    updateSettings,
  };

  return (
    <AppContext.Provider value={contextValue}>
      <BrowserRouter>
        <Routes>
          <Route path="/auth/sign-in" element={
            user ? <Navigate to="/" replace /> : <AuthLayout><SignIn /></AuthLayout>
          } />
          <Route path="/auth/sign-up" element={
            user ? <Navigate to="/" replace /> : <AuthLayout><SignUp /></AuthLayout>
          } />
          
          <Route path="/" element={
            user ? <Layout><Dashboard /></Layout> : <Navigate to="/auth/sign-in" replace />
          } />
          <Route path="/subscriptions" element={
            user ? <Layout><Subscriptions /></Layout> : <Navigate to="/auth/sign-in" replace />
          } />
          <Route path="/settings" element={
            user ? <Layout><Settings /></Layout> : <Navigate to="/auth/sign-in" replace />
          } />
          <Route path="/tools" element={
            user ? <Layout><Tools /></Layout> : <Navigate to="/auth/sign-in" replace />
          } />
          <Route path="/status" element={<Layout><Status /></Layout>} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export default App;
