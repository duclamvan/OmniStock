import { useState, useEffect, useRef, memo, useMemo, useCallback } from "react";
import { nanoid } from "nanoid";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PDFDocument } from 'pdf-lib';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { offlineQueue } from "@/lib/offlineQueue";
import { CartonTypeAutocomplete } from "@/components/orders/CartonTypeAutocomplete";
import { usePackingOptimization } from "@/hooks/usePackingOptimization";
import { GLSAutofillButton } from "@/components/shipping/GLSAutofillButton";
import { GLS_COUNTRY_MAP } from "@/lib/gls";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Link } from "wouter";
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
  ClipboardPaste,
  AlertCircle,
  AlertTriangle,
  Timer,
  Route,
  Users,
  Globe,
  Building,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Zap,
  Eye,
  FileText,
  PackageCheck,
  Navigation,
  PlayCircle,
  PauseCircle,
  ArrowRight,
  Volume2,
  VolumeX,
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
  XCircle,
  RefreshCw,
  Shield,
  Award,
  FileImage,
  Book,
  Wrench,
  DollarSign,
  Trash2,
  Copy,
  ExternalLink,
  Download
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

interface IncludedDocuments {
  fileIds?: string[];
  invoicePrint?: boolean;
  custom?: boolean;
  uploadedFiles?: Array<{ name: string; url: string }>;
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
  includedDocuments?: IncludedDocuments | null;
  // Modification tracking
  modifiedAfterPacking?: boolean;
  modificationNotes?: string;
  lastModifiedAt?: string;
  previousPackStatus?: string;
  // PPL shipping integration
  pplBatchId?: string;
  pplShipmentNumbers?: string[];
  pplLabelData?: any;
  pplStatus?: string;
  // Payment and COD fields
  paymentMethod?: string;
  codAmount?: number | string;
  codCurrency?: string;
  // Shipping costs and tracking
  shippingCost?: number | string;
  actualShippingCost?: number | string;
  trackingNumber?: string;
}

interface OrderCarton {
  id: string;
  orderId: string;
  cartonNumber: number;
  cartonType: 'company' | 'non-company';
  cartonId?: string | null;
  weight?: string | null;
  payloadWeightKg?: number | null;
  innerLengthCm?: number | null;
  innerWidthCm?: number | null;
  innerHeightCm?: number | null;
  labelUrl?: string | null;
  labelPrinted: boolean;
  trackingNumber?: string | null;
  aiWeightCalculation?: any;
  aiPlanId?: string | null;
  source?: string;
  itemAllocations?: any;
  volumeUtilization?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CartonSuggestion {
  cartonId: string;
  cartonNumber: number;
  items: any[];
  totalWeightKg: number;
  volumeUtilization: number;
  fillingWeightKg: number;
  unusedVolumeCm3: number;
}

interface CartonRecommendation {
  suggestions: CartonSuggestion[];
  cartonCount: number;
  nylonWrapItems?: Array<{
    productId: string;
    productName: string;
    quantity: number;
    packagingRequirement: string;
  }>;
  reasoning: string;
  totalWeightKg: number;
  avgUtilization: number;
  optimizationSuggestions: string[];
}

// Helper function to format shipping address (handles both string and object formats)
const formatShippingAddress = (address: any): string => {
  if (!address) return '';
  
  // If it's already a string (legacy format), return it as-is
  if (typeof address === 'string') {
    return address;
  }
  
  // If it's an object, format it
  const parts: string[] = [];
  
  // Name line
  const nameParts = [address.firstName, address.lastName].filter(Boolean);
  if (nameParts.length > 0) {
    parts.push(nameParts.join(' '));
  }
  
  // Company line (if present)
  if (address.company) {
    parts.push(address.company);
  }
  
  // Street line
  const streetParts = [address.street, address.streetNumber].filter(Boolean);
  if (streetParts.length > 0) {
    parts.push(streetParts.join(' '));
  }
  
  // City, ZIP, Country line
  const cityLineParts = [address.zipCode, address.city].filter(Boolean);
  if (cityLineParts.length > 0) {
    parts.push(cityLineParts.join(' '));
  }
  
  if (address.country) {
    parts.push(address.country);
  }
  
  // Contact info (optional)
  if (address.tel) {
    parts.push(`Tel: ${address.tel}`);
  }
  
  if (address.email) {
    parts.push(`Email: ${address.email}`);
  }
  
  return parts.join('\n');
};

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
          ) : item.serviceId ? (
            <Wrench className="h-32 w-32 text-purple-300" style={{ pointerEvents: 'none' }} />
          ) : (
            <Package className="h-32 w-32 text-gray-300" style={{ pointerEvents: 'none' }} />
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
        ) : item.serviceId ? (
          <Wrench className="h-10 w-10 lg:h-16 lg:w-16 text-purple-300" style={{ pointerEvents: 'none' }} />
        ) : (
          <Package className="h-10 w-10 lg:h-16 lg:w-16 text-gray-300" style={{ pointerEvents: 'none' }} />
        )}
      </div>
      <div className="absolute -top-1 -right-1 lg:-top-2 lg:-right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center font-bold text-xs lg:text-base shadow-lg" style={{ pointerEvents: 'none' }}>
        {item.quantity}x
      </div>
    </div>
  );
});

