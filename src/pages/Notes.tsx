import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { StickyNote, Plus, Trash2, Edit3, Save, X, Calendar } from 'lucide-react';
import { supabase, Note } from '../App';
import { useAppContext } from '../context/AppContext';
import { useAction } from '../context/ActionContext';
import { TRANSLATIONS } from '../constants';
import { formatDate } from '../lib/utils';
import { ConfirmModal } from '../components/UI';
import { toast } from 'react-hot-toast';

const Notes: React.FC = () => {
  const { language, isAdmin } = useAppContext();
  const { recordAction } = useAction();
  const t = TRANSLATIONS[language];
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    content: '',
  });

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      if (editingNote) {
        const { error } = await supabase
          .from('notes')
          .update({
            date: new Date(formData.date).toISOString(),
            content: formData.content
          })
          .eq('id', editingNote.id);
        if (error) throw error;
        toast.success('Note updated');
      } else {
        const { data, error } = await supabase
          .from('notes')
          .insert([{
            date: new Date(formData.date).toISOString(),
            content: formData.content
          }])
          .select();
        if (error) throw error;
        if (data && data[0]) recordAction('ADD_NOTE', data[0]);
        toast.success('Note added');
      }

      setFormData({ date: new Date().toISOString().split('T')[0], content: '' });
      setIsAdding(false);
      setEditingNote(null);
      fetchNotes();
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error(t.error);
    }
  };

  const handleDelete = async () => {
    if (!deletingId || !isAdmin) return;

    try {
      const noteToDelete = notes.find(n => n.id === deletingId);
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', deletingId);
      if (error) throw error;
      if (noteToDelete) recordAction('DELETE_NOTE', noteToDelete);
      toast.success('Note deleted');
      setDeletingId(null);
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error(t.error);
    }
  };

  const startEdit = (note: Note) => {
    setEditingNote(note);
    setFormData({
      date: new Date(note.date).toISOString().split('T')[0],
      content: note.content
    });
    setIsAdding(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.notes}</h2>
        {isAdmin && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
          >
            <Plus size={20} /> Add Note
          </button>
        )}
      </div>

      {isAdding && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800 dark:text-white">
                {editingNote ? 'Edit Note' : 'New Note'}
              </h3>
              <button 
                type="button" 
                onClick={() => { setIsAdding(false); setEditingNote(null); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Calendar size={16} /> {t.date}
              </label>
              <input
                type="date"
                value={formData.date}
                min="2026-01-01"
                max="2026-12-31"
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div className="space-y-2">
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write your note here..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              <Save size={20} /> {t.save}
            </button>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {notes.map((note) => (
          <motion.div
            key={note.id}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar size={14} />
                <span className="text-xs font-medium">
                  {formatDate(note.date, language === 'bn' ? 'bn-BD' : 'en-US')}
                </span>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => startEdit(note)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => setDeletingId(note.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">
              {note.content}
            </p>
          </motion.div>
        ))}
        {notes.length === 0 && !isAdding && (
          <div className="col-span-full py-20 text-center text-slate-500 dark:text-slate-400">
            <StickyNote size={48} className="mx-auto mb-4 opacity-20" />
            <p>{t.noData}</p>
          </div>
        )}
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

export default Notes;
