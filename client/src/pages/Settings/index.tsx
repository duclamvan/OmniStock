import { useState } from "react";
import { useLocation } from "wouter";
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
  const tab = location.split("/")[2] || "general";

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
          Configure your WMS system preferences
        </p>
      </div>

      <Tabs value={tab} onValueChange={(value) => navigate(`/settings/${value}`)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 gap-1.5 sm:gap-2 h-auto p-1.5 sm:p-2">
          <TabsTrigger value="general" className="gap-2" data-testid="tab-general">
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="shipping" className="gap-2" data-testid="tab-shipping">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Shipping</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2" data-testid="tab-orders">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Orders</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2" data-testid="tab-financial">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Financial</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2" data-testid="tab-inventory">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Inventory</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2" data-testid="tab-system">
            <Warehouse className="h-4 w-4" />
            <span className="hidden sm:inline">System</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2" data-testid="tab-roles">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Roles</span>
          </TabsTrigger>
        </TabsList>

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
