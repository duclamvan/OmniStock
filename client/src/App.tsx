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
import OrderDetails from "@/pages/Orders/OrderDetails";
import AllInventory from "@/pages/Inventory/AllInventory";
import AddProduct from "@/pages/Inventory/AddProduct";
import EditProduct from "@/pages/Inventory/EditProduct";
import ProductDetails from "@/pages/Products/ProductDetails";
import AllWarehouses from "@/pages/Warehouse/AllWarehouses";
import EditWarehouse from "@/pages/Warehouse/EditWarehouse";
import AllDiscounts from "@/pages/Discounts/AllDiscounts";
import EditDiscount from "@/pages/Discounts/EditDiscount";
import AllCustomers from "@/pages/Customers/AllCustomers";
import AddCustomer from "@/pages/Customers/AddCustomer";
import EditCustomer from "@/pages/Customers/EditCustomer";
import CustomerDetails from "@/pages/Customers/CustomerDetails";

function Router() {
  return (
    <Switch>
      <Layout>
        <Route path="/" component={Home} />
        <Route path="/orders" component={AllOrders} />
        <Route path="/orders/add" component={AddOrder} />
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
        <Route path="/orders/:id/edit" component={EditOrder} />
        <Route path="/orders/:id" component={OrderDetails} />
        <Route path="/inventory" component={AllInventory} />
        <Route path="/inventory/products" component={AllInventory} />
        <Route path="/inventory/products/:id" component={ProductDetails} />
        <Route path="/inventory/add" component={AddProduct} />
        <Route path="/inventory/:id/edit" component={EditProduct} />
        <Route path="/inventory/products/edit/:id" component={EditProduct} />
        <Route path="/warehouse" component={AllWarehouses} />
        <Route path="/warehouses/add">
          {() => <div>Add Warehouse page coming soon</div>}
        </Route>
        <Route path="/warehouses/:id/edit" component={EditWarehouse} />
        <Route path="/discounts" component={AllDiscounts} />
        <Route path="/discounts/add">
          {() => <div>Add Discount page coming soon</div>}
        </Route>
        <Route path="/discounts/:id/edit" component={EditDiscount} />
        <Route path="/customers" component={AllCustomers} />
        <Route path="/customers/add" component={AddCustomer} />
        <Route path="/customers/:id/edit" component={EditCustomer} />
        <Route path="/customers/:id" component={CustomerDetails} />
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
