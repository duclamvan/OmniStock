import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Copy, BookmarkIcon, Info, Zap, PlayCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next';

interface DHLAutofillButtonProps {
  recipientData: {
    firstName: string;
    lastName: string;
    company?: string;
    street: string;
    houseNumber?: string;
    postalCode: string;
    city: string;
    country?: string;
    email?: string;
    phone?: string;
  };
  senderData?: {
    firstName: string;
    lastName: string;
    company?: string;
    street: string;
    houseNumber?: string;
    postalCode: string;
    city: string;
    email?: string;
    phone?: string;
  };
  bankData?: {
    iban?: string;
    bic?: string;
    accountHolder?: string;
  };
  orderId?: string;
  codAmount?: number;
  weight?: number;
  cartonCount?: number;
  disabled?: boolean;
}

const BOOKMARKLET_VERSION = "1.0.0";
const DHL_STORAGE_KEY = 'dhl_autofill_data';

export function DHLAutofillButton({ 
  recipientData, 
  senderData, 
  bankData,
  orderId,
  codAmount,
  weight,
  cartonCount,
  disabled = false
}: DHLAutofillButtonProps) {
  const [showBookmarkletDialog, setShowBookmarkletDialog] = useState(false);
  const [showDebugData, setShowDebugData] = useState(false);
  const [dataPrepared, setDataPrepared] = useState(false);
  const bookmarkletRef = useRef<HTMLAnchorElement>(null);
  const { toast } = useToast();
  const { t } = useTranslation('orders');
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const shouldShowBookmarkletDialog = (): boolean => {
    try {
      const storedVersion = localStorage.getItem('dhl_bookmarklet_version');
      if (!storedVersion || storedVersion !== BOOKMARKLET_VERSION) {
        localStorage.setItem('dhl_bookmarklet_version', BOOKMARKLET_VERSION);
        return true;
      }
      return false;
    } catch (error) {
      console.warn('localStorage not available:', error);
      return true;
    }
  };

  const saveDataToLocalStorage = () => {
    const autofillData = {
      orderId: orderId || '',
      recipient: {
        firstName: recipientData.firstName || '',
        lastName: recipientData.lastName || '',
        company: recipientData.company || '',
        street: recipientData.street || '',
        houseNumber: recipientData.houseNumber || '',
        postalCode: recipientData.postalCode || '',
        city: recipientData.city || '',
        country: recipientData.country || 'DE',
        email: recipientData.email || '',
        phone: recipientData.phone || '',
      },
      sender: senderData ? {
        firstName: senderData.firstName || '',
        lastName: senderData.lastName || '',
        company: senderData.company || '',
        street: senderData.street || '',
        houseNumber: senderData.houseNumber || '',
        postalCode: senderData.postalCode || '',
        city: senderData.city || '',
        email: senderData.email || '',
        phone: senderData.phone || '',
      } : undefined,
      codAmount: codAmount || 0,
      bank: bankData ? {
        iban: bankData.iban || '',
        bic: bankData.bic || '',
        accountHolder: bankData.accountHolder || '',
      } : undefined,
      weight: weight || 0,
      cartonCount: 1, // DHL DE always handles 1 carton (COD), rest goes via GLS
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(DHL_STORAGE_KEY, JSON.stringify(autofillData));
      console.log('🟡 DHL Autofill - Data saved to localStorage:', autofillData);
      return true;
    } catch (error) {
      console.error('Failed to save DHL autofill data:', error);
      return false;
    }
  };

  const generateBookmarkletCode = () => {
    const data = {
      orderId: orderId || '',
      recipient: {
        firstName: recipientData.firstName || '',
        lastName: recipientData.lastName || '',
        company: recipientData.company || '',
        street: recipientData.street || '',
        houseNumber: recipientData.houseNumber || '',
        postalCode: recipientData.postalCode || '',
        city: recipientData.city || '',
        country: recipientData.country || 'Deutschland',
        email: recipientData.email || '',
        phone: recipientData.phone || '',
      },
      sender: senderData ? {
        firstName: senderData.firstName || '',
        lastName: senderData.lastName || '',
        company: senderData.company || '',
        street: senderData.street || '',
        houseNumber: senderData.houseNumber || '',
        postalCode: senderData.postalCode || '',
        city: senderData.city || '',
        email: senderData.email || '',
        phone: senderData.phone || '',
      } : null,
      codAmount: codAmount || 0,
      bank: bankData ? {
        iban: bankData.iban || '',
        bic: bankData.bic || '',
        accountHolder: bankData.accountHolder || '',
      } : null,
      weight: weight || 0,
    };

    const jsonStr = JSON.stringify(data);
    const base64Data = btoa(unescape(encodeURIComponent(jsonStr)));

    const bookmarkletLogic = `(function(){
var data=JSON.parse(decodeURIComponent(escape(atob('${base64Data}'))));
var fc=0;
function fill(sel,val,lbl){
if(!val)return;
var el=document.querySelector(sel);
if(el){
el.value=val;
el.dispatchEvent(new Event('input',{bubbles:true}));
el.dispatchEvent(new Event('change',{bubbles:true}));
fc++;
console.log('Filled '+lbl+': '+val);
}
}
function fillByLabel(txt,val,lbl){
if(!val)return;
var labels=document.querySelectorAll('label');
for(var i=0;i<labels.length;i++){
var lb=labels[i];
if(lb.textContent&&lb.textContent.toLowerCase().includes(txt.toLowerCase())){
var inp=lb.querySelector('input')||document.getElementById(lb.htmlFor);
if(!inp&&lb.parentElement)inp=lb.parentElement.querySelector('input');
if(inp){
inp.value=val;
inp.dispatchEvent(new Event('input',{bubbles:true}));
inp.dispatchEvent(new Event('change',{bubbles:true}));
fc++;
console.log('Filled '+lbl+': '+val);
return;
}
}
}
}
fillByLabel('vorname',data.recipient.firstName,'Vorname');
fillByLabel('nachname',data.recipient.lastName,'Nachname');
fillByLabel('firma',data.recipient.company,'Firma');
fillByLabel('stra',data.recipient.street,'Strasse');
fillByLabel('hausnummer',data.recipient.houseNumber,'Hausnummer');
fillByLabel('postleitzahl',data.recipient.postalCode,'PLZ');
fillByLabel('ort',data.recipient.city,'Ort');
fillByLabel('e-mail',data.recipient.email,'Email');
fillByLabel('telefon',data.recipient.phone,'Telefon');
fill('input[name*="firstName"],input[id*="firstName"]',data.recipient.firstName,'FirstName');
fill('input[name*="lastName"],input[id*="lastName"]',data.recipient.lastName,'LastName');
fill('input[name*="street"],input[id*="street"]',data.recipient.street,'Street');
fill('input[name*="postalCode"],input[id*="postalCode"],input[name*="plz"]',data.recipient.postalCode,'PostalCode');
fill('input[name*="city"],input[id*="city"]',data.recipient.city,'City');
if(data.codAmount&&data.codAmount>0&&data.bank){
fill('input[name*="iban"],input[id*="iban"]',data.bank.iban,'IBAN');
fill('input[name*="bic"],input[id*="bic"]',data.bank.bic,'BIC');
fill('input[name*="betrag"],input[id*="betrag"]',data.codAmount.toFixed(2),'Betrag');
}
alert('DHL Autofill Complete!\\n\\nOrder: '+data.orderId+'\\nFilled '+fc+' fields');
})();`;

    return `javascript:${encodeURIComponent(bookmarkletLogic.replace(/[\r\n]+/g, ''))}`;
  };

  const bookmarkletCode = generateBookmarkletCode();

  useEffect(() => {
    if (bookmarkletRef.current) {
      bookmarkletRef.current.href = bookmarkletCode;
    }
  }, [bookmarkletCode]);

  const openDHLPage = () => {
    window.open('https://www.dhl.de/de/privatkunden/pakete-versenden/online-frankieren.html', '_blank');
  };

  const handleButtonClick = () => {
    saveDataToLocalStorage();
    setDataPrepared(true);
    openDHLPage();
    
    if (!isMobile && shouldShowBookmarkletDialog()) {
      setShowBookmarkletDialog(true);
    }
    
    toast({
      title: t('dhlAutofillPrepared'),
      description: t('dhlAutofillOpenedDescription'),
      duration: 5000
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={handleButtonClick}
          disabled={disabled}
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold w-full sm:flex-1"
          data-testid="button-dhl-create-label"
        >
          <ExternalLink className="h-4 w-4" />
          Ship DHL DE (1 carton + COD)
        </Button>

        <Button
          variant="outline"
          onClick={() => {
            saveDataToLocalStorage();
            setDataPrepared(true);
            toast({
              title: "Details copied",
              description: "Shipping details saved for autofill!",
            });
          }}
          className="flex items-center gap-2 hidden sm:flex"
          data-testid="button-copy-dhl-details"
        >
          <Copy className="h-4 w-4" />
          Copy Details
        </Button>
      </div>
      
      {!isMobile && (
        <button
          onClick={() => setShowBookmarkletDialog(true)}
          className="text-xs text-yellow-600 hover:text-yellow-800 hover:underline transition-colors"
          data-testid="link-view-setup"
        >
          {t('viewSetupInstructions')}
        </button>
      )}

      <Dialog open={showBookmarkletDialog} onOpenChange={setShowBookmarkletDialog}>
        <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BookmarkIcon className="h-5 w-5 text-yellow-600" />
              DHL Autofill - Order {orderId}
            </DialogTitle>
            <DialogDescription className="text-sm">
              This bookmarklet contains data for current order. Use it on DHL page.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border p-3 sm:p-4 bg-muted">
              <h3 className="font-semibold mb-2 text-sm sm:text-base">📋 How to use:</h3>
              <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm">
                <li>DHL page should be open now</li>
                <li>Drag the button below to your bookmarks bar OR copy the code</li>
                <li>Click the bookmarklet on the DHL page to auto-fill</li>
                <li>Verify details and complete shipment</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm sm:text-base">1. Drag to bookmarks bar:</h3>
              <div className="flex justify-center p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-950 rounded border-2 border-dashed border-yellow-300">
                <a
                  ref={bookmarkletRef}
                  href={bookmarkletCode}
                  className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 cursor-move text-sm font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    toast({
                      title: t('dragToBookmarksBar'),
                      description: t('dragToBookmarksBarDesc'),
                    });
                  }}
                  data-testid="link-bookmarklet"
                >
                  <BookmarkIcon className="h-4 w-4" />
                  DHL Autofill
                </a>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Or right-click and "Add to Bookmarks"
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm sm:text-base">2. Or copy manually:</h3>
              <div className="relative">
                <pre className="p-2 sm:p-3 bg-muted rounded text-xs overflow-x-auto overflow-y-auto whitespace-pre-wrap break-all max-h-24">
                  {bookmarkletCode}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    navigator.clipboard.writeText(bookmarkletCode);
                    toast({
                      title: t('copied'),
                      description: t('bookmarkletCodeCopied'),
                    });
                  }}
                  data-testid="button-copy-bookmarklet"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Create a bookmark, paste as URL, click on DHL page
              </p>
            </div>

            <div className="rounded-lg border p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-950/20">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 text-sm sm:text-base">⚠️ Important:</h3>
              <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-yellow-700 dark:text-yellow-300">
                <li>Works directly on DHL website</li>
                <li><strong>Each order has unique bookmarklet with embedded data</strong></li>
                <li>Always verify auto-filled details</li>
                <li>Copy or drag the bookmarklet code to use</li>
              </ul>
            </div>

            <div className="rounded-lg border p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/20">
              <button
                onClick={() => setShowDebugData(!showDebugData)}
                className="w-full flex items-center justify-between text-left"
              >
                <h3 className="font-semibold text-blue-800 dark:text-blue-200 text-sm sm:text-base">
                  🔍 Debug: View Data to be Sent
                </h3>
                <span className="text-blue-600 dark:text-blue-400 text-sm">
                  {showDebugData ? '▼' : '▶'}
                </span>
              </button>
              
              {showDebugData && (
                <div className="mt-3 space-y-2">
                  <div className="bg-white dark:bg-slate-900 rounded p-2 border">
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">Recipient:</p>
                    <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {JSON.stringify(recipientData, null, 2)}
                    </pre>
                  </div>
                  
                  {senderData && (
                    <div className="bg-white dark:bg-slate-900 rounded p-2 border">
                      <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">Sender:</p>
                      <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {JSON.stringify(senderData, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {bankData && (
                    <div className="bg-white dark:bg-slate-900 rounded p-2 border">
                      <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">Bank Details:</p>
                      <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {JSON.stringify(bankData, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  <div className="bg-white dark:bg-slate-900 rounded p-2 border">
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">Package Info:</p>
                    <pre className="text-xs text-gray-700 dark:text-gray-300">
Order ID: {orderId}
COD Amount: {codAmount ? `€${codAmount.toFixed(2)}` : 'None'}
Weight: {weight ? `${weight} kg` : 'Not specified'}
Cartons: 1 (DHL COD only, rest via GLS)
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setShowBookmarkletDialog(false)}
                className="flex-1"
                data-testid="button-close-dialog"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  openDHLPage();
                  setShowBookmarkletDialog(false);
                }}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
                data-testid="button-open-dhl-again"
              >
                Open DHL Page Again
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
