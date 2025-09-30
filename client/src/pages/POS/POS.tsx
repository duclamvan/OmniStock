import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ShoppingCart, 
  Printer, 
  Plus, 
  Minus, 
  Trash2, 
  Star,
  Search,
  CreditCard,
  Banknote,
  Building,
  X,
  Package,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Product } from '@shared/schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProductBundle {
  id: string;
  name: string;
  bundleId: string;
  priceEur: string | null;
  priceCzk: string | null;
  discountPercentage: string | null;
  sku?: string;
}

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

// Sound effects
const playSound = (type: 'add' | 'remove' | 'checkout' | 'error') => {
  const sounds = {
    add: () => {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBDGH0fPTgjMGHm7A7+OZURE');
      audio.volume = 0.3;
      audio.play();
    },
    remove: () => {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACFhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBDGH0fPTgjMGHm7A7+OZURE');
      audio.volume = 0.2;
      audio.play();
    },
    checkout: () => {
      const audio = new Audio('data:audio/wav;base64,UklGRi4HAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA');
      audio.volume = 0.4;
      audio.play();
    },
    error: () => {
      const audio = new Audio('data:audio/wav;base64,UklGRi4HAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAAB/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f3+A');
      audio.volume = 0.3;
      audio.play();
    }
  };
  sounds[type]();
};