// CartonCard component with local state for responsive weight input
const CartonCard = memo(({ 
  carton, 
  index, 
  isDraft, 
  cartonData, 
  activePackingOrder, 
  setHasManuallyModifiedCartons,
  deleteCartonMutation,
  updateCartonMutation,
  incrementCartonUsageMutation,
  calculateVolumeUtilization,
  isGLS = false
}: any) => {
  // Local state for weight input to make it responsive
  const [localWeight, setLocalWeight] = useState(carton.weight || '');
  const [isWeightExpanded, setIsWeightExpanded] = useState(false);
  
  // Sync local state when carton weight changes from external updates
  useEffect(() => {
    setLocalWeight(carton.weight || '');
  }, [carton.weight]);
  
  // Save weight to backend
  const saveWeight = (value: string) => {
    if (activePackingOrder && value !== carton.weight) {
      setHasManuallyModifiedCartons(true);
      updateCartonMutation.mutate({
        orderId: activePackingOrder.id,
        cartonId: carton.id,
        updates: { weight: value }
      });
    }
  };
  
  return (
    <Card 
      className={`border-2 ${isDraft ? 'border-purple-300 bg-purple-50 opacity-80' : 'border-purple-300 bg-white'}`} 
      data-testid={`carton-card-${index + 1}`}
    >
      <CardContent className="p-3 space-y-3">
        {/* Carton Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-purple-800 flex items-center gap-2">
            <Box className="h-5 w-5" />
            Carton #{carton.cartonNumber}
          </h3>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (activePackingOrder) {
                setHasManuallyModifiedCartons(true);
                deleteCartonMutation.mutate({
                  orderId: activePackingOrder.id,
                  cartonId: carton.id
                });
              }
            }}
            disabled={deleteCartonMutation.isPending}
            data-testid={`delete-carton-${index + 1}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Carton Type Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Carton Type</label>
          <CartonTypeAutocomplete
            value={carton.cartonType === 'non-company' ? null : carton.cartonId}
            onValueChange={(cartonId, cartonDataParam) => {
              if (activePackingOrder) {
                setHasManuallyModifiedCartons(true);
                const updates: Partial<OrderCarton> = {
                  cartonType: cartonId ? 'company' : 'non-company',
                  cartonId: cartonId || null
                };
                
                // Calculate volume utilization if we have carton data and item allocations
                if (cartonDataParam && carton.itemAllocations) {
                  const newCartonData = {
                    innerLengthCm: cartonDataParam.innerLengthCm?.toString(),
                    innerWidthCm: cartonDataParam.innerWidthCm?.toString(),
                    innerHeightCm: cartonDataParam.innerHeightCm?.toString()
                  };
                  
                  if (newCartonData.innerLengthCm && newCartonData.innerWidthCm && newCartonData.innerHeightCm) {
                    const utilization = calculateVolumeUtilization(
                      carton,
                      newCartonData,
                      activePackingOrder.items
                    );
                    
                    if (utilization !== null) {
                      updates.volumeUtilization = utilization.toString();
                      console.log('✅ Volume utilization recalculated:', utilization.toFixed(1) + '%', 'for carton:', cartonDataParam.name);
                    }
                  }
                }
                
                updateCartonMutation.mutate({
                  orderId: activePackingOrder.id,
                  cartonId: carton.id,
                  updates
                });
                if (cartonId) {
                  incrementCartonUsageMutation.mutate(cartonId);
                }
              }
            }}
            data-testid={`carton-selector-${index + 1}`}
          />
          {cartonData && (
            <p className="text-xs text-gray-600">
              {cartonData.dimensions.length}×{cartonData.dimensions.width}×{cartonData.dimensions.height}cm · Max {cartonData.maxWeight}kg
            </p>
          )}
        </div>

        {/* Weight Input with Local State - Collapsible for GLS */}
        {isGLS ? (
          <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setIsWeightExpanded(!isWeightExpanded)}
              className="w-full flex items-center justify-between p-2 hover:bg-gray-50 transition-colors"
              data-testid={`toggle-weight-section-${index + 1}`}
            >
              <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Weight {localWeight && `(${parseFloat(localWeight).toFixed(3)} kg)`}
              </span>
              {isWeightExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </button>
            
            {isWeightExpanded && (
              <div className="p-3 space-y-2 border-t-2 border-gray-200">
                <label className="text-sm font-medium text-gray-700">
                  Weight (kg) <span className="text-xs text-gray-500 font-normal">(optional, max 40kg)</span>
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={localWeight}
                    onChange={(e) => {
                      const newWeight = e.target.value;
                      setLocalWeight(newWeight);
                      
                      if (isGLS && newWeight && parseFloat(newWeight) > 40) {
                        e.target.classList.add('border-red-500');
                      } else {
                        e.target.classList.remove('border-red-500');
                      }
                    }}
                    onBlur={(e) => {
                      const newWeight = e.target.value;
                      
                      if (isGLS && newWeight && parseFloat(newWeight) > 40) {
                        toast({
                          title: "Weight Limit Exceeded",
                          description: "GLS shipments cannot exceed 40kg per carton. Please reduce weight or split into multiple cartons.",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      saveWeight(newWeight);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const newWeight = localWeight;
                        
                        if (isGLS && newWeight && parseFloat(newWeight) > 40) {
                          toast({
                            title: "Weight Limit Exceeded",
                            description: "GLS shipments cannot exceed 40kg per carton. Please reduce weight or split into multiple cartons.",
                            variant: "destructive"
                          });
                          return;
                        }
                        
                        saveWeight(localWeight);
                        e.currentTarget.blur();
                      }
                    }}
                    className={`text-center text-xl font-bold text-purple-800 border-2 border-purple-300 focus:border-purple-500 ${
                      isGLS && localWeight && parseFloat(localWeight) > 40 ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                    data-testid={`weight-input-${index + 1}`}
                  />
                  <span className="text-xl font-bold text-purple-800">kg</span>
                </div>
                {localWeight && parseFloat(localWeight) > 40 && (
                  <div className="text-xs text-red-600 flex items-center gap-1 font-semibold">
                    <AlertCircle className="h-3 w-3" />
                    Exceeds GLS 40kg limit
                  </div>
                )}
                {carton.aiWeightCalculation && (
                  <div className="text-xs text-purple-700 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    AI calculated
                    {carton.volumeUtilization && (
                      <span className="ml-1">
                        - {parseFloat(carton.volumeUtilization).toFixed(1)}% utilization
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Weight (kg)
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.001"
                placeholder="0.000"
                value={localWeight}
                onChange={(e) => {
                  setLocalWeight(e.target.value);
                }}
                onBlur={(e) => {
                  saveWeight(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveWeight(localWeight);
                    e.currentTarget.blur();
                  }
                }}
                className="text-center text-xl font-bold text-purple-800 border-2 border-purple-300 focus:border-purple-500"
                data-testid={`weight-input-${index + 1}`}
              />
              <span className="text-xl font-bold text-purple-800">kg</span>
            </div>
            {carton.aiWeightCalculation && (
              <div className="text-xs text-purple-700 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                AI calculated
                {carton.volumeUtilization && (
                  <span className="ml-1">
                    - {parseFloat(carton.volumeUtilization).toFixed(1)}% utilization
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// Utility function to open PDF and trigger print dialog immediately
const openPDFAndPrint = (url: string) => {
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};

// Function to merge multiple PDFs and images into one and open for printing
const mergeAndPrintPDFs = async (pdfUrls: string[]) => {
  try {
    if (pdfUrls.length === 0) {
      throw new Error('No files to merge');
    }

    console.log('Starting file merge for', pdfUrls.length, 'files:', pdfUrls);
    
    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();
    
    // Fetch and merge each PDF or image
    for (let i = 0; i < pdfUrls.length; i++) {
      const url = pdfUrls[i];
      try {
        console.log(`Fetching file ${i + 1}/${pdfUrls.length}:`, url);
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error(`Failed to fetch file from ${url}:`, response.status, response.statusText);
          continue; // Skip this file and continue with others
        }
        
        const contentType = response.headers.get('content-type') || '';
        const fileBytes = await response.arrayBuffer();
        console.log(`Loaded ${fileBytes.byteLength} bytes from ${url} (${contentType})`);
        
        // Handle PDFs
        if (contentType.includes('pdf')) {
          const pdf = await PDFDocument.load(fileBytes);
          const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
          console.log(`Merged ${copiedPages.length} PDF pages from ${url}`);
        }
        // Handle images (JPG, PNG, etc.)
        else if (contentType.includes('image')) {
          let image;
          
          // Embed the appropriate image type
          if (contentType.includes('jpeg') || contentType.includes('jpg')) {
            image = await mergedPdf.embedJpg(fileBytes);
          } else if (contentType.includes('png')) {
            image = await mergedPdf.embedPng(fileBytes);
          } else {
            console.warn(`Unsupported image type: ${contentType} for ${url}`);
            continue;
          }
          
          // Create a page that fits the image
          const page = mergedPdf.addPage([image.width, image.height]);
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
          });
          console.log(`Added image as PDF page from ${url} (${image.width}x${image.height})`);
        }
        else {
          console.warn(`Skipping unsupported file type: ${url} (${contentType})`);
          continue;
        }
      } catch (fileError) {
        console.error(`Error processing file ${url}:`, fileError);
        // Continue with other files
      }
    }
    
    const pageCount = mergedPdf.getPageCount();
    if (pageCount === 0) {
      throw new Error('No pages were successfully merged');
    }
    
    console.log(`Saving merged PDF with ${pageCount} total pages`);
    
    // Save the merged PDF
    const mergedPdfBytes = await mergedPdf.save();
    const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    
    console.log('Opening merged PDF for printing');
    
    // Open and print
    const printWindow = window.open(blobUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    
    // Clean up after a delay
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch (error) {
    console.error('Error merging files:', error);
    throw error;
  }
};

// Unified Documents List Component
function UnifiedDocumentsList({
  orderId,
  orderItems,
  printedDocuments,
  printedProductFiles,
  printedOrderFiles,
  onPackingListPrinted,
  onProductFilePrinted,
  onOrderFilePrinted,
  onGetDocumentCount
}: {
  orderId: string;
  orderItems: any[];
  printedDocuments: { packingList: boolean };
  printedProductFiles: Set<string>;
  printedOrderFiles: Set<string>;
  onPackingListPrinted: () => void;
  onProductFilePrinted: (fileId: string) => void;
  onOrderFilePrinted: (fileId: string) => void;
  onGetDocumentCount?: (count: number, urls: string[]) => void;
}) {
  // Fetch product documents
  const productIds = useMemo(
    () => Array.from(new Set(orderItems.map((item: any) => item.productId))).filter(Boolean),
    [orderItems]
  );

  const { data: allFilesRaw = [], isLoading: isLoadingProductDocs } = useQuery<any[]>({
    queryKey: ['/api/product-files'],
    enabled: productIds.length > 0,
  });

  const productFiles = useMemo(() => {
    const productIdSet = new Set(productIds);
    const packingRelevantFileTypes = ['certificate', 'sds'];
    
    return allFilesRaw.filter(file => 
      productIdSet.has(file.productId) && 
      file.isActive && 
      packingRelevantFileTypes.includes(file.fileType)
    );
  }, [allFilesRaw, productIds]);

  // Fetch order files
  const { data: orderFilesData, isLoading: isLoadingOrderFiles } = useQuery({
    queryKey: ['/api/orders', orderId, 'files'],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}/files`);
      if (!response.ok) throw new Error('Failed to fetch order files');
      return response.json();
    }
  });

  const orderFiles = orderFilesData || [];

  // Calculate total document count and collect all PDF URLs (MUST be before early return)
  const totalDocuments = 1 + productFiles.length + orderFiles.length; // 1 for packing list
  
  // Collect all PDF URLs for merging (MUST be before early return)
  const allPdfUrls = useMemo(() => {
    const urls: string[] = [`/api/orders/${orderId}/packing-list.pdf`];
    productFiles.forEach((file: any) => {
      if (file.fileUrl || file.url) {
        urls.push(file.fileUrl || file.url);
      }
    });
    orderFiles.forEach((file: any) => {
      if ((file.fileUrl || file.url) && !file.mimeType?.startsWith('image/')) {
        urls.push(file.fileUrl || file.url);
      }
    });
    return urls;
  }, [orderId, productFiles, orderFiles]);

  // Notify parent about document count and URLs (MUST be before early return)
  useEffect(() => {
    if (onGetDocumentCount) {
      onGetDocumentCount(totalDocuments, allPdfUrls);
    }
  }, [totalDocuments, allPdfUrls, onGetDocumentCount]);

  const FILE_TYPE_ICONS: Record<string, any> = {
    sds: Shield,
    cpnp: Award,
    flyer: FileImage,
    certificate: Award,
    manual: Book,
    other: FileText,
  };

  const LANGUAGE_FLAGS: Record<string, string> = {
    en: '🇬🇧',
    de: '🇩🇪',
    cs: '🇨🇿',
    fr: '🇫🇷',
    vn: '🇻🇳',
  };

  if (isLoadingProductDocs || isLoadingOrderFiles) {
    return (
      <div className="text-sm text-gray-500 p-2 text-center">
        Loading documents...
      </div>
    );
  }

  const DocumentRow = ({ 
    icon, 
    name, 
    subtitle, 
    isPrinted, 
    onPrint, 
    onView, 
    testId 
  }: { 
    icon: React.ReactNode; 
    name: string; 
    subtitle?: string; 
    isPrinted: boolean; 
    onPrint: () => void; 
    onView: () => void; 
    testId?: string;
  }) => (
    <div 
      className={`p-3 rounded-lg border transition-colors ${
        isPrinted
          ? 'bg-green-50 border-green-300'
          : 'bg-white border-gray-200 hover:border-emerald-300'
      }`}
      data-testid={testId}
    >
      {/* Top Row: Icon + Name */}
      <div className="flex items-start gap-3 mb-2">
        {/* Icon/Thumbnail */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gradient-to-br border flex items-center justify-center ${
          isPrinted
            ? 'from-green-50 to-emerald-50 border-green-300'
            : 'from-emerald-50 to-green-50 border-emerald-200'
        }`}>
          {icon}
        </div>
        
        {/* Document Name - Full Width */}
        <div className="flex-1 min-w-0">
          <p className={`text-base font-medium leading-snug ${isPrinted ? 'text-green-900' : 'text-black'}`}>
            {name}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-600 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Bottom Row: Buttons */}
      <div className="flex gap-2">
        {/* View Button */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs font-semibold flex-1 hover:bg-gray-100 hover:border-gray-300"
          onClick={onView}
          data-testid={`${testId}-view`}
        >
          <Eye className="h-3.5 w-3.5 mr-1" />
          View
        </Button>

        {/* Print Button */}
        <Button 
          variant={isPrinted ? "default" : "outline"}
          size="sm"
          className={`h-8 px-3 text-xs font-semibold flex-1 ${
            isPrinted
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
          }`}
          onClick={onPrint}
          data-testid={`${testId}-print`}
        >
          {isPrinted ? (
            <>
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              Printed
            </>
          ) : (
            <>
              <Printer className="h-3.5 w-3.5 mr-1" />
              Print
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      {/* Packing List */}
      <DocumentRow
        icon={<FileText className={`h-5 w-5 ${printedDocuments.packingList ? 'text-green-600' : 'text-emerald-600'}`} />}
        name="Packing List"
        isPrinted={printedDocuments.packingList}
        onPrint={onPackingListPrinted}
        onView={() => window.open(`/api/orders/${orderId}/packing-list.pdf`, '_blank')}
        testId="doc-packing-list"
      />

      {/* Product Documents */}
      {productFiles.map((file: any) => {
        const Icon = FILE_TYPE_ICONS[file.fileType] || FileText;
        const flag = file.language ? (LANGUAGE_FLAGS[file.language] || '🌐') : '';
        const isPrinted = printedProductFiles.has(file.id);
        const subtitle = flag ? `${flag} ${file.language?.toUpperCase()}` : undefined;
        
        return (
          <DocumentRow
            key={file.id}
            icon={<Icon className={`h-5 w-5 ${isPrinted ? 'text-green-600' : 'text-teal-600'}`} />}
            name={file.description || file.fileName}
            subtitle={subtitle}
            isPrinted={isPrinted}
            onPrint={() => {
              openPDFAndPrint(file.fileUrl || file.url);
              onProductFilePrinted(file.id);
            }}
            onView={() => window.open(file.fileUrl || file.url, '_blank')}
            testId={`doc-product-${file.id}`}
          />
        );
      })}

      {/* Order Files */}
      {orderFiles.map((file: any, index: number) => {
        const fileId = file.id || `file-${index}`;
        const isPrinted = printedOrderFiles.has(fileId);
        
        return (
          <DocumentRow
            key={fileId}
            icon={
              file.mimeType?.startsWith('image/') ? (
                <img 
                  src={file.fileUrl || file.url}
                  alt={file.fileName || file.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <FileText className={`h-5 w-5 ${isPrinted ? 'text-green-600' : 'text-gray-600'}`} />
              )
            }
            name={file.fileName || file.name}
            isPrinted={isPrinted}
            onPrint={() => {
              openPDFAndPrint(file.fileUrl || file.url);
              onOrderFilePrinted(fileId);
            }}
            onView={() => window.open(file.fileUrl || file.url, '_blank')}
            testId={`doc-order-${index}`}
          />
        );
      })}
    </div>
  );
}

// Component to display product documents
function ProductDocumentsSelector({ 
  orderItems,
  printedFiles,
  onFilePrinted
}: {
  orderItems: any[];
  printedFiles: Set<string>;
  onFilePrinted: (fileId: string) => void;
}) {
  const productIds = useMemo(
    () => Array.from(new Set(orderItems.map((item: any) => item.productId))).filter(Boolean),
    [orderItems]
  );

  const { data: allFilesRaw = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/product-files'],
    enabled: productIds.length > 0,
  });

  const productFiles = useMemo(() => {
    const productIdSet = new Set(productIds);
    // In packing mode, only show documents that need to be physically sent with the shipment
    // SDS (Safety Data Sheets) and quality certificates are typically sent to customers
    // CPNP certificates and PIFs are internal documents not sent with shipments
    const packingRelevantFileTypes = ['certificate', 'sds'];
    
    return allFilesRaw.filter(file => 
      productIdSet.has(file.productId) && 
      file.isActive && 
      packingRelevantFileTypes.includes(file.fileType)
    );
  }, [allFilesRaw, productIds]);

  const handlePrint = (fileId: string, fileUrl: string) => {
    openPDFAndPrint(fileUrl);
    onFilePrinted(fileId);
  };

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500 p-2 text-center" data-testid="loading-product-docs">
        Loading documents...
      </div>
    );
  }

  if (productFiles.length === 0) {
    return null;
  }

  const FILE_TYPE_ICONS: Record<string, any> = {
    sds: Shield,
    cpnp: Award,
    flyer: FileImage,
    certificate: Award,
    manual: Book,
    other: FileText,
  };

  const LANGUAGE_FLAGS: Record<string, string> = {
    en: '🇬🇧',
    de: '🇩🇪',
    cs: '🇨🇿',
    fr: '🇫🇷',
    vn: '🇻🇳',
  };

  return (
    <div className="space-y-2 mt-3">
      <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/50">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-blue-600" />
          <div className="text-sm font-semibold text-blue-900">Files Sent</div>
        </div>
        <div className="text-xs font-medium text-blue-700 mb-2">Product Documents ({productFiles.length})</div>
        <div className="space-y-1.5">
          {productFiles.map((file: any) => {
        const Icon = FILE_TYPE_ICONS[file.fileType] || FileText;
        const flag = file.language ? (LANGUAGE_FLAGS[file.language] || '🌐') : '';
        const isPrinted = printedFiles.has(file.id);
        
        return (
          <div
            key={file.id}
            className={`p-3 rounded-lg border transition-colors ${
              isPrinted
                ? 'bg-green-50 border-green-300'
                : 'bg-white border-gray-200 hover:border-teal-200'
            }`}
            data-testid={`product-doc-${file.id}`}
          >
            {/* Top Row: Icon + Name */}
            <div className="flex items-start gap-3 mb-2">
              {/* Icon */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gradient-to-br ${
                isPrinted ? 'from-green-50 to-emerald-50 border-green-300' : 'from-teal-50 to-cyan-50 border-teal-200'
              } border flex items-center justify-center`}>
                <Icon className={`h-5 w-5 ${isPrinted ? 'text-green-600' : 'text-teal-500'}`} />
              </div>
              
              {/* Document Info - Full Width */}
              <div className="flex-1 min-w-0">
                <p className={`text-base font-medium leading-snug ${isPrinted ? 'text-green-900' : 'text-black'}`}>
                  {file.description || file.fileName}
                </p>
                {flag && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    {flag} {file.language?.toUpperCase()}
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Row: Button */}
            <div className="flex">
              <Button
                variant={isPrinted ? "default" : "outline"}
                size="sm"
                className={`h-8 px-3 text-xs font-semibold flex-1 ${
                  isPrinted
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300'
                }`}
                onClick={() => handlePrint(file.id, file.fileUrl || file.url)}
                data-testid={`button-print-product-doc-${file.id}`}
              >
                {isPrinted ? (
                  <>
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                    Printed
                  </>
                ) : (
                  <>
                    <Printer className="h-3.5 w-3.5 mr-1.5" />
                    Print
                  </>
                )}
              </Button>
            </div>
          </div>
        );
      })}
        </div>
      </div>
    </div>
  );
}

// Component to display all order files and documents
function OrderFilesDisplay({ 
  orderId,
  printedFiles,
  onFilePrinted
}: { 
  orderId: string;
  printedFiles: Set<string>;
  onFilePrinted: (fileId: string) => void;
}) {
  const { data: orderFilesData, isLoading } = useQuery({
    queryKey: ['/api/orders', orderId, 'files'],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}/files`);
      if (!response.ok) throw new Error('Failed to fetch order files');
      return response.json();
    }
  });

  const handlePrint = (fileId: string, fileUrl: string) => {
    openPDFAndPrint(fileUrl);
    onFilePrinted(fileId);
  };

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500 p-2 text-center" data-testid="loading-order-files">
        Loading files...
      </div>
    );
  }

  const files = orderFilesData || [];
  
  if (files.length === 0) {
    return (
      <div className="mt-3">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Order Files</div>
        <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg border border-gray-200" data-testid="no-order-files">
          No files attached to this order
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-3">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Files</div>
      {files.map((file: any, index: number) => {
        const fileId = file.id || `file-${index}`;
        const isPrinted = printedFiles.has(fileId);
        
        return (
          <div 
            key={fileId}
            className={`p-3 rounded-lg border transition-colors ${
              isPrinted
                ? 'bg-green-50 border-green-300'
                : 'bg-white border-gray-200 hover:border-emerald-300'
            }`}
          >
            {/* Top Row: Icon + Name */}
            <div className="flex items-start gap-3 mb-2">
              {/* File Thumbnail */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-md overflow-hidden border ${
                isPrinted ? 'bg-green-100 border-green-300' : 'bg-gray-100 border-gray-200'
              }`}>
                {file.mimeType?.startsWith('image/') ? (
                  <img 
                    src={file.fileUrl || file.url}
                    alt={file.fileName || file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                    <FileText className={`h-5 w-5 ${isPrinted ? 'text-green-600' : 'text-gray-500'}`} />
                  </div>
                )}
              </div>
              
              {/* File Name - Full Width */}
              <div className="flex-1 min-w-0">
                <p className={`text-base font-medium leading-snug ${isPrinted ? 'text-green-900' : 'text-black'}`} title={file.fileName || file.name}>
                  {file.fileName || file.name}
                </p>
              </div>
            </div>

            {/* Bottom Row: Button */}
            <div className="flex">
              <Button
                variant={isPrinted ? "default" : "outline"}
                size="sm"
                className={`h-8 px-3 text-xs font-semibold flex-1 ${
                  isPrinted
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                }`}
                onClick={() => handlePrint(fileId, file.fileUrl || file.url)}
                data-testid={`button-print-file-${index}`}
              >
                {isPrinted ? (
                  <>
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                    Printed
                  </>
                ) : (
                  <>
                    <Printer className="h-3.5 w-3.5 mr-1.5" />
                    Print
                  </>
                )}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PickPack() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<'overview' | 'pending' | 'picking' | 'packing' | 'ready'>(() => {
    // Load selected tab from localStorage
    const saved = localStorage.getItem('pickpack-selected-tab');
    return (saved as any) || 'overview';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activePickingOrder, setActivePickingOrder] = useState<PickPackOrder | null>(null);
  const [activePackingOrder, setActivePackingOrder] = useState<PickPackOrder | null>(null);
  // Track which tab the user was on when they started picking/packing
  const [originatingTab, setOriginatingTab] = useState<'overview' | 'pending' | 'picking' | 'packing' | 'ready'>('overview');
  const [showPickingCompletionModal, setShowPickingCompletionModal] = useState(false);
  const [showPackingCompletionModal, setShowPackingCompletionModal] = useState(false);
  const [justCompletedPackingOrderId, setJustCompletedPackingOrderId] = useState<string | null>(null);
  const [showItemOverviewModal, setShowItemOverviewModal] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [overviewBarcodeInput, setOverviewBarcodeInput] = useState(''); // Barcode for overview modal
  const [selectedBatchOrders, setSelectedBatchOrders] = useState<string[]>([]);
  const [packingTimer, setPackingTimer] = useState(0);
  const [isPackingTimerRunning, setIsPackingTimerRunning] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [recentlyScannedItemId, setRecentlyScannedItemId] = useState<string | null>(null);
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
  const overviewBarcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // State for packing process
  const [packingChecklist, setPackingChecklist] = useState({
    itemsVerified: false,
    packingSlipIncluded: false,
    boxSealed: false,
    weightRecorded: false,
    fragileProtected: false,
    promotionalMaterials: false
  });
  
  // State for packing materials checklist
  const [packingMaterialsApplied, setPackingMaterialsApplied] = useState<Record<string, boolean>>({});
  
  // State for document printing checklist
  const [printedDocuments, setPrintedDocuments] = useState({
    packingList: false
  });
  
  // State for tracking printed files
  const [printedProductFiles, setPrintedProductFiles] = useState<Set<string>>(new Set());
  const [printedOrderFiles, setPrintedOrderFiles] = useState<Set<string>>(new Set());
  const [printedPPLLabels, setPrintedPPLLabels] = useState<Set<string>>(new Set()); // Track printed PPL labels by tracking number
  const [shipmentLabelsFromDB, setShipmentLabelsFromDB] = useState<any[]>([]); // Shipment labels from database
  const [labelPreviewData, setLabelPreviewData] = useState<{ orderId: string; labelBase64: string; trackingNumbers: string[] } | null>(null);
  const lastSubmittedTrackingRef = useRef<Record<string, string | null>>({}); // Track last submitted tracking number per carton to prevent duplicates
  
  // State for documents count and merging
  const [documentsCount, setDocumentsCount] = useState(0);
  const [allDocumentUrls, setAllDocumentUrls] = useState<string[]>([]);
  const [isPrintingAllDocuments, setIsPrintingAllDocuments] = useState(false);
  
  // Loading states for shipping label operations
  const [isGeneratingAllLabels, setIsGeneratingAllLabels] = useState(false);
  const [isPrintingAllLabels, setIsPrintingAllLabels] = useState(false);
  const [generatingLabelForCarton, setGeneratingLabelForCarton] = useState<Record<string, boolean>>({});
  const [deletingShipment, setDeletingShipment] = useState<Record<string, boolean>>({});
  
  const [selectedBoxSize, setSelectedBoxSize] = useState<string>('');
  const [packageWeight, setPackageWeight] = useState<string>('');
  const [verifiedItems, setVerifiedItems] = useState<Record<string, number>>({});
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(new Set());
  const [bundlePickedItems, setBundlePickedItems] = useState<Record<string, Set<string>>>({}); // itemId -> Set of picked bundle item ids
  const [expandedOverviewItems, setExpandedOverviewItems] = useState<Set<string>>(() => {
    // Load expanded items state from localStorage on mount
    try {
      const saved = localStorage.getItem('pickpack-expanded-overview-items');
      if (saved) {
        const parsed = JSON.parse(saved);
        return new Set(parsed);
      }
    } catch (error) {
      console.error('Failed to load expanded overview items from localStorage:', error);
    }
    return new Set();
  });
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
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
  
  // Multi-carton state
  const [cartons, setCartons] = useState<OrderCarton[]>([]);
  const [cartonsDraft, setCartonsDraft] = useState<OrderCarton[]>([]);
  const [isCartonSectionCollapsed, setIsCartonSectionCollapsed] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  
  // Controlled state for tracking number inputs (key: cartonId, value: tracking number)
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  
  // Shipping labels state
  const [shippingLabels, setShippingLabels] = useState<Array<{ id: string; labelNumber: number }>>([]);
  
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
  
  // Track guide collapse state (persisted across all packing sessions)
  const [isGuideCollapsed, setIsGuideCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('pickpack-guide-collapsed');
    return saved === 'true';
  });
  
  // Track guide dismissed state (permanently hidden until user clears localStorage)
  const [isGuideDismissed, setIsGuideDismissed] = useState<boolean>(() => {
    const saved = localStorage.getItem('pickpack-mobile-guide-dismissed');
    return saved === 'true';
  });
  
  // Track orders being sent back to pick (for instant UI update)
  const [ordersSentBack, setOrdersSentBack] = useState<Set<string>>(new Set());
  
  // Track orders being returned to packing (for instant UI update)
  const [ordersReturnedToPacking, setOrdersReturnedToPacking] = useState<Set<string>>(new Set());
  
  // Packing optimization hook
  const { 
    packingPlan, 
    setPackingPlan, 
    runPackingOptimization: runOptimization,
    isLoading: isPackingOptimizationLoading 
  } = usePackingOptimization();
  
  // Workflow management state
  const [orderToHold, setOrderToHold] = useState<PickPackOrder | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<PickPackOrder | null>(null);
  
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

  // Helper functions for persisting packing state (per order)
  const savePackingState = (orderId: string, key: string, value: any) => {
    try {
      localStorage.setItem(`packing-${orderId}-${key}`, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to save packing state for ${key}:`, error);
    }
  };

  const loadPackingState = <T,>(orderId: string, key: string, defaultValue: T): T => {
    try {
      const saved = localStorage.getItem(`packing-${orderId}-${key}`);
      if (saved) {
        return JSON.parse(saved) as T;
      }
    } catch (error) {
      console.error(`Failed to load packing state for ${key}:`, error);
    }
    return defaultValue;
  };

  const clearPackingState = (orderId: string) => {
    const keysToRemove = [
      'verifiedItems', 'expandedBundles', 'bundlePickedItems', 'showBarcodeScanner',
      'cartons', 'packingChecklist', 'packingMaterialsApplied', 'printedDocuments',
      'printedProductFiles', 'printedOrderFiles', 'printedPPLLabels'
    ];
    keysToRemove.forEach(key => {
      localStorage.removeItem(`packing-${orderId}-${key}`);
    });
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

  // Save expanded overview items state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('pickpack-expanded-overview-items', JSON.stringify(Array.from(expandedOverviewItems)));
    } catch (error) {
      console.error('Failed to save expanded overview items to localStorage:', error);
    }
  }, [expandedOverviewItems]);

  // Save selected tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pickpack-selected-tab', selectedTab);
  }, [selectedTab]);

  // Save guide collapsed state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pickpack-guide-collapsed', isGuideCollapsed.toString());
  }, [isGuideCollapsed]);

  // Save guide dismissed state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pickpack-mobile-guide-dismissed', isGuideDismissed.toString());
  }, [isGuideDismissed]);

  // Load packing state when activePackingOrder changes
  useEffect(() => {
    if (activePackingOrder?.id) {
      const orderId = activePackingOrder.id;
      
      // Load all packing state from localStorage
      // NOTE: For cartons, localStorage is only a BACKUP - database is loaded separately via useQuery
      const loadedVerifiedItems = loadPackingState(orderId, 'verifiedItems', {});
      const loadedExpandedBundles = loadPackingState(orderId, 'expandedBundles', []);
      const loadedBundlePickedItems = loadPackingState(orderId, 'bundlePickedItems', {});
      const loadedShowBarcode = loadPackingState(orderId, 'showBarcodeScanner', false);
      const loadedPackingChecklist = loadPackingState(orderId, 'packingChecklist', {
        itemsVerified: false,
        packingSlipIncluded: false,
        boxSealed: false,
        weightRecorded: false,
        fragileProtected: false,
        promotionalMaterials: false
      });
      const loadedPackingMaterials = loadPackingState(orderId, 'packingMaterialsApplied', {});
      const loadedPrintedDocs = loadPackingState(orderId, 'printedDocuments', { packingList: false });
      const loadedPrintedProductFiles = loadPackingState(orderId, 'printedProductFiles', []);
      const loadedPrintedOrderFiles = loadPackingState(orderId, 'printedOrderFiles', []);
      const loadedPrintedPPLLabels = loadPackingState(orderId, 'printedPPLLabels', []);
      
      // CRITICAL: Load manual modification flag to prevent AI recalculation
      const loadedManualFlag = loadPackingState(orderId, 'hasManuallyModifiedCartons', false);
      
      // Set states
      setVerifiedItems(loadedVerifiedItems);
      setExpandedBundles(new Set(loadedExpandedBundles));
      
      // Convert bundlePickedItems back to Sets
      const bundlePickedItemsWithSets: Record<string, Set<string>> = {};
      Object.entries(loadedBundlePickedItems).forEach(([key, value]) => {
        bundlePickedItemsWithSets[key] = new Set(value as string[]);
      });
      setBundlePickedItems(bundlePickedItemsWithSets);
      
      setShowBarcodeScanner(loadedShowBarcode);
      
      // NOTE: Cartons are loaded from DATABASE via useQuery hook (see sync effect below)
      // localStorage is used as backup only, updated after successful DB saves
      
      setPackingChecklist(loadedPackingChecklist);
      setPackingMaterialsApplied(loadedPackingMaterials);
      setPrintedDocuments(loadedPrintedDocs);
      setPrintedProductFiles(new Set(loadedPrintedProductFiles));
      setPrintedOrderFiles(new Set(loadedPrintedOrderFiles));
      setPrintedPPLLabels(new Set(loadedPrintedPPLLabels));
      
      // CRITICAL: Restore manual modification flag to prevent AI interference
      setHasManuallyModifiedCartons(loadedManualFlag);
      console.log(`🔒 Loaded hasManuallyModifiedCartons for order ${orderId}:`, loadedManualFlag);
      
      // Mark this order as having completed initial load
      initialLoadedOrders.current.add(orderId);
    }
  }, [activePackingOrder?.id]);

  // Save packing state whenever it changes
  useEffect(() => {
    if (activePackingOrder?.id) {
      savePackingState(activePackingOrder.id, 'verifiedItems', verifiedItems);
    }
  }, [verifiedItems, activePackingOrder?.id]);

  useEffect(() => {
    if (activePackingOrder?.id) {
      savePackingState(activePackingOrder.id, 'expandedBundles', Array.from(expandedBundles));
    }
  }, [expandedBundles, activePackingOrder?.id]);

  useEffect(() => {
    if (activePackingOrder?.id) {
      // Convert Sets to arrays for storage
      const bundlePickedItemsForStorage: Record<string, string[]> = {};
      Object.entries(bundlePickedItems).forEach(([key, value]) => {
        bundlePickedItemsForStorage[key] = Array.from(value);
      });
      savePackingState(activePackingOrder.id, 'bundlePickedItems', bundlePickedItemsForStorage);
    }
  }, [bundlePickedItems, activePackingOrder?.id]);

  useEffect(() => {
    if (activePackingOrder?.id) {
      savePackingState(activePackingOrder.id, 'showBarcodeScanner', showBarcodeScanner);
    }
  }, [showBarcodeScanner, activePackingOrder?.id]);

  // NOTE: Cartons are NOT saved to localStorage - database is the single source of truth
  // They are automatically saved through mutations (updateCartonMutation, createCartonMutation, deleteCartonMutation)
  // and loaded via the useQuery hook below

  useEffect(() => {
    if (activePackingOrder?.id) {
      savePackingState(activePackingOrder.id, 'packingChecklist', packingChecklist);
    }
  }, [packingChecklist, activePackingOrder?.id]);

  useEffect(() => {
    if (activePackingOrder?.id) {
      savePackingState(activePackingOrder.id, 'packingMaterialsApplied', packingMaterialsApplied);
    }
  }, [packingMaterialsApplied, activePackingOrder?.id]);

  useEffect(() => {
    if (activePackingOrder?.id) {
      savePackingState(activePackingOrder.id, 'printedDocuments', printedDocuments);
    }
  }, [printedDocuments, activePackingOrder?.id]);

  useEffect(() => {
    if (activePackingOrder?.id) {
      savePackingState(activePackingOrder.id, 'printedProductFiles', Array.from(printedProductFiles));
    }
  }, [printedProductFiles, activePackingOrder?.id]);

  useEffect(() => {
    if (activePackingOrder?.id) {
      savePackingState(activePackingOrder.id, 'printedOrderFiles', Array.from(printedOrderFiles));
    }
  }, [printedOrderFiles, activePackingOrder?.id]);

  useEffect(() => {
    if (activePackingOrder?.id) {
      savePackingState(activePackingOrder.id, 'printedPPLLabels', Array.from(printedPPLLabels));
    }
  }, [printedPPLLabels, activePackingOrder?.id]);

  // Packing optimization wrapper function
  const runPackingOptimization = () => {
    if (!activePackingOrder || !activePackingOrder.items || activePackingOrder.items.length === 0) {
      toast({
        title: "Error",
        description: "No items to pack in the current order",
        variant: "destructive",
      });
      return;
    }

    const items = activePackingOrder.items.map(item => ({
      productId: item.productId || '',
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      price: item.price || 0
    }));

    // Use the shipping country from the active packing order
    const shippingCountry = activePackingOrder.shippingCountry || 'CZ';

    // Call the shared optimization function
    runOptimization(items, shippingCountry);
  };

  // Track active picking/packing mode for header visibility
  useEffect(() => {
    const isActiveMode = !!(activePickingOrder || activePackingOrder);
    sessionStorage.setItem('pickpack-active-mode', isActiveMode ? 'true' : 'false');
    
    // Also add a class to the body for CSS targeting
    if (isActiveMode) {
      document.body.classList.add('pickpack-active-mode');
    } else {
      document.body.classList.remove('pickpack-active-mode');
    }
    
    // Cleanup when component unmounts
    return () => {
      sessionStorage.removeItem('pickpack-active-mode');
      document.body.classList.remove('pickpack-active-mode');
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

  // Timer effects - update both DOM and state for timer
  useEffect(() => {
    if (isTimerRunning) {
      // Store the start time once
      const startTime = Date.now() - (pickingTimer * 1000);
      
      // Update both state and DOM for timer
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const formatted = formatTimer(elapsed);
        
        // Update the state so React components can use it
        setPickingTimer(elapsed);
        
        // Also update DOM elements directly for performance
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
      setPickingTimer(initialElapsed); // Update state initially
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

  // Auto-pause/resume timer when user navigates away or returns
  useEffect(() => {
    if (!activePackingOrder) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User navigated away - save current state and pause
        setIsPackingTimerRunning(prev => {
          if (prev) {
            console.log('⏸️ Auto-paused packing timer (user navigated away)');
          }
          return false; // Always pause when hidden
        });
      } else {
        // User returned - resume timer
        setIsPackingTimerRunning(prev => {
          if (!prev) {
            console.log('▶️ Auto-resumed packing timer (user returned)');
          }
          return true; // Always resume when visible
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Auto-start timer when entering packing mode
    setIsPackingTimerRunning(true);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activePackingOrder?.id]);

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

  // Auto-focus barcode input when opening item overview modal
  useEffect(() => {
    if (showItemOverviewModal && overviewBarcodeInputRef.current) {
      setTimeout(() => {
        overviewBarcodeInputRef.current?.focus();
      }, 100);
    }
  }, [showItemOverviewModal]);

  // Auto-focus search field when on overview tab
  useEffect(() => {
    if (selectedTab === 'overview' && searchInputRef.current && !activePickingOrder && !activePackingOrder) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [selectedTab, activePickingOrder, activePackingOrder]);

  // Auto-update packingChecklist.itemsVerified based on verifiedItems
  useEffect(() => {
    if (!activePackingOrder || !packingRecommendation) return;
    
    const currentCarton = packingRecommendation.cartons.find(c => c.id === selectedCarton);
    if (!currentCarton) return;
    
    // Calculate if all items are verified
    const allItemsVerified = currentCarton.items.every(item => {
      if (item.isBundle && item.bundleItems && item.bundleItems.length > 0) {
        // For bundles, check if all components have been verified the required number of times
        return item.bundleItems.every((bi: any) => (verifiedItems[`${item.id}-${bi.id}`] || 0) >= bi.quantity);
      }
      // For regular items, check if the item has been verified the required quantity
      return (verifiedItems[item.id] || 0) >= item.quantity;
    });
    
    // Only update if itemsVerified actually changed (prevent infinite loop)
    setPackingChecklist(prev => {
      if (prev.itemsVerified !== allItemsVerified) {
        return { ...prev, itemsVerified: allItemsVerified };
      }
      return prev;
    });
  }, [verifiedItems, activePackingOrder?.id, selectedCarton, packingRecommendation]);

  // Fetch real orders from the API with items and bundle details
  // Real-time data synchronization: refetch every 5 seconds to ensure Pick & Pack always shows latest order data
  const { data: allOrders = [], isLoading, isSuccess } = useQuery({
    queryKey: ['/api/orders/pick-pack'],
    staleTime: 0, // IMPORTANT: Set to 0 to always fetch fresh data (fixes 304 cache issue)
    refetchInterval: 5000, // 5 seconds - real-time updates for active picking/packing
    refetchOnWindowFocus: true, // Always refetch when user returns to tab
    refetchOnMount: true, // Always refetch when component mounts
    gcTime: 0, // Don't cache query results
  });
  
  // Sync activePackingOrder with latest data from query
  // This ensures UI updates automatically when PPL labels are created/cancelled
  useEffect(() => {
    if (activePackingOrder && allOrders.length > 0) {
      const updatedOrder = allOrders.find(o => o.id === activePackingOrder.id);
      if (updatedOrder) {
        // Check if PPL data has changed
        const pplDataChanged = 
          updatedOrder.pplLabelData !== activePackingOrder.pplLabelData ||
          updatedOrder.pplStatus !== activePackingOrder.pplStatus ||
          JSON.stringify(updatedOrder.pplShipmentNumbers) !== JSON.stringify(activePackingOrder.pplShipmentNumbers);
        
        if (pplDataChanged) {
          console.log('🔄 Updating activePackingOrder with fresh PPL data:', {
            oldStatus: activePackingOrder.pplStatus,
            newStatus: updatedOrder.pplStatus,
            oldShipments: activePackingOrder.pplShipmentNumbers,
            newShipments: updatedOrder.pplShipmentNumbers,
            hasLabelData: !!updatedOrder.pplLabelData
          });
          setActivePackingOrder(updatedOrder);
        }
      }
    }
  }, [allOrders, activePackingOrder?.id]);
  
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
  
  // Query for packing materials for the active packing order
  const { data: orderPackingMaterials = [] } = useQuery<Array<{
    id: string;
    name: string;
    imageUrl: string | null;
    instruction: string;
    productName: string;
    quantity: number;
  }>>({
    queryKey: ['/api/orders', activePackingOrder?.id, 'packing-materials'],
    enabled: !!activePackingOrder?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query for GLS default sender address from settings
  const { data: glsSenderAddress } = useQuery<any>({
    queryKey: ['/api/settings/gls_default_sender_address'],
    staleTime: 60 * 60 * 1000, // 1 hour (sender address rarely changes)
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  // Query for DHL default sender address from settings
  const { data: dhlSenderAddress } = useQuery<any>({
    queryKey: ['/api/settings/dhl_default_sender_address'],
    staleTime: 60 * 60 * 1000, // 1 hour (sender address rarely changes)
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  // Query for DHL bank details from settings
  const { data: dhlBankDetails } = useQuery<any>({
    queryKey: ['/api/settings/dhl_bank_details'],
    staleTime: 60 * 60 * 1000, // 1 hour (bank details rarely change)
    refetchInterval: false,
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
  const { data: recommendedCarton } = useQuery<CartonRecommendation>({
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

  // Query for order cartons
  const { data: orderCartons = [], refetch: refetchCartons } = useQuery<OrderCarton[]>({
    queryKey: ['/api/orders', activePackingOrder?.id, 'cartons'],
    enabled: !!activePackingOrder?.id,
    staleTime: 0, // Always refetch when invalidated (important for real-time tracking number updates)
    gcTime: 0, // Don't cache at all - always fetch fresh data
    refetchOnMount: 'always', // Always refetch when component mounts
  });

  // Track which orders we've done initial load for (to merge localStorage with DB on first load only)
  const initialLoadedOrders = useRef(new Set<string>());

  // Sync orderCartons with local cartons state
  // DATABASE IS ALWAYS THE PRIMARY SOURCE OF TRUTH
  useEffect(() => {
    if (!activePackingOrder?.id) return;
    
    // Priority: Database > localStorage
    // 1. If database has data, use it (even if empty array - that's valid state)
    // 2. If database query hasn't loaded yet, wait for it
    // 3. localStorage is only used as offline backup, updated after successful DB saves
    if (orderCartons) {
      console.log(`✅ Syncing ${orderCartons.length} cartons from DATABASE:`, orderCartons.map(c => ({ 
        id: c.id, 
        cartonNumber: c.cartonNumber, 
        trackingNumber: c.trackingNumber 
      })));
      setCartons(orderCartons);
      
      // Also update localStorage backup after successful DB load
      savePackingState(activePackingOrder.id, 'cartons', orderCartons);
    }
  }, [orderCartons, activePackingOrder?.id]);

  // Sync tracking number inputs from database (smart merge that preserves unsaved edits)
  useEffect(() => {
    if (!orderCartons || orderCartons.length === 0) {
      setTrackingInputs(prev => Object.keys(prev).length === 0 ? prev : {});
      return;
    }
    
    setTrackingInputs(prev => {
      const newInputs: Record<string, string> = {};
      
      // Merge server values with existing inputs, preserving unsaved edits
      orderCartons.forEach(carton => {
        const serverValue = carton.trackingNumber || '';
        const localValue = prev[carton.id] || '';
        
        // Only overwrite if local is empty OR local matches server (no unsaved edits)
        if (localValue === '' || localValue === serverValue) {
          newInputs[carton.id] = serverValue;
        } else {
          // Keep unsaved local edit
          newInputs[carton.id] = localValue;
          console.log(`🔒 Preserving unsaved edit for carton ${carton.id}: "${localValue}" (server has "${serverValue}")`);
        }
      });
      
      // Check if there are any differences
      const hasChanges = orderCartons.some(carton => {
        const prevValue = prev[carton.id] || '';
        const newValue = newInputs[carton.id] || '';
        return prevValue !== newValue;
      });
      
      if (!hasChanges && Object.keys(prev).length === orderCartons.length) {
        return prev; // No changes, return same reference to prevent re-render
      }
      
      console.log('🔄 Syncing tracking inputs from DB (smart merge with unsaved edits preserved):', newInputs);
      return newInputs;
    });
  }, [orderCartons]);

  // Sync tracking number ref with server data to prevent stale locks
  useEffect(() => {
    if (orderCartons && orderCartons.length > 0) {
      const newRef: Record<string, string | null> = {};
      orderCartons.forEach(carton => {
        newRef[carton.id] = carton.trackingNumber || null;
      });
      lastSubmittedTrackingRef.current = newRef;
    }
  }, [orderCartons]);

  // Auto-populate shipping labels based on carton count
  useEffect(() => {
    if (cartons.length > 0) {
      // Only update if count is different to avoid unnecessary re-renders
      if (shippingLabels.length !== cartons.length) {
        const labels = Array.from({ length: cartons.length }, (_, i) => ({
          id: `label-${Date.now()}-${i}`,
          labelNumber: i + 1
        }));
        setShippingLabels(labels);
      }
    } else if (shippingLabels.length > 0) {
      // Clear labels if no cartons
      setShippingLabels([]);
    }
  }, [cartons.length]);
  
  // Fetch PPL shipment labels from database with proper refresh function
  const fetchShipmentLabels = useCallback(async () => {
    // Fetch labels whenever we have an active packing order (regardless of pplLabelData)
    // This ensures labels load correctly when returning to packing mode
    if (activePackingOrder?.id) {
      try {
        console.log('🔍 Fetching shipment labels for order:', activePackingOrder.id);
        const res = await fetch(`/api/shipment-labels/order/${activePackingOrder.id}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch labels: ${res.status}`);
        }
        const labels = await res.json();
        console.log('✅ Fetched shipment labels:', labels);
        const activeLabels = labels.filter((l: any) => l.status === 'active');
        console.log('🏷️ Setting active labels:', activeLabels);
        setShipmentLabelsFromDB(activeLabels);
      } catch (err) {
        console.error('❌ Error fetching shipment labels:', err);
        // Set empty array on error to prevent stale data
        setShipmentLabelsFromDB([]);
      }
    } else {
      console.log('⏭️ No active packing order - clearing labels');
      setShipmentLabelsFromDB([]);
    }
  }, [activePackingOrder?.id]);

  // Auto-fetch shipment labels when active order changes
  // This ensures labels reload when navigating back to packing mode
  useEffect(() => {
    fetchShipmentLabels();
    console.log(`📥 Auto-fetching labels for order ${activePackingOrder?.id}`);
  }, [activePackingOrder?.id, fetchShipmentLabels]);

  // Track if we've already auto-applied suggestions for this order
  const [hasAutoAppliedSuggestions, setHasAutoAppliedSuggestions] = useState(false);
  
  // Track if user has manually interacted with cartons (prevents AI auto-recalculation)
  const [hasManuallyModifiedCartons, setHasManuallyModifiedCartons] = useState(false);
  
  // Prevent concurrent carton creation operations
  const [isCreatingCartons, setIsCreatingCartons] = useState(false);

  // Function to recalculate cartons - this will be defined after mutations
  const recalculateCartons = useRef<(() => Promise<void>) | null>(null);

  // Save manual modification flag to localStorage to prevent AI interference on reload
  useEffect(() => {
    if (activePackingOrder?.id && hasManuallyModifiedCartons) {
      savePackingState(activePackingOrder.id, 'hasManuallyModifiedCartons', true);
      console.log(`🔒 Saved hasManuallyModifiedCartons=true for order ${activePackingOrder.id}`);
    }
  }, [hasManuallyModifiedCartons, activePackingOrder?.id]);

  // Detect if order already has cartons in database to prevent AI interference
  useEffect(() => {
    if (!activePackingOrder?.id) return;
    
    // If database has cartons, mark as manually modified to PREVENT AI recalculation
    // This is critical to prevent flickering when navigating back to packing mode
    if (orderCartons && orderCartons.length > 0) {
      const shouldMarkModified = !hasManuallyModifiedCartons;
      if (shouldMarkModified) {
        setHasManuallyModifiedCartons(true);
        savePackingState(activePackingOrder.id, 'hasManuallyModifiedCartons', true);
        console.log(`🔒 Marked as manually modified (${orderCartons.length} cartons exist in DB) - AI BLOCKED`);
      }
    }
  }, [activePackingOrder?.id, orderCartons, hasManuallyModifiedCartons]);

  // Automatically apply AI carton suggestions when they arrive
  useEffect(() => {
    console.log('🔍 Auto-apply effect triggered:', {
      hasOrder: !!activePackingOrder,
      hasRecommendation: !!recommendedCarton,
      hasAutoApplied: hasAutoAppliedSuggestions,
      isCreating: isCreatingCartons,
      isRecalc: isRecalculating,
      hasManualMods: hasManuallyModifiedCartons,
      orderCartonsCount: orderCartons.length,
      localCartonsCount: cartons.length
    });

    if (!activePackingOrder || !recommendedCarton || hasAutoAppliedSuggestions) {
      return;
    }

    // Don't auto-apply if we're already creating cartons or recalculating
    if (isCreatingCartons || isRecalculating) {
      console.log('⏸️ Skipping auto-apply: operation in progress');
      return;
    }
    
    // Don't auto-apply if user has manually modified cartons
    if (hasManuallyModifiedCartons) {
      console.log('⏸️ User has manually modified cartons, skipping auto-apply');
      return;
    }

    // Only auto-apply if we have valid suggestions
    if (!recommendedCarton.suggestions || recommendedCarton.suggestions.length === 0) {
      return;
    }

    // Check if order already has cartons in DATABASE - if so, don't auto-apply
    // Use orderCartons from query, not local state, to avoid race conditions
    if (orderCartons.length > 0) {
      console.log(`⏸️ Order already has ${orderCartons.length} cartons in database, skipping auto-apply`);
      setHasAutoAppliedSuggestions(true);
      return;
    }

    // Mark that we've started auto-applying and prevent concurrent operations
    setHasAutoAppliedSuggestions(true);
    setIsCreatingCartons(true);
    
    console.log(`✅ Auto-applying AI optimization: creating ${recommendedCarton.suggestions.length} optimized carton(s) using DeepSeek AI`);
    
    // Automatically create cartons based on AI suggestions
    const createAndUpdateCartons = async () => {
      try {
        const createdCartons = [];
        
        // Create each carton with complete details from AI suggestions
        for (let i = 0; i < recommendedCarton.suggestions.length; i++) {
          const suggestion = recommendedCarton.suggestions[i];
          const cartonNumber = i + 1;
          
          // Find the carton data for dimensions
          const cartonData = availableCartons?.find((c: any) => c.id === suggestion.cartonId);
          
          console.log(`Creating carton ${cartonNumber}/${recommendedCarton.suggestions.length}`);
          
          const result = await createCartonMutation.mutateAsync({
            orderId: activePackingOrder.id,
            cartonNumber,
            cartonType: 'company',
            cartonId: suggestion.cartonId,
            weight: suggestion.totalWeightKg?.toFixed(3) || '0.000',
            payloadWeightKg: String(suggestion.totalWeightKg || 0),
            innerLengthCm: String(cartonData?.dimensions?.length || cartonData?.innerLengthCm || 0),
            innerWidthCm: String(cartonData?.dimensions?.width || cartonData?.innerWidthCm || 0),
            innerHeightCm: String(cartonData?.dimensions?.height || cartonData?.innerHeightCm || 0),
            source: 'ai',
            aiWeightCalculation: true,
            aiPlanId: `deepseek-${Date.now()}-${i}`,
            itemAllocations: suggestion.items || null,
            volumeUtilization: String(suggestion.volumeUtilization || 0),
            notes: `AI optimized: ${suggestion.volumeUtilization}% utilization`,
            skipRefetch: true
          });
          createdCartons.push(result);
        }
        
        console.log(`✅ All ${createdCartons.length} cartons created successfully`);
        
        // Single refetch after all cartons are created
        queryClient.invalidateQueries({ queryKey: ['/api/orders', activePackingOrder.id, 'cartons'] });
        await refetchCartons();
        playSound('success');
      } catch (error) {
        console.error('❌ Error creating AI cartons:', error);
        toast({
          title: "Error",
          description: "Failed to create AI-suggested cartons",
          variant: "destructive"
        });
      } finally {
        setIsCreatingCartons(false);
      }
    };

    createAndUpdateCartons();
  }, [activePackingOrder?.id, recommendedCarton, orderCartons.length, hasAutoAppliedSuggestions, isCreatingCartons, isRecalculating, hasManuallyModifiedCartons]);

  // Create carton mutation
  const createCartonMutation = useMutation({
    mutationFn: async (data: { 
      orderId: string; 
      cartonNumber: number; 
      cartonType: 'company' | 'non-company'; 
      cartonId?: string; 
      tempId?: string;
      weight?: string;
      payloadWeightKg?: string;
      innerLengthCm?: string;
      innerWidthCm?: string;
      innerHeightCm?: string;
      source?: string;
      aiWeightCalculation?: boolean;
      aiPlanId?: string;
      itemAllocations?: any;
      volumeUtilization?: string;
      notes?: string;
      skipRefetch?: boolean;
    }) => {
      const response = await apiRequest('POST', `/api/orders/${data.orderId}/cartons`, data);
      return await response.json();
    },
    onSuccess: (result, variables) => {
      if (variables.tempId) {
        // Remove draft and update cache directly instead of refetching
        setCartonsDraft(prev => prev.filter(c => c.id !== variables.tempId));
        
        // Update the query cache with the new carton data
        queryClient.setQueryData(
          ['/api/orders', activePackingOrder?.id, 'cartons'],
          (old: any) => {
            if (!old) return [result];
            return [...old, result];
          }
        );
      }
      
      // Only refetch if not part of batch creation (skipRefetch flag) and no tempId (not manual add)
      if (!variables.skipRefetch && !variables.tempId) {
        queryClient.invalidateQueries({ queryKey: ['/api/orders', activePackingOrder?.id, 'cartons'] });
        refetchCartons();
      }
      
      // IMPORTANT: Save to localStorage ONLY after successful database save
      // Database is primary source, localStorage is backup for offline resilience
      if (activePackingOrder?.id) {
        // Get updated cartons from query cache
        const updatedCartons = queryClient.getQueryData<OrderCarton[]>(
          ['/api/orders', activePackingOrder.id, 'cartons']
        );
        if (updatedCartons) {
          savePackingState(activePackingOrder.id, 'cartons', updatedCartons);
          console.log('✅ Cartons saved to localStorage after successful DB save');
        }
      }
    },
    onError: (error, variables) => {
      if (variables.tempId) {
        setCartonsDraft(prev => prev.filter(c => c.id !== variables.tempId));
      }
      toast({
        title: "Error Creating Carton",
        description: error instanceof Error ? error.message : "Failed to create carton",
        variant: "destructive"
      });
    },
  });

  // Utility function to calculate volume utilization from stored item data
  const calculateVolumeUtilization = (
    carton: OrderCarton,
    newCartonData: { innerLengthCm: string; innerWidthCm: string; innerHeightCm: string } | null,
    orderItems: any[]
  ): number | null => {
    if (!newCartonData || !carton.itemAllocations) return null;
    
    try {
      const itemAllocations = typeof carton.itemAllocations === 'string' 
        ? JSON.parse(carton.itemAllocations) 
        : carton.itemAllocations;
      
      if (!Array.isArray(itemAllocations) || itemAllocations.length === 0) return null;
      
      // Calculate total volume of items in this carton
      let totalItemsVolume = 0;
      
      for (const allocation of itemAllocations) {
        const orderItem = orderItems.find((oi: any) => oi.productId === allocation.productId);
        if (!orderItem) continue;
        
        // Get dimensions from order item (AI would have stored these)
        const length = orderItem.lengthCm || orderItem.product?.lengthCm || 10; // fallback
        const width = orderItem.widthCm || orderItem.product?.widthCm || 10;
        const height = orderItem.heightCm || orderItem.product?.heightCm || 10;
        
        const itemVolume = parseFloat(length) * parseFloat(width) * parseFloat(height);
        totalItemsVolume += itemVolume * allocation.quantity;
      }
      
      // Calculate new carton volume
      const cartonVolume = 
        parseFloat(newCartonData.innerLengthCm) *
        parseFloat(newCartonData.innerWidthCm) *
        parseFloat(newCartonData.innerHeightCm);
      
      if (cartonVolume === 0) return null;
      
      // Calculate utilization percentage
      const utilization = (totalItemsVolume / cartonVolume) * 100;
      return Math.round(utilization * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      console.error('Error calculating volume utilization:', error);
      return null;
    }
  };

  // Update carton mutation
  const updateCartonMutation = useMutation({
    mutationFn: async (data: { orderId: string; cartonId: string; updates: Partial<OrderCarton> }) => {
      const response = await apiRequest('PATCH', `/api/orders/${data.orderId}/cartons/${data.cartonId}`, data.updates);
      return await response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/orders', activePackingOrder?.id, 'cartons'] });
      await refetchCartons();
      
      // IMPORTANT: Save to localStorage ONLY after successful database save
      // Database is primary source, localStorage is backup for offline resilience
      if (activePackingOrder?.id) {
        // Wait a bit for refetch to complete
        setTimeout(() => {
          const updatedCartons = queryClient.getQueryData<OrderCarton[]>(
            ['/api/orders', activePackingOrder.id, 'cartons']
          );
          if (updatedCartons) {
            savePackingState(activePackingOrder.id, 'cartons', updatedCartons);
            console.log('✅ Cartons saved to localStorage after successful DB update');
          }
        }, 100);
      }
    },
  });

  // Increment carton usage mutation
  const incrementCartonUsageMutation = useMutation({
    mutationFn: async (cartonId: string) => {
      const response = await apiRequest('POST', `/api/cartons/${cartonId}/increment-usage`, {});
      return await response.json();
    },
  });

  // Delete carton mutation
  const deleteCartonMutation = useMutation({
    mutationFn: async (data: { orderId: string; cartonId: string }) => {
      const response = await apiRequest('DELETE', `/api/orders/${data.orderId}/cartons/${data.cartonId}`);
      return await response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/orders', activePackingOrder?.id, 'cartons'] });
      await refetchCartons();
      
      // IMPORTANT: Save to localStorage ONLY after successful database delete
      // Database is primary source, localStorage is backup for offline resilience
      if (activePackingOrder?.id) {
        // Wait a bit for refetch to complete
        setTimeout(() => {
          const updatedCartons = queryClient.getQueryData<OrderCarton[]>(
            ['/api/orders', activePackingOrder.id, 'cartons']
          );
          if (updatedCartons) {
            savePackingState(activePackingOrder.id, 'cartons', updatedCartons);
            console.log('✅ Cartons saved to localStorage after successful DB delete');
          }
        }, 100);
      }
    },
  });

  // Update carton tracking number mutation
  const updateCartonTrackingMutation = useMutation({
    mutationFn: async ({ cartonId, trackingNumber }: { cartonId: string; trackingNumber: string }) => {
      if (!activePackingOrder?.id) {
        throw new Error('No active packing order');
      }
      console.log(`📤 Saving tracking number for carton ${cartonId}:`, trackingNumber);
      return apiRequest('PATCH', `/api/orders/${activePackingOrder.id}/cartons/${cartonId}`, { trackingNumber });
    },
    onSuccess: async (data, variables) => {
      console.log(`✅ Tracking number saved successfully for carton ${variables.cartonId}`);
      // Invalidate all relevant queries to update UI
      await queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
      if (activePackingOrder?.id) {
        console.log(`🔄 Invalidating and refetching cartons for order ${activePackingOrder.id}`);
        await queryClient.invalidateQueries({ queryKey: ['/api/orders', activePackingOrder.id, 'cartons'] });
        // Force refetch to get updated cartons immediately
        const result = await refetchCartons();
        console.log(`📥 Refetch result:`, result.data);
      }
    },
    onError: (error: any) => {
      console.error(`❌ Failed to save tracking number:`, error);
      toast({
        title: "Failed to Save",
        description: error.message || "Failed to update tracking number",
        variant: "destructive"
      });
    }
  });

  // Unified function to submit tracking number (prevents duplicate saves)
  const submitTrackingNumber = useCallback((cartonId: string, trackingNumber: string, cartonNumber?: number, showToast: boolean = false) => {
    const trimmedValue = trackingNumber.trim();
    if (!trimmedValue) return;

    // Check if this value has already been submitted for this carton
    const lastSubmitted = lastSubmittedTrackingRef.current[cartonId];
    if (lastSubmitted === trimmedValue) {
      console.log(`⏭️ Skipping duplicate save for carton ${cartonId}: ${trimmedValue}`);
      return;
    }

    // Store previous value in case we need to restore on error
    const previousValue = lastSubmittedTrackingRef.current[cartonId];
    
    // Update ref immediately to prevent concurrent submissions
    lastSubmittedTrackingRef.current[cartonId] = trimmedValue;

    // Submit to backend with error handling
    updateCartonTrackingMutation.mutate(
      {
        cartonId,
        trackingNumber: trimmedValue
      },
      {
        onError: () => {
          // Restore previous value so user can retry
          lastSubmittedTrackingRef.current[cartonId] = previousValue;
          console.log(`❌ Save failed, restored previous value for carton ${cartonId}`);
        }
      }
    );
  }, [updateCartonTrackingMutation, toast]);

  // PPL Label mutations
  const createPPLLabelsMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest('POST', `/api/orders/${orderId}/ppl/create-labels`, {});
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "PPL Labels Created",
        description: `Created ${data.shipmentNumbers?.length || 'shipping'} label(s)`,
      });

      // Refetch order to get updated PPL data
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
    },
    onError: (error: any) => {
      console.error('Error creating PPL labels:', error);
      console.error('Error details:', {
        message: error.message,
        hint: error.hint,
        details: error.details,
        fullResponse: error.fullResponse
      });
      
      // Build a detailed error message
      let errorMessage = error.message || "Failed to create PPL labels";
      
      if (error.hint) {
        errorMessage += `\n\n💡 ${error.hint}`;
      }
      
      if (error.details) {
        const details = error.details;
        if (details.status) {
          errorMessage += `\n\nStatus: ${details.status}`;
        }
        if (details.data) {
          const dataStr = typeof details.data === 'string' 
            ? details.data 
            : JSON.stringify(details.data, null, 2);
          errorMessage += `\n\nDetails: ${dataStr}`;
        }
      }
      
      toast({
        title: "PPL Label Creation Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 10000, // Show for 10 seconds to allow reading
      });
    }
  });

  const cancelPPLLabelsMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest('POST', `/api/orders/${orderId}/ppl/cancel-labels`, {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "PPL Labels Cancelled",
        description: "Shipping labels have been cancelled with PPL",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
    },
    onError: (error: any) => {
      console.error('Error cancelling PPL labels:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to cancel PPL labels",
        variant: "destructive"
      });
    }
  });

  const deletePPLLabelsMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest('DELETE', `/api/orders/${orderId}/ppl/labels`, {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "PPL Labels Removed",
        description: "Label data has been removed from the order",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
    onError: (error: any) => {
      console.error('Error deleting PPL labels:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete PPL labels",
        variant: "destructive"
      });
    }
  });

  const retryPPLLabelMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest('POST', `/api/orders/${orderId}/ppl/retry-label`, {});
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "PPL Label Retrieved",
        description: `Successfully retrieved label for batch ${data.batchId}`,
      });

      // Refetch order to get updated PPL data
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
    onError: (error: any) => {
      console.error('Error retrying PPL label:', error);
      console.error('Error details:', {
        message: error.message,
        hint: error.hint,
        details: error.details,
        fullResponse: error.fullResponse
      });
      
      let errorMessage = error.message || "Failed to retrieve PPL label";
      
      if (error.hint) {
        errorMessage += `\n\n💡 ${error.hint}`;
      }
      
      if (error.details) {
        const details = error.details;
        if (details.batchId) {
          errorMessage += `\n\nBatch ID: ${details.batchId}`;
        }
        if (details.status) {
          errorMessage += `\nStatus: ${details.status}`;
        }
      }
      
      toast({
        title: "Label Retrieval Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 10000,
      });
    }
  });


  // Define the actual recalculate function after mutations are available
  recalculateCartons.current = async () => {
    if (!activePackingOrder) return;
    
    // Prevent concurrent operations
    if (isCreatingCartons || isRecalculating) {
      console.log('⏸️ Skipping recalculation - operation already in progress');
      return;
    }
    
    console.log('🔄 Recalculating cartons for order', activePackingOrder.id);
    setIsRecalculating(true);
    setIsCreatingCartons(true);
    
    try {
      // Delete all existing cartons
      if (orderCartons.length > 0) {
        console.log(`Deleting ${orderCartons.length} existing carton(s)`);
        for (const carton of orderCartons) {
          await deleteCartonMutation.mutateAsync({
            orderId: activePackingOrder.id,
            cartonId: carton.id
          });
        }
      }
      
      // Clear local state
      setCartons([]);
      setCartonsDraft([]);
      
      // Wait for cartons to be deleted from database
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/orders', activePackingOrder.id, 'cartons'] 
      });
      await refetchCartons();
      
      // NOW reset the auto-apply flag and other flags
      setHasAutoAppliedSuggestions(false);
      setIsRecalculating(false);
      setIsCreatingCartons(false);
      
      // Force refetch the AI recommendations
      // This will trigger the auto-apply effect since we reset the flags above and cartons are deleted
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/orders', activePackingOrder.id, 'recommend-carton'] 
      });
      await queryClient.refetchQueries({ 
        queryKey: ['/api/orders', activePackingOrder.id, 'recommend-carton'] 
      });
      
    } catch (error) {
      console.error('Error recalculating cartons:', error);
      toast({
        title: "Error",
        description: "Failed to recalculate cartons",
        variant: "destructive"
      });
      // Reset flags on error too
      setIsRecalculating(false);
      setIsCreatingCartons(false);
    }
  };


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
          const currentItemIndex = manualItemIndex;
          setManualItemIndex(Math.min(activePickingOrder.items.length - 1, currentItemIndex + 1));
        }
      }
      
      // Alt + P: Navigate to previous item (when picking)
      if (e.altKey && e.key === 'p') {
        e.preventDefault();
        if (activePickingOrder && !isFormInput) {
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

  // No mock images in production - items without images show default icons

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
          image: null,
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
          image: null,
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
          image: null,
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
          image: null,
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
          image: null
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
          image: null,
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
          image: null,
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
          image: null,
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
          image: null,
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
          image: null,
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
          image: null,
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
          image: null
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
          image: item.image || null, // No mock images - use default icons based on type
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
      paymentStatus: order.paymentStatus,
      // Include dobírka/COD information
      codAmount: order.codAmount,
      codCurrency: order.codCurrency,
      // Include PPL shipping integration fields
      pplBatchId: order.pplBatchId,
      pplShipmentNumbers: order.pplShipmentNumbers,
      pplLabelData: order.pplLabelData,
      pplStatus: order.pplStatus
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

  // Play sound effect using Web Audio API
  const playSound = (type: 'scan' | 'success' | 'error' | 'complete') => {
    if (!audioEnabled) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Set frequency and duration based on sound type
      switch (type) {
        case 'scan':
          // Short beep for successful scan
          oscillator.frequency.value = 800;
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.1);
          console.log('🔊 Playing scan sound (800Hz beep)');
          break;
        case 'success':
          // Rising tone for success
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(900, audioContext.currentTime + 0.15);
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.15);
          console.log('🔊 Playing success sound (rising tone)');
          break;
        case 'error':
          // Low buzzer for error
          oscillator.frequency.value = 200;
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
          console.log('🔊 Playing error sound (low buzzer)');
          break;
        case 'complete':
          // Triple beep for completion
          const times = [0, 0.15, 0.3];
          times.forEach((time, i) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.value = 1000;
            gain.gain.setValueAtTime(0.3, audioContext.currentTime + time);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + time + 0.1);
            osc.start(audioContext.currentTime + time);
            osc.stop(audioContext.currentTime + time + 0.1);
          });
          console.log('🔊 Playing complete sound (triple beep)');
          break;
      }
    } catch (error) {
      console.error('Failed to play sound:', error);
    }
  };

  // Get country code from order
  const getOrderCountryCode = (order: PickPackOrder): string => {
    // Extract country code from order data
    const orderId = order.orderId?.toLowerCase() || '';
    
    // Handle shipping address - can be string (legacy) or object (database)
    let address = '';
    if (typeof order.shippingAddress === 'string') {
      address = order.shippingAddress.toLowerCase();
    } else if (order.shippingAddress && typeof order.shippingAddress === 'object') {
      // If it's an object with a country field, use that directly
      const countryField = (order.shippingAddress as any).country;
      if (countryField) {
        // Try to match the country name to a code
        const countryLower = countryField.toLowerCase();
        // Check if it's already a 2-letter code
        if (countryLower.length === 2) {
          return countryLower.toUpperCase();
        }
        // Otherwise, build the address string for parsing below
        address = countryLower;
      }
    }
    
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
      setVerifiedItems(prev => ({ ...prev, [matchingItem.id]: Math.min((prev[matchingItem.id] || 0) + 1, matchingItem.quantity) }));
      playSound('scan');
    } else {
      playSound('error');
    }

    setBarcodeInput('');
  };

  // Smart Order Scoring Algorithm
  // Considers priority, age, shipping method, and order size
  const calculateOrderScore = (order: PickPackOrder) => {
    let score = 0;
    
    // 1. Priority Weight (40% of score, 0-400 points)
    const priorityScores = { high: 400, medium: 250, low: 100 };
    score += priorityScores[order.priority];
    
    // 2. Age/Urgency Weight (30% of score, 0-300 points)
    // Older orders get higher scores - orders waiting longer should be picked first
    const createdDate = new Date(order.createdAt);
    // Defensive: Handle invalid dates by treating as zero age
    const orderAge = isNaN(createdDate.getTime()) ? 0 : Date.now() - createdDate.getTime();
    const ageInHours = orderAge / (1000 * 60 * 60);
    // Cap at 24 hours for scoring (orders older than 24h get max points)
    // Clamp to ensure no negative scores for future-dated orders
    const ageScore = Math.max(0, Math.min(ageInHours / 24, 1)) * 300;
    score += ageScore;
    
    // 3. Shipping Method Weight (20% of score, 0-200 points)
    // Express/urgent shipping methods get priority
    const shippingMethodLower = (order.shippingMethod || '').toLowerCase();
    if (shippingMethodLower.includes('express') || shippingMethodLower.includes('urgent')) {
      score += 200;
    } else if (shippingMethodLower.includes('priority')) {
      score += 150;
    } else if (shippingMethodLower.includes('standard')) {
      score += 100;
    } else {
      score += 50; // Unknown shipping methods get minimal points
    }
    
    // 4. Order Size Weight (10% of score, 0-100 points)
    // Smaller orders (1-5 items) get slightly higher scores for better flow
    // Medium orders (6-15 items) get standard scores
    // Large orders (16+ items) get lower scores but still positive
    const itemCount = order.totalItems;
    if (itemCount <= 5) {
      score += 100; // Small orders - quick wins
    } else if (itemCount <= 15) {
      score += 75; // Medium orders - standard
    } else {
      score += 50; // Large orders - more effort
    }
    
    return score;
  };

  // Quick Action: Start Next Priority Order
  const startNextPriorityOrder = () => {
    // Find pending orders ready to pick
    const pendingOrders = transformedOrders.filter(o => o.status === 'to_fulfill');
    
    // Use smart scoring to select the best order
    const nextOrder = pendingOrders
      .map(order => ({
        order,
        score: calculateOrderScore(order)
      }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.order)[0];

    if (nextOrder) {
      console.log('Starting next priority order:', nextOrder, 'Score:', calculateOrderScore(nextOrder));
      startPicking(nextOrder);
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
      // Save the current tab so we can return to it later
      setOriginatingTab(selectedTab);
      
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
        // Send pickStartTime directly via apiRequest
        apiRequest('PATCH', `/api/orders/${order.id}`, {
          orderStatus: 'to_fulfill',
          pickStatus: 'in_progress',
          pickStartTime: new Date().toISOString(),
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

    // Save to database in real-time (for non-mock orders)
    if (!activePickingOrder.id.startsWith('mock-')) {
      const isOnline = offlineQueue.getOnlineStatus();
      
      if (isOnline) {
        apiRequest('PATCH', `/api/orders/${activePickingOrder.id}/items/${itemId}`, {
          pickedQuantity: pickedQty
        }).catch(error => {
          console.error('Error saving picked quantity:', error);
          // Queue for offline sync if request fails
          offlineQueue.queueMutation('pick', itemId, 'update', {
            orderId: activePickingOrder.id,
            itemId: itemId,
            pickedQuantity: pickedQty
          });
        });
      } else {
        // Queue mutation for offline sync
        offlineQueue.queueMutation('pick', itemId, 'update', {
          orderId: activePickingOrder.id,
          itemId: itemId,
          pickedQuantity: pickedQty
        });
        playSound('success'); // Provide feedback that action was queued
      }
    }

    // Check if all items are picked
    const allPicked = updatedItems.every(item => item.pickedQuantity >= item.quantity);
    if (allPicked) {
      setIsTimerRunning(false); // Stop the timer when all items are picked
      playSound('success');
    }
  };

  // Complete picking
  // setPackStatus: whether to set packStatus to 'not_started' (true when returning to queue, false when proceeding to packing)
  const completePicking = async (setPackStatus = true) => {
    if (!activePickingOrder) return;

    try {
      setIsTimerRunning(false);
      playSound('complete');
      
      // Clear saved progress since order is completed
      clearPickedProgress(activePickingOrder.id);
      
      // Only update database for real orders (not mock orders)
      if (!activePickingOrder.id.startsWith('mock-')) {
        // Update order to mark picking as completed (non-blocking)
        const updateData: any = {
          pickStatus: 'completed',
          pickEndTime: new Date().toISOString(),
          pickedBy: currentEmployee
        };
        
        // Only set packStatus when returning order to queue (not when proceeding to packing)
        if (setPackStatus) {
          updateData.packStatus = 'not_started';
        }
        
        apiRequest('PATCH', `/api/orders/${activePickingOrder.id}`, updateData).catch(error => {
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
    // Save the current tab so we can return to it later
    // Only preserve the existing originatingTab if we're transitioning from active picking
    if (!activePickingOrder) {
      setOriginatingTab(selectedTab);
    }
    
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
      promotionalMaterials: false
    });
    setPrintedDocuments({
      packingList: false
    });
    setPrintedProductFiles(new Set());
    setPrintedOrderFiles(new Set());
    setShippingLabels([]);
    
    setVerifiedItems({});
    setUseNonCompanyCarton(false);
    setPackageWeight('');
    
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
      selectedDocumentIds?: string[];
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
    
    // CRITICAL: Save any unsaved GLS/DHL tracking numbers before completion
    const shippingMethod = activePackingOrder.shippingMethod?.toUpperCase() || '';
    const isGLS = shippingMethod === 'GLS' || shippingMethod === 'GLS DE' || shippingMethod === 'GLS GERMANY';
    const isDHL = shippingMethod === 'DHL' || shippingMethod === 'DHL DE' || shippingMethod === 'DHL GERMANY' || shippingMethod.includes('DHL');
    
    if ((isGLS || isDHL) && cartons.length > 0) {
      console.log('💾 Saving unsaved GLS/DHL tracking numbers before completion...');
      try {
        // Find all cartons with unsaved tracking numbers
        const unsavedUpdates = cartons.filter(carton => {
          const inputValue = (trackingInputs[carton.id] || '').trim();
          const dbValue = (carton.trackingNumber || '').trim();
          return inputValue !== dbValue && inputValue !== '';
        });
        
        if (unsavedUpdates.length > 0) {
          console.log(`📤 Saving ${unsavedUpdates.length} unsaved tracking number(s)...`);
          // Save each unsaved tracking number
          await Promise.all(
            unsavedUpdates.map(carton => 
              updateCartonTrackingMutation.mutateAsync({
                cartonId: carton.id,
                trackingNumber: trackingInputs[carton.id].trim()
              })
            )
          );
          console.log('✅ All tracking numbers saved successfully');
        } else {
          console.log('✅ All tracking numbers already saved');
        }
      } catch (error) {
        console.error('❌ Failed to save tracking numbers:', error);
        toast({
          title: "Error",
          description: "Failed to save tracking numbers. Please try again.",
          variant: "destructive"
        });
        return; // Abort completion
      }
    }
    
    // Check if all items are verified, including bundle components
    // IMPORTANT: Check activePackingOrder.items (what's shown in UI), NOT currentCarton.items
    const allItemsVerified = activePackingOrder.items.every(item => {
      if (item.isBundle && item.bundleItems && item.bundleItems.length > 0) {
        // For bundles, check if all components have been verified the required number of times
        return item.bundleItems.every((bi: any) => (verifiedItems[`${item.id}-${bi.id}`] || 0) >= bi.quantity);
      }
      // For regular items, check if the item has been verified the required quantity
      return (verifiedItems[item.id] || 0) >= item.quantity;
    });
    
    // Check each required checkbox (only check what's actually visible in the UI)
    const missingChecks = [];
    
    // 1. Items verification
    if (!(packingChecklist.itemsVerified || allItemsVerified)) {
      missingChecks.push('Items Verification');
    }
    
    // 2. Packing list printed
    if (!printedDocuments.packingList) {
      missingChecks.push('Packing List');
    }
    
    // 3. Multi-carton validation
    if (cartons.length === 0) {
      missingChecks.push('At least one carton');
    }
    
    const cartonsWithoutType = cartons.filter(c => !c.cartonId && c.cartonType !== 'non-company');
    if (cartonsWithoutType.length > 0) {
      missingChecks.push(`Carton type for ${cartonsWithoutType.length} carton(s)`);
    }
    
    // Weight is now optional for packing completion
    // It will be required later when generating shipping labels
    
    // Label validation depends on shipping method
    // GLS uses tracking numbers (validated separately), other methods use labelPrinted
    if (!isGLS) {
      const cartonsWithoutLabel = cartons.filter(c => !c.labelPrinted);
      if (cartonsWithoutLabel.length > 0) {
        missingChecks.push(`Label for ${cartonsWithoutLabel.length} carton(s)`);
      }
    } else {
      // For GLS, check tracking numbers from controlled state OR database (fallback)
      const cartonsWithoutTracking = cartons.filter(c => {
        const trackingValue = (trackingInputs[c.id] || c.trackingNumber || '').trim();
        return trackingValue === '';
      });
      if (cartonsWithoutTracking.length > 0) {
        missingChecks.push(`Tracking number for ${cartonsWithoutTracking.length} carton(s)`);
      }
      
      // Check for duplicate tracking numbers (use controlled state OR database)
      const trackingNumbers = cartons.map(c => 
        (trackingInputs[c.id] || c.trackingNumber || '').trim().toUpperCase()
      ).filter(t => t !== '');
      
      const uniqueTracking = new Set(trackingNumbers);
      if (trackingNumbers.length !== uniqueTracking.size) {
        missingChecks.push('Duplicate tracking numbers');
      }
    }
    
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
          packingChecklist: packingChecklist,
          packingMaterialsApplied: packingMaterialsApplied
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
      
      // Store the completed order ID to exclude from next searches
      setJustCompletedPackingOrderId(activePackingOrder.id);
      
      // Show completion modal instead of immediately switching tabs
      setShowPackingCompletionModal(true);
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
    onSuccess: (data, orderIds) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      // Clear packing state for all shipped orders
      orderIds.forEach(orderId => {
        clearPackingState(orderId);
        clearPickedProgress(orderId);
      });
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

  const handleOverviewBarcodeScan = () => {
    if (!overviewBarcodeInput || !activePickingOrder) return;

    const item = activePickingOrder.items.find(i => 
      i.barcode === overviewBarcodeInput || i.sku === overviewBarcodeInput
    );

    if (item) {
      // Mark item as fully picked
      updatePickedItem(item.id, item.quantity);
      playSound('success');
    } else {
      playSound('error');
    }
    setOverviewBarcodeInput('');
    overviewBarcodeInputRef.current?.focus();
  };

  // Filter orders by status - Updated to match backend state machine
  const getOrdersByStatus = (status: string) => {
    const filtered = transformedOrders.filter(order => {
      if (status === 'pending') return order.pickStatus === 'not_started' || !order.pickStatus;
      if (status === 'picking') return order.pickStatus === 'in_progress';
      // Include both not_started (ready to pack) AND in_progress (abandoned/resume packing)
      if (status === 'packing') return order.pickStatus === 'completed' && (order.packStatus === 'not_started' || !order.packStatus || order.packStatus === 'in_progress');
      if (status === 'ready') return order.packStatus === 'completed';
      return false;
    });
    
    // Sort packing orders by oldest to latest (packStartTime)
    if (status === 'packing') {
      return filtered.sort((a, b) => {
        const timeA = a.packStartTime ? new Date(a.packStartTime).getTime() : 0;
        const timeB = b.packStartTime ? new Date(b.packStartTime).getTime() : 0;
        // Orders without packStartTime go to the end
        if (!a.packStartTime && !b.packStartTime) return 0;
        if (!a.packStartTime) return 1;
        if (!b.packStartTime) return -1;
        return timeA - timeB; // Oldest first
      });
    }
    
    return filtered;
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
      return { label: 'Packing', color: 'bg-amber-100 text-amber-700 border-amber-300' };
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
    // Removed redundant condition - already handled above
    return { label: 'Pending', color: 'bg-gray-100 text-gray-600 border-gray-200' };
  };

  // Statistics
  // Calculate average picking time from completed orders
  const calculateAvgPickTime = () => {
    const ordersWithPickTime = transformedOrders.filter(o => 
      o.pickStartTime && o.pickEndTime
    );
    
    if (ordersWithPickTime.length === 0) return 'N/A';
    
    const totalSeconds = ordersWithPickTime.reduce((sum, order) => {
      // Type guard - we already filtered for orders with both times
      if (!order.pickStartTime || !order.pickEndTime) return sum;
      
      const duration = Math.floor(
        (new Date(order.pickEndTime).getTime() - new Date(order.pickStartTime).getTime()) / 1000
      );
      return sum + duration;
    }, 0);
    
    const avgSeconds = Math.floor(totalSeconds / ordersWithPickTime.length);
    const minutes = Math.floor(avgSeconds / 60);
    const seconds = avgSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const stats = {
    pending: getOrdersByStatus('pending').length,
    picking: getOrdersByStatus('picking').length,
    packing: getOrdersByStatus('packing').length,
    ready: getOrdersByStatus('ready').length,
    todayPicked: transformedOrders.filter(o => 
      o.pickEndTime && new Date(o.pickEndTime).toDateString() === new Date().toDateString()
    ).length,
    avgPickTime: calculateAvgPickTime()
  };
  
  // Function to play professional notification sound
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a pleasant, professional "ding" sound using Web Audio API
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Two harmonious frequencies for a pleasant chime
      oscillator1.frequency.value = 800; // E5
      oscillator2.frequency.value = 1200; // E6
      
      oscillator1.type = 'sine';
      oscillator2.type = 'sine';
      
      // Connect oscillators to gain node
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Envelope for smooth, professional sound
      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01); // Gentle attack
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5); // Smooth decay
      
      oscillator1.start(now);
      oscillator2.start(now);
      oscillator1.stop(now + 0.5);
      oscillator2.stop(now + 0.5);
      
      // Clean up after sound plays
      setTimeout(() => {
        audioContext.close();
      }, 600);
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  };

  // Trigger bouncy animation when counts change, plus notification for new pending orders
  useEffect(() => {
    const countersToAnimate = new Set<string>();
    
    // Check if pending count increased (new order arrived)
    const pendingIncreased = stats.pending > previousCountsRef.current.pending && previousCountsRef.current.pending >= 0;
    
    if (stats.pending !== previousCountsRef.current.pending) {
      countersToAnimate.add('pending');
      
      // Play sound and show notification only when pending count increases
      if (pendingIncreased && isSuccess) {
        playNotificationSound();
        
        const newOrderCount = stats.pending - previousCountsRef.current.pending;
        toast({
          title: `${newOrderCount} New Order${newOrderCount > 1 ? "s" : ""}`,
          description: `Ready to pack`,
          duration: 6000,
        });
      }
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
  }, [stats.pending, stats.picking, stats.packing, stats.ready, isSuccess, toast]);

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
    
    // Check if shipping method is GLS or DHL
    const shippingMethod = activePackingOrder.shippingMethod?.toUpperCase() || '';
    const isGLSShipping = shippingMethod === 'GLS' || shippingMethod === 'GLS DE' || shippingMethod === 'GLS GERMANY' || shippingMethod.includes('GLS');
    const isDHLShipping = shippingMethod === 'DHL' || shippingMethod === 'DHL DE' || shippingMethod === 'DHL GERMANY' || shippingMethod.includes('DHL');
    
    // Check if all items are verified, including bundle components
    // IMPORTANT: Check activePackingOrder.items (what's shown in UI), NOT currentCarton.items
    const allItemsVerified = activePackingOrder.items.every(item => {
      if (item.isBundle && item.bundleItems && item.bundleItems.length > 0) {
        // For bundles, check if all components have been verified the required number of times
        return item.bundleItems.every((bi: any) => (verifiedItems[`${item.id}-${bi.id}`] || 0) >= bi.quantity);
      }
      // For regular items, check if the item has been verified the required quantity
      return (verifiedItems[item.id] || 0) >= item.quantity;
    });
    
    // Multi-carton validation: all cartons must have type and label
    // For GLS: weight is REQUIRED and must be > 0 and ≤ 40kg
    // For other carriers: weight is required and must be > 0
    const allCartonsValid = (() => {
      if (cartons.length === 0) return false;
      
      // Check basic carton properties
      const basicValidation = cartons.every(carton => {
        const hasValidType = carton.cartonType === 'company' ? !!carton.cartonId : carton.cartonType === 'non-company';
        
        // Weight validation depends on shipping method
        let hasValidWeight = true;
        if (isGLSShipping) {
          // GLS: weight is REQUIRED and must be > 0 and ≤ 40kg
          hasValidWeight = carton.weight && parseFloat(carton.weight) > 0 && parseFloat(carton.weight) <= 40;
        } else {
          // Other carriers: weight is required and must be > 0
          hasValidWeight = carton.weight && parseFloat(carton.weight) > 0;
        }
        
        return hasValidType && hasValidWeight;
      });
      
      if (!basicValidation) return false;
      
      // Enhanced shipping label validation based on shipping method
      const isPPL = shippingMethod.includes('PPL');
      const isGLS = isGLSShipping;
      
      if (isPPL) {
        // PPL: Must have created shipment and all cartons must have labels from database
        if (activePackingOrder.pplStatus !== 'created') return false;
        if (shipmentLabelsFromDB.length < cartons.length) return false;
      } else if (isGLS) {
        // GLS: All cartons must have tracking numbers (check controlled state OR database) and no duplicates
        if (cartons.some(c => {
          const trackingValue = (trackingInputs[c.id] || c.trackingNumber || '').trim();
          return trackingValue === '';
        })) return false;
        
        // Check for duplicate tracking numbers (use controlled state OR database)
        const trackingNumbers = cartons.map(c => 
          (trackingInputs[c.id] || c.trackingNumber || '').trim().toUpperCase()
        ).filter(t => t !== '');
        
        const uniqueTracking = new Set(trackingNumbers);
        if (trackingNumbers.length !== uniqueTracking.size) return false;
      } else {
        // Other methods: All cartons must be marked as printed
        if (cartons.some(c => !c.labelPrinted)) return false;
      }
      
      return true;
    })();
    
    // Packing completion check - only check what's visible in the UI
    const canCompletePacking = (packingChecklist.itemsVerified || allItemsVerified) && 
                              printedDocuments.packingList && 
                              allCartonsValid;
    
    // Stop timer when packing is complete
    if (canCompletePacking && isPackingTimerRunning) {
      setIsPackingTimerRunning(false);
    }

    // Show completion modal if packing is done
    if (showPackingCompletionModal) {
      // Calculate next action buttons based on available orders
      const pendingOrders = transformedOrders.filter(o => 
        o.id !== justCompletedPackingOrderId &&
        o.pickStatus === 'not_started' && 
        o.status === 'to_fulfill'
      );
      const packingOrders = transformedOrders.filter(o => 
        o.id !== justCompletedPackingOrderId &&
        o.pickStatus === 'completed' && 
        o.packStatus === 'not_started' && 
        o.status === 'to_fulfill'
      );
      const hasOrdersToProcess = pendingOrders.length > 0 || packingOrders.length > 0;

      return (
        <div className="max-w-3xl mx-auto px-3 lg:px-0 py-8">
          <Card className="shadow-2xl border-0 overflow-hidden bg-gradient-to-br from-purple-50 to-indigo-50">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-1 lg:p-2"></div>
            <CardContent className="p-6 sm:p-10 lg:p-16 text-center">
              <div className="bg-gradient-to-br from-purple-400 to-indigo-400 rounded-full w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 mx-auto mb-4 lg:mb-8 flex items-center justify-center shadow-xl animate-bounce">
                <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 lg:h-20 lg:w-20 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black mb-2 lg:mb-4 text-gray-800">
                🎉 Packing Complete!
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-4 lg:mb-8">
                Excellent work! Order {activePackingOrder.orderId} is ready to ship
              </p>
              
              <div className="bg-white rounded-xl p-4 lg:p-6 mb-4 lg:mb-8 shadow-inner">
                <div className="grid grid-cols-3 gap-2 lg:gap-4">
                  <div>
                    <p className="text-xs lg:text-sm text-gray-500">Time</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-amber-600">{formatTimer(packingTimer)}</p>
                  </div>
                  <div>
                    <p className="text-xs lg:text-sm text-gray-500">Cartons</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-indigo-600">{cartons.length}</p>
                  </div>
                  <div>
                    <p className="text-xs lg:text-sm text-gray-500">Weight</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{packageWeight}kg</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                {/* Pick Next Order - Show if there are pending orders */}
                {pendingOrders.length > 0 && (
                  <Button 
                    size="lg" 
                    onClick={() => {
                      // Find best next order to pick
                      const nextOrder = pendingOrders
                        .map(order => ({
                          order,
                          score: calculateOrderScore(order)
                        }))
                        .sort((a, b) => b.score - a.score)
                        .map(item => item.order)[0];
                      
                      if (nextOrder) {
                        setShowPackingCompletionModal(false);
                        setActivePackingOrder(null);
                        setPackingTimer(0);
                        startPicking(nextOrder);
                        setSelectedTab('picking');
                      }
                    }}
                    className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-xl transform hover:scale-105 transition-all"
                    data-testid="button-pick-next-order"
                  >
                    <PlayCircle className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 mr-2 lg:mr-3" />
                    PICK NEXT ORDER ({pendingOrders.length})
                  </Button>
                )}
                
                {/* Pack Next Order - Show if there are orders ready to pack */}
                {packingOrders.length > 0 && (
                  <Button 
                    size="lg" 
                    onClick={() => {
                      // Find next order to pack
                      const nextOrder = packingOrders[0];
                      
                      if (nextOrder) {
                        setShowPackingCompletionModal(false);
                        setActivePackingOrder(null);
                        setPackingTimer(0);
                        startPacking(nextOrder);
                        setSelectedTab('packing');
                      }
                    }}
                    className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-xl transform hover:scale-105 transition-all"
                    data-testid="button-pack-next-order"
                  >
                    <PackageCheck className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 mr-2 lg:mr-3" />
                    PACK NEXT ORDER ({packingOrders.length})
                  </Button>
                )}
                
                {/* Go To Ready To Ship - Show if all picking/packing is done OR as alternative action */}
                {(() => {
                  const readyOrders = transformedOrders.filter(o => 
                    o.status === 'ready_to_ship' && o.packStatus === 'completed'
                  );
                  return !hasOrdersToProcess ? (
                    <Button 
                      size="lg" 
                      onClick={() => {
                        setShowPackingCompletionModal(false);
                        setActivePackingOrder(null);
                        setPackingTimer(0);
                        setSelectedTab('ready');
                      }}
                      className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-xl transform hover:scale-105 transition-all"
                      data-testid="button-go-to-ready"
                    >
                      <Truck className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 mr-2 lg:mr-3" />
                      GO TO READY TO SHIP ({readyOrders.length})
                    </Button>
                  ) : (
                    <Button 
                      size="lg" 
                      variant="outline"
                      onClick={() => {
                        setShowPackingCompletionModal(false);
                        setActivePackingOrder(null);
                        setPackingTimer(0);
                        setSelectedTab('ready');
                      }}
                      className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl font-bold border-2 border-green-600 text-green-600 hover:bg-green-50 shadow-lg"
                      data-testid="button-go-to-ready"
                    >
                      <Truck className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 mr-2 lg:mr-3" />
                      GO TO READY TO SHIP ({readyOrders.length})
                    </Button>
                  );
                })()}
                
                {/* Close button - Stay in packing tab */}
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => {
                    setShowPackingCompletionModal(false);
                    setActivePackingOrder(null);
                    setPackingTimer(0);
                    setSelectedTab('packing');
                  }}
                  className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl font-bold border-2 border-gray-400 text-gray-600 hover:bg-gray-50 shadow-lg"
                  data-testid="button-close-modal"
                >
                  <X className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 mr-2 lg:mr-3" />
                  CLOSE
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Optimized Header - Packing Mode */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg sticky top-0 z-20">
          <div className="px-3 lg:px-6 py-2.5 lg:py-3">
            {/* Top Row: Controls, Order Info, Timer */}
            <div className="flex items-center justify-between gap-2 lg:gap-4">
              {/* Left: Exit Button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2.5 lg:px-3 bg-white/20 hover:bg-white/30 text-white flex-shrink-0"
                onClick={() => {
                  setActivePackingOrder(null);
                  setIsPackingTimerRunning(false);
                  setPackingChecklist({
                    itemsVerified: false,
                    packingSlipIncluded: false,
                    boxSealed: false,
                    weightRecorded: false,
                    fragileProtected: false,
                    promotionalMaterials: false
                  });
                  setSelectedBoxSize('');
                  setPackageWeight('');
                  setVerifiedItems({});
                  setSelectedTab(originatingTab);
                }}
                data-testid="button-exit-packing"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="ml-1 text-xs lg:text-sm hidden sm:inline">Exit</span>
              </Button>
              
              {/* Left-Aligned: Order Info */}
              <div className="flex-1 flex flex-col items-start gap-1.5 min-w-0 ml-2">
                <div className="text-base lg:text-lg font-bold tracking-wide truncate w-full">{activePackingOrder.orderId}</div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-sm lg:text-base text-white font-medium truncate">{activePackingOrder.customerName}</span>
                  {(() => {
                    const shippingAddr = activePackingOrder.shippingAddress;
                    const country = typeof shippingAddr === 'object' ? shippingAddr.country : '';
                    return country && (
                      <span className="text-sm lg:text-base text-white font-medium">• {country}</span>
                    );
                  })()}
                  {activePackingOrder.shippingMethod && (
                    <>
                      <span className="text-sm lg:text-base text-white">•</span>
                      <div className={`px-2.5 py-1 rounded text-sm lg:text-base font-bold ${
                        activePackingOrder.shippingMethod.toUpperCase().includes('GLS') 
                          ? 'bg-emerald-500 text-white'
                          : activePackingOrder.shippingMethod.toUpperCase().includes('PPL')
                          ? 'bg-orange-500 text-white'
                          : activePackingOrder.shippingMethod.toUpperCase().includes('DHL')
                          ? 'bg-yellow-400 text-gray-900'
                          : 'bg-white/30 text-white'
                      }`}>
                        {activePackingOrder.shippingMethod.toUpperCase().includes('GLS') ? 'GLS' :
                         activePackingOrder.shippingMethod.toUpperCase().includes('PPL') ? 'PPL' :
                         activePackingOrder.shippingMethod.toUpperCase().includes('DHL') ? 'DHL' :
                         activePackingOrder.shippingMethod}
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Right: Timer + Mute Button */}
              <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
                <div className="text-right">
                  <div className="font-mono text-base lg:text-lg font-bold">{formatTimer(packingTimer)}</div>
                  <div className="text-[9px] lg:text-[10px] text-white hidden sm:block whitespace-nowrap">
                    {activePackingOrder.items.filter(item => {
                      if (item.isBundle && item.bundleItems && item.bundleItems.length > 0) {
                        return item.bundleItems.every((bi: any) => (verifiedItems[`${item.id}-${bi.id}`] || 0) >= bi.quantity);
                      }
                      return (verifiedItems[item.id] || 0) >= item.quantity;
                    }).length}/{activePackingOrder.items.length} items
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 lg:h-9 lg:w-9 bg-white/20 hover:bg-white/30 text-white"
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  title={audioEnabled ? "Mute sounds" : "Unmute sounds"}
                  data-testid="button-toggle-sound"
                >
                  {audioEnabled ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Minimal Progress Bar */}
            <div className="flex gap-0.5 mt-3 mx-auto max-w-[200px]">
              {/* Step 1: Items */}
              <div className={`flex-1 h-1.5 rounded-sm transition-all ${
                activePackingOrder.items.every(item => {
                  if (item.isBundle && item.bundleItems && item.bundleItems.length > 0) {
                    return item.bundleItems.every((bi: any) => (verifiedItems[`${item.id}-${bi.id}`] || 0) >= bi.quantity);
                  }
                  return (verifiedItems[item.id] || 0) >= item.quantity;
                })
                  ? 'bg-green-500' 
                  : 'bg-gray-400/50'
              }`} />
              
              {/* Step 2: Documents */}
              <div className={`flex-1 h-1.5 rounded-sm transition-all ${
                printedDocuments.packingList
                  ? 'bg-green-500' 
                  : 'bg-gray-400/50'
              }`} />
              
              {/* Step 3: Cartons */}
              <div className={`flex-1 h-1.5 rounded-sm transition-all ${
                selectedCarton 
                  ? 'bg-green-500' 
                  : 'bg-gray-400/50'
              }`} />
              
              {/* Step 4: Shipping Labels */}
              <div className={`flex-1 h-1.5 rounded-sm transition-all ${
                (() => {
                  const shippingMethod = activePackingOrder.shippingMethod?.toUpperCase() || '';
                  const isGLS = shippingMethod === 'GLS' || shippingMethod === 'GLS DE' || shippingMethod === 'GLS GERMANY';
                  const isPPL = shippingMethod.includes('PPL');
                  
                  if (cartons.length === 0) return 'bg-gray-400/50';
                  
                  if (isPPL) {
                    // PPL: Check if shipment created and all cartons have labels
                    return activePackingOrder.pplStatus === 'created' && shipmentLabelsFromDB.length >= cartons.length
                      ? 'bg-green-500' 
                      : 'bg-gray-400/50';
                  } else if (isGLS) {
                    // GLS: Check if all tracking numbers are entered (from controlled state OR database) and no duplicates
                    const allHaveTracking = cartons.every(c => {
                      const trackingValue = (trackingInputs[c.id] || c.trackingNumber || '').trim();
                      return trackingValue !== '';
                    });
                    
                    // Check for duplicate tracking numbers using Set
                    const trackingNumbers = cartons.map(c => 
                      (trackingInputs[c.id] || c.trackingNumber || '').trim().toUpperCase()
                    ).filter(t => t !== '');
                    const uniqueTracking = new Set(trackingNumbers);
                    const hasDuplicates = trackingNumbers.length !== uniqueTracking.size;
                    
                    return allHaveTracking && !hasDuplicates ? 'bg-green-500' : 'bg-gray-400/50';
                  } else {
                    // Other methods: Check if all cartons have labels printed
                    return cartons.every(c => c.labelPrinted) ? 'bg-green-500' : 'bg-gray-400/50';
                  }
                })()
              }`} />
            </div>
          </div>
        </div>

        {/* Main Content - Single Column Layout */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
            
            {/* Item Verification List - Collapsible Accordion */}
            <Accordion type="single" collapsible defaultValue="items" className="w-full">
              <AccordionItem value="items" className="shadow-sm border-2 border-sky-200 rounded-lg bg-white overflow-hidden" id="checklist-items-verified">
                <AccordionTrigger className="px-4 py-3 hover:no-underline bg-gradient-to-r from-sky-700 to-sky-800 text-white transition-colors -mt-0.5 rounded-t-lg">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-2">
                      <div
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent accordion toggle
                          
                          // Check if all items are verified
                          const allVerified = activePackingOrder.items.every(item => {
                            if (item.isBundle && item.bundleItems && item.bundleItems.length > 0) {
                              return item.bundleItems.every((bi: any) => (verifiedItems[`${item.id}-${bi.id}`] || 0) >= bi.quantity);
                            }
                            return (verifiedItems[item.id] || 0) >= item.quantity;
                          });
                          
                          if (allVerified) {
                            // Unverify all items
                            const newVerifiedItems: Record<string, number> = {};
                            activePackingOrder.items.forEach(item => {
                              if (item.isBundle && item.bundleItems) {
                                item.bundleItems.forEach((bi: any) => {
                                  newVerifiedItems[`${item.id}-${bi.id}`] = 0;
                                });
                              } else {
                                newVerifiedItems[item.id] = 0;
                              }
                            });
                            setVerifiedItems(newVerifiedItems);
                          } else {
                            // Mark all items as verified
                            const newVerifiedItems: Record<string, number> = {};
                            activePackingOrder.items.forEach(item => {
                              if (item.isBundle && item.bundleItems) {
                                item.bundleItems.forEach((bi: any) => {
                                  newVerifiedItems[`${item.id}-${bi.id}`] = bi.quantity;
                                });
                              } else {
                                newVerifiedItems[item.id] = item.quantity;
                              }
                            });
                            setVerifiedItems(newVerifiedItems);
                            playSound('success');
                          }
                        }}
                        className="cursor-pointer hover:scale-110 transition-transform"
                        title={activePackingOrder.items.every(item => {
                          if (item.isBundle && item.bundleItems && item.bundleItems.length > 0) {
                            return item.bundleItems.every((bi: any) => (verifiedItems[`${item.id}-${bi.id}`] || 0) >= bi.quantity);
                          }
                          return (verifiedItems[item.id] || 0) >= item.quantity;
                        }) ? "Click to unverify all items" : "Click to mark all items as verified"}
                      >
                        {activePackingOrder.items.every(item => {
                          if (item.isBundle && item.bundleItems && item.bundleItems.length > 0) {
                            return item.bundleItems.every((bi: any) => (verifiedItems[`${item.id}-${bi.id}`] || 0) >= bi.quantity);
                          }
                          return (verifiedItems[item.id] || 0) >= item.quantity;
                        }) ? (
                          <CheckCircle className="h-5 w-5 text-green-400" />
                        ) : (
                          <Circle className="h-5 w-5 text-white/60" />
                        )}
                      </div>
                      <span className="text-base font-bold">
                        Items Verified ({activePackingOrder.items.filter(item => {
                          if (item.isBundle && item.bundleItems && item.bundleItems.length > 0) {
                            return item.bundleItems.every((bi: any) => (verifiedItems[`${item.id}-${bi.id}`] || 0) >= bi.quantity);
                          }
                          return (verifiedItems[item.id] || 0) >= item.quantity;
                        }).length}/{activePackingOrder.items.length})
                      </span>
                    </div>
                    {/* Barcode Scanner Toggle Icon */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-9 w-9 p-0 ${showBarcodeScanner ? 'bg-white/30 text-white' : 'text-white/70 hover:bg-white/20 hover:text-white'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowBarcodeScanner(!showBarcodeScanner);
                        if (!showBarcodeScanner) {
                          setTimeout(() => barcodeInputRef.current?.focus(), 100);
                        }
                      }}
                      title={showBarcodeScanner ? "Hide barcode scanner" : "Show barcode scanner"}
                    >
                      <ScanLine className="h-5 w-5" />
                    </Button>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {/* Barcode Scanner Input - Collapsible */}
                  {showBarcodeScanner && (
                    <div className="px-4 pt-3 pb-2 border-b border-gray-200 bg-sky-50">
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
                                  // Increment the verified count by 1
                                  const currentCount = verifiedItems[matchingItem.id] || 0;
                                  const newCount = Math.min(currentCount + 1, matchingItem.quantity);
                                  setVerifiedItems(prev => ({ ...prev, [matchingItem.id]: newCount }));
                                  
                                  // Highlight the scanned item
                                  setRecentlyScannedItemId(matchingItem.id);
                                  
                                  // Play success sound
                                  playSound('scan');
                                  
                                  // Check if item is now complete
                                  if (newCount === matchingItem.quantity) {
                                    console.log(`✅ Item "${matchingItem.productName}" completed (${newCount}/${matchingItem.quantity})`);
                                    playSound('success');
                                  } else {
                                    console.log(`📊 Item "${matchingItem.productName}" progress: ${newCount}/${matchingItem.quantity}`);
                                  }
                                  
                                  // Clear highlight after 800ms
                                  setTimeout(() => {
                                    setRecentlyScannedItemId(null);
                                  }, 800);
                                } else {
                                  console.log(`❌ No match found for barcode: "${barcodeInput}"`);
                                  playSound('error');
                                }
                                setBarcodeInput('');
                                barcodeInputRef.current?.focus();
                              }
                            }}
                            className="h-10 text-sm font-mono"
                          />
                        </div>
                        <Button variant="outline" size="icon" className="h-10 w-10 flex-shrink-0">
                          <ScanLine className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="pb-2">
                    <ScrollArea className="h-[400px] w-full">
                      <div className="space-y-2 px-2 pr-3">
                      {activePackingOrder.items.map((item, index) => {
                        const isVerified = (verifiedItems[item.id] || 0) >= item.quantity;
                        const isBundle = item.isBundle && item.bundleItems && item.bundleItems.length > 0;
                        const isExpanded = expandedBundles.has(item.id);
                        const bundleComponentsVerified = isBundle ? item.bundleItems?.filter((bi: any) => (verifiedItems[`${item.id}-${bi.id}`] || 0) >= bi.quantity).length || 0 : 0;
                        const totalBundleComponents = isBundle ? item.bundleItems?.length || 0 : 0;
                        const allBundleComponentsVerified = isBundle && bundleComponentsVerified === totalBundleComponents;
                        const hasNotes = item.notes || item.shipmentNotes || item.packingInstructionsText || item.packingInstructionsImage;
                        
                        const isRecentlyScanned = recentlyScannedItemId === item.id;
                        
                        return (
                          <div 
                            key={item.id} 
                            className={`relative p-3 rounded-lg border-2 transition-all duration-300 ${
                              isRecentlyScanned
                                ? 'bg-yellow-100 border-yellow-400 shadow-lg scale-105 ring-4 ring-yellow-200 animate-pulse'
                                : isVerified || (isBundle && allBundleComponentsVerified)
                                ? 'bg-green-50 border-green-300 shadow-sm' 
                                : 'bg-white border-gray-300 shadow-sm'
                            }`}
                          >
                            {(item.notes || item.shipmentNotes) && !(isVerified || (isBundle && allBundleComponentsVerified)) && (
                              <div className="absolute -top-2 -right-2 z-50">
                                <div className={`${item.shipmentNotes ? 'bg-red-500' : 'bg-amber-500'} text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg`}>
                                  <AlertTriangle className="h-3 w-3" />
                                  {item.shipmentNotes ? 'SPECIAL' : 'NOTE'}
                                </div>
                              </div>
                            )}

                            {/* Mobile Layout - Stack vertically */}
                            <div className="sm:hidden">
                              <div className="flex items-start gap-2">
                                {/* Item Number */}
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold mt-3">
                                  {index + 1}
                                </div>
                                
                                {/* Product Image with Quantity Badge */}
                                <div className="flex-shrink-0 relative">
                                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-white border-2 border-gray-200 flex items-center justify-center">
                                    {item.image ? (
                                      <img 
                                        src={item.image} 
                                        alt={item.productName}
                                        className="w-full h-full object-contain"
                                      />
                                    ) : (
                                      <Package className="h-6 w-6 text-gray-400" />
                                    )}
                                  </div>
                                  <div className={`absolute -bottom-1 -right-1 min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md ${
                                    isVerified || (isBundle && allBundleComponentsVerified)
                                      ? 'bg-green-500 text-white' 
                                      : 'bg-blue-500 text-white'
                                  }`}>
                                    {(isVerified || (isBundle && allBundleComponentsVerified)) ? <CheckCircle className="h-3.5 w-3.5" /> : `${item.quantity}×`}
                                  </div>
                                </div>
                                
                                {/* Product Info and Buttons */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-1">
                                    <div className="flex-1 min-w-0 pr-1">
                                      <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{item.productName}</p>
                                    </div>
                                    <div className="flex gap-0.5 flex-shrink-0 flex-col items-end">
                                      <div className="flex gap-0.5">
                                        {isBundle && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-amber-600 hover:bg-amber-50"
                                            onClick={() => {
                                              const newExpanded = new Set(expandedBundles);
                                              if (isExpanded) {
                                                newExpanded.delete(item.id);
                                              } else {
                                                newExpanded.add(item.id);
                                              }
                                              setExpandedBundles(newExpanded);
                                            }}
                                          >
                                            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                          </Button>
                                        )}
                                        <Button
                                          variant={isVerified || (isBundle && allBundleComponentsVerified) ? "default" : "outline"}
                                          size="sm"
                                          className={`h-7 px-2 text-xs font-bold ${
                                            isVerified || (isBundle && allBundleComponentsVerified)
                                              ? 'bg-green-500 hover:bg-green-600 text-white' 
                                              : 'border-sky-300 text-sky-600 hover:bg-sky-50'
                                          }`}
                                          onClick={() => {
                                            if (isBundle) {
                                              if (allBundleComponentsVerified) {
                                                setVerifiedItems(prev => {
                                                  const newRecord = { ...prev };
                                                  item.bundleItems?.forEach((bi: any) => {
                                                    newRecord[`${item.id}-${bi.id}`] = 0;
                                                  });
                                                  return newRecord;
                                                });
                                              } else {
                                                setVerifiedItems(prev => {
                                                  const newRecord = { ...prev };
                                                  item.bundleItems?.forEach((bi: any) => {
                                                    newRecord[`${item.id}-${bi.id}`] = bi.quantity;
                                                  });
                                                  return newRecord;
                                                });
                                                playSound('scan');
                                              }
                                            } else {
                                              if (isVerified) {
                                                setVerifiedItems(prev => ({ ...prev, [item.id]: 0 }));
                                              } else {
                                                // If quantity > 4, complete all at once. Otherwise, increment by 1
                                                const newCount = item.quantity > 4 ? item.quantity : Math.min((verifiedItems[item.id] || 0) + 1, item.quantity);
                                                setVerifiedItems(prev => ({ ...prev, [item.id]: newCount }));
                                                playSound('scan');
                                              }
                                            }
                                          }}
                                        >
                                          {isVerified || (isBundle && allBundleComponentsVerified) ? (
                                            <><Check className="h-3 w-3 mr-1" />Done</>
                                          ) : (
                                            <><ScanLine className="h-3 w-3 mr-1" />{verifiedItems[item.id] || 0}/{item.quantity}</>
                                          )}
                                        </Button>
                                      </div>
                                      {/* Progress bar for non-bundle items */}
                                      {!isBundle && !isVerified && item.quantity > 1 && (
                                        <div className="w-full mt-0.5">
                                          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                                            <div 
                                              className="h-full bg-sky-500 transition-all duration-300"
                                              style={{ width: `${((verifiedItems[item.id] || 0) / item.quantity) * 100}%` }}
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Location and Badges - Below on mobile */}
                                  <div className="mt-1">
                                    {!isBundle && item.warehouseLocation && (
                                      <div className="text-xs text-gray-600 font-medium">
                                        📍 {item.warehouseLocation}
                                        {item.sku && <span className="ml-1 text-gray-500">• {item.sku}</span>}
                                      </div>
                                    )}
                                    {isBundle && (
                                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                        <Badge className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 font-semibold">
                                          Bundle ({bundleComponentsVerified}/{totalBundleComponents})
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Desktop Layout - Keep existing */}
                            <div className="hidden sm:flex items-center gap-3">
                              {/* Item Number */}
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold">
                                {index + 1}
                              </div>
                              
                              {/* Product Image */}
                              <div className="relative flex-shrink-0">
                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-white border-2 border-gray-200 flex items-center justify-center">
                                  {item.image ? (
                                    <img 
                                      src={item.image} 
                                      alt={item.productName}
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <Package className="h-8 w-8 text-gray-400" />
                                  )}
                                </div>
                                <div className={`absolute -bottom-1 -right-1 min-w-[24px] h-6 px-1.5 rounded-full flex items-center justify-center text-[11px] font-bold shadow-md ${
                                  isVerified || (isBundle && allBundleComponentsVerified)
                                    ? 'bg-green-500 text-white' 
                                    : 'bg-blue-500 text-white'
                                }`}>
                                  {(isVerified || (isBundle && allBundleComponentsVerified)) ? <CheckCircle className="h-4 w-4" /> : `${item.quantity}×`}
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                {/* Product Name */}
                                <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{item.productName}</p>
                                
                                {/* Badges Row */}
                                {isBundle && (
                                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                                    <Badge className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 font-semibold">
                                      Bundle ({bundleComponentsVerified}/{totalBundleComponents})
                                    </Badge>
                                  </div>
                                )}
                                
                                {/* SKU and Location */}
                                <div className="flex items-center gap-2 mt-1">
                                  {!isBundle && item.warehouseLocation && (
                                    <span className="text-xs text-gray-600 font-medium truncate">
                                      📍 {item.warehouseLocation}
                                    </span>
                                  )}
                                  {item.sku && (
                                    <span className="text-xs text-gray-500 truncate">
                                      SKU: {item.sku}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex gap-2 flex-shrink-0 flex-col items-end">
                                <div className="flex gap-1">
                                  {isBundle && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-50"
                                      onClick={() => {
                                        const newExpanded = new Set(expandedBundles);
                                        if (isExpanded) {
                                          newExpanded.delete(item.id);
                                        } else {
                                          newExpanded.add(item.id);
                                        }
                                        setExpandedBundles(newExpanded);
                                      }}
                                      title={isExpanded ? "Hide bundle items" : "Show bundle items"}
                                    >
                                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </Button>
                                  )}
                                  <Button
                                    variant={isVerified || (isBundle && allBundleComponentsVerified) ? "default" : "outline"}
                                    size="sm"
                                    className={`h-8 px-3 text-sm font-bold ${
                                      isVerified || (isBundle && allBundleComponentsVerified)
                                        ? 'bg-green-500 hover:bg-green-600 text-white' 
                                        : 'border-sky-300 text-sky-600 hover:bg-sky-50'
                                    }`}
                                    onClick={() => {
                                      if (isBundle) {
                                        if (allBundleComponentsVerified) {
                                          setVerifiedItems(prev => {
                                            const newRecord = { ...prev };
                                            item.bundleItems?.forEach((bi: any) => {
                                              newRecord[`${item.id}-${bi.id}`] = 0;
                                            });
                                            return newRecord;
                                          });
                                        } else {
                                          setVerifiedItems(prev => {
                                            const newRecord = { ...prev };
                                            item.bundleItems?.forEach((bi: any) => {
                                              newRecord[`${item.id}-${bi.id}`] = bi.quantity;
                                            });
                                            return newRecord;
                                          });
                                          playSound('scan');
                                        }
                                      } else {
                                        if (isVerified) {
                                          setVerifiedItems(prev => ({ ...prev, [item.id]: 0 }));
                                        } else {
                                          // If quantity > 4, complete all at once. Otherwise, increment by 1
                                          const newCount = item.quantity > 4 ? item.quantity : Math.min((verifiedItems[item.id] || 0) + 1, item.quantity);
                                          setVerifiedItems(prev => ({ ...prev, [item.id]: newCount }));
                                          playSound('scan');
                                        }
                                      }
                                    }}
                                  >
                                    {isVerified || (isBundle && allBundleComponentsVerified) ? (
                                      <><Check className="h-4 w-4 mr-1" />Complete</>
                                    ) : (
                                      <><ScanLine className="h-4 w-4 mr-1" />{verifiedItems[item.id] || 0}/{item.quantity}</>
                                    )}
                                  </Button>
                                </div>
                                {/* Progress bar for non-bundle items */}
                                {!isBundle && !isVerified && item.quantity > 1 && (
                                  <div className="w-24 mt-1">
                                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-sky-500 transition-all duration-300"
                                        style={{ width: `${((verifiedItems[item.id] || 0) / item.quantity) * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Bundle Components - Compact Expandable Section */}
                            {isBundle && isExpanded && (
                              <div className="mt-2 ml-2 space-y-1">
                                {item.bundleItems?.map((bundleItem: any, idx: number) => {
                                  const componentId = `${item.id}-${bundleItem.id}`;
                                  const isComponentVerified = (verifiedItems[componentId] || 0) >= bundleItem.quantity;
                                  
                                  return (
                                    <div 
                                      key={bundleItem.id}
                                      className={`flex items-center gap-2 p-2 rounded border ${
                                        isComponentVerified 
                                          ? 'bg-green-50 border-green-200' 
                                          : 'bg-amber-50 border-amber-200'
                                      }`}
                                    >
                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                        isComponentVerified ? 'bg-green-500 text-white' : 'bg-amber-200 text-amber-700'
                                      }`}>
                                        {isComponentVerified ? '✓' : idx + 1}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1 flex-wrap">
                                          <span className="font-semibold text-gray-700 text-sm truncate">{bundleItem.name}</span>
                                          {bundleItem.colorNumber && (
                                            <span className="text-gray-500 text-xs shrink-0">#{bundleItem.colorNumber}</span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                          <span className={`shrink-0 ${isComponentVerified ? 'font-bold text-green-600' : ''}`}>
                                            {verifiedItems[componentId] || 0}/{bundleItem.quantity}
                                          </span>
                                          {bundleItem.location && (
                                            <span className="text-gray-400 truncate">📍 {bundleItem.location}</span>
                                          )}
                                        </div>
                                      </div>
                                      <Button
                                        variant={isComponentVerified ? "default" : "outline"}
                                        size="sm"
                                        className={`h-7 px-2 text-xs shrink-0 ${
                                          isComponentVerified 
                                            ? 'bg-green-500 hover:bg-green-600 text-white' 
                                            : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                                        }`}
                                        onClick={() => {
                                          setVerifiedItems(prev => {
                                            const currentCount = prev[componentId] || 0;
                                            const newRecord = { ...prev };
                                            if (currentCount >= bundleItem.quantity) {
                                              newRecord[componentId] = 0;
                                            } else {
                                              newRecord[componentId] = currentCount + 1;
                                              playSound('scan');
                                            }
                                            return newRecord;
                                          });
                                        }}
                                      >
                                        {isComponentVerified ? '✓' : 'Check'}
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            
                            {/* Notes Section - Compact */}
                            {hasNotes && (
                              <div className="mt-2 ml-2 space-y-1">
                                {item.notes && (
                                  <div className="p-3 bg-amber-50 rounded border-l-4 border-amber-400">
                                    <div className="flex items-start gap-2">
                                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-amber-700 mb-1">SHIPPING NOTES</div>
                                        <div className="text-sm text-black font-medium leading-normal whitespace-pre-wrap">{item.notes}</div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {item.shipmentNotes && (
                                  <div className="p-3 bg-red-50 rounded border-l-4 border-red-400">
                                    <div className="flex items-start gap-2">
                                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-red-700 mb-1">SPECIAL HANDLING</div>
                                        <div className="text-sm text-black font-medium leading-normal">{item.shipmentNotes}</div>
                                        {item.packingMaterial && (
                                          <div className="flex items-center gap-1.5 mt-1">
                                            {item.packingMaterial.imageUrl && (
                                              <img 
                                                src={item.packingMaterial.imageUrl} 
                                                alt={item.packingMaterial.name}
                                                className="w-6 h-6 rounded object-contain border bg-white flex-shrink-0"
                                              />
                                            )}
                                            <div className="text-xs min-w-0">
                                              <div className="font-medium text-red-700 truncate">{item.packingMaterial.name}</div>
                                              <div className="text-red-500 truncate">{item.packingMaterial.description}</div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {(item.packingInstructionsText || item.packingInstructionsImage) && (
                                  <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                                    <div className="flex items-start gap-2">
                                      <Package className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-blue-700 mb-1">PACKING INSTRUCTIONS</div>
                                        {item.packingInstructionsImage && (
                                          <div className="mb-2">
                                            <img 
                                              src={item.packingInstructionsImage} 
                                              alt="Packing instructions"
                                              className="w-full max-w-xs rounded border border-blue-200"
                                            />
                                          </div>
                                        )}
                                        {item.packingInstructionsText && (
                                          <div className="text-sm text-black font-medium leading-normal whitespace-pre-line">
                                            {item.packingInstructionsText}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Packing Materials Section */}
          <Card className="shadow-sm border-2 border-slate-300 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white px-4 py-3 rounded-t-lg -mt-0.5">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Packing Materials
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {orderPackingMaterials.length > 0 ? (
                <div className="space-y-3">
                  {orderPackingMaterials.map((material) => (
                    <div 
                      key={material.id} 
                      className="border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setPackingMaterialsApplied(prev => ({
                        ...prev,
                        [material.id]: !prev[material.id]
                      }))}
                    >
                      <div className="flex items-start gap-3">
                        {/* Material Image */}
                        {material.imageUrl && (
                          <div className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                            <img 
                              src={material.imageUrl} 
                              alt={material.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        
                        {/* Material Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-900 mb-1">{material.name}</h4>
                          {material.instruction && (
                            <p className="text-xs text-gray-600 mb-1">{material.instruction}</p>
                          )}
                          <p className="text-xs text-gray-500">For: {material.productName}</p>
                        </div>
                        
                        {/* Checkbox - Right Side, Bigger */}
                        <Checkbox 
                          checked={packingMaterialsApplied[material.id] || false}
                          onCheckedChange={(checked) => setPackingMaterialsApplied(prev => ({
                            ...prev,
                            [material.id]: !!checked
                          }))}
                          onClick={(e) => e.stopPropagation()}
                          className="h-6 w-6 flex-shrink-0"
                        />
                      </div>
                    </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg">
                    No packing materials specified for this order
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Multi-Carton Packing Section */}
          <Card className="shadow-sm border-2 border-purple-300 overflow-hidden" id="checklist-cartons">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-3 rounded-t-lg -mt-0.5">
              <CardTitle className="text-base font-bold">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Box className="h-5 w-5" />
                    <span>Cartons ({cartons.length + cartonsDraft.length})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Recalculate Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 bg-white/10 border-white/30 text-white hover:bg-white/20"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Reset manual modification flag when user explicitly requests recalculation
                        setHasManuallyModifiedCartons(false);
                        if (activePackingOrder?.id) {
                          savePackingState(activePackingOrder.id, 'hasManuallyModifiedCartons', false);
                          console.log('🔓 Manual flag reset - AI recalculation allowed');
                        }
                        recalculateCartons.current?.();
                      }}
                      disabled={isRecalculating}
                      title="Recalculate cartons based on current items"
                    >
                      {isRecalculating ? (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          Recalculating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Recalculate AI
                        </>
                      )}
                    </Button>
                    {/* Collapse/Expand Button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-white hover:bg-white/20"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsCartonSectionCollapsed(!isCartonSectionCollapsed);
                      }}
                    >
                      {isCartonSectionCollapsed ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronUp className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            {!isCartonSectionCollapsed && (
              <CardContent className="p-4 space-y-3">
              {/* Carton List */}
              {[...cartons, ...cartonsDraft].map((carton, index) => {
                const isDraft = cartonsDraft.some(d => d.id === carton.id);
                const cartonData = availableCartons.find((c: any) => c.id === carton.cartonId);
                const isNonCompany = carton.cartonType === 'non-company';
                
                return (
                  <CartonCard
                    key={carton.id}
                    carton={carton}
                    index={index}
                    isDraft={isDraft}
                    cartonData={cartonData}
                    activePackingOrder={activePackingOrder}
                    setHasManuallyModifiedCartons={setHasManuallyModifiedCartons}
                    deleteCartonMutation={deleteCartonMutation}
                    updateCartonMutation={updateCartonMutation}
                    incrementCartonUsageMutation={incrementCartonUsageMutation}
                    calculateVolumeUtilization={calculateVolumeUtilization}
                    isGLS={isGLSShipping}
                  />
                );
              })}

              {/* Add Another Carton Button */}
              <Button
                variant="outline"
                className="w-full border-2 border-dashed border-purple-400 text-purple-800 hover:bg-purple-50"
                onClick={() => {
                  if (activePackingOrder) {
                    // Mark as manually modified to prevent AI recalculation
                    setHasManuallyModifiedCartons(true);
                    
                    const tempId = `temp-${nanoid()}`;
                    const nextCartonNumber = cartons.length + cartonsDraft.length + 1;
                    
                    // Check if shipping method is GLS to set default weight
                    const shippingMethod = activePackingOrder.shippingMethod?.toUpperCase() || '';
                    const isGLS = shippingMethod === 'GLS' || shippingMethod === 'GLS DE' || shippingMethod === 'GLS GERMANY';
                    const defaultWeight = isGLS ? '0.001' : null;
                    
                    const draftCarton: OrderCarton = {
                      id: tempId,
                      orderId: activePackingOrder.id,
                      cartonNumber: nextCartonNumber,
                      cartonType: 'company',
                      cartonId: null,
                      weight: defaultWeight,
                      payloadWeightKg: null,
                      innerLengthCm: null,
                      innerWidthCm: null,
                      innerHeightCm: null,
                      labelUrl: null,
                      labelPrinted: false,
                      trackingNumber: null,
                      aiWeightCalculation: null,
                      aiPlanId: null,
                      source: 'manual',
                      itemAllocations: null,
                      notes: null,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };
                    
                    setCartonsDraft(prev => [...prev, draftCarton]);
                    
                    createCartonMutation.mutate({
                      orderId: activePackingOrder.id,
                      cartonNumber: nextCartonNumber,
                      cartonType: 'company',
                      tempId
                    });
                  }
                }}
                disabled={createCartonMutation.isPending}
                data-testid="add-carton-button"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Carton
              </Button>

              {/* Total Summary */}
              {cartons.length > 0 && !(() => {
                const shippingMethod = activePackingOrder?.shippingMethod?.toUpperCase() || '';
                return shippingMethod === 'GLS' || shippingMethod === 'GLS DE' || shippingMethod === 'GLS GERMANY';
              })() && (
                <div className="bg-purple-100 p-3 rounded-lg border-2 border-purple-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-purple-800">Total Cartons:</span>
                    <span className="font-bold text-purple-900">{cartons.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="font-semibold text-purple-800">Total Weight:</span>
                    <span className="font-bold text-purple-900">
                      {cartons.reduce((sum, c) => sum + (parseFloat(c.weight || '0')), 0).toFixed(3)} kg
                    </span>
                  </div>
                </div>
              )}
              </CardContent>
            )}
          </Card>

          {/* Documents Card - Packing List + Product Files + Order Files */}
          <Card className="shadow-sm border-2 border-emerald-200 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-3 rounded-t-lg -mt-0.5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents ({documentsCount})
                </CardTitle>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 px-3 text-xs font-semibold bg-white/20 hover:bg-white/30 text-white border-white/40"
                  onClick={async () => {
                    try {
                      setIsPrintingAllDocuments(true);
                      await mergeAndPrintPDFs(allDocumentUrls);
                      
                      // Mark all documents as printed
                      setPrintedDocuments(prev => ({ ...prev, packingList: true }));
                      
                      // Mark all product files as printed
                      const productFileIds = (activePackingOrder?.items || [])
                        .map((item: any) => item.productId)
                        .filter(Boolean);
                      if (productFileIds.length > 0) {
                        const productFilesQuery = queryClient.getQueryData(['/api/product-files']) as any[];
                        if (productFilesQuery) {
                          const relevantProductFileIds = productFilesQuery
                            .filter(file => productFileIds.includes(file.productId) && file.isActive && ['certificate', 'sds'].includes(file.fileType))
                            .map(file => file.id);
                          setPrintedProductFiles(new Set(relevantProductFileIds));
                        }
                      }
                      
                      // Mark all order files as printed
                      const orderFilesQuery = queryClient.getQueryData(['/api/orders', activePackingOrder?.id, 'files']) as any[];
                      if (orderFilesQuery && orderFilesQuery.length > 0) {
                        const orderFileIds = orderFilesQuery.map((file: any, index: number) => file.id || `file-${index}`);
                        setPrintedOrderFiles(new Set(orderFileIds));
                      }
                      
                      playSound('success');
                      toast({
                        title: "Documents Sent to Printer",
                        description: `All ${documentsCount} document(s) merged and marked as printed`,
                      });
                    } catch (error: any) {
                      console.error('Error printing merged documents:', error);
                      const errorMsg = error?.message || 'Failed to merge and print documents';
                      toast({
                        title: "Print Error",
                        description: errorMsg,
                        variant: "destructive"
                      });
                    } finally {
                      setIsPrintingAllDocuments(false);
                    }
                  }}
                  disabled={isPrintingAllDocuments || documentsCount === 0}
                  data-testid="button-print-all-documents"
                >
                  {isPrintingAllDocuments ? (
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Printer className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {isPrintingAllDocuments ? 'Printing...' : 'Print All'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* Unified Documents List */}
              <UnifiedDocumentsList
                orderId={activePackingOrder.id}
                orderItems={activePackingOrder.items}
                printedDocuments={printedDocuments}
                printedProductFiles={printedProductFiles}
                printedOrderFiles={printedOrderFiles}
                onPackingListPrinted={() => {
                  openPDFAndPrint(`/api/orders/${activePackingOrder.id}/packing-list.pdf`);
                  setPrintedDocuments(prev => ({ ...prev, packingList: true }));
                  playSound('success');
                }}
                onProductFilePrinted={(fileId) => setPrintedProductFiles(prev => new Set([...Array.from(prev), fileId]))}
                onOrderFilePrinted={(fileId) => setPrintedOrderFiles(prev => new Set([...Array.from(prev), fileId]))}
                onGetDocumentCount={(count, urls) => {
                  setDocumentsCount(count);
                  setAllDocumentUrls(urls);
                }}
              />
            </CardContent>
          </Card>

          {/* Shipping Information Section */}
          <Card className="shadow-sm border-2 border-indigo-200 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-700 to-indigo-800 text-white px-4 py-3 rounded-t-lg -mt-0.5">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Shipping Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4">
              {/* GLS Shipping Details - Only for GLS or GLS DE */}
              {(() => {
                const shippingMethod = activePackingOrder.shippingMethod?.toUpperCase() || '';
                const isGLS = shippingMethod === 'GLS' || shippingMethod === 'GLS DE' || shippingMethod === 'GLS GERMANY';
                return isGLS;
              })() && (() => {
                const shippingAddr = activePackingOrder.shippingAddress;
                const recipientData = typeof shippingAddr === 'object' ? {
                  name: [shippingAddr.firstName, shippingAddr.lastName].filter(Boolean).join(' ') || 'N/A',
                  company: shippingAddr.company || '',
                  street: shippingAddr.street || '',
                  houseNumber: shippingAddr.streetNumber || '',
                  postalCode: shippingAddr.zipCode || '',
                  city: shippingAddr.city || '',
                  country: shippingAddr.country || 'Germany',
                  email: shippingAddr.email || '',
                  phone: shippingAddr.tel || '',
                } : {
                  name: 'N/A',
                  company: '',
                  street: '',
                  houseNumber: '',
                  postalCode: '',
                  city: '',
                  country: 'Germany',
                  email: '',
                  phone: '',
                };
                
                const senderData = glsSenderAddress ? {
                  name: glsSenderAddress.name || '',
                  company: glsSenderAddress.company || '',
                  street: glsSenderAddress.street || '',
                  houseNumber: glsSenderAddress.streetNumber || '',
                  postalCode: glsSenderAddress.zipCode || '',
                  city: glsSenderAddress.city || '',
                  email: glsSenderAddress.email || '',
                  phone: glsSenderAddress.phone || '',
                } : undefined;
                
                let totalWeight = 0;
                cartons.forEach(carton => {
                  if (carton.weight) {
                    totalWeight += parseFloat(carton.weight);
                  }
                });

                const nameParts = (recipientData.name || '').trim().split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';
                const germanCountry = GLS_COUNTRY_MAP[recipientData.country] || recipientData.country;
                
                // Get country flag emoji
                const getCountryFlag = (countryName: string) => {
                  const countryCodeMap: { [key: string]: string } = {
                    'Deutschland': 'DE',
                    'Germany': 'DE',
                    'Frankreich': 'FR',
                    'France': 'FR',
                    'Österreich': 'AT',
                    'Austria': 'AT',
                    'Schweiz': 'CH',
                    'Switzerland': 'CH',
                    'Polen': 'PL',
                    'Poland': 'PL',
                    'Tschechien': 'CZ',
                    'Czech Republic': 'CZ',
                    'Niederlande': 'NL',
                    'Netherlands': 'NL',
                    'Belgien': 'BE',
                    'Belgium': 'BE',
                    'Italien': 'IT',
                    'Italy': 'IT',
                    'Spanien': 'ES',
                    'Spain': 'ES',
                    'Dänemark': 'DK',
                    'Denmark': 'DK',
                    'Schweden': 'SE',
                    'Sweden': 'SE',
                    'Slowakei': 'SK',
                    'Slovakia': 'SK',
                  };
                  
                  const code = countryCodeMap[countryName] || countryCodeMap[recipientData.country];
                  // Only return flag if we have a valid country code mapping
                  if (!code) return '';
                  
                  // Convert country code to flag emoji
                  return code
                    .toUpperCase()
                    .split('')
                    .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
                    .join('');
                };
                
                const copyField = async (value: string, fieldName: string) => {
                  try {
                    await navigator.clipboard.writeText(value);
                    toast({
                      title: "Copied!",
                      description: `${fieldName} copied to clipboard`,
                      duration: 1500
                    });
                  } catch {
                    toast({
                      title: "Copy failed",
                      description: "Please try again",
                      variant: "destructive"
                    });
                  }
                };

                const fullAddress = [
                  `${recipientData.street} ${recipientData.houseNumber}`.trim(),
                  recipientData.postalCode,
                  recipientData.city
                ].filter(Boolean).join(', ');

                const CompactCopyField = ({ label, value, flag }: { label: string; value: string; flag?: string }) => (
                  <div className="flex items-center justify-between gap-2 py-1">
                    <span className="text-sm text-gray-700 flex-shrink-0">{label}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      {flag && <span className="text-xl">{flag}</span>}
                      <span className="text-base font-medium text-gray-900 text-right">{value || '-'}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-gray-100 flex-shrink-0"
                        onClick={() => copyField(value, label)}
                      >
                        <Copy className="h-3.5 w-3.5 text-gray-600" />
                      </Button>
                    </div>
                  </div>
                );

                return (
                  <div className="space-y-3">
                    {/* Header */}
                    <div>
                      <div className="font-bold text-black text-lg">{activePackingOrder.shippingMethod}</div>
                      <div className="text-sm text-black mt-0.5">
                        Max. 40 kg • Circumference + longest side max. 300 cm
                      </div>
                    </div>

                    {/* Ship GLS Button - Mobile & Desktop */}
                    <GLSAutofillButton
                      recipientData={recipientData}
                      senderData={senderData}
                      packageSize="S"
                      weight={totalWeight > 0 ? totalWeight : undefined}
                      orderId={activePackingOrder.orderId}
                      cartonCount={cartons.length}
                    />

                    {/* Copyable Fields */}
                    <div className="space-y-0.5">
                      <CompactCopyField label="Country:" value={germanCountry} flag={getCountryFlag(germanCountry)} />
                      <CompactCopyField label="Paket size:" value="S" />
                      
                      {/* Divider */}
                      <Separator className="my-3" />
                      
                      <CompactCopyField label="First Name:" value={firstName} />
                      <CompactCopyField label="Last Name:" value={lastName} />
                      <CompactCopyField label="Full Address:" value={fullAddress} />
                      <CompactCopyField label="E-mail:" value={recipientData.email || ''} />
                    </div>
                  </div>
                );
              })()}

              {/* DHL Shipping Details - Only for DHL or DHL DE */}
              {(() => {
                const shippingMethod = activePackingOrder.shippingMethod?.toUpperCase() || '';
                const isDHL = shippingMethod === 'DHL' || shippingMethod === 'DHL DE' || shippingMethod === 'DHL GERMANY' || shippingMethod.includes('DHL');
                return isDHL;
              })() && (() => {
                const shippingAddr = activePackingOrder.shippingAddress;
                const recipientData = typeof shippingAddr === 'object' ? {
                  name: [shippingAddr.firstName, shippingAddr.lastName].filter(Boolean).join(' ') || 'N/A',
                  company: shippingAddr.company || '',
                  street: shippingAddr.street || '',
                  houseNumber: shippingAddr.streetNumber || '',
                  addressSupplement: shippingAddr.address2 || shippingAddr.addressSupplement || '',
                  postalCode: shippingAddr.zipCode || '',
                  city: shippingAddr.city || '',
                  country: shippingAddr.country || 'Germany',
                  email: shippingAddr.email || '',
                  phone: shippingAddr.tel || '',
                } : {
                  name: 'N/A',
                  company: '',
                  street: '',
                  houseNumber: '',
                  addressSupplement: '',
                  postalCode: '',
                  city: '',
                  country: 'Germany',
                  email: '',
                  phone: '',
                };
                
                // Prepare sender data from DHL settings
                const senderData = dhlSenderAddress ? {
                  firstName: dhlSenderAddress.firstName || '',
                  lastName: dhlSenderAddress.lastName || '',
                  addressSupplement: dhlSenderAddress.addressSupplement || '',
                  street: dhlSenderAddress.street || '',
                  houseNumber: dhlSenderAddress.houseNumber || '',
                  postalCode: dhlSenderAddress.postalCode || '',
                  city: dhlSenderAddress.city || '',
                  country: dhlSenderAddress.country || 'Deutschland',
                  email: dhlSenderAddress.email || '',
                } : null;
                
                let totalWeight = 0;
                cartons.forEach(carton => {
                  if (carton.weight) {
                    totalWeight += parseFloat(carton.weight);
                  }
                });

                const nameParts = (recipientData.name || '').trim().split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';
                
                const copyField = async (value: string, fieldName: string) => {
                  try {
                    await navigator.clipboard.writeText(value);
                  } catch {
                    toast({
                      title: "Copy failed",
                      description: "Please try again",
                      variant: "destructive"
                    });
                  }
                };

                const fullAddress = [
                  `${recipientData.street} ${recipientData.houseNumber}`.trim(),
                  recipientData.postalCode,
                  recipientData.city
                ].filter(Boolean).join(', ');

                const CompactCopyField = ({ label, value }: { label: string; value: string }) => (
                  <div className="flex items-center justify-between gap-2 py-1">
                    <span className="text-sm text-black flex-shrink-0">{label}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base font-medium text-black text-right">{value || '-'}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-gray-100 flex-shrink-0"
                        onClick={() => copyField(value, label)}
                      >
                        <Copy className="h-3.5 w-3.5 text-gray-600" />
                      </Button>
                    </div>
                  </div>
                );

                // Determine if COD section should be shown
                const codAmount = typeof activePackingOrder.codAmount === 'string' 
                  ? parseFloat(activePackingOrder.codAmount) 
                  : (activePackingOrder.codAmount || 0);
                const showCOD = codAmount > 0 || activePackingOrder.paymentMethod?.toUpperCase().includes('COD');

                return (
                  <div className="space-y-3">
                    {/* Header */}
                    <div>
                      <div className="font-bold text-black text-lg">{activePackingOrder.shippingMethod}</div>
                      <div className="text-sm text-black mt-0.5">
                        Domestic Germany shipping • Package sizes: 2kg, 5kg, 10kg, 20kg
                      </div>
                    </div>

                    {/* DHL Link Button */}
                    <Button
                      variant="default"
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                      onClick={() => {
                        window.open('https://www.dhl.de/de/privatkunden/pakete-versenden/online-frankieren.html', '_blank');
                      }}
                      data-testid="button-dhl-website"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Create Label on DHL Website
                    </Button>

                    {/* Recipient (Empfänger) Section */}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 py-1.5">
                        <User className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm font-bold text-black">Empfänger (Recipient)</span>
                      </div>
                      <CompactCopyField label="Country:" value={recipientData.country} />
                      <CompactCopyField label="Weight:" value={totalWeight > 0 ? `${totalWeight.toFixed(1)} kg` : 'Not set'} />
                      
                      {/* Divider */}
                      <Separator className="my-2" />
                      
                      <CompactCopyField label="First Name:" value={firstName} />
                      <CompactCopyField label="Last Name:" value={lastName} />
                      <CompactCopyField label="Company:" value={recipientData.company} />
                      <CompactCopyField label="Street:" value={recipientData.street} />
                      <CompactCopyField label="House Number:" value={recipientData.houseNumber} />
                      {recipientData.addressSupplement && (
                        <CompactCopyField label="Adresszusatz:" value={recipientData.addressSupplement} />
                      )}
                      <CompactCopyField label="Postal Code:" value={recipientData.postalCode} />
                      <CompactCopyField label="City:" value={recipientData.city} />
                      <CompactCopyField label="E-mail:" value={recipientData.email || ''} />
                      <CompactCopyField label="Phone:" value={recipientData.phone || ''} />
                    </div>

                    {/* Sender (Absender) Section */}
                    {senderData && (
                      <>
                        <Separator className="my-3 bg-yellow-300" />
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 py-1.5">
                            <Building className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-bold text-black">Absender (Sender)</span>
                          </div>
                          <CompactCopyField label="First Name:" value={senderData.firstName} />
                          <CompactCopyField label="Last Name:" value={senderData.lastName} />
                          {senderData.addressSupplement && (
                            <CompactCopyField label="Adresszusatz:" value={senderData.addressSupplement} />
                          )}
                          <CompactCopyField label="Street:" value={senderData.street} />
                          <CompactCopyField label="House Number:" value={senderData.houseNumber} />
                          <CompactCopyField label="Postal Code:" value={senderData.postalCode} />
                          <CompactCopyField label="City:" value={senderData.city} />
                          <CompactCopyField label="Country:" value={senderData.country} />
                          <CompactCopyField label="E-mail:" value={senderData.email || ''} />
                        </div>
                      </>
                    )}

                    {/* COD (Nachnahme) Section */}
                    {showCOD && (
                      <>
                        <Separator className="my-3 bg-yellow-300" />
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 py-1.5">
                            <DollarSign className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-bold text-black">Nachnahme (COD)</span>
                          </div>
                          <CompactCopyField 
                            label="COD Amount:" 
                            value={formatCurrency(codAmount, activePackingOrder.codCurrency || 'EUR')} 
                          />
                          
                          {/* Bank Details */}
                          <div className="pt-2">
                            <Separator className="my-2" />
                            {dhlBankDetails ? (
                              <>
                                <CompactCopyField label="Account Holder:" value={dhlBankDetails.accountHolder || ''} />
                                <CompactCopyField label="IBAN:" value={dhlBankDetails.iban || ''} />
                                <CompactCopyField label="BIC:" value={dhlBankDetails.bic || ''} />
                                <CompactCopyField label="Bank:" value={dhlBankDetails.bank || ''} />
                              </>
                            ) : (
                              <div className="px-2 py-1">
                                <p className="text-sm text-gray-600 italic">
                                  Bank details not configured
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Non-GLS/DHL Orders - Show original shipping information */}
              {!(() => {
                const shippingMethod = activePackingOrder.shippingMethod?.toUpperCase() || '';
                const isGLS = shippingMethod === 'GLS' || shippingMethod === 'GLS DE' || shippingMethod === 'GLS GERMANY';
                const isDHL = shippingMethod === 'DHL' || shippingMethod === 'DHL DE' || shippingMethod === 'DHL GERMANY' || shippingMethod.includes('DHL');
                return isGLS || isDHL;
              })() && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Shipping Address */}
                  <div className="sm:col-span-2 p-4 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                      <span className="text-sm font-semibold text-indigo-900 uppercase tracking-wide">Shipping Address</span>
                    </div>
                    {(() => {
                      const formattedAddress = formatShippingAddress(activePackingOrder.shippingAddress);
                      return formattedAddress ? (
                        <p className="text-sm text-gray-900 whitespace-pre-line pl-6" data-testid="text-shipping-address">
                          {formattedAddress}
                        </p>
                      ) : (
                        <div className="pl-6">
                          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-300 rounded px-3 py-2 inline-flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            No shipping address provided
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Shipping Method */}
                  {activePackingOrder.shippingMethod && (
                    <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Truck className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                        <span className="text-sm font-semibold text-indigo-900 uppercase tracking-wide">Shipping Method</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 pl-6" data-testid="text-shipping-method">
                        {activePackingOrder.shippingMethod}
                      </p>
                    </div>
                  )}

                  {/* Tracking Number */}
                  {activePackingOrder.trackingNumber && (
                    <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                        <span className="text-sm font-semibold text-indigo-900 uppercase tracking-wide">Tracking Number</span>
                      </div>
                      <p className="text-sm font-mono font-medium text-gray-900 pl-6" data-testid="text-tracking-number">
                        {activePackingOrder.trackingNumber}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Dobírka (COD) Section - Only for PPL orders with COD */}
              {activePackingOrder.shippingMethod?.toUpperCase().includes('PPL') && 
               (activePackingOrder.paymentMethod?.toUpperCase() === 'COD' || activePackingOrder.codAmount) && (
                <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-lg mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                    <span className="text-sm font-semibold text-indigo-900 uppercase tracking-wide">Dobírka (COD)</span>
                  </div>
                  
                  <div className="pl-6">
                    <p className="text-sm font-medium text-gray-900" data-testid="text-cod-amount">
                      {activePackingOrder.codAmount ? formatCurrency(typeof activePackingOrder.codAmount === 'string' ? parseFloat(activePackingOrder.codAmount) : activePackingOrder.codAmount, activePackingOrder.codCurrency || 'CZK') : '-'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Unified Shipping Labels Section */}
          <Card id="checklist-shipping-labels" className={`shadow-sm bg-white overflow-hidden ${
            (() => {
              const shippingMethod = activePackingOrder.shippingMethod?.toUpperCase() || '';
              const isGLS = shippingMethod === 'GLS' || shippingMethod === 'GLS DE' || shippingMethod === 'GLS GERMANY';
              const isDHL = shippingMethod === 'DHL' || shippingMethod === 'DHL DE' || shippingMethod === 'DHL GERMANY' || shippingMethod.includes('DHL');
              
              if (isGLS && cartons.length > 0) {
                // Check if all tracking numbers are filled and valid
                const allHaveTracking = cartons.every(c => c.trackingNumber && c.trackingNumber.trim() !== '');
                const hasDuplicates = cartons.some((c, i) => 
                  c.trackingNumber && c.trackingNumber.trim() !== '' && 
                  cartons.some((other, j) => 
                    i !== j && 
                    other.trackingNumber && 
                    other.trackingNumber.trim().toUpperCase() === c.trackingNumber?.trim().toUpperCase()
                  )
                );
                
                if (allHaveTracking && !hasDuplicates) {
                  return 'border-2 border-green-300';
                } else if (hasDuplicates) {
                  return 'border-2 border-red-300';
                } else {
                  return 'border-2 border-sky-300';
                }
              }
              
              if (isDHL && cartons.length > 0) {
                // Check if all tracking numbers are filled and valid
                const allHaveTracking = cartons.every(c => c.trackingNumber && c.trackingNumber.trim() !== '');
                const hasDuplicates = cartons.some((c, i) => 
                  c.trackingNumber && c.trackingNumber.trim() !== '' && 
                  cartons.some((other, j) => 
                    i !== j && 
                    other.trackingNumber && 
                    other.trackingNumber.trim().toUpperCase() === c.trackingNumber?.trim().toUpperCase()
                  )
                );
                
                if (allHaveTracking && !hasDuplicates) {
                  return 'border-2 border-green-300';
                } else if (hasDuplicates) {
                  return 'border-2 border-red-300';
                } else {
                  return 'border-2 border-yellow-400';
                }
              }
              
              return activePackingOrder.shippingMethod?.toUpperCase().includes('PPL') 
                ? 'border-2 border-orange-300' 
                : isGLS
                ? 'border-2 border-sky-300'
                : isDHL
                ? 'border-2 border-yellow-400'
                : 'border-2 border-stone-300';
            })()
          }`}>
            <CardHeader className={`text-white px-4 py-3 rounded-t-lg -mt-0.5 ${
              (() => {
                const shippingMethod = activePackingOrder.shippingMethod?.toUpperCase() || '';
                const isGLS = shippingMethod === 'GLS' || shippingMethod === 'GLS DE' || shippingMethod === 'GLS GERMANY';
                const isDHL = shippingMethod === 'DHL' || shippingMethod === 'DHL DE' || shippingMethod === 'DHL GERMANY' || shippingMethod.includes('DHL');
                
                if (isGLS && cartons.length > 0) {
                  // Check if all tracking numbers are filled and valid
                  const allHaveTracking = cartons.every(c => c.trackingNumber && c.trackingNumber.trim() !== '');
                  const hasDuplicates = cartons.some((c, i) => 
                    c.trackingNumber && c.trackingNumber.trim() !== '' && 
                    cartons.some((other, j) => 
                      i !== j && 
                      other.trackingNumber && 
                      other.trackingNumber.trim().toUpperCase() === c.trackingNumber?.trim().toUpperCase()
                    )
                  );
                  
                  if (allHaveTracking && !hasDuplicates) {
                    return 'bg-gradient-to-r from-green-600 to-green-700';
                  } else if (hasDuplicates) {
                    return 'bg-gradient-to-r from-red-600 to-red-700';
                  }
                }
                
                if (isDHL && cartons.length > 0) {
                  // Check if all tracking numbers are filled and valid
                  const allHaveTracking = cartons.every(c => c.trackingNumber && c.trackingNumber.trim() !== '');
                  const hasDuplicates = cartons.some((c, i) => 
                    c.trackingNumber && c.trackingNumber.trim() !== '' && 
                    cartons.some((other, j) => 
                      i !== j && 
                      other.trackingNumber && 
                      other.trackingNumber.trim().toUpperCase() === c.trackingNumber?.trim().toUpperCase()
                    )
                  );
                  
                  if (allHaveTracking && !hasDuplicates) {
                    return 'bg-gradient-to-r from-green-600 to-green-700';
                  } else if (hasDuplicates) {
                    return 'bg-gradient-to-r from-red-600 to-red-700';
                  }
                }
                
                return activePackingOrder.shippingMethod?.toUpperCase().includes('PPL')
                  ? 'bg-gradient-to-r from-orange-600 to-orange-700'
                  : isGLS
                  ? 'bg-gradient-to-r from-sky-600 to-sky-700'
                  : isDHL
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                  : 'bg-gradient-to-r from-stone-600 to-stone-700';
              })()
            }`}>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Shipping Labels ({(() => {
                  const shippingMethod = activePackingOrder.shippingMethod?.toUpperCase() || '';
                  const isGLS = shippingMethod === 'GLS' || shippingMethod === 'GLS DE' || shippingMethod === 'GLS GERMANY';
                  const isDHL = shippingMethod === 'DHL' || shippingMethod === 'DHL DE' || shippingMethod === 'DHL GERMANY' || shippingMethod.includes('DHL');
                  const isPPL = shippingMethod.includes('PPL');
                  
                  if (isPPL) {
                    // For PPL: count cartons if they exist, otherwise count labels from DB
                    return cartons.length > 0 ? cartons.length : shipmentLabelsFromDB.length;
                  } else if (isGLS || isDHL) {
                    // For GLS/DHL: count cartons
                    return cartons.length;
                  } else {
                    // For other methods: count labels from DB or cartons
                    return shipmentLabelsFromDB.length > 0 ? shipmentLabelsFromDB.length : cartons.length;
                  }
                })()})
                {(() => {
                  const shippingMethod = activePackingOrder.shippingMethod?.toUpperCase() || '';
                  const isGLS = shippingMethod === 'GLS' || shippingMethod === 'GLS DE' || shippingMethod === 'GLS GERMANY';
                  
                  if (isGLS && cartons.length > 0) {
                    const allHaveTracking = cartons.every(c => c.trackingNumber && c.trackingNumber.trim() !== '');
                    const hasDuplicates = cartons.some((c, i) => 
                      c.trackingNumber && c.trackingNumber.trim() !== '' && 
                      cartons.some((other, j) => 
                        i !== j && 
                        other.trackingNumber && 
                        other.trackingNumber.trim().toUpperCase() === c.trackingNumber?.trim().toUpperCase()
                      )
                    );
                    
                    if (allHaveTracking && !hasDuplicates) {
                      return <CheckCircle className="h-5 w-5 ml-auto" />;
                    } else if (hasDuplicates) {
                      return <XCircle className="h-5 w-5 ml-auto" />;
                    }
                  }
                  return null;
                })()}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* PPL-Specific Actions */}
              {activePackingOrder.shippingMethod?.toUpperCase().includes('PPL') && (
                <>
                  {/* Generate/Cancel PPL Labels Button */}
                  {activePackingOrder.pplStatus !== 'created' ? (
                    <>
                      <Button
                        variant="default"
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                        onClick={() => createPPLLabelsMutation.mutate(activePackingOrder.id)}
                        disabled={createPPLLabelsMutation.isPending || cartons.length === 0}
                        data-testid="button-generate-ppl-labels"
                      >
                        {createPPLLabelsMutation.isPending ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        {createPPLLabelsMutation.isPending ? 'Creating Labels...' : 'Generate PPL Labels'}
                      </Button>
                      
                      {/* Retry button if batchId exists but label failed */}
                      {activePackingOrder.pplBatchId && !activePackingOrder.pplLabelData && (
                        <Button
                          variant="outline"
                          className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                          onClick={() => retryPPLLabelMutation.mutate(activePackingOrder.id)}
                          disabled={retryPPLLabelMutation.isPending}
                          data-testid="button-retry-ppl-label"
                        >
                          {retryPPLLabelMutation.isPending ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          {retryPPLLabelMutation.isPending ? 'Retrieving...' : 'Retry Label Download'}
                        </Button>
                      )}
                    </>
                  ) : shipmentLabelsFromDB.length === 0 && cartons.length > 1 ? (
                    // No labels exist AND multiple cartons - Show Generate All Labels button
                    <Button
                      variant="default"
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-all duration-200"
                      onClick={async () => {
                        try {
                          if (cartons.length === 0) {
                            toast({
                              title: "No Cartons",
                              description: "Please add cartons first before generating labels",
                              variant: "destructive"
                            });
                            return;
                          }

                          setIsGeneratingAllLabels(true);
                          console.log('🎯 Generating all PPL labels for', cartons.length, 'cartons');
                          toast({
                            title: "Generating Labels...",
                            description: `Creating ${cartons.length} PPL shipping label(s) with COD support`,
                          });

                          // Use the multi-carton endpoint that handles COD properly
                          const response = await apiRequest('POST', `/api/orders/${activePackingOrder.id}/ppl/create-labels`, {});
                          
                          if (!response.ok) {
                            const error = await response.json();
                            throw new Error(error.error || 'Failed to create labels');
                          }
                          
                          const result = await response.json();
                          console.log('✅ All labels generated:', result);
                          
                          // Critical: Refresh ALL data to ensure UI updates
                          console.log('🔄 Step 1: Invalidating all queries...');
                          await queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
                          await queryClient.invalidateQueries({ queryKey: ['/api/orders', activePackingOrder.id, 'cartons'] });
                          
                          console.log('🔄 Step 2: Refetching cartons...');
                          await refetchCartons();
                          
                          console.log('🔄 Step 3: Waiting for database commit...');
                          await new Promise(resolve => setTimeout(resolve, 500));
                          
                          console.log('🔄 Step 4: Fetching shipment labels...');
                          await fetchShipmentLabels();
                          
                          console.log('🔄 Step 5: Force re-render by updating state...');
                          // Force state update to trigger re-render
                          setShipmentLabelsFromDB(prev => [...prev]);
                          
                          console.log('✅ All refresh steps completed');
                          
                          // Show tracking numbers in success message
                          const trackingNumbers = result.trackingNumbers || [];
                          const trackingInfo = trackingNumbers.length > 0
                            ? `Tracking: ${trackingNumbers.join(', ')}`
                            : '';
                          
                          toast({
                            title: "Labels Generated",
                            description: trackingInfo 
                              ? `Successfully created ${cartons.length} PPL shipping label(s). ${trackingInfo}`
                              : `Successfully created ${cartons.length} PPL shipping label(s)`,
                          });
                        } catch (error: any) {
                          console.error('❌ Generate error:', error);
                          toast({
                            title: "Error",
                            description: error.message || "Failed to generate labels",
                            variant: "destructive"
                          });
                        } finally {
                          setIsGeneratingAllLabels(false);
                        }
                      }}
                      disabled={cartons.length === 0 || isGeneratingAllLabels}
                      data-testid="button-generate-all-ppl-labels"
                    >
                      {isGeneratingAllLabels ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Package className="h-4 w-4 mr-2" />
                      )}
                      {isGeneratingAllLabels ? 'Generating...' : 'Generate All Labels'}
                    </Button>
                  ) : shipmentLabelsFromDB.length > 0 ? (
                    // Labels exist - Show Print All Labels button (blue to distinguish from Generate)
                    <Button
                      variant="default"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-200"
                      onClick={async () => {
                        try {
                          setIsPrintingAllLabels(true);
                          console.log('🖨️ Printing all PPL labels...');
                          
                          // Print each label that has PDF data
                          for (let i = 0; i < shipmentLabelsFromDB.length; i++) {
                            const label = shipmentLabelsFromDB[i];
                            if (label.labelBase64) {
                              const labelBlob = new Blob(
                                [Uint8Array.from(atob(label.labelBase64), c => c.charCodeAt(0))],
                                { type: 'application/pdf' }
                              );
                              const url = URL.createObjectURL(labelBlob);
                              
                              const printWindow = window.open(url, '_blank');
                              if (printWindow) {
                                printWindow.onload = () => {
                                  printWindow.print();
                                };
                              }
                              
                              setTimeout(() => URL.revokeObjectURL(url), 1000);
                              
                              // Mark as printed using tracking number
                              const trackingNumber = label.trackingNumbers?.[0];
                              if (trackingNumber) {
                                setPrintedPPLLabels(prev => {
                                  const newSet = new Set(prev);
                                  newSet.add(trackingNumber);
                                  return newSet;
                                });
                              }
                              
                              // Small delay between prints to prevent browser blocking
                              if (i < shipmentLabelsFromDB.length - 1) {
                                await new Promise(resolve => setTimeout(resolve, 500));
                              }
                            }
                          }
                          
                          toast({
                            title: "Labels Sent to Printer",
                            description: `${shipmentLabelsFromDB.length} label(s) opened for printing`,
                          });
                        } catch (error: any) {
                          console.error('Error printing labels:', error);
                          toast({
                            title: "Error",
                            description: "Failed to print labels",
                            variant: "destructive"
                          });
                        } finally {
                          setIsPrintingAllLabels(false);
                        }
                      }}
                      disabled={isPrintingAllLabels}
                      data-testid="button-print-all-ppl-labels"
                    >
                      {isPrintingAllLabels ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Printer className="h-4 w-4 mr-2" />
                      )}
                      {isPrintingAllLabels ? 'Printing...' : 'Print All Labels'}
                    </Button>
                  ) : null}

                  {/* Delete All Labels button - ONLY deletes (does NOT regenerate), appears when labels exist and there are multiple cartons */}
                  {shipmentLabelsFromDB.length > 0 && cartons.length > 1 && (
                    <Button
                      variant="outline"
                      className="w-full border-red-300 text-red-700 hover:bg-red-50"
                      onClick={async () => {
                        if (confirm(`Delete all ${shipmentLabelsFromDB.length} shipping labels?\n\nThis will cancel all shipments with PPL. Your carton data (weight, dimensions) will be preserved.\n\nAfter deletion, you can regenerate labels using the "Generate All Labels" button.`)) {
                          try {
                            setIsGeneratingAllLabels(true);
                            console.log('🗑️ Deleting all labels (carton data will be preserved)...');
                            
                            // Delete all labels (cartons are preserved) - NO regeneration happens
                            for (const label of shipmentLabelsFromDB) {
                              await apiRequest('DELETE', `/api/shipment-labels/${label.id}`, {});
                            }
                            
                            // Refresh data
                            await queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
                            await queryClient.invalidateQueries({ queryKey: ['/api/orders', activePackingOrder.id, 'cartons'] });
                            await refetchCartons();
                            await new Promise(resolve => setTimeout(resolve, 300));
                            await fetchShipmentLabels();
                            setShipmentLabelsFromDB([]);
                            
                            toast({
                              title: "All Labels Deleted",
                              description: "Carton data preserved. Use 'Generate All Labels' to create new labels.",
                            });
                          } catch (error: any) {
                            console.error('❌ Delete error:', error);
                            toast({
                              title: "Error",
                              description: error.message || "Failed to delete labels",
                              variant: "destructive"
                            });
                          } finally {
                            setIsGeneratingAllLabels(false);
                          }
                        }
                      }}
                      disabled={isGeneratingAllLabels}
                      data-testid="button-delete-all-labels"
                    >
                      {isGeneratingAllLabels ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      {isGeneratingAllLabels ? 'Deleting...' : 'Delete All Labels'}
                    </Button>
                  )}

                  {/* PPL Shipment Cards - Show cartons and labels */}
                  {activePackingOrder.pplLabelData && (
                    <div className="space-y-2">
                      {(() => {
                        // For PPL shipments, show each carton with its label status
                        const isCancelled = activePackingOrder.pplStatus === 'cancelled';
                        
                        // Combine cartons with their corresponding labels
                        const cartonsWithLabels = cartons.map((carton, index) => {
                          // Find label for this carton (by carton number in labelData)
                          const label = shipmentLabelsFromDB.find((l: any) => {
                            const labelData = l.labelData as any;
                            const matches = labelData?.cartonNumber === index + 1 || 
                                   (index === 0 && !labelData?.cartonNumber); // First label might not have cartonNumber
                            return matches;
                          });
                          
                          return {
                            carton,
                            label,
                            index
                          };
                        });
                        
                        // Find orphaned labels (labels without matching cartons)
                        const matchedLabelIds = new Set(cartonsWithLabels.map(c => c.label?.id).filter(Boolean));
                        const orphanedLabels = shipmentLabelsFromDB.filter(l => !matchedLabelIds.has(l.id));
                        
                        // If no cartons but we have labels, show the labels
                        if (cartons.length === 0 && shipmentLabelsFromDB.length > 0) {
                          return shipmentLabelsFromDB.map((label, index) => (
                            <div 
                              key={label.id}
                              className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ease-in-out animate-in fade-in-0 slide-in-from-bottom-2 ${
                                isCancelled
                                  ? 'bg-gradient-to-r from-gray-100 to-gray-200 border-2 border-gray-400 opacity-75'
                                  : 'bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 hover:shadow-md hover:scale-[1.01]'
                              }`}
                              style={{ animationDelay: `${index * 50}ms` }}
                              data-testid={`ppl-shipment-card-${index + 1}`}
                            >
                              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-110 ${
                                isCancelled ? 'bg-gray-500' : 'bg-orange-600 shadow-lg'
                              }`}>
                                <span className="text-white font-bold text-sm">{index + 1}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  <p className={`text-sm font-semibold truncate ${isCancelled ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                                    CZ-PPL{label.labelData?.hasCOD || activePackingOrder.codAmount > 0 ? '-DOB' : ''} #{index + 1}
                                  </p>
                                  {isCancelled && (
                                    <Badge variant="destructive" className="text-xs px-2 py-0 flex-shrink-0">
                                      CANCELLED
                                    </Badge>
                                  )}
                                </div>
                                {label.trackingNumbers?.[0] && (
                                  <p className={`text-xs font-mono truncate ${isCancelled ? 'text-gray-500 line-through' : 'text-gray-600'}`}>
                                    {label.trackingNumbers[0]}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className={`h-8 text-xs flex-shrink-0 ${
                                  label.trackingNumbers?.[0] && printedPPLLabels.has(label.trackingNumbers[0])
                                    ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                                    : 'hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300'
                                }`}
                                disabled={isCancelled}
                                onClick={async () => {
                                  try {
                                    if (label.labelBase64) {
                                      const labelBlob = new Blob(
                                        [Uint8Array.from(atob(label.labelBase64), c => c.charCodeAt(0))],
                                        { type: 'application/pdf' }
                                      );
                                      const url = URL.createObjectURL(labelBlob);
                                      const printWindow = window.open(url, '_blank');
                                      if (printWindow) {
                                        printWindow.onload = () => {
                                          printWindow.print();
                                          // Track that this label was printed using tracking number
                                          const trackingNumber = label.trackingNumbers?.[0];
                                          if (trackingNumber) {
                                            setPrintedPPLLabels(prev => {
                                              const newSet = new Set(prev);
                                              newSet.add(trackingNumber);
                                              return newSet;
                                            });
                                          }
                                          // Refresh labels to ensure UI is up to date
                                          fetchShipmentLabels();
                                        };
                                      }
                                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                                    }
                                  } catch (error) {
                                    toast({
                                      title: "Error",
                                      description: "Failed to print label",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                                data-testid={`button-print-ppl-label-${index + 1}`}
                              >
                                <Printer className="h-3.5 w-3.5 mr-1.5" />
                                Print
                              </Button>
                              {!isCancelled && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
                                  onClick={async () => {
                                    if (confirm(`Delete label #${index + 1}?\n\nThis will cancel the shipment with PPL. Your carton data will be preserved.`)) {
                                      try {
                                        setDeletingShipment(prev => ({ ...prev, [label.id]: true }));
                                        await apiRequest('DELETE', `/api/shipment-labels/${label.id}`, {});
                                        // Refresh data to update UI
                                        console.log('🔄 Refreshing after delete...');
                                        await queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
                                        await queryClient.invalidateQueries({ queryKey: ['/api/orders', activePackingOrder.id, 'cartons'] });
                                        await refetchCartons();
                                        await new Promise(resolve => setTimeout(resolve, 300));
                                        await fetchShipmentLabels();
                                        setShipmentLabelsFromDB(prev => [...prev]);
                                        console.log('✅ Delete refresh complete');
                                        toast({ 
                                          title: "Label Deleted", 
                                          description: "Carton data preserved. You can regenerate the label if needed."
                                        });
                                      } catch (error) {
                                        toast({
                                          title: "Error",
                                          description: "Failed to delete label",
                                          variant: "destructive"
                                        });
                                      } finally {
                                        setDeletingShipment(prev => ({ ...prev, [label.id]: false }));
                                      }
                                    }
                                  }}
                                  disabled={deletingShipment[label.id]}
                                  data-testid={`button-delete-ppl-shipment-${index + 1}`}
                                >
                                  {deletingShipment[label.id] ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <X className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          ));
                        }
                        
                        // Return both cartons with labels AND orphaned labels
                        return (
                          <>
                            {/* Show cartons with their matched labels */}
                            {cartonsWithLabels.map(({ carton, label, index }) => {
                              return (
                                <div 
                                  key={carton.id}
                                  className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ease-in-out animate-in fade-in-0 slide-in-from-bottom-2 ${
                                    isCancelled
                                      ? 'bg-gradient-to-r from-gray-100 to-gray-200 border-2 border-gray-400 opacity-75'
                                      : 'bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 hover:shadow-md hover:scale-[1.01]'
                                  }`}
                                  style={{ animationDelay: `${index * 50}ms` }}
                                  data-testid={`ppl-shipment-card-${index + 1}`}
                                >
                                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-110 ${
                                    isCancelled ? 'bg-gray-500' : 'bg-orange-600 shadow-lg'
                                  }`}>
                                    <span className="text-white font-bold text-sm">{index + 1}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <p className={`text-sm font-semibold truncate ${isCancelled ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                                        CZ-PPL{activePackingOrder.codAmount > 0 ? '-DOB' : ''} #{index + 1}
                                      </p>
                                      {isCancelled && (
                                        <Badge variant="destructive" className="text-xs px-2 py-0 flex-shrink-0">
                                          CANCELLED
                                        </Badge>
                                      )}
                                    </div>
                                    {label?.trackingNumbers?.[0] ? (
                                      <div className="flex items-center gap-1.5">
                                        <p className={`text-xs font-mono truncate ${isCancelled ? 'text-gray-500 line-through' : 'text-gray-600'}`}>
                                          {label.trackingNumbers[0]}
                                        </p>
                                        {/* Show edit button for PENDING tracking numbers */}
                                        {label.trackingNumbers[0].startsWith('PENDING-') && !isCancelled && (
                                          <button
                                            onClick={async (e) => {
                                              // Prevent double clicks
                                              const btn = e.currentTarget;
                                              if (btn.disabled) return;
                                              
                                              const trackingNumber = prompt(
                                                `⚠️ PPL API couldn't retrieve the tracking number.\n\n` +
                                                `Please check the barcode on the printed label and enter the tracking number:\n\n` +
                                                `Batch ID: ${label.batchId}\n` +
                                                `Label #${index + 1}`,
                                                ''
                                              );
                                              
                                              if (trackingNumber && trackingNumber.trim()) {
                                                // Disable button during request
                                                btn.disabled = true;
                                                btn.classList.add('opacity-50', 'cursor-not-allowed');
                                                
                                                try {
                                                  const response = await apiRequest('PATCH', `/api/shipment-labels/${label.id}/tracking`, {
                                                    trackingNumbers: [trackingNumber.trim()]
                                                  });
                                                  
                                                  if (!response.ok) {
                                                    const errorData = await response.json().catch(() => ({}));
                                                    throw new Error(errorData.error || 'Failed to update tracking number');
                                                  }
                                                  
                                                  // Refresh labels
                                                  await fetchShipmentLabels();
                                                } catch (error: any) {
                                                  toast({
                                                    title: "❌ Error",
                                                    description: error.message || "Failed to update tracking number",
                                                    variant: "destructive"
                                                  });
                                                } finally {
                                                  // Re-enable button
                                                  btn.disabled = false;
                                                  btn.classList.remove('opacity-50', 'cursor-not-allowed');
                                                }
                                              }
                                            }}
                                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-100 p-0.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Update tracking number from label barcode"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-400 italic">No label generated yet</p>
                                    )}
                                  </div>
                                  
                                  {/* Show Generate button ONLY for single carton shipments if no label OR label has no PDF data, Print button if label exists with PDF */}
                                  {(!label || !label.labelBase64) && !isCancelled && cartons.length === 1 ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs flex-shrink-0 bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-300 transition-all duration-200"
                                      onClick={async () => {
                                        try {
                                          setGeneratingLabelForCarton(prev => ({ ...prev, [carton.id]: true }));
                                          console.log(`🎯 Generate clicked for carton #${index + 1}`, carton.id);
                                          toast({
                                            title: "Generating PPL Label...",
                                            description: "Creating shipping label from PPL API",
                                          });
                                          
                                          // Create label for this carton
                                          const response = await apiRequest('POST', `/api/shipping/create-label-for-carton`, {
                                            orderId: activePackingOrder.id,
                                            cartonId: carton.id,
                                            cartonNumber: index + 1
                                          });
                                          
                                          if (!response.ok) {
                                            const error = await response.json();
                                            console.error('❌ Label generation failed:', error);
                                            throw new Error(error.error || 'Failed to create label');
                                          }
                                          
                                          const result = await response.json();
                                          console.log('✅ Label generated successfully:', result);
                                          
                                          // Refresh data - important to fetch labels AFTER backend has saved
                                          console.log('🔄 Step 1: Invalidating queries...');
                                          await queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
                                          await queryClient.invalidateQueries({ queryKey: ['/api/orders', activePackingOrder.id, 'cartons'] });
                                          
                                          console.log('🔄 Step 2: Refetching cartons...');
                                          await refetchCartons();
                                          
                                          console.log('🔄 Step 3: Waiting for database commit...');
                                          await new Promise(resolve => setTimeout(resolve, 500));
                                          
                                          console.log('🔄 Step 4: Fetching shipment labels...');
                                          await fetchShipmentLabels();
                                          
                                          console.log('🔄 Step 5: Force re-render...');
                                          setShipmentLabelsFromDB(prev => [...prev]);
                                          
                                          console.log('✅ All data refreshed');
                                          
                                          // Show tracking number in success message
                                          const trackingNumber = result.trackingNumber || result.trackingNumbers?.[0];
                                          toast({
                                            title: "Label Generated",
                                            description: trackingNumber 
                                              ? `PPL shipping label created. Tracking: ${trackingNumber}`
                                              : "PPL shipping label created successfully",
                                          });
                                        } catch (error: any) {
                                          console.error('❌ Generate error:', error);
                                          toast({
                                            title: "Error",
                                            description: error.message || "Failed to generate label",
                                            variant: "destructive"
                                          });
                                        } finally {
                                          setGeneratingLabelForCarton(prev => ({ ...prev, [carton.id]: false }));
                                        }
                                      }}
                                      disabled={generatingLabelForCarton[carton.id]}
                                      data-testid={`button-generate-ppl-label-${index + 1}`}
                                    >
                                      {generatingLabelForCarton[carton.id] ? (
                                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                      ) : (
                                        <Package className="h-3.5 w-3.5 mr-1.5" />
                                      )}
                                      {generatingLabelForCarton[carton.id] ? 'Generating...' : 'Generate'}
                                    </Button>
                                  ) : label && label.labelBase64 && !isCancelled ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className={`h-8 text-xs flex-shrink-0 ${
                                        label.trackingNumbers?.[0] && printedPPLLabels.has(label.trackingNumbers[0])
                                          ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                                          : 'hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300'
                                      }`}
                                      disabled={isCancelled}
                                      onClick={async () => {
                                        try {
                                          console.log('🖨️ Print button clicked for label:', {
                                            labelId: label.id,
                                            hasLabelBase64: !!label.labelBase64,
                                            labelBase64Length: label.labelBase64?.length,
                                            trackingNumbers: label.trackingNumbers
                                          });
                                          
                                          if (!label.labelBase64) {
                                            console.error('❌ No labelBase64 found!');
                                            toast({
                                              title: "Error",
                                              description: "Label PDF not available. The label might still be processing.",
                                              variant: "destructive"
                                            });
                                            return;
                                          }
                                          
                                          console.log('📄 Creating PDF blob...');
                                          const labelBlob = new Blob(
                                            [Uint8Array.from(atob(label.labelBase64), c => c.charCodeAt(0))],
                                            { type: 'application/pdf' }
                                          );
                                          console.log('✅ Blob created, size:', labelBlob.size);
                                          
                                          const url = URL.createObjectURL(labelBlob);
                                          console.log('🔗 Opening print window...');
                                          const printWindow = window.open(url, '_blank');
                                          
                                          if (printWindow) {
                                            printWindow.onload = () => {
                                              console.log('✅ Print window loaded, triggering print dialog');
                                              printWindow.print();
                                              // Track that this label was printed using tracking number
                                              const trackingNumber = label.trackingNumbers?.[0];
                                              if (trackingNumber) {
                                                setPrintedPPLLabels(prev => {
                                                  const newSet = new Set(prev);
                                                  newSet.add(trackingNumber);
                                                  return newSet;
                                                });
                                              }
                                              // Refresh labels to ensure UI is up to date
                                              fetchShipmentLabels();
                                            };
                                          } else {
                                            console.error('❌ Failed to open print window - might be blocked by popup blocker');
                                            toast({
                                              title: "Error",
                                              description: "Could not open print window. Please allow popups for this site.",
                                              variant: "destructive"
                                            });
                                          }
                                          setTimeout(() => URL.revokeObjectURL(url), 1000);
                                        } catch (error: any) {
                                          console.error('❌ Print error:', error);
                                          toast({
                                            title: "Error",
                                            description: error.message || "Failed to print label",
                                            variant: "destructive"
                                          });
                                        }
                                      }}
                                      data-testid={`button-print-ppl-label-${index + 1}`}
                                    >
                                      {label.trackingNumbers?.[0] && printedPPLLabels.has(label.trackingNumbers[0]) ? (
                                        <>
                                          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                                          Printed
                                        </>
                                      ) : (
                                        <>
                                          <Printer className="h-3.5 w-3.5 mr-1.5" />
                                          Print
                                        </>
                                      )}
                                    </Button>
                                  ) : null}
                                  
                                  {/* Delete button for each shipment */}
                                  {!isCancelled && label && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                      onClick={async () => {
                                        // Check if this is a multi-carton shipment
                                        const totalLabels = shipmentLabelsFromDB.length;
                                        let confirmMessage = `Delete label #${index + 1}?`;
                                        
                                        if (totalLabels > 1) {
                                          confirmMessage = `Delete label #${index + 1}?\n\n⚠️ WARNING: This is a ${totalLabels}-label shipment. After deletion, the remaining labels will show incorrect numbering (e.g., "1/${totalLabels}" instead of "1/${totalLabels - 1}").\n\nTo get proper label numbering, you'll need to delete ALL labels and regenerate the entire shipment.\n\nYour carton data will be preserved.\n\nContinue with deletion anyway?`;
                                        } else {
                                          confirmMessage = `Delete this label?\n\nThis will cancel the shipment with PPL. Your carton data will be preserved.`;
                                        }
                                        
                                        if (confirm(confirmMessage)) {
                                          try {
                                            setDeletingShipment(prev => ({ ...prev, [label.id]: true }));
                                            await apiRequest('DELETE', `/api/shipment-labels/${label.id}`, {});
                                            
                                            // Refresh data to update UI
                                            console.log('🔄 Refreshing after delete...');
                                            await queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
                                            await queryClient.invalidateQueries({ queryKey: ['/api/orders', activePackingOrder.id, 'cartons'] });
                                            await refetchCartons();
                                            await new Promise(resolve => setTimeout(resolve, 300));
                                            await fetchShipmentLabels();
                                            setShipmentLabelsFromDB(prev => [...prev]);
                                            console.log('✅ Delete refresh complete');
                                            
                                            toast({ 
                                              title: "Label Deleted",
                                              description: totalLabels > 1 ? "Carton data preserved. Label numbering may be incorrect - consider regenerating all labels." : "Carton data preserved. You can regenerate the label if needed."
                                            });
                                          } catch (error) {
                                            toast({
                                              title: "Error",
                                              description: "Failed to delete label",
                                              variant: "destructive"
                                            });
                                          } finally {
                                            setDeletingShipment(prev => ({ ...prev, [label.id]: false }));
                                          }
                                        }
                                      }}
                                      disabled={deletingShipment[label.id]}
                                      data-testid={`button-delete-ppl-shipment-${index + 1}`}
                                    >
                                      {deletingShipment[label.id] ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <X className="h-4 w-4" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                            
                            {/* Show orphaned labels (labels without matching cartons) */}
                            {orphanedLabels.map((label, orphanIndex) => {
                              const displayIndex = cartons.length + orphanIndex;
                              const labelNumber = (label.labelData as any)?.cartonNumber || displayIndex + 1;
                              
                              return (
                                <div 
                                  key={label.id}
                                  className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ease-in-out animate-in fade-in-0 slide-in-from-bottom-2 ${
                                    isCancelled
                                      ? 'bg-gradient-to-r from-gray-100 to-gray-200 border-2 border-gray-400 opacity-75'
                                      : 'bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-400 hover:shadow-md hover:scale-[1.01]'
                                  }`}
                                  style={{ animationDelay: `${displayIndex * 50}ms` }}
                                  data-testid={`ppl-orphaned-label-${orphanIndex + 1}`}
                                >
                                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-110 ${
                                    isCancelled ? 'bg-gray-500' : 'bg-amber-600 shadow-lg'
                                  }`}>
                                    <span className="text-white font-bold text-sm">{labelNumber}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <p className={`text-sm font-semibold truncate ${isCancelled ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                                        CZ-PPL{label.labelData?.hasCOD || activePackingOrder.codAmount > 0 ? '-DOB' : ''} #{labelNumber}
                                      </p>
                                      <Badge variant="outline" className="text-xs px-2 py-0 flex-shrink-0 border-amber-500 text-amber-700">
                                        No Carton
                                      </Badge>
                                      {isCancelled && (
                                        <Badge variant="destructive" className="text-xs px-2 py-0 flex-shrink-0">
                                          CANCELLED
                                        </Badge>
                                      )}
                                    </div>
                                    {label.trackingNumbers?.[0] ? (
                                      <p className={`text-xs font-mono truncate ${isCancelled ? 'text-gray-500 line-through' : 'text-gray-600'}`}>
                                        {label.trackingNumbers[0]}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-gray-400 italic">No tracking number</p>
                                    )}
                                  </div>
                                  
                                  {/* Print button */}
                                  {label.labelBase64 && !isCancelled && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className={`h-8 text-xs flex-shrink-0 ${
                                        label.trackingNumbers?.[0] && printedPPLLabels.has(label.trackingNumbers[0])
                                          ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                                          : 'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300'
                                      }`}
                                      onClick={async () => {
                                        try {
                                          const labelBlob = new Blob(
                                            [Uint8Array.from(atob(label.labelBase64), c => c.charCodeAt(0))],
                                            { type: 'application/pdf' }
                                          );
                                          const url = URL.createObjectURL(labelBlob);
                                          const printWindow = window.open(url, '_blank');
                                          if (printWindow) {
                                            printWindow.onload = () => {
                                              printWindow.print();
                                              const trackingNumber = label.trackingNumbers?.[0];
                                              if (trackingNumber) {
                                                setPrintedPPLLabels(prev => {
                                                  const newSet = new Set(prev);
                                                  newSet.add(trackingNumber);
                                                  return newSet;
                                                });
                                              }
                                            };
                                          }
                                          setTimeout(() => URL.revokeObjectURL(url), 1000);
                                        } catch (error) {
                                          toast({
                                            title: "Error",
                                            description: "Failed to print label",
                                            variant: "destructive"
                                          });
                                        }
                                      }}
                                      data-testid={`button-print-orphaned-label-${orphanIndex + 1}`}
                                    >
                                      {label.trackingNumbers?.[0] && printedPPLLabels.has(label.trackingNumbers[0]) ? (
                                        <>
                                          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                                          Printed
                                        </>
                                      ) : (
                                        <>
                                          <Printer className="h-3.5 w-3.5 mr-1.5" />
                                          Print
                                        </>
                                      )}
                                    </Button>
                                  )}
                                  
                                  {/* Delete button */}
                                  {!isCancelled && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                      onClick={async () => {
                                        if (confirm(`Delete label #${labelNumber}?\n\nThis will cancel the shipment with PPL.`)) {
                                          try {
                                            setDeletingShipment(prev => ({ ...prev, [label.id]: true }));
                                            await apiRequest('DELETE', `/api/shipment-labels/${label.id}`, {});
                                            
                                            // Refresh data
                                            await queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
                                            await queryClient.invalidateQueries({ queryKey: ['/api/orders', activePackingOrder.id, 'cartons'] });
                                            await refetchCartons();
                                            await new Promise(resolve => setTimeout(resolve, 300));
                                            await fetchShipmentLabels();
                                            setShipmentLabelsFromDB(prev => [...prev]);
                                            
                                            toast({ 
                                              title: "Label Deleted", 
                                              description: "Label removed successfully."
                                            });
                                          } catch (error) {
                                            toast({
                                              title: "Error",
                                              description: "Failed to delete label",
                                              variant: "destructive"
                                            });
                                          } finally {
                                            setDeletingShipment(prev => ({ ...prev, [label.id]: false }));
                                          }
                                        }
                                      }}
                                      disabled={deletingShipment[label.id]}
                                      data-testid={`button-delete-orphaned-label-${orphanIndex + 1}`}
                                    >
                                      {deletingShipment[label.id] ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <X className="h-4 w-4" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Add Carton Label Button - Creates new non-company carton and generates new PPL label */}
                  {activePackingOrder.pplLabelData && activePackingOrder.pplStatus !== 'cancelled' && (
                    <Button
                      variant="outline"
                      className="w-full border-2 border-dashed border-orange-400 text-orange-700 hover:bg-orange-50 hover:border-orange-300"
                      onClick={async () => {
                        try {
                          console.log('🔧 Adding carton label - Current cartons:', cartons.length);
                          
                          // Show loading toast
                          toast({
                            title: "Creating Carton Label...",
                            description: "Generating new PPL shipping label. This may take a few seconds.",
                          });
                          
                          // Create PPL label (backend atomically creates carton + label)
                          const labelResponse = await apiRequest('POST', `/api/shipping/create-additional-label/${activePackingOrder.id}`, {});
                          
                          if (!labelResponse.ok) {
                            const errorData = await labelResponse.json();
                            throw new Error(errorData.error || 'Failed to create PPL label');
                          }
                          
                          const labelResult = await labelResponse.json();
                          console.log('✅ PPL label and carton created:', labelResult);
                          
                          // Refetch cartons and order data to update the UI
                          await queryClient.invalidateQueries({ queryKey: ['/api/orders', activePackingOrder.id, 'cartons'] });
                          await queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
                          
                          // Force a refetch to ensure UI updates
                          await refetchCartons();
                          
                          // Add delay to ensure database commit completes
                          await new Promise(resolve => setTimeout(resolve, 500));
                          
                          // Refresh shipment labels AFTER database commit
                          await fetchShipmentLabels();
                          
                          // Force re-render by updating state
                          setShipmentLabelsFromDB(prev => [...prev]);
                          
                          // Extract tracking number from response (handle both formats)
                          const trackingNumber = labelResult.trackingNumber || labelResult.trackingNumbers?.[0] || 'N/A';
                          
                          toast({
                            title: "Carton Label Added",
                            description: `New carton created with PPL tracking number: ${trackingNumber}. You now have ${cartons.length + 1} carton(s).`,
                          });
                        } catch (error: any) {
                          console.error('❌ Error adding carton label:', error);
                          toast({
                            title: "Error",
                            description: error.message || "Failed to add carton label",
                            variant: "destructive"
                          });
                        }
                      }}
                      data-testid="button-add-ppl-shipment"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Carton Label
                    </Button>
                  )}
                </>
              )}

              {/* GLS Carton Cards with Tracking */}
              {(() => {
                const shippingMethod = activePackingOrder.shippingMethod?.toUpperCase() || '';
                const isGLS = shippingMethod === 'GLS' || shippingMethod === 'GLS DE' || shippingMethod === 'GLS GERMANY';
                return isGLS && cartons.length > 0;
              })() && (
                <div className="space-y-2">
                  {cartons.map((carton, index) => {
                    // Simple validation from controlled state
                    const currentValue = trackingInputs[carton.id] || '';
                    const hasValue = currentValue.trim() !== '';
                    
                    // Check for duplicates (case-insensitive)
                    const isDuplicate = hasValue && cartons.some((c, i) => 
                      i !== index && 
                      trackingInputs[c.id] &&
                      trackingInputs[c.id].trim().toUpperCase() === currentValue.trim().toUpperCase()
                    );
                    
                    const isValid = hasValue && !isDuplicate;
                    
                    console.log(`🔍 Carton ${index + 1} validation:`, {
                      id: carton.id,
                      currentValue,
                      hasValue,
                      isDuplicate,
                      isValid
                    });
                    
                    return (
                      <div 
                        key={carton.id}
                        className={`border-2 rounded-lg p-3 transition-all ${
                          isDuplicate 
                            ? 'bg-red-50 border-red-300' 
                            : isValid 
                            ? 'bg-green-50 border-green-300' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                        data-testid={`carton-card-${index + 1}`}
                      >
                        {/* Carton Header */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-sm">{carton.cartonNumber}</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">Carton #{carton.cartonNumber}</span>
                          {isDuplicate ? (
                            <div className="flex items-center gap-1 ml-auto">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="text-xs font-medium text-red-600">Duplicate</span>
                            </div>
                          ) : isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                          ) : null}
                        </div>
                        
                        {/* Tracking Number Input with Paste Button and Validation Icon */}
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              type="text"
                              placeholder="Enter tracking number..."
                              value={currentValue}
                              onChange={(e) => {
                                // Update controlled state immediately
                                const newValue = e.target.value;
                                setTrackingInputs(prev => ({
                                  ...prev,
                                  [carton.id]: newValue
                                }));
                              }}
                              onBlur={(e) => {
                                // Save to backend on blur
                                const trackingNumber = e.target.value.trim();
                                if (trackingNumber) {
                                  submitTrackingNumber(carton.id, trackingNumber, carton.cartonNumber, false);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const trackingNumber = e.currentTarget.value.trim();
                                  if (trackingNumber) {
                                    submitTrackingNumber(carton.id, trackingNumber, carton.cartonNumber, false);
                                  }
                                  e.currentTarget.blur();
                                }
                              }}
                              className={`font-mono text-[16px] pr-10 ${
                                isDuplicate ? 'border-red-400 focus:border-red-500' : 
                                isValid ? 'border-green-400 focus:border-green-500' : ''
                              }`}
                              data-testid={`input-gls-tracking-carton-${index + 1}`}
                              id={`tracking-input-${carton.id}`}
                            />
                            {/* Validation Icon inside input */}
                            {hasValue && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                                {isDuplicate ? (
                                  <XCircle className="h-5 w-5 text-red-600 fill-red-50" />
                                ) : (
                                  <CheckCircle className="h-5 w-5 text-green-600 fill-green-50" />
                                )}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="px-3 flex-shrink-0 hover:border-emerald-300 dark:hover:border-emerald-700"
                            onClick={async () => {
                              try {
                                const text = await navigator.clipboard.readText();
                                const trackingNumber = text.trim();
                                if (trackingNumber) {
                                  // Update controlled state
                                  setTrackingInputs(prev => ({
                                    ...prev,
                                    [carton.id]: trackingNumber
                                  }));
                                  // Save to backend using unified function
                                  submitTrackingNumber(carton.id, trackingNumber, carton.cartonNumber, false);
                                }
                              } catch (error) {
                                toast({
                                  title: "Paste failed",
                                  description: "Please allow clipboard access or paste manually",
                                  variant: "destructive"
                                });
                              }
                            }}
                            data-testid={`button-paste-tracking-${index + 1}`}
                          >
                            <ClipboardPaste className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        
                        {/* Duplicate Warning */}
                        {isDuplicate && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            <span className="font-medium">This tracking number is already used by another carton</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* DHL Carton Cards with Tracking */}
              {(() => {
                const shippingMethod = activePackingOrder.shippingMethod?.toUpperCase() || '';
                const isDHL = shippingMethod === 'DHL' || shippingMethod === 'DHL DE' || shippingMethod === 'DHL GERMANY' || shippingMethod.includes('DHL');
                return isDHL && cartons.length > 0;
              })() && (
                <div className="space-y-2">
                  {cartons.map((carton, index) => {
                    // Simple validation from controlled state
                    const currentValue = trackingInputs[carton.id] || '';
                    const hasValue = currentValue.trim() !== '';
                    
                    // Check for duplicates (case-insensitive)
                    const isDuplicate = hasValue && cartons.some((c, i) => 
                      i !== index && 
                      trackingInputs[c.id] &&
                      trackingInputs[c.id].trim().toUpperCase() === currentValue.trim().toUpperCase()
                    );
                    
                    const isValid = hasValue && !isDuplicate;
                    
                    return (
                      <div 
                        key={carton.id}
                        className={`border-2 rounded-lg p-3 transition-all ${
                          isDuplicate 
                            ? 'bg-red-50 border-red-300' 
                            : isValid 
                            ? 'bg-green-50 border-green-300' 
                            : 'bg-yellow-50 border-yellow-200'
                        }`}
                        data-testid={`dhl-carton-card-${index + 1}`}
                      >
                        {/* Carton Header */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-black font-bold text-sm">{carton.cartonNumber}</span>
                          </div>
                          <span className="text-sm font-semibold text-black">Carton #{carton.cartonNumber}</span>
                          {isDuplicate ? (
                            <div className="flex items-center gap-1 ml-auto">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="text-xs font-medium text-red-600">Duplicate</span>
                            </div>
                          ) : isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                          ) : null}
                        </div>
                        
                        {/* Tracking Number Input with Paste Button and Validation Icon */}
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              type="text"
                              placeholder="Enter DHL tracking number..."
                              value={currentValue}
                              onChange={(e) => {
                                // Update controlled state immediately
                                const newValue = e.target.value;
                                setTrackingInputs(prev => ({
                                  ...prev,
                                  [carton.id]: newValue
                                }));
                              }}
                              onBlur={(e) => {
                                // Save to backend on blur
                                const trackingNumber = e.target.value.trim();
                                if (trackingNumber) {
                                  submitTrackingNumber(carton.id, trackingNumber, carton.cartonNumber, false);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const trackingNumber = e.currentTarget.value.trim();
                                  if (trackingNumber) {
                                    submitTrackingNumber(carton.id, trackingNumber, carton.cartonNumber, false);
                                  }
                                  e.currentTarget.blur();
                                }
                              }}
                              className={`font-mono text-[16px] pr-10 ${
                                isDuplicate ? 'border-red-400 focus:border-red-500' : 
                                isValid ? 'border-green-400 focus:border-green-500' : ''
                              }`}
                              data-testid={`input-dhl-tracking-carton-${index + 1}`}
                              id={`dhl-tracking-input-${carton.id}`}
                            />
                            {/* Validation Icon inside input */}
                            {hasValue && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                                {isDuplicate ? (
                                  <XCircle className="h-5 w-5 text-red-600 fill-red-50" />
                                ) : (
                                  <CheckCircle className="h-5 w-5 text-green-600 fill-green-50" />
                                )}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="px-3 flex-shrink-0 hover:border-emerald-300 dark:hover:border-emerald-700"
                            onClick={async () => {
                              try {
                                const text = await navigator.clipboard.readText();
                                const trackingNumber = text.trim();
                                if (trackingNumber) {
                                  // Update controlled state
                                  setTrackingInputs(prev => ({
                                    ...prev,
                                    [carton.id]: trackingNumber
                                  }));
                                  // Save to backend using unified function
                                  submitTrackingNumber(carton.id, trackingNumber, carton.cartonNumber, false);
                                }
                              } catch (error) {
                                toast({
                                  title: "Paste failed",
                                  description: "Please allow clipboard access or paste manually",
                                  variant: "destructive"
                                });
                              }
                            }}
                            data-testid={`button-paste-dhl-tracking-${index + 1}`}
                          >
                            <ClipboardPaste className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        
                        {/* Duplicate Warning */}
                        {isDuplicate && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            <span className="font-medium">This tracking number is already used by another carton</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Regular Shipping Labels (for non-PPL, non-DHL, non-GLS shipments) */}
              {(() => {
                const shippingMethod = activePackingOrder.shippingMethod?.toUpperCase() || '';
                const isGLS = shippingMethod === 'GLS' || shippingMethod === 'GLS DE' || shippingMethod === 'GLS GERMANY';
                const isPPL = shippingMethod.includes('PPL');
                const isDHL = shippingMethod.includes('DHL');
                return !isPPL && !isDHL && !isGLS;
              })() && (
                <>
                  {/* Labels Display */}
                  {shippingLabels.length > 0 ? (
                    <div className="space-y-2">
                      {shippingLabels.map((label) => (
                        <div 
                          key={label.id}
                          className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-lg"
                          data-testid={`shipping-label-${label.labelNumber}`}
                        >
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">{label.labelNumber}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">Shipping Label #{label.labelNumber}</p>
                            <p className="text-xs text-gray-600">For Carton #{label.labelNumber}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs flex-shrink-0 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                            onClick={() => {
                              window.print();
                            }}
                            data-testid={`button-print-label-${label.labelNumber}`}
                          >
                            <Printer className="h-3.5 w-3.5 mr-1.5" />
                            Print
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => {
                              setShippingLabels(prev => prev.filter(l => l.id !== label.id));
                            }}
                            data-testid={`button-remove-label-${label.labelNumber}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg border border-gray-200">
                      No shipping labels. Add cartons to auto-generate labels, or add manually.
                    </div>
                  )}

                  {/* Add Label Button */}
                  <Button
                    variant="outline"
                    className="w-full border-2 border-dashed border-blue-400 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                    onClick={() => {
                      const nextNumber = shippingLabels.length + 1;
                      setShippingLabels(prev => [
                        ...prev,
                        { id: `label-${Date.now()}`, labelNumber: nextNumber }
                      ]);
                    }}
                    data-testid="add-shipping-label-button"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Shipping Label
                  </Button>

                  {/* Summary */}
                  {shippingLabels.length > 0 && (
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-blue-800">Total Labels:</span>
                        <span className="font-bold text-blue-900">{shippingLabels.length}</span>
                      </div>
                      {cartons.length > 0 && shippingLabels.length !== cartons.length && (
                        <Alert className="mt-2 bg-amber-50 border-amber-300">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <AlertDescription className="text-xs text-amber-800">
                            Label count ({shippingLabels.length}) differs from carton count ({cartons.length})
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Complete Packing Button - Large, Prominent */}
          <div className="sticky bottom-0 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-4 pb-2">
            <Button 
              size="lg" 
              onClick={() => {
                if (canCompletePacking) {
                  completePacking();
                } else {
                  // Find the first incomplete item and scroll to it
                  const scrollToElement = (id: string, message: string) => {
                    const element = document.getElementById(id);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      // Add a brief highlight effect
                      element.classList.add('ring-4', 'ring-yellow-400', 'ring-offset-2');
                      setTimeout(() => {
                        element.classList.remove('ring-4', 'ring-yellow-400', 'ring-offset-2');
                      }, 2000);
                      
                      toast({
                        title: "Almost there!",
                        description: message,
                        duration: 5000,
                      });
                      playSound('error');
                      return true;
                    }
                    return false;
                  };

                  // Check each item in order and scroll to the first incomplete one
                  if (!(packingChecklist.itemsVerified || allItemsVerified)) {
                    scrollToElement('checklist-items-verified', 'Please check all items to make sure everything is correct.');
                  } else if (!printedDocuments.packingList) {
                    scrollToElement('checklist-packing-slip', 'Please print the packing slip to include in the shipment.');
                  } else if (cartons.length === 0) {
                    scrollToElement('checklist-cartons', 'Please add at least one carton for this shipment.');
                  } else if (cartons.some(c => !c.cartonId && c.cartonType !== 'non-company')) {
                    scrollToElement('checklist-cartons', 'Please select a carton type for all cartons.');
                  } else if (cartons.some(c => !c.weight || parseFloat(c.weight) <= 0)) {
                    scrollToElement('checklist-cartons', 'Please enter the weight for all cartons.');
                  } else if (isGLSShipping && cartons.some(c => parseFloat(c.weight) > 40)) {
                    scrollToElement('checklist-cartons', 'GLS shipments cannot exceed 40kg per carton. Please reduce weight or split into multiple cartons.');
                  } else if ((() => {
                    // Enhanced shipping label validation based on shipping method
                    const isPPL = shippingMethod.includes('PPL');
                    const isGLS = isGLSShipping;
                    const isDHL = shippingMethod.includes('DHL');
                    
                    if (isPPL) {
                      // PPL: Must have created shipment and labels in database
                      if (activePackingOrder.pplStatus !== 'created') {
                        return true; // Not created yet
                      }
                      // Check if all cartons have labels from database
                      if (shipmentLabelsFromDB.length < cartons.length) {
                        return true; // Missing labels
                      }
                    } else if (isGLS) {
                      // GLS: All cartons must have tracking numbers (check controlled state)
                      if (cartons.some(c => {
                        const trackingValue = trackingInputs[c.id] || '';
                        return trackingValue.trim() === '';
                      })) {
                        return true; // Missing tracking number
                      }
                    } else {
                      // Other methods: Check labelPrinted flag
                      if (cartons.some(c => !c.labelPrinted)) {
                        return true; // Label not marked as printed
                      }
                    }
                    
                    return false; // All validations passed
                  })()) {
                    // Show appropriate error message based on shipping method
                    const isPPL = shippingMethod.includes('PPL');
                    const isGLS = isGLSShipping;
                    
                    if (isPPL && activePackingOrder.pplStatus !== 'created') {
                      scrollToElement('checklist-shipping-labels', 'Please create PPL shipment labels before completing packing.');
                    } else if (isPPL && shipmentLabelsFromDB.length < cartons.length) {
                      scrollToElement('checklist-shipping-labels', `Missing PPL labels: ${shipmentLabelsFromDB.length} of ${cartons.length} cartons have labels. Please generate all labels.`);
                    } else if (isGLS && cartons.some(c => {
                      const trackingValue = trackingInputs[c.id] || '';
                      return trackingValue.trim() === '';
                    })) {
                      scrollToElement('checklist-shipping-labels', 'Please enter tracking numbers for all GLS cartons before completing packing.');
                    } else if (isGLS && (() => {
                      // Check for duplicate tracking numbers in controlled state
                      return cartons.some((c, i) => {
                        const trackingValue = (trackingInputs[c.id] || '').trim();
                        if (trackingValue === '') return false; // Skip empty values
                        return cartons.some((other, j) => {
                          if (i === j) return false;
                          const otherValue = (trackingInputs[other.id] || '').trim();
                          return otherValue !== '' && trackingValue.toUpperCase() === otherValue.toUpperCase();
                        });
                      });
                    })()) {
                      scrollToElement('checklist-shipping-labels', 'Duplicate tracking numbers detected. Each carton must have a unique tracking number.');
                    } else {
                      scrollToElement('checklist-shipping-labels', 'Please generate and print shipping labels for all cartons.');
                    }
                  } else {
                    // Fallback - show general message
                    toast({
                      title: "Almost there!",
                      description: "Please complete all required steps before finishing packing.",
                      duration: 5000,
                    });
                    playSound('error');
                  }
                }
              }}
              className={`w-full h-14 text-base font-bold shadow-lg transition-all ${
                canCompletePacking
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                  : 'bg-yellow-500 hover:bg-yellow-600 text-white'
              }`}
              data-testid="button-complete-packing"
            >
              {canCompletePacking ? (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Complete Packing - Ready for Shipping
                </>
              ) : (
                <>
                  <PackageCheck className="h-5 w-5 mr-2" />
                  Complete All Steps to Finish Packing
                </>
              )}
            </Button>
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
              
              {/* Picking Item & Progress Bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-white/20 rounded-full p-1.5">
                      <Package className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-white/80 text-xs font-medium">Picking Item</p>
                      <p className="text-white text-lg font-black">{currentItemIndex + 1} / {activePickingOrder.items.length}</p>
                    </div>
                  </div>
                  {currentItem?.pickedQuantity === currentItem?.quantity && (
                    <CheckCircle className="h-6 w-6 text-green-400 animate-pulse" />
                  )}
                </div>
                
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
              
              {/* Picking Item & Progress Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 rounded-full p-2">
                      <Package className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white/80 text-sm font-medium">Picking Item</p>
                      <p className="text-white text-2xl font-black">{currentItemIndex + 1} / {activePickingOrder.items.length}</p>
                    </div>
                  </div>
                  {currentItem?.pickedQuantity === currentItem?.quantity && (
                    <CheckCircle className="h-8 w-8 text-green-400 animate-pulse" />
                  )}
                </div>
                
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

        {/* Item Overview Modal */}
        {showItemOverviewModal && activePickingOrder && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
            onClick={() => setShowItemOverviewModal(false)}
          >
            <div 
              className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-3 sm:p-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5" />
                    <h2 className="text-base sm:text-lg font-bold">Order Items Overview</h2>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-white hover:bg-white/20 h-8 w-8 p-0"
                    onClick={() => setShowItemOverviewModal(false)}
                    data-testid="button-close-overview"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <Badge className="bg-white text-blue-600 font-bold px-2 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm">
                      {activePickingOrder.pickedItems}/{activePickingOrder.totalItems} Picked
                    </Badge>
                    <div className="text-xs sm:text-sm text-blue-100">
                      Order: {activePickingOrder.orderId}
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="text-white hover:bg-white/20 h-8 px-2 sm:px-3 text-xs sm:text-sm font-semibold"
                    onClick={() => {
                      const allItemIds = activePickingOrder.items.map(item => item.id);
                      if (expandedOverviewItems.size === allItemIds.length) {
                        // Collapse all
                        setExpandedOverviewItems(new Set());
                      } else {
                        // Expand all
                        setExpandedOverviewItems(new Set(allItemIds));
                      }
                    }}
                    data-testid="button-toggle-expand-all"
                  >
                    {expandedOverviewItems.size === activePickingOrder.items.length ? (
                      <>
                        <ChevronsUp className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Collapse All</span>
                      </>
                    ) : (
                      <>
                        <ChevronsDown className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Expand All</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="p-3 sm:p-4 overflow-y-auto flex-1">
                <div className="space-y-3">
                  {activePickingOrder.items.map((item, index) => {
                    const isPicked = item.pickedQuantity >= item.quantity;
                    const isPartiallyPicked = item.pickedQuantity > 0 && item.pickedQuantity < item.quantity;
                    const isCurrent = currentItem?.id === item.id;
                    
                    return (
                      <Card 
                        key={item.id} 
                        className={`transition-all ${
                          isPicked ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 shadow-md' : 
                          isPartiallyPicked ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-400 shadow-md' :
                          isCurrent ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-500 shadow-lg' : 
                          'bg-white hover:shadow-md border-2 border-gray-200'
                        }`}
                        data-testid={`item-overview-${item.id}`}
                      >
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-center gap-3">
                            {/* Clickable Number Badge - Toggleable */}
                            <div 
                              className="flex-shrink-0 cursor-pointer active:scale-95 transition-transform"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isPicked) {
                                  // Unpick - reset to 0
                                  updatePickedItem(item.id, 0);
                                } else {
                                  // Pick fully
                                  updatePickedItem(item.id, item.quantity);
                                  playSound('success');
                                }
                              }}
                              data-testid={`quick-pick-${item.id}`}
                            >
                              {isPicked ? (
                                <div className="bg-green-500 rounded-full p-2 shadow-lg hover:bg-green-600">
                                  <CheckCircle className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                                </div>
                              ) : isPartiallyPicked ? (
                                <div className="bg-yellow-500 rounded-full p-2 shadow-lg hover:bg-yellow-600">
                                  <Clock className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                                </div>
                              ) : (
                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-3 border-gray-400 flex items-center justify-center text-lg sm:text-xl font-black text-gray-700 hover:bg-blue-500 hover:text-white hover:border-blue-600 transition-all shadow-md">
                                  {index + 1}
                                </div>
                              )}
                            </div>
                            
                            {/* Product Image */}
                            <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                              {item.image ? (
                                <img 
                                  src={item.image} 
                                  alt={item.productName}
                                  className="w-full h-full object-contain p-1"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="h-8 w-8 text-gray-300" />
                                </div>
                              )}
                            </div>
                            
                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                              <p className={`font-bold text-sm sm:text-base leading-tight ${
                                isPicked ? 'text-green-700' : 
                                isPartiallyPicked ? 'text-yellow-700' :
                                isCurrent ? 'text-blue-700' : 'text-gray-900'
                              }`}>
                                {item.productName}
                              </p>
                              
                              {/* Quantity Display */}
                              <div className="flex items-center gap-2 mt-2">
                                <div className={`text-xl sm:text-2xl font-black ${
                                  isPicked ? 'text-green-600' : 
                                  isPartiallyPicked ? 'text-yellow-600' :
                                  'text-gray-600'
                                }`}>
                                  {item.pickedQuantity}/{item.quantity}
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                  isPicked ? 'bg-green-100 text-green-700' :
                                  isPartiallyPicked ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {isPicked ? 'Complete' : isPartiallyPicked ? 'In Progress' : 'Not Started'}
                                </span>
                              </div>
                              
                              {/* Progress Bar */}
                              <div className="mt-2 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-300 ${
                                    isPicked ? 'bg-green-500' : 
                                    isPartiallyPicked ? 'bg-yellow-500' : 
                                    'bg-blue-500'
                                  }`}
                                  style={{ width: `${(item.pickedQuantity / item.quantity) * 100}%` }}
                                />
                              </div>
                            </div>
                            
                            {/* Expand/Collapse Toggle */}
                            <div className="flex-shrink-0 flex flex-col gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-10 sm:h-12 px-3 sm:px-4"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newExpanded = new Set(expandedOverviewItems);
                                  if (newExpanded.has(item.id)) {
                                    newExpanded.delete(item.id);
                                  } else {
                                    newExpanded.add(item.id);
                                  }
                                  setExpandedOverviewItems(newExpanded);
                                }}
                              >
                                {expandedOverviewItems.has(item.id) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                          
                          {/* Expandable Details Section */}
                          {expandedOverviewItems.has(item.id) && (
                            <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border-2 border-orange-300 shadow-sm">
                                <p className="text-xs font-bold text-orange-800 uppercase mb-2 tracking-wider">Warehouse Location</p>
                                <p className="text-2xl font-mono font-black text-orange-600 break-all">{item.warehouseLocation}</p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full h-10 text-sm font-semibold"
                                onClick={() => {
                                  setManualItemIndex(index);
                                  setShowItemOverviewModal(false);
                                }}
                              >
                                <ChevronRight className="h-4 w-4 mr-2" />
                                Go to This Item
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
              
              <div className="border-t p-3 sm:p-4 bg-gray-50 space-y-2 sm:space-y-3 flex-shrink-0">
                {/* Barcode Scanner */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      ref={overviewBarcodeInputRef}
                      placeholder="Scan barcode or SKU..."
                      value={overviewBarcodeInput}
                      onChange={(e) => setOverviewBarcodeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleOverviewBarcodeScan();
                        }
                      }}
                      className="text-sm sm:text-base h-10 sm:h-11 bg-white border-2 border-gray-300 placeholder:text-gray-400 font-mono"
                    />
                  </div>
                  <Button 
                    onClick={handleOverviewBarcodeScan}
                    className="h-10 sm:h-11 px-3 sm:px-5 bg-green-600 hover:bg-green-700 text-white font-bold shadow-md text-sm sm:text-base"
                  >
                    <ScanLine className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Scan</span>
                  </Button>
                </div>
                
                {/* Continue Picking Button */}
                <Button 
                  className="w-full h-10 sm:h-12 text-sm sm:text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  onClick={() => setShowItemOverviewModal(false)}
                  data-testid="button-close-overview-bottom"
                >
                  Continue Picking
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Scrollable container */}
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col lg:flex-row min-h-full">
            {/* Left Panel - Current Item Focus */}
            <div className="flex-1">
            {!allItemsPicked && currentItem ? (
              <div className="h-full flex flex-col bg-gray-50">
                
                <div className="flex-1 p-4 space-y-4 overflow-auto">
                      {/* Streamlined Product Display - Hero Image Layout */}
                      <div className="space-y-4">
                        {/* Hero Product Image - Always Large and Prominent */}
                        <div 
                          className="relative bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm flex items-center justify-center"
                          onClick={() => handleImageClick(currentItem.id)}
                        >
                          <div className="aspect-square max-h-64 sm:max-h-80 lg:max-h-96 bg-gradient-to-br from-gray-50 to-gray-100 cursor-pointer p-4">
                            <div className="w-full h-full flex items-center justify-center">
                              {currentItem.image ? (
                                <img 
                                  src={currentItem.image} 
                                  alt={currentItem.productName}
                                  className="max-w-full max-h-full w-auto h-auto object-contain"
                                />
                              ) : currentItem.serviceId ? (
                                <Wrench className="h-24 w-24 sm:h-32 sm:w-32 text-purple-300" />
                              ) : (
                                <Package className="h-24 w-24 sm:h-32 sm:w-32 text-gray-300" />
                              )}
                            </div>
                            {/* Overlay Badge for Quick Info */}
                            <div className="absolute top-2 right-2 bg-black/75 text-white px-3 py-1 rounded-full text-sm font-bold z-10">
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
                      <div className="bg-orange-100 border-4 border-orange-500 rounded-lg p-6 text-center shadow-lg overflow-hidden">
                        <p className="text-xs font-bold text-orange-800 uppercase mb-2 tracking-wider">Warehouse Location</p>
                        <p 
                          className="font-black text-orange-600 font-mono"
                          style={{
                            fontSize: 'min(4.5vw, 2.5rem)',
                            lineHeight: '1.3',
                            width: '100%',
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflowWrap: 'normal',
                            wordBreak: 'keep-all',
                            hyphens: 'manual'
                          }}
                        >
                          {(currentItem.warehouseLocation || '').split('-').map((part, i, arr) => (
                            <span key={i}>
                              {part}
                              {i < arr.length - 1 && <wbr />}
                              {i < arr.length - 1 && '-'}
                            </span>
                          ))}
                        </p>
                      </div>

                      {/* Shipping Notes - Important Picking Instructions */}
                      {currentItem.notes && (
                        <div className="bg-amber-50 border-3 border-amber-500 rounded-lg p-4 shadow-lg">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              <div className="bg-amber-500 rounded-full p-2">
                                <AlertCircle className="h-5 w-5 text-white" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                                🟡 Shipping Notes
                              </h3>
                              <p className="text-base lg:text-lg font-semibold text-amber-900 leading-relaxed whitespace-pre-wrap">
                                {currentItem.notes}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

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
                                  <div className="flex items-start gap-2">
                                    {/* Item Image - Bundle items don't have images */}
                                    <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                                      <div className="w-full h-full flex items-center justify-center">
                                        <Package className="h-8 w-8 text-gray-400" />
                                      </div>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      {bundleItem.colorNumber && (
                                        <div className="text-xl font-bold text-purple-700 mb-1">
                                          #{bundleItem.colorNumber}
                                        </div>
                                      )}
                                      <div className="text-sm font-medium text-gray-800 truncate">
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
                                    
                                    <div className={`w-6 h-6 flex-shrink-0 rounded-full border-2 flex items-center justify-center ${
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

                          {/* Quick Action Buttons Grid - Simplified */}
                          <div className="grid grid-cols-3 gap-3">
                            {/* Minus Button */}
                            <Button
                              size="lg"
                              className="h-20 text-3xl font-black bg-red-500 hover:bg-red-600 text-white shadow-lg rounded-xl"
                              onClick={() => updatePickedItem(currentItem.id, Math.max(currentItem.pickedQuantity - 1, 0))}
                              disabled={currentItem.pickedQuantity === 0}
                            >
                              <Minus className="h-8 w-8" />
                            </Button>
                            
                            {/* Plus Button */}
                            <Button
                              size="lg"
                              className="h-20 text-3xl font-black bg-blue-500 hover:bg-blue-600 text-white shadow-lg rounded-xl"
                              onClick={() => updatePickedItem(currentItem.id, Math.min(currentItem.pickedQuantity + 1, currentItem.quantity))}
                              disabled={currentItem.pickedQuantity >= currentItem.quantity}
                            >
                              <Plus className="h-8 w-8" />
                            </Button>
                            
                            {/* Pick All Button */}
                            <Button
                              size="lg"
                              className="h-20 text-xl font-black bg-green-500 hover:bg-green-600 text-white shadow-lg rounded-xl"
                              onClick={() => updatePickedItem(currentItem.id, currentItem.quantity)}
                              disabled={currentItem.pickedQuantity >= currentItem.quantity}
                            >
                              <CheckCircle className="h-6 w-6" />
                              <span className="ml-2">ALL</span>
                            </Button>
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
                      <div className="space-y-6">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1 h-11 text-sm font-semibold border-2 border-gray-300 hover:bg-gray-50 disabled:opacity-30 rounded-lg"
                            onClick={() => {
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
                              setManualItemIndex(Math.min(activePickingOrder.items.length - 1, currentItemIndex + 1));
                            }}
                            disabled={currentItemIndex === activePickingOrder.items.length - 1}
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                        
                        {/* View All Items Button */}
                        <Button
                          variant="outline"
                          className="w-full h-11 text-sm font-semibold border-2 border-blue-300 text-blue-600 hover:bg-blue-50 rounded-lg"
                          onClick={() => setShowItemOverviewModal(true)}
                          data-testid="button-view-all-items"
                        >
                          <ClipboardList className="h-4 w-4 mr-2" />
                          View All Items ({activePickingOrder.pickedItems}/{activePickingOrder.totalItems})
                        </Button>
                      </div>
                    </div>
                  
                  {/* Barcode Scanner - Fixed to Bottom */}
                  <div className="sticky bottom-0 bg-white border-t-2 border-gray-300">
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
                          // Don't set packStatus since startPacking() already sets it to 'in_progress'
                          completePicking(false).catch(console.error);
                          
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
                          
                          // Use smart scoring to select the best next order
                          const nextOrder = pendingOrders
                            .map(order => ({
                              order,
                              score: calculateOrderScore(order)
                            }))
                            .sort((a, b) => b.score - a.score)
                            .map(item => item.order)[0];
                          
                          if (nextOrder) {
                            console.log('Starting next order:', nextOrder, 'Score:', calculateOrderScore(nextOrder));
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
                      
                      <Button 
                        size="lg" 
                        variant="outline"
                        onClick={async () => {
                          // Complete picking and move to packing stage
                          try {
                            if (!activePickingOrder.id.startsWith('mock-')) {
                              await apiRequest('PATCH', `/api/orders/${activePickingOrder.id}`, {
                                pickStatus: 'completed',
                                pickEndTime: new Date().toISOString(),
                                packStatus: 'not_started',
                                orderStatus: 'to_fulfill'
                              });
                            }
                          } catch (error) {
                            console.error('Error completing picking:', error);
                          }
                          
                          // Exit picking mode and return to the tab where user started
                          setActivePickingOrder(null);
                          setIsTimerRunning(false);
                          if (activePickingOrder) {
                            clearPickedProgress(activePickingOrder.id);
                          }
                          
                          // Return to the tab the user was on when they started picking
                          setSelectedTab(originatingTab);
                          
                          // Clear header hiding
                          sessionStorage.removeItem('pickpack-active-mode');
                          
                          // Refresh data
                          queryClient.invalidateQueries({ queryKey: ['/api/orders/pick-pack'] });
                        }}
                        className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl font-bold border-2 border-gray-400 text-gray-600 hover:bg-gray-50 shadow-lg"
                      >
                        <Home className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 mr-2 lg:mr-3" />
                        BACK TO OVERVIEW
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
      {/* Header with Navigation and Overview */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-3 sm:px-6 py-4">
          {/* Page Title and Brief Overview */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                Pick & Pack Workflow
              </h1>
              <p className="text-sm text-gray-600 mt-1">Manage order fulfillment from picking to shipping</p>
            </div>

            {/* Quick Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-center" data-testid="stat-pending">
                <div className="text-lg sm:text-2xl font-bold text-orange-600">{stats.pending}</div>
                <div className="text-xs text-orange-700">Pending</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center" data-testid="stat-picking">
                <div className="text-lg sm:text-2xl font-bold text-blue-600">{stats.picking}</div>
                <div className="text-xs text-blue-700">Picking</div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-center" data-testid="stat-packing">
                <div className="text-lg sm:text-2xl font-bold text-purple-600">{stats.packing}</div>
                <div className="text-xs text-purple-700">Packing</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center" data-testid="stat-ready">
                <div className="text-lg sm:text-2xl font-bold text-green-600">{stats.ready}</div>
                <div className="text-xs text-green-700">Ready</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Mobile Optimized */}
      <div className="px-3 sm:px-6 pb-6 pt-4">
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
                                <span className="truncate font-medium text-blue-600">{order.shippingMethod || 'Standard'}</span>
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
                                  <span className="truncate font-medium text-blue-600">{order.shippingMethod || 'Standard'}</span>
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
                                  <span className="truncate font-medium text-blue-600">{order.shippingMethod || 'Standard'}</span>
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
                                className={`flex-1 sm:flex-initial sm:w-full h-10 sm:h-12 text-sm font-semibold ${
                                  order.packStatus === 'in_progress' 
                                    ? 'bg-amber-600 hover:bg-amber-700' 
                                    : 'bg-purple-600 hover:bg-purple-700'
                                }`}
                                onClick={() => startPacking(order)}
                              >
                                <Box className="h-4 w-4 mr-2" />
                                {order.packStatus === 'in_progress' ? 'Resume' : 'Start'}
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
                      
                      // Helper to safely get address string (handles both string and object formats)
                      const getAddressString = (order: any): string => {
                        if (!order.shippingAddress) return '';
                        if (typeof order.shippingAddress === 'string') {
                          return order.shippingAddress.toLowerCase();
                        }
                        // If it's an object, concatenate relevant fields
                        const addr = order.shippingAddress;
                        return [
                          addr.street,
                          addr.city,
                          addr.country,
                          addr.zipCode
                        ].filter(Boolean).join(' ').toLowerCase();
                      };
                      
                      // Categorize orders
                      const czechiaSlovakia = readyOrders.filter(order => {
                        // Check order ID prefix or notes content for CZ orders
                        const orderId = order.orderId?.toLowerCase() || '';
                        const notes = order.notes?.toLowerCase() || '';
                        const address = getAddressString(order);
                        
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
                        const address = getAddressString(order);
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
                                            <span className="truncate font-medium text-blue-600">{order.shippingMethod || 'Standard'}</span>
                                          </div>
                                        </div>
                                        {order.packedBy && (
                                          <div className="flex items-center gap-1.5 text-xs mt-1">
                                            <CheckCircle className="h-3 w-3 text-green-500" />
                                            <span className="text-green-600 font-medium">Packed by {order.packedBy}</span>
                                          </div>
                                        )}
                                        {order.trackingNumber && (
                                          <div className="flex items-center gap-1.5 text-xs mt-1">
                                            <Hash className="h-3 w-3 text-blue-500" />
                                            <span className="text-blue-600 font-medium">Tracking: {order.trackingNumber}</span>
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
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            // Fetch and show label preview
                                            try {
                                              const response = await fetch(`/api/orders/${order.id}/shipment-labels`);
                                              if (response.ok) {
                                                const labels = await response.json();
                                                if (labels && labels.length > 0) {
                                                  const firstLabel = labels[0];
                                                  setLabelPreviewData({
                                                    orderId: order.orderId,
                                                    labelBase64: firstLabel.labelBase64,
                                                    trackingNumbers: firstLabel.trackingNumbers || []
                                                  });
                                                  playSound('success');
                                                } else {
                                                  toast({
                                                    title: "No Label Found",
                                                    description: "No shipping label has been generated for this order yet.",
                                                    variant: "destructive"
                                                  });
                                                }
                                              }
                                            } catch (error) {
                                              console.error('Error fetching label:', error);
                                              toast({
                                                title: "Error",
                                                description: "Failed to load shipping label",
                                                variant: "destructive"
                                              });
                                            }
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
                <p className="font-medium text-gray-900 break-words whitespace-pre-line">
                  {formatShippingAddress(previewOrder?.shippingAddress) || 'No address provided'}
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
                {previewOrder?.trackingNumber && (
                  <div className="col-span-2">
                    <span className="text-gray-600">Tracking Number:</span>
                    <p className="font-medium text-blue-600 flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      {previewOrder.trackingNumber}
                    </p>
                  </div>
                )}
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

      {/* Label Preview Dialog */}
      <Dialog open={!!labelPreviewData} onOpenChange={() => setLabelPreviewData(null)}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b bg-gradient-to-r from-slate-50 to-gray-50">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">
                Shipping Label - {labelPreviewData?.orderId}
              </h2>
              {labelPreviewData?.trackingNumbers && labelPreviewData.trackingNumbers.length > 0 && (
                <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5" />
                  Tracking: <span className="font-medium text-gray-900">{labelPreviewData.trackingNumbers.join(', ')}</span>
                </p>
              )}
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="bg-white">
            {labelPreviewData?.labelBase64 && (
              <div className="w-full bg-gray-100 border-y">
                <embed
                  src={`data:application/pdf;base64,${labelPreviewData.labelBase64}`}
                  type="application/pdf"
                  width="100%"
                  height="600px"
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-center gap-3">
            <Button
              onClick={() => {
                // Print the label
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  printWindow.document.write(`
                    <html>
                      <head><title>Shipping Label - ${labelPreviewData?.orderId}</title></head>
                      <body style="margin:0">
                        <embed src="data:application/pdf;base64,${labelPreviewData?.labelBase64}" 
                               type="application/pdf" 
                               width="100%" 
                               height="100%" />
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                  setTimeout(() => {
                    printWindow.print();
                  }, 250);
                }
                playSound('success');
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-6"
              size="lg"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Label
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                // Download the label
                const link = document.createElement('a');
                link.href = `data:application/pdf;base64,${labelPreviewData?.labelBase64}`;
                link.download = `shipping-label-${labelPreviewData?.orderId}.pdf`;
                link.click();
                playSound('success');
              }}
              className="border-gray-300 hover:bg-gray-100 px-6"
            >
              <FileText className="h-4 w-4 mr-2" />
              Download PDF
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