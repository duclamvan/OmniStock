export type Currency = 'CZK' | 'EUR' | 'USD' | 'VND' | 'CNY';

// Simplified exchange rates - in production, use real-time API
const EXCHANGE_RATES: Record<Currency, Record<Currency, number>> = {
  EUR: {
    EUR: 1,
    CZK: 25.0,
    USD: 1.1,
    VND: 26000,
    CNY: 7.8,
  },
  CZK: {
    EUR: 0.04,
    CZK: 1,
    USD: 0.044,
    VND: 1040,
    CNY: 0.31,
  },
  USD: {
    EUR: 0.91,
    CZK: 22.7,
    USD: 1,
    VND: 23600,
    CNY: 7.1,
  },
  VND: {
    EUR: 0.000038,
    CZK: 0.00096,
    USD: 0.000042,
    VND: 1,
    CNY: 0.0003,
  },
  CNY: {
    EUR: 0.128,
    CZK: 3.2,
    USD: 0.14,
    VND: 3333,
    CNY: 1,
  },
};

export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): number {
  if (fromCurrency === toCurrency) return amount;
  
  const rate = EXCHANGE_RATES[fromCurrency]?.[toCurrency];
  if (!rate) {
    console.warn(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
    return amount;
  }
  
  return amount * rate;
}

export function formatCurrency(amount: number, currency: Currency | string): string {
  // Handle undefined or null values
  if (amount === undefined || amount === null || isNaN(amount)) {
    amount = 0;
  }
  
  // Default to EUR if currency is not provided
  if (!currency) {
    currency = 'EUR';
  }
  
  const formatters: Record<Currency, Intl.NumberFormat> = {
    EUR: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }),
    CZK: new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }),
    USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    VND: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }),
    CNY: new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }),
  };

  return formatters[currency as Currency]?.format(amount) || `${amount.toFixed(2)} ${currency}`;
}

export function getCurrencySymbol(currency: Currency): string {
  const symbols: Record<Currency, string> = {
    EUR: '€',
    CZK: 'Kč',
    USD: '$',
    VND: '₫',
    CNY: '¥',
  };
  
  return symbols[currency] || currency;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}.${month}.${year}`;
}

export function formatCompactNumber(value: number): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }

  const absValue = Math.abs(value);
  
  if (absValue >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (absValue >= 1_000_000) {
    return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (absValue >= 10_000) {
    return (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  
  return value.toLocaleString();
}
