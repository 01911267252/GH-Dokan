import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  StickyNote, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Calendar, 
  Pin, 
  PinOff, 
  Search, 
  Tag, 
  Palette,
  Filter
} from 'lucide-react';
import { supabase, Note } from '../App';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useAction } from '../context/ActionContext';
import { TRANSLATIONS } from '../constants';
import { cn, formatDate } from '../lib/utils';
import { ConfirmModal } from '../components/UI';
import { toast } from 'react-hot-toast';

const NOTE_COLORS = [
  { name: 'Default', value: 'bg-white dark:bg-slate-900' },
  { name: 'Blue', value: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' },
  { name: 'Green', value: 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' },
  { name: 'Yellow', value: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800' },
  { name: 'Red', value: 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800' },
  { name: 'Purple', value: 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800' },
];

const Notes: React.FC = () => {
  const { language } = useAppContext();
  const { user, isAdmin } = useAuth();
  const { recordAction } = useAction();
  const t = TRANSLATIONS[language];
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    content: '',
    color: 'bg-white dark:bg-slate-900',
    tags: '',
    is_pinned: false
  });

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('is_deleted', false)
        .order('is_pinned', { ascending: false })
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
    if (!isAdmin) {
      toast.error('Admin access required');
      return;
    }
    if (!formData.content || formData.content.trim() === '') {
      toast.error('Please enter note content');
      return;
    }

    const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');

    try {
      if (editingNote) {
        const { error } = await supabase
          .from('notes')
          .update({
            date: new Date(formData.date).toISOString(),
            content: formData.content,
            color: formData.color,
            tags: tagsArray,
            is_pinned: formData.is_pinned
          })
          .eq('id', editingNote.id);
        if (error) throw error;
        toast.success('Note updated');
      } else {
        const { data, error } = await supabase
          .from('notes')
          .insert([{
            date: new Date(formData.date).toISOString(),
            content: formData.content,
            color: formData.color,
            tags: tagsArray,
            is_pinned: formData.is_pinned
          }])
          .select();
        if (error) throw error;
        if (data && data[0]) recordAction('ADD_NOTE', data[0]);
        toast.success('Note added');
      }

      resetForm();
      fetchNotes();
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error(t.error);
    }
  };

  const resetForm = () => {
    setFormData({ 
      date: new Date().toISOString().split('T')[0], 
      content: '',
      color: 'bg-white dark:bg-slate-900',
      tags: '',
      is_pinned: false
    });
    setIsAdding(false);
    setEditingNote(null);
  };

  const handleDelete = async () => {
    if (!deletingId || !isAdmin) return;

    try {
      const noteToDelete = notes.find(n => n.id === deletingId);
      const { error } = await supabase
        .from('notes')
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString() 
        })
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

  const togglePin = async (note: Note) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase
        .from('notes')
        .update({ is_pinned: !note.is_pinned })
        .eq('id', note.id);
      if (error) throw error;
      fetchNotes();
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const startEdit = (note: Note) => {
    setEditingNote(note);
    setFormData({
      date: new Date(note.date).toISOString().split('T')[0],
      content: note.content,
      color: note.color || 'bg-white dark:bg-slate-900',
      tags: note.tags ? note.tags.join(', ') : '',
      is_pinned: note.is_pinned || false
    });
    setIsAdding(true);
  };

  const filteredNotes = notes.filter(note => 
    note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <StickyNote className="text-blue-600" />
          {t.notes}
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search notes or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          {isAdmin && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
            >
              <Plus size={20} /> Add Note
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 mb-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                    {editingNote ? 'Edit Note' : 'New Note'}
                  </h3>
                  <button 
                    type="button" 
                    onClick={resetForm}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Calendar size={16} /> {t.date}
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Tag size={16} /> Tags (comma separated)
                    </label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="work, personal, important..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <StickyNote size={16} /> Content
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Write your note here..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none"
                    required
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Palette size={16} /> Color
                    </label>
                    <div className="flex gap-2">
                      {NOTE_COLORS.map((color) => (
                        <button
                          key={color.name}
                          type="button"
                          onClick={() => setFormData({ ...formData, color: color.value })}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 transition-all",
                            color.value.split(' ')[0],
                            formData.color === color.value ? "border-blue-600 scale-110" : "border-transparent"
                          )}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div 
                        onClick={() => setFormData({ ...formData, is_pinned: !formData.is_pinned })}
                        className={cn(
                          "p-2 rounded-xl transition-all",
                          formData.is_pinned ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                        )}
                      >
                        <Pin size={20} />
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Pin Note</span>
                    </label>

                    <button
                      type="submit"
                      className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none"
                    >
                      <Save size={20} /> {t.save}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNotes.map((note) => (
          <motion.div
            key={note.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "p-6 rounded-3xl shadow-sm border transition-all hover:shadow-md relative group",
              note.color || 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
            )}
          >
            {note.is_pinned && (
              <div className="absolute -top-2 -right-2 p-1.5 bg-orange-500 text-white rounded-lg shadow-lg">
                <Pin size={14} />
              </div>
            )}

            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Calendar size={14} />
                <span className="text-xs font-bold">
                  {formatDate(note.date, language === 'bn' ? 'bn-BD' : 'en-US')}
                </span>
              </div>
              
              {isAdmin && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => togglePin(note)}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      note.is_pinned ? "text-orange-600 hover:bg-orange-100" : "text-slate-400 hover:text-orange-600 hover:bg-orange-50"
                    )}
                    title={note.is_pinned ? "Unpin" : "Pin"}
                  >
                    {note.is_pinned ? <PinOff size={16} /> : <Pin size={16} />}
                  </button>
                  <button 
                    onClick={() => startEdit(note)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                    title="Edit"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => setDeletingId(note.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap text-sm leading-relaxed mb-4">
              {note.content}
            </p>

            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {note.tags.map((tag, idx) => (
                  <span 
                    key={idx} 
                    className="px-2 py-1 bg-white/50 dark:bg-black/20 text-[10px] font-bold text-slate-500 dark:text-slate-400 rounded-lg border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-1"
                  >
                    <Tag size={10} /> {tag}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        ))}

        {filteredNotes.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <div className="bg-slate-50 dark:bg-slate-900/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <StickyNote size={40} className="text-slate-300 dark:text-slate-700" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {searchQuery ? "No notes found matching your search" : t.noData}
            </p>
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
        type="danger"
      />
    </div>
  );
};

export default Notes;
