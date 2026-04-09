import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Calendar, 
  Trash2, 
  Edit3, 
  TrendingDown,
  ChevronRight,
  Filter,
  Tag,
  FileText,
  Download
} from 'lucide-react';
import { supabase, Transaction } from '../App';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useAction } from '../context/ActionContext';
import { TRANSLATIONS } from '../constants';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { ConfirmModal } from '../components/UI';
import { exportToPDF, exportToExcel } from '../lib/exportUtils';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, startOfYear, endOfYear } from 'date-fns';

const ExpenseHistory: React.FC = () => {
  const { language, theme } = useAppContext();
  const { user, isAdmin } = useAuth();
  const { recordAction } = useAction();
  const t = TRANSLATIONS[language];
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    expense_type: '',
    total: 0,
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
        .eq('type', 'expense')
        .gte('date', start.toISOString())
        .lte('date', end.toISOString())
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error(t.error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditFormData({
      title: tx.title || '',
      expense_type: tx.expense_type || 'other',
      total: tx.total || 0,
      note: tx.note || ''
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx || !isAdmin) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          title: editFormData.title,
          expense_type: editFormData.expense_type,
          total: editFormData.total,
          note: editFormData.note
        })
        .eq('id', editingTx.id);

      if (error) throw error;
      toast.success(t.success);
      setEditingTx(null);
      fetchTransactions();
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error(t.error);
    }
  };

  const handleDelete = async () => {
    if (!deletingId || !isAdmin) return;

    try {
      const txToDelete = transactions.find(t => t.id === deletingId);
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
    return (
      tx.title?.toLowerCase().includes(searchLower) || 
      tx.expense_type?.toLowerCase().includes(searchLower)
    );
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

  const handleExportPDF = () => {
    const headers = ['Date', 'Type', 'Title', 'Amount'];
    const data = filteredTransactions.map(tx => [
      format(new Date(tx.date), 'yyyy-MM-dd'),
      t[tx.expense_type as keyof typeof t] || tx.expense_type,
      tx.title || '-',
      tx.total
    ]);
    exportToPDF(`Expense Report - ${selectedMonth}`, headers, data, `expense_report_${selectedMonth}`);
  };

  const handleExportExcel = () => {
    const data = filteredTransactions.map(tx => ({
      Date: format(new Date(tx.date), 'yyyy-MM-dd'),
      Type: t[tx.expense_type as keyof typeof t] || tx.expense_type,
      Title: tx.title || '-',
      Amount: tx.total,
      Note: tx.note || ''
    }));
    exportToExcel(data, `expense_report_${selectedMonth}`);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <TrendingDown className="text-red-600" />
            {t.expenseHistory}
          </h2>

          <div className="flex items-center gap-2 md:hidden">
            <button 
              onClick={handleExportPDF}
              className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400"
              title="Export PDF"
            >
              <FileText size={18} />
            </button>
            <button 
              onClick={handleExportExcel}
              className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400"
              title="Export Excel"
            >
              <Download size={18} />
            </button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="hidden md:flex items-center gap-2 mr-2">
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm font-bold"
            >
              <FileText size={16} />
              PDF
            </button>
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm font-bold"
            >
              <Download size={16} />
              Excel
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={t.title + "..."}
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
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
                      <Calendar size={18} className="text-red-600" />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-white">
                      {formatDate(date, language === 'bn' ? 'bn-BD' : 'en-US')}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{t.dailyTotal}</p>
                    <p className="text-lg font-black text-red-600">
                      {formatCurrency(dayTotal, language === 'bn' ? 'bn-BD' : 'en-US')}
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {dayTransactions.map(tx => (
                    <div key={tx.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          <ChevronRight size={16} className="text-slate-300 group-hover:text-red-500 transition-colors" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-800 dark:text-white text-lg">{tx.title || t[tx.expense_type as keyof typeof t] || tx.expense_type}</h4>
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase rounded-md border border-slate-200 dark:border-slate-700">
                              {t[tx.expense_type as keyof typeof t] || tx.expense_type}
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
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{t.amount}</p>
                          <p className="text-xl font-black text-red-600">
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
              <TrendingDown size={48} className="mx-auto text-slate-200 dark:text-slate-800 mb-4" />
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
                {t.edit} {t.expense}
              </h3>
              
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.expenseType}</label>
                  <select
                    value={editFormData.expense_type}
                    onChange={(e) => setEditFormData({ ...editFormData, expense_type: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="rent">{t.rent}</option>
                    <option value="food">{t.food}</option>
                    <option value="transport">{t.transport}</option>
                    <option value="other">{t.other}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.title}</label>
                  <input
                    type="text"
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.amount}</label>
                  <input
                    type="number"
                    value={editFormData.total}
                    onChange={(e) => setEditFormData({ ...editFormData, total: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
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

export default ExpenseHistory;
