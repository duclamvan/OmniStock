import { useState, useEffect, useRef } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Truck
} from "lucide-react";
import { ScanFeedback } from "@/components/ScanFeedback";
import { soundEffects } from "@/utils/soundEffects";
import { format } from "date-fns";

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
}

interface ReceiptWithItems {
  receipt: any;
  shipment: any;
  items: any[];
}

export default function ItemsToStore() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  // State
  const [items, setItems] = useState<StorageItem[]>([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error' | 'duplicate' | null; message: string }>({ type: null, message: '' });
  const [locationScan, setLocationScan] = useState("");
  const [quantityScan, setQuantityScan] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [scanMode, setScanMode] = useState<'location' | 'quantity'>('location');
  const [selectedReceipt, setSelectedReceipt] = useState<number | null>(null);
  
  // Refs
  const locationInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  
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
            imageUrl: item.imageUrl || null,
            description: item.description || null
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
  
  // Filter items by selected receipt
  const filteredItems = selectedReceipt 
    ? items.filter(item => item.receiptId === selectedReceipt)
    : items;
  
  // Calculate progress
  const totalItems = filteredItems.length;
  const completedItems = filteredItems.filter(item => 
    item.assignedQuantity >= item.receivedQuantity || item.newLocations.length > 0
  ).length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  
  const currentItem = filteredItems[selectedItemIndex];
  const totalAssigned = currentItem ? 
    currentItem.newLocations.reduce((sum, loc) => sum + loc.quantity, 0) : 0;
  const remainingQuantity = currentItem ? 
    currentItem.receivedQuantity - totalAssigned : 0;
  
  // Handle location barcode scan
  const handleLocationScan = async (value: string) => {
    const trimmedValue = value.trim().toUpperCase();
    
    if (!trimmedValue) return;
    
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
        duration: 3000
      });
      setLocationScan("");
      return;
    }
    
    // Check if location already scanned for this item
    if (currentItem?.newLocations.some(loc => loc.locationCode === trimmedValue)) {
      await soundEffects.playDuplicateBeep();
      setScanFeedback({ type: 'duplicate', message: `Location already added: ${trimmedValue}` });
      setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
      setLocationScan("");
      return;
    }
    
    // Determine location type based on prefix
    let locationType: LocationAssignment['locationType'] = 'warehouse';
    if (trimmedValue.startsWith('DS')) locationType = 'display';
    else if (trimmedValue.startsWith('PL')) locationType = 'pallet';
    
    // Add new location to current item
    const newLocation: LocationAssignment = {
      id: `new-${Date.now()}`,
      locationCode: trimmedValue,
      locationType,
      quantity: 0,
      isPrimary: currentItem?.newLocations.length === 0 && currentItem?.existingLocations.length === 0,
      isNew: true
    };
    
    const updatedItems = [...items];
    const globalIndex = items.findIndex(item => 
      item.receiptItemId === currentItem?.receiptItemId && 
      item.receiptId === currentItem?.receiptId
    );
    if (globalIndex >= 0) {
      updatedItems[globalIndex].newLocations.push(newLocation);
      setItems(updatedItems);
    }
    
    // Play success sound and show feedback
    await soundEffects.playSuccessBeep();
    setScanFeedback({ type: 'success', message: `Location scanned: ${trimmedValue}` });
    setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
    
    setLocationScan("");
    
    // Auto-switch to quantity input
    setScanMode('quantity');
    setTimeout(() => quantityInputRef.current?.focus(), 100);
  };
  
  // Handle quantity update for a location
  const handleQuantityUpdate = (locationIndex: number, quantity: number) => {
    if (!currentItem || quantity < 0) return;
    
    const globalIndex = items.findIndex(item => 
      item.receiptItemId === currentItem.receiptItemId && 
      item.receiptId === currentItem.receiptId
    );
    if (globalIndex < 0) return;
    
    const updatedItems = [...items];
    const maxQuantity = currentItem.receivedQuantity - 
      currentItem.newLocations.reduce((sum, loc, idx) => 
        idx === locationIndex ? 0 : sum + loc.quantity, 0);
    
    updatedItems[globalIndex].newLocations[locationIndex].quantity = 
      Math.min(quantity, maxQuantity);
    
    // Update assigned quantity
    updatedItems[globalIndex].assignedQuantity = 
      updatedItems[globalIndex].newLocations.reduce((sum, loc) => sum + loc.quantity, 0);
    
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
    // Remove primary from all locations
    updatedItems[globalIndex].newLocations.forEach((loc, idx) => {
      loc.isPrimary = idx === locationIndex;
    });
    setItems(updatedItems);
  };
  
  // Remove a location assignment
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
    updatedItems[globalIndex].assignedQuantity = 
      updatedItems[globalIndex].newLocations.reduce((sum, loc) => sum + loc.quantity, 0);
    
    // Set first location as primary if needed
    if (updatedItems[globalIndex].newLocations.length > 0 && 
        !updatedItems[globalIndex].newLocations.some(loc => loc.isPrimary)) {
      updatedItems[globalIndex].newLocations[0].isPrimary = true;
    }
    
    setItems(updatedItems);
  };
  
  // Save storage assignments
  const saveStorageMutation = useMutation({
    mutationFn: async () => {
      // Prepare data for saving
      const storageAssignments = items
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
      
      if (storageAssignments.length === 0) {
        throw new Error("No storage assignments to save");
      }
      
      return await apiRequest(
        '/api/imports/receipts/store-items', 
        'POST', 
        { assignments: storageAssignments }
      );
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Storage assignments saved successfully",
        duration: 3000
      });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/receipts/items-to-store'] });
      navigate('/receiving');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save storage assignments",
        variant: "destructive",
        duration: 5000
      });
    }
  });
  
  const handleSave = () => {
    if (items.filter(item => item.newLocations.length > 0).length === 0) {
      toast({
        title: "No Assignments",
        description: "Please assign locations to at least one item",
        variant: "destructive",
        duration: 3000
      });
      return;
    }
    
    saveStorageMutation.mutate();
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }
  
  // No items state
  if (!storageData?.receipts || storageData.receipts.length === 0) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Items to Store</h3>
            <p className="text-muted-foreground text-center max-w-md">
              There are currently no items pending storage. Items will appear here after they have been received and are ready to be stored in warehouse locations.
            </p>
            <Button
              variant="outline"
              className="mt-6"
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
    <div className="container max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Warehouse className="h-8 w-8 text-primary" />
            Items to Store
          </h1>
          <p className="text-muted-foreground mt-1">
            Assign warehouse locations to received items from all pending receipts
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/receiving')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Receiving
          </Button>
          <Button
            onClick={handleSave}
            disabled={items.filter(item => item.newLocations.length > 0).length === 0 || saveStorageMutation.isPending}
          >
            {saveStorageMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Assignments
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <FileText className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Pending Receipts</p>
              <p className="text-2xl font-bold">{storageData.receipts.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Package className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold">{storageData.totalItems}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Hash className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Quantity</p>
              <p className="text-2xl font-bold">{storageData.totalQuantity}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-sm text-muted-foreground">Assigned</p>
              <p className="text-2xl font-bold">
                {items.filter(item => item.newLocations.length > 0).length} / {items.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Receipt Selection Tabs */}
      {storageData.receipts.length > 1 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Receipt</CardTitle>
            <CardDescription>Choose a receipt to work with its items</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {storageData.receipts.map((receiptData: ReceiptWithItems) => {
                  const receiptItems = items.filter(item => item.receiptId === receiptData.receipt.id);
                  const assignedCount = receiptItems.filter(item => item.newLocations.length > 0).length;
                  
                  return (
                    <button
                      key={receiptData.receipt.id}
                      data-testid={`receipt-card-${receiptData.receipt.id}`}
                      onClick={() => {
                        setSelectedReceipt(receiptData.receipt.id);
                        setSelectedItemIndex(0);
                      }}
                      className={`flex-shrink-0 p-4 rounded-lg border transition-all min-w-[280px] ${
                        selectedReceipt === receiptData.receipt.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="text-left space-y-2">
                        {/* Shipment Info */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Ship className="h-4 w-4 text-blue-500" />
                            <span className="font-semibold text-sm" data-testid={`shipment-tracking-${receiptData.receipt.id}`}>
                              Shipment: {receiptData.shipment?.trackingNumber || `Receipt #${receiptData.receipt.id}`}
                            </span>
                          </div>
                          {receiptData.shipment?.carrier && (
                            <div className="flex items-center gap-2 ml-6">
                              <Truck className="h-4 w-4 text-green-500" />
                              <span className="text-sm font-medium" data-testid={`shipment-carrier-${receiptData.receipt.id}`}>
                                Carrier: {receiptData.shipment.carrier}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Metadata */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {receiptItems.length} items
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(receiptData.receipt.receivedAt), "MMM d, yyyy")}
                          </span>
                        </div>
                        
                        {/* Progress */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">
                              {assignedCount}/{receiptItems.length} assigned
                            </span>
                          </div>
                          <Progress value={(assignedCount / receiptItems.length) * 100} className="h-1.5" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Item Selection and Details */}
        <Card>
          <CardHeader>
            <CardTitle>Items to Store</CardTitle>
            <CardDescription>
              {filteredItems.length} items from selected receipt
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Progress */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Storage Progress</span>
                <span className="font-medium">{completedItems} / {totalItems} items</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            
            {/* Item List */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {filteredItems.map((item, index) => {
                  const isComplete = item.assignedQuantity >= item.receivedQuantity || item.newLocations.length > 0;
                  const isSelected = index === selectedItemIndex;
                  
                  return (
                    <button
                      key={`${item.receiptId}-${item.receiptItemId}`}
                      onClick={() => setSelectedItemIndex(index)}
                      className={`w-full text-left p-4 rounded-lg border transition-all hover:shadow-md ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          {item.imageUrl ? (
                            <>
                              <img 
                                src={item.imageUrl}
                                alt={item.productName}
                                className="h-[60px] w-[60px] object-cover rounded-lg border border-border shadow-sm"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.style.display = 'none';
                                  const placeholder = e.currentTarget.parentElement?.querySelector('.placeholder-icon');
                                  if (placeholder) {
                                    (placeholder as HTMLElement).style.display = 'flex';
                                  }
                                }}
                                data-testid={`item-image-${item.receiptItemId}`}
                              />
                              <div 
                                className="placeholder-icon h-[60px] w-[60px] bg-muted rounded-lg border border-border hidden items-center justify-center"
                              >
                                <Package className="h-7 w-7 text-muted-foreground" />
                              </div>
                            </>
                          ) : (
                            <div className="h-[60px] w-[60px] bg-muted rounded-lg border border-border flex items-center justify-center">
                              <Package className="h-7 w-7 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        
                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium line-clamp-1 text-base" data-testid={`item-name-${item.receiptItemId}`}>
                                {item.productName}
                              </h4>
                              {item.description && item.description !== item.productName && (
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5" data-testid={`item-description-${item.receiptItemId}`}>
                                  {item.description}
                                </p>
                              )}
                            </div>
                            {isComplete && (
                              <Badge variant="outline" className="flex-shrink-0">
                                <Check className="h-3 w-3 mr-1" />
                                Assigned
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            {item.sku && (
                              <span className="flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                {item.sku}
                              </span>
                            )}
                            {item.barcode && (
                              <span className="flex items-center gap-1">
                                <QrCode className="h-3 w-3" />
                                {item.barcode}
                              </span>
                            )}
                            <span className="font-medium text-foreground">
                              Qty: {item.receivedQuantity}
                            </span>
                            {item.newLocations.length > 0 && (
                              <span className="text-primary font-medium flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {item.newLocations.length} location(s)
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Chevron */}
                        <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform flex-shrink-0 ${
                          isSelected ? 'rotate-90' : ''
                        }`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        
        {/* Right: Location Assignment */}
        <Card>
          <CardHeader>
            <CardTitle>Location Assignment</CardTitle>
            <CardDescription>
              {currentItem ? currentItem.productName : "Select an item to assign locations"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentItem ? (
              <div className="space-y-4">
                {/* Item Details */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Received Quantity</p>
                      <p className="text-xl font-bold">{currentItem.receivedQuantity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Remaining to Assign</p>
                      <p className="text-xl font-bold text-primary">{remainingQuantity}</p>
                    </div>
                  </div>
                  {currentItem.barcode && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-muted-foreground">Barcode</p>
                      <p className="font-mono">{currentItem.barcode}</p>
                    </div>
                  )}
                </div>
                
                {/* Existing Locations */}
                {currentItem.existingLocations.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Existing Locations</h4>
                    <div className="space-y-2">
                      {currentItem.existingLocations.map((loc, index) => (
                        <div key={loc.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono">{loc.locationCode}</span>
                          <Badge variant="secondary">{loc.quantity} units</Badge>
                          {loc.isPrimary && (
                            <Badge variant="default">
                              <Star className="h-3 w-3 mr-1" />
                              Primary
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* New Location Scanner */}
                <div>
                  <h4 className="font-semibold mb-2">Add New Location</h4>
                  <Tabs value={scanMode} onValueChange={(v) => setScanMode(v as any)}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="location">
                        <QrCode className="h-4 w-4 mr-2" />
                        Location
                      </TabsTrigger>
                      <TabsTrigger value="quantity" disabled={currentItem.newLocations.length === 0}>
                        <Hash className="h-4 w-4 mr-2" />
                        Quantity
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="location" className="space-y-4">
                      <div>
                        <Label htmlFor="location-scan">Scan Location Barcode</Label>
                        <Input
                          ref={locationInputRef}
                          id="location-scan"
                          value={locationScan}
                          onChange={(e) => setLocationScan(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleLocationScan(locationScan);
                            }
                          }}
                          placeholder="Scan or enter location code (e.g., WH1-A01-R02-L03)"
                          className="font-mono"
                          autoFocus
                        />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="quantity" className="space-y-4">
                      {currentItem.newLocations.length > 0 && (
                        <div>
                          <Label>
                            Enter quantity for: {currentItem.newLocations[currentItem.newLocations.length - 1].locationCode}
                          </Label>
                          <Input
                            ref={quantityInputRef}
                            type="number"
                            value={quantityScan}
                            onChange={(e) => setQuantityScan(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && quantityScan) {
                                const qty = parseInt(quantityScan);
                                if (!isNaN(qty) && qty > 0) {
                                  handleQuantityUpdate(currentItem.newLocations.length - 1, qty);
                                  setQuantityScan("");
                                  setScanMode('location');
                                  setTimeout(() => locationInputRef.current?.focus(), 100);
                                }
                              }
                            }}
                            placeholder="Enter quantity"
                            min="1"
                            max={remainingQuantity + (currentItem.newLocations[currentItem.newLocations.length - 1]?.quantity || 0)}
                          />
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                  
                  <ScanFeedback type={scanFeedback.type} message={scanFeedback.message} />
                </div>
                
                {/* Assigned Locations */}
                {currentItem.newLocations.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Assigned Locations</h4>
                    <div className="space-y-2">
                      {currentItem.newLocations.map((loc, index) => (
                        <div key={loc.id} className="flex items-center gap-2 p-3 border rounded-lg">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span className="font-mono font-medium">{loc.locationCode}</span>
                          <Input
                            type="number"
                            value={loc.quantity}
                            onChange={(e) => handleQuantityUpdate(index, parseInt(e.target.value) || 0)}
                            className="w-20 h-8"
                            min="0"
                            max={remainingQuantity + loc.quantity}
                          />
                          <Button
                            variant={loc.isPrimary ? "default" : "outline"}
                            size="sm"
                            onClick={() => togglePrimaryLocation(index)}
                          >
                            <Star className={`h-3 w-3 ${loc.isPrimary ? 'fill-current' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLocation(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (selectedItemIndex > 0) {
                        setSelectedItemIndex(selectedItemIndex - 1);
                        setScanMode('location');
                      }
                    }}
                    disabled={selectedItemIndex === 0}
                  >
                    Previous Item
                  </Button>
                  <Button
                    onClick={() => {
                      if (selectedItemIndex < filteredItems.length - 1) {
                        setSelectedItemIndex(selectedItemIndex + 1);
                        setScanMode('location');
                      }
                    }}
                    disabled={selectedItemIndex === filteredItems.length - 1}
                  >
                    Next Item
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Info className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Select an item from the list to start assigning warehouse locations
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}