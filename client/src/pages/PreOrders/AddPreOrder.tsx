import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Save, 
  CalendarIcon,
  ShoppingCart,
  Plus,
  X,
  User,
  Package,
  Search,
  UserPlus
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { insertPreOrderSchema } from "@shared/schema";
import { getCountryFlag } from "@/lib/countries";

const formSchema = insertPreOrderSchema.extend({
  expectedDate: z.date().optional(),
  items: z.array(
    z.object({
      productId: z.string().optional(),
      itemName: z.string().min(1, "Item name is required"),
      itemDescription: z.string().optional(),
      quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
    })
  ).min(1, "At least one item is required"),
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

export default function AddPreOrder() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState<ItemRow[]>([
    { id: crypto.randomUUID(), itemName: "", itemDescription: "", quantity: 1 }
  ]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [productSearchOpen, setProductSearchOpen] = useState<Record<string, boolean>>({});
  const [selectedProducts, setSelectedProducts] = useState<Record<string, any>>({});
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    email: '',
    tel: '',
    country: '',
  });

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

  const { data: customers, isLoading: isLoadingCustomers } = useQuery<any[]>({
    queryKey: ['/api/customers'],
  });

  const { data: products, isLoading: isLoadingProducts } = useQuery<any[]>({
    queryKey: ['/api/products'],
  });

  const { data: preOrders } = useQuery<any[]>({
    queryKey: ['/api/pre-orders'],
  });

  const { data: purchases } = useQuery<any[]>({
    queryKey: ['/api/imports/purchases'],
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/customers', {
        ...data,
        billingFirstName: data.name.split(' ')[0] || data.name,
        billingLastName: data.name.split(' ').slice(1).join(' ') || data.name,
        billingEmail: data.email || '',
        billingTel: data.tel || '',
        country: data.country || '',
      });
    },
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setSelectedCustomer(newCustomer);
      form.setValue('customerId', newCustomer.id);
      setShowNewCustomerDialog(false);
      setNewCustomerData({ name: '', email: '', tel: '', country: '' });
      toast({
        title: "Success",
        description: "Customer created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer",
        variant: "destructive",
      });
    },
  });

  const createPreOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/pre-orders', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pre-orders'] });
      toast({
        title: "Success",
        description: "Pre-order created successfully",
      });
      navigate('/orders/pre-orders');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create pre-order",
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

  // Combine products, pre-order items, and purchase items for autocomplete
  const getAllItems = () => {
    const productItems = (products || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      description: p.description,
      type: 'product' as const,
    }));

    const preOrderItems = (preOrders || []).flatMap((po: any) => 
      (po.items || []).map((item: any) => ({
        id: `preorder-${po.id}-${item.id}`,
        name: item.itemName,
        description: item.itemDescription,
        type: 'preorder' as const,
        preOrderId: po.id,
      }))
    );

    const purchaseItems = (purchases || []).flatMap((purchase: any) =>
      (purchase.items || []).map((item: any) => ({
        id: `purchase-${purchase.id}-${item.id}`,
        name: item.name,
        sku: item.sku,
        description: item.notes,
        type: 'purchase' as const,
        purchaseId: purchase.id,
        supplier: purchase.supplier,
      }))
    );

    return [...productItems, ...preOrderItems, ...purchaseItems];
  };

  const handleProductSelect = (itemId: string, selectedItem: any) => {
    setSelectedProducts(prev => ({ ...prev, [itemId]: selectedItem }));
    setItems(items.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            productId: selectedItem.type === 'product' ? selectedItem.id : undefined,
            itemName: selectedItem.name,
            itemDescription: selectedItem.description || "",
          } 
        : item
    ));
    setProductSearchOpen(prev => ({ ...prev, [itemId]: false }));
  };

  const handleCreateCustomer = () => {
    if (!newCustomerData.name.trim()) {
      toast({
        title: "Error",
        description: "Customer name is required",
        variant: "destructive",
      });
      return;
    }
    createCustomerMutation.mutate(newCustomerData);
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

    await createPreOrderMutation.mutateAsync(preOrderData);
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/orders/pre-orders')}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="heading-add-pre-order">
            Create Pre-Order
          </h1>
          <p className="text-slate-600 mt-1 text-sm md:text-base">
            Add a new customer pre-order
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <User className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer Selector */}
            <div>
              <Label htmlFor="customerId" className="text-sm font-medium text-slate-700">Customer *</Label>
              <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={customerSearchOpen}
                    className="w-full justify-between font-normal h-10 mt-1.5 border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                    data-testid="button-select-customer"
                  >
                    {selectedCustomer ? (
                      <span className="truncate text-slate-900 font-medium">{selectedCustomer.name}</span>
                    ) : (
                      <span className="text-slate-500">Search customers...</span>
                    )}
                    <Search className="ml-2 h-4 w-4 shrink-0 text-slate-500" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Type to search customers..." 
                      data-testid="input-search-customer"
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="text-center py-6">
                          <p className="text-sm text-slate-500 mb-3">No customer found</p>
                          <Button
                            size="sm"
                            onClick={() => {
                              setCustomerSearchOpen(false);
                              setShowNewCustomerDialog(true);
                            }}
                            className="gap-2"
                            data-testid="button-create-customer-empty"
                          >
                            <UserPlus className="h-4 w-4" />
                            Create New Customer
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup heading="Customers">
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
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{getCountryFlag(customer.country || '')}</span>
                              <div className="flex flex-col">
                                <span className="font-medium">{customer.name}</span>
                                {customer.billingEmail && (
                                  <span className="text-xs text-slate-500">{customer.billingEmail}</span>
                                )}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => {
                            setCustomerSearchOpen(false);
                            setShowNewCustomerDialog(true);
                          }}
                          className="border-t bg-slate-50 aria-selected:bg-slate-100"
                          data-testid="button-create-customer"
                        >
                          <div className="flex items-center gap-2 w-full justify-center py-1">
                            <UserPlus className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-blue-600">Create New Customer</span>
                          </div>
                        </CommandItem>
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
              <Label htmlFor="expectedDate" className="text-sm font-medium text-slate-700">
                Expected Arrival Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10 mt-1.5 border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-colors",
                      !form.watch("expectedDate") && "text-slate-500"
                    )}
                    data-testid="button-select-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-slate-600" />
                    {form.watch("expectedDate") ? (
                      <span className="text-slate-900 font-medium">
                        {format(form.watch("expectedDate")!, "EEEE, MMMM d, yyyy")}
                      </span>
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 shadow-lg border-slate-200" align="start">
                  <Calendar
                    mode="single"
                    selected={form.watch("expectedDate")}
                    onSelect={(date) => form.setValue("expectedDate", date)}
                    initialFocus
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    className="rounded-lg"
                    classNames={{
                      day_today: "bg-blue-100 text-blue-900 font-bold border-2 border-blue-500 hover:bg-blue-200",
                      day_selected: "bg-blue-600 text-white hover:bg-blue-700 font-semibold",
                    }}
                    data-testid="calendar-expected-date"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes or special instructions..."
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
              Pre-Order Items
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
                    Item {index + 1}
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
                    Select Existing Item (Optional)
                  </Label>
                  <Popover 
                    open={productSearchOpen[item.id] || false} 
                    onOpenChange={(open) => setProductSearchOpen(prev => ({ ...prev, [item.id]: open }))}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={productSearchOpen[item.id] || false}
                        className="w-full justify-between font-normal"
                        data-testid={`button-select-product-${index}`}
                      >
                        {selectedProducts[item.id] ? (
                          <span className="truncate">
                            {selectedProducts[item.id].name}
                            {selectedProducts[item.id].sku && ` (${selectedProducts[item.id].sku})`}
                            <span className="ml-2 text-xs text-slate-500">
                              {selectedProducts[item.id].type === 'product' ? '📦 Product' : 
                               selectedProducts[item.id].type === 'preorder' ? '🔄 Pre-Order' :
                               '🚚 Supplier'}
                            </span>
                          </span>
                        ) : (
                          "Search products, pre-orders, or supplier items..."
                        )}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Search by name, SKU..." 
                          data-testid={`input-search-product-${index}`}
                        />
                        <CommandList>
                          <CommandEmpty>No items found.</CommandEmpty>
                          <CommandGroup heading="Products">
                            {getAllItems()
                              .filter(i => i.type === 'product')
                              .map((productItem: any) => (
                                <CommandItem
                                  key={productItem.id}
                                  value={`${productItem.name} ${productItem.sku || ''}`}
                                  onSelect={() => handleProductSelect(item.id, productItem)}
                                  data-testid={`option-product-${productItem.id}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span>📦</span>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{productItem.name}</span>
                                      {productItem.sku && (
                                        <span className="text-xs text-slate-500">{productItem.sku}</span>
                                      )}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                          <CommandGroup heading="Pre-Order Items">
                            {getAllItems()
                              .filter(i => i.type === 'preorder')
                              .map((preOrderItem: any) => (
                                <CommandItem
                                  key={preOrderItem.id}
                                  value={preOrderItem.name}
                                  onSelect={() => handleProductSelect(item.id, preOrderItem)}
                                  data-testid={`option-preorder-${preOrderItem.id}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span>🔄</span>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{preOrderItem.name}</span>
                                      {preOrderItem.description && (
                                        <span className="text-xs text-slate-500 truncate max-w-[300px]">
                                          {preOrderItem.description}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                          <CommandGroup heading="Supplier Processing Items">
                            {getAllItems()
                              .filter(i => i.type === 'purchase')
                              .map((purchaseItem: any) => (
                                <CommandItem
                                  key={purchaseItem.id}
                                  value={`${purchaseItem.name} ${purchaseItem.sku || ''}`}
                                  onSelect={() => handleProductSelect(item.id, purchaseItem)}
                                  data-testid={`option-purchase-${purchaseItem.id}`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span>🚚</span>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{purchaseItem.name}</span>
                                      <div className="flex items-center gap-2 text-xs text-slate-500">
                                        {purchaseItem.sku && <span>{purchaseItem.sku}</span>}
                                        {purchaseItem.supplier && (
                                          <>
                                            {purchaseItem.sku && <span>•</span>}
                                            <span>{purchaseItem.supplier}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Item Name */}
                  <div>
                    <Label htmlFor={`itemName-${item.id}`}>
                      Item Name *
                    </Label>
                    <Input
                      id={`itemName-${item.id}`}
                      placeholder="e.g., Blue Widget"
                      value={item.itemName}
                      onChange={(e) => updateItem(item.id, 'itemName', e.target.value)}
                      data-testid={`input-item-name-${index}`}
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <Label htmlFor={`quantity-${item.id}`}>
                      Quantity *
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
                    Item Description
                  </Label>
                  <Input
                    id={`itemDescription-${item.id}`}
                    placeholder="Optional description or specifications"
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
              Add Item
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
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !selectedCustomer || items.length === 0}
            data-testid="button-submit"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? "Creating..." : "Create Pre-Order"}
          </Button>
        </div>
      </form>

      {/* Create New Customer Dialog */}
      <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Create New Customer
            </DialogTitle>
            <DialogDescription>
              Add a new customer to your database. Fill in at least the customer name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="newCustomerName" className="text-sm font-medium">
                Customer Name *
              </Label>
              <Input
                id="newCustomerName"
                placeholder="e.g., John Doe or ABC Company"
                value={newCustomerData.name}
                onChange={(e) => setNewCustomerData(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-new-customer-name"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="newCustomerEmail" className="text-sm font-medium">
                Email (Optional)
              </Label>
              <Input
                id="newCustomerEmail"
                type="email"
                placeholder="e.g., customer@example.com"
                value={newCustomerData.email}
                onChange={(e) => setNewCustomerData(prev => ({ ...prev, email: e.target.value }))}
                data-testid="input-new-customer-email"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="newCustomerTel" className="text-sm font-medium">
                Phone (Optional)
              </Label>
              <Input
                id="newCustomerTel"
                type="tel"
                placeholder="e.g., +420 123 456 789"
                value={newCustomerData.tel}
                onChange={(e) => setNewCustomerData(prev => ({ ...prev, tel: e.target.value }))}
                data-testid="input-new-customer-tel"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="newCustomerCountry" className="text-sm font-medium">
                Country (Optional)
              </Label>
              <Input
                id="newCustomerCountry"
                placeholder="e.g., Czech Republic"
                value={newCustomerData.country}
                onChange={(e) => setNewCustomerData(prev => ({ ...prev, country: e.target.value }))}
                data-testid="input-new-customer-country"
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewCustomerDialog(false);
                setNewCustomerData({ name: '', email: '', tel: '', country: '' });
              }}
              data-testid="button-cancel-customer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCustomer}
              disabled={createCustomerMutation.isPending || !newCustomerData.name.trim()}
              data-testid="button-save-customer"
            >
              {createCustomerMutation.isPending ? (
                <>Creating...</>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Customer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
