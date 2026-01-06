import { useCallback } from 'react';
import { useLocation } from 'wouter';
import { useKeyboardBarcodeScanner, isValidBarcode } from '@/hooks/useKeyboardBarcodeScanner';
import { useToast } from '@/hooks/use-toast';

/**
 * Global barcode scanner component that listens for USB/Bluetooth barcode scanner input
 * anywhere in the app and routes to the appropriate action.
 * 
 * This component should be placed at the root level of the app (in App.tsx or Layout).
 * 
 * Detected barcodes are handled based on current context:
 * - On Pick & Pack page: Searches for the item in the current order
 * - On Inventory pages: Opens product details or triggers search
 * - Elsewhere: Performs a global product search
 */
export function GlobalBarcodeScanner() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const handleBarcodeScanned = useCallback((barcode: string) => {
    if (!isValidBarcode(barcode)) {
      return;
    }

    console.log('[GlobalBarcodeScanner] Detected barcode:', barcode);

    // Determine action based on current page
    const currentPath = location.toLowerCase();

    if (currentPath.includes('/pick-pack') || currentPath.includes('/pickpack')) {
      // On Pick & Pack page - dispatch custom event for the page to handle
      window.dispatchEvent(new CustomEvent('barcode-scanned', { 
        detail: { barcode, context: 'pick-pack' } 
      }));
      return;
    }

    if (currentPath.includes('/receiving') || currentPath.includes('/receive')) {
      // On Receiving page - dispatch custom event
      window.dispatchEvent(new CustomEvent('barcode-scanned', { 
        detail: { barcode, context: 'receiving' } 
      }));
      return;
    }

    if (currentPath.includes('/inventory') || currentPath.includes('/products')) {
      // On Inventory/Products page - dispatch custom event
      window.dispatchEvent(new CustomEvent('barcode-scanned', { 
        detail: { barcode, context: 'inventory' } 
      }));
      return;
    }

    if (currentPath.includes('/pos')) {
      // On POS page - dispatch custom event
      window.dispatchEvent(new CustomEvent('barcode-scanned', { 
        detail: { barcode, context: 'pos' } 
      }));
      return;
    }

    // Default: navigate to products page with search query
    toast({
      title: 'Barcode scanned',
      description: `Searching for: ${barcode}`,
    });
    setLocation(`/products?search=${encodeURIComponent(barcode)}`);
  }, [location, setLocation, toast]);

  // Initialize the keyboard barcode scanner
  useKeyboardBarcodeScanner({
    onScan: handleBarcodeScanned,
    minLength: 4,
    maxInputTime: 50,
    enabled: true,
    excludeInputs: false, // Capture even when in input fields - scanner is fast enough
  });

  // This component doesn't render anything visible
  return null;
}

/**
 * Hook to listen for barcode scan events within a specific component
 * Use this in pages that need to handle barcode scans differently
 */
export function useBarcodeScanEvent(
  callback: (barcode: string, context: string) => void,
  contextFilter?: string
) {
  const handleEvent = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<{ barcode: string; context: string }>;
    const { barcode, context } = customEvent.detail;
    
    if (!contextFilter || context === contextFilter) {
      callback(barcode, context);
    }
  }, [callback, contextFilter]);

  // Subscribe to barcode-scanned events
  if (typeof window !== 'undefined') {
    window.addEventListener('barcode-scanned', handleEvent);
    return () => window.removeEventListener('barcode-scanned', handleEvent);
  }
}
