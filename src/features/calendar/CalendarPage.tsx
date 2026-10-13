import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  getTasks,
  toggleTaskCompletion,
  deleteTask,
  snoozeTask,
  postponeTaskToTomorrow,
  rescheduleTask,
} from '../../services/taskService';
import { getCategories } from '../../services/categoryService';
import { createUserTemplate } from '../../services/templateService';
import { getUserSettings } from '../../services/userService';
import { Task, Category, UserSettings } from '../../types';
import { TaskCard } from '../tasks/TaskCard';
import { TaskModal } from '../tasks/TaskModal';
import { RescheduleModal } from '../tasks/RescheduleModal';
import { SnoozeModal } from '../tasks/SnoozeModal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { formatLocalizedDate, getActiveLanguageCode } from '../../utils/dateFormatter';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

type CalendarView = 'month' | 'week' | 'day';

export const CalendarPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser, userProfile } = useAuth();
  const { weekStartsOn } = useTheme();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarView>('month');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Task | null>(null);
  const [snoozeTarget, setSnoozeTarget] = useState<Task | null>(null);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState(false);

  const loadData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError(null);
      const [allTasks, allCats, settings] = await Promise.all([
        getTasks(currentUser.uid),
        getCategories(currentUser.uid),
        getUserSettings(currentUser.uid),
      ]);
      setTasks(allTasks);
      setCategories(allCats);
      setUserSettings(settings);
    } catch (err: unknown) {
      console.error('Failed to load calendar tasks:', err);
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
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const activeLang = getActiveLanguageCode();

  const prevPeriod = () => {
    if (viewMode === 'month') {
      const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
      setCurrentMonth(d);
      setSelectedDate(d);
    } else if (viewMode === 'week') {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - 7);
      setSelectedDate(d);
      setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    } else {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - 1);
      setSelectedDate(d);
      setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  const nextPeriod = () => {
    if (viewMode === 'month') {
      const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
      setCurrentMonth(d);
      setSelectedDate(d);
    } else if (viewMode === 'week') {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + 7);
      setSelectedDate(d);
      setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    } else {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + 1);
      setSelectedDate(d);
      setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  // Weekday column headers respecting weekStartsOn (0: Sunday, 1: Monday)
  const weekdayLabels = useMemo(() => {
    const base = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    if (weekStartsOn === 1) {
      return ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    }
    return base;
  }, [weekStartsOn]);

  // Compute 42-cell matrix for month view
  const monthMatrix = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDayIndex = firstDay.getDay(); // 0 = Sun, 1 = Mon...
    if (weekStartsOn === 1) {
      startDayIndex = (startDayIndex + 6) % 7; // Monday = 0
    }

    const cells: { date: Date; isCurrentMonth: boolean; key: string }[] = [];

    // Preceding month days
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      cells.push({ date: d, isCurrentMonth: false, key: `${y}-${m}-${day}` });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      cells.push({ date: d, isCurrentMonth: true, key: `${y}-${m}-${day}` });
    }

    // Trailing month days up to 35 or 42
    const totalCells = cells.length > 35 ? 42 : 35;
    const remaining = totalCells - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      cells.push({ date: d, isCurrentMonth: false, key: `${y}-${m}-${day}` });
    }

    return cells;
  }, [currentMonth, weekStartsOn]);

  // Tasks grouped by YYYY-MM-DD
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (task.dueAt) {
        const dateStr = typeof task.dueAt === 'string'
          ? task.dueAt.slice(0, 10)
          : new Date((task.dueAt as any).toDate?.() || Date.now()).toISOString().slice(0, 10);
        if (!map.has(dateStr)) map.set(dateStr, []);
        map.get(dateStr)!.push(task);
      }
    }
    return map;
  }, [tasks]);

  const selectedDateKey = useMemo(() => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [selectedDate]);

  const tasksForSelectedDate = useMemo(() => {
    return tasksByDate.get(selectedDateKey) || [];
  }, [tasksByDate, selectedDateKey]);

  // Action handlers
  const handleToggleComplete = async (task: Task) => {
    if (!currentUser) return;
    try {
      await toggleTaskCompletion(currentUser.uid, task);
      setTasks(prev =>
        prev.map(t =>
          t.id === task.id
            ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' }
            : t
        )
      );
    } catch (err) {
      setError(t('errors.generic'));
    }
  };

  const handleSnooze = (task: Task) => {
    setSnoozeTarget(task);
  };

  const confirmSnoozeAction = async (task: Task, minutes: number) => {
    if (!currentUser) return;
    try {
      await snoozeTask(currentUser.uid, task, minutes);
      const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      setTasks(prev =>
        prev.map(t =>
          t.id === task.id
            ? { ...t, snoozedUntil: snoozeUntil, snoozeCount: (t.snoozeCount || 0) + 1 }
            : t
        )
      );
      setToastMessage(t('common.saved'));
    } catch (err) {
      setError(t('errors.generic'));
    }
  };

  const handlePostponeTomorrow = async (task: Task) => {
    if (!currentUser) return;
    try {
      await postponeTaskToTomorrow(currentUser.uid, task);
      setTasks(prev =>
        prev.map(t => {
          if (t.id !== task.id) return t;
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + 1);
          return {
            ...t,
            dueAt: nextDate.toISOString(),
            snoozeCount: (t.snoozeCount || 0) + 1,
          };
        })
      );
      setToastMessage(t('tasks.postponeTomorrow'));
    } catch (err) {
      setError(t('errors.generic'));
    }
  };

  const handleRescheduled = async (taskId: string, newDueAt: string) => {
    if (!currentUser) return;
    try {
      await rescheduleTask(currentUser.uid, taskId, newDueAt);
      setTasks(prev =>
        prev.map(t => (t.id === taskId ? { ...t, dueAt: newDueAt } : t))
      );
      setToastMessage(t('common.saved'));
    } catch (err) {
      setError(t('errors.generic'));
    }
  };

  const confirmDelete = async () => {
    if (!currentUser || !taskToDeleteId) return;
    const id = taskToDeleteId;
    const backup = [...tasks];
    setTasks(prev => prev.filter(t => t.id !== id));
    setTaskToDeleteId(null);
    setDeletingTask(true);
    try {
      await deleteTask(currentUser.uid, id);
      setToastMessage(t('common.deleted', { defaultValue: 'Task deleted' }));
    } catch (err: unknown) {
      setTasks(backup);
      setError(t('errors.generic'));
    } finally {
      setDeletingTask(false);
    }
  };

  const handleSaveAsTemplate = async (task: Task) => {
    if (!currentUser) return;
    try {
      await createUserTemplate(currentUser.uid, task.title, {
        title: task.title,
        description: task.description || '',
        categoryId: task.categoryId || '',
        priority: task.priority,
        reminderLevel: task.reminderLevel,
        recurrence: task.recurrence || null,
        defaultTime: task.dueAt ? (typeof task.dueAt === 'string' ? task.dueAt.slice(11, 16) : '09:00') : '09:00',
      });
      setToastMessage(t('templates.addedToTasks'));
    } catch (err) {
      setError(t('errors.generic'));
    }
  };

  const isTodayDate = (d: Date) => {
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  };

  const isSelectedDate = (d: Date) => {
    return (
      d.getFullYear() === selectedDate.getFullYear() &&
      d.getMonth() === selectedDate.getMonth() &&
      d.getDate() === selectedDate.getDate()
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header with Title and View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            {t('calendar.title')}
          </h1>
        </div>

        {/* View Switcher: Month, Week, Day */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-2xl border border-slate-200 dark:border-zinc-700">
            {(['month', 'week', 'day'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                  viewMode === mode
                    ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {mode === 'month' ? t('calendar.month') : mode === 'week' ? t('calendar.week') : t('calendar.day')}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setTaskToEdit(null);
              setIsTaskModalOpen(true);
            }}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('tasks.addTask')}</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2 shadow-xs animate-in fade-in duration-150">
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

      {/* Calendar Controls & Month/Year Bar */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-zinc-800 shadow-xs relative">
        <div className="flex items-center justify-between">
          <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100">
            {currentMonth.toLocaleDateString(activeLang.startsWith('te') ? 'te-IN' : activeLang.startsWith('hi') ? 'hi-IN' : 'en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={goToToday}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              {t('calendar.todayButton')}
            </button>
            <button
              onClick={prevPeriod}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextPeriod}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Month View Grid */}
        <div className="mt-4">
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {weekdayLabels.map((label, idx) => (
              <span
                key={idx}
                className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {monthMatrix.map(cell => {
              const dayTasks = tasksByDate.get(cell.key) || [];
              const isToday = isTodayDate(cell.date);
              const isSelected = isSelectedDate(cell.date);

              return (
                <button
                  key={cell.key}
                  onClick={() => setSelectedDate(cell.date)}
                  className={`min-h-[52px] sm:min-h-[64px] p-1.5 rounded-2xl flex flex-col items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : isToday
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      : cell.isCurrentMonth
                      ? 'bg-slate-50/60 dark:bg-zinc-800/40 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800'
                      : 'text-slate-300 dark:text-zinc-600 opacity-60 hover:opacity-100'
                  }`}
                >
                  <span className="text-xs font-bold">{cell.date.getDate()}</span>

                  {dayTasks.length > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {dayTasks.slice(0, 3).map((t, idx) => (
                        <div
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected
                              ? 'bg-white'
                              : t.status === 'completed'
                              ? 'bg-emerald-500'
                              : 'bg-indigo-500'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Agenda for Selected Date */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {formatLocalizedDate(selectedDate)}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tasksForSelectedDate.length} {t('common.pending')}
            </p>
          </div>

          <button
            onClick={() => {
              setTaskToEdit(null);
              setIsTaskModalOpen(true);
            }}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('calendar.scheduleTask')}</span>
          </button>
        </div>

        {tasksForSelectedDate.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl">
            <Clock className="w-10 h-10 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {t('calendar.noTasksOnDate')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasksForSelectedDate.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                category={categories.find(c => c.id === task.categoryId)}
                userSettings={userSettings}
                userName={userProfile?.displayName || currentUser?.displayName || undefined}
                onToggleComplete={handleToggleComplete}
                onSnooze={handleSnooze}
                onPostponeTomorrow={handlePostponeTomorrow}
                onReschedule={t => setRescheduleTarget(t)}
                onEdit={t => {
                  setTaskToEdit(t);
                  setIsTaskModalOpen(true);
                }}
                onDelete={id => setTaskToDeleteId(id)}
                onSaveAsTemplate={handleSaveAsTemplate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Task Creation & Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        taskToEdit={taskToEdit}
        initialDueDate={selectedDateKey}
        categories={categories}
        onSaved={savedTask => {
          setTasks(prev => {
            const idx = prev.findIndex(t => t.id === savedTask.id);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = savedTask;
              return copy;
            }
            return [savedTask, ...prev];
          });
          setToastMessage(t('common.saved'));
        }}
      />

      {/* Snooze Modal */}
      <SnoozeModal
        isOpen={Boolean(snoozeTarget)}
        onClose={() => setSnoozeTarget(null)}
        task={snoozeTarget}
        userName={userProfile?.displayName || currentUser?.displayName || undefined}
        userSettings={userSettings}
        onSnooze={confirmSnoozeAction}
        onDoItNow={t => {
          setTaskToEdit(t);
          setIsTaskModalOpen(true);
        }}
        onMoveToTomorrow={handlePostponeTomorrow}
      />

      {/* Reschedule Modal */}
      <RescheduleModal
        isOpen={!!rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        task={rescheduleTarget}
        onRescheduled={handleRescheduled}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!taskToDeleteId}
        title={t('tasks.deleteConfirmTitle')}
        message={t('tasks.deleteConfirmMessage')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        confirmVariant="danger"
        loading={deletingTask}
        onConfirm={confirmDelete}
        onCancel={() => setTaskToDeleteId(null)}
      />
    </div>
  );
};
