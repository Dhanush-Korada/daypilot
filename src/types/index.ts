import { Timestamp } from 'firebase/firestore';

export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type ReminderLevel = 'normal' | 'important' | 'persistent';

export interface RecurrenceConfig {
  frequency?: 'daily' | 'weekly' | 'weekdays' | 'weekends' | 'monthly' | 'custom';
  interval?: number;
  daysOfWeek?: number[];
  endDate?: string | null;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  timezone?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  isBuiltIn?: boolean;
  createdAt?: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  categoryId?: string;
  dueAt?: Timestamp | string | null;
  timezone?: string;
  priority: Priority;
  status: TaskStatus;
  recurrence?: RecurrenceConfig | null;
  reminderLevel: ReminderLevel;
  reminders?: number[]; // offset in minutes (e.g. [0, 15, 60])
  snoozeCount?: number;
  snoozedUntil?: Timestamp | string | null;
  completedAt?: Timestamp | string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Habit {
  id: string;
  userId: string;
  title: string;
  description?: string;
  categoryId?: string;
  frequency: 'daily' | 'weekdays' | 'weekends' | 'custom';
  targetDaysPerWeek?: number;
  reminderTime?: string;
  streak?: number;
  bestStreak?: number;
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  completedAt?: string;
}

export interface UserTemplate {
  id: string;
  userId: string;
  name: string;
  type: 'task' | 'habit' | 'routine';
  templateData: Record<string, unknown>;
  createdAt?: string;
}

export interface NotificationLog {
  id: string;
  userId: string;
  taskId?: string;
  habitId?: string;
  message: string;
  sentAt?: string;
  status: 'sent' | 'failed' | 'dismissed';
}

export interface PushToken {
  id?: string;
  token: string;
  userId: string;
  device?: string;
  createdAt?: string;
}

export interface UserSettings {
  userId: string;
  theme: 'light' | 'dark' | 'system';
  timezone?: string;
  soundEnabled?: boolean;
  hapticFeedback?: boolean;
  defaultReminderOffset?: number; // e.g., 10 minutes before
  weekStartsOn?: number; // 0 for Sunday, 1 for Monday
  timeFormat?: '12h' | '24h';
  dateFormat?: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';
  defaultSnoozeDuration?: number; // minutes (e.g. 5, 10, 15, 30, 60)
  defaultReminders?: number[]; // offsets in minutes
  maxSnoozeCount?: number; // max snooze times before forcing completion
  persistentReminderInterval?: number; // interval in minutes to re-alert persistent tasks
  pushEnabled?: boolean;
  language?: 'en' | 'te' | 'hi' | 'te-Latn' | 'hi-Latn';
  captionsEnabled?: boolean;
  captionIntensity?: 'gentle' | 'friendly' | 'roast';
  notificationTone?: 'chime' | 'soft' | 'alert' | 'voice' | 'silent';
  readCaptionAloud?: boolean;
  recentCaptionIds?: string[];
  updatedAt?: string;
}

export type NavigationPage = 'home' | 'calendar' | 'habits' | 'tasks' | 'templates' | 'guide' | 'settings';
