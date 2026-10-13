import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Task, Category, UserSettings } from '../../types';
import { getCategoryIcon } from '../categories/categoryIcons';
import { getCategoryDisplayName } from '../../utils/categoryLocalization';
import { getSmartCaption, SmartCaptionResult } from '../../services/captions';
import { LanguageCode } from '../../config/languages';
import {
  CheckCircle2,
  Circle,
  Clock,
  RotateCw,
  Bell,
  AlertTriangle,
  MoreVertical,
  Calendar,
  FastForward,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Flame,
  Sparkles,
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  category?: Category;
  userSettings?: UserSettings | null;
  userName?: string;
  onToggleComplete: (task: Task) => void;
  onSnooze: (task: Task, minutes?: number) => void;
  onPostponeTomorrow: (task: Task) => void;
  onReschedule: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onSaveAsTemplate?: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  category,
  userSettings,
  userName = 'there',
  onToggleComplete,
  onSnooze,
  onPostponeTomorrow,
  onReschedule,
  onEdit,
  onDelete,
  onSaveAsTemplate,
}) => {
  const { t, i18n } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [smartCaption, setSmartCaption] = useState<SmartCaptionResult | null>(null);

  const isDone = task.status === 'completed';

  // Check if overdue
  let isOverdue = false;
  let formattedDue: string | null = null;
  if (task.dueAt) {
    const dueDate = new Date(
      typeof task.dueAt === 'string'
        ? task.dueAt
        : (task.dueAt as any).toDate?.() || Date.now()
    );
    if (!isNaN(dueDate.getTime())) {
      const now = new Date();
      isOverdue = !isDone && dueDate.getTime() < now.getTime();
      formattedDue = dueDate.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }

  // Snooze info
  let snoozeFormatted: string | null = null;
  const isSnoozed = Boolean(task.snoozedUntil && (task.snoozeCount || 0) > 0);
  if (task.snoozedUntil) {
    const sDate = new Date(
      typeof task.snoozedUntil === 'string'
        ? task.snoozedUntil
        : (task.snoozedUntil as any).toDate?.() || Date.now()
    );
    if (!isNaN(sDate.getTime())) {
      snoozeFormatted = sDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  // Fetch Smart Caption on overdue or snoozed task
  useEffect(() => {
    if (!isDone && (isOverdue || isSnoozed)) {
      const lang = (i18n.language || 'en') as LanguageCode;
      getSmartCaption({
        task,
        userName,
        language: lang,
        userSettings,
      }).then(res => {
        setSmartCaption(res);
      });
    } else {
      setSmartCaption(null);
    }
  }, [task, isDone, isOverdue, isSnoozed, userName, i18n.language, userSettings]);

  const getPriorityBadge = () => {
    switch (task.priority) {
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60">
            {t('tasks.priorities.high')}
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
            {t('tasks.priorities.medium')}
          </span>
        );
      case 'low':
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-slate-300 border border-slate-200 dark:border-zinc-700">
            {t('tasks.priorities.low')}
          </span>
        );
    }
  };

  const getReminderBadge = () => {
    if (task.reminderLevel === 'persistent') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60">
          <AlertTriangle className="w-3 h-3" />
          <span>{t('tasks.reminderStyle.persistent')}</span>
        </span>
      );
    }
    if (task.reminderLevel === 'important') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
          <Bell className="w-3 h-3" />
          <span>{t('common.reminder')}</span>
        </span>
      );
    }
    return null;
  };

  const getRecurrenceLabel = () => {
    if (!task.recurrence || !task.recurrence.frequency) return null;
    const freq = task.recurrence.frequency;
    if (freq === 'daily') return t('tasks.recurrenceDaily');
    if (freq === 'weekly') return t('tasks.recurrenceWeekly');
    if (freq === 'monthly') return t('tasks.recurrenceMonthly');
    if (freq === 'custom') return t('tasks.recurrenceCustom');
    return freq;
  };

  return (
    <div
      className={`rounded-2xl border p-4 transition-all relative ${
        isDone
          ? 'bg-slate-50/90 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 opacity-80'
          : isOverdue
          ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900 shadow-xs'
          : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 shadow-xs'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Checkbox + Content */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onToggleComplete(task)}
            className="mt-0.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shrink-0 cursor-pointer"
            aria-label={isDone ? t('tasks.markIncomplete') : t('tasks.markDone')}
          >
            {isDone ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950/50" />
            ) : (
              <Circle className="w-5 h-5 hover:scale-105 transition-transform" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            {/* Top Tag Row: Category, Priority, Recurrence, Reminder Style */}
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              {category && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold"
                  style={{ backgroundColor: `${category.color}20`, color: category.color }}
                >
                  {getCategoryIcon(category.icon, 'w-3 h-3')}
                  <span>{getCategoryDisplayName(category, t)}</span>
                </span>
              )}

              {getPriorityBadge()}

              {getRecurrenceLabel() && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/60">
                  <RotateCw className="w-2.5 h-2.5" />
                  <span>{getRecurrenceLabel()}</span>
                </span>
              )}

              {getReminderBadge()}

              {isOverdue && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-600 text-white animate-pulse">
                  {t('tasks.overdue')}
                </span>
              )}
            </div>

            {/* Task Title */}
            <h3
              className={`text-sm sm:text-base font-bold leading-snug break-words ${
                isDone
                  ? 'line-through text-slate-400 dark:text-zinc-500'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {task.title}
            </h3>

            {/* Notes / Description */}
            {task.description && (
              <div className="mt-1">
                <p
                  className={`text-xs text-slate-600 dark:text-zinc-300 leading-relaxed ${
                    showNotes ? '' : 'line-clamp-2'
                  }`}
                >
                  {task.description}
                </p>
                {task.description.length > 80 && (
                  <button
                    type="button"
                    onClick={() => setShowNotes(!showNotes)}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 mt-0.5 font-medium cursor-pointer"
                  >
                    {showNotes ? (
                      <>
                        <span>{t('common.close')}</span>
                        <ChevronUp className="w-3 h-3" />
                      </>
                    ) : (
                      <>
                        <span>{t('common.info')}</span>
                        <ChevronDown className="w-3 h-3" />
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Smart Caption Card when overdue or snoozed */}
            {smartCaption && (
              <div
                className={`mt-2 p-2.5 rounded-xl border text-xs font-semibold leading-relaxed flex items-start gap-2 ${
                  smartCaption.level === 3
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200'
                    : smartCaption.level === 2
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200'
                    : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/60 text-indigo-800 dark:text-indigo-200'
                }`}
              >
                {smartCaption.level === 3 ? (
                  <Flame className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 fill-rose-500" />
                ) : smartCaption.level === 2 ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                ) : (
                  <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                )}
                <span>"{smartCaption.text}"</span>
              </div>
            )}

            {/* Timestamps & Info strip */}
            <div className="flex flex-wrap items-center gap-3 mt-2.5 text-[11px] text-slate-600 dark:text-zinc-400">
              {formattedDue && (
                <div
                  className={`flex items-center gap-1.5 font-medium ${
                    isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : ''
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>{formattedDue}</span>
                </div>
              )}

              {snoozeFormatted && (
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                  <FastForward className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('common.snooze')}: {snoozeFormatted} ({task.snoozeCount || 1}x)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Three-dot menu */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu((prev) => !prev);
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title={t('common.actions')}
            aria-label={t('common.actions')}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }}
              />
              <div
                className="absolute right-0 top-8 z-40 w-48 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleComplete(task);
                    setShowMenu(false);
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 text-slate-700 dark:text-slate-200 font-medium transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{isDone ? t('tasks.markIncomplete') : t('tasks.markDone')}</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSnooze(task);
                    setShowMenu(false);
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 text-slate-700 dark:text-slate-200 font-medium transition-colors cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{t('tasks.snoozeOptions')}</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onPostponeTomorrow(task);
                    setShowMenu(false);
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 text-slate-700 dark:text-slate-200 font-medium transition-colors cursor-pointer"
                >
                  <FastForward className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>{t('common.tomorrow')}</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onReschedule(task);
                    setShowMenu(false);
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 text-slate-700 dark:text-slate-200 font-medium transition-colors cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>{t('calendar.scheduleTask')}</span>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit(task);
                    setShowMenu(false);
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 text-slate-700 dark:text-slate-200 font-medium transition-colors cursor-pointer"
                >
                  <Edit2 className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>{t('tasks.editTask')}</span>
                </button>

                {onSaveAsTemplate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSaveAsTemplate(task);
                      setShowMenu(false);
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 text-slate-700 dark:text-slate-200 font-medium transition-colors cursor-pointer"
                  >
                    <Bookmark className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>{t('tasks.saveAsTemplate')}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(task.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>{t('common.delete')}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick Action Button bar: wraps onto 2 rows on mobile so NO button is clipped */}
      <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800/80">
        <button
          type="button"
          onClick={() => onToggleComplete(task)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
            isDone
              ? 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{isDone ? t('habits.undo') : t('common.done')}</span>
        </button>

        {!isDone && (
          <>
            <button
              type="button"
              onClick={() => onSnooze(task)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200/80 dark:border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title={t('tasks.snoozeOptions')}
            >
              <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>{t('common.snooze')}</span>
            </button>

            <button
              type="button"
              onClick={() => onPostponeTomorrow(task)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200/80 dark:border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title={t('common.tomorrow')}
            >
              <FastForward className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span>{t('common.tomorrow')}</span>
            </button>

            <button
              type="button"
              onClick={() => onReschedule(task)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200/80 dark:border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span>{t('calendar.scheduleTask')}</span>
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => onEdit(task)}
          className="ml-auto shrink-0 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title={t('common.edit')}
          aria-label={t('common.edit')}
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
