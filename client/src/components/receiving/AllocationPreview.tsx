import { useState, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from 'react-i18next';
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
  HelpCircle,
  ChevronDown,
  Settings2,
  Eye,
  EyeOff,
  RotateCcw
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency as formatCurrencyUtil } from "@/lib/currencyUtils";

interface ItemAllocation {
  purchaseItemId: number;
  customItemId?: number;  // Fallback ID field
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;  // Purchase price per unit
  totalValue?: number;  // Optional total value field
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
    bestFor: ['Administrative costs', 'Customs fees', 'Processing fees'],
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

// Column configuration for visibility controls
interface ColumnConfig {
  id: string;
  label: string;
  defaultVisible: boolean;
  group?: 'core' | 'costs' | 'detailed';
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'product', label: 'Product', defaultVisible: true, group: 'core' },
  { id: 'units', label: 'Units', defaultVisible: true, group: 'core' },
  { id: 'purchPrice', label: 'Purchase Price', defaultVisible: true, group: 'core' },
  { id: 'chgKg', label: 'Chargeable Kg', defaultVisible: true, group: 'core' },
  { id: 'freight', label: 'Freight', defaultVisible: true, group: 'costs' },
  { id: 'duty', label: 'Duty', defaultVisible: true, group: 'costs' },
  { id: 'brokerage', label: 'Customs/Brokerage', defaultVisible: false, group: 'detailed' },
  { id: 'insurance', label: 'Insurance', defaultVisible: false, group: 'detailed' },
  { id: 'packaging', label: 'Packaging', defaultVisible: false, group: 'detailed' },
  { id: 'other', label: 'Other', defaultVisible: true, group: 'costs' },
  { id: 'landingCost', label: 'Landing Cost/Unit', defaultVisible: false, group: 'detailed' },
  { id: 'totalCost', label: 'Total Cost', defaultVisible: true, group: 'core' },
];

