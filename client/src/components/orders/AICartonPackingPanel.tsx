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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Box, 
  Package, 
  Truck, 
  Weight, 
  Loader2, 
  AlertCircle,
  Plus,
  Ruler,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { formatCurrency } from "@/lib/currencyUtils";
import { useTranslation } from "react-i18next";

interface AICartonPackingPanelProps {
  packingPlan: any;
  onRunOptimization: () => void;
  isLoading: boolean;
  currency: string;
  orderItems: any[];
  onAddManualCarton?: () => void;
}

export function AICartonPackingPanel({
  packingPlan,
  onRunOptimization,
  isLoading,
  currency,
  orderItems,
  onAddManualCarton
}: AICartonPackingPanelProps) {
  const { t } = useTranslation('orders');
  
  if (orderItems.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800">
      <CardHeader className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <Box className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            {t('cartonPacking')}
          </CardTitle>
          <div className="flex gap-2">
            {onAddManualCarton && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddManualCarton}
                data-testid="button-add-manual-carton"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('addCarton')}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={onRunOptimization}
              disabled={isLoading}
              data-testid="button-run-packing-optimization"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  {t('aiOptimize')}
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-1" />
                  {t('aiOptimize')}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {packingPlan && (
        <CardContent className="p-3 space-y-3">
          {/* Carton List - Focused on key metrics */}
          {packingPlan.cartons && packingPlan.cartons.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center justify-between">
                <span>{t('cartonsCount', { count: packingPlan.totalCartons || 0 })}</span>
                <span>{t('totalWeight', { weight: packingPlan.totalWeight ? packingPlan.totalWeight.toFixed(2) : '0' })}</span>
              </div>
              <div className="space-y-1.5">
                {packingPlan.cartons.map((carton: any, index: number) => (
                  <div key={index}>
                    <div 
                      className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg border"
                      data-testid={`carton-summary-${index + 1}`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-xs">{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                            {carton.cartonName || t('standardBox')}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Weight className="h-3 w-3" />
                              {carton.weight ? carton.weight.toFixed(2) : carton.totalWeightKg?.toFixed(2) || '0'} kg
                            </span>
                            {(carton.innerLengthCm || carton.length) && (
                              <span className="flex items-center gap-1">
                                <Ruler className="h-3 w-3" />
                                {carton.innerLengthCm || carton.length}×{carton.innerWidthCm || carton.width}×{carton.innerHeightCm || carton.height} cm
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {carton.recommendedParcelSize && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge 
                                  variant="outline" 
                                  className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700"
                                >
                                  <Truck className="h-3 w-3 mr-1" />
                                  {carton.recommendedParcelSize.name}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>DHL Parcel: {carton.recommendedParcelSize.name}</p>
                                {carton.recommendedParcelSize.costEstimate && (
                                  <p>Est. cost: {formatCurrency(carton.recommendedParcelSize.costEstimate, carton.recommendedParcelSize.currency || 'EUR')}</p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {carton.carrierValidation && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                {carton.carrierValidation.valid ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                              </TooltipTrigger>
                              <TooltipContent>
                                {carton.carrierValidation.valid 
                                  ? t('carrierValid') || 'Meets carrier requirements'
                                  : `${t('carrierInvalid') || 'Exceeds limits'}: ${carton.carrierValidation.errors?.join(', ')}`
                                }
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <Badge 
                          variant="outline" 
                          className={`${
                            (carton.utilization || carton.volumeUtilization || 0) > 80 
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700' 
                              : (carton.utilization || carton.volumeUtilization || 0) > 70 
                              ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700' 
                              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700'
                          }`}
                        >
                          {(carton.utilization || carton.volumeUtilization) ? `${(carton.utilization || carton.volumeUtilization).toFixed(0)}%` : '0%'}
                        </Badge>
                      </div>
                    </div>
                    {/* Show items inside this carton */}
                    {carton.items && carton.items.length > 0 && (
                      <div className="mt-2 pl-8 space-y-1">
                        {carton.items.map((item: any, itemIdx: number) => (
                          <div key={itemIdx} className="text-xs text-gray-600 dark:text-gray-400 flex justify-between">
                            <span>{item.productName || item.name}</span>
                            <span>
                              {t('itemQuantityWeight', { 
                                quantity: item.quantity, 
                                weight: item.weight?.toFixed(2) || item.weightKg?.toFixed(2) || '0' 
                              })}
                              {(item.isEstimated || item.aiEstimated) && <span className="ml-1 text-yellow-600">*</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Carrier & Cost Summary */}
          {(packingPlan.carrierCode || packingPlan.estimatedShippingCost > 0) && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-xs">
                {packingPlan.carrierCode && (
                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Truck className="h-3 w-3" />
                    <span>{packingPlan.carrierConstraints?.carrierName || packingPlan.carrierCode}</span>
                  </div>
                )}
                {packingPlan.estimatedShippingCost > 0 && (
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {t('estimatedShipping') || 'Est. shipping'}: {formatCurrency(packingPlan.estimatedShippingCost, packingPlan.shippingCurrency || 'EUR')}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
