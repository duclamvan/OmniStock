import { useState, useRef } from 'react';
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
  const [autofillPrepared, setAutofillPrepared] = useState(false);
  const [bookmarkletCode, setBookmarkletCode] = useState<string | null>(null);
  const bookmarkletRef = useRef<HTMLAnchorElement>(null);
  const { toast } = useToast();
  const { t } = useTranslation('orders');
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const generateBookmarkletCode = () => {
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
      timestamp: Date.now(),
    };

    const encodedData = encodeURIComponent(JSON.stringify(autofillData));

    const bookmarkletLogic = `
(function(){
  const data = JSON.parse(decodeURIComponent('${encodedData}'));
  console.log('🟡 DHL Autofill - Starting with data:', data);
  
  let filledCount = 0;
  const log = [];
  
  function trySetValue(selectors, value, label) {
    if (!value) return false;
    
    const selectorList = Array.isArray(selectors) ? selectors : [selectors];
    
    for (const selector of selectorList) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        elements.forEach(el => {
          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            try {
              const nativeSetter = Object.getOwnPropertyDescriptor(
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
    const labels = Array.from(document.querySelectorAll('label, div, span'));
    for (const label of labels) {
      if (label.textContent && label.textContent.toLowerCase().includes(labelText.toLowerCase())) {
        let input = label.querySelector('input' + (inputType ? '[type="' + inputType + '"]' : ''));
        if (!input && label.htmlFor) {
          input = document.getElementById(label.htmlFor);
        }
        if (!input) {
          let parent = label.parentElement;
          if (parent) {
            input = parent.querySelector('input' + (inputType ? '[type="' + inputType + '"]' : ''));
          }
        }
        if (!input) {
          let next = label.nextElementSibling;
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
    const field = findFieldByLabel(labelText, inputType);
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
  
  // Detect which DHL page we're on
  const pageType = window.location.href.includes('ShipmentEditorProductSelection') ? 'product' :
                   window.location.href.includes('ShipmentEditorAddressInput') ? 'address' : 'unknown';
  
  console.log('📍 DHL Page Type:', pageType);
  
  if (pageType === 'address') {
    // Address input page - fill recipient details
    console.log('📝 Filling address form...');
    
    // Try common DHL field patterns
    setFieldByLabel('vorname', data.recipient.firstName, 'First Name', 'text');
    setFieldByLabel('nachname', data.recipient.lastName, 'Last Name', 'text');
    setFieldByLabel('firma', data.recipient.company, 'Company', 'text');
    setFieldByLabel('straße', data.recipient.street, 'Street', 'text');
    setFieldByLabel('hausnummer', data.recipient.houseNumber, 'House Number', 'text');
    setFieldByLabel('postleitzahl', data.recipient.postalCode, 'Postal Code', 'text');
    setFieldByLabel('ort', data.recipient.city, 'City', 'text');
    setFieldByLabel('e-mail', data.recipient.email, 'Email', 'email');
    setFieldByLabel('telefon', data.recipient.phone, 'Phone', 'tel');
    
    // Also try English labels
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
  } else if (pageType === 'product') {
    console.log('📦 Product selection page - click through to address form first');
  } else {
    console.log('⚠️ Unknown page type - trying generic fill...');
  }
  
  // Show summary
  const summary = '🟡 DHL Autofill Complete!\\n\\nFilled ' + filledCount + ' fields for Order: ' + data.orderId + '\\n\\n' + log.join('\\n');
  console.log(summary);
  alert(summary);
})();`;

    return `javascript:${encodeURIComponent(bookmarkletLogic.replace(/\s+/g, ' ').trim())}`;
  };

  const handleButtonClick = () => {
    const code = generateBookmarkletCode();
    setBookmarkletCode(code);
    setAutofillPrepared(true);
    setShowBookmarkletDialog(true);
    
    setTimeout(() => {
      window.open('https://www.dhl.de/de/privatkunden/pakete-versenden/online-frankieren.html', '_blank');
    }, 100);
    
    toast({
      title: t('dhlAutofillPrepared'),
      description: t('dhlAutofillOpenedDescription'),
      duration: 5000
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          onClick={handleButtonClick}
          disabled={disabled}
          className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
          data-testid="button-dhl-create-label"
        >
          {autofillPrepared ? (
            <>
              <ExternalLink className="h-4 w-4 mr-2" />
              {t('openDhlWebsite')}
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              {t('createLabelOnDHL')}
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            if (!bookmarkletCode) {
              const code = generateBookmarkletCode();
              setBookmarkletCode(code);
              setAutofillPrepared(true);
            }
            setShowBookmarkletDialog(true);
          }}
          title={t('viewSetupInstructions')}
          data-testid="button-dhl-info"
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>
      
      {!isMobile && (
        <button
          onClick={() => {
            if (!bookmarkletCode) {
              const code = generateBookmarkletCode();
              setBookmarkletCode(code);
              setAutofillPrepared(true);
            }
            setShowBookmarkletDialog(true);
          }}
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
              <Zap className="h-5 w-5 text-yellow-600" />
              {t('dhlBookmarkletTitle')}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {t('dhlBookmarkletDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border p-3 sm:p-4 bg-muted">
              <h3 className="font-semibold mb-2 text-sm sm:text-base flex items-center gap-2">
                <BookmarkIcon className="h-4 w-4" />
                {t('firstTimeSetup')}
              </h3>
              <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm">
                <li>{t('chromeStep1')}</li>
                <li>{t('chromeStep2')}</li>
                <li>{t('chromeStep3')}</li>
                <li>{t('chromeStep4')}</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm sm:text-base">{t('setupStepA')}</h3>
              <div className="flex justify-center p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-950 rounded border-2 border-dashed border-yellow-300">
                <a
                  ref={bookmarkletRef}
                  href={bookmarkletCode || '#'}
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
                {t('orRightClickAddBookmark')}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm sm:text-base">{t('setupStepB')}</h3>
              <div className="relative">
                <pre className="p-2 sm:p-3 bg-muted rounded text-xs overflow-x-auto whitespace-pre-wrap break-all max-h-24">
                  {bookmarkletCode || t('clickPrepareFirst')}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    if (bookmarkletCode) {
                      navigator.clipboard.writeText(bookmarkletCode);
                      toast({
                        title: t('copied'),
                        description: t('bookmarkletCodeCopied'),
                      });
                    }
                  }}
                  disabled={!bookmarkletCode}
                  data-testid="button-copy-bookmarklet"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('setupStepBDesc')}
              </p>
            </div>

            <Separator />

            <div className="rounded-lg border p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-950/20">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 text-sm sm:text-base flex items-center gap-2">
                <PlayCircle className="h-4 w-4" />
                {t('dailyUsage')}
              </h3>
              <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm text-yellow-700 dark:text-yellow-300">
                <li>{t('usageStep1Desc')}</li>
                <li>{t('usageStep2Desc')}</li>
                <li>{t('usageStep3Desc')}</li>
                <li>{t('usageStep4Desc')}</li>
              </ol>
            </div>

            <Alert className="bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-800 dark:text-amber-200">
                <strong>{t('importantNotes')}:</strong>
                <ul className="list-disc pl-4 mt-1 space-y-1 text-xs">
                  <li>{t('bookmarkletNote1')}</li>
                  <li>{t('bookmarkletNote2')}</li>
                  <li>{t('bookmarkletNote3')}</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="rounded-lg border p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/20">
              <button
                onClick={() => setShowDebugData(!showDebugData)}
                className="w-full flex items-center justify-between text-left"
              >
                <h3 className="font-semibold text-blue-800 dark:text-blue-200 text-sm sm:text-base">
                  Debug: View Data to be Sent
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
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">Order Info:</p>
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
                {t('close')}
              </Button>
              <Button
                onClick={() => {
                  window.open('https://www.dhl.de/de/privatkunden/pakete-versenden/online-frankieren.html', '_blank');
                  setShowBookmarkletDialog(false);
                }}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
                data-testid="button-open-dhl-again"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {t('openDhlWebsite')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
