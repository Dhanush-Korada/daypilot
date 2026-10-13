export interface FeatureGuideItem {
  id: string;
  title: string;
  icon: string;
  category: 'Dashboard' | 'Tasks' | 'Calendar' | 'Habits' | 'Templates' | 'Customization' | 'Data & Privacy';
  summary: string;
  whatItDoes: string;
  stepByStep: string[];
  tips: string[];
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface ReminderChecklistItem {
  id: string;
  title: string;
  description: string;
  actionText?: string;
}

export const FEATURE_GUIDE_ITEMS: FeatureGuideItem[] = [
  {
    id: 'home-dashboard',
    title: 'Home Dashboard & Day Overview',
    icon: 'Compass',
    category: 'Dashboard',
    summary: 'Your intelligent central command center for daily accomplishments.',
    whatItDoes:
      'Provides a personalized morning greeting, current date, a live daily progress ring tracking completed tasks, a real-time countdown card to your next upcoming reminder, quick tab filters (Today, Upcoming, Overdue, Completed), and quick-action access to add new tasks or habits.',
    stepByStep: [
      'Tap "Home" from the left sidebar on desktop or bottom navigation on mobile.',
      'Check your daily progress ring at the top to see completed vs pending tasks.',
      'Review the "Next Reminder" card for a live second-by-second countdown to your closest alert.',
      'Switch between the Today, Upcoming, Overdue, and Completed tabs to organize your workload.',
      'Click the floating or top "+ Add New Task" button to schedule a task instantly.'
    ],
    tips: [
      'Completed tasks stay visible in the Completed tab so you can look back on your day\'s wins.',
      'Overdue tasks are highlighted with warm warning accents so you never drop an urgent deadline.',
      'The Next Reminder card automatically refreshes as time ticks down.'
    ],
  },
  {
    id: 'tasks-management',
    title: 'Task Management & Scheduling',
    icon: 'CheckSquare',
    category: 'Tasks',
    summary: 'Create, schedule, organize, prioritize, and manage recurring tasks.',
    whatItDoes:
      'Allows you to manage tasks with titles, detailed notes, categories, due dates, specific times, priority levels (Low, Medium, High), flexible recurrence (daily, weekly, monthly, custom), and reminder alerts (at time, 10m, 1h, 1d before). Provides quick action buttons on every card: Done, Snooze, Tomorrow, Reschedule, Edit, and Delete.',
    stepByStep: [
      'Navigate to "Tasks" from the sidebar or bottom bar.',
      'Tap "+ New Task" to open the creation dialog.',
      'Enter the title (required), optional notes, category, due date, time, and priority.',
      'Select a recurrence pattern if the task repeats (e.g. Daily, Weekdays, Weekly).',
      'Choose reminder alert offsets and click "Create Task" to save directly to Firestore.',
      'Use quick actions directly on the task card: mark Done, snooze for 15 minutes, postpone to tomorrow, or tap the three dots for Reschedule, Edit, and Delete.'
    ],
    tips: [
      'Quick-action buttons let you reschedule or postpone without opening any dialogs.',
      'Search by keyword in the search bar to find tasks across past and upcoming dates instantly.',
      'Filter by category, priority, or completion status to isolate your immediate focus.'
    ],
  },
  {
    id: 'calendar-views',
    title: 'Interactive Calendar Planner',
    icon: 'Calendar',
    category: 'Calendar',
    summary: 'View your tasks across Month, Week, and Day layouts.',
    whatItDoes:
      'Provides three comprehensive calendar views (Month, Week, Day). Displays colored indicators on days with scheduled tasks. Tapping any day displays its scheduled tasks and lets you schedule a new task directly on that selected date. Includes quick month/year jumps and respects your custom week-start preference (Monday or Sunday).',
    stepByStep: [
      'Open the "Calendar" page from the main menu.',
      'Switch between Month, Week, and Day view modes at the top right toggle.',
      'Use the chevron navigation arrows (< and >) or tap the Month/Year header to jump directly to any month.',
      'Tap on any date cell to view all tasks scheduled for that date.',
      'Click "+ Add Task" on the selected date drawer to create a task pre-filled with that date.'
    ],
    tips: [
      'Dots on calendar dates match category and priority colors for rapid visual scanning.',
      'Configure whether your weeks start on Sunday or Monday in Settings > Calendar Preferences.',
      'The "Today" quick button always returns you back to the current day in a single click.'
    ],
  },
  {
    id: 'habits-tracker',
    title: 'Habit Tracker & Streak Counter',
    icon: 'Flame',
    category: 'Habits',
    summary: 'Build lasting daily routines with streaks and weekly progress logs.',
    whatItDoes:
      'Completely separated from one-off tasks, the Habits tracker allows you to establish recurring routines (Daily, Weekdays, Weekends, or Custom target days per week). Tracks your current streak, all-time best streak, and visual weekly completion dots. Supports daily check-ins and editing/deleting habits.',
    stepByStep: [
      'Click "Habits" in the sidebar or bottom navigation.',
      'Tap "+ New Habit" to create a routine.',
      'Specify the habit title, description, category, frequency, and optional target days per week.',
      'On each day, tap the checkmark ring on the habit card to log your daily completion.',
      'Watch your current streak count increment with fire animations as consistency builds.'
    ],
    tips: [
      'Habit logs are recorded by calendar date in Firestore, ensuring streaks persist across devices.',
      'The 7-day visual dot trail shows your consistency across the current week at a glance.',
      'Celebrate milestones when your current streak matches or beats your all-time best!'
    ],
  },
  {
    id: 'templates-library',
    title: 'Ready-Made Templates Library',
    icon: 'Layers',
    category: 'Templates',
    summary: 'Add pre-built routine tasks in one tap or create your own personal templates.',
    whatItDoes:
      'Offers a rich curated library of pre-configured task templates spanning Health (hydration, medicines, stretching), Fitness (workouts, walks), Study (notes revision, book reading), Work (daily 9 AM planning, weekly reviews), Personal (family calls, monthly bills, birthdays), and Digital Wellbeing (scrolling breaks). Allows you to add in one tap or edit before saving, as well as save any of your own custom tasks as personal templates.',
    stepByStep: [
      'Go to "Templates" from the sidebar navigation or via the Quick Links in Settings/Home.',
      'Browse template categories using group filter pills (Health, Fitness, Study, Work, Personal, Digital Wellbeing).',
      'Tap "Add Directly" to schedule the task immediately for today, or tap "Edit & Add" to modify times, categories, or notes before saving.',
      'To save your own custom template: click "+ Create Template" or choose "Save as Template" from any task menu.'
    ],
    tips: [
      'Templates carry preset recurrence and reminder offsets optimized for productive habits.',
      'Your saved personal templates appear under the "My Templates" tab for instant reuse.',
      'Templates can be deleted anytime without affecting tasks already scheduled.'
    ],
  },
  {
    id: 'custom-categories',
    title: 'Custom Categories & Visual Tags',
    icon: 'Tag',
    category: 'Customization',
    summary: 'Color-code and categorize your tasks and habits.',
    whatItDoes:
      'Provides customizable categories with custom names, expressive Lucide icons, and vibrant accent colors. Allows you to organize tasks, filter lists, and visually scan your schedule with instant recognition.',
    stepByStep: [
      'Go to "Settings" and scroll down to the "Categories" section.',
      'Click "+ New Category" to open the creation dialog.',
      'Enter a name, pick an icon (e.g. Heart, Dumbbell, Briefcase, BookOpen), and choose a color swatch.',
      'Click "Save Category" to create it.',
      'Assign this category when creating or editing any task or habit.'
    ],
    tips: [
      'Use distinct colors for Work vs Personal vs Health to spot work-life balance at a glance.',
      'You can sync default built-in categories anytime using the "Sync Built-ins" button.'
    ],
  },
  {
    id: 'themes-appearance',
    title: 'Light, Dark & System Theme Modes',
    icon: 'Palette',
    category: 'Customization',
    summary: 'High-contrast WCAG AA accessible interface in light, dark, and auto modes.',
    whatItDoes:
      'Delivers complete color variable adaptation for DayPilot. Supports crisp clean Light mode, deep high-contrast Dark mode, and automatic System mode that follows your operating system preference without any flicker or page refresh.',
    stepByStep: [
      'Click the Sun / Moon toggle icon in the top header or sidebar for instant switching.',
      'Or go to "Settings > Appearance & Theme" to select Light, Dark, or System mode.',
      'Your theme choice is stored in local storage and synced to your user profile in Firestore.'
    ],
    tips: [
      'System mode adapts automatically when your OS switches between daytime and nighttime.',
      'Every card, modal, and text color adheres to WCAG AA contrast standards.'
    ],
  },
  {
    id: 'data-privacy-export',
    title: 'Data Export & Account Privacy',
    icon: 'ShieldCheck',
    category: 'Data & Privacy',
    summary: 'Full data portability with JSON backups and strict zero-trust security.',
    whatItDoes:
      'Ensures your data is 100% yours. You can export a comprehensive JSON archive containing all tasks, categories, habits, logs, and templates. Includes complete account and data removal options in compliance with privacy best practices.',
    stepByStep: [
      'Go to "Settings" and scroll down to the "Data & Backup" section.',
      'Click "Export My Data (JSON)" to download your complete data archive.',
      'To remove your data: tap "Delete Account & Data", review the warning, and confirm deletion.'
    ],
    tips: [
      'Export a JSON backup periodically to keep a local archive of your habits and history.',
      'All Firestore collections are strictly locked to your authenticated user ID.'
    ],
  },
];

export const REMINDERS_WHILE_USING_OTHER_APPS = {
  title: 'Getting Reminders While Using Other Apps',
  subtitle: 'How to ensure audio alerts and notifications reach you when DayPilot is in the background',
  overview:
    'Web applications run inside browser sandboxes. To receive reminders when browsing other tabs, working in other software, or when your phone is locked, DayPilot uses standard Web Notifications, Web Audio chimes, and PWA background lifecycle hooks. Here is how to configure your devices for reliable alerts:',
  sections: [
    {
      title: '1. Enable Browser Notifications',
      description:
        'When you first sign in or test an alert, your browser will ask for permission to display notifications. Ensure you click "Allow". If you previously clicked "Block", click the lock icon beside the URL in your browser bar, toggle Notifications to "Allow", and reload the tab.',
    },
    {
      title: '2. Keep the Tab Pinned or Open in Background',
      description:
        'Browsers throttle timers in inactive tabs to save memory and battery. Right-click the DayPilot tab in your browser (Chrome, Edge, Brave, Firefox) and select "Pin Tab". Pinned tabs remain active with elevated background execution priorities.',
    },
    {
      title: '3. Install as a Web App (PWA)',
      description:
        'For the smoothest experience on desktop and mobile, install DayPilot as an application:\n• On Chrome/Edge: Click the install icon in the address bar or menu ("Install DayPilot").\n• On iPhone/iPad (Safari): Tap the Share button and select "Add to Home Screen".\n• On Android: Tap the three dots menu in Chrome and select "Install App" or "Add to Home screen".',
    },
    {
      title: '4. Check System "Do Not Disturb" & Focus Modes',
      description:
        'Windows Focus Assist, macOS Focus/Do Not Disturb, iOS Focus Modes, and Android Do Not Disturb suppress notification banners and sounds by default. Add your browser to the list of allowed apps in your system sound and focus settings.',
    },
    {
      title: '5. Battery Optimization & Power Saving',
      description:
        'On mobile devices (especially Samsung, Xiaomi, and OnePlus), aggressive battery savers sleep background browser tabs. In your phone Settings > Battery > Battery Optimization, locate your browser and choose "Don\'t optimize" or "Unrestricted".',
    },
    {
      title: '6. Audio Chimes & Sound Permissions',
      description:
        'Browsers require at least one user click on the page before playing audio chimes (Web Audio autoplay security policy). Once you have clicked anywhere on DayPilot during a session, audio reminder chimes will play at scheduled alert times.',
    },
    {
      title: '7. Web Limitation: Cannot Draw Over Other Apps (Honest Notice)',
      description:
        'Due to web browser sandbox security, web applications and PWAs cannot draw floating windows or full-screen overlays over third-party applications (this requires native Android SYSTEM_ALERT_WINDOW permission or a compiled native APK). DayPilot operates honestly within web capabilities by sending real, high-priority system push notifications with vibration, sound, persistent re-alerting, and quick action buttons (Done and Remind me later) directly to your system notification tray and lock screen.',
    },
  ],
};

export const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'Reminders',
    question: 'How do task reminders alert me?',
    answer:
      'DayPilot fires notifications when a task reaches its scheduled reminder offset (e.g. 15 minutes before or at the exact time). It uses Web Notifications with a distinct visual banner and an audible chime.',
  },
  {
    id: 'faq-2',
    category: 'Reminders',
    question: 'What is the difference between Normal, Important, and Persistent reminder levels?',
    answer:
      '• Normal: Single discreet notification banner and brief chime.\n• Important: High-priority banner with prominent alert sound.\n• Persistent: Urgent alarm styling with repeated chimes designed for critical medicine, meetings, or hard deadlines.',
  },
  {
    id: 'faq-3',
    category: 'Tasks',
    question: 'How do recurring tasks work when marked Done?',
    answer:
      'When you mark a recurring task as Done, DayPilot records completion for the current instance and automatically schedules the next occurrence based on your recurrence rule (e.g., advancing daily, next weekday, or next week).',
  },
  {
    id: 'faq-4',
    category: 'Habits',
    question: 'How is a habit streak calculated?',
    answer:
      'Streaks count consecutive days where you checked in. If you complete a habit today and completed it yesterday, your streak increases by 1. If a day is missed according to the habit frequency, the current streak resets to 1 upon your next check-in, while your all-time Best Streak remains saved.',
  },
  {
    id: 'faq-5',
    category: 'Calendar',
    question: 'How do I change the first day of the week to Sunday or Monday?',
    answer:
      'Go to Settings > Calendar Preferences, and select either "Monday" or "Sunday". The change immediately updates your monthly and weekly calendar grids and is saved to your account preferences.',
  },
  {
    id: 'faq-6',
    category: 'Templates',
    question: 'Can I save my own custom task as a template?',
    answer:
      'Yes! Open the Templates page and tap "+ Create Template" to define a template, or click the three-dot menu on any existing task card and select "Save as Template". It will be saved into your personal "My Templates" collection.',
  },
  {
    id: 'faq-7',
    category: 'Data & Privacy',
    question: 'Is my data synchronized across my devices?',
    answer:
      'Yes. All tasks, categories, habits, logs, and settings are saved in real-time in Google Cloud Firestore under your authenticated user ID. Signing in from any laptop, tablet, or phone gives you access to the same up-to-date schedule.',
  },
  {
    id: 'faq-8',
    category: 'Data & Privacy',
    question: 'How do I backup or export all my data?',
    answer:
      'Navigate to Settings, find the "Data & Backup" card, and click "Export My Data (JSON)". A timestamped JSON file containing all your profile data, settings, categories, tasks, habits, and templates will download immediately to your computer.',
  },
];

