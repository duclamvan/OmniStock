import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/currencyUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  Printer, 
  CheckCircle, 
  Clock,
  MapPin,
  User,
  Truck,
  Search,
  ScanLine,
  Box,
  ClipboardList,
  AlertCircle,
  Timer,
  Route,
  Users,
  ChevronRight,
  Zap,
  FileText,
  PackageCheck,
  Navigation,
  PlayCircle,
  PauseCircle,
  ArrowRight,
  Volume2,
  CheckCircle2,
  Info
} from "lucide-react";

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  pickedQuantity: number;
  packedQuantity: number;
  warehouseLocation?: string;
  barcode?: string;
}

interface PickPackOrder {
  id: string;
  orderId: string;
  customerName: string;
  shippingMethod: string;
  shippingAddress?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'to_fulfill' | 'picking' | 'packing' | 'ready_to_ship' | 'shipped';
  pickStatus?: 'not_started' | 'in_progress' | 'completed';
  packStatus?: 'not_started' | 'in_progress' | 'completed';
  items: OrderItem[];
  totalItems: number;
  pickedItems: number;
  packedItems: number;
  createdAt: string;
  pickStartTime?: string;
  pickEndTime?: string;
  packStartTime?: string;
  packEndTime?: string;
  pickedBy?: string;
  packedBy?: string;
  notes?: string;
}

