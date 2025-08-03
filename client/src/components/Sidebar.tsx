import { useState } from "react";
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
  Ship
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
    href: "/warehouse",
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
  const [openItems, setOpenItems] = useState<string[]>(["Orders"]);

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
      <nav className="flex-1 py-4">
        <div className="px-4 space-y-1">
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
                      {item.children.map((child) => (
                        <Link key={child.href} href={child.href}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "w-full justify-start text-slate-600",
                              location === child.href && "bg-slate-100 text-slate-900"
                            )}
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
                    "w-full justify-start font-medium",
                    isActive && "bg-emerald-50 text-primary border-r-2 border-primary"
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Button>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
