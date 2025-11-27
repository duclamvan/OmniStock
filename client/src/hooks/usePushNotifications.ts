import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type NotificationType = 'new_order' | 'low_stock' | 'task_assigned' | 'shipment_arrived';

interface PushSubscriptionData {
  id: number;
  userAgent: string | null;
  notificationTypes: NotificationType[];
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<PushSubscription | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(sub => {
          setCurrentSubscription(sub);
        });
      });
    }
  }, []);

  const { data: vapidKey } = useQuery<{ publicKey: string }>({
    queryKey: ['/api/push/vapid-public-key'],
    enabled: isSupported,
    staleTime: Infinity,
    retry: false,
  });

  const { data: subscriptions = [], refetch: refetchSubscriptions } = useQuery<PushSubscriptionData[]>({
    queryKey: ['/api/push/subscriptions'],
    enabled: isSupported,
  });

  const subscribeMutation = useMutation({
    mutationFn: async (notificationTypes: NotificationType[]) => {
      if (!vapidKey?.publicKey) {
        throw new Error('VAPID key not available');
      }

      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      
      if (permissionResult !== 'granted') {
        throw new Error('Notification permission denied');
      }

      const registration = await navigator.serviceWorker.ready;
      
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey.publicKey)
        });
      }

      setCurrentSubscription(subscription);

      const subscriptionJSON = subscription.toJSON();

      await apiRequest('POST', '/api/push/subscribe', {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscriptionJSON.keys?.p256dh,
          auth: subscriptionJSON.keys?.auth
        },
        userAgent: navigator.userAgent,
        notificationTypes
      });

      return subscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/push/subscriptions'] });
    }
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      if (!currentSubscription) {
        throw new Error('No active subscription');
      }

      await currentSubscription.unsubscribe();
      
      await apiRequest('POST', '/api/push/unsubscribe', {
        endpoint: currentSubscription.endpoint
      });

      setCurrentSubscription(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/push/subscriptions'] });
    }
  });

  const updateNotificationTypesMutation = useMutation({
    mutationFn: async ({ subscriptionId, notificationTypes }: { subscriptionId: number; notificationTypes: NotificationType[] }) => {
      await apiRequest('PATCH', `/api/push/subscriptions/${subscriptionId}/notification-types`, {
        notificationTypes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/push/subscriptions'] });
    }
  });

  const subscribe = useCallback(async (notificationTypes: NotificationType[] = ['new_order']) => {
    setIsSubscribing(true);
    try {
      await subscribeMutation.mutateAsync(notificationTypes);
    } finally {
      setIsSubscribing(false);
    }
  }, [subscribeMutation]);

  const unsubscribe = useCallback(async () => {
    await unsubscribeMutation.mutateAsync();
  }, [unsubscribeMutation]);

  const updateNotificationTypes = useCallback(async (subscriptionId: number, notificationTypes: NotificationType[]) => {
    await updateNotificationTypesMutation.mutateAsync({ subscriptionId, notificationTypes });
  }, [updateNotificationTypesMutation]);

  const isSubscribed = !!currentSubscription && subscriptions.some(s => s.isActive);

  return {
    isSupported,
    permission,
    isSubscribed,
    isSubscribing,
    currentSubscription,
    subscriptions,
    subscribe,
    unsubscribe,
    updateNotificationTypes,
    refetchSubscriptions,
    error: subscribeMutation.error || unsubscribeMutation.error
  };
}
