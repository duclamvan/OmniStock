import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { calculateShippingCost } from "@/lib/shippingCosts";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Search, 
  Trash2, 
  ShoppingCart, 
  X, 
  CheckCircle,
  ArrowLeft,
  Save,
  User,
  Package,
  Truck,
  CreditCard,
  DollarSign,
  FileText,
  AlertCircle,
  MapPin,
  Phone,
  Mail,
  Building,
  Hash,
  Calculator
} from "lucide-react";

const addOrderSchema = z.object({
  customerId: z.string().optional(),
  currency: z.enum(['CZK', 'EUR', 'USD', 'VND', 'CNY']),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  orderStatus: z.enum(['pending', 'to_fulfill', 'shipped']).default('pending'),
  paymentStatus: z.enum(['pending', 'paid', 'pay_later']).default('pending'),
  shippingMethod: z.enum(['GLS', 'PPL', 'DHL', 'DPD']).optional(),
  paymentMethod: z.enum(['Bank Transfer', 'PayPal', 'COD', 'Cash']).optional(),
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
  
  const [addressAutocomplete, setAddressAutocomplete] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  // Fetch real addresses from geocoding API
  const fetchRealAddresses = async (query: string): Promise<any[]> => {
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch addresses');
      }
      const data = await response.json();
      
      // Transform the response to match our format
      return data.map((item: any) => ({
        formatted: item.formatted,
        street: `${item.street} ${item.houseNumber}`.trim() || item.street,
        city: item.city,
        state: item.state,
        zipCode: item.zipCode,
        country: item.country,
      }));
    } catch (error) {
      console.error('Error fetching addresses:', error);
      return [];
    }
  };

  // Remove the old mock addresses array
  const mockAddressDatabase = [
    // Czech Republic addresses
    { 
      formatted: "Dragounská 2545/9A, 350 02 Cheb, Czechia",
      street: "Dragounská 2545/9A",
      city: "Cheb",
      state: "Karlovarský kraj",
      zipCode: "350 02",
      country: "Czechia"
    },
    { 
      formatted: "Dragounská 150, 350 02 Cheb, Czechia",
      street: "Dragounská 150",
      city: "Cheb",
      state: "Karlovarský kraj",
      zipCode: "350 02",
      country: "Czechia"
    },
    {
      formatted: "Palackého náměstí 2, 301 00 Plzeň, Czechia",
      street: "Palackého náměstí 2",
      city: "Plzeň",
      state: "Plzeňský kraj",
      zipCode: "301 00",
      country: "Czechia"
    },
    {
      formatted: "Wenceslas Square 785/36, 110 00 Praha 1, Czechia",
      street: "Wenceslas Square 785/36",
      city: "Praha 1",
      state: "Praha",
      zipCode: "110 00",
      country: "Czechia"
    },
    {
      formatted: "Václavské náměstí 785/36, 110 00 Praha 1, Czechia",
      street: "Václavské náměstí 785/36",
      city: "Praha 1",
      state: "Praha",
      zipCode: "110 00",
      country: "Czechia"
    },
    {
      formatted: "Karlova 1, 110 00 Praha 1, Czechia",
      street: "Karlova 1",
      city: "Praha 1",
      state: "Praha",
      zipCode: "110 00",
      country: "Czechia"
    },
    {
      formatted: "Nerudova 19, 118 00 Praha 1, Czechia",
      street: "Nerudova 19",
      city: "Praha 1",
      state: "Praha",
      zipCode: "118 00",
      country: "Czechia"
    },
    {
      formatted: "Masarykova 28, 602 00 Brno, Czechia",
      street: "Masarykova 28",
      city: "Brno",
      state: "Jihomoravský kraj",
      zipCode: "602 00",
      country: "Czechia"
    },
    {
      formatted: "Náměstí Svobody 1, 602 00 Brno, Czechia",
      street: "Náměstí Svobody 1",
      city: "Brno",
      state: "Jihomoravský kraj",
      zipCode: "602 00",
      country: "Czechia"
    },
    // Germany addresses
    {
      formatted: "Hans-Bredow-Straße 19, 28307 Bremen, Germany",
      street: "Hans-Bredow-Straße 19",
      city: "Bremen",
      state: "Bremen",
      zipCode: "28307",
      country: "Germany"
    },
    {
      formatted: "Alexanderplatz 1, 10178 Berlin, Germany",
      street: "Alexanderplatz 1",
      city: "Berlin",
      state: "Berlin",
      zipCode: "10178",
      country: "Germany"
    },
    // Austria addresses
    {
      formatted: "Stephansplatz 1, 1010 Wien, Austria",
      street: "Stephansplatz 1",
      city: "Wien",
      state: "Wien",
      zipCode: "1010",
      country: "Austria"
    }
  ];

  // Function to search addresses using real geocoding API
  const searchAddresses = async (query: string) => {
    if (!query || query.length < 3) {
      setAddressSuggestions([]);
      setShowAddressDropdown(false);
      return;
    }

    setIsLoadingAddresses(true);
    setShowAddressDropdown(true);
    
    try {
      const results = await fetchRealAddresses(query);
      setAddressSuggestions(results);
    } catch (error) {
      console.error('Error searching addresses:', error);
      setAddressSuggestions([]);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  // Function to select an address from suggestions
  const selectAddress = (suggestion: any) => {
    setNewCustomer(prev => ({
      ...prev,
      address: suggestion.street,
      city: suggestion.city,
      state: suggestion.state,
      zipCode: suggestion.zipCode,
      country: suggestion.country,
    }));
    setAddressAutocomplete(suggestion.formatted);
    setShowAddressDropdown(false);
    setAddressSuggestions([]);
  };

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

  // Update product prices when currency changes
  const selectedCurrency = form.watch('currency');
  useEffect(() => {
    if (!selectedCurrency || orderItems.length === 0 || !allProducts) return;

    setOrderItems(items => 
      items.map(item => {
        const product = Array.isArray(allProducts) ? allProducts.find((p: any) => p.id === item.productId) : null;
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
          price: newPrice,
          total: item.quantity * newPrice - item.discount
        };
      })
    );
  }, [selectedCurrency, allProducts]);

  // Auto-calculate shipping cost when shipping method or customer country changes
  const watchedShippingMethod = form.watch('shippingMethod');
  const watchedCurrency = form.watch('currency');
  
  useEffect(() => {
    if (!watchedShippingMethod || !selectedCustomer?.country) return;
    
    const calculatedCost = calculateShippingCost(
      watchedShippingMethod,
      selectedCustomer.country,
      watchedCurrency
    );
    
    form.setValue('actualShippingCost', calculatedCost);
    form.setValue('shippingCost', calculatedCost); // Also set shipping cost for display
  }, [watchedShippingMethod, selectedCustomer?.country, watchedCurrency, form]);

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      // Check if we have a selected customer without an ID (new customer)
      if (selectedCustomer && !selectedCustomer.id) {
        console.log('Creating new customer:', selectedCustomer);
        const customerData = {
          name: selectedCustomer.name,
          facebookName: selectedCustomer.facebookName || undefined,
          facebookUrl: selectedCustomer.facebookUrl || undefined,
          email: selectedCustomer.email || undefined,
          phone: selectedCustomer.phone || undefined,
          address: selectedCustomer.address || undefined,
          city: selectedCustomer.city || undefined,
          state: selectedCustomer.state || undefined,
          zipCode: selectedCustomer.zipCode || undefined,
          country: selectedCustomer.country || undefined,
          company: selectedCustomer.company || undefined,
          type: selectedCustomer.type || 'regular',
        };
        console.log('Sending customer data:', customerData);
        const response = await apiRequest('POST', '/api/customers', customerData);
        const customerResponse = await response.json();
        console.log('Customer API response:', customerResponse);
        console.log('New customer created with ID:', customerResponse?.id);
        data.customerId = customerResponse?.id;
      } else if (selectedCustomer?.id) {
        // Use the existing customer's ID
        data.customerId = selectedCustomer.id;
      }
      
      console.log('Creating order with customerId:', data.customerId);
      await apiRequest('POST', '/api/orders', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
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
        id: Math.random().toString(36).substr(2, 9),
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: 1,
        price: productPrice,
        discount: 0,
        tax: 0,
        total: productPrice,
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
    const taxRateValue = form.watch('taxRate');
    const taxRate = typeof taxRateValue === 'string' ? parseFloat(taxRateValue || '0') : (taxRateValue || 0);
    return (subtotal * taxRate) / 100;
  };

  const calculateGrandTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const shippingValue = form.watch('shippingCost');
    const discountValue = form.watch('discountValue');
    const shipping = typeof shippingValue === 'string' ? parseFloat(shippingValue || '0') : (shippingValue || 0);
    const discount = typeof discountValue === 'string' ? parseFloat(discountValue || '0') : (discountValue || 0);
    
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
      // Don't override customerId - it's set in createOrderMutation if a new customer is created
      subtotal: calculateSubtotal().toFixed(2),
      taxAmount: calculateTax().toFixed(2),
      grandTotal: calculateGrandTotal().toFixed(2),
      discountValue: (data.discountValue || 0).toString(),
      taxRate: (data.taxRate || 0).toString(),
      shippingCost: (data.shippingCost || 0).toString(),
      actualShippingCost: (data.actualShippingCost || 0).toString(),
      items: orderItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        price: item.price.toFixed(2),
        discount: item.discount.toFixed(2),
        tax: item.tax.toFixed(2),
        total: item.total.toFixed(2),
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
    <div className="min-h-screen bg-gray-50">
      <div className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
        {/* Header - Mobile Optimized */}
        <div className="bg-white rounded-lg shadow-sm mb-4 lg:mb-6 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/orders")}
                className="w-fit"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Orders</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <div className="hidden sm:block h-6 w-px bg-gray-200" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Create New Order</h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">Add products and configure details</p>
              </div>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-600 w-fit">
              <Plus className="h-3 w-3 mr-1" />
              New Order
            </Badge>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Main Column - Mobile First */}
            <div className="w-full lg:flex-1 space-y-4 lg:space-y-6">
            {/* Order Information - Mobile Optimized */}
            <Card className="shadow-sm">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  Order Information
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">Configure status, payment, and shipping</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="currency">Currency *</Label>
                    <Select value={form.watch('currency')} onValueChange={(value) => form.setValue('currency', value as any)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CZK">CZK - Czech Koruna</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="VND">VND - Vietnamese Dong</SelectItem>
                        <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority Level</Label>
                    <Select value={form.watch('priority')} onValueChange={(value) => form.setValue('priority', value as any)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-gray-500 rounded-full" />
                            Low Priority
                          </div>
                        </SelectItem>
                        <SelectItem value="medium">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                            Medium Priority
                          </div>
                        </SelectItem>
                        <SelectItem value="high">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-red-500 rounded-full" />
                            High Priority
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="orderStatus" className="text-sm">Order Status</Label>
                    <Select value={form.watch('orderStatus')} onValueChange={(value) => form.setValue('orderStatus', value as any)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-orange-500 rounded-full" />
                            Pending
                          </div>
                        </SelectItem>
                        <SelectItem value="to_fulfill">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-blue-500 rounded-full" />
                            To Fulfill
                          </div>
                        </SelectItem>
                        <SelectItem value="shipped">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-green-500 rounded-full" />
                            Shipped
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="paymentStatus" className="text-sm">Payment Status</Label>
                    <Select value={form.watch('paymentStatus')} onValueChange={(value) => form.setValue('paymentStatus', value as any)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                            Pending
                          </div>
                        </SelectItem>
                        <SelectItem value="paid">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-green-500 rounded-full" />
                            Paid
                          </div>
                        </SelectItem>
                        <SelectItem value="pay_later">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-blue-500 rounded-full" />
                            Pay Later
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="shippingMethod" className="text-sm">Shipping Method</Label>
                    <div className="relative mt-1">
                      <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Select value={form.watch('shippingMethod')} onValueChange={(value) => form.setValue('shippingMethod', value as any)}>
                        <SelectTrigger className="pl-10">
                          <SelectValue placeholder="Select shipping method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GLS">GLS Express</SelectItem>
                          <SelectItem value="PPL">PPL Standard</SelectItem>
                          <SelectItem value="DHL">DHL International</SelectItem>
                          <SelectItem value="DPD">DPD Europe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="paymentMethod" className="text-sm">Payment Method</Label>
                    <div className="relative mt-1">
                      <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Select value={form.watch('paymentMethod')} onValueChange={(value) => form.setValue('paymentMethod', value as any)}>
                        <SelectTrigger className="pl-10">
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="PayPal">PayPal</SelectItem>
                          <SelectItem value="COD">Cash on Delivery</SelectItem>
                          <SelectItem value="Cash">Cash Payment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Selection - Mobile Optimized */}
            <Card className="shadow-sm">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  Customer Details
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1">Search and select or create new</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
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
                        // Auto-set payment status to Pay Later if customer has Pay Later badge
                        if (customer.hasPayLaterBadge) {
                          form.setValue('paymentStatus', 'pay_later');
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-slate-900 flex items-center gap-2">
                            {customer.name}
                            {customer.hasPayLaterBadge && (
                              <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-300 text-yellow-700">
                                Pay Later
                              </Badge>
                            )}
                          </div>
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
              
              {/* No results message with Add new customer button */}
              {showCustomerDropdown && customerSearch.length >= 2 && (!filteredCustomers || filteredCustomers.length === 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 border rounded-md bg-white shadow-lg p-4 text-center text-slate-500 z-50">
                  <Search className="h-6 w-6 mx-auto mb-2 text-slate-400" />
                  <div>No customers found for "{customerSearch}"</div>
                  <div className="text-xs mt-1">Try searching by name, email, or Facebook name</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setShowNewCustomerForm(true);
                      setNewCustomer({ ...newCustomer, name: customerSearch });
                      setShowCustomerDropdown(false);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add new customer
                  </Button>
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
                      <div className="font-medium text-green-800 flex items-center gap-2">
                        {selectedCustomer.name}
                        {selectedCustomer.hasPayLaterBadge && (
                          <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-300 text-yellow-700">
                            Pay Later
                          </Badge>
                        )}
                      </div>
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
            
            {/* New customer form */}
            {showNewCustomerForm && (
              <div className="space-y-4 border border-blue-200 bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-blue-900">New Customer Details</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowNewCustomerForm(false);
                      setAddressAutocomplete("");
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
                      onChange={(e) => {
                        const newName = e.target.value;
                        // Update customer name and also mirror to Facebook name if it's empty or matches the previous name
                        setNewCustomer(prev => ({
                          ...prev,
                          name: newName,
                          // Mirror to Facebook name if it's currently empty or was previously mirroring
                          facebookName: prev.facebookName === prev.name || prev.facebookName === "" ? newName : prev.facebookName
                        }));
                      }}
                      placeholder="Type here"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="facebookName">Facebook Name</Label>
                    <Input
                      id="facebookName"
                      value={newCustomer.facebookName || ""}
                      onChange={(e) => {
                        console.log('Facebook Name changed to:', e.target.value);
                        setNewCustomer({ ...newCustomer, facebookName: e.target.value });
                      }}
                      placeholder="Facebook display name"
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
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone">Phone</Label>
                    <Input
                      id="customerPhone"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      placeholder="Type here"
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={newCustomer.company}
                      onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                      placeholder="Type here"
                    />
                  </div>
                </div>
                
                {/* Address Autocomplete */}
                <div className="space-y-2">
                  <Label htmlFor="addressAutocomplete">Address Search (optional)</Label>
                  <div className="relative">
                    <Input
                      id="addressAutocomplete"
                      value={addressAutocomplete}
                      onChange={(e) => {
                        const value = e.target.value;
                        setAddressAutocomplete(value);
                        searchAddresses(value);
                      }}
                      onFocus={() => {
                        if (addressAutocomplete.length >= 3) {
                          searchAddresses(addressAutocomplete);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setShowAddressDropdown(false);
                        }
                      }}
                      placeholder="Start typing an address..."
                      className="pr-10"
                    />
                    {addressAutocomplete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-8 w-8 p-0"
                        onClick={() => {
                          setAddressAutocomplete("");
                          setAddressSuggestions([]);
                          setShowAddressDropdown(false);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {/* Address suggestions dropdown */}
                    {showAddressDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 border rounded-md shadow-lg bg-white max-h-72 overflow-y-auto z-50">
                        {isLoadingAddresses ? (
                          <div className="p-4 text-center text-slate-500">
                            <div className="text-sm">Searching addresses...</div>
                          </div>
                        ) : addressSuggestions.length > 0 ? (
                          <>
                            <div className="p-2 bg-slate-50 border-b text-xs text-slate-600">
                              {addressSuggestions.length} address{addressSuggestions.length !== 1 ? 'es' : ''} found
                            </div>
                            {addressSuggestions.map((suggestion, index) => (
                              <div
                                key={index}
                                className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                                onClick={() => selectAddress(suggestion)}
                              >
                                <div className="font-medium text-slate-900">
                                  {suggestion.formatted}
                                </div>
                              </div>
                            ))}
                          </>
                        ) : (
                          <div className="p-4 text-center text-slate-500">
                            <div className="text-sm">No addresses found</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Search for an official address to auto-fill the fields below
                  </p>
                </div>

                {/* Address Information */}
                <div className="space-y-2">
                  <Label>Shipping Address</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Input
                        id="address"
                        value={newCustomer.address}
                        onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                        placeholder="Full address"
                      />
                    </div>
                    <div>
                      <Input
                        id="city"
                        value={newCustomer.city}
                        onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <Input
                        id="zipCode"
                        value={newCustomer.zipCode}
                        onChange={(e) => setNewCustomer({ ...newCustomer, zipCode: e.target.value })}
                        placeholder="ZIP Code"
                      />
                    </div>

                    <div>
                      <Input
                        id="country"
                        value={newCustomer.country}
                        onChange={(e) => setNewCustomer({ ...newCustomer, country: e.target.value })}
                        placeholder="Country"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Add customer to order button */}
                <Button
                  type="button"
                  className="w-full mt-4"
                  onClick={() => {
                    if (newCustomer.name) {
                      // Set the new customer without an ID - it will be created on save
                      setSelectedCustomer({
                        ...newCustomer,
                        id: undefined // Explicitly set to undefined to trigger creation
                      });
                      setShowNewCustomerForm(false);
                      console.log('New customer selected (no ID yet):', newCustomer);
                    }
                  }}
                >
                  Add Customer to Order
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Selection - Mobile Optimized */}
        <Card className="shadow-sm">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              Add Products
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">Search and add products to order</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
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
                            {(() => {
                              const selectedCurrency = form.watch('currency') || 'EUR';
                              let price = 0;
                              if (selectedCurrency === 'CZK' && product.priceCzk) {
                                price = parseFloat(product.priceCzk);
                              } else if (selectedCurrency === 'EUR' && product.priceEur) {
                                price = parseFloat(product.priceEur);
                              } else {
                                // Fallback to any available price
                                price = parseFloat(product.priceEur || product.priceCzk || '0');
                              }
                              return formatCurrency(price, selectedCurrency);
                            })()}
                          </div>
                          <div className="text-sm text-slate-500">
                            Stock: {product.stockQuantity || 0}
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

        {/* Order Items - Mobile Optimized */}
        <Card className="shadow-sm">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              Order Items
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              {orderItems.length > 0 ? `${orderItems.length} item${orderItems.length !== 1 ? 's' : ''} added` : 'No items yet'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
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

        {/* Payment Details - Mobile Optimized */}
        <Card className="shadow-sm">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              Payment Details
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">Configure pricing and notes</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="discountValue">Discount</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('discountValue', { valueAsNumber: true })}
                />
              </div>

              <div>
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  max="100"
                  {...form.register('taxRate', { valueAsNumber: true })}
                />
              </div>
            </div>

            <Separator className="my-4" />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="shippingCost">Shipping Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('shippingCost', { valueAsNumber: true })}
                />
              </div>

              <div>
                <Label htmlFor="actualShippingCost">Actual Shipping Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('actualShippingCost', { valueAsNumber: true })}
                  className="bg-slate-50"
                  readOnly
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
            </div>
            {/* End of Main Column */}

            {/* Right Column - Mobile First (Bottom on Mobile, Sticky Sidebar on Desktop) */}
            <div className="w-full lg:w-96 order-first lg:order-last">
              <div className="lg:sticky lg:top-20 space-y-4 lg:space-y-6">
                {/* Order Summary */}
                <Card className="shadow-lg overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5 text-blue-600" />
                      Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">{formatCurrency(calculateSubtotal(), form.watch('currency'))}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax ({form.watch('taxRate') || 0}%):</span>
                        <span className="font-medium">{formatCurrency(calculateTax(), form.watch('currency'))}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Shipping:</span>
                        <span className="font-medium">{formatCurrency(Number(form.watch('shippingCost')) || 0, form.watch('currency'))}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-medium text-green-600">-{formatCurrency(Number(form.watch('discountValue')) || 0, form.watch('currency'))}</span>
                      </div>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between">
                        <span className="text-lg font-semibold">Grand Total:</span>
                        <span className="text-lg font-bold text-blue-600">{formatCurrency(calculateGrandTotal(), form.watch('currency'))}</span>
                      </div>
                    </div>
                    
                    <div className="pt-4 space-y-3">
                      <Button type="submit" className="w-full" size="lg" disabled={createOrderMutation.isPending || orderItems.length === 0}>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {createOrderMutation.isPending ? 'Creating...' : 'Create Order'}
                      </Button>
                      <Button type="button" variant="outline" className="w-full" onClick={() => setLocation('/orders')}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600">Quick Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-blue-500" />
                      <span className="text-gray-600">Items:</span>
                      <span className="font-medium">{orderItems.length}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-green-500" />
                      <span className="text-gray-600">Customer:</span>
                      <span className="font-medium flex items-center gap-1">
                        {selectedCustomer ? selectedCustomer.name : 'Not selected'}
                        {selectedCustomer?.hasPayLaterBadge && (
                          <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-300 text-yellow-700 ml-1">
                            Pay Later
                          </Badge>
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            {/* End of Right Column */}
          </div>
        </form>
      </div>
    </div>
  );
}