export default function PickPack() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<'pending' | 'picking' | 'packing' | 'ready'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<PickPackOrder | null>(null);
  const [pickingOrder, setPickingOrder] = useState<PickPackOrder | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showBatchPicking, setShowBatchPicking] = useState(false);
  const [selectedBatchOrders, setSelectedBatchOrders] = useState<string[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [currentEmployee] = useState('Employee #001'); // In real app, get from auth

  // Fetch real orders from the API
  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: ['/api/orders'],
  });

  // Transform real orders to PickPackOrder format
  const transformedOrders: PickPackOrder[] = allOrders.map((order: any) => ({
    id: order.id,
    orderId: order.orderId,
    customerName: order.customerName || 'Walk-in Customer',
    shippingMethod: order.shippingMethod || 'Standard',
    shippingAddress: order.shippingAddress,
    priority: order.priority || 'medium',
    status: order.orderStatus || 'pending',
    pickStatus: order.pickStatus || 'not_started',
    packStatus: order.packStatus || 'not_started',
    items: order.items?.map((item: any) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      pickedQuantity: item.pickedQuantity || 0,
      packedQuantity: item.packedQuantity || 0,
      warehouseLocation: item.warehouseLocation || generateMockLocation(),
      barcode: item.barcode || generateMockBarcode(item.sku)
    })) || [],
    totalItems: order.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
    pickedItems: order.items?.reduce((sum: number, item: any) => sum + (item.pickedQuantity || 0), 0) || 0,
    packedItems: order.items?.reduce((sum: number, item: any) => sum + (item.packedQuantity || 0), 0) || 0,
    createdAt: order.createdAt,
    pickStartTime: order.pickStartTime,
    pickEndTime: order.pickEndTime,
    packStartTime: order.packStartTime,
    packEndTime: order.packEndTime,
    pickedBy: order.pickedBy,
    packedBy: order.packedBy,
    notes: order.notes
  }));

  // Helper functions for mock data
  function generateMockLocation() {
    const zones = ['A', 'B', 'C', 'D'];
    const aisles = ['1', '2', '3', '4', '5'];
    const shelves = ['A', 'B', 'C', 'D', 'E'];
    const bins = ['1', '2', '3', '4'];
    return `${zones[Math.floor(Math.random() * zones.length)]}${aisles[Math.floor(Math.random() * aisles.length)]}-${shelves[Math.floor(Math.random() * shelves.length)]}${bins[Math.floor(Math.random() * bins.length)]}`;
  }

  function generateMockBarcode(sku: string) {
    return `${sku}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  // Play sound for feedback
  const playSound = (type: 'success' | 'error' | 'scan') => {
    if (!audioEnabled) return;
    // In real app, play actual sound files
    console.log(`Playing ${type} sound`);
  };

  // Start picking an order
  const startPickingMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const order = transformedOrders.find(o => o.id === orderId);
      if (!order) throw new Error('Order not found');
      
      // Update order status to picking
      return {
        ...order,
        pickStatus: 'in_progress' as const,
        pickStartTime: new Date().toISOString(),
        pickedBy: currentEmployee
      };
    },
    onSuccess: (updatedOrder) => {
      setPickingOrder(updatedOrder);
      toast({
        title: "Picking Started",
        description: `Started picking order ${updatedOrder.orderId}`,
      });
      playSound('success');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start picking",
        variant: "destructive",
      });
      playSound('error');
    }
  });

  // Update item picked quantity
  const updatePickedItem = (itemId: string, pickedQty: number) => {
    if (!pickingOrder) return;

    const updatedItems = pickingOrder.items.map(item =>
      item.id === itemId ? { ...item, pickedQuantity: pickedQty } : item
    );

    const updatedOrder = {
      ...pickingOrder,
      items: updatedItems,
      pickedItems: updatedItems.reduce((sum, item) => sum + item.pickedQuantity, 0)
    };

    setPickingOrder(updatedOrder);

    // Check if all items are picked
    const allPicked = updatedItems.every(item => item.pickedQuantity >= item.quantity);
    if (allPicked) {
      completePickingMutation.mutate(updatedOrder);
    }
  };

  // Complete picking
  const completePickingMutation = useMutation({
    mutationFn: async (order: PickPackOrder) => {
      return {
        ...order,
        pickStatus: 'completed' as const,
        pickEndTime: new Date().toISOString(),
        status: 'packing' as const
      };
    },
    onSuccess: (updatedOrder) => {
      setPickingOrder(null);
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Picking Completed",
        description: `Order ${updatedOrder.orderId} is ready for packing`,
      });
      playSound('success');
    }
  });

  // Handle barcode scanning
  const handleBarcodeScan = () => {
    if (!barcodeInput || !pickingOrder) return;

    const item = pickingOrder.items.find(i => 
      i.barcode === barcodeInput || i.sku === barcodeInput
    );

    if (item) {
      const newQty = Math.min(item.pickedQuantity + 1, item.quantity);
      updatePickedItem(item.id, newQty);
      toast({
        title: "Item Scanned",
        description: `${item.productName} (${item.pickedQuantity + 1}/${item.quantity})`,
      });
      playSound('scan');
    } else {
      toast({
        title: "Invalid Barcode",
        description: "Item not found in this order",
        variant: "destructive",
      });
      playSound('error');
    }
    setBarcodeInput('');
  };

  // Filter orders by pick/pack status
  const getOrdersByStatus = (status: string) => {
    return transformedOrders.filter(order => {
      if (status === 'pending') return order.pickStatus === 'not_started' && order.status !== 'shipped';
      if (status === 'picking') return order.pickStatus === 'in_progress';
      if (status === 'packing') return order.pickStatus === 'completed' && order.packStatus !== 'completed';
      if (status === 'ready') return order.packStatus === 'completed' && order.status !== 'shipped';
      return false;
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'not_started':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Completed</Badge>;
      default:
        return null;
    }
  };

  // Picking Dialog Component
  const PickingDialog = () => {
    if (!pickingOrder) return null;
    
    const progress = (pickingOrder.pickedItems / pickingOrder.totalItems) * 100;
    
    return (
      <Dialog open={!!pickingOrder} onOpenChange={() => setPickingOrder(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Picking Order {pickingOrder.orderId}</span>
              <div className="flex gap-2">
                <Badge variant={getPriorityColor(pickingOrder.priority)}>
                  {pickingOrder.priority.toUpperCase()}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAudioEnabled(!audioEnabled)}
                >
                  <Volume2 className={`h-4 w-4 ${audioEnabled ? 'text-blue-600' : 'text-gray-400'}`} />
                </Button>
              </div>
            </DialogTitle>
            <DialogDescription>
              {pickingOrder.customerName} • {pickingOrder.shippingMethod}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span className="font-medium">{pickingOrder.pickedItems}/{pickingOrder.totalItems} items</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
            
            {/* Barcode Scanner */}
            <div className="flex gap-2">
              <Input
                placeholder="Scan or enter barcode/SKU..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleBarcodeScan()}
                className="flex-1"
                autoFocus
              />
              <Button onClick={handleBarcodeScan}>
                <ScanLine className="h-4 w-4 mr-2" />
                Scan
              </Button>
            </div>
            
            <Separator />
            
            {/* Items List */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {pickingOrder.items.map((item) => {
                  const isPicked = item.pickedQuantity >= item.quantity;
                  return (
                    <Card key={item.id} className={isPicked ? 'bg-green-50 border-green-200' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={isPicked}
                                onCheckedChange={(checked) => {
                                  updatePickedItem(item.id, checked ? item.quantity : 0);
                                }}
                              />
                              <div>
                                <div className="font-medium">{item.productName}</div>
                                <div className="text-sm text-gray-500">
                                  SKU: {item.sku} • Barcode: {item.barcode}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className="flex items-center gap-1 text-blue-600">
                                <MapPin className="h-4 w-4" />
                                <span className="font-mono font-bold">{item.warehouseLocation}</span>
                              </div>
                              <div className="text-xs text-gray-500">Location</div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updatePickedItem(item.id, Math.max(0, item.pickedQuantity - 1))}
                                disabled={item.pickedQuantity === 0}
                              >
                                -
                              </Button>
                              <div className="text-center min-w-[60px]">
                                <div className="font-bold">{item.pickedQuantity}/{item.quantity}</div>
                                <div className="text-xs text-gray-500">Picked</div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updatePickedItem(item.id, Math.min(item.quantity, item.pickedQuantity + 1))}
                                disabled={item.pickedQuantity >= item.quantity}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickingOrder(null)}>
              <PauseCircle className="h-4 w-4 mr-2" />
              Pause Picking
            </Button>
            <Button 
              onClick={() => completePickingMutation.mutate(pickingOrder)}
              disabled={pickingOrder.pickedItems < pickingOrder.totalItems}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complete Picking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const OrderCard = ({ order }: { order: PickPackOrder }) => {
    const pickProgress = (order.pickedItems / order.totalItems) * 100;
    const packProgress = (order.packedItems / order.totalItems) * 100;
    
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{order.orderId}</CardTitle>
              <CardDescription className="mt-1">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-3 w-3" />
                  {order.customerName}
                </div>
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 items-end">
              {order.pickStatus && getStatusBadge(order.pickStatus)}
              <Badge variant={getPriorityColor(order.priority)} className="text-xs">
                {order.priority.toUpperCase()}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Truck className="h-4 w-4 text-gray-500" />
                <span>{order.shippingMethod}</span>
              </div>
              <div className="flex items-center gap-1">
                <Package className="h-4 w-4 text-gray-500" />
                <span>{order.totalItems} items</span>
              </div>
              {order.pickStartTime && (
                <div className="flex items-center gap-1">
                  <Timer className="h-4 w-4 text-gray-500" />
                  <span>{new Date(order.pickStartTime).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
            
            {/* Progress Bars */}
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Pick Progress</span>
                  <span>{order.pickedItems}/{order.totalItems}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${pickProgress}%` }}
                  />
                </div>
              </div>
              
              {order.pickStatus === 'completed' && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Pack Progress</span>
                    <span>{order.packedItems}/{order.totalItems}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${packProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              {order.pickStatus === 'not_started' && (
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => startPickingMutation.mutate(order.id)}
                >
                  <PlayCircle className="h-4 w-4 mr-1" />
                  Start Picking
                </Button>
              )}
              {order.pickStatus === 'in_progress' && (
                <Button 
                  size="sm" 
                  className="flex-1" 
                  variant="outline"
                  onClick={() => setPickingOrder(order)}
                >
                  <ScanLine className="h-4 w-4 mr-1" />
                  Continue Picking
                </Button>
              )}
              {order.pickStatus === 'completed' && order.packStatus !== 'completed' && (
                <Button size="sm" className="flex-1" variant="outline">
                  <Box className="h-4 w-4 mr-1" />
                  Start Packing
                </Button>
              )}
              {order.packStatus === 'completed' && (
                <Button size="sm" className="flex-1" variant="secondary">
                  <Printer className="h-4 w-4 mr-1" />
                  Print Label
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Package className="h-6 w-6 text-blue-600" />
                Pick & Pack
              </h1>
              <p className="text-sm text-slate-600 mt-1">Manage warehouse fulfillment operations</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{currentEmployee}</span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              <Button 
                onClick={() => setShowBatchPicking(true)}
                variant="outline"
              >
                <Users className="h-4 w-4 mr-2" />
                Batch Pick
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Button 
            variant="outline" 
            className="h-auto flex flex-col items-center py-4 hover:bg-blue-50 hover:border-blue-300"
            onClick={() => setSelectedTab('pending')}
          >
            <Zap className="h-8 w-8 mb-2 text-blue-600" />
            <span className="text-sm font-medium">Quick Pick</span>
            <span className="text-xs text-gray-500 mt-1">Start next order</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto flex flex-col items-center py-4 hover:bg-purple-50 hover:border-purple-300"
          >
            <Route className="h-8 w-8 mb-2 text-purple-600" />
            <span className="text-sm font-medium">Pick Route</span>
            <span className="text-xs text-gray-500 mt-1">Optimize path</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto flex flex-col items-center py-4 hover:bg-green-50 hover:border-green-300"
          >
            <FileText className="h-8 w-8 mb-2 text-green-600" />
            <span className="text-sm font-medium">Reports</span>
            <span className="text-xs text-gray-500 mt-1">View metrics</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto flex flex-col items-center py-4 hover:bg-orange-50 hover:border-orange-300"
          >
            <AlertCircle className="h-8 w-8 mb-2 text-orange-600" />
            <span className="text-sm font-medium">Issues</span>
            <span className="text-xs text-gray-500 mt-1">3 pending</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-2">
              <CardDescription>Pending Pick</CardDescription>
              <CardTitle className="text-3xl font-bold">{getOrdersByStatus('pending').length}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Clock className="h-5 w-5 text-yellow-500" />
                <span className="text-xs text-gray-500">Avg: 15 min</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardDescription>In Picking</CardDescription>
              <CardTitle className="text-3xl font-bold">{getOrdersByStatus('picking').length}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Package className="h-5 w-5 text-blue-500" />
                <span className="text-xs text-gray-500">2 employees</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardDescription>In Packing</CardDescription>
              <CardTitle className="text-3xl font-bold">{getOrdersByStatus('packing').length}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Box className="h-5 w-5 text-purple-500" />
                <span className="text-xs text-gray-500">1 station</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardDescription>Ready to Ship</CardDescription>
              <CardTitle className="text-3xl font-bold">{getOrdersByStatus('ready').length}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-xs text-gray-500">Next: 2PM</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Tabs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Orders Queue</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAudioEnabled(!audioEnabled)}
                >
                  <Volume2 className={`h-4 w-4 ${audioEnabled ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className="ml-2">Sound {audioEnabled ? 'On' : 'Off'}</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as any)}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="pending">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pending ({getOrdersByStatus('pending').length})
                  </div>
                </TabsTrigger>
                <TabsTrigger value="picking">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Picking ({getOrdersByStatus('picking').length})
                  </div>
                </TabsTrigger>
                <TabsTrigger value="packing">
                  <div className="flex items-center gap-2">
                    <Box className="h-4 w-4" />
                    Packing ({getOrdersByStatus('packing').length})
                  </div>
                </TabsTrigger>
                <TabsTrigger value="ready">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Ready ({getOrdersByStatus('ready').length})
                  </div>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="pending" className="mt-6">
                {getOrdersByStatus('pending').length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      No orders pending to pick. All caught up!
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {getOrdersByStatus('pending').map(order => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="picking" className="mt-6">
                {getOrdersByStatus('picking').length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      No orders currently being picked.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {getOrdersByStatus('picking').map(order => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="packing" className="mt-6">
                {getOrdersByStatus('packing').length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      No orders in packing station.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {getOrdersByStatus('packing').map(order => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="ready" className="mt-6">
                {getOrdersByStatus('ready').length === 0 ? (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      All orders have been shipped! Great work!
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {getOrdersByStatus('ready').map(order => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Picking Dialog */}
      <PickingDialog />
    </div>
  );
}