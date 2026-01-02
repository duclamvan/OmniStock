import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Download, Loader2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

export interface ReceiptData {
  orderId: string;
  items: ReceiptItem[];
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

export interface CompanyInfo {
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

export type ReceiptLanguage = 'en' | 'vi' | 'cz' | 'de';

interface ThermalReceiptProps {
  data: ReceiptData;
  onClose: () => void;
  onPrint?: () => void;
  companyInfo: CompanyInfo;
  fullOrderId?: string; // Full order ID for packing list print
}

export function ThermalReceipt({ data, onClose, onPrint, companyInfo, fullOrderId }: ThermalReceiptProps) {
  const { t } = useTranslation(['common', 'financial']);
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(true);
  const cachedBlobRef = useRef<Blob | null>(null);
  const [receiptLang, setReceiptLang] = useState<ReceiptLanguage>(() => {
    return (localStorage.getItem('pos_receipt_language') as ReceiptLanguage) || 'cz';
  });

  const languageFlags: Record<ReceiptLanguage, string> = {
    en: '🇬🇧',
    vi: '🇻🇳', 
    cz: '🇨🇿',
    de: '🇩🇪'
  };

  const getReceiptPayload = useCallback(() => ({
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
  }), [data, receiptLang, companyInfo]);

  const fetchPdf = useCallback(async () => {
    setIsLoadingPdf(true);
    try {
      const response = await fetch('/api/pos/receipt-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(getReceiptPayload())
      });

      if (!response.ok) throw new Error('Failed to generate PDF');
      
      const blob = await response.blob();
      cachedBlobRef.current = blob;
      const url = window.URL.createObjectURL(blob);
      
      setPdfUrl(prevUrl => {
        if (prevUrl) {
          window.URL.revokeObjectURL(prevUrl);
        }
        return url;
      });
    } catch (error) {
      console.error('Error fetching PDF:', error);
      toast({
        title: t('common:error'),
        description: t('financial:pdfGenerationFailed', 'Failed to generate PDF preview'),
        variant: 'destructive'
      });
    } finally {
      setIsLoadingPdf(false);
    }
  }, [getReceiptPayload, t, toast]);

  const payloadString = useMemo(() => JSON.stringify(getReceiptPayload()), [getReceiptPayload]);

  useEffect(() => {
    cachedBlobRef.current = null;
    fetchPdf();
  }, [payloadString]);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  useEffect(() => {
    localStorage.setItem('pos_receipt_language', receiptLang);
  }, [receiptLang]);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      let blob = cachedBlobRef.current;
      
      if (!blob) {
        const response = await fetch('/api/pos/receipt-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(getReceiptPayload())
        });
        if (!response.ok) throw new Error('Failed to generate PDF');
        blob = await response.blob();
      }

      const url = window.URL.createObjectURL(blob);
      
