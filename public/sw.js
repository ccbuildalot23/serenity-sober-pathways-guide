
const CACHE_NAME = 'serenity-crisis-v2';
const CRISIS_CACHE = 'crisis-resources-v1';
const STATIC_CACHE = 'static-resources-v1';

// Critical crisis resources - MUST be available offline
const crisisResources = [
  '/crisis-help',
  '/crisis-help?discrete=true',
  // Crisis contact numbers stored as data URIs for offline access
  'data:application/json;base64,' + btoa(JSON.stringify({
    emergency: '911',
    suicide: '988', 
    crisis_text: '741741',
    veterans: '18002738255',
    message: 'You are not alone. Help is available 24/7.'
  }))
];

// Core app resources
const coreResources = [
  '/',
  '/login',
  '/auth',
  '/privacy',
  '/terms',
  '/manifest.json'
];

// Static assets (will be populated dynamically)
const staticResources = [];

// Install event - cache resources with priority for crisis features
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Priority 1: Crisis resources (MUST work offline)
      caches.open(CRISIS_CACHE).then(cache => {
        console.log('🚨 Caching critical crisis resources');
        return cache.addAll(crisisResources);
      }),
      // Priority 2: Core app resources
      caches.open(CACHE_NAME).then(cache => {
        console.log('📱 Caching core app resources');
        return cache.addAll(coreResources);
      }),
      // Priority 3: Static assets
      caches.open(STATIC_CACHE).then(cache => {
        console.log('🎨 Caching static assets');
        return cache.addAll(staticResources);
      })
    ]).then(() => {
      console.log('✅ Crisis-ready service worker installed');
      // Force activation immediately for crisis scenarios
      return self.skipWaiting();
    })
  );
});

// Fetch event - crisis-first caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Crisis resources - cache first, never fail
  if (url.pathname === '/crisis-help' || url.pathname.startsWith('/crisis-')) {
    event.respondWith(
      caches.match(event.request, { cacheName: CRISIS_CACHE })
        .then((response) => {
          if (response) {
            console.log('🚨 Serving crisis resource from cache');
            return response;
          }
          // If not cached, fetch and cache immediately
          return fetch(event.request)
            .then((fetchResponse) => {
              const responseClone = fetchResponse.clone();
              caches.open(CRISIS_CACHE)
                .then(cache => cache.put(event.request, responseClone));
              return fetchResponse;
            })
            .catch(() => {
              // Offline fallback - return basic crisis help
              return new Response(
                `<!DOCTYPE html><html><head><title>Crisis Help - Offline</title></head>
                <body style="font-family: sans-serif; padding: 20px; text-align: center;">
                  <h1>🚨 Crisis Help Available</h1>
                  <p style="font-size: 18px; margin: 20px 0;">You are not alone. Help is available 24/7.</p>
                  <div style="margin: 30px 0;">
                    <a href="tel:988" style="display: block; background: #dc2626; color: white; padding: 15px; text-decoration: none; border-radius: 8px; margin: 10px 0; font-size: 18px;">📞 Call 988 - Crisis Lifeline</a>
                    <a href="sms:741741&body=HELLO" style="display: block; background: #2563eb; color: white; padding: 15px; text-decoration: none; border-radius: 8px; margin: 10px 0; font-size: 18px;">💬 Text 741741 - Crisis Text Line</a>
                    <a href="tel:911" style="display: block; background: #dc2626; color: white; padding: 15px; text-decoration: none; border-radius: 8px; margin: 10px 0; font-size: 18px;">🚨 Call 911 - Emergency</a>
                  </div>
                  <p style="color: #666; font-style: italic;">This page works offline to ensure you always have access to help.</p>
                </body></html>`,
                {
                  headers: {
                    'Content-Type': 'text/html',
                    'Cache-Control': 'no-cache'
                  }
                }
              );
            });
        })
    );
    return;
  }
  
  // Regular resources - cache with fallback
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then((fetchResponse) => {
            // Cache successful responses
            if (fetchResponse.status === 200) {
              const responseClone = fetchResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseClone));
            }
            return fetchResponse;
          })
          .catch(() => {
            // Offline fallback for main app
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// Activate event - clean up old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (![CACHE_NAME, CRISIS_CACHE, STATIC_CACHE].includes(cacheName)) {
              console.log('🧹 Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control immediately for crisis scenarios
      self.clients.claim()
    ]).then(() => {
      console.log('✅ Crisis service worker activated and ready');
    })
  );
});

// Pre-cache crisis resources on message from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_CRISIS_RESOURCES') {
    event.waitUntil(
      caches.open(CRISIS_CACHE).then(cache => {
        console.log('🚨 Pre-caching additional crisis resources');
        return cache.addAll(event.data.resources || []);
      })
    );
  }
});

// Handle notification clicks - crisis-aware
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  // Crisis notifications - highest priority
  if (action === 'crisis_help' || data?.type === 'crisis') {
    event.waitUntil(
      clients.openWindow('/crisis-help')
    );
  } else if (action === 'call_crisis') {
    // Direct crisis call - no app needed
    // This will be handled by the system
  } else if (action === 'discrete_help') {
    event.waitUntil(
      clients.openWindow('/crisis-help?discrete=true')
    );
  } 
  // Standard recovery notifications
  else if (action === 'log_mood' || action === 'checkin') {
    event.waitUntil(
      clients.openWindow('/checkin')
    );
  } else if (action === 'call_support') {
    event.waitUntil(
      clients.openWindow('/peer-support')
    );
  } else if (action === 'reflect' || action === 'cbt_skills') {
    event.waitUntil(
      clients.openWindow('/motivation')
    );
  } else if (action === 'progress') {
    event.waitUntil(
      clients.openWindow('/progress')
    );
  } else if (action === 'snooze') {
    // Schedule notification for 1 hour later
    setTimeout(() => {
      self.registration.showNotification(event.notification.title, {
        body: event.notification.body,
        icon: event.notification.icon,
        tag: `snooze_${Date.now()}`,
        data: data,
        actions: event.notification.actions
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
    // Default click - open appropriate dashboard or crisis help if urgent
    const url = data?.urgent ? '/crisis-help' : '/';
    event.waitUntil(
      clients.openWindow(url)
    );
  }
});

// Handle notification close - track crisis notification dismissals
self.addEventListener('notificationclose', (event) => {
  const data = event.notification.data;
  
  // Log crisis notification dismissals for follow-up
  if (data?.type === 'crisis' || event.notification.tag?.includes('crisis')) {
    console.log('🚨 Crisis notification dismissed:', event.notification.tag);
    
    // Send message to main app for follow-up
    clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'CRISIS_NOTIFICATION_DISMISSED',
          tag: event.notification.tag,
          timestamp: Date.now(),
          data: data
        });
      });
    });
  } else {
    console.log('📱 Notification closed:', event.notification.tag);
  }
});
