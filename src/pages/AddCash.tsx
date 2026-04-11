import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Wallet, Calendar, DollarSign, StickyNote, Save, History as HistoryIcon } from 'lucide-react';
import { supabase, Transaction } from '../App';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useAction } from '../context/ActionContext';
import { TRANSLATIONS } from '../constants';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { toast } from 'react-hot-toast';

const AddCash: React.FC = () => {
  const { language } = useAppContext();
  const { user, isAdmin } = useAuth();
  const { recordAction } = useAction();
  const t = TRANSLATIONS[language];
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Transaction[]>([]);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    note: '',
  });

  useEffect(() => {
    fetchCashHistory();
  }, []);

  const fetchCashHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'cash')
        .eq('is_deleted', false)
        .order('date', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching cash history:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error(t.adminRequired);
      return;
    }

    if (formData.amount <= 0) {
      toast.error(t.fillAllFields);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          type: 'cash',
          date: new Date(formData.date).toISOString(),
          total: formData.amount,
          note: formData.note
        }])
        .select();

      if (error) throw error;
      if (data && data[0]) recordAction('ADD_TRANSACTION', data[0]);

      toast.success(t.success);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        note: '',
      });
      fetchCashHistory();
    } catch (error: any) {
      console.error('Error adding cash:', error);
      toast.error(error.message || t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 h-fit"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl">
            <Wallet size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.addCash}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t.ownerInvestmentDesc}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Calendar size={16} /> {t.date}
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <DollarSign size={16} /> {t.amount}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <StickyNote size={16} /> {t.note}
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder={language === 'bn' ? 'ঐচ্ছিক নোট...' : "Optional note..."}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isAdmin}
            className={cn(
              "w-full py-4 rounded-2xl font-bold text-white shadow-lg shadow-blue-200 dark:shadow-none transition-all flex items-center justify-center gap-2",
              isAdmin ? "bg-blue-600 hover:bg-blue-700 active:scale-[0.98]" : "bg-slate-400 cursor-not-allowed"
            )}
          >
            {loading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : <Save size={20} />}
            {t.save}
          </button>
        </form>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl">
            <HistoryIcon size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.cashHistory}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t.previousInvestments}</p>
          </div>
        </div>

        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {history.map((item) => (
            <div key={item.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-800 dark:text-white">
                  {formatCurrency(item.total, language === 'bn' ? 'bn-BD' : 'en-US')}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatDate(item.date, language === 'bn' ? 'bn-BD' : 'en-US')}
                </p>
                {item.note && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 italic">"{item.note}"</p>
                )}
              </div>
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                <Wallet size={18} />
              </div>
            </div>
          ))}
          {history.length === 0 && (
            <div className="text-center py-10 text-slate-500 dark:text-slate-400">
              {t.noData}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AddCash;
