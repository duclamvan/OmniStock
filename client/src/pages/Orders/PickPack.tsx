import { useState, useEffect, useRef, memo } from "react";

import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { formatCurrency, formatDate } from "@/lib/currencyUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Link } from "wouter";
import { ImagePlaceholder } from "@/components/ImagePlaceholder";
import { 
  Package, 
  Printer, 
  CheckCircle,
  Circle, 
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
  Globe,
  Building,
  ChevronRight,
  ChevronDown,
  Zap,
  Eye,
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
  Maximize2,
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
  ShoppingCart,
  Check,
  Edit,
  Pause,
  XCircle
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
  productId?: string | null;
  serviceId?: string | null;
  bundleId?: string | null;
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
  notes?: string | null;
  shipmentNotes?: string | null;
  packingMaterial?: {
    id: string;
    name: string;
    imageUrl?: string | null;
    type?: string | null;
    description?: string | null;
  } | null;
  packingInstructionsText?: string | null;
  packingInstructionsImage?: string | null;
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
  selectedDocumentIds?: string[];
  currency?: string;
  // Modification tracking
  modifiedAfterPacking?: boolean;
  modificationNotes?: string;
  lastModifiedAt?: string;
  previousPackStatus?: string;
}

// Memoized Product Image Component to prevent re-renders from timer updates
const ProductImage = memo(({ 
  item, 
  isExpanded,
  onToggleExpand 
}: { 
  item: OrderItem, 
  isExpanded: boolean,
  onToggleExpand: () => void 
}) => {
  if (isExpanded) {
    // Full-width expanded view
    return (
      <div className="w-full space-y-3">
        <div 
          className="relative w-full h-[350px] sm:h-[450px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center shadow-lg border-2 border-white cursor-pointer hover:shadow-xl transition-all duration-300"
          onClick={(e) => {
            e.stopPropagation();
            console.log('Minimizing image');
            onToggleExpand();
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onToggleExpand();
            }
          }}
        >
          {/* Tiny minimize icon at top right - visual only */}
          <div className="absolute top-2 right-2 bg-black/10 rounded-full p-1 pointer-events-none">
            <Minus className="h-3 w-3 text-gray-600" />
          </div>
          
          {item.image ? (
            <img 
              src={item.image} 
              alt={item.productName}
              className="w-full h-full object-contain rounded-lg p-4"
              style={{ pointerEvents: 'none' }}
            />
          ) : (
            <div style={{ pointerEvents: 'none' }}>
              <ImagePlaceholder size="lg" variant="product" data-testid="placeholder-item-image-expanded" />
            </div>
          )}
        </div>
        
        {/* Product Details Below Image */}
        <div className="space-y-2 px-2">
          <div className="flex items-start gap-2">
            {item.productId ? (
              <Link href={`/products/${item.productId}`}>
                <h3 className="text-lg sm:text-xl font-bold text-blue-600 hover:text-blue-800 cursor-pointer hover:underline">{item.productName}</h3>
              </Link>
            ) : item.serviceId ? (
              <Link href={`/services/${item.serviceId}`}>
                <h3 className="text-lg sm:text-xl font-bold text-purple-600 hover:text-purple-800 cursor-pointer hover:underline">{item.productName}</h3>
              </Link>
            ) : item.bundleId ? (
              <Link href={`/bundles/${item.bundleId}`}>
                <h3 className="text-lg sm:text-xl font-bold text-green-600 hover:text-green-800 cursor-pointer hover:underline">{item.productName}</h3>
              </Link>
            ) : (
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">{item.productName}</h3>
            )}
          </div>
          {item.serviceId && (
            <div className="bg-purple-50 border border-purple-200 rounded p-2">
              <div className="flex items-center gap-1.5 mb-1">
                <Badge className="bg-purple-600 text-white text-xs">SERVICE</Badge>
                <span className="text-xs font-medium text-purple-700">Pick last - No physical location</span>
              </div>
              {item.notes && (
                <p className="text-xs text-purple-900 font-medium mt-1">Note: {item.notes}</p>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-gray-500">SKU:</span>
            <span className="font-mono font-semibold text-sm text-gray-900">{item.sku}</span>
          </div>
          <div className="flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-purple-500" />
            <span className="text-sm text-gray-500">Barcode:</span>
            <span className="font-mono font-semibold text-sm text-gray-900">{item.barcode}</span>
          </div>
        </div>
        
        <div className="flex justify-between items-center px-2">
          <span className="text-sm font-medium text-gray-500">Click to minimize</span>
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            {item.quantity}x
          </Badge>
        </div>
      </div>
    );
  }

  // Compact default view
  return (
    <div className="relative flex-shrink-0 z-0">
      <div 
        className="w-20 h-20 sm:w-24 sm:h-24 lg:w-40 lg:h-40 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center shadow-lg border-2 lg:border-4 border-white cursor-pointer hover:shadow-xl transition-shadow"
        onClick={(e) => {
          e.stopPropagation();
          console.log('Expanding image');
          onToggleExpand();
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onToggleExpand();
          }
        }}
      >
        {item.image ? (
          <img 
            src={item.image} 
            alt={item.productName}
            className="w-full h-full object-contain rounded-lg p-1 lg:p-2"
            style={{ pointerEvents: 'none' }}
          />
        ) : (
          <div style={{ pointerEvents: 'none' }}>
            <ImagePlaceholder size="xs" variant="product" data-testid="placeholder-item-image-compact" />
          </div>
        )}
      </div>
      <div className="absolute -top-1 -right-1 lg:-top-2 lg:-right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center font-bold text-xs lg:text-base shadow-lg" style={{ pointerEvents: 'none' }}>
        {item.quantity}x
      </div>
    </div>
  );
});

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
  const pickingStartTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showMobileProgress, setShowMobileProgress] = useState(false);
  const [showPerformanceStats, setShowPerformanceStats] = useState(false);
  const [batchPickingMode, setBatchPickingMode] = useState(false);
  const [selectedBatchItems, setSelectedBatchItems] = useState<Set<string>>(new Set());
  const [manualItemIndex, setManualItemIndex] = useState(0);
  const [modificationDialog, setModificationDialog] = useState<PickPackOrder | null>(null);
  const [showResetOrderDialog, setShowResetOrderDialog] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // State for packing process
  const [packingChecklist, setPackingChecklist] = useState({
    itemsVerified: false,
    packingSlipIncluded: false,
    boxSealed: false,
    weightRecorded: false,
    fragileProtected: false,
    invoiceIncluded: false,
    promotionalMaterials: false
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
  const [shippingLabelPrinted, setShippingLabelPrinted] = useState<boolean>(false);
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(new Set());
  const [bundlePickedItems, setBundlePickedItems] = useState<Record<string, Set<string>>>({}); // itemId -> Set of picked bundle item ids
  const [packingRecommendation, setPackingRecommendation] = useState<PackingRecommendation | null>(null);
  const [selectedCartons, setSelectedCartons] = useState<Array<{
    id: string;
    cartonId: string;
    cartonName: string;
    isNonCompany: boolean;
    weight?: string;
    aiCalculation?: any;
  }>>([]);
  const [currentCartonSelection, setCurrentCartonSelection] = useState<string>('');
  const [currentUseNonCompanyCarton, setCurrentUseNonCompanyCarton] = useState<boolean>(false);
  const [aiWeightCalculation, setAiWeightCalculation] = useState<any>(null);
  const [enableMultiCartonOptimization, setEnableMultiCartonOptimization] = useState<boolean>(false);
  const [cartonSearchFilter, setCartonSearchFilter] = useState<string>('');
  const [isWeightManuallyModified, setIsWeightManuallyModified] = useState<boolean>(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState<number>(0);
  
  // Legacy states for compatibility
  const [selectedCarton, setSelectedCarton] = useState<string>('');
  const [useNonCompanyCarton, setUseNonCompanyCarton] = useState<boolean>(false);
  const [previewOrder, setPreviewOrder] = useState<PickPackOrder | null>(null);
  const [selectedReadyOrders, setSelectedReadyOrders] = useState<Set<string>>(new Set());
  const [showShipAllConfirm, setShowShipAllConfirm] = useState(false);
  const [recentlyShippedOrders, setRecentlyShippedOrders] = useState<PickPackOrder[]>([]);
  const [showUndoPopup, setShowUndoPopup] = useState(false);
  const [undoTimeLeft, setUndoTimeLeft] = useState(15);
  const [pendingShipments, setPendingShipments] = useState<{
    orderIds: string[];
    timestamp: number;
    description: string;
  } | null>(null);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    // Initialize from localStorage
    const saved = localStorage.getItem('pickpack-collapsed-sections');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [preferExpandedImages, setPreferExpandedImages] = useState<boolean>(() => {
    // Load preference from localStorage
    return localStorage.getItem('pickPackExpandedImages') === 'true';
  });
  
  // Track orders being sent back to pick (for instant UI update)
  const [ordersSentBack, setOrdersSentBack] = useState<Set<string>>(new Set());
  
  // Track orders being returned to packing (for instant UI update)
  const [ordersReturnedToPacking, setOrdersReturnedToPacking] = useState<Set<string>>(new Set());
  
  // Workflow management state
  const [orderToHold, setOrderToHold] = useState<PickPackOrder | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<PickPackOrder | null>(null);
  const [orderToSendToPending, setOrderToSendToPending] = useState<PickPackOrder | null>(null);
  
  // Track animated counters for bouncy animation
  const [animatingCounters, setAnimatingCounters] = useState<Set<string>>(new Set());
  const previousCountsRef = useRef<{
    pending: number;
    picking: number;
    packing: number;
    ready: number;
  }>({ pending: 0, picking: 0, packing: 0, ready: 0 });

  // Helper functions for persisting picked items
  const savePickedProgress = (orderId: string, items: OrderItem[]) => {
    const progress = items.map(item => ({
      id: item.id,
      pickedQuantity: item.pickedQuantity
    }));
    localStorage.setItem(`pickpack-progress-${orderId}`, JSON.stringify(progress));
  };

  const loadPickedProgress = (orderId: string): Record<string, number> | null => {
    const saved = localStorage.getItem(`pickpack-progress-${orderId}`);
    if (!saved) return null;
    
    try {
      const progress = JSON.parse(saved);
      return progress.reduce((acc: Record<string, number>, item: { id: string; pickedQuantity: number }) => {
        acc[item.id] = item.pickedQuantity;
        return acc;
      }, {});
    } catch {
      return null;
    }
  };

  const clearPickedProgress = (orderId: string) => {
    localStorage.removeItem(`pickpack-progress-${orderId}`);
  };

  // Toggle section collapse state
  const toggleSectionCollapse = (sectionName: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionName)) {
        newSet.delete(sectionName);
      } else {
        newSet.add(sectionName);
      }
      // Save to localStorage
      localStorage.setItem('pickpack-collapsed-sections', JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  // Handle image click for in-place expansion
  const handleImageClick = (productId: string) => {
    console.log('Image clicked for product:', productId);
    if (expandedProductId === productId) {
      console.log('Minimizing image');
      setExpandedProductId(null);
      // If user manually minimizes, turn off the preference
      setPreferExpandedImages(false);
      localStorage.setItem('pickPackExpandedImages', 'false');
    } else {
      console.log('Expanding image for product:', productId);
      setExpandedProductId(productId);
      // If user manually expands, turn on the preference
      setPreferExpandedImages(true);
      localStorage.setItem('pickPackExpandedImages', 'true');
    }
  };

  // Auto-expand images based on preference when item changes
  useEffect(() => {
    if (preferExpandedImages && activePickingOrder) {
      const currentItem = activePickingOrder.items[manualItemIndex];
      if (currentItem) {
        setExpandedProductId(currentItem.id);
      }
    }
  }, [manualItemIndex, activePickingOrder, preferExpandedImages]);

  // Track active picking/packing mode for header visibility
  useEffect(() => {
    const isActiveMode = !!(activePickingOrder || activePackingOrder);
    sessionStorage.setItem('pickpack-active-mode', isActiveMode ? 'true' : 'false');
    
    // Cleanup when component unmounts
    return () => {
      sessionStorage.removeItem('pickpack-active-mode');
    };
  }, [activePickingOrder, activePackingOrder]);

  // Timer effect for undo popup
  useEffect(() => {
    if (showUndoPopup && undoTimeLeft > 0) {
      const timer = setTimeout(() => {
        setUndoTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (undoTimeLeft === 0) {
      setShowUndoPopup(false);
      setRecentlyShippedOrders([]);
      setUndoTimeLeft(5);
    }
  }, [showUndoPopup, undoTimeLeft]);

  // Timer effects - completely independent of React to avoid any re-renders
  useEffect(() => {
    if (isTimerRunning) {
      // Store the start time once
      const startTime = Date.now() - (pickingTimer * 1000);
      
      // Create a completely independent timer that only updates DOM text
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const formatted = formatTimer(elapsed);
        
        // Direct DOM manipulation without triggering any React updates
        const timerElements = document.querySelectorAll('[data-picking-timer]');
        timerElements.forEach(el => {
          if (el.textContent !== formatted) {
            el.textContent = formatted;
          }
        });
      }, 1000);
      
      // Store interval ref for cleanup
      timerIntervalRef.current = interval;
      
      // Initial update
      const initialElapsed = Math.floor((Date.now() - startTime) / 1000);
      const initialFormatted = formatTimer(initialElapsed);
      document.querySelectorAll('[data-picking-timer]').forEach(el => {
        el.textContent = initialFormatted;
      });
      
      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      };
    } else {
      // Clear interval when timer stops
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  }, [isTimerRunning]); // Remove pickingTimer from deps to avoid re-runs

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
  }, [activePickingOrder?.id, activePickingOrder?.pickStatus, JSON.stringify(activePickingOrder?.items?.map(i => ({ id: i.id, pickedQuantity: i.pickedQuantity })))]);

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
    if (activePackingOrder && selectedCarton && !useNonCompanyCarton) {
      // Reset AI calculation when carton changes
      if (aiWeightCalculation && aiWeightCalculation.cartonId !== selectedCarton) {
        setAiWeightCalculation(null);
        setPackageWeight('');
        setIsWeightManuallyModified(false);
      }
      
      // Trigger automatic weight calculation if not already calculated
      if (!aiWeightCalculation || aiWeightCalculation.cartonId !== selectedCarton) {
        calculateWeightMutation.mutate({
          orderId: activePackingOrder.id,
          selectedCartonId: selectedCarton,
          optimizeMultipleCartons: enableMultiCartonOptimization
        });
      }
    }
  }, [activePackingOrder?.id, selectedCarton, useNonCompanyCarton]);

  // Auto-focus barcode input when entering picking mode
  useEffect(() => {
    if (activePickingOrder && barcodeInputRef.current) {
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    }
  }, [activePickingOrder?.id]);

  // Auto-focus barcode input when entering packing mode
  useEffect(() => {
    if (activePackingOrder && barcodeInputRef.current) {
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    }
  }, [activePackingOrder?.id]);

  // Auto-focus search field when on overview tab
  useEffect(() => {
    if (selectedTab === 'overview' && searchInputRef.current && !activePickingOrder && !activePackingOrder) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [selectedTab, activePickingOrder, activePackingOrder]);

  // Fetch real orders from the API with items and bundle details
  // Real-time data synchronization: refetch every 5 seconds to ensure Pick & Pack always shows latest order data
  const { data: allOrders = [], isLoading, isSuccess } = useQuery({
    queryKey: ['/api/orders/pick-pack'],
    staleTime: 10 * 1000, // 10 seconds - keep data fresh
    refetchInterval: 5000, // 5 seconds - real-time updates for active picking/packing
    refetchOnWindowFocus: true, // Always refetch when user returns to tab
    refetchOnMount: true, // Always refetch when component mounts
  });
  
  // Fetch pick/pack performance predictions for current user
  const { data: predictions } = useQuery<{
    pickingTimePerOrder: number;
    packingTimePerOrder: number;
    pickingTimePerItem: number;
    packingTimePerItem: number;
  }>({
    queryKey: ['/api/orders/pick-pack/predictions'],
    staleTime: 5 * 60 * 1000, // 5 minutes (predictions don't change frequently)
    refetchInterval: false, // Disable interval refetch for performance
    refetchOnWindowFocus: false,
  });

  // Query for available cartons
  const { data: availableCartons = [], isLoading: isLoadingCartons } = useQuery<any[]>({
    queryKey: ['/api/cartons/available'],
    staleTime: 10 * 60 * 1000, // 10 minutes (cartons rarely change)
    refetchInterval: false, // Disable interval refetch
    refetchOnWindowFocus: false,
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  // Mutation for calculating package weight
  const calculateWeightMutation = useMutation({
    mutationFn: async ({ orderId, selectedCartonId, optimizeMultipleCartons }: { 
      orderId: string; 
      selectedCartonId: string; 
      optimizeMultipleCartons?: boolean 
    }) => {
      const response = await apiRequest('POST', `/api/orders/${orderId}/calculate-weight`, { selectedCartonId, optimizeMultipleCartons });
      return await response.json();
    },
    onSuccess: (data, variables) => {
      console.log('Weight calculation success:', data);
      
      // Add cartonId to the calculation result for tracking
      const calculationWithCarton = { ...data, cartonId: variables.selectedCartonId };
      setAiWeightCalculation(calculationWithCarton);
      
      // Automatically set the weight from AI calculation
      if (data && data.totalWeight !== undefined && data.totalWeight !== null) {
        const weightValue = data.totalWeight.toString();
        console.log('Setting package weight to:', weightValue);
        setPackageWeight(weightValue);
        setPackingChecklist(prev => ({ ...prev, weightRecorded: true }));
        setIsWeightManuallyModified(false);
      } else {
        console.log('No totalWeight in data:', data);
      }
    },
  });

  // Keyboard shortcuts for quick navigation and actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input/textarea/select (except our barcode input)
      const target = e.target as HTMLElement;
      const isFormInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      const isBarcodeInput = target === barcodeInputRef.current;
      
      // Ctrl/Cmd + K: Focus barcode input (when in picking/packing mode)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (activePickingOrder || activePackingOrder) {
          barcodeInputRef.current?.focus();
        }
      }
      
      // Ctrl/Cmd + S: Start/Resume picking for first pending order
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!activePickingOrder && !activePackingOrder && transformedOrders.length > 0) {
          // Find first pending order (status = 'to_fulfill')
          const pendingOrders = transformedOrders.filter(o => o.status === 'to_fulfill');
          if (pendingOrders.length > 0) {
            const order = pendingOrders[0];
            setActivePickingOrder(order);
            setSelectedTab('picking');
            const firstUnpickedIndex = order.items.findIndex((item: any) => item.pickedQuantity < item.quantity);
            setManualItemIndex(firstUnpickedIndex >= 0 ? firstUnpickedIndex : 0);
            setIsTimerRunning(true);
          }
        }
      }
      
      // Alt + N: Navigate to next item (when picking)
      if (e.altKey && e.key === 'n') {
        e.preventDefault();
        if (activePickingOrder && !isFormInput) {
          window.scrollTo(0, 0);
          const currentItemIndex = manualItemIndex;
          setManualItemIndex(Math.min(activePickingOrder.items.length - 1, currentItemIndex + 1));
        }
      }
      
      // Alt + P: Navigate to previous item (when picking)
      if (e.altKey && e.key === 'p') {
        e.preventDefault();
        if (activePickingOrder && !isFormInput) {
          window.scrollTo(0, 0);
          const currentItemIndex = manualItemIndex;
          setManualItemIndex(Math.max(0, currentItemIndex - 1));
        }
      }
      
      // Enter: Confirm current action in barcode input
      if (e.key === 'Enter' && isBarcodeInput) {
        // Let the existing onKeyPress handler handle this
      }
      
      // Escape: Cancel/Close current modal or return to overview
      if (e.key === 'Escape') {
        if (showPickingCompletionModal) {
          setShowPickingCompletionModal(false);
        } else if (activePickingOrder) {
          // Optionally exit picking mode - user might want this
          // Uncomment if desired: setActivePickingOrder(null);
        } else if (activePackingOrder) {
          // Optionally exit packing mode
          // Uncomment if desired: setActivePackingOrder(null);
        } else {
          // Return to overview tab
          setSelectedTab('overview');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activePickingOrder, activePackingOrder, showPickingCompletionModal, selectedTab, manualItemIndex, allOrders]);

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

  // Convert database cartons to BoxSize format for packing algorithm
  const convertCartonsToBoxSizes = (cartons: any[]): BoxSize[] => {
    return cartons.map(carton => ({
      id: carton.id,
      name: carton.name,
      dimensions: {
        length: carton.dimensions.length,
        width: carton.dimensions.width,
        height: carton.dimensions.height,
        weight: carton.weight || 0.2 // Default tare weight if not provided
      },
      maxWeight: carton.maxWeight,
      cost: carton.cost || 2.0, // Default cost if not in database
      material: carton.material || 'Corrugated Cardboard'
    }));
  };

  // AI-powered packing optimization algorithm
  const generatePackingRecommendation = (items: OrderItem[], dbCartons: any[]): PackingRecommendation => {
    // Convert database cartons to the format expected by packing algorithms
    const boxSizesFromDB = convertCartonsToBoxSizes(dbCartons);
    
    // If no cartons available, return empty recommendation
    if (boxSizesFromDB.length === 0) {
      return {
        cartons: [],
        totalCost: 0,
        totalWeight: 0,
        efficiency: 0,
        reasoning: 'No cartons available'
      };
    }

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

    // Try different packing strategies using database cartons
    const strategies = [
      () => packInSingleBox(itemsWithDimensions, hasFragileItems, boxSizesFromDB),
      () => packByWeight(itemsWithDimensions, hasFragileItems, boxSizesFromDB),
      () => packByFragility(itemsWithDimensions, boxSizesFromDB),
      () => packBySize(itemsWithDimensions, hasFragileItems, boxSizesFromDB)
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
  const packInSingleBox = (items: OrderItem[], hasFragileItems: boolean, boxSizes: BoxSize[]): PackingRecommendation | null => {
    const totalWeight = items.reduce((sum, item) => sum + item.dimensions!.weight, 0);
    
    const suitableBoxes = boxSizes.filter(box => {
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
  const packByWeight = (items: OrderItem[], hasFragileItems: boolean, boxSizes: BoxSize[]): PackingRecommendation | null => {
    const cartons: Carton[] = [];
    const remainingItems = [...items];
    let totalCost = 0;

    while (remainingItems.length > 0) {
      const suitableBoxes = boxSizes.filter(box => {
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
  const packByFragility = (items: OrderItem[], boxSizes: BoxSize[]): PackingRecommendation | null => {
    return packByWeight(items, true, boxSizes);
  };

  const packBySize = (items: OrderItem[], hasFragileItems: boolean, boxSizes: BoxSize[]): PackingRecommendation | null => {
    return packByWeight(items, hasFragileItems, boxSizes);
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
          image: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=200&h=200&fit=crop&crop=center',
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
          image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=200&h=200&fit=crop&crop=center',
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
          image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=200&fit=crop&crop=center',
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
    // The backend now sets orderStatus to match the current state
    .filter((order: any) => 
      order.status === 'to_fulfill' || 
      order.status === 'picking' || 
      order.status === 'packing' ||
      order.status === 'ready_to_ship'
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
      items: (order.items?.map((item: any) => {
        const warehouseLocation = item.warehouseLocation || generateMockLocation();
        
        return {
          id: item.id,
          productId: item.productId,
          serviceId: item.serviceId,
          bundleId: item.bundleId,
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
          isFragile: item.isFragile,
          notes: item.notes,
          // Include pricing information from backend
          price: item.price || item.appliedPrice || item.unitPrice,
          unitPrice: item.unitPrice,
          appliedPrice: item.appliedPrice,
          currency: item.currency,
          discount: item.discount,
          tax: item.tax,
          total: item.total
        };
      }) || []).sort((a: OrderItem, b: OrderItem) => {
        // Sort services last - products and bundles first, services last
        if (a.serviceId && !b.serviceId) return 1;
        if (!a.serviceId && b.serviceId) return -1;
        // Otherwise maintain original order
        return 0;
      }),
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
      // Include order-level pricing information
      currency: order.currency || '$',
      subtotal: order.subtotal,
      grandTotal: order.grandTotal,
      paymentStatus: order.paymentStatus
    }))
  )];
  
  // Clean up sent back orders when data refreshes
  useEffect(() => {
    if (ordersSentBack.size > 0) {
      const packingOrders = transformedOrders.filter(order => {
        if (order.status === 'to_fulfill' && (order.packStatus === 'in_progress' || (order.pickStatus === 'completed' && order.packStatus === 'not_started'))) {
          return true;
        }
        return false;
      });
      const packingOrderIds = new Set(packingOrders.map(o => o.id));
      
      // Remove orders from sentBack set if they're no longer in packing
      setOrdersSentBack(prev => {
        const newSet = new Set<string>();
        prev.forEach(orderId => {
          if (packingOrderIds.has(orderId)) {
            newSet.add(orderId);
          }
        });
        return newSet;
      });
    }
    
    // Clean up returned to packing orders
    if (ordersReturnedToPacking.size > 0) {
      const readyOrders = transformedOrders.filter(order => 
        order.status === 'ready_to_ship' && order.packStatus === 'completed'
      );
      const readyOrderIds = new Set(readyOrders.map(o => o.id));
      
      // Remove orders from returned set if they're no longer in ready
      setOrdersReturnedToPacking(prev => {
        const newSet = new Set<string>();
        prev.forEach(orderId => {
          if (readyOrderIds.has(orderId)) {
            newSet.add(orderId);
          }
        });
        return newSet;
      });
    }
  }, [transformedOrders]);

  // Handle returning order to packing
  const returnToPacking = async (order: PickPackOrder) => {
    try {
      // Immediately add order to the returned set (instant UI update)
      setOrdersReturnedToPacking(prev => new Set(prev).add(order.id));
      
      // Show immediate success feedback
      toast({
        title: 'Success',
        description: `Order ${order.orderId} returned to packing`
      });
      
      // Create all API promises at once (parallel execution)
      const promises = [];
      
      // Reset pack status to move order back to packing (non-blocking)
      promises.push(
        apiRequest('PATCH', `/api/orders/${order.id}`, {
          orderStatus: 'to_fulfill',
          fulfillmentStage: 'packing',
          packStatus: 'not_started',
          packStartTime: null,
          packEndTime: null,
          packedBy: null
        })
      );
      
      // Reset packed quantities in parallel (non-blocking)
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          if (item.id) {
            promises.push(
              apiRequest('PATCH', `/api/orders/${order.id}/items/${item.id}`, {
                packedQuantity: 0
              })
            );
          }
        }
      }
      
      // Execute all API calls in parallel
      Promise.all(promises)
        .then(() => {
          // Just refresh the data - the useEffect will handle cleanup
          queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
        })
        .catch(error => {
          console.error('Error returning order to packing:', error);
          // Remove from returned set on error
          setOrdersReturnedToPacking(prev => {
            const newSet = new Set(prev);
            newSet.delete(order.id);
            return newSet;
          });
          toast({
            title: 'Error',
            description: 'Failed to return order to packing',
            variant: 'destructive'
          });
        });
    } catch (error) {
      console.error('Error initiating return to packing:', error);
      // Remove from returned set on error
      setOrdersReturnedToPacking(prev => {
        const newSet = new Set(prev);
        newSet.delete(order.id);
        return newSet;
      });
    }
  };

  // Handle repacking of modified orders
  const handleRepack = async (order: PickPackOrder) => {
    try {
      // Switch to packing tab immediately for instant feedback
      setSelectedTab('packing');
      
      // Play sound immediately
      playSound('error');
      
      // Show immediate notification
      const notificationMessage = order.modificationNotes 
        ? `Modifications: ${order.modificationNotes}` 
        : "Order has been sent for repacking";
      
      toast({
        title: "Repacking Order",
        description: notificationMessage,
      });
      
      // Invalidate queries immediately for UI update
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
      
      // Create all API promises at once (parallel execution)
      const promises = [];
      
      // Clear modification flag and return to packing (non-blocking)
      promises.push(
        apiRequest('PATCH', `/api/orders/${order.id}`, {
          orderStatus: 'to_fulfill',
          packStatus: 'not_started',
          packStartTime: null,
          packEndTime: null,
          packedBy: null,
          modifiedAfterPacking: false,
          modificationNotes: null
        })
      );
      
      // Reset all packed quantities in parallel (non-blocking)
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          if (item.id) {
            promises.push(
              apiRequest('PATCH', `/api/orders/${order.id}/items/${item.id}`, {
                packedQuantity: 0
              })
            );
          }
        }
      }
      
      // Execute all API calls in parallel
      Promise.all(promises)
        .then(() => {
          // Refresh data after successful update
          queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
        })
        .catch(error => {
          console.error('Error repacking order:', error);
          toast({
            title: "Error",
            description: "Failed to initiate repacking",
            variant: "destructive"
          });
        });
      
    } catch (error) {
      console.error('Error initiating repack:', error);
    }
  };
  
  // Handle sending order back to pick
  const sendBackToPick = async (order: PickPackOrder) => {
    try {
      // Immediately add order to the sent back set (instant UI update)
      setOrdersSentBack(prev => new Set(prev).add(order.id));
      
      // Show immediate feedback if not in active mode
      if (!activePickingOrder && !activePackingOrder) {
        toast({
          title: 'Success',
          description: `Order ${order.orderId} sent back to pick`
        });
      }
      
      // Create all API promises at once (parallel execution)
      const promises = [];
      
      // Reset order status (non-blocking)
      promises.push(
        apiRequest('PATCH', `/api/orders/${order.id}`, {
          fulfillmentStage: null,
          pickStatus: 'not_started',
          packStatus: 'not_started',
          pickStartTime: null,
          pickEndTime: null,
          packStartTime: null,
          packEndTime: null,
          pickedBy: null,
          packedBy: null
        })
      );
      
      // Reset all item quantities in parallel (non-blocking)
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          if (item.id) {
            promises.push(
              apiRequest('PATCH', `/api/orders/${order.id}/items/${item.id}`, {
                pickedQuantity: 0,
                packedQuantity: 0
              })
            );
          }
        }
      }
      
      // Execute all API calls in parallel
      Promise.all(promises)
        .then(() => {
          // Just refresh the data - the useEffect will handle cleanup
          queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
        })
        .catch(error => {
          console.error('Error sending order back to pick:', error);
          // Remove from sent back set on error
          setOrdersSentBack(prev => {
            const newSet = new Set(prev);
            newSet.delete(order.id);
            return newSet;
          });
          if (!activePickingOrder && !activePackingOrder) {
            toast({
              title: 'Error',
              description: 'Failed to send order back to pick',
              variant: 'destructive'
            });
          }
        });
      
    } catch (error) {
      console.error('Error initiating send back to pick:', error);
      // Remove from sent back set on error
      setOrdersSentBack(prev => {
        const newSet = new Set(prev);
        newSet.delete(order.id);
        return newSet;
      });
    }
  };

  // Handle putting order on hold
  const handlePutOnHold = async (order: PickPackOrder) => {
    try {
      await apiRequest('PATCH', `/api/orders/${order.id}`, {
        fulfillmentStage: 'on_hold'
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      toast({
        title: 'Order On Hold',
        description: `${order.orderId} has been put on hold`,
      });
      
      setOrderToHold(null);
    } catch (error) {
      console.error('Error putting order on hold:', error);
      toast({
        title: 'Error',
        description: 'Failed to put order on hold',
        variant: 'destructive'
      });
    }
  };

  // Handle canceling order
  const handleCancelOrder = async (order: PickPackOrder) => {
    try {
      await apiRequest('PATCH', `/api/orders/${order.id}`, {
        status: 'cancelled',
        fulfillmentStage: null
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      toast({
        title: 'Order Cancelled',
        description: `${order.orderId} has been cancelled`,
      });
      
      setOrderToCancel(null);
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel order',
        variant: 'destructive'
      });
    }
  };

  // Handle sending order back to pending
  const handleSendToPending = async (order: PickPackOrder) => {
    try {
      const promises = [];
      
      // Reset order to pending status
      promises.push(
        apiRequest('PATCH', `/api/orders/${order.id}`, {
          fulfillmentStage: null,
          pickStatus: 'not_started',
          packStatus: 'not_started',
          pickStartTime: null,
          pickEndTime: null,
          packStartTime: null,
          packEndTime: null,
          pickedBy: null,
          packedBy: null
        })
      );
      
      // Reset all item quantities if they exist
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          if (item.id) {
            promises.push(
              apiRequest('PATCH', `/api/orders/${order.id}/items/${item.id}`, {
                pickedQuantity: 0,
                packedQuantity: 0
              })
            );
          }
        }
      }
      
      // Clear any saved picking progress
      localStorage.removeItem(`pickpack-progress-${order.id}`);
      
      await Promise.all(promises);
      
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      toast({
        title: 'Success',
        description: `${order.orderId} sent back to Pending`,
      });
      
      setOrderToSendToPending(null);
    } catch (error) {
      console.error('Error sending order to pending:', error);
      toast({
        title: 'Error',
        description: 'Failed to send order to pending',
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

  // Get country code from order
  const getOrderCountryCode = (order: PickPackOrder): string => {
    // Extract country code from order data
    const orderId = order.orderId?.toLowerCase() || '';
    const address = order.shippingAddress?.toLowerCase() || '';
    const notes = order.notes?.toLowerCase() || '';
    
    // Check order ID prefixes first (most reliable)
    if (orderId.includes('ord-') && orderId.split('-').length >= 3) {
      const prefix = orderId.split('-')[2];
      if (prefix === 'cz') return 'CZ';
      if (prefix === 'de') return 'DE';
      if (prefix === 'sk') return 'SK';
      if (prefix === 'fr') return 'FR';
      if (prefix === 'be') return 'BE';
      if (prefix === 'nl') return 'NL';
      if (prefix === 'at') return 'AT';
      if (prefix === 'ch') return 'CH';
      if (prefix === 'pl') return 'PL';
      if (prefix === 'hu') return 'HU';
      if (prefix === 'it') return 'IT';
      if (prefix === 'es') return 'ES';
      if (prefix === 'pu') return 'CZ'; // Pickup orders default to CZ
      if (prefix === 'pd') return 'CZ'; // Personal delivery default to CZ
    }
    
    // Parse country from address (looking at the end of address string)
    // Most addresses end with ", Country Name"
    const addressParts = address.split(',');
    const lastPart = addressParts[addressParts.length - 1]?.trim().toLowerCase();
    
    // Country name mappings
    const countryMappings: { [key: string]: string } = {
      'czech republic': 'CZ',
      'czechia': 'CZ',
      'česká republika': 'CZ',
      'slovakia': 'SK',
      'slovensko': 'SK',
      'germany': 'DE',
      'deutschland': 'DE',
      'france': 'FR',
      'belgium': 'BE',
      'belgië': 'BE',
      'belgique': 'BE',
      'netherlands': 'NL',
      'nederland': 'NL',
      'austria': 'AT',
      'österreich': 'AT',
      'switzerland': 'CH',
      'schweiz': 'CH',
      'suisse': 'CH',
      'poland': 'PL',
      'polska': 'PL',
      'hungary': 'HU',
      'magyarország': 'HU',
      'italy': 'IT',
      'italia': 'IT',
      'spain': 'ES',
      'españa': 'ES',
      'portugal': 'PT',
      'romania': 'RO',
      'bulgaria': 'BG',
      'croatia': 'HR',
      'slovenia': 'SI',
      'luxembourg': 'LU',
      'denmark': 'DK',
      'sweden': 'SE',
      'norway': 'NO',
      'finland': 'FI',
      'united kingdom': 'GB',
      'uk': 'GB',
      'great britain': 'GB',
      'ireland': 'IE',
      'usa': 'US',
      'united states': 'US'
    };
    
    // Check if last part of address is a country
    for (const [country, code] of Object.entries(countryMappings)) {
      if (lastPart && lastPart.includes(country)) {
        return code;
      }
    }
    
    // Check major cities in address for country detection
    const cityCountryMap: { [key: string]: string } = {
      // Czech cities
      'prague': 'CZ', 'praha': 'CZ', 'brno': 'CZ', 'ostrava': 'CZ', 'plzeň': 'CZ', 'plzen': 'CZ',
      'české budějovice': 'CZ', 'ceske budejovice': 'CZ', 'liberec': 'CZ', 'olomouc': 'CZ',
      // Slovak cities
      'bratislava': 'SK', 'košice': 'SK', 'kosice': 'SK', 'prešov': 'SK', 'presov': 'SK',
      'žilina': 'SK', 'zilina': 'SK', 'nitra': 'SK', 'trnava': 'SK', 'banská bystrica': 'SK',
      // German cities
      'berlin': 'DE', 'munich': 'DE', 'münchen': 'DE', 'hamburg': 'DE', 'frankfurt': 'DE',
      'cologne': 'DE', 'köln': 'DE', 'düsseldorf': 'DE', 'stuttgart': 'DE', 'leipzig': 'DE',
      // French cities
      'paris': 'FR', 'lyon': 'FR', 'marseille': 'FR', 'toulouse': 'FR', 'nice': 'FR',
      'nantes': 'FR', 'strasbourg': 'FR', 'bordeaux': 'FR', 'lille': 'FR',
      // Belgian cities
      'brussels': 'BE', 'bruxelles': 'BE', 'antwerp': 'BE', 'antwerpen': 'BE', 'ghent': 'BE',
      'gent': 'BE', 'bruges': 'BE', 'brugge': 'BE', 'liège': 'BE', 'liege': 'BE',
      // Dutch cities
      'amsterdam': 'NL', 'rotterdam': 'NL', 'the hague': 'NL', 'den haag': 'NL', 'utrecht': 'NL',
      'eindhoven': 'NL', 'groningen': 'NL', 'tilburg': 'NL',
      // Austrian cities
      'vienna': 'AT', 'wien': 'AT', 'graz': 'AT', 'linz': 'AT', 'salzburg': 'AT', 'innsbruck': 'AT',
      // Swiss cities
      'zurich': 'CH', 'zürich': 'CH', 'geneva': 'CH', 'genève': 'CH', 'basel': 'CH', 'bern': 'CH',
      'lausanne': 'CH', 'lucerne': 'CH', 'luzern': 'CH',
      // Polish cities
      'warsaw': 'PL', 'warszawa': 'PL', 'krakow': 'PL', 'kraków': 'PL', 'wrocław': 'PL',
      'wroclaw': 'PL', 'poznań': 'PL', 'poznan': 'PL', 'gdańsk': 'PL', 'gdansk': 'PL',
      // Hungarian cities
      'budapest': 'HU', 'debrecen': 'HU', 'szeged': 'HU', 'pécs': 'HU', 'pecs': 'HU',
      // Italian cities
      'rome': 'IT', 'roma': 'IT', 'milan': 'IT', 'milano': 'IT', 'naples': 'IT', 'napoli': 'IT',
      'turin': 'IT', 'torino': 'IT', 'florence': 'IT', 'firenze': 'IT', 'venice': 'IT', 'venezia': 'IT',
      // Spanish cities
      'madrid': 'ES', 'barcelona': 'ES', 'valencia': 'ES', 'seville': 'ES', 'sevilla': 'ES',
      'zaragoza': 'ES', 'málaga': 'ES', 'malaga': 'ES', 'bilbao': 'ES'
    };
    
    // Check for cities in the address
    for (const [city, code] of Object.entries(cityCountryMap)) {
      if (address.includes(city)) {
        return code;
      }
    }
    
    // Check notes for country information
    if (notes.includes('pickup') || notes.includes('will call')) return 'CZ';
    if (notes.includes('personal delivery')) return 'CZ';
    
    // If still no match, check for postal codes patterns
    // Czech postal codes: 3 digits + space + 2 digits (e.g., 110 00)
    if (/\b\d{3}\s\d{2}\b/.test(address)) return 'CZ';
    // German postal codes: 5 digits (e.g., 10178)
    if (/\b\d{5}\b/.test(address) && address.includes('deutschland')) return 'DE';
    // Slovak postal codes: 3 digits + space + 2 digits (same as Czech)
    if (/\b\d{3}\s\d{2}\b/.test(address) && address.includes('slovak')) return 'SK';
    
    // If warehouse/pickup address, default to CZ
    if (address.includes('warehouse') || address.includes('pickup') || address.includes('gate')) {
      return 'CZ';
    }
    
    // If we still can't determine, check customer name for hints
    const customerName = order.customerName?.toLowerCase() || '';
    if (customerName.includes('czech') || customerName.includes('praha')) return 'CZ';
    if (customerName.includes('slovak') || customerName.includes('bratislava')) return 'SK';
    if (customerName.includes('german') || customerName.includes('deutsch')) return 'DE';
    if (customerName.includes('austrian') || customerName.includes('österreich')) return 'AT';
    if (customerName.includes('swiss') || customerName.includes('schweiz')) return 'CH';
    if (customerName.includes('french') || customerName.includes('français')) return 'FR';
    if (customerName.includes('belgian') || customerName.includes('belge')) return 'BE';
    if (customerName.includes('dutch') || customerName.includes('nederlands')) return 'NL';
    
    // Last resort: if address seems local (short, no country), assume CZ
    if (addressParts.length <= 2 || address.length < 30) {
      return 'CZ';
    }
    
    // Default to CZ for central European operations
    return 'CZ';
  };

  // Global barcode scanner listener for continuous scanning (PICKING MODE)
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
        // Don't update state on every keypress to avoid re-renders
        // setBarcodeInput(scanBuffer);

        // Clear buffer after timeout (in case Enter is missed)
        clearTimeout(scanTimeout);
        scanTimeout = setTimeout(() => {
          scanBuffer = '';
          // setBarcodeInput('');
        }, 1000);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      clearTimeout(scanTimeout);
    };
  }, [activePickingOrder, selectedTab]);

  // Global barcode scanner listener for continuous scanning (PACKING MODE)
  useEffect(() => {
    if (!activePackingOrder) return;

    let scanBuffer = '';
    let scanTimeout: NodeJS.Timeout;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Only process if we're in packing mode and have an active order
      if (selectedTab !== 'packing' || !activePackingOrder) return;

      // Ignore if target is an input field that's not read-only
      if (e.target instanceof HTMLInputElement && !e.target.readOnly) return;

      // Clear buffer on Enter (barcode scanners typically end with Enter)
      if (e.key === 'Enter') {
        if (scanBuffer.length > 0) {
          processPackingBarcodeInput(scanBuffer);
          scanBuffer = '';
        }
        clearTimeout(scanTimeout);
        return;
      }

      // Add character to buffer
      if (e.key.length === 1) { // Only single characters
        scanBuffer += e.key;

        // Clear buffer after timeout (in case Enter is missed)
        clearTimeout(scanTimeout);
        scanTimeout = setTimeout(() => {
          scanBuffer = '';
        }, 1000);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      clearTimeout(scanTimeout);
    };
  }, [activePackingOrder, selectedTab, verifiedItems]);

  // Process barcode input from continuous scanner (PICKING MODE)
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

  // Process barcode input from continuous scanner (PACKING MODE)
  const processPackingBarcodeInput = (barcode: string) => {
    if (!activePackingOrder || !barcode.trim()) return;

    const matchingItem = activePackingOrder.items.find(
      item => item.barcode === barcode || item.sku === barcode
    );

    if (matchingItem) {
      setVerifiedItems(new Set(Array.from(verifiedItems).concat(matchingItem.id)));
      playSound('scan');
    } else {
      playSound('error');
    }

    setBarcodeInput('');
  };

  // Quick Action: Start Next Priority Order
  const startNextPriorityOrder = () => {
    // Find the highest priority pending order (status = 'to_fulfill')
    const pendingOrders = transformedOrders.filter(o => o.status === 'to_fulfill');
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
      return apiRequest('PATCH', `/api/orders/${orderId}/status`, { 
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
    try {
      // Load saved progress from localStorage
      const savedProgress = loadPickedProgress(order.id);
      
      // Restore picked quantities if progress exists
      let items = order.items || [];
      if (savedProgress) {
        items = items.map(item => ({
          ...item,
          pickedQuantity: savedProgress[item.id] !== undefined ? savedProgress[item.id] : item.pickedQuantity
        }));
      }
      
      // Set UI state immediately for instant feedback
      const updatedOrder = {
        ...order,
        status: 'to_fulfill' as const,
        pickStatus: 'in_progress' as const,
        pickStartTime: new Date().toISOString(),
        pickedBy: currentEmployee,
        items: items,
        pickedItems: items.reduce((sum, item) => sum + (item.pickedQuantity || 0), 0)
      };
      
      // Update UI immediately
      setActivePickingOrder(updatedOrder);
      setSelectedTab('picking');
      
      // Find first unpicked item or start at 0
      const firstUnpickedIndex = updatedOrder.items.findIndex(item => 
        (item.pickedQuantity || 0) < item.quantity
      );
      setManualItemIndex(firstUnpickedIndex >= 0 ? firstUnpickedIndex : 0);
      setPickingTimer(0);
      setIsTimerRunning(true);
      playSound('success');
      
      // Update database in background (non-blocking) for real orders
      if (!order.id.startsWith('mock-')) {
        updateOrderStatusMutation.mutateAsync({
          orderId: order.id,
          status: 'to_fulfill',
          pickStatus: 'in_progress',
          pickedBy: currentEmployee
        }).catch(error => {
          console.error('Error updating order status:', error);
          playSound('error');
        });
      }
    } catch (error) {
      console.error('Error starting picking:', error);
      playSound('error');
    }
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
    
    // Auto-save progress to localStorage
    savePickedProgress(activePickingOrder.id, updatedItems);

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
      setIsTimerRunning(false);
      playSound('complete');
      
      // Clear saved progress since order is completed
      clearPickedProgress(activePickingOrder.id);
      
      // Only update database for real orders (not mock orders)
      if (!activePickingOrder.id.startsWith('mock-')) {
        // Update order to mark picking as completed (non-blocking)
        apiRequest('PATCH', `/api/orders/${activePickingOrder.id}`, {
          pickStatus: 'completed',
          pickEndTime: new Date().toISOString(),
          pickedBy: currentEmployee
        }).catch(error => {
          console.error('Error updating order status:', error);
        });
      }
      
      // Invalidate queries in background without awaiting
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
      
    } catch (error) {
      console.error('Error completing picking:', error);
    }
  };

  // Reset order (clear all picked quantities)
  const resetOrder = () => {
    if (!activePickingOrder) return;

    const resetItems = activePickingOrder.items.map(item => ({
      ...item,
      pickedQuantity: 0
    }));

    const updatedOrder = {
      ...activePickingOrder,
      items: resetItems,
      pickedItems: 0
    };

    setActivePickingOrder(updatedOrder);
    setManualItemIndex(0);
    
    // Clear saved progress
    clearPickedProgress(activePickingOrder.id);
    
    // Reset timer
    setPickingTimer(0);
    setIsTimerRunning(true);
    
    playSound('success');
    setShowResetOrderDialog(false);
    
    toast({
      title: "Order Reset",
      description: "All picked quantities have been cleared.",
    });
  };

  // Start packing an order
  const startPacking = async (order: PickPackOrder) => {
    // Set the order immediately to show UI quickly
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
    
    // Generate AI packing recommendation using database cartons
    const recommendation = generatePackingRecommendation(order.items, availableCartons);
    setPackingRecommendation(recommendation);
    
    // Update database in background for real orders (non-blocking)
    if (!order.id.startsWith('mock-')) {
      if (order.packStatus !== 'in_progress') {
        updateOrderStatusMutation.mutateAsync({
          orderId: order.id,
          status: 'to_fulfill',
          packStatus: 'in_progress',
          packedBy: currentEmployee
        }).catch(console.error);
      }
    }
    
    // Reset packing state
    setPackingChecklist({
      itemsVerified: false,
      packingSlipIncluded: false,
      boxSealed: false,
      weightRecorded: false,
      fragileProtected: false,
      invoiceIncluded: false,
      promotionalMaterials: false
    });
    setPrintedDocuments({
      packingList: false,
      invoice: false,
      msds: false,
      cpnpCertificate: false
    });
    setVerifiedItems(new Set());
    setUseNonCompanyCarton(false);
    setPackageWeight('');
    setShippingLabelPrinted(false);
    
    // Clear previous selections before auto-selecting
    setSelectedCartons([]);
    setCurrentCartonSelection('');
    setCurrentUseNonCompanyCarton(false);
    
    // Auto-select the AI-recommended carton immediately
    if (recommendation && recommendation.cartons.length > 0) {
      const firstRecommendedCarton = recommendation.cartons[0];
      const cartonId = firstRecommendedCarton.boxSize.id;
      const cartonName = firstRecommendedCarton.boxSize.name;
      
      // Add the recommended carton to selected cartons
      setSelectedCartons([{
        id: `carton-1`,
        cartonId: cartonId,
        cartonName: cartonName,
        isNonCompany: false
      }]);
      
      // Set the current carton selection
      setSelectedCarton(cartonId);
      setCurrentCartonSelection(cartonId);
    }
    
    playSound('success');
  };

  // Mutation for saving packing details
  const savePackingDetailsMutation = useMutation({
    mutationFn: async (data: {
      orderId: string;
      cartons: Array<{ id: string; cartonId: string; cartonName: string; weight?: string }>;
      packageWeight: string;
      printedDocuments: typeof printedDocuments;
      packingChecklist: typeof packingChecklist;
      multiCartonOptimization: boolean;
    }) => {
      return apiRequest('POST', `/api/orders/${data.orderId}/packing-details`, data);
    },
    onSuccess: () => {
      // Suppress notifications in picking/packing mode
    },
  });

  // Complete packing
  const completePacking = async () => {
    if (!activePackingOrder) return;
    
    // Validate ALL checkboxes are checked
    const currentCarton = packingRecommendation?.cartons.find(c => c.id === selectedCarton);
    const allItemsVerified = currentCarton ? currentCarton.items.every(item => verifiedItems.has(item.id)) : false;
    const needsFragileProtection = currentCarton?.isFragile || false;
    
    // Check each required checkbox
    const missingChecks = [];
    if (!(packingChecklist.itemsVerified || allItemsVerified)) missingChecks.push('Items Verification');
    if (!packingChecklist.packingSlipIncluded) missingChecks.push('Packing Slip');
    if (!packingChecklist.invoiceIncluded) missingChecks.push('Invoice');
    if (!packingChecklist.weightRecorded) missingChecks.push('Weight Recording');
    if (!packingChecklist.boxSealed) missingChecks.push('Box Sealing');
    if (!packingChecklist.promotionalMaterials) missingChecks.push('Promotional Materials');
    if (needsFragileProtection && !packingChecklist.fragileProtected) missingChecks.push('Fragile Protection');
    if (!shippingLabelPrinted) missingChecks.push('Shipping Label');
    if (!selectedCarton) missingChecks.push('Carton Selection');
    if (!packageWeight) missingChecks.push('Package Weight');
    
    if (missingChecks.length > 0) {
      toast({
        title: "Cannot Complete Packing",
        description: `Please complete: ${missingChecks.join(', ')}`,
        variant: "destructive",
        duration: 5000,
      });
      playSound('error');
      return;
    }

    try {
      // Only update database for real orders (not mock orders)
      if (!activePackingOrder.id.startsWith('mock-')) {
        // Save all packing details including multi-carton information
        await savePackingDetailsMutation.mutateAsync({
          orderId: activePackingOrder.id,
          cartons: selectedCartons,
          packageWeight: packageWeight,
          printedDocuments: printedDocuments,
          packingChecklist: packingChecklist,
          multiCartonOptimization: enableMultiCartonOptimization
        });

        // Log packing completion activity
        await apiRequest('POST', `/api/orders/${activePackingOrder.id}/pick-pack-logs`, {
          activityType: 'pack_complete',
          userName: currentEmployee,
          notes: `Packing completed. ${selectedCartons.length} carton(s), Total weight: ${packageWeight}kg`
        });

        // Complete packing with multi-carton data
        await apiRequest('POST', `/api/orders/${activePackingOrder.id}/pack/complete`, {
          cartons: selectedCartons,
          packageWeight: packageWeight,
          printedDocuments: printedDocuments,
          packingChecklist: packingChecklist
        });

        // Update order status to "ready_to_ship" when packing is complete
        // Order will stay in Ready tab until manually marked as shipped
        await updateOrderStatusMutation.mutateAsync({
          orderId: activePackingOrder.id,
          status: 'ready_to_ship',
          packStatus: 'completed',
          packEndTime: new Date().toISOString(),
          finalWeight: parseFloat(packageWeight) || 0,
          cartonUsed: selectedCartons.length > 0 ? selectedCartons.map(c => c.cartonName).join(', ') : selectedCarton
        });
      }

      const updatedOrder = {
        ...activePackingOrder,
        packStatus: 'completed' as const,
        packEndTime: new Date().toISOString(),
        status: 'ready_to_ship' as const
      };

      setIsPackingTimerRunning(false);
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      // Suppress notifications in picking/packing mode - but this is completion so allow sound
      
      playSound('complete');
      setActivePackingOrder(null);
      setSelectedTab('ready');
    } catch (error) {
      console.error('Error completing packing:', error);
      // Suppress error notifications in picking/packing mode
    }
  };

  // Batch ship mutation for optimized performance
  const batchShipMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      const response = await fetch('/api/orders/batch-ship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to ship orders');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
  });

  // Mark order as shipped with optimistic update and undo
  const markAsShipped = async (order: PickPackOrder) => {
    // Optimistic update - remove from ready orders immediately
    const cachedData = queryClient.getQueryData<PickPackOrder[]>(['/api/orders/pick-pack']);
    if (cachedData) {
      queryClient.setQueryData<PickPackOrder[]>(
        ['/api/orders/pick-pack'],
        cachedData.map(o => 
          o.id === order.id 
            ? { ...o, status: 'shipped' as const }
            : o
        )
      );
    }
    
    // Show undo bar immediately
    setPendingShipments({
      orderIds: [order.id],
      timestamp: Date.now(),
      description: `Shipped ${order.orderId}`
    });
    setShowUndoPopup(true);
    setUndoTimeLeft(15);
    
    playSound('success');
    
    // Process in background
    try {
      await batchShipMutation.mutateAsync([order.id]);
    } catch (error) {
      // Rollback on error
      console.error('Error shipping order:', error);
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
      toast({
        title: "Error",
        description: "Failed to ship order",
        variant: "destructive"
      });
      setPendingShipments(null);
      setShowUndoPopup(false);
    }
  };

  // Ship all ready orders - now much faster with batch operation
  const shipAllOrders = async () => {
    const readyOrders = getOrdersByStatus('ready');
    setRecentlyShippedOrders(readyOrders);
    
    try {
      // Use batch endpoint for all orders at once
      const orderIds = readyOrders.map(order => order.id);
      const result = await batchShipMutation.mutateAsync(orderIds);
      
      playSound('success');
      
      // Show undo popup
      setShowShipAllConfirm(false);
      setShowUndoPopup(true);
      setUndoTimeLeft(5);
      
      toast({
        title: "Orders Shipped",
        description: result.message || `${readyOrders.length} orders marked as shipped`,
      });
    } catch (error) {
      console.error('Error shipping orders:', error);
      toast({
        title: "Error",
        description: "Failed to ship some orders",
        variant: "destructive"
      });
    }
  };

  // Undo timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showUndoPopup && pendingShipments) {
      if (undoTimeLeft > 0) {
        timer = setTimeout(() => {
          setUndoTimeLeft(prev => prev - 1);
        }, 1000);
      } else if (undoTimeLeft <= 0) {
        // Time's up, clear pending shipments and hide bar
        setShowUndoPopup(false);
        setPendingShipments(null);
        setUndoTimeLeft(15);
      }
    }
    return () => clearTimeout(timer);
  }, [showUndoPopup, undoTimeLeft, pendingShipments]);

  // Undo shipment function
  const undoShipment = async () => {
    if (!pendingShipments) return;
    
    // Immediately hide undo bar
    setShowUndoPopup(false);
    
    // Revert optimistic update
    queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
    
    // Call undo endpoint
    try {
      const response = await fetch('/api/orders/batch-undo-ship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: pendingShipments.orderIds }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to undo shipment');
      }
      
      await queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
      
      toast({
        title: "Shipment Undone",
        description: "Orders returned to ready status",
      });
    } catch (error) {
      console.error('Error undoing shipment:', error);
      toast({
        title: "Error",
        description: "Failed to undo shipment",
        variant: "destructive"
      });
    } finally {
      setPendingShipments(null);
      setUndoTimeLeft(15);
    }
    
    queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
    
    setShowUndoPopup(false);
    setRecentlyShippedOrders([]);
    setUndoTimeLeft(5);
    
    toast({
      title: "Shipment Undone",
      description: `${recentlyShippedOrders.length} orders moved back to packing`,
    });
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

  // Filter orders by status - Updated to match backend state machine
  const getOrdersByStatus = (status: string) => {
    return transformedOrders.filter(order => {
      if (status === 'pending') return order.status === 'to_fulfill';
      if (status === 'picking') return order.status === 'picking';
      if (status === 'packing') return order.status === 'packing';
      if (status === 'ready') return order.status === 'ready_to_ship';
      return false;
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';  // Red for high priority
      case 'medium': return 'warning';     // Yellow for medium priority
      case 'low': return 'outline';        // Gray for low priority
      default: return 'outline';
    }
  };

  const getOrderStatusDisplay = (order: PickPackOrder) => {
    // Check the pickStatus and packStatus fields for actual status
    if (order.pickStatus === 'in_progress') {
      return { label: 'Picking', color: 'bg-blue-100 text-blue-700 border-blue-300' };
    }
    if (order.packStatus === 'in_progress') {
      return { label: 'Packing', color: 'bg-purple-100 text-purple-700 border-purple-300' };
    }
    if (order.status === 'ready_to_ship' && order.packStatus === 'completed') {
      return { label: 'Ready', color: 'bg-green-100 text-green-700 border-green-300' };
    }
    if (order.status === 'shipped') {
      return { label: 'Shipped', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' };
    }
    if (order.pickStatus === 'not_started' || !order.pickStatus) {
      return { label: 'Pending', color: 'bg-gray-100 text-gray-700 border-gray-300' };
    }
    if (order.packStatus === 'completed' && order.status === 'ready_to_ship') {
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
  
  // Trigger bouncy animation when counts change
  useEffect(() => {
    const countersToAnimate = new Set<string>();
    
    if (stats.pending !== previousCountsRef.current.pending) {
      countersToAnimate.add('pending');
    }
    if (stats.picking !== previousCountsRef.current.picking) {
      countersToAnimate.add('picking');
    }
    if (stats.packing !== previousCountsRef.current.packing) {
      countersToAnimate.add('packing');
    }
    if (stats.ready !== previousCountsRef.current.ready) {
      countersToAnimate.add('ready');
    }
    
    if (countersToAnimate.size > 0) {
      setAnimatingCounters(countersToAnimate);
      
      // Remove animation class after animation completes
      setTimeout(() => {
        setAnimatingCounters(new Set());
      }, 600);
    }
    
    // Update previous counts
    previousCountsRef.current = {
      pending: stats.pending,
      picking: stats.picking,
      packing: stats.packing,
      ready: stats.ready
    };
  }, [stats.pending, stats.picking, stats.packing, stats.ready]);

  // Skeleton loader component for order cards
  const OrderCardSkeleton = () => (
    <Card className="transition-all duration-300">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-10 w-full sm:w-32" />
        </div>
      </CardContent>
    </Card>
  );

  // Full page skeleton loader for initial load
  if (isLoading && transformedOrders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-full max-w-4xl p-4">
          <div className="skeleton skeleton-title w-48 mx-auto mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton skeleton-card"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }



  // Active Packing View - Full Screen
  if (activePackingOrder) {
    const progress = (activePackingOrder.packedItems / activePackingOrder.totalItems) * 100;
    const currentCarton = packingRecommendation?.cartons.find(c => c.id === selectedCarton);
    const allItemsVerified = currentCarton ? currentCarton.items.every(item => verifiedItems.has(item.id)) : false;
    
    // Simplified packing completion check
    const documentsReady = printedDocuments.packingList || printedDocuments.invoice;
    const cartonSelected = selectedCarton !== null;
    const checklistComplete = (packingChecklist.itemsVerified || allItemsVerified) && 
                             packingChecklist.packingSlipIncluded && 
                             packingChecklist.boxSealed;
    const labelReady = shippingLabelPrinted;
    
    // Check if fragile items need protection
    const needsFragileProtection = currentCarton?.isFragile || false;
    
    // ALL required checkboxes must be checked
    const canCompletePacking = (packingChecklist.itemsVerified || allItemsVerified) && 
                              packingChecklist.packingSlipIncluded && 
                              packingChecklist.invoiceIncluded &&
                              packingChecklist.weightRecorded &&
                              packingChecklist.boxSealed &&
                              packingChecklist.promotionalMaterials &&
                              (!needsFragileProtection || packingChecklist.fragileProtected) && // Only required if fragile
                              cartonSelected && 
                              packageWeight && 
                              shippingLabelPrinted;
    
    // Stop timer when packing is complete
    if (canCompletePacking && isPackingTimerRunning) {
      setIsPackingTimerRunning(false);
    }

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Compact Header - Packing Mode */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg sticky top-0 z-20">
          <div className="px-4 lg:px-6 py-2 lg:py-3">
            {/* Single compact row with all controls */}
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 bg-white/20 hover:bg-white/30 text-white"
                onClick={() => {
                  setActivePackingOrder(null);
                  setIsPackingTimerRunning(false);
                  setPackingChecklist({
                    itemsVerified: false,
                    packingSlipIncluded: false,
                    boxSealed: false,
                    weightRecorded: false,
                    fragileProtected: false,
                    invoiceIncluded: false,
                    promotionalMaterials: false
                  });
                  setSelectedBoxSize('');
                  setPackageWeight('');
                  setVerifiedItems(new Set());
                  setShippingLabelPrinted(false);
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="ml-1.5 text-sm hidden sm:inline">Exit</span>
              </Button>
              
              {/* Order ID */}
              <div className="flex-1 text-center">
                <div className="text-base sm:text-lg font-bold">{activePackingOrder.orderId}</div>
              </div>
              
              {/* Timer & Progress */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-mono text-sm font-bold">{formatTimer(packingTimer)}</div>
                  <div className="text-[10px] text-purple-100 hidden sm:block">
                    {verifiedItems.size}/{activePackingOrder.items.length} items
                  </div>
                </div>
                <Button
                  size="icon"
                  className="h-9 w-9 bg-white/20 hover:bg-white/30"
                  onClick={() => setIsPackingTimerRunning(!isPackingTimerRunning)}
                >
                  {isPackingTimerRunning ? (
                    <PauseCircle className="h-4 w-4 text-orange-300" />
                  ) : (
                    <PlayCircle className="h-4 w-4 text-green-300" />
                  )}
                </Button>
              </div>
            </div>

            {/* Step Indicators (compact, single row) */}
            <div className="flex items-center gap-1 mt-2 justify-center flex-wrap">
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                verifiedItems.size === activePackingOrder.items.length 
                  ? 'bg-green-500 text-white' 
                  : 'bg-black/20 text-purple-200'
              }`}>
                {verifiedItems.size === activePackingOrder.items.length ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
                Items
              </div>
              
              <ChevronRight className="h-3 w-3 text-purple-300" />
              
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                printedDocuments.packingList && printedDocuments.invoice
                  ? 'bg-green-500 text-white' 
                  : 'bg-black/20 text-purple-200'
              }`}>
                {printedDocuments.packingList && printedDocuments.invoice ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
                Docs
              </div>
              
              <ChevronRight className="h-3 w-3 text-purple-300" />
              
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                selectedCarton 
                  ? 'bg-green-500 text-white' 
                  : 'bg-black/20 text-purple-200'
              }`}>
                {selectedCarton ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
                Carton
              </div>
              
              <ChevronRight className="h-3 w-3 text-purple-300" />
              
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                packingChecklist.itemsVerified && packingChecklist.packingSlipIncluded && 
                packingChecklist.boxSealed && packingChecklist.weightRecorded
                  ? 'bg-green-500 text-white' 
                  : 'bg-black/20 text-purple-200'
              }`}>
                {packingChecklist.itemsVerified && packingChecklist.packingSlipIncluded && 
                 packingChecklist.boxSealed && packingChecklist.weightRecorded ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
                Checklist
              </div>
              
              <ChevronRight className="h-3 w-3 text-purple-300" />
              
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                shippingLabelPrinted 
                  ? 'bg-green-500 text-white' 
                  : 'bg-black/20 text-purple-200'
              }`}>
                {shippingLabelPrinted ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
                Label
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Single Column Layout */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
            
            {/* Sticky Barcode Scanner Card */}
            <Card className="sticky top-0 z-10 shadow-lg border-2 border-purple-300 bg-white">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-3 rounded-t-lg">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ScanLine className="h-4 w-4" />
                    Barcode Scanner
                  </span>
                  <Badge className="bg-white text-purple-600 text-sm px-2.5 py-1">
                    {verifiedItems.size}/{activePackingOrder.items.length} verified
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Input
                      ref={barcodeInputRef}
                      type="text"
                      placeholder="Scan barcode to verify items..."
                      value={barcodeInput || ""}
                      onChange={(e) => setBarcodeInput(e.target.value)}
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
                          barcodeInputRef.current?.focus();
                        }
                      }}
                      className="h-12 text-base font-mono"
                    />
                  </div>
                  <Button variant="outline" size="icon" className="h-12 w-12">
                    <ScanLine className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Item Verification List - Collapsible Accordion */}
            <Accordion type="single" collapsible defaultValue="items" className="w-full">
              <AccordionItem value="items" className="border rounded-lg bg-white shadow-sm">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-2">
                      {verifiedItems.size === activePackingOrder.items.length ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                      <span className="text-base font-semibold">
                        {verifiedItems.size === activePackingOrder.items.length ? '✓ ' : ''}
                        Items Verified ({verifiedItems.size}/{activePackingOrder.items.length})
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="px-4 pb-4">
                    <ScrollArea className="h-[400px]">
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
                                  {item.image ? (
                                    <img 
                                      src={item.image} 
                                      alt={item.productName}
                                      className="w-full h-full object-contain bg-slate-50 dark:bg-slate-900"
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
                                        setVerifiedItems(new Set(Array.from(verifiedItems).concat(item.id)));
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
                                                className="w-8 h-8 rounded object-contain border bg-slate-50"
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
                                
                                {/* Packing Instructions Display */}
                                {(item.packingInstructionsText || item.packingInstructionsImage) && (
                                  <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-l-4 border-blue-400">
                                    <div className="flex items-start gap-2">
                                      <Package className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <div className="text-xs font-semibold text-blue-700 mb-1">PACKING INSTRUCTIONS</div>
                                        {item.packingInstructionsImage && (
                                          <div className="mb-2">
                                            <img 
                                              src={item.packingInstructionsImage} 
                                              alt="Packing instructions"
                                              className="w-full max-w-sm rounded-lg border border-blue-200"
                                            />
                                          </div>
                                        )}
                                        {item.packingInstructionsText && (
                                          <div className="text-xs text-blue-600 leading-relaxed whitespace-pre-line">
                                            {item.packingInstructionsText}
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
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Combined Carton & Weight Card */}
          <Card className="shadow-sm border border-gray-200 bg-white">
            <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-3 rounded-t-lg">
              <CardTitle className="text-base flex items-center gap-2">
                <Box className="h-4 w-4" />
                Carton & Weight
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              {/* AI Recommendation Badge */}
              {packingRecommendation && packingRecommendation.cartons.length > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-2 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700">
                      AI Recommended: <strong>{packingRecommendation.cartons[0].boxSize.name}</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* Carton Selection - Simple Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Carton:</label>
                <Select value={selectedCarton || ''} onValueChange={(value) => setSelectedCarton(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose carton size..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCartons.map((carton: any) => (
                      <SelectItem key={carton.id} value={carton.id}>
                        {carton.name} - {carton.dimensions.length}×{carton.dimensions.width}×{carton.dimensions.height}cm (Max {carton.maxWeight}kg)
                      </SelectItem>
                    ))}
                    <SelectItem value="non-company">Non-company carton</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Weight Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Package Weight:</label>
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
                      } else {
                        setPackingChecklist({...packingChecklist, weightRecorded: false});
                      }
                    }}
                    className="flex-1"
                  />
                  <span className="flex items-center px-3 text-sm font-medium">kg</span>
                </div>
                {calculateWeightMutation.isPending && (
                  <div className="flex items-center gap-2 text-xs text-blue-600">
                    <div className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    Calculating weight...
                  </div>
                )}
                {!calculateWeightMutation.isPending && !isWeightManuallyModified && aiWeightCalculation && (
                  <div className="text-xs text-gray-500">
                    Weight automatically calculated by AI
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Packing Completion Card - Combined Documents + Checklist */}
          <Card className="shadow-sm border border-gray-200 bg-white">
            <CardHeader className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-3 rounded-t-lg">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Packing Completion
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-4">
              {/* Section 1: Documents */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">Documents:</h3>
                <div className="space-y-1.5">
                  {/* Packing List */}
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={printedDocuments.packingList}
                        disabled
                        className="cursor-default"
                      />
                      <span className="text-sm">Packing List</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-7 text-xs"
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
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={printedDocuments.invoice}
                        disabled
                        className="cursor-default"
                      />
                      <span className="text-sm">Invoice</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-7 text-xs"
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

                  {/* Print All Button */}
                  <Button 
                    className="w-full h-8 text-sm bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    onClick={() => {
                      const documents = [
                        `/api/orders/${activePackingOrder.id}/packing-list.pdf`,
                        `/api/orders/${activePackingOrder.id}/invoice.pdf`,
                      ];
                      
                      documents.forEach((doc, index) => {
                        setTimeout(() => {
                          window.open(doc, '_blank');
                        }, index * 500);
                      });
                      
                      setPrintedDocuments({
                        packingList: true,
                        invoice: true,
                        msds: printedDocuments.msds,
                        cpnpCertificate: printedDocuments.cpnpCertificate
                      });
                      
                      playSound('success');
                    }}
                  >
                    <Printer className="h-3 w-3 mr-2" />
                    Print All Documents
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Section 2: Checklist */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">Checklist:</h3>
                <div className="space-y-1.5">
                  {/* Items Verified */}
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer" onClick={() => setPackingChecklist({...packingChecklist, itemsVerified: !packingChecklist.itemsVerified})}>
                    <Checkbox 
                      checked={packingChecklist.itemsVerified || allItemsVerified}
                      onCheckedChange={(checked) => setPackingChecklist({...packingChecklist, itemsVerified: !!checked})}
                    />
                    <span className="text-sm flex-1">Items Verified</span>
                    {(packingChecklist.itemsVerified || allItemsVerified) && <CheckCircle className="h-4 w-4 text-green-600" />}
                  </div>

                  {/* Packing Slip Included */}
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer" onClick={() => setPackingChecklist({...packingChecklist, packingSlipIncluded: !packingChecklist.packingSlipIncluded})}>
                    <Checkbox 
                      checked={packingChecklist.packingSlipIncluded}
                      onCheckedChange={(checked) => setPackingChecklist({...packingChecklist, packingSlipIncluded: !!checked})}
                    />
                    <span className="text-sm flex-1">Packing Slip Included</span>
                    {packingChecklist.packingSlipIncluded && <CheckCircle className="h-4 w-4 text-green-600" />}
                  </div>

                  {/* Invoice Included */}
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer" onClick={() => setPackingChecklist({...packingChecklist, invoiceIncluded: !packingChecklist.invoiceIncluded})}>
                    <Checkbox 
                      checked={packingChecklist.invoiceIncluded}
                      onCheckedChange={(checked) => setPackingChecklist({...packingChecklist, invoiceIncluded: !!checked})}
                    />
                    <span className="text-sm flex-1">Invoice Included</span>
                    {packingChecklist.invoiceIncluded && <CheckCircle className="h-4 w-4 text-green-600" />}
                  </div>

                  {/* Weight Recorded */}
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer" onClick={() => setPackingChecklist({...packingChecklist, weightRecorded: !packingChecklist.weightRecorded})}>
                    <Checkbox 
                      checked={packingChecklist.weightRecorded}
                      onCheckedChange={(checked) => setPackingChecklist({...packingChecklist, weightRecorded: !!checked})}
                    />
                    <span className="text-sm flex-1">Weight Recorded</span>
                    {packingChecklist.weightRecorded && <CheckCircle className="h-4 w-4 text-green-600" />}
                  </div>

                  {/* Box Sealed */}
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer" onClick={() => setPackingChecklist({...packingChecklist, boxSealed: !packingChecklist.boxSealed})}>
                    <Checkbox 
                      checked={packingChecklist.boxSealed}
                      onCheckedChange={(checked) => setPackingChecklist({...packingChecklist, boxSealed: !!checked})}
                    />
                    <span className="text-sm flex-1">Box Sealed</span>
                    {packingChecklist.boxSealed && <CheckCircle className="h-4 w-4 text-green-600" />}
                  </div>

                  {/* Promotional Materials */}
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer" onClick={() => setPackingChecklist({...packingChecklist, promotionalMaterials: !packingChecklist.promotionalMaterials})}>
                    <Checkbox 
                      checked={packingChecklist.promotionalMaterials || false}
                      onCheckedChange={(checked) => setPackingChecklist({...packingChecklist, promotionalMaterials: !!checked})}
                    />
                    <span className="text-sm flex-1">Promotional Materials</span>
                    {packingChecklist.promotionalMaterials && <CheckCircle className="h-4 w-4 text-green-600" />}
                  </div>

                  {/* Fragile Protected (conditional) */}
                  {needsFragileProtection && (
                    <div className="flex items-center gap-2 p-2 bg-red-50 rounded hover:bg-red-100 cursor-pointer" onClick={() => setPackingChecklist({...packingChecklist, fragileProtected: !packingChecklist.fragileProtected})}>
                      <Checkbox 
                        checked={packingChecklist.fragileProtected || false}
                        onCheckedChange={(checked) => setPackingChecklist({...packingChecklist, fragileProtected: !!checked})}
                      />
                      <span className="text-sm flex-1 text-red-700 font-medium">Fragile Items Protected</span>
                      {packingChecklist.fragileProtected && <CheckCircle className="h-4 w-4 text-green-600" />}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Label Card - Compact */}
          <Card className="shadow-sm border border-gray-200 bg-white">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white p-3 rounded-t-lg">
              <CardTitle className="text-base flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Shipping Label
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="space-y-2">
                <div className="bg-gray-50 p-2 rounded text-sm">
                  <div className="font-medium">{activePackingOrder.customerName}</div>
                  <div className="text-xs text-gray-600">{activePackingOrder.shippingAddress}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Method: {activePackingOrder.shippingMethod}
                  </div>
                </div>
                
                <Button 
                  className="w-full h-9 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600"
                  onClick={() => {
                    setShippingLabelPrinted(true);
                    playSound('success');
                  }}
                  disabled={shippingLabelPrinted}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  {shippingLabelPrinted ? 'Label Printed ✓' : 'Generate Shipping Label'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Complete Packing Button - Large, Prominent */}
          <div className="sticky bottom-0 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-4 pb-2">
            {canCompletePacking ? (
              <Button 
                size="lg" 
                onClick={completePacking}
                className="w-full h-14 text-base font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg transition-all"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Complete Packing - Ready for Shipping
              </Button>
            ) : (
              <Button 
                size="lg" 
                disabled={true}
                className="w-full h-14 text-base bg-gray-200 text-gray-500 cursor-not-allowed"
                onClick={() => {
                  const missingChecks = [];
                  if (!(packingChecklist.itemsVerified || allItemsVerified)) missingChecks.push('✓ Verify All Items');
                  if (!packingChecklist.packingSlipIncluded) missingChecks.push('✓ Include Packing Slip');
                  if (!packingChecklist.invoiceIncluded) missingChecks.push('✓ Include Invoice');
                  if (!packingChecklist.weightRecorded) missingChecks.push('✓ Record Weight');
                  if (!packingChecklist.boxSealed) missingChecks.push('✓ Seal Box');
                  if (!packingChecklist.promotionalMaterials) missingChecks.push('✓ Add Promotional Materials');
                  if (needsFragileProtection && !packingChecklist.fragileProtected) missingChecks.push('✓ Protect Fragile Items');
                  if (!shippingLabelPrinted) missingChecks.push('✓ Print Shipping Label');
                  if (!selectedCarton) missingChecks.push('✓ Select Carton');
                  if (!packageWeight) missingChecks.push('✓ Enter Package Weight');
                  
                  toast({
                    title: "Cannot Complete Packing",
                    description: (
                      <div className="mt-2 space-y-1">
                        <div className="font-medium mb-2">Please complete all required steps:</div>
                        {missingChecks.map((check, i) => (
                          <div key={i} className="text-sm">{check}</div>
                        ))}
                      </div>
                    ),
                    variant: "destructive",
                    duration: 8000,
                  });
                  playSound('error');
                }}
              >
                <PackageCheck className="h-5 w-5 mr-2" />
                Complete All Steps to Finish Packing
              </Button>
            )}
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
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header - Ultra Compact for Mobile */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg z-20">
          <div className="px-3 lg:px-6 py-2 lg:py-4">
            {/* Mobile Layout - Ultra Compact */}
            <div className="lg:hidden">
              {/* Single Row: Exit + Order ID + Timer + Buttons */}
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 bg-white/20 hover:bg-white/30 text-white touch-manipulation"
                  onClick={() => {
                    setActivePickingOrder(null);
                    setIsTimerRunning(false);
                  }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{activePickingOrder.orderId}</div>
                  <div className="text-xs text-blue-100 truncate font-semibold">{activePickingOrder.customerName}</div>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <div className="text-right">
                    <div className="font-mono text-sm font-bold tabular-nums" data-picking-timer>{formatTimer(pickingTimer)}</div>
                  </div>
                  <Button
                    size="icon"
                    className="h-7 w-7 bg-red-500/80 hover:bg-red-600/90 touch-manipulation"
                    onClick={() => setShowResetOrderDialog(true)}
                    title="Reset Order"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-white" />
                  </Button>
                  <Button
                    size="icon"
                    className="h-7 w-7 bg-white/20 hover:bg-white/30 touch-manipulation"
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                  >
                    {isTimerRunning ? (
                      <PauseCircle className="h-3.5 w-3.5 text-white" />
                    ) : (
                      <PlayCircle className="h-3.5 w-3.5 text-white" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    className="h-7 w-7 bg-white/20 hover:bg-white/30 touch-manipulation"
                    onClick={() => setAudioEnabled(!audioEnabled)}
                  >
                    <Volume2 className={`h-3.5 w-3.5 ${audioEnabled ? 'text-white' : 'text-white/50'}`} />
                  </Button>
                </div>
              </div>
              
              {/* Compact Progress Bar */}
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-blue-100">Progress</span>
                  <span className="font-bold text-white">{activePickingOrder.pickedItems}/{activePickingOrder.totalItems} items</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-green-400 transition-all duration-500 ease-out rounded-full"
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
                    className="h-10 bg-white/20 hover:bg-white/30 text-white border-white/30"
                    onClick={() => {
                      setActivePickingOrder(null);
                      setIsTimerRunning(false);
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Exit
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-10 bg-red-500/80 hover:bg-red-600/90 text-white border-red-400/50"
                    onClick={() => setShowResetOrderDialog(true)}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset Order
                  </Button>
                  <Separator orientation="vertical" className="h-6 bg-white/30" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-bold">Order {activePickingOrder.orderId}</h1>
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
                    <p className="text-sm text-blue-100 mt-1">{activePickingOrder.customerName}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Timer className="h-5 w-5 text-blue-200" />
                      <span className="font-mono text-2xl font-bold" data-picking-timer>{formatTimer(pickingTimer)}</span>
                    </div>
                    <p className="text-xs text-blue-100 mt-1">Elapsed Time</p>
                  </div>
                  
                  <Button
                    size="sm"
                    className="h-10 bg-white/20 hover:bg-white/30 text-white border-white/30"
                    onClick={() => setAudioEnabled(!audioEnabled)}
                  >
                    <Volume2 className={`h-4 w-4 ${audioEnabled ? 'text-white' : 'text-white/50'}`} />
                  </Button>
                  
                  <Button
                    size="sm"
                    className="h-10 bg-white/20 hover:bg-white/30 text-white border-white/30"
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                  >
                    {isTimerRunning ? (
                      <PauseCircle className="h-4 w-4 text-white" />
                    ) : (
                      <PlayCircle className="h-4 w-4 text-white" />
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-blue-100">Progress</span>
                  <span className="font-semibold text-white">{activePickingOrder.pickedItems}/{activePickingOrder.totalItems} items</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full bg-green-400 transition-all duration-500 ease-out rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Indicator - Desktop only */}
        <div className="hidden lg:block bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-b border-blue-200/30">
          <div className="px-4 py-2">
            <div className="flex items-center justify-center gap-6 text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-white rounded shadow-sm border border-gray-300 font-mono">
                  {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+K
                </kbd>
                <span>Focus Barcode</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-white rounded shadow-sm border border-gray-300 font-mono">Alt+N</kbd>
                <span>Next Item</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-white rounded shadow-sm border border-gray-300 font-mono">Alt+P</kbd>
                <span>Previous</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-white rounded shadow-sm border border-gray-300 font-mono">Esc</kbd>
                <span>Exit/Close</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Scrollable container */}
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col lg:flex-row min-h-full">
            {/* Left Panel - Current Item Focus */}
            <div className="flex-1 p-2 lg:p-6">
            {!allItemsPicked && currentItem ? (
              <div className="max-w-4xl mx-auto">
                {/* Simplified Card Layout - Mobile-First */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                  {/* Minimal Header with Progress */}
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-white/20 rounded-full p-2">
                          <Package className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="text-white/80 text-sm font-medium">Picking Item</p>
                          <p className="text-white text-2xl font-black">{currentItemIndex + 1} / {activePickingOrder.items.length}</p>
                        </div>
                      </div>
                      {currentItem?.pickedQuantity === currentItem?.quantity && (
                        <CheckCircle className="h-10 w-10 text-green-400 animate-pulse" />
                      )}
                    </div>
                    {/* Overall Progress Bar */}
                    <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white transition-all duration-500"
                        style={{ width: `${((currentItemIndex + (currentItem.pickedQuantity >= currentItem.quantity ? 1 : 0)) / activePickingOrder.items.length) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="p-4 lg:p-6 space-y-4">
                      {/* Streamlined Product Display - Hero Image Layout */}
                      <div className="space-y-4">
                        {/* Hero Product Image - Always Large and Prominent */}
                        <div 
                          className="relative bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm"
                          onClick={() => handleImageClick(currentItem.id)}
                        >
                          <div className="aspect-square max-h-64 sm:max-h-80 lg:max-h-96 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 cursor-pointer">
                            {currentItem.image ? (
                              <img 
                                src={currentItem.image} 
                                alt={currentItem.productName}
                                className="w-full h-full object-contain p-4"
                              />
                            ) : (
                              <ImagePlaceholder size="lg" variant="product" />
                            )}
                            {/* Overlay Badge for Quick Info */}
                            <div className="absolute top-2 right-2 bg-black/75 text-white px-3 py-1 rounded-full text-sm font-bold">
                              {currentItem.pickedQuantity}/{currentItem.quantity}
                            </div>
                          </div>
                        </div>
                        
                        {/* Essential Product Info - Clean and Minimal */}
                        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
                            {currentItem.productName}
                          </h2>
                          <div className="flex gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Hash className="h-4 w-4 text-gray-400" />
                              <span className="font-mono">{currentItem.sku}</span>
                            </div>
                            {currentItem.barcode && (
                              <div className="flex items-center gap-1">
                                <ScanLine className="h-4 w-4 text-gray-400" />
                                <span className="font-mono">{currentItem.barcode}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Warehouse Location - High Contrast Banner */}
                      <div className="bg-orange-100 border-3 border-orange-500 rounded-lg p-4 text-center">
                        <p className="text-xs font-bold text-orange-800 uppercase mb-1">Location</p>
                        <p className="text-5xl sm:text-6xl font-black text-orange-600 font-mono">{currentItem.warehouseLocation}</p>
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
                            <Alert className="mt-4 bg-emerald-50 border-2 border-emerald-300 shadow-md">
                              <CheckCircle className="h-4 lg:h-5 w-4 lg:w-5 text-emerald-700" />
                              <AlertDescription className="text-emerald-800 font-semibold text-sm lg:text-base">
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
                        /* Streamlined Quantity Picker - Quick Action Buttons */
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
                          {/* Large Visual Counter */}
                          <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center gap-3">
                              <div className="text-7xl sm:text-8xl font-black text-blue-600 tabular-nums">
                                {currentItem.pickedQuantity}
                              </div>
                              <div className="text-3xl sm:text-4xl font-bold text-gray-400">/</div>
                              <div className="text-5xl sm:text-6xl font-black text-gray-700 tabular-nums">
                                {currentItem.quantity}
                              </div>
                            </div>
                            {/* Progress Bar */}
                            <div className="mt-4 h-3 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                                style={{ width: `${(currentItem.pickedQuantity / currentItem.quantity) * 100}%` }}
                              />
                            </div>
                          </div>

                          {/* Quick Action Buttons Grid */}
                          <div className="grid grid-cols-2 gap-3">
                            {/* Common quantities based on order amount */}
                            {currentItem.quantity === 1 ? (
                              // Single item - just Pick 1 button
                              <Button
                                size="lg"
                                className="col-span-2 h-20 text-2xl font-black bg-green-500 hover:bg-green-600 text-white shadow-lg rounded-xl"
                                onClick={() => updatePickedItem(currentItem.id, 1)}
                                disabled={currentItem.pickedQuantity >= 1}
                              >
                                <CheckCircle className="h-8 w-8 mr-3" />
                                PICK 1
                              </Button>
                            ) : currentItem.quantity <= 5 ? (
                              // Small quantity - show each number
                              <>
                                {[...Array(Math.min(currentItem.quantity, 4))].map((_, i) => (
                                  <Button
                                    key={i + 1}
                                    size="lg"
                                    className={`h-16 text-xl font-black shadow-md rounded-xl ${
                                      currentItem.pickedQuantity === i + 1 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300'
                                    }`}
                                    onClick={() => updatePickedItem(currentItem.id, i + 1)}
                                  >
                                    {i + 1}
                                  </Button>
                                ))}
                                {currentItem.quantity === 5 && (
                                  <Button
                                    size="lg"
                                    className={`h-16 text-xl font-black shadow-md rounded-xl ${
                                      currentItem.pickedQuantity === 5 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300'
                                    }`}
                                    onClick={() => updatePickedItem(currentItem.id, 5)}
                                  >
                                    5
                                  </Button>
                                )}
                                {/* Pick All for remaining spot */}
                                {currentItem.quantity <= 4 && (
                                  <Button
                                    size="lg"
                                    className="h-16 text-lg font-black bg-green-500 hover:bg-green-600 text-white shadow-md rounded-xl"
                                    onClick={() => updatePickedItem(currentItem.id, currentItem.quantity)}
                                    disabled={currentItem.pickedQuantity >= currentItem.quantity}
                                  >
                                    ALL
                                  </Button>
                                )}
                              </>
                            ) : (
                              // Larger quantities - show common amounts
                              <>
                                <Button
                                  size="lg"
                                  className="h-16 text-xl font-black bg-blue-500 hover:bg-blue-600 text-white shadow-md rounded-xl"
                                  onClick={() => updatePickedItem(currentItem.id, Math.min(currentItem.pickedQuantity + 1, currentItem.quantity))}
                                  disabled={currentItem.pickedQuantity >= currentItem.quantity}
                                >
                                  <Plus className="h-6 w-6 mr-2" />
                                  Add 1
                                </Button>
                                <Button
                                  size="lg"
                                  className="h-16 text-xl font-black bg-gray-500 hover:bg-gray-600 text-white shadow-md rounded-xl"
                                  onClick={() => updatePickedItem(currentItem.id, Math.max(currentItem.pickedQuantity - 1, 0))}
                                  disabled={currentItem.pickedQuantity === 0}
                                >
                                  <Minus className="h-6 w-6 mr-2" />
                                  Less 1
                                </Button>
                                <Button
                                  size="lg"
                                  className="h-16 text-xl font-black bg-purple-500 hover:bg-purple-600 text-white shadow-md rounded-xl"
                                  onClick={() => updatePickedItem(currentItem.id, Math.floor(currentItem.quantity / 2))}
                                >
                                  Half ({Math.floor(currentItem.quantity / 2)})
                                </Button>
                                <Button
                                  size="lg"
                                  className="h-16 text-xl font-black bg-green-500 hover:bg-green-600 text-white shadow-md rounded-xl"
                                  onClick={() => updatePickedItem(currentItem.id, currentItem.quantity)}
                                  disabled={currentItem.pickedQuantity >= currentItem.quantity}
                                >
                                  <CheckCircle className="h-6 w-6 mr-2" />
                                  ALL ({currentItem.quantity})
                                </Button>
                              </>
                            )}
                          </div>

                          {/* Reset Button if needed */}
                          {currentItem.pickedQuantity > 0 && (
                            <Button
                              variant="outline"
                              className="w-full mt-3 h-12 text-base font-semibold border-2 border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => updatePickedItem(currentItem.id, 0)}
                            >
                              <RotateCcw className="h-5 w-5 mr-2" />
                              Reset to 0
                            </Button>
                          )}

                          {/* Success State */}
                          {currentItem.pickedQuantity >= currentItem.quantity && (
                            <Alert className="mt-4 bg-green-50 border-2 border-green-400">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <AlertDescription className="text-green-800 font-bold">
                                ✓ Item fully picked! Ready for next.
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}
                      
                      {/* Item Navigation Buttons */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 h-11 text-sm font-semibold border-2 border-gray-300 hover:bg-gray-50 disabled:opacity-30 rounded-lg"
                          onClick={() => {
                            window.scrollTo(0, 0);
                            setManualItemIndex(Math.max(0, currentItemIndex - 1));
                          }}
                          disabled={currentItemIndex === 0}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        
                        <Button
                          variant="outline"
                          className="flex-1 h-11 text-sm font-semibold border-2 border-gray-300 hover:bg-gray-50 disabled:opacity-30 rounded-lg"
                          onClick={() => {
                            window.scrollTo(0, 0);
                            setManualItemIndex(Math.min(activePickingOrder.items.length - 1, currentItemIndex + 1));
                          }}
                          disabled={currentItemIndex === activePickingOrder.items.length - 1}
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Barcode Scanner - Streamlined Design */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="p-3 lg:p-4">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            ref={barcodeInputRef}
                            placeholder="Ready to scan..."
                            value={barcodeInput}
                            className="text-base lg:text-lg h-11 lg:h-12 bg-gray-50 border-2 border-gray-300 placeholder:text-gray-400 font-mono cursor-default rounded-lg"
                            readOnly
                          />
                        </div>
                        <Button 
                          onClick={handleBarcodeScan}
                          className="h-11 lg:h-12 px-5 lg:px-7 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md touch-manipulation rounded-lg"
                        >
                          <ScanLine className="h-4 w-4 lg:h-5 lg:w-5 sm:mr-2" />
                          <span className="hidden sm:inline text-base">Scan</span>
                        </Button>
                      </div>
                    </div>
                  </div>
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
                          
                          // Immediately transition to packing without delay
                          setShowPickingCompletionModal(false);
                          setActivePickingOrder(null);
                          setPickingTimer(0);
                          setManualItemIndex(0);
                          
                          // Start packing immediately (no setTimeout delay)
                          startPacking(orderTopack);
                          
                          // Complete picking in background (non-blocking)
                          completePicking().catch(console.error);
                          
                          // Switch tab after starting packing
                          setSelectedTab('packing');
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
                          // Store the current order ID to exclude it from next order search
                          const justCompletedOrderId = activePickingOrder?.id;
                          
                          // Hide modal immediately and reset state
                          setShowPickingCompletionModal(false);
                          setActivePickingOrder(null);
                          setPickingTimer(0);
                          setManualItemIndex(0);
                          
                          // Find next order immediately from existing data, excluding the just-completed order
                          const pendingOrders = transformedOrders.filter(o => 
                            o.id !== justCompletedOrderId && // Exclude the order we just completed
                            o.pickStatus === 'not_started' && 
                            o.status === 'to_fulfill'
                          );
                          
                          // Sort by priority to get the highest priority order
                          const nextOrder = pendingOrders.sort((a, b) => {
                            const priorityWeight = { high: 3, medium: 2, low: 1 };
                            return priorityWeight[b.priority] - priorityWeight[a.priority];
                          })[0];
                          
                          if (nextOrder) {
                            console.log('Starting next order:', nextOrder);
                            // Start picking the next order immediately
                            startPicking(nextOrder);
                            
                            // Complete the previous order in background (non-blocking)
                            completePicking().catch(console.error);
                            
                            // Invalidate queries in background to refresh data (non-blocking)
                            queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
                          } else {
                            console.log('No pending orders available to pick');
                            // Only switch to pending tab if no orders available
                            setSelectedTab('pending');
                            
                            // Complete picking in background
                            completePicking().catch(console.error);
                            queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
                          }
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
      {/* Main Content - Mobile Optimized */}
      <div className="px-3 sm:px-6 pb-6">
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
          <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
            <TabsList className="grid grid-cols-5 w-full min-w-[400px] sm:max-w-3xl bg-white border border-gray-200 p-2 gap-2 shadow-sm rounded-lg h-auto">
              <TabsTrigger value="overview" className="flex flex-col items-center justify-center gap-1.5 py-4 px-3 text-xs sm:text-sm font-semibold bg-gray-50 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm data-[state=active]:border-b-3 data-[state=active]:border-blue-500 rounded-lg transition-all hover:bg-gray-100 data-[state=active]:hover:bg-white">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="text-center">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex flex-col items-center justify-center gap-1.5 py-4 px-3 text-xs sm:text-sm font-semibold bg-gray-50 data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm data-[state=active]:border-b-3 data-[state=active]:border-orange-500 rounded-lg transition-all hover:bg-gray-100 data-[state=active]:hover:bg-white">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="text-center">Pending (<span className={animatingCounters.has('pending') ? 'animate-bounce-count' : ''}>{stats.pending}</span>)</span>
              </TabsTrigger>
              <TabsTrigger value="picking" className="flex flex-col items-center justify-center gap-1.5 py-4 px-3 text-xs sm:text-sm font-semibold bg-gray-50 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm data-[state=active]:border-b-3 data-[state=active]:border-blue-500 rounded-lg transition-all hover:bg-gray-100 data-[state=active]:hover:bg-white">
                <Package className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="text-center">Picking (<span className={animatingCounters.has('picking') ? 'animate-bounce-count' : ''}>{stats.picking}</span>)</span>
              </TabsTrigger>
              <TabsTrigger value="packing" className="flex flex-col items-center justify-center gap-1.5 py-4 px-3 text-xs sm:text-sm font-semibold bg-gray-50 data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm data-[state=active]:border-b-3 data-[state=active]:border-purple-500 rounded-lg transition-all hover:bg-gray-100 data-[state=active]:hover:bg-white">
                <Box className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="text-center">Packing (<span className={animatingCounters.has('packing') ? 'animate-bounce-count' : ''}>{stats.packing}</span>)</span>
              </TabsTrigger>
              <TabsTrigger value="ready" className="flex flex-col items-center justify-center gap-1.5 py-4 px-3 text-xs sm:text-sm font-semibold bg-gray-50 data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:shadow-sm data-[state=active]:border-b-3 data-[state=active]:border-green-500 rounded-lg transition-all hover:bg-gray-100 data-[state=active]:hover:bg-white">
                <Truck className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="text-center">Ready (<span className={animatingCounters.has('ready') ? 'animate-bounce-count' : ''}>{stats.ready}</span>)</span>
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
                  {isLoading ? (
                    <>
                      <Skeleton className="h-10 sm:h-12 w-full" />
                      <Skeleton className="h-10 sm:h-12 w-full" />
                      <Skeleton className="h-10 sm:h-12 w-full" />
                      <Skeleton className="h-10 sm:h-12 w-full" />
                    </>
                  ) : (
                    <>
                      {
                        (() => {
                          // Count pending orders (ready to pick)
                          const ordersToPickCount = transformedOrders.filter(o => 
                            o.status === 'to_fulfill'
                          ).length;
                          const hasOrders = ordersToPickCount > 0;
                          
                          return (
                            <Button 
                              className="w-full justify-start h-10 sm:h-12 text-sm sm:text-base" 
                              size="lg"
                              variant={hasOrders ? "default" : "secondary"}
                              onClick={startNextPriorityOrder}
                              disabled={!hasOrders}
                              data-testid="button-start-next-priority-order"
                            >
                              <PlayCircle className="h-4 sm:h-5 w-4 sm:w-5 mr-2 sm:mr-3" />
                              Start Next Priority Order {hasOrders && `(${ordersToPickCount})`}
                            </Button>
                          );
                        })()
                      }
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
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity - Mobile Optimized */}
              <Card>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="text-base sm:text-lg flex items-center justify-between">
                    <span>Today's Activity</span>
                    <Badge variant="outline" className="text-xs">
                      {formatDate(new Date())}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="h-4 w-4 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <RecentActivityList orders={transformedOrders} />
                  )}
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
            
            <Card className="shadow-sm">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl font-bold">
                  Orders Ready to Pick ({getOrdersByStatus('pending').length})
                  {getOrdersByStatus('pending').length > 0 && predictions && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ~{Math.floor(getOrdersByStatus('pending').length * predictions.pickingTimePerOrder / 60)}h {Math.round((getOrdersByStatus('pending').length * predictions.pickingTimePerOrder) % 60)}m est.
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-sm mt-1">
                  {(() => {
                    const totalItems = getOrdersByStatus('pending').reduce((sum, order) => sum + order.totalItems, 0);
                    return batchPickingMode 
                      ? `${totalItems} total items across ${getOrdersByStatus('pending').length} orders`
                      : `${totalItems} total items to pick`;
                  })()}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-4">
                <div className="space-y-2">
                  {getOrdersByStatus('pending').map(order => (
                    <Card 
                      key={order.id} 
                      className={`fade-in ${
                        batchPickingMode ? 'cursor-pointer hover:shadow-md' : ''
                      } transition-all ${
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
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {batchPickingMode && (
                                <input
                                  type="checkbox"
                                  checked={selectedBatchItems.has(order.id)}
                                  className="h-4 w-4 text-purple-600 rounded"
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={() => {}}
                                />
                              )}
                              <h3 className="text-base font-semibold text-gray-900">{order.orderId}</h3>
                              <Badge variant={getPriorityColor(order.priority)} className="text-xs font-semibold py-0.5 px-2">
                                {order.priority.toUpperCase()}
                              </Badge>
                              {order.priority === 'high' && (
                                <Zap className="h-4 w-4 text-red-500 fill-red-500" />
                              )}
                              {/* Status indicator */}
                              {(() => {
                                const status = getOrderStatusDisplay(order);
                                return (
                                  <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${status.color}`}>
                                    {status.label}
                                  </span>
                                );
                              })()}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-gray-600 mb-2">
                              <div className="flex items-center gap-1.5">
                                <User className="h-4 w-4 text-gray-400" />
                                <span className="truncate font-medium">{order.customerName}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Globe className="h-4 w-4 text-gray-400" />
                                <span className="font-semibold text-gray-900">{getOrderCountryCode(order)}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Package className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">{order.totalItems} items</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Truck className="h-4 w-4 text-blue-500" />
                                <span className="truncate font-medium text-blue-600">{order.shippingCarrier || 'Standard Carrier'}</span>
                              </div>
                            </div>
                            {/* Compact product list */}
                            {order.items && order.items.length > 0 && (
                              <div className="pt-3 mt-3 border-t border-gray-200">
                                <div className="space-y-1">
                                  {order.items.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                                      <span className="w-5 text-center text-gray-500 font-medium">{item.quantity}x</span>
                                      <span className="truncate">{item.productName}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          {!batchPickingMode && (
                            <div className="flex sm:flex-col items-center gap-2">
                              {/* Quick View Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 sm:h-12 sm:w-12"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewOrder(order);
                                }}
                                title="View Order Details"
                              >
                                <Eye className="h-5 w-5" />
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1 sm:flex-initial sm:w-full h-10 sm:h-12 text-sm font-semibold"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startPicking(order);
                                }}
                              >
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Start
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOrderToHold(order);
                                    }}
                                  >
                                    <Pause className="h-3.5 w-3.5 mr-1.5" />
                                    Put On Hold
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOrderToCancel(order);
                                    }}
                                    className="text-red-600"
                                  >
                                    <XCircle className="h-3.5 w-3.5 mr-1.5" />
                                    Cancel Order
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {!isLoading && getOrdersByStatus('pending').length === 0 && (
                    <div className="text-center py-12 fade-in">
                      <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No pending orders to pick</p>
                    </div>
                  )}
                  {isLoading && (
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map(i => (
                        <OrderCardSkeleton key={i} />
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other tabs - Mobile Optimized */}
          <TabsContent value="picking" className="mt-4 sm:mt-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl font-bold">
                  Orders Being Picked ({getOrdersByStatus('picking').length})
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-4">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map(i => (
                      <OrderCardSkeleton key={i} />
                    ))}
                  </div>
                ) : getOrdersByStatus('picking').length === 0 ? (
                  <div className="text-center py-6 sm:py-8 fade-in">
                    <Package className="h-8 sm:h-10 w-8 sm:w-10 text-gray-300 mx-auto mb-2 sm:mb-3" />
                    <p className="text-xs sm:text-sm text-gray-500">No orders currently being picked</p>
                  </div>
                ) : (
                  <div className="space-y-2 stagger-animation">
                    {getOrdersByStatus('picking').map(order => (
                      <Card key={order.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow rounded-lg fade-in">
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-base font-semibold text-gray-900">{order.orderId}</h3>
                                {/* Status indicator */}
                                {(() => {
                                  const status = getOrderStatusDisplay(order);
                                  return (
                                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${status.color}`}>
                                      {status.label}
                                    </span>
                                  );
                                })()}
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-gray-600 mb-2">
                                <div className="flex items-center gap-1.5">
                                  <User className="h-4 w-4 text-gray-400" />
                                  <span className="truncate font-medium">{order.customerName}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Globe className="h-4 w-4 text-gray-400" />
                                  <span className="font-semibold text-gray-900">{getOrderCountryCode(order)}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Package className="h-4 w-4 text-gray-400" />
                                  <span className="font-medium">{order.totalItems} items</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Truck className="h-4 w-4 text-blue-500" />
                                  <span className="truncate font-medium text-blue-600">{order.shippingCarrier || 'Standard Carrier'}</span>
                                </div>
                              </div>
                              {order.pickedBy && (
                                <div className="flex items-center gap-1.5 text-sm mb-3">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <span className="text-green-600 font-medium">Picked by {order.pickedBy}</span>
                                </div>
                              )}
                              {/* Compact product list */}
                              {order.items && order.items.length > 0 && (
                                <div className="pt-3 mt-3 border-t border-gray-200">
                                  <div className="space-y-1">
                                    {order.items.map((item, idx) => (
                                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                                        <span className="w-5 text-center text-gray-500 font-medium">{item.quantity}x</span>
                                        <span className="truncate">{item.productName}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex sm:flex-col items-center gap-2">
                              {/* Quick View Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 sm:h-12 sm:w-12"
                                onClick={() => setPreviewOrder(order)}
                                title="View Order Details"
                              >
                                <Eye className="h-5 w-5" />
                              </Button>
                              <Button 
                                size="sm" 
                                className="flex-1 sm:flex-initial sm:w-full h-10 sm:h-12 text-sm bg-amber-500 hover:bg-amber-600 text-white font-semibold"
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
                                Resume
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOrderToSendToPending(order);
                                    }}
                                  >
                                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                                    Send Back to Pending
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOrderToHold(order);
                                    }}
                                  >
                                    <Pause className="h-3.5 w-3.5 mr-1.5" />
                                    Put On Hold
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOrderToCancel(order);
                                    }}
                                    className="text-red-600"
                                  >
                                    <XCircle className="h-3.5 w-3.5 mr-1.5" />
                                    Cancel Order
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

          <TabsContent value="packing" className="mt-4 sm:mt-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl font-bold">
                  Ready for Packing ({getOrdersByStatus('packing').length})
                  {getOrdersByStatus('packing').length > 0 && predictions && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ~{Math.floor(getOrdersByStatus('packing').length * predictions.packingTimePerOrder / 60)}h {Math.round((getOrdersByStatus('packing').length * predictions.packingTimePerOrder) % 60)}m est.
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-sm mt-1">Orders that have been picked and ready to pack</CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-4">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <OrderCardSkeleton key={i} />
                    ))}
                  </div>
                ) : getOrdersByStatus('packing').length === 0 ? (
                  <div className="text-center py-6 sm:py-8 fade-in">
                    <Box className="h-8 sm:h-10 w-8 sm:w-10 text-gray-300 mx-auto mb-2 sm:mb-3" />
                    <p className="text-xs sm:text-sm text-gray-500">No orders ready for packing</p>
                  </div>
                ) : (
                  <div className="space-y-2 stagger-animation">
                    {getOrdersByStatus('packing')
                      .filter(order => !ordersSentBack.has(order.id)) // Filter out orders being sent back
                      .map(order => (
                      <Card key={order.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow rounded-lg fade-in">
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-base font-semibold text-gray-900">{order.orderId}</h3>
                                {/* Status indicator */}
                                {(() => {
                                  const status = getOrderStatusDisplay(order);
                                  return (
                                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${status.color}`}>
                                      {status.label}
                                    </span>
                                  );
                                })()}
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-gray-600 mb-2">
                                <div className="flex items-center gap-1.5">
                                  <User className="h-4 w-4 text-gray-400" />
                                  <span className="truncate font-medium">{order.customerName}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Globe className="h-4 w-4 text-gray-400" />
                                  <span className="font-semibold text-gray-900">{getOrderCountryCode(order)}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Package className="h-4 w-4 text-gray-400" />
                                  <span className="font-medium">{order.totalItems} items</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Truck className="h-4 w-4 text-blue-500" />
                                  <span className="truncate font-medium text-blue-600">{order.shippingCarrier || 'Standard Carrier'}</span>
                                </div>
                              </div>
                              {order.pickedBy && (
                                <div className="flex items-center gap-1.5 text-sm mb-3">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <span className="text-green-600 font-medium">Picked by {order.pickedBy}</span>
                                </div>
                              )}
                              {/* Compact product list */}
                              {order.items && order.items.length > 0 && (
                                <div className="pt-3 mt-3 border-t border-gray-200">
                                  <div className="space-y-1">
                                    {order.items.map((item, idx) => (
                                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                                        <span className="w-5 text-center text-gray-500 font-medium">{item.quantity}x</span>
                                        <span className="truncate">{item.productName}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex sm:flex-col items-center gap-2">
                              {/* Quick View Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 sm:h-12 sm:w-12"
                                onClick={() => setPreviewOrder(order)}
                                title="View Order Details"
                              >
                                <Eye className="h-5 w-5" />
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1 sm:flex-initial sm:w-full h-10 sm:h-12 text-sm bg-purple-600 hover:bg-purple-700 font-semibold"
                                onClick={() => startPacking(order)}
                              >
                                <Box className="h-4 w-4 mr-2" />
                                Start
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
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
                                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                                    Send back to Pick
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOrderToSendToPending(order);
                                    }}
                                  >
                                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                                    Send Back to Pending
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOrderToHold(order);
                                    }}
                                  >
                                    <Pause className="h-3.5 w-3.5 mr-1.5" />
                                    Put On Hold
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOrderToCancel(order);
                                    }}
                                    className="text-red-600"
                                  >
                                    <XCircle className="h-3.5 w-3.5 mr-1.5" />
                                    Cancel Order
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
            <Card className="shadow-sm">
              <CardHeader className="pb-4 sm:pb-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg sm:text-xl font-bold">
                      Ready to Ship {getOrdersByStatus('ready').length > 0 && `(${getOrdersByStatus('ready').length})`}
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">Orders organized by shipping destination</CardDescription>
                  </div>
                  {getOrdersByStatus('ready').length > 0 && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 min-h-[44px] font-semibold whitespace-nowrap"
                      onClick={() => setShowShipAllConfirm(true)}
                    >
                      <Check className="h-5 w-5 mr-2" />
                      <span className="hidden sm:inline">Mark all as shipped</span>
                      <span className="sm:hidden">Ship All</span>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-4">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <OrderCardSkeleton key={i} />
                    ))}
                  </div>
                ) : getOrdersByStatus('ready').length === 0 ? (
                  <div className="text-center py-6 sm:py-8 fade-in">
                    <Truck className="h-8 sm:h-10 w-8 sm:w-10 text-gray-300 mx-auto mb-2 sm:mb-3" />
                    <p className="text-xs sm:text-sm text-gray-500">No orders ready to ship</p>
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Categorize orders by shipping location */}
                    {(() => {
                      const readyOrders = getOrdersByStatus('ready')
                        .filter(order => !ordersReturnedToPacking.has(order.id)); // Filter out orders being returned
                      
                      // Categorize orders
                      const czechiaSlovakia = readyOrders.filter(order => {
                        // Check order ID prefix or notes content for CZ orders
                        const orderId = order.orderId?.toLowerCase() || '';
                        const notes = order.notes?.toLowerCase() || '';
                        const address = order.shippingAddress?.toLowerCase() || '';
                        
                        return orderId.includes('-cz') || 
                               notes.includes('czech/slovak') || 
                               address.includes('czech') || address.includes('česk') || 
                               address.includes('slovakia') || address.includes('slovensk') ||
                               address.includes('prague') || address.includes('praha') || 
                               address.includes('bratislava') || address.includes('brno') || 
                               address.includes('košice') || address.includes('plzeň') ||
                               address.includes('ostrava') || address.includes('prešov') ||
                               address.includes('nitra') || address.includes('trnava');
                      });
                      
                      const germanyEU = readyOrders.filter(order => {
                        // Check order ID prefix or notes content for DE orders
                        const orderId = order.orderId?.toLowerCase() || '';
                        const notes = order.notes?.toLowerCase() || '';
                        const address = order.shippingAddress?.toLowerCase() || '';
                        const isCzechSlovak = czechiaSlovakia.includes(order);
                        
                        return !isCzechSlovak && (
                          orderId.includes('-de') || 
                          notes.includes('german/eu') ||
                          address.includes('germany') || address.includes('deutschland') ||
                          address.includes('berlin') || address.includes('munich') ||
                          address.includes('düsseldorf') || address.includes('frankfurt') ||
                          address.includes('hamburg') || address.includes('vienna') ||
                          address.includes('zurich') || address.includes('geneva') ||
                          address.includes('austria') || address.includes('switzerland') ||
                          address.includes('france') || address.includes('italy') ||
                          address.includes('spain') || address.includes('poland') ||
                          address.includes('belgium')
                        );
                      });
                      
                      const personalDelivery = readyOrders.filter(order => {
                        // Check order ID prefix or notes content for PD orders
                        const orderId = order.orderId?.toLowerCase() || '';
                        const notes = order.notes?.toLowerCase() || '';
                        const method = order.shippingMethod?.toLowerCase() || '';
                        
                        return orderId.includes('-pd') || 
                               notes.includes('personal') ||
                               method.includes('personal') || method.includes('hand deliver');
                      });
                      
                      const pickup = readyOrders.filter(order => {
                        // Check order ID prefix or notes content for PU orders
                        const orderId = order.orderId?.toLowerCase() || '';
                        const notes = order.notes?.toLowerCase() || '';
                        const method = order.shippingMethod?.toLowerCase() || '';
                        
                        return orderId.includes('-pu') || 
                               notes.includes('pickup') ||
                               method.includes('pickup') || method.includes('collect');
                      });
                      
                      // Other orders (not in any category)
                      const otherOrders = readyOrders.filter(order => 
                        !czechiaSlovakia.includes(order) && 
                        !germanyEU.includes(order) && 
                        !personalDelivery.includes(order) && 
                        !pickup.includes(order)
                      );
                      
                      const sections = [
                        { 
                          title: 'Czechia & Slovakia', 
                          icon: MapPin,
                          color: 'bg-teal-50 border-teal-200',
                          headerColor: 'from-teal-50 via-teal-50 to-white',
                          iconBg: 'from-white to-teal-50 border-teal-200',
                          buttonColor: 'bg-teal-600 hover:bg-teal-700',
                          orders: czechiaSlovakia 
                        },
                        { 
                          title: 'Germany & EU', 
                          icon: Globe,
                          color: 'bg-purple-50 border-purple-200',
                          headerColor: 'from-purple-50 via-purple-50 to-white',
                          iconBg: 'from-white to-purple-50 border-purple-200',
                          buttonColor: 'bg-purple-600 hover:bg-purple-700',
                          orders: germanyEU 
                        },
                        { 
                          title: 'Personal Delivery', 
                          icon: Users,
                          color: 'bg-orange-50 border-orange-200',
                          headerColor: 'from-orange-50 via-orange-50 to-white',
                          iconBg: 'from-white to-orange-50 border-orange-200',
                          buttonColor: 'bg-orange-600 hover:bg-orange-700',
                          orders: personalDelivery 
                        },
                        { 
                          title: 'Customer Pickup', 
                          icon: Building,
                          color: 'bg-emerald-50 border-emerald-200',
                          headerColor: 'from-emerald-50 via-emerald-50 to-white',
                          iconBg: 'from-white to-emerald-50 border-emerald-200',
                          buttonColor: 'bg-emerald-600 hover:bg-emerald-700',
                          orders: pickup 
                        },
                        { 
                          title: 'Other Destinations', 
                          icon: Package,
                          color: 'bg-blue-50 border-blue-200',
                          headerColor: 'from-blue-50 via-blue-50 to-white',
                          iconBg: 'from-white to-blue-50 border-blue-200',
                          buttonColor: 'bg-blue-600 hover:bg-blue-700',
                          orders: otherOrders 
                        },
                      ].filter(section => section.orders.length > 0);
                      
                      return sections.map((section, sectionIndex) => {
                        const Icon = section.icon;
                        return (
                          <div key={sectionIndex} className={`rounded-xl border overflow-hidden shadow-sm ${section.color}`}>
                            {/* Section Header */}
                            <div 
                              className="px-4 py-3 border-b border-gray-200 cursor-pointer select-none bg-white/70 hover:bg-white/90 transition-all"
                              onClick={() => toggleSectionCollapse(section.title)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="p-2.5 rounded-lg bg-white border border-gray-300">
                                    <Icon className="h-4 w-4 text-gray-600" />
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="font-bold text-base text-gray-900 tracking-wide uppercase">
                                      {section.title}
                                    </h3>
                                    <p className="text-xs text-gray-600 mt-0.5 font-medium">
                                      {section.orders.length} {section.orders.length === 1 ? 'order ready' : 'orders ready'}
                                    </p>
                                  </div>
                                  {/* Collapse/Expand indicator */}
                                  <ChevronDown 
                                    className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                                      collapsedSections.has(section.title) ? '-rotate-90' : ''
                                    }`} 
                                  />
                                </div>
                                <Button
                                  size="sm"
                                  className={`${section.buttonColor} text-white shadow-sm text-xs sm:text-sm px-3 py-2 font-medium hover:shadow-md transition-all duration-200 ml-3 min-w-[80px] max-w-[120px]`}
                                  onClick={async (e) => {
                                    e.stopPropagation(); // Prevent collapse when clicking Ship All
                                    
                                    // Optimistic update - mark all orders as shipped immediately
                                    const orderIds = section.orders.map(o => o.id);
                                    const cachedData = queryClient.getQueryData<PickPackOrder[]>(['/api/orders/pick-pack']);
                                    if (cachedData) {
                                      queryClient.setQueryData<PickPackOrder[]>(
                                        ['/api/orders/pick-pack'],
                                        cachedData.map(o => 
                                          orderIds.includes(o.id) 
                                            ? { ...o, status: 'shipped' as const }
                                            : o
                                        )
                                      );
                                    }
                                    
                                    // Show undo bar immediately
                                    setPendingShipments({
                                      orderIds,
                                      timestamp: Date.now(),
                                      description: `Shipped ${section.orders.length} orders from ${section.title}`
                                    });
                                    setShowUndoPopup(true);
                                    setUndoTimeLeft(15);
                                    
                                    playSound('success');
                                    
                                    // Process in background
                                    try {
                                      await batchShipMutation.mutateAsync(orderIds);
                                    } catch (error) {
                                      // Rollback on error
                                      console.error('Error shipping section:', error);
                                      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
                                      toast({
                                        title: "Error",
                                        description: "Failed to ship some orders",
                                        variant: "destructive"
                                      });
                                      setPendingShipments(null);
                                      setShowUndoPopup(false);
                                    }
                                  }}
                                >
                                  <Check className="h-3.5 w-3.5 mr-1.5" />
                                  <span>Ship {section.orders.length}</span>
                                </Button>
                              </div>
                            </div>
                            
                            {/* Section Content - Collapsible */}
                            {!collapsedSections.has(section.title) && (
                              <div className="p-2">
                              {/* Section Orders */}
                              <div className="space-y-1.5">
                              {section.orders
                                .filter(order => !ordersReturnedToPacking.has(order.id)) // Filter out orders being returned
                                .map(order => (
                                <Card 
                                  key={order.id} 
                                  className="bg-white border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                                  onClick={() => setPreviewOrder(order)}
                                >
                                  <CardContent className="p-2">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-1.5 mb-1">
                                          <h3 className="font-semibold text-xs sm:text-sm">{order.orderId}</h3>
                                          <span className="text-xs px-1.5 py-0.5 rounded-full border font-medium bg-green-100 text-green-700 border-green-200">
                                            Ready to Ship
                                          </span>
                                          {order.modifiedAfterPacking && (
                                            <span className="text-xs px-1.5 py-0.5 rounded-full border font-medium bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1 animate-pulse">
                                              <AlertTriangle className="h-3 w-3" />
                                              Modified
                                            </span>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs text-gray-600">
                                          <div className="flex items-center gap-1.5">
                                            <User className="h-3 w-3 text-gray-400" />
                                            <span className="truncate font-medium">{order.customerName}</span>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <Globe className="h-3 w-3 text-gray-400" />
                                            <span className="font-semibold text-gray-900">{getOrderCountryCode(order)}</span>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <Package className="h-3 w-3 text-gray-400" />
                                            <span className="font-medium">{order.totalItems} items</span>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <Truck className="h-3 w-3 text-blue-500" />
                                            <span className="truncate font-medium text-blue-600">{order.shippingCarrier || 'Standard Carrier'}</span>
                                          </div>
                                        </div>
                                        {order.packedBy && (
                                          <div className="flex items-center gap-1.5 text-xs mt-1">
                                            <CheckCircle className="h-3 w-3 text-green-500" />
                                            <span className="text-green-600 font-medium">Packed by {order.packedBy}</span>
                                          </div>
                                        )}
                                        {/* Compact product list */}
                                        {order.items && order.items.length > 0 && (
                                          <div className="mt-1.5 pt-1.5 border-t border-gray-200">
                                            <div className="space-y-0.5">
                                              {order.items.map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-1 text-xs text-gray-600">
                                                  <span className="w-4 text-center text-gray-400">{item.quantity}x</span>
                                                  <span className="truncate">{item.productName}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex gap-1.5 items-center ml-auto">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 text-xs px-2"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            // Print shipping label
                                            playSound('success');
                                          }}
                                        >
                                          <Printer className="h-3 w-3 mr-1" />
                                          Label
                                        </Button>
                                        <Button
                                          size="sm"
                                          className="h-7 text-xs px-2 bg-green-600 hover:bg-green-700"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            markAsShipped(order);
                                          }}
                                        >
                                          <Truck className="h-3 w-3 mr-1" />
                                          Ship
                                        </Button>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button 
                                              variant="ghost" 
                                              size="sm" 
                                              className="h-7 w-7 p-0"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <MoreVertical className="h-3.5 w-3.5" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            {order.modifiedAfterPacking && (
                                              <DropdownMenuItem 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleRepack(order);
                                                }}
                                                className="text-amber-600 font-medium text-xs"
                                              >
                                                <Package className="h-3 w-3 mr-1.5" />
                                                Repack Order
                                              </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                returnToPacking(order);
                                              }}
                                              className="text-xs"
                                            >
                                              <RotateCcw className="h-3 w-3 mr-1.5" />
                                              Return to Packing
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setOrderToSendToPending(order);
                                              }}
                                              className="text-xs"
                                            >
                                              <RotateCcw className="h-3 w-3 mr-1.5" />
                                              Send Back to Pending
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setOrderToHold(order);
                                              }}
                                              className="text-xs"
                                            >
                                              <Pause className="h-3 w-3 mr-1.5" />
                                              Put On Hold
                                            </DropdownMenuItem>
                                            <DropdownMenuItem 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setOrderToCancel(order);
                                              }}
                                              className="text-red-600 text-xs"
                                            >
                                              <XCircle className="h-3 w-3 mr-1.5" />
                                              Cancel Order
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                              </div>
                            </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Enhanced Order Preview Dialog with Pricing */}
      <Dialog open={!!previewOrder} onOpenChange={() => setPreviewOrder(null)}>
        <DialogContent className="w-[92vw] max-w-3xl sm:w-full max-h-[80vh] sm:max-h-[90vh] mx-auto flex flex-col p-2 sm:p-6">
          <DialogHeader className="flex-shrink-0 pb-1 sm:pb-2">
            <DialogTitle className="text-xs sm:text-lg">{previewOrder?.orderId} - Order Details</DialogTitle>
            <DialogDescription className="text-[9px] sm:text-sm">
              {previewOrder && getOrderStatusDisplay(previewOrder).label} • {previewOrder?.totalItems} items • {previewOrder?.shippingMethod}
            </DialogDescription>
          </DialogHeader>
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {/* Shipping Information */}
            <div className="space-y-2 sm:space-y-4 mt-2 sm:mt-4">
              <div className="bg-blue-50 p-2 sm:p-4 rounded-lg">
                <h3 className="font-semibold text-xs sm:text-sm mb-2 sm:mb-3 flex items-center gap-2">
                  <User className="h-3 sm:h-4 w-3 sm:w-4" />
                  Customer Information
                </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <p className="font-medium">{previewOrder?.customerName}</p>
                </div>
                <div>
                  <span className="text-gray-600">Order ID:</span>
                  <p className="font-medium">{previewOrder?.orderId}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-2 sm:p-4 rounded-lg">
              <h3 className="font-semibold text-xs sm:text-sm mb-2 sm:mb-3 flex items-center gap-2">
                <MapPin className="h-3 sm:h-4 w-3 sm:w-4" />
                Shipping Address
              </h3>
              <div className="text-xs sm:text-sm space-y-2">
                <p className="font-medium text-gray-900 break-words">
                  {previewOrder?.shippingAddress || 'No address provided'}
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <Truck className="h-3 sm:h-4 w-3 sm:w-4 text-gray-500" />
                    <span className="text-gray-600">Method:</span>
                    <span className="font-medium">{previewOrder?.shippingMethod}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-3 sm:h-4 w-3 sm:w-4 text-gray-500" />
                    <span className="text-gray-600">Priority:</span>
                    <span className={`font-medium capitalize ${
                      previewOrder?.priority === 'high' ? 'text-red-600' :
                      previewOrder?.priority === 'medium' ? 'text-yellow-600' :
                      'text-gray-600'
                    }`}>
                      {previewOrder?.priority}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items with Pricing for Pickup/Personal Delivery */}
            <div>
              <h3 className="font-semibold text-xs sm:text-sm mb-2 sm:mb-3 flex items-center gap-2">
                <Package className="h-3 sm:h-4 w-3 sm:w-4" />
                Order Items ({previewOrder?.totalItems})
              </h3>
              <div className="space-y-2">
                {previewOrder?.items.map((item, index) => {
                  // Check if this is a Personal Delivery or Pickup order based on the same logic used in Ready tab
                  const orderId = previewOrder?.orderId?.toLowerCase() || '';
                  const notes = previewOrder?.notes?.toLowerCase() || '';
                  const method = previewOrder?.shippingMethod?.toLowerCase() || '';
                  
                  const isPersonalDelivery = orderId.includes('-pd') || 
                                           notes.includes('personal') ||
                                           method.includes('personal') || method.includes('hand deliver');
                  
                  const isPickup = orderId.includes('-pu') || 
                                 notes.includes('pickup') ||
                                 method.includes('pickup') || method.includes('collect');
                  
                  const showPricing = isPersonalDelivery || isPickup;
                  return (
                    <div key={item.id || index} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg bg-gray-50">
                      {item.image && (
                        <img 
                          src={item.image} 
                          alt={item.productName}
                          className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded flex-shrink-0 bg-slate-50 border border-slate-200"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs sm:text-sm truncate">{item.productName}</div>
                        <div className="text-[10px] sm:text-xs text-gray-500">
                          SKU: {item.sku} {item.barcode && `• ${item.barcode}`}
                        </div>
                        {item.warehouseLocation && (
                          <div className="text-[10px] sm:text-xs text-blue-600 mt-1">
                            📍 {item.warehouseLocation}
                          </div>
                        )}
                        {showPricing && (
                          <div className="text-[10px] sm:text-xs text-green-600 mt-1 font-medium">
                            {(item as any).price ? 
                              `Unit Price: ${previewOrder?.currency || '$'}${Number((item as any).price).toFixed(2)}` :
                              'Unit Price: Not set'
                            }
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs sm:text-sm font-semibold">Qty: {item.quantity}</div>
                        {showPricing && (
                          <div className="text-xs sm:text-sm font-medium text-green-700">
                            {(item as any).price ? 
                              `${previewOrder?.currency || '$'}${(Number((item as any).price) * item.quantity).toFixed(2)}` :
                              'Price: Not set'
                            }
                          </div>
                        )}
                        <div className="text-[10px] sm:text-xs text-green-600">
                          {item.pickedQuantity === item.quantity ? '✓ Picked' : 
                           previewOrder?.packStatus === 'completed' ? '✓ Packed' : 
                           '⏳ Pending'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Order Total for Pickup/Personal Delivery */}
              {(() => {
                const orderId = previewOrder?.orderId?.toLowerCase() || '';
                const notes = previewOrder?.notes?.toLowerCase() || '';
                const method = previewOrder?.shippingMethod?.toLowerCase() || '';
                
                const isPersonalDelivery = orderId.includes('-pd') || 
                                         notes.includes('personal') ||
                                         method.includes('personal') || method.includes('hand deliver');
                
                const isPickup = orderId.includes('-pu') || 
                               notes.includes('pickup') ||
                               method.includes('pickup') || method.includes('collect');
                
                return (isPersonalDelivery || isPickup);
              })() && (
                <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base font-semibold text-indigo-900">Order Total:</span>
                    <span className="text-base sm:text-lg font-bold text-indigo-900">
                      {(() => {
                        const total = previewOrder?.items.reduce((total, item) => {
                          return total + ((Number((item as any).price) || 0) * item.quantity);
                        }, 0) || 0;
                        const hasAnyPrices = previewOrder?.items.some(item => (item as any).price);
                        
                        if (!hasAnyPrices) {
                          return 'Prices not set';
                        }
                        return `${previewOrder?.currency || '$'}${total.toFixed(2)}`;
                      })()}
                    </span>
                  </div>
                  {(previewOrder as any)?.paymentStatus && (
                    <div className="mt-2 text-xs sm:text-sm text-indigo-700">
                      Payment Status: <span className="font-medium capitalize">{(previewOrder as any).paymentStatus}</span>
                    </div>
                  )}
                  <div className="mt-2 text-xs text-indigo-600">
                    This pricing section appears for Personal Delivery and Pickup orders
                  </div>
                </div>
              )}
            </div>

            {/* Processing Information */}
            <div className="bg-gray-50 p-2 sm:p-4 rounded-lg">
              <h3 className="font-semibold text-xs sm:text-sm mb-2 sm:mb-3 flex items-center gap-2">
                <Clock className="h-3 sm:h-4 w-3 sm:w-4" />
                Processing Information
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                <div>
                  <span className="text-gray-600">Picked by:</span>
                  <p className="font-medium">{previewOrder?.pickedBy || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Packed by:</span>
                  <p className="font-medium">{previewOrder?.packedBy || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Pick Time:</span>
                  <p className="font-medium">
                    {previewOrder?.pickEndTime 
                      ? new Date(previewOrder.pickEndTime).toLocaleString()
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Pack Time:</span>
                  <p className="font-medium">
                    {previewOrder?.packEndTime 
                      ? new Date(previewOrder.packEndTime).toLocaleString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

              {/* Notes */}
              {previewOrder?.notes && (
                <div className="bg-yellow-50 p-2 sm:p-4 rounded-lg">
                  <h3 className="font-semibold text-xs sm:text-sm mb-2 flex items-center gap-2">
                    <FileText className="h-3 sm:h-4 w-3 sm:w-4" />
                    Order Notes
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-700">{previewOrder.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Action Buttons Based on Order Status */}
          <div className="flex flex-row justify-between gap-1 sm:justify-end sm:gap-3 mt-2 sm:mt-6 pt-2 sm:pt-4 border-t flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewOrder(null)}
              className="sm:hidden text-[10px] px-2 py-1 h-7"
            >
              Close
            </Button>
            
            {/* Go to Order Details Button */}
            <Link href={`/orders/${previewOrder?.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="text-[10px] sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-7 sm:h-9"
              >
                <FileText className="h-3 sm:h-4 w-3 sm:w-4 mr-0.5 sm:mr-2" />
                <span className="hidden sm:inline">View Full Details</span>
                <span className="sm:hidden">Details</span>
              </Button>
            </Link>
            
            {/* Show Print Label button for ready orders */}
            {previewOrder?.packStatus === 'completed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Print shipping label
                  playSound('success');
                  toast({
                    title: "Printing Label",
                    description: `Shipping label for ${previewOrder?.orderId}`,
                  });
                }}
                className="text-[10px] sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-7 sm:h-9"
              >
                <Printer className="h-3 sm:h-4 w-3 sm:w-4 mr-0.5 sm:mr-2" />
                <span className="hidden sm:inline">Print Label</span>
                <span className="sm:hidden">Print</span>
              </Button>
            )}
            
            {/* Show different primary action buttons based on order status */}
            {previewOrder?.packStatus === 'not_started' && (
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-[10px] sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-7 sm:h-9"
                onClick={() => {
                  if (previewOrder) {
                    startPicking(previewOrder);
                    setPreviewOrder(null);
                  }
                }}
              >
                <PlayCircle className="h-3 sm:h-4 w-3 sm:w-4 mr-0.5 sm:mr-2" />
                <span className="hidden sm:inline">Start Picking</span>
                <span className="sm:hidden">Pick</span>
              </Button>
            )}
            
            {previewOrder?.pickStatus === 'in_progress' && (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-[10px] sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-7 sm:h-9"
                onClick={() => {
                  if (previewOrder) {
                    setActivePickingOrder(previewOrder);
                    setSelectedTab('picking');
                    const firstUnpickedIndex = previewOrder.items.findIndex(item => item.pickedQuantity < item.quantity);
                    setManualItemIndex(firstUnpickedIndex >= 0 ? firstUnpickedIndex : 0);
                    setIsTimerRunning(true);
                    setPreviewOrder(null);
                    playSound('success');
                  }
                }}
              >
                <PlayCircle className="h-3 sm:h-4 w-3 sm:w-4 mr-0.5 sm:mr-2" />
                <span className="hidden sm:inline">Resume Picking</span>
                <span className="sm:hidden">Resume</span>
              </Button>
            )}
            
            {previewOrder?.packStatus === 'in_progress' && (
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-[10px] sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-7 sm:h-9"
                onClick={() => {
                  if (previewOrder) {
                    startPacking(previewOrder);
                    setPreviewOrder(null);
                  }
                }}
              >
                <Box className="h-3 sm:h-4 w-3 sm:w-4 mr-0.5 sm:mr-2" />
                <span className="hidden sm:inline">Start Packing</span>
                <span className="sm:hidden">Pack</span>
              </Button>
            )}
            
            {previewOrder?.packStatus === 'completed' && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-[10px] sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-7 sm:h-9"
                onClick={() => {
                  if (previewOrder) {
                    markAsShipped(previewOrder);
                    setPreviewOrder(null);
                  }
                }}
              >
                <Truck className="h-3 sm:h-4 w-3 sm:w-4 mr-0.5 sm:mr-2" />
                <span className="hidden sm:inline">Mark as Shipped</span>
                <span className="sm:hidden">Ship</span>
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={() => setPreviewOrder(null)}
              className="hidden sm:block"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ship All Confirmation Dialog */}
      <Dialog open={showShipAllConfirm} onOpenChange={setShowShipAllConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Shipment</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark all {getOrdersByStatus('ready').length} orders as shipped?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowShipAllConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={shipAllOrders}
            >
              <Truck className="h-4 w-4 mr-2" />
              Confirm Shipment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Order Confirmation Dialog */}
      <Dialog open={showResetOrderDialog} onOpenChange={setShowResetOrderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to reset this order? All picked quantities will be cleared and you'll start from the beginning.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowResetOrderDialog(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={resetOrder}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Put On Hold Confirmation Dialog */}
      <Dialog open={!!orderToHold} onOpenChange={() => setOrderToHold(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Put Order On Hold</DialogTitle>
            <DialogDescription>
              Are you sure you want to put order {orderToHold?.orderId} on hold? The order will be paused and can be resumed later.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setOrderToHold(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-yellow-600 hover:bg-yellow-700"
              onClick={() => orderToHold && handlePutOnHold(orderToHold)}
            >
              <Pause className="h-4 w-4 mr-2" />
              Put On Hold
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Confirmation Dialog */}
      <Dialog open={!!orderToCancel} onOpenChange={() => setOrderToCancel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel order {orderToCancel?.orderId}? This action will mark the order as cancelled.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setOrderToCancel(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => orderToCancel && handleCancelOrder(orderToCancel)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Back to Pending Confirmation Dialog */}
      <Dialog open={!!orderToSendToPending} onOpenChange={() => setOrderToSendToPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Back to Pending</DialogTitle>
            <DialogDescription>
              Are you sure you want to send order {orderToSendToPending?.orderId} back to Pending? All picking and packing progress will be reset.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setOrderToSendToPending(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => orderToSendToPending && handleSendToPending(orderToSendToPending)}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Send to Pending
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Undo Bar - Fixed at bottom */}
      {showUndoPopup && pendingShipments && (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 border-t border-gray-700">
            <div className="max-w-7xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400 animate-pulse" />
                    <span className="text-white font-medium">{pendingShipments.description}</span>
                  </div>
                  <div className="h-4 w-px bg-gray-600" />
                  <span className="text-gray-400 text-sm">
                    Processing in background...
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-300 text-sm font-mono">
                      {Math.max(0, undoTimeLeft)}s
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={undoShipment}
                    className="bg-white/10 hover:bg-white/20 text-white border-0"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Undo
                  </Button>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-blue-400 transition-all duration-1000 ease-linear"
                  style={{ width: `${(undoTimeLeft / 15) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}