import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Save,
  TrendingUp,
  AlertCircle,
  PackagePlus,
  CheckCircle,
  Loader2,
  RefreshCw,
  Layers,
  Sparkles,
  CircleDollarSign,
  Tag,
  Percent,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { format } from "date-fns";
import CostsPanel from "@/components/receiving/CostsPanel";
import { convertCurrency, formatCurrency } from "@/lib/currencyUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

interface OrderItem {
  id?: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice?: string;
  imageUrl?: string;
  createdAt?: string;
}

interface VariantAllocation {
  variantId?: string;
  variantName: string;
  quantity: number;
  unitPrice?: number;
  unitPriceCurrency?: string;
  locationCode?: string;
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
  imageUrl?: string;
  orderItems?: OrderItem[];
  variantAllocations?: VariantAllocation[];
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
  version: number;
}

export default function LandingCostDetails() {
  const { t } = useTranslation('imports');
  const { id } = useParams();
  const { toast } = useToast();
  const [priceUpdates, setPriceUpdates] = useState<Record<string, PriceUpdate>>({});
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());
  const [expandedVariants, setExpandedVariants] = useState<Set<string>>(new Set());
  
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const priceUpdatesRef = useRef(priceUpdates);
  
  useEffect(() => {
    priceUpdatesRef.current = priceUpdates;
  }, [priceUpdates]);

  const { data: shipment, isLoading } = useQuery<Shipment>({
    queryKey: [`/api/imports/shipments/${id}`],
    enabled: !!id
  });

  const { data: landingCostPreview, isLoading: isLoadingPreview, refetch: refetchPreview } = useQuery<LandingCostPreview>({
    queryKey: [`/api/imports/shipments/${id}/landing-cost-preview`],
    enabled: !!id
  });

  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled: !!id
  });

  const productsBySKU = useMemo(() => {
    if (!products) return {};
    return products.reduce((acc, product) => {
      acc[product.sku] = product;
      return acc;
    }, {} as Record<string, Product>);
  }, [products]);

  const [initialized, setInitialized] = useState(false);
  const initDataRef = useRef<string>('');
  
  useEffect(() => {
    if (!landingCostPreview || !products) return;
    
    const dataKey = `${landingCostPreview.shipmentId}-${products.length}-${landingCostPreview.items.map(i => i.sku).join(',')}`;
    
    if (dataKey === initDataRef.current && initialized) return;
    
    const initialUpdates: Record<string, PriceUpdate> = {};
    let hasUpdates = false;
    
    landingCostPreview.items.forEach(item => {
      const product = productsBySKU[item.sku];
      const existingUpdate = priceUpdates[item.sku];
      
      if (existingUpdate?.hasChanged) return;
      
      if (product) {
        const priceEUR = parseFloat(product.priceEur || product.price || '0');
        const priceCZK = parseFloat(product.priceCzk || '0') || (priceEUR > 0 ? convertCurrency(priceEUR, 'EUR', 'CZK') : 0);
        
        if (!existingUpdate || 
            existingUpdate.priceEUR !== priceEUR || 
            existingUpdate.priceCZK !== priceCZK) {
          initialUpdates[item.sku] = {
            productId: product.id,
            sku: item.sku,
            priceEUR,
            priceCZK,
            hasChanged: false,
            version: existingUpdate?.version ?? 0
          };
          hasUpdates = true;
        }
      } else if (!existingUpdate) {
        const suggestedPriceEUR = item.landingCostPerUnit * 1.5;
        const suggestedPriceCZK = convertCurrency(suggestedPriceEUR, 'EUR', 'CZK');
        
        initialUpdates[item.sku] = {
          productId: 0,
          sku: item.sku,
          priceEUR: suggestedPriceEUR,
          priceCZK: suggestedPriceCZK,
          hasChanged: false,
          version: 0
        };
        hasUpdates = true;
      }
    });
    
    if (hasUpdates) {
      setPriceUpdates(prev => ({ ...prev, ...initialUpdates }));
    }
    
    initDataRef.current = dataKey;
    setInitialized(true);
  }, [landingCostPreview, products, productsBySKU, initialized]);
  
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
      
      const unsavedUpdates = Object.values(priceUpdatesRef.current).filter(u => u.hasChanged && u.productId);
      if (unsavedUpdates.length > 0) {
        unsavedUpdates.forEach(update => {
          apiRequest('PATCH', `/api/products/${update.productId}`, {
            priceEur: update.priceEUR.toString(),
            priceCzk: update.priceCZK.toString(),
            price: update.priceEUR.toString()
          }).catch(console.error);
        });
      }
    };
  }, []);

  const savePriceMutation = useMutation({
    mutationFn: async (update: PriceUpdate & { isAutoSave?: boolean }) => {
      return await apiRequest('PATCH', `/api/products/${update.productId}`, {
        priceEur: update.priceEUR.toString(),
        priceCzk: update.priceCZK.toString(),
        price: update.priceEUR.toString()
      });
    },
    onMutate: (update) => {
      setSavingItems(prev => new Set([...Array.from(prev), update.sku]));
    },
    onSuccess: (_, update) => {
      const currentUpdate = priceUpdatesRef.current[update.sku];
      if (currentUpdate && currentUpdate.version === update.version) {
        queryClient.invalidateQueries({ queryKey: ['/api/products'] });
        setSavedItems(prev => new Set([...Array.from(prev), update.sku]));
        setPriceUpdates(prev => ({
          ...prev,
          [update.sku]: { ...prev[update.sku], hasChanged: false }
        }));
      }
      setSavingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(update.sku);
        return newSet;
      });
      if (!update.isAutoSave) {
        toast({
          title: t('priceUpdated') || 'Price Updated',
          description: `${update.sku}: €${update.priceEUR.toFixed(2)} / ${update.priceCZK.toFixed(0)} CZK`,
        });
      }
    },
    onError: (error: any, update) => {
      console.error('Error saving price:', error);
      setSavingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(update.sku);
        return newSet;
      });
      toast({
        title: t('error') || 'Error',
        description: error.message || t('failedToSavePrice') || 'Failed to save price',
        variant: "destructive"
      });
    }
  });

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
      setSavedItems(prev => new Set([...Array.from(prev), ...savedSkus]));
      
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      
      const receivedSkus = variables.map(item => item.sku);
      setSavedItems(prev => new Set([...Array.from(prev), ...receivedSkus]));
      
      setPriceUpdates(prev => {
        const updated = { ...prev };
        receivedSkus.forEach(sku => {
          if (updated[sku]) {
            updated[sku].hasChanged = false;
          }
        });
        return updated;
      });
      
      const itemNames = variables.slice(0, 3).map(item => `${item.quantity}x ${item.name}`).join(', ');
      const moreCount = variables.length > 3 ? ` +${variables.length - 3} more` : '';
      
      toast({
        title: t('addedToWarehouse') || 'Added to Warehouse Inventory',
        description: `${itemNames}${moreCount}`,
        duration: 5000
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

  const autoSaveSku = useCallback((sku: string) => {
    const update = priceUpdatesRef.current[sku];
    if (update && update.hasChanged && update.productId) {
      savePriceMutation.mutate({ ...update, isAutoSave: true });
    }
  }, []);

  const handlePriceChange = (sku: string, productId: number, currency: 'EUR' | 'CZK', value: number) => {
    const newVersion = Date.now();
    
    setPriceUpdates(prev => {
      const existing = prev[sku] || { productId, sku, priceEUR: 0, priceCZK: 0, hasChanged: false, version: 0 };
      
      if (currency === 'EUR') {
        return {
          ...prev,
          [sku]: {
            ...existing,
            priceEUR: value,
            priceCZK: convertCurrency(value, 'EUR', 'CZK'),
            hasChanged: true,
            version: newVersion
          }
        };
      } else {
        return {
          ...prev,
          [sku]: {
            ...existing,
            priceCZK: value,
            priceEUR: convertCurrency(value, 'CZK', 'EUR'),
            hasChanged: true,
            version: newVersion
          }
        };
      }
    });
    
    setSavedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(sku);
      return newSet;
    });
    
    if (debounceTimers.current[sku]) {
      clearTimeout(debounceTimers.current[sku]);
    }
    
    debounceTimers.current[sku] = setTimeout(() => {
      autoSaveSku(sku);
      delete debounceTimers.current[sku];
    }, 600);
  };
  
  const handlePriceBlur = useCallback((sku: string) => {
    if (debounceTimers.current[sku]) {
      clearTimeout(debounceTimers.current[sku]);
      delete debounceTimers.current[sku];
    }
    
    const update = priceUpdatesRef.current[sku];
    if (update && update.hasChanged && update.productId) {
      savePriceMutation.mutate({ ...update, isAutoSave: true });
    }
  }, []);

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

  const handleAddSelectedToInventory = () => {
    if (!landingCostPreview) return;
    const itemsToAdd = landingCostPreview.items.filter(item => selectedItems.has(item.sku));
    addToInventoryMutation.mutate(itemsToAdd);
  };

  const handleAddAllToInventory = () => {
    if (!landingCostPreview) return;
    addToInventoryMutation.mutate(landingCostPreview.items);
  };

  const toggleVariants = (sku: string) => {
    setExpandedVariants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sku)) {
        newSet.delete(sku);
      } else {
        newSet.add(sku);
      }
      return newSet;
    });
  };

  const changedPricesCount = Object.values(priceUpdates).filter(u => u.hasChanged).length;

  if (isLoading || !shipment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-fuchsia-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-12 w-2/3 rounded-xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700';
      case 'in transit':
        return 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700';
      case 'delivered':
      case 'storage':
      case 'completed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const getMarginColor = (margin: number) => {
    if (margin >= 40) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30';
    if (margin >= 25) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30';
    if (margin >= 15) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30';
    return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50/50 via-white to-fuchsia-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950">
      <div className="max-w-2xl mx-auto px-4 py-4 pb-24">
        
        {/* Back Button */}
        <Link href="/imports/landing-costs">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-4 -ml-2 text-muted-foreground hover:text-foreground hover:bg-rose-100/50 dark:hover:bg-rose-900/20" 
            data-testid="button-back-to-list"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            {t('backToLandingCosts') || 'Back to Landing Costs'}
          </Button>
        </Link>

        {/* Header Card - Shipment Info */}
        <Card className="mb-4 border-0 shadow-lg shadow-rose-100/50 dark:shadow-none bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-rose-400 via-fuchsia-400 to-purple-400" />
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-100 to-fuchsia-100 dark:from-rose-900/30 dark:to-fuchsia-900/30 flex-shrink-0">
                <Sparkles className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h1 className="font-bold text-lg text-gray-900 dark:text-white leading-tight truncate">
                    {shipment.shipmentName || `${t('shipment') || 'Shipment'} #${shipment.id}`}
                  </h1>
                  <Badge className={`${getStatusStyles(shipment.status)} px-2.5 py-1 text-xs font-semibold border flex-shrink-0`}>
                    {shipment.status?.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-rose-500" />
                    <span className="truncate">{shipment.carrier}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-fuchsia-500" />
                    <span>{shipment.itemCount} {t('items') || 'items'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-purple-500" />
                    <span className="truncate">{shipment.origin} → {shipment.destination}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                    <span>{format(new Date(shipment.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                
                {shipment.trackingNumber && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs">
                    <Hash className="h-3 w-3 text-gray-400" />
                    <code className="font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                      {shipment.trackingNumber}
                    </code>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Section */}
        {landingCostPreview && landingCostPreview.items && landingCostPreview.items.length > 0 && (
          <Card className="border-0 shadow-lg shadow-rose-100/50 dark:shadow-none bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm overflow-hidden mb-4">
            <CardHeader className="pb-3 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-100 to-fuchsia-100 dark:from-purple-900/30 dark:to-fuchsia-900/30">
                    <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  {t('landedCostPerItem') || 'Landed Cost Per Item'}
                  <Badge variant="secondary" className="ml-1 text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                    {landingCostPreview.items.length}
                  </Badge>
                </CardTitle>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                  onClick={() => refetchPreview()}
                  data-testid="button-refresh"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Action Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
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
                    className="border-rose-300 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
                    data-testid="checkbox-select-all"
                  />
                  <Label htmlFor="select-all" className="text-xs cursor-pointer text-muted-foreground">
                    {t('selectAll') || 'Select All'}
                  </Label>
                </div>
                
                <div className="flex-1" />
                
                <div className="flex gap-2">
                  {selectedItems.size > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/20"
                      onClick={handleAddSelectedToInventory}
                      disabled={addToInventoryMutation.isPending}
                      data-testid="button-add-selected"
                    >
                      {addToInventoryMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <PackagePlus className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Add ({selectedItems.size})
                    </Button>
                  )}
                  
                  {changedPricesCount > 0 && (
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-gradient-to-r from-rose-500 to-fuchsia-500 hover:from-rose-600 hover:to-fuchsia-600 text-white shadow-md shadow-rose-200/50 dark:shadow-none"
                      onClick={handleSaveAllPrices}
                      disabled={saveAllPricesMutation.isPending}
                      data-testid="button-save-prices"
                    >
                      {saveAllPricesMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {t('savePrices') || 'Save'} ({changedPricesCount})
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="px-4 pt-0 pb-4">
              {isLoadingPreview || isLoadingProducts ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-36 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {landingCostPreview.items.map((item, index) => {
                    const hasVariantAllocations = item.variantAllocations && item.variantAllocations.length > 0;
                    const hasPackageContents = !hasVariantAllocations && item.orderItems && item.orderItems.length > 0;
                    const product = productsBySKU[item.sku];
                    const currentPriceEUR = product ? parseFloat(product.priceEur || product.price || '0') : 0;
                    const currentPriceCZK = product ? (parseFloat(product.priceCzk || '0') || convertCurrency(currentPriceEUR, 'EUR', 'CZK')) : 0;
                    
                    const priceUpdate = priceUpdates[item.sku];
                    const displayPriceEUR = priceUpdate?.priceEUR ?? currentPriceEUR;
                    const displayPriceCZK = priceUpdate?.priceCZK ?? currentPriceCZK;
                    const hasChanges = priceUpdate?.hasChanged ?? false;
                    const isSaved = savedItems.has(item.sku);
                    const isSaving = savingItems.has(item.sku);
                    
                    const margin = displayPriceEUR > 0 
                      ? ((displayPriceEUR - item.landingCostPerUnit) / displayPriceEUR * 100)
                      : 0;

                    if (hasPackageContents) {
                      return (
                        <div 
                          key={index}
                          className="rounded-2xl border-2 border-indigo-200 dark:border-indigo-700 overflow-hidden bg-white dark:bg-gray-900"
                          data-testid={`package-${item.sku || index}`}
                        >
                          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 px-4 py-3 border-b border-indigo-100 dark:border-indigo-800">
                            <div className="flex items-center gap-2">
                              <Box className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                              <span className="font-semibold text-sm text-indigo-900 dark:text-indigo-200">
                                {item.name}
                              </span>
                              <Badge variant="outline" className="text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700">
                                {item.orderItems!.length} items
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {item.orderItems!.map((orderItem, oIndex) => {
                              const subProduct = productsBySKU[orderItem.sku];
                              const subPriceUpdate = priceUpdates[orderItem.sku];
                              const subDisplayPriceEUR = subPriceUpdate?.priceEUR ?? (subProduct ? parseFloat(subProduct.priceEur || subProduct.price || '0') : 0);
                              const subDisplayPriceCZK = subPriceUpdate?.priceCZK ?? (subProduct ? parseFloat(subProduct.priceCzk || '0') : 0);
                              const subHasChanges = subPriceUpdate?.hasChanged ?? false;
                              const subIsSaved = savedItems.has(orderItem.sku);
                              const subMargin = subDisplayPriceEUR > 0 ? ((subDisplayPriceEUR - item.landingCostPerUnit) / subDisplayPriceEUR * 100) : 0;

                              return (
                                <div 
                                  key={orderItem.id || oIndex}
                                  className={`p-4 ${subHasChanges ? 'bg-amber-50/50 dark:bg-amber-950/10' : subIsSaved ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`}
                                  data-testid={`item-${orderItem.sku}`}
                                >
                                  <div className="flex items-start gap-3 mb-3">
                                    <Checkbox
                                      checked={selectedItems.has(orderItem.sku)}
                                      onCheckedChange={(checked) => {
                                        const newSelected = new Set(selectedItems);
                                        if (checked) newSelected.add(orderItem.sku);
                                        else newSelected.delete(orderItem.sku);
                                        setSelectedItems(newSelected);
                                      }}
                                      disabled={!!subProduct}
                                      className="mt-1 border-rose-300 data-[state=checked]:bg-rose-500"
                                      data-testid={`checkbox-item-${orderItem.sku}`}
                                    />
                                    {orderItem.imageUrl ? (
                                      <img src={orderItem.imageUrl} alt="" className="w-12 h-12 object-cover rounded-lg flex-shrink-0 ring-2 ring-rose-100 dark:ring-rose-900" />
                                    ) : (
                                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-rose-100 to-fuchsia-100 dark:from-rose-900/30 dark:to-fuchsia-900/30 flex items-center justify-center flex-shrink-0">
                                        <Package className="h-5 w-5 text-rose-400" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-sm text-gray-900 dark:text-white">{orderItem.name}</h4>
                                      <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <code className="text-[10px] font-mono text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                          {orderItem.sku}
                                        </code>
                                        <span className="text-xs font-medium text-fuchsia-600 dark:text-fuchsia-400">×{orderItem.quantity}</span>
                                        {!subProduct && (
                                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700">
                                            <AlertCircle className="h-2.5 w-2.5 mr-1" />
                                            New
                                          </Badge>
                                        )}
                                        {subIsSaved && !subHasChanges && (
                                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-4 gap-2 mb-3">
                                    <div className="rounded-lg p-2 bg-sky-50 dark:bg-sky-900/20 text-center">
                                      <div className="text-[10px] text-sky-600 dark:text-sky-400 font-medium mb-0.5">Cost</div>
                                      <div className="text-xs font-bold text-sky-700 dark:text-sky-300">€{parseFloat(orderItem.unitPrice || '0').toFixed(2)}</div>
                                    </div>
                                    <div className="rounded-lg p-2 bg-purple-50 dark:bg-purple-900/20 text-center">
                                      <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium mb-0.5">Landed</div>
                                      <div className="text-xs font-bold text-purple-700 dark:text-purple-300">€{item.landingCostPerUnit.toFixed(2)}</div>
                                    </div>
                                    <div className="rounded-lg p-2 bg-emerald-50 dark:bg-emerald-900/20 text-center">
                                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mb-0.5">Sell</div>
                                      <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{subDisplayPriceEUR > 0 ? `€${subDisplayPriceEUR.toFixed(2)}` : '---'}</div>
                                    </div>
                                    <div className={`rounded-lg p-2 text-center ${getMarginColor(subMargin)}`}>
                                      <div className="text-[10px] font-medium mb-0.5">Margin</div>
                                      <div className="text-xs font-bold">{subDisplayPriceEUR > 0 ? `${subMargin.toFixed(0)}%` : '---'}</div>
                                    </div>
                                  </div>

                                  <div className="flex gap-2">
                                    <div className="flex-1">
                                      <Label className="text-[10px] text-muted-foreground mb-1 block">EUR</Label>
                                      <MathInput
                                        id={`price-eur-${orderItem.sku}`}
                                        min={0}
                                        step={0.01}
                                        value={subDisplayPriceEUR}
                                        onChange={(val) => handlePriceChange(orderItem.sku, subProduct?.id || 0, 'EUR', val)}
                                        onBlur={() => handlePriceBlur(orderItem.sku)}
                                        className="h-9 text-sm rounded-lg border-rose-200 focus:border-rose-400 focus:ring-rose-400"
                                        data-testid={`input-price-eur-${orderItem.sku}`}
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <Label className="text-[10px] text-muted-foreground mb-1 block">CZK</Label>
                                      <MathInput
                                        id={`price-czk-${orderItem.sku}`}
                                        min={0}
                                        step={1}
                                        isInteger={true}
                                        value={Math.round(subDisplayPriceCZK)}
                                        onChange={(val) => handlePriceChange(orderItem.sku, subProduct?.id || 0, 'CZK', val)}
                                        onBlur={() => handlePriceBlur(orderItem.sku)}
                                        className="h-9 text-sm rounded-lg border-rose-200 focus:border-rose-400 focus:ring-rose-400"
                                        data-testid={`input-price-czk-${orderItem.sku}`}
                                      />
                                    </div>
                                    {subProduct && subHasChanges && (
                                      <Button
                                        size="sm"
                                        className="h-9 px-3 mt-auto bg-gradient-to-r from-rose-500 to-fuchsia-500 hover:from-rose-600 hover:to-fuchsia-600"
                                        onClick={() => handleSaveSinglePrice(orderItem.sku)}
                                        disabled={savePriceMutation.isPending}
                                        data-testid={`button-save-price-${orderItem.sku}`}
                                      >
                                        <Save className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div 
                        key={index}
                        className={`rounded-2xl p-4 transition-all ${
                          hasChanges 
                            ? 'bg-amber-50 dark:bg-amber-950/20 ring-2 ring-amber-200 dark:ring-amber-700' 
                            : isSaved
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/10 ring-1 ring-emerald-200 dark:ring-emerald-800'
                            : 'bg-white dark:bg-gray-900 ring-1 ring-gray-100 dark:ring-gray-800'
                        }`}
                        data-testid={`item-${item.sku}`}
                      >
                        {/* Product Header */}
                        <div className="flex items-start gap-3 mb-3">
                          <Checkbox
                            checked={selectedItems.has(item.sku)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedItems);
                              if (checked) newSelected.add(item.sku);
                              else newSelected.delete(item.sku);
                              setSelectedItems(newSelected);
                            }}
                            disabled={!!product}
                            className="mt-1 border-rose-300 data-[state=checked]:bg-rose-500"
                            data-testid={`checkbox-item-${item.sku}`}
                          />
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" className="w-14 h-14 object-cover rounded-xl flex-shrink-0 ring-2 ring-rose-100 dark:ring-rose-900" />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-100 to-fuchsia-100 dark:from-rose-900/30 dark:to-fuchsia-900/30 flex items-center justify-center flex-shrink-0">
                              <Package className="h-6 w-6 text-rose-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-semibold text-sm text-gray-900 dark:text-white leading-snug">{item.name}</h4>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-500" />}
                                {isSaved && !hasChanges && !isSaving && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <code className="text-[10px] font-mono text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                {item.sku}
                              </code>
                              <span className="text-xs font-semibold text-fuchsia-600 dark:text-fuchsia-400">×{item.quantity.toLocaleString()}</span>
                              {!product && (
                                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700">
                                  <AlertCircle className="h-2.5 w-2.5 mr-1" />
                                  {t('notInInventory') || 'New'}
                                </Badge>
                              )}
                              {hasChanges && (
                                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300">
                                  Unsaved
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Variant Allocations */}
                        {hasVariantAllocations && item.variantAllocations && (
                          <Collapsible 
                            open={expandedVariants.has(item.sku)} 
                            onOpenChange={() => toggleVariants(item.sku)}
                            className="mb-3"
                          >
                            <CollapsibleTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="w-full h-8 justify-between px-3 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg"
                              >
                                <div className="flex items-center gap-2">
                                  <Layers className="h-3.5 w-3.5" />
                                  <span className="text-xs font-medium">
                                    {item.variantAllocations.length} Variants • {item.quantity.toLocaleString()} Units
                                  </span>
                                </div>
                                {expandedVariants.has(item.sku) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto p-2 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg">
                                {item.variantAllocations.map((variant, vIndex) => (
                                  <div 
                                    key={variant.variantId || vIndex}
                                    className="flex items-center justify-between text-xs bg-white dark:bg-gray-800 rounded-md px-2 py-1.5 border border-purple-100 dark:border-purple-800"
                                  >
                                    <span className="text-gray-600 dark:text-gray-300 truncate flex-1 mr-2">
                                      {variant.variantName || `V${vIndex + 1}`}
                                    </span>
                                    <span className="font-mono font-bold text-purple-600 dark:text-purple-400 flex-shrink-0">
                                      ×{variant.quantity}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}

                        {/* Price Summary Cards */}
                        <div className="grid grid-cols-4 gap-2 mb-3">
                          <div className="rounded-xl p-2.5 bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 text-center">
                            <CircleDollarSign className="h-3.5 w-3.5 mx-auto mb-1 text-sky-500" />
                            <div className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">{t('purchasePrice') || 'Cost'}</div>
                            <div className="text-xs font-bold text-sky-700 dark:text-sky-300 mt-0.5">€{item.unitPrice.toFixed(2)}</div>
                          </div>
                          <div className="rounded-xl p-2.5 bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-900/20 dark:to-fuchsia-900/20 text-center">
                            <Tag className="h-3.5 w-3.5 mx-auto mb-1 text-purple-500" />
                            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">{t('landedCost') || 'Landed'}</div>
                            <div className="text-xs font-bold text-purple-700 dark:text-purple-300 mt-0.5">€{item.landingCostPerUnit.toFixed(2)}</div>
                          </div>
                          <div className="rounded-xl p-2.5 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 text-center">
                            <Sparkles className="h-3.5 w-3.5 mx-auto mb-1 text-emerald-500" />
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">{t('sellingPrice') || 'Sell'}</div>
                            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                              {displayPriceEUR > 0 ? `€${displayPriceEUR.toFixed(2)}` : '---'}
                            </div>
                          </div>
                          <div className={`rounded-xl p-2.5 text-center ${getMarginColor(margin)}`}>
                            <Percent className="h-3.5 w-3.5 mx-auto mb-1" />
                            <div className="text-[10px] font-medium">{t('margin') || 'Margin'}</div>
                            <div className="text-xs font-bold mt-0.5">
                              {displayPriceEUR > 0 ? `${margin.toFixed(0)}%` : '---'}
                            </div>
                          </div>
                        </div>

                        {/* Price Inputs */}
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label htmlFor={`price-eur-${item.sku}`} className="text-[10px] text-muted-foreground mb-1 block">
                              Price EUR
                            </Label>
                            <MathInput
                              id={`price-eur-${item.sku}`}
                              min={0}
                              step={0.01}
                              value={displayPriceEUR}
                              onChange={(val) => handlePriceChange(item.sku, product?.id || 0, 'EUR', val)}
                              onBlur={() => handlePriceBlur(item.sku)}
                              className="h-10 text-sm rounded-xl border-rose-200 focus:border-rose-400 focus:ring-rose-400 dark:border-gray-700"
                              data-testid={`input-price-eur-${item.sku}`}
                            />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor={`price-czk-${item.sku}`} className="text-[10px] text-muted-foreground mb-1 block">
                              Price CZK
                            </Label>
                            <MathInput
                              id={`price-czk-${item.sku}`}
                              min={0}
                              step={1}
                              isInteger={true}
                              value={Math.round(displayPriceCZK)}
                              onChange={(val) => handlePriceChange(item.sku, product?.id || 0, 'CZK', val)}
                              onBlur={() => handlePriceBlur(item.sku)}
                              className="h-10 text-sm rounded-xl border-rose-200 focus:border-rose-400 focus:ring-rose-400 dark:border-gray-700"
                              data-testid={`input-price-czk-${item.sku}`}
                            />
                          </div>
                          {product && hasChanges && (
                            <Button
                              size="sm"
                              className="h-10 px-4 mt-auto rounded-xl bg-gradient-to-r from-rose-500 to-fuchsia-500 hover:from-rose-600 hover:to-fuchsia-600 shadow-md shadow-rose-200/50 dark:shadow-none"
                              onClick={() => handleSaveSinglePrice(item.sku)}
                              disabled={savePriceMutation.isPending}
                              data-testid={`button-save-price-${item.sku}`}
                            >
                              {savePriceMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Unsaved Alert */}
              {changedPricesCount > 0 && (
                <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        {t('unsavedChanges') || 'Unsaved Changes'}
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                        {changedPricesCount} {t('pricesNotSaved') || 'price(s) waiting to be saved'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoadingPreview && !landingCostPreview && (
          <Card className="mb-4 border-0 shadow-lg bg-white/80 dark:bg-gray-900/80">
            <CardContent className="py-8">
              <div className="space-y-3">
                <Skeleton className="h-36 w-full rounded-xl" />
                <Skeleton className="h-36 w-full rounded-xl" />
                <Skeleton className="h-36 w-full rounded-xl" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoadingPreview && landingCostPreview && landingCostPreview.items.length === 0 && (
          <Card className="mb-4 border-0 shadow-lg bg-white/80 dark:bg-gray-900/80">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-rose-100 to-fuchsia-100 dark:from-rose-900/30 dark:to-fuchsia-900/30 flex items-center justify-center">
                <Package className="h-8 w-8 text-rose-400" />
              </div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                {t('noItemsFound') || 'No Items Found'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('noItemsInShipment') || 'This shipment has no items for landed cost calculation.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Costs Panel */}
        <CostsPanel 
          shipmentId={id} 
          onUpdate={() => {
            refetchPreview();
          }}
        />
      </div>
    </div>
  );
}
