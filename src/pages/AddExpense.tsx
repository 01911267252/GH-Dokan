import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Receipt, Calendar, ListFilter, Type, DollarSign, Save } from 'lucide-react';
import { supabase } from '../App';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useAction } from '../context/ActionContext';
import { TRANSLATIONS } from '../constants';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';

const AddExpense: React.FC = () => {
  const { language } = useAppContext();
  const { user, isAdmin } = useAuth();
  const { recordAction } = useAction();
  const t = TRANSLATIONS[language];
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    expense_type: 'other',
    title: '',
    amount: 0,
    note: '',
  });

  const expenseTypes = [
    { id: 'rent', label: t.rent },
    { id: 'food', label: t.food },
    { id: 'transport', label: t.transport },
    { id: 'other', label: t.other },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error(t.adminRequired);
      return;
    }

    if (!formData.title || formData.title.trim() === '' || formData.amount <= 0) {
      toast.error(t.fillAllFields);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          type: 'expense',
          date: new Date(formData.date).toISOString(),
          expense_type: formData.expense_type,
          title: formData.title,
          total: formData.amount,
          note: formData.note
        }])
        .select();

      if (error) throw error;
      if (data && data[0]) recordAction('ADD_TRANSACTION', data[0]);

      toast.success(t.success);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        expense_type: 'other',
        title: '',
        amount: 0,
        note: '',
      });
    } catch (error: any) {
      console.error('Error adding expense:', error);
      toast.error(error.message || t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-2xl">
            <Receipt size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.addExpense}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{t.recordExpenseDesc}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Calendar size={16} /> {t.date}
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <ListFilter size={16} /> {t.expenseType}
              </label>
              <select
                value={formData.expense_type}
                onChange={(e) => setFormData({ ...formData, expense_type: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
              >
                {expenseTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Type size={16} /> {t.title}
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={language === 'bn' ? 'যেমন: দোকানের ভাড়া' : "e.g. Shop Rent"}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-all placeholder:text-slate-400"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <DollarSign size={16} /> {t.amount}
              </label>
              <input
                type="number"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Receipt size={16} /> {t.note}
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder={language === 'bn' ? 'ঐচ্ছিক নোট...' : "Optional note..."}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-all h-24 resize-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isAdmin}
            className={cn(
              "w-full py-4 rounded-2xl font-bold text-white shadow-lg shadow-red-200 dark:shadow-none transition-all flex items-center justify-center gap-2",
              isAdmin ? "bg-red-600 hover:bg-red-700 active:scale-[0.98]" : "bg-slate-400 cursor-not-allowed"
            )}
          >
            {loading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : <Save size={20} />}
            {t.save}
          </button>
          
          {!isAdmin && (
            <p className="text-center text-red-500 text-sm font-medium">
              {t.adminRequiredExpense}
            </p>
          )}
        </form>
      </motion.div>
    </div>
  );
};

export default AddExpense;
