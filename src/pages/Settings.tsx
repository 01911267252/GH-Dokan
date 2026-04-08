import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Settings as SettingsIcon, 
  Languages, 
  Moon, 
  Sun, 
  Lock, 
  LogOut, 
  ShieldCheck,
  User
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { TRANSLATIONS } from '../constants';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';

const Settings: React.FC = () => {
  const { language, setLanguage, theme, setTheme, isAdmin, setIsAdmin } = useAppContext();
  const t = TRANSLATIONS[language];
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '2889') {
      setIsAdmin(true);
      setPassword('');
      toast.success('Admin access granted');
    } else {
      toast.error('Incorrect password');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
        <SettingsIcon size={28} className="text-blue-600" /> {t.settings}
      </h2>

      <div className="space-y-6">
        {/* Appearance Section */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Appearance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl">
                  <Languages size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">{t.language}</p>
                  <p className="text-xs text-slate-500">Choose your preferred language</p>
                </div>
              </div>
              <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setLanguage('bn')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                    language === 'bn' ? "bg-blue-600 text-white" : "text-slate-500"
                  )}
                >
                  বাংলা
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                    language === 'en' ? "bg-blue-600 text-white" : "text-slate-500"
                  )}
                >
                  English
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl">
                  {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">{t.darkMode}</p>
                  <p className="text-xs text-slate-500">Switch between light and dark themes</p>
                </div>
              </div>
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className={cn(
                  "w-14 h-8 rounded-full p-1 transition-all duration-300",
                  theme === 'dark' ? "bg-blue-600" : "bg-slate-300"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full bg-white shadow-sm transition-all duration-300",
                  theme === 'dark' ? "translate-x-6" : "translate-x-0"
                )} />
              </button>
            </div>
          </div>
        </div>

        {/* Admin Access Section */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Admin Access</h3>
          
          {isAdmin ? (
            <div className="p-6 rounded-2xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-2xl">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <p className="font-bold text-green-800 dark:text-green-400">Admin Mode Active</p>
                  <p className="text-sm text-green-600 dark:text-green-500">You have full access to edit and delete data.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAdmin(false)}
                className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={20} /> {t.logout}
              </button>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl">
                  <Lock size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">{t.adminLogin}</p>
                  <p className="text-sm text-slate-500">Enter password to enable edit mode.</p>
                </div>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.password}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
                >
                  {t.login}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* About Section */}
        <div className="text-center pt-4">
          <p className="text-sm text-slate-400">GH Sports PRO v1.0.0</p>
          <p className="text-xs text-slate-400 mt-1">© 2026 Shop Management System</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
