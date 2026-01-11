import qz from 'qz-tray';

const QZ_CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIECzCCAvOgAwIBAgIGAZutvfo0MA0GCSqGSIb3DQEBCwUAMIGiMQswCQYDVQQG
EwJVUzELMAkGA1UECAwCTlkxEjAQBgNVBAcMCUNhbmFzdG90YTEbMBkGA1UECgwS
UVogSW5kdXN0cmllcywgTExDMRswGQYDVQQLDBJRWiBJbmR1c3RyaWVzLCBMTEMx
HDAaBgkqhkiG9w0BCQEWDXN1cHBvcnRAcXouaW8xGjAYBgNVBAMMEVFaIFRyYXkg
RGVtbyBDZXJ0MB4XDTI2MDExMDE1NDc0N1oXDTQ2MDExMDE1NDc0N1owgaIxCzAJ
BgNVBAYTAlVTMQswCQYDVQQIDAJOWTESMBAGA1UEBwwJQ2FuYXN0b3RhMRswGQYD
VQQKDBJRWiBJbmR1c3RyaWVzLCBMTEMxGzAZBgNVBAsMElFaIEluZHVzdHJpZXMs
IExMQzEcMBoGCSqGSIb3DQEJARYNc3VwcG9ydEBxei5pbzEaMBgGA1UEAwwRUVog
VHJheSBEZW1vIENlcnQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDY
UPLYKJ+9DXL1m9rrey63d2+09BheBvkWXhkohPs6nFf9UwbHBLVCLknPCsOtcCMF
MFNHjkBmzzJUWDjBs9Yiq7IEU2kKhjMLrjGBdyckVely/RP7Op3tPNiymBayN9p6
OZoHq0hs2aNSpHAAK0ERLRZLkC/6HxW4nJc7pWJLbiSA3/0IibG8WbpN0onHaaKN
K5TwDWmQkRN1tsPqlBAUntvyj08KoIr3CgUm+pwC2i78csk+pHZuOfDAfknfnrcG
jr29XV+vEk4VBm0FleykFLRw8dzMRDoqFoml2wu9dx+dDD34ZEUCswzqKpcdzigK
MxQK9nV+izwVKNnhTsGpAgMBAAGjRTBDMBIGA1UdEwEB/wQIMAYBAf8CAQEwDgYD
VR0PAQH/BAQDAgEGMB0GA1UdDgQWBBQpSPYEtuTC4FSOh2o9gmYXwOprYjANBgkq
hkiG9w0BAQsFAAOCAQEApME/zgPGbkVazVN3nGHdhvVQQ9S0um3nFzeRBTpDnGlN
91hI+EdpfARHvZHRHelDiB+UkFoRfwpH+K37sb4R7vBqSO3qSAizzJjr000XkzaJ
Ibfw5GS76rhNCrPtUCzw1rxFMenEA2sMvh5b6TVR/ATEog0E/8ki8byTwmnai7Cd
I9ls5yMS0AOn3A3yTVaH1anRHTlvVpVjb/+Cu/yoHX/I1zU9lvoTE9xEz5Hy9Dfs
kIia7Gs7ssSazB5PA/hTVikbfyYsVx+LBbsH/dhqIFfPVa4VZH+DqLzR1k9yEyXa
tRo0RLq1ehrdNepmSbm3yyJVuD0DkWfA8EbViJ6Qxg==
-----END CERTIFICATE-----`;

let qzInitialized = false;

function initQZ() {
  if (qzInitialized) return;
  
  qz.security.setCertificatePromise((resolve: (cert: string) => void) => {
    resolve(QZ_CERTIFICATE);
  });

  qz.security.setSignatureAlgorithm("SHA512");
  qz.security.setSignaturePromise(() => {
    return (resolve: (value: string) => void) => {
      resolve("");
    };
  });
  
  qzInitialized = true;
}

export const isQZAvailable = (): boolean => {
  return typeof qz !== 'undefined';
};

export const isQZConnected = (): boolean => {
  try {
    return qz.websocket.isActive();
  } catch {
    return false;
  }
};

export const connectToQZ = async (): Promise<boolean> => {
  initQZ();
  
  if (qz.websocket.isActive()) {
    return true;
  }
  
  try {
    await qz.websocket.connect();
    console.log("Connected to QZ Tray!");
    return true;
  } catch (err) {
    console.error("QZ Tray connection failed:", err);
    return false;
  }
};

export const disconnectFromQZ = async (): Promise<void> => {
  if (qz.websocket.isActive()) {
    try {
      await qz.websocket.disconnect();
    } catch (err) {
      console.error("QZ Tray disconnect error:", err);
    }
  }
};

export const getPrinters = async (): Promise<string[]> => {
  const connected = await connectToQZ();
  if (!connected) {
    throw new Error("Could not connect to QZ Tray");
  }
  
  const printers = await qz.printers.find();
  return Array.isArray(printers) ? printers : [printers];
};

export const getDefaultPrinter = async (): Promise<string | null> => {
  try {
    const connected = await connectToQZ();
    if (!connected) return null;
    
    const defaultPrinter = await qz.printers.getDefault();
    return defaultPrinter || null;
  } catch {
    return null;
  }
};

export interface PrintOptions {
  copies?: number;
  scaleContent?: boolean;
  size?: { width: number; height: number; units: 'in' | 'mm' | 'cm' };
  orientation?: 'portrait' | 'landscape';
  margins?: { top: number; right: number; bottom: number; left: number };
}

export const printPDF = async (
  printerName: string, 
  pdfBase64: string,
  options: PrintOptions = {}
): Promise<void> => {
  const connected = await connectToQZ();
  if (!connected) {
    throw new Error("Could not connect to QZ Tray. Please ensure QZ Tray is running.");
  }

  const config = qz.configs.create(printerName, {
    scaleContent: options.scaleContent ?? true,
    copies: options.copies ?? 1,
    orientation: options.orientation,
    margins: options.margins,
    size: options.size
  });

  const data = [{
    type: 'pixel' as const,
    format: 'pdf' as const,
    flavor: 'base64' as const,
    data: pdfBase64
  }];

  try {
    await qz.print(config, data);
    console.log(`Successfully printed to ${printerName}`);
  } catch (err) {
    console.error("Printing failed:", err);
    throw err;
  }
};

export const printLabelPDF = async (
  printerName: string,
  pdfBase64: string,
  labelSize: '4x6' | '4x4' | 'A6' = '4x6'
): Promise<void> => {
  const sizeMap = {
    '4x6': { width: 4, height: 6, units: 'in' as const },
    '4x4': { width: 4, height: 4, units: 'in' as const },
    'A6': { width: 105, height: 148, units: 'mm' as const }
  };

  return printPDF(printerName, pdfBase64, {
    scaleContent: true,
    size: sizeMap[labelSize]
  });
};

export const printFromUrl = async (
  printerName: string,
  url: string,
  options: PrintOptions = {}
): Promise<void> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.statusText}`);
  }
  
  const blob = await response.blob();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64data = (reader.result as string).split(',')[1];
        await printPDF(printerName, base64data, options);
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read PDF"));
    reader.readAsDataURL(blob);
  });
};

