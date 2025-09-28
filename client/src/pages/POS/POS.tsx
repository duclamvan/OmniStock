import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
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
  DollarSign,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight as ArrowRightIcon,
  KeyRound,
  Keyboard,
  TouchScreen,
  Gauge,
  RotateCcw,
  FastForward,
  Target,
  Lightbulb,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff
} from 'lucide-react';
import MarginPill from '@/components/orders/MarginPill';
import { format } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebounce } from '@/hooks/useDebounce';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { ProductCard } from '@/components/ProductCard';
import { soundEffects } from '@/utils/soundEffects';
import { normalizeVietnamese } from '@/lib/searchUtils';
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

// Memoized Cart Item Component for performance
const CartItemComponent = memo(function CartItemComponent({
  item,
  currency,
  onUpdateQuantity,
  onRemove
}: {
  item: CartItem;
  currency: 'EUR' | 'CZK';
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="pos-card-premium p-4 rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{item.name}</h4>
          {item.sku && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">SKU: {item.sku}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge className="pos-badge-info text-xs px-2 py-1">
              {currency} {item.price.toFixed(2)} each
            </Badge>
            {item.landingCost && (
              <Badge variant="outline" className="text-xs px-2 py-1">
                Cost: {currency} {item.landingCost.toFixed(2)}
              </Badge>
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
          className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 touch-target-medium"
          onClick={() => onRemove(item.id)}
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
            className="h-10 w-10 p-0 pos-button-secondary hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200 touch-target-medium"
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
            data-testid={`decrease-quantity-${item.id}`}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <div className="w-16 text-center">
            <Input
              type="number"
              value={item.quantity}
              onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value) || 0)}
              className="pos-input-premium h-10 text-center font-bold text-lg touch-target-medium"
              data-testid={`quantity-input-${item.id}`}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-10 w-10 p-0 pos-button-secondary hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all duration-200 touch-target-medium"
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            data-testid={`increase-quantity-${item.id}`}
          >
            <Plus className="h-4 w-4" />
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
  );
});

