import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/currencyUtils";
import { format } from "date-fns";
import { 
  ArrowLeft,
  Plus,
  Trash2,
  Package,
  Globe,
  Calendar,
  DollarSign,
  Hash,
  Calculator,
  AlertCircle,
  X,
  Save,
  Edit2,
  Loader2
} from "lucide-react";

// Form schema
const importOrderSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  currency: z.enum(["CZK", "EUR", "USD", "VND", "CNY"]),
  region: z.string().optional(),
  trackingNumber: z.string().optional(),
  estimatedArrival: z.string().optional(),
  actualArrival: z.string().optional(),
  status: z.enum(["pending", "ordered", "shipped", "delivered", "received", "cancelled"]),
  notes: z.string().optional(),
});

type ImportOrderForm = z.infer<typeof importOrderSchema>;

interface OrderItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: string;
  weight?: string;
  totalCost: string;
  receivedQuantity?: number;
  status?: string;
}

export default function EditImportOrder() {
  const { id } = useParams();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);
  
  // New item form state
  const [newItem, setNewItem] = useState<Partial<OrderItem>>({
    productName: '',
    sku: '',
    quantity: 1,
    unitCost: '0',
    weight: '',
  });

  // Fetch order details
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['/api/import-orders', id],
    queryFn: async () => {
      const response = await fetch(`/api/import-orders/${id}`);
      if (!response.ok) throw new Error('Failed to fetch import order');
      return response.json();
    }
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery<any[]>({
    queryKey: ['/api/suppliers'],
  });

  // Fetch warehouses
  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
  });

  // Form setup
  const form = useForm<ImportOrderForm>({
    resolver: zodResolver(importOrderSchema),
    defaultValues: {
      supplierId: '',
      warehouseId: '',
      currency: 'EUR',
      region: '',
      trackingNumber: '',
      estimatedArrival: '',
      actualArrival: '',
      status: 'pending',
      notes: '',
    },
  });

  // Initialize form with order data
  useEffect(() => {
    if (order) {
      form.reset({
        supplierId: order.supplierId || '',
        warehouseId: order.warehouseId || '',
        currency: order.currency || 'EUR',
        region: order.region || '',
        trackingNumber: order.trackingNumber || '',
        estimatedArrival: order.estimatedArrival ? format(new Date(order.estimatedArrival), 'yyyy-MM-dd') : '',
        actualArrival: order.actualArrival ? format(new Date(order.actualArrival), 'yyyy-MM-dd') : '',
        status: order.status || 'pending',
        notes: order.notes || '',
      });
      setItems(order.items || []);
    }
  }, [order, form]);

  // Update import order mutation
  const updateMutation = useMutation({
    mutationFn: async (data: ImportOrderForm) => {
      const orderData = {
        ...data,
        items: items.map(item => ({
          id: item.id.startsWith('temp-') ? undefined : item.id,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitCost: item.unitCost,
          weight: item.weight || null,
          totalCost: item.totalCost,
          receivedQuantity: item.receivedQuantity,
          status: item.status,
        })),
      };
      return apiRequest(`/api/import-orders/${id}`, 'PATCH', orderData);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Import Order Updated",
        description: `Order #${data.orderNumber} has been updated successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/import-orders'] });
      navigate(`/imports/orders/${id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update import order. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Add or update item
  const saveItem = () => {
    if (!newItem.productName || !newItem.sku || !newItem.quantity || !newItem.unitCost) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required item fields.",
        variant: "destructive",
      });
      return;
    }

    const totalCost = (parseFloat(newItem.unitCost || '0') * (newItem.quantity || 0)).toFixed(2);
    
    if (editingItem) {
      // Update existing item
      setItems(items.map(item => 
        item.id === editingItem.id 
          ? {
              ...item,
              productName: newItem.productName!,
              sku: newItem.sku!,
              quantity: newItem.quantity || 1,
              unitCost: newItem.unitCost || '0',
              weight: newItem.weight,
              totalCost,
            }
          : item
      ));
      setEditingItem(null);
    } else {
      // Add new item
      const item: OrderItem = {
        id: `temp-${Date.now()}`,
        productName: newItem.productName,
        sku: newItem.sku,
        quantity: newItem.quantity || 1,
        unitCost: newItem.unitCost || '0',
        weight: newItem.weight,
        totalCost,
      };
      setItems([...items, item]);
    }

    setNewItem({
      productName: '',
      sku: '',
      quantity: 1,
      unitCost: '0',
      weight: '',
    });
    setShowItemForm(false);
  };

  // Edit item
  const startEditItem = (item: OrderItem) => {
    setEditingItem(item);
    setNewItem({
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitCost: item.unitCost,
      weight: item.weight,
    });
    setShowItemForm(true);
  };

  // Remove item
  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  // Calculate totals
  const totalValue = items.reduce((sum, item) => sum + parseFloat(item.totalCost), 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalWeight = items.reduce((sum, item) => sum + (parseFloat(item.weight || '0') * item.quantity), 0);

  const onSubmit = (data: ImportOrderForm) => {
    if (items.length === 0) {
      toast({
        title: "No Items",
        description: "Please add at least one item to the import order.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate(data);
  };

  // Loading skeleton
  if (orderLoading) {
    return (
      <div className="space-y-6 px-4 md:px-0">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <Alert variant="destructive" className="mx-4 md:mx-0">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Import order not found.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
      {/* Mobile-First Header */}
      <div className="sticky top-0 z-10 bg-background border-b md:relative md:border-0">
        <div className="flex items-center justify-between p-4 md:p-0">
          <div className="flex items-center gap-2 md:gap-4">
            <Link href={`/imports/orders/${id}`}>
              <Button variant="ghost" size="icon" className="md:hidden">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" className="hidden md:flex">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Order
              </Button>
            </Link>
            <div>
              <h1 className="text-lg md:text-2xl font-semibold">Edit Import Order</h1>
              <p className="text-xs md:text-sm text-muted-foreground">Order #{order.orderNumber}</p>
            </div>
          </div>
          <Badge className="text-xs md:text-sm">{order.status}</Badge>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6 px-4 md:px-0">
        {/* Order Details - Mobile Optimized */}
        <Card>
          <CardHeader className="pb-3 md:pb-6">
            <CardTitle className="text-base md:text-lg">Order Details</CardTitle>
            <CardDescription className="text-xs md:text-sm">Update order information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Supplier *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.map((supplier: any) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="warehouseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Warehouse *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select warehouse" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {warehouses.map((warehouse: any) => (
                          <SelectItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="ordered">Ordered</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="received">Received</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Currency *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CZK">CZK - Czech Koruna</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="VND">VND - Vietnamese Dong</SelectItem>
                        <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      <Globe className="h-3 w-3 inline mr-1" />
                      Region
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Asia, Europe" className="h-10" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trackingNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Tracking Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Shipment tracking #" className="h-10" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimatedArrival"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      Estimated Arrival
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="date" className="h-10" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="actualArrival"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      Actual Arrival
                    </FormLabel>
                    <FormControl>
                      <Input {...field} type="date" className="h-10" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Additional notes about this import order..." 
                      className="min-h-[60px] md:min-h-[80px] resize-none"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Order Items - Mobile Optimized */}
        <Card>
          <CardHeader className="pb-3 md:pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base md:text-lg">Order Items</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  {items.length} {items.length === 1 ? 'item' : 'items'} • {totalQuantity} units
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setEditingItem(null);
                  setNewItem({
                    productName: '',
                    sku: '',
                    quantity: 1,
                    unitCost: '0',
                    weight: '',
                  });
                  setShowItemForm(true);
                }}
                className="h-8 md:h-9"
              >
                <Plus className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Add Item</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <Package className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm md:text-base text-muted-foreground">No items in this order</p>
              </div>
            ) : (
              <>
                {/* Mobile View - Cards */}
                <div className="space-y-3 md:hidden">
                  {items.map((item) => (
                    <div key={item.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => startEditItem(item)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeItem(item.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Qty</p>
                          <p className="font-medium">{item.quantity}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Unit Cost</p>
                          <p className="font-medium">{formatCurrency(parseFloat(item.unitCost), form.watch('currency'))}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-medium">{formatCurrency(parseFloat(item.totalCost), form.watch('currency'))}</p>
                        </div>
                      </div>
                      {item.receivedQuantity !== undefined && (
                        <div className="text-xs">
                          <Badge variant={item.receivedQuantity === item.quantity ? "default" : "secondary"}>
                            {item.receivedQuantity}/{item.quantity} received
                          </Badge>
                        </div>
                      )}
                      {item.weight && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Weight:</span> {item.weight} kg
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop View - Table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Received</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Weight (kg)</TableHead>
                        <TableHead className="text-right">Total Cost</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell>{item.sku}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {item.receivedQuantity !== undefined ? (
                              <Badge variant={item.receivedQuantity === item.quantity ? "default" : "secondary"}>
                                {item.receivedQuantity}
                              </Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(parseFloat(item.unitCost), form.watch('currency'))}
                          </TableCell>
                          <TableCell className="text-right">{item.weight || '-'}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(parseFloat(item.totalCost), form.watch('currency'))}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => startEditItem(item)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals Summary */}
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Items</span>
                    <span className="font-medium">{items.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Quantity</span>
                    <span className="font-medium">{totalQuantity}</span>
                  </div>
                  {totalWeight > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Weight</span>
                      <span className="font-medium">{totalWeight.toFixed(2)} kg</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base md:text-lg font-semibold pt-2">
                    <span>Total Value</span>
                    <span className="text-green-600">
                      {formatCurrency(totalValue, form.watch('currency'))}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Mobile Fixed Bottom Actions */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex gap-2 md:hidden">
          <Link href={`/imports/orders/${id}`} className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              Cancel
            </Button>
          </Link>
          <Button type="submit" className="flex-1" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex justify-end gap-3">
          <Link href={`/imports/orders/${id}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Add/Edit Item Modal/Sheet */}
      {showItemForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center">
          <div className="bg-background w-full md:max-w-md rounded-t-xl md:rounded-xl p-4 md:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingItem ? 'Edit Item' : 'Add Item'}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowItemForm(false);
                  setEditingItem(null);
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Product Name *</Label>
                <Input
                  value={newItem.productName}
                  onChange={(e) => setNewItem({ ...newItem, productName: e.target.value })}
                  placeholder="Enter product name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">SKU *</Label>
                <Input
                  value={newItem.sku}
                  onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                  placeholder="Product SKU"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Quantity *</Label>
                  <Input
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
                    min="1"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Unit Cost *</Label>
                  <Input
                    type="number"
                    value={newItem.unitCost}
                    onChange={(e) => setNewItem({ ...newItem, unitCost: e.target.value })}
                    step="0.01"
                    min="0"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm">Weight per Unit (kg)</Label>
                <Input
                  type="number"
                  value={newItem.weight}
                  onChange={(e) => setNewItem({ ...newItem, weight: e.target.value })}
                  step="0.01"
                  min="0"
                  placeholder="Optional"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowItemForm(false);
                    setEditingItem(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={saveItem}
                  className="flex-1"
                >
                  {editingItem ? 'Update Item' : 'Add Item'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}