import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  RefreshCcw, 
  Search, 
  Filter, 
  ShoppingBag, 
  TrendingDown, 
  Wallet, 
  Package, 
  StickyNote,
  AlertTriangle,
  X
} from 'lucide-react';
import { supabase, Transaction, Stock, Note } from '../App';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { TRANSLATIONS } from '../constants';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmModal } from '../components/UI';

type DeletedItem = {
  id: string;
  type: 'sale' | 'expense' | 'cash' | 'stock' | 'note';
  title: string;
  amount?: number;
  quantity?: number;
  deleted_at: string;
  originalData: any;
};

const RecycleBin: React.FC = () => {
  const { language } = useAppContext();
  const { isAdmin } = useAuth();
  const t = TRANSLATIONS[language];
  const [items, setItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [confirmingRestore, setConfirmingRestore] = useState<DeletedItem | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<DeletedItem | null>(null);
  
  // Password Protection
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isUnlocked) {
      fetchDeletedItems();
    }
  }, [isUnlocked]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '12123') {
      setIsUnlocked(true);
    } else {
      toast.error(t.incorrectPassword);
      setPassword('');
    }
  };

  if (!isUnlocked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md"
        >
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl">
              <Trash2 size={48} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.recycleBin}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t.enterPassword}</p>
            </div>
            <form onSubmit={handlePasswordSubmit} className="w-full space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••"
                autoFocus
                className="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              <button
                type="submit"
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-200 dark:shadow-none"
              >
                {t.login}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  const fetchDeletedItems = async () => {
    try {
      setLoading(true);
      
      const [transactionsRes, stockRes, notesRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('is_deleted', true),
        supabase.from('stock').select('*').eq('is_deleted', true),
        supabase.from('notes').select('*').eq('is_deleted', true)
      ]);

      const deletedTransactions: DeletedItem[] = (transactionsRes.data || []).map(tx => ({
        id: tx.id,
        type: tx.type as any,
        title: tx.type === 'sale' ? tx.product_name : tx.title || t.cashEntry,
        amount: tx.total,
        quantity: tx.quantity,
        deleted_at: tx.deleted_at || tx.created_at,
        originalData: tx
      }));

      const deletedStock: DeletedItem[] = (stockRes.data || []).map(s => ({
        id: s.id,
        type: 'stock',
        title: s.product_name,
        quantity: s.current_quantity,
        deleted_at: s.deleted_at || s.created_at,
        originalData: s
      }));

      const deletedNotes: DeletedItem[] = (notesRes.data || []).map(n => ({
        id: n.id,
        type: 'note',
        title: n.content.substring(0, 30) + (n.content.length > 30 ? '...' : ''),
        deleted_at: n.deleted_at || n.created_at,
        originalData: n
      }));

      const allItems = [...deletedTransactions, ...deletedStock, ...deletedNotes].sort(
        (a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime()
      );

      setItems(allItems);
    } catch (error) {
      console.error('Error fetching deleted items:', error);
      toast.error(t.error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item: DeletedItem) => {
    if (!isAdmin) return;

    try {
      if (item.type === 'sale' || item.type === 'expense' || item.type === 'cash') {
        // If it's a sale, we need to check stock again
        if (item.type === 'sale' && item.originalData.stock_id) {
          const { data: stockData } = await supabase
            .from('stock')
            .select('current_quantity, is_deleted')
            .eq('id', item.originalData.stock_id)
            .single();

          if (stockData) {
            if (stockData.is_deleted) {
              toast.error(t.restoreSaleStockError);
              return;
            }

            const newQty = stockData.current_quantity - (item.originalData.quantity || 0);
            if (newQty < 0) {
              toast.error(t.restoreSaleQtyError);
              return;
            }

            await supabase
              .from('stock')
              .update({ current_quantity: newQty })
              .eq('id', item.originalData.stock_id);
          }
        }

        const { error } = await supabase
          .from('transactions')
          .update({ is_deleted: false, deleted_at: null })
          .eq('id', item.id);
        if (error) throw error;
      } else if (item.type === 'stock') {
        const { error } = await supabase
          .from('stock')
          .update({ is_deleted: false, deleted_at: null })
          .eq('id', item.id);
        if (error) throw error;
      } else if (item.type === 'note') {
        const { error } = await supabase
          .from('notes')
          .update({ is_deleted: false, deleted_at: null })
          .eq('id', item.id);
        if (error) throw error;
      }

      toast.success(t.success);
      fetchDeletedItems();
    } catch (error) {
      console.error('Error restoring item:', error);
      toast.error(t.error);
    }
  };

  const handlePermanentDelete = async (item: DeletedItem) => {
    if (!isAdmin) return;

    try {
      let error;
      if (item.type === 'sale' || item.type === 'expense' || item.type === 'cash') {
        const res = await supabase.from('transactions').delete().eq('id', item.id);
        error = res.error;
      } else if (item.type === 'stock') {
        const res = await supabase.from('stock').delete().eq('id', item.id);
        error = res.error;
      } else if (item.type === 'note') {
        const res = await supabase.from('notes').delete().eq('id', item.id);
        error = res.error;
      }

      if (error) throw error;
      toast.success(t.success);
      fetchDeletedItems();
    } catch (error) {
      console.error('Error permanently deleting item:', error);
      toast.error(t.error);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesFilter = filter === 'all' || item.type === filter;
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sale': return <ShoppingBag className="text-green-600" size={18} />;
      case 'expense': return <TrendingDown className="text-red-600" size={18} />;
      case 'cash': return <Wallet className="text-blue-600" size={18} />;
      case 'stock': return <Package className="text-orange-600" size={18} />;
      case 'note': return <StickyNote className="text-purple-600" size={18} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Trash2 className="text-red-600" />
          {t.recycleBin}
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
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
            >
              <option value="all">{t.all}</option>
              <option value="sale">{t.sale}</option>
              <option value="expense">{t.expense}</option>
              <option value="cash">{t.cash}</option>
              <option value="stock">{t.stockManagement}</option>
              <option value="note">{t.notes}</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t.expenseType}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t.title}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t.amount} / {t.quantity}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t.deletedDate}</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{t.filter}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map((item) => (
                  <tr key={`${item.type}-${item.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(item.type)}
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 capitalize">
                          {item.type === 'stock' ? t.stockManagement : t[item.type as keyof typeof t] || item.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-800 dark:text-white">{item.title}</p>
                      {item.originalData.size && (
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{t.size}: {item.originalData.size}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {item.amount !== undefined ? (
                        <p className="text-sm font-bold text-slate-800 dark:text-white">
                          {formatCurrency(item.amount, language === 'bn' ? 'bn-BD' : 'en-US')}
                        </p>
                      ) : item.quantity !== undefined ? (
                        <p className="text-sm font-bold text-slate-800 dark:text-white">
                          {item.quantity}
                        </p>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(item.deleted_at, language === 'bn' ? 'bn-BD' : 'en-US')}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setConfirmingRestore(item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                          title={t.restore}
                        >
                          <RefreshCcw size={18} />
                        </button>
                        <button
                          onClick={() => setConfirmingDelete(item)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                          title={t.deletePermanently}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-20">
              <Trash2 size={48} className="mx-auto text-slate-200 dark:text-slate-800 mb-4" />
              <p className="text-slate-500 dark:text-slate-400">{t.noData}</p>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmingRestore}
        onClose={() => setConfirmingRestore(null)}
        onConfirm={() => confirmingRestore && handleRestore(confirmingRestore)}
        title={t.restore}
        message={t.confirmRestore}
        confirmText={t.restore}
        type="info"
      />

      <ConfirmModal
        isOpen={!!confirmingDelete}
        onClose={() => setConfirmingDelete(null)}
        onConfirm={() => confirmingDelete && handlePermanentDelete(confirmingDelete)}
        title={t.deletePermanently}
        message={t.confirmPermanentDelete}
        confirmText={t.deletePermanently}
        type="danger"
      />
    </div>
  );
};

export default RecycleBin;
