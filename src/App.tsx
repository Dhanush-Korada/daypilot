import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './features/auth/AuthPage';
import { AppLayout } from './features/layout/AppLayout';
import { HomePage } from './features/home/HomePage';
import { CalendarPage } from './features/calendar/CalendarPage';
import { HabitsPage } from './features/habits/HabitsPage';
import { TasksPage } from './features/tasks/TasksPage';
import { TemplatesPage } from './features/templates/TemplatesPage';
import { HelpGuidePage } from './features/help/HelpGuidePage';
import { SettingsPage } from './features/settings/SettingsPage';
import { NavigationPage } from './types';
import { Compass } from 'lucide-react';

const DayPilotMain: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<NavigationPage>('home');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center text-slate-800 dark:text-slate-200">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg animate-pulse mb-4">
          <Compass className="w-7 h-7" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce" />
        </div>
        <p className="text-xs text-slate-400 dark:text-zinc-500 mt-3 font-medium">Starting DayPilot...</p>
      </div>
    );
  }

  // All pages are strictly protected: redirect to AuthPage if not signed in
  if (!currentUser) {
    return <AuthPage />;
  }

  return (
    <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {currentPage === 'home' && <HomePage onNavigate={setCurrentPage} />}
      {currentPage === 'calendar' && <CalendarPage />}
      {currentPage === 'habits' && <HabitsPage />}
      {currentPage === 'tasks' && <TasksPage />}
      {currentPage === 'templates' && <TemplatesPage />}
      {currentPage === 'guide' && <HelpGuidePage />}
      {currentPage === 'settings' && <SettingsPage />}
    </AppLayout>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DayPilotMain />
      </AuthProvider>
    </ThemeProvider>
  );
}