export default function POS() {
  const { toast } = useToast();
  
  // Enhanced state management
  const [currency, setCurrency] = useState<'EUR' | 'CZK'>('EUR');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'pay_later' | 'bank_transfer'>('cash');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');
  const [selectedTab, setSelectedTab] = useState('favorites');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedProductIndex, setSelectedProductIndex] = useState(-1);
  const [enableSounds, setEnableSounds] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);

  // Refs for optimization
  const receiptRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const productGridRef = useRef<HTMLDivElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  // Debounced search for performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

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

  // Memoized calculations for performance
  const categories = useMemo(() => 
    ['all', ...Array.from(new Set(products.map(p => p.categoryId).filter(Boolean)))], 
    [products]
  );

  // Optimized search with debouncing and Vietnamese support
  const filteredProducts = useMemo(() => {
    if (!debouncedSearchQuery && selectedCategory === 'all') {
      return products;
    }
    
    return products.filter(product => {
      const searchTerm = debouncedSearchQuery.toLowerCase();
      const normalizedSearchTerm = normalizeVietnamese(searchTerm);
      
      const matchesSearch = !debouncedSearchQuery || 
        product.name.toLowerCase().includes(searchTerm) ||
        normalizeVietnamese(product.name.toLowerCase()).includes(normalizedSearchTerm) ||
        product.sku?.toLowerCase().includes(searchTerm);
        
      const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [products, debouncedSearchQuery, selectedCategory]);

  // Get favorite products (for demo, using first 12 products for F1-F12)
  const favoriteProducts = useMemo(() => products.slice(0, 12), [products]);

  // Initialize barcode scanner
  const handleBarcodeScan = useCallback(async (barcode: string) => {
    try {
      // Find product by barcode or SKU
      const product = products.find(p => 
        p.barcode === barcode || 
        p.sku === barcode ||
        p.sku?.toLowerCase() === barcode.toLowerCase()
      );

      if (product) {
        const price = currency === 'EUR' 
          ? parseFloat(product.priceEur || '0')
          : parseFloat(product.priceCzk || '0');

        addToCart({
          id: product.id,
          name: product.name,
          price: price,
          type: 'product',
          sku: product.sku,
          landingCost: product.latestLandingCost
        });

        if (enableSounds) {
          await soundEffects.playSuccessBeep();
        }
        
        toast({
          title: 'Product Added',
          description: `${product.name} added to cart`,
          duration: 2000
        });

        // Auto-focus search after successful scan
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);

        return true;
      } else {
        if (enableSounds) {
          await soundEffects.playErrorBeep();
        }
        
        toast({
          title: 'Product Not Found',
          description: `No product found with barcode: ${barcode}`,
          variant: 'destructive',
          duration: 3000
        });
        
        return false;
      }
    } catch (error) {
      console.error('Barcode scan error:', error);
      if (enableSounds) {
        await soundEffects.playErrorBeep();
      }
      
      toast({
        title: 'Scan Error',
        description: 'Error processing barcode scan',
        variant: 'destructive'
      });
      
      return false;
    }
  }, [products, currency, enableSounds, toast, searchInputRef]);

  const { isScanning, scanStatus, resetScan } = useBarcodeScanner(handleBarcodeScan, {
    minLength: 6,
    maxLength: 50,
    timeout: 100,
    enableSound: enableSounds,
    enableVisualFeedback: true
  });

  // Add item to cart - Memoized for performance
  const addToCart = useCallback((item: { 
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

    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => 
        cartItem.id === item.id && cartItem.type === item.type
      );

      if (existingItem) {
        if (enableSounds) {
          soundEffects.playDuplicateBeep();
        }
        return prevCart.map(cartItem => 
          cartItem.id === existingItem.id 
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        if (enableSounds) {
          soundEffects.playSuccessBeep();
        }
        return [...prevCart, {
          id: item.id,
          productId: item.id,
          name: item.name,
          price: priceInCurrency,
          quantity: 1,
          type: item.type,
          sku: item.sku,
          landingCost: item.landingCost || item.latestLandingCost || null
        }];
      }
    });

    // Auto-focus search after adding product for fast workflow
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, [currency, enableSounds, searchInputRef]);

  // Update quantity - Memoized for performance
  const updateQuantity = useCallback((id: string, quantity: number) => {
    setCart(prevCart => {
      if (quantity <= 0) {
        return prevCart.filter(item => item.id !== id);
      } else {
        return prevCart.map(item => 
          item.id === id ? { ...item, quantity } : item
        );
      }
    });
  }, []);

  // Remove from cart - Memoized for performance
  const removeFromCart = useCallback((id: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  }, []);

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

  // Handle checkout - Memoized for performance
  const handleCheckout = useCallback(() => {
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
  }, [cart.length, paymentMethod, toast, createOrderMutation]);

  // Process cash payment - Memoized for performance
  const processCashPayment = useCallback(() => {
    if (paymentMethod === 'cash' && parseFloat(amountReceived) < total) {
      toast({
        title: 'Insufficient Amount',
        description: 'Amount received is less than total',
        variant: 'destructive'
      });
      return;
    }
    createOrderMutation.mutate();
  }, [paymentMethod, amountReceived, total, toast, createOrderMutation]);

  // Quick quantity adjustment functions
  const quickAddQuantity = useCallback((amount: number) => {
    if (cart.length > 0) {
      const lastItem = cart[cart.length - 1];
      updateQuantity(lastItem.id, lastItem.quantity + amount);
      if (enableSounds) {
        soundEffects.playSuccessBeep();
      }
    }
  }, [cart, updateQuantity, enableSounds]);

  // Quick payment method shortcuts
  const quickSetPaymentMethod = useCallback((method: 'cash' | 'pay_later' | 'bank_transfer') => {
    setPaymentMethod(method);
    if (enableSounds) {
      soundEffects.playNotificationSound();
    }
    toast({
      title: 'Payment Method Changed',
      description: `Set to ${method === 'pay_later' ? 'Pay Later' : method === 'bank_transfer' ? 'Bank Transfer' : 'Cash'}`,
      duration: 1500
    });
  }, [setPaymentMethod, enableSounds, toast]);

  // Enhanced keyboard navigation with all shortcuts
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    // Prevent shortcuts when typing in input fields (except search)
    const target = e.target as HTMLElement;
    const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    const isSearchInput = target.getAttribute('data-testid') === 'input-search';
    
    if (isInputField && !isSearchInput) return;

    // F1-F12 for favorite products (first 12 products)
    if (e.key.startsWith('F') && e.key.length <= 3) {
      const fKeyNumber = parseInt(e.key.substring(1));
      if (fKeyNumber >= 1 && fKeyNumber <= 12) {
        e.preventDefault();
        const product = favoriteProducts[fKeyNumber - 1];
        if (product) {
          const price = currency === 'EUR' 
            ? parseFloat(product.priceEur || '0')
            : parseFloat(product.priceCzk || '0');
          
          addToCart({
            id: product.id,
            name: product.name,
            price: price,
            type: 'product',
            sku: product.sku,
            landingCost: product.latestLandingCost
          });

          toast({
            title: 'Quick Add',
            description: `${product.name} added via ${e.key}`,
            duration: 1500
          });
        }
        return;
      }
    }

    // Number pad shortcuts for quantities (1-9)
    if (/^[1-9]$/.test(e.key) && e.shiftKey) {
      e.preventDefault();
      quickAddQuantity(parseInt(e.key));
      return;
    }

    // Quick quantity presets with Ctrl + number
    if (e.ctrlKey && /^[1-9]$/.test(e.key)) {
      e.preventDefault();
      const quantities = [1, 2, 5, 10, 20, 50, 100];
      const amount = quantities[parseInt(e.key) - 1] || parseInt(e.key);
      quickAddQuantity(amount);
      return;
    }

    // Arrow key navigation for products
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const maxIndex = filteredProducts.length - 1;
      if (e.key === 'ArrowUp') {
        setSelectedProductIndex(prev => prev <= 0 ? maxIndex : prev - 1);
      } else {
        setSelectedProductIndex(prev => prev >= maxIndex ? 0 : prev + 1);
      }
      return;
    }

    // Enter to add selected product
    if (e.key === 'Enter' && selectedProductIndex >= 0 && !isInputField) {
      e.preventDefault();
      const product = filteredProducts[selectedProductIndex];
      if (product) {
        const price = currency === 'EUR' 
          ? parseFloat(product.priceEur || '0')
          : parseFloat(product.priceCzk || '0');
        
        addToCart({
          id: product.id,
          name: product.name,
          price: price,
          type: 'product',
          sku: product.sku,
          landingCost: product.latestLandingCost
        });
      }
      return;
    }

    // Payment method shortcuts
    if (e.ctrlKey && e.key === '1') {
      e.preventDefault();
      quickSetPaymentMethod('cash');
      return;
    }
    if (e.ctrlKey && e.key === '2') {
      e.preventDefault();
      quickSetPaymentMethod('pay_later');
      return;
    }
    if (e.ctrlKey && e.key === '3') {
      e.preventDefault();
      quickSetPaymentMethod('bank_transfer');
      return;
    }

    // Focus search on Ctrl+K or F3
    if ((e.ctrlKey && e.key === 'k') || e.key === 'F3') {
      e.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
      return;
    }

    // Quick clear cart on Escape or Ctrl+Delete
    if (e.key === 'Escape' || (e.ctrlKey && e.key === 'Delete')) {
      e.preventDefault();
      if (cart.length > 0) {
        setCart([]);
        if (enableSounds) {
          soundEffects.playNotificationSound();
        }
        toast({
          title: 'Cart Cleared',
          description: 'All items removed from cart',
          duration: 1500
        });
      }
      return;
    }

    // Quick checkout on Enter (when not in input) or F12
    if ((e.key === 'Enter' && !isInputField && cart.length > 0) || e.key === 'F12') {
      e.preventDefault();
      if (cart.length > 0) handleCheckout();
      return;
    }

    // Delete/Backspace to remove last item from cart
    if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputField && cart.length > 0) {
      e.preventDefault();
      const lastItem = cart[cart.length - 1];
      removeFromCart(lastItem.id);
      if (enableSounds) {
        soundEffects.playNotificationSound();
      }
      toast({
        title: 'Item Removed',
        description: `${lastItem.name} removed from cart`,
        duration: 1500
      });
      return;
    }

    // Tab navigation enhancement
    if (e.key === 'Tab') {
      // Let normal tab behavior work, but focus search if nothing focused
      setTimeout(() => {
        if (!document.activeElement || document.activeElement === document.body) {
          searchInputRef.current?.focus();
        }
      }, 10);
    }
  }, [
    favoriteProducts, 
    filteredProducts, 
    selectedProductIndex, 
    currency, 
    cart, 
    addToCart, 
    quickAddQuantity, 
    quickSetPaymentMethod, 
    handleCheckout, 
    removeFromCart, 
    enableSounds, 
    toast,
    searchInputRef
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return (
    <div className="h-screen pos-premium-bg">
      {/* Premium Professional Header */}
      <div className="sticky top-0 z-50 pos-header-gradient backdrop-blur-xl border-b-2 border-white/20 pos-shadow-large">
        <div className="flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              {/* Premium Logo Badge */}
              <div className="relative h-12 w-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center pos-shadow-medium ring-2 ring-white/20">
                <Receipt className="h-6 w-6 text-white drop-shadow-sm" />
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Zap className="h-2 w-2 text-white" />
                </div>
              </div>
              
              {/* Enhanced Branding */}
              <div className="text-white">
                <h1 className="text-2xl font-bold tracking-tight drop-shadow-sm">RETAIL PRO</h1>
                <p className="text-sm text-white/90 font-medium tracking-wide">Premium Point of Sale</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Enhanced Currency Selector */}
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
              <Euro className="h-4 w-4 text-white/90" />
              <Select value={currency} onValueChange={(v) => setCurrency(v as 'EUR' | 'CZK')}>
                <SelectTrigger className="w-20 h-8 bg-transparent border-white/20 text-white focus:border-white/40" data-testid="select-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-sm">
                  <SelectItem value="EUR" data-testid="currency-eur">EUR</SelectItem>
                  <SelectItem value="CZK" data-testid="currency-czk">CZK</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Professional Date & Time Display */}
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
              <div className="flex items-center gap-2 text-sm text-white/90">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">{format(new Date(), 'MMM dd, yyyy')}</span>
              </div>
              <div className="w-px h-4 bg-white/30"></div>
              <div className="flex items-center gap-2 text-sm text-white/90">
                <Clock className="h-4 w-4" />
                <span className="font-medium font-mono">{format(new Date(), 'HH:mm')}</span>
              </div>
            </div>

            {/* Enhanced Quick Actions */}
            <div className="flex items-center gap-3">
              <Button 
                size="sm" 
                variant="outline" 
                className="h-9 px-4 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-200"
                onClick={() => setCart([])}
                disabled={cart.length === 0}
                data-testid="button-clear-cart"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Cart
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-9 px-4 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 hover:border-white/30 transition-all duration-200"
                data-testid="button-settings"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
        
        {/* Professional Status Bar with Advanced Features */}
        <div className="bg-white/5 backdrop-blur-sm border-t border-white/10 px-8 py-2">
          <div className="flex items-center justify-between text-sm text-white/80">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-2 w-2 rounded-full transition-all duration-200",
                  isOnline ? "bg-green-400 animate-pulse" : "bg-red-400"
                )}>
                </div>
                <span>{isOnline ? 'System Online' : 'Offline Mode'}</span>
              </div>
              
              {/* Barcode Scanner Status */}
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200",
                  isScanning ? "bg-blue-500/20 text-blue-300" : 
                  scanStatus === 'success' ? "bg-green-500/20 text-green-300" :
                  scanStatus === 'error' ? "bg-red-500/20 text-red-300" : 
                  "bg-white/10 text-white/60"
                )}>
                  <Scan className="h-3 w-3" />
                  <span>
                    {isScanning ? 'Scanning...' : 
                     scanStatus === 'success' ? 'Scan Success' :
                     scanStatus === 'error' ? 'Scan Failed' : 
                     'Scanner Ready'}
                  </span>
                </div>
              </div>

              {/* Sound Status */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-white/60 hover:text-white hover:bg-white/10"
                  onClick={() => setEnableSounds(!enableSounds)}
                  data-testid="toggle-sounds"
                >
                  {enableSounds ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
                </Button>
                <span className="text-xs">{enableSounds ? 'Audio On' : 'Muted'}</span>
              </div>

              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>{products.length} Products Available</span>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              {/* Quick Shortcuts Indicator */}
              <div className="flex items-center gap-2 text-xs">
                <Keyboard className="h-3 w-3" />
                <span>F1-F12: Quick Add</span>
                <span>•</span>
                <span>Ctrl+K: Search</span>
                <span>•</span>
                <span>F12: Checkout</span>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  <span>{cart.length} Items in Cart</span>
                </div>
                {cart.length > 0 && (
                  <div className="flex items-center gap-2 font-medium">
                    <DollarSign className="h-4 w-4" />
                    <span data-testid="status-bar-total">{currency} {total.toFixed(2)} Total</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Panel Professional Layout */}
      <div className="flex h-[calc(100vh-156px)]">
        {/* Left Panel - Enhanced Navigation & Search */}
        <div className="hidden lg:flex w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex-col pos-shadow-soft">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
            {/* Professional Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                ref={searchInputRef}
                placeholder="Search products... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pos-input-premium pl-10 pr-10 h-12 text-sm font-medium"
                data-testid="input-search"
              />
              {searchQuery && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 rounded-full transition-all duration-200"
                  onClick={() => setSearchQuery('')}
                  data-testid="button-clear-search"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Professional Quick Actions */}
          <div className="p-6">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 tracking-wide uppercase">Quick Access</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Button 
                size="sm" 
                className={`pos-button-secondary justify-start h-11 transition-all duration-200 touch-target-large ${
                  selectedTab === 'favorites' ? 'pos-button-primary' : ''
                }`}
                onClick={() => setSelectedTab('favorites')}
                data-testid="quick-favorites"
              >
                <Star className="h-4 w-4 mr-2" />
                Favorites
              </Button>
              <Button 
                size="sm" 
                className={`pos-button-secondary justify-start h-11 transition-all duration-200 touch-target-large ${
                  selectedTab === 'categories' ? 'pos-button-primary' : ''
                }`}
                onClick={() => setSelectedTab('categories')}
                data-testid="quick-categories"
              >
                <Grid3X3 className="h-4 w-4 mr-2" />
                Products
              </Button>
              <Button 
                size="sm" 
                className={`pos-button-secondary justify-start h-11 transition-all duration-200 touch-target-large ${
                  selectedTab === 'bundles' ? 'pos-button-primary' : ''
                }`}
                onClick={() => setSelectedTab('bundles')}
                data-testid="quick-bundles"
              >
                <Package className="h-4 w-4 mr-2" />
                Bundles
              </Button>
              <Button 
                size="sm" 
                className="pos-button-secondary justify-start h-11 transition-all duration-200 touch-target-large"
                onClick={() => resetScan()}
                data-testid="quick-scan"
              >
                <Scan className="h-4 w-4 mr-2" />
                Scan Mode
              </Button>
            </div>

            {/* Quick Quantity Controls */}
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 tracking-wide uppercase">Quick Quantity</h4>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {[1, 2, 5, 10].map(qty => (
                <Button
                  key={qty}
                  size="sm"
                  variant="outline"
                  className="h-12 font-bold text-lg pos-button-secondary hover:pos-button-primary transition-all duration-200 touch-target-large"
                  onClick={() => quickAddQuantity(qty)}
                  disabled={cart.length === 0}
                  data-testid={`quick-quantity-${qty}`}
                >
                  +{qty}
                </Button>
              ))}
            </div>

            {/* Quick Payment Methods */}
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 tracking-wide uppercase">Payment Shortcuts</h4>
            <div className="space-y-2 mb-6">
              <Button
                size="sm"
                variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                className="w-full justify-start h-12 font-medium transition-all duration-200 touch-target-large"
                onClick={() => quickSetPaymentMethod('cash')}
                data-testid="quick-payment-cash"
              >
                <Banknote className="h-4 w-4 mr-3" />
                Cash Payment
                <Badge className="ml-auto bg-green-100 text-green-800 text-xs">Ctrl+1</Badge>
              </Button>
              <Button
                size="sm"
                variant={paymentMethod === 'pay_later' ? 'default' : 'outline'}
                className="w-full justify-start h-12 font-medium transition-all duration-200 touch-target-large"
                onClick={() => quickSetPaymentMethod('pay_later')}
                data-testid="quick-payment-later"
              >
                <CreditCard className="h-4 w-4 mr-3" />
                Pay Later
                <Badge className="ml-auto bg-blue-100 text-blue-800 text-xs">Ctrl+2</Badge>
              </Button>
              <Button
                size="sm"
                variant={paymentMethod === 'bank_transfer' ? 'default' : 'outline'}
                className="w-full justify-start h-12 font-medium transition-all duration-200 touch-target-large"
                onClick={() => quickSetPaymentMethod('bank_transfer')}
                data-testid="quick-payment-bank"
              >
                <Building className="h-4 w-4 mr-3" />
                Bank Transfer
                <Badge className="ml-auto bg-purple-100 text-purple-800 text-xs">Ctrl+3</Badge>
              </Button>
            </div>

            {/* Speed Actions */}
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 tracking-wide uppercase">Speed Actions</h4>
            <div className="space-y-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start h-12 font-medium transition-all duration-200 touch-target-large"
                onClick={() => searchInputRef.current?.focus()}
                data-testid="quick-search-focus"
              >
                <Search className="h-4 w-4 mr-3" />
                Focus Search
                <Badge className="ml-auto bg-gray-100 text-gray-800 text-xs">Ctrl+K</Badge>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start h-12 font-medium transition-all duration-200 touch-target-large"
                onClick={() => {
                  if (cart.length > 0) {
                    setCart([]);
                    if (enableSounds) soundEffects.playNotificationSound();
                  }
                }}
                disabled={cart.length === 0}
                data-testid="quick-clear-cart"
              >
                <RotateCcw className="h-4 w-4 mr-3" />
                Clear Cart
                <Badge className="ml-auto bg-red-100 text-red-800 text-xs">Esc</Badge>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start h-12 font-medium pos-button-primary transition-all duration-200 touch-target-large"
                onClick={handleCheckout}
                disabled={cart.length === 0}
                data-testid="quick-checkout"
              >
                <FastForward className="h-4 w-4 mr-3" />
                Quick Checkout
                <Badge className="ml-auto bg-yellow-100 text-yellow-800 text-xs">F12</Badge>
              </Button>
            </div>
          </div>

          {/* Professional Category Filter */}
          <div className="px-6 pb-6">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 tracking-wide uppercase">Categories</h3>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {categories.map(category => (
                  <Button
                    key={category}
                    size="sm"
                    className={`w-full justify-start h-10 text-sm font-medium transition-all duration-200 ${
                      selectedCategory === category ? 'pos-button-primary' : 'pos-button-secondary'
                    }`}
                    onClick={() => setSelectedCategory(category || 'all')}
                    data-testid={`filter-category-${category}`}
                  >
                    <Filter className="h-4 w-4 mr-3" />
                    {category === 'all' ? 'All Products' : category || 'Uncategorized'}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Professional Stats Dashboard */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 mt-auto bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 tracking-wide uppercase">Session Stats</h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="pos-card-premium p-3 rounded-lg">
                <Package className="h-4 w-4 text-green-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Products</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{products.length}</p>
              </div>
              <div className="pos-card-premium p-3 rounded-lg">
                <ShoppingCart className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Cart Items</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{cart.length}</p>
              </div>
            </div>
            
            {/* Professional Performance Indicators */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Sales Today</span>
                <span className="font-medium text-green-600">€2,150.00</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Transactions</span>
                <span className="font-medium text-blue-600">47</span>
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
                          className="group pos-card-interactive cursor-pointer pos-animate-fade-in-up bg-white dark:bg-slate-900"
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
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <Badge className="pos-badge-warning text-xs font-medium px-2 py-1">
                                <Star className="mr-1 h-3 w-3 fill-current" />
                                Featured
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-green-100 hover:text-green-600 rounded-full"
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
                            
                            <div className="mb-4">
                              <h3 className="font-bold text-lg mb-2 line-clamp-2 text-slate-900 dark:text-slate-100 leading-tight">
                                {product.name}
                              </h3>
                              <div className="flex items-center gap-2 mb-3">
                                <Badge variant="outline" className="text-xs font-mono text-slate-600 border-slate-300">
                                  {product.sku || 'No SKU'}
                                </Badge>
                                {product.categoryId && (
                                  <Badge className="pos-badge-info text-xs">
                                    {product.categoryId}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="text-right">
                                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                                  {currency} {price.toFixed(2)}
                                </p>
                                {product.latestLandingCost && (
                                  <MarginPill
                                    sellingPrice={price}
                                    landingCost={product.latestLandingCost}
                                    currency={currency}
                                    showProfit={false}
                                    className="text-xs"
                                  />
                                )}
                              </div>
                              
                              {/* Professional Add to Cart Button */}
                              <Button 
                                className="w-full pos-button-primary text-sm font-medium h-10 group-hover:scale-105 transition-transform duration-200"
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
                                data-testid={`add-to-cart-${product.id}`}
                              >
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Add to Cart
                              </Button>
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

        {/* Professional Premium Cart Panel */}
        <div className="w-full lg:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 flex flex-col pos-shadow-xl order-2 lg:order-3">
          {/* Premium Cart Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border-b-2 border-slate-200 dark:border-slate-700 px-6 py-5 pos-shadow-soft">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl pos-header-gradient flex items-center justify-center pos-shadow-medium ring-2 ring-green-500/20">
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Shopping Cart</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                    {cart.length} {cart.length === 1 ? 'item' : 'items'} • {currency} {total.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="pos-badge-info px-3 py-1 font-medium" data-testid="cart-item-count">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} units
                </Badge>
                {cart.length > 0 && (
                  <Badge className="pos-badge-success px-3 py-1">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Ready
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Enhanced Cart Items */}
          <div className="flex-1 flex flex-col px-6">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-3 py-4">
                {cart.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="relative mx-auto mb-6">
                      <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mx-auto pos-shadow-soft">
                        <ShoppingCart className="h-10 w-10 text-slate-400" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-green-500 rounded-full flex items-center justify-center">
                        <Plus className="h-3 w-3 text-white" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Your cart is empty</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Browse products and add items to get started</p>
                    <Button className="pos-button-primary" onClick={() => setSelectedTab('favorites')}>
                      <Star className="h-4 w-4 mr-2" />
                      View Favorites
                    </Button>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div 
                      key={item.id} 
                      className="pos-card-premium rounded-xl p-5 pos-animate-fade-in-up hover:pos-shadow-medium transition-all duration-200"
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
                        <div className="flex items-center gap-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-10 w-10 p-0 pos-button-secondary hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-200"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            data-testid={`decrease-quantity-${item.id}`}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <div className="w-16 text-center">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                              className="pos-input-premium h-10 text-center font-bold text-lg"
                              data-testid={`quantity-input-${item.id}`}
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-10 w-10 p-0 pos-button-secondary hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all duration-200"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            data-testid={`increase-quantity-${item.id}`}
                          >
                            <Plus className="h-4 w-4" />
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

                {/* Professional Payment Method Selection */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Payment Method</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      size="sm"
                      onClick={() => setPaymentMethod('cash')}
                      className={`flex flex-col gap-2 h-16 py-3 text-sm font-semibold transition-all duration-300 hover:scale-105 pos-shadow-soft ${
                        paymentMethod === 'cash' 
                          ? 'pos-button-primary ring-2 ring-green-500/30' 
                          : 'pos-button-secondary hover:bg-green-50 hover:text-green-700 hover:border-green-200'
                      }`}
                      data-testid="payment-method-cash"
                    >
                      <Banknote className="h-5 w-5" />
                      Cash
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setPaymentMethod('pay_later')}
                      className={`flex flex-col gap-2 h-16 py-3 text-sm font-semibold transition-all duration-300 hover:scale-105 pos-shadow-soft ${
                        paymentMethod === 'pay_later' 
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white ring-2 ring-blue-500/30' 
                          : 'pos-button-secondary hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                      }`}
                      data-testid="payment-method-pay-later"
                    >
                      <CreditCard className="h-5 w-5" />
                      Pay Later
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setPaymentMethod('bank_transfer')}
                      className={`flex flex-col gap-2 h-16 py-3 text-sm font-semibold transition-all duration-300 hover:scale-105 pos-shadow-soft ${
                        paymentMethod === 'bank_transfer' 
                          ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white ring-2 ring-purple-500/30' 
                          : 'pos-button-secondary hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200'
                      }`}
                      data-testid="payment-method-bank-transfer"
                    >
                      <Building className="h-5 w-5" />
                      Bank Transfer
                    </Button>
                  </div>
                </div>

                {/* Professional Action Buttons */}
                <div className="flex gap-4 pt-6">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-14 text-sm font-bold border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 transition-all duration-300 hover:scale-105 pos-shadow-soft hover:pos-shadow-medium"
                    onClick={() => setCart([])}
                    disabled={cart.length === 0}
                    data-testid="clear-cart-button"
                  >
                    <Trash2 className="mr-2 h-5 w-5" />
                    Clear Cart
                  </Button>
                  <Button 
                    className="flex-1 h-14 text-sm font-bold pos-button-primary pos-shadow-large hover:pos-shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    onClick={handleCheckout}
                    disabled={cart.length === 0}
                    data-testid="checkout-button"
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Processing...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        Complete Sale
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </div>
                    )}
                  </Button>
                </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Professional Premium Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-lg pos-shadow-premium" data-testid="cash-payment-dialog">
          <DialogHeader className="text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl pos-header-gradient flex items-center justify-center mb-6 pos-shadow-large ring-4 ring-green-500/20">
              <Banknote className="h-8 w-8 text-white drop-shadow-sm" />
            </div>
            <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Cash Payment</DialogTitle>
            <DialogDescription className="text-lg text-slate-600 dark:text-slate-400 font-medium">
              Enter the amount received from customer
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-8 py-6">
            <div className="pos-card-premium rounded-xl p-6 text-center bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
              <label className="text-sm font-bold text-slate-600 dark:text-slate-400 block mb-3 uppercase tracking-wide">
                Total Amount Due
              </label>
              <div className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2" data-testid="total-amount">
                {currency} {total.toFixed(2)}
              </div>
              <Badge className="pos-badge-info">
                <Calculator className="h-3 w-3 mr-1" />
                Including 21% VAT
              </Badge>
            </div>
            
            <div className="space-y-4">
              <label className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Amount Received
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="pos-input-premium text-2xl h-16 text-center font-bold"
                data-testid="amount-received-input"
                autoFocus
              />
            </div>
            
            {amountReceived && parseFloat(amountReceived) >= total && (
              <div className="pos-card-premium rounded-xl p-6 text-center bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-2 border-green-200 dark:border-green-700 pos-animate-scale-in">
                <label className="text-sm font-bold text-green-700 dark:text-green-300 block mb-3 uppercase tracking-wide flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Change Due
                </label>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="change-amount">
                  {currency} {(parseFloat(amountReceived) - total).toFixed(2)}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex gap-4 pt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowPaymentDialog(false)}
              className="flex-1 h-14 text-sm font-bold pos-button-secondary border-2 hover:scale-105 transition-all duration-300"
              data-testid="cancel-payment-button"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              onClick={processCashPayment}
              disabled={!amountReceived || parseFloat(amountReceived) < total}
              className="flex-1 h-14 text-sm font-bold pos-button-primary pos-shadow-large hover:pos-shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              data-testid="complete-payment-button"
            >
              {createOrderMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Complete Payment
                  <ArrowRight className="h-4 w-4 ml-1" />
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden Receipt for Printing */}
      <div ref={receiptRef} style={{ display: 'none' }} />
    </div>
  );
}