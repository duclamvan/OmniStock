import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, Bell, Sun, Moon, User, Settings, LogOut, Search, Languages, Package, Warehouse, Box, ShoppingCart, Truck, Users, Receipt, LayoutDashboard, ClipboardList, FileText, CreditCard, BarChart3, Archive, Tag, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
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
import { groupNotifications } from '@/lib/notificationUtils';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSettings } from '@/contexts/SettingsContext';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import logoPath from '@assets/logo_1754349267160.png';

// Helper function to get notification background icon based on action URL or type
function getNotificationIcon(actionUrl: string | null, type: string): React.ComponentType<{ className?: string }> {
  // Map action URLs to icons
  if (actionUrl) {
    if (actionUrl.includes('/receiving') || actionUrl.includes('/imports')) return Warehouse;
    if (actionUrl.includes('/order') || actionUrl.includes('/pick-pack')) return Package;
    if (actionUrl.includes('/inventory') || actionUrl.includes('/product')) return Box;
    if (actionUrl.includes('/customer')) return Users;
    if (actionUrl.includes('/shipping') || actionUrl.includes('/carrier')) return Truck;
    if (actionUrl.includes('/pos') || actionUrl.includes('/sale')) return ShoppingCart;
    if (actionUrl.includes('/invoice') || actionUrl.includes('/receipt')) return Receipt;
    if (actionUrl.includes('/dashboard')) return LayoutDashboard;
    if (actionUrl.includes('/task')) return ClipboardList;
    if (actionUrl.includes('/report')) return BarChart3;
    if (actionUrl.includes('/setting')) return Settings;
    if (actionUrl.includes('/return')) return Archive;
    if (actionUrl.includes('/discount') || actionUrl.includes('/price')) return Tag;
    if (actionUrl.includes('/payment')) return CreditCard;
    if (actionUrl.includes('/document') || actionUrl.includes('/file')) return FileText;
  }
  
  // Fall back to type-based icons
  switch (type) {
    case 'success': return CheckCircle;
    case 'error': return AlertCircle;
    case 'warning': return AlertTriangle;
    case 'info':
    default: return Info;
  }
}

