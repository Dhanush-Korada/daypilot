/**
 * DayPilot - Cloud Functions for Scheduled Reminders and Real Web Push
 * 
 * Scheduled every minute:
 * - Finds due reminders across pending tasks
 * - Handles recurrence using the user's timezone
 * - Sends real Web Push via FCM with Action Buttons ("Done" & "Remind me later")
 * - Handles persistent re-alerts
 * - Writes detailed audit entries to notificationLog
 *
 * All private keys/service accounts remain in Google Cloud/Firebase backend environment only.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

/**
 * Format date time string in user's target timezone
 */
function formatTimeInTimezone(isoString, timezone = 'UTC') {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch (e) {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

/**
 * Calculate next recurrence date string (ISO)
 */
function calculateNextRecurrence(currentIsoString, recurrence, timezone = 'UTC') {
  if (!recurrence || !recurrence.frequency) return null;
  const current = new Date(currentIsoString || Date.now());
  const next = new Date(current);

  const interval = recurrence.interval || 1;
  switch (recurrence.frequency) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;
    case 'weekdays': {
      do {
        next.setDate(next.getDate() + 1);
      } while (next.getDay() === 0 || next.getDay() === 6);
      break;
    }
    case 'weekends': {
      do {
        next.setDate(next.getDate() + 1);
      } while (next.getDay() !== 0 && next.getDay() !== 6);
      break;
    }
    case 'weekly':
      next.setDate(next.getDate() + 7 * interval);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      break;
    default:
      next.setDate(next.getDate() + 1);
  }

  // Check end date
  if (recurrence.endDate && next.toISOString() > recurrence.endDate) {
    return null;
  }

  return next.toISOString();
}

/**
 * 1. Scheduled Cloud Function (runs every 1 minute)
 */
exports.scheduledReminderRunner = functions.pubsub
  .schedule('* * * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    const now = new Date();
    const nowMs = now.getTime();
    console.log(`[ScheduledReminder] Running due reminders check at ${now.toISOString()}`);

    // Query pending tasks using Collection Group
    let tasksSnap;
    try {
      tasksSnap = await db
        .collectionGroup('tasks')
        .where('status', '==', 'pending')
        .get();
    } catch (err) {
      console.error('[ScheduledReminder] CollectionGroup query failed:', err);
      return null;
    }

    if (tasksSnap.empty) {
      console.log('[ScheduledReminder] No pending tasks found.');
      return null;
    }

    const tasksToSend = [];

    for (const taskDoc of tasksSnap.docs) {
      const task = taskDoc.data();
      const taskId = taskDoc.id;
      const userId = task.userId;
      if (!userId) continue;

      // Extract task due time or snoozed time
      const targetTimeStr = task.snoozedUntil || task.dueAt;
      if (!targetTimeStr) continue;

      const targetTime = targetTimeStr.toDate ? targetTimeStr.toDate() : new Date(targetTimeStr);
      const targetMs = targetTime.getTime();

      // Check if reminder is due in the current 1-minute window (+/- 60s)
      const diffMs = nowMs - targetMs;
      const isDueNow = diffMs >= -30000 && diffMs <= 60000;

      // Check persistent reminder re-alert (if overdue and reminderLevel === 'persistent')
      const isPersistentOverdue =
        task.reminderLevel === 'persistent' &&
        diffMs > 60000 &&
        diffMs % (5 * 60 * 1000) <= 60000; // re-alert every 5 minutes

      if (isDueNow || isPersistentOverdue) {
        tasksToSend.push({
          taskId,
          userId,
          taskDocRef: taskDoc.ref,
          task,
          isPersistent: isPersistentOverdue,
          dueTime: targetTime,
        });
      }
    }

    console.log(`[ScheduledReminder] Found ${tasksToSend.length} tasks needing push reminders.`);

    // Send push notifications for each due task
    for (const item of tasksToSend) {
      const { taskId, userId, task, isPersistent, dueTime } = item;

      // Fetch user settings for timezone and default snooze
      let userTimezone = task.timezone || 'UTC';
      let defaultSnoozeDuration = 10;
      let maxSnoozeCount = 3;

      try {
        const settingsDoc = await db.doc(`users/${userId}/settings/main`).get();
        if (settingsDoc.exists) {
          const s = settingsDoc.data();
          if (s.timezone) userTimezone = s.timezone;
          if (s.defaultSnoozeDuration) defaultSnoozeDuration = s.defaultSnoozeDuration;
          if (s.maxSnoozeCount) maxSnoozeCount = s.maxSnoozeCount;
        }
      } catch (e) {
        console.warn(`[ScheduledReminder] Could not load settings for user ${userId}`);
      }

      // Fetch category name if available
      let categoryName = 'General';
      if (task.categoryId) {
        try {
          const catDoc = await db.doc(`users/${userId}/categories/${task.categoryId}`).get();
          if (catDoc.exists) {
            categoryName = catDoc.data().name || 'General';
          }
        } catch (e) {}
      }

      // Fetch user push tokens
      const tokensSnap = await db.collection(`users/${userId}/pushTokens`).get();
      if (tokensSnap.empty) {
        console.log(`[ScheduledReminder] User ${userId} has no registered push tokens.`);
        continue;
      }

      const tokens = tokensSnap.docs.map((d) => d.data().token).filter(Boolean);
      if (tokens.length === 0) continue;

      const formattedTime = formatTimeInTimezone(dueTime.toISOString(), userTimezone);
      const titlePrefix = isPersistent ? '⚠️ [Persistent Alert] ' : '';
      const notificationTitle = `${titlePrefix}${task.title}`;
      const notificationBody = `Due: ${formattedTime} • ${categoryName}${task.priority === 'high' ? ' • High Priority' : ''}`;

      const payload = {
        tokens,
        notification: {
          title: notificationTitle,
          body: notificationBody,
        },
        data: {
          taskId,
          userId,
          reminderLevel: task.reminderLevel || 'normal',
          defaultSnoozeDuration: String(defaultSnoozeDuration),
          maxSnoozeCount: String(maxSnoozeCount),
          url: `/?task=${taskId}`,
        },
        webpush: {
          notification: {
            title: notificationTitle,
            body: notificationBody,
            icon: '/pwa-192x192.png',
            badge: '/icon.svg',
            tag: `task-${taskId}`,
            renotify: true,
            requireInteraction: task.reminderLevel === 'persistent' || task.reminderLevel === 'important',
            actions: [
              { action: 'done', title: '✓ Done' },
              { action: 'snooze', title: '⏱ Remind me later' },
            ],
          },
          fcmOptions: {
            link: `/?task=${taskId}`,
          },
        },
      };

      try {
        const response = await admin.messaging().sendEachForMulticast(payload);
        console.log(`[ScheduledReminder] FCM sent for task ${taskId}: ${response.successCount} success, ${response.failureCount} failed`);

        // Clean up invalid/expired tokens
        if (response.failureCount > 0) {
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              const errCode = resp.error ? resp.error.code : '';
              if (
                errCode === 'messaging/invalid-registration-token' ||
                errCode === 'messaging/registration-token-not-registered'
              ) {
                tokensSnap.docs[idx].ref.delete().catch(() => {});
              }
            }
          });
        }

        // Write audit log entry
        await db.collection(`users/${userId}/notificationLog`).add({
          userId,
          taskId,
          message: `${notificationTitle}: ${notificationBody}`,
          status: response.successCount > 0 ? 'sent' : 'failed',
          sentAt: new Date().toISOString(),
        });
      } catch (fcmError) {
        console.error(`[ScheduledReminder] FCM multicast error for task ${taskId}:`, fcmError);
        await db.collection(`users/${userId}/notificationLog`).add({
          userId,
          taskId,
          message: `Failed sending push notification: ${fcmError.message}`,
          status: 'failed',
          sentAt: new Date().toISOString(),
        });
      }
    }

    return null;
  });

