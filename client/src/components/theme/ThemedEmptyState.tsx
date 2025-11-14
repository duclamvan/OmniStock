import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { themeClasses } from "@/lib/theme-utils";
import { LucideIcon } from "lucide-react";

interface ThemedEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const ThemedEmptyState = React.forwardRef<HTMLDivElement, ThemedEmptyStateProps>(
  ({ icon: Icon, title, description, action, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center py-12 px-4 text-center",
          themeClasses.surface.secondary,
          "rounded-lg border",
          themeClasses.border.subtle,
          className
        )}
      >
        <div className={cn(
          "rounded-full p-3 mb-4",
          themeClasses.surface.elevated
        )}>
          <Icon className={cn("h-8 w-8", themeClasses.text.muted)} />
        </div>
        <h3 className={cn(
          "text-lg font-semibold mb-2",
          themeClasses.text.primary
        )}>
          {title}
        </h3>
        {description && (
          <p className={cn(
            "text-sm mb-6 max-w-md",
            themeClasses.text.muted
          )}>
            {description}
          </p>
        )}
        {action && (
          <Button onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    );
  }
);
ThemedEmptyState.displayName = "ThemedEmptyState";

export { ThemedEmptyState };
