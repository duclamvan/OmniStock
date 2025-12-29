import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from 'react-i18next';
import { 
  Plus,
  Edit2,
  Trash2,
  Calculator,
  TrendingUp,
  Package,
  Shield,
  Truck,
  Box,
  CircleDollarSign,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Download,
  ChevronDown
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency as formatCurrencyUtil, convertCurrency } from "@/lib/currencyUtils";
import AddCostModal from "./AddCostModal";
import AllocationPreview from "./AllocationPreview";
import CartonDimensions from "./CartonDimensions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ShipmentCost {
  id: number;
  shipmentId: string;
  type: 'FREIGHT' | 'DUTY' | 'BROKERAGE' | 'INSURANCE' | 'PACKAGING' | 'OTHER';
  mode?: 'AIR' | 'SEA' | 'COURIER';
  volumetricDivisor?: number;
  amountOriginal: string;
  currency: string;
  fxRateUsed?: string;
  amountBase: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface LandingCostSummary {
  status: 'pending' | 'calculated' | 'approved';
  totalCost: number;
  baseCurrency: string;
  lastCalculated?: string;
  itemCount?: number;
}

interface CostsPanelProps {
  shipmentId?: string;
  receiptId?: string;
  onUpdate?: () => void;
}

const CostsPanel = ({ shipmentId, receiptId, onUpdate }: CostsPanelProps) => {
  const { toast } = useToast();
  const { t } = useTranslation('imports');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCost, setSelectedCost] = useState<ShipmentCost | null>(null);
  const [costToDelete, setCostToDelete] = useState<ShipmentCost | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [displayCurrency, setDisplayCurrency] = useState<string>('EUR');

  const AVAILABLE_CURRENCIES = [
    { value: 'EUR', label: 'EUR €' },
    { value: 'USD', label: 'USD $' },
    { value: 'CZK', label: 'CZK Kč' },
    { value: 'VND', label: 'VND ₫' },
    { value: 'CNY', label: 'CNY ¥' },
    { value: 'GBP', label: 'GBP £' },
    { value: 'JPY', label: 'JPY ¥' },
    { value: 'CHF', label: 'CHF Fr' },
    { value: 'AUD', label: 'AUD $' },
    { value: 'CAD', label: 'CAD $' },
  ];

  // Fetch shipment data
  const { data: shipmentData } = useQuery({
    queryKey: [`/api/imports/shipments/${shipmentId}`],
    queryFn: async () => {
      const response = await fetch(`/api/imports/shipments/${shipmentId}`);
      if (!response.ok) throw new Error('Failed to fetch shipment');
      return response.json();
    },
    enabled: !!shipmentId
  });

  // Fetch costs
  const { data: costsData, isLoading: loadingCosts } = useQuery({
    queryKey: [`/api/imports/shipments/${shipmentId}/costs`],
    enabled: !!shipmentId,
    staleTime: 0,  // Always fetch fresh data
    gcTime: 30 * 1000  // Short cache time
  });

  // Extract costs array from response
  const costs = Array.isArray(costsData) ? costsData : 
    (costsData?.costs ? Object.entries(costsData.costs).flatMap(([type, typeCosts]: [string, any[]]) => 
      typeCosts.map(cost => ({ ...cost, type }))
    ) : []);

  // Fetch landing cost summary
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: [`/api/imports/shipments/${shipmentId}/landing-cost-summary`],
    enabled: !!shipmentId
  });

  // Fetch cost sources breakdown (includes PO shipping costs)
  const { data: costSourcesData } = useQuery({
    queryKey: [`/api/imports/shipments/${shipmentId}/cost-sources`],
    enabled: !!shipmentId,
    staleTime: 30 * 1000
  });

  // Extract cost breakdown
  const costBreakdown = costSourcesData?.costBreakdown || {
    shipmentLevelShipping: 0,
    shipmentLevelInsurance: 0,
    poShippingCosts: 0,
    poShippingCostsOriginal: 0,
    poShippingCostsCurrency: 'USD',
    itemDutyCosts: 0,
    consolidationCosts: 0,
    shipmentCosts: {}
  };

  // Auto-create freight cost from shipment data - DISABLED to prevent duplicate creation
  // The auto-population was creating duplicate freight costs due to race conditions.
  // Users should manually add freight costs via the "Add Cost" button instead.

  // Delete cost mutation
  const deleteCostMutation = useMutation({
    mutationFn: async (costId: number) => {
      return apiRequest('DELETE', `/api/imports/shipments/${shipmentId}/costs/${costId}`);
    },
    onSuccess: async () => {
      toast({
        title: t('costDeleted'),
        description: t('recalculatingLandingCosts')
      });
      setCostToDelete(null);
      
      // Auto-trigger landing cost calculation
      try {
        await apiRequest('POST', `/api/imports/shipments/${shipmentId}/calculate-landing-costs`);
        toast({
          title: t('updated'),
          description: t('costDeletedAndRecalculated')
        });
      } catch (error: any) {
        console.error('Auto-calculation failed:', error);
        toast({
          title: t('warning'),
          description: t('costDeletedButFailed', { 
            error: error.message || 'Unknown error'
          }),
          variant: "destructive"
        });
      }
      
      queryClient.invalidateQueries({ queryKey: [`/api/imports/shipments/${shipmentId}/costs`] });
      queryClient.invalidateQueries({ queryKey: [`/api/imports/shipments/${shipmentId}/landing-cost-summary`] });
      queryClient.invalidateQueries({ queryKey: [`/api/imports/shipments/${shipmentId}/landing-cost-preview`] });
      queryClient.invalidateQueries({ queryKey: [`/api/imports/shipments/${shipmentId}/cost-sources`] });
      onUpdate?.();
    },
    onError: (error: any) => {
      toast({
        title: t('error'),
        description: error.message || 'Failed to delete cost',
        variant: "destructive"
      });
    }
  });

  // Group costs by type
  const costsByType = costs.reduce((acc: Record<string, ShipmentCost[]>, cost: ShipmentCost) => {
    if (!acc[cost.type]) {
      acc[cost.type] = [];
    }
    acc[cost.type].push(cost);
    return acc;
  }, {});

  const getCostIcon = (type: string) => {
    switch (type) {
      case 'FREIGHT':
        return <Truck className="h-5 w-5" />;
      case 'BROKERAGE':
        return <CircleDollarSign className="h-5 w-5" />;
      case 'INSURANCE':
        return <Shield className="h-5 w-5" />;
      case 'PACKAGING':
        return <Package className="h-5 w-5" />;
      case 'OTHER':
        return <Box className="h-5 w-5" />;
      default:
        return <CircleDollarSign className="h-5 w-5" />;
    }
  };

  const getCostColor = (type: string) => {
    switch (type) {
      case 'FREIGHT':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-950';
      case 'BROKERAGE':
        return 'text-purple-600 bg-purple-50 dark:bg-purple-950';
      case 'INSURANCE':
        return 'text-green-600 bg-green-50 dark:bg-green-950';
      case 'PACKAGING':
        return 'text-orange-600 bg-orange-50 dark:bg-orange-950';
      case 'OTHER':
        return 'text-gray-600 bg-gray-50 dark:bg-gray-950';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-950';
    }
  };

  const formatCurrency = (amount: string | number, currency: string) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // If display currency is different from the source currency, convert it
    if (displayCurrency !== currency) {
      const converted = convertCurrency(value, currency as any, displayCurrency);
      return formatCurrencyUtil(converted, displayCurrency);
    }
    
    return formatCurrencyUtil(value, currency);
  };

  // Check for ANY costs including auto-included ones from shipment and PO
  const hasManualCosts = costs.length > 0;
  const hasShipmentCosts = Number(shipmentData?.shippingCost) > 0 || Number(shipmentData?.insuranceValue) > 0;
  const hasPOShippingCosts = Number(costBreakdown.poShippingCostsOriginal) > 0 || Number(costBreakdown.poShippingCosts) > 0;
  const hasAnyCosts = hasManualCosts || hasShipmentCosts || hasPOShippingCosts;
  const isCalculated = summary?.status === 'calculated' || summary?.status === 'approved';

  if (loadingCosts || loadingSummary) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-gray-200 rounded"></div>
        <div className="h-64 bg-gray-100 rounded"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header with Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-semibold">{t('landingCosts')}</h3>
            {hasAnyCosts ? (
              isCalculated ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {t('costed')}
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {t('pendingStatus')}
                </Badge>
              )
            ) : (
              <Badge variant="secondary">
                <AlertCircle className="h-3 w-3 mr-1" />
                {t('noCosts')}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
              <SelectTrigger className="w-[130px] h-10" data-testid="select-currency">
                <SelectValue placeholder={t('displayCurrency')} />
              </SelectTrigger>
              <SelectContent align="end">
                {AVAILABLE_CURRENCIES.map(curr => (
                  <SelectItem key={curr.value} value={curr.value} data-testid={`option-currency-${curr.value}`}>
                    {curr.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="default"
              size="default"
              onClick={() => setShowAddModal(true)}
              data-testid="button-add-cost"
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('addCost')}
            </Button>
          </div>
        </div>

        {/* Summary Card - Show when there are any costs (including auto-included) */}
        {hasAnyCosts && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('totalCost')}</p>
                  {(() => {
                    // Calculate total from all sources
                    const shipmentCost = Number(shipmentData?.shippingCost || 0);
                    const insuranceCost = Number(shipmentData?.insuranceValue || 0);
                    const poShippingCost = Number(costBreakdown.poShippingCostsOriginal || costBreakdown.poShippingCosts || 0);
                    const manualCostsTotal = costs.reduce((sum: number, cost: any) => sum + Number(cost.amountOriginal || 0), 0);
                    const allCostsTotal = shipmentCost + insuranceCost + poShippingCost + manualCostsTotal;
                    const baseCurrency = shipmentData?.shippingCostCurrency || 'USD';
                    return (
                      <>
                        <p className="text-xl font-bold">
                          {formatCurrency(
                            convertCurrency(allCostsTotal, baseCurrency, displayCurrency),
                            displayCurrency
                          )}
                        </p>
                        {displayCurrency !== baseCurrency && (
                          <p className="text-xs text-muted-foreground">
                            ≈ {formatCurrency(allCostsTotal, baseCurrency)}
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('items')}</p>
                  <p className="text-xl font-semibold">{summary?.itemCount || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('displayCurrency')}</p>
                  <p className="text-xl font-semibold">{displayCurrency}</p>
                </div>
                {summary?.lastCalculated && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('lastCalculated')}</p>
                    <p className="text-sm">{format(new Date(summary.lastCalculated), 'MMM dd, HH:mm')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
            <TabsTrigger value="allocation">{t('allocation')}</TabsTrigger>
            <TabsTrigger value="cartons">{t('cartons')}</TabsTrigger>
            <TabsTrigger value="details">{t('details')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Professional All Costs Summary Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CircleDollarSign className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{t('allShipmentCosts') || 'All Shipment Costs'}</CardTitle>
                  </div>
                  {(() => {
                    // All values should be in their original currency for accurate display
                    const shipmentCost = Number(shipmentData?.shippingCost || 0);
                    const insuranceCost = Number(shipmentData?.insuranceValue || 0);
                    // Use original PO shipping amount (not EUR-converted) for consistent currency display
                    const poShippingCost = Number(costBreakdown.poShippingCostsOriginal || costBreakdown.poShippingCosts || 0);
                    const manualCostsTotal = costs.reduce((sum: number, cost: any) => sum + Number(cost.amountOriginal || 0), 0);
                    const grandTotal = shipmentCost + insuranceCost + poShippingCost + manualCostsTotal;
                    const baseCurrency = shipmentData?.shippingCostCurrency || 'USD';
                    const convertedTotal = convertCurrency(grandTotal, baseCurrency, displayCurrency);
                    return (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{t('totalLandingCosts') || 'Total Landing Costs'}</p>
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(convertedTotal, displayCurrency)}
                        </p>
                        {displayCurrency !== baseCurrency && (
                          <p className="text-xs text-muted-foreground">
                            ≈ {formatCurrency(grandTotal, baseCurrency)}
                          </p>
                        )}
                        {poShippingCost > 0 && (
                          <p className="text-xs text-muted-foreground">{t('includesPOShipping') || 'Includes PO shipping'}</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y">
                  {/* Shipment Transit Shipping */}
                  {Number(shipmentData?.shippingCost) > 0 && (
                    <div className="flex items-center justify-between py-3 first:pt-0">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                          <Truck className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{t('internationalTransitShipping') || 'International Transit Shipping'}</p>
                          <p className="text-xs text-muted-foreground">{t('shipmentLevelCost') || 'Shipment-level cost'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-purple-600">
                          {formatCurrency(shipmentData.shippingCost, shipmentData.shippingCostCurrency || 'USD')}
                        </p>
                        <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-300">{t('autoIncluded') || 'Auto'}</Badge>
                      </div>
                    </div>
                  )}

                  {/* Shipment Insurance */}
                  {Number(shipmentData?.insuranceValue) > 0 && (
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                          <Shield className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{t('shipmentInsurance') || 'Shipment Insurance'}</p>
                          <p className="text-xs text-muted-foreground">{t('shipmentLevelCost') || 'Shipment-level cost'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-indigo-600">
                          {formatCurrency(shipmentData.insuranceValue, shipmentData.shippingCostCurrency || 'USD')}
                        </p>
                        <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-300">{t('autoIncluded') || 'Auto'}</Badge>
                      </div>
                    </div>
                  )}

                  {/* PO Shipping Costs - Convert from original currency to display currency */}
                  {(Number(costBreakdown.poShippingCostsOriginal) > 0 || Number(costBreakdown.poShippingCosts) > 0) && (
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                          <Box className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{t('purchaseOrderShipping') || 'Purchase Order Shipping'}</p>
                          <p className="text-xs text-muted-foreground">{t('fromPurchaseOrders') || 'From linked purchase orders'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-orange-600">
                          {/* Convert from original currency to display currency */}
                          {costBreakdown.poShippingCostsOriginal > 0 
                            ? formatCurrency(costBreakdown.poShippingCostsOriginal, costBreakdown.poShippingCostsCurrency || 'USD')
                            : formatCurrency(costBreakdown.poShippingCosts, 'EUR')
                          }
                        </p>
                        {/* Show original if display currency differs */}
                        {costBreakdown.poShippingCostsOriginal > 0 && displayCurrency !== (costBreakdown.poShippingCostsCurrency || 'USD') && (
                          <p className="text-xs text-muted-foreground">
                            ≈ {formatCurrencyUtil(costBreakdown.poShippingCostsOriginal, costBreakdown.poShippingCostsCurrency || 'USD')}
                          </p>
                        )}
                        <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-300">{t('autoIncluded') || 'Auto'}</Badge>
                      </div>
                    </div>
                  )}

                  {/* Manual Costs - FREIGHT */}
                  {(costsByType['FREIGHT'] || []).map((cost: any) => (
                    <div key={cost.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                          <Truck className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{t('freight') || 'Freight'} {cost.mode && `(${cost.mode})`}</p>
                          {cost.notes && <p className="text-xs text-muted-foreground">{cost.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-semibold text-blue-600">
                            {formatCurrency(cost.amountOriginal, cost.currency)}
                          </p>
                          {cost.currency !== 'EUR' && (
                            <p className="text-xs text-muted-foreground">≈ {formatCurrency(cost.amountBase, 'EUR')}</p>
                          )}
                        </div>
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedCost(cost); setShowAddModal(true); }} data-testid={`button-edit-cost-${cost.id}`}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCostToDelete(cost)} data-testid={`button-delete-cost-${cost.id}`}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Manual Costs - DUTY */}
                  {(costsByType['DUTY'] || []).map((cost: any) => (
                    <div key={cost.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                          <CircleDollarSign className="h-4 w-4 text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{t('duty') || 'Duty/Tax'}</p>
                          {cost.notes && <p className="text-xs text-muted-foreground">{cost.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-semibold text-red-600">
                            {formatCurrency(cost.amountOriginal, cost.currency)}
                          </p>
                          {cost.currency !== 'EUR' && (
                            <p className="text-xs text-muted-foreground">≈ {formatCurrency(cost.amountBase, 'EUR')}</p>
                          )}
                        </div>
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedCost(cost); setShowAddModal(true); }} data-testid={`button-edit-cost-${cost.id}`}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCostToDelete(cost)} data-testid={`button-delete-cost-${cost.id}`}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Manual Costs - BROKERAGE */}
                  {(costsByType['BROKERAGE'] || []).map((cost: any) => (
                    <div key={cost.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                          <Shield className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{t('customsBrokerage') || 'Customs Brokerage'}</p>
                          {cost.notes && <p className="text-xs text-muted-foreground">{cost.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-semibold text-amber-600">
                            {formatCurrency(cost.amountOriginal, cost.currency)}
                          </p>
                          {cost.currency !== 'EUR' && (
                            <p className="text-xs text-muted-foreground">≈ {formatCurrency(cost.amountBase, 'EUR')}</p>
                          )}
                        </div>
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedCost(cost); setShowAddModal(true); }} data-testid={`button-edit-cost-${cost.id}`}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCostToDelete(cost)} data-testid={`button-delete-cost-${cost.id}`}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Manual Costs - INSURANCE */}
                  {(costsByType['INSURANCE'] || []).map((cost: any) => (
                    <div key={cost.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                          <Shield className="h-4 w-4 text-teal-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{t('insurance') || 'Insurance'}</p>
                          {cost.notes && <p className="text-xs text-muted-foreground">{cost.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-semibold text-teal-600">
                            {formatCurrency(cost.amountOriginal, cost.currency)}
                          </p>
                          {cost.currency !== 'EUR' && (
                            <p className="text-xs text-muted-foreground">≈ {formatCurrency(cost.amountBase, 'EUR')}</p>
                          )}
                        </div>
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedCost(cost); setShowAddModal(true); }} data-testid={`button-edit-cost-${cost.id}`}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCostToDelete(cost)} data-testid={`button-delete-cost-${cost.id}`}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Manual Costs - PACKAGING */}
                  {(costsByType['PACKAGING'] || []).map((cost: any) => (
                    <div key={cost.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                          <Box className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{t('packaging') || 'Packaging'}</p>
                          {cost.notes && <p className="text-xs text-muted-foreground">{cost.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            {formatCurrency(cost.amountOriginal, cost.currency)}
                          </p>
                          {cost.currency !== 'EUR' && (
                            <p className="text-xs text-muted-foreground">≈ {formatCurrency(cost.amountBase, 'EUR')}</p>
                          )}
                        </div>
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedCost(cost); setShowAddModal(true); }} data-testid={`button-edit-cost-${cost.id}`}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCostToDelete(cost)} data-testid={`button-delete-cost-${cost.id}`}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Manual Costs - OTHER */}
                  {(costsByType['OTHER'] || []).map((cost: any) => (
                    <div key={cost.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                          <Package className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{t('otherCosts') || 'Other Costs'}</p>
                          {cost.notes && <p className="text-xs text-muted-foreground">{cost.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-semibold text-gray-600">
                            {formatCurrency(cost.amountOriginal, cost.currency)}
                          </p>
                          {cost.currency !== 'EUR' && (
                            <p className="text-xs text-muted-foreground">≈ {formatCurrency(cost.amountBase, 'EUR')}</p>
                          )}
                        </div>
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedCost(cost); setShowAddModal(true); }} data-testid={`button-edit-cost-${cost.id}`}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCostToDelete(cost)} data-testid={`button-delete-cost-${cost.id}`}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Empty State - Only show when there are NO costs at all */}
                  {!Number(shipmentData?.shippingCost) && 
                   !Number(shipmentData?.insuranceValue) && 
                   !Number(costBreakdown.poShippingCostsOriginal) && 
                   !Number(costBreakdown.poShippingCosts) &&
                   costs.length === 0 && (
                    <div className="py-8 text-center">
                      <CircleDollarSign className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground text-sm">{t('noCostsAddedYet') || 'No costs added yet'}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t('clickAddCostToBegin') || 'Click "Add Cost" to add shipping, customs, or other fees'}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="allocation">
            {shipmentId && <AllocationPreview shipmentId={shipmentId} />}
          </TabsContent>

          <TabsContent value="cartons">
            {shipmentId && <CartonDimensions shipmentId={shipmentId} />}
          </TabsContent>

          <TabsContent value="details" className="space-y-3">
            {/* Complete Cost Breakdown Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('completeCostBreakdown') || 'Complete Cost Breakdown'}</CardTitle>
                <CardDescription className="text-xs">
                  {t('allCostsFromAllSources') || 'All costs from shipment, purchase orders, and manual entries'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Auto-Included Costs Section */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {t('autoIncludedCosts') || 'Auto-Included Costs'}
                  </h4>
                  <div className="space-y-1.5 pl-6">
                    {/* International Transit Shipping */}
                    {Number(shipmentData?.shippingCost) > 0 && (
                      <div className="flex items-center justify-between p-2.5 border rounded-lg bg-purple-50/50 dark:bg-purple-900/10">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                            <Truck className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{t('internationalTransitShipping') || 'International Transit Shipping'}</div>
                            <div className="text-xs text-muted-foreground">{t('fromShipment') || 'From shipment record'}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-purple-600">
                            {formatCurrency(shipmentData.shippingCost, shipmentData.shippingCostCurrency || 'USD')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t('currency') || 'Currency'}: {shipmentData.shippingCostCurrency || 'USD'}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Shipment Insurance */}
                    {Number(shipmentData?.insuranceValue) > 0 && (
                      <div className="flex items-center justify-between p-2.5 border rounded-lg bg-indigo-50/50 dark:bg-indigo-900/10">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                            <Shield className="h-4 w-4 text-indigo-600" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{t('shipmentInsurance') || 'Shipment Insurance'}</div>
                            <div className="text-xs text-muted-foreground">{t('fromShipment') || 'From shipment record'}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-indigo-600">
                            {formatCurrency(shipmentData.insuranceValue, shipmentData.shippingCostCurrency || 'USD')}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* PO Shipping */}
                    {(Number(costBreakdown.poShippingCostsOriginal) > 0 || Number(costBreakdown.poShippingCosts) > 0) && (
                      <div className="flex items-center justify-between p-2.5 border rounded-lg bg-orange-50/50 dark:bg-orange-900/10">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                            <Box className="h-4 w-4 text-orange-600" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{t('purchaseOrderShipping') || 'Purchase Order Shipping'}</div>
                            <div className="text-xs text-muted-foreground">{t('fromLinkedPO') || 'From linked purchase orders'}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-orange-600">
                            {costBreakdown.poShippingCostsOriginal > 0 
                              ? formatCurrency(costBreakdown.poShippingCostsOriginal, costBreakdown.poShippingCostsCurrency || 'USD')
                              : formatCurrency(costBreakdown.poShippingCosts, 'EUR')
                            }
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t('originalCurrency') || 'Original'}: {costBreakdown.poShippingCostsCurrency || 'USD'}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* No auto-included costs */}
                    {!Number(shipmentData?.shippingCost) && 
                     !Number(shipmentData?.insuranceValue) && 
                     !Number(costBreakdown.poShippingCostsOriginal) && 
                     !Number(costBreakdown.poShippingCosts) && (
                      <p className="text-xs text-muted-foreground italic py-2">{t('noAutoIncludedCosts') || 'No auto-included costs'}</p>
                    )}
                  </div>
                </div>
                
                {/* Manually Added Costs Section */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Edit2 className="h-4 w-4 text-blue-500" />
                    {t('manuallyAddedCosts') || 'Manually Added Costs'}
                  </h4>
                  <div className="space-y-1.5 pl-6">
                    {costs.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2">
                        {t('noManualCostsAdded') || 'No manual costs added yet. Click "Add Cost" to add customs, brokerage, or other fees.'}
                      </p>
                    ) : (
                      costs.map((cost: ShipmentCost) => (
                        <div key={cost.id} className="flex items-center justify-between p-2.5 border rounded-lg hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg ${getCostColor(cost.type)}`}>
                              {getCostIcon(cost.type)}
                            </div>
                            <div>
                              <div className="font-medium text-sm">
                                {cost.type} {cost.mode && `(${cost.mode})`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatCurrencyUtil(Number(cost.amountOriginal), cost.currency)}
                                {cost.currency !== 'EUR' && (
                                  <span className="ml-1.5">
                                    → {formatCurrencyUtil(Number(cost.amountBase), 'EUR')} EUR
                                  </span>
                                )}
                              </div>
                              {cost.notes && (
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                  {cost.notes}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(cost.createdAt), 'MMM dd')}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setSelectedCost(cost);
                                setShowAddModal(true);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setCostToDelete(cost)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                {/* Cost Summary Table */}
                <div className="space-y-2 pt-2 border-t">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    {t('costSummaryByType') || 'Cost Summary by Type'}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {/* Freight Total */}
                    <div className="p-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg">
                      <div className="text-xs text-muted-foreground">{t('freight') || 'Freight'}</div>
                      <div className="font-semibold text-blue-600">
                        {formatCurrency(
                          Number(shipmentData?.shippingCost || 0) + 
                          (costBreakdown.poShippingCostsOriginal || 0) +
                          costs.filter((c: ShipmentCost) => c.type === 'FREIGHT').reduce((sum: number, c: ShipmentCost) => sum + Number(c.amountOriginal), 0),
                          shipmentData?.shippingCostCurrency || 'USD'
                        )}
                      </div>
                    </div>
                    
                    {/* Insurance Total */}
                    <div className="p-2 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg">
                      <div className="text-xs text-muted-foreground">{t('insurance') || 'Insurance'}</div>
                      <div className="font-semibold text-indigo-600">
                        {formatCurrency(
                          Number(shipmentData?.insuranceValue || 0) +
                          costs.filter((c: ShipmentCost) => c.type === 'INSURANCE').reduce((sum: number, c: ShipmentCost) => sum + Number(c.amountOriginal), 0),
                          shipmentData?.shippingCostCurrency || 'USD'
                        )}
                      </div>
                    </div>
                    
                    {/* Duty/Tax Total */}
                    <div className="p-2 bg-red-50/50 dark:bg-red-900/10 rounded-lg">
                      <div className="text-xs text-muted-foreground">{t('dutyTax') || 'Duty/Tax'}</div>
                      <div className="font-semibold text-red-600">
                        {formatCurrency(
                          costs.filter((c: ShipmentCost) => c.type === 'DUTY').reduce((sum: number, c: ShipmentCost) => sum + Number(c.amountOriginal), 0),
                          'USD'
                        )}
                      </div>
                    </div>
                    
                    {/* Brokerage Total */}
                    <div className="p-2 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg">
                      <div className="text-xs text-muted-foreground">{t('brokerage') || 'Brokerage'}</div>
                      <div className="font-semibold text-amber-600">
                        {formatCurrency(
                          costs.filter((c: ShipmentCost) => c.type === 'BROKERAGE').reduce((sum: number, c: ShipmentCost) => sum + Number(c.amountOriginal), 0),
                          'USD'
                        )}
                      </div>
                    </div>
                    
                    {/* Packaging Total */}
                    <div className="p-2 bg-green-50/50 dark:bg-green-900/10 rounded-lg">
                      <div className="text-xs text-muted-foreground">{t('packaging') || 'Packaging'}</div>
                      <div className="font-semibold text-green-600">
                        {formatCurrency(
                          costs.filter((c: ShipmentCost) => c.type === 'PACKAGING').reduce((sum: number, c: ShipmentCost) => sum + Number(c.amountOriginal), 0),
                          'USD'
                        )}
                      </div>
                    </div>
                    
                    {/* Other Total */}
                    <div className="p-2 bg-gray-50/50 dark:bg-gray-800/30 rounded-lg">
                      <div className="text-xs text-muted-foreground">{t('other') || 'Other'}</div>
                      <div className="font-semibold text-gray-600">
                        {formatCurrency(
                          costs.filter((c: ShipmentCost) => c.type === 'OTHER').reduce((sum: number, c: ShipmentCost) => sum + Number(c.amountOriginal), 0),
                          'USD'
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Grand Total */}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                    <div className="font-medium">{t('grandTotal') || 'Grand Total (All Costs)'}</div>
                    <div className="text-xl font-bold text-primary">
                      {(() => {
                        const shipmentCost = Number(shipmentData?.shippingCost || 0);
                        const insuranceCost = Number(shipmentData?.insuranceValue || 0);
                        const poShippingCost = Number(costBreakdown.poShippingCostsOriginal || 0);
                        const manualCostsTotal = costs.reduce((sum: number, cost: any) => sum + Number(cost.amountOriginal || 0), 0);
                        return formatCurrency(shipmentCost + insuranceCost + poShippingCost + manualCostsTotal, shipmentData?.shippingCostCurrency || 'USD');
                      })()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit Cost Modal */}
      {showAddModal && shipmentId && (
        <AddCostModal
          shipmentId={shipmentId}
          cost={selectedCost}
          onClose={() => {
            setShowAddModal(false);
            setSelectedCost(null);
          }}
          onSave={async () => {
            // Auto-trigger landing cost calculation
            try {
              await apiRequest('POST', `/api/imports/shipments/${shipmentId}/calculate-landing-costs`);
              toast({
                title: t('costSaved'),
                description: t('landingCostsRecalculatedAutomatically')
              });
            } catch (error: any) {
              console.error('Auto-calculation failed:', error);
              toast({
                title: t('warning'),
                description: t('costSavedButCalculationFailed', { 
                  error: error.message || 'Unknown error'
                }),
                variant: "destructive"
              });
            }
            
            queryClient.invalidateQueries({ queryKey: [`/api/imports/shipments/${shipmentId}/costs`] });
            queryClient.invalidateQueries({ queryKey: [`/api/imports/shipments/${shipmentId}/landing-cost-summary`] });
            queryClient.invalidateQueries({ queryKey: [`/api/imports/shipments/${shipmentId}/landing-cost-preview`] });
            queryClient.invalidateQueries({ queryKey: [`/api/imports/shipments/${shipmentId}/cost-sources`] });
            onUpdate?.();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!costToDelete} onOpenChange={() => setCostToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteCostQuestion')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteCostConfirmation', {
                type: costToDelete?.type.toLowerCase(),
                amount: costToDelete && formatCurrency(costToDelete.amountOriginal, costToDelete.currency)
              })} {t('cannotBeUndone')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => costToDelete && deleteCostMutation.mutate(costToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CostsPanel;