import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3, FileText, Download } from 'lucide-react';
import { supabase, Transaction } from '../App';
import { useAppContext } from '../context/AppContext';
import { TRANSLATIONS } from '../constants';
import { formatCurrency, cn } from '../lib/utils';
import { exportToPDF, exportToExcel } from '../lib/exportUtils';
import { format, subMonths, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';

const MonthlyReport: React.FC = () => {
  const { language, theme } = useAppContext();
  const t = TRANSLATIONS[language];
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();

    const subscription = supabase
      .channel('monthly_report_changes')
      .on('postgres_changes' as any, { event: '*', table: 'transactions' }, () => {
        fetchTransactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthlyData = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed (April is 3)

    // Generate months from January of current year to current month
    const yearMonths = Array.from({ length: currentMonth + 1 }).map((_, i) => {
      const date = new Date(currentYear, i, 1);
      return {
        month: format(date, 'MMM yyyy'),
        sales: 0,
        expenses: 0,
        profit: 0,
        fullDate: date
      };
    });

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      if (txDate.getFullYear() === currentYear) {
        const monthData = yearMonths.find(m => m.fullDate.getMonth() === txDate.getMonth());
        if (monthData) {
          if (tx.type === 'sale') monthData.sales += tx.total;
          if (tx.type === 'expense') monthData.expenses += tx.total;
          monthData.profit = monthData.sales - monthData.expenses;
        }
      }
    });

    return yearMonths;
  };

  const monthlyData = getMonthlyData();
  const hasData = transactions.length > 0;

  const totalStats = monthlyData.reduce((acc, curr) => ({
    sales: acc.sales + curr.sales,
    expenses: acc.expenses + curr.expenses,
    profit: acc.profit + curr.profit
  }), { sales: 0, expenses: 0, profit: 0 });

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleExportPDF = () => {
    const headers = ['Month', 'Sales', 'Expenses', 'Profit'];
    const data = monthlyData.map(d => [
      d.month,
      d.sales,
      d.expenses,
      d.profit
    ]);
    exportToPDF('Monthly Financial Report', headers, data, 'monthly_report');
  };

  const handleExportExcel = () => {
    const data = monthlyData.map(d => ({
      Month: d.month,
      Sales: d.sales,
      Expenses: d.expenses,
      Profit: d.profit
    }));
    exportToExcel(data, 'monthly_report');
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.report}</h2>
          <div className="flex items-center gap-2 md:hidden">
            <button onClick={handleExportPDF} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400"><FileText size={18} /></button>
            <button onClick={handleExportExcel} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400"><Download size={18} /></button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
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
          
          <div className="flex items-center gap-2 sm:gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
            <div className="px-3 sm:px-4 py-2 text-center border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">{t.sale}</p>
              <p className="text-sm font-bold text-green-600 font-mono">{formatCurrency(totalStats.sales, language === 'bn' ? 'bn-BD' : 'en-US')}</p>
            </div>
            <div className="px-3 sm:px-4 py-2 text-center border-r border-slate-100 dark:border-slate-800 whitespace-nowrap">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">{t.expense}</p>
              <p className="text-sm font-bold text-red-600 font-mono">{formatCurrency(totalStats.expenses, language === 'bn' ? 'bn-BD' : 'en-US')}</p>
            </div>
            <div className="px-3 sm:px-4 py-2 text-center whitespace-nowrap">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">{t.profit}</p>
              <p className={cn("text-sm font-bold font-mono", totalStats.profit >= 0 ? "text-blue-600" : "text-red-600")}>
                {formatCurrency(totalStats.profit, language === 'bn' ? 'bn-BD' : 'en-US')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800">
        {hasData ? (
          <div className="h-[300px] sm:h-[400px] lg:h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatCurrency(value, language === 'bn' ? 'bn-BD' : 'en-US'), '']}
                />
                <Legend verticalAlign="top" height={36}/>
                <Bar dataKey="sales" name={t.sale} fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name={t.expense} fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name={t.profit} fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[300px] flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
            <BarChart3 size={48} className="mb-4 opacity-20" />
            <p>{t.noData}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {monthlyData.slice().reverse().map((data, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 font-mono">{data.month}</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">{t.sale}</span>
                <span className="font-bold text-green-600 font-mono">{formatCurrency(data.sales, language === 'bn' ? 'bn-BD' : 'en-US')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">{t.expense}</span>
                <span className="font-bold text-red-600 font-mono">{formatCurrency(data.expenses, language === 'bn' ? 'bn-BD' : 'en-US')}</span>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="font-bold text-slate-800 dark:text-white">{t.profit}</span>
                <span className={cn("font-bold font-mono", data.profit >= 0 ? "text-blue-600" : "text-red-600")}>
                  {formatCurrency(data.profit, language === 'bn' ? 'bn-BD' : 'en-US')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthlyReport;