export type PrinterContext = 
  | 'label_printer_name'
  | 'document_printer_name'
  | 'ppl_label_printer'
  | 'packing_list_printer'
  | 'invoice_printer'
  | 'pos_receipt_printer'
  | 'order_detail_label_printer'
  | 'pick_pack_label_printer';

export const getSavedPrinter = (context: PrinterContext): string | null => {
  return localStorage.getItem(context);
};

export const savePrinter = (printerName: string, context: PrinterContext): void => {
  localStorage.setItem(context, printerName);
};

export const getAllSavedPrinters = (): Record<PrinterContext, string | null> => {
  const contexts: PrinterContext[] = [
    'label_printer_name',
    'document_printer_name',
    'ppl_label_printer',
    'packing_list_printer',
    'invoice_printer',
    'pos_receipt_printer',
    'order_detail_label_printer',
    'pick_pack_label_printer'
  ];
  
  return contexts.reduce((acc, context) => {
    acc[context] = localStorage.getItem(context);
    return acc;
  }, {} as Record<PrinterContext, string | null>);
};

export const printRawZPL = async (
  printerName: string,
  zplCommand: string
): Promise<void> => {
  const connected = await connectToQZ();
  if (!connected) {
    throw new Error("Could not connect to QZ Tray. Please ensure QZ Tray is running.");
  }

  const config = qz.configs.create(printerName);
  const data = [{
    type: 'raw' as const,
    format: 'plain' as const,
    flavor: 'base64' as const,
    data: btoa(zplCommand)
  }];

  try {
    await qz.print(config, data);
    console.log(`Successfully sent ZPL to ${printerName}`);
  } catch (err) {
    console.error("ZPL printing failed:", err);
    throw err;
  }
};

