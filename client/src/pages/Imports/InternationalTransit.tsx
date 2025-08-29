import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Plus, Plane, Ship, Truck, MapPin, Clock, Package, Globe, Star, Zap, Target, TrendingUp, Calendar, AlertCircle, CheckCircle, Search, CalendarDays } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Shipment {
  id: number;
  consolidationId: number | null;
  carrier: string;
  trackingNumber: string;
  origin: string;
  destination: string;
  status: string;
  shippingCost: string;
  insuranceValue: string;
  estimatedDelivery: string | null;
  deliveredAt: string | null;
  currentLocation: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: any[];
  itemCount: number;
}

interface DeliveryPrediction {
  estimatedDelivery: string;
  estimatedDays: number;
  confidence: number;
  factors: {
    seasonalDelay: boolean;
    customsDelay: boolean;
    customsDays: number;
    fastRoute: boolean;
    weatherDelay: boolean;
    historicalAccuracy: boolean;
  };
  historicalAverage: number;
  historicalShipments: number;
  lastUpdated: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "in transit": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
};

const statusIcons: Record<string, any> = {
  pending: Package,
  "in transit": Plane,
  delivered: CheckCircle
};

const carrierIcons: Record<string, any> = {
  "DHL": Zap,
  "FedEx": Plane,
  "UPS": Truck,
  "USPS": Package,
  "China Post": Ship,
  "SF Express": Star
};

interface PendingShipment {
  id: number;
  name: string;
  location: string;
  shippingMethod: string;
  warehouse: string;
  notes: string | null;
  targetWeight: string | null;
  items: any[];
  itemCount: number;
  existingShipment: any;
  needsTracking: boolean;
  trackingNumber: string | null;
  carrier: string | null;
  origin: string | null;
  destination: string | null;
}

