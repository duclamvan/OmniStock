import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./replitAuth";
import { seedMockData } from "./mockData";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import {
  insertProductSchema,
  insertProductVariantSchema,
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

// Configure multer for image uploads
const storage_disk = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = 'public/images';
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_disk,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

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
      // Fetch exchange rates from free API
      const exchangeRateResponse = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json');
      const exchangeRates = await exchangeRateResponse.json();
      
      const metrics = await storage.getDashboardMetrics();
      const allOrders = await storage.getOrders();
      
      // Convert amount to EUR
      const convertToEur = (amount: number, currency: string): number => {
        if (!amount || !currency) return 0;
        if (currency === 'EUR') return amount;
        
        // Get the rate from the currency to EUR
        const currencyLower = currency.toLowerCase();
        if (exchangeRates.eur && exchangeRates.eur[currencyLower]) {
          // The API gives EUR to other currency rates, so we need to invert
          return amount / exchangeRates.eur[currencyLower];
        }
        
        // Fallback if rate not found
        console.warn(`Exchange rate not found for ${currency}`);
        return amount;
      };
      
      // Calculate metrics with currency conversion
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
      
      // Fulfill Orders Today: ALL orders with status "to_fulfill"
      const fulfillOrdersToday = allOrders.filter(order => order.orderStatus === 'to_fulfill').length;
      
      // Total Orders Today: Orders with status "shipped" that were marked as shipped TODAY
      const todayShippedOrders = allOrders.filter(order => {
        if (order.orderStatus !== 'shipped') return false;
        // Check if the order was updated today (marked as shipped today)
        const updatedDate = new Date(order.updatedAt || order.createdAt);
        return updatedDate >= today;
      });
      
      const thisMonthOrders = allOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= thisMonthStart && order.orderStatus === 'shipped';
      });
      
      const lastMonthOrders = allOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= lastMonthStart && orderDate <= lastMonthEnd && order.orderStatus === 'shipped';
      });
      
      // Calculate revenue in EUR (Revenue = Grand Total - Tax - Shipping Cost)
      const calculateRevenueInEur = (orders: any[]) => {
        return orders.reduce((sum, order) => {
          const grandTotal = parseFloat(order.grandTotal || '0');
          const tax = parseFloat(order.tax || '0');
          const shippingCost = parseFloat(order.shippingCost || '0');
          const revenue = grandTotal - tax - shippingCost;
          return sum + convertToEur(revenue, order.currency);
        }, 0);
      };
      
      // Calculate profit in EUR (Profit = Grand Total - Total Import Cost - Tax Amount - Discount Value)
      const calculateProfitInEur = async (orders: any[]) => {
        let totalProfit = 0;
        
        for (const order of orders) {
          if (order.orderStatus !== 'shipped' || order.paymentStatus !== 'paid') {
            continue; // Only calculate profit for completed orders
          }
          
          const grandTotal = parseFloat(order.grandTotal || '0');
          const taxAmount = parseFloat(order.taxAmount || '0');
          const discountValue = parseFloat(order.discountValue || '0');
          
          // Get order items to calculate import cost
          const orderItems = await storage.getOrderItems(order.id);
          let totalImportCost = 0;
          
          for (const item of orderItems) {
            const product = await storage.getProductById(item.productId);
            if (product) {
              const quantity = parseInt(item.quantity || '0');
              let importCost = 0;
              
              // Use import cost based on order currency
              if (order.currency === 'CZK' && product.importCostCzk) {
                importCost = parseFloat(product.importCostCzk);
              } else if (order.currency === 'EUR' && product.importCostEur) {
                importCost = parseFloat(product.importCostEur);
              } else if (product.importCostUsd) {
                // Convert USD to order currency, then to EUR
                const importCostUsd = parseFloat(product.importCostUsd);
                importCost = convertToEur(importCostUsd, 'USD');
              }
              
              totalImportCost += importCost * quantity;
            }
          }
          
          // Profit = Revenue - Import Costs - Tax - Discount
          const profit = grandTotal - totalImportCost - taxAmount - discountValue;
          totalProfit += convertToEur(profit, order.currency);
        }
        
        return totalProfit;
      };
      
      const metricsWithConversion = {
        fulfillOrdersToday,
        totalOrdersToday: todayShippedOrders.length,
        totalRevenueToday: calculateRevenueInEur(todayShippedOrders),
        totalProfitToday: await calculateProfitInEur(todayShippedOrders),
        thisMonthRevenue: calculateRevenueInEur(thisMonthOrders),
        thisMonthProfit: await calculateProfitInEur(thisMonthOrders),
        lastMonthRevenue: calculateRevenueInEur(lastMonthOrders),
        lastMonthProfit: await calculateProfitInEur(lastMonthOrders),
        exchangeRates: exchangeRates.eur
      };
      
      res.json(metricsWithConversion);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  app.get('/api/dashboard/financial-summary', async (req, res) => {
    try {
      // Fetch exchange rates from free API
      const exchangeRateResponse = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json');
      const exchangeRates = await exchangeRateResponse.json();
      
      const convertToEur = (amount: number, currency: string): number => {
        if (!amount || !currency) return 0;
        if (currency === 'EUR') return amount;
        
        const currencyLower = currency.toLowerCase();
        if (exchangeRates.eur && exchangeRates.eur[currencyLower]) {
          return amount / exchangeRates.eur[currencyLower];
        }
        
        return amount;
      };
      
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const allOrders = await storage.getOrders();
      
      // Generate monthly summary
      const monthlySummary = [];
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
        
        const monthOrders = allOrders.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= monthStart && orderDate <= monthEnd && order.orderStatus === 'shipped' && order.paymentStatus === 'paid';
        });
        
        // Separate orders by currency
        const czkOrders = monthOrders.filter(order => order.currency === 'CZK');
        const eurOrders = monthOrders.filter(order => order.currency === 'EUR');
        
        // Calculate revenue and profit for each currency
        const calculateRevenue = (orders: any[]) => {
          return orders.reduce((sum, order) => {
            const grandTotal = parseFloat(order.grandTotal || '0');
            const tax = parseFloat(order.tax || '0');
            const shippingCost = parseFloat(order.shippingCost || '0');
            return sum + (grandTotal - tax - shippingCost);
          }, 0);
        };
        
        const calculateProfit = (orders: any[]) => {
          return orders.reduce((sum, order) => {
            const grandTotal = parseFloat(order.grandTotal || '0');
            const totalCost = parseFloat(order.totalCost || '0');
            const tax = parseFloat(order.tax || '0');
            const discount = parseFloat(order.discount || '0');
            const shippingPaid = parseFloat(order.shippingCost || '0');
            const actualShippingCost = parseFloat(order.actualShippingCost || shippingPaid);
            return sum + (grandTotal - totalCost - tax - discount - (shippingPaid - actualShippingCost));
          }, 0);
        };
        
        const profitCzkOrders = calculateProfit(czkOrders);
        const revenueCzkOrders = calculateRevenue(czkOrders);
        const profitEurOrders = calculateProfit(eurOrders);
        const revenueEurOrders = calculateRevenue(eurOrders);
        
        // Calculate total in EUR
        const totalRevenueEur = monthOrders.reduce((sum, order) => {
          const grandTotal = parseFloat(order.grandTotal || '0');
          const tax = parseFloat(order.tax || '0');
          const shippingCost = parseFloat(order.shippingCost || '0');
          const revenue = grandTotal - tax - shippingCost;
          return sum + convertToEur(revenue, order.currency);
        }, 0);
        
        const totalProfitEur = monthOrders.reduce((sum, order) => {
          const grandTotal = parseFloat(order.grandTotal || '0');
          const totalCost = parseFloat(order.totalCost || '0');
          const tax = parseFloat(order.tax || '0');
          const discount = parseFloat(order.discount || '0');
          const shippingPaid = parseFloat(order.shippingCost || '0');
          const actualShippingCost = parseFloat(order.actualShippingCost || shippingPaid);
          const profit = grandTotal - totalCost - tax - discount - (shippingPaid - actualShippingCost);
          return sum + convertToEur(profit, order.currency);
        }, 0);
        
        // Convert EUR totals to CZK
        const eurToCzk = exchangeRates.eur?.czk || 25.0;
        const totalProfitCzk = totalProfitEur * eurToCzk;
        const totalRevenueCzk = totalRevenueEur * eurToCzk;
        
        monthlySummary.push({
          month: `${String(month + 1).padStart(2, '0')}-${String(year).slice(-2)}`,
          totalProfitEur,
          totalRevenueEur,
          profitCzkOrders,
          revenueCzkOrders,
          profitEurOrders,
          revenueEurOrders,
          totalProfitCzk,
          totalRevenueCzk,
          orderCount: monthOrders.length
        });
      }
      
      res.json(monthlySummary);
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

  // Image upload endpoint
  app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Return the public URL for the uploaded image
      const imageUrl = `/images/${req.file.filename}`;
      res.json({ imageUrl });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
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
        userId: "test-user",
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
        userId: "test-user",
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

  app.get('/api/warehouses/:id', async (req, res) => {
    try {
      const warehouse = await storage.getWarehouseById(req.params.id);
      if (!warehouse) {
        return res.status(404).json({ message: "Warehouse not found" });
      }
      res.json(warehouse);
    } catch (error) {
      console.error("Error fetching warehouse:", error);
      res.status(500).json({ message: "Failed to fetch warehouse" });
    }
  });

  app.patch('/api/warehouses/:id', async (req: any, res) => {
    try {
      const updates = req.body;
      const warehouse = await storage.updateWarehouse(req.params.id, updates);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'updated',
        entityType: 'warehouse',
        entityId: warehouse.id,
        description: `Updated warehouse: ${warehouse.name}`,
      });
      
      res.json(warehouse);
    } catch (error) {
      console.error("Error updating warehouse:", error);
      res.status(500).json({ message: "Failed to update warehouse" });
    }
  });

  app.delete('/api/warehouses/:id', async (req: any, res) => {
    try {
      const warehouse = await storage.getWarehouseById(req.params.id);
      if (!warehouse) {
        return res.status(404).json({ message: "Warehouse not found" });
      }
      
      await storage.deleteWarehouse(req.params.id);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'deleted',
        entityType: 'warehouse',
        entityId: req.params.id,
        description: `Deleted warehouse: ${warehouse.name}`,
      });
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting warehouse:", error);
      
      // Check if it's a foreign key constraint error
      if (error.code === '23503' || error.message?.includes('constraint')) {
        return res.status(409).json({ 
          message: "Cannot delete warehouse - it's being used by products" 
        });
      }
      
      res.status(500).json({ message: "Failed to delete warehouse" });
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
        userId: "test-user",
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
      const includeInactive = req.query.includeInactive === 'true';
      let products;
      
      if (search) {
        products = await storage.searchProducts(search, includeInactive);
      } else {
        products = await storage.getProducts(includeInactive);
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

  app.post('/api/products/order-counts', async (req, res) => {
    try {
      const { productIds } = req.body;
      if (!Array.isArray(productIds)) {
        return res.status(400).json({ message: "Product IDs must be an array" });
      }
      
      const orderCounts = await storage.getProductsOrderCounts(productIds);
      res.json(orderCounts);
    } catch (error) {
      console.error("Error fetching product order counts:", error);
      res.status(500).json({ message: "Failed to fetch product order counts" });
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
            userId: "test-user",
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
        userId: "test-user",
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
        userId: "test-user",
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

  app.delete('/api/products/:id', async (req: any, res) => {
    try {
      const product = await storage.getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      await storage.deleteProduct(req.params.id);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'deleted',
        entityType: 'product',
        entityId: req.params.id,
        description: `Deleted product: ${product.name}`,
      });
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting product:", error);
      
      // Check if it's a foreign key constraint error
      if (error.code === '23503' || error.message?.includes('constraint')) {
        return res.status(409).json({ 
          message: "Cannot delete product - it's being used in existing orders" 
        });
      }
      
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Product Variants
  app.get('/api/products/:productId/variants', async (req, res) => {
    try {
      const variants = await storage.getProductVariants(req.params.productId);
      res.json(variants);
    } catch (error) {
      console.error("Error fetching product variants:", error);
      res.status(500).json({ message: "Failed to fetch product variants" });
    }
  });

  app.post('/api/products/:productId/variants', async (req: any, res) => {
    try {
      const data = insertProductVariantSchema.parse({
        ...req.body,
        productId: req.params.productId
      });
      
      const variant = await storage.createProductVariant(data);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'created',
        entityType: 'product_variant',
        entityId: variant.id,
        description: `Created variant: ${variant.name}`,
      });
      
      res.json(variant);
    } catch (error) {
      console.error("Error creating product variant:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product variant" });
    }
  });

  app.patch('/api/products/:productId/variants/:id', async (req: any, res) => {
    try {
      const updates = req.body;
      const variant = await storage.updateProductVariant(req.params.id, updates);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'updated',
        entityType: 'product_variant',
        entityId: variant.id,
        description: `Updated variant: ${variant.name}`,
      });
      
      res.json(variant);
    } catch (error) {
      console.error("Error updating product variant:", error);
      res.status(500).json({ message: "Failed to update product variant" });
    }
  });

  app.delete('/api/products/:productId/variants/:id', async (req: any, res) => {
    try {
      await storage.deleteProductVariant(req.params.id);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'deleted',
        entityType: 'product_variant',
        entityId: req.params.id,
        description: `Deleted product variant`,
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product variant:", error);
      res.status(500).json({ message: "Failed to delete product variant" });
    }
  });

  // Bulk create product variants
  app.post('/api/products/:productId/variants/bulk', async (req: any, res) => {
    try {
      const { variants } = req.body;
      if (!Array.isArray(variants)) {
        return res.status(400).json({ message: "Variants must be an array" });
      }

      const createdVariants = [];
      for (const variantData of variants) {
        const data = insertProductVariantSchema.parse({
          ...variantData,
          productId: req.params.productId
        });
        
        const variant = await storage.createProductVariant(data);
        createdVariants.push(variant);
      }

      await storage.createUserActivity({
        userId: "test-user",
        action: 'created',
        entityType: 'product_variant',
        entityId: req.params.productId,
        description: `Created ${createdVariants.length} product variants`,
      });

      res.json(createdVariants);
    } catch (error) {
      console.error("Error creating product variants in bulk:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product variants" });
    }
  });

  // Bulk delete product variants
  app.post('/api/products/:productId/variants/bulk-delete', async (req: any, res) => {
    try {
      console.log("Bulk delete request body:", req.body);
      const { variantIds } = req.body;
      
      if (!variantIds || !Array.isArray(variantIds)) {
        return res.status(400).json({ message: "variantIds must be an array" });
      }

      if (variantIds.length === 0) {
        return res.status(400).json({ message: "No variant IDs provided" });
      }

      console.log(`Deleting ${variantIds.length} variants:`, variantIds);

      for (const variantId of variantIds) {
        await storage.deleteProductVariant(variantId);
      }

      await storage.createUserActivity({
        userId: "test-user",
        action: 'deleted',
        entityType: 'product_variant',
        entityId: req.params.productId,
        description: `Deleted ${variantIds.length} product variants`,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product variants in bulk:", error);
      res.status(500).json({ message: "Failed to delete product variants" });
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
        userId: "test-user",
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

  app.get('/api/customers/:id', async (req, res) => {
    try {
      const customer = await storage.getCustomerById(req.params.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.patch('/api/customers/:id', async (req: any, res) => {
    try {
      const updates = req.body;
      const customer = await storage.updateCustomer(req.params.id, updates);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'updated',
        entityType: 'customer',
        entityId: customer.id,
        description: `Updated customer: ${customer.name}`,
      });
      
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  app.delete('/api/customers/:id', async (req: any, res) => {
    try {
      const customer = await storage.getCustomerById(req.params.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      await storage.deleteCustomer(req.params.id);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'deleted',
        entityType: 'customer',
        entityId: req.params.id,
        description: `Deleted customer: ${customer.name}`,
      });
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting customer:", error);
      
      // Check if it's a foreign key constraint error
      if (error.code === '23503' || error.message?.includes('constraint')) {
        return res.status(409).json({ 
          message: "Cannot delete customer - they have existing orders" 
        });
      }
      
      res.status(500).json({ message: "Failed to delete customer" });
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
      
      // Order already includes items from getOrderById
      res.json(order);
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
        billerId: "test-user",
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
        userId: "test-user",
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
      const { items, ...orderUpdates } = req.body;
      
      console.log('PATCH /api/orders/:id - Full request body:', req.body);
      console.log('PATCH /api/orders/:id - customerId in orderUpdates:', orderUpdates.customerId);
      
      const updates = {
        ...orderUpdates,
        // Convert date strings to Date objects if present
        shippedAt: orderUpdates.shippedAt ? new Date(orderUpdates.shippedAt) : undefined,
      };
      
      // Remove undefined fields
      Object.keys(updates).forEach(key => 
        updates[key] === undefined && delete updates[key]
      );
      
      console.log('PATCH /api/orders/:id - Final updates object:', updates);
      console.log('PATCH /api/orders/:id - customerId in final updates:', updates.customerId);
      
      const order = await storage.updateOrder(req.params.id, updates);
      console.log('PATCH /api/orders/:id - Updated order returned:', order);
      
      // Update order items if provided
      if (items && Array.isArray(items)) {
        // Delete existing items and add new ones
        await storage.deleteOrderItems(req.params.id);
        
        // Add new items
        for (const item of items) {
          await storage.createOrderItem({
            orderId: req.params.id,
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            price: item.price.toString(),
            discount: item.discount?.toString() || '0',
            tax: item.tax?.toString() || '0',
            total: item.total.toString(),
          });
        }
      }
      
      await storage.createUserActivity({
        userId: "test-user",
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

  app.delete('/api/orders/:id', async (req: any, res) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      await storage.deleteOrder(req.params.id);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'delete',
        entityType: 'order',
        entityId: req.params.id,
        description: `Deleted order: ${order.orderId}`,
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting order:", error);
      res.status(500).json({ message: "Failed to delete order" });
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
        userId: "test-user",
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
        userId: "test-user",
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
        userId: "test-user",
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
  app.get('/api/discounts', async (req, res) => {
    try {
      const sales = await storage.getSales();
      res.json(sales);
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ message: "Failed to fetch sales" });
    }
  });

  app.post('/api/discounts', async (req: any, res) => {
    try {
      // Parse dates from strings to Date objects
      const body = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      };
      
      const data = insertSaleSchema.parse(body);
      const sale = await storage.createSale(data);
      
      await storage.createUserActivity({
        userId: "test-user",
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

  app.get('/api/discounts/:id', async (req, res) => {
    try {
      const sale = await storage.getSaleById(req.params.id);
      if (!sale) {
        return res.status(404).json({ message: "Sale not found" });
      }
      res.json(sale);
    } catch (error) {
      console.error("Error fetching sale:", error);
      res.status(500).json({ message: "Failed to fetch sale" });
    }
  });

  app.patch('/api/discounts/:id', async (req: any, res) => {
    try {
      // Parse dates from strings to Date objects
      const updates = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      };
      
      const sale = await storage.updateSale(req.params.id, updates);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'updated',
        entityType: 'sale',
        entityId: sale.id,
        description: `Updated sale: ${sale.name}`,
      });
      
      res.json(sale);
    } catch (error) {
      console.error("Error updating sale:", error);
      res.status(500).json({ message: "Failed to update sale" });
    }
  });

  app.delete('/api/discounts/:id', async (req: any, res) => {
    try {
      const sale = await storage.getSaleById(req.params.id);
      if (!sale) {
        return res.status(404).json({ message: "Sale not found" });
      }
      
      await storage.deleteSale(req.params.id);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'deleted',
        entityType: 'sale',
        entityId: req.params.id,
        description: `Deleted sale: ${sale.name}`,
      });
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting sale:", error);
      
      // Check if it's a foreign key constraint error
      if (error.code === '23503' || error.message?.includes('constraint')) {
        return res.status(409).json({ 
          message: "Cannot delete sale - it's being used by other records" 
        });
      }
      
      res.status(500).json({ message: "Failed to delete sale" });
    }
  });

  // Mock data endpoint (for development)
  app.post('/api/seed-mock-data', async (req, res) => {
    try {
      await seedMockData();
      res.json({ message: "Mock data seeded successfully" });
    } catch (error) {
      console.error("Error seeding mock data:", error);
      res.status(500).json({ message: "Failed to seed mock data" });
    }
  });

  app.post('/api/seed-comprehensive-data', async (req, res) => {
    try {
      const { seedComprehensiveData } = await import('./seedComprehensiveData');
      const result = await seedComprehensiveData();
      res.json(result);
    } catch (error) {
      console.error("Error seeding comprehensive data:", error);
      res.status(500).json({ message: "Failed to seed comprehensive data", error: error.message });
    }
  });

  // Fix order items endpoint
  app.post('/api/fix-order-items', async (req, res) => {
    try {
      const { addMissingOrderItems } = await import('./fixOrderItems');
      await addMissingOrderItems();
      res.json({ message: "Order items fixed successfully" });
    } catch (error) {
      console.error("Error fixing order items:", error);
      res.status(500).json({ message: "Failed to fix order items" });
    }
  });

  // Reports endpoints
  app.get('/api/reports/sales-summary', async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const orders = await storage.getOrders();
      
      // Filter orders by date range if provided
      let filteredOrders = orders;
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        filteredOrders = orders.filter(order => {
          const orderDate = new Date(order.createdAt!);
          return orderDate >= start && orderDate <= end;
        });
      }
      
      // Calculate summary
      const summary = {
        totalOrders: filteredOrders.length,
        totalRevenue: filteredOrders.reduce((sum, order) => sum + parseFloat(order.total || '0'), 0),
        averageOrderValue: filteredOrders.length > 0 ? 
          filteredOrders.reduce((sum, order) => sum + parseFloat(order.total || '0'), 0) / filteredOrders.length : 0,
        ordersByStatus: filteredOrders.reduce((acc, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        ordersByCurrency: filteredOrders.reduce((acc, order) => {
          acc[order.currency] = (acc[order.currency] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };
      
      res.json(summary);
    } catch (error) {
      console.error("Error generating sales summary:", error);
      res.status(500).json({ message: "Failed to generate sales summary" });
    }
  });

  app.get('/api/reports/inventory-summary', async (req, res) => {
    try {
      const products = await storage.getProducts();
      const warehouses = await storage.getWarehouses();
      
      const summary = {
        totalProducts: products.length,
        totalStockValue: products.reduce((sum, product) => {
          const price = parseFloat(product.sellingPriceCzk || '0');
          return sum + (price * (product.quantity || 0));
        }, 0),
        lowStockProducts: products.filter(p => (p.quantity || 0) < (p.minQuantity || 10)).length,
        outOfStockProducts: products.filter(p => (p.quantity || 0) === 0).length,
        productsByWarehouse: warehouses.map(warehouse => ({
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          productCount: products.filter(p => p.warehouseId === warehouse.id).length,
          totalStock: products
            .filter(p => p.warehouseId === warehouse.id)
            .reduce((sum, p) => sum + (p.quantity || 0), 0)
        })),
        productsByCategory: products.reduce((acc, product) => {
          const categoryId = product.categoryId || 'uncategorized';
          if (!acc[categoryId]) {
            acc[categoryId] = { count: 0, totalStock: 0 };
          }
          acc[categoryId].count++;
          acc[categoryId].totalStock += product.quantity || 0;
          return acc;
        }, {} as Record<string, { count: number; totalStock: number }>)
      };
      
      res.json(summary);
    } catch (error) {
      console.error("Error generating inventory summary:", error);
      res.status(500).json({ message: "Failed to generate inventory summary" });
    }
  });

  app.get('/api/reports/customer-analytics', async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      const orders = await storage.getOrders();
      
      // Calculate customer metrics
      const customerMetrics = customers.map(customer => {
        const customerOrders = orders.filter(o => o.customerId === customer.id);
        const totalSpent = customerOrders.reduce((sum, order) => sum + parseFloat(order.total || '0'), 0);
        const lastOrderDate = customerOrders.length > 0 ? 
          customerOrders.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())[0].createdAt : null;
        
        return {
          customerId: customer.id,
          customerName: customer.name,
          totalOrders: customerOrders.length,
          totalSpent,
          averageOrderValue: customerOrders.length > 0 ? totalSpent / customerOrders.length : 0,
          lastOrderDate
        };
      });
      
      // Sort by total spent
      customerMetrics.sort((a, b) => b.totalSpent - a.totalSpent);
      
      const analytics = {
        totalCustomers: customers.length,
        topCustomers: customerMetrics.slice(0, 10),
        customerSegments: {
          vip: customerMetrics.filter(c => c.totalSpent > 100000).length,
          regular: customerMetrics.filter(c => c.totalSpent > 10000 && c.totalSpent <= 100000).length,
          occasional: customerMetrics.filter(c => c.totalSpent <= 10000).length
        },
        averageCustomerValue: customerMetrics.length > 0 ?
          customerMetrics.reduce((sum, c) => sum + c.totalSpent, 0) / customerMetrics.length : 0
      };
      
      res.json(analytics);
    } catch (error) {
      console.error("Error generating customer analytics:", error);
      res.status(500).json({ message: "Failed to generate customer analytics" });
    }
  });

  app.get('/api/reports/financial-summary', async (req, res) => {
    try {
      const { year, month } = req.query;
      
      // Get financial data
      const orders = await storage.getOrders();
      const expenses = await storage.getExpenses();
      const purchases = await storage.getPurchases();
      
      // Filter by year/month if provided
      let filteredOrders = orders;
      let filteredExpenses = expenses;
      let filteredPurchases = purchases;
      
      if (year) {
        const yearNum = parseInt(year as string);
        filteredOrders = orders.filter(o => new Date(o.createdAt!).getFullYear() === yearNum);
        filteredExpenses = expenses.filter(e => new Date(e.date!).getFullYear() === yearNum);
        filteredPurchases = purchases.filter(p => new Date(p.createdAt!).getFullYear() === yearNum);
        
        if (month) {
          const monthNum = parseInt(month as string) - 1; // JS months are 0-indexed
          filteredOrders = filteredOrders.filter(o => new Date(o.createdAt!).getMonth() === monthNum);
          filteredExpenses = filteredExpenses.filter(e => new Date(e.date!).getMonth() === monthNum);
          filteredPurchases = filteredPurchases.filter(p => new Date(p.createdAt!).getMonth() === monthNum);
        }
      }
      
      // Calculate financial summary
      const revenue = filteredOrders
        .filter(o => o.status === 'shipped' || o.status === 'delivered')
        .reduce((sum, order) => sum + parseFloat(order.total || '0'), 0);
      
      const totalExpenses = filteredExpenses
        .filter(e => e.status === 'paid')
        .reduce((sum, expense) => sum + parseFloat(expense.amount || '0'), 0);
      
      const totalPurchases = filteredPurchases
        .reduce((sum, purchase) => {
          const qty = purchase.quantity || 0;
          const price = parseFloat(purchase.importPrice || '0');
          return sum + (qty * price);
        }, 0);
      
      const profit = revenue - totalExpenses - totalPurchases;
      
      const summary = {
        revenue,
        expenses: totalExpenses,
        purchases: totalPurchases,
        profit,
        profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
        expenseBreakdown: filteredExpenses.reduce((acc, expense) => {
          const category = expense.category || 'Other';
          acc[category] = (acc[category] || 0) + parseFloat(expense.amount || '0');
          return acc;
        }, {} as Record<string, number>),
        monthlyTrend: year ? getMonthlyTrend(orders, expenses, purchases, parseInt(year as string)) : []
      };
      
      res.json(summary);
    } catch (error) {
      console.error("Error generating financial summary:", error);
      res.status(500).json({ message: "Failed to generate financial summary" });
    }
  });

  // Helper function for monthly trend
  function getMonthlyTrend(orders: Order[], expenses: Expense[], purchases: Purchase[], year: number) {
    const months = Array.from({ length: 12 }, (_, i) => i);
    
    return months.map(month => {
      const monthOrders = orders.filter(o => 
        new Date(o.createdAt!).getFullYear() === year && 
        new Date(o.createdAt!).getMonth() === month
      );
      
      const monthExpenses = expenses.filter(e => 
        new Date(e.date!).getFullYear() === year && 
        new Date(e.date!).getMonth() === month
      );
      
      const monthPurchases = purchases.filter(p => 
        new Date(p.createdAt!).getFullYear() === year && 
        new Date(p.createdAt!).getMonth() === month
      );
      
      const revenue = monthOrders
        .filter(o => o.status === 'shipped' || o.status === 'delivered')
        .reduce((sum, order) => sum + parseFloat(order.total || '0'), 0);
      
      const totalExpenses = monthExpenses
        .filter(e => e.status === 'paid')
        .reduce((sum, expense) => sum + parseFloat(expense.amount || '0'), 0);
      
      const totalPurchases = monthPurchases
        .reduce((sum, purchase) => {
          const qty = purchase.quantity || 0;
          const price = parseFloat(purchase.importPrice || '0');
          return sum + (qty * price);
        }, 0);
      
      return {
        month: month + 1,
        revenue,
        expenses: totalExpenses,
        purchases: totalPurchases,
        profit: revenue - totalExpenses - totalPurchases
      };
    });
  }

  // Geocoding endpoint for address search
  app.get('/api/geocode', async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string' || q.length < 2) {
        return res.json([]);
      }

      // Using OpenStreetMap's Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` + 
        new URLSearchParams({
          q: q,
          format: 'json',
          addressdetails: '1',
          limit: '10',
          countrycodes: 'cz,de,at', // Limit to Czech Republic, Germany, Austria
        }),
        {
          headers: {
            'User-Agent': 'DavieSupply/1.0', // Required by Nominatim
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform the response to our format
      const suggestions = data.map((item: any) => {
        const address = item.address || {};
        const street = address.road || address.pedestrian || '';
        const houseNumber = address.house_number || '';
        const city = address.city || address.town || address.village || '';
        const zipCode = address.postcode || '';
        const country = address.country || '';
        
        // Build street with house number for formatted display
        let streetWithNumber = street;
        if (houseNumber && street) {
          // Check if the street already contains the house number to avoid duplication
          if (!street.includes(houseNumber)) {
            streetWithNumber = `${street} ${houseNumber}`;
          } else {
            streetWithNumber = street; // Street already contains house number
          }
        }
        
        // Create short formatted address: "Street Number, Postcode City, Country"
        let shortFormatted = '';
        if (streetWithNumber && zipCode && city) {
          shortFormatted = `${streetWithNumber}, ${zipCode} ${city}`;
          if (country) {
            shortFormatted += `, ${country}`;
          }
        } else {
          // Fallback to original display name if we can't build short format
          shortFormatted = item.display_name;
        }
        
        return {
          formatted: shortFormatted,
          street: streetWithNumber,  // Full street address with number for display
          streetOnly: street,  // Street name without house number
          houseNumber,
          city,
          state: address.state || '',
          zipCode,
          country,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
        };
      });

      res.json(suggestions);
    } catch (error) {
      console.error('Geocoding error:', error);
      res.status(500).json({ error: 'Failed to fetch addresses' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
