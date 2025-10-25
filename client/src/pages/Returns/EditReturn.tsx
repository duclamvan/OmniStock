import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

export default function EditReturn() {
  const [, navigate] = useLocation();
  const { id } = useParams();
  const { toast } = useToast();
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
        title: "Success",
        description: "Return updated successfully",
      });
      navigate("/returns");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update return",
        variant: "destructive",
      });
    },
  });

  const deleteReturnMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/returns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/returns'] });
      toast({
        title: "Success",
        description: "Return deleted successfully",
      });
      navigate("/returns");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete return",
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
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!returnData) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center">
          <p className="text-gray-500">Return not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Returns
        </Button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Edit Return</h1>
            <p className="text-gray-600">Update return information</p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="space-y-6 pt-6">
            {/* Return ID and Customer */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Return ID</Label>
                <Input value={returnData.returnId || ""} disabled className="bg-gray-50" />
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
                      {form.watch("customerId")
                        ? customers.find((customer: any) => customer.id === form.watch("customerId"))?.name
                        : "Select customer"}
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
                      disabled={!form.watch("customerId") || customerOrders.length === 0}
                    >
                      {form.watch("orderId")
                        ? orders.find((order: any) => order.id === form.watch("orderId"))?.id.slice(0, 8).toUpperCase()
                        : "Select order"}
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
                    <SelectValue />
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
                    <SelectValue />
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
                  value={returnData.trackingNumber || ""}
                  placeholder="Type here"
                  disabled
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
                              {form.watch(`items.${index}.productName`) || "Select product"}
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
                          placeholder="1"
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
                    <Input
                      {...form.register(`items.${index}.sku`)}
                      placeholder="SKU"
                    />
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
                disabled={updateReturnMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this return. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteReturnMutation.mutate()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}