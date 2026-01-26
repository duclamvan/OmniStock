import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { usePageTitle } from '@/hooks/use-page-title';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Keyboard,
  Download,
  Loader2
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, parseDecimal } from '@/lib/utils';
import { fuzzySearch } from '@/lib/fuzzySearch';
import type { Product, Customer, Category } from '@shared/schema';
import { insertInvoiceSchema } from '@shared/schema';
import { useSettings } from '@/contexts/SettingsContext';
import { convertCurrency } from '@/lib/currencyUtils';
import { useTranslation } from 'react-i18next';
import { soundEffects } from '@/utils/soundEffects';
import { ThermalReceipt, type ReceiptData, type CompanyInfo } from '@/components/orders/ThermalReceipt';
import WarehouseLocationSelector from '@/components/WarehouseLocationSelector';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin } from 'lucide-react';


interface VariantSelection {
  variantId: string;
  variantName: string;
  quantity: number;
  sku?: string;
  locationId?: string;
  locationCode?: string;
}

interface CartItem {
  id: string;
  cartId: string;
  productId?: string;
  variantId?: string;
  bundleId?: string;
  name: string;
  price: number;
  quantity: number;
  type: 'product' | 'variant' | 'bundle' | 'custom' | 'variant_group';
  sku?: string;
  barcode?: string;
  imageUrl?: string;
  discount?: number;
  cost?: number;
  profit?: number;
  variantSelections?: VariantSelection[];
  variantSummary?: string;
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


function NumPad({ value, onChange, onSubmit, label }: { 
  value: string; 
  onChange: (val: string) => void; 
  onSubmit: () => void;
  label: string;
}) {
  const { t } = useTranslation(['financial']);
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
        {t('financial:confirm')}
      </Button>
    </div>
  );
}

