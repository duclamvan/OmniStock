import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Plus, Package, Search, Truck, Calendar, DollarSign, 
  Edit, Trash2, Eye, ShoppingBag, Clock, AlertCircle, CheckCircle,
  X, Save, Copy, Hash, Boxes, MapPin, Globe, Palette, 
  Plane, Ship, TrainIcon, TruckIcon, Zap, Star, Filter,
  ChevronDown, ChevronUp, Info, ShoppingCart
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Shipping methods with colors
const SHIPPING_METHODS = [
  { value: "air_express", label: "Air Express", icon: Zap, color: "bg-red-500", bgLight: "bg-red-100 dark:bg-red-900/20", textColor: "text-red-800 dark:text-red-400" },
  { value: "air_standard", label: "Air Standard", icon: Plane, color: "bg-orange-500", bgLight: "bg-orange-100 dark:bg-orange-900/20", textColor: "text-orange-800 dark:text-orange-400" },
  { value: "sea_freight", label: "Sea Freight", icon: Ship, color: "bg-blue-500", bgLight: "bg-blue-100 dark:bg-blue-900/20", textColor: "text-blue-800 dark:text-blue-400" },
  { value: "rail_freight", label: "Rail Freight", icon: TrainIcon, color: "bg-green-500", bgLight: "bg-green-100 dark:bg-green-900/20", textColor: "text-green-800 dark:text-green-400" },
  { value: "road_freight", label: "Road Freight", icon: TruckIcon, color: "bg-purple-500", bgLight: "bg-purple-100 dark:bg-purple-900/20", textColor: "text-purple-800 dark:text-purple-400" },
  { value: "priority", label: "Priority", icon: Star, color: "bg-yellow-500", bgLight: "bg-yellow-100 dark:bg-yellow-900/20", textColor: "text-yellow-800 dark:text-yellow-400" },
];

// Custom item sources
const ITEM_SOURCES = [
  { value: "taobao", label: "Taobao", icon: ShoppingCart },
  { value: "pinduoduo", label: "Pinduoduo", icon: ShoppingBag },
  { value: "1688", label: "1688.com", icon: Boxes },
  { value: "other", label: "Other", icon: Package },
];

// Schema for custom item
const customItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  source: z.string().min(1, "Source is required"),
  orderNumber: z.string().optional(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.coerce.number().min(0).optional(),
  weight: z.coerce.number().min(0).optional(),
  dimensions: z.string().optional(),
  trackingNumber: z.string().optional(),
  notes: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().optional(),
});

// Schema for consolidation
const consolidationSchema = z.object({
  name: z.string().min(1, "Consolidation name is required"),
  shippingMethod: z.string().min(1, "Shipping method is required"),
  warehouse: z.string().min(1, "Warehouse is required"),
  notes: z.string().optional(),
  targetWeight: z.coerce.number().min(0).optional(),
  maxItems: z.coerce.number().min(1).optional(),
});

type CustomItemData = z.infer<typeof customItemSchema>;
type ConsolidationData = z.infer<typeof consolidationSchema>;

