import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface MobileResponsiveLayoutProps {
  children: React.ReactNode;
}

export function MobileResponsiveLayout({ children }: MobileResponsiveLayoutProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/orders', label: 'Orders' },
    { href: '/inventory', label: 'Inventory' },
    { href: '/customers', label: 'Customers' },
    { href: '/warehouses', label: 'Warehouses' },
    { href: '/sales', label: 'Sales' },
    { href: '/reports', label: 'Reports' },
  ];

  const NavLinks = () => (
    <>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "block px-3 py-2 rounded-md text-mobile-base font-medium transition-colors touch-target",
            location === item.href
              ? "bg-primary text-white"
              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          )}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          {item.label}
        </Link>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-mobile-xl font-bold text-primary">Davie Supply</h1>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="touch-target">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Menu</h2>
              </div>
              <nav className="p-4 space-y-2">
                <NavLinks />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-primary">Davie Supply</h1>
        </div>
        <nav className="p-4 space-y-2">
          <NavLinks />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64">
        <div className="px-mobile py-mobile max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}