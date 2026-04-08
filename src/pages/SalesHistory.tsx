import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Calendar, 
  Trash2, 
  Edit3, 
  ShoppingBag,
  ChevronRight,
  Filter
} from 'lucide-react';
import { supabase, Transaction } from '../App';
import { useAppContext } from '../context/AppContext';
import { useAction } from '../context/ActionContext';
import { TRANSLATIONS } from '../constants';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { ConfirmModal } from '../components/UI';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subYears, startOfYear, endOfYear } from 'date-fns';

const SalesHistory: React.FC = () => {
  const { language, isAdmin, theme } = useAppContext();
  const { recordAction } = useAction();
  const t = TRANSLATIONS[language];
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    product_name: '',
    quantity: 0,
    price: 0,
    note: ''
  });

  useEffect(() => {
    fetchTransactions();
  }, [selectedMonth]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const start = startOfMonth(new Date(selectedMonth));
      const end = endOfMonth(new Date(selectedMonth));

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'sale')
        .gte('date', start.toISOString())
        .lte('date', end.toISOString())
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching sales:', error);
      toast.error(t.error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditFormData({
      product_name: tx.product_name || '',
      quantity: tx.quantity || 0,
      price: tx.price || 0,
      note: tx.note || ''
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx || !isAdmin) return;

    try {
      // 1. If it's a stock transaction, adjust stock
      if (editingTx.stock_id) {
        const { data: stockData } = await supabase
          .from('stock')
          .select('current_quantity')
          .eq('id', editingTx.stock_id)
          .single();

        if (stockData) {
          const qtyDiff = (editingTx.quantity || 0) - editFormData.quantity;
          await supabase
            .from('stock')
            .update({
              current_quantity: stockData.current_quantity + qtyDiff
            })
            .eq('id', editingTx.stock_id);
        }
      }

      const { error } = await supabase
        .from('transactions')
        .update({
          product_name: editFormData.product_name,
          quantity: editFormData.quantity,
          price: editFormData.price,
          total: editFormData.quantity * editFormData.price,
          note: editFormData.note
        })
        .eq('id', editingTx.id);

      if (error) throw error;
      toast.success(t.success);
      setEditingTx(null);
      fetchTransactions();
    } catch (error) {
      console.error('Error updating sale:', error);
      toast.error(t.error);
    }
  };

  const handleDelete = async () => {
    if (!deletingId || !isAdmin) return;

    try {
      const txToDelete = transactions.find(t => t.id === deletingId);
      
      // 1. If it's a stock transaction, adjust stock
      if (txToDelete?.stock_id) {
        const { data: stockData } = await supabase
          .from('stock')
          .select('current_quantity')
          .eq('id', txToDelete.stock_id)
          .single();

        if (stockData) {
          await supabase
            .from('stock')
            .update({
              current_quantity: stockData.current_quantity + (txToDelete.quantity || 0)
            })
            .eq('id', txToDelete.stock_id);
        }
      }

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', deletingId);

      if (error) throw error;
      if (txToDelete) recordAction('DELETE_TRANSACTION', txToDelete);
      toast.success(t.success);
      setDeletingId(null);
      fetchTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error(t.error);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const searchLower = search.toLowerCase();
    return tx.product_name?.toLowerCase().includes(searchLower);
  });

  // Group by date
  const groupedTransactions = filteredTransactions.reduce((groups: { [key: string]: Transaction[] }, tx) => {
    const date = tx.date.split('T')[0];
    if (!groups[date]) groups[date] = [];
    groups[date].push(tx);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));

  const monthOptions = eachMonthOfInterval({
    start: startOfYear(new Date()),
    end: endOfYear(new Date())
  }).reverse();

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <ShoppingBag className="text-green-600" />
          {t.salesHistory}
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={t.productName + "..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="text-slate-400" size={18} />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {monthOptions.map(month => (
                <option key={format(month, 'yyyy-MM')} value={format(month, 'yyyy-MM')}>
                  {format(month, 'MMMM yyyy')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(date => {
            const dayTransactions = groupedTransactions[date];
            const dayTotal = dayTransactions.reduce((sum, tx) => sum + tx.total, 0);

            return (
              <motion.div
                key={date}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden"
              >
                <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                      <Calendar size={18} className="text-blue-600" />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-white font-mono">
                      {formatDate(date, language === 'bn' ? 'bn-BD' : 'en-US')}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">{t.dailyTotal}</p>
                    <p className="text-lg font-black text-green-600 font-mono">
                      {formatCurrency(dayTotal, language === 'bn' ? 'bn-BD' : 'en-US')}
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {dayTransactions.map(tx => (
                    <div key={tx.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group border-l-4 border-l-transparent hover:border-l-blue-500">
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-800 dark:text-white text-lg">{tx.product_name}</h4>
                            {tx.size && (
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase rounded-md border border-slate-200 dark:border-slate-700 font-mono">
                                {tx.size}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                            <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{t.quantity}:</span> {tx.quantity}
                            </span>
                            <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{t.price}:</span> {formatCurrency(tx.price || 0, language === 'bn' ? 'bn-BD' : 'en-US')}
                            </span>
                          </div>
                          {tx.note && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 italic bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                              "{tx.note}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6">
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold font-mono">{t.total}</p>
                          <p className="text-xl font-black text-slate-800 dark:text-white font-mono">
                            {formatCurrency(tx.total, language === 'bn' ? 'bn-BD' : 'en-US')}
                          </p>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleEdit(tx)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                            >
                              <Edit3 size={18} />
                            </button>
                            <button 
                              onClick={() => setDeletingId(tx.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}

          {sortedDates.length === 0 && (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
              <ShoppingBag size={48} className="mx-auto text-slate-200 dark:text-slate-800 mb-4" />
              <p className="text-slate-500 dark:text-slate-400">{t.noData}</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <Edit3 className="text-blue-600" />
                {t.edit} {t.sale}
              </h3>
              
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.productName}</label>
                  <input
                    type="text"
                    value={editFormData.product_name}
                    onChange={(e) => setEditFormData({ ...editFormData, product_name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.quantity}</label>
                    <input
                      type="number"
                      value={editFormData.quantity}
                      onChange={(e) => setEditFormData({ ...editFormData, quantity: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.price}</label>
                    <input
                      type="number"
                      value={editFormData.price}
                      onChange={(e) => setEditFormData({ ...editFormData, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.note}</label>
                  <textarea
                    value={editFormData.note}
                    onChange={(e) => setEditFormData({ ...editFormData, note: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingTx(null)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                  >
                    {t.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title={t.delete}
        message={t.confirmDelete}
        confirmText={t.delete}
        cancelText="Cancel"
      />
    </div>
  );
};

export default SalesHistory;
