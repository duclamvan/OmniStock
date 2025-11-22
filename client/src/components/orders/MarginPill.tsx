import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/currencyUtils";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface MarginPillProps {
  sellingPrice: number;
  landingCost: number | null | undefined;
  currency: string;
  quantity?: number;
  className?: string;
  showIcon?: boolean;
  showProfit?: boolean;
}

export default function MarginPill({
  sellingPrice,
  landingCost,
  currency,
  quantity = 1,
  className,
  showIcon = true,
  showProfit = true
}: MarginPillProps) {
  const { t } = useTranslation(['orders', 'common']);
  
  // Handle null/undefined landing costs gracefully
  if (!landingCost || landingCost <= 0 || !sellingPrice || sellingPrice <= 0) {
    return (
      <span 
        className={cn("text-xs text-gray-500 dark:text-gray-400", className)}
        data-testid="margin-pill-unavailable"
      >
        {t('common:na')}
      </span>
    );
  }

  // Calculate margin and profit
  const totalSellingPrice = sellingPrice * quantity;
  const totalLandingCost = landingCost * quantity;
  const profit = totalSellingPrice - totalLandingCost;
  const marginPercentage = ((totalSellingPrice - totalLandingCost) / totalSellingPrice) * 100;

  // Determine color scheme based on margin percentage
  const getMarginVariant = () => {
    if (marginPercentage > 30) return "success";
    if (marginPercentage >= 15) return "warning";
    if (marginPercentage >= 0) return "destructive";
    return "destructive"; // negative margin
  };

  const getMarginColor = () => {
    if (marginPercentage > 30) return "text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700";
    if (marginPercentage >= 15) return "text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700";
    if (marginPercentage >= 0) return "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700";
    return "text-red-900 dark:text-red-100 bg-red-100 dark:bg-red-900/50 border-red-300 dark:border-red-700"; // negative margin
  };

  const getMarginIcon = () => {
    if (marginPercentage > 30) return <TrendingUp className="h-3 w-3" />;
    if (marginPercentage >= 15) return <AlertTriangle className="h-3 w-3" />;
    return <TrendingDown className="h-3 w-3" />;
  };

  // Format tooltip content
  const tooltipContent = (
    <div className="space-y-2 text-xs">
      <div className="font-medium border-b pb-1">{t('orders:marginBreakdown')}</div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span>{t('orders:sellingPrice')}:</span>
          <span className="font-medium">{formatCurrency(totalSellingPrice, currency)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>{t('orders:landingCost')}:</span>
          <span className="font-medium">{formatCurrency(totalLandingCost, currency)}</span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t">
          <span>{t('common:profit')}:</span>
          <span className={cn("font-bold", profit >= 0 ? "text-green-600" : "text-red-600")}>
            {formatCurrency(profit, currency)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span>{t('common:margin')}:</span>
          <span className={cn("font-bold", marginPercentage >= 0 ? "text-green-600" : "text-red-600")}>
            {marginPercentage.toFixed(1)}%
          </span>
        </div>
        {quantity > 1 && (
          <div className="text-xs text-muted-foreground pt-1 border-t">
            {t('orders:quantityUnits', { count: quantity })}
          </div>
        )}
      </div>
    </div>
  );

  const marginDisplay = (
    <span 
      className={cn(
        "text-xs font-medium cursor-help inline-flex items-center gap-1",
        marginPercentage > 30 ? "text-green-700 dark:text-green-400" : marginPercentage >= 15 ? "text-yellow-700 dark:text-yellow-400" : "text-red-700 dark:text-red-400",
        className
      )}
      data-testid="margin-pill"
      data-margin={marginPercentage.toFixed(1)}
    >
      {showIcon && getMarginIcon()}
      <span>{marginPercentage.toFixed(1)}%</span>
      {showProfit && (
        <>
          <span className="opacity-60">•</span>
          <span>{formatCurrency(profit, currency)}</span>
        </>
      )}
    </span>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {marginDisplay}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}