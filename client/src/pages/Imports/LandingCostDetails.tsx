import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { MathInput } from "@/components/ui/math-input";
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  Calendar,
  MapPin,
  Hash,
  Box,
  DollarSign,
  Save,
  TrendingUp,
  AlertCircle,
  PackagePlus,
  CheckCircle,
  Loader2,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import CostsPanel from "@/components/receiving/CostsPanel";
import { convertCurrency, formatCurrency } from "@/lib/currencyUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface Shipment {
  id: number;
  consolidationId: number | null;
  carrier: string;
  trackingNumber: string;
  shipmentName?: string;
  shipmentType?: string;
  origin: string;
  destination: string;
  status: string;
  shippingCost: string;
  shippingCostCurrency?: string;
  estimatedDelivery: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: any[];
  itemCount: number;
  totalWeight?: number;
  totalUnits?: number;
  unitType?: string;
  notes?: string;
}

interface LandingCostItem {
  purchaseItemId: number;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  landingCostPerUnit: number;
  totalAllocated: number;
  freightAllocated: number;
  dutyAllocated: number;
  brokerageAllocated: number;
  insuranceAllocated: number;
  packagingAllocated: number;
  otherAllocated: number;
}

interface LandingCostPreview {
  shipmentId: number;
  items: LandingCostItem[];
  baseCurrency: string;
  totalCosts: {
    freight: number;
    duty: number;
    brokerage: number;
    insurance: number;
    packaging: number;
    other: number;
    total: number;
  };
}

interface Product {
  id: number;
  sku: string;
  name: string;
  price: string;
  priceCzk: string | null;
  priceEur: string | null;
  purchasePrice: string;
  quantity: string;
}

interface PriceUpdate {
  productId: number;
  sku: string;
  priceEUR: number;
  priceCZK: number;
  hasChanged: boolean;
}

