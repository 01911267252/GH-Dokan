import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Settings as SettingsIcon, 
  Languages, 
  Moon, 
  Sun, 
  Lock, 
  LogOut, 
  ShieldCheck,
  User,
  Trash2,
  AlertTriangle,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { TRANSLATIONS } from '../constants';
import { cn, formatDate } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { supabase } from '../App';
import { ConfirmModal } from '../components/UI';
import { exportMultiSheetExcel } from '../lib/exportUtils';

const Settings: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
  const { language, setLanguage, theme, setTheme } = useAppContext();
  const { user, isAdmin, signOut } = useAuth();
  const t = TRANSLATIONS[language];
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearType, setClearType] = useState<'all' | 'transactions' | 'stock' | 'notes'>('all');
  const [clearPassword, setClearPassword] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExportAllData = async () => {
    if (!isAdmin) return;
    
    setIsExporting(true);
    const toastId = toast.loading(language === 'bn' ? 'এক্সপোর্ট করার জন্য ডাটা প্রস্তুত করা হচ্ছে...' : 'Preparing all data for export...');
    
    try {
      // 1. Fetch Transactions
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('is_deleted', false)
        .order('date', { ascending: false });
      
      if (txError) throw txError;

      // 2. Fetch Stock
      const { data: stockData, error: stockError } = await supabase
        .from('stock')
        .select('*')
        .eq('is_deleted', false);
      
      if (stockError) throw stockError;

      // 3. Fetch Notes
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .eq('is_deleted', false)
        .order('date', { ascending: false });
      
      if (notesError) throw notesError;

      // Format data for Excel
      const formattedTransactions = (txData || []).map(tx => ({
        Date: formatDate(tx.date, 'en-US'),
        Type: tx.type.toUpperCase(),
        Description: tx.type === 'sale' ? tx.product_name : (tx.title || tx.type),
        Amount: tx.total,
        Quantity: tx.quantity || '',
        Price: tx.price || '',
        Size: tx.size || '',
        Note: tx.note || ''
      }));

      const formattedStock = (stockData || []).map(s => ({
        'Product Name': s.product_name,
        'Size': s.size || '-',
        'Initial Qty': s.initial_quantity,
        'Current Qty': s.current_quantity,
        'Created At': formatDate(s.created_at, 'en-US')
      }));

      const formattedNotes = (notesData || []).map(n => ({
        Date: formatDate(n.date, 'en-US'),
        Content: n.content,
        Pinned: n.is_pinned ? 'Yes' : 'No',
        Tags: (n.tags || []).join(', ')
      }));

      const sheets = [
        { name: 'Transactions', data: formattedTransactions },
        { name: 'Stock', data: formattedStock },
        { name: 'Notes', data: formattedNotes }
      ];

      const fileName = `GH_Sports_Full_Backup_${new Date().toISOString().split('T')[0]}`;
      exportMultiSheetExcel(sheets, fileName);
      
      toast.success(language === 'bn' ? 'সব ডাটা সফলভাবে এক্সপোর্ট করা হয়েছে!' : 'All data exported successfully!', { id: toastId });
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error((language === 'bn' ? 'এক্সপোর্ট করতে ব্যর্থ হয়েছে: ' : 'Failed to export data: ') + error.message, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearData = async () => {
    if (!isAdmin) return;
    
    if (clearPassword !== '12123') {
      toast.error(t.incorrectPassword);
      return;
    }

    setIsClearing(true);
    try {
      let tables: string[] = [];
      let successMessage = '';

      if (clearType === 'all') {
        tables = ['transactions', 'stock_logs', 'stock', 'notes'];
        successMessage = t.success;
      } else if (clearType === 'transactions') {
        tables = ['transactions'];
        successMessage = t.success;
      } else if (clearType === 'stock') {
        tables = ['stock', 'stock_logs'];
        successMessage = t.success;
      } else if (clearType === 'notes') {
        tables = ['notes'];
        successMessage = t.success;
      }
      
      for (const table of tables) {
        const { error } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (error) throw error;
      }

      toast.success(successMessage);
    } catch (error: any) {
      console.error('Error clearing data:', error);
      toast.error(t.error + ': ' + error.message);
    } finally {
      setIsClearing(false);
      setShowClearConfirm(false);
      setClearPassword('');
    }
  };

  const openClearConfirm = (type: 'all' | 'transactions' | 'stock' | 'notes') => {
    setClearType(type);
    setClearPassword('');
    setShowClearConfirm(true);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
        <SettingsIcon size={28} className="text-blue-600" /> {t.settings}
      </h2>

      <div className="space-y-6">
        {/* Appearance Section */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">{t.appearance}</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl">
                  <Languages size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">{t.language}</p>
                  <p className="text-xs text-slate-500">{t.chooseLanguage}</p>
                </div>
              </div>
              <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setLanguage('bn')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                    language === 'bn' ? "bg-blue-600 text-white" : "text-slate-500"
                  )}
                >
                  বাংলা
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                    language === 'en' ? "bg-blue-600 text-white" : "text-slate-500"
                  )}
                >
                  English
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl">
                  {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">{t.darkMode}</p>
                  <p className="text-xs text-slate-500">{t.themeDescription}</p>
                </div>
              </div>
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className={cn(
                  "w-14 h-8 rounded-full p-1 transition-all duration-300",
                  theme === 'dark' ? "bg-blue-600" : "bg-slate-300"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full bg-white shadow-sm transition-all duration-300",
                  theme === 'dark' ? "translate-x-6" : "translate-x-0"
                )} />
              </button>
            </div>
          </div>
        </div>

        {/* Data Management Section */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">{t.dataManagement}</h3>
          <div className="space-y-4">
            {isAdmin && (
              <button
                onClick={handleExportAllData}
                disabled={isExporting}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-all group border border-blue-100 dark:border-blue-900/20"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 text-white rounded-xl">
                    {isExporting ? (
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <FileSpreadsheet size={20} />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-blue-800 dark:text-blue-400">{t.exportAll}</p>
                    <p className="text-xs text-blue-600/70 dark:text-blue-500/70">{t.exportBackup}</p>
                  </div>
                </div>
                <Download size={20} className="text-blue-400 group-hover:text-blue-600 transition-colors" />
              </button>
            )}

            <button
              onClick={() => setActiveTab('recycle-bin')}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl">
                  <Trash2 size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800 dark:text-white">{t.recycleBin}</p>
                  <p className="text-xs text-slate-500">{t.confirmDelete.replace('delete', 'restore')}</p>
                </div>
              </div>
              <ShieldCheck size={20} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
            </button>
          </div>
        </div>

        {/* Admin Access Section */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">{t.adminAccess}</h3>
          
          {isAdmin ? (
            <div className="p-6 rounded-2xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-2xl">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <p className="font-bold text-green-800 dark:text-green-400">{t.adminModeActive}</p>
                  <p className="text-sm text-green-600 dark:text-green-500">{t.adminModeDesc}</p>
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={20} /> {t.logout}
              </button>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl">
                  <Lock size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">{t.visitorMode}</p>
                  <p className="text-sm text-slate-500">{t.visitorModeDesc}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                {t.visitorModeHint}
              </p>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        {isAdmin && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-red-100 dark:border-red-900/20">
            <h3 className="text-lg font-bold text-red-600 mb-6 flex items-center gap-2">
              <AlertTriangle size={20} /> {t.dangerZone}
            </h3>
            
            <div className="space-y-4">
              {/* Clear Transactions */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">{t.clearTransactions}</p>
                  <p className="text-xs text-slate-500">{t.clearTransactionsDesc}</p>
                </div>
                <button
                  onClick={() => openClearConfirm('transactions')}
                  className="px-6 py-2 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition-all text-sm"
                >
                  {t.clearTransactions}
                </button>
              </div>

              {/* Clear Stock */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">{t.clearStock}</p>
                  <p className="text-xs text-slate-500">{t.clearStockDesc}</p>
                </div>
                <button
                  onClick={() => openClearConfirm('stock')}
                  className="px-6 py-2 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition-all text-sm"
                >
                  {t.clearStock}
                </button>
              </div>

              {/* Clear Notes */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">{t.clearCash}</p>
                  <p className="text-xs text-slate-500">{t.clearCashDesc}</p>
                </div>
                <button
                  onClick={() => openClearConfirm('notes')}
                  className="px-6 py-2 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition-all text-sm"
                >
                  {t.clearCash}
                </button>
              </div>

              {/* Clear Everything */}
              <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 mt-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-2xl">
                    <Trash2 size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-red-800 dark:text-red-400">{t.clearAllData}</p>
                    <p className="text-sm text-red-600 dark:text-red-500">{t.clearAllDataDesc}</p>
                  </div>
                </div>
                <button
                  onClick={() => openClearConfirm('all')}
                  disabled={isClearing}
                  className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-200 dark:shadow-none"
                >
                  {isClearing ? (
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Trash2 size={20} />
                  )}
                  {t.clearEverything}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* About Section */}
        <div className="text-center pt-8 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{t.developedBy}</p>
          <h4 className="text-lg font-black text-slate-800 dark:text-white mb-1">Mahir</h4>
          <a 
            href="https://wa.me/880196494055" 
            target="_blank" 
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/10 text-green-600 rounded-xl font-bold text-sm hover:bg-green-100 dark:hover:bg-green-900/20 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            0196494055
          </a>
          <div className="mt-4">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">GH Sports PRO v1.0.0</p>
            <p className="text-[10px] text-slate-400 mt-1">© 2026 All Rights Reserved</p>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearData}
        title={
          clearType === 'all' ? t.clearEverything :
          clearType === 'transactions' ? t.clearTransactions :
          clearType === 'stock' ? t.clearStock : t.clearCash
        }
        message={
          clearType === 'all' ? t.confirmClearAll :
          clearType === 'transactions' ? t.confirmClearTransactions :
          clearType === 'stock' ? t.confirmClearStock :
          t.confirmClearCash
        }
        confirmText={t.yesClearData}
        cancelText={t.noKeepData}
        type="danger"
      >
        <div className="space-y-2 text-left">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Lock size={14} /> {t.enterClearPassword}
          </label>
          <input
            type="password"
            value={clearPassword}
            onChange={(e) => setClearPassword(e.target.value)}
            placeholder="Enter password to confirm"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
            autoFocus
          />
        </div>
      </ConfirmModal>
    </div>
  );
};

export default Settings;
