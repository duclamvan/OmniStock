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
  Download,
  RefreshCcw
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
    onSuccess: () => {
      toast({
        title: "Cost Deleted",
        description: "Cost line has been removed"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/imports/shipments/${shipmentId}/costs`] });
      queryClient.invalidateQueries({ queryKey: [`/api/imports/shipments/${shipmentId}/landing-cost-summary`] });
      setCostToDelete(null);
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

  // Calculate landing costs mutation
  const calculateCostsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/imports/shipments/${shipmentId}/calculate-landing-costs`);
    },
    onSuccess: () => {
      toast({
        title: "Landing Costs Calculated",
        description: "Costs have been allocated to items"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/imports/shipments/${shipmentId}/costs`] });
      queryClient.invalidateQueries({ queryKey: [`/api/imports/shipments/${shipmentId}/landing-cost-summary`] });
      queryClient.invalidateQueries({ queryKey: [`/api/imports/shipments/${shipmentId}/landing-cost-preview`] });
      onUpdate?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to calculate landing costs",
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
              variant="outline"
              size="sm"
              onClick={() => setShowAddModal(true)}
              data-testid="button-add-cost"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Cost
            </Button>
            {hasAnyCosts && (
              <Button
                variant="default"
                size="sm"
                onClick={() => calculateCostsMutation.mutate()}
                disabled={calculateCostsMutation.isPending}
                data-testid="button-calculate-costs"
              >
                {calculateCostsMutation.isPending ? (
                  <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Calculator className="h-4 w-4 mr-2" />
                )}
                Recalculate
              </Button>
            )}
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

          <TabsContent value="overview" className="space-y-4">
            {/* Cost Type Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {['FREIGHT', 'BROKERAGE', 'INSURANCE', 'PACKAGING', 'OTHER'].map(type => {
                const typeCosts = costsByType[type] || [];
                const totalOriginal = typeCosts.reduce((sum, cost) => {
                  return sum + parseFloat(cost.amountOriginal);
                }, 0);
                const totalBase = typeCosts.reduce((sum, cost) => {
                  return sum + parseFloat(cost.amountBase);
                }, 0);

                return (
                  <Card key={type} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${getCostColor(type)}`}>
                            {getCostIcon(type)}
                          </div>
                          <CardTitle className="text-base">
                            {type.charAt(0) + type.slice(1).toLowerCase()}
                          </CardTitle>
                        </div>
                        {typeCosts.length > 0 && (
                          <Badge variant="secondary">{typeCosts.length}</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {typeCosts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No costs added</p>
                      ) : (
                        <div className="space-y-3">
                          {typeCosts.map(cost => (
                            <div key={cost.id} className="border rounded-lg p-3 space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {formatCurrency(cost.amountOriginal, cost.currency)}
                                    </span>
                                    {cost.mode && (
                                      <Badge variant="outline" className="text-xs">
                                        {cost.mode}
                                      </Badge>
                                    )}
                                  </div>
                                  {cost.fxRateUsed && cost.currency !== 'EUR' && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="text-xs text-muted-foreground cursor-help">
                                            FX: 1 {cost.currency} = {cost.fxRateUsed} EUR
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Exchange rate at calculation time</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                  <div className="text-sm font-medium text-green-600">
                                    = {formatCurrency(cost.amountBase, 'EUR')}
                                  </div>
                                  {cost.notes && (
                                    <p className="text-xs text-muted-foreground mt-1">{cost.notes}</p>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setSelectedCost(cost);
                                      setShowAddModal(true);
                                    }}
                                    data-testid={`button-edit-cost-${cost.id}`}
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setCostToDelete(cost)}
                                    data-testid={`button-delete-cost-${cost.id}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                          {typeCosts.length > 1 && (
                            <div className="pt-2 border-t">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total</span>
                                <span className="font-medium">
                                  {formatCurrency(totalBase, 'EUR')}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="allocation">
            {shipmentId && <AllocationPreview shipmentId={shipmentId} />}
          </TabsContent>

          <TabsContent value="cartons">
            {shipmentId && <CartonDimensions shipmentId={shipmentId} />}
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
                <CardDescription>
                  Detailed view of all cost lines
                </CardDescription>
              </CardHeader>
              <CardContent>
                {costs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No costs have been added yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {costs.map((cost: ShipmentCost) => (
                      <div key={cost.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${getCostColor(cost.type)}`}>
                            {getCostIcon(cost.type)}
                          </div>
                          <div>
                            <div className="font-medium">
                              {cost.type} {cost.mode && `(${cost.mode})`}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatCurrency(cost.amountOriginal, cost.currency)}
                              {cost.currency !== 'EUR' && (
                                <span className="ml-2">
                                  → {formatCurrency(cost.amountBase, 'EUR')}
                                </span>
                              )}
                            </div>
                            {cost.notes && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {cost.notes}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(cost.createdAt), 'MMM dd')}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
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
                            className="h-8 w-8"
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
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: [`/api/imports/shipments/${shipmentId}/costs`] });
            queryClient.invalidateQueries({ queryKey: [`/api/imports/shipments/${shipmentId}/landing-cost-summary`] });
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