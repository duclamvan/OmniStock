import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plane, Ship, Rocket, Package, MapPin, Calendar, Clock, AlertCircle, Truck, Plus } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { Shipment, InsertShipment, Consolidation } from '@shared/schema';

// Carrier options
const CARRIERS = [
  { value: 'DHL', label: 'DHL Express', logo: '📦' },
  { value: 'FedEx', label: 'FedEx', logo: '✈️' },
  { value: 'UPS', label: 'UPS', logo: '🚚' },
  { value: 'Maersk', label: 'Maersk Line', logo: '🚢' },
  { value: 'CMA CGM', label: 'CMA CGM', logo: '⚓' },
  { value: 'China Post', label: 'China Post', logo: '🇨🇳' },
];

export default function InternationalTransit() {
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [isCreateShipmentOpen, setIsCreateShipmentOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { toast } = useToast();

  // Fetch shipments
  const { data: shipments = [], isLoading } = useQuery<Shipment[]>({
    queryKey: ['/api/imports/shipments'],
  });

  // Fetch ready consolidations
  const { data: readyConsolidations = [] } = useQuery<Consolidation[]>({
    queryKey: ['/api/imports/consolidations'],
    select: (consolidations) => consolidations.filter(c => c.status === 'ready' && !c.shipmentId),
  });

  // Create shipment mutation
  const createShipmentMutation = useMutation({
    mutationFn: async (data: { shipment: InsertShipment; consolidationIds: number[] }) => {
      return await apiRequest('/api/imports/shipments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/consolidations'] });
      setIsCreateShipmentOpen(false);
      toast({
        title: 'Success',
        description: 'Shipment created successfully',
      });
    },
  });

  // Predict delivery mutation
  const predictDeliveryMutation = useMutation({
    mutationFn: async (shipmentId: number) => {
      return await apiRequest(`/api/imports/shipments/${shipmentId}/predict-delivery`);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      toast({
        title: 'AI Prediction Updated',
        description: `Estimated delivery in ${data.estimatedDays} days (${Math.round(data.confidence * 100)}% confidence)`,
      });
    },
  });

  // Filter shipments
  const filteredShipments = shipments.filter(shipment => {
    if (filterStatus === 'all') return true;
    return shipment.status === filterStatus;
  });

  // Get shipping method icon
  const getShippingIcon = (method: string) => {
    switch (method) {
      case 'air': return <Plane className="h-5 w-5" />;
      case 'sea': return <Ship className="h-5 w-5" />;
      case 'express': return <Rocket className="h-5 w-5" />;
      default: return <Truck className="h-5 w-5" />;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparing': return 'bg-gray-500';
      case 'in_transit': return 'bg-blue-500';
      case 'customs': return 'bg-yellow-500';
      case 'delivered': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Calculate progress
  const calculateProgress = (shipment: Shipment) => {
    if (shipment.status === 'delivered') return 100;
    if (!shipment.departureDate || !shipment.estimatedArrival) return 0;
    
    const totalDays = differenceInDays(new Date(shipment.estimatedArrival), new Date(shipment.departureDate));
    const elapsedDays = differenceInDays(new Date(), new Date(shipment.departureDate));
    
    return Math.min(Math.max((elapsedDays / totalDays) * 100, 0), 100);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">International Transit</h1>
          <p className="text-gray-600 mt-1">Track shipments and predict delivery times</p>
        </div>
        <CreateShipmentDialog
          open={isCreateShipmentOpen}
          onOpenChange={setIsCreateShipmentOpen}
          onSubmit={(data) => createShipmentMutation.mutate(data)}
          readyConsolidations={readyConsolidations}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Shipments</p>
                <p className="text-2xl font-bold">{shipments.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Transit</p>
                <p className="text-2xl font-bold">
                  {shipments.filter(s => s.status === 'in_transit').length}
                </p>
              </div>
              <Plane className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Customs</p>
                <p className="text-2xl font-bold">
                  {shipments.filter(s => s.status === 'customs').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Delivered</p>
                <p className="text-2xl font-bold">
                  {shipments.filter(s => s.status === 'delivered').length}
                </p>
              </div>
              <MapPin className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2">
        {['all', 'preparing', 'in_transit', 'customs', 'delivered'].map((status) => (
          <Button
            key={status}
            variant={filterStatus === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus(status)}
          >
            {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
          </Button>
        ))}
      </div>

      {/* Shipments List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : filteredShipments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-gray-500">
              No shipments found. Create a shipment from ready consolidations.
            </CardContent>
          </Card>
        ) : (
          filteredShipments.map((shipment) => (
            <ShipmentCard
              key={shipment.id}
              shipment={shipment}
              onPredictDelivery={() => predictDeliveryMutation.mutate(shipment.id)}
              onClick={() => setSelectedShipment(shipment)}
            />
          ))
        )}
      </div>

      {/* Shipment Details Dialog */}
      {selectedShipment && (
        <ShipmentDetailsDialog
          shipment={selectedShipment}
          open={!!selectedShipment}
          onOpenChange={(open) => !open && setSelectedShipment(null)}
        />
      )}
    </div>
  );
}

// Shipment Card Component
function ShipmentCard({ 
  shipment, 
  onPredictDelivery,
  onClick 
}: { 
  shipment: any;
  onPredictDelivery: () => void;
  onClick: () => void;
}) {
  const progress = calculateProgress(shipment);
  const carrier = CARRIERS.find(c => c.value === shipment.carrier);
  
  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{carrier?.logo || '📦'}</div>
              <div>
                <h3 className="font-semibold text-lg">{shipment.shipmentNumber}</h3>
                <p className="text-sm text-gray-600">{shipment.carrier} - {shipment.trackingNumber}</p>
              </div>
            </div>
            <Badge className={`${getStatusColor(shipment.status)} text-white`}>
              {shipment.status.replace('_', ' ')}
            </Badge>
          </div>

          {/* Route */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="font-medium">{shipment.origin}</span>
            </div>
            <div className="flex-1 mx-4">
              {getShippingIcon(shipment.shippingMethod)}
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium">{shipment.destination}</span>
              <MapPin className="h-4 w-4 text-gray-500" />
            </div>
          </div>

          {/* Progress */}
          {shipment.departureDate && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Items</p>
              <p className="font-semibold">{shipment.totalItems || 0}</p>
            </div>
            <div>
              <p className="text-gray-600">Weight</p>
              <p className="font-semibold">{shipment.totalWeight || 0} kg</p>
            </div>
            <div>
              <p className="text-gray-600">Departure</p>
              <p className="font-semibold">
                {shipment.departureDate 
                  ? format(new Date(shipment.departureDate), 'MMM dd')
                  : 'Pending'}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Est. Arrival</p>
              <p className="font-semibold">
                {shipment.estimatedArrival 
                  ? format(new Date(shipment.estimatedArrival), 'MMM dd')
                  : 'Calculate'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onPredictDelivery();
              }}
            >
              <Clock className="h-4 w-4 mr-2" />
              AI Predict Delivery
            </Button>
            <Button size="sm" variant="outline">
              View All Items
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Create Shipment Dialog
function CreateShipmentDialog({ 
  open, 
  onOpenChange, 
  onSubmit,
  readyConsolidations
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { shipment: InsertShipment; consolidationIds: number[] }) => void;
  readyConsolidations: Consolidation[];
}) {
  const [formData, setFormData] = useState<InsertShipment>({
    shipmentNumber: '',
    carrier: 'DHL',
    trackingNumber: '',
    origin: 'China',
    destination: 'USA',
    status: 'preparing',
    shippingMethod: 'air',
    totalWeight: '0',
    totalCost: '0',
    currency: 'USD',
  });

  const [selectedConsolidations, setSelectedConsolidations] = useState<number[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ 
      shipment: formData, 
      consolidationIds: selectedConsolidations 
    });
  };

  const toggleConsolidation = (id: number) => {
    setSelectedConsolidations(prev =>
      prev.includes(id) 
        ? prev.filter(cId => cId !== id)
        : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Shipment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Shipment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="carrier">Carrier</Label>
              <select
                id="carrier"
                className="w-full px-3 py-2 border rounded-md"
                value={formData.carrier}
                onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
              >
                {CARRIERS.map((carrier) => (
                  <option key={carrier.value} value={carrier.value}>
                    {carrier.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="trackingNumber">Tracking Number</Label>
              <Input
                id="trackingNumber"
                value={formData.trackingNumber}
                onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="origin">Origin</Label>
              <Input
                id="origin"
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Shipping Method</Label>
              <div className="flex gap-2 mt-2">
                {[
                  { value: 'air', icon: '✈️', label: 'Air' },
                  { value: 'sea', icon: '🚢', label: 'Sea' },
                  { value: 'express', icon: '🚀', label: 'Express' },
                ].map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    className={`flex-1 p-2 border rounded-md text-center ${
                      formData.shippingMethod === method.value 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300'
                    }`}
                    onClick={() => setFormData({ ...formData, shippingMethod: method.value })}
                  >
                    <div className="text-xl">{method.icon}</div>
                    <div className="text-xs">{method.label}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="totalWeight">Total Weight (kg)</Label>
              <Input
                id="totalWeight"
                type="number"
                step="0.001"
                value={formData.totalWeight}
                onChange={(e) => setFormData({ ...formData, totalWeight: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="totalCost">Total Cost</Label>
              <Input
                id="totalCost"
                type="number"
                step="0.01"
                value={formData.totalCost}
                onChange={(e) => setFormData({ ...formData, totalCost: e.target.value })}
              />
            </div>
          </div>

          {/* Select Consolidations */}
          {readyConsolidations.length > 0 && (
            <div>
              <Label>Select Consolidations</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {readyConsolidations.map((consolidation) => (
                  <div
                    key={consolidation.id}
                    className={`p-3 border rounded-md cursor-pointer transition-colors ${
                      selectedConsolidations.includes(consolidation.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => toggleConsolidation(consolidation.id)}
                  >
                    <div className="font-semibold">{consolidation.consolidationNumber}</div>
                    <div className="text-sm text-gray-600">
                      {consolidation.warehouseLocation}
                    </div>
                    <div className="text-sm">
                      {(consolidation as any).totalItems || 0} items
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Shipment</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Shipment Details Dialog
function ShipmentDetailsDialog({ 
  shipment, 
  open, 
  onOpenChange 
}: { 
  shipment: Shipment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Shipment Details - {shipment.shipmentNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Carrier</p>
              <p className="font-semibold">{shipment.carrier}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tracking Number</p>
              <p className="font-semibold">{shipment.trackingNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <Badge className={`${getStatusColor(shipment.status)} text-white`}>
                {shipment.status.replace('_', ' ')}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">Shipping Method</p>
              <p className="font-semibold">{shipment.shippingMethod}</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Route Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Origin</p>
                <p className="font-semibold">{shipment.origin}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Destination</p>
                <p className="font-semibold">{shipment.destination}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Departure Date</p>
                <p className="font-semibold">
                  {shipment.departureDate 
                    ? format(new Date(shipment.departureDate), 'MMM dd, yyyy')
                    : 'Not departed'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Estimated Arrival</p>
                <p className="font-semibold">
                  {shipment.estimatedArrival 
                    ? format(new Date(shipment.estimatedArrival), 'MMM dd, yyyy')
                    : 'Pending calculation'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Weight</p>
              <p className="font-semibold">{shipment.totalWeight} kg</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Cost</p>
              <p className="font-semibold">{shipment.currency} {shipment.totalCost}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Items</p>
              <p className="font-semibold">{(shipment as any).totalItems || 0}</p>
            </div>
          </div>

          {/* Tracking Events */}
          {shipment.trackingEvents && Array.isArray(shipment.trackingEvents) && shipment.trackingEvents.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Tracking History</h3>
              <div className="space-y-2">
                {(shipment.trackingEvents as any[]).map((event, index) => (
                  <div key={index} className="flex items-start space-x-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                    <div className="flex-1">
                      <p className="font-medium">{event.status}</p>
                      <p className="text-gray-600">{event.location} - {event.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'preparing': return 'bg-gray-500';
    case 'in_transit': return 'bg-blue-500';
    case 'customs': return 'bg-yellow-500';
    case 'delivered': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
}

function getShippingIcon(method: string) {
  switch (method) {
    case 'air': return <Plane className="h-5 w-5" />;
    case 'sea': return <Ship className="h-5 w-5" />;
    case 'express': return <Rocket className="h-5 w-5" />;
    default: return <Truck className="h-5 w-5" />;
  }
}

function calculateProgress(shipment: Shipment) {
  if (shipment.status === 'delivered') return 100;
  if (!shipment.departureDate || !shipment.estimatedArrival) return 0;
  
  const totalDays = differenceInDays(new Date(shipment.estimatedArrival), new Date(shipment.departureDate));
  const elapsedDays = differenceInDays(new Date(), new Date(shipment.departureDate));
  
  return Math.min(Math.max((elapsedDays / totalDays) * 100, 0), 100);
}