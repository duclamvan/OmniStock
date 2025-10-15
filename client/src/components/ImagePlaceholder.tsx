import type { HTMLAttributes } from "react";
import { LucideIcon, Package, Image as ImageIcon, User, Building } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImagePlaceholderProps extends HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  variant?: "default" | "product" | "user" | "building" | "subtle";
  rounded?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

const sizeMap = {
  xs: "w-10 h-10",
  sm: "w-16 h-16",
  md: "w-24 h-24",
  lg: "w-32 h-32",
  xl: "w-40 h-40",
  "2xl": "w-48 h-48",
};

const iconSizeMap = {
  xs: "h-5 w-5",
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
  xl: "h-20 w-20",
  "2xl": "h-24 w-24",
};

const variantMap = {
  default: {
    bg: "bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100",
    border: "border-2 border-slate-200",
    icon: "text-slate-400",
    defaultIcon: Package,
  },
  product: {
    bg: "bg-gradient-to-br from-blue-50 via-white to-blue-50",
    border: "border-2 border-blue-200",
    icon: "text-blue-400",
    defaultIcon: Package,
  },
  user: {
    bg: "bg-gradient-to-br from-purple-50 via-white to-purple-50",
    border: "border-2 border-purple-200",
    icon: "text-purple-400",
    defaultIcon: User,
  },
  building: {
    bg: "bg-gradient-to-br from-orange-50 via-white to-orange-50",
    border: "border-2 border-orange-200",
    icon: "text-orange-400",
    defaultIcon: Building,
  },
  subtle: {
    bg: "bg-gradient-to-br from-slate-50 via-white to-slate-50",
    border: "border border-slate-200",
    icon: "text-slate-300",
    defaultIcon: ImageIcon,
  },
};

const roundedMap = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  full: "rounded-full",
};

export function ImagePlaceholder({
  icon,
  size = "md",
  variant = "default",
  className,
  rounded = "xl",
  ...props
}: ImagePlaceholderProps) {
  const variantConfig = variantMap[variant];
  const Icon = icon || variantConfig.defaultIcon;

  return (
    <div
      className={cn(
        "flex items-center justify-center shadow-sm backdrop-blur-sm",
        sizeMap[size],
        variantConfig.bg,
        variantConfig.border,
        roundedMap[rounded],
        className
      )}
      {...props}
    >
      <Icon className={cn(iconSizeMap[size], variantConfig.icon)} />
    </div>
  );
}
