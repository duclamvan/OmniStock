import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/currencyUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
// Confetti effect will be implemented with CSS animations
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
  TrendingUp,
  PlayCircle,
  PauseCircle,
  Plus,
  Minus,
  CheckCircle2,
  X,
  Hash,
  PackageOpen,
  BoxIcon,
  Trophy,
  Star,
  Award,
  Target,
  Sparkles,
  PartyPopper,
  Gift,
  Layers,
  Activity
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

interface BatchPickingSession {
  id: string;
  orders: PickPackOrder[];
  startTime: string;
  endTime?: string;
  totalItems: number;
  pickedItems: number;
  currentOrderIndex: number;
  currentItemIndex: number;
  completedOrders: string[];
}

interface PickingStats {
  totalTime: number;
  itemsPerMinute: number;
  accuracy: number;
  totalOrders: number;
  totalItems: number;
  perfectPicks: number;
}

export default function PickPackEnhanced() {
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
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [verifiedPackItems, setVerifiedPackItems] = useState<Set<string>>(new Set());
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const itemsScrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Multi-batch picking states
  const [batchPickingMode, setBatchPickingMode] = useState(false);
  const [selectedBatchOrders, setSelectedBatchOrders] = useState<Set<string>>(new Set());
  const [activeBatchSession, setActiveBatchSession] = useState<BatchPickingSession | null>(null);
  
  // Completion screen states
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [pickingStats, setPickingStats] = useState<PickingStats | null>(null);
  
  // Packing enhancements
  const [packingNotes, setPackingNotes] = useState('');
  const [fragileItemsVerified, setFragileItemsVerified] = useState(false);
  const [packingMaterial, setPackingMaterial] = useState<'standard' | 'bubble' | 'foam'>('standard');

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
          warehouseLocation: item.warehouseLocation || 'A1-01',
          barcode: item.barcode || item.sku,
          image: item.image || item.imageUrl
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

  // Mutation to update item quantities
  const updateItemQuantityMutation = useMutation({
    mutationFn: async ({ orderId, itemId, pickedQuantity, packedQuantity }: any) => {
      return apiRequest(`/api/orders/${orderId}/items/${itemId}`, 'PATCH', { 
        pickedQuantity,
        packedQuantity
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    }
  });

  // Toggle batch order selection
  const toggleBatchOrderSelection = (orderId: string) => {
    const newSelection = new Set(selectedBatchOrders);
    if (newSelection.has(orderId)) {
      newSelection.delete(orderId);
    } else {
      newSelection.add(orderId);
    }
    setSelectedBatchOrders(newSelection);
  };

  // Start batch picking
  const startBatchPicking = async () => {
    const orders = transformedOrders.filter(o => selectedBatchOrders.has(o.id));
    if (orders.length === 0) {
      toast({
        title: "No orders selected",
        description: "Please select at least one order for batch picking",
        variant: "destructive"
      });
      return;
    }

    // Update all selected orders to picking status
    for (const order of orders) {
      await updateOrderStatusMutation.mutateAsync({
        orderId: order.id,
        status: 'to_fulfill',
        pickStatus: 'in_progress',
        pickedBy: currentEmployee
      });
    }

    const batchSession: BatchPickingSession = {
      id: `batch-${Date.now()}`,
      orders: orders,
      startTime: new Date().toISOString(),
      totalItems: orders.reduce((sum, o) => sum + o.totalItems, 0),
      pickedItems: 0,
      currentOrderIndex: 0,
      currentItemIndex: 0,
      completedOrders: []
    };

    setActiveBatchSession(batchSession);
    setBatchPickingMode(true);
    setSelectedTab('picking');
    setPickingTimer(0);
    setIsTimerRunning(true);
    
    toast({
      title: "Batch Picking Started",
      description: `Picking ${orders.length} orders with ${batchSession.totalItems} total items`,
    });
  };

  // Complete picking with celebration
  const completePicking = async () => {
    setIsTimerRunning(false);
    
    // Calculate stats
    const stats: PickingStats = {
      totalTime: pickingTimer,
      itemsPerMinute: activeBatchSession 
        ? (activeBatchSession.pickedItems / (pickingTimer / 60)) 
        : (activePickingOrder ? (activePickingOrder.pickedItems / (pickingTimer / 60)) : 0),
      accuracy: 100, // In real app, calculate based on errors
      totalOrders: activeBatchSession ? activeBatchSession.orders.length : 1,
      totalItems: activeBatchSession 
        ? activeBatchSession.pickedItems 
        : (activePickingOrder?.pickedItems || 0),
      perfectPicks: activeBatchSession 
        ? activeBatchSession.completedOrders.length 
        : (activePickingOrder?.pickedItems === activePickingOrder?.totalItems ? 1 : 0)
    };
    
    setPickingStats(stats);
    setShowCompletionScreen(true);
    
    // Trigger celebration
    triggerCelebration();
    
    // Update order statuses
    if (activeBatchSession) {
      for (const order of activeBatchSession.orders) {
        await updateOrderStatusMutation.mutateAsync({
          orderId: order.id,
          status: 'to_fulfill',
          pickStatus: 'completed',
          packStatus: 'not_started'
        });
      }
    } else if (activePickingOrder) {
      await updateOrderStatusMutation.mutateAsync({
        orderId: activePickingOrder.id,
        status: 'to_fulfill',
        pickStatus: 'completed',
        packStatus: 'not_started'
      });
    }
  };

  // Trigger celebration animation
  const triggerCelebration = () => {
    // Animation will be handled by CSS classes
    // Adding a visual feedback via toast for now
    toast({
      title: "🎉 Amazing Job!",
      description: "You've completed the picking session successfully!",
    });
  };

  // Completion Screen Component
  const CompletionScreen = () => {
    if (!showCompletionScreen || !pickingStats) return null;

    const getPerformanceRating = () => {
      const itemsPerMin = pickingStats.itemsPerMinute;
      if (itemsPerMin >= 3) return { text: "Outstanding!", color: "text-green-600", icon: Trophy };
      if (itemsPerMin >= 2) return { text: "Excellent!", color: "text-blue-600", icon: Star };
      if (itemsPerMin >= 1) return { text: "Good Job!", color: "text-purple-600", icon: Award };
      return { text: "Keep Going!", color: "text-orange-600", icon: Target };
    };

    const rating = getPerformanceRating();
    const RatingIcon = rating.icon;

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 z-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full shadow-2xl border-2 border-purple-200">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 animate-ping bg-yellow-400 rounded-full opacity-20"></div>
                <div className="relative bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full p-6">
                  <RatingIcon className="h-16 w-16 text-white" />
                </div>
              </div>
            </div>
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Picking Complete! 🎉
            </CardTitle>
            <CardDescription className={`text-2xl font-semibold mt-2 ${rating.color}`}>
              {rating.text}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center">
                <Clock className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                <p className="text-sm text-gray-600">Total Time</p>
                <p className="text-2xl font-bold text-blue-900">{formatTimer(pickingStats.totalTime)}</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 text-center">
                <Package className="h-8 w-8 mx-auto text-green-600 mb-2" />
                <p className="text-sm text-gray-600">Items Picked</p>
                <p className="text-2xl font-bold text-green-900">{pickingStats.totalItems}</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 text-center">
                <Activity className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                <p className="text-sm text-gray-600">Items/Min</p>
                <p className="text-2xl font-bold text-purple-900">{pickingStats.itemsPerMinute.toFixed(1)}</p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 text-center">
                <ClipboardList className="h-8 w-8 mx-auto text-orange-600 mb-2" />
                <p className="text-sm text-gray-600">Orders</p>
                <p className="text-2xl font-bold text-orange-900">{pickingStats.totalOrders}</p>
              </div>
              
              <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-4 text-center">
                <Target className="h-8 w-8 mx-auto text-pink-600 mb-2" />
                <p className="text-sm text-gray-600">Accuracy</p>
                <p className="text-2xl font-bold text-pink-900">{pickingStats.accuracy}%</p>
              </div>
              
              <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4 text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto text-teal-600 mb-2" />
                <p className="text-sm text-gray-600">Perfect Picks</p>
                <p className="text-2xl font-bold text-teal-900">{pickingStats.perfectPicks}</p>
              </div>
            </div>

            {/* Motivational Message */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-4 text-white text-center">
              <Sparkles className="h-8 w-8 mx-auto mb-2" />
              <p className="text-lg font-semibold">Great work, {currentEmployee}!</p>
              <p className="text-sm opacity-90 mt-1">
                {pickingStats.itemsPerMinute >= 2 
                  ? "You're setting a great pace! Keep up the excellent work!" 
                  : "Every pick counts! You're doing amazing!"}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                className="flex-1"
                size="lg"
                onClick={() => {
                  setShowCompletionScreen(false);
                  setActivePickingOrder(null);
                  setActiveBatchSession(null);
                  setBatchPickingMode(false);
                  setSelectedBatchOrders(new Set());
                  setSelectedTab('overview');
                }}
              >
                <Home className="h-5 w-5 mr-2" />
                Back to Overview
              </Button>
              
              <Button 
                className="flex-1"
                size="lg"
                variant="outline"
                onClick={() => {
                  setShowCompletionScreen(false);
                  setActivePickingOrder(null);
                  setActiveBatchSession(null);
                  setBatchPickingMode(false);
                  setSelectedBatchOrders(new Set());
                  setSelectedTab('packing');
                }}
              >
                <BoxIcon className="h-5 w-5 mr-2" />
                Start Packing
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Auto-scroll to next unpicked item
  const scrollToNextUnpickedItem = () => {
    if (!itemsScrollAreaRef.current) return;
    
    setTimeout(() => {
      const scrollArea = itemsScrollAreaRef.current;
      if (!scrollArea) return;
      
      const unpickedItem = scrollArea.querySelector('[data-picked="false"]');
      if (unpickedItem) {
        unpickedItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
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

  return (
    <>
      <CompletionScreen />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="px-3 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="h-6 w-6 text-indigo-600" />
                <h1 className="text-xl font-bold">Pick & Pack Enhanced</h1>
              </div>
              
              <div className="flex items-center gap-2">
                {batchPickingMode ? (
                  <Badge variant="default" className="bg-gradient-to-r from-purple-600 to-pink-600">
                    <Layers className="h-3 w-3 mr-1" />
                    Batch Mode
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBatchPickingMode(!batchPickingMode)}
                  >
                    <Layers className="h-3.5 w-3.5 mr-1" />
                    Enable Batch
                  </Button>
                )}
                
                <Badge variant="outline">
                  <User className="h-3 w-3 mr-1" />
                  {currentEmployee}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Pending</p>
                    <p className="text-xl font-bold">{stats.pending}</p>
                  </div>
                  <ClipboardList className="h-6 w-6 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Picking</p>
                    <p className="text-xl font-bold">{stats.picking}</p>
                  </div>
                  <Package className="h-6 w-6 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Packing</p>
                    <p className="text-xl font-bold">{stats.packing}</p>
                  </div>
                  <Box className="h-6 w-6 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Ready</p>
                    <p className="text-xl font-bold">{stats.ready}</p>
                  </div>
                  <Truck className="h-6 w-6 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Batch Picking Selection */}
          {batchPickingMode && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Select Orders for Batch Picking
                </CardTitle>
                <CardDescription>
                  Choose multiple orders to pick together in an optimized route
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 border rounded-lg p-3">
                  <div className="space-y-2">
                    {getOrdersByStatus('pending').map(order => (
                      <div key={order.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                        <Checkbox
                          checked={selectedBatchOrders.has(order.id)}
                          onCheckedChange={() => toggleBatchOrderSelection(order.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{order.orderId}</span>
                            <Badge variant={getPriorityColor(order.priority)} className="text-xs">
                              {order.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500">
                            {order.customerName} • {order.totalItems} items
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {selectedBatchOrders.size} orders selected
                    {selectedBatchOrders.size > 0 && 
                      ` • ${transformedOrders
                        .filter(o => selectedBatchOrders.has(o.id))
                        .reduce((sum, o) => sum + o.totalItems, 0)} total items`
                    }
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedBatchOrders(new Set())}
                      disabled={selectedBatchOrders.size === 0}
                    >
                      Clear Selection
                    </Button>
                    <Button
                      onClick={startBatchPicking}
                      disabled={selectedBatchOrders.size === 0}
                      className="bg-gradient-to-r from-purple-600 to-pink-600"
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Start Batch Picking
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Regular tabs content */}
          <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
            <TabsList className="grid grid-cols-5 w-full max-w-2xl mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
              <TabsTrigger value="picking">Picking ({stats.picking})</TabsTrigger>
              <TabsTrigger value="packing">Packing ({stats.packing})</TabsTrigger>
              <TabsTrigger value="ready">Ready ({stats.ready})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Today's Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                      <Trophy className="h-10 w-10 mx-auto text-blue-600 mb-2" />
                      <p className="text-2xl font-bold text-blue-900">{stats.todayPicked}</p>
                      <p className="text-sm text-gray-600">Orders Picked Today</p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                      <Timer className="h-10 w-10 mx-auto text-green-600 mb-2" />
                      <p className="text-2xl font-bold text-green-900">{stats.avgPickTime}</p>
                      <p className="text-sm text-gray-600">Average Pick Time</p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                      <Activity className="h-10 w-10 mx-auto text-purple-600 mb-2" />
                      <p className="text-2xl font-bold text-purple-900">98%</p>
                      <p className="text-sm text-gray-600">Accuracy Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}