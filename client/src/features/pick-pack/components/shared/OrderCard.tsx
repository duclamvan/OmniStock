import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Clock, AlertTriangle } from 'lucide-react';
import type { QueuedOrder } from '../../types';

interface OrderCardProps {
  order: QueuedOrder;
  onClaim?: () => void;
  onViewDetails?: () => void;
  compact?: boolean;
}

export function OrderCard({ order, onClaim, onViewDetails, compact = false }: OrderCardProps) {
  const priorityColors = {
    rush: 'bg-red-500 hover:bg-red-600',
    high: 'bg-orange-500 hover:bg-orange-600',
    medium: 'bg-yellow-500 hover:bg-yellow-600',
    low: 'bg-green-500 hover:bg-green-600',
  };

  const priorityTextColors = {
    rush: 'text-red-700',
    high: 'text-orange-700',
    medium: 'text-yellow-700',
    low: 'text-green-700',
  };

  const isLocked = order.lockInfo.isLocked;

  return (
    <Card
      className={`${compact ? 'p-2' : 'p-4'} hover:shadow-lg transition-shadow`}
      data-testid={`card-order-${order.orderId}`}
    >
      <div className="flex flex-col gap-2">
        {/* Header with priority and rush flag */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge
              className={`${priorityColors[order.priority]} text-white`}
              data-testid={`badge-priority-${order.priority}`}
            >
              {order.priority.toUpperCase()}
            </Badge>
            {order.rushFlag && (
              <Badge variant="destructive" className="flex items-center gap-1" data-testid="badge-rush">
                <AlertTriangle className="h-3 w-3" />
                RUSH
              </Badge>
            )}
          </div>
          {isLocked && (
            <Badge variant="secondary" className="flex items-center gap-1" data-testid="badge-locked">
              <Clock className="h-3 w-3" />
              Locked
            </Badge>
          )}
        </div>

        {/* Order Details */}
        <div className={compact ? 'text-sm' : ''}>
          <div className="font-semibold" data-testid={`text-order-number-${order.orderId}`}>
            {order.order.orderNumber}
          </div>
          <div className="text-muted-foreground text-sm" data-testid={`text-customer-${order.orderId}`}>
            {order.order.customerName}
          </div>
        </div>

        {/* Status and Items */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            <span data-testid={`text-status-${order.orderId}`}>
              {order.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>

        {/* Notes */}
        {order.pickerNotes && !compact && (
          <div className="text-xs text-muted-foreground border-l-2 border-blue-500 pl-2" data-testid={`text-notes-${order.orderId}`}>
            Note: {order.pickerNotes}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-2">
          {!isLocked && onClaim && (
            <Button
              size={compact ? 'sm' : 'default'}
              onClick={onClaim}
              className="flex-1"
              data-testid={`button-claim-${order.orderId}`}
            >
              Claim Order
            </Button>
          )}
          {onViewDetails && (
            <Button
              variant="outline"
              size={compact ? 'sm' : 'default'}
              onClick={onViewDetails}
              className="flex-1"
              data-testid={`button-view-${order.orderId}`}
            >
              View Details
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
