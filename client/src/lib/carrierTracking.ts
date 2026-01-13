export interface CarrierTrackingInfo {
  name: string;
  trackingUrl: string;
  logoColor?: string;
}

const CARRIER_TRACKING_URLS: Record<string, (trackingNumber: string) => string> = {
  'ppl': (tn) => `https://www.ppl.cz/vyhledat-zasilku?shipmentId=${encodeURIComponent(tn)}`,
  'ppl cz': (tn) => `https://www.ppl.cz/vyhledat-zasilku?shipmentId=${encodeURIComponent(tn)}`,
  'ppl_cz': (tn) => `https://www.ppl.cz/vyhledat-zasilku?shipmentId=${encodeURIComponent(tn)}`,
  
  'gls': (tn) => `https://gls-group.eu/CZ/cs/sledovani-zasilek?match=${encodeURIComponent(tn)}`,
  'gls de': (tn) => `https://gls-group.eu/DE/de/paketverfolgung?match=${encodeURIComponent(tn)}`,
  'gls_de': (tn) => `https://gls-group.eu/DE/de/paketverfolgung?match=${encodeURIComponent(tn)}`,
  'gls cz': (tn) => `https://gls-group.eu/CZ/cs/sledovani-zasilek?match=${encodeURIComponent(tn)}`,
  
  'dhl': (tn) => `https://www.dhl.com/cz-cs/home/tracking/tracking-parcel.html?submit=1&tracking-id=${encodeURIComponent(tn)}`,
  'dhl de': (tn) => `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${encodeURIComponent(tn)}`,
  'dhl_de': (tn) => `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${encodeURIComponent(tn)}`,
  'dhl express': (tn) => `https://www.dhl.com/cz-cs/home/tracking/tracking-express.html?submit=1&tracking-id=${encodeURIComponent(tn)}`,
  
  'dpd': (tn) => `https://tracking.dpd.de/parcelstatus?locale=cs_CZ&query=${encodeURIComponent(tn)}`,
  'dpd cz': (tn) => `https://tracking.dpd.de/parcelstatus?locale=cs_CZ&query=${encodeURIComponent(tn)}`,
  'dpd de': (tn) => `https://tracking.dpd.de/parcelstatus?locale=de_DE&query=${encodeURIComponent(tn)}`,
  
  'ups': (tn) => `https://www.ups.com/track?tracknum=${encodeURIComponent(tn)}`,
  
  'fedex': (tn) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(tn)}`,
  
  'zasilkovna': (tn) => `https://tracking.packeta.com/cs/?id=${encodeURIComponent(tn)}`,
  'packeta': (tn) => `https://tracking.packeta.com/cs/?id=${encodeURIComponent(tn)}`,
  
  'ceska posta': (tn) => `https://www.postaonline.cz/trackandtrace/-/zasilka/cislo?parcelNumbers=${encodeURIComponent(tn)}`,
  'česká pošta': (tn) => `https://www.postaonline.cz/trackandtrace/-/zasilka/cislo?parcelNumbers=${encodeURIComponent(tn)}`,
  'cp': (tn) => `https://www.postaonline.cz/trackandtrace/-/zasilka/cislo?parcelNumbers=${encodeURIComponent(tn)}`,
  
  'hermes': (tn) => `https://www.myhermes.de/empfangen/sendungsverfolgung/?suche=${encodeURIComponent(tn)}`,
  
  'tnt': (tn) => `https://www.tnt.com/express/cs_cz/site/tracking.html?searchType=con&cons=${encodeURIComponent(tn)}`,
  
  'intime': (tn) => `https://tracking.intime.cz/?cId=${encodeURIComponent(tn)}`,
  
  'toptrans': (tn) => `https://www.toptrans.cz/cs/sledovani-zasilky?tracking=${encodeURIComponent(tn)}`,
  
  'geis': (tn) => `https://www.geis-group.cz/cs/sledovani-zasilky/?shipmentNumber=${encodeURIComponent(tn)}`,
};

export function getCarrierTrackingUrl(carrier: string, trackingNumber: string): string | null {
  if (!carrier || !trackingNumber) return null;
  
  const normalizedCarrier = carrier.toLowerCase().trim();
  const urlGenerator = CARRIER_TRACKING_URLS[normalizedCarrier];
  
  if (urlGenerator) {
    return urlGenerator(trackingNumber);
  }
  
  for (const [key, generator] of Object.entries(CARRIER_TRACKING_URLS)) {
    if (normalizedCarrier.includes(key) || key.includes(normalizedCarrier)) {
      return generator(trackingNumber);
    }
  }
  
  return null;
}

export function getCarrierDisplayName(carrier: string): string {
  if (!carrier) return '';
  
  const normalizedCarrier = carrier.toLowerCase().trim();
  
  const displayNames: Record<string, string> = {
    'ppl': 'PPL',
    'ppl cz': 'PPL CZ',
    'ppl_cz': 'PPL CZ',
    'gls': 'GLS',
    'gls de': 'GLS DE',
    'gls_de': 'GLS DE',
    'gls cz': 'GLS CZ',
    'dhl': 'DHL',
    'dhl de': 'DHL DE',
    'dhl_de': 'DHL DE',
    'dhl express': 'DHL Express',
    'dpd': 'DPD',
    'dpd cz': 'DPD CZ',
    'dpd de': 'DPD DE',
    'ups': 'UPS',
    'fedex': 'FedEx',
    'zasilkovna': 'Zásilkovna',
    'packeta': 'Packeta',
    'ceska posta': 'Česká pošta',
    'česká pošta': 'Česká pošta',
    'cp': 'Česká pošta',
    'hermes': 'Hermes',
    'tnt': 'TNT',
    'intime': 'InTime',
    'toptrans': 'TOPTRANS',
    'geis': 'Geis',
  };
  
  return displayNames[normalizedCarrier] || carrier.toUpperCase();
}

export function getSupportedCarriers(): string[] {
  return [
    'PPL CZ',
    'GLS DE',
    'GLS CZ',
    'DHL',
    'DHL DE',
    'DHL Express',
    'DPD',
    'DPD CZ',
    'DPD DE',
    'UPS',
    'FedEx',
    'Zásilkovna',
    'Packeta',
    'Česká pošta',
    'Hermes',
    'TNT',
    'InTime',
    'TOPTRANS',
    'Geis',
  ];
}

export function copyTrackingUrl(carrier: string, trackingNumber: string): boolean {
  const url = getCarrierTrackingUrl(carrier, trackingNumber);
  if (!url) return false;
  
  try {
    navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
