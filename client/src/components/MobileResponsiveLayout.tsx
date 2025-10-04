import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'wouter';
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
  Wrench
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface MobileResponsiveLayoutProps {
  children: React.ReactNode;
}

export function MobileResponsiveLayout({ children }: MobileResponsiveLayoutProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const previousLocation = useRef(location);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Check if we're on the Pick & Pack page
  const isPickPackPage = location === '/orders/pick-pack';

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);
  

  const toggleItem = (itemName: string) => {
    // Save current scroll position
    const currentScrollTop = navRef.current?.scrollTop || 0;
    
    setOpenItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
    
    // Restore scroll position after DOM update
    requestAnimationFrame(() => {
      if (navRef.current) {
        navRef.current.scrollTop = currentScrollTop;
      }
    });
  };

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      color: "text-blue-600",
      description: "Overview & Analytics"
    },
    {
      name: "Orders",
      icon: ShoppingCart,
      color: "text-emerald-600",
      description: "Order Management",
      children: [
        { name: "All Orders", href: "/orders" },
        { name: "Add Order", href: "/orders/add" },
        { name: "Pick & Pack", href: "/orders/pick-pack" },
        { name: "To Fulfill", href: "/orders/to-fulfill" },
        { name: "Shipped", href: "/orders/shipped" },
        { name: "Pay Later", href: "/orders/pay-later" },
        { name: "Pre-Orders", href: "/orders/pre-orders" },
      ],
    },
    {
      name: "Inventory",
      icon: Boxes,
      color: "text-purple-600",
      description: "Product Management",
      children: [
        { name: "All Products", href: "/inventory" },
        { name: "Categories", href: "/inventory/categories" },
        { name: "Product Bundles", href: "/inventory/bundles" },
        { name: "Packing Materials", href: "/packing-materials" },
        { name: "Add Product", href: "/inventory/add" },
      ],
    },
    {
      name: "Warehouses",
      icon: Building2,
      color: "text-orange-600",
      description: "Storage Facilities",
      children: [
        { name: "All Warehouses", href: "/warehouses" },
        { name: "Warehouse Map", href: "/warehouses/map" },
        { name: "Add Warehouse", href: "/warehouses/add" },
      ],
    },
    {
      name: "Discounts",
      href: "/discounts",
      icon: Percent,
      color: "text-red-600",
      description: "Pricing & Offers"
    },
    {
      name: "Customers",
      href: "/customers",
      icon: UserCheck,
      color: "text-indigo-600",
      description: "Client Management"
    },
    {
      name: "Suppliers",
      href: "/suppliers",
      icon: Building,
      color: "text-teal-600",
      description: "Vendor Network"
    },
    {
      name: "Returns",
      href: "/returns",
      icon: RefreshCw,
      color: "text-yellow-600",
      description: "Return Processing"
    },
    {
      name: "Expenses",
      href: "/expenses",
      icon: Calculator,
      color: "text-pink-600",
      description: "Cost Tracking"
    },
    {
      name: "Services",
      href: "/services",
      icon: Wrench,
      color: "text-purple-600",
      description: "Repairs & Services"
    },
    {
      name: "POS",
      href: "/pos",
      icon: Store,
      color: "text-green-600",
      description: "Point of Sale"
    },
    {
      name: "Imports",
      icon: Import,
      color: "text-cyan-600",
      description: "International Orders",
      children: [
        { name: "Kanban Dashboard", href: "/imports/kanban" },
        { name: "Supplier Processing", href: "/imports/supplier-processing" },
        { name: "At Warehouse", href: "/imports/at-warehouse" },
        { name: "International Transit", href: "/imports/international-transit" },
      ],
    },
    {
      name: "Receiving",
      href: "/receiving",
      icon: ClipboardCheck,
      color: "text-violet-600",
      description: "Incoming Shipments"
    },
    {
      name: "Items To Store",
      href: "/receiving/items-to-store",
      icon: PackageCheck,
      color: "text-lime-600",
      description: "Storage Queue"
    },
    {
      name: "Shipping",
      href: "/shipping",
      icon: Send,
      color: "text-blue-500",
      description: "Outbound Logistics"
    },
    {
      name: "Reports",
      href: "/reports",
      icon: FileText,
      color: "text-gray-600",
      description: "Analytics & Reports"
    },
  ];

  // Automatically open parent menus and scroll to active item when location changes
  useEffect(() => {
    // Only run if location actually changed
    if (previousLocation.current === location) {
      return;
    }
    previousLocation.current = location;
    
    // Find parent menus that should be open based on current location
    const activeParentMenus: string[] = [];
    navigation.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => child.href === location);
        if (hasActiveChild) {
          activeParentMenus.push(item.name);
        }
      }
    });
    
    // Open parent menus if they have active children
    setOpenItems(prev => {
      const newOpenItems = new Set([...prev, ...activeParentMenus]);
      return Array.from(newOpenItems);
    });
    
    // Scroll to active item after a short delay to ensure DOM is updated
    setTimeout(() => {
      // Find the active item key
      let activeKey = location;
      
      // Check if it's a child item
      navigation.forEach(item => {
        if (item.children) {
          const activeChild = item.children.find(child => child.href === location);
          if (activeChild) {
            activeKey = `${item.name}-${activeChild.href}`;
          }
        } else if (item.href === location) {
          activeKey = item.name;
        }
      });
      
      // Scroll the active item into view
      const activeElement = itemRefs.current[activeKey];
      if (activeElement && navRef.current) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, 100);
  }, [location]);

  const NavLinks = ({ collapsed = false }: { collapsed?: boolean }) => (
    <>
      {navigation.map((item) => {
        if (item.children) {
          const isOpen = openItems.includes(item.name);
          const isActive = item.children.some(child => location === child.href);
          
          if (collapsed) {
            return (
              <DropdownMenu key={item.name}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-center p-3 rounded-lg transition-all duration-200 group relative",
                      "hover:bg-gray-100 dark:hover:bg-gray-800",
                      isActive && "bg-white shadow-sm border border-gray-200"
                    )}
                  >
                    <item.icon className={cn("h-5 w-5 transition-colors", item.color)} />
                    <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
                      <div className="flex flex-col">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-gray-300">{item.description}</span>
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
                        "rounded-md px-3 py-2 cursor-pointer transition-colors",
                        location === child.href && "bg-gray-100 dark:bg-gray-800"
                      )}>
                        <span className="text-sm">{child.name}</span>
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
                    <div className="flex flex-col items-start flex-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{item.description}</span>
                    </div>
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform duration-200 text-gray-400 ml-2",
                      isOpen && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1">
                  <div className="ml-8 space-y-1 border-l border-gray-200 dark:border-gray-700 pl-2">
                    {item.children.map((child) => {
                      const isChildActive = location === child.href;
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
                                "w-full justify-start text-gray-600 dark:text-gray-300 px-3 py-2 rounded-md touch-target transition-colors text-sm",
                                "hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white",
                                isChildActive && "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                              )}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              {child.name}
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

        const isActive = location === item.href;
        
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
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{item.description}</span>
                </div>
              </Button>
            </Link>
          </div>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header - Hidden on Pick & Pack page */}
      {!isPickPackPage && (
      <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <img src={logoPath} alt="Davie Professional" className="h-8" />
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="touch-target">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col h-full">
              <div className="p-4 border-b flex-shrink-0">
                <h2 className="text-lg font-semibold">Menu</h2>
              </div>
              <nav className="p-4 space-y-2 overflow-y-auto flex-1" ref={navRef}>
                <NavLinks />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      )}

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex fixed inset-y-0 left-0 bg-white border-r border-gray-200 flex-col transition-all duration-300",
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
        <nav className={cn(
          "space-y-2 overflow-y-auto flex-1",
          isCollapsed ? "p-2" : "p-4"
        )} ref={navRef}>
          <NavLinks collapsed={isCollapsed} />
        </nav>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "transition-all duration-300",
        isCollapsed ? "lg:ml-16" : "lg:ml-64"
      )}>
        {/* Top Navigation Bar - Desktop Only - Hidden on Pick & Pack page */}
        {!isPickPackPage && (
        <header className="hidden lg:block sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-3">
            {/* Page Title and Search */}
            <div className="flex items-center flex-1 gap-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {location === '/' ? 'Dashboard' : 
                 location.includes('/orders') ? 'Orders' :
                 location.includes('/packing-materials') ? 'Packing Materials' :
                 location.includes('/inventory') ? 'Inventory' :
                 location.includes('/warehouses') ? 'Warehouses' :
                 location.includes('/discounts') ? 'Discounts' :
                 location.includes('/customers') ? 'Customers' :
                 location.includes('/suppliers') ? 'Suppliers' :
                 location.includes('/returns') ? 'Returns' :
                 location.includes('/expenses') ? 'Expenses' :
                 location.includes('/services') ? 'Services' :
                 location.includes('/pos') ? 'Point of Sale' :
                 location.includes('/shipping') ? 'Shipping Management' :
                 location.includes('/reports') ? 'Reports' : 'Dashboard'}
              </h2>
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full"
                />
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
              </Button>

              {/* Dark Mode Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDarkMode(!isDarkMode)}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="text-left hidden xl:block">
                      <p className="text-sm font-medium">ronak_03</p>
                      <p className="text-xs text-gray-500">Admin</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        )}


        <div className={cn(
          "px-mobile py-mobile max-w-7xl mx-auto"
        )}>
          {children}
        </div>
      </main>
    </div>
  );
}