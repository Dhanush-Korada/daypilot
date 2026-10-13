import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  limit,
  getDoc,
} from 'firebase/firestore';
import { getMessaging, getToken, isSupported, type Messaging } from 'firebase/messaging';
import { db, app } from '../config/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { handleFirestoreError, OperationType } from './errorHandler';
import { NotificationLog, PushToken } from '../types';
import { updateTask } from './taskService';

let messagingInstance: Messaging | null = null;
let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Checks if Push and Service Worker are supported in the current environment
 */
export async function isPushNotificationSupported(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (!('serviceWorker' in navigator)) {
    return false;
  }
  try {
    const supported = await isSupported();
    return supported;
  } catch {
    return false;
  }
}

/**
 * Get current real browser Notification permission status
 */
export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Registers the primary Service Worker for offline shell and push notifications
 */
export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    if (!swRegistration) {
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
      });
      await navigator.serviceWorker.ready;
    }
    return swRegistration;
  } catch (err) {
    console.error('[PWA] Service worker registration failed:', err);
    return null;
  }
}

/**
 * Request real browser notification permission and retrieve the FCM token
 */
export async function requestPushPermissionAndToken(
  userId: string,
  vapidKey?: string
): Promise<{ token: string; permission: NotificationPermission }> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    throw new Error('Push notifications are not supported in this browser.');
  }

  // 1. Request real browser permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(`Notification permission was ${permission}. Please grant permission in your browser site settings.`);
  }

  // 2. Register service worker
  const reg = await registerPushServiceWorker();
  if (!reg) {
    throw new Error('Could not register service worker for push notifications.');
  }

  // 3. Initialize Firebase Messaging
  const supported = await isPushNotificationSupported();
  if (!supported) {
    throw new Error('Firebase Cloud Messaging is not supported on this browser or security context.');
  }

  if (!messagingInstance) {
    messagingInstance = getMessaging(app);
  }

  // Determine VAPID key: custom from param or env if set
  const activeVapidKey =
    vapidKey ||
    (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY ||
    undefined;

  let fcmToken = '';
  try {
    fcmToken = await getToken(messagingInstance, {
      vapidKey: activeVapidKey,
      serviceWorkerRegistration: reg,
    });
  } catch (error: any) {
    console.error('[FCM] Error obtaining web push token:', error);
    // Provide honest diagnostic message
    if (error?.code === 'messaging/invalid-vapid-key' || error?.message?.includes('vapidKey')) {
      throw new Error(
        'A Web Push Certificate (VAPID key) is required by Firebase Cloud Messaging. Please generate one in Firebase Console -> Project Settings -> Cloud Messaging -> Web configuration, and configure VITE_FIREBASE_VAPID_KEY.'
      );
    }
    throw new Error(error?.message || 'Failed to retrieve FCM push token from Firebase.');
  }

  if (!fcmToken) {
    throw new Error('No push registration token was returned by Firebase Messaging.');
  }

  // 4. Save token to Firestore users/{userId}/pushTokens
  const tokenId = 'web_primary';
  await savePushTokenToFirestore(userId, tokenId, fcmToken);

  return { token: fcmToken, permission };
}

/**
 * Saves FCM push token to Firestore under users/{userId}/pushTokens/{tokenId}
 */
export async function savePushTokenToFirestore(
  userId: string,
  tokenId: string,
  token: string
): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'pushTokens', tokenId);
    const tokenData: PushToken = {
      userId,
      token,
      device: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 100) : 'Web Client',
      createdAt: new Date().toISOString(),
    };
    await setDoc(docRef, tokenData, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/pushTokens/${tokenId}`);
  }
}

/**
 * Fetches all registered push tokens for the current user
 */
export async function getUserPushTokens(userId: string): Promise<PushToken[]> {
  try {
    const colRef = collection(db, 'users', userId, 'pushTokens');
    const snap = await getDocs(colRef);
    return snap.docs.map((d) => d.data() as PushToken);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `users/${userId}/pushTokens`);
    return [];
  }
}

/**
 * Removes a push token from Firestore
 */
export async function deletePushToken(userId: string, tokenId = 'web_primary'): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId, 'pushTokens', tokenId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${userId}/pushTokens/${tokenId}`);
  }
}

/**
 * Get recent notification logs for Notification Health audit
 */
