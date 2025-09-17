import { useLocation } from 'wouter';
import { useEffect, useRef } from 'react';

// Global map to store scroll positions for each route
const scrollPositions = new Map<string, number>();

/**
 * Custom hook to restore scroll position when navigating back
 * Automatically saves scroll position when leaving a page
 * and restores it when returning to that page
 */
export const useScrollRestoration = () => {
  const [location] = useLocation();
  const previousLocation = useRef<string>();
  const isRestoringRef = useRef(false);
  
  useEffect(() => {
    // Save scroll position of previous location
    if (previousLocation.current && !isRestoringRef.current) {
      scrollPositions.set(previousLocation.current, window.scrollY);
    }
    
    // Check if we have a saved position for this location
    const savedPosition = scrollPositions.get(location);
    
    if (savedPosition !== undefined && savedPosition > 0) {
      // Restore scroll position
      isRestoringRef.current = true;
      
      // Use requestAnimationFrame to ensure content is rendered
      requestAnimationFrame(() => {
        window.scrollTo({
          top: savedPosition,
          behavior: 'instant'
        });
        
        // Reset flag after restoration
        setTimeout(() => {
          isRestoringRef.current = false;
        }, 100);
      });
    } else if (!isRestoringRef.current) {
      // Scroll to top for new navigation (not a restoration)
      window.scrollTo({
        top: 0,
        behavior: 'instant'
      });
    }
    
    previousLocation.current = location;
  }, [location]);
  
  // Save scroll position on scroll (debounced)
  useEffect(() => {
    let scrollTimer: NodeJS.Timeout;
    
    const handleScroll = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        if (!isRestoringRef.current && location) {
          scrollPositions.set(location, window.scrollY);
        }
      }, 100);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Save position before unmount
    return () => {
      clearTimeout(scrollTimer);
      window.removeEventListener('scroll', handleScroll);
      if (location && !isRestoringRef.current) {
        scrollPositions.set(location, window.scrollY);
      }
    };
  }, [location]);
  
  // Save scroll position when page is about to unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (location) {
        scrollPositions.set(location, window.scrollY);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [location]);
};

// Helper to manually save current scroll position
export const saveCurrentScrollPosition = (path?: string) => {
  const currentPath = path || window.location.pathname;
  scrollPositions.set(currentPath, window.scrollY);
};

// Helper to clear saved positions (useful for logout or reset)
export const clearScrollPositions = () => {
  scrollPositions.clear();
};

// Helper to get saved position for a specific path
export const getSavedScrollPosition = (path: string): number | undefined => {
  return scrollPositions.get(path);
};