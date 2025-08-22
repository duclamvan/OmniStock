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
import { Plus, Plane, Ship, Truck, MapPin, Clock, Package, Globe, Star, Zap, Target, TrendingUp, Calendar, AlertCircle, CheckCircle } from "lucide-react";
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
  dispatched: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_transit: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  customs: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
};

const statusIcons: Record<string, any> = {
  dispatched: Package,
  in_transit: Plane,
  customs: Globe,
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

export default function InternationalTransit() {
  const [isCreateShipmentOpen, setIsCreateShipmentOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictions, setPredictions] = useState<Record<number, DeliveryPrediction>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch shipments
  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['/api/imports/shipments'],
    queryFn: async () => {
      const response = await apiRequest('/api/imports/shipments');
      return response.json() as Promise<Shipment[]>;
    }
  });

  // Create shipment mutation
  const createShipmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/imports/shipments', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      setIsCreateShipmentOpen(false);
      toast({ title: "Success", description: "Shipment created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create shipment", variant: "destructive" });
    }
  });

  // Update tracking mutation
  const updateTrackingMutation = useMutation({
    mutationFn: async ({ shipmentId, data }: { shipmentId: number; data: any }) => {
      const response = await apiRequest(`/api/imports/shipments/${shipmentId}/tracking`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      toast({ title: "Success", description: "Tracking updated successfully" });
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
      const response = await apiRequest('/api/imports/shipments/predict-delivery', {
        method: 'POST',
        body: JSON.stringify({
          shipmentId: shipment.id,
          origin: shipment.origin,
          destination: shipment.destination,
          carrier: shipment.carrier,
          dispatchDate: shipment.createdAt
        }),
        headers: { 'Content-Type': 'application/json' }
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
      consolidationId: formData.get('consolidationId') ? parseInt(formData.get('consolidationId') as string) : null,
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">International Transit</h1>
          <p className="text-muted-foreground">AI-powered shipment tracking with delivery predictions</p>
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
              <DialogTitle>Create New Shipment</DialogTitle>
              <DialogDescription>
                Create a new international shipment with AI delivery prediction
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateShipment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="carrier">Carrier *</Label>
                  <Select name="carrier" required>
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
                    data-testid="input-tracking-number"
                    placeholder="Enter tracking number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="origin">Origin *</Label>
                  <Select name="origin" required>
                    <SelectTrigger data-testid="select-origin">
                      <SelectValue placeholder="Select origin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="China, Guangzhou">China, Guangzhou</SelectItem>
                      <SelectItem value="China, Shenzhen">China, Shenzhen</SelectItem>
                      <SelectItem value="China, Shanghai">China, Shanghai</SelectItem>
                      <SelectItem value="Hong Kong">Hong Kong</SelectItem>
                      <SelectItem value="Vietnam, Ho Chi Minh">Vietnam, Ho Chi Minh</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination *</Label>
                  <Select name="destination" required>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Shipments</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-shipments">
              {shipments.filter(s => s.status !== 'delivered').length}
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
              {shipments.filter(s => s.status === 'in_transit').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Customs</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {shipments.filter(s => s.status === 'customs').length}
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
              {shipments.filter(s => s.status === 'delivered').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shipments List */}
      <Card>
        <CardHeader>
          <CardTitle>Shipment Tracking</CardTitle>
          <CardDescription>
            Monitor all international shipments with AI-powered delivery predictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shipments.length === 0 ? (
            <div className="text-center py-8">
              <Plane className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No shipments found</h3>
              <p className="text-muted-foreground mb-4">Create your first international shipment</p>
              <Button onClick={() => setIsCreateShipmentOpen(true)} data-testid="button-create-first-shipment">
                <Plus className="h-4 w-4 mr-2" />
                Create Shipment
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {shipments.map((shipment) => {
                const prediction = predictions[shipment.id];
                const progress = calculateProgress(shipment);
                
                return (
                  <Card key={shipment.id} className="border-2 hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          {getCarrierIcon(shipment.carrier)}
                          <div>
                            <h3 className="font-semibold text-lg" data-testid={`shipment-tracking-${shipment.id}`}>
                              {shipment.trackingNumber}
                            </h3>
                            <p className="text-sm text-muted-foreground">
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
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="dispatched">Dispatched</SelectItem>
                              <SelectItem value="in_transit">In Transit</SelectItem>
                              <SelectItem value="customs">At Customs</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Route */}
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{shipment.origin}</span>
                        </div>
                        <div className="flex-1 border-t-2 border-dashed"></div>
                        <div className="flex items-center space-x-2">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{shipment.destination}</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Delivery Progress</span>
                          <span className="text-sm text-muted-foreground">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      {/* AI Prediction Section */}
                      {prediction && (
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg p-4 mb-4">
                          <div className="flex items-center space-x-2 mb-3">
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                            <span className="font-semibold text-blue-800 dark:text-blue-200">AI Delivery Prediction</span>
                            <Badge className={`${getConfidenceColor(prediction.confidence)}`}>
                              {prediction.confidence}% Confidence
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                              <p className="font-semibold">
                                {format(new Date(prediction.estimatedDelivery), 'MMM dd, yyyy')}
                              </p>
                              <p className="text-sm text-blue-600">
                                {prediction.estimatedDays} days total
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-muted-foreground">Historical Data</p>
                              <p className="font-semibold">
                                {prediction.historicalAverage} days avg
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Based on {prediction.historicalShipments} shipments
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-muted-foreground">Factors</p>
                              <div className="flex flex-wrap gap-1">
                                {prediction.factors.seasonalDelay && (
                                  <Badge variant="outline" className="text-xs">Holiday Season</Badge>
                                )}
                                {prediction.factors.customsDelay && (
                                  <Badge variant="outline" className="text-xs">Customs +{prediction.factors.customsDays}d</Badge>
                                )}
                                {prediction.factors.fastRoute && (
                                  <Badge variant="outline" className="text-xs text-green-600">Fast Route</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Shipment Details */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Shipping Cost</p>
                          <p className="font-semibold">${shipment.shippingCost}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Insurance</p>
                          <p className="font-semibold">${shipment.insuranceValue}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Dispatched</p>
                          <p className="font-semibold">
                            {format(new Date(shipment.createdAt), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Current Location</p>
                          <p className="font-semibold">
                            {shipment.currentLocation || 'Unknown'}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-between items-center mt-4 pt-4 border-t">
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => predictDelivery(shipment)}
                            disabled={isPredicting || !!prediction}
                            data-testid={`button-predict-${shipment.id}`}
                          >
                            <TrendingUp className="h-4 w-4 mr-1" />
                            {prediction ? 'Predicted' : isPredicting ? 'Predicting...' : 'AI Predict'}
                          </Button>
                          
                          {shipment.status === 'delivered' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => 
                                updateTrackingMutation.mutate({
                                  shipmentId: shipment.id,
                                  data: { status: 'delivered' }
                                })
                              }
                              data-testid={`button-mark-delivered-${shipment.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark Delivered
                            </Button>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          Last updated {format(new Date(shipment.updatedAt), 'MMM dd, HH:mm')}
                        </p>
                      </div>

                      {shipment.notes && (
                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Notes:</p>
                          <p className="text-sm">{shipment.notes}</p>
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