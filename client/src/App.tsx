import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { useLanguageSync } from "@/hooks/useLanguageSync";
// Removed auth imports
import { Layout } from "@/components/Layout";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";
// Removed Landing page import
import Home from "@/pages/Home";
import AllOrders from "@/pages/Orders/AllOrders";
import AddOrder from "@/pages/Orders/AddOrder";
import EditOrder from "@/pages/Orders/EditOrder";
import OrderDetails from "@/pages/Orders/OrderDetails";
import AllInventory from "@/pages/Inventory/AllInventory";
import ProductForm from "@/pages/Inventory/ProductForm";
import ProductDetails from "@/pages/Products/ProductDetails";
import Bundles from "@/pages/Inventory/SimpleBundles";
import CreateBundle from "@/pages/Inventory/CreateBundle";
import BundleDetails from "@/pages/Inventory/BundleDetails";
import EditBundle from "@/pages/Inventory/EditBundle";
import AllWarehouses from "@/pages/Warehouse/AllWarehouses";
import AddWarehouse from "@/pages/Warehouse/AddWarehouse";
import EditWarehouse from "@/pages/Warehouse/EditWarehouse";
import WarehouseDetails from "@/pages/Warehouse/WarehouseDetails";
import AllDiscounts from "@/pages/Discounts/AllDiscounts";
import AddDiscount from "@/pages/Discounts/AddDiscount";
import EditDiscount from "@/pages/Discounts/EditDiscount";
import AllCustomers from "@/pages/Customers/AllCustomers";
import AddCustomer from "@/pages/Customers/AddCustomer";
import EditCustomer from "@/pages/Customers/EditCustomer";
import CustomerDetails from "@/pages/Customers/CustomerDetails";
import AllSuppliers from "@/pages/Suppliers/AllSuppliers";
import AddSupplier from "@/pages/Suppliers/AddSupplier";
import EditSupplier from "@/pages/Suppliers/EditSupplier";
import SupplierDetails from "@/pages/Suppliers/SupplierDetails";
import AllReturns from "@/pages/Returns/AllReturns";
import AddReturn from "@/pages/Returns/AddReturn";
import EditReturn from "@/pages/Returns/EditReturn";
import ReturnDetails from "@/pages/Returns/ReturnDetails";
import AllExpenses from "@/pages/Expenses/AllExpenses";
import AddExpense from "@/pages/Expenses/AddExpense";
import EditExpense from "@/pages/Expenses/EditExpense";
import ExpenseDetails from "@/pages/Expenses/ExpenseDetails";
import Services from "@/pages/Services/Services";
import AddService from "@/pages/Services/AddService";
import ServiceDetails from "@/pages/Services/ServiceDetails";
import AllTickets from "@/pages/Tickets/AllTickets";
import AddTicket from "@/pages/Tickets/AddTicket";
import EditTicket from "@/pages/Tickets/EditTicket";
import TicketDetails from "@/pages/Tickets/TicketDetails";
import Notifications from "@/pages/Notifications";
import POS from "@/pages/POS/POS";
import AllPreOrders from "@/pages/PreOrders/AllPreOrders";
import AddPreOrder from "@/pages/PreOrders/AddPreOrder";
import EditPreOrder from "@/pages/PreOrders/EditPreOrder";
import PreOrderDetails from "@/pages/PreOrders/PreOrderDetails";
import Categories from "@/pages/Inventory/Categories";
import AddCategory from "@/pages/Inventory/AddCategory";
import EditCategory from "@/pages/Inventory/EditCategory";
import CategoryDetails from "@/pages/Inventory/CategoryDetails";
import WarehouseMap from "@/pages/WarehouseMap";
import WarehouseMapNew from "@/pages/Warehouse/WarehouseMapNew";
import PickPack from "@/pages/Orders/PickPack";
import ShippingManagement from "@/pages/Shipping/ShippingManagement";
import ShipmentLabels from "@/pages/Shipping/ShipmentLabels";
import PackingMaterials from "@/pages/PackingMaterials";
import AddPackingMaterial from "@/pages/PackingMaterials/AddPackingMaterial";
import EditPackingMaterial from "@/pages/PackingMaterials/EditPackingMaterial";
import Files from "@/pages/Files/Files";
// Import pages
import SupplierProcessing from "@/pages/Imports/SupplierProcessing";
import CreatePurchase from "@/pages/Imports/CreatePurchase";
import AtWarehouse from "@/pages/Imports/AtWarehouse";
import InternationalTransit from "@/pages/Imports/InternationalTransit";
import ImportKanbanDashboard from "@/pages/Imports/ImportKanbanDashboard";
import ReceivingList from "@/pages/Receiving/ReceivingList";
import StartReceiving from "@/pages/Receiving/StartReceiving";
import ReceiptDetails from "@/pages/Receiving/ReceiptDetails";
import ReviewApprove from "@/pages/Receiving/ReviewApprove";
import ItemsToStore from "@/pages/Receiving/ItemsToStore";
import Login from "@/pages/Auth/Login";
import Register from "@/pages/Auth/Register";
import ReportsIndex from "@/pages/Reports";
import CustomReport from "@/pages/Reports/CustomReport";
import Settings from "@/pages/Settings";
import UserManagement from "@/pages/UserManagement";
import Profile from "@/pages/Profile";
import UserSettings from "@/pages/UserSettings";
import StockLookup from "@/pages/Stock/StockLookup";
import StockAdjustmentApprovals from "@/pages/Stock/StockAdjustmentApprovals";
import OverAllocated from "@/pages/Stock/OverAllocated";
import UnderAllocated from "@/pages/Stock/UnderAllocated";
// Legacy imports - commented out
// import AllImports from "@/pages/Imports/AllImports";
// import AddImportOrder from "@/pages/Imports/AddImportOrder";
// import EditImportOrder from "@/pages/Imports/EditImportOrder";
// import ImportOrderDetails from "@/pages/Imports/ImportOrderDetails";
// import ReceiveImport from "@/pages/Imports/ReceiveImport";
// import ImportItemsTracking from "@/pages/Imports/ImportItemsTracking";
// import ConsolidatedView from "@/pages/Imports/ConsolidatedView";
// import ConsolidatedWarehouseView from "@/pages/Imports/ConsolidatedWarehouseView";
// import ShipmentTracking from "@/pages/Imports/ShipmentTracking";

