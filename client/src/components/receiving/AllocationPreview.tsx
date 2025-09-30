import { useState, useMemo, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Download,
  AlertTriangle,
  Info,
  Package,
  Weight,
  Box,
  DollarSign,
  Calculator,
  AlertCircle,
  Scale,
  Boxes,
  TrendingUp,
  Shuffle,
  Layers,
  Cpu,
  CheckCircle2,
  HelpCircle
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ItemAllocation {
  purchaseItemId: number;
  sku: string;
  name: string;
  quantity: number;
  actualWeightKg: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  freightAllocated: number;
  dutyAllocated: number;
  brokerageAllocated: number;
  insuranceAllocated: number;
  packagingAllocated: number;
  otherAllocated: number;
  totalAllocated: number;
  landingCostPerUnit: number;
  warnings: string[];
}

interface AllocationMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  explanation: string;
  bestFor: string[];
  costTypes?: string[];
}

interface AllocationSummary {
  shipmentId: number;
  totalItems: number;
  totalUnits: number;
  totalActualWeight: number;
  totalVolumetricWeight: number;
  totalChargeableWeight: number;
  totalCosts: {
    freight: number;
    duty: number;
    brokerage: number;
    insurance: number;
    packaging: number;
    other: number;
    total: number;
  };
  baseCurrency: string;
  calculatedAt?: string;
  items: ItemAllocation[];
  selectedMethod?: string;
  autoSelectedMethod?: string;
  methodReasoning?: string;
  availableMethods?: string[];
}

interface AllocationPreviewProps {
  shipmentId: number;
}

// Define available allocation methods
const ALLOCATION_METHODS: AllocationMethod[] = [
  {
    id: 'PER_UNIT',
    name: 'Per-unit Allocation',
    description: 'Equal distribution per item type',
    icon: Package,
    explanation: 'Distributes costs equally across all item types, regardless of quantity, weight, or value. Each unique item gets the same cost allocation.',
    bestFor: ['Administrative costs', 'Brokerage fees', 'Processing fees'],
    costTypes: ['BROKERAGE', 'PACKAGING']
  },
  {
    id: 'CHARGEABLE_WEIGHT',
    name: 'Weight-based Allocation',
    description: 'Based on chargeable weight (max of actual/volumetric)',
    icon: Scale,
    explanation: 'Allocates costs proportionally based on each item\'s chargeable weight (higher of actual weight or volumetric weight). Best for freight costs.',
    bestFor: ['Freight costs', 'Shipping fees', 'Box/parcel shipments'],
    costTypes: ['FREIGHT']
  },
  {
    id: 'VALUE',
    name: 'Value-based Allocation',
    description: 'Proportional to item value',
    icon: TrendingUp,
    explanation: 'Distributes costs based on the monetary value of each item. Higher value items get proportionally more cost allocation.',
    bestFor: ['Insurance costs', 'Duty fees', 'High-value shipments'],
    costTypes: ['INSURANCE', 'DUTY']
  },
  {
    id: 'HYBRID',
    name: 'Hybrid Allocation',
    description: 'Combination of weight (60%) + value (40%)',
    icon: Shuffle,
    explanation: 'Combines weight-based (60%) and value-based (40%) allocation methods for a balanced approach. Good for mixed shipments.',
    bestFor: ['Mixed shipments', 'General freight', 'Unknown shipment types'],
    costTypes: []
  },
  {
    id: 'VOLUME',
    name: 'Volume-based Allocation',
    description: 'Based on volumetric space usage',
    icon: Boxes,
    explanation: 'Allocates costs based on the volume/space each item occupies. Ideal for container shipments where space is the limiting factor.',
    bestFor: ['Container shipments', 'LCL freight', 'Volume-sensitive costs'],
    costTypes: []
  },
  {
    id: 'UNITS',
    name: 'Unit-based Allocation',
    description: 'Based on quantity of units',
    icon: Calculator,
    explanation: 'Distributes costs proportionally based on the quantity of each item. Items with higher quantities get more cost allocation.',
    bestFor: ['Pallet shipments', 'Unit-based fees', 'Handling charges'],
    costTypes: []
  }
];

