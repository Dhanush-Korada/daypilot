import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Task, UserSettings } from '../../types';
import { getSmartCaption, SmartCaptionResult } from '../../services/captions';
import { LanguageCode } from '../../config/languages';
import {
  Clock,
  X,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface SnoozeModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  userName?: string;
  userSettings?: UserSettings | null;
  onSnooze: (task: Task, minutes: number) => Promise<void>;
  onDoItNow: (task: Task) => void;
  onMoveToTomorrow: (task: Task) => Promise<void>;
}

export const SnoozeModal: React.FC<SnoozeModalProps> = ({
  isOpen,
  onClose,
  task,
  userName = 'there',
  userSettings,
  onSnooze,
  onDoItNow,
  onMoveToTomorrow,
}) => {
  const { t, i18n } = useTranslation();
  const [smartCaption, setSmartCaption] = useState<SmartCaptionResult | null>(null);
  const [customMinutes, setCustomMinutes] = useState<number>(15);
  const [loading, setLoading] = useState(false);

  const maxSnoozeCount = userSettings?.maxSnoozeCount ?? 3;
  const currentSnoozeCount = task?.snoozeCount ?? 0;
  const isLimitReached = currentSnoozeCount >= maxSnoozeCount;

  useEffect(() => {
    if (isOpen && task) {
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
  }, [isOpen, task, userName, i18n.language, userSettings]);

  if (!isOpen || !task) return null;

  const handleSelectMinutes = async (mins: number) => {
    try {
      setLoading(true);
      await onSnooze(task, mins);
      onClose();
    } catch (err) {
      console.error('Failed to snooze task:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveTomorrow = async () => {
    try {
      setLoading(true);
      await onMoveToTomorrow(task);
      onClose();
    } catch (err) {
      console.error('Failed to postpone task:', err);
    } finally {
      setLoading(false);
    }
  };

  const getLevelBadge = (level: 1 | 2 | 3) => {
    if (level === 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-900">
          <Flame className="w-3 h-3 text-rose-500 fill-rose-500" />
          <span>{t('captions.roastLevel')}</span>
        </span>
      );
    }
    if (level === 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-900">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          <span>{t('captions.firmLevel')}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
        <Sparkles className="w-3 h-3 text-indigo-500" />
        <span>{t('captions.gentleLevel')}</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-150 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t('tasks.snoozeOptions')}
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                {t('captions.snoozeCountLabel', { current: currentSnoozeCount, max: maxSnoozeCount })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Title preview */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-800">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
            {task.title}
          </p>
        </div>

        {/* Smart Caption callout card */}
        {smartCaption && (
          <div
            className={`p-4 rounded-2xl border transition-all ${
              smartCaption.level === 3
                ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
                : smartCaption.level === 2
                ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
                : 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/60 text-indigo-900 dark:text-indigo-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                {t('captions.title')}
              </span>
              {getLevelBadge(smartCaption.level)}
            </div>
            <p className="text-xs sm:text-sm font-semibold leading-relaxed">
              "{smartCaption.text}"
            </p>
          </div>
        )}

        {/* If snooze limit reached: STOP offering snooze, show "Do it now" & "Move to tomorrow" */}
        {isLimitReached ? (
          <div className="space-y-3 pt-1">
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t('captions.snoozeLimitReachedDesc', { max: maxSnoozeCount })}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  onDoItNow(task);
                  onClose();
                }}
                className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('captions.doItNow')}</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleMoveTomorrow}
                className="py-3 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Calendar className="w-4 h-4" />
                <span>{t('captions.moveToTomorrow')}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Normal Snooze Options */
          <div className="space-y-3 pt-1">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('common.snooze')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { mins: 5, label: t('tasks.snooze5Min') },
                { mins: 10, label: t('tasks.snooze10Min') },
                { mins: 15, label: t('tasks.snooze15Min') },
                { mins: 30, label: t('tasks.snooze30Min') },
                { mins: 60, label: t('tasks.snooze1Hour') },
              ].map(opt => (
                <button
                  key={opt.mins}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSelectMinutes(opt.mins)}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span>{opt.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ))}

              <button
                type="button"
                disabled={loading}
                onClick={handleMoveTomorrow}
                className="py-2.5 px-3 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer disabled:opacity-50"
              >
                <span>{t('common.tomorrow')}</span>
                <Calendar className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
