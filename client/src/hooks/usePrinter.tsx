import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import {
  connectToQZ,
  isQZConnected,
  printPDF,
  printLabelPDF,
  getSavedPrinter,
  type PrinterContext
} from '@/utils/printer';

interface UsePrinterOptions {
  context?: PrinterContext;
  autoConnect?: boolean;
}

interface PrintResult {
  success: boolean;
  usedQZ: boolean;
  error?: string;
}

export function usePrinter(options: UsePrinterOptions = {}) {
  const { context = 'label_printer_name', autoConnect = true } = options;
  const { toast } = useToast();
  const { t } = useTranslation(['common', 'printer']);
  const [isConnected, setIsConnected] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [savedPrinter, setSavedPrinter] = useState<string | null>(null);

  useEffect(() => {
    const printer = getSavedPrinter(context);
    setSavedPrinter(printer);
  }, [context]);

  useEffect(() => {
    if (autoConnect) {
      const checkConnection = async () => {
        if (isQZConnected()) {
          setIsConnected(true);
        } else {
          const connected = await connectToQZ();
          setIsConnected(connected);
        }
      };
      checkConnection();
    }
  }, [autoConnect]);

  const refreshConnection = useCallback(async () => {
    const connected = await connectToQZ();
    setIsConnected(connected);
    return connected;
  }, []);

  const printLabel = useCallback(async (
    pdfBase64: string,
    fallbackToBrowser: boolean = true
  ): Promise<PrintResult> => {
    const printerName = getSavedPrinter(context) || getSavedPrinter('label_printer_name');
    
    if (!printerName) {
      if (fallbackToBrowser) {
        openPdfInBrowser(pdfBase64);
        return { success: true, usedQZ: false };
      }
      return { success: false, usedQZ: false, error: 'No printer configured' };
    }

    setIsPrinting(true);
    try {
      const connected = await connectToQZ();
      if (!connected) {
        if (fallbackToBrowser) {
          openPdfInBrowser(pdfBase64);
          toast({
            title: t('printer:qzNotConnected', 'QZ Tray not connected'),
            description: t('printer:usingBrowserPrint', 'Using browser print dialog instead'),
          });
          return { success: true, usedQZ: false };
        }
        return { success: false, usedQZ: false, error: 'QZ Tray not connected' };
      }

      await printLabelPDF(printerName, pdfBase64, '4x6');
      toast({
        title: t('printer:printSuccess', 'Print sent'),
        description: printerName,
      });
      return { success: true, usedQZ: true };
    } catch (error) {
      console.error('Print error:', error);
      if (fallbackToBrowser) {
        openPdfInBrowser(pdfBase64);
        toast({
          title: t('printer:printError', 'Direct print failed'),
          description: t('printer:usingBrowserPrint', 'Using browser print dialog instead'),
          variant: 'destructive',
        });
        return { success: true, usedQZ: false };
      }
      return { success: false, usedQZ: false, error: String(error) };
    } finally {
      setIsPrinting(false);
    }
  }, [context, toast, t]);

  const printDocument = useCallback(async (
    pdfBase64: string,
    fallbackToBrowser: boolean = true
  ): Promise<PrintResult> => {
    const printerName = getSavedPrinter(context) || getSavedPrinter('document_printer_name');
    
    if (!printerName) {
      if (fallbackToBrowser) {
        openPdfInBrowser(pdfBase64);
        return { success: true, usedQZ: false };
      }
      return { success: false, usedQZ: false, error: 'No printer configured' };
    }

    setIsPrinting(true);
    try {
      const connected = await connectToQZ();
      if (!connected) {
        if (fallbackToBrowser) {
          openPdfInBrowser(pdfBase64);
          return { success: true, usedQZ: false };
        }
        return { success: false, usedQZ: false, error: 'QZ Tray not connected' };
      }

      await printPDF(printerName, pdfBase64);
      toast({
        title: t('printer:printSuccess', 'Print sent'),
        description: printerName,
      });
      return { success: true, usedQZ: true };
    } catch (error) {
      console.error('Print error:', error);
      if (fallbackToBrowser) {
        openPdfInBrowser(pdfBase64);
        return { success: true, usedQZ: false };
      }
      return { success: false, usedQZ: false, error: String(error) };
    } finally {
      setIsPrinting(false);
    }
  }, [context, toast, t]);

  const canDirectPrint = isConnected && !!savedPrinter;

  return {
    isConnected,
    isPrinting,
    savedPrinter,
    canDirectPrint,
    printLabel,
    printDocument,
    refreshConnection,
  };
}

function openPdfInBrowser(base64Data: string) {
  try {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    const printWindow = window.open(blobUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  } catch (error) {
    console.error('Failed to open PDF in browser:', error);
  }
}

export function usePPLLabelPrinter() {
  return usePrinter({ context: 'ppl_label_printer' });
}

export function usePackingListPrinter() {
  return usePrinter({ context: 'packing_list_printer' });
}

export function useInvoicePrinter() {
  return usePrinter({ context: 'invoice_printer' });
}

export function usePickPackPrinter() {
  return usePrinter({ context: 'pick_pack_label_printer' });
}

export function useOrderDetailPrinter() {
  return usePrinter({ context: 'order_detail_label_printer' });
}