const AllocationPreview = ({ shipmentId }: AllocationPreviewProps) => {
  const { toast } = useToast();
  const { t } = useTranslation('imports');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [showMethodDetails, setShowMethodDetails] = useState(true);
  
  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    DEFAULT_COLUMNS.forEach(col => {
      initial[col.id] = col.defaultVisible;
    });
    return initial;
  });

  const toggleColumn = (columnId: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
  };

  const resetColumns = () => {
    const initial: Record<string, boolean> = {};
    DEFAULT_COLUMNS.forEach(col => {
      initial[col.id] = col.defaultVisible;
    });
    setColumnVisibility(initial);
  };

  const showAllColumns = () => {
    const all: Record<string, boolean> = {};
    DEFAULT_COLUMNS.forEach(col => {
      all[col.id] = true;
    });
    setColumnVisibility(all);
  };

  const visibleColumnCount = Object.values(columnVisibility).filter(Boolean).length;

  // Fetch allocation preview - use method-specific endpoint when manual override
  const { data: preview, isLoading, error, refetch } = useQuery<AllocationSummary>({
    queryKey: [`/api/imports/shipments/${shipmentId}/landing-cost-preview`, selectedMethod],
    queryFn: async () => {
      const endpoint = selectedMethod 
        ? `/api/imports/shipments/${shipmentId}/landing-cost-preview/${selectedMethod}`
        : `/api/imports/shipments/${shipmentId}/landing-cost-preview`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch allocation preview');
      return response.json();
    },
    enabled: !!shipmentId
  });

  // Mutation for fetching allocation preview with specific method
  const updateAllocationMethod = useMutation({
    mutationFn: async (method: string) => {
      const endpoint = `/api/imports/shipments/${shipmentId}/landing-cost-preview/${method}`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch method-specific preview');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData([`/api/imports/shipments/${shipmentId}/landing-cost-preview`, selectedMethod], data);
    },
    onError: (error) => {
      console.error('Method update error:', error);
      toast({
        title: t('error'),
        description: t('failedToUpdateAllocationMethod'),
        variant: "destructive"
      });
    }
  });

  // Mutation for saving allocation method to shipment (persists for receiving)
  const saveAllocationMethod = useMutation({
    mutationFn: async (method: string) => {
      const response = await fetch(`/api/imports/shipments/${shipmentId}/allocation-method`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocationMethod: method })
      });
      if (!response.ok) throw new Error('Failed to save allocation method');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments', shipmentId] });
      toast({
        title: t('allocationSaved') || 'Method Saved',
        description: t('allocationMethodSavedDesc', { method: ALLOCATION_METHODS.find(m => m.id === data.allocationMethod)?.name }) || `${data.allocationMethod} method will be used when receiving items`
      });
    },
    onError: (error) => {
      console.error('Save method error:', error);
      toast({
        title: t('error'),
        description: t('failedToSaveAllocationMethod') || 'Failed to save allocation method',
        variant: "destructive"
      });
    }
  });

  // Get current method info
  const currentMethod = useMemo(() => {
    const methodId = selectedMethod || preview?.autoSelectedMethod || preview?.selectedMethod;
    return ALLOCATION_METHODS.find(m => m.id === methodId);
  }, [selectedMethod, preview]);

  // Handle method change - updates preview AND saves to database for receiving
  const handleMethodChange = (method: string) => {
    setSelectedMethod(method);
    setIsManualOverride(true);
    // Fetch preview with the new method
    updateAllocationMethod.mutate(method);
    // Save the method to the shipment for use during receiving
    saveAllocationMethod.mutate(method);
  };

  // Reset to automatic selection
  const handleResetToAuto = async () => {
    setSelectedMethod(null);
    setIsManualOverride(false);
    // Clear saved allocation method from the database (null triggers auto-selection)
    try {
      await fetch(`/api/imports/shipments/${shipmentId}/allocation-method`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocationMethod: null })
      });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments', shipmentId] });
    } catch (error) {
      console.log('Could not reset allocation method, using local reset only');
    }
    refetch();
    toast({
      title: t('resetToAutomatic'),
      description: t('allocationMethodReset')
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

  // Robust currency formatter with defensive checks
  const formatCurrency = (amount: number | undefined | null, currency: string = 'EUR') => {
    // Handle undefined, null, or NaN values
    if (amount === undefined || amount === null || isNaN(amount)) {
      console.warn('formatCurrency received invalid value:', amount);
      return formatCurrencyUtil(0, currency);
    }
    return formatCurrencyUtil(amount, currency);
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
      t('csvSku'),
      t('csvName'),
      t('csvUnits'),
      t('csvActualWeight'),
      t('csvVolumetricWeight'),
      t('csvChargeableWeight'),
      t('csvFreightAllocated'),
      t('csvDuty'),
      t('csvCustomsFee'),
      t('csvInsurance'),
      t('csvPackaging'),
      t('csvOtherFees'),
      t('csvTotalAllocated'),
      t('csvLandingCostUnit'),
      t('csvWarnings')
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
      t('total'),
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
          <CardTitle>{t('loadingAllocationPreview')}</CardTitle>
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
        <AlertTitle>{t('error')}</AlertTitle>
        <AlertDescription>
          {t('failedToLoadAllocationPreview')}
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
            <p>{t('noItemsToDisplay')}</p>
            <p className="text-sm mt-2">{t('addCostsAndItems')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasWarnings = preview.items.some(item => item.warnings.length > 0);

  // Compact Method Selector Component
  const MethodSelector = () => (
    <Collapsible open={showMethodDetails} onOpenChange={setShowMethodDetails}>
      <Card className="border-l-4 border-l-cyan-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Cpu className="h-4 w-4 text-cyan-600" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{t('allocationMethodLabel')}</span>
                  {isManualOverride ? (
                    <>
                      {currentMethod && (
                        <Badge variant="secondary" className="text-xs">
                          <currentMethod.icon className="h-3 w-3 mr-1" />
                          {currentMethod.name}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs text-blue-600">{t('manualOverride')}</Badge>
                    </>
                  ) : currentMethod ? (
                    <Badge variant="outline" className="text-xs text-green-600">
                      <currentMethod.icon className="h-3 w-3 mr-1" />
                      {t('auto')} ({currentMethod.name})
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-green-600">
                      {t('auto')}
                    </Badge>
                  )}
                </div>
                {!isManualOverride && currentMethod && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <strong>{t('whyThisMethod')}</strong> {t('weightBasedOptimal')}
                  </p>
                )}
              </div>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <ChevronDown className={`h-4 w-4 transition-transform ${showMethodDetails ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="manual-override"
                    checked={isManualOverride}
                    onCheckedChange={(checked) => {
                      setIsManualOverride(checked);
                      if (!checked) handleResetToAuto();
                    }}
                    data-testid="switch-manual-override"
                  />
                  <Label htmlFor="manual-override" className="text-xs">
                    {t('manualOverride')}
                  </Label>
                </div>
                {isManualOverride && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetToAuto}
                    className="h-7 text-xs"
                    data-testid="button-reset-auto"
                  >
                    {t('resetToAuto')}
                  </Button>
                )}
              </div>

              {isManualOverride && (
                <div className="grid grid-cols-2 gap-2">
                  {ALLOCATION_METHODS.map((method) => {
                    const IconComponent = method.icon;
                    const isSelected = (selectedMethod || preview?.autoSelectedMethod) === method.id;
                    return (
                      <button
                        key={method.id}
                        onClick={() => handleMethodChange(method.id)}
                        className={`p-2 text-left border rounded-lg transition-all ${
                          isSelected 
                            ? 'border-cyan-600 bg-cyan-50 dark:bg-cyan-950' 
                            : 'hover:bg-muted/50'
                        }`}
                        data-testid={`button-method-${method.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <IconComponent className={`h-4 w-4 ${isSelected ? 'text-cyan-600' : ''}`} />
                          <span className="text-xs font-medium">{method.name}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{method.description}</p>
                      </button>
                    );
                  })}
                </div>
              )}

              {!isManualOverride && preview?.methodReasoning && (
                <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                  <strong>{t('autoSelection')}</strong> {preview.methodReasoning}
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );

  return (
    <div className="space-y-3">
      {/* Method Selection */}
      <MethodSelector />

      {/* Compact Summary */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('units')}</p>
                  <p className="text-sm font-semibold">{preview.totalUnits}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Weight className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('weight')}</p>
                  <p className="text-sm font-semibold">{formatWeight(preview.totalChargeableWeight)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('totalCost')}</p>
                  <p className="text-sm font-semibold">
                    {formatCurrency(preview.totalCosts.total, preview.baseCurrency)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('avgUnit')}</p>
                  <p className="text-sm font-semibold">
                    {formatCurrency(preview.totalCosts.total / preview.totalUnits, preview.baseCurrency)}
                  </p>
                </div>
              </div>
              {hasWarnings && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {t('warnings')}
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="h-7 text-xs"
              data-testid="button-export-csv"
            >
              <Download className="h-3 w-3 mr-1" />
              {t('export')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comprehensive Cost Allocation Table */}
      <Collapsible defaultOpen={true}>
        <Card>
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-cyan-600" />
                <CardTitle className="text-sm font-semibold">
                  {t('costAllocationDetails')} ({preview.totalItems} {preview.totalItems === 1 ? t('item') : t('items')})
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {preview.totalUnits} {t('units')}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                {/* Column Visibility Settings */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs gap-1 hidden md:flex"
                      data-testid="button-column-settings"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      {t('columns')} ({visibleColumnCount}/{DEFAULT_COLUMNS.length})
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72" align="end">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{t('columnVisibility')}</h4>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-xs px-2"
                            onClick={showAllColumns}
                            data-testid="button-show-all-columns"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            {t('showAll')}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-xs px-2"
                            onClick={resetColumns}
                            data-testid="button-reset-columns"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            {t('reset')}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">{t('coreColumns')}</p>
                        {DEFAULT_COLUMNS.filter(c => c.group === 'core').map(col => (
                          <div key={col.id} className="flex items-center gap-2">
                            <Checkbox 
                              id={`col-${col.id}`}
                              checked={columnVisibility[col.id]}
                              onCheckedChange={() => toggleColumn(col.id)}
                              data-testid={`checkbox-column-${col.id}`}
                            />
                            <Label htmlFor={`col-${col.id}`} className="text-xs cursor-pointer">
                              {t(col.id)}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">{t('costColumns')}</p>
                        {DEFAULT_COLUMNS.filter(c => c.group === 'costs').map(col => (
                          <div key={col.id} className="flex items-center gap-2">
                            <Checkbox 
                              id={`col-${col.id}`}
                              checked={columnVisibility[col.id]}
                              onCheckedChange={() => toggleColumn(col.id)}
                              data-testid={`checkbox-column-${col.id}`}
                            />
                            <Label htmlFor={`col-${col.id}`} className="text-xs cursor-pointer">
                              {t(col.id)}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">{t('detailedColumns')}</p>
                        {DEFAULT_COLUMNS.filter(c => c.group === 'detailed').map(col => (
                          <div key={col.id} className="flex items-center gap-2">
                            <Checkbox 
                              id={`col-${col.id}`}
                              checked={columnVisibility[col.id]}
                              onCheckedChange={() => toggleColumn(col.id)}
                              data-testid={`checkbox-column-${col.id}`}
                            />
                            <Label htmlFor={`col-${col.id}`} className="text-xs cursor-pointer">
                              {t(col.id)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs bg-muted/30">
                      {columnVisibility.product && (
                        <TableHead className="min-w-[180px] p-2">{t('product')}</TableHead>
                      )}
                      {columnVisibility.units && (
                        <TableHead className="text-right w-[60px] p-2">{t('units')}</TableHead>
                      )}
                      {columnVisibility.purchPrice && (
                        <TableHead className="text-right w-[90px] p-2">{t('purchPrice')}</TableHead>
                      )}
                      {columnVisibility.chgKg && (
                        <TableHead className="text-right w-[70px] p-2">{t('chgKg')}</TableHead>
                      )}
                      {columnVisibility.freight && (
                        <TableHead className="text-right w-[90px] p-2">{t('freight')}</TableHead>
                      )}
                      {columnVisibility.duty && (
                        <TableHead className="text-right w-[80px] p-2">{t('duty')}</TableHead>
                      )}
                      {columnVisibility.brokerage && (
                        <TableHead className="text-right w-[90px] p-2">{t('brokerage')}</TableHead>
                      )}
                      {columnVisibility.insurance && (
                        <TableHead className="text-right w-[80px] p-2">{t('insurance')}</TableHead>
                      )}
                      {columnVisibility.packaging && (
                        <TableHead className="text-right w-[80px] p-2">{t('packaging')}</TableHead>
                      )}
                      {columnVisibility.other && (
                        <TableHead className="text-right w-[80px] p-2">{t('other')}</TableHead>
                      )}
                      {columnVisibility.landingCost && (
                        <TableHead className="text-right w-[100px] p-2">{t('landingCostUnit')}</TableHead>
                      )}
                      {columnVisibility.totalCost && (
                        <TableHead className="text-right w-[100px] p-2">{t('totalCost')}</TableHead>
                      )}
                      <TableHead className="w-[40px] p-2"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.items.map((item) => [
                      <TableRow
                        key={`row-${item.purchaseItemId}`}
                        className={`text-xs hover:bg-muted/30 ${item.warnings.length > 0 ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}`}
                      >
                        {columnVisibility.product && (
                          <TableCell className="p-2">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-xs">{item.name}</span>
                                {item.warnings.length > 0 && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <AlertTriangle className="h-3 w-3 text-yellow-600 cursor-help" />
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
                              <span className="text-[10px] text-muted-foreground">{item.sku}</span>
                            </div>
                          </TableCell>
                        )}
                        {columnVisibility.units && (
                          <TableCell className="text-right p-2">{item.quantity || 0}</TableCell>
                        )}
                        {columnVisibility.purchPrice && (
                          <TableCell className="text-right p-2 text-blue-600 dark:text-blue-400 font-medium">
                            {formatCurrency(item.unitPrice, preview.baseCurrency)}
                          </TableCell>
                        )}
                        {columnVisibility.chgKg && (
                          <TableCell className="text-right p-2 text-muted-foreground">
                            {(item.chargeableWeightKg || 0).toFixed(2)}
                          </TableCell>
                        )}
                        {columnVisibility.freight && (
                          <TableCell className="text-right p-2">
                            {formatCurrency(item.freightAllocated, preview.baseCurrency)}
                          </TableCell>
                        )}
                        {columnVisibility.duty && (
                          <TableCell className="text-right p-2">
                            {formatCurrency(item.dutyAllocated, preview.baseCurrency)}
                          </TableCell>
                        )}
                        {columnVisibility.brokerage && (
                          <TableCell className="text-right p-2">
                            {formatCurrency(item.brokerageAllocated, preview.baseCurrency)}
                          </TableCell>
                        )}
                        {columnVisibility.insurance && (
                          <TableCell className="text-right p-2">
                            {formatCurrency(item.insuranceAllocated, preview.baseCurrency)}
                          </TableCell>
                        )}
                        {columnVisibility.packaging && (
                          <TableCell className="text-right p-2">
                            {formatCurrency(item.packagingAllocated, preview.baseCurrency)}
                          </TableCell>
                        )}
                        {columnVisibility.other && (
                          <TableCell className="text-right p-2">
                            {formatCurrency(item.otherAllocated, preview.baseCurrency)}
                          </TableCell>
                        )}
                        {columnVisibility.landingCost && (
                          <TableCell className="text-right p-2 text-orange-600 dark:text-orange-400">
                            {formatCurrency(item.landingCostPerUnit, preview.baseCurrency)}
                          </TableCell>
                        )}
                        {columnVisibility.totalCost && (
                          <TableCell className="text-right font-semibold p-2 text-cyan-700 dark:text-cyan-400">
                            {formatCurrency((item.unitPrice || 0) + (item.landingCostPerUnit || 0), preview.baseCurrency)}
                          </TableCell>
                        )}
                        <TableCell className="p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRow(item.purchaseItemId)}
                            className="h-6 w-6 p-0"
                            data-testid={`button-expand-${item.purchaseItemId}`}
                          >
                            <Info className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>,
                      expandedRows.has(item.purchaseItemId) && (
                        <TableRow key={`expanded-${item.purchaseItemId}`}>
                          <TableCell colSpan={visibleColumnCount + 1} className="bg-muted/30">
                            <div className="p-3">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium">{t('costBreakdown')}</h4>
                                {currentMethod && (
                                  <Badge variant="outline" className="text-xs">
                                    <currentMethod.icon className="h-3 w-3 mr-1" />
                                    {currentMethod.name}
                                  </Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div className="bg-background p-2 rounded border">
                                  <span className="text-muted-foreground text-xs block">{t('freightLabel')}</span>
                                  <span className="font-medium">
                                    {formatCurrency(item.freightAllocated, preview.baseCurrency)}
                                  </span>
                                </div>
                                <div className="bg-background p-2 rounded border">
                                  <span className="text-muted-foreground text-xs block">{t('dutyLabel')}</span>
                                  <span className="font-medium">
                                    {formatCurrency(item.dutyAllocated, preview.baseCurrency)}
                                  </span>
                                </div>
                                <div className="bg-background p-2 rounded border">
                                  <span className="text-muted-foreground text-xs block">{t('customsFeeLabel')}</span>
                                  <span className="font-medium">
                                    {formatCurrency(item.brokerageAllocated, preview.baseCurrency)}
                                  </span>
                                </div>
                                <div className="bg-background p-2 rounded border">
                                  <span className="text-muted-foreground text-xs block">{t('insuranceLabel')}</span>
                                  <span className="font-medium">
                                    {formatCurrency(item.insuranceAllocated, preview.baseCurrency)}
                                  </span>
                                </div>
                                <div className="bg-background p-2 rounded border">
                                  <span className="text-muted-foreground text-xs block">{t('packagingLabel')}</span>
                                  <span className="font-medium">
                                    {formatCurrency(item.packagingAllocated, preview.baseCurrency)}
                                  </span>
                                </div>
                                <div className="bg-background p-2 rounded border">
                                  <span className="text-muted-foreground text-xs block">{t('otherLabel')}</span>
                                  <span className="font-medium">
                                    {formatCurrency(item.otherAllocated, preview.baseCurrency)}
                                  </span>
                                </div>
                                <div className="bg-cyan-50 dark:bg-cyan-950/30 p-2 rounded border border-cyan-200 dark:border-cyan-800">
                                  <span className="text-muted-foreground text-xs block">{t('totalAllocated')}</span>
                                  <span className="font-bold text-cyan-700 dark:text-cyan-400">
                                    {formatCurrency(item.totalAllocated, preview.baseCurrency)}
                                  </span>
                                </div>
                                <div className="bg-orange-50 dark:bg-orange-950/30 p-2 rounded border border-orange-200 dark:border-orange-800">
                                  <span className="text-muted-foreground text-xs block">{t('perUnitCost')}</span>
                                  <span className="font-bold text-orange-600 dark:text-orange-400">
                                    {formatCurrency(item.landingCostPerUnit, preview.baseCurrency)}
                                  </span>
                                </div>
                              </div>
                              {currentMethod && (
                                <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{t('methodUsed')}:</span>
                                  <Badge variant="secondary" className="text-xs">
                                    <currentMethod.icon className="h-3 w-3 mr-1" />
                                    {currentMethod.description}
                                  </Badge>
                                </div>
                              )}
                              {item.warnings.length > 0 && (
                                <div className="mt-3 pt-3 border-t">
                                  <h5 className="text-sm font-medium text-yellow-600 mb-1">{t('warningsLabel')}</h5>
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
                      )
                    ])}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="font-bold text-xs bg-muted/50">
                      {columnVisibility.product && (
                        <TableCell className="p-2">{t('total')}</TableCell>
                      )}
                      {columnVisibility.units && (
                        <TableCell className="text-right p-2">{preview.totalUnits || 0}</TableCell>
                      )}
                      {columnVisibility.purchPrice && (
                        <TableCell className="text-right p-2 text-blue-600 dark:text-blue-400">
                          {formatCurrency(
                            preview.totalUnits > 0 
                              ? preview.items.reduce((sum, item) => sum + ((item.unitPrice || 0) * (item.quantity || 0)), 0) / preview.totalUnits
                              : 0,
                            preview.baseCurrency
                          )}
                        </TableCell>
                      )}
                      {columnVisibility.chgKg && (
                        <TableCell className="text-right p-2">
                          {(preview.totalChargeableWeight || 0).toFixed(2)}
                        </TableCell>
                      )}
                      {columnVisibility.freight && (
                        <TableCell className="text-right p-2">
                          {formatCurrency(preview.totalCosts?.freight, preview.baseCurrency)}
                        </TableCell>
                      )}
                      {columnVisibility.duty && (
                        <TableCell className="text-right p-2">
                          {formatCurrency(preview.totalCosts?.duty, preview.baseCurrency)}
                        </TableCell>
                      )}
                      {columnVisibility.brokerage && (
                        <TableCell className="text-right p-2">
                          {formatCurrency(preview.totalCosts?.brokerage, preview.baseCurrency)}
                        </TableCell>
                      )}
                      {columnVisibility.insurance && (
                        <TableCell className="text-right p-2">
                          {formatCurrency(preview.totalCosts?.insurance, preview.baseCurrency)}
                        </TableCell>
                      )}
                      {columnVisibility.packaging && (
                        <TableCell className="text-right p-2">
                          {formatCurrency(preview.totalCosts?.packaging, preview.baseCurrency)}
                        </TableCell>
                      )}
                      {columnVisibility.other && (
                        <TableCell className="text-right p-2">
                          {formatCurrency(preview.totalCosts?.other, preview.baseCurrency)}
                        </TableCell>
                      )}
                      {columnVisibility.landingCost && (
                        <TableCell className="text-right p-2 text-orange-600 dark:text-orange-400">
                          {formatCurrency(
                            preview.totalUnits > 0
                              ? preview.items.reduce((sum, item) => sum + ((item.landingCostPerUnit || 0) * (item.quantity || 0)), 0) / preview.totalUnits
                              : 0,
                            preview.baseCurrency
                          )}
                        </TableCell>
                      )}
                      {columnVisibility.totalCost && (
                        <TableCell className="text-right p-2 text-cyan-700 dark:text-cyan-400">
                          {formatCurrency(
                            preview.totalUnits > 0
                              ? preview.items.reduce((sum, item) => sum + (((item.unitPrice || 0) + (item.landingCostPerUnit || 0)) * (item.quantity || 0)), 0) / preview.totalUnits
                              : 0,
                            preview.baseCurrency
                          )}
                        </TableCell>
                      )}
                      <TableCell className="p-2"></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

export default AllocationPreview;