// Shipping cost calculator based on method and country

// PPL CZ Tiered Pricing (prices in CZK, without VAT)
export const PPL_CZ_PRICING = {
  BUSINESS: [
    { maxWeight: 2, price: 85 },
    { maxWeight: 5, price: 91 },
    { maxWeight: 10, price: 97 },
    { maxWeight: 20, price: 109 },
    { maxWeight: 31.5, price: 139 },
  ],
  PRIVATE: [
    { maxWeight: 2, price: 87 },
    { maxWeight: 5, price: 95 },
    { maxWeight: 10, price: 101 },
    { maxWeight: 20, price: 115 },
    { maxWeight: 31.5, price: 147 },
  ],
  SMART: [
    { maxWeight: 2, price: 63 },
    { maxWeight: 5, price: 65 },
    { maxWeight: 10, price: 69 },
    { maxWeight: 20, price: 79 },
    { maxWeight: 31.5, price: 89 },
  ],
};

export type PPLPackageType = 'BUSINESS' | 'PRIVATE' | 'SMART';

export function calculatePPLCZPrice(weightKg: number, packageType: PPLPackageType = 'PRIVATE'): number {
  const tiers = PPL_CZ_PRICING[packageType];
  for (const tier of tiers) {
    if (weightKg <= tier.maxWeight) {
      return tier.price;
    }
  }
  return tiers[tiers.length - 1].price;
}

// PPL country rate type (flat rate per kg)
export interface PPLCountryRate {
  ratePerKg: number;
  baseFee: number;
  currency: string;
}

export interface PPLCODFee {
  fee: number;
  currency: string;
  percentFee?: number;
  thresholdCzk?: number;
}

export interface PPLSurcharges {
  mytne?: number;
  fuelSurchargePerKg?: number;
  insurancePercent?: number;
  insuranceMinFee?: number;
  oversizedFee?: number;
}

export interface PPLShippingRates {
  countries?: Record<string, PPLCountryRate>;
  codFees?: {
    cash?: PPLCODFee;
    card?: PPLCODFee & { percentFee?: number; thresholdCzk?: number };
  };
  surcharges?: PPLSurcharges;
}

export interface PPLShippingCostBreakdown {
  basePrice: number;
  mytne: number;
  fuelSurcharge: number;
  codFee: number;
  insurance: number;
  oversized: number;
  total: number;
}

export function calculatePPLCZTotalCost(
  weightKg: number,
  packageType: PPLPackageType = 'PRIVATE',
  options: {
    isCod?: boolean;
    codPaymentType?: 'cash' | 'card';
    declaredValue?: number;
    isOversized?: boolean;
    rates?: PPLShippingRates;
  } = {}
): PPLShippingCostBreakdown {
  const { isCod = false, codPaymentType = 'cash', declaredValue = 0, isOversized = false, rates } = options;
  
  const basePrice = calculatePPLCZPrice(weightKg, packageType);
  
  const surcharges = rates?.surcharges || {};
  const mytne = surcharges.mytne || 0;
  
  const fuelSurchargePerKg = surcharges.fuelSurchargePerKg || 0;
  const fuelSurcharge = Math.round(weightKg * fuelSurchargePerKg);
  
  let codFee = 0;
  if (isCod && rates?.codFees) {
    const codConfig = codPaymentType === 'card' ? rates.codFees.card : rates.codFees.cash;
    if (codConfig) {
      codFee = codConfig.fee || 0;
      if (codPaymentType === 'card' && codConfig.percentFee && codConfig.thresholdCzk) {
        if (declaredValue > codConfig.thresholdCzk) {
          codFee += Math.round((declaredValue - codConfig.thresholdCzk) * (codConfig.percentFee / 100));
        }
      }
    }
  }
  
  let insurance = 0;
  if (declaredValue > 0 && surcharges.insurancePercent) {
    insurance = Math.max(
      surcharges.insuranceMinFee || 0,
      Math.round((declaredValue * surcharges.insurancePercent) / 100)
    );
  }
  
  const oversized = isOversized ? (surcharges.oversizedFee || 0) : 0;
  
  const total = basePrice + mytne + fuelSurcharge + codFee + insurance + oversized;
  
  return {
    basePrice,
    mytne,
    fuelSurcharge,
    codFee,
    insurance,
    oversized,
    total,
  };
}

