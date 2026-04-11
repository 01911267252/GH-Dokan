import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  ArrowUpCircle, 
  History as HistoryIcon,
  X,
  Edit3,
  Trash2,
  ChevronRight,
  ArrowDownCircle,
  Calendar
} from 'lucide-react';
import { supabase, Stock, StockLog, Transaction } from '../App';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { TRANSLATIONS } from '../constants';
import { cn, formatDate, formatCurrency } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { ConfirmModal } from '../components/UI';

const StockManagement: React.FC = () => {
  const { language } = useAppContext();
  const { user, isAdmin } = useAuth();
  const t = TRANSLATIONS[language];
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAdding, setIsAdding] = useState(false);
  const [isRestocking, setIsRestocking] = useState<Stock | null>(null);
  const [viewingDetails, setViewingDetails] = useState<Stock | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [history, setHistory] = useState<(StockLog | Transaction)[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [formData, setFormData] = useState({
    product_name: '',
    size: '',
    quantity: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const [restockQty, setRestockQty] = useState(0);
  const [restockDate, setRestockDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchStocks();
  }, []);

  useEffect(() => {
    if (viewingDetails) {
      fetchStockHistory(viewingDetails.id);
    }
  }, [viewingDetails]);

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stock')
        .select('*')
        .eq('is_deleted', false)
        .order('product_name', { ascending: true });

      if (error) throw error;
      setStocks(data || []);
    } catch (error) {
      console.error('Error fetching stock:', error);
      toast.error(t.error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStockHistory = async (stockId: string) => {
    try {
      setLoadingHistory(true);
      
      // Fetch restocks from stock_logs
      const { data: logs, error: logsError } = await supabase
        .from('stock_logs')
        .select('*')
        .eq('stock_id', stockId)
        .order('date', { ascending: false });

      if (logsError) throw logsError;

      // Fetch sales from transactions
      const { data: sales, error: salesError } = await supabase
        .from('transactions')
        .select('*')
        .eq('stock_id', stockId)
        .order('date', { ascending: false });

      if (salesError) throw salesError;

      // Merge and sort
      const merged = [
        ...(logs || []).map(l => ({ ...l, type: 'restock' as const })),
        ...(sales || []).map(s => ({ ...s, type: 'sale' as const }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setHistory(merged);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error(t.adminRequired);
      return;
    }
    if (!formData.product_name || formData.product_name.trim() === '' || formData.quantity <= 0) {
      toast.error(t.fillAllFields);
      return;
    }

    try {
      const sizes = formData.size 
        ? formData.size.split(',').map(s => s.trim()).filter(s => s !== '')
        : [null];

      for (const size of sizes) {
        // Check if this product+size already exists
        const existing = stocks.find(s => 
          s.product_name.trim().toLowerCase() === formData.product_name.trim().toLowerCase() && 
          (s.size || '').trim().toLowerCase() === (size || '').trim().toLowerCase()
        );

        if (existing) {
          // Update existing (Restock logic)
          const { error } = await supabase
            .from('stock')
            .update({
              initial_quantity: existing.initial_quantity + formData.quantity,
              current_quantity: existing.current_quantity + formData.quantity
            })
            .eq('id', existing.id);

          if (error) throw error;

          // Add to logs
          await supabase.from('stock_logs').insert([{
            stock_id: existing.id,
            type: 'restock',
            quantity: formData.quantity,
            date: new Date(formData.date).toISOString(),
            note: 'Bulk Add'
          }]);
        } else {
          // Insert new
          const { data, error } = await supabase
            .from('stock')
            .insert([{
              product_name: formData.product_name,
              size: size || null,
              initial_quantity: formData.quantity,
              current_quantity: formData.quantity,
              created_at: new Date(formData.date).toISOString()
            }])
            .select();

          if (error) throw error;

          // Add to logs
          if (data && data[0]) {
            await supabase.from('stock_logs').insert([{
              stock_id: data[0].id,
              type: 'restock',
              quantity: formData.quantity,
              date: new Date(formData.date).toISOString(),
              note: 'Initial Stock'
            }]);
          }
        }
      }

      toast.success(t.success);
      setIsAdding(false);
      setFormData({ product_name: '', size: '', quantity: 0, date: new Date().toISOString().split('T')[0] });
      fetchStocks();
    } catch (error) {
      console.error('Error adding stock:', error);
      toast.error(t.error);
    }
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRestocking || !isAdmin) return;

    if (restockQty <= 0) {
      toast.error(t.fillAllFields);
      return;
    }

    try {
      // Update stock: both initial and current increase
      const { error } = await supabase
        .from('stock')
        .update({
          initial_quantity: isRestocking.initial_quantity + restockQty,
          current_quantity: isRestocking.current_quantity + restockQty
        })
        .eq('id', isRestocking.id);

      if (error) throw error;

      // Add to logs
      await supabase.from('stock_logs').insert([{
        stock_id: isRestocking.id,
        type: 'restock',
        quantity: restockQty,
        date: new Date(restockDate).toISOString()
      }]);

      toast.success(t.success);
      setIsRestocking(null);
      setRestockQty(0);
      setRestockDate(new Date().toISOString().split('T')[0]);
      fetchStocks();
    } catch (error) {
      console.error('Error restocking:', error);
      toast.error(t.error);
    }
  };

  const handleDeleteStock = async () => {
    if (!deletingId || !isAdmin) return;

    try {
      // Check for associated transactions
      const { count, error: countError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('stock_id', deletingId);

      if (countError) throw countError;
      
      if (count && count > 0) {
        toast.error(language === 'bn' ? 'বিক্রয় ইতিহাস সহ পণ্য মুছে ফেলা যাবে না। আগে বিক্রয় মুছুন।' : "Cannot delete product with sales history. Please delete sales first.");
        setDeletingId(null);
        return;
      }

      const { error } = await supabase
        .from('stock')
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString() 
        })
        .eq('id', deletingId);

      if (error) throw error;
      toast.success(t.success);
      setDeletingId(null);
      fetchStocks();
    } catch (error) {
      console.error('Error deleting stock:', error);
      toast.error(t.error);
    }
  };

  const filteredStocks = stocks.filter(s => {
    const matchesSearch = s.product_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.size && s.size.toLowerCase().includes(search.toLowerCase()));
    
    if (statusFilter === 'outOfStock') {
      return matchesSearch && s.current_quantity === 0;
    }
    if (statusFilter === 'lowStock') {
      return matchesSearch && s.current_quantity > 0 && s.current_quantity < 5;
    }
    return matchesSearch;
  });

  const totalProducts = stocks.length;
  const outOfStockCount = stocks.filter(s => s.current_quantity === 0).length;
  const lowStockCount = stocks.filter(s => s.current_quantity > 0 && s.current_quantity < 5).length;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Package className="text-blue-600" />
          {t.stockManagement}
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
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
            >
              <option value="all">{t.all}</option>
              <option value="lowStock">{t.lowStock}</option>
              <option value="outOfStock">{t.outOfStock}</option>
            </select>
          </div>
          {isAdmin && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none font-bold"
            >
              <Plus size={20} />
              {t.addStock}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800"
        >
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{language === 'bn' ? 'মোট পণ্য' : 'Total Products'}</p>
          <p className="text-2xl font-black text-blue-600 font-mono">{totalProducts}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800"
        >
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t.outOfStock}</p>
          <p className="text-2xl font-black text-red-600 font-mono">{outOfStockCount}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800"
        >
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t.lowStock}</p>
          <p className="text-2xl font-black text-orange-600 font-mono">{lowStockCount}</p>
        </motion.div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredStocks.map((stock) => (
            <motion.div
              key={stock.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border transition-all group cursor-pointer",
                stock.current_quantity === 0 
                  ? "border-red-200 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/5" 
                  : stock.current_quantity < 5 
                    ? "border-orange-200 dark:border-orange-900/30 bg-orange-50/30 dark:bg-orange-900/5"
                    : "border-slate-100 dark:border-slate-800"
              )}
              onClick={() => setViewingDetails(stock)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">{stock.product_name}</h3>
                  {stock.size && (
                    <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase rounded-md border border-slate-200 dark:border-slate-700 mt-1">
                      {t.size}: {stock.size}
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => setIsRestocking(stock)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                      title={t.restock}
                    >
                      <ArrowUpCircle size={18} />
                    </button>
                    <button 
                      onClick={() => setDeletingId(stock.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">{t.initialQuantity}</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white">{stock.initial_quantity}</p>
                </div>
                <div className={cn(
                  "p-3 rounded-2xl border",
                  stock.current_quantity === 0 
                    ? "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-600" 
                    : stock.current_quantity < 5 
                      ? "bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800 text-orange-600"
                      : "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-600"
                )}>
                  <p className="text-[10px] uppercase tracking-wider opacity-70 font-bold mb-1">{t.currentQuantity}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-black">{stock.current_quantity}</p>
                    {stock.current_quantity < 5 && <AlertTriangle size={16} />}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  {stock.current_quantity === 0 && (
                    <p className="text-xs font-bold text-red-600 flex items-center gap-1">
                      <AlertTriangle size={14} /> {t.outOfStock}
                    </p>
                  )}
                  {stock.current_quantity > 0 && stock.current_quantity < 5 && (
                    <p className="text-xs font-bold text-orange-600 flex items-center gap-1">
                      <AlertTriangle size={14} /> {t.lowStock}
                    </p>
                  )}
                </div>
                <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                  {t.viewDetails} <ChevronRight size={12} />
                </span>
              </div>
            </motion.div>
          ))}

          {filteredStocks.length === 0 && (
            <div className="col-span-full text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
              <Package size={48} className="mx-auto text-slate-200 dark:text-slate-800 mb-4" />
              <p className="text-slate-500 dark:text-slate-400">{t.noData}</p>
            </div>
          )}
        </div>
      )}

      {/* Add Stock Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Plus className="text-blue-600" />
                  {t.addStock}
                </h3>
                <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleAddStock} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.productName}</label>
                  <input
                    type="text"
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.size} ({t.all})</label>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. M, L, XL"
                  />
                  <p className="text-[10px] text-slate-500 italic">Use commas (,) for multiple sizes at once</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.quantity}</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Calendar size={16} /> {t.date}
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                  >
                    {t.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Restock Modal */}
      <AnimatePresence>
        {isRestocking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <ArrowUpCircle className="text-blue-600" />
                  {t.restock}
                </h3>
                <button onClick={() => setIsRestocking(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>

              <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-sm font-bold text-slate-800 dark:text-white">{isRestocking.product_name}</p>
                {isRestocking.size && <p className="text-xs text-slate-500">{t.size}: {isRestocking.size}</p>}
                <p className="text-xs text-blue-600 font-bold mt-1">{t.currentQuantity}: {isRestocking.current_quantity}</p>
              </div>
              
              <form onSubmit={handleRestock} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.quantity}</label>
                  <input
                    type="number"
                    step="any"
                    value={restockQty}
                    onChange={(e) => setRestockQty(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Calendar size={16} /> {t.date}
                  </label>
                  <input
                    type="date"
                    value={restockDate}
                    onChange={(e) => setRestockDate(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsRestocking(null)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                  >
                    {t.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stock Details / History Modal */}
      <AnimatePresence>
        {viewingDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 w-full max-w-2xl shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl">
                    <HistoryIcon size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">{viewingDetails.product_name}</h3>
                    <p className="text-xs text-slate-500">{t.stockHistory}</p>
                  </div>
                </div>
                <button onClick={() => setViewingDetails(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">{t.initialQuantity}</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white">{viewingDetails.initial_quantity}</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                  <p className="text-[10px] uppercase tracking-wider text-blue-600 font-bold mb-1">{t.currentQuantity}</p>
                  <p className="text-2xl font-black text-blue-600">{viewingDetails.current_quantity}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : history.length > 0 ? (
                  history.map((item: any, idx) => (
                    <div 
                      key={item.id || idx} 
                      className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-2 rounded-xl",
                          item.type === 'restock' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                        )}>
                          {item.type === 'restock' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white">
                            {item.type === 'restock' ? t.added : t.sold}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar size={12} /> {formatDate(item.date, language === 'bn' ? 'bn-BD' : 'en-US')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-lg font-black",
                          item.type === 'restock' ? "text-green-600" : "text-red-600"
                        )}>
                          {item.type === 'restock' ? '+' : '-'}{item.quantity}
                        </p>
                        {item.total && (
                          <p className="text-[10px] font-bold text-slate-400">
                            {formatCurrency(item.total, language === 'bn' ? 'bn-BD' : 'en-US')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-slate-500">{t.noData}</div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteStock}
        title={t.delete}
        message={t.confirmDelete}
        confirmText={t.delete}
        cancelText={t.cancel}
      />
    </div>
  );
};

export default StockManagement;
