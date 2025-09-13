
import { useState, useEffect, useRef, useCallback } from "react";
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
  Layers
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

interface ReceivingItem {
  id: string;
  name: string;
  sku?: string;
  expectedQty: number;
  receivedQty: number;
  status: 'pending' | 'complete' | 'partial' | 'damaged' | 'missing' | 'partial_damaged' | 'partial_missing';
  notes?: string;
  checked: boolean;
  imageUrl?: string;
}

export default function ContinueReceiving() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const barcodeRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [receivedBy, setReceivedBy] = useState("Employee #1");
  const [carrier, setCarrier] = useState("");
  const [parcelCount, setParcelCount] = useState(1);
  const [scannedParcels, setScannedParcels] = useState(0);
  const [receivingItems, setReceivingItems] = useState<ReceivingItem[]>([]);
  const [notes, setNotes] = useState("");
  const [scannedTrackingNumbers, setScannedTrackingNumbers] = useState<string[]>([]);
  
  // UI state
  const [currentStep, setCurrentStep] = useState(1);
  const [scanMode, setScanMode] = useState(false);
  const [barcodeScan, setBarcodeScan] = useState("");
  const [showAllItems, setShowAllItems] = useState(true);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  // Fetch shipment details
  const { data: shipment, isLoading } = useQuery({
    queryKey: [`/api/imports/shipments/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/imports/shipments/${id}`);
      if (!response.ok) throw new Error('Failed to fetch shipment');
      return response.json();
    },
    enabled: !!id,
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: false // Don't refetch on window focus
  });

  // Fetch existing receipt if available - always fetch fresh data
  const { data: receipt, isLoading: receiptLoading } = useQuery({
    queryKey: [`/api/imports/receipts/by-shipment/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/imports/receipts/by-shipment/${id}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!id,
    refetchOnMount: 'always', // Always refetch when component mounts to get latest data
    refetchOnWindowFocus: false, // Don't refetch on window focus
    staleTime: 0 // Consider data stale immediately
  });

  // Determine if this is a pallet shipment
  const isPalletShipment = shipment?.unitType?.toLowerCase().includes('pallet') || false;
  const unitLabel = isPalletShipment ? 'Pallets' : 'Parcels';

  // Initialize data when shipment loads
  useEffect(() => {
    if (shipment && receipt) {
      // Load existing receipt data - receipt object has structure: { receipt: {...}, items: [...] }
      const receiptData = receipt.receipt || receipt;
      setReceivedBy(receiptData.receivedBy || "Employee #1");
      setCarrier(receiptData.carrier || shipment.endCarrier || shipment.carrier || "");
      setParcelCount(receiptData.parcelCount || shipment.totalUnits || 1);
      
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
              name: shipmentItem.name || shipmentItem.productName || `Item ${index + 1}`,
              sku: shipmentItem.sku || '',
              expectedQty,
              receivedQty,
              status: calculatedStatus,
              notes: receiptItem.notes || '',
              checked: receivedQty > 0,
              imageUrl: shipmentItem.imageUrl || ''
            };
          } else {
            // No receipt data yet, use shipment defaults
            return {
              id: itemId,
              name: shipmentItem.name || shipmentItem.productName || `Item ${index + 1}`,
              sku: shipmentItem.sku || '',
              expectedQty: shipmentItem.quantity || 1,
              receivedQty: 0,
              status: 'pending' as const,
              notes: '',
              checked: false,
              imageUrl: shipmentItem.imageUrl || ''
            };
          }
        });
        setReceivingItems(items);
      }
      
      // Start on step 2 since we already have receipt data
      setCurrentStep(2);
    } else if (shipment && !receipt && !receiptLoading) {
      // Initialize from shipment if no receipt exists (only after receipt loading is complete)
      setCarrier(shipment.endCarrier || shipment.carrier || "");
      setParcelCount(shipment.totalUnits || 1);
      setScannedParcels(0); // No parcels scanned yet for new receiving
      setScannedTrackingNumbers([]); // No tracking numbers yet for new receiving
      
      if (shipment.items && shipment.items.length > 0) {
        const items = shipment.items.map((item: any, index: number) => ({
          id: item.id ? item.id.toString() : `item-${index}`, // Convert to string for UI, but store original ID
          name: item.name || item.productName || `Item ${index + 1}`,
          sku: item.sku || '',
          expectedQty: item.quantity || 1,
          receivedQty: 0,
          status: 'pending' as const,
          notes: '',
          checked: false,
          imageUrl: item.imageUrl || ''
        }));
        setReceivingItems(items);
      }
    }
  }, [shipment, receipt, receiptLoading]);

  // Auto-focus barcode input in scan mode
  useEffect(() => {
    if (scanMode && barcodeRef.current) {
      barcodeRef.current.focus();
    }
  }, [scanMode]);

  // Keep track of current state values for cleanup save
  useEffect(() => {
    if (shipment) {
      // Update the ref with current state values whenever they change
      const currentData = {
        shipmentId: shipment.id,
        consolidationId: shipment.consolidationId,
        receivedBy,
        parcelCount,
        scannedParcels,
        carrier,
        notes,
        trackingNumbers: scannedTrackingNumbers,
        items: receivingItems.map(item => ({
          itemId: parseInt(item.id) || item.id,
          expectedQuantity: item.expectedQty,
          receivedQuantity: item.receivedQty,
          status: item.status,
          notes: item.notes
        }))
      };
      lastSaveDataRef.current = currentData;
    }
  }, [shipment, receivedBy, parcelCount, scannedParcels, carrier, notes, receivingItems]);

  // Save data on component unmount to ensure changes are persisted
  useEffect(() => {
    return () => {
      // Clear ALL pending timers
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      if (buttonSaveTimerRef.current) {
        clearTimeout(buttonSaveTimerRef.current);
        buttonSaveTimerRef.current = null;
      }
      
      // Save any pending data synchronously before unmount
      if (lastSaveDataRef.current && shipment) {
        // Use navigator.sendBeacon for reliable unmount saves
        const saveUrl = '/api/imports/receipts/auto-save';
        const blob = new Blob([JSON.stringify(lastSaveDataRef.current)], {
          type: 'application/json'
        });
        navigator.sendBeacon(saveUrl, blob);
      }
    };
  }, [shipment]);

  // Handle barcode scan
  const handleBarcodeScan = (value: string) => {
    if (currentStep === 1) {
      // Step 1: Scanning parcel barcodes
      // Check if tracking number already scanned
      if (scannedTrackingNumbers.includes(value)) {
        toast({
          title: "Already Scanned",
          description: `Tracking number ${value} has already been scanned`,
          variant: "destructive"
        });
        setBarcodeScan("");
        return;
      }
      
      const newCount = Math.min(scannedParcels + 1, parcelCount);
      const newTrackingNumbers = [...scannedTrackingNumbers, value];
      setScannedTrackingNumbers(newTrackingNumbers);
      handleScannedParcelsChange(newCount, true, { trackingNumbers: newTrackingNumbers }); // Immediate save for scans with correct value
      toast({
        title: `${isPalletShipment ? 'Pallet' : 'Parcel'} Scanned`,
        description: `Scanned ${newCount} of ${parcelCount} ${unitLabel.toLowerCase()} - ${value}`
      });
    } else if (currentStep === 2) {
      // Step 2: Scanning item barcodes
      const item = receivingItems.find(item => item.sku === value);
      if (item) {
        updateItemQuantity(item.id, 1);
        toast({
          title: "Item Scanned",
          description: `${item.name} - Quantity updated`
        });
      } else {
        toast({
          title: "Item Not Found",
          description: "This SKU is not in the current shipment",
          variant: "destructive"
        });
      }
    }
    setBarcodeScan("");
  };

  // Update item quantity with functional state update to prevent rapid-click issues
  const updateItemQuantity = (itemId: string, delta: number) => {
    setReceivingItems(prevItems => {
      const updatedItems = prevItems.map(item => {
        if (item.id === itemId) {
          const newQty = Math.max(0, item.receivedQty + delta);
          let status: ReceivingItem['status'] = item.status; // Preserve existing status for damaged/missing
          
          // Only update status if it's not already set to damaged or missing
          if (item.status !== 'damaged' && item.status !== 'missing' && 
              item.status !== 'partial_damaged' && item.status !== 'partial_missing') {
            if (newQty === 0) {
              status = 'pending';
            } else if (newQty >= item.expectedQty) {
              status = 'complete'; // Complete when received >= expected
            } else if (newQty > 0 && newQty < item.expectedQty) {
              status = 'partial';
            }
          } else {
            // Handle partial damaged/missing cases
            if (item.status === 'damaged' || item.status === 'partial_damaged') {
              if (newQty > 0 && newQty < item.expectedQty) {
                status = 'partial_damaged';
              } else if (newQty === 0) {
                status = 'damaged';
              } else {
                status = 'damaged'; // Keep as damaged even if over-received
              }
            } else if (item.status === 'missing' || item.status === 'partial_missing') {
              if (newQty > 0 && newQty < item.expectedQty) {
                status = 'partial_missing';
              } else if (newQty === 0) {
                status = 'missing';
              } else {
                status = 'missing'; // Keep as missing even if over-received
              }
            }
          }
          
          return {
            ...item,
            receivedQty: newQty,
            status,
            checked: newQty > 0
          };
        }
        return item;
      });
      
      // Use debounced save for quantity changes to reduce API calls
      triggerAutoSave(updatedItems, false);
      return updatedItems;
    });
  };

  // Toggle item status
  const toggleItemStatus = (itemId: string, status: ReceivingItem['status']) => {
    const updatedItems = receivingItems.map(item => {
      if (item.id === itemId) {
        let finalStatus = status;
        let updatedItem = { ...item, checked: true };
        
        if (status === 'complete') {
          updatedItem.receivedQty = item.expectedQty;
          finalStatus = 'complete';
        } else if (status === 'damaged') {
          // If there's partial quantity received, mark as partial_damaged
          if (item.receivedQty > 0 && item.receivedQty < item.expectedQty) {
            finalStatus = 'partial_damaged';
          } else {
            finalStatus = 'damaged';
          }
        } else if (status === 'missing') {
          // If there's partial quantity received, mark as partial_missing  
          if (item.receivedQty > 0 && item.receivedQty < item.expectedQty) {
            finalStatus = 'partial_missing';
          } else {
            finalStatus = 'missing';
          }
        }
        
        updatedItem.status = finalStatus;
        return updatedItem;
      }
      return item;
    });
    
    setReceivingItems(updatedItems);
    // Use debounced save for status changes to reduce API calls
    triggerAutoSave(updatedItems, false);
  };

  // Update item notes
  const updateItemNotes = (itemId: string, notes: string) => {
    const updatedItems = receivingItems.map(item => {
      if (item.id === itemId) {
        return { ...item, notes };
      }
      return item;
    });
    
    setReceivingItems(updatedItems);
    // Debounced save for notes changes
    triggerAutoSave(updatedItems, false);
  };

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

  // Auto-save mutation for preserving progress in real-time
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

  // Use useRef to maintain stable debounce timer across renders
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const lastSaveDataRef = useRef<any>(null);
  
  
  // Immediate save function for button clicks
  const immediateAutoSave = useCallback((data: any) => {
    // Cancel any pending debounced saves
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    // Store the data for potential cleanup save
    lastSaveDataRef.current = data;
    setIsSaving(true);
    autoSaveMutation.mutate(data, {
      onSettled: () => setIsSaving(false)
    });
  }, []);
  
  // Debounced auto-save function for text inputs (saves on blur or after delay)
  const debouncedAutoSave = useCallback((data: any, immediate?: boolean) => {
    if (immediate) {
      immediateAutoSave(data);
      return;
    }
    
    // Store the data for potential cleanup save
    lastSaveDataRef.current = data;
    
    // Clear any existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    // Set new timer for 3 seconds for text inputs (increased from 2)
    autoSaveTimerRef.current = setTimeout(() => {
      lastSaveTimeRef.current = Date.now();
      setIsSaving(true);
      autoSaveMutation.mutate(data, {
        onSettled: () => setIsSaving(false)
      });
      autoSaveTimerRef.current = null;
    }, 3000); // Save after 3 seconds of inactivity for text inputs
  }, [immediateAutoSave]);

  // Auto-save current progress with different strategies
  const triggerAutoSave = useCallback((updatedItems?: any[], immediate?: boolean, overrides?: { scannedParcels?: number, parcelCount?: number, trackingNumbers?: string[] }) => {
    if (!shipment) return;
    
    // Use provided items or fall back to state items
    const itemsToSave = updatedItems || receivingItems;
    
    // Use overridden values if provided, otherwise fall back to state values
    const progressData = {
      shipmentId: shipment.id,
      consolidationId: shipment.consolidationId,
      receivedBy,
      parcelCount: overrides?.parcelCount ?? parcelCount,
      scannedParcels: overrides?.scannedParcels ?? scannedParcels, // Use override or state value
      carrier,
      notes,
      trackingNumbers: overrides?.trackingNumbers ?? scannedTrackingNumbers, // Include tracking numbers
      items: itemsToSave.map(item => ({
        itemId: parseInt(item.id) || item.id, // Convert string ID back to integer for API
        expectedQuantity: item.expectedQty,
        receivedQuantity: item.receivedQty,
        status: item.status,
        notes: item.notes
      }))
    };
    
    // Always store the latest data for cleanup save
    lastSaveDataRef.current = progressData;
    
    debouncedAutoSave(progressData, immediate);
  }, [shipment, receivedBy, parcelCount, scannedParcels, carrier, notes, receivingItems, scannedTrackingNumbers, debouncedAutoSave]);

  // Text input handlers - save on blur
  const handleReceivedByChange = (value: string) => {
    setReceivedBy(value);
    // Don't trigger auto-save here, wait for blur
  };
  
  const handleReceivedByBlur = () => {
    triggerAutoSave(undefined, false); // Use debounced save
  };

  const handleCarrierChange = (value: string) => {
    setCarrier(value);
    // Don't trigger auto-save here, wait for blur
  };
  
  const handleCarrierBlur = () => {
    triggerAutoSave(undefined, false); // Use debounced save
  };

  // Ref to track button save timer
  const buttonSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Number input handlers - batch saves for rapid button clicks
  const handleParcelCountChange = (value: number, isButton?: boolean) => {
    setParcelCount(value);
    if (isButton) {
      // Clear any existing button save timer
      if (buttonSaveTimerRef.current) {
        clearTimeout(buttonSaveTimerRef.current);
      }
      // Set a short delay to batch rapid clicks (300ms)
      // Pass the new value directly to avoid closure issues
      buttonSaveTimerRef.current = setTimeout(() => {
        triggerAutoSave(undefined, true, { parcelCount: value });
        buttonSaveTimerRef.current = null;
      }, 300);
    }
  };
  
  const handleParcelCountBlur = () => {
    // Clear button timer if exists
    if (buttonSaveTimerRef.current) {
      clearTimeout(buttonSaveTimerRef.current);
      buttonSaveTimerRef.current = null;
    }
    triggerAutoSave(undefined, false); // Save on blur for manual input
  };

  const handleScannedParcelsChange = (value: number, isButton?: boolean, options?: { trackingNumbers?: string[] }) => {
    setScannedParcels(value);
    if (isButton) {
      // Clear any existing button save timer
      if (buttonSaveTimerRef.current) {
        clearTimeout(buttonSaveTimerRef.current);
      }
      // Set a short delay to batch rapid clicks (300ms)
      // Pass the new value directly to avoid closure issues
      buttonSaveTimerRef.current = setTimeout(() => {
        triggerAutoSave(undefined, true, { scannedParcels: value, trackingNumbers: options?.trackingNumbers });
        buttonSaveTimerRef.current = null;
      }, 300);
    }
  };
  
  const handleScannedParcelsBlur = () => {
    // Clear button timer if exists
    if (buttonSaveTimerRef.current) {
      clearTimeout(buttonSaveTimerRef.current);
      buttonSaveTimerRef.current = null;
    }
    triggerAutoSave(undefined, false); // Save on blur for manual input
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    // Don't trigger auto-save here, wait for blur
  };
  
  const handleNotesBlur = () => {
    triggerAutoSave(undefined, false); // Use debounced save
  };

  const handleSubmit = async () => {
    // First make sure all data is saved
    await triggerAutoSave(undefined, true);
    
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
  
  // For display purposes
  const completedItems = receivingItems.filter(item => 
    item.status === 'complete' || 
    item.receivedQty >= item.expectedQty ||
    (item.receivedQty > 0 && (item.status === 'damaged' || item.status === 'partial_damaged' || 
     item.status === 'missing' || item.status === 'partial_missing'))
  ).length;

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
            <Link href="/receiving">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Receiving
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/receiving">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Continue Receiving</h1>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isPalletShipment ? <Layers className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                {unitLabel} Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                      disabled={scannedParcels === 0}
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
                      disabled={scannedParcels >= parcelCount}
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
                  disabled={scannedParcels >= parcelCount}
                  className="w-full"
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
                          setScannedTrackingNumbers([]);
                          setScannedParcels(0);
                          triggerAutoSave(undefined, true, { scannedParcels: 0, trackingNumbers: [] });
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
              <div>
                <Label>Scan {unitLabel}</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      ref={barcodeRef}
                      value={barcodeScan}
                      onChange={(e) => setBarcodeScan(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && barcodeScan) {
                          handleBarcodeScan(barcodeScan);
                        }
                      }}
                      placeholder={`Scan or type ${isPalletShipment ? 'pallet' : 'parcel'} tracking number`}
                      className={scanMode ? 'border-blue-500 ring-2 ring-blue-200' : ''}
                    />
                    <ScanLine className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setScanMode(!scanMode);
                      if (!scanMode) {
                        setTimeout(() => barcodeRef.current?.focus(), 100);
                      }
                    }}
                    className={scanMode ? 'bg-blue-50 border-blue-300' : ''}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Item Checklist */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-3">
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  Item Verification ({completedItems}/{totalItems})
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
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
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
                    className="border-blue-300"
                  />
                </div>
              )}

              {/* Items List */}
              <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
                {(() => {
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
                              <div className="relative flex-shrink-0">
                                {item.imageUrl ? (
                                  <img 
                                    src={item.imageUrl} 
                                    alt={item.name}
                                    className="w-20 h-20 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-lg bg-white dark:bg-gray-800"
                                    onError={(e) => {
                                      // Fallback to placeholder if image fails to load
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                ) : null}
                                <div className={`${item.imageUrl ? 'hidden' : ''} w-20 h-20 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 shadow-lg flex items-center justify-center`}>
                                  <Package2 className="h-8 w-8 text-gray-400" />
                                </div>
                                {/* Status Icon Overlay */}
                                <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center transition-transform duration-200 ${isComplete ? 'scale-110' : ''}`}>
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
                                      triggerAutoSave(updatedItems);
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
                onChange={(e) => setNotes(e.target.value)}
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
                return (
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-2">
                    <h4 className="font-semibold text-sm">Receiving Summary:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Total Items:</div>
                      <div className="font-medium">{stats.totalItems}</div>
                      
                      <div>Complete:</div>
                      <div className="font-medium text-green-600">{stats.completeItems}</div>
                      
                      {stats.damagedItems > 0 && (
                        <>
                          <div>Damaged:</div>
                          <div className="font-medium text-red-600">{stats.damagedItems}</div>
                        </>
                      )}
                      
                      {stats.missingItems > 0 && (
                        <>
                          <div>Missing:</div>
                          <div className="font-medium text-gray-600">{stats.missingItems}</div>
                        </>
                      )}
                      
                      {stats.partialItems > 0 && (
                        <>
                          <div>Partial:</div>
                          <div className="font-medium text-yellow-600">{stats.partialItems}</div>
                        </>
                      )}
                      
                      <div>Scanned {isPalletShipment ? 'Pallets' : 'Parcels'}:</div>
                      <div className="font-medium">{scannedParcels}/{parcelCount}</div>
                    </div>
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
