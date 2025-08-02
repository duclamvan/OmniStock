import { useAuth } from "@/hooks/useAuth";
import { MobileResponsiveLayout } from "./MobileResponsiveLayout";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <MobileResponsiveLayout>
      {children}
    </MobileResponsiveLayout>
  );
}
