import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Printer, RefreshCw, Wifi, WifiOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  connectToQZ,
  disconnectFromQZ,
  getPrinters,
  isQZConnected,
  getSavedPrinter,
  savePrinter,
  printPDF
} from '@/utils/printer';

export function PrinterSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
  const [labelPrinter, setLabelPrinter] = useState<string>(getSavedPrinter('label') || '');
  const [documentPrinter, setDocumentPrinter] = useState<string>(getSavedPrinter('document') || '');
  const [testPrinting, setTestPrinting] = useState<string | null>(null);

  const checkConnection = useCallback(() => {
    setIsConnected(isQZConnected());
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const connected = await connectToQZ();
      setIsConnected(connected);
      if (connected) {
        toast({
          title: t('printer.connected', 'Connected to QZ Tray'),
          description: t('printer.connectedDesc', 'You can now print directly to your printers'),
        });
        await loadPrinters();
      } else {
        toast({
          title: t('printer.connectionFailed', 'Connection Failed'),
          description: t('printer.connectionFailedDesc', 'Please ensure QZ Tray is running on your computer'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('printer.error', 'Error'),
        description: String(error),
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectFromQZ();
    setIsConnected(false);
    setPrinters([]);
    toast({
      title: t('printer.disconnected', 'Disconnected'),
      description: t('printer.disconnectedDesc', 'Disconnected from QZ Tray'),
    });
  };

  const loadPrinters = async () => {
    setIsLoadingPrinters(true);
    try {
      const availablePrinters = await getPrinters();
      setPrinters(availablePrinters);
    } catch (error) {
      console.error('Failed to load printers:', error);
      toast({
        title: t('printer.loadFailed', 'Failed to load printers'),
        description: String(error),
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPrinters(false);
    }
  };

  const handleLabelPrinterChange = (value: string) => {
    setLabelPrinter(value);
    savePrinter(value, 'label');
    toast({
      title: t('printer.saved', 'Printer Saved'),
      description: t('printer.labelPrinterSaved', 'Label printer set to: ') + value,
    });
  };

  const handleDocumentPrinterChange = (value: string) => {
    setDocumentPrinter(value);
    savePrinter(value, 'document');
    toast({
      title: t('printer.saved', 'Printer Saved'),
      description: t('printer.documentPrinterSaved', 'Document printer set to: ') + value,
    });
  };

  const handleTestPrint = async (printerName: string, type: 'label' | 'document') => {
    if (!printerName) {
      toast({
        title: t('printer.selectFirst', 'Select Printer'),
        description: t('printer.selectFirstDesc', 'Please select a printer first'),
        variant: 'destructive',
      });
      return;
    }

    setTestPrinting(type);
    try {
      const testPdf = generateTestPDF();
      await printPDF(printerName, testPdf, {
        size: type === 'label' ? { width: 4, height: 6, units: 'in' } : undefined
      });
      toast({
        title: t('printer.testSuccess', 'Test Print Sent'),
        description: t('printer.testSuccessDesc', 'Test page sent to: ') + printerName,
      });
    } catch (error) {
      toast({
        title: t('printer.testFailed', 'Test Print Failed'),
        description: String(error),
        variant: 'destructive',
      });
    } finally {
      setTestPrinting(null);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  useEffect(() => {
    if (isConnected && printers.length === 0) {
      loadPrinters();
    }
  }, [isConnected]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          {t('printer.settings', 'Printer Settings')}
        </CardTitle>
        <CardDescription>
          {t('printer.description', 'Configure direct printing to your label and document printers using QZ Tray')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <>
                <Wifi className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">
                    {t('printer.qzConnected', 'QZ Tray Connected')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('printer.readyToPrint', 'Ready to print')}
                  </p>
                </div>
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5 text-red-500" />
                <div>
                  <p className="font-medium text-red-700 dark:text-red-400">
                    {t('printer.qzDisconnected', 'QZ Tray Not Connected')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('printer.startQZ', 'Start QZ Tray on your computer to enable direct printing')}
                  </p>
                </div>
              </>
            )}
          </div>
          <Button
            variant={isConnected ? "outline" : "default"}
            onClick={isConnected ? handleDisconnect : handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : isConnected ? (
              <WifiOff className="h-4 w-4 mr-2" />
            ) : (
              <Wifi className="h-4 w-4 mr-2" />
            )}
            {isConnected 
              ? t('printer.disconnect', 'Disconnect')
              : t('printer.connect', 'Connect')
            }
          </Button>
        </div>

        {!isConnected && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('printer.downloadQZ', 'Download and install QZ Tray from')}{' '}
              <a 
                href="https://qz.io/download/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-medium underline"
              >
                qz.io/download
              </a>
              {' '}{t('printer.toEnablePrinting', 'to enable direct printing')}
            </AlertDescription>
          </Alert>
        )}

        {isConnected && (
          <>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={loadPrinters}
                disabled={isLoadingPrinters}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingPrinters ? 'animate-spin' : ''}`} />
                {t('printer.refreshPrinters', 'Refresh Printers')}
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{t('printer.labels', 'Labels')}</Badge>
                  <span className="text-sm font-medium">
                    {t('printer.labelPrinter', 'Label Printer')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('printer.labelPrinterDesc', 'For shipping labels (PPL, etc.) - typically a Zebra or thermal printer')}
                </p>
                <Select value={labelPrinter} onValueChange={handleLabelPrinterChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('printer.selectPrinter', 'Select printer...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {printers.map((printer) => (
                      <SelectItem key={printer} value={printer}>
                        {printer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestPrint(labelPrinter, 'label')}
                  disabled={!labelPrinter || testPrinting === 'label'}
                >
                  {testPrinting === 'label' ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Printer className="h-4 w-4 mr-2" />
                  )}
                  {t('printer.testPrint', 'Test Print')}
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{t('printer.documents', 'Documents')}</Badge>
                  <span className="text-sm font-medium">
                    {t('printer.documentPrinter', 'Document Printer')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('printer.documentPrinterDesc', 'For invoices and packing lists - typically an office printer')}
                </p>
                <Select value={documentPrinter} onValueChange={handleDocumentPrinterChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('printer.selectPrinter', 'Select printer...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {printers.map((printer) => (
                      <SelectItem key={printer} value={printer}>
                        {printer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestPrint(documentPrinter, 'document')}
                  disabled={!documentPrinter || testPrinting === 'document'}
                >
                  {testPrinting === 'document' ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Printer className="h-4 w-4 mr-2" />
                  )}
                  {t('printer.testPrint', 'Test Print')}
                </Button>
              </div>
            </div>

            {labelPrinter && documentPrinter && (
              <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-300">
                  {t('printer.allConfigured', 'All printers configured! Shipping labels will print to ')}
                  <strong>{labelPrinter}</strong>
                  {t('printer.andDocuments', ' and documents to ')}
                  <strong>{documentPrinter}</strong>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function generateTestPDF(): string {
  const pdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 288 432] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 150 >> stream
BT
/F1 24 Tf
50 380 Td
(QZ Tray Test) Tj
0 -40 Td
/F1 14 Tf
(Printer is working!) Tj
0 -30 Td
(${new Date().toLocaleString()}) Tj
ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000466 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
545
%%EOF`;
  return btoa(pdfContent);
}

export default PrinterSettings;
