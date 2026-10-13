import { Category } from '../types';

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
 * Returns translated name for built-in categories; custom categories return their user-entered name.
 */
export function getCategoryDisplayName(
  category: Category | null | undefined,
  t: (key: string, options?: any) => string
): string {
  if (!category) return '';
  if (category.isBuiltIn && BUILT_IN_CATEGORY_NAME_MAP[category.name]) {
    const key = BUILT_IN_CATEGORY_NAME_MAP[category.name];
    return t(key, { defaultValue: category.name });
  }
  return category.name;
}

/**
 * Returns category display name from categoryId and list of categories
 */
export function getCategoryDisplayNameById(
  categories: Category[],
  categoryId: string | null | undefined,
  t: (key: string, options?: any) => string
): string {
  if (!categoryId) return '';
  const found = categories.find(c => c.id === categoryId);
  return found ? getCategoryDisplayName(found, t) : '';
}
