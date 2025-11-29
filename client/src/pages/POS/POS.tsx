import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  ChevronDown,
  ChevronUp,
  User,
  StickyNote,
  Printer,
  QrCode,
  Clock,
  AlertTriangle,
  Banknote,
  Building2
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
}

interface ReceiptData {
  orderId: string;
  items: CartItem[];
  subtotal: number;
  total: number;
  currency: string;
  paymentMethod: string;
  customerName: string;
  notes: string;
  date: Date;
}

type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'pay_later' | 'qr_czk';

function generateQRCodeSVG(data: string, size: number = 200): string {
  const encodedData = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}&format=svg`;
}

function QRCodeCZK({ amount, orderId, scanLabel }: { amount: number; orderId: string; scanLabel?: string }) {
  const spdString = `SPD*1.0*ACC:CZ6508000000192000145399*AM:${amount.toFixed(2)}*CC:CZK*MSG:POS Sale ${orderId}`;
  const qrUrl = generateQRCodeSVG(spdString, 200);
  
  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-white rounded-lg">
      <img 
        src={qrUrl} 
        alt="Czech Payment QR Code" 
        className="w-48 h-48 border-2 border-gray-200 rounded"
        data-testid="img-qr-code-czk"
      />
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-gray-700">{scanLabel || 'Scan to pay with Czech bank transfer'}</p>
        <p className="text-lg font-bold text-primary">CZK {amount.toFixed(2)}</p>
        <p className="text-xs text-gray-500 break-all max-w-[200px]">{spdString}</p>
      </div>
    </div>
  );
}

function ThermalReceipt({ data, onClose }: { data: ReceiptData; onClose: () => void }) {
  const { t } = useTranslation(['common', 'financial']);
  
  const handlePrint = () => {
    window.print();
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
          body * {
            visibility: hidden;
          }
          .thermal-receipt, .thermal-receipt * {
            visibility: visible;
          }
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
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      
      <div className="thermal-receipt bg-white p-4 max-w-[300px] mx-auto font-mono text-sm">
        <div className="text-center border-b-2 border-dashed border-gray-300 pb-3 mb-3">
          <h2 className="text-lg font-bold">DAVIE SUPPLY</h2>
          <p className="text-xs text-gray-600">Point of Sale Receipt</p>
        </div>
        
        <div className="space-y-1 text-xs border-b border-dashed border-gray-300 pb-3 mb-3">
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{data.date.toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Time:</span>
            <span>{data.date.toLocaleTimeString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Order:</span>
            <span>{data.orderId}</span>
          </div>
          <div className="flex justify-between">
            <span>Customer:</span>
            <span>{data.customerName}</span>
          </div>
        </div>
        
        <div className="border-b border-dashed border-gray-300 pb-3 mb-3">
          <div className="font-bold mb-2">Items:</div>
          {data.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-xs mb-1">
              <span className="flex-1 truncate pr-2">
                {item.quantity}x {item.name}
              </span>
              <span className="whitespace-nowrap">
                {data.currency} {(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        
        <div className="space-y-1 text-xs border-b border-dashed border-gray-300 pb-3 mb-3">
          <div className="flex justify-between">
            <span>{t('financial:subtotal')}:</span>
            <span>{data.currency} {data.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm">
            <span>{t('financial:total')}:</span>
            <span>{data.currency} {data.total.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>{t('financial:paymentMethod')}:</span>
            <span>{paymentMethodLabels[data.paymentMethod as PaymentMethod] || data.paymentMethod}</span>
          </div>
          {data.notes && (
            <div className="mt-2">
              <span className="font-medium">Notes:</span>
              <p className="text-gray-600 mt-1">{data.notes}</p>
            </div>
          )}
        </div>
        
        <div className="text-center mt-4 pt-3 border-t-2 border-dashed border-gray-300">
          <p className="text-xs text-gray-600">Thank you for your purchase!</p>
        </div>
      </div>
      
      <div className="no-print flex gap-2 justify-center mt-4">
        <Button onClick={handlePrint} data-testid="button-print-receipt">
          <Printer className="h-4 w-4 mr-2" />
          Print Receipt
        </Button>
        <Button variant="outline" onClick={onClose} data-testid="button-close-receipt">
          {t('common:close')}
        </Button>
      </div>
    </div>
  );
}

export default function POS() {
  const { t } = useTranslation(['common', 'orders', 'products', 'financial']);
  const { toast } = useToast();
  const { financialHelpers } = useSettings();
  const [currency, setCurrency] = useState<'EUR' | 'CZK'>('EUR');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(() => {
    return localStorage.getItem('pos_warehouse') || '';
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<'success' | 'error' | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  const { data: productVariants = [] } = useQuery<any[]>({
    queryKey: ['/api/variants'],
    queryFn: async () => {
      const response = await fetch('/api/variants');
      if (!response.ok) throw new Error('Failed to fetch variants');
      return response.json();
    },
  });

  const { data: bundles = [] } = useQuery<any[]>({
    queryKey: ['/api/bundles']
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    queryFn: async () => {
      const response = await fetch('/api/customers');
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json();
    },
  });

  const warehousesQuery = useQuery({
    queryKey: ['/api/warehouses'],
    queryFn: async () => {
      const response = await fetch('/api/warehouses');
      if (!response.ok) throw new Error('Failed to fetch warehouses');
      return response.json();
    },
  });
  const warehouses = warehousesQuery.data || [];

  const posSettingsQuery = useQuery({
    queryKey: ['/api/settings/pos'],
    queryFn: async () => {
      const response = await fetch('/api/settings/pos');
      if (!response.ok) {
        throw new Error('Failed to fetch POS settings');
      }
      return response.json();
    },
  });
  const posSettings = posSettingsQuery.data;

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

  const searchResults = searchQuery.trim()
    ? fuzzySearch(allItems, searchQuery, {
        fields: ['name', 'sku', 'barcode'],
        threshold: 0.2,
        fuzzy: true,
        vietnameseNormalization: true,
      })
    : allItems.map(item => ({ item, score: 0 }));

  const displayProducts = searchResults.map(r => r.item);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = barcodeInput.trim();
    if (!barcode) return;

    const barcodeResults = fuzzySearch(allItems, barcode, {
      fields: ['barcode', 'sku'],
      threshold: 0.1,
      fuzzy: false,
      vietnameseNormalization: false,
    });

    if (barcodeResults.length > 0 && barcodeResults[0].score < 0.3) {
      const foundItem = barcodeResults[0].item;
      addToCart(foundItem);
      await soundEffects.playSuccessBeep();
      setScanFeedback('success');
      toast({
        title: t('financial:addedToCart'),
        description: foundItem.name,
      });
    } else {
      await soundEffects.playErrorBeep();
      setScanFeedback('error');
      toast({
        title: 'Product not found',
        description: `No product with barcode "${barcode}"`,
        variant: 'destructive',
      });
    }

    setBarcodeInput('');
    setTimeout(() => setScanFeedback(null), 500);
    barcodeInputRef.current?.focus();
  };

  useEffect(() => {
    if (posSettingsQuery.isLoading || warehousesQuery.isLoading) return;
    if (!warehouses || warehouses.length === 0) return;
    
    if (!selectedWarehouse) {
      const defaultId = posSettings?.defaultWarehouseId;
      const warehouseToSelect = defaultId 
        ? warehouses.find((w: any) => w.id === defaultId) || warehouses[0]
        : warehouses[0];
      setSelectedWarehouse(warehouseToSelect.id);
    }
  }, [posSettings, posSettingsQuery.isLoading, warehousesQuery.isLoading, selectedWarehouse, warehouses]);

  useEffect(() => {
    if (selectedWarehouse) {
      localStorage.setItem('pos_warehouse', selectedWarehouse);
    }
  }, [selectedWarehouse]);

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

      return {
        ...cartItem,
        price: newPrice
      };
    }));
  }, [currency]);

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
      updateQuantity(existingItem.id, existingItem.quantity + 1);
    } else {
      setCart([...cart, {
        id: item.id,
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

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
    } else {
      setCart(cart.map(item => 
        item.id === id ? { ...item, quantity } : item
      ));
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setCartOpen(false);
    setOrderNotes('');
    setSelectedCustomerId('');
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal;
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
      toast({
        title: t('common:success'),
        description: t('financial:saleCompletedSuccessfully'),
      });
      setLastSaleId(data.id);
      
      const newReceiptData: ReceiptData = {
        orderId: data.id,
        items: [...cart],
        subtotal,
        total,
        currency,
        paymentMethod,
        customerName,
        notes: orderNotes,
        date: new Date(),
      };
      setReceiptData(newReceiptData);
      
      if (paymentMethod === 'qr_czk') {
        setShowQRCode(true);
      } else {
        setShowReceipt(true);
      }
      
      clearCart();
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

  const generateInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!lastSaleId) {
        throw new Error('No recent sale to generate invoice for');
      }

      const invoiceData = {
        posSaleId: lastSaleId,
        status: 'generated' as const,
        invoiceNumber: `INV-${Date.now()}`,
      };

      const validatedData = insertInvoiceSchema.parse(invoiceData);
      return await apiRequest('POST', '/api/invoices', validatedData);
    },
    onSuccess: () => {
      toast({
        title: t('common:success'),
        description: t('financial:invoiceGeneratedSuccessfully'),
      });
      setLastSaleId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('financial:failedToGenerateInvoice'),
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

    createOrderMutation.mutate();
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'cash': return <Banknote className="h-4 w-4" />;
      case 'card': return <CreditCard className="h-4 w-4" />;
      case 'bank_transfer': return <Building2 className="h-4 w-4" />;
      case 'pay_later': return <Clock className="h-4 w-4" />;
      case 'qr_czk': return <QrCode className="h-4 w-4" />;
      default: return null;
    }
  };

  const CartContent = ({ showHeader = true }: { showHeader?: boolean }) => (
    <>
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">
            {t('financial:cart')} ({totalItems} {t('common:items')})
          </h3>
          {cart.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCart}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
              data-testid="button-clear-cart"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {t('common:clear')}
            </Button>
          )}
        </div>
      )}

      {selectedCustomer && (
        <div className="mb-3 p-2 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-primary" />
            <span className="font-medium">{customerName}</span>
          </div>
        </div>
      )}

      <div className="space-y-3 flex-1">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ShoppingCart className="h-16 w-16 mb-4 opacity-30" />
            <p>{t('financial:cartIsEmpty')}</p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-450px)] lg:h-[calc(100vh-500px)]">
            <div className="space-y-2 pr-4">
              {cart.map((item) => (
                <Card key={item.id} className="p-3">
                  <div className="flex gap-3">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700 shrink-0"
                        data-testid={`img-cart-item-${item.id}`}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0 space-y-1">
                      <div>
                        <h4 className="font-semibold text-xs leading-tight break-words">{item.name}</h4>
                        {item.sku && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{t('financial:sku')}: {item.sku}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs">
                          <span className="text-muted-foreground">{t('financial:unit')}: </span>
                          <span className="font-semibold text-primary">
                            {currency} {item.price.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            data-testid={`button-decrease-${item.id}`}
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </Button>
                          <span className="font-bold min-w-[2rem] text-center text-sm">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            data-testid={`button-increase-${item.id}`}
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t">
                        <div className="text-xs">
                          <span className="text-muted-foreground">{t('financial:subtotal')}: </span>
                          <span className="font-bold text-sm text-primary">
                            {currency} {(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 -mr-2"
                          onClick={() => removeFromCart(item.id)}
                          data-testid={`button-remove-${item.id}`}
                        >
                          <X className="h-3 w-3 mr-0.5" />
                          {t('common:remove')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {cart.length > 0 && (
        <div className="pt-3 border-t space-y-3 mt-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              Customer
            </label>
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
              <SelectTrigger className="w-full h-9 text-sm" data-testid="select-customer">
                <SelectValue placeholder={t('financial:walkInCustomer')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  <span className="text-muted-foreground">{t('financial:walkInCustomer')}</span>
                </SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {`${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.company || customer.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between h-8 px-2" data-testid="button-toggle-notes">
                <span className="flex items-center gap-1 text-xs">
                  <StickyNote className="h-3 w-3" />
                  Order Notes
                  {orderNotes && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">Has notes</Badge>}
                </span>
                {notesOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <Textarea
                placeholder="Add notes for this order..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="min-h-[60px] text-sm"
                data-testid="textarea-order-notes"
              />
            </CollapsibleContent>
          </Collapsible>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('financial:selectPaymentMethod')}</label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger className="w-full h-9 text-sm" data-testid="select-payment-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">
                  <span className="flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    {t('financial:cash')}
                  </span>
                </SelectItem>
                <SelectItem value="card">
                  <span className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    {t('financial:creditCard')}
                  </span>
                </SelectItem>
                <SelectItem value="bank_transfer">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {t('financial:bankTransfer')}
                  </span>
                </SelectItem>
                <SelectItem value="pay_later">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pay Later
                  </span>
                </SelectItem>
                <SelectItem value="qr_czk">
                  <span className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    QR Code CZK
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {paymentMethod === 'pay_later' && (
              <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-xs text-yellow-700 dark:text-yellow-300">
                  This will create an unpaid order
                </span>
              </div>
            )}
            
            {paymentMethod === 'qr_czk' && currency !== 'CZK' && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                <QrCode className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-blue-700 dark:text-blue-300">
                  QR Code will show amount in CZK
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-base font-bold pt-2">
            <span className="text-sm">{t('financial:total')}</span>
            <span className="text-primary text-lg">{currency} {total.toFixed(2)}</span>
          </div>
          
          <Button
            size="lg"
            className="w-full h-11"
            onClick={handleCheckout}
            disabled={createOrderMutation.isPending}
            data-testid="button-checkout"
          >
            {createOrderMutation.isPending ? (
              t('common:processing')
            ) : (
              <>
                {getPaymentMethodIcon(paymentMethod)}
                <span className="ml-2">{t('financial:completeSale')}</span>
              </>
            )}
          </Button>

          {lastSaleId && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9"
                onClick={() => setShowReceipt(true)}
                data-testid="button-print-receipt-open"
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Receipt
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9"
                onClick={() => generateInvoiceMutation.mutate()}
                disabled={generateInvoiceMutation.isPending}
                data-testid="button-generate-invoice"
              >
                {generateInvoiceMutation.isPending ? (
                  t('common:processing')
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    {t('financial:generateInvoice')}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-background overflow-hidden">
      <div className="flex flex-col flex-1 lg:w-[70%] overflow-hidden">
        <div className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-lg">
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold">{t('financial:pos')}</h1>
              <div className="flex items-center gap-2">
                <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                  <SelectTrigger className="w-32 h-8 bg-primary-foreground text-primary border-0 text-xs" data-testid="select-warehouse">
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
                <Select value={currency} onValueChange={(v) => setCurrency(v as 'EUR' | 'CZK')}>
                  <SelectTrigger className="w-16 h-8 bg-primary-foreground text-primary border-0 text-sm" data-testid="select-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="CZK">CZK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <form onSubmit={handleBarcodeSubmit} className="relative">
              <Scan className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                ref={barcodeInputRef}
                placeholder="Scan barcode or enter SKU..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className={cn(
                  "pl-10 pr-10 h-11 bg-white dark:bg-slate-800 border-2 transition-all duration-200",
                  scanFeedback === 'success' && "border-green-500 bg-green-50 dark:bg-green-900/20",
                  scanFeedback === 'error' && "border-red-500 bg-red-50 dark:bg-red-900/20",
                  !scanFeedback && "border-transparent"
                )}
                data-testid="input-barcode"
              />
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-9 w-9 text-primary"
                data-testid="button-scan-submit"
              >
                <Check className="h-5 w-5" />
              </Button>
            </form>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder={t('products:searchItems')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-white dark:bg-slate-800 border-0"
                data-testid="input-search"
              />
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 pb-28 lg:pb-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2">
            {displayProducts.map((product: any) => {
              const cartItem = cart.find(item => item.id === product.id);
              const isInCart = !!cartItem;
              const price = currency === 'EUR' 
                ? parseFloat(product.priceEur || '0')
                : parseFloat(product.priceCzk || '0');

              return (
                <Card
                  key={product.id}
                  className={cn(
                    "cursor-pointer transition-all active:scale-95",
                    "border-2 relative overflow-hidden",
                    isInCart ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  )}
                  onClick={() => addToCart(product)}
                  data-testid={`card-product-${product.id}`}
                >
                  {product.itemType === 'variant' && (
                    <div className="absolute top-1 left-1 bg-purple-600 text-white rounded px-1.5 py-0.5 text-[10px] font-semibold z-10">
                      V
                    </div>
                  )}
                  {product.itemType === 'bundle' && (
                    <div className="absolute top-1 left-1 bg-orange-600 text-white rounded px-1.5 py-0.5 text-[10px] font-semibold z-10">
                      B
                    </div>
                  )}

                  {isInCart && cartItem && (
                    <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold z-10">
                      {cartItem.quantity}
                    </div>
                  )}
                  
                  <CardContent className="p-0">
                    <div className="relative h-24 sm:h-28 lg:h-32 bg-muted/30 border-b">
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    
                    <div className="p-2 space-y-1">
                      <h3 className="font-medium text-xs sm:text-sm leading-tight line-clamp-2 min-h-[2rem]">
                        {product.name}
                      </h3>
                      {product.sku && (
                        <p className="text-[10px] text-muted-foreground truncate">{product.sku}</p>
                      )}
                      <p className="text-sm sm:text-base font-bold text-primary">
                        {currency} {price.toFixed(2)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
        </ScrollArea>
      </div>

      <div className="hidden lg:flex lg:flex-col lg:w-[30%] border-l bg-card sticky top-0 h-screen">
        <div className="p-4 border-b bg-primary text-primary-foreground">
          <h2 className="text-xl font-bold">{t('financial:cart')}</h2>
        </div>
        <div className="flex flex-col p-4 overflow-hidden h-full">
          <CartContent showHeader={false} />
        </div>
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-50">
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <span className="font-semibold">{totalItems} {t('common:items')}</span>
            </div>
            <div className="text-lg font-bold text-primary">
              {currency} {total.toFixed(2)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="w-full h-12"
                  disabled={cart.length === 0}
                  data-testid="button-view-cart"
                >
                  {t('financial:viewCart')}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh]">
                <SheetHeader>
                  <SheetTitle className="flex items-center justify-between">
                    <span>{t('financial:cart')} ({totalItems} {t('common:items')})</span>
                    {cart.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearCart}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                        data-testid="button-clear-cart-mobile"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        {t('common:clear')}
                      </Button>
                    )}
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-4 flex flex-col h-[calc(85vh-120px)]">
                  <CartContent showHeader={false} />
                </div>
              </SheetContent>
            </Sheet>

            <Button 
              size="lg"
              className="w-full h-12"
              onClick={handleCheckout}
              disabled={cart.length === 0 || createOrderMutation.isPending}
              data-testid="button-quick-checkout"
            >
              {createOrderMutation.isPending ? (
                t('common:processing')
              ) : (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  {t('financial:checkout')}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('financial:receipt')}</DialogTitle>
            <DialogDescription>
              {t('financial:printOrSaveReceipt')}
            </DialogDescription>
          </DialogHeader>
          {receiptData && (
            <ThermalReceipt 
              data={receiptData} 
              onClose={() => setShowReceipt(false)} 
            />
          )}
        </DialogContent>
      </Dialog>

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
                  {t('common:print')}
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowQRCode(false)}
                  data-testid="button-close-qr"
                >
                  {t('common:close')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
