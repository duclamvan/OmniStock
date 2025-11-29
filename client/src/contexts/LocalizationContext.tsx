import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { useSettings } from './SettingsContext';
import { format as dateFnsFormat } from 'date-fns';
import { enUS, vi, type Locale } from 'date-fns/locale';
import i18n from '@/i18n/i18n';

export interface LocalizationSettings {
  language: 'en' | 'vi';
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12-hour' | '24-hour';
  timezone: string;
  numberFormat: '1,000.00' | '1.000,00';
  currency: 'CZK' | 'EUR' | 'USD' | 'VND' | 'CNY';
  currencyDisplay: 'symbol' | 'code' | 'both';
}

interface LocalizationContextType {
  settings: LocalizationSettings;
  formatDate: (date: Date | string | null | undefined, includeTime?: boolean) => string;
  formatTime: (date: Date | string | null | undefined) => string;
  formatNumber: (value: number | string | null | undefined, decimals?: number) => string;
  formatCurrency: (amount: number | string | null | undefined, currencyCode?: string) => string;
  parseNumber: (value: string) => number;
  getDateFnsFormat: () => string;
  getTimeFnsFormat: () => string;
  getLocale: () => Locale;
  applySettings: (newSettings: Partial<LocalizationSettings>) => void;
}

const defaultSettings: LocalizationSettings = {
  language: 'en',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24-hour',
  timezone: 'Europe/Prague',
  numberFormat: '1,000.00',
  currency: 'CZK',
  currencyDisplay: 'symbol',
};

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

const DATE_FORMAT_MAP: Record<string, string> = {
  'DD/MM/YYYY': 'dd/MM/yyyy',
  'MM/DD/YYYY': 'MM/dd/yyyy',
  'YYYY-MM-DD': 'yyyy-MM-dd',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  CZK: 'Kč',
  EUR: '€',
  USD: '$',
  VND: '₫',
  CNY: '¥',
};

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const { generalSettings, isLoading } = useSettings();
  const [settings, setSettings] = useState<LocalizationSettings>(defaultSettings);

  useEffect(() => {
    if (!isLoading && generalSettings) {
      const newSettings: LocalizationSettings = {
        language: (generalSettings.defaultLanguage as 'en' | 'vi') || 'en',
        dateFormat: (generalSettings.defaultDateFormat as LocalizationSettings['dateFormat']) || 'DD/MM/YYYY',
        timeFormat: (generalSettings.defaultTimeFormat as LocalizationSettings['timeFormat']) || '24-hour',
        timezone: generalSettings.defaultTimezone || 'Europe/Prague',
        numberFormat: (generalSettings.numberFormat as LocalizationSettings['numberFormat']) || '1,000.00',
        currency: (generalSettings.defaultCurrency as LocalizationSettings['currency']) || 'CZK',
        currencyDisplay: (generalSettings.currencyDisplay as LocalizationSettings['currencyDisplay']) || 'symbol',
      };
      setSettings(newSettings);

      if (newSettings.language !== i18n.language) {
        i18n.changeLanguage(newSettings.language);
        localStorage.setItem('app_language', newSettings.language);
        localStorage.setItem('i18nextLng', newSettings.language);
      }
    }
  }, [isLoading, generalSettings]);

  const getLocale = useCallback((): Locale => {
    return settings.language === 'vi' ? vi : enUS;
  }, [settings.language]);

  const getDateFnsFormat = useCallback((): string => {
    return DATE_FORMAT_MAP[settings.dateFormat] || 'dd/MM/yyyy';
  }, [settings.dateFormat]);

  const getTimeFnsFormat = useCallback((): string => {
    return settings.timeFormat === '12-hour' ? 'h:mm a' : 'HH:mm';
  }, [settings.timeFormat]);

  const formatDate = useCallback((date: Date | string | null | undefined, includeTime = false): string => {
    if (!date) return '-';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '-';
      
      const dateFormatStr = getDateFnsFormat();
      const timeFormatStr = getTimeFnsFormat();
      const formatStr = includeTime ? `${dateFormatStr} ${timeFormatStr}` : dateFormatStr;
      
      return dateFnsFormat(dateObj, formatStr, { locale: getLocale() });
    } catch {
      return '-';
    }
  }, [getDateFnsFormat, getTimeFnsFormat, getLocale]);

  const formatTime = useCallback((date: Date | string | null | undefined): string => {
    if (!date) return '-';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '-';
      
      return dateFnsFormat(dateObj, getTimeFnsFormat(), { locale: getLocale() });
    } catch {
      return '-';
    }
  }, [getTimeFnsFormat, getLocale]);

  const formatNumber = useCallback((value: number | string | null | undefined, decimals = 2): string => {
    if (value === null || value === undefined || value === '') return '-';
    
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';

    const useEuropeanFormat = settings.numberFormat === '1.000,00';
    
    const parts = num.toFixed(decimals).split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];
    
    const thousandsSeparator = useEuropeanFormat ? '.' : ',';
    const decimalSeparator = useEuropeanFormat ? ',' : '.';
    
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
    
    return decimals > 0 ? `${formattedInteger}${decimalSeparator}${decimalPart}` : formattedInteger;
  }, [settings.numberFormat]);

  const parseNumber = useCallback((value: string): number => {
    if (!value) return 0;
    
    const useEuropeanFormat = settings.numberFormat === '1.000,00';
    
    let cleaned = value.replace(/[^\d.,\-]/g, '');
    
    if (useEuropeanFormat) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
    
    return parseFloat(cleaned) || 0;
  }, [settings.numberFormat]);

  const formatCurrency = useCallback((amount: number | string | null | undefined, currencyCode?: string): string => {
    if (amount === null || amount === undefined || amount === '') return '-';
    
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '-';
    
    const currency = currencyCode || settings.currency;
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    const formattedNumber = formatNumber(num, 2);
    
    switch (settings.currencyDisplay) {
      case 'symbol':
        return currency === 'CZK' || currency === 'VND' 
          ? `${formattedNumber} ${symbol}` 
          : `${symbol}${formattedNumber}`;
      case 'code':
        return `${formattedNumber} ${currency}`;
      case 'both':
        return currency === 'CZK' || currency === 'VND'
          ? `${formattedNumber} ${symbol} (${currency})`
          : `${symbol}${formattedNumber} (${currency})`;
      default:
        return `${formattedNumber} ${currency}`;
    }
  }, [settings.currency, settings.currencyDisplay, formatNumber]);

  const applySettings = useCallback((newSettings: Partial<LocalizationSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      
      if (newSettings.language && newSettings.language !== i18n.language) {
        i18n.changeLanguage(newSettings.language);
        localStorage.setItem('app_language', newSettings.language);
        localStorage.setItem('i18nextLng', newSettings.language);
      }
      
      return updated;
    });
  }, []);

  const value: LocalizationContextType = {
    settings,
    formatDate,
    formatTime,
    formatNumber,
    formatCurrency,
    parseNumber,
    getDateFnsFormat,
    getTimeFnsFormat,
    getLocale,
    applySettings,
  };

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
}

export function useDateFormat() {
  const { formatDate, getDateFnsFormat, getLocale } = useLocalization();
  return { formatDate, getDateFnsFormat, getLocale };
}

export function useNumberFormat() {
  const { formatNumber, formatCurrency, parseNumber, settings } = useLocalization();
  return { formatNumber, formatCurrency, parseNumber, numberFormat: settings.numberFormat };
}
