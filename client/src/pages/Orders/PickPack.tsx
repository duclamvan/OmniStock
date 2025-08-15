import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
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
  Users,
  ChevronRight,
  Zap,
  PackageCheck,
  ArrowLeft,
  Home,
  TrendingUp
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
  const [selectedTab, setSelectedTab] = useState<'overview' | 'pending' | 'picking' | 'packing' | 'ready'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePickingOrder, setActivePickingOrder] = useState<PickPackOrder | null>(null);
  const [activePackingOrder, setActivePackingOrder] = useState<PickPackOrder | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [pickingTimer, setPickingTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [packingTimer, setPackingTimer] = useState(0);
  const [isPackingTimerRunning, setIsPackingTimerRunning] = useState(false);
  const [currentEmployee] = useState('Employee #001');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Timer effects
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setPickingTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPackingTimerRunning) {
      interval = setInterval(() => {
        setPackingTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPackingTimerRunning]);

  // Fetch real orders from the API
  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: ['/api/orders'],
    refetchInterval: 10000,
    staleTime: 5000,
  });

  // Transform real orders to PickPackOrder format
  const transformedOrders: PickPackOrder[] = useMemo(() => {
    // Ensure allOrders is an array
    const ordersArray = Array.isArray(allOrders) ? allOrders : [];
    return ordersArray
    .filter((order: any) => order.orderStatus === 'to_fulfill')
    .map((order: any) => ({
      id: order.id,
      orderId: order.orderId,
      customerName: order.customerName || 'Walk-in Customer',
      shippingMethod: order.shippingMethod || 'Standard',
      shippingAddress: order.shippingAddress,
      priority: order.priority || 'medium',
      status: order.orderStatus || 'to_fulfill',
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
        warehouseLocation: item.warehouseLocation || '',
        barcode: item.barcode || ''
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
  }, [allOrders]);

  // Format timer
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Mutation to update order status
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, pickStatus, packStatus, pickedBy, packedBy }: any) => {
      return apiRequest(`/api/orders/${orderId}/status`, 'PATCH', { 
        orderStatus: status, 
        pickStatus, 
        packStatus,
        pickedBy,
        packedBy
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    }
  });

  // Start picking an order
  const startPicking = async (order: PickPackOrder) => {
    await updateOrderStatusMutation.mutateAsync({
      orderId: order.id,
      status: 'to_fulfill',
      pickStatus: 'in_progress',
      pickedBy: currentEmployee
    });

    const updatedOrder = {
      ...order,
      status: 'to_fulfill' as const,
      pickStatus: 'in_progress' as const,
      pickStartTime: new Date().toISOString(),
      pickedBy: currentEmployee
    };
    setActivePickingOrder(updatedOrder);
    setSelectedTab('picking');
    setPickingTimer(0);
    setIsTimerRunning(true);
    toast({
      title: "Picking Started",
      description: `Started picking order ${order.orderId}`,
    });
  };

  // Complete picking
  const completePicking = async () => {
    if (!activePickingOrder) return;

    await updateOrderStatusMutation.mutateAsync({
      orderId: activePickingOrder.id,
      status: 'to_fulfill',
      pickStatus: 'completed',
      packStatus: 'not_started'
    });

    setIsTimerRunning(false);
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    toast({
      title: "Picking Completed",
      description: `Order ${activePickingOrder.orderId} is ready for packing`,
    });
    setActivePickingOrder(null);
    setSelectedTab('packing');
  };

  // Start packing an order
  const startPacking = async (order: PickPackOrder) => {
    await updateOrderStatusMutation.mutateAsync({
      orderId: order.id,
      status: 'to_fulfill',
      packStatus: 'in_progress',
      packedBy: currentEmployee
    });

    const updatedOrder = {
      ...order,
      packStatus: 'in_progress' as const,
      packStartTime: new Date().toISOString(),
      packedBy: currentEmployee
    };
    setActivePackingOrder(updatedOrder);
    setPackingTimer(0);
    setIsPackingTimerRunning(true);
    toast({
      title: "Packing Started",
      description: `Started packing order ${order.orderId}`,
    });
  };

  // Complete packing
  const completePacking = async () => {
    if (!activePackingOrder) return;

    await updateOrderStatusMutation.mutateAsync({
      orderId: activePackingOrder.id,
      status: 'shipped',
      packStatus: 'completed'
    });

    setIsPackingTimerRunning(false);
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    toast({
      title: "Packing Completed",
      description: `Order ${activePackingOrder.orderId} is ready to ship`,
    });
    setActivePackingOrder(null);
    setSelectedTab('ready');
  };

  // Filter orders by status
  const getOrdersByStatus = (status: string) => {
    return transformedOrders.filter(order => {
      if (status === 'pending') return order.status === 'to_fulfill' && order.pickStatus === 'not_started';
      if (status === 'picking') return order.pickStatus === 'in_progress';
      if (status === 'packing') return order.pickStatus === 'completed' && order.packStatus !== 'completed';
      if (status === 'ready') return order.packStatus === 'completed';
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

  // Statistics
  const stats = {
    pending: getOrdersByStatus('pending').length,
    picking: getOrdersByStatus('picking').length,
    packing: getOrdersByStatus('packing').length,
    ready: getOrdersByStatus('ready').length,
    todayPicked: transformedOrders.filter(o => 
      o.pickEndTime && new Date(o.pickEndTime).toDateString() === new Date().toDateString()
    ).length,
    avgPickTime: '15:30'
  };

  if (isLoading && transformedOrders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Loading orders...</p>
        </div>
      </div>
    );
  }

  // Active Picking View
  if (activePickingOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg sticky top-0 z-20">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 bg-white/20 hover:bg-white/30 text-white"
                onClick={() => {
                  setActivePickingOrder(null);
                  setIsTimerRunning(false);
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Exit
              </Button>
              
              <div className="text-center">
                <div className="text-lg font-bold">{activePickingOrder.orderId}</div>
                <Badge className="text-xs bg-blue-500 text-white">
                  PICKING MODE
                </Badge>
              </div>
              
              <div className="font-mono text-lg font-bold">{formatTimer(pickingTimer)}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activePickingOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">{item.productName}</p>
                      <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                      <p className="text-sm text-gray-500">Location: {item.warehouseLocation || 'Not assigned'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{item.pickedQuantity} / {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-4">
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={completePicking}
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Complete Picking
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Active Packing View
  if (activePackingOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex flex-col">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg sticky top-0 z-20">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 bg-white/20 hover:bg-white/30 text-white"
                onClick={() => {
                  setActivePackingOrder(null);
                  setIsPackingTimerRunning(false);
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Exit
              </Button>
              
              <div className="text-center">
                <div className="text-lg font-bold">{activePackingOrder.orderId}</div>
                <Badge className="text-xs bg-purple-500 text-white">
                  PACKING MODE
                </Badge>
              </div>
              
              <div className="font-mono text-lg font-bold">{formatTimer(packingTimer)}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Items to Pack</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activePackingOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-semibold">{item.productName}</p>
                      <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{item.quantity} items</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-4">
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={completePacking}
                >
                  <PackageCheck className="h-5 w-5 mr-2" />
                  Complete Packing
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main Dashboard View
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Pick & Pack Center</h1>
              <p className="text-sm text-gray-500">Warehouse Operations Dashboard</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Logged in as</p>
              <p className="font-medium">{currentEmployee}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Picking</p>
                  <p className="text-2xl font-bold">{stats.picking}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Packing</p>
                  <p className="text-2xl font-bold">{stats.packing}</p>
                </div>
                <Box className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Ready</p>
                  <p className="text-2xl font-bold">{stats.ready}</p>
                </div>
                <Truck className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Today Picked</p>
                  <p className="text-2xl font-bold">{stats.todayPicked}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-teal-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg Time</p>
                  <p className="text-2xl font-bold">{stats.avgPickTime}</p>
                </div>
                <Timer className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="px-6 pb-6">
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({stats.pending})
            </TabsTrigger>
            <TabsTrigger value="picking">
              Picking ({stats.picking})
            </TabsTrigger>
            <TabsTrigger value="packing">
              Packing ({stats.packing})
            </TabsTrigger>
            <TabsTrigger value="ready">
              Ready ({stats.ready})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => {
                      const pendingOrders = getOrdersByStatus('pending');
                      if (pendingOrders.length > 0) {
                        startPicking(pendingOrders[0]);
                      }
                    }}
                    disabled={stats.pending === 0}
                  >
                    <Zap className="h-5 w-5 mr-2" />
                    Start Next Pick
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => setSelectedTab('pending')}
                  >
                    <ClipboardList className="h-5 w-5 mr-2" />
                    View Pending Orders
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => window.print()}
                  >
                    <Printer className="h-5 w-5 mr-2" />
                    Print Pick List
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getOrdersByStatus('pending').map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-semibold">{order.orderId}</p>
                        <p className="text-sm text-gray-500">{order.customerName}</p>
                        <p className="text-sm text-gray-500">{order.totalItems} items</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getPriorityColor(order.priority)}>
                          {order.priority}
                        </Badge>
                        <Button onClick={() => startPicking(order)}>
                          Start Picking
                        </Button>
                      </div>
                    </div>
                  ))}
                  {getOrdersByStatus('pending').length === 0 && (
                    <p className="text-center text-gray-500 py-8">No pending orders</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="picking" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Orders Being Picked</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getOrdersByStatus('picking').map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-semibold">{order.orderId}</p>
                        <p className="text-sm text-gray-500">{order.customerName}</p>
                        <p className="text-sm text-gray-500">Picked by: {order.pickedBy}</p>
                      </div>
                      <Badge className="bg-blue-500 text-white">
                        In Progress
                      </Badge>
                    </div>
                  ))}
                  {getOrdersByStatus('picking').length === 0 && (
                    <p className="text-center text-gray-500 py-8">No orders being picked</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="packing" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Ready for Packing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getOrdersByStatus('packing').map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-semibold">{order.orderId}</p>
                        <p className="text-sm text-gray-500">{order.customerName}</p>
                        <p className="text-sm text-gray-500">{order.totalItems} items</p>
                      </div>
                      <Button onClick={() => startPacking(order)}>
                        Start Packing
                      </Button>
                    </div>
                  ))}
                  {getOrdersByStatus('packing').length === 0 && (
                    <p className="text-center text-gray-500 py-8">No orders ready for packing</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ready" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Ready to Ship</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getOrdersByStatus('ready').map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-semibold">{order.orderId}</p>
                        <p className="text-sm text-gray-500">{order.customerName}</p>
                        <p className="text-sm text-gray-500">Shipping: {order.shippingMethod}</p>
                      </div>
                      <Badge className="bg-green-500 text-white">
                        Ready to Ship
                      </Badge>
                    </div>
                  ))}
                  {getOrdersByStatus('ready').length === 0 && (
                    <p className="text-center text-gray-500 py-8">No orders ready to ship</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}