import { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrollToTopProps {
  threshold?: number;
  className?: string;
}

export function ScrollToTop({ threshold = 300, className }: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsVisible(scrollY > threshold);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

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
        "bg-primary hover:bg-primary/90",
        "shadow-lg",
        "text-primary-foreground",
        "rounded-full",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        "bottom-6 right-4 sm:bottom-8 sm:right-6",
        "h-11 w-11 sm:h-12 sm:w-12",
        isVisible 
          ? "opacity-100 translate-y-0 pointer-events-auto" 
          : "opacity-0 translate-y-4 pointer-events-none",
        className
      )}
    >
      <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
    </button>
  );
}
