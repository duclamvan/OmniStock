import { useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/login": "Login",
  "/register": "Register",
  "/orders": "Orders",
  "/orders/add": "Add Order",
  "/orders/pick-pack": "Pick & Pack",
  "/orders/to-fulfill": "To Fulfill",
  "/orders/shipped": "Shipped Orders",
  "/orders/pay-later": "Pay Later",
  "/orders/pre-orders": "Pre-Orders",
  "/orders/pre-orders/add": "Add Pre-Order",
  "/inventory": "Inventory",
  "/inventory/products": "Products",
  "/inventory/categories": "Categories",
  "/inventory/categories/add": "Add Category",
  "/inventory/bundles": "Bundles",
  "/inventory/bundles/create": "Create Bundle",
  "/inventory/products/add": "Add Product",
  "/customers": "Customers",
  "/customers/add": "Add Customer",
  "/suppliers": "Suppliers",
  "/suppliers/add": "Add Supplier",
  "/warehouse": "Warehouses",
  "/warehouse/add": "Add Warehouse",
  "/warehouse/dashboard": "Warehouse Dashboard",
  "/warehouse/map": "Warehouse Map",
  "/warehouse/map-new": "Warehouse Map",
  "/discounts": "Discounts",
  "/discounts/add": "Add Discount",
  "/returns": "Returns",
  "/returns/add": "Add Return",
  "/expenses": "Expenses",
  "/expenses/add": "Add Expense",
  "/services": "Services",
  "/services/add": "Add Service",
  "/tickets": "Tickets",
  "/tickets/add": "Add Ticket",
  "/notifications": "Notifications",
  "/pos": "Point of Sale",
  "/shipping": "Shipping",
  "/shipping/labels": "Shipping Labels",
  "/packing-materials": "Packing Materials",
  "/packing-materials/add": "Add Packing Material",
  "/packing-materials/bulk-add-cartons": "Bulk Add Cartons",
  "/files": "Files",
  "/imports": "Imports",
  "/imports/supplier-processing": "Supplier Processing",
  "/imports/create-purchase": "Create Purchase",
  "/imports/at-warehouse": "At Warehouse",
  "/imports/international-transit": "International Transit",
  "/imports/landing-cost": "Landing Cost",
  "/receiving": "Receiving",
  "/receiving/start": "Start Receiving",
  "/receiving/review-approve": "Review & Approve",
  "/reports": "Reports",
  "/reports/sales": "Sales Reports",
  "/reports/inventory": "Inventory Reports",
  "/reports/customers": "Customer Reports",
  "/reports/orders": "Order Reports",
  "/reports/expenses": "Expense Reports",
  "/settings": "Settings",
  "/settings/general": "General Settings",
  "/settings/shipping": "Shipping Settings",
  "/settings/orders": "Order Settings",
  "/settings/financial": "Financial Settings",
  "/settings/inventory": "Inventory Settings",
  "/settings/system": "System Settings",
  "/settings/roles": "Roles & Permissions",
  "/employees": "Employees",
  "/activity-log": "Activity Log",
  "/profile": "Profile",
  "/user-settings": "User Settings",
  "/stock": "Stock",
  "/stock/lookup": "Stock Lookup",
  "/stock/adjustments": "Stock Adjustments",
  "/stock/inconsistencies": "Stock Inconsistencies",
  "/terms-of-service": "Terms of Service",
  "/privacy-policy": "Privacy Policy",
};

function getPageTitle(pathname: string): string {
  if (routeTitles[pathname]) {
    return routeTitles[pathname];
  }
  
  const pathParts = pathname.split("/").filter(Boolean);
  
  if (pathParts.length >= 2) {
    const section = pathParts[0];
    const lastPart = pathParts[pathParts.length - 1];
    
    if (lastPart === "edit") {
      const sectionTitles: Record<string, string> = {
        orders: "Edit Order",
        customers: "Edit Customer",
        suppliers: "Edit Supplier",
        warehouse: "Edit Warehouse",
        discounts: "Edit Discount",
        returns: "Edit Return",
        expenses: "Edit Expense",
        tickets: "Edit Ticket",
        inventory: "Edit Product",
        "pre-orders": "Edit Pre-Order",
      };
      return sectionTitles[section] || "Edit";
    }
    
    if (/^\d+$/.test(lastPart) || /^[a-f0-9-]{36}$/i.test(lastPart)) {
      const sectionTitles: Record<string, string> = {
        orders: "Order Details",
        customers: "Customer Details",
        suppliers: "Supplier Details",
        warehouse: "Warehouse Details",
        discounts: "Discount Details",
        returns: "Return Details",
        expenses: "Expense Details",
        services: "Service Details",
        tickets: "Ticket Details",
        inventory: "Product Details",
        products: "Product Details",
        "pre-orders": "Pre-Order Details",
        employees: "Employee Details",
        categories: "Category Details",
        bundles: "Bundle Details",
        receiving: "Receipt Details",
      };
      
      if (pathParts.includes("inventory") && pathParts.includes("products")) {
        return "Product Details";
      }
      if (pathParts.includes("inventory") && pathParts.includes("categories")) {
        return "Category Details";
      }
      if (pathParts.includes("inventory") && pathParts.includes("bundles")) {
        return "Bundle Details";
      }
      
      return sectionTitles[section] || "Details";
    }
  }
  
  return "";
}

export function PageTitle() {
  const [location] = useLocation();
  const { t } = useTranslation();
  
  useEffect(() => {
    const title = getPageTitle(location);
    if (title) {
      document.title = `WMS Davie - ${title}`;
    } else {
      document.title = "WMS Davie";
    }
  }, [location]);
  
  return null;
}
