import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  MinusCircle, 
  Wallet, 
  History, 
  BarChart3, 
  StickyNote, 
  Settings,
  Menu,
  X,
  LogOut,
  LogIn,
  Users,
  Moon,
  Sun,
  Languages,
  ShoppingBag,
  TrendingDown,
  Package,
  LogOut as WithdrawIcon,
  Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { TRANSLATIONS } from '../constants';
import { cn } from '../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { language, setLanguage, theme, setTheme } = useAppContext();
  const { user, isAdmin, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const t = TRANSLATIONS[language];

  const menuItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'add-sale', label: t.addSale, icon: PlusCircle, adminOnly: true },
    { id: 'add-expense', label: t.addExpense, icon: MinusCircle, adminOnly: true },
    { id: 'add-cash', label: t.addCash, icon: Wallet, adminOnly: true },
    { id: 'withdraw-cash', label: t.withdraw, icon: WithdrawIcon, adminOnly: true },
    { id: 'sales-history', label: t.salesHistory, icon: ShoppingBag },
    { id: 'expense-history', label: t.expenseHistory, icon: TrendingDown },
    { id: 'stock', label: t.stockManagement, icon: Package },
    { id: 'history', label: t.history, icon: History },
    { id: 'report', label: t.report, icon: BarChart3 },
    { id: 'notes', label: t.notes, icon: StickyNote },
    { id: 'settings', label: t.settings, icon: Settings },
  ];

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <button 
          onClick={toggleSidebar}
          className="p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl shadow-lg text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Content */}
      <motion.aside
        className={cn(
          "fixed top-0 left-0 h-full w-full sm:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-40 transition-transform duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
              <Trophy size={24} />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 dark:text-white leading-tight">GH Sports</h1>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Management Pro</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
            {menuItems.filter(item => !item.adminOnly || isAdmin).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  activeTab === item.id
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between px-2">
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              <button
                onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-2"
              >
                <Languages size={20} />
                <span className="text-sm font-medium uppercase">{language}</span>
              </button>
            </div>

            {isAdmin ? (
              <button
                onClick={() => {
                  signOut();
                  setActiveTab('dashboard');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all font-bold text-sm"
              >
                <LogOut size={18} />
                <span>{t.lockAdmin}</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setActiveTab('login');
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all font-bold text-sm"
              >
                <LogIn size={18} />
                <span>{t.adminAccess}</span>
              </button>
            )}

            <div className="pt-4 text-center border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.developedBy}</p>
              <p className="text-sm font-black text-slate-800 dark:text-white">Mahir</p>
              <a 
                href="https://wa.me/880196494055" 
                target="_blank" 
                rel="noreferrer"
                className="text-[11px] font-bold text-green-600 hover:text-green-700 transition-colors flex items-center justify-center gap-1 mt-1"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                0196494055
              </a>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
