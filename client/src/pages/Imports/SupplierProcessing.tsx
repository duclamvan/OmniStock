import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Package, Search, ChevronRight, Truck, Calendar, DollarSign, 
  Edit, Trash2, Eye, ShoppingCart, Clock, AlertCircle, CheckCircle,
  X, Save, Copy, ExternalLink, Hash, Boxes, MapPin, Globe, Users
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Schema for creating purchase
const createPurchaseSchema = z.object({
  supplier: z.string().min(1, "Supplier is required"),
  trackingNumber: z.string().optional(),
  estimatedArrival: z.string().optional(),
  notes: z.string().optional(),
  shippingCost: z.coerce.number().min(0).optional(),
  totalCost: z.coerce.number().min(0).optional(),
});

// Schema for adding items
const addItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  sku: z.string().optional(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.coerce.number().min(0).optional(),
  weight: z.coerce.number().min(0).optional(),
  dimensions: z.string().optional(),
  notes: z.string().optional(),
});

type CreatePurchaseData = z.infer<typeof createPurchaseSchema>;
type AddItemData = z.infer<typeof addItemSchema>;

export default function SupplierProcessing() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Forms
  const createForm = useForm<CreatePurchaseData>({
    resolver: zodResolver(createPurchaseSchema),
    defaultValues: {
      supplier: "",
      trackingNumber: "",
      notes: "",
      shippingCost: 0,
      totalCost: 0,
    },
  });

  const itemForm = useForm<AddItemData>({
    resolver: zodResolver(addItemSchema),
    defaultValues: {
      name: "",
      sku: "",
      quantity: 1,
      unitPrice: 0,
      weight: 0,
      dimensions: "",
      notes: "",
    },
  });

  // Fetch purchases with items
  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["/api/imports/purchases"],
    queryFn: () => apiRequest("GET", "/api/imports/purchases"),
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
    queryFn: () => apiRequest("GET", "/api/suppliers"),
  });

  // Create purchase mutation
  const createPurchaseMutation = useMutation({
    mutationFn: (data: CreatePurchaseData) =>
      apiRequest("POST", "/api/imports/purchases", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/imports/purchases"] });
      toast({ description: "Purchase created successfully" });
      setCreateDialogOpen(false);
      createForm.reset();
    },
    onError: () => {
      toast({ description: "Failed to create purchase", variant: "destructive" });
    },
  });

  // Update purchase status
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/imports/purchases/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/imports/purchases"] });
      toast({ description: "Purchase status updated" });
    },
  });

  // Add item to purchase
  const addItemMutation = useMutation({
    mutationFn: (data: AddItemData & { purchaseId: number }) =>
      apiRequest("POST", `/api/imports/purchases/${data.purchaseId}/items`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/imports/purchases"] });
      toast({ description: "Item added successfully" });
      setAddItemDialogOpen(false);
      itemForm.reset();
    },
    onError: () => {
      toast({ description: "Failed to add item", variant: "destructive" });
    },
  });

  // Delete purchase
  const deletePurchaseMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/imports/purchases/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/imports/purchases"] });
      toast({ description: "Purchase deleted successfully" });
      setDetailsDialogOpen(false);
    },
    onError: () => {
      toast({ description: "Failed to delete purchase", variant: "destructive" });
    },
  });

  const filteredPurchases = purchases.filter((purchase: any) =>
    purchase.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.id?.toString().includes(searchTerm)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "ordered": return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "shipped": return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      case "arrived": return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "ordered": return <ShoppingCart className="h-4 w-4" />;
      case "shipped": return <Truck className="h-4 w-4" />;
      case "arrived": return <CheckCircle className="h-4 w-4" />;
      case "cancelled": return <X className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const calculateTotalValue = () => {
    return purchases.reduce((total: number, purchase: any) => {
      const purchaseTotal = (purchase.totalCost || 0) + (purchase.shippingCost || 0);
      return total + purchaseTotal;
    }, 0);
  };

  const calculateItemsTotal = (purchase: any) => {
    if (!purchase.items || purchase.items.length === 0) return 0;
    return purchase.items.reduce((total: number, item: any) => {
      return total + (item.quantity * (item.unitPrice || 0));
    }, 0);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Supplier Processing</h1>
          <p className="text-muted-foreground mt-1">Manage import purchases from suppliers</p>
        </div>
        <Button 
          className="w-full md:w-auto" 
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Purchase
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by supplier, tracking number, or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Purchases</p>
                <p className="text-2xl font-bold">{purchases.length}</p>
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
                <p className="text-2xl font-bold">
                  {purchases.filter((p: any) => p.status === "shipped").length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Currently shipping</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Truck className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">
                  {purchases.filter((p: any) => p.status === "pending").length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Awaiting action</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">${calculateTotalValue().toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">All purchases</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Import Purchases</CardTitle>
          <CardDescription>
            Each purchase represents a group of items from a single supplier
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current"></div>
                Loading purchases...
              </div>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No purchases found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first purchase to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPurchases.map((purchase: any) => (
                <div 
                  key={purchase.id} 
                  className="border rounded-lg hover:shadow-md transition-all duration-200"
                >
                  <div className="p-4">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                      <div className="flex-1 w-full lg:w-auto">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-sm">{purchase.id}</span>
                          </div>
                          <h3 className="font-semibold text-lg">{purchase.supplier || "Unknown Supplier"}</h3>
                          <Badge className={`${getStatusColor(purchase.status)} flex items-center gap-1`}>
                            {getStatusIcon(purchase.status)}
                            {purchase.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Items</p>
                            <p className="font-medium flex items-center gap-1">
                              <Boxes className="h-3 w-3" />
                              {purchase.items?.length || 0} items
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Tracking</p>
                            <p className="font-medium font-mono text-xs">
                              {purchase.trackingNumber || "Not provided"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Total Value</p>
                            <p className="font-medium">
                              ${((purchase.totalCost || 0) + (purchase.shippingCost || 0)).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Created</p>
                            <p className="font-medium">
                              {purchase.createdAt ? format(new Date(purchase.createdAt), "MMM dd, yyyy") : "N/A"}
                            </p>
                          </div>
                        </div>

                        {purchase.items && purchase.items.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-muted-foreground mb-2">Items Preview:</p>
                            <div className="flex flex-wrap gap-2">
                              {purchase.items.slice(0, 3).map((item: any, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {item.name} (x{item.quantity})
                                </Badge>
                              ))}
                              {purchase.items.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{purchase.items.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 w-full lg:w-auto">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1 lg:flex-initial"
                          onClick={() => {
                            setSelectedPurchase(purchase);
                            setDetailsDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        <Select
                          value={purchase.status}
                          onValueChange={(value) => 
                            updateStatusMutation.mutate({ id: purchase.id, status: value })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="ordered">Ordered</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="arrived">Arrived</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Purchase Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Import Purchase</DialogTitle>
            <DialogDescription>
              Add a new purchase order from a supplier
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit((data) => createPurchaseMutation.mutate(data))}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select supplier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suppliers.map((supplier: any) => (
                            <SelectItem key={supplier.id} value={supplier.name}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="Other">Other (Manual Entry)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="trackingNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tracking Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter tracking number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="totalCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Cost ($)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
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
                  control={createForm.control}
                  name="estimatedArrival"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Arrival</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Add any notes..." rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createPurchaseMutation.isPending}>
                  {createPurchaseMutation.isPending ? "Creating..." : "Create Purchase"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Purchase Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Purchase #{selectedPurchase?.id} Details</span>
              <Badge className={getStatusColor(selectedPurchase?.status || "")}>
                {selectedPurchase?.status}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              View and manage purchase details and items
            </DialogDescription>
          </DialogHeader>
          
          {selectedPurchase && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="items">Items ({selectedPurchase.items?.length || 0})</TabsTrigger>
                <TabsTrigger value="tracking">Tracking</TabsTrigger>
              </TabsList>
              
              <ScrollArea className="flex-1 mt-4">
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Supplier</p>
                      <p className="font-medium">{selectedPurchase.supplier}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Value</p>
                      <p className="font-medium">
                        ${((selectedPurchase.totalCost || 0) + (selectedPurchase.shippingCost || 0)).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Item Cost</p>
                      <p className="font-medium">${(selectedPurchase.totalCost || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Shipping Cost</p>
                      <p className="font-medium">${(selectedPurchase.shippingCost || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created Date</p>
                      <p className="font-medium">
                        {selectedPurchase.createdAt ? format(new Date(selectedPurchase.createdAt), "PPP") : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated Arrival</p>
                      <p className="font-medium">
                        {selectedPurchase.estimatedArrival ? format(new Date(selectedPurchase.estimatedArrival), "PPP") : "Not set"}
                      </p>
                    </div>
                  </div>
                  
                  {selectedPurchase.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Notes</p>
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm">{selectedPurchase.notes}</p>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this purchase?")) {
                          deletePurchaseMutation.mutate(selectedPurchase.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Purchase
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="items" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Total items value: ${calculateItemsTotal(selectedPurchase).toFixed(2)}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setAddItemDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                  
                  {selectedPurchase.items && selectedPurchase.items.length > 0 ? (
                    <div className="space-y-3">
                      {selectedPurchase.items.map((item: any, idx: number) => (
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
                                  <span className="text-muted-foreground">Unit:</span> ${(item.unitPrice || 0).toFixed(2)}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Total:</span> ${(item.quantity * (item.unitPrice || 0)).toFixed(2)}
                                </div>
                              </div>
                              {item.notes && (
                                <p className="text-sm text-muted-foreground mt-2">{item.notes}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Boxes className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No items added yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Add items to track what's in this purchase
                      </p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="tracking" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Tracking Number</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-muted rounded font-mono text-sm">
                          {selectedPurchase.trackingNumber || "No tracking number provided"}
                        </code>
                        {selectedPurchase.trackingNumber && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(selectedPurchase.trackingNumber);
                                toast({ description: "Tracking number copied" });
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Shipping Progress</p>
                      <div className="space-y-3">
                        <div className={`flex items-center gap-3 ${selectedPurchase.status === 'pending' ? 'text-primary' : 'text-muted-foreground'}`}>
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            selectedPurchase.status === 'pending' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}>
                            <Clock className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">Pending</p>
                            <p className="text-sm text-muted-foreground">Awaiting supplier confirmation</p>
                          </div>
                        </div>
                        
                        <div className={`flex items-center gap-3 ${selectedPurchase.status === 'ordered' ? 'text-primary' : 'text-muted-foreground'}`}>
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            ['ordered', 'shipped', 'arrived'].includes(selectedPurchase.status) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}>
                            <ShoppingCart className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">Ordered</p>
                            <p className="text-sm text-muted-foreground">Order placed with supplier</p>
                          </div>
                        </div>
                        
                        <div className={`flex items-center gap-3 ${selectedPurchase.status === 'shipped' ? 'text-primary' : 'text-muted-foreground'}`}>
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            ['shipped', 'arrived'].includes(selectedPurchase.status) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}>
                            <Truck className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">Shipped</p>
                            <p className="text-sm text-muted-foreground">In transit to warehouse</p>
                          </div>
                        </div>
                        
                        <div className={`flex items-center gap-3 ${selectedPurchase.status === 'arrived' ? 'text-primary' : 'text-muted-foreground'}`}>
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            selectedPurchase.status === 'arrived' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}>
                            <MapPin className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">Arrived</p>
                            <p className="text-sm text-muted-foreground">Delivered to warehouse</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item to Purchase</DialogTitle>
            <DialogDescription>
              Add a new item to this purchase order
            </DialogDescription>
          </DialogHeader>
          <Form {...itemForm}>
            <form onSubmit={itemForm.handleSubmit((data) => 
              addItemMutation.mutate({ ...data, purchaseId: selectedPurchase?.id })
            )}>
              <div className="space-y-4">
                <FormField
                  control={itemForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter item name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={itemForm.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Item SKU" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={itemForm.control}
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={itemForm.control}
                    name="unitPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Price ($)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="0.00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={itemForm.control}
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
                </div>

                <FormField
                  control={itemForm.control}
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
                  control={itemForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Additional notes..." rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setAddItemDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addItemMutation.isPending}>
                  {addItemMutation.isPending ? "Adding..." : "Add Item"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}