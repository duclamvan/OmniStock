import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./replitAuth";
import { seedMockData } from "./mockData";
import { cacheMiddleware, invalidateCache } from "./cache";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import PDFDocument from "pdfkit";
import {
  insertCategorySchema,
  insertCustomerSchema,
  insertCustomerBillingAddressSchema,
  insertSupplierSchema,
  insertWarehouseSchema,
  insertWarehouseFinancialContractSchema,
  insertProductSchema,
  insertProductVariantSchema,
  insertProductLocationSchema,
  insertStockAdjustmentRequestSchema,
  insertProductTieredPricingSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertDiscountSchema,
  insertExpenseSchema,
  insertServiceSchema,
  insertServiceItemSchema,
  insertUserActivitySchema,
  insertPreOrderSchema,
  insertPreOrderItemSchema,
  insertTicketSchema,
  insertTicketCommentSchema,
  insertOrderCartonSchema,
  insertAppSettingSchema,
  insertNotificationSchema,
  productCostHistory,
  products,
  productBundles,
  productLocations,
  purchaseItems,
  importPurchases,
  receipts,
  receiptItems,
  orderItems,
  orders,
  customers,
  packingMaterials,
  customerShippingAddresses,
  productFiles,
  orderCartons,
  orderCartonPlans,
  appSettings,
  notifications,
  shipmentTracking,
  serializePackingPlanToDB,
  serializePackingPlanItems,
  deserializePackingPlanFromDB,
  computePlanChecksum,
  type UIPackingPlan,
} from "@shared/schema";
import { createInsertSchema } from 'drizzle-zod';
import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "./db";
import { normalizePhone } from '@shared/utils/phoneNormalizer';
import { eq, desc, and, sql, inArray, or, ilike, isNull, lt, gt } from "drizzle-orm";
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
import { TrackingService } from "./services/tracking";
import OpenAI from "openai";
import passport from "passport";

// Vietnamese and Czech diacritics normalization for accent-insensitive search
function normalizeVietnamese(str: string): string {
  const diacriticsMap: Record<string, string> = {
    // Vietnamese diacritics
    'á': 'a', 'à': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
    'ă': 'a', 'ắ': 'a', 'ằ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
    'â': 'a', 'ấ': 'a', 'ầ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
    'đ': 'd',
    'é': 'e', 'è': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
    'ê': 'e', 'ế': 'e', 'ề': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
    'í': 'i', 'ì': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
    'ó': 'o', 'ò': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
    'ô': 'o', 'ố': 'o', 'ồ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
    'ơ': 'o', 'ớ': 'o', 'ờ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
    'ú': 'u', 'ù': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
    'ư': 'u', 'ứ': 'u', 'ừ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
    'ý': 'y', 'ỳ': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
    // Czech diacritics
    'ě': 'e', 'ň': 'n', 'ř': 'r', 'š': 's', 'ť': 't', 'ů': 'u', 'ž': 'z',
    'ď': 'd', 'č': 'c', 'ĺ': 'l', 'ľ': 'l', 'ŕ': 'r'
  };

  return str.split('').map(char => {
    return diacriticsMap[char.toLowerCase()] || char.toLowerCase();
  }).join('');
}

// SQL normalization helper - creates REPLACE chain for Vietnamese and Czech diacritics
// This allows database-level filtering instead of loading entire tables
// IMPORTANT: Apply LOWER() first, then REPLACE operations on the lowercased value
function normalizeSQLColumn(column: any) {
  return sql`
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      LOWER(${column}),
      'á', 'a'), 'à', 'a'), 'ả', 'a'), 'ã', 'a'), 'ạ', 'a'),
      'ă', 'a'), 'ắ', 'a'), 'ằ', 'a'), 'ẳ', 'a'), 'ẵ', 'a'), 'ặ', 'a'),
      'â', 'a'), 'ấ', 'a'), 'ầ', 'a'), 'ẩ', 'a'), 'ẫ', 'a'), 'ậ', 'a'),
      'đ', 'd'),
      'é', 'e'), 'è', 'e'), 'ẻ', 'e'), 'ẽ', 'e'), 'ẹ', 'e'),
      'ê', 'e'), 'ế', 'e'), 'ề', 'e'), 'ể', 'e'), 'ễ', 'e'), 'ệ', 'e'),
      'í', 'i'), 'ì', 'i'), 'ỉ', 'i'), 'ĩ', 'i'), 'ị', 'i'),
      'ó', 'o'), 'ò', 'o'), 'ỏ', 'o'), 'õ', 'o'), 'ọ', 'o'),
      'ô', 'o'), 'ố', 'o'), 'ồ', 'o'), 'ổ', 'o'), 'ỗ', 'o'), 'ộ', 'o'),
      'ơ', 'o'), 'ớ', 'o'), 'ờ', 'o'), 'ở', 'o'), 'ỡ', 'o'), 'ợ', 'o'),
      'ú', 'u'), 'ù', 'u'), 'ủ', 'u'), 'ũ', 'u'), 'ụ', 'u'),
      'ư', 'u'), 'ứ', 'u'), 'ừ', 'u'), 'ử', 'u'), 'ữ', 'u'), 'ự', 'u'),
      'ý', 'y'), 'ỳ', 'y'), 'ỷ', 'y'), 'ỹ', 'y'), 'ỵ', 'y'),
      'ě', 'e'), 'ň', 'n'), 'ř', 'r'), 'š', 's'), 'ť', 't'), 'ů', 'u'), 'ž', 'z'),
      'ď', 'd'), 'č', 'c'), 'ĺ', 'l'), 'ľ', 'l'), 'ŕ', 'r')
  `;
}

// Helper to get settings by category as an object
async function getSettingsByCategory(category: string): Promise<Record<string, any>> {
  const allSettings = await storage.getAppSettings();
  const categorySettings = allSettings.filter(s => s.category === category);
  const result: Record<string, any> = {};

  categorySettings.forEach(setting => {
    const key = snakeToCamel(setting.key);
    result[key] = deepParse(setting.value); // Use deep parse instead of shallow
  });

  return result;
}

