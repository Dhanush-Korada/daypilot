import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { createHabit, updateHabit } from '../../services/habitService';
import { Habit, Category } from '../../types';
import { AVAILABLE_CATEGORY_ICONS, getCategoryIcon } from '../categories/categoryIcons';
import { getCategoryDisplayName } from '../../utils/categoryHelper';
import { X, Clock, Target, AlertCircle } from 'lucide-react';

interface HabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  habitToEdit?: Habit | null;
  categories: Category[];
  onSaved: (habit: Habit) => void;
}

const WEEKDAYS = [
  { day: 1, label: 'M' },
  { day: 2, label: 'T' },
  { day: 3, label: 'W' },
  { day: 4, label: 'T' },
  { day: 5, label: 'F' },
  { day: 6, label: 'S' },
  { day: 0, label: 'S' },
];

export const HabitModal: React.FC<HabitModalProps> = ({
  isOpen,
  onClose,
  habitToEdit,
  categories,
  onSaved,
}) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();

  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('Flame');
  const [categoryId, setCategoryId] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekdays' | 'weekends' | 'custom'>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [targetValue, setTargetValue] = useState('');
  const [reminderTime, setReminderTime] = useState('08:00');
  const [hasReminder, setHasReminder] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (habitToEdit) {
      setTitle(habitToEdit.title);
      setCategoryId(habitToEdit.categoryId || '');
      setFrequency(habitToEdit.frequency || 'daily');
      if (habitToEdit.reminderTime) {
        setReminderTime(habitToEdit.reminderTime);
        setHasReminder(true);
      } else {
        setHasReminder(false);
      }

      // Parse metadata from description if present
      if (habitToEdit.description) {
        try {
          const parsed = JSON.parse(habitToEdit.description);
          if (parsed.icon) setIcon(parsed.icon);
          if (parsed.target) setTargetValue(parsed.target);
          if (parsed.selectedDays) setSelectedDays(parsed.selectedDays);
        } catch {
          setTargetValue(habitToEdit.description);
        }
      }
    } else {
      setTitle('');
      setIcon('Flame');
      setCategoryId(categories[0]?.id || '');
      setFrequency('daily');
      setSelectedDays([1, 2, 3, 4, 5]);
      setTargetValue('');
      setReminderTime('08:00');
      setHasReminder(false);
    }
    setError(null);
  }, [habitToEdit, isOpen, categories]);

  if (!isOpen) return null;

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(t('validation.required'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Serialize icon, target, and custom days into description
      const meta = JSON.stringify({
        icon,
        target: targetValue.trim() || undefined,
        selectedDays: frequency === 'custom' ? selectedDays : undefined,
      });

      const targetDaysPerWeek =
        frequency === 'daily'
          ? 7
          : frequency === 'weekdays'
          ? 5
          : frequency === 'weekends'
          ? 2
          : selectedDays.length;

      if (habitToEdit) {
        await updateHabit(currentUser.uid, habitToEdit.id, {
          title: trimmedTitle,
          description: meta,
          categoryId: categoryId || (categories[0]?.id || ''),
          frequency,
          targetDaysPerWeek,
          reminderTime: hasReminder ? reminderTime : '',
        });
        onSaved({
          ...habitToEdit,
          title: trimmedTitle,
          description: meta,
          categoryId: categoryId || (categories[0]?.id || ''),
          frequency,
          targetDaysPerWeek,
          reminderTime: hasReminder ? reminderTime : '',
        });
      } else {
        const created = await createHabit(currentUser.uid, {
          title: trimmedTitle,
          description: meta,
          categoryId: categoryId || (categories[0]?.id || ''),
          frequency,
          targetDaysPerWeek,
          reminderTime: hasReminder ? reminderTime : '',
        });
        onSaved(created);
      }

      onClose();
    } catch (err: unknown) {
      console.error('Failed to save habit:', err);
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 my-auto animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {habitToEdit ? t('habits.editHabit') : t('habits.addHabit')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('habits.subtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Habit Name */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
              {t('habits.habitName')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('habits.habitNamePlaceholder')}
              required
              autoFocus
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category Picker */}
          {categories.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
                {t('common.category')}
              </label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {getCategoryDisplayName(cat, t)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Icon Picker Grid */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
              {t('categories.selectIcon')}
            </label>
            <div className="grid grid-cols-7 gap-2 max-h-28 overflow-y-auto p-1.5 border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-zinc-800/40">
              {AVAILABLE_CATEGORY_ICONS.map(iconKey => {
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

          {/* Optional Daily Target */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
              {t('habits.targetGoal')}
            </label>
            <div className="relative">
              <Target className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={targetValue}
                onChange={e => setTargetValue(e.target.value)}
                placeholder={t('habits.targetGoalPlaceholder')}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
              {t('habits.frequency')}
            </label>
            <select
              value={frequency}
              onChange={e => setFrequency(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="daily">{t('habits.frequencies.daily')}</option>
              <option value="weekdays">{t('habits.frequencies.weekdays')}</option>
              <option value="weekends">{t('habits.frequencies.weekends')}</option>
              <option value="custom">{t('habits.frequencies.custom')}</option>
            </select>

            {frequency === 'custom' && (
              <div className="flex justify-between gap-1 pt-1.5">
                {WEEKDAYS.map(w => {
                  const isChecked = selectedDays.includes(w.day);
                  return (
                    <button
                      key={w.day}
                      type="button"
                      onClick={() => toggleDay(w.day)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-zinc-700'
                      }`}
                    >
                      {w.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Optional Reminder Time */}
          <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                {t('habits.reminderTime')}
              </span>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasReminder}
                  onChange={e => setHasReminder(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>{t('common.reminder')}</span>
              </label>
            </div>

            {hasReminder && (
              <input
                type="time"
                value={reminderTime}
                onChange={e => setReminderTime(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? t('common.saving') : t('common.save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
