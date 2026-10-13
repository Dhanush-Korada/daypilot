import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { LanguagePicker } from '../../components/LanguagePicker';
import { LanguageCode, LANGUAGES } from '../../config/languages';
import { LOCAL_STORAGE_LANGUAGE_KEY } from '../../config/i18n';
import { SEED_CAPTIONS } from '../../config/captions';
import { seedCaptionsToFirestore } from '../../services/captions';
import {
  getCategories,
  deleteCategory,
  seedDefaultCategories,
} from '../../services/categoryService';
import {
  getUserSettings,
  saveUserSettings,
  updateUserProfile,
  exportUserData,
  deleteAllUserData,
} from '../../services/userService';
import {
  getBrowserNotificationPermission,
  requestPushPermissionAndToken,
  getUserPushTokens,
  deletePushToken,
  getNotificationLogs,
  sendRealTestNotification,
  isPushNotificationSupported,
} from '../../services/pushNotificationService';
import { Category, PushToken, NotificationLog } from '../../types';
import { getCategoryIcon } from '../categories/categoryIcons';
import { getCategoryDisplayName } from '../../utils/categoryHelper';
import { CategoryModal } from '../categories/CategoryModal';
import { deleteUser } from 'firebase/auth';
import {
  Settings as SettingsIcon,
  User,
  Moon,
  Sun,
  Monitor,
  Palette,
  Calendar,
  LogOut,
  KeyRound,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  Clock,
  Globe,
  Bell,
  Download,
  AlertTriangle,
  Save,
  Check,
  Send,
  Battery,
  Smartphone,
  RefreshCw,
  Radio,
  Flame,
  Volume2,
  Database,
} from 'lucide-react';

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Madrid',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Seoul',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const REMINDER_PRESETS = [
  { offset: 0, labelKey: 'settings.reminders.atTimeOfEvent' },
  { offset: 10, labelKey: 'settings.reminders.tenMinBefore' },
  { offset: 60, labelKey: 'settings.reminders.oneHourBefore' },
  { offset: 1440, labelKey: 'settings.reminders.oneDayBefore' },
];

