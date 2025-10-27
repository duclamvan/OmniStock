import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { PickPackQueue } from '../types';

export function usePickPackQueue() {
  const { data: queue, isLoading, error } = useQuery<PickPackQueue>({
    queryKey: ['/api/pick-pack/queue'],
    refetchInterval: 30000, // Poll every 30s
  });

  const claimMutation = useMutation({
    mutationFn: async ({ orderId, role }: { orderId: string; role: 'picker' | 'packer' }) => {
      const response = await apiRequest(
        'POST',
        `/api/pick-pack/claim/${orderId}`,
        { role }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pick-pack/queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pick-pack/my-tasks'] });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest(
        'POST',
        `/api/pick-pack/release/${orderId}`,
        {}
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pick-pack/queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pick-pack/my-tasks'] });
    },
  });

  const batchClaimMutation = useMutation({
    mutationFn: async ({ orderIds, employeeName }: { orderIds: string[]; employeeName: string }) => {
      const response = await apiRequest(
        'POST',
        '/api/pick-pack/batch-claim',
        { orderIds, employeeName }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pick-pack/queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pick-pack/my-tasks'] });
    },
  });

  const logEventMutation = useMutation({
    mutationFn: async ({ orderId, eventType, metadata }: { orderId: string; eventType: string; metadata?: Record<string, any> }) => {
      const response = await apiRequest(
        'POST',
        '/api/pick-pack/log-event',
        { orderId, eventType, metadata }
      );
      return response.json();
    },
  });

  return {
    queue,
    isLoading,
    error,
    claimOrder: claimMutation.mutate,
    isClaimingOrder: claimMutation.isPending,
    releaseOrder: releaseMutation.mutate,
    isReleasingOrder: releaseMutation.isPending,
    batchClaimOrders: batchClaimMutation.mutate,
    isBatchClaiming: batchClaimMutation.isPending,
    logEvent: logEventMutation.mutate,
  };
}
