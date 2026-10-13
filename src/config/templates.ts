import { Priority, ReminderLevel, RecurrenceConfig } from '../types';

export type TemplateGroup =
  | 'Health'
  | 'Fitness'
  | 'Study'
  | 'Work'
  | 'Personal'
  | 'Digital wellbeing';

export interface ReadyMadeTaskTemplate {
  id: string;
  titleKey: string;
  descriptionKey: string;
  defaultTitle: string;
  defaultDescription: string;
  categoryKey: string;
  defaultCategoryName: string;
  defaultTime: string; // HH:mm format (e.g., "09:00")
  recurrence: RecurrenceConfig | null;
  priority: Priority;
  reminderLevel: ReminderLevel;
  group: TemplateGroup;
  icon?: string;
  suggestedReminders?: number[]; // minutes before event, e.g. [0, 15]
}

export const TEMPLATE_GROUPS: { id: TemplateGroup; groupKey: string; label: string; icon: string; description: string }[] = [
  { id: 'Health', groupKey: 'templates.groups.health', label: 'Health & Wellness', icon: 'Heart', description: 'Hydration, medicines, posture, and self-care routines' },
  { id: 'Fitness', groupKey: 'templates.groups.fitness', label: 'Fitness & Movement', icon: 'Dumbbell', description: 'Workouts, walks, cardio, and physical conditioning' },
  { id: 'Study', groupKey: 'templates.groups.study', label: 'Study & Learning', icon: 'GraduationCap', description: 'Revisions, active recall, reading, and skill building' },
  { id: 'Work', groupKey: 'templates.groups.work', label: 'Work & Productivity', icon: 'Briefcase', description: 'Planning, inbox management, standups, and reviews' },
  { id: 'Personal', groupKey: 'templates.groups.personal', label: 'Personal & Life', icon: 'UserCheck', description: 'Family calls, bill payments, birthdays, and chores' },
  { id: 'Digital wellbeing', groupKey: 'templates.groups.digitalWellbeing', label: 'Digital Wellbeing', icon: 'Smartphone', description: 'Eye resting, screen detox, and posture alignment' },
];

