import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
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
import { Task, Category } from '../../types';
import { TaskCard } from '../tasks/TaskCard';
import { TaskModal } from '../tasks/TaskModal';
import { RescheduleModal } from '../tasks/RescheduleModal';
import { CategoryModal } from '../categories/CategoryModal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { getCategoryIcon } from '../categories/categoryIcons';
import { formatFriendlyDate } from '../../utils/dateFormatter';
import {
  Compass,
  Plus,
  Clock,
  CheckCircle2,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Sparkles,
  AlertCircle,
  Bell,
  ArrowRight,
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: 'calendar' | 'habits' | 'tasks' | 'settings') => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { currentUser, userProfile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Section switcher
  const [activeSection, setActiveSection] = useState<'today' | 'upcoming' | 'overdue' | 'completed'>('today');

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Task | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Delete modal state
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState(false);

  // Current time state for ticking live countdown
  const [nowTime, setNowTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const loadData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError(null);
      const [fetchedTasks, fetchedCategories] = await Promise.all([
        getTasks(currentUser.uid),
        getCategories(currentUser.uid),
      ]);
      setTasks(fetchedTasks);
      setCategories(fetchedCategories);
    } catch (err: unknown) {
      console.error('Failed to load home data:', err);
      setError(t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Localized Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.greetingMorning');
    if (hour < 17) return t('home.greetingAfternoon');
    if (hour < 21) return t('home.greetingEvening');
    return t('home.greetingNight');
  }, [t]);

  const todayStr = useMemo(() => {
    return formatFriendlyDate(new Date());
  }, []);

  // Quick Action Handlers
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
      console.error('Failed to toggle completion:', err);
    }
  };

  const handleSnooze = async (task: Task, minutes = 15) => {
    if (!currentUser) return;
    try {
      await snoozeTask(currentUser.uid, task, minutes);
      const snoozeTime = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      setTasks(prev =>
        prev.map(t =>
          t.id === task.id
            ? { ...t, snoozeCount: (t.snoozeCount || 0) + 1, snoozedUntil: snoozeTime }
            : t
        )
      );
      setToastMessage(t('tasks.snooze15Min'));
    } catch (err) {
      console.error('Failed to snooze task:', err);
    }
  };

  const handlePostponeTomorrow = async (task: Task) => {
    if (!currentUser) return;
    try {
      await postponeTaskToTomorrow(currentUser.uid, task);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowIso = tomorrow.toISOString();
      setTasks(prev =>
        prev.map(t =>
          t.id === task.id
            ? { ...t, dueAt: tomorrowIso }
            : t
        )
      );
      setToastMessage(t('common.tomorrow'));
    } catch (err) {
      console.error('Failed to postpone task:', err);
    }
  };

  const handleRescheduled = async (taskId: string, newDueAt: string) => {
    if (!currentUser) return;
    try {
      await rescheduleTask(currentUser.uid, taskId, newDueAt);
      setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, dueAt: newDueAt } : t)));
      setRescheduleTarget(null);
      setToastMessage(t('common.saved'));
    } catch (err) {
      console.error('Failed to reschedule:', err);
    }
  };

  const handleTaskSaved = (savedTask: Task) => {
    setTasks(prev => {
      const exists = prev.some(t => t.id === savedTask.id);
      if (exists) {
        return prev.map(t => (t.id === savedTask.id ? savedTask : t));
      }
      return [savedTask, ...prev];
    });
    setIsTaskModalOpen(false);
    setTaskToEdit(null);
    setToastMessage(t('templates.addedToTasks'));
  };

  const requestDelete = (taskId: string) => {
    setTaskToDeleteId(taskId);
  };

  const confirmDelete = async () => {
    if (!currentUser || !taskToDeleteId) return;
    try {
      setDeletingTask(true);
      await deleteTask(currentUser.uid, taskToDeleteId);
      setTasks(prev => prev.filter(t => t.id !== taskToDeleteId));
      setTaskToDeleteId(null);
      setToastMessage(t('common.delete'));
    } catch (err) {
      console.error('Failed to delete task:', err);
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
        categoryId: task.categoryId,
        priority: task.priority,
        recurrence: task.recurrence,
        reminderLevel: task.reminderLevel,
      });
      setToastMessage(t('common.saved'));
    } catch (err) {
      console.error('Failed to save template', err);
    }
  };

  // Helper to extract YYYY-MM-DD from dueAt
  const getTaskDateStr = (dueAt: Task['dueAt']): string | null => {
    if (!dueAt) return null;
    if (typeof dueAt === 'string') return dueAt.split('T')[0];
    if ((dueAt as any).toDate) return (dueAt as any).toDate().toISOString().split('T')[0];
    return null;
  };

  // Filter tasks into groups
  const todayDateStr = new Date().toISOString().split('T')[0];

  const todayTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.status === 'completed') return false;
      const dStr = getTaskDateStr(t.dueAt);
      if (!dStr) return true; // floating tasks show on today
      return dStr === todayDateStr;
    });
  }, [tasks, todayDateStr]);

  const upcomingTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.status === 'completed') return false;
      const dStr = getTaskDateStr(t.dueAt);
      if (!dStr) return false;
      return dStr > todayDateStr;
    });
  }, [tasks, todayDateStr]);

  const overdueTasks = useMemo(() => {
    const now = new Date();
    return tasks.filter(t => {
      if (t.status === 'completed') return false;
      if (t.dueAt) {
        const d = new Date(typeof t.dueAt === 'string' ? t.dueAt : (t.dueAt as any).toDate?.() || Date.now());
        return d.getTime() < now.getTime();
      }
      return false;
    });
  }, [tasks]);

  const completedTasks = useMemo(() => {
    return tasks.filter(t => t.status === 'completed');
  }, [tasks]);

  // Daily Progress ring
  const totalTodayTasks = todayTasks.length + completedTasks.filter(t => getTaskDateStr(t.dueAt) === todayDateStr).length;
  const todayCompletedCount = completedTasks.filter(t => getTaskDateStr(t.dueAt) === todayDateStr).length;
  const progressPercent = totalTodayTasks > 0 ? Math.round((todayCompletedCount / totalTodayTasks) * 100) : 0;

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Next upcoming reminder calculation
  const nextReminderTask = useMemo(() => {
    const upcomingPending = tasks
      .filter(t => t.status !== 'completed' && (t.dueAt || t.snoozedUntil))
      .map(t => {
        const timeToUse = t.snoozedUntil || t.dueAt;
        const timeMs = new Date(
          typeof timeToUse === 'string' ? timeToUse : (timeToUse as any).toDate?.() || Date.now()
        ).getTime();
        return { task: t, timeMs };
      })
      .filter(item => item.timeMs > nowTime)
      .sort((a, b) => a.timeMs - b.timeMs);

    return upcomingPending[0] || null;
  }, [tasks, nowTime]);

  // Live countdown string
  const liveCountdownText = useMemo(() => {
    if (!nextReminderTask) return null;
    const diffMs = nextReminderTask.timeMs - nowTime;
    if (diffMs <= 0) return t('tasks.overdue');

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }, [nextReminderTask, nowTime, t]);

  const activeTaskList = useMemo(() => {
    switch (activeSection) {
      case 'today':
        return todayTasks;
      case 'upcoming':
        return upcomingTasks;
      case 'overdue':
        return overdueTasks;
      case 'completed':
        return completedTasks;
    }
  }, [activeSection, todayTasks, upcomingTasks, overdueTasks, completedTasks]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24 relative">
      {/* Welcome Banner with Daily Progress Ring & Today's Date */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1.5">
              <Calendar className="w-4 h-4" />
              <span>{todayStr}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {greeting}, {userProfile?.displayName || 'Planner'}!
            </h1>
            <p className="text-indigo-100/90 text-sm mt-1 max-w-md">
              {overdueTasks.length > 0
                ? `${overdueTasks.length} ${t('tasks.overdue')} tasks.`
                : todayTasks.length > 0
                ? `${t('home.tasksRemaining', { count: todayTasks.length })}.`
                : t('home.noTasksToday')}
            </p>

            {/* Category Quick Tags */}
            <div className="flex flex-wrap gap-1.5 mt-4">
              {categories.slice(0, 6).map((cat) => (
                <span
                  key={cat.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/15 backdrop-blur-xs text-[11px] font-medium"
                >
                  {getCategoryIcon(cat.icon, 'w-3 h-3')}
                  <span>{cat.name}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Daily Progress Ring */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 shrink-0 self-start md:self-auto">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-20 h-20 -rotate-90 transform" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  className="text-white/20 stroke-current"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  className="text-white stroke-current transition-all duration-700 ease-out"
                  strokeWidth="6"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-extrabold">{progressPercent}%</span>
              </div>
            </div>

            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-indigo-200 block">
                {t('home.progress')}
              </span>
              <p className="text-sm font-semibold mt-0.5">
                {todayCompletedCount} / {totalTodayTasks} {t('common.done')}
              </p>
              <span className="text-[11px] text-indigo-200/90 block mt-0.5">
                {totalTodayTasks === 0 ? t('home.noTasksSubtitle') : progressPercent === 100 ? t('home.noTasksToday') : t('home.pendingTasks')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2.5 shadow-xs animate-in fade-in duration-200">
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
            onClick={loadData}
            className="px-3 py-1 bg-rose-100 dark:bg-rose-900 rounded-lg text-xs font-semibold hover:bg-rose-200 cursor-pointer"
          >
            {t('common.refresh')}
          </button>
        </div>
      )}

      {/* "Next Reminder" Card with Live Countdown */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            <span>{t('home.upcomingReminders')}</span>
          </div>
          {nextReminderTask && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60">
              {liveCountdownText}
            </span>
          )}
        </div>

        {nextReminderTask ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/60">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                {(() => {
                  const cat = categories.find(c => c.id === nextReminderTask.task.categoryId);
                  if (!cat) return null;
                  return (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-semibold"
                      style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                    >
                      {getCategoryIcon(cat.icon, 'w-3 h-3')}
                      <span>{cat.name}</span>
                    </span>
                  );
                })()}
                <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                  {new Date(nextReminderTask.timeMs).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                {nextReminderTask.task.title}
              </h3>
              {nextReminderTask.task.description && (
                <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5 line-clamp-1">
                  {nextReminderTask.task.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleToggleComplete(nextReminderTask.task)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t('common.done')}</span>
              </button>
              <button
                onClick={() => handleSnooze(nextReminderTask.task, 15)}
                className="px-3 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('common.snooze')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 text-center">
            <Sparkles className="w-6 h-6 text-indigo-500 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-slate-600 dark:text-zinc-400">
              {t('home.noTasksToday')}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
              {t('home.noTasksSubtitle')}
            </p>
          </div>
        )}
      </div>

      {/* Sections Strip: Today / Upcoming / Overdue / Completed */}
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {[
            { id: 'today', label: t('common.today'), count: todayTasks.length, color: 'indigo' },
            { id: 'upcoming', label: t('home.upcomingReminders'), count: upcomingTasks.length, color: 'blue' },
            { id: 'overdue', label: t('tasks.overdue'), count: overdueTasks.length, color: 'rose' },
            { id: 'completed', label: t('tasks.filterCompleted'), count: completedTasks.length, color: 'emerald' },
          ].map((sec) => {
            const isSelected = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id as any)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                    : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider truncate mr-1">{sec.label}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-extrabold shrink-0 ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : sec.id === 'overdue' && sec.count > 0
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {sec.count}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Section List */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400 mt-2">{t('common.loading')}</p>
            </div>
          ) : activeTaskList.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900 p-6">
              <Clock className="w-10 h-10 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {t('tasks.noTasksFound')}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeSection === 'today'
                  ? t('home.noTasksSubtitle')
                  : t('tasks.noTasksFound')}
              </p>
              {activeSection !== 'completed' && (
                <button
                  onClick={() => {
                    setTaskToEdit(null);
                    setIsTaskModalOpen(true);
                  }}
                  className="mt-3 px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-semibold hover:bg-indigo-100 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('tasks.addTask')}</span>
                </button>
              )}
            </div>
          ) : (
            activeTaskList.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                category={categories.find((c) => c.id === task.categoryId)}
                onToggleComplete={handleToggleComplete}
                onSnooze={handleSnooze}
                onPostponeTomorrow={handlePostponeTomorrow}
                onReschedule={(t) => setRescheduleTarget(t)}
                onEdit={(t) => {
                  setTaskToEdit(t);
                  setIsTaskModalOpen(true);
                }}
                onDelete={requestDelete}
                onSaveAsTemplate={handleSaveAsTemplate}
              />
            ))
          )}
        </div>
      </div>

      {/* Floating Action Button (FAB) for "Add New Task" */}
      <button
        onClick={() => {
          setTaskToEdit(null);
          setIsTaskModalOpen(true);
        }}
        aria-label={t('tasks.addTask')}
        className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-40 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center gap-2 group active:scale-95 transition-all min-h-[52px] min-w-[52px] cursor-pointer"
      >
        <Plus className="w-6 h-6 transition-transform group-hover:rotate-90" />
        <span className="text-xs font-bold tracking-wide pr-1 hidden sm:inline">
          {t('tasks.addTask')}
        </span>
      </button>

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        taskToEdit={taskToEdit}
        categories={categories}
        onSaved={handleTaskSaved}
        onRequestNewCategory={() => setIsCategoryModalOpen(true)}
      />

      {/* Reschedule Modal */}
      <RescheduleModal
        isOpen={!!rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        task={rescheduleTarget}
        onRescheduled={handleRescheduled}
      />

      {/* Custom Category Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSaved={(newCat) => {
          setCategories(prev => [...prev, newCat]);
        }}
      />

      {/* Confirm Delete Modal */}
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
