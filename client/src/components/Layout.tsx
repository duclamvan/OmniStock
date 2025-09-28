import { useAuth } from "@/hooks/useAuth";
import { MobileResponsiveLayout } from "./MobileResponsiveLayout";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  // Allow access to all pages without authentication for POS system
  return (
    <MobileResponsiveLayout>
      {children}
    </MobileResponsiveLayout>
  );
}