// Default flat shipping costs (fallback when no weight-based rates are configured)
export const shippingCosts = {
  // Czech Republic shipping costs (CZK)
  'Czech Republic': {
    'GLS': 150,
    'GLS DE': 150,
    'PPL': 180,
    'PPL CZ': 180,
    'DHL': 200,
    'DHL DE': 200,
    'DPD': 160
  },
  'Czechia': {
    'GLS': 150,
    'GLS DE': 150,
    'PPL': 180,
    'PPL CZ': 180,
    'DHL': 200,
    'DHL DE': 200,
    'DPD': 160
  },
  'CZ': {
    'GLS': 150,
    'GLS DE': 150,
    'PPL': 180,
    'PPL CZ': 180,
    'DHL': 200,
    'DHL DE': 200,
    'DPD': 160
  },
  // Germany shipping costs (EUR)
  'Germany': {
    'GLS': 8.90,
    'GLS DE': 8.90,
    'PPL': 12.50,
    'PPL CZ': 12.50,
    'DHL': 15.90,
    'DHL DE': 15.90,
    'DPD': 9.90
  },
  'DE': {
    'GLS': 8.90,
    'GLS DE': 8.90,
    'PPL': 12.50,
    'PPL CZ': 12.50,
    'DHL': 15.90,
    'DHL DE': 15.90,
    'DPD': 9.90
  },
  // Austria shipping costs (EUR)
  'Austria': {
    'GLS': 9.90,
    'GLS DE': 9.90,
    'PPL': 13.50,
    'PPL CZ': 13.50,
    'DHL': 16.90,
    'DHL DE': 16.90,
    'DPD': 10.90
  },
  'AT': {
    'GLS': 9.90,
    'GLS DE': 9.90,
    'PPL': 13.50,
    'PPL CZ': 13.50,
    'DHL': 16.90,
    'DHL DE': 16.90,
    'DPD': 10.90
  },
  // Default European shipping costs (EUR)
  'default': {
    'GLS': 12.90,
    'GLS DE': 12.90,
    'PPL': 15.50,
    'PPL CZ': 15.50,
    'DHL': 18.90,
    'DHL DE': 18.90,
    'DPD': 13.90
  }
};

// Check if a country is domestic (Czech Republic)
function isDomestic(country: string): boolean {
  const normalized = country.toLowerCase().trim();
  return ['cz', 'czech republic', 'czechia', 'česko', 'česká republika', 'cesko', 'ceska republika'].includes(normalized);
}

// Normalize country name to ISO code
function normalizeCountryToCode(country: string): string {
  const normalized = country.toLowerCase().trim();
  const countryMap: Record<string, string> = {
    'cz': 'CZ', 'czech republic': 'CZ', 'czechia': 'CZ', 'česko': 'CZ', 'česká republika': 'CZ',
    'sk': 'SK', 'slovakia': 'SK', 'slovensko': 'SK', 'slovenská republika': 'SK',
    'pl': 'PL', 'poland': 'PL', 'polska': 'PL', 'polsko': 'PL',
    'at': 'AT', 'austria': 'AT', 'österreich': 'AT', 'rakousko': 'AT',
    'de': 'DE', 'germany': 'DE', 'deutschland': 'DE', 'německo': 'DE',
    'hu': 'HU', 'hungary': 'HU', 'magyarország': 'HU', 'maďarsko': 'HU',
  };
  return countryMap[normalized] || country.toUpperCase();
}

