import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
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
  BoxIcon
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
    setCurrentItemIndex(0);
    setSelectedTab('picking');
    setPickingTimer(0);
    setIsTimerRunning(true);
    toast({
      title: "Picking Started",
      description: `Started picking order ${order.orderId}`,
    });
    setTimeout(() => {
      barcodeInputRef.current?.focus();
      scrollToNextUnpickedItem();
    }, 100);
  };

  // Auto-scroll to next unpicked item
  const scrollToNextUnpickedItem = () => {
    if (!itemsScrollAreaRef.current) return;
    
    setTimeout(() => {
      const scrollArea = itemsScrollAreaRef.current;
      if (!scrollArea) return;
      
      // Find the first unpicked item element
      const unpickedItem = scrollArea.querySelector('[data-picked="false"]');
      if (unpickedItem) {
        unpickedItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Update picked item quantity
  const updatePickedItem = async (itemId: string, pickedQty: number) => {
    if (!activePickingOrder) return;

    const item = activePickingOrder.items.find(i => i.id === itemId);
    if (!item) return;

    await updateItemQuantityMutation.mutateAsync({
      orderId: activePickingOrder.id,
      itemId: itemId,
      pickedQuantity: pickedQty
    });

    const updatedItems = activePickingOrder.items.map(i =>
      i.id === itemId ? { ...i, pickedQuantity: pickedQty } : i
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
      setIsTimerRunning(false);
      toast({
        title: "All Items Picked!",
        description: "You can now complete the picking process",
      });
    } else if (pickedQty >= item.quantity) {
      // Move to next item
      const nextIndex = activePickingOrder.items.findIndex(i => i.pickedQuantity < i.quantity);
      if (nextIndex >= 0) {
        setCurrentItemIndex(nextIndex);
      }
      // Auto-scroll to next unpicked item when an item is fully picked
      scrollToNextUnpickedItem();
    }
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
    setVerifiedPackItems(new Set());
    setPackingTimer(0);
    setIsPackingTimerRunning(true);
    toast({
      title: "Packing Started",
      description: `Started packing order ${order.orderId}`,
    });
  };

  // Toggle item verification for packing
  const togglePackItemVerification = (itemId: string) => {
    const newVerified = new Set(verifiedPackItems);
    if (newVerified.has(itemId)) {
      newVerified.delete(itemId);
    } else {
      newVerified.add(itemId);
    }
    setVerifiedPackItems(newVerified);
  };

  // Complete packing
  const completePacking = async () => {
    if (!activePackingOrder) return;

    // Update all items as packed
    for (const item of activePackingOrder.items) {
      await updateItemQuantityMutation.mutateAsync({
        orderId: activePackingOrder.id,
        itemId: item.id,
        packedQuantity: item.quantity
      });
    }

    await updateOrderStatusMutation.mutateAsync({
      orderId: activePackingOrder.id,
      status: 'shipped',
      packStatus: 'completed'
    });

    setIsPackingTimerRunning(false);
    toast({
      title: "Packing Completed",
      description: `Order ${activePackingOrder.orderId} is ready to ship`,
    });
    setActivePackingOrder(null);
    setSelectedTab('ready');
  };

  // Handle barcode scanning
  const handleBarcodeScan = () => {
    if (!barcodeInput || !activePickingOrder) return;

    const currentItem = activePickingOrder.items[currentItemIndex];
    if (currentItem && (currentItem.barcode === barcodeInput || currentItem.sku === barcodeInput)) {
      const newQty = Math.min(currentItem.pickedQuantity + 1, currentItem.quantity);
      updatePickedItem(currentItem.id, newQty);
      toast({
        title: "Item Scanned",
        description: `${currentItem.productName} (${newQty}/${currentItem.quantity})`,
      });
    } else {
      toast({
        title: "Invalid Barcode",
        description: "Item not found or incorrect item",
        variant: "destructive",
      });
    }
    setBarcodeInput('');
    barcodeInputRef.current?.focus();
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

  // Mobile-optimized Active Picking View
  if (activePickingOrder) {
    const currentItem = activePickingOrder.items[currentItemIndex];
    const progress = (activePickingOrder.pickedItems / activePickingOrder.totalItems) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
        {/* Mobile Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg sticky top-0 z-20">
          <div className="px-3 py-2">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 bg-white/20 hover:bg-white/30 text-white"
                onClick={() => {
                  setActivePickingOrder(null);
                  setIsTimerRunning(false);
                }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="ml-1 text-xs">Exit</span>
              </Button>
              
              <div className="text-center">
                <div className="text-sm font-bold">{activePickingOrder.orderId}</div>
                <Badge className="text-[10px] px-1.5 py-0 bg-blue-500 text-white">
                  PICKING
                </Badge>
              </div>
              
              <div className="text-right">
                <div className="font-mono text-sm font-bold">{formatTimer(pickingTimer)}</div>
                <div className="text-[10px] text-blue-100">Time</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-2">
              <div className="flex justify-between text-[10px] mb-0.5">
                <span>Progress</span>
                <span>{activePickingOrder.pickedItems}/{activePickingOrder.totalItems}</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {currentItem ? (
            <div className="space-y-3">
              {/* Current Item Card */}
              <Card className="shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-sm">{currentItem.productName}</p>
                      <p className="text-xs text-gray-500">SKU: {currentItem.sku}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Item {currentItemIndex + 1} of {activePickingOrder.items.length}
                    </Badge>
                  </div>

                  {/* Product Image */}
                  {currentItem.image && (
                    <div className="mb-3 bg-gray-100 rounded-lg p-2">
                      <img 
                        src={currentItem.image} 
                        alt={currentItem.productName}
                        className="w-full h-32 object-contain rounded"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* Location */}
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-3 text-white mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span className="text-xs uppercase">Location</span>
                      </div>
                      <span className="text-xl font-bold font-mono">{currentItem.warehouseLocation}</span>
                    </div>
                  </div>

                  {/* Quantity Picker */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 text-center mb-2">Pick Quantity</p>
                    <div className="flex items-center justify-center gap-3">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-10 w-10"
                        onClick={() => updatePickedItem(currentItem.id, Math.max(0, currentItem.pickedQuantity - 1))}
                        disabled={currentItem.pickedQuantity === 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {currentItem.pickedQuantity}/{currentItem.quantity}
                        </div>
                        <p className="text-xs text-gray-500">items</p>
                      </div>
                      
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-10 w-10"
                        onClick={() => updatePickedItem(currentItem.id, Math.min(currentItem.quantity, currentItem.pickedQuantity + 1))}
                        disabled={currentItem.pickedQuantity >= currentItem.quantity}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {currentItem.pickedQuantity >= currentItem.quantity && (
                      <Alert className="mt-2 bg-green-50 border-green-200">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <AlertDescription className="text-xs text-green-700">
                          Item fully picked!
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Barcode Scanner */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <ScanLine className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        ref={barcodeInputRef}
                        placeholder="Scan barcode..."
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleBarcodeScan()}
                        className="pl-8 text-sm h-9"
                        autoFocus
                      />
                    </div>
                    <Button 
                      size="sm"
                      onClick={handleBarcodeScan}
                      className="h-9 px-3"
                    >
                      Scan
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updatePickedItem(currentItem.id, currentItem.quantity)}
                  disabled={currentItem.pickedQuantity >= currentItem.quantity}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Pick All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const nextIndex = activePickingOrder.items.findIndex((item, idx) => 
                      idx > currentItemIndex && item.pickedQuantity < item.quantity
                    );
                    if (nextIndex >= 0) setCurrentItemIndex(nextIndex);
                  }}
                >
                  <ChevronRight className="h-3.5 w-3.5 mr-1" />
                  Next Item
                </Button>
              </div>

              {/* Items Overview */}
              <Card>
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">All Items</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <ScrollArea className="h-32">
                    <div className="space-y-2" ref={itemsScrollAreaRef}>
                      {activePickingOrder.items.map((item, index) => (
                        <div
                          key={item.id}
                          data-picked={item.pickedQuantity >= item.quantity ? "true" : "false"}
                          className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
                            index === currentItemIndex ? 'bg-blue-50 border-blue-300' : 
                            item.pickedQuantity >= item.quantity ? 'bg-green-50 border-green-200' : 
                            'hover:bg-gray-50'
                          }`}
                          onClick={() => setCurrentItemIndex(index)}
                        >
                          <div className="flex items-center gap-2">
                            {item.pickedQuantity >= item.quantity ? (
                              <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300" />
                            )}
                            <div>
                              <p className="text-xs font-medium line-clamp-1">{item.productName}</p>
                              <p className="text-[10px] text-gray-500">{item.warehouseLocation}</p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold">
                            {item.pickedQuantity}/{item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          ) : (
            // All items picked
            <Card className="mt-8">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">All Items Picked!</h3>
                <p className="text-sm text-gray-600 mb-4">
                  You've successfully picked all {activePickingOrder.totalItems} items
                </p>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={completePicking}
                >
                  <PackageCheck className="h-4 w-4 mr-2" />
                  Complete Picking
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Mobile-optimized Active Packing View
  if (activePackingOrder) {
    const progress = (verifiedPackItems.size / activePackingOrder.items.length) * 100;
    const allVerified = verifiedPackItems.size === activePackingOrder.items.length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex flex-col">
        {/* Mobile Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg sticky top-0 z-20">
          <div className="px-3 py-2">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 bg-white/20 hover:bg-white/30 text-white"
                onClick={() => {
                  setActivePackingOrder(null);
                  setIsPackingTimerRunning(false);
                }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="ml-1 text-xs">Exit</span>
              </Button>
              
              <div className="text-center">
                <div className="text-sm font-bold">{activePackingOrder.orderId}</div>
                <Badge className="text-[10px] px-1.5 py-0 bg-purple-500 text-white">
                  PACKING
                </Badge>
              </div>
              
              <div className="text-right">
                <div className="font-mono text-sm font-bold">{formatTimer(packingTimer)}</div>
                <div className="text-[10px] text-purple-100">Time</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-2">
              <div className="flex justify-between text-[10px] mb-0.5">
                <span>Verified</span>
                <span>{verifiedPackItems.size}/{activePackingOrder.items.length}</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-3">
            {/* Customer Info */}
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Customer</p>
                    <p className="font-semibold text-sm">{activePackingOrder.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Shipping</p>
                    <p className="font-semibold text-sm">{activePackingOrder.shippingMethod}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items Checklist */}
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Verify Items</span>
                  <Badge variant="outline" className="text-xs">
                    {verifiedPackItems.size}/{activePackingOrder.items.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {activePackingOrder.items.map((item) => {
                      const isVerified = verifiedPackItems.has(item.id);
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                            isVerified ? 'bg-green-50 border-green-300' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => togglePackItemVerification(item.id)}
                        >
                          <div className="flex items-center gap-2">
                            {isVerified ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-gray-400" />
                            )}
                            <div>
                              <p className="text-sm font-medium">{item.productName}</p>
                              <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {item.quantity} pcs
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Packing Checklist */}
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-sm">Packing Steps</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={allVerified}
                      readOnly
                    />
                    <span className="text-sm">All items verified</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded"
                      disabled={!allVerified}
                    />
                    <span className="text-sm">Packing slip included</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded"
                      disabled={!allVerified}
                    />
                    <span className="text-sm">Box sealed properly</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded"
                      disabled={!allVerified}
                    />
                    <span className="text-sm">Shipping label attached</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Complete Button */}
            {allVerified && (
              <Button
                size="lg"
                className="w-full"
                onClick={completePacking}
              >
                <BoxIcon className="h-4 w-4 mr-2" />
                Complete Packing
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard View - Mobile Optimized
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-3 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">Pick & Pack</h1>
              <p className="text-xs text-gray-500">Warehouse Operations</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              {showMobileMenu ? <X className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="md:hidden bg-white border-b px-3 py-2">
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setSelectedTab('overview');
                setShowMobileMenu(false);
              }}
            >
              <Home className="h-4 w-4 mr-2" />
              Overview
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setSelectedTab('pending');
                setShowMobileMenu(false);
              }}
            >
              <Clock className="h-4 w-4 mr-2" />
              Pending ({stats.pending})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setSelectedTab('picking');
                setShowMobileMenu(false);
              }}
            >
              <Package className="h-4 w-4 mr-2" />
              Picking ({stats.picking})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setSelectedTab('packing');
                setShowMobileMenu(false);
              }}
            >
              <Box className="h-4 w-4 mr-2" />
              Packing ({stats.packing})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setSelectedTab('ready');
                setShowMobileMenu(false);
              }}
            >
              <Truck className="h-4 w-4 mr-2" />
              Ready ({stats.ready})
            </Button>
          </div>
        </div>
      )}

      {/* Stats Grid - Mobile Optimized */}
      <div className="px-3 py-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Pending</p>
                  <p className="text-xl font-bold">{stats.pending}</p>
                </div>
                <Clock className="h-6 w-6 text-yellow-500" />
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
                <Package className="h-6 w-6 text-blue-500" />
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
                <Box className="h-6 w-6 text-purple-500" />
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
          
          <Card className="hidden sm:block">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Today</p>
                  <p className="text-xl font-bold">{stats.todayPicked}</p>
                </div>
                <TrendingUp className="h-6 w-6 text-teal-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="hidden lg:block">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Avg Time</p>
                  <p className="text-xl font-bold">{stats.avgPickTime}</p>
                </div>
                <Timer className="h-6 w-6 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-3 pb-6">
        {/* Desktop Tabs */}
        <div className="hidden md:block">
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
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                      <Zap className="h-4 w-4 mr-2" />
                      Start Next Pick
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setSelectedTab('pending')}
                    >
                      <ClipboardList className="h-4 w-4 mr-2" />
                      View Pending
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => window.print()}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print List
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pending">
              <OrdersList 
                orders={getOrdersByStatus('pending')}
                title="Pending Orders"
                onAction={startPicking}
                actionLabel="Start Picking"
                emptyMessage="No pending orders"
              />
            </TabsContent>

            <TabsContent value="picking">
              <OrdersList 
                orders={getOrdersByStatus('picking')}
                title="Orders Being Picked"
                emptyMessage="No orders being picked"
              />
            </TabsContent>

            <TabsContent value="packing">
              <OrdersList 
                orders={getOrdersByStatus('packing')}
                title="Ready for Packing"
                onAction={startPacking}
                actionLabel="Start Packing"
                emptyMessage="No orders ready for packing"
              />
            </TabsContent>

            <TabsContent value="ready">
              <OrdersList 
                orders={getOrdersByStatus('ready')}
                title="Ready to Ship"
                emptyMessage="No orders ready to ship"
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Mobile Content */}
        <div className="md:hidden">
          {selectedTab === 'overview' && (
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const pendingOrders = getOrdersByStatus('pending');
                      if (pendingOrders.length > 0) {
                        startPicking(pendingOrders[0]);
                      }
                    }}
                    disabled={stats.pending === 0}
                  >
                    <Zap className="h-3.5 w-3.5 mr-2" />
                    Start Next Pick
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setSelectedTab('pending')}
                  >
                    <ClipboardList className="h-3.5 w-3.5 mr-2" />
                    View Pending Orders
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedTab === 'pending' && (
            <OrdersList 
              orders={getOrdersByStatus('pending')}
              title="Pending Orders"
              onAction={startPicking}
              actionLabel="Pick"
              emptyMessage="No pending orders"
              mobile
            />
          )}

          {selectedTab === 'picking' && (
            <OrdersList 
              orders={getOrdersByStatus('picking')}
              title="Orders Being Picked"
              emptyMessage="No orders being picked"
              mobile
            />
          )}

          {selectedTab === 'packing' && (
            <OrdersList 
              orders={getOrdersByStatus('packing')}
              title="Ready for Packing"
              onAction={startPacking}
              actionLabel="Pack"
              emptyMessage="No orders ready for packing"
              mobile
            />
          )}

          {selectedTab === 'ready' && (
            <OrdersList 
              orders={getOrdersByStatus('ready')}
              title="Ready to Ship"
              emptyMessage="No orders ready to ship"
              mobile
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Orders List Component
function OrdersList({ 
  orders, 
  title, 
  onAction, 
  actionLabel, 
  emptyMessage,
  mobile = false 
}: {
  orders: PickPackOrder[];
  title: string;
  onAction?: (order: PickPackOrder) => void;
  actionLabel?: string;
  emptyMessage: string;
  mobile?: boolean;
}) {
  return (
    <Card>
      <CardHeader className={mobile ? "p-3" : ""}>
        <CardTitle className={mobile ? "text-base" : ""}>{title}</CardTitle>
      </CardHeader>
      <CardContent className={mobile ? "p-3" : ""}>
        <div className="space-y-2">
          {orders.map((order) => (
            <div 
              key={order.id} 
              className={`flex ${mobile ? 'flex-col gap-2' : 'items-center justify-between'} p-3 border rounded-lg`}
            >
              <div className={mobile ? "" : "flex-1"}>
                <div className="flex items-center gap-2">
                  <p className={`font-semibold ${mobile ? 'text-sm' : ''}`}>{order.orderId}</p>
                  <Badge variant={getPriorityColor(order.priority)} className="text-xs">
                    {order.priority}
                  </Badge>
                </div>
                <p className={`text-gray-500 ${mobile ? 'text-xs' : 'text-sm'}`}>{order.customerName}</p>
                <p className={`text-gray-500 ${mobile ? 'text-xs' : 'text-sm'}`}>
                  {order.totalItems} items • {order.shippingMethod}
                </p>
                {order.pickedBy && (
                  <p className={`text-gray-500 ${mobile ? 'text-xs' : 'text-sm'}`}>
                    Picked by: {order.pickedBy}
                  </p>
                )}
              </div>
              {onAction && (
                <Button 
                  onClick={() => onAction(order)}
                  size={mobile ? "sm" : "default"}
                  className={mobile ? "w-full" : ""}
                >
                  {actionLabel}
                </Button>
              )}
            </div>
          ))}
          {orders.length === 0 && (
            <p className="text-center text-gray-500 py-8">{emptyMessage}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high': return 'destructive';
    case 'medium': return 'default';
    case 'low': return 'secondary';
    default: return 'outline';
  }
}