export const READY_MADE_TEMPLATES: ReadyMadeTaskTemplate[] = [
  // Health Group
  {
    id: 'health-drink-water',
    titleKey: 'templates.items.drinkWater.title',
    descriptionKey: 'templates.items.drinkWater.desc',
    defaultTitle: 'Drink water every 2 hours',
    defaultDescription: 'Keep your body hydrated. Drink a full glass of water (approx. 250ml) to stay refreshed and energized.',
    categoryKey: 'categories.health',
    defaultCategoryName: 'Health & Personal Care',
    defaultTime: '08:00',
    recurrence: {
      frequency: 'custom',
      interval: 2, // every 2 hours interval
    },
    priority: 'medium',
    reminderLevel: 'normal',
    group: 'Health',
    icon: 'Droplet',
    suggestedReminders: [0],
  },
  {
    id: 'health-take-medicine',
    titleKey: 'templates.items.takeMedicine.title',
    descriptionKey: 'templates.items.takeMedicine.desc',
    defaultTitle: 'Take medicine',
    defaultDescription: 'Take your prescribed daily medications and vitamins with a full glass of water after meals.',
    categoryKey: 'categories.health',
    defaultCategoryName: 'Health & Personal Care',
    defaultTime: '08:30',
    recurrence: {
      frequency: 'daily',
    },
    priority: 'high',
    reminderLevel: 'important',
    group: 'Health',
    icon: 'Pill',
    suggestedReminders: [0, 10],
  },
  {
    id: 'health-stretch-break',
    titleKey: 'templates.items.stretchBreak.title',
    descriptionKey: 'templates.items.stretchBreak.desc',
    defaultTitle: 'Stretch break',
    defaultDescription: 'Stand up, roll shoulders back, stretch neck, spine, and hamstrings to release tension from sitting.',
    categoryKey: 'categories.health',
    defaultCategoryName: 'Health & Personal Care',
    defaultTime: '14:30',
    recurrence: {
      frequency: 'daily',
    },
    priority: 'low',
    reminderLevel: 'normal',
    group: 'Health',
    icon: 'Activity',
    suggestedReminders: [0],
  },
  {
    id: 'health-wind-down',
    titleKey: 'templates.items.windDown.title',
    descriptionKey: 'templates.items.windDown.desc',
    defaultTitle: 'Night wind-down & sleep prep',
    defaultDescription: 'Dim the room lights, turn off notifications, and prep for 8 restful hours of sleep.',
    categoryKey: 'categories.health',
    defaultCategoryName: 'Health & Personal Care',
    defaultTime: '22:00',
    recurrence: {
      frequency: 'daily',
    },
    priority: 'medium',
    reminderLevel: 'normal',
    group: 'Health',
    icon: 'Moon',
    suggestedReminders: [15],
  },

  // Fitness Group
  {
    id: 'fitness-morning-workout',
    titleKey: 'templates.items.morningWorkout.title',
    descriptionKey: 'templates.items.morningWorkout.desc',
    defaultTitle: 'Morning workout',
    defaultDescription: 'Complete 30-45 minutes of strength training, calisthenics, HIIT, or mobility exercises.',
    categoryKey: 'categories.fitness',
    defaultCategoryName: 'Workout & Fitness',
    defaultTime: '07:00',
    recurrence: {
      frequency: 'daily',
    },
    priority: 'high',
    reminderLevel: 'important',
    group: 'Fitness',
    icon: 'Dumbbell',
    suggestedReminders: [15, 0],
  },
  {
    id: 'fitness-evening-walk',
    titleKey: 'templates.items.eveningWalk.title',
    descriptionKey: 'templates.items.eveningWalk.desc',
    defaultTitle: 'Evening walk',
    defaultDescription: 'Take a relaxing 20-30 minute walk outdoors to digest, relax your mind, and reach your daily step count.',
    categoryKey: 'categories.fitness',
    defaultCategoryName: 'Workout & Fitness',
    defaultTime: '18:30',
    recurrence: {
      frequency: 'daily',
    },
    priority: 'medium',
    reminderLevel: 'normal',
    group: 'Fitness',
    icon: 'Footprints',
    suggestedReminders: [0],
  },
  {
    id: 'fitness-core-mobility',
    titleKey: 'templates.items.coreMobility.title',
    descriptionKey: 'templates.items.coreMobility.desc',
    defaultTitle: 'Core & mobility session',
    defaultDescription: 'Spend 15 minutes targeting core stability, hip openers, and lower back relief.',
    categoryKey: 'categories.fitness',
    defaultCategoryName: 'Workout & Fitness',
    defaultTime: '12:15',
    recurrence: {
      frequency: 'daily',
    },
    priority: 'low',
    reminderLevel: 'normal',
    group: 'Fitness',
    icon: 'Flame',
    suggestedReminders: [0],
  },

  // Study Group
  {
    id: 'study-revise-notes',
    titleKey: 'templates.items.reviseNotes.title',
    descriptionKey: 'templates.items.reviseNotes.desc',
    defaultTitle: 'Revise notes',
    defaultDescription: 'Active recall and spaced repetition session on today\'s lecture notes, articles, or flashcards.',
    categoryKey: 'categories.study',
    defaultCategoryName: 'Study & Learning',
    defaultTime: '16:00',
    recurrence: {
      frequency: 'daily',
    },
    priority: 'medium',
    reminderLevel: 'normal',
    group: 'Study',
    icon: 'BookOpen',
    suggestedReminders: [10],
  },
  {
    id: 'study-read-20-pages',
    titleKey: 'templates.items.read20Pages.title',
    descriptionKey: 'templates.items.read20Pages.desc',
    defaultTitle: 'Read 20 pages',
    defaultDescription: 'Read 20 pages of your current non-fiction book, technical paper, or personal development reading.',
    categoryKey: 'categories.reading',
    defaultCategoryName: 'Reading & Books',
    defaultTime: '20:30',
    recurrence: {
      frequency: 'daily',
    },
    priority: 'low',
    reminderLevel: 'normal',
    group: 'Study',
    icon: 'BookMarked',
    suggestedReminders: [0],
  },
  {
    id: 'study-language-practice',
    titleKey: 'templates.items.languageDrill.title',
    descriptionKey: 'templates.items.languageDrill.desc',
    defaultTitle: 'Language or vocabulary drill',
    defaultDescription: '15 minutes of immersive listening or flashcard practice in your target language.',
    categoryKey: 'categories.study',
    defaultCategoryName: 'Study & Learning',
    defaultTime: '13:00',
    recurrence: {
      frequency: 'daily',
    },
    priority: 'medium',
    reminderLevel: 'normal',
    group: 'Study',
    icon: 'Languages',
    suggestedReminders: [0],
  },

  // Work Group
  {
    id: 'work-daily-planning-9am',
    titleKey: 'templates.items.dailyPlanning.title',
    descriptionKey: 'templates.items.dailyPlanning.desc',
    defaultTitle: 'Daily planning 9 AM',
    defaultDescription: 'Identify the top 3 must-win goals for today, review calendar appointments, and triage urgent emails.',
    categoryKey: 'categories.work',
    defaultCategoryName: 'Work & Business',
    defaultTime: '09:00',
    recurrence: {
      frequency: 'weekdays',
    },
    priority: 'high',
    reminderLevel: 'important',
    group: 'Work',
    icon: 'Target',
    suggestedReminders: [10, 0],
  },
  {
    id: 'work-weekly-review',
    titleKey: 'templates.items.weeklyReview.title',
    descriptionKey: 'templates.items.weeklyReview.desc',
    defaultTitle: 'Weekly review',
    defaultDescription: 'Audit completed tasks, reconcile pending deliverables, log accomplishments, and plan the upcoming week.',
    categoryKey: 'categories.work',
    defaultCategoryName: 'Work & Business',
    defaultTime: '16:30',
    recurrence: {
      frequency: 'weekly',
      daysOfWeek: [5], // Friday
    },
    priority: 'medium',
    reminderLevel: 'normal',
    group: 'Work',
    icon: 'ClipboardCheck',
    suggestedReminders: [15],
  },
  {
    id: 'work-inbox-zero',
    titleKey: 'templates.items.inboxZero.title',
    descriptionKey: 'templates.items.inboxZero.desc',
    defaultTitle: 'Inbox triage & zero check',
    defaultDescription: 'Archive resolved threads, snooze non-urgent questions, and reply to priority correspondence.',
    categoryKey: 'categories.work',
    defaultCategoryName: 'Work & Business',
    defaultTime: '11:30',
    recurrence: {
      frequency: 'weekdays',
    },
    priority: 'medium',
    reminderLevel: 'normal',
    group: 'Work',
    icon: 'Mail',
    suggestedReminders: [0],
  },

  // Personal Group
  {
    id: 'personal-call-family',
    titleKey: 'templates.items.callFamily.title',
    descriptionKey: 'templates.items.callFamily.desc',
    defaultTitle: 'Call family',
    defaultDescription: 'Call parents, grandparents, or siblings to check in, share updates, and nurture family bonds.',
    categoryKey: 'categories.family',
    defaultCategoryName: 'Family & Friends',
    defaultTime: '17:00',
    recurrence: {
      frequency: 'weekly',
      daysOfWeek: [0], // Sunday
    },
    priority: 'medium',
    reminderLevel: 'normal',
    group: 'Personal',
    icon: 'PhoneCall',
    suggestedReminders: [15],
  },
  {
    id: 'personal-pay-bills-monthly',
    titleKey: 'templates.items.payBills.title',
    descriptionKey: 'templates.items.payBills.desc',
    defaultTitle: 'Pay bills monthly',
    defaultDescription: 'Pay utility bills, credit card statements, rent/mortgage, subscriptions, and update your personal budget.',
    categoryKey: 'categories.work',
    defaultCategoryName: 'Work & Business',
    defaultTime: '10:00',
    recurrence: {
      frequency: 'monthly',
    },
    priority: 'high',
    reminderLevel: 'persistent',
    group: 'Personal',
    icon: 'CreditCard',
    suggestedReminders: [1440, 60], // 1 day and 1 hour before
  },
  {
    id: 'personal-birthday-yearly',
    titleKey: 'templates.items.birthdayYearly.title',
    descriptionKey: 'templates.items.birthdayYearly.desc',
    defaultTitle: 'Birthday yearly',
    defaultDescription: 'Send sincere birthday greetings, card, or gifts to celebrate special milestones.',
    categoryKey: 'categories.birthdays',
    defaultCategoryName: 'Birthdays & Special Events',
    defaultTime: '09:00',
    recurrence: {
      frequency: 'custom',
      interval: 365,
    },
    priority: 'medium',
    reminderLevel: 'important',
    group: 'Personal',
    icon: 'Cake',
    suggestedReminders: [1440, 0], // 1 day before and morning of
  },
  {
    id: 'personal-home-declutter',
    titleKey: 'templates.items.homeDeclutter.title',
    descriptionKey: 'templates.items.homeDeclutter.desc',
    defaultTitle: 'Weekly home reset & declutter',
    defaultDescription: 'Clean desks, do laundry, take out recycling, and restock home essentials.',
    categoryKey: 'categories.health',
    defaultCategoryName: 'Health & Personal Care',
    defaultTime: '10:30',
    recurrence: {
      frequency: 'weekly',
      daysOfWeek: [6], // Saturday
    },
    priority: 'low',
    reminderLevel: 'normal',
    group: 'Personal',
    icon: 'Sparkles',
    suggestedReminders: [0],
  },

  // Digital Wellbeing Group
  {
    id: 'digital-break-from-scrolling',
    titleKey: 'templates.items.scrollingBreak.title',
    descriptionKey: 'templates.items.scrollingBreak.desc',
    defaultTitle: 'Take a break from scrolling',
    defaultDescription: 'Look away from the screen for at least 2 minutes. Focus on an object 20 feet away (20-20-20 rule) and blink gently.',
    categoryKey: 'categories.health',
    defaultCategoryName: 'Health & Personal Care',
    defaultTime: '11:00',
    recurrence: {
      frequency: 'custom',
      interval: 45, // every 45 min
    },
    priority: 'medium',
    reminderLevel: 'important',
    group: 'Digital wellbeing',
    icon: 'SmartphoneOff',
    suggestedReminders: [0],
  },
  {
    id: 'digital-screen-curfew',
    titleKey: 'templates.items.screenCurfew.title',
    descriptionKey: 'templates.items.screenCurfew.desc',
    defaultTitle: 'Night screen curfew',
    defaultDescription: 'Put all mobile phones, tablets, and laptops in another room 45 minutes before sleep to avoid blue light disruption.',
    categoryKey: 'categories.health',
    defaultCategoryName: 'Health & Personal Care',
    defaultTime: '21:45',
    recurrence: {
      frequency: 'daily',
    },
    priority: 'medium',
    reminderLevel: 'normal',
    group: 'Digital wellbeing',
    icon: 'ShieldAlert',
    suggestedReminders: [10],
  },
];
