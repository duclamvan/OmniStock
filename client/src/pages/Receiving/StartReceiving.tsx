
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { Skeleton } from "@/components/ui/skeleton";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

interface ReceivingItem {
  id: string;
  itemId?: number; // Add itemId field for API calls (references shipment item)
  name: string;
  sku?: string;
  productId?: string; // Product ID for fetching real locations
  expectedQty: number;
  receivedQty: number;
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
    console.info(`Product locations API call failed for product ${productId}, showing TBA:`, error.message);
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

export default function StartReceiving() {
  const { id } = useParams();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation(['imports']);
  const { user } = useAuth(); // Get current user for auto-populating "Received By"
  const barcodeRef = useRef<HTMLInputElement>(null);
  const lastSaveDataRef = useRef<any>(null); // Fix missing ref error for world-record speed
  const dataInitializedRef = useRef<string>(''); // Prevent double initialization - stores data key
  const updateQueueRef = useRef<Map<string, number>>(new Map()); // Queue for rapid updates
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null); // Timer for debounced updates
  const isInitialLoadRef = useRef<boolean>(true); // Track if we're in the initial load phase
  const prefilledDataProcessedRef = useRef<boolean>(false); // Track if prefilled data has been processed
  const receivedByAutoPopulatedRef = useRef<boolean>(false); // Track if receivedBy has been auto-populated
  
  // Handle back navigation with proper query invalidation
  const handleBackNavigation = useCallback(() => {
    // Invalidate all receipt-related queries to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts'] });
    queryClient.invalidateQueries({ queryKey: [`/api/imports/receipts/by-shipment/${id}`] });
    queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/by-status/receiving'] });
    queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/receivable'] }); // Refresh To Receive tab
    navigate('/receiving');
  }, [id, navigate]);
  
  // Form state - Auto-populate "Received By" with current user's first name
  const [receivedBy, setReceivedBy] = useState(() => {
    if (user) {
      // Use firstName from user profile, fallback to username or email
      const firstName = user.firstName || user.username || user.email?.split('@')[0] || t('employeeDefault');
      return firstName;
    }
    return t('employeeDefault');
  });
  const [carrier, setCarrier] = useState("");
  const [parcelCount, setParcelCount] = useState(1);
  const [scannedParcels, setScannedParcels] = useState(0);
  const [receivingItems, setReceivingItems] = useState<ReceivingItem[]>([]);
  const [notes, setNotes] = useState("");
  const [scannedTrackingNumbers, setScannedTrackingNumbers] = useState<string[]>([]);
  // Photo type for backward compatibility
  type PhotoData = {
    id: string;
    compressed: string;
    thumbnail: string;
    originalSize?: number;
  } | string; // Keep string for backward compatibility
  
  const [uploadedPhotos, setUploadedPhotos] = useState<PhotoData[]>([]);
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
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [completedShipmentId, setCompletedShipmentId] = useState<string | null>(null);
  const [hasShownCompletionToast, setHasShownCompletionToast] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error' | 'duplicate' | 'complete' | null; message: string }>({ type: null, message: '' });
  const [showSuccessCheckmark, setShowSuccessCheckmark] = useState(false);

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
  const unitLabel = isPalletShipment ? t('pallets') : t('parcels');

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
      // Always use current user's first name if available, otherwise use saved value
      const firstName = user?.firstName || user?.username || user?.email?.split('@')[0];
      setReceivedBy(firstName || receiptData.receivedBy || "Employee #1");
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
      
      // Always auto-fill carrier from shipment data if carrier is empty
      if (!carrier) {
        setCarrier(shipment.endCarrier || shipment.easypostCarrier || shipment.carrier || "");
      }
      
