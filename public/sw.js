
const CACHE_NAME = 'crisis-tools-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  // Handle different notification actions
  if (action === 'log_mood') {
    event.waitUntil(
      clients.openWindow('/#daily-checkin')
    );
  } else if (action === 'call_support') {
    event.waitUntil(
      clients.openWindow('/#support-network')
    );
  } else if (action === 'reflect') {
    event.waitUntil(
      clients.openWindow('/#cbt-skills')
    );
  } else if (action === 'snooze') {
    // Schedule notification for 1 hour later
    setTimeout(() => {
      self.registration.showNotification(event.notification.title, {
        body: event.notification.body,
        icon: event.notification.icon,
        tag: `snooze_${Date.now()}`,
        data: data
      });
    }, 60 * 60 * 1000); // 1 hour
  } else if (action === 'feedback') {
    // Send feedback message to main thread
    event.waitUntil(
      clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'NOTIFICATION_ACTION',
            action: 'feedback',
            data: data
          });
        });
      })
    );
  } else {
    // Default click - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
});
