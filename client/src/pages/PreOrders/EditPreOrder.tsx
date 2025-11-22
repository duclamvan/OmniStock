import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Save, 
  CalendarIcon,
  Plus,
  X,
  User,
  Package,
  Search,
  Loader2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { insertPreOrderSchema } from "@shared/schema";

// Note: We'll use t() for error messages in the component, not in the schema
// The schema uses English by default and we translate in the form errors display
const formSchema = insertPreOrderSchema.extend({
  expectedDate: z.date().optional(),
  items: z.array(
    z.object({
      productId: z.string().optional(),
      itemName: z.string().min(1),
      itemDescription: z.string().optional(),
      quantity: z.coerce.number().min(1),
    })
  ).min(1),
}).omit({ expectedDate: true }).extend({
  expectedDate: z.date().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ItemRow {
  id: string;
  productId?: string;
  itemName: string;
  itemDescription?: string;
  quantity: number;
}

export default function EditPreOrder() {
  const { t } = useTranslation('orders');
  const { t: tCommon } = useTranslation('common');
  const [, navigate] = useLocation();
  const { id } = useParams();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState<ItemRow[]>([
    { id: crypto.randomUUID(), itemName: "", itemDescription: "", quantity: 1 }
  ]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: '',
      status: 'pending',
      notes: '',
      expectedDate: undefined,
      items: [{ itemName: "", quantity: 1 }],
    },
  });

  // Fetch existing pre-order data
  const { data: preOrder, isLoading: isLoadingPreOrder } = useQuery<any>({
    queryKey: ['/api/pre-orders', id],
    enabled: !!id,
  });

  const { data: customers, isLoading: isLoadingCustomers } = useQuery<any[]>({
    queryKey: ['/api/customers'],
  });

  const { data: products, isLoading: isLoadingProducts } = useQuery<any[]>({
    queryKey: ['/api/products'],
  });

  // Prefill form when pre-order data is loaded
  useEffect(() => {
    if (preOrder && customers) {
      // Set form values
      form.setValue('customerId', preOrder.customerId);
      form.setValue('status', preOrder.status);
      form.setValue('notes', preOrder.notes || '');
      
      if (preOrder.expectedDate) {
        form.setValue('expectedDate', parseISO(preOrder.expectedDate));
      }

      // Find and set the selected customer
      const customer = customers.find((c: any) => c.id === preOrder.customerId);
      if (customer) {
        setSelectedCustomer(customer);
      }

      // Set items
      if (preOrder.items && preOrder.items.length > 0) {
        setItems(preOrder.items.map((item: any) => ({
          id: crypto.randomUUID(), // Generate new IDs for UI state
          productId: item.productId || undefined,
          itemName: item.itemName,
          itemDescription: item.itemDescription || "",
          quantity: item.quantity,
        })));
      }
    }
  }, [preOrder, customers, form]);

  const updatePreOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      // First, update the pre-order
      await apiRequest('PATCH', `/api/pre-orders/${id}`, {
        customerId: data.customerId,
        status: data.status,
        notes: data.notes,
        expectedDate: data.expectedDate,
      });

      // Then, delete all old items
      if (preOrder?.items) {
        await Promise.all(
          preOrder.items.map((item: any) =>
            apiRequest('DELETE', `/api/pre-order-items/${item.id}`)
          )
        );
      }

      // Finally, create new items
      await Promise.all(
        data.items.map((item: any) =>
          apiRequest('POST', '/api/pre-order-items', {
            preOrderId: id,
            productId: item.productId || null,
            itemName: item.itemName,
            itemDescription: item.itemDescription || null,
            quantity: item.quantity,
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pre-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pre-orders', id] });
      toast({
        title: tCommon('success'),
        description: t('preOrderUpdatedSuccess'),
      });
      navigate('/orders/pre-orders');
    },
    onError: (error: any) => {
      toast({
        title: tCommon('error'),
        description: error.message || t('preOrderUpdateFailed'),
        variant: "destructive",
      });
    },
  });

  const addItem = () => {
    setItems([...items, { 
      id: crypto.randomUUID(), 
      itemName: "", 
      itemDescription: "", 
      quantity: 1 
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof ItemRow, value: any) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleProductSelect = (itemId: string, productId: string) => {
    const product = products?.find((p: any) => p.id === productId);
    if (product) {
      setItems(items.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              productId: product.id,
              itemName: product.name,
              itemDescription: product.description || "",
            } 
          : item
      ));
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    const preOrderData = {
      customerId: data.customerId,
      status: data.status,
      notes: data.notes,
      expectedDate: data.expectedDate ? format(data.expectedDate, 'yyyy-MM-dd') : undefined,
      items: items.map(item => ({
        productId: item.productId || null,
        itemName: item.itemName,
        itemDescription: item.itemDescription || null,
        quantity: item.quantity,
      })),
    };

    await updatePreOrderMutation.mutateAsync(preOrderData);
    setIsSubmitting(false);
  };

  if (isLoadingPreOrder) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-state">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-600" />
          <p className="text-slate-600">{t('loadingPreOrder')}</p>
        </div>
      </div>
    );
  }

  if (!preOrder) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <p className="text-slate-600">{t('preOrderNotFound')}</p>
          <Button onClick={() => window.history.back()} data-testid="button-back-not-found">
            {t('goBack')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.back()}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="heading-edit-pre-order">
            {t('editPreOrder')}
          </h1>
          <p className="text-slate-600 mt-1 text-sm md:text-base">
            {t('updatePreOrderDetails')}
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <User className="h-5 w-5" />
              {t('basicInformation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer Selector */}
            <div>
              <Label htmlFor="customerId">{t('customer')} *</Label>
              <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={customerSearchOpen}
                    className="w-full justify-between"
                    data-testid="button-select-customer"
                  >
                    {selectedCustomer ? selectedCustomer.name : t('selectCustomer')}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder={t('searchCustomers')}
                      data-testid="input-search-customer"
                    />
                    <CommandList>
                      <CommandEmpty>{t('noCustomerFound')}</CommandEmpty>
                      <CommandGroup>
                        {customers?.map((customer: any) => (
                          <CommandItem
                            key={customer.id}
                            value={customer.name}
                            onSelect={() => {
                              setSelectedCustomer(customer);
                              form.setValue('customerId', customer.id);
                              setCustomerSearchOpen(false);
                            }}
                            data-testid={`option-customer-${customer.id}`}
                          >
                            {customer.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {form.formState.errors.customerId && (
                <p className="text-sm text-red-500 mt-1" data-testid="error-customer">
                  {form.formState.errors.customerId.message}
                </p>
              )}
            </div>

            {/* Expected Date */}
            <div>
              <Label htmlFor="expectedDate">{t('expectedArrivalDate')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.watch("expectedDate") && "text-muted-foreground"
                    )}
                    data-testid="button-select-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch("expectedDate") ? (
                      format(form.watch("expectedDate")!, "PPP")
                    ) : (
                      <span>{t('pickADate')}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.watch("expectedDate")}
                    onSelect={(date) => form.setValue("expectedDate", date)}
                    initialFocus
                    data-testid="calendar-expected-date"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">{t('notes')}</Label>
              <Textarea
                id="notes"
                placeholder={t('addNotesPlaceholder')}
                rows={3}
                {...form.register("notes")}
                data-testid="textarea-notes"
              />
            </div>
          </CardContent>
        </Card>

        {/* Pre-Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Package className="h-5 w-5" />
              {t('preOrderItems')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div 
                key={item.id} 
                className="p-4 border rounded-lg space-y-3 bg-slate-50 dark:bg-slate-900"
                data-testid={`item-row-${index}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t('item')} {index + 1}
                  </span>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      data-testid={`button-remove-item-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Product Selector (Optional) */}
                <div>
                  <Label htmlFor={`product-${item.id}`} className="text-xs">
                    {t('selectExistingProduct')}
                  </Label>
                  <Select
                    value={item.productId || ""}
                    onValueChange={(value) => handleProductSelect(item.id, value)}
                  >
                    <SelectTrigger data-testid={`select-product-${index}`}>
                      <SelectValue placeholder={t('selectProductManually')} />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((product: any) => (
                        <SelectItem 
                          key={product.id} 
                          value={product.id}
                          data-testid={`option-product-${product.id}`}
                        >
                          {product.name} ({product.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Item Name */}
                  <div>
                    <Label htmlFor={`itemName-${item.id}`}>
                      {t('itemName')} *
                    </Label>
                    <Input
                      id={`itemName-${item.id}`}
                      placeholder={t('exampleBlueWidget')}
                      value={item.itemName}
                      onChange={(e) => updateItem(item.id, 'itemName', e.target.value)}
                      data-testid={`input-item-name-${index}`}
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <Label htmlFor={`quantity-${item.id}`}>
                      {t('quantity')} *
                    </Label>
                    <Input
                      id={`quantity-${item.id}`}
                      type="number"
                      min="1"
                      placeholder="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      data-testid={`input-quantity-${index}`}
                    />
                  </div>
                </div>

                {/* Item Description */}
                <div>
                  <Label htmlFor={`itemDescription-${item.id}`}>
                    {t('itemDescription')}
                  </Label>
                  <Input
                    id={`itemDescription-${item.id}`}
                    placeholder={t('optionalDescription')}
                    value={item.itemDescription || ""}
                    onChange={(e) => updateItem(item.id, 'itemDescription', e.target.value)}
                    data-testid={`input-item-description-${index}`}
                  />
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              className="w-full"
              data-testid="button-add-item"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('addItem')}
            </Button>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/orders/pre-orders')}
            data-testid="button-cancel"
          >
            {tCommon('cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !selectedCustomer || items.length === 0}
            data-testid="button-submit"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? t('updating') : t('updatePreOrder')}
          </Button>
        </div>
      </form>
    </div>
  );
}