export default function POS() {
  const { toast } = useToast();
  const [currency, setCurrency] = useState<'EUR' | 'CZK'>('EUR');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'pay_later' | 'bank_transfer'>('cash');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('favorites');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');
  const receiptRef = useRef<HTMLDivElement>(null);
  const barcodeBufferRef = useRef<string>('');
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Categories from products
  const categories = ['favorites', 'all', ...Array.from(new Set(products.map(p => p.categoryId).filter(Boolean)))];

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                           selectedCategory === 'favorites' || 
                           product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get favorite products (first 12 products)
  const favoriteProducts = products.slice(0, 12);

  const displayProducts = selectedCategory === 'favorites' ? favoriteProducts : filteredProducts;

  // Background barcode scanning - detects rapid keystrokes from scanner
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const activeElement = document.activeElement;
      const isTypingInInput = activeElement?.tagName === 'INPUT' || 
                              activeElement?.tagName === 'TEXTAREA' || 
                              activeElement?.tagName === 'SELECT';
      
      if (isTypingInInput) {
        return;
      }

      // Clear previous timeout
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }

      // Handle Enter key - process the barcode
      if (e.key === 'Enter') {
        const barcode = barcodeBufferRef.current.trim();
        if (barcode) {
          const product = products.find(p => 
            p.barcode === barcode || 
            p.sku === barcode
          );
          
          if (product) {
            addToCart({
              id: product.id,
              name: product.name,
              price: currency === 'EUR' ? parseFloat(product.priceEur || '0') : parseFloat(product.priceCzk || '0'),
              type: 'product',
              sku: product.sku,
              landingCost: product.latestLandingCost ? parseFloat(product.latestLandingCost) : null,
              latestLandingCost: product.latestLandingCost ? parseFloat(product.latestLandingCost) : null
            });
            playSound('add');
          } else {
            playSound('error');
            toast({
              title: 'Product Not Found',
              description: `No product found with barcode/SKU: ${barcode}`,
              variant: 'destructive'
            });
          }
        }
        barcodeBufferRef.current = '';
        return;
      }

      // Add character to buffer if it's a valid barcode character
      if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
        
        // Reset buffer after 100ms of inactivity (scanners type faster than this)
        barcodeTimeoutRef.current = setTimeout(() => {
          barcodeBufferRef.current = '';
        }, 100);
      }
    };

    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }
    };
  }, [products, currency]);

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
        price: item.price,
        quantity: 1,
        type: item.type,
        sku: item.sku,
        landingCost: item.landingCost || item.latestLandingCost || null
      }]);
    }
    playSound('add');
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
    playSound('remove');
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.21;
  const total = subtotal + tax;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

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
      playSound('checkout');
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
      playSound('error');
      toast({
        title: 'Error',
        description: error.message || 'Failed to create order',
        variant: 'destructive'
      });
    }
  });

  // Print receipt
  const printReceipt = () => {
    const printWindow = window.open('', '', 'width=300,height=600');
    if (!printWindow) return;

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt</title>
        <style>
          @media print {
            @page { size: 80mm auto; margin: 0; }
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
      playSound('error');
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
      playSound('error');
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
    <div className="flex flex-col h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Top Bar */}
      <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <ShoppingCart className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Point of Sale</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-3xl font-bold">{currency} {total.toFixed(2)}</div>
            <div className="text-sm opacity-90">Total: {totalItems} Items</div>
          </div>
          <Select value={currency} onValueChange={(v) => setCurrency(v as 'EUR' | 'CZK')}>
            <SelectTrigger className="w-24 bg-primary-foreground text-primary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="CZK">CZK</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Products */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Categories Section */}
          <div className="border-b px-6 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={selectedCategory === 'favorites' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('favorites')}
                className="whitespace-nowrap h-10 px-4 text-sm"
                data-testid="button-category-favorites"
              >
                <Star className="mr-2 h-4 w-4" />
                Favorites
              </Button>
              <Button
                size="sm"
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('all')}
                className="whitespace-nowrap h-10 px-4 text-sm"
                data-testid="button-category-all"
              >
                All Products
              </Button>
              {categories.filter(c => c !== 'favorites' && c !== 'all').map(category => (
                category && (
                  <Button
                    key={category}
                    size="sm"
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(category)}
                    className="whitespace-nowrap h-10 px-4 text-sm"
                    data-testid={`button-category-${category}`}
                  >
                    {category}
                  </Button>
                )
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
          </div>

          {/* Products Grid */}
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-6">
              {displayProducts.map(product => {
                const cartItem = cart.find(item => item.id === product.id);
                const isInCart = !!cartItem;
                return (
                  <Card
                    key={product.id}
                    className={cn(
                      "cursor-pointer transition-all duration-150 border-2 relative group",
                      "hover:shadow-xl hover:border-primary/60 hover:bg-accent/5",
                      "active:scale-[0.98] touch-manipulation",
                      isInCart ? "border-primary bg-primary/5 shadow-md" : "border-border"
                    )}
                    onClick={() => addToCart({
                      id: product.id,
                      name: product.name,
                      price: currency === 'EUR' 
                        ? parseFloat(product.priceEur || '0')
                        : parseFloat(product.priceCzk || '0'),
                      type: 'product',
                      sku: product.sku,
                      landingCost: product.latestLandingCost ? parseFloat(product.latestLandingCost) : null,
                      latestLandingCost: product.latestLandingCost ? parseFloat(product.latestLandingCost) : null
                    })}
                    data-testid={`card-product-${product.id}`}
                  >
                    {/* Quantity indicator */}
                    {isInCart && cartItem && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full px-2.5 py-1 z-10 font-bold text-sm shadow-md">
                        {cartItem.quantity}x
                      </div>
                    )}
                    
                    <CardContent className="p-0 flex flex-col min-h-[144px]">
                      {/* Product Image/Icon Section */}
                      <div className="relative h-24 bg-muted/50 border-b overflow-hidden">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-12 w-12 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      
                      {/* Product Details Section */}
                      <div className="flex flex-col flex-1 p-4 gap-2">
                        {/* Product Name */}
                        <div className="flex-1">
                          <h3 className="font-medium text-sm leading-tight line-clamp-2 text-foreground/90 group-hover:text-foreground min-h-[2.5rem]">
                            {product.name}
                          </h3>
                          {product.sku && (
                            <p className="text-xs text-muted-foreground mt-1">
                              SKU: {product.sku}
                            </p>
                          )}
                        </div>
                        
                        {/* Price Section */}
                        <div className="flex items-end justify-between pt-2 border-t">
                          <span className="text-xs text-muted-foreground">Price</span>
                          <p className="text-lg font-bold text-primary">
                            {currency} {currency === 'EUR' 
                              ? parseFloat(product.priceEur || '0').toFixed(2)
                              : parseFloat(product.priceCzk || '0').toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Cart */}
        <div className="w-[420px] border-l flex flex-col bg-card">
          <div className="px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Cart ({totalItems})
              </h2>
              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCart([]);
                    playSound('remove');
                  }}
                  className="text-destructive hover:text-destructive h-8"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-2 p-3">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="bg-muted rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-3">
                    <ShoppingCart className="h-10 w-10" />
                  </div>
                  <p className="text-sm font-medium">Your cart is empty</p>
                  <p className="text-xs mt-1">Scan or click products to add</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div 
                    key={item.id} 
                    className="border rounded-lg p-3 bg-background/50 hover:bg-background transition-colors"
                    data-testid={`cart-item-${item.id}`}
                  >
                    {/* Header Row: Product Name and Remove Button */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm leading-tight">{item.name}</h4>
                        {item.sku && (
                          <p className="text-xs text-muted-foreground mt-0.5">SKU: {item.sku}</p>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive flex-shrink-0 -mt-1"
                        onClick={() => removeFromCart(item.id)}
                        data-testid={`button-remove-${item.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Footer Row: Quantity Controls and Pricing */}
                    <div className="flex items-center justify-between gap-3">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-0.5 bg-muted rounded-md">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-l-md rounded-r-none hover:bg-background"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          data-testid={`button-decrease-${item.id}`}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <div className="w-9 text-center font-bold text-sm">
                          {item.quantity}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-r-md rounded-l-none hover:bg-background"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          data-testid={`button-increase-${item.id}`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Unit Price */}
                      <div className="flex-1 text-center min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {currency} {item.price.toFixed(2)} each
                        </p>
                      </div>

                      {/* Total Price */}
                      <div className="text-right min-w-[90px]">
                        <p className="text-base font-bold text-primary whitespace-nowrap">
                          {currency} {(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Totals and Actions */}
          {cart.length > 0 && (
            <div className="border-t p-4 space-y-3">
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{currency} {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>VAT (21%):</span>
                  <span className="font-semibold">{currency} {tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center bg-primary/10 rounded-lg p-3 mt-2">
                  <span className="text-base font-bold">Total:</span>
                  <span className="text-xl font-bold text-primary">{currency} {total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <p className="text-xs font-semibold mb-2">Payment Method</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('cash')}
                    className="flex flex-col gap-1.5 h-auto py-2.5"
                    data-testid="button-payment-cash"
                  >
                    <Banknote className="h-4 w-4" />
                    <span className="text-xs font-medium">Cash</span>
                  </Button>
                  <Button
                    size="sm"
                    variant={paymentMethod === 'pay_later' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('pay_later')}
                    className="flex flex-col gap-1.5 h-auto py-2.5"
                    data-testid="button-payment-later"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span className="text-xs font-medium">Pay Later</span>
                  </Button>
                  <Button
                    size="sm"
                    variant={paymentMethod === 'bank_transfer' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className="flex flex-col gap-1.5 h-auto py-2.5"
                    data-testid="button-payment-bank"
                  >
                    <Building className="h-4 w-4" />
                    <span className="text-xs font-medium">Bank</span>
                  </Button>
                </div>
              </div>

              {/* Checkout Button */}
              <Button 
                className="w-full h-12 text-base font-bold"
                onClick={handleCheckout}
                disabled={cart.length === 0}
                data-testid="button-checkout"
              >
                <Printer className="mr-2 h-5 w-5" />
                Checkout
              </Button>
            </div>
          )}
        </div>
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
              <div className="text-3xl font-bold">{currency} {total.toFixed(2)}</div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount Received</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="text-xl h-14"
                data-testid="input-amount-received"
              />
            </div>
            
            {amountReceived && parseFloat(amountReceived) >= total && (
              <div className="space-y-2 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <label className="text-sm font-medium">Change</label>
                <div className="text-2xl font-bold text-green-600">
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
              data-testid="button-complete-payment"
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