// Calculate PPL shipping cost based on flat rate per kg
export function calculatePPLShippingCostByWeight(
  weight: number,
  country: string,
  pplRates?: PPLShippingRates,
  targetCurrency: string = 'CZK',
  paymentMethod?: string
): { cost: number; countryRate: PPLCountryRate | null; codFee: number } {
  if (!pplRates || !weight) {
    return { cost: 0, countryRate: null, codFee: 0 };
  }

  const countryCode = normalizeCountryToCode(country);
  const countryRate = pplRates.countries?.[countryCode];
  
  if (!countryRate) {
    return { cost: 0, countryRate: null, codFee: 0 };
  }

  // Calculate base shipping cost: baseFee + (ratePerKg * weight)
  let cost = countryRate.baseFee + (countryRate.ratePerKg * weight);
  
  // Add COD fee if payment method is COD
  let codFee = 0;
  const normalizedPayment = paymentMethod?.toLowerCase() || '';
  const isCOD = normalizedPayment.includes('cod') || normalizedPayment.includes('dobirka') || normalizedPayment.includes('dobírka') || normalizedPayment.includes('cash on delivery');
  
  if (isCOD && pplRates.codFees) {
    // Check if card payment COD or cash payment COD
    const isCardPayment = normalizedPayment.includes('card') || normalizedPayment.includes('karta') || normalizedPayment.includes('kartou');
    if (isCardPayment && pplRates.codFees.card) {
      codFee = pplRates.codFees.card.fee;
    } else if (pplRates.codFees.cash) {
      codFee = pplRates.codFees.cash.fee;
    }
    cost += codFee;
  }
  
  // Currency conversion if needed
  if (countryRate.currency !== targetCurrency) {
    if (countryRate.currency === 'CZK' && targetCurrency === 'EUR') {
      cost = cost / 25;
      codFee = codFee / 25;
    } else if (countryRate.currency === 'EUR' && targetCurrency === 'CZK') {
      cost = cost * 25;
      codFee = codFee * 25;
    }
  }
  
  return { cost, countryRate, codFee };
}

// Main shipping cost calculation function
export function calculateShippingCost(
  shippingMethod: string,
  country: string,
  currency: string = 'EUR',
  options?: {
    weight?: number;
    pplRates?: PPLShippingRates;
    paymentMethod?: string;
  }
): number {
  if (!shippingMethod || !country) return 0;

  // Normalize carrier name
  const normalizedMethod = shippingMethod.replace(/\s+/g, ' ').trim();
  const isPPL = normalizedMethod === 'PPL' || normalizedMethod === 'PPL CZ';

  // If PPL and flat rate per kg rates are available, use them
  if (isPPL && options?.pplRates && options?.weight) {
    const { cost } = calculatePPLShippingCostByWeight(
      options.weight,
      country,
      options.pplRates,
      currency,
      options.paymentMethod
    );
    if (cost > 0) {
      return cost;
    }
  }

  // Normalize country name
  const normalizedCountry = country.trim();
  
  // Get shipping costs for the country
  const countryCosts = shippingCosts[normalizedCountry as keyof typeof shippingCosts] || shippingCosts.default;
  const cost = countryCosts[normalizedMethod as keyof typeof countryCosts] || 
               countryCosts[shippingMethod as keyof typeof countryCosts] || 0;

  // Convert cost if needed
  if (isDomestic(normalizedCountry)) {
    // Czech costs are in CZK
    if (currency === 'EUR') {
      return cost / 25;
    }
    return cost;
  } else {
    // Other costs are in EUR
    if (currency === 'CZK') {
      return cost * 25;
    }
    return cost;
  }
}

// Helper to get the PPL rate description
export function getPPLRateDescription(countryRate: PPLCountryRate | null, weight?: number): string {
  if (!countryRate) return '';
  const base = `Base: ${countryRate.baseFee} ${countryRate.currency}`;
  const perKg = `+ ${countryRate.ratePerKg} ${countryRate.currency}/kg`;
  if (weight) {
    const total = countryRate.baseFee + (countryRate.ratePerKg * weight);
    return `${base} ${perKg} = ${total.toFixed(0)} ${countryRate.currency} for ${weight}kg`;
  }
  return `${base} ${perKg}`;
}
