/* DayPilot - Service Worker & Firebase Cloud Messaging (Web Push) */

const CACHE_NAME = 'daypilot-shell-v1';
const OFFLINE_URL = '/';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
];

// 1. Install Event: Cache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean up old caches & claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Offline shell caching (Network-First for navigation, Cache-First for static assets)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET and chrome-extension / firestore / googleapis requests
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Navigation requests: try network first, fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match('/index.html');
        return cachedResponse || cache.match(OFFLINE_URL);
      })
    );
    return;
  }

  // Static assets: cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          networkResponse.type !== 'basic'
        ) {
          return networkResponse;
        }
        // Cache newly fetched assets
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});

// 4. Web Push Notification Event (Firebase Cloud Messaging / Web Push)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (err) {
    payload = {
      notification: {
        title: 'DayPilot Reminder',
        body: event.data.text(),
      },
    };
  }

  const notificationData = payload.data || {};
  const notificationMeta = payload.notification || {};

  const title = notificationMeta.title || notificationData.title || 'DayPilot Reminder';
  const body = notificationMeta.body || notificationData.body || 'You have a scheduled reminder due.';
  const taskId = notificationData.taskId || '';
  const userId = notificationData.userId || '';
  const reminderLevel = notificationData.reminderLevel || 'normal';
  const defaultSnoozeDuration = parseInt(notificationData.defaultSnoozeDuration || '10', 10);
  const maxSnoozeCount = parseInt(notificationData.maxSnoozeCount || '3', 10);
  const actionUrl = notificationData.url || (taskId ? `/?task=${taskId}` : '/');

  const options = {
    body,
    icon: '/pwa-192x192.png',
    badge: '/icon.svg',
    tag: taskId ? `task-${taskId}` : 'daypilot-reminder',
    renotify: true,
    data: {
      taskId,
      userId,
      reminderLevel,
      defaultSnoozeDuration,
      maxSnoozeCount,
      url: actionUrl,
      timestamp: Date.now(),
    },
    requireInteraction: reminderLevel === 'persistent' || reminderLevel === 'important',
    vibrate: reminderLevel === 'persistent' ? [300, 100, 300, 100, 300] : [200, 100, 200],
    actions: [
      {
        action: 'done',
        title: '✓ Done',
      },
      {
        action: 'snooze',
        title: '⏱ Remind me later',
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 5. Notification Click Event: Handle "Done", "Remind me later", and tapping the card
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const taskId = data.taskId;
  const userId = data.userId;
  const action = event.action;

  // Case A: User clicked "Done" action button
  if (action === 'done') {
    event.waitUntil(
      (async () => {
        try {
          if (taskId && userId) {
            await fetch('/api/notifications/action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'done',
                taskId,
                userId,
              }),
            });
          }
        } catch (e) {
          console.warn('[SW] Error reporting Done action:', e);
        }
      })()
    );
    return;
  }

  // Case B: User clicked "Remind me later" action button
  if (action === 'snooze') {
    event.waitUntil(
      (async () => {
        try {
          if (taskId && userId) {
            await fetch('/api/notifications/action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'snooze',
                taskId,
                userId,
                snoozeMinutes: data.defaultSnoozeDuration || 10,
                maxSnoozeCount: data.maxSnoozeCount || 3,
              }),
            });
          }
        } catch (e) {
          console.warn('[SW] Error reporting Snooze action:', e);
        }
      })()
    );
    return;
  }

  // Case C: User tapped the notification body -> Open or Focus the app
  const targetUrl = new URL(data.url || (taskId ? `/?task=${taskId}` : '/'), self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and navigate
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );

  // Persistent level re-alerts: if task has reminderLevel === 'persistent' and was not dismissed/done
  if (data.reminderLevel === 'persistent' && action !== 'done' && action !== 'snooze') {
    const reAlertIntervalMs = 5 * 60 * 1000; // 5 minutes
    setTimeout(() => {
      self.registration.showNotification(event.notification.title, {
        ...event.notification,
        body: `[Persistent Reminder] ${event.notification.body}`,
        data,
      });
    }, reAlertIntervalMs);
  }
});
