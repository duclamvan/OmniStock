import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { formatCurrency } from "@/lib/currencyUtils";
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
  shipmentId: number;
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
  shipmentId?: number;
  receiptId?: number;
  onUpdate?: () => void;
}

const CostsPanel = ({ shipmentId, receiptId, onUpdate }: CostsPanelProps) => {
  const { toast } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCost, setSelectedCost] = useState<ShipmentCost | null>(null);
  const [costToDelete, setCostToDelete] = useState<ShipmentCost | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [hasAutoCreatedFreight, setHasAutoCreatedFreight] = useState(false);

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

  // Auto-create freight cost from shipment data
  useEffect(() => {
    if (shipmentData && !hasAutoCreatedFreight && costs.length === 0) {
      // Check if shipment has shipping cost
      if (shipmentData.shippingCost && parseFloat(shipmentData.shippingCost) > 0) {
        const freightCost = {
          type: 'FREIGHT',
          mode: shipmentData.shipmentType?.includes('air') ? 'AIR' : 
                shipmentData.shipmentType?.includes('sea') ? 'SEA' : 
                shipmentData.shipmentType?.includes('rail') ? 'RAIL' : 'COURIER',
          amountOriginal: parseFloat(shipmentData.shippingCost),
          currency: shipmentData.shippingCostCurrency || 'USD',
          notes: `Auto-populated from shipment: ${shipmentData.shipmentName || 'N/A'}`,
          volumetricDivisor: shipmentData.shipmentType?.includes('air') ? 6000 : 
                            shipmentData.shipmentType?.includes('express') ? 5000 : 1000
        };
        
        // Create the freight cost
        fetch(`/api/imports/shipments/${shipmentId}/costs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(freightCost),
          credentials: 'include'
        }).then(async (res) => {
          if (!res.ok) throw new Error('Failed to create freight cost');
          setHasAutoCreatedFreight(true);
          
          // Auto-trigger landing cost calculation after creating freight cost
          try {
            const calcResponse = await fetch(`/api/imports/shipments/${shipmentId}/calculate-landing-costs`, {
              method: 'POST',
              credentials: 'include'
            });
            
            if (calcResponse.ok) {
              toast({
                title: "Landing Costs Calculated",
                description: `Freight cost of ${formatCurrency(freightCost.amountOriginal, freightCost.currency)} added and allocated to items`
              });
            } else {
              throw new Error('Calculation failed');
            }
          } catch (calcError) {
            console.error('Failed to auto-calculate landing costs:', calcError);
            toast({
              title: "Freight Cost Added",
              description: `Shipping cost of ${formatCurrency(freightCost.amountOriginal, freightCost.currency)} added. Click Recalculate to allocate costs to items.`
            });
          }
          
          // Refresh all data
          queryClient.invalidateQueries({ queryKey: [`/api/imports/shipments/${shipmentId}/costs`] });
          queryClient.invalidateQueries({ queryKey: [`/api/imports/shipments/${shipmentId}/landing-cost-summary`] });
          queryClient.invalidateQueries({ queryKey: [`/api/imports/shipments/${shipmentId}/landing-cost-preview`] });
          onUpdate?.();
        }).catch((error) => {
          console.error('Failed to auto-create freight cost:', error);
        });
      }
    }
  }, [shipmentData, hasAutoCreatedFreight, costs.length, shipmentId, toast]);

  // Delete cost mutation
  const deleteCostMutation = useMutation({
    mutationFn: async (costId: number) => {
      return apiRequest('DELETE', `/api/imports/shipments/${shipmentId}/costs/${costId}`);
    },
    onSuccess: async () => {
      toast({
        title: "Cost Deleted",
        description: "Recalculating landing costs..."
      });
      setCostToDelete(null);
      
      // Auto-trigger landing cost calculation
      try {
        await apiRequest('POST', `/api/imports/shipments/${shipmentId}/calculate-landing-costs`);
        toast({
          title: "Updated",
          description: "Cost deleted and landing costs recalculated"
        });
      } catch (error) {
        console.error('Auto-calculation failed:', error);
      }
      
      queryClient.invalidateQueries({ queryKey: [`/api/imports/shipments/${shipmentId}/costs`] });
      queryClient.invalidateQueries({ queryKey: [`/api/imports/shipments/${shipmentId}/landing-cost-summary`] });
      queryClient.invalidateQueries({ queryKey: [`/api/imports/shipments/${shipmentId}/landing-cost-preview`] });
      onUpdate?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete cost",
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(value);
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
            <h3 className="text-xl font-semibold">Landing Costs</h3>
            {hasAnyCosts ? (
              isCalculated ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Costed ✓
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Pending ⚠️
                </Badge>
              )
            ) : (
              <Badge variant="secondary">
                <AlertCircle className="h-3 w-3 mr-1" />
                No Costs
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="default"
              size="default"
              onClick={() => setShowAddModal(true)}
              data-testid="button-add-cost"
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Cost
            </Button>
          </div>
        </div>

        {/* Summary Card */}
        {summary && hasAnyCosts && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(summary.totalCost || 0, summary.baseCurrency || 'EUR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Items</p>
                  <p className="text-xl font-semibold">{summary.itemCount || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Base Currency</p>
                  <p className="text-xl font-semibold">{summary.baseCurrency || 'EUR'}</p>
                </div>
                {summary.lastCalculated && (
                  <div>
                    <p className="text-sm text-muted-foreground">Last Calculated</p>
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
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="allocation">Allocation</TabsTrigger>
            <TabsTrigger value="cartons">Cartons</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
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
                        <h3 className="font-semibold text-sm">Freight</h3>
                        {freightCosts.length > 0 && (
                          <Badge variant="secondary" className="text-xs h-4 px-1.5">{freightCosts.length}</Badge>
                        )}
                      </div>
                      <div className="text-xl font-bold text-blue-600 mb-2">
                        {total > 0 ? formatCurrency(total, 'EUR') : '—'}
                      </div>
                      {freightCosts.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No costs</p>
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
                        <h3 className="font-semibold text-sm">Customs</h3>
                        {allCosts.length > 0 && (
                          <Badge variant="secondary" className="text-xs h-4 px-1.5">{allCosts.length}</Badge>
                        )}
                      </div>
                      <div className="text-xl font-bold text-amber-600 mb-2">
                        {total > 0 ? formatCurrency(total, 'EUR') : '—'}
                      </div>
                      {allCosts.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No costs</p>
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
                        <h3 className="font-semibold text-sm">Other</h3>
                        {allCosts.length > 0 && (
                          <Badge variant="secondary" className="text-xs h-4 px-1.5">{allCosts.length}</Badge>
                        )}
                      </div>
                      <div className="text-xl font-bold text-green-600 mb-2">
                        {total > 0 ? formatCurrency(total, 'EUR') : '—'}
                      </div>
                      {allCosts.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No costs</p>
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
                <CardTitle className="text-base">Cost Breakdown</CardTitle>
                <CardDescription className="text-xs">
                  Detailed view of all cost lines
                </CardDescription>
              </CardHeader>
              <CardContent>
                {costs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6 text-sm">
                    No costs have been added yet
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
                title: "Cost Saved",
                description: "Landing costs recalculated automatically"
              });
            } catch (error) {
              console.error('Auto-calculation failed:', error);
              toast({
                title: "Cost Saved",
                description: "Cost saved but calculation failed"
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
            <AlertDialogTitle>Delete Cost?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {costToDelete?.type.toLowerCase()} cost of {' '}
              {costToDelete && formatCurrency(costToDelete.amountOriginal, costToDelete.currency)}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => costToDelete && deleteCostMutation.mutate(costToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CostsPanel;