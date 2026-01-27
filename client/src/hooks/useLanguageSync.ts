import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import i18n from '@/i18n/i18n';

/**
 * Hook to synchronize the app language with the user's preferred language
 * User's profile setting ALWAYS takes priority over localStorage
 */
export function useLanguageSync() {
  const { user, isLoading } = useAuth();

  // Apply user's preferred language once user is loaded
  useEffect(() => {
    // Only act once user data is loaded
    if (isLoading) return;
    
    // If user has a preferred language set, ALWAYS use it (overrides localStorage)
    if (user?.preferredLanguage && (user.preferredLanguage === 'en' || user.preferredLanguage === 'vi')) {
      const targetLanguage = user.preferredLanguage;
      
      // Apply the language if different from current
      if (i18n.language !== targetLanguage) {
        i18n.changeLanguage(targetLanguage);
      }
      
      // Sync to localStorage (both keys for compatibility)
      try {
        localStorage.setItem('app_language', targetLanguage);
        localStorage.setItem('i18nextLng', targetLanguage);
      } catch (error) {
        console.error('Failed to save language to localStorage:', error);
      }
    }
  }, [user?.preferredLanguage, isLoading]);

  return { currentLanguage: i18n.language };
}
