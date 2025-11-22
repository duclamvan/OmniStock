import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
  AlertCircle
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
  purchasePrice: string;
}

interface PriceUpdate {
  productId: number;
  sku: string;
  priceEUR: number;
  priceCZK: number;
}

export default function LandingCostDetails() {
  const { t } = useTranslation('imports');
  const { id } = useParams();
  const { toast } = useToast();
  const [priceUpdates, setPriceUpdates] = useState<Record<string, PriceUpdate>>({});

  // Fetch shipment details
  const { data: shipment, isLoading } = useQuery<Shipment>({
    queryKey: [`/api/imports/shipments/${id}`],
    enabled: !!id
  });

  // Fetch landing cost preview
  const { data: landingCostPreview, isLoading: isLoadingPreview } = useQuery<LandingCostPreview>({
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

  // Save prices mutation
  const savePricesMutation = useMutation({
    mutationFn: async (updates: PriceUpdate[]) => {
      const promises = updates.map(update => {
        const product = productsBySKU[update.sku];
        if (!product) return Promise.resolve();
        
        return fetch(`/api/products/${product.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            priceEur: update.priceEUR.toString(),
            priceCzk: update.priceCZK.toString()
          })
        });
      });
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setPriceUpdates({});
      toast({
        title: t('pricesUpdated'),
        description: t('sellingPricesSaved')
      });
    },
    onError: (error) => {
      console.error('Error saving prices:', error);
      toast({
        title: t('error'),
        description: t('failedToSavePrices'),
        variant: "destructive"
      });
    }
  });

  // Handle price change
  const handlePriceChange = (sku: string, productId: number, currency: 'EUR' | 'CZK', value: string) => {
    const numValue = parseFloat(value) || 0;
    
    setPriceUpdates(prev => {
      const existing = prev[sku] || { productId, sku, priceEUR: 0, priceCZK: 0 };
      
      if (currency === 'EUR') {
        return {
          ...prev,
          [sku]: {
            ...existing,
            priceEUR: numValue,
            priceCZK: convertCurrency(numValue, 'EUR', 'CZK')
          }
        };
      } else {
        return {
          ...prev,
          [sku]: {
            ...existing,
            priceCZK: numValue,
            priceEUR: convertCurrency(numValue, 'CZK', 'EUR')
          }
        };
      }
    });
  };

  // Handle save prices
  const handleSavePrices = () => {
    const updates = Object.values(priceUpdates);
    if (updates.length === 0) {
      toast({
        title: t('noChanges'),
        description: t('noPriceChanges'),
        variant: "default"
      });
      return;
    }
    savePricesMutation.mutate(updates);
  };

  if (isLoading || !shipment) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
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
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="container mx-auto p-3 md:p-4">
      {/* Header */}
      <div className="mb-3">
        <Link href="/imports/landing-costs">
          <Button variant="ghost" size="sm" className="mb-2 h-8" data-testid="button-back-to-list">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            {t('backToLandingCosts')}
          </Button>
        </Link>
        
        {/* Title Row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">
              {shipment.shipmentName || `${t('shipment')} #${shipment.id}`}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t('calculateAndReviewLandedCosts')}
            </p>
          </div>
          <Badge className={`${getStatusColor(shipment.status)} px-2.5 py-0.5 text-sm`}>
            {shipment.status?.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        </div>

        {/* Shipment Info Bar */}
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 border rounded-lg p-3 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground mb-0.5">{t('carrier')}</p>
              <p className="font-medium flex items-center gap-1">
                <Truck className="h-3 w-3" />
                {shipment.carrier}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">{t('trackingNumber')}</p>
              <p className="font-medium flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {shipment.trackingNumber}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">{t('items')}</p>
              <p className="font-medium flex items-center gap-1">
                <Package className="h-3 w-3" />
                {shipment.itemCount} {t('items')}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">{t('originDestination')}</p>
              <p className="font-medium flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {shipment.origin} → {shipment.destination}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">{t('created')}</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(shipment.createdAt), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>

          {shipment.totalUnits && shipment.totalWeight && (
            <div className="mt-2 pt-2 border-t">
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <Box className="h-3 w-3" />
                  <span className="font-medium">
                    {shipment.totalUnits} {shipment.unitType || 'units'}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  <span className="font-medium">
                    {shipment.totalWeight} kg
                  </span>
                </span>
              </div>
            </div>
          )}

          {shipment.notes && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground">{t('notes')}</p>
              <p className="text-xs mt-1">{shipment.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Landed Cost Per Item with Selling Prices */}
      {landingCostPreview && landingCostPreview.items && landingCostPreview.items.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {t('landedCostPerItem')} ({landingCostPreview.items.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('viewLandedCostsSetPrices')}
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={handleSavePrices}
                disabled={Object.keys(priceUpdates).length === 0 || savePricesMutation.isPending}
                data-testid="button-save-prices"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {savePricesMutation.isPending ? t('saving') : t('savePrices')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingPreview || isLoadingProducts ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {landingCostPreview.items.map((item, index) => {
                  const product = productsBySKU[item.sku];
                  const currentPriceEUR = product ? parseFloat(product.price || '0') : 0;
                  const currentPriceCZK = convertCurrency(currentPriceEUR, 'EUR', 'CZK');
                  
                  const displayPriceEUR = priceUpdates[item.sku]?.priceEUR ?? currentPriceEUR;
                  const displayPriceCZK = priceUpdates[item.sku]?.priceCZK ?? currentPriceCZK;
                  
                  const landingCostCZK = convertCurrency(item.landingCostPerUnit, 'EUR', 'CZK');
                  const purchasePriceCZK = convertCurrency(item.unitPrice, 'EUR', 'CZK');

                  return (
                    <div 
                      key={index}
                      className="border rounded-lg p-3 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950"
                      data-testid={`item-${item.sku}`}
                    >
                      {/* Product Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{item.name}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge variant="outline" className="text-xs">
                              SKU: {item.sku}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {t('quantity')}: <strong>{item.quantity}</strong>
                            </span>
                            {!product && (
                              <Badge variant="secondary" className="text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {t('notInInventory')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Cost Breakdown Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                        {/* Purchase Price */}
                        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-2">
                          <Label className="text-xs text-muted-foreground">{t('purchasePrice')}</Label>
                          <div className="mt-1">
                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                              {formatCurrency(item.unitPrice, 'EUR')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(purchasePriceCZK, 'CZK')}
                            </p>
                          </div>
                        </div>

                        {/* Landed Cost EUR */}
                        <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-2">
                          <Label className="text-xs text-muted-foreground">{t('landedCostEUR')}</Label>
                          <div className="mt-1">
                            <p className="text-sm font-semibold text-purple-700 dark:text-purple-400">
                              {formatCurrency(item.landingCostPerUnit, 'EUR')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              +{formatCurrency(item.totalAllocated / item.quantity, 'EUR')} {t('costs')}
                            </p>
                          </div>
                        </div>

                        {/* Landed Cost CZK */}
                        <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-2">
                          <Label className="text-xs text-muted-foreground">{t('landedCostCZK')}</Label>
                          <div className="mt-1">
                            <p className="text-sm font-semibold text-purple-700 dark:text-purple-400">
                              {formatCurrency(landingCostCZK, 'CZK')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              @25 CZK/EUR
                            </p>
                          </div>
                        </div>

                        {/* Margin Indicator */}
                        <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-2">
                          <Label className="text-xs text-muted-foreground">
                            {displayPriceEUR > 0 ? t('profitMargin') : t('setPrice')}
                          </Label>
                          <div className="mt-1">
                            {displayPriceEUR > 0 ? (
                              <>
                                <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                                  {((displayPriceEUR - item.landingCostPerUnit) / displayPriceEUR * 100).toFixed(1)}%
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  +{formatCurrency(displayPriceEUR - item.landingCostPerUnit, 'EUR')}
                                </p>
                              </>
                            ) : (
                              <p className="text-xs text-amber-600 dark:text-amber-400">
                                {t('noPriceSet')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Selling Price Inputs */}
                      <div className="border-t pt-3">
                        <Label className="text-xs font-semibold mb-2 block">
                          <DollarSign className="h-3 w-3 inline mr-1" />
                          {t('setSellingPrice')}
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* EUR Price Input */}
                          <div>
                            <Label htmlFor={`price-eur-${item.sku}`} className="text-xs text-muted-foreground">
                              {t('sellingPriceEUR')}
                            </Label>
                            <Input
                              id={`price-eur-${item.sku}`}
                              type="number"
                              step="0.01"
                              min="0"
                              value={displayPriceEUR}
                              onChange={(e) => handlePriceChange(item.sku, product?.id || 0, 'EUR', e.target.value)}
                              className="mt-1"
                              placeholder="0.00"
                              data-testid={`input-price-eur-${item.sku}`}
                            />
                          </div>

                          {/* CZK Price Input */}
                          <div>
                            <Label htmlFor={`price-czk-${item.sku}`} className="text-xs text-muted-foreground">
                              {t('sellingPriceCZK')}
                            </Label>
                            <Input
                              id={`price-czk-${item.sku}`}
                              type="number"
                              step="1"
                              min="0"
                              value={displayPriceCZK.toFixed(0)}
                              onChange={(e) => handlePriceChange(item.sku, product?.id || 0, 'CZK', e.target.value)}
                              className="mt-1"
                              placeholder="0"
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
            {landingCostPreview && landingCostPreview.items.length > 0 && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('pricingInformation')}</AlertTitle>
                <AlertDescription className="text-xs">
                  {t('landedCostIncludes')}
                  {Object.keys(priceUpdates).length > 0 && (
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {' '}({Object.keys(priceUpdates).length} {t('unsavedChanges')})
                    </span>
                  )}
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
            <div className="text-center">
              <Skeleton className="h-32 w-full mb-3" />
              <Skeleton className="h-32 w-full mb-3" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Landing Costs Panel - Reused from Receiving */}
      <CostsPanel 
        shipmentId={parseInt(id || '0')} 
        onUpdate={() => {
          // Optionally refresh shipment data when costs are updated
        }}
      />
    </div>
  );
}
