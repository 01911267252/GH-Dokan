import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { supabase, Transaction } from '../App';
import { useAppContext } from '../context/AppContext';
import { TRANSLATIONS } from '../constants';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { StatCard, Section } from '../components/UI';
import { startOfDay, endOfDay, format, startOfMonth, endOfMonth, subMonths, isSameMonth } from 'date-fns';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

const Dashboard: React.FC = () => {
  const { language, theme } = useAppContext();
  const t = TRANSLATIONS[language];
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();

    const subscription = supabase
      .channel('transactions_changes')
      .on('postgres_changes' as any, { event: '*', table: 'transactions' }, (payload: RealtimePostgresChangesPayload<Transaction>) => {
        fetchTransactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
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

  const calculateStats = () => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    let totalBalance = 0;
    let todaySales = 0;
    let todayExpenses = 0;
    let monthlySales = 0;
    let monthlyExpenses = 0;

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      
      if (tx.type === 'sale') {
        totalBalance += tx.total;
        if (txDate >= todayStart && txDate <= todayEnd) todaySales += tx.total;
        if (txDate >= monthStart && txDate <= monthEnd) monthlySales += tx.total;
      } else if (tx.type === 'expense') {
        totalBalance -= tx.total;
        if (txDate >= todayStart && txDate <= todayEnd) todayExpenses += tx.total;
        if (txDate >= monthStart && txDate <= monthEnd) monthlyExpenses += tx.total;
      } else if (tx.type === 'cash') {
        totalBalance += tx.total;
      }
    });

    return {
      totalBalance,
      todaySales,
      todayExpenses,
      monthlyProfit: monthlySales - monthlyExpenses
    };
  };

  const stats = calculateStats();

  const getChartData = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Show up to last 6 months but only within the current year
    const monthsToShow = Math.min(currentMonth + 1, 6);
    
    const yearMonths = Array.from({ length: monthsToShow }).map((_, i) => {
      const date = subMonths(now, i);
      return {
        month: format(date, 'MMM'),
        sales: 0,
        expenses: 0,
        profit: 0,
        fullDate: date
      };
    }).reverse();

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const monthData = yearMonths.find(m => isSameMonth(m.fullDate, txDate));
      if (monthData) {
        if (tx.type === 'sale') monthData.sales += tx.total;
        if (tx.type === 'expense') monthData.expenses += tx.total;
        monthData.profit = monthData.sales - monthData.expenses;
      }
    });

    return yearMonths;
  };

  const chartData = getChartData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={t.balance}
          value={formatCurrency(stats.totalBalance, language === 'bn' ? 'bn-BD' : 'en-US')}
          icon={<Wallet size={24} />}
          color="blue"
          className="md:col-span-2 lg:col-span-1 bg-gradient-to-br from-blue-600 to-blue-700 text-white border-none shadow-blue-200 dark:shadow-none"
        />
        <StatCard
          title={t.todaySales}
          value={formatCurrency(stats.todaySales, language === 'bn' ? 'bn-BD' : 'en-US')}
          icon={<TrendingUp size={24} />}
          color="green"
        />
        <StatCard
          title={t.todayExpenses}
          value={formatCurrency(stats.todayExpenses, language === 'bn' ? 'bn-BD' : 'en-US')}
          icon={<TrendingDown size={24} />}
          color="red"
        />
        <StatCard
          title={t.monthlyProfit}
          value={formatCurrency(stats.monthlyProfit, language === 'bn' ? 'bn-BD' : 'en-US')}
          icon={<DollarSign size={24} />}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Section title={t.report} className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatCurrency(value, language === 'bn' ? 'bn-BD' : 'en-US'), '']}
                />
                <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title={t.recentTransactions}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.slice(0, 6).map((tx) => (
                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      tx.type === 'sale' ? "bg-green-50 text-green-600" : 
                      tx.type === 'expense' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {tx.type === 'sale' ? <ArrowUpRight size={18} /> : 
                       tx.type === 'expense' ? <ArrowDownRight size={18} /> : <Wallet size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">
                        {tx.type === 'sale' ? tx.product_name : tx.title || t[tx.type as keyof typeof t]}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(tx.date, language === 'bn' ? 'bn-BD' : 'en-US')}
                      </p>
                    </div>
                  </div>
                  <p className={cn(
                    "text-sm font-bold",
                    tx.type === 'sale' ? "text-green-600" : 
                    tx.type === 'expense' ? "text-red-600" : "text-blue-600"
                  )}>
                    {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.total, language === 'bn' ? 'bn-BD' : 'en-US')}
                  </p>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  {t.noData}
                </div>
              )}
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
};

export default Dashboard;
