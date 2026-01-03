import { Dashboard } from "@/components/Dashboard";
import { usePageTitle } from "@/hooks/use-page-title";

export default function Home() {
  usePageTitle('nav.dashboard', 'Dashboard');
  return <Dashboard />;
}
