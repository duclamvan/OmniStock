import { useCallback, useEffect } from "react";

interface PPLPickupPoint {
  code: string;
  name: string;
  street?: string;
  city?: string;
  zipCode?: string;
  address?: string;
  type?: string;
  lat?: number;
  lng?: number;
  openingHours?: Record<string, string>;
  services?: string[];
  accessPointType?: string;
}

interface PPLSmartPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPickupPoint: (pickupPoint: PPLPickupPoint) => void;
  customerAddress?: string;
  customerCity?: string;
  customerZipCode?: string;
  language?: "cs" | "en";
}

const PPL_MAP_BASE_URL = 'https://www.ppl.cz/en/pickup-points-map';

function isMobile(): boolean {
  return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function buildMapUrl(address?: string, city?: string, zipCode?: string): string {
  const parts: string[] = [];
  if (address) parts.push(address);
  if (city) parts.push(city);
  if (zipCode) parts.push(zipCode);
  
  const fullAddress = parts.join(', ').trim();
  
  if (fullAddress) {
    const params = new URLSearchParams();
    params.set('KTMAddress', fullAddress);
    return `${PPL_MAP_BASE_URL}?${params.toString()}`;
  }
  
  return PPL_MAP_BASE_URL;
}

export function PPLSmartPopup({
  open,
  onOpenChange,
  customerAddress,
  customerCity,
  customerZipCode,
}: PPLSmartPopupProps) {

  const openPPLWindow = useCallback(() => {
    const mapUrl = buildMapUrl(customerAddress, customerCity, customerZipCode);
    
    if (isMobile()) {
      window.open(mapUrl, '_blank');
    } else {
      const width = 900;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      window.open(
        mapUrl,
        'PPLPickupPoints',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );
    }
    onOpenChange(false);
  }, [onOpenChange, customerAddress, customerCity, customerZipCode]);

  useEffect(() => {
    if (open) {
      openPPLWindow();
    }
  }, [open, openPPLWindow]);

  return null;
}

export default PPLSmartPopup;
