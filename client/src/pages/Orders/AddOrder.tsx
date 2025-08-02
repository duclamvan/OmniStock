import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import { createVietnameseSearchMatcher } from "@/lib/vietnameseSearch";
import { formatCurrency } from "@/lib/currencyUtils";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Plus, Search, Trash2, ShoppingCart, X, CheckCircle } from "lucide-react";

const addOrderSchema = z.object({
  customerId: z.string().optional(),
  currency: z.enum(['CZK', 'EUR', 'USD', 'VND', 'CNY']),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  orderStatus: z.enum(['pending', 'to_fulfill', 'shipped']).default('pending'),
  paymentStatus: z.enum(['pending', 'paid', 'pay_later']).default('pending'),
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

export default function AddOrder() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState("");

  const form = useForm<z.infer<typeof addOrderSchema>>({
    resolver: zodResolver(addOrderSchema),
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

  // Debounce search inputs for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedProductSearch(productSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCustomerSearch(customerSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // Show/hide dropdowns based on search input
  useEffect(() => {
    setShowProductDropdown(productSearch.length >= 2);
  }, [productSearch]);

  useEffect(() => {
    setShowCustomerDropdown(customerSearch.length >= 2 && !selectedCustomer);
  }, [customerSearch, selectedCustomer]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.customer-search-container')) {
        setShowCustomerDropdown(false);
      }
      if (!target.closest('.product-search-container')) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch all products for real-time filtering
  const { data: allProducts } = useQuery({
    queryKey: ['/api/products'],
  });

  // Fetch all customers for real-time filtering
  const { data: allCustomers } = useQuery({
    queryKey: ['/api/customers'],
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest('POST', '/api/orders', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Success",
        description: "Order created successfully",
      });
      setLocation('/orders');
    },
    onError: (error) => {
      console.error("Order creation error:", error);
      toast({
        title: "Error",
        description: "Failed to create order",
        variant: "destructive",
      });
    },
  });

  const addProductToOrder = (product: any) => {
    const existingItem = orderItems.find(item => item.productId === product.id);
    
    if (existingItem) {
      setOrderItems(items =>
        items.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
            : item
        )
      );
    } else {
      const newItem: OrderItem = {
        id: Math.random().toString(36).substr(2, 9),
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: 1,
        price: parseFloat(product.sellingPrice || product.retailPrice || '0'),
        discount: 0,
        tax: 0,
        total: parseFloat(product.sellingPrice || product.retailPrice || '0'),
      };
      setOrderItems(items => [...items, newItem]);
    }
    setProductSearch("");
    setShowProductDropdown(false);
  };

  const updateOrderItem = (id: string, field: keyof OrderItem, value: any) => {
    setOrderItems(items =>
      items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'price' || field === 'discount') {
            updatedItem.total = (updatedItem.quantity * updatedItem.price) - updatedItem.discount;
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  const removeOrderItem = (id: string) => {
    setOrderItems(items => items.filter(item => item.id !== id));
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    return (subtotal * form.watch('taxRate')) / 100;
  };

  const calculateGrandTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const shipping = form.watch('shippingCost') || 0;
    const discount = form.watch('discountValue') || 0;
    
    return subtotal + tax + shipping - discount;
  };

  const onSubmit = (data: z.infer<typeof addOrderSchema>) => {
    if (orderItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the order",
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      ...data,
      customerId: selectedCustomer?.id,
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

    createOrderMutation.mutate(orderData);
  };

  // Filter products with Vietnamese search (memoized for performance)
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(allProducts) || !debouncedProductSearch || debouncedProductSearch.length < 2) return [];
    
    const matcher = createVietnameseSearchMatcher(debouncedProductSearch);
    
    return allProducts
      .filter((product: any) => {
        return matcher(product.name) || 
               matcher(product.sku) || 
               matcher(product.description || '') ||
               matcher(product.categoryName || '');
      })
      .slice(0, 8); // Limit to 8 results for better UX
  }, [allProducts, debouncedProductSearch]);

  // Filter customers with Vietnamese search (memoized for performance)
  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(allCustomers) || !debouncedCustomerSearch || debouncedCustomerSearch.length < 2) return [];
    
    const matcher = createVietnameseSearchMatcher(debouncedCustomerSearch);
    
    return allCustomers
      .filter((customer: any) => {
        return matcher(customer.name) || 
               matcher(customer.facebookName || '') || 
               matcher(customer.email || '') ||
               matcher(customer.phone || '');
      })
      .slice(0, 8); // Limit to 8 results for better UX
  }, [allCustomers, debouncedCustomerSearch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Add New Order</h1>
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
          </CardContent>
        </Card>

        {/* Customer Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative customer-search-container">
              <Label htmlFor="customer">Search Customer</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Type to search customers (Vietnamese diacritics supported)..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-10"
                  onFocus={() => setShowCustomerDropdown(customerSearch.length >= 2 && !selectedCustomer)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowCustomerDropdown(false);
                    }
                  }}
                />
                {selectedCustomer && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearch("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {/* Real-time dropdown for customers */}
              {showCustomerDropdown && filteredCustomers && filteredCustomers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 border rounded-md shadow-lg bg-white max-h-60 overflow-y-auto z-50">
                  <div className="p-2 bg-slate-50 border-b text-xs text-slate-600">
                    {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} found
                  </div>
                  {filteredCustomers.map((customer: any) => (
                    <div
                      key={customer.id}
                      className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setCustomerSearch(customer.name);
                        setShowCustomerDropdown(false);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-slate-900">{customer.name}</div>
                          <div className="text-sm text-slate-500">{customer.email}</div>
                          {customer.facebookName && (
                            <div className="text-xs text-blue-600">FB: {customer.facebookName}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500">{customer.phone}</div>
                          <div className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 mt-1">
                            {customer.type}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* No results message */}
              {showCustomerDropdown && customerSearch.length >= 2 && (!filteredCustomers || filteredCustomers.length === 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 border rounded-md bg-white shadow-lg p-4 text-center text-slate-500 z-50">
                  <Search className="h-6 w-6 mx-auto mb-2 text-slate-400" />
                  <div>No customers found for "{customerSearch}"</div>
                  <div className="text-xs mt-1">Try searching by name, email, or Facebook name</div>
                </div>
              )}
            </div>
            
            {/* Selected customer display */}
            {selectedCustomer && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium text-green-800">{selectedCustomer.name}</div>
                      <div className="text-sm text-green-600">{selectedCustomer.email}</div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearch("");
                    }}
                  >
                    Change
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Add Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative product-search-container">
              <Label htmlFor="product">Search Products</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Type to search products (Vietnamese diacritics supported)..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-10"
                  onFocus={() => setShowProductDropdown(productSearch.length >= 2)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowProductDropdown(false);
                    }
                  }}
                />
                {productSearch && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={() => {
                      setProductSearch("");
                      setShowProductDropdown(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {/* Real-time dropdown for products */}
              {showProductDropdown && filteredProducts && filteredProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 border rounded-md shadow-lg bg-white max-h-72 overflow-y-auto z-50">
                  <div className="p-2 bg-slate-50 border-b text-xs text-slate-600">
                    {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found - Click to add
                  </div>
                  {filteredProducts.map((product: any) => (
                    <div
                      key={product.id}
                      className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                      onClick={() => addProductToOrder(product)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-slate-900">{product.name}</div>
                          <div className="text-sm text-slate-500">SKU: {product.sku}</div>
                          {product.categoryName && (
                            <div className="text-xs text-blue-600">{product.categoryName}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-slate-900">
                            {formatCurrency(parseFloat(product.sellingPrice || product.retailPrice || '0'), product.currency || 'EUR')}
                          </div>
                          <div className="text-sm text-slate-500">
                            Stock: {product.stockQuantity || product.currentStock || 0}
                          </div>
                          {product.warehouseName && (
                            <div className="text-xs text-slate-400">{product.warehouseName}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* No results message */}
              {showProductDropdown && productSearch.length >= 2 && (!filteredProducts || filteredProducts.length === 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 border rounded-md bg-white shadow-lg p-4 text-center text-slate-500 z-50">
                  <Search className="h-6 w-6 mx-auto mb-2 text-slate-400" />
                  <div>No products found for "{productSearch}"</div>
                  <div className="text-xs mt-1">Try searching by name, SKU, or category</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            {orderItems.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateOrderItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => updateOrderItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.discount}
                            onChange={(e) => updateOrderItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          {formatCurrency(item.total, form.watch('currency'))}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOrderItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <ShoppingCart className="mx-auto h-12 w-12 mb-4" />
                <p>No items added to order yet.</p>
                <p className="text-sm">Search and select products above to add them.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Details */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div>
                <Label htmlFor="discountValue">Discount</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('discountValue')}
                />
              </div>

              <div>
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  max="100"
                  {...form.register('taxRate')}
                />
              </div>

              <div>
                <Label htmlFor="shippingCost">Shipping Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('shippingCost')}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                {...form.register('notes')}
                placeholder="Additional order notes..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(calculateSubtotal(), form.watch('currency'))}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax ({form.watch('taxRate')}%):</span>
              <span>{formatCurrency(calculateTax(), form.watch('currency'))}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping:</span>
              <span>{formatCurrency(form.watch('shippingCost') || 0, form.watch('currency'))}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount:</span>
              <span>-{formatCurrency(form.watch('discountValue') || 0, form.watch('currency'))}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between font-bold text-lg">
                <span>Grand Total:</span>
                <span>{formatCurrency(calculateGrandTotal(), form.watch('currency'))}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => setLocation('/orders')}>
            Cancel
          </Button>
          <Button type="submit" disabled={createOrderMutation.isPending || orderItems.length === 0}>
            {createOrderMutation.isPending ? 'Creating...' : 'Create Order'}
          </Button>
        </div>
      </form>
    </div>
  );
}
