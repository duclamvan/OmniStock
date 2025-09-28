import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Clock, 
  Pause,
  Play,
  Search,
  User,
  ShoppingCart,
  Calendar,
  FileText,
  Trash2,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';
import type { HeldOrder, Employee } from '@shared/schema';
import { cn } from '@/lib/utils';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  type: 'product' | 'variant' | 'bundle';
}

interface OrderHoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'hold' | 'resume';
  cartItems?: CartItem[];
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  total?: number;
  currency: 'EUR' | 'CZK';
  customerId?: string;
  currentEmployee?: Employee;
  onHoldOrder?: (holdId: string) => void;
  onResumeOrder?: (heldOrder: HeldOrder) => void;
}

export function OrderHoldModal({
  isOpen,
  onClose,
  mode,
  cartItems = [],
  subtotal = 0,
  taxAmount = 0,
  discountAmount = 0,
  total = 0,
  currency,
  customerId,
  currentEmployee,
  onHoldOrder,
  onResumeOrder
}: OrderHoldModalProps) {
  const { toast } = useToast();
  const [holdReason, setHoldReason] = useState('');
  const [holdNotes, setHoldNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHeldOrder, setSelectedHeldOrder] = useState<HeldOrder | null>(null);

  // Get held orders
  const { data: heldOrders = [], isLoading } = useQuery<HeldOrder[]>({
    queryKey: ['/api/pos/held-orders'],
    enabled: isOpen && mode === 'resume',
  });

  // Hold order mutation
  const holdOrderMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/pos/hold-order', data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/pos/held-orders'] });
      toast({
        title: "Success",
        description: `Order held successfully. Hold ID: ${result.holdId}`,
      });
      if (onHoldOrder) {
        onHoldOrder(result.holdId);
      }
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to hold order",
        variant: "destructive",
      });
    },
  });

  // Resume order mutation
  const resumeOrderMutation = useMutation({
    mutationFn: (holdId: string) => apiRequest('POST', `/api/pos/resume-order/${holdId}`, {
      resumedBy: currentEmployee?.id
    }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/pos/held-orders'] });
      toast({
        title: "Success",
        description: "Order resumed successfully",
      });
      if (onResumeOrder && selectedHeldOrder) {
        onResumeOrder({
          ...selectedHeldOrder,
          status: 'resumed',
          resumedAt: new Date().toISOString(),
          resumedBy: currentEmployee?.id
        });
      }
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resume order",
        variant: "destructive",
      });
    },
  });

  // Delete held order mutation
  const deleteHeldOrderMutation = useMutation({
    mutationFn: (holdId: string) => apiRequest('DELETE', `/api/pos/held-orders/${holdId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pos/held-orders'] });
      setSelectedHeldOrder(null);
      toast({
        title: "Success",
        description: "Held order deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete held order",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return `${currency} ${amount.toFixed(2)}`;
  };

  const resetForm = () => {
    setHoldReason('');
    setHoldNotes('');
    setSearchQuery('');
    setSelectedHeldOrder(null);
  };

  const handleHoldOrder = () => {
    if (!holdReason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a reason for holding the order",
        variant: "destructive",
      });
      return;
    }

    const holdData = {
      customerId,
      employeeId: currentEmployee?.id,
      items: cartItems,
      subtotal,
      taxAmount,
      discountAmount,
      total,
      currency,
      reason: holdReason,
      notes: holdNotes
    };

    holdOrderMutation.mutate(holdData);
  };

  const handleResumeOrder = () => {
    if (!selectedHeldOrder) {
      toast({
        title: "No Order Selected",
        description: "Please select an order to resume",
        variant: "destructive",
      });
      return;
    }

    resumeOrderMutation.mutate(selectedHeldOrder.holdId);
  };

  const handleDeleteHeldOrder = () => {
    if (!selectedHeldOrder) return;
    
    if (confirm('Are you sure you want to delete this held order? This action cannot be undone.')) {
      deleteHeldOrderMutation.mutate(selectedHeldOrder.holdId);
    }
  };

  const filteredHeldOrders = heldOrders.filter(order => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      order.holdId.toLowerCase().includes(searchLower) ||
      order.reason?.toLowerCase().includes(searchLower) ||
      order.notes?.toLowerCase().includes(searchLower)
    );
  });

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'hold' ? (
              <>
                <Pause className="h-5 w-5" />
                Hold Order
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Resume Order
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {mode === 'hold' ? (
          /* Hold Order Mode */
          <div className="space-y-6">
            {/* Current Order Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Current Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium">{cartItems.length}</div>
                    <div className="text-slate-500">Items</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{formatCurrency(subtotal)}</div>
                    <div className="text-slate-500">Subtotal</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{formatCurrency(discountAmount)}</div>
                    <div className="text-slate-500">Discount</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{formatCurrency(total)}</div>
                    <div className="text-slate-500">Total</div>
                  </div>
                </div>

                {cartItems.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Items in Cart</h4>
                    <ScrollArea className="h-32">
                      <div className="space-y-2">
                        {cartItems.map((item) => (
                          <div 
                            key={item.id}
                            className="flex items-center justify-between text-sm p-2 bg-slate-50 dark:bg-slate-800 rounded"
                          >
                            <div>
                              <span className="font-medium">{item.name}</span>
                              <span className="text-slate-500 ml-2">×{item.quantity}</span>
                            </div>
                            <div className="font-medium">
                              {formatCurrency(item.price * item.quantity)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hold Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hold-reason">Reason for Hold *</Label>
                <Input
                  id="hold-reason"
                  type="text"
                  placeholder="e.g., Customer needs time to decide, Payment issue"
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  data-testid="input-hold-reason"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hold-notes">Additional Notes</Label>
                <Textarea
                  id="hold-notes"
                  placeholder="Any additional information..."
                  value={holdNotes}
                  onChange={(e) => setHoldNotes(e.target.value)}
                  rows={3}
                  data-testid="textarea-hold-notes"
                />
              </div>
            </div>
          </div>
        ) : (
          /* Resume Order Mode */
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by Hold ID, reason, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-held-orders"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[400px]">
              {/* Held Orders List */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm">Held Orders ({filteredHeldOrders.length})</h3>
                {isLoading ? (
                  <div className="flex items-center justify-center h-32 text-slate-500">
                    Loading held orders...
                  </div>
                ) : filteredHeldOrders.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-slate-500">
                    No held orders found
                  </div>
                ) : (
                  <ScrollArea className="h-[350px]">
                    <div className="space-y-3">
                      {filteredHeldOrders.map((order) => (
                        <Card 
                          key={order.id}
                          className={cn(
                            "cursor-pointer transition-all duration-200 hover:shadow-md",
                            selectedHeldOrder?.id === order.id ? 
                              "ring-2 ring-blue-500 border-blue-200 dark:border-blue-800" : 
                              "hover:border-blue-200 dark:hover:border-blue-800"
                          )}
                          onClick={() => setSelectedHeldOrder(order)}
                          data-testid={`card-held-order-${order.holdId}`}
                        >
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-semibold text-sm">#{order.holdId}</h4>
                                  <p className="text-xs text-slate-500 mt-1">
                                    {order.reason}
                                  </p>
                                </div>
                                <Badge variant="outline">
                                  {order.status}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="text-center">
                                  <div className="font-medium">{formatCurrency(parseFloat(order.total))}</div>
                                  <div className="text-slate-500">Total</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium">
                                    {format(new Date(order.heldAt), 'MMM dd HH:mm')}
                                  </div>
                                  <div className="text-slate-500">Held</div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* Order Details */}
              {selectedHeldOrder && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm">Order Details</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDeleteHeldOrder}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      data-testid="button-delete-held-order"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Hold ID:</span>
                          <span className="font-mono font-medium">{selectedHeldOrder.holdId}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Status:</span>
                          <Badge variant="outline">{selectedHeldOrder.status}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Held At:</span>
                          <span>{format(new Date(selectedHeldOrder.heldAt), 'MMM dd, yyyy HH:mm')}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Total:</span>
                          <span className="font-medium">{formatCurrency(parseFloat(selectedHeldOrder.total))}</span>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Reason</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {selectedHeldOrder.reason}
                        </p>
                        {selectedHeldOrder.notes && (
                          <>
                            <h4 className="font-medium text-sm mt-3">Notes</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {selectedHeldOrder.notes}
                            </p>
                          </>
                        )}
                      </div>

                      <Separator />

                      {/* Items */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Items</h4>
                        <ScrollArea className="h-32">
                          <div className="space-y-2">
                            {Array.isArray(selectedHeldOrder.items) && selectedHeldOrder.items.map((item: any, index) => (
                              <div 
                                key={index}
                                className="flex items-center justify-between text-sm p-2 bg-slate-50 dark:bg-slate-800 rounded"
                              >
                                <div>
                                  <span className="font-medium">{item.name}</span>
                                  <span className="text-slate-500 ml-2">×{item.quantity}</span>
                                </div>
                                <div className="font-medium">
                                  {formatCurrency(item.price * item.quantity)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="button-cancel-hold-resume"
          >
            Cancel
          </Button>
          
          {mode === 'hold' ? (
            <Button
              onClick={handleHoldOrder}
              disabled={!holdReason.trim() || holdOrderMutation.isPending}
              className="flex items-center gap-2"
              data-testid="button-hold-order"
            >
              <Pause className="h-4 w-4" />
              {holdOrderMutation.isPending ? 'Holding...' : 'Hold Order'}
            </Button>
          ) : (
            <Button
              onClick={handleResumeOrder}
              disabled={!selectedHeldOrder || resumeOrderMutation.isPending}
              className="flex items-center gap-2"
              data-testid="button-resume-order"
            >
              <Play className="h-4 w-4" />
              {resumeOrderMutation.isPending ? 'Resuming...' : 'Resume Order'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default OrderHoldModal;