export const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { currentUser, userProfile, logout, resetPassword } = useAuth();
  const { theme, weekStartsOn, setTheme, setWeekStartsOn } = useTheme();

  // Language State
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(
    (i18n.language || 'en') as LanguageCode
  );

  // Profile State
  const [displayName, setDisplayName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Settings State
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [dateFormat, setDateFormat] = useState<'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY'>('YYYY-MM-DD');
  const [timezone, setTimezone] = useState<string>('UTC');
  const [defaultSnoozeDuration, setDefaultSnoozeDuration] = useState<number>(15);
  const [defaultReminders, setDefaultReminders] = useState<number[]>([15]);
  const [maxSnoozeCount, setMaxSnoozeCount] = useState<number>(3);
  const [persistentReminderInterval, setPersistentReminderInterval] = useState<number>(5);

  // Smart Captions & Alerts State
  const [captionsEnabled, setCaptionsEnabled] = useState<boolean>(true);
  const [captionIntensity, setCaptionIntensity] = useState<'gentle' | 'friendly' | 'roast'>('friendly');
  const [notificationTone, setNotificationTone] = useState<'chime' | 'soft' | 'alert' | 'voice' | 'silent'>('chime');
  const [readCaptionAloud, setReadCaptionAloud] = useState<boolean>(false);
  const [isSeedingCaptions, setIsSeedingCaptions] = useState(false);
  const [previewCaptions, setPreviewCaptions] = useState<{
    level1: string;
    level2: string;
    level3: string;
  }>({ level1: '', level2: '', level3: '' });

  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Push Notifications & Health States
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [pushTokens, setPushTokens] = useState<PushToken[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [, setIsPushSupported] = useState<boolean>(true);
  const [isRequestingPush, setIsRequestingPush] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [testNotificationResult, setTestNotificationResult] = useState<string | null>(null);
  const [showBatteryGuide, setShowBatteryGuide] = useState(false);
  const [showVapidConfig, setShowVapidConfig] = useState(false);
  const [customVapidKey, setCustomVapidKey] = useState('');

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // Category Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

  // Export & Danger Zone State
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Feedback Messages
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile?.displayName) {
      setDisplayName(userProfile.displayName);
    }
  }, [userProfile]);

  // Load preview captions when language changes
  const refreshPreviewCaptions = (lang: LanguageCode) => {
    const l1 = SEED_CAPTIONS.filter(c => c.language === lang && c.level === 1);
    const l2 = SEED_CAPTIONS.filter(c => c.language === lang && c.level === 2);
    const l3 = SEED_CAPTIONS.filter(c => c.language === lang && c.level === 3);

    const name = displayName.trim() || userProfile?.displayName || 'Rahul';
    const sampleTask = 'Workout & Health';

    const p1 = (l1[Math.floor(Math.random() * l1.length)] || l1[0])?.text
      .replace(/{name}/g, name)
      .replace(/{task}/g, sampleTask)
      .replace(/{minutes}/g, '20')
      .replace(/{snoozeCount}/g, '1') || '';

    const p2 = (l2[Math.floor(Math.random() * l2.length)] || l2[0])?.text
      .replace(/{name}/g, name)
      .replace(/{task}/g, sampleTask)
      .replace(/{minutes}/g, '45')
      .replace(/{snoozeCount}/g, '2') || '';

    const p3 = (l3[Math.floor(Math.random() * l3.length)] || l3[0])?.text
      .replace(/{name}/g, name)
      .replace(/{task}/g, sampleTask)
      .replace(/{minutes}/g, '120')
      .replace(/{snoozeCount}/g, '3') || '';

    setPreviewCaptions({ level1: p1, level2: p2, level3: p3 });
  };

  useEffect(() => {
    refreshPreviewCaptions(selectedLanguage);
  }, [selectedLanguage]);

  useEffect(() => {
    if (!currentUser) return;
    loadInitialData();
  }, [currentUser]);

  const loadInitialData = async () => {
    if (!currentUser) return;
    try {
      setLoadingCategories(true);
      const [cats, settings, tokens, logs, supported] = await Promise.all([
        getCategories(currentUser.uid),
        getUserSettings(currentUser.uid),
        getUserPushTokens(currentUser.uid),
        getNotificationLogs(currentUser.uid, 8),
        isPushNotificationSupported(),
      ]);
      setCategories(cats);
      setPushTokens(tokens);
      setNotificationLogs(logs);
      setIsPushSupported(supported);
      setNotificationPermission(getBrowserNotificationPermission());

      if (settings) {
        if (settings.language && LANGUAGES[settings.language as LanguageCode]) {
          setSelectedLanguage(settings.language as LanguageCode);
          i18n.changeLanguage(settings.language);
          localStorage.setItem(LOCAL_STORAGE_LANGUAGE_KEY, settings.language);
        }
        if (settings.timeFormat) setTimeFormat(settings.timeFormat);
        if (settings.dateFormat) setDateFormat(settings.dateFormat);
        if (settings.timezone) setTimezone(settings.timezone);
        else setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
        if (typeof settings.defaultSnoozeDuration === 'number') {
          setDefaultSnoozeDuration(settings.defaultSnoozeDuration);
        }
        if (typeof settings.maxSnoozeCount === 'number') {
          setMaxSnoozeCount(settings.maxSnoozeCount);
        }
        if (typeof settings.persistentReminderInterval === 'number') {
          setPersistentReminderInterval(settings.persistentReminderInterval);
        }
        if (Array.isArray(settings.defaultReminders)) {
          setDefaultReminders(settings.defaultReminders);
        }
        if (typeof settings.captionsEnabled === 'boolean') {
          setCaptionsEnabled(settings.captionsEnabled);
        }
        if (settings.captionIntensity) {
          setCaptionIntensity(settings.captionIntensity);
        }
        if (settings.notificationTone) {
          setNotificationTone(settings.notificationTone);
        }
        if (typeof settings.readCaptionAloud === 'boolean') {
          setReadCaptionAloud(settings.readCaptionAloud);
        }
      } else {
        setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
      }
    } catch (err) {
      console.error('Failed to load initial settings', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      setIsSavingProfile(true);
      await updateUserProfile(currentUser.uid, { displayName: displayName.trim() });
      setStatusMessage(t('settings.profile.saveProfile'));
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      setErrorMessage(t('errors.generic'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLanguageChange = async (lang: LanguageCode) => {
    setSelectedLanguage(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem(LOCAL_STORAGE_LANGUAGE_KEY, lang);
    refreshPreviewCaptions(lang);
    if (currentUser) {
      try {
        await saveUserSettings(currentUser.uid, { language: lang });
        setStatusMessage(t('settings.language.updated'));
        setTimeout(() => setStatusMessage(null), 3000);
      } catch (err) {
        console.warn('Failed to sync language to Firestore', err);
      }
    }
  };

  const handleSaveAllSettings = async () => {
    if (!currentUser) return;
    try {
      setIsSavingSettings(true);
      await saveUserSettings(currentUser.uid, {
        theme,
        weekStartsOn,
        timeFormat,
        dateFormat,
        timezone,
        defaultSnoozeDuration,
        defaultReminders,
        maxSnoozeCount,
        persistentReminderInterval,
        pushEnabled: pushTokens.length > 0,
        language: selectedLanguage,
        captionsEnabled,
        captionIntensity,
        notificationTone,
        readCaptionAloud,
      });
      setStatusMessage(t('common.saved'));
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      setErrorMessage(t('errors.generic'));
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSeedCaptions = async () => {
    try {
      setIsSeedingCaptions(true);
      const res = await seedCaptionsToFirestore();
      setStatusMessage(t('captions.seedSuccess', { count: res.count }));
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err) {
      setErrorMessage(t('errors.generic'));
    } finally {
      setIsSeedingCaptions(false);
    }
  };

  const handleEnablePushNotifications = async () => {
    if (!currentUser) return;
    setIsRequestingPush(true);
    setErrorMessage(null);
    try {
      const res = await requestPushPermissionAndToken(currentUser.uid, customVapidKey.trim() || undefined);
      setNotificationPermission(res.permission);
      const updatedTokens = await getUserPushTokens(currentUser.uid);
      setPushTokens(updatedTokens);
      setStatusMessage(t('common.saved'));
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      console.error('Push registration error:', err);
      setErrorMessage(err.message || t('errors.generic'));
      setNotificationPermission(getBrowserNotificationPermission());
    } finally {
      setIsRequestingPush(false);
    }
  };

  const handleSendTestNotification = async () => {
    if (!currentUser) return;
    setIsSendingTest(true);
    setTestNotificationResult(null);
    setErrorMessage(null);
    try {
      const res = await sendRealTestNotification(currentUser.uid);
      setTestNotificationResult(res.message);
      const updatedLogs = await getNotificationLogs(currentUser.uid, 8);
      setNotificationLogs(updatedLogs);
    } catch (err: any) {
      setErrorMessage(err.message || t('errors.generic'));
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleDeletePushToken = async (tokenId?: string) => {
    if (!currentUser) return;
    try {
      const target = tokenId || pushTokens[0]?.id;
      if (target) {
        await deletePushToken(currentUser.uid, target);
        setPushTokens(prev => prev.filter(t => t.id !== target));
        setStatusMessage(t('common.deleted', { defaultValue: 'Token deleted' }));
      }
    } catch (err) {
      setErrorMessage(t('errors.generic'));
    }
  };

  const handleRefreshNotificationLogs = async () => {
    if (!currentUser) return;
    try {
      setIsLoadingLogs(true);
      const logs = await getNotificationLogs(currentUser.uid, 8);
      setNotificationLogs(logs);
    } catch (err) {
      console.error('Error refreshing logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleDetectTimezone = () => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    setTimezone(tz);
    setStatusMessage(`Timezone detected: ${tz}`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const toggleReminderPreset = (offset: number) => {
    setDefaultReminders(prev =>
      prev.includes(offset) ? prev.filter(o => o !== offset) : [...prev, offset].sort((a, b) => a - b)
    );
  };

  const handleOpenNewCategory = () => {
    setCategoryToEdit(null);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setCategoryToEdit(cat);
    setIsCategoryModalOpen(true);
  };

  const handleCategorySaved = (saved: Category) => {
    setCategories(prev => {
      const idx = prev.findIndex(c => c.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [...prev, saved];
    });
    setStatusMessage(t('common.saved'));
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!currentUser) return;
    try {
      await deleteCategory(currentUser.uid, cat.id);
      setCategories(prev => prev.filter(c => c.id !== cat.id));
      setStatusMessage(t('common.deleted', { defaultValue: 'Category deleted' }));
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      setErrorMessage(t('errors.generic'));
    }
  };

  const handleReseedCategories = async () => {
    if (!currentUser) return;
    try {
      setSeeding(true);
      await seedDefaultCategories(currentUser.uid);
      const updated = await getCategories(currentUser.uid);
      setCategories(updated);
      setStatusMessage(t('common.saved'));
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      setErrorMessage(t('errors.generic'));
    } finally {
      setSeeding(false);
    }
  };

  const handleExportData = async () => {
    if (!currentUser) return;
    try {
      setIsExporting(true);
      const data = await exportUserData(currentUser.uid);
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DayPilot_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage(t('common.saved'));
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      setErrorMessage(t('errors.generic'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccountAndData = async () => {
    if (!currentUser || deleteConfirmationText.trim() !== 'DELETE') return;
    try {
      setIsDeletingAccount(true);
      await deleteAllUserData(currentUser.uid);
      await deleteUser(currentUser);
      window.location.reload();
    } catch (err) {
      setErrorMessage(t('errors.generic'));
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            {t('settings.title')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t('settings.subtitle')}
          </p>
        </div>

        <button
          onClick={handleSaveAllSettings}
          disabled={isSavingSettings}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto cursor-pointer disabled:opacity-50 min-h-[42px]"
        >
          <Save className="w-4 h-4" />
          <span>{isSavingSettings ? t('common.saving') : t('settings.saveAll')}</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2 shadow-xs animate-in fade-in duration-150">
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-700 dark:text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
          >
            {t('common.close')}
          </button>
        </div>
      )}

      {/* 1. Account & Profile Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {t('settings.profile.title')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('settings.profile.email')}: {currentUser?.email}
          </p>
        </div>

        <form onSubmit={handleSaveProfile} className="flex items-center gap-3 pt-1">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('settings.profile.displayName')}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder={t('auth.displayNamePlaceholder')}
              className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={isSavingProfile || !displayName.trim()}
            className="mt-5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSavingProfile ? t('common.saving') : t('settings.profile.saveProfile')}
          </button>
        </form>

        <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={async () => {
              if (currentUser?.email) {
                await resetPassword(currentUser.email);
                setStatusMessage(t('common.saved'));
              }
            }}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 font-semibold cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{t('settings.profile.resetPassword')}</span>
          </button>

          <button
            type="button"
            onClick={logout}
            className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1.5 font-semibold ml-auto cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('settings.profile.logout')}</span>
          </button>
        </div>
      </div>

      {/* 2. Language & Localization Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {t('settings.language.title')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('settings.language.subtitle')}
          </p>
        </div>

        <LanguagePicker
          variant="segmented"
          onLanguageChange={handleLanguageChange}
        />
      </div>

      {/* 3. Captions & Alerts (Part 2: Smart Adaptive Reminders) */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-zinc-800/80">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              {t('captions.title')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('captions.subtitle')}
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto">
            <input
              type="checkbox"
              checked={captionsEnabled}
              onChange={e => setCaptionsEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {t('captions.enableCaptions')}
            </span>
          </label>
        </div>

        {/* Caption Intensity */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 space-y-2.5">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t('captions.intensity')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { id: 'gentle', title: t('captions.gentle'), desc: t('captions.gentleDesc') },
              { id: 'friendly', title: t('captions.friendly'), desc: t('captions.friendlyDesc') },
              { id: 'roast', title: t('captions.roast'), desc: t('captions.roastDesc') },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCaptionIntensity(item.id as any)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  captionIntensity === item.id
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-xs'
                    : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <p className="text-xs font-bold">{item.title}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {item.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* In-App Caption Preview */}
        <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/60 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                {t('captions.previewTitle')}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('captions.previewDesc', { language: LANGUAGES[selectedLanguage]?.name || selectedLanguage })}
              </p>
            </div>

            <button
              type="button"
              onClick={() => refreshPreviewCaptions(selectedLanguage)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-xs hover:bg-indigo-50 transition cursor-pointer shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{t('captions.showAnother')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-indigo-950 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {t('captions.gentleLevel')}
              </span>
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-snug">
                "{previewCaptions.level1}"
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-950 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                {t('captions.firmLevel')}
              </span>
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-snug">
                "{previewCaptions.level2}"
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-950 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                {t('captions.roastLevel')}
              </span>
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-snug">
                "{previewCaptions.level3}"
              </p>
            </div>
          </div>
        </div>

        {/* Tone and Voice Preference */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-indigo-500" />
              {t('captions.tonesTitle')}
            </p>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={readCaptionAloud}
                onChange={e => setReadCaptionAloud(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>{t('captions.readAloud')}</span>
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {([
              { id: 'chime', label: t('captions.toneChime') },
              { id: 'soft', label: t('captions.toneSoft') },
              { id: 'alert', label: t('captions.toneAlert') },
              { id: 'voice', label: t('captions.toneVoice') },
              { id: 'silent', label: t('captions.toneSilent') },
            ] as const).map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setNotificationTone(item.id)}
                className={`py-2 px-2.5 rounded-xl text-xs font-semibold text-center border transition-all cursor-pointer ${
                  notificationTone === item.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed italic">
            {t('captions.androidSoundNote')}
          </p>
        </div>

        {/* Developer Seeding helper */}
        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {SEED_CAPTIONS.length} Seed Captions Ready
          </p>
          <button
            type="button"
            onClick={handleSeedCaptions}
            disabled={isSeedingCaptions}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 transition cursor-pointer disabled:opacity-50"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{isSeedingCaptions ? t('common.saving') : t('captions.seedButton')}</span>
          </button>
        </div>
      </div>

      {/* 4. Theme & Appearance Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {t('settings.appearance.title')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('settings.appearance.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-xs'
                : 'bg-slate-50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Sun className="w-5 h-5 mx-auto mb-1.5 text-amber-500" />
            <span className="text-xs font-bold block">{t('settings.appearance.light')}</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-xs'
                : 'bg-slate-50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Moon className="w-5 h-5 mx-auto mb-1.5 text-indigo-500" />
            <span className="text-xs font-bold block">{t('settings.appearance.dark')}</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
              theme === 'system'
                ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-xs'
                : 'bg-slate-50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            <Monitor className="w-5 h-5 mx-auto mb-1.5 text-slate-500" />
            <span className="text-xs font-bold block">{t('settings.appearance.system')}</span>
          </button>
        </div>
      </div>

      {/* 5. Date & Time Preferences Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {t('settings.dateTime.title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Week Start */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 space-y-2">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {t('settings.dateTime.weekStartsOn')}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWeekStartsOn(0)}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  weekStartsOn === 0
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-700'
                }`}
              >
                {t('settings.dateTime.sunday')}
              </button>
              <button
                type="button"
                onClick={() => setWeekStartsOn(1)}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  weekStartsOn === 1
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-700'
                }`}
              >
                {t('settings.dateTime.monday')}
              </button>
            </div>
          </div>

          {/* 12 / 24-Hour Time Format */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 space-y-2">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {t('settings.dateTime.clockFormat')}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTimeFormat('12h')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  timeFormat === '12h'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-700'
                }`}
              >
                {t('settings.dateTime.twelveHour')}
              </button>
              <button
                type="button"
                onClick={() => setTimeFormat('24h')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  timeFormat === '24h'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-700'
                }`}
              >
                {t('settings.dateTime.twentyFourHour')}
              </button>
            </div>
          </div>

          {/* Date Format */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 space-y-2">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {t('settings.dateTime.dateFormat')}
            </p>
            <select
              value={dateFormat}
              onChange={e => setDateFormat(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="YYYY-MM-DD">YYYY-MM-DD (Standard ISO)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (US Format)</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY (International)</option>
            </select>
          </div>

          {/* Time Zone */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                {t('settings.dateTime.timezone')}
              </p>
              <button
                type="button"
                onClick={handleDetectTimezone}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
              >
                {t('settings.dateTime.autoDetect')}
              </button>
            </div>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {COMMON_TIMEZONES.map(tz => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
              {!COMMON_TIMEZONES.includes(timezone) && (
                <option value={timezone}>{timezone}</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* 6. Push Notifications & Reminders Defaults */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-zinc-800/80">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Radio className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              {t('settings.reminders.title')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('settings.reminders.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                notificationPermission === 'granted'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  : notificationPermission === 'denied'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  notificationPermission === 'granted'
                    ? 'bg-emerald-500 animate-pulse'
                    : notificationPermission === 'denied'
                    ? 'bg-rose-500'
                    : 'bg-amber-500'
                }`}
              />
              <span>
                {notificationPermission === 'granted'
                  ? t('settings.reminders.granted')
                  : notificationPermission === 'denied'
                  ? t('settings.reminders.denied')
                  : t('settings.reminders.default')}
              </span>
            </span>
          </div>
        </div>

        {/* Permission and Token Management */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-indigo-500" />
                {t('settings.reminders.permissionStatus')}
              </p>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {pushTokens.length > 0 ? `${pushTokens.length} Active` : '0 Active'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {notificationPermission !== 'granted' || pushTokens.length === 0 ? (
                <button
                  type="button"
                  onClick={handleEnablePushNotifications}
                  disabled={isRequestingPush}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>{isRequestingPush ? t('common.loading') : t('settings.reminders.requestPermission')}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                    <Check className="w-3.5 h-3.5" /> {t('settings.reminders.granted')}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeletePushToken()}
                    className="text-xs text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowVapidConfig(!showVapidConfig)}
                className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline cursor-pointer"
              >
                {showVapidConfig ? 'Hide VAPID' : 'Custom VAPID'}
              </button>
            </div>

            {showVapidConfig && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-700/60 space-y-1.5">
                <input
                  type="text"
                  placeholder="Paste public VAPID key from Firebase..."
                  value={customVapidKey}
                  onChange={(e) => setCustomVapidKey(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200"
                />
              </div>
            )}
          </div>

          {/* Test Notification Action Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Send className="w-4 h-4 text-indigo-500" />
                {t('settings.reminders.sendTestPush')}
              </p>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={handleSendTestNotification}
                disabled={isSendingTest || notificationPermission !== 'granted'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingTest ? t('settings.reminders.testingNotification') : t('settings.reminders.sendTestPush')}</span>
              </button>
            </div>

            {testNotificationResult && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ {testNotificationResult}
              </p>
            )}
          </div>
        </div>

        {/* Reminders & Snooze defaults */}
        <div className="space-y-4 pt-2">
          {/* Default Snooze Duration */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t('settings.reminders.defaultSnooze')}
              </p>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[5, 10, 15, 30].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDefaultSnoozeDuration(mins)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    defaultSnoozeDuration === mins
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          {/* Default Reminders for New Tasks */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 space-y-2.5">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t('settings.reminders.defaultReminders')}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {REMINDER_PRESETS.map(preset => {
                const isSelected = defaultReminders.includes(preset.offset);
                return (
                  <button
                    key={preset.offset}
                    type="button"
                    onClick={() => toggleReminderPreset(preset.offset)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    <span>{t(preset.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Max Snooze Count */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t('captions.maxSnoozes')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('captions.maxSnoozesDesc')}
              </p>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[1, 2, 3, 5, 10].map(count => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setMaxSnoozeCount(count)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    maxSnoozeCount === count
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Battery Optimization & iOS Guides */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Battery className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {t('settings.reminders.batteryGuide')}
              </span>
              <button
                type="button"
                onClick={() => setShowBatteryGuide(!showBatteryGuide)}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
              >
                {showBatteryGuide ? 'Hide' : 'View'}
              </button>
            </div>

            {showBatteryGuide && (
              <div className="pt-2 border-t border-slate-200 dark:border-zinc-700/60 space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
                <p>Android Chrome / PWA: App info → Battery → Select Unrestricted.</p>
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-800 space-y-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              {t('settings.reminders.iosHomeNote')}
            </span>
          </div>
        </div>

        {/* Notification Health Log */}
        <div className="pt-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {t('settings.reminders.notificationHealth')} ({notificationLogs.length})
              </h3>
            </div>

            <button
              type="button"
              onClick={handleRefreshNotificationLogs}
              disabled={isLoadingLogs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              <span>{t('common.refresh')}</span>
            </button>
          </div>

          {notificationLogs.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-zinc-800/30 border border-dashed border-slate-200 dark:border-zinc-800 text-center space-y-1">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('settings.reminders.emptyLogs')}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {notificationLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/70 dark:border-zinc-800 flex items-start justify-between gap-3 text-xs"
                >
                  <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {log.message}
                  </p>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-slate-300">
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 7. Categories Manager */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              {t('settings.categoriesSection.title')} ({categories.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('settings.categoriesSection.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenNewCategory}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('settings.categoriesSection.add')}</span>
            </button>
            <button
              onClick={handleReseedCategories}
              disabled={seeding}
              className="px-3 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-xl disabled:opacity-50 cursor-pointer"
            >
              {seeding ? t('common.loading') : 'Sync Built-ins'}
            </button>
          </div>
        </div>

        {loadingCategories ? (
          <div className="py-8 text-center">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 mt-2">{t('common.loading')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map(cat => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 text-xs shadow-xs"
                    style={{ backgroundColor: cat.color }}
                  >
                    {getCategoryIcon(cat.icon, 'w-4 h-4')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {getCategoryDisplayName(cat, t)}
                    </p>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                      {cat.isBuiltIn ? t('settings.categoriesSection.builtInTag') : t('settings.categoriesSection.customTag')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditCategory(cat)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title={t('common.edit')}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 8. Data Export & Privacy */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {t('settings.data.title')}
          </h2>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t('settings.data.exportData')}
            </p>
          </div>

          <button
            onClick={handleExportData}
            disabled={isExporting}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? t('settings.data.exporting') : t('settings.data.exportData')}</span>
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t('settings.data.deleteAccount')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              {t('settings.data.deleteAccountDesc')}
            </p>
          </div>

          <button
            onClick={() => {
              setDeleteConfirmationText('');
              setIsDeleteDialogOpen(true);
            }}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>{t('settings.data.deleteAccount')}</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-rose-200 dark:border-rose-900 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {t('settings.data.confirmDeleteTitle')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {t('settings.data.confirmDeleteMessage')}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Type <span className="font-mono text-rose-600 font-bold">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={e => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={deleteConfirmationText.trim() !== 'DELETE' || isDeletingAccount}
                onClick={handleDeleteAccountAndData}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-40"
              >
                {isDeletingAccount ? t('common.loading') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal for Create & Edit */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categoryToEdit={categoryToEdit}
        onSaved={handleCategorySaved}
      />
    </div>
  );
};
