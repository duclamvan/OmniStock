import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import commonEN from './locales/en/common';
import ordersEN from './locales/en/orders';
import inventoryEN from './locales/en/inventory';
import productsEN from './locales/en/products';
import shippingEN from './locales/en/shipping';
import customersEN from './locales/en/customers';

import commonVI from './locales/vi/common';
import ordersVI from './locales/vi/orders';
import inventoryVI from './locales/vi/inventory';
import productsVI from './locales/vi/products';
import shippingVI from './locales/vi/shipping';
import customersVI from './locales/vi/customers';

export const defaultNS = 'common';

export const resources = {
  en: {
    common: commonEN,
    orders: ordersEN,
    inventory: inventoryEN,
    products: productsEN,
    shipping: shippingEN,
    customers: customersEN,
  },
  vi: {
    common: commonVI,
    orders: ordersVI,
    inventory: inventoryVI,
    products: productsVI,
    shipping: shippingVI,
    customers: customersVI,
  },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    fallbackLng: 'en',
    lng: 'en',
    
    debug: false,
    
    interpolation: {
      escapeValue: false,
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    
    react: {
      useSuspense: false,
    },
  });

export default i18n;
