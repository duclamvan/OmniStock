import { useState, useEffect, useRef, Fragment, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Warehouse, 
  Package, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  Plus,
  Minus, 
  X, 
  Star, 
  MapPin,
  ArrowLeft,
  Save,
  Layers,
  Info,
  Loader2,
  Check,
  Clock,
  FileText,
  Ship,
  Hash,
  ChevronRight,
  Calendar,
  User,
  Truck,
  ScanLine,
  ArrowUp,
  ArrowDown,
  Navigation,
  PackageCheck,
  Boxes,
  Eye,
  ArrowRight,
  Plane,
  Train,
  Zap,
  TrendingUp,
  Calculator,
  DollarSign
} from "lucide-react";
import { ScanFeedback } from "@/components/ScanFeedback";
import WarehouseLocationSelector from "@/components/WarehouseLocationSelector";
import { soundEffects } from "@/utils/soundEffects";
import { validateLocationCode } from "@/lib/warehouseHelpers";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { nanoid } from "nanoid";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, convertCurrency, type Currency } from "@/lib/currencyUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LocationAssignment {
  id: string;
  locationCode: string;
  locationType: 'display' | 'warehouse' | 'pallet' | 'other';
  quantity: number;
  isPrimary: boolean;
  notes?: string;
  isNew?: boolean;
}

interface StorageItem {
  receiptItemId: number;
  productId?: string;
  productName: string;
  sku?: string;
  barcode?: string;
  receivedQuantity: number;
  assignedQuantity: number;
  existingLocations: LocationAssignment[];
  newLocations: LocationAssignment[];
  receiptId?: number;
  shipmentTrackingNumber?: string;
  receivedAt?: string;
  imageUrl?: string;
  description?: string;
  landingCostUnitBase?: string;
  hasCompleteLandingCost?: boolean;
  purchaseItemId?: number;
}

interface ReceiptWithItems {
  receipt: any;
  shipment: any;
  items: any[];
}

// Helper function to get suggested location for an item
function getSuggestedLocation(item: StorageItem): string | null {
  if (item.existingLocations && item.existingLocations.length > 0) {
    // First try to find primary location
    const primaryLoc = item.existingLocations.find(loc => loc.isPrimary);
    if (primaryLoc) return primaryLoc.locationCode;

    // Otherwise use location with highest quantity
    const sortedByQty = [...item.existingLocations].sort((a, b) => b.quantity - a.quantity);
    if (sortedByQty.length > 0) return sortedByQty[0].locationCode;
  }
  return null;
}

// Helper function to get shipment type icon
const getShipmentTypeIcon = (shipmentType: string, className = "h-3.5 w-3.5") => {
  const isSensitive = shipmentType?.includes('sensitive');

  if (shipmentType?.includes('express')) {
    const iconColor = isSensitive ? 'text-orange-500' : 'text-red-500';
    return <Zap className={`${className} ${iconColor}`} />;
  } else if (shipmentType?.includes('air')) {
    const iconColor = isSensitive ? 'text-blue-600' : 'text-blue-500';
    return <Plane className={`${className} ${iconColor}`} />;
  } else if (shipmentType?.includes('railway') || shipmentType?.includes('rail')) {
    const iconColor = isSensitive ? 'text-purple-600' : 'text-purple-500';
    return <Train className={`${className} ${iconColor}`} />;
  } else if (shipmentType?.includes('sea')) {
    const iconColor = isSensitive ? 'text-indigo-600' : 'text-amber-700';
    return <Ship className={`${className} ${iconColor}`} />;
  }
  return <Package className={`${className} text-muted-foreground`} />;
};

// Helper function to format shipment type
const formatShipmentType = (shipmentType: string) => {
  if (!shipmentType) return '';

  const isSensitive = shipmentType.includes('sensitive');
  const baseType = shipmentType.replace('_sensitive', '_general');

  const typeMap: { [key: string]: string } = {
    'air_ddp_general': 'Air DDP',
    'express_general': 'Express',
    'railway_general': 'Railway',
    'sea_general': 'Sea Freight'
  };

  const label = typeMap[baseType] || shipmentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return isSensitive ? `${label} (S)` : label;
};

