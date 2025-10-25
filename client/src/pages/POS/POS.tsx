import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
  Check,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { fuzzySearch } from '@/lib/fuzzySearch';
import type { Product } from '@shared/schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [showQuantityDialog, setShowQuantityDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantityInput, setQuantityInput] = useState('1');
  const [customPriceEnabled, setCustomPriceEnabled] = useState(false);
  const [customPrice, setCustomPrice] = useState('');
  const [showClearCartDialog, setShowClearCartDialog] = useState(false);
  const [showCartDetailsDialog, setShowCartDetailsDialog] = useState(false);
  const [vatEnabled, setVatEnabled] = useState(false); // Default OFF
  const [vatRate, setVatRate] = useState<string>('0'); // 0, 19, 21, or custom
  const [customVatRate, setCustomVatRate] = useState<string>('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(() => {
    // Load from localStorage on init
    return localStorage.getItem('pos_warehouse') || '';
  });
  const [lastCompletedOrderId, setLastCompletedOrderId] = useState<string | null>(null);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const cartScrollRef = useRef<HTMLDivElement>(null);
  const barcodeBufferRef = useRef<string>('');
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldScrollRef = useRef<boolean>(false);

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

  // Fetch warehouses
  const { data: warehouses = [] } = useQuery({
    queryKey: ['/api/warehouses'],
    queryFn: async () => {
      const response = await fetch('/api/warehouses');
      if (!response.ok) throw new Error('Failed to fetch warehouses');
      return response.json();
    },
  });

  // Categories from products
  const categories = ['favorites', 'all', ...Array.from(new Set(products.map(p => p.categoryId).filter(Boolean)))];

  // Get favorite products (first 12 products)
  const favoriteProducts = products.slice(0, 12);

  // Filter products based on category first
  const categoryFilteredProducts = products.filter(product => {
    if (selectedCategory === 'favorites') {
      return favoriteProducts.some(fav => fav.id === product.id);
    }
    return selectedCategory === 'all' || product.categoryId === selectedCategory;
  });

  // Apply fuzzy search with scoring
  const searchResults = searchQuery.trim()
    ? fuzzySearch(categoryFilteredProducts, searchQuery, {
        fields: ['name', 'sku', 'barcode'],
        threshold: 0.2,
        fuzzy: true,
        vietnameseNormalization: true,
      })
    : categoryFilteredProducts.map(item => ({ item, score: 0 }));

  // Extract products and sort by score
  const filteredProducts = searchResults.map(r => r.item);

  // Always use filtered products (search applies to all categories)
  const displayProducts = filteredProducts;

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

  // Auto-focus quantity input when dialog opens
  useEffect(() => {
    if (showQuantityDialog && quantityInputRef.current) {
      setTimeout(() => {
        quantityInputRef.current?.focus();
        quantityInputRef.current?.select();
      }, 100);
    }
  }, [showQuantityDialog]);

  // Auto-scroll cart to bottom when items are added (only when adding from product grid)
  useEffect(() => {
    if (shouldScrollRef.current && cartScrollRef.current && cart.length > 0) {
      const scrollElement = cartScrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        setTimeout(() => {
          scrollElement.scrollTop = scrollElement.scrollHeight;
          shouldScrollRef.current = false; // Reset after scrolling
        }, 50);
      }
    }
  }, [cart.length, cart]);

  // Auto-select first warehouse if none selected or saved warehouse is invalid
  useEffect(() => {
    if (warehouses && Array.isArray(warehouses) && warehouses.length > 0) {
      const savedWarehouse = localStorage.getItem('pos_warehouse');
      const warehouseExists = warehouses.some((w: any) => w.id === savedWarehouse);
      
      // If no warehouse selected or saved warehouse doesn't exist, auto-select first warehouse
      if (!selectedWarehouse || (savedWarehouse && !warehouseExists)) {
        const firstWarehouse = warehouses[0];
        if (firstWarehouse && firstWarehouse.id) {
          setSelectedWarehouse(firstWarehouse.id);
        }
      }
    }
  }, [warehouses]);

  // Save warehouse selection to localStorage
  useEffect(() => {
    if (selectedWarehouse) {
      localStorage.setItem('pos_warehouse', selectedWarehouse);
    }
  }, [selectedWarehouse]);

  // Open quantity dialog for product
  const openQuantityDialog = (product: Product) => {
    setSelectedProduct(product);
    setQuantityInput('1');
    setCustomPriceEnabled(false);
    setCustomPrice('');
    setShowQuantityDialog(true);
  };

  // Confirm and add to cart with specified quantity
  const confirmAddToCart = () => {
    if (!selectedProduct) return;
    
    const qty = parseInt(quantityInput);
    if (isNaN(qty) || qty <= 0) {
      toast({
        title: 'Invalid Quantity',
        description: 'Please enter a valid quantity',
        variant: 'destructive'
      });
      return;
    }

    // Use custom price if enabled, otherwise use default price
    let price: number;
    if (customPriceEnabled) {
      const parsedCustomPrice = parseFloat(customPrice);
      if (isNaN(parsedCustomPrice) || parsedCustomPrice <= 0) {
        toast({
          title: 'Invalid Price',
          description: 'Please enter a valid price',
          variant: 'destructive'
        });
        return;
      }
      price = parsedCustomPrice;
    } else {
      price = currency === 'EUR' 
        ? parseFloat(selectedProduct.priceEur || '0')
        : parseFloat(selectedProduct.priceCzk || '0');
    }

    shouldScrollRef.current = true; // Enable auto-scroll when adding from product grid
    addToCartWithQuantity({
      id: selectedProduct.id,
      name: selectedProduct.name,
      price: price,
      type: 'product',
      sku: selectedProduct.sku,
      landingCost: selectedProduct.latestLandingCost ? parseFloat(selectedProduct.latestLandingCost) : null,
      latestLandingCost: selectedProduct.latestLandingCost ? parseFloat(selectedProduct.latestLandingCost) : null
    }, qty);

    setShowQuantityDialog(false);
    setSelectedProduct(null);
    playSound('add');
  };

  // Add item to cart with specific quantity
  const addToCartWithQuantity = (item: { 
    id: string; 
    name: string; 
    price: number; 
    type: 'product' | 'bundle';
    sku?: string;
    landingCost?: number | null;
    latestLandingCost?: number | null;
  }, quantity: number = 1) => {
    const existingItem = cart.find(cartItem => 
      cartItem.id === item.id && cartItem.type === item.type
    );

    if (existingItem) {
      updateQuantity(existingItem.id, existingItem.quantity + quantity);
    } else {
      setCart([...cart, {
        id: item.id,
        productId: item.id,
        name: item.name,
        price: item.price,
        quantity: quantity,
        type: item.type,
        sku: item.sku,
        landingCost: item.landingCost || item.latestLandingCost || null
      }]);
    }
  };

  // Add item to cart (legacy - for barcode scanner)
  const addToCart = (item: { 
    id: string; 
    name: string; 
    price: number; 
    type: 'product' | 'bundle';
    sku?: string;
    landingCost?: number | null;
    latestLandingCost?: number | null;
  }) => {
    shouldScrollRef.current = true; // Enable auto-scroll when adding from barcode scanner
    addToCartWithQuantity(item, 1);
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

  // Clear entire cart
  const handleClearCart = () => {
    setCart([]);
    setShowClearCartDialog(false);
    setIsEditingOrder(false);
    setEditingOrderId(null);
    playSound('remove');
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const actualVatRate = vatEnabled ? (vatRate === 'custom' ? parseFloat(customVatRate || '0') : parseFloat(vatRate)) : 0;
  const tax = subtotal * (actualVatRate / 100);
  const total = subtotal + tax;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Create or update order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedWarehouse) {
        throw new Error('Please select a warehouse location');
      }

      const selectedWarehouseData = warehouses.find((w: any) => w.id === selectedWarehouse);
      const warehouseLocation = selectedWarehouseData ? selectedWarehouseData.name : selectedWarehouse;
      
      const orderData = {
        orderId: isEditingOrder ? undefined : `POS-${Date.now()}`,
        customerId: 'walk-in-customer',
        customerName: 'Walk-in Customer',
        currency: currency,
        items: cart.map(item => ({
          productId: item.id,
          variantId: item.variantId || undefined,
          bundleId: item.bundleId || undefined,
          quantity: item.quantity,
          price: item.price.toString(),
          productName: item.name,
          sku: item.sku || '',
          total: (item.price * item.quantity).toString()
        })),
        subtotal: subtotal.toFixed(2),
        taxRate: actualVatRate.toFixed(2),
        taxAmount: tax.toFixed(2),
        grandTotal: total.toFixed(2),
        paymentMethod: paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'COD',
        paymentStatus: paymentMethod === 'cash' ? 'paid' : 'pending',
        orderStatus: 'shipped', // POS sales are immediately fulfilled
        notes: `POS Sale - ${format(new Date(), 'PPp')}\nWarehouse Location: ${warehouseLocation}${paymentMethod === 'cash' && amountReceived ? `\nCash Received: ${currency} ${parseFloat(amountReceived).toFixed(2)}\nChange: ${currency} ${(parseFloat(amountReceived) - total).toFixed(2)}` : ''}${isEditingOrder ? '\n[Modified after completion]' : ''}`
      };
      
      if (isEditingOrder && editingOrderId) {
        return await apiRequest('PATCH', `/api/orders/${editingOrderId}`, orderData);
      } else {
        return await apiRequest('POST', '/api/orders', orderData);
      }
    },
    onSuccess: (data: any) => {
      playSound('checkout');
      const orderNumber = data?.orderId || `POS-${Date.now()}`;
      toast({
        title: isEditingOrder ? 'Order Updated' : 'Order Created',
        description: `Order #${orderNumber} has been ${isEditingOrder ? 'updated' : 'created'} successfully`
      });
      printReceipt();
      
      // Store last completed order ID
      if (data?.id) {
        setLastCompletedOrderId(data.id);
      }
      
      setCart([]);
      setAmountReceived('');
      setShowPaymentDialog(false);
      setIsEditingOrder(false);
      setEditingOrderId(null);
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

    const selectedWarehouseData = warehouses.find((w: any) => w.id === selectedWarehouse);
    const warehouseLocation = selectedWarehouseData ? selectedWarehouseData.name : selectedWarehouse;

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
          <div>Location: ${warehouseLocation}</div>
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
          ${actualVatRate > 0 ? `
          <div class="total-line">
            <span>VAT (${actualVatRate.toFixed(2)}%):</span>
            <span>${currency} ${tax.toFixed(2)}</span>
          </div>
          ` : ''}
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

    if (!selectedWarehouse) {
      playSound('error');
      toast({
        title: 'Warehouse Required',
        description: 'Please select a warehouse location before checkout',
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

  // Recall last sale to modify
  const recallLastSale = async () => {
    if (!lastCompletedOrderId) {
      toast({
        title: 'No Recent Sale',
        description: 'No recent sale to recall',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Fetch order details
      const response = await fetch(`/api/orders/${lastCompletedOrderId}`);
      if (!response.ok) throw new Error('Failed to fetch order');
      const order = await response.json();

      // Load order items into cart, preserving type, bundleId, and variantId
      const cartItems: CartItem[] = order.items.map((item: any) => {
        // Determine the type based on bundleId or variantId presence
        let itemType: 'product' | 'variant' | 'bundle' = 'product';
        if (item.bundleId) {
          itemType = 'bundle';
        } else if (item.variantId) {
          itemType = 'variant';
        }

        return {
          id: item.productId,
          productId: item.productId,
          variantId: item.variantId || undefined,
          bundleId: item.bundleId || undefined,
          name: item.productName,
          price: parseFloat(item.price || item.unitPrice || '0'),
          quantity: item.quantity,
          type: itemType,
          sku: item.sku,
          landingCost: null
        };
      });

      setCart(cartItems);
      setCurrency(order.currency);
      setIsEditingOrder(true);
      setEditingOrderId(order.id);
      
      // Extract VAT from order if present
      if (order.taxRate && parseFloat(order.taxRate) > 0) {
        setVatEnabled(true);
        const rate = parseFloat(order.taxRate);
        if ([0, 19, 21].includes(rate)) {
          setVatRate(rate.toString());
        } else {
          setVatRate('custom');
          setCustomVatRate(rate.toString());
        }
      }

      toast({
        title: 'Sale Recalled',
        description: `Order #${order.orderId} loaded for modification`,
      });

      playSound('add');
    } catch (error) {
      console.error('Error recalling sale:', error);
      toast({
        title: 'Error',
        description: 'Failed to recall last sale',
        variant: 'destructive'
      });
      playSound('error');
    }
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
          
          {/* Warehouse Location */}
          <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
            <SelectTrigger className="w-48 bg-primary-foreground text-primary" data-testid="select-warehouse">
              <SelectValue placeholder="Select Location" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((warehouse: any) => (
                <SelectItem key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* VAT Toggle and Rate Selector */}
          <div className="flex items-center gap-2 bg-primary-foreground/10 rounded-lg px-3 py-2">
            <Label className="text-sm font-medium whitespace-nowrap">VAT:</Label>
            <Switch
              checked={vatEnabled}
              onCheckedChange={setVatEnabled}
              className="data-[state=checked]:bg-primary-foreground data-[state=unchecked]:bg-primary-foreground/30"
              data-testid="switch-vat-enabled"
            />
            {vatEnabled && (
              <>
                <Select value={vatRate} onValueChange={setVatRate}>
                  <SelectTrigger className="w-28 h-8 bg-primary-foreground text-primary" data-testid="select-vat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="19">19%</SelectItem>
                    <SelectItem value="21">21%</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {vatRate === 'custom' && (
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="%"
                    value={customVatRate}
                    onChange={(e) => setCustomVatRate(e.target.value)}
                    className="w-16 h-8 bg-primary-foreground text-primary text-center"
                    data-testid="input-custom-vat"
                  />
                )}
              </>
            )}
          </div>
          
          {/* Currency Selector */}
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
                    onClick={() => openQuantityDialog(product)}
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
                {isEditingOrder && (
                  <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 border-amber-300">
                    Editing
                  </Badge>
                )}
              </h2>
              <div className="flex items-center gap-2">
                {lastCompletedOrderId && cart.length === 0 && !isEditingOrder && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={recallLastSale}
                    className="h-8 text-xs"
                    data-testid="button-recall-sale"
                  >
                    <Package className="h-3 w-3 mr-1" />
                    Recall Last
                  </Button>
                )}
                {cart.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCartDetailsDialog(true)}
                      className="h-8"
                      data-testid="button-view-cart"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowClearCartDialog(true)}
                      className="text-destructive hover:text-destructive h-8"
                      data-testid="button-clear-cart"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1" ref={cartScrollRef}>
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
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const newQty = parseInt(e.target.value);
                            if (!isNaN(newQty) && newQty > 0) {
                              updateQuantity(item.id, newQty);
                            } else if (e.target.value === '') {
                              // Allow empty field temporarily while typing
                            }
                          }}
                          onBlur={(e) => {
                            // If field is empty on blur, reset to 1
                            if (e.target.value === '' || parseInt(e.target.value) < 1) {
                              updateQuantity(item.id, 1);
                            }
                          }}
                          onFocus={(e) => e.target.select()}
                          className="w-9 h-8 text-center font-bold text-sm border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          data-testid={`input-quantity-${item.id}`}
                        />
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
                {actualVatRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>VAT ({actualVatRate.toFixed(2)}%):</span>
                    <span className="font-semibold">{currency} {tax.toFixed(2)}</span>
                  </div>
                )}
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
                {isEditingOrder ? 'Update Order' : 'Checkout'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Quantity Input Dialog */}
      <Dialog open={showQuantityDialog} onOpenChange={setShowQuantityDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Quantity</DialogTitle>
            <DialogDescription>
              {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <Input
                ref={quantityInputRef}
                type="number"
                min="1"
                step="1"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !customPriceEnabled) {
                    e.preventDefault();
                    confirmAddToCart();
                  }
                }}
                className="text-3xl h-20 text-center font-bold"
                data-testid="input-quantity"
              />
            </div>
            
            {selectedProduct && (
              <div className="bg-muted rounded-lg p-4 space-y-3">
                {/* Custom Price Toggle */}
                <div className="flex items-center justify-between pb-2 border-b">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="custom-price"
                      checked={customPriceEnabled}
                      onCheckedChange={(checked) => {
                        setCustomPriceEnabled(checked);
                        if (checked) {
                          const defaultPrice = currency === 'EUR' 
                            ? parseFloat(selectedProduct.priceEur || '0')
                            : parseFloat(selectedProduct.priceCzk || '0');
                          setCustomPrice(defaultPrice.toFixed(2));
                        }
                      }}
                      data-testid="switch-custom-price"
                    />
                    <Label htmlFor="custom-price" className="text-sm font-medium cursor-pointer">
                      Custom Price
                    </Label>
                  </div>
                </div>

                {/* Price Display */}
                {!customPriceEnabled ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Unit Price:</span>
                    <span className="font-semibold">
                      {currency} {currency === 'EUR' 
                        ? parseFloat(selectedProduct.priceEur || '0').toFixed(2)
                        : parseFloat(selectedProduct.priceCzk || '0').toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Original Price:</span>
                      <span className="line-through">
                        {currency} {currency === 'EUR' 
                          ? parseFloat(selectedProduct.priceEur || '0').toFixed(2)
                          : parseFloat(selectedProduct.priceCzk || '0').toFixed(2)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Custom Unit Price:</label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            confirmAddToCart();
                          }
                        }}
                        className="text-xl h-12 text-center font-bold"
                        placeholder="0.00"
                        data-testid="input-custom-price"
                      />
                    </div>
                  </div>
                )}

                {/* Subtotal Calculation */}
                {quantityInput && !isNaN(parseInt(quantityInput)) && parseInt(quantityInput) > 0 && (
                  <div className="flex justify-between text-base border-t pt-2">
                    <span className="font-bold">Subtotal:</span>
                    <span className="font-bold text-primary">
                      {currency} {(() => {
                        const qty = parseInt(quantityInput);
                        const unitPrice = customPriceEnabled && customPrice 
                          ? parseFloat(customPrice)
                          : (currency === 'EUR' 
                            ? parseFloat(selectedProduct.priceEur || '0')
                            : parseFloat(selectedProduct.priceCzk || '0'));
                        return (unitPrice * qty).toFixed(2);
                      })()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowQuantityDialog(false)}
              data-testid="button-cancel-quantity"
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmAddToCart}
              disabled={!quantityInput || isNaN(parseInt(quantityInput)) || parseInt(quantityInput) <= 0}
              data-testid="button-confirm-quantity"
            >
              Add to Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog for Cash */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditingOrder ? 'Update Payment' : 'Cash Payment'}</DialogTitle>
            <DialogDescription>
              {isEditingOrder ? 'Update the amount received from customer' : 'Enter the amount received from customer'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Total Amount</label>
              <div className="text-3xl font-bold">{currency} {total.toFixed(2)}</div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Amount Received</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmountReceived(total.toFixed(2))}
                  className="h-7 text-xs"
                  data-testid="button-exact-amount"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Exact Amount
                </Button>
              </div>
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
              <div className="space-y-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <label className="text-sm font-medium text-blue-900 dark:text-blue-100">Change</label>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
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
              {isEditingOrder ? 'Update Payment' : 'Complete Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cart Details Dialog */}
      <Dialog open={showCartDetailsDialog} onOpenChange={setShowCartDetailsDialog}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="h-5 w-5" />
              Cart Details
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete summary of all items in your cart
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 px-6">
            <ScrollArea className="h-full">
              <div className="space-y-3 py-4 pr-4">
              {/* Cart Items Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr className="text-left text-xs">
                      <th className="px-2 py-2 font-semibold">Item</th>
                      <th className="px-2 py-2 font-semibold text-center w-16">Qty</th>
                      <th className="px-2 py-2 font-semibold text-right w-24">Unit</th>
                      <th className="px-2 py-2 font-semibold text-right w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {cart.map((item, index) => (
                      <tr key={item.id} className="hover:bg-accent/5" data-testid={`cart-detail-row-${item.id}`}>
                        <td className="px-2 py-2">
                          <div>
                            <p className="font-medium text-sm leading-tight">{item.name}</p>
                            {item.sku && (
                              <p className="text-xs text-muted-foreground mt-0.5">SKU: {item.sku}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <Badge variant="secondary" className="font-bold text-xs h-5 px-2">
                            {item.quantity}x
                          </Badge>
                        </td>
                        <td className="px-2 py-2 text-right text-xs">
                          {currency} {item.price.toFixed(2)}
                        </td>
                        <td className="px-2 py-2 text-right font-semibold text-primary">
                          {currency} {(item.price * item.quantity).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Section */}
              <div className="space-y-2 bg-muted/30 rounded-lg p-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Total Items:</span>
                  <span className="font-semibold">{totalItems} items</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-semibold">{currency} {subtotal.toFixed(2)}</span>
                </div>
                {actualVatRate > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">VAT ({actualVatRate.toFixed(2)}%):</span>
                    <span className="font-semibold">{currency} {tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold">Grand Total:</span>
                    <span className="text-xl font-bold text-primary">
                      {currency} {total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-0.5">
                  <p className="text-muted-foreground">Payment Method</p>
                  <p className="font-semibold capitalize">
                    {paymentMethod.replace('_', ' ')}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground">Date & Time</p>
                  <p className="font-semibold">
                    {format(new Date(), 'PPp')}
                  </p>
                </div>
              </div>
            </div>
            </ScrollArea>
          </div>
          
          <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
            <Button 
              variant="outline" 
              onClick={() => setShowCartDetailsDialog(false)}
              data-testid="button-close-cart-details"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Cart Confirmation Dialog */}
      <AlertDialog open={showClearCartDialog} onOpenChange={setShowClearCartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Cart?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all items from the cart? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-clear">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearCart}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-clear"
            >
              Clear Cart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hidden Receipt for Printing */}
      <div ref={receiptRef} style={{ display: 'none' }} />
    </div>
  );
}
