import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./replitAuth";
import {
  insertProductSchema,
  insertOrderSchema,
  insertCustomerSchema,
  insertCategorySchema,
  insertWarehouseSchema,
  insertSupplierSchema,
  insertExpenseSchema,
  insertPreOrderSchema,
  insertSaleSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware (disabled for testing)
  // await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    // Return mock user for testing without auth
    res.json({
      id: "test-user",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User"
    });
  });

  // Dashboard endpoints
  app.get('/api/dashboard/metrics', async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  app.get('/api/dashboard/financial-summary', async (req, res) => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const summary = await storage.getMonthlyFinancialSummary(year);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching financial summary:", error);
      res.status(500).json({ message: "Failed to fetch financial summary" });
    }
  });

  app.get('/api/dashboard/activities', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const activities = await storage.getUserActivities(limit);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching user activities:", error);
      res.status(500).json({ message: "Failed to fetch user activities" });
    }
  });

  // Categories endpoints
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post('/api/categories', async (req: any, res) => {
    try {
      const data = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(data);
      
      // Log activity
      await storage.createUserActivity({
        userId: String(req.user.claims.sub),
        action: 'created',
        entityType: 'category',
        entityId: category.id,
        description: `Created category: ${category.name}`,
      });
      
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Warehouses endpoints
  app.get('/api/warehouses', async (req, res) => {
    try {
      const warehouses = await storage.getWarehouses();
      res.json(warehouses);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      res.status(500).json({ message: "Failed to fetch warehouses" });
    }
  });

  app.post('/api/warehouses', async (req: any, res) => {
    try {
      const data = insertWarehouseSchema.parse(req.body);
      const warehouse = await storage.createWarehouse(data);
      
      await storage.createUserActivity({
        userId: String(req.user.claims.sub),
        action: 'created',
        entityType: 'warehouse',
        entityId: warehouse.id,
        description: `Created warehouse: ${warehouse.name}`,
      });
      
      res.json(warehouse);
    } catch (error) {
      console.error("Error creating warehouse:", error);
      res.status(500).json({ message: "Failed to create warehouse" });
    }
  });

  // Suppliers endpoints
  app.get('/api/suppliers', async (req, res) => {
    try {
      const suppliers = await storage.getSuppliers();
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.post('/api/suppliers', async (req: any, res) => {
    try {
      const data = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(data);
      
      await storage.createUserActivity({
        userId: String(req.user.claims.sub),
        action: 'created',
        entityType: 'supplier',
        entityId: supplier.id,
        description: `Created supplier: ${supplier.name}`,
      });
      
      res.json(supplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      res.status(500).json({ message: "Failed to create supplier" });
    }
  });

  // Products endpoints
  app.get('/api/products', async (req, res) => {
    try {
      const search = req.query.search as string;
      let products;
      
      if (search) {
        products = await storage.searchProducts(search);
      } else {
        products = await storage.getProducts();
      }
      
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/products/low-stock', async (req, res) => {
    try {
      const products = await storage.getLowStockProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching low stock products:", error);
      res.status(500).json({ message: "Failed to fetch low stock products" });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    try {
      const product = await storage.getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post('/api/products', async (req: any, res) => {
    try {
      const data = insertProductSchema.parse(req.body);
      
      // Check if product with same name and SKU exists
      if (data.sku) {
        const existingProduct = await storage.getProductBySku(data.sku);
        if (existingProduct && existingProduct.name === data.name) {
          // Calculate average import cost
          const importCurrency = data.importCostUsd ? 'USD' : data.importCostCzk ? 'CZK' : 'EUR';
          const importCost = parseFloat(data.importCostUsd || data.importCostCzk || data.importCostEur || '0');
          const newCosts = await storage.calculateAverageImportCost(
            existingProduct,
            data.quantity || 0,
            importCost,
            importCurrency
          );
          
          // Update existing product
          const updatedProduct = await storage.updateProduct(existingProduct.id, {
            quantity: (existingProduct.quantity || 0) + (data.quantity || 0),
            ...newCosts,
          });
          
          await storage.createUserActivity({
            userId: String(req.user.claims.sub),
            action: 'updated',
            entityType: 'product',
            entityId: updatedProduct.id,
            description: `Added ${data.quantity} units to existing product: ${updatedProduct.name}`,
          });
          
          return res.json(updatedProduct);
        }
      }
      
      const product = await storage.createProduct(data);
      
      await storage.createUserActivity({
        userId: String(req.user.claims.sub),
        action: 'created',
        entityType: 'product',
        entityId: product.id,
        description: `Created product: ${product.name}`,
      });
      
      res.json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.patch('/api/products/:id', async (req: any, res) => {
    try {
      const updates = req.body;
      const product = await storage.updateProduct(req.params.id, updates);
      
      await storage.createUserActivity({
        userId: String(req.user.claims.sub),
        action: 'updated',
        entityType: 'product',
        entityId: product.id,
        description: `Updated product: ${product.name}`,
      });
      
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  // Customers endpoints
  app.get('/api/customers', async (req, res) => {
    try {
      const search = req.query.search as string;
      let customers;
      
      if (search) {
        customers = await storage.searchCustomers(search);
      } else {
        customers = await storage.getCustomers();
      }
      
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.post('/api/customers', async (req: any, res) => {
    try {
      const data = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(data);
      
      await storage.createUserActivity({
        userId: String(req.user.claims.sub),
        action: 'created',
        entityType: 'customer',
        entityId: customer.id,
        description: `Created customer: ${customer.name}`,
      });
      
      res.json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  // Orders endpoints
  app.get('/api/orders', async (req, res) => {
    try {
      const status = req.query.status as string;
      const paymentStatus = req.query.paymentStatus as string;
      
      let orders;
      if (status) {
        orders = await storage.getOrdersByStatus(status);
      } else if (paymentStatus) {
        orders = await storage.getOrdersByPaymentStatus(paymentStatus);
      } else {
        orders = await storage.getOrders();
      }
      
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get('/api/orders/unpaid', async (req, res) => {
    try {
      const orders = await storage.getUnpaidOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching unpaid orders:", error);
      res.status(500).json({ message: "Failed to fetch unpaid orders" });
    }
  });

  app.get('/api/orders/:id', async (req, res) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      const items = await storage.getOrderItems(req.params.id);
      res.json({ ...order, items });
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.post('/api/orders', async (req: any, res) => {
    try {
      const { items, ...orderData } = req.body;
      
      // Generate order ID
      const orderId = await storage.generateOrderId();
      
      const data = insertOrderSchema.parse({
        ...orderData,
        orderId,
        billerId: req.user.claims.sub,
      });
      
      const order = await storage.createOrder(data);
      
      // Create order items
      if (items && items.length > 0) {
        for (const item of items) {
          await storage.createOrderItem({
            orderId: order.id,
            ...item,
          });
        }
      }
      
      await storage.createUserActivity({
        userId: String(req.user.claims.sub),
        action: 'create',
        entityType: 'order',
        entityId: order.id,
        description: `Created order: ${order.orderId}`,
      });
      
      res.json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.patch('/api/orders/:id', async (req: any, res) => {
    try {
      const updates = req.body;
      const order = await storage.updateOrder(req.params.id, updates);
      
      await storage.createUserActivity({
        userId: String(req.user.claims.sub),
        action: 'update',
        entityType: 'order',
        entityId: order.id,
        description: `Updated order: ${order.orderId}`,
      });
      
      res.json(order);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  // Generate SKU endpoint
  app.post('/api/generate-sku', async (req, res) => {
    try {
      const { categoryName, productName } = req.body;
      if (!categoryName || !productName) {
        return res.status(400).json({ message: "Category name and product name are required" });
      }
      
      const sku = await storage.generateSKU(categoryName, productName);
      res.json({ sku });
    } catch (error) {
      console.error("Error generating SKU:", error);
      res.status(500).json({ message: "Failed to generate SKU" });
    }
  });

  // Pre-orders endpoints
  app.get('/api/pre-orders', async (req, res) => {
    try {
      const preOrders = await storage.getPreOrders();
      res.json(preOrders);
    } catch (error) {
      console.error("Error fetching pre-orders:", error);
      res.status(500).json({ message: "Failed to fetch pre-orders" });
    }
  });

  app.post('/api/pre-orders', async (req: any, res) => {
    try {
      const data = insertPreOrderSchema.parse(req.body);
      const preOrder = await storage.createPreOrder(data);
      
      await storage.createUserActivity({
        userId: String(req.user.claims.sub),
        action: 'create',
        entityType: 'pre-order',
        entityId: preOrder.id,
        description: `Created pre-order for: ${preOrder.customerName}`,
      });
      
      res.json(preOrder);
    } catch (error) {
      console.error("Error creating pre-order:", error);
      res.status(500).json({ message: "Failed to create pre-order" });
    }
  });

  app.delete('/api/pre-orders/:id', async (req: any, res) => {
    try {
      await storage.deletePreOrder(req.params.id);
      
      await storage.createUserActivity({
        userId: String(req.user.claims.sub),
        action: 'delete',
        entityType: 'pre-order',
        entityId: req.params.id,
        description: `Deleted pre-order`,
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting pre-order:", error);
      res.status(500).json({ message: "Failed to delete pre-order" });
    }
  });

  // Expenses endpoints
  app.get('/api/expenses', async (req, res) => {
    try {
      const expenses = await storage.getExpenses();
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post('/api/expenses', async (req: any, res) => {
    try {
      const data = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(data);
      
      await storage.createUserActivity({
        userId: String(req.user.claims.sub),
        action: 'create',
        entityType: 'expense',
        entityId: expense.id,
        description: `Created expense: ${expense.name}`,
      });
      
      res.json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  // Sales/Discounts endpoints
  app.get('/api/sales', async (req, res) => {
    try {
      const sales = await storage.getSales();
      res.json(sales);
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ message: "Failed to fetch sales" });
    }
  });

  app.post('/api/sales', async (req: any, res) => {
    try {
      const data = insertSaleSchema.parse(req.body);
      const sale = await storage.createSale(data);
      
      await storage.createUserActivity({
        userId: String(req.user.claims.sub),
        action: 'create',
        entityType: 'sale',
        entityId: sale.id,
        description: `Created sale: ${sale.name}`,
      });
      
      res.json(sale);
    } catch (error) {
      console.error("Error creating sale:", error);
      res.status(500).json({ message: "Failed to create sale" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
