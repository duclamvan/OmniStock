import {
  users,
  categories,
  warehouses,
  warehouseFiles,
  warehouseLocations,
  inventoryBalances,
  suppliers,
  supplierFiles,
  products,
  productVariants,
  productBundles,
  bundleItems,
  customers,
  customerPrices,
  orders,
  orderItems,
  purchases,
  incomingShipments,
  sales,
  returns,
  returnItems,
  expenses,
  preOrders,
  userActivities,
  settings,
  type User,
  type UpsertUser,
  type Category,
  type InsertCategory,
  type Warehouse,
  type InsertWarehouse,
  type WarehouseFile,
  type InsertWarehouseFile,
  type Supplier,
  type InsertSupplier,
  type SupplierFile,
  type InsertSupplierFile,
  type Product,
  type InsertProduct,
  type ProductVariant,
  type InsertProductVariant,
  type ProductBundle,
  type InsertProductBundle,
  type BundleItem,
  type InsertBundleItem,
  type Customer,
  type InsertCustomer,
  type CustomerPrice,
  type InsertCustomerPrice,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type Purchase,
  type InsertPurchase,
  type IncomingShipment,
  type InsertIncomingShipment,
  type Sale,
  type InsertSale,
  type Return,
  type InsertReturn,
  type ReturnItem,
  type InsertReturnItem,
  type Expense,
  type InsertExpense,
  type PreOrder,
  type InsertPreOrder,
  type UserActivity,
  type InsertUserActivity,
  type Setting,
  type InsertSetting,
  type WarehouseLocation,
  type InsertWarehouseLocation,
  type InventoryBalance,
  type InsertInventoryBalance,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, like, sql, gte, lte, count, inArray, isNotNull } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategoryById(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  // Warehouses
  getWarehouses(): Promise<Warehouse[]>;
  getWarehouseById(id: string): Promise<Warehouse | undefined>;
  createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse>;
  updateWarehouse(id: string, warehouse: Partial<InsertWarehouse>): Promise<Warehouse>;
  deleteWarehouse(id: string): Promise<void>;
  getProductsByWarehouseId(warehouseId: string): Promise<Product[]>;

  // Warehouse Files
  getWarehouseFiles(warehouseId: string): Promise<WarehouseFile[]>;
  getWarehouseFileById(id: string): Promise<WarehouseFile | undefined>;
  createWarehouseFile(file: InsertWarehouseFile): Promise<WarehouseFile>;
  deleteWarehouseFile(id: string): Promise<void>;

  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplierById(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier>;
  deleteSupplier(id: string): Promise<void>;
  
  // Supplier Files
  getSupplierFiles(supplierId: string): Promise<SupplierFile[]>;
  createSupplierFile(file: InsertSupplierFile): Promise<SupplierFile>;
  deleteSupplierFile(id: string): Promise<void>;

  // Products
  getProducts(includeInactive?: boolean): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  getLowStockProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  searchProducts(query: string, includeInactive?: boolean): Promise<Product[]>;
  getProductOrderCount(productId: string): Promise<number>;
  getProductsOrderCounts(productIds: string[]): Promise<{ [productId: string]: number }>;
  moveProductsToWarehouse(productIds: string[], targetWarehouseId: string): Promise<void>;

  // Product Variants
  getProductVariants(productId: string): Promise<ProductVariant[]>;
  createProductVariant(variant: InsertProductVariant): Promise<ProductVariant>;
  updateProductVariant(id: string, variant: Partial<InsertProductVariant>): Promise<ProductVariant>;
  deleteProductVariant(id: string): Promise<void>;

  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomerById(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(id: string): Promise<void>;
  searchCustomers(query: string): Promise<Customer[]>;

  // Customer Prices
  getCustomerPrices(customerId: string): Promise<CustomerPrice[]>;
  getActiveCustomerPrice(customerId: string, productId?: string, variantId?: string, currency?: string): Promise<CustomerPrice | undefined>;
  createCustomerPrice(price: InsertCustomerPrice): Promise<CustomerPrice>;
  updateCustomerPrice(id: string, price: Partial<InsertCustomerPrice>): Promise<CustomerPrice>;
  deleteCustomerPrice(id: string): Promise<void>;
  bulkCreateCustomerPrices(prices: InsertCustomerPrice[]): Promise<CustomerPrice[]>;

  // Orders
  getOrders(): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | undefined>;
  getOrdersByStatus(status: string): Promise<Order[]>;
  getOrdersByPaymentStatus(paymentStatus: string): Promise<Order[]>;
  getOrdersByCustomerId(customerId: string): Promise<Order[]>;
  getUnpaidOrders(): Promise<Order[]>;
  getTodayOrders(): Promise<Order[]>;
  getOrdersShippedToday(): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order>;
  deleteOrder(id: string): Promise<void>;
  generateOrderId(): Promise<string>;

  // Order Items
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  updateOrderItem(id: string, item: Partial<InsertOrderItem>): Promise<OrderItem>;
  deleteOrderItem(id: string): Promise<void>;
  deleteOrderItems(orderId: string): Promise<void>;

  // Dashboard Analytics
  getDashboardMetrics(): Promise<{
    fulfillOrdersToday: number;
    totalOrdersToday: number;
    totalRevenueToday: number;
    totalProfitToday: number;
    thisMonthRevenue: number;
    thisMonthProfit: number;
    lastMonthRevenue: number;
    lastMonthProfit: number;
  }>;

  // Monthly Financial Summary
  getMonthlyFinancialSummary(year?: number): Promise<any[]>;

  // User Activities
  getUserActivities(limit?: number): Promise<UserActivity[]>;
  createUserActivity(activity: InsertUserActivity): Promise<UserActivity>;

  // Purchases
  getPurchases(): Promise<Purchase[]>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  updatePurchase(id: string, purchase: Partial<InsertPurchase>): Promise<Purchase>;

  // Returns
  getReturns(): Promise<Return[]>;
  getReturnById(id: string): Promise<Return | undefined>;
  createReturn(returnData: InsertReturn): Promise<Return>;
  updateReturn(id: string, returnData: Partial<InsertReturn>): Promise<Return>;
  deleteReturn(id: string): Promise<void>;
  
  // Return Items
  getReturnItems(returnId: string): Promise<ReturnItem[]>;
  createReturnItem(item: InsertReturnItem): Promise<ReturnItem>;
  deleteReturnItems(returnId: string): Promise<void>;

  // Expenses
  getExpenses(): Promise<Expense[]>;
  getExpenseById(id: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense>;
  deleteExpense(id: string): Promise<void>;

  // Pre-orders
  getPreOrders(): Promise<PreOrder[]>;
  createPreOrder(preOrder: InsertPreOrder): Promise<PreOrder>;
  deletePreOrder(id: string): Promise<void>;

  // Sales/Discounts
  getSales(): Promise<Sale[]>;
  getSaleById(id: string): Promise<Sale | undefined>;
  createSale(sale: InsertSale): Promise<Sale>;
  updateSale(id: string, sale: Partial<InsertSale>): Promise<Sale>;
  deleteSale(id: string): Promise<void>;

  // Product Bundles
  getBundles(): Promise<ProductBundle[]>;
  getBundleById(id: string): Promise<ProductBundle | undefined>;
  createBundle(bundle: InsertProductBundle): Promise<ProductBundle>;
  updateBundle(id: string, bundle: Partial<InsertProductBundle>): Promise<ProductBundle>;
  deleteBundle(id: string): Promise<void>;
  generateBundleId(): Promise<string>;

  // Bundle Items
  getBundleItems(bundleId: string): Promise<BundleItem[]>;
  createBundleItem(item: InsertBundleItem): Promise<BundleItem>;
  updateBundleItem(id: string, item: Partial<InsertBundleItem>): Promise<BundleItem>;
  deleteBundleItem(id: string): Promise<void>;
  deleteBundleItems(bundleId: string): Promise<void>;

  // Settings
  getSettings(): Promise<Setting[]>;
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(setting: InsertSetting): Promise<Setting>;
  
  // Warehouse Locations
  getWarehouseLocations(warehouseId: string, type?: string, q?: string): Promise<WarehouseLocation[]>;
  getWarehouseLocationById(id: string): Promise<WarehouseLocation | undefined>;
  createWarehouseLocation(location: InsertWarehouseLocation): Promise<WarehouseLocation>;
  createWarehouseLocationsBulk(locations: InsertWarehouseLocation[]): Promise<WarehouseLocation[]>;
  updateWarehouseLocation(id: string, location: Partial<InsertWarehouseLocation>): Promise<WarehouseLocation>;
  deleteWarehouseLocation(id: string): Promise<void>;
  getLocationChildren(parentId: string): Promise<WarehouseLocation[]>;
  
  // Inventory Balances
  getInventoryBalances(locationId: string): Promise<InventoryBalance[]>;
  getInventoryBalanceById(id: string): Promise<InventoryBalance | undefined>;
  createInventoryBalance(balance: InsertInventoryBalance): Promise<InventoryBalance>;
  updateInventoryBalance(id: string, balance: Partial<InsertInventoryBalance>): Promise<InventoryBalance>;
  deleteInventoryBalance(id: string): Promise<void>;
  
  // Putaway Suggestions
  suggestPutawayLocations(variantId: string, quantity: number): Promise<{ locationId: string; address: string; score: number; reasons: string[] }[]>;

  // Utility Functions
  generateSKU(categoryName: string, productName: string): Promise<string>;
  calculateAverageImportCost(existingProduct: Product, newQuantity: number, newImportCost: number, currency: string): Promise<{ importCostUsd?: string; importCostCzk?: string; importCostEur?: string }>;
  generateShipmentId(shippingMethod: string, shippingCarrier: string): Promise<string>;
  getActiveSalesForProduct(productId: string, categoryId: string | null): Promise<Sale[]>;
  generateDiscountId(name: string, startDate: Date): string;
}

export class DatabaseStorage implements IStorage {
  // Helper method for Vietnamese search
  private removeDiacritics(str: string): string {
    const vietnameseMap: Record<string, string> = {
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
      'ý': 'y', 'ỳ': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y'
    };

    return str.split('').map(char => {
      return vietnameseMap[char.toLowerCase()] || char;
    }).join('');
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(asc(categories.name));
  }

  async getCategoryById(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category> {
    const [updatedCategory] = await db
      .update(categories)
      .set(category)
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Warehouses
  async getWarehouses(): Promise<Warehouse[]> {
    return await db.select().from(warehouses).orderBy(asc(warehouses.name));
  }

  async getWarehouseById(id: string): Promise<Warehouse | undefined> {
    const [warehouse] = await db.select().from(warehouses).where(eq(warehouses.id, id));
    return warehouse;
  }

  async createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse> {
    const [newWarehouse] = await db.insert(warehouses).values(warehouse).returning();
    return newWarehouse;
  }

  async updateWarehouse(id: string, warehouse: Partial<InsertWarehouse>): Promise<Warehouse> {
    const [updatedWarehouse] = await db
      .update(warehouses)
      .set(warehouse)
      .where(eq(warehouses.id, id))
      .returning();
    return updatedWarehouse;
  }

  async deleteWarehouse(id: string): Promise<void> {
    await db.delete(warehouses).where(eq(warehouses.id, id));
  }

  async getProductsByWarehouseId(warehouseId: string): Promise<Product[]> {
    return await db.select()
      .from(products)
      .where(eq(products.warehouseId, warehouseId))
      .orderBy(asc(products.name));
  }

  // Warehouse Files
  async getWarehouseFiles(warehouseId: string): Promise<WarehouseFile[]> {
    return await db.select()
      .from(warehouseFiles)
      .where(eq(warehouseFiles.warehouseId, warehouseId))
      .orderBy(desc(warehouseFiles.createdAt));
  }

  async getWarehouseFileById(id: string): Promise<WarehouseFile | undefined> {
    const [file] = await db.select().from(warehouseFiles).where(eq(warehouseFiles.id, id));
    return file;
  }

  async createWarehouseFile(file: InsertWarehouseFile): Promise<WarehouseFile> {
    const [newFile] = await db.insert(warehouseFiles).values(file).returning();
    return newFile;
  }

  async deleteWarehouseFile(id: string): Promise<void> {
    await db.delete(warehouseFiles).where(eq(warehouseFiles.id, id));
  }

  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers).orderBy(asc(suppliers.name));
  }

  async getSupplierById(id: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [newSupplier] = await db.insert(suppliers).values(supplier).returning();
    return newSupplier;
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier> {
    const [updatedSupplier] = await db
      .update(suppliers)
      .set(supplier)
      .where(eq(suppliers.id, id))
      .returning();
    return updatedSupplier;
  }

  async deleteSupplier(id: string): Promise<void> {
    await db.delete(suppliers).where(eq(suppliers.id, id));
  }
  
  // Supplier Files
  async getSupplierFiles(supplierId: string): Promise<SupplierFile[]> {
    return await db.select()
      .from(supplierFiles)
      .where(eq(supplierFiles.supplierId, supplierId))
      .orderBy(desc(supplierFiles.createdAt));
  }
  
  async createSupplierFile(file: InsertSupplierFile): Promise<SupplierFile> {
    const [newFile] = await db.insert(supplierFiles).values(file).returning();
    return newFile;
  }
  
  async deleteSupplierFile(id: string): Promise<void> {
    await db.delete(supplierFiles).where(eq(supplierFiles.id, id));
  }

  // Products
  async getProducts(includeInactive: boolean = false): Promise<Product[]> {
    if (includeInactive) {
      return await db.select().from(products)
        .orderBy(desc(products.createdAt));
    }
    return await db.select().from(products)
      .where(eq(products.isActive, true))
      .orderBy(desc(products.createdAt));
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products)
      .where(and(
        eq(products.id, id),
        eq(products.isActive, true)
      ));
    return product;
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.sku, sku));
    return product;
  }

  async getLowStockProducts(): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(and(
        eq(products.isActive, true),
        sql`${products.quantity} <= ${products.lowStockAlert}`
      ))
      .orderBy(asc(products.quantity));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<void> {
    // Soft delete - just mark as inactive
    await db
      .update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(products.id, id));
  }

  async moveProductsToWarehouse(productIds: string[], targetWarehouseId: string): Promise<void> {
    if (productIds.length === 0) return;
    
    await db
      .update(products)
      .set({ 
        warehouseId: targetWarehouseId,
        updatedAt: new Date() 
      })
      .where(inArray(products.id, productIds));
  }

  async getProductOrderCount(productId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(orderItems)
      .where(eq(orderItems.productId, productId));
    return result.count;
  }

  async getProductsOrderCounts(productIds: string[]): Promise<{ [productId: string]: number }> {
    if (productIds.length === 0) return {};
    
    const results = await db
      .select({
        productId: orderItems.productId,
        count: count()
      })
      .from(orderItems)
      .where(inArray(orderItems.productId, productIds))
      .groupBy(orderItems.productId);
    
    const counts: { [productId: string]: number } = {};
    productIds.forEach(id => counts[id] = 0); // Initialize all to 0
    results.forEach(result => counts[result.productId] = result.count);
    
    return counts;
  }

  async searchProducts(query: string, includeInactive: boolean = false): Promise<Product[]> {
    // Normalize the query for Vietnamese search
    const normalizedQuery = this.removeDiacritics(query.toLowerCase());
    
    // Get all products and filter them in memory for proper Vietnamese search
    let allProducts;
    if (includeInactive) {
      allProducts = await db.select().from(products)
        .orderBy(desc(products.createdAt));
    } else {
      allProducts = await db.select().from(products)
        .where(eq(products.isActive, true))
        .orderBy(desc(products.createdAt));
    }
    
    return allProducts.filter(product => {
      const normalizedName = this.removeDiacritics(product.name.toLowerCase());
      const normalizedSku = this.removeDiacritics(product.sku.toLowerCase());
      
      return normalizedName.includes(normalizedQuery) || 
             normalizedSku.includes(normalizedQuery);
    });
  }

  // Product Variants
  async getProductVariants(productId: string): Promise<ProductVariant[]> {
    return await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, productId))
      .orderBy(asc(productVariants.quantity));
  }

  async createProductVariant(variant: InsertProductVariant): Promise<ProductVariant> {
    // Clean up numeric fields - convert empty strings to null
    const cleanedVariant = {
      ...variant,
      importCostUsd: variant.importCostUsd || null,
      importCostCzk: variant.importCostCzk || null,
      importCostEur: variant.importCostEur || null,
    };
    const [newVariant] = await db.insert(productVariants).values(cleanedVariant).returning();
    return newVariant;
  }

  async updateProductVariant(id: string, variant: Partial<InsertProductVariant>): Promise<ProductVariant> {
    const [updatedVariant] = await db
      .update(productVariants)
      .set(variant)
      .where(eq(productVariants.id, id))
      .returning();
    return updatedVariant;
  }

  async deleteProductVariant(id: string): Promise<void> {
    await db.delete(productVariants).where(eq(productVariants.id, id));
  }

  // Customers
  async getCustomers(): Promise<(Customer & { 
    orderCount?: number; 
    totalSpent?: string; 
    lastOrderDate?: Date | null 
  })[]> {
    const customersData = await db.select().from(customers).orderBy(desc(customers.createdAt));
    
    // Get order statistics for all customers
    const orderStats = await db
      .select({
        customerId: orders.customerId,
        orderCount: sql<number>`count(*)::integer`,
        totalSpent: sql<string>`sum(${orders.grandTotal})::text`,
        lastOrderDate: sql<Date>`max(${orders.createdAt})`
      })
      .from(orders)
      .where(isNotNull(orders.customerId))
      .groupBy(orders.customerId);
    
    // Create a map for quick lookup
    const statsMap = new Map(orderStats.map(stat => [stat.customerId, stat]));
    
    // Merge customers with their order statistics
    return customersData.map(customer => ({
      ...customer,
      orderCount: statsMap.get(customer.id)?.orderCount || 0,
      totalSpent: statsMap.get(customer.id)?.totalSpent || '0',
      lastOrderDate: statsMap.get(customer.id)?.lastOrderDate || null
    }));
  }

  async getCustomerById(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer> {
    const [updatedCustomer] = await db
      .update(customers)
      .set({ ...customer, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return updatedCustomer;
  }

  async deleteCustomer(id: string): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    // Normalize the query for Vietnamese search
    const normalizedQuery = this.removeDiacritics(query.toLowerCase());
    
    // Get all customers and filter them in memory for proper Vietnamese search
    const allCustomers = await db.select().from(customers).orderBy(desc(customers.createdAt));
    
    return allCustomers.filter(customer => {
      const normalizedName = this.removeDiacritics(customer.name.toLowerCase());
      const normalizedFacebookName = customer.facebookName ? this.removeDiacritics(customer.facebookName.toLowerCase()) : '';
      const normalizedEmail = customer.email ? this.removeDiacritics(customer.email.toLowerCase()) : '';
      
      return normalizedName.includes(normalizedQuery) || 
             normalizedFacebookName.includes(normalizedQuery) || 
             normalizedEmail.includes(normalizedQuery);
    });
  }

  // Customer Prices
  async getCustomerPrices(customerId: string): Promise<CustomerPrice[]> {
    return await db.select()
      .from(customerPrices)
      .where(eq(customerPrices.customerId, customerId))
      .orderBy(desc(customerPrices.createdAt));
  }

  async getActiveCustomerPrice(customerId: string, productId?: string, variantId?: string, currency?: string): Promise<CustomerPrice | undefined> {
    const now = new Date();
    const conditions = [
      eq(customerPrices.customerId, customerId),
      eq(customerPrices.isActive, true),
      lte(customerPrices.validFrom, now),
    ];

    if (productId) {
      conditions.push(eq(customerPrices.productId, productId));
    }
    if (variantId) {
      conditions.push(eq(customerPrices.variantId, variantId));
    }
    if (currency) {
      conditions.push(eq(customerPrices.currency, currency));
    }

    const prices = await db.select()
      .from(customerPrices)
      .where(and(...conditions))
      .orderBy(desc(customerPrices.validFrom));

    // Filter out expired prices
    const validPrices = prices.filter(price => 
      !price.validTo || new Date(price.validTo) >= now
    );

    return validPrices[0];
  }

  async createCustomerPrice(price: InsertCustomerPrice): Promise<CustomerPrice> {
    const [newPrice] = await db.insert(customerPrices).values(price).returning();
    return newPrice;
  }

  async updateCustomerPrice(id: string, price: Partial<InsertCustomerPrice>): Promise<CustomerPrice> {
    const [updatedPrice] = await db
      .update(customerPrices)
      .set({ ...price, updatedAt: new Date() })
      .where(eq(customerPrices.id, id))
      .returning();
    return updatedPrice;
  }

  async deleteCustomerPrice(id: string): Promise<void> {
    await db.delete(customerPrices).where(eq(customerPrices.id, id));
  }

  async bulkCreateCustomerPrices(prices: InsertCustomerPrice[]): Promise<CustomerPrice[]> {
    if (prices.length === 0) return [];
    const newPrices = await db.insert(customerPrices).values(prices).returning();
    return newPrices;
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    const ordersWithCustomers = await db
      .select({
        id: orders.id,
        orderId: orders.orderId,
        customerId: orders.customerId,
        billerId: orders.billerId,
        currency: orders.currency,
        orderStatus: orders.orderStatus,
        paymentStatus: orders.paymentStatus,
        priority: orders.priority,
        subtotal: orders.subtotal,
        discountType: orders.discountType,
        discountValue: orders.discountValue,
        taxRate: orders.taxRate,
        taxAmount: orders.taxAmount,
        shippingMethod: orders.shippingMethod,
        paymentMethod: orders.paymentMethod,
        shippingCost: orders.shippingCost,
        actualShippingCost: orders.actualShippingCost,
        grandTotal: orders.grandTotal,
        notes: orders.notes,
        attachmentUrl: orders.attachmentUrl,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        shippedAt: orders.shippedAt,
        customerId2: customers.id,
        customerName: customers.name,
        customerFacebookName: customers.facebookName,
        customerEmail: customers.email,
        customerPhone: customers.phone,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .orderBy(desc(orders.createdAt));
    
    // Get order items with product details for each order
    const ordersWithItems = await Promise.all(
      ordersWithCustomers.map(async (order: any) => {
        const items = await db
          .select({
            id: orderItems.id,
            productId: orderItems.productId,
            productName: orderItems.productName,
            sku: orderItems.sku,
            quantity: orderItems.quantity,
            price: orderItems.appliedPrice,
            discount: orderItems.discount,
            tax: orderItems.tax,
            total: orderItems.total,
            productId2: products.id,
            productImportCostCzk: products.importCostCzk,
            productImportCostEur: products.importCostEur,
            productImportCostUsd: products.importCostUsd
          })
          .from(orderItems)
          .leftJoin(products, eq(orderItems.productId, products.id))
          .where(eq(orderItems.orderId, order.id));
        
        // Transform items to include product object
        const transformedItems = items.map(item => ({
          ...item,
          product: item.productId2 ? {
            id: item.productId2,
            importCostCzk: item.productImportCostCzk,
            importCostEur: item.productImportCostEur,
            importCostUsd: item.productImportCostUsd,
          } : undefined
        }));
        
        // Transform order to include customer object
        const transformedOrder = {
          ...order,
          customer: order.customerId2 ? {
            id: order.customerId2,
            name: order.customerName,
            facebookName: order.customerFacebookName,
            email: order.customerEmail,
            phone: order.customerPhone,
          } : undefined,
          items: transformedItems
        };
        
        // Remove the flat customer fields
        delete transformedOrder.customerId2;
        delete transformedOrder.customerName;
        delete transformedOrder.customerFacebookName;
        delete transformedOrder.customerEmail;
        delete transformedOrder.customerPhone;
        
        return transformedOrder;
      })
    );
    
    return ordersWithItems as any;
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const [order] = await db
      .select({
        id: orders.id,
        orderId: orders.orderId,
        customerId: orders.customerId,
        billerId: orders.billerId,
        currency: orders.currency,
        orderStatus: orders.orderStatus,
        paymentStatus: orders.paymentStatus,
        priority: orders.priority,
        subtotal: orders.subtotal,
        discountType: orders.discountType,
        discountValue: orders.discountValue,
        taxRate: orders.taxRate,
        taxAmount: orders.taxAmount,
        shippingMethod: orders.shippingMethod,
        paymentMethod: orders.paymentMethod,
        shippingCost: orders.shippingCost,
        actualShippingCost: orders.actualShippingCost,
        grandTotal: orders.grandTotal,
        notes: orders.notes,
        attachmentUrl: orders.attachmentUrl,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        shippedAt: orders.shippedAt,
        customerId2: customers.id,
        customerName: customers.name,
        customerFacebookName: customers.facebookName,
        customerEmail: customers.email,
        customerPhone: customers.phone,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.id, id));
    
    if (!order) return undefined;
    
    // Get order items
    const items = await db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        productName: orderItems.productName,
        sku: orderItems.sku,
        quantity: orderItems.quantity,
        price: orderItems.price,
        unitPrice: orderItems.unitPrice,
        appliedPrice: orderItems.appliedPrice,
        discount: orderItems.discount,
        tax: orderItems.tax,
        total: orderItems.total,
        productId2: products.id,
        productImportCostCzk: products.importCostCzk,
        productImportCostEur: products.importCostEur,
        productImportCostUsd: products.importCostUsd
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, id));
    
    // Transform items to include product object
    const transformedItems = items.map(item => ({
      ...item,
      product: item.productId2 ? {
        id: item.productId2,
        importCostCzk: item.productImportCostCzk,
        importCostEur: item.productImportCostEur,
        importCostUsd: item.productImportCostUsd,
      } : undefined
    }));
    
    // Transform order to include customer object
    const transformedOrder = {
      ...order,
      customer: order.customerId2 ? {
        id: order.customerId2,
        name: order.customerName,
        facebookName: order.customerFacebookName,
        email: order.customerEmail,
        phone: order.customerPhone,
      } : undefined,
      items: transformedItems
    };
    
    // Remove the flat customer fields
    delete transformedOrder.customerId2;
    delete transformedOrder.customerName;
    delete transformedOrder.customerFacebookName;
    delete transformedOrder.customerEmail;
    delete transformedOrder.customerPhone;
    
    return transformedOrder as any;
  }

  async getOrdersByStatus(status: string): Promise<Order[]> {
    const ordersWithCustomers = await db
      .select({
        id: orders.id,
        orderId: orders.orderId,
        customerId: orders.customerId,
        billerId: orders.billerId,
        currency: orders.currency,
        orderStatus: orders.orderStatus,
        paymentStatus: orders.paymentStatus,
        priority: orders.priority,
        subtotal: orders.subtotal,
        discountType: orders.discountType,
        discountValue: orders.discountValue,
        taxRate: orders.taxRate,
        taxAmount: orders.taxAmount,
        shippingMethod: orders.shippingMethod,
        paymentMethod: orders.paymentMethod,
        shippingCost: orders.shippingCost,
        actualShippingCost: orders.actualShippingCost,
        grandTotal: orders.grandTotal,
        notes: orders.notes,
        attachmentUrl: orders.attachmentUrl,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        shippedAt: orders.shippedAt,
        customerId2: customers.id,
        customerName: customers.name,
        customerFacebookName: customers.facebookName,
        customerEmail: customers.email,
        customerPhone: customers.phone,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.orderStatus, status as any))
      .orderBy(desc(orders.createdAt));
    
    // Get order items with product details for each order
    const ordersWithItems = await Promise.all(
      ordersWithCustomers.map(async (order: any) => {
        const items = await db
          .select({
            id: orderItems.id,
            productId: orderItems.productId,
            productName: orderItems.productName,
            sku: orderItems.sku,
            quantity: orderItems.quantity,
            price: orderItems.appliedPrice,
            discount: orderItems.discount,
            tax: orderItems.tax,
            total: orderItems.total,
            productId2: products.id,
            productImportCostCzk: products.importCostCzk,
            productImportCostEur: products.importCostEur,
            productImportCostUsd: products.importCostUsd
          })
          .from(orderItems)
          .leftJoin(products, eq(orderItems.productId, products.id))
          .where(eq(orderItems.orderId, order.id));
        
        // Transform items to include product object
        const transformedItems = items.map(item => ({
          ...item,
          product: item.productId2 ? {
            id: item.productId2,
            importCostCzk: item.productImportCostCzk,
            importCostEur: item.productImportCostEur,
            importCostUsd: item.productImportCostUsd,
          } : undefined
        }));
        
        // Transform order to include customer object
        const transformedOrder = {
          ...order,
          customer: order.customerId2 ? {
            id: order.customerId2,
            name: order.customerName,
            facebookName: order.customerFacebookName,
            email: order.customerEmail,
            phone: order.customerPhone,
          } : undefined,
          items: transformedItems
        };
        
        // Remove the flat customer fields
        delete transformedOrder.customerId2;
        delete transformedOrder.customerName;
        delete transformedOrder.customerFacebookName;
        delete transformedOrder.customerEmail;
        delete transformedOrder.customerPhone;
        
        return transformedOrder;
      })
    );
    
    return ordersWithItems as any;
  }

  async getOrdersByPaymentStatus(paymentStatus: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.paymentStatus, paymentStatus as any))
      .orderBy(desc(orders.createdAt));
  }

  async getOrdersByCustomerId(customerId: string): Promise<Order[]> {
    const ordersWithCustomers = await db
      .select({
        id: orders.id,
        customerId: orders.customerId,
        currency: orders.currency,
        orderStatus: orders.orderStatus,
        paymentStatus: orders.paymentStatus,
        priority: orders.priority,
        subtotal: orders.subtotal,
        discountType: orders.discountType,
        discountValue: orders.discountValue,
        taxRate: orders.taxRate,
        taxAmount: orders.taxAmount,
        shippingCost: orders.shippingCost,
        actualShippingCost: orders.actualShippingCost,
        grandTotal: orders.grandTotal,
        notes: orders.notes,
        attachmentUrl: orders.attachmentUrl,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        shippedAt: orders.shippedAt,
        total: orders.grandTotal, // Add total field for the UI
        customerId2: customers.id,
        customerName: customers.name,
        customerFacebookName: customers.facebookName,
        customerEmail: customers.email,
        customerPhone: customers.phone,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt));
    
    // Get order items for each order
    const ordersWithItems = await Promise.all(
      ordersWithCustomers.map(async (order: any) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        
        // Transform order to include customer object
        const transformedOrder = {
          ...order,
          customer: order.customerId2 ? {
            id: order.customerId2,
            name: order.customerName,
            facebookName: order.customerFacebookName,
            email: order.customerEmail,
            phone: order.customerPhone,
          } : undefined,
          items,
          status: order.orderStatus // Add status field for the UI
        };
        
        // Remove the flat customer fields
        delete transformedOrder.customerId2;
        delete transformedOrder.customerName;
        delete transformedOrder.customerFacebookName;
        delete transformedOrder.customerEmail;
        delete transformedOrder.customerPhone;
        
        return transformedOrder;
      })
    );
    
    return ordersWithItems as any;
  }

  async getUnpaidOrders(): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.orderStatus, 'pending'),
          eq(orders.paymentStatus, 'pending')
        )
      )
      .orderBy(desc(orders.createdAt));
  }

  async getTodayOrders(): Promise<Order[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await db
      .select()
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, today),
          lte(orders.createdAt, tomorrow)
        )
      )
      .orderBy(desc(orders.createdAt));
  }

  async getOrdersShippedToday(): Promise<Order[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.orderStatus, 'shipped'),
          gte(orders.shippedAt, today),
          lte(orders.shippedAt, tomorrow)
        )
      )
      .orderBy(desc(orders.shippedAt));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order> {
    const updateData: any = { ...order, updatedAt: new Date() };
    if (order.orderStatus === 'shipped') {
      updateData.shippedAt = new Date();
    }
    
    const [updatedOrder] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  async deleteOrder(id: string): Promise<void> {
    await db.delete(orders).where(eq(orders.id, id));
  }

  async generateOrderId(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const prefix = `${year}${month}${day}`;

    const [lastOrder] = await db
      .select()
      .from(orders)
      .where(like(orders.orderId, `${prefix}%`))
      .orderBy(desc(orders.orderId))
      .limit(1);

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderId.slice(-3));
      sequence = lastSequence + 1;
    }

    return `${prefix}${String(sequence).padStart(3, '0')}`;
  }

  // Order Items
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [newItem] = await db.insert(orderItems).values(item).returning();
    return newItem;
  }

  async updateOrderItem(id: string, item: Partial<InsertOrderItem>): Promise<OrderItem> {
    const [updatedItem] = await db
      .update(orderItems)
      .set(item)
      .where(eq(orderItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteOrderItem(id: string): Promise<void> {
    await db.delete(orderItems).where(eq(orderItems.id, id));
  }

  async deleteOrderItems(orderId: string): Promise<void> {
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
  }

  // Dashboard Analytics
  async getDashboardMetrics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    // Fulfill Orders Today (status: to_fulfill)
    const [fulfillOrdersToday] = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.orderStatus, 'to_fulfill'));

    // Total Orders Today (shipped today)
    const [totalOrdersToday] = await db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          eq(orders.orderStatus, 'shipped'),
          gte(orders.shippedAt, today),
          lte(orders.shippedAt, tomorrow)
        )
      );

    // Revenue and Profit calculations for shipped orders
    const shippedOrdersToday = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.orderStatus, 'shipped'),
          gte(orders.shippedAt, today),
          lte(orders.shippedAt, tomorrow)
        )
      );

    const shippedOrdersThisMonth = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.orderStatus, 'shipped'),
          gte(orders.shippedAt, thisMonth),
          lte(orders.shippedAt, nextMonth)
        )
      );

    const shippedOrdersLastMonth = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.orderStatus, 'shipped'),
          gte(orders.shippedAt, lastMonth),
          lte(orders.shippedAt, thisMonth)
        )
      );

    // Calculate revenue according to formula: Grand Total - Tax - Shipping Cost
    const totalRevenueToday = shippedOrdersToday.reduce((sum, order) => {
      const grandTotal = parseFloat(order.grandTotal || '0');
      const tax = parseFloat(order.taxAmount || '0');
      const shippingCost = parseFloat(order.shippingCost || '0');
      return sum + (grandTotal - tax - shippingCost);
    }, 0);

    // Calculate profit according to formula: Grand Total - (Import Cost x quantity) - Tax - Discount - (Shipping paid - Actual Shipping Cost)
    let totalProfitToday = 0;
    for (const order of shippedOrdersToday) {
      if (order.orderStatus === 'shipped' && order.paymentStatus === 'paid') {
        const grandTotal = parseFloat(order.grandTotal || '0');
        const tax = parseFloat(order.taxAmount || '0');
        // Calculate discount from order items
        const discount = parseFloat(order.discountValue || '0');
        const shippingPaid = parseFloat(order.shippingCost || '0');
        const actualShipping = parseFloat(order.actualShippingCost || '0');
        
        // Get order items with product costs
        const items = await this.getOrderItems(order.id);
        let productCosts = 0;
        
        for (const item of items) {
          if (item.productId) {
            const product = await this.getProductById(item.productId);
            if (product) {
              const importCost = parseFloat(product.importCostCzk || product.importCostEur || product.importCostUsd || '0');
              productCosts += importCost * item.quantity;
            }
          }
        }
        
        const profit = grandTotal - productCosts - tax - discount - (shippingPaid - actualShipping);
        totalProfitToday += profit;
      }
    }

    const thisMonthRevenue = shippedOrdersThisMonth.reduce(
      (sum, order) => sum + parseFloat(order.grandTotal || '0'), 0
    );

    // Calculate this month's profit with proper cost deduction
    let thisMonthProfit = 0;
    for (const order of shippedOrdersThisMonth) {
      const revenue = parseFloat(order.grandTotal || '0');
      const tax = parseFloat(order.taxAmount || '0');
      const discount = parseFloat(order.discountValue || '0');
      const shipping = parseFloat(order.shippingCost || '0');
      const actualShipping = parseFloat(order.actualShippingCost || '0');
      
      // Estimate product costs as 40% of subtotal (for mock data)
      const subtotal = parseFloat(order.subtotal || '0');
      const estimatedCost = subtotal * 0.4;
      
      const profit = revenue - estimatedCost - tax - discount - (shipping - actualShipping);
      thisMonthProfit += profit;
    }

    const lastMonthRevenue = shippedOrdersLastMonth.reduce(
      (sum, order) => sum + parseFloat(order.grandTotal || '0'), 0
    );

    // Calculate last month's profit with proper cost deduction
    let lastMonthProfit = 0;
    for (const order of shippedOrdersLastMonth) {
      const revenue = parseFloat(order.grandTotal || '0');
      const tax = parseFloat(order.taxAmount || '0');
      const discount = parseFloat(order.discountValue || '0');
      const shipping = parseFloat(order.shippingCost || '0');
      const actualShipping = parseFloat(order.actualShippingCost || '0');
      
      // Estimate product costs as 40% of subtotal (for mock data)
      const subtotal = parseFloat(order.subtotal || '0');
      const estimatedCost = subtotal * 0.4;
      
      const profit = revenue - estimatedCost - tax - discount - (shipping - actualShipping);
      lastMonthProfit += profit;
    }

    return {
      fulfillOrdersToday: fulfillOrdersToday.count,
      totalOrdersToday: totalOrdersToday.count,
      totalRevenueToday,
      totalProfitToday,
      thisMonthRevenue,
      thisMonthProfit,
      lastMonthRevenue,
      lastMonthProfit,
    };
  }

  // Monthly Financial Summary
  async getMonthlyFinancialSummary(year?: number): Promise<any[]> {
    const currentYear = year || new Date().getFullYear();
    
    // This would be a complex query - simplified implementation
    const months = [];
    for (let month = 1; month <= 12; month++) {
      const monthStart = new Date(currentYear, month - 1, 1);
      const monthEnd = new Date(currentYear, month, 0);
      
      const monthOrders = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.orderStatus, 'shipped'),
            gte(orders.shippedAt, monthStart),
            lte(orders.shippedAt, monthEnd)
          )
        );

      const monthlyData = {
        month: `${String(month).padStart(2, '0')}-${String(currentYear).slice(-2)}`,
        totalProfitEur: 0,
        totalRevenueEur: 0,
        profitCzkOrders: 0,
        revenueCzkOrders: 0,
        profitEurOrders: 0,
        revenueEurOrders: 0,
        totalProfitCzk: 0,
        totalRevenueCzk: 0,
      };

      for (const order of monthOrders) {
        const revenue = parseFloat(order.grandTotal || '0');
        const profit = revenue * 0.3; // Simplified profit calculation

        if (order.currency === 'EUR') {
          monthlyData.profitEurOrders += profit;
          monthlyData.revenueEurOrders += revenue;
        } else if (order.currency === 'CZK') {
          monthlyData.profitCzkOrders += profit;
          monthlyData.revenueCzkOrders += revenue;
        }

        // Convert to EUR (simplified - would use actual exchange rates)
        const eurRate = order.currency === 'CZK' ? 0.04 : 1;
        monthlyData.totalProfitEur += profit * eurRate;
        monthlyData.totalRevenueEur += revenue * eurRate;

        // Convert to CZK (simplified)
        const czkRate = order.currency === 'EUR' ? 25 : 1;
        monthlyData.totalProfitCzk += profit * czkRate;
        monthlyData.totalRevenueCzk += revenue * czkRate;
      }

      months.push(monthlyData);
    }

    return months;
  }

  // User Activities
  async getUserActivities(limit = 10): Promise<UserActivity[]> {
    return await db
      .select()
      .from(userActivities)
      .orderBy(desc(userActivities.createdAt))
      .limit(limit);
  }

  async createUserActivity(activity: InsertUserActivity): Promise<UserActivity> {
    const [newActivity] = await db.insert(userActivities).values(activity).returning();
    return newActivity;
  }

  // Purchases
  async getPurchases(): Promise<Purchase[]> {
    return await db.select().from(purchases).orderBy(desc(purchases.createdAt));
  }

  async createPurchase(purchase: InsertPurchase): Promise<Purchase> {
    const [newPurchase] = await db.insert(purchases).values(purchase).returning();
    return newPurchase;
  }

  async updatePurchase(id: string, purchase: Partial<InsertPurchase>): Promise<Purchase> {
    const [updatedPurchase] = await db
      .update(purchases)
      .set({ ...purchase, updatedAt: new Date() })
      .where(eq(purchases.id, id))
      .returning();
    return updatedPurchase;
  }

  // Returns
  async getReturns(): Promise<Return[]> {
    // Use raw SQL to avoid Drizzle query builder issue
    const returnsData = await db.execute(sql`
      SELECT * FROM returns 
      ORDER BY created_at DESC
    `);
    
    // Then get related data for each return
    const returnsWithRelations = await Promise.all(returnsData.rows.map(async (returnData: any) => {
      const items = await this.getReturnItems(returnData.id);
      
      // Get customer if exists
      let customer = undefined;
      if (returnData.customer_id) {
        const customerResult = await db.select()
          .from(customers)
          .where(eq(customers.id, returnData.customer_id))
          .limit(1);
        if (customerResult.length > 0) {
          customer = {
            id: customerResult[0].id,
            name: customerResult[0].name,
            facebookName: customerResult[0].facebookName,
            email: customerResult[0].email,
            phone: customerResult[0].phone,
          };
        }
      }
      
      // Get order if exists
      let order = undefined;
      if (returnData.order_id) {
        const orderResult = await db.select()
          .from(orders)
          .where(eq(orders.id, returnData.order_id))
          .limit(1);
        if (orderResult.length > 0) {
          order = {
            id: orderResult[0].id,
            orderId: orderResult[0].orderId,
            grandTotal: orderResult[0].grandTotal,
            createdAt: orderResult[0].createdAt,
          };
        }
      }
      
      return {
        ...returnData,
        customer,
        order,
        items,
      };
    }));
    
    return returnsWithRelations;
  }
  
  async getReturnById(id: string): Promise<Return | undefined> {
    // Use raw SQL to avoid Drizzle query builder issue
    const result = await db.execute(sql`
      SELECT * FROM returns WHERE id = ${id} LIMIT 1
    `);
    
    if (result.rows.length === 0) return undefined;
    
    const returnData = result.rows[0];
    const items = await this.getReturnItems(id);
    
    // Get customer if exists
    let customer = undefined;
    if (returnData.customer_id) {
      const customerResult = await db.select()
        .from(customers)
        .where(eq(customers.id, returnData.customer_id))
        .limit(1);
      if (customerResult.length > 0) {
        customer = {
          id: customerResult[0].id,
          name: customerResult[0].name,
          facebookName: customerResult[0].facebookName,
          email: customerResult[0].email,
          phone: customerResult[0].phone,
        };
      }
    }
    
    // Get order if exists
    let order = undefined;
    if (returnData.order_id) {
      const orderResult = await db.select()
        .from(orders)
        .where(eq(orders.id, returnData.order_id))
        .limit(1);
      if (orderResult.length > 0) {
        order = {
          id: orderResult[0].id,
          orderId: orderResult[0].orderId,
          grandTotal: orderResult[0].grandTotal,
          createdAt: orderResult[0].createdAt,
        };
      }
    }
    
    return {
      ...returnData,
      customer,
      order,
      items,
    };
  }

  async createReturn(returnData: InsertReturn): Promise<Return> {
    const [newReturn] = await db.insert(returns).values(returnData).returning();
    return newReturn;
  }

  async updateReturn(id: string, returnData: Partial<InsertReturn>): Promise<Return> {
    const [updatedReturn] = await db
      .update(returns)
      .set({ ...returnData, updatedAt: new Date() })
      .where(eq(returns.id, id))
      .returning();
    return updatedReturn;
  }
  
  async deleteReturn(id: string): Promise<void> {
    await db.delete(returns).where(eq(returns.id, id));
  }
  
  // Return Items
  async getReturnItems(returnId: string): Promise<ReturnItem[]> {
    // Use raw SQL to avoid Drizzle query builder issue
    const itemsResult = await db.execute(sql`
      SELECT 
        ri.id,
        ri.return_id as "returnId",
        ri.product_id as "productId",
        ri.product_name as "productName",
        ri.sku,
        ri.quantity,
        ri.price,
        p.id as "productId2",
        p.name as "productName2",
        p.sku as "productSku",
        p.import_cost_czk as "productImportCostCzk",
        p.import_cost_eur as "productImportCostEur",
        p.import_cost_usd as "productImportCostUsd"
      FROM return_items ri
      LEFT JOIN products p ON ri.product_id = p.id
      WHERE ri.return_id = ${returnId}
    `);
    
    return itemsResult.rows.map((item: any) => ({
      id: item.id,
      returnId: item.returnId,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      price: item.price,
      product: item.productId2 ? {
        id: item.productId2,
        name: item.productName2,
        sku: item.productSku,
        importCostCzk: item.productImportCostCzk,
        importCostEur: item.productImportCostEur,
        importCostUsd: item.productImportCostUsd,
      } : undefined,
    }));
  }
  
  async createReturnItem(item: InsertReturnItem): Promise<ReturnItem> {
    const [newItem] = await db.insert(returnItems).values(item).returning();
    return newItem;
  }
  
  async deleteReturnItems(returnId: string): Promise<void> {
    await db.delete(returnItems).where(eq(returnItems.returnId, returnId));
  }

  // Expenses
  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(desc(expenses.createdAt));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values(expense).returning();
    return newExpense;
  }

  async getExpenseById(id: string): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense;
  }

  async updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense> {
    const [updatedExpense] = await db
      .update(expenses)
      .set({ ...expense, updatedAt: new Date() })
      .where(eq(expenses.id, id))
      .returning();
    return updatedExpense;
  }

  async deleteExpense(id: string): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  // Pre-orders
  async getPreOrders(): Promise<PreOrder[]> {
    return await db.select().from(preOrders).orderBy(desc(preOrders.createdAt));
  }

  async createPreOrder(preOrder: InsertPreOrder): Promise<PreOrder> {
    const [newPreOrder] = await db.insert(preOrders).values(preOrder).returning();
    return newPreOrder;
  }

  async deletePreOrder(id: string): Promise<void> {
    await db.delete(preOrders).where(eq(preOrders.id, id));
  }

  // Sales/Discounts
  async getSales(): Promise<Sale[]> {
    return await db.select().from(sales).orderBy(desc(sales.createdAt));
  }

  async getSaleById(id: string): Promise<Sale | undefined> {
    const [sale] = await db.select().from(sales).where(eq(sales.id, id));
    return sale;
  }

  async createSale(sale: InsertSale): Promise<Sale> {
    // Generate discount ID
    const discountId = this.generateDiscountId(sale.name, sale.startDate);
    
    const [newSale] = await db.insert(sales).values({
      ...sale,
      discountId
    }).returning();
    return newSale;
  }

  async updateSale(id: string, sale: Partial<InsertSale>): Promise<Sale> {
    const [updatedSale] = await db
      .update(sales)
      .set(sale)
      .where(eq(sales.id, id))
      .returning();
    return updatedSale;
  }

  async deleteSale(id: string): Promise<void> {
    await db.delete(sales).where(eq(sales.id, id));
  }

  async deleteAllSales(): Promise<void> {
    await db.delete(sales);
  }

  // Product Bundles
  async getBundles(): Promise<ProductBundle[]> {
    return await db.select().from(productBundles).where(eq(productBundles.isActive, true)).orderBy(desc(productBundles.createdAt));
  }

  async getBundleById(id: string): Promise<ProductBundle | undefined> {
    const [bundle] = await db.select().from(productBundles).where(eq(productBundles.id, id));
    return bundle;
  }

  async createBundle(bundle: InsertProductBundle): Promise<ProductBundle> {
    const bundleId = await this.generateBundleId();
    const [newBundle] = await db.insert(productBundles).values({
      ...bundle,
      bundleId
    }).returning();
    return newBundle;
  }

  async updateBundle(id: string, bundle: Partial<InsertProductBundle>): Promise<ProductBundle> {
    const [updatedBundle] = await db
      .update(productBundles)
      .set({
        ...bundle,
        updatedAt: new Date()
      })
      .where(eq(productBundles.id, id))
      .returning();
    return updatedBundle;
  }

  async deleteBundle(id: string): Promise<void> {
    await db.update(productBundles)
      .set({ isActive: false })
      .where(eq(productBundles.id, id));
  }

  async generateBundleId(): Promise<string> {
    // Get the last bundle ID
    const lastBundle = await db
      .select()
      .from(productBundles)
      .orderBy(desc(productBundles.createdAt))
      .limit(1);
    
    let nextNumber = 1;
    if (lastBundle.length > 0 && lastBundle[0].bundleId) {
      const match = lastBundle[0].bundleId.match(/BDL-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    
    return `BDL-${String(nextNumber).padStart(4, '0')}`;
  }

  // Bundle Items
  async getBundleItems(bundleId: string): Promise<BundleItem[]> {
    return await db.select().from(bundleItems).where(eq(bundleItems.bundleId, bundleId));
  }

  async createBundleItem(item: InsertBundleItem): Promise<BundleItem> {
    const [newItem] = await db.insert(bundleItems).values(item).returning();
    return newItem;
  }

  async updateBundleItem(id: string, item: Partial<InsertBundleItem>): Promise<BundleItem> {
    const [updatedItem] = await db
      .update(bundleItems)
      .set(item)
      .where(eq(bundleItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteBundleItem(id: string): Promise<void> {
    await db.delete(bundleItems).where(eq(bundleItems.id, id));
  }

  async deleteBundleItems(bundleId: string): Promise<void> {
    await db.delete(bundleItems).where(eq(bundleItems.bundleId, bundleId));
  }

  // Settings
  async getSettings(): Promise<Setting[]> {
    return await db.select().from(settings).orderBy(asc(settings.category), asc(settings.key));
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting;
  }

  async setSetting(setting: InsertSetting): Promise<Setting> {
    const [newSetting] = await db
      .insert(settings)
      .values(setting)
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: setting.value,
          updatedAt: new Date(),
        },
      })
      .returning();
    return newSetting;
  }
  
  // Utility Functions
  async generateSKU(categoryName: string, productName: string): Promise<string> {
    // Format: X-CAT-PRODUCTNAME (max 10 chars for product part)
    const categoryPrefix = categoryName.substring(0, 3).toUpperCase();
    const productPart = productName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toUpperCase();
    const baseSkU = `X-${categoryPrefix}-${productPart}`;
    
    // Check if SKU exists
    let sku = baseSkU;
    let counter = 1;
    while (await this.getProductBySku(sku)) {
      sku = `${baseSkU}-${String(counter).padStart(2, '0')}`;
      counter++;
    }
    
    return sku;
  }
  
  async calculateAverageImportCost(existingProduct: Product, newQuantity: number, newImportCost: number, currency: string): Promise<{ importCostUsd?: string; importCostCzk?: string; importCostEur?: string }> {
    const existingQuantity = existingProduct.quantity || 0;
    const totalQuantity = existingQuantity + newQuantity;
    
    // Get existing import cost in the same currency
    let existingCost = 0;
    if (currency === 'USD') existingCost = parseFloat(existingProduct.importCostUsd || '0');
    else if (currency === 'CZK') existingCost = parseFloat(existingProduct.importCostCzk || '0');
    else if (currency === 'EUR') existingCost = parseFloat(existingProduct.importCostEur || '0');
    
    // Calculate weighted average
    const totalCost = (existingCost * existingQuantity) + (newImportCost * newQuantity);
    const averageCost = totalQuantity > 0 ? (totalCost / totalQuantity).toFixed(2) : '0';
    
    // Return updated costs
    const result: { importCostUsd?: string; importCostCzk?: string; importCostEur?: string } = {};
    if (currency === 'USD') result.importCostUsd = averageCost;
    else if (currency === 'CZK') result.importCostCzk = averageCost;
    else if (currency === 'EUR') result.importCostEur = averageCost;
    
    return result;
  }
  
  async generateShipmentId(shippingMethod: string, shippingCarrier: string): Promise<string> {
    // Format: #METHOD-CARRIER-YYYYMMDDXX
    const methodMap: { [key: string]: string } = {
      'Railway general': 'RAIL-GEN',
      'Sea general': 'SEA-GEN',
      'Railway sensitive': 'RAIL-SEN',
      'Sea sensitive': 'SEA-SEN',
      'Express Air': 'AIR-EXP',
      'Air DDP': 'AIR-DDP',
      'Local truck': 'TRUCK',
      'Post': 'POST',
      'Pickup': 'PICKUP',
    };
    
    const methodCode = methodMap[shippingMethod] || shippingMethod.substring(0, 8).toUpperCase();
    const carrierCode = shippingCarrier.substring(0, 3).toUpperCase();
    
    const today = new Date();
    const dateStr = today.getFullYear() + 
                   String(today.getMonth() + 1).padStart(2, '0') + 
                   String(today.getDate()).padStart(2, '0');
    
    // Find last shipment ID for today
    const prefix = `#${methodCode}-${carrierCode}-${dateStr}`;
    const [lastShipment] = await db
      .select()
      .from(incomingShipments)
      .where(like(incomingShipments.shipmentId, `${prefix}%`))
      .orderBy(desc(incomingShipments.shipmentId))
      .limit(1);
    
    let sequence = 1;
    if (lastShipment) {
      const lastSeq = parseInt(lastShipment.shipmentId.slice(-2));
      sequence = lastSeq + 1;
    }
    
    return `${prefix}${String(sequence).padStart(2, '0')}`;
  }
  
  async getActiveSalesForProduct(productId: string, categoryId: string | null): Promise<Sale[]> {
    const now = new Date();
    
    const activeSales = await db.select()
      .from(sales)
      .where(
        and(
          eq(sales.status, 'active'),
          lte(sales.startDate, now),
          gte(sales.endDate, now),
          or(
            eq(sales.applicationScope, 'all_products'),
            and(eq(sales.applicationScope, 'specific_product'), eq(sales.productId, productId)),
            and(eq(sales.applicationScope, 'specific_category'), categoryId ? eq(sales.categoryId, categoryId) : sql`false`),
            and(eq(sales.applicationScope, 'selected_products'), sql`${sales.selectedProductIds} @> ARRAY[${productId}]::text[]`)
          )
        )
      );
    
    return activeSales;
  }

  generateDiscountId(name: string, startDate: Date): string {
    // Extract year from start date
    const year = startDate.getFullYear();
    
    // Clean the name: remove special characters, convert to uppercase, extract letters and numbers
    const cleanName = name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '') // Remove special characters except spaces
      .split(' ')
      .filter(word => word.length > 0)
      .join('');
    
    // Format: #YEARNAME (e.g., #2024BLACKFRIDAY20)
    return `#${year}${cleanName}`;
  }

  // Warehouse Locations
  async getWarehouseLocations(warehouseId: string, type?: string, q?: string): Promise<WarehouseLocation[]> {
    let query = db.select().from(warehouseLocations);
    
    const conditions = [eq(warehouseLocations.warehouseId, warehouseId)];
    if (type) {
      conditions.push(eq(warehouseLocations.type, type as any));
    }
    if (q) {
      conditions.push(or(
        like(warehouseLocations.code, `%${q}%`),
        like(warehouseLocations.address, `%${q}%`)
      )!);
    }
    
    query = query.where(and(...conditions)) as any;
    
    return await query.orderBy(asc(warehouseLocations.sortKey), asc(warehouseLocations.address));
  }

  async getWarehouseLocationById(id: string): Promise<WarehouseLocation | undefined> {
    const [location] = await db.select().from(warehouseLocations).where(eq(warehouseLocations.id, id));
    return location;
  }

  async createWarehouseLocation(location: InsertWarehouseLocation): Promise<WarehouseLocation> {
    const [newLocation] = await db.insert(warehouseLocations).values(location).returning();
    return newLocation;
  }

  async createWarehouseLocationsBulk(locations: InsertWarehouseLocation[]): Promise<WarehouseLocation[]> {
    if (locations.length === 0) return [];
    return await db.insert(warehouseLocations).values(locations).returning();
  }

  async updateWarehouseLocation(id: string, location: Partial<InsertWarehouseLocation>): Promise<WarehouseLocation> {
    const [updatedLocation] = await db
      .update(warehouseLocations)
      .set({ ...location, updatedAt: new Date() })
      .where(eq(warehouseLocations.id, id))
      .returning();
    return updatedLocation;
  }

  async deleteWarehouseLocation(id: string): Promise<void> {
    await db.delete(warehouseLocations).where(eq(warehouseLocations.id, id));
  }

  async getLocationChildren(parentId: string): Promise<WarehouseLocation[]> {
    return await db.select()
      .from(warehouseLocations)
      .where(eq(warehouseLocations.parentId, parentId))
      .orderBy(asc(warehouseLocations.sortKey), asc(warehouseLocations.code));
  }

  // Inventory Balances
  async getInventoryBalances(locationId: string): Promise<InventoryBalance[]> {
    return await db.select()
      .from(inventoryBalances)
      .where(eq(inventoryBalances.locationId, locationId))
      .orderBy(desc(inventoryBalances.quantity));
  }

  async getInventoryBalanceById(id: string): Promise<InventoryBalance | undefined> {
    const [balance] = await db.select().from(inventoryBalances).where(eq(inventoryBalances.id, id));
    return balance;
  }

  async createInventoryBalance(balance: InsertInventoryBalance): Promise<InventoryBalance> {
    const [newBalance] = await db.insert(inventoryBalances).values(balance).returning();
    return newBalance;
  }

  async updateInventoryBalance(id: string, balance: Partial<InsertInventoryBalance>): Promise<InventoryBalance> {
    const [updatedBalance] = await db
      .update(inventoryBalances)
      .set({ ...balance, updatedAt: new Date() })
      .where(eq(inventoryBalances.id, id))
      .returning();
    return updatedBalance;
  }

  async deleteInventoryBalance(id: string): Promise<void> {
    await db.delete(inventoryBalances).where(eq(inventoryBalances.id, id));
  }

  // Putaway Suggestions
  async suggestPutawayLocations(variantId: string, quantity: number): Promise<{ locationId: string; address: string; score: number; reasons: string[] }[]> {
    // Get all BIN locations that allow putaway
    const bins = await db.select()
      .from(warehouseLocations)
      .where(and(
        eq(warehouseLocations.type, 'BIN' as any),
        eq(warehouseLocations.putawayAllowed, true)
      ))
      .orderBy(asc(warehouseLocations.sortKey));

    // Get existing balances for this variant
    const existingBalances = await db.select()
      .from(inventoryBalances)
      .where(eq(inventoryBalances.variantId, variantId));

    const suggestions = [];
    
    for (const bin of bins) {
      let score = 100;
      const reasons: string[] = [];
      
      // Check if bin already has this variant (consolidation)
      const existingInBin = existingBalances.find(b => b.locationId === bin.id);
      if (existingInBin) {
        score += 20;
        reasons.push('Same SKU consolidation');
      }
      
      // Score based on occupancy
      if (bin.currentOccupancy < 30) {
        score += 15;
        reasons.push('Low occupancy');
      } else if (bin.currentOccupancy > 80) {
        score -= 20;
        reasons.push('High occupancy');
      }
      
      // Score based on sort key (lower is closer to dock)
      if (bin.sortKey <= 10) {
        score += 10;
        reasons.push('Near dock');
      }
      
      // Check hazmat compatibility
      if (bin.hazmat) {
        reasons.push('Hazmat area');
      }
      
      suggestions.push({
        locationId: bin.id,
        address: bin.address,
        score,
        reasons
      });
    }
    
    // Sort by score and return top 3
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }
}

export const storage = new DatabaseStorage();
