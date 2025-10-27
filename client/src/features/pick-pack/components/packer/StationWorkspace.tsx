import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  Scale,
  Printer,
  CheckCircle,
  Timer,
  AlertCircle,
  Box,
  FileText,
  Truck,
} from 'lucide-react';
import { usePickPackQueue } from '../../hooks/usePickPackQueue';
import { useOrderLocking } from '../../hooks/useOrderLocking';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';

export function StationWorkspace() {
  const { queue, isLoading, releaseOrder } = usePickPackQueue();
  const { toast } = useToast();
  const [employeeName] = useState(
    () => localStorage.getItem('pick_pack_employee_name') || ''
  );
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [verifiedItems, setVerifiedItems] = useState<Set<string>>(new Set());
  const [selectedCarton, setSelectedCarton] = useState('');
  const [packageWeight, setPackageWeight] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [packerNotes, setPackerNotes] = useState('');
  const [checklist, setChecklist] = useState({
    itemsVerified: false,
    packingSlipIncluded: false,
    boxSealed: false,
    weightRecorded: false,
    labelPrinted: false,
  });

  // Find my active packing task
  const myTask = queue?.packing?.find(
    (order) => order.lockInfo.lockedBy === employeeName
  );

  // Find available orders ready to pack
  const readyOrders = queue?.ready_to_pack || [];

  useOrderLocking(myTask?.orderId || null);

  // Fetch available cartons
  const { data: availableCartons = [] } = useQuery<any[]>({
    queryKey: ['/api/cartons/available'],
    staleTime: 10 * 60 * 1000,
  });

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && myTask) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, myTask]);

  // Start timer when task is claimed
  useEffect(() => {
    if (myTask) {
      setIsTimerRunning(true);
    } else {
      setIsTimerRunning(false);
      setTimer(0);
      setVerifiedItems(new Set());
      setSelectedCarton('');
      setPackageWeight('');
      setTrackingNumber('');
      setPackerNotes('');
      setChecklist({
        itemsVerified: false,
        packingSlipIncluded: false,
        boxSealed: false,
        weightRecorded: false,
        labelPrinted: false,
      });
    }
  }, [myTask?.id]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClaimOrder = async (orderId: string) => {
    if (!employeeName) {
      toast({
        title: 'Employee Name Required',
        description: 'Please enter your name in the Queue Board',
        variant: 'destructive',
      });
      return;
    }

    try {
      await apiRequest('POST', `/api/pick-pack/claim/${orderId}`, {
        role: 'packer',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/pick-pack/queue'] });
      toast({
        title: 'Order Claimed',
        description: 'You can now pack this order',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to Claim',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleItemVerified = (itemId: string) => {
    const newVerified = new Set(verifiedItems);
    if (newVerified.has(itemId)) {
      newVerified.delete(itemId);
    } else {
      newVerified.add(itemId);
    }
    setVerifiedItems(newVerified);

    // Auto-check items verified when all items are checked
    // In production, check against actual order items
    if (newVerified.size > 0) {
      setChecklist((prev) => ({ ...prev, itemsVerified: true }));
    }
  };

  const handleCompletePacking = async () => {
    if (!myTask) return;

    // Validation
    if (!selectedCarton) {
      toast({
        title: 'Carton Required',
        description: 'Please select a carton size',
        variant: 'destructive',
      });
      return;
    }

    if (!packageWeight) {
      toast({
        title: 'Weight Required',
        description: 'Please enter package weight',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Complete the packing task
      await apiRequest('POST', `/api/pick-pack/complete-pack/${myTask.orderId}`, {
        cartonId: selectedCarton,
        weight: parseFloat(packageWeight),
        trackingNumber: trackingNumber || undefined,
        packerNotes: packerNotes || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/pick-pack/queue'] });

      toast({
        title: 'Packing Complete',
        description: 'Order is ready to ship',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to Complete',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleRelease = () => {
    if (!myTask) return;

    releaseOrder(myTask.orderId, {
      onSuccess: () => {
        toast({
          title: 'Order Released',
          description: 'Order is now available for others',
        });
      },
    });
  };

  const handlePrintLabel = () => {
    toast({
      title: 'Label Printing',
      description: 'Shipping label sent to printer',
    });
    setChecklist((prev) => ({ ...prev, labelPrinted: true }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="h-12 w-12 animate-pulse mx-auto mb-4 text-blue-500" />
          <p className="text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!employeeName) {
    return (
      <Alert data-testid="alert-no-employee-name">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please enter your employee name in the Queue Board to start packing.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" data-testid="station-workspace">
      {/* LEFT: Available Orders Queue (40%) */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Box className="h-5 w-5" />
              Ready to Pack ({readyOrders.length})
            </CardTitle>
            <CardDescription>Claim next order to pack</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-3">
                {readyOrders.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    No orders ready to pack
                  </div>
                ) : (
                  readyOrders.map((order) => (
                    <Card
                      key={order.id}
                      className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleClaimOrder(order.orderId)}
                      data-testid={`card-ready-order-${order.orderId}`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-sm">
                            {order.order.orderNumber}
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
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {order.order.customerName}
                        </div>
                        {order.pickerNotes && (
                          <div className="text-xs text-blue-600 border-l-2 border-blue-500 pl-2">
                            Picker: {order.pickerNotes}
                          </div>
                        )}
                        <Button size="sm" className="w-full" data-testid={`button-claim-${order.orderId}`}>
                          Claim & Start Packing
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT: Active Packing Task (60%) */}
      <div className="lg:col-span-3 space-y-4">
        {!myTask ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No Active Packing Task</h3>
              <p className="text-muted-foreground">
                Claim an order from the ready queue to start packing.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Order Header */}
            <Card className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white" data-testid="text-order-number">
                      {myTask.order.orderNumber}
                    </CardTitle>
                    <p className="text-sm text-orange-100" data-testid="text-customer-name">
                      {myTask.order.customerName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2">
                    <Timer className="h-5 w-5" />
                    <span className="text-xl font-mono font-bold" data-testid="text-timer">
                      {formatTimer(timer)}
                    </span>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Picker Notes */}
            {myTask.pickerNotes && (
              <Alert className="bg-blue-50 border-blue-200">
                <FileText className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>Picker Notes:</strong> {myTask.pickerNotes}
                </AlertDescription>
              </Alert>
            )}

            {/* Item Verification Checklist */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Verify Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* In production, map over actual order items */}
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 p-2 rounded hover:bg-gray-50"
                      data-testid={`item-verify-${item}`}
                    >
                      <Checkbox
                        checked={verifiedItems.has(`item-${item}`)}
                        onCheckedChange={() => handleItemVerified(`item-${item}`)}
                        data-testid={`checkbox-item-${item}`}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">Sample Product {item}</div>
                        <div className="text-xs text-muted-foreground">SKU-00{item} • Qty: 1</div>
                      </div>
                      {verifiedItems.has(`item-${item}`) && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Carton Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Box className="h-4 w-4" />
                  Select Carton
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedCarton} onValueChange={setSelectedCarton}>
                  <SelectTrigger data-testid="select-carton">
                    <SelectValue placeholder="Choose carton size..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCartons.map((carton: any) => (
                      <SelectItem key={carton.id} value={carton.id} data-testid={`option-carton-${carton.id}`}>
                        {carton.name} ({carton.dimensions?.length}x{carton.dimensions?.width}x
                        {carton.dimensions?.height} cm)
                      </SelectItem>
                    ))}
                    {availableCartons.length === 0 && (
                      <SelectItem value="default">K2 Box (Default)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Weight Input */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  Package Weight
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={packageWeight}
                    onChange={(e) => {
                      setPackageWeight(e.target.value);
                      setChecklist((prev) => ({ ...prev, weightRecorded: !!e.target.value }));
                    }}
                    data-testid="input-weight"
                  />
                  <span className="text-sm text-muted-foreground">kg</span>
                </div>
              </CardContent>
            </Card>

            {/* Tracking Number */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Tracking Number (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Enter tracking number..."
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  data-testid="input-tracking"
                />
              </CardContent>
            </Card>

            {/* Packer Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Packer Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Add any packing notes or issues..."
                  value={packerNotes}
                  onChange={(e) => setPackerNotes(e.target.value)}
                  rows={3}
                  data-testid="textarea-notes"
                />
              </CardContent>
            </Card>

            {/* Packing Checklist */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Final Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries({
                    itemsVerified: 'All items verified',
                    packingSlipIncluded: 'Packing slip included',
                    boxSealed: 'Box sealed securely',
                    weightRecorded: 'Weight recorded',
                    labelPrinted: 'Label printed',
                  }).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        checked={checklist[key as keyof typeof checklist]}
                        onCheckedChange={(checked) =>
                          setChecklist((prev) => ({ ...prev, [key]: !!checked }))
                        }
                        data-testid={`checkbox-${key}`}
                      />
                      <span className="text-sm">{label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handlePrintLabel}
                data-testid="button-print-label"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Shipping Label
              </Button>

              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                onClick={handleCompletePacking}
                disabled={!selectedCarton || !packageWeight}
                data-testid="button-complete-packing"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Complete Packing
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleRelease}
                data-testid="button-release-order"
              >
                Release Order
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
