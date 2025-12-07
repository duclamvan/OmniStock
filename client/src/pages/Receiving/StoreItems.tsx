import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { useLocation, useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FileText
} from "lucide-react";
import { ScanFeedback } from "@/components/ScanFeedback";
import { soundEffects } from "@/utils/soundEffects";

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
}

export default function StoreItems() {
  const [location, navigate] = useLocation();
  const [match, params] = useRoute("/receiving/storage/:id");
  const { id } = params!;
  const { toast } = useToast();
  const { t } = useTranslation(['imports', 'warehouse', 'common']);
  
  // State
  const [items, setItems] = useState<StorageItem[]>([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error' | 'duplicate' | null; message: string }>({ type: null, message: '' });
  const [locationScan, setLocationScan] = useState("");
  const [quantityScan, setQuantityScan] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [scanMode, setScanMode] = useState<'location' | 'quantity'>('location');
  
  // Refs
  const locationInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch receipt data with items to store
  const { data: receiptData, isLoading } = useQuery<any>({
    queryKey: [`/api/imports/receipts/${id}/storage-items`],
    enabled: !!id
  });
  
  // Initialize items from receipt data
  useEffect(() => {
    if (receiptData?.items) {
      const storageItems: StorageItem[] = receiptData.items.map((item: any) => ({
        receiptItemId: item.id,
        productId: item.productId,
        productName: item.productName || item.description || `Item #${item.itemId}`,
        sku: item.sku,
        barcode: item.barcode,
        receivedQuantity: item.receivedQuantity || 0,
        assignedQuantity: 0,
        existingLocations: item.existingLocations || [],
        newLocations: []
      }));
      
      setItems(storageItems);
    }
  }, [receiptData]);
  
  // Calculate progress
  const totalItems = items.length;
  const completedItems = items.filter(item => 
    item.assignedQuantity >= item.receivedQuantity || item.newLocations.length > 0
  ).length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  
  const currentItem = items[selectedItemIndex];
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
      setScanFeedback({ type: 'error', message: t('warehouse:invalidLocationFormat') });
      setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
      toast({
        title: t('common:error'),
        description: t('warehouse:invalidLocationFormat'),
        variant: "destructive",
        duration: 3000
      });
      setLocationScan("");
      return;
    }
    
    // Check if location already scanned for this item
    if (currentItem?.newLocations.some(loc => loc.locationCode === trimmedValue)) {
      await soundEffects.playDuplicateBeep();
      setScanFeedback({ type: 'duplicate', message: `${t('warehouse:locationAlreadyAdded')}: ${trimmedValue}` });
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
    updatedItems[selectedItemIndex].newLocations.push(newLocation);
    setItems(updatedItems);
    
    // Play success sound and show feedback
    await soundEffects.playSuccessBeep();
    setScanFeedback({ type: 'success', message: `${t('warehouse:locationScanned')}: ${trimmedValue}` });
    setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
    
    setLocationScan("");
    
    // Auto-switch to quantity input
    setScanMode('quantity');
    setTimeout(() => quantityInputRef.current?.focus(), 100);
  };
  
  // Handle quantity update for a location
  const handleQuantityUpdate = (locationIndex: number, quantity: number) => {
    if (!currentItem || quantity < 0) return;
    
    const updatedItems = [...items];
    const maxQuantity = currentItem.receivedQuantity - 
      currentItem.newLocations.reduce((sum, loc, idx) => 
        idx === locationIndex ? 0 : sum + loc.quantity, 0);
    
    updatedItems[selectedItemIndex].newLocations[locationIndex].quantity = 
      Math.min(quantity, maxQuantity);
    
    // Update assigned quantity
    updatedItems[selectedItemIndex].assignedQuantity = 
      updatedItems[selectedItemIndex].newLocations.reduce((sum, loc) => sum + loc.quantity, 0);
    
    setItems(updatedItems);
  };
  
  // Toggle primary location
  const handlePrimaryToggle = (locationIndex: number) => {
    const updatedItems = [...items];
    const item = updatedItems[selectedItemIndex];
    
    // Clear all primary flags
    item.existingLocations.forEach(loc => loc.isPrimary = false);
    item.newLocations.forEach(loc => loc.isPrimary = false);
    
    // Set new primary
    item.newLocations[locationIndex].isPrimary = true;
    setItems(updatedItems);
    
    toast({
      title: t('warehouse:primaryLocationSet'),
      description: `${item.newLocations[locationIndex].locationCode} ${t('warehouse:setAsPrimaryLocation')}`,
      duration: 2000
    });
  };
  
  // Remove location
  const handleRemoveLocation = (locationIndex: number) => {
    const updatedItems = [...items];
    const item = updatedItems[selectedItemIndex];
    const removedLocation = item.newLocations[locationIndex];
    
    // If this was primary, make the first location primary
    if (removedLocation.isPrimary) {
      item.newLocations.splice(locationIndex, 1);
      if (item.newLocations.length > 0) {
        item.newLocations[0].isPrimary = true;
      } else if (item.existingLocations.length > 0) {
        item.existingLocations[0].isPrimary = true;
      }
    } else {
      item.newLocations.splice(locationIndex, 1);
    }
    
    // Update assigned quantity
    item.assignedQuantity = item.newLocations.reduce((sum, loc) => sum + loc.quantity, 0);
    setItems(updatedItems);
  };
  
  // Save locations mutation
  const saveLocationsMutation = useMutation({
    mutationFn: async () => {
      const locationsToSave = items.flatMap(item => 
        item.newLocations.filter(loc => loc.quantity > 0).map(loc => ({
          receiptItemId: item.receiptItemId,
          productId: item.productId,
          locationCode: loc.locationCode,
          locationType: loc.locationType,
          quantity: loc.quantity,
          isPrimary: loc.isPrimary,
          notes: loc.notes
        }))
      );
      
      return apiRequest('POST', `/api/imports/receipts/${id}/store-items`, {
        locations: locationsToSave
      });
    },
    onSuccess: () => {
      // Build notification with item names
      const storedItems = items.filter(item => item.newLocations.some(loc => loc.quantity > 0));
      const itemNames = storedItems.slice(0, 3).map(item => {
        const qty = item.newLocations.reduce((sum, loc) => sum + loc.quantity, 0);
        return `${qty}x ${item.productName}`;
      }).join(', ');
      const moreCount = storedItems.length > 3 ? ` +${storedItems.length - 3} more` : '';
      
      toast({
        title: t('warehouse:addedToWarehouse') || 'Added to Warehouse Inventory',
        description: `${itemNames}${moreCount}`,
        duration: 5000
      });
      
      // Navigate back to receiving list or receipt details
      navigate('/receiving');
    },
    onError: (error: any) => {
      toast({
        title: t('warehouse:storageFailed'),
        description: error.message || t('warehouse:failedToStoreItems'),
        variant: "destructive",
        duration: 3000
      });
    }
  });
  
  // Auto-advance to next item when current item is fully assigned
  useEffect(() => {
    if (currentItem && remainingQuantity === 0 && currentItem.newLocations.length > 0) {
      // Play completion sound
      soundEffects.playCompletionSound();
      
      // Auto-advance after a short delay
      setTimeout(() => {
        if (selectedItemIndex < items.length - 1) {
          setSelectedItemIndex(selectedItemIndex + 1);
          setScanMode('location');
          setTimeout(() => locationInputRef.current?.focus(), 100);
        }
      }, 1500);
    }
  }, [remainingQuantity, currentItem, selectedItemIndex, items.length]);
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-2 sm:p-4 md:p-6 overflow-x-hidden">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full sm:w-64" />
          <Skeleton className="h-4 w-full sm:w-96" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-2 sm:p-4 md:p-6 max-w-7xl overflow-x-hidden">
      <ScanFeedback type={scanFeedback.type} message={scanFeedback.message} />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/receiving/details/${id}`)} className="h-10 px-3">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t('back', { ns: 'common' })}</span>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{t('warehouse:storeItems')}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t('warehouse:assignWarehouseLocations')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs sm:text-sm">
            {receiptData?.receipt?.shipmentName || `Receipt #${id}`}
          </Badge>
          <Button 
            onClick={() => saveLocationsMutation.mutate()}
            disabled={completedItems === 0 || isSaving}
            className="gap-2 w-full sm:w-auto"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t('warehouse:saveComplete')}
          </Button>
        </div>
      </div>
      
      {/* Progress */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{t('warehouse:storageProgress')}</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}% {t('warehouse:complete')}</span>
          </div>
          <Progress value={progress} className="h-3 mb-2" />
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>{completedItems}/{totalItems} {t('warehouse:itemsStored')}</span>
            <span>•</span>
            <span>{items.reduce((sum, item) => sum + item.newLocations.length, 0)} {t('warehouse:locationsAssigned')}</span>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Item List */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {t('warehouse:itemsToStore')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.map((item, index) => {
                const isComplete = item.assignedQuantity >= item.receivedQuantity || item.newLocations.length > 0;
                const isCurrent = index === selectedItemIndex;
                
                return (
                  <div
                    key={item.receiptItemId}
                    onClick={() => {
                      setSelectedItemIndex(index);
                      setScanMode('location');
                    }}
                    className={`
                      p-3 rounded-lg border cursor-pointer transition-all
                      ${isCurrent ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' : 'border-gray-200 dark:border-gray-700'}
                      ${isComplete ? 'opacity-75' : ''}
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.productName}</div>
                        {item.sku && (
                          <div className="text-xs text-muted-foreground">{t('warehouse:sku')}: {item.sku}</div>
                        )}
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {t('warehouse:qty')}: {item.receivedQuantity}
                          </Badge>
                          {item.newLocations.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {item.newLocations.length} {item.newLocations.length > 1 ? t('warehouse:locations') : t('warehouse:location')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="ml-2">
                        {isComplete ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : isCurrent ? (
                          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-pulse" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-gray-400 dark:text-gray-300" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
        
        {/* Location Assignment */}
        <div className="lg:col-span-2">
          {currentItem ? (
            <div className="space-y-6">
              {/* Current Item Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      {currentItem.productName}
                    </span>
                    <Badge variant="outline">
                      {remainingQuantity} / {currentItem.receivedQuantity} {t('warehouse:remaining')}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Existing Locations */}
                  {currentItem.existingLocations.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">{t('warehouse:currentLocations')}</Label>
                      <div className="space-y-2">
                        {currentItem.existingLocations.map((loc, index) => (
                          <div key={loc.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <span className="font-mono text-sm">{loc.locationCode}</span>
                            <Badge variant="outline" className="text-xs">
                              {t('warehouse:qty')}: {loc.quantity}
                            </Badge>
                            {loc.isPrimary && (
                              <Badge variant="default" className="text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                {t('warehouse:primary')}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs ml-auto">
                              {loc.locationType}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Scan Location */}
                  <div className="space-y-2">
                    <Label htmlFor="location-scan">
                      {scanMode === 'location' ? t('warehouse:scanLocationBarcode') : t('warehouse:enterQuantity')}
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <QrCode className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-300" />
                        <Input
                          ref={locationInputRef}
                          id="location-scan"
                          type="text"
                          value={locationScan}
                          onChange={(e) => setLocationScan(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && locationScan) {
                              handleLocationScan(locationScan);
                            }
                          }}
                          placeholder={t('warehouse:scanLocationPlaceholder')}
                          className="pl-10"
                          autoFocus={scanMode === 'location'}
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleLocationScan(locationScan)}
                        disabled={!locationScan}
                      >
                        {t('add', { ns: 'common' })}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('warehouse:locationFormatHint')}
                    </p>
                  </div>
                  
                  {/* New Locations */}
                  {currentItem.newLocations.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">{t('warehouse:assignedLocations')}</Label>
                      <div className="space-y-2">
                        {currentItem.newLocations.map((loc, index) => (
                          <div key={loc.id} className="flex items-center gap-2 p-3 border rounded-lg">
                            <MapPin className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                            <span className="font-mono text-sm font-medium">{loc.locationCode}</span>
                            
                            <div className="flex items-center gap-1">
                              <Input
                                ref={index === currentItem.newLocations.length - 1 ? quantityInputRef : undefined}
                                type="number"
                                value={loc.quantity}
                                onChange={(e) => handleQuantityUpdate(index, parseInt(e.target.value) || 0)}
                                className="w-20 h-8 text-center"
                                min="0"
                                max={remainingQuantity + loc.quantity}
                                autoFocus={scanMode === 'quantity' && index === currentItem.newLocations.length - 1}
                              />
                            </div>
                            
                            <Button
                              variant={loc.isPrimary ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePrimaryToggle(index)}
                              className="h-8"
                            >
                              <Star className={`h-3 w-3 ${loc.isPrimary ? 'fill-current' : ''}`} />
                            </Button>
                            
                            <Badge variant="secondary" className="text-xs">
                              {loc.locationType}
                            </Badge>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveLocation(index)}
                              className="h-8 ml-auto"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Quick Actions */}
                  {remainingQuantity > 0 && currentItem.newLocations.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Assign all remaining to last location
                          const lastIndex = currentItem.newLocations.length - 1;
                          handleQuantityUpdate(lastIndex, 
                            currentItem.newLocations[lastIndex].quantity + remainingQuantity);
                        }}
                      >
                        {t('assignAllToLastLocation')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Tips */}
              <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-blue-900 dark:text-blue-100">{t('storageTips')}:</p>
                      <ul className="text-blue-800 dark:text-blue-200 space-y-1">
                        <li>• {t('tip1ScanLocationFirst')}</li>
                        <li>• {t('tip2UseDS')}</li>
                        <li>• {t('tip3UsePL')}</li>
                        <li>• {t('tip4FirstLocationPrimary')}</li>
                        <li>• {t('tip5AutoAdvance')}</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent>
                <div className="text-center space-y-2">
                  <Warehouse className="h-12 w-12 text-gray-400 dark:text-gray-300 mx-auto" />
                  <p className="text-muted-foreground">{t('noItemsToStore')}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}