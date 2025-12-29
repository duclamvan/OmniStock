export type Currency = 'CZK' | 'EUR' | 'USD' | 'VND' | 'CNY';

// Exchange rates - must match server-side rates for roundtrip accuracy
// Server uses: USD=0.92, CZK=0.04, CNY=0.13, VND=0.000038, GBP=1.17 (all to EUR)
const EXCHANGE_RATES: Record<Currency, Record<Currency, number>> = {
  EUR: {
    EUR: 1,
    CZK: 25.0,         // 1/0.04
    USD: 1.087,        // 1/0.92 (must match server inverse)
    VND: 26316,        // 1/0.000038
    CNY: 7.69,         // 1/0.13
  },
  CZK: {
    EUR: 0.04,
    CZK: 1,
    USD: 0.0435,       // 0.04 * 1.087
    VND: 1053,
    CNY: 0.31,
  },
  USD: {
    EUR: 0.92,         // Must match server rate
    CZK: 23,
    USD: 1,
    VND: 24213,        // 0.92 * 26316
    CNY: 7.07,         // 0.92 * 7.69
  },
  VND: {
    EUR: 0.000038,
    CZK: 0.00095,
    USD: 0.0000413,    // 0.000038 * 1.087
    VND: 1,
    CNY: 0.00029,
  },
  CNY: {
    EUR: 0.13,         // Must match server rate
    CZK: 3.25,
    USD: 0.141,        // 0.13 * 1.087
    VND: 3421,
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

export function getCurrencyByCountry(country: string): Currency {
  const countryLower = country?.toLowerCase() || '';
  
  const czkCountries = ['czech republic', 'czechia', 'česká republika', 'česko', 'cz'];
  const usdCountries = ['united states', 'usa', 'us', 'united states of america'];
  const vndCountries = ['vietnam', 'việt nam', 'vn'];
  const cnyCountries = ['china', 'zhongguo', '中国', 'cn'];
  
  if (czkCountries.some(c => countryLower.includes(c))) return 'CZK';
  if (usdCountries.some(c => countryLower.includes(c))) return 'USD';
  if (vndCountries.some(c => countryLower.includes(c))) return 'VND';
  if (cnyCountries.some(c => countryLower.includes(c))) return 'CNY';
  
  return 'EUR';
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  let d: Date;
  if (typeof date === 'string') {
    d = new Date(date);
  } else if (date instanceof Date) {
    d = date;
  } else {
    return '';
  }
  
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
