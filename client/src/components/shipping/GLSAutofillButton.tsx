import { useState } from 'react';
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
  const { toast } = useToast();

  // Generate the bookmarklet code
  const generateBookmarklet = () => {
    const data = {
      recipient: recipientData,
      sender: senderData,
      packageSize,
      weight,
    };

    // This JavaScript will run on the GLS page to fill the form
    const bookmarkletCode = `
javascript:(function(){
  const data = ${JSON.stringify(data)};
  
  // Helper function to set input value and trigger events
  function setInputValue(selector, value) {
    const input = document.querySelector(selector);
    if (input) {
      input.value = value || '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true }));
    }
  }
  
  // Helper function to select option by text or value
  function selectOption(selector, value) {
    const select = document.querySelector(selector);
    if (select && value) {
      const options = Array.from(select.options);
      const option = options.find(opt => 
        opt.text.toLowerCase().includes(value.toLowerCase()) || 
        opt.value.toLowerCase().includes(value.toLowerCase())
      );
      if (option) {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }
  
  // Wait a bit for the page to fully load
  setTimeout(() => {
    // Fill recipient data
    setInputValue('input[name="recipientFirstName"], input[placeholder*="Vorname"]', data.recipient.name.split(' ')[0]);
    setInputValue('input[name="recipientLastName"], input[placeholder*="Nachname"]', data.recipient.name.split(' ').slice(1).join(' '));
    setInputValue('input[name="recipientCompany"], input[placeholder*="Firma"]', data.recipient.company);
    setInputValue('input[name="recipientStreet"], input[placeholder*="Straße"]', data.recipient.street);
    setInputValue('input[name="recipientHouseNumber"], input[placeholder*="Hausnummer"]', data.recipient.houseNumber);
    setInputValue('input[name="recipientPostalCode"], input[placeholder*="PLZ"]', data.recipient.postalCode);
    setInputValue('input[name="recipientCity"], input[placeholder*="Ort"]', data.recipient.city);
    setInputValue('input[name="recipientEmail"], input[placeholder*="E-Mail"]', data.recipient.email);
    setInputValue('input[name="recipientPhone"], input[placeholder*="Telefon"]', data.recipient.phone);
    
    // Fill sender data if provided
    if (data.sender) {
      setInputValue('input[name="senderFirstName"]', data.sender.name.split(' ')[0]);
      setInputValue('input[name="senderLastName"]', data.sender.name.split(' ').slice(1).join(' '));
      setInputValue('input[name="senderCompany"]', data.sender.company);
      setInputValue('input[name="senderStreet"]', data.sender.street);
      setInputValue('input[name="senderHouseNumber"]', data.sender.houseNumber);
      setInputValue('input[name="senderPostalCode"]', data.sender.postalCode);
      setInputValue('input[name="senderCity"]', data.sender.city);
      setInputValue('input[name="senderEmail"]', data.sender.email);
      setInputValue('input[name="senderPhone"]', data.sender.phone);
    }
    
    // Select package size if possible
    if (data.packageSize) {
      selectOption('select[name="packageSize"]', data.packageSize);
    }
    
    // Set weight if available
    if (data.weight) {
      setInputValue('input[name="weight"]', data.weight.toString());
    }
    
    alert('✅ GLS form autofilled! Please verify all details before submitting.');
  }, 500);
})();
    `.trim();

    return bookmarkletCode;
  };

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
                  href={generateBookmarklet()}
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
                  {generateBookmarklet()}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    navigator.clipboard.writeText(generateBookmarklet());
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
