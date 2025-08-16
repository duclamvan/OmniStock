import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/currencyUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "wouter";
import logoPath from '@assets/logo_1754349267160.png';
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
  AlertTriangle,
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
  MoreVertical,
  RotateCcw,
  X,
  Plus,
  Minus,
  BarChart3,
  TrendingUp,
  Menu
} from "lucide-react";

interface BundleItem {
  id: string;
  name: string;
  colorNumber?: string;
  quantity: number;
  picked: boolean;
  location?: string;
}

interface ItemDimensions {
  length: number; // cm
  width: number;  // cm
  height: number; // cm
  weight: number; // kg
}

interface BoxSize {
  id: string;
  name: string;
  dimensions: ItemDimensions;
  maxWeight: number;
  cost: number;
  material: string;
  isFragile?: boolean;
}

interface Carton {
  id: string;
  boxSize: BoxSize;
  items: OrderItem[];
  totalWeight: number;
  utilization: number; // percentage
  isFragile: boolean;
}

interface PackingRecommendation {
  cartons: Carton[];
  totalCost: number;
  totalWeight: number;
  efficiency: number;
  reasoning: string;
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
  dimensions?: ItemDimensions;
  isFragile?: boolean;
  bundleItems?: BundleItem[];
  shipmentNotes?: string | null;
  packingMaterial?: {
    id: string;
    name: string;
    imageUrl?: string | null;
    type?: string | null;
    description?: string | null;
  } | null;
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
  const [showPickingCompletionModal, setShowPickingCompletionModal] = useState(false);
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [manualItemIndex, setManualItemIndex] = useState(0);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Navigation structure
  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: Home,
    },
    {
      name: "Orders",
      icon: Package,
      children: [
        { name: "All Orders", href: "/orders" },
        { name: "Add Order", href: "/orders/add" },
        { name: "Pick & Pack", href: "/orders/pick-pack" },
        { name: "To Fulfill", href: "/orders/to-fulfill" },
        { name: "Shipped", href: "/orders/shipped" },
        { name: "Pre-Orders", href: "/orders/pre-orders" },
      ],
    },
    {
      name: "Inventory",
      icon: Box,
      children: [
        { name: "All Products", href: "/inventory" },
        { name: "Categories", href: "/inventory/categories" },
        { name: "Product Bundles", href: "/inventory/bundles" },
        { name: "Add Product", href: "/inventory/add" },
      ],
    },
    {
      name: "Customers",
      href: "/customers",
      icon: Users,
    },
    {
      name: "Reports",
      href: "/reports",
      icon: BarChart3,
    },
  ];
  
  // State for packing process
  const [packingChecklist, setPackingChecklist] = useState({
    itemsVerified: false,
    packingSlipIncluded: false,
    boxSealed: false,
    weightRecorded: false,
    fragileProtected: false
  });
  
  // State for document printing checklist
  const [printedDocuments, setPrintedDocuments] = useState({
    packingList: false,
    invoice: false,
    msds: false,
    cpnpCertificate: false
  });
  
  const [selectedBoxSize, setSelectedBoxSize] = useState<string>('');
  const [packageWeight, setPackageWeight] = useState<string>('');
  const [verifiedItems, setVerifiedItems] = useState<Set<string>>(new Set());
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(new Set());
  const [bundlePickedItems, setBundlePickedItems] = useState<Record<string, Set<string>>>({}); // itemId -> Set of picked bundle item ids
  const [packingRecommendation, setPackingRecommendation] = useState<PackingRecommendation | null>(null);
  const [selectedCarton, setSelectedCarton] = useState<string>('K2');
  const [useNonCompanyCarton, setUseNonCompanyCarton] = useState<boolean>(false);
  const [aiWeightCalculation, setAiWeightCalculation] = useState<any>(null);
  const [enableMultiCartonOptimization, setEnableMultiCartonOptimization] = useState<boolean>(false);
  const [cartonSearchFilter, setCartonSearchFilter] = useState<string>('');
  const [isWeightManuallyModified, setIsWeightManuallyModified] = useState<boolean>(false);

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

  // Show completion modal when all items are picked
  useEffect(() => {
    if (!activePickingOrder) {
      setShowPickingCompletionModal(false);
      return;
    }

    const allItemsPicked = activePickingOrder.items.every(
      item => item.pickedQuantity >= item.quantity
    );

    if (allItemsPicked && activePickingOrder.pickStatus !== 'completed') {
      setShowPickingCompletionModal(true);
    }
  }, [activePickingOrder, activePickingOrder?.items.map(i => i.pickedQuantity).join(',')]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPackingTimerRunning) {
      interval = setInterval(() => {
        setPackingTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPackingTimerRunning]);

  // Auto-calculate weight when entering pack mode
  useEffect(() => {
    if (activePackingOrder && selectedCarton && !aiWeightCalculation && !useNonCompanyCarton) {
      // Trigger automatic weight calculation
      calculateWeightMutation.mutate({
        orderId: activePackingOrder.id,
        selectedCartonId: selectedCarton,
        optimizeMultipleCartons: enableMultiCartonOptimization
      });
    }
  }, [activePackingOrder?.id, selectedCarton, useNonCompanyCarton]);

  // Fetch real orders from the API with items and bundle details
  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: ['/api/orders/pick-pack'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Query for available cartons
  const { data: availableCartons = [] } = useQuery({
    queryKey: ['/api/cartons/available'],
  });

  // Filter cartons based on search
  const filteredCartons = availableCartons.filter((carton: any) => {
    if (!cartonSearchFilter) return true;
    const searchLower = cartonSearchFilter.toLowerCase();
    return (
      carton.name?.toLowerCase().includes(searchLower) ||
      carton.material?.toLowerCase().includes(searchLower) ||
      carton.type?.toLowerCase().includes(searchLower) ||
      `${carton.dimensions?.length}x${carton.dimensions?.width}x${carton.dimensions?.height}`.includes(searchLower)
    );
  });

  // Query for carton recommendation for current order
  const { data: recommendedCarton } = useQuery({
    queryKey: ['/api/orders', activePackingOrder?.id, 'recommend-carton'],
    enabled: !!activePackingOrder?.id,
  });

  // Mutation for calculating package weight
  const calculateWeightMutation = useMutation({
    mutationFn: async ({ orderId, selectedCartonId, optimizeMultipleCartons }: { 
      orderId: string; 
      selectedCartonId: string; 
      optimizeMultipleCartons?: boolean 
    }) => {
      return apiRequest(`/api/orders/${orderId}/calculate-weight`, {
        method: 'POST',
        body: { selectedCartonId, optimizeMultipleCartons },
      });
    },
    onSuccess: (data) => {
      setAiWeightCalculation(data);
      if (data.totalWeight) {
        setPackageWeight(data.totalWeight.toString());
        setIsWeightManuallyModified(false);
      }
    },
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

  // Available box sizes for AI-powered selection with code names and visual representations
  const availableBoxSizes: BoxSize[] = [
    {
      id: 'small-envelope',
      name: 'E1 - Small Envelope',
      dimensions: { length: 22, width: 16, height: 2, weight: 0.05 },
      maxWeight: 0.5,
      cost: 0.80,
      material: 'Padded Envelope'
    },
    {
      id: 'medium-envelope',
      name: 'E2 - Medium Envelope',
      dimensions: { length: 35, width: 25, height: 3, weight: 0.08 },
      maxWeight: 1.0,
      cost: 1.20,
      material: 'Padded Envelope'
    },
    {
      id: 'small-box',
      name: 'K1 - Small Carton',
      dimensions: { length: 20, width: 15, height: 10, weight: 0.15 },
      maxWeight: 2.0,
      cost: 1.50,
      material: 'Corrugated Cardboard'
    },
    {
      id: 'medium-box',
      name: 'K2 - Medium Carton',
      dimensions: { length: 30, width: 20, height: 15, weight: 0.25 },
      maxWeight: 5.0,
      cost: 2.20,
      material: 'Corrugated Cardboard'
    },
    {
      id: 'large-box',
      name: 'K3 - Large Carton',
      dimensions: { length: 40, width: 30, height: 20, weight: 0.35 },
      maxWeight: 10.0,
      cost: 3.50,
      material: 'Corrugated Cardboard'
    },
    {
      id: 'fragile-box',
      name: 'F1 - Fragile Protection Carton',
      dimensions: { length: 35, width: 25, height: 18, weight: 0.40 },
      maxWeight: 7.0,
      cost: 4.20,
      material: 'Double-Wall Cardboard',
      isFragile: true
    },
    {
      id: 'wine-box',
      name: 'B1 - Bottle Protection Carton',
      dimensions: { length: 38, width: 28, height: 35, weight: 0.50 },
      maxWeight: 15.0,
      cost: 5.80,
      material: 'Reinforced Cardboard'
    }
  ];

  // Get carton type info
  const getCartonTypeInfo = (boxSize: BoxSize) => {
    const codeName = boxSize.name.split(' - ')[0];
    
    if (codeName.startsWith('E')) {
      return { type: 'envelope', color: '#f59e0b', description: 'Lightweight Items' };
    } else if (codeName.startsWith('K')) {
      return { type: 'standard', color: '#3b82f6', description: 'Standard Items' };
    } else if (codeName.startsWith('F')) {
      return { type: 'fragile', color: '#ef4444', description: 'Fragile Protection' };
    } else if (codeName.startsWith('B')) {
      return { type: 'bottle', color: '#8b5cf6', description: 'Bottle/Liquid Items' };
    }
    return { type: 'standard', color: '#6b7280', description: 'General Purpose' };
  };

  // Generate carton visual representation
  const generateCartonSVG = (boxSize: BoxSize, isSelected: boolean = false) => {
    const { length, width, height } = boxSize.dimensions;
    const typeInfo = getCartonTypeInfo(boxSize);
    const scale = 0.8; // Scale factor for display
    const baseWidth = Math.min(length * scale, 80);
    const baseHeight = Math.min(width * scale, 60);
    const depth = Math.min(height * scale, 40);
    
    const selectedColor = isSelected ? '#10b981' : typeInfo.color;
    
    return (
      <svg width="100" height="80" viewBox="0 0 100 80" className="mx-auto">
        <defs>
          <linearGradient id={`gradient-${boxSize.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={selectedColor} stopOpacity="0.3"/>
            <stop offset="100%" stopColor={selectedColor} stopOpacity="0.7"/>
          </linearGradient>
          <pattern id={`lines-${boxSize.id}`} patternUnits="userSpaceOnUse" width="4" height="4">
            <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke={selectedColor} strokeWidth="0.5" opacity="0.3"/>
          </pattern>
        </defs>
        
        {/* Main box face */}
        <rect 
          x={20} 
          y={20} 
          width={baseWidth} 
          height={baseHeight} 
          fill={typeInfo.type === 'envelope' ? `url(#lines-${boxSize.id})` : `url(#gradient-${boxSize.id})`}
          stroke={selectedColor}
          strokeWidth={isSelected ? "3" : "2"}
          rx={typeInfo.type === 'envelope' ? "4" : "2"}
        />
        
        {/* Top face for 3D effect - only for boxes, not envelopes */}
        {typeInfo.type !== 'envelope' && (
          <polygon 
            points={`20,20 ${20 + depth/2},${20 - depth/2} ${20 + baseWidth + depth/2},${20 - depth/2} ${20 + baseWidth},20`}
            fill={selectedColor}
            opacity="0.6"
            stroke={selectedColor}
            strokeWidth={isSelected ? "2" : "1"}
          />
        )}
        
        {/* Right face for 3D effect - only for boxes, not envelopes */}
        {typeInfo.type !== 'envelope' && (
          <polygon 
            points={`${20 + baseWidth},20 ${20 + baseWidth + depth/2},${20 - depth/2} ${20 + baseWidth + depth/2},${20 + baseHeight - depth/2} ${20 + baseWidth},${20 + baseHeight}`}
            fill={selectedColor}
            opacity="0.4"
            stroke={selectedColor}
            strokeWidth={isSelected ? "2" : "1"}
          />
        )}
        
        {/* Special indicators */}
        {typeInfo.type === 'fragile' && (
          <text x="50" y="35" textAnchor="middle" fontSize="6" fill="#dc2626" fontWeight="bold">
            FRAGILE
          </text>
        )}
        
        {typeInfo.type === 'bottle' && (
          <circle cx="50" cy="35" r="8" fill="none" stroke={selectedColor} strokeWidth="1.5" opacity="0.7"/>
        )}
        
        {/* Code name */}
        <text x="50" y={typeInfo.type === 'envelope' ? "70" : "75"} textAnchor="middle" fontSize="12" fill="#374151" fontWeight="bold">
          {boxSize.name.split(' - ')[0]}
        </text>
        
        {/* Selection indicator */}
        {isSelected && (
          <circle cx="85" cy="15" r="6" fill="#10b981" stroke="white" strokeWidth="2">
            <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="indefinite"/>
          </circle>
        )}
      </svg>
    );
  };

  // Generate realistic item dimensions based on product type
  const generateItemDimensions = (productName: string, quantity: number): ItemDimensions => {
    const lowerName = productName.toLowerCase();
    let baseDimensions: ItemDimensions;

    if (lowerName.includes('gel polish') || lowerName.includes('nail polish')) {
      baseDimensions = { length: 2.5, width: 2.5, height: 8, weight: 0.015 };
    } else if (lowerName.includes('top coat') || lowerName.includes('base coat')) {
      baseDimensions = { length: 3, width: 3, height: 9, weight: 0.020 };
    } else if (lowerName.includes('cuticle oil')) {
      baseDimensions = { length: 2, width: 2, height: 6, weight: 0.012 };
    } else if (lowerName.includes('nail file')) {
      baseDimensions = { length: 18, width: 2, height: 0.3, weight: 0.008 };
    } else if (lowerName.includes('cotton pad')) {
      baseDimensions = { length: 6, width: 5, height: 1, weight: 0.002 };
    } else if (lowerName.includes('acetone') || lowerName.includes('cleaner')) {
      baseDimensions = { length: 8, width: 5, height: 12, weight: 0.250 };
    } else {
      // Default dimensions for unknown products
      baseDimensions = { length: 10, width: 8, height: 5, weight: 0.100 };
    }

    // Adjust for quantity (assuming items can be stacked/bundled efficiently)
    const stackingEfficiency = Math.min(1, Math.pow(quantity, 0.7));
    return {
      length: baseDimensions.length,
      width: baseDimensions.width,
      height: baseDimensions.height * stackingEfficiency,
      weight: baseDimensions.weight * quantity
    };
  };

  // AI-powered packing optimization algorithm
  const generatePackingRecommendation = (items: OrderItem[]): PackingRecommendation => {
    const itemsWithDimensions = items.map(item => ({
      ...item,
      dimensions: item.dimensions || generateItemDimensions(item.productName, item.quantity),
      isFragile: item.isFragile || item.productName.toLowerCase().includes('glass') || 
                 item.productName.toLowerCase().includes('bottle') ||
                 item.productName.toLowerCase().includes('fragile')
    }));

    // Calculate total volume and weight
    const totalVolume = itemsWithDimensions.reduce((sum, item) => {
      const dims = item.dimensions!;
      return sum + (dims.length * dims.width * dims.height);
    }, 0);

    const totalWeight = itemsWithDimensions.reduce((sum, item) => sum + item.dimensions!.weight, 0);
    const hasFragileItems = itemsWithDimensions.some(item => item.isFragile);

    // Find optimal box combination
    let bestRecommendation: PackingRecommendation = {
      cartons: [],
      totalCost: Infinity,
      totalWeight: 0,
      efficiency: 0,
      reasoning: ''
    };

    // Try different packing strategies
    const strategies = [
      () => packInSingleBox(itemsWithDimensions, hasFragileItems),
      () => packByWeight(itemsWithDimensions, hasFragileItems),
      () => packByFragility(itemsWithDimensions),
      () => packBySize(itemsWithDimensions, hasFragileItems)
    ];

    strategies.forEach(strategy => {
      const recommendation = strategy();
      if (recommendation && recommendation.totalCost < bestRecommendation.totalCost) {
        bestRecommendation = recommendation;
      }
    });

    return bestRecommendation;
  };

  // Packing strategy: Try to fit everything in one box
  const packInSingleBox = (items: OrderItem[], hasFragileItems: boolean): PackingRecommendation | null => {
    const totalWeight = items.reduce((sum, item) => sum + item.dimensions!.weight, 0);
    
    const suitableBoxes = availableBoxSizes.filter(box => {
      if (hasFragileItems && !box.isFragile && box.material !== 'Double-Wall Cardboard') return false;
      return box.maxWeight >= totalWeight;
    }).sort((a, b) => a.cost - b.cost);

    if (suitableBoxes.length === 0) return null;

    const box = suitableBoxes[0];
    const boxVolume = box.dimensions.length * box.dimensions.width * box.dimensions.height;
    const itemsVolume = items.reduce((sum, item) => {
      const dims = item.dimensions!;
      return sum + (dims.length * dims.width * dims.height);
    }, 0);

    const utilization = Math.min(100, (itemsVolume / boxVolume) * 100);

    if (utilization > 95) return null; // Too tight fit

    return {
      cartons: [{
        id: 'carton-1',
        boxSize: box,
        items,
        totalWeight,
        utilization,
        isFragile: hasFragileItems
      }],
      totalCost: box.cost,
      totalWeight,
      efficiency: utilization,
      reasoning: `Single ${box.name} selected for optimal cost efficiency. ${hasFragileItems ? 'Fragile protection included.' : ''}`
    };
  };

  // Packing strategy: Pack by weight distribution
  const packByWeight = (items: OrderItem[], hasFragileItems: boolean): PackingRecommendation | null => {
    const cartons: Carton[] = [];
    const remainingItems = [...items];
    let totalCost = 0;

    while (remainingItems.length > 0) {
      const suitableBoxes = availableBoxSizes.filter(box => {
        if (hasFragileItems && !box.isFragile && box.material !== 'Double-Wall Cardboard') return false;
        return true;
      }).sort((a, b) => a.cost - b.cost);

      let bestFit: { box: BoxSize; items: OrderItem[]; weight: number; utilization: number } | null = null;

      for (const box of suitableBoxes) {
        const fittingItems: OrderItem[] = [];
        let currentWeight = 0;
        let currentVolume = 0;
        const boxVolume = box.dimensions.length * box.dimensions.width * box.dimensions.height;

        for (const item of remainingItems) {
          const itemWeight = item.dimensions!.weight;
          const itemVolume = item.dimensions!.length * item.dimensions!.width * item.dimensions!.height;

          if (currentWeight + itemWeight <= box.maxWeight && 
              currentVolume + itemVolume <= boxVolume * 0.95) {
            fittingItems.push(item);
            currentWeight += itemWeight;
            currentVolume += itemVolume;
          }
        }

        if (fittingItems.length > 0) {
          const utilization = (currentVolume / boxVolume) * 100;
          if (!bestFit || fittingItems.length > bestFit.items.length) {
            bestFit = { box, items: fittingItems, weight: currentWeight, utilization };
          }
        }
      }

      if (!bestFit) break;

      cartons.push({
        id: `carton-${cartons.length + 1}`,
        boxSize: bestFit.box,
        items: bestFit.items,
        totalWeight: bestFit.weight,
        utilization: bestFit.utilization,
        isFragile: bestFit.items.some(item => item.isFragile)
      });

      bestFit.items.forEach(item => {
        const index = remainingItems.indexOf(item);
        remainingItems.splice(index, 1);
      });

      totalCost += bestFit.box.cost;
    }

    if (remainingItems.length > 0) return null;

    const avgEfficiency = cartons.reduce((sum, carton) => sum + carton.utilization, 0) / cartons.length;

    return {
      cartons,
      totalCost,
      totalWeight: cartons.reduce((sum, carton) => sum + carton.totalWeight, 0),
      efficiency: avgEfficiency,
      reasoning: `Optimized weight distribution across ${cartons.length} carton${cartons.length > 1 ? 's' : ''} for balanced shipping.`
    };
  };

  // Additional packing strategies (simplified for space)
  const packByFragility = (items: OrderItem[]): PackingRecommendation | null => {
    return packByWeight(items, true);
  };

  const packBySize = (items: OrderItem[], hasFragileItems: boolean): PackingRecommendation | null => {
    return packByWeight(items, hasFragileItems);
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

  // Demo orders with shipping instructions for testing packing mode
  const demoPackingOrders: PickPackOrder[] = [
    {
      id: 'demo-pack-1',
      orderId: 'ORD-DEMO-001',
      customerName: 'Demo Electronics Store',
      shippingMethod: 'Express',
      shippingAddress: '123 Demo Street',
      priority: 'high' as const,
      status: 'to_fulfill' as const,
      pickStatus: 'completed' as const,
      packStatus: 'in_progress' as const,
      items: [
        {
          id: 'demo-item-1',
          productId: 'prod-1',
          productName: 'Laptop Computer',
          productImage: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=200&h=200&fit=crop&crop=center',
          sku: 'LAPTOP-001',
          quantity: 1,
          pickedQuantity: 1,
          packedQuantity: 0,
          warehouseLocation: 'A1-2',
          barcode: 'BAR-LAPTOP-001',
          shipmentNotes: '⚠️ FRAGILE ELECTRONICS: Use anti-static bubble wrap. Place in center of box with 2 inches of cushioning on all sides. Include desiccant packet.',
          packingMaterial: {
            id: 'mat-1',
            name: 'Anti-Static Bubble Wrap',
            imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200',
            type: 'bubble_wrap',
            description: 'Anti-static protection for electronics'
          }
        },
        {
          id: 'demo-item-2',
          productId: 'prod-2',
          productName: 'Wireless Mouse',
          productImage: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=200&h=200&fit=crop&crop=center',
          sku: 'MOUSE-001',
          quantity: 2,
          pickedQuantity: 2,
          packedQuantity: 0,
          warehouseLocation: 'B2-3',
          barcode: 'BAR-MOUSE-001',
          shipmentNotes: 'Include in same box as laptop. Wrap separately to prevent scratching.',
          packingMaterial: null
        }
      ],
      totalItems: 3,
      pickedItems: 3,
      packedItems: 0,
      createdAt: new Date().toISOString(),
      pickEndTime: new Date().toISOString(),
      packStartTime: new Date().toISOString()
    },
    {
      id: 'demo-pack-2',
      orderId: 'ORD-DEMO-002',
      customerName: 'Glass Art Gallery',
      shippingMethod: 'Standard',
      shippingAddress: '456 Gallery Lane',
      priority: 'high' as const,
      status: 'to_fulfill' as const,
      pickStatus: 'completed' as const,
      packStatus: 'in_progress' as const,
      items: [
        {
          id: 'demo-item-3',
          productId: 'prod-3',
          productName: 'Crystal Vase',
          productImage: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=200&fit=crop&crop=center',
          sku: 'VASE-001',
          quantity: 1,
          pickedQuantity: 1,
          packedQuantity: 0,
          warehouseLocation: 'C3-1',
          barcode: 'BAR-VASE-001',
          shipmentNotes: '🚨 EXTREMELY FRAGILE! Double-box method required. Wrap in 3 layers of bubble wrap. Fill all voids with packing peanuts. Mark "FRAGILE - GLASS" on all 6 sides of box.',
          packingMaterial: {
            id: 'mat-3',
            name: 'Heavy-Duty Bubble Wrap + Peanuts',
            imageUrl: 'https://images.unsplash.com/photo-1605732562742-3023a888e56e?w=200',
            type: 'special',
            description: 'Maximum protection for fragile items'
          }
        }
      ],
      totalItems: 1,
      pickedItems: 1,
      packedItems: 0,
      createdAt: new Date().toISOString(),
      pickEndTime: new Date().toISOString(),
      packStartTime: new Date().toISOString()
    }
  ];

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
          dimensions: { length: 15, width: 12, height: 8, weight: 0.180 },
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
          image: generateMockImage('uv-lamp'),
          dimensions: { length: 25, width: 20, height: 12, weight: 0.850 },
          isFragile: true
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
      status: 'to_fulfill',
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
    // MULTI-CARTON PACKING EXAMPLE - Complex order requiring multiple boxes
    {
      id: 'mock-packing-1',
      orderId: 'ORD-MULTI-001',
      customerName: 'Professional Salon Supply Co.',
      shippingMethod: 'Express',
      shippingAddress: '555 Market St, Los Angeles, CA 90001',
      priority: 'high',
      status: 'to_fulfill',
      pickStatus: 'completed',
      packStatus: 'not_started',
      items: [
        {
          id: 'multi-item-1',
          productId: 'multi-prod-1',
          productName: 'Professional Gel Polish Kit 60 Colors',
          sku: 'GP-PRO-60',
          quantity: 1,
          pickedQuantity: 1,
          packedQuantity: 0,
          warehouseLocation: 'A-15-1',
          barcode: 'BAR123MULTI1',
          image: generateMockImage('gel-polish-mega-kit'),
          dimensions: { length: 45, width: 35, height: 20, weight: 4.200 },
          isBundle: true
        },
        {
          id: 'multi-item-2',
          productId: 'multi-prod-2',
          productName: 'UV LED Lamp 84W Professional With Timer',
          sku: 'LAMP-84W-TIMER',
          quantity: 1,
          pickedQuantity: 1,
          packedQuantity: 0,
          warehouseLocation: 'B-10-1',
          barcode: 'BAR456MULTI2',
          image: generateMockImage('uv-lamp-professional'),
          dimensions: { length: 38, width: 28, height: 22, weight: 2.100 },
          isFragile: true
        },
        {
          id: 'multi-item-3',
          productId: 'multi-prod-3',
          productName: 'Glass Storage Bottles 30ml (Pack of 24)',
          sku: 'GLASS-30ML-24',
          quantity: 2,
          pickedQuantity: 2,
          packedQuantity: 0,
          warehouseLocation: 'E-03-2',
          barcode: 'BAR789MULTI3',
          image: generateMockImage('glass-bottles-bulk'),
          dimensions: { length: 32, width: 24, height: 18, weight: 3.600 },
          isFragile: true
        },
        {
          id: 'multi-item-4',
          productId: 'multi-prod-4',
          productName: 'Professional Nail Files Bulk Pack (100pcs)',
          sku: 'FILES-BULK-100',
          quantity: 1,
          pickedQuantity: 1,
          packedQuantity: 0,
          warehouseLocation: 'F-08-4',
          barcode: 'BAR321MULTI4',
          image: generateMockImage('nail-files-bulk'),
          dimensions: { length: 30, width: 25, height: 12, weight: 1.800 }
        },
        {
          id: 'multi-item-5',
          productId: 'multi-prod-5',
          productName: 'Acetone Pure 500ml (Pack of 6)',
          sku: 'ACETONE-500-6',
          quantity: 1,
          pickedQuantity: 1,
          packedQuantity: 0,
          warehouseLocation: 'G-12-3',
          barcode: 'BAR654MULTI5',
          image: generateMockImage('acetone-bulk'),
          dimensions: { length: 28, width: 20, height: 25, weight: 3.200 },
          isFragile: true
        },
        {
          id: 'multi-item-6',
          productId: 'multi-prod-6',
          productName: 'Disposable Towels Commercial (500 pack)',
          sku: 'TOWELS-COMM-500',
          quantity: 1,
          pickedQuantity: 1,
          packedQuantity: 0,
          warehouseLocation: 'H-05-1',
          barcode: 'BAR987MULTI6',
          image: generateMockImage('towels-commercial'),
          dimensions: { length: 35, width: 25, height: 30, weight: 2.400 }
        }
      ],
      totalItems: 7,
      pickedItems: 7,
      packedItems: 0,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      pickStartTime: new Date(Date.now() - 5400000).toISOString(),
      pickEndTime: new Date(Date.now() - 1800000).toISOString(),
      pickedBy: 'John Warehouse',
      notes: 'BULK ORDER - Professional salon supplies. Customer requested careful packaging for fragile items.'
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

  // Transform real orders to PickPackOrder format - Include orders in the fulfillment process
  const transformedOrders: PickPackOrder[] = [
    // Use only real orders from database (removed demo orders)
    ...((allOrders as any[] || [])
    .filter((order: any) => 
      order.status === 'to_fulfill' || 
      order.status === 'picking' || 
      order.status === 'packing' ||
      order.status === 'ready_to_ship' ||
      order.pickStatus === 'in_progress' ||
      order.pickStatus === 'completed' ||
      order.packStatus === 'in_progress' ||
      order.packStatus === 'completed'
    )
    .map((order: any) => ({
      id: order.id,
      orderId: order.orderId,
      customerName: order.customerName || 'Walk-in Customer',
      shippingMethod: order.shippingMethod || 'Standard',
      shippingAddress: order.shippingAddress,
      priority: order.priority || 'medium',
      status: order.status || 'to_fulfill',
      pickStatus: order.pickStatus || 'not_started',
      packStatus: order.packStatus || 'not_started',
      items: order.items?.map((item: any) => {
        const warehouseLocation = item.warehouseLocation || generateMockLocation();
        
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
          isBundle: item.isBundle || false,
          bundleItems: item.bundleItems || undefined,
          dimensions: item.dimensions,
          isFragile: item.isFragile
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

  // Handle sending order back to pick
  const sendBackToPick = async (order: PickPackOrder) => {
    try {
      // Reset pick and pack status to move order back to pending
      await apiRequest(`/api/orders/${order.id}`, 'PATCH', {
        pickStatus: 'not_started',
        packStatus: 'not_started',
        pickStartTime: null,
        pickEndTime: null,
        packStartTime: null,
        packEndTime: null,
        pickedBy: null,
        packedBy: null
      });
      
      // Reset item quantities if they exist
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          if (item.id) {
            await apiRequest(`/api/orders/${order.id}/items/${item.id}`, 'PATCH', {
              pickedQuantity: 0,
              packedQuantity: 0
            });
          }
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
      toast({
        title: 'Order sent back to pending',
        description: `Order ${order.orderId} has been moved back to pending pick status`
      });
    } catch (error) {
      console.error('Error sending order back to pick:', error);
      toast({
        title: 'Error',
        description: 'Failed to send order back to pick',
        variant: 'destructive'
      });
    }
  };

  // Play sound effect
  const playSound = (type: 'scan' | 'success' | 'error' | 'complete') => {
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
      case 'complete':
        console.log('Playing complete sound');
        break;
    }
  };

  // Global barcode scanner listener for continuous scanning
  useEffect(() => {
    if (!activePickingOrder) return;

    let scanBuffer = '';
    let scanTimeout: NodeJS.Timeout;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Only process if we're in picking mode and have an active order
      if (selectedTab !== 'picking' || !activePickingOrder) return;

      // Ignore if target is an input field that's not read-only
      if (e.target instanceof HTMLInputElement && !e.target.readOnly) return;

      // Clear buffer on Enter (barcode scanners typically end with Enter)
      if (e.key === 'Enter') {
        if (scanBuffer.length > 0) {
          processBarcodeInput(scanBuffer);
          scanBuffer = '';
        }
        clearTimeout(scanTimeout);
        return;
      }

      // Add character to buffer
      if (e.key.length === 1) { // Only single characters
        scanBuffer += e.key;
        setBarcodeInput(scanBuffer);

        // Clear buffer after timeout (in case Enter is missed)
        clearTimeout(scanTimeout);
        scanTimeout = setTimeout(() => {
          scanBuffer = '';
          setBarcodeInput('');
        }, 1000);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      clearTimeout(scanTimeout);
    };
  }, [activePickingOrder, selectedTab]);

  // Process barcode input from continuous scanner
  const processBarcodeInput = (barcode: string) => {
    if (!activePickingOrder || !barcode.trim()) return;

    const item = activePickingOrder.items.find(i => 
      i.barcode === barcode || i.sku === barcode
    );

    if (item) {
      const newQty = Math.min(item.pickedQuantity + 1, item.quantity);
      updatePickedItem(item.id, newQty);
      playSound('scan');
    } else {
      playSound('error');
    }

    setBarcodeInput('');
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
    }
  };

  // Quick Action: Toggle Batch Picking Mode
  const toggleBatchPickingMode = () => {
    setBatchPickingMode(!batchPickingMode);
    setSelectedBatchItems(new Set());
  };

  // Quick Action: Optimize Pick Route
  const optimizePickRoute = () => {
    if (!activePickingOrder) {
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
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
    }
  });

  // Start picking an order
  const startPicking = async (order: PickPackOrder) => {
    // Only update database for real orders (not mock orders)
    if (!order.id.startsWith('mock-')) {
      // Keep order status as 'to_fulfill' and update pickStatus
      await updateOrderStatusMutation.mutateAsync({
        orderId: order.id,
        status: 'to_fulfill',
        pickStatus: 'in_progress',
        pickedBy: currentEmployee
      });
    }

    const updatedOrder = {
      ...order,
      status: 'to_fulfill' as const,
      pickStatus: 'in_progress' as const,
      pickStartTime: new Date().toISOString(),
      pickedBy: currentEmployee
    };
    setActivePickingOrder(updatedOrder);
    setSelectedTab('picking');
    // Find first unpicked item or start at 0
    const firstUnpickedIndex = order.items.findIndex(item => item.pickedQuantity < item.quantity);
    setManualItemIndex(firstUnpickedIndex >= 0 ? firstUnpickedIndex : 0);
    setPickingTimer(0);
    setIsTimerRunning(true);
    playSound('success');
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
    }
  };

  // Complete picking
  const completePicking = async () => {
    if (!activePickingOrder) return;

    try {
      // Only update database for real orders (not mock orders)
      if (!activePickingOrder.id.startsWith('mock-')) {
        // Update order to mark picking as completed
        await apiRequest(`/api/orders/${activePickingOrder.id}`, 'PATCH', {
          pickStatus: 'completed',
          pickEndTime: new Date().toISOString(),
          pickedBy: currentEmployee
        });
      }

      const updatedOrder = {
        ...activePickingOrder,
        pickStatus: 'completed' as const,
        pickEndTime: new Date().toISOString(),
        status: 'to_fulfill' as const,
        packStatus: 'not_started' as const
      };

      setIsTimerRunning(false);
      await queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
      
      toast({
        title: "Picking completed!",
        description: `Order ${activePickingOrder.orderId} is ready for packing`,
      });
      
      playSound('complete');
      
      // Don't immediately clear the order or navigate - let the user choose
      // The completion screen will handle the navigation
    } catch (error) {
      console.error('Error completing picking:', error);
      toast({
        title: "Error",
        description: "Failed to complete picking",
        variant: "destructive",
      });
    }
  };

  // Start packing an order
  const startPacking = async (order: PickPackOrder) => {
    // Generate AI packing recommendation
    const recommendation = generatePackingRecommendation(order.items);
    setPackingRecommendation(recommendation);
    
    // Only update database for real orders (not mock orders)
    if (!order.id.startsWith('mock-')) {
      // Keep status as 'to_fulfill' when packing is in progress
      if (order.packStatus !== 'in_progress') {
        await updateOrderStatusMutation.mutateAsync({
          orderId: order.id,
          status: 'to_fulfill',
          packStatus: 'in_progress',
          packedBy: currentEmployee
        });
      }
    }

    const updatedOrder = {
      ...order,
      status: 'to_fulfill' as const,
      packStatus: 'in_progress' as const,
      packStartTime: new Date().toISOString(),
      packedBy: currentEmployee
    };
    setActivePackingOrder(updatedOrder);
    setPackingTimer(0);
    setIsPackingTimerRunning(true);
    
    // Reset packing state
    setPackingChecklist({
      itemsVerified: false,
      packingSlipIncluded: false,
      boxSealed: false,
      weightRecorded: false,
      fragileProtected: false
    });
    setPrintedDocuments({
      packingList: false,
      invoice: false,
      msds: false,
      cpnpCertificate: false
    });
    setVerifiedItems(new Set());
    setSelectedCarton('carton-1');
    setUseNonCompanyCarton(false);
    setPackageWeight('');
    
    playSound('success');
  };

  // Complete packing
  const completePacking = async () => {
    if (!activePackingOrder) return;

    try {
      // Only update database for real orders (not mock orders)
      if (!activePackingOrder.id.startsWith('mock-')) {
        // Log packing completion activity
        await apiRequest(`/api/orders/${activePackingOrder.id}/pick-pack-logs`, 'POST', {
          activityType: 'pack_complete',
          userName: currentEmployee,
          notes: `Packing completed. Box: ${selectedBoxSize}, Weight: ${packageWeight}kg`
        });

        // Update order status to "shipped" when packing is complete
        await updateOrderStatusMutation.mutateAsync({
          orderId: activePackingOrder.id,
          status: 'shipped',
          packStatus: 'completed',
          packEndTime: new Date().toISOString(),
          shippedAt: new Date().toISOString(),
          finalWeight: parseFloat(packageWeight) || 0,
          cartonUsed: selectedBoxSize
        });
      }

      const updatedOrder = {
        ...activePackingOrder,
        packStatus: 'completed' as const,
        packEndTime: new Date().toISOString(),
        status: 'shipped' as const,
        shippedAt: new Date().toISOString()
      };

      setIsPackingTimerRunning(false);
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      toast({
        title: "Order Shipped!",
        description: `Order ${activePackingOrder.orderId} has been completed and marked as shipped`,
      });
      
      playSound('complete');
      setActivePackingOrder(null);
      setSelectedTab('ready');
    } catch (error) {
      console.error('Error completing packing:', error);
      toast({
        title: "Error",
        description: "Failed to complete packing. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Mark order as shipped
  const markAsShipped = async (order: PickPackOrder) => {
    await updateOrderStatusMutation.mutateAsync({
      orderId: order.id,
      status: 'shipped'
    });

    playSound('success');
    queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
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
      playSound('scan');
    } else {
      playSound('error');
    }
    setBarcodeInput('');
    barcodeInputRef.current?.focus();
  };

  // Filter orders by status - Updated to work with "to_fulfill" orders
  const getOrdersByStatus = (status: string) => {
    return transformedOrders.filter(order => {
      if (status === 'pending') return order.status === 'to_fulfill' && (order.pickStatus === 'not_started' || !order.pickStatus);
      if (status === 'picking') return order.status === 'to_fulfill' && order.pickStatus === 'in_progress';
      if (status === 'packing') return order.status === 'to_fulfill' && (order.packStatus === 'in_progress' || (order.pickStatus === 'completed' && order.packStatus === 'not_started'));
      if (status === 'ready') return order.status === 'ready_to_ship' || order.status === 'shipped';
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

  const getOrderStatusDisplay = (order: PickPackOrder) => {
    // Check the pickStatus and packStatus fields for actual status
    if (order.pickStatus === 'in_progress') {
      return { label: 'Currently Picking', color: 'bg-blue-100 text-blue-700 border-blue-200' };
    }
    if (order.packStatus === 'in_progress') {
      return { label: 'Currently Packing', color: 'bg-purple-100 text-purple-700 border-purple-200' };
    }
    if (order.packStatus === 'completed' || order.status === 'shipped') {
      return { label: 'Ready to Ship', color: 'bg-green-100 text-green-700 border-green-200' };
    }
    if (order.pickStatus === 'completed' && order.packStatus === 'not_started') {
      return { label: 'Awaiting Packing', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    }
    if (order.pickStatus === 'not_started') {
      return { label: 'Pending', color: 'bg-gray-100 text-gray-600 border-gray-200' };
    }
    return { label: 'Pending', color: 'bg-gray-100 text-gray-600 border-gray-200' };
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
    const currentCarton = packingRecommendation?.cartons.find(c => c.id === selectedCarton);
    const allItemsVerified = currentCarton ? currentCarton.items.every(item => verifiedItems.has(item.id)) : false;
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
                    weightRecorded: false,
                    fragileProtected: false
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
                        placeholder="Continuous scan mode - Point scanner at item"
                        value={barcodeInput || "🎯 Ready to scan..."}
                        readOnly
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            // Find matching item
                            const matchingItem = activePackingOrder.items.find(
                              item => item.barcode === barcodeInput || item.sku === barcodeInput
                            );
                            if (matchingItem) {
                              setVerifiedItems(new Set(Array.from(verifiedItems).concat(matchingItem.id)));
                              playSound('scan');
                            } else {
                              playSound('error');
                            }
                            setBarcodeInput('');
                          }
                        }}
                        className="text-lg font-mono cursor-default"
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
                            className={`relative p-3 rounded-lg border-2 transition-all ${
                              isVerified 
                                ? 'bg-green-50 border-green-300' 
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            {/* Shipping Note Warning Banner */}
                            {item.shipmentNotes && (
                              <div className="absolute -top-1 -right-1 z-10">
                                <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                                  <AlertTriangle className="h-3 w-3" />
                                  SPECIAL
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-3">
                              {/* Product Image */}
                              <div className="relative">
                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-white border-2 border-gray-200 flex items-center justify-center">
                                  {item.productImage ? (
                                    <img 
                                      src={item.productImage} 
                                      alt={item.productName}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Package className="h-8 w-8 text-gray-400" />
                                  )}
                                </div>
                                {/* Verification Status Badge */}
                                <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                  isVerified 
                                    ? 'bg-green-500 text-white' 
                                    : 'bg-purple-100 text-purple-600 border-2 border-white'
                                }`}>
                                  {isVerified ? <CheckCircle className="h-4 w-4" /> : index + 1}
                                </div>
                              </div>

                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-900 text-sm leading-tight">{item.productName}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      {/* Prominent Quantity Display */}
                                      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md font-bold text-sm">
                                        Qty: {item.quantity}
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        {item.warehouseLocation}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Verify Button */}
                                  <Button
                                    variant={isVerified ? "default" : "outline"}
                                    size="sm"
                                    className={`ml-2 ${
                                      isVerified 
                                        ? 'bg-green-500 hover:bg-green-600 text-white' 
                                        : 'border-purple-300 text-purple-600 hover:bg-purple-50'
                                    }`}
                                    onClick={() => {
                                      if (isVerified) {
                                        const newSet = new Set(verifiedItems);
                                        newSet.delete(item.id);
                                        setVerifiedItems(newSet);
                                      } else {
                                        setVerifiedItems(new Set([...verifiedItems, item.id]));
                                        playSound('scan');
                                      }
                                    }}
                                  >
                                    {isVerified ? (
                                      <>
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Done
                                      </>
                                    ) : (
                                      <>
                                        <ScanLine className="h-3 w-3 mr-1" />
                                        Verify
                                      </>
                                    )}
                                  </Button>
                                </div>
                                
                                {/* Enhanced Shipping Instructions */}
                                {item.shipmentNotes && (
                                  <div className="mt-3 p-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border-l-4 border-red-400">
                                    <div className="flex items-start gap-2">
                                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <div className="text-xs font-semibold text-red-700 mb-1">SPECIAL HANDLING REQUIRED</div>
                                        <div className="text-xs text-red-600 leading-relaxed">{item.shipmentNotes}</div>
                                        {item.packingMaterial && (
                                          <div className="flex items-center gap-2 mt-2">
                                            {item.packingMaterial.imageUrl && (
                                              <img 
                                                src={item.packingMaterial.imageUrl} 
                                                alt={item.packingMaterial.name}
                                                className="w-8 h-8 rounded object-cover border"
                                              />
                                            )}
                                            <div className="text-xs">
                                              <div className="font-medium text-red-700">{item.packingMaterial.name}</div>
                                              <div className="text-red-500">{item.packingMaterial.description}</div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Documents to Print Section */}
              <Card className="shadow-xl border-0">
                <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documents to Print
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Document Checklist */}
                    <div className="space-y-2">
                      {/* Packing List */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            checked={printedDocuments.packingList}
                            readOnly
                            className="cursor-default"
                          />
                          <div className="flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">Packing List</span>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            window.print();
                            setPrintedDocuments(prev => ({ ...prev, packingList: true }));
                            playSound('success');
                          }}
                        >
                          <Printer className="h-3 w-3 mr-1" />
                          Print
                        </Button>
                      </div>

                      {/* Invoice */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            checked={printedDocuments.invoice}
                            readOnly
                            className="cursor-default"
                          />
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium">Invoice</span>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            window.open(`/api/orders/${activePackingOrder.id}/invoice.pdf`, '_blank');
                            setPrintedDocuments(prev => ({ ...prev, invoice: true }));
                            playSound('success');
                          }}
                        >
                          <Printer className="h-3 w-3 mr-1" />
                          Print
                        </Button>
                      </div>

                      {/* MSDS Files */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            checked={printedDocuments.msds}
                            readOnly
                            className="cursor-default"
                          />
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                            <span className="text-sm font-medium">MSDS Files</span>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            window.open(`/api/orders/${activePackingOrder.id}/msds.pdf`, '_blank');
                            setPrintedDocuments(prev => ({ ...prev, msds: true }));
                            playSound('success');
                          }}
                        >
                          <Printer className="h-3 w-3 mr-1" />
                          Print
                        </Button>
                      </div>

                      {/* CPNP Certificate */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            checked={printedDocuments.cpnpCertificate}
                            readOnly
                            className="cursor-default"
                          />
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-medium">CPNP Certificate</span>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            window.open(`/api/orders/${activePackingOrder.id}/cpnp-certificate.pdf`, '_blank');
                            setPrintedDocuments(prev => ({ ...prev, cpnpCertificate: true }));
                            playSound('success');
                          }}
                        >
                          <Printer className="h-3 w-3 mr-1" />
                          Print
                        </Button>
                      </div>
                    </div>
                    
                    {/* Print All Documents Button */}
                    <Button 
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                      onClick={() => {
                        // Print all required documents
                        const documents = [
                          `/api/orders/${activePackingOrder.id}/packing-list.pdf`,
                          `/api/orders/${activePackingOrder.id}/invoice.pdf`,
                          `/api/orders/${activePackingOrder.id}/msds.pdf`,
                          `/api/orders/${activePackingOrder.id}/cpnp-certificate.pdf`
                        ];
                        
                        documents.forEach((doc, index) => {
                          setTimeout(() => {
                            window.open(doc, '_blank');
                          }, index * 500); // Stagger opening to avoid browser blocking
                        });
                        
                        // Mark all documents as printed
                        setPrintedDocuments({
                          packingList: true,
                          invoice: true,
                          msds: true,
                          cpnpCertificate: true
                        });
                        
                        playSound('success');
                        toast({
                          title: "Documents Generated",
                          description: "All required documents have been generated and opened for printing",
                        });
                      }}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print All Documents
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Reference Card - Materials Summary */}
              {activePackingOrder.items.some(item => item.packingMaterial) && (
                <Card className="shadow-xl border-0">
                  <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Package className="h-5 w-5" />
                      Quick Material Reference
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 mb-3">
                        All required materials are shown within each item's instructions on the left.
                      </p>
                      {activePackingOrder.items
                        .filter(item => item.packingMaterial)
                        .map((item, index, arr) => {
                          // Group by packing material to avoid duplicates
                          const isDuplicate = arr.findIndex(i => i.packingMaterial?.id === item.packingMaterial?.id) !== index;
                          if (isDuplicate) return null;
                          
                          return (
                            <div key={item.packingMaterial!.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm font-medium">{item.packingMaterial!.name}</span>
                            </div>
                          );
                        })
                      }
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Right Column - Packing Details */}
              <div className="space-y-4">
                {/* AI Carton Selection */}
                <Card className="shadow-xl border-0">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Carton Selection
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {availableCartons.length > 0 ? (
                      <div className="space-y-4">
                        {/* AI Recommendation */}
                        {recommendedCarton && (
                          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-3 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              <span className="font-semibold text-green-800 text-sm">AI Recommendation</span>
                            </div>
                            <div className="text-sm text-green-700">
                              Optimal carton: <strong>{recommendedCarton.name}</strong>
                            </div>
                          </div>
                        )}

                        {/* Carton Selection */}
                        <div className="space-y-3">
                          <label className="text-sm font-medium">Select Carton to Pack:</label>
                          
                          {/* Search Input */}
                          <div className="relative">
                            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                            <Input
                              placeholder="Search cartons by name, material, or dimensions..."
                              value={cartonSearchFilter}
                              onChange={(e) => setCartonSearchFilter(e.target.value)}
                              className="pl-10"
                            />
                          </div>

                          {/* Dropdown Selection */}
                          <Select 
                            value={useNonCompanyCarton ? 'non-company' : selectedCarton} 
                            onValueChange={(value) => {
                              if (value === 'non-company') {
                                setUseNonCompanyCarton(true);
                                setSelectedCarton('non-company');
                                setSelectedBoxSize('Non-company Carton');
                                setPackageWeight('');
                                toast({
                                  title: 'Non-company carton selected',
                                  description: 'Please enter the package details manually'
                                });
                              } else {
                                setUseNonCompanyCarton(false);
                                const carton = availableCartons.find((c: any) => c.id === value);
                                if (carton) {
                                  setSelectedCarton(carton.id);
                                  setSelectedBoxSize(carton.name);
                                }
                              }
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Choose a carton..." />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredCartons.map((carton: any) => (
                                <SelectItem key={carton.id} value={carton.id}>
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex-1">
                                      <div className="font-medium">{carton.name}</div>
                                      <div className="text-xs text-gray-500">
                                        {carton.dimensions.length}×{carton.dimensions.width}×{carton.dimensions.height}cm • {carton.material} • Max: {carton.maxWeight}kg
                                      </div>
                                    </div>
                                    <div className="text-sm font-semibold text-blue-600 ml-2">
                                      {carton.weight}kg
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                              <SelectItem value="non-company">
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-gray-600" />
                                  <span className="font-medium">Non-company carton</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Non-company carton clickable option */}
                          <div 
                            className={`p-3 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
                              useNonCompanyCarton 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                            }`}
                            onClick={() => {
                              const newValue = !useNonCompanyCarton;
                              setUseNonCompanyCarton(newValue);
                              if (newValue) {
                                setSelectedCarton('non-company');
                                setSelectedBoxSize('Non-company Carton');
                                setPackageWeight('');
                                toast({
                                  title: 'Non-company carton selected',
                                  description: 'Please enter the package details manually'
                                });
                              } else {
                                // Reset to first available carton if unchecked
                                if (availableCartons.length) {
                                  const firstCarton = availableCartons[0];
                                  setSelectedCarton(firstCarton.id);
                                  setSelectedBoxSize(firstCarton.name);
                                  setPackageWeight('');
                                }
                              }
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox 
                                checked={useNonCompanyCarton}
                                readOnly
                                className="cursor-pointer"
                              />
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-gray-600" />
                                <span className="text-sm font-medium">I picked a Non-company carton</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Zap className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">Start packing to see AI recommendations</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Selected Carton Details */}
                {selectedCarton && !useNonCompanyCarton && availableCartons.length > 0 && (
                  <Card className="shadow-xl border-0">
                    <CardHeader className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Box className="h-4 w-4" />
                        Selected Carton Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      {(() => {
                        const carton = availableCartons.find((c: any) => c.id === selectedCarton);
                        if (!carton) return null;
                        
                        return (
                          <div className="space-y-3">
                            {/* Carton Info */}
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">{carton.name}</span>
                                <Badge variant="secondary">
                                  {carton.material}
                                </Badge>
                              </div>
                              <div className="text-xs text-gray-600 space-y-1">
                                <div>Dimensions: {carton.dimensions.length}×{carton.dimensions.width}×{carton.dimensions.height}cm</div>
                                <div>Carton Weight: {carton.weight}kg</div>
                                <div>Max Capacity: {carton.maxWeight}kg</div>
                                <div>Type: {carton.type}</div>
                              </div>
                            </div>
                            
                            {/* Instructions */}
                            <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                              Place all order items in this carton and use the AI weight calculation to get the final package weight.
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}

                {/* AI Weight Calculation */}
                <Card className="shadow-xl border-0">
                  <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      AI Package Weight Calculation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      {/* Multi-carton optimization toggle */}
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                        <div className="flex items-center space-x-3">
                          <Package className="h-5 w-5 text-orange-600" />
                          <div>
                            <h4 className="text-sm font-medium text-orange-800">Multi-Carton Optimization</h4>
                            <p className="text-xs text-orange-600">Analyze if using multiple cartons reduces shipping costs</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={enableMultiCartonOptimization}
                            onChange={(e) => setEnableMultiCartonOptimization(e.target.checked)}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                      </div>

                      {/* Auto-calculation status */}
                      {calculateWeightMutation.isPending && (
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                            <span className="text-sm text-blue-700">Calculating AI weight automatically...</span>
                          </div>
                        </div>
                      )}

                      {/* Weight Results */}
                      {aiWeightCalculation && (
                        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span className="font-semibold text-green-800">AI Weight Analysis</span>
                            <Badge variant="outline" className="text-xs">
                              {Math.round(aiWeightCalculation.confidence * 100)}% confidence
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="text-center p-2 bg-white rounded border">
                              <div className="text-xl font-bold text-green-600">
                                {aiWeightCalculation.totalWeight}kg
                              </div>
                              <div className="text-xs text-gray-500">Total Weight</div>
                            </div>
                            <div className="text-center p-2 bg-white rounded border">
                              <div className="text-sm font-semibold text-blue-600">
                                {aiWeightCalculation.recommendations.shippingMethod}
                              </div>
                              <div className="text-xs text-gray-500">Recommended Ship</div>
                            </div>
                          </div>

                          {/* Weight Breakdown */}
                          <div className="space-y-2 mb-3">
                            <div className="flex justify-between text-sm">
                              <span>Items:</span>
                              <span>{aiWeightCalculation.breakdown.itemsWeight}kg</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Carton:</span>
                              <span>{aiWeightCalculation.breakdown.cartonWeight}kg</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Packing Materials:</span>
                              <span>{aiWeightCalculation.breakdown.packingMaterialsWeight}kg</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Additional (tape, labels):</span>
                              <span>{aiWeightCalculation.breakdown.additionalWeight}kg</span>
                            </div>
                          </div>

                          {/* Handling Instructions */}
                          {aiWeightCalculation.recommendations.handlingInstructions.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-xs font-medium text-gray-700">Handling Instructions:</div>
                              {aiWeightCalculation.recommendations.handlingInstructions.map((instruction: string, index: number) => (
                                <div key={index} className="text-xs text-gray-600 flex items-center gap-1">
                                  <Info className="h-3 w-3" />
                                  {instruction}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Multi-Carton Optimization Results */}
                      {aiWeightCalculation && aiWeightCalculation.multiCartonPlan && (
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Package className="h-4 w-4 text-amber-600" />
                            <span className="font-semibold text-amber-800">Multi-Carton Analysis</span>
                            <Badge variant="outline" className="text-xs bg-amber-100">
                              {Math.round(aiWeightCalculation.multiCartonPlan.confidence * 100)}% confidence
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="text-center p-2 bg-white rounded border">
                              <div className="text-lg font-bold text-amber-600">
                                {aiWeightCalculation.multiCartonPlan.cartonPlans.length}
                              </div>
                              <div className="text-xs text-gray-500">Cartons</div>
                            </div>
                            <div className="text-center p-2 bg-white rounded border">
                              <div className="text-lg font-bold text-green-600">
                                ${aiWeightCalculation.multiCartonPlan.totalCost.toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-500">Total Cost</div>
                            </div>
                            <div className="text-center p-2 bg-white rounded border">
                              <div className="text-lg font-bold text-blue-600">
                                {aiWeightCalculation.multiCartonPlan.totalWeight.toFixed(2)}kg
                              </div>
                              <div className="text-xs text-gray-500">Total Weight</div>
                            </div>
                          </div>

                          {/* Carton Plans */}
                          <div className="space-y-3 mb-3">
                            <div className="text-sm font-medium text-gray-700">Carton Distribution:</div>
                            {aiWeightCalculation.multiCartonPlan.cartonPlans.map((plan: any, index: number) => (
                              <div key={index} className="bg-white p-3 rounded border">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-medium text-sm">{plan.cartonName}</span>
                                  <div className="flex gap-2">
                                    <Badge variant="secondary" className="text-xs">
                                      {plan.utilizationPercent.toFixed(0)}% full
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      ${plan.costEstimate.toFixed(2)}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-600 mb-1">
                                  Items: {plan.items.length} | Weight: {plan.finalWeight.toFixed(2)}kg / {plan.maxWeight}kg
                                </div>
                                <div className="text-xs text-gray-500">
                                  {plan.items.map((item: any) => item.productName).join(', ')}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Cost Savings */}
                          {aiWeightCalculation.multiCartonPlan.recommendations.costSavings && (
                            <div className="bg-green-100 p-2 rounded text-sm text-green-800 font-medium">
                              💰 {aiWeightCalculation.multiCartonPlan.recommendations.costSavings}
                            </div>
                          )}

                          {/* Multi-carton Handling Instructions */}
                          {aiWeightCalculation.multiCartonPlan.recommendations.handlingInstructions.length > 0 && (
                            <div className="space-y-1 mt-3">
                              <div className="text-xs font-medium text-gray-700">Multi-Carton Instructions:</div>
                              {aiWeightCalculation.multiCartonPlan.recommendations.handlingInstructions.map((instruction: string, index: number) => (
                                <div key={index} className="text-xs text-gray-600 flex items-center gap-1">
                                  <Info className="h-3 w-3" />
                                  {instruction}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Manual Weight Override */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Final Weight (kg)</label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.001"
                            placeholder="Enter weight..."
                            value={packageWeight}
                            onChange={(e) => {
                              setPackageWeight(e.target.value);
                              setIsWeightManuallyModified(true);
                              if (e.target.value) {
                                setPackingChecklist({...packingChecklist, weightRecorded: true});
                              }
                            }}
                            className="text-lg"
                          />
                          <span className="flex items-center px-3 text-sm font-medium">kg</span>
                        </div>
                        {!isWeightManuallyModified && aiWeightCalculation && (
                          <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded">
                            <Zap className="h-3 w-3" />
                            <span>Weight automatically calculated by AI</span>
                          </div>
                        )}
                        {isWeightManuallyModified && (
                          <div className="text-xs text-gray-500">
                            Manual weight entered
                          </div>
                        )}
                        {!aiWeightCalculation && !isWeightManuallyModified && (
                          <div className="text-xs text-gray-500">
                            Weight will be calculated automatically
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Enhanced Packing Checklist */}
                <Card className="shadow-xl border-0">
                  <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" />
                      Smart Packing Checklist
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Items Verification */}
                      <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <Checkbox 
                          checked={allItemsVerified}
                          onCheckedChange={(checked) => setPackingChecklist({...packingChecklist, itemsVerified: !!checked})}
                        />
                        <div className="flex-1">
                          <span className={allItemsVerified ? 'text-green-600 font-medium' : 'font-medium'}>
                            All items verified and placed in carton
                          </span>
                          {currentCarton && (
                            <div className="text-xs text-gray-500 mt-1">
                              {verifiedItems.size}/{currentCarton.items.length} items verified in {currentCarton.boxSize.name}
                            </div>
                          )}
                        </div>
                        {allItemsVerified && <CheckCircle className="h-4 w-4 text-green-600" />}
                      </label>

                      {/* Packing Slip */}
                      <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <Checkbox 
                          checked={packingChecklist.packingSlipIncluded}
                          onCheckedChange={(checked) => setPackingChecklist({...packingChecklist, packingSlipIncluded: !!checked})}
                        />
                        <div className="flex-1">
                          <span className={packingChecklist.packingSlipIncluded ? 'text-green-600 font-medium' : 'font-medium'}>
                            Packing slip included
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            Include order details and customer information
                          </div>
                        </div>
                        {packingChecklist.packingSlipIncluded && <CheckCircle className="h-4 w-4 text-green-600" />}
                      </label>

                      {/* Fragile Handling */}
                      {currentCarton?.isFragile && (
                        <label className="flex items-center gap-3 p-3 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 border border-red-200">
                          <Checkbox 
                            checked={packingChecklist.fragileProtected}
                            onCheckedChange={(checked) => setPackingChecklist({...packingChecklist, fragileProtected: !!checked})}
                          />
                          <div className="flex-1">
                            <span className={packingChecklist.fragileProtected ? 'text-green-600 font-medium' : 'font-medium text-red-700'}>
                              Fragile items properly protected
                            </span>
                            <div className="text-xs text-red-600 mt-1">
                              Extra padding and fragile labels applied
                            </div>
                          </div>
                          {packingChecklist.fragileProtected && <CheckCircle className="h-4 w-4 text-green-600" />}
                        </label>
                      )}

                      {/* Weight Recording */}
                      <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <Checkbox 
                          checked={packingChecklist.weightRecorded}
                          onCheckedChange={(checked) => setPackingChecklist({...packingChecklist, weightRecorded: !!checked})}
                        />
                        <div className="flex-1">
                          <span className={packingChecklist.weightRecorded ? 'text-green-600 font-medium' : 'font-medium'}>
                            Weight recorded and verified
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            {packageWeight ? `Recorded: ${packageWeight}kg` : 'Enter final weight above'}
                          </div>
                        </div>
                        {packingChecklist.weightRecorded && <CheckCircle className="h-4 w-4 text-green-600" />}
                      </label>

                      {/* Box Sealing */}
                      <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <Checkbox 
                          checked={packingChecklist.boxSealed}
                          onCheckedChange={(checked) => setPackingChecklist({...packingChecklist, boxSealed: !!checked})}
                        />
                        <div className="flex-1">
                          <span className={packingChecklist.boxSealed ? 'text-green-600 font-medium' : 'font-medium'}>
                            Carton sealed and shipping label applied
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            Use quality tape and attach shipping label securely
                          </div>
                        </div>
                        {packingChecklist.boxSealed && <CheckCircle className="h-4 w-4 text-green-600" />}
                      </label>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 pt-3 border-t">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Checklist Progress</span>
                        <span>{Object.values(packingChecklist).filter(Boolean).length}/{Object.keys(packingChecklist).length}</span>
                      </div>
                      <Progress 
                        value={(Object.values(packingChecklist).filter(Boolean).length / Object.keys(packingChecklist).length) * 100}
                        className="h-2"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Shipping Label Generator */}
                <Card className="shadow-xl border-0">
                  <CardHeader className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Printer className="h-4 w-4" />
                      Shipping Label
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-sm font-medium mb-1">{activePackingOrder.customerName}</div>
                        <div className="text-xs text-gray-600">{activePackingOrder.shippingAddress}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          Method: {activePackingOrder.shippingMethod}
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600"
                        onClick={() => {
                          playSound('success');
                        }}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Generate Shipping Label
                      </Button>
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
                              weightRecorded: false,
                              fragileProtected: false
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
                              weightRecorded: false,
                              fragileProtected: false
                            });
                            setSelectedBoxSize('');
                            setPackageWeight('');
                            setVerifiedItems(new Set());
                            
                            // Find next order to pack
                            setTimeout(() => {
                              const nextOrder = getOrdersByStatus('packing')[0];
                              if (nextOrder) {
                                startPacking(nextOrder);
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
    // Use manual index instead of auto-finding next unpicked item
    const currentItemIndex = manualItemIndex;
    const currentItem = activePickingOrder.items[currentItemIndex] || null;
    const hasUnpickedItems = activePickingOrder.items.some(item => item.pickedQuantity < item.quantity);
    const allItemsPicked = activePickingOrder.items.every(item => item.pickedQuantity >= item.quantity);

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
            {!allItemsPicked && currentItem ? (
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
                    {/* Navigation Controls */}
                    <div className="flex justify-between items-center mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setManualItemIndex(Math.max(0, currentItemIndex - 1))}
                        disabled={currentItemIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <div className="text-sm text-gray-600 font-medium">
                        {currentItem?.pickedQuantity === currentItem?.quantity && (
                          <span className="text-green-600 font-bold">✓ Picked</span>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setManualItemIndex(Math.min(activePickingOrder.items.length - 1, currentItemIndex + 1))}
                        disabled={currentItemIndex === activePickingOrder.items.length - 1}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
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
                                    const allPicked = newPicked.size === currentItem.bundleItems?.length;
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
                          
                          {bundlePickedItems[currentItem.id]?.size === currentItem.bundleItems?.length && (
                            <Alert className="mt-4 bg-green-100 border-2 border-green-400 shadow-md">
                              <CheckCircle className="h-4 lg:h-5 w-4 lg:w-5 text-green-700" />
                              <AlertDescription className="text-green-800 font-semibold text-sm lg:text-base">
                                ✓ All bundle items picked! Ready for next item.
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {/* Quick Pick All Bundle Items */}
                          {(!bundlePickedItems[currentItem.id] || bundlePickedItems[currentItem.id].size < (currentItem.bundleItems?.length || 0)) && (
                            <Button 
                              size="lg" 
                              className="w-full mt-4 h-11 sm:h-12 lg:h-14 text-sm sm:text-base lg:text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
                              onClick={() => {
                                const allIds = new Set(currentItem.bundleItems?.map(item => item.id) || []);
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
                      
                      {/* Item Navigation Buttons - Below Pick Quantity */}
                      <div className="flex justify-between items-center mt-6 lg:mt-8 px-4 lg:px-8">
                        <Button
                          variant="outline"
                          size="lg"
                          className="flex items-center gap-2 h-12 lg:h-14 px-4 lg:px-6 font-bold text-sm lg:text-base border-2 hover:bg-gray-50"
                          onClick={() => setManualItemIndex(Math.max(0, currentItemIndex - 1))}
                          disabled={currentItemIndex === 0}
                        >
                          <ChevronLeft className="h-5 lg:h-6 w-5 lg:w-6" />
                          Previous Item
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="lg"
                          className="flex items-center gap-2 h-12 lg:h-14 px-4 lg:px-6 font-bold text-sm lg:text-base border-2 hover:bg-gray-50"
                          onClick={() => setManualItemIndex(Math.min(activePickingOrder.items.length - 1, currentItemIndex + 1))}
                          disabled={currentItemIndex === activePickingOrder.items.length - 1}
                        >
                          Next Item
                          <ChevronRight className="h-5 lg:h-6 w-5 lg:w-6" />
                        </Button>
                      </div>
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
                          placeholder="Continuous scan mode - Point scanner at item"
                          value={barcodeInput || "🎯 Ready to scan..."}
                          className="pl-8 sm:pl-10 lg:pl-12 text-sm sm:text-base lg:text-lg h-10 sm:h-12 lg:h-14 bg-white/95 border-white/30 placeholder:text-gray-500 font-mono cursor-default"
                          readOnly
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
            ) : allItemsPicked && showPickingCompletionModal ? (
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
                        onClick={async () => {
                          // Store order data before clearing
                          const orderTopack = {
                            ...activePickingOrder,
                            pickStatus: 'completed' as const,
                            pickEndTime: new Date().toISOString(),
                          };
                          
                          // Hide modal immediately
                          setShowPickingCompletionModal(false);
                          setSelectedTab('packing');
                          
                          // Complete picking first (needs activePickingOrder)
                          await completePicking();
                          
                          // Then clear picking state
                          setActivePickingOrder(null);
                          setPickingTimer(0);
                          setManualItemIndex(0);
                          
                          // Start packing the same order
                          setTimeout(() => {
                            startPacking(orderTopack);
                          }, 100);
                        }}
                        className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-xl transform hover:scale-105 transition-all"
                      >
                        <PackageCheck className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 mr-2 lg:mr-3" />
                        PROCEED TO PACKING
                      </Button>
                      
                      <Button 
                        size="lg" 
                        variant="outline"
                        onClick={async () => {
                          // Hide modal immediately
                          setShowPickingCompletionModal(false);
                          setSelectedTab('pending');
                          
                          await completePicking();
                          // Pick next order
                          setActivePickingOrder(null);
                          setPickingTimer(0);
                          setManualItemIndex(0);
                          
                          // After completing, immediately start the next priority order if available
                          setTimeout(() => {
                            const nextOrder = getOrdersByStatus('pending')[0];
                            if (nextOrder) {
                              startPicking(nextOrder);
                            }
                          }, 100);
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
            ) : (
              // Show current item view if we have a current item but not all items are picked
              currentItem && (
                <div className="max-w-4xl mx-auto">
                  <Alert className="mb-4 bg-yellow-50 border-2 border-yellow-400">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <AlertDescription className="text-yellow-800 font-semibold">
                      Unable to display item details. Please navigate using the Previous/Next buttons.
                    </AlertDescription>
                  </Alert>
                </div>
              )
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
              <div className="flex items-center gap-2">
                <Link href="/">
                  <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3">
                    <Home className="h-3 sm:h-4 w-3 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Button>
                </Link>
                
                {/* Navigation Menu */}
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                    >
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 p-0 flex flex-col h-full">
                    <div className="p-4 border-b flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <img src={logoPath} alt="Davie Professional" className="h-8" />
                        <div>
                          <h2 className="text-lg font-semibold">Navigation</h2>
                          <p className="text-sm text-gray-500">Pick & Pack Center</p>
                        </div>
                      </div>
                    </div>
                    <nav className="p-4 space-y-2 overflow-y-auto flex-1">
                      {navigation.map((item) => {
                        if (item.children) {
                          return (
                            <div key={item.name} className="space-y-1">
                              <div className="flex items-center px-3 py-2 text-sm font-medium text-gray-900">
                                <item.icon className="mr-3 h-4 w-4" />
                                {item.name}
                              </div>
                              <div className="pl-7 space-y-1">
                                {item.children.map((child) => (
                                  <Link key={child.href} href={child.href}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-full justify-start text-gray-600 px-3 py-2"
                                      onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                      {child.name}
                                    </Button>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return (
                          <Link key={item.name} href={item.href}>
                            <Button
                              variant="ghost"
                              className="w-full justify-start font-medium px-3 py-2"
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              <item.icon className="mr-3 h-4 w-4" />
                              {item.name}
                            </Button>
                          </Link>
                        );
                      })}
                    </nav>
                    <div className="p-4 border-t flex-shrink-0">
                      <div className="text-center text-sm text-gray-500">
                        Logged in as {currentEmployee}
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
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
                              {/* Status indicator */}
                              {(() => {
                                const status = getOrderStatusDisplay(order);
                                return (
                                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${status.color}`}>
                                    {status.label}
                                  </span>
                                );
                              })()}
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
                              {/* Status indicator */}
                              {(() => {
                                const status = getOrderStatusDisplay(order);
                                return (
                                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${status.color}`}>
                                    {status.label}
                                  </span>
                                );
                              })()}
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full sm:w-auto"
                              onClick={() => {
                                // Resume picking by setting the active order and switching to picking view
                                setActivePickingOrder(order);
                                setSelectedTab('picking');
                                // Find the first unpicked item or start at 0
                                const firstUnpickedIndex = order.items.findIndex(item => item.pickedQuantity < item.quantity);
                                setManualItemIndex(firstUnpickedIndex >= 0 ? firstUnpickedIndex : 0);
                                // Resume timer
                                setIsTimerRunning(true);
                                playSound('success');
                              }}
                            >
                              Resume Picking
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
                                {/* Status indicator */}
                                {(() => {
                                  const status = getOrderStatusDisplay(order);
                                  return (
                                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${status.color}`}>
                                      {status.label}
                                    </span>
                                  );
                                })()}
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
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                className="w-full sm:w-auto sm:h-10 bg-purple-600 hover:bg-purple-700"
                                onClick={() => startPacking(order)}
                              >
                                <Box className="h-4 sm:h-5 w-4 sm:w-5 mr-1 sm:mr-2" />
                                Start Packing
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-10 w-10 p-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      sendBackToPick(order);
                                    }}
                                  >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Send back to Pick
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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
                                {/* Status indicator */}
                                {(() => {
                                  const status = getOrderStatusDisplay(order);
                                  return (
                                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${status.color}`}>
                                      {status.label}
                                    </span>
                                  );
                                })()}
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
                                  playSound('success');
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