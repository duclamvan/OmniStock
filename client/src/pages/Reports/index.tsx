import { useLocation, Link } from "wouter";
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ReportsProvider } from "@/contexts/ReportsContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function ReportsIndex() {
  const [location, setLocation] = useLocation();
  const { t } = useTranslation('reports');
  usePageTitle('Reports');

  const reportTabs = [
    { value: '/reports', label: t('overview'), shortLabel: t('overview'), icon: LayoutDashboard },
    { value: '/reports/financial', label: t('financialReport'), shortLabel: t('financial'), icon: Coins },
    { value: '/reports/sales', label: t('salesReport'), shortLabel: t('sales'), icon: ShoppingBag },
    { value: '/reports/inventory', label: t('inventoryReport'), shortLabel: t('inventory'), icon: Package },
    { value: '/reports/customers', label: t('customerReport'), shortLabel: t('customers'), icon: Users },
    { value: '/reports/orders', label: t('orderReport'), shortLabel: t('orders'), icon: ShoppingCart },
    { value: '/reports/expenses', label: t('expenseReport'), shortLabel: t('expenses'), icon: Receipt },
  ];

  const getActiveTab = () => {
    const currentTab = reportTabs.find(tab => tab.value === location);
    return currentTab ? currentTab.value : '/reports';
  };

  const activeTab = getActiveTab();
  const activeTabData = reportTabs.find(tab => tab.value === activeTab);

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
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-0" data-testid="reports-container">
        <div className="px-2 sm:px-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">{t('reports')}</h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">{t('businessOverviewDesc')}</p>
        </div>

        {/* Mobile: Dropdown select for navigation */}
        <div className="block sm:hidden">
          <Select value={activeTab} onValueChange={(value) => setLocation(value)}>
            <SelectTrigger className="w-full" data-testid="select-report-tab-mobile">
              <div className="flex items-center gap-2">
                {activeTabData && <activeTabData.icon className="h-4 w-4" />}
                <SelectValue>{activeTabData?.label}</SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent>
              {reportTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <SelectItem 
                    key={tab.value} 
                    value={tab.value}
                    data-testid={`select-item-${tab.value.split('/').pop()}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Tablet: Horizontal scrollable tabs with icons + short labels */}
        <div className="hidden sm:block lg:hidden">
          <Card className="p-1">
            <ScrollArea className="w-full">
              <Tabs value={activeTab} className="w-full">
                <TabsList className="inline-flex w-max gap-1 p-1">
                  {reportTabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        onClick={() => setLocation(tab.value)}
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-3 py-2 flex items-center gap-2 whitespace-nowrap"
                        data-testid={`tab-${tab.value.split('/').pop()}-tablet`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm">{tab.shortLabel}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </Card>
        </div>

        {/* Desktop: Full grid tabs */}
        <div className="hidden lg:block">
          <Card className="p-1">
            <Tabs value={activeTab} className="w-full">
              <TabsList className="grid w-full grid-cols-7 gap-1">
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
                      <Icon className="h-4 w-4 mr-2" />
                      <span className="text-sm">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </Card>
        </div>

        <div className="animate-in fade-in-50 duration-500">
          {renderContent()}
        </div>
      </div>
    </ReportsProvider>
  );
}
