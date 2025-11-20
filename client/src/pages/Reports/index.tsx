import { useLocation, Link } from "wouter";
import { ReportsProvider } from "@/contexts/ReportsContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  BarChart3,
  Coins,
  ShoppingBag,
  Package,
  Users,
  ShoppingCart,
  Receipt,
  LayoutDashboard
} from "lucide-react";
import Reports from "./Reports";
import FinancialReports from "./FinancialReports";
import SalesReports from "./SalesReports";
import InventoryReports from "./InventoryReports";
import CustomerReports from "./CustomerReports";
import OrderReports from "./OrderReports";
import ExpenseReports from "./ExpenseReports";

const reportTabs = [
  { value: '/reports', label: 'Overview', icon: LayoutDashboard },
  { value: '/reports/financial', label: 'Financial', icon: Coins },
  { value: '/reports/sales', label: 'Sales', icon: ShoppingBag },
  { value: '/reports/inventory', label: 'Inventory', icon: Package },
  { value: '/reports/customers', label: 'Customers', icon: Users },
  { value: '/reports/orders', label: 'Orders', icon: ShoppingCart },
  { value: '/reports/expenses', label: 'Expenses', icon: Receipt },
];

export default function ReportsIndex() {
  const [location, setLocation] = useLocation();

  const getActiveTab = () => {
    const currentTab = reportTabs.find(tab => tab.value === location);
    return currentTab ? currentTab.value : '/reports';
  };

  const renderContent = () => {
    switch (location) {
      case '/reports/financial':
        return <FinancialReports />;
      case '/reports/sales':
        return <SalesReports />;
      case '/reports/inventory':
        return <InventoryReports />;
      case '/reports/customers':
        return <CustomerReports />;
      case '/reports/orders':
        return <OrderReports />;
      case '/reports/expenses':
        return <ExpenseReports />;
      default:
        return <Reports />;
    }
  };

  return (
    <ReportsProvider>
      <div className="space-y-6" data-testid="reports-container">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-600 mt-1">Comprehensive business analytics and insights</p>
        </div>

        <Card className="p-1">
          <Tabs value={getActiveTab()} className="w-full">
            <TabsList className="grid w-full grid-cols-7 lg:grid-cols-7 gap-1">
              {reportTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    onClick={() => setLocation(tab.value)}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    data-testid={`tab-${tab.value.split('/').pop()}`}
                  >
                    <Icon className="h-4 w-4 mr-2 hidden sm:inline" />
                    <span className="text-xs sm:text-sm">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </Card>

        <div className="animate-in fade-in-50 duration-500">
          {renderContent()}
        </div>
      </div>
    </ReportsProvider>
  );
}
