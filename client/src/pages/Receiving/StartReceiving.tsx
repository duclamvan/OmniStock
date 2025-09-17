
import { useState, useEffect, useRef, useCallback } from "react";
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
  Loader2
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
      const savedScannedParcels = trackingData.scannedParcels || receiptData.receivedParcels || 0;
      const savedTrackingNumbers = trackingData.numbers || [];
      setScannedParcels(savedScannedParcels);
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
        const response = await apiRequest('/api/imports/receipts/auto-save', 'POST', {
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
      const receiptId = receipt?.receipt?.id || receipt?.id;
      if (!receiptId) return;
      
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
        const response = await apiRequest('/api/imports/receipts/auto-save', 'POST', {
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
      // Check if tracking number already scanned
      if (scannedTrackingNumbers.includes(value)) {
        await soundEffects.playDuplicateBeep();
        setScanFeedback({ type: 'duplicate', message: `Already scanned: ${value}` });
        setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
        toast({
          title: "Already Scanned",
          description: `Tracking number ${value} has already been scanned`,
          variant: "destructive",
          duration: 3000
        });
        setBarcodeScan("");
        return;
      }
      
      const newCount = Math.min(scannedParcels + 1, parcelCount);
      const newTrackingNumbers = [...scannedTrackingNumbers, value];
      setScannedTrackingNumbers(newTrackingNumbers);
      setScannedParcels(newCount); // Update local state for immediate UI refresh
      
      // Play success sound and show visual feedback
      await soundEffects.playSuccessBeep();
      setScanFeedback({ type: 'success', message: `Scanned: ${value}` });
      setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
      
      // Check if all parcels are scanned
      if (newCount === parcelCount && parcelCount > 0) {
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
      
      toast({
        title: `${isPalletShipment ? 'Pallet' : 'Parcel'} Scanned`,
        description: `Scanned ${newCount} of ${parcelCount} ${unitLabel.toLowerCase()} - ${value}`,
        duration: 2000
      });
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
      return await apiRequest('/api/imports/receipts/auto-save', 'POST', data);
    },
    onSuccess: (response) => {
      // Don't invalidate cache during active editing to prevent jumping values
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
        title: "Receiving Completed",
        description: "The shipment has been successfully received and is now pending approval"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/receivable'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/by-status/receiving'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/by-status/pending_approval'] });
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
      const response = await apiRequest('/api/imports/receipts/auto-save', 'POST', {
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
        return 'bg-yellow-100 text-yellow-800';
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
              title: "Save Failed",
              description: "Failed to save photo changes. The photos have been restored.",
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
      title: "Photo Removed",
      description: "Photo deleted",
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
    <div className="container mx-auto p-4 max-w-4xl relative">
      {/* Visual Feedback Components */}
      <ScanFeedback type={scanFeedback.type} message={scanFeedback.message} />
      <ScanLineAnimation isActive={scanMode} />
      <SuccessCheckmark show={showSuccessCheckmark} />
      {/* Save Status Indicator */}
      <div className="fixed top-4 right-4 z-50">
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
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBackNavigation}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Quick Receiving</h1>
            <p className="text-sm text-muted-foreground">
              {shipment.shipmentName || `Shipment #${shipment.id}`} • {shipment.trackingNumber}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className={getStatusColor(shipment.status)}>
            {shipment.status?.replace('_', ' ').toUpperCase()}
          </Badge>
          {receipt && (
            <Link href={`/receiving/receipt/${receipt.id}`}>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                View Receipt
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Overall Progress</span>
          <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-3 bg-gray-200 dark:bg-gray-700" />
        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
          <span>{unitLabel}: {scannedParcels}/{parcelCount}</span>
          <span>Items Received: {totalReceivedQty}/{totalExpectedQty}</span>
          <span>Verified: {checkedItemsCount}/{totalItems} items</span>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={currentStep === 1 ? "default" : "outline"}
          onClick={() => setCurrentStep(1)}
          className="flex-1"
        >
          <Package className="h-4 w-4 mr-2" />
          Step 1: Parcel Check
        </Button>
        <Button
          variant={currentStep === 2 ? "default" : "outline"}
          onClick={() => setCurrentStep(2)}
          className="flex-1"
        >
          <CheckSquare className="h-4 w-4 mr-2" />
          Step 2: Item Checklist
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
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
            <CardContent className="space-y-4">
              {/* Show skeleton loading when data is loading */}
              {(receiptLoading || isLoading) ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div>
                      <Skeleton className="h-4 w-16 mb-2" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Received By *</Label>
                      <Input
                        value={receivedBy}
                        onChange={(e) => handleReceivedByChange(e.target.value)}
                        onBlur={handleReceivedByBlur}
                        placeholder="Your name"
                        required
                      />
                    </div>
                    <div>
                      <Label>Carrier *</Label>
                      <Input
                        value={carrier}
                        onChange={(e) => handleCarrierChange(e.target.value)}
                        onBlur={handleCarrierBlur}
                        placeholder="DHL, UPS, FedEx..."
                        required
                      />
                    </div>
                  </div>

                  {/* Parcel Count */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Expected {unitLabel}</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleParcelCountChange(Math.max(1, parcelCount - 1), true)}
                          disabled={parcelCount <= 1 || updateMetaMutation.isPending}
                          className={updateMetaMutation.isPending ? 'opacity-50' : ''}
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
                          size="sm"
                          onClick={() => handleParcelCountChange(parcelCount + 1, true)}
                          disabled={updateMetaMutation.isPending}
                          className={updateMetaMutation.isPending ? 'opacity-50' : ''}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label>Received {unitLabel} (Manual)</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleScannedParcelsChange(Math.max(0, scannedParcels - 1), true)}
                          disabled={scannedParcels === 0 || updateMetaMutation.isPending}
                          className={updateMetaMutation.isPending ? 'opacity-50' : ''}
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
                          size="sm"
                          onClick={() => handleScannedParcelsChange(Math.min(parcelCount, scannedParcels + 1), true)}
                          disabled={scannedParcels >= parcelCount || updateMetaMutation.isPending}
                          className={updateMetaMutation.isPending ? 'opacity-50' : ''}
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
                  size="sm"
                  onClick={() => {
                    handleScannedParcelsChange(parcelCount, true);
                    toast({
                      title: "Auto-Receive Complete",
                      description: `All ${parcelCount} ${unitLabel.toLowerCase()} have been automatically received`
                    });
                  }}
                  disabled={scannedParcels >= parcelCount || updateMetaMutation.isPending}
                  className={`w-full ${updateMetaMutation.isPending ? 'opacity-50' : ''}`}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Receive All ({parcelCount})
                </Button>
              </div>

              {/* Parcel Progress */}
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
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
                          {trackingNumber}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Scan Parcels */}
              <div className="col-span-full">
                <Label className="text-base font-medium mb-3 block">Scan {unitLabel}</Label>
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
                            className="border-0 bg-transparent focus:ring-0 focus:outline-none text-lg h-14 px-4 pr-12 placeholder:text-gray-500 dark:placeholder:text-gray-400 font-mono"
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
                            className={`h-14 px-6 rounded-none hover:bg-transparent transition-all duration-200 ${
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

                  {/* Quick Notes */}
                  <div>
                    <Label>Initial Notes</Label>
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
                    size="lg"
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
            <CardHeader>
              <div className="flex items-center justify-between mb-3">
                <CardTitle className="flex items-center gap-2">
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
                <div className="flex gap-2">
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
              
              {/* Progress Summary */}
              {receivingItems.length > 0 && (
                <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {receivingItems.filter(i => i.status === 'complete').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Complete</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">
                      {receivingItems.filter(i => i.status === 'pending').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {receivingItems.filter(i => i.status === 'damaged' || i.status === 'partial_damaged').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Damaged</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      {receivingItems.filter(i => i.status === 'missing' || i.status === 'partial_missing').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Missing</div>
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
                      placeholder="Scan item barcode here..."
                      className="border-blue-300 transition-all duration-200"
                    />
                  </div>
                </ScanInputPulse>
              )}

              {/* Items List */}
              <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
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
                          border rounded-lg transition-all duration-300 ease-in-out
                          border-l-4 ${borderColor} ${bgColor}
                          ${isComplete ? 'opacity-75' : ''}
                          hover:shadow-md
                        `}
                      >
                        <div className="p-4">
                          {/* Grid Layout: Left Column (Image) + Right Column (Details & Controls) */}
                          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4">
                            {/* Left Column - Product Image */}
                            <div className="flex justify-center sm:justify-start">
                              <div className="relative flex-shrink-0 w-20 h-20">
                                <LazyImage 
                                  thumbnailSrc={item.imageUrl}
                                  alt={item.name}
                                  className="w-20 h-20 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-lg bg-white dark:bg-gray-800"
                                />
                                {/* Status Icon Overlay */}
                                <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center transition-transform duration-200 ${isComplete ? 'scale-110' : ''} z-10`}>
                                  <StatusIcon className={`h-3 w-3 ${iconColor}`} />
                                </div>
                              </div>
                            </div>
                            
                            {/* Right Column - All Item Details and Controls */}
                            <div className="flex flex-col gap-3 min-w-0">
                              {/* Header Section: Name, SKU, and Status Badge */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className={`font-semibold text-base leading-tight ${isComplete ? 'line-through opacity-60' : ''}`}>
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
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">Progress</span>
                                  <span className={`text-sm font-bold ${
                                    progress >= 100 ? 'text-green-600' : 
                                    progress > 0 ? 'text-amber-600' : 
                                    'text-gray-500'
                                  }`}>
                                    {item.receivedQty} / {item.expectedQty} units
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
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
                              
                              {/* Controls Section */}
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                {/* Quantity Controls */}
                                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-1 border shadow-sm">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => updateItemQuantity(item.id, -1)}
                                    disabled={item.receivedQty === 0}
                                    className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span className="text-base font-bold font-mono w-16 text-center px-2">
                                    {item.receivedQty}/{item.expectedQty}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => updateItemQuantity(item.id, 1)}
                                    className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>

                                {/* Action Buttons Group */}
                                <div className="flex gap-2 flex-wrap">
                                  <Button
                                    variant={item.status === 'complete' ? "default" : "outline"}
                                    size="sm"
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
                                    className={`min-w-[70px] transition-colors shadow-sm ${
                                      item.status === 'complete'
                                        ? 'bg-green-600 hover:bg-green-700 border-green-600 text-white'
                                        : 'border-green-500 hover:border-green-600 hover:bg-green-50 text-green-700'
                                    }`}
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    OK
                                  </Button>
                                  <Button
                                    variant={isDamaged ? "destructive" : "outline"}
                                    size="sm"
                                    onClick={() => toggleItemStatus(item.id, 'damaged')}
                                    className={`min-w-[70px] transition-colors shadow-sm ${
                                      isDamaged
                                        ? 'bg-red-600 hover:bg-red-700 border-red-600 text-white'
                                        : 'border-red-500 hover:border-red-600 hover:bg-red-50 text-red-700'
                                    }`}
                                  >
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    DMG
                                  </Button>
                                  <Button
                                    variant={isMissing ? "secondary" : "outline"}
                                    size="sm"
                                    onClick={() => toggleItemStatus(item.id, 'missing')}
                                    className={`min-w-[70px] transition-colors shadow-sm ${
                                      isMissing
                                        ? 'bg-gray-600 hover:bg-gray-700 border-gray-600 text-white'
                                        : 'border-gray-500 hover:border-gray-600 hover:bg-gray-50 text-gray-700'
                                    }`}
                                  >
                                    <X className="h-3 w-3 mr-1" />
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
                                    placeholder="Add notes about this item..."
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
                      
                      return (
                        <div
                          key={isNewFormat ? photo.id : `photo-${index}`}
                          className="relative flex-shrink-0 group"
                        >
                          {/* Photo Container - optimized for thumbnails only */}
                          <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
                            <LazyImage
                              thumbnailSrc={thumbnailSrc}
                              alt={`Upload ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
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

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(1)}
              className="flex-1"
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
              className="flex-1"
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
    </div>
  );
}
