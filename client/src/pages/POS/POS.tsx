import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Search,
  Package,
  Check,
  X,
  FileText,
  CreditCard,
  Scan,
  User,
  Printer,
  QrCode,
  Clock,
  AlertTriangle,
  Banknote,
  Building2,
  Warehouse,
  Euro,
  DollarSign,
  Grid3X3,
  List,
  Star,
  ChevronRight,
  RotateCcw,
  Receipt,
  Calculator,
  Percent,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  Settings,
  Bluetooth,
  Usb,
  Keyboard
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { fuzzySearch } from '@/lib/fuzzySearch';
import type { Product, Customer } from '@shared/schema';
import { insertInvoiceSchema } from '@shared/schema';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from 'react-i18next';
import { soundEffects } from '@/utils/soundEffects';

interface CartItem {
  id: string;
  cartId: string;
  productId?: string;
  variantId?: string;
  bundleId?: string;
  name: string;
  price: number;
  quantity: number;
  type: 'product' | 'variant' | 'bundle';
  sku?: string;
  barcode?: string;
  imageUrl?: string;
  discount?: number;
}

interface ReceiptData {
  orderId: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  paymentMethod: string;
  customerName: string;
  notes: string;
  date: Date;
  cashReceived?: number;
  change?: number;
}

type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'bank_transfer_private' | 'bank_transfer_invoice' | 'pay_later' | 'qr_czk';
type ViewMode = 'grid' | 'list';

