import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  trend?: {
    value: number;
    label: string;
  };
  testId?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-blue-600",
  iconBgColor = "bg-blue-100",
  trend,
  testId,
}: MetricCardProps) {
  const valueString = typeof value === 'string' ? value : value.toString();
  
  return (
    <Card data-testid={testId}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <p 
              className="text-xl md:text-2xl font-bold text-slate-900 mt-1 break-words leading-tight" 
              data-testid={`${testId}-value`}
              title={valueString}
            >
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1 truncate" title={subtitle}>{subtitle}</p>
            )}
            {trend && (
              <p className={cn(
                "text-xs mt-1 font-medium",
                trend.value >= 0 ? "text-green-600" : "text-red-600"
              )} data-testid={`${testId}-trend`}>
                {trend.value >= 0 ? "+" : ""}{trend.value.toFixed(1)}% {trend.label}
              </p>
            )}
          </div>
          <div className={cn("p-3 rounded-lg flex-shrink-0", iconBgColor)}>
            <Icon className={cn("h-6 w-6", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
