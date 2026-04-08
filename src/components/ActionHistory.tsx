import React, { useState } from 'react';
import { Undo2, Redo2, History, X, Trash2, PlusCircle } from 'lucide-react';
import { useAction } from '../context/ActionContext';
import { useAppContext } from '../context/AppContext';
import { TRANSLATIONS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate } from '../lib/utils';

const ActionHistory: React.FC = () => {
  const { undo, redo, canUndo, canRedo, history } = useAction();
  const { language, isAdmin } = useAppContext();
  const t = TRANSLATIONS[language];
  const [isOpen, setIsOpen] = useState(false);

  if (!isAdmin) return null;

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all group"
      >
        <History size={24} className={cn(isOpen && "rotate-180 transition-transform")} />
        {canUndo && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
        )}
      </button>

      {/* History Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-6 z-50 w-80 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <History size={18} /> {t.activityLog}
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 flex gap-2 border-b border-slate-100 dark:border-slate-800">
              <button
                onClick={undo}
                disabled={!canUndo}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl disabled:opacity-30 hover:bg-slate-200 transition-colors font-medium text-sm"
              >
                <Undo2 size={16} /> {t.undo}
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl disabled:opacity-30 hover:bg-slate-200 transition-colors font-medium text-sm"
              >
                <Redo2 size={16} /> {t.redo}
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {history.map((action) => (
                <div key={action.id} className="p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    action.type.includes('DELETE') ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                  )}>
                    {action.type.includes('DELETE') ? <Trash2 size={14} /> : <PlusCircle size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                      {action.type.replace('_', ' ')}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {formatDate(action.timestamp, language === 'bn' ? 'bn-BD' : 'en-US')}
                    </p>
                  </div>
                </div>
              ))}
              {history.length === 0 && (
                <div className="py-10 text-center text-slate-400 text-sm italic">
                  {t.noData}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ActionHistory;
