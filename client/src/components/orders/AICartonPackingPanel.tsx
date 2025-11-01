import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Box, 
  Package, 
  Truck, 
  Weight, 
  Loader2, 
  AlertCircle 
} from "lucide-react";
import { formatCurrency } from "@/lib/currencyUtils";

interface AICartonPackingPanelProps {
  packingPlan: any;
  onRunOptimization: () => void;
  isLoading: boolean;
  currency: string;
  orderItems: any[];
}

export function AICartonPackingPanel({
  packingPlan,
  onRunOptimization,
  isLoading,
  currency,
  orderItems
}: AICartonPackingPanelProps) {
  if (orderItems.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="p-3 border-b">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Box className="h-4 w-4 text-blue-600" />
              AI Carton Packing
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Automatically calculate optimal carton sizes and shipping costs
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={onRunOptimization}
            disabled={isLoading}
            data-testid="button-run-packing-optimization"
            className="ml-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Package className="h-4 w-4 mr-2" />
                Run AI Optimization
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {packingPlan && (
        <CardContent className="p-3 space-y-3">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Cartons */}
            <div className="bg-blue-50 dark:bg-blue-950 p-3 sm:p-4 rounded-lg">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                <Box className="h-4 w-4" />
                <span className="text-xs font-medium">Total Cartons</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100" data-testid="text-total-cartons">
                {packingPlan.totalCartons || 0}
              </p>
            </div>

            {/* Total Weight */}
            <div className="bg-purple-50 dark:bg-purple-950 p-3 sm:p-4 rounded-lg">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                <Weight className="h-4 w-4" />
                <span className="text-xs font-medium">Total Weight</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-purple-900 dark:text-purple-100" data-testid="text-total-weight">
                {packingPlan.totalWeight ? `${packingPlan.totalWeight.toFixed(2)} kg` : '0 kg'}
              </p>
            </div>

            {/* Avg Utilization */}
            <div className={`p-3 sm:p-4 rounded-lg ${
              (packingPlan.avgUtilization || 0) > 80 
                ? 'bg-green-50 dark:bg-green-950' 
                : (packingPlan.avgUtilization || 0) > 70 
                ? 'bg-yellow-50 dark:bg-yellow-950' 
                : 'bg-red-50 dark:bg-red-950'
            }`}>
              <div className={`flex items-center gap-2 mb-1 ${
                (packingPlan.avgUtilization || 0) > 80 
                  ? 'text-green-600 dark:text-green-400' 
                  : (packingPlan.avgUtilization || 0) > 70 
                  ? 'text-yellow-600 dark:text-yellow-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                <Package className="h-4 w-4" />
                <span className="text-xs font-medium">Avg Utilization</span>
              </div>
              <p className={`text-xl sm:text-2xl font-bold ${
                (packingPlan.avgUtilization || 0) > 80 
                  ? 'text-green-900 dark:text-green-100' 
                  : (packingPlan.avgUtilization || 0) > 70 
                  ? 'text-yellow-900 dark:text-yellow-100' 
                  : 'text-red-900 dark:text-red-100'
              }`} data-testid="text-avg-utilization">
                {packingPlan.avgUtilization ? `${packingPlan.avgUtilization.toFixed(1)}%` : '0%'}
              </p>
            </div>

            {/* Est. Shipping Cost */}
            <div className="bg-indigo-50 dark:bg-indigo-950 p-3 sm:p-4 rounded-lg">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
                <Truck className="h-4 w-4" />
                <span className="text-xs font-medium">Est. Shipping</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-indigo-900 dark:text-indigo-100" data-testid="text-shipping-cost">
                {packingPlan.estimatedShippingCost 
                  ? formatCurrency(packingPlan.estimatedShippingCost, currency)
                  : formatCurrency(0, currency)
                }
              </p>
            </div>
          </div>

          {/* Suggestions */}
          {packingPlan.suggestions && packingPlan.suggestions.length > 0 && (
            <div className="space-y-2">
              {packingPlan.suggestions.map((suggestion: string, index: number) => (
                <Alert key={index} className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200">
                    {suggestion}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Detailed Carton Breakdown */}
          {packingPlan.cartons && packingPlan.cartons.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Box className="h-4 w-4" />
                Carton Breakdown
              </h4>
              <Accordion type="single" collapsible className="w-full">
                {packingPlan.cartons.map((carton: any, index: number) => (
                  <AccordionItem 
                    key={index} 
                    value={`carton-${index}`}
                    data-testid={`accordion-carton-${index + 1}`}
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">
                          <Box className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium">
                            Carton #{index + 1}: {carton.cartonName || 'Standard Box'}
                            {carton.dimensions && ` (${carton.dimensions})`}
                          </span>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={
                            (carton.utilization || 0) > 80 
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700' 
                              : (carton.utilization || 0) > 70 
                              ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700' 
                              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700'
                          }
                        >
                          {carton.utilization ? `${carton.utilization.toFixed(1)}%` : '0%'} utilized
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2 pb-3 px-4">
                        {/* Carton Stats */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Weight className="h-3 w-3 text-gray-500" />
                            <span className="text-gray-600 dark:text-gray-400">Total Weight:</span>
                            <span className="font-medium">{carton.weight ? `${carton.weight.toFixed(2)} kg` : 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Package className="h-3 w-3 text-gray-500" />
                            <span className="text-gray-600 dark:text-gray-400">Items:</span>
                            <span className="font-medium">{carton.items?.length || 0}</span>
                          </div>
                          {carton.fillingWeight !== undefined && carton.fillingWeight > 0 && (
                            <>
                              <div className="flex items-center gap-2">
                                <Box className="h-3 w-3 text-amber-500" />
                                <span className="text-gray-600 dark:text-gray-400">Filling:</span>
                                <span className="font-medium text-amber-600 dark:text-amber-400">
                                  {carton.fillingWeight.toFixed(3)} kg
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Package className="h-3 w-3 text-gray-500" />
                                <span className="text-gray-600 dark:text-gray-400">Empty Space:</span>
                                <span className="font-medium">{carton.unusedVolume ? `${carton.unusedVolume.toLocaleString()} cm³` : 'N/A'}</span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Items in Carton */}
                        {carton.items && carton.items.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                              Items in Carton
                            </h5>
                            <div className="space-y-1">
                              {carton.items.map((item: any, itemIndex: number) => (
                                <div 
                                  key={itemIndex}
                                  className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{item.productName || item.name}</span>
                                    {item.isEstimated && (
                                      <Badge variant="secondary" className="text-xs">
                                        AI Estimated
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                                    <span>Qty: {item.quantity}</span>
                                    {item.weight && <span>Weight: {item.weight.toFixed(2)} kg</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
