import { useState, useEffect, useRef } from 'react';

interface ScrollState {
  scrollDir: 'up' | 'down' | 'none';
  isPastThreshold: boolean;
  isAtTop: boolean;
}

export function useScrollDirection(
  topThreshold = 24,
  collapseThreshold = 96
): ScrollState {
  const [state, setState] = useState<ScrollState>({
    scrollDir: 'none',
    isPastThreshold: false,
    isAtTop: true,
  });
  
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const isAtTop = currentScrollY < topThreshold;
          const isPastThreshold = currentScrollY > collapseThreshold;
          
          let scrollDir: 'up' | 'down' | 'none' = 'none';
          
          if (currentScrollY > lastScrollY.current && isPastThreshold) {
            scrollDir = 'down';
          } else if (currentScrollY < lastScrollY.current) {
            scrollDir = 'up';
          }
          
          // Only update state if something changed
          setState(prev => {
            if (
              prev.scrollDir !== scrollDir ||
              prev.isPastThreshold !== isPastThreshold ||
              prev.isAtTop !== isAtTop
            ) {
              return { scrollDir, isPastThreshold, isAtTop };
            }
            return prev;
          });
          
          lastScrollY.current = currentScrollY;
          ticking.current = false;
        });
        
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [topThreshold, collapseThreshold]);

  return state;
}
