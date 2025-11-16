import { MobileResponsiveLayout } from "./MobileResponsiveLayout";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <MobileResponsiveLayout>
      {children}
    </MobileResponsiveLayout>
  );
}
