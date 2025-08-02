// Shipping cost calculator based on method and country
export const shippingCosts = {
  // Czech Republic shipping costs (CZK)
  'Czech Republic': {
    'GLS': 150,
    'PPL': 180,
    'DHL': 200,
    'DPD': 160
  },
  'Czechia': {
    'GLS': 150,
    'PPL': 180,
    'DHL': 200,
    'DPD': 160
  },
  // Germany shipping costs (EUR)
  'Germany': {
    'GLS': 8.90,
    'PPL': 12.50,
    'DHL': 15.90,
    'DPD': 9.90
  },
  // Austria shipping costs (EUR)
  'Austria': {
    'GLS': 9.90,
    'PPL': 13.50,
    'DHL': 16.90,
    'DPD': 10.90
  },
  // Default European shipping costs (EUR)
  'default': {
    'GLS': 12.90,
    'PPL': 15.50,
    'DHL': 18.90,
    'DPD': 13.90
  }
};

export function calculateShippingCost(
  shippingMethod: string,
  country: string,
  currency: string = 'EUR'
): number {
  if (!shippingMethod || !country) return 0;

  // Normalize country name
  const normalizedCountry = country.trim();
  
  // Get shipping costs for the country
  const countryCosts = shippingCosts[normalizedCountry as keyof typeof shippingCosts] || shippingCosts.default;
  const cost = countryCosts[shippingMethod as keyof typeof countryCosts] || 0;

  // Convert cost if needed
  if (normalizedCountry === 'Czech Republic' || normalizedCountry === 'Czechia') {
    // Czech costs are in CZK
    if (currency === 'EUR') {
      return cost / 25; // Approximate CZK to EUR conversion
    }
    return cost;
  } else {
    // Other costs are in EUR
    if (currency === 'CZK') {
      return cost * 25; // Approximate EUR to CZK conversion
    }
    return cost;
  }
}