function generateQRCodeSVG(data: string, size: number = 200): string {
  const encodedData = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}&format=svg`;
}

function QRCodeCZK({ amount, orderId, scanLabel }: { amount: number; orderId: string; scanLabel?: string }) {
  const spdString = `SPD*1.0*ACC:CZ6508000000192000145399*AM:${amount.toFixed(2)}*CC:CZK*MSG:POS Sale ${orderId}`;
  const qrUrl = generateQRCodeSVG(spdString, 200);
  
  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-white dark:bg-slate-800 rounded-xl">
      <img 
        src={qrUrl} 
        alt="Czech Payment QR Code" 
        className="w-56 h-56 border-2 border-gray-200 dark:border-slate-600 rounded-lg"
        data-testid="img-qr-code-czk"
      />
      <div className="text-center space-y-2">
        <p className="text-base font-medium text-gray-700 dark:text-gray-300">{scanLabel || 'Scan to pay with Czech bank transfer'}</p>
        <p className="text-3xl font-bold text-primary">CZK {amount.toFixed(2)}</p>
      </div>
    </div>
  );
}

function ThermalReceipt({ data, onClose, onPrint }: { data: ReceiptData; onClose: () => void; onPrint: () => void }) {
  const { t } = useTranslation(['common', 'financial']);
  
  const handlePrint = () => {
    window.print();
    onPrint();
  };

  const paymentMethodLabels: Record<PaymentMethod, string> = {
    cash: t('financial:cash'),
    card: t('financial:creditCard'),
    bank_transfer: t('financial:bankTransfer'),
    pay_later: t('financial:payLater'),
    qr_czk: t('financial:qrCodeCzk')
  };

  return (
    <div className="relative">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .thermal-receipt, .thermal-receipt * { visibility: visible; }
          .thermal-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 5mm;
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            line-height: 1.4;
            background: white;
          }
          .no-print { display: none !important; }
        }
      `}</style>
      
      <div className="thermal-receipt bg-white dark:bg-slate-800 p-6 max-w-[320px] mx-auto font-mono text-sm border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
        <div className="text-center border-b-2 border-dashed border-gray-300 dark:border-slate-600 pb-4 mb-4">
          <h2 className="text-xl font-bold">DAVIE SUPPLY</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Point of Sale Receipt</p>
        </div>
        
        <div className="space-y-1.5 text-sm border-b border-dashed border-gray-300 dark:border-slate-600 pb-4 mb-4">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Date:</span>
            <span className="font-medium">{data.date.toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Time:</span>
            <span className="font-medium">{data.date.toLocaleTimeString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Order #:</span>
            <span className="font-medium">{data.orderId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Customer:</span>
            <span className="font-medium">{data.customerName}</span>
          </div>
        </div>
        
        <div className="border-b border-dashed border-gray-300 dark:border-slate-600 pb-4 mb-4">
          <div className="font-bold mb-3 text-base">Items:</div>
          {data.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm mb-2">
              <span className="flex-1 pr-3">
                {item.quantity}x {item.name}
              </span>
              <span className="font-medium whitespace-nowrap">
                {data.currency} {(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        
        <div className="space-y-2 text-sm border-b border-dashed border-gray-300 dark:border-slate-600 pb-4 mb-4">
          <div className="flex justify-between">
            <span>{t('financial:subtotal')}:</span>
            <span>{data.currency} {data.subtotal.toFixed(2)}</span>
          </div>
          {data.discount > 0 && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>Discount:</span>
              <span>-{data.currency} {data.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-2 border-t dark:border-slate-600">
            <span>{t('financial:total')}:</span>
            <span>{data.currency} {data.total.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">{t('financial:paymentMethod')}:</span>
            <span className="font-medium">{paymentMethodLabels[data.paymentMethod as PaymentMethod] || data.paymentMethod}</span>
          </div>
          {data.cashReceived && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Cash Received:</span>
                <span className="font-medium">{data.currency} {data.cashReceived.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-600 dark:text-green-400 font-bold">
                <span>Change:</span>
                <span>{data.currency} {(data.change || 0).toFixed(2)}</span>
              </div>
            </>
          )}
          {data.notes && (
            <div className="mt-3 pt-3 border-t dark:border-slate-600">
              <span className="font-medium">Notes:</span>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{data.notes}</p>
            </div>
          )}
        </div>
        
        <div className="text-center mt-6 pt-4 border-t-2 border-dashed border-gray-300 dark:border-slate-600">
          <p className="text-sm text-gray-600 dark:text-gray-400">Thank you for your purchase!</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Powered by Davie Supply POS</p>
        </div>
      </div>
      
      <div className="no-print flex gap-3 justify-center mt-6">
        <Button size="lg" onClick={handlePrint} className="px-8" data-testid="button-print-receipt">
          <Printer className="h-5 w-5 mr-2" />
          Print Receipt
        </Button>
        <Button size="lg" variant="outline" onClick={onClose} data-testid="button-close-receipt">
          {t('common:close')}
        </Button>
      </div>
    </div>
  );
}

function NumPad({ value, onChange, onSubmit, label }: { 
  value: string; 
  onChange: (val: string) => void; 
  onSubmit: () => void;
  label: string;
}) {
  const handleKey = (key: string) => {
    if (key === 'C') {
      onChange('');
    } else if (key === '⌫') {
      onChange(value.slice(0, -1));
    } else if (key === '.') {
      if (!value.includes('.')) {
        onChange(value + '.');
      }
    } else {
      onChange(value + key);
    }
  };

  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '.'];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">{label}</p>
        <div className="text-4xl font-bold text-primary p-4 bg-muted rounded-xl min-h-[70px] flex items-center justify-center">
          {value || '0'}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {keys.map((key) => (
          <Button
            key={key}
            variant={key === 'C' ? 'destructive' : 'outline'}
            size="lg"
            className="h-14 text-xl font-bold"
            onClick={() => handleKey(key)}
          >
            {key === '⌫' ? <X className="h-5 w-5" /> : key}
          </Button>
        ))}
      </div>
      <Button size="lg" className="w-full h-14 text-xl" onClick={onSubmit}>
        <Check className="h-6 w-6 mr-2" />
        Confirm
      </Button>
    </div>
  );
}

export default function POS() {
  const { t } = useTranslation(['common', 'orders', 'products', 'financial']);
  const { toast } = useToast();
  const { financialHelpers } = useSettings();
  
  const [currency, setCurrency] = useState<'EUR' | 'CZK'>(() => {
    return (localStorage.getItem('pos_currency') as 'EUR' | 'CZK') || 'EUR';
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(() => {
    return localStorage.getItem('pos_warehouse') || '';
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState('');
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<'success' | 'error' | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCashDialog, setShowCashDialog] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage');
  const [cartIdCounter, setCartIdCounter] = useState(0);
  const [showPayLaterCustomerSearch, setShowPayLaterCustomerSearch] = useState(false);
  const [payLaterCustomerSearchQuery, setPayLaterCustomerSearchQuery] = useState('');
  const [showQRCodePreview, setShowQRCodePreview] = useState(false);
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastBarcodeTime = useRef<number>(0);
  const barcodeBuffer = useRef<string>('');
  const cartScrollRef = useRef<HTMLDivElement>(null);
  const prevCartLengthRef = useRef<number>(0);

  useEffect(() => {
    localStorage.setItem('pos_currency', currency);
  }, [currency]);

  useEffect(() => {
    if (selectedWarehouse) {
      localStorage.setItem('pos_warehouse', selectedWarehouse);
    }
  }, [selectedWarehouse]);

  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  // Auto-scroll cart to bottom when new items are added
  useEffect(() => {
    if (cart.length > prevCartLengthRef.current && cartScrollRef.current) {
      // Scroll to bottom with smooth animation
      cartScrollRef.current.scrollTo({
        top: cartScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
    prevCartLengthRef.current = cart.length;
  }, [cart.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      
      if (now - lastBarcodeTime.current > 100) {
        barcodeBuffer.current = '';
      }
      lastBarcodeTime.current = now;

      if (e.key === 'Enter' && barcodeBuffer.current.length > 3) {
        e.preventDefault();
        processBarcode(barcodeBuffer.current);
        barcodeBuffer.current = '';
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (document.activeElement === barcodeInputRef.current) {
          return;
        }
        
        if (document.activeElement?.tagName !== 'INPUT' && 
            document.activeElement?.tagName !== 'TEXTAREA') {
          barcodeBuffer.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: productVariants = [] } = useQuery<any[]>({
    queryKey: ['/api/variants'],
  });

  const { data: bundles = [] } = useQuery<any[]>({
    queryKey: ['/api/bundles'],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
  });

  const { data: posSettings } = useQuery({
    queryKey: ['/api/settings/pos'],
  });

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p: any) => {
      if (p.category) cats.add(p.category);
    });
    return ['all', ...Array.from(cats)];
  }, [products]);

  const allItems = useMemo(() => [
    ...products.map((p: any) => ({ ...p, itemType: 'product' as const })),
    ...productVariants.map((v: any) => ({ 
      id: v.id,
      name: v.name,
      sku: v.sku,
      barcode: v.barcode,
      priceEur: v.priceEur,
      priceCzk: v.priceCzk,
      imageUrl: v.imageUrl,
      productId: v.productId,
      variantId: v.id,
      category: v.category,
      itemType: 'variant' as const,
    })),
    ...bundles.map((b: any) => ({
      id: b.id,
      name: b.name,
      sku: b.sku,
      priceEur: b.priceEur,
      priceCzk: b.priceCzk,
      bundleId: b.bundleId,
      itemType: 'bundle' as const
    }))
  ], [products, productVariants, bundles]);

  const filteredItems = useMemo(() => {
    let items = allItems;
    
    if (selectedCategory !== 'all') {
      items = items.filter((item: any) => item.category === selectedCategory);
    }
    
    if (searchQuery.trim()) {
      const results = fuzzySearch(items, searchQuery, {
        fields: ['name', 'sku', 'barcode'],
        threshold: 0.2,
        fuzzy: true,
        vietnameseNormalization: true,
      });
      items = results.map(r => r.item);
    }
    
    return items;
  }, [allItems, searchQuery, selectedCategory]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers.slice(0, 10);
    return fuzzySearch(customers, customerSearchQuery, {
      fields: ['firstName', 'lastName', 'company', 'email', 'phone'],
      threshold: 0.3,
      fuzzy: true,
    }).map(r => r.item).slice(0, 10);
  }, [customers, customerSearchQuery]);

  const filteredPayLaterCustomers = useMemo(() => {
    if (!payLaterCustomerSearchQuery.trim()) return customers.slice(0, 15);
    return fuzzySearch(customers, payLaterCustomerSearchQuery, {
      fields: ['firstName', 'lastName', 'company', 'email', 'phone', 'facebookName'],
      threshold: 0.3,
      fuzzy: true,
      vietnameseNormalization: true,
    }).map(r => r.item).slice(0, 15);
  }, [customers, payLaterCustomerSearchQuery]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  useEffect(() => {
    if (!selectedWarehouse && warehouses.length > 0) {
      const defaultId = (posSettings as any)?.defaultWarehouseId;
      const warehouseToSelect = defaultId 
        ? warehouses.find((w: any) => w.id === defaultId) || warehouses[0]
        : warehouses[0];
      setSelectedWarehouse(warehouseToSelect.id);
    }
  }, [posSettings, selectedWarehouse, warehouses]);

  useEffect(() => {
    if (cart.length === 0) return;

    setCart(prevCart => prevCart.map(cartItem => {
      const originalItem = allItems.find(item => 
        item.id === cartItem.id && 
        (item.itemType || 'product') === cartItem.type
      );

      if (!originalItem) return cartItem;

      const newPrice = currency === 'EUR' 
        ? parseFloat(originalItem.priceEur || '0') 
        : parseFloat(originalItem.priceCzk || '0');

      return { ...cartItem, price: newPrice };
    }));
  }, [currency]);

  const processBarcode = useCallback(async (barcode: string) => {
    const barcodeResults = fuzzySearch(allItems, barcode, {
      fields: ['barcode', 'sku'],
      threshold: 0.1,
      fuzzy: false,
      vietnameseNormalization: false,
    });

    if (barcodeResults.length > 0 && barcodeResults[0].score < 0.3) {
      const foundItem = barcodeResults[0].item;
      addToCart(foundItem);
      if (soundEnabled) await soundEffects.playSuccessBeep();
      setScanFeedback('success');
      toast({
        title: t('financial:addedToCart'),
        description: foundItem.name,
      });
    } else {
      if (soundEnabled) await soundEffects.playErrorBeep();
      setScanFeedback('error');
      toast({
        title: 'Product not found',
        description: `No product with barcode "${barcode}"`,
        variant: 'destructive',
      });
    }

    setTimeout(() => setScanFeedback(null), 500);
  }, [allItems, soundEnabled, t, toast]);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = barcodeInput.trim();
    if (!barcode) return;

    await processBarcode(barcode);
    setBarcodeInput('');
    barcodeInputRef.current?.focus();
  };

  const addToCart = (item: any) => {
    const price = currency === 'EUR' ? parseFloat(item.priceEur || '0') : parseFloat(item.priceCzk || '0');
    const itemType = item.itemType || 'product';
    const productId = itemType === 'variant' ? item.productId : item.id;
    const variantId = itemType === 'variant' ? item.id : undefined;
    const bundleId = itemType === 'bundle' ? item.bundleId || item.id : undefined;

    const existingItem = cart.find(cartItem => 
      cartItem.id === item.id && cartItem.type === itemType
    );

    if (existingItem) {
      updateQuantity(existingItem.cartId, existingItem.quantity + 1);
    } else {
      const newCartId = `cart-${cartIdCounter}`;
      setCartIdCounter(prev => prev + 1);
      setCart([...cart, {
        id: item.id,
        cartId: newCartId,
        productId,
        variantId,
        bundleId,
        name: item.name,
        price,
        quantity: 1,
        type: itemType,
        sku: item.sku,
        barcode: item.barcode,
        imageUrl: item.imageUrl,
      }]);
    }
  };

  const updateQuantity = (cartId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartId);
    } else {
      setCart(cart.map(item => 
        item.cartId === cartId ? { ...item, quantity } : item
      ));
    }
  };

  const removeFromCart = (cartId: string) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const clearCart = () => {
    setCart([]);
    setOrderNotes('');
    setSelectedCustomerId('');
    setDiscount(0);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = Math.max(0, subtotal - discount);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const customerName = selectedCustomer 
    ? `${selectedCustomer.firstName || ''} ${selectedCustomer.lastName || ''}`.trim() || selectedCustomer.company || 'Customer'
    : t('financial:walkInCustomer');

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedWarehouse) {
        throw new Error(t('financial:pleaseSelectWarehouse'));
      }

      const isPayLater = paymentMethod === 'pay_later';
      const orderData = {
        customerId: selectedCustomerId || null,
        warehouseId: selectedWarehouse,
        currency: currency,
        orderStatus: 'completed',
        paymentStatus: isPayLater ? 'unpaid' : 'paid',
        orderType: 'pos',
        items: cart.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          bundleId: item.bundleId,
          quantity: item.quantity,
          price: item.price.toFixed(2),
        })),
        subtotal: subtotal.toFixed(2),
        discount: discount.toFixed(2),
        total: total.toFixed(2),
        grandTotal: total.toFixed(2),
        paymentMethod: paymentMethod,
        fulfillmentStage: 'completed',
        customerEmail: selectedCustomer?.email || 'walkin@pos.local',
        customerName: customerName,
        customerPhone: selectedCustomer?.phone || '+420000000000',
        notes: orderNotes || undefined,
      };

      return await apiRequest('POST', '/api/orders', orderData);
    },
    onSuccess: (data: any) => {
      if (soundEnabled) soundEffects.playSuccessBeep();
      toast({
        title: t('common:success'),
        description: t('financial:saleCompletedSuccessfully'),
      });
      setLastSaleId(data.id);
      
      const cashReceivedNum = parseFloat(cashReceived) || 0;
      const newReceiptData: ReceiptData = {
        orderId: data.id,
        items: [...cart],
        subtotal,
        discount,
        total,
        currency,
        paymentMethod,
        customerName,
        notes: orderNotes,
        date: new Date(),
        cashReceived: paymentMethod === 'cash' ? cashReceivedNum : undefined,
        change: paymentMethod === 'cash' ? Math.max(0, cashReceivedNum - total) : undefined,
      };
      setReceiptData(newReceiptData);
      
      setShowPaymentDialog(false);
      setShowCashDialog(false);
      
      if (paymentMethod === 'qr_czk') {
        setShowQRCode(true);
      } else {
        setShowReceipt(true);
      }
      
      clearCart();
      setCashReceived('');
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('financial:failedToCompleteSale'),
        variant: "destructive",
      });
    },
  });

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: t('financial:cartEmpty'),
        description: t('financial:pleaseAddItemsToCart'),
        variant: 'destructive'
      });
      return;
    }

    if (!selectedWarehouse) {
      toast({
        title: t('financial:warehouseRequired'),
        description: t('financial:pleaseSelectWarehouse'),
        variant: 'destructive'
      });
      return;
    }

    setShowPaymentDialog(true);
  };

  const handlePaymentSelect = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method === 'cash') {
      setShowPaymentDialog(false);
      setShowCashDialog(true);
    } else {
      createOrderMutation.mutate();
    }
  };

  const handleCashPayment = () => {
    const cashAmount = parseFloat(cashReceived) || 0;
    if (cashAmount < total) {
      toast({
        title: 'Insufficient Amount',
        description: `Cash received (${currency} ${cashAmount.toFixed(2)}) is less than total (${currency} ${total.toFixed(2)})`,
        variant: 'destructive'
      });
      return;
    }
    createOrderMutation.mutate();
  };

  const handleApplyDiscount = () => {
    const inputValue = parseFloat(discountInput) || 0;
    let discountAmount: number;
    
    if (discountType === 'percentage') {
      if (inputValue > 100) {
        toast({
          title: 'Invalid Discount',
          description: 'Percentage cannot be greater than 100%',
          variant: 'destructive'
        });
        return;
      }
      discountAmount = (subtotal * inputValue) / 100;
    } else {
      discountAmount = inputValue;
    }
    
    if (discountAmount > subtotal) {
      toast({
        title: 'Invalid Discount',
        description: 'Discount cannot be greater than subtotal',
        variant: 'destructive'
      });
      return;
    }
    setDiscount(discountAmount);
    setShowDiscountDialog(false);
    setDiscountInput('');
  };

  const quickCashAmounts = useMemo(() => {
    const roundedTotal = Math.ceil(total);
    const amounts = [roundedTotal];
    
    if (currency === 'CZK') {
      [100, 200, 500, 1000, 2000].forEach(amt => {
        if (amt >= total && !amounts.includes(amt)) amounts.push(amt);
      });
    } else {
      [10, 20, 50, 100, 200].forEach(amt => {
        if (amt >= total && !amounts.includes(amt)) amounts.push(amt);
      });
    }
    
    return amounts.slice(0, 4);
  }, [total, currency]);

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    const iconClass = "h-6 w-6";
    switch (method) {
      case 'cash': return <Banknote className={iconClass} />;
      case 'card': return <CreditCard className={iconClass} />;
      case 'bank_transfer': return <Building2 className={iconClass} />;
      case 'bank_transfer_private': return <Building2 className={iconClass} />;
      case 'bank_transfer_invoice': return <FileText className={iconClass} />;
      case 'pay_later': return <Clock className={iconClass} />;
      case 'qr_czk': return <QrCode className={iconClass} />;
      default: return null;
    }
  };
  
  const getPaymentMethodLabel = (method: PaymentMethod) => {
    switch (method) {
      case 'cash': return 'Cash';
      case 'card': return 'Card';
      case 'bank_transfer': return 'Bank Transfer';
      case 'bank_transfer_private': return 'Privat Konto';
      case 'bank_transfer_invoice': return 'Invoice Transfer';
      case 'pay_later': return 'Pay Later';
      case 'qr_czk': return 'QR Code CZK';
      default: return method;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Left Panel - Products */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Receipt className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Point of Sale</h1>
                <p className="text-xs text-blue-100">Davie Supply POS System</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Warehouse Selector */}
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger className="w-40 h-10 bg-white/10 border-white/20 text-white" data-testid="select-warehouse">
                  <Warehouse className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse: any) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Currency Toggle */}
              <div className="flex bg-white/10 rounded-lg p-1">
                <Button
                  variant={currency === 'EUR' ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn("h-8 px-3", currency !== 'EUR' && "text-white hover:text-white hover:bg-white/10")}
                  onClick={() => setCurrency('EUR')}
                  data-testid="button-currency-eur"
                >
                  <Euro className="h-4 w-4 mr-1" />
                  EUR
                </Button>
                <Button
                  variant={currency === 'CZK' ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn("h-8 px-3", currency !== 'CZK' && "text-white hover:text-white hover:bg-white/10")}
                  onClick={() => setCurrency('CZK')}
                  data-testid="button-currency-czk"
                >
                  CZK
                </Button>
              </div>
              
              {/* Sound Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-white hover:bg-white/10"
                onClick={() => setSoundEnabled(!soundEnabled)}
                data-testid="button-toggle-sound"
              >
                {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Barcode Scanner Input */}
        <div className="bg-white dark:bg-gray-800 p-4 border-b shadow-sm">
          <form onSubmit={handleBarcodeSubmit} className="flex gap-3">
            <div className="relative flex-1">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-muted-foreground">
                <Scan className="h-5 w-5" />
                <div className="h-4 w-px bg-gray-300" />
                <Usb className="h-4 w-4" />
                <Bluetooth className="h-4 w-4" />
              </div>
              <Input
                ref={barcodeInputRef}
                placeholder="Scan barcode or enter SKU... (USB & Bluetooth scanners supported)"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className={cn(
                  "pl-28 h-14 text-lg font-medium border-2 transition-all duration-200",
                  scanFeedback === 'success' && "border-green-500 bg-green-50 dark:bg-green-900/20",
                  scanFeedback === 'error' && "border-red-500 bg-red-50 dark:bg-red-900/20",
                  !scanFeedback && "border-gray-200 dark:border-gray-700"
                )}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-testid="input-barcode"
              />
            </div>
            <Button type="submit" size="lg" className="h-14 px-6" data-testid="button-scan-submit">
              <Keyboard className="h-5 w-5 mr-2" />
              Enter
            </Button>
          </form>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white dark:bg-gray-800 px-4 py-3 border-b flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder={t('products:searchItems')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base"
              autoComplete="off"
              data-testid="input-search"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40 h-12" data-testid="select-category">
              <Grid3X3 className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* View Toggle */}
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-10 w-10"
              onClick={() => setViewMode('grid')}
              data-testid="button-view-grid"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-10 w-10"
              onClick={() => setViewMode('list')}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Products Grid/List */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredItems.map((product: any) => {
                  const cartItem = cart.find(item => item.id === product.id && item.type === (product.itemType || 'product'));
                  const isInCart = !!cartItem;
                  const price = currency === 'EUR' 
                    ? parseFloat(product.priceEur || '0')
                    : parseFloat(product.priceCzk || '0');

                  return (
                    <Card
                      key={`${product.itemType || 'product'}-${product.id}`}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-lg active:scale-[0.98]",
                        "border-2 relative overflow-hidden",
                        isInCart ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-primary/30"
                      )}
                      onClick={() => addToCart(product)}
                      data-testid={`card-product-${product.id}`}
                    >
                      {product.itemType === 'variant' && (
                        <Badge className="absolute top-2 left-2 z-10 bg-purple-600">V</Badge>
                      )}
                      {product.itemType === 'bundle' && (
                        <Badge className="absolute top-2 left-2 z-10 bg-orange-600">B</Badge>
                      )}

                      {isInCart && cartItem && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold z-10 shadow-lg">
                          {cartItem.quantity}
                        </div>
                      )}
                      
                      <CardContent className="p-0">
                        <div className="relative aspect-square bg-gray-50 dark:bg-gray-800">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-10 w-10 text-gray-300" />
                            </div>
                          )}
                        </div>
                        
                        <div className="p-2 space-y-0.5">
                          <h3 className="font-medium text-xs leading-snug break-words">
                            {product.name}
                          </h3>
                          {product.sku && (
                            <p className="text-[10px] text-muted-foreground font-mono truncate">{product.sku}</p>
                          )}
                          <p className="text-sm font-bold text-primary">
                            {currency} {price.toFixed(2)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredItems.map((product: any) => {
                  const cartItem = cart.find(item => item.id === product.id && item.type === (product.itemType || 'product'));
                  const isInCart = !!cartItem;
                  const price = currency === 'EUR' 
                    ? parseFloat(product.priceEur || '0')
                    : parseFloat(product.priceCzk || '0');

                  return (
                    <Card
                      key={`${product.itemType || 'product'}-${product.id}`}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md active:scale-[0.99]",
                        "border-2",
                        isInCart ? "border-primary bg-primary/5" : "border-transparent hover:border-primary/30"
                      )}
                      onClick={() => addToCart(product)}
                      data-testid={`card-product-list-${product.id}`}
                    >
                      <CardContent className="p-3 flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
                          ) : (
                            <Package className="h-8 w-8 text-gray-300" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-semibold text-base">{product.name}</h3>
                              {product.sku && (
                                <p className="text-sm text-muted-foreground font-mono">{product.sku}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xl font-bold text-primary">
                                {currency} {price.toFixed(2)}
                              </p>
                              {isInCart && cartItem && (
                                <Badge className="mt-1">{cartItem.quantity} in cart</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            
            {filteredItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Package className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">No products found</p>
                <p className="text-sm">Try adjusting your search or category filter</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-[420px] bg-white dark:bg-gray-800 border-l flex flex-col shadow-xl">
        {/* Cart Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Cart</h2>
                <p className="text-sm text-gray-300">{totalItems} items</p>
              </div>
            </div>
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-red-300 hover:text-red-200 hover:bg-red-500/20"
                data-testid="button-clear-cart"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Customer Selection */}
        <div className="p-3 border-b bg-gray-50 dark:bg-gray-900">
          <Button
            variant="outline"
            className="w-full h-12 justify-start text-left"
            onClick={() => setShowCustomerSearch(true)}
            data-testid="button-select-customer"
          >
            <User className="h-5 w-5 mr-3 text-muted-foreground" />
            <div className="flex-1">
              {selectedCustomer ? (
                <span className="font-medium">{customerName}</span>
              ) : (
                <span className="text-muted-foreground">Walk-in Customer (tap to select)</span>
              )}
            </div>
            {selectedCustomer && (
              <X 
                className="h-4 w-4 text-muted-foreground hover:text-foreground" 
                onClick={(e) => { e.stopPropagation(); setSelectedCustomerId(''); }}
              />
            )}
          </Button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto" ref={cartScrollRef}>
          <div className="p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ShoppingCart className="h-20 w-20 mb-4 opacity-20" />
                <p className="text-lg font-medium">Cart is empty</p>
                <p className="text-sm">Scan or click products to add</p>
              </div>
            ) : (
              cart.map((item) => (
                <Card key={item.cartId} className="overflow-hidden" data-testid={`cart-item-${item.cartId}`}>
                  <CardContent className="p-3">
                    <div className="flex gap-3">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-16 h-16 object-contain rounded-lg border bg-gray-50"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0 space-y-2">
                        <div>
                          <h4 className="font-semibold text-sm leading-tight line-clamp-1">{item.name}</h4>
                          {item.sku && (
                            <p className="text-xs text-muted-foreground">{item.sku}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                              data-testid={`button-decrease-${item.cartId}`}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="font-bold min-w-[2.5rem] text-center text-lg">
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                              data-testid={`button-increase-${item.cartId}`}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">
                              {currency} {(item.price * item.quantity).toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {currency} {item.price.toFixed(2)} each
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0 self-start"
                        onClick={() => removeFromCart(item.cartId)}
                        data-testid={`button-remove-${item.cartId}`}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Cart Footer */}
        {cart.length > 0 && (
          <div className="border-t bg-gray-50 dark:bg-gray-900 p-4 space-y-4">
            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowDiscountDialog(true)}
                data-testid="button-add-discount"
              >
                <Percent className="h-4 w-4 mr-1" />
                {discount > 0 ? `${currency} ${discount.toFixed(2)}` : 'Discount'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowNotesDialog(true)}
                data-testid="button-add-notes"
              >
                <FileText className="h-4 w-4 mr-1" />
                {orderNotes ? 'Edit Notes' : 'Add Notes'}
              </Button>
            </div>

            {/* Totals */}
            <div className="space-y-2 text-base">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{currency} {subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span className="font-medium">-{currency} {discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-primary">{currency} {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <Button
              size="lg"
              className="w-full h-16 text-xl font-bold"
              onClick={handleCheckout}
              disabled={createOrderMutation.isPending}
              data-testid="button-checkout"
            >
              {createOrderMutation.isPending ? (
                'Processing...'
              ) : (
                <>
                  <CreditCard className="h-6 w-6 mr-3" />
                  Pay {currency} {total.toFixed(2)}
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl">Select Payment Method</DialogTitle>
            <DialogDescription>
              Total: <span className="font-bold text-xl text-primary">{currency} {total.toFixed(2)}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-3 py-4">
            {/* Cash - Enabled */}
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 text-base hover:border-primary hover:bg-primary/5"
              onClick={() => handlePaymentSelect('cash')}
              disabled={createOrderMutation.isPending}
              data-testid="button-payment-cash"
            >
              <div className="p-3 rounded-full text-white bg-green-500">
                <Banknote className="h-6 w-6" />
              </div>
              Cash
            </Button>
            
            {/* Card - Disabled */}
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 text-base opacity-50 cursor-not-allowed"
              disabled={true}
              data-testid="button-payment-card"
            >
              <div className="p-3 rounded-full text-white bg-blue-500">
                <CreditCard className="h-6 w-6" />
              </div>
              <span className="flex items-center gap-1">
                Card
                <span className="text-[10px] text-muted-foreground">(Soon)</span>
              </span>
            </Button>
            
            {/* Bank Transfer - Privat Konto - Enabled */}
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 text-base hover:border-primary hover:bg-primary/5"
              onClick={() => handlePaymentSelect('bank_transfer_private')}
              disabled={createOrderMutation.isPending}
              data-testid="button-payment-bank-private"
            >
              <div className="p-3 rounded-full text-white bg-purple-500">
                <Building2 className="h-6 w-6" />
              </div>
              Privat Konto
            </Button>
            
            {/* Bank Transfer - Invoice - Disabled */}
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 text-base opacity-50 cursor-not-allowed"
              disabled={true}
              data-testid="button-payment-bank-invoice"
            >
              <div className="p-3 rounded-full text-white bg-indigo-500">
                <FileText className="h-6 w-6" />
              </div>
              <span className="flex flex-col items-center">
                <span>Invoice Transfer</span>
                <span className="text-[10px] text-muted-foreground">(Soon)</span>
              </span>
            </Button>
            
            {/* Pay Later - Enabled */}
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 text-base hover:border-primary hover:bg-primary/5"
              onClick={() => {
                setShowPaymentDialog(false);
                setPayLaterCustomerSearchQuery('');
                setShowPayLaterCustomerSearch(true);
              }}
              disabled={createOrderMutation.isPending}
              data-testid="button-payment-pay_later"
            >
              <div className="p-3 rounded-full text-white bg-amber-500">
                <Clock className="h-6 w-6" />
              </div>
              Pay Later
            </Button>
            
            {/* QR Code CZK - Enabled */}
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 text-base hover:border-primary hover:bg-primary/5"
              onClick={() => {
                setShowPaymentDialog(false);
                setShowQRCodePreview(true);
              }}
              disabled={createOrderMutation.isPending}
              data-testid="button-payment-qr_czk"
            >
              <div className="p-3 rounded-full text-white bg-cyan-500">
                <QrCode className="h-6 w-6" />
              </div>
              QR Code CZK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cash Payment Dialog */}
      <Dialog open={showCashDialog} onOpenChange={setShowCashDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-3">
              <Banknote className="h-8 w-8 text-green-600" />
              Cash Payment
            </DialogTitle>
            <DialogDescription>
              Total Due: <span className="font-bold text-2xl text-primary">{currency} {total.toFixed(2)}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-2 gap-2">
              {quickCashAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="lg"
                  className="h-14 text-lg font-bold"
                  onClick={() => setCashReceived(amount.toString())}
                  data-testid={`button-quick-cash-${amount}`}
                >
                  {currency} {amount}
                </Button>
              ))}
            </div>
            
            {/* Custom Amount Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Or enter custom amount:</label>
              <Input
                type="number"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder="0.00"
                className="h-14 text-2xl font-bold text-center"
                autoFocus
                data-testid="input-cash-amount"
              />
            </div>
            
            {/* Change Calculation */}
            {parseFloat(cashReceived) >= total && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-green-700 dark:text-green-300 font-medium">Change:</span>
                  <span className="text-3xl font-bold text-green-700 dark:text-green-300">
                    {currency} {(parseFloat(cashReceived) - total).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowCashDialog(false); setShowPaymentDialog(true); }}>
              Back
            </Button>
            <Button
              size="lg"
              className="flex-1"
              onClick={handleCashPayment}
              disabled={createOrderMutation.isPending || parseFloat(cashReceived) < total}
              data-testid="button-confirm-cash"
            >
              <Check className="h-5 w-5 mr-2" />
              Complete Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Search Dialog */}
      <Dialog open={showCustomerSearch} onOpenChange={setShowCustomerSearch}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              placeholder="Search by name, email, or phone..."
              value={customerSearchQuery}
              onChange={(e) => setCustomerSearchQuery(e.target.value)}
              className="h-12"
              autoFocus
              data-testid="input-customer-search"
            />
            
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full h-14 justify-start"
                  onClick={() => { setSelectedCustomerId(''); setShowCustomerSearch(false); }}
                  data-testid="button-walkin-customer"
                >
                  <User className="h-5 w-5 mr-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Walk-in Customer</span>
                </Button>
                
                {filteredCustomers.map((customer) => (
                  <Button
                    key={customer.id}
                    variant="outline"
                    className="w-full h-14 justify-start"
                    onClick={() => { setSelectedCustomerId(customer.id); setShowCustomerSearch(false); }}
                    data-testid={`button-customer-${customer.id}`}
                  >
                    <User className="h-5 w-5 mr-3" />
                    <div className="text-left">
                      <p className="font-medium">
                        {`${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.company || customer.email}
                      </p>
                      {customer.phone && (
                        <p className="text-xs text-muted-foreground">{customer.phone}</p>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay Later Customer Search Dialog */}
      <Dialog open={showPayLaterCustomerSearch} onOpenChange={setShowPayLaterCustomerSearch}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Select Customer for Pay Later
            </DialogTitle>
            <DialogDescription>
              Search by name, Facebook name, email, phone, or company
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              placeholder="Search customers (including Facebook name)..."
              value={payLaterCustomerSearchQuery}
              onChange={(e) => setPayLaterCustomerSearchQuery(e.target.value)}
              className="h-12"
              autoFocus
              data-testid="input-pay-later-customer-search"
            />
            
            <ScrollArea className="h-[350px]">
              <div className="space-y-2">
                {filteredPayLaterCustomers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No customers found</p>
                    <p className="text-sm">Try a different search term</p>
                  </div>
                ) : (
                  filteredPayLaterCustomers.map((customer) => (
                    <Button
                      key={customer.id}
                      variant="outline"
                      className="w-full min-h-[60px] h-auto py-3 justify-start"
                      onClick={() => { 
                        setSelectedCustomerId(customer.id); 
                        setShowPayLaterCustomerSearch(false);
                        handlePaymentSelect('pay_later');
                      }}
                      data-testid={`button-pay-later-customer-${customer.id}`}
                    >
                      <User className="h-5 w-5 mr-3 flex-shrink-0" />
                      <div className="text-left flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {`${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.company || customer.email || 'Unknown'}
                        </p>
                        {customer.facebookName && (
                          <p className="text-xs text-blue-500 dark:text-blue-400 truncate">
                            FB: {customer.facebookName}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-1">
                          {customer.phone && (
                            <span className="text-xs text-muted-foreground">{customer.phone}</span>
                          )}
                          {customer.email && !customer.phone && (
                            <span className="text-xs text-muted-foreground truncate">{customer.email}</span>
                          )}
                        </div>
                      </div>
                    </Button>
                  ))
                )}
              </div>
            </ScrollArea>
            
            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={() => { 
                  setShowPayLaterCustomerSearch(false); 
                  setShowPaymentDialog(true); 
                }}
              >
                Back to Payment Options
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code CZK Preview Dialog */}
      <Dialog open={showQRCodePreview} onOpenChange={setShowQRCodePreview}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-6 w-6 text-cyan-500" />
              {t('financial:qrCodeCzk')}
            </DialogTitle>
            <DialogDescription>
              {t('financial:qrCodeCzkDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Payment Summary Card */}
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border border-cyan-200 dark:border-cyan-800 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('common:items')}</span>
                <span className="font-medium">{cart.length} {cart.length === 1 ? 'item' : 'items'}</span>
              </div>
              {discount > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('common:subtotal')}</span>
                    <span className="font-medium">{currency} {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                    <span className="text-sm">{t('common:discount')}</span>
                    <span className="font-medium">-{currency} {discount.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="border-t border-cyan-200 dark:border-cyan-700 pt-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{t('common:total')}</span>
                  <span className="text-2xl font-bold text-primary">{currency} {total.toFixed(2)}</span>
                </div>
              </div>
              {currency === 'EUR' && (
                <div className="flex justify-between items-center bg-white/50 dark:bg-slate-800/50 rounded-lg p-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Amount in CZK</span>
                  <span className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
                    CZK {(total * 25).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
            
            {/* QR Code */}
            <div className="flex justify-center">
              <QRCodeCZK 
                amount={currency === 'CZK' ? total : total * 25} 
                orderId={`POS-${Date.now()}`}
                scanLabel={t('financial:scanQrToPay')}
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button 
              variant="outline" 
              onClick={() => { 
                setShowQRCodePreview(false); 
                setShowPaymentDialog(true); 
              }}
              className="w-full sm:w-auto"
            >
              Back
            </Button>
            <Button
              size="lg"
              className="flex-1 bg-cyan-600 hover:bg-cyan-700"
              onClick={() => {
                setShowQRCodePreview(false);
                handlePaymentSelect('qr_czk');
              }}
              disabled={createOrderMutation.isPending}
              data-testid="button-confirm-qr-payment"
            >
              {createOrderMutation.isPending ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Complete Sale
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order Notes</DialogTitle>
          </DialogHeader>
          <Textarea
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="Add any notes for this order..."
            className="min-h-[120px]"
            data-testid="textarea-order-notes"
          />
          <DialogFooter>
            <Button onClick={() => setShowNotesDialog(false)}>Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discount Dialog */}
      <Dialog open={showDiscountDialog} onOpenChange={setShowDiscountDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Apply Discount
            </DialogTitle>
            <DialogDescription>
              Subtotal: <span className="font-semibold">{currency} {subtotal.toFixed(2)}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Discount Type Toggle */}
            <div className="flex rounded-lg border p-1 bg-muted/30">
              <Button
                variant={discountType === 'percentage' ? 'default' : 'ghost'}
                className="flex-1 h-10"
                onClick={() => { setDiscountType('percentage'); setDiscountInput(''); }}
                data-testid="button-discount-type-percentage"
              >
                <Percent className="h-4 w-4 mr-2" />
                Percentage
              </Button>
              <Button
                variant={discountType === 'amount' ? 'default' : 'ghost'}
                className="flex-1 h-10"
                onClick={() => { setDiscountType('amount'); setDiscountInput(''); }}
                data-testid="button-discount-type-amount"
              >
                {currency === 'EUR' ? <Euro className="h-4 w-4 mr-2" /> : <DollarSign className="h-4 w-4 mr-2" />}
                Fixed Amount
              </Button>
            </div>
            
            {/* Input with dynamic placeholder */}
            <div className="relative">
              <Input
                type="number"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder={discountType === 'percentage' ? 'Enter percentage (e.g., 10)' : `Enter amount (e.g., 5.00)`}
                className="h-14 text-xl text-center pr-12"
                autoFocus
                data-testid="input-discount"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">
                {discountType === 'percentage' ? '%' : currency}
              </span>
            </div>
            
            {/* Quick Discount Buttons */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Quick Select:</p>
              <div className="grid grid-cols-4 gap-2">
                {discountType === 'percentage' ? (
                  [5, 10, 15, 20].map((percent) => (
                    <Button
                      key={percent}
                      variant="outline"
                      size="sm"
                      onClick={() => setDiscountInput(percent.toString())}
                      data-testid={`button-discount-${percent}`}
                    >
                      {percent}%
                    </Button>
                  ))
                ) : (
                  (currency === 'EUR' ? [5, 10, 20, 50] : [50, 100, 200, 500]).map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => setDiscountInput(amount.toString())}
                      data-testid={`button-discount-amount-${amount}`}
                    >
                      {currency} {amount}
                    </Button>
                  ))
                )}
              </div>
            </div>
            
            {/* Discount Preview */}
            {discountInput && parseFloat(discountInput) > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-green-700 dark:text-green-300">Discount:</span>
                  <span className="font-bold text-green-700 dark:text-green-300">
                    -{currency} {discountType === 'percentage' 
                      ? ((subtotal * parseFloat(discountInput)) / 100).toFixed(2)
                      : parseFloat(discountInput).toFixed(2)
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-green-700 dark:text-green-300">New Total:</span>
                  <span className="font-bold text-lg text-green-700 dark:text-green-300">
                    {currency} {discountType === 'percentage'
                      ? (subtotal - (subtotal * parseFloat(discountInput)) / 100).toFixed(2)
                      : (subtotal - parseFloat(discountInput)).toFixed(2)
                    }
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2 sm:gap-2">
            <Button 
              variant="outline" 
              onClick={() => { setDiscount(0); setDiscountInput(''); setShowDiscountDialog(false); }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
            <Button onClick={handleApplyDiscount} data-testid="button-apply-discount" disabled={!discountInput || parseFloat(discountInput) <= 0}>
              <Check className="h-4 w-4 mr-1" />
              Apply Discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              Sale Complete!
            </DialogTitle>
          </DialogHeader>
          {receiptData && (
            <ThermalReceipt 
              data={receiptData} 
              onClose={() => setShowReceipt(false)}
              onPrint={() => {}}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('financial:qrCodeCzk')}</DialogTitle>
            <DialogDescription>
              {t('financial:qrCodeCzkDescription')}
            </DialogDescription>
          </DialogHeader>
          {receiptData && (
            <div className="flex flex-col items-center gap-4">
              <QRCodeCZK 
                amount={currency === 'CZK' ? receiptData.total : financialHelpers.convertCurrency(receiptData.total, 'EUR', 'CZK')} 
                orderId={receiptData.orderId}
                scanLabel={t('financial:scanQrToPay')}
              />
              <div className="flex gap-2 w-full">
                <Button 
                  className="flex-1" 
                  onClick={() => {
                    setShowQRCode(false);
                    setShowReceipt(true);
                  }}
                  data-testid="button-show-receipt-from-qr"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowQRCode(false)}
                  data-testid="button-close-qr"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
