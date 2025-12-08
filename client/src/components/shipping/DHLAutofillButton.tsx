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
      cartonCount: cartonCount || 1,
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
    const bookmarkletLogic = `
(function(){
  console.log('🟡 DHL Autofill - Starting...');
  
  var dataStr = localStorage.getItem('${DHL_STORAGE_KEY}');
  if (!dataStr) {
    alert('No DHL autofill data found!\\n\\nPlease click "Prepare Order Data" in your warehouse app first.');
    return;
  }
  
  var data;
  try {
    data = JSON.parse(dataStr);
  } catch (e) {
    alert('Failed to parse DHL autofill data. Please prepare order data again.');
    return;
  }
  
  console.log('🟡 DHL Autofill - Loaded data:', data);
  
  var filledCount = 0;
  var log = [];
  
  function trySetValue(selectors, value, label) {
    if (!value) return false;
    
    var selectorList = Array.isArray(selectors) ? selectors : [selectors];
    
    for (var i = 0; i < selectorList.length; i++) {
      var selector = selectorList[i];
      var elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        elements.forEach(function(el) {
          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            try {
              var nativeSetter = Object.getOwnPropertyDescriptor(
                el.tagName === 'INPUT' ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype,
                'value'
              ).set;
              nativeSetter.call(el, value);
              
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              el.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
              el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
            } catch (err) {
              console.error('Failed to set ' + label + ':', err);
            }
          }
        });
        filledCount++;
        log.push('✅ ' + label + ': ' + value);
        console.log('✅ Filled ' + label + ' (' + selector + '): ' + value);
        return true;
      }
    }
    log.push('❌ ' + label + ' (not found)');
    console.warn('❌ Could not find field for ' + label);
    return false;
  }
  
  function findFieldByLabel(labelText, inputType) {
    var labels = Array.from(document.querySelectorAll('label, div, span'));
    for (var i = 0; i < labels.length; i++) {
      var label = labels[i];
      if (label.textContent && label.textContent.toLowerCase().includes(labelText.toLowerCase())) {
        var input = label.querySelector('input' + (inputType ? '[type="' + inputType + '"]' : ''));
        if (!input && label.htmlFor) {
          input = document.getElementById(label.htmlFor);
        }
        if (!input) {
          var parent = label.parentElement;
          if (parent) {
            input = parent.querySelector('input' + (inputType ? '[type="' + inputType + '"]' : ''));
          }
        }
        if (!input) {
          var next = label.nextElementSibling;
          while (next && !input) {
            if (next.tagName === 'INPUT') {
              input = next;
            } else {
              input = next.querySelector('input' + (inputType ? '[type="' + inputType + '"]' : ''));
            }
            next = next.nextElementSibling;
          }
        }
        if (input) return input;
      }
    }
    return null;
  }
  
  function setFieldByLabel(labelText, value, fieldLabel, inputType) {
    var field = findFieldByLabel(labelText, inputType);
    if (field && value) {
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      field.dispatchEvent(new Event('blur', { bubbles: true }));
      filledCount++;
      log.push('✅ ' + fieldLabel + ': ' + value);
      console.log('✅ Filled ' + fieldLabel + ' by label "' + labelText + '": ' + value);
      return true;
    }
    return false;
  }
  
  // Fill recipient details
  console.log('📝 Filling address form...');
  
  // Try German labels first
  setFieldByLabel('vorname', data.recipient.firstName, 'First Name', 'text');
  setFieldByLabel('nachname', data.recipient.lastName, 'Last Name', 'text');
  setFieldByLabel('firma', data.recipient.company, 'Company', 'text');
  setFieldByLabel('straße', data.recipient.street, 'Street', 'text');
  setFieldByLabel('hausnummer', data.recipient.houseNumber, 'House Number', 'text');
  setFieldByLabel('postleitzahl', data.recipient.postalCode, 'Postal Code', 'text');
  setFieldByLabel('ort', data.recipient.city, 'City', 'text');
  setFieldByLabel('e-mail', data.recipient.email, 'Email', 'email');
  setFieldByLabel('telefon', data.recipient.phone, 'Phone', 'tel');
  
  // Try English labels
  setFieldByLabel('first name', data.recipient.firstName, 'First Name EN', 'text');
  setFieldByLabel('last name', data.recipient.lastName, 'Last Name EN', 'text');
  setFieldByLabel('street', data.recipient.street, 'Street EN', 'text');
  setFieldByLabel('house', data.recipient.houseNumber, 'House EN', 'text');
  setFieldByLabel('postal', data.recipient.postalCode, 'Postal EN', 'text');
  setFieldByLabel('city', data.recipient.city, 'City EN', 'text');
  
  // Try by input name/id patterns
  trySetValue(['input[name*="firstName"]', 'input[id*="firstName"]', 'input[name*="vorname"]', 'input[id*="vorname"]'], data.recipient.firstName, 'First Name (selector)');
  trySetValue(['input[name*="lastName"]', 'input[id*="lastName"]', 'input[name*="nachname"]', 'input[id*="nachname"]'], data.recipient.lastName, 'Last Name (selector)');
  trySetValue(['input[name*="street"]', 'input[id*="street"]', 'input[name*="strasse"]', 'input[id*="strasse"]'], data.recipient.street, 'Street (selector)');
  trySetValue(['input[name*="houseNumber"]', 'input[id*="houseNumber"]', 'input[name*="hausnummer"]', 'input[id*="hausnummer"]'], data.recipient.houseNumber, 'House Number (selector)');
  trySetValue(['input[name*="postalCode"]', 'input[id*="postalCode"]', 'input[name*="plz"]', 'input[id*="plz"]'], data.recipient.postalCode, 'Postal Code (selector)');
  trySetValue(['input[name*="city"]', 'input[id*="city"]', 'input[name*="ort"]', 'input[id*="ort"]'], data.recipient.city, 'City (selector)');
  
  // Fill COD/Nachnahme if available
  if (data.codAmount && data.codAmount > 0) {
    trySetValue(['input[name*="nachnahme"]', 'input[id*="nachnahme"]', 'input[name*="cod"]', 'input[id*="cod"]'], data.codAmount.toFixed(2), 'COD Amount');
    
    // Fill bank details for COD
    if (data.bank) {
      trySetValue(['input[name*="iban"]', 'input[id*="iban"]'], data.bank.iban, 'IBAN');
      trySetValue(['input[name*="bic"]', 'input[id*="bic"]'], data.bank.bic, 'BIC');
      trySetValue(['input[name*="kontoinhaber"]', 'input[id*="kontoinhaber"]', 'input[name*="accountHolder"]'], data.bank.accountHolder, 'Account Holder');
    }
  }
  
  // Show summary
  var summary = '🟡 DHL Autofill Complete!\\n\\nOrder: ' + data.orderId + '\\nFilled ' + filledCount + ' fields\\n\\n' + log.slice(0, 10).join('\\n') + (log.length > 10 ? '\\n... and ' + (log.length - 10) + ' more' : '');
  console.log(summary);
  alert(summary);
})();`;

    return `javascript:${encodeURIComponent(bookmarkletLogic.replace(/\s+/g, ' ').trim())}`;
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
          Ship DHL DE{cartonCount && cartonCount > 0 ? ` (${cartonCount} ${cartonCount === 1 ? 'carton' : 'cartons'})` : ''}
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
              DHL Autofill Setup
            </DialogTitle>
            <DialogDescription className="text-sm">
              Set up once, then use it anytime to auto-fill the DHL form
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border p-3 sm:p-4 bg-muted">
              <h3 className="font-semibold mb-2 text-sm sm:text-base">📋 How to use:</h3>
              <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm">
                <li>Save the bookmarklet below to your bookmarks bar (one-time)</li>
                <li>Open the DHL page (should be open now)</li>
                <li>Click the saved bookmarklet to auto-fill</li>
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
                <li><strong>Save once, use for all future orders</strong></li>
                <li>Always verify auto-filled details</li>
                <li>Update bookmark only if form fields change</li>
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
Cartons: {cartonCount || 1}
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
