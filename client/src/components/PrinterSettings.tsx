import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Printer, RefreshCw, Wifi, WifiOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  connectToQZ,
  getPrinters,
  isQZConnected,
  getSavedPrinter,
  savePrinter,
  testPrint,
  type PrinterContext
} from '@/utils/printer';

interface PrinterConfig {
  context: PrinterContext;
  label: string;
  description: string;
  type: 'label' | 'document';
}

const PRINTER_CONFIGS: PrinterConfig[] = [
  {
    context: 'label_printer_name',
    label: 'Default Label Printer',
    description: 'Default thermal printer for shipping labels (Zebra, etc.)',
    type: 'label'
  },
  {
    context: 'document_printer_name',
    label: 'Default Document Printer',
    description: 'Default printer for invoices and documents',
    type: 'document'
  },
  {
    context: 'ppl_label_printer',
    label: 'PPL Shipping Labels',
    description: 'Printer for PPL shipping labels',
    type: 'label'
  },
  {
    context: 'packing_list_printer',
    label: 'Packing List Printer',
    description: 'Printer for packing lists',
    type: 'document'
  },
  {
    context: 'invoice_printer',
    label: 'Invoice Printer',
    description: 'Printer for customer invoices',
    type: 'document'
  },
  {
    context: 'pos_receipt_printer',
    label: 'POS Receipt Printer',
    description: 'Printer for point of sale receipts',
    type: 'document'
  },
  {
    context: 'order_detail_label_printer',
    label: 'Order Detail Labels',
    description: 'Printer for labels from order detail page',
    type: 'label'
  },
  {
    context: 'pick_pack_label_printer',
    label: 'Pick & Pack Labels',
    description: 'Printer for labels during pick and pack',
    type: 'label'
  }
];

export function PrinterSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [printers, setPrinters] = useState<string[]>([]);
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
  const [savedPrinters, setSavedPrinters] = useState<Record<PrinterContext, string>>({} as Record<PrinterContext, string>);
  const [testingPrinter, setTestingPrinter] = useState<PrinterContext | null>(null);

  const loadSavedPrinters = useCallback(() => {
    const saved: Record<PrinterContext, string> = {} as Record<PrinterContext, string>;
    PRINTER_CONFIGS.forEach(config => {
      const printer = getSavedPrinter(config.context);
      if (printer) {
        saved[config.context] = printer;
      }
    });
    setSavedPrinters(saved);
  }, []);

  const autoConnect = useCallback(async () => {
    if (isQZConnected()) {
      setIsConnected(true);
      setConnectionError(null);
      return true;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      const connected = await connectToQZ();
      setIsConnected(connected);
      if (!connected) {
        setConnectionError(t('printer.pleaseStartQZ', 'Please start QZ Tray on your computer'));
      }
      return connected;
    } catch (error) {
      setConnectionError(t('printer.pleaseStartQZ', 'Please start QZ Tray on your computer'));
      setIsConnected(false);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [t]);

  const loadPrinters = useCallback(async () => {
    setIsLoadingPrinters(true);
    try {
      const availablePrinters = await getPrinters();
      setPrinters(availablePrinters);
    } catch (error) {
      console.error('Failed to load printers:', error);
    } finally {
      setIsLoadingPrinters(false);
    }
  }, []);

  const handlePrinterChange = (context: PrinterContext, value: string) => {
    savePrinter(value, context);
    setSavedPrinters(prev => ({ ...prev, [context]: value }));
    toast({
      title: t('printer.saved', 'Printer Saved'),
      description: value,
    });
  };

  const handleTestPrint = async (context: PrinterContext) => {
    const printerName = savedPrinters[context];
    if (!printerName) {
      toast({
        title: t('printer.selectFirst', 'Select Printer'),
        description: t('printer.selectFirstDesc', 'Please select a printer first'),
        variant: 'destructive',
      });
      return;
    }

    setTestingPrinter(context);
    try {
      await testPrint(printerName);
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
      setTestingPrinter(null);
    }
  };

  useEffect(() => {
    loadSavedPrinters();
    autoConnect().then(connected => {
      if (connected) {
        loadPrinters();
      }
    });
  }, [autoConnect, loadPrinters, loadSavedPrinters]);

  useEffect(() => {
    const interval = setInterval(() => {
      const connected = isQZConnected();
      if (connected !== isConnected) {
        setIsConnected(connected);
        if (connected) {
          setConnectionError(null);
          loadPrinters();
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isConnected, loadPrinters]);

  const labelPrinters = PRINTER_CONFIGS.filter(c => c.type === 'label');
  const documentPrinters = PRINTER_CONFIGS.filter(c => c.type === 'document');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          {t('printer.settings', 'Printer Settings')}
        </CardTitle>
        <CardDescription>
          {t('printer.description', 'Configure direct printing using QZ Tray')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            {isConnecting ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
                <div>
                  <p className="font-medium">{t('printer.connecting', 'Connecting to QZ Tray...')}</p>
                </div>
              </>
            ) : isConnected ? (
              <>
                <Wifi className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">
                    {t('printer.qzConnected', 'QZ Tray Connected')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {printers.length} {t('printer.printersFound', 'printers found')}
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
                  {connectionError && (
                    <p className="text-sm text-red-600">{connectionError}</p>
                  )}
                </div>
              </>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => { autoConnect().then(c => { if (c) loadPrinters(); }); }}
            disabled={isConnecting}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isConnecting ? 'animate-spin' : ''}`} />
            {t('printer.retry', 'Retry')}
          </Button>
        </div>

        {!isConnected && !isConnecting && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('printer.pleaseStartQZ', 'Please start QZ Tray on your computer.')}
              {' '}
              <a 
                href="https://qz.io/download/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-medium underline"
              >
                {t('printer.downloadHere', 'Download here')}
              </a>
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

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
                  <Badge variant="secondary">{t('printer.labels', 'Labels')}</Badge>
                  {t('printer.labelPrinters', 'Label Printers')}
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {labelPrinters.map(config => (
                    <div key={config.context} className="space-y-2 p-4 border rounded-lg">
                      <Label className="font-medium">{config.label}</Label>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                      <Select 
                        value={savedPrinters[config.context] || ''} 
                        onValueChange={(v) => handlePrinterChange(config.context, v)}
                      >
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
                        onClick={() => handleTestPrint(config.context)}
                        disabled={!savedPrinters[config.context] || testingPrinter === config.context}
                      >
                        {testingPrinter === config.context ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Printer className="h-4 w-4 mr-2" />
                        )}
                        {t('printer.testPrint', 'Test Print')}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
                  <Badge variant="secondary">{t('printer.documents', 'Documents')}</Badge>
                  {t('printer.documentPrinters', 'Document Printers')}
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {documentPrinters.map(config => (
                    <div key={config.context} className="space-y-2 p-4 border rounded-lg">
                      <Label className="font-medium">{config.label}</Label>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                      <Select 
                        value={savedPrinters[config.context] || ''} 
                        onValueChange={(v) => handlePrinterChange(config.context, v)}
                      >
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
                        onClick={() => handleTestPrint(config.context)}
                        disabled={!savedPrinters[config.context] || testingPrinter === config.context}
                      >
                        {testingPrinter === config.context ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Printer className="h-4 w-4 mr-2" />
                        )}
                        {t('printer.testPrint', 'Test Print')}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {Object.keys(savedPrinters).length > 0 && (
              <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-300">
                  {t('printer.printersConfigured', 'Printers configured: ')}
                  {Object.keys(savedPrinters).length}/{PRINTER_CONFIGS.length}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default PrinterSettings;
