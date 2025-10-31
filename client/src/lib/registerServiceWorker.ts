import { offlineQueue } from './offlineQueue';

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
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
        });
    });

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SYNC_MUTATIONS') {
        console.log('📨 Received sync request from service worker');
        offlineQueue.syncPendingMutations();
      }
    });
  }
}