// Removed lazy import to fix suspension errors

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Layout>
        <Route path="/">
          {() => <ProtectedRoute requireAdmin><Home /></ProtectedRoute>}
        </Route>
        <Route path="/orders">
          {() => <ProtectedRoute requireAdmin><AllOrders /></ProtectedRoute>}
        </Route>
        <Route path="/orders/add">
          {() => <ProtectedRoute requireAdmin><AddOrder /></ProtectedRoute>}
        </Route>
        <Route path="/orders/pick-pack" component={PickPack} />
        <Route path="/orders/to-fulfill">
          {() => <ProtectedRoute requireAdmin><AllOrders filter="to_fulfill" /></ProtectedRoute>}
        </Route>
        <Route path="/orders/shipped">
          {() => <ProtectedRoute requireAdmin><AllOrders filter="shipped" /></ProtectedRoute>}
        </Route>
        <Route path="/orders/pay-later">
          {() => <ProtectedRoute requireAdmin><AllOrders filter="pay_later" /></ProtectedRoute>}
        </Route>
        <Route path="/orders/pre-orders">
          {() => <ProtectedRoute requireAdmin><AllPreOrders /></ProtectedRoute>}
        </Route>
        <Route path="/orders/pre-orders/add">
          {() => <ProtectedRoute requireAdmin><AddPreOrder /></ProtectedRoute>}
        </Route>
        <Route path="/orders/pre-orders/:id/edit">
          {() => <ProtectedRoute requireAdmin><EditPreOrder /></ProtectedRoute>}
        </Route>
        <Route path="/orders/pre-orders/:id">
          {() => <ProtectedRoute requireAdmin><PreOrderDetails /></ProtectedRoute>}
        </Route>
        <Route path="/orders/:id/edit">
          {() => <ProtectedRoute requireAdmin><EditOrder /></ProtectedRoute>}
        </Route>
        <Route path="/orders/:id">
          {() => <ProtectedRoute requireAdmin><OrderDetails /></ProtectedRoute>}
        </Route>
        <Route path="/inventory">
          {() => <ProtectedRoute requireAdmin><AllInventory /></ProtectedRoute>}
        </Route>
        <Route path="/inventory/products">
          {() => <ProtectedRoute requireAdmin><AllInventory /></ProtectedRoute>}
        </Route>
        <Route path="/inventory/categories">
          {() => <ProtectedRoute requireAdmin><Categories /></ProtectedRoute>}
        </Route>
        <Route path="/inventory/categories/add">
          {() => <ProtectedRoute requireAdmin><AddCategory /></ProtectedRoute>}
        </Route>
        <Route path="/inventory/categories/:id/edit">
          {() => <ProtectedRoute requireAdmin><EditCategory /></ProtectedRoute>}
        </Route>
        <Route path="/inventory/categories/:id">
          {() => <ProtectedRoute requireAdmin><CategoryDetails /></ProtectedRoute>}
        </Route>
        <Route path="/inventory/bundles">
          {() => <ProtectedRoute requireAdmin><Bundles /></ProtectedRoute>}
        </Route>
        <Route path="/inventory/bundles/create">
          {() => <ProtectedRoute requireAdmin><CreateBundle /></ProtectedRoute>}
        </Route>
        <Route path="/inventory/bundles/:id/edit">
          {() => <ProtectedRoute requireAdmin><EditBundle /></ProtectedRoute>}
        </Route>
        <Route path="/inventory/bundles/:id">
          {() => <ProtectedRoute requireAdmin><BundleDetails /></ProtectedRoute>}
        </Route>
        <Route path="/inventory/products/:id">
          {() => <ProtectedRoute requireAdmin><ProductDetails /></ProtectedRoute>}
        </Route>
        <Route path="/products/:id">
          {() => <ProtectedRoute requireAdmin><ProductDetails /></ProtectedRoute>}
        </Route>
        <Route path="/inventory/add">
          {() => <ProtectedRoute requireAdmin><ProductForm /></ProtectedRoute>}
        </Route>
        <Route path="/inventory/:id/edit">
          {() => <ProtectedRoute requireAdmin><ProductForm /></ProtectedRoute>}
        </Route>
        <Route path="/inventory/products/edit/:id">
          {() => <ProtectedRoute requireAdmin><ProductForm /></ProtectedRoute>}
        </Route>
        <Route path="/packing-materials">
          {() => <ProtectedRoute requireAdmin><PackingMaterials /></ProtectedRoute>}
        </Route>
        <Route path="/packing-materials/add">
          {() => <ProtectedRoute requireAdmin><AddPackingMaterial /></ProtectedRoute>}
        </Route>
        <Route path="/packing-materials/edit/:id">
          {() => <ProtectedRoute requireAdmin><EditPackingMaterial /></ProtectedRoute>}
        </Route>
        <Route path="/warehouses">
          {() => <ProtectedRoute requireAdmin><AllWarehouses /></ProtectedRoute>}
        </Route>
        <Route path="/warehouses/add">
          {() => <ProtectedRoute requireAdmin><AddWarehouse /></ProtectedRoute>}
        </Route>
        <Route path="/warehouses/map">
          {() => <ProtectedRoute requireAdmin><WarehouseMap /></ProtectedRoute>}
        </Route>
        <Route path="/warehouses/:id/mapping">
          {() => <ProtectedRoute requireAdmin><WarehouseMap /></ProtectedRoute>}
        </Route>
        <Route path="/warehouses/:id/map">
          {() => <ProtectedRoute requireAdmin><WarehouseMapNew /></ProtectedRoute>}
        </Route>
        <Route path="/warehouses/:id/edit">
          {() => <ProtectedRoute requireAdmin><EditWarehouse /></ProtectedRoute>}
        </Route>
        <Route path="/warehouses/:id">
          {() => <ProtectedRoute requireAdmin><WarehouseDetails /></ProtectedRoute>}
        </Route>
        <Route path="/discounts">
          {() => <ProtectedRoute requireAdmin><AllDiscounts /></ProtectedRoute>}
        </Route>
        <Route path="/discounts/add">
          {() => <ProtectedRoute requireAdmin><AddDiscount /></ProtectedRoute>}
        </Route>
        <Route path="/discounts/:id/edit">
          {() => <ProtectedRoute requireAdmin><EditDiscount /></ProtectedRoute>}
        </Route>
        <Route path="/customers">
          {() => <ProtectedRoute requireAdmin><AllCustomers /></ProtectedRoute>}
        </Route>
        <Route path="/customers/add">
          {() => <ProtectedRoute requireAdmin><AddCustomer /></ProtectedRoute>}
        </Route>
        <Route path="/customers/:id/edit">
          {() => <ProtectedRoute requireAdmin><AddCustomer /></ProtectedRoute>}
        </Route>
        <Route path="/customers/:id">
          {() => <ProtectedRoute requireAdmin><CustomerDetails /></ProtectedRoute>}
        </Route>
        <Route path="/suppliers">
          {() => <ProtectedRoute requireAdmin><AllSuppliers /></ProtectedRoute>}
        </Route>
        <Route path="/suppliers/new">
          {() => <ProtectedRoute requireAdmin><AddSupplier /></ProtectedRoute>}
        </Route>
        <Route path="/suppliers/:id/edit">
          {() => <ProtectedRoute requireAdmin><EditSupplier /></ProtectedRoute>}
        </Route>
        <Route path="/suppliers/:id">
          {() => <ProtectedRoute requireAdmin><SupplierDetails /></ProtectedRoute>}
        </Route>
        <Route path="/returns">
          {() => <ProtectedRoute requireAdmin><AllReturns /></ProtectedRoute>}
        </Route>
        <Route path="/returns/add">
          {() => <ProtectedRoute requireAdmin><AddReturn /></ProtectedRoute>}
        </Route>
        <Route path="/returns/:id/edit">
          {() => <ProtectedRoute requireAdmin><EditReturn /></ProtectedRoute>}
        </Route>
        <Route path="/returns/:id">
          {() => <ProtectedRoute requireAdmin><ReturnDetails /></ProtectedRoute>}
        </Route>
        <Route path="/expenses">
          {() => <ProtectedRoute requireAdmin><AllExpenses /></ProtectedRoute>}
        </Route>
        <Route path="/expenses/add">
          {() => <ProtectedRoute requireAdmin><AddExpense /></ProtectedRoute>}
        </Route>
        <Route path="/expenses/edit/:id">
          {() => <ProtectedRoute requireAdmin><EditExpense /></ProtectedRoute>}
        </Route>
        <Route path="/expenses/:id">
          {() => <ProtectedRoute requireAdmin><ExpenseDetails /></ProtectedRoute>}
        </Route>
        <Route path="/services">
          {() => <ProtectedRoute requireAdmin><Services /></ProtectedRoute>}
        </Route>
        <Route path="/services/add">
          {() => <ProtectedRoute requireAdmin><AddService /></ProtectedRoute>}
        </Route>
        <Route path="/services/:id/edit">
          {() => <ProtectedRoute requireAdmin><AddService /></ProtectedRoute>}
        </Route>
        <Route path="/services/:id">
          {() => <ProtectedRoute requireAdmin><ServiceDetails /></ProtectedRoute>}
        </Route>
        <Route path="/tickets">
          {() => <ProtectedRoute requireAdmin><AllTickets /></ProtectedRoute>}
        </Route>
        <Route path="/tickets/add">
          {() => <ProtectedRoute requireAdmin><AddTicket /></ProtectedRoute>}
        </Route>
        <Route path="/tickets/edit/:id">
          {() => <ProtectedRoute requireAdmin><EditTicket /></ProtectedRoute>}
        </Route>
        <Route path="/tickets/:id">
          {() => <ProtectedRoute requireAdmin><TicketDetails /></ProtectedRoute>}
        </Route>
        <Route path="/notifications">
          {() => <ProtectedRoute requireAdmin><Notifications /></ProtectedRoute>}
        </Route>
        <Route path="/stock" component={StockLookup} />
        <Route path="/stock/approvals" component={StockAdjustmentApprovals} />
        <Route path="/stock/over-allocated" component={OverAllocated} />
        <Route path="/stock/under-allocated" component={UnderAllocated} />
        <Route path="/pos" component={POS} />
        <Route path="/shipping" component={ShippingManagement} />
        <Route path="/shipping/labels" component={ShipmentLabels} />
        <Route path="/files">
          {() => <ProtectedRoute requireAdmin><Files /></ProtectedRoute>}
        </Route>
        {/* Import Management Routes */}
        <Route path="/imports/kanban">
          {() => <ProtectedRoute requireAdmin><ImportKanbanDashboard /></ProtectedRoute>}
        </Route>
        <Route path="/purchase-orders/create">
          {() => <ProtectedRoute requireAdmin><CreatePurchase /></ProtectedRoute>}
        </Route>
        <Route path="/purchase-orders/edit/:id">
          {() => <ProtectedRoute requireAdmin><CreatePurchase /></ProtectedRoute>}
        </Route>
        <Route path="/purchase-orders">
          {() => <ProtectedRoute requireAdmin><SupplierProcessing /></ProtectedRoute>}
        </Route>
        <Route path="/consolidation">
          {() => <ProtectedRoute requireAdmin><AtWarehouse /></ProtectedRoute>}
        </Route>
        <Route path="/imports/international-transit">
          {() => <ProtectedRoute requireAdmin><InternationalTransit /></ProtectedRoute>}
        </Route>
        <Route path="/imports">
          {() => <ProtectedRoute requireAdmin><ImportKanbanDashboard /></ProtectedRoute>}
        </Route>
        {/* Receiving Routes */}
        <Route path="/receiving" component={ReceivingList} />
        <Route path="/receiving/storage" component={ItemsToStore} />
        <Route path="/receiving/start/:id" component={StartReceiving} />
        <Route path="/receiving/continue/:id" component={StartReceiving} />
        <Route path="/receiving/receipt/:id" component={StartReceiving} />
        <Route path="/receiving/details/:id" component={ReceiptDetails} />
        <Route path="/receiving/approve/:id" component={ReviewApprove} />
        {/* Reports Routes */}
        <Route path="/reports/custom">
          {() => <ProtectedRoute requireAdmin><CustomReport /></ProtectedRoute>}
        </Route>
        <Route path="/reports/financial">
          {() => <ProtectedRoute requireAdmin><ReportsIndex /></ProtectedRoute>}
        </Route>
        <Route path="/reports/sales">
          {() => <ProtectedRoute requireAdmin><ReportsIndex /></ProtectedRoute>}
        </Route>
        <Route path="/reports/inventory">
          {() => <ProtectedRoute requireAdmin><ReportsIndex /></ProtectedRoute>}
        </Route>
        <Route path="/reports/customers">
          {() => <ProtectedRoute requireAdmin><ReportsIndex /></ProtectedRoute>}
        </Route>
        <Route path="/reports/orders">
          {() => <ProtectedRoute requireAdmin><ReportsIndex /></ProtectedRoute>}
        </Route>
        <Route path="/reports/expenses">
          {() => <ProtectedRoute requireAdmin><ReportsIndex /></ProtectedRoute>}
        </Route>
        <Route path="/reports">
          {() => <ProtectedRoute requireAdmin><ReportsIndex /></ProtectedRoute>}
        </Route>
        {/* Profile Route - Accessible to all authenticated users */}
        <Route path="/profile" component={Profile} />
        {/* User Settings Route - Accessible to all authenticated users */}
        <Route path="/user-settings" component={UserSettings} />
        {/* Settings Routes */}
        <Route path="/settings">
          {() => <ProtectedRoute requireAdmin><Settings /></ProtectedRoute>}
        </Route>
        <Route path="/settings/general">
          {() => <ProtectedRoute requireAdmin><Settings /></ProtectedRoute>}
        </Route>
        <Route path="/settings/shipping">
          {() => <ProtectedRoute requireAdmin><Settings /></ProtectedRoute>}
        </Route>
        <Route path="/settings/orders">
          {() => <ProtectedRoute requireAdmin><Settings /></ProtectedRoute>}
        </Route>
        <Route path="/settings/financial">
          {() => <ProtectedRoute requireAdmin><Settings /></ProtectedRoute>}
        </Route>
        <Route path="/settings/inventory">
          {() => <ProtectedRoute requireAdmin><Settings /></ProtectedRoute>}
        </Route>
        <Route path="/settings/system">
          {() => <ProtectedRoute requireAdmin><Settings /></ProtectedRoute>}
        </Route>
        {/* User Management Route */}
        <Route path="/user-management">
          {() => <ProtectedRoute requireAdmin><UserManagement /></ProtectedRoute>}
        </Route>
      </Layout>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  // Enable scroll restoration for the entire app
  useScrollRestoration();
  
  // Sync language with settings
  useLanguageSync();
  
  return (
    <>
      <OfflineIndicator />
      <Toaster />
      <Router />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <TooltipProvider>
          <AppContent />
        </TooltipProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

export default App;