interface MobileHeaderProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  navContent: React.ReactNode;
  dueTicketsCount: number;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export function MobileHeader({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  navContent,
  dueTicketsCount,
  isDarkMode,
  toggleTheme,
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
      
      // Use PATCH to update existing setting (upsert behavior)
      await apiRequest('PATCH', '/api/settings/default_language', {
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

  // Group similar notifications together
  const groupedNotifications = useMemo(() => {
    return groupNotifications(notifications);
  }, [notifications]);
  
  // Mark all notifications as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/notifications/mark-all-read', {});
      return res.json();
    },
    onSuccess: () => {
      // Immediately update cache to show badge disappear instantly
      // Do NOT invalidate queries here - that causes the blink issue
      queryClient.setQueryData(['/api/notifications/unread-count'], { count: 0 });
      
      // Also update the notifications list - mark all as read
      const currentNotifications = queryClient.getQueryData<any[]>(['/api/notifications']);
      if (currentNotifications) {
        queryClient.setQueryData(['/api/notifications'], 
          currentNotifications.map(notif => ({ ...notif, isRead: true }))
        );
      }
      // Let the 30-second refetch naturally sync with server
    },
  });

  // Track notification dropdown state
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  
  // Ref to track if there were unread notifications when dropdown opened
  const hadUnreadWhenOpenedRef = useRef(false);
  
  // Handle dropdown open/close - mark as read when CLOSING (not opening)
  const handleNotificationDropdownChange = useCallback((open: boolean) => {
    setNotificationDropdownOpen(open);
    
    if (open) {
      // Dropdown just opened - remember if there were unread notifications
      hadUnreadWhenOpenedRef.current = unreadCount > 0;
    } else {
      // Dropdown is closing - mark as read if there were unread when opened
      if (hadUnreadWhenOpenedRef.current) {
        markAllAsReadMutation.mutate();
        hadUnreadWhenOpenedRef.current = false;
      }
    }
  }, [unreadCount, markAllAsReadMutation]);
  
  // Determine if header should be collapsed
  const isCollapsed = scrollDir === 'down' && isPastThreshold && !isAtTop && !isSearchExpanded;
  
  // Hide header during active pick/pack mode - track with state for reactivity
  const [pickpackModeActive, setPickpackModeActive] = useState(() => 
    sessionStorage.getItem('pickpack-active-mode') === 'true'
  );
  
  // Listen for pickpack mode changes (custom event from PickPack component)
  useEffect(() => {
    const handlePickpackModeChange = () => {
      const isActive = sessionStorage.getItem('pickpack-active-mode') === 'true';
      setPickpackModeActive(isActive);
    };
    
    // Check initial state
    handlePickpackModeChange();
    
    // Listen for custom event from PickPack
    window.addEventListener('pickpack-mode-changed', handlePickpackModeChange);
    
    // Also check on route changes
    handlePickpackModeChange();
    
    return () => {
      window.removeEventListener('pickpack-mode-changed', handlePickpackModeChange);
    };
  }, [location]); // Re-check when location changes
  
  const shouldHideHeader = location.includes('/orders/pick-pack') && pickpackModeActive;
  
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
        "lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-700 transition-all duration-300",
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
      <div className="h-full flex items-center justify-between px-2 transition-all duration-300">
        {/* Left: Logo + Menu */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="touch-target h-9 w-9 hover:bg-gray-100 dark:hover:bg-gray-800"
                data-testid="button-mobile-menu"
              >
                <Menu className="h-4 w-4 text-gray-700 dark:text-gray-300" />
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
                isCollapsed && !isSearchExpanded ? "h-5" : "h-6"
              )} 
            />
          </Link>
        </div>

        {/* Center: Search (expandable) */}
        <div className={cn(
          "mx-1 flex items-center justify-center transition-all duration-300",
          isCollapsed && !isSearchExpanded ? "flex-1" : "flex-1 min-w-0"
        )}>
          {isCollapsed && !isSearchExpanded ? (
            // Collapsed: Show search button
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSearchExpanded(true)}
              className="h-8 px-3 gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex-1 max-w-[120px]"
              data-testid="button-expand-search"
            >
              <Search className="h-4 w-4 text-gray-700 dark:text-gray-300" />
              <span className="hidden sm:inline text-xs text-gray-700 dark:text-gray-300">{t('common:search')}</span>
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
          <DropdownMenu open={notificationDropdownOpen} onOpenChange={handleNotificationDropdownChange}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative h-9 w-9 hover:bg-gray-100 dark:hover:bg-gray-800"
                data-testid="button-notifications"
              >
                <Bell className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 dark:bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-semibold shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[calc(100vw-1rem)] max-w-80 bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{t('common:notifications')}</span>
                  {unreadCount > 0 && (
                    <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                      {t('common:newNotifications', { count: unreadCount })}
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
              
              {/* Recent Notifications (max 5 groups) */}
              <div className="max-h-96 overflow-y-auto">
                {groupedNotifications && groupedNotifications.length > 0 ? (
                  <>
                    {groupedNotifications.slice(0, 5).map((group) => {
                      const BackgroundIcon = getNotificationIcon(group.actionUrl, group.type);
                      return (
                        <DropdownMenuItem 
                          key={group.key}
                          className={cn(
                            "flex flex-col items-start p-3 cursor-pointer relative",
                            group.hasUnread 
                              ? "bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 focus:bg-blue-100 dark:focus:bg-blue-900/50" 
                              : "bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700"
                          )}
                          data-testid={`notification-group-${group.latestNotificationId}`}
                        >
                          {/* Faded background icon - positioned inside bounds */}
                          <BackgroundIcon className={cn(
                            "absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 pointer-events-none opacity-30",
                            group.hasUnread
                              ? "text-blue-300 dark:text-blue-700"
                              : "text-gray-200 dark:text-gray-600"
                          )} />
                          
                          <div className="flex items-start gap-2 w-full relative z-10 pr-10">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={cn(
                                  "text-sm truncate",
                                  group.hasUnread 
                                    ? "font-semibold text-blue-900 dark:text-blue-100" 
                                    : "font-medium text-gray-900 dark:text-gray-100"
                                )}>
                                  {group.title}
                                </p>
                                {group.count > 1 && (
                                  <span className={cn(
                                    "text-xs px-1.5 py-0.5 rounded-full flex-shrink-0",
                                    group.hasUnread 
                                      ? "bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 font-semibold" 
                                      : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                                  )}>
                                    ×{group.count}
                                  </span>
                                )}
                              </div>
                              {group.description && (
                                <p className={cn(
                                  "text-xs mt-0.5 line-clamp-2",
                                  group.hasUnread 
                                    ? "text-blue-700 dark:text-blue-300" 
                                    : "text-gray-600 dark:text-gray-400"
                                )}>
                                  {group.description}
                                </p>
                              )}
                              <p className={cn(
                                "text-xs mt-1",
                                group.hasUnread 
                                  ? "text-blue-600 dark:text-blue-400" 
                                  : "text-gray-500 dark:text-gray-500"
                              )}>
                                {group.latestCreatedAt.toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            {group.hasUnread && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 h-2 w-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" />
                            )}
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
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
                className="h-9 w-9 hover:bg-gray-100 dark:hover:bg-gray-800"
                data-testid="button-user-menu"
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 dark:from-cyan-600 dark:to-blue-700 flex items-center justify-center shadow-sm">
                  <User className="h-3.5 w-3.5 text-white" />
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
                onClick={toggleTheme}
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
              <DropdownMenuItem 
                onClick={() => {
                  window.location.href = '/api/logout';
                }}
                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                data-testid="button-logout"
              >
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
