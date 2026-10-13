import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { createCategory, updateCategory } from '../../services/categoryService';
import { Category } from '../../types';
import {
  AVAILABLE_CATEGORY_ICONS,
  AVAILABLE_CATEGORY_COLORS,
  getCategoryIcon,
} from './categoryIcons';
import { X, Check, AlertCircle } from 'lucide-react';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: Category | null;
  onSaved: (category: Category) => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  categoryToEdit,
  onSaved,
}) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [icon, setIcon] = useState('Tag');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setColor(categoryToEdit.color || '#6366f1');
      setIcon(categoryToEdit.icon || 'Tag');
    } else {
      setName('');
      setColor('#6366f1');
      setIcon('Tag');
    }
    setError(null);
  }, [categoryToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('validation.required'));
      return;
    }
    if (trimmed.length > 60) {
      setError('Category name cannot exceed 60 characters.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      if (categoryToEdit) {
        await updateCategory(currentUser.uid, categoryToEdit.id, {
          name: trimmed,
          color,
          icon,
        });
        onSaved({
          ...categoryToEdit,
          name: trimmed,
          color,
          icon,
        });
      } else {
        const created = await createCategory(currentUser.uid, {
          name: trimmed,
          color,
          icon,
        });
        onSaved(created);
      }
      onClose();
    } catch (err: unknown) {
      console.error('Error saving category:', err);
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {categoryToEdit ? t('categories.title') : t('categories.addCategory')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
              {t('categories.categoryName')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Finances, Hobbies, Side Project"
              maxLength={60}
              required
              autoFocus
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
              {t('categories.categoryColor')}
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              {AVAILABLE_CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-white transition-transform cursor-pointer ${
                    color === c ? 'scale-115 ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-zinc-900 shadow-xs' : 'hover:scale-105'
                  }`}
                >
                  {color === c && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-7 h-7 rounded-full cursor-pointer border border-slate-300 dark:border-zinc-700 p-0 bg-transparent"
                title="Custom color"
              />
            </div>
          </div>

          {/* Icon Selector Grid */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
              {t('common.info')}
            </label>
            <div className="grid grid-cols-7 gap-2 max-h-36 overflow-y-auto p-1.5 border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-zinc-800/40">
              {AVAILABLE_CATEGORY_ICONS.map((iconKey) => {
                const isSelected = icon === iconKey;
                return (
                  <button
                    key={iconKey}
                    type="button"
                    onClick={() => setIcon(iconKey)}
                    className={`p-2 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                    }`}
                    title={iconKey}
                  >
                    {getCategoryIcon(iconKey, 'w-4 h-4')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-800 flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm shadow-xs"
              style={{ backgroundColor: color }}
            >
              {getCategoryIcon(icon, 'w-5 h-5')}
            </div>
            <div>
              <span className="text-xs text-slate-400 dark:text-zinc-500 block">{t('common.info')}</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {name.trim() || t('categories.addCategory')}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? t('common.saving') : categoryToEdit ? t('common.save') : t('categories.addCategory')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
