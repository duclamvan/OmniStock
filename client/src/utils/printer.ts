import qz from 'qz-tray';
import * as KJUR from 'jsrsasign';

const QZ_CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIDyzCCArOgAwIBAgIUCmheVFSK+ht9p0O4UEgg5k5jOx0wDQYJKoZIhvcNAQEL
BQAwdTELMAkGA1UEBhMCQ1oxDzANBgNVBAgMBlByYWd1ZTEPMA0GA1UEBwwGUHJh
Z3VlMRQwEgYDVQQKDAtEYXZpZVN1cHBseTESMBAGA1UECwwJV2FyZWhvdXNlMRow
GAYDVQQDDBFkYXZpZXN1cHBseS5sb2NhbDAeFw0yNjAxMTExNjU2MzRaFw0zNjAx
MDkxNjU2MzRaMHUxCzAJBgNVBAYTAkNaMQ8wDQYDVQQIDAZQcmFndWUxDzANBgNV
BAcMBlByYWd1ZTEUMBIGA1UECgwLRGF2aWVTdXBwbHkxEjAQBgNVBAsMCVdhcmVo
b3VzZTEaMBgGA1UEAwwRZGF2aWVzdXBwbHkubG9jYWwwggEiMA0GCSqGSIb3DQEB
AQUAA4IBDwAwggEKAoIBAQCyjALvD1STguk1mYid6pJe45ZITfUEBV7aAvPGJf63
5mOZf+QBhL8+D8YUET9o35KdkYZ+ktnr51LnAOOVBjCNke3ee+qlB4ePV6gkIMWD
Eq71Bhmkce+GZYFJXh+3AjqXBDBX/8d0I9/SmLsSExjOGfXtO57OnCLNroAFESPZ
0sy9oSCdMCPGIG574iOjPPxmCvEPEO7VbYkOjJ16u7jnn7WsGuzh9uH8cfY0ibXD
GLhKbLoapfxQUDYLfLFgpnz2XF9vK/3gibiRGgWx4JNV5IDzUW2RUr0QgPI1hYqt
63Natt6BBZEvAusPoLzxKSUdl6zViOL7qLGeepveJpzTAgMBAAGjUzBRMB0GA1Ud
DgQWBBRbKKcGn/bko/s1E6pEt4gX7Shb/TAfBgNVHSMEGDAWgBRbKKcGn/bko/s1
E6pEt4gX7Shb/TAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQCd
+ATGnJh9S5qa4NZYf1tICDbjGhg1mpJ8Va1MDS6y9n7sc90L56prxizSyDN1paYF
YW8BpvT+vnfL6w54/qMQuxDEE7LNTZ04tkmK6vkQv65sK2oKoQhjkPfv1JqNT+Zs
aGCGDRdd6nn4lWI6BhEAMNV1U7sKt4DVZsRdXl9YuHO6P2wTbeUgHIcRoVVvTGGF
szRsg3UH0fEFaYtZvd8JbSi3a6P1JAfQhlZ7HXYLP4LA1QHh96sUtSE9uAJfCro7
Lqv8Y23z/sNScZPvDnBMUY8hGojntyAiNCe0LslBq1iHDwe7SK53NiMuAmMQcObo
4jV7BtBSITYWmuQulW44
-----END CERTIFICATE-----`;

const QZ_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCyjALvD1STguk1
mYid6pJe45ZITfUEBV7aAvPGJf635mOZf+QBhL8+D8YUET9o35KdkYZ+ktnr51Ln
AOOVBjCNke3ee+qlB4ePV6gkIMWDEq71Bhmkce+GZYFJXh+3AjqXBDBX/8d0I9/S
mLsSExjOGfXtO57OnCLNroAFESPZ0sy9oSCdMCPGIG574iOjPPxmCvEPEO7VbYkO
jJ16u7jnn7WsGuzh9uH8cfY0ibXDGLhKbLoapfxQUDYLfLFgpnz2XF9vK/3gibiR
GgWx4JNV5IDzUW2RUr0QgPI1hYqt63Natt6BBZEvAusPoLzxKSUdl6zViOL7qLGe
epveJpzTAgMBAAECggEAOMkN79FM4WN732e2yx69Mb+pXtKocABzQ9w3gtg3tG5q
U/oYXqFFH6xtn5lCtQySOVn80AnNlFkshTrDpvRigcwdPqrjnFwSMbU7zU2886yA
B37KrgHsn65t2ZM9e/uR/dC/vWUkntwABh88NAnt1DLug+Z34hdHfGoY3kOuxspb
37D7d9rU4kWWFemGpYb06Vcr27s0eJFLAV9tt0pmuPalYBeRm7gsJO/AAXW8D6BG
rKuE2Q1dCiz8couJ2zrOpL39cQ1ACivS8o3p7Gz7xTO+RH4l5yr7TAdcUVDetE+f
swUCFxoX1lL43FA4cokfgL4tY/2IsbHRKkd2pAmDVQKBgQDf1nYgS7RInCCAOCd2
KHz83Tnp77vfwGpAQIw6GUyvgkn/WGdNRLlGPi1vdjRrYmaBgKFCAfGQllfdWmkV
iOO+wYzWwOi9DbKYuiATsiQH/pRSsJpa73b4E4eKbEM7dIhsptPL7Xjx2DhYApvq
lwuzu7VmvQ3tPUAXl36YDEebZQKBgQDMM5gy16Lwz1De8uytTpBv1mN+lBDZKrfR
E+F8T3UkBMzDgKxDnMCHtCxU3RpP5OCJvdkh9K3WJkjopH//qVnkn7F1i3pLPV0k
6FazBND18lST+i9NeLJeBZgiQWyCnB+9NJTabxgURutNvwI4iQAuOEhSx+e2/5Oo
cGSnB3x/1wKBgHs6pm3BP895pKryP0ddovHTGT8hLF1SoSweXRTfOMinAfYBxV1U
qGtzb7Adc15rHePN3Plp+IORQW4riA7C/h7Wj6LrMTZjhB9w2Jf/SrbcAOxFLbVC
gEyy87vRPnJNBY5Lie6LHjqGvv408YGFBnw8qvGUw0YIonBahudOW13BAoGAeGkw
JULclS1ana0XfPZn21rLHpfG+5fh/oq/muLry0p9SAc3DUOAkEThI0Whv1zSPsbR
I+G5JB89PNnLlIFTPaohJZQSkA1mQF40yalcYrr7vqp3fDJg02pvFDwJ9VaErLg1
0jxSMZrEI/svHxFCJv8PPqkcbN92PYvQ/mE+u88CgYAIoOepomr4N84kfjTgqSja
ikArB/uyKnYeloYmpMXgUZLmNQgAUlYx/SwhHpaqqCvpN4gidAKpxWdyHn9nA7ky
wVfEIDUVqAhlk0vke+XSuH7WaDg3EyfHFeUSm/T2aJ6s70zIX6P+fhqmB7NgQEMi
ig1TuqH6F2tEsAPL3iEa2A==
-----END PRIVATE KEY-----`;

let qzInitialized = false;

function initQZ() {
  if (qzInitialized) return;
  
  qz.security.setCertificatePromise((resolve: (cert: string) => void) => {
    resolve(QZ_CERTIFICATE);
  });

  qz.security.setSignatureAlgorithm("SHA512");
  qz.security.setSignaturePromise((toSign: string) => {
    return (resolve: (sig: string) => void, reject?: (err: unknown) => void) => {
      try {
        const sig = new KJUR.KJUR.crypto.Signature({ alg: "SHA512withRSA" });
        sig.init(QZ_PRIVATE_KEY);
        sig.updateString(toSign);
        const hex = sig.sign();
        resolve(KJUR.hextob64(hex));
      } catch (err) {
        console.error("QZ Tray signing error:", err);
        if (reject) reject(err);
      }
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
  | 'warehouse_label_printer'
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
    'pick_pack_label_printer',
    'warehouse_label_printer'
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
