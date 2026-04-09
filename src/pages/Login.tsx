import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, LogIn, ShieldCheck } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { TRANSLATIONS } from '../constants';
import { toast } from 'react-hot-toast';

interface LoginProps {
  setActiveTab: (tab: string) => void;
}

const Login: React.FC<LoginProps> = ({ setActiveTab }) => {
  const { language } = useAppContext();
  const { loginAsAdmin } = useAuth();
  const t = TRANSLATIONS[language];
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      const success = loginAsAdmin(password);
      if (success) {
        toast.success('Admin access granted');
        setActiveTab('dashboard');
      } else {
        toast.error('Incorrect admin password');
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div className="max-w-md mx-auto pt-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl mb-4">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Admin Access</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Enter the admin password to unlock features</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Admin Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••"
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none"
          >
            {loading ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <LogIn size={20} />
                Unlock Admin
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
