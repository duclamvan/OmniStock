import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, requireRole } from "./auth";
import { seedMockData } from "./mockData";
import { cacheMiddleware, invalidateCache } from "./cache";
import rateLimit from 'express-rate-limit';
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
  insertActivityLogSchema,
  insertPackingMaterialSchema,
  insertEmployeeIncidentSchema,
  warehouseTasks,
  insertWarehouseTaskSchema,
  insertWarehouseLabelSchema,
  productCostHistory,
  products,
  productBundles,
  productLocations,
  productVariants,
  purchaseItems,
  importPurchases,
  shipments,
  receipts,
  receiptItems,
  consolidationItems,
  consolidations,
  customItems,
  orderItems,
  orders,
  customers,
  users,
  packingMaterials,
  customerShippingAddresses,
  productFiles,
  orderCartons,
  orderCartonPlans,
  appSettings,
  notifications,
  shipmentTracking,
  shipmentLabels,
  receiptItemLocations,
  serializePackingPlanToDB,
  serializePackingPlanItems,
  deserializePackingPlanFromDB,
  computePlanChecksum,
  type UIPackingPlan,
  pushSubscriptions,
  preOrders,
  tickets,
  discounts,
  roles,
  permissions,
  rolePermissions,
  insertRoleSchema,
} from "@shared/schema";
import { sendPushToAllWarehouseOperators, getVapidPublicKey } from "./services/pushNotifications";
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
import { TrackingService, isWithinWorkingHours } from "./services/tracking";
import OpenAI from "openai";
import passport from "passport";
import { localization } from "./localization";
import { 
  generateTemplate, 
  generateTemplateWorkbook,
  parseExcelFile,
  validateRow,
  createImportBatch,
  processImportBatch,
  revertImportBatch,
  exportToExcel,
  getImportBatch,
  getImportBatches,
  getImportBatchItems,
  EntityType
} from './services/importExportService';

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
// Total: 79 replacements = 7 lines of 10 + 1 line of 9
function normalizeSQLColumn(column: any) {
  return sql`
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
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

// Helper to convert snake_case to camelCase
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Helper to parse setting values (JSON or primitives)
function deepParse(value: string | null | undefined): any {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'string') return value;
  
  // Try to parse as JSON (handles objects, arrays, booleans, numbers)
  try {
    return JSON.parse(value);
  } catch {
    // If JSON parsing fails, return as string
    return value;
  }
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

// Comprehensive list of all COST and PROFIT fields to be filtered from warehouse operator responses
// IMPORTANT: This list should NOT include selling prices (price, sellingPrice, totalPrice, total, unitPrice)
// Warehouse operators need to see what customers pay, but not what we paid (costs) or our margins (profit)
export const FINANCIAL_FIELDS = [
  // Base cost fields
  'cost', 'margin', 'profit',
  
  // Profit and margin metrics
  'profitMargin', 'marginPercent', 'profitPercent', 'totalProfit',
  'grossProfit', 'netProfit', 'profitMarginPercent',
  
  // Import costs (all currencies)
  'importCost', 'importCostUsd', 'importCostCzk', 'importCostEur', 'importCostVnd', 'importCostCny',
  'importPrice', 'importPriceUsd', 'importPriceEur', 'importPriceCzk', 'importPriceVnd', 'importPriceCny',
  
  // Landing costs (all currencies)
  'landingCost', 'landingCostUsd', 'landingCostCzk', 'landingCostEur', 'landingCostVnd', 'landingCostCny',
  'landedCost', 'landedCostUsd', 'landedCostCzk', 'landedCostEur', 'landedCostVnd', 'landedCostCny',
  'latestLandingCost', 'latest_landing_cost',
  'landingCostUnitBase', 'landingCostUnitUsd', 'landingCostUnitEur', 'landingCostUnitCzk',
  
  // Order/Purchase totals (all currencies)
  'totalCost', 'totalCostUsd', 'totalCostCzk', 'totalCostEur', 'totalCostVnd', 'totalCostCny',
  'totalImportCost', 'totalImportCostUsd', 'totalImportCostCzk', 'totalImportCostEur', 'totalImportCostVnd', 'totalImportCostCny',
  'importTotalCost', 'importTotalCostUsd', 'importTotalCostCzk', 'importTotalCostEur',
  
  // Purchase/shipping costs (all currencies)
  'purchaseTotal', 'purchaseTotalUsd', 'purchaseTotalCzk', 'purchaseTotalEur', 'purchaseTotalVnd', 'purchaseTotalCny',
  'purchasePrice', 'purchasePriceUsd', 'purchasePriceEur', 'purchasePriceCzk', 'purchasePriceVnd', 'purchasePriceCny',
  'purchaseCost', 'purchaseCostUsd', 'purchaseCostEur', 'purchaseCostCzk',
  'shippingCost', 'shippingCostUsd', 'shippingCostCzk', 'shippingCostEur', 'shippingCostVnd', 'shippingCostCny',
  'actualShippingCost', 'actualShippingCostUsd', 'actualShippingCostCzk', 'actualShippingCostEur',
  'freightCost', 'freightCostUsd', 'freightCostCzk', 'freightCostEur',
  'totalPaid', 'totalPaidUsd', 'totalPaidCzk', 'totalPaidEur',
  
  // Unit costs (all currencies)
  'unitCost', 'unitCostUsd', 'unitCostEur', 'unitCostCzk', 'unitCostVnd', 'unitCostCny',
  'importUnitCost', 'importUnitCostUsd', 'importUnitCostEur', 'importUnitCostCzk',
  'averageCost', 'averageCostUsd', 'averageCostEur', 'averageCostCzk',
  
  // Other financial fields
  'actualCost', 'dutyCost', 'dutyRatePercent', 'unitGrossWeightKg',
  'costHistory', 'insuranceValue', 'exchangeRate', 'totalImportPrice'
];

// Deeply recursive middleware to filter financial data from responses for warehouse operators
function filterFinancialData(data: any, userRole: string): any {
  if (userRole === 'administrator') {
    return data; // Admins see everything
  }
  
  // Handle arrays recursively
  if (Array.isArray(data)) {
    return data.map(item => filterFinancialData(item, userRole));
  }
  
  // Handle objects recursively
  if (typeof data === 'object' && data !== null) {
    const filtered: any = {};
    
    for (const key in data) {
      // Skip financial fields completely
      if (FINANCIAL_FIELDS.includes(key)) {
        continue;
      }
      
      // Recursively filter nested objects and arrays
      filtered[key] = filterFinancialData(data[key], userRole);
    }
    
    return filtered;
  }
  
  // Return primitives as-is
  return data;
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
  const express = await import('express');
  
  // Auth middleware - must be set up first
  await setupAuth(app);

  // Protected static file routes - require authentication for enterprise security
  // These routes serve product images and user uploads
  const staticFileAuth = (req: any, res: any, next: any) => {
    // Allow authenticated users to access static files
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      return next();
    }
    // Return 401 for unauthenticated access to protected static files
    return res.status(401).json({ message: 'Authentication required to access this resource' });
  };

  // Serve protected static files from uploads directory
  app.use('/uploads', staticFileAuth, express.default.static('uploads'));
  
  // Serve protected static files from public/images directory
  app.use('/images', staticFileAuth, express.default.static('public/images'));

  // PUBLIC endpoint to check if any users exist (for initial setup flow)
  app.get('/api/auth/has-users', async (req, res) => {
    try {
      const userCount = await storage.getUserCount();
      res.json({ hasUsers: userCount > 0 });
    } catch (error) {
      res.status(500).json({ message: 'Failed to check users' });
    }
  });

  // PUBLIC endpoint for product lookup by SKU/barcode (for QR code scanning by external users)
  // Returns only basic product identification info, no sensitive data like pricing or inventory
  app.get('/api/products/lookup/:code', async (req, res) => {
    try {
      const code = decodeURIComponent(req.params.code);
      
      // Search by SKU or barcode
      const allProducts = await storage.getProducts();
      const product = allProducts.find(p => 
        p.sku === code || 
        p.barcode === code ||
        p.id === code
      );
      
      if (!product) {
        return res.json(null);
      }
      
      // Return only basic identification info for external users
      res.json({
        id: product.id,
        name: product.name,
        vietnameseName: product.vietnameseName,
        sku: product.sku,
        barcode: product.barcode,
      });
    } catch (error) {
      console.error('Product lookup error:', error);
      res.status(500).json({ message: 'Failed to lookup product' });
    }
  });

  // Maintenance mode middleware - checks if system is in maintenance mode
  // Allows auth, user, and settings routes to pass through so admins can manage it
  app.use('/api', async (req: any, res, next) => {
    try {
      // Allow these routes to pass through even during maintenance
      // so admins can still log in and toggle maintenance mode off
      const allowedPaths = ['/api/auth', '/api/user', '/api/settings'];
      const isAllowedPath = allowedPaths.some(path => req.originalUrl.startsWith(path));
      
      if (isAllowedPath) {
        return next();
      }

      // Check maintenance mode setting
      const maintenanceSetting = await storage.getAppSettingByKey('maintenance_mode');
      const isMaintenanceMode = maintenanceSetting?.value === 'true' || maintenanceSetting?.value === true;
      
      if (!isMaintenanceMode) {
        return next();
      }

      // If in maintenance mode, check if user is an administrator
      const isAdmin = req.user?.role === 'administrator';
      
      if (isAdmin) {
        return next();
      }

      // Non-admin users get blocked during maintenance
      return res.status(503).json({
        message: 'System is upgrading. Please wait a few minutes.',
        maintenance: true
      });
    } catch (error) {
      // If DB is broken during update, fail gracefully and let request through
      console.error('Maintenance mode check failed:', error);
      return next();
    }
  });

  // Test-only endpoint for seeding user roles (RBAC testing)
  // This endpoint allows direct user creation and role assignment for automated tests
  // SECURITY: Protected by shared secret to prevent unauthorized role escalation
  app.post('/api/test/seed-role', async (req, res) => {
    // Only available in non-production environments
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ message: 'Not found' });
    }

    // Verify shared secret authorization header
    const authHeader = req.headers['x-test-secret'];
    const expectedSecret = process.env.TEST_SECRET || 'replit-agent-test-secret-change-in-production';
    
    if (authHeader !== expectedSecret) {
      console.warn(`[SECURITY] Unauthorized test endpoint access attempt from IP: ${req.ip}`);
      return res.status(403).json({ message: 'Forbidden' });
    }

    try {
      const { username, role, email, firstName, lastName, password } = req.body;

      if (!username || !role) {
        return res.status(400).json({ message: 'username and role are required' });
      }

      // Validate role value
      if (role !== 'administrator' && role !== 'warehouse_operator') {
        return res.status(400).json({ message: 'Invalid role. Must be administrator or warehouse_operator' });
      }

      // Check if user already exists
      let user = await storage.getUserByUsername(username);
      
      if (user) {
        // Update the existing user's role
        await storage.updateUserRole(user.id, role);
      } else {
        // Create new user with password
        const bcrypt = await import('bcryptjs');
        const passwordHash = await bcrypt.hash(password || 'TestPassword123!', 12);
        user = await storage.createUserWithPassword({
          username,
          passwordHash,
          email: email || null,
          firstName: firstName || null,
          lastName: lastName || null,
          role,
        });
      }

      console.log(`[TEST] Seeded role ${role} for user ${username}`);
      return res.json({ success: true, username, role });
    } catch (error: any) {
      console.error('Error seeding role:', error);
      return res.status(500).json({ message: 'Failed to seed role', error: error.message });
    }
  });

  // Rate limiting for SMS endpoints
  const smsRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 SMS sends per hour
    message: 'Too many SMS requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
  });

  // Auth user endpoint - returns authenticated user data
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const userId = req.user.id;
      
      // Fetch full user data from database
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Return user data without sensitive fields
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
        phoneNumber: user.phoneNumber
      });
    } catch (error) {
      console.error('Error fetching authenticated user:', error);
      res.status(500).json({ message: 'Failed to fetch user data' });
    }
  });


  // User Management API Endpoints
  
  // GET /api/users/me - Get current user info (authenticated users)
  // NOTE: This must come BEFORE /api/users/:userId to prevent "me" from being treated as a userId
  app.get('/api/users/me', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized - Please log in' });
      }

      // Always fetch fresh data from database to ensure role is up-to-date
      const userId = req.user.id;
      let dbUser = await storage.getUser(userId);
      
      if (!dbUser) {
        console.error('User not found:', userId, 'Session user:', req.user);
        return res.status(404).json({ message: 'User not found' });
      }

      // Update session with latest data
      req.user.id = dbUser.id;
      req.user.email = dbUser.email;
      req.user.firstName = dbUser.firstName;
      req.user.lastName = dbUser.lastName;
      req.user.role = dbUser.role;
      req.user.createdAt = dbUser.createdAt;

      // Fetch user's permissions based on their role
      let userPermissions: string[] = [];
      if (dbUser.role) {
        const [userRole] = await db.select().from(roles).where(eq(roles.name, dbUser.role));
        if (userRole) {
          const rolePerms = await db.select({
            permission: permissions
          })
            .from(rolePermissions)
            .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
            .where(eq(rolePermissions.roleId, userRole.id));
          // Create permission names in format: section.page
          userPermissions = rolePerms.map(rp => `${rp.permission.section}.${rp.permission.page}`);
        }
      }

      res.json({
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        role: dbUser.role,
        createdAt: dbUser.createdAt,
        permissions: userPermissions
      });
    } catch (error) {
      console.error('Error fetching current user:', error);
      res.status(500).json({ message: 'Failed to fetch user information' });
    }
  });

  // PATCH /api/users/me - Update current user profile
  app.patch('/api/users/me', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized - Please log in' });
      }

      const { firstName, lastName, email, phoneNumber, profileImageUrl } = req.body;
      const updates: any = {};

      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (email !== undefined) {
        const normalizedEmail = email.toLowerCase();
        
        // Check if email is already in use by another user (case-insensitive)
        const existingUser = await storage.getUserByEmail(normalizedEmail);
        if (existingUser && existingUser.id !== req.user.id) {
          return res.status(400).json({ 
            message: 'Email is already in use',
            field: 'email',
            error: 'Email is already in use by another account'
          });
        }
        updates.email = normalizedEmail;
      }
      
      // Handle phone number updates
      if (phoneNumber !== undefined) {
        // Allow empty string to clear phone number
        if (phoneNumber === '') {
          updates.phoneNumber = null;
        } else {
          // Validate E.164 format if provided
          const e164Regex = /^\+[1-9]\d{1,14}$/;
          if (!e164Regex.test(phoneNumber)) {
            return res.status(400).json({ 
              message: 'Invalid phone number format',
              field: 'phoneNumber',
              error: 'Phone number must be in E.164 format (e.g., +420123456789)'
            });
          }
          updates.phoneNumber = phoneNumber;
        }
      }
      
      // Handle profile image URL updates
      if (profileImageUrl !== undefined) {
        updates.profileImageUrl = profileImageUrl || null;
      }

      const updatedUser = await storage.updateUserProfile(req.user.id, updates);
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phoneNumber: updatedUser.phoneNumber,
        profileImageUrl: updatedUser.profileImageUrl,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ message: 'Failed to update user profile' });
    }
  });

  // GET /api/users - List all users (admin-only)
  app.get('/api/users', requireRole(['administrator']), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const sanitizedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt
      }));
      res.json(sanitizedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // GET /api/users/:userId - Get a single user by ID (admin-only)
  app.get('/api/users/:userId', requireRole(['administrator']), async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const sanitizedUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt
      };
      
      res.json(sanitizedUser);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // PATCH /api/users/:userId/role - Update user role (admin-only)
  app.patch('/api/users/:userId/role', requireRole(['administrator']), async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      // Allow null to revoke access
      if (role !== null && role !== undefined && !['administrator', 'warehouse_operator'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role. Must be either "administrator", "warehouse_operator", or null' });
      }

      await storage.updateUserRole(userId, role);
      res.json({ message: 'User role updated successfully' });
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ message: 'Failed to update user role' });
    }
  });

  // DELETE /api/users/:userId - Delete user (admin-only)
  app.delete('/api/users/:userId', requireRole(['administrator']), async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUser = (req as any).user;

      // Prevent self-deletion
      if (currentUser && currentUser.id === userId) {
        return res.status(403).json({ message: 'You cannot delete your own account' });
      }

      await storage.deleteUser(userId);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });

  // =====================================================
  // ROLES & PERMISSIONS MANAGEMENT API ENDPOINTS
  // =====================================================

  // GET /api/roles - List all roles with their permissions (admin-only)
  app.get('/api/roles', requireRole(['administrator']), async (req, res) => {
    try {
      const allRoles = await db.select().from(roles).orderBy(roles.isSystem, roles.name);
      
      // Get permissions for each role
      const rolesWithPermissions = await Promise.all(
        allRoles.map(async (role) => {
          const rolePerms = await db.select({
            permission: permissions
          })
            .from(rolePermissions)
            .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
            .where(eq(rolePermissions.roleId, role.id));
          
          return {
            ...role,
            permissions: rolePerms.map(rp => rp.permission)
          };
        })
      );
      
      res.json(rolesWithPermissions);
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({ message: 'Failed to fetch roles' });
    }
  });

  // GET /api/roles/:id - Get a specific role with permissions (admin-only)
  app.get('/api/roles/:id', requireRole(['administrator']), async (req, res) => {
    try {
      const roleId = req.params.id;
      const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
      
      if (!role) {
        return res.status(404).json({ message: 'Role not found' });
      }
      
      const rolePerms = await db.select({
        permission: permissions
      })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, role.id));
      
      res.json({
        ...role,
        permissions: rolePerms.map(rp => rp.permission)
      });
    } catch (error) {
      console.error('Error fetching role:', error);
      res.status(500).json({ message: 'Failed to fetch role' });
    }
  });

  // POST /api/roles - Create a new role (admin-only)
  app.post('/api/roles', requireRole(['administrator']), async (req, res) => {
    try {
      const { permissionIds, ...roleData } = req.body;
      
      // Validate role data
      const validatedData = insertRoleSchema.parse(roleData);
      
      // Create the role
      const [newRole] = await db.insert(roles).values({
        ...validatedData,
        type: 'custom',
        isSystem: false
      }).returning();
      
      // Add permissions if provided
      if (permissionIds && Array.isArray(permissionIds) && permissionIds.length > 0) {
        await db.insert(rolePermissions).values(
          permissionIds.map((permId: number) => ({
            roleId: newRole.id,
            permissionId: permId
          }))
        );
      }
      
      // Fetch the role with permissions
      const rolePerms = await db.select({
        permission: permissions
      })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, newRole.id));
      
      res.json({
        ...newRole,
        permissions: rolePerms.map(rp => rp.permission)
      });
    } catch (error) {
      console.error('Error creating role:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation failed', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create role' });
    }
  });

  // PATCH /api/roles/:id - Update a role (admin-only)
  app.patch('/api/roles/:id', requireRole(['administrator']), async (req, res) => {
    try {
      const roleId = req.params.id;
      const { permissionIds, ...roleData } = req.body;
      
      // Check if role exists
      const [existingRole] = await db.select().from(roles).where(eq(roles.id, roleId));
      if (!existingRole) {
        return res.status(404).json({ message: 'Role not found' });
      }
      
      // System roles can only have permissions updated, not name/description
      // Only reject if the name or displayName is actually being changed
      if (existingRole.isSystem) {
        if (roleData.name && roleData.name !== existingRole.name) {
          return res.status(403).json({ message: 'Cannot modify system role name' });
        }
        if (roleData.displayName && roleData.displayName !== existingRole.displayName) {
          return res.status(403).json({ message: 'Cannot modify system role display name' });
        }
      }
      
      // Update role data if provided
      if (Object.keys(roleData).length > 0) {
        await db.update(roles)
          .set({ ...roleData, updatedAt: new Date() })
          .where(eq(roles.id, roleId));
      }
      
      // Update permissions if provided
      if (permissionIds !== undefined && Array.isArray(permissionIds)) {
        // Remove existing permissions
        await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
        
        // Add new permissions
        if (permissionIds.length > 0) {
          await db.insert(rolePermissions).values(
            permissionIds.map((permId: number) => ({
              roleId: roleId,
              permissionId: permId
            }))
          );
        }
      }
      
      // Fetch updated role with permissions
      const [updatedRole] = await db.select().from(roles).where(eq(roles.id, roleId));
      const rolePerms = await db.select({
        permission: permissions
      })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, roleId));
      
      res.json({
        ...updatedRole,
        permissions: rolePerms.map(rp => rp.permission)
      });
    } catch (error) {
      console.error('Error updating role:', error);
      res.status(500).json({ message: 'Failed to update role' });
    }
  });

  // DELETE /api/roles/:id - Delete a role (admin-only)
  app.delete('/api/roles/:id', requireRole(['administrator']), async (req, res) => {
    try {
      const roleId = req.params.id;
      
      // Check if role exists
      const [existingRole] = await db.select().from(roles).where(eq(roles.id, roleId));
      if (!existingRole) {
        return res.status(404).json({ message: 'Role not found' });
      }
      
      // Prevent deletion of system roles
      if (existingRole.isSystem) {
        return res.status(403).json({ message: 'Cannot delete system roles' });
      }
      
      // Check if any users are using this role
      const usersWithRole = await db.select().from(users).where(eq(users.role, existingRole.name));
      if (usersWithRole.length > 0) {
        return res.status(400).json({ 
          message: `Cannot delete role. ${usersWithRole.length} user(s) are assigned to this role.` 
        });
      }
      
      // Delete role (permissions will cascade)
      await db.delete(roles).where(eq(roles.id, roleId));
      
      res.json({ message: 'Role deleted successfully' });
    } catch (error) {
      console.error('Error deleting role:', error);
      res.status(500).json({ message: 'Failed to delete role' });
    }
  });

  // GET /api/permissions - List all permissions grouped by parent section and section (admin-only)
  app.get('/api/permissions', requireRole(['administrator']), async (req, res) => {
    try {
      const allPermissions = await db.select().from(permissions).orderBy(permissions.sortOrder);
      
      // Group permissions by section (flat)
      const grouped = allPermissions.reduce((acc, perm) => {
        if (!acc[perm.section]) {
          acc[perm.section] = [];
        }
        acc[perm.section].push(perm);
        return acc;
      }, {} as Record<string, typeof allPermissions>);
      
      // Group permissions by parent section -> section (hierarchical)
      const hierarchical = allPermissions.reduce((acc, perm) => {
        const parentKey = perm.parentSection || 'warehouse_operations';
        if (!acc[parentKey]) {
          acc[parentKey] = {};
        }
        if (!acc[parentKey][perm.section]) {
          acc[parentKey][perm.section] = [];
        }
        acc[parentKey][perm.section].push(perm);
        return acc;
      }, {} as Record<string, Record<string, typeof allPermissions>>);
      
      res.json({
        all: allPermissions,
        grouped,
        hierarchical
      });
    } catch (error) {
      console.error('Error fetching permissions:', error);
      res.status(500).json({ message: 'Failed to fetch permissions' });
    }
  });

  // PATCH /api/users/:userId/assign-role - Assign a role to a user (admin-only)
  // This endpoint updates the user's role to match a custom or system role name
  app.patch('/api/users/:userId/assign-role', requireRole(['administrator']), async (req, res) => {
    try {
      const { userId } = req.params;
      const { roleName } = req.body;
      
      if (!roleName) {
        // Allow null to revoke access
        await storage.updateUserRole(userId, null);
        return res.json({ message: 'User role revoked' });
      }
      
      // Verify the role exists
      const [role] = await db.select().from(roles).where(eq(roles.name, roleName));
      if (!role) {
        return res.status(400).json({ message: 'Invalid role name' });
      }
      
      await storage.updateUserRole(userId, roleName);
      res.json({ message: 'User role updated successfully', role });
    } catch (error) {
      console.error('Error assigning role:', error);
      res.status(500).json({ message: 'Failed to assign role' });
    }
  });

  // Employee Management API Endpoints

  // GET /api/employees - List all employees (admin-only)
  app.get('/api/employees', requireRole(['administrator']), async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      res.status(500).json({ message: 'Failed to fetch employees' });
    }
  });

  // GET /api/employees/:id - Get single employee (admin-only)
  app.get('/api/employees/:id', requireRole(['administrator']), async (req, res) => {
    try {
      const employeeId = req.params.id;
      const employee = await storage.getEmployee(employeeId);
      
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }
      
      res.json(employee);
    } catch (error) {
      console.error('Error fetching employee:', error);
      res.status(500).json({ message: 'Failed to fetch employee' });
    }
  });

  // POST /api/employees - Create new employee (admin-only)
  app.post('/api/employees', requireRole(['administrator']), async (req, res) => {
    try {
      const employee = await storage.createEmployee(req.body);
      
      // Create recurring expense for salary
      if (employee && employee.salary) {
        // Map payment frequency to recurring type
        // biweekly = every 2 weeks, so we use 'weekly' with interval 2
        const recurringType = employee.paymentFrequency === 'weekly' || employee.paymentFrequency === 'biweekly' ? 'weekly' : 'monthly';
        const recurringInterval = employee.paymentFrequency === 'biweekly' ? 2 : 1;
        
        // Generate expense ID
        const allExpenses = await storage.getExpenses();
        const nextExpenseNum = allExpenses.length + 1;
        const expenseId = `EXP${String(nextExpenseNum).padStart(5, '0')}`;
        
        // Extract day of month from hire date for recurring expense
        const hireDateObj = new Date(employee.hireDate);
        const dayOfMonth = hireDateObj.getDate();
        
        await storage.createExpense({
          expenseId,
          name: `Salary - ${employee.firstName} ${employee.lastName} (${employee.employeeId})`,
          category: 'Salaries',
          amount: employee.salary.toString(),
          currency: employee.currency || 'CZK',
          paymentMethod: 'bank_transfer',
          status: 'pending',
          date: new Date(),
          description: `Recurring salary payment for employee ${employee.employeeId}`,
          isRecurring: true,
          recurringType,
          recurringInterval,
          recurringDayOfMonth: dayOfMonth,
          recurringStartDate: new Date(employee.hireDate),
        });
      }
      
      res.json(employee);
    } catch (error) {
      console.error('Error creating employee:', error);
      res.status(500).json({ message: 'Failed to create employee' });
    }
  });

  // PATCH /api/employees/:id - Update employee (admin-only)
  app.patch('/api/employees/:id', requireRole(['administrator']), async (req, res) => {
    try {
      const employeeId = req.params.id;
      const employee = await storage.updateEmployee(employeeId, req.body);
      
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }
      
      res.json(employee);
    } catch (error) {
      console.error('Error updating employee:', error);
      res.status(500).json({ message: 'Failed to update employee' });
    }
  });

  // DELETE /api/employees/:id - Delete employee (admin-only)
  app.delete('/api/employees/:id', requireRole(['administrator']), async (req, res) => {
    try {
      const employeeId = req.params.id;
      await storage.deleteEmployee(employeeId);
      res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
      console.error('Error deleting employee:', error);
      res.status(500).json({ message: 'Failed to delete employee' });
    }
  });

  // PATCH /api/employees/:id/assign-user - Assign user account to employee (admin-only)
  app.patch('/api/employees/:id/assign-user', requireRole(['administrator']), async (req: any, res) => {
    try {
      const employeeId = req.params.id;
      const { userId } = req.body;
      const adminUser = req.user;

      // Validate that userId is either a string or null
      if (userId !== null && typeof userId !== 'string') {
        return res.status(400).json({ message: 'userId must be a string or null' });
      }

      // Get employee details for logging
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      // Get previous userId before update for comparison
      const previousUserId = employee.userId;

      // Perform the assignment
      await storage.assignUserToEmployee(employeeId, userId);

      // Log activity for the assigned/unassigned user
      if (userId && userId !== previousUserId) {
        // User was assigned to employee
        await storage.createActivityLog({
          userId,
          action: 'user_assigned_to_employee',
          entityType: 'employee',
          entityId: employeeId.toString(),
          metadata: {
            employeeName: employee.name,
            employeeId,
            assignedBy: adminUser.id,
            assignedByName: `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || adminUser.email
          }
        });
      } else if (previousUserId && userId === null) {
        // User was unassigned from employee
        await storage.createActivityLog({
          userId: previousUserId,
          action: 'user_unassigned_from_employee',
          entityType: 'employee',
          entityId: employeeId.toString(),
          metadata: {
            employeeName: employee.name,
            employeeId,
            unassignedBy: adminUser.id,
            unassignedByName: `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || adminUser.email
          }
        });
      }

      res.json({ message: 'User assigned to employee successfully' });
    } catch (error) {
      console.error('Error assigning user to employee:', error);
      res.status(500).json({ message: 'Failed to assign user to employee' });
    }
  });

  // GET /api/employees/:id/stats - Get employee performance stats (admin-only)
  app.get('/api/employees/:id/stats', requireRole(['administrator']), async (req, res) => {
    try {
      const employeeId = req.params.id;
      const stats = await storage.getEmployeeStats(employeeId);
      res.json(stats);
    } catch (error) {
      console.error('Error getting employee stats:', error);
      res.status(500).json({ message: 'Failed to get employee stats' });
    }
  });

  // GET /api/employees/:id/incidents - Get employee incidents (admin-only)
  app.get('/api/employees/:id/incidents', requireRole(['administrator']), async (req, res) => {
    try {
      const employeeId = req.params.id;
      const incidents = await storage.getEmployeeIncidents(employeeId);
      res.json(incidents);
    } catch (error) {
      console.error('Error getting employee incidents:', error);
      res.status(500).json({ message: 'Failed to get employee incidents' });
    }
  });

  // POST /api/employees/:id/incidents - Create new incident (admin-only)
  app.post('/api/employees/:id/incidents', requireRole(['administrator']), async (req: any, res) => {
    try {
      const employeeId = req.params.id;
      const user = req.user;
      
      // Validate request body
      const validated = insertEmployeeIncidentSchema.omit({ id: true, employeeId: true, reportedBy: true, createdAt: true, updatedAt: true }).safeParse(req.body);
      if (!validated.success) {
        return res.status(400).json({ message: 'Invalid incident data', errors: validated.error.errors });
      }
      
      const incidentData = {
        ...validated.data,
        employeeId,
        reportedBy: user?.id || null,
      };
      
      const incident = await storage.createEmployeeIncident(incidentData);
      res.status(201).json(incident);
    } catch (error) {
      console.error('Error creating employee incident:', error);
      res.status(500).json({ message: 'Failed to create incident' });
    }
  });

  // PATCH /api/employees/:employeeId/incidents/:id - Update incident (admin-only)
  app.patch('/api/employees/:employeeId/incidents/:id', requireRole(['administrator']), async (req: any, res) => {
    try {
      const incidentId = req.params.id;
      const user = req.user;
      
      // Validate request body (partial update, all fields optional)
      const updateSchema = insertEmployeeIncidentSchema.omit({ id: true, employeeId: true, reportedBy: true, createdAt: true, updatedAt: true }).partial();
      const validated = updateSchema.safeParse(req.body);
      if (!validated.success) {
        return res.status(400).json({ message: 'Invalid incident data', errors: validated.error.errors });
      }
      
      const updateData: any = { ...validated.data };
      
      // If status is being set to resolved, set resolvedAt and resolvedBy
      if (validated.data.status === 'resolved' || validated.data.status === 'dismissed') {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = user?.id || null;
      }
      
      const incident = await storage.updateEmployeeIncident(incidentId, updateData);
      
      if (!incident) {
        return res.status(404).json({ message: 'Incident not found' });
      }
      
      res.json(incident);
    } catch (error) {
      console.error('Error updating employee incident:', error);
      res.status(500).json({ message: 'Failed to update incident' });
    }
  });

  // DELETE /api/employees/:employeeId/incidents/:id - Delete incident (admin-only)
  app.delete('/api/employees/:employeeId/incidents/:id', requireRole(['administrator']), async (req, res) => {
    try {
      const incidentId = req.params.id;
      await storage.deleteEmployeeIncident(incidentId);
      res.json({ message: 'Incident deleted successfully' });
    } catch (error) {
      console.error('Error deleting employee incident:', error);
      res.status(500).json({ message: 'Failed to delete incident' });
    }
  });

  // GET /api/employees/:id/tasks - Get employee assigned tasks (admin-only)
  app.get('/api/employees/:id/tasks', requireRole(['administrator']), async (req, res) => {
    try {
      const employeeId = req.params.id;
      const employee = await storage.getEmployee(employeeId);
      
      if (!employee?.userId) {
        return res.json([]);
      }
      
      const tasks = await storage.getWarehouseTasks({ assignedToUserId: employee.userId });
      res.json(tasks);
    } catch (error) {
      console.error('Error getting employee tasks:', error);
      res.status(500).json({ message: 'Failed to get employee tasks' });
    }
  });

  // GET /api/employees/:id/activity - Get employee activity log with fulfillment logs (admin-only)
  app.get('/api/employees/:id/activity', requireRole(['administrator']), async (req, res) => {
    try {
      const employeeId = req.params.id;
      const employee = await storage.getEmployee(employeeId);
      
      if (!employee?.userId) {
        return res.json([]);
      }
      
      const [activityLogs, fulfillmentLogs] = await Promise.all([
        storage.getActivityLogs({ userId: employee.userId, limit: 100 }),
        storage.getOrderFulfillmentLogsByUserId(employee.userId, 100)
      ]);

      const activityItems = activityLogs.map(log => ({
        ...log,
        source: 'activity' as const,
        timestamp: new Date(log.createdAt).getTime()
      }));

      const fulfillmentItems = fulfillmentLogs.map(log => ({
        ...log,
        source: 'fulfillment' as const,
        timestamp: new Date(log.startedAt).getTime()
      }));

      const combined = [...activityItems, ...fulfillmentItems]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 100);
      
      res.json(combined);
    } catch (error) {
      console.error('Error getting employee activity:', error);
      res.status(500).json({ message: 'Failed to get employee activity' });
    }
  });

  // Activity Log API Endpoints

  // GET /api/activity-log - Get all activity logs with optional filtering (admin-only)
  app.get('/api/activity-log', requireRole(['administrator']), async (req, res) => {
    try {
      const { userId, limit, offset } = req.query;

      const options: { userId?: string; limit?: number; offset?: number } = {};

      if (userId && typeof userId === 'string') {
        options.userId = userId;
      }

      if (limit && typeof limit === 'string') {
        const parsedLimit = parseInt(limit);
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
          options.limit = parsedLimit;
        }
      }

      if (offset && typeof offset === 'string') {
        const parsedOffset = parseInt(offset);
        if (!isNaN(parsedOffset) && parsedOffset >= 0) {
          options.offset = parsedOffset;
        }
      }

      const logs = await storage.getActivityLogs(options);
      res.json(logs);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      res.status(500).json({ message: 'Failed to fetch activity logs' });
    }
  });

  // GET /api/activity-log/:userId - Get activity logs for a specific user (admin-only)
  app.get('/api/activity-log/:userId', requireRole(['administrator']), async (req, res) => {
    try {
      const { userId } = req.params;
      const logs = await storage.getActivityLogsByUserId(userId);
      res.json(logs);
    } catch (error) {
      console.error('Error fetching activity logs for user:', error);
      res.status(500).json({ message: 'Failed to fetch activity logs for user' });
    }
  });

  // POST /api/activity-log - Create a new activity log entry
  app.post('/api/activity-log', isAuthenticated, async (req: any, res) => {
    try {
      const validation = insertActivityLogSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid activity log data', 
          errors: validation.error.errors 
        });
      }

      const log = await storage.createActivityLog(validation.data);
      res.json(log);
    } catch (error) {
      console.error('Error creating activity log:', error);
      res.status(500).json({ message: 'Failed to create activity log' });
    }
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
  app.get('/api/dashboard/metrics', requireRole(['administrator']), cacheMiddleware(60000), async (req, res) => {
    try {
      // Fetch exchange rates from Frankfurter API
      const exchangeRateResponse = await fetch('https://api.frankfurter.app/latest?from=EUR');
      const exchangeRates = await exchangeRateResponse.json();

      const metrics = await storage.getDashboardMetrics();
      const allOrders = await storage.getOrders();
      const allExpenses = await storage.getExpenses();

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

      // Filter expenses by date ranges (only 'paid' expenses count)
      const todayExpenses = allExpenses.filter(expense => {
        if (expense.status !== 'paid') return false;
        const expenseDate = new Date(expense.date!);
        expenseDate.setHours(0, 0, 0, 0);
        return expenseDate.getTime() === today.getTime();
      });

      // End of today (to avoid counting future-dated expenses)
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const thisMonthExpenses = allExpenses.filter(expense => {
        if (expense.status !== 'paid') return false;
        const expenseDate = new Date(expense.date!);
        return expenseDate >= thisMonthStart && expenseDate <= todayEnd;
      });

      const lastMonthExpenses = allExpenses.filter(expense => {
        if (expense.status !== 'paid') return false;
        const expenseDate = new Date(expense.date!);
        return expenseDate >= lastMonthStart && expenseDate <= lastMonthEnd;
      });

      // Calculate total expenses in EUR
      const calculateExpensesInEur = (expenses: Expense[]) => {
        return expenses.reduce((sum, expense) => {
          const amount = parseFloat(expense.amount || '0');
          return sum + convertToEur(amount, expense.currency || 'CZK');
        }, 0);
      };

      const todayExpensesEur = calculateExpensesInEur(todayExpenses);
      const thisMonthExpensesEur = calculateExpensesInEur(thisMonthExpenses);
      const lastMonthExpensesEur = calculateExpensesInEur(lastMonthExpenses);

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

      // Calculate profit in EUR using stored totalCost (Profit = Grand Total - Total Cost)
      // Uses order.totalCost which is pre-calculated from item landing costs
      const calculateProfitInEur = (orders: any[]) => {
        return orders.reduce((sum, order) => {
          // Only count shipped and paid orders for profit
          if (order.orderStatus !== 'shipped' || order.paymentStatus !== 'paid') {
            return sum;
          }
          const grandTotal = parseFloat(order.grandTotal || '0');
          const totalCost = parseFloat(order.totalCost || '0');
          const profit = grandTotal - totalCost;
          return sum + convertToEur(profit, order.currency);
        }, 0);
      };

      // Calculate base profits (from orders only)
      const baseProfitToday = calculateProfitInEur(todayShippedOrders);
      const baseProfitThisMonth = calculateProfitInEur(thisMonthOrders);
      const baseProfitLastMonth = calculateProfitInEur(lastMonthOrders);

      // Net profit = order profit - expenses (expenses reduce profit)
      const metricsWithConversion = {
        fulfillOrdersToday,
        totalOrdersToday: todayShippedOrders.length,
        totalRevenueToday: calculateRevenueInEur(todayShippedOrders),
        totalProfitToday: baseProfitToday - todayExpensesEur,
        thisMonthRevenue: calculateRevenueInEur(thisMonthOrders),
        thisMonthProfit: baseProfitThisMonth - thisMonthExpensesEur,
        lastMonthRevenue: calculateRevenueInEur(lastMonthOrders),
        lastMonthProfit: baseProfitLastMonth - lastMonthExpensesEur,
        // Include expense totals for transparency
        todayExpenses: todayExpensesEur,
        thisMonthExpenses: thisMonthExpensesEur,
        lastMonthExpenses: lastMonthExpensesEur,
        exchangeRates: exchangeRates.eur
      };

      res.json(metricsWithConversion);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  app.get('/api/dashboard/financial-summary', requireRole(['administrator']), cacheMiddleware(60000), async (req, res) => {
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
      const allExpenses = await storage.getExpenses();

      // Generate monthly summary
      const monthlySummary = [];
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

        const monthOrders = allOrders.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= monthStart && orderDate <= monthEnd && order.orderStatus === 'shipped' && order.paymentStatus === 'paid';
        });

        // Filter expenses for this month (only paid expenses count)
        const monthExpenses = allExpenses.filter(expense => {
          if (expense.status !== 'paid') return false;
          const expenseDate = new Date(expense.date!);
          return expenseDate >= monthStart && expenseDate <= monthEnd;
        });

        // Calculate monthly expenses in EUR
        const monthExpensesEur = monthExpenses.reduce((sum, expense) => {
          const amount = parseFloat(expense.amount || '0');
          return sum + convertToEur(amount, expense.currency || 'CZK');
        }, 0);

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

        // Calculate base profit (from orders) in EUR
        const baseProfitEur = monthOrders.reduce((sum, order) => {
          const grandTotal = parseFloat(order.grandTotal || '0');
          const totalCost = parseFloat(order.totalCost || '0');
          const tax = parseFloat(order.tax || '0');
          const discount = parseFloat(order.discount || '0');
          const shippingPaid = parseFloat(order.shippingCost || '0');
          const actualShippingCost = parseFloat(order.actualShippingCost || shippingPaid);
          const profit = grandTotal - totalCost - tax - discount - (shippingPaid - actualShippingCost);
          return sum + convertToEur(profit, order.currency);
        }, 0);

        // Net profit = order profit - expenses
        const totalProfitEur = baseProfitEur - monthExpensesEur;

        // Convert EUR totals to CZK
        const eurToCzk = exchangeRates.rates?.CZK || 25.0;
        const totalProfitCzk = totalProfitEur * eurToCzk;
        const totalRevenueCzk = totalRevenueEur * eurToCzk;
        const monthExpensesCzk = monthExpensesEur * eurToCzk;

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
          orderCount: monthOrders.length,
          // Include expense data for transparency
          expensesEur: monthExpensesEur,
          expensesCzk: monthExpensesCzk,
          expenseCount: monthExpenses.length
        });
      }

      res.json(monthlySummary);
    } catch (error) {
      console.error("Error fetching financial summary:", error);
      res.status(500).json({ message: "Failed to fetch financial summary" });
    }
  });

  app.get('/api/dashboard/activities', requireRole(['administrator']), cacheMiddleware(30000), async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const activities = await storage.getUserActivities(limit);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching user activities:", error);
      res.status(500).json({ message: "Failed to fetch user activities" });
    }
  });

  app.get('/api/dashboard/recently-received', requireRole(['administrator']), cacheMiddleware(60000), async (req, res) => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentReceiptItems = await db.select({
        productName: products.name,
        receivedAt: receipts.receivedAt,
        sku: receiptItems.sku,
      })
        .from(receiptItems)
        .innerJoin(receipts, eq(receiptItems.receiptId, receipts.id))
        .leftJoin(products, eq(receiptItems.productId, products.id))
        .where(
          and(
            sql`${receipts.receivedAt} >= ${sevenDaysAgo.toISOString()}`,
            eq(receipts.status, 'approved')
          )
        )
        .orderBy(desc(receipts.receivedAt))
        .limit(20);

      const uniqueProducts = [...new Set(recentReceiptItems.map(item => item.productName || item.sku || 'Unknown Item'))];
      const latestReceivedAt = recentReceiptItems.length > 0 ? recentReceiptItems[0].receivedAt : null;

      res.json({
        products: uniqueProducts,
        receivedAt: latestReceivedAt,
        count: recentReceiptItems.length
      });
    } catch (error) {
      console.error("Error fetching recently received items:", error);
      res.status(500).json({ message: "Failed to fetch recently received items" });
    }
  });

  // New Admin Dashboard Endpoints

  // Operations Pulse Metrics
  app.get('/api/dashboard/operations-pulse', requireRole(['administrator']), cacheMiddleware(60000), async (req, res) => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      // Orders awaiting fulfillment (exclude archived orders)
      const ordersToFulfill = await db.select()
        .from(orders)
        .where(
          and(
            eq(orders.orderStatus, 'to_fulfill'),
            eq(orders.isArchived, false)
          )
        );

      // Orders at risk of SLA breach (>24 hours in to_fulfill status)
      const ordersAtRisk = ordersToFulfill.filter(order => {
        const createdAt = new Date(order.createdAt);
        return createdAt < yesterday;
      });

      // Pick/pack throughput today (orders moved to fulfilled today, exclude archived)
      const fulfilledToday = await db.select()
        .from(orders)
        .where(
          and(
            eq(orders.orderStatus, 'fulfilled'),
            eq(orders.isArchived, false),
            sql`${orders.updatedAt} >= ${today.toISOString()}`
          )
        );

      // Carrier exceptions (simplified - checking for specific statuses, exclude archived)
      const carrierExceptions = await db.select()
        .from(orders)
        .where(
          and(
            eq(orders.isArchived, false),
            or(
              ilike(orders.notes, '%failed%delivery%'),
              ilike(orders.notes, '%exception%'),
              ilike(orders.notes, '%delay%')
            )
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
  app.get('/api/dashboard/financial-control', requireRole(['administrator']), cacheMiddleware(60000), async (req, res) => {
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
  app.get('/api/dashboard/inventory-risk', requireRole(['administrator']), cacheMiddleware(60000), async (req, res) => {
    try {
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      // Low stock count - supports none, percentage, and amount types
      const allProducts = await storage.getProducts();
      const lowStockProducts = allProducts.filter(p => {
        if (!p.isActive) return false;
        const quantity = p.quantity || 0;
        const alertType = p.lowStockAlertType || 'percentage';
        const alertValue = p.lowStockAlert || 45;
        
        // Skip products with 'none' alert type
        if (alertType === 'none') return false;
        
        if (alertType === 'percentage') {
          const maxStock = p.maxStockLevel || 100;
          const threshold = Math.ceil((maxStock * alertValue) / 100);
          return quantity <= threshold;
        } else {
          return quantity <= alertValue;
        }
      });

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

  // Inventory Dashboard - Real-time visual dashboard for all users
  app.get('/api/dashboard/inventory', isAuthenticated, cacheMiddleware(30000), async (req, res) => {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      // Get all active products
      const allProducts = await storage.getProducts();
      const activeProducts = allProducts.filter(p => p.isActive !== false);

      // Helper function to get product value in EUR
      // Uses EUR price if available, otherwise converts CZK to EUR
      const CZK_TO_EUR_RATE = 0.04; // Approximate rate: 1 CZK = 0.04 EUR
      const getProductValueEur = (product: any): number => {
        const priceEur = parseFloat(product.priceEur || '0');
        if (priceEur > 0) return priceEur;
        
        const priceCzk = parseFloat(product.priceCzk || '0');
        if (priceCzk > 0) return priceCzk * CZK_TO_EUR_RATE;
        
        return 0;
      };

      // Calculate total inventory value (converted to EUR)
      let totalInventoryValue = 0;
      let totalUnits = 0;
      activeProducts.forEach(p => {
        const qty = p.quantity || 0;
        const priceEur = getProductValueEur(p);
        totalInventoryValue += qty * priceEur;
        totalUnits += qty;
      });

      // Low stock products - supports none, percentage, and amount types
      const lowStockProducts = activeProducts.filter(p => {
        const quantity = p.quantity || 0;
        const alertType = p.lowStockAlertType || 'percentage';
        const alertValue = p.lowStockAlert || 45;
        
        // Skip products with 'none' alert type
        if (alertType === 'none') return false;
        
        if (alertType === 'percentage') {
          const maxStock = p.maxStockLevel || 100;
          const threshold = Math.ceil((maxStock * alertValue) / 100);
          return quantity <= threshold && quantity > 0;
        } else {
          return quantity <= alertValue && quantity > 0;
        }
      });

      // Out of stock products
      const outOfStockProducts = activeProducts.filter(p => (p.quantity || 0) === 0);

      // Overstocked products (quantity > maxStockLevel)
      const overstockedProducts = activeProducts.filter(p => {
        const maxStock = p.maxStockLevel || 0;
        return maxStock > 0 && (p.quantity || 0) > maxStock;
      });

      // Healthy stock (not low, not out, not over)
      const healthyStockProducts = activeProducts.filter(p => {
        const quantity = p.quantity || 0;
        if (quantity === 0) return false;
        
        const alertType = p.lowStockAlertType || 'percentage';
        const alertValue = p.lowStockAlert || 45;
        const maxStock = p.maxStockLevel || 100;
        
        // Products with 'none' alert type are considered healthy (no low stock check)
        let isLow = false;
        if (alertType !== 'none') {
          if (alertType === 'percentage') {
            const threshold = Math.ceil((maxStock * alertValue) / 100);
            isLow = quantity <= threshold;
          } else {
            isLow = quantity <= alertValue;
          }
        }
        
        const isOver = maxStock > 0 && quantity > maxStock;
        return !isLow && !isOver;
      });

      // Stock by category
      const allCategories = await storage.getCategories();
      const stockByCategory = allCategories.map(cat => {
        const catProducts = activeProducts.filter(p => p.categoryId === cat.id);
        const totalQty = catProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);
        const totalValue = catProducts.reduce((sum, p) => {
          const priceEur = getProductValueEur(p);
          return sum + (p.quantity || 0) * priceEur;
        }, 0);
        return {
          id: cat.id,
          name: cat.name,
          productCount: catProducts.length,
          totalQuantity: totalQty,
          totalValue: Math.round(totalValue * 100) / 100
        };
      }).filter(c => c.productCount > 0).sort((a, b) => b.totalValue - a.totalValue);

      // Stock by warehouse
      const allWarehouses = await storage.getWarehouses();
      const stockByWarehouse = allWarehouses.map(wh => {
        const whProducts = activeProducts.filter(p => p.warehouseId === wh.id);
        const totalQty = whProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);
        const totalValue = whProducts.reduce((sum, p) => {
          const priceEur = getProductValueEur(p);
          return sum + (p.quantity || 0) * priceEur;
        }, 0);
        return {
          id: wh.id,
          name: wh.name,
          productCount: whProducts.length,
          totalQuantity: totalQty,
          totalValue: Math.round(totalValue * 100) / 100
        };
      }).filter(w => w.productCount > 0);

      // Slow-moving inventory (no updates in 90 days with stock > 0)
      const slowMovingProducts = activeProducts.filter(p => {
        const lastUpdated = new Date(p.updatedAt || p.createdAt || now);
        return lastUpdated < ninetyDaysAgo && (p.quantity || 0) > 0;
      });

      // Fast-moving products (based on unitsSold)
      const fastMovingProducts = [...activeProducts]
        .filter(p => (p.unitsSold || 0) > 0)
        .sort((a, b) => (b.unitsSold || 0) - (a.unitsSold || 0))
        .slice(0, 10)
        .map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          quantity: p.quantity || 0,
          unitsSold: p.unitsSold || 0
        }));

      // Stock status distribution for pie chart
      const stockDistribution = {
        healthy: healthyStockProducts.length,
        lowStock: lowStockProducts.length,
        outOfStock: outOfStockProducts.length,
        overstocked: overstockedProducts.length
      };

      // Top low stock products for action
      const topLowStockProducts = lowStockProducts
        .sort((a, b) => (a.quantity || 0) - (b.quantity || 0))
        .slice(0, 10)
        .map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          quantity: p.quantity || 0,
          minStockLevel: p.minStockLevel || 0,
          lowStockAlert: p.lowStockAlert || 45,
          categoryName: allCategories.find(c => c.id === p.categoryId)?.name
        }));

      // Pending incoming shipments count
      const pendingPurchases = await db.select({ count: sql<number>`count(*)` })
        .from(importPurchases)
        .where(
          or(
            eq(importPurchases.status, 'pending'),
            eq(importPurchases.status, 'shipped'),
            eq(importPurchases.status, 'in_transit')
          )
        );
      const incomingShipmentsCount = pendingPurchases[0]?.count || 0;

      res.json({
        summary: {
          totalProducts: activeProducts.length,
          totalUnits,
          totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
          healthyStock: healthyStockProducts.length,
          lowStock: lowStockProducts.length,
          outOfStock: outOfStockProducts.length,
          overstocked: overstockedProducts.length,
          slowMoving: slowMovingProducts.length,
          incomingShipments: incomingShipmentsCount
        },
        stockDistribution,
        stockByCategory: stockByCategory.slice(0, 8),
        stockByWarehouse,
        topLowStockProducts,
        fastMovingProducts,
        timestamp: now.toISOString()
      });
    } catch (error) {
      console.error("Error fetching inventory dashboard:", error);
      res.status(500).json({ message: "Failed to fetch inventory dashboard" });
    }
  });

  // Fulfillment Efficiency Metrics
  app.get('/api/dashboard/fulfillment-efficiency', requireRole(['administrator']), cacheMiddleware(60000), async (req, res) => {
    try {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Pick errors count (from returns with picking_error reason this month)
      const returns = await storage.getReturns();
      const pickErrors = returns.filter((r: any) => {
        const createdAt = new Date(r.createdAt || r.returnDate);
        return r.reason === 'picking_error' && createdAt >= thisMonthStart;
      });

      // AI carton recommendations used (exclude deleted orders)
      const thisMonthOrders = await db.select()
        .from(orders)
        .where(
          and(
            eq(orders.isArchived, false),
            sql`${orders.createdAt} >= ${thisMonthStart.toISOString()}`
          )
        );

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
  app.get('/api/dashboard/customer-support', requireRole(['administrator']), cacheMiddleware(60000), async (req, res) => {
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
  app.get('/api/dashboard/system-alerts', requireRole(['administrator']), cacheMiddleware(30000), async (req, res) => {
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

      // Integration health status (simplified - check for recent order processing, exclude deleted)
      const recentOrders = await db.select()
        .from(orders)
        .where(
          and(
            eq(orders.isArchived, false),
            sql`${orders.createdAt} >= ${twentyFourHoursAgo.toISOString()}`
          )
        )
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

  // Dashboard Action Items (preorders, tickets, discounts, incoming shipments)
  app.get('/api/dashboard/action-items', requireRole(['administrator']), cacheMiddleware(30000), async (req, res) => {
    try {
      const now = new Date();

      // 1. Pre-orders awaiting customer notice (pending or partially_arrived)
      const allPreOrders = await db.select({
        id: preOrders.id,
        customerId: preOrders.customerId,
        status: preOrders.status,
        expectedDate: preOrders.expectedDate,
        reminderEnabled: preOrders.reminderEnabled,
        priority: preOrders.priority,
        notes: preOrders.notes,
        createdAt: preOrders.createdAt
      }).from(preOrders).where(
        or(
          eq(preOrders.status, 'pending'),
          eq(preOrders.status, 'partially_arrived')
        )
      );

      // Get customer names for preorders
      const preOrdersWithCustomers = await Promise.all(
        allPreOrders.map(async (po) => {
          const customer = await db.select({
            name: customers.name,
            phone: customers.phone
          }).from(customers).where(eq(customers.id, po.customerId)).limit(1);
          return {
            ...po,
            customerName: customer[0]?.name || 'Unknown',
            customerPhone: customer[0]?.phone
          };
        })
      );

      // 2. Open tickets to solve
      const openTickets = await db.select({
        id: tickets.id,
        ticketId: tickets.ticketId,
        subject: tickets.subject,
        severity: tickets.severity,
        status: tickets.status,
        customerId: tickets.customerId,
        orderId: tickets.orderId,
        createdAt: tickets.createdAt
      }).from(tickets).where(
        or(
          eq(tickets.status, 'open'),
          eq(tickets.status, 'in_progress')
        )
      ).orderBy(desc(tickets.createdAt)).limit(10);

      // Get customer names for tickets
      const ticketsWithCustomers = await Promise.all(
        openTickets.map(async (ticket) => {
          if (ticket.customerId) {
            const customer = await db.select({
              name: customers.name
            }).from(customers).where(eq(customers.id, ticket.customerId)).limit(1);
            return {
              ...ticket,
              customerName: customer[0]?.name || 'Unknown'
            };
          }
          return { ...ticket, customerName: null };
        })
      );

      // 3. Active discounts (currently running - started and not expired)
      const todayStr = now.toISOString().split('T')[0];
      const activeDiscounts = await db.select({
        id: discounts.id,
        discountId: discounts.discountId,
        name: discounts.name,
        type: discounts.type,
        percentage: discounts.percentage,
        value: discounts.value,
        minOrderAmount: discounts.minOrderAmount,
        startDate: discounts.startDate,
        endDate: discounts.endDate,
        applicationScope: discounts.applicationScope
      }).from(discounts).where(
        and(
          eq(discounts.status, 'active'),
          // Start date: must be null (immediate) or in the past/today
          or(
            isNull(discounts.startDate),
            sql`${discounts.startDate} <= ${todayStr}`
          ),
          // End date: must be null (forever) or in the future/today
          or(
            isNull(discounts.endDate),
            sql`${discounts.endDate} >= ${todayStr}`
          )
        )
      );

      // 4. Incoming PO shipments (pending or in transit)
      const incomingShipments = await db.select({
        id: shipments.id,
        shipmentName: shipments.shipmentName,
        carrier: shipments.carrier,
        trackingNumber: shipments.trackingNumber,
        status: shipments.status,
        origin: shipments.origin,
        destination: shipments.destination,
        estimatedDelivery: shipments.estimatedDelivery,
        totalUnits: shipments.totalUnits,
        createdAt: shipments.createdAt
      }).from(shipments).where(
        or(
          eq(shipments.status, 'pending'),
          eq(shipments.status, 'in transit')
        )
      ).orderBy(shipments.estimatedDelivery).limit(10);

      res.json({
        preordersAwaitingNotice: preOrdersWithCustomers,
        preordersCount: preOrdersWithCustomers.length,
        openTickets: ticketsWithCustomers,
        openTicketsCount: ticketsWithCustomers.length,
        ticketsBySeverity: {
          urgent: ticketsWithCustomers.filter(t => t.severity === 'urgent').length,
          high: ticketsWithCustomers.filter(t => t.severity === 'high').length,
          medium: ticketsWithCustomers.filter(t => t.severity === 'medium').length,
          low: ticketsWithCustomers.filter(t => t.severity === 'low').length
        },
        activeDiscounts: activeDiscounts,
        activeDiscountsCount: activeDiscounts.length,
        incomingShipments: incomingShipments,
        incomingShipmentsCount: incomingShipments.length,
        timestamp: now.toISOString()
      });
    } catch (error) {
      console.error("Error fetching dashboard action items:", error);
      res.status(500).json({ message: "Failed to fetch dashboard action items" });
    }
  });

  // Fulfillment Pipeline - orders flow through fulfillment stages
  app.get('/api/dashboard/fulfillment-pipeline', requireRole(['administrator', 'warehouse_operator']), cacheMiddleware(30000), async (req, res) => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get all non-archived orders
      const allOrders = await storage.getOrders();

      // Orders in queue (to_fulfill status)
      const inQueue = allOrders.filter(o => o.orderStatus === 'to_fulfill');

      // Orders currently being picked
      const inPicking = allOrders.filter(o => o.fulfillmentStage === 'picking' || o.pickStatus === 'in_progress');

      // Orders currently being packed
      const inPacking = allOrders.filter(o => o.fulfillmentStage === 'packing' || o.packStatus === 'in_progress');

      // Orders ready to ship
      const readyToShip = allOrders.filter(o => o.orderStatus === 'ready_to_ship');

      // Orders shipped in last 24 hours
      const shippedLast24h = allOrders.filter(o => {
        if (o.orderStatus !== 'shipped' || !o.shippedAt) return false;
        const shippedAt = new Date(o.shippedAt);
        return shippedAt >= twentyFourHoursAgo;
      });

      // Orders added to fulfill in last 24 hours
      const addedToFulfillLast24h = allOrders.filter(o => {
        const createdAt = new Date(o.createdAt);
        return createdAt >= twentyFourHoursAgo && 
               (o.orderStatus === 'to_fulfill' || o.orderStatus === 'ready_to_ship' || o.orderStatus === 'shipped');
      });

      // Recent activity timeline (last 24 hours)
      const recentActivity: Array<{ type: string; orderId: string; timestamp: string; customerName?: string }> = [];

      // Add shipped orders to timeline
      for (const order of shippedLast24h.slice(0, 10)) {
        recentActivity.push({
          type: 'shipped',
          orderId: order.orderId || order.id,
          timestamp: order.shippedAt!,
          customerName: order.customer?.name || order.guestName
        });
      }

      // Add recently created orders to timeline
      for (const order of addedToFulfillLast24h.slice(0, 10)) {
        recentActivity.push({
          type: 'added_to_queue',
          orderId: order.orderId || order.id,
          timestamp: order.createdAt,
          customerName: order.customer?.name || order.guestName
        });
      }

      // Sort by timestamp descending
      recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Calculate throughput metrics
      const avgProcessingTimeMs = shippedLast24h.reduce((sum, o) => {
        const created = new Date(o.createdAt).getTime();
        const shipped = new Date(o.shippedAt!).getTime();
        return sum + (shipped - created);
      }, 0) / (shippedLast24h.length || 1);

      const avgProcessingHours = Math.round(avgProcessingTimeMs / (1000 * 60 * 60) * 10) / 10;

      res.json({
        pipeline: {
          inQueue: inQueue.length,
          inPicking: inPicking.length,
          inPacking: inPacking.length,
          readyToShip: readyToShip.length,
          shippedLast24h: shippedLast24h.length
        },
        metrics: {
          addedLast24h: addedToFulfillLast24h.length,
          shippedLast24h: shippedLast24h.length,
          avgProcessingHours
        },
        recentActivity: recentActivity.slice(0, 15),
        timestamp: now.toISOString()
      });
    } catch (error) {
      console.error("Error fetching fulfillment pipeline:", error);
      res.status(500).json({ message: "Failed to fetch fulfillment pipeline" });
    }
  });

  // Sales Growth KPIs - daily/weekly trends, velocity, best sellers
  app.get('/api/dashboard/sales-growth', requireRole(['administrator']), cacheMiddleware(60000), async (req, res) => {
    try {
      const convertToEur = await getCurrencyConverter();
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const thisWeekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);
      const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastWeekEnd = new Date(thisWeekStart.getTime() - 1);
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const allOrders = await storage.getOrders();
      const paidOrders = allOrders.filter(o => o.paymentStatus === 'paid');

      // Daily sales (last 7 days)
      const dailySales: { date: string; revenue: number; orders: number; profit: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
        const dayOrders = paidOrders.filter(o => {
          const orderDate = new Date(o.createdAt);
          return orderDate >= dayStart && orderDate <= dayEnd;
        });
        const revenue = dayOrders.reduce((sum, o) => sum + convertToEur(parseFloat(o.grandTotal || '0'), o.currency || 'EUR'), 0);
        const cost = dayOrders.reduce((sum, o) => sum + convertToEur(parseFloat(o.totalCost || '0'), o.currency || 'EUR'), 0);
        dailySales.push({
          date: dayStart.toISOString().split('T')[0],
          revenue: Math.round(revenue * 100) / 100,
          orders: dayOrders.length,
          profit: Math.round((revenue - cost) * 100) / 100
        });
      }

      // Today's metrics
      const todayOrders = paidOrders.filter(o => new Date(o.createdAt) >= today);
      const todayRevenue = todayOrders.reduce((sum, o) => sum + convertToEur(parseFloat(o.grandTotal || '0'), o.currency || 'EUR'), 0);
      const todayCost = todayOrders.reduce((sum, o) => sum + convertToEur(parseFloat(o.totalCost || '0'), o.currency || 'EUR'), 0);
      const todayProfit = todayRevenue - todayCost;

      // Yesterday's comparison
      const yesterdayOrders = paidOrders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= yesterday && orderDate < today;
      });
      const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + convertToEur(parseFloat(o.grandTotal || '0'), o.currency || 'EUR'), 0);
      const yesterdayCost = yesterdayOrders.reduce((sum, o) => sum + convertToEur(parseFloat(o.totalCost || '0'), o.currency || 'EUR'), 0);
      const yesterdayProfit = yesterdayRevenue - yesterdayCost;

      // This week vs last week
      const thisWeekOrders = paidOrders.filter(o => new Date(o.createdAt) >= thisWeekStart);
      const thisWeekRevenue = thisWeekOrders.reduce((sum, o) => sum + convertToEur(parseFloat(o.grandTotal || '0'), o.currency || 'EUR'), 0);

      const lastWeekOrders = paidOrders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= lastWeekStart && orderDate <= lastWeekEnd;
      });
      const lastWeekRevenue = lastWeekOrders.reduce((sum, o) => sum + convertToEur(parseFloat(o.grandTotal || '0'), o.currency || 'EUR'), 0);

      // This month vs last month
      const thisMonthOrders = paidOrders.filter(o => new Date(o.createdAt) >= thisMonthStart);
      const thisMonthRevenue = thisMonthOrders.reduce((sum, o) => sum + convertToEur(parseFloat(o.grandTotal || '0'), o.currency || 'EUR'), 0);

      const lastMonthOrders = paidOrders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= lastMonthStart && orderDate <= lastMonthEnd;
      });
      const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + convertToEur(parseFloat(o.grandTotal || '0'), o.currency || 'EUR'), 0);

      // Sales velocity (orders per day in last 30 days)
      const last30DaysOrders = paidOrders.filter(o => new Date(o.createdAt) >= thirtyDaysAgo);
      const salesVelocity = last30DaysOrders.length / 30;

      // Best selling products (last 30 days)
      const productSales = new Map<string, { productId: string; name: string; sku: string; unitsSold: number; revenue: number }>();
      const allProducts = await storage.getProducts();
      
      for (const order of last30DaysOrders) {
        if (order.items && Array.isArray(order.items)) {
          for (const item of order.items) {
            const productId = item.productId || item.id;
            const quantity = item.quantity || 1;
            const itemRevenue = convertToEur(parseFloat(item.price || '0') * quantity, order.currency || 'EUR');
            
            if (productSales.has(productId)) {
              const existing = productSales.get(productId)!;
              existing.unitsSold += quantity;
              existing.revenue += itemRevenue;
            } else {
              const product = allProducts.find(p => p.id === productId);
              productSales.set(productId, {
                productId,
                name: product?.name || item.name || 'Unknown',
                sku: product?.sku || item.sku || '',
                unitsSold: quantity,
                revenue: itemRevenue
              });
            }
          }
        }
      }

      const topSellingProducts = Array.from(productSales.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
        .map(p => ({
          ...p,
          revenue: Math.round(p.revenue * 100) / 100
        }));

      // Average order value trends
      const todayAOV = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;
      const thisWeekAOV = thisWeekOrders.length > 0 ? thisWeekRevenue / thisWeekOrders.length : 0;
      const thisMonthAOV = thisMonthOrders.length > 0 ? thisMonthRevenue / thisMonthOrders.length : 0;

      res.json({
        dailySales,
        todayMetrics: {
          revenue: Math.round(todayRevenue * 100) / 100,
          profit: Math.round(todayProfit * 100) / 100,
          orders: todayOrders.length,
          aov: Math.round(todayAOV * 100) / 100,
          changeVsYesterday: yesterdayRevenue > 0 ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 10000) / 100 : 0,
          profitChangeVsYesterday: yesterdayProfit > 0 ? Math.round(((todayProfit - yesterdayProfit) / yesterdayProfit) * 10000) / 100 : (todayProfit > 0 ? 100 : 0)
        },
        weeklyComparison: {
          thisWeekRevenue: Math.round(thisWeekRevenue * 100) / 100,
          thisWeekOrders: thisWeekOrders.length,
          lastWeekRevenue: Math.round(lastWeekRevenue * 100) / 100,
          lastWeekOrders: lastWeekOrders.length,
          changePercent: lastWeekRevenue > 0 ? Math.round(((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 10000) / 100 : 0
        },
        monthlyComparison: {
          thisMonthRevenue: Math.round(thisMonthRevenue * 100) / 100,
          thisMonthOrders: thisMonthOrders.length,
          lastMonthRevenue: Math.round(lastMonthRevenue * 100) / 100,
          lastMonthOrders: lastMonthOrders.length,
          changePercent: lastMonthRevenue > 0 ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 10000) / 100 : 0
        },
        salesVelocity: {
          ordersPerDay: Math.round(salesVelocity * 100) / 100,
          avgRevenuePerDay: Math.round((last30DaysOrders.reduce((sum, o) => sum + convertToEur(parseFloat(o.grandTotal || '0'), o.currency || 'EUR'), 0) / 30) * 100) / 100
        },
        averageOrderValue: {
          today: Math.round(todayAOV * 100) / 100,
          thisWeek: Math.round(thisWeekAOV * 100) / 100,
          thisMonth: Math.round(thisMonthAOV * 100) / 100
        },
        topSellingProducts,
        timestamp: now.toISOString()
      });
    } catch (error) {
      console.error("Error fetching sales growth metrics:", error);
      res.status(500).json({ message: "Failed to fetch sales growth metrics" });
    }
  });

  // Inventory Health & Turnover KPIs
  app.get('/api/dashboard/inventory-health', requireRole(['administrator']), cacheMiddleware(60000), async (req, res) => {
    try {
      const convertToEur = await getCurrencyConverter();
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      const allProducts = await storage.getProducts();
      const activeProducts = allProducts.filter(p => p.isActive !== false);
      const allOrders = await storage.getOrders();
      const paidOrders = allOrders.filter(o => o.paymentStatus === 'paid');

      // Calculate total inventory value
      let totalInventoryValue = 0;
      let totalUnits = 0;
      activeProducts.forEach(p => {
        const qty = p.quantity || 0;
        const landingCost = parseFloat(p.landingCostEur || p.landingCostCzk || '0');
        const landingCostEur = p.landingCostEur ? parseFloat(p.landingCostEur) : convertToEur(landingCost, 'CZK');
        totalInventoryValue += qty * landingCostEur;
        totalUnits += qty;
      });

      // Calculate COGS for last 30 days
      const last30DaysOrders = paidOrders.filter(o => new Date(o.createdAt) >= thirtyDaysAgo);
      let totalCOGS30Days = 0;
      let totalUnitsSold30Days = 0;

      for (const order of last30DaysOrders) {
        totalCOGS30Days += convertToEur(parseFloat(order.totalCost || '0'), order.currency || 'EUR');
        if (order.items && Array.isArray(order.items)) {
          for (const item of order.items) {
            totalUnitsSold30Days += item.quantity || 1;
          }
        }
      }

      // Inventory turnover ratio (annualized)
      const avgInventory = totalInventoryValue; // Using current as proxy for average
      const monthlyTurnover = avgInventory > 0 ? (totalCOGS30Days / avgInventory) : 0;
      const annualizedTurnover = monthlyTurnover * 12;

      // Days of supply
      const dailyUnitsSold = totalUnitsSold30Days / 30;
      const daysOfSupply = dailyUnitsSold > 0 ? Math.round(totalUnits / dailyUnitsSold) : 999;

      // Sell-through rate (last 30 days)
      const sellThroughRate = totalUnits > 0 ? (totalUnitsSold30Days / (totalUnits + totalUnitsSold30Days)) * 100 : 0;

      // Stock coverage analysis
      const productsWithCoverage = activeProducts.map(p => {
        const qty = p.quantity || 0;
        const unitsSold = p.unitsSold || 0;
        const dailySalesRate = unitsSold > 0 ? unitsSold / 90 : 0; // Estimate from total units sold
        const coverageDays = dailySalesRate > 0 ? Math.round(qty / dailySalesRate) : 999;
        
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          quantity: qty,
          coverageDays,
          dailySalesRate: Math.round(dailySalesRate * 100) / 100,
          needsReorder: coverageDays < 14 && qty > 0,
          outOfStock: qty === 0
        };
      });

      // Products needing reorder (less than 14 days coverage)
      const needsReorder = productsWithCoverage
        .filter(p => p.needsReorder || p.outOfStock)
        .sort((a, b) => a.coverageDays - b.coverageDays)
        .slice(0, 15);

      // Out of stock products
      const outOfStockProducts = activeProducts.filter(p => (p.quantity || 0) === 0);

      // Overstock products (more than 180 days of supply)
      const overstockedProducts = productsWithCoverage
        .filter(p => p.coverageDays > 180 && p.quantity > 0)
        .sort((a, b) => b.coverageDays - a.coverageDays)
        .slice(0, 10);

      // Slow movers (not updated in 90 days with stock)
      const slowMovers = activeProducts.filter(p => {
        const updatedAt = new Date(p.updatedAt || p.createdAt);
        return updatedAt < ninetyDaysAgo && (p.quantity || 0) > 0;
      });

      // Stock health summary
      const healthyStock = activeProducts.filter(p => {
        const qty = p.quantity || 0;
        if (qty === 0) return false;
        
        const alertType = p.lowStockAlertType || 'percentage';
        const alertValue = p.lowStockAlert || 45;
        const maxStock = p.maxStockLevel || 100;
        
        let isLow = false;
        if (alertType !== 'none') {
          if (alertType === 'percentage') {
            const threshold = Math.ceil((maxStock * alertValue) / 100);
            isLow = qty <= threshold;
          } else {
            isLow = qty <= alertValue;
          }
        }
        
        const isOver = maxStock > 0 && qty > maxStock;
        return !isLow && !isOver;
      });

      const lowStockProducts = activeProducts.filter(p => {
        if (!p.isActive) return false;
        const quantity = p.quantity || 0;
        const alertType = p.lowStockAlertType || 'percentage';
        const alertValue = p.lowStockAlert || 45;
        
        if (alertType === 'none') return false;
        
        if (alertType === 'percentage') {
          const maxStock = p.maxStockLevel || 100;
          const threshold = Math.ceil((maxStock * alertValue) / 100);
          return quantity <= threshold && quantity > 0;
        } else {
          return quantity <= alertValue && quantity > 0;
        }
      });

      res.json({
        summary: {
          totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
          totalUnits,
          totalProducts: activeProducts.length,
          healthyStock: healthyStock.length,
          lowStock: lowStockProducts.length,
          outOfStock: outOfStockProducts.length,
          slowMovers: slowMovers.length
        },
        turnover: {
          monthlyTurnover: Math.round(monthlyTurnover * 1000) / 1000,
          annualizedTurnover: Math.round(annualizedTurnover * 100) / 100,
          daysOfSupply,
          sellThroughRate30Days: Math.round(sellThroughRate * 100) / 100
        },
        reorderAlerts: needsReorder,
        overstocked: overstockedProducts,
        stockHealthDistribution: {
          healthy: healthyStock.length,
          lowStock: lowStockProducts.length,
          outOfStock: outOfStockProducts.length,
          overstocked: overstockedProducts.length,
          slowMoving: slowMovers.length
        },
        timestamp: now.toISOString()
      });
    } catch (error) {
      console.error("Error fetching inventory health metrics:", error);
      res.status(500).json({ message: "Failed to fetch inventory health metrics" });
    }
  });

  // Image upload endpoint
  app.post('/api/upload', isAuthenticated, upload.single('image'), async (req, res) => {
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
  app.get('/api/search', isAuthenticated, async (req, res) => {
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

      // Get allocated quantities for available stock calculation
      const allocatedMap = await storage.getAllocatedQuantities();

      const inventoryItems = scoredProducts.map(({ product }) => {
        const productKey = `product:${product.id}`;
        const allocated = allocatedMap.get(productKey) || 0;
        const onHand = product.quantity || 0;
        const available = Math.max(0, onHand - allocated);
        return {
          id: product.id,
          name: product.name,
          sku: product.sku,
          quantity: onHand,
          availableQuantity: available,
          allocatedQuantity: allocated,
          imageUrl: product.imageUrl,
          type: 'inventory' as const
        };
      });

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
          // Separate COUNT query for accurate total order count (exclude deleted)
          const [countResult] = await db
            .select({ count: sql<number>`COUNT(*)::int` })
            .from(orders)
            .where(
              and(
                eq(orders.customerId, customer.id),
                eq(orders.isArchived, false)
              )
            );

          const totalOrders = countResult?.count || 0;

          // Get recent orders (limited to 3 for display, exclude deleted)
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
            .where(
              and(
                eq(orders.customerId, customer.id),
                eq(orders.isArchived, false)
              )
            )
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

      // STEP: Search for orders by orderId (supports partial number matching like "3870" -> "ORD-251113-3870", exclude deleted)
      const orderCandidates = await db
        .select({
          id: orders.id,
          orderId: orders.orderId,
          customerId: orders.customerId,
          grandTotal: orders.grandTotal,
          currency: orders.currency,
          orderStatus: orders.orderStatus,
          createdAt: orders.createdAt
        })
        .from(orders)
        .where(
          and(
            eq(orders.isArchived, false),
            sql`LOWER(${orders.orderId}) LIKE ${`%${normalizedQuery.toLowerCase()}%`}`
          )
        )
        .orderBy(desc(orders.createdAt))
        .limit(10);

      // Get customer names for matched orders
      const orderResults = await Promise.all(
        orderCandidates.map(async (order) => {
          let customerName = 'Walk-in Customer';
          if (order.customerId) {
            const [customer] = await db
              .select({ name: customers.name })
              .from(customers)
              .where(eq(customers.id, order.customerId))
              .limit(1);
            if (customer) {
              customerName = customer.name || 'Unknown';
            }
          }
          return {
            id: order.id,
            orderId: order.orderId || 'N/A',
            customerName,
            grandTotal: order.grandTotal || '0',
            currency: order.currency || 'CZK',
            orderStatus: order.orderStatus || 'pending',
            createdAt: order.createdAt
          };
        })
      );

      res.json({
        inventoryItems,
        shipmentItems,
        customers: customersWithStats,
        orders: orderResults
      });
    } catch (error) {
      console.error("Error in global search:", error);
      res.status(500).json({ message: "Search failed" });
    }
  });

  // Categories endpoints
  app.get('/api/categories', isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post('/api/categories', isAuthenticated, async (req: any, res) => {
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

  app.get('/api/categories/:id', isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      const category = await storage.getCategoryById(id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Error fetching category:", error);
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  app.patch('/api/categories/:id', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/categories/:id', isAuthenticated, async (req: any, res) => {
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

  // Import categories from Excel
  app.post('/api/categories/import', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const XLSX = await import('xlsx');
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (!rows || rows.length === 0) {
        return res.status(400).json({ message: 'No data found in file' });
      }

      let importedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const name = row['Name (EN)'] || row['name'] || row['Name'];
          if (!name) {
            errors.push(`Row ${i + 2}: Missing category name`);
            continue;
          }

          const categoryData: any = {
            name: String(name).trim(),
            nameEn: String(name).trim(),
            nameCz: row['Name (CZ)'] ? String(row['Name (CZ)']).trim() : null,
            nameVn: row['Name (VN)'] ? String(row['Name (VN)']).trim() : null,
            description: row['Description'] ? String(row['Description']).trim() : null,
          };

          await storage.createCategory(categoryData);
          importedCount++;
        } catch (err: any) {
          errors.push(`Row ${i + 2}: ${err.message || 'Unknown error'}`);
        }
      }

      // Log activity
      await storage.createUserActivity({
        userId: req.user?.id || "test-user",
        action: 'imported',
        entityType: 'category',
        entityId: 'bulk',
        description: `Imported ${importedCount} categories from Excel`,
      });

      res.json({ 
        success: true, 
        importedCount, 
        errors: errors.length > 0 ? errors : undefined 
      });
    } catch (error) {
      console.error("Error importing categories:", error);
      res.status(500).json({ message: "Failed to import categories" });
    }
  });

  // AI translation for category names
  app.post('/api/categories/translate', isAuthenticated, async (req, res) => {
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
  
  // Get the next available warehouse code (WH1, WH2, etc.)
  app.get('/api/warehouses/next-code', isAuthenticated, async (req, res) => {
    try {
      const warehouses = await storage.getWarehouses();
      
      // Find all existing WH codes and extract numbers
      const existingNumbers: number[] = [];
      for (const wh of warehouses) {
        const code = wh.code || wh.id || '';
        const match = code.match(/^WH(\d+)$/i);
        if (match) {
          existingNumbers.push(parseInt(match[1], 10));
        }
      }
      
      // Find the next available number
      let nextNumber = 1;
      if (existingNumbers.length > 0) {
        nextNumber = Math.max(...existingNumbers) + 1;
      }
      
      const nextCode = `WH${nextNumber}`;
      res.json({ code: nextCode, number: nextNumber });
    } catch (error) {
      console.error("Error getting next warehouse code:", error);
      res.status(500).json({ message: "Failed to get next warehouse code" });
    }
  });
  
  app.get('/api/warehouses', isAuthenticated, async (req, res) => {
    try {
      const warehouses = await storage.getWarehouses();
      
      // Calculate item counts from productLocations based on location code prefix
      // Location codes follow format: WH1-A01-R02-L03, where WH1 is the warehouse code
      const productLocationCounts = await db.select({
        locationPrefix: sql<string>`SPLIT_PART(${productLocations.locationCode}, '-', 1)`,
        totalQuantity: sql<number>`COALESCE(SUM(${productLocations.quantity}), 0)::int`
      })
        .from(productLocations)
        .groupBy(sql`SPLIT_PART(${productLocations.locationCode}, '-', 1)`);
      
      // Create a map from warehouse code to total quantity
      const countsByCode: Record<string, number> = {};
      for (const row of productLocationCounts) {
        countsByCode[row.locationPrefix] = row.totalQuantity;
      }

      // Add itemCount to each warehouse based on its code
      const warehousesWithCounts = warehouses.map(warehouse => {
        const warehouseCode = warehouse.code || warehouse.id || '';
        const itemCount = countsByCode[warehouseCode] || 0;
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

  app.post('/api/warehouses', isAuthenticated, async (req: any, res) => {
    try {
      // Transform data to match schema expectations
      const body = req.body;
      const warehouseData = {
        ...body,
        // Use the warehouse code as the ID (e.g., WH1, WH2, etc.)
        id: body.code || body.id || `WH-${Date.now().toString(36).toUpperCase()}`,
        // Convert floorArea from number to string if provided
        floorArea: body.floorArea !== undefined && body.floorArea !== null && body.floorArea !== '' 
          ? String(body.floorArea) 
          : undefined,
        // expenseId is varchar UUID, keep as string
        expenseId: body.expenseId && body.expenseId !== '' 
          ? body.expenseId 
          : undefined,
        // Ensure capacity is number or undefined
        capacity: body.capacity !== undefined && body.capacity !== null && body.capacity !== ''
          ? parseInt(body.capacity, 10)
          : undefined,
      };
      
      const data = insertWarehouseSchema.parse(warehouseData);
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
  app.get('/api/warehouses/map/files', isAuthenticated, async (req, res) => {
    try {
      // Return empty array for now as warehouse maps are stored elsewhere
      res.json([]);
    } catch (error) {
      console.error("Error fetching warehouse map files:", error);
      res.status(500).json({ message: "Failed to fetch warehouse map files" });
    }
  });

  app.get('/api/warehouses/:id', isAuthenticated, async (req, res) => {
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

  app.patch('/api/warehouses/:id', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/warehouses/:id', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/warehouses/:id/map-config', isAuthenticated, async (req, res) => {
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
        aisleConfigs: warehouse.aisleConfigs || {},
        zones: warehouse.zones || {}
      });
    } catch (error) {
      console.error("Error fetching warehouse map config:", error);
      res.status(500).json({ message: "Failed to fetch warehouse map configuration" });
    }
  });

  // Update warehouse map configuration
  app.put('/api/warehouses/:id/map-config', isAuthenticated, async (req: any, res) => {
    try {
      const zoneConfigSchema = z.object({
        aisleCount: z.number().int().min(0).max(50),
        defaultStorageType: z.enum(['bin', 'pallet']).optional()
      });

      const warehouseConfigSchema = z.object({
        totalAisles: z.number().int().min(1).max(50),
        maxRacks: z.number().int().min(1).max(100),
        maxLevels: z.number().int().min(1).max(20),
        maxBins: z.number().int().min(1).max(20),
        zones: z.record(zoneConfigSchema).optional()
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

      const { totalAisles, maxRacks, maxLevels, maxBins, zones } = validationResult.data;

      const warehouse = await storage.updateWarehouse(req.params.id, {
        totalAisles,
        maxRacks,
        maxLevels,
        maxBins,
        zones: zones || {}
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
        maxBins: warehouse.maxBins,
        zones: warehouse.zones || {}
      });
    } catch (error) {
      console.error("Error updating warehouse map config:", error);
      res.status(500).json({ message: "Failed to update warehouse map configuration" });
    }
  });

  // Update per-aisle configuration
  app.put('/api/warehouses/:id/aisle-config/:aisleId', isAuthenticated, async (req: any, res) => {
    try {
      const aisleConfigSchema = z.object({
        maxRacks: z.number().int().min(1).max(100),
        maxLevels: z.number().int().min(1).max(20),
        maxBins: z.number().int().min(1).max(20),
        storageType: z.enum(['bin', 'pallet']).optional()
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
      const { maxRacks, maxLevels, maxBins, storageType } = validationResult.data;

      // Get current warehouse
      const warehouse = await storage.getWarehouse(req.params.id);
      if (!warehouse) {
        return res.status(404).json({ message: "Warehouse not found" });
      }

      // Update aisle configs
      const aisleConfigs = (warehouse.aisleConfigs as any) || {};
      aisleConfigs[aisleId] = { maxRacks, maxLevels, maxBins, storageType: storageType || 'bin' };

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
        config: { maxRacks, maxLevels, maxBins, storageType },
        aisleConfigs: updatedWarehouse.aisleConfigs
      });
    } catch (error) {
      console.error("Error updating aisle config:", error);
      res.status(500).json({ message: "Failed to update aisle configuration" });
    }
  });

  // Get product locations for a warehouse with product details
  app.get('/api/product-locations', isAuthenticated, async (req, res) => {
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
  app.get('/api/warehouses/:id/products', isAuthenticated, async (req, res) => {
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

  // Get warehouse location inventory breakdown - maps location codes to hierarchical structure with quantities
  app.get('/api/warehouses/:id/location-inventory', isAuthenticated, async (req, res) => {
    try {
      const warehouseId = req.params.id;
      const warehouse = await storage.getWarehouse(warehouseId);
      if (!warehouse) {
        return res.status(404).json({ message: "Warehouse not found" });
      }

      // Get the warehouse code to match against location codes (supports WH1, WH2, etc.)
      // Use the warehouse.code if available, otherwise try to infer from the warehouse ID
      const warehouseCode = warehouse.code || warehouse.id;

      // Use optimized single query to get all locations with product info for this warehouse
      // Join productLocations with products where products.warehouseId matches
      const locationsWithProducts = await db
        .select({
          locationId: productLocations.id,
          locationCode: productLocations.locationCode,
          quantity: productLocations.quantity,
          locationType: productLocations.locationType,
          isPrimary: productLocations.isPrimary,
          notes: productLocations.notes,
          productId: products.id,
          productName: products.name,
          productSku: products.sku,
          productImage: products.imageUrl,
        })
        .from(productLocations)
        .innerJoin(products, eq(productLocations.productId, products.id))
        .where(eq(products.warehouseId, warehouseId));

      // Filter locations that match the warehouse code prefix
      interface LocationWithProduct {
        locationId: string;
        locationCode: string;
        quantity: number;
        locationType: string;
        isPrimary: boolean;
        productId: string;
        productName: string;
        productSku: string;
        productImage?: string | null;
        notes?: string | null;
      }

      const allLocations: LocationWithProduct[] = locationsWithProducts
        .filter(loc => {
          // Extract warehouse code from location code (first segment)
          const locWarehouseCode = loc.locationCode.split('-')[0];
          return locWarehouseCode === warehouseCode || locWarehouseCode === warehouse.code;
        })
        .map(loc => ({
          locationId: loc.locationId,
          locationCode: loc.locationCode,
          quantity: loc.quantity || 0,
          locationType: loc.locationType || 'warehouse',
          isPrimary: loc.isPrimary || false,
          productId: loc.productId,
          productName: loc.productName,
          productSku: loc.productSku || '',
          productImage: loc.productImage,
          notes: loc.notes,
        }));

      // Parse location codes and build hierarchical structure
      interface HierarchicalLocation {
        warehouse: string;
        aisles: {
          [aisle: string]: {
            racks: {
              [rack: string]: {
                levels: {
                  [level: string]: {
                    bins: {
                      [bin: string]: {
                        locations: LocationWithProduct[];
                        totalQuantity: number;
                      };
                    };
                    totalQuantity: number;
                  };
                };
                totalQuantity: number;
              };
            };
            totalQuantity: number;
          };
        };
        totalQuantity: number;
        totalLocations: number;
        totalProducts: number;
      }

      const hierarchy: HierarchicalLocation = {
        warehouse: warehouseCode,
        aisles: {},
        totalQuantity: 0,
        totalLocations: allLocations.length,
        totalProducts: new Set(allLocations.map(l => l.productId)).size,
      };

      // Parse each location and build hierarchy using pattern: WH1-A01-R01-L01-B1 or WH1-B01-R01-L01-PAL1
      for (const loc of allLocations) {
        const parts = loc.locationCode.split('-');
        if (parts.length < 2) continue;

        // Parse based on the format: parts[0]=warehouse, parts[1]=aisle, parts[2]=rack, parts[3]=level, parts[4]=bin/pallet
        let aisle = parts[1] || 'Unknown';
        let rack = parts[2] || 'R01';
        let level = parts[3] || 'L01';
        let bin = parts[4] || 'B1';

        // Handle case where location code may not have all parts
        if (parts.length === 2) {
          // Just warehouse-aisle
          rack = 'R01';
          level = 'L01';
          bin = 'B1';
        } else if (parts.length === 3) {
          // warehouse-aisle-rack
          level = 'L01';
          bin = 'B1';
        } else if (parts.length === 4) {
          // warehouse-aisle-rack-level
          bin = 'B1';
        }

        // Initialize aisle if needed
        if (!hierarchy.aisles[aisle]) {
          hierarchy.aisles[aisle] = { racks: {}, totalQuantity: 0 };
        }
        // Initialize rack if needed
        if (!hierarchy.aisles[aisle].racks[rack]) {
          hierarchy.aisles[aisle].racks[rack] = { levels: {}, totalQuantity: 0 };
        }
        // Initialize level if needed
        if (!hierarchy.aisles[aisle].racks[rack].levels[level]) {
          hierarchy.aisles[aisle].racks[rack].levels[level] = { bins: {}, totalQuantity: 0 };
        }
        // Initialize bin if needed
        if (!hierarchy.aisles[aisle].racks[rack].levels[level].bins[bin]) {
          hierarchy.aisles[aisle].racks[rack].levels[level].bins[bin] = { locations: [], totalQuantity: 0 };
        }

        // Add location to bin
        hierarchy.aisles[aisle].racks[rack].levels[level].bins[bin].locations.push(loc);
        hierarchy.aisles[aisle].racks[rack].levels[level].bins[bin].totalQuantity += loc.quantity;
        hierarchy.aisles[aisle].racks[rack].levels[level].totalQuantity += loc.quantity;
        hierarchy.aisles[aisle].racks[rack].totalQuantity += loc.quantity;
        hierarchy.aisles[aisle].totalQuantity += loc.quantity;
        hierarchy.totalQuantity += loc.quantity;
      }

      // Also return a flat list for table view
      const flatList = allLocations.sort((a, b) => 
        a.locationCode.localeCompare(b.locationCode, undefined, { numeric: true })
      );

      res.json({
        warehouse: {
          id: warehouse.id,
          code: warehouseCode,
          name: warehouse.name,
        },
        hierarchy,
        flatList,
        summary: {
          totalLocations: hierarchy.totalLocations,
          totalProducts: hierarchy.totalProducts,
          totalQuantity: hierarchy.totalQuantity,
          aisleCount: Object.keys(hierarchy.aisles).length,
        }
      });
    } catch (error) {
      console.error("Error fetching warehouse location inventory:", error);
      res.status(500).json({ message: "Failed to fetch warehouse location inventory" });
    }
  });

  // Warehouse file management endpoints
  app.get('/api/warehouses/:id/files', isAuthenticated, async (req, res) => {
    try {
      const files = await storage.getWarehouseFiles(req.params.id);
      res.json(files);
    } catch (error) {
      console.error("Error fetching warehouse files:", error);
      res.status(500).json({ message: "Failed to fetch warehouse files" });
    }
  });

  app.post('/api/warehouses/:id/files', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/warehouse-files/:id', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/warehouses/:warehouseId/financial-contracts', requireRole(['administrator']), async (req, res) => {
    try {
      const contracts = await storage.getWarehouseFinancialContracts(req.params.warehouseId);
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching warehouse financial contracts:", error);
      res.status(500).json({ message: "Failed to fetch warehouse financial contracts" });
    }
  });

  app.get('/api/financial-contracts/:id', requireRole(['administrator']), async (req, res) => {
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

  app.post('/api/warehouses/:warehouseId/financial-contracts', requireRole(['administrator']), async (req: any, res) => {
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

  app.patch('/api/financial-contracts/:id', requireRole(['administrator']), async (req: any, res) => {
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

  app.delete('/api/financial-contracts/:id', requireRole(['administrator']), async (req: any, res) => {
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
  app.get('/api/warehouses/:id/layout', isAuthenticated, async (req, res) => {
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

  app.post('/api/warehouses/:id/layout/generate', isAuthenticated, async (req: any, res) => {
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

  app.get('/api/warehouses/:id/layout/bins', isAuthenticated, async (req, res) => {
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

  app.get('/api/warehouses/:id/layout/stats', isAuthenticated, async (req, res) => {
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

  app.patch('/api/bins/:id', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/suppliers', isAuthenticated, async (req, res) => {
    try {
      const suppliers = await storage.getSuppliers();
      const purchases = await storage.getImportPurchases();
      
      // Calculate totalPurchased and lastPurchaseDate for each supplier
      // Only count purchases that have been received (status: delivered, shipped, or at_warehouse)
      const receivedStatuses = ['delivered', 'shipped', 'at_warehouse'];
      
      const enrichedSuppliers = suppliers.map(supplier => {
        // Get all purchases for this supplier (can be linked by supplierId or supplier name)
        const supplierPurchases = purchases.filter(p => 
          (p.supplierId === supplier.id || p.supplier === supplier.name) &&
          receivedStatuses.includes(p.status)
        );
        
        // Calculate total value from received purchases
        const totalPurchased = supplierPurchases.reduce((sum, p) => {
          const amount = parseFloat(p.totalPaid || p.purchaseTotal || '0');
          return sum + amount;
        }, 0);
        
        // Get the most recent purchase date
        let lastPurchaseDate: Date | null = null;
        for (const p of supplierPurchases) {
          const pDate = p.createdAt ? new Date(p.createdAt) : null;
          if (pDate && (!lastPurchaseDate || pDate > lastPurchaseDate)) {
            lastPurchaseDate = pDate;
          }
        }
        
        return {
          ...supplier,
          totalPurchased: totalPurchased.toFixed(2),
          lastPurchaseDate: lastPurchaseDate?.toISOString() || null,
          purchaseCount: supplierPurchases.length
        };
      });
      
      res.json(enrichedSuppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.get('/api/suppliers/:id', isAuthenticated, async (req, res) => {
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

  app.post('/api/suppliers', isAuthenticated, async (req: any, res) => {
    try {
      // Define supplier schema with all fields from the database table
      const supplierSchema = z.object({
        name: z.string(),
        contactPerson: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
        phone: z.string().optional(),
        address: z.string().optional(),
        country: z.string().optional(),
        website: z.string().optional(),
        supplierLink: z.string().optional(),
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

  app.patch('/api/suppliers/:id', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/suppliers/:id', isAuthenticated, async (req: any, res) => {
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

  // Get import purchases for a specific supplier
  app.get('/api/suppliers/:supplierId/purchases', isAuthenticated, async (req, res) => {
    try {
      const { supplierId } = req.params;
      
      // Get supplier to match by name as well
      const supplier = await storage.getSupplier(supplierId);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      // Get all import purchases and filter by supplierId or supplier name
      const allPurchases = await storage.getImportPurchases();
      const supplierPurchases = allPurchases.filter(p => 
        p.supplierId === supplierId || 
        (p.supplier && supplier.name && p.supplier.toLowerCase().trim() === supplier.name.toLowerCase().trim())
      );
      
      // Get items for each purchase to calculate totals
      const purchasesWithItems = await Promise.all(supplierPurchases.map(async (purchase) => {
        const items = await storage.getPurchaseItems(purchase.id);
        return {
          ...purchase,
          items,
          itemCount: items.length,
          totalQuantity: items.reduce((sum, item) => sum + (item.quantity || 0), 0)
        };
      }));
      
      res.json(purchasesWithItems);
    } catch (error) {
      console.error("Error fetching supplier purchases:", error);
      res.status(500).json({ message: "Failed to fetch supplier purchases" });
    }
  });

  // Supplier Files endpoints
  app.get('/api/suppliers/:supplierId/files', isAuthenticated, async (req, res) => {
    try {
      const files = await storage.getSupplierFiles(req.params.supplierId);
      res.json(files);
    } catch (error) {
      console.error("Error fetching supplier files:", error);
      res.status(500).json({ message: "Failed to fetch supplier files" });
    }
  });

  // Generic object upload endpoint
  app.post('/api/objects/upload', isAuthenticated, async (req: any, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  app.post('/api/suppliers/:id/files/upload', isAuthenticated, async (req: any, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  app.post('/api/suppliers/:supplierId/files', isAuthenticated, async (req: any, res) => {
    try {
      const { fileName, fileType, fileUrl, fileSize, mimeType } = req.body;

      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        fileUrl,
        {
          owner: "test-user",
          visibility: "private",
        }
      );

      const fileData = {
        supplierId: req.params.supplierId,
        fileName,
        fileType,
        fileUrl: objectPath,
        fileSize,
        mimeType,
        uploadedBy: "test-user",
      };

      const file = await storage.createSupplierFile(fileData);
      res.json(file);
    } catch (error) {
      console.error("Error creating supplier file:", error);
      res.status(500).json({ message: "Failed to create supplier file" });
    }
  });

  // Delete supplier file - using the standard pattern /api/supplier-files/:fileId
  app.delete('/api/supplier-files/:fileId', isAuthenticated, async (req: any, res) => {
    try {
      const deleted = await storage.deleteSupplierFile(req.params.fileId);
      if (!deleted) {
        return res.status(404).json({ message: "File not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting supplier file:", error);
      res.status(500).json({ message: "Failed to delete supplier file" });
    }
  });

  // Keep backward compatibility with old route pattern
  app.delete('/api/suppliers/:id/files/:fileId', isAuthenticated, async (req: any, res) => {
    try {
      const deleted = await storage.deleteSupplierFile(req.params.fileId);
      if (!deleted) {
        return res.status(404).json({ message: "File not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting supplier file:", error);
      res.status(500).json({ message: "Failed to delete supplier file" });
    }
  });

  // Supplier import from Excel
  const supplierImportUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  });

  app.post('/api/suppliers/import', isAuthenticated, supplierImportUpload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const XLSX = await import('xlsx');
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) {
        return res.status(400).json({ message: "No data found in the file" });
      }

      let importedCount = 0;
      const errors: Array<{ row: number; message: string }> = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] as any;
        try {
          // Map Excel columns to supplier fields
          const supplierData = {
            name: row['Name'] || row['Supplier Name'] || row['name'] || '',
            contactPerson: row['Contact Person'] || row['contactPerson'] || row['Contact'] || '',
            email: row['Email'] || row['email'] || '',
            phone: row['Phone'] || row['phone'] || '',
            address: row['Address'] || row['address'] || '',
            country: row['Country'] || row['country'] || '',
            website: row['Website'] || row['website'] || '',
            supplierLink: row['Supplier Link'] || row['supplierLink'] || '',
            notes: row['Notes'] || row['notes'] || '',
          };

          // Validate required fields
          if (!supplierData.name) {
            errors.push({ row: i + 2, message: 'Supplier name is required' });
            continue;
          }

          await storage.createSupplier(supplierData);
          importedCount++;
        } catch (error: any) {
          errors.push({ row: i + 2, message: error.message || 'Failed to import row' });
        }
      }

      // Log the import activity
      if (req.user?.id) {
        await storage.createActivityLog({
          userId: req.user.id,
          action: 'create',
          entityType: 'supplier',
          entityId: 'bulk-import',
          description: `Imported ${importedCount} suppliers from Excel`,
        });
      }

      res.json({
        success: true,
        imported: importedCount,
        errors: errors.length,
        errorDetails: errors,
      });
    } catch (error) {
      console.error("Error importing suppliers:", error);
      res.status(500).json({ message: "Failed to import suppliers" });
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
  app.get('/api/bundles', isAuthenticated, async (req, res) => {
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

      // Filter financial data based on user role
      const userRole = req.user?.role || 'warehouse_operator';
      const filtered = filterFinancialData(bundlesWithStock, userRole);
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching bundles:", error);
      res.status(500).json({ message: "Failed to fetch bundles" });
    }
  });

  app.get('/api/bundles/:id', isAuthenticated, async (req, res) => {
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

      const bundleWithItems = {
        ...bundle,
        items: itemsWithDetails
      };

      // Filter financial data based on user role
      const userRole = req.user?.role || 'warehouse_operator';
      const filtered = filterFinancialData(bundleWithItems, userRole);
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching bundle:", error);
      res.status(500).json({ message: "Failed to fetch bundle" });
    }
  });

  app.get('/api/bundles/:id/items', isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getBundleItems(req.params.id);
      // Filter financial data based on user role
      const userRole = req.user?.role || 'warehouse_operator';
      const filtered = filterFinancialData(items, userRole);
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching bundle items:", error);
      res.status(500).json({ message: "Failed to fetch bundle items" });
    }
  });

  app.post('/api/bundles', isAuthenticated, async (req: any, res) => {
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

  app.put('/api/bundles/:id', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/bundles/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteBundle(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting bundle:", error);
      res.status(500).json({ message: "Failed to delete bundle" });
    }
  });

  // Add bundle items endpoint
  app.post('/api/bundles/:id/items', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/bundles/:id/duplicate', isAuthenticated, async (req, res) => {
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
  app.patch('/api/bundles/:id', isAuthenticated, async (req: any, res) => {
    try {
      const updatedBundle = await storage.updateBundle(req.params.id, req.body);
      res.json(updatedBundle);
    } catch (error) {
      console.error("Error updating bundle status:", error);
      res.status(500).json({ message: "Failed to update bundle status" });
    }
  });

  // Inventory availability endpoint - returns allocated quantities from unfulfilled orders
  app.get('/api/inventory/availability', isAuthenticated, async (req: any, res) => {
    try {
      const allocatedMap = await storage.getAllocatedQuantities();
      // Convert Map to object for JSON serialization
      const allocatedObj: Record<string, number> = {};
      allocatedMap.forEach((value, key) => {
        allocatedObj[key] = value;
      });
      res.json({ allocated: allocatedObj });
    } catch (error) {
      console.error("Error fetching inventory availability:", error);
      res.status(500).json({ message: "Failed to fetch inventory availability" });
    }
  });

  // Products endpoints
  app.get('/api/products', isAuthenticated, async (req: any, res) => {
    try {
      const search = req.query.search as string;
      const includeInactive = req.query.includeInactive === 'true';
      const includeLandingCost = req.query.includeLandingCost === 'true';
      const includeAvailability = req.query.includeAvailability !== 'false'; // Default to true
      let productsResult;

      if (search) {
        productsResult = await storage.searchProducts(search, includeInactive);
      } else {
        productsResult = await storage.getProducts(includeInactive);
      }

      // Create a map of product IDs to quantities for virtual SKU calculation
      const productQuantityMap = new Map<string, { quantity: number; name: string }>();
      for (const product of productsResult) {
        productQuantityMap.set(product.id, { 
          quantity: product.quantity || 0,
          name: product.name 
        });
      }

      // Get allocated quantities from unfulfilled orders (single query, cached)
      const allocatedMap = includeAvailability ? await storage.getAllocatedQuantities() : new Map<string, number>();

      // For parent products with variants, we need to aggregate variant allocations
      // Build a map of productId -> total allocated across variants
      const parentAllocations = new Map<string, number>();
      if (includeAvailability) {
        // Get all variants to map SKU -> productId
        const allVariants = await db.select({ id: productVariants.id, productId: productVariants.productId, sku: productVariants.sku })
          .from(productVariants);
        
        // Build SKU to productId mapping
        const skuToProductId = new Map<string, string>();
        const variantToProductId = new Map<string, string>();
        for (const v of allVariants) {
          if (v.sku) {
            skuToProductId.set(v.sku, v.productId);
          }
          variantToProductId.set(v.id, v.productId);
        }
        
        // Aggregate allocations by parent product
        allocatedMap.forEach((allocated, key) => {
          let productId: string | undefined;
          
          // Match SKU keys: "sku:{sku}"
          if (key.startsWith('sku:')) {
            const sku = key.substring(4);
            productId = skuToProductId.get(sku);
          }
          // Match variant keys: "product:{productId}:variant:{variantId}"
          const variantMatch = key.match(/^product:([^:]+):variant:([^:]+)$/);
          if (variantMatch) {
            productId = variantMatch[1];
          }
          
          if (productId) {
            parentAllocations.set(productId, (parentAllocations.get(productId) || 0) + allocated);
          }
        });
      }

      // Enrich virtual products with master product data and availability
      const enrichedProducts = productsResult.map((product: any) => {
        // Calculate allocated and available quantities
        let allocated = 0;
        
        // For parent products with variants, use aggregated variant allocations
        if (product.hasVariants) {
          allocated = parentAllocations.get(product.id) || 0;
        } else {
          // For products without variants, check both product key and sku key
          const productKey = `product:${product.id}`;
          const skuKey = product.sku ? `sku:${product.sku}` : null;
          allocated = allocatedMap.get(productKey) || (skuKey ? allocatedMap.get(skuKey) : 0) || 0;
        }
        
        const onHand = product.quantity || 0;
        const available = Math.max(0, onHand - allocated);

        if (product.isVirtual && product.masterProductId) {
          const masterData = productQuantityMap.get(product.masterProductId);
          if (masterData) {
            const ratio = parseFloat(product.inventoryDeductionRatio || '1');
            // For virtual SKUs, available is based on master product availability
            const masterKey = `product:${product.masterProductId}`;
            const masterAllocated = allocatedMap.get(masterKey) || 0;
            const masterAvailable = Math.max(0, masterData.quantity - masterAllocated);
            const availableVirtualStock = Math.floor(masterAvailable / ratio);
            return {
              ...product,
              masterProductName: masterData.name,
              masterProductQuantity: masterData.quantity,
              availableVirtualStock: availableVirtualStock, // Calculated available units for this virtual SKU
              allocatedQuantity: allocated,
              availableQuantity: availableVirtualStock
            };
          }
        }
        return {
          ...product,
          allocatedQuantity: allocated,
          availableQuantity: available
        };
      });

      // If landing costs are requested, fetch them from the database
      if (includeLandingCost) {
        const productsWithCosts = await Promise.all(enrichedProducts.map(async (product: any) => {
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

        // Filter financial data based on user role
        const userRole = req.user?.role || 'warehouse_operator';
        const filtered = filterFinancialData(productsWithCosts, userRole);
        res.json(filtered);
      } else {
        // Filter financial data based on user role
        const userRole = req.user?.role || 'warehouse_operator';
        const filtered = filterFinancialData(enrichedProducts, userRole);
        res.json(filtered);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/products/low-stock', isAuthenticated, async (req, res) => {
    try {
      const products = await storage.getLowStockProducts();
      // Filter financial data based on user role
      const userRole = req.user?.role || 'warehouse_operator';
      const filtered = filterFinancialData(products, userRole);
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching low stock products:", error);
      res.status(500).json({ message: "Failed to fetch low stock products" });
    }
  });

  app.get('/api/products/:id', isAuthenticated, async (req: any, res) => {
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

      // Get allocated quantities
      const allocatedMap = await storage.getAllocatedQuantities();
      const productKey = `product:${product.id}`;
      const allocated = allocatedMap.get(productKey) || 0;
      const onHand = product.quantity || 0;
      let available = Math.max(0, onHand - allocated);

      // For virtual SKUs, calculate availability based on master product
      if (product.isVirtual && product.masterProductId) {
        const masterProduct = await storage.getProductById(product.masterProductId);
        if (masterProduct) {
          const ratio = parseFloat(product.inventoryDeductionRatio || '1');
          const masterKey = `product:${product.masterProductId}`;
          const masterAllocated = allocatedMap.get(masterKey) || 0;
          const masterAvailable = Math.max(0, (masterProduct.quantity || 0) - masterAllocated);
          available = Math.floor(masterAvailable / ratio);
        }
      }

      // Add latest_landing_cost and availability to the product object
      const productData = {
        ...product,
        latest_landing_cost: productWithCost?.latestLandingCost || null,
        allocatedQuantity: allocated,
        availableQuantity: available
      };

      // Filter financial data based on user role
      const userRole = req.user?.role || 'warehouse_operator';
      const filtered = filterFinancialData(productData, userRole);
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Product Locations endpoint
  app.get('/api/products/:id/locations', isAuthenticated, async (req, res) => {
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
      const legacyLocation = [{
        id: 'legacy',
        productId: productId,
        locationCode: product.warehouseLocation,
        quantity: product.quantity || 0,
        isPrimary: true,
        locationType: 'warehouse'
      }];

      const locationsData = locations.length === 0 && product.warehouseLocation ? legacyLocation : locations;

      // Filter financial data based on user role
      const userRole = req.user?.role || 'warehouse_operator';
      const filtered = filterFinancialData(locationsData, userRole);
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching product locations:", error);
      res.status(500).json({ message: "Failed to fetch product locations" });
    }
  });

  // Product Files endpoints
  app.get('/api/products/:id/files', isAuthenticated, async (req, res) => {
    try {
      const files = await storage.getProductFiles(req.params.id);
      // Filter financial data based on user role
      const userRole = req.user?.role || 'warehouse_operator';
      const filtered = filterFinancialData(files, userRole);
      res.json(filtered);
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

  app.post('/api/products/:id/files', isAuthenticated, productFileUpload.single('file'), async (req: any, res) => {
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

  app.patch('/api/product-files/:fileId', isAuthenticated, async (req, res) => {
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

  app.delete('/api/product-files/:fileId', isAuthenticated, async (req, res) => {
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

  app.get('/api/product-files/:fileId/download', isAuthenticated, async (req, res) => {
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

  app.post('/api/orders/:orderId/files', isAuthenticated, orderFileUpload.single('file'), async (req: any, res) => {
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

  app.delete('/api/order-files/:fileId', isAuthenticated, async (req, res) => {
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

  // Order Import endpoint
  const orderImportUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = /xlsx|xls/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      if (extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
      }
    }
  });

  app.post('/api/orders/import', isAuthenticated, orderImportUpload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const XLSX = await import('xlsx');
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (!data || data.length === 0) {
        return res.status(400).json({ message: "No data found in Excel file" });
      }

      const importedOrders: Array<{ orderId: string; orderDbId: string; customerName: string }> = [];
      const detailedErrors: Array<{ row: number; orderId?: string; reason: string; data: any }> = [];
      let newCustomersCount = 0;
      let existingCustomersCount = 0;

      // Pre-fetch customers and products once for performance (avoid O(n²) queries)
      const allCustomers = await storage.getCustomers();
      const allProducts = await storage.getProducts();
      
      // Create lookup maps for fast matching
      const customersByName = new Map<string, any>();
      const customersByEmail = new Map<string, any>();
      for (const c of allCustomers) {
        if (c.name) customersByName.set(c.name.toLowerCase(), c);
        if (c.email) customersByEmail.set(c.email.toLowerCase(), c);
      }
      
      const productsByName = new Map<string, any>();
      const productsBySku = new Map<string, any>();
      for (const p of allProducts) {
        if (p.name) productsByName.set(p.name.toLowerCase(), p);
        if (p.vietnameseName) productsByName.set(p.vietnameseName.toLowerCase(), p);
        if (p.sku) productsBySku.set(p.sku.toLowerCase(), p);
      }

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          // Map comprehensive Excel columns to order fields
          const orderId = row['Order ID'] || `ORD-${Date.now()}-${i}`;
          const orderDate = row['Order Date'] ? new Date(row['Order Date']) : new Date();
          const orderStatus = row['Order Status'] || 'pending';
          const paymentStatus = row['Payment Status'] || 'pending';
          const priority = row['Priority'] || 'medium';
          
          // Customer fields
          const customerName = row['Customer Name'];
          const customerEmail = row['Customer Email'];
          const customerPhone = row['Customer Phone'];
          
          // Shipping address fields
          const shippingAddress = row['Shipping Address'];
          const shippingCity = row['Shipping City'];
          const shippingState = row['Shipping State'];
          const shippingCountry = row['Shipping Country'];
          const shippingPostalCode = row['Shipping Postal Code'];
          
          // Financial fields
          const currency = row['Currency'] || 'CZK';
          const subtotal = row['Subtotal'] || '0';
          const discountType = row['Discount Type'] || null;
          const discountValue = row['Discount Value'] || '0';
          const discountAmount = row['Discount Amount'] || '0';
          const taxRate = row['Tax Rate (%)'] || '0';
          const taxAmount = row['Tax Amount'] || '0';
          const shippingCost = row['Shipping Cost'] || '0';
          const adjustment = row['Adjustment'] || '0';
          const grandTotal = row['Grand Total'] || '0';
          
          // Shipping & Payment
          const shippingMethod = row['Shipping Method'];
          const paymentMethod = row['Payment Method'];
          const actualShippingCost = row['Actual Shipping Cost'] || '0';
          
          // Order Type & Sale Type
          const orderType = row['Order Type'] || 'ord'; // 'pos', 'ord', 'web', 'tel'
          const saleType = row['Sale Type'] || 'retail'; // 'retail' or 'wholesale'
          const channel = row['Channel'] || 'online'; // 'pos', 'online'
          
          // COD Fields
          const codAmount = row['COD Amount'] || null;
          const codCurrency = row['COD Currency'] || null;
          
          // Tracking & Notes
          const trackingNumber = row['Tracking Number'] || null;
          const notes = row['Notes'];
          
          // Items - Format: "SKU1 x2; SKU2 x1" or "Product Name x2; Product Name x1"
          const items = row['Items'];

          // Find or create customer if name provided (using pre-fetched maps)
          let customerId = null;
          let resolvedCustomerName = customerName || 'Unknown';
          if (customerName) {
            // Fast lookup using maps instead of full list scan
            const existingCustomer = customersByName.get(customerName.toLowerCase()) || 
              (customerEmail ? customersByEmail.get(customerEmail.toLowerCase()) : null);
            
            if (existingCustomer) {
              customerId = existingCustomer.id;
              resolvedCustomerName = existingCustomer.name;
              existingCustomersCount++;
            } else {
              // Create new customer with full address
              const fullAddress = [shippingAddress, shippingCity, shippingState, shippingCountry, shippingPostalCode]
                .filter(Boolean).join(', ');
              const newCustomer = await storage.createCustomer({
                name: customerName,
                email: customerEmail || null,
                phone: customerPhone || null,
                address: fullAddress || null,
                city: shippingCity || null,
                state: shippingState || null,
                country: shippingCountry || null,
                postalCode: shippingPostalCode || null,
                type: 'regular',
                isActive: true,
              });
              customerId = newCustomer.id;
              resolvedCustomerName = newCustomer.name;
              newCustomersCount++;
              
              // Add to maps so subsequent rows can find this customer
              customersByName.set(customerName.toLowerCase(), newCustomer);
              if (customerEmail) customersByEmail.set(customerEmail.toLowerCase(), newCustomer);
            }
          }

          // Create order with ALL database fields
          const orderData: any = {
            orderId,
            customerId,
            currency,
            subtotal: String(subtotal),
            discountType,
            discountValue: String(discountValue),
            discount: String(discountAmount),
            taxRate: String(taxRate),
            taxAmount: String(taxAmount),
            shippingCost: String(shippingCost),
            actualShippingCost: String(actualShippingCost),
            adjustment: String(adjustment),
            grandTotal: String(grandTotal),
            shippingMethod,
            paymentMethod,
            orderStatus,
            paymentStatus,
            priority,
            notes,
            orderType,
            saleType,
            channel,
            trackingNumber,
          };
          
          // Add COD fields if provided
          if (codAmount) orderData.codAmount = String(codAmount);
          if (codCurrency) orderData.codCurrency = codCurrency;

          const newOrder = await storage.createOrder(orderData);
          
          // Parse and create order items if provided
          // Supports both SKU and Name lookup: "SKU123 x2" or "Product Name x2"
          if (items && typeof items === 'string') {
            const itemParts = items.split(';').map(s => s.trim()).filter(Boolean);
            for (const itemPart of itemParts) {
              // Parse format: "SKU/Name x Quantity" with optional unit price
              // Examples: "SKU123 x2", "Product Name x2", "SKU123 x2 @15.50"
              const matchWithPrice = itemPart.match(/^(.+?)\s*x\s*(\d+)\s*@\s*([\d.]+)$/i);
              const matchBasic = itemPart.match(/^(.+?)\s*x\s*(\d+)$/i);
              
              const match = matchWithPrice || matchBasic;
              if (match) {
                const skuOrName = match[1].trim();
                const quantity = parseInt(match[2], 10) || 1;
                const customUnitPrice = matchWithPrice ? parseFloat(match[3]) : null;
                
                // Try SKU lookup first, then fall back to name lookup
                let product = productsBySku.get(skuOrName.toLowerCase()) || 
                              productsByName.get(skuOrName.toLowerCase());
                
                if (product) {
                  // Determine unit price based on currency and sale type
                  let unitPrice = customUnitPrice;
                  if (!unitPrice) {
                    if (saleType === 'wholesale') {
                      unitPrice = parseFloat(product.wholesalePriceEur || product.wholesalePriceCzk || product.priceEur || product.priceCzk || '0');
                    } else {
                      if (currency === 'EUR') {
                        unitPrice = parseFloat(product.priceEur || product.priceCzk || '0');
                      } else if (currency === 'USD') {
                        unitPrice = parseFloat(product.priceUsd || product.priceEur || '0');
                      } else if (currency === 'VND') {
                        unitPrice = parseFloat(product.priceVnd || '0');
                      } else if (currency === 'CNY') {
                        unitPrice = parseFloat(product.priceCny || '0');
                      } else {
                        unitPrice = parseFloat(product.priceCzk || product.priceEur || '0');
                      }
                    }
                  }
                  
                  await storage.createOrderItem({
                    orderId: newOrder.id,
                    productId: product.id,
                    productName: product.name,
                    sku: product.sku,
                    quantity,
                    unitPrice: String(unitPrice),
                    totalPrice: String(quantity * unitPrice),
                  });
                }
              }
            }
          }
          
          importedOrders.push({
            orderId: newOrder.orderId,
            orderDbId: newOrder.id,
            customerName: resolvedCustomerName,
          });
        } catch (rowError: any) {
          detailedErrors.push({
            row: i + 2,
            orderId: row['Order ID'],
            reason: rowError.message,
            data: row,
          });
        }
      }

      res.json({ 
        imported: importedOrders.length,
        failed: detailedErrors.length,
        totalRows: data.length,
        customersCreated: newCustomersCount,
        customersExisting: existingCustomersCount,
        successfulOrders: importedOrders,
        errors: detailedErrors,
        message: `Successfully imported ${importedOrders.length} order(s)${detailedErrors.length > 0 ? ` with ${detailedErrors.length} error(s)` : ''}`
      });
    } catch (error: any) {
      console.error("Error importing orders:", error);
      res.status(500).json({ message: error.message || "Failed to import orders" });
    }
  });

  // Revert imported orders endpoint
  app.delete('/api/orders/import/revert', isAuthenticated, async (req, res) => {
    try {
      const { orderIds } = req.body;
      if (!orderIds || !Array.isArray(orderIds)) {
        return res.status(400).json({ message: "Order IDs required" });
      }
      
      let deleted = 0;
      for (const id of orderIds) {
        // Get order items before deletion to restore inventory
        const orderItems = await storage.getOrderItems(id);
        
        // Restore inventory for each item (add quantities back)
        for (const item of orderItems) {
          if (item.productId && !item.serviceId) {
            const product = await storage.getProductById(item.productId);
            if (product) {
              const currentQty = product.quantity || 0;
              const restoreQty = item.quantity || 0;
              await storage.updateProduct(item.productId, {
                quantity: currentQty + restoreQty
              });
            }
          } else if (item.bundleId) {
            const bundle = await storage.getBundleById(item.bundleId);
            if (bundle) {
              const currentStock = bundle.availableStock || 0;
              const restoreQty = item.quantity || 0;
              await storage.updateBundle(item.bundleId, {
                availableStock: currentStock + restoreQty
              });
            }
          }
        }
        
        // Delete order items first, then order
        await storage.deleteOrderItems(id);
        const success = await storage.deleteOrder(id);
        if (success) deleted++;
      }
      
      res.json({ deleted, message: `Reverted ${deleted} orders (inventory restored)` });
    } catch (error) {
      console.error("Error reverting import:", error);
      res.status(500).json({ message: "Failed to revert import" });
    }
  });

  app.get('/api/products/:id/tiered-pricing', isAuthenticated, async (req, res) => {
    try {
      const pricing = await storage.getProductTieredPricing(req.params.id);
      res.json(pricing);
    } catch (error) {
      console.error("Error fetching product tiered pricing:", error);
      res.status(500).json({ message: "Failed to fetch product tiered pricing" });
    }
  });

  app.post('/api/products/:id/tiered-pricing', isAuthenticated, async (req, res) => {
    try {
      const productId = req.params.id;
      console.log("Creating tiered pricing with body:", req.body);
      const validationResult = insertProductTieredPricingSchema.safeParse({
        ...req.body,
        productId
      });

      if (!validationResult.success) {
        console.log("Tiered pricing validation error:", validationResult.error.errors);
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

  app.patch('/api/products/tiered-pricing/:id', isAuthenticated, async (req, res) => {
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

  app.delete('/api/products/tiered-pricing/:id', isAuthenticated, async (req, res) => {
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

  app.post('/api/products/order-counts', isAuthenticated, async (req, res) => {
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
  app.get('/api/products/:id/cost-history', isAuthenticated, async (req, res) => {
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

  // Product Reorder Rate endpoints
  app.get('/api/products/:id/reorder-rate', isAuthenticated, async (req, res) => {
    try {
      const productId = req.params.id;

      // Calculate the reorder rate
      const rate = await storage.calculateProductReorderRate(productId);

      // Update the product with the calculated rate
      if (rate >= 0) {
        await storage.updateProductReorderRate(productId, rate);
      }

      res.json({ 
        productId,
        reorderRate: rate >= 0 ? rate : null,
        hasInsufficientData: rate < 0
      });
    } catch (error) {
      console.error("Error calculating product reorder rate:", error);
      res.status(500).json({ message: "Failed to calculate product reorder rate" });
    }
  });

  app.post('/api/products/calculate-reorder-rates', isAuthenticated, async (req, res) => {
    try {
      // Get all products
      const allProducts = await storage.getProducts();
      
      let calculated = 0;
      let skipped = 0;

      // Calculate reorder rate for each product
      for (const product of allProducts) {
        try {
          const rate = await storage.calculateProductReorderRate(product.id);
          await storage.updateProductReorderRate(product.id, rate);
          
          if (rate >= 0) {
            calculated++;
          } else {
            skipped++;
          }
        } catch (error) {
          console.error(`Error calculating reorder rate for product ${product.id}:`, error);
          skipped++;
        }
      }

      res.json({ 
        message: "Reorder rates calculated successfully",
        totalProducts: allProducts.length,
        calculated,
        skipped
      });
    } catch (error) {
      console.error("Error calculating reorder rates for all products:", error);
      res.status(500).json({ message: "Failed to calculate reorder rates" });
    }
  });

  // Product Order History endpoint
  app.get('/api/products/:id/order-history', isAuthenticated, async (req, res) => {
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

  // Products Import endpoint
  const productImportUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  app.post('/api/products/import', isAuthenticated, productImportUpload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const XLSX = await import('xlsx');
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (!data || data.length === 0) {
        return res.status(400).json({ message: "No data found in Excel file" });
      }

      const importedProducts: any[] = [];
      const errors: string[] = [];

      // Get all categories and warehouses for matching
      const categories = await storage.getCategories();
      const warehouses = await storage.getWarehouses();
      const suppliers = await storage.getSuppliers();

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          const name = row['Name'] || row['name'];
          const sku = row['SKU'] || row['sku'];

          if (!name || !sku) {
            errors.push(`Row ${i + 2}: Missing name or SKU`);
            continue;
          }

          // Find category by name
          const categoryName = row['Category'] || row['category'];
          const category = categories.find((c: any) => c.name?.toLowerCase() === categoryName?.toLowerCase());

          // Find warehouse by name
          const warehouseName = row['Warehouse'] || row['warehouse'];
          const warehouse = warehouses.find((w: any) => w.name?.toLowerCase() === warehouseName?.toLowerCase());

          // Find supplier by name
          const supplierName = row['Supplier'] || row['supplier'];
          const supplier = suppliers.find((s: any) => s.name?.toLowerCase() === supplierName?.toLowerCase());

          // Prepare product data
          const productData: any = {
            name,
            vietnameseName: row['Vietnamese Name'] || row['vietnameseName'] || null,
            sku,
            barcode: row['Barcode'] || row['barcode'] || null,
            categoryId: category?.id ? String(category.id) : null,
            warehouseId: warehouse?.id || null,
            supplierId: supplier?.id || null,
            warehouseLocation: row['Warehouse Location'] || row['warehouseLocation'] || null,
            quantity: parseInt(row['Quantity'] || row['quantity'] || '0') || 0,
            lowStockAlert: parseInt(row['Low Stock Alert'] || row['lowStockAlert'] || '0') || 0,
            priceCzk: row['Price CZK'] || row['priceCzk'] || null,
            priceEur: row['Price EUR'] || row['priceEur'] || null,
            priceUsd: row['Price USD'] || row['priceUsd'] || null,
            wholesalePriceCzk: row['Wholesale Price CZK'] || row['wholesalePriceCzk'] || null,
            wholesalePriceEur: row['Wholesale Price EUR'] || row['wholesalePriceEur'] || null,
            importCostUsd: row['Import Cost USD'] || row['importCostUsd'] || null,
            importCostEur: row['Import Cost EUR'] || row['importCostEur'] || null,
            importCostCzk: row['Import Cost CZK'] || row['importCostCzk'] || null,
            weight: row['Weight (kg)'] || row['weight'] || null,
            length: row['Length (cm)'] || row['length'] || null,
            width: row['Width (cm)'] || row['width'] || null,
            height: row['Height (cm)'] || row['height'] || null,
            description: row['Description'] || row['description'] || null,
            shipmentNotes: row['Shipment Notes'] || row['shipmentNotes'] || null,
            isActive: true,
          };

          // Check if product with same SKU exists
          const existingProduct = await storage.getProductBySku(sku);
          
          if (existingProduct) {
            // Update existing product
            const updated = await storage.updateProduct(existingProduct.id, productData);
            importedProducts.push({ ...updated, action: 'updated' });
          } else {
            // Create new product
            const created = await storage.createProduct(productData);
            importedProducts.push({ ...created, action: 'created' });
          }
        } catch (rowError: any) {
          errors.push(`Row ${i + 2}: ${rowError.message}`);
        }
      }

      res.json({
        success: true,
        imported: importedProducts.length,
        errors: errors.length,
        errorDetails: errors,
        products: importedProducts
      });
    } catch (error: any) {
      console.error("Products import error:", error);
      res.status(500).json({ message: error.message || "Failed to import products" });
    }
  });

  app.post('/api/products', isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      console.error("Error creating product:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      if (error?.code === '23505' && error?.constraint === 'products_sku_unique') {
        return res.status(409).json({ message: "A product with this SKU already exists. Please use a different SKU." });
      }
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.patch('/api/products/:id', isAuthenticated, async (req: any, res) => {
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
            locationCode: variant.locationCode || null,
            importCostUsd: variant.importCostUsd || null,
            importCostCzk: variant.importCostCzk || null,
            importCostEur: variant.importCostEur || null,
            imageUrl: variant.imageUrl || null,
          };

          // Create new variant if ID starts with "temp-" or doesn't exist
          if (!variant.id || variant.id.startsWith('temp-')) {
            const createdVariant = await storage.createProductVariant(variantData);
            
            // If variant has a location code and quantity, create or update product location
            if (variant.locationCode && variant.quantity > 0) {
              try {
                const locationCode = variant.locationCode.toUpperCase();
                const existingLocations = await storage.getProductLocations(productId);
                const existingLoc = existingLocations.find(loc => loc.locationCode.toUpperCase() === locationCode);
                
                if (existingLoc) {
                  // Add to existing location quantity
                  await storage.updateProductLocation(existingLoc.id, {
                    quantity: (existingLoc.quantity || 0) + variant.quantity,
                    notes: existingLoc.notes ? `${existingLoc.notes}, Variant: ${variant.name}` : `Variant: ${variant.name}`,
                  });
                  console.log(`📍 Added ${variant.quantity} to location ${locationCode} for variant "${variant.name}"`);
                } else {
                  // Create new location
                  await storage.createProductLocation({
                    productId,
                    locationCode,
                    quantity: variant.quantity,
                    isPrimary: false,
                    notes: `Variant: ${variant.name}`,
                  });
                  console.log(`📍 Created location ${locationCode} for variant "${variant.name}" with qty ${variant.quantity}`);
                }
              } catch (locError) {
                console.error(`Failed to create/update location for variant ${variant.name}:`, locError);
              }
            }
          } else {
            // Update existing variant
            await storage.updateProductVariant(variant.id, variantData);
            
            // If variant has a location code and quantity, create or update product location
            if (variant.locationCode && variant.quantity > 0) {
              try {
                const locationCode = variant.locationCode.toUpperCase();
                const existingLocations = await storage.getProductLocations(productId);
                const existingLoc = existingLocations.find(loc => loc.locationCode.toUpperCase() === locationCode);
                
                if (existingLoc) {
                  // Update existing location (use variant quantity as the location quantity)
                  await storage.updateProductLocation(existingLoc.id, {
                    quantity: variant.quantity,
                    notes: `Variant: ${variant.name}`,
                  });
                  console.log(`📍 Updated location ${locationCode} for variant "${variant.name}" with qty ${variant.quantity}`);
                } else {
                  // Create new location
                  await storage.createProductLocation({
                    productId,
                    locationCode,
                    quantity: variant.quantity,
                    isPrimary: false,
                    notes: `Variant: ${variant.name}`,
                  });
                  console.log(`📍 Created location ${locationCode} for variant "${variant.name}" with qty ${variant.quantity}`);
                }
              } catch (locError) {
                console.error(`Failed to update/create location for variant ${variant.name}:`, locError);
              }
            }
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

  app.delete('/api/products/:id', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/products/:id/move-warehouse', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/products/:productId/variants', isAuthenticated, async (req: any, res) => {
    try {
      const variants = await storage.getProductVariants(req.params.productId);
      
      // Get allocated quantities to calculate availability for each variant (same as parent products)
      const allocatedMap = await storage.getAllocatedQuantities();
      
      // Enrich variants with allocation info - use SKU first, then variantId as fallback
      const enrichedVariants = variants.map((variant: any) => {
        let allocated = 0;
        
        // Primary: Look up by SKU (most reliable identifier) - check if key EXISTS
        if (variant.sku) {
          const skuKey = `sku:${variant.sku}`;
          if (allocatedMap.has(skuKey)) {
            allocated = allocatedMap.get(skuKey) || 0;
          }
        }
        // Fallback: Look up by variantId if SKU key didn't exist
        if (allocated === 0 && (!variant.sku || !allocatedMap.has(`sku:${variant.sku}`))) {
          const variantKey = `product:${variant.productId}:variant:${variant.id}`;
          allocated = allocatedMap.get(variantKey) || 0;
        }
        
        const onHand = variant.quantity || 0;
        const available = Math.max(0, onHand - allocated);
        
        return {
          ...variant,
          allocatedQuantity: allocated,
          availableQuantity: available
        };
      });
      
      // Filter financial data based on user role
      const userRole = req.user?.role || 'warehouse_operator';
      const filtered = filterFinancialData(enrichedVariants, userRole);
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching product variants:", error);
      res.status(500).json({ message: "Failed to fetch product variants" });
    }
  });

  app.post('/api/products/:productId/variants', isAuthenticated, async (req: any, res) => {
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

  // GET single variant by ID (for picking workflow to check variant stock)
  app.get('/api/products/:productId/variants/:id', isAuthenticated, async (req: any, res) => {
    try {
      const variant = await storage.getProductVariant(req.params.id);
      if (!variant) {
        return res.status(404).json({ message: "Variant not found" });
      }
      // Verify variant belongs to the specified product
      if (variant.productId !== req.params.productId) {
        return res.status(404).json({ message: "Variant not found for this product" });
      }
      // Filter financial data based on user role
      const userRole = req.user?.role || 'warehouse_operator';
      const filtered = filterFinancialData([variant], userRole);
      res.json(filtered[0]);
    } catch (error) {
      console.error("Error fetching product variant:", error);
      res.status(500).json({ message: "Failed to fetch product variant" });
    }
  });

  app.patch('/api/products/:productId/variants/:id', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/products/:productId/variants/:id', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/products/:productId/variants/bulk', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/products/move-warehouse', isAuthenticated, async (req: any, res) => {
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

  // Bulk delete product variants - optimized single query
  app.post('/api/products/:productId/variants/bulk-delete', isAuthenticated, async (req: any, res) => {
    try {
      const { variantIds } = req.body;

      if (!variantIds || !Array.isArray(variantIds)) {
        return res.status(400).json({ message: "variantIds must be an array" });
      }

      if (variantIds.length === 0) {
        return res.status(400).json({ message: "No variant IDs provided" });
      }

      // Use bulk delete - single SQL query with IN clause
      const deletedCount = await storage.deleteProductVariantsBulk(variantIds);

      await storage.createUserActivity({
        userId: req.user?.id || "system",
        action: 'deleted',
        entityType: 'product_variant',
        entityId: req.params.productId,
        description: `Bulk deleted ${deletedCount} product variants`,
      });

      res.json({ deletedCount });
    } catch (error) {
      console.error("Error deleting product variants in bulk:", error);
      res.status(500).json({ message: "Failed to delete product variants" });
    }
  });

  // Helper function to extract warehouse code from location code and update product's warehouseId
  async function updateProductWarehouseFromLocationCode(productId: string, locationCode: string) {
    try {
      // Extract warehouse code from location code (e.g., "WH1" from "WH1-A1-R1-L1-B1")
      const warehouseCode = locationCode.split('-')[0];
      if (!warehouseCode) return;

      // Find warehouse with matching code
      const allWarehouses = await storage.getWarehouses();
      const matchingWarehouse = allWarehouses.find(w => 
        w.code === warehouseCode || w.id === warehouseCode
      );

      if (matchingWarehouse) {
        // Use targeted SQL UPDATE to only change warehouseId, preserving all other fields
        await db
          .update(products)
          .set({ warehouseId: matchingWarehouse.id, updatedAt: new Date() })
          .where(eq(products.id, productId));
        console.log(`📦 Auto-set product ${productId} warehouse to ${matchingWarehouse.name} (${matchingWarehouse.id}) based on location ${locationCode}`);
      }
    } catch (error) {
      console.error('Failed to update product warehouse from location code:', error);
      // Don't fail the request - this is a convenience feature
    }
  }

  // Product Locations endpoints
  app.get('/api/products/:id/locations', isAuthenticated, async (req, res) => {
    try {
      const productId = req.params.id;
      const locations = await storage.getProductLocations(productId);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching product locations:", error);
      res.status(500).json({ message: "Failed to fetch product locations" });
    }
  });

  app.post('/api/products/:id/locations', isAuthenticated, async (req: any, res) => {
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

      // Check if location already exists for this product
      const existingLocations = await storage.getProductLocations(productId);
      const existingLocation = existingLocations.find(
        loc => loc.locationCode === locationData.locationCode
      );

      let location;
      let quantityToAdd = locationData.quantity || 0;

      if (existingLocation) {
        // Update existing location - add quantity
        const newQuantity = (existingLocation.quantity || 0) + quantityToAdd;
        location = await storage.updateProductLocation(existingLocation.id, {
          quantity: newQuantity,
          isPrimary: locationData.isPrimary ?? existingLocation.isPrimary
        });
        
        await storage.createUserActivity({
          userId: "test-user",
          action: 'updated',
          entityType: 'product_location',
          entityId: existingLocation.id,
          description: `Updated location ${locationData.locationCode} for product, added ${quantityToAdd} units (now ${newQuantity} total)`,
        });
      } else {
        // Create new location
        location = await storage.createProductLocation(locationData);

        await storage.createUserActivity({
          userId: "test-user",
          action: 'created',
          entityType: 'product_location',
          entityId: location.id,
          description: `Added location ${location.locationCode} for product with ${quantityToAdd} units`,
        });
      }

      // Auto-set product warehouse based on location code (e.g., WH1 from WH1-A1-R1-L1-B1)
      await updateProductWarehouseFromLocationCode(productId, locationData.locationCode);

      // Update receipt item's assignedQuantity if receiptItemId is provided
      const receiptItemId = req.body.receiptItemId;
      if (receiptItemId && quantityToAdd > 0) {
        try {
          const [receiptItem] = await db.select().from(receiptItems).where(eq(receiptItems.id, receiptItemId));
          if (receiptItem) {
            const currentAssigned = receiptItem.assignedQuantity || 0;
            const newAssigned = Math.min(currentAssigned + quantityToAdd, receiptItem.receivedQuantity);
            await db.update(receiptItems).set({ assignedQuantity: newAssigned }).where(eq(receiptItems.id, receiptItemId));
          }
        } catch (error) {
          console.error('Failed to update receipt item assignedQuantity:', error);
          // Don't fail the request - location was created successfully
        }
      }

      res.status(201).json(location);
    } catch (error: any) {
      console.error("Error creating product location:", error);
      console.error("Error details - name:", error.name, "message:", error.message, "code:", error.code);
      console.error("Request body:", JSON.stringify(req.body, null, 2));
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      if (error.message?.includes('Location code already exists')) {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create product location", error: error.message });
    }
  });

  // Batch create product locations - saves all locations in one request
  app.post('/api/products/:id/locations/batch', isAuthenticated, async (req: any, res) => {
    try {
      const productId = req.params.id;
      const { locations, receiptItemId } = req.body;
      
      if (!Array.isArray(locations) || locations.length === 0) {
        return res.status(400).json({ message: "locations array is required" });
      }

      // Validate product exists
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // First, aggregate locations by code AND variantId/SKU to preserve variant-specific tracking
      // SKU is preferred for matching when variantId is a temp-* ID
      const aggregatedLocations = new Map<string, { locationCode: string; quantity: number; locationType: string; isPrimary: boolean; variantId?: string; sku?: string; variantName?: string }>();
      for (const locData of locations) {
        const code = locData.locationCode;
        // Use SKU as primary identifier, falling back to variantId
        const sku = locData.sku || locData.variantName || '';
        const variantId = locData.variantId || '';
        // For aggregation, prefer SKU over temp IDs
        const aggregateKey = sku ? `${code}:sku:${sku}` : `${code}:${variantId}`;
        const qty = locData.quantity || 0;
        if (qty <= 0) continue;
        
        const existing = aggregatedLocations.get(aggregateKey);
        if (existing) {
          existing.quantity += qty;
        } else {
          aggregatedLocations.set(aggregateKey, {
            locationCode: code,
            quantity: qty,
            locationType: locData.locationType || 'bin',
            isPrimary: locData.isPrimary ?? false,
            variantId: locData.variantId,
            sku: locData.sku || locData.variantName,
            variantName: locData.variantName
          });
        }
      }
      
      // Get existing locations for this product - key by both locationCode AND variantId
      const existingLocations = await storage.getProductLocations(productId);
      const existingMap = new Map(existingLocations.map(loc => [`${loc.locationCode}:${loc.variantId || ''}`, loc]));
      
      // Build SKU-to-variantId lookup for this product's variants
      const fetchedVariants = await storage.getProductVariants(productId);
      const skuToVariantId = new Map<string, string>();
      if (fetchedVariants && fetchedVariants.length > 0) {
        for (const v of fetchedVariants) {
          if (v.sku) skuToVariantId.set(v.sku, v.id);
          if (v.name) skuToVariantId.set(v.name, v.id); // Also map by name for fallback
        }
      }
      
      let createdCount = 0;
      let updatedCount = 0;
      let totalQuantity = 0;
      const results: any[] = [];
      
      // ================================================================
      // OPTIMIZED: Collect all creates and updates, then batch execute
      // ================================================================
      const locationsToCreate: any[] = [];
      const locationsToUpdate: Array<{ id: string; quantity: number; isPrimary: boolean; notes: string | null }> = [];
      
      // Process each aggregated location
      for (const [aggregateKey, locData] of aggregatedLocations.entries()) {
        const locationCode = locData.locationCode;
        const quantity = locData.quantity;
        totalQuantity += quantity;
        
        // Resolve SKU/variantName to actual variantId from product_variants table
        // ALWAYS prefer SKU lookup over incoming variantId (which may be from shipment allocations, not DB)
        let resolvedVariantId: string | undefined = undefined;
        
        // First priority: Look up by SKU
        if (locData.sku && skuToVariantId.has(locData.sku)) {
          resolvedVariantId = skuToVariantId.get(locData.sku);
        }
        // Second priority: Look up by variant name
        if (!resolvedVariantId && locData.variantName && skuToVariantId.has(locData.variantName)) {
          resolvedVariantId = skuToVariantId.get(locData.variantName);
        }
        // Last resort: Use incoming variantId ONLY if it exists in our fetched variants
        if (!resolvedVariantId && locData.variantId) {
          const variantExists = fetchedVariants?.some((v: any) => v.id === locData.variantId);
          if (variantExists) {
            resolvedVariantId = locData.variantId;
          } else {
            console.log(`[locations/batch] Rejected invalid variantId=${locData.variantId} for SKU=${locData.sku}, variantName=${locData.variantName} (not in product_variants)`);
          }
        }
        
        // Use resolved variantId for matching existing locations
        const existingKey = `${locationCode}:${resolvedVariantId || ''}`;
        const existing = existingMap.get(existingKey);
        
        if (existing) {
          // Update existing - add quantity to location total
          const originalQuantity = existing.quantity || 0;
          const newQuantity = originalQuantity + quantity;
          
          locationsToUpdate.push({
            id: existing.id,
            quantity: newQuantity,
            isPrimary: locData.isPrimary ?? existing.isPrimary,
            notes: existing.notes,
            // Track for receipt_item_locations
            _originalQuantity: originalQuantity,
            _quantityAdded: quantity,
            _locationCode: locationCode,
            _variantId: resolvedVariantId
          });
          existingMap.set(aggregateKey, { ...existing, quantity: newQuantity });
          updatedCount++;
        } else {
          // Create new location - resolvedVariantId is already validated to exist in product_variants
          const validVariantId = resolvedVariantId;
          
          locationsToCreate.push({
            productId,
            locationCode,
            locationType: locData.locationType || 'bin',
            quantity,
            isPrimary: locData.isPrimary ?? false,
            notes: undefined,
            variantId: validVariantId,
            // Track for receipt_item_locations (originalQuantity = 0 for new locations)
            _originalQuantity: 0,
            _quantityAdded: quantity
          });
          createdCount++;
        }
      }
      
      // Bulk insert new locations
      const createdLocations: any[] = [];
      if (locationsToCreate.length > 0) {
        // Remove internal tracking fields before inserting
        const cleanLocationsToCreate = locationsToCreate.map(loc => {
          const { _originalQuantity, _quantityAdded, ...cleanLoc } = loc;
          return cleanLoc;
        });
        const created = await db.insert(productLocations).values(cleanLocationsToCreate).returning();
        // Pair created locations with their tracking data
        created.forEach((createdLoc, index) => {
          createdLocations.push({
            ...createdLoc,
            _originalQuantity: locationsToCreate[index]._originalQuantity,
            _quantityAdded: locationsToCreate[index]._quantityAdded
          });
        });
        results.push(...created);
      }
      
      // Bulk update existing locations (use Promise.allSettled for resilience)
      if (locationsToUpdate.length > 0) {
        const updatePromises = locationsToUpdate.map(loc => 
          db.update(productLocations)
            .set({ quantity: loc.quantity, isPrimary: loc.isPrimary, notes: loc.notes, updatedAt: new Date() })
            .where(eq(productLocations.id, loc.id))
            .returning()
        );
        const updateResults = await Promise.allSettled(updatePromises);
        for (const result of updateResults) {
          if (result.status === 'fulfilled' && result.value[0]) {
            results.push(result.value[0]);
          }
        }
      }
      
      // Insert into receipt_item_locations table if receiptItemId is provided
      if (receiptItemId) {
        const receiptItemLocationRecords: any[] = [];
        
        // For newly created locations
        for (const createdLoc of createdLocations) {
          receiptItemLocationRecords.push({
            receiptItemId,
            productLocationId: createdLoc.id,
            productId,
            variantId: createdLoc.variantId || null,
            locationCode: createdLoc.locationCode,
            quantityAdded: createdLoc._quantityAdded,
            originalQuantity: 0, // New location, original was 0
            createdBy: req.user?.id || null
          });
        }
        
        // For updated locations
        for (const updatedLoc of locationsToUpdate) {
          receiptItemLocationRecords.push({
            receiptItemId,
            productLocationId: updatedLoc.id,
            productId,
            variantId: updatedLoc._variantId || null,
            locationCode: updatedLoc._locationCode,
            quantityAdded: updatedLoc._quantityAdded,
            originalQuantity: updatedLoc._originalQuantity,
            createdBy: req.user?.id || null
          });
        }
        
        // Bulk insert receipt_item_locations records
        if (receiptItemLocationRecords.length > 0) {
          await db.insert(receiptItemLocations).values(receiptItemLocationRecords);
          console.log(`[locations/batch] Created ${receiptItemLocationRecords.length} receipt_item_locations records for receiptItemId=${receiptItemId}`);
        }
      }
      
      // Update receipt item's assignedQuantity if receiptItemId is provided
      if (receiptItemId && totalQuantity > 0) {
        try {
          const [receiptItem] = await db.select().from(receiptItems).where(eq(receiptItems.id, receiptItemId));
          if (receiptItem) {
            const currentAssigned = receiptItem.assignedQuantity || 0;
            const newAssigned = Math.min(currentAssigned + totalQuantity, receiptItem.receivedQuantity);
            await db.update(receiptItems).set({ assignedQuantity: newAssigned }).where(eq(receiptItems.id, receiptItemId));
          }
        } catch (error) {
          console.error('Failed to update receipt item assignedQuantity:', error);
        }
      }
      
      // ================================================================
      // UPDATE VARIANT QUANTITIES IN INVENTORY
      // When saving locations with variants, also update productVariants.quantity
      // ================================================================
      const variantQuantityUpdates = new Map<string, number>();
      
      for (const [, locData] of aggregatedLocations.entries()) {
        // Resolve SKU to actual variantId
        let resolvedVariantId = locData.variantId;
        if (locData.sku && (!resolvedVariantId || String(resolvedVariantId).startsWith('temp-'))) {
          resolvedVariantId = skuToVariantId.get(locData.sku);
        }
        if (locData.variantName && (!resolvedVariantId || String(resolvedVariantId).startsWith('temp-'))) {
          resolvedVariantId = skuToVariantId.get(locData.variantName);
        }
        
        // Only process valid variant IDs (not temp-* IDs)
        if (resolvedVariantId && !String(resolvedVariantId).startsWith('temp-')) {
          const currentQty = variantQuantityUpdates.get(resolvedVariantId) || 0;
          variantQuantityUpdates.set(resolvedVariantId, currentQty + locData.quantity);
        }
      }
      
      // Apply variant quantity updates - OPTIMIZED with bulk fetch and parallel updates
      if (variantQuantityUpdates.size > 0) {
        const variantIds = Array.from(variantQuantityUpdates.keys());
        
        // Fetch all variants in ONE query
        const existingVariantsData = await db
          .select({ id: productVariants.id, productId: productVariants.productId, quantity: productVariants.quantity })
          .from(productVariants)
          .where(inArray(productVariants.id, variantIds));
        
        // Create lookup map
        const variantDataMap = new Map(existingVariantsData.map(v => [v.id, v]));
        const parentProductsToRecalc = new Set<string>();
        
        // Build update operations
        const variantUpdateOps: Array<{ id: string; newQty: number }> = [];
        for (const [variantId, qtyToAdd] of variantQuantityUpdates.entries()) {
          const variant = variantDataMap.get(variantId);
          if (variant) {
            const newQty = (variant.quantity || 0) + qtyToAdd;
            variantUpdateOps.push({ id: variantId, newQty });
            if (variant.productId) {
              parentProductsToRecalc.add(variant.productId);
            }
          }
        }
        
        // Execute all variant updates in parallel
        if (variantUpdateOps.length > 0) {
          await Promise.allSettled(variantUpdateOps.map(op => 
            db.update(productVariants)
              .set({ quantity: op.newQty, updatedAt: new Date() })
              .where(eq(productVariants.id, op.id))
          ));
          console.log(`[locations/batch] Updated ${variantUpdateOps.length} variant quantities in parallel`);
        }
        
        // Recalculate parent product quantities in parallel
        if (parentProductsToRecalc.size > 0) {
          const parentIds = Array.from(parentProductsToRecalc);
          await Promise.allSettled(parentIds.map(async (parentProductId) => {
            const variantSums = await db
              .select({ totalQuantity: sql<number>`COALESCE(SUM(${productVariants.quantity}), 0)::int` })
              .from(productVariants)
              .where(eq(productVariants.productId, parentProductId));
            
            const newParentQty = variantSums[0]?.totalQuantity || 0;
            await db.update(products)
              .set({ quantity: newParentQty, updatedAt: new Date() })
              .where(eq(products.id, parentProductId));
          }));
          console.log(`[locations/batch] Recalculated ${parentIds.length} parent product quantities`);
        }
      }
      
      // Auto-set product warehouse based on first location code (e.g., WH1 from WH1-A1-R1-L1-B1)
      if (locationsToCreate.length > 0) {
        const firstLocationCode = locationsToCreate[0].locationCode;
        await updateProductWarehouseFromLocationCode(productId, firstLocationCode);
      }

      // Single activity log for the batch operation
      await storage.createUserActivity({
        userId: "test-user",
        action: 'created',
        entityType: 'product_location_batch',
        entityId: productId,
        description: `Batch saved ${locations.length} locations for product (${createdCount} new, ${updatedCount} updated, ${totalQuantity} total items)`,
      });

      res.status(201).json({
        success: true,
        created: createdCount,
        updated: updatedCount,
        totalLocations: results.length,
        totalQuantity,
        locations: results
      });
    } catch (error: any) {
      console.error("Error batch creating product locations:", error);
      res.status(500).json({ message: "Failed to batch create product locations", error: error.message });
    }
  });

  // Batch delete/restore product locations - efficient for undo all
  // IMPORTANT: Uses receipt_item_locations table to track what was added during receiving
  // SAFETY: Only processes locations that have records in receipt_item_locations table
  app.delete('/api/products/:id/locations/batch', isAuthenticated, async (req: any, res) => {
    try {
      // SECURITY: Admin-only for batch delete operations
      const userRole = req.user?.role;
      if (userRole !== 'administrator') {
        return res.status(403).json({ message: "Administrator access required for batch delete operations" });
      }
      
      const productId = req.params.id;
      const { receiptItemId, locationIds } = req.body;
      
      // SECURITY: Require receiptItemId to prevent accidental mass deletion
      if (!receiptItemId && (!locationIds || !Array.isArray(locationIds) || locationIds.length === 0)) {
        return res.status(400).json({ 
          message: "Security: receiptItemId or specific locationIds required to prevent accidental data loss" 
        });
      }
      
      const product = await storage.getProductById(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      let deletedCount = 0;
      let restoredCount = 0;
      let totalQuantityRemoved = 0;
      
      if (receiptItemId) {
        // Query receipt_item_locations table for this receipt item
        const receiptLocationRecords = await db.select()
          .from(receiptItemLocations)
          .where(eq(receiptItemLocations.receiptItemId, receiptItemId));
        
        console.log(`[SAFETY] Batch undo for receipt ${receiptItemId}: found ${receiptLocationRecords.length} records in receipt_item_locations`);
        
        if (receiptLocationRecords.length === 0) {
          return res.json({ success: true, deleted: 0, restored: 0, totalQuantityRemoved: 0, message: "No locations to process" });
        }
        
        // Process each record
        for (const record of receiptLocationRecords) {
          const originalQuantity = record.originalQuantity || 0;
          const quantityAdded = record.quantityAdded || 0;
          
          if (originalQuantity === 0) {
            // This location was CREATED during this receipt - DELETE it entirely
            await storage.deleteProductLocation(record.productLocationId);
            totalQuantityRemoved += quantityAdded;
            deletedCount++;
          } else {
            // Pre-existing location - RESTORE to original quantity
            totalQuantityRemoved += quantityAdded;
            
            await db.update(productLocations)
              .set({ 
                quantity: originalQuantity,
                updatedAt: new Date()
              })
              .where(eq(productLocations.id, record.productLocationId));
            
            restoredCount++;
          }
        }
        
        // Delete all receipt_item_locations records for this receipt item
        await db.delete(receiptItemLocations)
          .where(eq(receiptItemLocations.receiptItemId, receiptItemId));
        
        console.log(`[locations/batch-delete] Deleted ${receiptLocationRecords.length} receipt_item_locations records`);
      } else if (locationIds && Array.isArray(locationIds)) {
        // Find records by productLocationId
        const receiptLocationRecords = await db.select()
          .from(receiptItemLocations)
          .where(inArray(receiptItemLocations.productLocationId, locationIds));
        
        for (const record of receiptLocationRecords) {
          const originalQuantity = record.originalQuantity || 0;
          const quantityAdded = record.quantityAdded || 0;
          
          if (originalQuantity === 0) {
            await storage.deleteProductLocation(record.productLocationId);
            totalQuantityRemoved += quantityAdded;
            deletedCount++;
          } else {
            totalQuantityRemoved += quantityAdded;
            await db.update(productLocations)
              .set({ quantity: originalQuantity, updatedAt: new Date() })
              .where(eq(productLocations.id, record.productLocationId));
            restoredCount++;
          }
        }
        
        // Delete processed records
        if (receiptLocationRecords.length > 0) {
          const recordIds = receiptLocationRecords.map(r => r.id);
          await db.delete(receiptItemLocations)
            .where(inArray(receiptItemLocations.id, recordIds));
        }
      }
      
      // Update receipt item's assignedQuantity if receiptItemId is provided
      if (receiptItemId) {
        try {
          await db.update(receiptItems).set({ assignedQuantity: 0 }).where(eq(receiptItems.id, receiptItemId));
        } catch (error) {
          console.error('Failed to reset receipt item assignedQuantity:', error);
        }
      }
      
      // Single activity log for the batch operation
      await storage.createUserActivity({
        userId: "test-user",
        action: 'deleted',
        entityType: 'product_location_batch',
        entityId: productId,
        description: `Batch undo: deleted ${deletedCount} new locations, restored ${restoredCount} existing locations (${totalQuantityRemoved} items removed)`,
      });

      res.json({
        success: true,
        deleted: deletedCount,
        restored: restoredCount,
        totalQuantityRemoved
      });
    } catch (error: any) {
      console.error("Error batch deleting product locations:", error);
      res.status(500).json({ message: "Failed to batch delete product locations", error: error.message });
    }
  });

  // GET receipt item locations - returns all locations added during receiving
  app.get('/api/receipt-items/:receiptItemId/locations', isAuthenticated, async (req: any, res) => {
    try {
      const { receiptItemId } = req.params;
      
      // Query receipt_item_locations joined with product_locations and optionally productVariants
      const records = await db.select({
        id: receiptItemLocations.id,
        receiptItemId: receiptItemLocations.receiptItemId,
        productLocationId: receiptItemLocations.productLocationId,
        productId: receiptItemLocations.productId,
        variantId: receiptItemLocations.variantId,
        locationCode: receiptItemLocations.locationCode,
        quantityAdded: receiptItemLocations.quantityAdded,
        originalQuantity: receiptItemLocations.originalQuantity,
        createdAt: receiptItemLocations.createdAt,
        currentQuantity: productLocations.quantity,
        locationType: productLocations.locationType,
        variantName: productVariants.name
      })
      .from(receiptItemLocations)
      .leftJoin(productLocations, eq(receiptItemLocations.productLocationId, productLocations.id))
      .leftJoin(productVariants, eq(receiptItemLocations.variantId, productVariants.id))
      .where(eq(receiptItemLocations.receiptItemId, receiptItemId));
      
      res.json(records);
    } catch (error: any) {
      console.error("Error fetching receipt item locations:", error);
      res.status(500).json({ message: "Failed to fetch receipt item locations", error: error.message });
    }
  });

  app.patch('/api/products/:id/locations/:locationId', isAuthenticated, async (req: any, res) => {
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

  // Single location delete - PRESERVES pre-existing inventory when receiptItemId is provided
  // SAFETY: Uses receipt_item_locations table to track original quantities
  app.delete('/api/products/:id/locations/:locationId', isAuthenticated, async (req: any, res) => {
    try {
      // SECURITY: Admin-only for delete operations
      const userRole = req.user?.role;
      if (userRole !== 'administrator') {
        return res.status(403).json({ message: "Administrator access required for delete operations" });
      }
      
      const { id: productId, locationId } = req.params;
      const { receiptItemId } = req.body;

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

      // Fetch the location
      const allLocations = await storage.getProductLocations(productId);
      const loc = allLocations.find(l => l.id === locationId);
      
      if (!loc) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      // SAFETY: If receiptItemId is provided, use receipt_item_locations table
      if (receiptItemId) {
        // Look up the receipt_item_locations record
        const [receiptLocationRecord] = await db.select()
          .from(receiptItemLocations)
          .where(and(
            eq(receiptItemLocations.receiptItemId, receiptItemId),
            eq(receiptItemLocations.productLocationId, locationId)
          ));
        
        if (!receiptLocationRecord) {
          console.log(`[SAFETY] No receipt_item_locations record for location ${locationId} and receipt ${receiptItemId}`);
          return res.status(400).json({ 
            message: "Safety: No record found for this location and receipt combination" 
          });
        }
        
        const originalQuantity = receiptLocationRecord.originalQuantity || 0;
        const quantityAdded = receiptLocationRecord.quantityAdded || 0;
        
        if (originalQuantity > 0) {
          // Pre-existing location - RESTORE to original quantity instead of deleting
          await db.update(productLocations)
            .set({ 
              quantity: originalQuantity,
              updatedAt: new Date()
            })
            .where(eq(productLocations.id, locationId));
          
          console.log(`[SAFETY] Restored location ${loc.locationCode} to original qty ${originalQuantity}`);
          
          // Delete the receipt_item_locations record
          await db.delete(receiptItemLocations)
            .where(eq(receiptItemLocations.id, receiptLocationRecord.id));
          
          await storage.createUserActivity({
            userId: "test-user",
            action: 'restored',
            entityType: 'product_location',
            entityId: locationId,
            description: `Restored location ${loc.locationCode} to original quantity ${originalQuantity}`,
          });
          
          return res.status(200).json({ 
            restored: true, 
            originalQuantity,
            message: `Restored to original quantity ${originalQuantity}` 
          });
        }
        
        // originalQuantity === 0 means this location was created during this receipt - delete it
        // Delete the receipt_item_locations record first
        await db.delete(receiptItemLocations)
          .where(eq(receiptItemLocations.id, receiptLocationRecord.id));
      }

      // Normal delete for new locations (originalQuantity === 0, or no receiptItemId)
      const success = await storage.deleteProductLocation(locationId);

      if (!success) {
        return res.status(404).json({ message: "Location not found" });
      }

      await storage.createUserActivity({
        userId: "test-user",
        action: 'deleted',
        entityType: 'product_location',
        entityId: locationId,
        description: `Deleted product location ${loc.locationCode}`,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product location:", error);
      res.status(500).json({ message: "Failed to delete product location" });
    }
  });

  app.post('/api/products/:id/locations/move', isAuthenticated, async (req: any, res) => {
    try {
      const productId = req.params.id;
      const { fromLocationId, toLocationId, toLocationCode, quantity } = req.body;

      // Validate required fields
      if (!fromLocationId || (!toLocationId && !toLocationCode) || !quantity) {
        return res.status(400).json({ 
          message: "Missing required fields: fromLocationId, toLocationId or toLocationCode, quantity" 
        });
      }

      if (quantity <= 0) {
        return res.status(400).json({ 
          message: "Quantity must be greater than 0" 
        });
      }

      let finalToLocationId = toLocationId;

      // If toLocationCode is provided instead of toLocationId, find or create the location
      if (!toLocationId && toLocationCode) {
        // Check if location already exists for this product
        const existingLocations = await storage.getProductLocations(productId);
        const existingLocation = existingLocations.find(
          loc => loc.locationCode.toUpperCase() === toLocationCode.toUpperCase()
        );

        if (existingLocation) {
          finalToLocationId = existingLocation.id;
        } else {
          // Create new location for this product
          const newLocation = await storage.createProductLocation({
            productId,
            locationCode: toLocationCode.toUpperCase(),
            quantity: 0, // Will be updated by moveInventory
            isPrimary: false,
          });
          finalToLocationId = newLocation.id;
        }
      }

      const success = await storage.moveInventory(fromLocationId, finalToLocationId, quantity);

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
  app.get('/api/stock-adjustment-requests', isAuthenticated, async (req: any, res) => {
    try {
      const requests = await storage.getStockAdjustmentRequests();
      // Filter financial data based on user role
      const userRole = req.user?.role || 'warehouse_operator';
      const filtered = filterFinancialData(requests, userRole);
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching stock adjustment requests:", error);
      res.status(500).json({ message: "Failed to fetch stock adjustment requests" });
    }
  });

  app.get('/api/over-allocated-items', isAuthenticated, async (req: any, res) => {
    try {
      const items = await storage.getOverAllocatedItems();
      // Filter financial data based on user role
      const userRole = req.user?.role || 'warehouse_operator';
      const filtered = filterFinancialData(items, userRole);
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching over-allocated items:", error);
      res.status(500).json({ message: "Failed to fetch over-allocated items" });
    }
  });

  app.get('/api/under-allocated-items', isAuthenticated, async (req: any, res) => {
    try {
      const items = await storage.getUnderAllocatedItems();
      // Filter financial data based on user role
      const userRole = req.user?.role || 'warehouse_operator';
      const filtered = filterFinancialData(items, userRole);
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching under-allocated items:", error);
      res.status(500).json({ message: "Failed to fetch under-allocated items" });
    }
  });

  // Unified Stock Inconsistencies API - combines over-allocated and under-allocated
  app.get('/api/stock-inconsistencies', isAuthenticated, async (req: any, res) => {
    try {
      const [overAllocated, underAllocated] = await Promise.all([
        storage.getOverAllocatedItems(),
        storage.getUnderAllocatedItems()
      ]);
      
      // Filter financial data based on user role
      const userRole = req.user?.role || 'warehouse_operator';
      
      // Add inconsistency type to each item
      const overItems = filterFinancialData(overAllocated, userRole).map((item: any) => ({
        ...item,
        inconsistencyType: 'over_allocated',
        discrepancy: item.availableStock - item.totalOrdered, // negative = over-allocated
        expectedQuantity: item.availableStock,
        actualDemand: item.totalOrdered
      }));
      
      const underItems = filterFinancialData(underAllocated, userRole).map((item: any) => ({
        ...item,
        inconsistencyType: 'under_allocated',
        discrepancy: item.locationQuantity - item.recordedQuantity, // negative = under-allocated
        expectedQuantity: item.recordedQuantity,
        actualQuantity: item.locationQuantity
      }));
      
      res.json({
        items: [...overItems, ...underItems],
        summary: {
          total: overItems.length + underItems.length,
          overAllocated: overItems.length,
          underAllocated: underItems.length
        }
      });
    } catch (error) {
      console.error("Error fetching stock inconsistencies:", error);
      res.status(500).json({ message: "Failed to fetch stock inconsistencies" });
    }
  });

  app.post('/api/stock-adjustment-requests', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/stock/direct-adjustment', isAuthenticated, async (req: any, res) => {
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

      // Create stock adjustment history record for reports
      await storage.createStockAdjustmentHistory({
        productId,
        locationId,
        adjustmentType,
        previousQuantity: location.quantity,
        adjustedQuantity: adjustmentType === 'set' ? newQuantity : quantity,
        newQuantity,
        reason,
        source: 'direct',
        adjustedBy: userId,
      });

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

  // Quick fix for stock inconsistencies - directly updates product/variant quantity
  app.post('/api/stock/quick-fix', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || "test-user";
      const { productId, variantId, newQuantity, inconsistencyType, reason } = req.body;

      if (!productId || newQuantity === undefined) {
        return res.status(400).json({ message: "Product ID and new quantity are required" });
      }

      const qty = parseInt(newQuantity, 10);
      if (isNaN(qty) || qty < 0) {
        return res.status(400).json({ message: "Invalid quantity" });
      }

      let oldQuantity: number;
      let entityName: string;

      if (variantId) {
        // Update variant quantity
        const variant = await storage.getProductVariant(variantId);
        if (!variant) {
          return res.status(404).json({ message: "Variant not found" });
        }
        oldQuantity = variant.quantity || 0;
        await storage.updateProductVariant(variantId, { quantity: qty });
        entityName = variant.name || 'Variant';
      } else {
        // Update product quantity
        const product = await storage.getProductById(productId);
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }
        oldQuantity = product.quantity || 0;
        await storage.updateProduct(productId, { quantity: qty });
        entityName = product.name || 'Product';
      }

      // Create audit trail
      await storage.createUserActivity({
        userId: userId,
        action: 'adjusted',
        entityType: variantId ? 'product_variant' : 'product',
        entityId: variantId || productId,
        description: `Stock quick fix (${inconsistencyType || 'manual'}): ${entityName} quantity changed from ${oldQuantity} to ${qty}. Reason: ${reason || 'Stock inconsistency fix'}`,
      });

      res.json({ 
        success: true, 
        newQuantity: qty, 
        oldQuantity,
        productId,
        variantId 
      });
    } catch (error: any) {
      console.error("Error performing quick stock fix:", error);
      res.status(500).json({ message: error.message || "Failed to fix stock" });
    }
  });

  app.patch('/api/stock-adjustment-requests/:id/approve', isAuthenticated, async (req: any, res) => {
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

  app.patch('/api/stock-adjustment-requests/:id/reject', isAuthenticated, async (req: any, res) => {
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

  // Stock Adjustment History endpoints
  app.get('/api/stock-adjustment-history', isAuthenticated, async (req: any, res) => {
    try {
      const { productId, startDate, endDate, limit, offset } = req.query;
      
      const options: { 
        productId?: string; 
        startDate?: Date; 
        endDate?: Date; 
        limit?: number; 
        offset?: number;
      } = {};
      
      if (productId) options.productId = productId as string;
      if (startDate) options.startDate = new Date(startDate as string);
      if (endDate) options.endDate = new Date(endDate as string);
      if (limit) options.limit = parseInt(limit as string, 10);
      if (offset) options.offset = parseInt(offset as string, 10);

      const history = await storage.getStockAdjustmentHistory(options);
      const total = await storage.getStockAdjustmentHistoryCount(options);
      
      res.json({ history, total });
    } catch (error: any) {
      console.error("Error fetching stock adjustment history:", error);
      res.status(500).json({ message: error.message || "Failed to fetch stock adjustment history" });
    }
  });

  // Packing Materials endpoints
  app.get('/api/packing-materials', isAuthenticated, async (req, res) => {
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

  app.get('/api/packing-materials/:id', isAuthenticated, async (req, res) => {
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

  app.post('/api/packing-materials', isAuthenticated, async (req: any, res) => {
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

  app.patch('/api/packing-materials/:id', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/packing-materials/:id', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/packing-materials/bulk-delete', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/packing-materials/bulk-update-category', isAuthenticated, async (req: any, res) => {
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

  // Bulk create packing materials (for bulk add cartons feature)
  app.post('/api/packing-materials/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const { materials } = req.body;

      if (!Array.isArray(materials) || materials.length === 0) {
        return res.status(400).json({ message: "Invalid request: materials array required" });
      }

      // Validate each material with the schema
      const validatedMaterials = [];
      const errors = [];
      
      for (let i = 0; i < materials.length; i++) {
        try {
          const validated = insertPackingMaterialSchema.parse(materials[i]);
          validatedMaterials.push(validated);
        } catch (validationError: any) {
          errors.push({ index: i, error: validationError.message || "Validation failed" });
        }
      }

      if (validatedMaterials.length === 0) {
        return res.status(400).json({ 
          message: "All materials failed validation", 
          errors 
        });
      }

      // Create all validated materials in bulk
      const createdMaterials = await storage.createPackingMaterialsBulk(validatedMaterials);

      await storage.createUserActivity({
        userId: "test-user",
        action: 'created',
        entityType: 'packing_material',
        entityId: createdMaterials.map(m => m.id).join(','),
        description: `Bulk created ${createdMaterials.length} packing material(s)`,
      });

      res.status(201).json({ 
        created: createdMaterials,
        createdCount: createdMaterials.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Error bulk creating packing materials:", error);
      res.status(500).json({ message: "Failed to bulk create packing materials" });
    }
  });

  // PM Suppliers endpoints
  app.get('/api/pm-suppliers', isAuthenticated, async (req, res) => {
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

  app.get('/api/pm-suppliers/:id', isAuthenticated, async (req, res) => {
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

  app.post('/api/pm-suppliers', isAuthenticated, async (req: any, res) => {
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

  app.patch('/api/pm-suppliers/:id', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/pm-suppliers/:id', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/compress-images', isAuthenticated, async (req, res) => {
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
  app.post('/api/image-info', isAuthenticated, upload.single('image'), async (req, res) => {
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
  app.get('/api/customers', isAuthenticated, async (req, res) => {
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

  app.get('/api/customers/check-duplicate/:facebookId', isAuthenticated, async (req, res) => {
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
  app.get('/api/customers/:id/order-count', isAuthenticated, async (req, res) => {
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

  app.post('/api/customers', isAuthenticated, async (req: any, res) => {
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

  // Customer Import endpoint
  const customerImportUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /xlsx|xls/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      if (extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
      }
    }
  });

  app.post('/api/customers/import', isAuthenticated, customerImportUpload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const XLSX = await import('xlsx');
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (!data || data.length === 0) {
        return res.status(400).json({ message: "No data found in Excel file" });
      }

      const importedCustomers: any[] = [];
      const errors: string[] = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          const name = row['Name'] || '';
          if (!name) {
            errors.push(`Row ${i + 2}: Name is required`);
            continue;
          }

          const customerData = {
            name: name,
            email: row['Email'] || null,
            phone: row['Phone'] || null,
            company: row['Company'] || null,
            type: row['Customer Type'] || 'regular',
            street: row['Street'] || null,
            city: row['City'] || null,
            state: row['State'] || null,
            country: row['Country'] || null,
            postalCode: row['Postal Code'] || null,
            facebookId: row['Facebook ID'] || null,
            facebookName: row['Facebook Name'] || null,
            ico: row['ICO'] || null,
            dic: row['DIC'] || null,
            vatId: row['VAT ID'] || null,
            preferredCurrency: row['Preferred Currency'] || null,
            preferredLanguage: row['Preferred Language'] || null,
            notes: row['Notes'] || null,
          };

          const customer = await storage.createCustomer(customerData);
          importedCustomers.push(customer);
        } catch (error: any) {
          errors.push(`Row ${i + 2}: ${error.message || 'Failed to create customer'}`);
        }
      }

      await storage.createUserActivity({
        userId: "test-user",
        action: 'imported',
        entityType: 'customer',
        entityId: 'bulk',
        description: `Imported ${importedCustomers.length} customers from Excel`,
      });

      res.json({
        imported: importedCustomers.length,
        errors: errors.length > 0 ? errors : undefined,
        customers: importedCustomers
      });
    } catch (error: any) {
      console.error("Error importing customers:", error);
      res.status(500).json({ message: error.message || "Failed to import customers" });
    }
  });

  app.get('/api/customers/:id', isAuthenticated, async (req, res) => {
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

  app.patch('/api/customers/:id', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/customers/:id', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/customers/:id/badges', isAuthenticated, async(req, res) => {
    try {
      const badges = await storage.getCustomerBadges(req.params.id);
      res.json(badges);
    } catch (error) {
      console.error("Error fetching customer badges:", error);
      res.status(500).json({ error: 'Failed to fetch badges' });
    }
  });

  app.post('/api/customers/:id/badges/refresh', isAuthenticated, async (req, res) => {
    try {
      await storage.refreshCustomerBadges(req.params.id);
      res.json({ success: true, message: 'Badges refreshed' });
    } catch (error) {
      console.error("Error refreshing customer badges:", error);
      res.status(500).json({ error: 'Failed to refresh badges' });
    }
  });

  // Customer Shipping Addresses endpoints
  app.get('/api/customers/:customerId/shipping-addresses', isAuthenticated, async (req, res) => {
    try {
      const { customerId } = req.params;
      const addresses = await storage.getCustomerShippingAddresses(customerId);
      res.json(addresses);
    } catch (error) {
      console.error("Error fetching customer shipping addresses:", error);
      res.status(500).json({ message: "Failed to fetch shipping addresses" });
    }
  });

  app.get('/api/shipping-addresses/:id', isAuthenticated, async (req, res) => {
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
  app.get('/api/customers/:customerId/orders', isAuthenticated, async (req, res) => {
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

  app.post('/api/customers/:customerId/shipping-addresses', isAuthenticated, async (req: any, res) => {
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

  app.patch('/api/customers/:customerId/shipping-addresses/:addressId', isAuthenticated, async (req: any, res) => {
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

  app.patch('/api/shipping-addresses/:id', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/shipping-addresses/:id', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/customers/:customerId/shipping-addresses/:addressId/set-primary', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/customers/:customerId/shipping-addresses/:addressId/remove-primary', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/customers/:customerId/billing-addresses', isAuthenticated, async (req, res) => {
    try {
      const { customerId } = req.params;
      const addresses = await storage.getCustomerBillingAddresses(customerId);
      res.json(addresses);
    } catch (error) {
      console.error("Error fetching customer billing addresses:", error);
      res.status(500).json({ message: "Failed to fetch billing addresses" });
    }
  });

  app.get('/api/billing-addresses/:id', isAuthenticated, async (req, res) => {
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

  app.post('/api/customers/:customerId/billing-addresses', isAuthenticated, async (req: any, res) => {
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

  app.patch('/api/billing-addresses/:id', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/billing-addresses/:id', isAuthenticated, async (req: any, res) => {
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

  app.patch('/api/billing-addresses/:id/set-primary', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/customers/:customerId/prices', isAuthenticated, async (req, res) => {
    try {
      const prices = await storage.getCustomerPrices(req.params.customerId);
      res.json(prices);
    } catch (error) {
      console.error("Error fetching customer prices:", error);
      res.status(500).json({ message: "Failed to fetch customer prices" });
    }
  });

  app.post('/api/customers/:customerId/prices', isAuthenticated, async (req: any, res) => {
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

  app.patch('/api/customer-prices/:id', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/customer-prices/:id', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/customers/:customerId/prices/bulk', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/customers/:customerId/active-price', isAuthenticated, async (req, res) => {
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
  app.get('/api/orders', isAuthenticated, async (req: any, res) => {
    try {
      const status = req.query.status as string;
      const paymentStatus = req.query.paymentStatus as string;
      const customerId = req.query.customerId as string;
      const channel = req.query.channel as string;
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

      // Apply channel filter if provided
      if (channel) {
        orders = orders.filter(order => order.channel === channel);
      }

      // If includeItems is requested, fetch order items for each order
      if (includeItems) {
        const ordersWithItems = await Promise.all(orders.map(async (order) => {
          let items: any[] = [];
          try {
            items = await storage.getOrderItems(order.id);
          } catch (itemError: any) {
            console.error(`Failed to fetch items for order ${order.id}:`, itemError?.message || itemError);
          }

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

        // Filter financial data based on user role
        const userRole = req.user?.role || 'warehouse_operator';
        const filtered = filterFinancialData(ordersWithItems, userRole);
        res.json(filtered);
      } else {
        // Filter financial data based on user role
        const userRole = req.user?.role || 'warehouse_operator';
        const filtered = filterFinancialData(orders, userRole);
        res.json(filtered);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get('/api/orders/unpaid', isAuthenticated, async (req, res) => {
    try {
      const orders = await storage.getUnpaidOrders();
      // Filter financial data based on user role
      const userRole = req.user?.role || 'warehouse_operator';
      const filtered = filterFinancialData(orders, userRole);
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching unpaid orders:", error);
      res.status(500).json({ message: "Failed to fetch unpaid orders" });
    }
  });

  // Get archived/trashed orders - MUST be before /api/orders/:id to avoid route conflict
  app.get('/api/orders/trash', isAuthenticated, async (req: any, res) => {
    try {
      const archivedOrders = await storage.getArchivedOrders();
      res.json(archivedOrders);
    } catch (error) {
      console.error("Error fetching trashed orders:", error);
      res.status(500).json({ message: "Failed to fetch trashed orders" });
    }
  });

  // Fetch all order items for analytics (e.g., units sold calculation)
  app.get('/api/order-items/all', isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getAllOrderItems();
      // Filter financial data based on user role
      const userRole = req.user?.role || 'warehouse_operator';
      const filtered = filterFinancialData(items, userRole);
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching all order items:", error);
      res.status(500).json({ message: "Failed to fetch order items" });
    }
  });

  // Pick & Pack endpoints (OPTIMIZED - eliminates N+1 queries)
  app.get('/api/orders/pick-pack', isAuthenticated, async (req, res) => {
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

      // First pass: identify bundles in use AND collect product/variant IDs from all order items
      for (const items of allOrderItemsArrays) {
        for (const item of items) {
          // Collect product ID from every order item
          if (item.productId) {
            productIds.add(item.productId);
            
            // Collect variant IDs from order items for picking
            if (item.variantId) {
              if (!variantRequests.has(item.productId)) {
                variantRequests.set(item.productId, new Set());
              }
              variantRequests.get(item.productId)!.add(item.variantId);
            }
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

              // Get bulkUnitQty from the product if this is a bulk item
              let bulkUnitQty: number | null = null;
              if (bundleItem.productId) {
                const product = productsMap.get(bundleItem.productId);
                if (product && (product as any).bulkUnitQty) {
                  bulkUnitQty = (product as any).bulkUnitQty;
                }
              }

              return {
                id: bundleItem.id,
                productId: bundleItem.productId || null,
                variantId: bundleItem.variantId || null,
                name: productName || bundleItem.notes || 'Bundle Item',
                quantity: bundleItem.quantity,
                bulkUnitQty: bulkUnitQty,
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

          // Enrich variant items with variant quantity for picking
          let variantQuantity: number | undefined;
          let variantLocationCode: string | null = null;
          if (item.variantId && item.productId) {
            const productVariants = variantsMap.get(item.productId);
            if (productVariants) {
              const variant = productVariants.get(item.variantId);
              if (variant) {
                variantQuantity = variant.quantity || 0;
                variantLocationCode = variant.locationCode || null;
              }
            }
          }

          return {
            ...item,
            image: imageUrl,
            variantQuantity,  // Add variant's own stock quantity for picking
            variantLocationCode  // Add variant's location if it has one
          };
        });

        return {
          ...order,
          // Keep the status already mapped by getPickPackStatus in storage layer
          items: itemsWithBundleDetails
        };
      });

      // Filter financial data based on user role
      const userRole = req.user?.role || 'warehouse_operator';
      const filtered = filterFinancialData(ordersWithItems, userRole);
      
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching pick-pack orders:", error);
      res.status(500).json({ message: "Failed to fetch pick-pack orders" });
    }
  });

  // Get pick/pack performance predictions for current user
  app.get('/api/orders/pick-pack/predictions', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/orders/:id/pick/start', isAuthenticated, async (req: any, res) => {
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

      const userId = req.user?.id || "unknown";
      const order = await storage.startPickingOrder(req.params.id, employeeId || userId);

      if (order) {
        // Get order items for item count
        const orderItems = await storage.getOrderItems(req.params.id);
        const itemCount = orderItems.length;
        const totalQuantity = orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
        
        // Log to orderFulfillmentLogs for employee tracking
        await storage.logFulfillmentStart(req.params.id, userId, 'pick', itemCount, totalQuantity);
        
        await storage.createUserActivity({
          userId,
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
  app.post('/api/orders/:id/pick/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || "unknown";
      
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
        // Log completion to orderFulfillmentLogs
        await storage.logFulfillmentComplete(req.params.id, userId, 'pick');
        
        await storage.createUserActivity({
          userId,
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
  app.post('/api/orders/:id/pack/start', isAuthenticated, async (req: any, res) => {
    try {
      const { employeeId } = req.body;
      const userId = req.user?.id || "unknown";

      // Handle mock orders
      if (req.params.id.startsWith('mock-')) {
        return res.json({ 
          id: req.params.id, 
          orderId: req.params.id,
          packStatus: 'in_progress',
          packedBy: employeeId || userId,
          packStartTime: new Date().toISOString(),
          message: 'Mock order packing started' 
        });
      }

      const order = await storage.startPackingOrder(req.params.id, employeeId || userId);

      if (order) {
        // Get order items for item count
        const orderItems = await storage.getOrderItems(req.params.id);
        const itemCount = orderItems.length;
        const totalQuantity = orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
        
        // Log to orderFulfillmentLogs for employee tracking
        await storage.logFulfillmentStart(req.params.id, userId, 'pack', itemCount, totalQuantity);
        
        await storage.createUserActivity({
          userId,
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
  app.post('/api/orders/:id/pack/complete', isAuthenticated, async (req: any, res) => {
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

      // Track all material IDs that have been processed to avoid duplicates
      const processedMaterialIds = new Set<string>();

      // Process carton stock deduction - count actual usage from cartons array
      if (cartons && Array.isArray(cartons) && cartons.length > 0) {
        // Count how many of each cartonId was used (only for company cartons with valid IDs)
        const cartonUsageCount: Record<string, number> = {};
        for (const carton of cartons) {
          const cartonId = carton.cartonId;
          const isNonCompany = carton.isNonCompany || carton.cartonType === 'non-company';
          
          if (cartonId && !isNonCompany) {
            cartonUsageCount[cartonId] = (cartonUsageCount[cartonId] || 0) + 1;
          }
        }

        // Deduct stock for each carton type based on actual usage
        for (const [cartonId, count] of Object.entries(cartonUsageCount)) {
          try {
            console.log(`[Pack Complete] Deducting ${count} carton(s) of ID ${cartonId}`);
            await storage.decreasePackingMaterialStock(cartonId, count);
            processedMaterialIds.add(cartonId);

            // Create usage record with actual quantity
            await storage.createPackingMaterialUsage({
              orderId: req.params.id,
              materialId: cartonId,
              quantity: count,
              notes: `Carton used during packing (${count}x)`
            });
          } catch (stockError) {
            console.error(`Error updating stock for carton ${cartonId}:`, stockError);
          }
        }
      }

      // Process packing materials from packingMaterialsApplied map
      // This handles both non-carton materials and cartons that weren't in the cartons array
      // Supports both boolean (true) and numeric quantities
      if (packingMaterialsApplied && typeof packingMaterialsApplied === 'object') {
        for (const [materialId, value] of Object.entries(packingMaterialsApplied)) {
          // Skip if already processed from cartons array
          if (processedMaterialIds.has(materialId)) {
            continue;
          }

          // Determine quantity: support both boolean (true = 1) and numeric values
          let quantity = 0;
          if (typeof value === 'number' && value > 0) {
            quantity = Math.floor(value); // Use the numeric quantity
          } else if (value === true) {
            quantity = 1; // Boolean true means 1 unit
          }

          if (quantity > 0) {
            try {
              console.log(`[Pack Complete] Deducting ${quantity} unit(s) of material ${materialId}`);
              await storage.decreasePackingMaterialStock(materialId, quantity);
              processedMaterialIds.add(materialId);

              // Create usage record
              await storage.createPackingMaterialUsage({
                orderId: req.params.id,
                materialId: materialId,
                quantity: quantity,
                notes: quantity > 1 ? `Applied during packing (${quantity}x)` : 'Applied during packing completion'
              });
            } catch (stockError) {
              console.error(`Error updating stock for material ${materialId}:`, stockError);
              // Continue with other materials even if one fails
            }
          }
        }
      }

      const order = await storage.getOrderById(req.params.id);
      const userId = req.user?.id || "unknown";

      if (order) {
        // Log completion to orderFulfillmentLogs
        await storage.logFulfillmentComplete(req.params.id, userId, 'pack');
        
        await storage.createUserActivity({
          userId,
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
  app.post('/api/packing/sessions', isAuthenticated, async (req, res) => {
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
  app.patch('/api/packing/sessions/:sessionId', isAuthenticated, async (req, res) => {
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
  app.get('/api/packing/sessions/:sessionId', isAuthenticated, async (req, res) => {
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
  app.post('/api/orders/:id/packing-details', isAuthenticated, async (req: any, res) => {
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

  // Update picked quantity for an order item and reduce stock from location
  app.patch('/api/orders/:id/items/:itemId/pick', isAuthenticated, async (req: any, res) => {
    try {
      const { pickedQuantity, locationCode, qtyChange, productId, variantId, bulkUnitQty, pickedFromLocations } = req.body;
      
      // Update the order item's picked quantity
      const orderItem = await storage.updateOrderItemPickedQuantity(req.params.itemId, pickedQuantity);
      
      // Save pickedFromLocations to the order item for later restoration
      if (pickedFromLocations && typeof pickedFromLocations === 'object') {
        try {
          await storage.updateOrderItem(req.params.itemId, {
            pickedFromLocations: pickedFromLocations
          });
        } catch (pfError) {
          console.error('Error saving pickedFromLocations:', pfError);
          // Don't fail the pick if this fails
        }
      } else if (locationCode && qtyChange > 0) {
        // Single location pick - update the stored locations
        try {
          const currentItem = await storage.getOrderItemById(req.params.itemId);
          const currentLocations = (currentItem?.pickedFromLocations as Record<string, number>) || {};
          const newLocations = { ...currentLocations };
          newLocations[locationCode] = (newLocations[locationCode] || 0) + qtyChange;
          await storage.updateOrderItem(req.params.itemId, {
            pickedFromLocations: newLocations
          });
        } catch (pfError) {
          console.error('Error updating pickedFromLocations:', pfError);
        }
      } else if (locationCode && qtyChange < 0) {
        // Unpicking - reduce the stored quantity
        try {
          const currentItem = await storage.getOrderItemById(req.params.itemId);
          const currentLocations = (currentItem?.pickedFromLocations as Record<string, number>) || {};
          const newLocations = { ...currentLocations };
          newLocations[locationCode] = Math.max(0, (newLocations[locationCode] || 0) + qtyChange);
          if (newLocations[locationCode] === 0) {
            delete newLocations[locationCode];
          }
          await storage.updateOrderItem(req.params.itemId, {
            pickedFromLocations: Object.keys(newLocations).length > 0 ? newLocations : null
          });
        } catch (pfError) {
          console.error('Error updating pickedFromLocations:', pfError);
        }
      }
      
      // Check if this is a virtual SKU product that deducts from master product
      let targetProductId = productId;
      let deductionRatio = 1;
      let isVirtualSku = false;
      let virtualProductName = '';
      let masterProductName = '';
      
      if (productId) {
        const product = await storage.getProductById(productId);
        if (product?.isVirtual && product?.masterProductId) {
          isVirtualSku = true;
          targetProductId = product.masterProductId;
          deductionRatio = parseFloat(product.inventoryDeductionRatio || '1');
          virtualProductName = product.name;
          
          // Get master product name for logging
          const masterProduct = await storage.getProductById(targetProductId);
          masterProductName = masterProduct?.name || 'Unknown Master';
          
          console.log(`🎯 Virtual SKU detected: "${virtualProductName}" → deducting from "${masterProductName}" (ratio: ${deductionRatio})`);
        }
      }
      
      // Calculate actual stock change
      // For virtual SKUs: multiply by deduction ratio (e.g., 1 Bucket = 17 Jars)
      // For bulk units: multiply by bulkUnitQty (e.g., 1 carton = 12 pieces)
      const stockMultiplier = isVirtualSku ? deductionRatio : ((bulkUnitQty && bulkUnitQty > 1) ? bulkUnitQty : 1);
      const actualQtyChange = qtyChange * stockMultiplier;
      
      // Reduce stock from location if we have the necessary info and quantity increased
      // For virtual SKUs: we ALWAYS need to deduct from master product, even if no locationCode specified
      if (targetProductId && actualQtyChange > 0) {
        try {
          // Find the location for the target product (master product for virtual SKUs)
          const locations = await storage.getProductLocations(targetProductId);
          
          // Find location: use specified locationCode if provided, otherwise use primary or first location
          let location = null;
          if (locationCode) {
            location = locations.find(loc => 
              loc.locationCode.toUpperCase() === locationCode.toUpperCase()
            );
          }
          // For virtual SKUs or when no location specified, fallback to primary or first location
          if (!location && (isVirtualSku || !locationCode)) {
            location = locations.find(loc => loc.isPrimary) || locations[0];
            if (location && isVirtualSku) {
              console.log(`🎯 [Virtual SKU] Auto-selected master product location: ${location.locationCode}`);
            }
          }
          
          if (location) {
            const currentQty = location.quantity || 0;
            const newQty = Math.max(0, currentQty - actualQtyChange);
            await storage.updateProductLocation(location.id, { quantity: newQty });
            
            // ALWAYS update the main product quantity (both virtual and regular products)
            const targetProduct = await storage.getProductById(targetProductId);
            if (targetProduct) {
              const currentProductQty = targetProduct.quantity || 0;
              const newProductQty = Math.max(0, currentProductQty - actualQtyChange);
              await storage.updateProduct(targetProductId, { quantity: newProductQty });
              
              if (isVirtualSku) {
                console.log(`📦 [Virtual SKU] Picked ${qtyChange}x "${virtualProductName}", deducted ${actualQtyChange}x "${masterProductName}" from ${locationCode}: ${currentQty} → ${newQty}, product qty: ${currentProductQty} → ${newProductQty}`);
              } else {
                console.log(`📦 Picked ${qtyChange}x, reduced location ${locationCode}: ${currentQty} → ${newQty}, product qty: ${currentProductQty} → ${newProductQty}`);
              }
            }
          } else {
            console.warn(`⚠️ Location ${locationCode} not found for ${isVirtualSku ? 'master ' : ''}product ${targetProductId} - stock not reduced`);
          }
        } catch (locationError) {
          console.error('Error reducing location stock:', locationError);
          // Don't fail the pick operation if stock reduction fails
        }
        
        // Also deduct from variant quantity if this is a variant item
        if (variantId && !isVirtualSku) {
          try {
            const variant = await storage.getProductVariant(variantId);
            if (variant) {
              const currentVariantQty = variant.quantity || 0;
              const newVariantQty = Math.max(0, currentVariantQty - qtyChange);
              await storage.updateProductVariant(variantId, { quantity: newVariantQty });
              console.log(`📦 [Variant] Picked ${qtyChange}x variant "${variant.name}", qty: ${currentVariantQty} → ${newVariantQty}`);
            }
          } catch (variantError) {
            console.error('Error deducting variant quantity:', variantError);
          }
        }
      } else if (targetProductId && actualQtyChange < 0) {
        // If quantity decreased (unpicking), restore stock to location
        try {
          const locations = await storage.getProductLocations(targetProductId);
          
          // Find location: use specified locationCode if provided, otherwise use primary or first location
          let location = null;
          if (locationCode) {
            location = locations.find(loc => 
              loc.locationCode.toUpperCase() === locationCode.toUpperCase()
            );
          }
          // For virtual SKUs or when no location specified, fallback to primary or first location
          if (!location && (isVirtualSku || !locationCode)) {
            location = locations.find(loc => loc.isPrimary) || locations[0];
            if (location && isVirtualSku) {
              console.log(`🎯 [Virtual SKU Unpick] Auto-selected master product location: ${location.locationCode}`);
            }
          }
          
          if (location) {
            const currentQty = location.quantity || 0;
            const restoreQty = Math.abs(actualQtyChange);
            const newQty = currentQty + restoreQty;
            await storage.updateProductLocation(location.id, { quantity: newQty });
            
            // ALWAYS restore the main product quantity (both virtual and regular products)
            const targetProduct = await storage.getProductById(targetProductId);
            if (targetProduct) {
              const currentProductQty = targetProduct.quantity || 0;
              const newProductQty = currentProductQty + restoreQty;
              await storage.updateProduct(targetProductId, { quantity: newProductQty });
              
              if (isVirtualSku) {
                console.log(`📦 [Virtual SKU] Unpicked ${Math.abs(qtyChange)}x "${virtualProductName}", restored ${restoreQty}x "${masterProductName}" to ${locationCode}: ${currentQty} → ${newQty}, product qty: ${currentProductQty} → ${newProductQty}`);
              } else {
                console.log(`📦 Unpicked ${Math.abs(qtyChange)}x, restored location ${locationCode}: ${currentQty} → ${newQty}, product qty: ${currentProductQty} → ${newProductQty}`);
              }
            }
          }
        } catch (locationError) {
          console.error('Error restoring location stock:', locationError);
        }
        
        // Also restore variant quantity if this is a variant item
        if (variantId && !isVirtualSku) {
          try {
            const variant = await storage.getProductVariant(variantId);
            if (variant) {
              const currentVariantQty = variant.quantity || 0;
              const restoreQty = Math.abs(qtyChange);
              const newVariantQty = currentVariantQty + restoreQty;
              await storage.updateProductVariant(variantId, { quantity: newVariantQty });
              console.log(`📦 [Variant] Unpicked ${restoreQty}x variant "${variant.name}", qty: ${currentVariantQty} → ${newVariantQty}`);
            }
          } catch (variantError) {
            console.error('Error restoring variant quantity:', variantError);
          }
        }
      }
      
      // Log virtual SKU deduction in audit trail
      if (isVirtualSku && actualQtyChange !== 0) {
        try {
          const actionType = actualQtyChange > 0 ? 'virtual_sku_picked' : 'virtual_sku_unpicked';
          const notes = actualQtyChange > 0 
            ? `Sold ${qtyChange}x ${virtualProductName} (Virtual SKU), deducted ${actualQtyChange}x ${masterProductName} from Master SKU`
            : `Unpicked ${Math.abs(qtyChange)}x ${virtualProductName} (Virtual SKU), restored ${Math.abs(actualQtyChange)}x ${masterProductName} to Master SKU`;
          
          await storage.createPickPackLog({
            orderId: req.params.id,
            orderItemId: req.params.itemId,
            activityType: actionType,
            userId: req.user?.id || "system",
            userName: req.user?.username || "System",
            productName: virtualProductName,
            sku: '',
            quantity: Math.abs(actualQtyChange),
            location: locationCode,
            notes: notes,
          });
        } catch (logError) {
          console.error('Error logging virtual SKU activity:', logError);
        }
      }
      
      // Add virtual SKU info to response for frontend logging
      const response: any = { ...orderItem };
      if (isVirtualSku) {
        response.virtualSkuDeduction = {
          virtualProductName,
          masterProductName,
          masterProductId: targetProductId,
          deductionRatio,
          actualDeducted: actualQtyChange
        };
      }
      
      res.json(response);
    } catch (error) {
      console.error("Error updating picked quantity:", error);
      res.status(500).json({ message: "Failed to update picked quantity" });
    }
  });

  // Deduct inventory for bundle component picking
  // This endpoint handles inventory deduction for individual bundle components
  // Supports virtual SKUs within bundles (deducts from master product)
  app.post('/api/orders/:id/bundle-component/pick', isAuthenticated, async (req: any, res) => {
    try {
      const { productId, locationCode, quantity, componentId, action } = req.body;
      
      if (!productId || !locationCode || !quantity) {
        return res.status(400).json({ message: 'Missing required fields: productId, locationCode, quantity' });
      }
      
      // Check if this is a virtual SKU that deducts from master product
      let targetProductId = productId;
      let actualQuantity = quantity;
      let isVirtualSku = false;
      
      const product = await storage.getProductById(productId);
      if (product?.isVirtual && product?.masterProductId) {
        isVirtualSku = true;
        targetProductId = product.masterProductId;
        const deductionRatio = parseFloat(product.inventoryDeductionRatio || '1');
        actualQuantity = quantity * deductionRatio;
        console.log(`🎯 [Bundle Component] Virtual SKU detected: "${product.name}" → deducting from master (ratio: ${deductionRatio})`);
      }
      
      // Find the location for the target product (master product for virtual SKUs)
      const locations = await storage.getProductLocations(targetProductId);
      let location = locations.find(loc => 
        loc.locationCode.toUpperCase() === locationCode.toUpperCase()
      );
      
      // For virtual SKUs, fallback to primary or first location if specified location not found
      if (!location && isVirtualSku) {
        location = locations.find(loc => loc.isPrimary) || locations[0];
        if (location) {
          console.log(`🎯 [Bundle Component Virtual SKU] Auto-selected master product location: ${location.locationCode}`);
        }
      }
      
      if (!location) {
        return res.status(404).json({ message: `Location ${locationCode} not found for ${isVirtualSku ? 'master ' : ''}product ${targetProductId}` });
      }
      
      const currentQty = location.quantity || 0;
      let newQty;
      
      if (action === 'restore') {
        // Restore stock (unpicking)
        newQty = currentQty + actualQuantity;
        console.log(`📦 [Bundle Component${isVirtualSku ? ' Virtual' : ''}] Restored stock at ${location.locationCode} for product ${targetProductId}: ${currentQty} → ${newQty} (+${actualQuantity})`);
      } else {
        // Deduct stock (picking)
        newQty = Math.max(0, currentQty - actualQuantity);
        console.log(`📦 [Bundle Component${isVirtualSku ? ' Virtual' : ''}] Deducted stock at ${location.locationCode} for product ${targetProductId}: ${currentQty} → ${newQty} (-${actualQuantity})`);
      }
      
      await storage.updateProductLocation(location.id, { quantity: newQty });
      
      // Also update the main product quantity (target product for virtual SKUs)
      const targetProduct = await storage.getProductById(targetProductId);
      if (targetProduct) {
        const currentProductQty = targetProduct.quantity || 0;
        const newProductQty = action === 'restore' 
          ? currentProductQty + actualQuantity 
          : Math.max(0, currentProductQty - actualQuantity);
        await storage.updateProduct(targetProductId, { quantity: newProductQty });
        console.log(`📦 [Bundle Component${isVirtualSku ? ' Virtual' : ''}] Product qty updated: ${currentProductQty} → ${newProductQty}`);
      }
      
      // Log the activity
      await storage.createPickPackLog({
        orderId: req.params.id,
        orderItemId: componentId || null,
        activityType: action === 'restore' ? 'bundle_component_unpicked' : 'bundle_component_picked',
        userId: req.user?.id || "system",
        userName: req.user?.username || "System",
        productName: '',
        sku: '',
        quantity: quantity,
        location: locationCode,
        notes: `Bundle component ${action === 'restore' ? 'unpicked' : 'picked'}: ${quantity} from ${locationCode}`,
      });
      
      res.json({ 
        success: true, 
        previousQuantity: currentQty,
        newQuantity: newQty,
        action: action || 'pick'
      });
    } catch (error) {
      console.error("Error handling bundle component pick:", error);
      res.status(500).json({ message: "Failed to process bundle component pick" });
    }
  });

  // Reset all picking for an order - restores location quantities and resets pickedQuantity
  // Supports both single-location format (pickedLocations: { itemId: locationCode })
  // and multi-location format (pickedFromLocations: { itemId: { locationCode: qty } })
  // 
  // ALWAYS restores inventory and resets pickedQuantity so items can be re-picked
  // and will show as "allocated" in inventory until picked again.
  app.post('/api/orders/:id/reset-picking', isAuthenticated, async (req: any, res) => {
    try {
      const orderId = req.params.id;
      const { pickedLocations, pickedFromLocations } = req.body;
      
      // Get the order to check its current pickStatus
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // ALWAYS restore inventory and reset pickedQuantity when resetting picking
      // This ensures items show as "allocated" in inventory until re-picked
      // Whether resetting during active picking OR reverting from packing
      const shouldRestoreInventory = true;
      
      console.log(`📦 Reset-picking: order ${orderId}, pickStatus=${order.pickStatus}, shouldRestoreInventory=${shouldRestoreInventory}`);
      
      // Get order items with their picked quantities
      const orderItems = await storage.getOrderItems(orderId);
      
      let restoredLocations = 0;
      let restoredQuantity = 0;
      
      // For each item with picked quantity > 0
      for (const item of orderItems) {
        if ((item.pickedQuantity || 0) > 0 && item.productId) {
          try {
            // Check if this is a virtual SKU - restore to master product
            // Use order item fields first (set at order creation), fallback to product fields
            const product = await storage.getProductById(item.productId);
            let targetProductId = item.productId;
            let deductionRatio = 1;
            let isVirtualSku = false;
            
            // Check order item fields first (they capture state at order time)
            if (item.isVirtual && item.masterProductId) {
              isVirtualSku = true;
              targetProductId = item.masterProductId;
              deductionRatio = parseFloat(item.inventoryDeductionRatio || '1');
              console.log(`📦 Reset [Debug]: Virtual SKU from ORDER ITEM: isVirtual=${item.isVirtual}, masterProductId=${item.masterProductId}, ratio=${deductionRatio}`);
            }
            // Fallback to product fields for legacy orders
            else if (product?.isVirtual && product?.masterProductId) {
              isVirtualSku = true;
              targetProductId = product.masterProductId;
              deductionRatio = parseFloat(product.inventoryDeductionRatio || '1');
              console.log(`📦 Reset [Debug]: Virtual SKU from PRODUCT: isVirtual=${product.isVirtual}, masterProductId=${product.masterProductId}, ratio=${deductionRatio}`);
            }
            
            // Only restore inventory if we're resetting during active picking (not reverting from packing)
            if (shouldRestoreInventory) {
              // Get product locations for the target product (master product for virtual SKUs)
              const locations = await storage.getProductLocations(targetProductId);
            
              // Check if we have multi-location picks for this item
              // Priority: 1) Frontend state (pickedFromLocations), 2) Database field (item.pickedFromLocations)
              let multiLocationPicks = pickedFromLocations?.[item.id];
              
              // If frontend didn't provide locations, try to read from database
              if (!multiLocationPicks && item.pickedFromLocations) {
                multiLocationPicks = item.pickedFromLocations as Record<string, number>;
                console.log(`📦 Using stored pickedFromLocations for item ${item.id}:`, multiLocationPicks);
              }
              
              if (multiLocationPicks && typeof multiLocationPicks === 'object') {
                // Multi-location format: restore to each location separately
                // pickedFromLocations stores picked quantity in VIRTUAL units (e.g., buckets for virtual SKUs)
                // The actual stock deduction was: pickedQty * deductionRatio
                // So restoration should be: pickedQty * deductionRatio
                
                // SAFETY: Cap restoration at the recorded pickedQuantity (not order quantity, which may have changed)
                // This ensures we never restore more than what was actually deducted
                const maxRestorationVirtual = item.pickedQuantity || 0;
                const maxRestorationMaster = isVirtualSku ? (maxRestorationVirtual * deductionRatio) : maxRestorationVirtual;
                let totalRestoredForItem = 0;
                
                // Calculate total virtual picks from pickedFromLocations
                const totalVirtualPicks = Object.values(multiLocationPicks).reduce((sum, qty) => sum + (Number(qty) || 0), 0);
                
                console.log(`📦 Reset [Debug]: item ${item.id?.slice(-6)}, orderQty=${item.quantity}, pickedQty=${item.pickedQuantity}, totalVirtualPicks=${totalVirtualPicks}, maxRestoreMaster=${maxRestorationMaster}, isVirtual=${isVirtualSku}, ratio=${deductionRatio}`);
                
                for (const [locationCode, qty] of Object.entries(multiLocationPicks)) {
                  const pickedQty = Number(qty) || 0;
                  if (pickedQty <= 0) continue;
                  
                  const targetLocation = locations.find(loc => 
                    loc.locationCode.toUpperCase() === locationCode.toUpperCase()
                  );
                  
                  if (targetLocation) {
                    const currentQty = targetLocation.quantity || 0;
                    
                    // For virtual SKUs: pickedQty is in virtual units, multiply by ratio to get master units
                    // For regular products: pickedQty is in actual pieces
                    let restoreQty = isVirtualSku ? (pickedQty * deductionRatio) : pickedQty;
                    
                    // SAFETY CAP: Don't restore more than the maximum allowed
                    const remainingAllowed = maxRestorationMaster - totalRestoredForItem;
                    if (restoreQty > remainingAllowed) {
                      console.warn(`⚠️ Safety cap: Would restore ${restoreQty} but only ${remainingAllowed} allowed. Capping.`);
                      restoreQty = Math.max(0, remainingAllowed);
                    }
                    
                    if (restoreQty <= 0) continue;
                    
                    const newQty = currentQty + restoreQty;
                    
                    await storage.updateProductLocation(targetLocation.id, { quantity: newQty });
                    
                    // Also restore the main product quantity
                    const targetProduct = await storage.getProductById(targetProductId);
                    if (targetProduct) {
                      const currentProductQty = targetProduct.quantity || 0;
                      const newProductQty = currentProductQty + restoreQty;
                      await storage.updateProduct(targetProductId, { quantity: newProductQty });
                      
                      if (isVirtualSku) {
                        console.log(`📦 Reset [Virtual SKU Multi-Loc]: Restored ${pickedQty} × ${deductionRatio} = ${restoreQty} to ${locationCode} for master product ${targetProductId}: ${currentQty} → ${newQty}`);
                      } else {
                        console.log(`📦 Reset [Multi-Loc]: Restored ${pickedQty} to ${locationCode} for product ${item.productId}: ${currentQty} → ${newQty}`);
                      }
                    }
                    
                    totalRestoredForItem += restoreQty;
                    restoredLocations++;
                    restoredQuantity += restoreQty;
                  } else {
                    console.warn(`⚠️ Location ${locationCode} not found for product ${targetProductId}, skipping restore`);
                  }
                }
                
                // Also restore variant quantity if this item has a variant
                if (item.variantId && !isVirtualSku) {
                  try {
                    const variant = await storage.getProductVariant(item.variantId);
                    if (variant) {
                      const currentVariantQty = variant.quantity || 0;
                      const restoreQty = item.pickedQuantity || 0;
                      const newVariantQty = currentVariantQty + restoreQty;
                      await storage.updateProductVariant(item.variantId, { quantity: newVariantQty });
                      console.log(`📦 Reset [Variant Multi-Loc]: Restored ${restoreQty}x variant "${variant.name}", qty: ${currentVariantQty} → ${newVariantQty}`);
                    }
                  } catch (variantError) {
                    console.error('Error restoring variant quantity during reset:', variantError);
                  }
                }
              } else {
                // Single-location format (legacy): restore to one location
                const usedLocationCode = pickedLocations?.[item.id];
                let targetLocation = null;
                
                if (usedLocationCode) {
                  targetLocation = locations.find(loc => 
                    loc.locationCode.toUpperCase() === usedLocationCode.toUpperCase()
                  );
                }
                
                // Fallback to primary location if the picked location wasn't provided or not found
                if (!targetLocation) {
                  targetLocation = locations.find(loc => loc.isPrimary) || locations[0];
                }
                
                if (targetLocation) {
                  const currentQty = targetLocation.quantity || 0;
                  // Use pickedQuantity which is in VIRTUAL units for virtual SKUs
                  const pickedCount = item.pickedQuantity || 0;
                  
                  // For virtual SKUs: pickedQuantity is in virtual units, multiply by ratio
                  // For regular products: pickedQuantity is in actual pieces
                  const restoreQty = isVirtualSku ? (pickedCount * deductionRatio) : pickedCount;
                  const newQty = currentQty + restoreQty;
                  
                  console.log(`📦 Reset [Debug Single-Loc]: item ${item.id?.slice(-6)}, orderQty=${item.quantity}, pickedQty=${pickedCount}, restoreQty=${restoreQty}, isVirtual=${isVirtualSku}, ratio=${deductionRatio}`);
                  
                  await storage.updateProductLocation(targetLocation.id, { quantity: newQty });
                  
                  // Also restore the main product quantity
                  const targetProduct = await storage.getProductById(targetProductId);
                  if (targetProduct) {
                    const currentProductQty = targetProduct.quantity || 0;
                    const newProductQty = currentProductQty + restoreQty;
                    await storage.updateProduct(targetProductId, { quantity: newProductQty });
                    
                    if (isVirtualSku) {
                      console.log(`📦 Reset [Virtual SKU]: Restored ${pickedCount} × ${deductionRatio} = ${restoreQty} to ${targetLocation.locationCode} for master product ${targetProductId}: ${currentQty} → ${newQty}, product qty: ${currentProductQty} → ${newProductQty}`);
                    } else {
                      console.log(`📦 Reset: Restored ${pickedCount} to ${targetLocation.locationCode} for product ${item.productId}: ${currentQty} → ${newQty}`);
                    }
                  }
                  
                  restoredLocations++;
                  restoredQuantity += restoreQty;
                }
                
                // Also restore variant quantity if this item has a variant
                if (item.variantId && !isVirtualSku) {
                  try {
                    const variant = await storage.getProductVariant(item.variantId);
                    if (variant) {
                      const currentVariantQty = variant.quantity || 0;
                      const restoreQty = item.pickedQuantity || 0;
                      const newVariantQty = currentVariantQty + restoreQty;
                      await storage.updateProductVariant(item.variantId, { quantity: newVariantQty });
                      console.log(`📦 Reset [Variant Single-Loc]: Restored ${restoreQty}x variant "${variant.name}", qty: ${currentVariantQty} → ${newVariantQty}`);
                    }
                  } catch (variantError) {
                    console.error('Error restoring variant quantity during reset:', variantError);
                  }
                }
              }
            }
            
            // Always reset picked quantity so items can be re-picked
            await storage.updateOrderItemPickedQuantity(item.id, 0);
            await storage.updateOrderItem(item.id, { pickedFromLocations: null });
          } catch (itemError) {
            console.error(`Error restoring stock for item ${item.id}:`, itemError);
          }
        } else if ((item.pickedQuantity || 0) > 0 && item.bundleId) {
          // Bundle items - restore bundle availableStock only during active picking
          try {
            if (shouldRestoreInventory) {
              const bundle = await storage.getBundleById(item.bundleId);
              if (bundle) {
                const currentStock = bundle.availableStock || 0;
                const restoreQty = item.pickedQuantity || 0;
                await storage.updateBundle(item.bundleId, {
                  availableStock: currentStock + restoreQty
                });
                console.log(`📦 Reset [Bundle]: Restored ${restoreQty} to bundle "${bundle.name}": ${currentStock} → ${currentStock + restoreQty}`);
                restoredQuantity += restoreQty;
              }
            }
            // Always reset picked quantity so items can be re-picked
            await storage.updateOrderItemPickedQuantity(item.id, 0);
          } catch (bundleError) {
            console.error(`Error restoring bundle stock for item ${item.id}:`, bundleError);
          }
        } else if ((item.pickedQuantity || 0) > 0) {
          // Service items or items without productId - always reset picked quantity
          await storage.updateOrderItemPickedQuantity(item.id, 0);
        }
      }
      
      // Always reset order to 'not_started' so items need to be picked fresh
      await storage.updateOrder(orderId, {
        pickStatus: 'not_started',
        pickStartTime: null,
        pickEndTime: null,
        pickedBy: null
      });
      console.log(`📦 Order ${orderId} picking reset: ${restoredLocations} locations, ${restoredQuantity} units restored`);
      
      // Invalidate allocation cache so products query recalculates allocations
      storage.invalidateAllocatedQuantitiesCache();
      
      res.json({ 
        success: true, 
        message: 'Order picking reset successfully',
        restoredLocations,
        restoredQuantity
      });
    } catch (error) {
      console.error("Error resetting order picking:", error);
      res.status(500).json({ message: "Failed to reset order picking" });
    }
  });

  // Update packed quantity for an order item
  app.patch('/api/orders/:id/items/:itemId/pack', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/orders/:id/pick-pack-logs', isAuthenticated, async (req: any, res) => {
    try {
      const logs = await storage.getPickPackLogs(req.params.id);
      res.json(logs);
    } catch (error) {
      console.error("Error getting pick/pack logs:", error);
      res.status(500).json({ message: "Failed to get pick/pack logs" });
    }
  });

  // Get shipment labels for an order
  app.get('/api/orders/:id/shipment-labels', isAuthenticated, async (req: any, res) => {
    try {
      const labels = await storage.getShipmentLabelsByOrderId(req.params.id);
      res.json(labels);
    } catch (error) {
      console.error("Error getting shipment labels:", error);
      res.status(500).json({ message: "Failed to get shipment labels" });
    }
  });

  // Get tracking for an order
  app.get('/api/orders/:id/tracking', isAuthenticated, async (req, res) => {
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
  app.patch('/api/tracking/:id/refresh', isAuthenticated, async (req, res) => {
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
      const result = await trackingService.refreshTracking(id);
      res.json(result.tracking);
    } catch (error: any) {
      console.error('Error refreshing tracking:', error);
      res.status(500).json({ error: error.message || 'Failed to refresh tracking' });
    }
  });

  // Bulk refresh all active tracking
  // Only refreshes during working hours (Mon-Fri 8am-6pm) and skips delivered orders
  app.post('/api/tracking/bulk-refresh', isAuthenticated, async (req, res) => {
    try {
      // Load shipping settings
      const shippingSettings = await getSettingsByCategory('shipping');
      const enableTracking = shippingSettings.enableTracking ?? true;
      const trackingUpdateFrequencyHours = shippingSettings.trackingUpdateFrequencyHours ?? 1;

      // Guard: Return early if tracking disabled
      if (!enableTracking) {
        return res.json({ refreshed: 0, total: 0, message: 'Tracking is disabled' });
      }

      // Guard: Skip refresh outside working hours (Mon-Fri 8am-6pm)
      // Reduces unnecessary API calls on weekends and overnight
      const force = req.body?.force === true;
      if (!isWithinWorkingHours() && !force) {
        return res.json({ 
          refreshed: 0, 
          total: 0, 
          message: 'Skipped: Outside working hours (Mon-Fri 8am-6pm)',
          outsideWorkingHours: true
        });
      }

      // Calculate frequency in milliseconds
      const frequencyMs = trackingUpdateFrequencyHours * 60 * 60 * 1000;

      // Get all tracking that:
      // 1. Hasn't been delivered (deliveredAt is NULL)
      // 2. statusCode is NOT 'delivered' (redundant safety check)
      // 3. Due for refresh based on configured frequency
      const activeTracking = await db.query.shipmentTracking.findMany({
        where: and(
          isNull(shipmentTracking.deliveredAt),
          sql`${shipmentTracking.statusCode} != 'delivered'`,
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
      let ordersUpdatedCount = 0;
      
      for (const tracking of activeTracking) {
        try {
          const result = await trackingService.refreshTracking(tracking.id);
          refreshed++;
          // Only count if the order was actually updated to delivered
          if (result.orderUpdated) {
            ordersUpdatedCount++;
          }
        } catch (error) {
          console.error(`Failed to refresh tracking ${tracking.id}:`, error);
        }
      }
      
      // Also reconcile any shipped orders with already-delivered tracking
      // This catches orders that had tracking marked delivered before this feature
      const reconciledOrders = await trackingService.reconcileDeliveredOrders();

      res.json({ 
        refreshed, 
        total: activeTracking.length,
        ordersUpdatedToDelivered: ordersUpdatedCount + reconciledOrders,
        reconciledOrders
      });
    } catch (error: any) {
      console.error('Error in bulk refresh:', error);
      res.status(500).json({ error: error.message || 'Bulk refresh failed' });
    }
  });

  app.get('/api/orders/:id', isAuthenticated, async (req: any, res) => {
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

      // Filter financial data based on user role
      const userRole = req.user?.role || 'warehouse_operator';
      const filtered = filterFinancialData(order, userRole);
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  // Get order items for a specific order (for lazy loading)
  app.get('/api/orders/:id/items', isAuthenticated, async (req: any, res) => {
    try {
      const orderId = req.params.id;
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Get order items
      let items: any[] = [];
      try {
        items = await storage.getOrderItems(orderId);
      } catch (itemError: any) {
        console.error(`Failed to fetch items for order ${orderId}:`, itemError?.message || itemError);
        return res.json([]);
      }

      // Enhance items with product data (images, landing costs, product name)
      const enhancedItems = await Promise.all(items.map(async (item) => {
        if (item.productId) {
          const [productData] = await db
            .select()
            .from(products)
            .where(eq(products.id, item.productId))
            .limit(1);

          return {
            ...item,
            productName: item.productName || productData?.name || 'Unknown Product',
            landingCost: productData?.latestLandingCost || null,
            image: item.image || productData?.imageUrl || null
          };
        }

        if (item.bundleId) {
          const [bundleData] = await db
            .select()
            .from(productBundles)
            .where(eq(productBundles.id, item.bundleId))
            .limit(1);

          return {
            ...item,
            productName: item.productName || bundleData?.name || 'Unknown Bundle',
            image: item.image || bundleData?.imageUrl || null
          };
        }

        return item;
      }));

      res.json(enhancedItems);
    } catch (error) {
      console.error("Error fetching order items:", error);
      res.status(500).json({ message: "Failed to fetch order items" });
    }
  });

  // Order Badge endpoints
  app.post('/api/orders/:id/badges/refresh', isAuthenticated, async (req, res) => {
    try {
      await storage.refreshOrderBadges(req.params.id);
      res.json({ success: true, message: 'Badges refreshed' });
    } catch (error) {
      console.error("Error refreshing order badges:", error);
      res.status(500).json({ error: 'Failed to refresh badges' });
    }
  });

  app.post('/api/orders', isAuthenticated, async (req: any, res) => {
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

      // Convert numeric fields to strings for decimal columns
      const dataToValidate = {
        ...finalOrderData,
        orderId,
        orderType,
        billerId: req.user?.id || null,
        taxRate: finalOrderData.taxRate !== undefined ? String(finalOrderData.taxRate) : undefined,
      };

      const data = insertOrderSchema.parse(dataToValidate);

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

      // Create order items with landing cost snapshot
      if (items && items.length > 0) {
        console.log('Creating order items, items received:', JSON.stringify(items));
        console.log('Order ID:', order.id, 'Order Currency:', order.currency);
        for (const item of items) {
          // Map frontend price field to schema fields
          const price = item.price || 0; // Default to 0 if price is undefined
          
          // CRITICAL: Capture landing cost snapshot at time of sale for accurate profit calculation
          // This ensures historical orders maintain their correct profit even when product costs change
          let landingCostSnapshot = null;
          let productBulkUnitQty = item.bulkUnitQty || null;
          let productBulkUnitName = item.bulkUnitName || null;
          // Virtual SKU fields - to be copied from product for allocation tracking
          let isVirtual = false;
          let masterProductId: string | null = null;
          let inventoryDeductionRatio: string | null = null;
          
          if (item.productId) {
            try {
              const product = await storage.getProductById(item.productId);
              if (product) {
                // Priority: latestLandingCost (includes freight/duty) > importCost by currency
                if (product.latestLandingCost) {
                  landingCostSnapshot = parseFloat(product.latestLandingCost);
                } else if (order.currency === 'CZK' && product.importCostCzk) {
                  landingCostSnapshot = parseFloat(product.importCostCzk);
                } else if (order.currency === 'EUR' && product.importCostEur) {
                  landingCostSnapshot = parseFloat(product.importCostEur);
                } else if (product.importCostUsd) {
                  landingCostSnapshot = parseFloat(product.importCostUsd);
                }
                // Copy bulk unit fields from product if not provided
                if (!productBulkUnitQty && product.bulkUnitQty) {
                  productBulkUnitQty = product.bulkUnitQty;
                }
                if (!productBulkUnitName && product.bulkUnitName) {
                  productBulkUnitName = product.bulkUnitName;
                }
                // Copy virtual SKU fields for allocation tracking
                if (product.isVirtual && product.masterProductId) {
                  isVirtual = true;
                  masterProductId = product.masterProductId;
                  inventoryDeductionRatio = product.inventoryDeductionRatio || '1';
                }
              }
            } catch (err) {
              console.error('Failed to fetch product for landing cost snapshot:', err);
            }
          }
          
          // Fetch variant SKU if variantId is provided
          let variantSku: string | null = null;
          if (item.variantId) {
            try {
              const variant = await db.select().from(productVariants).where(eq(productVariants.id, item.variantId)).limit(1);
              if (variant.length > 0 && variant[0].sku) {
                variantSku = variant[0].sku;
              }
            } catch (err) {
              console.error('Failed to fetch variant SKU:', err);
            }
          }

          const orderItem = {
            orderId: order.id,
            productId: item.productId,
            serviceId: item.serviceId,
            bundleId: item.bundleId || null,
            variantId: item.variantId || null,
            variantSku: variantSku,
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
            landingCost: landingCostSnapshot ? String(landingCostSnapshot) : null, // Cost snapshot at sale time
            bulkUnitQty: productBulkUnitQty, // Bulk unit quantity for carton display
            bulkUnitName: productBulkUnitName, // Bulk unit name (e.g., "carton")
            // Virtual SKU fields for allocation tracking
            isVirtual: isVirtual,
            masterProductId: masterProductId,
            inventoryDeductionRatio: inventoryDeductionRatio,
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

      // Calculate and update totalCost from order items' landing costs
      if (items && items.length > 0) {
        const orderItems = await storage.getOrderItems(order.id);
        let totalCost = 0;
        for (const item of orderItems) {
          if (item.landingCost) {
            totalCost += parseFloat(item.landingCost) * (item.quantity || 1);
          }
        }
        if (totalCost > 0) {
          await storage.updateOrder(order.id, { totalCost: totalCost.toFixed(2) });
        }
      }

      // Invalidate allocated quantities cache after order creation
      storage.invalidateAllocatedQuantitiesCache();

      await storage.createUserActivity({
        userId: "test-user",
        action: 'create',
        entityType: 'order',
        entityId: order.id,
        description: `Created order: ${order.orderId}`,
      });

      // Send push notification to warehouse operators for new orders to fulfill
      if (order.orderStatus === 'to_fulfill') {
        const customerName = order.customerName || 'Guest';
        const itemCount = items?.length || 0;
        
        sendPushToAllWarehouseOperators({
          title: '📦 New Order Ready to Pick',
          body: `Order ${order.orderId} from ${customerName} (${itemCount} items)`,
          url: '/pick-pack',
          tag: 'new-order',
          requireInteraction: false
        }, 'new_order').catch(err => {
          console.error('[Push] Failed to send new order notification:', err);
        });
      }

      // Fetch the complete order with items to return
      const completeOrder = await storage.getOrderById(order.id);
      console.log('[POS] Returning order with orderId:', completeOrder?.orderId, 'id:', completeOrder?.id);
      res.json(completeOrder);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.patch('/api/orders/:id', isAuthenticated, async (req: any, res) => {
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

      // Invalidate allocated quantities cache when order status changes (affects allocation)
      if (updates.orderStatus) {
        storage.invalidateAllocatedQuantitiesCache();
      }

      // Update order items if provided
      if (items && Array.isArray(items)) {
        // Delete existing items and add new ones
        await storage.deleteOrderItems(req.params.id);

        // Add new items
        for (const item of items) {
          const orderDetail = await storage.getOrderById(req.params.id);
          
          // Get product fields including bulk units and virtual SKU info
          let itemBulkUnitQty = item.bulkUnitQty || null;
          let itemBulkUnitName = item.bulkUnitName || null;
          let isVirtual = false;
          let masterProductId: string | null = null;
          let inventoryDeductionRatio: string | null = null;
          
          if (item.productId) {
            try {
              const product = await storage.getProductById(item.productId);
              if (product) {
                if (!itemBulkUnitQty && product.bulkUnitQty) {
                  itemBulkUnitQty = product.bulkUnitQty;
                }
                if (!itemBulkUnitName && product.bulkUnitName) {
                  itemBulkUnitName = product.bulkUnitName;
                }
                // Copy virtual SKU fields for allocation tracking
                if (product.isVirtual && product.masterProductId) {
                  isVirtual = true;
                  masterProductId = product.masterProductId;
                  inventoryDeductionRatio = product.inventoryDeductionRatio || '1';
                }
              }
            } catch (err) {
              console.error('Failed to fetch product for item fields:', err);
            }
          }
          
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
            bulkUnitQty: itemBulkUnitQty,
            bulkUnitName: itemBulkUnitName,
            isVirtual: isVirtual,
            masterProductId: masterProductId,
            inventoryDeductionRatio: inventoryDeductionRatio,
          });
        }
        
        // Invalidate allocated quantities cache when order items change
        storage.invalidateAllocatedQuantitiesCache();
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
  app.patch('/api/orders/:orderId/items/:itemId', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/orders/:id/check-modifications', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/orders/batch-undo-ship', isAuthenticated, async (req: any, res) => {
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

      // Invalidate allocation cache since orders are moving back to ready_to_ship (adds to allocations)
      if (results.length > 0) {
        storage.invalidateAllocatedQuantitiesCache();
      }

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
  // NOTE: Inventory is already deducted during picking, NOT during shipping
  app.post('/api/orders/batch-ship', isAuthenticated, async (req: any, res) => {
    try {
      const { orderIds } = req.body;

      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ message: "Order IDs array is required" });
      }

      const shippedAt = new Date();
      const results: any[] = [];
      const errors: any[] = [];

      // Process all orders
      for (const orderId of orderIds) {
        try {
          // Skip mock orders
          if (orderId.startsWith('mock-')) {
            results.push({ id: orderId, success: true, message: 'Mock order shipped' });
            continue;
          }

          // Get current order to check if already shipped (idempotency check)
          const existingOrder = await storage.getOrder(orderId);
          if (!existingOrder) {
            errors.push({ id: orderId, success: false, error: 'Order not found' });
            continue;
          }

          // IDEMPOTENCY: Skip if order is already shipped
          if (existingOrder.orderStatus === 'shipped') {
            results.push({ id: orderId, success: true, message: 'Order already shipped' });
            continue;
          }

          // Update order status to shipped (NO inventory deduction - already done during picking)
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
              userId: req.user?.claims?.sub || "system",
              userName: req.user?.claims?.first_name || 'System',
              notes: `Order ${order.orderId} marked as shipped.`,
            });

            results.push({ id: orderId, success: true, order });
          } else {
            errors.push({ id: orderId, success: false, error: 'Failed to update order' });
          }
        } catch (error: any) {
          console.error(`Error shipping order ${orderId}:`, error);
          errors.push({ id: orderId, success: false, error: error.message || 'Unknown error' });
        }
      }

      // Invalidate allocation cache since shipped orders no longer count as allocated
      if (results.length > 0) {
        storage.invalidateAllocatedQuantitiesCache();
      }

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
  app.patch('/api/orders/:id/status', isAuthenticated, async (req: any, res) => {
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

      // NOTE: Inventory deduction is handled during PICKING, not during shipping
      // This prevents double-deduction when orders go through the pick & pack workflow

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

  // Soft delete (move to trash) - restores inventory to specific locations
  app.delete('/api/orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Get order items to restore inventory
      const orderItems = await storage.getOrderItems(req.params.id);
      
      let totalRestoredLocations = 0;
      let totalRestoredQuantity = 0;
      
      // Only restore inventory if the order was actually picked (inventory was deducted)
      // If pickStatus is 'pending' or empty, no inventory was ever deducted
      const shouldRestoreInventory = order.pickStatus === 'completed' || order.pickStatus === 'in_progress';
      
      if (!shouldRestoreInventory) {
        console.log(`🔄 [Soft Delete] Order ${order.orderId} was never picked, no inventory to restore`);
      }
      
      // Restore inventory for each item (add quantities back to specific locations)
      // Only if inventory was actually picked/deducted
      for (const item of orderItems) {
        if (!shouldRestoreInventory) continue; // Skip inventory restoration if order was never picked
        
        if (item.productId && !item.serviceId) {
          const product = await storage.getProductById(item.productId);
          if (product) {
            // Check if this is a virtual SKU that deducts from master product
            // Use order item fields first (set at order creation), fallback to product fields
            let targetProductId = item.productId;
            let deductionRatio = 1;
            let isVirtualSku = false;
            
            // Check order item fields first (they capture state at order time)
            if (item.isVirtual && item.masterProductId) {
              isVirtualSku = true;
              targetProductId = item.masterProductId;
              deductionRatio = parseFloat(item.inventoryDeductionRatio || '1');
            }
            // Fallback to product fields for legacy orders
            else if (product.isVirtual && product.masterProductId) {
              isVirtualSku = true;
              targetProductId = product.masterProductId;
              deductionRatio = parseFloat(product.inventoryDeductionRatio || '1');
            }
            
            // Get product locations for the target product
            const locations = await storage.getProductLocations(targetProductId);
            
            // Check if we have stored pickedFromLocations data
            const multiLocationPicks = item.pickedFromLocations as Record<string, number> | null;
            
            if (multiLocationPicks && typeof multiLocationPicks === 'object' && Object.keys(multiLocationPicks).length > 0) {
              // Multi-location format: restore to each location separately
              // pickedFromLocations stores actual pieces picked, not cartons
              for (const [locationCode, qty] of Object.entries(multiLocationPicks)) {
                const pickedQty = Number(qty) || 0;
                if (pickedQty <= 0) continue;
                
                const targetLocation = locations.find(loc => 
                  loc.locationCode.toUpperCase() === locationCode.toUpperCase()
                );
                
                if (targetLocation) {
                  const currentQty = targetLocation.quantity || 0;
                  
                  // Only apply multiplier for virtual SKUs (master product deduction ratio)
                  // Do NOT apply bulkUnitQty - pickedFromLocations already stores actual pieces
                  const restoreQty = isVirtualSku ? (pickedQty * deductionRatio) : pickedQty;
                  const newQty = currentQty + restoreQty;
                  
                  await storage.updateProductLocation(targetLocation.id, { quantity: newQty });
                  
                  // Also restore the main product quantity
                  const targetProduct = await storage.getProductById(targetProductId);
                  if (targetProduct) {
                    const currentProductQty = targetProduct.quantity || 0;
                    const newProductQty = currentProductQty + restoreQty;
                    await storage.updateProduct(targetProductId, { quantity: newProductQty });
                    
                    console.log(`🔄 [Soft Delete Multi-Loc] Restored ${pickedQty}${isVirtualSku ? ` × ${deductionRatio} = ${restoreQty}` : ''} to ${locationCode} for ${isVirtualSku ? 'master ' : ''}product ${targetProductId}: ${currentQty} → ${newQty}`);
                  }
                  
                  totalRestoredLocations++;
                  totalRestoredQuantity += restoreQty;
                } else {
                  console.warn(`⚠️ [Soft Delete] Location ${locationCode} not found for product ${targetProductId}`);
                }
              }
              
              // Also restore variant quantity if this item has a variant
              if (item.variantId && !isVirtualSku) {
                try {
                  const variant = await storage.getProductVariant(item.variantId);
                  if (variant) {
                    const currentVariantQty = variant.quantity || 0;
                    const restoreQty = item.pickedQuantity || 0;
                    const newVariantQty = currentVariantQty + restoreQty;
                    await storage.updateProductVariant(item.variantId, { quantity: newVariantQty });
                    console.log(`🔄 [Soft Delete] Restored ${restoreQty}x variant "${variant.name}": ${currentVariantQty} → ${newVariantQty}`);
                  }
                } catch (variantError) {
                  console.error('Error restoring variant quantity during soft delete:', variantError);
                }
              }
            } else {
              // Fallback: restore to primary location or first location
              // CRITICAL: Only restore what was actually picked - do NOT fall back to item.quantity
              // If pickedQuantity is 0, we restore 0 (nothing was ever deducted)
              const pickedCount = item.pickedQuantity || 0;
              
              // Skip if nothing was picked
              if (pickedCount <= 0) {
                continue;
              }
              
              const restoreQty = isVirtualSku ? (pickedCount * deductionRatio) : pickedCount;
              
              const targetLocation = locations.find(loc => loc.isPrimary) || locations[0];
              
              if (targetLocation) {
                const currentQty = targetLocation.quantity || 0;
                const newQty = currentQty + restoreQty;
                await storage.updateProductLocation(targetLocation.id, { quantity: newQty });
                
                console.log(`🔄 [Soft Delete Fallback] Restored ${pickedCount}${isVirtualSku ? ` × ${deductionRatio} = ${restoreQty}` : ''} to ${targetLocation.locationCode} for ${isVirtualSku ? 'master ' : ''}product ${targetProductId}`);
                totalRestoredLocations++;
              }
              
              // Always restore main product quantity
              const targetProduct = await storage.getProductById(targetProductId);
              if (targetProduct) {
                const currentProductQty = targetProduct.quantity || 0;
                await storage.updateProduct(targetProductId, {
                  quantity: currentProductQty + restoreQty
                });
                totalRestoredQuantity += restoreQty;
              }
              
              // Also restore variant quantity if this item has a variant
              if (item.variantId && !isVirtualSku) {
                try {
                  const variant = await storage.getProductVariant(item.variantId);
                  if (variant) {
                    const currentVariantQty = variant.quantity || 0;
                    const variantRestoreQty = item.pickedQuantity || 0;
                    const newVariantQty = currentVariantQty + variantRestoreQty;
                    await storage.updateProductVariant(item.variantId, { quantity: newVariantQty });
                    console.log(`🔄 [Soft Delete] Restored ${variantRestoreQty}x variant "${variant.name}": ${currentVariantQty} → ${newVariantQty}`);
                  }
                } catch (variantError) {
                  console.error('Error restoring variant quantity during soft delete:', variantError);
                }
              }
            }
          }
        } else if (item.bundleId) {
          // Bundle - restore availableStock
          // CRITICAL: Only restore what was actually picked
          const restoreQty = item.pickedQuantity || 0;
          if (restoreQty > 0) {
            const bundle = await storage.getBundleById(item.bundleId);
            if (bundle) {
              const currentStock = bundle.availableStock || 0;
              await storage.updateBundle(item.bundleId, {
                availableStock: currentStock + restoreQty
              });
              console.log(`🔄 [Soft Delete] Restored ${restoreQty} units to bundle "${bundle.name}"`);
              totalRestoredQuantity += restoreQty;
            }
          }
        }
      }
      
      console.log(`🔄 [Soft Delete] Order ${order.orderId} archived: ${totalRestoredLocations} locations, ${totalRestoredQuantity} units restored`);

      // Soft delete - move to trash (isArchived = true)
      // Note: Pick/pack data (pickedFromLocations, pickedQuantity, etc.) is preserved on order items
      const archivedOrder = await storage.archiveOrder(req.params.id);
      if (!archivedOrder) {
        return res.status(500).json({ message: "Failed to archive order" });
      }

      // Invalidate allocated quantities cache after archiving order
      storage.invalidateAllocatedQuantitiesCache();

      await storage.createUserActivity({
        userId: "test-user",
        action: 'archive',
        entityType: 'order',
        entityId: req.params.id,
        description: `Moved order to trash: ${order.orderId}`,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error archiving order:", error);
      res.status(500).json({ message: "Failed to move order to trash" });
    }
  });

  // Restore order from trash - re-deducts inventory from specific locations
  app.post('/api/orders/:id/restore', isAuthenticated, async (req: any, res) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Get order items to re-deduct inventory
      const orderItems = await storage.getOrderItems(req.params.id);
      
      let totalDeductedLocations = 0;
      let totalDeductedQuantity = 0;
      
      // Re-deduct inventory for each item (subtract quantities from specific locations)
      for (const item of orderItems) {
        if (item.productId && !item.serviceId) {
          const product = await storage.getProductById(item.productId);
          if (product) {
            // Check if this is a virtual SKU that deducts from master product
            let targetProductId = item.productId;
            let deductionRatio = 1;
            let isVirtualSku = false;
            
            if (product.isVirtual && product.masterProductId) {
              isVirtualSku = true;
              targetProductId = product.masterProductId;
              deductionRatio = parseFloat(product.inventoryDeductionRatio || '1');
            }
            
            // Get product locations for the target product
            const locations = await storage.getProductLocations(targetProductId);
            
            // Check if we have stored pickedFromLocations data
            const multiLocationPicks = item.pickedFromLocations as Record<string, number> | null;
            
            if (multiLocationPicks && typeof multiLocationPicks === 'object' && Object.keys(multiLocationPicks).length > 0) {
              // Multi-location format: deduct from each location separately
              // pickedFromLocations stores actual pieces picked, not cartons
              for (const [locationCode, qty] of Object.entries(multiLocationPicks)) {
                const pickedQty = Number(qty) || 0;
                if (pickedQty <= 0) continue;
                
                const targetLocation = locations.find(loc => 
                  loc.locationCode.toUpperCase() === locationCode.toUpperCase()
                );
                
                if (targetLocation) {
                  const currentQty = targetLocation.quantity || 0;
                  
                  // Only apply multiplier for virtual SKUs (master product deduction ratio)
                  // Do NOT apply bulkUnitQty - pickedFromLocations already stores actual pieces
                  const deductQty = isVirtualSku ? (pickedQty * deductionRatio) : pickedQty;
                  const newQty = Math.max(0, currentQty - deductQty);
                  
                  await storage.updateProductLocation(targetLocation.id, { quantity: newQty });
                  
                  // Also deduct from main product quantity
                  const targetProduct = await storage.getProductById(targetProductId);
                  if (targetProduct) {
                    const currentProductQty = targetProduct.quantity || 0;
                    const newProductQty = Math.max(0, currentProductQty - deductQty);
                    await storage.updateProduct(targetProductId, { quantity: newProductQty });
                    
                    console.log(`🔄 [Restore Multi-Loc] Deducted ${pickedQty}${isVirtualSku ? ` × ${deductionRatio} = ${deductQty}` : ''} from ${locationCode} for ${isVirtualSku ? 'master ' : ''}product ${targetProductId}: ${currentQty} → ${newQty}`);
                  }
                  
                  totalDeductedLocations++;
                  totalDeductedQuantity += deductQty;
                } else {
                  console.warn(`⚠️ [Restore] Location ${locationCode} not found for product ${targetProductId}`);
                }
              }
              
              // Also deduct from variant quantity if this item has a variant
              if (item.variantId && !isVirtualSku) {
                try {
                  const variant = await storage.getProductVariant(item.variantId);
                  if (variant) {
                    const currentVariantQty = variant.quantity || 0;
                    const deductQty = item.pickedQuantity || 0;
                    const newVariantQty = Math.max(0, currentVariantQty - deductQty);
                    await storage.updateProductVariant(item.variantId, { quantity: newVariantQty });
                    console.log(`🔄 [Restore Variant Multi-Loc]: Deducted ${deductQty}x variant "${variant.name}", qty: ${currentVariantQty} → ${newVariantQty}`);
                  }
                } catch (variantError) {
                  console.error('Error deducting variant quantity during restore:', variantError);
                }
              }
            } else {
              // Fallback: deduct from primary location or first location
              // CRITICAL: Only deduct what was actually picked - do NOT fall back to item.quantity
              const pickedCount = item.pickedQuantity || 0;
              
              // Skip if nothing was picked
              if (pickedCount <= 0) {
                console.log(`🔄 [Restore Fallback] Item ${item.id?.slice(-6)} has pickedQuantity=0, skipping deduction`);
                continue;
              }
              
              const deductQty = isVirtualSku ? (pickedCount * deductionRatio) : pickedCount;
              
              const targetLocation = locations.find(loc => loc.isPrimary) || locations[0];
              
              if (targetLocation) {
                const currentQty = targetLocation.quantity || 0;
                const newQty = Math.max(0, currentQty - deductQty);
                await storage.updateProductLocation(targetLocation.id, { quantity: newQty });
                
                console.log(`🔄 [Restore Fallback] Deducted ${pickedCount}${isVirtualSku ? ` × ${deductionRatio} = ${deductQty}` : ''} from ${targetLocation.locationCode} for ${isVirtualSku ? 'master ' : ''}product ${targetProductId}`);
                totalDeductedLocations++;
              }
              
              // Always deduct from main product quantity
              const targetProduct = await storage.getProductById(targetProductId);
              if (targetProduct) {
                const currentProductQty = targetProduct.quantity || 0;
                await storage.updateProduct(targetProductId, {
                  quantity: Math.max(0, currentProductQty - deductQty)
                });
                totalDeductedQuantity += deductQty;
              }
              
              // Also deduct from variant quantity if this item has a variant
              if (item.variantId && !isVirtualSku) {
                try {
                  const variant = await storage.getProductVariant(item.variantId);
                  if (variant) {
                    const currentVariantQty = variant.quantity || 0;
                    const variantDeductQty = item.pickedQuantity || 0;
                    const newVariantQty = Math.max(0, currentVariantQty - variantDeductQty);
                    await storage.updateProductVariant(item.variantId, { quantity: newVariantQty });
                    console.log(`🔄 [Restore Variant Single-Loc]: Deducted ${variantDeductQty}x variant "${variant.name}", qty: ${currentVariantQty} → ${newVariantQty}`);
                  }
                } catch (variantError) {
                  console.error('Error deducting variant quantity during restore:', variantError);
                }
              }
            }
          }
        } else if (item.bundleId) {
          // Bundle - deduct availableStock
          // CRITICAL: Only deduct what was actually picked
          const deductQty = item.pickedQuantity || 0;
          if (deductQty > 0) {
            const bundle = await storage.getBundleById(item.bundleId);
            if (bundle) {
              const currentStock = bundle.availableStock || 0;
              await storage.updateBundle(item.bundleId, {
                availableStock: Math.max(0, currentStock - deductQty)
              });
              console.log(`🔄 [Restore] Deducted ${deductQty} units from bundle "${bundle.name}"`);
              totalDeductedQuantity += deductQty;
            }
          }
        }
      }
      
      console.log(`🔄 [Restore] Order ${order.orderId} restored: ${totalDeductedLocations} locations, ${totalDeductedQuantity} units deducted`);

      const restoredOrder = await storage.restoreOrder(req.params.id);
      if (!restoredOrder) {
        return res.status(500).json({ message: "Failed to restore order" });
      }

      // Invalidate allocated quantities cache after restoring order
      storage.invalidateAllocatedQuantitiesCache();

      await storage.createUserActivity({
        userId: "test-user",
        action: 'restore',
        entityType: 'order',
        entityId: req.params.id,
        description: `Restored order from trash: ${order.orderId}`,
      });

      res.json(restoredOrder);
    } catch (error) {
      console.error("Error restoring order:", error);
      res.status(500).json({ message: "Failed to restore order" });
    }
  });

  // Permanent delete (inventory was already restored during soft delete)
  app.delete('/api/orders/:id/permanent', isAuthenticated, async (req: any, res) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Note: Inventory is already restored when order is soft-deleted (moved to trash)
      // No need to restore again here - just permanently remove the order record

      await storage.deleteOrder(req.params.id);

      await storage.createUserActivity({
        userId: "test-user",
        action: 'delete',
        entityType: 'order',
        entityId: req.params.id,
        description: `Permanently deleted order: ${order.orderId}`,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error permanently deleting order:", error);
      res.status(500).json({ message: "Failed to permanently delete order" });
    }
  });

  // Generate SKU endpoint
  app.post('/api/generate-sku', isAuthenticated, async (req, res) => {
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
  app.get('/api/pre-orders', isAuthenticated, async (req, res) => {
    try {
      const preOrders = await storage.getPreOrders();
      res.json(preOrders);
    } catch (error) {
      console.error("Error fetching pre-orders:", error);
      res.status(500).json({ message: "Failed to fetch pre-orders" });
    }
  });

  // Expenses endpoints
  app.get('/api/expenses', requireRole(['administrator']), async (req, res) => {
    try {
      const expenses = await storage.getExpenses();
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.get('/api/expenses/:id', requireRole(['administrator']), async (req, res) => {
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

  app.post('/api/expenses', requireRole(['administrator']), async (req: any, res) => {
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

  app.patch('/api/expenses/:id', requireRole(['administrator']), async (req: any, res) => {
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

  app.delete('/api/expenses/:id', requireRole(['administrator']), async (req: any, res) => {
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

  // Expense Import endpoint
  const expenseImportUpload = multer({ storage: multer.memoryStorage() });
  app.post('/api/expenses/import', requireRole(['administrator']), expenseImportUpload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const XLSX = await import('xlsx');
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (!data || data.length === 0) {
        return res.status(400).json({ message: "No data found in Excel file" });
      }

      const importedExpenses: any[] = [];
      const errors: string[] = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          const expenseId = row['Expense ID'] || `EXP-${Date.now()}-${i}`;
          const name = row['Name'] || row['Description'] || 'Imported Expense';
          const description = row['Description'] || '';
          const vendor = row['Vendor'] || '';
          const amount = parseFloat(row['Amount']) || 0;
          const currency = row['Currency'] || 'USD';
          const category = row['Category'] || 'General';
          const date = row['Date'] ? new Date(row['Date']) : new Date();
          const dueDate = row['Due Date'] ? new Date(row['Due Date']) : null;
          const status = row['Status'] || 'pending';
          const paymentMethod = row['Payment Method'] || '';
          const isRecurring = row['Is Recurring']?.toLowerCase() === 'yes';
          const recurringFrequency = row['Recurring Frequency'] || null;
          const recurringInterval = row['Recurring Interval'] ? parseInt(row['Recurring Interval']) : null;
          const recurringDay = row['Recurring Day'] ? parseInt(row['Recurring Day']) : null;
          const notes = row['Notes'] || '';
          const tags = row['Tags'] || '';
          const referenceNumber = row['Reference Number'] || '';

          const expenseData = {
            expenseId,
            name,
            description,
            vendor,
            amount: amount.toString(),
            totalCost: amount.toString(),
            currency,
            category,
            date,
            dueDate,
            status,
            paymentMethod,
            isRecurring,
            recurringFrequency,
            recurringInterval,
            recurringDay,
            notes,
            tags,
            referenceNumber,
          };

          const expense = await storage.createExpense(expenseData as any);
          importedExpenses.push(expense);

          await storage.createUserActivity({
            userId: "test-user",
            action: 'create',
            entityType: 'expense',
            entityId: expense.id,
            description: `Imported expense: ${name}`,
          });
        } catch (rowError: any) {
          errors.push(`Row ${i + 2}: ${rowError.message || 'Unknown error'}`);
        }
      }

      res.json({
        success: true,
        imported: importedExpenses.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully imported ${importedExpenses.length} expense(s)${errors.length > 0 ? `, ${errors.length} error(s)` : ''}`
      });
    } catch (error: any) {
      console.error("Error importing expenses:", error);
      res.status(500).json({ message: error.message || "Failed to import expenses" });
    }
  });

  // Ticket endpoints
  app.get('/api/tickets', isAuthenticated, async (req, res) => {
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

  app.get('/api/tickets/:id', isAuthenticated, async (req, res) => {
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

  app.post('/api/tickets', isAuthenticated, async (req: any, res) => {
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
      // Keep title and description as empty strings if not provided (title is required)
      const cleanBody = {
        ...restBody,
        customerId: restBody.customerId?.trim() || null,
        orderId: restBody.orderId?.trim() || null,
        title: restBody.title?.trim() || 'Untitled Ticket',
        description: restBody.description?.trim() || '',
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

  app.post('/api/tickets/generate-subject', isAuthenticated, async (req: any, res) => {
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

  app.patch('/api/tickets/:id', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/tickets/:id', isAuthenticated, async (req: any, res) => {
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

  // Ticket Import endpoint
  const ticketImportUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = /xlsx|xls/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      if (extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
      }
    }
  });

  app.post('/api/tickets/import', isAuthenticated, ticketImportUpload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const XLSX = await import('xlsx');
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (!data || data.length === 0) {
        return res.status(400).json({ message: "No data found in Excel file" });
      }

      const importedTickets: any[] = [];
      const errors: string[] = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          // Map Excel columns to ticket fields
          const ticketId = row['Ticket ID'] || `TKT-${Date.now()}-${i}`;
          const title = row['Subject'] || row['Title'] || 'Imported Ticket';
          const description = row['Description'] || '';
          const status = row['Status'] || 'open';
          const priority = row['Priority'] || 'medium';
          const category = row['Category'] || null;
          const customerName = row['Customer Name'];
          const customerEmail = row['Customer Email'];
          const customerPhone = row['Customer Phone'];
          const assignedTo = row['Assigned To'] || null;
          const orderId = row['Related Order'] || null;
          const dueDate = row['Due Date'] ? new Date(row['Due Date']) : null;
          const notes = row['Notes'] || null;

          // Find or create customer if name provided
          let customerId = null;
          if (customerName) {
            const customers = await storage.getCustomers();
            const existingCustomer = customers.find((c: any) => 
              c.name?.toLowerCase() === customerName.toLowerCase() ||
              (customerEmail && c.email?.toLowerCase() === customerEmail?.toLowerCase())
            );
            
            if (existingCustomer) {
              customerId = existingCustomer.id;
            } else {
              // Create new customer
              const newCustomer = await storage.createCustomer({
                name: customerName,
                email: customerEmail || null,
                phone: customerPhone || null,
                type: 'regular',
                isActive: true,
              });
              customerId = newCustomer.id;
            }
          }

          // Create ticket
          const ticketData = {
            ticketId,
            title,
            description,
            status,
            priority,
            category,
            customerId,
            assignedTo,
            orderId,
            dueDate,
            notes,
          };

          const newTicket = await storage.createTicket(ticketData);
          importedTickets.push(newTicket);
        } catch (rowError: any) {
          errors.push(`Row ${i + 2}: ${rowError.message}`);
        }
      }

      await storage.createUserActivity({
        userId: req.user?.id || "test-user",
        action: 'import',
        entityType: 'ticket',
        entityId: 'bulk',
        description: `Imported ${importedTickets.length} tickets from Excel`,
      });

      res.json({
        success: true,
        imported: importedTickets.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully imported ${importedTickets.length} ticket(s)${errors.length > 0 ? `. ${errors.length} row(s) had errors.` : ''}`
      });
    } catch (error: any) {
      console.error("Error importing tickets:", error);
      res.status(500).json({ message: error.message || "Failed to import tickets" });
    }
  });

  app.get('/api/tickets/:id/comments', isAuthenticated, async (req, res) => {
    try {
      const comments = await storage.getTicketComments(req.params.id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching ticket comments:", error);
      res.status(500).json({ message: "Failed to fetch ticket comments" });
    }
  });

  app.post('/api/tickets/:id/comments', isAuthenticated, async (req: any, res) => {
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

  // Middleware to re-validate user identity from database
  const validateUserFromDatabase = async (req: any, res: any, next: any) => {
    try {
      const sessionUserId = req.user?.id;
      
      if (!sessionUserId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Re-fetch user from database to ensure session is valid
      const userFromDb = await db
        .select()
        .from(users)
        .where(eq(users.id, sessionUserId))
        .limit(1);
      
      if (!userFromDb || userFromDb.length === 0) {
        console.warn(`[Security] Session with invalid user ID: ${sessionUserId}`);
        return res.status(401).json({ message: 'Invalid session' });
      }
      
      // Store verified user in request object
      req.verifiedUser = {
        id: userFromDb[0].id,
        role: userFromDb[0].role,
        email: userFromDb[0].email,
        firstName: userFromDb[0].firstName,
        lastName: userFromDb[0].lastName,
      };
      
      next();
    } catch (error) {
      console.error('[Security] Error validating user from database:', error);
      return res.status(500).json({ message: 'Authentication validation failed' });
    }
  };

  // Notifications endpoints
  app.get('/api/notifications', validateUserFromDatabase, async (req: any, res) => {
    try {
      const userId = req.verifiedUser.id;
      const userRole = req.verifiedUser.role;
      const status = req.query.status as string | undefined;
      const majorOnly = req.query.majorOnly === 'true';
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const isAdmin = userRole === 'administrator';
      
      // SECURITY: Only admins can use majorOnly parameter
      if (majorOnly && !isAdmin) {
        console.warn(`Security: Non-admin user ${userId} attempted to access majorOnly notifications`);
        return res.status(403).json({ message: 'Only administrators can view major notifications' });
      }
      
      const majorNotificationTypes = ['order_created', 'order_shipped', 'inventory_alert', 'receipt_approved', 'shipment_arrived'];

      let result;

      if (isAdmin) {
        // Admin view: return notifications from ALL users with user information
        const conditions = [];
        
        if (status === 'unread') {
          conditions.push(eq(notifications.isRead, false));
        }
        
        if (majorOnly) {
          conditions.push(inArray(notifications.type, majorNotificationTypes));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        result = await db
          .select({
            id: notifications.id,
            userId: notifications.userId,
            title: notifications.title,
            description: notifications.description,
            type: notifications.type,
            isRead: notifications.isRead,
            actionUrl: notifications.actionUrl,
            actionLabel: notifications.actionLabel,
            metadata: notifications.metadata,
            createdAt: notifications.createdAt,
            userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('userName'),
          })
          .from(notifications)
          .leftJoin(users, eq(notifications.userId, users.id))
          .where(whereClause)
          .orderBy(desc(notifications.createdAt))
          .limit(limit)
          .offset(offset);
      } else {
        // Non-admin view: return only user's own notifications
        const conditions = [eq(notifications.userId, userId)];
        
        if (status === 'unread') {
          conditions.push(eq(notifications.isRead, false));
        }
        
        if (majorOnly) {
          conditions.push(inArray(notifications.type, majorNotificationTypes));
        }

        result = await db
          .select()
          .from(notifications)
          .where(and(...conditions))
          .orderBy(desc(notifications.createdAt))
          .limit(limit)
          .offset(offset);
      }

      res.json(result);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get('/api/notifications/unread-count', validateUserFromDatabase, async (req: any, res) => {
    try {
      const userId = req.verifiedUser.id;

      // Always count only the current user's unread notifications
      // This ensures the badge shows personal unread count, even for admins
      // (mark-all-read only marks the user's own notifications, so this must match)
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

  app.post('/api/notifications', validateUserFromDatabase, async (req: any, res) => {
    try {
      const userId = req.verifiedUser.id;
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

  app.patch('/api/notifications/:id/read', validateUserFromDatabase, async (req: any, res) => {
    try {
      const userId = req.verifiedUser.id;
      const userRole = req.verifiedUser.role;
      const notificationId = req.params.id;
      const isAdmin = userRole === 'administrator';

      // SECURITY: Enforce ownership at database level using WHERE clause
      // For admins: update any notification by ID only
      // For non-admins: update ONLY if ID matches AND userId matches
      const result = await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          isAdmin
            ? eq(notifications.id, notificationId)
            : and(
                eq(notifications.id, notificationId),
                eq(notifications.userId, userId)
              )
        )
        .returning();

      // If no rows updated, notification doesn't exist OR user doesn't own it
      if (!result || result.length === 0) {
        console.warn(`[Security] User ${userId} attempted to mark non-existent or unauthorized notification ${notificationId} as read`);
        return res.status(403).json({ message: 'Notification not found or you do not have permission to modify it' });
      }

      res.json(result[0]);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post('/api/notifications/mark-all-read', validateUserFromDatabase, async (req: any, res) => {
    try {
      const userId = req.verifiedUser.id;

      // SECURITY: Mark all unread notifications as read for THIS USER ONLY
      // This endpoint is scoped to the current user and does NOT allow
      // non-admins to mark other users' notifications as read
      const result = await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ))
        .returning();

      res.json({ 
        success: true, 
        markedCount: result.length,
        message: `Marked ${result.length} notification(s) as read`
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // ============================================================================
  // PUSH NOTIFICATIONS ENDPOINTS
  // ============================================================================

  // GET VAPID public key for push subscription
  app.get('/api/push/vapid-public-key', isAuthenticated, async (req: any, res) => {
    const vapidPublicKey = getVapidPublicKey();
    if (!vapidPublicKey) {
      return res.status(503).json({ message: 'Push notifications not configured' });
    }
    res.json({ publicKey: vapidPublicKey });
  });

  // Subscribe to push notifications
  app.post('/api/push/subscribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { endpoint, keys, userAgent, notificationTypes } = req.body;

      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ message: 'Invalid subscription data' });
      }

      // Check if subscription already exists
      const existing = await db
        .select()
        .from(pushSubscriptions)
        .where(and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint)
        ))
        .limit(1);

      if (existing.length > 0) {
        // Update existing subscription
        const [updated] = await db
          .update(pushSubscriptions)
          .set({
            p256dh: keys.p256dh,
            auth: keys.auth,
            userAgent: userAgent || existing[0].userAgent,
            notificationTypes: notificationTypes || existing[0].notificationTypes,
            isActive: true,
            lastUsedAt: new Date()
          })
          .where(eq(pushSubscriptions.id, existing[0].id))
          .returning();
        
        return res.json({ success: true, subscription: updated, message: 'Subscription updated' });
      }

      // Create new subscription
      const [newSub] = await db
        .insert(pushSubscriptions)
        .values({
          userId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent: userAgent || null,
          notificationTypes: notificationTypes || ['new_order'],
          isActive: true
        })
        .returning();

      console.log(`[Push] New subscription created for user ${userId}`);
      res.status(201).json({ success: true, subscription: newSub, message: 'Subscription created' });
    } catch (error) {
      console.error('Error creating push subscription:', error);
      res.status(500).json({ message: 'Failed to create push subscription' });
    }
  });

  // Unsubscribe from push notifications
  app.post('/api/push/unsubscribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { endpoint } = req.body;

      if (!endpoint) {
        return res.status(400).json({ message: 'Endpoint required' });
      }

      const result = await db
        .delete(pushSubscriptions)
        .where(and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint)
        ))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ message: 'Subscription not found' });
      }

      console.log(`[Push] Subscription removed for user ${userId}`);
      res.json({ success: true, message: 'Subscription removed' });
    } catch (error) {
      console.error('Error removing push subscription:', error);
      res.status(500).json({ message: 'Failed to remove push subscription' });
    }
  });

  // Get user's push subscriptions
  app.get('/api/push/subscriptions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const subs = await db
        .select({
          id: pushSubscriptions.id,
          userAgent: pushSubscriptions.userAgent,
          notificationTypes: pushSubscriptions.notificationTypes,
          isActive: pushSubscriptions.isActive,
          createdAt: pushSubscriptions.createdAt,
          lastUsedAt: pushSubscriptions.lastUsedAt
        })
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, userId))
        .orderBy(desc(pushSubscriptions.createdAt));

      res.json(subs);
    } catch (error) {
      console.error('Error fetching push subscriptions:', error);
      res.status(500).json({ message: 'Failed to fetch push subscriptions' });
    }
  });

  // Update notification types for a subscription
  app.patch('/api/push/subscriptions/:id/notification-types', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const subId = req.params.id;
      const { notificationTypes } = req.body;

      if (!Array.isArray(notificationTypes)) {
        return res.status(400).json({ message: 'notificationTypes must be an array' });
      }

      const [updated] = await db
        .update(pushSubscriptions)
        .set({ notificationTypes })
        .where(and(
          eq(pushSubscriptions.id, subId),
          eq(pushSubscriptions.userId, userId)
        ))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: 'Subscription not found' });
      }

      res.json({ success: true, subscription: updated });
    } catch (error) {
      console.error('Error updating notification types:', error);
      res.status(500).json({ message: 'Failed to update notification types' });
    }
  });

  // ============================================================================
  // WAREHOUSE DASHBOARD & TASKS ENDPOINTS
  // ============================================================================

  // GET /api/dashboard/warehouse - Aggregated dashboard data for warehouse employees
  app.get('/api/dashboard/warehouse', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      // 1. Orders to pick/pack - Use same filtering as storage.getPickPackOrders()
      // Match the logic from Pick & Pack page: orderStatus = 'to_fulfill' OR orderStatus = 'ready_to_ship'
      // This ensures fulfillmentStage-driven orders are included regardless of pickStatus/packStatus
      const ordersToPickPackRaw = await db
        .select({
          id: orders.id,
          orderId: orders.orderId,
          orderStatus: orders.orderStatus,
          pickStatus: orders.pickStatus,
          packStatus: orders.packStatus,
          fulfillmentStage: orders.fulfillmentStage,
          customerId: orders.customerId,
          createdAt: orders.createdAt,
          grandTotal: orders.grandTotal,
          currency: orders.currency
        })
        .from(orders)
        .where(
          and(
            or(
              eq(orders.orderStatus, 'to_fulfill'),
              eq(orders.orderStatus, 'ready_to_ship')
            ),
            // Exclude archived orders
            or(
              eq(orders.isArchived, false),
              isNull(orders.isArchived)
            )
          )
        )
        .orderBy(desc(orders.createdAt));
      
      // Helper function to determine effective status (same logic as storage.getPickPackStatus)
      const getEffectiveStatus = (o: any): string => {
        // If fulfillmentStage is set (new architecture), use it
        if (o.fulfillmentStage) {
          if (o.fulfillmentStage === 'picking') return 'picking';
          if (o.fulfillmentStage === 'packing') return 'packing';
          if (o.fulfillmentStage === 'ready') return 'ready_to_ship';
        }
        // Backward compatibility: fall back to old pick/pack status logic
        if (o.packStatus === 'completed' && o.pickStatus === 'completed') {
          return 'ready_to_ship';
        }
        if (o.packStatus === 'in_progress' || o.orderStatus === 'packing') {
          return 'packing';
        }
        if (o.pickStatus === 'in_progress' || o.orderStatus === 'picking') {
          return 'picking';
        }
        return 'to_fulfill';
      };

      // Categorize orders by effective status (matching Pick & Pack page logic)
      const pendingOrders = ordersToPickPackRaw.filter(o => 
        getEffectiveStatus(o) === 'to_fulfill'
      );
      const pickingOrders = ordersToPickPackRaw.filter(o => 
        getEffectiveStatus(o) === 'picking'
      );
      const packingOrders = ordersToPickPackRaw.filter(o => 
        getEffectiveStatus(o) === 'packing'
      );
      const readyOrders = ordersToPickPackRaw.filter(o => 
        getEffectiveStatus(o) === 'ready_to_ship'
      );

      // Get order IDs for item count query (only pending + picking = "to pick")
      const toPickOrderIds = [...pendingOrders, ...pickingOrders].map(o => o.id);
      
      // Query item counts for orders that need picking
      let toPickItemCount = 0;
      if (toPickOrderIds.length > 0) {
        const itemCounts = await db
          .select({ totalQty: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)` })
          .from(orderItems)
          .where(inArray(orderItems.orderId, toPickOrderIds));
        toPickItemCount = Number(itemCounts[0]?.totalQty || 0);
      }

      // Calculate stats matching Pick & Pack page logic
      const pickPackStats = {
        pending: pendingOrders.length,
        picking: pickingOrders.length,
        packing: packingOrders.length,
        ready: readyOrders.length,
        toPickItems: toPickItemCount
      };
      
      // Get customer names for orders
      const customerIds = [...new Set(ordersToPickPackRaw.map(o => o.customerId).filter(Boolean))];
      const customersList = customerIds.length > 0 
        ? await db.select({ id: customers.id, name: customers.name }).from(customers).where(inArray(customers.id, customerIds as number[]))
        : [];
      const customerMap = new Map(customersList.map(c => [c.id, c]));
      
      const ordersToPickPack = ordersToPickPackRaw.map(order => ({
        ...order,
        status: order.orderStatus, // Add status alias for frontend compatibility
        customer: order.customerId ? customerMap.get(order.customerId) : null
      }));

      // 2. Receiving tasks - shipments that are in receiving status
      const receivingTasks = await db
        .select()
        .from(shipments)
        .where(
          or(
            eq(shipments.receivingStatus, 'receiving'),
            eq(shipments.receivingStatus, 'pending_approval')
          )
        )
        .orderBy(desc(shipments.createdAt));

      // 3. Incoming shipments - same logic as "To Receive" tab in ReceivingList
      // Only show shipments pending receiving (not already being received or completed)
      const incomingShipmentsRaw = await db
        .select({
          shipment: shipments,
          consolidation: consolidations
        })
        .from(shipments)
        .leftJoin(consolidations, eq(shipments.consolidationId, consolidations.id))
        .where(and(
          or(
            // Standard receivable: delivered or near-ETA in transit
            eq(shipments.status, 'delivered'),
            and(
              eq(shipments.status, 'in transit'),
              sql`${shipments.estimatedDelivery} <= NOW() + INTERVAL '2 days'`
            ),
            // Direct PO shipments in transit (no consolidation)
            and(
              eq(shipments.status, 'in transit'),
              isNull(shipments.consolidationId)
            )
          ),
          // Not yet started receiving (pending status only)
          eq(shipments.receivingStatus, 'pending'),
          // Not archived
          isNull(shipments.archivedAt)
        ))
        .orderBy(shipments.estimatedDelivery)
        .limit(10);
      
      // Format for frontend compatibility
      const incomingShipments = incomingShipmentsRaw.map(({ shipment, consolidation }) => ({
        id: shipment.id,
        supplier: shipment.shipmentName || consolidation?.consolidationName || `Shipment #${shipment.id}`,
        trackingNumber: shipment.trackingNumber,
        estimatedArrival: shipment.estimatedDelivery,
        status: shipment.status
      }));

      // 4. Admin tasks - warehouse tasks assigned to current user or unassigned with status 'pending' or 'in_progress'
      let adminTasks;
      if (userRole === 'administrator') {
        // Admins see all pending/in_progress tasks
        adminTasks = await db
          .select()
          .from(warehouseTasks)
          .where(
            or(
              eq(warehouseTasks.status, 'pending'),
              eq(warehouseTasks.status, 'in_progress')
            )
          )
          .orderBy(desc(warehouseTasks.createdAt));
      } else {
        // Operators see tasks assigned to them or unassigned
        adminTasks = await db
          .select()
          .from(warehouseTasks)
          .where(
            and(
              or(
                eq(warehouseTasks.status, 'pending'),
                eq(warehouseTasks.status, 'in_progress')
              ),
              or(
                eq(warehouseTasks.assignedToUserId, userId),
                isNull(warehouseTasks.assignedToUserId)
              )
            )
          )
          .orderBy(desc(warehouseTasks.createdAt));
      }

      // Filter financial data for non-admins
      const filteredOrders = filterFinancialData(ordersToPickPack, userRole);

      res.json({
        ordersToPickPack: filteredOrders,
        pickPackStats,
        receivingTasks,
        incomingShipments,
        adminTasks
      });
    } catch (error) {
      console.error("Error fetching warehouse dashboard:", error);
      res.status(500).json({ message: "Failed to fetch warehouse dashboard" });
    }
  });

  // GET /api/warehouse-tasks - List all tasks (admin sees all, operator sees assigned)
  app.get('/api/warehouse-tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const { status, assignedToUserId } = req.query;

      // Build filters
      const filters: { status?: string; assignedToUserId?: string } = {};
      if (status) filters.status = status as string;
      if (assignedToUserId) filters.assignedToUserId = assignedToUserId as string;

      let tasks;
      if (userRole === 'administrator') {
        // Admins see all tasks (with optional filters)
        tasks = await storage.getWarehouseTasks(filters);
      } else {
        // Operators see only tasks assigned to them or unassigned
        const allTasks = await storage.getWarehouseTasks(filters);
        tasks = allTasks.filter(task => 
          task.assignedToUserId === userId || task.assignedToUserId === null
        );
      }

      res.json(tasks);
    } catch (error) {
      console.error("Error fetching warehouse tasks:", error);
      res.status(500).json({ message: "Failed to fetch warehouse tasks" });
    }
  });

  // POST /api/warehouse-tasks - Create task (admin only)
  app.post('/api/warehouse-tasks', requireRole(['administrator']), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      
      // Validate with insertWarehouseTaskSchema
      const data = insertWarehouseTaskSchema.parse({
        ...req.body,
        createdByUserId: userId
      });

      const task = await storage.createWarehouseTask(data);
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating warehouse task:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create warehouse task" });
    }
  });

  // PATCH /api/warehouse-tasks/:id - Update task
  app.patch('/api/warehouse-tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const taskId = req.params.id;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      // Get existing task
      const existingTask = await storage.getWarehouseTaskById(taskId);
      if (!existingTask) {
        return res.status(404).json({ message: "Warehouse task not found" });
      }

      // Check permissions
      const isAdmin = userRole === 'administrator';
      const isAssigned = existingTask.assignedToUserId === userId;

      if (!isAdmin && !isAssigned) {
        return res.status(403).json({ message: "You do not have permission to update this task" });
      }

      // Operators can only update status, admins can update everything
      let updates: any;
      if (isAdmin) {
        updates = insertWarehouseTaskSchema.partial().parse(req.body);
      } else {
        // Operators can only update status and notes
        const { status, notes } = req.body;
        const limitedUpdates: any = {};
        if (status) limitedUpdates.status = status;
        if (notes !== undefined) limitedUpdates.notes = notes;
        
        // Validate the limited updates
        updates = insertWarehouseTaskSchema.partial().parse(limitedUpdates);
      }

      // If status is being changed to 'completed', set completedAt and completedByUserId
      if (updates.status === 'completed') {
        (updates as any).completedAt = new Date();
        (updates as any).completedByUserId = userId;
      }

      const updatedTask = await storage.updateWarehouseTask(taskId, updates);
      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating warehouse task:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update warehouse task" });
    }
  });

  // DELETE /api/warehouse-tasks/:id - Delete task (admin only)
  app.delete('/api/warehouse-tasks/:id', requireRole(['administrator']), async (req: any, res) => {
    try {
      const taskId = req.params.id;

      // Check if task exists
      const existingTask = await storage.getWarehouseTaskById(taskId);
      if (!existingTask) {
        return res.status(404).json({ message: "Warehouse task not found" });
      }

      await storage.deleteWarehouseTask(taskId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting warehouse task:", error);
      res.status(500).json({ message: "Failed to delete warehouse task" });
    }
  });

  // ============================================================================
  // WAREHOUSE LABELS - Track printed labels for bulk printing
  // ============================================================================

  // GET /api/warehouse-labels - List all saved labels sorted by most recently used
  app.get('/api/warehouse-labels', isAuthenticated, async (req: any, res) => {
    try {
      const labels = await storage.getWarehouseLabels();
      res.json(labels);
    } catch (error) {
      console.error("Error fetching warehouse labels:", error);
      res.status(500).json({ message: "Failed to fetch warehouse labels" });
    }
  });

  // GET /api/warehouse-labels/:id - Get a specific label
  app.get('/api/warehouse-labels/:id', isAuthenticated, async (req: any, res) => {
    try {
      const label = await storage.getWarehouseLabel(req.params.id);
      if (!label) {
        return res.status(404).json({ message: "Warehouse label not found" });
      }
      res.json(label);
    } catch (error) {
      console.error("Error fetching warehouse label:", error);
      res.status(500).json({ message: "Failed to fetch warehouse label" });
    }
  });

  // POST /api/warehouse-labels - Create or update a label (upsert by productId)
  app.post('/api/warehouse-labels', isAuthenticated, async (req: any, res) => {
    try {
      const data = insertWarehouseLabelSchema.parse(req.body);
      
      // Check if a label already exists for this product
      const existingLabel = await storage.getWarehouseLabelByProductId(data.productId);
      
      if (existingLabel) {
        // Update existing label and increment print count
        const updated = await storage.incrementWarehouseLabelPrintCount(existingLabel.id);
        return res.json(updated);
      }
      
      // Create new label
      const label = await storage.createWarehouseLabel(data);
      res.status(201).json(label);
    } catch (error) {
      console.error("Error creating warehouse label:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create warehouse label" });
    }
  });

  // PATCH /api/warehouse-labels/:id - Update a label
  app.patch('/api/warehouse-labels/:id', isAuthenticated, async (req: any, res) => {
    try {
      const labelId = req.params.id;
      const existingLabel = await storage.getWarehouseLabel(labelId);
      
      if (!existingLabel) {
        return res.status(404).json({ message: "Warehouse label not found" });
      }
      
      const updates = insertWarehouseLabelSchema.partial().parse(req.body);
      const updated = await storage.updateWarehouseLabel(labelId, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating warehouse label:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update warehouse label" });
    }
  });

  // POST /api/warehouse-labels/:id/print - Increment print count for a label
  app.post('/api/warehouse-labels/:id/print', isAuthenticated, async (req: any, res) => {
    try {
      const labelId = req.params.id;
      const label = await storage.incrementWarehouseLabelPrintCount(labelId);
      
      if (!label) {
        return res.status(404).json({ message: "Warehouse label not found" });
      }
      
      res.json(label);
    } catch (error) {
      console.error("Error incrementing print count:", error);
      res.status(500).json({ message: "Failed to increment print count" });
    }
  });

  // DELETE /api/warehouse-labels/:id - Delete a single label
  app.delete('/api/warehouse-labels/:id', isAuthenticated, async (req: any, res) => {
    try {
      const labelId = req.params.id;
      const existingLabel = await storage.getWarehouseLabel(labelId);
      
      if (!existingLabel) {
        return res.status(404).json({ message: "Warehouse label not found" });
      }
      
      await storage.deleteWarehouseLabel(labelId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting warehouse label:", error);
      res.status(500).json({ message: "Failed to delete warehouse label" });
    }
  });

  // POST /api/warehouse-labels/bulk-delete - Delete multiple labels
  app.post('/api/warehouse-labels/bulk-delete', isAuthenticated, async (req: any, res) => {
    try {
      const { ids } = req.body;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "ids array is required" });
      }
      
      const deletedCount = await storage.deleteWarehouseLabels(ids);
      res.json({ deletedCount });
    } catch (error) {
      console.error("Error bulk deleting warehouse labels:", error);
      res.status(500).json({ message: "Failed to delete warehouse labels" });
    }
  });

  // POST /api/warehouse-labels/bulk-print - Mark multiple labels as printed
  app.post('/api/warehouse-labels/bulk-print', isAuthenticated, async (req: any, res) => {
    try {
      const { ids } = req.body;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "ids array is required" });
      }
      
      const results = await Promise.all(
        ids.map(id => storage.incrementWarehouseLabelPrintCount(id))
      );
      
      res.json({ updatedCount: results.filter(r => r !== undefined).length });
    } catch (error) {
      console.error("Error bulk printing warehouse labels:", error);
      res.status(500).json({ message: "Failed to update print counts" });
    }
  });

  // ============================================================================
  // RECEIVING - BULK TRACKING NUMBER LOOKUP
  // ============================================================================

  // POST /api/receiving/lookup-tracking - Look up tracking numbers and return associated orders
  app.post('/api/receiving/lookup-tracking', isAuthenticated, async (req: any, res) => {
    try {
      const { trackingNumbers } = req.body;

      if (!trackingNumbers || !Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
        return res.status(400).json({ message: "trackingNumbers array is required" });
      }

      // Normalize and deduplicate tracking numbers
      const normalizedNumbers = [...new Set(
        trackingNumbers
          .map((n: string) => n.trim().toUpperCase())
          .filter((n: string) => n.length > 0)
      )];

      if (normalizedNumbers.length === 0) {
        return res.json({
          results: [],
          summary: { totalScanned: 0, matched: 0, unmatched: 0, orderCounts: {} }
        });
      }

      // Look up in orderCartons table (single tracking number per carton)
      const cartonMatches = await db
        .select({
          trackingNumber: orderCartons.trackingNumber,
          orderId: orderCartons.orderId,
          cartonNumber: orderCartons.cartonNumber
        })
        .from(orderCartons)
        .where(
          sql`UPPER(${orderCartons.trackingNumber}) IN (${sql.join(
            normalizedNumbers.map(n => sql`${n}`),
            sql`, `
          )})`
        );

      // Look up in shipmentLabels table (array of tracking numbers)
      const labelMatches = await db
        .select({
          trackingNumbers: shipmentLabels.trackingNumbers,
          orderId: shipmentLabels.orderId,
          carrier: shipmentLabels.carrier,
          id: shipmentLabels.id
        })
        .from(shipmentLabels)
        .where(eq(shipmentLabels.status, 'active'));

      // Build results map
      const results: Array<{
        trackingNumber: string;
        matched: boolean;
        orderId: string | null;
        orderDisplayId: string | null;
        source: 'carton' | 'label' | null;
        cartonNumber?: number;
        carrier?: string;
      }> = [];

      const orderCounts: Record<string, { count: number; orderId: string; orderDisplayId: string }> = {};

      // Get order display IDs for matched orders
      const matchedOrderIds = new Set<string>();
      cartonMatches.forEach(m => m.orderId && matchedOrderIds.add(m.orderId));
      labelMatches.forEach(m => m.orderId && matchedOrderIds.add(m.orderId));

      let orderDisplayMap: Record<string, string> = {};
      if (matchedOrderIds.size > 0) {
        const orderRecords = await db
          .select({ id: orders.id, orderId: orders.orderId })
          .from(orders)
          .where(inArray(orders.id, Array.from(matchedOrderIds)));
        orderDisplayMap = Object.fromEntries(
          orderRecords.map(o => [o.id, o.orderId])
        );
      }

      // Process each scanned tracking number
      for (const trackingNum of normalizedNumbers) {
        // Check carton matches first
        const cartonMatch = cartonMatches.find(
          m => m.trackingNumber?.toUpperCase() === trackingNum
        );

        if (cartonMatch && cartonMatch.orderId) {
          const displayId = orderDisplayMap[cartonMatch.orderId] || cartonMatch.orderId;
          results.push({
            trackingNumber: trackingNum,
            matched: true,
            orderId: cartonMatch.orderId,
            orderDisplayId: displayId,
            source: 'carton',
            cartonNumber: cartonMatch.cartonNumber
          });

          // Update order counts
          if (!orderCounts[cartonMatch.orderId]) {
            orderCounts[cartonMatch.orderId] = { count: 0, orderId: cartonMatch.orderId, orderDisplayId: displayId };
          }
          orderCounts[cartonMatch.orderId].count++;
          continue;
        }

        // Check label matches (array contains)
        const labelMatch = labelMatches.find(
          m => m.trackingNumbers?.some(tn => tn.toUpperCase() === trackingNum)
        );

        if (labelMatch && labelMatch.orderId) {
          const displayId = orderDisplayMap[labelMatch.orderId] || labelMatch.orderId;
          results.push({
            trackingNumber: trackingNum,
            matched: true,
            orderId: labelMatch.orderId,
            orderDisplayId: displayId,
            source: 'label',
            carrier: labelMatch.carrier || undefined
          });

          // Update order counts
          if (!orderCounts[labelMatch.orderId]) {
            orderCounts[labelMatch.orderId] = { count: 0, orderId: labelMatch.orderId, orderDisplayId: displayId };
          }
          orderCounts[labelMatch.orderId].count++;
          continue;
        }

        // No match found
        results.push({
          trackingNumber: trackingNum,
          matched: false,
          orderId: null,
          orderDisplayId: null,
          source: null
        });
      }

      const matched = results.filter(r => r.matched).length;
      const unmatched = results.length - matched;

      res.json({
        results,
        summary: {
          totalScanned: results.length,
          matched,
          unmatched,
          orderCounts: Object.values(orderCounts)
        }
      });
    } catch (error) {
      console.error("Error looking up tracking numbers:", error);
      res.status(500).json({ message: "Failed to look up tracking numbers" });
    }
  });

  // Services endpoints
  app.get('/api/services', isAuthenticated, async (req, res) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.get('/api/services/:id', isAuthenticated, async (req, res) => {
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

  app.post('/api/services', isAuthenticated, async (req: any, res) => {
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

  app.patch('/api/services/:id', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/services/:id', isAuthenticated, async (req: any, res) => {
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

  // Import services from Excel
  app.post('/api/services/import', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const XLSX = await import('xlsx');
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (!rows || rows.length === 0) {
        return res.status(400).json({ message: 'No data found in file' });
      }

      let importedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const serviceName = row['Service Name'] || row['name'] || row['Name'];
          if (!serviceName) {
            errors.push(`Row ${i + 2}: Missing service name`);
            continue;
          }

          // Find customer by name if provided
          let customerId: string | null = null;
          const customerName = row['Customer Name'];
          if (customerName) {
            const customers = await storage.getCustomers();
            const matchedCustomer = customers.find(c => 
              c.name?.toLowerCase() === String(customerName).toLowerCase().trim()
            );
            if (matchedCustomer) {
              customerId = matchedCustomer.id;
            }
          }

          // Parse costs
          const serviceCost = row['Service Cost'] ? String(row['Service Cost']).replace(/[^0-9.-]/g, '') : '0';
          const partsCost = row['Parts Cost'] ? String(row['Parts Cost']).replace(/[^0-9.-]/g, '') : '0';
          const totalCost = (parseFloat(serviceCost) + parseFloat(partsCost)).toFixed(2);

          // Parse date
          let serviceDate: Date | null = null;
          if (row['Service Date']) {
            const parsed = new Date(row['Service Date']);
            if (!isNaN(parsed.getTime())) {
              serviceDate = parsed;
            }
          }

          // Parse status
          let status = 'pending';
          const rowStatus = String(row['Status'] || '').toLowerCase().trim();
          if (['pending', 'in_progress', 'completed', 'cancelled'].includes(rowStatus)) {
            status = rowStatus;
          }

          const serviceData: any = {
            name: String(serviceName).trim(),
            description: row['Description'] ? String(row['Description']).trim() : null,
            customerId: customerId,
            serviceDate: serviceDate,
            serviceCost: serviceCost,
            partsCost: partsCost,
            totalCost: totalCost,
            currency: row['Currency'] ? String(row['Currency']).toUpperCase().trim() : 'EUR',
            status: status,
            notes: row['Notes'] ? String(row['Notes']).trim() : null,
          };

          await storage.createService(serviceData);
          importedCount++;
        } catch (err: any) {
          errors.push(`Row ${i + 2}: ${err.message || 'Unknown error'}`);
        }
      }

      // Log activity
      await storage.createUserActivity({
        userId: req.user?.id || "test-user",
        action: 'imported',
        entityType: 'service',
        entityId: 'bulk',
        description: `Imported ${importedCount} services from Excel`,
      });

      res.json({ 
        success: true, 
        imported: importedCount, 
        count: importedCount,
        errors: errors.length > 0 ? errors : undefined 
      });
    } catch (error) {
      console.error("Error importing services:", error);
      res.status(500).json({ message: "Failed to import services" });
    }
  });

  app.get('/api/services/:id/items', isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getServiceItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching service items:", error);
      res.status(500).json({ message: "Failed to fetch service items" });
    }
  });

  app.get('/api/customers/:id/pending-services', isAuthenticated, async (req, res) => {
    try {
      const pendingServices = await storage.getCustomerPendingServices(req.params.id);
      res.json(pendingServices);
    } catch (error) {
      console.error("Error fetching customer pending services:", error);
      res.status(500).json({ message: "Failed to fetch pending services" });
    }
  });

  // Pre-Orders endpoints
  app.get('/api/pre-orders', isAuthenticated, async (req, res) => {
    try {
      const preOrders = await storage.getPreOrders();
      // Filter financial data based on user role
      const userRole = req.user?.role || 'warehouse_operator';
      const filtered = filterFinancialData(preOrders, userRole);
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching pre-orders:", error);
      res.status(500).json({ message: "Failed to fetch pre-orders" });
    }
  });

  app.get('/api/pre-orders/:id', isAuthenticated, async (req, res) => {
    try {
      const preOrder = await storage.getPreOrder(req.params.id);
      if (!preOrder) {
        return res.status(404).json({ message: "Pre-order not found" });
      }

      const items = await storage.getPreOrderItems(req.params.id);
      const preOrderWithItems = { ...preOrder, items };
      
      // Filter financial data based on user role
      const userRole = req.user?.role || 'warehouse_operator';
      const filtered = filterFinancialData(preOrderWithItems, userRole);
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching pre-order:", error);
      res.status(500).json({ message: "Failed to fetch pre-order" });
    }
  });

  app.post('/api/pre-orders', isAuthenticated, async (req: any, res) => {
    try {
      const { items, ...preOrderData } = req.body;
      const data = insertPreOrderSchema.parse(preOrderData);
      const preOrder = await storage.createPreOrder(data);

      // Create pre-order items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          await storage.createPreOrderItem({
            preOrderId: preOrder.id,
            productId: item.productId || null,
            itemName: item.itemName,
            itemDescription: item.itemDescription || null,
            quantity: item.quantity,
          });
        }
      }

      res.status(201).json(preOrder);
    } catch (error) {
      console.error("Error creating pre-order:", error);
      res.status(500).json({ message: "Failed to create pre-order" });
    }
  });

  app.patch('/api/pre-orders/:id', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/pre-orders/:id', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/pre-orders/:preOrderId/items', isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getPreOrderItems(req.params.preOrderId);
      // Filter financial data based on user role
      const userRole = req.user?.role || 'warehouse_operator';
      const filtered = filterFinancialData(items, userRole);
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching pre-order items:", error);
      res.status(500).json({ message: "Failed to fetch pre-order items" });
    }
  });

  app.post('/api/pre-orders/:preOrderId/items', isAuthenticated, async (req: any, res) => {
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

  app.patch('/api/pre-order-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const updates = insertPreOrderItemSchema.partial().parse(req.body);
      const item = await storage.updatePreOrderItem(req.params.id, updates);
      res.json(item);
    } catch (error) {
      console.error("Error updating pre-order item:", error);
      res.status(500).json({ message: "Failed to update pre-order item" });
    }
  });

  app.delete('/api/pre-order-items/:id', isAuthenticated, async (req: any, res) => {
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

  // Pre-Order Reminders endpoints
  app.get('/api/pre-orders/:id/reminders', isAuthenticated, async (req: any, res) => {
    try {
      const preOrder = await storage.getPreOrder(req.params.id);
      if (!preOrder) {
        return res.status(404).json({ message: "Pre-order not found" });
      }
      
      const reminders = await storage.getPreOrderReminders(req.params.id);
      res.json(reminders);
    } catch (error) {
      console.error("Error fetching pre-order reminders:", error);
      res.status(500).json({ message: "Failed to fetch reminders" });
    }
  });

  app.post('/api/pre-orders/:id/send-reminder', isAuthenticated, smsRateLimiter, async (req: any, res) => {
    try {
      const preOrder = await storage.getPreOrder(req.params.id) as any;
      if (!preOrder) {
        return res.status(404).json({ message: "Pre-order not found" });
      }
      
      if (!preOrder.reminderEnabled) {
        return res.status(400).json({ message: "Reminders are not enabled for this pre-order" });
      }
      
      const { channel } = req.body;
      
      const validChannels = ['sms', 'email', 'both'];
      if (!validChannels.includes(channel)) {
        return res.status(400).json({ message: "Invalid channel. Must be 'sms', 'email', or 'both'" });
      }
      
      const allowedChannel = preOrder.reminderChannel || 'sms';
      if (channel !== allowedChannel && channel !== 'both' && allowedChannel !== 'both') {
        return res.status(400).json({ 
          message: `Channel '${channel}' is not enabled for this pre-order. Configured channel: ${allowedChannel}` 
        });
      }
      
      const { sendPreOrderReminder } = await import('./services/preOrderNotificationService');
      const result = await sendPreOrderReminder(req.params.id, allowedChannel);
      
      res.json({ 
        success: result.sms?.success || result.email?.success,
        sms: result.sms,
        email: result.email
      });
    } catch (error) {
      console.error("Error sending pre-order reminder:", error);
      res.status(500).json({ message: "Failed to send reminder" });
    }
  });

  app.post('/api/pre-orders/process-scheduled-reminders', isAuthenticated, requireRole(['administrator']), async (req: any, res) => {
    try {
      const { processScheduledReminders } = await import('./services/preOrderNotificationService');
      const result = await processScheduledReminders();
      res.json(result);
    } catch (error) {
      console.error("Error processing scheduled reminders:", error);
      res.status(500).json({ message: "Failed to process scheduled reminders" });
    }
  });

  // Sales/Discounts endpoints
  app.get('/api/discounts', isAuthenticated, async (req, res) => {
    try {
      // Sync expired discount statuses before returning
      await storage.syncExpiredDiscountStatuses();
      const discounts = await storage.getDiscounts();
      res.json(discounts);
    } catch (error) {
      console.error("Error fetching discounts:", error);
      res.status(500).json({ message: "Failed to fetch discounts" });
    }
  });
  
  // Manual sync endpoint for admins
  app.post('/api/discounts/sync-status', isAuthenticated, requireRole(['administrator']), async (req: any, res) => {
    try {
      const count = await storage.syncExpiredDiscountStatuses();
      res.json({ success: true, updatedCount: count, message: `Updated ${count} expired discounts to 'finished' status` });
    } catch (error) {
      console.error("Error syncing discount statuses:", error);
      res.status(500).json({ message: "Failed to sync discount statuses" });
    }
  });

  app.post('/api/discounts', isAuthenticated, async (req: any, res) => {
    try {
      // Convert numeric fields to strings for decimal columns
      const body = { ...req.body };
      if (typeof body.percentage === 'number') {
        body.percentage = String(body.percentage);
      }
      if (typeof body.value === 'number') {
        body.value = String(body.value);
      }
      if (typeof body.minPurchaseAmount === 'number') {
        body.minPurchaseAmount = String(body.minPurchaseAmount);
      }
      if (typeof body.maxDiscountAmount === 'number') {
        body.maxDiscountAmount = String(body.maxDiscountAmount);
      }
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

  app.get('/api/discounts/:id', isAuthenticated, async (req, res) => {
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

  app.patch('/api/discounts/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Convert numeric fields to strings for decimal columns
      const body = { ...req.body };
      if (typeof body.percentage === 'number') {
        body.percentage = String(body.percentage);
      }
      if (typeof body.value === 'number') {
        body.value = String(body.value);
      }
      if (typeof body.minPurchaseAmount === 'number') {
        body.minPurchaseAmount = String(body.minPurchaseAmount);
      }
      if (typeof body.maxDiscountAmount === 'number') {
        body.maxDiscountAmount = String(body.maxDiscountAmount);
      }
      if (typeof body.fixedAmount === 'number') {
        body.fixedAmount = String(body.fixedAmount);
      }
      const discount = await storage.updateDiscount(req.params.id, body);

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

  app.delete('/api/discounts/:id', isAuthenticated, async (req: any, res) => {
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
  app.use('/api/imports', requireRole(['administrator']), imports);

  // World-record speed optimization routes
  app.use('/api/optimize', optimizeDb);

  // Returns endpoints
  app.get('/api/returns', isAuthenticated, async (req, res) => {
    try {
      const returns = await storage.getReturns();
      // Filter financial data based on user role
      const userRole = req.user?.role || 'warehouse_operator';
      const filtered = filterFinancialData(returns, userRole);
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching returns:", error);
      res.status(500).json({ message: "Failed to fetch returns" });
    }
  });

  app.get('/api/returns/:id', isAuthenticated, async (req, res) => {
    try {
      const returnData = await storage.getReturn(req.params.id);
      if (!returnData) {
        return res.status(404).json({ message: "Return not found" });
      }
      // Filter financial data based on user role
      const userRole = req.user?.role || 'warehouse_operator';
      const filtered = filterFinancialData(returnData, userRole);
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching return:", error);
      res.status(500).json({ message: "Failed to fetch return" });
    }
  });

  app.post('/api/returns', isAuthenticated, async (req: any, res) => {
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

  app.put('/api/returns/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { items, ...returnData } = req.body;

      // Get the existing return to check previous status
      const existingReturn = await storage.getReturn(req.params.id);
      if (!existingReturn) {
        return res.status(404).json({ message: "Return not found" });
      }

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

      // Handle inventory restoration when return is completed
      if (returnData.status === 'completed' && existingReturn.status !== 'completed') {
        const returnType = returnData.returnType || existingReturn.returnType;
        const returnItems = items || await storage.getReturnItems(req.params.id);

        // Only restore inventory for exchange, refund, and store_credit types
        // DO NOT restore inventory for damaged_goods and bad_quality (they are disposed)
        const shouldRestoreInventory = ['exchange', 'refund', 'store_credit'].includes(returnType);

        if (shouldRestoreInventory && returnItems && returnItems.length > 0) {
          // Restore inventory for each returned item
          for (const item of returnItems) {
            try {
              const product = await storage.getProductById(item.productId);
              if (product) {
                const currentQuantity = parseInt(product.quantity || '0');
                const returnQuantity = parseInt(item.quantity || '0');
                const newQuantity = currentQuantity + returnQuantity;

                await storage.updateProduct(item.productId, {
                  quantity: newQuantity.toString(),
                });
              }
            } catch (error) {
              console.error(`Error restoring inventory for product ${item.productId}:`, error);
            }
          }
        }
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

  app.delete('/api/returns/:id', isAuthenticated, async (req: any, res) => {
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

  // Returns import endpoint
  const returnImportUpload = multer({
    storage: multer.memoryStorage(),
  });

  app.post('/api/returns/import', isAuthenticated, returnImportUpload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const XLSX = await import('xlsx');
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (!data || data.length === 0) {
        return res.status(400).json({ message: "No data found in Excel file" });
      }

      const importedReturns: any[] = [];
      const errors: string[] = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          const returnId = row['Return ID'] || `RET-${Date.now()}-${i}`;
          const orderId = row['Order ID'] || null;
          const customerName = row['Customer Name'] || 'Unknown Customer';
          const customerEmail = row['Customer Email'] || '';
          const customerPhone = row['Customer Phone'] || '';
          const returnDate = row['Return Date'] ? new Date(row['Return Date']) : new Date();
          const status = row['Status'] || 'awaiting';
          const returnType = row['Return Type'] || 'refund';
          const reason = row['Reason'] || '';
          const refundAmount = parseFloat(row['Refund Amount']) || 0;
          const currency = row['Currency'] || 'EUR';
          const itemsRaw = row['Items'] || '';

          let customer = null;
          if (customerName && customerName !== 'Unknown Customer') {
            const existingCustomers = await storage.getCustomers();
            customer = existingCustomers.find(c => 
              c.name?.toLowerCase() === customerName.toLowerCase() || 
              c.email?.toLowerCase() === customerEmail.toLowerCase()
            );
            
            if (!customer && customerName) {
              customer = await storage.createCustomer({
                name: customerName,
                email: customerEmail || `${customerName.toLowerCase().replace(/\s+/g, '.')}@imported.local`,
                phone: customerPhone,
                isActive: true,
              });
            }
          }

          const returnData = await storage.createReturn({
            returnId,
            orderId,
            customerId: customer?.id,
            status: ['awaiting', 'processing', 'completed', 'cancelled'].includes(status) ? status : 'awaiting',
            returnType: ['exchange', 'refund', 'store_credit'].includes(returnType) ? returnType : 'refund',
            returnDate: returnDate.toISOString(),
            notes: reason,
            total: refundAmount,
            currency,
            items: [],
          });

          importedReturns.push(returnData);
        } catch (rowError: any) {
          console.error(`Error importing return row ${i + 1}:`, rowError);
          errors.push(`Row ${i + 1}: ${rowError.message || 'Unknown error'}`);
        }
      }

      await storage.createUserActivity({
        userId: req.user?.id || "test-user",
        action: 'imported',
        entityType: 'return',
        entityId: 'bulk',
        description: `Imported ${importedReturns.length} returns from Excel`,
      });

      res.json({
        imported: importedReturns.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully imported ${importedReturns.length} returns${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
      });
    } catch (error: any) {
      console.error("Error importing returns:", error);
      res.status(500).json({ message: error.message || "Failed to import returns" });
    }
  });

  // Mock data endpoint (for development)
  app.post('/api/seed-mock-data', requireRole(['administrator']), async (req, res) => {
    try {
      await seedMockData();
      res.json({ message: "Mock data seeded successfully" });
    } catch (error) {
      console.error("Error seeding mock data:", error);
      res.status(500).json({ message: "Failed to seed mock data" });
    }
  });

  app.post('/api/seed-comprehensive-data', requireRole(['administrator']), async (req, res) => {
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
  app.post('/api/fix-order-items', requireRole(['administrator']), async (req, res) => {
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
  app.post('/api/reseed-discounts', requireRole(['administrator']), async (req, res) => {
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
  app.get('/api/reports/sales-summary', requireRole(['administrator']), async (req, res) => {
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
      const totalRevenue = filteredOrders.reduce((sum, order) => sum + parseFloat(order.grandTotal || order.total || '0'), 0);
      const totalCost = filteredOrders.reduce((sum, order) => sum + parseFloat(order.totalCost || '0'), 0);
      const summary = {
        totalOrders: filteredOrders.length,
        totalRevenue,
        totalCost,
        totalProfit: totalRevenue - totalCost,
        averageOrderValue: filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0,
        ordersByStatus: filteredOrders.reduce((acc, order) => {
          acc[order.orderStatus || order.status] = (acc[order.orderStatus || order.status] || 0) + 1;
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

  app.get('/api/reports/inventory-summary', requireRole(['administrator']), async (req, res) => {
    try {
      const products = await storage.getProducts();
      const warehouses = await storage.getWarehouses();

      const summary = {
        totalProducts: products.length,
        // Use landing cost for stock value (cost-based valuation)
        totalStockValue: products.reduce((sum, product) => {
          const cost = parseFloat(product.landingCostCzk || product.importCostCzk || product.sellingPriceCzk || '0');
          return sum + (cost * (product.quantity || 0));
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

  app.get('/api/reports/customer-analytics', requireRole(['administrator']), async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      const orders = await storage.getOrders();

      // Calculate customer metrics
      const customerMetrics = customers.map(customer => {
        const customerOrders = orders.filter(o => o.customerId === customer.id);
        const totalSpent = customerOrders.reduce((sum, order) => sum + parseFloat(order.grandTotal || order.total || '0'), 0);
        const totalProfit = customerOrders.reduce((sum, order) => {
          const grandTotal = parseFloat(order.grandTotal || order.total || '0');
          const totalCost = parseFloat(order.totalCost || '0');
          return sum + (grandTotal - totalCost);
        }, 0);
        const lastOrderDate = customerOrders.length > 0 ? 
          customerOrders.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())[0].createdAt : null;

        return {
          customerId: customer.id,
          customerName: customer.name,
          totalOrders: customerOrders.length,
          totalSpent,
          totalProfit,
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

  // Comprehensive business reports endpoint - server-side calculation
  app.get('/api/reports/business', requireRole(['administrator']), async (req, res) => {
    try {
      const { startDate, endDate, currency = 'CZK' } = req.query;
      const baseCurrency = (currency as string).toUpperCase();
      
      // Fetch exchange rates from Frankfurter API
      let exchangeRates: { rates: Record<string, number> } = { rates: { CZK: 25, USD: 1.1 } };
      try {
        const exchangeRateResponse = await fetch('https://api.frankfurter.app/latest?from=EUR');
        if (exchangeRateResponse.ok) {
          exchangeRates = await exchangeRateResponse.json();
        }
      } catch (err) {
        console.warn('Failed to fetch exchange rates, using defaults');
      }

      // Convert amount to base currency
      const convertToBaseCurrency = (amount: number, fromCurrency: string): number => {
        if (!amount || !fromCurrency) return 0;
        const from = fromCurrency.toUpperCase();
        if (from === baseCurrency) return amount;

        let amountInEur = amount;
        if (from !== 'EUR' && exchangeRates.rates && exchangeRates.rates[from]) {
          amountInEur = amount / exchangeRates.rates[from];
        }

        if (baseCurrency === 'EUR') return amountInEur;
        if (exchangeRates.rates && exchangeRates.rates[baseCurrency]) {
          return amountInEur * exchangeRates.rates[baseCurrency];
        }

        return amount;
      };

      // Get all data
      const allOrders = await storage.getOrders();
      const allProducts = await storage.getProducts();
      const allCustomers = await storage.getCustomers();
      const allExpenses = await storage.getExpenses();
      const allOrderItems = await db.select().from(orderItems);

      // Parse date range
      const start = startDate ? new Date(startDate as string) : new Date(0);
      const end = endDate ? new Date(endDate as string) : new Date();
      end.setHours(23, 59, 59, 999);

      // Filter orders by date range - use shipped+paid for revenue calculations
      const revenueOrders = allOrders.filter(order => {
        const orderDate = new Date(order.createdAt!);
        const inDateRange = orderDate >= start && orderDate <= end;
        const isCompleted = order.orderStatus === 'shipped' && order.paymentStatus === 'paid';
        return inDateRange && isCompleted;
      });

      // All orders in date range (for order count)
      const allOrdersInRange = allOrders.filter(order => {
        const orderDate = new Date(order.createdAt!);
        return orderDate >= start && orderDate <= end && !order.isArchived;
      });

      // Filter expenses by date range (only paid expenses)
      const filteredExpenses = allExpenses.filter(expense => {
        if (expense.status !== 'paid') return false;
        const expenseDate = new Date(expense.date!);
        return expenseDate >= start && expenseDate <= end;
      });

      // Get order items for revenue orders
      const revenueOrderIds = new Set(revenueOrders.map(o => o.id));
      const filteredOrderItems = allOrderItems.filter(item => revenueOrderIds.has(item.orderId!));

      // Calculate revenue (grandTotal from shipped+paid orders)
      let totalRevenue = 0;
      revenueOrders.forEach(order => {
        const grandTotal = parseFloat(order.grandTotal || '0');
        totalRevenue += convertToBaseCurrency(grandTotal, order.currency || 'CZK');
      });

      // Calculate COGS from order.totalCost (pre-calculated from item landing costs)
      let totalCost = 0;
      revenueOrders.forEach(order => {
        const orderCost = parseFloat(order.totalCost || '0');
        totalCost += convertToBaseCurrency(orderCost, order.currency || 'CZK');
      });

      // Add expenses to total cost
      let totalExpenses = 0;
      filteredExpenses.forEach(expense => {
        const amount = parseFloat(expense.amount || '0');
        totalExpenses += convertToBaseCurrency(amount, expense.currency || 'CZK');
      });
      totalCost += totalExpenses;

      // Calculate metrics
      const profit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
      const avgOrderValue = revenueOrders.length > 0 ? totalRevenue / revenueOrders.length : 0;

      // Calculate units sold
      const totalUnitsSold = filteredOrderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

      // Top selling products
      const productSales = new Map<string, { quantity: number; revenue: number; product: any }>();
      filteredOrderItems.forEach(item => {
        if (!item.productId) return;
        const product = allProducts.find(p => p.id === item.productId);
        if (!product) return;
        
        const existing = productSales.get(item.productId) || { quantity: 0, revenue: 0, product };
        existing.quantity += item.quantity || 0;
        const order = revenueOrders.find(o => o.id === item.orderId);
        if (order) {
          const itemRevenue = parseFloat(item.totalPrice || '0');
          existing.revenue += convertToBaseCurrency(itemRevenue, order.currency || 'CZK');
        }
        productSales.set(item.productId, existing);
      });
      
      const topProducts = Array.from(productSales.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10)
        .map(item => ({
          product: { id: item.product.id, name: item.product.name, sku: item.product.sku },
          quantity: item.quantity,
          revenue: item.revenue
        }));

      // Top customers
      const customerOrders = new Map<string, { orderCount: number; totalSpent: number; customer: any }>();
      revenueOrders.forEach(order => {
        if (!order.customerId) return;
        const customer = allCustomers.find(c => c.id === order.customerId);
        if (!customer) return;
        
        const existing = customerOrders.get(order.customerId) || { orderCount: 0, totalSpent: 0, customer };
        existing.orderCount += 1;
        existing.totalSpent += convertToBaseCurrency(parseFloat(order.grandTotal || '0'), order.currency || 'CZK');
        customerOrders.set(order.customerId, existing);
      });
      
      const topCustomers = Array.from(customerOrders.values())
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10)
        .map(item => ({
          customer: { id: item.customer.id, name: item.customer.name },
          orderCount: item.orderCount,
          totalSpent: item.totalSpent
        }));

      // Active customers (customers with orders in date range)
      const activeCustomerIds = new Set(allOrdersInRange.filter(o => o.customerId).map(o => o.customerId));
      const activeCustomers = activeCustomerIds.size;

      // Inventory insights
      const lowStockThreshold = 10;
      const lowStockProducts = allProducts.filter(p => (p.quantity || 0) > 0 && (p.quantity || 0) < (p.minQuantity || lowStockThreshold));
      const outOfStockProducts = allProducts.filter(p => (p.quantity || 0) <= 0);
      const totalStock = allProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);
      
      // Calculate stock value in base currency
      let totalStockValue = 0;
      allProducts.forEach(product => {
        const qty = product.quantity || 0;
        const priceUSD = parseFloat(product.importCostUsd || '0');
        const priceEUR = parseFloat(product.importCostEur || '0');
        const priceCZK = parseFloat(product.importCostCzk || product.sellingPriceCzk || '0');
        
        if (priceUSD > 0) {
          totalStockValue += convertToBaseCurrency(priceUSD * qty, 'USD');
        } else if (priceEUR > 0) {
          totalStockValue += convertToBaseCurrency(priceEUR * qty, 'EUR');
        } else if (priceCZK > 0) {
          totalStockValue += convertToBaseCurrency(priceCZK * qty, 'CZK');
        }
      });

      res.json({
        financial: {
          totalRevenue,
          totalCost,
          profit,
          profitMargin,
          avgOrderValue,
          totalOrders: allOrdersInRange.length,
          revenueOrderCount: revenueOrders.length
        },
        sales: {
          totalUnitsSold,
          topProducts
        },
        customers: {
          activeCustomers,
          totalCustomers: allCustomers.length,
          topCustomers
        },
        inventory: {
          totalStock,
          totalValue: totalStockValue,
          lowStockCount: lowStockProducts.length,
          outOfStockCount: outOfStockProducts.length,
          lowStockProducts: lowStockProducts.slice(0, 10).map(p => ({
            id: p.id,
            name: p.name,
            quantity: p.quantity,
            minQuantity: p.minQuantity || lowStockThreshold
          }))
        },
        meta: {
          currency: baseCurrency,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error generating business reports:", error);
      res.status(500).json({ message: "Failed to generate business reports" });
    }
  });

  app.get('/api/reports/financial-summary', requireRole(['administrator']), async (req, res) => {
    try {
      const { year, month, baseCurrency = 'CZK' } = req.query;

      // Fetch exchange rates from Frankfurter API for currency conversion
      const exchangeRateResponse = await fetch('https://api.frankfurter.app/latest?from=EUR');
      const exchangeRates = await exchangeRateResponse.json();

      // Convert amount to base currency (default CZK)
      const convertToBaseCurrency = (amount: number, fromCurrency: string): number => {
        if (!amount || !fromCurrency) return 0;
        const base = (baseCurrency as string).toUpperCase();
        const from = fromCurrency.toUpperCase();
        if (from === base) return amount;

        // First convert to EUR, then to base currency
        let amountInEur = amount;
        if (from !== 'EUR' && exchangeRates.rates && exchangeRates.rates[from]) {
          amountInEur = amount / exchangeRates.rates[from];
        }

        // Then convert from EUR to base currency
        if (base === 'EUR') return amountInEur;
        if (exchangeRates.rates && exchangeRates.rates[base]) {
          return amountInEur * exchangeRates.rates[base];
        }

        return amount; // Fallback if rate not found
      };

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

      // Calculate financial summary with currency conversion
      // Only count shipped+paid orders for revenue
      const revenueOrders = filteredOrders.filter(o => 
        (o.orderStatus === 'shipped' || o.orderStatus === 'delivered') && 
        o.paymentStatus === 'paid'
      );
      
      const revenue = revenueOrders.reduce((sum, order) => {
        const amount = parseFloat(order.grandTotal || order.total || '0');
        return sum + convertToBaseCurrency(amount, order.currency || 'CZK');
      }, 0);
      
      // Calculate cost from stored totalCost (already includes item landing costs)
      const totalCost = revenueOrders.reduce((sum, order) => {
        const cost = parseFloat(order.totalCost || '0');
        return sum + convertToBaseCurrency(cost, order.currency || 'CZK');
      }, 0);

      // Calculate expenses with currency conversion (only paid expenses count)
      const totalExpenses = filteredExpenses
        .filter(e => e.status === 'paid')
        .reduce((sum, expense) => {
          const amount = parseFloat(expense.amount || '0');
          return sum + convertToBaseCurrency(amount, expense.currency || 'CZK');
        }, 0);

      // Note: Purchases represent inventory acquisition, which becomes COGS when sold
      // We don't subtract purchases from profit to avoid double-counting with COGS
      const totalPurchases = filteredPurchases
        .reduce((sum, purchase) => {
          const qty = purchase.quantity || 0;
          const price = parseFloat(purchase.importPrice || '0');
          return sum + (qty * price); // Purchases are typically in the same currency
        }, 0);

      // Profit = Revenue - COGS (totalCost) - Operating Expenses
      // Purchases are NOT subtracted as they become COGS when items are sold
      const profit = revenue - totalCost - totalExpenses;

      // Calculate expense breakdown with currency conversion
      const expenseBreakdown = filteredExpenses
        .filter(e => e.status === 'paid')
        .reduce((acc, expense) => {
          const category = expense.category || 'Other';
          const amount = parseFloat(expense.amount || '0');
          const convertedAmount = convertToBaseCurrency(amount, expense.currency || 'CZK');
          acc[category] = (acc[category] || 0) + convertedAmount;
          return acc;
        }, {} as Record<string, number>);

      const summary = {
        revenue,
        cost: totalCost,
        expenses: totalExpenses,
        purchases: totalPurchases,
        profit,
        profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
        expenseBreakdown,
        baseCurrency,
        orderCount: revenueOrders.length,
        monthlyTrend: year ? getMonthlyTrendWithCurrency(orders, expenses, purchases, parseInt(year as string), convertToBaseCurrency) : []
      };

      res.json(summary);
    } catch (error) {
      console.error("Error generating financial summary:", error);
      res.status(500).json({ message: "Failed to generate financial summary" });
    }
  });

  // Helper function for monthly trend with currency conversion
  function getMonthlyTrendWithCurrency(
    orders: Order[], 
    expenses: Expense[], 
    purchases: Purchase[], 
    year: number,
    convertToBaseCurrency: (amount: number, currency: string) => number
  ) {
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

      // Only count shipped+paid orders for revenue
      const revenueOrders = monthOrders.filter(o => 
        (o.orderStatus === 'shipped' || o.orderStatus === 'delivered') && 
        o.paymentStatus === 'paid'
      );
      
      const revenue = revenueOrders.reduce((sum, order) => {
        const amount = parseFloat(order.grandTotal || order.total || '0');
        return sum + convertToBaseCurrency(amount, order.currency || 'CZK');
      }, 0);
      
      const totalCost = revenueOrders.reduce((sum, order) => {
        const cost = parseFloat(order.totalCost || '0');
        return sum + convertToBaseCurrency(cost, order.currency || 'CZK');
      }, 0);

      const totalExpenses = monthExpenses
        .filter(e => e.status === 'paid')
        .reduce((sum, expense) => {
          const amount = parseFloat(expense.amount || '0');
          return sum + convertToBaseCurrency(amount, expense.currency || 'CZK');
        }, 0);

      const totalPurchases = monthPurchases
        .reduce((sum, purchase) => {
          const qty = purchase.quantity || 0;
          const price = parseFloat(purchase.importPrice || '0');
          return sum + (qty * price);
        }, 0);

      return {
        month: month + 1,
        revenue,
        cost: totalCost,
        expenses: totalExpenses,
        purchases: totalPurchases, // For reference, not subtracted from profit
        profit: revenue - totalCost - totalExpenses // Purchases become COGS when sold
      };
    });
  }

  // Dead Stock Report
  app.get('/api/reports/dead-stock', requireRole(['administrator']), async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 200;
      const deadStock = await storage.getDeadStockProducts(days);
      res.json(deadStock);
    } catch (error) {
      console.error("Error generating dead stock report:", error);
      res.status(500).json({ message: "Failed to generate dead stock report" });
    }
  });

  // Reorder Alerts
  app.get('/api/reports/reorder-alerts', requireRole(['administrator', 'warehouse_operator']), async (req, res) => {
    try {
      const alerts = await storage.getReorderAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("Error generating reorder alerts:", error);
      res.status(500).json({ message: "Failed to generate reorder alerts" });
    }
  });

  // Color Trend Tracking
  app.get('/api/reports/color-trends', requireRole(['administrator']), async (req, res) => {
    try {
      const { categoryName, startDate, endDate } = req.query;
      const trends = await storage.getColorTrendReport(
        categoryName as string || 'Gel Polish',
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(trends);
    } catch (error) {
      console.error("Error generating color trends report:", error);
      res.status(500).json({ message: "Failed to generate color trends report" });
    }
  });

  // Reorder Alert Email Notifications (placeholder for SendGrid)
  app.post('/api/reports/reorder-alerts/notify', requireRole(['administrator']), async (req, res) => {
    try {
      // TODO: Implement SendGrid email notifications
      res.json({ message: 'Email notifications feature pending SendGrid setup' });
    } catch (error) {
      console.error("Error sending reorder alert notifications:", error);
      res.status(500).json({ message: "Failed to send reorder alert notifications" });
    }
  });

  // Geocoding endpoint for address search
  app.get('/api/geocode', isAuthenticated, async (req, res) => {
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
  app.post('/api/seed-returns', requireRole(['administrator']), async (req, res) => {
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
  app.post('/api/seed-pick-pack', requireRole(['administrator']), async (req, res) => {
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
  const { createPPLShipment, getPPLBatchStatus, getPPLLabel, searchPPLAccessPoints } = await import('./services/pplService');

  // Search PPL Access Points (ParcelShops/ParcelBoxes) for PPL SMART service
  app.get('/api/shipping/ppl/access-points', isAuthenticated, async (req, res) => {
    try {
      const { city, zipCode, country, limit, offset } = req.query;
      
      const accessPoints = await searchPPLAccessPoints({
        city: city as string,
        zipCode: zipCode as string,
        country: (country as string) || 'CZ',
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0
      });
      
      res.json(accessPoints);
    } catch (error) {
      console.error('Failed to search PPL access points:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to search access points' 
      });
    }
  });

  // Test PPL connection
  app.get('/api/shipping/test-connection', isAuthenticated, async (req, res) => {
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
  app.post('/api/shipping/create-label', isAuthenticated, async (req, res) => {
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
        if (upper === 'SLOVAKIA' || upper === 'SLOVENSKO' || upper === 'SLOVENSKÁ REPUBLIKA') return 'SK';
        if (upper === 'GERMANY' || upper === 'DEUTSCHLAND') return 'DE';
        if (upper === 'AUSTRIA' || upper === 'ÖSTERREICH') return 'AT';
        if (upper === 'POLAND' || upper === 'POLSKA') return 'PL';
        if (upper === 'HUNGARY' || upper === 'MAGYARORSZÁG') return 'HU';
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
      const recipientCountryCode = normalizeCountry(shippingAddress.country);
      // Product type: 
      // Czech domestic: BUSD (with COD), BUSS (without COD)
      // International (Slovakia, etc.): COND (with COD), CONN (without COD - PPL Parcel Connect)
      const productType = recipientCountryCode === 'CZ' 
        ? (hasCOD ? 'BUSD' : 'BUSS')
        : (hasCOD ? 'COND' : 'CONN');
      const pplShipment: any = {
        referenceId: order.orderId,
        productType,
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
  app.get('/api/shipping/ppl/batch/:batchId', isAuthenticated, async (req, res) => {
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
  app.post('/api/shipping/create-additional-label/:orderId', isAuthenticated, async (req, res) => {
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
          if (upper === 'SLOVAKIA' || upper === 'SLOVENSKO' || upper === 'SLOVENSKÁ REPUBLIKA') return 'SK';
          if (upper === 'GERMANY' || upper === 'DEUTSCHLAND') return 'DE';
          if (upper === 'AUSTRIA' || upper === 'ÖSTERREICH') return 'AT';
          if (upper === 'POLAND' || upper === 'POLSKA') return 'PL';
          if (upper === 'HUNGARY' || upper === 'MAGYARORSZÁG') return 'HU';
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

        // Product type: 
        // Czech domestic: BUSD (with COD), BUSS (without COD)
        // International (Slovakia, etc.): COND (with COD), CONN (without COD - PPL Parcel Connect)
        const recipientCountryCode = normalizeCountry(shippingAddress.country);
        const productType = recipientCountryCode === 'CZ' 
          ? (hasCOD ? 'BUSD' : 'BUSS')
          : (hasCOD ? 'COND' : 'CONN');

        const pplShipment: any = {
          referenceId,
          productType,
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

  // Rebuild COD PPL shipment (delete all labels and recreate with new carton count)
  // This is needed because PPL doesn't allow adding labels to existing COD shipments
  app.post('/api/shipping/rebuild-cod-shipment/:orderId', isAuthenticated, async (req, res) => {
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

      // Load shipping settings
      const shippingSettings = await getSettingsByCategory('shipping');
      const senderAddress = shippingSettings.pplDefaultSenderAddress;

      if (!senderAddress) {
        return res.status(400).json({ 
          error: 'No default PPL sender address configured. Please set it in Shipping Management settings.' 
        });
      }

      // Get existing cartons
      const existingCartons = await db
        .select()
        .from(orderCartons)
        .where(eq(orderCartons.orderId, orderId))
        .orderBy(orderCartons.cartonNumber);

      // Get existing labels
      const existingLabels = await storage.getShipmentLabelsByOrderId(orderId);
      const activeLabels = existingLabels.filter((l: any) => l.status === 'active');

      console.log(`🔄 Rebuilding COD shipment for order ${orderId}`);
      console.log(`📦 Existing cartons: ${existingCartons.length}`);
      console.log(`🏷️ Active labels to cancel: ${activeLabels.length}`);

      // STEP 1: Cancel all existing PPL labels
      const { cancelPPLShipment } = await import('./services/pplService');
      
      for (const label of activeLabels) {
        if (label.carrier === 'PPL' && label.trackingNumbers?.[0]) {
          try {
            await cancelPPLShipment(label.trackingNumbers[0]);
            console.log(`✅ Cancelled PPL shipment: ${label.trackingNumbers[0]}`);
          } catch (pplError) {
            console.log(`⚠️ PPL cancellation failed (may already be processed): ${label.trackingNumbers[0]}`);
          }
        }
        // Mark label as cancelled in our database
        await storage.cancelShipmentLabel(label.id, 'Rebuilding COD shipment');
      }

      // Clear order's pplLabelData
      await storage.updateOrder(orderId, {
        pplLabelData: null as any,
        pplStatus: null as any,
        pplShipmentNumbers: null as any,
        pplBatchId: null
      });

      // STEP 2: Create a new carton
      const nextCartonNumber = existingCartons.length > 0
        ? Math.max(...existingCartons.map(c => c.cartonNumber || 0)) + 1
        : 1;

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

      console.log(`📦 Created new carton #${nextCartonNumber}`);

      // STEP 3: Get all cartons (including the new one)
      const allCartons = await db
        .select()
        .from(orderCartons)
        .where(eq(orderCartons.orderId, orderId))
        .orderBy(orderCartons.cartonNumber);

      // STEP 4: Create new batch shipment with ALL cartons
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

        // Validate shipping address
        if (!shippingAddress.zipCode?.trim()) {
          await db.delete(orderCartons).where(eq(orderCartons.id, newCarton.id));
          return res.status(400).json({ error: 'Missing Postal Code for shipping address' });
        }
        if (!shippingAddress.street?.trim()) {
          await db.delete(orderCartons).where(eq(orderCartons.id, newCarton.id));
          return res.status(400).json({ error: 'Missing Street Address' });
        }
        if (!shippingAddress.city?.trim()) {
          await db.delete(orderCartons).where(eq(orderCartons.id, newCarton.id));
          return res.status(400).json({ error: 'Missing City' });
        }

        // Normalize country
        const normalizeCountry = (country: string | null | undefined): string => {
          if (!country) return 'CZ';
          const upper = country.toUpperCase();
          if (upper === 'CZECH REPUBLIC' || upper === 'CZECHIA') return 'CZ';
          if (upper === 'SLOVAKIA' || upper === 'SLOVENSKO' || upper === 'SLOVENSKÁ REPUBLIKA') return 'SK';
          if (upper === 'GERMANY' || upper === 'DEUTSCHLAND') return 'DE';
          if (upper === 'AUSTRIA' || upper === 'ÖSTERREICH') return 'AT';
          if (upper === 'POLAND' || upper === 'POLSKA') return 'PL';
          if (upper === 'HUNGARY' || upper === 'MAGYARORSZÁG') return 'HU';
          if (upper.length === 2) return upper;
          return 'CZ';
        };

        // COD amount (this is specifically for COD orders)
        const codAmount = typeof order.codAmount === 'string' 
          ? parseFloat(order.codAmount) 
          : (order.codAmount || 0);
        const codCurrency = order.codCurrency || 'CZK';

        // Build PPL shipment with all cartons
        const referenceId = `${order.orderId}-R${Date.now()}`;
        // Product type: BUSD for Czech domestic COD, COND for international COD (Slovakia, etc.)
        const recipientCountryCode = normalizeCountry(shippingAddress.country);
        // COD shipments: BUSD (Czech) or COND (International)
        const productType = recipientCountryCode === 'CZ' ? 'BUSD' : 'COND';
        const pplShipment: any = {
          referenceId,
          productType,
          sender: {
            country: senderAddress.country || 'CZ',
            zipCode: senderAddress.zipCode,
            name: senderAddress.name,
            street: senderAddress.street,
            city: senderAddress.city,
            phone: senderAddress.phone,
            email: senderAddress.email
          },
          recipient: {
            country: normalizeCountry(shippingAddress.country),
            zipCode: shippingAddress.zipCode.trim(),
            name: `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim() || customer?.name || 'Unknown',
            street: shippingAddress.street.trim(),
            city: shippingAddress.city.trim(),
            phone: shippingAddress.tel || customer?.phone || undefined,
            email: shippingAddress.email || customer?.email || undefined
          },
          cashOnDelivery: {
            value: codAmount,
            currency: codCurrency,
            variableSymbol: order.orderId
          }
        };

        // Add shipment set for multiple cartons
        if (allCartons.length > 1) {
          pplShipment.shipmentSet = {
            numberOfShipments: allCartons.length,
            shipmentSetItems: allCartons.map((carton) => ({
              shipmentNumber: `${order.orderId}-${carton.cartonNumber}`
            }))
          };
        }

        // Create shipment via PPL API
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

        // Get shipment numbers from batch status
        let shipmentNumbers: string[] = [];
        try {
          const batchStatus = await getPPLBatchStatus(batchId);
          console.log('📦 Rebuild batch status:', JSON.stringify(batchStatus, null, 2));
          if (batchStatus.items && Array.isArray(batchStatus.items)) {
            shipmentNumbers = batchStatus.items
              .filter((item: any) => item.shipmentNumber)
              .map((item: any) => item.shipmentNumber!);
          }
        } catch (statusError) {
          console.log('⚠️ Could not get batch status:', statusError);
          // Generate placeholder tracking numbers
          shipmentNumbers = allCartons.map((_, i) => `PENDING-${batchId}-${i + 1}`);
        }

        // Get label PDF
        const label = await getPPLLabel(batchId, 'pdf');
        const labelBase64 = label.labelContent;

        // Update order with new PPL info
        await db
          .update(orders)
          .set({
            pplBatchId: batchId,
            pplShipmentNumbers: shipmentNumbers,
            pplLabelData: {
              batchId,
              shipmentNumbers,
              labelBase64,
              createdAt: new Date().toISOString(),
              isRebuild: true
            },
            pplStatus: 'created',
            trackingNumber: shipmentNumbers[0] || null
          })
          .where(eq(orders.id, orderId));

        // Save shipment labels for each carton (all share same PDF)
        for (let i = 0; i < allCartons.length; i++) {
          const carton = allCartons[i];
          const trackingNumber = shipmentNumbers[i] || `PENDING-${batchId}-${i + 1}`;
          
          await storage.createShipmentLabel({
            orderId,
            carrier: 'PPL',
            trackingNumbers: [trackingNumber],
            batchId,
            labelBase64,
            labelData: {
              pplShipment,
              cartonNumber: carton.cartonNumber,
              cartonId: carton.id,
              referenceId,
              isRebuild: true
            },
            shipmentCount: 1,
            status: 'active'
          });

          // Update carton with tracking
          await storage.updateOrderCarton(carton.id, {
            labelPrinted: false,
            trackingNumber
          });
        }

        console.log(`✅ COD shipment rebuilt: ${allCartons.length} labels created`);

        res.json({
          success: true,
          cartonCount: allCartons.length,
          batchId,
          shipmentNumbers,
          trackingNumbers: shipmentNumbers,
          message: `Successfully recreated ${allCartons.length} labels for COD shipment`
        });

      } catch (labelError) {
        // If PPL label creation fails, rollback the new carton
        console.error('PPL rebuild failed, rolling back new carton:', labelError);
        await db.delete(orderCartons).where(eq(orderCartons.id, newCarton.id));
        throw labelError;
      }

    } catch (error) {
      console.error('Failed to rebuild COD shipment:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to rebuild COD shipment' 
      });
    }
  });

  // Shipment Labels Routes

  // Get all shipment labels
  app.get('/api/shipment-labels', isAuthenticated, async (req, res) => {
    try {
      const labels = await storage.getShipmentLabels();
      res.json(labels);
    } catch (error) {
      console.error('Error fetching shipment labels:', error);
      res.status(500).json({ message: 'Failed to fetch shipment labels' });
    }
  });

  // Get shipment labels by order ID (auto-migrates legacy pplLabelData if needed)
  app.get('/api/shipment-labels/order/:orderId', isAuthenticated, async (req, res) => {
    try {
      const { orderId } = req.params;
      let labels = await storage.getShipmentLabelsByOrderId(orderId);
      
      // Check if we need to migrate legacy pplLabelData
      const activeLabels = labels.filter((l: any) => l.status === 'active');
      if (activeLabels.length === 0) {
        // Check if order has pplLabelData that needs migration
        const order = await storage.getOrderById(orderId);
        if (order && order.pplLabelData && order.pplStatus === 'created') {
          console.log('📦 Auto-migrating pplLabelData to shipment_labels for order:', orderId);
          const pplData = order.pplLabelData as any;
          const cartons = await storage.getOrderCartons(orderId);
          const cartonIds = cartons.map(c => c.id);
          
          // Create the shipment_labels record
          await storage.createShipmentLabel({
            orderId,
            carrier: 'PPL',
            trackingNumbers: order.pplShipmentNumbers || [],
            batchId: order.pplBatchId || pplData.batchId,
            labelBase64: pplData.labelBase64,
            labelData: {
              referenceId: order.orderId,
              cartonNumber: 1,
              cartonIds,
              hasCOD: order.paymentMethod === 'COD' || order.paymentMethod === 'Dobírka'
            },
            shipmentCount: cartons.length || 1,
            status: 'active'
          });
          
          // Update cartons with tracking info
          for (let i = 0; i < cartons.length; i++) {
            const carton = cartons[i];
            const trackingNumber = order.pplShipmentNumbers?.[i] || order.pplShipmentNumbers?.[0];
            if (trackingNumber) {
              await storage.updateOrderCarton(carton.id, {
                labelPrinted: true,
                trackingNumber
              });
            }
          }
          
          console.log('✅ Auto-migration complete');
          // Refetch labels after migration
          labels = await storage.getShipmentLabelsByOrderId(orderId);
        }
      }
      
      res.json(labels);
    } catch (error) {
      console.error('Error fetching shipment labels by order ID:', error);
      res.status(500).json({ message: 'Failed to fetch shipment labels' });
    }
  });

  // Delete a shipment label (PPL Cancel API)
  app.delete('/api/shipment-labels/:labelId', isAuthenticated, async (req, res) => {
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

      // Also clear the order's pplLabelData and pplStatus to prevent auto-migration from recreating
      if (label.orderId) {
        await storage.updateOrder(label.orderId, {
          pplLabelData: null as any,
          pplStatus: 'cancelled',
          pplShipmentNumbers: null as any,
          pplBatchId: null
        });
        console.log(`✅ Order ${label.orderId} pplLabelData cleared to prevent auto-migration`);
      }

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
  app.get('/api/shipment-labels/:id', isAuthenticated, async (req, res) => {
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
  app.post('/api/shipment-labels', isAuthenticated, async (req, res) => {
    try {
      const label = await storage.createShipmentLabel(req.body);
      res.json(label);
    } catch (error) {
      console.error('Error creating shipment label:', error);
      res.status(500).json({ message: 'Failed to create shipment label' });
    }
  });

  // Update shipment label tracking numbers
  app.patch('/api/shipment-labels/:labelId/tracking', isAuthenticated, async (req, res) => {
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
  app.patch('/api/shipment-labels/:id', isAuthenticated, async (req, res) => {
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
  app.patch('/api/shipment-labels/:id/tracking', isAuthenticated, async (req, res) => {
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
  app.post('/api/shipment-labels/:id/cancel', isAuthenticated, async (req, res) => {
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
  app.get('/api/shipping/ppl/label/:batchId', isAuthenticated, async (req, res) => {
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
  app.post('/api/orders/:orderId/calculate-weight', isAuthenticated, async (req, res) => {
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
  app.post('/api/orders/:orderId/optimize-multi-carton', isAuthenticated, async (req, res) => {
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
  app.get('/api/cartons/available', isAuthenticated, async (req, res) => {
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
  app.get('/api/cartons/popular', isAuthenticated, async (req, res) => {
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
  app.post('/api/cartons/:cartonId/increment-usage', isAuthenticated, async (req, res) => {
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
  app.get('/api/orders/:orderId/cartons', isAuthenticated, async (req, res) => {
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
  app.post('/api/orders/:orderId/cartons', isAuthenticated, async (req, res) => {
    try {
      const { orderId } = req.params;
      const cartonData = insertOrderCartonSchema.parse({
        ...req.body,
        orderId
      });

      // SERVER-SIDE DUPLICATE PREVENTION: Check if a carton with the same cartonNumber already exists
      const existingCartons = await storage.getOrderCartons(orderId);
      const duplicateCarton = existingCartons.find(c => c.cartonNumber === cartonData.cartonNumber);
      
      if (duplicateCarton) {
        console.log(`⚠️ Duplicate carton prevented: Order ${orderId} already has carton #${cartonData.cartonNumber}`);
        // Return the existing carton instead of creating a duplicate
        return res.json(duplicateCarton);
      }

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
  app.patch('/api/orders/:orderId/cartons/:cartonId', isAuthenticated, async (req, res) => {
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
  app.delete('/api/orders/:orderId/cartons/:cartonId', isAuthenticated, async (req, res) => {
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
  app.post('/api/orders/:orderId/cartons/:cartonId/generate-label', isAuthenticated, async (req, res) => {
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

  // Create PPL label for a single carton (used by PickPack Generate button)
  app.post('/api/shipping/create-label-for-carton', isAuthenticated, async (req, res) => {
    try {
      const { orderId, cartonId, cartonNumber } = req.body;
      
      if (!orderId || !cartonId) {
        return res.status(400).json({ error: 'orderId and cartonId are required' });
      }

      // Redirect to the existing PPL label creation endpoint
      // This creates labels for all cartons in the order
      const { createPPLShipment, getPPLBatchStatus, getPPLLabel } = await import('./services/pplService');

      // Get order details
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Check if order already has PPL labels - but also check if shipment_labels record exists
      if (order.pplLabelData && order.pplStatus === 'created') {
        // Check if shipment_labels record exists
        const existingLabels = await storage.getShipmentLabelsByOrderId(orderId);
        const activeLabels = existingLabels.filter((l: any) => l.status === 'active');
        
        if (activeLabels.length > 0) {
          // Labels already exist in shipment_labels table
          return res.json({
            success: true,
            message: 'Labels already exist for this order',
            batchId: order.pplBatchId,
            trackingNumbers: order.pplShipmentNumbers,
            trackingNumber: order.pplShipmentNumbers?.[0]
          });
        }
        
        // Order has pplLabelData but no shipment_labels record - create one now
        console.log('📦 Order has pplLabelData but no shipment_labels - creating record...');
        const pplData = order.pplLabelData as any;
        const cartons = await storage.getOrderCartons(orderId);
        const cartonIds = cartons.map(c => c.id);
        
        await storage.createShipmentLabel({
          orderId,
          carrier: 'PPL',
          trackingNumbers: order.pplShipmentNumbers || [],
          batchId: order.pplBatchId || pplData.batchId,
          labelBase64: pplData.labelBase64,
          labelData: {
            referenceId: order.orderId,
            cartonNumber: 1,
            cartonIds,
            hasCOD: order.paymentMethod === 'COD' || order.paymentMethod === 'Dobírka'
          },
          shipmentCount: cartons.length || 1,
          status: 'active'
        });
        
        // Update cartons with tracking info
        for (let i = 0; i < cartons.length; i++) {
          const carton = cartons[i];
          const trackingNumber = order.pplShipmentNumbers?.[i] || order.pplShipmentNumbers?.[0];
          if (trackingNumber) {
            await storage.updateOrderCarton(carton.id, {
              labelPrinted: true,
              trackingNumber
            });
          }
        }
        
        console.log('✅ Created missing shipment_labels record');
        return res.json({
          success: true,
          message: 'Labels migrated to shipment_labels table',
          batchId: order.pplBatchId,
          trackingNumbers: order.pplShipmentNumbers,
          trackingNumber: order.pplShipmentNumbers?.[0]
        });
      }

      // Load shipping settings
      const shippingSettings = await getSettingsByCategory('shipping');
      const senderAddress = shippingSettings.pplDefaultSenderAddress;

      if (!senderAddress) {
        return res.status(400).json({ 
          error: 'No default PPL sender address configured. Please set it in Shipping Management settings.' 
        });
      }

      // Get cartons for the order
      const cartons = await storage.getOrderCartons(orderId);
      if (cartons.length === 0) {
        return res.status(400).json({ error: 'No cartons found for this order' });
      }

      // Get order shipping address
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

      // Build recipient info
      const recipientName = shippingAddress.company || 
        `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim() ||
        customer?.name || 'Customer';
      const contactName = `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim() || 
        customer?.name || recipientName;

      // Country code mapping
      const getCountryCode = (country: string): string => {
        const countryUpper = country.toUpperCase();
        if (countryUpper === 'CZECH REPUBLIC' || countryUpper === 'CZECHIA' || countryUpper === 'CZ') return 'CZ';
        if (countryUpper === 'SLOVAKIA' || countryUpper === 'SK') return 'SK';
        if (countryUpper === 'GERMANY' || countryUpper === 'DE') return 'DE';
        if (countryUpper === 'AUSTRIA' || countryUpper === 'AT') return 'AT';
        if (countryUpper === 'POLAND' || countryUpper === 'PL') return 'PL';
        if (countryUpper === 'HUNGARY' || countryUpper === 'HU') return 'HU';
        return country.slice(0, 2).toUpperCase();
      };

      // Determine if COD
      const hasCOD = order.paymentMethod === 'COD' || order.paymentMethod === 'cod' || 
                     order.paymentMethod === 'Cash on Delivery' || order.paymentMethod === 'Dobírka';
      const codAmount = hasCOD ? (parseFloat(String(order.codAmount || order.totalAmount || 0))) : 0;

      // Build PPL shipment
      const pplShipment = {
        referenceId: order.orderId,
        productType: hasCOD ? 'PPL_PARCEL_CZ_BUSINESS_COD' : 'PPL_PARCEL_CZ_PRIVATE',
        sender: {
          name: senderAddress.name,
          street: senderAddress.street,
          city: senderAddress.city,
          zipCode: senderAddress.zipCode,
          country: getCountryCode(senderAddress.country),
          email: senderAddress.email || '',
          phone: senderAddress.phone || ''
        },
        recipient: {
          name: recipientName,
          street: shippingAddress.streetNumber 
            ? `${shippingAddress.street} ${shippingAddress.streetNumber}`
            : shippingAddress.street,
          city: shippingAddress.city,
          zipCode: shippingAddress.zipCode,
          country: getCountryCode(shippingAddress.country),
          email: shippingAddress.email || customer?.email || '',
          phone: shippingAddress.tel || customer?.phone || '',
          contact: contactName
        },
        packages: cartons.map((c, i) => ({
          packageNumber: i + 1,
          weight: parseFloat(String(c.weight || 1)),
          note: `${order.orderId} - Carton ${i + 1}`
        })),
        codAmount: hasCOD ? codAmount : undefined,
        codCurrency: hasCOD ? 'CZK' : undefined,
        codReference: hasCOD ? order.orderId : undefined
      };

      // Create PPL shipment
      console.log('📦 Creating PPL shipment for single carton order...');
      const batchResult = await createPPLShipment(pplShipment);
      const batchId = batchResult.batchId;
      let shipmentNumbers = batchResult.shipmentNumbers || [];

      // Get label PDF
      let label;
      try {
        console.log('📄 Retrieving PPL label...');
        label = await getPPLLabel(batchId, 'pdf');
      } catch (labelError: any) {
        console.error('❌ Failed to retrieve PPL label:', labelError.message);
        // Save batchId to order so retry button appears
        await storage.updateOrder(orderId, {
          pplBatchId: batchId,
          pplStatus: 'pending'
        });
        return res.status(500).json({ 
          error: 'PPL shipment created but label retrieval failed. Use the Retry button to download the label.',
          batchId,
          canRetry: true
        });
      }

      // PPL API is asynchronous - poll batch status to get tracking numbers
      if (shipmentNumbers.length === 0) {
        console.log('📡 Polling PPL batch status for tracking numbers...');
        // Retry a few times with delay - PPL may need time to process
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 1s, 2s, 3s delays
            const batchStatus = await getPPLBatchStatus(batchId);
            console.log(`📡 Batch status attempt ${attempt}:`, JSON.stringify(batchStatus, null, 2));
            
            if (batchStatus.items && batchStatus.items.length > 0) {
              shipmentNumbers = batchStatus.items
                .filter(item => item.shipmentNumber)
                .map(item => item.shipmentNumber!);
              
              if (shipmentNumbers.length > 0) {
                console.log('✅ Extracted shipment numbers from batch status:', shipmentNumbers);
                break;
              }
            }
          } catch (pollError) {
            console.warn(`⚠️ Batch status polling attempt ${attempt} failed:`, pollError);
          }
        }
      }

      // Use placeholder tracking numbers if still not provided after polling
      if (shipmentNumbers.length === 0 && cartons.length > 0) {
        console.warn('⚠️ Could not retrieve tracking numbers from PPL API - using placeholders');
        shipmentNumbers = cartons.map((_, index) => `PENDING-${batchId.slice(0, 8)}-${index + 1}`);
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

      // Save to shipment_labels table - include cartonNumber for UI matching
      const cartonIds = cartons.map(c => c.id);
      await storage.createShipmentLabel({
        orderId,
        carrier: 'PPL',
        trackingNumbers: shipmentNumbers,
        batchId,
        labelBase64: label.labelContent,
        labelData: {
          pplShipment,
          referenceId: order.orderId,
          hasCOD,
          cartonNumber: 1, // For single carton, always 1
          cartonIds
        },
        shipmentCount: shipmentNumbers.length,
        status: 'active'
      });

      // Update cartons with tracking info so UI can detect label exists
      for (let i = 0; i < cartons.length; i++) {
        const carton = cartons[i];
        const trackingNumber = shipmentNumbers[i] || shipmentNumbers[0];
        await storage.updateOrderCarton(carton.id, {
          labelPrinted: true,
          trackingNumber
        });
      }

      console.log('✅ PPL label created successfully, cartons updated');
      res.json({
        success: true,
        batchId,
        shipmentNumbers,
        trackingNumber: shipmentNumbers[0],
        labelPdf: label.labelContent
      });
    } catch (error) {
      console.error('Failed to create PPL label for carton:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to create PPL label' 
      });
    }
  });

  // Create PPL shipping labels for an order
  app.post('/api/orders/:orderId/ppl/create-labels', isAuthenticated, async (req, res) => {
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
      // Czech domestic: BUSD (with COD), BUSS (without COD)
      // International (Slovakia, etc.): COND (with COD), CONN (without COD - PPL Parcel Connect)
      const recipientCountryCode = getCountryCode(shippingAddress.country || 'CZ');
      let productType: string;

      // Check if this is a PPL SMART shipment (pickup location)
      const isSmartShipment = order.shippingMethod === 'PPL CZ SMART' || order.pickupLocationCode;
      
      if (isSmartShipment) {
        // PPL SMART - delivery to ParcelShop/ParcelBox pickup location
        // SMAR product type is for SMART service with pickup location
        productType = 'SMAR';
      } else if (recipientCountryCode === 'CZ') {
        // Czech domestic shipment
        productType = hasCOD ? 'BUSD' : 'BUSS';
      } else {
        // International shipment (Slovakia, etc.)
        productType = hasCOD ? 'COND' : 'CONN';
      }

      // Prepare recipient info (customer receiving the package)
      const recipientName = shippingAddress.company?.trim() || 
                           `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim() || 
                           customer?.name || 
                           'Unknown';

      const contactName = shippingAddress.company?.trim() 
        ? `${shippingAddress.firstName || ''} ${shippingAddress.lastName || ''}`.trim() 
        : undefined;

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
        
        // Add parcelShopCode for PPL SMART shipments
        if (isSmartShipment && order.pickupLocationCode) {
          shipment.parcelShopCode = order.pickupLocationCode;
          console.log(`🏪 PPL SMART: Using pickup location ${order.pickupLocationCode}`);
        }

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
        
        // Add parcelShopCode for PPL SMART shipments
        if (isSmartShipment && order.pickupLocationCode) {
          singleShipment.parcelShopCode = order.pickupLocationCode;
          console.log(`🏪 PPL SMART: Using pickup location ${order.pickupLocationCode}`);
        }

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
        // Save batchId to order so retry button appears
        await storage.updateOrder(orderId, {
          pplBatchId: batchId,
          pplStatus: 'pending'
        });
        return res.status(500).json({ 
          error: 'PPL shipment created but label retrieval failed. Use the Retry button to download the label.',
          batchId,
          canRetry: true,
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
      const cartonIds = cartons.map(c => c.id);
      const savedLabel = await storage.createShipmentLabel({
        orderId,
        carrier: 'PPL',
        trackingNumbers: shipmentNumbers,
        batchId,
        labelBase64: label.labelContent,
        labelData: {
          shipments, // The array of shipments built above
          referenceId: order.orderId,
          cartonNumber: 1, // For matching in UI
          cartonIds,
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
  app.get('/api/shipping/ppl/batch/:batchId', isAuthenticated, async (req, res) => {
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

  // Retry PPL label download (when initial label retrieval failed but batch was created)
  app.post('/api/orders/:orderId/ppl/retry-label', isAuthenticated, async (req, res) => {
    try {
      const { orderId } = req.params;
      const { getPPLLabel, getPPLBatchStatus } = await import('./services/pplService');

      // Get order details
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Check if we have a batchId to retry with
      const batchId = order.pplBatchId;
      if (!batchId) {
        return res.status(400).json({ 
          error: 'No PPL batch ID found. Please create a new label instead.' 
        });
      }

      // Check if label already exists (avoid duplicates)
      if (order.pplLabelData) {
        return res.status(400).json({ 
          error: 'Label already exists for this order. No retry needed.',
          batchId
        });
      }

      // Also check shipment_labels table for existing labels with this batchId
      const existingLabels = await storage.getShipmentLabelsByOrderId(orderId);
      const existingLabelForBatch = existingLabels.find(l => l.batchId === batchId);
      if (existingLabelForBatch) {
        return res.status(400).json({ 
          error: 'Label already exists for this batch. Refreshing order data.',
          batchId
        });
      }

      console.log(`🔄 Retrying PPL label download for batch ${batchId}...`);

      // Get cartons for this order
      const cartons = await storage.getOrderCartons(orderId);

      // Try to get tracking numbers from batch status first
      let shipmentNumbers: string[] = [];
      try {
        const batchStatus = await getPPLBatchStatus(batchId);
        console.log('📦 Batch status:', JSON.stringify(batchStatus, null, 2));
        if (batchStatus.items && Array.isArray(batchStatus.items)) {
          shipmentNumbers = batchStatus.items
            .filter((item: any) => item.shipmentNumber)
            .map((item: any) => item.shipmentNumber);
          console.log('✅ Extracted shipment numbers:', shipmentNumbers);
        }
      } catch (statusError) {
        console.log('⚠️ Batch status check failed:', statusError);
      }

      // Try to get the label
      let label;
      try {
        console.log('📄 Retrieving PPL label...');
        label = await getPPLLabel(batchId, 'pdf');
        console.log(`✅ Label retrieved (${label.labelContent?.length} bytes)`);
      } catch (labelError: any) {
        console.error('❌ Failed to retrieve PPL label:', labelError.message);
        return res.status(500).json({ 
          error: 'Label retrieval still failing. The batch may need more time to process. Please try again in a few minutes.',
          batchId,
          labelError: labelError.message
        });
      }

      // Use placeholder tracking if we couldn't get them
      if (shipmentNumbers.length === 0 && cartons.length > 0) {
        shipmentNumbers = cartons.map((_, index) => `PENDING-${batchId.slice(0, 8)}-${index + 1}`);
        console.log('⚠️ Using placeholder tracking numbers');
      }

      // Determine if COD
      const hasCOD = order.paymentMethod === 'COD' || order.paymentMethod === 'cod' || 
                     order.paymentMethod === 'Cash on Delivery' || order.paymentMethod === 'Dobírka';

      // Update order with PPL data
      await storage.updateOrder(orderId, {
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

      // Save to shipment_labels table
      const cartonIds = cartons.map(c => c.id);
      await storage.createShipmentLabel({
        orderId,
        carrier: 'PPL',
        trackingNumbers: shipmentNumbers,
        batchId,
        labelBase64: label.labelContent,
        labelData: {
          referenceId: order.orderId,
          cartonNumber: 1,
          cartonIds,
          hasCOD
        },
        shipmentCount: shipmentNumbers.length,
        status: 'active'
      });

      // Update cartons with tracking info
      for (let i = 0; i < cartons.length; i++) {
        const carton = cartons[i];
        const trackingNumber = shipmentNumbers[i] || shipmentNumbers[0];
        await storage.updateOrderCarton(carton.id, {
          labelPrinted: true,
          trackingNumber
        });
      }

      console.log('✅ PPL label retry successful');
      res.json({
        success: true,
        batchId,
        shipmentNumbers,
        trackingNumber: shipmentNumbers[0],
        labelPdf: label.labelContent
      });
    } catch (error) {
      console.error('Failed to retry PPL label:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to retry PPL label download' 
      });
    }
  });

  // Get packing materials for an order
  // Get all files and documents for an order
  app.get('/api/orders/:orderId/files', isAuthenticated, async (req, res) => {
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

  app.get('/api/orders/:orderId/packing-materials', isAuthenticated, async (req, res) => {
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
  app.get('/api/orders/:orderId/packing-list.pdf', isAuthenticated, async (req, res) => {
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

      // Create a new PDF document - STRICT SINGLE PAGE layout
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 25,
        bufferPages: false // No multi-page
      });

      // Register Unicode-compatible fonts (DejaVu Sans supports all European languages)
      const fontPath = '/usr/share/fonts/truetype/dejavu';
      doc.registerFont('DejaVu', `${fontPath}/DejaVuSans.ttf`);
      doc.registerFont('DejaVu-Bold', `${fontPath}/DejaVuSans-Bold.ttf`);

      // Page dimensions for A4
      const pageWidth = 595;
      const pageHeight = 842;
      const marginLeft = 25;
      const marginRight = 25;
      const contentWidth = pageWidth - marginLeft - marginRight;

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="packing-list-${order.orderId}.pdf"`);

      // Pipe the PDF directly to the response
      doc.pipe(res);

      // Calculate dynamic sizing based on number of items
      const itemCount = itemsWithProducts.length;
      const maxItemsForNormalSize = 15;
      const maxItemsForPage = 35;
      
      // Dynamic row height: shrink rows if many items
      let rowHeight = 22;
      let fontSize = 9;
      let checkboxSize = 11;
      if (itemCount > maxItemsForNormalSize) {
        rowHeight = Math.max(14, Math.floor(380 / Math.min(itemCount, maxItemsForPage)));
        fontSize = rowHeight > 16 ? 9 : 7;
        checkboxSize = rowHeight > 16 ? 11 : 8;
      }

      // ===== COMPACT HEADER =====
      const logoPath = path.join(process.cwd(), 'attached_assets', 'logo_1754349267160.png');
      try {
        doc.image(logoPath, marginLeft, 20, { width: 55 });
      } catch (error) {
        console.error('Logo not found, skipping:', error);
      }

      // Company info - compact (using DejaVu for Unicode support)
      doc.fontSize(14)
         .fillColor('#000000')
         .font('DejaVu-Bold')
         .text('Davie Lam s.r.o.', 88, 22)
         .fontSize(8)
         .font('DejaVu')
         .fillColor('#666666')
         .text('IČO: CZ17587816', 88, 38);

      // Title - right aligned, compact
      doc.fontSize(22)
         .fillColor('#000000')
         .font('DejaVu-Bold')
         .text('PACKING LIST', pageWidth - marginRight - 180, 22, { width: 180, align: 'right' });

      // Order info - separate lines to avoid strikethrough issue
      doc.fontSize(8)
         .font('DejaVu')
         .fillColor('#555555')
         .text('Order:', pageWidth - marginRight - 180, 48, { width: 180, align: 'right' });
      doc.fontSize(9)
         .font('DejaVu-Bold')
         .fillColor('#000000')
         .text(order.orderId, pageWidth - marginRight - 180, 58, { width: 180, align: 'right' });

      // ===== ORDER INFO + ADDRESS - Side by side =====
      const infoY = 75;
      
      // Left side: Order details (compact)
      doc.fontSize(8)
         .fillColor('#666666')
         .font('DejaVu')
         .text('Date:', marginLeft, infoY)
         .font('DejaVu-Bold')
         .fillColor('#000000')
         .text(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), marginLeft + 30, infoY);

      if (order.shippingMethod) {
        doc.fontSize(8)
           .fillColor('#666666')
           .font('DejaVu')
           .text('Ship via:', marginLeft, infoY + 12)
           .font('DejaVu-Bold')
           .fillColor('#000000')
           .text(order.shippingMethod, marginLeft + 45, infoY + 12);
      }

      // Right side: Shipping address box (compact)
      const addressBoxX = pageWidth / 2 - 20;
      const addressBoxWidth = contentWidth / 2 + 20;
      const addressBoxHeight = 70;
      
      doc.rect(addressBoxX, infoY - 3, addressBoxWidth, addressBoxHeight)
         .lineWidth(1)
         .stroke('#333333');

      // "SHIP TO" label
      doc.rect(addressBoxX, infoY - 3, addressBoxWidth, 14)
         .fillAndStroke('#1a1a1a', '#1a1a1a');
      doc.fontSize(8)
         .fillColor('#FFFFFF')
         .font('DejaVu-Bold')
         .text('SHIP TO', addressBoxX + 8, infoY);

      // Address text (compact) - DejaVu for European characters
      doc.fontSize(8)
         .font('DejaVu')
         .fillColor('#000000')
         .text(formattedAddress, addressBoxX + 8, infoY + 14, { 
           width: addressBoxWidth - 16,
           lineGap: 0,
           height: addressBoxHeight - 20
         });

      // ===== ITEMS TABLE - Dynamic sizing =====
      const tableTop = infoY + addressBoxHeight + 8;
      const tableHeaderHeight = 18;
      
      // Column widths (optimized)
      const colCheck = 22;
      const colNum = 18;
      const colSku = 85;
      const colDesc = contentWidth - colCheck - colNum - colSku - 45 - 35;
      const colWeight = 45;
      const colQty = 35;

      // Table header
      doc.rect(marginLeft, tableTop, contentWidth, tableHeaderHeight)
         .fillAndStroke('#1a1a1a', '#1a1a1a');

      let hX = marginLeft + 3;
      doc.fontSize(7)
         .font('DejaVu-Bold')
         .fillColor('#FFFFFF')
         .text('✓', hX, tableTop + 5, { width: colCheck, align: 'center' });
      hX += colCheck;
      doc.text('#', hX, tableTop + 5, { width: colNum, align: 'center' });
      hX += colNum;
      doc.text('SKU', hX, tableTop + 5, { width: colSku });
      hX += colSku;
      doc.text('DESCRIPTION', hX, tableTop + 5, { width: colDesc });
      hX += colDesc;
      doc.text('WT', hX, tableTop + 5, { width: colWeight - 5, align: 'right' });
      hX += colWeight;
      doc.text('QTY', hX, tableTop + 5, { width: colQty - 8, align: 'right' });

      // Table rows
      let yPosition = tableTop + tableHeaderHeight;

      itemsWithProducts.forEach((item, index) => {
        // Alternating colors
        const bgColor = index % 2 === 0 ? '#FFFFFF' : '#F5F5F5';
        doc.rect(marginLeft, yPosition, contentWidth, rowHeight)
           .lineWidth(0.3)
           .fillAndStroke(bgColor, '#DDDDDD');

        const textY = yPosition + (rowHeight - fontSize) / 2;
        let cellX = marginLeft + 3;

        // Checkbox
        const cbSize = checkboxSize;
        const cbY = yPosition + (rowHeight - cbSize) / 2;
        doc.rect(cellX + (colCheck - cbSize) / 2, cbY, cbSize, cbSize)
           .lineWidth(0.8)
           .stroke('#333333');
        cellX += colCheck;

        // Row number
        doc.fontSize(fontSize)
           .fillColor('#333333')
           .font('DejaVu')
           .text(`${index + 1}`, cellX, textY, { width: colNum, align: 'center' });
        cellX += colNum;

        // SKU
        doc.fontSize(fontSize - 1)
           .fillColor('#000000')
           .text(item.sku || '-', cellX, textY, { width: colSku - 3, ellipsis: true });
        cellX += colSku;

        // Product name (DejaVu for Vietnamese/European characters)
        doc.fontSize(fontSize)
           .text(item.productName, cellX, textY, { width: colDesc - 3, ellipsis: true });
        cellX += colDesc;

        // Weight - with padding from edge
        const wt = item.weight ? `${item.weight}` : '-';
        doc.fontSize(fontSize - 1)
           .text(wt, cellX, textY, { width: colWeight - 5, align: 'right' });
        cellX += colWeight;

        // Quantity - bold with proper right padding
        doc.fontSize(fontSize + 1)
           .font('DejaVu-Bold')
           .text(item.quantity.toString(), cellX, textY, { width: colQty - 8, align: 'right' });

        yPosition += rowHeight;
      });

      // Table bottom border
      doc.strokeColor('#333333')
         .lineWidth(1)
         .moveTo(marginLeft, yPosition)
         .lineTo(pageWidth - marginRight, yPosition)
         .stroke();

      // ===== SUMMARY - Compact inline =====
      yPosition += 10;
      
      const totalItems = itemsWithProducts.reduce((sum, item) => sum + item.quantity, 0);
      const totalWeight = itemsWithProducts.reduce((sum, item) => {
        const weight = item.weight || 0;
        return sum + (weight * item.quantity);
      }, 0);

      // Summary in single line with boxes
      const summaryBoxWidth = 90;
      const summaryBoxHeight = 32;
      const summarySpacing = 10;
      const summaryStartX = pageWidth - marginRight - (summaryBoxWidth * 3 + summarySpacing * 2);

      // Cartons box
      doc.rect(summaryStartX, yPosition, summaryBoxWidth, summaryBoxHeight)
         .lineWidth(0.8)
         .stroke('#333333');
      doc.fontSize(7)
         .font('DejaVu')
         .fillColor('#666666')
         .text('CARTONS', summaryStartX + 5, yPosition + 5)
         .fontSize(12)
         .font('DejaVu-Bold')
         .fillColor('#000000')
         .text(cartonCount.toString(), summaryStartX + 5, yPosition + 15, { width: summaryBoxWidth - 10, align: 'right' });

      // Items box
      const itemsBoxX = summaryStartX + summaryBoxWidth + summarySpacing;
      doc.rect(itemsBoxX, yPosition, summaryBoxWidth, summaryBoxHeight)
         .lineWidth(0.8)
         .stroke('#333333');
      doc.fontSize(7)
         .font('DejaVu')
         .fillColor('#666666')
         .text('ITEMS', itemsBoxX + 5, yPosition + 5)
         .fontSize(12)
         .font('DejaVu-Bold')
         .fillColor('#000000')
         .text(totalItems.toString(), itemsBoxX + 5, yPosition + 15, { width: summaryBoxWidth - 10, align: 'right' });

      // Weight box
      const weightBoxX = itemsBoxX + summaryBoxWidth + summarySpacing;
      doc.rect(weightBoxX, yPosition, summaryBoxWidth, summaryBoxHeight)
         .lineWidth(0.8)
         .stroke('#333333');
      doc.fontSize(7)
         .font('DejaVu')
         .fillColor('#666666')
         .text('WEIGHT', weightBoxX + 5, yPosition + 5)
         .fontSize(12)
         .font('DejaVu-Bold')
         .fillColor('#000000')
         .text(`${totalWeight.toFixed(1)} kg`, weightBoxX + 5, yPosition + 15, { width: summaryBoxWidth - 10, align: 'right' });

      // ===== SIGNATURE LINE - Bottom of page =====
      const signatureY = 780;
      doc.fontSize(7)
         .font('DejaVu')
         .fillColor('#666666')
         .text('Packed by: ________________________', marginLeft, signatureY)
         .text('Date: ______________', marginLeft + 180, signatureY)
         .text('Checked: ________________________', pageWidth / 2 + 30, signatureY)
         .text('Date: ______________', pageWidth - marginRight - 80, signatureY);

      // Footer
      doc.fontSize(6)
         .fillColor('#999999')
         .font('DejaVu')
         .text('Please verify all items upon receipt.', marginLeft, 800, { align: 'center', width: contentWidth });

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
  app.get('/api/orders/:orderId/recommend-carton', isAuthenticated, async (req, res) => {
    try {
      const { orderId } = req.params;
      const { carrierCode, shippingCountry } = req.query;

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

      const packingPlan = await optimizeCartonPacking(orderItemsWithProducts, packingCartons, {
        carrierCode: carrierCode as string | undefined,
        shippingCountry: (shippingCountry as string) || order.country || undefined
      });

      res.json({
        suggestions: packingPlan.cartons,
        cartonCount: packingPlan.totalCartons,
        nylonWrapItems: packingPlan.nylonWrapItems,
        reasoning: packingPlan.reasoning,
        totalWeightKg: packingPlan.totalWeightKg,
        avgUtilization: packingPlan.avgUtilization,
        optimizationSuggestions: packingPlan.suggestions,
        carrierCode: packingPlan.carrierCode,
        carrierConstraints: packingPlan.carrierConstraints,
        estimatedShippingCost: packingPlan.estimatedShippingCost,
        shippingCurrency: packingPlan.shippingCurrency
      });
    } catch (error) {
      console.error('Error recommending carton:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to recommend carton' 
      });
    }
  });

  // Apply AI-recommended cartons to order
  app.post('/api/orders/:orderId/apply-ai-cartons', isAuthenticated, async (req, res) => {
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
  app.post('/api/orders/:orderId/recalculate-carton-plan', isAuthenticated, async (req, res) => {
    try {
      const { orderId } = req.params;
      const { selectedCartonTypes, carrierCode, shippingCountry } = req.body;

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

      const packingPlan = await optimizeCartonPacking(orderItemsWithProducts, selectedCartons, {
        carrierCode,
        shippingCountry: shippingCountry || order.country || undefined
      });

      res.json({
        suggestions: packingPlan.cartons,
        cartonCount: packingPlan.totalCartons,
        nylonWrapItems: packingPlan.nylonWrapItems,
        reasoning: packingPlan.reasoning,
        totalWeightKg: packingPlan.totalWeightKg,
        avgUtilization: packingPlan.avgUtilization,
        optimizationSuggestions: packingPlan.suggestions,
        carrierCode: packingPlan.carrierCode,
        carrierConstraints: packingPlan.carrierConstraints,
        estimatedShippingCost: packingPlan.estimatedShippingCost,
        shippingCurrency: packingPlan.shippingCurrency
      });
    } catch (error) {
      console.error('Error recalculating carton plan:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to recalculate carton plan' 
      });
    }
  });

  // Real-time weight calculation as items are picked
  app.post('/api/orders/:orderId/realtime-weight', isAuthenticated, async (req, res) => {
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
  app.get('/api/product-files', isAuthenticated, async (req, res) => {
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
  app.get('/api/orders/:orderId/packing-files', isAuthenticated, async (req, res) => {
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

  app.post('/api/product-files', isAuthenticated, async (req, res) => {
    try {
      const file = await storage.createProductFile(req.body);
      res.json(file);
    } catch (error) {
      console.error('Error creating product file:', error);
      res.status(500).json({ message: 'Failed to create product file' });
    }
  });

  // Mark documents as included in packing
  app.post('/api/orders/:orderId/packing-documents', isAuthenticated, async (req, res) => {
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
  app.post('/api/orders/:orderId/complete-packing', isAuthenticated, async (req, res) => {
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
  app.get('/api/packing-cartons', isAuthenticated, async (req, res) => {
    try {
      const cartons = await storage.getPackingCartons();
      res.json(cartons);
    } catch (error) {
      console.error('Error fetching packing cartons:', error);
      res.status(500).json({ message: 'Failed to fetch packing cartons' });
    }
  });

  // Optimize packing without saving (on-the-fly optimization)
  app.post('/api/packing/optimize', isAuthenticated, async (req, res) => {
    try {
      const { items, shippingCountry, carrierCode, preferBulkWrapping } = req.body;

      if (!items || items.length === 0) {
        return res.status(400).json({ message: 'No items provided for optimization' });
      }

      // Enrich items with product information and expand bundles/bulk units
      const expandedItems: any[] = [];
      
      for (const item of items) {
        // Skip pure service items (serviceId without productId - they have no physical weight/dimensions)
        // But include service parts (items with both serviceId AND productId - these are physical products)
        if (item.serviceId && !item.productId) {
          console.log(`Skipping pure service item "${item.productName}" - no physical packing needed`);
          continue;
        }
        
        // Check if this is a bundle (has bundleId field)
        if (item.bundleId) {
          const bundle = await storage.getBundleById(item.bundleId);
          if (bundle) {
            // It's a bundle - expand into individual items
            const bundleItems = await storage.getBundleItems(item.bundleId);
            console.log(`Expanding bundle "${bundle.name}" with ${bundleItems.length} items for packing calculation`);
            
            for (const bundleItem of bundleItems) {
              if (bundleItem.productId) {
                const product = await storage.getProductById(bundleItem.productId);
                if (product) {
                  expandedItems.push({
                    productId: bundleItem.productId,
                    productName: bundleItem.productName || product.name,
                    sku: product.sku,
                    quantity: (bundleItem.quantity || 1) * item.quantity, // Multiply by order quantity
                    price: 0, // Bundle items have combined price
                    product,
                    fromBundle: bundle.name,
                    appliedDiscountLabel: item.appliedDiscountLabel,
                    discountPercentage: item.discountPercentage,
                  });
                }
              }
            }
          } else {
            console.log(`Bundle ${item.bundleId} not found, skipping`);
          }
          continue;
        }
        
        // Regular product with productId (including service parts)
        if (item.productId) {
          const product = await storage.getProductById(item.productId);
          const isServicePart = item.isServicePart || (item.serviceId && item.productId);
          
          if (isServicePart) {
            console.log(`Including service part "${item.productName}" in packing calculation`);
          }
          
          if (item.bulkUnitQty && item.bulkUnitQty > 1) {
            // Bulk unit item - calculate as multiple individual items
            console.log(`Bulk unit item "${item.productName}" with ${item.bulkUnitQty} units per pack`);
            expandedItems.push({
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              quantity: item.quantity * item.bulkUnitQty, // Total individual units
              price: item.price,
              product,
              isBulkExpanded: true,
              bulkUnitQty: item.bulkUnitQty,
              isServicePart,
              discount: item.discount,
              discountPercentage: item.discountPercentage,
              appliedDiscountId: item.appliedDiscountId,
              appliedDiscountLabel: item.appliedDiscountLabel,
              appliedDiscountType: item.appliedDiscountType,
              freeItemsCount: item.freeItemsCount,
              buyXGetYBuyQty: item.buyXGetYBuyQty,
              buyXGetYGetQty: item.buyXGetYGetQty
            });
          } else {
            // Regular item (or service part)
            expandedItems.push({
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              quantity: item.quantity,
              price: item.price,
              product,
              isServicePart,
              discount: item.discount,
              discountPercentage: item.discountPercentage,
              appliedDiscountId: item.appliedDiscountId,
              appliedDiscountLabel: item.appliedDiscountLabel,
              appliedDiscountType: item.appliedDiscountType,
              freeItemsCount: item.freeItemsCount,
              buyXGetYBuyQty: item.buyXGetYBuyQty,
              buyXGetYGetQty: item.buyXGetYGetQty
            });
          }
        } else {
          console.log(`Item "${item.productName}" has no productId or bundleId, skipping`);
        }
      }
      
      const enrichedItems = expandedItems;

      // Fetch all packing cartons - first try dedicated table, then fall back to packing materials
      let cartons = await storage.getPackingCartons();
      
      // If no cartons in dedicated table, check packing materials with category 'cartons'
      if (!cartons || cartons.length === 0) {
        const packingMaterials = await storage.getPackingMaterials();
        const cartonMaterials = packingMaterials.filter(m => 
          m.category === 'cartons' && m.isActive && m.dimensions
        );
        
        if (cartonMaterials.length > 0) {
          // Convert packing materials to carton format
          cartons = cartonMaterials.map(m => {
            // Parse dimensions like "30×20×15 cm" or "30x20x15cm"
            const dimMatch = m.dimensions?.match(/(\d+(?:\.\d+)?)\s*[×xX]\s*(\d+(?:\.\d+)?)\s*[×xX]\s*(\d+(?:\.\d+)?)\s*(cm|mm|in)?/i);
            let length = 30, width = 20, height = 15; // defaults
            let unit = 'cm';
            
            if (dimMatch) {
              length = parseFloat(dimMatch[1]);
              width = parseFloat(dimMatch[2]);
              height = parseFloat(dimMatch[3]);
              unit = (dimMatch[4] || 'cm').toLowerCase();
              
              // Convert to cm if needed
              if (unit === 'mm') {
                length /= 10; width /= 10; height /= 10;
              } else if (unit === 'in') {
                length *= 2.54; width *= 2.54; height *= 2.54;
              }
            }
            
            return {
              id: m.id,
              name: m.name,
              innerLengthCm: length.toString(),
              innerWidthCm: width.toString(),
              innerHeightCm: height.toString(),
              maxWeightKg: '30', // default max weight
              tareWeightKg: '0.5', // default tare weight
              cost: m.cost || '0',
              currency: m.currency || 'EUR',
              isActive: m.isActive ?? true,
              usageCount: 0,
              createdAt: m.createdAt,
              updatedAt: m.updatedAt
            };
          });
          console.log(`Using ${cartons.length} cartons from packing materials table`);
        }
      }
      
      if (!cartons || cartons.length === 0) {
        return res.status(400).json({ message: 'No packing cartons configured. Add cartons in Packing Materials.' });
      }

      // Call optimization service with carrier constraints
      console.log(`Optimizing carton packing for ${enrichedItems.length} items (shipping to ${shippingCountry}, carrier: ${carrierCode || 'none'})`);
      const packingPlan = await optimizeCartonPacking(enrichedItems, cartons, {
        carrierCode,
        shippingCountry,
        preferBulkWrapping
      });

      // Return the optimization plan without saving to database
      // Include 'cartons' field (with full item data including discount info) for UI compatibility
      res.json({
        cartons: packingPlan.cartons,
        suggestions: packingPlan.cartons,
        cartonCount: packingPlan.totalCartons,
        totalCartons: packingPlan.totalCartons,
        totalWeight: packingPlan.totalWeightKg,
        nylonWrapItems: packingPlan.nylonWrapItems,
        reasoning: packingPlan.reasoning,
        totalWeightKg: packingPlan.totalWeightKg,
        avgUtilization: packingPlan.avgUtilization,
        optimizationSuggestions: packingPlan.suggestions,
        carrierCode: packingPlan.carrierCode,
        carrierConstraints: packingPlan.carrierConstraints,
        estimatedShippingCost: packingPlan.estimatedShippingCost,
        shippingCurrency: packingPlan.shippingCurrency
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
  app.post('/api/orders/:orderId/packing-plan', isAuthenticated, async (req, res) => {
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

      // Fetch all packing cartons for reference - try dedicated table first, then packing materials
      let cartons = await storage.getPackingCartons();
      
      if (!cartons || cartons.length === 0) {
        const packingMaterials = await storage.getPackingMaterials();
        const cartonMaterials = packingMaterials.filter(m => 
          m.category === 'cartons' && m.isActive && m.dimensions
        );
        
        if (cartonMaterials.length > 0) {
          cartons = cartonMaterials.map(m => {
            const dimMatch = m.dimensions?.match(/(\d+(?:\.\d+)?)\s*[×xX]\s*(\d+(?:\.\d+)?)\s*[×xX]\s*(\d+(?:\.\d+)?)\s*(cm|mm|in)?/i);
            let length = 30, width = 20, height = 15;
            
            if (dimMatch) {
              length = parseFloat(dimMatch[1]);
              width = parseFloat(dimMatch[2]);
              height = parseFloat(dimMatch[3]);
              const unit = (dimMatch[4] || 'cm').toLowerCase();
              if (unit === 'mm') { length /= 10; width /= 10; height /= 10; }
              else if (unit === 'in') { length *= 2.54; width *= 2.54; height *= 2.54; }
            }
            
            return {
              id: m.id,
              name: m.name,
              innerLengthCm: length.toString(),
              innerWidthCm: width.toString(),
              innerHeightCm: height.toString(),
              maxWeightKg: '30',
              tareWeightKg: '0.5',
              cost: m.cost || '0',
              currency: m.currency || 'EUR',
              isActive: m.isActive ?? true,
              usageCount: 0,
              createdAt: m.createdAt,
              updatedAt: m.updatedAt
            };
          });
        }
      }
      
      if (!cartons || cartons.length === 0) {
        return res.status(400).json({ message: 'No packing cartons configured. Add cartons in Packing Materials.' });
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
  app.get('/api/orders/:orderId/packing-plan', isAuthenticated, async (req, res) => {
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
  app.patch('/api/orders/:orderId/packing-plan/:planId', isAuthenticated, async (req, res) => {
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

  app.put('/api/product-files/:id', isAuthenticated, async (req, res) => {
    try {
      const file = await storage.updateProductFile(req.params.id, req.body);
      res.json(file);
    } catch (error) {
      console.error('Error updating product file:', error);
      res.status(500).json({ message: 'Failed to update product file' });
    }
  });

  app.delete('/api/product-files/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteProductFile(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting product file:', error);
      res.status(500).json({ message: 'Failed to delete product file' });
    }
  });

  // Address Autocomplete Endpoint
  app.get('/api/addresses/autocomplete', isAuthenticated, async (req, res) => {
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

  // Helper function to look up postal code from Nominatim when missing
  // Includes timeout protection and rate limiting awareness
  async function lookupPostalCode(city: string, street?: string, country?: string): Promise<string | null> {
    try {
      // Build search query - prioritize city, add street and country if available
      let queryParts: string[] = [];
      if (street) queryParts.push(street);
      if (city) queryParts.push(city);
      if (country) queryParts.push(country);
      
      const query = queryParts.join(', ');
      if (!query) return null;

      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=1`;
      
      // Create abort controller for timeout (3 seconds max to prevent hanging)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'DavieSupply/1.0 (Warehouse Management System)'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        // Handle rate limiting gracefully
        if (response.status === 429) {
          console.warn('Nominatim rate limit reached, skipping postal code lookup');
          return null;
        }
        console.error('Nominatim API error:', response.statusText);
        return null;
      }

      const data = await response.json();
      if (data && data.length > 0 && data[0].address?.postcode) {
        console.log(`Postal code lookup: found "${data[0].address.postcode}" for "${query}"`);
        return data[0].address.postcode;
      }

      return null;
    } catch (error: any) {
      // Handle timeout gracefully
      if (error.name === 'AbortError') {
        console.warn('Postal code lookup timed out, continuing without it');
        return null;
      }
      console.error('Error looking up postal code:', error);
      return null;
    }
  }

  // AI-powered Address Parsing Endpoint
  app.post('/api/addresses/parse', isAuthenticated, async (req: any, res) => {
    try {
      const { rawAddress } = req.body;

      if (!rawAddress || typeof rawAddress !== 'string' || rawAddress.trim().length < 5) {
        return res.status(400).json({ 
          message: 'Raw address must be at least 5 characters long',
          fields: {},
          confidence: 'low'
        });
      }

      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        // Fallback to basic regex parsing when AI is not configured
        console.log('DEEPSEEK_API_KEY not configured, using basic parsing');
        const basicParsed = parseAddressBasic(rawAddress);
        
        // Auto-fill postal code if missing but city is present
        if (!basicParsed.fields.zipCode && basicParsed.fields.city) {
          console.log(`Smart Paste (basic): zipCode missing, looking up for city "${basicParsed.fields.city}"`);
          const lookedUpZipCode = await lookupPostalCode(
            basicParsed.fields.city, 
            basicParsed.fields.street, 
            basicParsed.fields.country
          );
          if (lookedUpZipCode) {
            basicParsed.fields.zipCode = lookedUpZipCode;
            console.log(`Smart Paste (basic): Auto-filled postal code "${lookedUpZipCode}"`);
          }
        }
        
        return res.json(basicParsed);
      }

      const deepseek = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.deepseek.com'
      });

      const prompt = `Parse the following raw address/contact text into structured fields.
Return ONLY a valid JSON object with this exact structure:
{
  "firstName": "First/given name",
  "lastName": "Last/family name",
  "company": "Company name if present",
  "email": "Email address if present",
  "phone": "Phone number if present",
  "street": "Street name without number",
  "streetNumber": "House/street number",
  "city": "City or town",
  "zipCode": "Postal/ZIP code",
  "country": "Country name"
}

Raw text to parse:
${rawAddress}

Important rules:
- Extract any available fields from the text
- For Vietnamese names: the first word is typically the family name (lastName), the rest are given names (firstName)
- For European addresses: format is typically "Street Number, Postal City, Country"
- For Czech addresses: format is typically "Street Number, PostalCode City"
- Leave fields as empty string if not found
- Phone numbers should include country code if present
- Return ONLY the JSON, no additional text or explanation`;

      const completion = await deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an address parsing expert. Parse addresses and contact information into structured fields. Always respond with valid JSON only, no additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      });

      const content = completion.choices[0]?.message?.content?.trim() || '';
      
      // Parse the JSON response
      let parsed;
      try {
        // Remove any markdown code block markers
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error('Failed to parse AI response:', content);
        // Fallback to basic parsing
        const basicParsed = parseAddressBasic(rawAddress);
        
        // Auto-fill postal code if missing but city is present
        if (!basicParsed.fields.zipCode && basicParsed.fields.city) {
          console.log(`Smart Paste (fallback): zipCode missing, looking up for city "${basicParsed.fields.city}"`);
          const lookedUpZipCode = await lookupPostalCode(
            basicParsed.fields.city, 
            basicParsed.fields.street, 
            basicParsed.fields.country
          );
          if (lookedUpZipCode) {
            basicParsed.fields.zipCode = lookedUpZipCode;
            console.log(`Smart Paste (fallback): Auto-filled postal code "${lookedUpZipCode}"`);
          }
        }
        
        return res.json(basicParsed);
      }

      // Determine confidence based on how many fields were extracted
      const fieldCount = Object.values(parsed).filter(v => v && String(v).trim()).length;
      let confidence: 'high' | 'medium' | 'low' = 'low';
      if (fieldCount >= 6) confidence = 'high';
      else if (fieldCount >= 3) confidence = 'medium';

      // Extract initial values
      let zipCode = parsed.zipCode || parsed.postalCode || '';
      const city = parsed.city || '';
      const street = parsed.street || '';
      const country = normalizeCountryName(parsed.country || '');

      // Auto-fill postal code if missing but city is present
      if (!zipCode && city) {
        console.log(`Smart Paste: zipCode missing, looking up for city "${city}"`);
        const lookedUpZipCode = await lookupPostalCode(city, street, country);
        if (lookedUpZipCode) {
          zipCode = lookedUpZipCode;
          console.log(`Smart Paste: Auto-filled postal code "${zipCode}" for "${city}"`);
        }
      }

      res.json({
        fields: {
          firstName: parsed.firstName || '',
          lastName: parsed.lastName || '',
          company: parsed.company || '',
          email: parsed.email || '',
          tel: parsed.phone || parsed.tel || '',
          street: street,
          streetNumber: parsed.streetNumber || '',
          city: city,
          zipCode: zipCode,
          country: country
        },
        confidence
      });
    } catch (error) {
      console.error('Error parsing address:', error);
      // Return a basic fallback response
      res.json({
        fields: {},
        confidence: 'low',
        error: 'Failed to parse address'
      });
    }
  });

  // Helper function to normalize country names to match dropdown menu items
  function normalizeCountryName(country: string): string {
    if (!country) return '';
    
    const normalized = country.trim().toLowerCase();
    
    // Map of variations to standard country names (matching europeanCountries in countries.ts)
    const countryMappings: Record<string, string> = {
      // Czech Republic variations
      'czech': 'Czech Republic',
      'czechia': 'Czech Republic',
      'czech republic': 'Czech Republic',
      'česká republika': 'Czech Republic',
      'ceska republika': 'Czech Republic',
      'cz': 'Czech Republic',
      'tschechien': 'Czech Republic',
      'tschechische republik': 'Czech Republic',
      
      // Germany variations
      'germany': 'Germany',
      'deutschland': 'Germany',
      'de': 'Germany',
      'german': 'Germany',
      'bundesrepublik deutschland': 'Germany',
      'německo': 'Germany',
      'nemecko': 'Germany',
      
      // Austria variations
      'austria': 'Austria',
      'österreich': 'Austria',
      'osterreich': 'Austria',
      'at': 'Austria',
      'rakousko': 'Austria',
      
      // Poland variations
      'poland': 'Poland',
      'polska': 'Poland',
      'pl': 'Poland',
      'polen': 'Poland',
      'polsko': 'Poland',
      
      // Slovakia variations
      'slovakia': 'Slovakia',
      'slovensko': 'Slovakia',
      'slovak republic': 'Slovakia',
      'sk': 'Slovakia',
      'slowakei': 'Slovakia',
      
      // Hungary variations
      'hungary': 'Hungary',
      'magyarország': 'Hungary',
      'magyarorszag': 'Hungary',
      'hu': 'Hungary',
      'ungarn': 'Hungary',
      'maďarsko': 'Hungary',
      'madarsko': 'Hungary',
      
      // France variations
      'france': 'France',
      'fr': 'France',
      'frankreich': 'France',
      'francie': 'France',
      
      // Italy variations
      'italy': 'Italy',
      'italia': 'Italy',
      'it': 'Italy',
      'italien': 'Italy',
      'itálie': 'Italy',
      'italie': 'Italy',
      
      // Spain variations
      'spain': 'Spain',
      'españa': 'Spain',
      'espana': 'Spain',
      'es': 'Spain',
      'spanien': 'Spain',
      'španělsko': 'Spain',
      'spanelsko': 'Spain',
      
      // Netherlands variations
      'netherlands': 'Netherlands',
      'holland': 'Netherlands',
      'the netherlands': 'Netherlands',
      'nl': 'Netherlands',
      'niederlande': 'Netherlands',
      'holandsko': 'Netherlands',
      'nizozemsko': 'Netherlands',
      
      // Belgium variations
      'belgium': 'Belgium',
      'belgique': 'Belgium',
      'belgië': 'Belgium',
      'belgie': 'Belgium',
      'be': 'Belgium',
      'belgien': 'Belgium',
      'belgio': 'Belgium',
      
      // United Kingdom variations
      'united kingdom': 'United Kingdom',
      'uk': 'United Kingdom',
      'gb': 'United Kingdom',
      'great britain': 'United Kingdom',
      'england': 'United Kingdom',
      'großbritannien': 'United Kingdom',
      'grossbritannien': 'United Kingdom',
      'velká británie': 'United Kingdom',
      'velka britanie': 'United Kingdom',
      'spojené království': 'United Kingdom',
      'spojene kralovstvi': 'United Kingdom',
      'anglie': 'United Kingdom',
      
      // Switzerland variations
      'switzerland': 'Switzerland',
      'schweiz': 'Switzerland',
      'suisse': 'Switzerland',
      'svizzera': 'Switzerland',
      'ch': 'Switzerland',
      'švýcarsko': 'Switzerland',
      'svycarsko': 'Switzerland',
      
      // Vietnam variations
      'vietnam': 'Vietnam',
      'việt nam': 'Vietnam',
      'viet nam': 'Vietnam',
      'vn': 'Vietnam',
      
      // Portugal variations
      'portugal': 'Portugal',
      'pt': 'Portugal',
      
      // Romania variations
      'romania': 'Romania',
      'românia': 'Romania',
      'ro': 'Romania',
      'rumänien': 'Romania',
      
      // Bulgaria variations
      'bulgaria': 'Bulgaria',
      'българия': 'Bulgaria',
      'bg': 'Bulgaria',
      'bulgarien': 'Bulgaria',
      
      // Croatia variations
      'croatia': 'Croatia',
      'hrvatska': 'Croatia',
      'hr': 'Croatia',
      'kroatien': 'Croatia',
      
      // Slovenia variations
      'slovenia': 'Slovenia',
      'slovenija': 'Slovenia',
      'si': 'Slovenia',
      'slowenien': 'Slovenia',
      
      // Greece variations
      'greece': 'Greece',
      'ελλάδα': 'Greece',
      'ellada': 'Greece',
      'gr': 'Greece',
      'griechenland': 'Greece',
      
      // Denmark variations
      'denmark': 'Denmark',
      'danmark': 'Denmark',
      'dk': 'Denmark',
      'dänemark': 'Denmark',
      
      // Sweden variations
      'sweden': 'Sweden',
      'sverige': 'Sweden',
      'se': 'Sweden',
      'schweden': 'Sweden',
      
      // Norway variations
      'norway': 'Norway',
      'norge': 'Norway',
      'no': 'Norway',
      'norwegen': 'Norway',
      
      // Finland variations
      'finland': 'Finland',
      'suomi': 'Finland',
      'fi': 'Finland',
      'finnland': 'Finland',
      
      // Ireland variations
      'ireland': 'Ireland',
      'éire': 'Ireland',
      'eire': 'Ireland',
      'ie': 'Ireland',
      'irland': 'Ireland',
      
      // Luxembourg variations
      'luxembourg': 'Luxembourg',
      'luxemburg': 'Luxembourg',
      'lu': 'Luxembourg',
      
      // Serbia variations
      'serbia': 'Serbia',
      'србија': 'Serbia',
      'srbija': 'Serbia',
      'rs': 'Serbia',
      'serbien': 'Serbia',
      
      // Ukraine variations
      'ukraine': 'Ukraine',
      'україна': 'Ukraine',
      'ukraina': 'Ukraine',
      'ua': 'Ukraine',
      
      // Turkey variations
      'turkey': 'Turkey',
      'türkiye': 'Turkey',
      'turkiye': 'Turkey',
      'tr': 'Turkey',
      'türkei': 'Turkey',
      
      // Other common countries
      'usa': 'United States',
      'united states': 'United States',
      'united states of america': 'United States',
      'us': 'United States',
      'america': 'United States',
      
      'canada': 'Canada',
      'ca': 'Canada',
      'kanada': 'Canada',
      
      'china': 'China',
      'cn': 'China',
      '中国': 'China',
      
      'japan': 'Japan',
      'jp': 'Japan',
      '日本': 'Japan',
      
      'south korea': 'South Korea',
      'korea': 'South Korea',
      'kr': 'South Korea',
      '한국': 'South Korea',
      
      'australia': 'Australia',
      'au': 'Australia',
      'australien': 'Australia',
    };
    
    // Try exact match first
    if (countryMappings[normalized]) {
      return countryMappings[normalized];
    }
    
    // Try partial match
    for (const [key, value] of Object.entries(countryMappings)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }
    
    // Return original with proper capitalization if no match found
    return country.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  // Helper function for basic address parsing without AI
  function parseAddressBasic(rawAddress: string): { fields: Record<string, string>; confidence: 'high' | 'medium' | 'low' } {
    const fields: Record<string, string> = {
      firstName: '',
      lastName: '',
      company: '',
      email: '',
      tel: '',
      street: '',
      streetNumber: '',
      city: '',
      zipCode: '',
      country: ''
    };

    const lines = rawAddress.split('\n').map(l => l.trim()).filter(Boolean);
    const allText = rawAddress.replace(/\n/g, ' ');

    // Extract email
    const emailMatch = allText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) fields.email = emailMatch[0];

    // Extract phone - look for various formats
    const phoneMatch = allText.match(/(?:\+\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3}[\s.-]?\d{3,4}/);
    if (phoneMatch) fields.tel = phoneMatch[0].trim();

    // Extract postal code (European format: 4-5 digits, sometimes with space)
    const zipMatch = allText.match(/\b(\d{3}\s?\d{2}|\d{4,5})\b/);
    if (zipMatch) fields.zipCode = zipMatch[1].replace(/\s/g, '');

    // Country detection
    const countryPatterns: Record<string, string> = {
      'czech|česk|czechia|cz': 'Czech Republic',
      'germany|deutschland|german|de': 'Germany',
      'austria|österreich|at': 'Austria',
      'poland|polska|pl': 'Poland',
      'slovakia|slovensko|sk': 'Slovakia',
      'hungary|magyarország|hu': 'Hungary',
      'vietnam|việt nam|vn': 'Vietnam'
    };

    for (const [pattern, country] of Object.entries(countryPatterns)) {
      if (new RegExp(pattern, 'i').test(allText)) {
        fields.country = country;
        break;
      }
    }

    // Try to extract name from first line
    if (lines.length > 0) {
      const firstLine = lines[0];
      // Skip if it looks like an address or company
      if (!firstLine.match(/\d/) && !firstLine.toLowerCase().includes('s.r.o') && !firstLine.toLowerCase().includes('gmbh')) {
        const nameParts = firstLine.split(/\s+/);
        if (nameParts.length >= 2) {
          fields.lastName = nameParts[0];
          fields.firstName = nameParts.slice(1).join(' ');
        } else if (nameParts.length === 1) {
          fields.firstName = nameParts[0];
        }
      }
    }

    // Extract street and number
    for (const line of lines) {
      const streetMatch = line.match(/^([A-Za-zÀ-žА-яа-я\s]+)\s+(\d+[a-zA-Z]?(?:\/\d+)?)$/);
      if (streetMatch) {
        fields.street = streetMatch[1].trim();
        fields.streetNumber = streetMatch[2];
        break;
      }
    }

    // Normalize country name to match dropdown menu items
    if (fields.country) {
      fields.country = normalizeCountryName(fields.country);
    }

    // Determine confidence
    const fieldCount = Object.values(fields).filter(v => v && v.trim()).length;
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (fieldCount >= 5) confidence = 'medium';
    if (fieldCount >= 7) confidence = 'high';

    return { fields, confidence };
  }

  // ARES Lookup Endpoint (Czech company registry)
  app.get('/api/tax/ares-lookup', isAuthenticated, async (req, res) => {
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
  app.post('/api/tax/validate-vat', isAuthenticated, async (req, res) => {
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
  app.get('/api/facebook/name', isAuthenticated, async (req, res) => {
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

  // Exchange Rates endpoint - provides EUR-based conversion rates
  app.get('/api/exchange-rates', isAuthenticated, async (req, res) => {
    try {
      const response = await fetch('https://api.frankfurter.app/latest?from=EUR');
      if (!response.ok) {
        // Fallback to default rates if API fails
        return res.json({ 
          base: 'EUR',
          rates: { CZK: 25.0, USD: 1.08 } 
        });
      }
      const data = await response.json();
      res.json({
        base: data.base || 'EUR',
        rates: data.rates || { CZK: 25.0, USD: 1.08 }
      });
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      // Return fallback rates on error
      res.json({ 
        base: 'EUR',
        rates: { CZK: 25.0, USD: 1.08 } 
      });
    }
  });

  // App Settings endpoints
  app.get('/api/settings', isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getAppSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error fetching app settings:', error);
      res.status(500).json({ message: 'Failed to fetch app settings' });
    }
  });

  // ============================================================================
  // POS SETTINGS ROUTES (must be before /api/settings/:key to avoid route conflict)
  // ============================================================================

  // Get POS-specific settings with default values
  app.get('/api/settings/pos', isAuthenticated, async (req, res) => {
    try {
      const posSettings = await getSettingsByCategory('pos');
      
      // Define default POS settings
      const defaults = {
        defaultWarehouseId: null,
        defaultDiscountRate: null,
        enableInvoiceButton: true,
        enableBankTransfer: true,
      };

      // Merge stored settings with defaults (stored settings take precedence)
      const settingsWithDefaults = { ...defaults, ...posSettings };
      
      res.json(settingsWithDefaults);
    } catch (error) {
      console.error('Error fetching POS settings:', error);
      res.status(500).json({ message: 'Failed to fetch POS settings' });
    }
  });

  // Update POS settings
  app.post('/api/settings/pos', isAuthenticated, requireRole(['administrator']), async (req, res) => {
    try {
      const settings = req.body;

      // Process each setting and update/create
      const results = [];
      for (const [key, value] of Object.entries(settings)) {
        const existing = await storage.getAppSettingByKey(key);
        
        if (existing) {
          const updated = await storage.updateAppSetting(key, {
            value: typeof value === 'string' ? value : JSON.stringify(value),
            category: 'pos'
          });
          results.push(updated);
        } else {
          const created = await storage.createAppSetting({
            key,
            value: typeof value === 'string' ? value : JSON.stringify(value),
            category: 'pos'
          });
          results.push(created);
        }
      }

      res.json(results);
    } catch (error) {
      console.error('Error updating POS settings:', error);
      res.status(500).json({ message: 'Failed to update POS settings' });
    }
  });

  // ============================================================================
  // GENERIC SETTINGS ROUTES (must be after specific routes like /api/settings/pos)
  // ============================================================================

  app.get('/api/settings/:key', isAuthenticated, async (req, res) => {
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

  app.post('/api/settings', isAuthenticated, requireRole(['administrator']), async (req, res) => {
    try {
      const data = insertAppSettingSchema.parse(req.body);
      
      // Check if setting already exists - upsert behavior
      const existing = await storage.getAppSettingByKey(data.key);
      if (existing) {
        const updated = await storage.updateAppSetting(data.key, {
          value: data.value,
          category: data.category || existing.category
        });
        return res.json(updated);
      }
      
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

  app.patch('/api/settings/:key', isAuthenticated, async (req, res) => {
    try {
      const { key } = req.params;
      const data = req.body;

      // Check if setting exists - if not, create it (upsert behavior)
      const existing = await storage.getAppSettingByKey(key);
      if (!existing) {
        // Create new setting with the key from URL and data from body
        const newSetting = await storage.createAppSetting({
          key,
          value: data.value,
          category: data.category || 'general'
        });
        return res.status(201).json(newSetting);
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

  app.delete('/api/settings/:key', isAuthenticated, async (req, res) => {
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

  // ============================================================================
  // DATABASE BACKUP ROUTES
  // ============================================================================
  
  const {
    createBackup,
    listBackups,
    getBackupById,
    deleteBackup,
    getBackupStats,
    getSchedulerStatus,
    cleanupExpiredBackups,
  } = await import('./services/backupService');

  // Get all backups
  app.get('/api/backups', isAuthenticated, requireRole(['administrator']), async (req, res) => {
    try {
      const backups = await listBackups();
      res.json(backups);
    } catch (error) {
      console.error('Error fetching backups:', error);
      res.status(500).json({ message: 'Failed to fetch backups' });
    }
  });

  // Get backup statistics
  app.get('/api/backups/stats', isAuthenticated, requireRole(['administrator']), async (req, res) => {
    try {
      const stats = await getBackupStats();
      const scheduler = getSchedulerStatus();
      res.json({ ...stats, scheduler });
    } catch (error) {
      console.error('Error fetching backup stats:', error);
      res.status(500).json({ message: 'Failed to fetch backup statistics' });
    }
  });

  // Create manual backup
  app.post('/api/backups', isAuthenticated, requireRole(['administrator']), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const result = await createBackup('manual', userId);
      
      if (result.success) {
        res.status(201).json({
          message: 'Backup created successfully',
          backup: result,
        });
      } else {
        res.status(500).json({
          message: 'Backup failed',
          error: result.error,
        });
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      res.status(500).json({ message: 'Failed to create backup' });
    }
  });

  // Get specific backup
  app.get('/api/backups/:id', isAuthenticated, requireRole(['administrator']), async (req, res) => {
    try {
      const { id } = req.params;
      const backup = await getBackupById(id);
      
      if (!backup) {
        return res.status(404).json({ message: 'Backup not found' });
      }
      
      res.json(backup);
    } catch (error) {
      console.error('Error fetching backup:', error);
      res.status(500).json({ message: 'Failed to fetch backup' });
    }
  });

  // Download backup file
  app.get('/api/backups/:id/download', isAuthenticated, requireRole(['administrator']), async (req, res) => {
    try {
      const { id } = req.params;
      const backup = await getBackupById(id);
      
      if (!backup) {
        return res.status(404).json({ message: 'Backup not found' });
      }
      
      if (backup.status !== 'completed' || !backup.filePath) {
        return res.status(400).json({ message: 'Backup file not available' });
      }
      
      const fsSync = await import('fs');
      if (!fsSync.existsSync(backup.filePath)) {
        return res.status(404).json({ message: 'Backup file not found on disk' });
      }
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${backup.fileName}"`);
      res.sendFile(backup.filePath, { root: process.cwd() });
    } catch (error) {
      console.error('Error downloading backup:', error);
      res.status(500).json({ message: 'Failed to download backup' });
    }
  });

  // Delete backup
  app.delete('/api/backups/:id', isAuthenticated, requireRole(['administrator']), async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await deleteBackup(id);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Backup not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting backup:', error);
      res.status(500).json({ message: 'Failed to delete backup' });
    }
  });

  // Manually trigger cleanup of expired backups
  app.post('/api/backups/cleanup', isAuthenticated, requireRole(['administrator']), async (req, res) => {
    try {
      const deletedCount = await cleanupExpiredBackups();
      res.json({ 
        message: `Cleaned up ${deletedCount} expired backup(s)`,
        deletedCount,
      });
    } catch (error) {
      console.error('Error cleaning up backups:', error);
      res.status(500).json({ message: 'Failed to cleanup backups' });
    }
  });

  // ============================================================================
  // REPORT ROUTES
  // ============================================================================
  
  const { 
    generateAndSaveReport, 
    getReportSettings, 
    listReports, 
    getReportByFileName, 
    getLowStockAlerts,
    getReportSchedulerStatus,
    generateHTMLReport 
  } = await import('./services/reportService');

  // Get report settings and scheduler status
  app.get('/api/reports/status', isAuthenticated, requireRole(['administrator']), async (req, res) => {
    try {
      const settings = await getReportSettings();
      const scheduler = getReportSchedulerStatus();
      res.json({ settings, scheduler });
    } catch (error) {
      console.error('Error fetching report status:', error);
      res.status(500).json({ message: 'Failed to fetch report status' });
    }
  });

  // List all generated reports
  app.get('/api/reports', isAuthenticated, requireRole(['administrator']), async (req, res) => {
    try {
      const reports = await listReports();
      res.json(reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      res.status(500).json({ message: 'Failed to fetch reports' });
    }
  });

  // Generate a report manually
  app.post('/api/reports/generate', isAuthenticated, requireRole(['administrator']), async (req, res) => {
    try {
      const { period } = req.body;
      
      if (!['daily', 'weekly', 'monthly', 'yearly'].includes(period)) {
        return res.status(400).json({ message: 'Invalid period. Use daily, weekly, monthly, or yearly.' });
      }
      
      const result = await generateAndSaveReport(period);
      res.status(201).json({
        message: `${period.charAt(0).toUpperCase() + period.slice(1)} report generated successfully`,
        report: result.report,
        filePath: result.filePath,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({ message: 'Failed to generate report' });
    }
  });

  // Get a specific report by filename
  app.get('/api/reports/:fileName', isAuthenticated, requireRole(['administrator']), async (req, res) => {
    try {
      const { fileName } = req.params;
      const report = await getReportByFileName(fileName);
      
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }
      
      res.json(report);
    } catch (error) {
      console.error('Error fetching report:', error);
      res.status(500).json({ message: 'Failed to fetch report' });
    }
  });

  // Get low stock alerts
  app.get('/api/reports/alerts/low-stock', isAuthenticated, async (req, res) => {
    try {
      const alerts = await getLowStockAlerts();
      res.json(alerts);
    } catch (error) {
      console.error('Error fetching low stock alerts:', error);
      res.status(500).json({ message: 'Failed to fetch low stock alerts' });
    }
  });

  // Preview report - generates HTML report for preview
  app.post('/api/reports/preview', isAuthenticated, async (req, res) => {
    try {
      const { timeframe } = req.body;
      
      if (!['daily', 'weekly', 'monthly', 'yearly'].includes(timeframe)) {
        return res.status(400).json({ message: 'Invalid timeframe. Use daily, weekly, monthly, or yearly.' });
      }
      
      const html = await generateHTMLReport(timeframe);
      res.json({ html });
    } catch (error) {
      console.error('Error generating report preview:', error);
      res.status(500).json({ message: 'Failed to generate report preview' });
    }
  });

  // ============================================================================
  // BUSINESS INTELLIGENCE REPORTS ROUTES
  // ============================================================================
  
  // Generate a new business report with AI analysis
  app.post('/api/business-reports/generate', isAuthenticated, requireRole(['administrator']), async (req, res) => {
    try {
      const { generateBusinessReport } = await import('./services/businessReportService');
      const report = await generateBusinessReport();
      res.json(report);
    } catch (error: any) {
      console.error('Error generating business report:', error);
      res.status(500).json({ message: error.message || 'Failed to generate business report' });
    }
  });

  // Get the latest business report
  app.get('/api/business-reports/latest', isAuthenticated, requireRole(['administrator']), async (req, res) => {
    try {
      const { getLatestBusinessReport } = await import('./services/businessReportService');
      const report = await getLatestBusinessReport();
      res.json(report);
    } catch (error: any) {
      console.error('Error fetching latest business report:', error);
      res.status(500).json({ message: 'Failed to fetch latest business report' });
    }
  });

  // Get all business reports with pagination
  app.get('/api/business-reports', isAuthenticated, requireRole(['administrator']), async (req, res) => {
    try {
      const { getBusinessReports } = await import('./services/businessReportService');
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await getBusinessReports(limit, offset);
      res.json(result);
    } catch (error: any) {
      console.error('Error fetching business reports:', error);
      res.status(500).json({ message: 'Failed to fetch business reports' });
    }
  });

  // Get a specific business report by ID
  app.get('/api/business-reports/:id', isAuthenticated, requireRole(['administrator']), async (req, res) => {
    try {
      const { getBusinessReportById } = await import('./services/businessReportService');
      const report = await getBusinessReportById(req.params.id);
      if (!report) {
        return res.status(404).json({ message: 'Business report not found' });
      }
      res.json(report);
    } catch (error: any) {
      console.error('Error fetching business report:', error);
      res.status(500).json({ message: 'Failed to fetch business report' });
    }
  });

  // ============================================================================
  // IMPORT/EXPORT DATA ROUTES
  // ============================================================================

  // Get template as Excel file
  app.get('/api/imports/:entity/template', isAuthenticated, async (req, res) => {
    try {
      const entity = req.params.entity as EntityType;
      const buffer = await generateTemplateWorkbook(entity);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${entity}_template.xlsx`);
      res.send(buffer);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Preview import (parse file, validate, return rows)
  app.post('/api/imports/:entity/preview', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const entity = req.params.entity as EntityType;
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      const rows = await parseExcelFile(req.file.buffer, entity);
      
      // Check for empty file
      if (rows.length === 0) {
        return res.status(400).json({ message: 'No data found in file. Make sure the first row contains headers.' });
      }
      
      const validatedRows = rows.map((row, index) => ({
        rowNumber: index + 1,
        ...validateRow(row, entity),
        originalData: row,
      }));
      res.json({ rows: validatedRows, totalRows: rows.length });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Commit import (create batch and process)
  app.post('/api/imports/:entity/commit', isAuthenticated, async (req: any, res) => {
    try {
      const entity = req.params.entity as EntityType;
      const { rows } = req.body;
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: 'No rows to import' });
      }
      
      // Extract the actual row data - prioritize processedData, fallback to originalData
      const rowData = rows.map((row: any) => row.processedData || row.originalData || row);
      
      const userId = req.user?.id || null;
      const batchId = await createImportBatch(entity, rowData, userId);
      const result = await processImportBatch(batchId);
      const batch = await getImportBatch(batchId);
      res.json({ batchId, ...result, batch });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get import batch status
  app.get('/api/imports/batches/:batchId', isAuthenticated, async (req, res) => {
    try {
      const batch = await getImportBatch(req.params.batchId);
      if (!batch) {
        return res.status(404).json({ message: 'Batch not found' });
      }
      const items = await getImportBatchItems(req.params.batchId);
      res.json({ batch, items });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // List import batches
  app.get('/api/imports/batches', isAuthenticated, async (req, res) => {
    try {
      const entity = req.query.entity as EntityType | undefined;
      const batches = await getImportBatches(entity);
      res.json(batches);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Revert import batch
  app.post('/api/imports/batches/:batchId/revert', isAuthenticated, async (req, res) => {
    try {
      await revertImportBatch(req.params.batchId);
      res.json({ message: 'Batch reverted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export entity data as Excel
  app.get('/api/exports/:entity', isAuthenticated, async (req, res) => {
    try {
      const entity = req.params.entity as EntityType;
      const buffer = await exportToExcel(entity);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${entity}_export.xlsx`);
      res.send(buffer);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ============================================================================
  // INVOICE ROUTES
  // ============================================================================

  // Create invoice
  app.post('/api/invoices', isAuthenticated, requireRole(['administrator']), async (req, res) => {
    try {
      const { insertInvoiceSchema } = await import('@shared/schema');
      const data = insertInvoiceSchema.parse(req.body);

      // Generate invoice number if not provided
      if (!data.invoiceNumber) {
        const timestamp = Date.now();
        const randomSuffix = Math.floor(Math.random() * 1000);
        data.invoiceNumber = `INV-${timestamp}-${randomSuffix}`;
      }

      const invoice = await storage.createInvoice(data);
      res.status(201).json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      console.error('Error creating invoice:', error);
      res.status(500).json({ message: 'Failed to create invoice' });
    }
  });

  // Get all invoices
  app.get('/api/invoices', isAuthenticated, async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ message: 'Failed to fetch invoices' });
    }
  });

  // Get invoice by ID
  app.get('/api/invoices/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const invoice = await storage.getInvoice(id);

      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      res.json(invoice);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      res.status(500).json({ message: 'Failed to fetch invoice' });
    }
  });

  // Get invoices for an order
  app.get('/api/invoices/order/:orderId', isAuthenticated, async (req, res) => {
    try {
      const { orderId } = req.params;
      const invoices = await storage.getInvoicesByOrderId(orderId);
      res.json(invoices);
    } catch (error) {
      console.error('Error fetching invoices for order:', error);
      res.status(500).json({ message: 'Failed to fetch invoices' });
    }
  });

  // ============================================================================
  // IMPORTS & RECEIVING ROUTES
  // ============================================================================

  // Get single import purchase by ID with items
  app.get('/api/imports/purchases/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const purchase = await storage.getImportPurchase(id);
      
      if (!purchase) {
        return res.status(404).json({ message: 'Purchase order not found' });
      }
      
      // Get items for this purchase
      const items = await storage.getPurchaseItems(id);
      
      res.json({
        ...purchase,
        items
      });
    } catch (error) {
      console.error('Error fetching purchase order:', error);
      res.status(500).json({ message: 'Failed to fetch purchase order' });
    }
  });

  // Update import purchase by ID
  app.patch('/api/imports/purchases/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Zod validation schema for PATCH purchase
      // Helper to coerce string/number to number, treating empty strings as null
      const coerceNumber = z.union([z.string(), z.number(), z.null()])
        .transform(v => {
          if (v === null || v === undefined || v === '') return null;
          const num = Number(v);
          return isNaN(num) ? null : num;
        });
      
      const coercePositiveInt = z.union([z.string(), z.number()])
        .transform(v => {
          const num = Number(v);
          return isNaN(num) || num < 1 ? 1 : Math.floor(num);
        });
      
      const purchaseItemUpdateSchema = z.object({
        id: z.string().optional(),
        name: z.string().min(1, 'Item name is required'),
        sku: z.string().nullable().optional(),
        quantity: coercePositiveInt,
        unitPrice: coerceNumber.transform(v => v ?? 0),
        weight: coerceNumber,
        dimensions: z.string().nullable().optional().transform(v => v === '' ? null : v),
        notes: z.string().nullable().optional().transform(v => v === '' ? null : v),
        unitType: z.enum(['selling', 'original']).optional().default('selling'),
        quantityInSellingUnits: coerceNumber,
        processingTimeDays: coerceNumber
      });
      
      const purchaseUpdateSchema = z.object({
        supplier: z.string().nullable().optional().transform(v => v === '' ? null : v),
        supplierId: z.string().nullable().optional().transform(v => v === '' ? null : v),
        trackingNumber: z.string().nullable().optional().transform(v => v === '' ? null : v),
        estimatedArrival: z.string().nullable().optional().transform(v => v === '' ? null : v),
        notes: z.string().nullable().optional().transform(v => v === '' ? null : v),
        shippingCost: coerceNumber.transform(v => String(v ?? 0)),
        shippingCurrency: z.string().optional().default('USD'),
        consolidation: z.string().nullable().optional().transform(v => v === '' ? null : v),
        totalCost: coerceNumber.transform(v => String(v ?? 0)),
        paymentCurrency: z.string().optional().default('USD'),
        totalPaid: coerceNumber.transform(v => String(v ?? 0)),
        purchaseCurrency: z.string().optional().default('USD'),
        status: z.string().optional(),
        items: z.array(purchaseItemUpdateSchema).optional()
      });
      
      // Validate and parse request body
      const parseResult = purchaseUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: 'Validation failed',
          errors: parseResult.error.errors 
        });
      }
      
      const { items, ...purchaseData } = parseResult.data;
      
      // Update the purchase order
      const updatedPurchase = await storage.updateImportPurchase(id, {
        supplier: purchaseData.supplier,
        supplierId: purchaseData.supplierId,
        trackingNumber: purchaseData.trackingNumber,
        estimatedArrival: purchaseData.estimatedArrival ? new Date(purchaseData.estimatedArrival) : null,
        notes: purchaseData.notes,
        shippingCost: purchaseData.shippingCost,
        shippingCurrency: purchaseData.shippingCurrency,
        consolidation: purchaseData.consolidation,
        totalCost: purchaseData.totalCost,
        paymentCurrency: purchaseData.paymentCurrency,
        totalPaid: purchaseData.totalPaid,
        purchaseCurrency: purchaseData.purchaseCurrency,
        status: purchaseData.status
      });
      
      if (!updatedPurchase) {
        return res.status(404).json({ message: 'Purchase order not found' });
      }
      
      // If items are provided, update them
      if (items && items.length > 0) {
        // Get existing items
        const existingItems = await storage.getPurchaseItems(id);
        const existingItemsMap = new Map(existingItems.map(item => [item.id, item]));
        const newItemIds = new Set(items.map(item => item.id).filter(Boolean));
        
        // Delete items that are no longer in the list
        for (const existingItem of existingItems) {
          if (!newItemIds.has(existingItem.id)) {
            await storage.deletePurchaseItem(existingItem.id);
          }
        }
        
        // Update existing items or create new ones
        for (const item of items) {
          if (item.id && existingItemsMap.has(item.id)) {
            // Update existing item - validated data from Zod
            await storage.updatePurchaseItem(item.id, {
              name: item.name,
              sku: item.sku ?? null,
              quantity: item.quantity,
              unitPrice: String(item.unitPrice),
              totalPrice: String(item.unitPrice * item.quantity),
              weight: item.weight !== null ? String(item.weight) : null,
              dimensions: item.dimensions ?? null,
              notes: item.notes ?? null,
              unitType: item.unitType,
              quantityInSellingUnits: item.quantityInSellingUnits ?? item.quantity,
              processingTimeDays: item.processingTimeDays ?? null
            });
          } else {
            // Create new item - validated data from Zod
            await storage.createPurchaseItem({
              purchaseId: id,
              name: item.name,
              sku: item.sku ?? null,
              quantity: item.quantity,
              unitPrice: String(item.unitPrice),
              totalPrice: String(item.unitPrice * item.quantity),
              weight: item.weight !== null ? String(item.weight) : null,
              dimensions: item.dimensions ?? null,
              notes: item.notes ?? null,
              status: 'ordered',
              unitType: item.unitType,
              quantityInSellingUnits: item.quantityInSellingUnits ?? item.quantity,
              processingTimeDays: item.processingTimeDays ?? null
            });
          }
        }
      }
      
      // Fetch and return the updated purchase with items
      const finalPurchase = await storage.getImportPurchase(id);
      const finalItems = await storage.getPurchaseItems(id);
      
      res.json({
        ...finalPurchase,
        items: finalItems
      });
    } catch (error) {
      console.error('Error updating purchase order:', error);
      res.status(500).json({ message: 'Failed to update purchase order' });
    }
  });

  // Get shipments by receiving status - To Receive
  app.get('/api/imports/shipments/to-receive', isAuthenticated, async (req, res) => {
    try {
      const shipmentList = await db
        .select()
        .from(shipments)
        .where(
          and(
            eq(shipments.status, 'delivered'),
            or(
              isNull(shipments.receivingStatus),
              eq(shipments.receivingStatus, '')
            )
          )
        )
        .orderBy(desc(shipments.deliveredAt));
      
      // Get items for each shipment from consolidation
      const shipmentsWithItems = await Promise.all(
        shipmentList.map(async (shipment) => {
          let items: any[] = [];
          let itemCount = 0;
          
          if (shipment.consolidationId) {
            const consolidationItemList = await db
              .select({
                id: customItems.id,
                name: customItems.name,
                quantity: customItems.quantity,
                weight: customItems.weight,
                trackingNumber: customItems.trackingNumber,
                unitPrice: customItems.unitPrice
              })
              .from(consolidationItems)
              .innerJoin(customItems, eq(consolidationItems.itemId, customItems.id))
              .where(eq(consolidationItems.consolidationId, shipment.consolidationId));
            
            items = consolidationItemList;
            itemCount = consolidationItemList.length;
          }
          
          return {
            ...shipment,
            items,
            itemCount
          };
        })
      );
      
      res.json(shipmentsWithItems);
    } catch (error) {
      console.error('Error fetching to-receive shipments:', error);
      res.status(500).json({ message: 'Failed to fetch shipments' });
    }
  });

  // Get shipments by receiving status - Receiving
  app.get('/api/imports/shipments/receiving', isAuthenticated, async (req, res) => {
    try {
      const shipmentList = await db
        .select()
        .from(shipments)
        .where(eq(shipments.receivingStatus, 'receiving'))
        .orderBy(desc(shipments.updatedAt));
      
      const shipmentsWithItems = await Promise.all(
        shipmentList.map(async (shipment) => {
          let items: any[] = [];
          let itemCount = 0;
          
          if (shipment.consolidationId) {
            const consolidationItemList = await db
              .select({
                id: customItems.id,
                name: customItems.name,
                quantity: customItems.quantity,
                weight: customItems.weight,
                trackingNumber: customItems.trackingNumber,
                unitPrice: customItems.unitPrice
              })
              .from(consolidationItems)
              .innerJoin(customItems, eq(consolidationItems.itemId, customItems.id))
              .where(eq(consolidationItems.consolidationId, shipment.consolidationId));
            
            items = consolidationItemList;
            itemCount = consolidationItemList.length;
          }
          
          return {
            ...shipment,
            items,
            itemCount
          };
        })
      );
      
      res.json(shipmentsWithItems);
    } catch (error) {
      console.error('Error fetching receiving shipments:', error);
      res.status(500).json({ message: 'Failed to fetch shipments' });
    }
  });

  // Get shipments by receiving status - Storage (pending approval)
  app.get('/api/imports/shipments/storage', isAuthenticated, async (req, res) => {
    try {
      const shipmentList = await db
        .select()
        .from(shipments)
        .where(eq(shipments.receivingStatus, 'pending_approval'))
        .orderBy(desc(shipments.updatedAt));
      
      const shipmentsWithItems = await Promise.all(
        shipmentList.map(async (shipment) => {
          let items: any[] = [];
          let itemCount = 0;
          
          if (shipment.consolidationId) {
            const consolidationItemList = await db
              .select({
                id: customItems.id,
                name: customItems.name,
                quantity: customItems.quantity,
                weight: customItems.weight,
                trackingNumber: customItems.trackingNumber,
                unitPrice: customItems.unitPrice
              })
              .from(consolidationItems)
              .innerJoin(customItems, eq(consolidationItems.itemId, customItems.id))
              .where(eq(consolidationItems.consolidationId, shipment.consolidationId));
            
            items = consolidationItemList;
            itemCount = consolidationItemList.length;
          } else {
            // For Direct PO shipments (no consolidation), get items from receipts
            const shipmentReceipts = await db
              .select({ id: receipts.id })
              .from(receipts)
              .where(eq(receipts.shipmentId, shipment.id));
            
            if (shipmentReceipts.length > 0) {
              const receiptIds = shipmentReceipts.map(r => r.id);
              const receiptItemList = await db
                .select({
                  id: receiptItems.id,
                  name: products.name,
                  productName: products.name,
                  quantity: receiptItems.receivedQuantity,
                  category: products.category
                })
                .from(receiptItems)
                .leftJoin(products, eq(receiptItems.productId, products.id))
                .where(inArray(receiptItems.receiptId, receiptIds));
              
              items = receiptItemList;
              itemCount = receiptItemList.length;
            }
          }
          
          return {
            ...shipment,
            items,
            itemCount
          };
        })
      );
      
      res.json(shipmentsWithItems);
    } catch (error) {
      console.error('Error fetching storage shipments:', error);
      res.status(500).json({ message: 'Failed to fetch shipments' });
    }
  });

  // Get shipments by receiving status - Completed
  // Auto-archives completed shipments older than 2 days
  app.get('/api/imports/shipments/completed', isAuthenticated, async (req, res) => {
    try {
      // Calculate the cutoff date (2 days ago)
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      // Auto-archive completed shipments older than 2 days
      await db
        .update(shipments)
        .set({ 
          receivingStatus: 'archived',
          archivedAt: new Date(),
          updatedAt: new Date()
        })
        .where(
          and(
            eq(shipments.receivingStatus, 'completed'),
            lt(shipments.completedAt, twoDaysAgo)
          )
        );
      
      // Get remaining completed shipments (within 2 days)
      const shipmentList = await db
        .select()
        .from(shipments)
        .where(eq(shipments.receivingStatus, 'completed'))
        .orderBy(desc(shipments.completedAt));
      
      const shipmentsWithItems = await Promise.all(
        shipmentList.map(async (shipment) => {
          let items: any[] = [];
          let itemCount = 0;
          
          // First try to get items from consolidationItems if consolidationId exists
          if (shipment.consolidationId) {
            const consolidationItemList = await db
              .select({
                id: customItems.id,
                name: customItems.name,
                quantity: customItems.quantity,
                weight: customItems.weight,
                trackingNumber: customItems.trackingNumber,
                unitPrice: customItems.unitPrice
              })
              .from(consolidationItems)
              .innerJoin(customItems, eq(consolidationItems.itemId, customItems.id))
              .where(eq(consolidationItems.consolidationId, shipment.consolidationId));
            
            items = consolidationItemList;
            itemCount = consolidationItemList.length;
          }
          
          // If no items found (either no consolidationId or consolidation has no items), 
          // fall back to receipt items (covers Direct PO and transit-linked PO shipments)
          if (items.length === 0) {
            const shipmentReceipts = await db
              .select({ id: receipts.id })
              .from(receipts)
              .where(eq(receipts.shipmentId, shipment.id));
            
            if (shipmentReceipts.length > 0) {
              const receiptIds = shipmentReceipts.map(r => r.id);
              const receiptItemList = await db
                .select({
                  id: receiptItems.id,
                  name: products.name,
                  productName: products.name,
                  quantity: receiptItems.receivedQuantity,
                  category: products.category
                })
                .from(receiptItems)
                .leftJoin(products, eq(receiptItems.productId, products.id))
                .where(inArray(receiptItems.receiptId, receiptIds));
              
              items = receiptItemList;
              itemCount = receiptItemList.length;
            }
          }
          
          return {
            ...shipment,
            items,
            itemCount
          };
        })
      );
      
      res.json(shipmentsWithItems);
    } catch (error) {
      console.error('Error fetching completed shipments:', error);
      res.status(500).json({ message: 'Failed to fetch shipments' });
    }
  });

  // Helper function to reconcile purchase order delivery status based on received items
  async function reconcilePurchaseDeliveryForShipment(shipmentId: string): Promise<string[]> {
    const updatedPurchases: string[] = [];
    
    try {
      // Step 1: Find all receipts for this shipment
      const shipmentReceipts = await db
        .select({ id: receipts.id })
        .from(receipts)
        .where(eq(receipts.shipmentId, shipmentId));
      
      if (shipmentReceipts.length === 0) {
        console.log(`No receipts found for shipment ${shipmentId}`);
        return updatedPurchases;
      }
      
      const receiptIds = shipmentReceipts.map(r => r.id);
      
      // Step 2: Get all receipt items of type 'purchase' for these receipts
      const purchaseReceiptItems = await db
        .select({
          itemId: receiptItems.itemId,
          receiptId: receiptItems.receiptId,
          expectedQuantity: receiptItems.expectedQuantity,
          receivedQuantity: receiptItems.receivedQuantity,
          damagedQuantity: receiptItems.damagedQuantity,
          missingQuantity: receiptItems.missingQuantity
        })
        .from(receiptItems)
        .where(and(
          inArray(receiptItems.receiptId, receiptIds),
          eq(receiptItems.itemType, 'purchase')
        ));
      
      if (purchaseReceiptItems.length === 0) {
        console.log(`No purchase items found in receipts for shipment ${shipmentId}`);
        return updatedPurchases;
      }
      
      // Step 3: Get purchase IDs from purchaseItems
      const purchaseItemIds = purchaseReceiptItems.map(ri => ri.itemId);
      const purchaseItemsData = await db
        .select({
          id: purchaseItems.id,
          purchaseId: purchaseItems.purchaseId,
          quantity: purchaseItems.quantity
        })
        .from(purchaseItems)
        .where(inArray(purchaseItems.id, purchaseItemIds));
      
      // Map itemId to purchaseId
      const itemToPurchase = new Map(purchaseItemsData.map(pi => [pi.id, { purchaseId: pi.purchaseId, expectedQty: pi.quantity }]));
      
      // Step 4: Aggregate by purchaseId
      const purchaseAggregates = new Map<number, { expected: number; received: number; missing: number }>();
      
      for (const ri of purchaseReceiptItems) {
        const purchaseInfo = itemToPurchase.get(ri.itemId);
        if (!purchaseInfo) continue;
        
        const { purchaseId } = purchaseInfo;
        const current = purchaseAggregates.get(purchaseId) || { expected: 0, received: 0, missing: 0 };
        
        current.expected += ri.expectedQuantity;
        current.received += (ri.receivedQuantity || 0) + (ri.damagedQuantity || 0);
        current.missing += ri.missingQuantity || 0;
        
        purchaseAggregates.set(purchaseId, current);
      }
      
      // Step 5: For each purchase, check all items across ALL receipts (not just this shipment)
      for (const [purchaseId, _] of purchaseAggregates) {
        // Get all items for this purchase
        const allPurchaseItems = await db
          .select({
            id: purchaseItems.id,
            quantity: purchaseItems.quantity
          })
          .from(purchaseItems)
          .where(eq(purchaseItems.purchaseId, purchaseId));
        
        const totalExpected = allPurchaseItems.reduce((sum, pi) => sum + pi.quantity, 0);
        const allItemIds = allPurchaseItems.map(pi => pi.id);
        
        // Get all receipt items for these purchase items across ALL receipts
        // Include assignedQuantity to verify items are stored (not just received)
        const allReceivedItems = await db
          .select({
            receivedQuantity: receiptItems.receivedQuantity,
            assignedQuantity: receiptItems.assignedQuantity,
            damagedQuantity: receiptItems.damagedQuantity,
            missingQuantity: receiptItems.missingQuantity
          })
          .from(receiptItems)
          .where(and(
            inArray(receiptItems.itemId, allItemIds),
            eq(receiptItems.itemType, 'purchase')
          ));
        
        let totalReceived = 0;
        let totalStored = 0;
        let totalMissing = 0;
        
        for (const ri of allReceivedItems) {
          totalReceived += (ri.receivedQuantity || 0) + (ri.damagedQuantity || 0);
          // Use assignedQuantity for stored count (items assigned to warehouse locations)
          // Use nullish coalescing to properly handle assignedQuantity=0 (not yet stored)
          // Only fall back to receivedQuantity if assignedQuantity is null/undefined (legacy items)
          totalStored += ri.assignedQuantity ?? ri.receivedQuantity ?? 0;
          totalMissing += ri.missingQuantity || 0;
        }
        
        // Check if all items are received AND stored (assigned to locations)
        // All items must be: received (no missing) + stored (assigned to locations)
        const allItemsReceived = totalReceived >= totalExpected && totalMissing === 0;
        const allItemsStored = totalStored >= totalExpected;
        
        if (allItemsReceived && allItemsStored) {
          // Update purchase order to delivered
          const [updatedPurchase] = await db
            .update(importPurchases)
            .set({ 
              status: 'delivered',
              updatedAt: new Date()
            })
            .where(and(
              eq(importPurchases.id, purchaseId),
              sql`${importPurchases.status} != 'delivered'`
            ))
            .returning();
          
          if (updatedPurchase) {
            updatedPurchases.push(`Purchase #${purchaseId} marked as delivered`);
            console.log(`Purchase #${purchaseId} automatically marked as delivered (received: ${totalReceived}/${totalExpected}, stored: ${totalStored}/${totalExpected})`);
          }
        }
      }
      
      return updatedPurchases;
    } catch (error) {
      console.error('Error reconciling purchase delivery status:', error);
      return updatedPurchases;
    }
  }

  // Helper function to calculate and update average landed cost for products when receiving is completed
  async function calculateAndUpdateLandedCosts(shipmentId: string): Promise<string[]> {
    const updatedProducts: string[] = [];
    
    try {
      // Step 1: Get the shipment for shipping cost allocation
      const [shipment] = await db
        .select()
        .from(shipments)
        .where(eq(shipments.id, shipmentId));
      
      if (!shipment) {
        console.log(`Shipment ${shipmentId} not found for landed cost calculation`);
        return updatedProducts;
      }
      
      // Step 2: Find all receipts for this shipment
      const shipmentReceipts = await db
        .select({ id: receipts.id })
        .from(receipts)
        .where(eq(receipts.shipmentId, shipmentId));
      
      if (shipmentReceipts.length === 0) {
        console.log(`No receipts found for shipment ${shipmentId} for landed cost calculation`);
        return updatedProducts;
      }
      
      const receiptIds = shipmentReceipts.map(r => r.id);
      
      // Step 3: Get all receipt items with productId
      const allReceiptItems = await db
        .select({
          productId: receiptItems.productId,
          itemId: receiptItems.itemId,
          itemType: receiptItems.itemType,
          receivedQuantity: receiptItems.receivedQuantity,
          damagedQuantity: receiptItems.damagedQuantity
        })
        .from(receiptItems)
        .where(inArray(receiptItems.receiptId, receiptIds));
      
      if (allReceiptItems.length === 0) {
        console.log(`No receipt items found for shipment ${shipmentId}`);
        return updatedProducts;
      }
      
      // Step 4: Get purchase items to get landing cost info
      const purchaseItemIds = allReceiptItems
        .filter(ri => ri.itemType === 'purchase')
        .map(ri => ri.itemId);
      
      let purchaseItemCosts = new Map<string, { unitPrice: number; landingCostUnitBase: number }>();
      
      if (purchaseItemIds.length > 0) {
        const purchaseItemsData = await db
          .select({
            id: purchaseItems.id,
            unitPrice: purchaseItems.unitPrice,
            landingCostUnitBase: purchaseItems.landingCostUnitBase
          })
          .from(purchaseItems)
          .where(inArray(purchaseItems.id, purchaseItemIds));
        
        for (const pi of purchaseItemsData) {
          const unitPriceVal = parseFloat(pi.unitPrice || '0');
          const landingCostVal = parseFloat(pi.landingCostUnitBase || '0');
          // Only add if at least one cost value is valid and positive
          if ((unitPriceVal > 0 && !isNaN(unitPriceVal)) || (landingCostVal > 0 && !isNaN(landingCostVal))) {
            purchaseItemCosts.set(pi.id, {
              unitPrice: isNaN(unitPriceVal) ? 0 : unitPriceVal,
              landingCostUnitBase: isNaN(landingCostVal) ? 0 : landingCostVal
            });
          }
        }
      }
      
      // Step 5: First pass - identify items with valid pricing and count their units
      // Shipping cost must be allocated ONLY across items that will receive cost updates
      interface ItemWithPricing {
        productId: string;
        itemId: string;
        quantity: number; // received + damaged
        unitCost: number;
      }
      const itemsWithPricing: ItemWithPricing[] = [];
      
      for (const ri of allReceiptItems) {
        if (!ri.productId) continue;
        
        // Include both received and damaged units - they all went through shipping and incur full cost
        const totalQty = (ri.receivedQuantity || 0) + (ri.damagedQuantity || 0);
        if (totalQty <= 0) continue;
        
        let unitCost = 0;
        let hasPricing = false;
        
        if (ri.itemType === 'purchase' && purchaseItemCosts.has(ri.itemId)) {
          const costs = purchaseItemCosts.get(ri.itemId)!;
          // Use landingCostUnitBase if available and positive, otherwise use unitPrice
          if (costs.landingCostUnitBase > 0) {
            unitCost = costs.landingCostUnitBase;
            hasPricing = true;
          } else if (costs.unitPrice > 0) {
            unitCost = costs.unitPrice;
            hasPricing = true;
          }
        }
        
        // Only include items with valid pricing
        if (hasPricing) {
          itemsWithPricing.push({
            productId: ri.productId,
            itemId: ri.itemId,
            quantity: totalQty,
            unitCost
          });
        }
      }
      
      if (itemsWithPricing.length === 0) {
        console.log(`No items with valid pricing found for shipment ${shipmentId} - cannot calculate landed costs`);
        return updatedProducts;
      }
      
      // Calculate total units for shipping allocation (only items with pricing)
      const totalUnitsWithPricing = itemsWithPricing.reduce((sum, item) => sum + item.quantity, 0);
      
      const shipmentShippingCost = parseFloat(shipment.shippingCost || '0');
      const shippingCostPerUnit = totalUnitsWithPricing > 0 && !isNaN(shipmentShippingCost) && shipmentShippingCost > 0
        ? shipmentShippingCost / totalUnitsWithPricing 
        : 0;
      
      // Step 6: Build per-purchase-item cost data with allocated shipping
      interface CostEntry { unitCost: number; quantity: number; }
      const productCostEntries = new Map<string, CostEntry[]>();
      
      for (const item of itemsWithPricing) {
        // Add allocated shipping cost per unit
        const totalUnitCost = item.unitCost + shippingCostPerUnit;
        
        // Store entry per purchase item to preserve cost differentiation
        const entries = productCostEntries.get(item.productId) || [];
        entries.push({ unitCost: totalUnitCost, quantity: item.quantity });
        productCostEntries.set(item.productId, entries);
      }
      
      // Step 7: Update each product with weighted average landed cost
      for (const [productId, entries] of productCostEntries) {
        try {
          // Calculate weighted average from all purchase entries for this product
          let totalCost = 0;
          let totalNewQuantity = 0;
          for (const entry of entries) {
            totalCost += entry.unitCost * entry.quantity;
            totalNewQuantity += entry.quantity;
          }
          
          // Skip if no valid cost data
          if (totalNewQuantity <= 0 || totalCost <= 0) continue;
          
          const newUnitLandingCost = totalCost / totalNewQuantity;
          
          // Validate new cost is a valid positive number
          if (!isFinite(newUnitLandingCost) || isNaN(newUnitLandingCost) || newUnitLandingCost <= 0) {
            console.log(`Skipping product ${productId}: invalid new unit cost ${newUnitLandingCost}`);
            continue;
          }
          
          // Get fresh product data for weighted average calculation
          // Use product_locations to get actual stock quantity (more accurate than products.quantity)
          const productLocationData = await db
            .select({ quantity: productLocations.quantity })
            .from(productLocations)
            .where(eq(productLocations.productId, productId));
          
          const actualStockQuantity = productLocationData.reduce((sum, loc) => sum + (loc.quantity || 0), 0);
          
          // Get current landing cost from product
          const [product] = await db
            .select({ latestLandingCost: products.latestLandingCost })
            .from(products)
            .where(eq(products.id, productId));
          
          if (!product) continue;
          
          // Calculate weighted average with existing stock
          // actualStockQuantity already includes the newly stored items (from location storage phase)
          const existingQuantity = Math.max(0, actualStockQuantity - totalNewQuantity);
          const existingLandingCostStr = product.latestLandingCost;
          const existingLandingCost = existingLandingCostStr 
            ? parseFloat(existingLandingCostStr) 
            : 0;
          
          let avgLandingCost: number;
          
          if (existingQuantity > 0 && existingLandingCost > 0 && isFinite(existingLandingCost) && !isNaN(existingLandingCost)) {
            // Weighted average: (old_qty * old_cost + new_qty * new_cost) / total_qty
            const totalQuantity = existingQuantity + totalNewQuantity;
            if (totalQuantity > 0) {
              avgLandingCost = (existingQuantity * existingLandingCost + totalNewQuantity * newUnitLandingCost) / totalQuantity;
            } else {
              avgLandingCost = newUnitLandingCost;
            }
          } else {
            // No existing stock or no existing cost - use new cost directly
            avgLandingCost = newUnitLandingCost;
          }
          
          // Final validation
          if (!isFinite(avgLandingCost) || isNaN(avgLandingCost) || avgLandingCost <= 0) {
            console.log(`Skipping product ${productId}: invalid avg cost ${avgLandingCost}`);
            continue;
          }
          
          // Update product landing costs (CZK is the base currency)
          await db
            .update(products)
            .set({
              latestLandingCost: avgLandingCost.toFixed(4),
              landingCostCzk: avgLandingCost.toFixed(4),
              updatedAt: new Date()
            })
            .where(eq(products.id, productId));
          
          // Insert cost history entry for tracking
          await db.insert(productCostHistory).values({
            productId: productId,
            landingCostUnitBase: avgLandingCost.toFixed(4),
            method: 'weighted_average',
            computedAt: new Date()
          });
          
          updatedProducts.push(`Product ${productId}: avg landing cost updated to ${avgLandingCost.toFixed(4)} CZK`);
          console.log(`Product ${productId} landing cost updated: ${avgLandingCost.toFixed(4)} CZK (weighted avg of ${entries.length} purchase entries)`);
          
        } catch (productError) {
          console.error(`Error updating landing cost for product ${productId}:`, productError);
        }
      }
      
      return updatedProducts;
    } catch (error) {
      console.error('Error calculating landed costs:', error);
      return updatedProducts;
    }
  }

  // Helper function to add inventory quantities when receiving is completed
  // Adds ALL receivedQuantity to product.quantity (storage assignment only updates productLocations now)
  // CRITICAL: Aggregates by productId first to handle same product in multiple receipt items
  async function addInventoryOnCompletion(shipmentId: string): Promise<string[]> {
    const inventoryUpdates: string[] = [];
    
    // Fetch exchange rates ONCE at the start (shared across all products)
    // Supports: USD, CZK, VND, CNY, GBP, JPY, CHF, AUD, CAD
    let eurToUsd = 1.1, eurToCzk = 25, eurToVnd = 27000, eurToCny = 7.5; // Fallback rates
    let eurToGbp = 0.85, eurToJpy = 160, eurToChf = 0.95, eurToAud = 1.65, eurToCad = 1.48;
    let ratesSource = 'fallback';
    try {
      // Use ExchangeRate-API (no key required) which supports many currencies including VND
      const rateResponse = await fetch('https://open.er-api.com/v6/latest/EUR');
      if (rateResponse.ok) {
        const rateData = await rateResponse.json();
        if (rateData.rates) {
          eurToUsd = rateData.rates.USD || eurToUsd;
          eurToCzk = rateData.rates.CZK || eurToCzk;
          eurToCny = rateData.rates.CNY || eurToCny;
          eurToVnd = rateData.rates.VND || eurToVnd;
          eurToGbp = rateData.rates.GBP || eurToGbp;
          eurToJpy = rateData.rates.JPY || eurToJpy;
          eurToChf = rateData.rates.CHF || eurToChf;
          eurToAud = rateData.rates.AUD || eurToAud;
          eurToCad = rateData.rates.CAD || eurToCad;
          ratesSource = 'exchangerate-api';
          console.log(`[addInventoryOnCompletion] Using live ExchangeRate-API rates: EUR→USD=${eurToUsd.toFixed(4)}, EUR→CZK=${eurToCzk.toFixed(2)}, EUR→CNY=${eurToCny.toFixed(4)}, EUR→VND=${eurToVnd.toFixed(0)}, EUR→GBP=${eurToGbp.toFixed(4)}`);
        }
      }
    } catch (rateError) {
      console.warn(`[addInventoryOnCompletion] Failed to fetch exchange rates, using fallback:`, rateError);
    }
    const usdToEur = 1 / eurToUsd;
    const usdToCzk = eurToCzk / eurToUsd;
    const usdToVnd = eurToVnd / eurToUsd;
    const usdToCny = eurToCny / eurToUsd;
    
    // Helper function to convert any currency to EUR
    const toEur = (amount: number, currency: string): number => {
      const curr = currency.toUpperCase();
      if (curr === 'EUR') return amount;
      if (curr === 'USD') return amount * usdToEur;
      if (curr === 'CZK') return amount / eurToCzk;
      if (curr === 'VND') return amount / eurToVnd;
      if (curr === 'CNY') return amount / eurToCny;
      if (curr === 'GBP') return amount / eurToGbp;
      if (curr === 'JPY') return amount / eurToJpy;
      if (curr === 'CHF') return amount / eurToChf;
      if (curr === 'AUD') return amount / eurToAud;
      if (curr === 'CAD') return amount / eurToCad;
      console.warn(`[addInventoryOnCompletion] Unknown currency ${currency}, treating as EUR`);
      return amount;
    };
    
    // Helper function to convert EUR to any currency
    const fromEur = (amountEur: number, currency: string): number => {
      const curr = currency.toUpperCase();
      if (curr === 'EUR') return amountEur;
      if (curr === 'USD') return amountEur * eurToUsd;
      if (curr === 'CZK') return amountEur * eurToCzk;
      if (curr === 'VND') return amountEur * eurToVnd;
      if (curr === 'CNY') return amountEur * eurToCny;
      if (curr === 'GBP') return amountEur * eurToGbp;
      if (curr === 'JPY') return amountEur * eurToJpy;
      if (curr === 'CHF') return amountEur * eurToChf;
      if (curr === 'AUD') return amountEur * eurToAud;
      if (curr === 'CAD') return amountEur * eurToCad;
      console.warn(`[addInventoryOnCompletion] Unknown currency ${currency}, treating as EUR`);
      return amountEur;
    };
    
    try {
      // Step 1: Find all receipts for this shipment
      const shipmentReceipts = await db
        .select({ id: receipts.id })
        .from(receipts)
        .where(eq(receipts.shipmentId, shipmentId));
      
      if (shipmentReceipts.length === 0) {
        console.log(`[addInventoryOnCompletion] No receipts found for shipment ${shipmentId}`);
        return inventoryUpdates;
      }
      
      const receiptIds = shipmentReceipts.map(r => r.id);
      
      // Step 1b: Get shipment data for shipping costs and allocation method
      const [shipment] = await db
        .select({
          shippingCost: shipments.shippingCost,
          shippingCostCurrency: shipments.shippingCostCurrency,
          insuranceValue: shipments.insuranceValue,
          allocationMethod: shipments.allocationMethod,
          totalWeight: shipments.totalWeight,
          totalUnits: shipments.totalUnits,
          unitType: shipments.unitType,
          consolidationId: shipments.consolidationId
        })
        .from(shipments)
        .where(eq(shipments.id, shipmentId));
      
      const shipmentShippingCost = parseFloat(shipment?.shippingCost || '0');
      const shipmentShippingCurrency = shipment?.shippingCostCurrency || 'USD';
      const shipmentInsuranceCost = parseFloat(shipment?.insuranceValue || '0');
      const shipmentTotalWeight = parseFloat(shipment?.totalWeight || '0');
      const shipmentTotalUnits = shipment?.totalUnits || 0;
      const shipmentUnitType = shipment?.unitType?.toLowerCase() || 'items';
      
      // Query additional shipment costs (brokerage, customs, etc.) from shipmentCosts table
      const additionalCosts = await db
        .select({
          costType: shipmentCosts.costType,
          amount: shipmentCosts.amount,
          currency: shipmentCosts.currency
        })
        .from(shipmentCosts)
        .where(eq(shipmentCosts.shipmentId, shipmentId));
      
      // Sum all additional costs and convert to EUR using helper function
      let additionalCostsEur = 0;
      for (const cost of additionalCosts) {
        const amount = parseFloat(cost.amount || '0');
        if (amount <= 0) continue;
        const costCurrency = cost.currency || 'EUR';
        additionalCostsEur += toEur(amount, costCurrency);
      }
      
      console.log(`[addInventoryOnCompletion] Additional shipment costs: €${additionalCostsEur.toFixed(2)} (${additionalCosts.length} items)`);
      
      // Smart auto-selection when allocationMethod is null (Auto mode)
      // Matches the logic in landingCostService.getAllocationMethod()
      let allocationMethod = shipment?.allocationMethod;
      if (!allocationMethod) {
        // Auto-select based on shipment unit type (for freight costs)
        switch (shipmentUnitType) {
          case 'containers':
          case 'container':
            allocationMethod = 'VALUE';
            break;
          case 'pallets':
          case 'pallet':
            allocationMethod = 'QUANTITY';
            break;
          case 'boxes':
          case 'box':
          case 'parcels':
          case 'parcel':
          case 'packages':
          case 'package':
            allocationMethod = 'CHARGEABLE_WEIGHT';
            break;
          case 'mixed':
          default:
            allocationMethod = 'HYBRID';
            break;
        }
        console.log(`[addInventoryOnCompletion] Auto-selected ${allocationMethod} allocation based on unitType: ${shipmentUnitType}`);
      }
      
      console.log(`[addInventoryOnCompletion] Shipment ${shipmentId}: shipping=${shipmentShippingCost} ${shipmentShippingCurrency}, insurance=${shipmentInsuranceCost}, allocation=${allocationMethod} (unitType: ${shipmentUnitType})`);
      
      // Step 2: Get all receipt items with productId, receivedQuantity, AND itemId/itemType/sku for fallback lookups
      // ALSO include variantAllocations for variant quantity distribution
      const allReceiptItems = await db
        .select({
          id: receiptItems.id,
          productId: receiptItems.productId,
          receivedQuantity: receiptItems.receivedQuantity,
          assignedQuantity: receiptItems.assignedQuantity,
          itemId: receiptItems.itemId,
          itemType: receiptItems.itemType,
          sku: receiptItems.sku,
          variantAllocations: receiptItems.variantAllocations
        })
        .from(receiptItems)
        .where(inArray(receiptItems.receiptId, receiptIds));
      
      if (allReceiptItems.length === 0) {
        console.log(`[addInventoryOnCompletion] No receipt items found for shipment ${shipmentId}`);
        return inventoryUpdates;
      }
      
      // Step 3: AGGREGATE quantities by productId to avoid duplicate updates
      // IMPORTANT: Try to resolve productId from linked purchase/custom items if NULL
      const productQuantityMap = new Map<string, { quantity: number; items: typeof allReceiptItems }>();
      
      for (const item of allReceiptItems) {
        // Use assignedQuantity first (what was stored in locations), fall back to receivedQuantity
        const qty = item.assignedQuantity || item.receivedQuantity || 0;
        if (qty <= 0) continue;
        
        // Try to resolve productId from receipt item or via SKU lookup
        let resolvedProductId = item.productId;
        
        // If productId is NULL, try to resolve via sku field
        if (!resolvedProductId && item.sku) {
          const [productBySku] = await db
            .select({ id: products.id })
            .from(products)
            .where(eq(products.sku, item.sku));
          if (productBySku) {
            resolvedProductId = productBySku.id;
            console.log(`[addInventoryOnCompletion] Resolved productId ${resolvedProductId} from receipt item SKU ${item.sku}`);
          }
        }
        
        // If still no productId, try to find via original purchase/custom item's SKU
        if (!resolvedProductId && item.itemId) {
          let originalItemSku: string | null = null;
          let originalItemPurchaseId: string | null = null;
          
          if (item.itemType === 'purchase') {
            const [purchaseItem] = await db
              .select({ sku: purchaseItems.sku, purchaseId: purchaseItems.purchaseId })
              .from(purchaseItems)
              .where(eq(purchaseItems.id, item.itemId));
            if (purchaseItem) {
              originalItemSku = purchaseItem.sku;
              originalItemPurchaseId = purchaseItem.purchaseId;
            }
          } else if (item.itemType === 'custom') {
            const [customItem] = await db
              .select({ orderItems: customItems.orderItems })
              .from(customItems)
              .where(eq(customItems.id, item.itemId));
            if (customItem?.orderItems) {
              try {
                const orderItems = typeof customItem.orderItems === 'string' 
                  ? JSON.parse(customItem.orderItems) 
                  : customItem.orderItems;
                if (Array.isArray(orderItems) && orderItems[0]?.sku) {
                  originalItemSku = orderItems[0].sku;
                }
              } catch (e) { /* ignore parse errors */ }
            }
          }
          
          if (originalItemSku) {
            const [productBySku] = await db
              .select({ id: products.id })
              .from(products)
              .where(eq(products.sku, originalItemSku));
            if (productBySku) {
              resolvedProductId = productBySku.id;
              console.log(`[addInventoryOnCompletion] Resolved productId ${resolvedProductId} from original item SKU ${originalItemSku}`);
              
              // Also update the receipt item with the resolved productId and sku for future lookups
              await db
                .update(receiptItems)
                .set({ productId: resolvedProductId, sku: originalItemSku, updatedAt: new Date() })
                .where(eq(receiptItems.id, item.id));
            }
          }
        }
        
        if (!resolvedProductId) {
          console.log(`[addInventoryOnCompletion] Skipping receipt item ${item.id} - could not resolve productId`);
          continue;
        }
        
        const existing = productQuantityMap.get(resolvedProductId);
        if (existing) {
          existing.quantity += qty;
          existing.items.push(item);
        } else {
          productQuantityMap.set(resolvedProductId, { quantity: qty, items: [item] });
        }
      }
      
      console.log(`[addInventoryOnCompletion] Aggregated ${productQuantityMap.size} unique products from ${allReceiptItems.length} receipt items`);
      
      // Step 3b: PRE-COMPUTE shipment totals for allocation methods
      // All values converted to EUR for consistent ratio calculation
      // Uses SIMPLE per-unit equal distribution as the primary method
      // VALUE/WEIGHT methods require consistent data across all products
      type ProductMetrics = {
        receivedUnits: number;
        totalWeightKg: number;
        baseValueEur: number; // Accumulated EUR value (sum of all lines converted)
      };
      const productBreakdown = new Map<string, ProductMetrics>();
      let totalShipmentUnits = 0;
      let totalShipmentWeightKg = 0;
      let totalShipmentValueEur = 0;
      
      // Iterate productQuantityMap to build breakdown - accumulate per line, don't overwrite
      for (const [productId, data] of productQuantityMap.entries()) {
        let productUnits = 0;
        let productWeightKg = 0;
        let productBaseValueEur = 0;
        
        for (const item of data.items) {
          const receivedQty = item.assignedQuantity || item.receivedQuantity || 0;
          productUnits += receivedQty;
          
          if (item.itemId && item.itemType === 'purchase') {
            const [pi] = await db
              .select({ 
                unitPrice: purchaseItems.unitPrice, 
                weight: purchaseItems.weight,
                unitGrossWeightKg: purchaseItems.unitGrossWeightKg,
                purchaseId: purchaseItems.purchaseId,
                costWithShipping: purchaseItems.costWithShipping,
                landingCostUnitBase: purchaseItems.landingCostUnitBase
              })
              .from(purchaseItems)
              .where(eq(purchaseItems.id, item.itemId));
            
            if (pi) {
              // Use cost WITH purchase shipping (same basis as final landed cost)
              // This ensures allocation ratios match the cost structure used in updates
              let lineUnitCost = 0;
              if (pi.costWithShipping && parseFloat(pi.costWithShipping) > 0) {
                lineUnitCost = parseFloat(pi.costWithShipping);
              } else if (pi.landingCostUnitBase && parseFloat(pi.landingCostUnitBase) > 0) {
                lineUnitCost = parseFloat(pi.landingCostUnitBase);
              } else {
                lineUnitCost = parseFloat(pi.unitPrice || '0');
              }
              
              const itemWeight = parseFloat(pi.unitGrossWeightKg || pi.weight || '0');
              productWeightKg += itemWeight * receivedQty;
              
              // Get currency for THIS line and convert to EUR
              let lineCurrency = 'USD';
              if (pi.purchaseId) {
                const [purchase] = await db
                  .select({ paymentCurrency: importPurchases.paymentCurrency, purchaseCurrency: importPurchases.purchaseCurrency })
                  .from(importPurchases)
                  .where(eq(importPurchases.id, pi.purchaseId));
                if (purchase) {
                  lineCurrency = purchase.paymentCurrency || purchase.purchaseCurrency || 'USD';
                }
              }
              
              // Convert this line's value to EUR and ADD to product total
              let linePriceEur = lineUnitCost;
              if (lineCurrency === 'CZK') linePriceEur = lineUnitCost / eurToCzk;
              else if (lineCurrency === 'USD') linePriceEur = lineUnitCost * usdToEur;
              else if (lineCurrency === 'VND') linePriceEur = lineUnitCost / eurToVnd;
              else if (lineCurrency === 'CNY') linePriceEur = lineUnitCost / eurToCny;
              
              productBaseValueEur += linePriceEur * receivedQty;
            }
          }
        }
        
        productBreakdown.set(productId, {
          receivedUnits: productUnits,
          totalWeightKg: productWeightKg,
          baseValueEur: productBaseValueEur
        });
        
        totalShipmentUnits += productUnits;
        totalShipmentWeightKg += productWeightKg;
        totalShipmentValueEur += productBaseValueEur;
      }
      
      console.log(`[addInventoryOnCompletion] Shipment totals: ${totalShipmentUnits} units, ${totalShipmentWeightKg.toFixed(2)}kg, ${totalShipmentValueEur.toFixed(2)} EUR`);
      
      // Convert shipment costs to EUR once for allocation calculations
      // Includes: shipping + insurance + brokerage/customs from shipmentCosts table
      let shipmentCostsEur = shipmentShippingCost + shipmentInsuranceCost;
      if (shipmentShippingCurrency === 'USD') shipmentCostsEur = shipmentCostsEur * usdToEur;
      else if (shipmentShippingCurrency === 'CZK') shipmentCostsEur = shipmentCostsEur / eurToCzk;
      else if (shipmentShippingCurrency === 'VND') shipmentCostsEur = shipmentCostsEur / eurToVnd;
      else if (shipmentShippingCurrency === 'CNY') shipmentCostsEur = shipmentCostsEur / eurToCny;
      
      // Add additional costs (brokerage, customs, etc.) - already in EUR
      shipmentCostsEur += additionalCostsEur;
      
      console.log(`[addInventoryOnCompletion] Total shipment costs in EUR: €${shipmentCostsEur.toFixed(2)} (shipping+insurance: €${(shipmentCostsEur - additionalCostsEur).toFixed(2)}, additional: €${additionalCostsEur.toFixed(2)})`);
      
      // Helper: compute share based on allocation method
      // All bases are in EUR to ensure Σ(ratios) = 1
      function computeShipmentShare(metrics: ProductMetrics): number {
        switch (allocationMethod) {
          case 'CHARGEABLE_WEIGHT':
            return totalShipmentWeightKg > 0 ? metrics.totalWeightKg / totalShipmentWeightKg : (totalShipmentUnits > 0 ? metrics.receivedUnits / totalShipmentUnits : 0);
          case 'VALUE':
          case 'HYBRID':
            return totalShipmentValueEur > 0 ? metrics.baseValueEur / totalShipmentValueEur : (totalShipmentUnits > 0 ? metrics.receivedUnits / totalShipmentUnits : 0);
          case 'PER_UNIT':
          case 'QUANTITY':
          default:
            return totalShipmentUnits > 0 ? metrics.receivedUnits / totalShipmentUnits : 0;
        }
      }
      
      // Step 4: Update each product's inventory AND import costs with aggregated data
      for (const [productId, data] of productQuantityMap.entries()) {
        try {
          const quantityToAdd = data.quantity;
          const firstItem = data.items[0];
          
          // Get current product with all cost fields
          const [product] = await db
            .select()
            .from(products)
            .where(eq(products.id, productId));
          
          if (!product) {
            console.log(`[addInventoryOnCompletion] Product ${productId} not found`);
            continue;
          }
          
          // Add aggregated quantity to product's main stock quantity
          const currentStock = product.quantity || 0;
          const newStock = currentStock + quantityToAdd;
          
          // Get unit cost from original purchase/custom item for import cost calculation
          // INCLUDES: base unit price + purchase shipping portion + shipment shipping portion + insurance
          let unitCost = 0;
          let purchaseCurrency = 'USD';
          let purchaseShippingPerUnit = 0;
          
          if (firstItem.itemId && firstItem.itemType === 'purchase') {
            const [purchaseItem] = await db
              .select({ 
                unitPrice: purchaseItems.unitPrice, 
                purchaseId: purchaseItems.purchaseId,
                quantity: purchaseItems.quantity,
                costWithShipping: purchaseItems.costWithShipping,
                landingCostUnitBase: purchaseItems.landingCostUnitBase
              })
              .from(purchaseItems)
              .where(eq(purchaseItems.id, firstItem.itemId));
            
            if (purchaseItem) {
              // Use costWithShipping or landingCostUnitBase if available (already includes shipping)
              // Otherwise calculate from unit price + purchase shipping
              if (purchaseItem.costWithShipping && parseFloat(purchaseItem.costWithShipping) > 0) {
                unitCost = parseFloat(purchaseItem.costWithShipping);
              } else if (purchaseItem.landingCostUnitBase && parseFloat(purchaseItem.landingCostUnitBase) > 0) {
                unitCost = parseFloat(purchaseItem.landingCostUnitBase);
              } else {
                unitCost = parseFloat(purchaseItem.unitPrice || '0');
              }
              
              // Get purchase currency AND shipping cost to distribute
              if (purchaseItem.purchaseId) {
                const [purchase] = await db
                  .select({ 
                    purchaseCurrency: importPurchases.purchaseCurrency, 
                    paymentCurrency: importPurchases.paymentCurrency,
                    shippingCost: importPurchases.shippingCost,
                    shippingCurrency: importPurchases.shippingCurrency,
                    totalCost: importPurchases.totalCost
                  })
                  .from(importPurchases)
                  .where(eq(importPurchases.id, purchaseItem.purchaseId));
                if (purchase) {
                  purchaseCurrency = purchase.paymentCurrency || purchase.purchaseCurrency || 'USD';
                  
                  // If costWithShipping wasn't pre-calculated, add purchase shipping portion
                  if (!purchaseItem.costWithShipping || parseFloat(purchaseItem.costWithShipping) <= 0) {
                    const purchaseShipping = parseFloat(purchase.shippingCost || '0');
                    if (purchaseShipping > 0) {
                      // Get total items in purchase to distribute shipping
                      const purchaseItemsCount = await db
                        .select({ totalQty: sql<number>`SUM(${purchaseItems.quantity})` })
                        .from(purchaseItems)
                        .where(eq(purchaseItems.purchaseId, purchaseItem.purchaseId));
                      const totalQty = purchaseItemsCount[0]?.totalQty || 1;
                      purchaseShippingPerUnit = purchaseShipping / totalQty;
                      unitCost += purchaseShippingPerUnit;
                      console.log(`[addInventoryOnCompletion] Added purchase shipping: ${purchaseShippingPerUnit.toFixed(4)} per unit (total ${purchaseShipping} / ${totalQty} items)`);
                    }
                  }
                }
              }
            }
          } else if (firstItem.itemId && firstItem.itemType === 'custom') {
            // Get custom item cost from orderItems JSON
            // Note: orderItems may use snake_case (unit_price) or camelCase (unitPrice)
            const [customItem] = await db
              .select({ 
                orderItems: customItems.orderItems,
                purchaseOrderId: customItems.purchaseOrderId,
                paymentCurrency: customItems.paymentCurrency
              })
              .from(customItems)
              .where(eq(customItems.id, firstItem.itemId));
            
            // Priority 1: Use dedicated paymentCurrency column (most reliable)
            if (customItem?.paymentCurrency) {
              purchaseCurrency = customItem.paymentCurrency;
              console.log(`[addInventoryOnCompletion] Got payment currency ${purchaseCurrency} from custom item's paymentCurrency column`);
            }
            
            if (customItem?.orderItems) {
              try {
                const orderItems = typeof customItem.orderItems === 'string' 
                  ? JSON.parse(customItem.orderItems) 
                  : customItem.orderItems;
                if (Array.isArray(orderItems) && orderItems.length > 0) {
                  const firstOrderItem = orderItems[0];
                  // Support both snake_case and camelCase keys
                  const itemPrice = firstOrderItem.unit_price || firstOrderItem.unitPrice || firstOrderItem.price || '0';
                  unitCost = parseFloat(String(itemPrice));
                  // Priority 2: Get payment currency from orderItems JSON if not already set
                  if (!purchaseCurrency) {
                    purchaseCurrency = firstOrderItem.payment_currency || firstOrderItem.paymentCurrency || 
                                       firstOrderItem.currency || firstOrderItem.price_currency || '';
                  }
                }
              } catch (e) { 
                console.error(`[addInventoryOnCompletion] Error parsing custom item orderItems:`, e);
              }
            }
            
            // If no currency found from column or orderItems, try multiple fallbacks
            if (!purchaseCurrency) {
              // Fallback 1: Try custom item's linked purchaseOrderId
              if (customItem?.purchaseOrderId) {
                const [linkedPurchase] = await db
                  .select({ paymentCurrency: importPurchases.paymentCurrency })
                  .from(importPurchases)
                  .where(eq(importPurchases.id, customItem.purchaseOrderId));
                
                if (linkedPurchase?.paymentCurrency) {
                  purchaseCurrency = linkedPurchase.paymentCurrency;
                  console.log(`[addInventoryOnCompletion] Got payment currency ${purchaseCurrency} from custom item's linked purchaseOrderId`);
                }
              }
              
              // Fallback 2: Try shipment's consolidation
              if (!purchaseCurrency && shipment?.consolidationId) {
                const consolidatedPurchases = await db
                  .select({ paymentCurrency: importPurchases.paymentCurrency })
                  .from(purchaseItems)
                  .innerJoin(importPurchases, eq(purchaseItems.purchaseId, importPurchases.id))
                  .where(eq(purchaseItems.consolidationId, shipment.consolidationId))
                  .limit(1);
                
                if (consolidatedPurchases.length > 0 && consolidatedPurchases[0].paymentCurrency) {
                  purchaseCurrency = consolidatedPurchases[0].paymentCurrency;
                  console.log(`[addInventoryOnCompletion] Got payment currency ${purchaseCurrency} from consolidated purchase`);
                }
              }
              
              // Fallback 3: Try to get from other receipt items in same receipt that are purchase type
              if (!purchaseCurrency && firstItem.receiptId) {
                const otherPurchaseItems = await db
                  .select({ paymentCurrency: importPurchases.paymentCurrency })
                  .from(receiptItems)
                  .innerJoin(purchaseItems, eq(receiptItems.itemId, purchaseItems.id))
                  .innerJoin(importPurchases, eq(purchaseItems.purchaseId, importPurchases.id))
                  .where(and(
                    eq(receiptItems.receiptId, firstItem.receiptId),
                    eq(receiptItems.itemType, 'purchase')
                  ))
                  .limit(1);
                
                if (otherPurchaseItems.length > 0 && otherPurchaseItems[0].paymentCurrency) {
                  purchaseCurrency = otherPurchaseItems[0].paymentCurrency;
                  console.log(`[addInventoryOnCompletion] Got payment currency ${purchaseCurrency} from sibling purchase item in receipt`);
                }
              }
              
              // Fallback 4: Use shipment's shipping currency - log warning for finance review
              if (!purchaseCurrency) {
                purchaseCurrency = shipmentShippingCurrency || 'EUR';
                console.warn(`[addInventoryOnCompletion] WARNING: No payment currency found for custom item ${firstItem.itemId}. ` +
                  `Using shipment shipping currency ${purchaseCurrency} as fallback. FINANCE REVIEW RECOMMENDED - ` +
                  `landed costs may not reflect actual purchase currency. Consider setting paymentCurrency on the custom item.`);
              }
            }
          }
          
          // Add shipment-level shipping cost using pre-computed allocation shares
          let shipmentCostPerUnit = 0;
          let freightPerUnitEur = 0; // Keep EUR version for variants (avoids double conversion)
          if (shipmentCostsEur > 0) {
            const productMetrics = productBreakdown.get(productId);
            if (productMetrics) {
              // Calculate this product's share of shipment costs
              const shareRatio = computeShipmentShare(productMetrics);
              const productTotalFreightEur = shipmentCostsEur * shareRatio;
              freightPerUnitEur = quantityToAdd > 0 ? productTotalFreightEur / quantityToAdd : 0;
              
              // Convert freight from EUR to purchase currency (for parent product)
              // Uses helper function to support all currencies (USD, CZK, VND, CNY, GBP, JPY, CHF, AUD, CAD)
              shipmentCostPerUnit = fromEur(freightPerUnitEur, purchaseCurrency);
              
              unitCost += shipmentCostPerUnit;
              console.log(`[addInventoryOnCompletion] ${allocationMethod} allocation: €${freightPerUnitEur.toFixed(4)}/unit = ${shipmentCostPerUnit.toFixed(4)} ${purchaseCurrency}/unit (${(shareRatio * 100).toFixed(1)}% of shipment)`);
            }
          }
          
          // If no unit cost could be determined, still add quantity but log warning for finance review
          if (unitCost <= 0) {
            console.warn(`[addInventoryOnCompletion] WARNING: No unit cost found for product ${productId} (${product.sku}), item: ${firstItem.itemId}, type: ${firstItem.itemType}. Adding quantity without cost update - FINANCE REVIEW REQUIRED.`);
            
            // Add quantity but preserve existing costs (don't wipe them)
            await db
              .update(products)
              .set({ 
                quantity: newStock,
                updatedAt: new Date()
              })
              .where(eq(products.id, productId));
            
            inventoryUpdates.push(`Product ${product.sku || productId}: +${quantityToAdd} units (${currentStock} → ${newStock}) [NO COST DATA - REVIEW REQUIRED]`);
            console.log(`[addInventoryOnCompletion] Product ${productId}: added ${quantityToAdd} units (${currentStock} → ${newStock}), existing costs preserved due to missing pricing data`);
            continue;
          }
          
          // Calculate weighted average import costs for all currencies
          const oldQuantity = currentStock;
          const newQuantity = quantityToAdd;
          const totalQuantity = oldQuantity + newQuantity;
          
          // Current product import costs
          const oldCostUsd = parseFloat(product.importCostUsd || '0');
          const oldCostCzk = parseFloat(product.importCostCzk || '0');
          const oldCostEur = parseFloat(product.importCostEur || '0');
          const oldCostVnd = parseFloat(product.importCostVnd || '0');
          const oldCostCny = parseFloat(product.importCostCny || '0');
          
          // Exchange rates were fetched once at function start - use toEur/fromEur helpers
          // Convert new unit cost from purchase currency to EUR, then to all currencies
          const newCostEur = toEur(unitCost, purchaseCurrency);
          const newCostUsd = fromEur(newCostEur, 'USD');
          const newCostCzk = fromEur(newCostEur, 'CZK');
          const newCostVnd = fromEur(newCostEur, 'VND');
          const newCostCny = fromEur(newCostEur, 'CNY');
          
          // Derive old costs from any available currency if some are missing
          // Find the best source currency (one that has a value) and derive ALL others from it
          let derivedOldEur = oldCostEur;
          
          // Determine source currency for derivation (find any non-zero cost and convert to EUR)
          if (derivedOldEur === 0 && oldCostUsd > 0) derivedOldEur = toEur(oldCostUsd, 'USD');
          else if (derivedOldEur === 0 && oldCostCzk > 0) derivedOldEur = toEur(oldCostCzk, 'CZK');
          else if (derivedOldEur === 0 && oldCostVnd > 0) derivedOldEur = toEur(oldCostVnd, 'VND');
          else if (derivedOldEur === 0 && oldCostCny > 0) derivedOldEur = toEur(oldCostCny, 'CNY');
          
          // Derive all currencies from EUR
          const derivedOldUsd = oldCostUsd > 0 ? oldCostUsd : fromEur(derivedOldEur, 'USD');
          const derivedOldCzk = oldCostCzk > 0 ? oldCostCzk : fromEur(derivedOldEur, 'CZK');
          const derivedOldVnd = oldCostVnd > 0 ? oldCostVnd : fromEur(derivedOldEur, 'VND');
          const derivedOldCny = oldCostCny > 0 ? oldCostCny : fromEur(derivedOldEur, 'CNY');
          
          // Calculate weighted averages for all currencies
          const avgCostUsd = totalQuantity > 0 
            ? ((oldQuantity * derivedOldUsd) + (newQuantity * newCostUsd)) / totalQuantity 
            : newCostUsd;
          const avgCostCzk = totalQuantity > 0 
            ? ((oldQuantity * derivedOldCzk) + (newQuantity * newCostCzk)) / totalQuantity 
            : newCostCzk;
          const avgCostEur = totalQuantity > 0 
            ? ((oldQuantity * derivedOldEur) + (newQuantity * newCostEur)) / totalQuantity 
            : newCostEur;
          const avgCostVnd = totalQuantity > 0 
            ? ((oldQuantity * derivedOldVnd) + (newQuantity * newCostVnd)) / totalQuantity 
            : newCostVnd;
          const avgCostCny = totalQuantity > 0 
            ? ((oldQuantity * derivedOldCny) + (newQuantity * newCostCny)) / totalQuantity 
            : newCostCny;
          
          // Update product with new quantity AND import costs
          await db
            .update(products)
            .set({ 
              quantity: newStock,
              importCostUsd: avgCostUsd > 0 ? avgCostUsd.toFixed(2) : null,
              importCostCzk: avgCostCzk > 0 ? avgCostCzk.toFixed(2) : null,
              importCostEur: avgCostEur > 0 ? avgCostEur.toFixed(2) : null,
              importCostVnd: avgCostVnd > 0 ? avgCostVnd.toFixed(0) : null,
              importCostCny: avgCostCny > 0 ? avgCostCny.toFixed(2) : null,
              updatedAt: new Date()
            })
            .where(eq(products.id, productId));
          
          // Record cost history
          await db.insert(productCostHistory).values({
            productId: productId,
            landingCostUnitBase: avgCostUsd > 0 ? avgCostUsd.toFixed(4) : '0',
            method: 'weighted_average',
            computedAt: new Date()
          });
          
          inventoryUpdates.push(`Product ${product.sku || productId}: +${quantityToAdd} units (${currentStock} → ${newStock}), costs updated`);
          console.log(`[addInventoryOnCompletion] Product ${productId}: added ${quantityToAdd} units (${currentStock} → ${newStock}), import costs: USD=${avgCostUsd.toFixed(2)} CZK=${avgCostCzk.toFixed(2)} EUR=${avgCostEur.toFixed(2)}`);
          
          // VARIANT DISTRIBUTION: If receipt items have variantAllocations, distribute quantities to individual variants
          for (const receiptItem of data.items) {
            if (!receiptItem.variantAllocations) continue;
            
            try {
              const allocations = typeof receiptItem.variantAllocations === 'string' 
                ? JSON.parse(receiptItem.variantAllocations) 
                : receiptItem.variantAllocations;
              
              if (!Array.isArray(allocations) || allocations.length === 0) continue;
              
              console.log(`[addInventoryOnCompletion] Processing ${allocations.length} variant allocations for product ${productId}`);
              
              // Get existing variants for this product
              const existingVariants = await db
                .select()
                .from(productVariants)
                .where(eq(productVariants.productId, productId));
              
              for (const allocation of allocations) {
                const variantName = allocation.variantName || allocation.name;
                const variantSku = allocation.sku || allocation.variantSku;
                const allocatedQty = allocation.quantity || allocation.receivedQuantity || 0;
                
                // Variant allocation unit prices are ALWAYS in EUR
                // Get base unit price in EUR from allocation
                let variantUnitPriceEur = parseFloat(allocation.unitPrice || allocation.unit_price || '0');
                
                // Add shipment costs per unit to variant - use EUR directly (avoid double conversion)
                if (freightPerUnitEur > 0) {
                  variantUnitPriceEur += freightPerUnitEur;
                }
                
                // Fall back to parent unit cost (converted to EUR) if no variant price
                if (variantUnitPriceEur <= 0) {
                  // Convert parent unitCost from purchaseCurrency to EUR
                  if (purchaseCurrency === 'CZK') variantUnitPriceEur = unitCost / eurToCzk;
                  else if (purchaseCurrency === 'USD') variantUnitPriceEur = unitCost * usdToEur;
                  else if (purchaseCurrency === 'VND') variantUnitPriceEur = unitCost / eurToVnd;
                  else if (purchaseCurrency === 'CNY') variantUnitPriceEur = unitCost / eurToCny;
                  else variantUnitPriceEur = unitCost;
                }
                
                if (!variantName || allocatedQty <= 0) continue;
                
                // Find matching variant by SKU first, then by name
                let matchedVariant = existingVariants.find(v => 
                  (variantSku && v.sku === variantSku) || 
                  v.name === variantName
                );
                
                if (matchedVariant) {
                  // Update existing variant with quantity and pricing
                  const oldVariantQty = matchedVariant.quantity || 0;
                  const newVariantQty = oldVariantQty + allocatedQty;
                  
                  // Calculate costs for variant in all currencies (always from EUR base)
                  const variantNewCosts: any = {
                    importCostEur: variantUnitPriceEur.toFixed(2),
                    importCostCzk: (variantUnitPriceEur * eurToCzk).toFixed(2),
                    importCostUsd: (variantUnitPriceEur * eurToUsd).toFixed(2),
                    importCostVnd: (variantUnitPriceEur * eurToVnd).toFixed(0),
                    importCostCny: (variantUnitPriceEur * eurToCny).toFixed(2),
                  };
                  
                  // Also set selling prices if variant has priceEur in allocation
                  if (allocation.priceEur || allocation.price_eur) {
                    variantNewCosts.priceEur = (allocation.priceEur || allocation.price_eur).toString();
                  }
                  if (allocation.priceCzk || allocation.price_czk) {
                    variantNewCosts.priceCzk = (allocation.priceCzk || allocation.price_czk).toString();
                  }
                  
                  await db
                    .update(productVariants)
                    .set({ 
                      quantity: newVariantQty,
                      sku: variantSku || matchedVariant.sku,
                      barcode: allocation.barcode || matchedVariant.barcode,
                      ...variantNewCosts,
                      updatedAt: new Date()
                    })
                    .where(eq(productVariants.id, matchedVariant.id));
                  
                  console.log(`[addInventoryOnCompletion] Updated variant ${variantName}: +${allocatedQty} (${oldVariantQty} → ${newVariantQty}), import cost: €${variantUnitPriceEur.toFixed(2)} (USD=${variantNewCosts.importCostUsd})`);
                } else {
                  console.log(`[addInventoryOnCompletion] Variant ${variantName} not found for product ${productId} - skipping`);
                }
              }
            } catch (variantError) {
              console.error(`[addInventoryOnCompletion] Error processing variant allocations:`, variantError);
            }
          }
          
        } catch (itemError) {
          console.error(`[addInventoryOnCompletion] Error updating inventory for product ${productId}:`, itemError);
        }
      }
      
      return inventoryUpdates;
    } catch (error) {
      console.error('[addInventoryOnCompletion] Error:', error);
      return inventoryUpdates;
    }
  }

  // Update shipment receiving status
  app.patch('/api/imports/shipments/:id/receiving-status', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { receivingStatus } = req.body;
      
      // Validate receivingStatus value
      const validStatuses = ['receiving', 'pending_approval', 'completed', 'archived'];
      if (!receivingStatus || !validStatuses.includes(receivingStatus)) {
        return res.status(400).json({ 
          message: 'Invalid receiving status. Must be one of: ' + validStatuses.join(', ')
        });
      }
      
      // CRITICAL: Get current status BEFORE updating to prevent duplicate inventory additions
      const [currentShipment] = await db
        .select({ receivingStatus: shipments.receivingStatus })
        .from(shipments)
        .where(eq(shipments.id, id));
      
      if (!currentShipment) {
        return res.status(404).json({ message: 'Shipment not found' });
      }
      
      const wasAlreadyCompleted = currentShipment.receivingStatus === 'completed';
      const isTransitioningToCompleted = receivingStatus === 'completed' && !wasAlreadyCompleted;
      
      // Prevent completing an already completed shipment (idempotency guard)
      if (receivingStatus === 'completed' && wasAlreadyCompleted) {
        console.log(`[receiving-status] Shipment ${id} is already completed - skipping inventory addition`);
        return res.status(400).json({ 
          message: 'Shipment is already completed. Use revert first if you need to re-process.',
          currentStatus: 'completed'
        });
      }
      
      // Update the shipment (id is UUID string, not integer)
      const [updated] = await db
        .update(shipments)
        .set({ 
          receivingStatus,
          updatedAt: new Date(),
          ...(receivingStatus === 'completed' ? { completedAt: new Date() } : {}),
          ...(receivingStatus === 'archived' ? { archivedAt: new Date() } : {})
        })
        .where(eq(shipments.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ message: 'Shipment not found' });
      }
      
      // Respond immediately for swift UX - let frontend move card to Completed tab
      res.json({
        ...updated,
        processingAsync: isTransitioningToCompleted
      });
      
      // Only add inventory when TRANSITIONING to completed (not if already completed)
      // Process asynchronously AFTER response is sent for immediate visual feedback
      if (isTransitioningToCompleted) {
        setImmediate(async () => {
          try {
            console.log(`[receiving-status] Shipment ${id} - async background processing started`);
            
            // Add received quantities to product inventory
            const inventoryUpdates = await addInventoryOnCompletion(id);
            console.log(`[receiving-status] Shipment ${id} - inventory updates: ${inventoryUpdates.length} products`);
            
            // Calculate and update average landed costs for products (id is UUID string)
            const updatedProductCosts = await calculateAndUpdateLandedCosts(id);
            console.log(`[receiving-status] Shipment ${id} - cost updates: ${updatedProductCosts.length} products`);
            
            // Reconcile purchase order delivery statuses
            const updatedPurchases = await reconcilePurchaseDeliveryForShipment(id);
            console.log(`[receiving-status] Shipment ${id} - reconciled ${updatedPurchases.length} purchase orders`);
            
            console.log(`[receiving-status] Shipment ${id} - async background processing completed successfully`);
          } catch (asyncError) {
            console.error(`[receiving-status] Shipment ${id} - async background processing failed:`, asyncError);
          }
        });
      }
    } catch (error) {
      console.error('Error updating shipment receiving status:', error);
      res.status(500).json({ message: 'Failed to update shipment status' });
    }
  });

  // Retry inventory processing for a completed shipment (recovery endpoint)
  // Use this when async processing failed or server restarted before completion
  app.post('/api/imports/shipments/:id/retry-inventory', requireRole(['administrator']), async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the shipment and verify it's in completed status
      const [shipment] = await db
        .select()
        .from(shipments)
        .where(eq(shipments.id, id));
      
      if (!shipment) {
        return res.status(404).json({ message: 'Shipment not found' });
      }
      
      if (shipment.receivingStatus !== 'completed') {
        return res.status(400).json({ 
          message: 'Shipment must be in completed status to retry inventory processing',
          currentStatus: shipment.receivingStatus
        });
      }
      
      console.log(`[retry-inventory] Starting retry for shipment ${id}`);
      
      // Run inventory processing synchronously for immediate feedback
      const inventoryUpdates = await addInventoryOnCompletion(id);
      console.log(`[retry-inventory] Shipment ${id} - inventory updates: ${inventoryUpdates.length} products`);
      
      // Calculate and update average landed costs for products
      const updatedProductCosts = await calculateAndUpdateLandedCosts(id);
      console.log(`[retry-inventory] Shipment ${id} - cost updates: ${updatedProductCosts.length} products`);
      
      // Reconcile purchase order delivery statuses
      const updatedPurchases = await reconcilePurchaseDeliveryForShipment(id);
      console.log(`[retry-inventory] Shipment ${id} - reconciled ${updatedPurchases.length} purchase orders`);
      
      console.log(`[retry-inventory] Shipment ${id} - completed successfully`);
      
      res.json({
        success: true,
        message: 'Inventory processing completed',
        inventoryUpdates,
        costUpdates: updatedProductCosts.length,
        purchaseReconciliations: updatedPurchases.length
      });
    } catch (error) {
      console.error('Error retrying inventory processing:', error);
      res.status(500).json({ message: 'Failed to retry inventory processing' });
    }
  });

  // Revert completed shipment back to receiving - reverses inventory and cost changes
  app.post('/api/imports/shipments/:id/revert-to-receiving', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the shipment and verify it's in completed status
      const [shipment] = await db
        .select()
        .from(shipments)
        .where(eq(shipments.id, id));
      
      if (!shipment) {
        return res.status(404).json({ message: 'Shipment not found' });
      }
      
      if (shipment.receivingStatus !== 'completed') {
        return res.status(400).json({ 
          message: 'Only completed shipments can be reverted to receiving',
          currentStatus: shipment.receivingStatus
        });
      }
      
      const revertResults = {
        inventoryReverted: [] as string[],
        costHistoryRemoved: [] as string[],
        purchaseOrdersReverted: [] as string[]
      };
      
      // Step 1: Find all receipts for this shipment
      const shipmentReceipts = await db
        .select({ id: receipts.id })
        .from(receipts)
        .where(eq(receipts.shipmentId, id));
      
      const receiptIds = shipmentReceipts.map(r => r.id);
      
      if (receiptIds.length > 0) {
        // Step 2: Get all receipt items with stored locations
        const allReceiptItems = await db
          .select({
            id: receiptItems.id,
            productId: receiptItems.productId,
            itemId: receiptItems.itemId,
            itemType: receiptItems.itemType,
            receivedQuantity: receiptItems.receivedQuantity,
            storedLocations: receiptItems.storedLocations
          })
          .from(receiptItems)
          .where(inArray(receiptItems.receiptId, receiptIds));
        
        // Step 3a: AGGREGATE quantities by productId first to avoid duplicate subtractions
        // (mirrors the aggregation in addInventoryOnCompletion)
        const productQuantityMap = new Map<string, number>();
        for (const item of allReceiptItems) {
          if (!item.productId) continue;
          const qty = item.receivedQuantity || 0;
          if (qty > 0) {
            const existingQty = productQuantityMap.get(item.productId) || 0;
            productQuantityMap.set(item.productId, existingQty + qty);
          }
        }
        
        console.log(`[revert-to-receiving] Aggregated ${productQuantityMap.size} unique products from ${allReceiptItems.length} receipt items`);
        
        // Step 3b: Subtract aggregated quantity from each product ONCE
        for (const [productId, quantityToSubtract] of productQuantityMap.entries()) {
          try {
            const [product] = await db
              .select({ id: products.id, quantity: products.quantity, sku: products.sku })
              .from(products)
              .where(eq(products.id, productId));
            
            if (product) {
              const currentStock = product.quantity || 0;
              const newStockQuantity = Math.max(0, currentStock - quantityToSubtract);
              await db
                .update(products)
                .set({ 
                  quantity: newStockQuantity,
                  updatedAt: new Date()
                })
                .where(eq(products.id, productId));
              
              revertResults.inventoryReverted.push(`Product ${product.sku || productId}: -${quantityToSubtract} units (${currentStock} → ${newStockQuantity})`);
              console.log(`[revert-to-receiving] Product ${productId}: subtracted ${quantityToSubtract} units (${currentStock} → ${newStockQuantity})`);
            }
          } catch (stockError) {
            console.error(`Error subtracting stock for product ${productId}:`, stockError);
          }
        }
        
        // Step 3c: Clean up productLocations for items that had stored locations
        for (const item of allReceiptItems) {
          if (!item.productId || !item.storedLocations) continue;
          
          try {
            // Parse stored locations
            const locations = typeof item.storedLocations === 'string' 
              ? JSON.parse(item.storedLocations) 
              : item.storedLocations;
            
            if (!Array.isArray(locations) || locations.length === 0) continue;
            
            // For each stored location, reduce quantity in productLocations table
            for (const loc of locations) {
              const locationCode = loc.locationCode || loc.location;
              const quantity = parseInt(loc.quantity) || 0;
              
              if (!locationCode || quantity <= 0) continue;
              
              // Find the product location
              const [productLocation] = await db
                .select()
                .from(productLocations)
                .where(and(
                  eq(productLocations.productId, item.productId),
                  eq(productLocations.locationCode, locationCode)
                ));
              
              if (productLocation) {
                const newQuantity = Math.max(0, (productLocation.quantity || 0) - quantity);
                
                if (newQuantity === 0) {
                  // Delete the location if quantity becomes 0
                  await db
                    .delete(productLocations)
                    .where(eq(productLocations.id, productLocation.id));
                  console.log(`[revert-to-receiving] Removed location ${locationCode} for product ${item.productId}`);
                } else {
                  // Update the quantity
                  await db
                    .update(productLocations)
                    .set({ 
                      quantity: newQuantity,
                      updatedAt: new Date()
                    })
                    .where(eq(productLocations.id, productLocation.id));
                  console.log(`[revert-to-receiving] Reduced ${locationCode} by ${quantity} units for product ${item.productId}`);
                }
              }
            }
            
            // Clear the stored locations and reset assignedQuantity from receipt item
            await db
              .update(receiptItems)
              .set({ 
                storedLocations: null,
                assignedQuantity: 0 // Reset so completion can re-add inventory
              })
              .where(eq(receiptItems.id, item.id));
            
          } catch (locError) {
            console.error(`Error reverting locations for receipt item ${item.id}:`, locError);
          }
        }
        
        // Step 4: Remove cost history entries and restore product costs to pre-completion values
        // Find product IDs that were affected
        const productIdsAffected = [...new Set(
          allReceiptItems
            .filter(ri => ri.productId)
            .map(ri => ri.productId!)
        )];
        
        if (productIdsAffected.length > 0 && shipment.completedAt) {
          const completedTime = new Date(shipment.completedAt);
          const fiveMinutesBefore = new Date(completedTime.getTime() - 5 * 60 * 1000);
          const fiveMinutesAfter = new Date(completedTime.getTime() + 5 * 60 * 1000);
          
          // For each affected product, restore to pre-completion cost
          for (const productId of productIdsAffected) {
            try {
              // Find the most recent cost history entry BEFORE completion
              const [previousCostEntry] = await db
                .select({
                  landingCostUnitBase: productCostHistory.landingCostUnitBase
                })
                .from(productCostHistory)
                .where(and(
                  eq(productCostHistory.productId, productId),
                  sql`${productCostHistory.computedAt} < ${fiveMinutesBefore.toISOString()}::timestamp`
                ))
                .orderBy(desc(productCostHistory.computedAt))
                .limit(1);
              
              // Restore product's landing cost to pre-completion value
              if (previousCostEntry) {
                await db
                  .update(products)
                  .set({ 
                    landingCostCzk: previousCostEntry.landingCostUnitBase,
                    updatedAt: new Date()
                  })
                  .where(eq(products.id, productId));
                revertResults.costHistoryRemoved.push(`Restored cost for product ${productId} to ${previousCostEntry.landingCostUnitBase}`);
              } else {
                // No previous entry - clear the landing cost
                await db
                  .update(products)
                  .set({ 
                    landingCostCzk: null,
                    updatedAt: new Date()
                  })
                  .where(eq(products.id, productId));
                revertResults.costHistoryRemoved.push(`Cleared cost for product ${productId} (no previous history)`);
              }
              
              // Delete cost history entries created during completion
              await db
                .delete(productCostHistory)
                .where(and(
                  eq(productCostHistory.productId, productId),
                  sql`${productCostHistory.computedAt} >= ${fiveMinutesBefore.toISOString()}::timestamp`,
                  sql`${productCostHistory.computedAt} <= ${fiveMinutesAfter.toISOString()}::timestamp`
                ));
                
            } catch (costError) {
              console.error(`Error restoring cost for product ${productId}:`, costError);
            }
          }
        }
        
        // Step 5: Revert purchase order status if changed to 'delivered'
        // Find linked purchase IDs
        const purchaseItemIds = allReceiptItems
          .filter(ri => ri.itemType === 'purchase')
          .map(ri => ri.itemId);
        
        if (purchaseItemIds.length > 0) {
          const linkedPurchaseItems = await db
            .select({ purchaseId: purchaseItems.purchaseId })
            .from(purchaseItems)
            .where(inArray(purchaseItems.id, purchaseItemIds));
          
          const purchaseIds = [...new Set(linkedPurchaseItems.map(pi => pi.purchaseId).filter(Boolean))] as number[];
          
          for (const purchaseId of purchaseIds) {
            // Revert to 'shipped' if it's currently 'delivered'
            const [updated] = await db
              .update(importPurchases)
              .set({ 
                status: 'shipped',
                updatedAt: new Date()
              })
              .where(and(
                eq(importPurchases.id, purchaseId),
                eq(importPurchases.status, 'delivered')
              ))
              .returning();
            
            if (updated) {
              revertResults.purchaseOrdersReverted.push(`Purchase #${purchaseId} reverted to shipped`);
            }
          }
        }
      }
      
      // Step 6: Update shipment status back to receiving
      const [updated] = await db
        .update(shipments)
        .set({ 
          receivingStatus: 'receiving',
          completedAt: null,
          updatedAt: new Date()
        })
        .where(eq(shipments.id, id))
        .returning();
      
      // Step 7: Update receipt status if exists
      if (receiptIds.length > 0) {
        await db
          .update(receipts)
          .set({ 
            status: 'receiving',
            updatedAt: new Date()
          })
          .where(inArray(receipts.id, receiptIds));
      }
      
      console.log(`Shipment ${id} reverted to receiving:`, revertResults);
      
      res.json({
        success: true,
        message: 'Shipment reverted to receiving successfully',
        shipment: updated,
        revertResults
      });
    } catch (error) {
      console.error('Error reverting shipment to receiving:', error);
      res.status(500).json({ message: 'Failed to revert shipment to receiving' });
    }
  });

  // Delete import shipment and all related data
  app.delete('/api/imports/shipments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Get shipment to verify it exists
      const [shipment] = await db
        .select()
        .from(shipments)
        .where(eq(shipments.id, id));
      
      if (!shipment) {
        return res.status(404).json({ message: 'Shipment not found' });
      }
      
      const deletionResults = {
        receipts: 0,
        receiptItems: 0,
        productLocations: 0,
        consolidationItems: 0,
        consolidation: 0,
        shipment: 0
      };
      
      // Step 0: Get the consolidation ID before deleting shipment
      const consolidationId = shipment.consolidationId;
      
      // Step 1: Find all receipts for this shipment
      const shipmentReceipts = await db
        .select({ id: receipts.id })
        .from(receipts)
        .where(eq(receipts.shipmentId, id));
      
      const receiptIds = shipmentReceipts.map(r => r.id);
      
      // Step 2: Delete receipt items if any receipts exist
      if (receiptIds.length > 0) {
        // Get all receipt items to find product locations to clean up
        const allReceiptItems = await db
          .select({
            id: receiptItems.id,
            productId: receiptItems.productId
          })
          .from(receiptItems)
          .where(inArray(receiptItems.receiptId, receiptIds));
        
        // Delete product locations tagged with these receipt items
        for (const item of allReceiptItems) {
          const tagPattern = `RI:${item.id}:%`;
          const deleted = await db
            .delete(productLocations)
            .where(sql`${productLocations.notes} LIKE ${tagPattern}`)
            .returning();
          deletionResults.productLocations += deleted.length;
        }
        
        // Delete receipt items
        const deletedItems = await db
          .delete(receiptItems)
          .where(inArray(receiptItems.receiptId, receiptIds))
          .returning();
        deletionResults.receiptItems = deletedItems.length;
        
        // Delete receipts
        const deletedReceipts = await db
          .delete(receipts)
          .where(inArray(receipts.id, receiptIds))
          .returning();
        deletionResults.receipts = deletedReceipts.length;
      }
      
      // Step 3: Delete the shipment itself
      const [deletedShipment] = await db
        .delete(shipments)
        .where(eq(shipments.id, id))
        .returning();
      
      if (deletedShipment) {
        deletionResults.shipment = 1;
      }
      
      // Step 4: Delete the associated consolidation and its items (cleanup orphans)
      if (consolidationId) {
        // Delete consolidation items first
        const deletedConsolidationItems = await db
          .delete(consolidationItems)
          .where(eq(consolidationItems.consolidationId, consolidationId))
          .returning();
        deletionResults.consolidationItems = deletedConsolidationItems.length;
        
        // Delete the consolidation itself
        const deletedConsolidation = await db
          .delete(consolidations)
          .where(eq(consolidations.id, consolidationId))
          .returning();
        deletionResults.consolidation = deletedConsolidation.length;
      }
      
      console.log(`Shipment ${id} deleted:`, deletionResults);
      
      res.json({
        success: true,
        message: 'Shipment deleted successfully',
        deletionResults
      });
    } catch (error) {
      console.error('Error deleting shipment:', error);
      res.status(500).json({ message: 'Failed to delete shipment' });
    }
  });

  // Undo import shipment - delete shipment and restore consolidation to active
  app.post('/api/imports/shipments/:id/undo', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Get shipment to verify it exists and get consolidationId
      const [shipment] = await db
        .select()
        .from(shipments)
        .where(eq(shipments.id, id));
      
      if (!shipment) {
        return res.status(404).json({ message: 'Shipment not found' });
      }
      
      const consolidationId = shipment.consolidationId;
      
      // Delete the shipment (just the shipment record, not related data)
      const [deletedShipment] = await db
        .delete(shipments)
        .where(eq(shipments.id, id))
        .returning();
      
      // Restore consolidation to active status if it exists
      let consolidationRestored = false;
      if (consolidationId) {
        await db
          .update(consolidations)
          .set({ 
            status: 'active',
            updatedAt: new Date()
          })
          .where(eq(consolidations.id, consolidationId));
        consolidationRestored = true;
      }
      
      console.log(`Shipment ${id} undone, consolidation ${consolidationId} restored:`, { consolidationRestored });
      
      res.json({
        success: true,
        message: consolidationRestored 
          ? 'Shipment undone and items returned to warehouse'
          : 'Shipment deleted',
        consolidationRestored,
        consolidationId
      });
    } catch (error) {
      console.error('Error undoing shipment:', error);
      res.status(500).json({ message: 'Failed to undo shipment' });
    }
  });

  // Delete consolidation (pending shipment) permanently
  app.delete('/api/imports/consolidations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Get consolidation to verify it exists
      const [consolidation] = await db
        .select()
        .from(consolidations)
        .where(eq(consolidations.id, id));
      
      if (!consolidation) {
        return res.status(404).json({ message: 'Consolidation not found' });
      }
      
      const deletionResults = {
        consolidationItems: 0,
        consolidation: 0
      };
      
      // Step 1: Delete consolidation items
      const deletedItems = await db
        .delete(consolidationItems)
        .where(eq(consolidationItems.consolidationId, id))
        .returning();
      deletionResults.consolidationItems = deletedItems.length;
      
      // Step 2: Delete the consolidation itself
      const [deletedConsolidation] = await db
        .delete(consolidations)
        .where(eq(consolidations.id, id))
        .returning();
      
      if (deletedConsolidation) {
        deletionResults.consolidation = 1;
      }
      
      console.log(`Consolidation ${id} deleted:`, deletionResults);
      
      res.json({
        success: true,
        message: 'Consolidation deleted successfully',
        deletionResults
      });
    } catch (error) {
      console.error('Error deleting consolidation:', error);
      res.status(500).json({ message: 'Failed to delete consolidation' });
    }
  });

  // Get shipment report with full item details including product names
  app.get('/api/imports/shipments/:id/report', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get shipment details
      const [shipment] = await db
        .select()
        .from(shipments)
        .where(eq(shipments.id, id));
      
      if (!shipment) {
        return res.status(404).json({ message: 'Shipment not found' });
      }
      
      // Get receipt for this shipment
      const [receipt] = await db
        .select()
        .from(receipts)
        .where(eq(receipts.shipmentId, id));
      
      // Get receipt items with product details
      let items: any[] = [];
      let summary = {
        totalItems: 0,
        totalExpected: 0,
        totalReceived: 0,
        totalDamaged: 0,
        totalMissing: 0,
        okItems: 0,
        damagedItems: 0,
        missingItems: 0,
        partialItems: 0
      };
      
      if (receipt) {
        // Get all receipt items
        const receiptItemsList = await db
          .select()
          .from(receiptItems)
          .where(eq(receiptItems.receiptId, receipt.id));
        
        // Enrich with product details
        items = await Promise.all(receiptItemsList.map(async (item) => {
          let productDetails = {
            productId: item.productId,
            productName: 'Unknown Item',
            sku: null as string | null,
            imageUrl: null as string | null,
            prices: null as { priceCzk: string | null; priceEur: string | null; priceUsd: string | null } | null
          };
          
          // Try to get product details
          if (item.productId) {
            const [product] = await db
              .select({
                id: products.id,
                name: products.name,
                sku: products.sku,
                imageUrl: products.imageUrl,
                priceCzk: products.priceCzk,
                priceEur: products.priceEur,
                priceUsd: products.priceUsd
              })
              .from(products)
              .where(eq(products.id, item.productId));
            
            if (product) {
              productDetails = {
                productId: product.id,
                productName: product.name,
                sku: product.sku,
                imageUrl: product.imageUrl,
                prices: {
                  priceCzk: product.priceCzk,
                  priceEur: product.priceEur,
                  priceUsd: product.priceUsd
                }
              };
            }
          }
          
          // If no product but it's a purchase item, get from purchase items
          if (productDetails.productName === 'Unknown Item' && item.itemType === 'purchase') {
            const [purchaseItem] = await db
              .select({
                productId: purchaseItems.productId,
                description: purchaseItems.description,
                sku: purchaseItems.sku,
                unitPrice: purchaseItems.unitPrice
              })
              .from(purchaseItems)
              .where(eq(purchaseItems.id, item.itemId));
            
            if (purchaseItem) {
              // If purchase item has a product, get its details
              if (purchaseItem.productId) {
                const [product] = await db
                  .select({
                    id: products.id,
                    name: products.name,
                    sku: products.sku,
                    imageUrl: products.imageUrl,
                    priceCzk: products.priceCzk,
                    priceEur: products.priceEur,
                    priceUsd: products.priceUsd
                  })
                  .from(products)
                  .where(eq(products.id, purchaseItem.productId));
                
                if (product) {
                  productDetails = {
                    productId: product.id,
                    productName: product.name,
                    sku: product.sku,
                    imageUrl: product.imageUrl,
                    prices: {
                      priceCzk: product.priceCzk,
                      priceEur: product.priceEur,
                      priceUsd: product.priceUsd
                    }
                  };
                }
              } else {
                // Use purchase item description as name
                productDetails.productName = purchaseItem.description || 'Purchase Item';
                productDetails.sku = purchaseItem.sku;
              }
            }
          }
          
          // If custom item, get from custom items
          if (productDetails.productName === 'Unknown Item' && item.itemType === 'custom') {
            const [customItem] = await db
              .select({
                name: customItems.name,
                description: customItems.description
              })
              .from(customItems)
              .where(eq(customItems.id, item.itemId));
            
            if (customItem) {
              productDetails.productName = customItem.name || customItem.description || 'Custom Item';
            }
          }
          
          // Get locations for this product
          let locations: any[] = [];
          if (item.productId) {
            const productLocations = await db
              .select({
                id: productLocationsTable.id,
                locationCode: productLocationsTable.locationCode,
                locationType: productLocationsTable.locationType,
                quantity: productLocationsTable.quantity,
                isPrimary: productLocationsTable.isPrimary
              })
              .from(productLocationsTable)
              .where(eq(productLocationsTable.productId, item.productId));
            
            locations = productLocations;
          }
          
          // Determine item status
          const expected = item.expectedQuantity || 0;
          const received = item.receivedQuantity || 0;
          const damaged = item.damagedQuantity || 0;
          const missing = item.missingQuantity || 0;
          
          let status = 'ok';
          if (missing > 0) {
            status = 'missing';
          } else if (damaged > 0) {
            status = 'damaged';
          } else if (received < expected) {
            status = 'partial';
          }
          
          // Update summary
          summary.totalItems++;
          summary.totalExpected += expected;
          summary.totalReceived += received;
          summary.totalDamaged += damaged;
          summary.totalMissing += missing;
          
          if (status === 'ok') summary.okItems++;
          else if (status === 'damaged') summary.damagedItems++;
          else if (status === 'missing') summary.missingItems++;
          else if (status === 'partial') summary.partialItems++;
          
          return {
            receiptItemId: item.id,
            itemId: item.itemId,
            itemType: item.itemType,
            expectedQuantity: expected,
            receivedQuantity: received,
            damagedQuantity: damaged,
            missingQuantity: missing,
            status,
            condition: item.condition || '',
            notes: item.notes || '',
            barcode: item.barcode || '',
            warehouseLocation: item.warehouseLocation || '',
            ...productDetails,
            locations
          };
        }));
      }
      
      res.json({
        receipt: receipt ? {
          id: receipt.id,
          status: receipt.status,
          createdAt: receipt.createdAt,
          completedAt: receipt.completedAt,
          receivedBy: receipt.receivedBy,
          approvedBy: receipt.approvedBy,
          generalNotes: receipt.generalNotes || '',
          damageNotes: receipt.damageNotes || '',
          photos: receipt.photos || [],
          scannedParcels: receipt.scannedParcels || []
        } : null,
        shipment: {
          id: shipment.id,
          shipmentName: shipment.shipmentName,
          trackingNumber: shipment.trackingNumber,
          carrier: shipment.carrier,
          status: shipment.status,
          estimatedArrival: shipment.estimatedArrival,
          actualArrival: shipment.actualArrival
        },
        items,
        summary
      });
    } catch (error) {
      console.error('Error fetching shipment report:', error);
      res.status(500).json({ message: 'Failed to fetch shipment report' });
    }
  });

  // Get shipments by receiving status - Archived
  // Includes auto-archived shipments (completed > 2 days) and manually archived
  app.get('/api/imports/shipments/archived', isAuthenticated, async (req, res) => {
    try {
      const shipmentList = await db
        .select()
        .from(shipments)
        .where(eq(shipments.receivingStatus, 'archived'))
        .orderBy(desc(shipments.archivedAt));
      
      const shipmentsWithItems = await Promise.all(
        shipmentList.map(async (shipment) => {
          let items: any[] = [];
          let itemCount = 0;
          
          // First try to get items from consolidationItems if consolidationId exists
          if (shipment.consolidationId) {
            const consolidationItemList = await db
              .select({
                id: customItems.id,
                name: customItems.name,
                quantity: customItems.quantity,
                weight: customItems.weight,
                trackingNumber: customItems.trackingNumber,
                unitPrice: customItems.unitPrice
              })
              .from(consolidationItems)
              .innerJoin(customItems, eq(consolidationItems.itemId, customItems.id))
              .where(eq(consolidationItems.consolidationId, shipment.consolidationId));
            
            items = consolidationItemList;
            itemCount = consolidationItemList.length;
          }
          
          // If no items found, fall back to receipt items
          if (items.length === 0) {
            const shipmentReceipts = await db
              .select({ id: receipts.id })
              .from(receipts)
              .where(eq(receipts.shipmentId, shipment.id));
            
            if (shipmentReceipts.length > 0) {
              const receiptIds = shipmentReceipts.map(r => r.id);
              const receiptItemList = await db
                .select({
                  id: receiptItems.id,
                  name: products.name,
                  productName: products.name,
                  quantity: receiptItems.receivedQuantity,
                  category: products.category
                })
                .from(receiptItems)
                .leftJoin(products, eq(receiptItems.productId, products.id))
                .where(inArray(receiptItems.receiptId, receiptIds));
              
              items = receiptItemList;
              itemCount = receiptItemList.length;
            }
          }
          
          return {
            ...shipment,
            items,
            itemCount
          };
        })
      );
      
      res.json(shipmentsWithItems);
    } catch (error) {
      console.error('Error fetching archived shipments:', error);
      res.status(500).json({ message: 'Failed to fetch shipments' });
    }
  });

  // Get all receipts
  app.get('/api/imports/receipts', isAuthenticated, async (req, res) => {
    try {
      const receiptsData = await db
        .select()
        .from(receipts)
        .orderBy(desc(receipts.receivedAt));
      res.json(receiptsData);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      res.status(500).json({ message: 'Failed to fetch receipts' });
    }
  });

  // Get recently approved receipts (last 7 days)
  app.get('/api/imports/receipts/recent', isAuthenticated, async (req, res) => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentReceipts = await db
        .select()
        .from(receipts)
        .where(
          and(
            eq(receipts.status, 'approved'),
            gte(receipts.approvedAt, sevenDaysAgo)
          )
        )
        .orderBy(desc(receipts.approvedAt));
      
      res.json(recentReceipts);
    } catch (error) {
      console.error('Error fetching recent receipts:', error);
      res.status(500).json({ message: 'Failed to fetch recent receipts' });
    }
  });

  // Factory Reset - Delete all operational data while preserving system configuration
  app.post('/api/system/factory-reset', requireRole(['administrator']), async (req: any, res) => {
    try {
      const { confirmationPhrase } = req.body;
      
      // Require typed confirmation
      if (confirmationPhrase !== 'DELETE ALL DATA') {
        return res.status(400).json({ 
          message: 'Invalid confirmation phrase. Type exactly: DELETE ALL DATA' 
        });
      }

      // Execute deletions in transaction with FK-safe order (children → parents)
      const deletionSummary: Record<string, number> = {};
      
      await db.transaction(async (tx) => {
        // ===== FACTORY RESET DELETION POLICY =====
        // DELETE: All operational/transactional data
        // PRESERVE: System configuration and audit trail
        //   - users (authentication & roles)
        //   - user_activities (audit trail - MUST NEVER DELETE)
        //   - warehouses, warehouse_layouts (infrastructure)
        //   - categories, suppliers (reference data)
        //   - packing_materials (catalog)
        //   - app_settings (system configuration)
        // ==========================================
        
        // Delete in FK-safe order - children first, then parents
        
        // Level 1: Leaf tables (no children)
        deletionSummary.ticketComments = (await tx.delete(ticketComments)).rowCount || 0;
        deletionSummary.orderFulfillmentLogs = (await tx.delete(orderFulfillmentLogs)).rowCount || 0;
        deletionSummary.customerBadges = (await tx.delete(customerBadges)).rowCount || 0;
        deletionSummary.supplierFiles = (await tx.delete(supplierFiles)).rowCount || 0;
        deletionSummary.warehouseFiles = (await tx.delete(warehouseFiles)).rowCount || 0;
        deletionSummary.warehouseFinancialContracts = (await tx.delete(warehouseFinancialContracts)).rowCount || 0;
        deletionSummary.productFiles = (await tx.delete(productFiles)).rowCount || 0;
        deletionSummary.orderFiles = (await tx.delete(orderFiles)).rowCount || 0;
        deletionSummary.aiLocationSuggestions = (await tx.delete(aiLocationSuggestions)).rowCount || 0;
        deletionSummary.stockAdjustmentRequests = (await tx.delete(stockAdjustmentRequests)).rowCount || 0;
        deletionSummary.productLocations = (await tx.delete(productLocations)).rowCount || 0;
        deletionSummary.notifications = (await tx.delete(notifications)).rowCount || 0;
        
        // Level 2: Tables with level 1 parents
        deletionSummary.orderCartonItems = (await tx.delete(orderCartonItems)).rowCount || 0;
        deletionSummary.bundleItems = (await tx.delete(bundleItems)).rowCount || 0;
        deletionSummary.productTieredPricing = (await tx.delete(productTieredPricing)).rowCount || 0;
        deletionSummary.productVariants = (await tx.delete(productVariants)).rowCount || 0;
        deletionSummary.orderItems = (await tx.delete(orderItems)).rowCount || 0;
        deletionSummary.serviceItems = (await tx.delete(serviceItems)).rowCount || 0;
        deletionSummary.preOrderItems = (await tx.delete(preOrderItems)).rowCount || 0;
        deletionSummary.customerShippingAddresses = (await tx.delete(customerShippingAddresses)).rowCount || 0;
        deletionSummary.customerBillingAddresses = (await tx.delete(customerBillingAddresses)).rowCount || 0;
        deletionSummary.packingMaterialUsage = (await tx.delete(packingMaterialUsage)).rowCount || 0;
        deletionSummary.shipmentLabels = (await tx.delete(shipmentLabels)).rowCount || 0;
        deletionSummary.shipmentItems = (await tx.delete(shipmentItems)).rowCount || 0;
        deletionSummary.shipmentCartons = (await tx.delete(shipmentCartons)).rowCount || 0;
        deletionSummary.consolidationItems = (await tx.delete(consolidationItems)).rowCount || 0;
        deletionSummary.costAllocations = (await tx.delete(costAllocations)).rowCount || 0;
        deletionSummary.receiptItems = (await tx.delete(receiptItems)).rowCount || 0;
        deletionSummary.purchaseItems = (await tx.delete(purchaseItems)).rowCount || 0;
        deletionSummary.deliveryHistory = (await tx.delete(deliveryHistory)).rowCount || 0;
        
        // Level 3: Tables with level 2 parents
        deletionSummary.orderCartonPlans = (await tx.delete(orderCartonPlans)).rowCount || 0;
        deletionSummary.orderCartons = (await tx.delete(orderCartons)).rowCount || 0;
        deletionSummary.productBundles = (await tx.delete(productBundles)).rowCount || 0;
        deletionSummary.tickets = (await tx.delete(tickets)).rowCount || 0;
        deletionSummary.landedCosts = (await tx.delete(landedCosts)).rowCount || 0;
        deletionSummary.receipts = (await tx.delete(receipts)).rowCount || 0;
        deletionSummary.shipmentCosts = (await tx.delete(shipmentCosts)).rowCount || 0;
        deletionSummary.productCostHistory = (await tx.delete(productCostHistory)).rowCount || 0;
        deletionSummary.shipmentTracking = (await tx.delete(shipmentTracking)).rowCount || 0;
        deletionSummary.customItems = (await tx.delete(customItems)).rowCount || 0;
        
        // Level 4: Major entity tables
        deletionSummary.orders = (await tx.delete(orders)).rowCount || 0;
        deletionSummary.products = (await tx.delete(products)).rowCount || 0;
        deletionSummary.customers = (await tx.delete(customers)).rowCount || 0;
        deletionSummary.shipments = (await tx.delete(shipments)).rowCount || 0;
        deletionSummary.consolidations = (await tx.delete(consolidations)).rowCount || 0;
        deletionSummary.importPurchases = (await tx.delete(importPurchases)).rowCount || 0;
        deletionSummary.services = (await tx.delete(services)).rowCount || 0;
        deletionSummary.preOrders = (await tx.delete(preOrders)).rowCount || 0;
        deletionSummary.expenses = (await tx.delete(expenses)).rowCount || 0;
        deletionSummary.discounts = (await tx.delete(discounts)).rowCount || 0;
        deletionSummary.employees = (await tx.delete(employees)).rowCount || 0;
        deletionSummary.packingCartons = (await tx.delete(packingCartons)).rowCount || 0;
        deletionSummary.dailySequences = (await tx.delete(dailySequences)).rowCount || 0;
        
        // NOTE: user_activities (audit trail) is PRESERVED for forensic evidence
        // Log the factory reset action INSIDE transaction AFTER successful deletions
        await tx.insert(userActivities).values({
          userId: req.user?.id || "system",
          action: 'factory_reset',
          entityType: 'system',
          entityId: 'factory_reset',
          description: `Factory reset completed by ${req.user?.firstName || 'Administrator'}. ${Object.values(deletionSummary).reduce((sum, count) => sum + count, 0)} operational records deleted.`,
        });
      }, {
        accessMode: 'read write',
        isolationLevel: 'serializable',
      });

      // Calculate total deleted
      const totalDeleted = Object.values(deletionSummary).reduce((sum, count) => sum + count, 0);

      res.json({
        success: true,
        message: `Factory reset completed. ${totalDeleted} records deleted.`,
        deletionSummary,
        totalDeleted
      });
    } catch (error) {
      console.error('Error during factory reset:', error);
      res.status(500).json({ 
        message: 'Factory reset failed. Database may be in inconsistent state.',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ========================================
  // Thermal Receipt PDF Generation Endpoint
  // ========================================
  app.post("/api/pos/receipt-pdf", isAuthenticated, async (req, res) => {
    try {
      // Basic validation - reject if no items or total is completely missing
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ message: 'Invalid request body' });
      }
      
      if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
        return res.status(400).json({ message: 'At least one item is required' });
      }
      
      if (req.body.total === undefined && req.body.subtotal === undefined) {
        return res.status(400).json({ message: 'Total or subtotal is required' });
      }
      
      // Extract with safe defaults using Number.isFinite for zero-value safety
      const items = req.body.items;
      const subtotalParsed = Number(req.body.subtotal);
      const subtotal = Number.isFinite(subtotalParsed) ? subtotalParsed : 0;
      const discountParsed = Number(req.body.discount);
      const discount = Number.isFinite(discountParsed) ? discountParsed : 0;
      const totalParsed = Number(req.body.total);
      const total = Number.isFinite(totalParsed) ? totalParsed : subtotal; // Allow 0 as valid total
      const paymentMethod = req.body.paymentMethod || 'cash';
      const cashReceivedParsed = Number(req.body.cashReceived);
      const cashReceived = req.body.cashReceived !== undefined && Number.isFinite(cashReceivedParsed) ? cashReceivedParsed : undefined;
      const changeParsed = Number(req.body.change);
      const change = req.body.change !== undefined && Number.isFinite(changeParsed) ? changeParsed : undefined;
      const orderId = req.body.orderId || '';
      const customerName = req.body.customerName || 'Walk-in Customer';
      const currency = req.body.currency || 'CZK';
      const notes = req.body.notes || '';
      const language = ['en', 'vi', 'cs', 'de'].includes(req.body.language) ? req.body.language : 'en';
      
      // Safe date parsing with fallback to current date
      let receiptDate = new Date();
      if (req.body.date) {
        const parsedDate = new Date(req.body.date);
        if (!Number.isNaN(parsedDate.getTime())) {
          receiptDate = parsedDate;
        }
      }
      
      // Safe company info with fallback defaults
      const rawCompanyInfo = req.body.companyInfo || {};
      const companyInfo = {
        name: rawCompanyInfo.name || 'Company Name',
        address: rawCompanyInfo.address || '',
        city: rawCompanyInfo.city || '',
        zip: rawCompanyInfo.zip || '',
        country: rawCompanyInfo.country || '',
        phone: rawCompanyInfo.phone || '',
        ico: rawCompanyInfo.ico || '',
        vatId: rawCompanyInfo.vatId || '',
        website: rawCompanyInfo.website || ''
      };

      // Multilingual labels for receipts (EN/VI/CS/DE)
      const labels: Record<string, Record<string, string>> = {
        en: {
          receipt: 'SALES RECEIPT',
          date: 'Date',
          time: 'Time',
          receiptNo: 'Receipt No.',
          customer: 'Customer',
          walkIn: 'Walk-in Customer',
          items: 'Items',
          subtotal: 'Subtotal',
          discount: 'Discount',
          total: 'TOTAL',
          vatIncluded: 'VAT included in price',
          payment: 'Payment',
          cash: 'Cash',
          card: 'Card',
          transfer: 'Bank Transfer',
          payLater: 'Pay Later',
          qrCode: 'QR Code',
          cashReceived: 'Cash Received',
          change: 'Change',
          thankYou: 'Thank you for your purchase!',
          companyId: 'ID',
          vatId: 'VAT',
          notes: 'Notes'
        },
        vi: {
          receipt: 'HÓA ĐƠN BÁN HÀNG',
          date: 'Ngày',
          time: 'Giờ',
          receiptNo: 'Số HĐ',
          customer: 'Khách hàng',
          walkIn: 'Khách lẻ',
          items: 'Sản phẩm',
          subtotal: 'Tạm tính',
          discount: 'Giảm giá',
          total: 'TỔNG CỘNG',
          vatIncluded: 'Đã bao gồm VAT',
          payment: 'Thanh toán',
          cash: 'Tiền mặt',
          card: 'Thẻ',
          transfer: 'Chuyển khoản',
          payLater: 'Trả sau',
          qrCode: 'Mã QR',
          cashReceived: 'Tiền nhận',
          change: 'Tiền thối',
          thankYou: 'Cảm ơn quý khách!',
          companyId: 'MST',
          vatId: 'VAT',
          notes: 'Ghi chú'
        },
        cs: {
          receipt: 'PRODEJNÍ DOKLAD',
          date: 'Datum',
          time: 'Čas',
          receiptNo: 'Číslo účtenky',
          customer: 'Zákazník',
          walkIn: 'Běžný zákazník',
          items: 'Položky',
          subtotal: 'Mezisoučet',
          discount: 'Sleva',
          total: 'CELKEM',
          vatIncluded: 'Cena včetně DPH',
          payment: 'Platba',
          cash: 'Hotovost',
          card: 'Karta',
          transfer: 'Převod',
          payLater: 'Platba později',
          qrCode: 'QR kód',
          cashReceived: 'Přijato',
          change: 'Vráceno',
          thankYou: 'Děkujeme za nákup!',
          companyId: 'IČO',
          vatId: 'DIČ',
          notes: 'Poznámky'
        },
        de: {
          receipt: 'KASSENBELEG',
          date: 'Datum',
          time: 'Uhrzeit',
          receiptNo: 'Beleg-Nr.',
          customer: 'Kunde',
          walkIn: 'Laufkunde',
          items: 'Artikel',
          subtotal: 'Zwischensumme',
          discount: 'Rabatt',
          total: 'GESAMT',
          vatIncluded: 'inkl. MwSt.',
          payment: 'Zahlung',
          cash: 'Bar',
          card: 'Karte',
          transfer: 'Überweisung',
          payLater: 'Später zahlen',
          qrCode: 'QR-Code',
          cashReceived: 'Erhalten',
          change: 'Rückgeld',
          thankYou: 'Vielen Dank für Ihren Einkauf!',
          companyId: 'Steuer-Nr.',
          vatId: 'USt-IdNr.',
          notes: 'Notizen'
        }
      };

      const t = labels[language] || labels.en;

      // Vietnamese text needs extra line height for diacritics (tones above/below)
      const isVietnamese = language === 'vi';
      const lineHeightMultiplier = isVietnamese ? 1.3 : 1.0;

      // 80mm = 226.77 points (1mm = 2.834645669 points)
      const pageWidth = 227;
      const sideMargin = 8; // Better side margins for breathing room
      const contentWidth = pageWidth - (sideMargin * 2);
      const topMargin = 8; // Top margin for cleaner look

      // Calculate content height with improved spacing (Vietnamese needs extra height for diacritics)
      const baseLineHeight = isVietnamese ? 16 : 14;
      const smallLineHeight = isVietnamese ? 14 : 12;
      
      let estimatedHeight = topMargin + 8; // Top padding
      estimatedHeight += 20 * lineHeightMultiplier; // Company name (larger)
      if (companyInfo.address || companyInfo.city || companyInfo.zip) estimatedHeight += baseLineHeight;
      if (companyInfo.phone || companyInfo.country) estimatedHeight += baseLineHeight;
      if (companyInfo.ico || companyInfo.vatId) estimatedHeight += baseLineHeight;
      estimatedHeight += 8; // Extra space before receipt title
      estimatedHeight += 18 * lineHeightMultiplier; // Receipt title
      estimatedHeight += smallLineHeight; // Dashed line spacing
      estimatedHeight += baseLineHeight * 4; // Date, Time, Receipt No, Customer
      estimatedHeight += smallLineHeight; // Dashed line spacing
      estimatedHeight += baseLineHeight; // Items header
      
      // Items - proper height estimation with more space for Vietnamese
      for (const item of items) {
        const itemName = `${item.quantity || 1}x ${item.name || 'Item'}`;
        const estimatedLines = Math.ceil(itemName.length / 24);
        estimatedHeight += Math.max(baseLineHeight, estimatedLines * smallLineHeight) + 5;
      }
      
      estimatedHeight += smallLineHeight; // Dashed line spacing
      estimatedHeight += baseLineHeight; // Subtotal
      if (discount > 0) estimatedHeight += baseLineHeight; // Discount
      estimatedHeight += 20 * lineHeightMultiplier; // Total (larger font)
      estimatedHeight += baseLineHeight; // VAT text
      estimatedHeight += smallLineHeight; // Dashed line spacing
      estimatedHeight += baseLineHeight; // Payment method
      if (cashReceived !== undefined) estimatedHeight += baseLineHeight; // Cash received
      if (change !== undefined && change > 0) estimatedHeight += baseLineHeight; // Change
      
      // Notes - proper estimation
      if (notes && notes.length > 0) {
        const notesLines = Math.ceil(notes.length / 32);
        estimatedHeight += baseLineHeight + (notesLines * smallLineHeight);
      }
      
      estimatedHeight += smallLineHeight; // Dashed line spacing
      estimatedHeight += 18 * lineHeightMultiplier; // Thank you
      if (companyInfo.website) estimatedHeight += baseLineHeight;
      estimatedHeight += 14; // Bottom margin

      // Register Unicode fonts for Vietnamese, Czech, German, English support
      // Noto Sans Mono has full Vietnamese diacritics support
      const fontPath = path.join(process.cwd(), 'server', 'fonts', 'NotoSansMono-Regular.ttf');
      const fontBoldPath = path.join(process.cwd(), 'server', 'fonts', 'NotoSansMono-Bold.ttf');
      
      // Fallback to DejaVu if Noto fonts don't exist
      const fs = await import('fs');
      const regularFontExists = fs.existsSync(fontPath);
      const boldFontExists = fs.existsSync(fontBoldPath);
      
      const actualFontPath = regularFontExists ? fontPath : path.join(process.cwd(), 'server', 'fonts', 'DejaVuSansMono.ttf');
      const actualFontBoldPath = boldFontExists ? fontBoldPath : path.join(process.cwd(), 'server', 'fonts', 'DejaVuSansMono-Bold.ttf');

      const doc = new PDFDocument({
        size: [pageWidth, estimatedHeight],
        margin: 0,
        bufferPages: false
      });

      // Register custom fonts for multilingual support
      doc.registerFont('Receipt', actualFontPath);
      doc.registerFont('Receipt-Bold', actualFontBoldPath);

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      
      // Currency symbol helper
      const currencySymbol = currency === 'EUR' ? '€' : currency === 'CZK' ? 'Kč' : currency;
      const formatMoney = (amount: number) => {
        const formatted = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return `${formatted} ${currencySymbol}`;
      };

      const drawDashedLine = (y: number) => {
        doc.strokeColor('#333333').lineWidth(0.5);
        for (let x = sideMargin; x < contentWidth + sideMargin; x += 5) {
          doc.moveTo(x, y).lineTo(x + 2.5, y).stroke();
        }
      };

      let yPos = topMargin + 8; // Comfortable top padding

      // Company Header - Centered with good spacing
      doc.fontSize(12)
         .font('Receipt-Bold')
         .fillColor('#000000')
         .text(companyInfo?.name || 'Company Name', sideMargin, yPos, { width: contentWidth, align: 'center', lineGap: isVietnamese ? 4 : 2 });
      yPos += Math.round(20 * lineHeightMultiplier);

      doc.fontSize(7).font('Receipt').fillColor('#444444');

      if (companyInfo?.address || companyInfo?.city || companyInfo?.zip) {
        const addressLine = [companyInfo.address, companyInfo.zip, companyInfo.city].filter(Boolean).join(', ');
        doc.text(addressLine, sideMargin, yPos, { width: contentWidth, align: 'center', lineGap: isVietnamese ? 3 : 1 });
        yPos += baseLineHeight;
      }

      if (companyInfo?.phone || companyInfo?.country) {
        const contactLine = [companyInfo.phone, companyInfo.country].filter(Boolean).join(' | ');
        doc.text(contactLine, sideMargin, yPos, { width: contentWidth, align: 'center', lineGap: isVietnamese ? 3 : 1 });
        yPos += baseLineHeight;
      }

      if (companyInfo?.ico || companyInfo?.vatId) {
        let idLine = '';
        if (companyInfo.ico) idLine += `${t.companyId}: ${companyInfo.ico}`;
        if (companyInfo.ico && companyInfo.vatId) idLine += ' | ';
        if (companyInfo.vatId) idLine += `${t.vatId}: ${companyInfo.vatId}`;
        doc.text(idLine, sideMargin, yPos, { width: contentWidth, align: 'center', lineGap: isVietnamese ? 3 : 1 });
        yPos += baseLineHeight;
      }

      yPos += 6; // Extra breathing room before receipt title

      // Receipt Title - Centered with emphasis
      doc.fontSize(10).font('Receipt-Bold').fillColor('#000000')
         .text(t.receipt, sideMargin, yPos, { width: contentWidth, align: 'center', lineGap: isVietnamese ? 4 : 2 });
      yPos += Math.round(18 * lineHeightMultiplier);

      drawDashedLine(yPos);
      yPos += smallLineHeight;

      // Transaction Details with comfortable spacing
      const labelColumnWidth = 80; // Wide enough for Czech "Číslo účtenky:"
      const valueColumnWidth = contentWidth - labelColumnWidth;
      
      const dateStr = receiptDate.toLocaleDateString(language === 'cs' ? 'cs-CZ' : language === 'de' ? 'de-DE' : language === 'vi' ? 'vi-VN' : 'en-US', { 
        day: '2-digit', month: '2-digit', year: 'numeric' 
      });
      const timeStr = receiptDate.toLocaleTimeString(language === 'cs' ? 'cs-CZ' : language === 'de' ? 'de-DE' : language === 'vi' ? 'vi-VN' : 'en-US', { 
        hour: '2-digit', minute: '2-digit' 
      });

      doc.fontSize(8).font('Receipt').fillColor('#000000');
      doc.text(`${t.date}:`, sideMargin, yPos, { width: labelColumnWidth, lineGap: isVietnamese ? 3 : 1 });
      doc.text(dateStr, sideMargin + labelColumnWidth, yPos, { width: valueColumnWidth });
      yPos += baseLineHeight;
      doc.text(`${t.time}:`, sideMargin, yPos, { width: labelColumnWidth, lineGap: isVietnamese ? 3 : 1 });
      doc.text(timeStr, sideMargin + labelColumnWidth, yPos, { width: valueColumnWidth });
      yPos += baseLineHeight;

      if (orderId) {
        doc.text(`${t.receiptNo}:`, sideMargin, yPos, { width: labelColumnWidth, lineGap: isVietnamese ? 3 : 1 });
        doc.text(orderId, sideMargin + labelColumnWidth, yPos, { width: valueColumnWidth });
        yPos += baseLineHeight;
      }

      const customerDisplay = customerName === 'Walk-in Customer' ? t.walkIn : (customerName || t.walkIn);
      doc.text(`${t.customer}:`, sideMargin, yPos, { width: labelColumnWidth, lineGap: isVietnamese ? 3 : 1 });
      doc.text(customerDisplay.substring(0, 22), sideMargin + labelColumnWidth, yPos, { width: valueColumnWidth, lineGap: isVietnamese ? 3 : 1 });
      yPos += baseLineHeight;

      drawDashedLine(yPos);
      yPos += smallLineHeight;

      // Items Section
      doc.fontSize(9).font('Receipt-Bold').text(t.items + ':', sideMargin, yPos, { lineGap: isVietnamese ? 3 : 1 });
      yPos += baseLineHeight;

      doc.fontSize(8).font('Receipt');
      const priceColumnWidth = 75; // Wider to fit large prices like "27 615.00 Kč"
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        
        const qtyRaw = Number(item.quantity);
        const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
        const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : 'Item';
        const priceRaw = Number(item.price);
        const unitPrice = Number.isFinite(priceRaw) ? priceRaw : 0;
        const lineTotal = unitPrice * qty;
        
        const itemText = `${qty}x ${name}`;
        const priceText = formatMoney(lineTotal);
        
        const nameWidth = contentWidth - priceColumnWidth;
        const nameHeight = doc.heightOfString(itemText, { width: nameWidth, lineGap: isVietnamese ? 3 : 1 });
        
        doc.text(itemText, sideMargin, yPos, { width: nameWidth, lineGap: isVietnamese ? 3 : 1 });
        doc.text(priceText, sideMargin + nameWidth, yPos, { width: priceColumnWidth, align: 'right' });
        yPos += Math.max(nameHeight, isVietnamese ? 13 : 11) + 5;
      }

      drawDashedLine(yPos);
      yPos += smallLineHeight;

      // Totals Section with clear hierarchy
      const totalsValueWidth = 85; // Wide enough for large totals like "27 615.00 Kč"
      doc.fontSize(8).font('Receipt').fillColor('#000000');
      doc.text(`${t.subtotal}:`, sideMargin, yPos, { width: labelColumnWidth, lineGap: isVietnamese ? 3 : 1 });
      doc.text(formatMoney(subtotal), sideMargin + contentWidth - totalsValueWidth, yPos, { width: totalsValueWidth, align: 'right' });
      yPos += baseLineHeight;

      if (discount && discount > 0) {
        doc.text(`${t.discount}:`, sideMargin, yPos, { width: labelColumnWidth, lineGap: isVietnamese ? 3 : 1 });
        doc.text(`-${formatMoney(discount)}`, sideMargin + contentWidth - totalsValueWidth, yPos, { width: totalsValueWidth, align: 'right' });
        yPos += baseLineHeight;
      }

      doc.fontSize(11).font('Receipt-Bold');
      doc.text(`${t.total}:`, sideMargin, yPos, { width: labelColumnWidth, lineGap: isVietnamese ? 4 : 2 });
      doc.text(formatMoney(total), sideMargin + contentWidth - totalsValueWidth, yPos, { width: totalsValueWidth, align: 'right' });
      yPos += Math.round(20 * lineHeightMultiplier);

      doc.fontSize(7).font('Receipt').fillColor('#666666');
      doc.text(t.vatIncluded, sideMargin, yPos, { width: contentWidth, align: 'center', lineGap: isVietnamese ? 3 : 1 });
      yPos += baseLineHeight;

      drawDashedLine(yPos);
      yPos += smallLineHeight;

      // Payment Section
      doc.fontSize(8).font('Receipt').fillColor('#000000');
      const paymentLabels: Record<string, string> = {
        cash: t.cash,
        card: t.card,
        bank_transfer: t.transfer,
        pay_later: t.payLater,
        qr_czk: t.qrCode
      };
      doc.text(`${t.payment}:`, sideMargin, yPos, { width: labelColumnWidth, lineGap: isVietnamese ? 3 : 1 });
      doc.text(paymentLabels[paymentMethod] || paymentMethod, sideMargin + contentWidth - totalsValueWidth, yPos, { width: totalsValueWidth, align: 'right' });
      yPos += baseLineHeight;

      if (cashReceived !== undefined && cashReceived !== null) {
        doc.text(`${t.cashReceived}:`, sideMargin, yPos, { width: labelColumnWidth, lineGap: isVietnamese ? 3 : 1 });
        doc.text(formatMoney(cashReceived), sideMargin + contentWidth - totalsValueWidth, yPos, { width: totalsValueWidth, align: 'right' });
        yPos += baseLineHeight;
      }

      if (change !== undefined && change !== null && change > 0) {
        doc.font('Receipt-Bold');
        doc.text(`${t.change}:`, sideMargin, yPos, { width: labelColumnWidth, lineGap: isVietnamese ? 3 : 1 });
        doc.text(formatMoney(change), sideMargin + contentWidth - totalsValueWidth, yPos, { width: totalsValueWidth, align: 'right' });
        yPos += baseLineHeight;
      }

      if (notes) {
        yPos += 4;
        doc.fontSize(7).font('Receipt').fillColor('#333333');
        doc.text(`${t.notes}: ${notes}`, sideMargin, yPos, { width: contentWidth, lineGap: isVietnamese ? 3 : 1 });
        yPos += baseLineHeight;
      }

      drawDashedLine(yPos);
      yPos += smallLineHeight;

      // Footer with warm closing
      doc.fontSize(9).font('Receipt').fillColor('#000000');
      doc.text(t.thankYou, sideMargin, yPos, { width: contentWidth, align: 'center', lineGap: isVietnamese ? 4 : 2 });
      yPos += Math.round(16 * lineHeightMultiplier);

      if (companyInfo?.website) {
        doc.fontSize(7).fillColor('#666666');
        doc.text(companyInfo.website, sideMargin, yPos, { width: contentWidth, align: 'center' });
      }

      doc.end();

      await new Promise<void>((resolve) => {
        doc.on('end', () => resolve());
      });

      const pdfBuffer = Buffer.concat(chunks);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="receipt-${orderId || Date.now()}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);

    } catch (error) {
      console.error('Error generating receipt PDF:', error);
      res.status(500).json({ 
        message: 'Failed to generate receipt PDF',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}