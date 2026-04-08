import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase, Transaction, Note } from '../App';
import { toast } from 'react-hot-toast';

type ActionType = 'ADD_TRANSACTION' | 'DELETE_TRANSACTION' | 'ADD_NOTE' | 'DELETE_NOTE';

interface Action {
  id: string;
  type: ActionType;
  data: any;
  timestamp: Date;
}

interface ActionContextType {
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  recordAction: (type: ActionType, data: any) => void;
  history: Action[];
}

const ActionContext = createContext<ActionContextType | undefined>(undefined);

export const ActionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [undoStack, setUndoStack] = useState<Action[]>([]);
  const [redoStack, setRedoStack] = useState<Action[]>([]);

  const recordAction = useCallback((type: ActionType, data: any) => {
    const newAction: Action = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      data,
      timestamp: new Date(),
    };
    setUndoStack(prev => [newAction, ...prev].slice(0, 20)); // Keep last 20
    setRedoStack([]); // Clear redo stack on new action
  }, []);

  const undo = async () => {
    if (undoStack.length === 0) return;

    const action = undoStack[0];
    const remainingUndo = undoStack.slice(1);

    try {
      if (action.type === 'ADD_TRANSACTION') {
        // Undo Add = Delete
        await supabase.from('transactions').delete().eq('id', action.data.id);
      } else if (action.type === 'DELETE_TRANSACTION') {
        // Undo Delete = Re-insert
        const { id, ...txData } = action.data;
        await supabase.from('transactions').insert([txData]);
      } else if (action.type === 'ADD_NOTE') {
        await supabase.from('notes').delete().eq('id', action.data.id);
      } else if (action.type === 'DELETE_NOTE') {
        const { id, ...noteData } = action.data;
        await supabase.from('notes').insert([noteData]);
      }

      setUndoStack(remainingUndo);
      setRedoStack(prev => [action, ...prev]);
      toast.success('Action undone');
    } catch (error) {
      console.error('Undo failed:', error);
      toast.error('Undo failed');
    }
  };

  const redo = async () => {
    if (redoStack.length === 0) return;

    const action = redoStack[0];
    const remainingRedo = redoStack.slice(1);

    try {
      if (action.type === 'ADD_TRANSACTION') {
        // Redo Add = Re-insert
        const { id, ...txData } = action.data;
        await supabase.from('transactions').insert([txData]);
      } else if (action.type === 'DELETE_TRANSACTION') {
        // Redo Delete = Delete again
        await supabase.from('transactions').delete().eq('id', action.data.id);
      } else if (action.type === 'ADD_NOTE') {
        const { id, ...noteData } = action.data;
        await supabase.from('notes').insert([noteData]);
      } else if (action.type === 'DELETE_NOTE') {
        await supabase.from('notes').delete().eq('id', action.data.id);
      }

      setRedoStack(remainingRedo);
      setUndoStack(prev => [action, ...prev]);
      toast.success('Action redone');
    } catch (error) {
      console.error('Redo failed:', error);
      toast.error('Redo failed');
    }
  };

  return (
    <ActionContext.Provider value={{ 
      undo, 
      redo, 
      canUndo: undoStack.length > 0, 
      canRedo: redoStack.length > 0,
      recordAction,
      history: undoStack
    }}>
      {children}
    </ActionContext.Provider>
  );
};

export const useAction = () => {
  const context = useContext(ActionContext);
  if (!context) throw new Error('useAction must be used within ActionProvider');
  return context;
};