export default function InternationalTransit() {
  const [isCreateShipmentOpen, setIsCreateShipmentOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [selectedPendingShipment, setSelectedPendingShipment] = useState<PendingShipment | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictions, setPredictions] = useState<Record<number, DeliveryPrediction>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending shipments
  const { data: pendingShipments = [] } = useQuery<PendingShipment[]>({
    queryKey: ['/api/imports/shipments/pending']
  });

  // Fetch shipments
  const { data: shipments = [], isLoading } = useQuery<Shipment[]>({
    queryKey: ['/api/imports/shipments']
  });

  // Create shipment mutation
  const createShipmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/imports/shipments', 'POST', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/pending'] });
      setIsCreateShipmentOpen(false);
      setSelectedPendingShipment(null);
      toast({ title: "Success", description: "Shipment created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create shipment", variant: "destructive" });
    }
  });

  // Update tracking mutation
  const updateTrackingMutation = useMutation({
    mutationFn: async ({ shipmentId, data }: { shipmentId: number; data: any }) => {
      const response = await apiRequest(`/api/imports/shipments/${shipmentId}/tracking`, 'PATCH', data);
      return response.json();
    },
    onSuccess: (updatedShipment, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/pending'] });
      
      // If status is changed to pending, show success message
      if (variables.data.status === 'pending') {
        toast({ 
          title: "Success", 
          description: "Shipment moved back to pending with tracking information preserved" 
        });
      } else {
        toast({ title: "Success", description: "Tracking updated successfully" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update tracking", variant: "destructive" });
    }
  });

  // AI Prediction function
  const predictDelivery = async (shipment: Shipment) => {
    if (predictions[shipment.id]) return; // Already predicted
    
    setIsPredicting(true);
    try {
      const response = await apiRequest('/api/imports/shipments/predict-delivery', 'POST', {
        shipmentId: shipment.id,
        origin: shipment.origin,
        destination: shipment.destination,
        carrier: shipment.carrier,
        dispatchDate: shipment.createdAt
      });
      
      const prediction = await response.json() as DeliveryPrediction;
      setPredictions(prev => ({ ...prev, [shipment.id]: prediction }));
      
      // Update the shipment with the new prediction
      updateTrackingMutation.mutate({
        shipmentId: shipment.id,
        data: { estimatedDelivery: prediction.estimatedDelivery }
      });
      
    } catch (error) {
      toast({ 
        title: "AI Prediction Failed", 
        description: "Could not generate delivery prediction",
        variant: "destructive" 
      });
    } finally {
      setIsPredicting(false);
    }
  };

  // Auto-predict for new shipments
  useEffect(() => {
    shipments.forEach(shipment => {
      if (shipment.status !== 'delivered' && !predictions[shipment.id] && !shipment.estimatedDelivery) {
        predictDelivery(shipment);
      }
    });
  }, [shipments]);

  const handleCreateShipment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      consolidationId: selectedPendingShipment?.id || (formData.get('consolidationId') ? parseInt(formData.get('consolidationId') as string) : null),
      carrier: formData.get('carrier') as string,
      trackingNumber: formData.get('trackingNumber') as string,
      origin: formData.get('origin') as string,
      destination: formData.get('destination') as string,
      shippingCost: parseFloat(formData.get('shippingCost') as string) || 0,
      insuranceValue: parseFloat(formData.get('insuranceValue') as string) || 0,
      notes: formData.get('notes') as string || null,
    };
    
    createShipmentMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => (
    <Badge className={statusColors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"}>
      {status.replace('_', ' ').toUpperCase()}
    </Badge>
  );

  const getStatusIcon = (status: string) => {
    const Icon = statusIcons[status] || Package;
    return <Icon className="h-4 w-4" />;
  };

  const getCarrierIcon = (carrier: string) => {
    const Icon = carrierIcons[carrier] || Truck;
    return <Icon className="h-4 w-4" />;
  };

  const calculateProgress = (shipment: Shipment) => {
    if (shipment.status === 'delivered') return 100;
    
    const dispatchDate = new Date(shipment.createdAt);
    const estimatedDelivery = shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery) : null;
    const currentDate = new Date();
    
    if (!estimatedDelivery) return 25; // Default progress if no estimation
    
    const totalDays = differenceInDays(estimatedDelivery, dispatchDate);
    const daysPassed = differenceInDays(currentDate, dispatchDate);
    
    const progress = Math.min(Math.max((daysPassed / totalDays) * 100, 0), 95);
    return Math.round(progress);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-green-600 dark:text-green-400";
    if (confidence >= 75) return "text-blue-600 dark:text-blue-400";
    if (confidence >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };
  
  const getTimeRemaining = (shipment: Shipment) => {
    if (shipment.status === 'delivered') return 'Delivered';
    
    const estimatedDelivery = shipment.estimatedDelivery || predictions[shipment.id]?.estimatedDelivery;
    if (!estimatedDelivery) return 'Calculating...';
    
    const deliveryDate = new Date(estimatedDelivery);
    const currentDate = new Date();
    const daysRemaining = differenceInDays(deliveryDate, currentDate);
    
    if (daysRemaining < 0) return 'Delayed';
    if (daysRemaining === 0) return 'Today';
    if (daysRemaining === 1) return '1 day';
    if (daysRemaining < 7) return `${daysRemaining} days`;
    if (daysRemaining < 30) {
      const weeks = Math.floor(daysRemaining / 7);
      return weeks === 1 ? '1 week' : `${weeks} weeks`;
    }
    
    const months = Math.floor(daysRemaining / 30);
    return months === 1 ? '1 month' : `${months} months`;
  };

  const getETAColor = (shipment: Shipment) => {
    const estimatedDelivery = shipment.estimatedDelivery || predictions[shipment.id]?.estimatedDelivery;
    if (!estimatedDelivery) return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    
    const deliveryDate = new Date(estimatedDelivery);
    const currentDate = new Date();
    const daysRemaining = differenceInDays(deliveryDate, currentDate);
    
    if (shipment.status === 'delivered') return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (daysRemaining < 0) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    if (daysRemaining === 0) return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    if (daysRemaining <= 3) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
  };

  // Filter shipments based on search query
  const filteredShipments = shipments.filter(shipment => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    
    // Search in tracking number
    if (shipment.trackingNumber.toLowerCase().includes(query)) return true;
    
    // Search in carrier
    if (shipment.carrier.toLowerCase().includes(query)) return true;
    
    // Search in origin/destination
    if (shipment.origin.toLowerCase().includes(query)) return true;
    if (shipment.destination.toLowerCase().includes(query)) return true;
    
    // Search in status
    if (shipment.status.toLowerCase().includes(query)) return true;
    
    // Search in items
    if (shipment.items && shipment.items.length > 0) {
      return shipment.items.some((item: any) => 
        item.name?.toLowerCase().includes(query) ||
        item.trackingNumber?.toLowerCase().includes(query)
      );
    }
    
    return false;
  });

  // Filter pending shipments based on search query
  const filteredPendingShipments = pendingShipments.filter(pending => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    
    // Search in consolidation name
    if (pending.name.toLowerCase().includes(query)) return true;
    
    // Search in location/warehouse
    if (pending.location?.toLowerCase().includes(query)) return true;
    if (pending.warehouse.toLowerCase().includes(query)) return true;
    
    // Search in shipping method
    if (pending.shippingMethod?.toLowerCase().includes(query)) return true;
    
    // Search in items
    if (pending.items && pending.items.length > 0) {
      return pending.items.some((item: any) => 
        item.name?.toLowerCase().includes(query)
      );
    }
    
    return false;
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">International Transit</h1>
          <p className="text-muted-foreground">AI-powered shipment tracking with delivery predictions</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by tracking, carrier, items, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-shipments"
            />
          </div>
          <Dialog open={isCreateShipmentOpen} onOpenChange={setIsCreateShipmentOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-shipment">
                <Plus className="h-4 w-4 mr-2" />
                Create Shipment
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {selectedPendingShipment ? 'Add Tracking Information' : 'Create New Shipment'}
              </DialogTitle>
              <DialogDescription>
                {selectedPendingShipment 
                  ? `Add tracking for consolidation ${selectedPendingShipment.name} (${selectedPendingShipment.itemCount} items)`
                  : 'Create a new international shipment with AI delivery prediction'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateShipment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="carrier">Carrier *</Label>
                  <Select name="carrier" required defaultValue={selectedPendingShipment?.carrier || ''}>
                    <SelectTrigger data-testid="select-carrier">
                      <SelectValue placeholder="Select carrier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DHL">DHL</SelectItem>
                      <SelectItem value="FedEx">FedEx</SelectItem>
                      <SelectItem value="UPS">UPS</SelectItem>
                      <SelectItem value="USPS">USPS</SelectItem>
                      <SelectItem value="China Post">China Post</SelectItem>
                      <SelectItem value="SF Express">SF Express</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trackingNumber">Tracking Number *</Label>
                  <Input 
                    id="trackingNumber" 
                    name="trackingNumber" 
                    required 
                    defaultValue={selectedPendingShipment?.trackingNumber || ''}
                    data-testid="input-tracking-number"
                    placeholder="Enter tracking number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="origin">Origin *</Label>
                  <Select name="origin" required defaultValue={selectedPendingShipment?.origin || selectedPendingShipment?.warehouse || ''}>
                    <SelectTrigger data-testid="select-origin">
                      <SelectValue placeholder="Select origin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="China, Guangzhou">China, Guangzhou</SelectItem>
                      <SelectItem value="China, Shenzhen">China, Shenzhen</SelectItem>
                      <SelectItem value="China, Shanghai">China, Shanghai</SelectItem>
                      <SelectItem value="Hong Kong">Hong Kong</SelectItem>
                      <SelectItem value="Vietnam, Ho Chi Minh">Vietnam, Ho Chi Minh</SelectItem>
                      {selectedPendingShipment?.warehouse && !["China, Guangzhou", "China, Shenzhen", "China, Shanghai", "Hong Kong", "Vietnam, Ho Chi Minh"].includes(selectedPendingShipment.warehouse) && (
                        <SelectItem value={selectedPendingShipment.warehouse}>{selectedPendingShipment.warehouse}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination *</Label>
                  <Select name="destination" required defaultValue={selectedPendingShipment?.destination || selectedPendingShipment?.location || ''}>
                    <SelectTrigger data-testid="select-destination">
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USA, California">USA, California</SelectItem>
                      <SelectItem value="USA, New York">USA, New York</SelectItem>
                      <SelectItem value="USA, Texas">USA, Texas</SelectItem>
                      <SelectItem value="Canada, Toronto">Canada, Toronto</SelectItem>
                      <SelectItem value="UK, London">UK, London</SelectItem>
                      <SelectItem value="Australia, Sydney">Australia, Sydney</SelectItem>
                      {selectedPendingShipment?.location && !["USA, California", "USA, New York", "USA, Texas", "Canada, Toronto", "UK, London", "Australia, Sydney"].includes(selectedPendingShipment.location) && (
                        <SelectItem value={selectedPendingShipment.location}>{selectedPendingShipment.location}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shippingCost">Shipping Cost ($)</Label>
                  <Input 
                    id="shippingCost" 
                    name="shippingCost" 
                    type="number" 
                    step="0.01" 
                    data-testid="input-shipping-cost"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insuranceValue">Insurance Value ($)</Label>
                  <Input 
                    id="insuranceValue" 
                    name="insuranceValue" 
                    type="number" 
                    step="0.01" 
                    data-testid="input-insurance-value"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea 
                  id="notes" 
                  name="notes" 
                  data-testid="textarea-notes"
                  placeholder="Additional shipping notes..."
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateShipmentOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createShipmentMutation.isPending} data-testid="button-submit-shipment">
                  {createShipmentMutation.isPending ? "Creating..." : "Create Shipment"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Results Indicator */}
      {searchQuery && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Search className="h-4 w-4" />
          <span>
            Found {filteredShipments.length} shipment{filteredShipments.length !== 1 ? 's' : ''} and 
            {' '}{filteredPendingShipments.length} pending consolidation{filteredPendingShipments.length !== 1 ? 's' : ''}
            {' '}matching "{searchQuery}"
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery('')}
            className="h-6 px-2"
          >
            Clear
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Shipments</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-shipments">
              {filteredShipments.filter(s => s.status !== 'delivered').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {filteredShipments.filter(s => s.status === 'in transit').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {filteredShipments.filter(s => s.status === 'in transit').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filteredShipments.filter(s => s.status === 'delivered').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Shipments - Shipped Consolidations needing tracking */}
      {filteredPendingShipments.length > 0 && (
        <Card className="border-2 border-yellow-200 dark:border-yellow-900">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-yellow-600" />
              <span>Pending Shipments</span>
              <Badge variant="secondary" className="ml-2">{filteredPendingShipments.length}</Badge>
            </CardTitle>
            <CardDescription>
              Shipped consolidations that need tracking information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredPendingShipments.map((pending) => (
                <div key={pending.id} className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <Package className="h-4 w-4 text-yellow-600" />
                      <div>
                        <p className="font-semibold text-sm">{pending.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {pending.location} • {pending.warehouse} • {pending.itemCount} items
                        </p>
                        {pending.trackingNumber && (
                          <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mt-1">
                            Tracking: {pending.trackingNumber} ({pending.carrier || 'Carrier TBD'})
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {pending.shippingMethod?.replace(/_/g, ' ').toUpperCase() || 'Standard'}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => {
                          setSelectedPendingShipment(pending);
                          setIsCreateShipmentOpen(true);
                        }}
                        data-testid={`button-add-tracking-${pending.id}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {pending.trackingNumber ? 'Update Tracking' : 'Add Tracking'}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Items Preview */}
                  {pending.items && pending.items.length > 0 && (
                    <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded-md">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Contents:</p>
                      <div className="space-y-0.5">
                        {pending.items.slice(0, 2).map((item: any, index: number) => (
                          <div key={index} className="flex items-center justify-between text-xs">
                            <span className="truncate flex-1">{item.name}</span>
                            <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                          </div>
                        ))}
                        {pending.items.length > 2 && (
                          <p className="text-xs text-muted-foreground">+{pending.items.length - 2} more items</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {pending.targetWeight && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Target Weight: {pending.targetWeight} kg
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shipments List */}
      <Card>
        <CardHeader>
          <CardTitle>Shipment Tracking</CardTitle>
          <CardDescription>
            Monitor all international shipments with AI-powered delivery predictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredShipments.length === 0 ? (
            <div className="text-center py-8">
              <Plane className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'No shipments match your search' : 'No shipments found'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Try adjusting your search terms' : 'Create your first international shipment'}
              </p>
              {searchQuery ? (
                <Button variant="outline" onClick={() => setSearchQuery('')} data-testid="button-clear-search">
                  Clear Search
                </Button>
              ) : (
                <Button onClick={() => setIsCreateShipmentOpen(true)} data-testid="button-create-first-shipment">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Shipment
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredShipments.map((shipment) => {
                const prediction = predictions[shipment.id];
                const progress = calculateProgress(shipment);
                
                return (
                  <Card key={shipment.id} className="border hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      {/* Compact Header with ETA Badge */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {getCarrierIcon(shipment.carrier)}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold" data-testid={`shipment-tracking-${shipment.id}`}>
                                {shipment.trackingNumber}
                              </h3>
                              <Badge className={`text-xs ${getETAColor(shipment)}`}>
                                <CalendarDays className="h-3 w-3 mr-1" />
                                {getTimeRemaining(shipment)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {shipment.carrier} • {shipment.itemCount} items
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(shipment.status)}
                          <Select
                            value={shipment.status}
                            onValueChange={(status) => 
                              updateTrackingMutation.mutate({ 
                                shipmentId: shipment.id, 
                                data: { status }
                              })
                            }
                          >
                            <SelectTrigger className="w-28 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in transit">In Transit</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Compact Route */}
                      <div className="flex items-center space-x-3 mb-3 text-sm">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{shipment.origin}</span>
                        </div>
                        <div className="flex-1 border-t border-dashed"></div>
                        <div className="flex items-center space-x-1">
                          <Target className="h-3 w-3 text-muted-foreground" />
                          <span>{shipment.destination}</span>
                        </div>
                      </div>

                      {/* Progress Bar with Time Remaining */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Delivery Progress</span>
                          <span className="text-sm font-semibold text-primary">{getTimeRemaining(shipment)}</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      {/* Shipment Items - Always Show */}
                      {shipment.items && shipment.items.length > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-3 mb-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Package Contents ({shipment.itemCount} items)</p>
                          <div className="space-y-1">
                            {shipment.items.slice(0, 3).map((item: any, index: number) => (
                              <div key={index} className="flex items-center justify-between text-xs">
                                <span className="truncate flex-1">{item.name || `Item ${index + 1}`}</span>
                                <span className="text-muted-foreground ml-2">x{item.quantity || 1}</span>
                              </div>
                            ))}
                            {shipment.items.length > 3 && (
                              <p className="text-xs text-muted-foreground">+{shipment.items.length - 3} more items</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Compact AI Prediction Section */}
                      {prediction && (
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-md p-3 mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <TrendingUp className="h-3 w-3 text-blue-600" />
                              <span className="text-xs font-semibold text-blue-800 dark:text-blue-200">AI Prediction</span>
                            </div>
                            <Badge variant="secondary" className={`text-xs ${getConfidenceColor(prediction.confidence)}`}>
                              {prediction.confidence}%
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3 text-xs">
                            <div>
                              <p className="text-muted-foreground">Est. Delivery</p>
                              <p className="font-semibold">
                                {format(new Date(prediction.estimatedDelivery), 'MMM dd')}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-muted-foreground">Avg Time</p>
                              <p className="font-semibold">
                                {prediction.historicalAverage}d
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-muted-foreground">Factors</p>
                              <div className="flex gap-1">
                                {prediction.factors.customsDelay && (
                                  <span className="text-yellow-600">+{prediction.factors.customsDays}d</span>
                                )}
                                {prediction.factors.fastRoute && (
                                  <span className="text-green-600">Fast</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Compact Shipment Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs border-t pt-3">
                        <div>
                          <p className="text-muted-foreground">Cost</p>
                          <p className="font-semibold">${shipment.shippingCost}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Insurance</p>
                          <p className="font-semibold">${shipment.insuranceValue}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Dispatched</p>
                          <p className="font-semibold">
                            {format(new Date(shipment.createdAt), 'MMM dd')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Location</p>
                          <p className="font-semibold truncate">
                            {shipment.currentLocation || 'In Transit'}
                          </p>
                        </div>
                      </div>

                      {/* Compact Action Bar */}
                      <div className="flex justify-between items-center mt-3 pt-3 border-t">
                        <div className="flex items-center space-x-2">
                          {!prediction && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => predictDelivery(shipment)}
                              disabled={isPredicting}
                              data-testid={`button-predict-${shipment.id}`}
                            >
                              <TrendingUp className="h-3 w-3 mr-1" />
                              {isPredicting ? 'Predicting...' : 'AI Predict'}
                            </Button>
                          )}
                          
                          {shipment.status !== 'delivered' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => 
                                updateTrackingMutation.mutate({
                                  shipmentId: shipment.id,
                                  data: { status: 'delivered' }
                                })
                              }
                              data-testid={`button-mark-delivered-${shipment.id}`}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Mark Delivered
                            </Button>
                          )}
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                          Updated {format(new Date(shipment.updatedAt), 'HH:mm')}
                        </p>
                      </div>

                      {shipment.notes && (
                        <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                          <p className="text-xs text-muted-foreground">Note: {shipment.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}