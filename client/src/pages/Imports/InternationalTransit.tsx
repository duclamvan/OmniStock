import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Plus, Package, Search, Truck, Calendar, DollarSign, 
  Plane, Ship, MapPin, Clock, AlertCircle, CheckCircle,
  X, Save, Copy, ExternalLink, Hash, Boxes, Globe, 
  TrendingUp, Activity, Info, Brain, Zap, Timer,
  CloudRain, Sun, Wind, AlertTriangle, RefreshCw
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, differenceInDays } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Shipment status stages
const SHIPMENT_STAGES = [
  { key: "dispatched", label: "Dispatched", icon: Package, color: "bg-blue-500" },
  { key: "in_transit", label: "In Transit", icon: Truck, color: "bg-yellow-500" },
  { key: "customs", label: "Customs", icon: Globe, color: "bg-orange-500" },
  { key: "out_for_delivery", label: "Out for Delivery", icon: MapPin, color: "bg-purple-500" },
  { key: "delivered", label: "Delivered", icon: CheckCircle, color: "bg-green-500" },
];

// Schema for creating shipment
const createShipmentSchema = z.object({
  consolidationId: z.coerce.number().min(1, "Consolidation is required"),
  carrier: z.string().min(1, "Carrier is required"),
  trackingNumber: z.string().min(1, "Tracking number is required"),
  origin: z.string().min(1, "Origin is required"),
  destination: z.string().min(1, "Destination is required"),
  shippingCost: z.coerce.number().min(0).optional(),
  insuranceValue: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

// Schema for updating tracking
const updateTrackingSchema = z.object({
  status: z.string(),
  location: z.string().optional(),
  notes: z.string().optional(),
  estimatedDelivery: z.string().optional(),
});

type CreateShipmentData = z.infer<typeof createShipmentSchema>;
type UpdateTrackingData = z.infer<typeof updateTrackingSchema>;

// AI Delivery Estimation Component
function AIDeliveryEstimation({ shipment }: { shipment: any }) {
  const [prediction, setPrediction] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const { toast } = useToast();

  const calculateAIEstimate = async () => {
    setIsCalculating(true);
    try {
      // Call AI endpoint for prediction
      const response = await apiRequest("POST", "/api/imports/shipments/predict-delivery", {
        shipmentId: shipment.id,
        origin: shipment.origin,
        destination: shipment.destination,
        shippingMethod: shipment.shippingMethod,
        carrier: shipment.carrier,
        dispatchDate: shipment.createdAt,
      });
      
      setPrediction(response);
    } catch (error) {
      toast({ 
        description: "Failed to calculate AI prediction", 
        variant: "destructive" 
      });
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    if (shipment && !prediction) {
      calculateAIEstimate();
    }
  }, [shipment]);

  if (!prediction && !isCalculating) return null;

  return (
    <Card className="border-purple-200 dark:border-purple-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          AI Delivery Prediction
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isCalculating ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            Analyzing historical data...
          </div>
        ) : prediction ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                <p className="font-semibold text-lg">
                  {format(new Date(prediction.estimatedDelivery || Date.now()), "MMM dd, yyyy")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confidence</p>
                <div className="flex items-center gap-2">
                  <Progress value={prediction.confidence || 75} className="h-2" />
                  <span className="text-sm font-medium">{prediction.confidence || 75}%</span>
                </div>
              </div>
            </div>
            
            {prediction.factors && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Influencing Factors:</p>
                <div className="flex flex-wrap gap-2">
                  {prediction.factors.seasonalDelay && (
                    <Badge variant="outline" className="text-xs">
                      <CloudRain className="h-3 w-3 mr-1" />
                      Seasonal delays expected
                    </Badge>
                  )}
                  {prediction.factors.customsDelay && (
                    <Badge variant="outline" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Customs processing: +{prediction.factors.customsDays || 2} days
                    </Badge>
                  )}
                  {prediction.factors.fastRoute && (
                    <Badge variant="outline" className="text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      Express route available
                    </Badge>
                  )}
                </div>
              </div>
            )}
            
            {prediction.historicalAverage && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Based on {prediction.historicalShipments || 50}+ similar shipments. 
                  Average delivery time: {prediction.historicalAverage} days
                </p>
              </div>
            )}
          </div>
        ) : null}
        
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-3 w-full"
          onClick={calculateAIEstimate}
          disabled={isCalculating}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isCalculating ? 'animate-spin' : ''}`} />
          Recalculate Prediction
        </Button>
      </CardContent>
    </Card>
  );
}

export default function InternationalTransit() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [createShipmentOpen, setCreateShipmentOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [statusFilter, setStatusFilter] = useState("all");

  // Forms
  const shipmentForm = useForm<CreateShipmentData>({
    resolver: zodResolver(createShipmentSchema),
    defaultValues: {
      consolidationId: 0,
      carrier: "",
      trackingNumber: "",
      origin: "",
      destination: "",
      shippingCost: 0,
      insuranceValue: 0,
      notes: "",
    },
  });

  // Fetch data
  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ["/api/imports/shipments"],
    queryFn: () => apiRequest("GET", "/api/imports/shipments"),
  });

  const { data: consolidations = [] } = useQuery({
    queryKey: ["/api/imports/consolidations"],
    queryFn: () => apiRequest("GET", "/api/imports/consolidations"),
  });

  // Create shipment mutation
  const createShipmentMutation = useMutation({
    mutationFn: (data: CreateShipmentData) =>
      apiRequest("POST", "/api/imports/shipments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/imports/shipments"] });
      toast({ description: "Shipment created successfully" });
      setCreateShipmentOpen(false);
      shipmentForm.reset();
    },
    onError: () => {
      toast({ description: "Failed to create shipment", variant: "destructive" });
    },
  });

  // Update shipment tracking
  const updateTrackingMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTrackingData }) =>
      apiRequest("PATCH", `/api/imports/shipments/${id}/tracking`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/imports/shipments"] });
      toast({ description: "Tracking updated successfully" });
    },
    onError: () => {
      toast({ description: "Failed to update tracking", variant: "destructive" });
    },
  });

  // Filter shipments
  const filteredShipments = shipments.filter((shipment: any) => {
    const matchesSearch = 
      shipment.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.carrier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.id?.toString().includes(searchTerm);
    
    const matchesStatus = statusFilter === "all" || shipment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate shipment progress
  const calculateProgress = (shipment: any) => {
    const stages = SHIPMENT_STAGES;
    const currentIndex = stages.findIndex(s => s.key === shipment.status);
    return ((currentIndex + 1) / stages.length) * 100;
  };

  // Calculate delivery stats
  const calculateDeliveryStats = () => {
    const delivered = shipments.filter((s: any) => s.status === "delivered");
    const inTransit = shipments.filter((s: any) => 
      ["dispatched", "in_transit", "customs", "out_for_delivery"].includes(s.status)
    );
    
    const avgDeliveryTime = delivered.length > 0
      ? delivered.reduce((sum: number, s: any) => {
          const days = s.deliveredAt && s.createdAt
            ? differenceInDays(new Date(s.deliveredAt), new Date(s.createdAt))
            : 0;
          return sum + days;
        }, 0) / delivered.length
      : 0;
    
    return {
      total: shipments.length,
      delivered: delivered.length,
      inTransit: inTransit.length,
      avgDeliveryTime: Math.round(avgDeliveryTime),
    };
  };

  const stats = calculateDeliveryStats();

  // Get items for a shipment
  const getShipmentItems = (shipment: any) => {
    const consolidation = consolidations.find((c: any) => c.id === shipment.consolidationId);
    return consolidation?.items || [];
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">International Transit</h1>
          <p className="text-muted-foreground mt-1">Track shipments with AI-powered delivery predictions</p>
        </div>
        <Button 
          className="w-full md:w-auto" 
          onClick={() => setCreateShipmentOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Shipment
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by tracking number or carrier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {SHIPMENT_STAGES.map((stage) => (
              <SelectItem key={stage.key} value={stage.key}>
                <div className="flex items-center gap-2">
                  <stage.icon className="h-4 w-4" />
                  {stage.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Shipments</p>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Transit</p>
                <p className="text-2xl font-bold">{stats.inTransit}</p>
                <p className="text-xs text-muted-foreground mt-1">Currently shipping</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <Truck className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold">{stats.delivered}</p>
                <p className="text-xs text-muted-foreground mt-1">Successfully delivered</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Delivery</p>
                <p className="text-2xl font-bold">{stats.avgDeliveryTime} days</p>
                <p className="text-xs text-muted-foreground mt-1">Average time</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Timer className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shipments List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Shipments</CardTitle>
          <CardDescription>
            Real-time tracking with AI-powered delivery predictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current"></div>
                Loading shipments...
              </div>
            </div>
          ) : filteredShipments.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No shipments found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create a shipment from your consolidations to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredShipments.map((shipment: any) => {
                const progress = calculateProgress(shipment);
                const currentStage = SHIPMENT_STAGES.find(s => s.key === shipment.status);
                const StageIcon = currentStage?.icon || Package;
                
                return (
                  <div 
                    key={shipment.id} 
                    className="border rounded-lg hover:shadow-md transition-all duration-200 cursor-pointer"
                    onClick={() => {
                      setSelectedShipment(shipment);
                      setDetailsDialogOpen(true);
                    }}
                  >
                    <div className="p-4">
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex-1 w-full lg:w-auto">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <Hash className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono text-sm">{shipment.id}</span>
                            </div>
                            <h3 className="font-semibold text-lg">{shipment.carrier}</h3>
                            <Badge className={`${currentStage?.color} text-white flex items-center gap-1`}>
                              <StageIcon className="h-3 w-3" />
                              {currentStage?.label}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Tracking</p>
                              <p className="font-medium font-mono text-xs">
                                {shipment.trackingNumber}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Route</p>
                              <p className="font-medium">
                                {shipment.origin} → {shipment.destination}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Est. Delivery</p>
                              <p className="font-medium">
                                {shipment.estimatedDelivery 
                                  ? format(new Date(shipment.estimatedDelivery), "MMM dd")
                                  : "Calculating..."}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Dispatched</p>
                              <p className="font-medium">
                                {shipment.createdAt 
                                  ? format(new Date(shipment.createdAt), "MMM dd, yyyy")
                                  : "N/A"}
                              </p>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs text-muted-foreground">Delivery Progress</span>
                              <span className="text-xs font-medium">{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                            <div className="flex justify-between mt-2">
                              {SHIPMENT_STAGES.map((stage, idx) => {
                                const StageIcon = stage.icon;
                                const isPassed = SHIPMENT_STAGES.findIndex(s => s.key === shipment.status) >= idx;
                                return (
                                  <div 
                                    key={stage.key}
                                    className={`flex flex-col items-center ${
                                      isPassed ? 'text-primary' : 'text-muted-foreground'
                                    }`}
                                  >
                                    <StageIcon className="h-4 w-4" />
                                    <span className="text-xs mt-1 hidden md:inline">{stage.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://track.example.com/${shipment.trackingNumber}`, '_blank');
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Track
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Shipment Dialog */}
      <Dialog open={createShipmentOpen} onOpenChange={setCreateShipmentOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create International Shipment</DialogTitle>
            <DialogDescription>
              Ship a consolidation internationally with tracking
            </DialogDescription>
          </DialogHeader>
          <Form {...shipmentForm}>
            <form onSubmit={shipmentForm.handleSubmit((data) => createShipmentMutation.mutate(data))}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={shipmentForm.control}
                  name="consolidationId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Consolidation *</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select consolidation to ship" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {consolidations
                            .filter((c: any) => c.status === "ready")
                            .map((consolidation: any) => (
                              <SelectItem key={consolidation.id} value={consolidation.id.toString()}>
                                {consolidation.name} ({consolidation.items?.length || 0} items)
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={shipmentForm.control}
                  name="carrier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carrier *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select carrier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DHL">DHL Express</SelectItem>
                          <SelectItem value="FedEx">FedEx</SelectItem>
                          <SelectItem value="UPS">UPS</SelectItem>
                          <SelectItem value="USPS">USPS</SelectItem>
                          <SelectItem value="China Post">China Post</SelectItem>
                          <SelectItem value="SF Express">SF Express</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={shipmentForm.control}
                  name="trackingNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tracking Number *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter tracking number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={shipmentForm.control}
                  name="origin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origin *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Shanghai, China" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={shipmentForm.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Los Angeles, USA" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={shipmentForm.control}
                  name="shippingCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shipping Cost ($)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={shipmentForm.control}
                  name="insuranceValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Insurance Value ($)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={shipmentForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Special instructions..." rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setCreateShipmentOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createShipmentMutation.isPending}>
                  {createShipmentMutation.isPending ? "Creating..." : "Create Shipment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Shipment Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Shipment #{selectedShipment?.id} - {selectedShipment?.trackingNumber}
            </DialogTitle>
            <DialogDescription>
              Track your international shipment with AI predictions
            </DialogDescription>
          </DialogHeader>
          
          {selectedShipment && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="tracking">Tracking</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="prediction">AI Prediction</TabsTrigger>
              </TabsList>
              
              <ScrollArea className="flex-1 mt-4">
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Carrier</p>
                      <p className="font-medium">{selectedShipment.carrier}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge className={SHIPMENT_STAGES.find(s => s.key === selectedShipment.status)?.color}>
                        {SHIPMENT_STAGES.find(s => s.key === selectedShipment.status)?.label}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Origin</p>
                      <p className="font-medium">{selectedShipment.origin}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Destination</p>
                      <p className="font-medium">{selectedShipment.destination}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Shipping Cost</p>
                      <p className="font-medium">${(selectedShipment.shippingCost || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Insurance</p>
                      <p className="font-medium">${(selectedShipment.insuranceValue || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Dispatched</p>
                      <p className="font-medium">
                        {selectedShipment.createdAt ? format(new Date(selectedShipment.createdAt), "PPP") : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Est. Delivery</p>
                      <p className="font-medium">
                        {selectedShipment.estimatedDelivery 
                          ? format(new Date(selectedShipment.estimatedDelivery), "PPP") 
                          : "Calculating..."}
                      </p>
                    </div>
                  </div>
                  
                  {selectedShipment.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Notes</p>
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm">{selectedShipment.notes}</p>
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="tracking" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Tracking Number</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-muted rounded font-mono text-sm">
                          {selectedShipment.trackingNumber}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedShipment.trackingNumber);
                            toast({ description: "Tracking number copied" });
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(`https://track.example.com/${selectedShipment.trackingNumber}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-3">Delivery Progress</p>
                      <div className="space-y-4">
                        {SHIPMENT_STAGES.map((stage, idx) => {
                          const StageIcon = stage.icon;
                          const isPassed = SHIPMENT_STAGES.findIndex(s => s.key === selectedShipment.status) >= idx;
                          const isCurrent = stage.key === selectedShipment.status;
                          
                          return (
                            <div key={stage.key} className="flex items-start gap-3">
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                isPassed ? stage.color + ' text-white' : 'bg-muted'
                              }`}>
                                <StageIcon className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <p className={`font-medium ${isCurrent ? 'text-primary' : ''}`}>
                                  {stage.label}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {isPassed ? (
                                    isCurrent ? "Current location" : "Completed"
                                  ) : "Pending"}
                                </p>
                              </div>
                              {isCurrent && (
                                <Badge variant="default">Current</Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const nextStage = SHIPMENT_STAGES[
                            Math.min(
                              SHIPMENT_STAGES.findIndex(s => s.key === selectedShipment.status) + 1,
                              SHIPMENT_STAGES.length - 1
                            )
                          ];
                          updateTrackingMutation.mutate({
                            id: selectedShipment.id,
                            data: { status: nextStage.key }
                          });
                        }}
                      >
                        Update to Next Stage
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="items" className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Items in this shipment
                    </p>
                    {(() => {
                      const items = getShipmentItems(selectedShipment);
                      return items.length > 0 ? (
                        <div className="space-y-3">
                          {items.map((item: any, idx: number) => (
                            <div key={idx} className="border rounded-lg p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-medium">{item.name}</h4>
                                  {item.sku && (
                                    <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                                  )}
                                  <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Qty:</span> {item.quantity}
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Weight:</span> {item.weight || 0} kg
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Value:</span> ${(item.unitPrice || 0).toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Boxes className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                          <p className="text-muted-foreground">No items found</p>
                        </div>
                      );
                    })()}
                  </div>
                </TabsContent>
                
                <TabsContent value="prediction" className="space-y-4">
                  <AIDeliveryEstimation shipment={selectedShipment} />
                  
                  <Alert>
                    <Brain className="h-4 w-4" />
                    <AlertTitle>AI Learning</AlertTitle>
                    <AlertDescription>
                      Our AI continuously learns from historical shipping data to improve prediction accuracy. 
                      Predictions are updated as new tracking information becomes available.
                    </AlertDescription>
                  </Alert>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}