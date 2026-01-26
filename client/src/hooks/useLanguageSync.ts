import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import i18n from '@/i18n/i18n';

const LANGUAGE_STORAGE_KEY = 'app_language';

/**
 * Hook to synchronize the app language with the user's preferred language
 * This ensures that when the user logs in, their language preference is applied
 */
export function useLanguageSync() {
  const { user, isLoading } = useAuth();

  // Single unified effect for language synchronization
  useEffect(() => {
    let targetLanguage: string | null = null;
    
    // Priority 1: Check user's preferred language (per-user setting)
    if (!isLoading && user?.preferredLanguage) {
      targetLanguage = user.preferredLanguage;
    } 
    // Priority 2: Check localStorage (fallback when user not loaded)
    else if (!isLoading) {
      try {
        const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'vi')) {
          targetLanguage = savedLanguage;
        }
      } catch (error) {
        console.error('Failed to read language from localStorage:', error);
      }
    }
    
    // Apply the language change if we have a valid target and it's different
    if (targetLanguage && i18n.language !== targetLanguage) {
      try {
        i18n.changeLanguage(targetLanguage);
        // Persist to localStorage for next load
        localStorage.setItem(LANGUAGE_STORAGE_KEY, targetLanguage);
      } catch (error) {
        console.error('Failed to change language:', error);
      }
    }
  }, [user?.preferredLanguage, isLoading]);

  return { currentLanguage: i18n.language };
}
