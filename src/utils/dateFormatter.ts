import i18n from '../config/i18n';
import { LANGUAGES, type LanguageCode } from '../config/languages';

export function getActiveLanguageCode(): LanguageCode {
  const current = (i18n.language || 'en') as LanguageCode;
  return LANGUAGES[current] ? current : 'en';
}

export function getActiveLocale(): string {
  const code = getActiveLanguageCode();
  return LANGUAGES[code]?.localeCode || 'en-US';
}

/**
 * Formats a date string (YYYY-MM-DD or ISO timestamp) with the active language locale
 * and respect user's dateFormat preference.
 */
export function formatDate(
  dateInput: string | Date | undefined,
  dateFormatPreference: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY' = 'YYYY-MM-DD'
): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);

  if (dateFormatPreference === 'MM/DD/YYYY') {
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  }

  if (dateFormatPreference === 'DD/MM/YYYY') {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  // Default ISO: YYYY-MM-DD
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Formats a time string (HH:mm) into either 12-hour or 24-hour display using current active locale.
 */
export function formatTime(
  timeInput: string | undefined,
  format12or24: '12h' | '24h' = '12h'
): string {
  if (!timeInput) return '';
  const parts = timeInput.split(':');
  if (parts.length < 2) return timeInput;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return timeInput;

  if (format12or24 === '24h') {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  // 12h format
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  const locale = getActiveLocale();
  return date.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats a localized readable date string (e.g., "Monday, Oct 12" in active language)
 */
export function formatFriendlyDate(dateInput: string | Date | undefined): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);

  const locale = getActiveLocale();
  return date.toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export const formatLocalizedDate = formatFriendlyDate;
