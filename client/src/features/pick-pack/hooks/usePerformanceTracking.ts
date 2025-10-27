import { useQuery } from '@tanstack/react-query';
import type { PerformanceMetrics, LeaderboardEntry } from '../types';

export function usePerformanceTracking(period: '24h' | '7d' | '30d' = '24h') {
  const { data: metrics, isLoading: isLoadingMetrics } = useQuery<PerformanceMetrics>({
    queryKey: ['/api/pick-pack/metrics', period],
    refetchInterval: 60000, // Refetch every minute
  });

  const { data: leaderboard, isLoading: isLoadingLeaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/pick-pack/leaderboard', { period, type: 'picker' }],
    refetchInterval: 120000, // Refetch every 2 minutes
  });

  return {
    metrics,
    leaderboard,
    isLoading: isLoadingMetrics || isLoadingLeaderboard,
  };
}
