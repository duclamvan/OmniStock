import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Layers } from 'lucide-react';
import { usePickPackQueue } from '../../hooks/usePickPackQueue';
import { useToast } from '@/hooks/use-toast';

export function WaveCreationDialog() {
  const { queue, batchClaimOrders, isBatchClaiming } = usePickPackQueue();
  const { toast } = useToast();
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [employeeName, setEmployeeName] = useState(
    () => localStorage.getItem('pick_pack_employee_name') || ''
  );
  const [isOpen, setIsOpen] = useState(false);

  const pendingOrders = queue?.pending || [];

  const handleCreateWave = () => {
    if (selectedOrders.length === 0 || !employeeName.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter your name and select at least one order',
        variant: 'destructive',
      });
      return;
    }

    batchClaimOrders(
      { orderIds: selectedOrders, employeeName: employeeName.trim() },
      {
        onSuccess: () => {
          toast({
            title: 'Wave Created',
            description: `Successfully claimed ${selectedOrders.length} orders for batch picking`,
          });
          setSelectedOrders([]);
          setIsOpen(false);
        },
        onError: (error: any) => {
          toast({
            title: 'Failed to Create Wave',
            description: error.message || 'Please try again',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleCheckOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, orderId]);
    } else {
      setSelectedOrders(selectedOrders.filter((id) => id !== orderId));
    }
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === pendingOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(pendingOrders.map((o) => o.orderId));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-create-wave">
          <Layers className="h-4 w-4 mr-2" />
          Create Pick Wave
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl" data-testid="dialog-wave-creation">
        <DialogHeader>
          <DialogTitle>Create Batch Pick Wave</DialogTitle>
          <DialogDescription>
            Select multiple orders to pick together for improved efficiency
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Employee Name Input */}
          <div className="space-y-2">
            <label htmlFor="wave-employee-name" className="text-sm font-medium">
              Your Name
            </label>
            <Input
              id="wave-employee-name"
              placeholder="Enter your name"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              data-testid="input-wave-employee-name"
            />
          </div>

          {/* Order Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Select Orders</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                data-testid="button-select-all"
              >
                {selectedOrders.length === pendingOrders.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <div className="border rounded-lg">
              <ScrollArea className="h-96">
                {pendingOrders.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    No pending orders available
                  </div>
                ) : (
                  <div className="divide-y">
                    {pendingOrders.map((order) => (
                      <div
                        key={order.id}
                        className="p-3 flex items-center gap-3 hover:bg-gray-50"
                        data-testid={`wave-order-${order.orderId}`}
                      >
                        <Checkbox
                          checked={selectedOrders.includes(order.orderId)}
                          onCheckedChange={(checked) =>
                            handleCheckOrder(order.orderId, !!checked)
                          }
                          data-testid={`checkbox-order-${order.orderId}`}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {order.order.orderNumber}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {order.order.customerName}
                          </div>
                        </div>
                        <Badge
                          className={
                            order.priority === 'rush'
                              ? 'bg-red-500'
                              : order.priority === 'high'
                              ? 'bg-orange-500'
                              : 'bg-green-500'
                          }
                        >
                          {order.priority.toUpperCase()}
                        </Badge>
                        {order.rushFlag && (
                          <Badge variant="destructive">RUSH</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Create Wave Button */}
          <Button
            onClick={handleCreateWave}
            disabled={selectedOrders.length === 0 || !employeeName.trim() || isBatchClaiming}
            className="w-full"
            data-testid="button-submit-wave"
          >
            {isBatchClaiming ? 'Creating Wave...' : `Create Wave (${selectedOrders.length} orders)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
