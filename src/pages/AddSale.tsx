import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Calendar, Package, Hash, Tag, Save, Search, AlertCircle, ChevronRight } from 'lucide-react';
import { supabase, Stock } from '../App';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useAction } from '../context/ActionContext';
import { TRANSLATIONS } from '../constants';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';

const AddSale: React.FC = () => {
  const { language } = useAppContext();
  const { user, isAdmin } = useAuth();
  const { recordAction } = useAction();
  const t = TRANSLATIONS[language as keyof typeof TRANSLATIONS];
  const [loading, setLoading] = useState(false);
  const [saleMode, setSaleMode] = useState<'stock' | 'manual'>('stock');
  
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedProductName, setSelectedProductName] = useState<string>('');
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [stockSearch, setStockSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    product_name: '',
    quantity: 1,
    price: 0,
    note: '',
    size: '',
  });

  useEffect(() => {
    if (saleMode === 'stock') {
      fetchStocks();
    }
  }, [saleMode]);

  const fetchStocks = async () => {
    try {
      const { data, error } = await supabase
        .from('stock')
        .select('*')
        .order('product_name', { ascending: true });
      if (error) throw error;
      setStocks(data || []);
    } catch (error) {
      console.error('Error fetching stocks:', error);
    }
  };

  const uniqueProductNames: string[] = Array.from(new Set(stocks.map(s => s.product_name)));
  const filteredProductNames = uniqueProductNames.filter((name: string) => 
    name.toLowerCase().includes(stockSearch.toLowerCase())
  );

  const availableSizes = stocks.filter(s => s.product_name === selectedProductName);

  const handleProductSelect = (name: string) => {
    setSelectedProductName(name);
    setShowProductDropdown(false);
    setStockSearch('');
    
    // If only one size exists, select it automatically
    const sizes = stocks.filter(s => s.product_name === name);
    if (sizes.length === 1) {
      setSelectedStock(sizes[0]);
    } else {
      setSelectedStock(null);
      setShowSizeDropdown(true);
    }
  };

  const total = formData.quantity * formData.price;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Admin access required');
      return;
    }

    const productName = saleMode === 'stock' ? selectedStock?.product_name : formData.product_name;
    if (!productName || productName.trim() === '' || formData.price < 0 || formData.quantity <= 0) {
      toast.error('Please fill all fields correctly');
      return;
    }

    if (saleMode === 'stock' && selectedStock) {
      if (selectedStock.current_quantity <= 0) {
        toast.error(t.outOfStock);
        return;
      } else if (formData.quantity > selectedStock.current_quantity) {
        toast.error("Insufficient stock! Available: " + selectedStock.current_quantity);
        return;
      }
    }

    setLoading(true);
    try {
      // 1. Insert Transaction
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .insert([{
          type: 'sale',
          date: new Date(formData.date).toISOString(),
          product_name: productName,
          quantity: formData.quantity,
          price: formData.price,
          total: total,
          note: formData.note,
          stock_id: saleMode === 'stock' ? selectedStock?.id : null,
          is_manual: saleMode === 'manual',
          size: saleMode === 'stock' ? selectedStock?.size : formData.size
        }])
        .select();

      if (txError) throw txError;

      // 2. Update Stock if not manual
      if (saleMode === 'stock' && selectedStock) {
        const { error: stockError } = await supabase
          .from('stock')
          .update({
            current_quantity: selectedStock.current_quantity - formData.quantity
          })
          .eq('id', selectedStock.id);
        
        if (stockError) throw stockError;
      }

      if (txData && txData[0]) recordAction('ADD_TRANSACTION', txData[0]);

      toast.success(t.success);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        product_name: '',
        quantity: 1,
        price: 0,
        note: '',
        size: '',
      });
      setSelectedStock(null);
      setSelectedProductName('');
      setStockSearch('');
      if (saleMode === 'stock') fetchStocks();
    } catch (error: any) {
      console.error('Error adding sale:', error);
      toast.error(error.message || t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-2xl">
              <ShoppingBag size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.addSale}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Record a new product sale</p>
            </div>
          </div>
        </div>

        {/* Sale Mode Toggle */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-8">
          <button
            onClick={() => setSaleMode('stock')}
            className={cn(
              "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
              saleMode === 'stock' 
                ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            {t.fromStock}
          </button>
          <button
            onClick={() => setSaleMode('manual')}
            className={cn(
              "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
              saleMode === 'manual' 
                ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            {t.manualEntry}
          </button>
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
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              />
            </div>

            {saleMode === 'stock' ? (
              <>
                <div className="space-y-2 relative">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Package size={16} /> {t.selectProduct}
                  </label>
                  <div className="relative">
                    <div 
                      onClick={() => setShowProductDropdown(!showProductDropdown)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white cursor-pointer flex justify-between items-center"
                    >
                      <span className={selectedProductName ? "font-bold text-slate-900 dark:text-white" : "text-slate-400"}>
                        {selectedProductName || t.selectProduct}
                      </span>
                      <Search size={18} className="text-slate-400" />
                    </div>

                    <AnimatePresence>
                      {showProductDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
                        >
                          <div className="p-3 border-b border-slate-100 dark:border-slate-700">
                            <input
                              type="text"
                              autoFocus
                              placeholder={t.filter + "..."}
                              value={stockSearch}
                              onChange={(e) => setStockSearch(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg outline-none text-sm"
                            />
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            {filteredProductNames.map(name => (
                              <div
                                key={name}
                                onClick={() => handleProductSelect(name)}
                                className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-50 dark:border-slate-700 last:border-0 text-sm font-medium text-slate-800 dark:text-white"
                              >
                                {name}
                              </div>
                            ))}
                            {filteredProductNames.length === 0 && (
                              <div className="p-4 text-center text-slate-500 text-sm">{t.noData}</div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="space-y-2 relative">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Hash size={16} /> {t.size}
                  </label>
                  <div className="relative">
                    <div 
                      onClick={() => selectedProductName && setShowSizeDropdown(!showSizeDropdown)}
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white flex justify-between items-center",
                        !selectedProductName ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                      )}
                    >
                      <span className={selectedStock ? "font-bold text-slate-900 dark:text-white" : "text-slate-400"}>
                        {selectedStock?.size || (selectedProductName ? t.selectSize : "Select product first")}
                      </span>
                      <ChevronRight size={18} className={cn("text-slate-400 transition-transform", showSizeDropdown && "rotate-90")} />
                    </div>

                    <AnimatePresence>
                      {showSizeDropdown && selectedProductName && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
                        >
                          <div className="max-h-60 overflow-y-auto">
                            {availableSizes.map(stock => (
                              <div
                                key={stock.id}
                                onClick={() => {
                                  setSelectedStock(stock);
                                  setShowSizeDropdown(false);
                                }}
                                className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center border-b border-slate-50 dark:border-slate-700 last:border-0"
                              >
                                <span className="text-sm font-bold text-slate-800 dark:text-white">{stock.size || "No Size"}</span>
                                <div className={cn(
                                  "text-xs font-bold px-2 py-1 rounded-lg",
                                  stock.current_quantity === 0 ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                                )}>
                                  {stock.current_quantity}
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Package size={16} /> {t.productName}
                </label>
                <input
                  type="text"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  placeholder="e.g. Cricket Bat"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
                  required
                />
              </div>
            )}

            {saleMode === 'manual' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Hash size={16} /> {t.size}
                </label>
                <input
                  type="text"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  placeholder="Optional size"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Hash size={16} /> {t.quantity}
              </label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                required
              />
              {saleMode === 'stock' && selectedStock && formData.quantity > selectedStock.current_quantity && (
                <p className="text-[10px] text-orange-600 font-bold flex items-center gap-1">
                  <AlertCircle size={12} /> {t.lowStock} warning
                </p>
              )}
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
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none placeholder:text-slate-400"
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
