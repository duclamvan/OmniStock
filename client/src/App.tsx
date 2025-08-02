import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import AllOrders from "@/pages/Orders/AllOrders";
import AddOrder from "@/pages/Orders/AddOrder";
import AllInventory from "@/pages/Inventory/AllInventory";
import AddProduct from "@/pages/Inventory/AddProduct";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
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
          <Route path="/inventory" component={AllInventory} />
          <Route path="/inventory/add" component={AddProduct} />
          <Route path="/warehouse">
            {() => <div>Warehouse page coming soon</div>}
          </Route>
          <Route path="/sales">
            {() => <div>Sales page coming soon</div>}
          </Route>
          <Route path="/customers">
            {() => <div>Customers page coming soon</div>}
          </Route>
          <Route path="/reports">
            {() => <div>Reports page coming soon</div>}
          </Route>
          <Route path="/settings">
            {() => <div>Settings page coming soon</div>}
          </Route>
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <>
      <Toaster />
      {isAuthenticated && !isLoading ? (
        <Layout>
          <Router />
        </Layout>
      ) : (
        <Router />
      )}
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