const TEST_PDF_BASE64 = 'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgMjg4IDI4OF0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCAyODggMjg4XQovQ29udGVudHMgNCAwIFIKL1Jlc291cmNlcyA8PAovRm9udCA8PCAvRjEgNSAwIFIgPj4KPj4KPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCA4OAo+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjUwIDIwMCBUZAooVGVzdCBQcmludCBPSykgVGoKRVQKQlQKL0YxIDE0IFRmCjUwIDE1MCBUZAooUVogVHJheSBDb25uZWN0ZWQpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKNSAwIG9iago8PAovVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKPj4KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxNDcgMDAwMDAgbiAKMDAwMDAwMDI5OSAwMDAwMCBuIAowMDAwMDAwNDQwIDAwMDAwIG4gCnRyYWlsZXIKPDwKL1NpemUgNgovUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKNTIwCiUlRU9G';

export const testPrint = async (printerName: string): Promise<void> => {
  const connected = await connectToQZ();
  if (!connected) {
    throw new Error("Could not connect to QZ Tray. Please ensure QZ Tray is running.");
  }

  const config = qz.configs.create(printerName, {
    scaleContent: true
  });

  const data = [{
    type: 'pixel' as const,
    format: 'pdf' as const,
    flavor: 'base64' as const,
    data: TEST_PDF_BASE64
  }];

  try {
    await qz.print(config, data);
    console.log(`Successfully sent test print to ${printerName}`);
  } catch (err) {
    console.error("Test print failed:", err);
    throw err;
  }
};

export const testPrintZPL = async (printerName: string): Promise<void> => {
  return testPrint(printerName);
};

export const quickPrintLabel = async (pdfBase64: string, context: PrinterContext = 'label_printer_name'): Promise<boolean> => {
  const printerName = getSavedPrinter(context) || getSavedPrinter('label_printer_name');
  
  if (!printerName) {
    return false;
  }
  
  try {
    await printLabelPDF(printerName, pdfBase64);
    return true;
  } catch (err) {
    console.error("Quick print failed:", err);
    throw err;
  }
};

export const quickPrintDocument = async (pdfBase64: string, context: PrinterContext = 'document_printer_name'): Promise<boolean> => {
  const printerName = getSavedPrinter(context) || getSavedPrinter('document_printer_name');
  
  if (!printerName) {
    return false;
  }
  
  try {
    await printPDF(printerName, pdfBase64);
    return true;
  } catch (err) {
    console.error("Quick print failed:", err);
    throw err;
  }
};

export const quickPrintPPLLabel = async (pdfBase64: string): Promise<boolean> => {
  const printerName = getSavedPrinter('ppl_label_printer') || getSavedPrinter('label_printer_name');
  
  if (!printerName) {
    return false;
  }
  
  try {
    await printLabelPDF(printerName, pdfBase64, '4x6');
    return true;
  } catch (err) {
    console.error("PPL label print failed:", err);
    throw err;
  }
};
