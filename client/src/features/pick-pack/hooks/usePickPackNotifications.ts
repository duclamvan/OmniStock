import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { PickPackQueue } from '../types';

export function usePickPackNotifications(queue: PickPackQueue | undefined) {
  const { toast } = useToast();
  const previousRushCount = useRef<number>(0);
  const previousExpiringCount = useRef<number>(0);

  useEffect(() => {
    if (!queue) return;

    // Combine all orders from all statuses
    const allOrders = [
      ...(queue.pending || []),
      ...(queue.picking || []),
      ...(queue.ready_to_pack || []),
      ...(queue.packing || []),
    ];

    // Notify about rush orders in pending status
    const rushOrders = (queue.pending || []).filter((o) => o.rushFlag);
    
    // Only show notification if rush orders count increased
    if (rushOrders.length > 0 && rushOrders.length > previousRushCount.current) {
      toast({
        title: '🚨 Rush Orders',
        description: `${rushOrders.length} urgent order${rushOrders.length > 1 ? 's' : ''} need${rushOrders.length === 1 ? 's' : ''} attention`,
        variant: 'destructive',
      });
    }
    
    // Update the count after comparison
    if (rushOrders.length !== previousRushCount.current) {
      previousRushCount.current = rushOrders.length;
    }

    // Notify about expiring locks
    const expiringLocks = allOrders.filter((o) => {
      if (!o.lockExpiresAt) return false;
      const timeLeft = new Date(o.lockExpiresAt).getTime() - Date.now();
      return timeLeft < 3 * 60 * 1000 && timeLeft > 0; // Less than 3 min
    });

    // Only show notification if expiring locks count increased
    if (expiringLocks.length > 0 && expiringLocks.length > previousExpiringCount.current) {
      toast({
        title: '⏰ Lock Expiring Soon',
        description: `${expiringLocks.length} order${expiringLocks.length > 1 ? 's' : ''} will be released soon`,
      });
    }
    
    // Update the count after comparison
    if (expiringLocks.length !== previousExpiringCount.current) {
      previousExpiringCount.current = expiringLocks.length;
    }

    // Reset counts when they go to zero
    if (rushOrders.length === 0) {
      previousRushCount.current = 0;
    }
    if (expiringLocks.length === 0) {
      previousExpiringCount.current = 0;
    }
  }, [queue, toast]);
}
