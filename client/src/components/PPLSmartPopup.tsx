import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";

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

const PPL_MAP_URL = 'https://www.ppl.cz/mapa-ppl-parcelshops';

function isMobile(): boolean {
  return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function PPLSmartPopup({
  open,
  onOpenChange,
  onSelectPickupPoint,
}: PPLSmartPopupProps) {
  const { t } = useTranslation(["orders", "common"]);

  const openPPLWindow = useCallback(() => {
    if (isMobile()) {
      window.open(PPL_MAP_URL, '_blank');
    } else {
      const width = 900;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      window.open(
        PPL_MAP_URL,
        'PPLPickupPoints',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );
    }
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (open) {
      openPPLWindow();
    }
  }, [open, openPPLWindow]);

  return null;
}

export default PPLSmartPopup;
