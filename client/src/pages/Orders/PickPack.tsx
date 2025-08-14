import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  Info,
  ArrowLeft,
  Home,
  Hash,
  Calendar,
  ChevronLeft,
  X,
  Plus,
  Minus,
  BarChart3,
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
  image?: string;
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
  const [selectedBatchOrders, setSelectedBatchOrders] = useState<string[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [currentEmployee] = useState('Employee #001');
  const [pickingTimer, setPickingTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setPickingTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Fetch real orders from the API
  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: ['/api/orders'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Mock location generator for demo
  const generateMockLocation = () => {
    const zones = ['A', 'B', 'C', 'D', 'E'];
    const zone = zones[Math.floor(Math.random() * zones.length)];
    const row = Math.floor(Math.random() * 20) + 1;
    const shelf = Math.floor(Math.random() * 5) + 1;
    return `${zone}${row}-${shelf}`;
  };

  // Mock barcode generator for demo
  const generateMockBarcode = (sku: string) => {
    return `BAR${sku}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  };

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

  // Play sound effect
  const playSound = (type: 'scan' | 'success' | 'error') => {
    if (!audioEnabled) return;
    
    // In a real app, you would play actual sound files
    const audio = new Audio();
    switch (type) {
      case 'scan':
        console.log('Playing scan sound');
        break;
      case 'success':
        console.log('Playing success sound');
        break;
      case 'error':
        console.log('Playing error sound');
        break;
    }
  };

  // Format timer
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start picking an order
  const startPicking = (order: PickPackOrder) => {
    const updatedOrder = {
      ...order,
      pickStatus: 'in_progress' as const,
      pickStartTime: new Date().toISOString(),
      pickedBy: currentEmployee
    };
    setActivePickingOrder(updatedOrder);
    setSelectedTab('picking');
    setPickingTimer(0);
    setIsTimerRunning(true);
    playSound('success');
    toast({
      title: "Picking Started",
      description: `Started picking order ${order.orderId}`,
    });
    // Focus barcode input
    setTimeout(() => barcodeInputRef.current?.focus(), 100);
  };

  // Update item picked quantity
  const updatePickedItem = (itemId: string, pickedQty: number) => {
    if (!activePickingOrder) return;

    const updatedItems = activePickingOrder.items.map(item =>
      item.id === itemId ? { ...item, pickedQuantity: pickedQty } : item
    );

    const updatedOrder = {
      ...activePickingOrder,
      items: updatedItems,
      pickedItems: updatedItems.reduce((sum, item) => sum + item.pickedQuantity, 0)
    };

    setActivePickingOrder(updatedOrder);

    // Check if all items are picked
    const allPicked = updatedItems.every(item => item.pickedQuantity >= item.quantity);
    if (allPicked) {
      playSound('success');
      toast({
        title: "All Items Picked!",
        description: "You can now complete the picking process",
      });
    }
  };

  // Complete picking
  const completePicking = () => {
    if (!activePickingOrder) return;

    const updatedOrder = {
      ...activePickingOrder,
      pickStatus: 'completed' as const,
      pickEndTime: new Date().toISOString(),
      status: 'packing' as const
    };

    setIsTimerRunning(false);
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    toast({
      title: "Picking Completed",
      description: `Order ${updatedOrder.orderId} is ready for packing`,
    });
    playSound('success');
    setActivePickingOrder(null);
    setSelectedTab('packing');
  };

  // Handle barcode scanning
  const handleBarcodeScan = () => {
    if (!barcodeInput || !activePickingOrder) return;

    const item = activePickingOrder.items.find(i => 
      i.barcode === barcodeInput || i.sku === barcodeInput
    );

    if (item) {
      const newQty = Math.min(item.pickedQuantity + 1, item.quantity);
      updatePickedItem(item.id, newQty);
      toast({
        title: "Item Scanned",
        description: `${item.productName} (${newQty}/${item.quantity})`,
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
    barcodeInputRef.current?.focus();
  };

  // Filter orders by status
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

  // Statistics
  const stats = {
    pending: getOrdersByStatus('pending').length,
    picking: getOrdersByStatus('picking').length,
    packing: getOrdersByStatus('packing').length,
    ready: getOrdersByStatus('ready').length,
    todayPicked: transformedOrders.filter(o => 
      o.pickEndTime && new Date(o.pickEndTime).toDateString() === new Date().toDateString()
    ).length,
    avgPickTime: '15:30' // Mock average
  };

  if (isLoading && transformedOrders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">No orders to pick</p>
        </div>
      </div>
    );
  }

  // Active Picking View - Full Screen
  if (activePickingOrder) {
    const progress = (activePickingOrder.pickedItems / activePickingOrder.totalItems) * 100;
    const currentItemIndex = activePickingOrder.items.findIndex(item => item.pickedQuantity < item.quantity);
    const currentItem = currentItemIndex >= 0 ? activePickingOrder.items[currentItemIndex] : null;

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setActivePickingOrder(null);
                    setIsTimerRunning(false);
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold">Order {activePickingOrder.orderId}</h1>
                    <Badge variant={getPriorityColor(activePickingOrder.priority)}>
                      {activePickingOrder.priority.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">{activePickingOrder.customerName}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-gray-400" />
                    <span className="font-mono text-lg font-bold">{formatTimer(pickingTimer)}</span>
                  </div>
                  <p className="text-xs text-gray-500">Elapsed Time</p>
                </div>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAudioEnabled(!audioEnabled)}
                >
                  <Volume2 className={`h-4 w-4 ${audioEnabled ? 'text-blue-600' : 'text-gray-400'}`} />
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                >
                  {isTimerRunning ? (
                    <PauseCircle className="h-4 w-4 text-orange-600" />
                  ) : (
                    <PlayCircle className="h-4 w-4 text-green-600" />
                  )}
                </Button>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span className="font-medium">{activePickingOrder.pickedItems}/{activePickingOrder.totalItems} items</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Left Panel - Current Item Focus */}
          <div className="flex-1 p-6">
            {currentItem ? (
              <div className="max-w-2xl mx-auto">
                <Card className="mb-6">
                  <CardHeader className="bg-blue-50 border-b">
                    <CardTitle className="flex items-center justify-between">
                      <span>Current Item to Pick</span>
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        Item {currentItemIndex + 1} of {activePickingOrder.items.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {/* Product Info */}
                      <div>
                        <h3 className="text-2xl font-bold mb-2">{currentItem.productName}</h3>
                        <div className="flex gap-4 text-sm text-gray-600">
                          <span>SKU: <span className="font-mono font-bold">{currentItem.sku}</span></span>
                          <span>Barcode: <span className="font-mono font-bold">{currentItem.barcode}</span></span>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="bg-blue-100 rounded-lg p-6 text-center">
                        <MapPin className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-sm text-blue-600 mb-1">Warehouse Location</p>
                        <p className="text-4xl font-bold font-mono text-blue-900">{currentItem.warehouseLocation}</p>
                      </div>

                      {/* Quantity Picker */}
                      <div className="bg-gray-50 rounded-lg p-6">
                        <p className="text-center text-sm text-gray-600 mb-4">Quantity to Pick</p>
                        <div className="flex items-center justify-center gap-4">
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={() => updatePickedItem(currentItem.id, Math.max(0, currentItem.pickedQuantity - 1))}
                            disabled={currentItem.pickedQuantity === 0}
                          >
                            <Minus className="h-6 w-6" />
                          </Button>
                          
                          <div className="text-center">
                            <div className="text-5xl font-bold">
                              {currentItem.pickedQuantity}
                              <span className="text-3xl text-gray-400">/{currentItem.quantity}</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">Picked</p>
                          </div>
                          
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={() => updatePickedItem(currentItem.id, Math.min(currentItem.quantity, currentItem.pickedQuantity + 1))}
                            disabled={currentItem.pickedQuantity >= currentItem.quantity}
                          >
                            <Plus className="h-6 w-6" />
                          </Button>
                        </div>
                        
                        {currentItem.pickedQuantity >= currentItem.quantity && (
                          <Alert className="mt-4 bg-green-50 border-green-200">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                              Item fully picked! Move to the next item.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>

                      {/* Quick Pick Button */}
                      {currentItem.pickedQuantity < currentItem.quantity && (
                        <Button 
                          size="lg" 
                          className="w-full"
                          onClick={() => updatePickedItem(currentItem.id, currentItem.quantity)}
                        >
                          <CheckCircle2 className="h-5 w-5 mr-2" />
                          Mark as Fully Picked
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Barcode Scanner */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <ScanLine className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                          ref={barcodeInputRef}
                          placeholder="Scan or enter barcode/SKU..."
                          value={barcodeInput}
                          onChange={(e) => setBarcodeInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleBarcodeScan()}
                          className="pl-10 text-lg"
                          autoFocus
                        />
                      </div>
                      <Button size="lg" onClick={handleBarcodeScan}>
                        Scan
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto">
                <Card>
                  <CardContent className="p-12 text-center">
                    <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">All Items Picked!</h2>
                    <p className="text-gray-600 mb-6">You have successfully picked all items for this order.</p>
                    <Button size="lg" onClick={completePicking}>
                      <PackageCheck className="h-5 w-5 mr-2" />
                      Complete Picking
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Right Panel - Items List */}
          <div className="w-96 bg-white border-l p-4 overflow-y-auto">
            <h3 className="font-semibold mb-4 flex items-center justify-between">
              <span>All Items</span>
              <Badge variant="outline">{activePickingOrder.pickedItems}/{activePickingOrder.totalItems}</Badge>
            </h3>
            <div className="space-y-2">
              {activePickingOrder.items.map((item, index) => {
                const isPicked = item.pickedQuantity >= item.quantity;
                const isCurrent = currentItem?.id === item.id;
                
                return (
                  <Card 
                    key={item.id} 
                    className={`cursor-pointer transition-all ${
                      isPicked ? 'bg-green-50 border-green-200' : 
                      isCurrent ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400' : ''
                    }`}
                    onClick={() => {
                      if (!isPicked) {
                        const itemIndex = activePickingOrder.items.findIndex(i => i.id === item.id);
                        if (itemIndex >= 0) {
                          // Scroll to this item
                          barcodeInputRef.current?.focus();
                        }
                      }
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {isPicked ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.productName}</p>
                          <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs font-mono bg-gray-100 px-1 rounded">
                              {item.warehouseLocation}
                            </span>
                            <span className="text-xs font-medium">
                              {item.pickedQuantity}/{item.quantity}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white border-t p-4">
          <div className="max-w-4xl mx-auto flex gap-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setActivePickingOrder(null);
                setIsTimerRunning(false);
              }}
            >
              <PauseCircle className="h-4 w-4 mr-2" />
              Pause Picking
            </Button>
            <Button
              className="flex-1"
              disabled={activePickingOrder.pickedItems < activePickingOrder.totalItems}
              onClick={completePicking}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complete Picking ({activePickingOrder.pickedItems}/{activePickingOrder.totalItems})
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard View
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Pick & Pack Center</h1>
              <p className="text-sm text-gray-500">Warehouse Operations Dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Logged in as</p>
                <p className="font-medium">{currentEmployee}</p>
              </div>
              <Button variant="outline" size="sm">
                <Home className="h-4 w-4 mr-2" />
                Main Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-6 gap-4">
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

      {/* Main Content */}
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

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" size="lg">
                    <PlayCircle className="h-5 w-5 mr-3" />
                    Start Next Priority Order
                  </Button>
                  <Button className="w-full justify-start" variant="outline" size="lg">
                    <Users className="h-5 w-5 mr-3" />
                    Batch Picking Mode
                  </Button>
                  <Button className="w-full justify-start" variant="outline" size="lg">
                    <Route className="h-5 w-5 mr-3" />
                    Optimize Pick Route
                  </Button>
                  <Button className="w-full justify-start" variant="outline" size="lg">
                    <BarChart3 className="h-5 w-5 mr-3" />
                    View Performance Stats
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Order #ORD-2025-001 completed by John</span>
                      <span className="text-gray-500 ml-auto">5m ago</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Package className="h-4 w-4 text-blue-600" />
                      <span>Order #ORD-2025-002 started picking</span>
                      <span className="text-gray-500 ml-auto">12m ago</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Truck className="h-4 w-4 text-purple-600" />
                      <span>5 orders shipped</span>
                      <span className="text-gray-500 ml-auto">1h ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pending Orders Tab */}
          <TabsContent value="pending" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Orders Ready to Pick</CardTitle>
                <CardDescription>Select an order to start the picking process</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getOrdersByStatus('pending').map(order => (
                    <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold">{order.orderId}</h3>
                              <Badge variant={getPriorityColor(order.priority)}>
                                {order.priority.toUpperCase()}
                              </Badge>
                              {order.priority === 'high' && (
                                <Zap className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                <span>{order.customerName}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Package className="h-4 w-4" />
                                <span>{order.totalItems} items</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Truck className="h-4 w-4" />
                                <span>{order.shippingMethod}</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            size="lg"
                            onClick={() => startPicking(order)}
                          >
                            <PlayCircle className="h-5 w-5 mr-2" />
                            Start Picking
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {getOrdersByStatus('pending').length === 0 && (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No pending orders to pick</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other tabs remain similar but simplified */}
          <TabsContent value="picking" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Orders Being Picked</CardTitle>
              </CardHeader>
              <CardContent>
                {getOrdersByStatus('picking').length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No orders currently being picked</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getOrdersByStatus('picking').map(order => (
                      <Card key={order.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">{order.orderId}</h3>
                              <p className="text-sm text-gray-600">Picked by: {order.pickedBy}</p>
                            </div>
                            <Button variant="outline">Resume Picking</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="packing" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Ready for Packing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Box className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Packing station functionality coming soon</p>
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
                <div className="text-center py-12">
                  <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No orders ready to ship</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}