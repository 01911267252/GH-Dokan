import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Edit3, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet,
  FileText,
  Table as TableIcon
} from 'lucide-react';
import { supabase, Transaction } from '../App';
import { useAppContext } from '../context/AppContext';
import { useAction } from '../context/ActionContext';
import { TRANSLATIONS } from '../constants';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { ConfirmModal } from '../components/UI';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const History: React.FC = () => {
  const { language, isAdmin } = useAppContext();
  const { recordAction } = useAction();
  const t = TRANSLATIONS[language];
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear, 0, 1).toISOString();
      const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', startOfYear)
        .lte('date', endOfYear)
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
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
    const matchesFilter = filter === 'all' || tx.type === filter;
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      (tx.product_name?.toLowerCase().includes(searchLower)) ||
      (tx.title?.toLowerCase().includes(searchLower)) ||
      (tx.expense_type?.toLowerCase().includes(searchLower));
    
    return matchesFilter && matchesSearch;
  });

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('GH Sports PRO - Transaction History', 14, 15);
    
    const tableData = filteredTransactions.map(tx => [
      formatDate(tx.date, 'en-US'),
      tx.type.toUpperCase(),
      tx.type === 'sale' ? tx.product_name : (tx.title || tx.type),
      tx.total.toString()
    ]);

    (doc as any).autoTable({
      head: [['Date', 'Type', 'Description', 'Amount (BDT)']],
      body: tableData,
      startY: 20,
    });

    doc.save('transactions.pdf');
  };

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredTransactions.map(tx => ({
      Date: formatDate(tx.date, 'en-US'),
      Type: tx.type,
      Description: tx.type === 'sale' ? tx.product_name : (tx.title || tx.type),
      Amount: tx.total
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    XLSX.writeFile(workbook, "transactions.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.history}</h2>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors text-sm font-medium"
          >
            <FileText size={18} /> PDF
          </button>
          <button 
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors text-sm font-medium"
          >
            <TableIcon size={18} /> Excel
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="text-slate-400" size={18} />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">{t.all}</option>
            <option value="sale">{t.sale}</option>
            <option value="expense">{t.expense}</option>
            <option value="cash">{t.cash}</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">{t.date}</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Type</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Description</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Amount</th>
                {isAdmin && <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-400 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {formatDate(tx.date, language === 'bn' ? 'bn-BD' : 'en-US')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold uppercase",
                      tx.type === 'sale' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                      tx.type === 'expense' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    )}>
                      {t[tx.type as keyof typeof t]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-800 dark:text-white">
                      {tx.type === 'sale' ? tx.product_name : tx.title || t[tx.type as keyof typeof t]}
                    </p>
                    {tx.quantity && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Qty: {tx.quantity} × {formatCurrency(tx.price || 0, language === 'bn' ? 'bn-BD' : 'en-US')}
                      </p>
                    )}
                    {tx.note && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
                        "{tx.note}"
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className={cn(
                      "text-sm font-bold",
                      tx.type === 'sale' ? "text-green-600" : 
                      tx.type === 'expense' ? "text-red-600" : "text-blue-600"
                    )}>
                      {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.total, language === 'bn' ? 'bn-BD' : 'en-US')}
                    </p>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => setDeletingId(tx.id)}
                          className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTransactions.length === 0 && (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              {t.noData}
            </div>
          )}
        </div>
      </div>

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

export default History;
