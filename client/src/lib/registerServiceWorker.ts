import { offlineQueue } from './offlineQueue';

export function registerServiceWorker() {
  // Only skip in Vite dev server (HMR mode with specific dev ports)
  // This allows service worker to work in production, preview, and staging builds
  const isViteDevServer = import.meta.env.DEV && (
    window.location.port === '5000' || 
    window.location.port === '5173' ||
    window.location.hostname.includes('-00-')  // Replit dev subdomain pattern
  );
  
  if (!('serviceWorker' in navigator)) {
    console.log('ℹ️ Service Workers not supported in this browser');
    return;
  }

  if (isViteDevServer) {
    console.log('ℹ️ Service Worker disabled in Vite dev server mode');
    // Still sync offline mutations without service worker
    setTimeout(() => {
      offlineQueue.syncPendingMutations();
    }, 2000);
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker registered successfully:', registration.scope);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🔄 New service worker available - ready to update');
              }
            });
          }
        });

        if ('sync' in registration && registration.sync) {
          (registration.sync as any).register('sync-offline-mutations').catch((err: any) => {
            console.log('Background Sync could not be registered:', err);
          });
        }

        setTimeout(() => {
          console.log('🔄 Checking for pending offline mutations...');
          offlineQueue.syncPendingMutations();
        }, 2000);
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
        // Still sync offline mutations even if service worker fails
        setTimeout(() => {
          offlineQueue.syncPendingMutations();
        }, 2000);
      });
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SYNC_MUTATIONS') {
      console.log('📨 Received sync request from service worker');
      offlineQueue.syncPendingMutations();
    }
  });
}
