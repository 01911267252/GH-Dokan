/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { AppProvider, useAppContext } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import RecycleBin from './pages/RecycleBin';
import Login from './pages/Login';
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
  is_deleted?: boolean;
  deleted_at?: string | null;
}

export interface Stock {
  id: string;
  product_name: string;
  size?: string;
  initial_quantity: number;
  current_quantity: number;
  created_at: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
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
  is_pinned?: boolean;
  color?: string;
  tags?: string[];
  is_deleted?: boolean;
  deleted_at?: string | null;
}

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { theme } = useAppContext();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
      case 'recycle-bin': return <RecycleBin />;
      case 'settings': return <Settings setActiveTab={setActiveTab} />;
      case 'login': return <Login setActiveTab={setActiveTab} />;
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
        <div className="max-w-7xl mx-auto w-full min-h-[calc(100vh-160px)]">
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

        {/* Global Footer */}
        <footer className="max-w-7xl mx-auto w-full mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Developed By</p>
          <h4 className="text-sm font-black text-slate-800 dark:text-white mb-1">Mahir</h4>
          <a 
            href="https://wa.me/880196494055" 
            target="_blank" 
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-green-600 hover:text-green-700 transition-colors"
          >
            <svg size={14} viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            0196494055
          </a>
        </footer>
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
      <AuthProvider>
        <ActionProvider>
          <AppContent />
        </ActionProvider>
      </AuthProvider>
    </AppProvider>
  );
}
