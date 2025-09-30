import { useState, useEffect, useRef } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import MarginPill from '@/components/orders/MarginPill';
import { format } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Product } from '@shared/schema';

interface ProductBundle {
  id: string;
  name: string;
  bundleId: string;
  priceEur: string | null;
  priceCzk: string | null;
  discountPercentage: string | null;
  sku?: string;
}
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const receiptRef = useRef<HTMLDivElement>(null);

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
  const { data: bundles = [] } = useQuery<ProductBundle[]>({
    queryKey: ['/api/bundles']
  });

  // Get unique categories from products (using categoryId for now)
  const categories = ['all'];

  // Filter products based on search
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
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

  return (
    <div className="flex h-screen relative">
      {/* Full-screen background image */}
      {backgroundImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-500 ease-in-out z-0"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            opacity: 0.15,
            filter: 'blur(2px)'
          }}
        />
      )}
      {/* Left Panel - Product Selection */}
      <div className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden relative z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Point of Sale</h1>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{format(new Date(), 'PPP')}</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search products by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Product Tabs */}
        <Tabs defaultValue="favorites" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="favorites">
              <Star className="mr-2 h-4 w-4" />
              Favorites
            </TabsTrigger>
            <TabsTrigger value="categories">
              <Package className="mr-2 h-4 w-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="bundles">
              <Package className="mr-2 h-4 w-4" />
              Bundles
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="favorites" className="mt-0">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {favoriteProducts.map(product => (
                  <Card 
                    key={product.id} 
                    className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 border-2 hover:border-primary/50"
                    onClick={() => addToCart({
                      id: product.id,
                      name: product.name,
                      price: currency === 'EUR' 
                        ? parseFloat(product.priceEur || '0')
                        : parseFloat(product.priceCzk || '0'),
                      type: 'product',
                      sku: product.sku
                    })}
                    onMouseEnter={() => product.imageUrl && setBackgroundImage(product.imageUrl)}
                    onMouseLeave={() => setBackgroundImage('')}
                  >
                    <CardContent className="p-4">
                      {product.imageUrl && (
                        <div className="w-full h-24 mb-3 rounded-md overflow-hidden bg-muted">
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{product.sku}</p>
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-lg font-bold">
                          {currency} {currency === 'EUR' 
                            ? parseFloat(product.priceEur || '0').toFixed(2)
                            : parseFloat(product.priceCzk || '0').toFixed(2)}
                        </p>
                        <Badge variant="outline" className="">
                          <Star className="mr-1 h-3 w-3 fill-yellow-400 text-yellow-400" />
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category === 'all' ? 'All Products' : category}
                    </Button>
                  ))}
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredProducts.map(product => (
                    <Card 
                      key={product.id} 
                      className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 border-2 hover:border-primary/50"
                      onClick={() => addToCart({
                        id: product.id,
                        name: product.name,
                        price: currency === 'EUR' 
                          ? parseFloat(product.priceEur || '0')
                          : parseFloat(product.priceCzk || '0'),
                        type: 'product',
                        sku: product.sku
                      })}
                      onMouseEnter={() => product.imageUrl && setBackgroundImage(product.imageUrl)}
                      onMouseLeave={() => setBackgroundImage('')}
                    >
                      <CardContent className="p-4">
                        {product.imageUrl && (
                          <div className="w-full h-24 mb-3 rounded-md overflow-hidden bg-muted">
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{product.sku}</p>
                        <p className="text-lg font-bold mt-3">
                          {currency} {currency === 'EUR' 
                            ? parseFloat(product.priceEur || '0').toFixed(2)
                            : parseFloat(product.priceCzk || '0').toFixed(2)}
                        </p>
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
                    className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 border-2 hover:border-primary/50"
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
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-sm line-clamp-2 flex-1">{bundle.name}</h3>
                        {bundle.discountPercentage && parseFloat(bundle.discountPercentage) > 0 && (
                          <Badge variant="destructive" className="text-xs ml-2">
                            -{parseFloat(bundle.discountPercentage).toFixed(0)}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{bundle.bundleId}</p>
                      <p className="text-lg font-bold mt-3">
                        {currency} {currency === 'EUR' 
                          ? parseFloat(bundle.priceEur || '0').toFixed(2)
                          : parseFloat(bundle.priceCzk || '0').toFixed(2)}
                      </p>
                      <Badge variant="outline" className="mt-2">
                        <Package className="mr-1 h-3 w-3" />
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

      {/* Right Panel - Cart */}
      <div className="w-96 border-l flex flex-col relative z-10 bg-background/95 backdrop-blur-sm">
        <Card className="flex-1 flex flex-col m-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Cart
              </CardTitle>
              <Select value={currency} onValueChange={(v) => setCurrency(v as 'EUR' | 'CZK')}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="CZK">CZK</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col overflow-hidden">
            {/* Cart Items */}
            <ScrollArea className="flex-1 max-h-[calc(100vh-28rem)]">
              <div className="space-y-3 pr-4">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="bg-muted rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                      <ShoppingCart className="h-10 w-10" />
                    </div>
                    <p className="text-sm">Your cart is empty</p>
                    <p className="text-xs mt-1">Add products to get started</p>
                  </div>
                ) : (
                  cart.map((item, index) => (
                    <div 
                      key={item.id} 
                      className="border rounded-xl p-4 bg-card hover:shadow-md transition-all duration-200"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{item.name}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.sku || 'No SKU'}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <p className="text-sm font-medium">
                              {currency} {item.price.toFixed(2)}
                            </p>
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
                              <AlertTriangle className="h-3 w-3 text-red-500" />
                            )}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 -mt-1 -mr-1 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between gap-3 bg-muted/50 rounded-lg p-2">
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 hover:bg-background"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <div className="w-12 text-center font-semibold">
                            {item.quantity}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 hover:bg-background"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-lg font-bold">
                          {currency} {(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Totals */}
            {cart.length > 0 && (
              <div className="space-y-3 pt-4 border-t mt-4">
                {/* Margin Summary */}
                {(() => {
                  const totalLandingCost = cart.reduce((sum, item) => 
                    sum + (item.landingCost || 0) * item.quantity, 0);
                  const totalSellingPrice = cart.reduce((sum, item) => 
                    sum + item.price * item.quantity, 0);
                  const totalProfit = totalSellingPrice - totalLandingCost;
                  
                  return totalLandingCost > 0 ? (
                    <div className="bg-muted/50 rounded-lg p-3 mb-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          Profit:
                        </span>
                        <span className={`text-lg font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {currency} {totalProfit.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
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
                
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-medium">{currency} {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>VAT (21%):</span>
                  <span className="font-medium">{currency} {tax.toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between items-center bg-primary/5 rounded-lg p-3">
                  <span className="text-lg font-bold">Total:</span>
                  <span className="text-2xl font-bold text-primary">{currency} {total.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div className="space-y-3 pt-4 border-t mt-4">
              <p className="text-sm font-semibold">Payment Method</p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('cash')}
                  className="flex flex-col gap-1.5 h-auto py-3 transition-all"
                >
                  <Banknote className="h-5 w-5" />
                  <span className="text-xs font-medium">Cash</span>
                </Button>
                <Button
                  size="sm"
                  variant={paymentMethod === 'pay_later' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('pay_later')}
                  className="flex flex-col gap-1.5 h-auto py-3 transition-all"
                >
                  <CreditCard className="h-5 w-5" />
                  <span className="text-xs font-medium">Pay Later</span>
                </Button>
                <Button
                  size="sm"
                  variant={paymentMethod === 'bank_transfer' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('bank_transfer')}
                  className="flex flex-col gap-1.5 h-auto py-3 transition-all"
                >
                  <Building className="h-5 w-5" />
                  <span className="text-xs font-medium">Bank</span>
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                className="flex-1 h-12"
                onClick={() => setCart([])}
                disabled={cart.length === 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear
              </Button>
              <Button 
                className="flex-1 h-12 text-base font-semibold"
                onClick={handleCheckout}
                disabled={cart.length === 0}
                size="lg"
              >
                <Printer className="mr-2 h-5 w-5" />
                Checkout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Dialog for Cash */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cash Payment</DialogTitle>
            <DialogDescription>
              Enter the amount received from customer
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Total Amount</label>
              <div className="text-2xl font-bold">{currency} {total.toFixed(2)}</div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount Received</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="text-lg"
              />
            </div>
            
            {amountReceived && parseFloat(amountReceived) >= total && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Change</label>
                <div className="text-xl font-bold text-green-600">
                  {currency} {(parseFloat(amountReceived) - total).toFixed(2)}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={processCashPayment}
              disabled={!amountReceived || parseFloat(amountReceived) < total}
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