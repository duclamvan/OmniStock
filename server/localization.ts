import en from './locales/en.json';
import vi from './locales/vi.json';

type Language = 'en' | 'vi';

interface LocalizationDict {
  [key: string]: string | { [key: string]: string };
}

const translations: Record<Language, LocalizationDict> = {
  en,
  vi,
};

export class Localization {
  private lang: Language = 'en';

  setLanguage(lang: Language) {
    if (lang === 'en' || lang === 'vi') {
      this.lang = lang;
    }
  }

  getLanguage(): Language {
    return this.lang;
  }

  /**
   * Get translated string by dot notation key
   * Example: t('orders.pending') -> 'Pending' (en) or 'Chờ xử lý' (vi)
   */
  t(key: string): string {
    const keys = key.split('.');
    let current: any = translations[this.lang];

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        // Fallback to English if key not found
        current = translations['en'];
        for (const fallbackK of keys) {
          if (current && typeof current === 'object' && fallbackK in current) {
            current = current[fallbackK];
          } else {
            return key; // Return key if not found in any language
          }
        }
        return current;
      }
    }

    return typeof current === 'string' ? current : key;
  }

  /**
   * Translate an object recursively
   * Useful for API responses
   */
  translateObject(obj: any, keyMap: Record<string, string>): any {
    if (typeof obj !== 'object' || obj === null) return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.translateObject(item, keyMap));
    }

    const translated: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const translationKey = keyMap[key];
      if (translationKey) {
        translated[key] = this.t(translationKey);
      } else {
        // Recursively translate nested objects
        if (typeof value === 'object' && value !== null) {
          translated[key] = this.translateObject(value, keyMap);
        } else {
          translated[key] = value;
        }
      }
    }
    return translated;
  }

  /**
   * Get all translations for a section
   * Example: getSection('orders') -> all order-related translations
   */
  getSection(section: string): Record<string, string> {
    const sectionTranslations = translations[this.lang][section];
    if (typeof sectionTranslations === 'object') {
      return sectionTranslations as Record<string, string>;
    }
    return {};
  }
}

// Export singleton instance
export const localization = new Localization();
