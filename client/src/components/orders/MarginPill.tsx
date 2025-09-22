import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/currencyUtils";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

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
  // Handle null/undefined landing costs gracefully
  if (!landingCost || landingCost <= 0 || !sellingPrice || sellingPrice <= 0) {
    return (
      <Badge 
        variant="outline" 
        className={cn("bg-gray-50 text-gray-600 border-gray-200", className)}
        data-testid="margin-pill-unavailable"
      >
        N/A
      </Badge>
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
    if (marginPercentage > 30) return "text-green-700 bg-green-50 border-green-200";
    if (marginPercentage >= 15) return "text-yellow-700 bg-yellow-50 border-yellow-200";
    if (marginPercentage >= 0) return "text-red-700 bg-red-50 border-red-200";
    return "text-red-900 bg-red-100 border-red-300"; // negative margin
  };

  const getMarginIcon = () => {
    if (marginPercentage > 30) return <TrendingUp className="h-3 w-3" />;
    if (marginPercentage >= 15) return <AlertTriangle className="h-3 w-3" />;
    return <TrendingDown className="h-3 w-3" />;
  };

  // Format tooltip content
  const tooltipContent = (
    <div className="space-y-2 text-xs">
      <div className="font-medium border-b pb-1">Margin Breakdown</div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span>Selling Price:</span>
          <span className="font-medium">{formatCurrency(totalSellingPrice, currency)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Landing Cost:</span>
          <span className="font-medium">{formatCurrency(totalLandingCost, currency)}</span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t">
          <span>Profit:</span>
          <span className={cn("font-bold", profit >= 0 ? "text-green-600" : "text-red-600")}>
            {formatCurrency(profit, currency)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Margin:</span>
          <span className={cn("font-bold", marginPercentage >= 0 ? "text-green-600" : "text-red-600")}>
            {marginPercentage.toFixed(1)}%
          </span>
        </div>
        {quantity > 1 && (
          <div className="text-xs text-muted-foreground pt-1 border-t">
            Quantity: {quantity} units
          </div>
        )}
      </div>
    </div>
  );

  const marginDisplay = (
    <Badge 
      variant="outline"
      className={cn(
        "font-medium transition-colors cursor-help",
        getMarginColor(),
        className
      )}
      data-testid="margin-pill"
      data-margin={marginPercentage.toFixed(1)}
    >
      <span className="flex items-center gap-1">
        {showIcon && getMarginIcon()}
        <span>{marginPercentage.toFixed(1)}%</span>
        {showProfit && (
          <>
            <span className="opacity-60">•</span>
            <span>{formatCurrency(profit, currency)}</span>
          </>
        )}
      </span>
    </Badge>
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