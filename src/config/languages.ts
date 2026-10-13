export type LanguageCode = 'en' | 'te' | 'hi' | 'te-Latn' | 'hi-Latn';

export interface LanguageConfig {
  code: LanguageCode;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  fontFamily?: string;
  localeCode: string; // for Intl date/time formatting
}

export const LANGUAGES: Record<LanguageCode, LanguageConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    localeCode: 'en-US',
  },
  te: {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    direction: 'ltr',
    fontFamily: "'Noto Sans Telugu', sans-serif",
    localeCode: 'te-IN',
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    direction: 'ltr',
    fontFamily: "'Noto Sans Devanagari', sans-serif",
    localeCode: 'hi-IN',
  },
  'te-Latn': {
    code: 'te-Latn',
    name: 'Tenglish',
    nativeName: 'Tenglish',
    direction: 'ltr',
    localeCode: 'en-IN',
  },
  'hi-Latn': {
    code: 'hi-Latn',
    name: 'Hinglish',
    nativeName: 'Hinglish',
    direction: 'ltr',
    localeCode: 'en-IN',
  },
};

export const SUPPORTED_LANGUAGES = Object.values(LANGUAGES);
export const DEFAULT_LANGUAGE: LanguageCode = 'en';
