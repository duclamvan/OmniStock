import { useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import i18n from '@/i18n/i18n';

const LANGUAGE_STORAGE_KEY = 'app_language';

/**
 * Hook to synchronize the app language with the settings context
 * This ensures that when the user changes their language preference,
 * the i18n system updates accordingly
 */
export function useLanguageSync() {
  const settingsContext = useSettings();
  
  // Always destructure to avoid conditional hook calls
  const generalSettings = settingsContext?.generalSettings;
  const isLoading = settingsContext?.isLoading ?? true;

  // Single unified effect for language synchronization
  useEffect(() => {
    let targetLanguage: string | null = null;
    
    // Priority 1: Check generalSettings (when loaded and available)
    if (!isLoading && generalSettings?.defaultLanguage) {
      targetLanguage = generalSettings.defaultLanguage;
    } 
    // Priority 2: Check localStorage (fallback when settings not loaded)
    else {
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
  }, [generalSettings?.defaultLanguage, isLoading]);

  return { currentLanguage: i18n.language };
}
