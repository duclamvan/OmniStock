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
import POS from "@/pages/POS/POS";
import Categories from "@/pages/Inventory/Categories";
import AddCategory from "@/pages/Inventory/AddCategory";
import EditCategory from "@/pages/Inventory/EditCategory";
import CategoryDetails from "@/pages/Inventory/CategoryDetails";
import WarehouseMap from "@/pages/WarehouseMap";
import PickPack from "@/pages/Orders/PickPack";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/orders" component={AllOrders} />
        <Route path="/orders/add" component={AddOrder} />
        <Route path="/orders/pick-pack" component={PickPack} />
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
        {/* Dynamic routes must come last */}
        <Route path="/orders/:id/edit" component={EditOrder} />
        <Route path="/orders/:id" component={OrderDetails} />
        <Route path="/inventory" component={AllInventory} />
        <Route path="/inventory/products" component={AllInventory} />
        <Route path="/inventory/categories" component={Categories} />
        <Route path="/inventory/categories/add" component={AddCategory} />
        <Route path="/inventory/categories/:id/edit" component={EditCategory} />
        <Route path="/inventory/categories/:id" component={CategoryDetails} />
        <Route path="/inventory/bundles" component={Bundles} />
        <Route path="/inventory/bundles/create" component={CreateBundle} />
        <Route path="/inventory/bundles/:id/edit" component={EditBundle} />
        <Route path="/inventory/bundles/:id" component={BundleDetails} />
        <Route path="/inventory/products/:id" component={ProductDetails} />
        <Route path="/products/:id" component={ProductDetails} />
        <Route path="/inventory/add" component={AddProduct} />
        <Route path="/inventory/:id/edit" component={EditProduct} />
        <Route path="/inventory/products/edit/:id" component={EditProduct} />
        <Route path="/warehouses" component={AllWarehouses} />
        <Route path="/warehouses/add" component={AddWarehouse} />
        <Route path="/warehouses/map" component={WarehouseMap} />
        <Route path="/warehouses/:id/mapping" component={WarehouseMap} />
        <Route path="/warehouses/:id/edit" component={EditWarehouse} />
        <Route path="/warehouses/:id" component={WarehouseDetails} />
        <Route path="/discounts" component={AllDiscounts} />
        <Route path="/discounts/add" component={AddDiscount} />
        <Route path="/discounts/:id/edit" component={EditDiscount} />
        <Route path="/customers" component={AllCustomers} />
        <Route path="/customers/add" component={AddCustomer} />
        <Route path="/customers/:id/edit" component={EditCustomer} />
        <Route path="/customers/:id" component={CustomerDetails} />
        <Route path="/suppliers" component={AllSuppliers} />
        <Route path="/suppliers/new" component={AddSupplier} />
        <Route path="/suppliers/:id/edit" component={EditSupplier} />
        <Route path="/suppliers/:id" component={SupplierDetails} />
        <Route path="/returns" component={AllReturns} />
        <Route path="/returns/add" component={AddReturn} />
        <Route path="/returns/:id/edit" component={EditReturn} />
        <Route path="/returns/:id" component={ReturnDetails} />
        <Route path="/expenses" component={AllExpenses} />
        <Route path="/expenses/add" component={AddExpense} />
        <Route path="/expenses/edit/:id" component={EditExpense} />
        <Route path="/expenses/:id" component={ExpenseDetails} />
        <Route path="/pos" component={POS} />
        <Route path="/reports">
          {() => <div>Reports page coming soon</div>}
        </Route>
        <Route path="/settings">
          {() => <div>Settings page coming soon</div>}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
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
