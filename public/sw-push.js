/**
 * Push Notification Handler for Service Worker
 *
 * Handles incoming push events and notification click events.
 * Loaded via Workbox's `importScripts` in the service worker.
 */

// Handle incoming push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    // Fallback for plain text payloads
    payload = {
      title: 'BalkanEstateAI',
      body: event.data.text(),
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
    };
  }

  const { title, body, icon, badge, tag, data, requireInteraction } = payload;

  const options = {
    body: body || '',
    icon: icon || '/icons/icon-192x192.png',
    badge: badge || '/icons/icon-96x96.png',
    tag: tag || 'balkanestate-notification',
    data: data || {},
    requireInteraction: requireInteraction || false,
    vibrate: [100, 50, 100],
    actions: getActionsForType(data?.type),
  };

  event.waitUntil(
    self.registration.showNotification(title || 'BalkanEstateAI', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/';

  // Determine navigation URL based on notification type and action
  if (event.action === 'view') {
    targetUrl = data.actionUrl || '/';
  } else if (event.action === 'dismiss') {
    return; // Just close the notification
  } else {
    // Default click behavior - navigate to the relevant page
    targetUrl = data.actionUrl || '/';
  }

  // Ensure URL is absolute
  if (!targetUrl.startsWith('http')) {
    targetUrl = new URL(targetUrl, self.location.origin).href;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window/tab
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Try to find any existing window and navigate it
      for (const client of clientList) {
        if ('focus' in client && 'navigate' in client) {
          return client.navigate(targetUrl).then((c) => c?.focus());
        }
      }
      // Open a new window as last resort
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle notification close (for analytics)
self.addEventListener('notificationclose', (_event) => {
  // Could send analytics here if needed
});

/**
 * Get notification actions based on notification type.
 * Actions appear as buttons on the notification (desktop only, limited to 2).
 */
function getActionsForType(type) {
  switch (type) {
    case 'new_message':
    case 'new_inquiry':
      return [
        { action: 'view', title: 'Reply' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
    case 'new_viewing':
      return [
        { action: 'view', title: 'View Request' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
    case 'agency_join_request':
      return [
        { action: 'view', title: 'Review' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
    default:
      return [
        { action: 'view', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
  }
}
