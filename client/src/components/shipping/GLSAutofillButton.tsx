import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Copy, BookmarkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface GLSAutofillButtonProps {
  recipientData: {
    name: string;
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
    name: string;
    company?: string;
    street: string;
    houseNumber?: string;
    postalCode: string;
    city: string;
    email?: string;
    phone?: string;
  };
  packageSize?: 'XS' | 'S' | 'M' | 'L' | 'XL';
  weight?: number;
}

export function GLSAutofillButton({ recipientData, senderData, packageSize = 'M', weight }: GLSAutofillButtonProps) {
  const [showBookmarkletDialog, setShowBookmarkletDialog] = useState(false);
  const [showDebugData, setShowDebugData] = useState(false);
  const bookmarkletRef = useRef<HTMLAnchorElement>(null);
  const { toast } = useToast();

  // Generate the bookmarklet code (both display and encoded versions)
  const generateBookmarklet = () => {
    const data = {
      recipient: recipientData,
      sender: senderData,
      packageSize,
      weight,
    };

    // Encoded data payload (safe from special characters)
    const encodedData = encodeURIComponent(JSON.stringify(data));

    // Core bookmarklet logic (using decoded data)
    const bookmarkletLogic = `
(function(){
  const data = JSON.parse(decodeURIComponent('${encodedData}'));
  console.log('🔵 GLS Autofill - Starting with data:', data);
  
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
              console.error('❌ Failed to set ' + label + ':', err);
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
  
  function selectDropdown(selectors, value, label) {
    if (!value) return false;
    
    const selectorList = Array.isArray(selectors) ? selectors : [selectors];
    
    for (const selector of selectorList) {
      const select = document.querySelector(selector);
      if (select && select.tagName === 'SELECT') {
        const options = Array.from(select.options);
        const option = options.find(opt => 
          opt.text.toLowerCase().includes(value.toLowerCase()) || 
          opt.value.toLowerCase().includes(value.toLowerCase()) ||
          opt.text.toLowerCase() === value.toLowerCase() ||
          opt.value.toLowerCase() === value.toLowerCase()
        );
        if (option) {
          select.value = option.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          select.dispatchEvent(new Event('input', { bubbles: true }));
          select.dispatchEvent(new Event('blur', { bubbles: true }));
          filledCount++;
          log.push('✅ ' + label + ': ' + value);
          console.log('✅ Selected ' + label + ' (' + selector + '): ' + value + ' -> ' + option.value);
          return true;
        }
      }
    }
    log.push('❌ ' + label + ' (dropdown not found or option not available)');
    console.warn('❌ Could not select ' + label + ' for value: ' + value);
    return false;
  }
  
  function selectPackageSize(size) {
    const targetSize = (size === 'XS') ? 'XS' : 'S';
    console.log('📦 Selecting package size:', targetSize);
    
    const sizeButton = document.querySelector('button[data-value="' + targetSize + '"][role="radio"]');
    if (sizeButton) {
      sizeButton.click();
      console.log('✅ Clicked package size button:', targetSize);
      filledCount++;
      log.push('✅ Package Size: ' + targetSize);
      return true;
    }
    
    console.warn('❌ Package size button not found for:', targetSize);
    return false;
  }
  
  function setCountry(countryValue) {
    if (!countryValue) return false;
    
    const countryMappings = {
      'germany': ['deutschland', 'de', 'ger', 'deu', 'germany'],
      'switzerland': ['schweiz', 'ch', 'sui', 'switzerland'],
      'austria': ['österreich', 'osterreich', 'at', 'aut', 'austria'],
      'belgium': ['belgien', 'be', 'bel', 'belgium'],
      'france': ['frankreich', 'fr', 'fra', 'france'],
      'netherlands': ['niederlande', 'nl', 'nld', 'netherlands'],
      'czech republic': ['tschechien', 'cz', 'cze', 'czech'],
      'poland': ['polen', 'pl', 'pol', 'poland'],
      'italy': ['italien', 'it', 'ita', 'italy'],
      'spain': ['spanien', 'es', 'esp', 'spain']
    };
    
    let targetCountryName = countryValue;
    const searchValue = countryValue.toLowerCase();
    
    for (const key in countryMappings) {
      if (countryMappings[key].some(variant => searchValue.includes(variant) || variant.includes(searchValue))) {
        targetCountryName = countryMappings[key][0];
        break;
      }
    }
    
    console.log('🌍 Setting country:', countryValue, '→', targetCountryName);
    
    const countryInput = document.querySelector('input[name="country-selector"]') || 
                        document.querySelector('input[role="combobox"]') ||
                        document.querySelector('input[aria-autocomplete="list"]');
    
    if (countryInput) {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(countryInput, targetCountryName);
      
      countryInput.dispatchEvent(new Event('input', { bubbles: true }));
      countryInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      setTimeout(() => {
        const dropdownOptions = document.querySelectorAll('[role="option"], li[data-value], .autocomplete-option, [class*="option"]');
        let optionClicked = false;
        
        dropdownOptions.forEach(option => {
          if (option.textContent && option.textContent.toLowerCase().includes(targetCountryName.toLowerCase())) {
            option.click();
            optionClicked = true;
            console.log('✅ Clicked dropdown option:', option.textContent);
          }
        });
        
        if (!optionClicked) {
          countryInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter', keyCode: 13 }));
          countryInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter', keyCode: 13 }));
          console.log('✅ Pressed Enter to confirm');
        }
        
        countryInput.dispatchEvent(new Event('blur', { bubbles: true }));
        
        setTimeout(() => {
          if (countryInput.value === targetCountryName || countryInput.value.toLowerCase().includes(targetCountryName.toLowerCase())) {
            console.log('✅ Country confirmed:', countryInput.value);
            filledCount++;
            log.push('✅ Country: ' + countryInput.value);
          } else {
            console.warn('❌ Country selection failed. Current value:', countryInput.value);
          }
        }, 150);
      }, 200);
      
      return true;
    }
    
    console.warn('❌ Country field not found');
    return false;
  }
  
  setTimeout(() => {
    console.log('🔍 Searching for form fields...');
    
    // List all inputs on the page for debugging
    const allInputs = document.querySelectorAll('input, textarea, select');
    console.log('📋 Found ' + allInputs.length + ' form fields:');
    allInputs.forEach((el, i) => {
      console.log(i + ': ', {
        tag: el.tagName,
        type: el.type,
        name: el.name,
        id: el.id,
        placeholder: el.placeholder,
        className: el.className
      });
    });
    
    // Try multiple selectors for each field
    const nameParts = data.recipient.name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    
    // Recipient fields - try multiple selectors
    trySetValue([
      'input[name="firstName"]',
      'input[name="firstname"]',
      'input[placeholder="Vorname"]',
      'input[name*="vorname" i]',
      'input[placeholder*="vorname" i]',
      'input[id*="vorname" i]',
      'input[name*="firstname" i]'
    ], firstName, 'First Name');
    
    trySetValue([
      'input[name="lastName"]',
      'input[name="lastname"]',
      'input[placeholder="Nachname"]',
      'input[name*="nachname" i]',
      'input[placeholder*="nachname" i]',
      'input[id*="nachname" i]',
      'input[name*="lastname" i]'
    ], lastName, 'Last Name');
    
    trySetValue([
      'input[name="company"]',
      'input[placeholder="Firma (optional)"]',
      'input[placeholder="Firma"]',
      'input[name*="firma" i]',
      'input[placeholder*="firma" i]',
      'input[id*="firma" i]',
      'input[name*="company" i]'
    ], data.recipient.company, 'Company');
    
    trySetValue([
      'input[name*="strasse" i]',
      'input[name*="straße" i]',
      'input[placeholder*="strasse" i]',
      'input[placeholder*="straße" i]',
      'input[id*="strasse" i]',
      'input[name*="street" i]',
      'input[name*="adresse" i]'
    ], data.recipient.street, 'Street');
    
    trySetValue([
      'input[name="houseNumber"]',
      'input[name="housenumber"]',
      'input[name*="hausnummer" i]',
      'input[placeholder*="hausnummer" i]',
      'input[id*="hausnummer" i]',
      'input[name*="number" i]'
    ], data.recipient.houseNumber, 'House Number');
    
    // Fill postal code - try exact match first
    let postalFilled = trySetValue([
      'input[name="postcode"]',
      'input[name="postleitzahl"]',
      'input[id="postcode"]',
      'input[id="postleitzahl"]'
    ], data.recipient.postalCode, 'Postal Code');
    
    if (!postalFilled) {
      postalFilled = setFieldByLabel('Postleitzahl', data.recipient.postalCode, 'Postal Code');
    }
    if (!postalFilled) {
      postalFilled = setFieldByLabel('PLZ', data.recipient.postalCode, 'Postal Code');
    }
    if (!postalFilled) {
      postalFilled = trySetValue([
        'input[placeholder="Postleitzahl"]',
        'input[name*="plz" i]',
        'input[placeholder*="plz" i]',
        'input[id*="plz" i]'
      ], data.recipient.postalCode, 'Postal Code');
    }
    
    // Fill city - try exact match first
    trySetValue([
      'input[name="city"]',
      'input[id="city"]',
      'input[name="stadt"]',
      'input[id="stadt"]',
      'input[placeholder="Stadt"]',
      'input[name*="ort" i]',
      'input[name*="stadt" i]',
      'input[placeholder*="ort" i]',
      'input[placeholder*="stadt" i]',
      'input[id*="ort" i]'
    ], data.recipient.city, 'City');
    
    trySetValue([
      'input[name="email"]',
      'input[type="email"]',
      'input[name*="email" i]',
      'input[name*="mail" i]',
      'input[placeholder*="email" i]',
      'input[id*="email" i]'
    ], data.recipient.email, 'Email');
    
    trySetValue([
      'input[name*="telefon" i]',
      'input[name*="phone" i]',
      'input[type="tel"]',
      'input[placeholder*="telefon" i]',
      'input[id*="telefon" i]'
    ], data.recipient.phone, 'Phone');
    
    // Fill country LAST (React-compatible combobox) and re-validate fields after
    if (data.recipient.country) {
      setTimeout(() => {
        setCountry(data.recipient.country);
        
        setTimeout(() => {
          console.log('🔄 Re-validating address fields after country selection...');
          
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          
          const nameParts = data.recipient.name.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ');
          
          const firstNameInput = document.querySelector('input[name="firstName"]') || document.querySelector('input[placeholder="Vorname"]');
          if (firstNameInput && !firstNameInput.value && firstName) {
            nativeSetter.call(firstNameInput, firstName);
            firstNameInput.dispatchEvent(new Event('input', { bubbles: true }));
            firstNameInput.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('✅ Re-filled first name');
          }
          
          const lastNameInput = document.querySelector('input[name="lastName"]') || document.querySelector('input[placeholder="Nachname"]');
          if (lastNameInput && !lastNameInput.value && lastName) {
            nativeSetter.call(lastNameInput, lastName);
            lastNameInput.dispatchEvent(new Event('input', { bubbles: true }));
            lastNameInput.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('✅ Re-filled last name');
          }
          
          const companyInput = document.querySelector('input[name="company"]') || document.querySelector('input[placeholder*="Firma"]');
          if (companyInput && !companyInput.value && data.recipient.company) {
            nativeSetter.call(companyInput, data.recipient.company);
            companyInput.dispatchEvent(new Event('input', { bubbles: true }));
            companyInput.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('✅ Re-filled company');
          }
          
          const streetInput = document.querySelector('input[name="street"]');
          if (streetInput && !streetInput.value && data.recipient.street) {
            nativeSetter.call(streetInput, data.recipient.street);
            streetInput.dispatchEvent(new Event('input', { bubbles: true }));
            streetInput.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('✅ Re-filled street');
          }
          
          const houseInput = document.querySelector('input[name="houseNumber"]') || document.querySelector('input[name="housenumber"]');
          if (houseInput && !houseInput.value && data.recipient.houseNumber) {
            nativeSetter.call(houseInput, data.recipient.houseNumber);
            houseInput.dispatchEvent(new Event('input', { bubbles: true }));
            houseInput.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('✅ Re-filled house number');
          }
          
          const postalInput = document.querySelector('input[name="postcode"]');
          if (postalInput && !postalInput.value && data.recipient.postalCode) {
            nativeSetter.call(postalInput, data.recipient.postalCode);
            postalInput.dispatchEvent(new Event('input', { bubbles: true }));
            postalInput.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('✅ Re-filled postal code');
          }
          
          const cityInput = document.querySelector('input[name="city"]');
          if (cityInput && !cityInput.value && data.recipient.city) {
            nativeSetter.call(cityInput, data.recipient.city);
            cityInput.dispatchEvent(new Event('input', { bubbles: true }));
            cityInput.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('✅ Re-filled city');
          }
          
          const emailInput = document.querySelector('input[name="email"]') || document.querySelector('input[type="email"]');
          if (emailInput && !emailInput.value && data.recipient.email) {
            nativeSetter.call(emailInput, data.recipient.email);
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            emailInput.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('✅ Re-filled email');
          }
          
          setTimeout(() => {
            if (data.packageSize) {
              selectPackageSize(data.packageSize);
            }
            
            console.log('\\n📊 Summary: Filled ' + filledCount + ' fields');
            alert('GLS Autofill Complete\\n\\n' + log.join('\\n') + '\\n\\nFilled ' + filledCount + ' fields. Check console for details (F12).');
          }, 200);
        }, 500);
      }, 100);
    } else {
      setTimeout(() => {
        if (data.packageSize) {
          selectPackageSize(data.packageSize);
        }
        
        console.log('\\n📊 Summary: Filled ' + filledCount + ' fields');
        alert('GLS Autofill Complete\\n\\n' + log.join('\\n') + '\\n\\nFilled ' + filledCount + ' fields. Check console for details (F12).');
      }, 200);
    }
  }, 1000);
})();
    `.trim();

    // Encoded href for actual bookmarklet
    const href = `javascript:${encodeURIComponent(bookmarkletLogic)}`;
    
    // Pretty display version
    const displayCode = `javascript:${bookmarkletLogic}`;

    return { href, displayCode };
  };

  // Set the bookmarklet href via ref to avoid React warning
  useEffect(() => {
    if (bookmarkletRef.current && showBookmarkletDialog) {
      const { href } = generateBookmarklet();
      bookmarkletRef.current.href = href;
    }
  }, [showBookmarkletDialog, recipientData, senderData, packageSize, weight]);

  // Copy formatted details to clipboard
  const copyToClipboard = () => {
    const details = `
=== EMPFÄNGER / RECIPIENT ===
Name: ${recipientData.name}
${recipientData.company ? `Firma: ${recipientData.company}` : ''}
Straße: ${recipientData.street} ${recipientData.houseNumber || ''}
PLZ: ${recipientData.postalCode}
Ort: ${recipientData.city}
${recipientData.country ? `Land: ${recipientData.country}` : ''}
${recipientData.email ? `E-Mail: ${recipientData.email}` : ''}
${recipientData.phone ? `Telefon: ${recipientData.phone}` : ''}

${senderData ? `=== ABSENDER / SENDER ===
Name: ${senderData.name}
${senderData.company ? `Firma: ${senderData.company}` : ''}
Straße: ${senderData.street} ${senderData.houseNumber || ''}
PLZ: ${senderData.postalCode}
Ort: ${senderData.city}
${senderData.email ? `E-Mail: ${senderData.email}` : ''}
${senderData.phone ? `Telefon: ${senderData.phone}` : ''}` : ''}

=== PAKET / PACKAGE ===
Größe: ${packageSize}
${weight ? `Gewicht: ${weight} kg` : ''}
    `.trim();

    navigator.clipboard.writeText(details);
    toast({
      title: "Details copied",
      description: "Shipping details copied to clipboard!",
    });
  };

  // Open GLS page
  const openGLSPage = () => {
    window.open('https://www.gls-pakete.de/privatkunden/paketversand/paketkonfiguration', '_blank');
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={() => {
          openGLSPage();
          setShowBookmarkletDialog(true);
        }}
        className="flex items-center gap-2"
        data-testid="button-ship-with-gls"
      >
        <ExternalLink className="h-4 w-4" />
        Ship with GLS
      </Button>

      <Button
        variant="outline"
        onClick={copyToClipboard}
        className="flex items-center gap-2"
        data-testid="button-copy-gls-details"
      >
        <Copy className="h-4 w-4" />
        Copy Details
      </Button>

      {/* Bookmarklet Setup Dialog */}
      <Dialog open={showBookmarkletDialog} onOpenChange={setShowBookmarkletDialog}>
        <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BookmarkIcon className="h-5 w-5" />
              GLS Autofill Setup
            </DialogTitle>
            <DialogDescription className="text-sm">
              Set up once, then use it anytime to auto-fill the GLS form
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border p-3 sm:p-4 bg-muted">
              <h3 className="font-semibold mb-2 text-sm sm:text-base">📋 How to use:</h3>
              <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm">
                <li>Save the bookmarklet below to your bookmarks bar</li>
                <li>Open the GLS page (should be open now)</li>
                <li>Click the saved bookmarklet to auto-fill</li>
                <li>Verify details and complete shipment</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm sm:text-base">1. Drag to bookmarks bar:</h3>
              <div className="flex justify-center p-3 sm:p-4 bg-blue-50 dark:bg-blue-950 rounded border-2 border-dashed border-blue-300">
                <a
                  ref={bookmarkletRef}
                  href="#"
                  className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-move text-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    toast({
                      title: "Drag to bookmarks bar",
                      description: "Drag this button to your bookmarks bar to save it!",
                    });
                  }}
                  data-testid="link-bookmarklet"
                >
                  <BookmarkIcon className="h-4 w-4" />
                  GLS Autofill
                </a>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Or right-click and "Add to Bookmarks"
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm sm:text-base">2. Or copy manually:</h3>
              <div className="relative">
                <pre className="p-2 sm:p-3 bg-muted rounded text-xs overflow-x-auto whitespace-pre-wrap break-all">
                  {generateBookmarklet().displayCode}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    const { displayCode } = generateBookmarklet();
                    navigator.clipboard.writeText(displayCode);
                    toast({
                      title: "Code copied",
                      description: "Bookmarklet code copied to clipboard!",
                    });
                  }}
                  data-testid="button-copy-bookmarklet"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Create a bookmark, paste as URL, click on GLS page
              </p>
            </div>

            <div className="rounded-lg border p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-950/20">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 text-sm sm:text-base">⚠️ Important:</h3>
              <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-yellow-700 dark:text-yellow-300">
                <li>Works directly on GLS website</li>
                <li>Save once, use for all future orders</li>
                <li>Always verify auto-filled details</li>
                <li>Update if form fields change</li>
              </ul>
            </div>

            {/* Debug Data Section */}
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
                  
                  <div className="bg-white dark:bg-slate-900 rounded p-2 border">
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">Package Info:</p>
                    <pre className="text-xs text-gray-700 dark:text-gray-300">
                      Size: {packageSize}
{weight ? `Weight: ${weight} kg` : 'Weight: Not specified'}
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
                  openGLSPage();
                  setShowBookmarkletDialog(false);
                }}
                className="flex-1"
                data-testid="button-open-gls-again"
              >
                Open GLS Page Again
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
