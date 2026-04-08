import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Calendar, Package, Hash, Tag, Save } from 'lucide-react';
import { supabase } from '../App';
import { useAppContext } from '../context/AppContext';
import { useAction } from '../context/ActionContext';
import { TRANSLATIONS } from '../constants';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';

const AddSale: React.FC = () => {
  const { language, isAdmin } = useAppContext();
  const { recordAction } = useAction();
  const t = TRANSLATIONS[language];
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    product_name: '',
    quantity: 1,
    price: 0,
    note: '',
  });

  const total = formData.quantity * formData.price;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Admin access required');
      return;
    }

    if (!formData.product_name || formData.price <= 0) {
      toast.error('Please fill all fields correctly');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          type: 'sale',
          date: new Date(formData.date).toISOString(),
          product_name: formData.product_name,
          quantity: formData.quantity,
          price: formData.price,
          total: total,
          note: formData.note
        }])
        .select();

      if (error) throw error;
      if (data && data[0]) recordAction('ADD_TRANSACTION', data[0]);

      toast.success(t.success);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        product_name: '',
        quantity: 1,
        price: 0,
        note: '',
      });
    } catch (error: any) {
      console.error('Error adding sale:', error);
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
        className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-2xl">
            <ShoppingBag size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.addSale}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Record a new product sale</p>
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
                min="2026-01-01"
                max="2026-12-31"
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Package size={16} /> {t.productName}
              </label>
              <input
                type="text"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                placeholder="e.g. Cricket Bat"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Hash size={16} /> {t.quantity}
              </label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Tag size={16} /> {t.price}
              </label>
              <input
                type="number"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Hash size={16} /> {t.note}
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Optional note..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none"
              />
            </div>
          </div>

          <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50">
            <div className="flex items-center justify-between">
              <span className="text-blue-700 dark:text-blue-300 font-medium">{t.total}</span>
              <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                ৳ {total.toLocaleString()}
              </span>
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
          
          {!isAdmin && (
            <p className="text-center text-red-500 text-sm font-medium">
              Admin access required to add sales
            </p>
          )}
        </form>
      </motion.div>
    </div>
  );
};

export default AddSale;
