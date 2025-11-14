import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { themeClasses, ThemeBadgeVariant } from "@/lib/theme-utils";

interface ThemedBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: ThemeBadgeVariant;
}

const ThemedBadge = React.forwardRef<HTMLDivElement, ThemedBadgeProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const badgeClass = themeClasses.badge[variant];
    
    return (
      <Badge
        ref={ref}
        className={cn(badgeClass, "border", className)}
        {...props}
      >
        {children}
      </Badge>
    );
  }
);
ThemedBadge.displayName = "ThemedBadge";

export { ThemedBadge };