export async function getNotificationLogs(
  userId: string,
  limitCount = 10
): Promise<NotificationLog[]> {
  try {
    const colRef = collection(db, 'users', userId, 'notificationLog');
    const q = query(colRef, limit(limitCount));
    const snap = await getDocs(q);
    const logs = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as NotificationLog[];

    // Sort descending by sentAt
    return logs.sort((a, b) => {
      const timeA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
      const timeB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
      return timeB - timeA;
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `users/${userId}/notificationLog`);
    return [];
  }
}

/**
 * Record a real notification log in Firestore
 */
export async function writeNotificationLog(
  userId: string,
  data: {
    message: string;
    status: 'sent' | 'failed' | 'dismissed';
    taskId?: string;
    habitId?: string;
  }
): Promise<NotificationLog> {
  const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const logEntry: NotificationLog = {
    id: logId,
    userId,
    taskId: data.taskId,
    habitId: data.habitId,
    message: data.message.slice(0, 490),
    status: data.status,
    sentAt: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, 'users', userId, 'notificationLog', logId);
    await setDoc(docRef, logEntry);
    return logEntry;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/notificationLog/${logId}`);
    return logEntry;
  }
}

/**
 * Real Test Notification trigger:
 * Verifies real permission and tokens, triggers a real push notification via the Service Worker,
 * and writes a real audit record to users/{userId}/notificationLog!
 */
export async function sendRealTestNotification(
  userId: string
): Promise<{ success: boolean; message: string; log?: NotificationLog }> {
  // Check permission
  const perm = getBrowserNotificationPermission();
  if (perm !== 'granted') {
    throw new Error(
      `Notification permission is "${perm}". Please click "Enable Push Notifications" above to allow browser notifications first.`
    );
  }

  // Check active service worker
  const reg = await registerPushServiceWorker();
  if (!reg) {
    throw new Error('Service worker is not active. Please ensure the app is running in a secure HTTPS or localhost context.');
  }

  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const testMessage = `Test Push Notification from DayPilot at ${timestamp}. Action buttons: Done and Remind me later are supported.`;

  // Display real notification through the Service Worker with actions
  await reg.showNotification('DayPilot Test Notification', {
    body: testMessage,
    icon: '/pwa-192x192.png',
    badge: '/icon.svg',
    tag: `daypilot-test-${Date.now()}`,
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      userId,
      taskId: 'test-task-sample',
      reminderLevel: 'normal',
      defaultSnoozeDuration: 10,
      maxSnoozeCount: 3,
      url: '/?view=tasks',
    },
    actions: [
      { action: 'done', title: '✓ Done' },
      { action: 'snooze', title: '⏱ Remind me later' },
    ],
  } as any);

  // Write genuine audit log to Firestore
  const log = await writeNotificationLog(userId, {
    message: testMessage,
    status: 'sent',
    taskId: 'test-task-sample',
  });

  return {
    success: true,
    message: `Test notification sent successfully at ${timestamp}.`,
    log,
  };
}

/**
 * Handles action from service worker ("Done" marks task complete, "Remind me later" snoozes)
 */
export async function handleTaskNotificationAction(
  action: 'done' | 'snooze',
  taskId: string,
  userId: string,
  options?: { snoozeMinutes?: number; maxSnoozeCount?: number }
): Promise<{ success: boolean; message: string }> {
  if (!taskId || !userId) {
    throw new Error('Missing taskId or userId for notification action.');
  }

  if (action === 'done') {
    await updateTask(userId, taskId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
    await writeNotificationLog(userId, {
      message: `Task ${taskId} marked as Done via push notification action`,
      status: 'sent',
      taskId,
    });
    return { success: true, message: 'Task marked as completed.' };
  }

  if (action === 'snooze') {
    const snoozeMinutes = options?.snoozeMinutes || 10;
    const maxSnoozeCount = options?.maxSnoozeCount || 3;

    // Fetch current task to verify snooze count
    const taskDocRef = doc(db, 'users', userId, 'tasks', taskId);
    const snap = await getDoc(taskDocRef);
    if (!snap.exists()) {
      throw new Error(`Task ${taskId} not found.`);
    }

    const taskData = snap.data();
    const currentCount = (taskData.snoozeCount as number) || 0;

    if (currentCount >= maxSnoozeCount) {
      await writeNotificationLog(userId, {
        message: `Task ${taskId} reached maximum snooze count (${maxSnoozeCount}). Cannot snooze further.`,
        status: 'failed',
        taskId,
      });
      return {
        success: false,
        message: `Maximum snooze limit (${maxSnoozeCount}) reached for this task.`,
      };
    }

    const snoozedUntilDate = new Date(Date.now() + snoozeMinutes * 60 * 1000).toISOString();
    await updateTask(userId, taskId, {
      snoozeCount: currentCount + 1,
      snoozedUntil: snoozedUntilDate,
    });

    await writeNotificationLog(userId, {
      message: `Task ${taskId} snoozed for ${snoozeMinutes}m (snooze ${currentCount + 1}/${maxSnoozeCount}) via notification action`,
      status: 'sent',
      taskId,
    });

    return {
      success: true,
      message: `Task snoozed for ${snoozeMinutes} minutes (${currentCount + 1}/${maxSnoozeCount}).`,
    };
  }

  throw new Error(`Unknown notification action: ${action}`);
}
