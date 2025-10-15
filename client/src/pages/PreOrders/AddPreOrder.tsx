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
  ArrowLeft, 
  Save, 
  CalendarIcon,
  ShoppingCart,
  Plus,
  X,
  User,
  Package,
  Search
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
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { insertPreOrderSchema } from "@shared/schema";

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

// Date preset options
const getDatePresets = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  // If we're in December, "End of December" = Dec 31 this year, otherwise next year
  const endOfDecYear = currentMonth === 11 ? currentYear : currentYear;
  
  return [
    { label: "Tomorrow", value: "tomorrow", date: addDays(today, 1) },
    { label: "In 2 days", value: "2days", date: addDays(today, 2) },
    { label: "In 3 days", value: "3days", date: addDays(today, 3) },
    { label: "In 4 days", value: "4days", date: addDays(today, 4) },
    { label: "In 5 days", value: "5days", date: addDays(today, 5) },
    { label: "Next week", value: "nextweek", date: addWeeks(today, 1) },
    { label: "In two weeks", value: "2weeks", date: addWeeks(today, 2) },
    { label: "Next month", value: "nextmonth", date: addMonths(today, 1) },
    { label: "End of December", value: "endofdec", date: new Date(endOfDecYear, 11, 31) },
  ];
};

export default function AddPreOrder() {
  const [, navigate] = useLocation();
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

  const { data: customers, isLoading: isLoadingCustomers } = useQuery<any[]>({
    queryKey: ['/api/customers'],
  });

  const { data: products, isLoading: isLoadingProducts } = useQuery<any[]>({
    queryKey: ['/api/products'],
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
              <Label htmlFor="customerId">Customer *</Label>
              <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={customerSearchOpen}
                    className="w-full justify-between"
                    data-testid="button-select-customer"
                  >
                    {selectedCustomer ? selectedCustomer.name : "Select customer..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Search customers..." 
                      data-testid="input-search-customer"
                    />
                    <CommandList>
                      <CommandEmpty>No customer found.</CommandEmpty>
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
              <Label htmlFor="expectedDate">Expected Arrival Date</Label>
              <Select
                value={form.watch("expectedDate") ? "custom" : ""}
                onValueChange={(value) => {
                  const preset = getDatePresets().find(p => p.value === value);
                  if (preset) {
                    form.setValue("expectedDate", preset.date);
                  }
                }}
              >
                <SelectTrigger 
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !form.watch("expectedDate") && "text-muted-foreground"
                  )}
                  data-testid="select-expected-date"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <SelectValue>
                    {form.watch("expectedDate") ? (
                      format(form.watch("expectedDate")!, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {getDatePresets().map((preset) => (
                    <SelectItem 
                      key={preset.value} 
                      value={preset.value}
                      data-testid={`option-date-${preset.value}`}
                    >
                      {preset.label} ({format(preset.date, "MMM d, yyyy")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    Select Existing Product (Optional)
                  </Label>
                  <Select
                    value={item.productId || ""}
                    onValueChange={(value) => handleProductSelect(item.id, value)}
                  >
                    <SelectTrigger data-testid={`select-product-${index}`}>
                      <SelectValue placeholder="Select a product or enter manually below" />
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
    </div>
  );
}
