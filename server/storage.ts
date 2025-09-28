import {
  users,
  categories,
  importPurchases,
  purchaseItems,
  consolidations,
  shipments,
  customItems,
  deliveryHistory,
  customers,
  suppliers,
  products,
  productFiles,
  productLocations,
  orders,
  orderItems,
  warehouses,
  expenses,
  customerLoyaltyPoints,
  employees,
  cashDrawers,
  cashDrawerTransactions,
  posTransactions,
  coupons,
  couponUsage,
  orderPayments,
  taxRates,
  heldOrders,
  managerOverrides,
  posSessions,
  discounts,
  type User,
  type InsertUser,
  type Category,
  type InsertCategory,
  type ImportPurchase,
  type InsertImportPurchase,
  type PurchaseItem,
  type InsertPurchaseItem,
  type Consolidation,
  type InsertConsolidation,
  type Shipment,
  type InsertShipment,
  type CustomItem,
  type InsertCustomItem,
  type DeliveryHistory,
  type InsertDeliveryHistory,
  type Customer,
  type InsertCustomer,
  type Supplier,
  type InsertSupplier,
  type Product,
  type InsertProduct,
  type ProductFile,
  type InsertProductFile,
  type ProductLocation,
  type InsertProductLocation,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type Warehouse,
  type InsertWarehouse,
  type Discount,
  type InsertDiscount,
  type Expense,
  type InsertExpense,
  type UserActivity,
  type InsertUserActivity,
  // POS types
  type CustomerLoyaltyPoints,
  type InsertCustomerLoyaltyPoints,
  type Employee,
  type InsertEmployee,
  type CashDrawer,
  type InsertCashDrawer,
  type CashDrawerTransaction,
  type InsertCashDrawerTransaction,
  type PosTransaction,
  type InsertPosTransaction,
  type Coupon,
  type InsertCoupon,
  type CouponUsage,
  type InsertCouponUsage,
  type OrderPayment,
  type InsertOrderPayment,
  type TaxRate,
  type InsertTaxRate,
  type HeldOrder,
  type InsertHeldOrder,
  type ManagerOverride,
  type InsertManagerOverride,
  type PosSession,
  type InsertPosSession
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, sql, gte, lte, inArray, ne, asc, isNull, notInArray } from "drizzle-orm";

// Define types for missing entities that don't have schema tables yet
export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku?: string;
  price?: string;
  attributes?: Record<string, any>;
}

export interface Return {
  id: string;
  orderId: string;
  customerId?: number;
  reason: string;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  totalAmount: number;
  createdAt: Date;
}

export interface ReturnItem {
  id: string;
  returnId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  reason?: string;
}

export interface Purchase {
  id: string;
  supplierId: string;
  status: 'pending' | 'ordered' | 'received' | 'cancelled';
  totalAmount: number;
  currency: string;
  createdAt: Date;
}

export interface Sale {
  id: string;
  customerId?: number;
  employeeId: string;
  totalAmount: number;
  currency: string;
  status: 'pending' | 'completed' | 'refunded';
  createdAt: Date;
}

export interface Bundle {
  id: string;
  name: string;
  description?: string;
  price: number;
  active: boolean;
}

export interface BundleItem {
  id: string;
  bundleId: string;
  productId: string;
  quantity: number;
}

export interface CustomerPrice {
  customerId: string;
  productId: string;
  price: string;
  currency: string;
  effectiveDate?: Date;
}

export interface PackingMaterial {
  id: string;
  name: string;
  type: 'box' | 'bag' | 'wrapper' | 'padding';
  cost: number;
  dimensions?: Record<string, number>;
}

export interface PackingMaterialUsage {
  id: string;
  orderId: string;
  materialId: string;
  quantity: number;
}

