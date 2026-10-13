import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createTask, updateTask } from '../../services/taskService';
import { Task, Category, Priority, ReminderLevel, RecurrenceConfig } from '../../types';
import {
  X,
  Calendar,
  Clock,
  Bell,
  RotateCw,
  AlertCircle,
  Plus,
  Check,
} from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  initialDueDate?: string;
  categories: Category[];
  onSaved: (task: Task) => void;
  onRequestNewCategory?: () => void;
}

const PRESET_REMINDERS = [
  { label: 'At time of event', offset: 0 },
  { label: '10 minutes before', offset: 10 },
  { label: '1 hour before', offset: 60 },
  { label: '1 day before', offset: 1440 },
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  initialDueDate,
  categories,
  onSaved,
  onRequestNewCategory,
}) => {
  const { currentUser } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('09:00');
  const [hasDueTime, setHasDueTime] = useState(true);
  const [priority, setPriority] = useState<Priority>('medium');
  const [reminderLevel, setReminderLevel] = useState<ReminderLevel>('normal');
  const [selectedReminders, setSelectedReminders] = useState<number[]>([10]);
  const [customReminder, setCustomReminder] = useState<string>('');
  
  // Recurrence
  const [recurrenceType, setRecurrenceType] = useState<string>('none');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 2, 3, 4, 5]); // default Mon-Fri
  const [customInterval, setCustomInterval] = useState<number>(1);
  const [customUnit, setCustomUnit] = useState<'days' | 'weeks'>('days');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setCategoryId(taskToEdit.categoryId || categories[0]?.id || '');
      setPriority(taskToEdit.priority || 'medium');
      setReminderLevel(taskToEdit.reminderLevel || 'normal');
      setSelectedReminders(taskToEdit.reminders && taskToEdit.reminders.length > 0 ? taskToEdit.reminders : [10]);

      if (taskToEdit.dueAt) {
        const dateObj = new Date(
          typeof taskToEdit.dueAt === 'string'
            ? taskToEdit.dueAt
            : (taskToEdit.dueAt as any).toDate?.() || Date.now()
        );
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        setDueDate(`${yyyy}-${mm}-${dd}`);

        const hh = String(dateObj.getHours()).padStart(2, '0');
        const min = String(dateObj.getMinutes()).padStart(2, '0');
        setDueTime(`${hh}:${min}`);
        setHasDueTime(true);
      } else {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setDueDate(`${yyyy}-${mm}-${dd}`);
        setDueTime('09:00');
        setHasDueTime(false);
      }

      if (taskToEdit.recurrence) {
        const rec = taskToEdit.recurrence;
        setRecurrenceType(rec.frequency || 'none');
        if (rec.daysOfWeek) setSelectedWeekdays(rec.daysOfWeek);
        if (rec.interval) setCustomInterval(rec.interval);
      } else {
        setRecurrenceType('none');
      }
    } else {
      // Defaults for new task
      setTitle('');
      setDescription('');
      setCategoryId(categories[0]?.id || '');
      if (initialDueDate) {
        setDueDate(initialDueDate);
      } else {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setDueDate(`${yyyy}-${mm}-${dd}`);
      }
      setDueTime('09:00');
      setHasDueTime(true);
      setPriority('medium');
      setReminderLevel('normal');
      setSelectedReminders([10]);
      setRecurrenceType('none');
      setSelectedWeekdays([1, 2, 3, 4, 5]);
      setCustomInterval(1);
    }
    setError(null);
  }, [taskToEdit, isOpen, categories, initialDueDate]);

  if (!isOpen) return null;

  const toggleReminder = (offset: number) => {
    setSelectedReminders(prev =>
      prev.includes(offset) ? prev.filter(o => o !== offset) : [...prev, offset]
    );
  };

  const handleAddCustomReminder = () => {
    const val = parseInt(customReminder, 10);
    if (!isNaN(val) && val >= 0 && !selectedReminders.includes(val)) {
      setSelectedReminders(prev => [...prev, val].sort((a, b) => a - b));
      setCustomReminder('');
    }
  };

  const toggleWeekday = (dayIndex: number) => {
    setSelectedWeekdays(prev =>
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex].sort((a, b) => a - b)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Task title is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let dueAtStr: string | null = null;
      if (dueDate) {
        if (hasDueTime && dueTime) {
          dueAtStr = `${dueDate}T${dueTime}:00`;
        } else {
          dueAtStr = `${dueDate}T00:00:00`;
        }
      }

      let recurrenceObj: RecurrenceConfig | null = null;
      if (recurrenceType !== 'none') {
        recurrenceObj = {
          frequency: recurrenceType as any,
          interval: recurrenceType === 'custom' ? customInterval : 1,
          daysOfWeek: recurrenceType === 'weekly' ? selectedWeekdays : undefined,
        };
      }

      if (taskToEdit) {
        await updateTask(currentUser.uid, taskToEdit.id, {
          title: trimmedTitle,
          description: description.trim(),
          categoryId: categoryId || (categories[0]?.id || ''),
          dueAt: dueAtStr,
          priority,
          reminderLevel,
          reminders: selectedReminders,
          recurrence: recurrenceObj,
        });
        onSaved({
          ...taskToEdit,
          title: trimmedTitle,
          description: description.trim(),
          categoryId: categoryId || (categories[0]?.id || ''),
          dueAt: dueAtStr,
          priority,
          reminderLevel,
          reminders: selectedReminders,
          recurrence: recurrenceObj,
        });
      } else {
        const created = await createTask(currentUser.uid, {
          title: trimmedTitle,
          description: description.trim(),
          categoryId: categoryId || (categories[0]?.id || ''),
          dueAt: dueAtStr,
          priority,
          status: 'pending',
          reminderLevel,
          reminders: selectedReminders,
          recurrence: recurrenceObj,
        });
        onSaved(created);
      }

      onClose();
    } catch (err: unknown) {
      console.error('Failed to save task:', err);
      setError(err instanceof Error ? err.message : 'Failed to save task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 my-auto animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {taskToEdit ? 'Edit Task' : 'Add New Task'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set schedules, priority, reminders, and recurrence
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
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
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Prepare quarterly roadmap presentation"
              required
              autoFocus
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Notes / Description */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1">
              Notes & Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add key links, bullet points, context..."
              rows={2}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
                Category
              </label>
              {onRequestNewCategory && (
                <button
                  type="button"
                  onClick={onRequestNewCategory}
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Category</span>
                </button>
              )}
            </div>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time (Mobile-friendly) */}
          <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Due Date & Time
              </span>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasDueTime}
                  onChange={(e) => setHasDueTime(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Include time</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {hasDueTime && (
                <div>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
              Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map((p) => {
                const isSelected = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 text-xs font-semibold rounded-xl capitalize transition-all ${
                      isSelected
                        ? p === 'high'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : p === 'medium'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-slate-700 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recurrence */}
          <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
              <RotateCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Recurrence</span>
            </div>

            <select
              value={recurrenceType}
              onChange={(e) => setRecurrenceType(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="none">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom interval</option>
            </select>

            {recurrenceType === 'weekly' && (
              <div className="pt-1">
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">Repeat on days:</span>
                <div className="flex justify-between gap-1">
                  {WEEKDAY_NAMES.map((name, idx) => {
                    const isDaySelected = selectedWeekdays.includes(idx);
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => toggleWeekday(idx)}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${
                          isDaySelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white dark:bg-zinc-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-zinc-700'
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {recurrenceType === 'custom' && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">Every</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={customInterval}
                  onChange={(e) => setCustomInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-bold text-center"
                />
                <select
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value as any)}
                  className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs font-medium"
                >
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                </select>
              </div>
            )}
          </div>

          {/* Reminder Level */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
              Reminder Intensity
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'normal', label: 'Normal', desc: 'Standard chime' },
                  { id: 'important', label: 'Important', desc: 'Attention alert' },
                  { id: 'persistent', label: 'Persistent', desc: 'Repeated buzzer' },
                ] as const
              ).map((lvl) => {
                const isSelected = reminderLevel === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setReminderLevel(lvl.id)}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="block text-xs font-bold">{lvl.label}</span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 block mt-0.5">{lvl.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Multiple Reminders selection */}
          <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
              <Bell className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Notification Timing (Select Multiple)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {PRESET_REMINDERS.map((preset) => {
                const isChecked = selectedReminders.includes(preset.offset);
                return (
                  <button
                    key={preset.offset}
                    type="button"
                    onClick={() => toggleReminder(preset.offset)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs border transition-colors text-left ${
                      isChecked
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600'
                    }`}
                  >
                    <span>{preset.label}</span>
                    {isChecked && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>

            {/* Custom minute offset input */}
            <div className="flex items-center gap-2 pt-1.5">
              <input
                type="number"
                min={1}
                placeholder="Custom mins before..."
                value={customReminder}
                onChange={(e) => setCustomReminder(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs"
              />
              <button
                type="button"
                onClick={handleAddCustomReminder}
                disabled={!customReminder}
                className="px-3 py-1.5 bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-300 dark:hover:bg-zinc-600 disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : taskToEdit ? 'Update Task' : 'Create Task'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
