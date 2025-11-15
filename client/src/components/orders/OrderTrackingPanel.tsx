import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Truck, Package, CheckCircle2, AlertCircle, Clock, MapPin, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { formatDate } from "@/lib/currencyUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/SettingsContext";
import { useState } from "react";

interface OrderTrackingPanelProps {
  orderId: string;
}

export function OrderTrackingPanel({ orderId }: OrderTrackingPanelProps) {
  const { toast } = useToast();
  const [expandedCartons, setExpandedCartons] = useState<Set<string>>(new Set());
  const { shippingSettings } = useSettings();
  
  // Read settings with fallbacks
  const enableTracking = shippingSettings?.enableTracking ?? true;
  const autoUpdateTrackingStatus = shippingSettings?.autoUpdateTrackingStatus ?? true;
  const trackingUpdateFrequencyHours = shippingSettings?.trackingUpdateFrequencyHours ?? 1;
  
  const { data: tracking, isLoading } = useQuery({
    queryKey: ['/api/orders', orderId, 'tracking'],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${orderId}/tracking`);
      if (!res.ok) throw new Error('Failed to fetch tracking');
      return res.json();
    },
    // Disable query if tracking is disabled
    enabled: enableTracking,
    // Use configured frequency for auto-updates, or disable if autoUpdate is off
    refetchInterval: autoUpdateTrackingStatus ? trackingUpdateFrequencyHours * 60 * 60 * 1000 : false,
  });
  
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/orders/${orderId}/tracking?force=true`);
      if (!res.ok) throw new Error('Failed to refresh tracking');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders', orderId, 'tracking'] });
      toast({
        title: "Tracking Refreshed",
        description: "Tracking information has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: error.message || "Failed to refresh tracking",
      });
    },
  });
  
  const toggleCarton = (cartonId: string) => {
    setExpandedCartons(prev => {
      const next = new Set(prev);
      if (next.has(cartonId)) {
        next.delete(cartonId);
      } else {
        next.add(cartonId);
      }
      return next;
    });
  };
  
  // Early return if tracking is disabled
  if (!enableTracking) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Shipment Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Tracking is disabled. Enable it in Settings &gt; Shipping to view shipment tracking.
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Shipment Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading tracking information...</div>
        </CardContent>
      </Card>
    );
  }
  
  if (!tracking || tracking.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Shipment Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No tracking information available</div>
        </CardContent>
      </Card>
    );
  }
  
  const statusConfig = {
    delivered: { variant: 'default', icon: CheckCircle2, color: 'text-green-600 dark:text-green-400' },
    out_for_delivery: { variant: 'secondary', icon: Truck, color: 'text-blue-600 dark:text-blue-400' },
    in_transit: { variant: 'outline', icon: Package, color: 'text-yellow-600 dark:text-yellow-400' },
    exception: { variant: 'destructive', icon: AlertCircle, color: 'text-red-600 dark:text-red-400' },
    created: { variant: 'outline', icon: Clock, color: 'text-gray-600 dark:text-gray-400' },
    unknown: { variant: 'outline', icon: Package, color: 'text-gray-600 dark:text-gray-400' },
  } as const;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Shipment Tracking
            </CardTitle>
            <CardDescription>{tracking.length} carton{tracking.length !== 1 ? 's' : ''} tracked</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            data-testid="button-refresh-tracking"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {tracking.map((shipment: any, idx: number) => {
          const config = statusConfig[shipment.statusCode as keyof typeof statusConfig] || statusConfig.unknown;
          const Icon = config.icon;
          const isExpanded = expandedCartons.has(shipment.id);
          
          return (
            <div key={shipment.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={config.variant as any} className="font-mono">
                      {shipment.carrier.toUpperCase()}: {shipment.trackingNumber}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Icon className={`h-4 w-4 ${config.color}`} />
                    <span className="font-medium">{shipment.statusLabel}</span>
                  </div>
                  {shipment.estimatedDelivery && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Estimated delivery: {formatDate(shipment.estimatedDelivery)}
                    </div>
                  )}
                  {shipment.errorState && (
                    <div className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {shipment.errorState}
                    </div>
                  )}
                </div>
                {shipment.checkpoints && shipment.checkpoints.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCarton(shipment.id)}
                    data-testid={`button-toggle-tracking-${idx}`}
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                )}
              </div>
              
              {isExpanded && shipment.checkpoints && shipment.checkpoints.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Tracking History</div>
                    <div className="space-y-2">
                      {shipment.checkpoints.map((checkpoint: any, checkIdx: number) => (
                        <div key={checkIdx} className="flex gap-3 text-sm">
                          <div className="flex flex-col items-center">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            {checkIdx < shipment.checkpoints.length - 1 && (
                              <div className="w-0.5 h-full bg-border min-h-[20px]" />
                            )}
                          </div>
                          <div className="flex-1 pb-3">
                            <div className="font-medium">{checkpoint.description}</div>
                            <div className="flex items-center gap-2 text-muted-foreground text-xs mt-1">
                              <Clock className="h-3 w-3" />
                              {new Date(checkpoint.timestamp).toLocaleString()}
                            </div>
                            {checkpoint.location && (
                              <div className="flex items-center gap-2 text-muted-foreground text-xs mt-1">
                                <MapPin className="h-3 w-3" />
                                {checkpoint.location}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
