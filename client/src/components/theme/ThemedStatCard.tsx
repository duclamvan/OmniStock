import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { themeClasses } from "@/lib/theme-utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ThemedStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: {
    value: string | number;
    trend: 'up' | 'down' | 'neutral';
  };
  variant?: 'default' | 'secondary' | 'elevated';
  className?: string;
}

const ThemedStatCard = React.forwardRef<HTMLDivElement, ThemedStatCardProps>(
  ({ icon: Icon, label, value, change, variant = 'default', className }, ref) => {
    const variantClasses = {
      default: `${themeClasses.surface.primary} ${themeClasses.border.default}`,
      secondary: `${themeClasses.surface.secondary} ${themeClasses.border.subtle}`,
      elevated: `${themeClasses.surface.elevated} ${themeClasses.border.default}`,
    };

    const trendConfig = {
      up: {
        icon: TrendingUp,
        className: themeClasses.stat.change.positive,
      },
      down: {
        icon: TrendingDown,
        className: themeClasses.stat.change.negative,
      },
      neutral: {
        icon: Minus,
        className: themeClasses.stat.change.neutral,
      },
    };

    return (
      <Card
        ref={ref}
        className={cn(variantClasses[variant], className)}
      >
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-1">
              <p className={cn(
                "text-sm font-medium",
                themeClasses.text.muted
              )}>
                {label}
              </p>
              <p className={cn(
                "text-2xl font-bold",
                themeClasses.text.primary
              )}>
                {value}
              </p>
              {change && (
                <div className="flex items-center gap-1 text-xs">
                  {React.createElement(trendConfig[change.trend].icon, {
                    className: cn("h-3 w-3", trendConfig[change.trend].className)
                  })}
                  <span className={trendConfig[change.trend].className}>
                    {change.value}
                  </span>
                </div>
              )}
            </div>
            <div className={cn(
              "p-3 rounded-lg ml-4",
              themeClasses.stat.icon
            )}>
              <Icon className={cn("h-6 w-6 text-primary")} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);
ThemedStatCard.displayName = "ThemedStatCard";

export { ThemedStatCard };
