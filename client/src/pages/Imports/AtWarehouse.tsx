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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Package, Plane, Ship, Zap, Truck, MapPin, Clock, Weight, Users, ShoppingCart, Star, Trash2, Package2, PackageOpen, AlertCircle, CheckCircle, Edit, MoreHorizontal, ArrowUp, ArrowDown, Archive, Send, RefreshCw, Flag, Shield, Grip, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

interface PurchaseItem {
  id: number;
  purchaseId: number;
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  weight: string | null;
  dimensions: any;
  notes: string | null;
  trackingNumber: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ImportPurchase {
  id: number;
  supplier: string;
  trackingNumber: string | null;
  estimatedArrival: string | null;
  notes: string | null;
  shippingCost: string;
  totalCost: string;
  paymentCurrency: string;
  totalPaid: string;
  purchaseCurrency: string;
  purchaseTotal: string;
  exchangeRate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: PurchaseItem[];
  itemCount: number;
}

interface CustomItem {
  id: number;
  name: string;
  source: string;
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
  classification?: string;
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

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  ordered: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_transit: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  at_warehouse: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  unpacked: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  available: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  assigned: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  consolidated: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  shipped: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
};

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
  const [isEditCustomItemOpen, setIsEditCustomItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomItem | null>(null);
  const [isCreateConsolidationOpen, setIsCreateConsolidationOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ImportPurchase | null>(null);
  const [showUnpackDialog, setShowUnpackDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusTarget, setStatusTarget] = useState<{ type: 'order' | 'item', id: number, currentStatus: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'item' | 'consolidation', id: number, name: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch purchase orders at warehouse
  const { data: atWarehouseOrders = [], isLoading: isLoadingOrders } = useQuery<ImportPurchase[]>({
    queryKey: ['/api/imports/purchases/at-warehouse'],
  });

  // Fetch all items (unpacked + custom)
  const { data: customItems = [], isLoading: isLoadingItems } = useQuery<CustomItem[]>({
    queryKey: ['/api/imports/custom-items'],
  });

  const { data: unpackedItems = [] } = useQuery<CustomItem[]>({
    queryKey: ['/api/imports/unpacked-items'],
  });

  // Combine all items
  const allItems = [...customItems, ...unpackedItems];

  // Fetch consolidations
  const { data: consolidations = [], isLoading: isLoadingConsolidations } = useQuery<Consolidation[]>({
    queryKey: ['/api/imports/consolidations'],
  });

  // Unpack purchase order mutation
  const unpackMutation = useMutation({
    mutationFn: async (purchaseId: number) => {
      return apiRequest('/api/imports/purchases/unpack', 'POST', { purchaseId });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase order has been unpacked successfully",
      });
      setShowUnpackDialog(false);
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases/at-warehouse'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/unpacked-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unpack purchase order",
        variant: "destructive",
      });
    },
  });

  // Update purchase order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      return apiRequest(`/api/imports/purchases/${id}`, 'PATCH', { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
      setShowStatusDialog(false);
      setStatusTarget(null);
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases/at-warehouse'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/purchases'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update order status",
        variant: "destructive",
      });
    },
  });

  // Update custom item status mutation
  const updateItemStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      return apiRequest(`/api/imports/custom-items/${id}`, 'PATCH', { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Item status updated successfully",
      });
      setShowStatusDialog(false);
      setStatusTarget(null);
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/unpacked-items'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item status",
        variant: "destructive",
      });
    },
  });

  // Update item classification mutation
  const updateItemClassificationMutation = useMutation({
    mutationFn: async ({ id, classification }: { id: number, classification: string }) => {
      return apiRequest(`/api/imports/custom-items/${id}`, 'PATCH', { classification });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Item classification updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/unpacked-items'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update classification",
        variant: "destructive",
      });
    },
  });

  // Create custom item mutation
  const createCustomItemMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/imports/custom-items', 'POST', data);
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

  // Update custom item mutation
  const updateCustomItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      return apiRequest(`/api/imports/custom-items/${id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/unpacked-items'] });
      setIsEditCustomItemOpen(false);
      setEditingItem(null);
      toast({ title: "Success", description: "Item updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update item", variant: "destructive" });
    }
  });

  // Delete custom item mutation
  const deleteCustomItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/imports/custom-items/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/unpacked-items'] });
      toast({ title: "Success", description: "Item deleted successfully" });
      setDeleteTarget(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete item", variant: "destructive" });
    }
  });

  // Add items to consolidation mutation
  const addItemsToConsolidationMutation = useMutation({
    mutationFn: async ({ consolidationId, itemIds }: { consolidationId: number, itemIds: number[] }) => {
      return apiRequest(`/api/imports/consolidations/${consolidationId}/items`, 'POST', { itemIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/consolidations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/imports/custom-items'] });
      toast({ title: "Success", description: "Items added to consolidation" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add items to consolidation", variant: "destructive" });
    }
  });

  // Create consolidation mutation
  const createConsolidationMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/imports/consolidations', 'POST', data);
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
      return apiRequest(`/api/imports/consolidations/${consolidationId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/consolidations'] });
      toast({ title: "Success", description: "Consolidation deleted successfully" });
      setDeleteTarget(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete consolidation", variant: "destructive" });
    }
  });

  const handleUnpack = (order: ImportPurchase) => {
    setSelectedOrder(order);
    setShowUnpackDialog(true);
  };

  const confirmUnpack = () => {
    if (selectedOrder) {
      unpackMutation.mutate(selectedOrder.id);
    }
  };

  const handleEditItem = (item: CustomItem) => {
    setEditingItem(item);
    setIsEditCustomItemOpen(true);
  };

  const handleStatusChange = (type: 'order' | 'item', id: number, currentStatus: string) => {
    setStatusTarget({ type, id, currentStatus });
    setShowStatusDialog(true);
  };

  const confirmStatusChange = (newStatus: string) => {
    if (statusTarget) {
      if (statusTarget.type === 'order') {
        updateOrderStatusMutation.mutate({ id: statusTarget.id, status: newStatus });
      } else {
        updateItemStatusMutation.mutate({ id: statusTarget.id, status: newStatus });
      }
    }
  };

  const handleDelete = () => {
    if (deleteTarget) {
      if (deleteTarget.type === 'item') {
        deleteCustomItemMutation.mutate(deleteTarget.id);
      } else {
        deleteConsolidationMutation.mutate(deleteTarget.id);
      }
    }
  };

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
      classification: formData.get('classification') as string || 'general',
    };
    
    createCustomItemMutation.mutate(data);
  };

  const handleUpdateCustomItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;
    
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
      status: formData.get('status') as string,
      classification: formData.get('classification') as string || 'general',
    };
    
    updateCustomItemMutation.mutate({ id: editingItem.id, data });
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

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const itemId = parseInt(result.draggableId);
    const consolidationId = parseInt(result.destination.droppableId.replace('consolidation-', ''));
    
    if (consolidationId && !isNaN(consolidationId)) {
      addItemsToConsolidationMutation.mutate({ consolidationId, itemIds: [itemId] });
    }
  };

  const getStatusBadge = (status: string) => (
    <Badge className={statusColors[status] || "bg-gray-100 text-gray-800"}>
      {status.replace('_', ' ').toUpperCase()}
    </Badge>
  );

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

  const getClassificationIcon = (classification?: string) => {
    if (classification === 'sensitive') {
      return <Shield className="h-4 w-4 text-red-500" />;
    }
    return <Flag className="h-4 w-4 text-green-500" />;
  };

  const getClassificationBadge = (classification?: string) => {
    if (classification === 'sensitive') {
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <Shield className="h-3 w-3 mr-1" />
          Sensitive
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <Flag className="h-3 w-3 mr-1" />
        General
      </Badge>
    );
  };

  const isLoading = isLoadingItems || isLoadingConsolidations || isLoadingOrders;

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
          <p className="text-muted-foreground">Process incoming orders and manage warehouse items</p>
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
                    <Label htmlFor="classification">Goods Classification *</Label>
                    <Select name="classification" defaultValue="general">
                      <SelectTrigger data-testid="select-classification">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">
                          <div className="flex items-center">
                            <Flag className="h-4 w-4 mr-2 text-green-500" />
                            General Goods
                          </div>
                        </SelectItem>
                        <SelectItem value="sensitive">
                          <div className="flex items-center">
                            <Shield className="h-4 w-4 mr-2 text-red-500" />
                            Sensitive Goods
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
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
                  Create a new shipment consolidation for grouping items
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
            <CardTitle className="text-sm font-medium">Incoming Orders</CardTitle>
            <Package2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600" data-testid="text-awaiting-count">
              {atWarehouseOrders.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <PackageOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-total-items">
              {allItems.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sensitive Goods</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-sensitive-count">
              {allItems.filter(item => item.classification === 'sensitive').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consolidations</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-consolidations-count">
              {consolidations.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="incoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="incoming">
            Incoming Orders ({atWarehouseOrders.length})
          </TabsTrigger>
          <TabsTrigger value="items">
            All Items ({allItems.length})
          </TabsTrigger>
        </TabsList>

        {/* Incoming Orders Tab */}
        <TabsContent value="incoming" className="space-y-4">
          {atWarehouseOrders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No incoming orders at warehouse</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Orders with "At Warehouse" status will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {atWarehouseOrders.map((order) => (
                <Card key={order.id} className="shadow-sm">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold">PO #{order.id} - {order.supplier}</h3>
                          {getStatusBadge(order.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Items</div>
                            <div className="font-medium">{order.items?.length || 0}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Total Value</div>
                            <div className="font-medium">
                              {order.paymentCurrency} {Number(order.totalPaid || 0).toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Tracking</div>
                            <div className="font-mono text-xs">{order.trackingNumber || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Arrived</div>
                            <div className="text-sm">
                              {order.updatedAt ? format(new Date(order.updatedAt), 'MMM dd, yyyy') : 'N/A'}
                            </div>
                          </div>
                        </div>

                        {order.items && order.items.length > 0 && (
                          <div className="border rounded-lg p-3 bg-muted/30">
                            <div className="text-sm font-medium mb-2">Order Items:</div>
                            <div className="space-y-1">
                              {order.items.slice(0, 3).map((item: any, index: number) => (
                                <div key={index} className="text-sm flex justify-between">
                                  <span className="text-muted-foreground">
                                    {item.name} {item.sku && `(${item.sku})`}
                                  </span>
                                  <span className="font-medium">Qty: {item.quantity}</span>
                                </div>
                              ))}
                              {order.items.length > 3 && (
                                <div className="text-sm text-muted-foreground">
                                  ... and {order.items.length - 3} more items
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange('order', order.id, order.status)}
                          data-testid={`button-status-order-${order.id}`}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleUnpack(order)}
                          data-testid={`button-unpack-order-${order.id}`}
                        >
                          <PackageOpen className="h-4 w-4 mr-1" />
                          Unpack
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* All Items Tab with Drag & Drop */}
        <TabsContent value="items" className="space-y-4">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Available Items Column */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Available Items</CardTitle>
                    <CardDescription>Drag items to consolidations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Droppable droppableId="available-items">
                      {(provided) => (
                        <div 
                          ref={provided.innerRef} 
                          {...provided.droppableProps}
                          className="space-y-2 min-h-[400px]"
                        >
                          {allItems.filter(item => item.status !== 'consolidated').map((item, index) => (
                            <Draggable key={item.id} draggableId={String(item.id)} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`border rounded-lg p-3 bg-background ${
                                    snapshot.isDragging ? 'shadow-lg opacity-90' : ''
                                  }`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 space-y-1">
                                      <div className="flex items-center gap-2">
                                        <Grip className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-semibold">{item.name}</span>
                                        {getClassificationIcon(item.classification)}
                                        {getSourceBadge(item.source)}
                                      </div>
                                      <div className="flex gap-4 text-xs text-muted-foreground">
                                        <span>Qty: {item.quantity}</span>
                                        <span>{item.weight ? `${item.weight} kg` : 'No weight'}</span>
                                        {item.customerName && <span>{item.customerName}</span>}
                                      </div>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => updateItemClassificationMutation.mutate({
                                          id: item.id,
                                          classification: item.classification === 'sensitive' ? 'general' : 'sensitive'
                                        })}
                                      >
                                        {item.classification === 'sensitive' ? (
                                          <Flag className="h-4 w-4" />
                                        ) : (
                                          <Shield className="h-4 w-4" />
                                        )}
                                      </Button>
                                      <Button 
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleEditItem(item)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm">
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem 
                                            className="text-red-600"
                                            onClick={() => setDeleteTarget({ type: 'item', id: item.id, name: item.name })}
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </CardContent>
                </Card>
              </div>

              {/* Consolidations Column */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Active Consolidations</CardTitle>
                    <CardDescription>Drop items here to consolidate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="space-y-3">
                        {consolidations.map((consolidation) => (
                          <div key={consolidation.id}>
                            <div className="border rounded-lg p-3 bg-muted/30">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <div className="font-medium">{consolidation.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {consolidation.warehouse.replace('_', ' - ')}
                                  </div>
                                </div>
                                {getShippingMethodBadge(consolidation.shippingMethod)}
                              </div>
                              
                              <Droppable droppableId={`consolidation-${consolidation.id}`}>
                                {(provided, snapshot) => (
                                  <div 
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`min-h-[60px] border-2 border-dashed rounded-md p-2 ${
                                      snapshot.isDraggingOver ? 'border-primary bg-primary/10' : 'border-muted'
                                    }`}
                                  >
                                    {consolidation.itemCount === 0 ? (
                                      <div className="text-center text-sm text-muted-foreground py-2">
                                        Drop items here
                                      </div>
                                    ) : (
                                      <div className="space-y-1">
                                        <div className="text-sm font-medium">{consolidation.itemCount} items</div>
                                        {consolidation.targetWeight && (
                                          <div className="text-xs text-muted-foreground">
                                            Max weight: {consolidation.targetWeight} kg
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                              
                              <div className="flex justify-between items-center mt-2">
                                {getStatusBadge(consolidation.status)}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem 
                                      className="text-red-600"
                                      onClick={() => setDeleteTarget({ 
                                        type: 'consolidation', 
                                        id: consolidation.id, 
                                        name: consolidation.name 
                                      })}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </DragDropContext>
        </TabsContent>
      </Tabs>

      {/* Edit Custom Item Dialog */}
      <Dialog open={isEditCustomItemOpen} onOpenChange={setIsEditCustomItemOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Update item details and status
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <form onSubmit={handleUpdateCustomItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Item Name *</Label>
                  <Input 
                    id="edit-name" 
                    name="name" 
                    required 
                    defaultValue={editingItem.name}
                    data-testid="input-edit-item-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-source">Source Platform *</Label>
                  <Select name="source" defaultValue={editingItem.source} required>
                    <SelectTrigger data-testid="select-edit-source">
                      <SelectValue />
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
                  <Label htmlFor="edit-status">Status</Label>
                  <Select name="status" defaultValue={editingItem.status}>
                    <SelectTrigger data-testid="select-edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="consolidated">Consolidated</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-classification">Goods Classification</Label>
                  <Select name="classification" defaultValue={editingItem.classification || 'general'}>
                    <SelectTrigger data-testid="select-edit-classification">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">
                        <div className="flex items-center">
                          <Flag className="h-4 w-4 mr-2 text-green-500" />
                          General Goods
                        </div>
                      </SelectItem>
                      <SelectItem value="sensitive">
                        <div className="flex items-center">
                          <Shield className="h-4 w-4 mr-2 text-red-500" />
                          Sensitive Goods
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-quantity">Quantity *</Label>
                  <Input 
                    id="edit-quantity" 
                    name="quantity" 
                    type="number" 
                    min="1" 
                    defaultValue={editingItem.quantity}
                    required 
                    data-testid="input-edit-quantity"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-unitPrice">Unit Price ($)</Label>
                  <Input 
                    id="edit-unitPrice" 
                    name="unitPrice" 
                    type="number" 
                    step="0.01" 
                    defaultValue={editingItem.unitPrice}
                    data-testid="input-edit-unit-price"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-weight">Weight (kg)</Label>
                  <Input 
                    id="edit-weight" 
                    name="weight" 
                    type="number" 
                    step="0.001" 
                    defaultValue={editingItem.weight}
                    data-testid="input-edit-weight"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-dimensions">Dimensions</Label>
                <Input 
                  id="edit-dimensions" 
                  name="dimensions" 
                  defaultValue={editingItem.dimensions || ''}
                  data-testid="input-edit-dimensions"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-customerName">Customer Name</Label>
                  <Input 
                    id="edit-customerName" 
                    name="customerName" 
                    defaultValue={editingItem.customerName || ''}
                    data-testid="input-edit-customer-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-customerEmail">Customer Email</Label>
                  <Input 
                    id="edit-customerEmail" 
                    name="customerEmail" 
                    type="email" 
                    defaultValue={editingItem.customerEmail || ''}
                    data-testid="input-edit-customer-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea 
                  id="edit-notes" 
                  name="notes" 
                  defaultValue={editingItem.notes || ''}
                  data-testid="textarea-edit-notes"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsEditCustomItemOpen(false);
                  setEditingItem(null);
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateCustomItemMutation.isPending} data-testid="button-update-item">
                  {updateCustomItemMutation.isPending ? "Updating..." : "Update Item"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
            <DialogDescription>
              Select a new status for this {statusTarget?.type === 'order' ? 'incoming order' : 'item'}
            </DialogDescription>
          </DialogHeader>
          
          {statusTarget && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Current Status</div>
                <div className="mt-1">{getStatusBadge(statusTarget.currentStatus)}</div>
              </div>

              <div className="space-y-2">
                <Label>New Status</Label>
                <Select onValueChange={confirmStatusChange}>
                  <SelectTrigger data-testid="select-new-status">
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusTarget.type === 'order' ? (
                      <>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="ordered">Ordered</SelectItem>
                        <SelectItem value="in_transit">In Transit</SelectItem>
                        <SelectItem value="at_warehouse">At Warehouse</SelectItem>
                        <SelectItem value="unpacked">Unpacked</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="consolidated">Consolidated</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowStatusDialog(false);
                setStatusTarget(null);
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unpack Confirmation Dialog */}
      <Dialog open={showUnpackDialog} onOpenChange={setShowUnpackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process & Unpack Purchase Order</DialogTitle>
            <DialogDescription>
              This will unpack the purchase order into individual items for consolidation.
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="font-medium">{selectedOrder.supplier}</div>
                <div className="text-sm text-muted-foreground">
                  PO #{selectedOrder.id} • {selectedOrder.items?.length || 0} items
                </div>
              </div>

              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  Each item in this purchase order will become an individual item ready for consolidation. 
                  The items will retain all supplier and order information.
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowUnpackDialog(false)}
              disabled={unpackMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmUnpack}
              disabled={unpackMutation.isPending}
              className="gap-2"
            >
              {unpackMutation.isPending ? (
                <>Processing...</>
              ) : (
                <>
                  <PackageOpen className="h-4 w-4" />
                  Confirm Unpack
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}