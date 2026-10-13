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
import { getUserSettings } from '../../services/userService';
import { Task, Category, Priority, UserSettings } from '../../types';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import { RescheduleModal } from './RescheduleModal';
import { SnoozeModal } from './SnoozeModal';
import { CategoryModal } from '../categories/CategoryModal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { getCategoryDisplayName } from '../../utils/categoryHelper';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  X,
  Clock,
} from 'lucide-react';

export const TasksPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser, userProfile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tabs: Upcoming and Completed
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Task | null>(null);
  const [snoozeTarget, setSnoozeTarget] = useState<Task | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Delete confirmation modal state
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState(false);

  const loadData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError(null);
      const [fetchedTasks, fetchedCategories, settings] = await Promise.all([
        getTasks(currentUser.uid),
        getCategories(currentUser.uid),
        getUserSettings(currentUser.uid),
      ]);
      setTasks(fetchedTasks);
      setCategories(fetchedCategories);
      setUserSettings(settings);
    } catch (err: unknown) {
      console.error('Failed to load tasks:', err);
      setError(t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

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
      console.error('Failed to toggle task completion:', err);
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

  const handleOpenEdit = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  const handleOpenNew = () => {
    setTaskToEdit(null);
    setIsTaskModalOpen(true);
  };

  const requestDelete = (taskId: string) => {
    setTaskToDeleteId(taskId);
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
      console.error('Failed to delete task:', err);
      setTasks(backup);
      setError(t('errors.generic'));
    } finally {
      setDeletingTask(false);
    }
  };

  const handleTaskSaved = (savedTask: Task) => {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === savedTask.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = savedTask;
        return updated;
      }
      return [savedTask, ...prev];
    });
    setToastMessage(t('common.saved'));
  };

  const handleCategorySaved = (newCat: Category) => {
    setCategories(prev => {
      const idx = prev.findIndex(c => c.id === newCat.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newCat;
        return copy;
      }
      return [...prev, newCat];
    });
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

  // Filtered & Searched Tasks
  const filteredTasks = useMemo(() => {
    const now = new Date().getTime();
    return tasks.filter(task => {
      const isCompleted = task.status === 'completed';

      // Tab filter
      if (activeTab === 'upcoming' && isCompleted) return false;
      if (activeTab === 'completed' && !isCompleted) return false;

      // Category filter
      if (categoryFilter !== 'all' && task.categoryId !== categoryFilter) return false;

      // Priority filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

      // Overdue filter
      if (overdueOnly) {
        if (isCompleted || !task.dueAt) return false;
        const dueDate = new Date(
          typeof task.dueAt === 'string'
            ? task.dueAt
            : (task.dueAt as any).toDate?.() || Date.now()
        ).getTime();
        if (dueDate >= now) return false;
      }

      // Live search query (title or description)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDesc = (task.description || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc) return false;
      }

      return true;
    });
  }, [tasks, activeTab, categoryFilter, priorityFilter, overdueOnly, searchQuery]);

  const upcomingCount = tasks.filter(t => t.status !== 'completed').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const overdueCount = tasks.filter(t => {
    if (t.status === 'completed' || !t.dueAt) return false;
    const dueDate = new Date(
      typeof t.dueAt === 'string' ? t.dueAt : (t.dueAt as any).toDate?.() || Date.now()
    ).getTime();
    return dueDate < Date.now();
  }).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            {t('tasks.pageTitle')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t('tasks.pageSubtitle')}
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto min-h-[42px] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('tasks.addTask')}</span>
        </button>
      </div>

      {/* Success Toast */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2.5 shadow-xs animate-in fade-in duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-700 dark:text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
          >
            {t('common.close')}
          </button>
        </div>
      )}

      {/* Tabs: Upcoming & Completed */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-1">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`pb-2.5 px-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'upcoming'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <span>{t('tasks.filterPending')}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'upcoming'
                  ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {upcomingCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`pb-2.5 px-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'completed'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <span>{t('tasks.filterCompleted')}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'completed'
                  ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {completedCount}
            </span>
          </button>
        </div>

        {overdueCount > 0 && activeTab === 'upcoming' && (
          <button
            onClick={() => setOverdueOnly(!overdueOnly)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
              overdueOnly
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{t('tasks.overdueCount', { count: overdueCount })}</span>
          </button>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-3">
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('tasks.searchPlaceholder')}
            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters strip */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Category filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">{t('templates.allCategories')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {getCategoryDisplayName(c, t)}
                </option>
              ))}
            </select>
          </div>

          {/* Priority filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">{t('tasks.filterAll')}</option>
              <option value="high">{t('tasks.priorities.high')}</option>
              <option value="medium">{t('tasks.priorities.medium')}</option>
              <option value="low">{t('tasks.priorities.low')}</option>
            </select>
          </div>

          {/* Overdue filter pill */}
          <button
            type="button"
            onClick={() => setOverdueOnly(!overdueOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              overdueOnly
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-zinc-700'
            }`}
          >
            {t('tasks.overdue')}
          </button>

          {/* Reset filters */}
          {(categoryFilter !== 'all' || priorityFilter !== 'all' || overdueOnly || searchQuery) && (
            <button
              onClick={() => {
                setCategoryFilter('all');
                setPriorityFilter('all');
                setOverdueOnly(false);
                setSearchQuery('');
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline ml-auto font-medium cursor-pointer"
            >
              {t('common.filter')}
            </button>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800">
            <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 mt-3 font-medium">{t('common.loading')}</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900 p-6">
            <Clock className="w-12 h-12 text-slate-300 dark:text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {t('tasks.noTasksFound')}
            </h3>
            {activeTab === 'upcoming' && (
              <button
                onClick={handleOpenNew}
                className="mt-4 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('tasks.addTask')}</span>
              </button>
            )}
          </div>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              category={categories.find((c) => c.id === task.categoryId)}
              userSettings={userSettings}
              userName={userProfile?.displayName || currentUser?.displayName || undefined}
              onToggleComplete={handleToggleComplete}
              onSnooze={handleSnooze}
              onPostponeTomorrow={handlePostponeTomorrow}
              onReschedule={(t) => setRescheduleTarget(t)}
              onEdit={handleOpenEdit}
              onDelete={requestDelete}
              onSaveAsTemplate={handleSaveAsTemplate}
            />
          ))
        )}
      </div>

      {/* Task Creation & Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        taskToEdit={taskToEdit}
        categories={categories}
        onSaved={handleTaskSaved}
        onRequestNewCategory={() => setIsCategoryModalOpen(true)}
      />

      {/* Snooze Modal with Smart Captions and Max Snooze Limit */}
      <SnoozeModal
        isOpen={Boolean(snoozeTarget)}
        onClose={() => setSnoozeTarget(null)}
        task={snoozeTarget}
        userName={userProfile?.displayName || currentUser?.displayName || undefined}
        userSettings={userSettings}
        onSnooze={confirmSnoozeAction}
        onDoItNow={(t) => {
          handleOpenEdit(t);
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

      {/* Custom Category Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSaved={handleCategorySaved}
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
