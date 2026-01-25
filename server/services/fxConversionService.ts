type ExchangeRates = Record<string, number>;

export const fxConversionService = {
  convertToEur(amount: number, fromCurrency: string, exchangeRates: ExchangeRates): number {
    if (isNaN(amount)) {
      console.warn(`[FX] convertToEur: Invalid amount (NaN) for ${fromCurrency}`);
      return 0;
    }
    if (fromCurrency === 'EUR') {
      return amount;
    }
    const rate = exchangeRates[fromCurrency];
    if (!rate || rate === 0) {
      console.warn(`[FX] Missing or zero exchange rate for ${fromCurrency}, treating as 1:1 with EUR`);
      return amount;
    }
    return amount / rate;
  },

  convertFromEur(amount: number, toCurrency: string, exchangeRates: ExchangeRates): number {
    if (isNaN(amount)) {
      console.warn(`[FX] convertFromEur: Invalid amount (NaN) for ${toCurrency}`);
      return 0;
    }
    if (toCurrency === 'EUR') {
      return amount;
    }
    const rate = exchangeRates[toCurrency];
    if (!rate || rate === 0) {
      console.warn(`[FX] Missing or zero exchange rate for ${toCurrency}, treating as 1:1 with EUR`);
      return amount;
    }
    return amount * rate;
  },

  convert(amount: number, fromCurrency: string, toCurrency: string, exchangeRates: ExchangeRates): number {
    if (fromCurrency === toCurrency) {
      return isNaN(amount) ? 0 : amount;
    }
    const eurAmount = this.convertToEur(amount, fromCurrency, exchangeRates);
    return this.convertFromEur(eurAmount, toCurrency, exchangeRates);
  },

  safeConvertToEur(amount: number | string | undefined | null, fromCurrency: string, exchangeRates: ExchangeRates): number {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
    return this.convertToEur(isNaN(numAmount) ? 0 : numAmount, fromCurrency, exchangeRates);
  },

  validateRates(exchangeRates: ExchangeRates): boolean {
    if (!exchangeRates || typeof exchangeRates !== 'object') {
      console.warn('[FX] Invalid exchangeRates object');
      return false;
    }
    if (exchangeRates['EUR'] && Math.abs(exchangeRates['EUR'] - 1) > 0.01) {
      console.warn(`[FX] Unexpected EUR rate (${exchangeRates['EUR']}), expected ~1.0 for EUR→X format`);
    }
    return true;
  }
};
