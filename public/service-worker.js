const CACHE_NAME = 'moneywise-v1';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/login',
  '/signup',
  '/icons/icon-192x192.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API requests
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('nhost.run')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request).then((fetchResponse) => {
        // Cache new requests
        if (fetchResponse.ok && fetchResponse.url.startsWith(self.location.origin)) {
          const clone = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return fetchResponse;
      });
    }).catch(() => {
      // Return offline fallback for navigation requests
      if (event.request.mode === 'navigate') {
        return caches.match('/');
      }
    })
  );
});

// Background sync for offline transactions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'New notification from MoneyWise',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'moneywise-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('MoneyWise', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});

async function syncTransactions() {
  // Sync any pending transactions when back online
  const pending = await getPendingTransactions();
  for (const transaction of pending) {
    try {
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
      });
      await removePendingTransaction(transaction.id);
    } catch (error) {
      console.error('Failed to sync transaction:', error);
    }
  }
}

// IndexedDB helpers for offline storage
async function getPendingTransactions() {
  return new Promise((resolve) => {
    const request = indexedDB.open('MoneyWiseDB', 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingTransactions')) {
        db.createObjectStore('pendingTransactions', { keyPath: 'id' });
      }
    };
    request.onsuccess = (event) => {
      const db = event.target.result;
      const tx = db.transaction('pendingTransactions', 'readonly');
      const store = tx.objectStore('pendingTransactions');
      const getAll = store.getAll();
      getAll.onsuccess = () => resolve(getAll.result);
      getAll.onerror = () => resolve([]);
    };
    request.onerror = () => resolve([]);
  });
}

async function removePendingTransaction(id) {
  return new Promise((resolve) => {
    const request = indexedDB.open('MoneyWiseDB', 1);
    request.onsuccess = (event) => {
      const db = event.target.result;
      const tx = db.transaction('pendingTransactions', 'readwrite');
      const store = tx.objectStore('pendingTransactions');
      store.delete(id);
      tx.oncomplete = () => resolve();
    };
    request.onerror = () => resolve();
  });
}
