import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Menu, 
  X, 
  ChartLine, 
  ShoppingCart, 
  Package, 
  Warehouse, 
  Percent, 
  Users, 
  BarChart3, 
  ChevronDown,
  Plus,
  Search,
  Bell,
  Sun,
  Moon,
  User,
  Settings,
  LogOut,
  Receipt,
  CreditCard
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
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleItem = (itemName: string) => {
    setOpenItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: ChartLine,
    },
    {
      name: "Orders",
      icon: ShoppingCart,
      children: [
        { name: "All Orders", href: "/orders" },
        { name: "Add Order", href: "/orders/add" },
        { name: "To Fulfill", href: "/orders/to-fulfill" },
        { name: "Shipped", href: "/orders/shipped" },
        { name: "Pre-Orders", href: "/orders/pre-orders" },
      ],
    },
    {
      name: "Inventory",
      icon: Package,
      children: [
        { name: "All Products", href: "/inventory" },
        { name: "Product Bundles", href: "/inventory/bundles" },
        { name: "Add Product", href: "/inventory/add" },
      ],
    },
    {
      name: "Warehouses",
      href: "/warehouses",
      icon: Warehouse,
    },
    {
      name: "Discounts",
      href: "/discounts",
      icon: Percent,
    },
    {
      name: "Customers",
      href: "/customers",
      icon: Users,
    },
    {
      name: "Suppliers",
      href: "/suppliers",
      icon: Package,
    },
    {
      name: "Returns",
      href: "/returns",
      icon: Package,
    },
    {
      name: "Expenses",
      href: "/expenses",
      icon: Receipt,
    },
    {
      name: "POS",
      href: "/pos",
      icon: CreditCard,
    },
    {
      name: "Reports",
      href: "/reports",
      icon: BarChart3,
    },
  ];

  const NavLinks = () => (
    <>
      {navigation.map((item) => {
        if (item.children) {
          const isOpen = openItems.includes(item.name);
          const isActive = item.children.some(child => location === child.href);
          
          return (
            <Collapsible
              key={item.name}
              open={isOpen}
              onOpenChange={() => toggleItem(item.name)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-between text-left font-medium px-3 py-2 rounded-md touch-target",
                    isActive && "bg-emerald-50 text-primary"
                  )}
                >
                  <div className="flex items-center">
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform",
                    isOpen && "rotate-180"
                  )} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1">
                <div className="pl-8 space-y-1">
                  {item.children.map((child) => (
                    <Link key={child.href} href={child.href}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "w-full justify-start text-slate-600 px-3 py-2 rounded-md touch-target",
                          location === child.href && "bg-slate-100 text-slate-900"
                        )}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {child.name}
                      </Button>
                    </Link>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        }

        const isActive = location === item.href;
        
        return (
          <Link key={item.name} href={item.href}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start font-medium px-3 py-2 rounded-md touch-target",
                isActive && "bg-emerald-50 text-primary"
              )}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Button>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
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
              <nav className="p-4 space-y-2 overflow-y-auto flex-1">
                <NavLinks />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b flex-shrink-0">
          <img src={logoPath} alt="Davie Professional" className="h-10" />
        </div>
        <nav className="p-4 space-y-2 overflow-y-auto flex-1">
          <NavLinks />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64">
        {/* Top Navigation Bar - Desktop Only */}
        <header className="hidden lg:block sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-3">
            {/* Page Title and Search */}
            <div className="flex items-center flex-1 gap-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {location === '/' ? 'Dashboard' : 
                 location.includes('/orders') ? 'Orders' :
                 location.includes('/inventory') ? 'Inventory' :
                 location.includes('/warehouses') ? 'Warehouses' :
                 location.includes('/discounts') ? 'Discounts' :
                 location.includes('/customers') ? 'Customers' :
                 location.includes('/suppliers') ? 'Suppliers' :
                 location.includes('/returns') ? 'Returns' :
                 location.includes('/expenses') ? 'Expenses' :
                 location.includes('/pos') ? 'Point of Sale' :
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

        <div className="px-mobile py-mobile max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}