import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./replitAuth";
import { seedMockData } from "./mockData";
import { cacheMiddleware, invalidateCache } from "./cache";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import {
  insertCategorySchema,
  insertCustomerSchema,
  insertSupplierSchema,
  insertProductSchema,
  insertProductLocationSchema,
  insertProductTieredPricingSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertDiscountSchema,
  insertExpenseSchema,
  insertServiceSchema,
  insertUserActivitySchema,
  insertPreOrderSchema,
  insertPreOrderItemSchema,
  productCostHistory,
  products,
  productLocations,
  purchaseItems,
  receipts,
  receiptItems,
} from "@shared/schema";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
// import { locationsRouter } from "./routes/locations";
// import { putawayRouter } from "./routes/putaway";
// import { importOrdersRouter } from "./routes/importOrders";
import imports from './routes/imports';
import optimizeDb from './routes/optimize-db';
import { weightCalculationService } from "./services/weightCalculation";
import { ImageCompressionService } from "./services/imageCompression";
import { optimizeCartonPacking } from "./services/cartonPackingService";

// Configure multer for image uploads with memory storage for compression
const upload = multer({ 
  storage: multer.memoryStorage(), // Use memory storage for compression
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|avif/;
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

  // Dashboard endpoints with caching
  app.get('/api/dashboard/metrics', cacheMiddleware(60000), async (req, res) => {
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

  app.get('/api/dashboard/financial-summary', cacheMiddleware(60000), async (req, res) => {
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

  app.get('/api/dashboard/activities', cacheMiddleware(30000), async (req, res) => {
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
      
      // Ensure upload directory exists
      const uploadDir = 'public/images';
      await fs.mkdir(uploadDir, { recursive: true });
      
      // Generate unique filename with webp extension
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const outputFilename = uniqueSuffix + '.webp';
      const outputPath = path.join(uploadDir, outputFilename);
      
      // Compress image with lossless compression
      const compressionResult = await ImageCompressionService.compressImageBuffer(
        req.file.buffer,
        {
          format: 'webp',
          lossless: true,
          quality: 95,
          maxWidth: 2048,
          maxHeight: 2048
        }
      );
      
      // Save compressed image
      await fs.writeFile(outputPath, compressionResult.buffer);
      
      // Generate thumbnail
      const thumbnailFilename = uniqueSuffix + '_thumb.webp';
      const thumbnailPath = path.join(uploadDir, thumbnailFilename);
      
      // Create thumbnail from compressed buffer
      const thumbnailBuffer = await ImageCompressionService.compressImageBuffer(
        compressionResult.buffer,
        {
          format: 'webp',
          quality: 85,
          maxWidth: 200,
          maxHeight: 200
        }
      );
      
      await fs.writeFile(thumbnailPath, thumbnailBuffer.buffer);
      
      // Log compression stats
      console.log(`Image compressed: ${req.file.originalname}`);
      console.log(`Original size: ${(req.file.size / 1024).toFixed(2)} KB`);
      console.log(`Compressed size: ${(compressionResult.compressedSize / 1024).toFixed(2)} KB`);
      console.log(`Compression ratio: ${compressionResult.compressionRatio.toFixed(2)}%`);
      
      // Return URLs and compression info
      res.json({ 
        imageUrl: `/images/${outputFilename}`,
        thumbnailUrl: `/images/${thumbnailFilename}`,
        compressionInfo: {
          originalSize: req.file.size,
          compressedSize: compressionResult.compressedSize,
          compressionRatio: compressionResult.compressionRatio.toFixed(2) + '%',
          format: 'webp'
        }
      });
    } catch (error) {
      console.error("Error uploading and compressing file:", error);
      res.status(500).json({ message: "Failed to upload and compress file" });
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

  app.get('/api/categories/:id', async (req, res) => {
    try {
      // Validate ID is a number
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      
      const category = await storage.getCategoryById(id.toString());
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Error fetching category:", error);
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  app.patch('/api/categories/:id', async (req: any, res) => {
    try {
      const updates = req.body;
      const category = await storage.updateCategory(req.params.id, updates);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'updated',
        entityType: 'category',
        entityId: category.id,
        description: `Updated category: ${category.name}`,
      });
      
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete('/api/categories/:id', async (req: any, res) => {
    try {
      const category = await storage.getCategoryById(req.params.id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      // Check if category has products
      const products = await storage.getProducts();
      const hasProducts = products.some(p => p.categoryId === req.params.id);
      
      if (hasProducts) {
        return res.status(409).json({ 
          message: "Cannot delete category - it contains products" 
        });
      }
      
      await storage.deleteCategory(req.params.id);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'deleted',
        entityType: 'category',
        entityId: req.params.id,
        description: `Deleted category: ${category.name}`,
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
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

  // Add warehouse map files route (must be before :id route)
  app.get('/api/warehouses/map/files', async (req, res) => {
    try {
      // Return empty array for now as warehouse maps are stored elsewhere
      res.json([]);
    } catch (error) {
      console.error("Error fetching warehouse map files:", error);
      res.status(500).json({ message: "Failed to fetch warehouse map files" });
    }
  });

  app.get('/api/warehouses/:id', async (req, res) => {
    try {
      const warehouse = await storage.getWarehouse(req.params.id);
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
      const warehouse = await storage.getWarehouse(req.params.id);
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

  // Get products in a warehouse
  app.get('/api/warehouses/:id/products', async (req, res) => {
    try {
      // Return empty array for now - products functionality not fully implemented
      res.json([]);
    } catch (error) {
      console.error("Error fetching warehouse products:", error);
      res.status(500).json({ message: "Failed to fetch warehouse products" });
    }
  });

  // Warehouse file management endpoints
  app.get('/api/warehouses/:id/files', async (req, res) => {
    try {
      // Return empty array for now - warehouse files functionality not fully implemented
      res.json([]);
    } catch (error) {
      console.error("Error fetching warehouse files:", error);
      res.status(500).json({ message: "Failed to fetch warehouse files" });
    }
  });

  app.post('/api/warehouses/:id/files', async (req: any, res) => {
    try {
      const { fileName, fileType, fileUrl, fileSize } = req.body;
      
      if (!fileName || !fileUrl) {
        return res.status(400).json({ message: "fileName and fileUrl are required" });
      }

      const file = await storage.createWarehouseFile({
        warehouseId: req.params.id,
        fileName,
        fileType: fileType || 'application/octet-stream',
        fileUrl,
        fileSize: fileSize || 0,
      });

      await storage.createUserActivity({
        userId: "test-user",
        action: 'created',
        entityType: 'warehouse_file',
        entityId: file.id,
        description: `Added file to warehouse: ${fileName}`,
      });

      res.json(file);
    } catch (error) {
      console.error("Error creating warehouse file:", error);
      res.status(500).json({ message: "Failed to create warehouse file" });
    }
  });

  app.delete('/api/warehouse-files/:id', async (req: any, res) => {
    try {
      const file = await storage.getWarehouseFileById(req.params.id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      await storage.deleteWarehouseFile(req.params.id);

      await storage.createUserActivity({
        userId: "test-user",
        action: 'deleted',
        entityType: 'warehouse_file',
        entityId: req.params.id,
        description: `Deleted warehouse file: ${file.fileName}`,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting warehouse file:", error);
      res.status(500).json({ message: "Failed to delete warehouse file" });
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

  app.get('/api/suppliers/:id', async (req, res) => {
    try {
      const supplier = await storage.getSupplierById(req.params.id);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      console.error("Error fetching supplier:", error);
      res.status(500).json({ message: "Failed to fetch supplier" });
    }
  });

  app.post('/api/suppliers', async (req: any, res) => {
    try {
      // Define supplier schema inline since we're not using a separate suppliers table
      const supplierSchema = z.object({
        name: z.string(),
        location: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        notes: z.string().optional()
      });
      
      const data = supplierSchema.parse(req.body);
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

  app.patch('/api/suppliers/:id', async (req: any, res) => {
    try {
      const supplier = await storage.updateSupplier(req.params.id, req.body);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'updated',
        entityType: 'supplier',
        entityId: supplier.id,
        description: `Updated supplier: ${supplier.name}`,
      });
      
      res.json(supplier);
    } catch (error) {
      console.error("Error updating supplier:", error);
      res.status(500).json({ message: "Failed to update supplier" });
    }
  });

  app.delete('/api/suppliers/:id', async (req: any, res) => {
    try {
      const supplier = await storage.getSupplierById(req.params.id);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      await storage.deleteSupplier(req.params.id);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'deleted',
        entityType: 'supplier',
        entityId: req.params.id,
        description: `Deleted supplier: ${supplier.name}`,
      });
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting supplier:", error);
      
      // Check if it's a foreign key constraint error
      if (error.code === '23503' || error.message?.includes('constraint')) {
        return res.status(409).json({ 
          message: "Cannot delete supplier - it's being used by products" 
        });
      }
      
      res.status(500).json({ message: "Failed to delete supplier" });
    }
  });

  // Supplier Files endpoints
  app.get('/api/suppliers/:id/files', async (req, res) => {
    try {
      const files = await storage.getSupplierFiles(req.params.id);
      res.json(files);
    } catch (error) {
      console.error("Error fetching supplier files:", error);
      res.status(500).json({ message: "Failed to fetch supplier files" });
    }
  });

  // Generic object upload endpoint
  app.post('/api/objects/upload', async (req: any, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  app.post('/api/suppliers/:id/files/upload', async (req: any, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  app.post('/api/suppliers/:id/files', async (req: any, res) => {
    try {
      const { fileName, fileType, fileUrl, fileSize } = req.body;
      
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        fileUrl,
        {
          owner: "test-user",
          visibility: "private",
        }
      );

      const fileData = {
        supplierId: req.params.id,
        fileName,
        fileType,
        fileUrl: objectPath,
        fileSize,
        uploadedBy: "test-user",
      };

      const file = await storage.createSupplierFile(fileData);
      res.json(file);
    } catch (error) {
      console.error("Error creating supplier file:", error);
      res.status(500).json({ message: "Failed to create supplier file" });
    }
  });

  app.delete('/api/suppliers/:id/files/:fileId', async (req: any, res) => {
    try {
      await storage.deleteSupplierFile(req.params.fileId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting supplier file:", error);
      res.status(500).json({ message: "Failed to delete supplier file" });
    }
  });

  // Serve private objects
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: "test-user",
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Product Bundles endpoints
  app.get('/api/bundles', async (req, res) => {
    try {
      const bundles = await storage.getBundles();
      res.json(bundles);
    } catch (error) {
      console.error("Error fetching bundles:", error);
      res.status(500).json({ message: "Failed to fetch bundles" });
    }
  });

  app.get('/api/bundles/:id', async (req, res) => {
    try {
      const bundle = await storage.getBundleById(req.params.id);
      if (!bundle) {
        return res.status(404).json({ message: "Bundle not found" });
      }
      
      // Fetch bundle items with product and variant details
      const items = await storage.getBundleItems(req.params.id);
      const itemsWithDetails = await Promise.all(items.map(async (item) => {
        const product = await storage.getProductById(item.productId);
        let variant = null;
        if (item.variantId) {
          const variants = await storage.getProductVariants(item.productId);
          variant = variants.find(v => v.id === item.variantId);
        }
        return {
          ...item,
          product,
          variant
        };
      }));
      
      res.json({
        ...bundle,
        items: itemsWithDetails
      });
    } catch (error) {
      console.error("Error fetching bundle:", error);
      res.status(500).json({ message: "Failed to fetch bundle" });
    }
  });

  app.get('/api/bundles/:id/items', async (req, res) => {
    try {
      const items = await storage.getBundleItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching bundle items:", error);
      res.status(500).json({ message: "Failed to fetch bundle items" });
    }
  });

  app.post('/api/bundles', async (req: any, res) => {
    try {
      const { items, ...bundleData } = req.body;
      const bundle = await storage.createBundle(bundleData);
      
      // Create bundle items
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await storage.createBundleItem({
            bundleId: bundle.id,
            productId: item.productId || null,
            variantId: item.productVariantId || item.variantId || null,
            quantity: item.quantity || 1,
            notes: item.notes || null
          });
        }
      }
      
      res.json(bundle);
    } catch (error) {
      console.error("Error creating bundle:", error);
      res.status(500).json({ message: "Failed to create bundle" });
    }
  });

  app.put('/api/bundles/:id', async (req: any, res) => {
    try {
      const { items, ...bundleData } = req.body;
      const updatedBundle = await storage.updateBundle(req.params.id, bundleData);
      
      // Update bundle items
      if (items && Array.isArray(items)) {
        // Delete existing items
        await storage.deleteBundleItems(req.params.id);
        
        // Create new items
        for (const item of items) {
          await storage.createBundleItem({
            bundleId: req.params.id,
            productId: item.productId || null,
            variantId: item.productVariantId || item.variantId || null,
            quantity: item.quantity || 1,
            notes: item.notes || null
          });
        }
      }
      
      res.json(updatedBundle);
    } catch (error) {
      console.error("Error updating bundle:", error);
      res.status(500).json({ message: "Failed to update bundle" });
    }
  });

  app.delete('/api/bundles/:id', async (req, res) => {
    try {
      await storage.deleteBundle(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting bundle:", error);
      res.status(500).json({ message: "Failed to delete bundle" });
    }
  });

  // Add bundle items endpoint
  app.post('/api/bundles/:id/items', async (req: any, res) => {
    try {
      const items = req.body;
      const bundleId = req.params.id;
      
      if (!Array.isArray(items)) {
        return res.status(400).json({ message: "Items must be an array" });
      }
      
      for (const item of items) {
        await storage.createBundleItem({
          bundleId,
          productId: item.productId || null,
          variantId: item.productVariantId || item.variantId || null,
          quantity: item.quantity || 1,
          notes: item.notes || null
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error adding bundle items:", error);
      res.status(500).json({ message: "Failed to add bundle items" });
    }
  });

  // Duplicate bundle endpoint
  app.post('/api/bundles/:id/duplicate', async (req, res) => {
    try {
      const originalBundle = await storage.getBundleById(req.params.id);
      if (!originalBundle) {
        return res.status(404).json({ message: "Bundle not found" });
      }
      
      // Create new bundle with duplicated data
      const newBundleData = {
        name: `${originalBundle.name} (Copy)`,
        description: originalBundle.description,
        sku: originalBundle.sku ? `${originalBundle.sku}-copy` : null,
        priceCzk: originalBundle.priceCzk,
        priceEur: originalBundle.priceEur,
        discountPercentage: originalBundle.discountPercentage,
        notes: originalBundle.notes,
        isActive: false // Start as inactive
      };
      
      const newBundle = await storage.createBundle(newBundleData);
      
      // Duplicate bundle items
      const originalItems = await storage.getBundleItems(req.params.id);
      for (const item of originalItems) {
        await storage.createBundleItem({
          bundleId: newBundle.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity
        });
      }
      
      res.json(newBundle);
    } catch (error) {
      console.error("Error duplicating bundle:", error);
      res.status(500).json({ message: "Failed to duplicate bundle" });
    }
  });

  // Update bundle status endpoint
  app.patch('/api/bundles/:id', async (req: any, res) => {
    try {
      const updatedBundle = await storage.updateBundle(req.params.id, req.body);
      res.json(updatedBundle);
    } catch (error) {
      console.error("Error updating bundle status:", error);
      res.status(500).json({ message: "Failed to update bundle status" });
    }
  });

  // Products endpoints
  app.get('/api/products', async (req, res) => {
    try {
      const search = req.query.search as string;
      const includeInactive = req.query.includeInactive === 'true';
      const includeLandingCost = req.query.includeLandingCost === 'true';
      let productsResult;
      
      if (search) {
        productsResult = await storage.searchProducts(search, includeInactive);
      } else {
        productsResult = await storage.getProducts(includeInactive);
      }
      
      // If landing costs are requested, fetch them from the database
      if (includeLandingCost) {
        const productsWithCosts = await Promise.all(productsResult.map(async (product) => {
          const [productWithCost] = await db
            .select()
            .from(products)
            .where(eq(products.id, product.id))
            .limit(1);
          
          return {
            ...product,
            landingCost: productWithCost?.latestLandingCost || null
          };
        }));
        
        res.json(productsWithCosts);
      } else {
        res.json(productsResult);
      }
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
      
      // Get the latest landing cost from product table
      const [productWithCost] = await db
        .select()
        .from(products)
        .where(eq(products.id, req.params.id));
      
      // Add latest_landing_cost to the product object
      const productData = {
        ...product,
        latest_landing_cost: productWithCost?.latestLandingCost || null
      };
      
      res.json(productData);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Product Locations endpoint
  app.get('/api/products/:id/locations', async (req, res) => {
    try {
      const productId = req.params.id;
      
      // First check if product exists and get its warehouseLocation
      const product = await storage.getProductById(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Get product locations from productLocations table
      const locations = await db
        .select()
        .from(productLocations)
        .where(eq(productLocations.productId, productId))
        .orderBy(desc(productLocations.isPrimary), desc(productLocations.quantity));
      
      // If no locations in productLocations table, but product has warehouseLocation field
      if (locations.length === 0 && product.warehouseLocation) {
        res.json([{
          id: 'legacy',
          productId: productId,
          locationCode: product.warehouseLocation,
          quantity: product.quantity || 0,
          isPrimary: true,
          locationType: 'warehouse'
        }]);
      } else {
        res.json(locations);
      }
    } catch (error) {
      console.error("Error fetching product locations:", error);
      res.status(500).json({ message: "Failed to fetch product locations" });
    }
  });

  // Product Files endpoints
  app.get('/api/products/:id/files', async (req, res) => {
    try {
      const files = await storage.getProductFiles(req.params.id);
      res.json(files);
    } catch (error) {
      console.error("Error fetching product files:", error);
      res.status(500).json({ message: "Failed to fetch product files" });
    }
  });

  // Configure multer for product file uploads
  const productFileUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      
      if (extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only PDF, DOC, DOCX, JPG, and PNG files are allowed'));
      }
    }
  });

  app.post('/api/products/:id/files', productFileUpload.single('file'), async (req: any, res) => {
    try {
      const productId = req.params.id;
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Ensure upload directory exists
      const uploadDir = 'server/uploads/product-files';
      await fs.mkdir(uploadDir, { recursive: true });
      
      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(req.file.originalname);
      const filename = uniqueSuffix + ext;
      const filepath = path.join(uploadDir, filename);
      
      // Save the file
      await fs.writeFile(filepath, req.file.buffer);
      
      // Create database record
      const fileData = {
        productId,
        fileType: req.body.fileType || 'other',
        fileName: req.file.originalname,
        filePath: filepath,
        language: req.body.language || 'en',
        displayName: req.body.displayName || req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      };
      
      const newFile = await storage.createProductFile(fileData);
      
      res.json(newFile);
    } catch (error) {
      console.error("Error uploading product file:", error);
      res.status(500).json({ message: "Failed to upload product file" });
    }
  });

  app.delete('/api/product-files/:fileId', async (req, res) => {
    try {
      const file = await storage.getProductFile(req.params.fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Delete physical file
      try {
        await fs.unlink(file.filePath);
      } catch (error) {
        console.error("Error deleting physical file:", error);
        // Continue even if physical file deletion fails
      }
      
      // Delete database record
      const deleted = await storage.deleteProductFile(req.params.fileId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete file" });
      }
      
      res.json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Error deleting product file:", error);
      res.status(500).json({ message: "Failed to delete product file" });
    }
  });

  app.get('/api/product-files/:fileId/download', async (req, res) => {
    try {
      const file = await storage.getProductFile(req.params.fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Check if file exists
      try {
        await fs.access(file.filePath);
      } catch (error) {
        return res.status(404).json({ message: "File not found on disk" });
      }
      
      // Set appropriate headers
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
      
      // Stream the file
      const fileBuffer = await fs.readFile(file.filePath);
      res.send(fileBuffer);
    } catch (error) {
      console.error("Error downloading product file:", error);
      res.status(500).json({ message: "Failed to download product file" });
    }
  });

  app.get('/api/products/:id/tiered-pricing', async (req, res) => {
    try {
      const pricing = await storage.getProductTieredPricing(req.params.id);
      res.json(pricing);
    } catch (error) {
      console.error("Error fetching product tiered pricing:", error);
      res.status(500).json({ message: "Failed to fetch product tiered pricing" });
    }
  });

  app.post('/api/products/:id/tiered-pricing', async (req, res) => {
    try {
      const productId = req.params.id;
      const validationResult = insertProductTieredPricingSchema.safeParse({
        ...req.body,
        productId
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid tiered pricing data",
          errors: validationResult.error.errors
        });
      }

      const newPricing = await storage.createProductTieredPricing(validationResult.data);
      res.status(201).json(newPricing);
    } catch (error) {
      console.error("Error creating product tiered pricing:", error);
      res.status(500).json({ message: "Failed to create product tiered pricing" });
    }
  });

  app.patch('/api/products/tiered-pricing/:id', async (req, res) => {
    try {
      const validationResult = insertProductTieredPricingSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid tiered pricing data",
          errors: validationResult.error.errors
        });
      }

      const updated = await storage.updateProductTieredPricing(
        req.params.id,
        validationResult.data
      );

      if (!updated) {
        return res.status(404).json({ message: "Tiered pricing not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating product tiered pricing:", error);
      res.status(500).json({ message: "Failed to update product tiered pricing" });
    }
  });

  app.delete('/api/products/tiered-pricing/:id', async (req, res) => {
    try {
      const deleted = await storage.deleteProductTieredPricing(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Tiered pricing not found" });
      }
      
      res.json({ message: "Tiered pricing deleted successfully" });
    } catch (error) {
      console.error("Error deleting product tiered pricing:", error);
      res.status(500).json({ message: "Failed to delete product tiered pricing" });
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

  // Product Cost History endpoint
  app.get('/api/products/:id/cost-history', async (req, res) => {
    try {
      const productId = req.params.id;
      
      // Fetch cost history for this product
      const costHistory = await db
        .select({
          id: productCostHistory.id,
          landingCostUnitBase: productCostHistory.landingCostUnitBase,
          method: productCostHistory.method,
          computedAt: productCostHistory.computedAt,
          createdAt: productCostHistory.createdAt,
          purchaseItemId: productCostHistory.purchaseItemId,
        })
        .from(productCostHistory)
        .where(eq(productCostHistory.productId, productId))
        .orderBy(desc(productCostHistory.computedAt));
      
      // Get purchase item details if available
      const costHistoryWithDetails = await Promise.all(
        costHistory.map(async (history) => {
          let source = history.method;
          if (history.purchaseItemId) {
            const [purchaseItem] = await db
              .select({
                name: purchaseItems.name,
                purchaseId: purchaseItems.purchaseId,
              })
              .from(purchaseItems)
              .where(eq(purchaseItems.id, history.purchaseItemId));
            
            if (purchaseItem) {
              source = `PO-${purchaseItem.purchaseId}: ${purchaseItem.name}`;
            }
          }
          
          return {
            ...history,
            source,
          };
        })
      );
      
      res.json(costHistoryWithDetails);
    } catch (error) {
      console.error("Error fetching product cost history:", error);
      res.status(500).json({ message: "Failed to fetch product cost history" });
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

  // Move products to another warehouse
  app.post('/api/products/move-warehouse', async (req: any, res) => {
    try {
      const { productIds, targetWarehouseId } = req.body;
      
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ message: "Product IDs must be a non-empty array" });
      }
      
      if (!targetWarehouseId) {
        return res.status(400).json({ message: "Target warehouse ID is required" });
      }
      
      // Verify target warehouse exists
      const targetWarehouse = await storage.getWarehouseById(targetWarehouseId);
      if (!targetWarehouse) {
        return res.status(404).json({ message: "Target warehouse not found" });
      }
      
      // Move products
      await storage.moveProductsToWarehouse(productIds, targetWarehouseId);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'moved',
        entityType: 'product',
        entityId: targetWarehouseId,
        description: `Moved ${productIds.length} products to ${targetWarehouse.name}`,
      });
      
      res.json({ message: `Successfully moved ${productIds.length} products` });
    } catch (error) {
      console.error("Error moving products:", error);
      res.status(500).json({ message: "Failed to move products" });
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

  // Product Locations endpoints
  app.get('/api/products/:id/locations', async (req, res) => {
    try {
      const productId = req.params.id;
      const locations = await storage.getProductLocations(productId);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching product locations:", error);
      res.status(500).json({ message: "Failed to fetch product locations" });
    }
  });

  app.post('/api/products/:id/locations', async (req: any, res) => {
    try {
      const productId = req.params.id;
      
      // Validate product exists
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Parse and validate location data
      const locationData = insertProductLocationSchema.parse({
        ...req.body,
        productId
      });
      
      const location = await storage.createProductLocation(locationData);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'created',
        entityType: 'product_location',
        entityId: location.id,
        description: `Added location ${location.locationCode} for product`,
      });
      
      res.status(201).json(location);
    } catch (error: any) {
      console.error("Error creating product location:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      if (error.message?.includes('Location code already exists')) {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create product location" });
    }
  });

  app.patch('/api/products/:id/locations/:locationId', async (req: any, res) => {
    try {
      const { locationId } = req.params;
      
      // Validate update data (partial schema)
      const updateData = insertProductLocationSchema.partial().parse(req.body);
      
      const location = await storage.updateProductLocation(locationId, updateData);
      
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'updated',
        entityType: 'product_location',
        entityId: location.id,
        description: `Updated location ${location.locationCode}`,
      });
      
      res.json(location);
    } catch (error: any) {
      console.error("Error updating product location:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update product location" });
    }
  });

  app.delete('/api/products/:id/locations/:locationId', async (req: any, res) => {
    try {
      const { locationId } = req.params;
      
      const success = await storage.deleteProductLocation(locationId);
      
      if (!success) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'deleted',
        entityType: 'product_location',
        entityId: locationId,
        description: `Deleted product location`,
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product location:", error);
      res.status(500).json({ message: "Failed to delete product location" });
    }
  });

  app.post('/api/products/:id/locations/move', async (req: any, res) => {
    try {
      const { fromLocationId, toLocationId, quantity } = req.body;
      
      // Validate required fields
      if (!fromLocationId || !toLocationId || !quantity) {
        return res.status(400).json({ 
          message: "Missing required fields: fromLocationId, toLocationId, quantity" 
        });
      }
      
      if (quantity <= 0) {
        return res.status(400).json({ 
          message: "Quantity must be greater than 0" 
        });
      }
      
      const success = await storage.moveInventory(fromLocationId, toLocationId, quantity);
      
      if (!success) {
        return res.status(400).json({ 
          message: "Failed to move inventory. Check locations and quantity." 
        });
      }
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'moved',
        entityType: 'inventory',
        entityId: req.params.id,
        description: `Moved ${quantity} items between locations`,
      });
      
      res.json({ message: "Inventory moved successfully", quantity });
    } catch (error: any) {
      console.error("Error moving inventory:", error);
      res.status(500).json({ 
        message: error.message || "Failed to move inventory" 
      });
    }
  });

  // Packing Materials endpoints
  app.get('/api/packing-materials', async (req, res) => {
    try {
      const search = req.query.search as string;
      let materials;
      
      if (search) {
        materials = await storage.searchPackingMaterials(search);
      } else {
        materials = await storage.getPackingMaterials();
      }
      
      res.json(materials);
    } catch (error) {
      console.error("Error fetching packing materials:", error);
      res.status(500).json({ message: "Failed to fetch packing materials" });
    }
  });

  app.get('/api/packing-materials/:id', async (req, res) => {
    try {
      const material = await storage.getPackingMaterialById(req.params.id);
      if (material) {
        res.json(material);
      } else {
        res.status(404).json({ message: "Packing material not found" });
      }
    } catch (error) {
      console.error("Error fetching packing material:", error);
      res.status(500).json({ message: "Failed to fetch packing material" });
    }
  });

  app.post('/api/packing-materials', async (req: any, res) => {
    try {
      const materialData = req.body;
      const material = await storage.createPackingMaterial(materialData);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'created',
        entityType: 'packing_material',
        entityId: material.id,
        description: `Created packing material: ${material.name}`,
      });
      
      res.status(201).json(material);
    } catch (error) {
      console.error("Error creating packing material:", error);
      res.status(500).json({ message: "Failed to create packing material" });
    }
  });

  app.patch('/api/packing-materials/:id', async (req: any, res) => {
    try {
      const updates = req.body;
      const material = await storage.updatePackingMaterial(req.params.id, updates);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'updated',
        entityType: 'packing_material',
        entityId: material.id,
        description: `Updated packing material: ${material.name}`,
      });
      
      res.json(material);
    } catch (error) {
      console.error("Error updating packing material:", error);
      res.status(500).json({ message: "Failed to update packing material" });
    }
  });

  app.delete('/api/packing-materials/:id', async (req: any, res) => {
    try {
      await storage.deletePackingMaterial(req.params.id);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'deleted',
        entityType: 'packing_material',
        entityId: req.params.id,
        description: `Deleted packing material`,
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting packing material:", error);
      res.status(500).json({ message: "Failed to delete packing material" });
    }
  });

  // Batch compress existing images endpoint
  app.post('/api/compress-images', async (req, res) => {
    try {
      const { paths, format = 'webp', lossless = true, quality = 95 } = req.body;
      
      if (!paths || !Array.isArray(paths)) {
        return res.status(400).json({ message: "Paths array is required" });
      }
      
      const results = [];
      
      for (const imagePath of paths) {
        try {
          // Check if file exists
          const fullPath = path.join('public', imagePath.replace(/^\//, ''));
          await fs.access(fullPath);
          
          // Generate output path
          const ext = path.extname(fullPath);
          const outputPath = fullPath.replace(ext, `.compressed.${format}`);
          
          // Compress image
          const compressionResult = await ImageCompressionService.compressImage(
            fullPath,
            outputPath,
            { format, lossless, quality, maxWidth: 2048, maxHeight: 2048 }
          );
          
          results.push({
            original: imagePath,
            compressed: imagePath.replace(ext, `.compressed.${format}`),
            ...compressionResult,
            success: true
          });
        } catch (error) {
          results.push({
            original: imagePath,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      res.json({ results });
    } catch (error) {
      console.error("Error batch compressing images:", error);
      res.status(500).json({ message: "Failed to batch compress images" });
    }
  });

  // Get image compression info endpoint
  app.post('/api/image-info', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Get metadata from buffer
      const metadata = await ImageCompressionService.getImageMetadataFromBuffer(req.file.buffer);
      
      // Simulate compression to get potential savings
      const compressionResult = await ImageCompressionService.compressImageBuffer(
        req.file.buffer,
        { format: 'webp', lossless: true, quality: 95 }
      );
      
      res.json({
        original: {
          size: req.file.size,
          format: metadata.format,
          width: metadata.width,
          height: metadata.height,
          density: metadata.density
        },
        potential: {
          compressedSize: compressionResult.compressedSize,
          compressionRatio: compressionResult.compressionRatio.toFixed(2) + '%',
          format: 'webp'
        }
      });
    } catch (error) {
      console.error("Error getting image info:", error);
      res.status(500).json({ message: "Failed to get image info" });
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
      
      // Get all orders to calculate Pay Later badge
      const allOrders = await storage.getOrders();
      
      // Calculate Pay Later preference for each customer
      const customersWithPayLaterBadge = customers.map(customer => {
        // Get orders for this customer
        const customerOrders = allOrders.filter(order => order.customerId === customer.id);
        
        // Calculate Pay Later percentage
        const payLaterOrders = customerOrders.filter(order => order.paymentStatus === 'pay_later');
        const payLaterPercentage = customerOrders.length > 0 
          ? (payLaterOrders.length / customerOrders.length) * 100 
          : 0;
        
        // Add Pay Later badge if customer has >= 50% Pay Later orders and at least 2 orders
        const hasPayLaterBadge = customerOrders.length >= 2 && payLaterPercentage >= 50;
        
        return {
          ...customer,
          hasPayLaterBadge,
          payLaterPercentage: Math.round(payLaterPercentage),
          totalOrders: customerOrders.length
        };
      });
      
      res.json(customersWithPayLaterBadge);
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
      
      // Get all orders for this customer to calculate Pay Later badge
      const allOrders = await storage.getOrders();
      const customerOrders = allOrders.filter(order => order.customerId === customer.id);
      
      // Calculate Pay Later percentage
      const payLaterOrders = customerOrders.filter(order => order.paymentStatus === 'pay_later');
      const payLaterPercentage = customerOrders.length > 0 
        ? (payLaterOrders.length / customerOrders.length) * 100 
        : 0;
      
      // Add Pay Later badge if customer has >= 50% Pay Later orders and at least 2 orders
      const hasPayLaterBadge = customerOrders.length >= 2 && payLaterPercentage >= 50;
      
      const customerWithBadge = {
        ...customer,
        hasPayLaterBadge,
        payLaterPercentage: Math.round(payLaterPercentage),
        totalOrders: customerOrders.length
      };
      
      res.json(customerWithBadge);
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

  // Customer Shipping Addresses endpoints
  app.get('/api/customers/:customerId/shipping-addresses', async (req, res) => {
    try {
      const { customerId } = req.params;
      const addresses = await storage.getCustomerShippingAddresses(customerId);
      res.json(addresses);
    } catch (error) {
      console.error("Error fetching customer shipping addresses:", error);
      res.status(500).json({ message: "Failed to fetch shipping addresses" });
    }
  });

  app.get('/api/shipping-addresses/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const address = await storage.getCustomerShippingAddress(id);
      if (!address) {
        return res.status(404).json({ message: 'Address not found' });
      }
      res.json(address);
    } catch (error) {
      console.error("Error fetching shipping address:", error);
      res.status(500).json({ message: "Failed to fetch shipping address" });
    }
  });

  app.post('/api/customers/:customerId/shipping-addresses', async (req: any, res) => {
    try {
      const { customerId } = req.params;
      const address = await storage.createCustomerShippingAddress({
        customerId,
        ...req.body
      });
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'created',
        entityType: 'shipping_address',
        entityId: address.id,
        description: `Created shipping address for customer ${customerId}`,
      });
      
      res.status(201).json(address);
    } catch (error) {
      console.error("Error creating shipping address:", error);
      res.status(500).json({ message: "Failed to create shipping address" });
    }
  });

  app.patch('/api/shipping-addresses/:id', async (req: any, res) => {
    try {
      const { id } = req.params;
      const address = await storage.updateCustomerShippingAddress(id, req.body);
      if (!address) {
        return res.status(404).json({ message: 'Address not found' });
      }
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'updated',
        entityType: 'shipping_address',
        entityId: address.id,
        description: `Updated shipping address`,
      });
      
      res.json(address);
    } catch (error) {
      console.error("Error updating shipping address:", error);
      res.status(500).json({ message: "Failed to update shipping address" });
    }
  });

  app.delete('/api/shipping-addresses/:id', async (req: any, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteCustomerShippingAddress(id);
      if (!success) {
        return res.status(404).json({ message: 'Address not found' });
      }
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'deleted',
        entityType: 'shipping_address',
        entityId: id,
        description: `Deleted shipping address`,
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting shipping address:", error);
      res.status(500).json({ message: "Failed to delete shipping address" });
    }
  });

  app.post('/api/customers/:customerId/shipping-addresses/:addressId/set-primary', async (req: any, res) => {
    try {
      const { customerId, addressId } = req.params;
      await storage.setPrimaryShippingAddress(customerId, addressId);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'updated',
        entityType: 'shipping_address',
        entityId: addressId,
        description: `Set shipping address as primary for customer ${customerId}`,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting primary shipping address:", error);
      res.status(500).json({ message: "Failed to set primary shipping address" });
    }
  });

  // Customer Prices endpoints
  app.get('/api/customers/:customerId/prices', async (req, res) => {
    try {
      const prices = await storage.getCustomerPrices(req.params.customerId);
      res.json(prices);
    } catch (error) {
      console.error("Error fetching customer prices:", error);
      res.status(500).json({ message: "Failed to fetch customer prices" });
    }
  });

  app.post('/api/customers/:customerId/prices', async (req: any, res) => {
    try {
      // Convert date strings to Date objects and handle empty variant_id
      const priceData = {
        ...req.body,
        customerId: req.params.customerId,
        variantId: req.body.variantId && req.body.variantId !== '' ? req.body.variantId : undefined,
        validFrom: req.body.validFrom ? new Date(req.body.validFrom) : new Date(),
        validTo: req.body.validTo ? new Date(req.body.validTo) : undefined
      };
      
      const data = insertCustomerPriceSchema.parse(priceData);
      
      const price = await storage.createCustomerPrice(data);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'created',
        entityType: 'customer_price',
        entityId: price.id,
        description: `Created custom price for customer ${req.params.customerId}`,
      });
      
      res.json(price);
    } catch (error) {
      console.error("Error creating customer price:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create customer price" });
    }
  });

  app.patch('/api/customer-prices/:id', async (req: any, res) => {
    try {
      // Convert date strings to Date objects if present
      const updates = {
        ...req.body,
        validFrom: req.body.validFrom ? new Date(req.body.validFrom) : undefined,
        validTo: req.body.validTo ? new Date(req.body.validTo) : undefined
      };
      
      // Remove undefined values
      Object.keys(updates).forEach(key => 
        updates[key] === undefined && delete updates[key]
      );
      
      const price = await storage.updateCustomerPrice(req.params.id, updates);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'updated',
        entityType: 'customer_price',
        entityId: price.id,
        description: `Updated customer price`,
      });
      
      res.json(price);
    } catch (error) {
      console.error("Error updating customer price:", error);
      res.status(500).json({ message: "Failed to update customer price" });
    }
  });

  app.delete('/api/customer-prices/:id', async (req: any, res) => {
    try {
      await storage.deleteCustomerPrice(req.params.id);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'deleted',
        entityType: 'customer_price',
        entityId: req.params.id,
        description: `Deleted customer price`,
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting customer price:", error);
      res.status(500).json({ message: "Failed to delete customer price" });
    }
  });

  // Bulk import customer prices
  app.post('/api/customers/:customerId/prices/bulk', async (req: any, res) => {
    try {
      const { prices } = req.body;
      if (!Array.isArray(prices)) {
        return res.status(400).json({ message: "Prices must be an array" });
      }

      const validatedPrices = prices.map(priceData => {
        // Convert date strings to Date objects
        const processedData = {
          ...priceData,
          customerId: req.params.customerId,
          validFrom: priceData.validFrom ? new Date(priceData.validFrom) : new Date(),
          validTo: priceData.validTo ? new Date(priceData.validTo) : undefined
        };
        return insertCustomerPriceSchema.parse(processedData);
      });

      const createdPrices = await storage.bulkCreateCustomerPrices(validatedPrices);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'created',
        entityType: 'customer_price',
        entityId: req.params.customerId,
        description: `Bulk imported ${createdPrices.length} customer prices`,
      });
      
      res.json(createdPrices);
    } catch (error) {
      console.error("Error bulk importing customer prices:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to bulk import customer prices" });
    }
  });

  // Get active customer price for a specific product
  app.get('/api/customers/:customerId/active-price', async (req, res) => {
    try {
      const { productId, variantId, currency } = req.query as { 
        productId?: string; 
        variantId?: string; 
        currency?: string;
      };
      
      const price = await storage.getActiveCustomerPrice(
        req.params.customerId,
        productId,
        variantId,
        currency
      );
      
      if (!price) {
        return res.status(404).json({ message: "No active price found" });
      }
      
      res.json(price);
    } catch (error) {
      console.error("Error fetching active customer price:", error);
      res.status(500).json({ message: "Failed to fetch active customer price" });
    }
  });

  // Orders endpoints
  app.get('/api/orders', async (req, res) => {
    try {
      const status = req.query.status as string;
      const paymentStatus = req.query.paymentStatus as string;
      const customerId = req.query.customerId as string;
      const includeItems = req.query.includeItems === 'true';
      
      let orders;
      // Special filter: pay_later means shipped orders with pay_later payment status
      if (status === 'pay_later') {
        const allOrders = await storage.getOrders();
        orders = allOrders.filter(order => 
          order.orderStatus === 'shipped' && order.paymentStatus === 'pay_later'
        );
      } else if (status) {
        orders = await storage.getOrdersByStatus(status);
      } else if (paymentStatus) {
        orders = await storage.getOrdersByPaymentStatus(paymentStatus);
      } else if (customerId) {
        orders = await storage.getOrdersByCustomerId(customerId);
      } else {
        orders = await storage.getOrders();
      }
      
      // If includeItems is requested, fetch order items for each order
      if (includeItems) {
        const ordersWithItems = await Promise.all(orders.map(async (order) => {
          const items = await storage.getOrderItems(order.id);
          
          // For each item, check if it's part of a bundle and fetch bundle items
          const itemsWithBundleDetails = await Promise.all(items.map(async (item) => {
            // Fetch product details including shipping notes and packing material
            let shipmentNotes = null;
            let packingMaterial = null;
            
            if (item.productId) {
              const product = await storage.getProductById(item.productId);
              if (product) {
                shipmentNotes = product.shipmentNotes;
                if (product.packingMaterialId) {
                  packingMaterial = await storage.getPackingMaterialById(product.packingMaterialId);
                }
              }
            }
            
            // Check if the item name indicates it's a bundle product
            const bundles = await storage.getBundles();
            const isBundle = item.productName?.toLowerCase().includes('bundle') || 
                           item.productName?.toLowerCase().includes('kit') || 
                           item.productName?.toLowerCase().includes('collection') ||
                           item.productName?.toLowerCase().includes('set');
            
            let bundleItemsData = [];
            
            if (isBundle) {
              // Try to find the bundle by name match
              const bundle = bundles.find(b => 
                item.productName.includes(b.name) || 
                b.name.includes(item.productName) ||
                item.sku === b.sku
              );
              
              if (bundle) {
                // Fetch bundle items
                const bundleItems = await storage.getBundleItems(bundle.id);
                bundleItemsData = await Promise.all(bundleItems.map(async (bundleItem) => {
                  let productName = '';
                  let colorNumber = '';
                  let location = '';
                  
                  if (bundleItem.productId) {
                    const product = await storage.getProductById(bundleItem.productId);
                    productName = product?.name || '';
                    location = product?.warehouseLocation || '';
                    
                    if (bundleItem.variantId) {
                      const variants = await storage.getProductVariants(bundleItem.productId);
                      const variant = variants.find(v => v.id === bundleItem.variantId);
                      if (variant) {
                        productName = `${productName} - ${variant.name}`;
                        // Extract color number from variant name if present
                        const colorMatch = variant.name.match(/#(\d+)/);
                        if (colorMatch) {
                          colorNumber = colorMatch[1];
                        }
                      }
                    }
                  }
                  
                  return {
                    id: bundleItem.id,
                    name: productName || bundleItem.notes || 'Bundle Item',
                    colorNumber: colorNumber || undefined,
                    quantity: bundleItem.quantity,
                    picked: false,
                    location: location || undefined
                  };
                }));
              }
            }
            
            return {
              ...item,
              isBundle: isBundle,
              bundleItems: bundleItemsData.length > 0 ? bundleItemsData : undefined,
              shipmentNotes,
              packingMaterial
            };
          }));
          
          return {
            ...order,
            items: itemsWithBundleDetails
          };
        }));
        
        res.json(ordersWithItems);
      } else {
        res.json(orders);
      }
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

  // Pick & Pack endpoints
  app.get('/api/orders/pick-pack', async (req, res) => {
    try {
      const status = req.query.status as string; // pending, picking, packing, ready
      const orders = await storage.getPickPackOrders(status);
      
      // Fetch order items for each order with bundle details
      const ordersWithItems = await Promise.all(orders.map(async (order) => {
        const items = await storage.getOrderItems(order.id);
        
        // For each item, check if it's part of a bundle and fetch bundle items
        const itemsWithBundleDetails = await Promise.all(items.map(async (item) => {
          // Check if this product is a bundle
          const bundles = await storage.getBundles();
          const bundle = bundles.find(b => item.productName.includes(b.name));
          
          if (bundle) {
            // Fetch bundle items
            const bundleItems = await storage.getBundleItems(bundle.id);
            const bundleItemsWithDetails = await Promise.all(bundleItems.map(async (bundleItem) => {
              let productName = '';
              if (bundleItem.productId) {
                const product = await storage.getProductById(bundleItem.productId);
                productName = product?.name || '';
                
                if (bundleItem.variantId) {
                  const variants = await storage.getProductVariants(bundleItem.productId);
                  const variant = variants.find(v => v.id === bundleItem.variantId);
                  if (variant) {
                    productName = `${productName} - ${variant.name}`;
                  }
                }
              }
              
              return {
                id: bundleItem.id,
                name: productName || bundleItem.notes || 'Bundle Item',
                quantity: bundleItem.quantity,
                picked: false,
                location: item.warehouseLocation || 'A1-R1-S1'
              };
            }));
            
            return {
              ...item,
              isBundle: true,
              bundleItems: bundleItemsWithDetails
            };
          }
          
          return item;
        }));
        
        return {
          ...order,
          status: order.orderStatus, // Map orderStatus to status for client compatibility
          items: itemsWithBundleDetails
        };
      }));
      
      res.json(ordersWithItems);
    } catch (error) {
      console.error("Error fetching pick-pack orders:", error);
      res.status(500).json({ message: "Failed to fetch pick-pack orders" });
    }
  });

  // Start picking an order
  app.post('/api/orders/:id/pick/start', async (req: any, res) => {
    try {
      const { employeeId } = req.body;
      
      // Handle mock orders
      if (req.params.id.startsWith('mock-')) {
        return res.json({ 
          id: req.params.id, 
          orderId: req.params.id,
          pickStatus: 'in_progress',
          pickedBy: employeeId || "test-user",
          pickStartTime: new Date().toISOString(),
          message: 'Mock order picking started' 
        });
      }
      
      const order = await storage.startPickingOrder(req.params.id, employeeId || "test-user");
      
      if (order) {
        await storage.createUserActivity({
          userId: "test-user",
          action: 'started_picking',
          entityType: 'order',
          entityId: req.params.id,
          description: `Started picking order: ${order.orderId}`,
        });
        res.json(order);
      } else {
        res.status(404).json({ message: "Order not found" });
      }
    } catch (error) {
      console.error("Error starting pick:", error);
      res.status(500).json({ message: "Failed to start picking order" });
    }
  });

  // Complete picking an order
  app.post('/api/orders/:id/pick/complete', async (req: any, res) => {
    try {
      // Handle mock orders
      if (req.params.id.startsWith('mock-')) {
        return res.json({ 
          id: req.params.id, 
          orderId: req.params.id,
          pickStatus: 'completed',
          pickEndTime: new Date().toISOString(),
          message: 'Mock order picking completed' 
        });
      }
      
      const order = await storage.completePickingOrder(req.params.id);
      
      if (order) {
        await storage.createUserActivity({
          userId: "test-user",
          action: 'completed_picking',
          entityType: 'order',
          entityId: req.params.id,
          description: `Completed picking order: ${order.orderId}`,
        });
        res.json(order);
      } else {
        res.status(404).json({ message: "Order not found" });
      }
    } catch (error) {
      console.error("Error completing pick:", error);
      res.status(500).json({ message: "Failed to complete picking order" });
    }
  });

  // Start packing an order
  app.post('/api/orders/:id/pack/start', async (req: any, res) => {
    try {
      const { employeeId } = req.body;
      
      // Handle mock orders
      if (req.params.id.startsWith('mock-')) {
        return res.json({ 
          id: req.params.id, 
          orderId: req.params.id,
          packStatus: 'in_progress',
          packedBy: employeeId || "test-user",
          packStartTime: new Date().toISOString(),
          message: 'Mock order packing started' 
        });
      }
      
      const order = await storage.startPackingOrder(req.params.id, employeeId || "test-user");
      
      if (order) {
        await storage.createUserActivity({
          userId: "test-user",
          action: 'started_packing',
          entityType: 'order',
          entityId: req.params.id,
          description: `Started packing order: ${order.orderId}`,
        });
        res.json(order);
      } else {
        res.status(404).json({ message: "Order not found" });
      }
    } catch (error) {
      console.error("Error starting pack:", error);
      res.status(500).json({ message: "Failed to start packing order" });
    }
  });

  // Complete packing an order
  app.post('/api/orders/:id/pack/complete', async (req: any, res) => {
    try {
      const { cartons, packageWeight, printedDocuments, packingChecklist } = req.body;
      
      // Handle mock orders
      if (req.params.id.startsWith('mock-')) {
        return res.json({ 
          id: req.params.id, 
          orderId: req.params.id,
          packStatus: 'completed',
          packEndTime: new Date().toISOString(),
          orderStatus: 'shipped',
          finalWeight: packageWeight,
          message: 'Mock order packing completed' 
        });
      }
      
      // Update order with weight and complete packing
      const updateData = {
        packStatus: 'completed',
        packEndTime: new Date(),
        orderStatus: 'ready_to_ship', // Update status to ready_to_ship
        finalWeight: parseFloat(packageWeight) || 0,
        cartonUsed: cartons?.length > 0 ? cartons.map((c: any) => c.cartonName).join(', ') : ''
      };
      
      await storage.updateOrder(req.params.id, updateData);
      const order = await storage.getOrderById(req.params.id);
      
      if (order) {
        await storage.createUserActivity({
          userId: "test-user",
          action: 'completed_packing',
          entityType: 'order',
          entityId: req.params.id,
          description: `Completed packing order: ${order.orderId}. Weight: ${packageWeight}kg`,
        });
        res.json(order);
      } else {
        res.status(404).json({ message: "Order not found" });
      }
    } catch (error) {
      console.error("Error completing pack:", error);
      res.status(500).json({ message: "Failed to complete packing order" });
    }
  });

  // Update picked quantity for an order item
  app.patch('/api/orders/:id/items/:itemId/pick', async (req: any, res) => {
    try {
      const { pickedQuantity } = req.body;
      
      // Handle mock orders
      if (req.params.id.startsWith('mock-')) {
        return res.json({ 
          id: req.params.itemId, 
          pickedQuantity,
          message: 'Mock item picked quantity updated' 
        });
      }
      
      // Get current item details before update
      const currentItems = await storage.getOrderItems(req.params.id);
      const currentItem = currentItems.find(i => i.id === req.params.itemId);
      
      // Update the picked quantity with timestamp
      const item = await storage.updateOrderItemPickedQuantity(req.params.itemId, pickedQuantity, new Date());
      
      // Create detailed pick log
      await storage.createPickPackLog({
        orderId: req.params.id,
        orderItemId: req.params.itemId,
        activityType: 'item_picked',
        userId: "test-user",
        userName: "Test User",
        productName: item.productName,
        sku: item.sku || '',
        quantity: pickedQuantity,
        location: item.warehouseLocation || '',
        notes: `Picked ${pickedQuantity} of ${item.quantity} units`,
      });
      
      // Also log to user activities
      await storage.createUserActivity({
        userId: "test-user",
        action: 'updated_pick_quantity',
        entityType: 'order_item',
        entityId: req.params.itemId,
        description: `Updated picked quantity to ${pickedQuantity} for item ${item.productName}`,
      });
      
      res.json(item);
    } catch (error) {
      console.error("Error updating picked quantity:", error);
      res.status(500).json({ message: "Failed to update picked quantity" });
    }
  });

  // Update packed quantity for an order item
  app.patch('/api/orders/:id/items/:itemId/pack', async (req: any, res) => {
    try {
      const { packedQuantity } = req.body;
      
      // Handle mock orders
      if (req.params.id.startsWith('mock-')) {
        return res.json({ 
          id: req.params.itemId, 
          packedQuantity,
          message: 'Mock item packed quantity updated' 
        });
      }
      
      const item = await storage.updateOrderItemPackedQuantity(req.params.itemId, packedQuantity);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'updated_pack_quantity',
        entityType: 'order_item',
        entityId: req.params.itemId,
        description: `Updated packed quantity to ${packedQuantity} for item ${item.productName}`,
      });
      
      res.json(item);
    } catch (error) {
      console.error("Error updating packed quantity:", error);
      res.status(500).json({ message: "Failed to update packed quantity" });
    }
  });

  // Pick & Pack endpoints - moved above parameterized route
  app.get('/api/orders/pick-pack', async (req, res) => {
    try {
      const status = req.query.status as string; // pending, picking, packing, ready
      const orders = await storage.getPickPackOrders(status);
      
      // Fetch order items for each order with bundle details
      const ordersWithItems = await Promise.all(orders.map(async (order) => {
        const items = await storage.getOrderItems(order.id);
        
        // For each item, check if it's part of a bundle and fetch bundle items
        const itemsWithBundleDetails = await Promise.all(items.map(async (item) => {
          // Check if this product is a bundle
          const bundles = await storage.getBundles();
          const bundle = bundles.find(b => item.productName.includes(b.name));
          
          if (bundle) {
            // Fetch bundle items
            const bundleItems = await storage.getBundleItems(bundle.id);
            const bundleItemsWithDetails = await Promise.all(bundleItems.map(async (bundleItem) => {
              let productName = '';
              if (bundleItem.productId) {
                const product = await storage.getProductById(bundleItem.productId);
                productName = product?.name || '';
                
                if (bundleItem.variantId) {
                  const variants = await storage.getProductVariants(bundleItem.productId);
                  const variant = variants.find(v => v.id === bundleItem.variantId);
                  if (variant) {
                    productName = `${productName} - ${variant.name}`;
                  }
                }
              }
              
              return {
                id: bundleItem.id,
                name: productName || bundleItem.notes || 'Bundle Item',
                quantity: bundleItem.quantity,
                picked: false,
                location: item.warehouseLocation || 'A1-R1-S1'
              };
            }));
            
            return {
              ...item,
              isBundle: true,
              bundleItems: bundleItemsWithDetails
            };
          }
          
          return item;
        }));
        
        return {
          ...order,
          status: order.orderStatus, // Map orderStatus to status for client compatibility
          items: itemsWithBundleDetails
        };
      }));
      
      res.json(ordersWithItems);
    } catch (error) {
      console.error("Error fetching pick-pack orders:", error);
      res.status(500).json({ message: "Failed to fetch pick-pack orders" });
    }
  });

  // Start picking an order
  app.post('/api/orders/:id/pick/start', async (req: any, res) => {
    try {
      const { employeeId } = req.body;
      
      // Handle mock orders
      if (req.params.id.startsWith('mock-')) {
        return res.json({ 
          id: req.params.id, 
          orderId: req.params.id,
          pickStatus: 'in_progress',
          pickedBy: employeeId || "test-user",
          pickStartTime: new Date().toISOString(),
          message: 'Mock order picking started' 
        });
      }
      
      const order = await storage.startPickingOrder(req.params.id, employeeId || "test-user");
      
      if (order) {
        await storage.createUserActivity({
          userId: "test-user",
          action: 'started_picking',
          entityType: 'order',
          entityId: req.params.id,
          description: `Started picking order: ${order.orderId}`,
        });
        res.json(order);
      } else {
        res.status(404).json({ message: "Order not found" });
      }
    } catch (error) {
      console.error("Error starting pick:", error);
      res.status(500).json({ message: "Failed to start picking order" });
    }
  });

  // Complete picking an order
  app.post('/api/orders/:id/pick/complete', async (req: any, res) => {
    try {
      // Handle mock orders
      if (req.params.id.startsWith('mock-')) {
        return res.json({ 
          id: req.params.id, 
          orderId: req.params.id,
          pickStatus: 'completed',
          pickEndTime: new Date().toISOString(),
          message: 'Mock order picking completed' 
        });
      }
      
      const order = await storage.completePickingOrder(req.params.id);
      
      if (order) {
        await storage.createUserActivity({
          userId: "test-user",
          action: 'completed_picking',
          entityType: 'order',
          entityId: req.params.id,
          description: `Completed picking order: ${order.orderId}`,
        });
        res.json(order);
      } else {
        res.status(404).json({ message: "Order not found" });
      }
    } catch (error) {
      console.error("Error completing pick:", error);
      res.status(500).json({ message: "Failed to complete picking order" });
    }
  });

  // Start packing an order
  app.post('/api/orders/:id/pack/start', async (req: any, res) => {
    try {
      const { employeeId } = req.body;
      
      // Handle mock orders
      if (req.params.id.startsWith('mock-')) {
        return res.json({ 
          id: req.params.id, 
          orderId: req.params.id,
          packStatus: 'in_progress',
          packedBy: employeeId || "test-user",
          packStartTime: new Date().toISOString(),
          message: 'Mock order packing started' 
        });
      }
      
      const order = await storage.startPackingOrder(req.params.id, employeeId || "test-user");
      
      if (order) {
        await storage.createUserActivity({
          userId: "test-user",
          action: 'started_packing',
          entityType: 'order',
          entityId: req.params.id,
          description: `Started packing order: ${order.orderId}`,
        });
        res.json(order);
      } else {
        res.status(404).json({ message: "Order not found" });
      }
    } catch (error) {
      console.error("Error starting pack:", error);
      res.status(500).json({ message: "Failed to start packing order" });
    }
  });

  // Create packing session
  app.post('/api/packing/sessions', async (req, res) => {
    try {
      const { orderId, packerId } = req.body;
      
      const session = {
        id: `pack-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        orderId,
        packerId: packerId || req.user?.id || 'system',
        startedAt: new Date().toISOString(),
        status: 'in_progress',
        timer: {
          startTime: Date.now(),
          elapsed: 0,
          paused: false
        },
        steps: {
          itemsPicked: false,
          cartonSelected: false,
          itemsPacked: false,
          documentsIncluded: false,
          labelPrinted: false,
          photoCaptured: false
        },
        documents: [],
        cartons: [],
        notes: []
      };
      
      // In production, save to database
      res.json(session);
    } catch (error) {
      console.error('Error creating packing session:', error);
      res.status(500).json({ message: 'Failed to create packing session' });
    }
  });

  // Update packing session
  app.patch('/api/packing/sessions/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const updates = req.body;
      
      // In production, fetch from database
      const updatedSession = {
        id: sessionId,
        ...updates,
        lastUpdated: new Date().toISOString()
      };
      
      res.json(updatedSession);
    } catch (error) {
      console.error('Error updating packing session:', error);
      res.status(500).json({ message: 'Failed to update packing session' });
    }
  });

  // Get packing session
  app.get('/api/packing/sessions/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      // In production, fetch from database
      const session = {
        id: sessionId,
        orderId: 'ORD-2025-0001',
        packerId: 'user-123',
        startedAt: new Date().toISOString(),
        status: 'in_progress',
        timer: {
          startTime: Date.now(),
          elapsed: 0,
          paused: false
        }
      };
      
      res.json(session);
    } catch (error) {
      console.error('Error fetching packing session:', error);
      res.status(500).json({ message: 'Failed to fetch packing session' });
    }
  });

  // Save packing details with multi-carton support
  app.post('/api/orders/:id/packing-details', async (req: any, res) => {
    try {
      const { 
        cartons, // Array of selected cartons
        packageWeight,
        printedDocuments,
        packingChecklist,
        multiCartonOptimization
      } = req.body;
      
      // Store packing details
      const packingDetails = {
        orderId: req.params.id,
        cartons: cartons || [],
        totalWeight: packageWeight,
        documentsChecklist: printedDocuments,
        packingChecklist: packingChecklist,
        multiCartonEnabled: multiCartonOptimization,
        createdAt: new Date()
      };
      
      // Log packing details activity
      await storage.createPickPackLog({
        orderId: req.params.id,
        orderItemId: null,
        activityType: 'packing_details_saved',
        userId: "test-user",
        userName: "Test User",
        productName: '',
        sku: '',
        quantity: cartons?.length || 0,
        location: '',
        notes: `Saved packing details: ${cartons?.length || 0} carton(s), weight: ${packageWeight}kg`,
      });
      
      res.json({ success: true, packingDetails });
    } catch (error) {
      console.error("Error saving packing details:", error);
      res.status(500).json({ message: "Failed to save packing details" });
    }
  });

  // Update picked quantity for an order item
  app.patch('/api/orders/:id/items/:itemId/pick', async (req: any, res) => {
    try {
      const { pickedQuantity } = req.body;
      const orderItem = await storage.updateOrderItemPickedQuantity(req.params.itemId, pickedQuantity);
      res.json(orderItem);
    } catch (error) {
      console.error("Error updating picked quantity:", error);
      res.status(500).json({ message: "Failed to update picked quantity" });
    }
  });

  // Update packed quantity for an order item
  app.patch('/api/orders/:id/items/:itemId/pack', async (req: any, res) => {
    try {
      const { packedQuantity } = req.body;
      const orderItem = await storage.updateOrderItemPackedQuantity(req.params.itemId, packedQuantity);
      res.json(orderItem);
    } catch (error) {
      console.error("Error updating packed quantity:", error);
      res.status(500).json({ message: "Failed to update packed quantity" });
    }
  });

  // Get pick/pack logs for an order
  app.get('/api/orders/:id/pick-pack-logs', async (req: any, res) => {
    try {
      const logs = await storage.getPickPackLogs(req.params.id);
      res.json(logs);
    } catch (error) {
      console.error("Error getting pick/pack logs:", error);
      res.status(500).json({ message: "Failed to get pick/pack logs" });
    }
  });

  app.get('/api/orders/:id', async (req, res) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Enhance order items with landing costs
      if (order.items && order.items.length > 0) {
        const itemsWithLandingCosts = await Promise.all(order.items.map(async (item) => {
          if (item.productId) {
            const [productWithCost] = await db
              .select()
              .from(products)
              .where(eq(products.id, item.productId))
              .limit(1);
            
            return {
              ...item,
              landingCost: productWithCost?.latestLandingCost || null
            };
          }
          return item;
        }));
        
        order.items = itemsWithLandingCosts;
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.post('/api/orders', async (req: any, res) => {
    try {
      const { items, ...orderData } = req.body;
      
      // Get orderType from request body, default to 'ord'
      const orderType = orderData.orderType || 'ord';
      
      // Generate order ID with the specified order type
      const orderId = await storage.generateOrderId(orderType);
      
      const data = insertOrderSchema.parse({
        ...orderData,
        orderId,
        orderType,
        billerId: "test-user",
      });
      
      const order = await storage.createOrder(data);
      
      // Create order items
      if (items && items.length > 0) {
        console.log('Creating order items, items received:', JSON.stringify(items));
        console.log('Order ID:', order.id, 'Order Currency:', order.currency);
        for (const item of items) {
          // Map frontend price field to schema fields
          const price = item.price || 0; // Default to 0 if price is undefined
          const orderItem = {
            orderId: order.id,
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity || 1,
            price: String(price), // Main price field (required)
            unitPrice: String(price), // Original price
            appliedPrice: String(price), // Applied price (same as original for now)
            currency: order.currency, // Use order's currency
            discount: String(item.discount || 0),
            tax: String(item.tax || 0),
            total: String(item.total || price),
          };
          console.log('Creating order item:', JSON.stringify(orderItem));
          try {
            const createdItem = await storage.createOrderItem(orderItem);
            console.log('Successfully created order item:', createdItem?.id);
          } catch (itemError) {
            console.error('Failed to create order item:', itemError);
          }
        }
      } else {
        console.log('No items to create or empty items array');
      }
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'create',
        entityType: 'order',
        entityId: order.id,
        description: `Created order: ${order.orderId}`,
      });
      
      // Fetch the complete order with items to return
      const completeOrder = await storage.getOrderById(order.id);
      res.json(completeOrder);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.patch('/api/orders/:id', async (req: any, res) => {
    try {
      console.log('PATCH /api/orders/:id - Received body:', req.body);
      const { items, ...orderUpdates } = req.body;
      
      const updates = { ...orderUpdates };
      
      // Convert all date fields from strings to Date objects
      const dateFields = ['pickStartTime', 'pickEndTime', 'packStartTime', 'packEndTime', 'shippedAt', 'createdAt', 'updatedAt'];
      dateFields.forEach(field => {
        if (updates[field] && typeof updates[field] === 'string') {
          try {
            const dateValue = new Date(updates[field]);
            if (!isNaN(dateValue.getTime())) {
              console.log(`Converting ${field}: ${updates[field]} to Date object`);
              updates[field] = dateValue;
            } else {
              console.error(`Invalid date for ${field}: ${updates[field]}`);
              updates[field] = null;
            }
          } catch (dateError) {
            console.error(`Date conversion error for ${field}:`, dateError);
            updates[field] = null;
          }
        }
      });
      
      // Remove undefined fields
      Object.keys(updates).forEach(key => 
        updates[key] === undefined && delete updates[key]
      );
      
      console.log('Updates after date conversion:', updates);
      
      const order = await storage.updateOrder(req.params.id, updates);
      
      // Check if order exists
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Update order items if provided
      if (items && Array.isArray(items)) {
        // Delete existing items and add new ones
        await storage.deleteOrderItems(req.params.id);
        
        // Add new items
        for (const item of items) {
          const orderDetail = await storage.getOrderById(req.params.id);
          await storage.createOrderItem({
            orderId: req.params.id,
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            price: String(item.price || 0), // Main price field (required)
            unitPrice: String(item.price || 0),
            appliedPrice: String(item.price || 0),
            currency: orderDetail?.currency || 'CZK',
            discount: String(item.discount || 0),
            tax: String(item.tax || 0),
            total: String(item.total || 0),
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

  // Update individual order item
  app.patch('/api/orders/:orderId/items/:itemId', async (req: any, res) => {
    try {
      const { pickedQuantity, packedQuantity, ...otherUpdates } = req.body;
      
      let updatedItem;
      
      // Handle specific quantity updates
      if (pickedQuantity !== undefined) {
        updatedItem = await storage.updateOrderItemPickedQuantity(req.params.itemId, pickedQuantity);
      } else if (packedQuantity !== undefined) {
        updatedItem = await storage.updateOrderItemPackedQuantity(req.params.itemId, packedQuantity);
      } else if (Object.keys(otherUpdates).length > 0) {
        // Handle general updates
        updatedItem = await storage.updateOrderItem(req.params.itemId, otherUpdates);
      } else {
        return res.status(400).json({ message: "No updates provided" });
      }
      
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating order item:", error);
      res.status(500).json({ message: "Failed to update order item" });
    }
  });

  // Detect and mark orders as modified after packing
  app.post('/api/orders/:id/check-modifications', async (req: any, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrder(id);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      // Check if order is in ready state and has been modified
      if (order.orderStatus === 'ready_to_ship' && order.packStatus === 'completed') {
        const { modificationNotes } = req.body;
        
        // Mark order as modified
        const updatedOrder = await storage.updateOrder(id, {
          modifiedAfterPacking: true,
          modificationNotes: modificationNotes || 'Items have been changed after packing',
          lastModifiedAt: new Date(),
          previousPackStatus: order.packStatus
        });
        
        // Log the modification
        await storage.createPickPackLog({
          orderId: id,
          activityType: 'order_modified',
          userId: req.user?.id || 'system',
          userName: req.user?.firstName || 'System',
          notes: modificationNotes || 'Order modified after packing'
        });
        
        res.json({
          modified: true,
          order: updatedOrder,
          message: 'Order marked as modified and needs repacking'
        });
      } else {
        res.json({
          modified: false,
          message: 'Order is not in a state that requires modification tracking'
        });
      }
    } catch (error) {
      console.error('Error checking order modifications:', error);
      res.status(500).json({ message: 'Failed to check order modifications' });
    }
  });



  // Batch undo ship - Return orders to ready status
  app.post('/api/orders/batch-undo-ship', async (req: any, res) => {
    try {
      const { orderIds } = req.body;
      
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ message: "Order IDs array is required" });
      }
      
      const results = [];
      const errors = [];
      
      // Process all orders in parallel for better performance
      const updatePromises = orderIds.map(async (orderId) => {
        try {
          // Skip mock orders
          if (orderId.startsWith('mock-')) {
            return { id: orderId, success: true, message: 'Mock order unshipped' };
          }
          
          const updates = {
            orderStatus: 'ready_to_ship' as const,
            packStatus: 'completed' as const,
            shippedAt: null
          };
          
          const order = await storage.updateOrder(orderId, updates);
          
          if (order) {
            // Log the undo action
            await storage.createPickPackLog({
              orderId: orderId,
              activityType: 'order_unshipped',
              userId: "test-user",
              userName: 'System',
              notes: `Order ${order.orderId} shipment undone`,
            });
            
            return { id: orderId, success: true, order };
          } else {
            return { id: orderId, success: false, error: 'Order not found' };
          }
        } catch (error) {
          console.error(`Error undoing shipment for order ${orderId}:`, error);
          return { id: orderId, success: false, error: error.message || 'Unknown error' };
        }
      });
      
      // Wait for all updates to complete
      const allResults = await Promise.all(updatePromises);
      
      // Separate successful and failed updates
      allResults.forEach(result => {
        if (result.success) {
          results.push(result);
        } else {
          errors.push(result);
        }
      });
      
      res.json({
        success: true,
        unshipped: results.length,
        failed: errors.length,
        results,
        errors,
        message: `Successfully unshipped ${results.length} orders${errors.length > 0 ? `, ${errors.length} failed` : ''}`
      });
      
    } catch (error) {
      console.error("Error in batch undo ship orders:", error);
      res.status(500).json({ message: "Failed to batch undo ship orders" });
    }
  });

  // Batch update order status - Optimized for multiple orders
  app.post('/api/orders/batch-ship', async (req: any, res) => {
    try {
      const { orderIds } = req.body;
      
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ message: "Order IDs array is required" });
      }
      
      const shippedAt = new Date();
      const results = [];
      const errors = [];
      
      // Process all orders in parallel for better performance
      const updatePromises = orderIds.map(async (orderId) => {
        try {
          // Skip mock orders
          if (orderId.startsWith('mock-')) {
            return { id: orderId, success: true, message: 'Mock order shipped' };
          }
          
          const updates = {
            orderStatus: 'shipped' as const,
            packStatus: 'completed' as const,
            shippedAt
          };
          
          const order = await storage.updateOrder(orderId, updates);
          
          if (order) {
            // Log the shipping action
            await storage.createPickPackLog({
              orderId: orderId,
              activityType: 'order_shipped',
              userId: "test-user",
              userName: 'System',
              notes: `Order ${order.orderId} marked as shipped`,
            });
            
            return { id: orderId, success: true, order };
          } else {
            return { id: orderId, success: false, error: 'Order not found' };
          }
        } catch (error) {
          console.error(`Error shipping order ${orderId}:`, error);
          return { id: orderId, success: false, error: error.message || 'Unknown error' };
        }
      });
      
      // Wait for all updates to complete
      const allResults = await Promise.all(updatePromises);
      
      // Separate successful and failed updates
      allResults.forEach(result => {
        if (result.success) {
          results.push(result);
        } else {
          errors.push(result);
        }
      });
      
      res.json({
        success: true,
        shipped: results.length,
        failed: errors.length,
        results,
        errors,
        message: `Successfully shipped ${results.length} orders${errors.length > 0 ? `, ${errors.length} failed` : ''}`
      });
      
    } catch (error) {
      console.error("Error in batch ship orders:", error);
      res.status(500).json({ message: "Failed to batch ship orders" });
    }
  });

  // Update order status for Pick & Pack workflow
  app.patch('/api/orders/:id/status', async (req: any, res) => {
    try {
      const { status, orderStatus, pickStatus, packStatus, pickedBy, packedBy, pickStartTime, pickEndTime, packStartTime, packEndTime } = req.body;
      
      const updates: any = {};
      // Support both 'status' and 'orderStatus' fields - map to orderStatus which is the DB field
      if (status) updates.orderStatus = status;
      if (orderStatus) updates.orderStatus = orderStatus; 
      if (pickStatus) updates.pickStatus = pickStatus;
      if (packStatus) updates.packStatus = packStatus;
      if (pickedBy) updates.pickedBy = pickedBy;
      if (packedBy) updates.packedBy = packedBy;

      // Add timestamps if provided explicitly or based on status changes
      if (pickStartTime !== undefined) {
        updates.pickStartTime = pickStartTime ? new Date(pickStartTime) : null;
      } else if (pickStatus === 'in_progress' && !req.body.hasOwnProperty('pickStartTime')) {
        updates.pickStartTime = new Date();
      }
      
      if (pickEndTime !== undefined) {
        updates.pickEndTime = pickEndTime ? new Date(pickEndTime) : null;
      } else if (pickStatus === 'completed' && !req.body.hasOwnProperty('pickEndTime')) {
        updates.pickEndTime = new Date();
      }
      
      if (packStartTime !== undefined) {
        updates.packStartTime = packStartTime ? new Date(packStartTime) : null;
      } else if (packStatus === 'in_progress' && !req.body.hasOwnProperty('packStartTime')) {
        updates.packStartTime = new Date();
      }
      
      if (packEndTime !== undefined) {
        updates.packEndTime = packEndTime ? new Date(packEndTime) : null;
      } else if (packStatus === 'completed' && !req.body.hasOwnProperty('packEndTime')) {
        updates.packEndTime = new Date();
      }
      
      // Check if order is being marked as shipped
      if (updates.orderStatus === 'shipped') {
        updates.shippedAt = new Date();
      }
      
      // Check if this is a mock order (skip database update)
      if (req.params.id.startsWith('mock-')) {
        return res.json({ id: req.params.id, ...updates, message: 'Mock order updated' });
      }
      
      const order = await storage.updateOrder(req.params.id, updates);
      
      if (order) {
        // Create pick/pack logs based on status changes
        if (pickStatus === 'in_progress' && pickedBy) {
          await storage.createPickPackLog({
            orderId: req.params.id,
            activityType: 'picking_started',
            userId: "test-user",
            userName: pickedBy,
            notes: `Started picking order ${order.orderId}`,
          });
        }
        
        if (pickStatus === 'completed') {
          await storage.createPickPackLog({
            orderId: req.params.id,
            activityType: 'picking_completed',
            userId: "test-user",
            userName: pickedBy || 'Unknown',
            notes: `Completed picking order ${order.orderId}`,
          });
        }
        
        if (packStatus === 'in_progress' && packedBy) {
          await storage.createPickPackLog({
            orderId: req.params.id,
            activityType: 'packing_started',
            userId: "test-user",
            userName: packedBy,
            notes: `Started packing order ${order.orderId}`,
          });
        }
        
        if (packStatus === 'completed') {
          await storage.createPickPackLog({
            orderId: req.params.id,
            activityType: 'packing_completed',
            userId: "test-user",
            userName: packedBy || 'Unknown',
            notes: `Completed packing order ${order.orderId}`,
          });
        }
        
        // Also keep the user activity log
        await storage.createUserActivity({
          userId: "test-user",
          action: 'update',
          entityType: 'order',
          entityId: order.id,
          description: `Updated order status to ${orderStatus || finalStatus}: ${order.orderId}`,
        });
        res.json(order);
      } else {
        res.status(404).json({ message: "Order not found" });
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
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

  app.get('/api/expenses/:id', async (req, res) => {
    try {
      const expense = await storage.getExpenseById(req.params.id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      console.error("Error fetching expense:", error);
      res.status(500).json({ message: "Failed to fetch expense" });
    }
  });

  app.post('/api/expenses', async (req: any, res) => {
    try {
      // Extract the amount from the currency-specific field
      const amountFields = ['amountCzk', 'amountEur', 'amountUsd', 'amountVnd', 'amountCny'];
      let amount = 0;
      for (const field of amountFields) {
        if (req.body[field]) {
          amount = req.body[field];
          break;
        }
      }
      
      // Convert date strings to Date objects and prepare data for parsing
      const bodyWithDates = {
        ...req.body,
        amount: amount.toString(),
        totalCost: amount.toString(), // Add totalCost field which is required by the schema
        date: req.body.date ? new Date(req.body.date) : undefined,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      };
      
      const data = insertExpenseSchema.parse(bodyWithDates);
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

  app.patch('/api/expenses/:id', async (req: any, res) => {
    try {
      // Get the existing expense first to preserve its name for the activity log
      const existingExpense = await storage.getExpenseById(req.params.id);
      if (!existingExpense) {
        return res.status(404).json({ message: "Expense not found" });
      }

      const expense = await storage.updateExpense(req.params.id, req.body);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'update',
        entityType: 'expense',
        entityId: expense.id,
        description: `Updated expense: ${expense.name}`,
      });
      
      res.json(expense);
    } catch (error) {
      console.error("Error updating expense:", error);
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  app.delete('/api/expenses/:id', async (req: any, res) => {
    try {
      const expense = await storage.getExpenseById(req.params.id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      await storage.deleteExpense(req.params.id);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'delete',
        entityType: 'expense',
        entityId: req.params.id,
        description: `Deleted expense: ${expense.name}`,
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // Services endpoints
  app.get('/api/services', async (req, res) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.post('/api/services', async (req: any, res) => {
    try {
      const data = insertServiceSchema.parse(req.body);
      const service = await storage.createService(data);
      res.json(service);
    } catch (error) {
      console.error("Error creating service:", error);
      res.status(500).json({ message: "Failed to create service" });
    }
  });

  app.patch('/api/services/:id', async (req: any, res) => {
    try {
      const service = await storage.updateService(req.params.id, req.body);
      res.json(service);
    } catch (error) {
      console.error("Error updating service:", error);
      res.status(500).json({ message: "Failed to update service" });
    }
  });

  app.delete('/api/services/:id', async (req: any, res) => {
    try {
      await storage.deleteService(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ message: "Failed to delete service" });
    }
  });

  // Pre-Orders endpoints
  app.get('/api/pre-orders', async (req, res) => {
    try {
      const preOrders = await storage.getPreOrders();
      res.json(preOrders);
    } catch (error) {
      console.error("Error fetching pre-orders:", error);
      res.status(500).json({ message: "Failed to fetch pre-orders" });
    }
  });

  app.get('/api/pre-orders/:id', async (req, res) => {
    try {
      const preOrder = await storage.getPreOrder(req.params.id);
      if (!preOrder) {
        return res.status(404).json({ message: "Pre-order not found" });
      }
      
      const items = await storage.getPreOrderItems(req.params.id);
      res.json({ ...preOrder, items });
    } catch (error) {
      console.error("Error fetching pre-order:", error);
      res.status(500).json({ message: "Failed to fetch pre-order" });
    }
  });

  app.post('/api/pre-orders', async (req: any, res) => {
    try {
      const data = insertPreOrderSchema.parse(req.body);
      const preOrder = await storage.createPreOrder(data);
      res.status(201).json(preOrder);
    } catch (error) {
      console.error("Error creating pre-order:", error);
      res.status(500).json({ message: "Failed to create pre-order" });
    }
  });

  app.patch('/api/pre-orders/:id', async (req: any, res) => {
    try {
      const preOrder = await storage.getPreOrder(req.params.id);
      if (!preOrder) {
        return res.status(404).json({ message: "Pre-order not found" });
      }
      
      const updates = insertPreOrderSchema.partial().parse(req.body);
      const updatedPreOrder = await storage.updatePreOrder(req.params.id, updates);
      res.json(updatedPreOrder);
    } catch (error) {
      console.error("Error updating pre-order:", error);
      res.status(500).json({ message: "Failed to update pre-order" });
    }
  });

  app.delete('/api/pre-orders/:id', async (req: any, res) => {
    try {
      const preOrder = await storage.getPreOrder(req.params.id);
      if (!preOrder) {
        return res.status(404).json({ message: "Pre-order not found" });
      }
      
      await storage.deletePreOrder(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting pre-order:", error);
      res.status(500).json({ message: "Failed to delete pre-order" });
    }
  });

  // Pre-Order Items endpoints
  app.get('/api/pre-orders/:preOrderId/items', async (req, res) => {
    try {
      const items = await storage.getPreOrderItems(req.params.preOrderId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching pre-order items:", error);
      res.status(500).json({ message: "Failed to fetch pre-order items" });
    }
  });

  app.post('/api/pre-orders/:preOrderId/items', async (req: any, res) => {
    try {
      const data = insertPreOrderItemSchema.parse({
        ...req.body,
        preOrderId: req.params.preOrderId
      });
      const item = await storage.createPreOrderItem(data);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating pre-order item:", error);
      res.status(500).json({ message: "Failed to create pre-order item" });
    }
  });

  app.patch('/api/pre-order-items/:id', async (req: any, res) => {
    try {
      const updates = insertPreOrderItemSchema.partial().parse(req.body);
      const item = await storage.updatePreOrderItem(req.params.id, updates);
      res.json(item);
    } catch (error) {
      console.error("Error updating pre-order item:", error);
      res.status(500).json({ message: "Failed to update pre-order item" });
    }
  });

  app.delete('/api/pre-order-items/:id', async (req: any, res) => {
    try {
      const deleted = await storage.deletePreOrderItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Pre-order item not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting pre-order item:", error);
      res.status(500).json({ message: "Failed to delete pre-order item" });
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

  // Import routes
  app.use('/api/imports', imports);
  
  // World-record speed optimization routes
  app.use('/api/optimize', optimizeDb);
  
  // Returns endpoints
  app.get('/api/returns', async (req, res) => {
    try {
      const returns = await storage.getReturns();
      res.json(returns);
    } catch (error) {
      console.error("Error fetching returns:", error);
      res.status(500).json({ message: "Failed to fetch returns" });
    }
  });
  
  app.get('/api/returns/:id', async (req, res) => {
    try {
      const returnData = await storage.getReturnById(req.params.id);
      if (!returnData) {
        return res.status(404).json({ message: "Return not found" });
      }
      res.json(returnData);
    } catch (error) {
      console.error("Error fetching return:", error);
      res.status(500).json({ message: "Failed to fetch return" });
    }
  });
  
  app.post('/api/returns', async (req: any, res) => {
    try {
      const { items, ...returnData } = req.body;
      
      // Convert date strings to Date objects
      if (returnData.returnDate) {
        returnData.returnDate = new Date(returnData.returnDate);
      }
      if (returnData.createdAt) {
        returnData.createdAt = new Date(returnData.createdAt);
      }
      if (returnData.processedDate) {
        returnData.processedDate = new Date(returnData.processedDate);
      }
      
      // Create the return
      const newReturn = await storage.createReturn(returnData);
      
      // Create return items
      if (items && items.length > 0) {
        await Promise.all(items.map((item: any) => 
          storage.createReturnItem({
            ...item,
            returnId: newReturn.id,
          })
        ));
      }
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'created',
        entityType: 'return',
        entityId: newReturn.id,
        description: `Created return: ${newReturn.returnId}`,
      });
      
      res.json(newReturn);
    } catch (error) {
      console.error("Error creating return:", error);
      res.status(500).json({ message: "Failed to create return" });
    }
  });
  
  app.put('/api/returns/:id', async (req: any, res) => {
    try {
      const { items, ...returnData } = req.body;
      
      // Convert date strings to Date objects
      if (returnData.returnDate) {
        returnData.returnDate = new Date(returnData.returnDate);
      }
      if (returnData.createdAt) {
        returnData.createdAt = new Date(returnData.createdAt);
      }
      if (returnData.processedDate) {
        returnData.processedDate = new Date(returnData.processedDate);
      }
      
      // Update the return
      const updatedReturn = await storage.updateReturn(req.params.id, returnData);
      
      // Delete existing items and recreate
      if (items) {
        await storage.deleteReturnItems(req.params.id);
        await Promise.all(items.map((item: any) => 
          storage.createReturnItem({
            ...item,
            returnId: req.params.id,
          })
        ));
      }
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'updated',
        entityType: 'return',
        entityId: updatedReturn.id,
        description: `Updated return: ${updatedReturn.returnId}`,
      });
      
      res.json(updatedReturn);
    } catch (error) {
      console.error("Error updating return:", error);
      res.status(500).json({ message: "Failed to update return" });
    }
  });
  
  app.delete('/api/returns/:id', async (req: any, res) => {
    try {
      const returnData = await storage.getReturnById(req.params.id);
      if (!returnData) {
        return res.status(404).json({ message: "Return not found" });
      }
      
      await storage.deleteReturn(req.params.id);
      
      await storage.createUserActivity({
        userId: "test-user",
        action: 'deleted',
        entityType: 'return',
        entityId: req.params.id,
        description: `Deleted return: ${returnData.returnId}`,
      });
      
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting return:", error);
      
      if (error.code === '23503' || error.message?.includes('constraint')) {
        return res.status(409).json({ 
          message: "Cannot delete return - it's being referenced by other records" 
        });
      }
      
      res.status(500).json({ message: "Failed to delete return" });
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

  // Clear and reseed sales/discounts data
  app.post('/api/reseed-discounts', async (req, res) => {
    try {
      // Clear existing sales data
      await storage.deleteAllSales();
      console.log("Cleared all existing sales/discounts data");
      
      // Create new discounts data
      const newDiscounts = [
        {
          id: nanoid(),
          name: "Summer Tech Sale 2025",
          description: "Big discounts on electronics for summer",
          discountType: "percentage" as const,
          percentage: 20,
          applicationScope: "specific_category" as const,
          categoryId: "cat-books",
          startDate: new Date("2025-06-01"),
          endDate: new Date("2025-08-31"),
          status: "active" as const,
        },
        {
          id: nanoid(),
          name: "New Customer Welcome",
          description: "Welcome discount for first-time customers",
          discountType: "percentage" as const,
          percentage: 10,
          applicationScope: "all_products" as const,
          startDate: new Date("2025-01-01"),
          endDate: new Date("2025-12-31"),
          status: "active" as const,
        },
        {
          id: nanoid(),
          name: "Bulk Fashion Deal",
          description: "Buy 3 Get 1 Free on clothing items",
          discountType: "buy_x_get_y" as const,
          buyQuantity: 3,
          getQuantity: 1,
          getProductType: "same_product" as const,
          applicationScope: "specific_category" as const,
          categoryId: "cat-beauty",
          startDate: new Date("2025-01-01"),
          endDate: new Date("2025-12-31"),
          status: "active" as const,
        },
        {
          id: nanoid(),
          name: "Flash Weekend Deal",
          description: "Limited time weekend offer",
          discountType: "fixed_amount" as const,
          fixedAmount: "25.00",
          applicationScope: "all_products" as const,
          startDate: new Date("2025-08-01"),
          endDate: new Date("2025-08-04"),
          status: "active" as const,
        },
        {
          id: nanoid(),
          name: "VIP Member Exclusive",
          description: "Exclusive discount for VIP members",
          discountType: "percentage" as const,
          percentage: 30,
          applicationScope: "all_products" as const,
          startDate: new Date("2025-01-01"),
          endDate: new Date("2025-12-31"),
          status: "active" as const,
        }
      ];

      // Create each discount
      for (const discount of newDiscounts) {
        await storage.createSale(discount);
        console.log(`Created discount: ${discount.name}`);
      }

      res.json({ 
        message: "Discounts data reseeded successfully",
        count: newDiscounts.length 
      });
    } catch (error) {
      console.error("Error reseeding discounts:", error);
      res.status(500).json({ message: "Failed to reseed discounts data" });
    }
  });

  // Reseed all data
  app.post("/api/reseed-all", async (req, res) => {
    try {
      const { reseedAllDataComprehensive } = await import("./reseedAllDataComprehensive.js");
      const result = await reseedAllDataComprehensive();
      res.json({ 
        message: "All data reseeded successfully",
        counts: result
      });
    } catch (error) {
      console.error("Error reseeding all data:", error);
      res.status(500).json({ error: "Failed to reseed all data" });
    }
  });

  // Register warehouse location routes
  // app.use('/api', locationsRouter);
  // app.use('/api', putawayRouter);
  // app.use('/api', importOrdersRouter);
  
  // Imports routes registered above

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
  
  // Seed returns data
  app.post('/api/seed-returns', async (req, res) => {
    try {
      const { seedReturns } = await import('./seedReturns');
      await seedReturns();
      res.json({ message: "Returns seeded successfully" });
    } catch (error) {
      console.error("Error seeding returns:", error);
      res.status(500).json({ message: "Failed to seed returns" });
    }
  });

  // Seed Pick & Pack data with bundles
  app.post('/api/seed-pick-pack', async (req, res) => {
    try {
      const { seedPickPackData } = await import('./seedPickPackData.js');
      const result = await seedPickPackData();
      res.json({ 
        message: "Pick & Pack data with bundles seeded successfully",
        counts: result 
      });
    } catch (error) {
      console.error("Error seeding pick & pack data:", error);
      res.status(500).json({ message: "Failed to seed pick & pack data" });
    }
  });

  // Sendcloud API routes
  const { sendcloudService } = await import('./services/sendcloud');

  // Test Sendcloud connection
  app.get('/api/shipping/test-connection', async (req, res) => {
    try {
      const result = await sendcloudService.testConnection();
      res.json(result);
    } catch (error) {
      console.error('Sendcloud connection test failed:', error);
      res.status(500).json({ 
        connected: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Get available shipping methods
  app.get('/api/shipping/methods', async (req, res) => {
    try {
      const methods = await sendcloudService.getShippingMethods();
      res.json(methods);
    } catch (error) {
      console.error('Failed to fetch shipping methods:', error);
      res.status(500).json({ error: 'Failed to fetch shipping methods' });
    }
  });

  // Create shipping label for order
  app.post('/api/shipping/create-label', async (req, res) => {
    try {
      const orderData = req.body;
      
      // Validate required fields
      if (!orderData.orderNumber || !orderData.customerName || !orderData.shippingAddress) {
        return res.status(400).json({ error: 'Missing required order data' });
      }

      const result = await sendcloudService.createShippingLabel(orderData);
      res.json(result);
    } catch (error) {
      console.error('Failed to create shipping label:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to create shipping label' 
      });
    }
  });

  // Get tracking information
  app.get('/api/shipping/tracking/:parcelId', async (req, res) => {
    try {
      const parcelId = parseInt(req.params.parcelId);
      if (isNaN(parcelId)) {
        return res.status(400).json({ error: 'Invalid parcel ID' });
      }

      const tracking = await sendcloudService.getTracking(parcelId);
      res.json(tracking);
    } catch (error) {
      console.error('Failed to get tracking info:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get tracking info' 
      });
    }
  });

  // Get service points (pickup locations)
  app.get('/api/shipping/service-points', async (req, res) => {
    try {
      const { country, postalCode, carrier } = req.query;
      
      if (!country || !postalCode) {
        return res.status(400).json({ error: 'Country and postal code are required' });
      }

      const servicePoints = await sendcloudService.getServicePoints(
        country as string, 
        postalCode as string, 
        carrier as string
      );
      res.json(servicePoints);
    } catch (error) {
      console.error('Failed to fetch service points:', error);
      res.status(500).json({ error: 'Failed to fetch service points' });
    }
  });

  // Cancel parcel
  app.post('/api/shipping/cancel/:parcelId', async (req, res) => {
    try {
      const parcelId = parseInt(req.params.parcelId);
      if (isNaN(parcelId)) {
        return res.status(400).json({ error: 'Invalid parcel ID' });
      }

      const success = await sendcloudService.cancelParcel(parcelId);
      res.json({ success });
    } catch (error) {
      console.error('Failed to cancel parcel:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to cancel parcel' 
      });
    }
  });

  // Create test parcel
  app.post('/api/shipping/create-test-parcel', async (req, res) => {
    try {
      const address = req.body;
      
      if (!address.name || !address.address || !address.city || !address.postal_code || !address.country) {
        return res.status(400).json({ error: 'Missing required address fields' });
      }

      const result = await sendcloudService.createTestParcel(address);
      res.json(result);
    } catch (error) {
      console.error('Failed to create test parcel:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to create test parcel' 
      });
    }
  });

  // Weight Calculation AI Endpoints
  
  // Calculate package weight for an order
  app.post('/api/orders/:orderId/calculate-weight', async (req, res) => {
    try {
      const { orderId } = req.params;
      const { selectedCartonId, optimizeMultipleCartons } = req.body;
      
      const calculation = await weightCalculationService.calculatePackageWeight(
        orderId, 
        selectedCartonId, 
        optimizeMultipleCartons
      );
      res.json(calculation);
    } catch (error) {
      console.error('Error calculating package weight:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to calculate package weight' 
      });
    }
  });

  // Multi-carton optimization endpoint
  app.post('/api/orders/:orderId/optimize-multi-carton', async (req, res) => {
    try {
      const { orderId } = req.params;
      
      const optimization = await weightCalculationService.optimizeMultiCartonPacking(orderId);
      res.json(optimization);
    } catch (error) {
      console.error('Error optimizing multi-carton packing:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to optimize multi-carton packing' 
      });
    }
  });

  // Get available cartons for selection
  app.get('/api/cartons/available', async (req, res) => {
    try {
      const cartons = weightCalculationService.getAvailableCartons();
      res.json(cartons);
    } catch (error) {
      console.error('Error getting available cartons:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get available cartons' 
      });
    }
  });

  // Recommend optimal carton for an order
  app.get('/api/orders/:orderId/recommend-carton', async (req, res) => {
    try {
      const { orderId } = req.params;
      
      const recommendation = await weightCalculationService.recommendOptimalCarton(orderId);
      res.json(recommendation);
    } catch (error) {
      console.error('Error recommending carton:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to recommend carton' 
      });
    }
  });

  // Real-time weight calculation as items are picked
  app.post('/api/orders/:orderId/realtime-weight', async (req, res) => {
    try {
      const { orderId } = req.params;
      const { pickedItems, selectedCartonId } = req.body;
      
      // Create a temporary order object with current picked quantities
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      // Update quantities with picked amounts
      const updatedOrder = {
        ...order,
        items: order.items.map(item => ({
          ...item,
          quantity: pickedItems[item.id] || 0
        }))
      };
      
      // Calculate weight with current picked items
      const calculation = await weightCalculationService.calculatePackageWeight(orderId, selectedCartonId);
      res.json(calculation);
    } catch (error) {
      console.error('Error calculating real-time weight:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to calculate real-time weight' 
      });
    }
  });

  // Product Files Routes
  app.get('/api/product-files', async (req, res) => {
    try {
      const { productId, fileType } = req.query;
      
      let files;
      if (fileType) {
        files = await storage.getFilesByType(fileType as string);
      } else if (productId) {
        files = await storage.getProductFiles(productId as string);
      } else {
        files = await storage.getAllFiles();
      }
      
      res.json(files);
    } catch (error) {
      console.error('Error fetching product files:', error);
      res.status(500).json({ message: 'Failed to fetch product files' });
    }
  });

  // Get files required for packing an order
  app.get('/api/orders/:orderId/packing-files', async (req, res) => {
    try {
      const { orderId } = req.params;
      
      // Get order items
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      const items = await storage.getOrderItems(orderId);
      const productIds = [...new Set(items.map(item => item.productId))];
      
      // Get all files for products in this order
      const filesPromises = productIds.map(productId => storage.getProductFiles(productId));
      const filesArrays = await Promise.all(filesPromises);
      const allFiles = filesArrays.flat();
      
      // Group files by type for easy display
      const filesByType = {
        MSDS: allFiles.filter(f => f.fileType === 'MSDS'),
        CPNP: allFiles.filter(f => f.fileType === 'CPNP'),
        Leaflet: allFiles.filter(f => f.fileType === 'Leaflet'),
        Manual: allFiles.filter(f => f.fileType === 'Manual'),
        Certificate: allFiles.filter(f => f.fileType === 'Certificate'),
        Other: allFiles.filter(f => f.fileType === 'Other'),
      };
      
      res.json({
        orderId,
        totalFiles: allFiles.length,
        filesByType,
        files: allFiles
      });
    } catch (error) {
      console.error('Error fetching packing files:', error);
      res.status(500).json({ message: 'Failed to fetch packing files' });
    }
  });

  app.post('/api/product-files', async (req, res) => {
    try {
      const file = await storage.createProductFile(req.body);
      res.json(file);
    } catch (error) {
      console.error('Error creating product file:', error);
      res.status(500).json({ message: 'Failed to create product file' });
    }
  });

  // Mark documents as included in packing
  app.post('/api/orders/:orderId/packing-documents', async (req, res) => {
    try {
      const { orderId } = req.params;
      const { documentIds, packingSessionId } = req.body;
      
      // Update packing session with included documents
      const packingDocuments = {
        orderId,
        packingSessionId: packingSessionId || `pack-${Date.now()}`,
        documentIds,
        includedAt: new Date().toISOString(),
        includedBy: req.user?.id || 'system'
      };
      
      // Store packing document tracking (would need a new table in production)
      res.json({
        success: true,
        packingDocuments
      });
    } catch (error) {
      console.error('Error tracking packing documents:', error);
      res.status(500).json({ message: 'Failed to track packing documents' });
    }
  });

  // Complete packing with document checklist
  app.post('/api/orders/:orderId/complete-packing', async (req, res) => {
    try {
      const { orderId } = req.params;
      const { 
        packingSessionId,
        usedCartons,
        actualWeight,
        includedDocuments,
        packingNotes,
        packingPhotos,
        shippingLabel
      } = req.body;
      
      // Update order status to ready_to_ship
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      // Create packing completion record
      const packingCompletion = {
        orderId,
        packingSessionId: packingSessionId || `pack-${Date.now()}`,
        completedAt: new Date().toISOString(),
        completedBy: req.user?.id || 'system',
        usedCartons: usedCartons || [],
        actualWeight: actualWeight || 0,
        includedDocuments: includedDocuments || [],
        packingNotes: packingNotes || '',
        packingPhotos: packingPhotos || [],
        shippingLabel: shippingLabel || null,
        previousStatus: order.status,
        newStatus: 'ready_to_ship'
      };
      
      // Update order status
      await storage.updateOrder(orderId, {
        ...order,
        status: 'ready_to_ship',
        packingCompletedAt: new Date().toISOString()
      });
      
      res.json({
        success: true,
        packingCompletion,
        order: {
          ...order,
          status: 'ready_to_ship'
        }
      });
    } catch (error) {
      console.error('Error completing packing:', error);
      res.status(500).json({ message: 'Failed to complete packing' });
    }
  });

  // Carton Packing Optimization Routes
  
  // Get all available packing cartons
  app.get('/api/packing-cartons', async (req, res) => {
    try {
      const cartons = await storage.getPackingCartons();
      res.json(cartons);
    } catch (error) {
      console.error('Error fetching packing cartons:', error);
      res.status(500).json({ message: 'Failed to fetch packing cartons' });
    }
  });

  // Optimize packing without saving (on-the-fly optimization)
  app.post('/api/packing/optimize', async (req, res) => {
    try {
      const { items, shippingCountry } = req.body;
      
      if (!items || items.length === 0) {
        return res.status(400).json({ message: 'No items provided for optimization' });
      }

      // Enrich items with product information
      const enrichedItems = await Promise.all(
        items.map(async (item: any) => {
          const product = await storage.getProductById(item.productId);
          return {
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            price: item.price,
            product
          };
        })
      );

      // Fetch all packing cartons
      const cartons = await storage.getPackingCartons();
      if (!cartons || cartons.length === 0) {
        return res.status(400).json({ message: 'No packing cartons configured' });
      }

      // Call optimization service
      console.log(`Optimizing carton packing for ${enrichedItems.length} items (shipping to ${shippingCountry})`);
      const packingPlan = await optimizeCartonPacking(enrichedItems, cartons);

      // Calculate estimated shipping cost based on total weight and cartons
      let estimatedShippingCost = 0;
      for (const carton of packingPlan.cartons) {
        const cartonInfo = cartons.find(c => c.id === carton.cartonId);
        if (cartonInfo && cartonInfo.shippingCost) {
          estimatedShippingCost += parseFloat(cartonInfo.shippingCost);
        }
      }

      // Return the optimization plan without saving to database
      res.json({
        totalCartons: packingPlan.totalCartons,
        totalWeight: packingPlan.totalWeightKg,
        avgUtilization: packingPlan.avgUtilization,
        estimatedShippingCost,
        suggestions: packingPlan.suggestions,
        cartons: packingPlan.cartons.map(carton => {
          const cartonInfo = cartons.find(c => c.id === carton.cartonId);
          return {
            cartonNumber: carton.cartonNumber,
            cartonId: carton.cartonId,
            cartonName: cartonInfo?.name || 'Unknown',
            dimensions: cartonInfo ? `${cartonInfo.lengthCm}x${cartonInfo.widthCm}x${cartonInfo.heightCm}cm` : '',
            weight: carton.totalWeightKg,
            utilization: carton.utilization,
            items: carton.items.map(item => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              weight: item.weightKg,
              isEstimated: item.aiEstimated
            }))
          };
        })
      });
    } catch (error) {
      console.error('Error optimizing packing:', error);
      res.status(500).json({ 
        message: 'Failed to optimize packing',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Create a packing plan for an order
  app.post('/api/orders/:orderId/packing-plan', async (req, res) => {
    try {
      const { orderId } = req.params;
      
      // Fetch order items
      const orderItems = await storage.getOrderItems(orderId);
      if (!orderItems || orderItems.length === 0) {
        return res.status(400).json({ message: 'No order items found for this order' });
      }

      // Enrich order items with product information
      const enrichedOrderItems = await Promise.all(
        orderItems.map(async (item) => {
          const product = await storage.getProductById(item.productId);
          return {
            ...item,
            product
          };
        })
      );

      // Fetch all packing cartons
      const cartons = await storage.getPackingCartons();
      if (!cartons || cartons.length === 0) {
        return res.status(400).json({ message: 'No packing cartons configured' });
      }

      // Call optimization service
      console.log(`Optimizing carton packing for order ${orderId} with ${enrichedOrderItems.length} items`);
      const packingPlan = await optimizeCartonPacking(enrichedOrderItems, cartons);

      // Save the plan to database
      const createdPlan = await storage.createOrderCartonPlan({
        orderId,
        status: 'draft',
        totalCartons: packingPlan.totalCartons,
        totalWeightKg: packingPlan.totalWeightKg.toString(),
        avgUtilization: packingPlan.avgUtilization.toString(),
        suggestions: JSON.stringify(packingPlan.suggestions)
      });

      // Save each carton's items
      const createdItems = [];
      for (const carton of packingPlan.cartons) {
        for (const item of carton.items) {
          const createdItem = await storage.createOrderCartonItem({
            planId: createdPlan.id,
            cartonId: carton.cartonId,
            cartonNumber: carton.cartonNumber,
            productId: item.productId,
            quantity: item.quantity,
            weightKg: item.weightKg.toString(),
            aiEstimated: item.aiEstimated
          });
          createdItems.push(createdItem);
        }
      }

      console.log(`Created packing plan ${createdPlan.id} with ${createdItems.length} items across ${packingPlan.totalCartons} cartons`);

      // Return the created plan with items
      res.status(201).json({
        ...createdPlan,
        items: createdItems,
        cartons: packingPlan.cartons
      });
    } catch (error) {
      console.error('Error creating packing plan:', error);
      res.status(500).json({ 
        message: 'Failed to create packing plan',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get the latest packing plan for an order
  app.get('/api/orders/:orderId/packing-plan', async (req, res) => {
    try {
      const { orderId } = req.params;
      
      // Fetch the latest packing plan
      const plan = await storage.getOrderCartonPlan(orderId);
      if (!plan) {
        return res.status(404).json({ message: 'No packing plan found for this order' });
      }

      // Fetch carton items for this plan
      const items = await storage.getOrderCartonItems(plan.id);

      // Group items by carton number
      const cartonMap = new Map();
      for (const item of items) {
        if (!cartonMap.has(item.cartonNumber)) {
          cartonMap.set(item.cartonNumber, {
            cartonId: item.cartonId,
            cartonNumber: item.cartonNumber,
            items: [],
            totalWeightKg: 0
          });
        }
        const carton = cartonMap.get(item.cartonNumber);
        carton.items.push({
          productId: item.productId,
          quantity: item.quantity,
          weightKg: parseFloat(item.weightKg),
          aiEstimated: item.aiEstimated
        });
        carton.totalWeightKg += parseFloat(item.weightKg);
      }

      // Return plan with nested carton items
      res.json({
        ...plan,
        cartons: Array.from(cartonMap.values()),
        items
      });
    } catch (error) {
      console.error('Error fetching packing plan:', error);
      res.status(500).json({ message: 'Failed to fetch packing plan' });
    }
  });

  // Update a packing plan (mainly status)
  app.patch('/api/orders/:orderId/packing-plan/:planId', async (req, res) => {
    try {
      const { planId } = req.params;
      
      // Validate request body
      const updateSchema = z.object({
        status: z.enum(['draft', 'accepted', 'archived']).optional(),
        totalCartons: z.number().optional(),
        totalWeightKg: z.string().optional(),
        avgUtilization: z.string().optional(),
        suggestions: z.string().optional()
      });

      const validatedData = updateSchema.parse(req.body);

      // Update the packing plan
      const updatedPlan = await storage.updateOrderCartonPlan(planId, validatedData);
      
      if (!updatedPlan) {
        return res.status(404).json({ message: 'Packing plan not found' });
      }

      console.log(`Updated packing plan ${planId} with status: ${validatedData.status || 'unchanged'}`);

      res.json(updatedPlan);
    } catch (error) {
      console.error('Error updating packing plan:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: 'Failed to update packing plan' });
    }
  });

  app.put('/api/product-files/:id', async (req, res) => {
    try {
      const file = await storage.updateProductFile(req.params.id, req.body);
      res.json(file);
    } catch (error) {
      console.error('Error updating product file:', error);
      res.status(500).json({ message: 'Failed to update product file' });
    }
  });

  app.delete('/api/product-files/:id', async (req, res) => {
    try {
      await storage.deleteProductFile(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting product file:', error);
      res.status(500).json({ message: 'Failed to delete product file' });
    }
  });

  // Address Autocomplete Endpoint
  app.get('/api/addresses/autocomplete', async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ message: 'Query parameter "q" is required' });
      }

      // Call Nominatim API with proper User-Agent header
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`;
      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'DavieSupply/1.0 (Warehouse Management System)'
        }
      });

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Format results
      const formattedResults = data.map((item: any) => ({
        displayName: item.display_name,
        street: item.address?.road || item.address?.pedestrian || '',
        streetNumber: item.address?.house_number || '',
        city: item.address?.city || item.address?.town || item.address?.village || '',
        zipCode: item.address?.postcode || '',
        country: item.address?.country || '',
        state: item.address?.state || '',
        lat: item.lat,
        lon: item.lon
      }));

      res.json(formattedResults);
    } catch (error) {
      console.error('Error fetching address autocomplete:', error);
      res.status(500).json({ message: 'Failed to fetch address suggestions' });
    }
  });

  // ARES Lookup Endpoint (Czech company registry)
  app.get('/api/tax/ares-lookup', async (req, res) => {
    try {
      const ico = req.query.ico as string;
      
      if (!ico) {
        return res.status(400).json({ message: 'Query parameter "ico" is required' });
      }

      // Call ARES API
      const aresUrl = `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${ico}`;
      const response = await fetch(aresUrl, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.status === 404) {
        return res.status(404).json({ message: 'Company not found in ARES registry' });
      }

      if (!response.ok) {
        throw new Error(`ARES API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Extract company information
      const companyName = data.obchodniJmeno || data.nazev || '';
      const address = data.sidlo || {};
      
      const result = {
        companyName,
        street: address.nazevUlice || '',
        streetNumber: `${address.cisloDomovni || ''}${address.cisloOrientacni ? '/' + address.cisloOrientacni : ''}`.trim(),
        city: address.nazevObce || '',
        zipCode: address.psc ? address.psc.toString() : '',
        country: 'CZ',
        dic: data.dic || ''
      };

      res.json(result);
    } catch (error) {
      console.error('Error fetching ARES data:', error);
      res.status(500).json({ message: 'Failed to fetch company data from ARES' });
    }
  });

  // VIES VAT Validation Endpoint
  app.post('/api/tax/validate-vat', async (req, res) => {
    try {
      const { vatNumber, countryCode } = req.body;

      // Validate input
      if (!vatNumber || !countryCode) {
        return res.status(400).json({ message: 'vatNumber and countryCode are required' });
      }

      if (countryCode.length !== 2) {
        return res.status(400).json({ message: 'countryCode must be 2 letters' });
      }

      // Clean VAT number (remove spaces and special characters)
      const cleanVatNumber = vatNumber.replace(/[^A-Z0-9]/gi, '');
      const upperCountryCode = countryCode.toUpperCase();

      // Create SOAP request for VIES
      const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <checkVat xmlns="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
      <countryCode>${upperCountryCode}</countryCode>
      <vatNumber>${cleanVatNumber}</vatNumber>
    </checkVat>
  </soap:Body>
</soap:Envelope>`;

      const response = await fetch('http://ec.europa.eu/taxation_customs/vies/services/checkVatService', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'checkVat'
        },
        body: soapRequest
      });

      if (!response.ok) {
        throw new Error(`VIES API error: ${response.statusText}`);
      }

      const xmlText = await response.text();

      // Parse SOAP response
      const validMatch = xmlText.match(/<valid>([^<]+)<\/valid>/);
      const nameMatch = xmlText.match(/<name>([^<]+)<\/name>/);
      const addressMatch = xmlText.match(/<address>([^<]+)<\/address>/);

      const isValid = validMatch ? validMatch[1] === 'true' : false;

      const result = {
        valid: isValid,
        companyName: nameMatch ? nameMatch[1] : undefined,
        companyAddress: addressMatch ? addressMatch[1] : undefined,
        checkedAt: new Date().toISOString()
      };

      res.json(result);
    } catch (error) {
      console.error('Error validating VAT:', error);
      
      // Return a response indicating the service might be unavailable
      res.json({
        valid: false,
        error: 'Unable to validate VAT number. VIES service may be unavailable.',
        checkedAt: new Date().toISOString()
      });
    }
  });

  // Facebook Profile Picture Endpoint
  app.get('/api/facebook/profile-picture', async (req, res) => {
    try {
      const facebookUrl = req.query.url as string;
      
      if (!facebookUrl) {
        return res.status(400).json({ message: 'Query parameter "url" is required' });
      }

      // Extract Facebook username/ID from URL
      let facebookId = '';
      let facebookName = '';
      let isNumericId = false;
      
      // Handle various Facebook URL formats
      // Pattern 1: profile.php?id=NUMERIC_ID
      const profilePhpMatch = facebookUrl.match(/facebook\.com\/profile\.php\?id=(\d+)/);
      if (profilePhpMatch) {
        facebookId = profilePhpMatch[1];
        isNumericId = true;
      } else {
        // Pattern 2: facebook.com/username or facebook.com/username.with.dots
        const usernameMatch = facebookUrl.match(/facebook\.com\/([^/?#]+)/);
        if (usernameMatch) {
          facebookId = usernameMatch[1];
          // Check if it's numeric
          if (facebookId.match(/^\d+$/)) {
            isNumericId = true;
          } else {
            // Extract name from username - try to find meaningful name parts
            // Remove common prefixes like "itz", "its", "im", "i.am", etc.
            let cleanedUsername = facebookId
              .replace(/^(itz|its|im|i\.am|the|mr|mrs|ms|dr)[-.]?/i, '')
              .replace(/[-._]/g, ' ')
              .split(' ')
              .filter(word => word.length > 0)
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ')
              .trim();
            
            facebookName = cleanedUsername || facebookId;
          }
        }
      }

      if (!facebookId) {
        return res.status(400).json({ message: 'Unable to extract Facebook ID from URL' });
      }

      // Try multiple access token strategies
      const appId = process.env.FACEBOOK_APP_ID;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      const legacyToken = process.env.FACEBOOK_ACCESS_TOKEN;
      
      // Try to fetch profile data from Facebook Graph API
      let pictureUrl = null;
      let extractedName = facebookName;
      
      // Tokens to try (in order)
      const tokensToTry = [];
      
      // 1. App Access Token (for public pages/profiles)
      if (appId && appSecret) {
        tokensToTry.push({ token: `${appId}|${appSecret}`, type: 'App' });
      }
      
      // 2. Legacy token (might be Page or User token)
      if (legacyToken) {
        tokensToTry.push({ token: legacyToken, type: 'Legacy' });
      }
      
      if (tokensToTry.length === 0) {
        return res.status(500).json({ message: 'No Facebook access tokens configured' });
      }

      // Try each token until one works
      let lastError = null;
      for (const { token, type } of tokensToTry) {
        try {
          const profileUrl = `https://graph.facebook.com/v18.0/${facebookId}?fields=name,picture.type(large)&access_token=${token}`;
          console.log(`Fetching profile with ${type} token for ${isNumericId ? 'numeric' : 'username'} ID:`, facebookId);
          
          const profileResponse = await fetch(profileUrl);
          const profileText = await profileResponse.text();
          
          if (profileResponse.ok) {
            const profileData = JSON.parse(profileText);
            
            if (profileData.name) {
              extractedName = profileData.name;
            }
            if (profileData.picture?.data?.url) {
              pictureUrl = profileData.picture.data.url;
            }
            console.log('Successfully fetched profile with', type, 'token:', { name: extractedName, hasPicture: !!pictureUrl });
            break; // Success, stop trying other tokens
          } else {
            lastError = profileText;
            console.log(`${type} token failed:`, profileText);
          }
        } catch (error) {
          lastError = error;
          console.log(`${type} token error:`, error);
        }
      }
      
      // Ensure we always return a name - either from API or extracted from URL
      const finalName = extractedName || facebookName || null;
      
      res.json({
        pictureUrl,
        facebookId,
        facebookName: finalName,
        isNumericId,
        message: pictureUrl ? undefined : 'Could not fetch profile picture. Please check the Facebook URL and try again.'
      });
    } catch (error) {
      console.error('Error fetching Facebook profile picture:', error);
      res.status(500).json({ message: 'Failed to fetch Facebook profile picture' });
    }
  });

  // New endpoint to download and store Facebook profile pictures
  app.post('/api/facebook/download-profile-picture', async (req, res) => {
    try {
      const { customerId, facebookUrl, pictureUrl } = req.body;
      
      if (!pictureUrl) {
        return res.status(400).json({ message: 'pictureUrl is required' });
      }

      // Download the image from Facebook CDN
      const response = await fetch(pictureUrl);
      if (!response.ok) {
        throw new Error('Failed to download image from Facebook');
      }

      const buffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(buffer);

      // Generate a unique filename - use customerId if available, otherwise use timestamp
      const extension = 'jpg'; // Facebook profile pictures are typically JPG
      const identifier = customerId || `temp_${Date.now()}`;
      const filename = `${identifier}_${Date.now()}.${extension}`;
      const filepath = path.join('uploads', 'profile-pictures', filename);
      
      // Ensure the directory exists
      await fs.mkdir(path.join('uploads', 'profile-pictures'), { recursive: true });
      
      // Save the image to disk
      await fs.writeFile(filepath, imageBuffer);
      
      // Generate the local URL
      const localUrl = `/uploads/profile-pictures/${filename}`;
      
      // Update the customer record with the profile picture URL if customerId is provided
      if (customerId) {
        const customer = await storage.getCustomer(customerId);
        if (customer) {
          await storage.updateCustomer(customerId, {
            ...customer,
            profilePictureUrl: localUrl,
            facebookUrl: facebookUrl || customer.facebookUrl
          });
        }
      }
      
      res.json({
        success: true,
        profilePictureUrl: localUrl,
        message: 'Profile picture downloaded and saved successfully'
      });
    } catch (error) {
      console.error('Error downloading Facebook profile picture:', error);
      res.status(500).json({ message: 'Failed to download and save profile picture' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
