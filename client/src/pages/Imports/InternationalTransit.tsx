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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Plus, Plane, Ship, Truck, MapPin, Clock, Package, Globe, Star, Zap, Target, TrendingUp, Calendar, AlertCircle, CheckCircle, Search, CalendarDays, MoreVertical, ArrowLeft, Train, Shield } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Shipment {
  id: number;
  consolidationId: number | null;
  carrier: string;
  trackingNumber: string;
  endCarrier?: string;
  endTrackingNumber?: string;
  shipmentName?: string;
  shipmentType?: string;
  origin: string;
  destination: string;
  status: string;
  shippingCost: string;
  shippingCostCurrency?: string;
  shippingMethod?: string;
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
  
  // Fetch warehouses for destination selection
  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['/api/warehouses']
  });

  // Fetch shipments
  const { data: shipments = [], isLoading } = useQuery<Shipment[]>({
    queryKey: ['/api/imports/shipments']
  });

  // Move back to warehouse mutation
  const moveBackToWarehouseMutation = useMutation({
    mutationFn: async (consolidationId: number) => {
      const response = await apiRequest('/api/imports/consolidations/' + consolidationId + '/status', 'PATCH', {
        status: 'active'
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/consolidations'] });
      toast({ title: "Success", description: "Moved back to warehouse successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to move back to warehouse", variant: "destructive" });
    }
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
    
    // Generate AI shipment name based on items and shipment type
    const generateShipmentName = () => {
      const method = selectedPendingShipment?.shippingMethod || '';
      const itemCount = selectedPendingShipment?.itemCount || 0;
      const items = selectedPendingShipment?.items || [];
      
      // Get first few item names
      const itemNames = items.slice(0, 2).map((item: any) => item.name).join(', ');
      const moreItems = items.length > 2 ? ` +${items.length - 2} more` : '';
      
      // Create descriptive name
      const methodType = method.includes('express') ? 'Express' : 
                        method.includes('air') ? 'Air' : 
                        method.includes('sea') ? 'Sea' : 
                        method.includes('railway') ? 'Rail' : 'Standard';
      
      return `${methodType} - ${itemNames}${moreItems} (${itemCount} items)`;
    };
    
    const data = {
      consolidationId: selectedPendingShipment?.id || (formData.get('consolidationId') ? parseInt(formData.get('consolidationId') as string) : null),
      carrier: selectedPendingShipment?.shippingMethod || 'standard',
      trackingNumber: formData.get('trackingNumber') as string,
      endCarrier: formData.get('endCarrier') as string || null,
      endTrackingNumber: formData.get('endTrackingNumber') as string || null,
      shipmentName: formData.get('shipmentName') as string || generateShipmentName(),
      shipmentType: selectedPendingShipment?.shippingMethod || formData.get('shipmentType') as string,
      origin: formData.get('origin') as string,
      destination: formData.get('destination') as string,
      shippingCost: parseFloat(formData.get('shippingCost') as string) || 0,
      shippingCostCurrency: formData.get('shippingCostCurrency') as string || 'USD',
      shippingMethod: selectedPendingShipment?.shippingMethod || formData.get('shippingMethod') as string,
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
                  <Label htmlFor="shipmentName">Shipment Name</Label>
                  <Input 
                    id="shipmentName" 
                    name="shipmentName" 
                    data-testid="input-shipment-name"
                    placeholder="AI will generate based on items"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipmentType">Shipment Type</Label>
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                    {(() => {
                      const method = selectedPendingShipment?.shippingMethod;
                      if (method?.includes('air')) {
                        return <Plane className={`h-4 w-4 ${method.includes('sensitive') ? 'text-orange-500' : 'text-primary'}`} />;
                      } else if (method?.includes('express')) {
                        return <Zap className={`h-4 w-4 ${method.includes('sensitive') ? 'text-orange-500' : 'text-primary'}`} />;
                      } else if (method?.includes('railway')) {
                        return <Train className={`h-4 w-4 ${method.includes('sensitive') ? 'text-orange-500' : 'text-primary'}`} />;
                      } else if (method?.includes('sea')) {
                        return <Ship className={`h-4 w-4 ${method.includes('sensitive') ? 'text-orange-500' : 'text-primary'}`} />;
                      } else {
                        return <Package className="h-4 w-4 text-muted-foreground" />;
                      }
                    })()}
                    <span className="text-sm font-medium">
                      {selectedPendingShipment?.shippingMethod?.replace(/_/g, ' ').toUpperCase() || 'STANDARD'}
                    </span>
                  </div>
                  <input type="hidden" name="shipmentType" value={selectedPendingShipment?.shippingMethod || ''} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label htmlFor="endCarrier">End Shipping Carrier</Label>
                  <Input 
                    id="endCarrier" 
                    name="endCarrier" 
                    data-testid="input-end-carrier"
                    placeholder="e.g., DPD, DHL, GLS"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="endTrackingNumber">End Tracking Number</Label>
                  <Input 
                    id="endTrackingNumber" 
                    name="endTrackingNumber" 
                    data-testid="input-end-tracking-number"
                    placeholder="Final delivery tracking"
                  />
                </div>
                <div className="space-y-2">
                  {/* Placeholder for alignment */}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="origin">Origin</Label>
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {selectedPendingShipment?.warehouse || 'China, Guangzhou'}
                    </span>
                  </div>
                  <input type="hidden" name="origin" value={selectedPendingShipment?.warehouse || 'China, Guangzhou'} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination Warehouse *</Label>
                  <Select name="destination" required defaultValue={warehouses.length > 0 ? warehouses[0].name : "Czech Republic, Prague"}>
                    <SelectTrigger data-testid="select-destination">
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.length > 0 ? (
                        warehouses.map((warehouse: any) => (
                          <SelectItem key={warehouse.id} value={warehouse.name}>
                            <div className="flex flex-col">
                              <span className="font-medium">{warehouse.name}</span>
                              {(warehouse.address || warehouse.city || warehouse.country) && (
                                <span className="text-xs text-muted-foreground">
                                  {[warehouse.address, warehouse.city, warehouse.country].filter(Boolean).join(', ')}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="Czech Republic, Prague">Czech Republic, Prague</SelectItem>
                          <SelectItem value="USA, California">USA, California</SelectItem>
                          <SelectItem value="USA, New York">USA, New York</SelectItem>
                          <SelectItem value="UK, London">UK, London</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shippingCost">Shipping Cost</Label>
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
                  <Label htmlFor="shippingCostCurrency">Shipping Cost Currency</Label>
                  <Select name="shippingCostCurrency" defaultValue="USD">
                    <SelectTrigger data-testid="select-currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="CZK">CZK</SelectItem>
                      <SelectItem value="CNY">CNY</SelectItem>
                      <SelectItem value="VND">VND</SelectItem>
                    </SelectContent>
                  </Select>
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
                      <Badge variant="outline" className="text-xs flex items-center">
                        {(() => {
                          const method = pending.shippingMethod;
                          const iconClass = "h-3 w-3 mr-1";
                          if (method?.includes('air')) {
                            return <Plane className={`${iconClass} ${method.includes('sensitive') ? 'text-orange-500' : ''}`} />;
                          } else if (method?.includes('express')) {
                            return <Zap className={`${iconClass} ${method.includes('sensitive') ? 'text-orange-500' : ''}`} />;
                          } else if (method?.includes('railway')) {
                            return <Train className={`${iconClass} ${method.includes('sensitive') ? 'text-orange-500' : ''}`} />;
                          } else if (method?.includes('sea')) {
                            return <Ship className={`${iconClass} ${method.includes('sensitive') ? 'text-orange-500' : ''}`} />;
                          } else {
                            return <Package className={iconClass} />;
                          }
                        })()}
                        {pending.shippingMethod?.replace(/_/g, ' ').toUpperCase() || 'STANDARD'}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          // Quick ship with defaults
                          const generateShipmentName = () => {
                            const method = pending.shippingMethod || '';
                            const itemCount = pending.itemCount || 0;
                            const items = pending.items || [];
                            
                            const itemNames = items.slice(0, 2).map((item: any) => item.name).join(', ');
                            const moreItems = items.length > 2 ? ` +${items.length - 2} more` : '';
                            
                            const methodType = method.includes('express') ? 'Express' : 
                                              method.includes('air') ? 'Air' : 
                                              method.includes('sea') ? 'Sea' : 
                                              method.includes('railway') ? 'Rail' : 'Standard';
                            
                            return `${methodType} - ${itemNames}${moreItems} (${itemCount} items)`;
                          };
                          
                          const quickShipData = {
                            consolidationId: pending.id,
                            carrier: pending.shippingMethod || 'standard',
                            trackingNumber: '', // Will be provided later
                            endCarrier: null,
                            endTrackingNumber: null,
                            shipmentName: generateShipmentName(),
                            shipmentType: pending.shippingMethod,
                            origin: pending.warehouse || 'China, Guangzhou',
                            destination: warehouses.length > 0 ? warehouses[0].name : 'Czech Republic, Prague',
                            shippingCost: 0, // Will be provided later
                            shippingCostCurrency: 'USD',
                            shippingMethod: pending.shippingMethod,
                            notes: 'Quick shipped - tracking to be added',
                          };
                          
                          createShipmentMutation.mutate(quickShipData);
                        }}
                        data-testid={`button-quick-ship-${pending.id}`}
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        Quick Ship
                      </Button>
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => moveBackToWarehouseMutation.mutate(pending.id)}
                            disabled={moveBackToWarehouseMutation.isPending}
                          >
                            <ArrowLeft className="h-3 w-3 mr-2" />
                            Move Back to Warehouse
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {/* Items Preview */}
                  {pending.items && pending.items.length > 0 && (
                    <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded-md">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Contents:</p>
                      <div className="space-y-0.5">
                        {pending.items.map((item: any, index: number) => (
                          <div key={index} className="flex items-center justify-between text-xs">
                            <span className="truncate flex-1">{item.name}</span>
                            <span className="text-muted-foreground ml-2">x{item.quantity || 1}</span>
                          </div>
                        ))}
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
                      {/* Compact Header with Combined Status */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {(() => {
                            const method = shipment.carrier || shipment.shippingMethod;
                            if (method?.includes('air')) {
                              return <Plane className={`h-4 w-4 ${method.includes('sensitive') ? 'text-orange-500' : 'text-primary'}`} />;
                            } else if (method?.includes('express')) {
                              return <Zap className={`h-4 w-4 ${method.includes('sensitive') ? 'text-orange-500' : 'text-primary'}`} />;
                            } else if (method?.includes('railway')) {
                              return <Train className={`h-4 w-4 ${method.includes('sensitive') ? 'text-orange-500' : 'text-primary'}`} />;
                            } else if (method?.includes('sea')) {
                              return <Ship className={`h-4 w-4 ${method.includes('sensitive') ? 'text-orange-500' : 'text-primary'}`} />;
                            } else {
                              return <Package className="h-4 w-4 text-muted-foreground" />;
                            }
                          })()}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold" data-testid={`shipment-tracking-${shipment.id}`}>
                                {shipment.shipmentName || shipment.trackingNumber || `Shipment #${shipment.id}`}
                              </h3>
                              <Badge className={`text-xs ${getETAColor(shipment)}`}>
                                <CalendarDays className="h-3 w-3 mr-1" />
                                {getTimeRemaining(shipment)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {shipment.itemCount} items • {(shipment.carrier || shipment.shippingMethod || 'Standard').replace(/_/g, ' ').toUpperCase()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Select
                            value={shipment.status}
                            onValueChange={(status) => 
                              updateTrackingMutation.mutate({ 
                                shipmentId: shipment.id, 
                                data: { status }
                              })
                            }
                          >
                            <SelectTrigger className={`w-32 h-8 ${shipment.status === 'delivered' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200' : shipment.status === 'in transit' ? 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-200' : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200'}`}>
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

                      {/* Tracking Information */}
                      {(shipment.trackingNumber || shipment.endTrackingNumber) && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 mb-3">
                          <div className="flex items-center mb-2">
                            <Package className="h-4 w-4 text-blue-600 mr-2" />
                            <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">Tracking Information</span>
                          </div>
                          
                          {/* Primary Carrier (China to Europe) */}
                          {shipment.trackingNumber && (
                            <div className="mb-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-muted-foreground">Primary Carrier</p>
                                  <p className="text-sm font-medium">{shipment.carrier || 'Standard Carrier'}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">Tracking Number</p>
                                  <p className="text-sm font-mono font-medium text-blue-600">{shipment.trackingNumber}</p>
                                </div>
                              </div>
                              {/* Primary Carrier Progress */}
                              <div className="mt-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-muted-foreground">{shipment.origin}</span>
                                  <span className="text-xs text-muted-foreground">Transit Hub</span>
                                </div>
                                <Progress 
                                  value={shipment.endTrackingNumber ? 100 : progress * 0.7} 
                                  className={`h-2 ${shipment.endTrackingNumber ? '[&>div]:bg-green-500' : '[&>div]:bg-purple-500'}`}
                                />
                              </div>
                            </div>
                          )}
                          
                          {/* End Carrier (European Courier) */}
                          {shipment.endTrackingNumber && (
                            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-muted-foreground">End Carrier</p>
                                  <p className="text-sm font-medium">{shipment.endCarrier || 'Local Courier'}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">Tracking Number</p>
                                  <p className="text-sm font-mono font-medium text-blue-600">{shipment.endTrackingNumber}</p>
                                </div>
                              </div>
                              {/* End Carrier Progress */}
                              <div className="mt-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-muted-foreground">Transit Hub</span>
                                  <span className="text-xs text-muted-foreground">{shipment.destination}</span>
                                </div>
                                <Progress 
                                  value={shipment.status === 'delivered' ? 100 : progress * 0.3} 
                                  className={`h-2 ${shipment.status === 'delivered' ? '[&>div]:bg-green-500' : '[&>div]:bg-purple-500'}`}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Overall Progress Bar with Dates */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(shipment.createdAt), 'MMM dd')}
                          </span>
                          <span className="text-sm font-semibold text-primary">{getTimeRemaining(shipment)}</span>
                          <span className="text-xs text-muted-foreground">
                            {shipment.estimatedDelivery || predictions[shipment.id]?.estimatedDelivery 
                              ? format(new Date(shipment.estimatedDelivery || predictions[shipment.id]?.estimatedDelivery), 'MMM dd')
                              : 'Calculating...'}
                          </span>
                        </div>
                        <Progress 
                          value={progress} 
                          className={`h-2 ${shipment.status === 'delivered' ? '[&>div]:bg-green-500' : shipment.status === 'in transit' ? '[&>div]:bg-purple-500' : '[&>div]:bg-blue-500'}`}
                        />
                      </div>

                      {/* Shipment Items - Always Show */}
                      {shipment.items && shipment.items.length > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-3 mb-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Package Contents ({shipment.itemCount} items)</p>
                          <div className="space-y-1">
                            {shipment.items.map((item: any, index: number) => (
                              <div key={index} className="flex items-center justify-between text-xs">
                                <span className="truncate flex-1">{item.name || `Item ${index + 1}`}</span>
                                <span className="text-muted-foreground ml-2">x{item.quantity || 1}</span>
                              </div>
                            ))}
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

                      {/* Compact Action Bar */}
                      <div className="flex justify-between items-center mt-3">
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