// Helper function for currency conversion
async function getCurrencyConverter() {
  try {
    const exchangeRateResponse = await fetch('https://api.frankfurter.app/latest?from=EUR');
    const exchangeRates = await exchangeRateResponse.json();

    return (amount: number, currency: string): number => {
      if (!amount || !currency) return 0;
      if (currency === 'EUR') return amount;

      const currencyUpper = currency.toUpperCase();
      if (exchangeRates.rates && exchangeRates.rates[currencyUpper]) {
        return amount / exchangeRates.rates[currencyUpper];
      }

      console.warn(`Exchange rate not found for ${currency}`);
      return amount;
    };
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return (amount: number, currency: string) => currency === 'EUR' ? amount : amount;
  }
}

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
  // Serve static files from uploads directory
  const express = await import('express');
  app.use('/uploads', express.default.static('uploads'));

  // Auth middleware (disabled for testing)
  // await setupAuth(app);

  // Phone verification storage (in production, use Redis or database)
  const phoneVerificationCodes = new Map<string, { code: string; expires: number; attempts: number }>();

  // Send phone verification code
  app.post('/api/auth/send-phone-code', async (req, res) => {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({ message: 'Phone number is required' });
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Store verification code
      phoneVerificationCodes.set(phone, { code, expires, attempts: 0 });

      // TODO: Integrate with SMS provider (Twilio, AWS SNS, etc.)
      console.log(`Verification code for ${phone}: ${code}`);

      // For development, return code in response (remove in production!)
      if (process.env.NODE_ENV === 'development') {
        return res.json({ message: 'Code sent', devCode: code });
      }

      res.json({ message: 'Verification code sent' });
    } catch (error) {
      console.error('Error sending verification code:', error);
      res.status(500).json({ message: 'Failed to send verification code' });
    }
  });

  // Verify phone code and login
  app.post('/api/auth/verify-phone-code', async (req, res) => {
    try {
      const { phone, code } = req.body;

      if (!phone || !code) {
        return res.status(400).json({ message: 'Phone and code are required' });
      }

      const verification = phoneVerificationCodes.get(phone);

      if (!verification) {
        return res.status(400).json({ message: 'No verification code found' });
      }

      if (verification.attempts >= 3) {
        phoneVerificationCodes.delete(phone);
        return res.status(400).json({ message: 'Too many attempts. Please request a new code' });
      }

      if (Date.now() > verification.expires) {
        phoneVerificationCodes.delete(phone);
        return res.status(400).json({ message: 'Verification code expired' });
      }

      if (verification.code !== code) {
        verification.attempts++;
        return res.status(400).json({ message: 'Invalid verification code' });
      }

      // Code is valid, find or create user
      let user = await storage.getUserByPhone(phone);

      if (!user) {
        return res.status(404).json({ message: 'No account found with this phone number' });
      }

      // Clean up verification code
      phoneVerificationCodes.delete(phone);

      // Create session
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Login failed' });
        }
        res.json({ message: 'Login successful', user });
      });
    } catch (error) {
      console.error('Error verifying code:', error);
      res.status(500).json({ message: 'Verification failed' });
    }
  });

  // Register with phone number
  app.post('/api/auth/register-with-phone', async (req, res) => {
    try {
      const { name, phone, code } = req.body;

      if (!name || !phone || !code) {
        return res.status(400).json({ message: 'Name, phone, and code are required' });
      }

      const verification = phoneVerificationCodes.get(phone);

      if (!verification) {
        return res.status(400).json({ message: 'No verification code found' });
      }

      if (verification.attempts >= 3) {
        phoneVerificationCodes.delete(phone);
        return res.status(400).json({ message: 'Too many attempts. Please request a new code' });
      }

      if (Date.now() > verification.expires) {
        phoneVerificationCodes.delete(phone);
        return res.status(400).json({ message: 'Verification code expired' });
      }

      if (verification.code !== code) {
        verification.attempts++;
        return res.status(400).json({ message: 'Invalid verification code' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByPhone(phone);
      if (existingUser) {
        return res.status(400).json({ message: 'User with this phone number already exists' });
      }

      // Create user
      const user = await storage.createUserWithPhone({ name, phone });

      // Clean up verification code
      phoneVerificationCodes.delete(phone);

      // Create session
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Registration successful but login failed' });
        }
        res.json({ message: 'Registration successful', user });
      });
    } catch (error) {
      console.error('Error during phone registration:', error);
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  // Facebook OAuth routes
  app.get('/api/auth/facebook',
    passport.authenticate('facebook', { scope: ['email'] })
  );

  // Auth user endpoint (mock for development)
  app.get('/api/auth/user', async (req: any, res) => {
    // Return mock user for testing without auth
    res.json({
      id: "test-user",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User"
    });
  });

  // Serve GLS autofill userscript for Tampermonkey
  app.get('/api/download/gls-autofill-userscript', async (req, res) => {
    try {
      const scriptPath = path.join(process.cwd(), 'public', 'gls-autofill-mobile.user.js');
      const scriptContent = await fs.readFile(scriptPath, 'utf-8');

      // Set headers for Tampermonkey to recognize the script
      res.setHeader('Content-Type', 'application/x-userscript+javascript');
      res.setHeader('Content-Disposition', 'attachment; filename="gls-autofill-mobile.user.js"');
      res.send(scriptContent);
    } catch (error) {
      console.error('Error serving userscript:', error);
      res.status(500).json({ error: 'Failed to load userscript' });
    }
  });

  // GLS autofill data endpoint for Tampermonkey
  app.get('/api/gls-autofill-data/:orderId', async (req, res) => {
    try {
      const { orderId } = req.params;

      // Find order by orderId
      const orders = await storage.getOrders();
      const order = orders.find(o => o.orderId === orderId);

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Get shipping address if shippingAddressId exists
      let shippingAddr: any = {};
      if (order.shippingAddressId) {
        const address = await storage.getAddress(order.shippingAddressId);
        if (address) {
          shippingAddr = address;
        }
      }

      // Get GLS sender address from settings (properly parsed)
      const shippingSettings = await getSettingsByCategory('shipping');
      const senderData = shippingSettings.glsDefaultSenderAddress;

      const autofillData = {
        recipient: {
          name: [shippingAddr.firstName, shippingAddr.lastName].filter(Boolean).join(' ') || 'N/A',
          company: shippingAddr.company || '',
          street: shippingAddr.street || '',
          houseNumber: shippingAddr.streetNumber || '',
          postalCode: shippingAddr.zipCode || '',
          city: shippingAddr.city || '',
          country: shippingAddr.country || 'Germany',
          email: shippingAddr.email || '',
          phone: shippingAddr.tel || '',
        },
        sender: senderData ? {
          name: senderData.name || '',
          company: senderData.company || '',
          street: senderData.street || '',
          houseNumber: senderData.streetNumber || '',
          postalCode: senderData.zipCode || '',
          city: senderData.city || '',
          email: senderData.email || '',
          phone: senderData.phone || '',
        } : undefined,
        packageSize: 'S',
        weight: undefined,
      };

      // Set CORS headers to allow cross-origin requests
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      res.json(autofillData);
    } catch (error) {
      console.error('Error serving GLS autofill data:', error);
      res.status(500).json({ error: 'Failed to load order data' });
    }
  });

  // Dashboard endpoints with caching
  app.get('/api/dashboard/metrics', cacheMiddleware(60000), async (req, res) => {
    try {
      // Fetch exchange rates from Frankfurter API
      const exchangeRateResponse = await fetch('https://api.frankfurter.app/latest?from=EUR');
      const exchangeRates = await exchangeRateResponse.json();

      const metrics = await storage.getDashboardMetrics();
      const allOrders = await storage.getOrders();

      // Convert amount to EUR
      const convertToEur = (amount: number, currency: string): number => {
        if (!amount || !currency) return 0;
        if (currency === 'EUR') return amount;

        // Get the rate from the currency to EUR using Frankfurter API format
        const currencyUpper = currency.toUpperCase();
        if (exchangeRates.rates && exchangeRates.rates[currencyUpper]) {
          // Frankfurter gives EUR to other currency rates, so we need to invert
          return amount / exchangeRates.rates[currencyUpper];
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
      // Fetch exchange rates from Frankfurter API
      const exchangeRateResponse = await fetch('https://api.frankfurter.app/latest?from=EUR');
      const exchangeRates = await exchangeRateResponse.json();

      const convertToEur = (amount: number, currency: string): number => {
        if (!amount || !currency) return 0;
        if (currency === 'EUR') return amount;

        const currencyUpper = currency.toUpperCase();
        if (exchangeRates.rates && exchangeRates.rates[currencyUpper]) {
          return amount / exchangeRates.rates[currencyUpper];
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

  // New Admin Dashboard Endpoints

  // Operations Pulse Metrics
  app.get('/api/dashboard/operations-pulse', cacheMiddleware(60000), async (req, res) => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      // Orders awaiting fulfillment
      const ordersToFulfill = await db.select()
        .from(orders)
        .where(eq(orders.orderStatus, 'to_fulfill'));

      // Orders at risk of SLA breach (>24 hours in to_fulfill status)
      const ordersAtRisk = ordersToFulfill.filter(order => {
        const createdAt = new Date(order.createdAt);
        return createdAt < yesterday;
      });

      // Pick/pack throughput today (orders moved to fulfilled today)
      const fulfilledToday = await db.select()
        .from(orders)
        .where(
          and(
            eq(orders.orderStatus, 'fulfilled'),
            sql`${orders.updatedAt} >= ${today.toISOString()}`
          )
        );

      // Carrier exceptions (simplified - checking for specific statuses)
      const carrierExceptions = await db.select()
        .from(orders)
        .where(
          or(
            ilike(orders.notes, '%failed%delivery%'),
            ilike(orders.notes, '%exception%'),
            ilike(orders.notes, '%delay%')
          )
        );

      // Pending stock adjustment approvals
      const pendingAdjustments = await db.select()
        .from(sql`stock_adjustment_requests`)
        .where(sql`status = 'pending'`)
        .catch(() => []);

      res.json({
        ordersAwaitingFulfillment: ordersToFulfill.length,
        ordersAtRiskOfSLA: ordersAtRisk.length,
        pickPackThroughputToday: fulfilledToday.length,
        carrierExceptions: carrierExceptions.length,
        pendingStockAdjustments: pendingAdjustments.length,
        timestamp: now.toISOString()
      });
    } catch (error) {
      console.error("Error fetching operations pulse metrics:", error);
      res.status(500).json({ message: "Failed to fetch operations pulse metrics" });
    }
  });

  // Financial Control Metrics
  app.get('/api/dashboard/financial-control', cacheMiddleware(60000), async (req, res) => {
    try {
      const convertToEur = await getCurrencyConverter();
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      // Get all orders
      const allOrders = await storage.getOrders();
      const paidOrders = allOrders.filter(o => o.paymentStatus === 'paid');

      // Total revenue (converted to EUR)
      let totalRevenueEur = 0;
      let totalCostEur = 0;

      for (const order of paidOrders) {
        const grandTotal = parseFloat(order.grandTotal || '0');
        const totalCost = parseFloat(order.totalCost || '0');
        totalRevenueEur += convertToEur(grandTotal, order.currency || 'EUR');
        totalCostEur += convertToEur(totalCost, order.currency || 'EUR');
      }

      // Net profit and margin
      const netProfit = totalRevenueEur - totalCostEur;
      const profitMargin = totalRevenueEur > 0 ? (netProfit / totalRevenueEur) * 100 : 0;

      // Average order value
      const aov = paidOrders.length > 0 ? totalRevenueEur / paidOrders.length : 0;

      // Aged receivables (unpaid orders)
      const unpaidOrders = allOrders.filter(o => o.paymentStatus !== 'paid');
      const agedReceivables = {
        '30-60days': 0,
        '60-90days': 0,
        '90plus': 0
      };

      for (const order of unpaidOrders) {
        const createdAt = new Date(order.createdAt);
        const amount = convertToEur(parseFloat(order.grandTotal || '0'), order.currency || 'EUR');

        if (createdAt < ninetyDaysAgo) {
          agedReceivables['90plus'] += amount;
        } else if (createdAt < sixtyDaysAgo) {
          agedReceivables['60-90days'] += amount;
        } else if (createdAt < thirtyDaysAgo) {
          agedReceivables['30-60days'] += amount;
        }
      }

      // Cash conversion by currency (this month vs last month)
      const thisMonthOrders = allOrders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= thisMonthStart && o.paymentStatus === 'paid';
      });

      const lastMonthOrders = allOrders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= lastMonthStart && orderDate <= lastMonthEnd && o.paymentStatus === 'paid';
      });

      const calculateByCurrency = (orders: any[]) => {
        const byCurrency: any = { EUR: 0, CZK: 0, USD: 0 };
        orders.forEach(o => {
          const curr = o.currency || 'EUR';
          if (byCurrency[curr] !== undefined) {
            byCurrency[curr] += parseFloat(o.grandTotal || '0');
          }
        });
        return byCurrency;
      };

      const thisMonthByCurrency = calculateByCurrency(thisMonthOrders);
      const lastMonthByCurrency = calculateByCurrency(lastMonthOrders);

      const cashConversion = {
        EUR: {
          current: thisMonthByCurrency.EUR,
          previous: lastMonthByCurrency.EUR,
          trend: lastMonthByCurrency.EUR > 0 
            ? ((thisMonthByCurrency.EUR - lastMonthByCurrency.EUR) / lastMonthByCurrency.EUR) * 100 
            : 0
        },
        CZK: {
          current: thisMonthByCurrency.CZK,
          previous: lastMonthByCurrency.CZK,
          trend: lastMonthByCurrency.CZK > 0 
            ? ((thisMonthByCurrency.CZK - lastMonthByCurrency.CZK) / lastMonthByCurrency.CZK) * 100 
            : 0
        },
        USD: {
          current: thisMonthByCurrency.USD,
          previous: lastMonthByCurrency.USD,
          trend: lastMonthByCurrency.USD > 0 
            ? ((thisMonthByCurrency.USD - lastMonthByCurrency.USD) / lastMonthByCurrency.USD) * 100 
            : 0
        }
      };

      res.json({
        totalRevenueEur: Math.round(totalRevenueEur * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        profitMarginPercent: Math.round(profitMargin * 100) / 100,
        averageOrderValue: Math.round(aov * 100) / 100,
        agedReceivables,
        cashConversionByCurrency: cashConversion,
        timestamp: now.toISOString()
      });
    } catch (error) {
      console.error("Error fetching financial control metrics:", error);
      res.status(500).json({ message: "Failed to fetch financial control metrics" });
    }
  });

  // Inventory Risk Metrics
  app.get('/api/dashboard/inventory-risk', cacheMiddleware(60000), async (req, res) => {
    try {
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      // Low stock count
      const allProducts = await storage.getProducts();
      const lowStockProducts = allProducts.filter(p => 
        p.quantity <= (p.lowStockAlert || 5) && p.isActive
      );

      // Over-allocated SKUs (products with allocated > quantity)
      const overAllocatedProducts = allProducts.filter(p => {
        const quantity = p.quantity || 0;
        const allocated = parseInt(p.allocated || '0');
        return allocated > quantity && p.isActive;
      });

      // Aging inventory (no stock movement in 90+ days - simplified check via updatedAt)
      const agingInventory = allProducts.filter(p => {
        const updatedAt = new Date(p.updatedAt || p.createdAt);
        return updatedAt < ninetyDaysAgo && (p.quantity || 0) > 0;
      });

      // Inbound backlog (receipts with pending_verification status)
      const pendingReceipts = await db.select()
        .from(receipts)
        .where(eq(receipts.status, 'pending_verification'));

      // Supplier delay alerts
      const delayedPurchases = await db.select()
        .from(importPurchases)
        .where(
          and(
            sql`${importPurchases.estimatedArrival} < ${now.toISOString()}`,
            sql`${importPurchases.status} != 'delivered'`
          )
        );

      res.json({
        lowStockCount: lowStockProducts.length,
        overAllocatedSKUs: overAllocatedProducts.length,
        agingInventoryCount: agingInventory.length,
        inboundBacklog: pendingReceipts.length,
        supplierDelayAlerts: delayedPurchases.length,
        timestamp: now.toISOString()
      });
    } catch (error) {
      console.error("Error fetching inventory risk metrics:", error);
      res.status(500).json({ message: "Failed to fetch inventory risk metrics" });
    }
  });

  // Fulfillment Efficiency Metrics
  app.get('/api/dashboard/fulfillment-efficiency', cacheMiddleware(60000), async (req, res) => {
    try {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Pick errors count (from returns with picking_error reason this month)
      const returns = await storage.getReturns();
      const pickErrors = returns.filter((r: any) => {
        const createdAt = new Date(r.createdAt || r.returnDate);
        return r.reason === 'picking_error' && createdAt >= thisMonthStart;
      });

      // AI carton recommendations used
      const thisMonthOrders = await db.select()
        .from(orders)
        .where(sql`${orders.createdAt} >= ${thisMonthStart.toISOString()}`);

      const ordersWithAIPlans = await db.select()
        .from(orderCartonPlans)
        .where(
          and(
            sql`${orderCartonPlans.createdAt} >= ${thisMonthStart.toISOString()}`,
            sql`${orderCartonPlans.aiConfidenceScore} > 0`
          )
        );

      const aiAdoptionRate = thisMonthOrders.length > 0 
        ? (ordersWithAIPlans.length / thisMonthOrders.length) * 100 
        : 0;

      // Orders by fulfillment stage distribution
      const allOrders = await storage.getOrders();
      const stageDistribution = {
        to_fulfill: allOrders.filter(o => o.orderStatus === 'to_fulfill').length,
        picking: allOrders.filter(o => o.fulfillmentStage === 'picking').length,
        packing: allOrders.filter(o => o.fulfillmentStage === 'packing').length,
        shipped: allOrders.filter(o => o.orderStatus === 'shipped').length,
        fulfilled: allOrders.filter(o => o.orderStatus === 'fulfilled').length
      };

      // Carrier on-time delivery rate (simplified - checking shipped orders with tracking)
      const shippedOrders = allOrders.filter(o => o.orderStatus === 'shipped' && o.shippedAt);
      const onTimeDeliveries = shippedOrders.filter(o => {
        // Simplified: assume on-time if shipped within 3 days of order
        const shippedAt = new Date(o.shippedAt!);
        const createdAt = new Date(o.createdAt);
        const daysDiff = (shippedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 3;
      });

      const onTimeRate = shippedOrders.length > 0 
        ? (onTimeDeliveries.length / shippedOrders.length) * 100 
        : 0;

      res.json({
        pickErrorsCount: pickErrors.length,
        aiCartonRecommendationsUsed: ordersWithAIPlans.length,
        aiAdoptionRatePercent: Math.round(aiAdoptionRate * 100) / 100,
        ordersByStage: stageDistribution,
        carrierOnTimeRatePercent: Math.round(onTimeRate * 100) / 100,
        timestamp: now.toISOString()
      });
    } catch (error) {
      console.error("Error fetching fulfillment efficiency metrics:", error);
      res.status(500).json({ message: "Failed to fetch fulfillment efficiency metrics" });
    }
  });

  // Customer & Support Metrics
  app.get('/api/dashboard/customer-support', cacheMiddleware(60000), async (req, res) => {
    try {
      const convertToEur = await getCurrencyConverter();
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const oneeightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

      // Top 10 customers by revenue this month
      const allOrders = await storage.getOrders();
      const thisMonthOrders = allOrders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= thisMonthStart && o.paymentStatus === 'paid';
      });

      const customerRevenue = new Map<string, { name: string; revenue: number }>();
      const allCustomers = await storage.getCustomers();

      for (const order of thisMonthOrders) {
        if (!order.customerId) continue;
        const revenue = convertToEur(parseFloat(order.grandTotal || '0'), order.currency || 'EUR');

        if (customerRevenue.has(order.customerId)) {
          customerRevenue.get(order.customerId)!.revenue += revenue;
        } else {
          const customer = allCustomers.find(c => c.id === order.customerId);
          customerRevenue.set(order.customerId, {
            name: customer?.name || 'Unknown',
            revenue
          });
        }
      }

      const top10Customers = Array.from(customerRevenue.entries())
        .map(([id, data]) => ({ customerId: id, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Active support tickets by severity
      const allTickets = await storage.getTickets();
      const activeTickets = allTickets.filter(t => 
        t.status === 'open' || t.status === 'in_progress'
      );

      const ticketsBySeverity = {
        low: activeTickets.filter(t => t.priority === 'low').length,
        medium: activeTickets.filter(t => t.priority === 'medium').length,
        high: activeTickets.filter(t => t.priority === 'high').length,
        urgent: activeTickets.filter(t => t.priority === 'urgent').length
      };

      // COD payment collection status
      const codOrders = allOrders.filter(o => o.paymentMethod === 'COD');
      const codStatus = {
        pending: codOrders.filter(o => o.paymentStatus === 'pending').length,
        paid: codOrders.filter(o => o.paymentStatus === 'paid').length,
        failed: codOrders.filter(o => o.paymentStatus === 'failed').length
      };

      // Retention rate (customers who ordered in last 90 days AND previous 90 days)
      const last90DaysOrders = allOrders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= ninetyDaysAgo;
      });

      const previous90DaysOrders = allOrders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= oneeightyDaysAgo && orderDate < ninetyDaysAgo;
      });

      const last90CustomersSet = new Set(last90DaysOrders.map(o => o.customerId).filter(Boolean));
      const previous90CustomersSet = new Set(previous90DaysOrders.map(o => o.customerId).filter(Boolean));

      const retainedCustomers = Array.from(last90CustomersSet).filter(id => 
        previous90CustomersSet.has(id)
      );

      const retentionRate = previous90CustomersSet.size > 0 
        ? (retainedCustomers.length / previous90CustomersSet.size) * 100 
        : 0;

      res.json({
        top10CustomersByRevenue: top10Customers,
        activeSupportTickets: ticketsBySeverity,
        totalActiveTickets: activeTickets.length,
        codPaymentStatus: codStatus,
        retentionRatePercent: Math.round(retentionRate * 100) / 100,
        timestamp: now.toISOString()
      });
    } catch (error) {
      console.error("Error fetching customer support metrics:", error);
      res.status(500).json({ message: "Failed to fetch customer support metrics" });
    }
  });

  // System & Alerts Metrics
  app.get('/api/dashboard/system-alerts', cacheMiddleware(30000), async (req, res) => {
    try {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Returns spike indicator
      const returns = await storage.getReturns();
      const thisWeekReturns = returns.filter((r: any) => {
        const returnDate = new Date(r.createdAt || r.returnDate);
        return returnDate >= oneWeekAgo;
      });

      const lastWeekReturns = returns.filter((r: any) => {
        const returnDate = new Date(r.createdAt || r.returnDate);
        return returnDate >= twoWeeksAgo && returnDate < oneWeekAgo;
      });

      const avgWeeklyReturns = returns.length > 0 ? returns.length / 4 : 0; // Approximate
      const returnsSpikePercent = avgWeeklyReturns > 0 
        ? ((thisWeekReturns.length - avgWeeklyReturns) / avgWeeklyReturns) * 100 
        : 0;

      // Recent critical notifications (last 24 hours)
      const recentNotifications = await db.select()
        .from(notifications)
        .where(
          and(
            sql`${notifications.createdAt} >= ${twentyFourHoursAgo.toISOString()}`,
            or(
              eq(notifications.type, 'error'),
              ilike(notifications.title, '%critical%'),
              ilike(notifications.title, '%urgent%')
            )
          )
        )
        .limit(10);

      // Integration health status (simplified - check for recent order processing)
      const recentOrders = await db.select()
        .from(orders)
        .where(sql`${orders.createdAt} >= ${twentyFourHoursAgo.toISOString()}`)
        .limit(100);

      const integrationHealth = {
        orderProcessing: recentOrders.length > 0 ? 'healthy' : 'warning',
        lastOrderAt: recentOrders.length > 0 ? recentOrders[0].createdAt : null,
        recentOrderCount: recentOrders.length
      };

      // Recent audit log highlights (last 10 significant actions from user_activities)
      const activities = await storage.getUserActivities(10);

      res.json({
        returnsSpike: {
          thisWeek: thisWeekReturns.length,
          lastWeek: lastWeekReturns.length,
          averageWeekly: Math.round(avgWeeklyReturns),
          spikePercent: Math.round(returnsSpikePercent * 100) / 100,
          isAlert: Math.abs(returnsSpikePercent) > 50
        },
        recentCriticalNotifications: recentNotifications.map(n => ({
          id: n.id,
          title: n.title,
          description: n.description,
          type: n.type,
          createdAt: n.createdAt
        })),
        integrationHealth,
        recentAuditHighlights: activities,
        timestamp: now.toISOString()
      });
    } catch (error) {
      console.error("Error fetching system alerts metrics:", error);
      res.status(500).json({ message: "Failed to fetch system alerts metrics" });
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

  // Calculate relevance score for search results with Vietnamese normalization
  function calculateScore(text: string, query: string): number {
    if (!text || !query) return 0;

    const normalizedText = normalizeVietnamese(text.toLowerCase());
    const normalizedQuery = normalizeVietnamese(query.toLowerCase());

    let score = 0;

    // Exact match (highest priority)
    if (normalizedText === normalizedQuery) {
      score += 100;
    }

    // Starts with query
    if (normalizedText.startsWith(normalizedQuery)) {
      score += 50;
    }

    // Contains query
    if (normalizedText.includes(normalizedQuery)) {
      score += 25;
    }

    // Word boundary match (query matches start of a word)
    const words = normalizedText.split(/\s+/);
    for (const word of words) {
      if (word.startsWith(normalizedQuery)) {
        score += 35;
        break;
      }
    }

    // Multi-word bonus (all query words found)
    const queryWords = normalizedQuery.split(/\s+/);
    if (queryWords.length > 1) {
      const allWordsFound = queryWords.every(qw => 
        normalizedText.includes(qw)
      );
      if (allWordsFound) {
        score += 20;
      }
    }

    return score;
  }

  // Global Search endpoint - PostgreSQL-native accent-insensitive search
  app.get('/api/search', async (req, res) => {
    try {
      const query = req.query.q as string || '';

      // Require minimum 2 characters
      if (!query.trim() || query.trim().length < 2) {
        return res.json({ 
          inventoryItems: [], 
          shipmentItems: [], 
          customers: [] 
        });
      }

      // Normalize query for Vietnamese accent-insensitive search
      const normalizedQuery = normalizeVietnamese(query.toLowerCase().trim());

      // STEP 1: Database-level filtering using SQL REPLACE() chain
      // Only fetch ~20 candidates that match at database level (instead of 500)
      const productCandidates = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.isActive, true),
            or(
              sql`${normalizeSQLColumn(products.name)} LIKE ${`%${normalizedQuery}%`}`,
              sql`${normalizeSQLColumn(products.sku)} LIKE ${`%${normalizedQuery}%`}`
            )
          )
        )
        .limit(20); // Much smaller limit - DB already filtered results

      // STEP 2: In-memory scoring for final ranking (on much smaller result set)
      const scoredProducts = productCandidates
        .map(product => ({
          product,
          score: Math.max(
            calculateScore(product.name || '', normalizedQuery),
            calculateScore(product.sku || '', normalizedQuery)
          )
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10); // Top 10 after scoring

      const inventoryItems = scoredProducts.map(({ product }) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        quantity: product.quantity || 0,
        imageUrl: product.imageUrl,
        type: 'inventory' as const
      }));

      // STEP 1: Database-level filtering for shipments
      const shipmentCandidates = await db
        .select({
          itemId: purchaseItems.id,
          itemName: purchaseItems.name,
          itemSku: purchaseItems.sku,
          quantity: purchaseItems.quantity,
          purchaseId: importPurchases.id,
          supplier: importPurchases.supplier,
          trackingNumber: importPurchases.trackingNumber,
          estimatedArrival: importPurchases.estimatedArrival,
          status: importPurchases.status
        })
        .from(purchaseItems)
        .innerJoin(importPurchases, eq(purchaseItems.purchaseId, importPurchases.id))
        .where(
          or(
            sql`${normalizeSQLColumn(purchaseItems.name)} LIKE ${`%${normalizedQuery}%`}`,
            sql`${normalizeSQLColumn(purchaseItems.sku)} LIKE ${`%${normalizedQuery}%`}`
          )
        )
        .limit(20); // Much smaller limit - DB already filtered results

      // STEP 2: In-memory scoring for final ranking
      const scoredShipments = shipmentCandidates
        .map(item => ({
          item,
          score: Math.max(
            calculateScore(item.itemName || '', normalizedQuery),
            calculateScore(item.itemSku || '', normalizedQuery)
          )
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10); // Top 10 after scoring

      const shipmentItems = scoredShipments.map(({ item }) => ({
        id: item.itemId,
        name: item.itemName,
        sku: item.itemSku || 'N/A',
        quantity: item.quantity || 0,
        supplier: item.supplier,
        trackingNumber: item.trackingNumber || 'N/A',
        estimatedArrival: item.estimatedArrival,
        status: item.status,
        type: 'shipment' as const
      }));

      // STEP 1: Database-level filtering for customers
      const customerCandidates = await db
        .select()
        .from(customers)
        .where(
          or(
            sql`${normalizeSQLColumn(customers.name)} LIKE ${`%${normalizedQuery}%`}`,
            sql`${normalizeSQLColumn(customers.email)} LIKE ${`%${normalizedQuery}%`}`,
            sql`${normalizeSQLColumn(customers.phone)} LIKE ${`%${normalizedQuery}%`}`
          )
        )
        .limit(20); // Much smaller limit - DB already filtered results

      // STEP 2: In-memory scoring for final ranking
      const scoredCustomers = customerCandidates
        .map(customer => ({
          customer,
          score: Math.max(
            calculateScore(customer.name || '', normalizedQuery),
            calculateScore(customer.email || '', normalizedQuery),
            calculateScore(customer.phone || '', normalizedQuery)
          )
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10); // Top 10 after scoring

      const customerResults = scoredCustomers.map(({ customer }) => customer);

      // Get order statistics for each customer with separate COUNT query
      const customersWithStats = await Promise.all(
        customerResults.map(async (customer) => {
          // Separate COUNT query for accurate total order count
          const [countResult] = await db
            .select({ count: sql<number>`COUNT(*)::int` })
            .from(orders)
            .where(eq(orders.customerId, customer.id));

          const totalOrders = countResult?.count || 0;

          // Get recent orders (limited to 3 for display)
          const customerOrders = await db
            .select({
              id: orders.id,
              orderId: orders.orderId,
              createdAt: orders.createdAt,
              grandTotal: orders.grandTotal,
              currency: orders.currency,
              orderStatus: orders.orderStatus
            })
            .from(orders)
            .where(eq(orders.customerId, customer.id))
            .orderBy(desc(orders.createdAt))
            .limit(3);

          const lastOrder = customerOrders[0];
          const lastOrderDate = lastOrder?.createdAt ? new Date(lastOrder.createdAt) : null;

          let lastOrderText = 'Never';
          if (lastOrderDate) {
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - lastOrderDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) lastOrderText = 'Today';
            else if (diffDays === 1) lastOrderText = '1 day ago';
            else if (diffDays < 30) lastOrderText = `${diffDays} days ago`;
            else if (diffDays < 60) lastOrderText = '1 month ago';
            else lastOrderText = `${Math.floor(diffDays / 30)} months ago`;
          }

          return {
            ...customer,
            totalOrders,
            lastOrderDate,
            lastOrderText,
            recentOrders: customerOrders.map(order => ({
              id: order.id,
              orderNumber: order.orderId || 'N/A',
              orderDate: order.createdAt || new Date().toISOString(),
              totalPrice: order.grandTotal || '0',
              currency: order.currency || 'CZK',
              status: order.orderStatus || 'pending'
            }))
          };
        })
      );

      res.json({
        inventoryItems,
        shipmentItems,
        customers: customersWithStats
      });
    } catch (error) {
      console.error("Error in global search:", error);
      res.status(500).json({ message: "Search failed" });
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

  // AI translation for category names
  app.post('/api/categories/translate', async (req, res) => {
    try {
      const { categoryName } = req.body;

      if (!categoryName || typeof categoryName !== 'string') {
        return res.status(400).json({ message: 'Category name is required' });
      }

      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ message: 'Translation API not configured' });
      }

      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ 
        apiKey,
        baseURL: 'https://api.deepseek.com'
      });

      const prompt = `Translate the following product category name into Czech (CZ) and Vietnamese (VN).
Return ONLY a valid JSON object with this exact structure:
{
  "nameCz": "Czech translation",
  "nameVn": "Vietnamese translation"
}

Category name: ${categoryName}

Important:
- Keep the translation concise and appropriate for product categories
- Use proper diacritics for both languages
- Return ONLY the JSON, no additional text`;

      const completion = await openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator specializing in product category names. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 150
      });

      const translationText = completion.choices[0]?.message?.content?.trim();
      if (!translationText) {
        throw new Error('No translation received from API');
      }

      // Extract JSON from the response
      const jsonMatch = translationText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid translation format');
      }

      const translations = JSON.parse(jsonMatch[0]);
      res.json(translations);
    } catch (error) {
      console.error('Translation error:', error);
      res.status(500).json({ message: 'Failed to translate category name' });
    }
  });

  // Warehouses endpoints
  app.get('/api/warehouses', async (req, res) => {
    try {
      const warehouses = await storage.getWarehouses();
      const products = await storage.getProducts();

      // Count products per warehouse
      const warehousesWithCounts = warehouses.map(warehouse => {
        const itemCount = products.filter(p => p.warehouseId === warehouse.id).length;
        return {
          ...warehouse,
          itemCount
        };
      });

      res.json(warehousesWithCounts);
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

  // Get warehouse map configuration
  app.get('/api/warehouses/:id/map-config', async (req, res) => {
    try {
      const warehouse = await storage.getWarehouse(req.params.id);
      if (!warehouse) {
        return res.status(404).json({ message: "Warehouse not found" });
      }
      res.json({
        totalAisles: warehouse.totalAisles || 6,
        maxRacks: warehouse.maxRacks || 10,
        maxLevels: warehouse.maxLevels || 5,
        maxBins: warehouse.maxBins || 5,
        aisleConfigs: warehouse.aisleConfigs || {}
      });
    } catch (error) {
      console.error("Error fetching warehouse map config:", error);
      res.status(500).json({ message: "Failed to fetch warehouse map configuration" });
    }
  });

  // Update warehouse map configuration
  app.put('/api/warehouses/:id/map-config', async (req: any, res) => {
    try {
      const warehouseConfigSchema = z.object({
        totalAisles: z.number().int().min(1).max(50),
        maxRacks: z.number().int().min(1).max(100),
        maxLevels: z.number().int().min(1).max(20),
        maxBins: z.number().int().min(1).max(20)
      });

      const validationResult = warehouseConfigSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid warehouse configuration",
          errors: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }

      const { totalAisles, maxRacks, maxLevels, maxBins } = validationResult.data;

      const warehouse = await storage.updateWarehouse(req.params.id, {
        totalAisles,
        maxRacks,
        maxLevels,
        maxBins
      });

      if (!warehouse) {
        return res.status(404).json({ message: "Warehouse not found" });
      }

      await storage.createUserActivity({
        userId: "test-user",
        action: 'updated',
        entityType: 'warehouse',
        entityId: warehouse.id,
        description: `Updated warehouse map configuration: ${warehouse.name}`,
      });

      res.json({
        totalAisles: warehouse.totalAisles,
        maxRacks: warehouse.maxRacks,
        maxLevels: warehouse.maxLevels,
        maxBins: warehouse.maxBins
      });
    } catch (error) {
      console.error("Error updating warehouse map config:", error);
      res.status(500).json({ message: "Failed to update warehouse map configuration" });
    }
  });

  // Update per-aisle configuration
  app.put('/api/warehouses/:id/aisle-config/:aisleId', async (req: any, res) => {
    try {
      const aisleConfigSchema = z.object({
        maxRacks: z.number().int().min(1).max(100),
        maxLevels: z.number().int().min(1).max(20),
        maxBins: z.number().int().min(1).max(20)
      });

      const validationResult = aisleConfigSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid aisle configuration",
          errors: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }

      const { aisleId } = req.params;
      const { maxRacks, maxLevels, maxBins } = validationResult.data;

      // Get current warehouse
      const warehouse = await storage.getWarehouse(req.params.id);
      if (!warehouse) {
        return res.status(404).json({ message: "Warehouse not found" });
      }

      // Update aisle configs
      const aisleConfigs = (warehouse.aisleConfigs as any) || {};
      aisleConfigs[aisleId] = { maxRacks, maxLevels, maxBins };

      // Save back to warehouse
      const updatedWarehouse = await storage.updateWarehouse(req.params.id, {
        aisleConfigs
      });

      if (!updatedWarehouse) {
        return res.status(404).json({ message: "Failed to update warehouse" });
      }

      await storage.createUserActivity({
        userId: "test-user",
        action: 'updated',
        entityType: 'warehouse',
        entityId: updatedWarehouse.id,
        description: `Updated aisle ${aisleId} configuration: ${updatedWarehouse.name}`,
      });

      res.json({
        aisleId,
        config: { maxRacks, maxLevels, maxBins },
        aisleConfigs: updatedWarehouse.aisleConfigs
      });
    } catch (error) {
      console.error("Error updating aisle config:", error);
      res.status(500).json({ message: "Failed to update aisle configuration" });
    }
  });

  // Get product locations for a warehouse with product details
  app.get('/api/product-locations', async (req, res) => {
    try {
      const { warehouseId } = req.query;

      if (!warehouseId || typeof warehouseId !== 'string') {
        return res.status(400).json({ message: "warehouseId query parameter is required" });
      }

      // Get all products
      const allProducts = await storage.getProducts();

      // Build product locations with details
      const productLocationDetails = [];

      for (const product of allProducts) {
        const locations = await storage.getProductLocations(product.id);

        // Filter locations for this warehouse
        const warehouseLocations = locations.filter(loc => {
          // Parse location code to check warehouse
          // Format: WH1-A06-R04-L04-B2 or WH-CZ-PRG-A01-R02-L03
          const parts = loc.locationCode.split('-');

          // Handle both formats
          if (parts.length >= 5) {
            // Could be WH1-... or WH-CZ-PRG-...
            const locWarehouseId = parts[0].startsWith('WH') && parts[1].match(/^[A-Z]{2}$/) 
              ? parts.slice(0, 3).join('-')  // WH-CZ-PRG format
              : parts[0];  // WH1 format

            return locWarehouseId === warehouseId;
          }
          return false;
        });

        // Add each location with product details
        for (const location of warehouseLocations) {
          productLocationDetails.push({
            locationCode: location.locationCode,
            quantity: location.quantity,
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            locationType: location.locationType,
            isPrimary: location.isPrimary,
            notes: location.notes
          });
        }
      }

      res.json(productLocationDetails);
    } catch (error) {
      console.error("Error fetching product locations:", error);
      res.status(500).json({ message: "Failed to fetch product locations" });
    }
  });

  // Get products in a warehouse
  app.get('/api/warehouses/:id/products', async (req, res) => {
    try {
      const warehouseId = req.params.id;
      const allProducts = await storage.getProducts();

      // Get products that have this warehouse as their primary warehouse
      const warehouseProducts = allProducts.filter(p => p.warehouseId === warehouseId);

      // Fetch locations for each product
      const enrichedProducts = await Promise.all(
        warehouseProducts.map(async (product) => {
          const locations = await storage.getProductLocations(product.id);
          const warehouseLocations = locations.filter(loc => {
            // Extract warehouse ID from location code (e.g., "WH-CZ-PRG-A01-R02-L03" -> "WH-CZ-PRG")
            const locWarehouseId = loc.locationCode.split('-').slice(0, 3).join('-');
            return locWarehouseId === warehouseId;
          });

          const totalLocationQuantity = warehouseLocations.reduce((sum, loc) => sum + (loc.quantity || 0), 0);
          const primaryLocation = warehouseLocations.find(loc => loc.isPrimary);

          return {
            ...product,
            locations: warehouseLocations,
            totalLocationQuantity,
            primaryLocation: primaryLocation?.locationCode || product.warehouseLocation || null
          };
        })
      );

      res.json(enrichedProducts);
    } catch (error) {
      console.error("Error fetching warehouse products:", error);
      res.status(500).json({ message: "Failed to fetch warehouse products" });
    }
  });

  // Warehouse file management endpoints
  app.get('/api/warehouses/:id/files', async (req, res) => {
    try {
      const files = await storage.getWarehouseFiles(req.params.id);
      res.json(files);
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

  // Warehouse financial contracts endpoints
  app.get('/api/warehouses/:warehouseId/financial-contracts', async (req, res) => {
    try {
      const contracts = await storage.getWarehouseFinancialContracts(req.params.warehouseId);
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching warehouse financial contracts:", error);
      res.status(500).json({ message: "Failed to fetch warehouse financial contracts" });
    }
  });

  app.get('/api/financial-contracts/:id', async (req, res) => {
    try {
      const contract = await storage.getWarehouseFinancialContractById(req.params.id);
      if (!contract) {
        return res.status(404).json({ message: "Financial contract not found" });
      }
      res.json(contract);
    } catch (error) {
      console.error("Error fetching financial contract:", error);
      res.status(500).json({ message: "Failed to fetch financial contract" });
    }
  });

  app.post('/api/warehouses/:warehouseId/financial-contracts', async (req: any, res) => {
    try {
      const data = insertWarehouseFinancialContractSchema.parse({
        ...req.body,
        warehouseId: req.params.warehouseId
      });
      const contract = await storage.createWarehouseFinancialContract(data);

      await storage.createUserActivity({
        userId: "test-user",
        action: 'created',
        entityType: 'warehouse_financial_contract',
        entityId: contract.id,
        description: `Created financial contract: ${contract.contractType}`,
      });

      res.json(contract);
    } catch (error) {
      console.error("Error creating financial contract:", error);
      res.status(500).json({ message: "Failed to create financial contract" });
    }
  });

  app.patch('/api/financial-contracts/:id', async (req: any, res) => {
    try {
      const updates = req.body;
      const contract = await storage.updateWarehouseFinancialContract(req.params.id, updates);

      if (!contract) {
        return res.status(404).json({ message: "Financial contract not found" });
      }

      await storage.createUserActivity({
        userId: "test-user",
        action: 'updated',
        entityType: 'warehouse_financial_contract',
        entityId: contract.id,
        description: `Updated financial contract: ${contract.contractType}`,
      });

      res.json(contract);
    } catch (error) {
      console.error("Error updating financial contract:", error);
      res.status(500).json({ message: "Failed to update financial contract" });
    }
  });

  app.delete('/api/financial-contracts/:id', async (req: any, res) => {
    try {
      const contract = await storage.getWarehouseFinancialContractById(req.params.id);
      if (!contract) {
        return res.status(404).json({ message: "Financial contract not found" });
      }

      await storage.deleteWarehouseFinancialContract(req.params.id);

      await storage.createUserActivity({
        userId: "test-user",
        action: 'deleted',
        entityType: 'warehouse_financial_contract',
        entityId: req.params.id,
        description: `Deleted financial contract: ${contract.contractType}`,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting financial contract:", error);
      res.status(500).json({ message: "Failed to delete financial contract" });
    }
  });

  // Warehouse Layout endpoints
  app.get('/api/warehouses/:id/layout', async (req, res) => {
    try {
      const layout = await storage.getWarehouseLayout(req.params.id);
      if (!layout) {
        return res.status(404).json({ message: "Warehouse layout not found" });
      }
      res.json(layout);
    } catch (error) {
      console.error("Error fetching warehouse layout:", error);
      res.status(500).json({ message: "Failed to fetch warehouse layout" });
    }
  });

  app.post('/api/warehouses/:id/layout/generate', async (req: any, res) => {
    try {
      const config = req.body;
      const layout = await storage.generateBinLayout(req.params.id, config);

      await storage.createUserActivity({
        userId: "test-user",
        action: 'generated',
        entityType: 'warehouse_layout',
        entityId: layout.id,
        description: `Generated warehouse layout for warehouse ${req.params.id}`,
      });

      res.json(layout);
    } catch (error) {
      console.error("Error generating warehouse layout:", error);
      res.status(500).json({ message: "Failed to generate warehouse layout" });
    }
  });

  app.get('/api/warehouses/:id/layout/bins', async (req, res) => {
    try {
      const layout = await storage.getWarehouseLayout(req.params.id);
      if (!layout) {
        return res.status(404).json({ message: "Warehouse layout not found" });
      }

      const bins = await storage.getBinsWithInventory(layout.id);
      res.json(bins);
    } catch (error) {
      console.error("Error fetching warehouse bins:", error);
      res.status(500).json({ message: "Failed to fetch warehouse bins" });
    }
  });

  app.get('/api/warehouses/:id/layout/stats', async (req, res) => {
    try {
      const layout = await storage.getWarehouseLayout(req.params.id);
      if (!layout) {
        return res.status(404).json({ message: "Warehouse layout not found" });
      }

      const stats = await storage.getLayoutStatistics(layout.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching layout statistics:", error);
      res.status(500).json({ message: "Failed to fetch layout statistics" });
    }
  });

  app.patch('/api/bins/:id', async (req: any, res) => {
    try {
      const updates = req.body;
      const bin = await storage.updateLayoutBin(req.params.id, updates);

      if (!bin) {
        return res.status(404).json({ message: "Bin not found" });
      }

      await storage.createUserActivity({
        userId: "test-user",
        action: 'updated',
        entityType: 'layout_bin',
        entityId: bin.id,
        description: `Updated bin: ${bin.code}`,
      });

      res.json(bin);
    } catch (error) {
      console.error("Error updating bin:", error);
      res.status(500).json({ message: "Failed to update bin" });
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
      const supplier = await storage.getSupplier(req.params.id);
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
      const supplier = await storage.getSupplier(req.params.id);
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
      // TODO: Implement supplier files feature
      res.json([]);
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

      // Calculate available stock for each bundle
      const bundlesWithStock = await Promise.all(bundles.map(async (bundle) => {
        const items = await storage.getBundleItems(bundle.id);

        if (items.length === 0) {
          return { ...bundle, availableStock: 0 };
        }

        // Calculate how many bundles can be made based on component availability
        const availableBundles = await Promise.all(items.map(async (item) => {
          let availableQuantity = 0;

          if (item.variantId) {
            // Get variant quantity
            const variants = await storage.getProductVariants(item.productId);
            const variant = variants.find(v => v.id === item.variantId);
            availableQuantity = variant?.quantity || 0;
          } else {
            // Get product quantity
            const product = await storage.getProductById(item.productId);
            availableQuantity = product?.quantity || 0;
          }

          // Calculate how many bundles can be made with this item
          return Math.floor(availableQuantity / item.quantity);
        }));

        // Bundle stock is the minimum across all items
        const stock = Math.min(...availableBundles);

        return { ...bundle, availableStock: stock };
      }));

      res.json(bundlesWithStock);
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

      res.json(updatedSuupdatedBundledBundle);
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
      const uploadDir = 'uploads/product-files';
      await fs.mkdir(uploadDir, { recursive: true });

      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(req.file.originalname);
      const filename = uniqueSuffix + ext;
      const filepath = path.join(uploadDir, filename);

      // Save the file
      await fs.writeFile(filepath, req.file.buffer);

      // Generate file URL (accessible via /uploads/product-files/filename)
      const fileUrl = `/uploads/product-files/${filename}`;

      // Create database record
      const fileData = {
        id: nanoid(),
        productId,
        fileType: req.body.fileType || 'other',
        fileName: req.file.originalname,
        fileUrl: fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        description: req.body.description || null,
        language: req.body.language || null,
        uploadedAt: new Date(),
        isActive: true
      };

      const newFile = await storage.createProductFile(fileData);

      res.json(newFile);
    } catch (error) {
      console.error("Error uploading product file:", error);
      res.status(500).json({ message: "Failed to upload product file" });
    }
  });

  app.patch('/api/product-files/:fileId', async (req, res) => {
    try {
      const fileId = req.params.fileId;
      const { fileType, description, language } = req.body;

      const file = await storage.getProductFile(fileId);

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      const updatedFile = await storage.updateProductFile(fileId, {
        fileType,
        description,
        language,
      });

      res.json(updatedFile);
    } catch (error) {
      console.error("Error updating product file:", error);
      res.status(500).json({ message: "Failed to update product file" });
    }
  });

  app.delete('/api/product-files/:fileId', async (req, res) => {
    try {
      const file = await storage.getProductFile(req.params.fileId);

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Delete physical file
      // Convert fileUrl (/uploads/product-files/filename) to actual file path
      const filename = file.fileUrl.split('/').pop();
      const filepath = path.join('uploads/product-files', filename!);

      try {
        await fs.unlink(filepath);
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

      // Convert fileUrl (/uploads/product-files/filename) to actual file path
      const filename = file.fileUrl.split('/').pop();
      const filepath = path.join('uploads/product-files', filename!);

      // Check if file exists
      try {
        await fs.access(filepath);
      } catch (error) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      // Set appropriate headers
      res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);

      // Stream the file
      const fileBuffer = await fs.readFile(filepath);
      res.send(fileBuffer);
    } catch (error) {
      console.error("Error downloading product file:", error);
      res.status(500).json({ message: "Failed to download product file" });
    }
  });

  // Order Files endpoints
  const orderFileUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = /pdf|doc|docx|jpg|jpeg|png|xlsx|xls|zip/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

      if (extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only PDF, DOC, DOCX, JPG, PNG, XLSX, and ZIP files are allowed'));
      }
    }
  });

  app.post('/api/orders/:orderId/files', orderFileUpload.single('file'), async (req: any, res) => {
    try {
      const orderId = req.params.orderId;

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Ensure upload directory exists
      const uploadDir = 'uploads/order-files';
      await fs.mkdir(uploadDir, { recursive: true });

      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(req.file.originalname);
      const filename = uniqueSuffix + ext;
      const filepath = path.join(uploadDir, filename);

      // Save the file
      await fs.writeFile(filepath, req.file.buffer);

      // Generate file URL (accessible via /uploads/order-files/filename)
      const fileUrl = `/uploads/order-files/${filename}`;

      // Create database record
      const fileData = {
        id: nanoid(),
        orderId,
        fileName: req.file.originalname,
        fileUrl: fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: (req.user as any)?.id || null,
        uploadedAt: new Date(),
        isActive: true
      };

      const newFile = await storage.createOrderFile(fileData);

      res.json(newFile);
    } catch (error) {
      console.error("Error uploading order file:", error);
      res.status(500).json({ message: "Failed to upload order file" });
    }
  });

  app.delete('/api/order-files/:fileId', async (req, res) => {
    try {
      const file = await storage.getOrderFile(req.params.fileId);

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Delete physical file
      const filename = file.fileUrl.split('/').pop();
      const filepath = path.join('uploads/order-files', filename!);

      try {
        await fs.unlink(filepath);
      } catch (error) {
        console.error("Error deleting physical file:", error);
      }

      // Delete database record
      const deleted = await storage.deleteOrderFile(req.params.fileId);

      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete file" });
      }

      res.json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Error deleting order file:", error);
      res.status(500).json({ message: "Failed to delete order file" });
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
          customItemId: productCostHistory.customItemId,
        })
        .from(productCostHistory)
        .where(eq(productCostHistory.productId, productId))
        .orderBy(desc(productCostHistory.computedAt));

      // Get purchase item details if available
      const costHistoryWithDetails = await Promise.all(
        costHistory.map(async (history) => {
          let source = history.method;
          if (history.customItemId) {
            const [purchaseItem] = await db
              .select({
                name: purchaseItems.name,
                purchaseId: purchaseItems.purchaseId,
              })
              .from(purchaseItems)
              .where(eq(purchaseItems.id, history.customItemId));

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

  // Product Order History endpoint
  app.get('/api/products/:id/order-history', async (req, res) => {
    try {
      const productId = req.params.id;

      // Get the product to access its cost
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, productId));

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Fetch order items for this product with order details
      const orderItems_list = await db
        .select({
          orderId: orders.id,
          orderNumber: orders.orderId,
          orderDate: orders.createdAt,
          customerId: orders.customerId,
          quantity: orderItems.quantity,
          price: orderItems.price,
          appliedPrice: orderItems.appliedPrice,
          currency: orderItems.currency,
          orderStatus: orders.orderStatus,
          paymentStatus: orders.paymentStatus,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(eq(orderItems.productId, productId))
        .orderBy(desc(orders.createdAt));

      // Get unique customer IDs
      const customerIds = [...new Set(orderItems_list.map(item => item.customerId).filter(Boolean))];

      // Fetch customer details
      const customersMap = new Map();
      if (customerIds.length > 0) {
        const customersList = await db
          .select({
            id: customers.id,
            name: customers.name,
            email: customers.email,
          })
          .from(customers)
          .where(inArray(customers.id, customerIds));

        customersList.forEach(customer => {
          customersMap.set(customer.id, customer);
        });
      }

      // Calculate profit and profit margin for each order
      const orderHistoryWithProfit = orderItems_list.map((order) => {
        const price = parseFloat(order.appliedPrice || order.price || '0');
        const quantity = order.quantity || 0;

        // Get customer details
        const customer = order.customerId ? customersMap.get(order.customerId) : null;

        // Use landing cost based on currency
        let costPerUnit = 0;
        if (order.currency === 'EUR') {
          costPerUnit = parseFloat(product.landingCostEur || product.importCostEur || '0');
        } else if (order.currency === 'USD') {
          costPerUnit = parseFloat(product.landingCostUsd || product.importCostUsd || '0');
        } else if (order.currency === 'VND') {
          costPerUnit = parseFloat(product.landingCostVnd || product.importCostVnd || '0');
        } else if (order.currency === 'CNY') {
          costPerUnit = parseFloat(product.landingCostCny || product.importCostCny || '0');
        } else {
          // Default to CZK
          costPerUnit = parseFloat(product.landingCostCzk || product.importCostCzk || '0');
        }

        const totalRevenue = price * quantity;
        const totalCost = costPerUnit * quantity;
        const profit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? (profit / totalRevenue * 100) : 0;

        return {
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          orderDate: order.orderDate,
          customerId: order.customerId,
          customerName: customer?.name || null,
          customerEmail: customer?.email || null,
          quantity: order.quantity,
          currency: order.currency,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          pricePerUnit: price,
          totalRevenue,
          costPerUnit,
          totalCost,
          profit,
          profitMargin: profitMargin.toFixed(2),
        };
      });

      res.json(orderHistoryWithProfit);
    } catch (error) {
      console.error("Error fetching product order history:", error);
      res.status(500).json({ message: "Failed to fetch product order history" });
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
          const importCurrency = data.importCostUsd ? 'USD' : data.importCostCzk ? 'CZK' : data.importCostEur ? 'EUR' : data.importCostVnd ? 'VND' : data.importCostCny ? 'CNY' : 'CZK';
          const importCost = parseFloat(data.importCostUsd || data.importCostCzk || data.importCostEur || data.importCostVnd || data.importCostCny || data.importCostCzk || '0');
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
      const updates = { ...req.body };
      const productId = req.params.id;

      console.log('PATCH /api/products/:id - variants received:', updates.variants);

      // Extract variants from updates
      const newVariants = updates.variants || [];
      delete updates.variants;

      console.log('PATCH - extracted variants count:', newVariants.length);

      // Update the main product
      const product = await storage.updateProduct(productId, updates);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Handle variants if provided
      if (newVariants.length > 0 || req.body.hasOwnProperty('variants')) {
        // Get existing variants
        const existingVariants = await storage.getProductVariants(productId);
        const existingVariantIds = existingVariants.map(v => v.id);
        const newVariantIds = newVariants
          .filter((v: any) => v.id && !v.id.startsWith('temp-'))
          .map((v: any) => v.id);

        // Delete variants that are no longer in the list
        const variantsToDelete = existingVariantIds.filter(id => !newVariantIds.includes(id));
        for (const variantId of variantsToDelete) {
          await storage.deleteProductVariant(variantId);
        }

        // Create or update variants
        for (const variant of newVariants) {
          const variantData = {
            productId,
            name: variant.name,
            barcode: variant.barcode || null,
            quantity: variant.quantity || 0,
            importCostUsd: variant.importCostUsd || null,
            importCostCzk: variant.importCostCzk || null,
            importCostEur: variant.importCostEur || null,
            imageUrl: variant.imageUrl || null,
          };

          // Create new variant if ID starts with "temp-" or doesn't exist
          if (!variant.id || variant.id.startsWith('temp-')) {
            await storage.createProductVariant(variantData);
          } else {
            // Update existing variant
            await storage.updateProductVariant(variant.id, variantData);
          }
        }
      }

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

  // Move product to another warehouse
  app.post('/api/products/:id/move-warehouse', async (req: any, res) => {
    try {
      const { id: productId } = req.params;
      const { targetWarehouseId } = req.body;

      if (!targetWarehouseId) {
        return res.status(400).json({ message: "Target warehouse ID is required" });
      }

      // Get the product and verify it exists
      const product = await storage.getProductById(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Verify target warehouse exists
      const targetWarehouse = await storage.getWarehouse(targetWarehouseId);
      if (!targetWarehouse) {
        return res.status(404).json({ message: "Target warehouse not found" });
      }

      const oldWarehouseId = product.warehouseId;

      // Update product's warehouse
      const updatedProduct = await storage.updateProduct(productId, { 
        warehouseId: targetWarehouseId 
      });

      // Create activity log
      await storage.createUserActivity({
        userId: "test-user",
        action: 'updated',
        entityType: 'product',
        entityId: productId,
        description: `Moved "${product.name}" from warehouse ${oldWarehouseId || 'unassigned'} to ${targetWarehouse.name}`,
      });

      res.json({ 
        success: true, 
        product: updatedProduct,
        targetWarehouse: targetWarehouse,
        message: `Product moved to ${targetWarehouse.name}` 
      });
    } catch (error) {
      console.error("Error moving product to warehouse:", error);
      res.status(500).json({ message: "Failed to move product to warehouse" });
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
      const targetWarehouse = await storage.getWarehouse(targetWarehouseId);
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
      const { id: productId, locationId } = req.params;

      // Validate update data (partial schema)
      const updateData = insertProductLocationSchema.partial().parse(req.body);

      // Handle legacy locations (from old warehouseLocation field)
      if (locationId === 'legacy') {
        // Get the product to verify it exists
        const product = await storage.getProductById(productId);
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }

        // Create a new real location with the updated data
        const newLocation = await storage.createProductLocation({
          productId: productId,
          locationType: updateData.locationType || 'warehouse',
          locationCode: updateData.locationCode || product.warehouseLocation || 'WH1-A01-R01-L01',
          quantity: updateData.quantity ?? product.quantity ?? 0,
          notes: updateData.notes || 'Migrated from legacy location',
          isPrimary: updateData.isPrimary ?? true,
        });

        // Clear the old warehouseLocation field
        await storage.updateProduct(productId, { warehouseLocation: null });

        await storage.createUserActivity({
          userId: "test-user",
          action: 'created',
          entityType: 'product_location',
          entityId: newLocation.id,
          description: `Migrated legacy location ${newLocation.locationCode}`,
        });

        return res.json(newLocation);
      }

      // Normal update for existing locations
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
      const { id: productId, locationId } = req.params;

      // Handle legacy locations (from old warehouseLocation field)
      if (locationId === 'legacy') {
        // Just clear the old warehouseLocation field
        await storage.updateProduct(productId, { warehouseLocation: null });

        await storage.createUserActivity({
          userId: "test-user",
          action: 'deleted',
          entityType: 'product_location',
          entityId: locationId,
          description: `Removed legacy location`,
        });

        return res.status(204).send();
      }

      // Normal delete for existing locations
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

  // Stock Adjustment Request endpoints
  app.get('/api/stock-adjustment-requests', async (req: any, res) => {
    try {
      const requests = await storage.getStockAdjustmentRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching stock adjustment requests:", error);
      res.status(500).json({ message: "Failed to fetch stock adjustment requests" });
    }
  });

  app.get('/api/over-allocated-items', async (req: any, res) => {
    try {
      const items = await storage.getOverAllocatedItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching over-allocated items:", error);
      res.status(500).json({ message: "Failed to fetch over-allocated items" });
    }
  });

  app.get('/api/under-allocated-items', async (req: any, res) => {
    try {
      const items = await storage.getUnderAllocatedItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching under-allocated items:", error);
      res.status(500).json({ message: "Failed to fetch under-allocated items" });
    }
  });

  app.post('/api/stock-adjustment-requests', async (req: any, res) => {
    try {
      // Get user ID (fallback to test-user if auth is disabled)
      const userId = req.user?.id || "test-user";

      // Override requestedBy with authenticated user
      const requestDataWithUser = {
        ...req.body,
        requestedBy: userId,
      };

      const requestData = insertStockAdjustmentRequestSchema.parse(requestDataWithUser);
      const request = await storage.createStockAdjustmentRequest(requestData);

      await storage.createUserActivity({
        userId: userId,
        action: 'created',
        entityType: 'stock_adjustment_request',
        entityId: request.id,
        description: `Requested stock adjustment: ${request.adjustmentType} ${request.requestedQuantity}`,
      });

      res.status(201).json(request);
    } catch (error: any) {
      console.error("Error creating stock adjustment request:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create stock adjustment request" });
    }
  });

  // Direct stock adjustment (bypasses approval if setting allows)
  app.post('/api/stock/direct-adjustment', async (req: any, res) => {
    try {
      // Get user ID (fallback to test-user if auth is disabled)
      const userId = req.user?.id || "test-user";

      // Load inventory settings to check if direct adjustments are allowed
      const inventorySettings = await getSettingsByCategory('inventory');

      // Server-side validation: Only allow if approval NOT required
      if (inventorySettings.stockAdjustmentApprovalRequired === true) {
        return res.status(403).json({ 
          message: 'Direct adjustments not allowed. Stock adjustment approval is required. Please create an approval request instead.' 
        });
      }

      const { productId, locationId, adjustmentType, quantity, reason } = req.body;

      // Validate required fields
      if (!productId || !locationId || !adjustmentType || quantity === undefined || !reason) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Validate adjustment type
      if (!['add', 'remove', 'set'].includes(adjustmentType)) {
        return res.status(400).json({ message: "Invalid adjustment type" });
      }

      // Get current location
      const location = await storage.getProductLocation(locationId);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      // Calculate new quantity
      let newQuantity: number;
      switch (adjustmentType) {
        case 'add':
          newQuantity = location.quantity + quantity;
          break;
        case 'remove':
          newQuantity = location.quantity - quantity;
          break;
        case 'set':
          newQuantity = quantity;
          break;
        default:
          return res.status(400).json({ message: "Invalid adjustment type" });
      }

      // Validate that new quantity is not negative (unless allowNegativeStock is enabled)
      if (newQuantity < 0 && !inventorySettings.allowNegativeStock) {
        return res.status(400).json({ 
          message: `Adjustment would result in negative stock (${newQuantity}). Current stock: ${location.quantity}` 
        });
      }

      // Perform the stock adjustment
      await storage.updateProductLocationQuantity(locationId, newQuantity);

      // Create audit trail with real user ID
      await storage.createUserActivity({
        userId: userId,
        action: 'adjusted',
        entityType: 'product_location',
        entityId: locationId,
        description: `Direct stock adjustment: ${adjustmentType} ${quantity} units (${reason}). Old: ${location.quantity}, New: ${newQuantity}`,
      });

      res.json({ success: true, newQuantity, oldQuantity: location.quantity });
    } catch (error: any) {
      console.error("Error performing direct stock adjustment:", error);
      res.status(500).json({ message: error.message || "Failed to adjust stock" });
    }
  });

  app.patch('/api/stock-adjustment-requests/:id/approve', async (req: any, res) => {
    try {
      const { id } = req.params;
      const approvedBy = req.body.approvedBy || "test-user";

      const request = await storage.approveStockAdjustmentRequest(id, approvedBy);

      if (!request) {
        return res.status(404).json({ message: "Request not found or already processed" });
      }

      await storage.createUserActivity({
        userId: approvedBy,
        action: 'approved',
        entityType: 'stock_adjustment_request',
        entityId: request.id,
        description: `Approved stock adjustment: ${request.adjustmentType} ${request.requestedQuantity}`,
      });

      res.json(request);
    } catch (error: any) {
      console.error("Error approving stock adjustment request:", error);
      res.status(500).json({ 
        message: error.message || "Failed to approve stock adjustment request" 
      });
    }
  });

  app.patch('/api/stock-adjustment-requests/:id/reject', async (req: any, res) => {
    try {
      const { id } = req.params;
      const { approvedBy = "test-user", reason } = req.body;

      if (!reason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }

      const request = await storage.rejectStockAdjustmentRequest(id, approvedBy, reason);

      if (!request) {
        return res.status(404).json({ message: "Request not found or already processed" });
      }

      await storage.createUserActivity({
        userId: approvedBy,
        action: 'rejected',
        entityType: 'stock_adjustment_request',
        entityId: request.id,
        description: `Rejected stock adjustment: ${request.adjustmentType} ${request.requestedQuantity}`,
      });

      res.json(request);
    } catch (error: any) {
      console.error("Error rejecting stock adjustment request:", error);
      res.status(500).json({ 
        message: error.message || "Failed to reject stock adjustment request" 
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
      const material = await storage.getPackingMaterial(req.params.id);
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

  // Bulk delete packing materials
  app.post('/api/packing-materials/bulk-delete', async (req: any, res) => {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invalid request: ids array required" });
      }

      // Delete all materials
      await Promise.all(ids.map(id => storage.deletePackingMaterial(id)));

      await storage.createUserActivity({
        userId: "test-user",
        action: 'deleted',
        entityType: 'packing_material',
        entityId: ids.join(','),
        description: `Bulk deleted ${ids.length} packing material(s)`,
      });

      res.json({ message: `Successfully deleted ${ids.length} material(s)` });
    } catch (error) {
      console.error("Error bulk deleting packing materials:", error);
      res.status(500).json({ message: "Failed to bulk delete packing materials" });
    }
  });

  // Bulk update category
  app.post('/api/packing-materials/bulk-update-category', async (req: any, res) => {
    try {
      const { ids, category } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invalid request: ids array required" });
      }

      if (!category) {
        return res.status(400).json({ message: "Invalid request: category required" });
      }

      // Update all materials
      const updatedMaterials = await Promise.all(
        ids.map(id => storage.updatePackingMaterial(id, { category }))
      );

      await storage.createUserActivity({
        userId: "test-user",
        action: 'updated',
        entityType: 'packing_material',
        entityId: ids.join(','),
        description: `Bulk updated category to "${category}" for ${ids.length} material(s)`,
      });

      res.json(updatedMaterials);
    } catch (error) {
      console.error("Error bulk updating packing materials:", error);
      res.status(500).json({ message: "Failed to bulk update packing materials" });
    }
  });

  // PM Suppliers endpoints
  app.get('/api/pm-suppliers', async (req, res) => {
    try {
      const search = req.query.search as string;
      let suppliers;

      if (search) {
        suppliers = await storage.searchPmSuppliers(search);
      } else {
        suppliers = await storage.getPmSuppliers();
      }

      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching PM suppliers:", error);
      res.status(500).json({ message: "Failed to fetch PM suppliers" });
    }
  });

  app.get('/api/pm-suppliers/:id', async (req, res) => {
    try {
      const supplier = await storage.getPmSupplier(req.params.id);
      if (supplier) {
        res.json(supplier);
      } else {
        res.status(404).json({ message: "PM supplier not found" });
      }
    } catch (error) {
      console.error("Error fetching PM supplier:", error);
      res.status(500).json({ message: "Failed to fetch PM supplier" });
    }
  });

  app.post('/api/pm-suppliers', async (req: any, res) => {
    try {
      const supplierData = req.body;
      const supplier = await storage.createPmSupplier(supplierData);

      await storage.createUserActivity({
        userId: "test-user",
        action: 'created',
        entityType: 'pm_supplier',
        entityId: supplier.id,
        description: `Created PM supplier: ${supplier.name}`,
      });

      res.status(201).json(supplier);
    } catch (error) {
      console.error("Error creating PM supplier:", error);
      res.status(500).json({ message: "Failed to create PM supplier" });
    }
  });

  app.patch('/api/pm-suppliers/:id', async (req: any, res) => {
    try {
      const updates = req.body;
      const supplier = await storage.updatePmSupplier(req.params.id, updates);

      if (supplier) {
        await storage.createUserActivity({
          userId: "test-user",
          action: 'updated',
          entityType: 'pm_supplier',
          entityId: supplier.id,
          description: `Updated PM supplier: ${supplier.name}`,
        });

        res.json(supplier);
      } else {
        res.status(404).json({ message: "PM supplier not found" });
      }
    } catch (error) {
      console.error("Error updating PM supplier:", error);
      res.status(500).json({ message: "Failed to update PM supplier" });
    }
  });

  app.delete('/api/pm-suppliers/:id', async (req: any, res) => {
    try {
      await storage.deletePmSupplier(req.params.id);

      await storage.createUserActivity({
        userId: "test-user",
        action: 'deleted',
        entityType: 'pm_supplier',
        entityId: req.params.id,
        description: `Deleted PM supplier`,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting PM supplier:", error);
      res.status(500).json({ message: "Failed to delete PM supplier" });
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
      const includeBadges = req.query.includeBadges === 'true';
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

      // If includeBadges=true, fetch badges for each customer
      if (includeBadges) {
        const customersWithBadges = await Promise.all(
          customersWithPayLaterBadge.map(async (customer) => {
            const badges = await storage.getCustomerBadges(customer.id);
            return { ...customer, badges };
          })
        );
        return res.json(customersWithBadges);
      }

      res.json(customersWithPayLaterBadge);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get('/api/customers/check-duplicate/:facebookId', async (req, res) => {
    try {
      const facebookId = req.params.facebookId;

      if (!facebookId) {
        return res.status(400).json({ message: "Facebook ID is required" });
      }

      // Get all customers and find one with matching Facebook ID
      const customers = await storage.getCustomers();
      const existingCustomer = customers.find(c => c.facebookId === facebookId);

      if (existingCustomer) {
        res.json({
          exists: true,
          customer: existingCustomer
        });
      } else {
        res.json({ exists: false });
      }
    } catch (error) {
      console.error("Error checking duplicate customer:", error);
      res.status(500).json({ message: "Failed to check duplicate" });
    }
  });

  // Get customer order count
  app.get('/api/customers/:id/order-count', async (req, res) => {
    try {
      const customerId = req.params.id;

      if (!customerId) {
        return res.status(400).json({ message: "Customer ID is required" });
      }

      // Get all orders for this customer
      const allOrders = await storage.getOrders();
      const customerOrders = allOrders.filter(order => order.customerId === customerId);

      res.json({ count: customerOrders.length });
    } catch (error) {
      console.error("Error fetching customer order count:", error);
      res.status(500).json({ message: "Failed to fetch order count" });
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

      const customerWithBadge: any = {
        ...customer,
        hasPayLaterBadge,
        payLaterPercentage: Math.round(payLaterPercentage),
        totalOrders: customerOrders.length
      };

      // Include badges if requested via query parameter
      if (req.query.includeBadges === 'true') {
        const badges = await storage.getCustomerBadges(req.params.id);
        customerWithBadge.badges = badges;
      }

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

      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

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

  // Customer Badge endpoints
  app.get('/api/customers/:id/badges', async(req, res) => {
    try {
      const badges = await storage.getCustomerBadges(req.params.id);
      res.json(badges);
    } catch (error) {
      console.error("Error fetching customer badges:", error);
      res.status(500).json({ error: 'Failed to fetch badges' });
    }
  });

  app.post('/api/customers/:id/badges/refresh', async (req, res) => {
    try {
      await storage.refreshCustomerBadges(req.params.id);
      res.json({ success: true, message: 'Badges refreshed' });
    } catch (error) {
      console.error("Error refreshing customer badges:", error);
      res.status(500).json({ error: 'Failed to refresh badges' });
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

  // Get customer order history
  app.get('/api/customers/:customerId/orders', async (req, res) => {
    try {
      const { customerId } = req.params;
      const allOrders = await storage.getOrders();
      const customerOrders = allOrders.filter(order => order.customerId === customerId);
      res.json(customerOrders);
    } catch (error) {
      console.error("Error fetching customer orders:", error);
      res.status(500).json({ message: "Failed to fetch customer orders" });
    }
  });

  app.post('/api/customers/:customerId/shipping-addresses', async (req: any, res) => {
    try {
      const { customerId } = req.params;

      // Validate required fields
      const requiredFields = ['firstName', 'lastName', 'street', 'city', 'zipCode', 'country'];
      const missingFields = requiredFields.filter(field => !req.body[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({ 
          message: `Missing required fields: ${missingFields.join(', ')}` 
        });
      }

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
    } catch (error: any) {
      console.error("Error creating shipping address:", error);
      const errorMessage = error?.message || "Failed to create shipping address";
      res.status(500).json({ message: errorMessage });
    }
  });

  app.patch('/api/customers/:customerId/shipping-addresses/:addressId', async (req: any, res) => {
    try {
      const { customerId, addressId } = req.params;

      // Validate required fields if they are being updated
      const requiredFields = ['firstName', 'lastName', 'street', 'city', 'zipCode', 'country'];
      const fieldsToUpdate = Object.keys(req.body);
      const invalidFields = requiredFields.filter(field => 
        fieldsToUpdate.includes(field) && !req.body[field]
      );

      if (invalidFields.length > 0) {
        return res.status(400).json({ 
          message: `These required fields cannot be empty: ${invalidFields.join(', ')}` 
        });
      }

      const address = await storage.updateCustomerShippingAddress(addressId, {
        ...req.body,
        customerId // Ensure customer ID doesn't change
      });

      if (!address) {
        return res.status(404).json({ message: 'Address not found' });
      }

      await storage.createUserActivity({
        userId: "test-user",
        action: 'updated',
        entityType: 'shipping_address',
        entityId: addressId,
        description: `Updated shipping address for customer ${customerId}`,
      });

      res.json(address);
    } catch (error: any) {
      console.error("Error updating shipping address:", error);
      const errorMessage = error?.message || "Failed to update shipping address";
      res.status(500).json({ message: errorMessage });
    }
  });

  app.patch('/api/shipping-addresses/:id', async (req: any, res) => {
    try {
      const { id } = req.params;

      // Validate required fields if they are being updated
      const requiredFields = ['firstName', 'lastName', 'street', 'city', 'zipCode', 'country'];
      const fieldsToUpdate = Object.keys(req.body);
      const invalidFields = requiredFields.filter(field => 
        fieldsToUpdate.includes(field) && !req.body[field]
      );

      if (invalidFields.length > 0) {
        return res.status(400).json({ 
          message: `Cannot set required fields to empty: ${invalidFields.join(', ')}` 
        });
      }

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
    } catch (error: any) {
      console.error("Error updating shipping address:", error);
      const errorMessage = error?.message || "Failed to update shipping address";
      res.status(500).json({ message: errorMessage });
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

  app.delete('/api/customers/:customerId/shipping-addresses/:addressId/remove-primary', async (req: any, res) => {
    try {
      const { customerId, addressId } = req.params;

      // Set this specific address to non-primary
      await storage.updateCustomerShippingAddress(addressId, { isPrimary: false });

      await storage.createUserActivity({
        userId: "test-user",
        action: 'updated',
        entityType: 'shipping_address',
        entityId: addressId,
        description: `Removed primary status from shipping address for customer ${customerId}`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error removing primary shipping address:", error);
      res.status(500).json({ message: "Failed to remove primary shipping address" });
    }
  });

  // Customer Billing Addresses endpoints
  app.get('/api/customers/:customerId/billing-addresses', async (req, res) => {
    try {
      const { customerId } = req.params;
      const addresses = await storage.getCustomerBillingAddresses(customerId);
      res.json(addresses);
    } catch (error) {
      console.error("Error fetching customer billing addresses:", error);
      res.status(500).json({ message: "Failed to fetch billing addresses" });
    }
  });

  app.get('/api/billing-addresses/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const address = await storage.getCustomerBillingAddress(id);
      if (!address) {
        return res.status(404).json({ message: 'Address not found' });
      }
      res.json(address);
    } catch (error) {
      console.error("Error fetching billing address:", error);
      res.status(500).json({ message: "Failed to fetch billing address" });
    }
  });

  app.post('/api/customers/:customerId/billing-addresses', async (req: any, res) => {
    try {
      const { customerId } = req.params;

      // Validate request body and omit customerId to prevent override
      const validatedData = insertCustomerBillingAddressSchema.omit({ customerId: true }).parse(req.body);

      // Create address with customerId from path parameter
      const address = await storage.createCustomerBillingAddress({
        ...validatedData,
        customerId,
      });

      await storage.createUserActivity({
        userId: "test-user",
        action: 'created',
        entityType: 'billing_address',
        entityId: address.id,
        description: `Created billing address for customer ${customerId}`,
      });

      res.status(201).json(address);
    } catch (error) {
      console.error("Error creating billing address:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create billing address" });
    }
  });

  app.patch('/api/billing-addresses/:id', async (req: any, res) => {
    try {
      const { id } = req.params;

      // Validate request body and omit customerId to prevent override
      const validatedData = insertCustomerBillingAddressSchema.partial().omit({ customerId: true }).parse(req.body);

      const address = await storage.updateCustomerBillingAddress(id, validatedData);
      if (!address) {
        return res.status(404).json({ message: 'Address not found' });
      }

      await storage.createUserActivity({
        userId: "test-user",
        action: 'updated',
        entityType: 'billing_address',
        entityId: address.id,
        description: `Updated billing address`,
      });

      res.json(address);
    } catch (error) {
      console.error("Error updating billing address:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update billing address" });
    }
  });

  app.delete('/api/billing-addresses/:id', async (req: any, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteCustomerBillingAddress(id);
      if (!success) {
        return res.status(404).json({ message: 'Address not found' });
      }

      await storage.createUserActivity({
        userId: "test-user",
        action: 'deleted',
        entityType: 'billing_address',
        entityId: id,
        description: `Deleted billing address`,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting billing address:", error);
      res.status(500).json({ message: "Failed to delete billing address" });
    }
  });

  app.patch('/api/billing-addresses/:id/set-primary', async (req: any, res) => {
    try {
      const { id } = req.params;
      const address = await storage.getCustomerBillingAddress(id);
      if (!address) {
        return res.status(404).json({ message: 'Address not found' });
      }

      await storage.setPrimaryBillingAddress(address.customerId, id);

      await storage.createUserActivity({
        userId: "test-user",
        action: 'updated',
        entityType: 'billing_address',
        entityId: id,
        description: `Set billing address as primary for customer ${address.customerId}`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error setting primary billing address:", error);
      res.status(500).json({ message: "Failed to set primary billing address" });
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
                  packingMaterial = await storage.getPackingMaterial(product.packingMaterialId);
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
                    location: location || 'A1-R1-S1'
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

  // Fetch all order items for analytics (e.g., units sold calculation)
  app.get('/api/order-items/all', async (req, res) => {
    try {
      const items = await storage.getAllOrderItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching all order items:", error);
      res.status(500).json({ message: "Failed to fetch order items" });
    }
  });

  // Pick & Pack endpoints (OPTIMIZED - eliminates N+1 queries)
  app.get('/api/orders/pick-pack', async (req, res) => {
    try {
      // Disable HTTP caching to ensure fresh data is always sent
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');

      const status = req.query.status as string; // pending, picking, packing, ready
      const orders = await storage.getPickPackOrders(status);

      // OPTIMIZATION 1: Fetch bundles ONCE for all orders (not inside loops)
      const allBundles = await storage.getBundles();
      const bundleMap = new Map(allBundles.map(b => [b.name, b]));

      // OPTIMIZATION 2: Batch fetch all order items
      const allOrderItemsArrays = await Promise.all(
        orders.map(order => storage.getOrderItems(order.id))
      );

      // OPTIMIZATION 3: Identify all bundles needed and collect product/variant IDs
      const bundleIds = new Set<string>();
      const productIds = new Set<string>();
      const variantRequests = new Map<string, Set<string>>(); // productId -> variantIds

      // First pass: identify bundles in use AND collect product IDs from all order items
      for (const items of allOrderItemsArrays) {
        for (const item of items) {
          // Collect product ID from every order item
          if (item.productId) {
            productIds.add(item.productId);
          }

          // Check if this is a bundle
          for (const [bundleName, bundle] of Array.from(bundleMap.entries())) {
            if (item.productName && item.productName.includes(bundleName)) {
              bundleIds.add(bundle.id);
              break;
            }
          }
        }
      }

      // OPTIMIZATION 4: Batch fetch all bundle items
      const bundleItemsMap = new Map<string, any[]>();
      if (bundleIds.size > 0) {
        const bundleItemsResults = await Promise.all(
          Array.from(bundleIds).map(bundleId => 
            storage.getBundleItems(bundleId).then(items => ({ bundleId, items }))
          )
        );

        for (const { bundleId, items } of bundleItemsResults) {
          bundleItemsMap.set(bundleId, items);

          // Collect product and variant IDs from bundle items
          for (const bundleItem of items) {
            if (bundleItem.productId) {
              productIds.add(bundleItem.productId);

              if (bundleItem.variantId) {
                if (!variantRequests.has(bundleItem.productId)) {
                  variantRequests.set(bundleItem.productId, new Set());
                }
                variantRequests.get(bundleItem.productId)!.add(bundleItem.variantId);
              }
            }
          }
        }
      }

      // OPTIMIZATION 5: Batch fetch all products
      const productsMap = new Map<string, any>();
      if (productIds.size > 0) {
        const productsResults = await Promise.all(
          Array.from(productIds).map(productId => 
            storage.getProductById(productId).then(product => ({ productId, product }))
          )
        );

        for (const { productId, product } of productsResults) {
          if (product) {
            productsMap.set(productId, product);
          }
        }
      }

      // OPTIMIZATION 6: Batch fetch all variants
      const variantsMap = new Map<string, Map<string, any>>();
      if (variantRequests.size > 0) {
        const variantsResults = await Promise.all(
          Array.from(variantRequests.keys()).map(productId => 
            storage.getProductVariants(productId).then(variants => ({ productId, variants }))
          )
        );

        for (const { productId, variants } of variantsResults) {
          variantsMap.set(productId, new Map(variants.map(v => [v.id, v])));
        }
      }

      // OPTIMIZATION 7: Assemble response using lookup maps (O(1) access)
      const ordersWithItems = orders.map((order, orderIndex) => {
        const items = allOrderItemsArrays[orderIndex];

        const itemsWithBundleDetails = items.map(item => {
          // Get product image from products map
          const product = item.productId ? productsMap.get(item.productId) : null;
          const imageUrl = product?.imageUrl || null;

          // Check if this product is a bundle (using pre-fetched bundle map)
          let matchedBundle = null;
          for (const [bundleName, bundle] of Array.from(bundleMap.entries())) {
            if (item.productName && item.productName.includes(bundleName)) {
              matchedBundle = bundle;
              break;
            }
          }

          if (matchedBundle && bundleItemsMap.has(matchedBundle.id)) {
            const bundleItems = bundleItemsMap.get(matchedBundle.id) || [];
            const bundleItemsWithDetails = bundleItems.map(bundleItem => {
              let productName = '';

              if (bundleItem.productId) {
                const product = productsMap.get(bundleItem.productId);
                productName = product?.name || '';

                if (bundleItem.variantId) {
                  const productVariants = variantsMap.get(bundleItem.productId);
                  if (productVariants) {
                    const variant = productVariants.get(bundleItem.variantId);
                    if (variant) {
                      productName = `${productName} - ${variant.name}`;
                    }
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
            });

            return {
              ...item,
              image: imageUrl,
              isBundle: true,
              bundleItems: bundleItemsWithDetails
            };
          }

          return {
            ...item,
            image: imageUrl
          };
        });

        return {
          ...order,
          // Keep the status already mapped by getPickPackStatus in storage layer
          items: itemsWithBundleDetails
        };
      });

      res.json(ordersWithItems);
    } catch (error) {
      console.error("Error fetching pick-pack orders:", error);
      res.status(500).json({ message: "Failed to fetch pick-pack orders" });
    }
  });

  // Get pick/pack performance predictions for current user
  app.get('/api/orders/pick-pack/predictions', async (req: any, res) => {
    try {
      const userId = req.user?.id || "test-user"; // Use authenticated user ID
      const predictions = await storage.getPickPackPredictions(userId);
      res.json(predictions);
    } catch (error) {
      console.error("Error fetching pick-pack predictions:", error);
      res.status(500).json({ message: "Failed to fetch predictions" });
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
      const { cartons, packageWeight, printedDocuments, packingChecklist, packingMaterialsApplied, selectedDocumentIds } = req.body;

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
      const updateData: any = {
        packStatus: 'completed',
        packEndTime: new Date(),
        orderStatus: 'ready_to_ship', // Update status to ready_to_ship
        finalWeight: parseFloat(packageWeight) || 0,
        cartonUsed: cartons?.length > 0 ? cartons.map((c: any) => c.cartonName).join(', ') : ''
      };

      // Update includedDocuments with selected product document IDs (merge with existing)
      if (selectedDocumentIds && Array.isArray(selectedDocumentIds)) {
        try {
          const order = await storage.getOrderById(req.params.id);
          const currentIncludedDocs = (order?.includedDocuments || {}) as any;

          updateData.includedDocuments = {
            ...currentIncludedDocs,
            fileIds: selectedDocumentIds
          };
        } catch (error) {
          console.error('Error merging includedDocuments:', error);
          // Fallback to just setting fileIds if merge fails
          updateData.includedDocuments = {
            fileIds: selectedDocumentIds
          };
        }
      }

      await storage.updateOrder(req.params.id, updateData);

      // Process packing materials - decrease stock and create usage records
      if (packingMaterialsApplied && typeof packingMaterialsApplied === 'object') {
        const appliedMaterialIds = Object.keys(packingMaterialsApplied).filter(
          (materialId) => packingMaterialsApplied[materialId] === true
        );

        for (const materialId of appliedMaterialIds) {
          try {
            // Decrease stock quantity by 1 for each applied material
            await storage.decreasePackingMaterialStock(materialId, 1);

            // Create usage record
            await storage.createPackingMaterialUsage({
              orderId: req.params.id,
              materialId: materialId,
              quantity: 1,
              notes: 'Applied during packing completion'
            });
          } catch (stockError) {
            console.error(`Error updating stock for material ${materialId}:`, stockError);
            // Continue with other materials even if one fails
          }
        }
      }

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
        multiCartonOptimization,
        selectedDocumentIds
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

      // Update order's includedDocuments with selected product documents
      if (selectedDocumentIds && Array.isArray(selectedDocumentIds)) {
        try {
          // Get current order to merge with existing includedDocuments
          const order = await storage.getOrderById(req.params.id);
          const currentIncludedDocs = (order?.includedDocuments || {}) as any;

          // Merge selected document IDs while preserving other fields
          const updatedIncludedDocs = {
            ...currentIncludedDocs,
            fileIds: selectedDocumentIds
          };

          await storage.updateOrder(req.params.id, {
            includedDocuments: updatedIncludedDocs
          });
        } catch (error) {
          console.error('Error updating includedDocuments:', error);
          // Don't fail the whole request if this fails
        }
      }

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

  // Get shipment labels for an order
  app.get('/api/orders/:id/shipment-labels', async (req: any, res) => {
    try {
      const labels = await storage.getShipmentLabelsByOrderId(req.params.id);
      res.json(labels);
    } catch (error) {
      console.error("Error getting shipment labels:", error);
      res.status(500).json({ message: "Failed to get shipment labels" });
    }
  });

  // Get tracking for an order
  app.get('/api/orders/:id/tracking', async (req, res) => {
    try {
      const { id } = req.params;
      const force = req.query.force === 'true';

      // Load shipping settings
      const shippingSettings = await getSettingsByCategory('shipping');
      const enableTracking = shippingSettings.enableTracking ?? true;
      const trackingUpdateFrequencyHours = shippingSettings.trackingUpdateFrequencyHours ?? 1;

      // Guard: Return empty if tracking disabled
      if (!enableTracking) {
        return res.json([]);
      }

      // Create service with configured frequency
      const trackingService = new TrackingService(trackingUpdateFrequencyHours);
      let tracking = await trackingService.getOrderTracking(id);

      // If no tracking exists, create it from order cartons
      if (tracking.length === 0) {
        await trackingService.createTrackingForOrder(id);
        tracking = await trackingService.getOrderTracking(id);
      }

      // Force refresh if requested
      if (force) {
        for (const t of tracking) {
          await trackingService.refreshTracking(t.id);
        }
        tracking = await trackingService.getOrderTracking(id);
      }

      res.json(tracking);
    } catch (error: any) {
      console.error('Error fetching tracking:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch tracking' });
    }
  });

  // Refresh specific tracking
  app.patch('/api/tracking/:id/refresh', async (req, res) => {
    try {
      const { id } = req.params;

      // Load shipping settings
      const shippingSettings = await getSettingsByCategory('shipping');
      const enableTracking = shippingSettings.enableTracking ?? true;
      const trackingUpdateFrequencyHours = shippingSettings.trackingUpdateFrequencyHours ?? 1;

      // Guard: Return error if tracking disabled
      if (!enableTracking) {
        return res.status(400).json({ error: 'Tracking is disabled' });
      }

      // Create service with configured frequency
      const trackingService = new TrackingService(trackingUpdateFrequencyHours);
      const updated = await trackingService.refreshTracking(id);
      res.json(updated);
    } catch (error: any) {
      console.error('Error refreshing tracking:', error);
      res.status(500).json({ error: error.message || 'Failed to refresh tracking' });
    }
  });

  // Bulk refresh all active tracking
  app.post('/api/tracking/bulk-refresh', async (req, res) => {
    try {
      // Load shipping settings
      const shippingSettings = await getSettingsByCategory('shipping');
      const enableTracking = shippingSettings.enableTracking ?? true;
      const trackingUpdateFrequencyHours = shippingSettings.trackingUpdateFrequencyHours ?? 1;

      // Guard: Return early if tracking disabled
      if (!enableTracking) {
        return res.json({ refreshed: 0, total: 0, message: 'Tracking is disabled' });
      }

      // Calculate frequency in milliseconds
      const frequencyMs = trackingUpdateFrequencyHours * 60 * 60 * 1000;

      // Get all tracking that hasn't been delivered
      const activeTracking = await db.query.shipmentTracking.findMany({
        where: and(
          isNull(shipmentTracking.deliveredAt),
          // Only refresh if last check was > configured frequency OR never checked (NULL)
          or(
            isNull(shipmentTracking.lastCheckedAt),
            lt(shipmentTracking.lastCheckedAt, new Date(Date.now() - frequencyMs))
          )
        )
      });

      // Create service with configured frequency
      const trackingService = new TrackingService(trackingUpdateFrequencyHours);

      let refreshed = 0;
      for (const tracking of activeTracking) {
        try {
          await trackingService.refreshTracking(tracking.id);
          refreshed++;
        } catch (error) {
          console.error(`Failed to refresh tracking ${tracking.id}:`, error);
        }
      }

      res.json({ refreshed, total: activeTracking.length });
    } catch (error: any) {
      console.error('Error in bulk refresh:', error);
      res.status(500).json({ error: error.message || 'Bulk refresh failed' });
    }
  });

  app.get('/api/orders/:id', async (req, res) => {
    try {
      // Prevent all caching for order details to ensure fresh data
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      });

      const includeBadges = req.query.includeBadges === 'true';
      const order = await storage.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Enhance order items with landing costs and images
      if (order.items && order.items.length > 0) {
        const itemsWithEnhancements = await Promise.all(order.items.map(async (item) => {
          // Handle products
          if (item.productId) {
            const [productData] = await db
              .select()
              .from(products)
              .where(eq(products.id, item.productId))
              .limit(1);

            return {
              ...item,
              landingCost: productData?.latestLandingCost || null,
              // If order item doesn't have image, populate from product
              image: item.image || productData?.imageUrl || null
            };
          }

          // Handle bundles
          if (item.bundleId) {
            const [bundleData] = await db
              .select()
              .from(productBundles)
              .where(eq(productBundles.id, item.bundleId))
              .limit(1);

            return {
              ...item,
              // If order item doesn't have image, populate from bundle
              image: item.image || bundleData?.imageUrl || null
            };
          }

          // Handle bundles with missing bundleId (legacy orders) - lookup by name
          if (!item.productId && !item.serviceId && item.productName) {
            const [bundleData] = await db
              .select()
              .from(productBundles)
              .where(eq(productBundles.name, item.productName))
              .limit(1);

            if (bundleData) {
              return {
                ...item,
                bundleId: bundleData.id, // Populate missing bundleId
                image: item.image || bundleData.imageUrl || null
              };
            }
          }

          return item;
        }));

        order.items = itemsWithEnhancements;
      }

      // If includeBadges=true and order has a customer, fetch customer badges
      if (includeBadges && order.customer && order.customer.id) {
        const badges = await storage.getCustomerBadges(order.customer.id);
        order.customer = { ...order.customer, badges };
      }

      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  // Order Badge endpoints
  app.post('/api/orders/:id/badges/refresh', async (req, res) => {
    try {
      await storage.refreshOrderBadges(req.params.id);
      res.json({ success: true, message: 'Badges refreshed' });
    } catch (error) {
      console.error("Error refreshing order badges:", error);
      res.status(500).json({ error: 'Failed to refresh badges' });
    }
  });

  app.post('/api/orders', async (req: any, res) => {
    try {
      const { items, selectedDocumentIds, ...orderData } = req.body;

      // Load order settings FIRST (before any processing)
      const orderSettings = await getSettingsByCategory('order');

      // Validation 1: Require Customer Email
      if (orderSettings.requireCustomerEmail) {
        if (!orderData.customerEmail || !orderData.customerEmail.trim()) {
          return res.status(400).json({ error: 'Customer email is required' });
        }
      }

      // Validation 4: Require Shipping Address
      if (orderSettings.requireShippingAddress) {
        if (!orderData.shippingAddressId && !orderData.shippingAddress) {
          return res.status(400).json({ error: 'Shipping address is required' });
        }
      }

      // Validation 5: Require Phone Number
      if (orderSettings.requirePhoneNumber) {
        if (!orderData.customerPhone || !orderData.customerPhone.trim()) {
          return res.status(400).json({ error: 'Customer phone number is required' });
        }
      }

      // Get orderType from request body, default to 'ord'
      const orderType = orderData.orderType || 'ord';

      // Generate order ID with the specified order type
      const orderId = await storage.generateOrderId(orderType);

      // Process selectedDocumentIds and merge into includedDocuments
      let finalOrderData = { ...orderData };
      if (selectedDocumentIds !== undefined) {
        const currentIncludedDocs = orderData.includedDocuments || {};
        finalOrderData.includedDocuments = {
          ...currentIncludedDocs,
          fileIds: selectedDocumentIds || [],
          uploadedFiles: currentIncludedDocs.uploadedFiles || []
        };
        console.log('Merged selectedDocumentIds into includedDocuments:', finalOrderData.includedDocuments);
      }

      const data = insertOrderSchema.parse({
        ...finalOrderData,
        orderId,
        orderType,
        billerId: req.user?.id || null,
      });

      // Validation 2: Block Duplicate Orders
      if (orderSettings.blockDuplicateOrdersHours && orderSettings.blockDuplicateOrdersHours > 0) {
        const hoursMs = orderSettings.blockDuplicateOrdersHours * 60 * 60 * 1000;
        const cutoffTime = new Date(Date.now() - hoursMs);

        const customerId = data.customerId || null;
        // Normalize email to lowercase for case-insensitive matching
        const normalizedEmail = data.customerEmail?.trim().toLowerCase() || null;
        const normalizedPhone = normalizePhone(data.customerPhone);

        let recentOrders = [];

        if (customerId) {
          // Registered user: check by customer_id only
          recentOrders = await db
            .select({ id: orders.id })
            .from(orders)
            .where(
              and(
                sql`created_at > ${cutoffTime}`,
                eq(orders.customerId, customerId)
              )
            )
            .limit(1);
        } else {
          // Guest order: check BOTH email AND phone (not mutually exclusive!)
          const guestConditions = [];

          if (normalizedEmail) {
            // Use LOWER() in SQL for case-insensitive comparison
            guestConditions.push(sql`LOWER(TRIM(customer_email)) = ${normalizedEmail}`);
          }

          if (normalizedPhone) {
            guestConditions.push(sql`REGEXP_REPLACE(customer_phone, '[^0-9+]', '', 'g') = ${normalizedPhone}`);
          }

          // Only run query if we have at least one guest identifier
          if (guestConditions.length > 0) {
            recentOrders = await db
              .select({ id: orders.id })
              .from(orders)
              .where(
                and(
                  sql`created_at > ${cutoffTime}`,
                  sql`customer_id IS NULL`,
                  or(...guestConditions)
                )
              )
              .limit(1);
          }
        }

        if (recentOrders.length > 0) {
          return res.status(400).json({ 
            error: `Duplicate order detected. Please wait ${orderSettings.blockDuplicateOrdersHours} hours before placing another order.` 
          });
        }
      }

      // Validation 3: Minimum Order Value (Bug Fix 1: Validate AFTER schema parsing for proper number handling)
      if (orderSettings.minimumOrderValue && orderSettings.minimumOrderValue > 0) {
        const grandTotal = parseFloat(data.grandTotal || '0');
        if (grandTotal < orderSettings.minimumOrderValue) {
          return res.status(400).json({ 
            error: `Order total ${grandTotal} is below minimum order value of ${orderSettings.minimumOrderValue}` 
          });
        }
      }

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
            serviceId: item.serviceId,
            bundleId: item.bundleId || null,
            variantId: item.variantId || null,
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
            image: item.image || null,
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
      const { items, selectedDocumentIds, ...orderUpdates } = req.body;

      const updates = { ...orderUpdates };

      // Process selectedDocumentIds - save to dedicated column
      if (selectedDocumentIds !== undefined) {
        // Save to the selectedDocumentIds column directly
        updates.selectedDocumentIds = selectedDocumentIds || [];
        console.log('✅ Saving selectedDocumentIds to database:', updates.selectedDocumentIds);
      }

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
            serviceId: item.serviceId || null,
            bundleId: item.bundleId || null,
            variantId: item.variantId || null,
            variantName: item.variantName || null,
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
            landingCost: item.landingCost ? String(item.landingCost) : null,
            notes: item.notes || null,
            image: item.image || null,
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
      // Extract the amount from the currency-specific field or use the generic amount field
      const amountFields = ['amountCzk', 'amountEur', 'amountUsd', 'amountVnd', 'amountCny'];
      let amount = req.body.amount || 0;
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

  // Ticket endpoints
  app.get('/api/tickets', async (req, res) => {
    try {
      const { orderId, customerId } = req.query;
      let tickets = await storage.getTickets();

      // Filter by orderId if provided
      if (orderId && typeof orderId === 'string') {
        tickets = tickets.filter(ticket => ticket.orderId === orderId);
      }

      // Filter by customerId if provided
      if (customerId && typeof customerId === 'string') {
        tickets = tickets.filter(ticket => ticket.customerId === customerId);
      }

      res.json(tickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  app.get('/api/tickets/:id', async (req, res) => {
    try {
      const ticket = await storage.getTicketById(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      res.json(ticket);
    } catch (error) {
      console.error("Error fetching ticket:", error);
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });

  app.post('/api/tickets', async (req: any, res) => {
    try {
      // Generate ticket ID (e.g., TKT-20241018-ABC123)
      const date = new Date();
      const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const ticketId = `TKT-${dateStr}-${randomSuffix}`;

      // Convert dueDate string to Date object if present
      let dueDate = null;
      if (req.body.dueDate && req.body.dueDate !== 'null' && req.body.dueDate !== '') {
        dueDate = new Date(req.body.dueDate);
      }

      // Remove dueDate from req.body to avoid overwriting
      const { dueDate: _, ...restBody } = req.body;

      // Convert empty strings to null for foreign key fields
      const cleanBody = {
        ...restBody,
        customerId: restBody.customerId?.trim() || null,
        orderId: restBody.orderId?.trim() || null,
        title: restBody.title?.trim() || null,
        description: restBody.description?.trim() || null,
      };

      const bodyWithDefaults = {
        ...cleanBody,
        ticketId,
        createdBy: req.user?.id || "test-user",
        category: req.body.category || 'general',
        dueDate
      };

      const data = insertTicketSchema.parse(bodyWithDefaults);
      const ticket = await storage.createTicket(data);

      await storage.createUserActivity({
        userId: req.user?.id || "test-user",
        action: 'create',
        entityType: 'ticket',
        entityId: ticket.id,
        description: `Created ticket: ${ticket.title}`,
      });

      res.status(201).json(ticket);
    } catch (error) {
      console.error("Error creating ticket:", error);
      res.status(500).json({ message: "Failed to create ticket" });
    }
  });

  app.post('/api/tickets/generate-subject', async (req: any, res) => {
    try {
      const { description } = req.body;

      if (!description || typeof description !== 'string' || description.trim().length < 10) {
        return res.status(400).json({ message: "Description must be at least 10 characters long" });
      }

      // Use DeepSeek API (OpenAI-compatible)
      const deepseek = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: "https://api.deepseek.com",
      });

      const prompt = `Translate the following product category name into Czech (CZ) and Vietnamese (VN).
Return ONLY a valid JSON object with this exact structure:
{
  "nameCz": "Czech translation",
  "nameVn": "Vietnamese translation"
}

Category name: ${description}

Important:
- Keep the translation concise and appropriate for product categories
- Use proper diacritics for both languages
- Return ONLY the JSON, no additional text`;

      const completion = await openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator specializing in product category names. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 150
      });

      const translationText = completion.choices[0]?.message?.content?.trim();
      if (!translationText) {
        throw new Error('No translation received from API');
      }

      // Extract JSON from the response
      const jsonMatch = translationText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid translation format');
      }

      const translations = JSON.parse(jsonMatch[0]);
      res.json(translations);
    } catch (error) {
      console.error('Translation error:', error);
      res.status(500).json({ message: 'Failed to translate category name' });
    }
  });

  app.patch('/api/tickets/:id', async (req: any, res) => {
    try {
      const existingTicket = await storage.getTicketById(req.params.id);
      if (!existingTicket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Convert empty strings to null for foreign key fields
      let updateData = { ...req.body };
      if (updateData.customerId !== undefined) {
        updateData.customerId = updateData.customerId?.trim() || null;
      }
      if (updateData.orderId !== undefined) {
        updateData.orderId = updateData.orderId?.trim() || null;
      }
      if (updateData.title !== undefined) {
        updateData.title = updateData.title?.trim() || null;
      }
      if (updateData.description !== undefined) {
        updateData.description = updateData.description?.trim() || null;
      }

      // Convert dueDate string to Date object if present
      if (updateData.dueDate && updateData.dueDate !== 'null' && updateData.dueDate !== '') {
        updateData.dueDate = new Date(updateData.dueDate);
      } else if (updateData.dueDate === '' || updateData.dueDate === 'null') {
        updateData.dueDate = null;
      }

      // If status is being changed to 'resolved' or 'closed', set resolvedAt
      if ((updateData.status === 'resolved' || updateData.status === 'closed') && !existingTicket.resolvedAt) {
        updateData.resolvedAt = new Date();
      }

      const ticket = await storage.updateTicket(req.params.id, updateData);

      await storage.createUserActivity({
        userId: req.user?.id || "test-user",
        action: 'update',
        entityType: 'ticket',
        entityId: req.params.id,
        description: `Updated ticket: ${ticket.title}`,
      });

      res.json(ticket);
    } catch (error) {
      console.error("Error updating ticket:", error);
      res.status(500).json({ message: "Failed to update ticket" });
    }
  });

  app.delete('/api/tickets/:id', async (req: any, res) => {
    try {
      const ticket = await storage.getTicketById(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      await storage.deleteTicket(req.params.id);

      await storage.createUserActivity({
        userId: req.user?.id || "test-user",
        action: 'delete',
        entityType: 'ticket',
        entityId: req.params.id,
        description: `Deleted ticket: ${ticket.title}`,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting ticket:", error);
      res.status(500).json({ message: "Failed to delete ticket" });
    }
  });

  app.get('/api/tickets/:id/comments', async (req, res) => {
    try {
      const comments = await storage.getTicketComments(req.params.id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching ticket comments:", error);
      res.status(500).json({ message: "Failed to fetch ticket comments" });
    }
  });

  app.post('/api/tickets/:id/comments', async (req: any, res) => {
    try {
      const ticket = await storage.getTicketById(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const commentData = {
        ticketId: req.params.id,
        content: req.body.content,
        isInternal: req.body.isInternal || false,
        createdBy: req.user?.id || "test-user"
      };

      const comment = await storage.addTicketComment(commentData);

      await storage.createUserActivity({
        userId: req.user?.id || "test-user",
        action: 'create',
        entityType: 'ticket_comment',
        entityId: comment.id,
        description: `Added comment to ticket: ${ticket.title}`,
      });

      res.status(201).json(comment);
    } catch (error) {
      console.error("Error adding ticket comment:", error);
      res.status(500).json({ message: "Failed to add ticket comment" });
    }
  });

  // Notifications endpoints
  app.get('/api/notifications', async (req: any, res) => {
    try {
      const userId = req.user?.id || "test-user";
      const status = req.query.status as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      let query = db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);

      // Apply status filter
      if (status === 'unread') {
        query = db
          .select()
          .from(notifications)
          .where(and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          ))
          .orderBy(desc(notifications.createdAt))
          .limit(limit)
          .offset(offset);
      }

      const result = await query;
      res.json(result);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get('/api/notifications/unread-count', async (req: any, res) => {
    try {
      const userId = req.user?.id || "test-user";

      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));

      res.json({ count: result[0]?.count || 0 });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.post('/api/notifications', async (req: any, res) => {
    try {
      const userId = req.user?.id || "test-user";
      const data = insertNotificationSchema.parse({
        ...req.body,
        userId
      });

      const result = await db
        .insert(notifications)
        .values(data)
        .returning();

      res.status(201).json(result[0]);
    } catch (error) {
      console.error("Error creating notification:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create notification" });
    }
  });

  app.patch('/api/notifications/:id/read', async (req: any, res) => {
    try {
      const userId = req.user?.id || "test-user";
      const notificationId = parseInt(req.params.id);

      // Verify notification belongs to user
      const existing = await db
        .select()
        .from(notifications)
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        ))
        .limit(1);

      if (!existing || existing.length === 0) {
        return res.status(404).json({ message: "Notification not found" });
      }

      const result = await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, notificationId))
        .returning();

      res.json(result[0]);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
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

  app.get('/api/services/:id', async (req, res) => {
    try {
      const service = await storage.getServiceById(req.params.id);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }

      const items = await storage.getServiceItems(req.params.id);
      res.json({ ...service, items });
    } catch (error) {
      console.error("Error fetching service:", error);
      res.status(500).json({ message: "Failed to fetch service" });
    }
  });

  app.post('/api/services', async (req: any, res) => {
    try {
      // Validate service data
      const serviceData = insertServiceSchema.parse(req.body.service || req.body);

      // Validate items array
      const items = z.array(insertServiceItemSchema).parse(req.body.items || []);

      // Create service with items in transaction
      const service = await storage.createService(serviceData, items);

      // Fetch items to return complete service
      const serviceItems = await storage.getServiceItems(service.id);

      res.status(201).json({ ...service, items: serviceItems });
    } catch (error) {
      console.error("Error creating service:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create service" });
    }
  });

  app.patch('/api/services/:id', async (req: any, res) => {
    try {
      const service = await storage.getServiceById(req.params.id);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }

      const updates = insertServiceSchema.partial().parse(req.body);
      const updatedService = await storage.updateService(req.params.id, updates);

      if (!updatedService) {
        return res.status(404).json({ message: "Service not found" });
      }

      res.json(updatedService);
    } catch (error) {
      console.error("Error updating service:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update service" });
    }
  });

  app.delete('/api/services/:id', async (req: any, res) => {
    try {
      const service = await storage.getServiceById(req.params.id);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }

      await storage.deleteService(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ message: "Failed to delete service" });
    }
  });

  app.get('/api/services/:id/items', async (req, res) => {
    try {
      const items = await storage.getServiceItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching service items:", error);
      res.status(500).json({ message: "Failed to fetch service items" });
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
      const discounts = await storage.getDiscounts();
      res.json(discounts);
    } catch (error) {
      console.error("Error fetching discounts:", error);
      res.status(500).json({ message: "Failed to fetch discounts" });
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

      const data = insertDiscountSchema.parse(body);
      const discount = await storage.createDiscount(data);

      await storage.createUserActivity({
        userId: "test-user",
        action: 'create',
        entityType: 'discount',
        entityId: discount.id,
        description: `Created discount: ${discount.name}`,
      });

      res.json(discount);
    } catch (error) {
      console.error("Error creating discount:", error);
      res.status(500).json({ message: "Failed to create discount" });
    }
  });

  app.get('/api/discounts/:id', async (req, res) => {
    try {
      const discount = await storage.getDiscount(req.params.id);
      if (!discount) {
        return res.status(404).json({ message: "Discount not found" });
      }
      res.json(discount);
    } catch (error) {
      console.error("Error fetching discount:", error);
      res.status(500).json({ message: "Failed to fetch discount" });
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

      const discount = await storage.updateDiscount(req.params.id, updates);

      if (!discount) {
        return res.status(404).json({ message: "Discount not found" });
      }

      await storage.createUserActivity({
        userId: "test-user",
        action: 'updated',
        entityType: 'discount',
        entityId: discount.id.toString(),
        description: `Updated discount: ${discount.name}`,
      });

      res.json(discount);
    } catch (error) {
      console.error("Error updating discount:", error);
      res.status(500).json({ message: "Failed to update discount" });
    }
  });

  app.delete('/api/discounts/:id', async (req: any, res) => {
    try {
      const discount = await storage.getDiscount(req.params.id);
      if (!discount) {
        return res.status(404).json({ message: "Discount not found" });
      }

      await storage.deleteDiscount(req.params.id);

      await storage.createUserActivity({
        userId: "test-user",
        action: 'deleted',
        entityType: 'discount',
        entityId: req.params.id,
        description: `Deleted discount: ${discount.name}`,
      });

      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting discount:", error);

      // Check if it's a foreign key constraint error
      if (error.code === '23503' || error.message?.includes('constraint')) {
        return res.status(409).json({ 
          message: "Cannot delete discount - it's being used by other records" 
        });
      }

      res.status(500).json({ message: "Failed to delete discount" });
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
      const returnData = await storage.getReturn(req.params.id);
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

  // PPL Shipping API routes
  const { createPPLShipment, getPPLBatchStatus, getPPLLabel } = await import('./services/pplService');

  // Test PPL connection
  app.get('/api/shipping/test-connection', async (req, res) => {
    try {
      const { getPPLAccessToken } = await import('./services/pplService');
      const token = await getPPLAccessToken();
      res.json({ 
        connected: true, 
        provider: 'PPL',
        message: 'Successfully authenticated with PPL API'
      });
    } catch (error) {
      console.error('PPL connection test failed:', error);
      res.status(500).json({ 
        connected: false, 
        provider: 'PPL',
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Create PPL shipping label for order
  app.post('/api/shipping/create-label', async (req, res) => {
    try {
      const { orderId, codAmount, codCurrency } = req.body;

      if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required' });
      }

      // Get order details
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Get shipping address
      let shippingAddress;
      if (order.shippingAddressId) {
        const addresses = await db
          .select()
          .from(customerShippingAddresses)
          .where(eq(customerShippingAddresses.id, order.shippingAddressId))
          .limit(1);
        shippingAddress = addresses[0];
      }

      if (!shippingAddress) {
        return res.status(400).json({ error: 'No shipping address found for order' });
      }

      // Get customer details
      let customer;
      if (order.customerId) {
        const customerResult = await db
          .select()
          .from(customers)
          .where(eq(customers.id, order.customerId))
          .limit(1);
        customer = customerResult[0];
      }

      // Get existing cartons for this order
      const existingCartons = await db
        .select()
        .from(orderCartons)
        .where(eq(orderCartons.orderId, orderId))
        .orderBy(orderCartons.cartonNumber);

      // Normalize country to ISO code (PPL requires 2-letter codes)
      const normalizeCountry = (country: string | null | undefined): string => {
        if (!country) return 'CZ';
        const upper = country.toUpperCase();
        if (upper === 'CZECH REPUBLIC' || upper === 'CZECHIA') return 'CZ';
        if (upper.length === 2) return upper;
        return 'CZ'; // Default to CZ
      };

      // Validate required shipping address fields
      if (!shippingAddress.zipCode?.trim()) {
        return res.status(400).json({ 
          error: 'Missing required shipping address: Postal Code is required for PPL label creation. Please update the order shipping address.' 
        });
      }
      if (!shippingAddress.street?.trim()) {
        return res.status(400).json({ 
          error: 'Missing required shipping address: Street Address is required for PPL label creation. Please update the order shipping address.' 
        });
      }
      if (!shippingAddress.city?.trim()) {
        return res.status(400).json({ 
          error: 'Missing required shipping address: City is required for PPL label creation. Please update the order shipping address.' 
        });
      }

      // Build PPL shipment
      const hasCOD = order.cashOnDeliveryAmount && parseFloat(order.cashOnDeliveryAmount) > 0;
      const pplShipment: any = {
        referenceId: order.orderId,
        productType: hasCOD ? 'BUSD' : 'BUSS',
        sender: {
          country: 'CZ',
          zipCode: '35002',
          name: 'Davie Supply',
          street: 'Dragonska 2545/9A',
          city: 'Cheb',
          phone: '+420776887045',
          email: 'info@daviesupply.cz'
        },
        recipient: {
          country: normalizeCountry(shippingAddress.country),
          zipCode: shippingAddress.zipCode.trim(),
          name: `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim() || customer?.name || 'Unknown',
          street: shippingAddress.street.trim(),
          city: shippingAddress.city.trim(),
          phone: shippingAddress.tel || customer?.phone || undefined,
          email: shippingAddress.email || customer?.email || undefined
        },
        cashOnDelivery: (codAmount && parseFloat(codAmount) > 0) ? {
          value: parseFloat(codAmount),
          currency: codCurrency || 'CZK',
          variableSymbol: order.orderId
        } : undefined
      };

      // Use shipmentSet if multiple cartons exist
      if (existingCartons.length > 1) {
        pplShipment.shipmentSet = {
          numberOfShipments: existingCartons.length,
          shipmentSetItems: existingCartons.map((carton) => ({
            shipmentNumber: `${order.orderId}-${carton.cartonNumber}`
            // Weight removed as per user requirement - PPL doesn't need weight input
          }))
        };
      }
      // Weight removed for single shipment as well - PPL doesn't need weight input

      // Create shipment
      const { batchId } = await createPPLShipment({
        shipments: [pplShipment],
        labelSettings: {
          format: 'Pdf',
          dpi: 203,
          completeLabelSettings: {
            isCompleteLabelRequested: true,
            pageSize: 'Default' // Thermal label format (127x110mm for CZ domestic, 150x100mm for international)
          }
        }
      });

      // Get shipment numbers from batch status
      let shipmentNumbers: string[] = [];
      try {
        const batchStatus = await getPPLBatchStatus(batchId);
        console.log('📦 Batch status response:', JSON.stringify(batchStatus, null, 2));
        if (batchStatus.items && Array.isArray(batchStatus.items)) {
          shipmentNumbers = batchStatus.items
            .filter(item => item.shipmentNumber)
            .map(item => item.shipmentNumber!);
          console.log('✅ Extracted shipment numbers:', shipmentNumbers);
        }
      } catch (statusError) {
        console.log('⚠️ Could not get batch status:', statusError);
        // Continue with empty tracking numbers - will use placeholder
      }

      // Get label PDF
      const label = await getPPLLabel(batchId, 'pdf');

      const labelBase64 = label.labelContent;
      const labelUrl = `data:application/pdf;base64,${labelBase64}`;

      // Update order with PPL info
      await db
        .update(orders)
        .set({
          pplBatchId: batchId,
          pplShipmentNumbers: shipmentNumbers,
          pplLabelData: {
            batchId,
            shipmentNumbers,
            labelUrl,
            createdAt: new Date().toISOString()
          },
          pplStatus: 'created',
          trackingNumber: shipmentNumbers[0] || null,
          codAmount: codAmount ? codAmount.toString() : null,
          codCurrency: codCurrency || null
        })
        .where(eq(orders.id, orderId));

      // Save shipment label to shipment_labels table
      await storage.createShipmentLabel({
        orderId,
        carrier: 'PPL',
        trackingNumbers: shipmentNumbers,
        batchId,
        labelBase64,
        labelData: {
          pplShipment,
          batchStatus,
          codAmount: codAmount ? parseFloat(codAmount) : undefined,
          codCurrency: codCurrency || undefined
        },
        shipmentCount: shipmentNumbers.length,
        status: 'active'
      });

      res.json({
        success: true,
        batchId,
        shipmentNumbers,
        labelPdf: label.labelContent,
        trackingNumber: shipmentNumbers[0]
      });
    } catch (error) {
      console.error('Failed to create PPL label:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to create PPL label' 
      });
    }
  });

  // Get PPL batch status
  app.get('/api/shipping/ppl/batch/:batchId', async (req, res) => {
    try {
      const { batchId } = req.params;
      const status = await getPPLBatchStatus(batchId);
      res.json(status);
    } catch (error) {
      console.error('Failed to get PPL batch status:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get batch status' 
      });
    }
  });

  // Create additional PPL shipment for an order (for multiple packages)
  app.post('/api/shipping/create-additional-label/:orderId', async (req, res) => {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required' });
      }

      // Get order details
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Load shipping settings (includes all sender addresses, properly parsed)
      const shippingSettings = await getSettingsByCategory('shipping');
      const senderAddress = shippingSettings.pplDefaultSenderAddress;

      // Validate that sender address exists
      if (!senderAddress) {
        return res.status(400).json({ 
          error: 'No default PPL sender address configured. Please set it in Shipping Management settings.' 
        });
      }

      // Validate required fields
      const requiredSenderFields = ['country', 'zipCode', 'city', 'street', 'name'];
      const missingSenderFields = requiredSenderFields.filter(field => !senderAddress[field]);

      if (missingSenderFields.length > 0) {
        return res.status(400).json({ 
          error: `Default sender address is incomplete. Missing: ${missingSenderFields.join(', ')}` 
        });
      }

      // Calculate next carton number
      const existingCartons = await db
        .select()
        .from(orderCartons)
        .where(eq(orderCartons.orderId, orderId));

      const nextCartonNumber = existingCartons.length > 0
        ? Math.max(...existingCartons.map(c => c.cartonNumber || 0)) + 1
        : 1;

      // STEP 1: Create carton FIRST (before creating PPL label)
      const [newCarton] = await db
        .insert(orderCartons)
        .values({
          orderId,
          cartonNumber: nextCartonNumber,
          cartonType: 'non-company',
          source: 'manual_ppl_shipment',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      if (!newCarton) {
        throw new Error('Failed to create carton');
      }

      // STEP 2: Now create PPL label (with rollback on failure)
      try {
        // Get shipping address
        let shippingAddress;
        if (order.shippingAddressId) {
          const addresses = await db
            .select()
            .from(customerShippingAddresses)
            .where(eq(customerShippingAddresses.id, order.shippingAddressId))
            .limit(1);
          shippingAddress = addresses[0];
        }

        if (!shippingAddress) {
          // Rollback carton creation
          await db.delete(orderCartons).where(eq(orderCartons.id, newCarton.id));
          return res.status(400).json({ error: 'No shipping address found for order' });
        }

        // Get customer details
        let customer;
        if (order.customerId) {
          const customerResult = await db
            .select()
            .from(customers)
            .where(eq(customers.id, order.customerId))
            .limit(1);
          customer = customerResult[0];
        }

        // Build PPL shipment with unique reference using shipmentSet structure
        // NOTE: PPL batches are immutable - we cannot add to existing batch, so we create a NEW batch
        const referenceId = `${order.orderId}-additional-${nextCartonNumber}`;

        // Normalize country to ISO code (PPL requires 2-letter codes)
        const normalizeCountry = (country: string | null | undefined): string => {
          if (!country) return 'CZ';
          const upper = country.toUpperCase();
          if (upper === 'CZECH REPUBLIC' || upper === 'CZECHIA') return 'CZ';
          if (upper.length === 2) return upper;
          return 'CZ'; // Default to CZ
        };

        // Validate required shipping address fields
        if (!shippingAddress.zipCode?.trim()) {
          // Rollback carton creation
          await db.delete(orderCartons).where(eq(orderCartons.id, newCarton.id));
          return res.status(400).json({ 
            error: 'Missing required shipping address: Postal Code is required for PPL label creation. Please update the order shipping address.' 
          });
        }
        if (!shippingAddress.street?.trim()) {
          // Rollback carton creation
          await db.delete(orderCartons).where(eq(orderCartons.id, newCarton.id));
          return res.status(400).json({ 
            error: 'Missing required shipping address: Street Address is required for PPL label creation. Please update the order shipping address.' 
          });
        }
        if (!shippingAddress.city?.trim()) {
          // Rollback carton creation
          await db.delete(orderCartons).where(eq(orderCartons.id, newCarton.id));
          return res.status(400).json({ 
            error: 'Missing required shipping address: City is required for PPL label creation. Please update the order shipping address.' 
          });
        }

        const hasCOD = order.cashOnDeliveryAmount && parseFloat(order.cashOnDeliveryAmount) > 0;

        // Prepare recipient info (customer receiving the package)
        const recipientName = shippingAddress.company?.trim() || 
                             `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim() || 
                             customer?.name || 
                             'Unknown';

        const recipientContactName = shippingAddress.company?.trim() 
          ? `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim() 
          : undefined;

        const recipientStreet = shippingAddress.streetNumber 
          ? `${shippingAddress.street.trim()} ${shippingAddress.streetNumber.trim()}`
          : shippingAddress.street.trim();

        const pplShipment: any = {
          referenceId,
          productType: hasCOD ? 'BUSD' : 'BUSS',
          sender: {
            country: normalizeCountry(senderAddress.country),
            zipCode: senderAddress.zipCode.replace(/\s+/g, ''),
            name: senderAddress.name,
            name2: senderAddress.name2 || undefined,
            street: senderAddress.street,
            city: senderAddress.city,
            phone: senderAddress.phone || undefined,
            email: senderAddress.email || undefined
          },
          recipient: {
            country: normalizeCountry(shippingAddress.country),
            zipCode: shippingAddress.zipCode.trim(),
            name: recipientName,
            name2: recipientContactName,
            street: recipientStreet,
            city: shippingAddress.city.trim(),
            phone: shippingAddress.tel || customer?.phone || undefined,
            email: shippingAddress.email || customer?.email || undefined
          },
          // COD applied only to the first carton (handled by createPPLShipment logic)
          cashOnDelivery: undefined
        };

        // Create NEW shipment (new batch)
        const { batchId } = await createPPLShipment({
          shipments: [pplShipment],
          labelSettings: {
            format: 'Pdf',
            dpi: 203,
            completeLabelSettings: {
              isCompleteLabelRequested: true,
              pageSize: 'Default'
            }
          }
        });

        // Get shipment numbers from batch status (with fallback if API fails)
        let shipmentNumbers: string[] = [];
        try {
          const batchStatus = await getPPLBatchStatus(batchId);
          console.log('📦 Batch status response:', JSON.stringify(batchStatus, null, 2));
          if (batchStatus.items && Array.isArray(batchStatus.items)) {
            shipmentNumbers = batchStatus.items
              .filter(item => item.shipmentNumber)
              .map(item => item.shipmentNumber!);
            console.log('✅ Extracted shipment numbers:', shipmentNumbers);
          }
        } catch (statusError) {
          console.log('⚠️ Could not get batch status:', statusError);
          // Continue with empty tracking numbers - will use placeholder
        }

        // Get label PDF
        const label = await getPPLLabel(batchId, 'pdf');

        const labelBase64 = label.labelContent;

        // Save shipment label to shipment_labels table
        const savedLabel = await storage.createShipmentLabel({
          orderId,
          carrier: 'PPL',
          trackingNumbers: shipmentNumbers,
          batchId,
          labelBase64,
          labelData: {
            pplShipment,
            cartonNumber: nextCartonNumber,
            referenceId
          },
          shipmentCount: shipmentNumbers.length,
          status: 'active'
        });

        res.json({
          success: true,
          carton: newCarton,
          label: savedLabel,
          batchId,
          shipmentNumbers,
          trackingNumber: shipmentNumbers[0]
        });
      } catch (labelError) {
        // If PPL label creation fails, rollback the carton
        console.error('PPL label creation failed, rolling back carton:', labelError);
        await db.delete(orderCartons).where(eq(orderCartons.id, newCarton.id));
        throw labelError;
      }
    } catch (error) {
      console.error('Failed to create additional PPL label:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to create additional PPL label' 
      });
    }
  });

  // Shipment Labels Routes

  // Get all shipment labels
  app.get('/api/shipment-labels', async (req, res) => {
    try {
      const labels = await storage.getShipmentLabels();
      res.json(labels);
    } catch (error) {
      console.error('Error fetching shipment labels:', error);
      res.status(500).json({ message: 'Failed to fetch shipment labels' });
    }
  });

  // Get shipment labels by order ID
  app.get('/api/shipment-labels/order/:orderId', async (req, res) => {
    try {
      const { orderId } = req.params;
      const labels = await storage.getShipmentLabelsByOrderId(orderId);
      res.json(labels);
    } catch (error) {
      console.error('Error fetching shipment labels by order ID:', error);
      res.status(500).json({ message: 'Failed to fetch shipment labels' });
    }
  });

  // Delete a shipment label (PPL Cancel API)
  app.delete('/api/shipment-labels/:labelId', async (req, res) => {
    try {
      const { labelId } = req.params;

      // Get the label first to get tracking numbers
      const label = await storage.getShipmentLabel(labelId);
      if (!label) {
        return res.status(404).json({ error: 'Shipment label not found' });
      }

      // For PPL labels, try to cancel with PPL API
      if (label.carrier === 'PPL' && label.trackingNumbers?.[0]) {
        try {
          const { cancelPPLShipment } = await import('./services/pplService');
          await cancelPPLShipment(label.trackingNumbers[0]);
          console.log('PPL shipment cancelled:', label.trackingNumbers[0]);
        } catch (pplError) {
          console.error('PPL cancellation failed (may already be processed):', pplError);
          // Continue with deletion even if PPL cancellation fails
        }
      }

      // Cancel the label in our database
      await storage.cancelShipmentLabel(labelId, 'User requested cancellation');

      // Note: We do NOT delete the carton - only the label is removed
      // This allows regenerating labels without losing carton data (weight, dimensions, etc.)
      console.log(`✅ Label ${labelId} cancelled - carton data preserved`);

      res.json({ success: true, message: 'Shipment label cancelled successfully' });
    } catch (error) {
      console.error('Error deleting shipment label:', error);
      res.status(500).json({ error: 'Failed to delete shipment label' });
    }
  });

  // Get single shipment label
  app.get('/api/shipment-labels/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const label = await storage.getShipmentLabel(id);
      if (!label) {
        return res.status(404).json({ message: 'Shipment label not found' });
      }
      res.json(label);
    } catch (error) {
      console.error('Error fetching shipment label:', error);
      res.status(500).json({ message: 'Failed to fetch shipment label' });
    }
  });

  // Create new shipment label
  app.post('/api/shipment-labels', async (req, res) => {
    try {
      const label = await storage.createShipmentLabel(req.body);
      res.json(label);
    } catch (error) {
      console.error('Error creating shipment label:', error);
      res.status(500).json({ message: 'Failed to create shipment label' });
    }
  });

  // Update shipment label tracking numbers
  app.patch('/api/shipment-labels/:labelId/tracking', async (req, res) => {
    try {
      const { labelId } = req.params;
      const { trackingNumbers } = req.body;

      // Validate tracking numbers
      if (!trackingNumbers || !Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
        return res.status(400).json({ error: 'Tracking numbers must be a non-empty array' });
      }

      // Validate each tracking number is a non-empty string
      const hasInvalidNumbers = trackingNumbers.some(num => 
        typeof num !== 'string' || num.trim().length === 0
      );
      if (hasInvalidNumbers) {
        return res.status(400).json({ error: 'All tracking numbers must be non-empty strings' });
      }

      // Get the existing label
      const existingLabel = await storage.getShipmentLabel(labelId);
      if (!existingLabel) {
        return res.status(404).json({ error: 'Shipment label not found' });
      }

      // Trim all tracking numbers
      const trimmedNumbers = trackingNumbers.map(num => num.trim());

      // Update just the tracking numbers
      const updatedLabel = await storage.updateShipmentLabel(labelId, {
        trackingNumbers: trimmedNumbers
      });

      console.log(`✅ Updated tracking numbers for label ${labelId}:`, trimmedNumbers);

      res.json(updatedLabel);
    } catch (error) {
      console.error('Error updating shipment label tracking numbers:', error);
      res.status(500).json({ error: 'Failed to update tracking numbers' });
    }
  });

  // Update shipment label
  app.patch('/api/shipment-labels/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const label = await storage.updateShipmentLabel(id, req.body);
      if (!label) {
        return res.status(404).json({ message: 'Shipment label not found' });
      }
      res.json(label);
    } catch (error) {
      console.error('Error updating shipment label:', error);
      res.status(500).json({ message: 'Failed to update shipment label' });
    }
  });

  // Update tracking number for a shipment label
  app.patch('/api/shipment-labels/:id/tracking', async (req, res) => {
    try {
      const { id } = req.params;
      const { trackingNumber } = req.body;

      if (!trackingNumber || typeof trackingNumber !== 'string' || trackingNumber.trim() === '') {
        return res.status(400).json({ error: 'Valid tracking number is required' });
      }

      // Get existing label
      const existingLabel = await storage.getShipmentLabel(id);
      if (!existingLabel) {
        return res.status(404).json({ error: 'Shipment label not found' });
      }

      // Update tracking numbers array - replace the first tracking number
      const updatedTrackingNumbers = [trackingNumber.trim()];

      // Update the label
      const label = await storage.updateShipmentLabel(id, {
        trackingNumbers: updatedTrackingNumbers as any
      });

      if (!label) {
        return res.status(500).json({ error: 'Failed to update tracking number' });
      }

      console.log(`✅ Updated tracking number for label ${id}: ${trackingNumber}`);
      res.json({ 
        success: true, 
        label,
        message: 'Tracking number updated successfully'
      });
    } catch (error) {
      console.error('Error updating tracking number:', error);
      res.status(500).json({ error: 'Failed to update tracking number' });
    }
  });

  // Cancel shipment label
  app.post('/api/shipment-labels/:id/cancel', async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      // Check if label exists
      const existingLabel = await storage.getShipmentLabel(id);
      if (!existingLabel) {
        return res.status(404).json({ message: 'Shipment label not found' });
      }

      // Check if already cancelled
      if (existingLabel.status === 'cancelled') {
        return res.status(400).json({ message: 'Shipment label is already cancelled' });
      }

      // Cancel the label
      const label = await storage.cancelShipmentLabel(id, reason || 'Cancelled by user');
      if (!label) {
        return res.status(500).json({ message: 'Failed to update shipment label status' });
      }

      res.json(label);
    } catch (error) {
      console.error('Error cancelling shipment label:', error);
      res.status(500).json({ message: 'Failed to cancel shipment label' });
    }
  });

  // Get PPL label
  app.get('/api/shipping/ppl/label/:batchId', async (req, res) => {
    try {
      const { batchId } = req.params;
      const format = (req.query.format as 'pdf' | 'zpl') || 'pdf';
      const label = await getPPLLabel(batchId, format);

      if (format === 'pdf') {
        const pdfBuffer = Buffer.from(label.labelContent, 'base64');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="label-${batchId}.pdf"`);
        res.send(pdfBuffer);
      } else {
        res.json(label);
      }
    } catch (error) {
      console.error('Failed to get PPL label:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get label' 
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
      const cartons = await weightCalculationService.getAvailableCartons();
      res.json(cartons);
    } catch (error) {
      console.error('Error getting available cartons:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get available cartons' 
      });
    }
  });

  // Get popular cartons sorted by usage
  app.get('/api/cartons/popular', async (req, res) => {
    try {
      const cartons = await storage.getPopularCartons();

      const cartonsWithScore = cartons.map((carton) => {
        const usageCount = Number(carton.usageCount) || 0;
        const lastUsedAt = carton.lastUsedAt ? new Date(carton.lastUsedAt) : null;

        let daysSinceLastUsed = 0;
        if (lastUsedAt) {
          const now = new Date();
          daysSinceLastUsed = Math.floor((now.getTime() - lastUsedAt.getTime()) / (1000 * 60 * 60 * 24));
        }

        const score = usageCount * 1000 - daysSinceLastUsed;

        return {
          id: carton.id,
          name: carton.name,
          innerLengthCm: carton.innerLengthCm,
          innerWidthCm: carton.innerWidthCm,
          innerHeightCm: carton.innerHeightCm,
          maxWeightKg: carton.maxWeightKg,
          usageCount: carton.usageCount,
          lastUsedAt: carton.lastUsedAt,
          score
        };
      });

      cartonsWithScore.sort((a, b) => b.score - a.score);

      res.json(cartonsWithScore);
    } catch (error) {
      console.error('Error getting popular cartons:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get popular cartons' 
      });
    }
  });

  // Increment carton usage count
  app.post('/api/cartons/:cartonId/increment-usage', async (req, res) => {
    try {
      const { cartonId } = req.params;
      await storage.incrementCartonUsage(cartonId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error incrementing carton usage:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to increment carton usage' 
      });
    }
  });

  // Multi-Carton Packing Routes

  // Get all cartons for an order
  app.get('/api/orders/:orderId/cartons', async (req, res) => {
    try {
      const { orderId } = req.params;
      const cartons = await storage.getOrderCartons(orderId);
      res.json(cartons);
    } catch (error) {
      console.error('Error getting order cartons:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get order cartons' 
      });
    }
  });

  // Create a new carton for an order
  app.post('/api/orders/:orderId/cartons', async (req, res) => {
    try {
      const { orderId } = req.params;
      const cartonData = insertOrderCartonSchema.parse({
        ...req.body,
        orderId
      });

      const carton = await storage.createOrderCarton(cartonData);
      res.json(carton);
    } catch (error) {
      console.error('Error creating order carton:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to create order carton' 
      });
    }
  });

  // Update a carton
  app.patch('/api/orders/:orderId/cartons/:cartonId', async (req, res) => {
    try {
      const { cartonId } = req.params;
      const updatedCarton = await storage.updateOrderCarton(cartonId, req.body);

      if (!updatedCarton) {
        return res.status(404).json({ error: 'Carton not found' });
      }

      res.json(updatedCarton);
    } catch (error) {
      console.error('Error updating order carton:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to update order carton' 
      });
    }
  });

  // Delete a carton
  app.delete('/api/orders/:orderId/cartons/:cartonId', async (req, res) => {
    try {
      const { cartonId } = req.params;
      const success = await storage.deleteOrderCarton(cartonId);

      if (!success) {
        return res.status(404).json({ error: 'Carton not found' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting order carton:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to delete order carton' 
      });
    }
  });

  // Generate shipping label for a specific carton
  app.post('/api/orders/:orderId/cartons/:cartonId/generate-label', async (req, res) => {
    try {
      const { orderId, cartonId } = req.params;

      // Get order and carton details
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const cartons = await storage.getOrderCartons(orderId);
      const carton = cartons.find(c => c.id === cartonId);
      if (!carton) {
        return res.status(404).json({ error: 'Carton not found' });
      }

      // Mock label generation - in production, integrate with shipping provider
      const labelUrl = `https://example.com/labels/${orderId}-${cartonId}.pdf`;
      const trackingNumber = `TRK-${Date.now()}-${cartonId.slice(-6)}`;

      // Update carton with label info
      const updatedCarton = await storage.updateOrderCarton(cartonId, {
        labelUrl,
        trackingNumber,
        labelPrinted: true
      });

      res.json({
        success: true,
        labelUrl,
        trackingNumber,
        carton: updatedCarton
      });
    } catch (error) {
      console.error('Error generating label for carton:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to generate label for carton' 
      });
    }
  });

  // PPL Shipping Label API endpoints

  // Create PPL shipping labels for an order
  app.post('/api/orders/:orderId/ppl/create-labels', async (req, res) => {
    try {
      const { orderId } = req.params;
      const { createPPLShipment, getPPLBatchStatus, getPPLLabel } = await import('./services/pplService');

      // Get order details
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Load shipping settings (includes all sender addresses, properly parsed)
      const shippingSettings = await getSettingsByCategory('shipping');
      const senderAddress = shippingSettings.pplDefaultSenderAddress;

      // Validate that sender address exists
      if (!senderAddress) {
        return res.status(400).json({ 
          error: 'No default PPL sender address configured. Please set it in Shipping Management settings.' 
        });
      }

      // Validate required fields
      const requiredFields = ['country', 'zipCode', 'city', 'street', 'name'];
      const missingFields = requiredFields.filter(field => !senderAddress[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({ 
          error: `Default sender address is incomplete. Missing: ${missingFields.join(', ')}` 
        });
      }

      // Get cartons for the order
      const cartons = await storage.getOrderCartons(orderId);
      if (cartons.length === 0) {
        return res.status(400).json({ error: 'No cartons found for this order. Please create cartons before generating PPL labels.' });
      }

      // Get order shipping address (customer/recipient)
      let shippingAddress;
      if (order.shippingAddressId) {
        const addresses = await db
          .select()
          .from(customerShippingAddresses)
          .where(eq(customerShippingAddresses.id, order.shippingAddressId))
          .limit(1);
        shippingAddress = addresses[0];
      }

      if (!shippingAddress) {
        return res.status(400).json({ error: 'No shipping address found for order' });
      }

      // Get customer details for fallback info
      let customer;
      if (order.customerId) {
        const customerResult = await db
          .select()
          .from(customers)
          .where(eq(customers.id, order.customerId))
          .limit(1);
        customer = customerResult[0];
      }

      // Build PPL shipment
      const referenceId = order.orderId;
      // Map country name to ISO 2-letter code
      const getCountryCode = (country: string): string => {
        const countryUpper = country.toUpperCase();
        if (countryUpper === 'CZECH REPUBLIC' || countryUpper === 'CZECHIA' || countryUpper === 'CZ') return 'CZ';
        if (countryUpper === 'SLOVAKIA' || countryUpper === 'SK') return 'SK';
        if (countryUpper === 'GERMANY' || countryUpper === 'DE') return 'DE';
        if (countryUpper === 'AUSTRIA' || countryUpper === 'AT') return 'AT';
        if (countryUpper === 'POLAND' || countryUpper === 'PL') return 'PL';
        if (countryUpper === 'HUNGARY' || countryUpper === 'HU') return 'HU';
        // If it's already a 2-letter code, return it
        if (countryUpper.length === 2) return countryUpper;
        return 'CZ'; // Default to CZ
      };

      // CRITICAL PPL API RESTRICTION: "nelze slučovat zásilky s dobírkou"
      // Translation: "cannot merge shipments with dobírka (cash on delivery)"
      // 
      // For multi-carton orders with COD:
      // - FIRST carton MUST have the full dobírka amount (customer pays ONCE)
      // - REMAINING cartons MUST NOT have dobírka
      // - Always verify dobírka amount exists and is valid before applying
      //
      // Extract numeric part from order ID for variable symbol (max 10 digits)
      const numericOrderId = order.orderId.replace(/\D/g, '').slice(0, 10);

      // Strict validation: Verify COD amount exists and is a valid positive number
      const codAmount = order.codAmount;
      const hasCOD = codAmount && !isNaN(parseFloat(codAmount)) && parseFloat(codAmount) > 0;

      // Use sender address from settings (warehouse/company)
      const sender = {
        country: getCountryCode(senderAddress.country),
        zipCode: senderAddress.zipCode.replace(/\s+/g, ''),
        name: senderAddress.name?.trim() || 'Unknown',
        name2: senderAddress.name2?.trim() || undefined,
        street: senderAddress.street?.trim() || '',
        city: senderAddress.city.trim(),
        phone: senderAddress.phone || senderAddress.contact || undefined,
        email: senderAddress.email || undefined
      };

      // Determine product type based on destination country and COD status
      // Valid PPL product codes:
      // BUSD = Business Delivery with Cash on Delivery (Czech domestic)
      // BUSS = Business Standard (Czech domestic, no COD)
      // COND = Connect Delivery with CoD (International)
      const recipientCountryCode = getCountryCode(shippingAddress.country || 'CZ');
      let productType: string;

      if (recipientCountryCode === 'CZ') {
        // Czech domestic shipment
        productType = hasCOD ? 'BUSD' : 'BUSS';
      } else {
        // International shipment
        productType = hasCOD ? 'COND' : 'BUSS';
      }

      // Prepare PPL shipment data
      // For multi-carton orders, we use shipmentSet to create ONE shipment with multiple cartons
      // This ensures labels show "1/2", "2/2" instead of separate "1/1", "1/1" shipments
      const shipments: any[] = [];

      if (cartons.length > 1) {
        // Multi-carton order: Create ONE SHIPMENT with shipmentSet
        // Each carton becomes an item in the set, labeled as 1/N, 2/N, etc.
        console.log(`📦 Creating shipment SET with ${cartons.length} cartons`);

        // PPL API RESTRICTION for COD in shipmentSet:
        // When using shipmentSet, ONLY the main shipment can have COD
        // Individual items in the set cannot have separate COD values

        // Validate COD amount if present
        let cashOnDelivery = undefined;
        if (hasCOD) {
          const codValue = parseFloat(order.codAmount);
          if (isNaN(codValue) || codValue <= 0) {
            throw new Error(`Invalid COD amount: ${order.codAmount}`);
          }
          cashOnDelivery = {
            CodPrice: codValue,                           // PPL API requires PascalCase
            CodCurrency: order.codCurrency || 'CZK',  // PPL API requires PascalCase
            CodVarSym: numericOrderId || '1234567890'     // PPL API requires PascalCase
          };
          console.log(`💰 Shipment SET WITH COD: ${codValue} ${order.codCurrency || 'CZK'} (applied to entire set)`);
        } else {
          console.log(`📦 Shipment SET: Standard shipment (no COD)`);
        }

        // Create ONE shipment with shipmentSet structure
        const shipment: any = {
          referenceId,
          productType,
          sender,
          recipient: {
            country: recipientCountryCode,
            zipCode: shippingAddress.zipCode.trim(),
            name: recipientName,
            name2: contactName,
            street: shippingAddress.street,
            city: shippingAddress.city,
            phone: shippingAddress.tel || customer?.phone || undefined,
            email: shippingAddress.email || customer?.email || undefined
          },
          // COD applied to the entire shipment set (if present)
          cashOnDelivery,
          externalNumbers: [
            {
              code: 'CUST',
              externalNumber: order.orderId
            }
          ],
          // shipmentSet defines multiple cartons in ONE shipment
          shipmentSet: {
            numberOfShipments: cartons.length,
            shipmentSetItems: cartons.map((carton) => ({
              referenceId: `${order.orderId}-${carton.cartonNumber}`
              // Weight removed as per user requirement - PPL doesn't need weight input
            }))
          }
        };

        shipments.push(shipment);
        console.log(`✓ Created shipment SET:`, JSON.stringify(shipment.shipmentSet, null, 2));
      } else if (cartons.length === 1) {
        // Single carton - simpler structure with COD if present
        console.log(`📦 Creating single PPL shipment`);

        // Validate COD amount before creating cashOnDelivery object
        let cashOnDelivery = undefined;
        if (hasCOD) {
          const codValue = parseFloat(order.codAmount);
          if (isNaN(codValue) || codValue <= 0) {
            throw new Error(`Invalid COD amount: ${order.codAmount}`);
          }
          cashOnDelivery = {
            CodPrice: codValue,                           // PPL API requires PascalCase
            CodCurrency: order.codCurrency || 'CZK',  // PPL API requires PascalCase
            CodVarSym: numericOrderId || '1234567890'     // PPL API requires PascalCase
          };
          console.log(`💰 Single carton WITH COD: ${codValue} ${order.codCurrency || 'CZK'}`);
        } else {
          console.log(`📦 Single carton: Standard shipment (no COD)`);
        }

        const singleShipment: any = {
          referenceId,
          productType,
          sender,
          recipient: {
            country: recipientCountryCode,
            zipCode: shippingAddress.zipCode.trim(),
            name: recipientName,
            name2: contactName,
            street: shippingAddress.street,
            city: shippingAddress.city,
            phone: shippingAddress.tel || customer?.phone || undefined,
            email: shippingAddress.email || customer?.email || undefined
          },
          cashOnDelivery,
          externalNumbers: [
            {
              code: 'CUST',
              externalNumber: order.orderId
            }
          ]
        };

        // Weight removed as per user requirement - PPL doesn't need weight input

        shipments.push(singleShipment);
      }

      // 🔄 NEW APPROACH: Create batch and extract tracking numbers from response
      console.log('🚀 Creating PPL batch...');
      const batchResult = await createPPLShipment({
        shipments,
        labelSettings: {
          format: 'Pdf',
          dpi: 203,
          completeLabelSettings: {
            isCompleteLabelRequested: true,
            pageSize: 'Default'
          }
        }
      });

      const batchId = batchResult.batchId;
      console.log(`✅ PPL batch created: ${batchId}`);

      // Get shipment numbers from batch status (with fallback if API fails)
      let shipmentNumbers: string[] = [];
      try {
        const batchStatus = await getPPLBatchStatus(batchId);
        console.log('📦 Batch status response:', JSON.stringify(batchStatus, null, 2));
        if (batchStatus.items && Array.isArray(batchStatus.items)) {
          shipmentNumbers = batchStatus.items
            .filter(item => item.shipmentNumber)
            .map(item => item.shipmentNumber!);
          console.log('✅ Extracted shipment numbers:', shipmentNumbers);
        }
      } catch (statusError) {
        // PPL status API sometimes fails - continue with label retrieval anyway
        console.log('⚠️ PPL batch status check failed, attempting to retrieve label directly:', statusError);
      }

      // Get the label PDF
      let label;
      try {
        console.log('📄 Retrieving PPL label...');
        label = await getPPLLabel(batchId, 'pdf');
        console.log(`✅ Label retrieved (${label.labelContent?.length} bytes)`);
      } catch (labelError: any) {
        console.error('❌ Failed to retrieve PPL label:', labelError.message);
        return res.status(500).json({ 
          error: 'PPL shipment created but label retrieval failed. Please try again.',
          batchId,
          labelError: labelError.message
        });
      }

      // If we STILL don't have tracking numbers, use placeholder
      // (Real tracking number is visible on the label PDF barcode)
      if (shipmentNumbers.length === 0 && cartons.length > 0) {
        shipmentNumbers = cartons.map((_, index) => `PENDING-${batchId.slice(0, 8)}-${index + 1}`);
        console.log('⚠️ No tracking numbers from PPL batch creation');
        console.log('💡 Using placeholders. Check the label PDF barcodes for the real tracking numbers.');
      }

      // Update order with PPL data
      await storage.updateOrder(orderId, {
        pplBatchId: batchId,
        pplShipmentNumbers: shipmentNumbers as any,
        pplLabelData: {
          batchId,
          shipmentNumbers,
          labelBase64: label.labelContent,
          format: label.format,
          createdAt: new Date().toISOString()
        } as any,
        pplStatus: 'created'
      });

      // Save shipment label to shipment_labels table
      const savedLabel = await storage.createShipmentLabel({
        orderId,
        carrier: 'PPL',
        trackingNumbers: shipmentNumbers,
        batchId,
        labelBase64,
        labelData: {
          pplShipment,
          // cartonNumber: nextCartonNumber, // This is for single carton creation
          referenceId: order.orderId, // Use original order ID for general reference
          hasCOD
        },
        shipmentCount: shipmentNumbers.length,
        status: 'active'
      });

      res.json({
        success: true,
        batchId,
        shipmentNumbers,
        labelPdf: label.labelContent,
        trackingNumber: shipmentNumbers[0]
      });
    } catch (error) {
      console.error('Failed to create PPL label for order:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to create PPL label for order' 
      });
    }
  });

  // Get PPL batch status
  app.get('/api/shipping/ppl/batch/:batchId', async (req, res) => {
    try {
      const { batchId } = req.params;
      const status = await getPPLBatchStatus(batchId);
      res.json(status);
    } catch (error) {
      console.error('Failed to get PPL batch status:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get batch status' 
      });
    }
  });

  // ============================================================================
  // APP SETTINGS ROUTES
  // ============================================================================

  // Get a setting by key
  app.get('/api/settings/:key', async (req, res) => {
    try {
      const { key } = req.params;
      const { appSettings } = await import('@shared/schema');

      const setting = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.key, key))
        .limit(1);

      if (setting.length === 0) {
        return res.status(404).json({ error: 'Setting not found' });
      }

      res.json(setting[0]);
    } catch (error: any) {
      console.error('Error fetching setting:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch setting' });
    }
  });

  // Save or update a setting
  app.post('/api/settings', async (req, res) => {
    try {
      const { key, value, category, description } = req.body;
      const { appSettings } = await import('@shared/schema');

      if (!key || !value) {
        return res.status(400).json({ error: 'Key and value are required' });
      }

      // Check if setting exists
      const existing = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.key, key))
        .limit(1);

      let result;
      if (existing.length > 0) {
        // Update existing setting
        result = await db
          .update(appSettings)
          .set({
            value,
            category: category || existing[0].category,
            description: description || existing[0].description,
            updatedAt: new Date(),
            updatedBy: (req as any).user?.id || null
          })
          .where(eq(appSettings.key, key))
          .returning();
      } else {
        // Insert new setting
        result = await db
          .insert(appSettings)
          .values({
            key,
            value,
            category: category || 'general',
            description: description || null,
            updatedAt: new Date(),
            updatedBy: (req as any).user?.id || null
          })
          .returning();
      }

      res.json(result[0]);
    } catch (error: any) {
      console.error('Error saving setting:', error);
      res.status(500).json({ error: error.message || 'Failed to save setting' });
    }
  });

  // Get packing materials for an order
  // Get all files and documents for an order
  app.get('/api/orders/:orderId/files', async (req, res) => {
    try {
      const { orderId } = req.params;

      // Get order details to access includedDocuments
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const allFiles: any[] = [];

      // Get uploaded files from orderFiles table
      const uploadedFiles = await storage.getOrderFiles(orderId);
      uploadedFiles.forEach((file) => {
        allFiles.push({
          id: file.id,
          fileName: file.fileName,
          fileUrl: file.fileUrl,
          fileType: 'uploaded',
          fileSize: file.fileSize,
          mimeType: file.mimeType || 'application/octet-stream',
          uploadedAt: file.uploadedAt,
          source: 'uploaded'
        });
      });

      // Get includedDocuments from order
      const includedDocs = order.includedDocuments as any;

      // Get product files by IDs
      if (includedDocs?.fileIds && Array.isArray(includedDocs.fileIds)) {
        for (const fileId of includedDocs.fileIds) {
          const fileResult = await db
            .select()
            .from(productFiles)
            .where(eq(productFiles.id, fileId))
            .limit(1);

          if (fileResult.length > 0) {
            const file = fileResult[0];
            allFiles.push({
              id: file.id,
              fileName: file.fileName,
              fileUrl: file.fileUrl,
              fileType: file.fileType,
              mimeType: file.mimeType,
              description: file.description,
              language: file.language,
              source: 'product'
            });
          }
        }
      }

      res.json(allFiles);
    } catch (error) {
      console.error('Error fetching order files:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to fetch order files' 
      });
    }
  });

  app.get('/api/orders/:orderId/packing-materials', async (req, res) => {
    try {
      const { orderId } = req.params;

      // Get order items
      const orderItems = await storage.getOrderItems(orderId);

      // Get product details for each item and extract packing materials
      const packingMaterialsMap = new Map();

      for (const item of orderItems) {
        if (item.productId) {
          const product = await storage.getProductById(item.productId);
          if (product) {
            // Handle packingMaterials JSON field (array of material objects)
            if (product.packingMaterials && Array.isArray(product.packingMaterials)) {
              for (const material of product.packingMaterials) {
                if (material.id && !packingMaterialsMap.has(material.id)) {
                  packingMaterialsMap.set(material.id, {
                    id: material.id,
                    name: material.name || 'Unknown Material',
                    imageUrl: material.imageUrl || product.packingInstructionsImage || null,
                    instruction: material.instruction || product.packingInstructionsText || '',
                    productName: product.name,
                    quantity: item.quantity
                  });
                }
              }
            }

            // Handle single packingMaterialId reference
            if (product.packingMaterialId) {
              const materialId = product.packingMaterialId;
              if (!packingMaterialsMap.has(materialId)) {
                // Fetch material details from packing_materials table
                try {
                  const materialDetails = await db.select()
                    .from(packingMaterials)
                    .where(eq(packingMaterials.id, materialId))
                    .limit(1);

                  if (materialDetails.length > 0) {
                    const mat = materialDetails[0];
                    packingMaterialsMap.set(materialId, {
                      id: mat.id,
                      name: mat.name,
                      imageUrl: mat.imageUrl || product.packingInstructionsImage || null,
                      instruction: mat.description || product.packingInstructionsText || '',
                      productName: product.name,
                      quantity: item.quantity
                    });
                  }
                } catch (error) {
                  console.error('Error fetching packing material:', error);
                }
              }
            }

            // Fallback: if product has packing instructions but no material ID
            if (!product.packingMaterialId && !product.packingMaterials && 
                (product.packingInstructionsText || product.packingInstructionsImage)) {
              const fallbackId = `product-${product.id}`;
              if (!packingMaterialsMap.has(fallbackId)) {
                packingMaterialsMap.set(fallbackId, {
                  id: fallbackId,
                  name: 'Packing Instructions',
                  imageUrl: product.packingInstructionsImage || null,
                  instruction: product.packingInstructionsText || '',
                  productName: product.name,
                  quantity: item.quantity
                });
              }
            }
          }
        }
      }

      res.json(Array.from(packingMaterialsMap.values()));

    } catch (error) {
      console.error('Error fetching packing materials:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to fetch packing materials' 
      });
    }
  });

  // Generate professional packing list PDF
  app.get('/api/orders/:orderId/packing-list.pdf', async (req, res) => {
    try {
      const { orderId } = req.params;

      // Get order details
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Get order items
      const orderItems = await storage.getOrderItems(orderId);

      // Get order cartons
      const orderCartons = await storage.getOrderCartons(orderId);
      const cartonCount = orderCartons.length;

      // Get shipping address
      let formattedAddress = 'Address not provided';
      if (order.shippingAddressId) {
        try {
          const shippingAddress = await storage.getCustomerShippingAddress(order.shippingAddressId);
          if (shippingAddress) {
            // Format address as multi-line string
            const addressLines = [];

            // Company name if exists
            if (shippingAddress.company) {
              addressLines.push(shippingAddress.company);
            }

            // Full name
            const fullName = `${shippingAddress.firstName} ${shippingAddress.lastName}`.trim();
            if (fullName) {
              addressLines.push(fullName);
            }

            // Street address
            const street = shippingAddress.streetNumber 
              ? `${shippingAddress.street} ${shippingAddress.streetNumber}`
              : shippingAddress.street;
            addressLines.push(street);

            // City, ZIP, Country
            const cityLine = `${shippingAddress.zipCode} ${shippingAddress.city}`;
            addressLines.push(cityLine);
            addressLines.push(shippingAddress.country);

            // Contact info
            if (shippingAddress.tel) {
              addressLines.push(`Tel: ${shippingAddress.tel}`);
            }
            if (shippingAddress.email) {
              addressLines.push(`Email: ${shippingAddress.email}`);
            }

            formattedAddress = addressLines.join('\n');
          }
        } catch (error) {
          console.error('Error fetching shipping address:', error);
        }
      }

      // Get product details for each item
      const itemsWithProducts = await Promise.all(
        orderItems.map(async (item) => {
          let product = null;
          if (item.productId) {
            product = await storage.getProductById(item.productId);
          }
          return {
            ...item,
            productName: product?.name || item.productName || 'Unknown Product',
            sku: product?.sku || item.sku || 'N/A',
            weight: product?.weight || null
          };
        })
      );

      // Create a new PDF document
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 40,
        bufferPages: true
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="packing-list-${order.orderId}.pdf"`);

      // Pipe the PDF directly to the response
      doc.pipe(res);

      // ===== HEADER SECTION =====
      // Add company logo (in black/grayscale)
      const logoPath = path.join(process.cwd(), 'attached_assets', 'logo_1754349267160.png');
      try {
        doc.image(logoPath, 40, 40, { width: 80 });
      } catch (error) {
        console.error('Logo not found, skipping:', error);
      }

      // Company information
      doc.fontSize(18)
         .fillColor('#000000')
         .font('Helvetica-Bold')
         .text('Davie Lam s.r.o.', 135, 45)
         .fontSize(9)
         .font('Helvetica')
         .fillColor('#666666')
         .text('ID: CZ17587816', 135, 65);

      // Document title
      doc.fontSize(26)
         .fillColor('#000000')
         .font('Helvetica-Bold')
         .text('PACKING LIST', 40, 115, { align: 'center' });

      // Horizontal line under title
      doc.strokeColor('#000000')
         .lineWidth(2)
         .moveTo(40, 150)
         .lineTo(555, 150)
         .stroke();

      // ===== ORDER INFORMATION =====
      const infoStartY = 165;
      doc.fontSize(9)
         .fillColor('#666666')
         .font('Helvetica')
         .text('Document Date:', 40, infoStartY)
         .fillColor('#000000')
         .font('Helvetica-Bold')
         .text(new Date().toLocaleDateString('en-US', { 
           year: 'numeric', 
           month: 'long', 
           day: 'numeric' 
         }), 120, infoStartY);

      doc.fontSize(9)
         .fillColor('#666666')
         .font('Helvetica')
         .text('Order Number:', 40, infoStartY + 15)
         .fillColor('#000000')
         .font('Helvetica-Bold')
         .text(order.orderId, 120, infoStartY + 15);

      if (order.shippingMethod) {
        doc.fontSize(9)
           .fillColor('#666666')
           .font('Helvetica')
           .text('Shipping Method:', 40, infoStartY + 30)
           .fillColor('#000000')
           .font('Helvetica-Bold')
           .text(order.shippingMethod, 120, infoStartY + 30);
      }

      // ===== CUSTOMER INFORMATION BOX =====
      const customerBoxY = 220;
      // Box background - increased height to accommodate address
      doc.rect(40, customerBoxY, 515, 120)
         .fillAndStroke('#F8F9FA', '#CCCCCC');

      // Box title
      doc.fontSize(11)
         .fillColor('#000000')
         .font('Helvetica-Bold')
         .text('SHIP TO:', 50, customerBoxY + 15);

      // Address details (no separate customer name line - it's in the formatted address)
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#333333')
         .text(formattedAddress, 50, customerBoxY + 35, { 
           width: 500,
           lineGap: 3
         });

      // ===== ITEMS TABLE =====
      const tableTop = 355;

      // Table header background
      doc.rect(40, tableTop, 515, 28)
         .fillAndStroke('#2C3E50', '#2C3E50');

      // Table headers (white text on dark background)
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#FFFFFF')
         .text('#', 45, tableTop + 9, { width: 25 })
         .text('SKU', 75, tableTop + 9, { width: 90 })
         .text('ITEM DESCRIPTION', 170, tableTop + 9, { width: 250 })
         .text('WEIGHT', 425, tableTop + 9, { width: 60, align: 'right' })
         .text('QTY', 490, tableTop + 9, { width: 60, align: 'right' });

      // Table body
      let yPosition = tableTop + 28;
      const rowHeight = 32;

      itemsWithProducts.forEach((item, index) => {
        // Check if we need a new page
        if (yPosition > 720) {
          doc.addPage();
          yPosition = 50;

          // Redraw table header on new page
          doc.rect(40, yPosition, 515, 28)
             .fillAndStroke('#2C3E50', '#2C3E50');
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .fillColor('#FFFFFF')
             .text('#', 45, yPosition + 9, { width: 25 })
             .text('SKU', 75, yPosition + 9, { width: 90 })
             .text('ITEM DESCRIPTION', 170, yPosition + 9, { width: 250 })
             .text('WEIGHT', 425, yPosition + 9, { width: 60, align: 'right' })
             .text('QTY', 490, yPosition + 9, { width: 60, align: 'right' });
          yPosition += 28;
        }

        // Alternating row colors
        const bgColor = index % 2 === 0 ? '#FFFFFF' : '#F8F9FA';
        doc.rect(40, yPosition, 515, rowHeight)
           .fillAndStroke(bgColor, '#E0E0E0');

        // Row data
        doc.fontSize(9)
           .fillColor('#000000')
           .font('Helvetica')
           .text(`${index + 1}`, 45, yPosition + 10, { width: 25 })
           .text(item.sku || 'N/A', 75, yPosition + 10, { width: 90 })
           .text(item.productName, 170, yPosition + 10, { width: 245, ellipsis: true });

        // Weight
        const weightText = item.weight ? `${item.weight}kg` : '-';
        doc.text(weightText, 425, yPosition + 10, { width: 60, align: 'right' });

        // Quantity (bold)
        doc.font('Helvetica-Bold')
           .text(item.quantity.toString(), 490, yPosition + 10, { width: 60, align: 'right' });

        yPosition += rowHeight;
      });

      // ===== SUMMARY SECTION =====
      yPosition += 15;
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }

      // Summary box
      doc.rect(350, yPosition, 205, 66)
         .fillAndStroke('#F8F9FA', '#CCCCCC');

      const totalItems = itemsWithProducts.reduce((sum, item) => sum + item.quantity, 0);
      const totalWeight = itemsWithProducts.reduce((sum, item) => {
        const weight = item.weight || 0;
        return sum + (weight * item.quantity);
      }, 0);

      // Total cartons
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#666666')
         .text('Total Cartons:', 360, yPosition + 10)
         .font('Helvetica-Bold')
         .fillColor('#000000')
         .text(cartonCount.toString(), 480, yPosition + 10, { align: 'right' });

      // Total items
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#666666')
         .text('Total Items:', 360, yPosition + 28)
         .font('Helvetica-Bold')
         .fillColor('#000000')
         .text(totalItems.toString(), 480, yPosition + 28, { align: 'right' });

      // Total weight
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#666666')
         .text('Total Weight:', 360, yPosition + 46)
         .font('Helvetica-Bold')
         .fillColor('#000000')
         .text(`${totalWeight.toFixed(2)} kg`, 480, yPosition + 46, { align: 'right' });

      // ===== FOOTER =====
      const footerY = 760;
      doc.fontSize(8)
         .fillColor('#999999')
         .font('Helvetica-Oblique')
         .text('This packing list confirms the items included in this shipment.', 40, footerY, { 
           align: 'center', 
           width: 515 
         })
         .text('Please verify all items upon receipt and report any discrepancies immediately.', 40, footerY + 12, { 
           align: 'center', 
           width: 515 
         });

      // Page numbers
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8)
           .fillColor('#999999')
           .font('Helvetica')
           .text(`Page ${i + 1} of ${range.count}`, 40, 790, { 
             align: 'center', 
             width: 515 
           });
      }

      // Finalize the PDF
      doc.end();

    } catch (error) {
      console.error('Error generating packing list PDF:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to generate packing list' 
      });
    }
  });

  // Recommend optimal carton for an order with intelligent packaging classification
  app.get('/api/orders/:orderId/recommend-carton', async (req, res) => {
    try {
      const { orderId } = req.params;

      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const orderItemsData = await storage.getOrderItems(orderId);
      const packingCartons = await storage.getPackingCartons();

      const orderItemsWithProducts = await Promise.all(
        orderItemsData.map(async (item) => {
          let product = null;
          if (item.productId) {
            product = await storage.getProductById(item.productId);
          }
          return {
            ...item,
            product
          };
        })
      );

      const packingPlan = await optimizeCartonPacking(orderItemsWithProducts, packingCartons);

      res.json({
        suggestions: packingPlan.cartons,
        cartonCount: packingPlan.totalCartons,
        nylonWrapItems: packingPlan.nylonWrapItems,
        reasoning: packingPlan.reasoning,
        totalWeightKg: packingPlan.totalWeightKg,
        avgUtilization: packingPlan.avgUtilization,
        optimizationSuggestions: packingPlan.suggestions
      });
    } catch (error) {
      console.error('Error recommending carton:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to recommend carton' 
      });
    }
  });

  // Apply AI-recommended cartons to order
  app.post('/api/orders/:orderId/apply-ai-cartons', async (req, res) => {
    try {
      const { orderId } = req.params;

      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const orderItemsData = await storage.getOrderItems(orderId);
      const packingCartons = await storage.getPackingCartons();

      const orderItemsWithProducts = await Promise.all(
        orderItemsData.map(async (item) => {
          let product = null;
          if (item.productId) {
            product = await storage.getProductById(item.productId);
          }
          return {
            ...item,
            product
          };
        })
      );

      // Get AI recommendations
      const packingPlan = await optimizeCartonPacking(orderItemsWithProducts, packingCartons);

      // Clear existing AI cartons (keep only manual/PPL cartons)
      await db
        .delete(orderCartons)
        .where(
          and(
            eq(orderCartons.orderId, orderId),
            eq(orderCartons.source, 'ai_recommendation')
          )
        );

      // Save AI-recommended cartons to database with type "non-company"
      const createdCartons = [];
      for (let i = 0; i < packingPlan.cartons.length; i++) {
        const aiCarton = packingPlan.cartons[i];
        const [created] = await db
          .insert(orderCartons)
          .values({
            orderId,
            cartonNumber: i + 1,
            cartonType: 'non-company', // Auto-select non-company
            packingCartonId: aiCarton.cartonId,
            weight: aiCarton.weightKg ? aiCarton.weightKg.toString() : null,
            source: 'ai_recommendation',
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        createdCartons.push(created);
      }

      res.json({
        success: true,
        cartons: createdCartons,
        packingPlan: {
          suggestions: packingPlan.cartons,
          cartonCount: packingPlan.totalCartons,
          nylonWrapItems: packingPlan.nylonWrapItems,
          reasoning: packingPlan.reasoning,
          totalWeightKg: packingPlan.totalWeightKg,
          avgUtilization: packingPlan.avgUtilization,
          optimizationSuggestions: packingPlan.suggestions
        }
      });
    } catch (error) {
      console.error('Error applying AI cartons:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to apply AI cartons' 
      });
    }
  });

  // Recalculate carton plan based on user-selected carton types
  app.post('/api/orders/:orderId/recalculate-carton-plan', async (req, res) => {
    try {
      const { orderId } = req.params;
      const { selectedCartonTypes } = req.body;

      if (!selectedCartonTypes || !Array.isArray(selectedCartonTypes)) {
        return res.status(400).json({ error: 'selectedCartonTypes array is required' });
      }

      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const orderItemsData = await storage.getOrderItems(orderId);
      const allPackingCartons = await storage.getPackingCartons();

      const selectedCartons = allPackingCartons.filter(c => 
        selectedCartonTypes.includes(c.id)
      );

      if (selectedCartons.length === 0) {
        return res.status(400).json({ error: 'No valid carton types selected' });
      }

      const orderItemsWithProducts = await Promise.all(
        orderItemsData.map(async (item) => {
          let product = null;
          if (item.productId) {
            product = await storage.getProductById(item.productId);
          }
          return {
            ...item,
            product
          };
        })
      );

      const packingPlan = await optimizeCartonPacking(orderItemsWithProducts, selectedCartons);

      res.json({
        suggestions: packingPlan.cartons,
        cartonCount: packingPlan.totalCartons,
        nylonWrapItems: packingPlan.nylonWrapItems,
        reasoning: packingPlan.reasoning,
        totalWeightKg: packingPlan.totalWeightKg,
        avgUtilization: packingPlan.avgUtilization,
        optimizationSuggestions: packingPlan.suggestions
      });
    } catch (error) {
      console.error('Error recalculating carton plan:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to recalculate carton plan' 
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

      // Get order details to access includedDocuments
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const allFiles: any[] = [];

      // Get uploaded files from orderFiles table
      const uploadedFiles = await storage.getOrderFiles(orderId);
      uploadedFiles.forEach((file) => {
        allFiles.push({
          id: file.id,
          fileName: file.fileName,
          fileUrl: file.fileUrl,
          fileType: 'uploaded',
          fileSize: file.fileSize,
          mimeType: file.mimeType || 'application/octet-stream',
          uploadedAt: file.uploadedAt,
          source: 'uploaded'
        });
      });

      // Get includedDocuments from order
      const includedDocs = order.includedDocuments as any;

      // Get product files by IDs
      if (includedDocs?.fileIds && Array.isArray(includedDocs.fileIds)) {
        for (const fileId of includedDocs.fileIds) {
          const fileResult = await db
            .select()
            .from(productFiles)
            .where(eq(productFiles.id, fileId))
            .limit(1);

          if (fileResult.length > 0) {
            const file = fileResult[0];
            allFiles.push({
              id: file.id,
              fileName: file.fileName,
              fileUrl: file.fileUrl,
              fileType: file.fileType,
              mimeType: file.mimeType,
              description: file.description,
              language: file.language,
              source: 'product'
            });
          }
        }
      }

      res.json({
        orderId,
        totalFiles: allFiles.length,
        filesByType: {
          MSDS: allFiles.filter(f => f.fileType === 'MSDS'),
          CPNP: allFiles.filter(f => f.fileType === 'CPNP'),
          Leaflet: allFiles.filter(f => f.fileType === 'Leaflet'),
          Manual: allFiles.filter(f => f.fileType === 'Manual'),
          Certificate: allFiles.filter(f => f.fileType === 'Certificate'),
          Other: allFiles.filter(f => f.fileType === 'Other'),
        },
        files: allFiles
      });
    } catch (error) {
      console.error('Error fetching packing files:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to fetch packing files' 
      });
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
        if (cartonInfo && cartonInfo.costAmount) {
          estimatedShippingCost += parseFloat(cartonInfo.costAmount.toString());
        }
      }

      // Return the optimization plan without saving to database
      res.json({
        suggestions: packingPlan.cartons,
        cartonCount: packingPlan.totalCartons,
        nylonWrapItems: packingPlan.nylonWrapItems,
        reasoning: packingPlan.reasoning,
        totalWeightKg: packingPlan.totalWeightKg,
        avgUtilization: packingPlan.avgUtilization,
        optimizationSuggestions: packingPlan.suggestions
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
      const planData = req.body as UIPackingPlan;

      // Validate the plan data structure
      if (!planData || typeof planData !== 'object') {
        return res.status(400).json({ message: 'Invalid packing plan data' });
      }

      if (typeof planData.totalCartons !== 'number' || planData.totalCartons < 0) {
        return res.status(400).json({ message: 'Invalid totalCartons' });
      }

      if (!Array.isArray(planData.cartons)) {
        return res.status(400).json({ message: 'Invalid cartons array' });
      }

      // Fetch all packing cartons for reference
      const cartons = await storage.getPackingCartons();
      if (!cartons || cartons.length === 0) {
        return res.status(400).json({ message: 'No packing cartons configured' });
      }

      console.log(`Saving packing plan for order ${orderId}:`, {
        totalCartons: planData.totalCartons,
        totalWeight: planData.totalWeight,
        avgUtilization: planData.avgUtilization
      });

      // Compute checksum for efficient change detection
      const checksum = computePlanChecksum(planData);

      // Delete existing plans for this order to avoid duplicates
      await storage.deleteOrderCartonPlansByOrderId(orderId);

      // Use serializer to convert UI format to DB format
      const serializedData = serializePackingPlanToDB(planData, orderId);

      // Validate with Zod schema before inserting
      const insertSchema = createInsertSchema(orderCartonPlans);
      const validatedData = insertSchema.parse({
        ...serializedData,
        checksum
      });

      // Use validated data for DB insertion
      const dbPlanData = validatedData;

      // Save the plan to database
      const createdPlan = await storage.createOrderCartonPlan(dbPlanData);

      // Use serializer to convert items
      const itemsToCreate = serializePackingPlanItems(planData, createdPlan.id);

      // Save each item to database
      const createdItems = [];
      for (const itemData of itemsToCreate) {
        // Find the matching carton from database by checking carton names in planData
        const planCarton = planData.cartons.find((c, idx) => 
          (c.cartonNumber ?? idx + 1) === itemData.cartonNumber
        );
        const cartonInfo = planCarton?.cartonName 
          ? cartons.find(c => c.name === planCarton.cartonName)
          : null;

        const createdItem = await storage.createOrderCartonItem({
          planId: itemData.planId,
          cartonId: cartonInfo?.id || itemData.cartonId,
          cartonNumber: itemData.cartonNumber,
          productId: itemData.productId,
          quantity: itemData.quantity,
          itemWeightKg: itemData.itemWeightKg,
          aiEstimated: itemData.aiEstimated
        });
        createdItems.push(createdItem);
      }

      console.log(`Created packing plan ${createdPlan.id} with ${createdItems.length} items across ${planData.totalCartons} cartons`);

      // Return the created plan with checksum
      res.status(201).json({
        id: createdPlan.id,
        orderId: createdPlan.orderId,
        totalCartons: createdPlan.totalCartons,
        checksum,
        message: 'Packing plan saved successfully'
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
      console.log(`Loading packing plan ${plan.id} for order ${orderId}: found ${items.length} items`);

      // Fetch all packing cartons for reference
      const allCartons = await storage.getPackingCartons();

      // Enrich items with product names by joining with products table
      const enrichedItems = await Promise.all(
        items.map(async (item) => {
          let productName = 'Unknown Product';
          let sku = '';

          if (item.productId) {
            try {
              const product = await db.query.products.findFirst({
                where: eq(products.id, item.productId),
                columns: { name: true, sku: true }
              });

              if (product) {
                productName = product.name;
                sku = product.sku || '';
              }
            } catch (err) {
              console.error(`Failed to fetch product ${item.productId}:`, err);
            }
          }

          return {
            ...item,
            productName,
            sku
          };
        })
      );

      // Prepare carton details for deserializer
      const cartonDetails = allCartons.map(c => ({
        id: c.id,
        name: c.name,
        innerLengthCm: c.innerLengthCm.toString(),
        innerWidthCm: c.innerWidthCm.toString(),
        innerHeightCm: c.innerHeightCm.toString(),
        tareWeightKg: c.tareWeightKg.toString()
      }));

      // Use deserializer to convert DB format to UI format
      // This function takes the enrichedItems and includes them in the cartons
      const uiPackingPlan = deserializePackingPlanFromDB(plan, enrichedItems, cartonDetails);

      // CRITICAL: Verify items are included in ALL cartons
      const totalItemsInPlan = uiPackingPlan.cartons.reduce((sum, c) => sum + (c.items?.length || 0), 0);
      console.log(`Deserialized plan has ${uiPackingPlan.cartons.length} cartons with ${totalItemsInPlan} total items (from ${enrichedItems.length} DB items)`);

      // Explicitly verify each carton has items array
      uiPackingPlan.cartons.forEach((carton, idx) => {
        if (!carton.items) {
          console.error(`ERROR: Carton ${idx} is missing items array!`);
        } else {
          console.log(`Carton ${idx} (${carton.cartonName}): ${carton.items.length} items`);
        }
      });

      // Compute fresh checksum for the deserialized plan (or use stored checksum if available)
      const checksum = plan.checksum || computePlanChecksum(uiPackingPlan);

      // Return the UI-ready format with checksum - items MUST be included
      res.json({
        plan: uiPackingPlan,
        checksum
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

  // Facebook Name Extraction Endpoint (Username-based only, no Graph API)
  app.get('/api/facebook/name', async (req, res) => {
    try {
      const facebookUrl = req.query.url as string;

      if (!facebookUrl) {
        return res.status(400).json({ message: 'Query parameter "url" is required' });
      }

      // Extract Facebook username/ID from URL
      let facebookId = '';
      let extractedName = '';

      // Handle various Facebook URL formats including mobile (m.facebook.com)
      // Pattern 1: profile.php?id=NUMERIC_ID (works for both www and mobile)
      const profilePhpMatch = facebookUrl.match(/(?:www\.|m\.)?facebook\.com\/profile\.php\?id=(\d+)/);
      if (profilePhpMatch) {
        facebookId = profilePhpMatch[1];
        // For numeric IDs, we can't extract a meaningful name
        extractedName = '';
      } else {
        // Pattern 2: facebook.com/username or m.facebook.com/username
        const usernameMatch = facebookUrl.match(/(?:www\.|m\.)?facebook\.com\/([^/?#]+)/);
        if (usernameMatch) {
          facebookId = usernameMatch[1];

          // Try to extract a meaningful name from username
          // Remove common prefixes and convert to proper case
          const cleanedUsername = facebookId
            .replace(/^(itz|its|im|i\.am|the|mr|mrs|ms|dr)[-.]?/i, '')
            .replace(/[-._]/g, ' ')
            .split(' ')
            .filter(word => word.length > 0)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
            .trim();

          extractedName = cleanedUsername || facebookId;
        }
      }

      if (!facebookId) {
        return res.status(400).json({ message: 'Unable to extract Facebook ID from URL' });
      }

      res.json({
        facebookId,
        facebookName: extractedName || null,
        message: extractedName ? 'Name extracted from username' : 'Numeric ID - no name available'
      });
    } catch (error) {
      console.error('Error extracting Facebook name:', error);
      res.status(500).json({ message: 'Failed to extract Facebook name' });
    }
  });


  // Facebook OAuth endpoints
  app.get('/api/auth/facebook',
    passport.authenticate('facebook', { scope: ['email'] })
  );

  app.get('/api/auth/facebook/callback', async (req, res) => {
    try {
      const { code } = req.query;
      const appId = process.env.FACEBOOK_APP_ID;
      const appSecret = process.env.FACEBOOK_APP_SECRET;

      if (!code || !appId || !appSecret) {
        return res.redirect('/login?error=auth_failed');
      }

      const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/facebook/callback`;

      // Exchange code for access token
      const tokenResponse = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`
      );

      const tokenData = await tokenResponse.json();

      if (!tokenData.access_token) {
        console.error('Facebook token error:', tokenData);
        return res.redirect('/login?error=auth_failed');
      }

      // Get user info from Facebook
      const userResponse = await fetch(
        `https://graph.facebook.com/v18.0/me?fields=id,name,email,picture.type(large)&access_token=${tokenData.access_token}`
      );

      const userData = await userResponse.json();

      if (!userData.id) {
        console.error('Facebook user data error:', userData);
        return res.redirect('/login?error=auth_failed');
      }

      console.log('Facebook user data:', { id: userData.id, name: userData.name, email: userData.email });

      // Here you would create/login the user in your database
      // For now, we'll just create a session with the Facebook user data
      if (req.session) {
        req.session.user = {
          id: userData.id,
          email: userData.email || `${userData.id}@facebook.com`,
          name: userData.name,
          provider: 'facebook'
        };
      }

      // Redirect to home page after successful login
      res.redirect('/');
    } catch (error) {
      console.error('Facebook OAuth error:', error);
      res.redirect('/login?error=auth_failed');
    }
  });

  // App Settings endpoints
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await storage.getAppSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error fetching app settings:', error);
      res.status(500).json({ message: 'Failed to fetch app settings' });
    }
  });

  app.get('/api/settings/:key', async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await storage.getAppSettingByKey(key);

      if (!setting) {
        return res.status(404).json({ message: `Setting with key '${key}' not found` });
      }

      res.json(setting);
    } catch (error) {
      console.error('Error fetching app setting:', error);
      res.status(500).json({ message: 'Failed to fetch app setting' });
    }
  });

  app.post('/api/settings', async (req, res) => {
    try {
      const data = insertAppSettingSchema.parse(req.body);
      const setting = await storage.createAppSetting(data);
      res.status(201).json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      console.error('Error creating app setting:', error);
      res.status(500).json({ message: 'Failed to create app setting' });
    }
  });

  app.patch('/api/settings/:key', async (req, res) => {
    try {
      const { key } = req.params;
      const data = req.body;

      // Check if setting exists first
      const existing = await storage.getAppSettingByKey(key);
      if (!existing) {
        return res.status(404).json({ message: `Setting with key '${key}' not found` });
      }

      const updated = await storage.updateAppSetting(key, data);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      console.error('Error updating app setting:', error);
      res.status(500).json({ message: 'Failed to update app setting' });
    }
  });

  app.delete('/api/settings/:key', async (req, res) => {
    try {
      const { key } = req.params;

      // Check if setting exists first
      const existing = await storage.getAppSettingByKey(key);
      if (!existing) {
        return res.status(404).json({ message: `Setting with key '${key}' not found` });
      }

      await storage.deleteAppSetting(key);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting app setting:', error);
      res.status(500).json({ message: 'Failed to delete app setting' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}