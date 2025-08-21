import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/currencyUtils";
import { format } from "date-fns";
import { 
  ArrowLeft,
  Package,
  Calculator,
  DollarSign,
  Ship,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  Lock,
  Unlock,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Save,
  Globe,
  FileText,
  Activity,
  TrendingUp,
  Weight,
  Hash
} from "lucide-react";

interface ImportOrderItem {
  id: string;
  productId?: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitCost: string;
  weight?: string;
  totalCost: string;
  calculatedUnitCost?: string;
  receivedQuantity?: number;
  status?: string;
}

interface LandedCostCalculation {
  id: string;
  calculationType: string;
  productValue: string;
  shippingCost: string;
  customsDuty?: string;
  taxes?: string;
  otherFees?: string;
  totalLandedCost: string;
  isLocked: boolean;
  autoUpdate: boolean;
  calculationDetails?: any;
}

export default function ImportOrderDetails() {
  const { id } = useParams();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // State for real-time calculation
  const [shippingCost, setShippingCost] = useState("0");
  const [customsDuty, setCustomsDuty] = useState("0");
  const [taxes, setTaxes] = useState("0");
  const [otherFees, setOtherFees] = useState("0");
  const [calculationType, setCalculationType] = useState<string>("by_value");
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationDebounceTimer, setCalculationDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Fetch order details
  const { data: order, isLoading } = useQuery({
    queryKey: ['/api/import-orders', id],
    queryFn: async () => {
      const response = await fetch(`/api/import-orders/${id}`);
      if (!response.ok) throw new Error('Failed to fetch import order');
      return response.json();
    }
  });

  // Initialize state from order data
  useEffect(() => {
    if (order?.calculation) {
      setShippingCost(order.calculation.shippingCost || "0");
      setCustomsDuty(order.calculation.customsDuty || "0");
      setTaxes(order.calculation.taxes || "0");
      setOtherFees(order.calculation.otherFees || "0");
      setCalculationType(order.calculation.calculationType || "by_value");
    } else if (order) {
      setShippingCost(order.shippingCost || "0");
    }
  }, [order]);

  // Calculate landed cost mutation
  const calculateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/import-orders/${id}/calculate`, 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/import-orders', id] });
      setIsCalculating(false);
    },
    onError: () => {
      setIsCalculating(false);
    }
  });

  // Real-time calculation trigger
  const triggerCalculation = useCallback(() => {
    if (!order?.items?.length) return;

    setIsCalculating(true);
    
    // Clear existing timer
    if (calculationDebounceTimer) {
      clearTimeout(calculationDebounceTimer);
    }

    // Set new timer for debounced calculation
    const timer = setTimeout(() => {
      calculateMutation.mutate({
        calculationType,
        shippingCost: parseFloat(shippingCost) || 0,
        customsDuty: parseFloat(customsDuty) || 0,
        taxes: parseFloat(taxes) || 0,
        otherFees: parseFloat(otherFees) || 0
      });
    }, 500); // 500ms debounce

    setCalculationDebounceTimer(timer);
  }, [order, calculationType, shippingCost, customsDuty, taxes, otherFees]);

  // Trigger calculation on input changes
  useEffect(() => {
    if (order?.items?.length && !order?.calculation?.isLocked) {
      triggerCalculation();
    }
  }, [calculationType, shippingCost, customsDuty, taxes, otherFees]);

  // Lock calculation mutation
  const lockCalculationMutation = useMutation({
    mutationFn: async () => {
      if (!order?.calculation?.id) throw new Error('No calculation to lock');
      return apiRequest(`/api/landed-cost-calculations/${order.calculation.id}/lock`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/import-orders', id] });
      toast({
        title: "Calculation Locked",
        description: "The landed cost calculation has been locked."
      });
    }
  });

  // Mark as received mutation
  const markReceivedMutation = useMutation({
    mutationFn: async (itemIds: string[]) => {
      return apiRequest(`/api/import-orders/${id}/receive`, 'POST', { itemIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/import-orders', id] });
      toast({
        title: "Items Marked as Received",
        description: "The selected items have been marked as received."
      });
    }
  });

  // Add to inventory mutation
  const addToInventoryMutation = useMutation({
    mutationFn: async (itemIds: string[]) => {
      return apiRequest(`/api/import-orders/${id}/add-to-inventory`, 'POST', { itemIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/import-orders', id] });
      toast({
        title: "Added to Inventory",
        description: "Items have been successfully added to inventory.",
        variant: "default"
      });
    }
  });

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async (updates: any) => {
      return apiRequest(`/api/import-orders/${id}`, 'PATCH', updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/import-orders', id] });
      toast({
        title: "Order Updated",
        description: "Import order has been updated successfully."
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading import order...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Import order not found.</AlertDescription>
      </Alert>
    );
  }

  const items = order.items || [];
  const calculation = order.calculation;
  const productValue = items.reduce((sum: number, item: ImportOrderItem) => 
    sum + parseFloat(item.totalCost || '0'), 0
  );
  const totalAdditionalCosts = 
    parseFloat(shippingCost) + 
    parseFloat(customsDuty) + 
    parseFloat(taxes) + 
    parseFloat(otherFees);
  const estimatedLandedCost = productValue + totalAdditionalCosts;

  // Calculate progress
  const receivedItems = items.filter((item: ImportOrderItem) => item.status === 'received').length;
  const inventoryAddedItems = items.filter((item: ImportOrderItem) => item.inventoryAdded).length;
  const progressPercentage = items.length > 0 ? (receivedItems / items.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/imports">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Imports
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Import Order {order.orderNumber}</h1>
            <p className="text-gray-500">
              Created {format(new Date(order.createdAt), 'MMM dd, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {order.status === 'delivered' && (
            <Link href={`/imports/orders/${id}/receive`}>
              <Button variant="outline">
                <CheckCircle className="h-4 w-4 mr-2" />
                Receive Items
              </Button>
            </Link>
          )}
          <Link href={`/imports/orders/${id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Progress Card */}
      {progressPercentage > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Receiving Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{receivedItems} of {items.length} items received</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              {inventoryAddedItems > 0 && (
                <p className="text-sm text-green-600">
                  ✓ {inventoryAddedItems} items added to inventory
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="calculation">Cost Calculation</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Order Details */}
            <Card>
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    <Badge className="text-sm">{order.status}</Badge>
                  </div>
                </div>
                <div>
                  <Label>Supplier</Label>
                  <p className="text-sm">{order.supplier?.name || '-'}</p>
                </div>
                <div>
                  <Label>Warehouse</Label>
                  <p className="text-sm">{order.warehouse?.name || '-'}</p>
                </div>
                <div>
                  <Label>Region</Label>
                  <div className="flex items-center gap-1">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{order.region || '-'}</span>
                  </div>
                </div>
                <div>
                  <Label>Currency</Label>
                  <p className="text-sm font-medium">{order.currency}</p>
                </div>
              </CardContent>
            </Card>

            {/* Cost Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Cost Summary</CardTitle>
                <CardDescription>
                  {isCalculating && (
                    <span className="text-blue-600 flex items-center gap-1">
                      <Activity className="h-3 w-3 animate-pulse" />
                      Calculating...
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Product Value</span>
                  <span className="font-medium">
                    {formatCurrency(productValue, order.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Shipping Cost</span>
                  <span className="font-medium">
                    {formatCurrency(parseFloat(shippingCost), order.currency)}
                  </span>
                </div>
                {parseFloat(customsDuty) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Customs Duty</span>
                    <span className="font-medium">
                      {formatCurrency(parseFloat(customsDuty), order.currency)}
                    </span>
                  </div>
                )}
                {parseFloat(taxes) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Taxes</span>
                    <span className="font-medium">
                      {formatCurrency(parseFloat(taxes), order.currency)}
                    </span>
                  </div>
                )}
                {parseFloat(otherFees) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Other Fees</span>
                    <span className="font-medium">
                      {formatCurrency(parseFloat(otherFees), order.currency)}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Landed Cost</span>
                  <span className="text-green-600">
                    {formatCurrency(
                      calculation?.totalLandedCost ? parseFloat(calculation.totalLandedCost) : estimatedLandedCost,
                      order.currency
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {order.status === 'pending' && (
                  <Button 
                    variant="outline"
                    onClick={() => updateOrderMutation.mutate({ status: 'ordered' })}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Mark as Ordered
                  </Button>
                )}
                {order.status === 'ordered' && (
                  <Button 
                    variant="outline"
                    onClick={() => updateOrderMutation.mutate({ status: 'shipped' })}
                  >
                    <Ship className="h-4 w-4 mr-2" />
                    Mark as Shipped
                  </Button>
                )}
                {order.status === 'shipped' && (
                  <Button 
                    variant="outline"
                    onClick={() => updateOrderMutation.mutate({ status: 'delivered' })}
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Mark as Delivered
                  </Button>
                )}
                {order.status === 'delivered' && receivedItems === items.length && inventoryAddedItems < items.length && (
                  <Button 
                    onClick={() => {
                      const itemIds = items.map((item: ImportOrderItem) => item.id);
                      addToInventoryMutation.mutate(itemIds);
                    }}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Add All to Inventory
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Order Items ({items.length})</CardTitle>
                <Link href={`/imports/orders/${id}/add-item`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="text-right">Landed Unit Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: ImportOrderItem) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>{item.sku || '-'}</TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                        {item.receivedQuantity !== undefined && item.receivedQuantity !== item.quantity && (
                          <span className="text-xs text-gray-500 block">
                            ({item.receivedQuantity} received)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(parseFloat(item.unitCost), order.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.weight ? `${item.weight} kg` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(parseFloat(item.totalCost), order.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.calculatedUnitCost ? (
                          <div>
                            <div className="font-medium text-green-600">
                              {formatCurrency(parseFloat(item.calculatedUnitCost), order.currency)}
                            </div>
                            <div className="text-xs text-gray-500">
                              +{((parseFloat(item.calculatedUnitCost) / parseFloat(item.unitCost) - 1) * 100).toFixed(1)}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.status === 'received' ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Received
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Calculation Tab */}
        <TabsContent value="calculation" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Landed Cost Calculator</CardTitle>
                  <CardDescription>
                    Real-time calculation updates as you type
                  </CardDescription>
                </div>
                {calculation?.isLocked ? (
                  <Badge className="bg-red-100 text-red-800">
                    <Lock className="h-3 w-3 mr-1" />
                    Locked
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => lockCalculationMutation.mutate()}
                    disabled={!calculation}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Lock Calculation
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Calculation Type */}
              <div>
                <Label>Calculation Method</Label>
                <Select 
                  value={calculationType} 
                  onValueChange={setCalculationType}
                  disabled={calculation?.isLocked}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="by_value">By Value (Proportional to cost)</SelectItem>
                    <SelectItem value="by_quantity">By Quantity (Equal per unit)</SelectItem>
                    <SelectItem value="by_weight">By Weight (Based on weight)</SelectItem>
                    <SelectItem value="manual">Manual (Custom allocation)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Determines how additional costs are allocated to each item
                </p>
              </div>

              {/* Cost Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Shipping Cost</Label>
                  <div className="relative mt-1">
                    <Ship className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="number"
                      value={shippingCost}
                      onChange={(e) => setShippingCost(e.target.value)}
                      className="pl-9"
                      disabled={calculation?.isLocked}
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <Label>Customs Duty</Label>
                  <div className="relative mt-1">
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="number"
                      value={customsDuty}
                      onChange={(e) => setCustomsDuty(e.target.value)}
                      className="pl-9"
                      disabled={calculation?.isLocked}
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <Label>Taxes</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="number"
                      value={taxes}
                      onChange={(e) => setTaxes(e.target.value)}
                      className="pl-9"
                      disabled={calculation?.isLocked}
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <Label>Other Fees</Label>
                  <div className="relative mt-1">
                    <Calculator className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="number"
                      value={otherFees}
                      onChange={(e) => setOtherFees(e.target.value)}
                      className="pl-9"
                      disabled={calculation?.isLocked}
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              {/* Calculation Summary */}
              <Card className="bg-gray-50">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-lg">
                      <span>Product Value</span>
                      <span className="font-medium">
                        {formatCurrency(productValue, order.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg">
                      <span>Additional Costs</span>
                      <span className="font-medium text-orange-600">
                        +{formatCurrency(totalAdditionalCosts, order.currency)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-xl font-bold">
                      <span>Total Landed Cost</span>
                      <span className="text-green-600">
                        {formatCurrency(
                          calculation?.totalLandedCost ? parseFloat(calculation.totalLandedCost) : estimatedLandedCost,
                          order.currency
                        )}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 text-center">
                      <TrendingUp className="h-4 w-4 inline mr-1" />
                      {((totalAdditionalCosts / productValue) * 100).toFixed(1)}% markup on product value
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Per-Item Breakdown */}
              {calculation?.calculationDetails?.items && (
                <div>
                  <h3 className="font-medium mb-3">Per-Item Cost Breakdown</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Original Cost</TableHead>
                        <TableHead className="text-right">Allocated Cost</TableHead>
                        <TableHead className="text-right">Total Landed</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calculation.calculationDetails.items.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.originalCost, order.currency)}
                          </TableCell>
                          <TableCell className="text-right text-orange-600">
                            +{formatCurrency(parseFloat(item.allocatedCost), order.currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(parseFloat(item.totalLandedCost), order.currency)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {formatCurrency(parseFloat(item.calculatedUnitCost), order.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tracking Tab */}
        <TabsContent value="tracking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shipment Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tracking Number</Label>
                <p className="text-sm font-medium mt-1">
                  {order.trackingNumber || 'Not available'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Estimated Arrival</Label>
                  <p className="text-sm mt-1">
                    {order.estimatedArrival 
                      ? format(new Date(order.estimatedArrival), 'MMM dd, yyyy')
                      : 'Not set'}
                  </p>
                </div>
                <div>
                  <Label>Actual Arrival</Label>
                  <p className="text-sm mt-1">
                    {order.actualArrival 
                      ? format(new Date(order.actualArrival), 'MMM dd, yyyy')
                      : 'Not arrived'}
                  </p>
                </div>
              </div>
              {order.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}