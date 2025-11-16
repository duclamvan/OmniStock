
import { useState, useEffect, useRef, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { nanoid } from "nanoid";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ScanFeedback, ScanLineAnimation, ScanInputPulse, SuccessCheckmark } from "@/components/ScanFeedback";
import { soundEffects } from "@/utils/soundEffects";
import { 
  compressImagesInParallel,
  compressImagesWithThumbnailsInParallel, 
  createImagePreview, 
  revokeImagePreview,
  calculateSizeReduction,
  getBase64Size
} from "@/lib/imageCompression";
import { 
  ArrowLeft, 
  Package, 
  Plus,
  Minus,
  ScanLine,
  CheckCircle2,
  Package2,
  Save,
  CheckSquare,
  Square,
  Camera,
  FileText,
  Truck,
  User,
  Clock,
  Hash,
  ArrowRight,
  Check,
  AlertTriangle,
  X,
  Layers,
  Upload,
  ImagePlus,
  Trash2,
  Loader2,
  Warehouse
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

// Photo type with unique ID for safe concurrent deletion
type PhotoData = {
  id: string; // Unique ID for safe deletion
  compressed: string;
  thumbnail: string;
  originalSize?: number;
} | string; // Keep string for backward compatibility

// Generate a stable ID for legacy string photos using hash
const generateLegacyPhotoId = (photoString: string): string => {
  // Use simple hash function for browser environment - stable and deterministic
  let hash = 0;
  for (let i = 0; i < Math.min(photoString.length, 100); i++) {
    const char = photoString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return 'legacy_' + Math.abs(hash).toString(36).substring(0, 10);
};

// Get the ID from a photo (handles both new and legacy formats)
const getPhotoId = (photo: PhotoData): string => {
  if (typeof photo === 'string') {
    return generateLegacyPhotoId(photo);
  }
  return photo.id;
};

interface ReceivingItem {
  id: string;
  itemId?: number; // Add itemId field for API calls (references shipment item)
  name: string;
  sku?: string;
  productId?: string; // Product ID for fetching real locations
  expectedQty: number;
  receivedQty: number;
  damagedQty?: number; // Track damaged quantity
  missingQty?: number; // Track missing quantity
  status: 'pending' | 'complete' | 'partial' | 'damaged' | 'missing' | 'partial_damaged' | 'partial_missing';
  notes?: string;
  checked: boolean;
  imageUrl?: string;
  warehouseLocations?: string[]; // Array of warehouse bin location codes
  isNewProduct?: boolean; // Flag to indicate if product is new (not in inventory)
}

// Helper function to generate warehouse location with proper formatting
const generateWarehouseLocation = (itemId?: number | string, sku?: string, index?: number): string => {
  // Use a stable seed from itemId or SKU to ensure deterministic generation
  const seed = itemId?.toString() || sku || index?.toString() || '0';
  const numericSeed = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const aisle = String(1 + (numericSeed % 6)).padStart(2, '0'); // A01-A06
  const rack = String(1 + ((numericSeed >> 2) % 8)).padStart(2, '0'); // R01-R08
  const level = String(1 + ((numericSeed >> 4) % 4)).padStart(2, '0'); // L01-L04
  
  return `WH1-A${aisle}-R${rack}-L${level}`;
};

// Helper function to fetch real product locations
const fetchProductLocations = async (productId: string): Promise<string[]> => {
  try {
    const response = await fetch(`/api/product-locations/${productId}`);
    if (!response.ok) {
      console.info(`Product locations API returned ${response.status} for product ${productId}, showing TBA`);
      return [];
    }
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.info(`Product locations API returned non-JSON response for product ${productId}, showing TBA`);
      return [];
    }
    
    const locations = await response.json();
    if (!Array.isArray(locations)) {
      console.info(`Product locations API returned invalid format for product ${productId}, showing TBA`);
      return [];
    }
    
    return locations.map((loc: any) => loc.locationCode).filter(Boolean);
  } catch (error) {
    console.info(`Product locations API call failed for product ${productId}, showing TBA:`, (error as any).message);
    return [];
  }
};

// Optimized thumbnail-only image component for maximum speed
const LazyImage = ({ 
  thumbnailSrc, 
  alt, 
  className
}: { 
  thumbnailSrc?: string;
  alt: string;
  className: string;
}) => {
  const [hasError, setHasError] = useState(false);
  
  // Direct display with minimal overhead - thumbnails are tiny and load instantly
  if (!thumbnailSrc || hasError) {
    return (
      <div className={`${className} bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center`}>
        <Package2 className="h-8 w-8 text-gray-400" />
      </div>
    );
  }
  
  return (
    <img 
      src={thumbnailSrc} 
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      loading="eager" // Eager load thumbnails for instant display
    />
  );
};

export default function ContinueReceiving() {
  const { id } = useParams();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const barcodeRef = useRef<HTMLInputElement>(null);
  const lastSaveDataRef = useRef<any>(null); // Fix missing ref error for world-record speed
  const dataInitializedRef = useRef<string>(''); // Prevent double initialization - stores data key
  const updateQueueRef = useRef<Map<string, number>>(new Map()); // Queue for rapid updates
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null); // Timer for debounced updates
  const isInitialLoadRef = useRef<boolean>(true); // Track if we're in the initial load phase
  const prefilledDataProcessedRef = useRef<boolean>(false); // Track if prefilled data has been processed
  
  // Handle back navigation with proper query invalidation
  const handleBackNavigation = useCallback(() => {
    // Invalidate all receipt-related queries to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts'] });
    queryClient.invalidateQueries({ queryKey: [`/api/imports/receipts/by-shipment/${id}`] });
    queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/by-status/receiving'] });
    navigate('/receiving');
  }, [id, navigate]);
  
  // Form state
  const [receivedBy, setReceivedBy] = useState("Employee #1");
  const [carrier, setCarrier] = useState("");
  const [parcelCount, setParcelCount] = useState(1);
  const [scannedParcels, setScannedParcels] = useState(0);
  const [receivingItems, setReceivingItems] = useState<ReceivingItem[]>([]);
  const [notes, setNotes] = useState("");
  const [scannedTrackingNumbers, setScannedTrackingNumbers] = useState<string[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<PhotoData[]>([]);
  const [deletingPhotoIds, setDeletingPhotoIds] = useState<Set<string>>(new Set()); // Track photos being deleted
  const [photosLoading, setPhotosLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const photoProcessingRef = useRef<boolean>(false);
  const photoUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPhotoUpdatesRef = useRef<PhotoData[]>([]);
  
  // UI state
  const [currentStep, setCurrentStep] = useState(1);
  const [scanMode, setScanMode] = useState(false);
  const [barcodeScan, setBarcodeScan] = useState("");
  const [showAllItems, setShowAllItems] = useState(true);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [hasShownCompletionToast, setHasShownCompletionToast] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error' | 'duplicate' | 'complete' | null; message: string }>({ type: null, message: '' });
  const [showSuccessCheckmark, setShowSuccessCheckmark] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  
  // DMG/MISS popover state
  const [dmgPopoverOpen, setDmgPopoverOpen] = useState<Record<string, boolean>>({});
  const [missPopoverOpen, setMissPopoverOpen] = useState<Record<string, boolean>>({});
  const [dmgQuantity, setDmgQuantity] = useState<Record<string, string>>({});
  const [missQuantity, setMissQuantity] = useState<Record<string, string>>({});
  
  // Store previous state for toggle buttons (to restore when deselecting)
  const [previousItemState, setPreviousItemState] = useState<Record<string, { receivedQty: number; status: ReceivingItem['status'] }>>({});

  // OPTIMIZED QUERIES: Smart caching prevents duplicate requests
  const { data: shipment, isLoading } = useQuery({
    queryKey: [`/api/imports/shipments/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/imports/shipments/${id}`);
      if (!response.ok) throw new Error('Failed to fetch shipment');
      return response.json();
    },
    enabled: !!id,
    staleTime: 60 * 1000, // Data is fresh for 60 seconds (shipments don't change frequently)
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnMount: false, // Use cached data when available
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });

  // Fetch receipt with instant update on mount - critical for photo sync
  const { data: receipt, isLoading: receiptLoading } = useQuery({
    queryKey: [`/api/imports/receipts/by-shipment/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/imports/receipts/by-shipment/${id}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!id,
    staleTime: 0, // Always consider stale for instant photo updates
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnMount: 'always', // Critical: Always refetch on mount for fresh photos
    refetchOnWindowFocus: true, // Refetch when returning to tab
    refetchOnReconnect: false
  });

  // Prefetch the next likely navigation for instant back navigation
  useEffect(() => {
    // Prefetch receiving list for instant back navigation
    queryClient.prefetchQuery({
      queryKey: ['/api/imports/receipts'],
      queryFn: async () => {
        const response = await fetch('/api/imports/receipts');
        return response.json();
      },
      staleTime: 60 * 1000 // Receipts list fresh for 60 seconds
    });
  }, []);


  // Determine if this is a pallet shipment
  const isPalletShipment = shipment?.unitType?.toLowerCase().includes('pallet') || false;
  const unitLabel = isPalletShipment ? 'Pallets' : 'Parcels';

  // OPTIMIZED: Initialize data with prevention of unnecessary re-renders
  useEffect(() => {
    // Prevent double initialization and unnecessary re-renders
    // Include scannedParcels in dataKey to re-init when it changes
    const trackingData = receipt?.receipt?.trackingNumbers || {};
    const serverScannedParcels = trackingData.scannedParcels || receipt?.receipt?.receivedParcels || 0;
    const dataKey = `${shipment?.id}-${receipt?.receipt?.id || 'none'}-${serverScannedParcels}`;
    if (dataInitializedRef.current === dataKey) {
      return; // Skip if already initialized with this data
    }
    
    if (shipment && receipt && !receiptLoading) {
      dataInitializedRef.current = dataKey;
      // Load existing receipt data - receipt object has structure: { receipt: {...}, items: [...] }
      const receiptData = receipt.receipt || receipt;
      console.log('Receipt data found:', { 
        id: receiptData.id, 
        receivedBy: receiptData.receivedBy,
        scannedParcels: receiptData.trackingNumbers?.scannedParcels,
        photoCount: receiptData.photos?.length || 0,
        itemCount: receipt.items?.length || 0
      });
      console.log('Setting state from receipt:', {
        receivedBy: receiptData.receivedBy,
        carrier: receiptData.carrier,
        parcelCount: receiptData.parcelCount,
        notes: receiptData.notes
      });
      setReceivedBy(receiptData.receivedBy || "Employee #1");
      setCarrier(receiptData.carrier || shipment.endCarrier || shipment.carrier || "");
      setParcelCount(receiptData.parcelCount || shipment.totalUnits || 1);
      
      // LAZY LOAD: Photos loaded asynchronously without blocking main content
      if (receiptData.photos && Array.isArray(receiptData.photos) && receiptData.photos.length > 0) {
        // Load photos in next tick to not block UI updates
        requestAnimationFrame(() => {
          // Handle backward compatibility - photos can be strings or objects
          const processedPhotos: PhotoData[] = receiptData.photos.map((photo: any, index: number) => {
            // If it's already in new format, keep it
            if (typeof photo === 'object' && 'compressed' in photo && 'thumbnail' in photo) {
              return photo;
            }
            // If it's a string (old format), keep as is for backward compatibility
            if (typeof photo === 'string') {
              return photo;
            }
            // Shouldn't happen, but handle gracefully
            return String(photo);
          });
          setUploadedPhotos(processedPhotos);
          setPhotosLoading(false);
        });
      } else {
        setUploadedPhotos([]);
        setPhotosLoading(false);
      }
      
      // Load scanned parcels and tracking numbers from tracking numbers JSON if available
      const trackingData = receiptData.trackingNumbers || {};
      // Validate and filter tracking numbers to ensure they are reasonable
      const savedTrackingNumbers = Array.isArray(trackingData.numbers) 
        ? trackingData.numbers.filter((num: any) => 
            typeof num === 'string' && 
            num.trim().length > 0 && 
            num.trim().length <= 100
          ).map((num: string) => num.trim())
        : [];
      
      // Use saved scannedParcels if available, otherwise fall back to tracking numbers count
      // This preserves manual user input while maintaining sync for new receipts
      const validScannedParcels = trackingData.scannedParcels ?? savedTrackingNumbers.length;
      
      setScannedParcels(validScannedParcels);
      setScannedTrackingNumbers(savedTrackingNumbers);
      setNotes(receiptData.notes || "");
      
      // Initialize items from receipt - build complete item list from shipment items first
      if (shipment.items && shipment.items.length > 0) {
        const items = shipment.items.map((shipmentItem: any, index: number) => {
          const itemId = shipmentItem.id ? shipmentItem.id.toString() : `item-${index}`;
          
          // Find corresponding receipt item data if it exists
          const receiptItem = receipt.items?.find((ri: any) => 
            ri.itemId?.toString() === shipmentItem.id?.toString() ||
            ri.itemId === shipmentItem.id
          );
          
          if (receiptItem) {
            // Use saved receipt item data
            const expectedQty = receiptItem.expectedQuantity || shipmentItem.quantity || 1;
            const receivedQty = receiptItem.receivedQuantity || 0;
            
            // Calculate status based on quantities, but preserve special statuses
            let calculatedStatus = receiptItem.status || 'pending';
            
            // Only recalculate if it's a basic status (pending, partial, complete)
            // Preserve special statuses (damaged, missing, partial_damaged, partial_missing)
            if (!['damaged', 'missing', 'partial_damaged', 'partial_missing'].includes(calculatedStatus)) {
              if (receivedQty >= expectedQty) {
                calculatedStatus = 'complete';
              } else if (receivedQty > 0 && receivedQty < expectedQty) {
                calculatedStatus = 'partial';
              } else if (receivedQty === 0) {
                calculatedStatus = 'pending';
              }
            } else {
              // For special statuses, ensure they're consistent with quantities
              if (calculatedStatus === 'damaged' || calculatedStatus === 'partial_damaged') {
                // If marked as damaged but has partial quantity, ensure it's partial_damaged
                if (receivedQty > 0 && receivedQty < expectedQty) {
                  calculatedStatus = 'partial_damaged';
                } else if (receivedQty === 0) {
                  calculatedStatus = 'damaged';
                }
              } else if (calculatedStatus === 'missing' || calculatedStatus === 'partial_missing') {
                // If marked as missing but has partial quantity, ensure it's partial_missing
                if (receivedQty > 0 && receivedQty < expectedQty) {
                  calculatedStatus = 'partial_missing';
                } else if (receivedQty === 0) {
                  calculatedStatus = 'missing';
                }
              }
            }
            
            return {
              id: itemId,
              itemId: shipmentItem.id, // Add itemId field for API calls
              productId: shipmentItem.productId?.toString() || shipmentItem.id?.toString(),
              name: shipmentItem.name || shipmentItem.productName || `Item ${index + 1}`,
              sku: shipmentItem.sku || '',
              expectedQty,
              receivedQty,
              status: calculatedStatus,
              notes: receiptItem.notes || '',
              checked: receivedQty > 0,
              imageUrl: shipmentItem.imageUrl || '',
              warehouseLocations: [] as string[], // Will be populated after initialization
              isNewProduct: false // Will be determined when fetching locations
            };
          } else {
            // No receipt data yet, use shipment defaults
            return {
              id: itemId,
              itemId: shipmentItem.id, // Add itemId field for API calls
              productId: shipmentItem.productId?.toString() || shipmentItem.id?.toString(),
              name: shipmentItem.name || shipmentItem.productName || `Item ${index + 1}`,
              sku: shipmentItem.sku || '',
              expectedQty: shipmentItem.quantity || 1,
              receivedQty: 0,
              status: 'pending' as const,
              notes: '',
              checked: false,
              imageUrl: shipmentItem.imageUrl || '',
              warehouseLocations: [] as string[], // Will be populated after initialization
              isNewProduct: false // Will be determined when fetching locations
            };
          }
        });
        setReceivingItems(items);
      }
      
      // Determine which step to show based on completion status
      // Only do automatic step determination on initial load
      if (isInitialLoadRef.current) {
        // Check if Step 1 is completed (has basic info)
        const isStep1Complete = 
          receiptData.receivedBy && 
          receiptData.carrier && 
          (trackingData.scannedParcels > 0 || receiptData.parcelCount > 0);
        
        // Check if Step 2 has partial progress (some items received)
        const hasStep2Progress = receipt.items && receipt.items.some((item: any) => 
          item.receivedQuantity > 0 || 
          item.status !== 'pending'
        );
        
        // Only show Step 2 if Step 1 is complete AND Step 2 has progress
        // Otherwise default to Step 1
        console.log('Initial step determination:', {
          isStep1Complete,
          hasStep2Progress,
          selectedStep: isStep1Complete && hasStep2Progress ? 2 : 1
        });
        
        if (isStep1Complete && hasStep2Progress) {
          setCurrentStep(2);
        } else {
          setCurrentStep(1);
        }
        
        // Mark initial load as complete
        isInitialLoadRef.current = false;
      }
    } else if (shipment && !receipt && !receiptLoading) {
      // Only initialize from shipment if we don't already have data
      // This prevents resetting data if receipt momentarily becomes null
      console.log('No receipt found, checking if we need to initialize from shipment');
      
      // Only set defaults if the current values are empty/default
      if (!receivedBy || receivedBy === "Employee #1") {
        setCarrier(shipment.endCarrier || shipment.carrier || "");
        setParcelCount(shipment.totalUnits || 1);
        setScannedParcels(0); // No parcels scanned yet for new receiving
        setScannedTrackingNumbers([]); // No tracking numbers yet for new receiving
        setUploadedPhotos([]); // Clear photos for new receiving
        setNotes(""); // Clear notes for new receiving
        
        if (shipment.items && shipment.items.length > 0) {
          const items = shipment.items.map((item: any, index: number) => ({
            id: item.id ? item.id.toString() : `item-${index}`, // Convert to string for UI, but store original ID
            itemId: item.id, // Add itemId field for API calls
            productId: item.productId?.toString() || item.id?.toString(),
            name: item.name || item.productName || `Item ${index + 1}`,
            sku: item.sku || '',
            expectedQty: item.quantity || 1,
            receivedQty: 0,
            status: 'pending' as const,
            notes: '',
            checked: false,
            imageUrl: item.imageUrl || '',
            warehouseLocations: [] as string[], // Will be populated after initialization
            isNewProduct: false // Will be determined when fetching locations
          }));
          setReceivingItems(items);
        }
      }
    }
  }, [shipment, receipt, receiptLoading]);

  // Fetch real product locations after items are initialized
  useEffect(() => {
    if (receivingItems.length === 0) return;

    // Create a stable key based on product IDs to detect when the set of products changes
    const productIdsKey = receivingItems.map(item => item.productId || `no-${item.id}`).join('|');

    const updateItemsWithLocations = async () => {
      const updatedItems = await Promise.all(
        receivingItems.map(async (item) => {
          // If no productId, mark as new product
          if (!item.productId || item.productId === item.id) {
            return { ...item, isNewProduct: true };
          }

          try {
            const locations = await fetchProductLocations(item.productId);
            if (locations.length === 0) {
              return { ...item, isNewProduct: true };
            } else {
              return { ...item, warehouseLocations: locations, isNewProduct: false };
            }
          } catch (error) {
            console.error(`Error fetching locations for product ${item.productId}:`, error);
            return { ...item, isNewProduct: true };
          }
        })
      );

      setReceivingItems(updatedItems);
    };

    // Only fetch locations if items don't already have them or if product set changed
    const needsLocationUpdate = receivingItems.some(
      item => (!item.warehouseLocations || item.warehouseLocations.length === 0) && 
               item.isNewProduct === false // Don't refetch for items already marked as new
    );

    if (needsLocationUpdate) {
      updateItemsWithLocations();
    }
  }, [receivingItems.map(item => item.productId || `no-${item.id}`).join('|')]);

  // Auto-focus barcode input in scan mode
  useEffect(() => {
    if (scanMode && barcodeRef.current) {
      barcodeRef.current.focus();
    }
  }, [scanMode]);

  // Global barcode scanner listener for Bluetooth scanners
  useEffect(() => {
    if (!scanMode || currentStep !== 1) return;

    let scanBuffer = '';
    let scanTimeout: NodeJS.Timeout;

    const handleGlobalKeyPress = (e: KeyboardEvent) => {
      // Skip if user is typing in another input field
      if (e.target instanceof HTMLInputElement && e.target !== barcodeRef.current) return;
      if (e.target instanceof HTMLTextAreaElement) return;

      // Clear buffer on Enter (most scanners send Enter after barcode)
      if (e.key === 'Enter' && scanBuffer.length > 3) {
        e.preventDefault();
        handleBarcodeScan(scanBuffer.trim());
        scanBuffer = '';
        clearTimeout(scanTimeout);
        return;
      }

      // Add printable characters to buffer
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
        scanBuffer += e.key;
        
        // Auto-clear buffer after 2 seconds of inactivity
        clearTimeout(scanTimeout);
        scanTimeout = setTimeout(() => {
          scanBuffer = '';
        }, 2000);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyPress);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyPress);
      clearTimeout(scanTimeout);
    };
  }, [scanMode, currentStep]);

  // No longer needed with optimized field-specific saves

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      // Clear pending update timer
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
      // Flush any pending updates
      if (updateQueueRef.current.size > 0) {
        // Can't call flushUpdateQueue here as it may not be defined yet
        updateQueueRef.current.clear();
      }
    };
  }, []);

  // ================ OPTIMIZED FIELD-SPECIFIC MUTATIONS ================
  // Define mutations before functions that use them
  
  // Mutation for updating meta fields (receivedBy, carrier, parcelCount, notes)
  const updateMetaMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      const receiptId = receipt?.receipt?.id || receipt?.id;
      if (!receiptId) {
        // Create receipt first if it doesn't exist
        const response = await apiRequest('POST', '/api/imports/receipts/auto-save', {
          shipmentId: shipment?.id,
          consolidationId: shipment?.consolidationId,
          receivedBy: field === 'receivedBy' ? value : receivedBy,
          carrier: field === 'carrier' ? value : carrier,
          parcelCount: field === 'parcelCount' ? value : parcelCount,
          notes: field === 'notes' ? value : notes,
          scannedParcels: field === 'scannedParcels' ? value : scannedParcels
        });
        return response;
      }
      
      // Update only the specific field
      const payload: any = {};
      payload[field] = value;
      
      const response = await fetch(`/api/imports/receipts/${receiptId}/meta`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error('Failed to update');
      return response.json();
    },
    onError: (error) => {
      console.error('Meta update failed:', error);
    }
  });
  
  // Mutation for updating item quantities atomically - no optimistic revert on error
  const updateItemQuantityMutation = useMutation({
    mutationFn: async ({ itemId, delta }: { itemId: string; delta: number }) => {
      let receiptId = receipt?.receipt?.id || receipt?.id;
      
      // If no receipt exists, create one first using auto-save
      if (!receiptId) {
        const autoSaveData = {
          shipmentId: shipment?.id,
          consolidationId: shipment?.consolidationId,
          receivedBy: receivedBy || "Employee #1",
          carrier: carrier || shipment?.carrier || "",
          parcelCount: parcelCount || shipment?.totalUnits || 1,
          scannedParcels: scannedParcels || 0,
          trackingNumbers: scannedTrackingNumbers || [],
          notes: notes || "",
          photos: uploadedPhotos || []
        };
        
        try {
          const response = await apiRequest('POST', '/api/imports/receipts/auto-save', autoSaveData);
          const autoSaveResponse = await response.json();
          receiptId = autoSaveResponse?.receipt?.id;
          
          if (!receiptId) {
            throw new Error('Failed to create receipt for quantity update');
          }
        } catch (autoSaveError) {
          console.error('Auto-save failed:', autoSaveError);
          throw new Error('Failed to create receipt: ' + (autoSaveError as Error).message);
        }
      }
      
      const response = await fetch(`/api/imports/receipts/${receiptId}/items/${itemId}/increment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta })
      });
      
      if (!response.ok) throw new Error('Failed to update quantity');
      return response.json();
    },
    onError: (error, variables) => {
      console.error('Item quantity update failed:', error);
      // Show toast but don't revert UI - user can retry if needed
      toast({
        title: "Update Failed",
        description: "Failed to save quantity update. Please try again.",
        variant: "destructive"
      });
    },
    onSuccess: () => {
      // Invalidate storage query for real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts/storage'] });
    }
  });
  
  // Mutation for updating item status and notes - no optimistic revert on error
  const updateItemFieldMutation = useMutation({
    mutationFn: async ({ itemId, field, value }: { itemId: string; field: string; value: any }) => {
      const receiptId = receipt?.receipt?.id || receipt?.id;
      if (!receiptId) return;
      
      const payload: any = {};
      payload[field] = value;
      
      const response = await fetch(`/api/imports/receipts/${receiptId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error('Failed to update item');
      return response.json();
    },
    onError: (error, variables) => {
      console.error('Item update failed:', error);
      // Error handling is done in the calling function
    },
    onSuccess: () => {
      // Invalidate storage query for real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts/storage'] });
    }
  });
  
  // Mutation for tracking numbers
  const updateTrackingMutation = useMutation({
    mutationFn: async ({ action, trackingNumber }: { action: 'add' | 'remove'; trackingNumber: string }) => {
      const receiptId = receipt?.receipt?.id || receipt?.id;
      if (!receiptId) return;
      
      const response = await fetch(`/api/imports/receipts/${receiptId}/tracking`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, trackingNumber })
      });
      
      if (!response.ok) throw new Error('Failed to update tracking');
      return response.json();
    },
    onError: (error) => {
      console.error('Tracking update failed:', error);
    }
  });
  
  // Process prefilled tracking data from navigation state (e.g., from QR bulk scan)
  useEffect(() => {
    // Only process once and only if we have prefilled data
    if (prefilledDataProcessedRef.current) return;
    
    // Check if we have navigation state with prefilled tracking data
    const navigationState = (location as any)?.state;
    const prefilledTrackingNumbers = navigationState?.scannedTrackingNumbers as string[] | undefined;
    const prefilledScannedParcels = navigationState?.scannedParcels as number | undefined;
    
    if (prefilledTrackingNumbers && prefilledTrackingNumbers.length > 0) {
      // Mark as processed immediately to prevent double processing
      prefilledDataProcessedRef.current = true;
      
      console.log('Processing prefilled tracking data:', {
        trackingNumbers: prefilledTrackingNumbers.length,
        scannedParcels: prefilledScannedParcels
      });
      
      // Process the prefilled data after a brief delay to ensure component is mounted
      setTimeout(() => {
        // Merge with existing tracking numbers (avoid duplicates)
        const existingNumbers = new Set(scannedTrackingNumbers);
        const newNumbers: string[] = [];
        
        prefilledTrackingNumbers.forEach(num => {
          if (!existingNumbers.has(num)) {
            newNumbers.push(num);
          }
        });
        
        if (newNumbers.length > 0) {
          // Update state with merged tracking numbers
          const mergedTrackingNumbers = [...scannedTrackingNumbers, ...newNumbers];
          setScannedTrackingNumbers(mergedTrackingNumbers);
          
          // Update scanned parcels count - use max of existing and prefilled
          const newScannedCount = prefilledScannedParcels 
            ? Math.max(scannedParcels, prefilledScannedParcels)
            : scannedParcels + newNumbers.length;
          setScannedParcels(Math.min(newScannedCount, parcelCount));
          
          // Save to backend immediately
          const receiptId = receipt?.receipt?.id || receipt?.id;
          if (receiptId) {
            // Update existing receipt with new tracking numbers
            newNumbers.forEach(trackingNumber => {
              updateTrackingMutation.mutate({ action: 'add', trackingNumber });
            });
            
            // Update scanned parcels count
            updateMetaMutation.mutate({ field: 'scannedParcels', value: newScannedCount });
          } else {
            // Create new receipt with prefilled data
            updateMetaMutation.mutate({ field: 'scannedParcels', value: newScannedCount });
            
            // Add tracking numbers after receipt is created
            setTimeout(() => {
              newNumbers.forEach(trackingNumber => {
                updateTrackingMutation.mutate({ action: 'add', trackingNumber });
              });
            }, 500);
          }
          
          // Play success sound
          soundEffects.playSuccessBeep();
          
          // Show toast notification
          toast({
            title: "Pre-scanned Data Loaded",
            description: `Loaded ${newNumbers.length} pre-scanned tracking number${newNumbers.length > 1 ? 's' : ''}`,
            duration: 4000,
          });
          
          // Show success feedback
          setScanFeedback({ 
            type: 'success', 
            message: `${newNumbers.length} tracking number${newNumbers.length > 1 ? 's' : ''} loaded from bulk scan` 
          });
          setTimeout(() => setScanFeedback({ type: null, message: '' }), 3000);
        } else if (prefilledTrackingNumbers.length > 0) {
          // All tracking numbers were duplicates
          toast({
            title: "Tracking Numbers Already Scanned",
            description: `All ${prefilledTrackingNumbers.length} tracking numbers were already recorded`,
            variant: "default",
            duration: 3000,
          });
        }
      }, 100);
    }
  }, [
    (location as any)?.state?.scannedTrackingNumbers,
    (location as any)?.state?.scannedParcels,
    scannedTrackingNumbers,
    scannedParcels,
    parcelCount,
    receipt,
    updateTrackingMutation,
    updateMetaMutation,
    toast
  ])
  
  // Optimized photo mutation with instant cache updates
  const updatePhotosMutation = useMutation({
    mutationFn: async (photos: string[]) => {
      const receiptId = receipt?.receipt?.id || receipt?.id;
      if (!receiptId) {
        // Create receipt first if it doesn't exist
        const response = await apiRequest('POST', '/api/imports/receipts/auto-save', {
          shipmentId: shipment?.id,
          consolidationId: shipment?.consolidationId,
          receivedBy,
          carrier,
          parcelCount,
          notes,
          photos,
          scannedParcels
        });
        return response;
      }
      
      const response = await fetch(`/api/imports/receipts/${receiptId}/photos`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos })
      });
      
      if (!response.ok) throw new Error('Failed to update photos');
      return response.json();
    },
    onMutate: async (newPhotos) => {
      // Optimistic update for instant UI response
      await queryClient.cancelQueries({ queryKey: [`/api/imports/receipts/by-shipment/${id}`] });
      
      const previousData = queryClient.getQueryData([`/api/imports/receipts/by-shipment/${id}`]);
      
      // Update cache immediately for instant feedback
      queryClient.setQueryData([`/api/imports/receipts/by-shipment/${id}`], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          receipt: {
            ...old.receipt,
            photos: newPhotos
          }
        };
      });
      
      return { previousData };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData([`/api/imports/receipts/by-shipment/${id}`], context.previousData);
      }
      console.error('Photos update failed:', error);
      toast({
        title: "Failed to update photos",
        description: "Please try again",
        variant: "destructive"
      });
    },
    onSuccess: () => {
      // Double-ensure fresh data with immediate invalidation
      queryClient.invalidateQueries({ queryKey: [`/api/imports/receipts/by-shipment/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts'] });
    }
  });

  // Handle barcode scan
  const handleBarcodeScan = async (value: string) => {
    if (currentStep === 1) {
      // Step 1: Scanning parcel barcodes
      // Validate tracking number
      const trimmedValue = value.trim();
      if (trimmedValue.length === 0 || trimmedValue.length > 100) {
        await soundEffects.playErrorBeep();
        setScanFeedback({ type: 'error', message: 'Invalid tracking number length' });
        setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
        const { dismiss } = toast({
          title: "Invalid Tracking Number",
          description: "Tracking number must be between 1-100 characters",
          variant: "destructive"
        });
        setTimeout(() => dismiss(), 3000);
        setBarcodeScan("");
        return;
      }
      
      // Check if tracking number already scanned (case-insensitive)
      const isDuplicate = scannedTrackingNumbers.some(
        existing => existing.toLowerCase() === trimmedValue.toLowerCase()
      );
      
      if (isDuplicate) {
        await soundEffects.playDuplicateBeep();
        setScanFeedback({ type: 'duplicate', message: `Already scanned: ${trimmedValue}` });
        setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
        const { dismiss } = toast({
          title: "Already Scanned",
          description: `Tracking number ${trimmedValue} has already been scanned`,
          variant: "destructive"
        });
        setTimeout(() => dismiss(), 3000);
        setBarcodeScan("");
        return;
      }
      
      const newTrackingNumbers = [...scannedTrackingNumbers, trimmedValue];
      // Always use actual tracking numbers count
      const newCount = Math.min(newTrackingNumbers.length, parcelCount);
      setScannedTrackingNumbers(newTrackingNumbers);
      setScannedParcels(newCount); // Update local state for immediate UI refresh
      
      // Play success sound and show visual feedback
      await soundEffects.playSuccessBeep();
      setScanFeedback({ type: 'success', message: `Scanned: ${value}` });
      setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
      
      // Check if all parcels are scanned
      if (newTrackingNumbers.length >= parcelCount && parcelCount > 0) {
        setTimeout(async () => {
          await soundEffects.playCompletionSound();
          setShowSuccessCheckmark(true);
          setTimeout(() => setShowSuccessCheckmark(false), 2000);
        }, 500);
      }
      
      // Update scanned parcels count
      setSaveStatus('saving');
      updateMetaMutation.mutate({ field: 'scannedParcels', value: newCount }, {
        onSuccess: () => {
          // Add tracking number
          updateTrackingMutation.mutate({ action: 'add', trackingNumber: trimmedValue });
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 1000);
        }
      });
      
      const { dismiss } = toast({
        title: `${isPalletShipment ? 'Pallet' : 'Parcel'} Scanned`,
        description: `Scanned ${newCount} of ${parcelCount} ${unitLabel.toLowerCase()} - ${value}`,
      });
      
      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        dismiss();
      }, 3000);
    } else if (currentStep === 2) {
      // Step 2: Scanning item barcodes
      const item = receivingItems.find(item => item.sku === value);
      if (item) {
        await soundEffects.playSuccessBeep();
        setScanFeedback({ type: 'success', message: `Scanned: ${item.name}` });
        setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
        updateItemQuantity(item.id, 1);
        toast({
          title: "Item Scanned",
          description: `${item.name} - Quantity updated`,
          duration: 2000
        });
      } else {
        await soundEffects.playErrorBeep();
        setScanFeedback({ type: 'error', message: 'Item not found' });
        setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
        toast({
          title: "Item Not Found",
          description: "This SKU is not in the current shipment",
          variant: "destructive",
          duration: 3000
        });
      }
    }
    setBarcodeScan("");
  };

  // Flush update queue - sends all pending updates to server
  const flushUpdateQueue = useCallback(() => {
    if (updateQueueRef.current.size === 0) return;
    
    // Get all pending updates
    const updates = Array.from(updateQueueRef.current.entries());
    updateQueueRef.current.clear();
    
    // Send updates to server - itemId here is already the shipment item ID from the queue
    updates.forEach(([itemId, totalDelta]) => {
      if (totalDelta !== 0) {
        updateItemQuantityMutation.mutate({ itemId, delta: totalDelta });
      }
    });
  }, [updateItemQuantityMutation, receivingItems]);

  // Update item quantity - optimistic update with queued server updates
  const updateItemQuantity = useCallback((itemId: string, delta: number) => {
    // Find the item to update
    const itemToUpdate = receivingItems.find(item => item.id === itemId);
    if (!itemToUpdate) return;
    
    // Calculate new quantity and status
    const newQty = Math.max(0, itemToUpdate.receivedQty + delta);
    let newStatus: ReceivingItem['status'] = itemToUpdate.status;
    
    // Only update status if it's not already set to damaged or missing
    if (itemToUpdate.status !== 'damaged' && itemToUpdate.status !== 'missing' && 
        itemToUpdate.status !== 'partial_damaged' && itemToUpdate.status !== 'partial_missing') {
      if (newQty === 0) {
        newStatus = 'pending';
      } else if (newQty >= itemToUpdate.expectedQty) {
        newStatus = 'complete';
      } else if (newQty > 0 && newQty < itemToUpdate.expectedQty) {
        newStatus = 'partial';
      }
    } else {
      // Handle partial damaged/missing cases
      if (itemToUpdate.status === 'damaged' || itemToUpdate.status === 'partial_damaged') {
        if (newQty > 0 && newQty < itemToUpdate.expectedQty) {
          newStatus = 'partial_damaged';
        } else if (newQty === 0) {
          newStatus = 'damaged';
        } else {
          newStatus = 'damaged';
        }
      } else if (itemToUpdate.status === 'missing' || itemToUpdate.status === 'partial_missing') {
        if (newQty > 0 && newQty < itemToUpdate.expectedQty) {
          newStatus = 'partial_missing';
        } else if (newQty === 0) {
          newStatus = 'missing';
        } else {
          newStatus = 'missing';
        }
      }
    }
    
    // Immediate optimistic update for instant UI response
    setReceivingItems(prevItems => 
      prevItems.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            receivedQty: newQty,
            status: newStatus,
            checked: newQty > 0
          };
        }
        return item;
      })
    );
    
    // Queue the update for batched sending to server - use the receipt item's ID
    const queueKey = itemId; // Use the receipt item's own ID
    const currentDelta = updateQueueRef.current.get(queueKey) || 0;
    updateQueueRef.current.set(queueKey, currentDelta + delta);
    
    // Clear existing timer
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }
    
    // Set new timer to flush updates after 300ms of inactivity
    updateTimerRef.current = setTimeout(() => {
      flushUpdateQueue();
      setSaveStatus('saving');
      
      // Update status if changed
      if (newStatus !== itemToUpdate.status) {
        // Use the receipt item's ID for the API call
        updateItemFieldMutation.mutate({ itemId: itemId, field: 'status', value: newStatus });
      }
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1000);
    }, 300);
  }, [receivingItems, flushUpdateQueue, updateItemFieldMutation]);

  // Toggle item status - optimistic update without revert on error
  const toggleItemStatus = useCallback((itemId: string, status: ReceivingItem['status']) => {
    const itemToUpdate = receivingItems.find(item => item.id === itemId);
    if (!itemToUpdate) return;
    
    let finalStatus = status;
    let finalQty = itemToUpdate.receivedQty;
    
    if (status === 'complete') {
      finalQty = itemToUpdate.expectedQty;
      finalStatus = 'complete';
    } else if (status === 'damaged') {
      if (itemToUpdate.receivedQty > 0 && itemToUpdate.receivedQty < itemToUpdate.expectedQty) {
        finalStatus = 'partial_damaged';
      } else {
        finalStatus = 'damaged';
      }
    } else if (status === 'missing') {
      if (itemToUpdate.receivedQty > 0 && itemToUpdate.receivedQty < itemToUpdate.expectedQty) {
        finalStatus = 'partial_missing';
      } else {
        finalStatus = 'missing';
      }
    }
    
    // Immediate optimistic update for instant UI response
    setReceivingItems(prevItems => 
      prevItems.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            receivedQty: finalQty,
            status: finalStatus,
            checked: true
          };
        }
        return item;
      })
    );
    
    // Send field-specific update to server without reverting on error
    setSaveStatus('saving');
    
    // Update status - use the receipt item's ID for API calls
    updateItemFieldMutation.mutate({ itemId: itemId, field: 'status', value: finalStatus }, {
      onSuccess: () => {
        // If quantity changed (for complete status), update it separately
        if (finalQty !== itemToUpdate.receivedQty) {
          updateItemFieldMutation.mutate({ itemId: itemId, field: 'receivedQuantity', value: finalQty });
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1000);
      },
      onError: () => {
        // Don't revert UI - show error toast instead
        toast({
          title: "Update Failed",
          description: "Failed to save status update. Please try again.",
          variant: "destructive"
        });
      }
    });
  }, [receivingItems, toast, updateItemFieldMutation]);

  // Update item notes - optimistic update without revert on error
  const updateItemNotes = useCallback((itemId: string, notes: string) => {
    // Find the item
    const itemToUpdate = receivingItems.find(item => item.id === itemId);
    if (!itemToUpdate) {
      toast({
        title: "Update Failed",
        description: "Item not found.",
        variant: "destructive"
      });
      return;
    }
    
    // Immediate optimistic update
    setReceivingItems(prevItems => 
      prevItems.map(item => {
        if (item.id === itemId) {
          return { ...item, notes };
        }
        return item;
      })
    );
    
    // Send field-specific update to server without reverting on error
    setSaveStatus('saving');
    updateItemFieldMutation.mutate({ itemId: itemId, field: 'notes', value: notes }, {
      onSuccess: () => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1000);
      },
      onError: () => {
        // Don't revert UI - show error toast instead
        toast({
          title: "Update Failed",
          description: "Failed to save notes. Please try again.",
          variant: "destructive"
        });
      }
    });
  }, [receivingItems, toast, updateItemFieldMutation]);

  // Handle direct quantity edit
  const handleQuantityEdit = useCallback((itemId: string, value: string) => {
    const item = receivingItems.find(i => i.id === itemId);
    if (!item) return;

    // Parse the input value
    const newQty = parseInt(value, 10);
    if (isNaN(newQty) || newQty < 0) {
      // Invalid input, cancel editing
      setEditingItemId(null);
      return;
    }

    // Cap at expected quantity
    const finalQty = Math.min(newQty, item.expectedQty);
    const delta = finalQty - (item.receivedQty || 0);

    if (delta === 0) {
      // No change, just exit edit mode
      setEditingItemId(null);
      return;
    }

    // Update using existing updateItemQuantity logic
    updateItemQuantity(itemId, delta);
    
    // Exit edit mode
    setEditingItemId(null);
  }, [receivingItems, updateItemQuantity]);

  const startEditing = useCallback((itemId: string, currentQty: number) => {
    setEditingItemId(itemId);
    setEditingValue(currentQty.toString());
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingItemId(null);
    setEditingValue('');
  }, []);

  // Handle DMG/MISS popover actions
  const handleDmgAction = useCallback((itemId: string, qty: number) => {
    const item = receivingItems.find(i => i.id === itemId);
    if (!item) return;
    
    // Calculate damaged quantity accounting for existing missing qty
    const currentMissingQty = item.missingQty || 0;
    // Clamp damaged qty to remaining available units (expectedQty - currentMissingQty)
    const damagedQty = Math.min(qty, item.expectedQty - currentMissingQty);
    // Received = Expected - Damaged - Missing
    const newReceivedQty = Math.max(0, item.expectedQty - damagedQty - currentMissingQty);
    
    // Calculate status based on all quantities
    let finalStatus: ReceivingItem['status'];
    if (damagedQty === 0 && currentMissingQty === 0) {
      // No discrepancies - revert to normal status
      if (newReceivedQty === 0) {
        finalStatus = 'pending';
      } else if (newReceivedQty < item.expectedQty) {
        finalStatus = 'partial';
      } else {
        finalStatus = 'complete';
      }
    } else if (damagedQty > 0) {
      // Has damage
      finalStatus = (damagedQty + currentMissingQty) < item.expectedQty ? 'partial_damaged' : 'damaged';
    } else {
      // Has missing (but no damage)
      finalStatus = currentMissingQty < item.expectedQty ? 'partial_missing' : 'missing';
    }
    
    // Optimistic UI update - update damaged qty, received qty, and status
    const updatedItems = receivingItems.map(i => {
      if (i.id === itemId) {
        return { 
          ...i, 
          damagedQty: damagedQty,
          receivedQty: newReceivedQty,
          status: finalStatus 
        };
      }
      return i;
    });
    
    setReceivingItems(updatedItems);
    
    // Update damaged quantity, received quantity, and status on the backend
    const receiptId = receipt?.receipt?.id || receipt?.id;
    if (!receiptId) return;
    
    const updatePayload = {
      damagedQuantity: damagedQty,
      receivedQuantity: newReceivedQty,
      status: finalStatus
    };
    
    fetch(`/api/imports/receipts/${receiptId}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload)
    }).then(response => {
      if (response.ok) {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts/items-to-store'] });
        queryClient.invalidateQueries({ queryKey: [`/api/imports/receipts/by-shipment/${id}`] });
        
        toast({
          title: "Damage Recorded",
          description: `${damagedQty} unit(s) marked as damaged`,
        });
      } else {
        toast({
          title: "Update Failed",
          description: "Failed to save damaged quantity",
          variant: "destructive"
        });
      }
    });
    
    setDmgPopoverOpen({ ...dmgPopoverOpen, [itemId]: false });
    setDmgQuantity({ ...dmgQuantity, [itemId]: '' });
  }, [receivingItems, receipt, toast, dmgPopoverOpen, dmgQuantity, id]);

  const handleMissAction = useCallback((itemId: string, qty: number) => {
    const item = receivingItems.find(i => i.id === itemId);
    if (!item) return;
    
    // Calculate missing quantity accounting for existing damaged qty
    const currentDamagedQty = item.damagedQty || 0;
    // Clamp missing qty to remaining available units (expectedQty - currentDamagedQty)
    const missingQty = Math.min(qty, item.expectedQty - currentDamagedQty);
    // Received = Expected - Damaged - Missing
    const newReceivedQty = Math.max(0, item.expectedQty - missingQty - currentDamagedQty);
    
    // Calculate status based on all quantities
    let finalStatus: ReceivingItem['status'];
    if (missingQty === 0 && currentDamagedQty === 0) {
      // No discrepancies - revert to normal status
      if (newReceivedQty === 0) {
        finalStatus = 'pending';
      } else if (newReceivedQty < item.expectedQty) {
        finalStatus = 'partial';
      } else {
        finalStatus = 'complete';
      }
    } else if (missingQty > 0) {
      // Has missing
      finalStatus = (missingQty + currentDamagedQty) < item.expectedQty ? 'partial_missing' : 'missing';
    } else {
      // Has damage (but no missing)
      finalStatus = currentDamagedQty < item.expectedQty ? 'partial_damaged' : 'damaged';
    }
    
    // Optimistic UI update - update missing qty, received qty, and status
    const updatedItems = receivingItems.map(i => {
      if (i.id === itemId) {
        return { 
          ...i, 
          missingQty: missingQty,
          receivedQty: newReceivedQty,
          status: finalStatus 
        };
      }
      return i;
    });
    
    setReceivingItems(updatedItems);
    
    // Update missing quantity, received quantity, and status on the backend
    const receiptId = receipt?.receipt?.id || receipt?.id;
    if (!receiptId) return;
    
    const updatePayload = {
      missingQuantity: missingQty,
      receivedQuantity: newReceivedQty,
      status: finalStatus
    };
    
    fetch(`/api/imports/receipts/${receiptId}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload)
    }).then(response => {
      if (response.ok) {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts/items-to-store'] });
        queryClient.invalidateQueries({ queryKey: [`/api/imports/receipts/by-shipment/${id}`] });
        
        toast({
          title: "Missing Items Recorded",
          description: `${missingQty} unit(s) marked as missing`,
        });
      } else {
        toast({
          title: "Update Failed",
          description: "Failed to save missing quantity",
          variant: "destructive"
        });
      }
    });
    
    setMissPopoverOpen({ ...missPopoverOpen, [itemId]: false });
    setMissQuantity({ ...missQuantity, [itemId]: '' });
  }, [receivingItems, receipt, toast, missPopoverOpen, missQuantity, id]);

  // Update receipt mutation
  const updateReceiptMutation = useMutation({
    mutationFn: async (data: any) => {
      const receiptId = receipt?.receipt?.id || receipt?.id;
      const response = await fetch(`/api/imports/receipts/${receiptId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update receipt');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Receipt Updated",
        description: "Successfully updated the receiving process"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/receivable'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/by-status/receiving'] });
      navigate('/receiving');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update receipt",
        variant: "destructive"
      });
    }
  });

  // Create receipt mutation (for new receipts)
  const createReceiptMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/imports/receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create receipt');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Receipt Created",
        description: "Successfully started the receiving process"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/receivable'] });
      navigate(`/receiving/receipt/${data.receipt.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create receipt",
        variant: "destructive"
      });
    }
  });

  // Legacy auto-save mutation for initial creation and items batch update
  const autoSaveMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/imports/receipts/auto-save', data);
    },
    onSuccess: (response) => {
      // Don't invalidate cache during active editing to prevent jumping values
      // Data will be fresh when component remounts
      // Invalidate storage query for real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts/storage'] });
    },
    onError: (error: any) => {
      console.error("Auto-save failed:", error);
      // Don't show toast for auto-save failures to avoid interrupting user experience
    }
  });

  // Complete receiving mutation
  const completeReceivingMutation = useMutation({
    mutationFn: async () => {
      const receiptId = receipt?.receipt?.id || receipt?.id;
      if (!receiptId) throw new Error('No receipt ID found');
      
      const response = await fetch(`/api/imports/receipts/complete/${receiptId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to complete receiving');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Receiving Completed",
        description: "The shipment has been successfully received and is now pending approval"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/receivable'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/by-status/receiving'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/by-status/pending_approval'] });
      // Invalidate storage query for real-time updates
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts/storage'] });
      navigate('/receiving');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete receiving",
        variant: "destructive"
      });
    }
  });

  // Use useRef to maintain save state and timers
  const [isSaving, setIsSaving] = useState(false);
  const saveStatusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const metaSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingMetaUpdates = useRef<{ [key: string]: any }>({});

  // ================ DEBOUNCED META UPDATE FUNCTION ================
  const debouncedMetaUpdate = useCallback((field: string, value: any) => {
    // Store the pending update
    pendingMetaUpdates.current[field] = value;
    setSaveStatus('saving');
    
    // Clear existing timer
    if (metaSaveTimerRef.current) {
      clearTimeout(metaSaveTimerRef.current);
    }
    
    // Set new timer to save after 500ms of inactivity
    metaSaveTimerRef.current = setTimeout(() => {
      // Get all pending updates
      const updates = { ...pendingMetaUpdates.current };
      pendingMetaUpdates.current = {};
      
      // Send all updates in a single request
      Object.entries(updates).forEach(([updateField, updateValue]) => {
        updateMetaMutation.mutate({ field: updateField, value: updateValue }, {
          onSuccess: () => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 1000);
          },
          onError: () => {
            setSaveStatus('idle');
          }
        });
      });
    }, 500); // Wait 500ms after last change before saving
  }, [updateMetaMutation]);

  // ================ OPTIMIZED FIELD-SPECIFIC HANDLERS ================
  
  // Text input handlers - debounced saves
  const handleReceivedByChange = (value: string) => {
    setReceivedBy(value);
    debouncedMetaUpdate('receivedBy', value);
  };
  
  const handleReceivedByBlur = () => {
    // Force save on blur if there are pending updates
    if (metaSaveTimerRef.current) {
      clearTimeout(metaSaveTimerRef.current);
      metaSaveTimerRef.current = null;
      
      const updates = { ...pendingMetaUpdates.current };
      pendingMetaUpdates.current = {};
      
      Object.entries(updates).forEach(([field, value]) => {
        updateMetaMutation.mutate({ field, value });
      });
    }
  };

  const handleCarrierChange = (value: string) => {
    setCarrier(value);
    debouncedMetaUpdate('carrier', value);
  };
  
  const handleCarrierBlur = () => {
    // Force save on blur if there are pending updates
    if (metaSaveTimerRef.current) {
      clearTimeout(metaSaveTimerRef.current);
      metaSaveTimerRef.current = null;
      
      const updates = { ...pendingMetaUpdates.current };
      pendingMetaUpdates.current = {};
      
      Object.entries(updates).forEach(([field, value]) => {
        updateMetaMutation.mutate({ field, value });
      });
    }
  };

  // Ref to track button save timer (removed - using immediate saves)
  const buttonSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Number input handlers - immediate saves for buttons, debounced for typing
  const handleParcelCountChange = (value: number, isButton?: boolean) => {
    setParcelCount(value);
    if (isButton) {
      // Immediate save for button clicks
      setSaveStatus('saving');
      updateMetaMutation.mutate({ field: 'parcelCount', value }, {
        onSuccess: () => {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 1000);
        }
      });
    } else {
      // Debounced save for typing
      debouncedMetaUpdate('parcelCount', value);
    }
  };
  
  const handleParcelCountBlur = () => {
    // Force save on blur if there are pending updates
    if (metaSaveTimerRef.current && pendingMetaUpdates.current.parcelCount !== undefined) {
      clearTimeout(metaSaveTimerRef.current);
      metaSaveTimerRef.current = null;
      
      const value = pendingMetaUpdates.current.parcelCount;
      delete pendingMetaUpdates.current.parcelCount;
      
      updateMetaMutation.mutate({ field: 'parcelCount', value });
    }
  };

  const handleScannedParcelsChange = (value: number, isButton?: boolean, options?: { trackingNumbers?: string[] }) => {
    setScannedParcels(value);
    setSaveStatus('saving');
    
    // Scanned parcels should save immediately as they're from barcode scanning
    updateMetaMutation.mutate({ field: 'scannedParcels', value }, {
      onSuccess: () => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1000);
        // Don't invalidate query for scannedParcels to prevent race condition
        // The local state is already updated, so no need to refetch
      }
    });
    
    // If tracking numbers changed, update them separately
    if (options?.trackingNumbers && options.trackingNumbers.length > scannedTrackingNumbers.length) {
      const newTrackingNumber = options.trackingNumbers[options.trackingNumbers.length - 1];
      updateTrackingMutation.mutate({ action: 'add', trackingNumber: newTrackingNumber });
    }
  };
  
  const handleScannedParcelsBlur = () => {
    // No-op - already saved on change
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    setSaveStatus('saving');
    updateMetaMutation.mutate({ field: 'notes', value }, {
      onSuccess: () => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1000);
      }
    });
  };
  
  const handleNotesBlur = () => {
    // No-op - already saved on change
  };

  const handleSubmit = async () => {
    // Check if all items have been processed
    const pendingItems = receivingItems.filter(item => item.status === 'pending');
    
    if (pendingItems.length > 0) {
      toast({
        title: "Incomplete Items",
        description: `Please process all items before completing. ${pendingItems.length} items are still pending.`,
        variant: "destructive"
      });
      return;
    }
    
    // Ensure receipt exists before completing
    const receiptId = receipt?.receipt?.id || receipt?.id;
    if (!receiptId) {
      // Create receipt first with current data
      const response = await apiRequest('POST', '/api/imports/receipts/auto-save', {
        shipmentId: shipment?.id,
        consolidationId: shipment?.consolidationId,
        receivedBy,
        carrier,
        parcelCount,
        notes,
        photos: uploadedPhotos,
        scannedParcels,
        items: receivingItems.map(item => ({
          itemId: parseInt(item.id) || item.id,
          expectedQuantity: item.expectedQty,
          receivedQuantity: item.receivedQty,
          status: item.status,
          notes: item.notes
        }))
      });
      // Refetch receipt data
      await queryClient.invalidateQueries({ queryKey: [`/api/imports/receipts/by-shipment/${id}`] });
    }
    
    // Show confirmation dialog
    setShowCompleteDialog(true);
  };
  
  const handleCompleteReceiving = () => {
    setShowCompleteDialog(false);
    completeReceivingMutation.mutate();
  };
  
  // Calculate item statistics for confirmation dialog
  const getItemStats = () => {
    const totalItems = receivingItems.length;
    
    // Count items that are fully verified (all units accounted for)
    const verifiedItems = receivingItems.filter(item => {
      const totalAccountedFor = item.receivedQty + (item.damagedQty || 0) + (item.missingQty || 0);
      return totalAccountedFor === item.expectedQty;
    }).length;
    
    // Count items with no issues (status = complete, no damage/missing)
    const completeNoIssues = receivingItems.filter(item => 
      item.status === 'complete' && !item.damagedQty && !item.missingQty
    ).length;
    
    const damagedItems = receivingItems.filter(item => 
      item.status === 'damaged' || item.status === 'partial_damaged'
    ).length;
    const missingItems = receivingItems.filter(item => 
      item.status === 'missing' || item.status === 'partial_missing'
    ).length;
    const partialItems = receivingItems.filter(item => item.status === 'partial').length;
    
    return {
      totalItems,
      verifiedItems,  // All units accounted for (including damaged/missing)
      completeNoIssues,  // Perfect items with no damage/missing
      damagedItems,
      missingItems,
      partialItems
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'receiving':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'in transit':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getItemStatusColor = (status: ReceivingItem['status']) => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-amber-100 text-amber-800';
      case 'damaged':
        return 'bg-red-100 text-red-800';
      case 'missing':
        return 'bg-gray-100 text-gray-800';
      case 'partial_damaged':
        return 'bg-orange-100 text-orange-800';
      case 'partial_missing':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  // Calculate comprehensive progress including partial items and parcels
  const totalItems = receivingItems.length;
  const totalExpectedQty = receivingItems.reduce((sum, item) => sum + item.expectedQty, 0);
  const totalReceivedQty = receivingItems.reduce((sum, item) => sum + item.receivedQty, 0);
  
  // Calculate different progress components
  const itemsProgress = totalExpectedQty > 0 ? (totalReceivedQty / totalExpectedQty) * 100 : 0;
  const parcelProgress = parcelCount > 0 ? (scannedParcels / parcelCount) * 100 : 0;
  
  // Count items by status for additional weight
  const checkedItemsCount = receivingItems.filter(item => item.checked).length;
  const checkedProgress = totalItems > 0 ? (checkedItemsCount / totalItems) * 100 : 0;
  
  // Combined weighted progress (40% items quantity, 30% parcels, 30% checked items)
  const progress = (itemsProgress * 0.4) + (parcelProgress * 0.3) + (checkedProgress * 0.3);
  
  // Show completion notification when progress reaches 100%
  useEffect(() => {
    if (progress >= 100 && !hasShownCompletionToast && receivingItems.length > 0) {
      setHasShownCompletionToast(true);
      toast({
        title: "✨ All items received",
        description: "Great job! The shipment is fully received.",
        className: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
        duration: 4000
      });
    } else if (progress < 100 && hasShownCompletionToast) {
      // Reset if progress drops back below 100%
      setHasShownCompletionToast(false);
    }
  }, [progress, hasShownCompletionToast, receivingItems.length, toast]);
  
  // For display purposes
  const completedItems = receivingItems.filter(item => 
    item.status === 'complete' || 
    item.receivedQty >= item.expectedQty ||
    (item.receivedQty > 0 && (item.status === 'damaged' || item.status === 'partial_damaged' || 
     item.status === 'missing' || item.status === 'partial_missing'))
  ).length;

  // Photo upload handlers
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemPhotoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || photoProcessingRef.current) return;
    
    // Prevent concurrent uploads
    photoProcessingRef.current = true;
    const filesArray = Array.from(files);
    const totalFiles = filesArray.length;
    
    // Create immediate previews using object URLs for instant feedback
    const immediatePreviewUrls = filesArray.map(file => createImagePreview(file));
    setPreviewUrls(prev => [...prev, ...immediatePreviewUrls]);
    
    // Show upload progress
    setPhotosLoading(true);
    setUploadProgress(0);
    
    try {
      // Compress all images with thumbnails in parallel for maximum speed
      const compressedPhotosWithThumbnails = await compressImagesWithThumbnailsInParallel(
        filesArray,
        {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.8,
          format: 'jpeg'
        },
        (processed, total) => {
          // Update progress
          setUploadProgress(Math.round((processed / total) * 100));
        }
      );
      
      // Calculate total size reduction for user feedback
      const originalSize = filesArray.reduce((sum, file) => sum + file.size, 0);
      const compressedSize = compressedPhotosWithThumbnails.reduce((sum, photo) => {
        // Calculate actual sizes
        return sum + getBase64Size(photo.compressed) + getBase64Size(photo.thumbnail);
      }, 0);
      const reduction = Math.round(((originalSize - compressedSize) / originalSize) * 100);
      
      // Generate unique IDs and create photo objects
      const newPhotos: PhotoData[] = compressedPhotosWithThumbnails.map((photo, index) => ({
        id: `photo_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 9)}`,
        compressed: photo.compressed,
        thumbnail: photo.thumbnail,
        originalSize: photo.originalSize
      }));
      
      // Update state with new photo objects
      setUploadedPhotos(prev => {
        // Maintain backward compatibility - keep existing strings as is
        const updated = [...prev, ...newPhotos];
        
        // Save photos to server - non-blocking
        // Convert to simple array for server (backward compatible)
        const photosForServer = updated.map(photo => 
          typeof photo === 'string' ? photo : photo.compressed
        );
        
        updatePhotosMutation.mutate(photosForServer, {
          onSuccess: () => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 1000);
            // Invalidate receipt query to ensure fresh photos when navigating back
            queryClient.invalidateQueries({ queryKey: [`/api/imports/receipts/by-shipment/${id}`] });
          },
          onError: () => {
            // Don't revert UI, just show error
            toast({
              title: "Save Failed",
              description: "Photos uploaded but failed to save. They will be saved with next update.",
              variant: "destructive"
            });
          }
        });
        
        setSaveStatus('saving');
        return updated;
      });
      
      // Show success with size reduction info and thumbnail info
      const thumbnailSizeKB = Math.round(compressedPhotosWithThumbnails.reduce(
        (sum, p) => sum + getBase64Size(p.thumbnail), 0
      ) / 1024);
      
      toast({
        title: "Photos Uploaded",
        description: `Successfully uploaded ${totalFiles} photo${totalFiles > 1 ? 's' : ''}${reduction > 0 ? ` (${reduction}% smaller)` : ''} • Thumbnails: ${thumbnailSizeKB}KB total`,
        className: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
        duration: 3000
      });
      
      // Clean up preview URLs after successful upload
      immediatePreviewUrls.forEach(url => revokeImagePreview(url));
      setPreviewUrls(prev => prev.filter(url => !immediatePreviewUrls.includes(url)));
      
    } catch (error) {
      console.error('Photo upload error:', error);
      
      // Clean up preview URLs on error
      immediatePreviewUrls.forEach(url => revokeImagePreview(url));
      setPreviewUrls(prev => prev.filter(url => !immediatePreviewUrls.includes(url)));
      
      toast({
        title: "Upload Failed",
        description: "Failed to process photos. Please try again.",
        variant: "destructive",
        duration: 4000
      });
    } finally {
      // Reset states
      setPhotosLoading(false);
      setUploadProgress(0);
      photoProcessingRef.current = false;
      
      // Clear the input value to allow uploading the same file again
      e.target.value = '';
    }
  };
  
  // Item-specific photo upload handler
  const handleItemPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, itemId: string) => {
    const files = e.target.files;
    if (!files || files.length === 0 || photoProcessingRef.current) return;
    
    // Prevent concurrent uploads
    photoProcessingRef.current = true;
    const filesArray = Array.from(files);
    const totalFiles = filesArray.length;
    
    // Show upload progress
    setPhotosLoading(true);
    setUploadProgress(0);
    
    try {
      // Compress all images with thumbnails in parallel
      const compressedPhotosWithThumbnails = await compressImagesWithThumbnailsInParallel(
        filesArray,
        {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.8,
          format: 'jpeg'
        },
        (processed, total) => {
          setUploadProgress(Math.round((processed / total) * 100));
        }
      );
      
      // Generate unique IDs and create photo objects
      const newPhotos: PhotoData[] = compressedPhotosWithThumbnails.map((photo, index) => ({
        id: `photo_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 9)}`,
        compressed: photo.compressed,
        thumbnail: photo.thumbnail,
        originalSize: photo.originalSize
      }));
      
      // Update state with new photo objects
      setUploadedPhotos(prev => {
        const updated = [...prev, ...newPhotos];
        
        // Save photos to server
        const photosForServer = updated.map(photo => 
          typeof photo === 'string' ? photo : photo.compressed
        );
        
        updatePhotosMutation.mutate(photosForServer, {
          onSuccess: () => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 1000);
            queryClient.invalidateQueries({ queryKey: [`/api/imports/receipts/by-shipment/${id}`] });
          }
        });
        
        setSaveStatus('saving');
        return updated;
      });
      
      // Calculate size reduction
      const originalSize = filesArray.reduce((sum, file) => sum + file.size, 0);
      const compressedSize = compressedPhotosWithThumbnails.reduce((sum, photo) => {
        return sum + getBase64Size(photo.compressed) + getBase64Size(photo.thumbnail);
      }, 0);
      const reduction = Math.round(((originalSize - compressedSize) / originalSize) * 100);
      
      toast({
        title: "Item Photo Uploaded",
        description: `Successfully uploaded ${totalFiles} photo${totalFiles > 1 ? 's' : ''} for this item${reduction > 0 ? ` (${reduction}% smaller)` : ''}`,
        className: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
        duration: 3000
      });
      
    } catch (error) {
      console.error('Item photo upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to process photos. Please try again.",
        variant: "destructive",
        duration: 4000
      });
    } finally {
      setPhotosLoading(false);
      setUploadProgress(0);
      photoProcessingRef.current = false;
      e.target.value = '';
    }
  };

  const handleRemovePhoto = async (index: number) => {
    // Store the photo being removed for potential restoration
    const photoToRemove = uploadedPhotos[index];
    const photoId = getPhotoId(photoToRemove);
    const receiptId = receipt?.receipt?.id || receipt?.id;
    
    // Prevent rapid clicks by checking if this photo is already being deleted
    if (deletingPhotoIds.has(photoId)) {
      return; // Already deleting this photo
    }
    
    // Mark photo as being deleted to disable the button
    setDeletingPhotoIds(prev => new Set(prev).add(photoId));
    
    // Immediate optimistic UI update - remove photo instantly
    const originalPhotos = [...uploadedPhotos];
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
    
    // Cancel any existing debounced updates to prevent conflicts
    if (photoUpdateTimerRef.current) {
      clearTimeout(photoUpdateTimerRef.current);
      photoUpdateTimerRef.current = null;
    }
    
    // If we have a receipt ID, use the optimized DELETE endpoint with photo ID
    if (receiptId) {
      try {
        // Show saving indicator
        setSaveStatus('saving');
        
        // Call the dedicated DELETE endpoint with photo ID - SAFE operation
        const response = await fetch(`/api/imports/receipts/${receiptId}/photos/${photoId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to delete photo');
        }
        
        // Success - photo is deleted instantly
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1000);
        
        // Invalidate cache to ensure consistency
        queryClient.invalidateQueries({ queryKey: [`/api/imports/receipts/by-shipment/${id}`] });
        
        // Clean up blob URL if needed
        if (typeof photoToRemove === 'object' && photoToRemove?.compressed?.startsWith('blob:')) {
          revokeImagePreview(photoToRemove.compressed);
        }
        
        toast({
          title: "Photo Deleted",
          description: "Photo removed successfully",
          className: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
          duration: 1500
        });
      } catch (error) {
        // On error, rollback the UI change - restore photo at original position
        setUploadedPhotos(originalPhotos);
        
        setSaveStatus('idle');
        
        const errorMessage = error instanceof Error ? error.message : "Failed to remove photo";
        toast({
          title: "Delete Failed",
          description: errorMessage,
          variant: "destructive"
        });
      } finally {
        // Always remove from deleting set to re-enable button
        setDeletingPhotoIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(photoId);
          return newSet;
        });
      }
    } else {
      // No receipt yet - just update locally, will be saved when receipt is created
      try {
        pendingPhotoUpdatesRef.current = uploadedPhotos.filter((_, i) => i !== index);
        
        // Clean up blob URL if needed
        if (typeof photoToRemove === 'object' && photoToRemove?.compressed?.startsWith('blob:')) {
          revokeImagePreview(photoToRemove.compressed);
        }
        
        toast({
          title: "Photo Removed",
          description: "Photo removed from pending uploads",
          className: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800",
          duration: 1500
        });
      } finally {
        // Remove from deleting set
        setDeletingPhotoIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(photoId);
          return newSet;
        });
      }
    }
  };

  // Initialize audio on first user interaction
  useEffect(() => {
    const initAudio = () => {
      soundEffects.initAudio();
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
    };
    document.addEventListener('click', initAudio);
    document.addEventListener('keydown', initAudio);
    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Shipment not found</p>
            <Button variant="outline" className="mt-4" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Receiving
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 max-w-4xl relative">
      {/* Visual Feedback Components */}
      <ScanFeedback type={scanFeedback.type} message={scanFeedback.message} />
      <ScanLineAnimation isActive={scanMode} />
      <SuccessCheckmark show={showSuccessCheckmark} />
      {/* Save Status Indicator */}
      <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50">
        {saveStatus === 'saving' && (
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 shadow-lg rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Saving...</span>
          </div>
        )}
        {saveStatus === 'saved' && (
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 shadow-lg rounded-lg px-4 py-2 border border-green-200 dark:border-green-800 animate-in fade-in slide-in-from-top-1 duration-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">Saved</span>
          </div>
        )}
      </div>
      
      {/* Header - Mobile Optimized */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon"
            className="sm:size-auto"
            onClick={handleBackNavigation}
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only sm:not-sr-only sm:ml-2">Back</span>
          </Button>
          <Badge className={getStatusColor(shipment.status)}>
            {shipment.status?.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Continue Receiving</h1>
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
            {shipment.shipmentName || `Shipment #${shipment.id}`} • {shipment.trackingNumber}
          </p>
        </div>
      </div>

      {/* Progress Bar - Mobile Optimized */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs sm:text-sm font-medium">Overall Progress</span>
          <span className="text-xs sm:text-sm text-muted-foreground font-semibold">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-4 sm:h-3 bg-gray-200 dark:bg-gray-700" />
        <div className="flex flex-wrap gap-y-1 gap-x-3 sm:gap-4 mt-2 text-[10px] sm:text-xs text-muted-foreground">
          <span className="whitespace-nowrap">{unitLabel}: <span className="font-medium">{scannedParcels}/{parcelCount}</span></span>
          <span className="whitespace-nowrap">Items: <span className="font-medium">{totalReceivedQty}/{totalExpectedQty}</span></span>
          <span className="whitespace-nowrap">Verified: <span className="font-medium">{checkedItemsCount}/{totalItems}</span></span>
        </div>
      </div>

      {/* Step Navigation - Mobile Optimized */}
      <div className="grid grid-cols-2 gap-2 mb-4 sm:mb-6">
        <Button
          variant={currentStep === 1 ? "default" : "outline"}
          onClick={() => setCurrentStep(1)}
          className="h-auto py-3 px-2 sm:px-4"
        >
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
            <Package className="h-5 w-5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm leading-tight text-center sm:text-left">
              <span className="hidden sm:inline">Step 1: </span>
              <span className="sm:hidden">1:</span> Parcel
            </span>
          </div>
        </Button>
        <Button
          variant={currentStep === 2 ? "default" : "outline"}
          onClick={() => setCurrentStep(2)}
          className="h-auto py-3 px-2 sm:px-4"
        >
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
            <CheckSquare className="h-5 w-5 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm leading-tight text-center sm:text-left">
              <span className="hidden sm:inline">Step 2: </span>
              <span className="sm:hidden">2:</span> Items
            </span>
          </div>
        </Button>
      </div>

      {/* Step 1: Parcel Verification */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <Card className={`
            transition-all duration-500 border-2
            ${scannedParcels === parcelCount && parcelCount > 0 
              ? 'border-green-400 bg-green-50/50 dark:bg-green-950/20 shadow-green-100 dark:shadow-green-900/20' 
              : scannedParcels > 0 
                ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 shadow-amber-100 dark:shadow-amber-900/20'
                : 'border-gray-200 dark:border-gray-700'
            }
          `}>
            <CardHeader className="px-4 sm:px-6 pb-4">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
                {scannedParcels === parcelCount && parcelCount > 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : scannedParcels > 0 ? (
                  <Clock className="h-5 w-5 text-amber-600" />
                ) : (
                  isPalletShipment ? <Layers className="h-5 w-5" /> : <Package className="h-5 w-5" />
                )}
                {unitLabel} Verification
                {scannedParcels === parcelCount && parcelCount > 0 && (
                  <Badge className="ml-auto bg-green-600 text-white">Complete</Badge>
                )}
                {scannedParcels > 0 && scannedParcels < parcelCount && (
                  <Badge className="ml-auto bg-amber-600 text-white">In Progress</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6">
              {/* Show skeleton loading when data is loading */}
              {(receiptLoading || isLoading) ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div>
                      <Skeleton className="h-4 w-16 mb-2" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-10 w-10" />
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-10 w-10" />
                      </div>
                    </div>
                    <div>
                      <Skeleton className="h-4 w-28 mb-2" />
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-10 w-10" />
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-10 w-10" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-16 mb-2" />
                    <div className="grid grid-cols-3 gap-2">
                      <Skeleton className="h-24 w-full rounded-lg" />
                      <Skeleton className="h-24 w-full rounded-lg" />
                      <Skeleton className="h-24 w-full rounded-lg" />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Basic Info - Mobile Optimized */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label className="text-xs sm:text-sm">Received By *</Label>
                      <Input
                        value={receivedBy}
                        onChange={(e) => handleReceivedByChange(e.target.value)}
                        onBlur={handleReceivedByBlur}
                        placeholder="Your name"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm">Carrier *</Label>
                      <Input
                        value={carrier}
                        onChange={(e) => handleCarrierChange(e.target.value)}
                        onBlur={handleCarrierBlur}
                        placeholder="DHL, UPS, FedEx..."
                        required
                      />
                    </div>
                  </div>

                  {/* Parcel Count - Mobile Optimized */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label className="text-xs sm:text-sm">Expected {unitLabel}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className={`h-10 w-10 sm:h-9 sm:w-9 ${updateMetaMutation.isPending ? 'opacity-50' : ''}`}
                          onClick={() => handleParcelCountChange(Math.max(1, parcelCount - 1), true)}
                          disabled={parcelCount <= 1 || updateMetaMutation.isPending}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={parcelCount}
                          onChange={(e) => handleParcelCountChange(Math.max(1, parseInt(e.target.value) || 1), false)}
                          onBlur={handleParcelCountBlur}
                          className="text-center"
                          min="1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className={`h-10 w-10 sm:h-9 sm:w-9 ${updateMetaMutation.isPending ? 'opacity-50' : ''}`}
                          onClick={() => handleParcelCountChange(parcelCount + 1, true)}
                          disabled={updateMetaMutation.isPending}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs sm:text-sm">Received {unitLabel} (Manual)</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className={`h-10 w-10 sm:h-9 sm:w-9 ${updateMetaMutation.isPending ? 'opacity-50' : ''}`}
                          onClick={() => handleScannedParcelsChange(Math.max(0, scannedParcels - 1), true)}
                          disabled={scannedParcels === 0 || updateMetaMutation.isPending}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={scannedParcels}
                          onChange={(e) => handleScannedParcelsChange(Math.max(0, Math.min(parcelCount, parseInt(e.target.value) || 0)), false)}
                          onBlur={handleScannedParcelsBlur}
                          className="text-center"
                          min="0"
                          max={parcelCount}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className={`h-10 w-10 sm:h-9 sm:w-9 ${updateMetaMutation.isPending ? 'opacity-50' : ''}`}
                          onClick={() => handleScannedParcelsChange(Math.min(parcelCount, scannedParcels + 1), true)}
                          disabled={scannedParcels >= parcelCount || updateMetaMutation.isPending}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

              {/* Auto-Receive All Button */}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() => {
                    handleScannedParcelsChange(parcelCount, true);
                    toast({
                      title: "Auto-Receive Complete",
                      description: `All ${parcelCount} ${unitLabel.toLowerCase()} have been automatically received`
                    });
                  }}
                  disabled={scannedParcels >= parcelCount || updateMetaMutation.isPending}
                  className={`w-full h-10 sm:h-11 ${updateMetaMutation.isPending ? 'opacity-50' : ''}`}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Receive All ({parcelCount})
                </Button>
              </div>

              {/* Parcel Progress - Mobile Optimized */}
              <div className="bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{unitLabel} Scanned</span>
                  <span className="text-2xl font-bold text-green-600">
                    {scannedParcels} / {parcelCount}
                  </span>
                </div>
                <Progress 
                  value={(scannedParcels / parcelCount) * 100} 
                  className="h-3 bg-gray-200 dark:bg-gray-700"
                />
                {scannedParcels === parcelCount && parcelCount > 0 && (
                  <div className="flex items-center gap-2 mt-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">All {unitLabel.toLowerCase()} verified!</span>
                  </div>
                )}
                
                {/* Tracking Numbers Display */}
                {scannedTrackingNumbers.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Scanned Tracking Numbers:</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Clear local state
                          setScannedTrackingNumbers([]);
                          setScannedParcels(0);
                          // Update server state to clear scanned parcels
                          updateMetaMutation.mutate({ field: 'scannedParcels', value: 0 });
                          // Remove all tracking numbers
                          scannedTrackingNumbers.forEach(tn => {
                            updateTrackingMutation.mutate({ action: 'remove', trackingNumber: tn });
                          });
                          toast({
                            title: "Cleared",
                            description: "All tracking numbers have been cleared"
                          });
                        }}
                        className="text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear All
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {scannedTrackingNumbers.map((trackingNumber, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary" 
                          className="text-xs py-1 px-2"
                        >
                          {index + 1}. {trackingNumber}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Scan Parcels - Mobile Optimized */}
              <div className="col-span-full">
                <Label className="text-sm sm:text-base font-medium mb-2 sm:mb-3 block">Scan {unitLabel}</Label>
                <div className="w-full">
                  <ScanInputPulse isScanning={scanMode}>
                    <div className={`relative w-full rounded-lg border-2 transition-all duration-300 overflow-hidden ${
                      scanMode 
                        ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30 shadow-lg ring-2 ring-blue-200 dark:ring-blue-800' 
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}>
                      <div className="flex items-center">
                        <div className="flex-1 relative">
                          <Input
                            ref={barcodeRef}
                            value={barcodeScan}
                            onChange={(e) => setBarcodeScan(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && barcodeScan.trim()) {
                                e.preventDefault();
                                handleBarcodeScan(barcodeScan.trim());
                              }
                            }}
                            onBlur={(e) => {
                              // Handle Bluetooth scanner input that doesn't trigger Enter
                              if (e.target.value.trim() && e.target.value !== barcodeScan) {
                                setTimeout(() => {
                                  if (barcodeRef.current?.value.trim()) {
                                    handleBarcodeScan(barcodeRef.current.value.trim());
                                  }
                                }, 100);
                              }
                            }}
                            placeholder={`Scan or type ${isPalletShipment ? 'pallet' : 'parcel'} tracking number...`}
                            className="border-0 bg-transparent focus:ring-0 focus:outline-none text-sm sm:text-lg h-12 sm:h-14 px-3 sm:px-4 pr-12 placeholder:text-gray-500 dark:placeholder:text-gray-400 font-mono"
                            autoComplete="off"
                            spellCheck={false}
                          />
                          <ScanLine className={`absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-200 ${
                            scanMode ? 'text-blue-500 animate-pulse' : 'text-gray-400'
                          }`} />
                        </div>
                        <div className="flex-shrink-0 border-l border-gray-200 dark:border-gray-700">
                          <Button
                            type="button"
                            variant="ghost"
                            size="lg"
                            onClick={() => {
                              setScanMode(!scanMode);
                              if (!scanMode) {
                                setTimeout(() => barcodeRef.current?.focus(), 100);
                              }
                            }}
                            className={`h-12 sm:h-14 px-4 sm:px-6 rounded-none hover:bg-transparent transition-all duration-200 ${
                              scanMode 
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' 
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                          >
                            <Camera className={`h-6 w-6 transition-transform duration-200 ${
                              scanMode ? 'scale-110' : ''
                            }`} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </ScanInputPulse>
                  
                  {/* Scan Mode Indicator */}
                  {scanMode && (
                    <div className="mt-2 text-center">
                      <span className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-medium">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        Scanner Active - Point camera at barcode or type manually
                      </span>
                    </div>
                  )}
                </div>
              </div>

                  {/* Photos Upload - Step 1 */}
                  <div className="space-y-3">
                    <Label className="text-xs sm:text-sm">Photos</Label>
                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2"
                      >
                        <ImagePlus className="h-4 w-4" />
                        Add Photos
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <span className="text-xs text-muted-foreground">
                        Upload photos of the shipment
                      </span>
                    </div>

                    {/* Upload Progress Bar */}
                    {photosLoading && uploadProgress > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">
                            Compressing and uploading...
                          </span>
                          <span className="text-xs font-medium">{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" />
                      </div>
                    )}

                    {/* Photos Preview Grid */}
                    {(uploadedPhotos.length > 0 || photosLoading || previewUrls.length > 0) && (
                      <div className="relative">
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                          {/* Preview URLs while processing */}
                          {previewUrls.map((preview, index) => (
                            <div key={`preview-${index}`} className="relative flex-shrink-0">
                              <div className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-blue-400 dark:border-blue-600 animate-pulse">
                                <img
                                  src={preview}
                                  alt={`Processing ${index + 1}`}
                                  className="w-full h-full object-cover opacity-70"
                                />
                                <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Uploaded photos */}
                          {uploadedPhotos.map((photo, index) => {
                            const isNewFormat = typeof photo === 'object' && 'thumbnail' in photo;
                            const thumbnailSrc = isNewFormat ? photo.thumbnail : typeof photo === 'string' ? photo : undefined;
                            const photoId = getPhotoId(photo);
                            const isDeleting = deletingPhotoIds.has(photoId);
                            
                            return (
                              <div key={isNewFormat ? photo.id : `photo-${index}`} className="relative flex-shrink-0 group">
                                <div className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-colors ${isDeleting ? 'opacity-50' : ''}`}>
                                  <LazyImage
                                    thumbnailSrc={thumbnailSrc}
                                    alt={`Photo ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                  {isDeleting && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                                      <Loader2 className="h-4 w-4 text-white animate-spin" />
                                    </div>
                                  )}
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    disabled={isDeleting}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isDeleting) {
                                        handleRemovePhoto(index);
                                      }
                                    }}
                                    className={`absolute top-0.5 right-0.5 h-5 w-5 ${isDeleting ? 'opacity-100 cursor-not-allowed' : 'opacity-0 group-hover:opacity-100'} transition-opacity z-30`}
                                  >
                                    {isDeleting ? (
                                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-2.5 w-2.5" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Upload more button */}
                          {!photosLoading && (
                            <div
                              className="flex-shrink-0 w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-600 transition-colors cursor-pointer flex flex-col items-center justify-center"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="h-5 w-5 text-gray-400" />
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Add</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Empty state */}
                    {uploadedPhotos.length === 0 && !photosLoading && previewUrls.length === 0 && (
                      <div className="flex items-center justify-center py-4 px-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <Camera className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          No photos uploaded yet
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Quick Notes - Mobile Optimized */}
                  <div>
                    <Label className="text-xs sm:text-sm">Initial Notes</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      onBlur={handleNotesBlur}
                      placeholder="Any initial observations..."
                      rows={2}
                    />
                  </div>

                  <Button
                    onClick={() => setCurrentStep(2)}
                    disabled={!receivedBy || !carrier}
                    className="w-full"
                    size="default"
                  >
                    {scannedParcels > 0 ? (
                      <>
                        Continue to Item Checklist
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    ) : (
                      <>
                        Continue to Item Checklist
                        <CheckSquare className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Item Checklist */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <Card className={`
            transition-all duration-500 border-2
            ${completedItems === totalItems && totalItems > 0 
              ? 'border-green-400 bg-green-50/50 dark:bg-green-950/20 shadow-green-100 dark:shadow-green-900/20' 
              : completedItems > 0 
                ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 shadow-amber-100 dark:shadow-amber-900/20'
                : 'border-gray-200 dark:border-gray-700'
            }
          `}>
            <CardHeader className="px-4 sm:px-6 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
                  {completedItems === totalItems && totalItems > 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : completedItems > 0 ? (
                    <Clock className="h-5 w-5 text-amber-600" />
                  ) : (
                    <CheckSquare className="h-5 w-5" />
                  )}
                  Item Verification ({completedItems}/{totalItems})
                  {completedItems === totalItems && totalItems > 0 && (
                    <Badge className="ml-auto bg-green-600 text-white">Complete</Badge>
                  )}
                  {completedItems > 0 && completedItems < totalItems && (
                    <Badge className="ml-auto bg-amber-600 text-white">In Progress</Badge>
                  )}
                </CardTitle>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllItems(!showAllItems)}
                  >
                    {showAllItems ? 'Show Active' : 'Show All'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setScanMode(!scanMode);
                      if (!scanMode) {
                        setTimeout(() => barcodeRef.current?.focus(), 100);
                      }
                    }}
                    className={scanMode ? 'bg-blue-50 border-blue-300' : ''}
                  >
                    <ScanLine className="h-4 w-4 mr-1" />
                    Scan Items
                  </Button>
                </div>
              </div>
              
              {/* Progress Summary - Mobile Optimized */}
              {receivingItems.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-green-600">
                      {receivingItems.filter(i => i.status === 'complete').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Complete</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-amber-600">
                      {receivingItems.filter(i => i.status === 'pending').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-red-600">
                      {receivingItems.filter(i => i.status === 'damaged' || i.status === 'partial_damaged').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Damaged</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-gray-600">
                      {receivingItems.filter(i => i.status === 'missing' || i.status === 'partial_missing').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Missing</div>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-3 px-4 sm:px-6">
              {/* Scan Input */}
              {scanMode && (
                <ScanInputPulse isScanning={scanMode}>
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg transition-all duration-300">
                    <Input
                      ref={barcodeRef}
                      value={barcodeScan}
                      onChange={(e) => setBarcodeScan(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && barcodeScan) {
                          handleBarcodeScan(barcodeScan);
                        }
                      }}
                      placeholder="Scan item barcode here..."
                      className="border-blue-300 transition-all duration-200"
                    />
                  </div>
                </ScanInputPulse>
              )}

              {/* Items List - Mobile Optimized */}
              <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto space-y-2 sm:space-y-3 pr-1">
                {/* Show skeleton loading when items are still loading */}
                {receiptLoading || isLoading ? (
                  // Show skeleton items while loading
                  [...Array(3)].map((_, index) => (
                    <div key={`skeleton-${index}`} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4">
                        <Skeleton className="w-20 h-20 rounded-lg" />
                        <div className="flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <Skeleton className="h-5 w-32 mb-2" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                            <Skeleton className="h-6 w-16" />
                          </div>
                          <div className="space-y-2">
                            <Skeleton className="h-2 w-full" />
                            <div className="flex gap-2">
                              <Skeleton className="h-8 w-24" />
                              <Skeleton className="h-8 w-16" />
                              <Skeleton className="h-8 w-16" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : 
                  receivingItems.filter(item => 
                    showAllItems || item.status === 'pending' || item.receivedQty < item.expectedQty
                  ).map((item) => {
                    const progress = (item.receivedQty / item.expectedQty) * 100;
                    const isComplete = item.status === 'complete';
                    const isDamaged = item.status === 'damaged' || item.status === 'partial_damaged';
                    const isMissing = item.status === 'missing' || item.status === 'partial_missing';
                    const isPartial = item.status === 'partial' || item.status === 'partial_damaged' || item.status === 'partial_missing';
                    const isPending = item.status === 'pending';
                    
                    // Determine colors based on status
                    let borderColor = 'border-l-gray-400';
                    let bgColor = 'bg-white dark:bg-gray-900';
                    let statusIcon = Square;
                    let iconColor = 'text-gray-400';
                    
                    if (isComplete) {
                      borderColor = 'border-l-green-500';
                      bgColor = 'bg-green-50 dark:bg-green-950/30';
                      statusIcon = CheckCircle2;
                      iconColor = 'text-green-600';
                    } else if (isDamaged) {
                      borderColor = 'border-l-red-500';
                      bgColor = 'bg-red-50 dark:bg-red-950/30';
                      statusIcon = AlertTriangle;
                      iconColor = 'text-red-600';
                    } else if (isMissing) {
                      borderColor = 'border-l-gray-600';
                      bgColor = 'bg-gray-100 dark:bg-gray-800/50';
                      statusIcon = X;
                      iconColor = 'text-gray-600';
                    } else if (isPartial) {
                      borderColor = 'border-l-amber-500';
                      bgColor = 'bg-amber-50 dark:bg-amber-950/30';
                      statusIcon = Clock;
                      iconColor = 'text-amber-600';
                    }
                    
                    const StatusIcon = statusIcon;
                    
                    return (
                      <div 
                        key={item.id} 
                        className={`
                          border rounded-md transition-all duration-200 ease-in-out
                          border-l-4 ${borderColor} ${bgColor}
                          ${isComplete ? 'opacity-75' : ''}
                          hover:shadow-sm
                        `}
                      >
                        <div className="p-2">
                          {/* Compact Row Layout */}
                          <div className="flex items-center gap-2">
                            {/* Product Image with Status Icon */}
                            <div className="relative flex-shrink-0">
                              <LazyImage 
                                thumbnailSrc={item.imageUrl}
                                alt={item.name}
                                className="w-12 h-12 object-contain rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                              />
                              <div className={`absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center ${isComplete ? 'scale-110' : ''}`}>
                                <StatusIcon className={`h-2.5 w-2.5 ${iconColor}`} />
                              </div>
                            </div>
                            
                            {/* Main Content Area */}
                            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                              {/* Top Row: Name + Quantity Display */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className={`font-medium text-sm leading-tight truncate ${isComplete ? 'line-through opacity-60' : ''}`}>
                                    {item.name}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {item.sku && (
                                      <span className="text-xs text-muted-foreground font-mono">
                                        {item.sku}
                                      </span>
                                    )}
                                    {item.isNewProduct ? (
                                      <span className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-0.5" data-testid={`text-bin-location-${item.id}`}>
                                        <Package className="h-2.5 w-2.5" />
                                        New
                                      </span>
                                    ) : item.warehouseLocations && item.warehouseLocations.length > 0 ? (
                                      <span className="text-xs text-blue-600 dark:text-blue-400 font-mono" data-testid={`text-bin-location-${item.id}`}>
                                        {item.warehouseLocations.join(', ')}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                
                                {/* Compact Quantity Display */}
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <span className={`text-xs font-bold font-mono ${
                                    progress >= 100 ? 'text-green-600' : 
                                    progress > 0 ? 'text-amber-600' : 
                                    'text-gray-500'
                                  }`}>
                                    {item.receivedQty}/{item.expectedQty}
                                  </span>
                                  {/* Damage/Missing Indicators */}
                                  {item.damagedQty > 0 && (
                                    <span className="text-xs text-red-600 dark:text-red-400" data-testid={`indicator-dmg-miss-${item.id}`}>
                                      <AlertTriangle className="h-3 w-3" />
                                    </span>
                                  )}
                                  {item.missingQty > 0 && (
                                    <span className="text-xs text-gray-600 dark:text-gray-400">
                                      <X className="h-3 w-3" />
                                    </span>
                                  )}
                                  <Badge 
                                    className={`text-[10px] px-1.5 py-0 h-5 ${getItemStatusColor(item.status)}`}
                                    variant={isComplete ? 'default' : isPending ? 'outline' : 'secondary'}
                                  >
                                    {item.status === 'partial_damaged' ? 'P.DMG' : 
                                     item.status === 'partial_missing' ? 'P.MISS' : 
                                     item.status === 'complete' ? '✓' :
                                     item.status === 'damaged' ? 'DMG' :
                                     item.status === 'missing' ? 'MISS' :
                                     item.status === 'partial' ? 'PART' : 'PEND'}
                                  </Badge>
                                </div>
                              </div>
                              
                              {/* Compact Controls Row */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {/* Quantity Controls */}
                                <div className="flex items-center gap-0.5 bg-white dark:bg-gray-800 rounded border">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => updateItemQuantity(item.id, -1)}
                                    disabled={item.receivedQty === 0}
                                    className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  {editingItemId === item.id ? (
                                    <input
                                      type="number"
                                      value={editingValue}
                                      onChange={(e) => setEditingValue(e.target.value)}
                                      onBlur={() => handleQuantityEdit(item.id, editingValue)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleQuantityEdit(item.id, editingValue);
                                        } else if (e.key === 'Escape') {
                                          cancelEditing();
                                        }
                                      }}
                                      className="w-12 text-center text-sm font-bold font-mono px-1 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800"
                                      min="0"
                                      max={item.expectedQty}
                                      autoFocus
                                    />
                                  ) : (
                                    <span 
                                      className="text-sm font-bold font-mono w-12 text-center px-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                      onClick={() => startEditing(item.id, item.receivedQty)}
                                      title="Click to edit quantity"
                                    >
                                      {item.receivedQty}/{item.expectedQty}
                                    </span>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => updateItemQuantity(item.id, 1)}
                                    className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>

                                {/* Action Buttons - Compact */}
                                <Button
                                  variant={item.status === 'complete' ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => {
                                      // Toggle behavior: if complete, restore previous state; otherwise set to complete
                                      if (item.status === 'complete') {
                                        // Deselect: restore previous quantity and status
                                        const prevState = previousItemState[item.id];
                                        const restoredQty = prevState?.receivedQty ?? 0;
                                        const restoredStatus = prevState?.status ?? 'pending';
                                        
                                        const updatedItems = receivingItems.map(i => 
                                          i.id === item.id 
                                            ? { ...i, receivedQty: restoredQty, status: restoredStatus as ReceivingItem['status'], checked: restoredQty > 0 }
                                            : i
                                        );
                                        setReceivingItems(updatedItems);
                                        
                                        // Update server
                                        const delta = restoredQty - item.receivedQty;
                                        if (delta !== 0) {
                                          updateItemQuantityMutation.mutate({ itemId: item.id, delta });
                                        }
                                        updateItemFieldMutation.mutate({ itemId: item.id, field: 'status', value: restoredStatus });
                                        
                                        // Clear stored previous state
                                        setPreviousItemState(prev => {
                                          const updated = { ...prev };
                                          delete updated[item.id];
                                          return updated;
                                        });
                                      } else {
                                        // Store current state before changing to complete
                                        setPreviousItemState(prev => ({
                                          ...prev,
                                          [item.id]: { receivedQty: item.receivedQty, status: item.status }
                                        }));
                                        
                                        // Select: set to complete
                                        const updatedItems = receivingItems.map(i => 
                                          i.id === item.id 
                                            ? { ...i, receivedQty: i.expectedQty, status: 'complete' as const, checked: true }
                                            : i
                                        );
                                        setReceivingItems(updatedItems);
                                        
                                        // Update server
                                        const delta = item.expectedQty - item.receivedQty;
                                        if (delta !== 0) {
                                          updateItemQuantityMutation.mutate({ itemId: item.id, delta });
                                        }
                                        updateItemFieldMutation.mutate({ itemId: item.id, field: 'status', value: 'complete' });
                                      }
                                    }}
                                  className={`h-6 px-2 text-xs transition-colors ${
                                    item.status === 'complete'
                                      ? 'bg-green-600 hover:bg-green-700 border-green-600 text-white'
                                      : 'border-green-500 hover:border-green-600 hover:bg-green-50 text-green-700'
                                  }`}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Popover 
                                    open={dmgPopoverOpen[item.id] || false} 
                                    onOpenChange={(open) => {
                                      // Only allow opening if not already damaged, or allow closing
                                      if (open && !isDamaged) {
                                        setDmgPopoverOpen({ ...dmgPopoverOpen, [item.id]: true });
                                      } else if (!open) {
                                        setDmgPopoverOpen({ ...dmgPopoverOpen, [item.id]: false });
                                      }
                                    }}
                                  >
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant={isDamaged ? "destructive" : "outline"}
                                        size="sm"
                                        onClick={(e) => {
                                          // If already damaged, clear damage instead of opening popover
                                          if (isDamaged) {
                                            e.preventDefault();
                                            handleDmgAction(item.id, 0);
                                          } else {
                                            // Otherwise allow popover to open
                                            setDmgPopoverOpen({ ...dmgPopoverOpen, [item.id]: true });
                                          }
                                        }}
                                        className={`h-6 px-2 text-xs transition-colors ${
                                          isDamaged
                                            ? 'bg-red-600 hover:bg-red-700 border-red-600 text-white'
                                            : 'border-red-500 hover:border-red-600 hover:bg-red-50 text-red-700'
                                        }`}
                                      >
                                        <AlertTriangle className="h-3 w-3" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72 p-4" align="start">
                                      <div className="space-y-3">
                                        <div>
                                          <h4 className="font-semibold text-sm mb-1">Mark as Damaged</h4>
                                          <p className="text-xs text-muted-foreground">
                                            How many units are damaged? ({item.expectedQty} expected)
                                          </p>
                                        </div>
                                        <div className="space-y-2">
                                          <Input
                                            type="number"
                                            min="0"
                                            max={item.expectedQty}
                                            placeholder="Enter quantity"
                                            value={dmgQuantity[item.id] || ''}
                                            onChange={(e) => setDmgQuantity({ ...dmgQuantity, [item.id]: e.target.value })}
                                            className="text-sm"
                                            data-testid={`input-dmg-qty-${item.id}`}
                                          />
                                          <div className="flex gap-2 flex-wrap">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                setDmgQuantity({ ...dmgQuantity, [item.id]: '1' });
                                                handleDmgAction(item.id, 1);
                                              }}
                                              className="text-xs"
                                            >
                                              1
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                setDmgQuantity({ ...dmgQuantity, [item.id]: '5' });
                                                handleDmgAction(item.id, 5);
                                              }}
                                              className="text-xs"
                                            >
                                              5
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                setDmgQuantity({ ...dmgQuantity, [item.id]: item.expectedQty.toString() });
                                                handleDmgAction(item.id, item.expectedQty);
                                              }}
                                              className="text-xs"
                                            >
                                              All
                                            </Button>
                                          </div>
                                          <Button
                                            onClick={() => {
                                              const qty = parseInt(dmgQuantity[item.id] || '0');
                                              if (qty > 0) {
                                                handleDmgAction(item.id, qty);
                                              }
                                            }}
                                            className="w-full bg-red-600 hover:bg-red-700 text-white"
                                            size="sm"
                                            disabled={!dmgQuantity[item.id] || parseInt(dmgQuantity[item.id]) <= 0}
                                            data-testid={`button-confirm-dmg-${item.id}`}
                                          >
                                            Confirm Damage
                                          </Button>
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                  <Popover 
                                    open={missPopoverOpen[item.id] || false} 
                                    onOpenChange={(open) => {
                                      // Only allow opening if not already missing, or allow closing
                                      if (open && !isMissing) {
                                        setMissPopoverOpen({ ...missPopoverOpen, [item.id]: true });
                                      } else if (!open) {
                                        setMissPopoverOpen({ ...missPopoverOpen, [item.id]: false });
                                      }
                                    }}
                                  >
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant={isMissing ? "secondary" : "outline"}
                                        size="sm"
                                        onClick={(e) => {
                                          // If already missing, clear missing instead of opening popover
                                          if (isMissing) {
                                            e.preventDefault();
                                            handleMissAction(item.id, 0);
                                          } else {
                                            // Otherwise allow popover to open
                                            setMissPopoverOpen({ ...missPopoverOpen, [item.id]: true });
                                          }
                                        }}
                                        className={`h-6 px-2 text-xs transition-colors ${
                                          isMissing
                                            ? 'bg-gray-600 hover:bg-gray-700 border-gray-600 text-white'
                                            : 'border-gray-500 hover:border-gray-600 hover:bg-gray-50 text-gray-700'
                                        }`}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72 p-4" align="start">
                                      <div className="space-y-3">
                                        <div>
                                          <h4 className="font-semibold text-sm mb-1">Mark as Missing</h4>
                                          <p className="text-xs text-muted-foreground">
                                            How many units are missing? ({item.expectedQty} expected)
                                          </p>
                                        </div>
                                        <div className="space-y-2">
                                          <Input
                                            type="number"
                                            min="0"
                                            max={item.expectedQty}
                                            placeholder="Enter quantity"
                                            value={missQuantity[item.id] || ''}
                                            onChange={(e) => setMissQuantity({ ...missQuantity, [item.id]: e.target.value })}
                                            className="text-sm"
                                            data-testid={`input-miss-qty-${item.id}`}
                                          />
                                          <div className="flex gap-2 flex-wrap">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                setMissQuantity({ ...missQuantity, [item.id]: '1' });
                                                handleMissAction(item.id, 1);
                                              }}
                                              className="text-xs"
                                            >
                                              1
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                setMissQuantity({ ...missQuantity, [item.id]: '5' });
                                                handleMissAction(item.id, 5);
                                              }}
                                              className="text-xs"
                                            >
                                              5
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                setMissQuantity({ ...missQuantity, [item.id]: item.expectedQty.toString() });
                                                handleMissAction(item.id, item.expectedQty);
                                              }}
                                              className="text-xs"
                                            >
                                              All
                                            </Button>
                                          </div>
                                          <Button
                                            onClick={() => {
                                              const qty = parseInt(missQuantity[item.id] || '0');
                                              if (qty > 0) {
                                                handleMissAction(item.id, qty);
                                              }
                                            }}
                                            className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                                            size="sm"
                                            disabled={!missQuantity[item.id] || parseInt(missQuantity[item.id]) <= 0}
                                            data-testid={`button-confirm-miss-${item.id}`}
                                          >
                                            Confirm Missing
                                          </Button>
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                  
                                  {/* Notes Field with Camera Button - Show when needed */}
                                  {(isDamaged || isMissing || item.notes) && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => itemPhotoInputRefs.current[item.id]?.click()}
                                        className="h-6 w-6 p-0 border-blue-500 hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-700 dark:text-blue-400"
                                        title="Upload photos"
                                        data-testid={`button-camera-${item.id}`}
                                      >
                                        <Camera className="h-3 w-3" />
                                      </Button>
                                      <input
                                        ref={(el) => itemPhotoInputRefs.current[item.id] = el}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={(e) => handleItemPhotoUpload(e, item.id)}
                                        className="hidden"
                                        data-testid={`input-item-photo-${item.id}`}
                                      />
                                    </>
                                  )}
                                </div>
                                
                                {/* Notes Input - Full Width Below */}
                                {(isDamaged || isMissing || item.notes) && (
                                  <Input
                                    value={item.notes || ''}
                                    onChange={(e) => updateItemNotes(item.id, e.target.value)}
                                    placeholder="Add notes..."
                                    className="text-xs h-7 bg-white dark:bg-gray-800 w-full"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                    );
                  })}
              </div>

              {(() => {
                const filteredItems = receivingItems.filter(item => 
                  showAllItems || item.status === 'pending' || item.receivedQty < item.expectedQty
                );
                
                if (receivingItems.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No items loaded from shipment</p>
                      <p className="text-xs mt-2">Debug: Check console for data loading issues</p>
                    </div>
                  );
                }
                
                if (filteredItems.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>All items completed. Switch to "Show All" to see them.</p>
                      <p className="text-xs mt-2">Total items: {receivingItems.length}</p>
                    </div>
                  );
                }
                
                return null;
              })()}
            </CardContent>
          </Card>

          {/* Photos Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Photos
                <span className="text-sm font-normal text-muted-foreground ml-auto">
                  {uploadedPhotos.length > 0 && `(${uploadedPhotos.length} uploaded)`}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload Button */}
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <ImagePlus className="h-4 w-4" />
                  Add Photos
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <span className="text-sm text-muted-foreground">
                  Upload photos of the shipment, damage, or any issues
                </span>
              </div>

              {/* Upload Progress Bar */}
              {photosLoading && uploadProgress > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">
                      Compressing and uploading photos...
                    </span>
                    <span className="text-sm font-medium">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {/* Photos Grid - Horizontal Scrollable Layout */}
              {(uploadedPhotos.length > 0 || photosLoading || previewUrls.length > 0) && (
                <div className="relative">
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                    {/* Show preview URLs while processing */}
                    {previewUrls.map((preview, index) => (
                      <div
                        key={`preview-${index}`}
                        className="relative flex-shrink-0 group"
                      >
                        <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-blue-400 dark:border-blue-600 animate-pulse">
                          <img
                            src={preview}
                            alt={`Processing ${index + 1}`}
                            className="w-full h-full object-cover opacity-70"
                          />
                          <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 text-white animate-spin" />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                            <span className="text-white text-xs font-medium">
                              Processing...
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Optimized thumbnail-only photo display */}
                    {uploadedPhotos.map((photo, index) => {
                      // Handle both new format (with thumbnail) and old format (string)
                      const isNewFormat = typeof photo === 'object' && 'thumbnail' in photo;
                      const thumbnailSrc = isNewFormat ? photo.thumbnail : typeof photo === 'string' ? photo : undefined;
                      const sizeInfo = isNewFormat
                        ? `${Math.round(getBase64Size(photo.thumbnail) / 1024)}KB`
                        : null;
                      const photoId = getPhotoId(photo);
                      const isDeleting = deletingPhotoIds.has(photoId);
                      
                      return (
                        <div
                          key={isNewFormat ? photo.id : `photo-${index}`}
                          className="relative flex-shrink-0 group"
                        >
                          {/* Photo Container - optimized for thumbnails only */}
                          <div className={`relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-colors ${isDeleting ? 'opacity-50' : ''}`}>
                            <LazyImage
                              thumbnailSrc={thumbnailSrc}
                              alt={`Upload ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {/* Show loading overlay when deleting */}
                            {isDeleting && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                                <Loader2 className="h-6 w-6 text-white animate-spin" />
                              </div>
                            )}
                            {/* Overlay with photo info */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 z-10">
                              <span className="text-white text-xs font-medium block">
                                Photo {index + 1}
                              </span>
                              {sizeInfo && (
                                <span className="text-white/80 text-[10px]">
                                  {sizeInfo}
                                </span>
                              )}
                            </div>
                            {/* Remove button - disabled during deletion */}
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              disabled={isDeleting}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isDeleting) {
                                  handleRemovePhoto(index);
                                }
                              }}
                              className={`absolute top-1 right-1 h-6 w-6 ${isDeleting ? 'opacity-100 cursor-not-allowed' : 'opacity-0 group-hover:opacity-100'} transition-opacity z-30`}
                            >
                              {isDeleting ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                            {/* Optimization indicator for new format */}
                            {isNewFormat && (
                              <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                                  ⚡ Fast
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Upload more placeholder - only show when not loading */}
                    {!photosLoading && (
                      <div
                        className="flex-shrink-0 w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-600 transition-colors cursor-pointer flex flex-col items-center justify-center"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <span className="text-xs text-gray-500 dark:text-gray-400 text-center px-2">
                          Add more
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {uploadedPhotos.length === 0 && !photosLoading && (
                <div className="flex flex-col items-center justify-center py-8 px-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                  <Camera className="h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    No photos uploaded yet
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-1">
                    Click "Add Photos" to upload images of the shipment
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Additional Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Add any additional notes about this receiving process..."
                rows={3}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Action Buttons - Mobile Optimized */}
          <div className="flex flex-col sm:flex-row gap-2 px-4 sm:px-6 pb-4 sm:pb-6">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(1)}
              className="w-full sm:flex-1 h-10 sm:h-11"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Step 1
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                completeReceivingMutation.isPending || 
                receivingItems.some(item => item.status === 'pending') ||
                receivingItems.length === 0
              }
              className="w-full sm:flex-1 h-12 sm:h-14 bg-green-600 hover:bg-green-700 text-white"
            >
              {completeReceivingMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete Receiving
                </>
              )}
            </Button>
          </div>
        </div>
      )}
      
      {/* Confirmation Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Receiving Process?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div>
                This action will complete the receiving process and move the shipment to pending approval.
              </div>
              
              {(() => {
                const stats = getItemStats();
                const verificationRate = stats.totalItems > 0 ? (stats.verifiedItems / stats.totalItems) * 100 : 0;
                const parcelProgress = parcelCount > 0 ? (scannedParcels / parcelCount) * 100 : 0;
                const hasIssues = stats.damagedItems > 0 || stats.missingItems > 0;
                const allPerfect = stats.completeNoIssues === stats.totalItems;
                
                return (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-5 rounded-xl border border-blue-100 dark:border-gray-700 space-y-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      <h4 className="font-semibold text-base text-gray-800 dark:text-gray-200">Receiving Progress</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Items Progress */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Items Verified</span>
                          <span className={`text-sm font-bold px-3 py-1 rounded-full shadow-sm ${
                            verificationRate === 100 
                              ? hasIssues 
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border border-amber-200'
                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200'
                              : verificationRate > 0 
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-200'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200'
                          }`}>
                            {stats.verifiedItems}/{stats.totalItems}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full transition-all duration-500 ease-out ${
                              verificationRate === 100 
                                ? hasIssues
                                  ? 'bg-amber-500 shadow-sm'
                                  : 'bg-green-500 shadow-sm'
                                : verificationRate > 0 
                                  ? 'bg-blue-500 shadow-sm'
                                  : 'bg-gray-400'
                            }`}
                            style={{ width: `${verificationRate}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-gray-500 dark:text-gray-400">
                            {Math.round(verificationRate)}% verified
                          </span>
                          {verificationRate === 100 && hasIssues && (
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                              <AlertTriangle className="h-3 w-3" />
                              {stats.completeNoIssues} perfect, {stats.verifiedItems - stats.completeNoIssues} with issues
                            </span>
                          )}
                          {verificationRate === 100 && !hasIssues && (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                              <CheckCircle2 className="h-3 w-3" />
                              All perfect
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Parcels Progress */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {isPalletShipment ? 'Pallets' : 'Parcels'} Scanned
                          </span>
                          <span className={`text-sm font-bold px-3 py-1 rounded-full shadow-sm ${
                            parcelProgress === 100 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200' 
                              : parcelProgress > 0 
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-200'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200'
                          }`}>
                            {scannedParcels}/{parcelCount}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full transition-all duration-500 ease-out ${
                              parcelProgress === 100 
                                ? 'bg-green-500 shadow-sm' 
                                : parcelProgress > 0 
                                  ? 'bg-blue-500 shadow-sm'
                                  : 'bg-gray-400'
                            }`}
                            style={{ width: `${parcelProgress}%` }}
                          />
                        </div>
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {Math.round(parcelProgress)}% scanned
                        </div>
                      </div>
                    </div>

                    {/* Status Badges */}
                    {(stats.damagedItems > 0 || stats.missingItems > 0 || stats.partialItems > 0) && (
                      <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                        {stats.damagedItems > 0 && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-xs font-semibold border border-red-200 dark:border-red-800">
                            <AlertTriangle className="h-3 w-3" />
                            {stats.damagedItems} Damaged
                          </div>
                        )}
                        
                        {stats.missingItems > 0 && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-xs font-semibold border border-gray-200 dark:border-gray-700">
                            <Minus className="h-3 w-3" />
                            {stats.missingItems} Missing
                          </div>
                        )}
                        
                        {stats.partialItems > 0 && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-full text-xs font-semibold border border-amber-200 dark:border-amber-800">
                            <Clock className="h-3 w-3" />
                            {stats.partialItems} Partial
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Completion Status */}
                    {verificationRate === 100 && parcelProgress === 100 && (
                      <div className={`flex items-center gap-2 px-4 py-3 border rounded-lg ${
                        allPerfect
                          ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'
                          : 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800'
                      }`}>
                        <CheckCircle2 className={`h-4 w-4 ${
                          allPerfect ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                        }`} />
                        <span className={`text-sm font-medium ${
                          allPerfect 
                            ? 'text-green-800 dark:text-green-200' 
                            : 'text-amber-800 dark:text-amber-200'
                        }`}>
                          {allPerfect
                            ? 'All items and parcels received successfully!'
                            : 'All items and parcels verified with issues noted'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
              
              <div className="text-sm text-muted-foreground">
                Once completed, this shipment will require approval before the items can be processed further.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCompleteReceiving}>
              Complete Receiving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
