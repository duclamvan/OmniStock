import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TrackingStatusBadgeProps {
  orderId: string;
}

export function TrackingStatusBadge({ orderId }: TrackingStatusBadgeProps) {
  const { data: tracking, isLoading } = useQuery({
    queryKey: ['/api/orders', orderId, 'tracking'],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${orderId}/tracking`);
      if (!res.ok) throw new Error('Failed to fetch tracking');
      return res.json();
    },
    refetchInterval: 60 * 1000, // Refresh every 60 seconds
  });
  
  if (isLoading) {
    return <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" />Loading...</Badge>;
  }
  
  if (!tracking || tracking.length === 0) {
    return <Badge variant="outline" className="text-xs">No tracking</Badge>;
  }
  
  // Get the most recent status
  const latest = tracking.reduce((prev: any, curr: any) => {
    if (!prev) return curr;
    return new Date(curr.lastEventAt || 0) > new Date(prev.lastEventAt || 0) ? curr : prev;
  }, null);
  
  const statusConfig = {
    delivered: { variant: 'default', icon: CheckCircle2, label: 'Delivered' },
    out_for_delivery: { variant: 'secondary', icon: Truck, label: 'Out for Delivery' },
    in_transit: { variant: 'outline', icon: Package, label: 'In Transit' },
    exception: { variant: 'destructive', icon: AlertCircle, label: 'Exception' },
    created: { variant: 'outline', icon: Clock, label: 'Label Created' },
    unknown: { variant: 'outline', icon: Package, label: 'Unknown' },
  } as const;
  
  const config = statusConfig[latest?.statusCode as keyof typeof statusConfig] || statusConfig.unknown;
  const Icon = config.icon;
  
  const lastUpdate = latest?.lastCheckedAt ? new Date(latest.lastCheckedAt).toLocaleString() : 'Never';
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.variant as any} className="text-xs cursor-help">
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <div className="font-medium">{latest?.statusLabel}</div>
            <div className="text-muted-foreground">
              {tracking.length} carton{tracking.length !== 1 ? 's' : ''}
            </div>
            <div className="text-muted-foreground">Last update: {lastUpdate}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
