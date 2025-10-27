import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, AlertTriangle, Clock, Package } from 'lucide-react';
import { usePickPackQueue } from '../../hooks/usePickPackQueue';
import { useToast } from '@/hooks/use-toast';

export function StatusBoard() {
  const { queue, isLoading, claimOrder, isClaimingOrder } = usePickPackQueue();
  const { toast } = useToast();
  const [employeeName, setEmployeeName] = useState(
    () => localStorage.getItem('pick_pack_employee_name') || ''
  );

  const handleEmployeeNameChange = (name: string) => {
    setEmployeeName(name);
    localStorage.setItem('pick_pack_employee_name', name);
  };

  const handleClaimOrder = (orderId: string, role: 'picker' | 'packer') => {
    if (!employeeName.trim()) {
      toast({
        title: 'Employee Name Required',
        description: 'Please enter your name before claiming orders',
        variant: 'destructive',
      });
      return;
    }

    claimOrder({ orderId, role }, {
      onSuccess: () => {
        toast({
          title: 'Order Claimed',
          description: `Order has been assigned to ${employeeName}`,
        });
      },
      onError: (error: any) => {
        toast({
          title: 'Failed to Claim Order',
          description: error.message || 'Please try again',
          variant: 'destructive',
        });
      },
    });
  };

  const ordersByStatus = {
    pending: queue?.pending || [],
    picking: queue?.picking || [],
    ready_to_pack: queue?.ready_to_pack || [],
    packing: queue?.packing || [],
    complete: queue?.complete || [],
  };

  const columns = [
    { key: 'pending', title: 'Pending', role: 'picker' as const, color: 'bg-gray-100' },
    { key: 'picking', title: 'Picking', role: 'picker' as const, color: 'bg-blue-50' },
    { key: 'ready_to_pack', title: 'Ready to Pack', role: 'packer' as const, color: 'bg-yellow-50' },
    { key: 'packing', title: 'Packing', role: 'packer' as const, color: 'bg-orange-50' },
    { key: 'complete', title: 'Complete', role: null, color: 'bg-green-50' },
  ];

  const priorityColors = {
    rush: 'bg-red-500 text-white hover:bg-red-600',
    high: 'bg-orange-500 text-white hover:bg-orange-600',
    medium: 'bg-yellow-500 text-white hover:bg-yellow-600',
    low: 'bg-green-500 text-white hover:bg-green-600',
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {columns.map((col) => (
            <Skeleton key={col.key} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="status-board">
      {/* Employee Name Input */}
      <div className="flex items-center gap-4">
        <label htmlFor="employee-name" className="text-sm font-medium">
          Employee Name:
        </label>
        <Input
          id="employee-name"
          placeholder="Enter your name"
          value={employeeName}
          onChange={(e) => handleEmployeeNameChange(e.target.value)}
          className="max-w-xs"
          data-testid="input-employee-name"
        />
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto">
        <div className="inline-flex gap-4 min-w-full lg:grid lg:grid-cols-5">
          {columns.map((column) => {
            const orders = ordersByStatus[column.key as keyof typeof ordersByStatus];
            
            return (
              <Card
                key={column.key}
                className={`${column.color} min-w-[280px] lg:min-w-0`}
                data-testid={`card-column-${column.key}`}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{column.title}</span>
                    <Badge variant="secondary" data-testid={`badge-count-${column.key}`}>
                      {orders.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                      {orders.length === 0 ? (
                        <div className="text-center text-sm text-muted-foreground py-8">
                          No orders
                        </div>
                      ) : (
                        orders.map((order) => (
                          <Card
                            key={order.id}
                            className="p-3 hover:shadow-md transition-shadow bg-white"
                            data-testid={`card-order-${order.orderId}`}
                          >
                            {/* Priority and Rush Flag */}
                            <div className="flex items-center justify-between mb-2">
                              <Badge
                                className={priorityColors[order.priority]}
                                data-testid={`badge-priority-${order.priority}`}
                              >
                                {order.priority.toUpperCase()}
                              </Badge>
                              {order.rushFlag && (
                                <Badge
                                  variant="destructive"
                                  className="flex items-center gap-1"
                                  data-testid="badge-rush"
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  RUSH
                                </Badge>
                              )}
                            </div>

                            {/* Order Info */}
                            <div className="space-y-1 mb-2">
                              <div className="font-semibold text-sm" data-testid={`text-order-number-${order.orderId}`}>
                                {order.order.orderNumber}
                              </div>
                              <div className="text-xs text-muted-foreground" data-testid={`text-customer-${order.orderId}`}>
                                {order.order.customerName}
                              </div>
                            </div>

                            {/* Lock Status */}
                            {order.lockInfo.isLocked && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                                <Lock className="h-3 w-3" />
                                <span data-testid={`text-locked-by-${order.orderId}`}>
                                  {order.lockInfo.lockedBy}
                                </span>
                              </div>
                            )}

                            {/* Notes */}
                            {(order.pickerNotes || order.packerNotes) && (
                              <div className="text-xs text-blue-600 border-l-2 border-blue-500 pl-2 mb-2">
                                {order.pickerNotes || order.packerNotes}
                              </div>
                            )}

                            {/* Claim Button */}
                            {!order.lockInfo.isLocked && column.role && (
                              <Button
                                size="sm"
                                className="w-full"
                                onClick={() => handleClaimOrder(order.orderId, column.role!)}
                                disabled={isClaimingOrder || !employeeName.trim()}
                                data-testid={`button-claim-${order.orderId}`}
                              >
                                Claim Order
                              </Button>
                            )}
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
