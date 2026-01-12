import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import {
  connectToQZ,
  isQZConnected,
  printPDF,
  printLabelPDF,
  printImage,
  printHTML,
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

  const printLabelImage = useCallback(async (
    imageBase64: string,
    fallbackToBrowser: boolean = true
  ): Promise<PrintResult> => {
    const printerName = getSavedPrinter(context) || getSavedPrinter('label_printer_name');
    
    if (!printerName) {
      if (fallbackToBrowser) {
        openImageInBrowser(imageBase64);
        return { success: true, usedQZ: false };
      }
      return { success: false, usedQZ: false, error: 'No printer configured' };
    }

    setIsPrinting(true);
    try {
      const connected = await connectToQZ();
      if (!connected) {
        if (fallbackToBrowser) {
          openImageInBrowser(imageBase64);
          toast({
            title: t('printer:qzNotConnected', 'QZ Tray not connected'),
            description: t('printer:usingBrowserPrint', 'Using browser print dialog instead'),
          });
          return { success: true, usedQZ: false };
        }
        return { success: false, usedQZ: false, error: 'QZ Tray not connected' };
      }

      console.log('[usePrinter] Printing image via QZ Tray to:', printerName);
      await printImage(printerName, imageBase64);
      toast({
        title: t('printer:printSuccess', 'Print sent'),
        description: printerName,
      });
      return { success: true, usedQZ: true };
    } catch (error) {
      console.error('[usePrinter] Print image error:', error);
      if (fallbackToBrowser) {
        openImageInBrowser(imageBase64);
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

  const printLabelHTML = useCallback(async (
    htmlContent: string,
    options?: { orientation?: 'portrait' | 'landscape'; width?: number; height?: number },
    fallbackToBrowser: boolean = true
  ): Promise<PrintResult> => {
    const printerName = getSavedPrinter(context) || getSavedPrinter('label_printer_name');
    
    if (!printerName) {
      if (fallbackToBrowser) {
        openHtmlInBrowser(htmlContent);
        return { success: true, usedQZ: false };
      }
      return { success: false, usedQZ: false, error: 'No printer configured' };
    }

    setIsPrinting(true);
    try {
      const connected = await connectToQZ();
      if (!connected) {
        if (fallbackToBrowser) {
          openHtmlInBrowser(htmlContent);
          toast({
            title: t('printer:qzNotConnected', 'QZ Tray not connected'),
            description: t('printer:usingBrowserPrint', 'Using browser print dialog instead'),
          });
          return { success: true, usedQZ: false };
        }
        return { success: false, usedQZ: false, error: 'QZ Tray not connected' };
      }

      const printOptions: Record<string, unknown> = {};
      if (options?.orientation) {
        printOptions.orientation = options.orientation;
      }
      if (options?.width && options?.height) {
        printOptions.size = { width: options.width, height: options.height };
      }

      console.log('[usePrinter] Printing HTML via QZ Tray to:', printerName, 'options:', printOptions);
      await printHTML(printerName, htmlContent, printOptions);
      toast({
        title: t('printer:printSuccess', 'Print sent'),
        description: printerName,
      });
      return { success: true, usedQZ: true };
    } catch (error) {
      console.error('[usePrinter] Print HTML error:', error);
      if (fallbackToBrowser) {
        openHtmlInBrowser(htmlContent);
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
    
    // If no printer configured, use browser print directly
    if (!printerName) {
      if (fallbackToBrowser) {
        console.log('[usePrinter] No printer configured, using browser print');
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
          console.log('[usePrinter] QZ not connected, using browser print');
          openPdfInBrowser(pdfBase64);
          return { success: true, usedQZ: false };
        }
        return { success: false, usedQZ: false, error: 'QZ Tray not connected' };
      }

      console.log('[usePrinter] Printing via QZ Tray to:', printerName);
      await printPDF(printerName, pdfBase64);
      toast({
        title: t('printer:printSuccess', 'Print sent'),
        description: printerName,
      });
      return { success: true, usedQZ: true };
    } catch (error) {
      console.error('[usePrinter] Print error:', error);
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
    printLabelImage,
    printLabelHTML,
    printDocument,
    refreshConnection,
  };
}

function openHtmlInBrowser(htmlContent: string) {
  try {
    console.log('[usePrinter] Opening HTML in browser for printing...');
    const printWindow = window.open('', '_blank', 'width=600,height=400');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 100);
      };
    }
  } catch (error) {
    console.error('[usePrinter] Failed to open HTML in browser:', error);
  }
}

function openImageInBrowser(base64Data: string) {
  try {
    console.log('[usePrinter] Opening image in browser for printing...');
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    const blobUrl = URL.createObjectURL(blob);
    
    const printWindow = window.open('', '_blank', 'width=600,height=400');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Label</title>
            <style>
              @page { size: auto; margin: 0; }
              body { margin: 0; display: flex; justify-content: center; align-items: center; }
              img { max-width: 100%; height: auto; }
            </style>
          </head>
          <body>
            <img src="${blobUrl}" onload="window.print(); window.close();" />
          </body>
        </html>
      `);
      printWindow.document.close();
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch (error) {
    console.error('[usePrinter] Failed to open image in browser:', error);
  }
}

function openPdfInBrowser(base64Data: string) {
  try {
    console.log('[usePrinter] Opening PDF in browser for printing...');
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    
    // Open in a popup window with specific dimensions to trigger print dialog
    const printWindow = window.open(blobUrl, '_blank', 'width=800,height=600,menubar=no,toolbar=no,location=no,status=no');
    if (printWindow) {
      printWindow.onload = () => {
        console.log('[usePrinter] Print window loaded, triggering print dialog...');
        printWindow.focus();
        // Small delay to ensure PDF is rendered before printing
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    } else {
      // Popup blocked - try iframe approach
      console.log('[usePrinter] Popup blocked, trying iframe approach...');
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.print();
          // Cleanup after print
          setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(blobUrl);
          }, 1000);
        }, 500);
      };
      return;
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch (error) {
    console.error('[usePrinter] Failed to open PDF in browser:', error);
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

export function useWarehouseLabelPrinter() {
  return usePrinter({ context: 'warehouse_label_printer' });
}
