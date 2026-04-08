/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { AppProvider, useAppContext } from './context/AppContext';
import { ActionProvider } from './context/ActionContext';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import { cn } from './lib/utils';
import Dashboard from './pages/Dashboard';
import AddSale from './pages/AddSale';
import AddExpense from './pages/AddExpense';
import AddCash from './pages/AddCash';
import History from './pages/History';
import SalesHistory from './pages/SalesHistory';
import ExpenseHistory from './pages/ExpenseHistory';
import MonthlyReport from './pages/MonthlyReport';
import Notes from './pages/Notes';
import Settings from './pages/Settings';
import StockManagement from './pages/StockManagement';
import ActionHistory from './components/ActionHistory';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Only initialize if keys are present to avoid "supabaseUrl is required" crash
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any;

export type TransactionType = 'sale' | 'expense' | 'cash';

export interface Transaction {
  id: string;
  type: TransactionType;
  date: string;
  product_name?: string;
  quantity?: number;
  price?: number;
  total: number;
  expense_type?: string;
  title?: string;
  note?: string;
  stock_id?: string;
  is_manual?: boolean;
  size?: string;
  created_at: string;
}

export interface Stock {
  id: string;
  product_name: string;
  size?: string;
  initial_quantity: number;
  current_quantity: number;
  created_at: string;
}

export interface StockLog {
  id: string;
  stock_id: string;
  type: 'restock' | 'sale';
  quantity: number;
  date: string;
  note?: string;
}

export interface Note {
  id: string;
  date: string;
  content: string;
  created_at: string;
}

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { theme } = useAppContext();

  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 max-w-md">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">Configuration Required</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Please add your Supabase credentials to the <strong>Settings &gt; Secrets</strong> panel in AI Studio.
          </p>
          <div className="space-y-3 text-left">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-mono text-slate-500">VITE_SUPABASE_URL</p>
              <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{supabaseUrl || 'Missing'}</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-mono text-slate-500">VITE_SUPABASE_ANON_KEY</p>
              <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{supabaseAnonKey ? '••••••••' : 'Missing'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'add-sale': return <AddSale />;
      case 'add-expense': return <AddExpense />;
      case 'add-cash': return <AddCash />;
      case 'history': return <History />;
      case 'sales-history': return <SalesHistory />;
      case 'expense-history': return <ExpenseHistory />;
      case 'report': return <MonthlyReport />;
      case 'notes': return <Notes />;
      case 'stock': return <StockManagement />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className={cn(
      "min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300",
      theme === 'dark' && 'dark'
    )}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 pb-24 lg:pb-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <ActionHistory />

      <Toaster 
        position="top-right"
        toastOptions={{
          className: 'dark:bg-slate-800 dark:text-white rounded-xl shadow-xl',
          duration: 3000,
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <ActionProvider>
        <AppContent />
      </ActionProvider>
    </AppProvider>
  );
}
