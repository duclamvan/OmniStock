import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Warehouse, 
  Tag, 
  Users, 
  BarChart3, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Bell,
  Sun,
  Moon,
  User,
  Settings,
  LogOut,
  Receipt,
  CreditCard,
  Truck,
  RotateCcw,
  DollarSign,
  Store,
  Globe,
  PackageCheck,
  Building2,
  Percent,
  UserCheck,
  Building,
  RefreshCw,
  Calculator,
  ShoppingBag,
  Import,
  ClipboardCheck,
  Boxes,
  Send,
  FileText,
  Wrench,
  Ticket,
  Briefcase,
  Languages,
  ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import logoPath from '@assets/logo_1754349267160.png';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from '@/components/GlobalSearch';
import { MobileHeader } from '@/components/MobileHeader';
import { ChevronRight as BreadcrumbChevron, Home } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth.tsx';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/components/ThemeProvider';

interface MobileResponsiveLayoutProps {
  children: React.ReactNode;
  layoutWidth?: 'default' | 'full';
  noPadding?: boolean;
}

// Defensive helpers for localStorage with error handling and type validation
function getLocalStorageArray<T = string>(key: string, defaultValue: T[] = []): T[] {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    
    const parsed = JSON.parse(item);
    
    // Validate that parsed value is actually an array
    if (!Array.isArray(parsed)) {
      console.warn(`localStorage key "${key}" is not an array, falling back to default`);
      localStorage.removeItem(key);
      return defaultValue;
    }
    
    return parsed as T[];
  } catch (error) {
    console.warn(`Failed to parse localStorage key "${key}":`, error);
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore errors when clearing
    }
    return defaultValue;
  }
}

function getLocalStorageBoolean(key: string, defaultValue: boolean): boolean {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    
    const parsed = JSON.parse(item);
    
    // Validate that parsed value is actually a boolean
    if (typeof parsed !== 'boolean') {
      console.warn(`localStorage key "${key}" is not a boolean, falling back to default`);
      localStorage.removeItem(key);
      return defaultValue;
    }
    
    return parsed;
  } catch (error) {
    console.warn(`Failed to parse localStorage key "${key}":`, error);
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore errors when clearing
    }
    return defaultValue;
  }
}