// Pricing Table Row Component (separate to avoid useState in map)
function PricingTableRow({ item, index, qty, unitCost, shippingCost, landingCost, defaultRetailPrice, defaultMargin, currency, displayCurrency }: {
  item: any;
  index: number;
  qty: number;
  unitCost: number;
  shippingCost: number;
  landingCost: number;
  defaultRetailPrice: number;
  defaultMargin: number;
  currency: string;
  displayCurrency: 'EUR' | 'CZK';
}) {
  // Safe retail price with fallback to 0 if invalid
  const safeRetailPrice = !isNaN(defaultRetailPrice) && isFinite(defaultRetailPrice) ? defaultRetailPrice : 0;
  const [retailPrice, setRetailPrice] = useState(safeRetailPrice);
  const margin = retailPrice > 0 ? ((retailPrice - landingCost) / retailPrice * 100) : 0;
  
  // Convert landing cost and retail price to display currency
  const landingCostConverted = convertCurrency(landingCost, currency as Currency, displayCurrency);
  const retailPriceConverted = convertCurrency(retailPrice, currency as Currency, displayCurrency);

  return (
    <TableRow className="text-sm">
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {item.imageUrl ? (
            <img 
              src={item.imageUrl} 
              alt={item.productName}
              className="w-10 h-10 rounded object-contain border bg-slate-50"
            />
          ) : (
            <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
              <Package className="h-5 w-5 text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-medium">{item.productName || `Item ${index + 1}`}</p>
            {item.sku && (
              <p className="text-[10px] text-muted-foreground font-mono">{item.sku}</p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-center font-mono text-xs">{qty}</TableCell>
      <TableCell className="text-right font-mono text-xs">
        {formatCurrency(unitCost, currency)}
      </TableCell>
      <TableCell className="text-right font-mono text-xs text-blue-600">
        {formatCurrency(shippingCost, currency)}
      </TableCell>
      <TableCell className="text-right font-semibold font-mono text-xs">
        {formatCurrency(landingCost, currency)}
      </TableCell>
      <TableCell className="text-right font-mono text-xs text-amber-700 dark:text-amber-400">
        {displayCurrency === 'EUR' ? `€${landingCostConverted.toFixed(2)}` : `${landingCostConverted.toFixed(0)} Kč`}
      </TableCell>
      <TableCell className="text-right">
        <Input
          type="number"
          step="0.01"
          defaultValue={safeRetailPrice.toFixed(2)}
          onChange={(e) => setRetailPrice(parseFloat(e.target.value) || 0)}
          className="h-7 text-right font-mono text-xs w-24 ml-auto"
          data-testid={`input-retail-price-${index}`}
        />
      </TableCell>
      <TableCell className="text-right font-mono text-xs text-amber-700 dark:text-amber-400">
        {displayCurrency === 'EUR' ? `€${retailPriceConverted.toFixed(2)}` : `${retailPriceConverted.toFixed(0)} Kč`}
      </TableCell>
    </TableRow>
  );
}

// Mobile Pricing Card Component for small screens
function PricingMobileCard({ item, index, qty, unitCost, shippingCost, landingCost, defaultRetailPrice, defaultMargin, currency, displayCurrency }: {
  item: any;
  index: number;
  qty: number;
  unitCost: number;
  shippingCost: number;
  landingCost: number;
  defaultRetailPrice: number;
  defaultMargin: number;
  currency: string;
  displayCurrency: 'EUR' | 'CZK';
}) {
  const safeRetailPrice = !isNaN(defaultRetailPrice) && isFinite(defaultRetailPrice) ? defaultRetailPrice : 0;
  const [retailPrice, setRetailPrice] = useState(safeRetailPrice);
  const landingCostConverted = convertCurrency(landingCost, currency as Currency, displayCurrency);
  const retailPriceConverted = convertCurrency(retailPrice, currency as Currency, displayCurrency);

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        {/* Header with image and name */}
        <div className="flex items-center gap-3 mb-3">
          {item.imageUrl ? (
            <img 
              src={item.imageUrl} 
              alt={item.productName}
              className="w-16 h-16 rounded object-contain border bg-slate-50 shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded bg-gray-100 flex items-center justify-center shrink-0">
              <Package className="h-6 w-6 text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm mb-1">{item.productName || `Item ${index + 1}`}</p>
            {item.sku && (
              <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
            )}
            <Badge variant="outline" className="mt-1">Qty: {qty}</Badge>
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Unit Cost</p>
            <p className="font-mono font-medium">{formatCurrency(unitCost, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Shipping</p>
            <p className="font-mono font-medium text-blue-600">{formatCurrency(shippingCost, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Landing Cost</p>
            <p className="font-mono font-semibold">{formatCurrency(landingCost, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Landing ({displayCurrency})</p>
            <p className="font-mono font-semibold text-amber-700 dark:text-amber-400">
              {displayCurrency === 'EUR' ? `€${landingCostConverted.toFixed(2)}` : `${landingCostConverted.toFixed(0)} Kč`}
            </p>
          </div>
        </div>

        {/* Retail Price Input */}
        <div className="mt-3 pt-3 border-t">
          <Label htmlFor={`retail-price-mobile-${index}`} className="text-xs text-muted-foreground mb-2 block">
            Set Retail Price
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id={`retail-price-mobile-${index}`}
              type="number"
              step="0.01"
              defaultValue={safeRetailPrice.toFixed(2)}
              onChange={(e) => setRetailPrice(parseFloat(e.target.value) || 0)}
              className="h-11 text-right font-mono"
              data-testid={`input-retail-price-mobile-${index}`}
            />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Retail ({displayCurrency})</p>
              <p className="font-mono font-semibold text-amber-700 dark:text-amber-400 mt-1">
                {displayCurrency === 'EUR' ? `€${retailPriceConverted.toFixed(2)}` : `${retailPriceConverted.toFixed(0)} Kč`}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Generate suggested location using AI or fallback to smart heuristics
function generateSuggestedLocationWithAI(item: StorageItem, aiSuggestions: Map<string | number, { location: string; reasoning: string; zone: string; accessibility: string }>): string {
  // Try AI suggestion first
  const key = item.productId || item.sku || item.productName;
  if (aiSuggestions.has(key)) {
    return aiSuggestions.get(key)!.location;
  }
  
  // Fallback to heuristic-based suggestion
  const seed = item.productId || item.sku || item.productName || 'default';
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const productNameLower = item.productName?.toLowerCase() || '';
  
  // Smart aisle assignment based on product type (using A01-A30 range)
  // Different aisles for different product categories within shelves storage
  let aisleNumber = (hash % 6) + 1; // Default: A01-A06
  
  if (productNameLower.includes('mask') || productNameLower.includes('medical')) {
    aisleNumber = 20 + (hash % 3); // Medical: A20-A22
  } else if (productNameLower.includes('electronic') || productNameLower.includes('phone')) {
    aisleNumber = 15 + (hash % 3); // Electronics: A15-A17
  } else if (productNameLower.includes('clothing') || productNameLower.includes('shirt')) {
    aisleNumber = 10 + (hash % 3); // Clothing: A10-A12
  } else if (productNameLower.includes('food') || productNameLower.includes('snack')) {
    aisleNumber = 25 + (hash % 3); // Food: A25-A27
  } else if (productNameLower.includes('toy') || productNameLower.includes('game')) {
    aisleNumber = 5 + (hash % 3); // Toys: A05-A07
  } else if (productNameLower.includes('book') || productNameLower.includes('paper')) {
    aisleNumber = 28 + (hash % 2); // Books/Paper: A28-A29
  }
  
  // Generate location components
  const aisle = `A${String(aisleNumber).padStart(2, '0')}`;
  const rack = `R${String((hash % 8) + 1).padStart(2, '0')}`;
  const level = `L${String((hash % 4) + 1).padStart(2, '0')}`;
  const bin = `B${(hash % 5) + 1}`;
  
  // Always use shelf format with A prefix for auto-detection
  return `WH1-${aisle}-${rack}-${level}-${bin}`;
}

// Helper to get AI suggestion reasoning
function getAIReasoning(item: StorageItem, aiSuggestions: Map<string | number, { location: string; reasoning: string; zone: string; accessibility: string }>): string | null {
  const key = item.productId || item.sku || item.productName;
  return aiSuggestions.has(key) ? aiSuggestions.get(key)!.reasoning : null;
}

export default function ItemsToStore() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  // State
  const [items, setItems] = useState<StorageItem[]>([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error' | 'duplicate' | null; message: string }>({ type: null, message: '' });
  const [locationScan, setLocationScan] = useState("");
  const [locationCode, setLocationCode] = useState(""); // Current location code from WarehouseLocationSelector
  const [quantityScan, setQuantityScan] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<number | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [isScanning, setIsScanning] = useState(false);
  const [scanningProgress, setScanningProgress] = useState({ current: 0, total: 0 });
  const [lastScanResult, setLastScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sessionsLocations, setSessionsLocations] = useState<{code: string; isPrimary: boolean; quantity: number}[]>([]);
  const [scanBuffer, setScanBuffer] = useState("");
  const [showPricingSheet, setShowPricingSheet] = useState(false);
  const [pricingReceiptId, setPricingReceiptId] = useState<number | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<'EUR' | 'CZK'>('EUR');
  const [allocationMethod, setAllocationMethod] = useState<'AUTO' | 'WEIGHT' | 'VALUE' | 'UNITS' | 'HYBRID'>('AUTO');
  const [aiSuggestions, setAiSuggestions] = useState<Map<string | number, { location: string; reasoning: string; zone: string; accessibility: string }>>(new Map());

  // Refs
  const locationInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const quickScanTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized callbacks to prevent unnecessary re-renders
  const handleLocationCodeChange = useCallback((code: string) => {
    setLocationCode(code);
  }, []);

  // Fetch all items pending storage
  const { data: storageData, isLoading } = useQuery<any>({
    queryKey: ['/api/imports/receipts/storage'],
  });

  // Filter receipts to only include those with items
  const receiptsWithItems = storageData?.receipts?.filter((receiptData: ReceiptWithItems) => 
    receiptData.items && receiptData.items.length > 0
  ) || [];

  // Get shipment ID from pricing receipt
  const selectedReceiptData = receiptsWithItems.find((r: ReceiptWithItems) => r.receipt.id === pricingReceiptId);
  const shipmentIdForPreview = selectedReceiptData?.shipment?.id;

  // Fetch landing cost preview based on selected allocation method
  const { data: landingCostPreview, isLoading: isLoadingPreview } = useQuery<any>({
    queryKey: ['/api/imports/shipments', shipmentIdForPreview, 'landing-cost-preview', allocationMethod],
    enabled: !!shipmentIdForPreview && showPricingSheet,
    queryFn: async () => {
      // For AUTO method, use the default preview endpoint
      if (allocationMethod === 'AUTO') {
        return apiRequest('GET', `/api/imports/shipments/${shipmentIdForPreview}/landing-cost-preview`);
      }
      // For specific methods, use the method-specific endpoint
      return apiRequest('GET', `/api/imports/shipments/${shipmentIdForPreview}/landing-cost-preview/${allocationMethod}`);
    }
  });

  // Initialize items from receipt data
  useEffect(() => {
    if (receiptsWithItems.length > 0) {
      const allItems: StorageItem[] = [];

      receiptsWithItems.forEach((receiptData: ReceiptWithItems) => {
        receiptData.items.forEach((item: any) => {
          allItems.push({
            receiptItemId: item.id,
            productId: item.productId,
            productName: item.productName || item.description || `Item #${item.itemId}`,
            sku: item.sku,
            barcode: item.barcode,
            receivedQuantity: item.receivedQuantity || 0,
            assignedQuantity: 0,
            existingLocations: item.existingLocations || [],
            newLocations: [],
            receiptId: receiptData.receipt.id,
            shipmentTrackingNumber: receiptData.shipment?.trackingNumber,
            receivedAt: receiptData.receipt.receivedAt,
            imageUrl: item.imageUrl,
            description: item.description,
            landingCostUnitBase: item.landingCostUnitBase,
            hasCompleteLandingCost: item.hasCompleteLandingCost,
            purchaseItemId: item.purchaseItemId
          });
        });
      });

      // Try to restore saved location assignments from localStorage
      try {
        const savedAssignments = localStorage.getItem('itemsToStore_assignments');
        if (savedAssignments) {
          const assignments = JSON.parse(savedAssignments);
          
          // Merge saved location assignments back into items
          allItems.forEach(item => {
            const savedItem = assignments.find((a: any) => 
              a.receiptItemId === item.receiptItemId && a.receiptId === item.receiptId
            );
            if (savedItem && savedItem.newLocations) {
              item.newLocations = savedItem.newLocations;
              item.assignedQuantity = savedItem.newLocations.reduce((sum: number, loc: LocationAssignment) => sum + loc.quantity, 0);
            }
          });
        }
        
        // Restore selected item index
        const savedIndex = localStorage.getItem('itemsToStore_selectedItemIndex');
        if (savedIndex) {
          setSelectedItemIndex(parseInt(savedIndex));
        }
        
        // Restore active tab
        const savedTab = localStorage.getItem('itemsToStore_activeTab');
        if (savedTab && (savedTab === 'pending' || savedTab === 'completed')) {
          setActiveTab(savedTab);
        }
      } catch (error) {
        console.error('Failed to restore location assignments from localStorage:', error);
        // Clean up corrupted data
        localStorage.removeItem('itemsToStore_assignments');
        localStorage.removeItem('itemsToStore_selectedReceipt');
        localStorage.removeItem('itemsToStore_selectedItemIndex');
        localStorage.removeItem('itemsToStore_activeTab');
      }

      setItems(allItems);
    }
  }, [receiptsWithItems.length]);

  // Separate effect for sessionStorage handoff - runs when data becomes available
  useEffect(() => {
    // Only run when we have data and no receipt is selected yet
    if (!receiptsWithItems || receiptsWithItems.length === 0 || selectedReceipt) {
      return;
    }

    // Priority 1: Auto-select receipt based on sessionStorage (from Complete Receiving flow)
    const autoSelectShipmentId = sessionStorage.getItem('autoSelectShipmentId');
    if (autoSelectShipmentId) {
      const targetShipmentId = parseInt(autoSelectShipmentId);
      const matchingReceipt = receiptsWithItems.find((r: ReceiptWithItems) => 
        r.shipment?.id === targetShipmentId
      );
      if (matchingReceipt) {
        setSelectedReceipt(matchingReceipt.receipt.id);
        // Save to localStorage for persistence
        localStorage.setItem('itemsToStore_selectedReceipt', matchingReceipt.receipt.id.toString());
        // Clear sessionStorage after successful selection
        sessionStorage.removeItem('autoSelectShipmentId');
        return;
      }
    }

    // Priority 2: Restore from localStorage
    const savedReceipt = localStorage.getItem('itemsToStore_selectedReceipt');
    if (savedReceipt) {
      const receiptId = parseInt(savedReceipt);
      if (receiptsWithItems.some((r: ReceiptWithItems) => r.receipt.id === receiptId)) {
        setSelectedReceipt(receiptId);
        return;
      }
    }

    // Priority 3: Auto-select first receipt if nothing was restored or matched
    setSelectedReceipt(receiptsWithItems[0].receipt.id);
  }, [receiptsWithItems, selectedReceipt]);

  // Fetch AI location suggestions for items without existing locations
  useEffect(() => {
    const fetchAISuggestions = async () => {
      // Only fetch for items without existing locations
      const itemsNeedingSuggestions = items.filter(item => 
        item.existingLocations.length === 0 && 
        !aiSuggestions.has(item.productId || item.sku || item.productName)
      );

      if (itemsNeedingSuggestions.length === 0) return;

      // Fetch AI suggestions in parallel (limit to 3 concurrent requests to avoid API rate limits)
      const batchSize = 3;
      for (let i = 0; i < itemsNeedingSuggestions.length; i += batchSize) {
        const batch = itemsNeedingSuggestions.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (item) => {
            try {
              const response = await fetch('/api/imports/suggest-storage-location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  productId: item.productId,
                  productName: item.productName,
                  category: item.description || ''
                })
              });

              if (response.ok) {
                const data = await response.json();
                setAiSuggestions(prev => {
                  const newMap = new Map(prev);
                  const key = item.productId || item.sku || item.productName;
                  newMap.set(key, {
                    location: data.suggestedLocation,
                    reasoning: data.reasoning,
                    zone: data.zone,
                    accessibility: data.accessibility
                  });
                  return newMap;
                });
              }
            } catch (error) {
              console.error(`Failed to fetch AI suggestion for ${item.productName}:`, error);
            }
          })
        );

        // Small delay between batches to be respectful of API
        if (i + batchSize < itemsNeedingSuggestions.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    };

    if (items.length > 0) {
      fetchAISuggestions();
    }
  }, [items.length]); // Only run when items length changes

  // Save location assignments to localStorage whenever items change
  useEffect(() => {
    if (items.length > 0) {
      try {
        // Only save items that have location assignments to reduce storage size
        const itemsWithAssignments = items
          .filter(item => item.newLocations.length > 0)
          .map(item => ({
            receiptItemId: item.receiptItemId,
            receiptId: item.receiptId,
            newLocations: item.newLocations
          }));
        
        if (itemsWithAssignments.length > 0) {
          localStorage.setItem('itemsToStore_assignments', JSON.stringify(itemsWithAssignments));
        } else {
          // Clear if no assignments
          localStorage.removeItem('itemsToStore_assignments');
        }
      } catch (error) {
        console.error('Failed to save location assignments to localStorage:', error);
      }
    }
  }, [items]);

  // Save selected receipt to localStorage
  useEffect(() => {
    if (selectedReceipt) {
      try {
        localStorage.setItem('itemsToStore_selectedReceipt', selectedReceipt.toString());
      } catch (error) {
        console.error('Failed to save selected receipt to localStorage:', error);
      }
    }
  }, [selectedReceipt]);

  // Save selected item index to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('itemsToStore_selectedItemIndex', selectedItemIndex.toString());
    } catch (error) {
      console.error('Failed to save selected item index to localStorage:', error);
    }
  }, [selectedItemIndex]);

  // Save active tab to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('itemsToStore_activeTab', activeTab);
    } catch (error) {
      console.error('Failed to save active tab to localStorage:', error);
    }
  }, [activeTab]);

  // Filter items by selected receipt and tab
  const filteredItems = selectedReceipt 
    ? items.filter(item => item.receiptId === selectedReceipt)
    : items;

  const displayItems = activeTab === 'pending'
    ? filteredItems.filter(item => item.newLocations.length === 0 && !item.existingLocations.length)
    : filteredItems.filter(item => item.newLocations.length > 0 || item.existingLocations.length > 0);

  const currentItem = displayItems[selectedItemIndex];
  const totalAssigned = currentItem ? 
    currentItem.newLocations.reduce((sum, loc) => sum + loc.quantity, 0) : 0;
  const remainingQuantity = currentItem ? 
    currentItem.receivedQuantity - totalAssigned : 0;

  // Auto-prefill suggested location when sheet opens
  useEffect(() => {
    if (showScanner && currentItem) {
      const suggestedLocation = getSuggestedLocation(currentItem) || generateSuggestedLocationWithAI(currentItem, aiSuggestions);
      if (suggestedLocation) {
        setLocationCode(suggestedLocation);
      }
    }
  }, [showScanner, currentItem, aiSuggestions]);

  // Calculate progress
  const totalItems = filteredItems.length;
  const completedItems = filteredItems.filter(item => 
    item.assignedQuantity >= item.receivedQuantity || item.newLocations.length > 0
  ).length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  // Handler for Quick Scan location processing
  const handleQuickScanLocation = async (code: string) => {
    if (!currentItem || !code) return;

    // Play success sound
    await soundEffects.playSuccessBeep();

    // Add location to current item using functional updates
    const newLocation: LocationAssignment = {
      id: nanoid(),
      locationCode: code.toUpperCase(),
      locationType: 'warehouse',
      quantity: currentItem.receivedQuantity - totalAssigned,
      isPrimary: currentItem.newLocations.length === 0,
      isNew: true
    };

    // Use functional update to avoid stale closures
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      const currentGlobalIndex = prevItems.findIndex(item => 
        item.receiptItemId === currentItem.receiptItemId && 
        item.receiptId === currentItem.receiptId
      );
      if (currentGlobalIndex >= 0) {
        updatedItems[currentGlobalIndex] = {
          ...updatedItems[currentGlobalIndex],
          newLocations: [...updatedItems[currentGlobalIndex].newLocations, newLocation]
        };
      }
      return updatedItems;
    });

    // Update last scan result
    setLastScanResult({
      success: true,
      message: `Location ${code} assigned to ${currentItem.productName}`
    });

    // Auto-progress to next item using functional state update
    setTimeout(() => {
      setSelectedItemIndex(prevIndex => {
        // Find next pending item from current position
        const currentFilteredItems = selectedReceipt 
          ? items.filter(item => item.receiptId === selectedReceipt)
          : items;

        const currentDisplayItems = activeTab === 'pending'
          ? currentFilteredItems.filter(item => item.newLocations.length === 0 && !item.existingLocations.length)
          : currentFilteredItems.filter(item => item.newLocations.length > 0 || item.existingLocations.length > 0);

        const nextIndex = currentDisplayItems.findIndex((item, idx) => 
          idx > prevIndex && item.newLocations.length === 0 && !item.existingLocations.length
        );

        if (nextIndex !== -1) {
          setScanningProgress(prev => ({ 
            ...prev, 
            current: prev.current + 1 
          }));
          return nextIndex;
        } else {
          // All items processed
          setIsScanning(false);
          toast({
            title: "✓ Scanning Complete",
            description: "All items have been assigned locations",
            duration: 3000,
          });
          return prevIndex;
        }
      });
    }, 1000);
  };

  // Handle barcode scanner input
  const handleScanInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScanBuffer(e.target.value);

    // Clear any existing timer
    if (quickScanTimerRef.current) {
      clearTimeout(quickScanTimerRef.current);
    }

    // Set timer to auto-process after a brief pause (barcode scanners send data quickly)
    quickScanTimerRef.current = setTimeout(() => {
      if (e.target.value.length >= 3) {
        handleQuickScanLocation(e.target.value);
        setScanBuffer("");
        // Refocus the hidden input
        scanInputRef.current?.focus();
      }
    }, 300);
  };

  // Handle keyboard completion for scanner
  const handleScanComplete = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && scanBuffer.length > 0) {
      e.preventDefault();
      // Clear timer to avoid duplicate processing
      if (quickScanTimerRef.current) {
        clearTimeout(quickScanTimerRef.current);
      }
      handleQuickScanLocation(scanBuffer);
      setScanBuffer("");
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsScanning(false);
      setLastScanResult(null);
      setScanBuffer("");
    }
  };

  // Effect to focus hidden input when scanning starts
  useEffect(() => {
    if (isScanning) {
      // Focus the hidden input after a small delay to ensure DOM is ready
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 100);

      // Play activation sound
      soundEffects.playSuccessBeep();
    }

    // Cleanup timer on unmount or when isScanning changes
    return () => {
      if (quickScanTimerRef.current) {
        clearTimeout(quickScanTimerRef.current);
      }
    };
  }, [isScanning]);

  // Add location to session only (doesn't modify parent state)
  const addLocationToSession = async (codeOverride?: string) => {
    // Use passed code, current locationCode state, or locationScan state
    let trimmedValue = (codeOverride || locationCode || locationScan).trim().toUpperCase();

    if (!trimmedValue) {
      toast({
        title: "No Location Entered",
        description: "Please enter or scan a location code",
        variant: "destructive",
        duration: 2000
      });
      return false;
    }

    // Validate location code format (supports new shelf, pallet, and legacy formats)
    if (!validateLocationCode(trimmedValue)) {
      await soundEffects.playErrorBeep();
      setScanFeedback({ type: 'error', message: 'Invalid location format' });
      setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
      toast({
        title: "Invalid Location",
        description: "Location must be in a valid format (e.g., WH1-A01-R02-L03, WH1-A-A06-R04-L04-B2, or WH1-B-B03-P05)",
        variant: "destructive",
        duration: 2000
      });
      return false;
    }

    // Check if location already in session
    if (sessionsLocations.some(loc => loc.code === trimmedValue)) {
      await soundEffects.playDuplicateBeep();
      setScanFeedback({ type: 'duplicate', message: `Already added: ${trimmedValue}` });
      setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
      return false;
    }

    // Check if location already assigned to this item
    if (currentItem?.newLocations.some(loc => loc.locationCode === trimmedValue) ||
        currentItem?.existingLocations.some(loc => loc.locationCode === trimmedValue)) {
      await soundEffects.playDuplicateBeep();
      setScanFeedback({ type: 'duplicate', message: `Location already assigned: ${trimmedValue}` });
      setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
      return false;
    }

    // Calculate remaining quantity accounting for session locations
    const sessionTotal = sessionsLocations.reduce((sum, loc) => sum + loc.quantity, 0);
    const availableForNewLocation = Math.max(0, remainingQuantity - sessionTotal);
    
    // Add to session (NOT to actual item yet)
    const isFirstLocation = sessionsLocations.length === 0 && 
                           currentItem?.newLocations.length === 0 && 
                           currentItem?.existingLocations.length === 0;
    
    setSessionsLocations(prev => [...prev, {
      code: trimmedValue,
      isPrimary: isFirstLocation,
      quantity: availableForNewLocation > 0 ? availableForNewLocation : 1 // At least 1 for the location
    }]);

    // Play success sound and show feedback
    await soundEffects.playSuccessBeep();
    setScanFeedback({ type: 'success', message: `Added: ${trimmedValue}` });
    setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);

    // Clear inputs for next entry
    setLocationScan("");
    setLocationCode("");

    return true;
  };

  // Apply all session locations when Done is clicked
  const applySessionLocations = () => {
    if (!currentItem || sessionsLocations.length === 0) return;

    const updatedItems = [...items];
    const globalIndex = items.findIndex(item => 
      item.receiptItemId === currentItem.receiptItemId && 
      item.receiptId === currentItem.receiptId
    );
    
    if (globalIndex < 0) return;

    // Create new locations from session
    sessionsLocations.forEach(sessionLoc => {
      // Determine location type based on prefix
      let locationType: LocationAssignment['locationType'] = 'warehouse';
      if (sessionLoc.code.startsWith('DS')) locationType = 'display';
      else if (sessionLoc.code.startsWith('PL')) locationType = 'pallet';

      const newLocation: LocationAssignment = {
        id: `new-${Date.now()}-${Math.random()}`,
        locationCode: sessionLoc.code,
        locationType,
        quantity: sessionLoc.quantity,
        isPrimary: sessionLoc.isPrimary,
        isNew: true
      };

      updatedItems[globalIndex].newLocations.push(newLocation);
    });

    // Update assigned quantity
    const totalAssigned = updatedItems[globalIndex].newLocations.reduce((sum, loc) => sum + loc.quantity, 0);
    updatedItems[globalIndex].assignedQuantity = totalAssigned;

    setItems(updatedItems);

    // Play completion sound if fully assigned
    if (totalAssigned >= currentItem.receivedQuantity) {
      soundEffects.playCompletionSound();
    }

    toast({
      title: "✓ Locations Applied",
      description: `${sessionsLocations.length} location${sessionsLocations.length > 1 ? 's' : ''} added successfully`,
      duration: 2000,
    });

    // Clear session and close
    setSessionsLocations([]);
    setShowScanner(false);

    // Auto-advance to next pending item (don't increment index since current item will be filtered out)
    if (totalAssigned >= currentItem.receivedQuantity) {
      setTimeout(() => {
        // After applying locations, the current item will be filtered out of pending tab
        // So we need to stay at the same index to see the next pending item
        // Or if there are no more pending items at current index or later, find the first available
        const updatedFilteredItems = selectedReceipt 
          ? updatedItems.filter(item => item.receiptId === selectedReceipt)
          : updatedItems;

        const updatedDisplayItems = activeTab === 'pending'
          ? updatedFilteredItems.filter(item => item.newLocations.length === 0 && !item.existingLocations.length)
          : updatedFilteredItems.filter(item => item.newLocations.length > 0 || item.existingLocations.length > 0);

        // If there are still items at the current index or later, stay at current index
        // Otherwise, find the first available item
        if (updatedDisplayItems.length > 0) {
          if (selectedItemIndex < updatedDisplayItems.length) {
            // Stay at current index - the next item will appear there
            setSelectedItemIndex(selectedItemIndex);
          } else {
            // Go to first item if we're beyond the available items
            setSelectedItemIndex(0);
          }
        }
      }, 500);
    }
  };

  // Keep handleLocationScan for backward compatibility
  const handleLocationScan = addLocationToSession;

  // Handle quantity update for a location
  const handleQuantityUpdate = (locationIndex: number, quantity: number) => {
    if (!currentItem || quantity < 0) return;

    const globalIndex = items.findIndex(item => 
      item.receiptItemId === currentItem.receiptItemId && 
      item.receiptId === currentItem.receiptId
    );
    if (globalIndex < 0) return;

    const updatedItems = [...items];
    updatedItems[globalIndex].newLocations[locationIndex].quantity = quantity;

    // Update assigned quantity
    const totalAssigned = updatedItems[globalIndex].newLocations.reduce((sum, loc) => sum + loc.quantity, 0);
    updatedItems[globalIndex].assignedQuantity = totalAssigned;

    setItems(updatedItems);

    // Play feedback sound
    if (totalAssigned >= currentItem.receivedQuantity) {
      soundEffects.playCompletionSound();
    }
  };

  // Remove location
  const removeLocation = (locationIndex: number) => {
    if (!currentItem) return;

    const globalIndex = items.findIndex(item => 
      item.receiptItemId === currentItem.receiptItemId && 
      item.receiptId === currentItem.receiptId
    );
    if (globalIndex < 0) return;

    const updatedItems = [...items];
    updatedItems[globalIndex].newLocations.splice(locationIndex, 1);

    // Update assigned quantity
    const totalAssigned = updatedItems[globalIndex].newLocations.reduce((sum, loc) => sum + loc.quantity, 0);
    updatedItems[globalIndex].assignedQuantity = totalAssigned;

    setItems(updatedItems);
  };

  // Toggle primary location
  const togglePrimaryLocation = (locationIndex: number) => {
    if (!currentItem) return;

    const globalIndex = items.findIndex(item => 
      item.receiptItemId === currentItem.receiptItemId && 
      item.receiptId === currentItem.receiptId
    );
    if (globalIndex < 0) return;

    const updatedItems = [...items];

    // Clear other primary flags
    updatedItems[globalIndex].newLocations.forEach((loc, idx) => {
      loc.isPrimary = idx === locationIndex;
    });

    setItems(updatedItems);
  };

  // Helper to process individual location save (when not saving all at once)
  const saveIndividualLocation = async () => {
    if (!currentItem || !locationScan) return;
    
    // Create a temporary assignment just for this item
    const assignment = {
      receiptItemId: currentItem.receiptItemId,
      productId: currentItem.productId,
      locations: currentItem.newLocations.map(loc => ({
        locationCode: loc.locationCode,
        locationType: loc.locationType,
        quantity: loc.quantity,
        isPrimary: loc.isPrimary,
        notes: loc.notes
      }))
    };
    
    // Find which receipt this item belongs to
    const receiptId = currentItem.receiptId || selectedReceipt;
    
    if (!receiptId) {
      toast({
        title: "Error",
        description: "Cannot save location: No receipt selected",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await apiRequest(
        "POST",
        `/api/imports/receipts/${receiptId}/store-items`,
        { 
          locations: [assignment] 
        }
      );
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts/storage'] });
      
    } catch (error) {
      console.error("Failed to save location:", error);
      toast({
        title: "Error",
        description: "Failed to save location",
        variant: "destructive",
      });
    }
  };
  
  // Save storage mutation
  const saveStorageMutation = useMutation({
    mutationFn: async () => {
      const assignments = items
        .filter(item => item.newLocations.length > 0)
        .map(item => ({
          receiptItemId: item.receiptItemId,
          productId: item.productId,
          locations: item.newLocations.map(loc => ({
            locationCode: loc.locationCode,
            locationType: loc.locationType,
            quantity: loc.quantity,
            isPrimary: loc.isPrimary,
            notes: loc.notes
          }))
        }));

      if (assignments.length === 0) {
        throw new Error("No items to store");
      }

      if (!selectedReceipt) {
        throw new Error("No receipt selected");
      }
      
      return apiRequest(
        "POST",
        `/api/imports/receipts/${selectedReceipt}/store-items`,
        { 
          locations: assignments 
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts/storage'] });
      // Also invalidate the shipment status queries to reflect the status change
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/by-status/pending_approval'] }); // Storage tab
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/by-status/completed'] }); // Completed tab
      
      // Clear localStorage after successful save
      localStorage.removeItem('itemsToStore_assignments');
      localStorage.removeItem('itemsToStore_selectedReceipt');
      localStorage.removeItem('itemsToStore_selectedItemIndex');
      localStorage.removeItem('itemsToStore_activeTab');
      
      toast({
        title: "Success",
        description: "Items have been stored and shipment moved to completed",
      });
      navigate('/receiving');
    },
    onError: (error) => {
      console.error("Failed to save storage:", error);
      toast({
        title: "Error",
        description: "Failed to save storage assignments",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    saveStorageMutation.mutate();
  };

  // Auto-save when all items for current receipt are completed
  useEffect(() => {
    if (selectedReceipt && items.length > 0) {
      const receiptItems = items.filter(item => item.receiptId === selectedReceipt);
      const completedReceiptItems = receiptItems.filter(item => 
        item.newLocations.length > 0 || item.existingLocations.length > 0
      );
      
      // Check if all items for this receipt are completed and have not been saved yet
      if (receiptItems.length > 0 && 
          completedReceiptItems.length === receiptItems.length && 
          !saveStorageMutation.isPending && 
          !saveStorageMutation.isSuccess) {
        // Auto-save after a short delay to ensure user has finished
        const timer = setTimeout(() => {
          console.log('Auto-saving: All items completed for receipt', selectedReceipt);
          toast({
            title: "Auto-saving",
            description: "All items completed. Saving storage locations...",
            duration: 3000,
          });
          saveStorageMutation.mutate();
        }, 1500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [items, selectedReceipt]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!storageData || receiptsWithItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Boxes className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-center mb-6">No items pending storage</p>
            <Button
              variant="outline"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Receiving
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => window.history.back()} className="p-2 -ml-2">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold">Items to Store</h1>
          <button 
            onClick={handleSave}
            disabled={items.filter(item => item.newLocations.length > 0).length === 0 || saveStorageMutation.isPending || saveStorageMutation.isSuccess}
            className="p-2 -mr-2"
          >
            {saveStorageMutation.isPending ? (
              <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
            ) : saveStorageMutation.isSuccess ? (
              <Check className="h-6 w-6 text-green-500" />
            ) : (
              <Save className={`h-6 w-6 ${items.filter(item => item.newLocations.length > 0).length === 0 ? 'text-gray-300' : 'text-amber-600'}`} />
            )}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 pb-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{completedItems} of {totalItems} items</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Receipt Selector - Horizontal Scroll with Comprehensive Shipping Info */}
      {receiptsWithItems.length > 1 && (
        <div className="bg-white border-b">
          <div className="px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Select Shipment to Work On</p>
            <div className="overflow-x-auto -mx-4 px-4">
              <div className="flex gap-3">
                {receiptsWithItems.map((receiptData: ReceiptWithItems) => {
                  const receiptItems = items.filter(item => item.receiptId === receiptData.receipt.id);
                  const assignedCount = receiptItems.filter(item => item.newLocations.length > 0).length;
                  const completionPercent = (assignedCount / receiptItems.length) * 100;

                  return (
                    <button
                      key={receiptData.receipt.id}
                      onClick={() => {
                        setSelectedReceipt(receiptData.receipt.id);
                        setSelectedItemIndex(0);
                      }}
                      className={`flex-shrink-0 p-3 rounded-xl border-2 transition-all min-w-[240px] text-left ${
                        selectedReceipt === receiptData.receipt.id
                          ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/20 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      {/* Shipment Name - Prominent Title */}
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-sm truncate">
                          {receiptData.shipment?.shipmentName || `Shipment #${receiptData.shipment?.id || receiptData.receipt.id}`}
                        </h3>
                        {completionPercent === 100 && (
                          <Badge className="bg-green-500 text-white text-[10px] h-5 ml-2">
                            <Check className="h-3 w-3 mr-0.5" />
                            Done
                          </Badge>
                        )}
                      </div>

                      {/* Shipment Type & Carrier */}
                      <div className="flex items-center gap-2 mb-2">
                        {receiptData.shipment?.shipmentType && getShipmentTypeIcon(receiptData.shipment.shipmentType, 'h-3 w-3')}
                        <span className="text-xs text-muted-foreground">
                          {receiptData.shipment?.carrier || 'Unknown Carrier'}
                        </span>
                      </div>

                      {/* Tracking Number */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <Hash className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs font-mono font-medium truncate">
                          {receiptData.shipment?.trackingNumber || `Receipt #${receiptData.receipt.id}`}
                        </span>
                      </div>

                      {/* Route (Origin → Destination) */}
                      {(receiptData.shipment?.origin || receiptData.shipment?.destination) && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-[11px] text-muted-foreground truncate">
                            {receiptData.shipment?.origin?.split(',')[0] || '?'} → {receiptData.shipment?.destination?.split(',')[0] || '?'}
                          </span>
                        </div>
                      )}

                      {/* Items Progress */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Package className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {assignedCount}/{receiptItems.length} items
                          </span>
                        </div>
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                          {Math.round(completionPercent)}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <Progress value={completionPercent} className="h-1.5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Selector */}
      <div className="bg-white border-b sticky top-[88px] z-30">
        <div className="flex">
          <button
            onClick={() => {
              setActiveTab('pending');
              setSelectedItemIndex(0);
            }}
            className={`flex-1 py-3 text-sm font-medium transition-all relative ${
              activeTab === 'pending' 
                ? 'text-amber-700 dark:text-amber-400' 
                : 'text-muted-foreground'
            }`}
          >
            Pending ({filteredItems.filter(item => item.newLocations.length === 0 && !item.existingLocations.length).length})
            {activeTab === 'pending' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600" />
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('completed');
              setSelectedItemIndex(0);
            }}
            className={`flex-1 py-3 text-sm font-medium transition-all relative ${
              activeTab === 'completed' 
                ? 'text-amber-700 dark:text-amber-400' 
                : 'text-muted-foreground'
            }`}
          >
            Completed ({filteredItems.filter(item => item.newLocations.length > 0 || item.existingLocations.length > 0).length})
            {activeTab === 'completed' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600" />
            )}
          </button>
        </div>
      </div>

      {/* Item Cards */}
      <div className="p-4 space-y-3">
        <AnimatePresence mode="wait">
          {displayItems.map((item, index) => {
            const isSelected = index === selectedItemIndex;
            const isComplete = item.newLocations.length > 0 || item.existingLocations.length > 0;

            return (
              <motion.div
                key={`${item.receiptId}-${item.receiptItemId}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                onClick={() => setSelectedItemIndex(index)}
                className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${
                  isSelected 
                    ? 'border-amber-600 shadow-lg' 
                    : 'border-gray-200 shadow-sm'
                }`}
              >
                {/* Item Header */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Product Image */}
                    <div className="relative">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.productName}
                          className="w-16 h-16 rounded-lg object-contain border bg-slate-50"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      {isComplete && (
                        <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm line-clamp-1">{item.productName}</h3>
                      {item.description && item.description !== item.productName && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-muted-foreground" data-testid={`location-${item.receiptItemId}`}>
                          Location: {getSuggestedLocation(item) || 'TBA'}
                        </span>
                        <Badge variant="outline" className="text-xs" data-testid={`qty-${item.receiptItemId}`}>
                          Qty: {item.receivedQuantity}
                        </Badge>
                        {/* Landing Cost Badge */}
                        {item.landingCostUnitBase && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge 
                                  variant={item.hasCompleteLandingCost ? "default" : "secondary"} 
                                  className={`text-xs ${!item.hasCompleteLandingCost ? 'bg-yellow-100 text-yellow-800' : ''}`}
                                  data-testid={`landing-cost-${item.receiptItemId}`}
                                >
                                  Landing: €{parseFloat(item.landingCostUnitBase).toFixed(2)}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-sm">
                                  <p className="font-semibold mb-1">Landing Cost Breakdown</p>
                                  {item.hasCompleteLandingCost ? (
                                    <>
                                      <p>Unit Cost: €{parseFloat(item.landingCostUnitBase).toFixed(2)}</p>
                                      <p className="text-xs text-muted-foreground mt-1">Includes freight, duties, and fees</p>
                                    </>
                                  ) : (
                                    <p className="text-yellow-600">Landing cost pending—enter freight to finalize</p>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {!item.landingCostUnitBase && item.purchaseItemId && (
                          <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                            Landing cost pending
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Expand Icon */}
                    <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${
                      isSelected ? 'rotate-90' : ''
                    }`} />
                  </div>

                  {/* Location Summary */}
                  {(item.newLocations.length > 0 || item.existingLocations.length > 0) && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-amber-600" />
                        <span className="text-xs text-muted-foreground">
                          {item.newLocations.length > 0 && `${item.newLocations.length} new location(s)`}
                          {item.existingLocations.length > 0 && ` • ${item.existingLocations.length} existing`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded Actions - Only show for selected item */}
                {isSelected && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t bg-gray-50"
                  >
                    <div className="p-4 space-y-3">
                      {/* Prominent Location Display */}
                      <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center gap-2 flex-wrap">
                          <MapPin className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                          <span className="text-2xl font-mono font-bold text-amber-700 dark:text-amber-400">
                            {getSuggestedLocation(item) || generateSuggestedLocationWithAI(item, aiSuggestions)}
                          </span>
                          {item.existingLocations.some(loc => loc.isPrimary) && (
                            <Badge className="ml-2 bg-yellow-500 text-white">
                              <Star className="h-3 w-3 mr-1" fill="currentColor" />
                              Primary
                            </Badge>
                          )}
                        </div>
                        {/* AI Reasoning */}
                        {getAIReasoning(item, aiSuggestions) && (
                          <div className="mt-2 text-xs text-amber-700 dark:text-amber-400 italic">
                            <span className="font-semibold">AI:</span> {getAIReasoning(item, aiSuggestions)}
                          </div>
                        )}
                      </div>

                      {/* Quick Stats */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3 border">
                          <p className="text-xs text-muted-foreground">Received</p>
                          <p className="text-lg font-bold">{item.receivedQuantity}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border">
                          <p className="text-xs text-muted-foreground">Remaining</p>
                          <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{remainingQuantity}</p>
                        </div>
                      </div>

                      {/* Existing Locations */}
                      {item.existingLocations.length > 0 && (
                        <div className="bg-white rounded-lg p-3 border">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Current Locations</p>
                          {item.existingLocations.map(loc => (
                            <div key={loc.id} className="flex items-center gap-2 py-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              <span className="text-sm font-mono">{loc.locationCode}</span>
                              <Badge variant="secondary" className="text-xs ml-auto">
                                {loc.quantity}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* New Locations */}
                      {item.newLocations.length > 0 && (
                        <div className="space-y-2">
                          {item.newLocations.map((loc, locIndex) => (
                            <div key={loc.id} className="bg-white rounded-lg p-3 border flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-amber-600" />
                              <span className="font-mono text-sm font-medium">{loc.locationCode}</span>
                              <input
                                type="number"
                                value={loc.quantity}
                                onChange={(e) => handleQuantityUpdate(locIndex, parseInt(e.target.value) || 0)}
                                className="w-16 px-2 py-1 text-sm border rounded ml-auto"
                                min="0"
                                max={remainingQuantity + loc.quantity}
                              />
                              <button
                                onClick={() => togglePrimaryLocation(locIndex)}
                                className={`p-1 ${loc.isPrimary ? 'text-yellow-500' : 'text-gray-300'}`}
                              >
                                <Star className="h-4 w-4" fill={loc.isPrimary ? 'currentColor' : 'none'} />
                              </button>
                              <button
                                onClick={() => removeLocation(locIndex)}
                                className="p-1 text-red-500"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowScanner(true)}
                          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg py-3 flex items-center justify-center gap-2"
                          data-testid="button-scan-location"
                        >
                          <QrCode className="h-5 w-5" />
                          <span className="font-medium">Scan Location</span>
                        </button>
                        <button
                          onClick={() => {
                            setPricingReceiptId(item.receiptId || null);
                            setShowPricingSheet(true);
                          }}
                          className="p-3 bg-white border rounded-lg"
                          data-testid="button-view-pricing"
                        >
                          <TrendingUp className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setShowDetails(true)}
                          className="p-3 bg-white border rounded-lg"
                          data-testid="button-item-details"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
        <div className="p-4 flex gap-2">
          <button
            onClick={() => {
              if (selectedItemIndex > 0) {
                setSelectedItemIndex(selectedItemIndex - 1);
              }
            }}
            disabled={selectedItemIndex === 0}
            className={`p-3 rounded-lg border ${
              selectedItemIndex === 0 
                ? 'bg-gray-50 text-gray-300' 
                : 'bg-white text-gray-700'
            }`}
          >
            <ArrowUp className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              if (selectedItemIndex < displayItems.length - 1) {
                setSelectedItemIndex(selectedItemIndex + 1);
              }
            }}
            disabled={selectedItemIndex === displayItems.length - 1}
            className={`p-3 rounded-lg border ${
              selectedItemIndex === displayItems.length - 1
                ? 'bg-gray-50 text-gray-300' 
                : 'bg-white text-gray-700'
            }`}
          >
            <ArrowDown className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowScanner(true)}
            disabled={!currentItem}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg py-3 flex items-center justify-center gap-2 font-medium"
          >
            <ScanLine className="h-5 w-5" />
            Quick Scan
          </button>
        </div>
      </div>

      {/* Scanner Sheet with Multi-Location Support */}
      <Sheet open={showScanner} onOpenChange={(open) => {
        setShowScanner(open);
        if (!open) {
          // Clear session when closing
          setSessionsLocations([]);
          setScanFeedback({ type: null, message: '' });
          setLocationScan("");
          setLocationCode("");
        } else if (open && currentItem) {
          // Initialize location code when opening with suggested location
          const suggestedLocation = getSuggestedLocation(currentItem) || generateSuggestedLocationWithAI(currentItem, aiSuggestions);
          if (suggestedLocation) {
            setLocationCode(suggestedLocation);
          }
        }
      }}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh] overflow-y-auto pb-6">
          {/* Compact Header */}
          <SheetHeader className="pb-2">
            <SheetTitle className="text-base font-semibold">Add Location</SheetTitle>
            {currentItem && (
              <div className="mt-2 space-y-2">
                {/* Compact Item Info */}
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <div className="flex items-start gap-3">
                    {/* Product Image */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-white border flex-shrink-0">
                      {currentItem.imageUrl ? (
                        <img 
                          src={currentItem.imageUrl} 
                          alt={currentItem.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-left">{currentItem.productName}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {currentItem.sku && (
                          <span className="text-xs text-muted-foreground">
                            SKU: <span className="font-mono">{currentItem.sku}</span>
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Qty: <span className="font-semibold">{currentItem.receivedQuantity}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Suggested Location - Compact */}
                {getSuggestedLocation(currentItem) ? (
                  <div className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
                    <MapPin className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-xs text-green-700">Current:</span>
                    <span className="font-mono text-xs font-semibold">{getSuggestedLocation(currentItem)}</span>
                  </div>
                ) : (
                  <div className="bg-blue-50 rounded-lg px-3 py-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <Navigation className="h-3.5 w-3.5 text-blue-600" />
                      <span className="text-xs text-blue-700">AI Suggested:</span>
                      <span className="font-mono text-xs font-semibold">{generateSuggestedLocationWithAI(currentItem, aiSuggestions)}</span>
                    </div>
                    {getAIReasoning(currentItem, aiSuggestions) && (
                      <p className="text-xs text-blue-600 italic pl-5">
                        {getAIReasoning(currentItem, aiSuggestions)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </SheetHeader>
          <div className="mt-3 space-y-3">
            {/* Compact Session Locations with Quantity */}
            {sessionsLocations.length > 0 && (
              <div className="space-y-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-blue-900 dark:text-blue-100">Added Locations</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="h-5 text-xs bg-white dark:bg-slate-800">
                      Total: {sessionsLocations.reduce((sum, loc) => sum + loc.quantity, 0)} / {currentItem?.receivedQuantity || 0}
                    </Badge>
                    <Badge variant="secondary" className="h-5 text-xs">
                      {sessionsLocations.length} location{sessionsLocations.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {sessionsLocations.map((loc, idx) => {
                    const totalAllocated = sessionsLocations.reduce((sum, l, i) => i !== idx ? sum + l.quantity : sum, 0);
                    const maxQuantity = currentItem ? currentItem.receivedQuantity - totalAllocated - totalAssigned : 0;
                    
                    return (
                      <div key={idx} className="bg-white border rounded-lg p-2.5">
                        <div className="space-y-2">
                          {/* Location Code Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-gray-500" />
                              <span className="font-mono text-sm font-medium">{loc.code}</span>
                              {loc.isPrimary && (
                                <Badge variant="default" className="h-4 text-xs px-1.5">Main</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {!loc.isPrimary && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSessionsLocations(prev => 
                                      prev.map((l, i) => ({ 
                                        ...l, 
                                        isPrimary: i === idx 
                                      }))
                                    );
                                    soundEffects.playSuccessBeep();
                                  }}
                                  className="h-7 px-2 text-xs"
                                  title="Set as primary location"
                                >
                                  <Star className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setSessionsLocations(prev => prev.filter((_, i) => i !== idx));
                                  soundEffects.playErrorBeep();
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Quantity Row */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Quantity:</span>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  const newQty = Math.max(1, loc.quantity - 1);
                                  setSessionsLocations(prev => 
                                    prev.map((l, i) => i === idx ? { ...l, quantity: newQty } : l)
                                  );
                                }}
                                disabled={loc.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              
                              <input
                                type="number"
                                value={loc.quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  const newQty = Math.min(Math.max(1, val), maxQuantity);
                                  setSessionsLocations(prev => 
                                    prev.map((l, i) => i === idx ? { ...l, quantity: newQty } : l)
                                  );
                                }}
                                className="w-16 h-6 text-center text-sm border rounded px-1"
                                min={1}
                                max={maxQuantity}
                              />
                              
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  const newQty = Math.min(maxQuantity, loc.quantity + 1);
                                  setSessionsLocations(prev => 
                                    prev.map((l, i) => i === idx ? { ...l, quantity: newQty } : l)
                                  );
                                }}
                                disabled={loc.quantity >= maxQuantity}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-xs"
                                onClick={() => {
                                  setSessionsLocations(prev => 
                                    prev.map((l, i) => i === idx ? { ...l, quantity: maxQuantity } : l)
                                  );
                                  soundEffects.playSuccessBeep();
                                }}
                                disabled={loc.quantity === maxQuantity}
                              >
                                Max
                              </Button>
                            </div>
                            <span className="text-xs text-muted-foreground ml-auto">
                              (max: {maxQuantity})
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add New Location Section */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Enter Location Code</p>
              <WarehouseLocationSelector 
                value={locationCode}
                onChange={handleLocationCodeChange}
                showTypeSelector={false}
                className="w-full"
              />
            </div>

            <ScanFeedback type={scanFeedback.type} message={scanFeedback.message} />

            {/* Compact Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setLocationCode("");
                  setLocationScan("");
                  setScanFeedback({ type: null, message: '' });
                  soundEffects.playSuccessBeep();
                }}
                className="px-4"
                size="sm"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
              
              <Button
                onClick={async () => {
                  if (locationCode) {
                    await addLocationToSession(locationCode);
                    setLocationCode(""); // Clear after adding
                  } else if (locationScan) {
                    await addLocationToSession(locationScan);
                  } else {
                    await addLocationToSession();
                  }
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                size="sm"
                disabled={
                  sessionsLocations.length >= 10 || 
                  (!locationCode && !locationScan)
                }
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Location
                {sessionsLocations.length > 0 && (
                  <span className="ml-1.5 bg-white/20 px-1.5 py-0.5 rounded-full text-xs">
                    {sessionsLocations.length}
                  </span>
                )}
              </Button>
            </div>
            
            {/* Apply Locations Button */}
            {sessionsLocations.length > 0 && (
              <Button
                onClick={() => {
                  applySessionLocations();
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-base font-semibold"
                size="lg"
                disabled={sessionsLocations.reduce((sum, loc) => sum + loc.quantity, 0) === 0}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Apply {sessionsLocations.length} Location{sessionsLocations.length !== 1 ? 's' : ''} 
                ({sessionsLocations.reduce((sum, loc) => sum + loc.quantity, 0)} units)
              </Button>
            )}

          </div>
        </SheetContent>
      </Sheet>

      {/* Enhanced Item Details Sheet */}
      <Sheet open={showDetails} onOpenChange={setShowDetails}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Item Details</SheetTitle>
          </SheetHeader>
          {currentItem && (
            <div className="mt-4 space-y-6">
              {/* Hero Product Image */}
              <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                {currentItem.imageUrl ? (
                  <img 
                    src={currentItem.imageUrl} 
                    alt={currentItem.productName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Identification Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                    <Hash className="inline h-4 w-4 mr-2" />
                    Identification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Product Name</p>
                    <p className="font-semibold">{currentItem.productName}</p>
                  </div>

                  {currentItem.description && currentItem.description !== currentItem.productName && (
                    <div>
                      <p className="text-xs text-muted-foreground">Description</p>
                      <p className="text-sm">{currentItem.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {currentItem.sku && (
                      <div>
                        <p className="text-xs text-muted-foreground">SKU</p>
                        <p className="font-mono text-sm">{currentItem.sku}</p>
                      </div>
                    )}

                    {currentItem.barcode && (
                      <div>
                        <p className="text-xs text-muted-foreground">Barcode</p>
                        <p className="font-mono text-xs">{currentItem.barcode}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Shipment Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                    <Ship className="inline h-4 w-4 mr-2" />
                    Shipment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Tracking #</p>
                      <p className="font-mono text-xs">{currentItem.shipmentTrackingNumber || 'N/A'}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">Received</p>
                      <p className="text-sm">{currentItem.receivedAt ? format(new Date(currentItem.receivedAt), "MMM d, yyyy") : 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quantities Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                    <Boxes className="inline h-4 w-4 mr-2" />
                    Quantities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Progress value={(totalAssigned / currentItem.receivedQuantity) * 100} className="h-2" />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="bg-gray-50">
                        <Package className="h-3 w-3 mr-1" />
                        Received: {currentItem.receivedQuantity}
                      </Badge>
                      <Badge className="bg-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Assigned: {totalAssigned}
                      </Badge>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-900">
                        <Clock className="h-3 w-3 mr-1" />
                        Remaining: {remainingQuantity}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Quick Scan Continuous Mode HUD */}
      {isScanning && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-black/80 text-white p-6 z-50 backdrop-blur-md"
        >
          {/* Hidden input for barcode scanning - properly captures keyboard input */}
          <input
            ref={scanInputRef}
            type="text"
            className="sr-only"
            value={scanBuffer}
            onChange={handleScanInput}
            onKeyDown={handleScanComplete}
            aria-label="Quick scan barcode input"
            autoFocus
            tabIndex={0}
            data-testid="quick-scan-input"
          />

          <div className="max-w-2xl mx-auto">
            {/* Status Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <ScanLine className="h-6 w-6 text-green-400 animate-pulse" />
                <div>
                  <p className="text-lg font-bold">Quick Scan Active</p>
                  <p className="text-xs text-gray-300">
                    {currentItem?.productName || 'No item selected'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Press ESC to exit • Scan barcode to continue
                  </p>
                </div>
              </div>
              <Badge className="bg-white/20 text-white">
                {scanningProgress.current} of {scanningProgress.total}
              </Badge>
            </div>

            {/* Progress Bar */}
            <Progress 
              value={(scanningProgress.current / scanningProgress.total) * 100} 
              className="h-2 mb-4 bg-white/10"
            />

            {/* Last Scan Result */}
            {lastScanResult && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`p-3 rounded-lg mb-4 flex items-center gap-2 ${
                  lastScanResult.success 
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}
              >
                {lastScanResult.success ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
                <span className="text-sm">{lastScanResult.message}</span>
              </motion.div>
            )}

            {/* Control Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsScanning(false);
                  setLastScanResult(null);
                  setScanBuffer("");
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium"
                data-testid="button-exit-quick-scan"
              >
                <X className="inline h-4 w-4 mr-2" />
                Exit (ESC)
              </button>
              <button
                onClick={() => {
                  // Use functional update to ensure fresh state
                  setSelectedItemIndex(prevIndex => {
                    const currentFilteredItems = selectedReceipt 
                      ? items.filter(item => item.receiptId === selectedReceipt)
                      : items;

                    const currentDisplayItems = activeTab === 'pending'
                      ? currentFilteredItems.filter(item => item.newLocations.length === 0 && !item.existingLocations.length)
                      : currentFilteredItems.filter(item => item.newLocations.length > 0 || item.existingLocations.length > 0);

                    const nextIndex = currentDisplayItems.findIndex((item, idx) => 
                      idx > prevIndex && item.newLocations.length === 0 && !item.existingLocations.length
                    );

                    if (nextIndex !== -1) {
                      setScanningProgress(prev => ({ 
                        ...prev, 
                        current: prev.current + 1 
                      }));
                      return nextIndex;
                    } else {
                      setIsScanning(false);
                      toast({
                        title: "✓ All items processed",
                        description: "No more items to scan",
                      });
                      return prevIndex;
                    }
                  });
                }}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg font-medium"
                data-testid="button-skip-item"
              >
                <ArrowRight className="inline h-4 w-4 mr-2" />
                Skip
              </button>
              <button
                onClick={() => setShowScanner(true)}
                className="flex-1 px-4 py-2 bg-white/20 text-white rounded-lg font-medium"
                data-testid="button-manual-entry"
              >
                <Layers className="inline h-4 w-4 mr-2" />
                Manual Entry
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Comprehensive Landing Cost Pricing Sheet */}
      <Sheet open={showPricingSheet} onOpenChange={setShowPricingSheet}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          {pricingReceiptId && (() => {
            const receiptData = receiptsWithItems.find((r: ReceiptWithItems) => r.receipt.id === pricingReceiptId);
            if (!receiptData) return null;

            const shipmentId = receiptData.shipment?.id;
            const totalItems = receiptData.items?.reduce((sum: number, item: any) => sum + (item.receivedQuantity || 0), 0) || 0;
            const totalShipping = parseFloat(receiptData.shipment?.shippingCost || '0') + parseFloat(receiptData.shipment?.insuranceValue || '0');
            const shippingPerUnit = totalItems > 0 ? totalShipping / totalItems : 0;
            const currency = receiptData.shipment?.shippingCostCurrency || 'EUR';

            return (
              <>
                <SheetHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {receiptData.shipment?.shipmentType && getShipmentTypeIcon(receiptData.shipment.shipmentType, 'h-5 w-5 text-amber-600')}
                      <div>
                        <SheetTitle className="text-lg font-semibold">
                          {receiptData.shipment?.shipmentName || `Shipment #${shipmentId}`}
                        </SheetTitle>
                        <SheetDescription className="text-xs mt-0.5">
                          {receiptData.shipment?.origin} → {receiptData.shipment?.destination}
                        </SheetDescription>
                      </div>
                    </div>
                  </div>
                </SheetHeader>

                {/* Shipping Information Section */}
                <div className="grid grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg text-xs mb-4">
                  <div>
                    <p className="text-muted-foreground">Carrier</p>
                    <p className="font-semibold text-sm">{receiptData.shipment?.carrier || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tracking</p>
                    <p className="font-semibold text-sm font-mono">{receiptData.shipment?.trackingNumber || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Items</p>
                    <p className="font-semibold text-sm">{totalItems} units</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Weight</p>
                    <p className="font-semibold text-sm">{receiptData.shipment?.totalWeight || '—'} kg</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Shipping</p>
                    <p className="font-semibold text-sm">{formatCurrency(totalShipping, currency)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Per Unit</p>
                    <p className="font-semibold text-sm text-blue-600">{formatCurrency(shippingPerUnit, currency)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Route</p>
                    <p className="font-semibold text-sm truncate">{receiptData.shipment?.origin} → {receiptData.shipment?.destination}</p>
                  </div>
                </div>

                {/* Allocation Method Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <div>
                        <p className="text-xs font-medium text-amber-900 dark:text-amber-100">Cost Allocation Method</p>
                        <p className="text-[10px] text-amber-700 dark:text-amber-300">How shipping costs are distributed</p>
                      </div>
                    </div>
                    <Select 
                      value={allocationMethod} 
                      onValueChange={(value: 'AUTO' | 'WEIGHT' | 'VALUE' | 'UNITS' | 'HYBRID') => setAllocationMethod(value)}
                    >
                      <SelectTrigger className="h-8 w-[140px] text-xs bg-white dark:bg-slate-900" data-testid="select-allocation-method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AUTO">
                          <div className="flex items-center gap-2">
                            <Zap className="h-3 w-3 text-amber-500" />
                            <span>Auto-Select</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="WEIGHT">
                          <div className="flex items-center gap-2">
                            <Package className="h-3 w-3" />
                            <span>By Weight</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="VALUE">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-3 w-3" />
                            <span>By Value</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="UNITS">
                          <div className="flex items-center gap-2">
                            <Hash className="h-3 w-3" />
                            <span>By Units</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="HYBRID">
                          <div className="flex items-center gap-2">
                            <Layers className="h-3 w-3" />
                            <span>Hybrid</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Method Description */}
                  <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 flex-1">
                        {allocationMethod === 'AUTO' && (
                          <span>
                            <strong className="text-amber-700 dark:text-amber-400">Auto-Select:</strong> System automatically chooses the best method based on shipment type (boxes/pallets/containers)
                          </span>
                        )}
                        {allocationMethod === 'WEIGHT' && (
                          <span>
                            <strong className="text-amber-700 dark:text-amber-400">Weight-Based:</strong> Costs allocated proportionally by item weight — heavier items bear more shipping cost
                          </span>
                        )}
                        {allocationMethod === 'VALUE' && (
                          <span>
                            <strong className="text-amber-700 dark:text-amber-400">Value-Based:</strong> Costs allocated proportionally by item value — more expensive items bear more shipping cost
                          </span>
                        )}
                        {allocationMethod === 'UNITS' && (
                          <span>
                            <strong className="text-amber-700 dark:text-amber-400">Unit-Based:</strong> Costs distributed equally across all units — each item gets the same shipping cost
                          </span>
                        )}
                        {allocationMethod === 'HYBRID' && (
                          <span>
                            <strong className="text-amber-700 dark:text-amber-400">Hybrid:</strong> Combines weight, value, and unit factors for balanced cost distribution
                          </span>
                        )}
                      </p>
                      {isLoadingPreview && (
                        <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Loading preview
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Comprehensive Pricing Table */}
                {receiptData.items && receiptData.items.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-amber-600" />
                        Item Pricing & Landing Cost
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground hidden sm:inline">Display Currency:</span>
                        <Select value={displayCurrency} onValueChange={(value: 'EUR' | 'CZK') => setDisplayCurrency(value)}>
                          <SelectTrigger className="h-8 w-[100px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="CZK">CZK (Kč)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Desktop Table - Hidden on Mobile */}
                    <div className="hidden md:block border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                            <TableHead className="w-[28%]">Item</TableHead>
                            <TableHead className="text-center w-[7%]">Qty</TableHead>
                            <TableHead className="text-right w-[11%]">Unit Cost</TableHead>
                            <TableHead className="text-right w-[10%]">Shipping</TableHead>
                            <TableHead className="text-right w-[11%]">Landing</TableHead>
                            <TableHead className="text-right w-[11%]">Landing ({displayCurrency})</TableHead>
                            <TableHead className="text-right w-[11%]">Retail Price</TableHead>
                            <TableHead className="text-right w-[11%]">Retail ({displayCurrency})</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {receiptData.items.map((item: any, index: number) => {
                            const qty = item.receivedQuantity || 0;
                            const unitCost = item.landingCostUnitBase ? parseFloat(item.landingCostUnitBase) : parseFloat(item.unitPrice || 0);
                            const shippingCost = shippingPerUnit;
                            const landingCost = unitCost + shippingCost;
                            const defaultRetailPrice = landingCost * 1.5;
                            const defaultMargin = defaultRetailPrice > 0 ? ((defaultRetailPrice - landingCost) / defaultRetailPrice * 100) : 0;

                            return (
                              <PricingTableRow
                                key={index}
                                item={item}
                                index={index}
                                qty={qty}
                                unitCost={unitCost}
                                shippingCost={shippingCost}
                                landingCost={landingCost}
                                defaultRetailPrice={defaultRetailPrice}
                                defaultMargin={defaultMargin}
                                currency={currency}
                                displayCurrency={displayCurrency}
                              />
                            );
                          })}
                          {/* Footer Row with Totals */}
                          <TableRow className="bg-slate-50 dark:bg-slate-900/30 font-semibold">
                            <TableCell colSpan={2}>Totals</TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatCurrency(
                                receiptData.items.reduce((sum: number, item: any) => {
                                  const unitCost = item.landingCostUnitBase ? parseFloat(item.landingCostUnitBase) : parseFloat(item.unitPrice || 0);
                                  return sum + (unitCost * (item.receivedQuantity || 0));
                                }, 0),
                                currency
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-blue-600">
                              {formatCurrency(totalShipping, currency)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatCurrency(
                                receiptData.items.reduce((sum: number, item: any) => {
                                  const unitCost = item.landingCostUnitBase ? parseFloat(item.landingCostUnitBase) : parseFloat(item.unitPrice || 0);
                                  return sum + (unitCost * (item.receivedQuantity || 0));
                                }, 0) + totalShipping,
                                currency
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-amber-700 dark:text-amber-400">
                              {(() => {
                                // Convert each item's landing cost to display currency, then sum
                                const totalLandingConverted = receiptData.items.reduce((sum: number, item: any) => {
                                  const qty = item.receivedQuantity || 0;
                                  const unitCost = item.landingCostUnitBase ? parseFloat(item.landingCostUnitBase) : parseFloat(item.unitPrice || 0);
                                  const shippingCost = shippingPerUnit;
                                  const landingCost = unitCost + shippingCost;
                                  const converted = convertCurrency(landingCost, currency as Currency, displayCurrency);
                                  return sum + (converted * qty);
                                }, 0);
                                return displayCurrency === 'EUR' ? `€${totalLandingConverted.toFixed(2)}` : `${totalLandingConverted.toFixed(0)} Kč`;
                              })()}
                            </TableCell>
                            <TableCell colSpan={2}></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Cards - Shown on Mobile Only */}
                    <div className="block md:hidden space-y-3">
                      {receiptData.items.map((item: any, index: number) => {
                        const qty = item.receivedQuantity || 0;
                        const unitCost = item.landingCostUnitBase ? parseFloat(item.landingCostUnitBase) : parseFloat(item.unitPrice || 0);
                        const shippingCost = shippingPerUnit;
                        const landingCost = unitCost + shippingCost;
                        const defaultRetailPrice = landingCost * 1.5;
                        const defaultMargin = defaultRetailPrice > 0 ? ((defaultRetailPrice - landingCost) / defaultRetailPrice * 100) : 0;

                        return (
                          <PricingMobileCard
                            key={index}
                            item={item}
                            index={index}
                            qty={qty}
                            unitCost={unitCost}
                            shippingCost={shippingCost}
                            landingCost={landingCost}
                            defaultRetailPrice={defaultRetailPrice}
                            defaultMargin={defaultMargin}
                            currency={currency}
                            displayCurrency={displayCurrency}
                          />
                        );
                      })}
                      
                      {/* Mobile Totals Summary */}
                      <Card className="bg-slate-50 dark:bg-slate-900/30">
                        <CardContent className="p-4">
                          <h4 className="font-semibold text-sm mb-3">Totals</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Unit Cost:</span>
                              <span className="font-mono font-medium">
                                {formatCurrency(
                                  receiptData.items.reduce((sum: number, item: any) => {
                                    const unitCost = item.landingCostUnitBase ? parseFloat(item.landingCostUnitBase) : parseFloat(item.unitPrice || 0);
                                    return sum + (unitCost * (item.receivedQuantity || 0));
                                  }, 0),
                                  currency
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Shipping:</span>
                              <span className="font-mono font-medium text-blue-600">
                                {formatCurrency(totalShipping, currency)}
                              </span>
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                              <span className="font-medium">Total Landing Cost:</span>
                              <span className="font-mono font-semibold">
                                {formatCurrency(
                                  receiptData.items.reduce((sum: number, item: any) => {
                                    const unitCost = item.landingCostUnitBase ? parseFloat(item.landingCostUnitBase) : parseFloat(item.unitPrice || 0);
                                    return sum + (unitCost * (item.receivedQuantity || 0));
                                  }, 0) + totalShipping,
                                  currency
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium">Landing ({displayCurrency}):</span>
                              <span className="font-mono font-semibold text-amber-700 dark:text-amber-400">
                                {(() => {
                                  const totalLandingConverted = receiptData.items.reduce((sum: number, item: any) => {
                                    const qty = item.receivedQuantity || 0;
                                    const unitCost = item.landingCostUnitBase ? parseFloat(item.landingCostUnitBase) : parseFloat(item.unitPrice || 0);
                                    const shippingCost = shippingPerUnit;
                                    const landingCost = unitCost + shippingCost;
                                    const converted = convertCurrency(landingCost, currency as Currency, displayCurrency);
                                    return sum + (converted * qty);
                                  }, 0);
                                  return displayCurrency === 'EUR' ? `€${totalLandingConverted.toFixed(2)}` : `${totalLandingConverted.toFixed(0)} Kč`;
                                })()}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <p className="text-xs text-muted-foreground px-1">
                      💡 Shipping cost allocated proportionally across {totalItems} units. Retail prices default to 50% markup (editable).
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}