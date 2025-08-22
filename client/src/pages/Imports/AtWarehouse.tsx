import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Plus, Package, Plane, Ship, Zap, Truck, MapPin, Clock, Weight, Users, ShoppingCart, Star, Trash2, Package2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface CustomItem {
  id: number;
  name: string;
  source: string; // taobao, pinduoduo, 1688
  orderNumber: string | null;
  quantity: number;
  unitPrice: string;
  weight: string;
  dimensions: string | null;
  trackingNumber: string | null;
  notes: string | null;
  customerName: string | null;
  customerEmail: string | null;
  status: string;
  createdAt: string;
}

interface Consolidation {
  id: number;
  name: string;
  shippingMethod: string;
  warehouse: string;
  notes: string | null;
  targetWeight: string | null;
  maxItems: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: any[];
  itemCount: number;
}

const shippingMethodColors: Record<string, string> = {
  air_express: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200",
  air_standard: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200",
  sea_freight: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900 dark:text-cyan-200",
  rail_freight: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200",
  priority: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200"
};

const shippingMethodIcons: Record<string, any> = {
  air_express: Zap,
  air_standard: Plane,
  sea_freight: Ship,
  rail_freight: Truck,
  priority: Star
};

const sourceColors: Record<string, string> = {
  taobao: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  pinduoduo: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  "1688": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  alibaba: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
};

