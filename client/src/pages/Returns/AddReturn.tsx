import { useState, useEffect, useRef } from "react";
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
import { useSettings } from "@/contexts/SettingsContext";
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  X, 
  Search, 
  Package, 
  User, 
  Calendar, 
  FileText, 
  TruckIcon, 
  ShoppingCart,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Clock,
  Euro,
  Scan
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const returnSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  orderId: z.string().optional(),
  returnDate: z.string().min(1, "Return date is required"),
  returnType: z.enum(['exchange', 'refund', 'store_credit']),
  status: z.enum(['awaiting', 'processing', 'completed', 'cancelled']),
  trackingNumber: z.string().optional(),
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
  const { inventorySettings } = useSettings();
  const scanningEnabled = inventorySettings.enableBarcodeScanning ?? true;
  const [returnId, setReturnId] = useState("");
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [orderSearchOpen, setOrderSearchOpen] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Fetch customers
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['/api/customers'],
  });

  // Fetch orders
  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ['/api/orders'],
  });

  // Fetch products
  const productsQuery = useQuery<any[]>({
    queryKey: ['/api/products'],
  });
  const products = productsQuery.data || [];

  const form = useForm<ReturnFormData>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      customerId: "",
      orderId: "",
      returnDate: format(new Date(), 'yyyy-MM-dd'),
      returnType: "refund",
      status: "awaiting",
      trackingNumber: "",
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
  ).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Generate return ID
  const generateReturnId = () => {
    const prefix = '#RET';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  };

  // Set initial return ID
  useEffect(() => {
    setReturnId(generateReturnId());
  }, []);

  // Auto-select order if customer has only one order
  useEffect(() => {
    if (watchCustomerId && customerOrders.length === 1 && !watchOrderId) {
      const order = customerOrders[0];
      form.setValue("orderId", order.id);
      handleOrderSelect(order);
    }
  }, [watchCustomerId, customerOrders.length]);

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
          const order = orders.find((o: any) => o.id === data.orderId);
          if (order) {
            setSelectedOrder(order);
          }
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
          title: "Return Pre-filled",
          description: `Pre-filled return data for order ${data.orderNumber}`,
        });
      } catch (error) {
        console.error('Error parsing return form data:', error);
      }
    }
  }, [orders]);

  const handleOrderSelect = (order: any) => {
    setSelectedOrder(order);
    
    // Auto-populate items from order
    if (order.items && order.items.length > 0) {
      // Clear existing items
      while (fields.length > 0) {
        remove(0);
      }
      
      // Add order items
      order.items.forEach((item: any) => {
        const product = products.find((p: any) => p.id === item.productId);
        append({
          productId: item.productId || '',
          productName: product?.name || item.productName || '',
          sku: product?.sku || item.sku || '',
          quantity: item.quantity || 1,
          price: parseFloat(item.price || product?.sellingPriceEur || "0"),
        });
      });

      toast({
        title: "Items Loaded",
        description: `${order.items.length} items added from order`,
      });
    }
  };

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
    const newIndex = fields.length;
    append({
      productId: "",
      productName: "",
      sku: "",
      quantity: 1,
      price: 0,
    });
    
    // Focus on the Product field (button) after adding the item
    setTimeout(() => {
      const productButton = document.querySelector(`[data-testid="button-product-${newIndex}"]`) as HTMLButtonElement;
      if (productButton) {
        productButton.focus();
      }
    }, 50);
  };

  const handleProductSelect = (productId: string, index: number) => {
    const product = products.find((p: any) => p.id === productId);
    if (product) {
      // Try to get price from selected order items first
      let price = parseFloat(product.sellingPriceEur || "0");
      if (selectedOrder?.items) {
        const orderItem = selectedOrder.items.find((item: any) => item.productId === productId);
        if (orderItem && orderItem.price) {
          price = parseFloat(orderItem.price);
        }
      }
      
      form.setValue(`items.${index}.productId`, product.id);
      form.setValue(`items.${index}.productName`, product.name);
      form.setValue(`items.${index}.sku`, product.sku || "");
      form.setValue(`items.${index}.price`, price);
    }
    setProductSearchOpen(null);
  };

  const playSound = (frequency: number, duration: number) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const handleBarcodeScan = (barcode: string) => {
    // Trim and clean the input
    const cleanBarcode = barcode.trim();
    
    // Handle empty barcodes
    if (!cleanBarcode) {
      return;
    }

    // Check if products are still loading
    if (productsQuery.isLoading) {
      toast({
        title: "Please wait, loading products...",
        description: "Products are still being loaded",
      });
      return;
    }

    // Search for product by barcode or SKU
    const product = products.find((p: any) => 
      p.barcode === cleanBarcode || p.sku === cleanBarcode
    );

    if (product) {
      // Play success sound
      playSound(440, 100);
      
      // Check if product already exists in items
      const existingItemIndex = fields.findIndex((field, idx) => 
        form.watch(`items.${idx}.productId`) === product.id
      );

      if (existingItemIndex >= 0) {
        // Increment quantity if product exists
        const currentQuantity = form.watch(`items.${existingItemIndex}.quantity`) || 0;
        form.setValue(`items.${existingItemIndex}.quantity`, currentQuantity + 1);
        
        toast({
          title: "Product added",
          description: `${product.name} - Quantity: ${currentQuantity + 1}`,
        });
      } else {
        // Try to get price from selected order items first
        let price = parseFloat(product.priceEur || product.sellingPriceEur || "0");
        if (selectedOrder?.items) {
          const orderItem = selectedOrder.items.find((item: any) => item.productId === product.id);
          if (orderItem && orderItem.price) {
            price = parseFloat(orderItem.price);
          }
        }
        
        // Add new item if product doesn't exist
        append({
          productId: product.id,
          productName: product.name,
          sku: product.sku || "",
          quantity: 1,
          price: price,
        });
        
        toast({
          title: "Product added",
          description: product.name,
        });
      }

      // Clear input and keep focus
      setBarcodeInput("");
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 50);
    } else {
      // Play error sound
      playSound(200, 150);
      
      // Product not found
      toast({
        title: "Product not found",
        description: `Product not found with barcode: ${cleanBarcode}`,
        variant: "destructive",
      });
      
      // Clear input and keep focus
      setBarcodeInput("");
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 50);
    }
  };

  const selectedCustomer = customers.find((c: any) => c.id === watchCustomerId);
  
  // Calculate totals
  const returnTotal = fields.reduce((sum, field, index) => {
    const quantity = form.watch(`items.${index}.quantity`) || 0;
    const price = form.watch(`items.${index}.price`) || 0;
    return sum + (quantity * price);
  }, 0);

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'awaiting': return <Clock className="h-4 w-4" />;
      case 'processing': return <AlertCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      default: return <X className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'awaiting': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Returns
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Create Return</h1>
            <p className="text-muted-foreground dark:text-gray-400 mt-1">Process customer returns and refunds</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Return ID</p>
            <p className="text-2xl font-bold text-primary">{returnId}</p>
          </div>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer & Order Selection */}
            <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <User className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                  Customer & Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="customer" className="text-base font-semibold">Customer *</Label>
                  <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={customerSearchOpen}
                        className="w-full justify-between h-11 text-base"
                        data-testid="button-customer-select"
                      >
                        {watchCustomerId
                          ? selectedCustomer?.name
                          : "Select customer..."}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search customer..." data-testid="input-customer-search" />
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {customers.map((customer: any) => (
                            <CommandItem
                              key={customer.id}
                              value={customer.name}
                              onSelect={() => {
                                form.setValue("customerId", customer.id);
                                form.setValue("orderId", ""); // Reset order when customer changes
                                setSelectedOrder(null);
                                setCustomerSearchOpen(false);
                              }}
                              data-testid={`option-customer-${customer.id}`}
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

                <div>
                  <Label htmlFor="order" className="text-base font-semibold">Order Number</Label>
                  <p className="text-sm text-muted-foreground mb-2">Select the original order for this return</p>
                  <Popover open={orderSearchOpen} onOpenChange={setOrderSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={orderSearchOpen}
                        className="w-full justify-between h-11 text-base"
                        disabled={!watchCustomerId || customerOrders.length === 0}
                        data-testid="button-order-select"
                      >
                        {watchOrderId && selectedOrder
                          ? `#${selectedOrder.id.slice(0, 8).toUpperCase()} - ${format(new Date(selectedOrder.createdAt), 'dd/MM/yyyy')}`
                          : customerOrders.length === 0 
                            ? "No orders available"
                            : "Select order..."}
                        <ShoppingCart className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search order..." data-testid="input-order-search" />
                        <CommandEmpty>No order found.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {customerOrders.map((order: any) => (
                            <CommandItem
                              key={order.id}
                              value={order.id}
                              onSelect={() => {
                                form.setValue("orderId", order.id);
                                handleOrderSelect(order);
                                setOrderSearchOpen(false);
                              }}
                              data-testid={`option-order-${order.id}`}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  watchOrderId === order.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">#{order.id.slice(0, 8).toUpperCase()}</span>
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(order.createdAt), 'dd/MM/yyyy')} • €{order.totalPrice?.toFixed(2) || '0.00'}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>

            {/* Return Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-500" />
                  Return Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="returnDate" className="text-base font-semibold">Return Date *</Label>
                    <Input 
                      id="returnDate"
                      type="date"
                      {...form.register("returnDate")}
                      className="h-11"
                      data-testid="input-returnDate"
                    />
                    {form.formState.errors.returnDate && (
                      <p className="text-sm text-red-500 mt-1">{form.formState.errors.returnDate.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="returnType" className="text-base font-semibold">Return Type *</Label>
                    <Select
                      value={form.watch("returnType")}
                      onValueChange={(value) => form.setValue("returnType", value as any)}
                    >
                      <SelectTrigger className="h-11" data-testid="select-returnType">
                        <SelectValue placeholder="Select return type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exchange">Exchange</SelectItem>
                        <SelectItem value="refund">Refund</SelectItem>
                        <SelectItem value="store_credit">Store Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="status" className="text-base font-semibold">Status *</Label>
                  <Select
                    value={form.watch("status")}
                    onValueChange={(value) => form.setValue("status", value as any)}
                  >
                    <SelectTrigger className="h-11" data-testid="select-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="awaiting">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Awaiting
                        </div>
                      </SelectItem>
                      <SelectItem value="processing">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Processing
                        </div>
                      </SelectItem>
                      <SelectItem value="completed">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Completed
                        </div>
                      </SelectItem>
                      <SelectItem value="cancelled">
                        <div className="flex items-center gap-2">
                          <X className="h-4 w-4" />
                          Cancelled
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes" className="text-base font-semibold">Return Reason / Notes</Label>
                  <Textarea 
                    id="notes"
                    {...form.register("notes")}
                    placeholder="Describe the reason for return..."
                    className="min-h-[100px]"
                    data-testid="textarea-notes"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Shipping Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TruckIcon className="h-5 w-5 text-orange-500" />
                  Shipping Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="trackingNumber" className="text-base font-semibold">Tracking Number</Label>
                    <Input 
                      id="trackingNumber"
                      {...form.register("trackingNumber")}
                      placeholder="Enter tracking number"
                      className="h-11"
                      data-testid="input-trackingNumber"
                    />
                  </div>

                  <div>
                    <Label htmlFor="shippingCarrier" className="text-base font-semibold">Shipping Carrier</Label>
                    <Select
                      value={form.watch("shippingCarrier")}
                      onValueChange={(value) => form.setValue("shippingCarrier", value)}
                    >
                      <SelectTrigger className="h-11" data-testid="select-shippingCarrier">
                        <SelectValue placeholder="Select carrier" />
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
              </CardContent>
            </Card>

            {/* Items Returned */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-green-500" />
                    Return Items
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                    data-testid="button-addItem"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Barcode Scanner Section */}
                {scanningEnabled && (
                  <div className="relative">
                    <Input
                      ref={barcodeInputRef}
                      id="barcode-scan"
                      type="text"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleBarcodeScan(barcodeInput);
                        }
                      }}
                      placeholder="Scan barcode or enter SKU..."
                      className="pl-10"
                      disabled={productsQuery.isLoading}
                      data-testid="input-barcode-scan"
                    />
                    <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                )}

                {fields.length === 0 ? (
                  <div className="text-center py-12 bg-muted/50 rounded-lg">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">No items added yet</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddItem}
                      data-testid="button-addFirstItem"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add First Item
                    </Button>
                  </div>
                ) : (
                  <>
                    {fields.map((field, index) => (
                      <div key={field.id} className="border rounded-lg p-4 space-y-4 bg-muted/20">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium">Product *</Label>
                                <Popover open={productSearchOpen === index} onOpenChange={(open) => setProductSearchOpen(open ? index : null)}>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      aria-expanded={productSearchOpen === index}
                                      className="w-full justify-between h-10"
                                      data-testid={`button-product-${index}`}
                                    >
                                      {form.watch(`items.${index}.productName`) || "Select product..."}
                                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-full p-0" align="start">
                                    <Command>
                                      <CommandInput placeholder="Search product..." data-testid={`input-product-search-${index}`} />
                                      <CommandEmpty>No product found.</CommandEmpty>
                                      <CommandGroup className="max-h-64 overflow-auto">
                                        {products.map((product: any) => (
                                          <CommandItem
                                            key={product.id}
                                            value={product.name}
                                            onSelect={() => handleProductSelect(product.id, index)}
                                            data-testid={`option-product-${product.id}-${index}`}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                form.watch(`items.${index}.productId`) === product.id ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            <div className="flex flex-col">
                                              <span>{product.name}</span>
                                              <span className="text-sm text-muted-foreground">{product.sku}</span>
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              </div>

                              <div>
                                <Label className="text-sm font-medium">Quantity *</Label>
                                <Input 
                                  type="number"
                                  min="1"
                                  {...form.register(`items.${index}.quantity`)}
                                  placeholder="1"
                                  className="h-10"
                                  data-testid={`input-quantity-${index}`}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium">SKU</Label>
                                <Input
                                  {...form.register(`items.${index}.sku`)}
                                  placeholder="Product SKU"
                                  className="h-10"
                                  readOnly
                                  data-testid={`input-sku-${index}`}
                                />
                              </div>

                              <div>
                                <Label className="text-sm font-medium">Price (€) *</Label>
                                <Input 
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  {...form.register(`items.${index}.price`)}
                                  placeholder="0.00"
                                  className="h-10"
                                  data-testid={`input-price-${index}`}
                                />
                              </div>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            className="shrink-0"
                            data-testid={`button-remove-${index}`}
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>

                        {/* Item Subtotal */}
                        <div className="flex justify-end pt-2 border-t">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Subtotal: </span>
                            <span className="font-semibold">
                              €{((form.watch(`items.${index}.quantity`) || 0) * (form.watch(`items.${index}.price`) || 0)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {form.formState.errors.items && (
                      <p className="text-sm text-red-500">{form.formState.errors.items.message}</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/returns")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createReturnMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700"
                data-testid="button-submit"
              >
                <Save className="h-4 w-4 mr-2" />
                {createReturnMutation.isPending ? "Creating..." : "Create Return"}
              </Button>
            </div>
          </div>

          {/* Right Column - Order Summary & History */}
          <div className="lg:col-span-1 space-y-6">
            {/* Return Summary */}
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-teal-500" />
                  Return Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Customer</span>
                    <span className="text-sm font-medium">
                      {selectedCustomer?.name || '-'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Order Number</span>
                    <span className="text-sm font-medium">
                      {selectedOrder ? `#${selectedOrder.id.slice(0, 8).toUpperCase()}` : '-'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Return Type</span>
                    <Badge variant="outline" className="capitalize">
                      {form.watch("returnType").replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge className={cn("border", getStatusColor(form.watch("status")))}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(form.watch("status"))}
                        <span className="capitalize">{form.watch("status")}</span>
                      </span>
                    </Badge>
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Items Count</span>
                    <span className="text-sm font-medium">{fields.length}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-base font-semibold">Return Total</span>
                    <span className="text-xl font-bold text-teal-600">
                      <Euro className="h-5 w-5 inline mr-1" />
                      {returnTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Original Order Details */}
            {selectedOrder && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Original Order Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Order Date</span>
                    <span className="text-sm font-medium">
                      {format(new Date(selectedOrder.createdAt), 'dd/MM/yyyy')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Original Total</span>
                    <span className="text-sm font-semibold">
                      €{selectedOrder.totalPrice?.toFixed(2) || '0.00'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Items</span>
                    <span className="text-sm font-medium">
                      {selectedOrder.items?.length || 0}
                    </span>
                  </div>

                  {selectedOrder.paymentStatus && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Payment</span>
                      <Badge variant="outline" className="capitalize text-xs">
                        {selectedOrder.paymentStatus.replace('_', ' ')}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Customer Order History */}
            {watchCustomerId && customerOrders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Customer Order History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {customerOrders.slice(0, 5).map((order: any) => (
                      <div 
                        key={order.id}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-colors",
                          watchOrderId === order.id 
                            ? "bg-primary/10 border-primary" 
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => {
                          form.setValue("orderId", order.id);
                          handleOrderSelect(order);
                        }}
                        data-testid={`order-history-${order.id}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">#{order.id.slice(0, 8).toUpperCase()}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(order.createdAt), 'dd/MM/yyyy')}
                            </p>
                          </div>
                          <p className="text-sm font-semibold">€{order.totalPrice?.toFixed(2) || '0.00'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {customerOrders.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Showing 5 of {customerOrders.length} orders
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
