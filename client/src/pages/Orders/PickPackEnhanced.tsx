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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  Activity,
  Bell,
  Info,
  BarChart3,
  History,
  ShoppingCart
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
  price?: number;
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
  totalAmount?: number;
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

interface ActivityNotification {
  id: string;
  type: 'picking_started' | 'picking_completed' | 'packing_started' | 'packing_completed' | 'order_ready' | 'batch_started';
  message: string;
  timestamp: Date;
  user?: string;
  icon: any;
  color: string;
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
  
  // Activity notifications
  const [activityNotifications, setActivityNotifications] = useState<ActivityNotification[]>([]);

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
          image: item.image || item.imageUrl,
          price: item.price
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
        notes: order.notes,
        totalAmount: order.totalAmount
      }));
  }, [allOrders]);

  // Format timer
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Add activity notification
  const addActivityNotification = (type: ActivityNotification['type'], message: string, user?: string) => {
    const iconMap = {
      'picking_started': { icon: PlayCircle, color: 'text-blue-600' },
      'picking_completed': { icon: CheckCircle2, color: 'text-green-600' },
      'packing_started': { icon: BoxIcon, color: 'text-purple-600' },
      'packing_completed': { icon: PackageCheck, color: 'text-teal-600' },
      'order_ready': { icon: Truck, color: 'text-orange-600' },
      'batch_started': { icon: Layers, color: 'text-pink-600' }
    };

    const config = iconMap[type];
    const notification: ActivityNotification = {
      id: `activity-${Date.now()}`,
      type,
      message,
      timestamp: new Date(),
      user,
      icon: config.icon,
      color: config.color
    };

    setActivityNotifications(prev => [notification, ...prev].slice(0, 10)); // Keep only last 10
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

  // Start single order picking
  const startPicking = async (order: PickPackOrder) => {
    await updateOrderStatusMutation.mutateAsync({
      orderId: order.id,
      status: 'to_fulfill',
      pickStatus: 'in_progress',
      pickedBy: currentEmployee
    });

    setActivePickingOrder(order);
    setSelectedTab('picking');
    setPickingTimer(0);
    setIsTimerRunning(true);
    setCurrentItemIndex(0);
    
    addActivityNotification('picking_started', `Started picking order ${order.orderId}`, currentEmployee);
    
    toast({
      title: "Picking Started",
      description: `Now picking order ${order.orderId}`,
    });
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
    
    addActivityNotification('batch_started', `Started batch picking ${orders.length} orders`, currentEmployee);
    
    toast({
      title: "Batch Picking Started",
      description: `Picking ${orders.length} orders with ${batchSession.totalItems} total items`,
    });
  };

  // Handle barcode scan
  const handleBarcodeScan = async () => {
    if (!barcodeInput) return;

    if (activePickingOrder) {
      const item = activePickingOrder.items.find(i => 
        i.barcode === barcodeInput || i.sku === barcodeInput
      );

      if (item) {
        const newPickedQty = Math.min(item.pickedQuantity + 1, item.quantity);
        
        await updateItemQuantityMutation.mutateAsync({
          orderId: activePickingOrder.id,
          itemId: item.id,
          pickedQuantity: newPickedQty
        });

        setBarcodeInput('');
        
        // Auto-advance to next item if current is complete
        if (newPickedQty === item.quantity) {
          const nextUnpickedIndex = activePickingOrder.items.findIndex(
            i => i.pickedQuantity < i.quantity
          );
          if (nextUnpickedIndex !== -1) {
            setCurrentItemIndex(nextUnpickedIndex);
            scrollToNextUnpickedItem();
          }
        }

        toast({
          title: "Item Scanned",
          description: `${item.productName} (${newPickedQty}/${item.quantity})`,
        });
      } else {
        toast({
          title: "Item Not Found",
          description: "This item is not in the current order",
          variant: "destructive"
        });
      }
    }
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
    
    addActivityNotification(
      'picking_completed', 
      `Completed picking ${stats.totalOrders} order(s) with ${stats.totalItems} items in ${formatTimer(stats.totalTime)}`,
      currentEmployee
    );
    
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

  // Start packing
  const startPacking = async (order: PickPackOrder) => {
    await updateOrderStatusMutation.mutateAsync({
      orderId: order.id,
      status: 'to_fulfill',
      packStatus: 'in_progress',
      packedBy: currentEmployee
    });

    setActivePackingOrder(order);
    setSelectedTab('packing');
    setPackingTimer(0);
    setIsPackingTimerRunning(true);
    setVerifiedPackItems(new Set());
    setPackingNotes('');
    setFragileItemsVerified(false);
    
    addActivityNotification('packing_started', `Started packing order ${order.orderId}`, currentEmployee);
    
    toast({
      title: "Packing Started",
      description: `Now packing order ${order.orderId}`,
    });
  };

  // Complete packing
  const completePacking = async () => {
    if (!activePackingOrder) return;

    setIsPackingTimerRunning(false);

    await updateOrderStatusMutation.mutateAsync({
      orderId: activePackingOrder.id,
      status: 'to_fulfill',
      packStatus: 'completed'
    });

    addActivityNotification(
      'order_ready',
      `Order ${activePackingOrder.orderId} is ready to ship`,
      currentEmployee
    );

    toast({
      title: "Order Ready!",
      description: `Order ${activePackingOrder.orderId} has been packed and is ready to ship`,
    });

    setActivePackingOrder(null);
    setSelectedTab('ready');
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
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-24">
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
                  <BoxIcon className="h-6 w-6 text-orange-500" />
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
            
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Today</p>
                    <p className="text-xl font-bold">{stats.todayPicked}</p>
                  </div>
                  <CheckCircle className="h-6 w-6 text-teal-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Avg Time</p>
                    <p className="text-xl font-bold">{stats.avgPickTime}</p>
                  </div>
                  <Timer className="h-6 w-6 text-indigo-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Tabs */}
          <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)}>
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pending">
                Pending
                {stats.pending > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">
                    {stats.pending}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="picking">
                Picking
                {stats.picking > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">
                    {stats.picking}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="packing">
                Packing
                {stats.packing > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">
                    {stats.packing}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="ready">
                Ready
                {stats.ready > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">
                    {stats.ready}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Start picking or packing orders</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <Button 
                      size="lg" 
                      className="w-full"
                      disabled={stats.pending === 0}
                      onClick={() => setSelectedTab('pending')}
                    >
                      <PlayCircle className="h-5 w-5 mr-2" />
                      Start Picking ({stats.pending} orders)
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="w-full"
                      disabled={stats.packing === 0}
                      onClick={() => setSelectedTab('packing')}
                    >
                      <BoxIcon className="h-5 w-5 mr-2" />
                      Start Packing ({stats.packing} orders)
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Performance Overview</CardTitle>
                    <CardDescription>Today's picking and packing statistics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Orders Completed Today</span>
                        <span className="text-2xl font-bold">{stats.todayPicked}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Average Pick Time</span>
                        <span className="text-2xl font-bold">{stats.avgPickTime}</span>
                      </div>
                      <Progress value={65} className="h-2" />
                      <p className="text-xs text-gray-500 text-center">65% of daily target achieved</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Pending Tab */}
            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Pending Orders</CardTitle>
                      <CardDescription>Orders ready to be picked</CardDescription>
                    </div>
                    {batchPickingMode && (
                      <Button
                        onClick={startBatchPicking}
                        disabled={selectedBatchOrders.size === 0}
                      >
                        <Layers className="h-4 w-4 mr-2" />
                        Start Batch ({selectedBatchOrders.size})
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {getOrdersByStatus('pending').map(order => (
                        <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              {batchPickingMode && (
                                <Checkbox
                                  checked={selectedBatchOrders.has(order.id)}
                                  onCheckedChange={() => toggleBatchOrderSelection(order.id)}
                                />
                              )}
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{order.orderId}</span>
                                  <Badge variant={getPriorityColor(order.priority)}>
                                    {order.priority}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600">{order.customerName}</p>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Package className="h-3 w-3" />
                                    {order.totalItems} items
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Truck className="h-3 w-3" />
                                    {order.shippingMethod}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {!batchPickingMode && (
                              <Button size="sm" onClick={() => startPicking(order)}>
                                <PlayCircle className="h-4 w-4 mr-1" />
                                Start
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Picking Tab */}
            <TabsContent value="picking">
              {activePickingOrder ? (
                <div className="space-y-4">
                  {/* Picking Header */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{activePickingOrder.orderId}</h3>
                          <Badge>{activePickingOrder.customerName}</Badge>
                          <Badge variant="outline">
                            {activePickingOrder.pickedItems}/{activePickingOrder.totalItems} items
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-lg px-3 py-1">
                            <Timer className="h-4 w-4 mr-1" />
                            {formatTimer(pickingTimer)}
                          </Badge>
                          <Button
                            size="sm"
                            variant={isTimerRunning ? "secondary" : "default"}
                            onClick={() => setIsTimerRunning(!isTimerRunning)}
                          >
                            {isTimerRunning ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Barcode Scanner */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex gap-2">
                        <Input
                          ref={barcodeInputRef}
                          placeholder="Scan or enter barcode..."
                          value={barcodeInput}
                          onChange={(e) => setBarcodeInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleBarcodeScan()}
                          className="flex-1"
                        />
                        <Button onClick={handleBarcodeScan}>
                          <ScanLine className="h-4 w-4 mr-2" />
                          Scan
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Items to Pick */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Items to Pick</CardTitle>
                      <Progress 
                        value={(activePickingOrder.pickedItems / activePickingOrder.totalItems) * 100} 
                        className="h-2"
                      />
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px]" ref={itemsScrollAreaRef}>
                        <div className="space-y-3">
                          {activePickingOrder.items.map((item, index) => (
                            <div
                              key={item.id}
                              data-picked={item.pickedQuantity === item.quantity}
                              className={`border rounded-lg p-3 ${
                                item.pickedQuantity === item.quantity 
                                  ? 'bg-green-50 border-green-300' 
                                  : index === currentItemIndex 
                                  ? 'bg-blue-50 border-blue-300' 
                                  : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {item.image && (
                                    <img 
                                      src={item.image} 
                                      alt={item.productName}
                                      className="w-12 h-12 object-cover rounded"
                                    />
                                  )}
                                  <div>
                                    <p className="font-medium">{item.productName}</p>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <span>SKU: {item.sku}</span>
                                      <Badge variant="outline" className="text-xs">
                                        <MapPin className="h-3 w-3 mr-1" />
                                        {item.warehouseLocation}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                      const newQty = Math.max(0, item.pickedQuantity - 1);
                                      await updateItemQuantityMutation.mutateAsync({
                                        orderId: activePickingOrder.id,
                                        itemId: item.id,
                                        pickedQuantity: newQty
                                      });
                                    }}
                                    disabled={item.pickedQuantity === 0}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="font-bold text-lg min-w-[3rem] text-center">
                                    {item.pickedQuantity}/{item.quantity}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                      const newQty = Math.min(item.quantity, item.pickedQuantity + 1);
                                      await updateItemQuantityMutation.mutateAsync({
                                        orderId: activePickingOrder.id,
                                        itemId: item.id,
                                        pickedQuantity: newQty
                                      });
                                    }}
                                    disabled={item.pickedQuantity === item.quantity}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                  {item.pickedQuantity === item.quantity && (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                    <CardContent className="pt-0">
                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={completePicking}
                        disabled={activePickingOrder.pickedItems < activePickingOrder.totalItems}
                      >
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        Complete Picking
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">No active picking session</p>
                    <Button 
                      className="mt-4"
                      onClick={() => setSelectedTab('pending')}
                    >
                      Select Order to Pick
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Packing Tab */}
            <TabsContent value="packing">
              {activePackingOrder ? (
                <div className="space-y-4">
                  {/* Packing Header */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{activePackingOrder.orderId}</h3>
                          <Badge>{activePackingOrder.customerName}</Badge>
                          <Badge variant="outline">
                            {activePackingOrder.totalItems} items
                          </Badge>
                        </div>
                        <Badge variant="secondary" className="text-lg px-3 py-1">
                          <Timer className="h-4 w-4 mr-1" />
                          {formatTimer(packingTimer)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Packing Options */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Packing Options</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="mb-2">Packing Material</Label>
                        <RadioGroup 
                          value={packingMaterial} 
                          onValueChange={(value: any) => setPackingMaterial(value)}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="standard" id="standard" />
                            <Label htmlFor="standard">Standard</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="bubble" id="bubble" />
                            <Label htmlFor="bubble">Bubble Wrap</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="foam" id="foam" />
                            <Label htmlFor="foam">Foam Protection</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="fragile"
                          checked={fragileItemsVerified}
                          onCheckedChange={(checked) => setFragileItemsVerified(checked as boolean)}
                        />
                        <Label htmlFor="fragile">Fragile items verified and protected</Label>
                      </div>

                      <div>
                        <Label htmlFor="notes">Packing Notes</Label>
                        <Textarea
                          id="notes"
                          placeholder="Add any special packing instructions..."
                          value={packingNotes}
                          onChange={(e) => setPackingNotes(e.target.value)}
                          className="mt-2"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Items to Pack */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Verify Items</CardTitle>
                      <CardDescription>Check each item before packing</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[250px]">
                        <div className="space-y-2">
                          {activePackingOrder.items.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-3 border rounded">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={verifiedPackItems.has(item.id)}
                                  onCheckedChange={(checked) => {
                                    const newSet = new Set(verifiedPackItems);
                                    if (checked) {
                                      newSet.add(item.id);
                                    } else {
                                      newSet.delete(item.id);
                                    }
                                    setVerifiedPackItems(newSet);
                                  }}
                                />
                                <div>
                                  <p className="font-medium">{item.productName}</p>
                                  <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                                </div>
                              </div>
                              <Badge variant="outline">
                                Qty: {item.quantity}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                    <CardContent className="pt-0">
                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={completePacking}
                        disabled={verifiedPackItems.size < activePackingOrder.items.length}
                      >
                        <PackageCheck className="h-5 w-5 mr-2" />
                        Complete Packing ({verifiedPackItems.size}/{activePackingOrder.items.length})
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8">
                    <div className="space-y-3">
                      {getOrdersByStatus('packing').length > 0 ? (
                        getOrdersByStatus('packing').map(order => (
                          <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold">{order.orderId}</p>
                                <p className="text-sm text-gray-600">{order.customerName}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {order.totalItems} items
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {order.shippingMethod}
                                  </Badge>
                                </div>
                              </div>
                              <Button size="sm" onClick={() => startPacking(order)}>
                                <BoxIcon className="h-4 w-4 mr-1" />
                                Start Packing
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <BoxIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                          <p className="text-gray-500">No orders ready for packing</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Ready Tab */}
            <TabsContent value="ready">
              <Card>
                <CardHeader>
                  <CardTitle>Ready to Ship</CardTitle>
                  <CardDescription>Orders packed and ready for shipping</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {getOrdersByStatus('ready').map(order => (
                        <div key={order.id} className="border rounded-lg p-4 bg-green-50">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{order.orderId}</p>
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Ready
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{order.customerName}</p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Package className="h-3 w-3" />
                                  {order.totalItems} items
                                </span>
                                <span className="flex items-center gap-1">
                                  <Truck className="h-3 w-3" />
                                  {order.shippingMethod}
                                </span>
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  Packed by: {order.packedBy}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <Button size="sm" variant="outline">
                                <Printer className="h-4 w-4 mr-1" />
                                Print Label
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {getOrdersByStatus('ready').length === 0 && (
                        <div className="text-center py-8">
                          <Truck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                          <p className="text-gray-500">No orders ready to ship</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Today's Activity Overview - Fixed at Bottom */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-20">
          <div className="px-4 py-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-semibold text-gray-700">Today's Activity</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setActivityNotifications([])}
                className="text-xs"
              >
                Clear
              </Button>
            </div>
            {activityNotifications.length > 0 ? (
              <ScrollArea className="h-16">
                <div className="space-y-1">
                  {activityNotifications.map(notification => {
                    const Icon = notification.icon;
                    return (
                      <div 
                        key={notification.id} 
                        className="flex items-center gap-2 text-xs py-1 hover:bg-gray-50 rounded px-1"
                      >
                        <Icon className={`h-3 w-3 ${notification.color}`} />
                        <span className="text-gray-600">
                          {new Date(notification.timestamp).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        <span className="text-gray-800">{notification.message}</span>
                        {notification.user && (
                          <Badge variant="outline" className="text-xs py-0 px-1">
                            {notification.user}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-xs text-gray-500 py-2">No recent activity. Start picking or packing to see updates here.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}