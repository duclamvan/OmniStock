import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Download, Loader2 } from 'lucide-react';
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
}

export function ThermalReceipt({ data, onClose, onPrint, companyInfo }: ThermalReceiptProps) {
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
        // Popup blocked - download instead
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-${data.orderId || Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        toast({
          title: t('common:info', 'Info'),
          description: t('financial:popupBlockedDownloading', 'Popup blocked - downloaded PDF instead'),
        });
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
      
      <div className="flex justify-center">
        <div 
          className="bg-white rounded-lg shadow-lg overflow-hidden"
          style={{ width: '420px', minHeight: '500px' }}
        >
          {isLoadingPdf ? (
            <div className="flex items-center justify-center h-[500px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pdfUrl ? (
            <embed
              src={pdfUrl}
              type="application/pdf"
              width="420"
              height="600"
              style={{ border: 'none' }}
            />
          ) : (
            <div className="flex items-center justify-center h-[500px] text-muted-foreground">
              {t('common:error')}
            </div>
          )}
        </div>
      </div>
      
      <div className="no-print flex flex-wrap gap-3 justify-center mt-6">
        <Button size="lg" onClick={handlePrint} disabled={isPrinting || isLoadingPdf} className="px-6" data-testid="button-print-receipt">
          {isPrinting ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <Printer className="h-5 w-5 mr-2" />
          )}
          {t('financial:printReceipt')}
        </Button>
        <Button 
          size="lg" 
          variant="secondary" 
          onClick={handleDownloadPDF} 
          disabled={isDownloading || isLoadingPdf}
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

export function useOrderReceiptData(order: any, currency: string = 'EUR'): ReceiptData | null {
  if (!order) return null;
  
  const items: ReceiptItem[] = (order.items || []).map((item: any) => ({
    name: item.productName || item.name || 'Item',
    quantity: item.quantity || 1,
    price: parseFloat(item.unitPrice || item.price || '0')
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
    orderId: order.customOrderId || order.id?.slice(0, 8).toUpperCase() || '',
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