export default function AtWarehouse() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [customItemDialogOpen, setCustomItemDialogOpen] = useState(false);
  const [consolidationDialogOpen, setConsolidationDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedConsolidation, setSelectedConsolidation] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState("items");
  const [filterMethod, setFilterMethod] = useState("all");

  // Forms
  const customItemForm = useForm<CustomItemData>({
    resolver: zodResolver(customItemSchema),
    defaultValues: {
      name: "",
      source: "",
      orderNumber: "",
      quantity: 1,
      unitPrice: 0,
      weight: 0,
      dimensions: "",
      trackingNumber: "",
      notes: "",
      customerName: "",
      customerEmail: "",
    },
  });

  const consolidationForm = useForm<ConsolidationData>({
    resolver: zodResolver(consolidationSchema),
    defaultValues: {
      name: "",
      shippingMethod: "",
      warehouse: "",
      notes: "",
      targetWeight: 30,
      maxItems: 50,
    },
  });

  // Fetch data
  const { data: purchases = [] } = useQuery({
    queryKey: ["/api/imports/purchases"],
    queryFn: () => apiRequest("GET", "/api/imports/purchases"),
  });

  const { data: customItems = [] } = useQuery({
    queryKey: ["/api/imports/custom-items"],
    queryFn: () => apiRequest("GET", "/api/imports/custom-items"),
  });

  const { data: consolidations = [], isLoading } = useQuery({
    queryKey: ["/api/imports/consolidations"],
    queryFn: () => apiRequest("GET", "/api/imports/consolidations"),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["/api/warehouses"],
    queryFn: () => apiRequest("GET", "/api/warehouses"),
  });

  // Create custom item mutation
  const createCustomItemMutation = useMutation({
    mutationFn: (data: CustomItemData) =>
      apiRequest("POST", "/api/imports/custom-items", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/imports/custom-items"] });
      toast({ description: "Custom item added successfully" });
      setCustomItemDialogOpen(false);
      customItemForm.reset();
    },
    onError: () => {
      toast({ description: "Failed to add custom item", variant: "destructive" });
    },
  });

  // Create consolidation mutation
  const createConsolidationMutation = useMutation({
    mutationFn: (data: ConsolidationData & { itemIds: number[] }) =>
      apiRequest("POST", "/api/imports/consolidations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/imports/consolidations"] });
      toast({ description: "Consolidation created successfully" });
      setConsolidationDialogOpen(false);
      consolidationForm.reset();
      setSelectedItems([]);
    },
    onError: () => {
      toast({ description: "Failed to create consolidation", variant: "destructive" });
    },
  });

  // Delete consolidation mutation
  const deleteConsolidationMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/imports/consolidations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/imports/consolidations"] });
      toast({ description: "Consolidation deleted successfully" });
      setDetailsDialogOpen(false);
    },
    onError: () => {
      toast({ description: "Failed to delete consolidation", variant: "destructive" });
    },
  });

  // Get all available items (from purchases and custom items)
  const getAllAvailableItems = () => {
    const purchaseItems = purchases
      .filter((p: any) => p.status === "arrived")
      .flatMap((p: any) => 
        (p.items || []).map((item: any) => ({
          ...item,
          source: p.supplier,
          type: "purchase",
          purchaseId: p.id,
        }))
      );

    const formattedCustomItems = customItems.map((item: any) => ({
      ...item,
      type: "custom",
      source: item.source,
    }));

    return [...purchaseItems, ...formattedCustomItems];
  };

  const availableItems = getAllAvailableItems();

  // Filter consolidations
  const filteredConsolidations = consolidations.filter((consolidation: any) => {
    const matchesSearch = consolidation.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consolidation.id?.toString().includes(searchTerm);
    
    const matchesFilter = filterMethod === "all" || 
      consolidation.shippingMethod === filterMethod;

    return matchesSearch && matchesFilter;
  });

  // Get shipping method info
  const getShippingMethodInfo = (method: string) => {
    return SHIPPING_METHODS.find(m => m.value === method) || SHIPPING_METHODS[0];
  };

  // Smart grouping algorithm
  const suggestConsolidation = () => {
    // Group items by customer or shipping method preference
    const groups: { [key: string]: any[] } = {};
    
    availableItems.forEach((item: any) => {
      const key = item.customerEmail || item.source || "general";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    // Create suggested consolidations based on weight and item count
    const suggestions = Object.entries(groups).map(([key, items]) => {
      const totalWeight = items.reduce((sum, item) => sum + (item.weight || 0), 0);
      const suggestedMethod = totalWeight > 20 ? "sea_freight" : 
                              totalWeight > 5 ? "air_standard" : "air_express";
      
      return {
        name: `Auto-${key}-${new Date().toISOString().split('T')[0]}`,
        items: items,
        shippingMethod: suggestedMethod,
        totalWeight,
        itemCount: items.length,
      };
    });

    return suggestions;
  };

  const calculateConsolidationStats = (consolidation: any) => {
    const items = consolidation.items || [];
    const totalWeight = items.reduce((sum: number, item: any) => sum + (item.weight || 0), 0);
    const totalValue = items.reduce((sum: number, item: any) => 
      sum + ((item.quantity || 1) * (item.unitPrice || 0)), 0);
    
    return { totalWeight, totalValue, itemCount: items.length };
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">At Warehouse</h1>
          <p className="text-muted-foreground mt-1">Consolidate items and prepare for shipping</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button 
            variant="outline"
            className="flex-1 md:flex-initial" 
            onClick={() => setCustomItemDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Item
          </Button>
          <Button 
            className="flex-1 md:flex-initial"
            onClick={() => setConsolidationDialogOpen(true)}
            disabled={selectedItems.length === 0}
          >
            <Package className="h-4 w-4 mr-2" />
            Create Consolidation ({selectedItems.length})
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search consolidations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterMethod} onValueChange={setFilterMethod}>
          <SelectTrigger className="w-full md:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            {SHIPPING_METHODS.map((method) => (
              <SelectItem key={method.value} value={method.value}>
                <div className="flex items-center gap-2">
                  <method.icon className="h-4 w-4" />
                  {method.label}
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
                <p className="text-sm text-muted-foreground">Available Items</p>
                <p className="text-2xl font-bold">{availableItems.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Ready to consolidate</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Boxes className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Custom Items</p>
                <p className="text-2xl font-bold">{customItems.length}</p>
                <p className="text-xs text-muted-foreground mt-1">From marketplaces</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Consolidations</p>
                <p className="text-2xl font-bold">{consolidations.length}</p>
                <p className="text-xs text-muted-foreground mt-1">In progress</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ready to Ship</p>
                <p className="text-2xl font-bold">
                  {consolidations.filter((c: any) => c.status === "ready").length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Awaiting dispatch</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Truck className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="items">Available Items</TabsTrigger>
          <TabsTrigger value="consolidations">Consolidations</TabsTrigger>
        </TabsList>

        {/* Available Items Tab */}
        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Items Ready for Consolidation</CardTitle>
              <CardDescription>
                Select items to group them into a consolidation shipment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {availableItems.length === 0 ? (
                <div className="text-center py-12">
                  <Boxes className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No items available</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Items will appear here when purchases arrive or custom items are added
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableItems.map((item: any, idx: number) => (
                    <div 
                      key={idx} 
                      className={`border rounded-lg p-4 transition-colors ${
                        selectedItems.includes(idx) ? 'bg-primary/5 border-primary' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedItems.includes(idx)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedItems([...selectedItems, idx]);
                            } else {
                              setSelectedItems(selectedItems.filter(i => i !== idx));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{item.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {item.type === "custom" ? (
                                    <>
                                      {ITEM_SOURCES.find(s => s.value === item.source)?.label || item.source}
                                    </>
                                  ) : (
                                    <>From: {item.source}</>
                                  )}
                                </Badge>
                                {item.sku && (
                                  <span className="text-xs text-muted-foreground">
                                    SKU: {item.sku}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">${(item.unitPrice || 0).toFixed(2)}</p>
                              <p className="text-sm text-muted-foreground">
                                Qty: {item.quantity || 1}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-2 text-sm text-muted-foreground">
                            <div>Weight: {item.weight || 0} kg</div>
                            <div>Dimensions: {item.dimensions || "N/A"}</div>
                            {item.customerName && <div>Customer: {item.customerName}</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {availableItems.length > 0 && (
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    {selectedItems.length} items selected
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedItems(availableItems.map((_, idx) => idx))}
                    >
                      Select All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedItems([])}
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consolidations Tab */}
        <TabsContent value="consolidations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Consolidations</CardTitle>
              <CardDescription>
                Grouped items ready for international shipping
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center gap-2 text-muted-foreground">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current"></div>
                    Loading consolidations...
                  </div>
                </div>
              ) : filteredConsolidations.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No consolidations found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select items and create a consolidation to get started
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredConsolidations.map((consolidation: any) => {
                    const methodInfo = getShippingMethodInfo(consolidation.shippingMethod);
                    const stats = calculateConsolidationStats(consolidation);
                    const MethodIcon = methodInfo.icon;
                    
                    return (
                      <Card 
                        key={consolidation.id}
                        className={`cursor-pointer hover:shadow-lg transition-all border-2 ${methodInfo.color} border-opacity-20`}
                        onClick={() => {
                          setSelectedConsolidation(consolidation);
                          setDetailsDialogOpen(true);
                        }}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className={`h-10 w-10 rounded-full ${methodInfo.bgLight} flex items-center justify-center`}>
                              <MethodIcon className={`h-5 w-5 ${methodInfo.textColor}`} />
                            </div>
                            <Badge className={`${methodInfo.bgLight} ${methodInfo.textColor} border-0`}>
                              {methodInfo.label}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg mt-2">
                            {consolidation.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Items:</span>
                              <span className="font-medium">{stats.itemCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Weight:</span>
                              <span className="font-medium">{stats.totalWeight.toFixed(2)} kg</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Value:</span>
                              <span className="font-medium">${stats.totalValue.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Status:</span>
                              <Badge variant="outline" className="text-xs">
                                {consolidation.status || "preparing"}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-3 border-t">
                            <p className="text-xs text-muted-foreground">
                              Created {consolidation.createdAt ? format(new Date(consolidation.createdAt), "MMM dd, yyyy") : "recently"}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Custom Item Dialog */}
      <Dialog open={customItemDialogOpen} onOpenChange={setCustomItemDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Custom Item</DialogTitle>
            <DialogDescription>
              Add items purchased from Taobao, Pinduoduo, or other marketplaces
            </DialogDescription>
          </DialogHeader>
          <Form {...customItemForm}>
            <form onSubmit={customItemForm.handleSubmit((data) => createCustomItemMutation.mutate(data))}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={customItemForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Product name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={customItemForm.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Platform *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ITEM_SOURCES.map((source) => (
                            <SelectItem key={source.value} value={source.value}>
                              <div className="flex items-center gap-2">
                                <source.icon className="h-4 w-4" />
                                {source.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={customItemForm.control}
                  name="orderNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Platform order number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={customItemForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={customItemForm.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Price (¥)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" />
                      </FormControl>
                      <FormDescription>Price in CNY/RMB</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={customItemForm.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={customItemForm.control}
                  name="dimensions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dimensions</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="L x W x H (cm)" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={customItemForm.control}
                  name="trackingNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domestic Tracking</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Domestic tracking number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={customItemForm.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="End customer name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={customItemForm.control}
                  name="customerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="customer@example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={customItemForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Additional notes..." rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setCustomItemDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCustomItemMutation.isPending}>
                  {createCustomItemMutation.isPending ? "Adding..." : "Add Item"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Consolidation Dialog */}
      <Dialog open={consolidationDialogOpen} onOpenChange={setConsolidationDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Consolidation</DialogTitle>
            <DialogDescription>
              Group selected items for international shipping
            </DialogDescription>
          </DialogHeader>
          <Form {...consolidationForm}>
            <form onSubmit={consolidationForm.handleSubmit((data) => 
              createConsolidationMutation.mutate({ ...data, itemIds: selectedItems })
            )}>
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">Selected Items: {selectedItems.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total weight: {selectedItems.reduce((sum, idx) => 
                      sum + (availableItems[idx]?.weight || 0), 0).toFixed(2)} kg
                  </p>
                </div>

                <FormField
                  control={consolidationForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consolidation Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., CONS-2024-001" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={consolidationForm.control}
                  name="shippingMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shipping Method *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select shipping method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SHIPPING_METHODS.map((method) => {
                            const Icon = method.icon;
                            return (
                              <SelectItem key={method.value} value={method.value}>
                                <div className="flex items-center gap-2">
                                  <div className={`h-4 w-4 rounded ${method.color}`}></div>
                                  <Icon className="h-4 w-4" />
                                  <span>{method.label}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose based on urgency and cost considerations
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={consolidationForm.control}
                  name="warehouse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warehouse *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select warehouse" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="china">China Warehouse</SelectItem>
                          <SelectItem value="vietnam">Vietnam Warehouse</SelectItem>
                          <SelectItem value="usa">USA Warehouse</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={consolidationForm.control}
                    name="targetWeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Weight (kg)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" />
                        </FormControl>
                        <FormDescription>Optimal weight for shipping</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={consolidationForm.control}
                    name="maxItems"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Items</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="1" />
                        </FormControl>
                        <FormDescription>Maximum items per box</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={consolidationForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Instructions</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Handling instructions..." rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setConsolidationDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createConsolidationMutation.isPending}>
                  {createConsolidationMutation.isPending ? "Creating..." : "Create Consolidation"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Consolidation Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Consolidation Details: {selectedConsolidation?.name}
            </DialogTitle>
            <DialogDescription>
              View consolidation details and included items
            </DialogDescription>
          </DialogHeader>
          
          {selectedConsolidation && (
            <ScrollArea className="flex-1">
              <div className="space-y-4 p-1">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Shipping Method</p>
                    <div className="flex items-center gap-2 mt-1">
                      {(() => {
                        const method = getShippingMethodInfo(selectedConsolidation.shippingMethod);
                        const Icon = method.icon;
                        return (
                          <>
                            <div className={`h-4 w-4 rounded ${method.color}`}></div>
                            <Icon className="h-4 w-4" />
                            <span className="font-medium">{method.label}</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Warehouse</p>
                    <p className="font-medium">{selectedConsolidation.warehouse}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge>{selectedConsolidation.status || "preparing"}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">
                      {selectedConsolidation.createdAt ? format(new Date(selectedConsolidation.createdAt), "PPP") : "N/A"}
                    </p>
                  </div>
                </div>

                {selectedConsolidation.notes && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-1">Special Instructions</p>
                    <p className="text-sm">{selectedConsolidation.notes}</p>
                  </div>
                )}

                <div>
                  <h3 className="font-medium mb-3">Included Items</h3>
                  {selectedConsolidation.items && selectedConsolidation.items.length > 0 ? (
                    <div className="space-y-2">
                      {selectedConsolidation.items.map((item: any, idx: number) => (
                        <div key={idx} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                                <span>Qty: {item.quantity}</span>
                                <span>Weight: {item.weight || 0} kg</span>
                                <span>${(item.unitPrice || 0).toFixed(2)}</span>
                              </div>
                            </div>
                            <Badge variant="secondary">{item.source}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No items in this consolidation</p>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this consolidation?")) {
                        deleteConsolidationMutation.mutate(selectedConsolidation.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Consolidation
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}