function setLocalStorageItem(key: string, value: any): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to save localStorage key "${key}":`, error);
  }
}

function getLocalStorageNumber(key: string, defaultValue: number): number {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    
    const parsed = parseFloat(item);
    
    // Validate that parsed value is actually a number
    if (isNaN(parsed)) {
      console.warn(`localStorage key "${key}" is not a valid number, falling back to default`);
      localStorage.removeItem(key);
      return defaultValue;
    }
    
    return parsed;
  } catch (error) {
    console.warn(`Failed to parse localStorage number key "${key}":`, error);
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore errors when clearing
    }
    return defaultValue;
  }
}

// Helper to check if current path matches a nav item (prefix matching for parent sections)
function isPathActive(currentPath: string, itemPath: string): boolean {
  if (itemPath === '/') {
    return currentPath === '/';
  }
  return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
}

// Helper for exact path matching (used for child menu items)
function isPathExactActive(currentPath: string, itemPath: string): boolean {
  return currentPath === itemPath;
}

export function MobileResponsiveLayout({ children, layoutWidth = 'default', noPadding = false }: MobileResponsiveLayoutProps) {
  const [location] = useLocation();
  const { user, isAdministrator, isWarehouseOperator } = useAuth();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const desktopNavRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const scrollPosition = useRef(0);
  const itemRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const [openItems, setOpenItems] = useState<string[]>(() => 
    getLocalStorageArray<string>('sidebarOpenItems', [])
  );
  const [openSections, setOpenSections] = useState<string[]>(() => 
    getLocalStorageArray<string>('sidebarOpenSections', ['Warehouse Operations', 'Admin & Management'])
  );
  
  // Language toggle mutation
  const languageMutation = useMutation({
    mutationFn: async (newLang: 'en' | 'vi') => {
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
  
  // Set CSS variable to 0px on desktop to prevent padding override
  useEffect(() => {
    const updateHeaderHeight = () => {
      const isDesktop = window.innerWidth >= 1024;
      if (isDesktop) {
        document.documentElement.style.setProperty('--mobile-header-height-current', '0px');
      }
      // Mobile header will set its own value via MobileHeader component
    };
    
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, []);
  
  // Fetch tickets to count due/overdue notifications
  const { data: tickets = [] } = useQuery<any[]>({
    queryKey: ['/api/tickets'],
  });
  
  // Calculate due tickets count
  const dueTicketsCount = tickets.filter((ticket: any) => {
    if (!ticket.notifyDate || ticket.status === 'closed') return false;
    const notifyDate = new Date(ticket.notifyDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return notifyDate <= today;
  }).length;
  const { isDarkMode, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const previousLocation = useRef(location);
  const [isCollapsed, setIsCollapsed] = useState(() => 
    getLocalStorageBoolean('sidebarCollapsed', false)
  );
  
  // Fetch pre-orders to count fully arrived ones
  const { data: preOrders } = useQuery<any[]>({
    queryKey: ['/api/pre-orders'],
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: false, // Don't retry on error
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce errors
  });

  const fullyArrivedCount = preOrders?.filter(po => po.status === 'fully_arrived').length || 0;

  // Fetch all orders to show counts in submenus
  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ['/api/orders'],
  });

  // Calculate order counts for each submenu
  const allOrdersCount = orders.length;
  const toFulfillCount = orders.filter((o: any) => o.status === 'pending' || o.status === 'processing').length;
  const shippedCount = orders.filter((o: any) => o.status === 'shipped' || o.status === 'delivered').length;
  const payLaterCount = orders.filter((o: any) => o.paymentStatus === 'pay_later' && o.status !== 'delivered').length;
  const preOrdersCount = preOrders?.length || 0;

  useEffect(() => {
    setLocalStorageItem('sidebarCollapsed', isCollapsed);
  }, [isCollapsed]);

  // Save openItems to localStorage whenever they change
  useEffect(() => {
    setLocalStorageItem('sidebarOpenItems', openItems);
  }, [openItems]);

  // Save openSections to localStorage whenever they change
  useEffect(() => {
    setLocalStorageItem('sidebarOpenSections', openSections);
  }, [openSections]);
  

  // Save scroll position whenever user scrolls the desktop nav
  const handleDesktopScroll = (e: React.UIEvent<HTMLDivElement>) => {
    scrollPosition.current = e.currentTarget.scrollTop;
    // Store as string for number parsing (not JSON)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sidebarScrollPosition', scrollPosition.current.toString());
      } catch (error) {
        console.warn('Failed to save scroll position:', error);
      }
    }
  };

  const toggleItem = (itemName: string) => {
    setOpenItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const toggleSection = (sectionName: string) => {
    setOpenSections(prev => 
      prev.includes(sectionName) 
        ? prev.filter(name => name !== sectionName)
        : [...prev, sectionName]
    );
  };

  // Restore scroll position from localStorage on initial mount
  useLayoutEffect(() => {
    scrollPosition.current = getLocalStorageNumber('sidebarScrollPosition', 0);
  }, []);

  // Restore scroll position after state changes (location, openItems, isCollapsed)
  useLayoutEffect(() => {
    if (desktopNavRef.current) {
      desktopNavRef.current.scrollTop = scrollPosition.current;
    }
  }, [openItems, location, isCollapsed]);

  const navigation = [
    // Operational Section (Mobile-optimized for warehouse employees)
    {
      type: "section",
      name: t('common:warehouseOperations'),
      items: [
        {
          name: t('common:warehouseDashboard'),
          href: "/warehouse-dashboard",
          icon: ClipboardList,
          color: "text-cyan-600 dark:text-cyan-400",
          description: t('common:warehouseDashboardSubtitle')
        },
        {
          name: t('common:pickAndPack'),
          href: "/orders/pick-pack",
          icon: PackageCheck,
          color: "text-amber-600 dark:text-amber-400",
          description: t('common:orderFulfillment')
        },
        {
          name: t('common:receiving'),
          href: "/receiving",
          icon: ClipboardCheck,
          color: "text-violet-600 dark:text-violet-400",
          description: t('common:incomingShipments')
        },
        {
          name: t('common:stock'),
          href: "/stock",
          icon: Package,
          color: "text-indigo-600 dark:text-indigo-400",
          description: t('common:inventoryLookup')
        },
        {
          name: t('common:pos'),
          href: "/pos",
          icon: Store,
          color: "text-green-600 dark:text-green-400",
          description: t('common:pointOfSale')
        },
        {
          name: t('common:shipping'),
          icon: Send,
          color: "text-blue-500 dark:text-blue-400",
          description: t('common:outboundLogistics'),
          children: [
            { name: t('common:shippingManagement'), href: "/shipping" },
            { name: t('common:shipmentLabels'), href: "/shipping/labels" },
          ],
        },
      ]
    },
    // Admin/Management Section
    {
      type: "section",
      name: t('common:administration'),
      items: [
        {
          name: t('common:dashboard'),
          href: "/",
          icon: LayoutDashboard,
          color: "text-blue-600 dark:text-blue-400",
          description: t('common:overviewAndAnalytics')
        },
        {
          name: t('common:orders'),
          icon: ShoppingCart,
          color: "text-emerald-600 dark:text-emerald-400",
          description: t('common:orderManagement'),
          children: [
            { name: t('common:allOrders'), href: "/orders" },
            { name: t('common:addOrder'), href: "/orders/add" },
            { name: t('common:toFulfill'), href: "/orders/to-fulfill" },
            { name: t('common:shipped'), href: "/orders/shipped" },
            { name: t('common:payLater'), href: "/orders/pay-later" },
            { name: t('common:preOrders'), href: "/orders/pre-orders" },
          ],
        },
        {
          name: t('common:inventory'),
          icon: Boxes,
          color: "text-purple-600 dark:text-purple-400",
          description: t('common:productManagement'),
          children: [
            { name: t('common:allProducts'), href: "/inventory" },
            { name: t('common:categories'), href: "/inventory/categories" },
            { name: t('common:productBundles'), href: "/inventory/bundles" },
            { name: t('common:packingMaterials'), href: "/packing-materials" },
            { name: t('common:addProduct'), href: "/inventory/add" },
          ],
        },
        {
          name: t('common:warehouses'),
          icon: Building2,
          color: "text-orange-600 dark:text-orange-400",
          description: t('common:storageFacilities'),
          children: [
            { name: t('common:allWarehouses'), href: "/warehouses" },
            { name: t('common:warehouseMap'), href: "/warehouses/map" },
            { name: t('common:addWarehouse'), href: "/warehouses/add" },
          ],
        },
        {
          name: t('common:customers'),
          href: "/customers",
          icon: UserCheck,
          color: "text-indigo-600 dark:text-indigo-400",
          description: t('common:clientManagement')
        },
        {
          name: t('common:suppliers'),
          href: "/suppliers",
          icon: Building,
          color: "text-teal-600 dark:text-teal-400",
          description: t('common:vendorNetwork')
        },
        {
          name: t('common:discounts'),
          href: "/discounts",
          icon: Percent,
          color: "text-red-600 dark:text-red-400",
          description: t('common:pricingAndOffers')
        },
        {
          name: t('common:returns'),
          href: "/returns",
          icon: RefreshCw,
          color: "text-yellow-600 dark:text-yellow-400",
          description: t('common:returnProcessing')
        },
        {
          name: t('common:expenses'),
          href: "/expenses",
          icon: Calculator,
          color: "text-pink-600 dark:text-pink-400",
          description: t('common:costTracking')
        },
        {
          name: t('common:services'),
          href: "/services",
          icon: Wrench,
          color: "text-purple-600 dark:text-purple-400",
          description: t('common:repairsAndServices')
        },
        {
          name: t('common:tickets'),
          href: "/tickets",
          icon: Ticket,
          color: "text-blue-600 dark:text-blue-400",
          description: t('common:supportTickets')
        },
        {
          name: t('common:imports'),
          icon: Import,
          color: "text-cyan-600 dark:text-cyan-400",
          description: t('common:internationalOrders'),
          children: [
            { name: t('common:kanbanDashboard'), href: "/imports/kanban" },
            { name: t('common:purchaseOrders'), href: "/purchase-orders" },
            { name: t('common:consolidation'), href: "/consolidation" },
            { name: t('common:internationalTransit'), href: "/imports/international-transit" },
            { name: t('common:landingCosts'), href: "/imports/landing-costs" },
          ],
        },
        {
          name: t('common:employees'),
          href: "/employees",
          icon: Briefcase,
          color: "text-cyan-600 dark:text-cyan-400",
          description: t('common:employeeManagement')
        },
        {
          name: t('common:reports'),
          href: "/reports",
          icon: FileText,
          color: "text-gray-600 dark:text-gray-400",
          description: t('common:analyticsAndReports')
        },
        {
          name: t('common:settings'),
          icon: Settings,
          color: "text-slate-600 dark:text-slate-400",
          description: t('common:systemConfiguration'),
          children: [
            { name: t('common:general'), href: "/settings/general" },
            { name: t('common:shipping'), href: "/settings/shipping" },
            { name: t('common:orders'), href: "/settings/orders" },
            { name: t('common:financial'), href: "/settings/financial" },
            { name: t('common:inventory'), href: "/settings/inventory" },
            { name: t('common:system'), href: "/settings/system" },
            { name: t('common:roles'), href: "/settings/roles" },
          ],
        },
      ]
    }
  ];

  // Filter navigation based on user role
  const filteredNavigation = isWarehouseOperator 
    ? navigation.filter(section => section.name === "Warehouse Operations")
    : navigation; // Admins see everything

  // Automatically open parent menus when location changes (without scrolling)
  useEffect(() => {
    // Only run if location actually changed
    if (previousLocation.current === location) {
      return;
    }
    previousLocation.current = location;
    
    // Find parent menus that should be open based on current location
    const activeParentMenus: string[] = [];
    filteredNavigation.forEach(section => {
      section.items?.forEach(item => {
        if (item.children) {
          const hasActiveChild = item.children.some(child => child.href === location);
          if (hasActiveChild) {
            activeParentMenus.push(item.name);
          }
        }
      });
    });
    
    // Open parent menus if they have active children
    setOpenItems(prev => {
      const newOpenItems = new Set([...prev, ...activeParentMenus]);
      return Array.from(newOpenItems);
    });
    
    // No scrolling - sidebar stays in place
  }, [location]);

  const NavLinks = ({ collapsed = false }: { collapsed?: boolean }) => (
    <>
      {filteredNavigation.map((section, sectionIdx) => {
        const isSectionOpen = openSections.includes(section.name);
        
        return (
        <div key={section.name}>
          {/* Section Header - Collapsible */}
          {!collapsed && (
            <Collapsible
              open={isSectionOpen}
              onOpenChange={() => toggleSection(section.name)}
            >
              <div className={cn(
                sectionIdx > 0 && "mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
              )}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between px-4 py-1.5 mb-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
                  >
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {section.name}
                    </h3>
                    <ChevronDown className={cn(
                      "h-3 w-3 transition-transform duration-200 text-gray-400",
                      isSectionOpen && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
              </div>
          
          {/* Section Items */}
          <CollapsibleContent>
          {section.items?.map((item) => {
        if (item.children) {
          const isOpen = openItems.includes(item.name);
          const isActive = item.children.some(child => isPathActive(location, child.href));
          
          if (collapsed) {
            return (
              <DropdownMenu key={item.name}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-center p-3 rounded-lg transition-all duration-200 group relative",
                      "hover:bg-gray-100 dark:hover:bg-gray-800",
                      isActive && "bg-white dark:bg-slate-800 shadow-sm border border-gray-200 dark:border-gray-700"
                    )}
                  >
                    <item.icon className={cn("h-5 w-5 transition-colors", item.color)} />
                    <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 dark:bg-slate-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
                      <div className="flex flex-col">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-gray-300 dark:text-gray-400">{item.description}</span>
                      </div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="w-56 p-2">
                  <div className="px-2 py-1.5 mb-1">
                    <div className="flex items-center gap-2">
                      <item.icon className={cn("h-4 w-4", item.color)} />
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                  </div>
                  <DropdownMenuSeparator />
                  {item.children.map((child) => (
                    <Link key={child.href} href={child.href}>
                      <DropdownMenuItem className={cn(
                        "rounded-md px-3 py-2 cursor-pointer transition-colors flex items-center justify-between",
                        isPathExactActive(location, child.href) && "bg-gray-100 dark:bg-gray-800"
                      )}>
                        <span className="text-sm">{child.name}</span>
                        {child.href === '/orders/pre-orders' && fullyArrivedCount > 0 && (
                          <Badge variant="default" className="ml-2 bg-green-600 hover:bg-green-700 text-white text-xs h-5 min-w-5 px-1.5">
                            {fullyArrivedCount}
                          </Badge>
                        )}
                      </DropdownMenuItem>
                    </Link>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }
          
          return (
            <div
              key={item.name}
              ref={el => {
                if (isActive && el) {
                  itemRefs.current[item.name] = el;
                }
              }}
              className="mb-1"
            >
              <Collapsible
                open={isOpen}
                onOpenChange={() => toggleItem(item.name)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start font-medium px-4 py-3 rounded-lg touch-target transition-all duration-200",
                      "hover:bg-gray-50 dark:hover:bg-gray-800",
                      isActive && "bg-white shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700"
                    )}
                  >
                    <item.icon className={cn("mr-4 h-5 w-5 flex-shrink-0 transition-colors", item.color)} />
                    <div className="flex flex-col items-start flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{item.description}</span>
                    </div>
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform duration-200 text-gray-400 ml-auto flex-shrink-0",
                      isOpen && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1">
                  <div className="ml-8 space-y-1 border-l border-gray-200 dark:border-gray-700 pl-2">
                    {item.children.map((child) => {
                      const isChildActive = isPathExactActive(location, child.href);
                      return (
                        <div
                          key={child.href}
                          ref={el => {
                            if (isChildActive && el) {
                              itemRefs.current[`${item.name}-${child.href}`] = el;
                            }
                          }}
                        >
                          <Link href={child.href}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "w-full justify-start text-gray-900 dark:text-gray-300 px-3 py-2 rounded-md touch-target transition-colors text-sm",
                                "hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white",
                                isChildActive && "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                              )}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              <span className="flex-1 text-left">{child.name}</span>
                              {child.href === '/orders' && allOrdersCount > 0 && (
                                <Badge variant="secondary" className="ml-2 text-xs h-5 min-w-5 px-1.5">
                                  {allOrdersCount}
                                </Badge>
                              )}
                              {child.href === '/orders/to-fulfill' && toFulfillCount > 0 && (
                                <Badge variant="default" className="ml-2 bg-orange-600 hover:bg-orange-700 text-white text-xs h-5 min-w-5 px-1.5">
                                  {toFulfillCount}
                                </Badge>
                              )}
                              {child.href === '/orders/shipped' && shippedCount > 0 && (
                                <Badge variant="default" className="ml-2 bg-blue-600 hover:bg-blue-700 text-white text-xs h-5 min-w-5 px-1.5">
                                  {shippedCount}
                                </Badge>
                              )}
                              {child.href === '/orders/pay-later' && payLaterCount > 0 && (
                                <Badge variant="default" className="ml-2 bg-purple-600 hover:bg-purple-700 text-white text-xs h-5 min-w-5 px-1.5">
                                  {payLaterCount}
                                </Badge>
                              )}
                              {child.href === '/orders/pre-orders' && (preOrdersCount > 0 || fullyArrivedCount > 0) && (
                                <div className="flex gap-1 ml-2">
                                  {preOrdersCount > 0 && (
                                    <Badge variant="secondary" className="text-xs h-5 min-w-5 px-1.5">
                                      {preOrdersCount}
                                    </Badge>
                                  )}
                                  {fullyArrivedCount > 0 && (
                                    <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white text-xs h-5 min-w-5 px-1.5">
                                      {fullyArrivedCount}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </Button>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
          </div>
          );
        }

        const isActive = isPathActive(location, item.href);
        
        if (collapsed) {
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-center p-3 rounded-lg relative group transition-all duration-200",
                  "hover:bg-gray-100 dark:hover:bg-gray-800",
                  isActive && "bg-white shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className={cn("h-5 w-5 transition-colors", item.color)} />
                <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
                  <div className="flex flex-col">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-xs text-gray-300">{item.description}</span>
                  </div>
                </div>
              </Button>
            </Link>
          );
        }
        
        return (
          <div
            key={item.name}
            ref={el => {
              if (isActive && el) {
                itemRefs.current[item.name] = el;
              }
            }}
            className="mb-1"
          >
            <Link href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start font-medium px-4 py-3 rounded-lg touch-target transition-all duration-200",
                  "hover:bg-gray-50 dark:hover:bg-gray-800",
                  isActive && "bg-white shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className={cn("mr-4 h-5 w-5 flex-shrink-0 transition-colors", item.color)} />
                <div className="flex flex-col items-start flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{item.description}</span>
                </div>
                {item.name === "Tickets" && dueTicketsCount > 0 && (
                  <Badge className="bg-red-500 text-white text-xs h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center">
                    {dueTicketsCount}
                  </Badge>
                )}
              </Button>
            </Link>
          </div>
        );
      })}
          </CollapsibleContent>
            </Collapsible>
          )}
          
          {/* Section Items when collapsed - no section headers */}
          {collapsed && section.items?.map((item) => {
        if (item.children) {
          const isActive = item.children.some(child => isPathActive(location, child.href));
          
          return (
            <DropdownMenu key={item.name}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-center p-3 rounded-lg transition-all duration-200 group relative",
                    "hover:bg-gray-100 dark:hover:bg-gray-800",
                    isActive && "bg-white dark:bg-slate-800 shadow-sm border border-gray-200 dark:border-gray-700"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 transition-colors", item.color)} />
                  <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 dark:bg-slate-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
                    <div className="flex flex-col">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs text-gray-300 dark:text-gray-400">{item.description}</span>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="w-56 p-2">
                <div className="px-2 py-1.5 mb-1">
                  <div className="flex items-center gap-2">
                    <item.icon className={cn("h-4 w-4", item.color)} />
                    <span className="font-medium text-sm">{item.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                </div>
                <DropdownMenuSeparator />
                {item.children.map((child) => (
                  <Link key={child.href} href={child.href}>
                    <DropdownMenuItem className={cn(
                      "rounded-md px-3 py-2 cursor-pointer transition-colors flex items-center justify-between",
                      isPathExactActive(location, child.href) && "bg-gray-100 dark:bg-gray-800"
                    )}>
                      <span className="text-sm">{child.name}</span>
                      {child.href === '/orders/pre-orders' && fullyArrivedCount > 0 && (
                        <Badge variant="default" className="ml-2 bg-green-600 hover:bg-green-700 text-white text-xs h-5 min-w-5 px-1.5">
                          {fullyArrivedCount}
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  </Link>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }
        
        const isActive = isPathActive(location, item.href);
        
        return (
          <Link key={item.name} href={item.href}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-center p-3 rounded-lg relative group transition-all duration-200",
                "hover:bg-gray-100 dark:hover:bg-gray-800",
                isActive && "bg-white shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700"
              )}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <item.icon className={cn("h-5 w-5 transition-colors", item.color)} />
              <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
                <div className="flex flex-col">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-xs text-gray-300">{item.description}</span>
                </div>
              </div>
            </Button>
          </Link>
        );
      })}
        </div>
      );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Header - Smart scroll-aware header */}
      <MobileHeader
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        navContent={
          <nav className="p-4 space-y-2" ref={mobileNavRef}>
            <NavLinks />
          </nav>
        }
        dueTicketsCount={dueTicketsCount}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex fixed inset-y-0 left-0 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-700 flex-col transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}>
        <div className={cn(
          "border-b flex-shrink-0 flex items-center justify-between h-[65px]",
          isCollapsed ? "px-3" : "px-6"
        )}>
          {!isCollapsed && (
            <img src={logoPath} alt="Davie Professional" className="h-10" />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "shrink-0",
              !isCollapsed && "ml-auto"
            )}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        <nav 
          className={cn(
            "space-y-2 overflow-y-auto flex-1",
            isCollapsed ? "p-2" : "p-4"
          )} 
          ref={desktopNavRef}
          onScroll={handleDesktopScroll}
        >
          <NavLinks collapsed={isCollapsed} />
        </nav>
      </aside>

      {/* Main Content */}
      <main 
        className={cn(
          "transition-all duration-300 lg:pt-0",
          isCollapsed ? "lg:ml-16" : "lg:ml-64"
        )}
        style={{
          paddingTop: 'calc(var(--mobile-header-height-current, 3.5rem) + env(safe-area-inset-top, 0px))',
        }}
      >
        {/* Top Navigation Bar - Desktop Only - Hidden during active picking/packing */}
        {!(location.includes('/orders/pick-pack') && sessionStorage.getItem('pickpack-active-mode') === 'true') && (
          <header className="hidden lg:block sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-6 py-2">
            {/* Breadcrumb and Page Title */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Link href="/">
                  <button className="hover:text-foreground transition-colors flex items-center gap-1">
                    <Home className="h-3 w-3" />
                    <span className="hidden xl:inline">{t('common:dashboard')}</span>
                  </button>
                </Link>
                {location !== '/' && (
                  <>
                    {/* Parent Page Link */}
                    {(location.includes('/orders/') || location.includes('/packing-materials/') || 
                      location.includes('/inventory/') || location.includes('/warehouses/') || 
                      location.includes('/customers/') || location.includes('/suppliers/') || 
                      location.includes('/discounts/') || location.includes('/services/') || 
                      location.includes('/tickets/') || location.includes('/expenses/') ||
                      location.includes('/imports/') || location.includes('/receiving/') ||
                      location.includes('/stock') || location.includes('/settings/')) && (
                      <>
                        <BreadcrumbChevron className="h-3 w-3" />
                        <Link href={
                          location.includes('/orders') ? '/orders' :
                          location.includes('/packing-materials') ? '/packing-materials' :
                          location.includes('/inventory') ? '/inventory' :
                          location.includes('/warehouses') ? '/warehouses' :
                          location.includes('/customers') ? '/customers' :
                          location.includes('/suppliers') ? '/suppliers' :
                          location.includes('/discounts') ? '/discounts' :
                          location.includes('/services') ? '/services' :
                          location.includes('/tickets') ? '/tickets' :
                          location.includes('/expenses') ? '/expenses' :
                          location.includes('/imports') ? '/imports' :
                          location.includes('/receiving') ? '/receiving' :
                          location.includes('/stock') ? '/stock' :
                          location.includes('/settings') ? '/settings' :
                          '/'
                        }>
                          <button className="hover:text-foreground transition-colors">
                            {location.includes('/orders') ? t('common:orders') :
                             location.includes('/packing-materials') ? t('common:packingMaterials') :
                             location.includes('/inventory') ? t('common:inventory') :
                             location.includes('/warehouses') ? t('common:warehouses') :
                             location.includes('/customers') ? t('common:customers') :
                             location.includes('/suppliers') ? t('common:suppliers') :
                             location.includes('/discounts') ? t('common:discounts') :
                             location.includes('/services') ? t('common:services') :
                             location.includes('/tickets') ? t('common:tickets') :
                             location.includes('/expenses') ? t('common:expenses') :
                             location.includes('/imports') ? t('common:imports') :
                             location.includes('/receiving') ? t('common:receiving') :
                             location.includes('/stock') ? t('common:stock') :
                             location.includes('/settings') ? t('common:settings') :
                             t('common:dashboard')}
                          </button>
                        </Link>
                      </>
                    )}
                    <BreadcrumbChevron className="h-3 w-3" />
                    <span className="text-foreground font-medium truncate">
                      {location.includes('/orders/add') ? t('common:addOrder') :
                       location.includes('/orders/edit') ? t('common:editOrder') :
                       location.includes('/orders/pick-pack') ? t('common:pickAndPack') :
                       location.includes('/orders/') ? t('common:orderDetails') :
                       location.includes('/orders') ? t('common:orders') :
                       location.includes('/packing-materials/add') ? t('common:addMaterial') :
                       location.includes('/packing-materials/edit') ? t('common:editMaterial') :
                       location.includes('/packing-materials/') ? t('common:materialDetails') :
                       location.includes('/packing-materials') ? t('common:packingMaterials') :
                       location.includes('/inventory/add') ? t('common:addProduct') :
                       location.includes('/inventory/edit') ? t('common:editProduct') :
                       location.includes('/inventory/') ? t('common:productDetails') :
                       location.includes('/inventory') ? t('common:inventory') :
                       location.includes('/warehouses/map') ? t('common:warehouseMap') :
                       location.includes('/warehouses/add') ? t('common:addWarehouse') :
                       location.includes('/warehouses/edit') ? t('common:editWarehouse') :
                       location.includes('/warehouses/') ? t('common:warehouseDetails') :
                       location.includes('/warehouses') ? t('common:warehouses') :
                       location.includes('/discounts/add') ? t('common:addDiscount') :
                       location.includes('/discounts/') ? t('common:discountDetails') :
                       location.includes('/discounts') ? t('common:discounts') :
                       location.includes('/customers/add') ? t('common:addCustomer') :
                       location.includes('/customers/edit') ? t('common:editCustomer') :
                       location.includes('/customers/') ? t('common:customerDetails') :
                       location.includes('/customers') ? t('common:customers') :
                       location.includes('/suppliers/add') ? t('common:addSupplier') :
                       location.includes('/suppliers/edit') ? t('common:editSupplier') :
                       location.includes('/suppliers/') ? t('common:supplierDetails') :
                       location.includes('/suppliers') ? t('common:suppliers') :
                       location.includes('/returns') ? t('common:returns') :
                       location.includes('/expenses/add') ? t('common:addExpense') :
                       location.includes('/expenses/') ? t('common:expenseDetails') :
                       location.includes('/expenses') ? t('common:expenses') :
                       location.includes('/services/add') ? t('common:addService') :
                       location.includes('/services/edit') ? t('common:editService') :
                       location.includes('/services/') ? t('common:serviceDetails') :
                       location.includes('/services') ? t('common:services') :
                       location.includes('/tickets/add') ? t('common:addTicket') :
                       location.includes('/tickets/') ? t('common:ticketDetails') :
                       location.includes('/tickets') ? t('common:tickets') :
                       location.includes('/pos') ? t('common:pointOfSale') :
                       location.includes('/shipping') ? t('common:shippingManagement') :
                       location.includes('/reports') ? t('common:reports') :
                       location.includes('/imports/dashboard') ? t('common:importDashboard') :
                       location.includes('/imports/landing-costs/') ? t('common:landingCostDetails') :
                       location.includes('/imports/landing-costs') ? t('common:landingCosts') :
                       location.includes('/imports/') ? t('common:importDetails') :
                       location.includes('/imports') ? t('common:imports') :
                       location.includes('/receiving/storage') ? t('common:itemsToStore') :
                       location.includes('/receiving/') ? t('common:receivingDetails') :
                       location.includes('/receiving') ? t('common:receiving') :
                       location.includes('/stock') ? t('common:stockLookup') :
                       location.includes('/settings/general') ? t('common:generalSettings') :
                       location.includes('/settings/shipping') ? t('common:shippingSettings') :
                       location.includes('/settings/orders') ? t('common:orderSettings') :
                       location.includes('/settings/financial') ? t('common:financialSettings') :
                       location.includes('/settings/inventory') ? t('common:inventorySettings') :
                       location.includes('/settings/system') ? t('common:systemSettings') :
                       location.includes('/settings/roles') ? t('common:rolesSettings') :
                       t('common:dashboard')}
                    </span>
                  </>
                )}
              </nav>
              {/* Page Title */}
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 border-l pl-3 border-gray-200 dark:border-gray-700">
                {location === '/' ? t('common:dashboard') : 
                 location.includes('/orders/pick-pack') ? t('common:pickAndPack') :
                 location.includes('/orders') ? t('common:ordersManagement') :
                 location.includes('/packing-materials') ? t('common:packingMaterials') :
                 location.includes('/inventory') ? t('common:inventoryManagement') :
                 location.includes('/warehouses/map') ? t('common:warehouseSpaceMap') :
                 location.includes('/warehouses') ? t('common:warehouseManagement') :
                 location.includes('/discounts') ? t('common:discountsAndPromotions') :
                 location.includes('/customers') ? t('common:customerManagement') :
                 location.includes('/suppliers') ? t('common:supplierManagement') :
                 location.includes('/returns') ? t('common:returnsProcessing') :
                 location.includes('/expenses') ? t('common:expenseTracking') :
                 location.includes('/services') ? t('common:serviceManagement') :
                 location.includes('/tickets') ? t('common:supportTickets') :
                 location.includes('/pos') ? t('common:pointOfSale') :
                 location.includes('/shipping') ? t('common:shippingManagement') :
                 location.includes('/reports') ? t('common:reportsAndAnalytics') :
                 location.includes('/imports') ? t('common:importManagement') :
                 location.includes('/receiving') ? t('common:receivingAndStorage') :
                 location.includes('/stock') ? t('common:stockLookup') :
                 location.includes('/settings') ? t('common:systemSettings') :
                 t('common:dashboard')}
              </h2>
              <div className="flex-1 max-w-sm ml-2">
                <GlobalSearch />
              </div>
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Notifications */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/tickets">
                      <Button variant="ghost" size="icon" className="relative hover:bg-gray-100 dark:hover:bg-gray-800">
                        <Bell className="h-5 w-5" />
                        {dueTicketsCount > 0 && (
                          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                            {dueTicketsCount}
                          </span>
                        )}
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('common:notifications')} {dueTicketsCount > 0 && `(${dueTicketsCount})`}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Dark Mode Toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleTheme}
                      className="hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      {isDarkMode ? (
                        <Sun className="h-5 w-5 text-orange-500" />
                      ) : (
                        <Moon className="h-5 w-5 text-slate-700" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isDarkMode ? t('common:lightMode') : t('common:darkMode')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left hidden xl:block">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.firstName} {user?.lastName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role === 'administrator' ? t('common:administrator') : t('common:warehouseOperator')}</p>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-500 hidden xl:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/profile">
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>{t('common:profile')}</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/user-settings">
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>{t('common:settings')}</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem 
                    onClick={toggleTheme}
                    className="cursor-pointer"
                  >
                    {isDarkMode ? (
                      <>
                        <Sun className="mr-2 h-4 w-4 text-orange-500" />
                        <span>{t('common:lightMode')}</span>
                      </>
                    ) : (
                      <>
                        <Moon className="mr-2 h-4 w-4 text-slate-700" />
                        <span>{t('common:darkMode')}</span>
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      const newLang = i18n.language === 'en' ? 'vi' : 'en';
                      languageMutation.mutate(newLang);
                    }}
                    className="cursor-pointer"
                  >
                    <Languages className="mr-2 h-4 w-4 text-blue-600" />
                    <span>
                      {i18n.language === 'en' ? 'Tiếng Việt' : 'English'}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => {
                      window.location.href = '/api/logout';
                    }}
                    className="text-red-600 focus:text-red-600 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('common:logout')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        )}

        <div className={cn(
          "mx-auto",
          !(noPadding || location === '/pos') && "px-mobile py-mobile",
          layoutWidth === 'full' || location === '/pos' ? 'max-w-full' : 'max-w-7xl'
        )}>
          {children}
        </div>
      </main>
    </div>
  );
}