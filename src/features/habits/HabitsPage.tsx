import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  getHabits,
  deleteHabit,
  getAllHabitLogs,
  toggleHabitLog,
  computeHabitStreaks,
} from '../../services/habitService';
import { getCategories } from '../../services/categoryService';
import { Habit, Category, HabitLog } from '../../types';
import { getCategoryIcon } from '../categories/categoryIcons';
import { getCategoryDisplayName } from '../../utils/categoryHelper';
import { HabitModal } from './HabitModal';
import { ConfirmModal } from '../../components/ConfirmModal';
import {
  Flame,
  Plus,
  CheckCircle2,
  Trophy,
  Clock,
  Target,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle,
  MoreVertical,
} from 'lucide-react';

export const HabitsPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { weekStartsOn } = useTheme();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allLogs, setAllLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);

  // Delete modal state
  const [habitToDeleteId, setHabitToDeleteId] = useState<string | null>(null);
  const [deletingHabit, setDeletingHabit] = useState(false);

  // Active menu dropdown id
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const loadData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError(null);
      const [fetchedHabits, fetchedCategories, logs] = await Promise.all([
        getHabits(currentUser.uid),
        getCategories(currentUser.uid),
        getAllHabitLogs(currentUser.uid),
      ]);
      setHabits(fetchedHabits);
      setCategories(fetchedCategories);
      setAllLogs(logs);
    } catch (err: unknown) {
      console.error('Error loading habits:', err);
      setError(t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Compute the 7 days of the current week respecting weekStartsOn
  const currentWeekDays = useMemo(() => {
    const today = new Date();
    let dayOfWeek = today.getDay();
    if (weekStartsOn === 1) {
      dayOfWeek = (dayOfWeek + 6) % 7;
    }
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);

    const days: { dateStr: string; dayLabel: string; isToday: boolean; dateNum: number }[] = [];
    const labels = weekStartsOn === 1
      ? ['M', 'T', 'W', 'T', 'F', 'S', 'S']
      : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayLabel: labels[i],
        isToday: dateStr === todayStr,
        dateNum: d.getDate(),
      });
    }
    return days;
  }, [weekStartsOn, todayStr]);

  const logLookup = useMemo(() => {
    const set = new Set<string>();
    for (const log of allLogs) {
      if (log.completed) {
        set.add(`${log.habitId}_${log.date}`);
      }
    }
    return set;
  }, [allLogs]);

  const handleToggleLog = async (habitId: string, dateStr: string) => {
    if (!currentUser) return;
    const key = `${habitId}_${dateStr}`;
    const isCompleted = logLookup.has(key);
    const nextStatus = !isCompleted;

    // Optimistic UI update
    setAllLogs(prev => {
      const filtered = prev.filter(l => !(l.habitId === habitId && l.date === dateStr));
      return [
        ...filtered,
        {
          id: `${habitId}_${dateStr}`,
          habitId,
          userId: currentUser.uid,
          date: dateStr,
          completed: nextStatus,
        },
      ];
    });

    try {
      await toggleHabitLog(currentUser.uid, habitId, dateStr, isCompleted);
      if (nextStatus && dateStr === todayStr) {
        setToastMessage(t('habits.todayCompleted'));
      }
    } catch (err) {
      console.error('Failed to toggle habit log:', err);
      // Revert on failure
      setAllLogs(allLogs);
      setError(t('errors.generic'));
    }
  };

  const confirmDeleteHabit = async () => {
    if (!currentUser || !habitToDeleteId) return;
    const id = habitToDeleteId;
    const backup = [...habits];
    setHabits(prev => prev.filter(h => h.id !== id));
    setHabitToDeleteId(null);
    setDeletingHabit(true);

    try {
      await deleteHabit(currentUser.uid, id);
      setToastMessage(t('common.deleted', { defaultValue: 'Habit deleted' }));
    } catch (err: unknown) {
      console.error('Failed to delete habit:', err);
      setHabits(backup);
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setDeletingHabit(false);
    }
  };

  const handleHabitSaved = (saved: Habit) => {
    setHabits(prev => {
      const idx = prev.findIndex(h => h.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
    setToastMessage(t('habits.saved'));
  };

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case 'daily':
        return t('habits.frequencies.daily');
      case 'weekdays':
        return t('habits.frequencies.weekdays');
      case 'weekends':
        return t('habits.frequencies.weekends');
      case 'custom':
        return t('habits.frequencies.custom');
      default:
        return freq;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-500" />
            {t('habits.title')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t('habits.subtitle')}
          </p>
        </div>

        <button
          onClick={() => {
            setHabitToEdit(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-orange-600/20 transition-all self-start sm:self-auto min-h-[42px] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('habits.addHabit')}</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2 shadow-sm animate-in fade-in duration-150">
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-700 dark:text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
          >
            {t('common.close')}
          </button>
        </div>
      )}

      {/* Habits List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800">
            <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 mt-3 font-medium">{t('common.loading')}</p>
          </div>
        ) : habits.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900 p-6">
            <Flame className="w-12 h-12 text-slate-300 dark:text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {t('habits.noHabits')}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              {t('habits.noHabitsDesc')}
            </p>
            <button
              onClick={() => {
                setHabitToEdit(null);
                setIsModalOpen(true);
              }}
              className="mt-4 px-4 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-semibold hover:bg-orange-700 shadow-md shadow-orange-600/20 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('habits.createFirstHabit')}</span>
            </button>
          </div>
        ) : (
          habits.map(habit => {
            const category = categories.find(c => c.id === habit.categoryId);
            const isCompletedToday = logLookup.has(`${habit.id}_${todayStr}`);
            const streaks = computeHabitStreaks(habit.id, allLogs);

            // Parse metadata (icon, target)
            let iconName = 'Flame';
            let targetLabel: string | null = null;
            if (habit.description) {
              try {
                const parsed = JSON.parse(habit.description);
                if (parsed.icon) iconName = parsed.icon;
                if (parsed.target) targetLabel = parsed.target;
              } catch {
                targetLabel = habit.description;
              }
            }

            // Count weekly completions
            const weeklyDoneCount = currentWeekDays.filter(d => logLookup.has(`${habit.id}_${d.dateStr}`)).length;

            return (
              <div
                key={habit.id}
                className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-slate-200 dark:border-zinc-800 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Icon & Details */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-2xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200/80 dark:border-orange-900/60 flex items-center justify-center shrink-0 shadow-xs">
                      {getCategoryIcon(iconName, 'w-5 h-5')}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {category && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border"
                            style={{
                              backgroundColor: `${category.color}18`,
                              color: category.color,
                              borderColor: `${category.color}40`,
                            }}
                          >
                            {getCategoryIcon(category.icon, 'w-3 h-3')}
                            <span>{getCategoryDisplayName(category, t)}</span>
                          </span>
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                          {getFrequencyLabel(habit.frequency)}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                        {habit.title}
                      </h3>

                      {targetLabel && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <Target className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{t('habits.target')}: {targetLabel}</span>
                        </div>
                      )}

                      {habit.reminderTime && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{t('common.reminder')}: {habit.reminderTime}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Quick Check-in Button & Three-dot menu */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleLog(habit.id, todayStr)}
                      className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer ${
                        isCompletedToday
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 hover:bg-orange-500 hover:text-white dark:hover:bg-orange-600'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isCompletedToday ? t('habits.todayCompleted') : t('habits.checkIn')}</span>
                    </button>

                    {/* Menu toggle */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveMenuId(activeMenuId === habit.id ? null : habit.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        aria-label="Habit options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuId === habit.id && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={() => setActiveMenuId(null)}
                          />
                          <div
                            className="absolute right-0 top-9 z-40 w-44 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100"
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setHabitToEdit(habit);
                                setIsModalOpen(true);
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>{t('habits.editHabit')}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setHabitToDeleteId(habit.id);
                              }}
                              className="w-full px-3.5 py-2 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2 font-medium cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{t('common.delete')}</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Streaks & Weekly Progress Bar */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Streak Stats */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 text-xs font-extrabold border border-orange-200/60 dark:border-orange-900/40">
                      <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                      <span>{t('habits.streakDays', { count: streaks.currentStreak })}</span>
                    </div>

                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200/60 dark:border-amber-900/40">
                      <Trophy className="w-3.5 h-3.5 text-amber-500" />
                      <span>{t('habits.bestStreak', { count: streaks.bestStreak })}</span>
                    </div>

                    <span className="text-xs text-slate-400 dark:text-zinc-500 font-medium hidden sm:inline">
                      ({t('habits.weeklyDone', { done: weeklyDoneCount })})
                    </span>
                  </div>

                  {/* 7-Day Weekly Progress Bubble Strip */}
                  <div className="flex items-center gap-1.5">
                    {currentWeekDays.map(dayItem => {
                      const isDayDone = logLookup.has(`${habit.id}_${dayItem.dateStr}`);
                      return (
                        <button
                          key={dayItem.dateStr}
                          type="button"
                          onClick={() => handleToggleLog(habit.id, dayItem.dateStr)}
                          title={`${dayItem.dateStr}: ${isDayDone ? t('common.done') : t('common.pending')} (Tap to toggle)`}
                          className={`w-7 h-8 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                            isDayDone
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : dayItem.isToday
                              ? 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 border-2 border-orange-500'
                              : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 hover:bg-slate-200 dark:hover:bg-zinc-700'
                          }`}
                        >
                          <span className="text-[9px] font-extrabold leading-none">
                            {dayItem.dayLabel}
                          </span>
                          <span className="text-[10px] font-bold leading-none mt-0.5">
                            {isDayDone ? '✓' : dayItem.dateNum}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Habit Create / Edit Modal */}
      <HabitModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        habitToEdit={habitToEdit}
        categories={categories}
        onSaved={handleHabitSaved}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!habitToDeleteId}
        title={t('habits.deleteTitle')}
        message={t('habits.deleteMessage')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        confirmVariant="danger"
        loading={deletingHabit}
        onConfirm={confirmDeleteHabit}
        onCancel={() => setHabitToDeleteId(null)}
      />
    </div>
  );
};
