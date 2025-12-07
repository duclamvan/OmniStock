import { useEffect } from "react";

export function usePageTitle(title: string | undefined) {
  useEffect(() => {
    if (title) {
      document.title = `WMS Davie - ${title}`;
    } else {
      document.title = "WMS Davie";
    }
    
    return () => {
      document.title = "WMS Davie";
    };
  }, [title]);
}