export default function POS() {
  usePageTitle('nav.pos', 'Point of Sale');
  const { t } = useTranslation(['pos', 'common', 'orders', 'products', 'financial']);
  const { toast } = useToast();
  const { financialHelpers } = useSettings();
  const [, setLocation] = useLocation();
  
  const [currency, setCurrency] = useState<'EUR' | 'CZK'>(() => {
    return (localStorage.getItem('pos_currency') as 'EUR' | 'CZK') || 'EUR';
  });
  
  // Currency symbol helper - € for EUR, Kč for CZK
  const currencySymbol = currency === 'EUR' ? '€' : 'Kč';
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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
  
  // Variant selection modal state
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<any>(null);
  const [variantQuantities, setVariantQuantities] = useState<Record<string, number>>({});
  const [quickVariantInput, setQuickVariantInput] = useState('');
  
  // Variant location modal state
  const [showVariantLocationModal, setShowVariantLocationModal] = useState(false);
  const [variantLocationCode, setVariantLocationCode] = useState('');
  const [variantLocationIsPrimary, setVariantLocationIsPrimary] = useState(true);
  
  // Custom Item state
  const [showCustomItemDialog, setShowCustomItemDialog] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemCost, setCustomItemCost] = useState('');
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cashInputRef = useRef<HTMLInputElement>(null);
  const lastBarcodeTime = useRef<number>(0);
  const barcodeBuffer = useRef<string>('');
  const cartScrollRef = useRef<HTMLDivElement>(null);
  const prevCartLengthRef = useRef<number>(0);
  const quantityInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [focusedCartItemId, setFocusedCartItemId] = useState<string | null>(null);

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

  // Focus quantity input when an item is added to cart
  useEffect(() => {
    if (focusedCartItemId) {
      setTimeout(() => {
        const input = quantityInputRefs.current[focusedCartItemId];
        if (input) {
          input.focus();
          input.select();
        }
        setFocusedCartItemId(null);
      }, 100);
    }
  }, [focusedCartItemId]);

  // Reset cash state when dialog opens (input resets via key prop)
  useEffect(() => {
    if (showCashDialog) {
      setCashReceived('');
    }
  }, [showCashDialog]);

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
    staleTime: 60000, // 1 minute
  });

  const { data: productVariants = [] } = useQuery<any[]>({
    queryKey: ['/api/variants'],
    staleTime: 60000, // 1 minute
  });

  const { data: bundles = [] } = useQuery<any[]>({
    queryKey: ['/api/bundles'],
    staleTime: 60000, // 1 minute
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    staleTime: 60000, // 1 minute
  });

  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
    staleTime: 120000, // 2 minutes - warehouses rarely change
  });

  const { data: posSettings } = useQuery({
    queryKey: ['/api/settings/pos'],
    staleTime: 120000, // 2 minutes - settings rarely change
  });

  const { generalSettings } = useSettings();

  const companyInfo: CompanyInfo = useMemo(() => ({
    name: generalSettings?.companyName,
    address: generalSettings?.companyAddress,
    city: generalSettings?.companyCity,
    zip: generalSettings?.companyZip,
    country: generalSettings?.companyCountry,
    phone: generalSettings?.companyPhone,
    ico: generalSettings?.companyIco,
    vatId: generalSettings?.companyVatId,
    website: generalSettings?.companyWebsite,
  }), [generalSettings]);

  const { data: categoriesData = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    staleTime: 120000, // 2 minutes - categories rarely change
  });

  const categories = useMemo(() => {
    const categoryNames = categoriesData.map((cat: Category) => cat.name);
    return ['all', ...categoryNames];
  }, [categoriesData]);

  const allItems = useMemo(() => [
    ...products.map((p: any) => ({ ...p, itemType: 'product' as const })),
    ...productVariants.map((v: any) => {
      const parentProduct = products.find((p: any) => p.id === v.productId);
      const displayName = parentProduct ? `${parentProduct.name} - ${v.name}` : v.name;
      const variantPriceEur = v.priceEur && parseFloat(v.priceEur) > 0 ? v.priceEur : (parentProduct?.priceEur || '0');
      const variantPriceCzk = v.priceCzk && parseFloat(v.priceCzk) > 0 ? v.priceCzk : (parentProduct?.priceCzk || '0');
      return { 
        id: v.id,
        name: displayName,
        originalVariantName: v.name,
        sku: v.sku,
        barcode: v.barcode,
        priceEur: variantPriceEur,
        priceCzk: variantPriceCzk,
        imageUrl: v.imageUrl,
        productId: v.productId,
        variantId: v.id,
        category: v.category,
        itemType: 'variant' as const,
      };
    }),
    ...bundles.map((b: any) => ({
      id: b.id,
      name: b.name,
      sku: b.sku,
      priceEur: b.priceEur,
      priceCzk: b.priceCzk,
      imageUrl: b.imageUrl,
      bundleId: b.bundleId,
      itemType: 'bundle' as const
    }))
  ], [products, productVariants, bundles]);

  const filteredItems = useMemo(() => {
    let items = allItems;
    
    // Hide variants unless searching - they are accessed via the variant modal on products
    if (!searchQuery.trim()) {
      items = items.filter((item: any) => item.itemType !== 'variant');
    }
    
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
    if (!customerSearchQuery.trim()) return customers.slice(0, 15);
    return fuzzySearch(customers, customerSearchQuery, {
      fields: ['firstName', 'lastName', 'company', 'email', 'phone', 'facebookName', 'city', 'country'],
      threshold: 0.3,
      fuzzy: true,
      vietnameseNormalization: true,
    }).map(r => r.item).slice(0, 15);
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
    if (warehouses.length > 0) {
      const currentWarehouseExists = selectedWarehouse && warehouses.some((w: any) => w.id === selectedWarehouse);
      if (!currentWarehouseExists) {
        const defaultId = (posSettings as any)?.defaultWarehouseId;
        const warehouseToSelect = defaultId 
          ? warehouses.find((w: any) => w.id === defaultId) || warehouses[0]
          : warehouses[0];
        setSelectedWarehouse(warehouseToSelect.id);
      }
    }
  }, [posSettings, warehouses]);

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
        title: t('financial:productNotFound'),
        description: t('financial:noProductWithBarcode', { barcode }),
        variant: 'destructive',
      });
    }

    setTimeout(() => setScanFeedback(null), 500);
  }, [allItems, soundEnabled, t, toast]);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = searchQuery.trim();
    if (!barcode) return;

    await processBarcode(barcode);
    setSearchQuery('');
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
      setFocusedCartItemId(existingItem.cartId);
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
      setFocusedCartItemId(newCartId);
    }
  };

  // Get variants for a specific product
  const getProductVariants = useCallback((productId: string) => {
    return productVariants.filter((v: any) => v.productId === productId);
  }, [productVariants]);

  // Handle product click - check if product has variants
  const handleProductClick = useCallback((product: any) => {
    // Only check for variants on products (not already variants or bundles)
    if (product.itemType === 'product' || !product.itemType) {
      const variants = getProductVariants(product.id);
      if (variants.length > 0) {
        setSelectedProductForVariant(product);
        setShowVariantModal(true);
        return;
      }
    }
    // No variants or is variant/bundle - add directly
    addToCart(product);
  }, [getProductVariants, addToCart]);

  // Add variant to cart from the modal
  const addVariantToCart = useCallback(async (variant: any) => {
    if (!selectedProductForVariant) return;
    
    const price = currency === 'EUR' 
      ? parseFloat(selectedProductForVariant.priceEur || variant.priceEur || '0') 
      : parseFloat(selectedProductForVariant.priceCzk || variant.priceCzk || '0');
    
    const variantItem = {
      ...variant,
      name: `${selectedProductForVariant.name} - ${variant.name}`,
      sku: variant.sku || selectedProductForVariant.sku,
      barcode: variant.barcode || selectedProductForVariant.barcode,
      priceEur: selectedProductForVariant.priceEur,
      priceCzk: selectedProductForVariant.priceCzk,
      imageUrl: variant.imageUrl || selectedProductForVariant.imageUrl,
      productId: selectedProductForVariant.id,
      itemType: 'variant',
    };
    
    addToCart(variantItem);
    
    if (soundEnabled) await soundEffects.playSuccessBeep();
    
    toast({
      title: t('financial:addedToCart'),
      description: variantItem.name,
    });
    
    setShowVariantModal(false);
    setSelectedProductForVariant(null);
  }, [selectedProductForVariant, currency, addToCart, soundEnabled, toast, t]);

  // Parse quick variant input for batch entry - supports formats like "S:2 M:3" or "1-10" or "23x5"
  const parseQuickVariantInput = useCallback((input: string) => {
    if (!input.trim() || !selectedProductForVariant) return;
    
    const variants = getProductVariants(selectedProductForVariant.id);
    if (variants.length === 0) return;
    
    const newQuantities: Record<string, number> = { ...variantQuantities };
    
    const findVariantByKey = (key: string) => {
      const keyLower = key.toLowerCase().trim();
      return variants.find((v: any) => {
        const name = (v.name?.toString() || '').toLowerCase().trim();
        const barcode = (v.barcode?.toString() || '').toLowerCase().trim();
        const sku = (v.sku?.toString() || '').toLowerCase().trim();
        const nameNumbers = v.name?.toString().match(/\d+/g);
        return (
          name === keyLower ||
          barcode === keyLower ||
          sku === keyLower ||
          name.startsWith(keyLower) ||
          (nameNumbers && nameNumbers.includes(key))
        );
      });
    };
    
    const segments = input.split(/[,\s]+/).filter(Boolean);
    
    for (const segment of segments) {
      const alphaQtyMatch = segment.match(/^([\w-]+)\s*[x*:]\s*(\d+)$/i);
      if (alphaQtyMatch) {
        const variantKey = alphaQtyMatch[1];
        const quantity = parseInt(alphaQtyMatch[2]) || 1;
        const variant = findVariantByKey(variantKey);
        if (variant) {
          newQuantities[variant.id] = (newQuantities[variant.id] || 0) + quantity;
        }
        continue;
      }
      
      const numericRangeMatch = segment.match(/^(\d+)\s*[-–]\s*(\d+)$/);
      if (numericRangeMatch) {
        const startNum = parseInt(numericRangeMatch[1]);
        const endNum = parseInt(numericRangeMatch[2]);
        if (startNum < endNum) {
          for (let i = startNum; i <= endNum; i++) {
            const variant = findVariantByKey(String(i));
            if (variant) {
              newQuantities[variant.id] = (newQuantities[variant.id] || 0) + 1;
            }
          }
          continue;
        }
      }
      
      const singleKey = segment.match(/^([\w-]+)$/);
      if (singleKey) {
        const variant = findVariantByKey(singleKey[1]);
        if (variant) {
          newQuantities[variant.id] = (newQuantities[variant.id] || 0) + 1;
        }
      }
    }
    
    setVariantQuantities(newQuantities);
    setQuickVariantInput('');
  }, [selectedProductForVariant, getProductVariants, variantQuantities]);

  // Add all selected variants to cart as ONE combined item
  const addSelectedVariantsToCart = useCallback(async () => {
    if (!selectedProductForVariant) return;
    
    const variants = getProductVariants(selectedProductForVariant.id);
    const variantSelections: VariantSelection[] = [];
    let totalQuantity = 0;
    const summaryParts: string[] = [];
    
    for (const variant of variants) {
      const qty = variantQuantities[variant.id] || 0;
      if (qty > 0) {
        variantSelections.push({
          variantId: variant.id,
          variantName: variant.name,
          quantity: qty,
          sku: variant.sku || selectedProductForVariant.sku,
          locationId: variant.primaryLocationId || undefined,
          locationCode: variant.locationCode || undefined,
        });
        totalQuantity += qty;
        summaryParts.push(`${variant.name}:${qty}`);
      }
    }
    
    if (variantSelections.length === 0) return;
    
    // Calculate price (use parent product price as base, variants inherit same price)
    const price = currency === 'EUR' 
      ? parseFloat(selectedProductForVariant.priceEur || '0') 
      : parseFloat(selectedProductForVariant.priceCzk || '0');
    
    const variantSummary = summaryParts.join(', ');
    const newCartId = `cart-${cartIdCounter}`;
    setCartIdCounter(prev => prev + 1);
    
    const combinedItem: CartItem = {
      id: selectedProductForVariant.id,
      cartId: newCartId,
      productId: selectedProductForVariant.id,
      name: selectedProductForVariant.name,
      price,
      quantity: totalQuantity,
      type: 'variant_group',
      sku: selectedProductForVariant.sku,
      barcode: selectedProductForVariant.barcode,
      imageUrl: selectedProductForVariant.imageUrl,
      variantSelections,
      variantSummary,
    };
    
    setCart(prev => [...prev, combinedItem]);
    setFocusedCartItemId(newCartId);
    
    if (soundEnabled) await soundEffects.playSuccessBeep();
    toast({
      title: t('financial:addedToCart'),
      description: `${totalQuantity} ${t('pos:items', 'items')} (${variantSelections.length} variants)`,
    });
    
    setShowVariantModal(false);
    setSelectedProductForVariant(null);
    setVariantQuantities({});
    setQuickVariantInput('');
  }, [selectedProductForVariant, getProductVariants, variantQuantities, currency, soundEnabled, toast, t, cartIdCounter]);

  const updateQuantity = (cartId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartId);
    } else {
      setCart(cart.map(item => 
        item.cartId === cartId ? { ...item, quantity } : item
      ));
    }
  };

  const updatePrice = (cartId: string, price: number) => {
    if (price >= 0) {
      setCart(cart.map(item => 
        item.cartId === cartId ? { ...item, price } : item
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

  const addCustomItem = () => {
    const price = parseDecimal(customItemPrice) || 0;
    const cost = parseDecimal(customItemCost) || 0;
    const profit = price - cost;
    
    if (!customItemName.trim() || price <= 0) {
      toast({
        title: t('common:error'),
        description: t('pos:customItemRequiresNameAndPrice', 'Custom item requires name and price'),
        variant: 'destructive'
      });
      return;
    }

    const newCartId = `cart-custom-${cartIdCounter}`;
    setCartIdCounter(prev => prev + 1);
    setCart([...cart, {
      id: `custom-${Date.now()}`,
      cartId: newCartId,
      productId: undefined,
      variantId: undefined,
      bundleId: undefined,
      name: customItemName.trim(),
      price,
      quantity: 1,
      type: 'custom',
      sku: undefined,
      barcode: undefined,
      imageUrl: undefined,
      cost,
      profit,
    }]);
    setFocusedCartItemId(newCartId);
    
    // Reset form
    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemCost('');
    setShowCustomItemDialog(false);
    
    toast({
      title: t('pos:customItemAdded', 'Custom item added'),
      description: `${customItemName.trim()} - ${price.toFixed(2)} ${currencySymbol}`,
    });
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = Math.max(0, subtotal - discount);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const customerName = selectedCustomer 
    ? selectedCustomer.name || 'Customer'
    : t('financial:walkInCustomer');

  // Mutation to set primary location for all variants of a product
  const setVariantLocationsMutation = useMutation({
    mutationFn: async ({ productId, locationCode, isPrimary }: { productId: string; locationCode: string; isPrimary: boolean }) => {
      const variants = getProductVariants(productId);
      const results = [];
      
      for (const variant of variants) {
        // Update each variant's locationCode
        const response = await apiRequest('PATCH', `/api/products/${productId}/variants/${variant.id}`, {
          locationCode: locationCode,
        });
        results.push(await response.json());
      }
      
      // Also add/update the product location with isPrimary flag for each variant
      if (isPrimary && variants.length > 0) {
        for (const variant of variants) {
          await apiRequest('POST', `/api/products/${productId}/locations`, {
            variantId: variant.id,
            locationType: 'warehouse',
            locationCode: locationCode,
            quantity: variant.quantity || 0,
            isPrimary: true,
          });
        }
      }
      
      return results;
    },
    onSuccess: () => {
      toast({
        title: t('common:success'),
        description: t('warehouse:locationUpdatedSuccessfully', 'Location updated successfully'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/product-variants'] });
      setShowVariantLocationModal(false);
      setVariantLocationCode('');
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error.message || t('warehouse:failedToUpdateLocation', 'Failed to update location'),
        variant: 'destructive',
      });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedWarehouse) {
        throw new Error(t('financial:pleaseSelectWarehouse'));
      }

      const isPayLater = paymentMethod === 'pay_later';
      
      // Expand variant_group items into individual variant order items for proper inventory tracking
      const expandedItems: Array<{
        productId?: string;
        variantId?: string;
        bundleId?: string;
        quantity: number;
        price: string;
        productName: string;
        sku: string;
        image: string | null;
        locationId?: string;
      }> = [];
      
      for (const item of cart) {
        if (item.type === 'variant_group' && item.variantSelections) {
          // Expand variant group into individual variant items
          for (const vs of item.variantSelections) {
            expandedItems.push({
              productId: item.productId,
              variantId: vs.variantId,
              quantity: vs.quantity,
              price: item.price.toFixed(2),
              productName: `${item.name} - ${vs.variantName}`,
              sku: vs.sku || '',
              image: item.imageUrl || null,
              locationId: vs.locationId,
            });
          }
        } else {
          // Regular item
          expandedItems.push({
            productId: item.productId,
            variantId: item.variantId,
            bundleId: item.bundleId,
            quantity: item.quantity,
            price: item.price.toFixed(2),
            productName: item.name,
            sku: item.sku || '',
            image: item.imageUrl || null,
          });
        }
      }
      
      const orderData = {
        customerId: selectedCustomerId || null,
        warehouseId: selectedWarehouse,
        currency: currency,
        orderStatus: 'completed',
        paymentStatus: isPayLater ? 'unpaid' : 'paid',
        orderType: 'pos',
        channel: 'pos',
        items: expandedItems,
        subtotal: subtotal.toFixed(2),
        discount: discount.toFixed(2),
        total: total.toFixed(2),
        grandTotal: total.toFixed(2),
        paymentMethod: paymentMethod,
        fulfillmentStage: 'completed',
        customerEmail: selectedCustomer?.email || 'walkin@pos.local',
        customerName: customerName,
        customerPhone: selectedCustomer?.shippingTel || '+420000000000',
        notes: orderNotes || undefined,
      };

      const response = await apiRequest('POST', '/api/orders', orderData);
      return await response.json();
    },
    onSuccess: (data: any) => {
      if (soundEnabled) soundEffects.playSuccessBeep();
      toast({
        title: t('common:success'),
        description: t('financial:saleCompletedSuccessfully'),
      });
      setLastSaleId(data.id);
      
      const cashReceivedNum = parseDecimal(cashReceived) || 0;
      const newReceiptData: ReceiptData = {
        orderId: data.orderId || data.id,
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
    const cashAmount = parseDecimal(cashReceived) || 0;
    if (cashAmount < total) {
      toast({
        title: t('pos:insufficientAmount'),
        description: `${t('pos:cash')}: ${cashAmount.toFixed(2)} ${currencySymbol} < ${t('pos:total')}: ${total.toFixed(2)} ${currencySymbol}`,
        variant: 'destructive'
      });
      return;
    }
    createOrderMutation.mutate();
  };

  const handleApplyDiscount = () => {
    const inputValue = parseDecimal(discountInput) || 0;
    let discountAmount: number;
    
    if (discountType === 'percentage') {
      if (inputValue > 100) {
        toast({
          title: t('pos:invalidDiscount'),
          description: t('pos:discountMustBePositive'),
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
        title: t('pos:invalidDiscount'),
        description: t('pos:discountCannotExceedTotal'),
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
      case 'cash': return t('pos:cash');
      case 'card': return t('pos:card');
      case 'bank_transfer': return t('pos:bankTransfer');
      case 'bank_transfer_private': return t('pos:privatKonto');
      case 'bank_transfer_invoice': return t('pos:invoiceTransfer');
      case 'pay_later': return t('pos:payLater');
      case 'qr_czk': return t('pos:qrCzk');
      default: return method;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-100 dark:bg-gray-900 overflow-x-hidden overflow-y-auto lg:overflow-hidden">
      {/* Left Panel - Products */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-2 sm:p-4 shadow-lg">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-white/10 rounded-lg">
                <Receipt className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold">{t('financial:posTitle')}</h1>
                <p className="text-[10px] sm:text-xs text-blue-100 hidden sm:block">{t('financial:posSystem')}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Warehouse Selector */}
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger className="w-24 sm:w-40 h-8 sm:h-10 bg-white/20 hover:bg-white/30 border-white/40 text-white font-medium text-xs sm:text-sm backdrop-blur-sm" data-testid="select-warehouse">
                  <Warehouse className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <SelectValue placeholder={t('financial:warehouse')} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse: any) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Sound Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-10 sm:w-10 text-white hover:bg-white/10"
                onClick={() => setSoundEnabled(!soundEnabled)}
                data-testid="button-toggle-sound"
              >
                {soundEnabled ? <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Unified Search & Scan Bar - Mobile optimized */}
        <div className="bg-white dark:bg-gray-800 px-3 sm:px-4 py-2 sm:py-3 border-b shadow-sm space-y-2">
          {/* Search Input - Full width and prominent on mobile */}
          <form onSubmit={handleBarcodeSubmit} className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-4 sm:w-4 text-primary" />
            <Input
              ref={barcodeInputRef}
              placeholder={t('pos:searchOrScan', 'Search or scan barcode...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "pl-12 pr-12 h-14 sm:h-11 text-lg sm:text-base font-semibold rounded-xl sm:rounded-lg border-2 transition-all duration-200 shadow-sm",
                scanFeedback === 'success' && "border-green-500 bg-green-50 dark:bg-green-900/20",
                scanFeedback === 'error' && "border-red-500 bg-red-50 dark:bg-red-900/20",
                !scanFeedback && "border-primary/30 dark:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
              )}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-testid="input-search-scan"
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-8 sm:w-8 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-5 w-5 sm:h-4 sm:w-4" />
              </Button>
            )}
          </form>
          
          {/* Secondary controls row */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="flex-1 sm:flex-none sm:w-40 h-10 sm:h-11 rounded-lg text-sm font-medium" data-testid="select-category">
                <Grid3X3 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat === 'all' ? t('inventory:allCategories') : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Custom Item Button */}
            <Button
              variant="default"
              className="h-10 sm:h-11 px-3 sm:px-4 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg shadow-sm"
              onClick={() => setShowCustomItemDialog(true)}
              data-testid="button-custom-item"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('pos:customItem', 'Custom')}</span>
            </Button>
            
            {/* View Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 sm:h-9 sm:w-9 rounded-md transition-all",
                  viewMode === 'grid' 
                    ? "bg-white dark:bg-gray-600 text-primary shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setViewMode('grid')}
                data-testid="button-view-grid"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 sm:h-9 sm:w-9 rounded-md transition-all",
                  viewMode === 'list' 
                    ? "bg-white dark:bg-gray-600 text-primary shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setViewMode('list')}
                data-testid="button-view-list"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Products Grid/List */}
        <ScrollArea className="flex-1 min-h-[300px] lg:min-h-0">
          <div className="p-2 sm:p-4">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
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
                      onClick={() => handleProductClick(product)}
                      data-testid={`card-product-${product.id}`}
                    >
                      {product.itemType === 'variant' && (
                        <Badge className="absolute top-2 left-2 z-10 bg-purple-600">V</Badge>
                      )}
                      {product.itemType === 'bundle' && (
                        <Badge className="absolute top-2 left-2 z-10 bg-orange-600">B</Badge>
                      )}
                      {/* Indicator for products with variants */}
                      {(!product.itemType || product.itemType === 'product') && getProductVariants(product.id).length > 0 && (
                        <Badge className="absolute top-2 left-2 z-10 bg-indigo-600">+V</Badge>
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
                            {price.toFixed(2)} {currencySymbol}
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
                      onClick={() => handleProductClick(product)}
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
                                {price.toFixed(2)} {currencySymbol}
                              </p>
                              {isInCart && cartItem && (
                                <Badge className="mt-1">{cartItem.quantity} {t('financial:inCart')}</Badge>
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
                <p className="text-lg font-medium">{t('financial:noProductsFound')}</p>
                <p className="text-sm">{t('financial:tryAdjustingSearch')}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-full lg:w-[480px] bg-white dark:bg-gray-800 border-t lg:border-t-0 lg:border-l flex flex-col shadow-xl lg:max-h-screen">
        {/* Cart Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-2 sm:p-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-white/10 rounded-lg">
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-bold">{t('financial:cart')}</h2>
                <p className="text-[10px] sm:text-xs text-gray-300 hidden sm:block">{totalItems} {t('financial:items')}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Currency Toggle */}
              <div className="flex h-8 sm:h-10 overflow-hidden rounded-lg border border-white/20 bg-white/10">
                <button
                  type="button"
                  className={cn(
                    "h-full px-2 sm:px-3 text-xs sm:text-sm font-medium transition-colors",
                    currency === 'EUR' 
                      ? "bg-white/20 text-white" 
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                  onClick={() => setCurrency('EUR')}
                  data-testid="button-currency-eur"
                >
                  <span className="flex items-center">
                    <Euro className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                    EUR
                  </span>
                </button>
                <button
                  type="button"
                  className={cn(
                    "h-full px-2 sm:px-3 text-xs sm:text-sm font-medium transition-colors",
                    currency === 'CZK' 
                      ? "bg-white/20 text-white" 
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                  onClick={() => setCurrency('CZK')}
                  data-testid="button-currency-czk"
                >
                  CZK
                </button>
              </div>
              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearCart}
                  className="text-red-300 hover:text-red-200 hover:bg-red-500/20 h-8 w-8 sm:h-10 sm:w-10"
                  data-testid="button-clear-cart"
                >
                  <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Customer Selection */}
        <div className="px-2 sm:px-4 py-2 sm:py-3 border-b bg-gray-50 dark:bg-gray-900">
          <Button
            variant="outline"
            className="w-full h-10 sm:h-14 justify-start text-left text-sm sm:text-base border-2 border-gray-200 dark:border-gray-700"
            onClick={() => setShowCustomerSearch(true)}
            data-testid="button-select-customer"
          >
            <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 text-muted-foreground" />
            <div className="flex-1 truncate">
              {selectedCustomer ? (
                <span className="font-medium">{customerName}</span>
              ) : (
                <span className="text-muted-foreground text-xs sm:text-sm">{t('financial:walkInCustomerTapToSelect')}</span>
              )}
            </div>
            {selectedCustomer && (
              <X 
                className="h-4 w-4 text-muted-foreground hover:text-foreground flex-shrink-0" 
                onClick={(e) => { e.stopPropagation(); setSelectedCustomerId(''); }}
              />
            )}
          </Button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto max-h-[300px] lg:max-h-none" ref={cartScrollRef}>
          <div className="p-2 sm:p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 sm:py-16 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 sm:h-20 sm:w-20 mb-3 sm:mb-4 opacity-20" />
                <p className="text-base sm:text-lg font-medium">{t('financial:cartIsEmptyMessage')}</p>
                <p className="text-xs sm:text-sm">{t('financial:scanOrClickToAdd')}</p>
              </div>
            ) : (
              cart.map((item) => (
                <Card key={item.cartId} className="overflow-hidden" data-testid={`cart-item-${item.cartId}`}>
                  <CardContent className="p-2">
                    <div className="flex gap-2 items-center">
                      {item.type === 'custom' ? (
                        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded flex items-center justify-center shrink-0 border border-amber-300 dark:border-amber-700">
                          <Plus className="h-5 w-5 text-amber-600" />
                        </div>
                      ) : item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-10 h-10 object-contain rounded border bg-gray-50 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center shrink-0">
                          <Package className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {item.type === 'custom' && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">
                              {t('financial:customItem')}
                            </Badge>
                          )}
                          {item.type === 'variant_group' && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700">
                              +V
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium text-xs leading-tight line-clamp-2">{item.name}</h4>
                        {item.variantSummary && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{item.variantSummary}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded p-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                          data-testid={`button-decrease-${item.cartId}`}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <input
                          ref={(el) => { quantityInputRefs.current[item.cartId] = el; }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            const num = parseInt(val, 10);
                            if (!isNaN(num) && num > 0) {
                              updateQuantity(item.cartId, num);
                            } else if (val === '') {
                              updateQuantity(item.cartId, 1);
                            }
                          }}
                          onFocus={(e) => e.target.select()}
                          onBlur={(e) => {
                            const num = parseInt(e.target.value, 10);
                            if (isNaN(num) || num <= 0) {
                              updateQuantity(item.cartId, 1);
                            }
                          }}
                          className="font-bold w-10 text-center text-sm bg-transparent border-none outline-none focus:ring-2 focus:ring-primary rounded"
                          data-testid={`input-quantity-${item.cartId}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                          data-testid={`button-increase-${item.cartId}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="text-right shrink-0 w-[110px]">
                        <p className="text-sm font-bold text-primary tabular-nums">
                          {(item.price * item.quantity).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
                        </p>
                        <div className="flex items-center justify-end gap-0.5">
                          <input
                            key={`price-${item.cartId}-${item.price}`}
                            type="text"
                            inputMode="decimal"
                            defaultValue={item.price.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            onFocus={(e) => {
                              e.target.value = item.price.toString();
                              e.target.select();
                            }}
                            onBlur={(e) => {
                              const val = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
                              const num = parseFloat(val);
                              if (!isNaN(num) && num >= 0) {
                                updatePrice(item.cartId, num);
                              } else {
                                updatePrice(item.cartId, 0);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            className="w-[70px] text-[10px] text-right text-muted-foreground tabular-nums bg-transparent border border-transparent hover:border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary rounded px-1 py-0.5 outline-none"
                            data-testid={`input-price-${item.cartId}`}
                          />
                          <span className="text-[10px] text-muted-foreground">{currencySymbol}</span>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
                        onClick={() => removeFromCart(item.cartId)}
                        data-testid={`button-remove-${item.cartId}`}
                      >
                        <X className="h-4 w-4" />
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
          <div className="border-t bg-gray-50 dark:bg-gray-900 p-2 sm:p-4 space-y-2 sm:space-y-4">
            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
                onClick={() => setShowDiscountDialog(true)}
                data-testid="button-add-discount"
              >
                <Percent className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                {discount > 0 ? `${discount.toFixed(2)} ${currencySymbol}` : t('common:discount')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
                onClick={() => setShowNotesDialog(true)}
                data-testid="button-add-notes"
              >
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                {orderNotes ? t('financial:editNotes') : t('financial:addNotes')}
              </Button>
            </div>

            {/* Totals */}
            <div className="space-y-1 sm:space-y-2 text-sm sm:text-base">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('common:subtotal')}</span>
                <span className="font-medium tabular-nums">{subtotal.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{t('common:discount')}</span>
                  <span className="font-medium tabular-nums">-{discount.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}</span>
                </div>
              )}
              <div className="flex justify-between text-lg sm:text-xl font-bold pt-2 border-t">
                <span>{t('common:total')}</span>
                <span className="text-primary tabular-nums">{total.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <Button
              size="lg"
              className="w-full h-12 sm:h-16 text-base sm:text-xl font-bold"
              onClick={handleCheckout}
              disabled={createOrderMutation.isPending}
              data-testid="button-checkout"
            >
              {createOrderMutation.isPending ? (
                t('financial:processing')
              ) : (
                <>
                  <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
                  {t('financial:payAmount', { amount: `${total.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencySymbol}` })}
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent 
          className="sm:max-w-lg"
          onKeyDown={(e) => {
            if (createOrderMutation.isPending) return;
            // Number key shortcuts for payment methods
            if (e.key === '1') { handlePaymentSelect('cash'); }
            else if (e.key === '3') { handlePaymentSelect('bank_transfer_private'); }
            else if (e.key === '5') { setShowPaymentDialog(false); setPayLaterCustomerSearchQuery(''); setShowPayLaterCustomerSearch(true); }
            else if (e.key === '6') { setShowPaymentDialog(false); setShowQRCodePreview(true); }
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl">{t('financial:selectPaymentMethod')}</DialogTitle>
            <DialogDescription>
              {t('common:total')}: <span className="font-bold text-xl text-primary tabular-nums">{total.toFixed(2)} {currencySymbol}</span>
              <span className="block text-xs mt-1 text-muted-foreground">{t('financial:pressToSelectMethod')}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-3 py-4">
            {/* Cash - Enabled */}
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 text-base hover:border-primary hover:bg-primary/5 relative"
              onClick={() => handlePaymentSelect('cash')}
              disabled={createOrderMutation.isPending}
              data-testid="button-payment-cash"
            >
              <span className="absolute top-1 left-2 text-xs text-muted-foreground font-mono">1</span>
              <div className="p-3 rounded-full text-white bg-green-500">
                <Banknote className="h-6 w-6" />
              </div>
              {t('financial:cash')}
            </Button>
            
            {/* Card - Disabled */}
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 text-base opacity-50 cursor-not-allowed relative"
              disabled={true}
              data-testid="button-payment-card"
            >
              <span className="absolute top-1 left-2 text-xs text-muted-foreground font-mono">2</span>
              <div className="p-3 rounded-full text-white bg-blue-500">
                <CreditCard className="h-6 w-6" />
              </div>
              <span className="flex items-center gap-1">
                {t('financial:card')}
                <span className="text-[10px] text-muted-foreground">{t('financial:comingSoon')}</span>
              </span>
            </Button>
            
            {/* Bank Transfer - Privat Konto - Enabled */}
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 text-base hover:border-primary hover:bg-primary/5 relative"
              onClick={() => handlePaymentSelect('bank_transfer_private')}
              disabled={createOrderMutation.isPending}
              data-testid="button-payment-bank-private"
            >
              <span className="absolute top-1 left-2 text-xs text-muted-foreground font-mono">3</span>
              <div className="p-3 rounded-full text-white bg-purple-500">
                <Building2 className="h-6 w-6" />
              </div>
              {t('financial:privatKonto')}
            </Button>
            
            {/* Bank Transfer - Invoice - Disabled */}
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 text-base opacity-50 cursor-not-allowed relative"
              disabled={true}
              data-testid="button-payment-bank-invoice"
            >
              <span className="absolute top-1 left-2 text-xs text-muted-foreground font-mono">4</span>
              <div className="p-3 rounded-full text-white bg-indigo-500">
                <FileText className="h-6 w-6" />
              </div>
              <span className="flex flex-col items-center">
                <span>{t('financial:invoiceTransfer')}</span>
                <span className="text-[10px] text-muted-foreground">{t('financial:comingSoon')}</span>
              </span>
            </Button>
            
            {/* Pay Later - Enabled */}
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 text-base hover:border-primary hover:bg-primary/5 relative"
              onClick={() => {
                setShowPaymentDialog(false);
                setPayLaterCustomerSearchQuery('');
                setShowPayLaterCustomerSearch(true);
              }}
              disabled={createOrderMutation.isPending}
              data-testid="button-payment-pay_later"
            >
              <span className="absolute top-1 left-2 text-xs text-muted-foreground font-mono">5</span>
              <div className="p-3 rounded-full text-white bg-amber-500">
                <Clock className="h-6 w-6" />
              </div>
              {t('financial:payLater')}
            </Button>
            
            {/* QR Code CZK - Enabled */}
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 text-base hover:border-primary hover:bg-primary/5 relative"
              onClick={() => {
                setShowPaymentDialog(false);
                setShowQRCodePreview(true);
              }}
              disabled={createOrderMutation.isPending}
              data-testid="button-payment-qr_czk"
            >
              <span className="absolute top-1 left-2 text-xs text-muted-foreground font-mono">6</span>
              <div className="p-3 rounded-full text-white bg-cyan-500">
                <QrCode className="h-6 w-6" />
              </div>
              {t('financial:qrCodeCzk')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cash Payment Dialog - Enhanced for older users */}
      <Dialog open={showCashDialog} onOpenChange={setShowCashDialog}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Banknote className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">{t('financial:cashPayment')}</DialogTitle>
                <DialogDescription className="text-emerald-50/80 text-xs">
                  {t('pos:enterAmountReceived', 'Enter amount received from customer')}
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row min-h-[400px]">
            {/* Order Items Summary - Left Side */}
            <div className="md:w-[55%] flex flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('pos:cart', 'Cart')}
                </p>
                <span className="text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                  {cart.length} {t('common:items', 'items')}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[280px]">
                <table className="w-full text-sm">
                  <tbody>
                    {cart.map((item, index) => (
                      <tr key={item.cartId} className={cn(
                        "border-b border-slate-100 dark:border-slate-700",
                        index % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-slate-50/50 dark:bg-slate-850"
                      )}>
                        <td className="py-2 pl-4 pr-2 w-6 text-xs text-muted-foreground text-right align-top">
                          {index + 1}.
                        </td>
                        <td className="py-2 pr-2 align-top">
                          <div className="font-medium text-slate-700 dark:text-slate-200 leading-tight" style={{ maxWidth: '180px', wordBreak: 'break-word' }}>
                            {item.name}
                            {item.variantSummary && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">{item.variantSummary}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center text-muted-foreground whitespace-nowrap align-top">
                          ×{item.quantity}
                        </td>
                        <td className="py-2 pl-2 pr-4 text-right font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap align-top">
                          {(item.price * item.quantity).toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} {currencySymbol}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Order Total Section */}
              <div className="mt-auto border-t-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 p-4">
                {discount > 0 && (
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">{t('pos:subtotal', 'Subtotal')}</span>
                    <span className="font-medium">{subtotal.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} {currencySymbol}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-red-600 mb-2">
                    <span>{t('pos:discount', 'Discount')}</span>
                    <span className="font-medium">-{discount.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} {currencySymbol}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-600">
                  <span className="font-bold text-base">{t('pos:total', 'Total')}</span>
                  <span className="font-black text-2xl text-emerald-600 dark:text-emerald-400">
                    {total.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} {currencySymbol}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Input - Right Side */}
            <div className="md:w-[45%] p-5 space-y-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
              <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border-2 border-emerald-100 dark:border-emerald-800 shadow-sm">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 text-center">
                  {t('pos:totalDue', 'Total Due')} / Cần thu
                </p>
                <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400 text-center">
                  {total.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} {currencySymbol}
                </p>
              </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
                {t('pos:customerPays', 'Customer Pays')} / Khách đưa
              </Label>
              <div className="relative group">
                <input
                  key={showCashDialog ? 'open' : 'closed'}
                  ref={cashInputRef}
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  defaultValue=""
                  onChange={(e) => {
                    // Update state for real-time change display
                    // Using defaultValue so state changes won't affect input
                    setCashReceived(e.target.value.replace(',', '.'));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.target as HTMLInputElement;
                      let val = input.value.replace(',', '.');
                      if (parseDecimal(val || '0') >= total && !createOrderMutation.isPending) {
                        e.preventDefault();
                        setCashReceived(val);
                        setTimeout(() => handleCashPayment(), 0);
                      }
                    }
                  }}
                  className="w-full h-20 text-4xl font-bold text-center border-2 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 border-slate-200 dark:border-slate-700 rounded-xl transition-all bg-white dark:bg-slate-800 outline-none"
                  placeholder="0.00"
                  disabled={createOrderMutation.isPending}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground pointer-events-none">
                  {currencySymbol}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  className="h-12 font-bold border-2 border-emerald-100 hover:bg-emerald-50 text-emerald-700"
                  onClick={() => {
                    const val = total.toFixed(2);
                    setCashReceived(val);
                    if (cashInputRef.current) cashInputRef.current.value = val;
                  }}
                >
                  {t('pos:exact', 'Exact')} {total.toFixed(2)}
                </Button>
                {(() => {
                  const roundedUp = Math.ceil(total);
                  if (roundedUp > total) {
                    return (
                      <Button
                        variant="outline"
                        className="h-12 font-bold border-2"
                        onClick={() => {
                          const val = roundedUp.toString();
                          setCashReceived(val);
                          if (cashInputRef.current) cashInputRef.current.value = val;
                        }}
                      >
                        {roundedUp} {currencySymbol}
                      </Button>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>

            {parseDecimal(cashReceived) > total && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <RotateCcw className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-semibold text-blue-900 dark:text-blue-100">
                    {t('pos:changeToGive', 'Change to Give')} / Tiền thối
                  </span>
                </div>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {(parseDecimal(cashReceived) - total).toFixed(2)} {currencySymbol}
                </span>
              </div>
            )}

            <div className="pt-2">
              <Button 
                size="lg" 
                className="w-full h-16 text-xl font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 dark:shadow-none"
                disabled={createOrderMutation.isPending || parseDecimal(cashReceived || '0') < total}
                onClick={() => handleCashPayment()}
              >
                {createOrderMutation.isPending ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-6 w-6" />
                    <span>{t('pos:completeSale', 'Complete Sale')}</span>
                    <span className="text-sm font-normal opacity-70 ml-2">(Enter)</span>
                  </div>
                )}
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full mt-2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowCashDialog(false)}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {t('common:back')}
              </Button>
            </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Search Dialog */}
      <Dialog open={showCustomerSearch} onOpenChange={setShowCustomerSearch}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('pos:selectCustomer', 'Select Customer')}
            </DialogTitle>
            <DialogDescription>
              {t('pos:searchCustomerHint', 'Search by name, Facebook, phone, email, city, or country')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder={t('pos:searchCustomerPlaceholder', 'Search customers...')}
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredCustomers.length > 0) {
                    setSelectedCustomerId(filteredCustomers[0].id);
                    setShowCustomerSearch(false);
                  }
                }}
                className="pl-10 h-12"
                autoFocus
                data-testid="input-customer-search"
              />
              {customerSearchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setCustomerSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <ScrollArea className="h-[350px]">
              <div className="space-y-2">
                {/* Walk-in Customer Option */}
                <Button
                  variant="outline"
                  className="w-full min-h-[56px] h-auto py-3 justify-start"
                  onClick={() => { setSelectedCustomerId(''); setShowCustomerSearch(false); }}
                  data-testid="button-walkin-customer"
                >
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full mr-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-muted-foreground">{t('pos:walkInCustomer', 'Walk-in Customer')}</p>
                    <p className="text-xs text-muted-foreground">{t('pos:noCustomerRecord', 'No customer record')}</p>
                  </div>
                </Button>
                
                {filteredCustomers.length === 0 && customerSearchQuery && (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{t('common:noResultsFound', 'No customers found')}</p>
                    <p className="text-sm">{t('common:tryDifferentSearch', 'Try a different search term')}</p>
                  </div>
                )}
                
                {filteredCustomers.map((customer) => (
                  <Button
                    key={customer.id}
                    variant="outline"
                    className="w-full min-h-[70px] h-auto py-3 justify-start"
                    onClick={() => { setSelectedCustomerId(customer.id); setShowCustomerSearch(false); }}
                    data-testid={`button-customer-${customer.id}`}
                  >
                    <div className="p-2 bg-primary/10 rounded-full mr-3 shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      {/* Customer Name */}
                      <p className="font-medium truncate">
                        {customer.name || customer.facebookName || t('pos:customer', 'Customer')}
                      </p>
                      
                      {/* Facebook Name */}
                      {customer.facebookName && (
                        <p className="text-xs text-blue-500 dark:text-blue-400 truncate flex items-center gap-1">
                          <span className="font-medium">FB:</span> {customer.facebookName}
                        </p>
                      )}
                      
                      {/* Contact & Location Info */}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {customer.shippingTel && (
                          <span className="text-xs text-muted-foreground">{customer.shippingTel}</span>
                        )}
                        {(customer.shippingCity || customer.shippingCountry) && (
                          <span className="text-xs text-muted-foreground">
                            {[customer.shippingCity, customer.shippingCountry].filter(Boolean).join(', ')}
                          </span>
                        )}
                      </div>
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
              {t('financial:selectCustomerForPayLater')}
            </DialogTitle>
            <DialogDescription>
              {t('financial:searchPayLaterHint')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              placeholder={t('financial:searchCustomerPlaceholder')}
              value={payLaterCustomerSearchQuery}
              onChange={(e) => setPayLaterCustomerSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredPayLaterCustomers.length > 0) {
                  setSelectedCustomerId(filteredPayLaterCustomers[0].id);
                  setShowPayLaterCustomerSearch(false);
                  handlePaymentSelect('pay_later');
                }
              }}
              className="h-12"
              autoFocus
              data-testid="input-pay-later-customer-search"
            />
            
            <ScrollArea className="h-[350px]">
              <div className="space-y-2">
                {filteredPayLaterCustomers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{t('common:noResultsFound')}</p>
                    <p className="text-sm">{t('common:tryDifferentSearch')}</p>
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
                          {customer.name || customer.facebookName || t('pos:customer', 'Customer')}
                        </p>
                        {customer.facebookName && (
                          <p className="text-xs text-blue-500 dark:text-blue-400 truncate">
                            FB: {customer.facebookName}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-1">
                          {customer.shippingTel && (
                            <span className="text-xs text-muted-foreground">{customer.shippingTel}</span>
                          )}
                          {(customer.shippingCity || customer.shippingCountry) && (
                            <span className="text-xs text-muted-foreground">
                              {[customer.shippingCity, customer.shippingCountry].filter(Boolean).join(', ')}
                            </span>
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
                {t('financial:backToPaymentOptions')}
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
                <span className="font-medium">{cart.length} {t('financial:items')}</span>
              </div>
              {discount > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('common:subtotal')}</span>
                    <span className="font-medium tabular-nums">{subtotal.toFixed(2)} {currencySymbol}</span>
                  </div>
                  <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                    <span className="text-sm">{t('common:discount')}</span>
                    <span className="font-medium tabular-nums">-{discount.toFixed(2)} {currencySymbol}</span>
                  </div>
                </>
              )}
              <div className="border-t border-cyan-200 dark:border-cyan-700 pt-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{t('common:total')}</span>
                  <span className="text-2xl font-bold text-primary tabular-nums">{total.toFixed(2)} {currencySymbol}</span>
                </div>
              </div>
              {currency === 'EUR' && (
                <div className="flex justify-between items-center bg-white/50 dark:bg-slate-800/50 rounded-lg p-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('financial:amountInCzk')}</span>
                  <span className="text-xl font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">
                    {(total * 25).toFixed(2)} Kč
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
              {t('common:back')}
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
                  {t('financial:processing')}
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  {t('financial:completeSale')}
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
            <DialogTitle>{t('financial:orderNotes')}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                setShowNotesDialog(false);
              }
            }}
            placeholder={t('financial:addOrderNotesPlaceholder')}
            className="min-h-[120px]"
            data-testid="textarea-order-notes"
          />
          <DialogFooter>
            <Button onClick={() => setShowNotesDialog(false)}>{t('financial:saveNotes')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discount Dialog */}
      <Dialog open={showDiscountDialog} onOpenChange={setShowDiscountDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              {t('financial:applyDiscount')}
            </DialogTitle>
            <DialogDescription>
              {t('common:subtotal')}: <span className="font-semibold tabular-nums">{subtotal.toFixed(2)} {currencySymbol}</span>
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
                {t('financial:percentage')}
              </Button>
              <Button
                variant={discountType === 'amount' ? 'default' : 'ghost'}
                className="flex-1 h-10"
                onClick={() => { setDiscountType('amount'); setDiscountInput(''); }}
                data-testid="button-discount-type-amount"
              >
                {currency === 'EUR' ? <Euro className="h-4 w-4 mr-2" /> : <DollarSign className="h-4 w-4 mr-2" />}
                {t('financial:fixedAmount')}
              </Button>
            </div>
            
            {/* Input with dynamic placeholder */}
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                value={discountInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setDiscountInput(val.includes(',') ? val.replace(',', '.') : val);
                }}
                placeholder={discountType === 'percentage' ? t('financial:enterPercentagePlaceholder') : `${t('common:enterAmount')} (e.g., 5.00)`}
                className="h-14 text-xl text-center pr-12"
                autoFocus
                data-testid="input-discount"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">
                {discountType === 'percentage' ? '%' : currencySymbol}
              </span>
            </div>
            
            {/* Quick Discount Buttons */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">{t('financial:quickSelect')}</p>
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
                      {amount} {currencySymbol}
                    </Button>
                  ))
                )}
              </div>
            </div>
            
            {/* Discount Preview */}
            {discountInput && parseDecimal(discountInput) > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-green-700 dark:text-green-300">{t('common:discount')}:</span>
                  <span className="font-bold text-green-700 dark:text-green-300 tabular-nums">
                    -{discountType === 'percentage' 
                      ? ((subtotal * parseDecimal(discountInput)) / 100).toFixed(2)
                      : parseDecimal(discountInput).toFixed(2)
                    } {currencySymbol}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-green-700 dark:text-green-300">{t('financial:newTotal')}</span>
                  <span className="font-bold text-lg text-green-700 dark:text-green-300 tabular-nums">
                    {discountType === 'percentage'
                      ? (subtotal - (subtotal * parseDecimal(discountInput)) / 100).toFixed(2)
                      : (subtotal - parseDecimal(discountInput)).toFixed(2)
                    } {currencySymbol}
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
            <Button onClick={handleApplyDiscount} data-testid="button-apply-discount" disabled={!discountInput || parseDecimal(discountInput) <= 0}>
              <Check className="h-4 w-4 mr-1" />
              Apply Discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Item Dialog */}
      <Dialog open={showCustomItemDialog} onOpenChange={setShowCustomItemDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-amber-600" />
              {t('pos:createCustomItem', 'Create Custom Item')}
            </DialogTitle>
            <DialogDescription>
              {t('pos:customItemDescription', 'Add a custom item with your own name, price, and profit tracking')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('pos:itemName', 'Item Name')} *</label>
              <Input
                placeholder={t('pos:enterItemName', 'Enter item name...')}
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
                data-testid="input-custom-item-name"
                autoFocus
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('pos:price', 'Price')} ({currencySymbol}) *</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={customItemPrice}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomItemPrice(val.includes(',') ? val.replace(',', '.') : val);
                  }}
                  data-testid="input-custom-item-price"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('pos:cost', 'Cost')} ({currencySymbol})</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={customItemCost}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomItemCost(val.includes(',') ? val.replace(',', '.') : val);
                  }}
                  data-testid="input-custom-item-cost"
                />
              </div>
            </div>
            
            {/* Profit Preview */}
            {customItemPrice && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('pos:estimatedProfit', 'Estimated Profit')}:</span>
                  <span className={cn(
                    "font-bold",
                    (parseDecimal(customItemPrice) - (parseDecimal(customItemCost) || 0)) >= 0 
                      ? "text-green-600" 
                      : "text-red-600"
                  )}>
                    {((parseDecimal(customItemPrice) || 0) - (parseDecimal(customItemCost) || 0)).toFixed(2)} {currencySymbol}
                  </span>
                </div>
                {customItemCost && parseDecimal(customItemPrice) > 0 && (
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-muted-foreground">{t('pos:margin', 'Margin')}:</span>
                    <span className="text-sm">
                      {(((parseDecimal(customItemPrice) - parseDecimal(customItemCost)) / parseDecimal(customItemPrice)) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setCustomItemName('');
                setCustomItemPrice('');
                setCustomItemCost('');
                setShowCustomItemDialog(false);
              }}
            >
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button 
              onClick={addCustomItem}
              disabled={!customItemName.trim() || !customItemPrice || parseDecimal(customItemPrice) <= 0}
              className="bg-amber-600 hover:bg-amber-700"
              data-testid="button-add-custom-item"
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('pos:addToCart', 'Add to Cart')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variant Selection Modal - Enhanced with quantity-based selection */}
      <Dialog open={showVariantModal} onOpenChange={(open) => {
        setShowVariantModal(open);
        if (!open) {
          setSelectedProductForVariant(null);
          setVariantQuantities({});
          setQuickVariantInput('');
        }
      }}>
        <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-3 md:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base md:text-lg">
              {t('pos:selectVariant', 'Select Variants')}
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm line-clamp-1">
              {selectedProductForVariant?.name}
            </DialogDescription>
          </DialogHeader>
          
          {/* Quick variant input */}
          <div className="space-y-1.5">
            <Label htmlFor="pos-quick-variant-input" className="text-xs md:text-sm font-medium">
              {t('pos:quickEntry', 'Quick Entry')}
            </Label>
            <div className="flex gap-1.5">
              <Input
                id="pos-quick-variant-input"
                value={quickVariantInput}
                onChange={(e) => setQuickVariantInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    parseQuickVariantInput(quickVariantInput);
                  }
                }}
                placeholder="e.g. 23,26,31x2,36x3 or S:2 M:3"
                className="flex-1 font-mono text-xs md:text-sm h-9"
                data-testid="input-pos-quick-variant"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9 px-2.5 min-w-[44px]"
                onClick={() => parseQuickVariantInput(quickVariantInput)}
                data-testid="button-apply-pos-quick-variant"
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground hidden sm:block">
              Format: 23,26,31x2,36x3 • S:2 M:3 (qty) • 1-10 (range)
            </p>
          </div>
          
          {/* Header row - Responsive grid */}
          <div className="grid grid-cols-[1fr_50px_120px] md:grid-cols-[1fr_60px_60px_130px] gap-1.5 px-2 py-1.5 bg-muted/50 rounded-t-md text-xs font-medium border-b mt-2">
            <div>{t('pos:variant', 'Variant')}</div>
            <div className="text-center hidden md:block">{t('pos:price', 'Price')}</div>
            <div className="text-center">{t('pos:stock', 'Stock')}</div>
            <div className="text-right">{t('pos:qty', 'Qty')}</div>
          </div>
          
          {/* Variant list */}
          <ScrollArea className="flex-1 min-h-0 max-h-[50vh] border rounded-b-md overflow-auto">
            <div className="divide-y">
              {selectedProductForVariant && getProductVariants(selectedProductForVariant.id)
                .slice()
                .sort((a: any, b: any) => {
                  // Natural sort for variant names (handles #1, #2, #10 correctly)
                  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
                })
                .map((variant: any) => {
                const variantPrice = currency === 'EUR' 
                  ? parseFloat(variant.priceEur || selectedProductForVariant.priceEur || '0') 
                  : parseFloat(variant.priceCzk || selectedProductForVariant.priceCzk || '0');
                const stockQty = variant.availableQuantity ?? variant.quantity ?? 0;
                const currentQty = variantQuantities[variant.id] || 0;
                
                return (
                  <div
                    key={variant.id}
                    className="grid grid-cols-[1fr_50px_120px] md:grid-cols-[1fr_60px_60px_130px] gap-1.5 px-2 py-2 items-center hover:bg-muted/30"
                    data-testid={`variant-row-${variant.id}`}
                  >
                    <div className="min-w-0 overflow-hidden">
                      <p className="font-medium text-xs md:text-sm break-words leading-tight" title={variant.name}>{variant.name}</p>
                      {variant.sku && (
                        <p className="text-[10px] text-muted-foreground font-mono truncate">{variant.sku}</p>
                      )}
                    </div>
                    
                    <div className="text-center text-xs hidden md:block font-bold">
                      {variantPrice.toFixed(0)} {currencySymbol}
                    </div>
                    
                    <div className="text-center">
                      <Badge 
                        variant={stockQty > 10 ? "default" : stockQty > 0 ? "outline" : "destructive"}
                        className="text-[10px] px-1.5 font-bold"
                      >
                        {stockQty}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-end gap-1">
                      <Input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={currentQty}
                        onChange={(e) => setVariantQuantities(prev => ({
                          ...prev,
                          [variant.id]: Math.max(0, parseInt(e.target.value) || 0)
                        }))}
                        onFocus={(e) => e.target.select()}
                        className={cn(
                          "text-center h-8 w-12 text-xs px-1 font-bold",
                          currentQty > 0 && "bg-green-100 dark:bg-green-900/50 border-green-500 text-green-700 dark:text-green-300"
                        )}
                        data-testid={`input-variant-quantity-${variant.id}`}
                      />
                      <button
                        type="button"
                        onClick={() => setVariantQuantities(prev => ({
                          ...prev,
                          [variant.id]: (prev[variant.id] || 0) + 1
                        }))}
                        className="h-8 px-2 text-xs font-medium text-primary hover:bg-primary/10 rounded border min-w-[32px]"
                      >+1</button>
                      <button
                        type="button"
                        onClick={() => setVariantQuantities(prev => ({
                          ...prev,
                          [variant.id]: (prev[variant.id] || 0) + 10
                        }))}
                        className="h-8 px-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded border min-w-[36px]"
                      >+10</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          
          {/* Selected count indicator */}
          {Object.values(variantQuantities).some(q => q > 0) && (
            <div className="text-xs text-center text-muted-foreground mt-1">
              {Object.values(variantQuantities).reduce((sum, q) => sum + q, 0)} {t('pos:itemsSelected', 'items selected')}
            </div>
          )}
          
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-3">
            <Button
              variant="outline"
              className="w-full sm:w-auto min-h-[44px]"
              onClick={() => {
                setShowVariantModal(false);
                setSelectedProductForVariant(null);
                setVariantQuantities({});
                setQuickVariantInput('');
              }}
            >
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto min-h-[44px]"
              onClick={() => setShowVariantLocationModal(true)}
            >
              <MapPin className="h-4 w-4 mr-2" />
              {t('warehouse:setLocation', 'Set Location')}
            </Button>
            <Button
              className="w-full sm:w-auto min-h-[44px]"
              onClick={addSelectedVariantsToCart}
              disabled={!Object.values(variantQuantities).some(q => q > 0)}
              data-testid="button-add-variants-to-cart"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {t('pos:addToCart', 'Add to Cart')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variant Location Modal */}
      <Dialog open={showVariantLocationModal} onOpenChange={setShowVariantLocationModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t('warehouse:setVariantLocation', 'Set Variant Location')}
            </DialogTitle>
            <DialogDescription>
              {t('warehouse:setLocationForAllVariants', 'Set the primary warehouse location for all variants of this product.')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('warehouse:warehouseLocation', 'Warehouse Location')}</Label>
              <WarehouseLocationSelector
                value={variantLocationCode}
                onChange={setVariantLocationCode}
                showTypeSelector={false}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPrimary"
                checked={variantLocationIsPrimary}
                onCheckedChange={(checked) => setVariantLocationIsPrimary(checked as boolean)}
              />
              <Label htmlFor="isPrimary" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {t('warehouse:setAsPrimaryLocation', 'Set as primary location for all variants')}
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowVariantLocationModal(false);
                setVariantLocationCode('');
              }}
            >
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button
              onClick={() => {
                if (selectedProductForVariant && variantLocationCode) {
                  setVariantLocationsMutation.mutate({
                    productId: selectedProductForVariant.id,
                    locationCode: variantLocationCode,
                    isPrimary: variantLocationIsPrimary,
                  });
                }
              }}
              disabled={!variantLocationCode || setVariantLocationsMutation.isPending}
            >
              {setVariantLocationsMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {t('common:save', 'Save')}
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
              onClose={() => {
                setShowReceipt(false);
              }}
              onPrint={() => {}}
              companyInfo={companyInfo}
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
                amount={currency === 'CZK' ? receiptData.total : convertCurrency(receiptData.total, 'EUR', 'CZK')} 
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
                  onClick={() => {
                    setShowQRCode(false);
                    setLocation('/orders');
                  }}
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
