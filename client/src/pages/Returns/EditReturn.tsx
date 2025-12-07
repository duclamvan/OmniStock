import { useState, useEffect, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useTranslation } from 'react-i18next';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSettings } from "@/contexts/SettingsContext";
import { ArrowLeft, Save, Plus, X, Search, Trash2 } from "lucide-react";
import { format } from "date-fns";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function EditReturn() {
  const [, navigate] = useLocation();
  const { id } = useParams();
  const { toast } = useToast();
  const { t } = useTranslation(['inventory', 'common']);
  const { inventorySettings } = useSettings();
  
  const enabledReturnTypes = useMemo(() => {
    return (inventorySettings.returnTypes || []).filter(rt => rt.enabled);
  }, [inventorySettings.returnTypes]);
  
  const returnSchema = z.object({
    customerId: z.string().min(1, t('common:required')),
    orderId: z.string().optional(),
    returnDate: z.string().min(1, t('common:required')),
    returnType: z.string().min(1, t('common:required')),
    status: z.enum(['awaiting', 'processing', 'completed', 'cancelled']),
    shippingCarrier: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(z.object({
      productId: z.string().min(1, t('common:required')),
      productName: z.string().min(1, t('common:required')),
      sku: z.string().optional(),
      quantity: z.coerce.number().min(1, t('inventory:quantityMustBeGreaterThanZero')),
      price: z.coerce.number().min(0, t('common:mustBeNonNegative')),
    })).min(1, t('inventory:atLeastOneProductRequired')),
  });

  type ReturnFormData = z.infer<typeof returnSchema>;
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [orderSearchOpen, setOrderSearchOpen] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch return data
  const { data: returnData, isLoading: returnLoading } = useQuery<any>({
    queryKey: [`/api/returns/${id}`],
    enabled: !!id,
  });

  // Fetch customers
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['/api/customers'],
  });

  // Fetch orders
  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ['/api/orders'],
  });

  // Fetch products
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['/api/products'],
  });

  const form = useForm<ReturnFormData>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      customerId: "",
      orderId: "",
      returnDate: "",
      returnType: "refund",
      status: "awaiting",
      shippingCarrier: "",
      notes: "",
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchCustomerId = form.watch("customerId");

  // Filter orders by selected customer
  const customerOrders = orders.filter((order: any) => 
    order.customerId === watchCustomerId
  );

  // Update form when return data is loaded
  useEffect(() => {
    if (returnData) {
      form.reset({
        customerId: returnData.customerId || "",
        orderId: returnData.orderId || "",
        returnDate: returnData.returnDate ? format(new Date(returnData.returnDate), 'yyyy-MM-dd') : "",
        returnType: returnData.returnType || "refund",
        status: returnData.status || "awaiting",
        shippingCarrier: returnData.shippingCarrier || "",
        notes: returnData.notes || "",
        items: returnData.items || [],
      });
    }
  }, [returnData, form]);

  const updateReturnMutation = useMutation({
    mutationFn: (data: any) => apiRequest('PUT', `/api/returns/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/returns'] });
      queryClient.invalidateQueries({ queryKey: [`/api/returns/${id}`] });
      toast({
        title: t('common:success'),
        description: t('inventory:returnUpdatedSuccess'),
      });
      navigate("/returns");
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('inventory:failedToUpdateReturn'),
        variant: "destructive",
      });
    },
  });

  const deleteReturnMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/returns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/returns'] });
      toast({
        title: t('common:success'),
        description: t('inventory:returnDeletedSuccess'),
      });
      navigate("/returns");
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('inventory:failedToDeleteReturn'),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ReturnFormData) => {
    const submitData = {
      ...data,
      returnDate: new Date(data.returnDate),
    };

    updateReturnMutation.mutate(submitData);
  };

  const handleAddItem = () => {
    append({
      productId: "",
      productName: "",
      sku: "",
      quantity: 1,
      price: 0,
    });
  };

  const handleProductSelect = (productId: string, index: number) => {
    const product = products.find((p: any) => p.id === productId);
    if (product) {
      form.setValue(`items.${index}.productId`, product.id);
      form.setValue(`items.${index}.productName`, product.name);
      form.setValue(`items.${index}.sku`, product.sku || "");
      form.setValue(`items.${index}.price`, parseFloat(product.sellingPriceEur || "0"));
    }
    setProductSearchOpen(null);
  };

  if (returnLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto bg-white dark:bg-slate-900">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!returnData) {
    return (
      <div className="p-6 max-w-4xl mx-auto bg-white dark:bg-slate-900">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">{t('inventory:returnNotFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 md:p-6 max-w-4xl mx-auto overflow-x-hidden">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('inventory:backToReturns')}
        </Button>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{t('inventory:editReturn')}</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{t('inventory:updateReturnInformation')}</p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('common:delete')}
          </Button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
          <CardContent className="space-y-6 pt-6">
            {/* Return ID and Customer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('inventory:returnIdLabel')}</Label>
                <Input value={returnData.returnId || ""} disabled className="bg-gray-50" />
              </div>
              <div>
                <Label>{t('inventory:customerName')}</Label>
                <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerSearchOpen}
                      className="w-full justify-between"
                    >
                      {form.watch("customerId")
                        ? customers.find((customer: any) => customer.id === form.watch("customerId"))?.name
                        : t('inventory:selectCustomer')}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder={t('inventory:searchCustomer')} />
                      <CommandEmpty>{t('inventory:noCustomerFound')}</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {customers.map((customer: any) => (
                          <CommandItem
                            key={customer.id}
                            value={customer.name}
                            onSelect={() => {
                              form.setValue("customerId", customer.id);
                              setCustomerSearchOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                form.watch("customerId") === customer.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {customer.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                {form.formState.errors.customerId && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.customerId.message}</p>
                )}
              </div>
            </div>

            {/* Order Number and Return Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('inventory:orderNumberLabel')}</Label>
                <Popover open={orderSearchOpen} onOpenChange={setOrderSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={orderSearchOpen}
                      className="w-full justify-between"
                      disabled={!form.watch("customerId") || customerOrders.length === 0}
                    >
                      {form.watch("orderId")
                        ? orders.find((order: any) => order.id === form.watch("orderId"))?.id.slice(0, 8).toUpperCase()
                        : t('inventory:selectOrder')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder={t('inventory:searchOrder')} />
                      <CommandEmpty>{t('inventory:noOrderFound')}</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {customerOrders.map((order: any) => (
                          <CommandItem
                            key={order.id}
                            value={order.id}
                            onSelect={() => {
                              form.setValue("orderId", order.id);
                              setOrderSearchOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                form.watch("orderId") === order.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {order.id.slice(0, 8).toUpperCase()} - {format(new Date(order.createdAt), 'dd/MM/yyyy')}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>{t('inventory:returnDate')}</Label>
                <Input 
                  type="date"
                  {...form.register("returnDate")}
                />
                {form.formState.errors.returnDate && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.returnDate.message}</p>
                )}
              </div>
            </div>

            {/* Return Type and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('inventory:returnTypeLabel')}</Label>
                <Select
                  value={form.watch("returnType")}
                  onValueChange={(value) => form.setValue("returnType", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {enabledReturnTypes.map((rt) => (
                      <SelectItem key={rt.value} value={rt.value}>
                        {t(`inventory:${rt.labelKey}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {enabledReturnTypes.find(rt => rt.value === form.watch("returnType"))?.disposesInventory && (
                  <Badge variant="destructive" className="mt-2">
                    {t('inventory:disposedNotReturnedToInventory')}
                  </Badge>
                )}
              </div>
              <div>
                <Label>{t('inventory:statusLabel')}</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(value) => form.setValue("status", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="awaiting">{t('inventory:awaitingStatus')}</SelectItem>
                    <SelectItem value="processing">{t('inventory:processingStatus')}</SelectItem>
                    <SelectItem value="completed">{t('inventory:completedStatus')}</SelectItem>
                    <SelectItem value="cancelled">{t('inventory:cancelledStatus')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>{t('inventory:notes')}</Label>
              <Textarea 
                {...form.register("notes")}
                placeholder={t('inventory:typeHere')}
                className="h-24"
              />
            </div>

            {/* Tracking Number and Shipping Carrier */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('inventory:trackingNumber')}</Label>
                <Input 
                  value={returnData.trackingNumber || ""}
                  placeholder={t('inventory:typeHereNote')}
                  disabled
                />
              </div>
              <div>
                <Label>{t('inventory:shippingCarrier')}</Label>
                <Select
                  value={form.watch("shippingCarrier")}
                  onValueChange={(value) => form.setValue("shippingCarrier", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('inventory:pleaseSelect')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dhl">{t('inventory:dhl')}</SelectItem>
                    <SelectItem value="fedex">{t('inventory:fedex')}</SelectItem>
                    <SelectItem value="ups">{t('inventory:ups')}</SelectItem>
                    <SelectItem value="usps">{t('inventory:usps')}</SelectItem>
                    <SelectItem value="vnpost">{t('inventory:vnPost')}</SelectItem>
                    <SelectItem value="other">{t('inventory:other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Items Returned */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">{t('inventory:itemsReturned')}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('inventory:addItems')}
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                      <div>
                        <Label>{t('inventory:itemName')}</Label>
                        <Popover open={productSearchOpen === index} onOpenChange={(open) => setProductSearchOpen(open ? index : null)}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={productSearchOpen === index}
                              className="w-full justify-between"
                            >
                              {form.watch(`items.${index}.productName`) || t('inventory:selectProduct')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder={t('inventory:searchProduct')} />
                              <CommandEmpty>{t('inventory:noProductFound')}</CommandEmpty>
                              <CommandGroup className="max-h-64 overflow-auto">
                                {products.map((product: any) => (
                                  <CommandItem
                                    key={product.id}
                                    value={product.name}
                                    onSelect={() => handleProductSelect(product.id, index)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        form.watch(`items.${index}.productId`) === product.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {product.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label>{t('inventory:quantityLabel')}</Label>
                        <Input 
                          type="number"
                          {...form.register(`items.${index}.quantity`)}
                          placeholder={t('inventory:quantityPlaceholder')}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="ml-2 mt-6"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div>
                    <Label>{t('inventory:skuLabel')}</Label>
                    <Input
                      {...form.register(`items.${index}.sku`)}
                      placeholder={t('inventory:skuPlaceholder')}
                    />
                  </div>
                </div>
              ))}

              {form.formState.errors.items && (
                <p className="text-sm text-red-500">{form.formState.errors.items.message}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => navigate("/returns")}
              >
                {t('common:cancel')}
              </Button>
              <Button
                type="submit"
                disabled={updateReturnMutation.isPending}
                className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {t('common:saveChanges')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('inventory:areYouSure')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('inventory:deleteThisReturn')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteReturnMutation.mutate()}>
              {t('common:delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}