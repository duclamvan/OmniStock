import { useState, useEffect, useRef, Fragment } from "react";
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
  ArrowRight
} from "lucide-react";
import { ScanFeedback } from "@/components/ScanFeedback";
import { soundEffects } from "@/utils/soundEffects";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { nanoid } from "nanoid";

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

// Generate suggested location for new items based on product characteristics
function generateSuggestedLocation(item: StorageItem): string {
  // Use product characteristics to generate a smart suggestion
  const seed = item.productId || item.sku || item.productName || 'default';
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Smart zone assignment based on product type hints
  let zone = 'A'; // Default zone
  const productNameLower = item.productName?.toLowerCase() || '';
  
  // Assign zones based on product type
  if (productNameLower.includes('mask') || productNameLower.includes('medical')) {
    zone = 'M'; // Medical zone
  } else if (productNameLower.includes('electronic') || productNameLower.includes('phone')) {
    zone = 'E'; // Electronics zone
  } else if (productNameLower.includes('clothing') || productNameLower.includes('shirt')) {
    zone = 'C'; // Clothing zone
  } else if (productNameLower.includes('food') || productNameLower.includes('snack')) {
    zone = 'F'; // Food zone
  } else if (productNameLower.includes('toy') || productNameLower.includes('game')) {
    zone = 'T'; // Toys zone
  } else if (productNameLower.includes('book') || productNameLower.includes('paper')) {
    zone = 'B'; // Books/Paper zone
  }
  
  // Generate aisle, rack, and level based on hash
  const aisle = String((hash % 6) + 1).padStart(2, '0');
  const rack = String((hash % 8) + 1).padStart(2, '0');
  const level = String((hash % 4) + 1).padStart(2, '0');
  
  return `WH1-${zone}${aisle}-R${rack}-L${level}`;
}

// Segmented Location Input Component
interface SegmentedLocationInputProps {
  onComplete: (code: string) => void;
  autoFocus?: boolean;
  initialCode?: string | null;
  onSegmentChange?: (segments: string[]) => void;
}

