import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ShoppingCart, 
  Printer, 
  Plus, 
  Minus, 
  Trash2, 
  Star,
  Package,
  Search,
  CreditCard,
  Banknote,
  Building,
  Calendar,
  X,
  TrendingUp,
  AlertTriangle,
  Zap,
  Clock,
  Users,
  Receipt,
  Calculator,
  Settings,
  Grid3X3,
  Filter,
  Scan,
  Heart,
  Tag,
  ShoppingBag,
  CheckCircle2,
  ArrowRight,
  Euro,
  DollarSign
} from 'lucide-react';
import MarginPill from '@/components/orders/MarginPill';
import { format } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Product } from '@shared/schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  bundleId?: string;
  name: string;
  price: number;
  quantity: number;
  type: 'product' | 'variant' | 'bundle';
  sku?: string;
  landingCost?: number | null;
}

export default function POS() {
  const { toast } = useToast();
  const [currency, setCurrency] = useState<'EUR' | 'CZK'>('EUR');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'pay_later' | 'bank_transfer'>('cash');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');
  const [selectedTab, setSelectedTab] = useState('favorites');
  const [isProcessing, setIsProcessing] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get today's date
  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch products with landing costs
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products', { includeLandingCost: true }],
    queryFn: async () => {
      const response = await fetch('/api/products?includeLandingCost=true');
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  // Fetch bundles
  const { data: bundles = [] } = useQuery<Product[]>({
    queryKey: ['/api/bundles']
  });

  // Get unique categories from products
  const categories = ['all', ...Array.from(new Set(products.map(p => p.categoryId).filter(Boolean)))]; 

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get favorite products (for demo, using first 6 products)
  const favoriteProducts = products.slice(0, 6);

  // Add item to cart
  const addToCart = (item: { 
    id: string; 
    name: string; 
    price: number; 
    type: 'product' | 'bundle';
    sku?: string;
    landingCost?: number | null;
    latestLandingCost?: number | null;
  }) => {
    const priceInCurrency = currency === 'EUR' 
      ? parseFloat(item.price?.toString() || '0')
      : parseFloat(item.price?.toString() || '0');

    const existingItem = cart.find(cartItem => 
      cartItem.id === item.id && cartItem.type === item.type
    );

    if (existingItem) {
      updateQuantity(existingItem.id, existingItem.quantity + 1);
    } else {
      setCart([...cart, {
        id: item.id,
        productId: item.id,
        name: item.name,
        price: priceInCurrency,
        quantity: 1,
        type: item.type,
        sku: item.sku,
        landingCost: item.landingCost || item.latestLandingCost || null
      }]);
    }
  };

  // Update quantity
  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
    } else {
      setCart(cart.map(item => 
        item.id === id ? { ...item, quantity } : item
      ));
    }
  };

  // Remove from cart
  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.21; // 21% VAT
  const total = subtotal + tax;

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const orderData = {
        customerId: 'walk-in-customer',
        customerName: 'Walk-in Customer',
        orderDate: today,
        currency: currency,
        items: cart.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          bundleId: item.bundleId,
          quantity: item.quantity,
          price: item.price,
          productName: item.name
        })),
        subtotal: subtotal,
        tax: tax,
        total: total,
        paymentMethod: paymentMethod,
        paymentStatus: paymentMethod === 'cash' ? 'paid' : 'pending',
        orderStatus: 'completed',
        notes: `POS Sale - ${format(new Date(), 'PPp')}`
      };
      
      return await apiRequest('POST', '/api/orders', orderData);
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Order Created',
        description: `Order #${data.orderId || data.id} has been created successfully`
      });
      printReceipt();
      setCart([]);
      setShowPaymentDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create order',
        variant: 'destructive'
      });
    }
  });

  // Print receipt
  const printReceipt = () => {
    if (!receiptRef.current) return;

    const printWindow = window.open('', '', 'width=300,height=600');
    if (!printWindow) return;

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt</title>
        <style>
          @media print {
            @page { 
              size: 80mm auto;
              margin: 0;
            }
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.3;
            margin: 0;
            padding: 10px;
            width: 280px;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .company-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .receipt-info {
            margin: 10px 0;
          }
          .items {
            margin: 10px 0;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .item {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          .item-name {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 150px;
          }
          .totals {
            margin: 10px 0;
          }
          .total-line {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .grand-total {
            font-weight: bold;
            font-size: 14px;
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px dashed #000;
            font-size: 11px;
          }
          .barcode {
            text-align: center;
            margin: 10px 0;
            font-family: 'Libre Barcode 128', monospace;
            font-size: 32px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">DAVIE SUPPLY</div>
          <div>Your Warehouse Partner</div>
        </div>
        
        <div class="receipt-info">
          <div>Date: ${format(new Date(), 'dd/MM/yyyy')}</div>
          <div>Time: ${format(new Date(), 'HH:mm:ss')}</div>
          <div>Receipt #: ${Math.random().toString(36).substr(2, 9).toUpperCase()}</div>
        </div>
        
        <div class="items">
          <div style="font-weight: bold; margin-bottom: 5px;">ITEMS:</div>
          ${cart.map(item => `
            <div class="item">
              <span class="item-name">${item.name}</span>
              <span>${item.quantity} x ${currency} ${item.price.toFixed(2)}</span>
            </div>
            <div style="text-align: right; font-size: 11px; margin-bottom: 5px;">
              = ${currency} ${(item.price * item.quantity).toFixed(2)}
            </div>
          `).join('')}
        </div>
        
        <div class="totals">
          <div class="total-line">
            <span>Subtotal:</span>
            <span>${currency} ${subtotal.toFixed(2)}</span>
          </div>
          <div class="total-line">
            <span>VAT (21%):</span>
            <span>${currency} ${tax.toFixed(2)}</span>
          </div>
          <div class="total-line grand-total">
            <span>TOTAL:</span>
            <span>${currency} ${total.toFixed(2)}</span>
          </div>
          ${paymentMethod === 'cash' && amountReceived ? `
          <div class="total-line">
            <span>Received:</span>
            <span>${currency} ${parseFloat(amountReceived).toFixed(2)}</span>
          </div>
          <div class="total-line">
            <span>Change:</span>
            <span>${currency} ${(parseFloat(amountReceived) - total).toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="total-line" style="margin-top: 10px;">
            <span>Payment:</span>
            <span>${paymentMethod === 'cash' ? 'CASH' : paymentMethod === 'bank_transfer' ? 'BANK' : 'PAY LATER'}</span>
          </div>
        </div>
        
        <div class="footer">
          <div>Thank you for your purchase!</div>
          <div>www.daviesupply.com</div>
          <div style="margin-top: 10px;">* * * * *</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Handle checkout
  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: 'Cart Empty',
        description: 'Please add items to cart before checkout',
        variant: 'destructive'
      });
      return;
    }
    
    if (paymentMethod === 'cash') {
      setShowPaymentDialog(true);
    } else {
      createOrderMutation.mutate();
    }
  };

  // Process cash payment
  const processCashPayment = () => {
    if (paymentMethod === 'cash' && parseFloat(amountReceived) < total) {
      toast({
        title: 'Insufficient Amount',
        description: 'Amount received is less than total',
        variant: 'destructive'
      });
      return;
    }
    createOrderMutation.mutate();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Focus search on Ctrl+K or F3
      if ((e.ctrlKey && e.key === 'k') || e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Quick clear cart on Ctrl+Delete
      if (e.ctrlKey && e.key === 'Delete') {
        e.preventDefault();
        setCart([]);
      }
      // Quick checkout on F12
      if (e.key === 'F12') {
        e.preventDefault();
        if (cart.length > 0) handleCheckout();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cart, handleCheckout]);

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Modern Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Point of Sale</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Fast & Professional</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Currency Selector */}
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-slate-500" />
              <Select value={currency} onValueChange={(v) => setCurrency(v as 'EUR' | 'CZK')}>
                <SelectTrigger className="w-20 h-8" data-testid="select-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR" data-testid="currency-eur">EUR</SelectItem>
                  <SelectItem value="CZK" data-testid="currency-czk">CZK</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date & Time */}
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(), 'MMM dd, yyyy')}</span>
              <span className="text-slate-300">•</span>
              <Clock className="h-4 w-4" />
              <span>{format(new Date(), 'HH:mm')}</span>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8"
                onClick={() => setCart([])}
                disabled={cart.length === 0}
                data-testid="button-clear-cart"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8"
                data-testid="button-settings"
              >
                <Settings className="h-3 w-3 mr-1" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Panel Layout */}
      <div className="flex h-[calc(100vh-81px)]">
        {/* Left Panel - Quick Search & Navigation */}
        <div className="hidden lg:flex w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            {/* Enhanced Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                ref={searchInputRef}
                placeholder="Search products... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 h-10 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                data-testid="input-search"
              />
              {searchQuery && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-slate-100"
                  onClick={() => setSearchQuery('')}
                  data-testid="button-clear-search"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Quick Action Buttons */}
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Button 
                size="sm" 
                variant="outline" 
                className="justify-start h-9"
                onClick={() => setSelectedTab('favorites')}
                data-testid="quick-favorites"
              >
                <Star className="h-4 w-4 mr-2" />
                Favorites
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="justify-start h-9"
                onClick={() => setSelectedTab('categories')}
                data-testid="quick-categories"
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                Categories
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="justify-start h-9"
                onClick={() => setSelectedTab('bundles')}
                data-testid="quick-bundles"
              >
                <Package className="h-4 w-4 mr-2" />
                Bundles
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="justify-start h-9"
                data-testid="quick-scan"
              >
                <Scan className="h-4 w-4 mr-2" />
                Scan
              </Button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="px-4 pb-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Filter by Category</p>
            <ScrollArea className="h-40">
              <div className="space-y-1">
                {categories.map(category => (
                  <Button
                    key={category}
                    size="sm"
                    variant={selectedCategory === category ? 'default' : 'ghost'}
                    className="w-full justify-start h-8"
                    onClick={() => setSelectedCategory(category || 'all')}
                    data-testid={`filter-category-${category}`}
                  >
                    <Filter className="h-3 w-3 mr-2" />
                    {category === 'all' ? 'All Products' : category || 'Uncategorized'}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Quick Stats */}
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 mt-auto">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Products</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{products.length}</p>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Cart Items</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{cart.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Center Panel - Product Selection */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-800/50">
          {/* Product View Tabs */}
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-3 bg-slate-100 dark:bg-slate-800">
                <TabsTrigger value="favorites" className="flex items-center gap-2" data-testid="tab-favorites">
                  <Heart className="h-4 w-4" />
                  <span className="hidden sm:inline">Favorites</span>
                </TabsTrigger>
                <TabsTrigger value="categories" className="flex items-center gap-2" data-testid="tab-categories">
                  <Tag className="h-4 w-4" />
                  <span className="hidden sm:inline">Products</span>
                </TabsTrigger>
                <TabsTrigger value="bundles" className="flex items-center gap-2" data-testid="tab-bundles">
                  <ShoppingBag className="h-4 w-4" />
                  <span className="hidden sm:inline">Bundles</span>
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-6">
                <TabsContent value="favorites" className="mt-0 px-6 pb-6">
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {favoriteProducts.map(product => {
                      const price = currency === 'EUR' 
                        ? parseFloat(product.priceEur || '0')
                        : parseFloat(product.priceCzk || '0');
                      
                      return (
                        <Card 
                          key={product.id} 
                          className="group cursor-pointer border-2 border-transparent hover:border-blue-200 hover:shadow-lg transition-all duration-200 bg-white dark:bg-slate-900"
                          onClick={() => addToCart({
                            id: product.id,
                            name: product.name,
                            price: price,
                            type: 'product',
                            sku: product.sku,
                            landingCost: product.latestLandingCost
                          })}
                          data-testid={`product-card-${product.id}`}
                        >
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                <Star className="mr-1 h-3 w-3" />
                                Favorite
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart({
                                    id: product.id,
                                    name: product.name,
                                    price: price,
                                    type: 'product',
                                    sku: product.sku,
                                    landingCost: product.latestLandingCost
                                  });
                                }}
                                data-testid={`quick-add-${product.id}`}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <h3 className="font-semibold text-base mb-2 line-clamp-2 text-slate-900 dark:text-slate-100">{product.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{product.sku || 'No SKU'}</p>
                            
                            <div className="flex items-center justify-between">
                              <div className="text-right">
                                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                  {currency} {price.toFixed(2)}
                                </p>
                                {product.latestLandingCost && (
                                  <MarginPill
                                    sellingPrice={price}
                                    landingCost={product.latestLandingCost}
                                    currency={currency}
                                    showProfit={false}
                                    className="text-xs mt-1"
                                  />
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>

            <TabsContent value="categories" className="mt-0">
              <div className="space-y-4">
                {/* Category Filter */}
                <div className="flex gap-2 flex-wrap">
                  {categories.map(category => (
                    <Button
                      key={category}
                      size="sm"
                      variant={selectedCategory === category ? 'default' : 'outline'}
                      onClick={() => setSelectedCategory(category || 'all')}
                    >
                      {category === 'all' ? 'All Products' : category || 'Uncategorized'}
                    </Button>
                  ))}
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredProducts.map(product => (
                    <Card 
                      key={product.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => addToCart({
                        id: product.id,
                        name: product.name,
                        price: currency === 'EUR' 
                          ? parseFloat(product.priceEur || '0')
                          : parseFloat(product.priceCzk || '0'),
                        type: 'product',
                        sku: product.sku
                      })}
                    >
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-sm line-clamp-1">{product.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{product.sku}</p>
                        <p className="text-lg font-bold mt-2">
                          {currency} {currency === 'EUR' 
                            ? parseFloat(product.priceEur || '0').toFixed(2)
                            : parseFloat(product.priceCzk || '0').toFixed(2)}
                        </p>
                        {product.categoryId && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {product.categoryId}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="bundles" className="mt-0">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {bundles.map(bundle => (
                  <Card 
                    key={bundle.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => addToCart({
                      id: bundle.id,
                      name: bundle.name,
                      price: currency === 'EUR' 
                        ? parseFloat(bundle.priceEur || '0')
                        : parseFloat(bundle.priceCzk || '0'),
                      type: 'bundle',
                      sku: bundle.sku
                    })}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm line-clamp-1">{bundle.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{bundle.sku}</p>
                      <p className="text-lg font-bold mt-2">
                        {currency} {currency === 'EUR' 
                          ? parseFloat(bundle.priceEur || '0').toFixed(2)
                          : parseFloat(bundle.priceCzk || '0').toFixed(2)}
                      </p>
                      <Badge variant="default" className="mt-2 text-xs">
                        Bundle
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </div>

        {/* Right Panel - Enhanced Cart */}
        <div className="w-full lg:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 flex flex-col shadow-lg order-2 lg:order-3">
          {/* Enhanced Cart Header */}
          <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <ShoppingCart className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Shopping Cart</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {cart.length} {cart.length === 1 ? 'item' : 'items'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="secondary" 
                  className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  data-testid="cart-item-count"
                >
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} units
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Enhanced Cart Items */}
          <div className="flex-1 flex flex-col px-6">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-3 py-4">
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                      <ShoppingCart className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Your cart is empty</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Add products to get started</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div 
                      key={item.id} 
                      className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                      data-testid={`cart-item-${item.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-1">{item.name}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.sku || 'No SKU'}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {currency} {item.price.toFixed(2)} each
                            </Badge>
                            {item.landingCost && (
                              <MarginPill
                                sellingPrice={item.price}
                                landingCost={item.landingCost}
                                currency={currency}
                                showProfit={false}
                                className="text-xs"
                              />
                            )}
                            {item.landingCost && item.price < item.landingCost && (
                              <div className="flex items-center" title="Selling below cost!">
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => removeFromCart(item.id)}
                          data-testid={`remove-item-${item.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 w-9 p-0 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            data-testid={`decrease-quantity-${item.id}`}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <div className="w-16 text-center">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                              className="h-9 text-center border-slate-300 dark:border-slate-600 font-medium"
                              data-testid={`quantity-input-${item.id}`}
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 w-9 p-0 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            data-testid={`increase-quantity-${item.id}`}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            {currency} {(item.price * item.quantity).toFixed(2)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {item.quantity} × {currency} {item.price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Enhanced Totals & Checkout */}
            {cart.length > 0 && (
              <Card className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                <CardContent className="p-6 space-y-4">
                {/* Margin Summary */}
                {(() => {
                  const totalLandingCost = cart.reduce((sum, item) => 
                    sum + (item.landingCost || 0) * item.quantity, 0);
                  const totalSellingPrice = cart.reduce((sum, item) => 
                    sum + item.price * item.quantity, 0);
                  const totalProfit = totalSellingPrice - totalLandingCost;
                  
                  return totalLandingCost > 0 ? (
                    <div className="pb-2 mb-2 border-b">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          Total Profit:
                        </span>
                        <span className={totalProfit >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                          {currency} {totalProfit.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Margin:</span>
                        <MarginPill
                          sellingPrice={totalSellingPrice}
                          landingCost={totalLandingCost}
                          currency={currency}
                          showProfit={false}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  ) : null;
                })()}
                
                {/* Enhanced Totals Summary */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-medium">{currency} {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                    <span>VAT (21%):</span>
                    <span className="font-medium">{currency} {tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-600 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-slate-900 dark:text-slate-100">Total:</span>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="cart-total">
                        {currency} {total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Enhanced Payment Method Selection */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Payment Method</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('cash')}
                      className={`flex flex-col gap-1 h-12 py-2 text-xs font-medium transition-all hover:scale-105 ${
                        paymentMethod === 'cash' 
                          ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg' 
                          : 'hover:bg-green-50 dark:hover:bg-green-900/20'
                      }`}
                      data-testid="payment-method-cash"
                    >
                      <Banknote className="h-4 w-4" />
                      Cash
                    </Button>
                    <Button
                      size="sm"
                      variant={paymentMethod === 'pay_later' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('pay_later')}
                      className={`flex flex-col gap-1 h-12 py-2 text-xs font-medium transition-all hover:scale-105 ${
                        paymentMethod === 'pay_later' 
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
                          : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                      data-testid="payment-method-pay-later"
                    >
                      <CreditCard className="h-4 w-4" />
                      Pay Later
                    </Button>
                    <Button
                      size="sm"
                      variant={paymentMethod === 'bank_transfer' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('bank_transfer')}
                      className={`flex flex-col gap-1 h-12 py-2 text-xs font-medium transition-all hover:scale-105 ${
                        paymentMethod === 'bank_transfer' 
                          ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg' 
                          : 'hover:bg-purple-50 dark:hover:bg-purple-900/20'
                      }`}
                      data-testid="payment-method-bank-transfer"
                    >
                      <Building className="h-4 w-4" />
                      Bank
                    </Button>
                  </div>
                </div>

                {/* Enhanced Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-12 text-sm font-medium border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 transition-all"
                    onClick={() => setCart([])}
                    disabled={cart.length === 0}
                    data-testid="clear-cart-button"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Cart
                  </Button>
                  <Button 
                    className="flex-1 h-12 text-sm font-medium bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    onClick={handleCheckout}
                    disabled={cart.length === 0}
                    data-testid="checkout-button"
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Complete Sale
                  </Button>
                </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Payment Dialog for Cash */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md" data-testid="cash-payment-dialog">
          <DialogHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
              <Banknote className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-xl font-semibold">Cash Payment</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Enter the amount received from customer
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-center">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400 block mb-2">
                Total Amount Due
              </label>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100" data-testid="total-amount">
                {currency} {total.toFixed(2)}
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Amount Received
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="text-xl h-12 text-center font-medium border-2 focus:border-green-500"
                data-testid="amount-received-input"
                autoFocus
              />
            </div>
            
            {amountReceived && parseFloat(amountReceived) >= total && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                <label className="text-sm font-medium text-green-700 dark:text-green-300 block mb-2">
                  Change Due
                </label>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="change-amount">
                  {currency} {(parseFloat(amountReceived) - total).toFixed(2)}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowPaymentDialog(false)}
              className="flex-1"
              data-testid="cancel-payment-button"
            >
              Cancel
            </Button>
            <Button 
              onClick={processCashPayment}
              disabled={!amountReceived || parseFloat(amountReceived) < total}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
              data-testid="complete-payment-button"
            >
              Complete Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden Receipt for Printing */}
      <div ref={receiptRef} style={{ display: 'none' }} />
    </div>
  );
}