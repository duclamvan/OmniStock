import * as React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { themeClasses } from "@/lib/theme-utils";

type CardVariant = 'default' | 'secondary' | 'elevated';

interface ThemedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const variantClasses: Record<CardVariant, string> = {
  default: `${themeClasses.surface.primary} ${themeClasses.border.default}`,
  secondary: `${themeClasses.surface.secondary} ${themeClasses.border.subtle}`,
  elevated: `${themeClasses.surface.elevated} ${themeClasses.border.default}`,
};

const ThemedCard = React.forwardRef<HTMLDivElement, ThemedCardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => (
    <Card
      ref={ref}
      className={cn(variantClasses[variant], className)}
      {...props}
    >
      {children}
    </Card>
  )
);
ThemedCard.displayName = "ThemedCard";

const ThemedCardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <CardHeader
      ref={ref}
      className={cn("p-6 border-b border-gray-200 dark:border-gray-700", className)}
      {...props}
    />
  )
);
ThemedCardHeader.displayName = "ThemedCardHeader";

const ThemedCardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <CardTitle
      ref={ref}
      className={cn(themeClasses.text.primary, className)}
      {...props}
    />
  )
);
ThemedCardTitle.displayName = "ThemedCardTitle";

const ThemedCardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <CardDescription
      ref={ref}
      className={cn(themeClasses.text.muted, className)}
      {...props}
    />
  )
);
ThemedCardDescription.displayName = "ThemedCardDescription";

const ThemedCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <CardContent
      ref={ref}
      className={cn("p-6", className)}
      {...props}
    />
  )
);
ThemedCardContent.displayName = "ThemedCardContent";

const ThemedCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <CardFooter
      ref={ref}
      className={cn("p-6 border-t border-gray-200 dark:border-gray-700", className)}
      {...props}
    />
  )
);
ThemedCardFooter.displayName = "ThemedCardFooter";

export {
  ThemedCard,
  ThemedCardHeader,
  ThemedCardTitle,
  ThemedCardDescription,
  ThemedCardContent,
  ThemedCardFooter,
};
