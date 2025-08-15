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

interface BundleItem {
  id: string;
  name: string;
  colorNumber?: string;
  quantity: number;
  picked: boolean;
  location?: string;
}

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
  isBundle?: boolean;
  bundleItems?: BundleItem[];
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
  const [packingTimer, setPackingTimer] = useState(0);
  const [isPackingTimerRunning, setIsPackingTimerRunning] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [currentEmployee] = useState('Employee #001');
  const [pickingTimer, setPickingTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showMobileProgress, setShowMobileProgress] = useState(false);
  const [showPerformanceStats, setShowPerformanceStats] = useState(false);
  const [batchPickingMode, setBatchPickingMode] = useState(false);
  const [selectedBatchItems, setSelectedBatchItems] = useState<Set<string>>(new Set());
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  
  // State for packing process
  const [packingChecklist, setPackingChecklist] = useState({
    itemsVerified: false,
    packingSlipIncluded: false,
    boxSealed: false,
    weightRecorded: false
  });
  const [selectedBoxSize, setSelectedBoxSize] = useState<string>('');
  const [packageWeight, setPackageWeight] = useState<string>('');
  const [verifiedItems, setVerifiedItems] = useState<Set<string>>(new Set());
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(new Set());
  const [bundlePickedItems, setBundlePickedItems] = useState<Record<string, Set<string>>>({}); // itemId -> Set of picked bundle item ids

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

  // Generate bundle items for gel polish products
  const generateBundleItems = (productName: string, location: string): BundleItem[] | undefined => {
    const lowerName = productName.toLowerCase();
    
    // Check if it's a gel polish set or color collection
    if (lowerName.includes('gel polish') || lowerName.includes('nail polish') || lowerName.includes('color set')) {
      const colors = [
        { name: 'Ruby Red', colorNumber: '001' },
        { name: 'Ocean Blue', colorNumber: '002' },
        { name: 'Forest Green', colorNumber: '003' },
        { name: 'Sunset Orange', colorNumber: '004' },
        { name: 'Lavender Purple', colorNumber: '005' },
        { name: 'Midnight Black', colorNumber: '006' },
        { name: 'Pearl White', colorNumber: '007' },
        { name: 'Rose Gold', colorNumber: '008' },
        { name: 'Teal Turquoise', colorNumber: '009' },
        { name: 'Coral Pink', colorNumber: '010' },
        { name: 'Silver Shimmer', colorNumber: '011' },
        { name: 'Golden Yellow', colorNumber: '012' }
      ];
      
      // Determine number of colors based on product name
      const numColors = lowerName.match(/(\d+)\s*color/)?.[1] ? 
        Math.min(parseInt(lowerName.match(/(\d+)\s*color/)?.[1] || '6'), 12) : 6;
      
      return colors.slice(0, numColors).map((color, index) => ({
        id: `bundle-${Math.random().toString(36).substr(2, 9)}`,
        name: color.name,
        colorNumber: color.colorNumber,
        quantity: 1,
        picked: false,
        location: `${location}-${index + 1}`
      }));
    }
    
    // Check if it's a brush set or tool kit
    if (lowerName.includes('brush set') || lowerName.includes('tool kit')) {
      const tools = [
        { name: 'Fine Detail Brush' },
        { name: 'Flat Brush' },
        { name: 'Dotting Tool' },
        { name: 'Striping Brush' },
        { name: 'Fan Brush' },
        { name: 'Cleanup Brush' },
        { name: 'Ombre Brush' }
      ];
      
      const numTools = lowerName.match(/(\d+)\s*(pc|piece|pcs)/)?.[1] ? 
        Math.min(parseInt(lowerName.match(/(\d+)\s*(pc|piece|pcs)/)?.[1] || '5'), 7) : 5;
      
      return tools.slice(0, numTools).map((tool, index) => ({
        id: `bundle-${Math.random().toString(36).substr(2, 9)}`,
        name: tool.name,
        quantity: 1,
        picked: false,
        location: `${location}-${String.fromCharCode(65 + index)}`
      }));
    }
    
    return undefined;
  };

  // Mock orders for testing different statuses
  const mockOrders: PickPackOrder[] = [
    // Pending orders
    {
      id: 'mock-pending-1',
      orderId: 'ORD-MOCK-001',
      customerName: 'Sarah Johnson',
      shippingMethod: 'Express',
      shippingAddress: '789 Pine St, Seattle, WA 98101',
      priority: 'high',
      status: 'to_fulfill',
      pickStatus: 'not_started',
      packStatus: 'not_started',
      items: [
        {
          id: 'mock-item-1',
          productId: 'mock-prod-1',
          productName: 'Gel Polish 12 Color Set - Spring Collection',
          sku: 'GP-SPRING-12',
          quantity: 1,
          pickedQuantity: 0,
          packedQuantity: 0,
          warehouseLocation: 'A-15-2',
          barcode: 'BAR123456789',
          image: generateMockImage('gel-polish-set'),
          isBundle: true,
          bundleItems: [
            { id: 'sp1', name: 'Cherry Blossom', colorNumber: '101', quantity: 1, picked: false, location: 'A-15-2-1' },
            { id: 'sp2', name: 'Sky Blue', colorNumber: '102', quantity: 1, picked: false, location: 'A-15-2-2' },
            { id: 'sp3', name: 'Mint Green', colorNumber: '103', quantity: 1, picked: false, location: 'A-15-2-3' },
            { id: 'sp4', name: 'Peach Sunset', colorNumber: '104', quantity: 1, picked: false, location: 'A-15-2-4' },
            { id: 'sp5', name: 'Lilac Dream', colorNumber: '105', quantity: 1, picked: false, location: 'A-15-2-5' },
            { id: 'sp6', name: 'Sunshine Yellow', colorNumber: '106', quantity: 1, picked: false, location: 'A-15-2-6' },
            { id: 'sp7', name: 'Cotton Candy', colorNumber: '107', quantity: 1, picked: false, location: 'A-15-2-7' },
            { id: 'sp8', name: 'Ocean Wave', colorNumber: '108', quantity: 1, picked: false, location: 'A-15-2-8' },
            { id: 'sp9', name: 'Forest Moss', colorNumber: '109', quantity: 1, picked: false, location: 'A-15-2-9' },
            { id: 'sp10', name: 'Coral Reef', colorNumber: '110', quantity: 1, picked: false, location: 'A-15-2-10' },
            { id: 'sp11', name: 'Silver Moon', colorNumber: '111', quantity: 1, picked: false, location: 'A-15-2-11' },
            { id: 'sp12', name: 'Rose Garden', colorNumber: '112', quantity: 1, picked: false, location: 'A-15-2-12' }
          ]
        },
        {
          id: 'mock-item-2',
          productId: 'mock-prod-2',
          productName: 'UV LED Lamp 48W',
          sku: 'LAMP-48W',
          quantity: 1,
          pickedQuantity: 0,
          packedQuantity: 0,
          warehouseLocation: 'B-10-1',
          barcode: 'BAR987654321',
          image: generateMockImage('uv-lamp')
        }
      ],
      totalItems: 2,
      pickedItems: 0,
      packedItems: 0,
      createdAt: new Date().toISOString(),
      notes: 'Customer requested gift wrapping'
    },
    {
      id: 'mock-pending-2',
      orderId: 'ORD-MOCK-002',
      customerName: 'Michael Chen',
      shippingMethod: 'Standard',
      shippingAddress: '456 Elm Ave, Portland, OR 97201',
      priority: 'medium',
      status: 'to_fulfill',
      pickStatus: 'not_started',
      packStatus: 'not_started',
      items: [
        {
          id: 'mock-item-3',
          productId: 'mock-prod-3',
          productName: 'Nail Art Brush Set 7pcs Professional',
          sku: 'BRUSH-PRO-7',
          quantity: 1,
          pickedQuantity: 0,
          packedQuantity: 0,
          warehouseLocation: 'C-05-3',
          barcode: 'BAR456789123',
          image: generateMockImage('brush-set'),
          isBundle: true,
          bundleItems: [
            { id: 'br1', name: 'Ultra Fine Detail', quantity: 1, picked: false, location: 'C-05-3-A' },
            { id: 'br2', name: 'Flat Square', quantity: 1, picked: false, location: 'C-05-3-B' },
            { id: 'br3', name: 'Double Dotting', quantity: 1, picked: false, location: 'C-05-3-C' },
            { id: 'br4', name: 'Long Striping', quantity: 1, picked: false, location: 'C-05-3-D' },
            { id: 'br5', name: 'Angular', quantity: 1, picked: false, location: 'C-05-3-E' },
            { id: 'br6', name: 'Fan Brush', quantity: 1, picked: false, location: 'C-05-3-F' },
            { id: 'br7', name: 'Clean Up', quantity: 1, picked: false, location: 'C-05-3-G' }
          ]
        }
      ],
      totalItems: 1,
      pickedItems: 0,
      packedItems: 0,
      createdAt: new Date().toISOString()
    },
    // Currently picking order
    {
      id: 'mock-picking-1',
      orderId: 'ORD-MOCK-003',
      customerName: 'Emma Wilson',
      shippingMethod: 'Express',
      shippingAddress: '321 Oak Blvd, San Francisco, CA 94102',
      priority: 'high',
      status: 'picking',
      pickStatus: 'in_progress',
      packStatus: 'not_started',
      items: [
        {
          id: 'mock-item-4',
          productId: 'mock-prod-4',
          productName: 'Gel Polish 6 Color Set - Neon Edition',
          sku: 'GP-NEON-6',
          quantity: 1,
          pickedQuantity: 0,
          packedQuantity: 0,
          warehouseLocation: 'D-20-5',
          barcode: 'BAR111222333',
          image: generateMockImage('neon-polish'),
          isBundle: true,
          bundleItems: [
            { id: 'ne1', name: 'Electric Pink', colorNumber: '201', quantity: 1, picked: false, location: 'D-20-5-1' },
            { id: 'ne2', name: 'Neon Green', colorNumber: '202', quantity: 1, picked: false, location: 'D-20-5-2' },
            { id: 'ne3', name: 'Hot Orange', colorNumber: '203', quantity: 1, picked: false, location: 'D-20-5-3' },
            { id: 'ne4', name: 'Cyber Yellow', colorNumber: '204', quantity: 1, picked: false, location: 'D-20-5-4' },
            { id: 'ne5', name: 'UV Purple', colorNumber: '205', quantity: 1, picked: false, location: 'D-20-5-5' },
            { id: 'ne6', name: 'Laser Blue', colorNumber: '206', quantity: 1, picked: false, location: 'D-20-5-6' }
          ]
        },
        {
          id: 'mock-item-5',
          productId: 'mock-prod-5',
          productName: 'Base & Top Coat Set',
          sku: 'BT-SET-2',
          quantity: 2,
          pickedQuantity: 1,
          packedQuantity: 0,
          warehouseLocation: 'E-08-2',
          barcode: 'BAR444555666',
          image: generateMockImage('base-top-coat')
        }
      ],
      totalItems: 3,
      pickedItems: 1,
      packedItems: 0,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      pickStartTime: new Date(Date.now() - 1800000).toISOString(),
      pickedBy: 'John Warehouse'
    },
    // Currently packing order
    {
      id: 'mock-packing-1',
      orderId: 'ORD-MOCK-004',
      customerName: 'David Martinez',
      shippingMethod: 'Standard',
      shippingAddress: '555 Market St, Los Angeles, CA 90001',
      priority: 'medium',
      status: 'packing',
      pickStatus: 'completed',
      packStatus: 'in_progress',
      items: [
        {
          id: 'mock-item-6',
          productId: 'mock-prod-6',
          productName: 'Nail Polish Remover 500ml',
          sku: 'REM-500',
          quantity: 3,
          pickedQuantity: 3,
          packedQuantity: 2,
          warehouseLocation: 'F-12-4',
          barcode: 'BAR777888999',
          image: generateMockImage('remover')
        },
        {
          id: 'mock-item-7',
          productId: 'mock-prod-7',
          productName: 'Cotton Pads 200pcs',
          sku: 'COTTON-200',
          quantity: 2,
          pickedQuantity: 2,
          packedQuantity: 2,
          warehouseLocation: 'G-03-1',
          barcode: 'BAR000111222',
          image: generateMockImage('cotton-pads')
        }
      ],
      totalItems: 5,
      pickedItems: 5,
      packedItems: 4,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      pickStartTime: new Date(Date.now() - 5400000).toISOString(),
      pickEndTime: new Date(Date.now() - 3600000).toISOString(),
      packStartTime: new Date(Date.now() - 1800000).toISOString(),
      pickedBy: 'John Warehouse',
      packedBy: 'Mary Packer'
    },
    // Ready to ship order
    {
      id: 'mock-ready-1',
      orderId: 'ORD-MOCK-005',
      customerName: 'Lisa Anderson',
      shippingMethod: 'Express',
      shippingAddress: '999 Broadway, New York, NY 10010',
      priority: 'low',
      status: 'ready_to_ship',
      pickStatus: 'completed',
      packStatus: 'completed',
      items: [
        {
          id: 'mock-item-8',
          productId: 'mock-prod-8',
          productName: 'Cuticle Oil Set 5x15ml',
          sku: 'OIL-SET-5',
          quantity: 1,
          pickedQuantity: 1,
          packedQuantity: 1,
          warehouseLocation: 'H-18-6',
          barcode: 'BAR333444555',
          image: generateMockImage('cuticle-oil')
        }
      ],
      totalItems: 1,
      pickedItems: 1,
      packedItems: 1,
      createdAt: new Date(Date.now() - 14400000).toISOString(),
      pickStartTime: new Date(Date.now() - 10800000).toISOString(),
      pickEndTime: new Date(Date.now() - 9000000).toISOString(),
      packStartTime: new Date(Date.now() - 7200000).toISOString(),
      packEndTime: new Date(Date.now() - 5400000).toISOString(),
      pickedBy: 'John Warehouse',
      packedBy: 'Mary Packer'
    }
  ];

  // Transform real orders to PickPackOrder format - Only include "To Fulfill" status orders
  const transformedOrders: PickPackOrder[] = [
    ...mockOrders,
    ...((allOrders as any[] || [])
    .filter((order: any) => 
      order.orderStatus === 'to_fulfill'
    )
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
      items: order.items?.map((item: any) => {
        const warehouseLocation = item.warehouseLocation || generateMockLocation();
        const bundleItems = generateBundleItems(item.productName, warehouseLocation);
        
        return {
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          pickedQuantity: item.pickedQuantity || 0,
          packedQuantity: item.packedQuantity || 0,
          warehouseLocation: warehouseLocation,
          barcode: item.barcode || generateMockBarcode(item.sku),
          image: item.image || generateMockImage(item.productName),
          isBundle: !!bundleItems,
          bundleItems: bundleItems
        };
      }) || [],
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
    }))
  )];

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

  // Quick Action: Start Next Priority Order
  const startNextPriorityOrder = () => {
    // Find the highest priority pending order
    const pendingOrders = transformedOrders.filter(o => o.pickStatus === 'not_started');
    const priorityOrder = pendingOrders.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    })[0];

    if (priorityOrder) {
      startPicking(priorityOrder);
      toast({
        title: "Priority Order Started",
        description: `Started picking high priority order ${priorityOrder.orderId}`,
      });
    } else {
      toast({
        title: "No Pending Orders",
        description: "There are no orders ready to be picked",
        variant: "destructive"
      });
    }
  };

  // Quick Action: Toggle Batch Picking Mode
  const toggleBatchPickingMode = () => {
    setBatchPickingMode(!batchPickingMode);
    setSelectedBatchItems(new Set());
    toast({
      title: batchPickingMode ? "Batch Mode Disabled" : "Batch Mode Enabled",
      description: batchPickingMode 
        ? "Switched back to single order picking" 
        : "Select multiple orders to pick together",
    });
  };

  // Quick Action: Optimize Pick Route
  const optimizePickRoute = () => {
    if (!activePickingOrder) {
      toast({
        title: "No Active Order",
        description: "Start picking an order first to optimize the route",
        variant: "destructive"
      });
      return;
    }

    // Sort items by warehouse location for optimal route
    const sortedItems = [...activePickingOrder.items].sort((a, b) => {
      const locA = a.warehouseLocation || '';
      const locB = b.warehouseLocation || '';
      return locA.localeCompare(locB);
    });

    const optimizedOrder = {
      ...activePickingOrder,
      items: sortedItems
    };

    setActivePickingOrder(optimizedOrder);
    toast({
      title: "Route Optimized",
      description: "Items reordered for the most efficient picking path",
    });
  };

  // Quick Action: Toggle Performance Stats
  const togglePerformanceStats = () => {
    setShowPerformanceStats(!showPerformanceStats);
  };

  // Recent Activity Component
  const RecentActivityList = ({ orders }: { orders: PickPackOrder[] }) => {
    // Generate today's activities based on order data
    const todayActivities = [];
    const now = new Date();
    const today = now.toDateString();
    
    // Add completed orders
    const completedToday = orders.filter(o => 
      o.pickStatus === 'completed' && o.packStatus === 'completed'
    );
    
    completedToday.forEach(order => {
      todayActivities.push({
        type: 'completed',
        orderId: order.orderId,
        time: '2h ago',
        user: order.packedBy || 'Employee',
        icon: CheckCircle,
        color: 'text-green-600'
      });
    });
    
    // Add orders currently being picked
    const pickingOrders = orders.filter(o => o.pickStatus === 'in_progress');
    pickingOrders.forEach(order => {
      todayActivities.push({
        type: 'picking',
        orderId: order.orderId,
        time: '30m ago',
        user: order.pickedBy || 'Employee',
        icon: Package,
        color: 'text-blue-600'
      });
    });
    
    // Add orders being packed
    const packingOrders = orders.filter(o => o.packStatus === 'in_progress');
    packingOrders.forEach(order => {
      todayActivities.push({
        type: 'packing',
        orderId: order.orderId,
        time: '15m ago',
        user: order.packedBy || 'Employee',
        icon: Box,
        color: 'text-purple-600'
      });
    });
    
    // If we have some activities today, add a summary
    if (completedToday.length > 2) {
      todayActivities.push({
        type: 'summary',
        orderId: '',
        time: '3h ago',
        user: '',
        icon: Truck,
        color: 'text-orange-600',
        summary: `${completedToday.length} orders shipped today`
      });
    }
    
    // Limit to 5 most recent activities
    const displayActivities = todayActivities.slice(0, 5);
    
    if (displayActivities.length === 0) {
      return (
        <div className="text-center py-6">
          <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No activity today yet</p>
          <p className="text-xs text-gray-400 mt-1">Activities will appear as orders are processed</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {displayActivities.map((activity, index) => {
          const Icon = activity.icon;
          return (
            <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <Icon className={`h-3 sm:h-4 w-3 sm:w-4 ${activity.color} flex-shrink-0`} />
                <span className="truncate">
                  {activity.type === 'completed' && `${activity.orderId} completed by ${activity.user}`}
                  {activity.type === 'picking' && `${activity.orderId} being picked by ${activity.user}`}
                  {activity.type === 'packing' && `${activity.orderId} being packed by ${activity.user}`}
                  {activity.type === 'summary' && activity.summary}
                </span>
              </div>
              <span className="text-gray-500 sm:ml-auto pl-5 sm:pl-0">{activity.time}</span>
            </div>
          );
        })}
      </div>
    );
  };

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
    // Keep order status as "to_fulfill" but update pick status
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
      setIsTimerRunning(false); // Stop the timer when all items are picked
      playSound('success');
      toast({
        title: "All Items Picked!",
        description: "You can now complete the picking process",
      });
    }
  };

  // Complete picking
  const completePicking = async () => {
    if (!activePickingOrder) return;

    // Keep order status as "to_fulfill" but update pick status
    await updateOrderStatusMutation.mutateAsync({
      orderId: activePickingOrder.id,
      status: 'to_fulfill',
      pickStatus: 'completed',
      packStatus: 'not_started'
    });

    const updatedOrder = {
      ...activePickingOrder,
      pickStatus: 'completed' as const,
      pickEndTime: new Date().toISOString(),
      status: 'to_fulfill' as const
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

  // Start packing an order
  const startPacking = async (order: PickPackOrder) => {
    // Keep order status as "to_fulfill" but update pack status
    if (order.packStatus !== 'in_progress') {
      await updateOrderStatusMutation.mutateAsync({
        orderId: order.id,
        status: 'to_fulfill',
        packStatus: 'in_progress',
        packedBy: currentEmployee
      });
    }

    const updatedOrder = {
      ...order,
      packStatus: 'in_progress' as const,
      packStartTime: new Date().toISOString(),
      packedBy: currentEmployee
    };
    setActivePackingOrder(updatedOrder);
    setPackingTimer(0);
    setIsPackingTimerRunning(true);
    playSound('success');
    toast({
      title: "Packing Started",
      description: `Started packing order ${order.orderId}`,
    });
  };

  // Complete packing
  const completePacking = async () => {
    if (!activePackingOrder) return;

    // Update order status to "shipped" when packing is complete
    await updateOrderStatusMutation.mutateAsync({
      orderId: activePackingOrder.id,
      status: 'shipped',
      packStatus: 'completed'
    });

    const updatedOrder = {
      ...activePackingOrder,
      packStatus: 'completed' as const,
      packEndTime: new Date().toISOString(),
      status: 'shipped' as const
    };

    setIsPackingTimerRunning(false);
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    toast({
      title: "Packing Completed",
      description: `Order ${updatedOrder.orderId} is ready to ship`,
    });
    playSound('success');
    setActivePackingOrder(null);
    setSelectedTab('ready');
  };

  // Mark order as shipped
  const markAsShipped = async (order: PickPackOrder) => {
    await updateOrderStatusMutation.mutateAsync({
      orderId: order.id,
      status: 'shipped'
    });

    toast({
      title: "Order Shipped",
      description: `Order ${order.orderId} has been marked as shipped`,
    });
    playSound('success');
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
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

  // Filter orders by status - Updated to work with "to_fulfill" orders
  const getOrdersByStatus = (status: string) => {
    return transformedOrders.filter(order => {
      if (status === 'pending') return order.status === 'to_fulfill' && order.pickStatus === 'not_started';
      if (status === 'picking') return order.status === 'picking' || order.pickStatus === 'in_progress';
      if (status === 'packing') return order.status === 'packing' || (order.pickStatus === 'completed' && order.packStatus !== 'completed');
      if (status === 'ready') return order.status === 'ready_to_ship' || order.packStatus === 'completed';
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



  // Active Packing View - Full Screen
  if (activePackingOrder) {
    const progress = (activePackingOrder.packedItems / activePackingOrder.totalItems) * 100;
    const allItemsVerified = verifiedItems.size === activePackingOrder.items.length;
    const allChecklistComplete = Object.values(packingChecklist).every(v => v === true);
    const canCompletePacking = allItemsVerified && allChecklistComplete && selectedBoxSize && packageWeight;
    
    // Stop timer when packing is complete
    if (canCompletePacking && isPackingTimerRunning) {
      setIsPackingTimerRunning(false);
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex flex-col">
        {/* Header - Packing Mode */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg sticky top-0 z-20">
          <div className="px-3 lg:px-4 py-2 lg:py-3">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 bg-white/20 hover:bg-white/30 text-white"
                onClick={() => {
                  setActivePackingOrder(null);
                  setIsPackingTimerRunning(false);
                  setPackingChecklist({
                    itemsVerified: false,
                    packingSlipIncluded: false,
                    boxSealed: false,
                    weightRecorded: false
                  });
                  setSelectedBoxSize('');
                  setPackageWeight('');
                  setVerifiedItems(new Set());
                }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="ml-1 text-xs">Exit</span>
              </Button>
              
              <div className="flex-1 text-center">
                <div className="text-base font-bold">{activePackingOrder.orderId}</div>
                <Badge className="text-[10px] px-2 py-0 bg-purple-500 text-white">
                  PACKING MODE
                </Badge>
              </div>
              
              <div className="flex items-center gap-1">
                <div className="text-right">
                  <div className="font-mono text-sm font-bold">{formatTimer(packingTimer)}</div>
                  <div className="text-[10px] text-purple-100">Time</div>
                </div>
                <Button
                  size="icon"
                  className="h-6 w-6 bg-white/20 hover:bg-white/30"
                  onClick={() => setIsPackingTimerRunning(!isPackingTimerRunning)}
                >
                  {isPackingTimerRunning ? (
                    <PauseCircle className="h-3 w-3 text-orange-300" />
                  ) : (
                    <PlayCircle className="h-3 w-3 text-green-300" />
                  )}
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-purple-100">Packing Progress</span>
                <span className="font-bold text-white">{verifiedItems.size}/{activePackingOrder.totalItems} items verified</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-pink-400 to-purple-400 transition-all duration-500"
                  style={{ width: `${(verifiedItems.size / activePackingOrder.totalItems) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 sm:p-4 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {/* Left Column - Items Verification */}
              <Card className="shadow-xl border-0">
                <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ScanLine className="h-5 w-5" />
                      Item Verification
                    </span>
                    <Badge className="bg-white text-purple-600">
                      {verifiedItems.size}/{activePackingOrder.items.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {/* Barcode Scanner Input */}
                  <div className="mb-4">
                    <div className="flex gap-2">
                      <Input
                        ref={barcodeInputRef}
                        type="text"
                        placeholder="Scan item barcode..."
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            // Find matching item
                            const matchingItem = activePackingOrder.items.find(
                              item => item.barcode === barcodeInput || item.sku === barcodeInput
                            );
                            if (matchingItem) {
                              setVerifiedItems(new Set([...verifiedItems, matchingItem.id]));
                              playSound('scan');
                              toast({
                                title: "Item Verified",
                                description: matchingItem.productName,
                              });
                            } else {
                              playSound('error');
                              toast({
                                title: "Item Not Found",
                                description: "This item is not in the current order",
                                variant: "destructive"
                              });
                            }
                            setBarcodeInput('');
                          }
                        }}
                        className="text-lg font-mono"
                      />
                      <Button variant="outline" size="icon">
                        <ScanLine className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Order Items List */}
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {activePackingOrder.items.map((item, index) => {
                        const isVerified = verifiedItems.has(item.id);
                        return (
                          <div 
                            key={item.id} 
                            className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                              isVerified 
                                ? 'bg-green-50 border-green-300' 
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                isVerified 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-purple-100 text-purple-600'
                              }`}>
                                {isVerified ? <CheckCircle className="h-5 w-5" /> : index + 1}
                              </div>
                              <div>
                                <p className="font-medium">{item.productName}</p>
                                <p className="text-sm text-gray-500">SKU: {item.sku} | Qty: {item.quantity}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant={isVerified ? "default" : "outline"}
                              onClick={() => {
                                if (isVerified) {
                                  setVerifiedItems(new Set([...verifiedItems].filter(id => id !== item.id)));
                                } else {
                                  setVerifiedItems(new Set([...verifiedItems, item.id]));
                                  playSound('scan');
                                }
                              }}
                            >
                              {isVerified ? 'Verified' : 'Verify'}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Right Column - Packing Details */}
              <div className="space-y-4">
                {/* Box Selection */}
                <Card className="shadow-xl border-0">
                  <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    <CardTitle className="text-base">Box Selection</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-2">
                      {['Small (10x10x10)', 'Medium (15x15x15)', 'Large (20x20x20)', 'X-Large (25x25x25)'].map(size => (
                        <Button
                          key={size}
                          variant={selectedBoxSize === size ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedBoxSize(size)}
                          className="text-xs"
                        >
                          {size.split(' ')[0]}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Weight Input */}
                <Card className="shadow-xl border-0">
                  <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    <CardTitle className="text-base">Package Weight</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Enter weight..."
                        value={packageWeight}
                        onChange={(e) => {
                          setPackageWeight(e.target.value);
                          if (e.target.value) {
                            setPackingChecklist({...packingChecklist, weightRecorded: true});
                          }
                        }}
                        className="text-lg"
                      />
                      <span className="flex items-center px-3 text-sm font-medium">kg</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Packing Checklist */}
                <Card className="shadow-xl border-0">
                  <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    <CardTitle className="text-base">Packing Checklist</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <Checkbox 
                          checked={allItemsVerified}
                          onCheckedChange={(checked) => setPackingChecklist({...packingChecklist, itemsVerified: !!checked})}
                        />
                        <span className={allItemsVerified ? 'text-green-600 font-medium' : ''}>
                          All items verified and placed in box
                        </span>
                      </label>
                      <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <Checkbox 
                          checked={packingChecklist.packingSlipIncluded}
                          onCheckedChange={(checked) => setPackingChecklist({...packingChecklist, packingSlipIncluded: !!checked})}
                        />
                        <span className={packingChecklist.packingSlipIncluded ? 'text-green-600 font-medium' : ''}>
                          Packing slip included
                        </span>
                      </label>
                      <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <Checkbox 
                          checked={packingChecklist.boxSealed}
                          onCheckedChange={(checked) => setPackingChecklist({...packingChecklist, boxSealed: !!checked})}
                        />
                        <span className={packingChecklist.boxSealed ? 'text-green-600 font-medium' : ''}>
                          Box sealed and labeled
                        </span>
                      </label>
                      <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <Checkbox 
                          checked={packingChecklist.weightRecorded}
                          onCheckedChange={(checked) => setPackingChecklist({...packingChecklist, weightRecorded: !!checked})}
                        />
                        <span className={packingChecklist.weightRecorded ? 'text-green-600 font-medium' : ''}>
                          Weight recorded
                        </span>
                      </label>
                    </div>
                  </CardContent>
                </Card>

                {/* Complete Packing Button */}
                {canCompletePacking ? (
                  <Card className="shadow-2xl border-0 overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-1"></div>
                    <CardContent className="p-4 text-center">
                      <div className="bg-gradient-to-br from-purple-400 to-pink-400 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center shadow-xl animate-bounce">
                        <CheckCircle className="h-10 w-10 text-white" />
                      </div>
                      <h3 className="text-xl font-black mb-2 text-gray-800">Ready to Ship!</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        All items verified and packed
                      </p>
                      
                      <div className="bg-white rounded-lg p-3 mb-4 shadow-inner">
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-gray-500">Time</p>
                            <p className="font-bold text-purple-600">{formatTimer(packingTimer)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Box</p>
                            <p className="font-bold text-pink-600">{selectedBoxSize.split(' ')[0]}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Weight</p>
                            <p className="font-bold text-purple-600">{packageWeight} kg</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Button 
                          size="lg" 
                          onClick={() => {
                            completePacking();
                            // Reset states
                            setPackingChecklist({
                              itemsVerified: false,
                              packingSlipIncluded: false,
                              boxSealed: false,
                              weightRecorded: false
                            });
                            setSelectedBoxSize('');
                            setPackageWeight('');
                            setVerifiedItems(new Set());
                          }}
                          className="w-full h-12 text-base font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-xl"
                        >
                          <Printer className="h-5 w-5 mr-2" />
                          PRINT LABEL & COMPLETE
                        </Button>
                        
                        <Button 
                          size="lg" 
                          variant="outline"
                          onClick={() => {
                            completePacking();
                            // Reset states and start next order
                            setPackingChecklist({
                              itemsVerified: false,
                              packingSlipIncluded: false,
                              boxSealed: false,
                              weightRecorded: false
                            });
                            setSelectedBoxSize('');
                            setPackageWeight('');
                            setVerifiedItems(new Set());
                            
                            // Find next order to pack
                            setTimeout(() => {
                              const nextOrder = getOrdersByStatus('packing')[0];
                              if (nextOrder) {
                                startPacking(nextOrder);
                              } else {
                                toast({
                                  title: "No More Orders",
                                  description: "All orders have been packed!",
                                });
                              }
                            }, 500);
                          }}
                          className="w-full h-12 text-base font-bold border-2 border-purple-600 text-purple-600 hover:bg-purple-50"
                        >
                          <PlayCircle className="h-5 w-5 mr-2" />
                          PACK NEXT ORDER
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Button 
                    size="lg" 
                    disabled={true}
                    className="w-full h-14 text-lg font-bold bg-gray-300 text-gray-500 cursor-not-allowed"
                  >
                    <PackageCheck className="h-6 w-6 mr-3" />
                    Complete Checklist ({verifiedItems.size}/{activePackingOrder.items.length} items)
                  </Button>
                )}
              </div>
            </div>
          </div>
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
        {/* Header - Optimized for Mobile */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg sticky top-0 z-20">
          <div className="px-3 lg:px-4 py-2 lg:py-3">
            {/* Mobile Layout - Clean and Organized */}
            <div className="lg:hidden">
              {/* Ultra Compact Mobile Header */}
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white touch-manipulation"
                  onClick={() => {
                    setActivePickingOrder(null);
                    setIsTimerRunning(false);
                  }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span className="ml-1 text-xs">Exit</span>
                </Button>
                
                <div className="flex-1 text-center min-w-0">
                  <div className="text-base font-bold truncate">{activePickingOrder.orderId}</div>
                  <Badge 
                    className={`text-[10px] px-2 py-0 ${
                      activePickingOrder.priority === 'high' ? 'bg-red-500 text-white' : 
                      activePickingOrder.priority === 'medium' ? 'bg-amber-500 text-white' : 
                      'bg-green-500 text-white'
                    }`}
                  >
                    {activePickingOrder.priority.toUpperCase()} PRIORITY
                  </Badge>
                </div>
                
                <div className="flex items-center gap-1">
                  <div className="text-right">
                    <div className="font-mono text-sm font-bold tabular-nums">{formatTimer(pickingTimer)}</div>
                    <div className="text-[10px] text-blue-100">Time</div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <Button
                      size="icon"
                      className="h-6 w-6 bg-white/20 hover:bg-white/30 active:bg-white/40 touch-manipulation"
                      onClick={() => setIsTimerRunning(!isTimerRunning)}
                    >
                      {isTimerRunning ? (
                        <PauseCircle className="h-3 w-3 text-orange-300" />
                      ) : (
                        <PlayCircle className="h-3 w-3 text-green-300" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      className="h-6 w-6 bg-white/20 hover:bg-white/30 active:bg-white/40 touch-manipulation"
                      onClick={() => setAudioEnabled(!audioEnabled)}
                    >
                      <Volume2 className={`h-3 w-3 ${audioEnabled ? 'text-yellow-300' : 'text-white/50'}`} />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Compact Customer & Progress */}
              <div className="mt-2">
                <div className="text-center text-[10px] text-blue-200 mb-1 truncate">
                  {activePickingOrder.customerName}
                </div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-blue-100">Progress</span>
                  <span className="font-bold text-white">{activePickingOrder.pickedItems}/{activePickingOrder.totalItems} items</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-400 to-emerald-400 transition-all duration-500 ease-out rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* Desktop Layout - Keep existing */}
            <div className="hidden lg:block">
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
        </div>

        {/* Main Content - Scrollable container */}
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col lg:flex-row min-h-full">
            {/* Left Panel - Current Item Focus */}
            <div className="flex-1 p-3 lg:p-6">
            {currentItem ? (
              <div className="max-w-4xl mx-auto">
                <Card className="mb-4 lg:mb-6 shadow-xl border-0 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-3 lg:p-4">
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-base lg:text-lg flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        <span className="hidden sm:inline">Current Item to Pick</span>
                        <span className="sm:hidden">Pick Item</span>
                      </span>
                      <Badge className="bg-white text-blue-600 text-sm lg:text-base px-2 lg:px-3 py-1 font-bold">
                        {currentItemIndex + 1} / {activePickingOrder.items.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 lg:p-6 bg-white">
                    <div className="space-y-3 lg:space-y-6">
                      {/* Mobile Optimized Product Layout */}
                      <div className="flex flex-col sm:grid sm:grid-cols-2 lg:flex lg:flex-row lg:gap-6 gap-3">
                        {/* Product Image - Smaller on mobile */}
                        <div className="relative mx-auto sm:mx-0">
                          <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg border-2 lg:border-4 border-white">
                            {currentItem.image ? (
                              <img 
                                src={currentItem.image} 
                                alt={currentItem.productName}
                                className="w-full h-full object-contain rounded-lg p-1 lg:p-2"
                              />
                            ) : (
                              <Package className="h-12 lg:h-16 w-12 lg:w-16 text-gray-300" />
                            )}
                          </div>
                          <div className="absolute -top-1 -right-1 lg:-top-2 lg:-right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center font-bold text-sm lg:text-base shadow-lg">
                            {currentItemIndex + 1}
                          </div>
                        </div>
                        
                        {/* Product Details */}
                        <div className="flex-1 space-y-2 lg:space-y-3">
                          <h3 className="text-lg lg:text-2xl font-bold text-gray-800 line-clamp-2">{currentItem.productName}</h3>
                          
                          <div className="space-y-2">
                            <div className="bg-gray-50 rounded-lg p-2 lg:p-3 flex items-center gap-2">
                              <Hash className="h-4 lg:h-5 w-4 lg:w-5 text-blue-500 flex-shrink-0" />
                              <span className="text-xs lg:text-sm text-gray-600 font-medium">SKU:</span>
                              <span className="font-mono font-bold text-sm lg:text-base text-gray-800 truncate">{currentItem.sku}</span>
                            </div>
                            
                            <div className="bg-gray-50 rounded-lg p-2 lg:p-3 flex items-center gap-2">
                              <ScanLine className="h-4 lg:h-5 w-4 lg:w-5 text-purple-500 flex-shrink-0" />
                              <span className="text-xs lg:text-sm text-gray-600 font-medium">Barcode:</span>
                              <span className="font-mono font-bold text-sm lg:text-base text-gray-800 truncate">{currentItem.barcode}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Location - Mobile Optimized */}
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl lg:rounded-2xl p-3 lg:p-6 text-center shadow-lg">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <MapPin className="h-5 lg:h-8 w-5 lg:w-8 text-orange-500" />
                          <p className="text-xs lg:text-sm font-semibold text-orange-700 uppercase tracking-wide">Warehouse Location</p>
                        </div>
                        <p className="text-2xl sm:text-3xl lg:text-5xl font-black text-orange-600 font-mono tracking-wider">{currentItem.warehouseLocation}</p>
                        <p className="text-xs text-orange-600 mt-1">Navigate to this location</p>
                      </div>

                      {/* Bundle Items Picker - For gel polish colors etc */}
                      {currentItem.isBundle && currentItem.bundleItems && currentItem.bundleItems.length > 0 ? (
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl lg:rounded-2xl p-4 lg:p-8 border-3 border-purple-400 shadow-xl">
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-base lg:text-xl font-black text-purple-800 uppercase tracking-wider">Bundle Items</p>
                            <Badge className="bg-purple-600 text-white px-3 py-1">
                              {bundlePickedItems[currentItem.id]?.size || 0} / {currentItem.bundleItems.length} picked
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                            {currentItem.bundleItems.map((bundleItem) => {
                              const isPicked = bundlePickedItems[currentItem.id]?.has(bundleItem.id) || false;
                              
                              return (
                                <div
                                  key={bundleItem.id}
                                  className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                                    isPicked 
                                      ? 'bg-green-100 border-green-500 shadow-lg' 
                                      : 'bg-white border-gray-300 hover:border-purple-400 hover:shadow-md'
                                  }`}
                                  onClick={() => {
                                    const currentPicked = bundlePickedItems[currentItem.id] || new Set();
                                    const newPicked = new Set(currentPicked);
                                    
                                    if (isPicked) {
                                      newPicked.delete(bundleItem.id);
                                    } else {
                                      newPicked.add(bundleItem.id);
                                      // Play success sound if enabled
                                      if (audioEnabled) {
                                        const audio = new Audio('/success.mp3');
                                        audio.play().catch(() => {});
                                      }
                                    }
                                    
                                    setBundlePickedItems({
                                      ...bundlePickedItems,
                                      [currentItem.id]: newPicked
                                    });
                                    
                                    // Update the picked quantity based on bundle completion
                                    const allPicked = newPicked.size === currentItem.bundleItems.length;
                                    updatePickedItem(currentItem.id, allPicked ? currentItem.quantity : 0);
                                  }}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      {bundleItem.colorNumber && (
                                        <div className="text-xl font-bold text-purple-700 mb-1">
                                          #{bundleItem.colorNumber}
                                        </div>
                                      )}
                                      <div className="text-sm font-medium text-gray-800">
                                        {bundleItem.name}
                                      </div>
                                      {bundleItem.location && (
                                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                          <MapPin className="h-3 w-3" />
                                          {bundleItem.location}
                                        </div>
                                      )}
                                      <div className="text-xs text-gray-600 mt-1">
                                        Qty: {bundleItem.quantity}
                                      </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                      isPicked 
                                        ? 'bg-green-500 border-green-600' 
                                        : 'bg-white border-gray-400'
                                    }`}>
                                      {isPicked && <CheckCircle className="h-4 w-4 text-white" />}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          {bundlePickedItems[currentItem.id]?.size === currentItem.bundleItems.length && (
                            <Alert className="mt-4 bg-green-100 border-2 border-green-400 shadow-md">
                              <CheckCircle className="h-4 lg:h-5 w-4 lg:w-5 text-green-700" />
                              <AlertDescription className="text-green-800 font-semibold text-sm lg:text-base">
                                ✓ All bundle items picked! Ready for next item.
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {/* Quick Pick All Bundle Items */}
                          {(!bundlePickedItems[currentItem.id] || bundlePickedItems[currentItem.id].size < currentItem.bundleItems.length) && (
                            <Button 
                              size="lg" 
                              className="w-full mt-4 h-11 sm:h-12 lg:h-14 text-sm sm:text-base lg:text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
                              onClick={() => {
                                const allIds = new Set(currentItem.bundleItems.map(item => item.id));
                                setBundlePickedItems({
                                  ...bundlePickedItems,
                                  [currentItem.id]: allIds
                                });
                                updatePickedItem(currentItem.id, currentItem.quantity);
                                if (audioEnabled) {
                                  const audio = new Audio('/success.mp3');
                                  audio.play().catch(() => {});
                                }
                              }}
                            >
                              <CheckCircle2 className="h-4 sm:h-5 lg:h-6 w-4 sm:w-5 lg:w-6 mr-2 lg:mr-3" />
                              Quick Pick All Bundle Items
                            </Button>
                          )}
                        </div>
                      ) : (
                        /* Regular Quantity Picker - Enhanced Visibility */
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl lg:rounded-2xl p-4 lg:p-8 border-3 border-green-400 shadow-xl">
                          <p className="text-center text-base lg:text-xl font-black text-green-800 mb-4 uppercase tracking-wider">Pick Quantity</p>
                          <div className="flex items-center justify-center gap-3 sm:gap-4 lg:gap-8">
                            <Button
                              size="lg"
                              className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-xl lg:rounded-2xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white shadow-xl touch-manipulation transform hover:scale-110 transition-transform"
                              onClick={() => updatePickedItem(currentItem.id, Math.max(0, currentItem.pickedQuantity - 1))}
                              disabled={currentItem.pickedQuantity === 0}
                            >
                              <Minus className="h-6 lg:h-8 w-6 lg:w-8" />
                            </Button>
                            
                            <div className="text-center bg-white rounded-2xl px-6 sm:px-8 lg:px-12 py-3 sm:py-4 lg:py-6 shadow-2xl min-w-[140px] border-2 border-gray-300">
                              <div className="text-4xl sm:text-5xl lg:text-7xl font-black text-gray-900">
                                {currentItem.pickedQuantity}
                                <span className="text-2xl sm:text-3xl lg:text-4xl text-gray-500 ml-1">/{currentItem.quantity}</span>
                              </div>
                              <p className="text-sm lg:text-base font-bold text-gray-700 uppercase tracking-wider mt-1">Items</p>
                            </div>
                            
                            <Button
                              size="lg"
                              className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-xl lg:rounded-2xl bg-green-500 hover:bg-green-600 active:bg-green-700 text-white shadow-xl touch-manipulation transform hover:scale-110 transition-transform"
                              onClick={() => updatePickedItem(currentItem.id, Math.min(currentItem.quantity, currentItem.pickedQuantity + 1))}
                              disabled={currentItem.pickedQuantity >= currentItem.quantity}
                            >
                              <Plus className="h-6 lg:h-8 w-6 lg:w-8" />
                            </Button>
                          </div>
                          
                          {currentItem.pickedQuantity >= currentItem.quantity && (
                            <Alert className="mt-3 lg:mt-4 bg-green-100 border-2 border-green-400 shadow-md">
                              <CheckCircle className="h-4 lg:h-5 w-4 lg:w-5 text-green-700" />
                              <AlertDescription className="text-green-800 font-semibold text-sm lg:text-base">
                                ✓ Item fully picked! Ready for next item.
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Quick Pick Button - Mobile Optimized */}
                          {currentItem.pickedQuantity < currentItem.quantity && (
                            <Button 
                              size="lg" 
                              className="w-full mt-3 lg:mt-4 h-11 sm:h-12 lg:h-14 text-sm sm:text-base lg:text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 text-white shadow-lg touch-manipulation"
                              onClick={() => updatePickedItem(currentItem.id, currentItem.quantity)}
                            >
                              <CheckCircle2 className="h-4 sm:h-5 lg:h-6 w-4 sm:w-5 lg:w-6 mr-2 lg:mr-3" />
                              Quick Pick All ({currentItem.quantity} items)
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Barcode Scanner - Mobile Optimized */}
                <Card className="shadow-xl border-0 bg-gradient-to-r from-purple-500 to-indigo-500">
                  <CardContent className="p-2 sm:p-3 lg:p-5">
                    <div className="flex gap-2 lg:gap-3">
                      <div className="relative flex-1">
                        <ScanLine className="absolute left-2 sm:left-3 lg:left-4 top-1/2 -translate-y-1/2 h-4 sm:h-5 lg:h-6 w-4 sm:w-5 lg:w-6 text-white/70" />
                        <Input
                          ref={barcodeInputRef}
                          placeholder="Scan or enter barcode..."
                          value={barcodeInput}
                          onChange={(e) => setBarcodeInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleBarcodeScan()}
                          className="pl-8 sm:pl-10 lg:pl-12 text-sm sm:text-base lg:text-lg h-10 sm:h-12 lg:h-14 bg-white/95 border-white/30 placeholder:text-gray-500 font-mono"
                          autoFocus
                        />
                      </div>
                      <Button 
                        size="lg" 
                        onClick={handleBarcodeScan}
                        className="h-10 sm:h-12 lg:h-14 px-4 sm:px-6 lg:px-8 bg-white text-purple-600 hover:bg-gray-100 active:bg-gray-200 font-bold shadow-lg touch-manipulation"
                      >
                        <ScanLine className="h-4 lg:h-5 w-4 lg:w-5 sm:mr-2" />
                        <span className="hidden sm:inline">SCAN</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto px-3 lg:px-0">
                <Card className="shadow-2xl border-0 overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-1 lg:p-2"></div>
                  <CardContent className="p-6 sm:p-10 lg:p-16 text-center">
                    <div className="bg-gradient-to-br from-green-400 to-emerald-400 rounded-full w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 mx-auto mb-4 lg:mb-8 flex items-center justify-center shadow-xl animate-bounce">
                      <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 lg:h-20 lg:w-20 text-white" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-2 lg:mb-4 text-gray-800">
                      🎉 All Items Picked!
                    </h2>
                    <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-4 lg:mb-8">
                      Excellent work! You've successfully picked all {activePickingOrder.totalItems} items for order {activePickingOrder.orderId}
                    </p>
                    
                    <div className="bg-white rounded-xl p-4 lg:p-6 mb-4 lg:mb-8 shadow-inner">
                      <div className="grid grid-cols-3 gap-2 lg:gap-4">
                        <div>
                          <p className="text-xs lg:text-sm text-gray-500">Time</p>
                          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{formatTimer(pickingTimer)}</p>
                        </div>
                        <div>
                          <p className="text-xs lg:text-sm text-gray-500">Items</p>
                          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{activePickingOrder.totalItems}</p>
                        </div>
                        <div>
                          <p className="text-xs lg:text-sm text-gray-500">Score</p>
                          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">100%</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Button 
                        size="lg" 
                        onClick={completePicking}
                        className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-xl transform hover:scale-105 transition-all"
                      >
                        <PackageCheck className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 mr-2 lg:mr-3" />
                        PROCEED TO PACKING
                      </Button>
                      
                      <Button 
                        size="lg" 
                        variant="outline"
                        onClick={() => {
                          completePicking();
                          // After completing, immediately start the next priority order
                          setTimeout(() => {
                            const nextOrder = getOrdersByStatus('pending')[0];
                            if (nextOrder) {
                              startPicking(nextOrder);
                            } else {
                              toast({
                                title: "No More Orders",
                                description: "All orders have been picked!",
                              });
                            }
                          }, 500);
                        }}
                        className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl font-bold border-2 border-blue-600 text-blue-600 hover:bg-blue-50 shadow-lg"
                      >
                        <PlayCircle className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 mr-2 lg:mr-3" />
                        PICK NEXT ORDER
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Right Panel - Items List - Hidden on mobile, visible on desktop */}
          <div className="hidden lg:block w-80 xl:w-96 bg-gradient-to-b from-white to-gray-50 border-l-4 border-gray-200 p-4 xl:p-6 overflow-y-auto">
            <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-xl p-3 xl:p-4 mb-4 xl:mb-6 shadow-lg">
              <h3 className="font-bold text-base xl:text-lg mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-4 xl:h-5 w-4 xl:w-5" />
                  Order Items
                </span>
                <Badge className="bg-white text-gray-800 font-bold px-2 xl:px-3 py-1 text-sm">
                  {activePickingOrder.pickedItems}/{activePickingOrder.totalItems}
                </Badge>
              </h3>
              <div className="text-xs xl:text-sm text-gray-200">Track your picking progress</div>
            </div>
            
            <div className="space-y-2 xl:space-y-3">
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
                    <CardContent className="p-3 xl:p-4">
                      <div className="flex items-start gap-2 xl:gap-3">
                        <div className="mt-1">
                          {isPicked ? (
                            <div className="bg-green-500 rounded-full p-1">
                              <CheckCircle className="h-5 xl:h-6 w-5 xl:w-6 text-white" />
                            </div>
                          ) : isCurrent ? (
                            <div className="w-7 h-7 xl:w-8 xl:h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold animate-pulse text-sm">
                              {index + 1}
                            </div>
                          ) : (
                            <div className="w-7 h-7 xl:w-8 xl:h-8 rounded-full border-2 xl:border-3 border-gray-300 flex items-center justify-center text-xs xl:text-sm font-bold text-gray-600">
                              {index + 1}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-xs xl:text-sm truncate ${
                            isPicked ? 'text-green-700 line-through' : 
                            isCurrent ? 'text-blue-700' : 'text-gray-800'
                          }`}>
                            {item.productName}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">SKU: {item.sku}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className={`text-xs font-mono px-1 xl:px-2 py-1 rounded-lg font-bold ${
                              isCurrent ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              📍 {item.warehouseLocation}
                            </span>
                            <span className={`text-xs xl:text-sm font-bold ${
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
          
            {/* Mobile Items Drawer - Collapsible with Swipe Hint */}
            {showMobileProgress && (
              <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-300 max-h-56 overflow-y-auto shadow-2xl z-30 animate-slide-up">
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">Order Progress</span>
                      <span className="text-xs text-gray-500">Swipe to view →</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-gray-800 text-white text-xs px-2">
                        {activePickingOrder.pickedItems}/{activePickingOrder.totalItems}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 touch-manipulation"
                        onClick={() => setShowMobileProgress(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory">
                    {activePickingOrder.items.map((item, index) => {
                      const isPicked = item.pickedQuantity >= item.quantity;
                      const isCurrent = currentItem?.id === item.id;
                      
                      return (
                        <div
                          key={item.id}
                          className={`flex-shrink-0 w-32 p-2 rounded-lg border-2 snap-start transition-all transform active:scale-95 touch-manipulation ${
                            isPicked ? 'bg-green-50 border-green-400' :
                            isCurrent ? 'bg-blue-50 border-blue-500 shadow-lg' :
                            'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                          onClick={() => {
                            if (!isPicked) {
                              // Jump to item by focusing on barcode input
                              // The current item is determined by the first unpicked item
                              barcodeInputRef.current?.focus();
                              playSound('scan');
                            }
                          }}
                        >
                          <div className="flex items-center gap-1 mb-1">
                            {isPicked ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                                isCurrent ? 'bg-blue-500 text-white' : 'border-2 border-gray-300 text-gray-600'
                              }`}>
                                {index + 1}
                              </div>
                            )}
                            <span className="text-xs font-mono font-bold">{item.warehouseLocation}</span>
                          </div>
                          <p className="text-xs font-medium truncate">{item.productName}</p>
                          <p className="text-xs text-gray-500">{item.pickedQuantity}/{item.quantity}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            
            {/* Mobile Progress Toggle Button - Enhanced */}
            {!showMobileProgress && (
              <Button
                className="lg:hidden fixed bottom-4 right-4 h-12 w-12 rounded-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-lg z-30 touch-manipulation animate-pulse"
                onClick={() => setShowMobileProgress(true)}
              >
                <ClipboardList className="h-5 w-5" />
              </Button>
            )}
            

          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard View
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Mobile Optimized */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold">Pick & Pack Center</h1>
              <p className="text-xs sm:text-sm text-gray-500">Warehouse Operations Dashboard</p>
            </div>
            <div className="flex items-center justify-between sm:gap-4">
              <div className="text-left sm:text-right">
                <p className="text-xs sm:text-sm text-gray-500">Logged in as</p>
                <p className="text-sm sm:text-base font-medium">{currentEmployee}</p>
              </div>
              <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3">
                <Home className="h-3 sm:h-4 w-3 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Main Dashboard</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview - Mobile Optimized */}
      <div className="px-3 sm:px-6 py-3 sm:py-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Pending</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.pending}</p>
                </div>
                <Clock className="h-6 sm:h-8 w-6 sm:w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Picking</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.picking}</p>
                </div>
                <Package className="h-6 sm:h-8 w-6 sm:w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Packing</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.packing}</p>
                </div>
                <Box className="h-6 sm:h-8 w-6 sm:w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Ready</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.ready}</p>
                </div>
                <Truck className="h-6 sm:h-8 w-6 sm:w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Today Picked</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.todayPicked}</p>
                </div>
                <TrendingUp className="h-6 sm:h-8 w-6 sm:w-8 text-teal-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Avg Time</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.avgPickTime}</p>
                </div>
                <Timer className="h-6 sm:h-8 w-6 sm:w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content - Mobile Optimized */}
      <div className="px-3 sm:px-6 pb-6">
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
          <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
            <TabsList className="grid grid-cols-5 w-full min-w-[400px] sm:max-w-2xl">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs sm:text-sm">
                Pending ({stats.pending})
              </TabsTrigger>
              <TabsTrigger value="picking" className="text-xs sm:text-sm">
                Picking ({stats.picking})
              </TabsTrigger>
              <TabsTrigger value="packing" className="text-xs sm:text-sm">
                Packing ({stats.packing})
              </TabsTrigger>
              <TabsTrigger value="ready" className="text-xs sm:text-sm">
                Ready ({stats.ready})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab - Mobile Optimized */}
          <TabsContent value="overview" className="mt-4 sm:mt-6">
            {/* Performance Stats Modal */}
            {showPerformanceStats && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        <h2 className="text-lg sm:text-xl font-bold">Performance Statistics</h2>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-white hover:bg-white/20"
                        onClick={() => setShowPerformanceStats(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                          {transformedOrders.filter(o => o.pickStatus === 'completed' && o.packStatus === 'completed').length}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">Orders Completed Today</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-green-600">
                          {Math.floor(Math.random() * 90 + 10)}%
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">Picking Accuracy</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                          {Math.floor(Math.random() * 20 + 5)}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">Avg. Items/Order</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-orange-600">
                          {Math.floor(Math.random() * 10 + 5)}m
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">Avg. Pick Time</p>
                      </div>
                    </div>
                    
                    <div className="my-6 border-t border-gray-200"></div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Daily Target</span>
                        <span className="text-sm text-gray-600">15 / 20 orders</span>
                      </div>
                      <Progress value={75} className="h-2" />
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Efficiency Score</span>
                        <Badge className="bg-green-100 text-green-800">Excellent</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3">
                  <Button 
                    className="w-full justify-start h-10 sm:h-12 text-sm sm:text-base" 
                    size="lg"
                    onClick={startNextPriorityOrder}
                  >
                    <PlayCircle className="h-4 sm:h-5 w-4 sm:w-5 mr-2 sm:mr-3" />
                    Start Next Priority Order
                  </Button>
                  <Button 
                    className="w-full justify-start h-10 sm:h-12 text-sm sm:text-base" 
                    variant={batchPickingMode ? "default" : "outline"} 
                    size="lg"
                    onClick={toggleBatchPickingMode}
                  >
                    <Users className="h-4 sm:h-5 w-4 sm:w-5 mr-2 sm:mr-3" />
                    {batchPickingMode ? "Disable Batch Mode" : "Batch Picking Mode"}
                  </Button>
                  <Button 
                    className="w-full justify-start h-10 sm:h-12 text-sm sm:text-base" 
                    variant="outline" 
                    size="lg"
                    onClick={optimizePickRoute}
                  >
                    <Route className="h-4 sm:h-5 w-4 sm:w-5 mr-2 sm:mr-3" />
                    Optimize Pick Route
                  </Button>
                  <Button 
                    className="w-full justify-start h-10 sm:h-12 text-sm sm:text-base" 
                    variant={showPerformanceStats ? "default" : "outline"} 
                    size="lg"
                    onClick={togglePerformanceStats}
                  >
                    <BarChart3 className="h-4 sm:h-5 w-4 sm:w-5 mr-2 sm:mr-3" />
                    {showPerformanceStats ? "Hide Stats" : "View Performance Stats"}
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Activity - Mobile Optimized */}
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-base sm:text-lg flex items-center justify-between">
                    <span>Today's Activity</span>
                    <Badge variant="outline" className="text-xs">
                      {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RecentActivityList orders={transformedOrders} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pending Orders Tab - Mobile Optimized */}
          <TabsContent value="pending" className="mt-4 sm:mt-6">
            {/* Batch Picking Controls */}
            {batchPickingMode && (
              <Card className="mb-4 border-2 border-purple-500">
                <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white pb-3">
                  <CardTitle className="text-base sm:text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Batch Picking Mode Active
                    </span>
                    <Badge className="bg-white text-purple-600">
                      {selectedBatchItems.size} orders selected
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      size="sm"
                      onClick={() => {
                        const allIds = new Set(getOrdersByStatus('pending').map(o => o.id));
                        setSelectedBatchItems(allIds);
                      }}
                    >
                      Select All
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedBatchItems(new Set())}
                    >
                      Clear Selection
                    </Button>
                    <Button 
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={selectedBatchItems.size === 0}
                      onClick={() => {
                        const selectedOrders = getOrdersByStatus('pending').filter(o => selectedBatchItems.has(o.id));
                        if (selectedOrders.length > 0) {
                          startPicking(selectedOrders[0]);
                          toast({
                            title: "Batch Picking Started",
                            description: `Starting batch pick for ${selectedBatchItems.size} orders`,
                          });
                        }
                      }}
                    >
                      <PlayCircle className="h-4 w-4 mr-1" />
                      Start Batch Pick ({selectedBatchItems.size})
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Orders Ready to Pick</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {batchPickingMode ? "Select multiple orders for batch picking" : "Select an order to start the picking process"}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="space-y-2 sm:space-y-3">
                  {getOrdersByStatus('pending').map(order => (
                    <Card 
                      key={order.id} 
                      className={`cursor-pointer hover:shadow-md transition-all ${
                        batchPickingMode && selectedBatchItems.has(order.id) ? 'border-2 border-purple-500 bg-purple-50' : ''
                      }`}
                      onClick={() => {
                        if (batchPickingMode) {
                          const newSelection = new Set(selectedBatchItems);
                          if (newSelection.has(order.id)) {
                            newSelection.delete(order.id);
                          } else {
                            newSelection.add(order.id);
                          }
                          setSelectedBatchItems(newSelection);
                        }
                      }}
                    >
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 sm:mb-2">
                              {batchPickingMode && (
                                <input
                                  type="checkbox"
                                  checked={selectedBatchItems.has(order.id)}
                                  className="h-4 w-4 text-purple-600 rounded"
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={() => {}}
                                />
                              )}
                              <h3 className="font-semibold text-sm sm:text-base">{order.orderId}</h3>
                              <Badge variant={getPriorityColor(order.priority)} className="text-xs">
                                {order.priority.toUpperCase()}
                              </Badge>
                              {order.priority === 'high' && (
                                <Zap className="h-3 sm:h-4 w-3 sm:w-4 text-red-500" />
                              )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <User className="h-3 sm:h-4 w-3 sm:w-4" />
                                <span className="truncate">{order.customerName}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Package className="h-3 sm:h-4 w-3 sm:w-4" />
                                <span>{order.totalItems} items</span>
                              </div>
                              <div className="flex items-center gap-1 col-span-2 sm:col-span-1">
                                <Truck className="h-3 sm:h-4 w-3 sm:w-4" />
                                <span className="truncate">{order.shippingMethod}</span>
                              </div>
                            </div>
                          </div>
                          {!batchPickingMode && (
                            <Button
                              size="sm"
                              className="w-full sm:w-auto sm:h-10"
                              onClick={(e) => {
                                e.stopPropagation();
                                startPicking(order);
                              }}
                            >
                              <PlayCircle className="h-4 sm:h-5 w-4 sm:w-5 mr-1 sm:mr-2" />
                              Start Picking
                            </Button>
                          )}
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

          {/* Other tabs - Mobile Optimized */}
          <TabsContent value="picking" className="mt-4 sm:mt-6">
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Orders Being Picked</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                {getOrdersByStatus('picking').length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <Package className="h-10 sm:h-12 w-10 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                    <p className="text-sm sm:text-base text-gray-500">No orders currently being picked</p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {getOrdersByStatus('picking').map(order => (
                      <Card key={order.id}>
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                              <h3 className="font-semibold text-sm sm:text-base">{order.orderId}</h3>
                              <p className="text-xs sm:text-sm text-gray-600">Picked by: {order.pickedBy}</p>
                            </div>
                            <Button variant="outline" size="sm" className="w-full sm:w-auto">Resume Picking</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="packing" className="mt-4 sm:mt-6">
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Ready for Packing</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Orders that have been picked and ready to pack</CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                {getOrdersByStatus('packing').length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <Box className="h-10 sm:h-12 w-10 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                    <p className="text-sm sm:text-base text-gray-500">No orders ready for packing</p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {getOrdersByStatus('packing').map(order => (
                      <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 sm:mb-2">
                                <h3 className="font-semibold text-sm sm:text-base">{order.orderId}</h3>
                                <Badge variant="default" className="text-xs bg-purple-500">
                                  READY TO PACK
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 sm:h-4 w-3 sm:w-4" />
                                  <span className="truncate">{order.customerName}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Package className="h-3 sm:h-4 w-3 sm:w-4" />
                                  <span>{order.totalItems} items</span>
                                </div>
                                <div className="flex items-center gap-1 col-span-2 sm:col-span-1">
                                  <CheckCircle className="h-3 sm:h-4 w-3 sm:w-4 text-green-500" />
                                  <span className="text-green-600">Picked by {order.pickedBy}</span>
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className="w-full sm:w-auto sm:h-10 bg-purple-600 hover:bg-purple-700"
                              onClick={() => startPacking(order)}
                            >
                              <Box className="h-4 sm:h-5 w-4 sm:w-5 mr-1 sm:mr-2" />
                              Start Packing
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ready" className="mt-4 sm:mt-6">
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Ready to Ship</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Orders fully packed and ready for shipping</CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                {getOrdersByStatus('ready').length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <Truck className="h-10 sm:h-12 w-10 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                    <p className="text-sm sm:text-base text-gray-500">No orders ready to ship</p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {getOrdersByStatus('ready').map(order => (
                      <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 sm:mb-2">
                                <h3 className="font-semibold text-sm sm:text-base">{order.orderId}</h3>
                                <Badge variant="default" className="text-xs bg-green-500">
                                  READY TO SHIP
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 sm:h-4 w-3 sm:w-4" />
                                  <span className="truncate">{order.customerName}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Truck className="h-3 sm:h-4 w-3 sm:w-4" />
                                  <span>{order.shippingMethod}</span>
                                </div>
                                <div className="flex items-center gap-1 col-span-2 sm:col-span-1">
                                  <PackageCheck className="h-3 sm:h-4 w-3 sm:w-4 text-green-500" />
                                  <span className="text-green-600">Packed by {order.packedBy}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full sm:w-auto"
                                onClick={() => {
                                  // Print shipping label
                                  toast({
                                    title: "Printing Label",
                                    description: `Printing shipping label for ${order.orderId}`,
                                  });
                                }}
                              >
                                <Printer className="h-4 sm:h-5 w-4 sm:w-5 mr-1 sm:mr-2" />
                                Print Label
                              </Button>
                              <Button
                                size="sm"
                                className="w-full sm:w-auto sm:h-10 bg-green-600 hover:bg-green-700"
                                onClick={() => markAsShipped(order)}
                              >
                                <Truck className="h-4 sm:h-5 w-4 sm:w-5 mr-1 sm:mr-2" />
                                Mark Shipped
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}