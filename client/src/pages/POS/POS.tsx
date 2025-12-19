import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation } from 'wouter';
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
  Keyboard,
  Download,
  Loader2
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { fuzzySearch } from '@/lib/fuzzySearch';
import type { Product, Customer, Category } from '@shared/schema';
import { insertInvoiceSchema } from '@shared/schema';
import { useSettings } from '@/contexts/SettingsContext';
import { convertCurrency } from '@/lib/currencyUtils';
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

type ReceiptLanguage = 'en' | 'vi' | 'cz' | 'de';

const receiptLocales: Record<ReceiptLanguage, { locale: string; dateFormat: Intl.DateTimeFormatOptions; timeFormat: Intl.DateTimeFormatOptions }> = {
  en: { 
    locale: 'en-GB', 
    dateFormat: { day: '2-digit', month: '2-digit', year: 'numeric' },
    timeFormat: { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
  },
  vi: { 
    locale: 'vi-VN', 
    dateFormat: { day: '2-digit', month: '2-digit', year: 'numeric' },
    timeFormat: { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
  },
  cz: { 
    locale: 'cs-CZ', 
    dateFormat: { day: '2-digit', month: '2-digit', year: 'numeric' },
    timeFormat: { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
  },
  de: { 
    locale: 'de-DE', 
    dateFormat: { day: '2-digit', month: '2-digit', year: 'numeric' },
    timeFormat: { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
  },
};

interface CompanyInfo {
  name?: string;
  address?: string;
  city?: string;
  zip?: string;
  country?: string;
  phone?: string;
  ico?: string;
  vatId?: string;
  website?: string;
}

function ThermalReceipt({ data, onClose, onPrint, companyInfo }: { data: ReceiptData; onClose: () => void; onPrint: () => void; companyInfo: CompanyInfo }) {
  const { t } = useTranslation(['common', 'financial']);
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [receiptLang, setReceiptLang] = useState<ReceiptLanguage>(() => {
    return (localStorage.getItem('pos_receipt_language') as ReceiptLanguage) || 'cz';
  });

  useEffect(() => {
    localStorage.setItem('pos_receipt_language', receiptLang);
  }, [receiptLang]);

  const getLabel = (key: string): string => {
    const prefix = `receipt${receiptLang.charAt(0).toUpperCase() + receiptLang.slice(1)}_`;
    return t(`financial:${prefix}${key}`);
  };

  const formatDate = (date: Date): string => {
    const { locale, dateFormat } = receiptLocales[receiptLang];
    return date.toLocaleDateString(locale, dateFormat);
  };

  const formatTime = (date: Date): string => {
    const { locale, timeFormat } = receiptLocales[receiptLang];
    return date.toLocaleTimeString(locale, timeFormat);
  };

  const formatAmount = (amount: number): string => {
    const { locale } = receiptLocales[receiptLang];
    return amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getPaymentLabel = (): string => {
    const method = data.paymentMethod;
    if (method === 'cash') return getLabel('cash');
    if (method === 'card') return getLabel('card');
    if (method === 'bank_transfer' || method === 'bank_transfer_private' || method === 'bank_transfer_invoice') return getLabel('bankTransfer');
    if (method === 'qr_czk') return 'QR CZK';
    if (method === 'pay_later') return t('financial:payLater');
    return method;
  };
  
  const handlePrint = () => {
    // Use window.print() with proper CSS - browser will handle print preview
    // This approach keeps the exact same styling as the preview
    window.print();
    onPrint();
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/pos/receipt-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          items: data.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price
          })),
          subtotal: data.subtotal,
          discount: data.discount,
          total: data.total,
          paymentMethod: data.paymentMethod,
          cashReceived: data.cashReceived,
          change: data.change,
          orderId: data.orderId,
          customerName: data.customerName,
          currency: data.currency,
          notes: data.notes,
          date: data.date?.toISOString(),
          language: receiptLang === 'cz' ? 'cs' : receiptLang,
          companyInfo: {
            name: companyInfo.name,
            address: companyInfo.address,
            city: companyInfo.city,
            zip: companyInfo.zip,
            country: companyInfo.country,
            phone: companyInfo.phone,
            ico: companyInfo.ico,
            vatId: companyInfo.vatId,
            website: companyInfo.website
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('PDF generation failed:', response.status, errorData);
        throw new Error(errorData.message || `Failed to generate PDF (${response.status})`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${data.orderId || Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: t('common:success'),
        description: t('financial:receiptDownloaded'),
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: t('common:error'),
        description: t('financial:receiptDownloadFailed'),
        variant: 'destructive'
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const currencySymbol = data.currency === 'EUR' ? '€' : (data.currency === 'CZK' ? 'Kč' : data.currency);

  const languageFlags: Record<ReceiptLanguage, string> = {
    en: '🇬🇧',
    vi: '🇻🇳', 
    cz: '🇨🇿',
    de: '🇩🇪'
  };

  return (
    <div className="relative print-receipt-container">
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 2mm !important;
          }
          
          * {
            visibility: hidden !important;
          }
          
          html, body {
            background: white !important;
            width: 80mm !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print-receipt-container,
          .print-receipt-container .thermal-receipt,
          .print-receipt-container .thermal-receipt * {
            visibility: visible !important;
          }
          
          .print-receipt-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            background: white !important;
            margin: 0 !important;
            padding: 2mm !important;
          }
          
          .print-receipt-container .thermal-receipt {
            width: 100% !important;
            max-width: 76mm !important;
            padding: 4mm !important;
            margin: 0 !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 11px !important;
            line-height: 1.5 !important;
            background: white !important;
            color: black !important;
            border: 1px dashed #333 !important;
            border-radius: 4px !important;
            box-shadow: none !important;
          }
          
          .print-receipt-container .thermal-receipt h2 {
            font-size: 16px !important;
            font-weight: bold !important;
            margin-bottom: 4px !important;
          }
          
          .print-receipt-container .thermal-receipt .text-xl { font-size: 16px !important; }
          .print-receipt-container .thermal-receipt .text-lg { font-size: 14px !important; }
          .print-receipt-container .thermal-receipt .text-sm { font-size: 11px !important; }
          .print-receipt-container .thermal-receipt .text-xs { font-size: 9px !important; }
          .print-receipt-container .thermal-receipt .text-\\[10px\\] { font-size: 9px !important; }
          
          .print-receipt-container .thermal-receipt .text-center { text-align: center !important; }
          .print-receipt-container .thermal-receipt .font-bold { font-weight: bold !important; }
          
          .print-receipt-container .thermal-receipt .flex { display: flex !important; }
          .print-receipt-container .thermal-receipt .justify-between { justify-content: space-between !important; }
          .print-receipt-container .thermal-receipt .items-start { align-items: flex-start !important; }
          
          .print-receipt-container .thermal-receipt .border-dashed { border-style: dashed !important; }
          .print-receipt-container .thermal-receipt .border-b-2,
          .print-receipt-container .thermal-receipt .border-t-2 { 
            border-color: #333 !important;
          }
          
          .print-receipt-container .thermal-receipt .space-y-1\\.5 > * + * { margin-top: 4px !important; }
          .print-receipt-container .thermal-receipt .space-y-2 > * + * { margin-top: 6px !important; }
          
          .print-receipt-container .thermal-receipt .pb-4 { padding-bottom: 12px !important; }
          .print-receipt-container .thermal-receipt .mb-4 { margin-bottom: 12px !important; }
          .print-receipt-container .thermal-receipt .mb-3 { margin-bottom: 10px !important; }
          .print-receipt-container .thermal-receipt .mb-2 { margin-bottom: 8px !important; }
          .print-receipt-container .thermal-receipt .mt-6 { margin-top: 16px !important; }
          .print-receipt-container .thermal-receipt .pt-4 { padding-top: 12px !important; }
          .print-receipt-container .thermal-receipt .mt-1 { margin-top: 4px !important; }
          .print-receipt-container .thermal-receipt .mt-2 { margin-top: 8px !important; }
          .print-receipt-container .thermal-receipt .p-6 { padding: 4mm !important; }
          
          .print-receipt-container .thermal-receipt .text-gray-600,
          .print-receipt-container .thermal-receipt .text-gray-500,
          .print-receipt-container .thermal-receipt .text-gray-400 { 
            color: #444 !important; 
          }
          
          .no-print {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      {/* Language Selector - No print */}
      <div className="no-print flex justify-center gap-2 mb-4">
        {(Object.keys(languageFlags) as ReceiptLanguage[]).map((lang) => (
          <button
            key={lang}
            onClick={() => setReceiptLang(lang)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              receiptLang === lang
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            }`}
            data-testid={`button-receipt-lang-${lang}`}
          >
            {languageFlags[lang]} {lang.toUpperCase()}
          </button>
        ))}
      </div>
      
      <div className="thermal-receipt bg-white dark:bg-slate-800 p-6 max-w-[320px] mx-auto font-mono text-sm border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg">
        {/* Header with Business Info - EU Compliant */}
        <div className="text-center border-b-2 border-dashed border-gray-300 dark:border-slate-600 pb-4 mb-4">
          <h2 className="text-xl font-bold">{companyInfo.name || 'Company Name'}</h2>
          {(companyInfo.address || companyInfo.city || companyInfo.zip) && (
            <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1">
              {[companyInfo.address, companyInfo.zip, companyInfo.city].filter(Boolean).join(', ')}
            </p>
          )}
          {(companyInfo.phone || companyInfo.country) && (
            <p className="text-[10px] text-gray-600 dark:text-gray-400">
              {[companyInfo.phone, companyInfo.country].filter(Boolean).join(' | ')}
            </p>
          )}
          {(companyInfo.ico || companyInfo.vatId) && (
            <p className="text-[10px] text-gray-600 dark:text-gray-400">
              {companyInfo.ico && <>{getLabel('companyId')}: {companyInfo.ico}</>}
              {companyInfo.ico && companyInfo.vatId && ' | '}
              {companyInfo.vatId && <>{getLabel('vatId')}: {companyInfo.vatId}</>}
            </p>
          )}
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-2">{getLabel('receipt')}</p>
        </div>
        
        {/* Transaction Info */}
        <div className="space-y-1.5 text-sm border-b border-dashed border-gray-300 dark:border-slate-600 pb-4 mb-4">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">{getLabel('date')}:</span>
            <span className="font-medium">{formatDate(data.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">{getLabel('time')}:</span>
            <span className="font-medium">{formatTime(data.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">{getLabel('receiptNo')}:</span>
            <span className="font-medium">{data.orderId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">{getLabel('customer')}:</span>
            <span className="font-medium truncate max-w-[140px]">
              {data.customerName === 'Walk-in Customer' ? getLabel('walkInCustomer') : data.customerName}
            </span>
          </div>
        </div>
        
        {/* Items */}
        <div className="border-b border-dashed border-gray-300 dark:border-slate-600 pb-4 mb-4">
          <div className="font-bold mb-3 text-base">{getLabel('items')}:</div>
          {data.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm mb-2">
              <span className="flex-1 pr-3">
                {item.quantity}x {item.name}
              </span>
              <span className="font-medium whitespace-nowrap">
                {formatAmount(item.price * item.quantity)} {currencySymbol}
              </span>
            </div>
          ))}
        </div>
        
        {/* Totals */}
        <div className="space-y-2 text-sm border-b border-dashed border-gray-300 dark:border-slate-600 pb-4 mb-4">
          <div className="flex justify-between">
            <span>{getLabel('subtotal')}:</span>
            <span>{formatAmount(data.subtotal)} {currencySymbol}</span>
          </div>
          {data.discount > 0 && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>{getLabel('discount')}:</span>
              <span>-{formatAmount(data.discount)} {currencySymbol}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-2 border-t dark:border-slate-600">
            <span>{getLabel('total')}:</span>
            <span>{formatAmount(data.total)} {currencySymbol}</span>
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center mt-1">
            {getLabel('vatIncluded')}
          </p>
        </div>
        
        {/* Payment Info */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">{getLabel('paymentMethod')}:</span>
            <span className="font-medium">{getPaymentLabel()}</span>
          </div>
          {data.cashReceived && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{getLabel('cashReceived')}:</span>
                <span className="font-medium">{formatAmount(data.cashReceived)} {currencySymbol}</span>
              </div>
              <div className="flex justify-between text-green-600 dark:text-green-400 font-bold">
                <span>{getLabel('change')}:</span>
                <span>{formatAmount(data.change || 0)} {currencySymbol}</span>
              </div>
            </>
          )}
          {data.notes && (
            <div className="mt-3 pt-3 border-t dark:border-slate-600">
              <span className="font-medium">{t('common:notes')}:</span>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{data.notes}</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="text-center mt-6 pt-4 border-t-2 border-dashed border-gray-300 dark:border-slate-600">
          <p className="text-sm text-gray-600 dark:text-gray-400">{getLabel('thankYou')}</p>
          {companyInfo.website && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{companyInfo.website}</p>
          )}
        </div>
      </div>
      
      <div className="no-print flex flex-wrap gap-3 justify-center mt-6">
        <Button size="lg" onClick={handlePrint} className="px-6" data-testid="button-print-receipt">
          <Printer className="h-5 w-5 mr-2" />
          {t('financial:printReceipt')}
        </Button>
        <Button 
          size="lg" 
          variant="secondary" 
          onClick={handleDownloadPDF} 
          disabled={isDownloading}
          className="px-6"
          data-testid="button-download-pdf"
        >
          {isDownloading ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <Download className="h-5 w-5 mr-2" />
          )}
          {t('financial:downloadPDF')}
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
  const { t } = useTranslation(['common', 'orders', 'products', 'financial']);
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
  
  // Custom Item state
  const [showCustomItemDialog, setShowCustomItemDialog] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemCost, setCustomItemCost] = useState('');
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
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
  });

  const categories = useMemo(() => {
    const categoryNames = categoriesData.map((cat: Category) => cat.name);
    return ['all', ...categoryNames];
  }, [categoriesData]);

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
      imageUrl: b.imageUrl,
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
        title: t('financial:productNotFound'),
        description: t('financial:noProductWithBarcode', { barcode }),
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

  const addCustomItem = () => {
    const price = parseFloat(customItemPrice) || 0;
    const cost = parseFloat(customItemCost) || 0;
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
      type: 'custom' as any,
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
        channel: 'pos',
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
      
      const cashReceivedNum = parseFloat(cashReceived) || 0;
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
    const cashAmount = parseFloat(cashReceived) || 0;
    if (cashAmount < total) {
      toast({
        title: 'Insufficient Amount',
        description: `Cash received (${cashAmount.toFixed(2)} ${currencySymbol}) is less than total (${total.toFixed(2)} ${currencySymbol})`,
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
                <h1 className="text-base sm:text-xl font-bold">Point of Sale</h1>
                <p className="text-[10px] sm:text-xs text-blue-100 hidden sm:block">Davie Supply POS System</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Warehouse Selector */}
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger className="w-24 sm:w-40 h-8 sm:h-10 bg-white/10 border-white/20 text-white text-xs sm:text-sm" data-testid="select-warehouse">
                  <Warehouse className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
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

        {/* Unified Search & Scan Bar */}
        <div className="bg-white dark:bg-gray-800 px-2 sm:px-4 py-2 sm:py-3 border-b flex flex-wrap sm:flex-nowrap items-center gap-2">
          <form onSubmit={handleBarcodeSubmit} className="relative flex-1 min-w-0 order-1 w-full sm:w-auto">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-muted-foreground">
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
              <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block" />
              <Scan className="h-3 w-3 sm:h-4 sm:w-4 hidden sm:block" />
            </div>
            <Input
              ref={barcodeInputRef}
              placeholder={t('pos:searchOrScan', 'Search or scan barcode...')}
              value={barcodeInput || searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setBarcodeInput(val);
                setSearchQuery(val);
              }}
              className={cn(
                "pl-10 sm:pl-20 pr-10 h-10 sm:h-14 text-sm sm:text-base font-medium border-2 transition-all duration-200",
                scanFeedback === 'success' && "border-green-500 bg-green-50 dark:bg-green-900/20",
                scanFeedback === 'error' && "border-red-500 bg-red-50 dark:bg-red-900/20",
                !scanFeedback && "border-gray-200 dark:border-gray-700"
              )}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-testid="input-search-scan"
            />
            {(barcodeInput || searchQuery) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 sm:h-8 sm:w-8"
                onClick={() => { setBarcodeInput(''); setSearchQuery(''); }}
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            )}
          </form>
          
          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-28 sm:w-36 h-10 sm:h-14 order-2 text-xs sm:text-sm" data-testid="select-category">
              <Grid3X3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
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
            variant="outline"
            size="sm"
            className="h-10 sm:h-14 px-3 sm:px-4 order-3 bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-300"
            onClick={() => setShowCustomItemDialog(true)}
            data-testid="button-custom-item"
          >
            <Plus className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">{t('pos:customItem', 'Custom')}</span>
          </Button>
          
          {/* View Toggle */}
          <div className="flex bg-muted rounded-xl p-1 order-4 shadow-inner">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-9 w-9 sm:h-11 sm:w-11 rounded-lg transition-all duration-200",
                viewMode === 'grid' 
                  ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" 
                  : "hover:bg-muted-foreground/10 text-muted-foreground"
              )}
              onClick={() => setViewMode('grid')}
              data-testid="button-view-grid"
            >
              <Grid3X3 className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-9 w-9 sm:h-11 sm:w-11 rounded-lg transition-all duration-200",
                viewMode === 'list' 
                  ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" 
                  : "hover:bg-muted-foreground/10 text-muted-foreground"
              )}
              onClick={() => setViewMode('list')}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
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
                                {price.toFixed(2)} {currencySymbol}
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
      <div className="w-full lg:w-[480px] bg-white dark:bg-gray-800 border-t lg:border-t-0 lg:border-l flex flex-col shadow-xl lg:max-h-screen">
        {/* Cart Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-2 sm:p-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-white/10 rounded-lg">
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-bold">Cart</h2>
                <p className="text-[10px] sm:text-xs text-gray-300 hidden sm:block">{totalItems} items</p>
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
                <span className="text-muted-foreground text-xs sm:text-sm">Walk-in Customer (tap to select)</span>
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
                <p className="text-base sm:text-lg font-medium">Cart is empty</p>
                <p className="text-xs sm:text-sm">Scan or click products to add</p>
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
                              Custom
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium text-xs leading-tight line-clamp-2">{item.name}</h4>
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
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {item.price.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
                        </p>
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
                {discount > 0 ? `${discount.toFixed(2)} ${currencySymbol}` : 'Discount'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
                onClick={() => setShowNotesDialog(true)}
                data-testid="button-add-notes"
              >
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                {orderNotes ? 'Edit Notes' : 'Add Notes'}
              </Button>
            </div>

            {/* Totals */}
            <div className="space-y-1 sm:space-y-2 text-sm sm:text-base">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium tabular-nums">{subtotal.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span className="font-medium tabular-nums">-{discount.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}</span>
                </div>
              )}
              <div className="flex justify-between text-lg sm:text-xl font-bold pt-2 border-t">
                <span>Total</span>
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
                'Processing...'
              ) : (
                <>
                  <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
                  Pay {total.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currencySymbol}
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
              Total: <span className="font-bold text-xl text-primary tabular-nums">{total.toFixed(2)} {currencySymbol}</span>
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

      {/* Cash Payment Dialog - Enhanced for older users */}
      <Dialog open={showCashDialog} onOpenChange={setShowCashDialog}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
          {/* Header with Icon */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <Banknote className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{t('pos:cashPayment', 'Cash Payment')}</h2>
                <p className="text-white/80 text-sm">{t('pos:enterAmountReceived', 'Enter amount received from customer')}</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Total Due - Hero Block */}
            <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 text-center">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {t('pos:totalDue', 'Total Due')} / Cần thu
              </p>
              <p className="text-4xl font-bold text-primary tabular-nums">
                {total.toFixed(2)} {currencySymbol}
              </p>
            </div>

            {/* Customer Pays Section */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                {t('pos:customerPays', 'Customer Pays')} / Khách đưa
              </p>
              
              {/* Quick Amount Buttons - Large Touch Targets */}
              <div className="grid grid-cols-3 gap-2">
                {/* Exact Amount Button */}
                <Button
                  variant={cashReceived === total.toFixed(2) ? "default" : "outline"}
                  className="h-16 text-base font-bold flex-col gap-0.5"
                  onClick={() => setCashReceived(total.toFixed(2))}
                  data-testid="button-exact-amount"
                >
                  <span className="text-xs opacity-70">{t('pos:exact', 'Exact')}</span>
                  <span className="tabular-nums">{total.toFixed(2)} {currencySymbol}</span>
                </Button>
                
                {/* Rounded to nearest integer */}
                {(() => {
                  const roundedUp = Math.ceil(total);
                  if (roundedUp > total) {
                    return (
                      <Button
                        variant={cashReceived === roundedUp.toString() ? "default" : "outline"}
                        className="h-16 text-lg font-bold"
                        onClick={() => setCashReceived(roundedUp.toString())}
                        data-testid={`button-quick-cash-${roundedUp}`}
                      >
                        {roundedUp} {currencySymbol}
                      </Button>
                    );
                  }
                  return null;
                })()}
                
                {/* Rounded to nearest 10 */}
                {(() => {
                  const roundedUp10 = Math.ceil(total / 10) * 10;
                  const roundedUp = Math.ceil(total);
                  if (roundedUp10 > roundedUp) {
                    return (
                      <Button
                        variant={cashReceived === roundedUp10.toString() ? "default" : "outline"}
                        className="h-16 text-lg font-bold"
                        onClick={() => setCashReceived(roundedUp10.toString())}
                        data-testid={`button-quick-cash-${roundedUp10}`}
                      >
                        {roundedUp10} {currencySymbol}
                      </Button>
                    );
                  }
                  return null;
                })()}
              </div>
              
              {/* Custom Amount Input - Auto-focused with select all on focus */}
              <div className="relative">
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">
                  {currencySymbol}
                </div>
                <Input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="0.00"
                  className="h-16 text-3xl font-bold text-center pl-4 pr-16 tabular-nums"
                  autoFocus
                  data-testid="input-cash-amount"
                />
              </div>
            </div>
            
            {/* Change Section - Always visible */}
            <div className={cn(
              "rounded-xl p-4 text-center transition-colors",
              parseFloat(cashReceived || '0') >= total 
                ? "bg-green-100 dark:bg-green-900/30 border-2 border-green-500" 
                : parseFloat(cashReceived || '0') > 0 
                  ? "bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700"
                  : "bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700"
            )}>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {parseFloat(cashReceived || '0') >= total 
                  ? `${t('pos:changeToGive', 'Change to Give')} / Tiền thối`
                  : `${t('pos:stillOwed', 'Still Owed')} / Còn thiếu`
                }
              </p>
              <p className={cn(
                "text-4xl font-bold tabular-nums",
                parseFloat(cashReceived || '0') >= total 
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}>
                {parseFloat(cashReceived || '0') >= total 
                  ? `${(parseFloat(cashReceived || '0') - total).toFixed(2)} ${currencySymbol}`
                  : `${(total - parseFloat(cashReceived || '0')).toFixed(2)} ${currencySymbol}`
                }
              </p>
              {parseFloat(cashReceived || '0') > 0 && parseFloat(cashReceived || '0') < total && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {t('pos:needMoreMoney', 'Need more money!')}
                </p>
              )}
            </div>
          </div>
          
          {/* Footer Actions - Full Width Stacked */}
          <div className="p-4 pt-0 space-y-2">
            <Button
              size="lg"
              className="w-full h-16 text-xl font-bold bg-green-600 hover:bg-green-700"
              onClick={handleCashPayment}
              disabled={createOrderMutation.isPending || parseFloat(cashReceived || '0') < total}
              data-testid="button-confirm-cash"
            >
              {createOrderMutation.isPending ? (
                <>
                  <div className="h-5 w-5 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t('common:processing', 'Processing...')}
                </>
              ) : (
                <>
                  <Check className="h-6 w-6 mr-2" />
                  {t('pos:completeSale', 'Complete Sale')}
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="w-full h-14 text-base"
              onClick={() => { setShowCashDialog(false); setShowPaymentDialog(true); }}
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              {t('common:back', 'Back')}
            </Button>
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
                        {customer.phone && (
                          <span className="text-xs text-muted-foreground">{customer.phone}</span>
                        )}
                        {(customer.city || customer.country) && (
                          <span className="text-xs text-muted-foreground">
                            {[customer.city, customer.country].filter(Boolean).join(', ')}
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
                          {customer.name || customer.facebookName || t('pos:customer', 'Customer')}
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
                          {(customer.city || customer.country) && (
                            <span className="text-xs text-muted-foreground">
                              {[customer.city, customer.country].filter(Boolean).join(', ')}
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
                  <span className="text-sm text-gray-600 dark:text-gray-400">Amount in CZK</span>
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
              Subtotal: <span className="font-semibold tabular-nums">{subtotal.toFixed(2)} {currencySymbol}</span>
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
                {discountType === 'percentage' ? '%' : currencySymbol}
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
                      {amount} {currencySymbol}
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
                  <span className="font-bold text-green-700 dark:text-green-300 tabular-nums">
                    -{discountType === 'percentage' 
                      ? ((subtotal * parseFloat(discountInput)) / 100).toFixed(2)
                      : parseFloat(discountInput).toFixed(2)
                    } {currencySymbol}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-green-700 dark:text-green-300">New Total:</span>
                  <span className="font-bold text-lg text-green-700 dark:text-green-300 tabular-nums">
                    {discountType === 'percentage'
                      ? (subtotal - (subtotal * parseFloat(discountInput)) / 100).toFixed(2)
                      : (subtotal - parseFloat(discountInput)).toFixed(2)
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
            <Button onClick={handleApplyDiscount} data-testid="button-apply-discount" disabled={!discountInput || parseFloat(discountInput) <= 0}>
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
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={customItemPrice}
                  onChange={(e) => setCustomItemPrice(e.target.value)}
                  data-testid="input-custom-item-price"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('pos:cost', 'Cost')} ({currencySymbol})</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={customItemCost}
                  onChange={(e) => setCustomItemCost(e.target.value)}
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
                    (parseFloat(customItemPrice) - (parseFloat(customItemCost) || 0)) >= 0 
                      ? "text-green-600" 
                      : "text-red-600"
                  )}>
                    {((parseFloat(customItemPrice) || 0) - (parseFloat(customItemCost) || 0)).toFixed(2)} {currencySymbol}
                  </span>
                </div>
                {customItemCost && parseFloat(customItemPrice) > 0 && (
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-muted-foreground">{t('pos:margin', 'Margin')}:</span>
                    <span className="text-sm">
                      {(((parseFloat(customItemPrice) - parseFloat(customItemCost)) / parseFloat(customItemPrice)) * 100).toFixed(1)}%
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
              disabled={!customItemName.trim() || !customItemPrice || parseFloat(customItemPrice) <= 0}
              className="bg-amber-600 hover:bg-amber-700"
              data-testid="button-add-custom-item"
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('pos:addToCart', 'Add to Cart')}
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
