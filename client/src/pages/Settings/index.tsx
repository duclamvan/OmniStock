import { useLocation } from "wouter";
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, DollarSign, ShoppingCart, Package, Warehouse, Truck, Shield } from "lucide-react";
import GeneralSettings from "./GeneralSettings";
import ShippingSettings from "./ShippingSettings";
import OrderSettings from "./OrderSettings";
import FinancialSettings from "./FinancialSettings";
import InventorySettings from "./InventorySettings";
import SystemSettings from "./SystemSettings";
import RolesSettings from "./RolesSettings";

export default function Settings() {
  const [location, navigate] = useLocation();
  const { t } = useTranslation(['settings', 'common', 'system']);
  const tab = location.split("/")[2] || "general";

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-6 overflow-x-hidden">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">{t('settings:settings', 'Settings')}</h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
          {t('settings:settingsDescription', 'Configure your application preferences and system settings')}
        </p>
      </div>

      <Tabs value={tab} onValueChange={(value) => navigate(`/settings/${value}`)} className="space-y-4">
        <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-4 lg:grid-cols-7 gap-1 sm:gap-1.5 h-auto p-1 sm:p-1.5">
          <TabsTrigger value="general" className="gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-general">
            <SettingsIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">{t('common:general')}</span>
          </TabsTrigger>
          <TabsTrigger value="shipping" className="gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-shipping">
            <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">{t('common:shipping')}</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-orders">
            <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">{t('common:orders')}</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-financial">
            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">{t('common:financial')}</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-inventory">
            <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">{t('common:inventory')}</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-system">
            <Warehouse className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">{t('common:system')}</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap" data-testid="tab-roles">
            <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">{t('system:roles')}</span>
          </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="shipping">
          <ShippingSettings />
        </TabsContent>

        <TabsContent value="orders">
          <OrderSettings />
        </TabsContent>

        <TabsContent value="financial">
          <FinancialSettings />
        </TabsContent>

        <TabsContent value="inventory">
          <InventorySettings />
        </TabsContent>

        <TabsContent value="system">
          <SystemSettings />
        </TabsContent>

        <TabsContent value="roles">
          <RolesSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
