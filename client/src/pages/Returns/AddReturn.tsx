import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Save, Plus, X, Search } from "lucide-react";
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

const returnSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  orderId: z.string().optional(),
  returnDate: z.string().min(1, "Return date is required"),
  returnType: z.enum(['exchange', 'refund', 'store_credit']),
  status: z.enum(['awaiting', 'processing', 'completed', 'cancelled']),
  shippingCarrier: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1, "Product is required"),
    productName: z.string().min(1, "Product name is required"),
    sku: z.string().optional(),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
    price: z.coerce.number().min(0, "Price must be positive"),
  })).min(1, "At least one item is required"),
});

type ReturnFormData = z.infer<typeof returnSchema>;

export default function AddReturn() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [returnId, setReturnId] = useState("");
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [orderSearchOpen, setOrderSearchOpen] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState<number | null>(null);

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
      returnDate: format(new Date(), 'yyyy-MM-dd'),
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
  const watchOrderId = form.watch("orderId");

  // Filter orders by selected customer
  const customerOrders = orders.filter((order: any) => 
    order.customerId === watchCustomerId
  );

  // Generate return ID
  const generateReturnId = () => {
    const prefix = '#RET';
    const timestamp = Date.now().toString().slice(-3);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  };

  // Set initial return ID
  useState(() => {
    setReturnId(generateReturnId());
  });

  // Check for pre-filled data from Order Details
  useEffect(() => {
    const returnFormData = sessionStorage.getItem('returnFormData');
    if (returnFormData) {
      try {
        const data = JSON.parse(returnFormData);
        
        // Set form values with pre-filled data
        if (data.customerId) {
          form.setValue('customerId', data.customerId);
        }
        if (data.orderId) {
          form.setValue('orderId', data.orderId);
        }
        if (data.reason) {
          form.setValue('notes', data.reason);
        }
        
        // Add items to the form
        if (data.items && data.items.length > 0) {
          data.items.forEach((item: any) => {
            append({
              productId: item.productId || '',
              productName: item.productName || '',
              sku: item.sku || '',
              quantity: item.quantity || 1,
              price: item.price || 0,
            });
          });
        }
        
        // Clear the session storage after using the data
        sessionStorage.removeItem('returnFormData');
        
        // Show success message
        toast({
          title: "Return Ticket Pre-filled",
          description: `Pre-filled return data for order ${data.orderNumber}`,
        });
      } catch (error) {
        console.error('Error parsing return form data:', error);
      }
    }
  }, []);

  const createReturnMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/returns', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/returns'] });
      toast({
        title: "Success",
        description: "Return created successfully",
      });
      navigate("/returns");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create return",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ReturnFormData) => {
    const submitData = {
      ...data,
      returnId,
      returnDate: new Date(data.returnDate),
    };

    createReturnMutation.mutate(submitData);
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/returns")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Returns
        </Button>
        <h1 className="text-2xl font-bold">Add Return</h1>
        <p className="text-gray-600">Add your return</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="space-y-6 pt-6">
            {/* Return ID and Customer */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Return ID</Label>
                <Input value={returnId} disabled className="bg-gray-50" />
              </div>
              <div>
                <Label>Customer Name</Label>
                <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerSearchOpen}
                      className="w-full justify-between"
                    >
                      {watchCustomerId
                        ? customers.find((customer: any) => customer.id === watchCustomerId)?.name
                        : "Type here"}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search customer..." />
                      <CommandEmpty>No customer found.</CommandEmpty>
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
                                watchCustomerId === customer.id ? "opacity-100" : "opacity-0"
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Order Number</Label>
                <Popover open={orderSearchOpen} onOpenChange={setOrderSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={orderSearchOpen}
                      className="w-full justify-between"
                      disabled={!watchCustomerId || customerOrders.length === 0}
                    >
                      {watchOrderId
                        ? orders.find((order: any) => order.id === watchOrderId)?.id.slice(0, 8).toUpperCase()
                        : "Type here"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search order..." />
                      <CommandEmpty>No order found.</CommandEmpty>
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
                                watchOrderId === order.id ? "opacity-100" : "opacity-0"
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
                <Label>Return Date</Label>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Return Type</Label>
                <Select
                  value={form.watch("returnType")}
                  onValueChange={(value) => form.setValue("returnType", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Please select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exchange">Exchange</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                    <SelectItem value="store_credit">Store Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(value) => form.setValue("status", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Please select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="awaiting">Awaiting</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>Note</Label>
              <Textarea 
                {...form.register("notes")}
                placeholder="Type here..."
                className="h-24"
              />
            </div>

            {/* Tracking Number and Shipping Carrier */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tracking Number</Label>
                <Input 
                  {...form.register("notes")}
                  placeholder="Type here"
                />
              </div>
              <div>
                <Label>Shipping Carrier</Label>
                <Select
                  value={form.watch("shippingCarrier")}
                  onValueChange={(value) => form.setValue("shippingCarrier", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Please select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dhl">DHL</SelectItem>
                    <SelectItem value="fedex">FedEx</SelectItem>
                    <SelectItem value="ups">UPS</SelectItem>
                    <SelectItem value="usps">USPS</SelectItem>
                    <SelectItem value="vnpost">VN Post</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Items Returned */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">Items Returned</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Items
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="grid grid-cols-2 gap-4 flex-1">
                      <div>
                        <Label>Item Name</Label>
                        <Popover open={productSearchOpen === index} onOpenChange={(open) => setProductSearchOpen(open ? index : null)}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={productSearchOpen === index}
                              className="w-full justify-between"
                            >
                              {form.watch(`items.${index}.productName`) || "Type here"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Search product..." />
                              <CommandEmpty>No product found.</CommandEmpty>
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
                        <Label>Quantity</Label>
                        <Input 
                          type="number"
                          {...form.register(`items.${index}.quantity`)}
                          placeholder="Type here"
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
                    <Label>SKU</Label>
                    <Select
                      value={form.watch(`items.${index}.sku`) || ""}
                      onValueChange={(value) => form.setValue(`items.${index}.sku`, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Please select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={form.watch(`items.${index}.sku`) || "default"}>
                          {form.watch(`items.${index}.sku`) || "Default SKU"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}

              {form.formState.errors.items && (
                <p className="text-sm text-red-500">{form.formState.errors.items.message}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/returns")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createReturnMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Save Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}