export default function AtWarehouse() {
  const [isAddCustomItemOpen, setIsAddCustomItemOpen] = useState(false);
  const [isCreateConsolidationOpen, setIsCreateConsolidationOpen] = useState(false);
  const [selectedConsolidation, setSelectedConsolidation] = useState<Consolidation | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch custom items
  const { data: customItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ['/api/imports/custom-items'],
    queryFn: async () => {
      const response = await apiRequest('/api/imports/custom-items');
      return response.json() as Promise<CustomItem[]>;
    }
  });

  // Fetch consolidations
  const { data: consolidations = [], isLoading: isLoadingConsolidations } = useQuery({
    queryKey: ['/api/imports/consolidations'],
    queryFn: async () => {
      const response = await apiRequest('/api/imports/consolidations');
      return response.json() as Promise<Consolidation[]>;
    }
  });

  // Create custom item mutation
  const createCustomItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/imports/custom-items', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
      setIsAddCustomItemOpen(false);
      toast({ title: "Success", description: "Custom item added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add custom item", variant: "destructive" });
    }
  });

  // Create consolidation mutation
  const createConsolidationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/imports/consolidations', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/consolidations'] });
      setIsCreateConsolidationOpen(false);
      toast({ title: "Success", description: "Consolidation created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create consolidation", variant: "destructive" });
    }
  });

  // Delete consolidation mutation
  const deleteConsolidationMutation = useMutation({
    mutationFn: async (consolidationId: number) => {
      const response = await apiRequest(`/api/imports/consolidations/${consolidationId}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/consolidations'] });
      toast({ title: "Success", description: "Consolidation deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete consolidation", variant: "destructive" });
    }
  });

  const handleCreateCustomItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get('name') as string,
      source: formData.get('source') as string,
      orderNumber: formData.get('orderNumber') as string || null,
      quantity: parseInt(formData.get('quantity') as string) || 1,
      unitPrice: parseFloat(formData.get('unitPrice') as string) || 0,
      weight: parseFloat(formData.get('weight') as string) || 0,
      dimensions: formData.get('dimensions') as string || null,
      trackingNumber: formData.get('trackingNumber') as string || null,
      notes: formData.get('notes') as string || null,
      customerName: formData.get('customerName') as string || null,
      customerEmail: formData.get('customerEmail') as string || null,
    };
    
    createCustomItemMutation.mutate(data);
  };

  const handleCreateConsolidation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get('name') as string,
      shippingMethod: formData.get('shippingMethod') as string,
      warehouse: formData.get('warehouse') as string,
      notes: formData.get('notes') as string || null,
      targetWeight: formData.get('targetWeight') ? parseFloat(formData.get('targetWeight') as string) : null,
      maxItems: formData.get('maxItems') ? parseInt(formData.get('maxItems') as string) : null,
    };
    
    createConsolidationMutation.mutate(data);
  };

  const getShippingMethodBadge = (method: string) => {
    const Icon = shippingMethodIcons[method] || Package;
    return (
      <Badge className={`${shippingMethodColors[method] || "bg-gray-100 text-gray-800"} flex items-center space-x-1`}>
        <Icon className="h-3 w-3" />
        <span>{method.replace('_', ' ').toUpperCase()}</span>
      </Badge>
    );
  };

  const getSourceBadge = (source: string) => (
    <Badge className={sourceColors[source.toLowerCase()] || sourceColors.other}>
      {source.toUpperCase()}
    </Badge>
  );

  const isLoading = isLoadingItems || isLoadingConsolidations;

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
          <h1 className="text-3xl font-bold">At Warehouse</h1>
          <p className="text-muted-foreground">Manage warehouse consolidations and custom items</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isAddCustomItemOpen} onOpenChange={setIsAddCustomItemOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-add-custom-item">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add Custom Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add Custom Item</DialogTitle>
                <DialogDescription>
                  Add items from external sources like Taobao, Pinduoduo, etc.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateCustomItem} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Item Name *</Label>
                    <Input 
                      id="name" 
                      name="name" 
                      required 
                      data-testid="input-item-name"
                      placeholder="Enter item name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source">Source Platform *</Label>
                    <Select name="source" required>
                      <SelectTrigger data-testid="select-source">
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="taobao">Taobao</SelectItem>
                        <SelectItem value="pinduoduo">Pinduoduo</SelectItem>
                        <SelectItem value="1688">1688</SelectItem>
                        <SelectItem value="alibaba">Alibaba</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="orderNumber">Order Number</Label>
                    <Input 
                      id="orderNumber" 
                      name="orderNumber" 
                      data-testid="input-order-number"
                      placeholder="Platform order number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trackingNumber">Tracking Number</Label>
                    <Input 
                      id="trackingNumber" 
                      name="trackingNumber" 
                      data-testid="input-tracking-number"
                      placeholder="Tracking number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input 
                      id="quantity" 
                      name="quantity" 
                      type="number" 
                      min="1" 
                      defaultValue="1"
                      required 
                      data-testid="input-quantity"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unitPrice">Unit Price ($)</Label>
                    <Input 
                      id="unitPrice" 
                      name="unitPrice" 
                      type="number" 
                      step="0.01" 
                      data-testid="input-unit-price"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input 
                      id="weight" 
                      name="weight" 
                      type="number" 
                      step="0.001" 
                      data-testid="input-weight"
                      placeholder="0.000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dimensions">Dimensions (L×W×H cm)</Label>
                  <Input 
                    id="dimensions" 
                    name="dimensions" 
                    data-testid="input-dimensions"
                    placeholder="e.g., 20×15×10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Customer Name</Label>
                    <Input 
                      id="customerName" 
                      name="customerName" 
                      data-testid="input-customer-name"
                      placeholder="For customer orders"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">Customer Email</Label>
                    <Input 
                      id="customerEmail" 
                      name="customerEmail" 
                      type="email" 
                      data-testid="input-customer-email"
                      placeholder="customer@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea 
                    id="notes" 
                    name="notes" 
                    data-testid="textarea-notes"
                    placeholder="Additional notes..."
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddCustomItemOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createCustomItemMutation.isPending} data-testid="button-submit-item">
                    {createCustomItemMutation.isPending ? "Adding..." : "Add Item"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateConsolidationOpen} onOpenChange={setIsCreateConsolidationOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-consolidation">
                <Plus className="h-4 w-4 mr-2" />
                Create Consolidation
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Consolidation</DialogTitle>
                <DialogDescription>
                  Create a new shipment consolidation with smart grouping
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateConsolidation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Consolidation Name *</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    required 
                    data-testid="input-consolidation-name"
                    placeholder="e.g., USA Express Batch #1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shippingMethod">Shipping Method *</Label>
                    <Select name="shippingMethod" required>
                      <SelectTrigger data-testid="select-shipping-method">
                        <SelectValue placeholder="Select shipping method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="priority">
                          <div className="flex items-center space-x-2">
                            <Star className="h-4 w-4 text-purple-600" />
                            <span>Priority Express</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="air_express">
                          <div className="flex items-center space-x-2">
                            <Zap className="h-4 w-4 text-red-600" />
                            <span>Air Express</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="air_standard">
                          <div className="flex items-center space-x-2">
                            <Plane className="h-4 w-4 text-blue-600" />
                            <span>Air Standard</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="sea_freight">
                          <div className="flex items-center space-x-2">
                            <Ship className="h-4 w-4 text-cyan-600" />
                            <span>Sea Freight</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="rail_freight">
                          <div className="flex items-center space-x-2">
                            <Truck className="h-4 w-4 text-green-600" />
                            <span>Rail Freight</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warehouse">Warehouse Location *</Label>
                    <Select name="warehouse" required>
                      <SelectTrigger data-testid="select-warehouse">
                        <SelectValue placeholder="Select warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="china_guangzhou">China - Guangzhou</SelectItem>
                        <SelectItem value="china_shenzhen">China - Shenzhen</SelectItem>
                        <SelectItem value="usa_california">USA - California</SelectItem>
                        <SelectItem value="usa_new_york">USA - New York</SelectItem>
                        <SelectItem value="vietnam_hcmc">Vietnam - Ho Chi Minh</SelectItem>
                        <SelectItem value="vietnam_hanoi">Vietnam - Hanoi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="targetWeight">Target Weight (kg)</Label>
                    <Input 
                      id="targetWeight" 
                      name="targetWeight" 
                      type="number" 
                      step="0.1" 
                      data-testid="input-target-weight"
                      placeholder="Max weight limit"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxItems">Max Items</Label>
                    <Input 
                      id="maxItems" 
                      name="maxItems" 
                      type="number" 
                      min="1" 
                      data-testid="input-max-items"
                      placeholder="Max item count"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea 
                    id="notes" 
                    name="notes" 
                    data-testid="textarea-consolidation-notes"
                    placeholder="Additional notes about this consolidation..."
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateConsolidationOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createConsolidationMutation.isPending} data-testid="button-submit-consolidation">
                    {createConsolidationMutation.isPending ? "Creating..." : "Create Consolidation"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custom Items</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-custom-items-count">{customItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consolidations</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-consolidations-count">{consolidations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Items</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {customItems.filter(item => item.status === 'available').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Weight</CardTitle>
            <Weight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customItems.reduce((sum, item) => sum + parseFloat(item.weight), 0).toFixed(1)}kg
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Custom Items Section */}
        <Card>
          <CardHeader>
            <CardTitle>Custom Items</CardTitle>
            <CardDescription>
              Items from external platforms ready for consolidation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {customItems.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No custom items</h3>
                <p className="text-muted-foreground mb-4">Add items from Taobao, Pinduoduo, and other platforms</p>
                <Button onClick={() => setIsAddCustomItemOpen(true)} data-testid="button-add-first-item">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {customItems.map((item) => (
                  <Card key={item.id} className="border hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold" data-testid={`item-name-${item.id}`}>{item.name}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            {getSourceBadge(item.source)}
                            <Badge variant="outline" className="text-xs">
                              Qty: {item.quantity}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${item.unitPrice}</p>
                          <p className="text-sm text-muted-foreground">{item.weight}kg</p>
                        </div>
                      </div>

                      {item.orderNumber && (
                        <div className="text-sm text-muted-foreground mb-2">
                          Order: {item.orderNumber}
                        </div>
                      )}

                      {item.customerName && (
                        <div className="text-sm text-muted-foreground mb-2">
                          Customer: {item.customerName}
                          {item.customerEmail && ` (${item.customerEmail})`}
                        </div>
                      )}

                      {item.trackingNumber && (
                        <div className="flex items-center text-sm text-muted-foreground mb-2">
                          <Truck className="h-3 w-3 mr-1" />
                          {item.trackingNumber}
                        </div>
                      )}

                      {item.notes && (
                        <div className="text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded mt-2">
                          {item.notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Consolidations Section */}
        <Card>
          <CardHeader>
            <CardTitle>Smart Consolidations</CardTitle>
            <CardDescription>
              Intelligently grouped shipments by method and destination
            </CardDescription>
          </CardHeader>
          <CardContent>
            {consolidations.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No consolidations</h3>
                <p className="text-muted-foreground mb-4">Create smart shipment consolidations</p>
                <Button onClick={() => setIsCreateConsolidationOpen(true)} data-testid="button-create-first-consolidation">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Consolidation
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {consolidations.map((consolidation) => (
                  <Card key={consolidation.id} className="border-2 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-semibold" data-testid={`consolidation-name-${consolidation.id}`}>
                              {consolidation.name}
                            </h4>
                            {getShippingMethodBadge(consolidation.shippingMethod)}
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{consolidation.warehouse.replace('_', ' ')}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">
                            {consolidation.itemCount} items
                          </Badge>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteConsolidationMutation.mutate(consolidation.id)}
                            data-testid={`button-delete-consolidation-${consolidation.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {consolidation.targetWeight && (
                          <div className="flex items-center space-x-2">
                            <Weight className="h-3 w-3 text-muted-foreground" />
                            <span>Target: {consolidation.targetWeight}kg</span>
                          </div>
                        )}
                        {consolidation.maxItems && (
                          <div className="flex items-center space-x-2">
                            <Package2 className="h-3 w-3 text-muted-foreground" />
                            <span>Max: {consolidation.maxItems} items</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <span className="text-sm text-muted-foreground">
                          Created {format(new Date(consolidation.createdAt), 'MMM dd, yyyy')}
                        </span>
                        <Badge variant="secondary">
                          {consolidation.status.toUpperCase()}
                        </Badge>
                      </div>

                      {consolidation.notes && (
                        <div className="text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded mt-2">
                          {consolidation.notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}