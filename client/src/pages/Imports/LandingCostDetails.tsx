import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  Calendar,
  MapPin,
  Hash,
  Box
} from "lucide-react";
import { format } from "date-fns";
import CostsPanel from "@/components/receiving/CostsPanel";

interface Shipment {
  id: number;
  consolidationId: number | null;
  carrier: string;
  trackingNumber: string;
  shipmentName?: string;
  shipmentType?: string;
  origin: string;
  destination: string;
  status: string;
  shippingCost: string;
  shippingCostCurrency?: string;
  estimatedDelivery: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: any[];
  itemCount: number;
  totalWeight?: number;
  totalUnits?: number;
  unitType?: string;
  notes?: string;
}

export default function LandingCostDetails() {
  const { id } = useParams();

  // Fetch shipment details
  const { data: shipment, isLoading } = useQuery<Shipment>({
    queryKey: [`/api/imports/shipments/${id}`],
    enabled: !!id
  });

  if (isLoading || !shipment) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'in transit':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="container mx-auto p-3 md:p-4">
      {/* Header */}
      <div className="mb-3">
        <Link href="/imports/landing-costs">
          <Button variant="ghost" size="sm" className="mb-2 h-8" data-testid="button-back-to-list">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Back to Landing Costs
          </Button>
        </Link>
        
        {/* Title Row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">
              {shipment.shipmentName || `Shipment #${shipment.id}`}
            </h1>
            <p className="text-xs text-muted-foreground">
              Calculate and review landed costs for this shipment
            </p>
          </div>
          <Badge className={`${getStatusColor(shipment.status)} px-2.5 py-0.5 text-sm`}>
            {shipment.status?.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        </div>

        {/* Shipment Info Bar */}
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 border rounded-lg p-3 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground mb-0.5">Carrier</p>
              <p className="font-medium flex items-center gap-1">
                <Truck className="h-3 w-3" />
                {shipment.carrier}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Tracking Number</p>
              <p className="font-medium flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {shipment.trackingNumber}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Items</p>
              <p className="font-medium flex items-center gap-1">
                <Package className="h-3 w-3" />
                {shipment.itemCount} items
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Origin → Destination</p>
              <p className="font-medium flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {shipment.origin} → {shipment.destination}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-0.5">Created</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(shipment.createdAt), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>

          {shipment.totalUnits && shipment.totalWeight && (
            <div className="mt-2 pt-2 border-t">
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <Box className="h-3 w-3" />
                  <span className="font-medium">
                    {shipment.totalUnits} {shipment.unitType || 'units'}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  <span className="font-medium">
                    {shipment.totalWeight} kg
                  </span>
                </span>
              </div>
            </div>
          )}

          {shipment.notes && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="text-xs mt-1">{shipment.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Items Summary */}
      {shipment.items && shipment.items.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Shipment Items ({shipment.itemCount})
            </CardTitle>
            <CardDescription className="text-xs">
              Products included in this shipment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {shipment.items.map((item: any, index: number) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name || item.productName || 'Unknown Product'}</p>
                    {item.sku && (
                      <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-semibold">Qty: {item.quantity || 0}</p>
                    {item.unitPrice && (
                      <p className="text-xs text-muted-foreground">
                        ${parseFloat(item.unitPrice).toFixed(2)} / unit
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Landing Costs Panel - Reused from Receiving */}
      <CostsPanel 
        shipmentId={parseInt(id || '0')} 
        onUpdate={() => {
          // Optionally refresh shipment data when costs are updated
        }}
      />
    </div>
  );
}
