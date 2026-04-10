import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  BarChart3, 
  FileText, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  PieChart as PieChartIcon,
  Calendar
} from 'lucide-react';
import { supabase, Transaction } from '../App';
import { useAppContext } from '../context/AppContext';
import { TRANSLATIONS } from '../constants';
import { formatCurrency, cn } from '../lib/utils';
import { exportToPDF, exportToExcel } from '../lib/exportUtils';
import { format, subMonths, startOfMonth, endOfMonth, isSameMonth, eachDayOfInterval } from 'date-fns';

const COLORS = ['#2563eb', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

const MonthlyReport: React.FC = () => {
  const { language, theme } = useAppContext();
  const t = TRANSLATIONS[language];
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('is_deleted', false)
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
    const currentMonth = now.getMonth();

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

  const getDailyTrend = () => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const days = eachDayOfInterval({ start, end });

    const dailyData = days.map(day => ({
      date: format(day, 'dd'),
      sales: 0,
      expenses: 0,
      fullDate: day
    }));

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      if (isSameMonth(txDate, now)) {
        const dayData = dailyData.find(d => d.fullDate.getDate() === txDate.getDate());
        if (dayData) {
          if (tx.type === 'sale') dayData.sales += tx.total;
          if (tx.type === 'expense') dayData.expenses += tx.total;
        }
      }
    });

    return dailyData;
  };

  const getExpenseBreakdown = () => {
    const now = new Date();
    const breakdown: { [key: string]: number } = {};

    transactions.forEach(tx => {
      if (tx.type === 'expense' && isSameMonth(new Date(tx.date), now)) {
        const type = tx.expense_type || 'other';
        breakdown[type] = (breakdown[type] || 0) + tx.total;
      }
    });

    return Object.entries(breakdown).map(([name, value]) => ({
      name: t[name as keyof typeof t] || name,
      value
    }));
  };

  const monthlyData = getMonthlyData();
  const dailyTrend = getDailyTrend();
  const expenseBreakdown = getExpenseBreakdown();
  const hasData = transactions.length > 0;

  const totalStats = monthlyData.reduce((acc, curr) => ({
    sales: acc.sales + curr.sales,
    expenses: acc.expenses + curr.expenses,
    profit: acc.profit + curr.profit
  }), { sales: 0, expenses: 0, profit: 0 });

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

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Activity className="text-blue-600" />
          {t.report}
        </h2>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm font-bold shadow-sm"
          >
            <FileText size={16} /> PDF
          </button>
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm font-bold shadow-sm"
          >
            <Download size={16} /> Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-xl">
              <TrendingUp size={20} />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.totalSales}</p>
          </div>
          <p className="text-2xl font-black text-green-600 font-mono">
            {formatCurrency(totalStats.sales, language === 'bn' ? 'bn-BD' : 'en-US')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl">
              <TrendingDown size={20} />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.totalExpenses}</p>
          </div>
          <p className="text-2xl font-black text-red-600 font-mono">
            {formatCurrency(totalStats.expenses, language === 'bn' ? 'bn-BD' : 'en-US')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl">
              <Activity size={20} />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.totalProfit}</p>
          </div>
          <p className={cn(
            "text-2xl font-black font-mono",
            totalStats.profit >= 0 ? "text-blue-600" : "text-red-600"
          )}>
            {formatCurrency(totalStats.profit, language === 'bn' ? 'bn-BD' : 'en-US')}
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <BarChart3 className="text-blue-600" />
              {t.monthly} {t.report}
            </h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatCurrency(value, language === 'bn' ? 'bn-BD' : 'en-US'), '']}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Bar dataKey="sales" name={t.sale} fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name={t.expense} fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Calendar className="text-blue-600" />
              Daily Trend (Current Month)
            </h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatCurrency(value, language === 'bn' ? 'bn-BD' : 'en-US'), '']}
                />
                <Area type="monotone" dataKey="sales" name={t.sale} stroke="#2563eb" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <PieChartIcon className="text-blue-600" />
              Expense Breakdown
            </h3>
          </div>
          <div className="h-[300px] flex items-center justify-center">
            {expenseBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [formatCurrency(value, language === 'bn' ? 'bn-BD' : 'en-US'), '']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 dark:text-slate-400">No expenses recorded this month</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Recent Monthly Summary</h3>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {monthlyData.slice().reverse().map((data, idx) => (
              <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-slate-800 dark:text-white">{data.month}</span>
                  <span className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                    data.profit >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    {data.profit >= 0 ? 'Profit' : 'Loss'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Sales</p>
                    <p className="text-xs font-bold text-green-600">{formatCurrency(data.sales, language === 'bn' ? 'bn-BD' : 'en-US')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Expenses</p>
                    <p className="text-xs font-bold text-red-600">{formatCurrency(data.expenses, language === 'bn' ? 'bn-BD' : 'en-US')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Profit</p>
                    <p className={cn("text-xs font-bold", data.profit >= 0 ? "text-blue-600" : "text-red-600")}>
                      {formatCurrency(data.profit, language === 'bn' ? 'bn-BD' : 'en-US')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyReport;
