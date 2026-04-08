import React from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Package, 
  History,
  Settings
} from 'lucide-react';
import { cn } from '../lib/utils';
import { TRANSLATIONS } from '../constants';
import { useAppContext } from '../context/AppContext';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const { language } = useAppContext();
  const t = TRANSLATIONS[language];

  const navItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'add-sale', label: t.addSale, icon: PlusCircle },
    { id: 'stock', label: t.stockManagement, icon: Package },
    { id: 'history', label: t.history, icon: History },
    { id: 'settings', label: t.settings, icon: Settings },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-2 z-50 flex items-center justify-around pb-safe">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={cn(
            "flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all duration-200",
            activeTab === item.id
              ? "text-blue-600 dark:text-blue-400"
              : "text-slate-500 dark:text-slate-400"
          )}
        >
          <item.icon size={20} className={cn(activeTab === item.id && "scale-110")} />
          <span className="text-[10px] font-medium truncate max-w-[60px]">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;
