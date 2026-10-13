import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '../locales/en.json';
import te from '../locales/te.json';
import hi from '../locales/hi.json';
import teLatn from '../locales/te-Latn.json';
import hiLatn from '../locales/hi-Latn.json';
import { DEFAULT_LANGUAGE, type LanguageCode } from './languages';

export const LOCAL_STORAGE_LANGUAGE_KEY = 'daypilot_language';

// Read cached language if available to prevent flash on reload
const getInitialLanguage = (): LanguageCode => {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(LOCAL_STORAGE_LANGUAGE_KEY);
    if (cached && ['en', 'te', 'hi', 'te-Latn', 'hi-Latn'].includes(cached)) {
      return cached as LanguageCode;
    }
    // Browser language detection
    const browserLang = navigator.language?.toLowerCase() || '';
    if (browserLang.startsWith('te')) return 'te';
    if (browserLang.startsWith('hi')) return 'hi';
  }
  return DEFAULT_LANGUAGE;
};

const initialLang = getInitialLanguage();

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      te: { translation: te },
      hi: { translation: hi },
      'te-Latn': { translation: teLatn },
      'hi-Latn': { translation: hiLatn },
    },
    lng: initialLang,
    fallbackLng: 'en',
    saveMissing: true,
    missingKeyHandler: (ngs, ns, key, fallbackValue) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[i18n] Missing translation key: "${key}" for languages:`, ngs);
      }
    },
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LOCAL_STORAGE_LANGUAGE_KEY,
      caches: ['localStorage'],
    },
  });

// Apply document font-family or direction if needed
if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLang;
}

i18n.on('languageChanged', (lng: string) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_LANGUAGE_KEY, lng);
    }
  }
});

export default i18n;
