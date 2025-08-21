import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/currencyUtils";
import { format, differenceInDays } from "date-fns";
import { 
  Truck,
  ArrowLeft,
  Search,
  MapPin,
  Calendar,
  Package,
  Clock,
  AlertCircle,
  CheckCircle,
  Ship,
  Plane,
  Building2,
  Globe,
  Navigation,
  Timer,
  Activity,
  ChevronRight
} from "lucide-react";

interface Shipment {
  id: string;
  trackingNumber: string;
  carrier: string;
  status: string;
  origin: string;
  destination: string;
  currentLocation?: string;
  estimatedArrival: string;
  actualArrival?: string;
  shippedDate: string;
  importOrders: Array<{
    id: string;
    orderNumber: string;
    itemCount: number;
    totalValue: number;
  }>;
  events: Array<{
    date: string;
    location: string;
    status: string;
    description: string;
  }>;
  progress: number;
}

export default function ShipmentTracking() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  // Fetch shipments
  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['/api/import-shipments'],
    queryFn: async () => {
      // This would fetch all import shipments
      const response = await fetch('/api/import-shipments');
      if (!response.ok) throw new Error('Failed to fetch shipments');
      return response.json();
    }
  });

  // Filter shipments
  const filteredShipments = shipments.filter((shipment: Shipment) => {
    return shipment.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
           shipment.carrier.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Group by status
  const inTransit = filteredShipments.filter((s: Shipment) => s.status === 'in_transit');
  const delivered = filteredShipments.filter((s: Shipment) => s.status === 'delivered');
  const pending = filteredShipments.filter((s: Shipment) => s.status === 'pending');
  const delayed = filteredShipments.filter((s: Shipment) => s.status === 'delayed');

  // Mock data for demonstration
  const mockShipments: Shipment[] = [
    {
      id: '1',
      trackingNumber: 'TRK123456789',
      carrier: 'DHL Express',
      status: 'in_transit',
      origin: 'Shanghai, China',
      destination: 'Prague, Czech Republic',
      currentLocation: 'Frankfurt, Germany',
      estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      shippedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      importOrders: [
        { id: '1', orderNumber: 'IMP2025-001', itemCount: 25, totalValue: 5000 },
        { id: '2', orderNumber: 'IMP2025-002', itemCount: 15, totalValue: 3000 }
      ],
      events: [
        { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), location: 'Shanghai, China', status: 'Picked up', description: 'Shipment picked up from supplier' },
        { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), location: 'Shanghai Airport', status: 'Departed', description: 'Departed from origin facility' },
        { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), location: 'Dubai, UAE', status: 'In transit', description: 'Arrived at transit hub' },
        { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), location: 'Frankfurt, Germany', status: 'In transit', description: 'Customs clearance in progress' }
      ],
      progress: 65
    },
    {
      id: '2',
      trackingNumber: 'FDX987654321',
      carrier: 'FedEx',
      status: 'delivered',
      origin: 'Ho Chi Minh, Vietnam',
      destination: 'Prague, Czech Republic',
      estimatedArrival: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      actualArrival: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      shippedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      importOrders: [
        { id: '3', orderNumber: 'IMP2025-003', itemCount: 50, totalValue: 12000 }
      ],
      events: [],
      progress: 100
    }
  ];

  const displayShipments = shipments.length > 0 ? filteredShipments : mockShipments;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'default';
      case 'in_transit': return 'secondary';
      case 'delayed': return 'destructive';
      default: return 'outline';
    }
  };

  const getCarrierIcon = (carrier: string) => {
    if (carrier.toLowerCase().includes('air') || carrier.toLowerCase().includes('fedex') || carrier.toLowerCase().includes('dhl')) {
      return <Plane className="h-4 w-4" />;
    }
    if (carrier.toLowerCase().includes('sea') || carrier.toLowerCase().includes('maersk')) {
      return <Ship className="h-4 w-4" />;
    }
    return <Truck className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b md:relative md:border-0">
        <div className="flex items-center justify-between p-4 md:p-0">
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/imports">
              <Button variant="ghost" size="icon" className="md:hidden">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" className="hidden md:flex">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Imports
              </Button>
            </Link>
            <div>
              <h1 className="text-lg md:text-2xl font-semibold">Shipment Tracking</h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Track all import shipments in real-time
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-4 md:px-0">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">In Transit</p>
                <p className="text-xl font-bold">{inTransit.length}</p>
              </div>
              <Truck className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Delivered</p>
                <p className="text-xl font-bold">{delivered.length}</p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-xl font-bold">{pending.length}</p>
              </div>
              <Clock className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Delayed</p>
                <p className="text-xl font-bold">{delayed.length}</p>
              </div>
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mx-4 md:mx-0">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by tracking number or carrier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Shipments List */}
      <div className="px-4 md:px-0 space-y-4">
        {displayShipments.map((shipment: Shipment) => (
          <Card key={shipment.id} className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedShipment(shipment)}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getCarrierIcon(shipment.carrier)}
                    <CardTitle className="text-base">{shipment.trackingNumber}</CardTitle>
                    <Badge variant={getStatusColor(shipment.status)}>
                      {shipment.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {shipment.carrier} • Shipped {format(new Date(shipment.shippedDate), 'MMM d, yyyy')}
                  </CardDescription>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Route */}
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">From:</span>
                <span className="font-medium">{shipment.origin}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">{shipment.destination}</span>
              </div>

              {/* Current Location */}
              {shipment.currentLocation && (
                <div className="flex items-center gap-2 text-sm">
                  <Navigation className="h-4 w-4 text-blue-500" />
                  <span className="text-muted-foreground">Current:</span>
                  <span className="font-medium">{shipment.currentLocation}</span>
                </div>
              )}

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{shipment.progress}%</span>
                </div>
                <Progress value={shipment.progress} className="h-2" />
              </div>

              {/* ETA */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">ETA:</span>
                  <span className="font-medium">
                    {format(new Date(shipment.estimatedArrival), 'MMM d, yyyy')}
                  </span>
                </div>
                {shipment.actualArrival ? (
                  <Badge variant="outline" className="text-xs">
                    Delivered {format(new Date(shipment.actualArrival), 'MMM d')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    {differenceInDays(new Date(shipment.estimatedArrival), new Date())} days
                  </Badge>
                )}
              </div>

              {/* Import Orders */}
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-2">Import Orders</div>
                <div className="space-y-1">
                  {shipment.importOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between text-sm">
                      <Link href={`/imports/orders/${order.id}`}>
                        <Button variant="link" size="sm" className="p-0 h-auto">
                          {order.orderNumber}
                        </Button>
                      </Link>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{order.itemCount} items</span>
                        <span>{formatCurrency(order.totalValue, 'USD')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline Preview */}
              {shipment.events.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-2">Latest Update</div>
                  <div className="flex items-start gap-2">
                    <Activity className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{shipment.events[shipment.events.length - 1].status}</p>
                      <p className="text-xs text-muted-foreground">
                        {shipment.events[shipment.events.length - 1].location} • 
                        {format(new Date(shipment.events[shipment.events.length - 1].date), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {displayShipments.length === 0 && !isLoading && (
          <Card>
            <CardContent className="p-8 text-center">
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No shipments to track</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed View Modal */}
      {selectedShipment && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center"
             onClick={() => setSelectedShipment(null)}>
          <div className="bg-background w-full md:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-xl md:rounded-xl p-4 md:p-6"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Shipment Details</h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedShipment(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Header Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{selectedShipment.trackingNumber}</h4>
                  <Badge variant={getStatusColor(selectedShipment.status)}>
                    {selectedShipment.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{selectedShipment.carrier}</p>
              </div>

              {/* Timeline */}
              <div className="space-y-2">
                <h5 className="font-medium text-sm">Tracking Timeline</h5>
                <div className="space-y-3 relative before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
                  {selectedShipment.events.map((event, index) => (
                    <div key={index} className="flex gap-3 relative">
                      <div className={`w-4 h-4 rounded-full border-2 bg-background z-10 ${
                        index === 0 ? 'border-primary' : 'border-muted-foreground'
                      }`} />
                      <div className="flex-1 pb-3">
                        <p className="font-medium text-sm">{event.status}</p>
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {event.location} • {format(new Date(event.date), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}