import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
// Removed auth imports
import { Layout } from "@/components/Layout";
import NotFound from "@/pages/not-found";
// Removed Landing page import
import Home from "@/pages/Home";
import AllOrders from "@/pages/Orders/AllOrders";
import AddOrder from "@/pages/Orders/AddOrder";
import EditOrder from "@/pages/Orders/EditOrder";
import AllInventory from "@/pages/Inventory/AllInventory";
import AddProduct from "@/pages/Inventory/AddProduct";
import EditProduct from "@/pages/Inventory/EditProduct";
import AllWarehouses from "@/pages/Warehouse/AllWarehouses";
import EditWarehouse from "@/pages/Warehouse/EditWarehouse";
import AllSales from "@/pages/Sales/AllSales";
import EditSale from "@/pages/Sales/EditSale";
import AllCustomers from "@/pages/Customers/AllCustomers";
import AddCustomer from "@/pages/Customers/AddCustomer";
import EditCustomer from "@/pages/Customers/EditCustomer";

function Router() {
  return (
    <Switch>
      <Layout>
        <Route path="/" component={Home} />
        <Route path="/orders" component={AllOrders} />
        <Route path="/orders/add" component={AddOrder} />
        <Route path="/orders/:id/edit" component={EditOrder} />
        <Route path="/orders/to-fulfill">
          {() => <AllOrders filter="to_fulfill" />}
        </Route>
        <Route path="/orders/shipped">
          {() => <AllOrders filter="shipped" />}
        </Route>
        <Route path="/orders/pay-later">
          {() => <AllOrders filter="pay_later" />}
        </Route>
        <Route path="/orders/pre-orders">
          {() => <div>Pre-orders page coming soon</div>}
        </Route>
        <Route path="/inventory" component={AllInventory} />
        <Route path="/inventory/add" component={AddProduct} />
        <Route path="/inventory/:id/edit" component={EditProduct} />
        <Route path="/warehouse" component={AllWarehouses} />
        <Route path="/warehouses/add">
          {() => <div>Add Warehouse page coming soon</div>}
        </Route>
        <Route path="/warehouses/:id/edit" component={EditWarehouse} />
        <Route path="/sales" component={AllSales} />
        <Route path="/sales/add">
          {() => <div>Add Sale page coming soon</div>}
        </Route>
        <Route path="/sales/:id/edit" component={EditSale} />
        <Route path="/customers" component={AllCustomers} />
        <Route path="/customers/add" component={AddCustomer} />
        <Route path="/customers/:id/edit" component={EditCustomer} />
        <Route path="/reports">
          {() => <div>Reports page coming soon</div>}
        </Route>
        <Route path="/settings">
          {() => <div>Settings page coming soon</div>}
        </Route>
      </Layout>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  return (
    <>
      <Toaster />
      <Router />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