      // Open PDF in new window for printing (works with Chrome kiosk mode)
      // Use minimal popup that auto-triggers print
      const printWindow = window.open(url, '_blank', 'width=450,height=700,menubar=no,toolbar=no,location=no,status=no');
      
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
        };
        // Cleanup after delay
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 60000);
      } else {
        // Popup blocked - use native window.print() on current page
        // The .no-print class hides buttons during printing
        window.URL.revokeObjectURL(url);
        window.print();
      }
      
      onPrint?.();
    } catch (error) {
      console.error('Error printing PDF:', error);
      toast({
        title: t('common:error'),
        description: t('financial:printFailed', 'Failed to print receipt'),
        variant: 'destructive'
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      let blob = cachedBlobRef.current;
      
      if (!blob) {
        const response = await fetch('/api/pos/receipt-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(getReceiptPayload())
        });
        if (!response.ok) throw new Error('Failed to generate PDF');
        blob = await response.blob();
      }

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

  return (
    <div className="relative print-receipt-container">
      {/* Language selector - compact on mobile */}
      <div className="no-print flex justify-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
        {(Object.keys(languageFlags) as ReceiptLanguage[]).map((lang) => (
          <button
            key={lang}
            onClick={() => setReceiptLang(lang)}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
              receiptLang === lang
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            }`}
            data-testid={`button-receipt-lang-${lang}`}
          >
            {languageFlags[lang]} <span className="hidden sm:inline">{lang.toUpperCase()}</span>
          </button>
        ))}
      </div>
      
      {/* PDF Preview - Responsive */}
      <div className="flex justify-center">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden w-full max-w-[420px]">
          {isLoadingPdf ? (
            <div className="flex items-center justify-center h-[300px] sm:h-[450px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pdfUrl ? (
            <embed
              src={pdfUrl}
              type="application/pdf"
              className="w-full h-[300px] sm:h-[450px]"
              style={{ border: 'none' }}
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] sm:h-[450px] text-muted-foreground">
              {t('common:error')}
            </div>
          )}
        </div>
      </div>
      
      {/* Action Buttons - Stack on mobile, wrap on larger screens */}
      <div className="no-print grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 justify-center mt-4 sm:mt-6">
        {/* Print Packing List */}
        {fullOrderId && (
          <Button 
            size="default"
            onClick={() => {
              const printWindow = window.open(`/api/orders/${fullOrderId}/packing-list.pdf`, '_blank');
              if (printWindow) {
                printWindow.onload = () => {
                  printWindow.print();
                };
              }
            }}
            className="h-10 sm:h-11 px-3 sm:px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm"
            data-testid="button-print-packing-list"
          >
            <FileText className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('orders:packingList', 'Packing List')}</span>
            <span className="sm:hidden ml-1.5">Pack</span>
          </Button>
        )}
        <Button 
          size="default" 
          variant="secondary" 
          onClick={handlePrint} 
          disabled={isPrinting || isLoadingPdf} 
          className="h-10 sm:h-11 px-3 sm:px-6 text-xs sm:text-sm" 
          data-testid="button-print-receipt"
        >
          {isPrinting ? (
            <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
          ) : (
            <Printer className="h-4 w-4 sm:mr-2" />
          )}
          <span className="hidden sm:inline">{t('financial:printReceipt')}</span>
          <span className="sm:hidden ml-1.5">{t('common:print', 'Print')}</span>
        </Button>
        <Button 
          size="default"
          variant="outline" 
          onClick={handleDownloadPDF} 
          disabled={isDownloading || isLoadingPdf}
          className="h-10 sm:h-11 px-3 sm:px-6 text-xs sm:text-sm"
          data-testid="button-download-pdf"
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 sm:mr-2" />
          )}
          <span className="hidden sm:inline">{t('financial:downloadPDF')}</span>
          <span className="sm:hidden ml-1.5">PDF</span>
        </Button>
        <Button 
          size="default" 
          variant="ghost" 
          onClick={onClose} 
          className="h-10 sm:h-11 text-xs sm:text-sm"
          data-testid="button-close-receipt"
        >
          {t('common:close')}
        </Button>
      </div>
    </div>
  );
}

export function useOrderReceiptData(order: any, currency: string = 'EUR'): ReceiptData | null {
  if (!order) return null;
  
  const getParentName = (name: string) => {
    const match = name.match(/^(.+?)\s*[-–—]\s*(?:Color|Màu|Size|Kích thước|Variant|Biến thể)\s*.+$/i);
    return match ? match[1].trim() : name;
  };
  
  const grouped = (order.items || []).reduce((acc: Record<string, { name: string; totalQty: number; totalPrice: number; variantCount: number }>, item: any) => {
    const parentName = getParentName(item.productName || item.name || 'Item');
    const itemQty = item.quantity || 1;
    const itemPrice = parseFloat(item.unitPrice || item.price || '0');
    
    if (!acc[parentName]) {
      acc[parentName] = { name: parentName, totalQty: 0, totalPrice: 0, variantCount: 0 };
    }
    acc[parentName].totalQty += itemQty;
    acc[parentName].totalPrice += itemPrice * itemQty;
    acc[parentName].variantCount += 1;
    return acc;
  }, {});
  
  const items: ReceiptItem[] = Object.values(grouped).map((g: any) => ({
    name: g.variantCount > 1 ? `${g.name} (${g.variantCount})` : g.name,
    quantity: g.totalQty,
    price: g.totalQty > 0 ? g.totalPrice / g.totalQty : 0
  }));

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = parseFloat(order.discount || '0');
  const total = parseFloat(
    currency === 'EUR' 
      ? (order.totalEur || order.total || '0') 
      : (order.totalCzk || order.total || '0')
  );

  const customerName = order.customer 
    ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || order.customer.company || ''
    : '';

  return {
    orderId: order.orderId || order.customOrderId || order.id?.slice(0, 8).toUpperCase() || '',
    items,
    subtotal: subtotal || total,
    discount,
    total,
    currency,
    paymentMethod: order.paymentMethod || 'cash',
    customerName,
    notes: order.notes || '',
    date: order.createdAt ? new Date(order.createdAt) : new Date(),
    cashReceived: order.cashReceived ? parseFloat(order.cashReceived) : undefined,
    change: order.change ? parseFloat(order.change) : undefined,
  };
}
