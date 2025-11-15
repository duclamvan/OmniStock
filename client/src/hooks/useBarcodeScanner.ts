import { useState, useEffect, useRef, useCallback } from 'react';
import { useSettings } from '@/contexts/SettingsContext';

export interface UseBarcodeScanner {
  isActive: boolean;
  isSupported: boolean;
  hasPermission: boolean | null;
  error: string | null;
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  scanningEnabled: boolean;
}

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  scanInterval?: number;
}

declare global {
  interface Window {
    BarcodeDetector?: any;
  }
}

export function useBarcodeScanner({ onScan, scanInterval = 500 }: UseBarcodeScannerOptions): UseBarcodeScanner {
  const { inventorySettings } = useSettings();
  const scanningEnabled = inventorySettings.enableBarcodeScanning ?? true;

  const [isActive, setIsActive] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ALWAYS call hooks in same order - check scanningEnabled inside hook logic
  useEffect(() => {
    if (!scanningEnabled) {
      setIsSupported(false);
      setError('Barcode scanning is disabled in settings');
      return;
    }

    const supported = 'BarcodeDetector' in window;
    setIsSupported(supported);
    
    if (!supported) {
      setError('BarcodeDetector API not supported in this browser');
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [scanningEnabled]);

  const startScanning = useCallback(async () => {
    // No-op if scanning is disabled
    if (!scanningEnabled) {
      return;
    }

    try {
      setError(null);

      if (!isSupported) {
        throw new Error('BarcodeDetector API is not supported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      detectorRef.current = new window.BarcodeDetector({
        formats: [
          'ean_13',
          'ean_8',
          'code_128',
          'code_39',
          'code_93',
          'qr_code',
          'upc_a',
          'upc_e',
          'data_matrix',
          'pdf417'
        ]
      });

      setIsActive(true);

      scanIntervalRef.current = setInterval(async () => {
        if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          try {
            const barcodes = await detectorRef.current.detect(videoRef.current);
            
            if (barcodes.length > 0) {
              const barcode = barcodes[0];
              onScan(barcode.rawValue);
            }
          } catch (err) {
            console.error('Barcode detection error:', err);
          }
        }
      }, scanInterval);

    } catch (err: any) {
      console.error('Camera error:', err);
      
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access to scan barcodes.');
        setHasPermission(false);
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
        setHasPermission(false);
      } else if (err.name === 'NotReadableError') {
        setError('Camera is already in use by another application.');
        setHasPermission(false);
      } else {
        setError(err.message || 'Failed to start camera');
      }
      
      setIsActive(false);
    }
  }, [scanningEnabled, isSupported, onScan, scanInterval]);

  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsActive(false);
  }, []);

  return {
    isActive,
    isSupported,
    hasPermission,
    error,
    startScanning,
    stopScanning,
    videoRef,
    scanningEnabled
  };
}
