import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Clock, Package, Target } from 'lucide-react';
import { usePerformanceTracking } from '../../hooks/usePerformanceTracking';

export function PerformanceMetrics() {
  const { metrics, isLoading } = usePerformanceTracking('24h');

  if (isLoading) {
    return (
      <Card data-testid="card-performance-metrics">
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card data-testid="card-performance-metrics">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Performance Metrics
        </CardTitle>
        <CardDescription>
          Last 24 hours
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1" data-testid="metric-orders-completed">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>Orders</span>
            </div>
            <div className="text-2xl font-bold">{metrics?.ordersCompleted || 0}</div>
          </div>

          <div className="space-y-1" data-testid="metric-avg-pick-time">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Avg Pick</span>
            </div>
            <div className="text-2xl font-bold">{metrics?.avgPickTime || 0}m</div>
          </div>

          <div className="space-y-1" data-testid="metric-avg-pack-time">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Avg Pack</span>
            </div>
            <div className="text-2xl font-bold">{metrics?.avgPackTime || 0}m</div>
          </div>

          <div className="space-y-1" data-testid="metric-items-per-hour">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              <span>Items/Hour</span>
            </div>
            <div className="text-2xl font-bold">{metrics?.itemsPerHour || 0}</div>
          </div>
        </div>

        {metrics?.queueDepth && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm font-semibold mb-2">Queue Depth</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div data-testid="queue-pending">
                Pending: <span className="font-semibold">{metrics.queueDepth.pending}</span>
              </div>
              <div data-testid="queue-picking">
                Picking: <span className="font-semibold">{metrics.queueDepth.picking}</span>
              </div>
              <div data-testid="queue-ready-to-pack">
                Ready: <span className="font-semibold">{metrics.queueDepth.ready_to_pack}</span>
              </div>
              <div data-testid="queue-packing">
                Packing: <span className="font-semibold">{metrics.queueDepth.packing}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
