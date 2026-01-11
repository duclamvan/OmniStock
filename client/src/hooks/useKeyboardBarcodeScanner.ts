import { useEffect, useCallback, useRef } from 'react';

interface KeyboardBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  minLength?: number;
  maxInputTime?: number;
  enabled?: boolean;
  excludeInputs?: boolean;
}

/**
 * Global keyboard barcode scanner hook that detects rapid keyboard input
 * from USB/Bluetooth barcode scanners (which emulate keyboard input)
 * 
 * How it works:
 * - Barcode scanners type characters very fast (typically 10+ chars in <100ms)
 * - They end with Enter key
 * - This hook detects this pattern and captures the barcode
 * 
 * This is different from useBarcodeScanner which uses camera-based scanning.
 * This hook works with physical USB/Bluetooth barcode scanners.
 * 
 * @param options Configuration options
 * @param options.onScan Callback when a barcode is detected
 * @param options.minLength Minimum barcode length (default: 4)
 * @param options.maxInputTime Max time between characters in ms (default: 50)
 * @param options.enabled Whether scanning is enabled (default: true)
 * @param options.excludeInputs Skip when focused on input/textarea (default: false)
 */
export function useKeyboardBarcodeScanner({
  onScan,
  minLength = 4,
  maxInputTime = 50,
  enabled = true,
  excludeInputs = false,
}: KeyboardBarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetBuffer = useCallback(() => {
    bufferRef.current = '';
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Skip if focused on input elements (optional)
    if (excludeInputs) {
      const target = event.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable) {
        return;
      }
    }

    const now = Date.now();
    const timeSinceLastKey = now - lastKeyTimeRef.current;

    // Safety check - buffer might be undefined during unmount
    const currentBuffer = bufferRef.current ?? '';

    // If too much time has passed, start fresh
    if (timeSinceLastKey > maxInputTime && currentBuffer.length > 0) {
      resetBuffer();
    }

    lastKeyTimeRef.current = now;

    // Handle Enter key - this signals end of barcode
    if (event.key === 'Enter') {
      const enterBuffer = bufferRef.current ?? '';
      if (enterBuffer.length >= minLength) {
        // We have a valid barcode!
        const barcode = enterBuffer.trim();
        resetBuffer();
        
        // Prevent default form submission if we captured a barcode
        event.preventDefault();
        event.stopPropagation();
        
        onScan(barcode);
      } else {
        resetBuffer();
      }
      return;
    }

    // Only capture printable characters
    if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      bufferRef.current += event.key;

      // Set a timeout to clear the buffer if no more input comes
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        // If buffer has content but no Enter was pressed, it might be manual typing
        // Clear it after a delay
        resetBuffer();
      }, 200);
    }
  }, [enabled, excludeInputs, maxInputTime, minLength, onScan, resetBuffer]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown, true);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      resetBuffer();
    };
  }, [enabled, handleKeyDown, resetBuffer]);

  return {
    reset: resetBuffer,
  };
}

/**
 * Helper to check if a string looks like a barcode
 * (numeric or alphanumeric, no special characters except dash/underscore)
 */
export function isValidBarcode(value: string): boolean {
  if (!value || value.length < 4) return false;
  // Allow alphanumeric, dash, underscore
  return /^[A-Za-z0-9\-_]+$/.test(value);
}
