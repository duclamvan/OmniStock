import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, Bell, Sun, Moon, User, Settings, LogOut, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from '@/components/GlobalSearch';
import { cn } from '@/lib/utils';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { useQuery } from '@tanstack/react-query';
import logoPath from '@assets/logo_1754349267160.png';

interface MobileHeaderProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  navContent: React.ReactNode;
  dueTicketsCount: number;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
}

export function MobileHeader({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  navContent,
  dueTicketsCount,
  isDarkMode,
  setIsDarkMode,
}: MobileHeaderProps) {
  const [location] = useLocation();
  const { scrollDir, isPastThreshold, isAtTop } = useScrollDirection();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);
  
  // Fetch unread notifications count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  const unreadCount = unreadData?.count || 0;
  
  // Determine if header should be collapsed
  const isCollapsed = scrollDir === 'down' && isPastThreshold && !isAtTop && !isSearchExpanded;
  
  // Hide header during active pick/pack mode
  const shouldHideHeader = location.includes('/orders/pick-pack') && 
    sessionStorage.getItem('pickpack-active-mode') === 'true';
  
  // Track breakpoint changes
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Update CSS variable for dynamic padding (mobile only)
  useEffect(() => {
    if (!isMobile) return; // Don't update on desktop - let MobileResponsiveLayout handle it
    
    if (shouldHideHeader) {
      document.documentElement.style.setProperty('--mobile-header-height-current', '0px');
    } else if (isCollapsed && !isSearchExpanded) {
      document.documentElement.style.setProperty('--mobile-header-height-current', 'var(--mobile-header-height-collapsed)');
    } else {
      document.documentElement.style.setProperty('--mobile-header-height-current', 'var(--mobile-header-height-expanded)');
    }
  }, [isMobile, shouldHideHeader, isCollapsed, isSearchExpanded]);
    
  if (shouldHideHeader) return null;

  return (
    <header
      className={cn(
        "lg:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-700 transition-all duration-300",
        isCollapsed && !isSearchExpanded ? "shadow-sm dark:shadow-gray-900/50" : ""
      )}
      style={{
        height: isCollapsed && !isSearchExpanded 
          ? 'var(--mobile-header-height-collapsed)' 
          : 'var(--mobile-header-height-expanded)',
        paddingTop: 'env(safe-area-inset-top)',
      }}
      data-testid="mobile-header"
    >
      <div className="h-full flex items-center justify-between px-3 transition-all duration-300">
        {/* Left: Logo + Menu */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="touch-target h-10 w-10 hover:bg-gray-100 dark:hover:bg-gray-800"
                data-testid="button-mobile-menu"
              >
                <Menu className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col h-full bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Menu</h2>
              </div>
              <div className="overflow-y-auto flex-1">
                {navContent}
              </div>
            </SheetContent>
          </Sheet>
          
          <Link href="/">
            <img 
              src={logoPath} 
              alt="Davie Professional" 
              className={cn(
                "transition-all duration-300",
                isCollapsed && !isSearchExpanded ? "h-6" : "h-8"
              )} 
            />
          </Link>
        </div>

        {/* Center: Search (expandable) */}
        <div className={cn(
          "mx-2 flex items-center justify-center transition-all duration-300",
          isCollapsed && !isSearchExpanded ? "flex-1" : "flex-1 min-w-0"
        )}>
          {isCollapsed && !isSearchExpanded ? (
            // Collapsed: Show search button
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSearchExpanded(true)}
              className="h-8 px-3 gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              data-testid="button-expand-search"
            >
              <Search className="h-4 w-4 text-gray-700 dark:text-gray-300" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Search</span>
            </Button>
          ) : (
            // Expanded: Show full search input - constrained to not overflow
            <div className="w-full max-w-[200px] sm:max-w-xs transition-all duration-300">
              <GlobalSearch 
                onFocus={() => setIsSearchExpanded(true)}
                onBlur={() => setIsSearchExpanded(false)}
                autoFocus={isSearchExpanded && (isCollapsed || !isAtTop)}
              />
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Notifications */}
          <Link href="/notifications">
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative h-10 w-10 hover:bg-gray-100 dark:hover:bg-gray-800"
              data-testid="button-notifications"
            >
              <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 dark:bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-semibold shadow-sm">
                  {unreadCount}
                </span>
              )}
            </Button>
          </Link>

          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsDarkMode(!isDarkMode);
              if (isDarkMode) {
                document.documentElement.classList.remove('dark');
              } else {
                document.documentElement.classList.add('dark');
              }
            }}
            className="h-10 w-10 hover:bg-gray-100 dark:hover:bg-gray-800"
            data-testid="button-dark-mode"
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5 text-orange-500 dark:text-orange-400" />
            ) : (
              <Moon className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 hover:bg-gray-100 dark:hover:bg-gray-800"
                data-testid="button-user-menu"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 dark:from-cyan-600 dark:to-blue-700 flex items-center justify-center shadow-sm">
                  <User className="h-4 w-4 text-white" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">ronak_03</p>
                  <p className="text-xs text-muted-foreground dark:text-gray-400">admin@daviesupply.com</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
              <Link href="/profile">
                <DropdownMenuItem className="hover:bg-gray-100 dark:hover:bg-gray-700">
                  <User className="mr-2 h-4 w-4 text-gray-700 dark:text-gray-300" />
                  <span className="text-gray-900 dark:text-gray-100">My Profile</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/settings">
                <DropdownMenuItem className="hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Settings className="mr-2 h-4 w-4 text-gray-700 dark:text-gray-300" />
                  <span className="text-gray-900 dark:text-gray-100">Settings</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
              <DropdownMenuItem className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
