import i18n from '@/i18n/i18n';

/**
 * Hook to get the current language
 * 
 * NOTE: Language synchronization is now handled by LocalizationContext
 * which is the SINGLE source of truth for language changes.
 * 
 * Priority: User's preferredLanguage > Global defaultLanguage > 'en'
 * 
 * This hook is kept for backward compatibility and to provide
 * access to the current language without causing any side effects.
 */
export function useLanguageSync() {
  return { currentLanguage: i18n.language };
}
