import { useEffect } from 'react';

export function usePageTitle(title: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `WMS Davie - ${title}` : 'WMS Davie';
    
    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}
