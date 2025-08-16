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
  X
} from "lucide-react";

interface OrderItem {
  id: string;
  productId?: string;
  productName: string;
  sku?: string;
  quantity: number;
  pickedQuantity: number;
  packedQuantity: number;
  warehouseLocation?: string;
  barcode?: string;
  image?: string;
  isBundle?: boolean;
  bundleItems?: any[];
  dimensions?: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
  isFragile?: boolean;
  isHazardous?: boolean;
}

interface PickPackOrder {
  id: string;
  orderId: string;
  customerName: string;
  shippingMethod?: string;
  shippingAddress: string;
  priority: string;
  status: string;
  pickStatus: string;
  packStatus: string;
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
  const [activeTab, setActiveTab] = useState<'overview' | 'picking' | 'packing'>('overview');
  const [selectedOrder, setSelectedOrder] = useState<PickPackOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isPicking, setIsPicking] = useState(false);
  const [isPacking, setIsPacking] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [scanBuffer, setScanBuffer] = useState('');
  const { toast } = useToast();

  // Fetch all pick & pack orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['/api/orders/pick-pack'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch specific order details
  const { data: orderDetails } = useQuery({
    queryKey: selectedOrder ? [`/api/orders/pick-pack/${selectedOrder.id}`] : null,
    enabled: !!selectedOrder,
  });

  // Update pick status mutation
  const updatePickStatus = useMutation({
    mutationFn: async (data: { orderId: string; status: string; pickedBy?: string }) => {
      return apiRequest(`/api/orders/${data.orderId}/pick-status`, {
        method: 'PATCH',
        body: JSON.stringify({
          pickStatus: data.status,
          pickedBy: data.pickedBy,
          pickStartTime: data.status === 'in_progress' ? new Date() : undefined,
          pickEndTime: data.status === 'completed' ? new Date() : undefined,
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
      toast({
        title: "Pick status updated",
        description: "Order pick status has been updated successfully",
      });
    }
  });

  // Update pack status mutation
  const updatePackStatus = useMutation({
    mutationFn: async (data: { orderId: string; status: string; packedBy?: string }) => {
      return apiRequest(`/api/orders/${data.orderId}/pack-status`, {
        method: 'PATCH',
        body: JSON.stringify({
          packStatus: data.status,
          packedBy: data.packedBy,
          packStartTime: data.status === 'in_progress' ? new Date() : undefined,
          packEndTime: data.status === 'completed' ? new Date() : undefined,
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
      toast({
        title: "Pack status updated",
        description: "Order pack status has been updated successfully",
      });
    }
  });

  // Update item picked quantity
  const updateItemPicked = useMutation({
    mutationFn: async (data: { itemId: string; quantity: number }) => {
      return apiRequest(`/api/order-items/${data.itemId}/picked`, {
        method: 'PATCH',
        body: JSON.stringify({ pickedQuantity: data.quantity })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
      playSound('success');
    }
  });

  // Update item packed quantity
  const updateItemPacked = useMutation({
    mutationFn: async (data: { itemId: string; quantity: number }) => {
      return apiRequest(`/api/order-items/${data.itemId}/packed`, {
        method: 'PATCH',
        body: JSON.stringify({ packedQuantity: data.quantity })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
      playSound('success');
    }
  });

  // Sound feedback
  const playSound = (type: 'scan' | 'success' | 'error') => {
    try {
      const audio = new Audio();
      switch (type) {
        case 'scan':
          audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAACBhYmLj5GUmJqbnJ2en6CgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoJ+enZybmpeVk5GPjYuIh4aDgYB+fXx7e3p5eXh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHl5ent8fX5/gIGEhYaIiouNj5GSlJWXmJqbnJ2en6CgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCfn56dm5uXlZOSj46MioeFg4GAf319fHt6enl5eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh5eXp7fH1+f4CBhIWGiIqLjY+RkpSVl5iam5ydnp+goKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoJ+fnp6cnJmYlpOSkI+OjIuKiIeGhYSDgoGAgH9+fX18fHt7e3p6enp6enp5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXp6e3t8fH1+f4CBgoOEhYaHiImKi4yNj5CRk5WXmJqbnZ6foKGhoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoA==';
          break;
        case 'success':
          audio.src = 'data:audio/wav;base64,UklGRuQGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAGAACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgD8AAIA/';
          console.log('Playing success sound');
          break;
        case 'error':
          audio.src = 'data:audio/wav;base64,UklGRuQBAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQABAACAPwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
          break;
      }
      audio.play().catch(() => {});
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  // Barcode scanning with keyboard listener
  useEffect(() => {
    let scanTimeout: NodeJS.Timeout;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Clear existing timeout
      clearTimeout(scanTimeout);
      
      // Add character to buffer
      if (e.key === 'Enter') {
        // Process the scanned barcode
        if (scanBuffer.length > 0) {
          setScannedBarcode(scanBuffer);
          handleBarcodeScanned(scanBuffer);
          setScanBuffer('');
        }
      } else if (e.key.length === 1) {
        setScanBuffer(prev => prev + e.key);
        
        // Clear buffer after 100ms of no input (end of scan)
        scanTimeout = setTimeout(() => {
          if (scanBuffer.length > 0) {
            setScannedBarcode(scanBuffer);
            handleBarcodeScanned(scanBuffer);
          }
          setScanBuffer('');
        }, 100);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      clearTimeout(scanTimeout);
    };
  }, [scanBuffer]);

  const handleBarcodeScanned = (barcode: string) => {
    playSound('scan');
    
    // Find item with this barcode in the current order
    if (selectedOrder && isPicking) {
      const item = selectedOrder.items.find(i => i.barcode === barcode);
      if (item) {
        // Mark item as picked
        updateItemPicked.mutate({ 
          itemId: item.id, 
          quantity: item.quantity 
        });
      } else {
        playSound('error');
        toast({
          title: "Item not found",
          description: `No item with barcode ${barcode} in this order`,
          variant: "destructive"
        });
      }
    }
  };

  // Filter orders based on status
  const filteredOrders = orders.filter((order: PickPackOrder) => {
    if (selectedStatus === 'all') return true;
    if (selectedStatus === 'pending') return order.pickStatus === 'not_started';
    if (selectedStatus === 'picking') return order.pickStatus === 'in_progress';
    if (selectedStatus === 'packing') return order.packStatus === 'in_progress';
    if (selectedStatus === 'ready') return order.packStatus === 'completed';
    return true;
  });

  // Search filtered orders
  const searchedOrders = filteredOrders.filter((order: PickPackOrder) =>
    order.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_started': return 'bg-gray-500';
      case 'in_progress': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const startPicking = (order: PickPackOrder) => {
    setSelectedOrder(order);
    setIsPicking(true);
    setActiveTab('picking');
    updatePickStatus.mutate({
      orderId: order.id,
      status: 'in_progress',
      pickedBy: 'Current User'
    });
  };

  const completePicking = () => {
    if (!selectedOrder) return;
    
    updatePickStatus.mutate({
      orderId: selectedOrder.id,
      status: 'completed',
      pickedBy: 'Current User'
    });
    
    setIsPicking(false);
    setActiveTab('overview');
  };

  const startPacking = (order: PickPackOrder) => {
    setSelectedOrder(order);
    setIsPacking(true);
    setActiveTab('packing');
    updatePackStatus.mutate({
      orderId: order.id,
      status: 'in_progress',
      packedBy: 'Current User'
    });
  };

  const completePacking = () => {
    if (!selectedOrder) return;
    
    updatePackStatus.mutate({
      orderId: selectedOrder.id,
      status: 'completed',
      packedBy: 'Current User'
    });
    
    setIsPacking(false);
    setActiveTab('overview');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4">Loading orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pick & Pack</h1>
          <p className="text-muted-foreground">Manage warehouse picking and packing operations</p>
        </div>
        <div className="flex gap-4">
          <Badge variant="outline" className="px-3 py-1">
            <Users className="h-4 w-4 mr-2" />
            Active Pickers: 3
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <Package className="h-4 w-4 mr-2" />
            Orders Today: {orders.length}
          </Badge>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter((o: PickPackOrder) => o.pickStatus === 'not_started').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Currently Picking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {orders.filter((o: PickPackOrder) => o.pickStatus === 'in_progress').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ready to Pack</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {orders.filter((o: PickPackOrder) => o.pickStatus === 'completed' && o.packStatus === 'not_started').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ready to Ship</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {orders.filter((o: PickPackOrder) => o.packStatus === 'completed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            <ClipboardList className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="picking">
            <Package className="h-4 w-4 mr-2" />
            Picking
          </TabsTrigger>
          <TabsTrigger value="packing">
            <Box className="h-4 w-4 mr-2" />
            Packing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="picking">Picking</option>
              <option value="packing">Packing</option>
              <option value="ready">Ready to Ship</option>
            </select>
          </div>

          {/* Orders List */}
          <div className="grid gap-4">
            {searchedOrders.map((order: PickPackOrder) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <CardTitle className="text-lg">{order.orderId}</CardTitle>
                        <CardDescription>{order.customerName}</CardDescription>
                      </div>
                      <Badge className={getPriorityColor(order.priority)}>
                        {order.priority} priority
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        <MapPin className="h-3 w-3 mr-1" />
                        {order.shippingMethod}
                      </Badge>
                      <Badge className={getStatusColor(order.pickStatus)}>
                        Pick: {order.pickStatus.replace('_', ' ')}
                      </Badge>
                      <Badge className={getStatusColor(order.packStatus)}>
                        Pack: {order.packStatus.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {order.totalItems} items • {order.shippingAddress}
                    </div>
                    <div className="flex gap-2">
                      {order.pickStatus === 'not_started' && (
                        <Button 
                          onClick={() => startPicking(order)}
                          variant="outline" 
                          size="sm"
                        >
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Start Picking
                        </Button>
                      )}
                      {order.pickStatus === 'completed' && order.packStatus === 'not_started' && (
                        <Button 
                          onClick={() => startPacking(order)}
                          variant="outline" 
                          size="sm"
                        >
                          <Box className="h-4 w-4 mr-2" />
                          Start Packing
                        </Button>
                      )}
                      {order.packStatus === 'completed' && (
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Ready to Ship
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="picking" className="space-y-4">
          {selectedOrder && isPicking ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedOrder.orderId}</CardTitle>
                    <CardDescription>{selectedOrder.customerName}</CardDescription>
                  </div>
                  <Button onClick={completePicking} variant="default">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Picking
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Barcode Scanner Status */}
                <Alert>
                  <ScanLine className="h-4 w-4" />
                  <AlertDescription>
                    Ready to scan... {scanBuffer && `Current: ${scanBuffer}`}
                  </AlertDescription>
                </Alert>

                {/* Items to Pick */}
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div 
                      key={item.id}
                      className={`p-4 border rounded-lg ${
                        item.pickedQuantity >= item.quantity ? 'bg-green-50 border-green-300' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Checkbox
                            checked={item.pickedQuantity >= item.quantity}
                            onCheckedChange={(checked) => {
                              updateItemPicked.mutate({
                                itemId: item.id,
                                quantity: checked ? item.quantity : 0
                              });
                            }}
                          />
                          <div>
                            <div className="font-medium">{item.productName}</div>
                            <div className="text-sm text-muted-foreground">
                              SKU: {item.sku} • Qty: {item.quantity}
                            </div>
                            <div className="text-sm text-blue-600">
                              <MapPin className="h-3 w-3 inline mr-1" />
                              {item.warehouseLocation || 'No location'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Barcode</div>
                          <div className="font-mono">{item.barcode || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Select an order from the Overview tab to start picking
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="packing" className="space-y-4">
          {selectedOrder && isPacking ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedOrder.orderId}</CardTitle>
                    <CardDescription>{selectedOrder.customerName}</CardDescription>
                  </div>
                  <Button onClick={completePacking} variant="default">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Packing
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Box className="h-4 w-4" />
                  <AlertDescription>
                    Pack all items carefully and apply shipping label
                  </AlertDescription>
                </Alert>

                {/* Items to Pack */}
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div 
                      key={item.id}
                      className={`p-4 border rounded-lg ${
                        item.packedQuantity >= item.quantity ? 'bg-green-50 border-green-300' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Checkbox
                            checked={item.packedQuantity >= item.quantity}
                            onCheckedChange={(checked) => {
                              updateItemPacked.mutate({
                                itemId: item.id,
                                quantity: checked ? item.quantity : 0
                              });
                            }}
                          />
                          <div>
                            <div className="font-medium">{item.productName}</div>
                            <div className="text-sm text-muted-foreground">
                              Qty: {item.quantity}
                              {item.isFragile && (
                                <Badge variant="destructive" className="ml-2">
                                  Fragile
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shipping Label */}
                <Card className="bg-gray-50">
                  <CardHeader>
                    <CardTitle className="text-sm">Shipping Label</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <div className="font-medium">{selectedOrder.customerName}</div>
                      <div>{selectedOrder.shippingAddress}</div>
                      <div className="pt-2">
                        <Badge>{selectedOrder.shippingMethod}</Badge>
                      </div>
                    </div>
                    <Button 
                      className="mt-4 w-full" 
                      variant="outline"
                      onClick={() => window.print()}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print Label
                    </Button>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Select an order that's ready to pack from the Overview tab
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}