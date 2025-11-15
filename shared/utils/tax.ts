/**
 * Tax calculation utilities for financial settings enforcement
 */

/**
 * Get default tax rate based on currency from financial settings
 */
export function getDefaultTaxRate(
  currency: string,
  financialSettings: { defaultTaxRateCzk?: number; defaultTaxRateEur?: number }
): number {
  // Check for undefined/null, NOT falsy (to allow 0% VAT for reverse charge)
  if (currency === 'CZK' && financialSettings.defaultTaxRateCzk !== undefined && financialSettings.defaultTaxRateCzk !== null) {
    return financialSettings.defaultTaxRateCzk / 100;
  }
  if (currency === 'EUR' && financialSettings.defaultTaxRateEur !== undefined && financialSettings.defaultTaxRateEur !== null) {
    return financialSettings.defaultTaxRateEur / 100;
  }
  // Default fallback ONLY if settings not configured
  return 0.21;
}

/**
 * Apply tax based on calculation method and display settings
 */
export function applyTax(
  amount: number,
  taxRate: number,
  options: {
    taxCalculationMethod?: 'exclusive' | 'inclusive';
    showPricesWithVat?: boolean;
  }
): {
  netAmount: number;
  taxAmount: number;
  grossAmount: number;
  displayAmount: number;
} {
  const method = options.taxCalculationMethod || 'exclusive';
  const showWithVat = options.showPricesWithVat ?? true;
  
  let netAmount: number;
  let grossAmount: number;
  
  if (method === 'inclusive') {
    grossAmount = amount;
    netAmount = amount / (1 + taxRate);
  } else {
    netAmount = amount;
    grossAmount = amount * (1 + taxRate);
  }
  
  const taxAmount = grossAmount - netAmount;
  const displayAmount = showWithVat ? grossAmount : netAmount;
  
  return {
    netAmount,
    taxAmount,
    grossAmount,
    displayAmount,
  };
}

/**
 * Calculate order totals with tax
 */
export function calculateOrderTotals(
  subtotal: number,
  currency: string,
  financialSettings: {
    defaultTaxRateCzk?: number;
    defaultTaxRateEur?: number;
    showPricesWithVat?: boolean;
    taxCalculationMethod?: 'exclusive' | 'inclusive';
  },
  options?: {
    customTaxRate?: number;      // Manual override (as percentage, e.g., 21)
    taxEnabled?: boolean;         // Allow disabling tax entirely
    showPricesWithVatOverride?: boolean; // Override display setting
  }
): {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  displaySubtotal: number;
  displayGrandTotal: number;
} {
  // Use custom rate if provided, otherwise default from settings
  const taxRate = options?.customTaxRate !== undefined
    ? options.customTaxRate / 100  // Convert percentage to decimal
    : getDefaultTaxRate(currency, financialSettings);
    
  const taxEnabled = options?.taxEnabled ?? true;
  
  if (!taxEnabled || taxRate === 0) {
    return {
      subtotal,
      taxRate: 0,
      taxAmount: 0,
      grandTotal: subtotal,
      displaySubtotal: subtotal,
      displayGrandTotal: subtotal,
    };
  }
  
  const result = applyTax(subtotal, taxRate, {
    taxCalculationMethod: financialSettings.taxCalculationMethod,
    showPricesWithVat: options?.showPricesWithVatOverride ?? financialSettings.showPricesWithVat,
  });
  
  return {
    subtotal: result.netAmount,
    taxRate: taxRate * 100, // Return as percentage for UI display
    taxAmount: result.taxAmount,
    grandTotal: result.grossAmount,
    // Display amounts based on showPricesWithVat setting
    displaySubtotal: (options?.showPricesWithVatOverride ?? financialSettings.showPricesWithVat) ? result.grossAmount : result.netAmount,
    displayGrandTotal: result.grossAmount, // Always show gross total (including tax)
  };
}
