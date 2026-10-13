import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { handleFirestoreError, OperationType } from './errorHandler';
import { UserProfile, UserSettings } from '../types';

export async function createUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  const path = `users/${uid}/profile/main`;
  try {
    const profileDoc: UserProfile = {
      uid,
      email: data.email || '',
      displayName: data.displayName || '',
      photoURL: data.photoURL || '',
      timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', uid, 'profile', 'main'), profileDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}/profile/main`;
  try {
    const snapshot = await getDoc(doc(db, 'users', uid, 'profile', 'main'));
    if (!snapshot.exists()) {
      return null;
    }
    return snapshot.data() as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  const path = `users/${uid}/profile/main`;
  try {
    await updateDoc(doc(db, 'users', uid, 'profile', 'main'), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function getUserSettings(uid: string): Promise<UserSettings | null> {
  const path = `users/${uid}/settings/main`;
  try {
    const snapshot = await getDoc(doc(db, 'users', uid, 'settings', 'main'));
    if (!snapshot.exists()) {
      return null;
    }
    return snapshot.data() as UserSettings;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveUserSettings(uid: string, settings: Partial<UserSettings>): Promise<void> {
  const path = `users/${uid}/settings/main`;
  try {
    const docRef = doc(db, 'users', uid, 'settings', 'main');
    await setDoc(
      docRef,
      {
        userId: uid,
        theme: settings.theme || 'light',
        soundEnabled: settings.soundEnabled ?? true,
        hapticFeedback: settings.hapticFeedback ?? true,
        defaultReminderOffset: settings.defaultReminderOffset ?? 10,
        weekStartsOn: settings.weekStartsOn ?? 1,
        timeFormat: settings.timeFormat ?? '12h',
        dateFormat: settings.dateFormat ?? 'YYYY-MM-DD',
        timezone: settings.timezone ?? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'),
        defaultSnoozeDuration: settings.defaultSnoozeDuration ?? 15,
        defaultReminders: settings.defaultReminders ?? [15],
        updatedAt: new Date().toISOString(),
        ...settings,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function exportUserData(uid: string): Promise<Record<string, unknown>> {
  try {
    const [profileSnap, settingsSnap, tasksSnap, habitsSnap, habitLogsSnap, categoriesSnap, templatesSnap] =
      await Promise.all([
        getDoc(doc(db, 'users', uid, 'profile', 'main')),
        getDoc(doc(db, 'users', uid, 'settings', 'main')),
        getDocs(collection(db, 'users', uid, 'tasks')),
        getDocs(collection(db, 'users', uid, 'habits')),
        getDocs(collection(db, 'users', uid, 'habitLogs')),
        getDocs(collection(db, 'users', uid, 'categories')),
        getDocs(collection(db, 'users', uid, 'userTemplates')),
      ]);

    const tasks = tasksSnap.docs.map(d => d.data());
    const habits = habitsSnap.docs.map(d => d.data());
    const habitLogs = habitLogsSnap.docs.map(d => d.data());
    const categories = categoriesSnap.docs.map(d => d.data());
    const userTemplates = templatesSnap.docs.map(d => d.data());

    return {
      appName: 'DayPilot',
      exportedAt: new Date().toISOString(),
      version: '1.0',
      userId: uid,
      profile: profileSnap.exists() ? profileSnap.data() : null,
      settings: settingsSnap.exists() ? settingsSnap.data() : null,
      counts: {
        tasks: tasks.length,
        habits: habits.length,
        habitLogs: habitLogs.length,
        categories: categories.length,
        userTemplates: userTemplates.length,
      },
      categories,
      tasks,
      habits,
      habitLogs,
      userTemplates,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}/export`);
    throw error;
  }
}

export async function deleteAllUserData(uid: string): Promise<void> {
  try {
    // Delete tasks
    const tasksSnap = await getDocs(collection(db, 'users', uid, 'tasks'));
    for (const d of tasksSnap.docs) {
      await deleteDoc(d.ref);
    }

    // Delete habits
    const habitsSnap = await getDocs(collection(db, 'users', uid, 'habits'));
    for (const d of habitsSnap.docs) {
      await deleteDoc(d.ref);
    }

    // Delete habit logs
    const habitLogsSnap = await getDocs(collection(db, 'users', uid, 'habitLogs'));
    for (const d of habitLogsSnap.docs) {
      await deleteDoc(d.ref);
    }

    // Delete categories
    const categoriesSnap = await getDocs(collection(db, 'users', uid, 'categories'));
    for (const d of categoriesSnap.docs) {
      await deleteDoc(d.ref);
    }

    // Delete user templates
    const templatesSnap = await getDocs(collection(db, 'users', uid, 'userTemplates'));
    for (const d of templatesSnap.docs) {
      await deleteDoc(d.ref);
    }

    // Delete settings & profile
    await deleteDoc(doc(db, 'users', uid, 'settings', 'main')).catch(() => {});
    await deleteDoc(doc(db, 'users', uid, 'profile', 'main')).catch(() => {});
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
    throw error;
  }
}