function SegmentedLocationInput({ onComplete, autoFocus, initialCode, onSegmentChange }: SegmentedLocationInputProps) {
  // Parse initial code into segments
  const parseInitialCode = (code: string | null | undefined): string[] => {
    if (!code) return ["", "", "", ""];
    const parts = code.split('-');
    return [
      parts[0] || "",
      parts[1] || "",
      parts[2] || "",
      parts[3] || ""
    ];
  };

  const [segments, setSegments] = useState<string[]>(parseInitialCode(initialCode));
  const [isManualInput, setIsManualInput] = useState(false);
  const segmentLabels = ["Warehouse", "Aisle", "Rack", "Level"];
  const segmentMaxLengths = [3, 3, 3, 3];
  const segmentPlaceholders = ["WH1", "A01", "R02", "L03"];

  // Refs for each input
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  // Track if any input is focused
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-focus first input on mount
  useEffect(() => {
    if (autoFocus) {
      inputRefs[0].current?.focus();
    }
  }, [autoFocus]);

  // Parse scanned or pasted location code
  const parseFullCode = (code: string) => {
    const cleaned = code.trim().toUpperCase();
    const parts = cleaned.split('-');

    if (parts.length === 4) {
      const newSegments = parts.slice(0, 4).map((part, i) => 
        part.substring(0, segmentMaxLengths[i])
      );
      setSegments(newSegments);
      
      // Notify parent of segment changes
      if (onSegmentChange) {
        onSegmentChange(newSegments);
      }

      // Check if complete and call onComplete
      if (newSegments.every((seg, i) => seg.length === segmentMaxLengths[i])) {
        onComplete(newSegments.join('-'));
      }
    }
  };

  // Handle input change for each segment
  const handleSegmentChange = (index: number, value: string) => {
    // Check if this looks like a full barcode scan (contains dashes)
    if (value.includes('-') && index === 0) {
      parseFullCode(value);
      return;
    }

    // Clean input - only allow alphanumeric
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const maxLen = segmentMaxLengths[index];
    const newValue = cleaned.substring(0, maxLen);

    const newSegments = [...segments];
    newSegments[index] = newValue;
    setSegments(newSegments);
    
    // Notify parent of segment changes
    if (onSegmentChange) {
      onSegmentChange(newSegments);
    }

    // Auto-advance to next field when current is filled
    if (newValue.length === maxLen && index < 3) {
      setTimeout(() => inputRefs[index + 1].current?.focus(), 50);
    }

    // Check if all segments are complete
    if (index === 3 && newValue.length === maxLen) {
      const allComplete = newSegments.every((seg, i) => seg.length === segmentMaxLengths[i]);
      if (allComplete) {
        onComplete(newSegments.join('-'));
      }
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && segments[index] === '' && index > 0) {
      // Move to previous field on backspace when empty
      e.preventDefault();
      inputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      inputRefs[index + 1].current?.focus();
    } else if (e.key === 'Enter') {
      // Check if this is the first field and has a full code
      const currentValue = e.currentTarget.value;
      if (index === 0 && currentValue.includes('-')) {
        e.preventDefault();
        parseFullCode(currentValue);
        return;
      }
      // Submit if all segments are complete
      const allComplete = segments.every((seg, i) => seg.length === segmentMaxLengths[i]);
      if (allComplete) {
        onComplete(segments.join('-'));
      }
    } else if (e.key === '-' && segments[index].length > 0 && index < 3) {
      // Dash moves to next field
      e.preventDefault();
      inputRefs[index + 1].current?.focus();
    }
  };

  // Handle paste event
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted.includes('-')) {
      e.preventDefault();
      parseFullCode(pasted);
    }
  };

  return (
    <div className="space-y-3" ref={containerRef}>
      {/* Visible segmented inputs */}
      <div className="flex items-center gap-2">
        <QrCode className="h-5 w-5 text-gray-400 flex-shrink-0" />
        <div className="flex items-center gap-1 flex-1">
          {segments.map((segment, index) => (
            <Fragment key={index}>
              <div className="flex-1">
                <input
                  ref={inputRefs[index]}
                  type="text"
                  value={segment}
                  onChange={(e) => handleSegmentChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  onFocus={(e) => {
                    e.target.select();
                  }}
                  placeholder={segmentPlaceholders[index]}
                  className="w-full px-3 py-4 text-center text-lg font-mono border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  maxLength={segmentMaxLengths[index]}
                  data-testid={`input-loc-${segmentLabels[index].toLowerCase()}`}
                />
              </div>
              {index < 3 && (
                <span className="text-gray-400 text-lg font-bold">-</span>
              )}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Labels */}
      <div className="flex items-center gap-1 pl-8">
        {segmentLabels.map((label, index) => (
          <Fragment key={label}>
            <div className="flex-1 text-center">
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            {index < 3 && (
              <span className="w-4"></span>
            )}
          </Fragment>
        ))}
      </div>

      {/* Helper text */}
      <div className="text-center text-xs text-muted-foreground">
        Scan barcode or type location code
      </div>
    </div>
  );
}

export default function ItemsToStore() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  // State
  const [items, setItems] = useState<StorageItem[]>([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error' | 'duplicate' | null; message: string }>({ type: null, message: '' });
  const [locationScan, setLocationScan] = useState("");
  const [currentSegments, setCurrentSegments] = useState<string[]>(["", "", "", ""]); // Track input segments
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

  // Refs
  const locationInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const quickScanTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all items pending storage
  const { data: storageData, isLoading } = useQuery<any>({
    queryKey: ['/api/imports/receipts/items-to-store'],
  });

  // Initialize items from receipt data
  useEffect(() => {
    if (storageData?.receipts) {
      const allItems: StorageItem[] = [];

      storageData.receipts.forEach((receiptData: ReceiptWithItems) => {
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

      setItems(allItems);

      // Auto-select first receipt if available
      if (storageData.receipts.length > 0 && !selectedReceipt) {
        setSelectedReceipt(storageData.receipts[0].receipt.id);
      }
    }
  }, [storageData, selectedReceipt]);

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
    // Use passed code, current locationScan state, or build from segments
    let trimmedValue = (codeOverride || locationScan).trim().toUpperCase();
    
    // If no direct value, try to build from current segments
    if (!trimmedValue && currentSegments.every(seg => seg.length > 0)) {
      trimmedValue = currentSegments.join('-').toUpperCase();
    }

    if (!trimmedValue) {
      toast({
        title: "No Location Entered",
        description: "Please enter or scan a location code",
        variant: "destructive",
        duration: 2000
      });
      return false;
    }

    // Validate location code format (e.g., WH1-A01-R02-L03)
    const locationPattern = /^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$/;
    if (!locationPattern.test(trimmedValue)) {
      await soundEffects.playErrorBeep();
      setScanFeedback({ type: 'error', message: 'Invalid location format' });
      setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
      toast({
        title: "Invalid Location",
        description: "Location must be in format: WH1-A01-R02-L03",
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

    // Add to session (NOT to actual item yet)
    const isFirstLocation = sessionsLocations.length === 0 && 
                           currentItem?.newLocations.length === 0 && 
                           currentItem?.existingLocations.length === 0;
    
    setSessionsLocations(prev => [...prev, {
      code: trimmedValue,
      isPrimary: isFirstLocation,
      quantity: Math.min(remainingQuantity, currentItem?.receivedQuantity || 0)
    }]);

    // Play success sound and show feedback
    await soundEffects.playSuccessBeep();
    setScanFeedback({ type: 'success', message: `Added: ${trimmedValue}` });
    setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);

    // Clear inputs for next entry
    setLocationScan("");
    setCurrentSegments(["", "", "", ""]);
    
    // Focus first input for quick next entry
    setTimeout(() => {
      const firstInput = document.querySelector('[data-segment-input="0"]') as HTMLInputElement;
      if (firstInput) firstInput.focus();
    }, 100);

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

    // Auto-advance if fully assigned
    if (totalAssigned >= currentItem.receivedQuantity) {
      setTimeout(() => {
        if (selectedItemIndex < displayItems.length - 1) {
          setSelectedItemIndex(selectedItemIndex + 1);
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
        `/api/imports/receipts/${receiptId}/store-items`,
        "POST",
        { 
          locations: [assignment] 
        }
      );
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts/items-to-store'] });
      
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
        `/api/imports/receipts/${selectedReceipt}/store-items`,
        "POST",
        { 
          locations: assignments 
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts/items-to-store'] });
      toast({
        title: "Success",
        description: "Items have been stored in warehouse locations",
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

  if (!storageData || storageData.receipts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Boxes className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-center mb-6">No items pending storage</p>
            <Button
              variant="outline"
              onClick={() => navigate('/receiving')}
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
          <button onClick={() => navigate('/receiving')} className="p-2 -ml-2">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold">Items to Store</h1>
          <button 
            onClick={handleSave}
            disabled={items.filter(item => item.newLocations.length > 0).length === 0 || saveStorageMutation.isPending}
            className="p-2 -mr-2"
          >
            {saveStorageMutation.isPending ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <Save className={`h-6 w-6 ${items.filter(item => item.newLocations.length > 0).length === 0 ? 'text-gray-300' : 'text-primary'}`} />
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

      {/* Receipt Selector - Horizontal Scroll */}
      {storageData.receipts.length > 1 && (
        <div className="bg-white border-b">
          <div className="px-4 py-3 overflow-x-auto">
            <div className="flex gap-2">
              {storageData.receipts.map((receiptData: ReceiptWithItems) => {
                const receiptItems = items.filter(item => item.receiptId === receiptData.receipt.id);
                const assignedCount = receiptItems.filter(item => item.newLocations.length > 0).length;

                return (
                  <button
                    key={receiptData.receipt.id}
                    onClick={() => {
                      setSelectedReceipt(receiptData.receipt.id);
                      setSelectedItemIndex(0);
                    }}
                    className={`flex-shrink-0 p-3 rounded-lg border transition-all min-w-[140px] ${
                      selectedReceipt === receiptData.receipt.id
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Ship className="h-4 w-4 text-blue-500" />
                      <span className="text-xs font-medium truncate">
                        {receiptData.shipment?.trackingNumber?.slice(-8) || `#${receiptData.receipt.id}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Package className="h-3 w-3" />
                      <span>{assignedCount}/{receiptItems.length}</span>
                    </div>
                    <Progress value={(assignedCount / receiptItems.length) * 100} className="h-1 mt-2" />
                  </button>
                );
              })}
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
                ? 'text-primary' 
                : 'text-muted-foreground'
            }`}
          >
            Pending ({filteredItems.filter(item => item.newLocations.length === 0 && !item.existingLocations.length).length})
            {activeTab === 'pending' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('completed');
              setSelectedItemIndex(0);
            }}
            className={`flex-1 py-3 text-sm font-medium transition-all relative ${
              activeTab === 'completed' 
                ? 'text-primary' 
                : 'text-muted-foreground'
            }`}
          >
            Completed ({filteredItems.filter(item => item.newLocations.length > 0 || item.existingLocations.length > 0).length})
            {activeTab === 'completed' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
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
                    ? 'border-primary shadow-lg' 
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
                          className="w-16 h-16 rounded-lg object-cover border"
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
                        <MapPin className="h-4 w-4 text-primary" />
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
                      <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-primary" />
                          <span className="text-2xl font-mono font-bold text-primary">
                            {getSuggestedLocation(item) || 'TBA'}
                          </span>
                          {item.existingLocations.some(loc => loc.isPrimary) && (
                            <Badge className="ml-2 bg-yellow-500 text-white">
                              <Star className="h-3 w-3 mr-1" fill="currentColor" />
                              Primary
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3 border">
                          <p className="text-xs text-muted-foreground">Received</p>
                          <p className="text-lg font-bold">{item.receivedQuantity}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border">
                          <p className="text-xs text-muted-foreground">Remaining</p>
                          <p className="text-lg font-bold text-primary">{remainingQuantity}</p>
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
                              <MapPin className="h-4 w-4 text-primary" />
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
                          className="flex-1 bg-primary text-white rounded-lg py-3 flex items-center justify-center gap-2"
                          data-testid="button-scan-location"
                        >
                          <QrCode className="h-5 w-5" />
                          <span className="font-medium">Scan Location</span>
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
            className="flex-1 bg-primary text-white rounded-lg py-3 flex items-center justify-center gap-2 font-medium"
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
          setCurrentSegments(["", "", "", ""]);
        }
      }}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          {/* Header with Item Name */}
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="text-lg">Add Storage Locations</SheetTitle>
            {currentItem && (
              <div className="mt-3 space-y-4">
                {/* Item Name Section - Mobile Optimized */}
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 sm:p-3">
                  <div className="space-y-3">
                    {/* Header Row */}
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/20 rounded-lg p-2">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Item</p>
                      </div>
                    </div>
                    
                    {/* Product Name - Mobile Friendly */}
                    <div className="space-y-2">
                      <h3 className="text-lg sm:text-base font-bold leading-tight break-words">
                        {currentItem.productName}
                      </h3>
                      
                      {/* SKU and Quantity - Stacked on Mobile */}
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        {currentItem.sku && (
                          <div className="flex items-center gap-2 bg-white/50 rounded-lg px-3 py-2">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">SKU</p>
                              <p className="font-mono text-sm font-medium">{currentItem.sku}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-2 bg-white/50 rounded-lg px-3 py-2">
                          <Boxes className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Quantity</p>
                            <p className="text-sm font-semibold">{currentItem.receivedQuantity} units</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Current/Suggested Location - Mobile Optimized */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  {getSuggestedLocation(currentItem) ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-1.5">
                          <MapPin className="h-4 w-4 text-green-600" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Current Primary Location</p>
                      </div>
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border-l-4 border-green-500">
                        <p className="font-mono text-base font-bold tracking-wide">{getSuggestedLocation(currentItem)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-orange-100 dark:bg-orange-900/30 rounded-lg p-1.5">
                          <AlertCircle className="h-4 w-4 text-orange-600" />
                        </div>
                        <p className="text-sm font-medium text-orange-600">New item - no current location</p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border-l-4 border-blue-500">
                        <div className="flex items-center gap-2 mb-1">
                          <Navigation className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-600">Suggested Location</span>
                        </div>
                        <p className="font-mono text-base font-bold tracking-wide text-blue-800 dark:text-blue-200">
                          {generateSuggestedLocation(currentItem)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {/* Mobile-Optimized Session Locations */}
            {sessionsLocations.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <p className="text-sm font-semibold text-green-800 dark:text-green-200">Added Locations</p>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {sessionsLocations.length} location{sessionsLocations.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {sessionsLocations.map((loc, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-800 border-2 rounded-xl p-4 shadow-sm">
                      {/* Location Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-2">
                            <MapPin className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-mono text-base font-bold tracking-wide">{loc.code}</p>
                            <Badge variant={loc.isPrimary ? "default" : "outline"} className="text-xs mt-1">
                              {loc.isPrimary ? "Main Location" : "Secondary"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      {/* Mobile Action Buttons */}
                      <div className="flex gap-2">
                        {!loc.isPrimary && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSessionsLocations(prev => 
                                prev.map((l, i) => ({ 
                                  ...l, 
                                  isPrimary: i === idx 
                                }))
                              );
                              soundEffects.playSuccessBeep();
                              toast({
                                title: "Primary Location Set",
                                description: `${loc.code} is now the main location`,
                              });
                            }}
                            className="flex-1 py-2"
                          >
                            <Star className="h-4 w-4 mr-1" />
                            Set as Main
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 py-2 px-4"
                          onClick={() => {
                            setSessionsLocations(prev => prev.filter((_, i) => i !== idx));
                            soundEffects.playErrorBeep();
                            toast({
                              title: "Location Removed",
                              description: `${loc.code} has been removed`,
                            });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {sessionsLocations.length > 1 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                      <p className="text-xs text-blue-800 dark:text-blue-200">
                        <strong>Tip:</strong> The location marked as "Main" will be the primary storage location for this item.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Add New Location Section */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">Add New Location</p>
              <SegmentedLocationInput 
              initialCode={currentItem ? (getSuggestedLocation(currentItem) || generateSuggestedLocation(currentItem)) : null}
              onSegmentChange={(segments) => {
                // Update current segments state for Add Location button
                setCurrentSegments(segments);
              }}
              onComplete={async (code) => {
                // Play success sound
                await soundEffects.playSuccessBeep();

                // Just add to session, don't apply yet
                addLocationToSession(code);

                // Clear input for next scan (by reinitializing the component)
                setLocationScan("");
                setCurrentSegments(["", "", "", ""]);
              }}
              autoFocus
              />
            </div>

            <ScanFeedback type={scanFeedback.type} message={scanFeedback.message} />

            {/* Mobile-Optimized Action Buttons */}
            <div className="space-y-3">
              {/* Clear Button - Full Width on Mobile */}
              <Button
                variant="outline"
                onClick={() => {
                  // Clear all fields for fresh input
                  setCurrentSegments(["", "", "", ""]);
                  setLocationScan("");
                  setScanFeedback({ type: null, message: '' });
                  
                  // Clear input values directly
                  const inputs = document.querySelectorAll('[data-segment-input]');
                  inputs.forEach((input: any) => { 
                    if (input) input.value = ''; 
                  });
                  
                  // Focus first input
                  setTimeout(() => {
                    const firstInput = document.querySelector('[data-segment-input="0"]') as HTMLInputElement;
                    if (firstInput) firstInput.focus();
                  }, 50);
                  
                  soundEffects.playSuccessBeep();
                }}
                className="w-full py-4 text-base font-medium"
                size="lg"
              >
                <X className="h-5 w-5 mr-2" />
                Clear Fields
              </Button>
              
              {/* Add Location Button - Prominent */}
              <Button
                onClick={async () => {
                  // Build location code from current segments if available
                  if (currentSegments.every(seg => seg && seg.length > 0)) {
                    const code = currentSegments.join('-');
                    await addLocationToSession(code);
                  } else if (locationScan) {
                    await addLocationToSession(locationScan);
                  } else {
                    await addLocationToSession(); // Will show error toast
                  }
                }}
                className="w-full py-6 text-lg font-bold bg-primary hover:bg-primary/90 shadow-lg"
                size="lg"
                disabled={sessionsLocations.length >= 10} // Limit to 10 locations
              >
                <div className="flex items-center justify-center gap-3">
                  <Plus className="h-6 w-6" />
                  <span>
                    Add Location
                    {sessionsLocations.length > 0 && (
                      <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-sm font-medium">
                        {sessionsLocations.length}
                      </span>
                    )}
                  </span>
                </div>
              </Button>
            </div>
            
            {/* Mobile-Optimized Final Action Buttons */}
            <div className="pt-6 border-t-2 space-y-3">
              {/* Primary Action Button */}
              <Button
                onClick={() => {
                  // Apply all session locations to the item
                  if (sessionsLocations.length > 0) {
                    applySessionLocations();
                  } else {
                    setShowScanner(false);
                  }
                }}
                variant="default"
                className="w-full py-6 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-xl"
                size="lg"
                disabled={sessionsLocations.length === 0}
              >
                {sessionsLocations.length > 0 ? (
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle2 className="h-6 w-6" />
                    <div className="text-center">
                      <div>Apply Locations</div>
                      <div className="text-sm font-normal opacity-90">
                        {sessionsLocations.length} location{sessionsLocations.length !== 1 ? 's' : ''} ready
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <X className="h-6 w-6" />
                    <span>Close Scanner</span>
                  </div>
                )}
              </Button>
              
              {/* Secondary Cancel Button */}
              <Button
                onClick={() => {
                  setSessionsLocations([]);
                  setShowScanner(false);
                }}
                variant="outline"
                className="w-full py-4 text-base border-2"
                size="lg"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel & Discard Changes
              </Button>
            </div>

            {/* Help Text */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-blue-900">How to add locations:</p>
                    <ul className="space-y-1 text-blue-800">
                      <li>• Type or scan location codes in the fields above</li>
                      <li>• Press "Add Location" to add multiple locations</li>
                      <li>• Click "Set as Main" to designate primary storage</li>
                      <li>• Examples: WH1-A01-R02-L03, DS1-F01-S01, PL1-B01</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
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
    </div>
  );
}