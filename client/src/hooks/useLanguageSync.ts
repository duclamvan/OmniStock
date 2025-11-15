import { useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import i18n from '@/i18n/i18n';

/**
 * Hook to synchronize the app language with the settings context
 * This ensures that when the user changes their language preference,
 * the i18n system updates accordingly
 * 
 * FIXED: Added guard to handle undefined context and prevent errors
 */
export function useLanguageSync() {
  const settingsContext = useSettings();
  
  // Guard against undefined context (defensive programming)
  if (!settingsContext) {
    console.warn('useLanguageSync: SettingsContext is undefined. Hook may be called before SettingsProvider mounted.');
    return { currentLanguage: i18n.language };
  }
  
  const { generalSettings, isLoading } = settingsContext;

  useEffect(() => {
    // Ensure we have valid settings before attempting to sync
    if (!isLoading && generalSettings?.defaultLanguage) {
      const currentLang = generalSettings.defaultLanguage;
      
      // Only change if different from current language
      if (i18n.language !== currentLang) {
        i18n.changeLanguage(currentLang);
      }
    }
  }, [generalSettings?.defaultLanguage, isLoading]);

  return { currentLanguage: i18n.language };
}
