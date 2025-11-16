import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, Bell, Sun, Moon, User, Settings, LogOut, Search, Languages } from 'lucide-react';
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
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSettings } from '@/contexts/SettingsContext';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
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
  const { toast } = useToast();
  const { generalSettings } = useSettings();
  const { i18n, t } = useTranslation();
  const { user } = useAuth();
  
  // Language toggle mutation
  const languageMutation = useMutation({
    mutationFn: async (newLang: 'en' | 'vi') => {
      // CRITICAL FIX: Immediately change UI language BEFORE persisting to backend
      await i18n.changeLanguage(newLang);
      
      // Then persist to backend
      await apiRequest('POST', '/api/settings', {
        key: 'default_language',
        value: newLang,
        category: 'general'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: t('common:success'),
        description: t('common:languageChanged'),
      });
    },
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('common:languageChangeFailed'),
        variant: 'destructive',
      });
    },
  });
  
  // Fetch unread notifications count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  const unreadCount = unreadData?.count || 0;
  
  // Fetch recent notifications for dropdown
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ['/api/notifications'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
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
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('common:menu')}</h2>
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
              <span className="text-sm text-gray-700 dark:text-gray-300">{t('common:search')}</span>
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
          {/* Notifications Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
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
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('common:notifications')}</span>
                  {unreadCount > 0 && (
                    <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                      {t('common:newNotifications', { count: unreadCount })}
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
              
              {/* Recent Notifications (max 5) */}
              <div className="max-h-96 overflow-y-auto">
                {notifications && notifications.length > 0 ? (
                  <>
                    {notifications.slice(0, 5).map((notification: any) => (
                      <DropdownMenuItem 
                        key={notification.id}
                        className="flex flex-col items-start p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700"
                        data-testid={`notification-item-${notification.id}`}
                      >
                        <div className="flex items-start gap-2 w-full">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {notification.title}
                            </p>
                            {notification.description && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                                {notification.description}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {new Date(notification.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <div className="h-2 w-2 bg-blue-500 dark:bg-blue-400 rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('common:noNotifications')}</p>
                  </div>
                )}
              </div>
              
              {/* View All Link */}
              {notifications && notifications.length > 0 && (
                <>
                  <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
                  <Link href="/notifications">
                    <DropdownMenuItem 
                      className="justify-center text-blue-600 dark:text-blue-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                      data-testid="link-notifications-view-all"
                    >
                      {t('common:viewAllNotifications')}
                    </DropdownMenuItem>
                  </Link>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

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
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground dark:text-gray-400">{user?.email || ''}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
              <Link href="/profile">
                <DropdownMenuItem className="hover:bg-gray-100 dark:hover:bg-gray-700">
                  <User className="mr-2 h-4 w-4 text-gray-700 dark:text-gray-300" />
                  <span className="text-gray-900 dark:text-gray-100">{t('common:profile')}</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/user-settings">
                <DropdownMenuItem className="hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Settings className="mr-2 h-4 w-4 text-gray-700 dark:text-gray-300" />
                  <span className="text-gray-900 dark:text-gray-100">{t('common:settings')}</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem 
                onClick={() => {
                  setIsDarkMode(!isDarkMode);
                  if (isDarkMode) {
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                }}
                className="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                {isDarkMode ? (
                  <>
                    <Sun className="mr-2 h-4 w-4 text-orange-500 dark:text-orange-400" />
                    <span className="text-gray-900 dark:text-gray-100">{t('common:lightMode')}</span>
                  </>
                ) : (
                  <>
                    <Moon className="mr-2 h-4 w-4 text-slate-700 dark:text-slate-300" />
                    <span className="text-gray-900 dark:text-gray-100">{t('common:darkMode')}</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  const newLang = i18n.language === 'en' ? 'vi' : 'en';
                  languageMutation.mutate(newLang);
                }}
                className="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                data-testid="button-toggle-language"
              >
                <Languages className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-gray-900 dark:text-gray-100">
                  {i18n.language === 'en' ? 'Tiếng Việt' : 'English'}
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
              <DropdownMenuItem className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t('common:logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
