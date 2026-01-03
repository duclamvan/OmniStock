import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const APP_NAME = 'Davie Supply';

export function usePageTitle(titleKey: string, defaultTitle: string, dynamicValue?: string) {
  const { t } = useTranslation();
  
  useEffect(() => {
    const translatedTitle = t(titleKey, defaultTitle);
    const fullTitle = dynamicValue 
      ? `${translatedTitle}: ${dynamicValue} | ${APP_NAME}`
      : `${translatedTitle} | ${APP_NAME}`;
    document.title = fullTitle;
    
    return () => {
      document.title = APP_NAME;
    };
  }, [titleKey, defaultTitle, dynamicValue, t]);
}
