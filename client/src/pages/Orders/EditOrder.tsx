import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/currencyUtils";
import { ArrowLeft, Save, Plus, Trash2, X } from "lucide-react";
import { Link } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const editOrderSchema = z.object({
  currency: z.enum(['CZK', 'EUR', 'USD', 'VND', 'CNY']),
  priority: z.enum(['low', 'medium', 'high']),
  orderStatus: z.enum(['pending', 'to_fulfill', 'shipped']),
  paymentStatus: z.enum(['pending', 'paid', 'pay_later']),
  discountType: z.enum(['flat', 'rate']).optional(),
  discountValue: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  shippingCost: z.coerce.number().min(0).default(0),
  actualShippingCost: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  discount: number;
  tax: number;
  total: number;
}

export default function EditOrder() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    facebookName: "",
    facebookUrl: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    company: "",
    type: "regular"
  });

  // Fetch order details
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['/api/orders', id],
    enabled: !!id,
  });

  // Order data already includes items from the API

  // Fetch products for selection
  const { data: products } = useQuery({
    queryKey: ['/api/products', 'search', productSearch],
    queryFn: async () => {
      const response = await fetch(`/api/products?search=${encodeURIComponent(productSearch)}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
    enabled: productSearch.length > 0,
  });

  // Fetch customers for selection
  const { data: customers } = useQuery({
    queryKey: ['/api/customers', 'search', customerSearch],
    queryFn: async () => {
      const response = await fetch(`/api/customers?search=${encodeURIComponent(customerSearch)}`);
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json();
    },
    enabled: customerSearch.length > 0,
  });

  const form = useForm<z.infer<typeof editOrderSchema>>({
    resolver: zodResolver(editOrderSchema),
    defaultValues: {
      currency: 'EUR',
      priority: 'medium',
      orderStatus: 'pending',
      paymentStatus: 'pending',
      discountValue: 0,
      taxRate: 0,
      shippingCost: 0,
      actualShippingCost: 0,
    },
  });

  // Update form and state when order data is loaded
  useEffect(() => {
    if (order) {
      form.reset({
        currency: order.currency || 'EUR',
        priority: order.priority || 'medium',
        orderStatus: order.orderStatus || 'pending',
        paymentStatus: order.paymentStatus || 'pending',
        discountType: order.discountType || undefined,
        discountValue: order.discountValue ? parseFloat(order.discountValue) : 0,
        taxRate: order.taxRate ? parseFloat(order.taxRate) : 0,
        shippingCost: order.shippingCost ? parseFloat(order.shippingCost) : 0,
        actualShippingCost: order.actualShippingCost ? parseFloat(order.actualShippingCost) : 0,
        notes: order.notes || '',
      });

      // Set customer if exists
      if (order.customer) {
        setSelectedCustomer(order.customer);
      }
    }
  }, [order, form]);

  // Load order items
  useEffect(() => {
    if (order?.items) {
      setOrderItems(order.items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        price: parseFloat(item.price),
        discount: parseFloat(item.discount),
        tax: parseFloat(item.tax),
        total: parseFloat(item.total),
      })));
    }
  }, [order]);

  // Fetch all products for real-time filtering
  const { data: allProducts } = useQuery({
    queryKey: ['/api/products'],
  });

  // Update product prices when currency changes
  const selectedCurrency = form.watch('currency');
  useEffect(() => {
    if (!selectedCurrency || orderItems.length === 0 || !allProducts) return;

    setOrderItems(items => 
      items.map(item => {
        const product = allProducts.find((p: any) => p.id === item.productId);
        if (!product) return item;

        let newPrice = 0;
        if (selectedCurrency === 'CZK' && product.priceCzk) {
          newPrice = parseFloat(product.priceCzk);
        } else if (selectedCurrency === 'EUR' && product.priceEur) {
          newPrice = parseFloat(product.priceEur);
        } else {
          // Fallback to any available price
          newPrice = parseFloat(product.priceEur || product.priceCzk || '0');
        }

        return {
          ...item,
          productName: item.productName || product.name, // Preserve productName
          sku: item.sku || product.sku, // Preserve sku
          price: newPrice,
          total: item.quantity * newPrice - item.discount
        };
      })
    );
  }, [selectedCurrency, allProducts]);

  const updateOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest('PATCH', `/api/orders/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders', id] });
      toast({
        title: "Success",
        description: "Order updated successfully",
      });
      setLocation('/orders');
    },
    onError: (error) => {
      console.error("Order update error:", error);
      toast({
        title: "Error",
        description: "Failed to update order",
        variant: "destructive",
      });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Success",
        description: "Order deleted successfully",
      });
      setLocation('/orders');
    },
    onError: (error) => {
      console.error("Order delete error:", error);
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive",
      });
    },
  });

  const addProductToOrder = (product: any) => {
    const existingItem = orderItems.find(item => item.productId === product.id);
    
    if (existingItem) {
      setOrderItems(orderItems.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
          : item
      ));
    } else {
      // Get the price based on the selected currency
      const selectedCurrency = form.watch('currency') || 'EUR';
      let productPrice = 0;
      
      if (selectedCurrency === 'CZK' && product.priceCzk) {
        productPrice = parseFloat(product.priceCzk);
      } else if (selectedCurrency === 'EUR' && product.priceEur) {
        productPrice = parseFloat(product.priceEur);
      } else {
        // Fallback to any available price if specific currency price is not available
        productPrice = parseFloat(product.priceEur || product.priceCzk || '0');
      }
      
      const newItem: OrderItem = {
        id: `new-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: 1,
        price: productPrice,
        discount: 0,
        tax: 0,
        total: productPrice,
      };
      setOrderItems([...orderItems, newItem]);
    }
    setProductSearch("");
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setOrderItems(orderItems.filter(item => item.id !== itemId));
    } else {
      setOrderItems(orderItems.map(item => 
        item.id === itemId 
          ? { ...item, quantity, total: quantity * item.price }
          : item
      ));
    }
  };

  const updateItemPrice = (itemId: string, price: number) => {
    setOrderItems(orderItems.map(item => 
      item.id === itemId 
        ? { ...item, price, total: item.quantity * price }
        : item
    ));
  };

  const removeItem = (itemId: string) => {
    setOrderItems(orderItems.filter(item => item.id !== itemId));
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    const taxRate = form.watch('taxRate') || 0;
    return (subtotal * taxRate) / 100;
  };

  const calculateGrandTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const shipping = form.watch('shippingCost') || 0;
    const discountType = form.watch('discountType');
    const discountValue = form.watch('discountValue') || 0;
    
    let discount = 0;
    if (discountType === 'flat') {
      discount = discountValue;
    } else if (discountType === 'rate') {
      discount = (subtotal * discountValue) / 100;
    }
    
    return subtotal + tax + shipping - discount;
  };

  const onSubmit = async (data: z.infer<typeof editOrderSchema>) => {
    if (orderItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the order",
        variant: "destructive",
      });
      return;
    }

    let customerId = selectedCustomer?.id;

    // If new customer, create it first
    if (selectedCustomer && !selectedCustomer.id) {
      try {
        const response = await apiRequest('POST', '/api/customers', selectedCustomer);
        customerId = response.id;
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create customer",
          variant: "destructive",
        });
        return;
      }
    }

    const orderData = {
      ...data,
      customerId,
      subtotal: calculateSubtotal(),
      taxAmount: calculateTax(),
      grandTotal: calculateGrandTotal(),
      items: orderItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount,
        tax: item.tax,
        total: item.total,
      })),
    };

    updateOrderMutation.mutate(orderData);
  };

  if (orderLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading order details...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Order not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Edit Order #{order.orderId}</h1>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Order Information */}
        <Card>
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select value={form.watch('currency')} onValueChange={(value) => form.setValue('currency', value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CZK">CZK</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="VND">VND</SelectItem>
                    <SelectItem value="CNY">CNY</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={form.watch('priority')} onValueChange={(value) => form.setValue('priority', value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="orderStatus">Order Status</Label>
                <Select value={form.watch('orderStatus')} onValueChange={(value) => form.setValue('orderStatus', value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="to_fulfill">To Fulfill</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="paymentStatus">Payment Status</Label>
              <Select value={form.watch('paymentStatus')} onValueChange={(value) => form.setValue('paymentStatus', value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pay_later">Pay Later</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCustomer ? (
              <div className="p-4 border rounded-lg space-y-2">
                <p className="font-medium">{selectedCustomer.name}</p>
                {selectedCustomer.facebookName && (
                  <p className="text-sm text-slate-600">Facebook: {selectedCustomer.facebookName}</p>
                )}
                {selectedCustomer.phone && (
                  <p className="text-sm text-slate-600">Phone: {selectedCustomer.phone}</p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCustomer(null)}
                >
                  Change Customer
                </Button>
              </div>
            ) : (
              <div>
                <Label htmlFor="customerSearch">Search Customer</Label>
                <Input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search by name or Facebook name..."
                />
                {customers && customers.length > 0 && (
                  <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                    {customers.map((customer: any) => (
                      <div
                        key={customer.id}
                        className="p-3 hover:bg-slate-50 cursor-pointer"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setCustomerSearch("");
                        }}
                      >
                        <p className="font-medium">{customer.name}</p>
                        {customer.facebookName && (
                          <p className="text-sm text-slate-600">Facebook: {customer.facebookName}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {customerSearch && customers?.length === 0 && !showNewCustomerForm && (
                  <div className="mt-2 p-4 border rounded-lg bg-slate-50">
                    <p className="text-sm text-slate-600 mb-2">No customers found</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowNewCustomerForm(true);
                        setNewCustomer({ ...newCustomer, name: customerSearch });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Customer
                    </Button>
                  </div>
                )}
                
                {showNewCustomerForm && (
                  <div className="space-y-4 border border-blue-200 bg-blue-50 p-4 rounded-lg mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-blue-900">New Customer Details</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowNewCustomerForm(false);
                          setNewCustomer({
                            name: "",
                            facebookName: "",
                            facebookUrl: "",
                            email: "",
                            phone: "",
                            address: "",
                            city: "",
                            state: "",
                            zipCode: "",
                            country: "",
                            company: "",
                            type: "regular"
                          });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="customerName">Customer Name *</Label>
                        <Input
                          id="customerName"
                          value={newCustomer.name}
                          onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                          placeholder="Type here"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="facebookName">Facebook Name</Label>
                        <Input
                          id="facebookName"
                          value={newCustomer.facebookName}
                          onChange={(e) => setNewCustomer({ ...newCustomer, facebookName: e.target.value })}
                          placeholder="Type here"
                        />
                      </div>
                      <div>
                        <Label htmlFor="facebookUrl">Facebook URL</Label>
                        <Input
                          id="facebookUrl"
                          value={newCustomer.facebookUrl}
                          onChange={(e) => setNewCustomer({ ...newCustomer, facebookUrl: e.target.value })}
                          placeholder="Place URL or Type"
                        />
                      </div>
                    </div>
                    
                    {/* Contact Information */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="customerEmail">Email</Label>
                        <Input
                          id="customerEmail"
                          type="email"
                          value={newCustomer.email}
                          onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                          placeholder="name@example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="customerPhone">Phone</Label>
                        <Input
                          id="customerPhone"
                          value={newCustomer.phone}
                          onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                          placeholder="+1234567890"
                        />
                      </div>
                      <div>
                        <Label htmlFor="customerCompany">Company</Label>
                        <Input
                          id="customerCompany"
                          value={newCustomer.company}
                          onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                          placeholder="Company name"
                        />
                      </div>
                    </div>
                    
                    {/* Address Information */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="shippingAddress">Shipping Address</Label>
                        <Input
                          id="shippingAddress"
                          value={newCustomer.address}
                          onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                          placeholder="Street address"
                        />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            value={newCustomer.city}
                            onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                            placeholder="Type here"
                          />
                        </div>
                        <div>
                          <Label htmlFor="state">State</Label>
                          <Input
                            id="state"
                            value={newCustomer.state}
                            onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })}
                            placeholder="Type here"
                          />
                        </div>
                        <div>
                          <Label htmlFor="zipCode">ZIP Code</Label>
                          <Input
                            id="zipCode"
                            value={newCustomer.zipCode}
                            onChange={(e) => setNewCustomer({ ...newCustomer, zipCode: e.target.value })}
                            placeholder="12345"
                          />
                        </div>
                        <div>
                          <Label htmlFor="country">Country</Label>
                          <Input
                            id="country"
                            value={newCustomer.country}
                            onChange={(e) => setNewCustomer({ ...newCustomer, country: e.target.value })}
                            placeholder="Type here"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Customer Type */}
                    <div>
                      <Label htmlFor="customerType">Customer Type</Label>
                      <Select
                        value={newCustomer.type}
                        onValueChange={(value) => setNewCustomer({ ...newCustomer, type: value })}
                      >
                        <SelectTrigger id="customerType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="regular">Regular</SelectItem>
                          <SelectItem value="vip">VIP</SelectItem>
                          <SelectItem value="wholesale">Wholesale</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button
                      type="button"
                      className="w-full"
                      onClick={() => {
                        if (newCustomer.name) {
                          setSelectedCustomer(newCustomer);
                          setShowNewCustomerForm(false);
                        }
                      }}
                    >
                      Add Customer to Order
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="productSearch">Add Products</Label>
              <Input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products by name or SKU..."
              />
              {products && products.length > 0 && (
                <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                  {products.map((product: any) => (
                    <div
                      key={product.id}
                      className="p-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                      onClick={() => addProductToOrder(product)}
                    >
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-slate-600">SKU: {product.sku}</p>
                      </div>
                      <Button type="button" size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {orderItems.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                            className="w-24"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell>{formatCurrency(item.total, form.watch('currency'))}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
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
            )}
          </CardContent>
        </Card>

        {/* Pricing & Discounts */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing & Discounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="discountType">Discount Type</Label>
                <Select value={form.watch('discountType') || 'none'} onValueChange={(value) => form.setValue('discountType', value === 'none' ? undefined : value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="No discount" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No discount</SelectItem>
                    <SelectItem value="flat">Flat Amount</SelectItem>
                    <SelectItem value="rate">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="discountValue">Discount Value</Label>
                <Input
                  type="number"
                  {...form.register('discountValue')}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  type="number"
                  {...form.register('taxRate')}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shippingCost">Shipping Cost</Label>
                <Input
                  type="number"
                  {...form.register('shippingCost')}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="actualShippingCost">Actual Shipping Cost</Label>
                <Input
                  type="number"
                  {...form.register('actualShippingCost')}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Order Summary */}
            <div className="mt-6 p-4 bg-slate-50 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(calculateSubtotal(), form.watch('currency'))}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>{formatCurrency(calculateTax(), form.watch('currency'))}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping:</span>
                <span>{formatCurrency(form.watch('shippingCost') || 0, form.watch('currency'))}</span>
              </div>
              {form.watch('discountType') && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>
                    -{form.watch('discountType') === 'rate' 
                      ? `${form.watch('discountValue')}%`
                      : formatCurrency(form.watch('discountValue') || 0, form.watch('currency'))}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Grand Total:</span>
                <span>{formatCurrency(calculateGrandTotal(), form.watch('currency'))}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              {...form.register('notes')}
              placeholder="Add any additional notes about this order..."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Order
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the order
                  "{order?.orderId}" and all its items.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteOrderMutation.mutate()}
                  disabled={deleteOrderMutation.isPending}
                >
                  {deleteOrderMutation.isPending ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <div className="flex space-x-4">
            <Link href="/orders">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={updateOrderMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateOrderMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}