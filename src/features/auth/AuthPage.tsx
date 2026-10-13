import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Compass, Mail, Lock, LockOpen, User, ArrowRight, Sun, Moon, AlertCircle, CheckCircle } from 'lucide-react';
import { LanguagePicker } from '../../components/LanguagePicker';

type AuthMode = 'login' | 'signup' | 'forgot_password';

export const AuthPage: React.FC = () => {
  const { t } = useTranslation();
  const { login, signup, resetPassword } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [animatingPassLock, setAnimatingPassLock] = useState(false);
  const [animatingConfirmLock, setAnimatingConfirmLock] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage(t('validation.invalidEmail'));
      return;
    }

    if (mode === 'forgot_password') {
      try {
        setLoading(true);
        await resetPassword(email.trim());
        setSuccessMessage('Password reset instructions have been sent to your email.');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('errors.generic');
        setErrorMessage(cleanAuthError(message));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setErrorMessage(t('validation.required'));
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setErrorMessage(t('validation.passwordMin'));
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage(t('errors.authFailed'));
        return;
      }
    }

    try {
      setLoading(true);
      if (mode === 'login') {
        await login(email.trim(), password);
      } else if (mode === 'signup') {
        await signup(email.trim(), password, displayName.trim());
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('errors.authFailed');
      setErrorMessage(cleanAuthError(message));
    } finally {
      setLoading(false);
    }
  };

  const cleanAuthError = (msg: string) => {
    if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
      return t('errors.authFailed');
    }
    if (msg.includes('auth/email-already-in-use')) {
      return t('auth.alreadyHaveAccount');
    }
    if (msg.includes('auth/weak-password')) {
      return t('validation.passwordMin');
    }
    if (msg.includes('auth/user-not-found')) {
      return t('errors.authFailed');
    }
    if (msg.includes('auth/invalid-email')) {
      return t('validation.invalidEmail');
    }
    return msg;
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Header */}
      <header className="p-4 sm:p-6 flex justify-between items-center max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
            <Compass className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">{t('common.appName')}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Picker on Sign In / Sign Up screen */}
          <LanguagePicker variant="dropdown" />

          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-400 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 dark:border-zinc-800">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              {mode === 'login' && t('auth.signInTab')}
              {mode === 'signup' && t('auth.signUpTab')}
              {mode === 'forgot_password' && 'Reset Password'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {mode === 'login' && t('auth.welcomeSubtitle')}
              {mode === 'signup' && t('auth.welcomeSubtitle')}
              {mode === 'forgot_password' && t('auth.passwordHint')}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          {mode !== 'forgot_password' && (
            <div className="flex p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('auth.signInTab')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  mode === 'signup'
                    ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('auth.signUpTab')}
              </button>
            </div>
          )}

          {/* Status Notifications */}
          {errorMessage && (
            <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-sm rounded-xl flex items-start gap-2.5">
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('auth.displayNameLabel')}
                </label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={t('auth.displayNamePlaceholder')}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                {t('auth.emailLabel')}
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            {mode !== 'forgot_password' && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {t('auth.passwordLabel')}
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_password');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setAnimatingPassLock(true);
                      setTimeout(() => setAnimatingPassLock(false), 300);
                      setShowPassword((prev) => !prev);
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className={`absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-all duration-300 transform active:scale-75 ${
                      animatingPassLock ? 'scale-125 rotate-12' : 'scale-100 rotate-0'
                    } ${
                      showPassword
                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    {showPassword ? (
                      <LockOpen className="w-4 h-4 transition-transform duration-200" />
                    ) : (
                      <Lock className="w-4 h-4 transition-transform duration-200" />
                    )}
                  </button>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.passwordPlaceholder')}
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all font-mono tracking-wider"
                  />
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {t('auth.passwordLabel')} ({t('common.confirm')})
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setAnimatingConfirmLock(true);
                      setTimeout(() => setAnimatingConfirmLock(false), 300);
                      setShowConfirmPassword((prev) => !prev);
                    }}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    className={`absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-all duration-300 transform active:scale-75 ${
                      animatingConfirmLock ? 'scale-125 rotate-12' : 'scale-100 rotate-0'
                    } ${
                      showConfirmPassword
                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    {showConfirmPassword ? (
                      <LockOpen className="w-4 h-4 transition-transform duration-200" />
                    ) : (
                      <Lock className="w-4 h-4 transition-transform duration-200" />
                    )}
                  </button>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('auth.passwordPlaceholder')}
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all font-mono tracking-wider"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 active:scale-[0.99] transition-all disabled:opacity-50 min-h-[48px] cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'login' && t('auth.signInButton')}
                    {mode === 'signup' && t('auth.signUpButton')}
                    {mode === 'forgot_password' && t('common.confirm')}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {mode === 'forgot_password' && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                {t('common.back')}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-slate-500 dark:text-slate-500">
        DayPilot &copy; {new Date().getFullYear()} &middot; Mobile-first planner
      </footer>
    </div>
  );
};
