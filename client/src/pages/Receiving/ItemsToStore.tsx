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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  Eye
} from "lucide-react";
import { ScanFeedback } from "@/components/ScanFeedback";
import { soundEffects } from "@/utils/soundEffects";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

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
  const [selectedReceipt, setSelectedReceipt] = useState<number | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  
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
            imageUrl: item.imageUrl,
            description: item.description
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
  
  // Handle location barcode scan
  const handleLocationScan = async () => {
    const trimmedValue = locationScan.trim().toUpperCase();
    
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
      quantity: remainingQuantity, // Auto-fill with remaining quantity
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
    setShowScanner(false);
    
    // Auto-advance to next item if quantity is fully assigned
    if (remainingQuantity <= newLocation.quantity) {
      setTimeout(() => {
        if (selectedItemIndex < displayItems.length - 1) {
          setSelectedItemIndex(selectedItemIndex + 1);
        }
      }, 500);
    }
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
      
      return apiRequest(
        "/api/imports/receipts/store-items",
        "POST",
        { 
          receiptId: selectedReceipt, 
          assignments 
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
                        {item.sku && (
                          <span className="text-xs text-muted-foreground">
                            SKU: {item.sku}
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          Qty: {item.receivedQuantity}
                        </Badge>
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
                        >
                          <QrCode className="h-5 w-5" />
                          <span className="font-medium">Scan Location</span>
                        </button>
                        <button
                          onClick={() => setShowDetails(true)}
                          className="p-3 bg-white border rounded-lg"
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
      
      {/* Scanner Sheet */}
      <Sheet open={showScanner} onOpenChange={setShowScanner}>
        <SheetContent side="bottom" className="h-[50vh]">
          <SheetHeader>
            <SheetTitle>Scan Location</SheetTitle>
            <SheetDescription>
              Scan or enter the warehouse location code
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {/* Visual Segmented Input */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Location Code</Label>
              <div className="relative">
                <Input
                  ref={locationInputRef}
                  value={locationScan}
                  onChange={(e) => setLocationScan(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleLocationScan();
                    }
                  }}
                  placeholder="WH1-A01-R02-L03"
                  className="text-lg font-mono py-6 pl-12 tracking-wider"
                  style={{
                    letterSpacing: '0.1em',
                    backgroundImage: `repeating-linear-gradient(
                      90deg,
                      transparent,
                      transparent 3.5ch,
                      #e5e7eb 3.5ch,
                      #e5e7eb 3.8ch,
                      transparent 3.8ch,
                      transparent 7.5ch,
                      #e5e7eb 7.5ch,
                      #e5e7eb 7.8ch,
                      transparent 7.8ch,
                      transparent 11.5ch,
                      #e5e7eb 11.5ch,
                      #e5e7eb 11.8ch,
                      transparent 11.8ch
                    )`,
                    backgroundPosition: '3.2rem 0',
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat'
                  }}
                  autoFocus
                />
                <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
              
              {/* Visual Segments Guide */}
              <div className="flex items-center gap-1 pl-12">
                <div className="flex items-center">
                  <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">WH1</span>
                  <span className="text-xs text-gray-400 mx-1">-</span>
                  <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">A01</span>
                  <span className="text-xs text-gray-400 mx-1">-</span>
                  <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">R02</span>
                  <span className="text-xs text-gray-400 mx-1">-</span>
                  <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">L03</span>
                </div>
              </div>
              
              {/* Segment Labels */}
              <div className="flex items-center gap-1 pl-12 text-xs">
                <span className="text-muted-foreground">Warehouse</span>
                <span className="text-gray-300 mx-1">•</span>
                <span className="text-muted-foreground">Aisle</span>
                <span className="text-gray-300 mx-1">•</span>
                <span className="text-muted-foreground">Rack</span>
                <span className="text-gray-300 mx-1">•</span>
                <span className="text-muted-foreground">Level</span>
              </div>
            </div>
            
            <ScanFeedback type={scanFeedback.type} message={scanFeedback.message} />
            
            <Button
              onClick={handleLocationScan}
              className="w-full py-6 text-lg"
              size="lg"
            >
              Add Location
            </Button>
            
            {/* Example locations */}
            <div className="text-center text-sm text-muted-foreground">
              Examples: WH1-A01-R02-L03, DS1-F01-S01, PL1-B01
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Item Details Sheet */}
      <Sheet open={showDetails} onOpenChange={setShowDetails}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle>Item Details</SheetTitle>
          </SheetHeader>
          {currentItem && (
            <div className="mt-6 space-y-4">
              {/* Product Image */}
              {currentItem.imageUrl && (
                <img 
                  src={currentItem.imageUrl} 
                  alt={currentItem.productName}
                  className="w-full h-48 object-cover rounded-lg"
                />
              )}
              
              {/* Product Info */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Product Name</p>
                  <p className="font-medium">{currentItem.productName}</p>
                </div>
                
                {currentItem.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm">{currentItem.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  {currentItem.sku && (
                    <div>
                      <p className="text-sm text-muted-foreground">SKU</p>
                      <p className="font-mono">{currentItem.sku}</p>
                    </div>
                  )}
                  
                  {currentItem.barcode && (
                    <div>
                      <p className="text-sm text-muted-foreground">Barcode</p>
                      <p className="font-mono text-sm">{currentItem.barcode}</p>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Tracking #</p>
                    <p className="font-mono text-sm">{currentItem.shipmentTrackingNumber}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Received</p>
                    <p className="text-sm">{format(new Date(currentItem.receivedAt || ''), "MMM d, yyyy")}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Quantity</p>
                  <div className="flex items-center gap-4 mt-1">
                    <Badge variant="outline">Received: {currentItem.receivedQuantity}</Badge>
                    <Badge variant="default">Assigned: {totalAssigned}</Badge>
                    <Badge variant="secondary">Remaining: {remainingQuantity}</Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}