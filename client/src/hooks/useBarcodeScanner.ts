import { useState, useEffect, useCallback, useRef } from 'react';
import { soundEffects } from '@/utils/soundEffects';

interface BarcodeScanResult {
  barcode: string;
  timestamp: number;
}

interface UseBarcodeScanner {
  isScanning: boolean;
  lastScan: BarcodeScanResult | null;
  scanStatus: 'idle' | 'scanning' | 'success' | 'error';
  resetScan: () => void;
}

/**
 * Custom hook for real-time barcode scanning
 * Detects rapid keyboard input that resembles barcode scanner behavior
 */
export function useBarcodeScanner(
  onScan: (barcode: string) => Promise<boolean>,
  options = {
    minLength: 8,
    maxLength: 50,
    timeout: 100, // ms between keystrokes for barcode detection
    enableSound: true,
    enableVisualFeedback: true
  }
): UseBarcodeScanner {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<BarcodeScanResult | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  
  const bufferRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastKeystrokeRef = useRef<number>(0);

  const resetScan = useCallback(() => {
    bufferRef.current = '';
    setIsScanning(false);
    setScanStatus('idle');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const processScan = useCallback(async (barcode: string) => {
    setScanStatus('scanning');
    setLastScan({ barcode, timestamp: Date.now() });
    
    try {
      const success = await onScan(barcode);
      
      if (success) {
        setScanStatus('success');
        if (options.enableSound) {
          await soundEffects.playSuccessBeep();
        }
      } else {
        setScanStatus('error');
        if (options.enableSound) {
          await soundEffects.playErrorBeep();
        }
      }
    } catch (error) {
      setScanStatus('error');
      if (options.enableSound) {
        await soundEffects.playErrorBeep();
      }
    }
    
    // Reset status after feedback
    setTimeout(() => {
      setScanStatus('idle');
      setIsScanning(false);
    }, 1500);
  }, [onScan, options.enableSound]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const now = Date.now();
      const timeSinceLastKeystroke = now - lastKeystrokeRef.current;
      
      // Ignore if typing in input fields (except our search which we want to support)
      const target = event.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isSearchInput = target.getAttribute('data-testid') === 'input-search';
      
      if (isInputField && !isSearchInput) {
        resetScan();
        return;
      }
      
      // Reset buffer if too much time has passed between keystrokes
      if (timeSinceLastKeystroke > options.timeout) {
        bufferRef.current = '';
      }
      
      lastKeystrokeRef.current = now;
      
      // Handle Enter key (typically sent by barcode scanners)
      if (event.key === 'Enter') {
        event.preventDefault();
        const barcode = bufferRef.current.trim();
        
        if (barcode.length >= options.minLength && barcode.length <= options.maxLength) {
          processScan(barcode);
        }
        
        bufferRef.current = '';
        return;
      }
      
      // Handle regular characters
      if (event.key.length === 1 && /[a-zA-Z0-9]/.test(event.key)) {
        bufferRef.current += event.key;
        
        // Set scanning state for visual feedback
        if (bufferRef.current.length >= 3) {
          setIsScanning(true);
        }
        
        // Clear timeout and set new one
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          bufferRef.current = '';
          setIsScanning(false);
        }, options.timeout);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [processScan, resetScan, options]);

  return {
    isScanning,
    lastScan,
    scanStatus,
    resetScan
  };
}