export interface FileType {
  id: string;
  name: string;
  mimeType: string;
  extension: string;
  maxSize?: number;
}

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Import Purchases
  getImportPurchases(): Promise<ImportPurchase[]>;
  getImportPurchase(id: number): Promise<ImportPurchase | undefined>;
  getImportPurchasesAtWarehouse(): Promise<ImportPurchase[]>;
  createImportPurchase(purchase: InsertImportPurchase): Promise<ImportPurchase>;
  updateImportPurchase(id: number, purchase: Partial<InsertImportPurchase>): Promise<ImportPurchase | undefined>;
  deleteImportPurchase(id: number): Promise<boolean>;
  unpackPurchaseOrder(purchaseId: number): Promise<ImportPurchase>;
  
  // Purchase Items
  getPurchaseItems(purchaseId: number): Promise<PurchaseItem[]>;
  createPurchaseItem(item: InsertPurchaseItem): Promise<PurchaseItem>;
  updatePurchaseItem(id: number, item: Partial<InsertPurchaseItem>): Promise<PurchaseItem | undefined>;
  
  // Consolidations
  getConsolidations(): Promise<Consolidation[]>;
  getConsolidation(id: number): Promise<Consolidation | undefined>;
  createConsolidation(consolidation: InsertConsolidation): Promise<Consolidation>;
  updateConsolidation(id: number, consolidation: Partial<InsertConsolidation>): Promise<Consolidation | undefined>;
  
  // Shipments
  getShipments(): Promise<Shipment[]>;
  getShipment(id: number): Promise<Shipment | undefined>;
  createShipment(shipment: InsertShipment): Promise<Shipment>;
  updateShipment(id: number, shipment: Partial<InsertShipment>): Promise<Shipment | undefined>;
  
  // Custom Items
  getCustomItems(): Promise<CustomItem[]>;
  createCustomItem(item: InsertCustomItem): Promise<CustomItem>;
  updateCustomItem(id: number, item: Partial<InsertCustomItem>): Promise<CustomItem | undefined>;
  
  // Delivery History
  createDeliveryHistory(history: InsertDeliveryHistory): Promise<DeliveryHistory>;
  getDeliveryHistory(filters?: Partial<DeliveryHistory>): Promise<DeliveryHistory[]>;
  
  // Orders (compatibility layer for old code)
  getOrders(customerId?: number): Promise<Order[]>;
  getOrdersByStatus(status: string): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrderById(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<boolean>;
  getPickPackOrders(status?: string): Promise<Order[]>;
  startPickingOrder(id: string, employeeId: string): Promise<Order | undefined>;
  completePickingOrder(id: string): Promise<Order | undefined>;
  startPackingOrder(id: string, employeeId: string): Promise<Order | undefined>;
  completePackingOrder(id: string, items: OrderItem[]): Promise<Order | undefined>;
  getOrdersByCustomerId(customerId: number): Promise<Order[]>;
  getUnpaidOrders(): Promise<Order[]>;
  getDashboardMetrics(): Promise<any>;
  
  // Order Items
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  updateOrderItem(id: string, item: Partial<InsertOrderItem>): Promise<OrderItem | undefined>;
  deleteOrderItem(id: string): Promise<boolean>;
  
  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductById(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  getLowStockProducts(): Promise<Product[]>;
  
  // Product Variants
  getProductVariants(productId: string): Promise<ProductVariant[]>;
  createProductVariant(variant: Partial<ProductVariant>): Promise<ProductVariant>;
  updateProductVariant(id: string, variant: Partial<ProductVariant>): Promise<ProductVariant | undefined>;
  deleteProductVariant(id: string): Promise<boolean>;
  
  // Product Locations
  getProductLocations(productId: string): Promise<ProductLocation[]>;
  createProductLocation(location: InsertProductLocation): Promise<ProductLocation>;
  updateProductLocation(id: string, location: Partial<InsertProductLocation>): Promise<ProductLocation | undefined>;
  deleteProductLocation(id: string): Promise<boolean>;
  moveInventory(fromLocationId: string, toLocationId: string, quantity: number): Promise<boolean>;
  
  // Product Files
  getProductFiles(productId: string): Promise<ProductFile[]>;
  getProductFile(id: string): Promise<ProductFile | undefined>;
  createProductFile(file: InsertProductFile): Promise<ProductFile>;
  deleteProductFile(id: string): Promise<boolean>;
  
  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerById(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<boolean>;
  
  // Discounts
  getDiscounts(): Promise<Discount[]>;
  getDiscount(id: string): Promise<Discount | undefined>;
  createDiscount(discount: InsertDiscount): Promise<Discount>;
  updateDiscount(id: string, discount: Partial<InsertDiscount>): Promise<Discount | undefined>;
  deleteDiscount(id: string): Promise<boolean>;
  
  // Warehouses
  getWarehouses(): Promise<Warehouse[]>;
  getWarehouse(id: string): Promise<Warehouse | undefined>;
  createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse>;
  updateWarehouse(id: string, warehouse: Partial<InsertWarehouse>): Promise<Warehouse | undefined>;
  deleteWarehouse(id: string): Promise<boolean>;
  
  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: string): Promise<boolean>;
  
  // Returns
  getReturns(): Promise<Return[]>;
  getReturn(id: string): Promise<Return | undefined>;
  createReturn(returnData: Partial<Return>): Promise<Return>;
  updateReturn(id: string, returnData: Partial<Return>): Promise<Return | undefined>;
  deleteReturn(id: string): Promise<boolean>;
  
  // Return Items
  getReturnItems(returnId: string): Promise<ReturnItem[]>;
  createReturnItem(item: Partial<ReturnItem>): Promise<ReturnItem>;
  
  // Expenses
  getExpenses(): Promise<Expense[]>;
  getExpenseById(id: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;
  
  // Purchases
  getPurchases(): Promise<Purchase[]>;
  getPurchase(id: string): Promise<Purchase | undefined>;
  createPurchase(purchase: Partial<Purchase>): Promise<Purchase>;
  updatePurchase(id: string, purchase: Partial<Purchase>): Promise<Purchase | undefined>;
  deletePurchase(id: string): Promise<boolean>;
  
  // Sales
  getSales(): Promise<Sale[]>;
  createSale(sale: any): Promise<Sale>;
  
  // User Activities
  getUserActivities(): Promise<UserActivity[]>;
  createUserActivity(activity: InsertUserActivity): Promise<UserActivity>;
  
  // Categories
  getCategories(): Promise<Category[]>;
  getCategoryById(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: any): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;
  
  // Bundles
  getBundles(): Promise<Bundle[]>;
  getBundleById(id: string): Promise<Bundle | undefined>;
  createBundle(bundle: any): Promise<Bundle>;
  updateBundle(id: string, bundle: any): Promise<Bundle | undefined>;
  deleteBundle(id: string): Promise<boolean>;
  
  // Bundle Items
  getBundleItems(bundleId: string): Promise<BundleItem[]>;
  createBundleItem(item: any): Promise<BundleItem>;
  updateBundleItem(id: string, item: any): Promise<BundleItem | undefined>;
  deleteBundleItem(id: string): Promise<boolean>;
  
  // Customer Prices
  getCustomerPrices(customerId?: number): Promise<CustomerPrice[]>;
  getActiveCustomerPrice(customerId: number, productId: string): Promise<CustomerPrice | undefined>;
  createCustomerPrice(price: any): Promise<CustomerPrice>;
  updateCustomerPrice(id: string, price: any): Promise<CustomerPrice | undefined>;
  deleteCustomerPrice(id: string): Promise<boolean>;
  
  // Packing Materials
  getPackingMaterials(): Promise<PackingMaterial[]>;
  getPackingMaterial(id: string): Promise<PackingMaterial | undefined>;
  createPackingMaterial(material: any): Promise<PackingMaterial>;
  updatePackingMaterial(id: string, material: any): Promise<PackingMaterial | undefined>;
  deletePackingMaterial(id: string): Promise<boolean>;
  
  // Packing Material Usage
  getPackingMaterialUsage(orderId: string): Promise<PackingMaterialUsage[]>;
  createPackingMaterialUsage(usage: any): Promise<PackingMaterialUsage>;
  
  // Files
  getAllFiles(): Promise<FileType[]>;
  getFilesByType(type: string): Promise<FileType[]>;
  createFile(file: any): Promise<FileType>;
  updateFile(id: string, file: any): Promise<FileType | undefined>;
  deleteFile(id: string): Promise<boolean>;

  // Advanced POS Features
  // Customer Loyalty Points
  getCustomerLoyaltyPoints(customerId: number): Promise<CustomerLoyaltyPoints[]>;
  createLoyaltyPoints(data: InsertCustomerLoyaltyPoints): Promise<CustomerLoyaltyPoints>;
  updateLoyaltyPoints(id: string, data: Partial<InsertCustomerLoyaltyPoints>): Promise<CustomerLoyaltyPoints | undefined>;

  // Employees & Authentication  
  getEmployees(): Promise<any[]>;
  getEmployee(id: string): Promise<any | undefined>;
  getEmployeeByUserId(userId: string): Promise<any | undefined>;
  validateManagerPin(pin: string): Promise<{valid: boolean; manager?: Employee} | undefined>;
  createEmployee(data: InsertEmployee): Promise<Employee>;

  // Cash Drawer Management
  getCashDrawers(): Promise<any[]>;
  getCurrentCashDrawer(): Promise<CashDrawer | undefined>;
  openCashDrawer(data: InsertCashDrawer): Promise<CashDrawer>;
  closeCashDrawer(id: string, data: Partial<CashDrawer>): Promise<CashDrawer | undefined>;
  createCashDrawerTransaction(data: InsertCashDrawerTransaction): Promise<CashDrawerTransaction>;

  // POS Transactions & Audit
  createPosTransaction(data: InsertPosTransaction): Promise<PosTransaction>;
  getPosTransactions(filters?: Partial<PosTransaction>): Promise<PosTransaction[]>;
  getManagerOverrides(filters?: Partial<ManagerOverride>): Promise<ManagerOverride[]>;
  createManagerOverride(data: InsertManagerOverride): Promise<ManagerOverride>;

  // Coupons & Validation
  getCoupons(): Promise<any[]>;
  getCoupon(code: string): Promise<Coupon | undefined>;
  validateCoupon(code: string, customerId?: string, cartData?: any): Promise<{valid: boolean; coupon?: Coupon; discount?: number; message?: string}>;
  createCouponUsage(data: InsertCouponUsage): Promise<CouponUsage>;

  // Order Payments & Split Payments
  getOrderPayments(orderId: string): Promise<any[]>;
  createOrderPayment(data: InsertOrderPayment): Promise<OrderPayment>;
  deleteOrderPayment(id: string): Promise<boolean>;

  // Tax Rates
  getTaxRates(): Promise<any[]>;
  getTaxRate(id: string): Promise<any | undefined>;
  getActiveTaxRate(location?: string): Promise<any | undefined>;

  // Order Hold/Resume
  getHeldOrders(): Promise<any[]>;
  getHeldOrder(holdId: string): Promise<any | undefined>;
  createHeldOrder(data: InsertHeldOrder): Promise<HeldOrder>;
  resumeHeldOrder(holdId: string, resumedBy: number): Promise<any>;
  deleteHeldOrder(holdId: string): Promise<boolean>;

  // POS Sessions
  createPosSession(data: InsertPosSession): Promise<PosSession>;
  closePosSession(id: string, data: Partial<PosSession>): Promise<PosSession | undefined>;
  getCurrentPosSession(): Promise<any | undefined>;

  // Gift Cards
  validateGiftCard(cardNumber: string): Promise<any>;
  
  // Customer Search Enhancement
  searchCustomers(query: string): Promise<any[]>;
  getCustomerWithStats(id: number): Promise<any | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  // Import Purchases
  async getImportPurchases(): Promise<ImportPurchase[]> {
    return await db
      .select()
      .from(importPurchases)
      .orderBy(desc(importPurchases.createdAt));
  }

  async getImportPurchase(id: number): Promise<ImportPurchase | undefined> {
    const [purchase] = await db
      .select()
      .from(importPurchases)
      .where(eq(importPurchases.id, id));
    return purchase || undefined;
  }

  async createImportPurchase(purchase: InsertImportPurchase): Promise<ImportPurchase> {
    const [newPurchase] = await db
      .insert(importPurchases)
      .values(purchase)
      .returning();
    return newPurchase;
  }

  async updateImportPurchase(id: number, purchase: Partial<InsertImportPurchase>): Promise<ImportPurchase | undefined> {
    const [updated] = await db
      .update(importPurchases)
      .set({ ...purchase, updatedAt: new Date() })
      .where(eq(importPurchases.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteImportPurchase(id: number): Promise<boolean> {
    const result = await db
      .delete(importPurchases)
      .where(eq(importPurchases.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getImportPurchasesAtWarehouse(): Promise<any[]> {
    const purchases = await db
      .select()
      .from(importPurchases)
      .where(eq(importPurchases.status, 'at_warehouse'))
      .orderBy(desc(importPurchases.createdAt));
    
    // Get items for each purchase
    const purchasesWithItems = await Promise.all(
      purchases.map(async (purchase) => {
        const items = await db
          .select()
          .from(purchaseItems)
          .where(eq(purchaseItems.purchaseId, purchase.id));
        
        return {
          ...purchase,
          items,
          itemCount: items.length
        };
      })
    );
    
    return purchasesWithItems;
  }

  async unpackPurchaseOrder(purchaseId: number): Promise<any> {
    // Get the purchase order with items
    const [purchase] = await db
      .select()
      .from(importPurchases)
      .where(eq(importPurchases.id, purchaseId));
    
    if (!purchase) {
      throw new Error('Purchase order not found');
    }

    const items = await db
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.purchaseId, purchaseId));

    // Create custom items from purchase items
    const customItemsCreated = [];
    for (const item of items) {
      const customItem = {
        name: item.name,
        source: `Supplier: ${purchase.supplier}`,
        orderNumber: `PO-${purchase.id}`,
        quantity: item.quantity,
        unitPrice: item.unitPrice || '0',
        weight: item.weight || '0',
        dimensions: item.dimensions ? JSON.stringify(item.dimensions) : null,
        trackingNumber: item.trackingNumber || purchase.trackingNumber,
        notes: `From Purchase Order #${purchase.id} - ${purchase.supplier}\n${item.notes || ''}`,
        customerName: null,
        customerEmail: null,
        status: 'available',
        createdAt: new Date()
      };

      const [created] = await db.insert(customItems).values(customItem).returning();
      customItemsCreated.push(created);
    }

    // Update purchase order status to 'unpacked'
    await db
      .update(importPurchases)
      .set({ 
        status: 'unpacked',
        updatedAt: new Date()
      })
      .where(eq(importPurchases.id, purchaseId));

    return {
      success: true,
      itemsCreated: customItemsCreated.length,
      customItems: customItemsCreated
    };
  }
  
  // Purchase Items
  async getPurchaseItems(purchaseId: number): Promise<PurchaseItem[]> {
    return await db
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.purchaseId, purchaseId));
  }

  async createPurchaseItem(item: InsertPurchaseItem): Promise<PurchaseItem> {
    const [newItem] = await db
      .insert(purchaseItems)
      .values(item)
      .returning();
    return newItem;
  }

  async updatePurchaseItem(id: number, item: Partial<InsertPurchaseItem>): Promise<PurchaseItem | undefined> {
    const [updated] = await db
      .update(purchaseItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(purchaseItems.id, id))
      .returning();
    return updated || undefined;
  }
  
  // Consolidations
  async getConsolidations(): Promise<Consolidation[]> {
    return await db
      .select()
      .from(consolidations)
      .orderBy(desc(consolidations.createdAt));
  }

  async getConsolidation(id: number): Promise<Consolidation | undefined> {
    const [consolidation] = await db
      .select()
      .from(consolidations)
      .where(eq(consolidations.id, id));
    return consolidation || undefined;
  }

  async createConsolidation(consolidation: InsertConsolidation): Promise<Consolidation> {
    const [newConsolidation] = await db
      .insert(consolidations)
      .values(consolidation)
      .returning();
    return newConsolidation;
  }

  async updateConsolidation(id: number, consolidation: Partial<InsertConsolidation>): Promise<Consolidation | undefined> {
    const [updated] = await db
      .update(consolidations)
      .set({ ...consolidation, updatedAt: new Date() })
      .where(eq(consolidations.id, id))
      .returning();
    return updated || undefined;
  }
  
  // Shipments
  async getShipments(): Promise<Shipment[]> {
    return await db
      .select()
      .from(shipments)
      .orderBy(desc(shipments.createdAt));
  }

  async getShipment(id: number): Promise<Shipment | undefined> {
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, id));
    return shipment || undefined;
  }

  async createShipment(shipment: InsertShipment): Promise<Shipment> {
    const [newShipment] = await db
      .insert(shipments)
      .values(shipment)
      .returning();
    return newShipment;
  }

  async updateShipment(id: number, shipment: Partial<InsertShipment>): Promise<Shipment | undefined> {
    const [updated] = await db
      .update(shipments)
      .set({ ...shipment, updatedAt: new Date() })
      .where(eq(shipments.id, id))
      .returning();
    return updated || undefined;
  }
  
  // Custom Items
  async getCustomItems(): Promise<CustomItem[]> {
    return await db
      .select()
      .from(customItems)
      .orderBy(desc(customItems.createdAt));
  }

  async createCustomItem(item: InsertCustomItem): Promise<CustomItem> {
    const [newItem] = await db
      .insert(customItems)
      .values(item)
      .returning();
    return newItem;
  }

  async updateCustomItem(id: number, item: Partial<InsertCustomItem>): Promise<CustomItem | undefined> {
    const [updated] = await db
      .update(customItems)
      .set(item)
      .where(eq(customItems.id, id))
      .returning();
    return updated || undefined;
  }
  
  // Delivery History
  async createDeliveryHistory(history: InsertDeliveryHistory): Promise<DeliveryHistory> {
    const [newHistory] = await db
      .insert(deliveryHistory)
      .values(history)
      .returning();
    return newHistory;
  }

  async getDeliveryHistory(filters?: Partial<DeliveryHistory>): Promise<DeliveryHistory[]> {
    let query = db.select().from(deliveryHistory);
    
    if (filters) {
      const conditions = [];
      if (filters.carrier) conditions.push(eq(deliveryHistory.carrier, filters.carrier));
      if (filters.origin) conditions.push(eq(deliveryHistory.origin, filters.origin));
      if (filters.destination) conditions.push(eq(deliveryHistory.destination, filters.destination));
      if (filters.shippingMethod) conditions.push(eq(deliveryHistory.shippingMethod, filters.shippingMethod));
      if (filters.seasonalFactor !== undefined) conditions.push(eq(deliveryHistory.seasonalFactor, Boolean(filters.seasonalFactor)));
      
      if (conditions.length > 0) {
        // @ts-ignore - Temporary fix for type mismatch
        query = query.where(and(...conditions));
      }
    }
    
    return await query;
  }
  
  // Orders - Compatibility stubs (return empty data for now)
  async getOrders(customerId?: number): Promise<Order[]> {
    try {
      if (customerId) {
        const ordersData = await db.select().from(orders).where(eq(orders.customerId, customerId.toString())).orderBy(desc(orders.createdAt));
        return ordersData;
      } else {
        const ordersData = await db.select().from(orders).orderBy(desc(orders.createdAt));
        return ordersData;
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  async getOrdersByStatus(status: string): Promise<Order[]> {
    return [];
  }

  async getOrder(id: string): Promise<Order | undefined> {
    try {
      const [order] = await db.select().from(orders).where(eq(orders.id, id));
      return order || undefined;
    } catch (error) {
      console.error('Error fetching order:', error);
      return undefined;
    }
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    return this.getOrder(id);
  }

  async generateOrderId(): Promise<string> {
    // Generate order ID in format ORDER-YYYYMMDD-XXXX
    const date = new Date();
    const dateStr = date.getFullYear().toString() + 
                   (date.getMonth() + 1).toString().padStart(2, '0') + 
                   date.getDate().toString().padStart(2, '0');
    
    // Get existing orders count for today to generate sequence
    const todayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    
    try {
      const todayOrders = await db.select().from(orders)
        .where(sql`${orders.createdAt} >= ${todayStart} AND ${orders.createdAt} < ${todayEnd}`);
      
      const sequence = (todayOrders.length + 1).toString().padStart(4, '0');
      return `ORDER-${dateStr}-${sequence}`;
    } catch (error) {
      // Fallback to timestamp-based ID if query fails
      const timestamp = Date.now().toString().slice(-4);
      return `ORDER-${dateStr}-${timestamp}`;
    }
  }

  async generateExpenseId(): Promise<string> {
    // Generate expense ID in format EXP-YYYYMMDD-XXXX
    const date = new Date();
    const dateStr = date.getFullYear().toString() + 
                   (date.getMonth() + 1).toString().padStart(2, '0') + 
                   date.getDate().toString().padStart(2, '0');
    
    // Get existing expenses count for today to generate sequence
    const todayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    
    try {
      const todayExpenses = await db.select().from(expenses)
        .where(sql`${expenses.createdAt} >= ${todayStart} AND ${expenses.createdAt} < ${todayEnd}`);
      
      const sequence = (todayExpenses.length + 1).toString().padStart(4, '0');
      return `EXP-${dateStr}-${sequence}`;
    } catch (error) {
      // Fallback to timestamp-based ID if query fails
      const timestamp = Date.now().toString().slice(-4);
      return `EXP-${dateStr}-${timestamp}`;
    }
  }

  async createOrder(orderData: any): Promise<Order> {
    try {
      const [order] = await db
        .insert(orders)
        .values(orderData)
        .returning();
      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async updateOrder(id: string, order: any): Promise<Order | undefined> {
    return { id, ...order };
  }

  async deleteOrder(id: string): Promise<boolean> {
    return true;
  }
  
  async getOrdersByCustomerId(customerId: number): Promise<Order[]> {
    return [];
  }
  
  async getUnpaidOrders(): Promise<Order[]> {
    // Return empty array - orders have been replaced by imports system
    return [];
  }
  
  async getDashboardMetrics(): Promise<any> {
    // Return basic metrics using import data
    const purchases = await this.getImportPurchases();
    const consolidations = await this.getConsolidations();
    const shipments = await this.getShipments();
    
    return {
      totalOrders: 0,
      totalProducts: 0,
      totalCustomers: 0,
      totalPurchases: purchases.length,
      totalConsolidations: consolidations.length,
      totalShipments: shipments.length,
      recentOrders: []
    };
  }

  async getPickPackOrders(status?: string): Promise<Order[]> {
    return [];
  }

  async startPickingOrder(id: string, employeeId: string): Promise<Order | undefined> {
    return undefined;
  }

  async completePickingOrder(id: string): Promise<Order | undefined> {
    return undefined;
  }

  async startPackingOrder(id: string, employeeId: string): Promise<Order | undefined> {
    return undefined;
  }

  async completePackingOrder(id: string, packingDetails: any[]): Promise<Order | undefined> {
    return undefined;
  }

  // Order Items
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return [];
  }

  async createOrderItem(item: any): Promise<OrderItem> {
    return { id: Date.now().toString(), ...item };
  }

  async updateOrderItem(id: string, item: any): Promise<OrderItem | undefined> {
    return { id, ...item };
  }

  async deleteOrderItem(id: string): Promise<boolean> {
    return true;
  }

  // Products
  async getProducts(): Promise<Product[]> {
    try {
      const productsData = await db.select().from(products).orderBy(desc(products.createdAt));
      
      // Include primary location for each product
      const productsWithLocations = await Promise.all(
        productsData.map(async (product) => {
          const [primaryLocation] = await db
            .select()
            .from(productLocations)
            .where(
              and(
                eq(productLocations.productId, product.id),
                eq(productLocations.isPrimary, true)
              )
            )
            .limit(1);
          
          return {
            ...product,
            primaryLocation: primaryLocation || null
          };
        })
      );
      
      return productsWithLocations;
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }

  async getProduct(id: string): Promise<Product | undefined> {
    try {
      const [product] = await db.select().from(products).where(eq(products.id, id));
      
      if (!product) {
        return undefined;
      }
      
      // Include all locations for this product
      const locations = await db
        .select()
        .from(productLocations)
        .where(eq(productLocations.productId, id))
        .orderBy(desc(productLocations.isPrimary), productLocations.locationCode);
      
      // Return the product as-is since the interface expects Product type
      // Locations can be fetched separately using getProductLocations method
      return product;
    } catch (error) {
      console.error('Error fetching product:', error);
      return undefined;
    }
  }

  async getProductById(id: string): Promise<Product | undefined> {
    return this.getProduct(id);
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    try {
      const [product] = await db.select().from(products).where(eq(products.sku, sku));
      return product || undefined;
    } catch (error) {
      console.error('Error fetching product by SKU:', error);
      return undefined;
    }
  }

  async createProduct(productData: any): Promise<Product> {
    try {
      const [product] = await db
        .insert(products)
        .values(productData)
        .returning();
      return product;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  async updateProduct(id: string, productData: any): Promise<Product | undefined> {
    try {
      const [updated] = await db
        .update(products)
        .set({ ...productData, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating product:', error);
      return undefined;
    }
  }

  async deleteProduct(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(products)
        .where(eq(products.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting product:', error);
      return false;
    }
  }

  async getLowStockProducts(): Promise<Product[]> {
    try {
      const lowStockProducts = await db
        .select()
        .from(products)
        .where(sql`${products.quantity} <= ${products.lowStockAlert}`)
        .orderBy(products.quantity);
      return lowStockProducts;
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      return [];
    }
  }

  // Product Variants
  async getProductVariants(productId: string): Promise<ProductVariant[]> {
    return [];
  }

  async createProductVariant(variant: any): Promise<ProductVariant> {
    return { id: Date.now().toString(), ...variant };
  }

  async updateProductVariant(id: string, variant: any): Promise<ProductVariant | undefined> {
    return { id, ...variant };
  }

  async deleteProductVariant(id: string): Promise<boolean> {
    return true;
  }

  // Product Locations
  async getProductLocations(productId: string): Promise<ProductLocation[]> {
    try {
      const locations = await db
        .select()
        .from(productLocations)
        .where(eq(productLocations.productId, productId))
        .orderBy(desc(productLocations.isPrimary), productLocations.locationCode);
      return locations;
    } catch (error) {
      console.error('Error fetching product locations:', error);
      return [];
    }
  }

  async createProductLocation(location: InsertProductLocation): Promise<ProductLocation> {
    try {
      // Check if location code already exists for this product
      const existing = await db
        .select()
        .from(productLocations)
        .where(
          and(
            eq(productLocations.productId, location.productId),
            eq(productLocations.locationCode, location.locationCode)
          )
        );
      
      if (existing.length > 0) {
        throw new Error('Location code already exists for this product');
      }

      // If this is marked as primary, unset other primary locations
      if (location.isPrimary) {
        await db
          .update(productLocations)
          .set({ isPrimary: false })
          .where(eq(productLocations.productId, location.productId));
      }

      const [newLocation] = await db
        .insert(productLocations)
        .values(location)
        .returning();
      return newLocation;
    } catch (error) {
      console.error('Error creating product location:', error);
      throw error;
    }
  }

  async updateProductLocation(id: string, location: Partial<InsertProductLocation>): Promise<ProductLocation | undefined> {
    try {
      // If updating to primary, unset other primary locations
      if (location.isPrimary) {
        const [currentLocation] = await db
          .select()
          .from(productLocations)
          .where(eq(productLocations.id, id));
        
        if (currentLocation) {
          await db
            .update(productLocations)
            .set({ isPrimary: false })
            .where(
              and(
                eq(productLocations.productId, currentLocation.productId),
                ne(productLocations.id, id)
              )
            );
        }
      }

      const [updated] = await db
        .update(productLocations)
        .set({ ...location, updatedAt: new Date() })
        .where(eq(productLocations.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating product location:', error);
      return undefined;
    }
  }

  async deleteProductLocation(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(productLocations)
        .where(eq(productLocations.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting product location:', error);
      return false;
    }
  }

  // Product Files
  async getProductFiles(productId: string): Promise<ProductFile[]> {
    try {
      const files = await db
        .select()
        .from(productFiles)
        .where(eq(productFiles.productId, productId))
        .orderBy(productFiles.fileType, productFiles.language);
      return files;
    } catch (error) {
      console.error('Error fetching product files:', error);
      return [];
    }
  }

  async getProductFile(id: string): Promise<ProductFile | undefined> {
    try {
      const [file] = await db
        .select()
        .from(productFiles)
        .where(eq(productFiles.id, id));
      return file || undefined;
    } catch (error) {
      console.error('Error fetching product file:', error);
      return undefined;
    }
  }

  async createProductFile(file: InsertProductFile): Promise<ProductFile> {
    try {
      const [newFile] = await db
        .insert(productFiles)
        .values(file)
        .returning();
      return newFile;
    } catch (error) {
      console.error('Error creating product file:', error);
      throw error;
    }
  }

  async deleteProductFile(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(productFiles)
        .where(eq(productFiles.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting product file:', error);
      return false;
    }
  }

  async moveInventory(fromLocationId: string, toLocationId: string, quantity: number): Promise<boolean> {
    try {
      // Start a transaction
      return await db.transaction(async (tx) => {
        // Get both locations
        const [fromLocation] = await tx
          .select()
          .from(productLocations)
          .where(eq(productLocations.id, fromLocationId));
        
        const [toLocation] = await tx
          .select()
          .from(productLocations)
          .where(eq(productLocations.id, toLocationId));
        
        if (!fromLocation || !toLocation) {
          throw new Error('One or both locations not found');
        }
        
        if (fromLocation.productId !== toLocation.productId) {
          throw new Error('Locations must be for the same product');
        }
        
        if (fromLocation.quantity < quantity) {
          throw new Error('Insufficient quantity at source location');
        }
        
        // Update quantities
        await tx
          .update(productLocations)
          .set({ 
            quantity: fromLocation.quantity - quantity,
            updatedAt: new Date() 
          })
          .where(eq(productLocations.id, fromLocationId));
        
        await tx
          .update(productLocations)
          .set({ 
            quantity: toLocation.quantity + quantity,
            updatedAt: new Date() 
          })
          .where(eq(productLocations.id, toLocationId));
        
        return true;
      });
    } catch (error) {
      console.error('Error moving inventory:', error);
      return false;
    }
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    try {
      const customersData = await db.select().from(customers).orderBy(desc(customers.createdAt));
      return customersData;
    } catch (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    try {
      const [customer] = await db.select().from(customers).where(eq(customers.id, id.toString()));
      return customer || undefined;
    } catch (error) {
      console.error('Error fetching customer:', error);
      return undefined;
    }
  }

  async getCustomerById(id: number): Promise<Customer | undefined> {
    return this.getCustomer(id);
  }

  async createCustomer(customerData: any): Promise<Customer> {
    try {
      const [customer] = await db
        .insert(customers)
        .values(customerData)
        .returning();
      return customer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  async updateCustomer(id: number, customerData: any): Promise<Customer | undefined> {
    try {
      const [updated] = await db
        .update(customers)
        .set({ ...customerData, updatedAt: new Date() })
        .where(eq(customers.id, id.toString()))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating customer:', error);
      return undefined;
    }
  }

  async deleteCustomer(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(customers)
        .where(eq(customers.id, id.toString()));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting customer:', error);
      return false;
    }
  }

  // All other stub implementations...
  async getDiscounts(): Promise<Discount[]> { return []; }
  async getDiscount(id: string): Promise<Discount | undefined> { return undefined; }
  async createDiscount(discount: any): Promise<Discount> { return { id: Date.now().toString(), ...discount }; }
  async updateDiscount(id: string, discount: any): Promise<Discount | undefined> { return { id, ...discount }; }
  async deleteDiscount(id: string): Promise<boolean> { return true; }

  async getWarehouses(): Promise<Warehouse[]> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM warehouses 
        ORDER BY name
      `);
      return result.rows as Warehouse[];
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      return [];
    }
  }

  async getWarehouse(id: string): Promise<Warehouse | undefined> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM warehouses 
        WHERE id = ${id}
        LIMIT 1
      `);
      return result.rows[0] as Warehouse | undefined;
    } catch (error) {
      console.error('Error fetching warehouse:', error);
      return undefined;
    }
  }

  async createWarehouse(warehouse: any): Promise<Warehouse> {
    try {
      const id = warehouse.id || `WH-${Date.now()}`;
      const result = await db.execute(sql`
        INSERT INTO warehouses (id, name, location, address, city, country, zip_code, phone, email, manager, capacity, type, status, floor_area, code, notes)
        VALUES (${id}, ${warehouse.name}, ${warehouse.location}, ${warehouse.address}, ${warehouse.city}, ${warehouse.country}, 
                ${warehouse.zip_code}, ${warehouse.phone}, ${warehouse.email}, ${warehouse.manager}, 
                ${warehouse.capacity}, ${warehouse.type}, ${warehouse.status || 'active'}, 
                ${warehouse.floor_area}, ${warehouse.code}, ${warehouse.notes})
        RETURNING *
      `);
      return result.rows[0] as Warehouse;
    } catch (error) {
      console.error('Error creating warehouse:', error);
      throw error;
    }
  }

  async updateWarehouse(id: string, warehouse: any): Promise<Warehouse | undefined> {
    try {
      const result = await db.execute(sql`
        UPDATE warehouses 
        SET name = ${warehouse.name},
            location = ${warehouse.location},
            address = ${warehouse.address},
            city = ${warehouse.city},
            country = ${warehouse.country},
            zip_code = ${warehouse.zip_code},
            phone = ${warehouse.phone},
            email = ${warehouse.email},
            manager = ${warehouse.manager},
            capacity = ${warehouse.capacity},
            type = ${warehouse.type},
            status = ${warehouse.status},
            floor_area = ${warehouse.floor_area},
            code = ${warehouse.code},
            notes = ${warehouse.notes}
        WHERE id = ${id}
        RETURNING *
      `);
      return result.rows[0] as Warehouse | undefined;
    } catch (error) {
      console.error('Error updating warehouse:', error);
      return undefined;
    }
  }

  async deleteWarehouse(id: string): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        DELETE FROM warehouses 
        WHERE id = ${id}
      `);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      return false;
    }
  }

  async getSuppliers(): Promise<Supplier[]> {
    try {
      const suppliersData = await db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
      return suppliersData;
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      return [];
    }
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    try {
      const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
      return supplier || undefined;
    } catch (error) {
      console.error('Error fetching supplier:', error);
      return undefined;
    }
  }

  async createSupplier(supplierData: any): Promise<Supplier> {
    try {
      const [supplier] = await db
        .insert(suppliers)
        .values(supplierData)
        .returning();
      return supplier;
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }
  }

  async updateSupplier(id: string, supplierData: any): Promise<Supplier | undefined> {
    try {
      const [updated] = await db
        .update(suppliers)
        .set({ ...supplierData, updatedAt: new Date() })
        .where(eq(suppliers.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating supplier:', error);
      return undefined;
    }
  }

  async deleteSupplier(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(suppliers)
        .where(eq(suppliers.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting supplier:', error);
      return false;
    }
  }

  async getReturns(): Promise<Return[]> { return []; }
  async getReturn(id: string): Promise<Return | undefined> { return undefined; }
  async createReturn(returnData: any): Promise<Return> { return { id: Date.now().toString(), ...returnData }; }
  async updateReturn(id: string, returnData: any): Promise<Return | undefined> { return { id, ...returnData }; }
  async deleteReturn(id: string): Promise<boolean> { return true; }

  async getReturnItems(returnId: string): Promise<ReturnItem[]> { return []; }
  async createReturnItem(item: any): Promise<ReturnItem> { return { id: Date.now().toString(), ...item }; }

  async getExpenses(): Promise<Expense[]> { return []; }
  async getExpenseById(id: string): Promise<Expense | undefined> { return undefined; }
  async createExpense(expense: any): Promise<Expense> { return { id: Date.now().toString(), ...expense }; }
  async updateExpense(id: string, expense: any): Promise<Expense | undefined> { return { id, ...expense }; }
  async deleteExpense(id: string): Promise<boolean> { return true; }

  async getPurchases(): Promise<Purchase[]> { return []; }
  async getPurchase(id: string): Promise<Purchase | undefined> { return undefined; }
  async createPurchase(purchase: any): Promise<Purchase> { return { id: Date.now().toString(), ...purchase }; }
  async updatePurchase(id: string, purchase: any): Promise<Purchase | undefined> { return { id, ...purchase }; }
  async deletePurchase(id: string): Promise<boolean> { return true; }

  async getSales(): Promise<Sale[]> { return []; }
  async createSale(sale: any): Promise<Sale> { return { id: Date.now().toString(), ...sale }; }

  async getUserActivities(): Promise<UserActivity[]> { return []; }
  async createUserActivity(activity: any): Promise<UserActivity> { return { id: Date.now().toString(), ...activity }; }

  // Categories - Optimized with proper error handling
  async getCategories(): Promise<Category[]> {
    try {
      // Using raw SQL for now to avoid schema mismatch issues
      const result = await db.execute(sql`
        SELECT id::integer as id, name, name_en, name_cz, name_vn, description, created_at, updated_at 
        FROM categories 
        ORDER BY name
      `);
      return result.rows as Category[];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  async getCategoryById(id: string): Promise<Category | undefined> {
    try {
      const result = await db.execute(sql`
        SELECT id::integer as id, name, name_en, name_cz, name_vn, description, created_at, updated_at 
        FROM categories 
        WHERE id = ${parseInt(id)}
        LIMIT 1
      `);
      return result.rows[0] as Category | undefined;
    } catch (error) {
      console.error('Error fetching category by id:', error);
      return undefined;
    }
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    try {
      // Use English name as default name if not provided
      const nameEn = (category as any).nameEn || category.name;
      const result = await db.execute(sql`
        INSERT INTO categories (name, name_en, name_cz, name_vn, description, created_at, updated_at)
        VALUES (${nameEn}, ${nameEn}, ${(category as any).nameCz || null}, ${(category as any).nameVn || null}, ${category.description || null}, NOW(), NOW())
        RETURNING id::integer as id, name, name_en, name_cz, name_vn, description, created_at, updated_at
      `);
      return result.rows[0] as Category;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  async updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category | undefined> {
    try {
      // Handle multi-language fields
      const nameEn = (updates as any).nameEn || updates.name;
      const result = await db.execute(sql`
        UPDATE categories 
        SET name = COALESCE(${nameEn}, name),
            name_en = COALESCE(${nameEn}, name_en),
            name_cz = COALESCE(${(updates as any).nameCz}, name_cz),
            name_vn = COALESCE(${(updates as any).nameVn}, name_vn),
            description = COALESCE(${updates.description}, description),
            updated_at = NOW()
        WHERE id = ${parseInt(id)}
        RETURNING id::integer as id, name, name_en, name_cz, name_vn, description, created_at, updated_at
      `);
      return result.rows[0] as Category | undefined;
    } catch (error) {
      console.error('Error updating category:', error);
      return undefined;
    }
  }

  async deleteCategory(id: string): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        DELETE FROM categories WHERE id = ${parseInt(id)}
      `);
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Error deleting category:', error);
      return false;
    }
  }

  async getBundles(): Promise<Bundle[]> { return []; }
  async getBundleById(id: string): Promise<Bundle | undefined> { return undefined; }
  async createBundle(bundle: any): Promise<Bundle> { return { id: Date.now().toString(), ...bundle }; }
  async updateBundle(id: string, bundle: any): Promise<Bundle | undefined> { return { id, ...bundle }; }
  async deleteBundle(id: string): Promise<boolean> { return true; }

  async getBundleItems(bundleId: string): Promise<BundleItem[]> { return []; }
  async createBundleItem(item: any): Promise<BundleItem> { return { id: Date.now().toString(), ...item }; }
  async updateBundleItem(id: string, item: any): Promise<BundleItem | undefined> { return { id, ...item }; }
  async deleteBundleItem(id: string): Promise<boolean> { return true; }

  async getCustomerPrices(customerId?: number): Promise<CustomerPrice[]> { return []; }
  async getActiveCustomerPrice(customerId: number, productId: string): Promise<CustomerPrice | undefined> { return undefined; }
  async createCustomerPrice(price: any): Promise<CustomerPrice> { return { id: Date.now().toString(), ...price }; }
  async updateCustomerPrice(id: string, price: any): Promise<CustomerPrice | undefined> { return { id, ...price }; }
  async deleteCustomerPrice(id: string): Promise<boolean> { return true; }

  async getPackingMaterials(): Promise<PackingMaterial[]> { return []; }
  async getPackingMaterial(id: string): Promise<PackingMaterial | undefined> { return undefined; }
  async createPackingMaterial(material: any): Promise<PackingMaterial> { return { id: Date.now().toString(), ...material }; }
  async updatePackingMaterial(id: string, material: any): Promise<PackingMaterial | undefined> { return { id, ...material }; }
  async deletePackingMaterial(id: string): Promise<boolean> { return true; }

  async getPackingMaterialUsage(orderId: string): Promise<PackingMaterialUsage[]> { return []; }
  async createPackingMaterialUsage(usage: any): Promise<PackingMaterialUsage> { return { id: Date.now().toString(), ...usage }; }

  async getAllFiles(): Promise<FileType[]> { return []; }
  async getFilesByType(type: string): Promise<FileType[]> { return []; }
  async createFile(file: any): Promise<FileType> { return { id: Date.now().toString(), ...file }; }
  async updateFile(id: string, file: any): Promise<FileType | undefined> { return { id, ...file }; }
  async deleteFile(id: string): Promise<boolean> { return true; }

  // Advanced POS Features Implementation
  async getCustomerLoyaltyPoints(customerId: number): Promise<any[]> {
    try {
      const points = await db
        .select()
        .from(customerLoyaltyPoints)
        .where(eq(customerLoyaltyPoints.customerId, customerId.toString()))
        .orderBy(desc(customerLoyaltyPoints.createdAt));
      return points;
    } catch (error) {
      console.error('Error fetching loyalty points:', error);
      return [];
    }
  }

  async createLoyaltyPoints(data: any): Promise<any> {
    const [points] = await db
      .insert(customerLoyaltyPoints)
      .values({
        customerId: data.customerId,
        pointsEarned: data.pointsEarned || 0,
        pointsUsed: data.pointsUsed || 0,
        pointsBalance: data.pointsBalance || 0,
        transactionType: data.transactionType,
        orderId: data.orderId,
        description: data.description,
        createdAt: new Date()
      })
      .returning();
    return points;
  }

  async updateLoyaltyPoints(id: string, data: any): Promise<any> {
    const [updated] = await db
      .update(customerLoyaltyPoints)
      .set({
        pointsEarned: data.pointsEarned,
        pointsUsed: data.pointsUsed,
        pointsBalance: data.pointsBalance,
        description: data.description,
        updatedAt: new Date()
      })
      .where(eq(customerLoyaltyPoints.id, parseInt(id)))
      .returning();
    return updated;
  }

  async getEmployees(): Promise<any[]> {
    try {
      // Query using raw SQL to work with actual database columns
      const result = await db.execute(sql`
        SELECT 
          id,
          id as "employeeId",
          first_name as "firstName",
          last_name as "lastName",
          email,
          phone,
          role,
          pin as "pinCode",
          active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM employees 
        WHERE active = true 
        ORDER BY first_name ASC
      `);
      return result.rows || [];
    } catch (error) {
      console.error('Error fetching employees:', error);
      return [];
    }
  }

  async getEmployee(id: string): Promise<any | undefined> {
    const employees = await this.getEmployees();
    return employees.find(e => e.id.toString() === id);
  }

  async getEmployeeByUserId(userId: string): Promise<any | undefined> {
    try {
      const result = await db.execute(sql`
        SELECT 
          id,
          user_id as "userId",
          employee_id as "employeeId", 
          first_name as "firstName",
          last_name as "lastName",
          role,
          permissions,
          pin_code as "pinCode",
          is_active as "isActive",
          hire_date as "hireDate",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM employees 
        WHERE user_id = ${userId}
        AND is_active = true
        LIMIT 1
      `);
      return result.rows[0] || undefined;
    } catch (error) {
      console.error('Error fetching employee by user ID:', error);
      return undefined;
    }
  }

  async validateManagerPin(pin: string): Promise<any | undefined> {
    try {
      // Query using raw SQL to work with actual database columns
      const result = await db.execute(sql`
        SELECT 
          id,
          id as "employeeId",
          first_name as "firstName",
          last_name as "lastName",
          email,
          phone,
          role,
          pin as "pinCode",
          active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM employees 
        WHERE pin = ${pin}
          AND active = true 
          AND (role = 'manager' OR role = 'admin')
        LIMIT 1
      `);
      return result.rows?.[0];
    } catch (error) {
      console.error('Error validating manager pin:', error);
      return undefined;
    }
  }

  async createEmployee(data: any): Promise<any> {
    return { id: Math.random().toString(), ...data, createdAt: new Date() };
  }

  async getCashDrawers(): Promise<any[]> {
    try {
      const result = await db
        .select()
        .from(cashDrawers)
        .orderBy(desc(cashDrawers.openedAt));
      return result;
    } catch (error) {
      console.error('Error fetching cash drawers:', error);
      return [];
    }
  }

  async getCurrentCashDrawer(): Promise<any | undefined> {
    try {
      const [drawer] = await db
        .select()
        .from(cashDrawers)
        .where(eq(cashDrawers.status, 'open'))
        .orderBy(desc(cashDrawers.openedAt))
        .limit(1);
      return drawer;
    } catch (error) {
      console.error('Error fetching current cash drawer:', error);
      return undefined;
    }
  }

  async openCashDrawer(data: any): Promise<any> {
    try {
      const [drawer] = await db
        .insert(cashDrawers)
        .values({
          employeeId: data.employeeId,
          stationName: data.stationName,
          startingAmount: data.startingAmount || '0',
          currentAmount: data.startingAmount || '0',
          status: 'open',
          openedAt: new Date(),
          notes: data.notes
        })
        .returning();
      return drawer;
    } catch (error) {
      console.error('Error opening cash drawer:', error);
      throw error;
    }
  }

  async closeCashDrawer(id: string, data: any): Promise<any> {
    try {
      const [drawer] = await db
        .update(cashDrawers)
        .set({
          status: 'closed',
          closedAt: new Date(),
          finalAmount: data.finalAmount,
          expectedAmount: data.expectedAmount,
          variance: data.variance,
          closingNotes: data.closingNotes
        })
        .where(eq(cashDrawers.id, parseInt(id)))
        .returning();
      return drawer;
    } catch (error) {
      console.error('Error closing cash drawer:', error);
      throw error;
    }
  }

  async createCashDrawerTransaction(data: any): Promise<any> {
    try {
      const [transaction] = await db
        .insert(cashDrawerTransactions)
        .values({
          drawerId: data.drawerId,
          transactionType: data.transactionType,
          amount: data.amount,
          orderId: data.orderId,
          employeeId: data.employeeId,
          description: data.description
        })
        .returning();
      
      // Update current drawer amount
      if (data.drawerId) {
        await db
          .update(cashDrawers)
          .set({
            currentAmount: sql`${cashDrawers.currentAmount} + ${data.amount}`
          })
          .where(eq(cashDrawers.id, data.drawerId));
      }
      
      return transaction;
    } catch (error) {
      console.error('Error creating cash drawer transaction:', error);
      throw error;
    }
  }

  async createPosTransaction(data: any): Promise<any> {
    try {
      const [transaction] = await db
        .insert(posTransactions)
        .values({
          transactionId: data.transactionId || `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          orderId: data.orderId,
          customerId: data.customerId,
          employeeId: data.employeeId,
          drawerId: data.drawerId,
          transactionType: data.transactionType,
          subtotal: data.subtotal,
          taxAmount: data.taxAmount || '0',
          discountAmount: data.discountAmount || '0',
          tipAmount: data.tipAmount || '0',
          total: data.total,
          paymentMethods: data.paymentMethods || [],
          status: data.status || 'completed',
          notes: data.notes
        })
        .returning();
      return transaction;
    } catch (error) {
      console.error('Error creating POS transaction:', error);
      throw error;
    }
  }

  async getPosTransactions(filters?: any): Promise<any[]> {
    try {
      let query = db.select().from(posTransactions);
      
      if (filters?.employeeId) {
        query = query.where(eq(posTransactions.employeeId, filters.employeeId));
      }
      if (filters?.drawerId) {
        query = query.where(eq(posTransactions.drawerId, filters.drawerId));
      }
      if (filters?.startDate) {
        query = query.where(gte(posTransactions.createdAt, new Date(filters.startDate)));
      }
      if (filters?.endDate) {
        query = query.where(lte(posTransactions.createdAt, new Date(filters.endDate)));
      }
      
      const result = await query.orderBy(desc(posTransactions.createdAt));
      return result;
    } catch (error) {
      console.error('Error fetching POS transactions:', error);
      return [];
    }
  }

  async getManagerOverrides(filters?: any): Promise<any[]> {
    try {
      let query = db.select().from(managerOverrides);
      
      if (filters?.managerId) {
        query = query.where(eq(managerOverrides.managerId, filters.managerId));
      }
      if (filters?.employeeId) {
        query = query.where(eq(managerOverrides.employeeId, filters.employeeId));
      }
      if (filters?.startDate) {
        query = query.where(gte(managerOverrides.approvedAt, new Date(filters.startDate)));
      }
      
      const result = await query.orderBy(desc(managerOverrides.approvedAt));
      return result;
    } catch (error) {
      console.error('Error fetching manager overrides:', error);
      return [];
    }
  }

  async createManagerOverride(data: any): Promise<any> {
    try {
      const [override] = await db
        .insert(managerOverrides)
        .values({
          orderId: data.orderId,
          employeeId: data.employeeId,
          managerId: data.managerId,
          overrideType: data.overrideType,
          originalValue: data.originalValue,
          newValue: data.newValue,
          reason: data.reason,
          justification: data.justification,
          currency: data.currency || 'EUR'
        })
        .returning();
      return override;
    } catch (error) {
      console.error('Error creating manager override:', error);
      throw error;
    }
  }

  async getCoupons(): Promise<any[]> {
    try {
      const result = await db
        .select()
        .from(coupons)
        .where(eq(coupons.isActive, true))
        .orderBy(asc(coupons.name));
      return result;
    } catch (error) {
      console.error('Error fetching coupons:', error);
      return [];
    }
  }

  async getCoupon(code: string): Promise<any | undefined> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM coupons 
        WHERE code = ${code} AND is_active = true
        LIMIT 1
      `);
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching coupon:', error);
      return undefined;
    }
  }

  async validateCoupon(code: string, customerId?: string, cartData?: any): Promise<any> {
    const coupon = await this.getCoupon(code);
    if (!coupon) {
      throw new Error('Coupon not found');
    }
    
    if (coupon.status !== 'active') {
      throw new Error('Coupon is not active');
    }
    
    const now = new Date();
    if (now < new Date(coupon.startDate) || now > new Date(coupon.endDate)) {
      throw new Error('Coupon has expired or is not yet valid');
    }
    
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new Error('Coupon usage limit exceeded');
    }
    
    if (coupon.minimumAmount && cartData?.subtotal < coupon.minimumAmount) {
      throw new Error(`Minimum order amount of $${coupon.minimumAmount} required`);
    }
    
    // Calculate discount
    let calculatedDiscount = 0;
    if (coupon.discountType === 'percentage') {
      calculatedDiscount = (cartData?.subtotal || 0) * (coupon.discountValue / 100);
      if (coupon.maxDiscountAmount) {
        calculatedDiscount = Math.min(calculatedDiscount, coupon.maxDiscountAmount);
      }
    } else if (coupon.discountType === 'fixed_amount') {
      calculatedDiscount = Math.min(coupon.discountValue, cartData?.subtotal || 0);
    }
    
    return {
      ...coupon,
      calculatedDiscount
    };
  }

  async createCouponUsage(data: any): Promise<any> {
    try {
      const [usage] = await db
        .insert(couponUsage)
        .values({
          couponId: data.couponId,
          customerId: data.customerId,
          orderId: data.orderId,
          discountAmount: data.discountAmount
        })
        .returning();

      // Update coupon usage count
      await db
        .update(coupons)
        .set({
          usageCount: sql`${coupons.usageCount} + 1`
        })
        .where(eq(coupons.id, data.couponId));

      return usage;
    } catch (error) {
      console.error('Error creating coupon usage:', error);
      throw error;
    }
  }

  async getOrderPayments(orderId: string): Promise<any[]> {
    try {
      const result = await db
        .select()
        .from(orderPayments)
        .where(eq(orderPayments.orderId, orderId))
        .orderBy(desc(orderPayments.createdAt));
      return result;
    } catch (error) {
      console.error('Error fetching order payments:', error);
      return [];
    }
  }

  async createOrderPayment(data: any): Promise<any> {
    try {
      const [payment] = await db
        .insert(orderPayments)
        .values({
          orderId: data.orderId,
          paymentMethod: data.paymentMethod,
          amount: data.amount,
          currency: data.currency || 'EUR',
          transactionId: data.transactionId,
          cardLastFour: data.cardLastFour,
          approvalCode: data.approvalCode,
          processedBy: data.processedBy,
          status: data.status || 'completed'
        })
        .returning();
      return payment;
    } catch (error) {
      console.error('Error creating order payment:', error);
      throw error;
    }
  }

  async deleteOrderPayment(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(orderPayments)
        .where(eq(orderPayments.id, parseInt(id)));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting order payment:', error);
      return false;
    }
  }

  async getTaxRates(): Promise<any[]> {
    try {
      const result = await db
        .select()
        .from(taxRates)
        .where(eq(taxRates.isActive, true))
        .orderBy(taxRates.name);
      return result;
    } catch (error) {
      console.error('Error fetching tax rates:', error);
      return [];
    }
  }

  async getTaxRate(id: string): Promise<any | undefined> {
    try {
      const [rate] = await db
        .select()
        .from(taxRates)
        .where(eq(taxRates.id, parseInt(id)))
        .limit(1);
      return rate;
    } catch (error) {
      console.error('Error fetching tax rate:', error);
      return undefined;
    }
  }

  async getActiveTaxRate(location?: string): Promise<any | undefined> {
    try {
      let query = db.select().from(taxRates).where(eq(taxRates.isActive, true));
      
      if (location) {
        query = query.where(eq(taxRates.country, location));
      }
      
      const [defaultRate] = await query.where(eq(taxRates.isDefault, true)).limit(1);
      if (defaultRate) return defaultRate;
      
      const [firstRate] = await query.limit(1);
      return firstRate;
    } catch (error) {
      console.error('Error fetching active tax rate:', error);
      return undefined;
    }
  }

  async getHeldOrders(): Promise<any[]> {
    try {
      const result = await db
        .select()
        .from(heldOrders)
        .where(eq(heldOrders.status, 'held'))
        .orderBy(desc(heldOrders.heldAt));
      return result;
    } catch (error) {
      console.error('Error fetching held orders:', error);
      return [];
    }
  }

  async getHeldOrder(holdId: string): Promise<any | undefined> {
    try {
      const [order] = await db
        .select()
        .from(heldOrders)
        .where(eq(heldOrders.holdId, holdId))
        .limit(1);
      return order;
    } catch (error) {
      console.error('Error fetching held order:', error);
      return undefined;
    }
  }

  async createHeldOrder(data: any): Promise<any> {
    try {
      const holdId = `HOLD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      const [order] = await db
        .insert(heldOrders)
        .values({
          holdId,
          customerId: data.customerId,
          employeeId: data.employeeId,
          items: data.items,
          subtotal: data.subtotal,
          taxAmount: data.taxAmount || '0',
          discountAmount: data.discountAmount || '0',
          total: data.total,
          currency: data.currency || 'EUR',
          reason: data.reason,
          notes: data.notes,
          status: 'held'
        })
        .returning();
      return order;
    } catch (error) {
      console.error('Error creating held order:', error);
      throw error;
    }
  }

  async resumeHeldOrder(holdId: string, resumedBy: number): Promise<any> {
    try {
      const [order] = await db
        .update(heldOrders)
        .set({
          status: 'resumed',
          resumedAt: new Date(),
          resumedBy
        })
        .where(eq(heldOrders.holdId, holdId))
        .returning();
      
      if (!order) {
        throw new Error('Held order not found');
      }
      return order;
    } catch (error) {
      console.error('Error resuming held order:', error);
      throw error;
    }
  }

  async deleteHeldOrder(holdId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(heldOrders)
        .where(eq(heldOrders.holdId, holdId));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting held order:', error);
      return false;
    }
  }

  async createPosSession(data: any): Promise<any> {
    try {
      const sessionId = `SES-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const [session] = await db
        .insert(posSessions)
        .values({
          sessionId,
          employeeId: data.employeeId,
          drawerId: data.drawerId,
          stationName: data.stationName,
          status: 'active'
        })
        .returning();
      return session;
    } catch (error) {
      console.error('Error creating POS session:', error);
      throw error;
    }
  }

  async closePosSession(id: string, data: any): Promise<any> {
    try {
      const [session] = await db
        .update(posSessions)
        .set({
          status: 'ended',
          logoutAt: new Date(),
          totalSales: data.totalSales,
          totalTransactions: data.totalTransactions,
          totalRefunds: data.totalRefunds
        })
        .where(eq(posSessions.id, parseInt(id)))
        .returning();
      return session;
    } catch (error) {
      console.error('Error closing POS session:', error);
      throw error;
    }
  }

  async getCurrentPosSession(): Promise<any | undefined> {
    try {
      const [session] = await db
        .select()
        .from(posSessions)
        .where(eq(posSessions.status, 'active'))
        .orderBy(desc(posSessions.loginAt))
        .limit(1);
      return session;
    } catch (error) {
      console.error('Error fetching current POS session:', error);
      return undefined;
    }
  }

  async validateGiftCard(cardNumber: string): Promise<any> {
    const mockCards = {
      'GIFT123456': { balance: 50.00, status: 'active' },
      'GIFT789012': { balance: 25.50, status: 'active' },
      'GIFT999999': { balance: 0.00, status: 'expired' }
    };
    
    const card = mockCards[cardNumber as keyof typeof mockCards];
    if (!card) {
      throw new Error('Gift card not found');
    }
    
    if (card.status !== 'active') {
      throw new Error('Gift card is not active');
    }
    
    if (card.balance <= 0) {
      throw new Error('Gift card has no remaining balance');
    }
    
    return { cardNumber, ...card };
  }

  async searchCustomers(query: string): Promise<any[]> {
    const customers = await this.getCustomers();
    const searchTerm = query.toLowerCase();
    
    return customers
      .filter(customer => 
        customer.name?.toLowerCase().includes(searchTerm) ||
        customer.email?.toLowerCase().includes(searchTerm) ||
        customer.phone?.includes(searchTerm)
      )
      .map(customer => ({
        ...customer,
        totalOrders: Math.floor(Math.random() * 20) + 1,
        totalSpent: (Math.random() * 5000 + 100).toFixed(2),
        averageOrderValue: (Math.random() * 200 + 50).toFixed(2),
        lastOrderDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        hasPayLaterBadge: Math.random() > 0.7,
        payLaterPercentage: Math.floor(Math.random() * 30) + 10
      }));
  }

  async getCustomerWithStats(id: number): Promise<any | undefined> {
    const customer = await this.getCustomer(id);
    if (!customer) return undefined;
    
    const orders = await this.getOrdersByCustomerId(id);
    const loyaltyPoints = await this.getCustomerLoyaltyPoints(id);
    
    return {
      ...customer,
      orderCount: orders.length,
      totalSpent: orders.reduce((sum, order) => sum + parseFloat(order.grandTotal || '0'), 0),
      loyaltyPoints: loyaltyPoints.reduce((sum, lp) => sum + (lp.pointsBalance || 0), 0),
      lastOrderDate: orders.length > 0 ? orders[0].createdAt : null
    };
  }
}

export const storage = new DatabaseStorage();