      // Only set other defaults if the current values are empty/default
      if (!receivedBy || receivedBy === "Employee #1") {
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
          throw new Error('Failed to create receipt: ' + autoSaveError.message);
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
        title: t('updateFailed'),
        description: t('failedToSaveQuantity'),
        variant: "destructive"
      });
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
          soundEffects.playSuccessSound();
          
          // Show toast notification
          toast({
            title: t('preScannedDataLoaded'),
            description: t('loadedXTrackingNumbers', { count: newNumbers.length }),
            duration: 4000,
          });
          
          // Show success feedback
          setScanFeedback({ 
            type: 'success', 
            message: t('trackingNumbersLoadedFromBulkScan', { count: newNumbers.length }) 
          });
          setTimeout(() => setScanFeedback({ type: null, message: '' }), 3000);
        } else if (prefilledTrackingNumbers.length > 0) {
          // All tracking numbers were duplicates
          toast({
            title: t('trackingNumbersAlreadyScanned'),
            description: t('allXTrackingNumbersAlreadyRecorded', { count: prefilledTrackingNumbers.length }),
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
        title: t('updateFailed'),
        description: t('pleaseTryAgain'),
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
      
      // Validate tracking number against shipment's tracking list
      const shipmentTrackingNumbers = shipment?.endTrackingNumbers || [];
      if (shipmentTrackingNumbers.length > 0 && !shipmentTrackingNumbers.includes(value)) {
        await soundEffects.playErrorBeep();
        setScanFeedback({ type: 'error', message: t('invalidTrackingNumberDesc', { value }) });
        setTimeout(() => setScanFeedback({ type: null, message: '' }), 3000);
        toast({
          title: t('invalidTrackingNumber'),
          description: t('trackingNumberNotInShipment', { value }),
          variant: "destructive",
          duration: 4000
        });
        setBarcodeScan("");
        return;
      }
      
      // Check if tracking number already scanned
      if (scannedTrackingNumbers.includes(value)) {
        await soundEffects.playDuplicateBeep();
        setScanFeedback({ type: 'duplicate', message: t('alreadyScannedValue', { value }) });
        setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
        toast({
          title: t('alreadyScanned'),
          description: t('trackingNumberAlreadyScanned', { value }),
          variant: "destructive",
          duration: 3000
        });
        setBarcodeScan("");
        return;
      }
      
      const newTrackingNumbers = [...scannedTrackingNumbers, value];
      // Always use actual tracking numbers count
      const newCount = Math.min(newTrackingNumbers.length, parcelCount);
      setScannedTrackingNumbers(newTrackingNumbers);
      setScannedParcels(newCount); // Update local state for immediate UI refresh
      
      // Play success sound and show visual feedback
      await soundEffects.playSuccessBeep();
      setScanFeedback({ type: 'success', message: `${t('scanned')}: ${value}` });
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
          updateTrackingMutation.mutate({ action: 'add', trackingNumber: value });
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 1000);
        }
      });
      
      const { dismiss} = toast({
        title: isPalletShipment ? t('palletScanned') : t('parcelScanned'),
        description: t('scannedXofY', { scanned: newCount, total: parcelCount }) + ` ${unitLabel.toLowerCase()} - ${value}`,
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
        setScanFeedback({ type: 'success', message: `${t('scanned')}: ${item.name}` });
        setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
        updateItemQuantity(item.id, 1);
        toast({
          title: t('itemScanned'),
          description: `${item.name} - ${t('quantityUpdated')}`,
          duration: 2000
        });
      } else {
        await soundEffects.playErrorBeep();
        setScanFeedback({ type: 'error', message: t('itemNotFound') });
        setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
        toast({
          title: t('itemNotFound'),
          description: t('thisSkuIsNotInCurrentShipment'),
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
          title: t('updateFailed'),
          description: t('failedToSaveStatusUpdate'),
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
        title: t('updateFailed'),
        description: t('itemNotFound'),
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
          title: t('updateFailed'),
          description: t('failedToSaveNotes'),
          variant: "destructive"
        });
      }
    });
  }, [receivingItems, toast, updateItemFieldMutation]);

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
        title: t('receiptUpdated'),
        description: t('successfullyUpdatedReceivingProcess')
      });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/receivable'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/by-status/receiving'] });
      navigate('/receiving');
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('failedToUpdateReceipt'),
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
        title: t('receiptCreated'),
        description: t('successfullyStartedReceivingProcess')
      });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/receivable'] });
      navigate(`/receiving/receipt/${data.receipt.id}`);
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('failedToCreateReceipt'),
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
      // Invalidate receivable query only if this is the first receipt creation
      // This ensures the shipment disappears from "To Receive" tab when moved to "Receiving"
      if (!receipt && response?.receipt?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/receivable'] });
        queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/by-status/receiving'] });
      }
      // Don't invalidate other caches during active editing to prevent jumping values
      // Data will be fresh when component remounts
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
        title: t('receivingCompleted'),
        description: t('shipmentSuccessfullyReceived')
      });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/receivable'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/by-status/receiving'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/by-status/pending_approval'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/storage'] });
      
      // Store shipment ID and show success dialog
      const shipmentId = receipt?.receipt?.shipmentId || receipt?.shipmentId || id || '';
      setCompletedShipmentId(shipmentId);
      setShowSuccessDialog(true);
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || t('failedToCompleteReceiving'),
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
    // Check if receipt is already completed
    const receiptStatus = receipt?.receipt?.status || receipt?.status;
    if (receiptStatus === 'pending_approval' || receiptStatus === 'verified' || receiptStatus === 'approved') {
      toast({
        title: t('alreadyCompleted'),
        description: t('alreadyCompleted'),
        variant: "destructive"
      });
      return;
    }
    
    // Check if shipment is in receiving status
    if (shipment?.receivingStatus !== 'receiving') {
      toast({
        title: t('cannotComplete'),
        description: t('shipmentNotInReceivingStatus', { status: shipment?.receivingStatus || 'none' }),
        variant: "destructive"
      });
      return;
    }
    
    // Check if all items have been processed
    const pendingItems = receivingItems.filter(item => item.status === 'pending');
    
    if (pendingItems.length > 0) {
      toast({
        title: t('incompleteItems'),
        description: t('pleaseProcessAllItemsBeforeCompleting', { count: pendingItems.length }),
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
          itemId: item.id,
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
    const completeItems = receivingItems.filter(item => item.status === 'complete').length;
    const damagedItems = receivingItems.filter(item => 
      item.status === 'damaged' || item.status === 'partial_damaged'
    ).length;
    const missingItems = receivingItems.filter(item => 
      item.status === 'missing' || item.status === 'partial_missing'
    ).length;
    const partialItems = receivingItems.filter(item => item.status === 'partial').length;
    
    return {
      totalItems,
      completeItems,
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
        title: t('allItemsReceived'),
        description: t('greatJobShipmentFullyReceived'),
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
              title: t('saveFailed'),
              description: t('photosUploadedButFailedToSave'),
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
        title: t('photosUploaded'),
        description: t('successfullyUploadedXPhotos', { count: totalFiles, reduction, thumbnailSize: thumbnailSizeKB }),
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
        title: t('uploadFailed'),
        description: t('failedToProcessPhotos'),
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
  
  const handleRemovePhoto = (index: number) => {
    // Store the photo being removed for potential restoration
    const photoToRemove = uploadedPhotos[index];
    
    // Immediate optimistic UI update using functional setState
    // This ensures we're always working with the latest state
    setUploadedPhotos(prev => {
      // Filter out the photo at the specified index
      const updated = prev.filter((_, i) => i !== index);
      
      // Store the updated state in ref for the debounced server update
      pendingPhotoUpdatesRef.current = updated;
      
      // Clear any existing timer to debounce rapid removals
      if (photoUpdateTimerRef.current) {
        clearTimeout(photoUpdateTimerRef.current);
      }
      
      // Set a new timer to send the update after a short delay
      // This batches multiple rapid removals into a single server request
      photoUpdateTimerRef.current = setTimeout(() => {
        // Get the final state after all removals
        const finalPhotos = pendingPhotoUpdatesRef.current;
        
        // Convert to simple array for server (backward compatible)
        const photosForServer = finalPhotos.map(photo => 
          typeof photo === 'string' ? photo : photo.compressed
        );
        
        setSaveStatus('saving');
        updatePhotosMutation.mutate(photosForServer, {
          onSuccess: () => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 1000);
            // Invalidate receipt query to ensure fresh photos when navigating back
            queryClient.invalidateQueries({ queryKey: [`/api/imports/receipts/by-shipment/${id}`] });
          },
          onError: () => {
            // On error, sync state with what we tried to save
            // This prevents inconsistency between UI and server
            setUploadedPhotos(pendingPhotoUpdatesRef.current);
            
            toast({
              title: t('saveFailed'),
              description: t('failedToSavePhotoChanges'),
              variant: "destructive"
            });
            setSaveStatus('idle');
          }
        });
        
        // Clear the timer ref
        photoUpdateTimerRef.current = null;
      }, 300); // 300ms delay to batch rapid removals
      
      return updated;
    });
    
    // Instant feedback for each removal
    toast({
      title: t('photoRemoved'),
      description: t('photoDeleted'),
      className: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800",
      duration: 1500
    });
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
            <Button variant="outline" className="mt-4" onClick={() => navigate('/receiving')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Receiving
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-4xl relative overflow-x-hidden">
      {/* Visual Feedback Components */}
      <ScanFeedback type={scanFeedback.type} message={scanFeedback.message} />
      <ScanLineAnimation isActive={scanMode} />
      <SuccessCheckmark show={showSuccessCheckmark} />
      
      {/* Save Status Indicator */}
      <div className="fixed top-4 right-4 z-50">
        {saveStatus === 'saving' && (
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 shadow-lg rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('saving')}</span>
          </div>
        )}
        {saveStatus === 'saved' && (
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 shadow-lg rounded-lg px-3 py-2 border border-green-200 dark:border-green-800 animate-in fade-in slide-in-from-top-1 duration-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">{t('saved')}</span>
          </div>
        )}
      </div>
      
      {/* Header - Compact and Clean */}
      <div className="mb-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleBackNavigation}
          className="mb-3 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          {t('back')}
        </Button>
        
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t('quickReceiving')}</h1>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">
              {shipment.shipmentName || `#${shipment.id.slice(0,8)}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={`${getStatusColor(shipment.status)} text-xs px-2 py-0.5`}>
              {shipment.status?.replace('_', ' ').toUpperCase()}
            </Badge>
            {receipt && receipt.receipt && (
              <Link href={`/receiving/receipt/${receipt.receipt.id}`}>
                <Button variant="outline" size="sm" className="h-8">
                  <FileText className="h-3.5 w-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">{t('viewReceipt')}</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Progress Summary - Compact Cards */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="bg-card border rounded-lg p-2.5 text-center">
          <div className="text-lg sm:text-xl font-bold text-foreground">{Math.round(progress)}%</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground">{t('progress')}</div>
        </div>
        <div className="bg-card border rounded-lg p-2.5 text-center">
          <div className="text-lg sm:text-xl font-bold text-foreground">{scannedParcels}/{parcelCount}</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground">{isPalletShipment ? t('pallets') : t('parcels')}</div>
        </div>
        <div className="bg-card border rounded-lg p-2.5 text-center">
          <div className="text-lg sm:text-xl font-bold text-foreground">{totalReceivedQty}/{totalExpectedQty}</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground">{t('items')}</div>
        </div>
        <div className="bg-card border rounded-lg p-2.5 text-center">
          <div className="text-lg sm:text-xl font-bold text-foreground">{checkedItemsCount}/{totalItems}</div>
          <div className="text-[10px] sm:text-xs text-muted-foreground">{t('verified')}</div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-4">
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Navigation - Clean Tabs */}
      <div className="flex border-b mb-4">
        <button
          onClick={() => setCurrentStep(1)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            currentStep === 1 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
          data-testid="tab-parcel-check"
        >
          <Package className="h-4 w-4" />
          <span>{t('parcelCheck')}</span>
          {scannedParcels === parcelCount && parcelCount > 0 && (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
        </button>
        <button
          onClick={() => setCurrentStep(2)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            currentStep === 2 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          }`}
          data-testid="tab-item-checklist"
        >
          <CheckSquare className="h-4 w-4" />
          <span>{t('itemChecklist')}</span>
          {completedItems === totalItems && totalItems > 0 && (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
        </button>
      </div>

      {/* Step 1: Parcel Verification */}
      {currentStep === 1 && (
        <div className="space-y-4">
          {/* Show skeleton loading when data is loading */}
          {(receiptLoading || isLoading) ? (
            <Card className="border">
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-16 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <div>
                  <Skeleton className="h-4 w-28 mb-2" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Basic Info Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">{t('receivedBy')} *</Label>
                  <Input
                    value={receivedBy}
                    onChange={(e) => handleReceivedByChange(e.target.value)}
                    onBlur={handleReceivedByBlur}
                    placeholder={t('yourName')}
                    required
                    className="h-10"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">{t('carrier')} *</Label>
                  <Input
                    value={carrier}
                    onChange={(e) => handleCarrierChange(e.target.value)}
                    onBlur={handleCarrierBlur}
                    placeholder={t('carrierPlaceholder')}
                    required
                    className="h-10"
                  />
                </div>
              </div>

              {/* Parcel Counter */}
              <div>
                <Label className="text-sm font-medium mb-1.5 block">
                  {isPalletShipment ? t('receivedPallets') : t('receivedParcels')}
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleScannedParcelsChange(Math.max(0, scannedParcels - 1), true)}
                    disabled={scannedParcels === 0 || updateMetaMutation.isPending}
                    className="h-10 w-10 flex-shrink-0"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 h-10 flex items-center justify-center bg-muted rounded-md border">
                    <span className="text-xl font-bold">{scannedParcels}</span>
                    <span className="text-xl text-muted-foreground mx-1">/</span>
                    <span className="text-xl font-bold">{parcelCount}</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleScannedParcelsChange(Math.min(parcelCount, scannedParcels + 1), true)}
                    disabled={scannedParcels >= parcelCount || updateMetaMutation.isPending}
                    className="h-10 w-10 flex-shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      handleScannedParcelsChange(parcelCount, true);
                      toast({
                        title: t('autoReceiveComplete'),
                        description: t('allUnitsAutoReceived', { count: parcelCount, units: unitLabel.toLowerCase() })
                      });
                    }}
                    disabled={scannedParcels >= parcelCount || updateMetaMutation.isPending}
                    className="h-10 px-3 flex-shrink-0"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    {t('receiveAll')} ({parcelCount})
                  </Button>
                </div>
              </div>

              {/* Scan Parcels */}
              <div>
                <Label className="text-sm font-medium mb-1.5 block">
                  {isPalletShipment ? t('scanPallets') : t('scanParcels')}
                </Label>
                <div className="flex items-center gap-2">
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
                    placeholder={t('scanOrTypeTracking', { unit: isPalletShipment ? t('pallet').toLowerCase() : t('parcel').toLowerCase() })}
                    className="h-10 font-mono"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <Button
                    type="button"
                    variant={scanMode ? "default" : "outline"}
                    size="icon"
                    onClick={() => {
                      setScanMode(!scanMode);
                      if (!scanMode) {
                        setTimeout(() => barcodeRef.current?.focus(), 100);
                      }
                    }}
                    className="h-10 w-10 flex-shrink-0"
                  >
                    <ScanLine className="h-4 w-4" />
                  </Button>
                </div>
                {scanMode && (
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    {t('scannerActive')}
                  </p>
                )}
              </div>

              {/* Scanned Tracking Numbers */}
              {scannedTrackingNumbers.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{t('scannedTrackingNumbers')}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setScannedTrackingNumbers([]);
                        setScannedParcels(0);
                        updateMetaMutation.mutate({ field: 'scannedParcels', value: 0 });
                        scannedTrackingNumbers.forEach(tn => {
                          updateTrackingMutation.mutate({ action: 'remove', trackingNumber: tn });
                        });
                        toast({ title: t('cleared'), description: t('allTrackingNumbersCleared') });
                      }}
                      className="h-7 text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      {t('clearAll')}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {scannedTrackingNumbers.map((trackingNumber, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {trackingNumber}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <Label className="text-sm font-medium mb-1.5 block">{t('initialNotes')}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  onBlur={handleNotesBlur}
                  placeholder={t('initialNotesPlaceholder')}
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* Continue Button */}
              <Button
                onClick={() => setCurrentStep(2)}
                disabled={!receivedBy || !carrier}
                className="w-full h-11"
                size="lg"
              >
                {t('continueToItemChecklist')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}
        </div>
      )}

      {/* Step 2: Item Checklist - Redesigned */}
      {currentStep === 2 && (
        <div className="space-y-5">
          <Card className={`
            transition-all duration-500 rounded-lg shadow-sm border bg-white dark:bg-gray-900
            ${completedItems === totalItems && totalItems > 0 
              ? 'border-green-400 shadow-green-100 dark:shadow-green-900/20' 
              : completedItems > 0 
                ? 'border-amber-400 shadow-amber-100 dark:shadow-amber-900/20'
                : 'border-gray-200 dark:border-gray-700'
            }
          `}>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <CardTitle className="flex items-center gap-3 text-lg">
                  {completedItems === totalItems && totalItems > 0 ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  ) : completedItems > 0 ? (
                    <Clock className="h-6 w-6 text-amber-600" />
                  ) : (
                    <CheckSquare className="h-6 w-6" />
                  )}
                  <span className="font-semibold">{t('itemVerification')} ({completedItems}/{totalItems})</span>
                  {completedItems === totalItems && totalItems > 0 && (
                    <Badge className="bg-green-600 text-white shadow-sm px-3 py-1">{t('complete')}</Badge>
                  )}
                  {completedItems > 0 && completedItems < totalItems && (
                    <Badge className="bg-amber-600 text-white shadow-sm px-3 py-1">{t('inProgress')}</Badge>
                  )}
                </CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => setShowAllItems(!showAllItems)}
                    className="h-10 shadow-sm"
                  >
                    {showAllItems ? t('showActive') : t('showAll')}
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => {
                      setScanMode(!scanMode);
                      if (!scanMode) {
                        setTimeout(() => barcodeRef.current?.focus(), 100);
                      }
                    }}
                    className={`h-10 shadow-sm ${scanMode ? 'bg-blue-100 border-blue-400 text-blue-700' : ''}`}
                  >
                    <ScanLine className="h-5 w-5 mr-2" />
                    {t('scanItems')}
                  </Button>
                </div>
              </div>
              
              {/* Progress Summary - Mobile Optimized */}
              {receivingItems.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2 px-1">
                  <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 px-3 py-2 rounded-lg border border-green-200 dark:border-green-800 flex-shrink-0">
                    <div className="text-lg font-bold text-green-600">
                      {receivingItems.filter(i => i.status === 'complete').length}
                    </div>
                    <div className="text-xs text-green-700 dark:text-green-400 font-medium">{t('complete')}</div>
                  </div>
                  <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800 flex-shrink-0">
                    <div className="text-lg font-bold text-amber-600">
                      {receivingItems.filter(i => i.status === 'pending').length}
                    </div>
                    <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">Pending</div>
                  </div>
                  <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 flex-shrink-0">
                    <div className="text-lg font-bold text-red-600">
                      {receivingItems.filter(i => i.status === 'damaged' || i.status === 'partial_damaged').length}
                    </div>
                    <div className="text-xs text-red-700 dark:text-red-400 font-medium">Damaged</div>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="text-lg font-bold text-gray-600 dark:text-gray-400">
                      {receivingItems.filter(i => i.status === 'missing' || i.status === 'partial_missing').length}
                    </div>
                    <div className="text-xs text-gray-700 dark:text-gray-400 font-medium">Missing</div>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
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
                      placeholder={t('scanItemBarcodePlaceholder')}
                      className="border-blue-300 transition-all duration-200"
                    />
                  </div>
                </ScanInputPulse>
              )}

              {/* Items List */}
              <div className="max-h-[700px] overflow-y-auto space-y-2 pr-1">
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
                ) : (() => {
                  const filteredItems = receivingItems.filter(item => 
                    showAllItems || item.status === 'pending' || item.receivedQty < item.expectedQty
                  );
                  
                  // Sort items: pending first, then partial, then completed
                  const sortedItems = [...filteredItems].sort((a, b) => {
                    const statusOrder = {
                      'pending': 0,
                      'partial': 1,
                      'partial_damaged': 2,
                      'partial_missing': 3,
                      'damaged': 4,
                      'missing': 5,
                      'complete': 6
                    };
                    return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
                  });
                  
                  return sortedItems;
                })()
                  .map((item) => {
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
                          rounded-lg shadow-sm transition-all duration-300 ease-in-out border
                          border-l-4 ${borderColor} ${bgColor}
                          ${isComplete ? 'opacity-75' : ''}
                          hover:shadow-md
                        `}
                      >
                        <div className="p-3 sm:p-4">
                          {/* Grid Layout: Left Column (Image) + Right Column (Details & Controls) */}
                          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-3 sm:gap-5">
                            {/* Left Column - Product Image */}
                            <div className="flex justify-center sm:justify-start">
                              <div className="relative flex-shrink-0 w-16 h-16 sm:w-24 sm:h-24">
                                <LazyImage 
                                  thumbnailSrc={item.imageUrl}
                                  alt={item.name}
                                  className="w-16 h-16 sm:w-24 sm:h-24 object-contain rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-800"
                                />
                                {/* Status Icon Overlay */}
                                <div className={`absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center transition-transform duration-200 shadow-sm ${isComplete ? 'scale-110' : ''} z-10`}>
                                  <StatusIcon className={`h-4 w-4 ${iconColor}`} />
                                </div>
                              </div>
                            </div>
                            
                            {/* Right Column - All Item Details and Controls */}
                            <div className="flex flex-col gap-2 sm:gap-3 min-w-0">
                              {/* Header Section: Name, SKU, and Status Badge */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className={`font-semibold text-sm sm:text-base leading-tight ${isComplete ? 'line-through opacity-60' : ''}`}>
                                    {item.name}
                                  </h4>
                                  {item.sku && (
                                    <p className="text-xs text-muted-foreground font-mono mt-1">
                                      SKU: {item.sku}
                                    </p>
                                  )}
                                  {/* Warehouse Locations Display */}
                                  <div className="mt-1">
                                    {item.isNewProduct ? (
                                      <p 
                                        className="text-xs text-orange-600 dark:text-orange-400 font-medium flex items-center gap-1"
                                        data-testid={`text-bin-location-${item.id}`}
                                      >
                                        <Package className="h-3 w-3" />
                                        Bin: TBA (New Product)
                                      </p>
                                    ) : item.warehouseLocations && item.warehouseLocations.length > 0 ? (
                                      <div>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 mb-1">
                                          <Package className="h-3 w-3" />
                                          Bin{item.warehouseLocations.length > 1 ? 's' : ''}:
                                        </p>
                                        <div 
                                          className="flex flex-wrap gap-1"
                                          data-testid={`text-bin-location-${item.id}`}
                                        >
                                          {item.warehouseLocations.map((location, index) => (
                                            <span
                                              key={index}
                                              className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-md font-mono"
                                            >
                                              {location}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                                
                                {/* Status Badge */}
                                <Badge 
                                  className={`text-xs whitespace-nowrap flex-shrink-0 ${getItemStatusColor(item.status)}`}
                                  variant={isComplete ? 'default' : isPending ? 'outline' : 'secondary'}
                                >
                                  {item.status === 'partial_damaged' ? 'PARTIAL DMG' : 
                                   item.status === 'partial_missing' ? 'PARTIAL MISS' : 
                                   item.status.toUpperCase()}
                                </Badge>
                              </div>
                              
                              {/* Progress Section */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] sm:text-xs text-muted-foreground">Progress</span>
                                  <span className={`text-xs sm:text-sm font-bold ${
                                    progress >= 100 ? 'text-green-600' : 
                                    progress > 0 ? 'text-amber-600' : 
                                    'text-gray-500'
                                  }`}>
                                    {item.receivedQty} / {item.expectedQty} units
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 sm:h-2 overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-300 ease-out ${
                                      progress >= 100 ? 'bg-green-500' :
                                      progress > 0 ? 'bg-amber-500' :
                                      'bg-gray-300'
                                    }`}
                                    style={{ width: `${Math.min(100, progress)}%` }}
                                  />
                                </div>
                              </div>
                              
                              {/* Controls Section - Redesigned */}
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                {/* Quantity Controls */}
                                <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-300 dark:border-gray-600 shadow-sm">
                                  <Button
                                    variant="ghost"
                                    size="default"
                                    onClick={() => updateItemQuantity(item.id, -1)}
                                    disabled={item.receivedQty === 0}
                                    className="h-8 w-8 sm:h-10 sm:w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Minus className="h-4 w-4 sm:h-5 sm:w-5" />
                                  </Button>
                                  <span className="text-base sm:text-lg font-bold font-mono w-16 sm:w-20 text-center px-1 sm:px-2">
                                    {item.receivedQty}/{item.expectedQty}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="default"
                                    onClick={() => updateItemQuantity(item.id, 1)}
                                    className="h-8 w-8 sm:h-10 sm:w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                                  </Button>
                                </div>

                                {/* Action Buttons Group */}
                                <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                                  <Button
                                    variant={item.status === 'complete' ? "default" : "outline"}
                                    size="default"
                                    onClick={() => {
                                      const updatedItems = receivingItems.map(i => 
                                        i.id === item.id 
                                          ? { ...i, receivedQty: i.expectedQty, status: 'complete' as const, checked: true }
                                          : i
                                      );
                                      setReceivingItems(updatedItems);
                                      // Update the item on server
                                      const itemToUpdate = updatedItems.find(i => i.id === item.id);
                                      if (itemToUpdate) {
                                        // Update quantity to expected
                                        const delta = itemToUpdate.expectedQty - item.receivedQty;
                                        if (delta !== 0) {
                                          updateItemQuantityMutation.mutate({ itemId: item.id, delta });
                                        }
                                        // Update status to complete
                                        updateItemFieldMutation.mutate({ itemId: item.id, field: 'status', value: 'complete' });
                                      }
                                    }}
                                    className={`h-9 sm:h-10 min-w-[70px] sm:min-w-[80px] text-xs sm:text-sm font-medium transition-colors shadow-sm ${
                                      item.status === 'complete'
                                        ? 'bg-green-600 hover:bg-green-700 border-green-600 text-white'
                                        : 'border-green-500 hover:border-green-600 hover:bg-green-50 text-green-700'
                                    }`}
                                  >
                                    <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                                    OK
                                  </Button>
                                  <Button
                                    variant={isDamaged ? "destructive" : "outline"}
                                    size="default"
                                    onClick={() => toggleItemStatus(item.id, 'damaged')}
                                    className={`h-9 sm:h-10 min-w-[70px] sm:min-w-[80px] text-xs sm:text-sm font-medium transition-colors shadow-sm ${
                                      isDamaged
                                        ? 'bg-red-600 hover:bg-red-700 border-red-600 text-white'
                                        : 'border-red-500 hover:border-red-600 hover:bg-red-50 text-red-700'
                                    }`}
                                  >
                                    <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                                    DMG
                                  </Button>
                                  <Button
                                    variant={isMissing ? "secondary" : "outline"}
                                    size="default"
                                    onClick={() => toggleItemStatus(item.id, 'missing')}
                                    className={`h-9 sm:h-10 min-w-[70px] sm:min-w-[80px] text-xs sm:text-sm font-medium transition-colors shadow-sm ${
                                      isMissing
                                        ? 'bg-gray-600 hover:bg-gray-700 border-gray-600 text-white'
                                        : 'border-gray-500 hover:border-gray-600 hover:bg-gray-50 text-gray-700'
                                    }`}
                                  >
                                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                                    MISS
                                  </Button>
                                </div>
                              </div>

                              {/* Notes Field - Show when needed */}
                              {(isDamaged || isMissing || item.notes) && (
                                <div className="transition-all duration-200">
                                  <Input
                                    value={item.notes || ''}
                                    onChange={(e) => updateItemNotes(item.id, e.target.value)}
                                    placeholder={t('addNotesAboutItemPlaceholder')}
                                    className="text-sm bg-white dark:bg-gray-800"
                                  />
                                </div>
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

          {/* Photos Upload Section - Redesigned */}
          <Card className="rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <Camera className="h-6 w-6" />
                <span className="font-semibold">Photos</span>
                <span className="text-base font-normal text-muted-foreground ml-auto">
                  {uploadedPhotos.length > 0 && `${uploadedPhotos.length} uploaded`}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Upload Button - Redesigned */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-12 gap-2 font-medium shadow-sm"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span>Add Photos</span>
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
                  Take a photo of each product in hand with good lighting
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

              {/* Photos Grid - Redesigned Horizontal Scrollable Layout */}
              {(uploadedPhotos.length > 0 || photosLoading || previewUrls.length > 0) && (
                <div className="relative">
                  <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
                    {/* Show preview URLs while processing */}
                    {previewUrls.map((preview, index) => (
                      <div
                        key={`preview-${index}`}
                        className="relative flex-shrink-0 group"
                      >
                        <div className="relative w-36 h-36 rounded-xl overflow-hidden border-2 border-blue-400 dark:border-blue-600 shadow-md animate-pulse">
                          <img
                            src={preview}
                            alt={`Processing ${index + 1}`}
                            className="w-full h-full object-cover opacity-70"
                          />
                          <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                            <Loader2 className="h-7 w-7 text-white animate-spin" />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2.5">
                            <span className="text-white text-sm font-semibold">
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
                      
                      return (
                        <div
                          key={isNewFormat ? photo.id : `photo-${index}`}
                          className="relative flex-shrink-0 group"
                        >
                          {/* Photo Container - optimized for thumbnails only */}
                          <div className="relative w-36 h-36 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md">
                            <LazyImage
                              thumbnailSrc={thumbnailSrc}
                              alt={`Upload ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {/* Overlay with photo info */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2.5 z-10">
                              <span className="text-white text-xs font-medium block">
                                Photo {index + 1}
                              </span>
                              {sizeInfo && (
                                <span className="text-white/80 text-[10px]">
                                  {sizeInfo}
                                </span>
                              )}
                            </div>
                            {/* Remove button - instant update */}
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePhoto(index);
                              }}
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
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
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center font-medium">
                    No photos uploaded yet
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-1">
                    Take a photo of each product in hand with good lighting
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
                placeholder={t('addAdditionalNotesAboutReceivingPlaceholder')}
                rows={3}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(1)}
              className="w-full sm:flex-1 h-12"
            >
              Back to Step 1
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                completeReceivingMutation.isPending || 
                receivingItems.some(item => item.status === 'pending') ||
                receivingItems.length === 0
              }
              className="w-full sm:flex-1 h-12"
              size="lg"
            >
              {completeReceivingMutation.isPending ? (
                <>Processing...</>
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
                const completionRate = stats.totalItems > 0 ? (stats.completeItems / stats.totalItems) * 100 : 0;
                const parcelProgress = parcelCount > 0 ? (scannedParcels / parcelCount) * 100 : 0;
                
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
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Items Complete</span>
                          <span className={`text-sm font-bold px-3 py-1 rounded-full shadow-sm ${
                            completionRate === 100 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200' 
                              : completionRate > 0 
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border border-amber-200'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200'
                          }`}>
                            {stats.completeItems}/{stats.totalItems}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full transition-all duration-500 ease-out ${
                              completionRate === 100 
                                ? 'bg-green-500 shadow-sm' 
                                : completionRate > 0 
                                  ? 'bg-amber-500 shadow-sm'
                                  : 'bg-gray-400'
                            }`}
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {Math.round(completionRate)}% complete
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
                    {completionRate === 100 && parcelProgress === 100 && (
                      <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                          All items and parcels received successfully!
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

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <DialogTitle className="text-xl">Receiving Complete!</DialogTitle>
                <DialogDescription className="mt-1">
                  Shipment has been successfully received
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100 mb-2 font-medium">
                What's next?
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                The items are now ready to be stored in the warehouse. You can proceed to the Storage page to assign locations to each item.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowSuccessDialog(false);
                navigate('/receiving', { replace: true });
              }}
              className="w-full sm:w-auto"
              data-testid="button-close-success"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowSuccessDialog(false);
                // Store shipment ID in sessionStorage for reliable handoff
                if (completedShipmentId) {
                  sessionStorage.setItem('autoSelectShipmentId', completedShipmentId.toString());
                }
                navigate('/storage', { replace: true });
              }}
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700"
              data-testid="button-go-to-storage"
            >
              <Warehouse className="h-4 w-4 mr-2" />
              Go to Storage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