/**
 * 2. Handle Action Button Click from Service Worker ("Done" or "Remind me later")
 */
exports.handleNotificationAction = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { action, taskId, userId, snoozeMinutes, maxSnoozeCount } = req.body || {};

  if (!action || !taskId || !userId) {
    res.status(400).json({ error: 'Missing required parameters: action, taskId, userId' });
    return;
  }

  try {
    const taskRef = db.doc(`users/${userId}/tasks/${taskId}`);
    const taskSnap = await taskRef.get();

    if (!taskSnap.exists) {
      res.status(404).json({ error: `Task ${taskId} not found` });
      return;
    }

    const taskData = taskSnap.data();

    // CASE 1: Done
    if (action === 'done') {
      const nowIso = new Date().toISOString();
      await taskRef.update({
        status: 'completed',
        completedAt: nowIso,
        updatedAt: nowIso,
      });

      // Handle recurrence if configured
      if (taskData.recurrence && taskData.recurrence.frequency) {
        const nextDue = calculateNextRecurrence(taskData.dueAt, taskData.recurrence, taskData.timezone);
        if (nextDue) {
          await db.collection(`users/${userId}/tasks`).add({
            userId,
            title: taskData.title,
            description: taskData.description || '',
            categoryId: taskData.categoryId || '',
            dueAt: nextDue,
            timezone: taskData.timezone || 'UTC',
            priority: taskData.priority || 'medium',
            status: 'pending',
            recurrence: taskData.recurrence,
            reminderLevel: taskData.reminderLevel || 'normal',
            reminders: taskData.reminders || [0],
            snoozeCount: 0,
            snoozedUntil: null,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        }
      }

      await db.collection(`users/${userId}/notificationLog`).add({
        userId,
        taskId,
        message: `Task "${taskData.title}" marked completed via notification action button.`,
        status: 'sent',
        sentAt: nowIso,
      });

      res.status(200).json({ success: true, message: 'Task marked as completed' });
      return;
    }

    // CASE 2: Snooze ("Remind me later")
    if (action === 'snooze') {
      const maxCount = parseInt(maxSnoozeCount || '3', 10);
      const durationMins = parseInt(snoozeMinutes || '10', 10);
      const currentCount = parseInt(taskData.snoozeCount || '0', 10);

      if (currentCount >= maxCount) {
        await db.collection(`users/${userId}/notificationLog`).add({
          userId,
          taskId,
          message: `Task "${taskData.title}" could not be snoozed: reached max limit (${maxCount}).`,
          status: 'failed',
          sentAt: new Date().toISOString(),
        });
        res.status(400).json({
          success: false,
          error: `Max snooze limit (${maxCount}) reached for this task.`,
        });
        return;
      }

      const snoozedUntilDate = new Date(Date.now() + durationMins * 60 * 1000).toISOString();
      const nowIso = new Date().toISOString();

      await taskRef.update({
        snoozeCount: currentCount + 1,
        snoozedUntil: snoozedUntilDate,
        updatedAt: nowIso,
      });

      await db.collection(`users/${userId}/notificationLog`).add({
        userId,
        taskId,
        message: `Task "${taskData.title}" snoozed for ${durationMins}m (snooze ${currentCount + 1}/${maxCount}) via notification action button.`,
        status: 'sent',
        sentAt: nowIso,
      });

      res.status(200).json({
        success: true,
        message: `Task snoozed for ${durationMins} minutes (${currentCount + 1}/${maxCount})`,
        snoozedUntil: snoozedUntilDate,
      });
      return;
    }

    res.status(400).json({ error: `Unsupported action: ${action}` });
  } catch (err) {
    console.error('[NotificationAction] Error handling action:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

/**
 * 3. Send Test Notification (HTTPS Endpoint)
 */
exports.sendTestNotification = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const { userId } = req.body || {};
  if (!userId) {
    res.status(400).json({ error: 'Missing userId parameter' });
    return;
  }

  try {
    const tokensSnap = await db.collection(`users/${userId}/pushTokens`).get();
    if (tokensSnap.empty) {
      res.status(400).json({
        success: false,
        error: 'No registered push tokens found for this user. Please enable notifications in app first.',
      });
      return;
    }

    const tokens = tokensSnap.docs.map((d) => d.data().token).filter(Boolean);
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const payload = {
      tokens,
      notification: {
        title: 'DayPilot Real Test Notification',
        body: `Test notification sent from Cloud Functions at ${nowStr}. Real action buttons attached.`,
      },
      data: {
        taskId: 'sample-test-task',
        userId,
        reminderLevel: 'normal',
        url: '/?view=tasks',
      },
      webpush: {
        notification: {
          title: 'DayPilot Real Test Notification',
          body: `Test notification sent from Cloud Functions at ${nowStr}.`,
          icon: '/pwa-192x192.png',
          badge: '/icon.svg',
          actions: [
            { action: 'done', title: '✓ Done' },
            { action: 'snooze', title: '⏱ Remind me later' },
          ],
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(payload);

    await db.collection(`users/${userId}/notificationLog`).add({
      userId,
      message: `Real test notification triggered via Cloud Functions at ${nowStr}`,
      status: response.successCount > 0 ? 'sent' : 'failed',
      sentAt: new Date().toISOString(),
    });

    res.status(200).json({
      success: response.successCount > 0,
      sentCount: response.successCount,
      failedCount: response.failureCount,
      timestamp: nowStr,
    });
  } catch (err) {
    console.error('[SendTestNotification] Error:', err);
    res.status(500).json({ error: err.message || 'Internal Error' });
  }
});
