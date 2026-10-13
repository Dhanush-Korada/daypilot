import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import {
  READY_MADE_TEMPLATES,
  TEMPLATE_GROUPS,
  ReadyMadeTaskTemplate,
  TemplateGroup,
} from '../../config/templates';
import {
  getUserTemplates,
  createUserTemplate,
  deleteUserTemplate,
} from '../../services/templateService';
import { createTask } from '../../services/taskService';
import { getCategories } from '../../services/categoryService';
import { Category, Priority, ReminderLevel, RecurrenceConfig, UserTemplate } from '../../types';
import { ConfirmModal } from '../../components/ConfirmModal';
import { getCategoryDisplayName } from '../../utils/categoryHelper';
import {
  Layers,
  Sparkles,
  Plus,
  AlertCircle,
  Clock,
  Repeat,
  Flag,
  Bell,
  Search,
  Trash2,
  Edit3,
  Bookmark,
  Zap,
  Heart,
  Dumbbell,
  GraduationCap,
  Briefcase,
  UserCheck,
  Smartphone,
  X,
} from 'lucide-react';

export const TemplatesPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();

  // Tab & Filters
  const [activeTab, setActiveTab] = useState<'browse' | 'saved'>('browse');
  const [selectedGroup, setSelectedGroup] = useState<TemplateGroup | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // Notifications
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Template Customization / Edit Before Saving Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [customizingTemplate, setCustomizingTemplate] = useState<{
    title: string;
    description: string;
    categoryId: string;
    dueDate: string;
    dueTime: string;
    priority: Priority;
    recurrence: RecurrenceConfig | null;
    reminderLevel: ReminderLevel;
  } | null>(null);

  // Create Personal Template Modal
  const [isCreatePersonalModalOpen, setIsCreatePersonalModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newTemplatePriority, setNewTemplatePriority] = useState<Priority>('medium');
  const [newTemplateLevel, setNewTemplateLevel] = useState<ReminderLevel>('normal');
  const [newTemplateTime, setNewTemplateTime] = useState('09:00');
  const [newTemplateRecurrence, setNewTemplateRecurrence] = useState<'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly'>('daily');

  // Delete Template Confirmation
  const [templateToDelete, setTemplateToDelete] = useState<UserTemplate | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const [cats, templates] = await Promise.all([
        getCategories(currentUser.uid),
        getUserTemplates(currentUser.uid),
      ]);
      setCategories(cats);
      setUserTemplates(templates);
    } catch (err) {
      console.error('Failed to load templates or categories:', err);
      setErrorMessage(t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const getMatchingCategoryId = (suggestedCategoryName: string): string => {
    if (categories.length === 0) return '';
    const match = categories.find(
      c => c.name.toLowerCase().includes(suggestedCategoryName.toLowerCase()) ||
           suggestedCategoryName.toLowerCase().includes(c.name.toLowerCase())
    );
    return match ? match.id : categories[0]?.id || '';
  };

  // 1-Tap Direct Add - saves text in the user's current language
  const handleOneTapAdd = async (tpl: ReadyMadeTaskTemplate) => {
    if (!currentUser) return;
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dueAtIso = `${dateStr}T${tpl.defaultTime || '09:00'}:00`;

      const translatedTitle = t(tpl.titleKey, { defaultValue: tpl.defaultTitle });
      const translatedDesc = t(tpl.descriptionKey, { defaultValue: tpl.defaultDescription });

      await createTask(currentUser.uid, {
        title: translatedTitle,
        description: translatedDesc,
        categoryId: getMatchingCategoryId(tpl.defaultCategoryName),
        dueAt: dueAtIso,
        priority: tpl.priority,
        status: 'pending',
        recurrence: tpl.recurrence,
        reminderLevel: tpl.reminderLevel,
        reminders: tpl.suggestedReminders || [15],
      });

      setStatusMessage(t('templates.addedToTasks'));
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      setErrorMessage(t('errors.generic'));
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  // Open Edit-Before-Save Modal for Ready-Made Template - loads text in the user's current language
  const handleOpenEditModal = (tpl: ReadyMadeTaskTemplate) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    const translatedTitle = t(tpl.titleKey, { defaultValue: tpl.defaultTitle });
    const translatedDesc = t(tpl.descriptionKey, { defaultValue: tpl.defaultDescription });

    setCustomizingTemplate({
      title: translatedTitle,
      description: translatedDesc,
      categoryId: getMatchingCategoryId(tpl.defaultCategoryName),
      dueDate: `${yyyy}-${mm}-${dd}`,
      dueTime: tpl.defaultTime || '09:00',
      priority: tpl.priority,
      recurrence: tpl.recurrence,
      reminderLevel: tpl.reminderLevel,
    });
    setIsEditModalOpen(true);
  };

  // Open Edit-Before-Save Modal for User Template
  const handleOpenUserTemplateModal = (tpl: UserTemplate) => {
    const data = tpl.templateData as any;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    setCustomizingTemplate({
      title: (data?.title as string) || tpl.name,
      description: (data?.description as string) || '',
      categoryId: (data?.categoryId as string) || (categories[0]?.id || ''),
      dueDate: `${yyyy}-${mm}-${dd}`,
      dueTime: (data?.defaultTime as string) || '09:00',
      priority: (data?.priority as Priority) || 'medium',
      recurrence: (data?.recurrence as RecurrenceConfig) || { frequency: 'daily' },
      reminderLevel: (data?.reminderLevel as ReminderLevel) || 'normal',
    });
    setIsEditModalOpen(true);
  };

  // Confirm Save Custom Task from Modal
  const handleSaveCustomizedTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !customizingTemplate) return;
    if (!customizingTemplate.title.trim()) {
      setErrorMessage(t('validation.required'));
      return;
    }

    try {
      const dueAtIso = `${customizingTemplate.dueDate}T${customizingTemplate.dueTime || '09:00'}:00`;
      await createTask(currentUser.uid, {
        title: customizingTemplate.title.trim(),
        description: customizingTemplate.description,
        categoryId: customizingTemplate.categoryId,
        dueAt: dueAtIso,
        priority: customizingTemplate.priority,
        status: 'pending',
        recurrence: customizingTemplate.recurrence,
        reminderLevel: customizingTemplate.reminderLevel,
        reminders: [15],
      });

      setIsEditModalOpen(false);
      setCustomizingTemplate(null);
      setStatusMessage(t('templates.addedToTasks'));
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      setErrorMessage(t('errors.generic'));
    }
  };

  // Create Personal Template
  const handleCreatePersonalTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!newTemplateName.trim()) {
      setErrorMessage(t('validation.required'));
      return;
    }

    try {
      let recurrence: RecurrenceConfig | null = null;
      if (newTemplateRecurrence !== 'none') {
        recurrence = { frequency: newTemplateRecurrence as any };
      }

      const created = await createUserTemplate(currentUser.uid, newTemplateName.trim(), {
        title: newTemplateTitle.trim() || newTemplateName.trim(),
        description: newTemplateDesc,
        priority: newTemplatePriority,
        reminderLevel: newTemplateLevel,
        defaultTime: newTemplateTime,
        recurrence,
      });

      setUserTemplates(prev => [created, ...prev]);
      setIsCreatePersonalModalOpen(false);
      setNewTemplateName('');
      setNewTemplateTitle('');
      setNewTemplateDesc('');
      setStatusMessage(t('common.saved'));
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      setErrorMessage(t('errors.generic'));
    }
  };

  // Delete User Template
  const confirmDeleteTemplate = async () => {
    if (!currentUser || !templateToDelete) return;
    try {
      await deleteUserTemplate(currentUser.uid, templateToDelete.id);
      setUserTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
      setStatusMessage(t('common.deleted', { defaultValue: 'Template deleted' }));
      setTemplateToDelete(null);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      setErrorMessage(t('errors.generic'));
    }
  };

  // Filter ready made templates matching query against localized AND default text
  const filteredTemplates = READY_MADE_TEMPLATES.filter(tpl => {
    const matchesGroup = selectedGroup === 'all' || tpl.group === selectedGroup;
    const localizedTitle = t(tpl.titleKey, { defaultValue: tpl.defaultTitle }).toLowerCase();
    const localizedDesc = t(tpl.descriptionKey, { defaultValue: tpl.defaultDescription }).toLowerCase();
    const defaultTitle = tpl.defaultTitle.toLowerCase();
    const defaultDesc = tpl.defaultDescription.toLowerCase();
    const q = searchQuery.toLowerCase().trim();

    const matchesSearch =
      q === '' ||
      localizedTitle.includes(q) ||
      localizedDesc.includes(q) ||
      defaultTitle.includes(q) ||
      defaultDesc.includes(q) ||
      tpl.group.toLowerCase().includes(q);

    return matchesGroup && matchesSearch;
  });

  const getGroupIcon = (group: TemplateGroup) => {
    switch (group) {
      case 'Health':
        return <Heart className="w-4 h-4 text-rose-500" />;
      case 'Fitness':
        return <Dumbbell className="w-4 h-4 text-emerald-500" />;
      case 'Study':
        return <GraduationCap className="w-4 h-4 text-blue-500" />;
      case 'Work':
        return <Briefcase className="w-4 h-4 text-amber-500" />;
      case 'Personal':
        return <UserCheck className="w-4 h-4 text-purple-500" />;
      case 'Digital wellbeing':
        return <Smartphone className="w-4 h-4 text-cyan-500" />;
      default:
        return <Bookmark className="w-4 h-4 text-indigo-500" />;
    }
  };

  const getPriorityChipLabel = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return t('tasks.priorities.high');
      case 'medium':
        return t('tasks.priorities.medium');
      case 'low':
        return t('tasks.priorities.low');
      default:
        return priority;
    }
  };

  const getRecurrenceChipLabel = (rec: RecurrenceConfig | null) => {
    if (!rec) return null;
    if (rec.frequency === 'custom' && rec.interval === 2) {
      return t('templates.chips.every2Hrs');
    }
    if (rec.frequency === 'custom' && rec.interval === 45) {
      return t('templates.chips.every45Min');
    }
    if (rec.frequency === 'daily') return t('templates.chips.daily');
    if (rec.frequency === 'weekdays') return t('templates.chips.weekdays');
    if (rec.frequency === 'weekly') return t('templates.chips.weekly');
    if (rec.frequency === 'monthly') return t('templates.chips.monthly');
    return rec.frequency;
  };

  const getReminderLevelLabel = (level: ReminderLevel) => {
    if (level === 'persistent') return t('tasks.reminderStyle.persistent');
    if (level === 'important') return t('tasks.reminderStyle.important');
    return t('tasks.reminderStyle.normal');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          {t('templates.title')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {t('templates.subtitle')}
        </p>
      </div>

      {statusMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2 shadow-xs animate-in fade-in duration-150">
          <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Tabs: Curated Library vs My Templates */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 gap-2 overflow-x-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'browse'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{t('templates.curatedTab')} ({READY_MADE_TEMPLATES.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'saved'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>{t('templates.savedTab')} ({userTemplates.length})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px] sm:min-w-[260px] pb-2">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* TAB 1: CURATED BROWSER */}
      {activeTab === 'browse' && (
        <div className="space-y-5">
          {/* Group Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedGroup('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedGroup === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800'
              }`}
            >
              {t('templates.allCategories')}
            </button>
            {TEMPLATE_GROUPS.map(group => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedGroup === group.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800'
                }`}
              >
                {getGroupIcon(group.id)}
                <span>{t(group.groupKey, { defaultValue: group.label })}</span>
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(tpl => {
              const localizedTitle = t(tpl.titleKey, { defaultValue: tpl.defaultTitle });
              const localizedDesc = t(tpl.descriptionKey, { defaultValue: tpl.defaultDescription });
              const groupObj = TEMPLATE_GROUPS.find(g => g.id === tpl.group);
              const groupLabel = groupObj ? t(groupObj.groupKey, { defaultValue: groupObj.label }) : tpl.group;

              return (
                <div
                  key={tpl.id}
                  className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-slate-200 dark:border-zinc-800 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
                        {getGroupIcon(tpl.group)}
                        <span>{groupLabel}</span>
                      </span>

                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          tpl.priority === 'high'
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                            : tpl.priority === 'medium'
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {getPriorityChipLabel(tpl.priority)}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                      {localizedTitle}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                      {localizedDesc}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mb-5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/70 px-2 py-1 rounded-lg">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{tpl.defaultTime}</span>
                      </span>

                      {getRecurrenceChipLabel(tpl.recurrence) && (
                        <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/70 px-2 py-1 rounded-lg">
                          <Repeat className="w-3 h-3 text-indigo-500" />
                          <span>{getRecurrenceChipLabel(tpl.recurrence)}</span>
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/70 px-2 py-1 rounded-lg">
                        <Bell className="w-3 h-3 text-amber-500" />
                        <span>{getReminderLevelLabel(tpl.reminderLevel)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions: 1-Tap Add & Edit Before Saving */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                    <button
                      onClick={() => handleOneTapAdd(tpl)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{t('templates.addInOneTap')}</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(tpl)}
                      className="inline-flex items-center justify-center gap-1 py-2 px-3 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      title={t('templates.editAndAdd')}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{t('templates.editAndAdd')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-zinc-800">
              <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t('templates.noTemplatesFound')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY SAVED TEMPLATES */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t('templates.savedTab')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('templates.savedSubtitle')}
              </p>
            </div>

            <button
              onClick={() => setIsCreatePersonalModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('templates.createPersonal')}</span>
            </button>
          </div>

          {userTemplates.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-zinc-800">
              <Bookmark className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t('templates.noTemplatesFound')}
              </p>
              <button
                onClick={() => setIsCreatePersonalModalOpen(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('templates.createPersonal')}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userTemplates.map(tpl => {
                const data = tpl.templateData as any;
                return (
                  <div
                    key={tpl.id}
                    className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-slate-200 dark:border-zinc-800 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40">
                          <Bookmark className="w-3 h-3" />
                          <span>{t('templates.savedTab')}</span>
                        </span>

                        <button
                          onClick={() => setTemplateToDelete(tpl)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded-md transition-colors cursor-pointer"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                        {tpl.name}
                      </h3>

                      {data?.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                          {data.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mb-4 text-[11px] text-slate-500 dark:text-slate-400">
                        {data?.defaultTime && (
                          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/70 px-2 py-1 rounded-lg">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{data.defaultTime}</span>
                          </span>
                        )}

                        {data?.priority && (
                          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/70 px-2 py-1 rounded-lg capitalize">
                            <Flag className="w-3 h-3 text-amber-500" />
                            <span>{getPriorityChipLabel(data.priority)}</span>
                          </span>
                        )}

                        {data?.recurrence?.frequency && (
                          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/70 px-2 py-1 rounded-lg capitalize">
                            <Repeat className="w-3 h-3 text-indigo-500" />
                            <span>{getRecurrenceChipLabel(data.recurrence)}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                      <button
                        onClick={() => handleOpenUserTemplateModal(tpl)}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>{t('templates.addInOneTap')}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: EDIT BEFORE SAVING */}
      {isEditModalOpen && customizingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-zinc-800 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                {t('templates.editAndAdd')}
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomizedTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('tasks.taskTitle')} *
                </label>
                <input
                  type="text"
                  required
                  value={customizingTemplate.title}
                  onChange={e =>
                    setCustomizingTemplate({ ...customizingTemplate, title: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('tasks.description')}
                </label>
                <textarea
                  rows={2}
                  value={customizingTemplate.description}
                  onChange={e =>
                    setCustomizingTemplate({ ...customizingTemplate, description: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('tasks.dueDate')} *
                  </label>
                  <input
                    type="date"
                    required
                    value={customizingTemplate.dueDate}
                    onChange={e =>
                      setCustomizingTemplate({ ...customizingTemplate, dueDate: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('tasks.dueTime')}
                  </label>
                  <input
                    type="time"
                    value={customizingTemplate.dueTime}
                    onChange={e =>
                      setCustomizingTemplate({ ...customizingTemplate, dueTime: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('common.category')}
                  </label>
                  <select
                    value={customizingTemplate.categoryId}
                    onChange={e =>
                      setCustomizingTemplate({ ...customizingTemplate, categoryId: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {getCategoryDisplayName(cat, t)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('tasks.priorityLabel')}
                  </label>
                  <select
                    value={customizingTemplate.priority}
                    onChange={e =>
                      setCustomizingTemplate({
                        ...customizingTemplate,
                        priority: e.target.value as Priority,
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="low">{t('tasks.priorities.low')}</option>
                    <option value="medium">{t('tasks.priorities.medium')}</option>
                    <option value="high">{t('tasks.priorities.high')}</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE PERSONAL TEMPLATE */}
      {isCreatePersonalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-zinc-800 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                {t('templates.createPersonal')}
              </h2>
              <button
                onClick={() => setIsCreatePersonalModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePersonalTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('templates.templateName')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('templates.templateNamePlaceholder')}
                  value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('tasks.taskTitle')}
                </label>
                <input
                  type="text"
                  placeholder={t('tasks.taskTitlePlaceholder')}
                  value={newTemplateTitle}
                  onChange={e => setNewTemplateTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('tasks.description')}
                </label>
                <textarea
                  rows={2}
                  placeholder={t('tasks.descriptionPlaceholder')}
                  value={newTemplateDesc}
                  onChange={e => setNewTemplateDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('tasks.dueTime')}
                  </label>
                  <input
                    type="time"
                    value={newTemplateTime}
                    onChange={e => setNewTemplateTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('tasks.recurrenceLabel')}
                  </label>
                  <select
                    value={newTemplateRecurrence}
                    onChange={e => setNewTemplateRecurrence(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="none">{t('tasks.recurrenceNone')}</option>
                    <option value="daily">{t('templates.chips.daily')}</option>
                    <option value="weekdays">{t('templates.chips.weekdays')}</option>
                    <option value="weekly">{t('templates.chips.weekly')}</option>
                    <option value="monthly">{t('templates.chips.monthly')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('tasks.priorityLabel')}
                  </label>
                  <select
                    value={newTemplatePriority}
                    onChange={e => setNewTemplatePriority(e.target.value as Priority)}
                    className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="low">{t('tasks.priorities.low')}</option>
                    <option value="medium">{t('tasks.priorities.medium')}</option>
                    <option value="high">{t('tasks.priorities.high')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('tasks.reminderLevelLabel')}
                  </label>
                  <select
                    value={newTemplateLevel}
                    onChange={e => setNewTemplateLevel(e.target.value as ReminderLevel)}
                    className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="normal">{t('tasks.reminderStyle.normal')}</option>
                    <option value="important">{t('tasks.reminderStyle.important')}</option>
                    <option value="persistent">{t('tasks.reminderStyle.persistent')}</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreatePersonalModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Template Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(templateToDelete)}
        title={t('common.delete')}
        message={t('common.confirm')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        confirmVariant="danger"
        onConfirm={confirmDeleteTemplate}
        onCancel={() => setTemplateToDelete(null)}
      />
    </div>
  );
};
