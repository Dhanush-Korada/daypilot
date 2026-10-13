import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { handleFirestoreError, OperationType } from './errorHandler';
import { Habit, HabitLog } from '../types';

export async function createHabit(
  uid: string,
  habitData: Omit<Habit, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'streak' | 'bestStreak'>
): Promise<Habit> {
  const habitId = 'habit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const path = `users/${uid}/habits/${habitId}`;
  try {
    const docRef = doc(db, 'users', uid, 'habits', habitId);
    const newHabit: Habit = {
      id: habitId,
      userId: uid,
      title: habitData.title.trim(),
      description: habitData.description || '',
      categoryId: habitData.categoryId || '',
      frequency: habitData.frequency || 'daily',
      targetDaysPerWeek: habitData.targetDaysPerWeek || 7,
      reminderTime: habitData.reminderTime || '09:00',
      streak: 0,
      bestStreak: 0,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, newHabit);
    return newHabit;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getHabits(uid: string): Promise<Habit[]> {
  const path = `users/${uid}/habits`;
  try {
    const habitsRef = collection(db, 'users', uid, 'habits');
    const q = query(habitsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => docSnap.data() as Habit);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateHabit(uid: string, habitId: string, updates: Partial<Habit>): Promise<void> {
  const path = `users/${uid}/habits/${habitId}`;
  try {
    const docRef = doc(db, 'users', uid, 'habits', habitId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteHabit(uid: string, habitId: string): Promise<void> {
  const path = `users/${uid}/habits/${habitId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'habits', habitId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getHabitLogsForDate(uid: string, dateStr: string): Promise<Record<string, HabitLog>> {
  const path = `users/${uid}/habitLogs`;
  try {
    const logsRef = collection(db, 'users', uid, 'habitLogs');
    const q = query(logsRef, where('date', '==', dateStr));
    const snapshot = await getDocs(q);
    const map: Record<string, HabitLog> = {};
    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data() as HabitLog;
      map[data.habitId] = data;
    });
    return map;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function getAllHabitLogs(uid: string): Promise<HabitLog[]> {
  const path = `users/${uid}/habitLogs`;
  try {
    const logsRef = collection(db, 'users', uid, 'habitLogs');
    const snapshot = await getDocs(logsRef);
    return snapshot.docs.map(docSnap => docSnap.data() as HabitLog);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function computeHabitStreaks(habitId: string, allLogs: HabitLog[]): { currentStreak: number; bestStreak: number } {
  const completedDates = new Set(
    allLogs.filter(l => l.habitId === habitId && l.completed).map(l => l.date)
  );

  const sortedDates = Array.from(completedDates).sort();
  if (sortedDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  // Calculate Best Streak across all history
  let maxStreak = 0;
  let currentRun = 0;
  let prevDate: Date | null = null;

  for (const dStr of sortedDates) {
    const d = new Date(dStr + 'T00:00:00');
    if (prevDate) {
      const diffDays = Math.round((d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentRun++;
      } else if (diffDays > 1) {
        currentRun = 1;
      }
    } else {
      currentRun = 1;
    }
    if (currentRun > maxStreak) maxStreak = currentRun;
    prevDate = d;
  }

  // Calculate Current Streak (looking back from today or yesterday)
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let streak = 0;
  let checkDate = new Date(completedDates.has(todayStr) ? todayStr : yesterdayStr);

  if (completedDates.has(todayStr) || completedDates.has(yesterdayStr)) {
    while (true) {
      const dateKey = checkDate.toISOString().split('T')[0];
      if (completedDates.has(dateKey)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  return { currentStreak: streak, bestStreak: Math.max(maxStreak, streak) };
}

export async function toggleHabitLog(
  uid: string,
  habitId: string,
  dateStr: string,
  currentCompleted: boolean
): Promise<boolean> {
  const logId = `log_${habitId}_${dateStr}`;
  const path = `users/${uid}/habitLogs/${logId}`;
  try {
    const docRef = doc(db, 'users', uid, 'habitLogs', logId);
    const nextCompleted = !currentCompleted;
    const logData: HabitLog = {
      id: logId,
      habitId,
      userId: uid,
      date: dateStr,
      completed: nextCompleted,
      completedAt: nextCompleted ? new Date().toISOString() : '',
    };
    await setDoc(docRef, logData);
    return nextCompleted;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
