import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { handleFirestoreError, OperationType } from './errorHandler';
import { Task, TaskStatus } from '../types';

export async function createTask(uid: string, taskData: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Task> {
  const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const path = `users/${uid}/tasks/${taskId}`;
  try {
    const docRef = doc(db, 'users', uid, 'tasks', taskId);
    const newTask: Task = {
      id: taskId,
      userId: uid,
      title: taskData.title.trim(),
      description: taskData.description || '',
      categoryId: taskData.categoryId || '',
      dueAt: taskData.dueAt || null,
      timezone: taskData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      priority: taskData.priority || 'medium',
      status: taskData.status || 'pending',
      recurrence: taskData.recurrence || null,
      reminderLevel: taskData.reminderLevel || 'normal',
      reminders: taskData.reminders || [15],
      snoozeCount: taskData.snoozeCount || 0,
      snoozedUntil: taskData.snoozedUntil || null,
      completedAt: taskData.completedAt || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, newTask);
    return newTask;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getTasks(uid: string): Promise<Task[]> {
  const path = `users/${uid}/tasks`;
  try {
    const tasksRef = collection(db, 'users', uid, 'tasks');
    const q = query(tasksRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => docSnap.data() as Task);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateTask(uid: string, taskId: string, updates: Partial<Task>): Promise<void> {
  const path = `users/${uid}/tasks/${taskId}`;
  try {
    const docRef = doc(db, 'users', uid, 'tasks', taskId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleTaskCompletion(uid: string, task: Task): Promise<void> {
  const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
  const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;
  await updateTask(uid, task.id, {
    status: newStatus,
    completedAt,
  });
}

export async function snoozeTask(uid: string, task: Task, minutes: number = 15): Promise<void> {
  const now = new Date();
  const snoozeTime = new Date(now.getTime() + minutes * 60 * 1000).toISOString();
  await updateTask(uid, task.id, {
    snoozeCount: (task.snoozeCount || 0) + 1,
    snoozedUntil: snoozeTime,
  });
}

export async function postponeTaskToTomorrow(uid: string, task: Task): Promise<void> {
  let targetDate = new Date();
  if (task.dueAt) {
    const parsed = new Date(typeof task.dueAt === 'string' ? task.dueAt : (task.dueAt as any).toDate?.() || Date.now());
    targetDate = new Date(parsed.getTime() + 24 * 60 * 60 * 1000);
  } else {
    targetDate.setDate(targetDate.getDate() + 1);
    targetDate.setHours(9, 0, 0, 0);
  }
  await updateTask(uid, task.id, {
    dueAt: targetDate.toISOString(),
  });
}

export async function rescheduleTask(uid: string, taskId: string, newDueAt: string | null): Promise<void> {
  await updateTask(uid, taskId, {
    dueAt: newDueAt,
  });
}

export async function deleteTask(uid: string, taskId: string): Promise<void> {
  const path = `users/${uid}/tasks/${taskId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'tasks', taskId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
