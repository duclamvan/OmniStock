import { useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

export function useOrderLocking(orderId: string | null) {
  useEffect(() => {
    if (!orderId) return;
    
    // Auto-heartbeat to keep lock alive every 10 minutes
    const interval = setInterval(async () => {
      try {
        await apiRequest(
          'POST',
          `/api/pick-pack/claim/${orderId}`,
          { refresh: true }
        );
        console.log(`Lock refreshed for order ${orderId}`);
      } catch (error) {
        console.error('Failed to refresh lock:', error);
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [orderId]);

  return {
    isLocked: !!orderId,
  };
}