export const REMINDER_CHECKLIST_ITEMS: ReminderChecklistItem[] = [
  {
    id: 'check-permission',
    title: 'Browser Notification Permission',
    description: 'Grant permission for DayPilot to display desktop and lock screen notification banners.',
    actionText: 'Request Permission',
  },
  {
    id: 'check-audio',
    title: 'System Volume & Media Sound',
    description: 'Ensure your device volume is turned up and not set to total mute or hardware silent switch.',
  },
  {
    id: 'check-dnd',
    title: 'Focus Assist / Do Not Disturb Off',
    description: 'Verify your operating system is not blocking notifications with Windows Focus Assist, macOS Do Not Disturb, or Android/iOS Focus mode.',
  },
  {
    id: 'check-tab-pinned',
    title: 'Pin Tab or Install as App (PWA)',
    description: 'Pin the DayPilot browser tab or install it to your home screen so the operating system prioritizes background execution.',
  },
  {
    id: 'check-timezone',
    title: 'Verify Accurate Time Zone',
    description: 'Ensure your time zone in DayPilot Settings matches your computer/phone local clock so reminders trigger at the intended minute.',
  },
  {
    id: 'check-battery',
    title: 'Disable Battery Optimization for Browser',
    description: 'On mobile, set your browser app battery usage to "Unrestricted" so background tabs are not killed when your screen turns off.',
  },
];
