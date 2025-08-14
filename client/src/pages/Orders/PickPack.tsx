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

  // Mock product image generator for demo
  const generateMockImage = (productName: string) => {
    // Generate a placeholder image URL based on product name
    // In a real app, this would come from your database
    const seed = productName.toLowerCase().replace(/\s+/g, '-');
    return `https://picsum.photos/seed/${seed}/400/400`;
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
      barcode: item.barcode || generateMockBarcode(item.sku),
      image: item.image || generateMockImage(item.productName)
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg sticky top-0 z-10">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  onClick={() => {
                    setActivePickingOrder(null);
                    setIsTimerRunning(false);
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Exit
                </Button>
                <Separator orientation="vertical" className="h-6 bg-white/30" />
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold">Order {activePickingOrder.orderId}</h1>
                    <Badge 
                      className={`
                        ${activePickingOrder.priority === 'high' ? 'bg-red-500 text-white' : ''}
                        ${activePickingOrder.priority === 'medium' ? 'bg-amber-500 text-white' : ''}
                        ${activePickingOrder.priority === 'low' ? 'bg-green-500 text-white' : ''}
                      `}
                    >
                      {activePickingOrder.priority.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-blue-100">{activePickingOrder.customerName}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-blue-200" />
                    <span className="font-mono text-xl font-bold">{formatTimer(pickingTimer)}</span>
                  </div>
                  <p className="text-xs text-blue-100">Elapsed Time</p>
                </div>
                
                <Button
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  onClick={() => setAudioEnabled(!audioEnabled)}
                >
                  <Volume2 className={`h-4 w-4 ${audioEnabled ? 'text-yellow-300' : 'text-white/50'}`} />
                </Button>
                
                <Button
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                >
                  {isTimerRunning ? (
                    <PauseCircle className="h-4 w-4 text-orange-300" />
                  ) : (
                    <PlayCircle className="h-4 w-4 text-green-300" />
                  )}
                </Button>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-blue-100">Progress</span>
                <span className="font-medium text-white">{activePickingOrder.pickedItems}/{activePickingOrder.totalItems} items</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-emerald-400 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Left Panel - Current Item Focus */}
          <div className="flex-1 p-6">
            {currentItem ? (
              <div className="max-w-3xl mx-auto">
                <Card className="mb-6 shadow-xl border-0 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-xl flex items-center gap-2">
                        <Package className="h-6 w-6" />
                        Current Item to Pick
                      </span>
                      <Badge className="bg-white text-blue-600 text-lg px-4 py-1 font-bold">
                        {currentItemIndex + 1} / {activePickingOrder.items.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 bg-white">
                    <div className="space-y-8">
                      {/* Product Image and Info */}
                      <div className="flex gap-8">
                        {/* Product Image */}
                        <div className="relative">
                          <div className="w-56 h-56 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border-4 border-white">
                            {currentItem.image ? (
                              <img 
                                src={currentItem.image} 
                                alt={currentItem.productName}
                                className="w-full h-full object-contain rounded-xl p-2"
                              />
                            ) : (
                              <Package className="h-20 w-20 text-gray-300" />
                            )}
                          </div>
                          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg shadow-lg">
                            {currentItemIndex + 1}
                          </div>
                        </div>
                        
                        {/* Product Details */}
                        <div className="flex-1 space-y-4">
                          <h3 className="text-3xl font-bold text-gray-800">{currentItem.productName}</h3>
                          
                          <div className="space-y-3">
                            <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                              <Hash className="h-5 w-5 text-blue-500" />
                              <span className="text-gray-600 font-medium">SKU:</span>
                              <span className="font-mono font-bold text-xl text-gray-800">{currentItem.sku}</span>
                            </div>
                            
                            <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                              <ScanLine className="h-5 w-5 text-purple-500" />
                              <span className="text-gray-600 font-medium">Barcode:</span>
                              <span className="font-mono font-bold text-xl text-gray-800">{currentItem.barcode}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Location - Emphasized with Psychology */}
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-8 text-center shadow-lg">
                        <div className="bg-white rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center shadow-md">
                          <MapPin className="h-10 w-10 text-orange-500" />
                        </div>
                        <p className="text-sm font-semibold text-orange-700 mb-2 uppercase tracking-wide">Go to Location</p>
                        <p className="text-6xl font-black text-orange-600 font-mono tracking-wider">{currentItem.warehouseLocation}</p>
                        <p className="text-sm text-orange-600 mt-2">Navigate to this warehouse location</p>
                      </div>

                      {/* Quantity Picker - Action Area */}
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border-2 border-green-300">
                        <p className="text-center text-lg font-semibold text-green-800 mb-6">Pick Quantity</p>
                        <div className="flex items-center justify-center gap-6">
                          <Button
                            size="lg"
                            className="w-20 h-20 rounded-2xl bg-red-500 hover:bg-red-600 text-white shadow-lg"
                            onClick={() => updatePickedItem(currentItem.id, Math.max(0, currentItem.pickedQuantity - 1))}
                            disabled={currentItem.pickedQuantity === 0}
                          >
                            <Minus className="h-8 w-8" />
                          </Button>
                          
                          <div className="text-center bg-white rounded-2xl px-12 py-6 shadow-lg">
                            <div className="text-6xl font-black text-gray-800">
                              {currentItem.pickedQuantity}
                              <span className="text-4xl text-gray-400">/{currentItem.quantity}</span>
                            </div>
                            <p className="text-sm font-semibold text-gray-600 mt-2 uppercase tracking-wide">Items Picked</p>
                          </div>
                          
                          <Button
                            size="lg"
                            className="w-20 h-20 rounded-2xl bg-green-500 hover:bg-green-600 text-white shadow-lg"
                            onClick={() => updatePickedItem(currentItem.id, Math.min(currentItem.quantity, currentItem.pickedQuantity + 1))}
                            disabled={currentItem.pickedQuantity >= currentItem.quantity}
                          >
                            <Plus className="h-8 w-8" />
                          </Button>
                        </div>
                        
                        {currentItem.pickedQuantity >= currentItem.quantity && (
                          <Alert className="mt-6 bg-green-100 border-2 border-green-400 shadow-md">
                            <CheckCircle className="h-5 w-5 text-green-700" />
                            <AlertDescription className="text-green-800 font-semibold text-lg">
                              ✓ Item fully picked! Ready for next item.
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Quick Pick Button */}
                        {currentItem.pickedQuantity < currentItem.quantity && (
                          <Button 
                            size="lg" 
                            className="w-full mt-6 h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
                            onClick={() => updatePickedItem(currentItem.id, currentItem.quantity)}
                          >
                            <CheckCircle2 className="h-6 w-6 mr-3" />
                            Quick Pick All ({currentItem.quantity} items)
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Barcode Scanner */}
                <Card className="shadow-xl border-0 bg-gradient-to-r from-purple-500 to-indigo-500">
                  <CardContent className="p-6">
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <ScanLine className="absolute left-4 top-4 h-6 w-6 text-white/70" />
                        <Input
                          ref={barcodeInputRef}
                          placeholder="Scan or enter barcode/SKU..."
                          value={barcodeInput}
                          onChange={(e) => setBarcodeInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleBarcodeScan()}
                          className="pl-12 text-lg h-14 bg-white/95 border-white/30 placeholder:text-gray-500 font-mono"
                          autoFocus
                        />
                      </div>
                      <Button 
                        size="lg" 
                        onClick={handleBarcodeScan}
                        className="h-14 px-8 bg-white text-purple-600 hover:bg-gray-100 font-bold shadow-lg"
                      >
                        <ScanLine className="h-5 w-5 mr-2" />
                        SCAN
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto">
                <Card className="shadow-2xl border-0 overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2"></div>
                  <CardContent className="p-16 text-center">
                    <div className="bg-gradient-to-br from-green-400 to-emerald-400 rounded-full w-32 h-32 mx-auto mb-8 flex items-center justify-center shadow-xl animate-bounce">
                      <CheckCircle className="h-20 w-20 text-white" />
                    </div>
                    <h2 className="text-4xl font-black mb-4 text-gray-800">
                      🎉 All Items Picked!
                    </h2>
                    <p className="text-xl text-gray-600 mb-8">
                      Excellent work! You've successfully picked all {activePickingOrder.totalItems} items for order {activePickingOrder.orderId}
                    </p>
                    
                    <div className="bg-white rounded-xl p-6 mb-8 shadow-inner">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Time Taken</p>
                          <p className="text-2xl font-bold text-blue-600">{formatTimer(pickingTimer)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Items Picked</p>
                          <p className="text-2xl font-bold text-green-600">{activePickingOrder.totalItems}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Efficiency</p>
                          <p className="text-2xl font-bold text-purple-600">100%</p>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      size="lg" 
                      onClick={completePicking}
                      className="w-full h-16 text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-xl transform hover:scale-105 transition-all"
                    >
                      <PackageCheck className="h-7 w-7 mr-3" />
                      PROCEED TO PACKING
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Right Panel - Items List */}
          <div className="w-96 bg-gradient-to-b from-white to-gray-50 border-l-4 border-gray-200 p-6 overflow-y-auto">
            <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-xl p-4 mb-6 shadow-lg">
              <h3 className="font-bold text-lg mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Order Items
                </span>
                <Badge className="bg-white text-gray-800 font-bold px-3 py-1">
                  {activePickingOrder.pickedItems}/{activePickingOrder.totalItems}
                </Badge>
              </h3>
              <div className="text-sm text-gray-200">Track your picking progress</div>
            </div>
            
            <div className="space-y-3">
              {activePickingOrder.items.map((item, index) => {
                const isPicked = item.pickedQuantity >= item.quantity;
                const isCurrent = currentItem?.id === item.id;
                
                return (
                  <Card 
                    key={item.id} 
                    className={`cursor-pointer transition-all transform hover:scale-105 ${
                      isPicked ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 shadow-md' : 
                      isCurrent ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-500 shadow-xl ring-4 ring-blue-300' : 
                      'bg-white hover:shadow-lg border-2 border-gray-200'
                    }`}
                    onClick={() => {
                      if (!isPicked) {
                        barcodeInputRef.current?.focus();
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {isPicked ? (
                            <div className="bg-green-500 rounded-full p-1">
                              <CheckCircle className="h-6 w-6 text-white" />
                            </div>
                          ) : isCurrent ? (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold animate-pulse">
                              {index + 1}
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full border-3 border-gray-300 flex items-center justify-center text-sm font-bold text-gray-600">
                              {index + 1}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm truncate ${
                            isPicked ? 'text-green-700 line-through' : 
                            isCurrent ? 'text-blue-700' : 'text-gray-800'
                          }`}>
                            {item.productName}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">SKU: {item.sku}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className={`text-xs font-mono px-2 py-1 rounded-lg font-bold ${
                              isCurrent ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              📍 {item.warehouseLocation}
                            </span>
                            <span className={`text-sm font-bold ${
                              isPicked ? 'text-green-600' : 
                              isCurrent ? 'text-blue-600' : 'text-gray-600'
                            }`}>
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
        <div className="bg-gradient-to-t from-gray-900 to-gray-800 border-t-4 border-gray-700 p-6">
          <div className="max-w-5xl mx-auto flex gap-6">
            <Button
              variant="secondary"
              className="flex-1 h-16 text-lg font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
              onClick={() => {
                setActivePickingOrder(null);
                setIsTimerRunning(false);
              }}
            >
              <PauseCircle className="h-6 w-6 mr-3" />
              PAUSE PICKING
            </Button>
            <Button
              className={`flex-1 h-16 text-lg font-bold shadow-lg transition-all ${
                activePickingOrder.pickedItems >= activePickingOrder.totalItems
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white animate-pulse'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
              disabled={activePickingOrder.pickedItems < activePickingOrder.totalItems}
              onClick={completePicking}
            >
              <CheckCircle2 className="h-6 w-6 mr-3" />
              COMPLETE ORDER ({activePickingOrder.pickedItems}/{activePickingOrder.totalItems})
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