export default function LandingCostDetails() {
  const { t } = useTranslation('imports');
  const { id } = useParams();
  const { toast } = useToast();
  const [priceUpdates, setPriceUpdates] = useState<Record<string, PriceUpdate>>({});
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());

  // Fetch shipment details
  const { data: shipment, isLoading } = useQuery<Shipment>({
    queryKey: [`/api/imports/shipments/${id}`],
    enabled: !!id
  });

  // Fetch landing cost preview
  const { data: landingCostPreview, isLoading: isLoadingPreview, refetch: refetchPreview } = useQuery<LandingCostPreview>({
    queryKey: [`/api/imports/shipments/${id}/landing-cost-preview`],
    enabled: !!id
  });

  // Fetch all products to auto-fill prices
  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled: !!id
  });

  // Create a map of SKU -> Product for quick lookup
  const productsBySKU = useMemo(() => {
    if (!products) return {};
    return products.reduce((acc, product) => {
      acc[product.sku] = product;
      return acc;
    }, {} as Record<string, Product>);
  }, [products]);

  // Initialize price updates when products load
  useEffect(() => {
    if (landingCostPreview && products && Object.keys(priceUpdates).length === 0) {
      const initialUpdates: Record<string, PriceUpdate> = {};
      landingCostPreview.items.forEach(item => {
        const product = productsBySKU[item.sku];
        if (product) {
          const priceEUR = parseFloat(product.priceEur || product.price || '0');
          const priceCZK = parseFloat(product.priceCzk || '0') || convertCurrency(priceEUR, 'EUR', 'CZK');
          initialUpdates[item.sku] = {
            productId: product.id,
            sku: item.sku,
            priceEUR,
            priceCZK,
            hasChanged: false
          };
        }
      });
      if (Object.keys(initialUpdates).length > 0) {
        setPriceUpdates(initialUpdates);
      }
    }
  }, [landingCostPreview, products, productsBySKU]);

  // Save single product price mutation
  const savePriceMutation = useMutation({
    mutationFn: async (update: PriceUpdate) => {
      return await apiRequest('PATCH', `/api/products/${update.productId}`, {
        priceEur: update.priceEUR.toString(),
        priceCzk: update.priceCZK.toString(),
        price: update.priceEUR.toString()
      });
    },
    onSuccess: (_, update) => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setSavedItems(prev => new Set([...prev, update.sku]));
      setPriceUpdates(prev => ({
        ...prev,
        [update.sku]: { ...prev[update.sku], hasChanged: false }
      }));
      toast({
        title: t('priceUpdated') || 'Price Updated',
        description: `${update.sku}: €${update.priceEUR.toFixed(2)} / ${update.priceCZK.toFixed(0)} CZK`,
      });
    },
    onError: (error: any) => {
      console.error('Error saving price:', error);
      toast({
        title: t('error') || 'Error',
        description: error.message || t('failedToSavePrice') || 'Failed to save price',
        variant: "destructive"
      });
    }
  });

  // Save all prices mutation
  const saveAllPricesMutation = useMutation({
    mutationFn: async (updates: PriceUpdate[]) => {
      const results = [];
      for (const update of updates) {
        if (update.hasChanged && update.productId) {
          const result = await apiRequest('PATCH', `/api/products/${update.productId}`, {
            priceEur: update.priceEUR.toString(),
            priceCzk: update.priceCZK.toString(),
            price: update.priceEUR.toString()
          });
          results.push({ sku: update.sku, result });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      const savedSkus = results.map(r => r.sku);
      setSavedItems(prev => new Set([...prev, ...savedSkus]));
      
      // Mark all as not changed
      setPriceUpdates(prev => {
        const updated = { ...prev };
        savedSkus.forEach(sku => {
          if (updated[sku]) {
            updated[sku].hasChanged = false;
          }
        });
        return updated;
      });
      
      toast({
        title: t('pricesUpdated') || 'Prices Updated',
        description: `${results.length} ${t('pricesSaved') || 'prices saved successfully'}`,
      });
    },
    onError: (error: any) => {
      console.error('Error saving prices:', error);
      toast({
        title: t('error') || 'Error',
        description: error.message || t('failedToSavePrices') || 'Failed to save prices',
        variant: "destructive"
      });
    }
  });

  // Add to inventory mutation
  const addToInventoryMutation = useMutation({
    mutationFn: async (items: LandingCostItem[]) => {
      const responses = [];
      for (const item of items) {
        const product = productsBySKU[item.sku];
        const priceUpdate = priceUpdates[item.sku];
        
        if (product) {
          const response = await apiRequest('PATCH', `/api/products/${product.id}`, {
            quantity: (parseInt(product.quantity) || 0) + item.quantity,
            landingCost: item.landingCostPerUnit.toString(),
            priceEur: priceUpdate?.priceEUR?.toString() || product.priceEur || product.price,
            priceCzk: priceUpdate?.priceCZK?.toString() || product.priceCzk
          });
          responses.push(response);
        } else {
          const suggestedPrice = item.landingCostPerUnit * 1.5;
          const response = await apiRequest('POST', '/api/products', {
            name: item.name,
            sku: item.sku,
            quantity: item.quantity,
            landingCost: item.landingCostPerUnit.toString(),
            price: priceUpdate?.priceEUR?.toString() || suggestedPrice.toString(),
            priceEur: priceUpdate?.priceEUR?.toString() || suggestedPrice.toString(),
            priceCzk: priceUpdate?.priceCZK?.toString() || convertCurrency(suggestedPrice, 'EUR', 'CZK').toString(),
            category: 'Imported',
            description: `Imported from shipment with landing cost calculated`
          });
          responses.push(response);
        }
      }
      return responses;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: t('success') || 'Success',
        description: `${data.length} ${t('itemsAddedToInventory') || 'items added/updated in inventory'}`,
      });
      setSelectedItems(new Set());
    },
    onError: (error: any) => {
      toast({
        title: t('error') || 'Error',
        description: error.message || 'Failed to add items to inventory',
        variant: "destructive",
      });
    }
  });

  // Handle price change
  const handlePriceChange = (sku: string, productId: number, currency: 'EUR' | 'CZK', value: number) => {
    setPriceUpdates(prev => {
      const existing = prev[sku] || { productId, sku, priceEUR: 0, priceCZK: 0, hasChanged: false };
      
      if (currency === 'EUR') {
        return {
          ...prev,
          [sku]: {
            ...existing,
            priceEUR: value,
            priceCZK: convertCurrency(value, 'EUR', 'CZK'),
            hasChanged: true
          }
        };
      } else {
        return {
          ...prev,
          [sku]: {
            ...existing,
            priceCZK: value,
            priceEUR: convertCurrency(value, 'CZK', 'EUR'),
            hasChanged: true
          }
        };
      }
    });
    
    // Remove from saved items when changed
    setSavedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(sku);
      return newSet;
    });
  };

  // Handle save all prices
  const handleSaveAllPrices = () => {
    const changedUpdates = Object.values(priceUpdates).filter(u => u.hasChanged && u.productId);
    if (changedUpdates.length === 0) {
      toast({
        title: t('noChanges') || 'No Changes',
        description: t('noPriceChanges') || 'No price changes to save',
      });
      return;
    }
    saveAllPricesMutation.mutate(changedUpdates);
  };

  // Handle save single price
  const handleSaveSinglePrice = (sku: string) => {
    const update = priceUpdates[sku];
    if (!update || !update.productId) {
      toast({
        title: t('error') || 'Error',
        description: t('productNotInInventory') || 'Product not in inventory',
        variant: "destructive"
      });
      return;
    }
    savePriceMutation.mutate(update);
  };

  // Handle add selected to inventory
  const handleAddSelectedToInventory = () => {
    if (!landingCostPreview) return;
    const itemsToAdd = landingCostPreview.items.filter(item => selectedItems.has(item.sku));
    addToInventoryMutation.mutate(itemsToAdd);
  };

  // Handle add all to inventory
  const handleAddAllToInventory = () => {
    if (!landingCostPreview) return;
    addToInventoryMutation.mutate(landingCostPreview.items);
  };

  // Count changed prices
  const changedPricesCount = Object.values(priceUpdates).filter(u => u.hasChanged).length;

  if (isLoading || !shipment) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'in transit':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
      case 'delivered':
      case 'storage':
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="container mx-auto p-3 md:p-4 max-w-6xl">
      {/* Header */}
      <div className="mb-4">
        <Link href="/imports/landing-costs">
          <Button variant="ghost" size="sm" className="mb-2 h-8" data-testid="button-back-to-list">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            {t('backToLandingCosts') || 'Back to Landing Costs'}
          </Button>
        </Link>
        
        {/* Title Row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">
              {shipment.shipmentName || `${t('shipment') || 'Shipment'} #${shipment.id}`}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t('calculateAndReviewLandedCosts') || 'Calculate and review landed costs'}
            </p>
          </div>
          <Badge className={`${getStatusColor(shipment.status)} px-2.5 py-0.5 text-sm`}>
            {shipment.status?.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        </div>

        {/* Shipment Info Bar */}
        <Card className="mb-4">
          <CardContent className="p-3">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground mb-0.5">{t('carrier') || 'Carrier'}</p>
                <p className="font-medium flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  {shipment.carrier}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">{t('trackingNumber') || 'Tracking'}</p>
                <p className="font-medium flex items-center gap-1 font-mono text-xs">
                  <Hash className="h-3 w-3" />
                  {shipment.trackingNumber}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">{t('items') || 'Items'}</p>
                <p className="font-medium flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {shipment.itemCount} {t('items') || 'items'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">{t('route') || 'Route'}</p>
                <p className="font-medium flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {shipment.origin} → {shipment.destination}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">{t('created') || 'Created'}</p>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(shipment.createdAt), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Landed Cost Per Item with Selling Prices */}
      {landingCostPreview && landingCostPreview.items && landingCostPreview.items.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3">
              {/* Title Row */}
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    {t('landedCostPerItem') || 'Landed Cost Per Item'} ({landingCostPreview.items.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t('viewLandedCostsSetPrices') || 'View landed costs and set selling prices'}
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => refetchPreview()}
                  data-testid="button-refresh"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddSelectedToInventory}
                  disabled={selectedItems.size === 0 || addToInventoryMutation.isPending}
                  data-testid="button-add-selected"
                >
                  {addToInventoryMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Package className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {t('addSelectedToInventory') || 'Add Selected'} ({selectedItems.size})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddAllToInventory}
                  disabled={landingCostPreview.items.length === 0 || addToInventoryMutation.isPending}
                  data-testid="button-add-all"
                >
                  <PackagePlus className="h-3.5 w-3.5 mr-1.5" />
                  {t('addAllToInventory') || 'Add All to Inventory'}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveAllPrices}
                  disabled={changedPricesCount === 0 || saveAllPricesMutation.isPending}
                  data-testid="button-save-prices"
                  className="ml-auto"
                >
                  {saveAllPricesMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {saveAllPricesMutation.isPending 
                    ? (t('saving') || 'Saving...') 
                    : `${t('savePrices') || 'Save Prices'} (${changedPricesCount})`
                  }
                </Button>
              </div>
              
              {/* Select All Checkbox - Below Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Checkbox
                  checked={
                    landingCostPreview.items.filter(item => !productsBySKU[item.sku]).length > 0 &&
                    landingCostPreview.items.filter(item => !productsBySKU[item.sku]).every(item => selectedItems.has(item.sku))
                  }
                  onCheckedChange={(checked) => {
                    const newSelected = new Set<string>();
                    if (checked) {
                      landingCostPreview.items.forEach(item => {
                        if (!productsBySKU[item.sku]) {
                          newSelected.add(item.sku);
                        }
                      });
                    }
                    setSelectedItems(newSelected);
                  }}
                  data-testid="checkbox-select-all"
                />
                <Label className="text-xs cursor-pointer">{t('selectAll') || 'Select All'}</Label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingPreview || isLoadingProducts ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-40 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {landingCostPreview.items.map((item, index) => {
                  const product = productsBySKU[item.sku];
                  const currentPriceEUR = product ? parseFloat(product.priceEur || product.price || '0') : 0;
                  const currentPriceCZK = product ? (parseFloat(product.priceCzk || '0') || convertCurrency(currentPriceEUR, 'EUR', 'CZK')) : 0;
                  
                  const priceUpdate = priceUpdates[item.sku];
                  const displayPriceEUR = priceUpdate?.priceEUR ?? currentPriceEUR;
                  const displayPriceCZK = priceUpdate?.priceCZK ?? currentPriceCZK;
                  const hasChanges = priceUpdate?.hasChanged ?? false;
                  const isSaved = savedItems.has(item.sku);
                  
                  const landingCostCZK = convertCurrency(item.landingCostPerUnit, 'EUR', 'CZK');
                  const purchasePriceCZK = convertCurrency(item.unitPrice, 'EUR', 'CZK');
                  
                  const margin = displayPriceEUR > 0 
                    ? ((displayPriceEUR - item.landingCostPerUnit) / displayPriceEUR * 100)
                    : 0;

                  return (
                    <div 
                      key={index}
                      className={`border rounded-lg p-3 transition-all ${
                        hasChanges 
                          ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20' 
                          : isSaved
                          ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20'
                          : 'bg-white dark:bg-gray-900'
                      }`}
                      data-testid={`item-${item.sku}`}
                    >
                      {/* Product Header */}
                      <div className="flex items-start gap-3 mb-3">
                        <Checkbox
                          checked={selectedItems.has(item.sku)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedItems);
                            if (checked) {
                              newSelected.add(item.sku);
                            } else {
                              newSelected.delete(item.sku);
                            }
                            setSelectedItems(newSelected);
                          }}
                          disabled={!!product}
                          data-testid={`checkbox-item-${item.sku}`}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{item.name}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {item.sku && (
                              <Badge variant="outline" className="text-xs font-mono">
                                {item.sku}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {t('qty') || 'Qty'}: <strong>{item.quantity}</strong>
                            </span>
                            {!product ? (
                              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {t('notInInventory') || 'Not in Inventory'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {t('inInventory') || 'In Inventory'}
                              </Badge>
                            )}
                            {hasChanges && (
                              <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                                {t('unsaved') || 'Unsaved'}
                              </Badge>
                            )}
                            {isSaved && !hasChanges && (
                              <Badge variant="outline" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {t('saved') || 'Saved'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Cost Breakdown Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                        {/* Purchase Price */}
                        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                            {t('purchasePrice') || 'Purchase Price'}
                          </Label>
                          <p className="text-sm font-bold text-blue-700 dark:text-blue-400">
                            {formatCurrency(item.unitPrice, 'EUR')}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatCurrency(purchasePriceCZK, 'CZK')}
                          </p>
                        </div>

                        {/* Landed Cost EUR */}
                        <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-2">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                            {t('landedCost') || 'Landed Cost'}
                          </Label>
                          <p className="text-sm font-bold text-purple-700 dark:text-purple-400">
                            {formatCurrency(item.landingCostPerUnit, 'EUR')}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatCurrency(landingCostCZK, 'CZK')}
                          </p>
                        </div>

                        {/* Selling Price (Summary) */}
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-2">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                            {t('sellingPrice') || 'Selling Price'}
                          </Label>
                          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                            {displayPriceEUR > 0 ? formatCurrency(displayPriceEUR, 'EUR') : '---'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {displayPriceCZK > 0 ? formatCurrency(displayPriceCZK, 'CZK') : '---'}
                          </p>
                        </div>

                        {/* Margin */}
                        <div className={`rounded-lg p-2 ${
                          margin >= 30 
                            ? 'bg-green-50 dark:bg-green-950/30' 
                            : margin >= 15 
                            ? 'bg-amber-50 dark:bg-amber-950/30'
                            : 'bg-red-50 dark:bg-red-950/30'
                        }`}>
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                            {t('margin') || 'Margin'}
                          </Label>
                          <p className={`text-sm font-bold ${
                            margin >= 30 
                              ? 'text-green-700 dark:text-green-400' 
                              : margin >= 15 
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-red-700 dark:text-red-400'
                          }`}>
                            {displayPriceEUR > 0 ? `${margin.toFixed(1)}%` : '---'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {displayPriceEUR > 0 
                              ? `+${formatCurrency(displayPriceEUR - item.landingCostPerUnit, 'EUR')}`
                              : t('setPrice') || 'Set price'
                            }
                          </p>
                        </div>
                      </div>

                      {/* Selling Price Inputs */}
                      <div className="border-t pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs font-semibold flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {t('setSellingPrice') || 'Set Selling Price'}
                          </Label>
                          {product && (
                            <Button
                              size="sm"
                              variant={hasChanges ? "default" : "outline"}
                              onClick={() => handleSaveSinglePrice(item.sku)}
                              disabled={!hasChanges || savePriceMutation.isPending}
                              className="h-7 text-xs"
                              data-testid={`button-save-price-${item.sku}`}
                            >
                              {savePriceMutation.isPending ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Save className="h-3 w-3 mr-1" />
                              )}
                              {t('save') || 'Save'}
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {/* EUR Price Input */}
                          <div>
                            <Label htmlFor={`price-eur-${item.sku}`} className="text-xs text-muted-foreground">
                              {t('priceEUR') || 'Price EUR'}
                            </Label>
                            <MathInput
                              id={`price-eur-${item.sku}`}
                              min={0}
                              step={0.01}
                              value={displayPriceEUR}
                              onChange={(val) => handlePriceChange(item.sku, product?.id || 0, 'EUR', val)}
                              className="mt-1"
                              data-testid={`input-price-eur-${item.sku}`}
                            />
                          </div>

                          {/* CZK Price Input */}
                          <div>
                            <Label htmlFor={`price-czk-${item.sku}`} className="text-xs text-muted-foreground">
                              {t('priceCZK') || 'Price CZK'}
                            </Label>
                            <MathInput
                              id={`price-czk-${item.sku}`}
                              min={0}
                              step={1}
                              isInteger={true}
                              value={Math.round(displayPriceCZK)}
                              onChange={(val) => handlePriceChange(item.sku, product?.id || 0, 'CZK', val)}
                              className="mt-1"
                              data-testid={`input-price-czk-${item.sku}`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Info Alert */}
            {landingCostPreview && landingCostPreview.items.length > 0 && changedPricesCount > 0 && (
              <Alert className="mt-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800 dark:text-amber-300">
                  {t('unsavedChanges') || 'Unsaved Changes'}
                </AlertTitle>
                <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">
                  {changedPricesCount} {t('pricesNotSaved') || 'price(s) not saved. Click "Save Prices" to save all changes.'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Show loading state if preview is still loading */}
      {isLoadingPreview && !landingCostPreview && (
        <Card className="mb-4">
          <CardContent className="py-8">
            <div className="space-y-3">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* No items message */}
      {!isLoadingPreview && landingCostPreview && landingCostPreview.items.length === 0 && (
        <Card className="mb-4">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg mb-1">{t('noItemsFound') || 'No Items Found'}</h3>
            <p className="text-sm text-muted-foreground">
              {t('noItemsInShipment') || 'This shipment has no items for landed cost calculation.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Landing Costs Panel - Reused from Receiving */}
      <CostsPanel 
        shipmentId={parseInt(id || '0')} 
        onUpdate={() => {
          refetchPreview();
        }}
      />
    </div>
  );
}
