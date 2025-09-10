
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
  X
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
  
  // UI state
  const [currentStep, setCurrentStep] = useState(1);
  const [scanMode, setScanMode] = useState(false);
  const [barcodeScan, setBarcodeScan] = useState("");
  const [showAllItems, setShowAllItems] = useState(true);

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

  // Initialize data when shipment loads
  useEffect(() => {
    if (shipment && receipt) {
      // Load existing receipt data - receipt object has structure: { receipt: {...}, items: [...] }
      const receiptData = receipt.receipt || receipt;
      setReceivedBy(receiptData.receivedBy || "Employee #1");
      setCarrier(receiptData.carrier || shipment.endCarrier || shipment.carrier || "");
      setParcelCount(receiptData.parcelCount || shipment.totalUnits || 1);
      
      // Load scanned parcels from tracking numbers JSON if available
      const trackingData = receiptData.trackingNumbers || {};
      const savedScannedParcels = trackingData.scannedParcels || receiptData.receivedParcels || 0;
      setScannedParcels(savedScannedParcels);
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
            return {
              id: itemId,
              name: shipmentItem.name || shipmentItem.productName || `Item ${index + 1}`,
              sku: shipmentItem.sku || '',
              expectedQty: receiptItem.expectedQuantity || shipmentItem.quantity || 1,
              receivedQty: receiptItem.receivedQuantity || 0,
              status: receiptItem.status || 'pending',
              notes: receiptItem.notes || '',
              checked: (receiptItem.receivedQuantity || 0) > 0
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
              checked: false
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
      
      if (shipment.items && shipment.items.length > 0) {
        const items = shipment.items.map((item: any, index: number) => ({
          id: item.id ? item.id.toString() : `item-${index}`, // Convert to string for UI, but store original ID
          name: item.name || item.productName || `Item ${index + 1}`,
          sku: item.sku || '',
          expectedQty: item.quantity || 1,
          receivedQty: 0,
          status: 'pending' as const,
          notes: '',
          checked: false
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

  // Handle barcode scan
  const handleBarcodeScan = (value: string) => {
    if (currentStep === 1) {
      // Step 1: Scanning parcel barcodes
      const newCount = Math.min(scannedParcels + 1, parcelCount);
      handleScannedParcelsChange(newCount);
      toast({
        title: "Parcel Scanned",
        description: `Scanned ${newCount} of ${parcelCount} parcels`
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
      
      // Trigger auto-save with updated items immediately
      triggerAutoSave(updatedItems);
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
    // Trigger auto-save with updated items immediately
    triggerAutoSave(updatedItems);
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
    // Trigger auto-save with updated items immediately
    triggerAutoSave(updatedItems);
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

  // Use useRef to maintain stable debounce timer across renders
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debounced auto-save function with stable reference
  const debouncedAutoSave = useCallback((data: any) => {
    // Clear any existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    // Set new timer for 1.5 seconds
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveMutation.mutate(data);
      autoSaveTimerRef.current = null;
    }, 1500); // Save after 1.5 seconds of inactivity to reduce API calls
  }, []);

  // Auto-save current progress - direct call to debounced save
  const triggerAutoSave = useCallback((updatedItems?: any[]) => {
    if (!shipment) return;
    
    // Use provided items or fall back to state items
    const itemsToSave = updatedItems || receivingItems;
    
    const progressData = {
      shipmentId: shipment.id,
      consolidationId: shipment.consolidationId,
      receivedBy,
      parcelCount,
      scannedParcels, // This will be saved in trackingNumbers JSON on backend
      carrier,
      notes,
      items: itemsToSave.map(item => ({
        itemId: parseInt(item.id) || item.id, // Convert string ID back to integer for API
        expectedQuantity: item.expectedQty,
        receivedQuantity: item.receivedQty,
        status: item.status,
        notes: item.notes
      }))
    };
    
    debouncedAutoSave(progressData);
  }, [shipment, receivedBy, parcelCount, scannedParcels, carrier, notes, receivingItems, debouncedAutoSave]);

  // Auto-save wrapper functions for form inputs - trigger immediately
  const handleReceivedByChange = (value: string) => {
    setReceivedBy(value);
    triggerAutoSave();
  };

  const handleCarrierChange = (value: string) => {
    setCarrier(value);
    triggerAutoSave();
  };

  const handleParcelCountChange = (value: number) => {
    setParcelCount(value);
    triggerAutoSave();
  };

  const handleScannedParcelsChange = (value: number) => {
    setScannedParcels(value);
    triggerAutoSave();
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    triggerAutoSave();
  };

  const handleSubmit = async () => {
    if (!receivedBy || !carrier) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (receipt) {
      // Update existing receipt
      updateReceiptMutation.mutate({
        receivedBy,
        carrier,
        parcelCount,
        notes,
        items: receivingItems.map(item => ({
          itemId: item.id,
          expectedQuantity: item.expectedQty,
          receivedQuantity: item.receivedQty,
          status: item.status,
          notes: item.notes
        }))
      });
    } else {
      // Create new receipt
      try {
        // Update shipment status to 'receiving'
        await fetch(`/api/imports/shipments/${id}/start-receiving`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        // Create receipt with item details
        createReceiptMutation.mutate({
          shipmentId: parseInt(id!),
          consolidationId: shipment?.consolidationId || null,
          receivedBy,
          parcelCount,
          carrier,
          notes,
          items: receivingItems.map(item => ({
            itemId: item.id,
            expectedQuantity: item.expectedQty,
            receivedQuantity: item.receivedQty,
            status: item.status,
            notes: item.notes
          }))
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to start receiving process",
          variant: "destructive"
        });
      }
    }
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
          <span>Parcels: {scannedParcels}/{parcelCount}</span>
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
                <Package className="h-5 w-5" />
                Parcel Verification
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
                    placeholder="Your name"
                    required
                  />
                </div>
                <div>
                  <Label>Carrier *</Label>
                  <Input
                    value={carrier}
                    onChange={(e) => handleCarrierChange(e.target.value)}
                    placeholder="DHL, UPS, FedEx..."
                    required
                  />
                </div>
              </div>

              {/* Parcel Count */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <Label>Expected Parcels</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleParcelCountChange(Math.max(1, parcelCount - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={parcelCount}
                      onChange={(e) => handleParcelCountChange(Math.max(1, parseInt(e.target.value) || 1))}
                      className="text-center"
                      min="1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleParcelCountChange(parcelCount + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Received Parcels (Manual)</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleScannedParcelsChange(Math.max(0, scannedParcels - 1))}
                      disabled={scannedParcels === 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={scannedParcels}
                      onChange={(e) => handleScannedParcelsChange(Math.max(0, Math.min(parcelCount, parseInt(e.target.value) || 0)))}
                      className="text-center"
                      min="0"
                      max={parcelCount}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleScannedParcelsChange(Math.min(parcelCount, scannedParcels + 1))}
                      disabled={scannedParcels >= parcelCount}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Scan Parcels</Label>
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
                        placeholder="Scan or type barcode"
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
              </div>

              {/* Parcel Progress */}
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Parcels Scanned</span>
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
                    <span className="text-sm">All parcels verified!</span>
                  </div>
                )}
              </div>

              {/* Quick Notes */}
              <div>
                <Label>Initial Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
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
              <div className="flex items-center justify-between">
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
              <div className="max-h-96 overflow-y-auto space-y-2">
                {(() => {
                  const filteredItems = receivingItems.filter(item => 
                    showAllItems || item.status === 'pending' || item.receivedQty < item.expectedQty
                  );
                  return filteredItems;
                })()
                  .map((item) => (
                    <div key={item.id} className="border rounded-lg p-3 bg-white dark:bg-gray-900">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{item.name}</h4>
                            <Badge className={`text-xs ${getItemStatusColor(item.status)}`}>
                              {item.status === 'partial_damaged' ? 'PARTIAL DAMAGED' : 
                               item.status === 'partial_missing' ? 'PARTIAL MISSING' : 
                               item.status.toUpperCase()}
                            </Badge>
                          </div>
                          {item.sku && (
                            <p className="text-xs text-muted-foreground font-mono">
                              SKU: {item.sku}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateItemQuantity(item.id, -1)}
                            disabled={item.receivedQty === 0}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-mono w-16 text-center">
                            {item.receivedQty}/{item.expectedQty}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateItemQuantity(item.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          <Button
                            variant={item.status === 'complete' ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              const updatedItems = receivingItems.map(i => 
                                i.id === item.id 
                                  ? { ...i, receivedQty: i.expectedQty, status: 'complete', checked: true }
                                  : i
                              );
                              setReceivingItems(updatedItems);
                              triggerAutoSave(updatedItems);
                            }}
                            className={`min-w-[60px] ${
                              item.status === 'complete'
                                ? 'bg-green-600 hover:bg-green-700 border-green-600 text-white'
                                : 'border-green-200 hover:border-green-300 hover:bg-green-50 text-green-700'
                            }`}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            OK
                          </Button>
                          <Button
                            variant={item.status === 'damaged' || item.status === 'partial_damaged' ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => toggleItemStatus(item.id, 'damaged')}
                            className={`min-w-[60px] ${
                              item.status === 'damaged' || item.status === 'partial_damaged'
                                ? 'bg-red-600 hover:bg-red-700 border-red-600 text-white'
                                : 'border-red-200 hover:border-red-300 hover:bg-red-50 text-red-700'
                            }`}
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            DMG
                          </Button>
                          <Button
                            variant={item.status === 'missing' || item.status === 'partial_missing' ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => toggleItemStatus(item.id, 'missing')}
                            className={`min-w-[60px] ${
                              item.status === 'missing' || item.status === 'partial_missing'
                                ? 'bg-gray-600 hover:bg-gray-700 border-gray-600 text-white'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <X className="h-3 w-3 mr-1" />
                            MISS
                          </Button>
                        </div>
                      </div>

                      {(item.status === 'damaged' || item.status === 'missing' || item.status === 'partial_damaged' || item.status === 'partial_missing' || item.notes) && (
                        <div className="mt-2">
                          <Input
                            value={item.notes || ''}
                            onChange={(e) => updateItemNotes(item.id, e.target.value)}
                            placeholder="Add notes..."
                            className="text-sm"
                          />
                        </div>
                      )}
                    </div>
                  ))}
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
              disabled={updateReceiptMutation.isPending || createReceiptMutation.isPending}
              className="flex-1"
              size="lg"
            >
              {updateReceiptMutation.isPending || createReceiptMutation.isPending ? (
                <>Processing...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Complete Receiving
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
