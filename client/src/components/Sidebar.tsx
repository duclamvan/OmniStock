import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { 
  ChartLine, 
  ShoppingCart, 
  Package, 
  Warehouse, 
  Percent, 
  Users, 
  BarChart3, 
  Settings,
  ChevronDown,
  Plus,
  Truck,
  Ship,
  FileText,
  Globe,
  PackageCheck,
  Wrench,
  Ticket
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
      { name: "Pay Later", href: "/orders/pay-later" },
      { name: "Pre-Orders", href: "/orders/pre-orders" },
    ],
  },
  {
    name: "Inventory",
    href: "/inventory",
    icon: Package,
  },
  {
    name: "Warehouse",
    icon: Warehouse,
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
  },
  {
    name: "Customers",
    href: "/customers",
    icon: Users,
  },
  {
    name: "Files",
    href: "/files",
    icon: FileText,
  },
  {
    name: "Services",
    href: "/services",
    icon: Wrench,
  },
  {
    name: "Tickets",
    href: "/tickets",
    icon: Ticket,
  },
  {
    name: "Imports",
    icon: Globe,
    children: [
      { name: "Kanban Dashboard", href: "/imports/kanban" },
      { name: "Purchase Orders", href: "/purchase-orders" },
      { name: "Consolidation", href: "/imports/at-warehouse" },
      { name: "International Transit", href: "/imports/international-transit" },
    ],
  },
  {
    name: "Receiving",
    href: "/receiving",
    icon: Package,
  },
  {
    name: "Items To Store",
    href: "/receiving/items-to-store",
    icon: PackageCheck,
  },
  {
    name: "Reports",
    href: "/reports",
    icon: BarChart3,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const [location] = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  
  // Find parent menus that should be open based on current location
  const getInitialOpenItems = () => {
    const openMenus: string[] = [];
    navigation.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => child.href === location);
        if (hasActiveChild) {
          openMenus.push(item.name);
        }
      }
    });
    return openMenus;
  };

  const [openItems, setOpenItems] = useState<string[]>(getInitialOpenItems());

  // Automatically open parent menus and scroll to active item when location changes
  useEffect(() => {
    const activeParentMenus = getInitialOpenItems();
    
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
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, 100);
  }, [location]);

  const toggleItem = (name: string) => {
    setOpenItems(prev => 
      prev.includes(name) 
        ? prev.filter(item => item !== name)
        : [...prev, name]
    );
  };

  return (
    <div className="w-64 bg-white shadow-lg border-r border-slate-200 flex flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-primary">Davie</h1>
        <p className="text-sm text-slate-500">Supply Management</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto" ref={navRef}>
        <div className="px-4 space-y-1">
          {navigation.map((item) => {
            if (item.children) {
              const isOpen = openItems.includes(item.name);
              const isActive = item.children.some(child => location === child.href);
              
              return (
                <div
                  key={item.name}
                  ref={el => {
                    if (isActive && el) {
                      itemRefs.current[item.name] = el;
                    }
                  }}
                >
                  <Collapsible
                    open={isOpen}
                    onOpenChange={() => toggleItem(item.name)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-between text-left font-medium",
                          isActive && "bg-emerald-50 text-primary border-r-2 border-primary"
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
                                  "w-full justify-start text-slate-600",
                                  isChildActive && "bg-slate-100 text-slate-900"
                                )}
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
            
            return (
              <div
                key={item.name}
                ref={el => {
                  if (isActive && el) {
                    itemRefs.current[item.name] = el;
                  }
                }}
              >
                <Link href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start font-medium",
                      isActive && "bg-emerald-50 text-primary border-r-2 border-primary"
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
