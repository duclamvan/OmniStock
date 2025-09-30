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
  TrendingUp,
  AlertTriangle,
  Scan,
  Package
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
  const [barcodeInput, setBarcodeInput] = useState('');
  const receiptRef = useRef<HTMLDivElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

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

  // Barcode scanning
  useEffect(() => {
    const handleBarcodeScan = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && barcodeInput.trim()) {
        const product = products.find(p => 
          p.barcode === barcodeInput.trim() || 
          p.sku === barcodeInput.trim()
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
          setBarcodeInput('');
        } else {
          playSound('error');
          toast({
            title: 'Product Not Found',
            description: `No product found with barcode/SKU: ${barcodeInput}`,
            variant: 'destructive'
          });
          setBarcodeInput('');
        }
      }
    };

    if (barcodeInputRef.current) {
      barcodeInputRef.current.addEventListener('keydown', handleBarcodeScan);
    }

    return () => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.removeEventListener('keydown', handleBarcodeScan);
      }
    };
  }, [barcodeInput, products, currency]);

  // Auto-focus barcode input when not typing elsewhere
  useEffect(() => {
    const interval = setInterval(() => {
      const activeElement = document.activeElement;
      const isTypingInInput = activeElement?.tagName === 'INPUT' || 
                              activeElement?.tagName === 'TEXTAREA' || 
                              activeElement?.tagName === 'SELECT';
      
      // Only refocus to barcode if user is not typing in any input field
      if (barcodeInputRef.current && !isTypingInInput) {
        barcodeInputRef.current.focus();
      }
    }, 500); // Reduced frequency to be less aggressive
    return () => clearInterval(interval);
  }, []);

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

      {/* Categories Bar */}
      <div className="bg-background border-b px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            variant={selectedCategory === 'favorites' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('favorites')}
            className="whitespace-nowrap h-14 px-6 text-base"
            data-testid="button-category-favorites"
          >
            <Star className="mr-2 h-5 w-5" />
            Favorites
          </Button>
          <Button
            size="lg"
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('all')}
            className="whitespace-nowrap h-14 px-6 text-base"
            data-testid="button-category-all"
          >
            All Products
          </Button>
          {categories.filter(c => c !== 'favorites' && c !== 'all').map(category => (
            category && (
              <Button
                key={category}
                size="lg"
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category)}
                className="whitespace-nowrap h-14 px-6 text-base"
                data-testid={`button-category-${category}`}
              >
                {category}
              </Button>
            )
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Products */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {/* Search and Barcode */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
            <div className="relative flex-1">
              <Scan className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                ref={barcodeInputRef}
                placeholder="Scan barcode..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="pl-10 h-12 text-lg font-mono"
                data-testid="input-barcode"
              />
            </div>
          </div>

          {/* Products Grid */}
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 pb-4">
              {displayProducts.map(product => (
                <Card
                  key={product.id}
                  className="cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-200 border-2 hover:border-primary active:scale-95"
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
                  <CardContent className="p-0 flex items-center gap-3 h-24">
                    {product.imageUrl ? (
                      <div className="w-24 h-24 flex-shrink-0 overflow-hidden bg-muted">
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 flex-shrink-0 bg-muted flex items-center justify-center">
                        <Package className="h-10 w-10 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="flex-1 pr-4 py-3 min-w-0">
                      <h3 className="font-bold text-base line-clamp-2 mb-1">{product.name}</h3>
                      <p className="text-xs text-muted-foreground mb-2 truncate">{product.sku}</p>
                      <p className="text-xl font-bold text-primary">
                        {currency} {currency === 'EUR' 
                          ? parseFloat(product.priceEur || '0').toFixed(2)
                          : parseFloat(product.priceCzk || '0').toFixed(2)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Cart */}
        <div className="w-[420px] border-l flex flex-col bg-card">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
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
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1 max-h-[calc(100vh-32rem)]">
            <div className="space-y-3 p-6">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <div className="bg-muted rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                    <ShoppingCart className="h-12 w-12" />
                  </div>
                  <p className="text-sm font-medium">Your cart is empty</p>
                  <p className="text-xs mt-2">Scan or click products to add</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div 
                    key={item.id} 
                    className="border-2 rounded-xl p-4 bg-background hover:shadow-md transition-all"
                    data-testid={`cart-item-${item.id}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-sm">{item.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{item.sku || 'No SKU'}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-sm font-semibold">
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
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeFromCart(item.id)}
                        data-testid={`button-remove-${item.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between gap-3 bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 hover:bg-background"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          data-testid={`button-decrease-${item.id}`}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <div className="w-12 text-center font-bold text-lg">
                          {item.quantity}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 hover:bg-background"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          data-testid={`button-increase-${item.id}`}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-xl font-bold">
                        {currency} {(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Totals and Actions */}
          {cart.length > 0 && (
            <div className="border-t p-6 space-y-4">
              {/* Margin Summary */}
              {(() => {
                const totalLandingCost = cart.reduce((sum, item) => 
                  sum + (item.landingCost || 0) * item.quantity, 0);
                const totalSellingPrice = cart.reduce((sum, item) => 
                  sum + item.price * item.quantity, 0);
                const totalProfit = totalSellingPrice - totalLandingCost;
                
                return totalLandingCost > 0 ? (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="flex items-center gap-2 text-sm font-semibold">
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
                      />
                    </div>
                  </div>
                ) : null;
              })()}
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{currency} {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>VAT (21%):</span>
                  <span className="font-semibold">{currency} {tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center bg-primary/10 rounded-lg p-3 mt-2">
                  <span className="text-lg font-bold">Total:</span>
                  <span className="text-2xl font-bold text-primary">{currency} {total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <p className="text-sm font-semibold mb-3">Payment Method</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('cash')}
                    className="flex flex-col gap-2 h-auto py-3"
                    data-testid="button-payment-cash"
                  >
                    <Banknote className="h-5 w-5" />
                    <span className="text-xs font-medium">Cash</span>
                  </Button>
                  <Button
                    size="sm"
                    variant={paymentMethod === 'pay_later' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('pay_later')}
                    className="flex flex-col gap-2 h-auto py-3"
                    data-testid="button-payment-later"
                  >
                    <CreditCard className="h-5 w-5" />
                    <span className="text-xs font-medium">Pay Later</span>
                  </Button>
                  <Button
                    size="sm"
                    variant={paymentMethod === 'bank_transfer' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className="flex flex-col gap-2 h-auto py-3"
                    data-testid="button-payment-bank"
                  >
                    <Building className="h-5 w-5" />
                    <span className="text-xs font-medium">Bank</span>
                  </Button>
                </div>
              </div>

              {/* Checkout Button */}
              <Button 
                className="w-full h-14 text-lg font-bold"
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
