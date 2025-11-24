import { useState, useEffect, useRef, useMemo } from "react";
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
  Ticket,
  ClipboardList
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  labelKey: string;
  href?: string;
  icon?: any;
  adminOnly?: boolean;
  children?: NavItem[];
  namespace?: string;
}

// Recursive function to filter navigation items based on user role
function filterNavItems(items: NavItem[], isAdmin: boolean): NavItem[] {
  return items
    .filter(item => {
      // Filter out admin-only items for non-administrators
      if (item.adminOnly && !isAdmin) {
        return false;
      }
      return true;
    })
    .map(item => {
      // Recursively filter children if they exist
      if (item.children && item.children.length > 0) {
        return {
          ...item,
          children: filterNavItems(item.children, isAdmin)
        };
      }
      return item;
    });
}

const navigation: NavItem[] = [
  {
    labelKey: "dashboard",
    href: "/",
    icon: ChartLine,
    namespace: "common"
  },
  {
    labelKey: "orders",
    icon: ShoppingCart,
    namespace: "orders",
    children: [
      { labelKey: "orders", href: "/orders", namespace: "orders" },
      { labelKey: "addOrder", href: "/orders/add", namespace: "orders" },
      { labelKey: "toFulfill", href: "/orders/to-fulfill", namespace: "orders" },
      { labelKey: "shipped", href: "/orders/shipped", namespace: "orders" },
      { labelKey: "payLater", href: "/orders/pay-later", namespace: "orders" },
      { labelKey: "preOrders", href: "/orders/pre-orders", namespace: "orders" },
    ],
  },
  {
    labelKey: "inventory",
    href: "/inventory",
    icon: Package,
    namespace: "inventory"
  },
  {
    labelKey: "warehouse",
    icon: Warehouse,
    namespace: "warehouse",
    children: [
      { labelKey: "warehouses", href: "/warehouses", namespace: "warehouse" },
      { labelKey: "warehouseMap", href: "/warehouses/map", namespace: "warehouse" },
      { labelKey: "addWarehouse", href: "/warehouses/add", namespace: "warehouse" },
    ],
  },
  {
    labelKey: "stock",
    icon: ClipboardList,
    namespace: "inventory",
    children: [
      { labelKey: "stockLookup", href: "/stock", namespace: "inventory" },
      { labelKey: "adjustmentApprovals", href: "/stock/approvals", namespace: "inventory" },
    ],
  },
  {
    labelKey: "discounts",
    href: "/discounts",
    icon: Percent,
    namespace: "financial"
  },
  {
    labelKey: "customers",
    href: "/customers",
    icon: Users,
    namespace: "customers"
  },
  {
    labelKey: "files",
    href: "/files",
    icon: FileText,
    namespace: "common"
  },
  {
    labelKey: "services",
    href: "/services",
    icon: Wrench,
    namespace: "common"
  },
  {
    labelKey: "tickets",
    href: "/tickets",
    icon: Ticket,
    namespace: "system"
  },
  {
    labelKey: "imports",
    icon: Globe,
    namespace: "warehouse",
    children: [
      { labelKey: "kanbanDashboard", href: "/imports/kanban", namespace: "warehouse" },
      { labelKey: "purchaseOrders", href: "/purchase-orders", namespace: "warehouse" },
      { labelKey: "consolidation", href: "/consolidation", namespace: "warehouse" },
      { labelKey: "internationalTransit", href: "/imports/international-transit", namespace: "warehouse" },
    ],
  },
  {
    labelKey: "receiving",
    href: "/receiving",
    icon: Package,
    namespace: "warehouse"
  },
  {
    labelKey: "employees",
    href: "/employees",
    icon: Users,
    namespace: "common",
    adminOnly: true,
  },
  {
    labelKey: "reports",
    href: "/reports",
    icon: BarChart3,
    namespace: "reports"
  },
  {
    labelKey: "settings",
    href: "/user-settings",
    icon: Settings,
    namespace: "common"
  },
];

export function Sidebar() {
  const [location] = useLocation();
  const { t } = useTranslation();
  const { isAdministrator } = useAuth();
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  
  // Filter navigation items based on user role (memoized for performance)
  const filteredNavigation = useMemo(() => {
    return filterNavItems(navigation, isAdministrator);
  }, [isAdministrator]);
  
  // Find parent menus that should be open based on current location
  const getInitialOpenItems = () => {
    const openMenus: string[] = [];
    filteredNavigation.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => child.href === location);
        if (hasActiveChild) {
          openMenus.push(item.labelKey);
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
      filteredNavigation.forEach(item => {
        if (item.children) {
          const activeChild = item.children.find(child => child.href === location);
          if (activeChild) {
            activeKey = `${item.labelKey}-${activeChild.href}`;
          }
        } else if (item.href === location) {
          activeKey = item.labelKey;
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

  const toggleItem = (labelKey: string) => {
    setOpenItems(prev => 
      prev.includes(labelKey) 
        ? prev.filter(item => item !== labelKey)
        : [...prev, labelKey]
    );
  };

  // Helper function to get translated label
  const getLabel = (item: NavItem) => {
    const namespace = item.namespace || "common";
    return t(`${namespace}:${item.labelKey}`);
  };

  return (
    <div className="w-64 bg-white dark:bg-slate-900 shadow-lg dark:shadow-gray-900/50 border-r border-slate-200 dark:border-gray-700 flex flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-slate-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-primary dark:text-primary">{t('common:brandTitle', 'Davie')}</h1>
        <p className="text-sm text-slate-500 dark:text-gray-400">{t('common:brandSubtitle', 'Supply Management')}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto" ref={navRef}>
        <div className="px-4 space-y-1">
          {filteredNavigation.map((item) => {
            if (item.children) {
              const isOpen = openItems.includes(item.labelKey);
              const isActive = item.children.some(child => location === child.href);
              
              return (
                <div
                  key={item.labelKey}
                  ref={el => {
                    if (isActive && el) {
                      itemRefs.current[item.labelKey] = el;
                    }
                  }}
                >
                  <Collapsible
                    open={isOpen}
                    onOpenChange={() => toggleItem(item.labelKey)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-between text-left font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                          isActive && "bg-emerald-50 dark:bg-emerald-900/20 text-primary dark:text-primary border-r-2 border-primary dark:border-primary"
                        )}
                        data-testid={`nav-${item.labelKey}`}
                      >
                      <div className="flex items-center">
                        <item.icon className="mr-3 h-5 w-5" />
                        {getLabel(item)}
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
                                itemRefs.current[`${item.labelKey}-${child.href}`] = el;
                              }
                            }}
                          >
                            <Link href={child.href!}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "w-full justify-start text-slate-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800",
                                  isChildActive && "bg-slate-100 dark:bg-gray-800 text-slate-900 dark:text-gray-100"
                                )}
                                data-testid={`nav-${child.labelKey}`}
                              >
                                {getLabel(child)}
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
                key={item.labelKey}
                ref={el => {
                  if (isActive && el) {
                    itemRefs.current[item.labelKey] = el;
                  }
                }}
              >
                <Link href={item.href!}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                      isActive && "bg-emerald-50 dark:bg-emerald-900/20 text-primary dark:text-primary border-r-2 border-primary dark:border-primary"
                    )}
                    data-testid={`nav-${item.labelKey}`}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {getLabel(item)}
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
