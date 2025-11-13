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
  return (
    <Card data-testid={testId}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1" data-testid={`${testId}-value`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
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
          <div className={cn("p-3 rounded-lg ml-4", iconBgColor)}>
            <Icon className={cn("h-6 w-6", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
