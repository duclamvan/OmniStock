import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, CheckCircle2, AlertCircle, Clock, MapPin } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";

interface TrackingStatusBadgeProps {
  orderId: string;
  orderStatus?: string;
  cachedStatus?: string;
  cachedLastEvent?: string;
  cachedLastEventAt?: string;
}

export function TrackingStatusBadge({ 
  orderId, 
  orderStatus,
  cachedStatus,
  cachedLastEvent,
  cachedLastEventAt
}: TrackingStatusBadgeProps) {
  const { t } = useTranslation(['orders', 'common']);
  
  const isDelivered = orderStatus === 'delivered' || cachedStatus === 'delivered';
  
  const { data: tracking, isLoading } = useQuery({
    queryKey: ['/api/orders', orderId, 'tracking'],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${orderId}/tracking`);
      if (!res.ok) throw new Error('Failed to fetch tracking');
      return res.json();
    },
    refetchInterval: isDelivered ? false : 60 * 1000,
    enabled: !isDelivered,
    staleTime: isDelivered ? Infinity : 30 * 1000,
  });
  
  if (isDelivered) {
    const lastEventTime = cachedLastEventAt 
      ? formatDistanceToNow(new Date(cachedLastEventAt), { addSuffix: true })
      : null;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="text-xs cursor-help bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {t('orders:delivered')}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs max-w-[200px]">
              <div className="font-medium text-emerald-600">{t('orders:deliveryComplete')}</div>
              {cachedLastEvent && (
                <div className="text-muted-foreground mt-1">{cachedLastEvent}</div>
              )}
              {lastEventTime && (
                <div className="text-muted-foreground opacity-75">{lastEventTime}</div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  if (isLoading) {
    return <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1 animate-pulse" />{t('common:loading')}</Badge>;
  }
  
  if (!tracking || tracking.length === 0) {
    return <Badge variant="outline" className="text-xs text-muted-foreground">{t('orders:noTracking')}</Badge>;
  }
  
  const latest = tracking.reduce((prev: any, curr: any) => {
    if (!prev) return curr;
    return new Date(curr.lastEventAt || 0) > new Date(prev.lastEventAt || 0) ? curr : prev;
  }, null);
  
  const statusConfig = {
    delivered: { 
      variant: 'default', 
      icon: CheckCircle2, 
      label: t('orders:delivered'),
      className: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700'
    },
    out_for_delivery: { 
      variant: 'secondary', 
      icon: Truck, 
      label: t('orders:outForDelivery'),
      className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-700'
    },
    in_transit: { 
      variant: 'outline', 
      icon: MapPin, 
      label: t('orders:inTransit'),
      className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200 border-purple-200 dark:border-purple-700'
    },
    exception: { 
      variant: 'destructive', 
      icon: AlertCircle, 
      label: t('orders:exception'),
      className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 border-red-200 dark:border-red-700'
    },
    created: { 
      variant: 'outline', 
      icon: Package, 
      label: t('orders:labelCreated'),
      className: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
    },
    unknown: { 
      variant: 'outline', 
      icon: Package, 
      label: t('common:unknown'),
      className: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
    },
  } as const;
  
  const config = statusConfig[latest?.statusCode as keyof typeof statusConfig] || statusConfig.unknown;
  const Icon = config.icon;
  
  const lastEventTime = latest?.lastEventAt 
    ? formatDistanceToNow(new Date(latest.lastEventAt), { addSuffix: true })
    : null;
  const lastCheckedTime = latest?.lastCheckedAt 
    ? formatDistanceToNow(new Date(latest.lastCheckedAt), { addSuffix: true })
    : t('orders:never');
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`text-xs cursor-help ${config.className}`}>
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs max-w-[250px]">
            <div className="font-medium">{latest?.statusLabel || config.label}</div>
            {latest?.lastEvent && (
              <div className="text-muted-foreground mt-1 line-clamp-2">{latest.lastEvent}</div>
            )}
            {lastEventTime && (
              <div className="text-muted-foreground opacity-75 mt-0.5">{lastEventTime}</div>
            )}
            <div className="border-t border-slate-200 dark:border-slate-600 mt-2 pt-1.5">
              <div className="text-muted-foreground">
                {t('orders:cartonsCount', { count: tracking.length })}
              </div>
              <div className="text-muted-foreground opacity-75">
                {t('orders:lastUpdate', { time: lastCheckedTime })}
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
