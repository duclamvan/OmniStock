import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Download,
  AlertTriangle,
  Info,
  Package,
  Weight,
  Box,
  DollarSign,
  Calculator,
  AlertCircle
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
}

interface AllocationPreviewProps {
  shipmentId: number;
}

const AllocationPreview = ({ shipmentId }: AllocationPreviewProps) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Fetch allocation preview
  const { data: preview, isLoading, error } = useQuery<AllocationSummary>({
    queryKey: [`/api/imports/shipments/${shipmentId}/landing-cost-preview`],
    enabled: !!shipmentId
  });

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

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cost Allocation Preview</CardTitle>
              <CardDescription>
                Showing how costs will be allocated across {preview.totalItems} items
              </CardDescription>
            </div>
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
                  <React.Fragment key={item.purchaseItemId}>
                    <TableRow 
                      className={item.warnings.length > 0 ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}
                    >
                      <TableCell className="font-medium">
                        {item.sku}
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
                            <h4 className="font-medium mb-2">Cost Breakdown</h4>
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
                  </React.Fragment>
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