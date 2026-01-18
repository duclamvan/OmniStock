import { useState, useEffect, useRef } from 'react';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrollToTopProps {
  threshold?: number;
  className?: string;
  fadeDelay?: number;
}

export function ScrollToTop({ threshold = 300, className, fadeDelay = 3000 }: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFaded, setIsFaded] = useState(false);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const resetFadeTimer = () => {
      setIsFaded(false);
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
      fadeTimeoutRef.current = setTimeout(() => {
        setIsFaded(true);
      }, fadeDelay);
    };

    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsVisible(scrollY > threshold);
      resetFadeTimer();
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, [threshold, fadeDelay]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      data-testid="button-scroll-to-top"
      className={cn(
        "fixed z-50 flex items-center justify-center",
        "transition-all duration-300 ease-out",
        "bg-slate-800/90 dark:bg-slate-700/90",
        "hover:bg-slate-700 dark:hover:bg-slate-600",
        "backdrop-blur-sm shadow-lg",
        "border border-slate-700/50 dark:border-slate-600/50",
        "text-white",
        "rounded-full",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
        "bottom-6 right-4 sm:bottom-8 sm:right-6",
        "h-11 w-11 sm:h-12 sm:w-12",
        isVisible 
          ? isFaded 
            ? "opacity-30 translate-y-0 pointer-events-auto hover:opacity-100" 
            : "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none",
        className
      )}
    >
      <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
    </button>
  );
}
