import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { NavigationPage } from '../../types';
import {
  Compass,
  Calendar,
  Flame,
  CheckSquare,
  Settings,
  Sun,
  Moon,
  LogOut,
  Layers,
  BookOpen,
} from 'lucide-react';
import { PWAInstallButton } from '../../components/pwa/PWAInstallButton';
import { OfflineIndicator } from '../../components/pwa/OfflineIndicator';

interface AppLayoutProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentPage,
  onNavigate,
  children,
}) => {
  const { t } = useTranslation();
  const { currentUser, userProfile, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  const desktopNavItems: { id: NavigationPage; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: t('nav.home'), icon: <Compass className="w-5 h-5" /> },
    { id: 'calendar', label: t('nav.calendar'), icon: <Calendar className="w-5 h-5" /> },
    { id: 'habits', label: t('nav.habits'), icon: <Flame className="w-5 h-5" /> },
    { id: 'tasks', label: t('nav.tasks'), icon: <CheckSquare className="w-5 h-5" /> },
    { id: 'templates', label: t('nav.templates'), icon: <Layers className="w-5 h-5" /> },
    { id: 'guide', label: t('nav.guide'), icon: <BookOpen className="w-5 h-5" /> },
    { id: 'settings', label: t('nav.settings'), icon: <Settings className="w-5 h-5" /> },
  ];

  const mobileBottomNavItems: { id: NavigationPage; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: t('nav.home'), icon: <Compass className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'calendar', label: t('nav.calendar'), icon: <Calendar className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'habits', label: t('nav.habits'), icon: <Flame className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'tasks', label: t('nav.tasks'), icon: <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'templates', label: t('nav.templates'), icon: <Layers className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'settings', label: t('nav.settings'), icon: <Settings className="w-4 h-4 sm:w-5 sm:h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-200">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 border-r border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 select-none">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('home')}>
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight block">{t('common.appName')}</span>
              <span className="text-[11px] text-slate-400 dark:text-zinc-500 block -mt-0.5">Planner & Habits</span>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {desktopNavItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-400 dark:text-zinc-500'}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
          {/* In-App PWA Install in Desktop Sidebar */}
          <div className="px-1 py-1">
            <PWAInstallButton className="w-full justify-center" variant="compact" />
          </div>
        </nav>

        {/* User Card at Bottom */}
        <div className="p-4 border-t border-slate-100 dark:border-zinc-800/80">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {(userProfile?.displayName || currentUser?.email || 'U')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate text-slate-900 dark:text-slate-100">
                  {userProfile?.displayName || 'Planner'}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">
                  {currentUser?.email}
                </p>
              </div>
            </div>

            <button
              onClick={() => logout()}
              title={t('nav.logout')}
              aria-label={t('nav.logout')}
              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onNavigate('home')}>
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Compass className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight">{t('common.appName')}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onNavigate('guide')}
            aria-label={t('nav.guide')}
            title={t('nav.guide')}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              currentPage === 'guide'
                ? 'bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
          </button>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
          <div
            onClick={() => onNavigate('settings')}
            className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
          >
            {(userProfile?.displayName || currentUser?.email || 'U')[0].toUpperCase()}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 overflow-y-auto">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-slate-200 dark:border-zinc-800 px-1 py-1 safe-area-pb">
        <div className="flex items-center justify-around">
          {mobileBottomNavItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl transition-all min-h-[50px] cursor-pointer ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
                }`}
              >
                <div
                  className={`p-1 rounded-xl transition-all ${
                    isActive ? 'bg-indigo-50 dark:bg-indigo-950/60' : ''
                  }`}
                >
                  {item.icon}
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[56px] text-center">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Connectivity Status Indicator */}
      <OfflineIndicator />
    </div>
  );
};
