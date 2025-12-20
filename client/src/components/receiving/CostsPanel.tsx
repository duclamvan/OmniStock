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
  Download
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

interface ShipmentCost {
  id: number;
  shipmentId: string;
  type: 'FREIGHT' | 'BROKERAGE' | 'INSURANCE' | 'PACKAGING' | 'OTHER';
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
  const [displayCurrency, setDisplayCurrency] = useState<'EUR' | 'CZK'>('EUR');

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

  const hasAnyCosts = costs.length > 0;
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
            <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/30">
              <Button
                variant={displayCurrency === 'EUR' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDisplayCurrency('EUR')}
                className={displayCurrency === 'EUR' ? 'h-7' : 'h-7 hover:bg-muted'}
                data-testid="button-currency-eur"
              >
                EUR €
              </Button>
              <Button
                variant={displayCurrency === 'CZK' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDisplayCurrency('CZK')}
                className={displayCurrency === 'CZK' ? 'h-7' : 'h-7 hover:bg-muted'}
                data-testid="button-currency-czk"
              >
                CZK Kč
              </Button>
            </div>
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

        {/* Summary Card */}
        {summary && hasAnyCosts && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('totalCost')}</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(summary.totalCost || 0, summary.baseCurrency || 'EUR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('items')}</p>
                  <p className="text-xl font-semibold">{summary.itemCount || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('displayCurrency')}</p>
                  <p className="text-xl font-semibold">{displayCurrency}</p>
                </div>
                {summary.lastCalculated && (
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

          <TabsContent value="overview" className="space-y-3">
            {/* Compact Cost Category Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Freight */}
              {(() => {
                const freightCosts = costsByType['FREIGHT'] || [];
                const total = freightCosts.reduce((sum, cost) => sum + parseFloat(cost.amountBase), 0);
                
                return (
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Truck className="h-4 w-4 text-blue-600" />
                        <h3 className="font-semibold text-sm">{t('freight')}</h3>
                        {freightCosts.length > 0 && (
                          <Badge variant="secondary" className="text-xs h-4 px-1.5">{freightCosts.length}</Badge>
                        )}
                      </div>
                      <div className="text-xl font-bold text-blue-600 mb-2">
                        {total > 0 ? formatCurrency(total, 'EUR') : '—'}
                      </div>
                      {freightCosts.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{t('noCostsLabel')}</p>
                      ) : (
                        <div className="space-y-1.5">
                          {freightCosts.map(cost => (
                            <div key={cost.id} className="flex items-start justify-between gap-2 text-xs">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="font-medium truncate">
                                    {formatCurrency(cost.amountOriginal, cost.currency)}
                                  </span>
                                  {cost.mode && (
                                    <Badge variant="outline" className="text-[10px] h-4 px-1">{cost.mode}</Badge>
                                  )}
                                </div>
                                {cost.notes && <p className="text-[10px] text-muted-foreground truncate">{cost.notes}</p>}
                              </div>
                              <div className="flex gap-0.5 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => { setSelectedCost(cost); setShowAddModal(true); }}
                                  data-testid={`button-edit-cost-${cost.id}`}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => setCostToDelete(cost)}
                                  data-testid={`button-delete-cost-${cost.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Customs */}
              {(() => {
                const brokerageCosts = costsByType['BROKERAGE'] || [];
                const insuranceCosts = costsByType['INSURANCE'] || [];
                const allCosts = [...brokerageCosts, ...insuranceCosts];
                const total = allCosts.reduce((sum, cost) => sum + parseFloat(cost.amountBase), 0);
                
                return (
                  <Card className="border-l-4 border-l-amber-500">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-amber-600" />
                        <h3 className="font-semibold text-sm">{t('customs')}</h3>
                        {allCosts.length > 0 && (
                          <Badge variant="secondary" className="text-xs h-4 px-1.5">{allCosts.length}</Badge>
                        )}
                      </div>
                      <div className="text-xl font-bold text-amber-600 mb-2">
                        {total > 0 ? formatCurrency(total, 'EUR') : '—'}
                      </div>
                      {allCosts.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{t('noCostsLabel')}</p>
                      ) : (
                        <div className="space-y-1.5">
                          {allCosts.map(cost => (
                            <div key={cost.id} className="flex items-start justify-between gap-2 text-xs">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="font-medium truncate">
                                    {formatCurrency(cost.amountOriginal, cost.currency)}
                                  </span>
                                  <Badge variant="outline" className="text-[10px] h-4 px-1">{cost.type}</Badge>
                                </div>
                                {cost.notes && <p className="text-[10px] text-muted-foreground truncate">{cost.notes}</p>}
                              </div>
                              <div className="flex gap-0.5 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => { setSelectedCost(cost); setShowAddModal(true); }}
                                  data-testid={`button-edit-cost-${cost.id}`}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => setCostToDelete(cost)}
                                  data-testid={`button-delete-cost-${cost.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Other */}
              {(() => {
                const packagingCosts = costsByType['PACKAGING'] || [];
                const otherCosts = costsByType['OTHER'] || [];
                const allCosts = [...packagingCosts, ...otherCosts];
                const total = allCosts.reduce((sum, cost) => sum + parseFloat(cost.amountBase), 0);
                
                return (
                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-4 w-4 text-green-600" />
                        <h3 className="font-semibold text-sm">{t('other')}</h3>
                        {allCosts.length > 0 && (
                          <Badge variant="secondary" className="text-xs h-4 px-1.5">{allCosts.length}</Badge>
                        )}
                      </div>
                      <div className="text-xl font-bold text-green-600 mb-2">
                        {total > 0 ? formatCurrency(total, 'EUR') : '—'}
                      </div>
                      {allCosts.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{t('noCostsLabel')}</p>
                      ) : (
                        <div className="space-y-1.5">
                          {allCosts.map(cost => (
                            <div key={cost.id} className="flex items-start justify-between gap-2 text-xs">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="font-medium truncate">
                                    {formatCurrency(cost.amountOriginal, cost.currency)}
                                  </span>
                                  <Badge variant="outline" className="text-[10px] h-4 px-1">{cost.type}</Badge>
                                </div>
                                {cost.notes && <p className="text-[10px] text-muted-foreground truncate">{cost.notes}</p>}
                              </div>
                              <div className="flex gap-0.5 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => { setSelectedCost(cost); setShowAddModal(true); }}
                                  data-testid={`button-edit-cost-${cost.id}`}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => setCostToDelete(cost)}
                                  data-testid={`button-delete-cost-${cost.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          </TabsContent>

          <TabsContent value="allocation">
            {shipmentId && <AllocationPreview shipmentId={shipmentId} />}
          </TabsContent>

          <TabsContent value="cartons">
            {shipmentId && <CartonDimensions shipmentId={shipmentId} />}
          </TabsContent>

          <TabsContent value="details" className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('costBreakdown')}</CardTitle>
                <CardDescription className="text-xs">
                  {t('detailedViewOfCostLines')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {costs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6 text-sm">
                    {t('noCostsAddedYet')}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {costs.map((cost: ShipmentCost) => (
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
                              {formatCurrency(cost.amountOriginal, cost.currency)}
                              {cost.currency !== 'EUR' && (
                                <span className="ml-1.5">
                                  → {formatCurrency(cost.amountBase, 'EUR')}
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
                    ))}
                  </div>
                )}
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