const AllocationPreview = ({ shipmentId }: AllocationPreviewProps) => {
  const { toast } = useToast();
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [showMethodDetails, setShowMethodDetails] = useState(false);

  // Fetch allocation preview
  const { data: preview, isLoading, error, refetch } = useQuery<AllocationSummary>({
    queryKey: [`/api/imports/shipments/${shipmentId}/landing-cost-preview`, selectedMethod],
    enabled: !!shipmentId,
    keepPreviousData: true
  });

  // Mutation for updating allocation method
  const updateAllocationMethod = useMutation({
    mutationFn: async (method: string) => {
      const response = await apiRequest('GET', `/api/imports/shipments/${shipmentId}/landing-cost-preview?method=${method}`);
      return response;
    },
    onSuccess: (data) => {
      queryClient.setQueryData([`/api/imports/shipments/${shipmentId}/landing-cost-preview`, selectedMethod], data);
      toast({
        title: "Allocation Updated",
        description: `Switched to ${ALLOCATION_METHODS.find(m => m.id === selectedMethod)?.name} allocation method`
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update allocation method",
        variant: "destructive"
      });
    }
  });

  // Get current method info
  const currentMethod = useMemo(() => {
    const methodId = selectedMethod || preview?.autoSelectedMethod || preview?.selectedMethod;
    return ALLOCATION_METHODS.find(m => m.id === methodId);
  }, [selectedMethod, preview]);

  // Handle method change
  const handleMethodChange = (method: string) => {
    setSelectedMethod(method);
    setIsManualOverride(true);
    updateAllocationMethod.mutate(method);
  };

  // Reset to automatic selection
  const handleResetToAuto = () => {
    setSelectedMethod(null);
    setIsManualOverride(false);
    refetch();
    toast({
      title: "Reset to Automatic",
      description: "Allocation method reset to automatic selection"
    });
  };

  const toggleRow = (itemId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedRows(newExpanded);
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  };

  const formatWeight = (weight: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3
    }).format(weight) + ' kg';
  };

  const exportToCSV = () => {
    if (!preview?.items) return;

    const headers = [
      'SKU',
      'Name',
      'Units',
      'Actual Weight (kg)',
      'Volumetric Weight (kg)',
      'Chargeable Weight (kg)',
      'Freight Allocated',
      'Duty',
      'Brokerage',
      'Insurance',
      'Packaging',
      'Other Fees',
      'Total Allocated',
      'Landing Cost/Unit',
      'Warnings'
    ];

    const rows = preview.items.map(item => [
      item.sku,
      item.name,
      item.quantity,
      item.actualWeightKg,
      item.volumetricWeightKg,
      item.chargeableWeightKg,
      item.freightAllocated,
      item.dutyAllocated,
      item.brokerageAllocated,
      item.insuranceAllocated,
      item.packagingAllocated,
      item.otherAllocated,
      item.totalAllocated,
      item.landingCostPerUnit,
      item.warnings.join('; ')
    ]);

    // Add totals row
    rows.push([
      'TOTAL',
      '',
      preview.totalUnits,
      preview.totalActualWeight,
      preview.totalVolumetricWeight,
      preview.totalChargeableWeight,
      preview.totalCosts.freight,
      preview.totalCosts.duty,
      preview.totalCosts.brokerage,
      preview.totalCosts.insurance,
      preview.totalCosts.packaging,
      preview.totalCosts.other,
      preview.totalCosts.total,
      '',
      ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cost_allocation_shipment_${shipmentId}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Allocation Preview...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load allocation preview. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!preview || !preview.items || preview.items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No items to display</p>
            <p className="text-sm mt-2">Add costs and items to see allocation preview</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasWarnings = preview.items.some(item => item.warnings.length > 0);

  // Method Selection Component
  const MethodSelector = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Allocation Method
            </CardTitle>
            <CardDescription>
              {currentMethod ? (
                <span className="flex items-center gap-2 mt-1">
                  {isManualOverride ? (
                    <Badge variant="outline" className="text-blue-600">
                      Manual Override
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Auto-selected
                    </Badge>
                  )}
                  <span className="text-sm">
                    {currentMethod.name} - {currentMethod.description}
                  </span>
                </span>
              ) : (
                "Select how costs should be allocated across items"
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMethodDetails(!showMethodDetails)}
              data-testid="button-toggle-method-details"
            >
              <HelpCircle className="h-4 w-4 mr-1" />
              {showMethodDetails ? 'Hide' : 'Show'} Details
            </Button>
            {isManualOverride && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToAuto}
                data-testid="button-reset-auto"
              >
                Reset to Auto
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Automatic Selection Display */}
        {preview?.autoSelectedMethod && preview?.methodReasoning && !isManualOverride && (
          <Alert className="mb-4">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Automatic Selection</AlertTitle>
            <AlertDescription>
              {preview.methodReasoning}
            </AlertDescription>
          </Alert>
        )}

        {/* Manual Override Controls */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="manual-override"
              checked={isManualOverride}
              onCheckedChange={(checked) => {
                setIsManualOverride(checked);
                if (!checked) {
                  handleResetToAuto();
                }
              }}
              data-testid="switch-manual-override"
            />
            <Label htmlFor="manual-override" className="text-sm font-medium">
              Manual override allocation method
            </Label>
          </div>

          {isManualOverride && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Select Allocation Method:</Label>
              <RadioGroup
                value={selectedMethod || preview?.autoSelectedMethod || ''}
                onValueChange={handleMethodChange}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {ALLOCATION_METHODS.map((method) => {
                  const IconComponent = method.icon;
                  return (
                    <div key={method.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                      <RadioGroupItem
                        value={method.id}
                        id={method.id}
                        data-testid={`radio-method-${method.id}`}
                      />
                      <div className="flex-1 space-y-1">
                        <Label htmlFor={method.id} className="flex items-center gap-2 cursor-pointer">
                          <IconComponent className="h-4 w-4" />
                          <span className="font-medium">{method.name}</span>
                        </Label>
                        <p className="text-xs text-muted-foreground">{method.description}</p>
                        {showMethodDetails && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-muted-foreground">{method.explanation}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {method.bestFor.map((use, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {use}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Method Selection */}
      <MethodSelector />

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Cost Allocation Preview
                {currentMethod && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="ml-2">
                          <currentMethod.icon className="h-3 w-3 mr-1" />
                          {currentMethod.name}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{currentMethod.explanation}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </CardTitle>
              <CardDescription>
                Showing how costs will be allocated across {preview.totalItems} items
                {currentMethod && (
                  <span className="block text-xs mt-1 text-muted-foreground">
                    Using {currentMethod.name.toLowerCase()} • {currentMethod.description}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {updateAllocationMethod.isPending && (
                <Badge variant="outline" className="text-blue-600">
                  <Cpu className="h-3 w-3 mr-1 animate-spin" />
                  Updating...
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                data-testid="button-export-csv"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                Total Units
              </div>
              <p className="text-xl font-semibold">{preview.totalUnits}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Weight className="h-4 w-4" />
                Total Weight
              </div>
              <p className="text-xl font-semibold">{formatWeight(preview.totalChargeableWeight)}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Total Cost
              </div>
              <p className="text-xl font-semibold">
                {formatCurrency(preview.totalCosts.total, preview.baseCurrency)}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calculator className="h-4 w-4" />
                Avg Cost/Unit
              </div>
              <p className="text-xl font-semibold">
                {formatCurrency(preview.totalCosts.total / preview.totalUnits, preview.baseCurrency)}
              </p>
            </div>
          </div>

          {hasWarnings && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warnings Found</AlertTitle>
              <AlertDescription>
                Some items have warnings that may affect cost calculations. 
                Check the table below for details.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Allocation Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">Actual kg</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Actual gross weight in kilograms</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">Vol kg</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Volumetric weight calculated from dimensions</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">Chargeable kg</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Max of actual and volumetric weight</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="text-right">Freight</TableHead>
                  <TableHead className="text-right">Duty</TableHead>
                  <TableHead className="text-right">Other Fees</TableHead>
                  <TableHead className="text-right">Landing Cost/Unit</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.items.map((item) => (
                  <Fragment key={item.purchaseItemId}>
                    <TableRow
                      className={`${item.warnings.length > 0 ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''} ${currentMethod ? 'border-l-2 border-l-blue-200 dark:border-l-blue-800' : ''}`}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {item.sku}
                          {currentMethod && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <currentMethod.icon className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Allocated using {currentMethod.name.toLowerCase()}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.name}
                          {item.warnings.length > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="h-4 w-4 text-yellow-600 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="space-y-1">
                                    {item.warnings.map((warning, idx) => (
                                      <p key={idx}>{warning}</p>
                                    ))}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{item.actualWeightKg.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{item.volumetricWeightKg.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {item.chargeableWeightKg.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.freightAllocated, preview.baseCurrency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.dutyAllocated, preview.baseCurrency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          item.brokerageAllocated + 
                          item.insuranceAllocated + 
                          item.packagingAllocated + 
                          item.otherAllocated,
                          preview.baseCurrency
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(item.landingCostPerUnit, preview.baseCurrency)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRow(item.purchaseItemId)}
                          data-testid={`button-expand-${item.purchaseItemId}`}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(item.purchaseItemId) && (
                      <TableRow>
                        <TableCell colSpan={11} className="bg-gray-50 dark:bg-gray-900">
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">Cost Breakdown</h4>
                              {currentMethod && (
                                <Badge variant="outline" className="text-xs">
                                  <currentMethod.icon className="h-3 w-3 mr-1" />
                                  {currentMethod.name}
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                              <div>
                                <span className="text-muted-foreground">Freight:</span>
                                <span className="ml-2 font-medium">
                                  {formatCurrency(item.freightAllocated, preview.baseCurrency)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Duty:</span>
                                <span className="ml-2 font-medium">
                                  {formatCurrency(item.dutyAllocated, preview.baseCurrency)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Brokerage:</span>
                                <span className="ml-2 font-medium">
                                  {formatCurrency(item.brokerageAllocated, preview.baseCurrency)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Insurance:</span>
                                <span className="ml-2 font-medium">
                                  {formatCurrency(item.insuranceAllocated, preview.baseCurrency)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Packaging:</span>
                                <span className="ml-2 font-medium">
                                  {formatCurrency(item.packagingAllocated, preview.baseCurrency)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Other:</span>
                                <span className="ml-2 font-medium">
                                  {formatCurrency(item.otherAllocated, preview.baseCurrency)}
                                </span>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t">
                              <div className="flex justify-between">
                                <span className="font-medium">Total Allocated:</span>
                                <span className="font-bold">
                                  {formatCurrency(item.totalAllocated, preview.baseCurrency)}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Per Unit Cost:</span>
                                <span>
                                  {formatCurrency(item.landingCostPerUnit, preview.baseCurrency)}
                                </span>
                              </div>
                              {currentMethod && (
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Method Used:</span>
                                  <span className="flex items-center gap-1">
                                    <currentMethod.icon className="h-3 w-3" />
                                    {currentMethod.description}
                                  </span>
                                </div>
                              )}
                            </div>
                            {item.warnings.length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <h5 className="text-sm font-medium text-yellow-600 mb-1">Warnings:</h5>
                                <ul className="list-disc list-inside text-sm text-yellow-600">
                                  {item.warnings.map((warning, idx) => (
                                    <li key={idx}>{warning}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="font-bold">
                  <TableCell colSpan={2}>TOTAL</TableCell>
                  <TableCell className="text-right">{preview.totalUnits}</TableCell>
                  <TableCell className="text-right">
                    {preview.totalActualWeight.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {preview.totalVolumetricWeight.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {preview.totalChargeableWeight.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(preview.totalCosts.freight, preview.baseCurrency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(preview.totalCosts.duty, preview.baseCurrency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(
                      preview.totalCosts.brokerage +
                      preview.totalCosts.insurance +
                      preview.totalCosts.packaging +
                      preview.totalCosts.other,
                      preview.baseCurrency
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(preview.totalCosts.total, preview.baseCurrency)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AllocationPreview;