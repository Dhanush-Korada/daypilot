import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '../config/languages';
import { LOCAL_STORAGE_LANGUAGE_KEY } from '../config/i18n';

interface LanguagePickerProps {
  className?: string;
  variant?: 'compact' | 'segmented' | 'dropdown';
  onLanguageChange?: (code: LanguageCode) => void;
}

export const LanguagePicker: React.FC<LanguagePickerProps> = ({
  className = '',
  variant = 'dropdown',
  onLanguageChange,
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const handleSelectLanguage = (code: LanguageCode) => {
    i18n.changeLanguage(code);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_LANGUAGE_KEY, code);
    }
    if (onLanguageChange) {
      onLanguageChange(code);
    }
  };

  if (variant === 'segmented') {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 ${className}`}>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isActive = currentLang === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelectLanguage(lang.code)}
              className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-zinc-700 hover:border-indigo-300'
              }`}
            >
              <span className="font-medium text-left">
                {lang.nativeName}
              </span>
              <span className={`text-[10px] ml-1.5 opacity-80 ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                {lang.name}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
      <Globe className="w-4 h-4 text-slate-400 shrink-0" />
      <select
        value={currentLang}
        onChange={(e) => handleSelectLanguage(e.target.value as LanguageCode)}
        className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        aria-label="Select Language"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName} ({lang.name})
          </option>
        ))}
      </select>
    </div>
  );
};
