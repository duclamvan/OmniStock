import { Trophy, Shield, Zap, Flame, Star, Target, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDate } from "@/lib/currencyUtils";

interface BadgeItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  earnedAt: string;
}

interface BadgeDisplayProps {
  badges: BadgeItem[];
  size?: "sm" | "md" | "lg";
}

const iconMap: Record<string, typeof Trophy> = {
  trophy: Trophy,
  shield: Shield,
  zap: Zap,
  flame: Flame,
  star: Star,
  target: Target,
  award: Award,
};

const sizeClasses = {
  sm: {
    icon: "h-3 w-3",
    badge: "px-2 py-0.5 text-xs gap-1",
    container: "gap-1",
  },
  md: {
    icon: "h-4 w-4",
    badge: "px-2.5 py-1 text-sm gap-1.5",
    container: "gap-2",
  },
  lg: {
    icon: "h-5 w-5",
    badge: "px-3 py-1.5 text-base gap-2",
    container: "gap-3",
  },
};

export default function BadgeDisplay({ badges, size = "md" }: BadgeDisplayProps) {
  const sizeClass = sizeClasses[size];

  if (!badges || badges.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic" data-testid="badge-display-empty">
        No badges earned yet
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap ${sizeClass.container}`} data-testid="badge-display">
      <TooltipProvider>
        {badges.map((badge) => {
          const IconComponent = iconMap[badge.icon.toLowerCase()] || Award;
          return (
            <Tooltip key={badge.id}>
              <TooltipTrigger asChild>
                <div
                  className={`inline-flex items-center ${sizeClass.badge} rounded-full border bg-secondary/50 hover:bg-secondary cursor-default transition-colors`}
                  data-testid={`badge-item-${badge.id}`}
                >
                  <IconComponent className={`${sizeClass.icon} text-primary`} />
                  <span className="font-medium">{badge.name}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-xs">
                  <p className="font-semibold">{badge.name}</p>
                  <p className="text-sm text-muted-foreground">{badge.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Earned: {formatDate(badge.earnedAt)}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
}
