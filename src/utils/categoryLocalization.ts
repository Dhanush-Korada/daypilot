import { TFunction } from 'i18next';
import { Category } from '../types';

/**
 * Standard English names for the 9 built-in categories.
 */
export const BUILT_IN_CATEGORY_NAME_MAP: Record<string, string> = {
  'Workout & Fitness': 'categories.fitness',
  'Reading & Books': 'categories.reading',
  'Study & Learning': 'categories.study',
  'Work & Business': 'categories.work',
  'Health & Personal Care': 'categories.health',
  'Family & Friends': 'categories.family',
  'Birthdays & Special Events': 'categories.birthdays',
  'Daily Habits': 'categories.habitsCategory',
  'Other': 'categories.other',
};

/**
 * Returns translated display name if category is built-in; otherwise returns user's custom name.
 */
export function getCategoryDisplayName(category: Category | undefined | null, t: TFunction): string {
  if (!category) return '';
  if (category.isBuiltIn && BUILT_IN_CATEGORY_NAME_MAP[category.name]) {
    const key = BUILT_IN_CATEGORY_NAME_MAP[category.name];
    const translated = t(key);
    return translated || category.name;
  }
  // Also check if category.name itself matches any built-in key even if isBuiltIn flag was missing
  if (BUILT_IN_CATEGORY_NAME_MAP[category.name]) {
    const key = BUILT_IN_CATEGORY_NAME_MAP[category.name];
    const translated = t(key);
    return translated || category.name;
  }
  return category.name;
}
