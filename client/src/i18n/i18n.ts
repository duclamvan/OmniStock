import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import commonEN from './locales/en/common';
import ordersEN from './locales/en/orders';
import inventoryEN from './locales/en/inventory';
import productsEN from './locales/en/products';
import shippingEN from './locales/en/shipping';
import customersEN from './locales/en/customers';
import settingsEN from './locales/en/settings';
import warehouseEN from './locales/en/warehouse';
import financialEN from './locales/en/financial';
import reportsEN from './locales/en/reports';
import systemEN from './locales/en/system';
import discountsEN from './locales/en/discounts';
import importsEN from './locales/en/imports';
import dashboardEN from './locales/en/dashboard';

import commonVI from './locales/vi/common';
import ordersVI from './locales/vi/orders';
import inventoryVI from './locales/vi/inventory';
import productsVI from './locales/vi/products';
import shippingVI from './locales/vi/shipping';
import customersVI from './locales/vi/customers';
import settingsVI from './locales/vi/settings';
import warehouseVI from './locales/vi/warehouse';
import financialVI from './locales/vi/financial';
import reportsVI from './locales/vi/reports';
import systemVI from './locales/vi/system';
import discountsVI from './locales/vi/discounts';
import importsVI from './locales/vi/imports';
import dashboardVI from './locales/vi/dashboard';

export const defaultNS = 'common';

export const resources = {
  en: {
    common: commonEN,
    orders: ordersEN,
    inventory: inventoryEN,
    products: productsEN,
    shipping: shippingEN,
    customers: customersEN,
    settings: settingsEN,
    warehouse: warehouseEN,
    financial: financialEN,
    reports: reportsEN,
    system: systemEN,
    discounts: discountsEN,
    imports: importsEN,
    dashboard: dashboardEN,
  },
  vi: {
    common: commonVI,
    orders: ordersVI,
    inventory: inventoryVI,
    products: productsVI,
    shipping: shippingVI,
    customers: customersVI,
    settings: settingsVI,
    warehouse: warehouseVI,
    financial: financialVI,
    reports: reportsVI,
    system: systemVI,
    discounts: discountsVI,
    imports: importsVI,
    dashboard: dashboardVI,
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
