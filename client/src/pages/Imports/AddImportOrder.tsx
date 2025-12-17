import { useState, useEffect } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
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
import { formatCurrency } from "@/lib/currencyUtils";
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

type ImportOrderForm = {
  supplierId: string;
  warehouseId: string;
  currency: "CZK" | "EUR" | "USD" | "VND" | "CNY";
  region?: string;
  trackingNumber?: string;
  estimatedArrival?: string;
  actualArrival?: string;
  status?: "pending" | "ordered" | "shipped" | "delivered" | "received" | "cancelled";
  notes?: string;
};

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

export default function AddImportOrder() {
  const { t } = useTranslation('imports');
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { id: editId } = useParams<{ id?: string }>();
  const isEditMode = Boolean(editId);
  
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

  // Fetch existing order data when in edit mode
  const { data: existingOrder, isLoading: orderLoading } = useQuery({
    queryKey: ['/api/import-orders', editId],
    queryFn: async () => {
      const response = await fetch(`/api/import-orders/${editId}`);
      if (!response.ok) throw new Error('Failed to fetch import order');
      return response.json();
    },
    enabled: isEditMode,
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery<any[]>({
    queryKey: ['/api/suppliers'],
  });

  // Fetch warehouses
  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
  });

  // Form schema with translations
  const importOrderSchema = z.object({
    supplierId: z.string().min(1, t('supplierRequired')),
    warehouseId: z.string().min(1, t('warehouseRequired')),
    currency: z.enum(["CZK", "EUR", "USD", "VND", "CNY"]),
    region: z.string().optional(),
    trackingNumber: z.string().optional(),
    estimatedArrival: z.string().optional(),
    actualArrival: z.string().optional(),
    status: z.enum(["pending", "ordered", "shipped", "delivered", "received", "cancelled"]).optional(),
    notes: z.string().optional(),
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

  // Populate form with existing data in edit mode
  useEffect(() => {
    if (existingOrder && isEditMode) {
      form.reset({
        supplierId: existingOrder.supplierId || '',
        warehouseId: existingOrder.warehouseId || '',
        currency: existingOrder.currency || 'EUR',
        region: existingOrder.region || '',
        trackingNumber: existingOrder.trackingNumber || '',
        estimatedArrival: existingOrder.estimatedArrival ? format(new Date(existingOrder.estimatedArrival), 'yyyy-MM-dd') : '',
        actualArrival: existingOrder.actualArrival ? format(new Date(existingOrder.actualArrival), 'yyyy-MM-dd') : '',
        status: existingOrder.status || 'pending',
        notes: existingOrder.notes || '',
      });
      setItems(existingOrder.items || []);
    }
  }, [existingOrder, isEditMode, form]);

  // Create import order mutation
  const createMutation = useMutation({
    mutationFn: async (data: ImportOrderForm) => {
      const orderData = {
        ...data,
        items: items.map(item => ({
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitCost: item.unitCost,
          weight: item.weight || null,
          totalCost: item.totalCost,
        })),
      };
      return apiRequest('POST', '/api/import-orders', orderData);
    },
    onSuccess: (data: any) => {
      toast({
        title: t('importCreated'),
        description: t('importCreatedDesc', { orderNumber: data.orderNumber }),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/import-orders'] });
      navigate(`/imports/orders/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: t('createFailed'),
        description: t('createFailedDesc'),
        variant: "destructive",
      });
    },
  });

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
      return apiRequest('PATCH', `/api/import-orders/${editId}`, orderData);
    },
    onSuccess: (data: any) => {
      toast({
        title: t('importUpdated'),
        description: t('importUpdatedDesc', { orderNumber: data.orderNumber }),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/import-orders'] });
      navigate(`/imports/orders/${editId}`);
    },
    onError: (error) => {
      toast({
        title: t('updateFailed'),
        description: t('updateFailedDesc'),
        variant: "destructive",
      });
    },
  });

  // Add or update item
  const saveItem = () => {
    if (!newItem.productName || !newItem.sku || !newItem.quantity || !newItem.unitCost) {
      toast({
        title: t('missingInformation'),
        description: t('fillRequiredFields'),
        variant: "destructive",
      });
      return;
    }

    const totalCost = (parseFloat(newItem.unitCost || '0') * (newItem.quantity || 0)).toFixed(2);
    
    if (editingItem) {
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
        title: t('noItems'),
        description: t('atLeastOneProduct'),
        variant: "destructive",
      });
      return;
    }
    if (isEditMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

  // Loading skeleton for edit mode
  if (isEditMode && orderLoading) {
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

  // Not found state for edit mode
  if (isEditMode && !orderLoading && !existingOrder) {
    return (
      <Alert variant="destructive" className="mx-4 md:mx-0">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{t('importOrderNotFound')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 md:pb-6 overflow-x-hidden p-2 sm:p-4 md:p-6">
      {/* Mobile-First Header */}
      <div className="sticky top-0 z-10 bg-background border-b md:relative md:border-0 -mx-2 sm:-mx-4 md:-mx-6 px-2 sm:px-4 md:px-6">
        <div className="flex items-center justify-between py-3 md:py-0 gap-3">
          <div className="flex items-center gap-2 md:gap-4">
            <Link href={isEditMode ? `/imports/orders/${editId}` : "/imports"}>
              <Button variant="ghost" size="icon" className="md:hidden">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" className="hidden md:flex">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {isEditMode ? t('backToOrder') : t('backToImports')}
              </Button>
            </Link>
            <div>
              <h1 className="text-lg md:text-2xl font-semibold">
                {isEditMode ? t('editImportOrder') : t('newImportOrder')}
              </h1>
              {isEditMode && existingOrder && (
                <p className="text-xs md:text-sm text-muted-foreground">{t('orderNumber')}: #{existingOrder.orderNumber}</p>
              )}
              {!isEditMode && (
                <p className="text-xs md:text-sm text-muted-foreground md:hidden">{t('fillInOrderDetails')}</p>
              )}
            </div>
          </div>
          {isEditMode && existingOrder && (
            <Badge className="text-xs md:text-sm">{t(`status.${existingOrder.status}`)}</Badge>
          )}
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
        {/* Order Details - Mobile Optimized */}
        <Card className="w-full">
          <CardHeader className="pb-2 sm:pb-4 md:pb-6">
            <CardTitle className="text-sm sm:text-base md:text-lg">{t('orderDetails')}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">{t('basicInformation')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">{t('supplier')} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder={t('selectSupplier')} />
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
                    <FormLabel className="text-sm">{t('warehouse')} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder={t('selectWarehouse')} />
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
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">{t('currency')} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CZK">{t('currencyCZK')}</SelectItem>
                        <SelectItem value="EUR">{t('currencyEUR')}</SelectItem>
                        <SelectItem value="USD">{t('currencyUSD')}</SelectItem>
                        <SelectItem value="VND">{t('currencyVND')}</SelectItem>
                        <SelectItem value="CNY">{t('currencyCNY')}</SelectItem>
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
                      {t('region')}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('enterRegion')} className="h-10" />
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
                    <FormLabel className="text-sm">{t('trackingNumber')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('enterTracking')} className="h-10" />
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
                      {t('estimatedArrival')}
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
                  <FormLabel className="text-sm">{t('notesLabel')}</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder={t('enterNotes')} 
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
        <Card className="w-full">
          <CardHeader className="pb-2 sm:pb-4 md:pb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
              <div>
                <CardTitle className="text-sm sm:text-base md:text-lg">{t('orderItems')}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {items.length} {items.length === 1 ? t('item') : t('items')} • {totalQuantity} {t('common:units', 'units')}
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setShowItemForm(true)}
                className="h-8 md:h-9 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('addItem')}</span>
                <span className="sm:hidden">{t('addItem')}</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {items.length === 0 ? (
              <div className="text-center py-6 sm:py-8 md:py-12">
                <Package className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm md:text-base text-muted-foreground">{t('noItemsYet')}</p>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">{t('addFirstItem')}</p>
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 -mr-2 -mt-1"
                          onClick={() => removeItem(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">{t('qty')}</p>
                          <p className="font-medium">{item.quantity}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('unitCost')}</p>
                          <p className="font-medium">{formatCurrency(parseFloat(item.unitCost), form.watch('currency'))}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('totalCost')}</p>
                          <p className="font-medium">{formatCurrency(parseFloat(item.totalCost), form.watch('currency'))}</p>
                        </div>
                      </div>
                      {item.weight && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">{t('weight')}:</span> {item.weight} kg
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop View - Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('product')}</TableHead>
                        <TableHead>{t('sku')}</TableHead>
                        <TableHead className="text-right">{t('quantity')}</TableHead>
                        <TableHead className="text-right">{t('unitCost')}</TableHead>
                        <TableHead className="text-right">{t('weight')} (kg)</TableHead>
                        <TableHead className="text-right">{t('totalCost')}</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell>{item.sku}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(parseFloat(item.unitCost), form.watch('currency'))}
                          </TableCell>
                          <TableCell className="text-right">{item.weight || '-'}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(parseFloat(item.totalCost), form.watch('currency'))}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals Summary */}
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('totalItems')}</span>
                    <span className="font-medium">{items.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('totalQuantity')}</span>
                    <span className="font-medium">{totalQuantity}</span>
                  </div>
                  {totalWeight > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('totalWeight')}</span>
                      <span className="font-medium">{totalWeight.toFixed(2)} kg</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base md:text-lg font-semibold pt-2">
                    <span>{t('totalValue')}</span>
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
          <Link href={isEditMode ? `/imports/orders/${editId}` : "/imports"} className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              {t('common:cancel', 'Cancel')}
            </Button>
          </Link>
          <Button type="submit" className="flex-1" disabled={isMutating}>
            {isMutating 
              ? t('common:loading', 'Saving...') 
              : isEditMode 
                ? t('saveChanges') 
                : t('createImportOrder')}
          </Button>
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex justify-end gap-3">
          <Link href={isEditMode ? `/imports/orders/${editId}` : "/imports"}>
            <Button type="button" variant="outline">
              {t('common:cancel', 'Cancel')}
            </Button>
          </Link>
          <Button type="submit" disabled={isMutating}>
            {isMutating 
              ? t('common:loading', 'Saving...') 
              : isEditMode 
                ? t('saveChanges') 
                : t('createImportOrder')}
          </Button>
        </div>
      </form>

      {/* Add Item Modal/Sheet */}
      {showItemForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center">
          <div className="bg-background w-full md:max-w-md rounded-t-xl md:rounded-xl p-4 md:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('addItem')}</h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowItemForm(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-sm">{t('productName')} *</Label>
                <Input
                  value={newItem.productName}
                  onChange={(e) => setNewItem({ ...newItem, productName: e.target.value })}
                  placeholder={t('enterProductName')}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">{t('sku')} *</Label>
                <Input
                  value={newItem.sku}
                  onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                  placeholder={t('enterSKU')}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">{t('quantity')} *</Label>
                  <Input
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
                    min="1"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">{t('unitCost')} *</Label>
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
                <Label className="text-sm">{t('weight')} (kg)</Label>
                <Input
                  type="number"
                  value={newItem.weight}
                  onChange={(e) => setNewItem({ ...newItem, weight: e.target.value })}
                  step="0.01"
                  min="0"
                  placeholder={t('optionalField')}
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
                    setNewItem({
                      productName: '',
                      sku: '',
                      quantity: 1,
                      unitCost: '0',
                      weight: '',
                    });
                  }}
                  className="flex-1"
                >
                  {t('common:cancel', 'Cancel')}
                </Button>
                <Button
                  type="button"
                  onClick={saveItem}
                  className="flex-1"
                >
                  {editingItem ? t('saveItem') : t('addItem')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}