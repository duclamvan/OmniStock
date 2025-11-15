/**
 * i18n barrel file for tree-shakeable imports
 * 
 * Usage:
 * import { useTranslation } from '@/i18n';
 * 
 * const { t } = useTranslation('common');
 * const text = t('save'); // Returns "Save" or "Lưu" based on language
 */

export { default as i18n, resources, defaultNS } from './i18n';
export { useTranslation, Trans, I18nextProvider } from 'react-i18next';
