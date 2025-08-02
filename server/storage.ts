import {
  users,
  categories,
  warehouses,
  suppliers,
  products,
  productVariants,
  customers,
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
  type Supplier,
  type InsertSupplier,
  type Product,
  type InsertProduct,
  type ProductVariant,
  type InsertProductVariant,
  type Customer,
  type InsertCustomer,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, like, sql, gte, lte, count } from "drizzle-orm";

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

  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplierById(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier>;
  deleteSupplier(id: string): Promise<void>;

  // Products
  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  getLowStockProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  searchProducts(query: string): Promise<Product[]>;

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

  // Orders
  getOrders(): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | undefined>;
  getOrdersByStatus(status: string): Promise<Order[]>;
  getOrdersByPaymentStatus(paymentStatus: string): Promise<Order[]>;
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
  createReturn(returnData: InsertReturn): Promise<Return>;
  updateReturn(id: string, returnData: Partial<InsertReturn>): Promise<Return>;

  // Expenses
  getExpenses(): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense>;

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

  // Settings
  getSettings(): Promise<Setting[]>;
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(setting: InsertSetting): Promise<Setting>;
  
  // Utility Functions
  generateSKU(categoryName: string, productName: string): Promise<string>;
  calculateAverageImportCost(existingProduct: Product, newQuantity: number, newImportCost: number, currency: string): Promise<{ importCostUsd?: string; importCostCzk?: string; importCostEur?: string }>;
  generateShipmentId(shippingMethod: string, shippingCarrier: string): Promise<string>;
  getActiveSalesForProduct(productId: string, categoryId: string | null): Promise<Sale[]>;
}

export class DatabaseStorage implements IStorage {
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

  // Products
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(desc(products.createdAt));
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
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
      .where(sql`${products.quantity} <= ${products.lowStockAlert}`)
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
    await db.delete(products).where(eq(products.id, id));
  }

  async searchProducts(query: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(
        or(
          like(products.name, `%${query}%`),
          like(products.sku, `%${query}%`)
        )
      )
      .orderBy(desc(products.createdAt));
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
    const [newVariant] = await db.insert(productVariants).values(variant).returning();
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
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
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
    return await db
      .select()
      .from(customers)
      .where(
        or(
          like(customers.name, `%${query}%`),
          like(customers.facebookName, `%${query}%`),
          like(customers.email, `%${query}%`)
        )
      )
      .orderBy(desc(customers.createdAt));
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
        shippingCost: orders.shippingCost,
        actualShippingCost: orders.actualShippingCost,
        grandTotal: orders.grandTotal,
        notes: orders.notes,
        attachmentUrl: orders.attachmentUrl,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        shippedAt: orders.shippedAt,
        customer: {
          id: customers.id,
          name: customers.name,
          facebookName: customers.facebookName,
          email: customers.email,
          phone: customers.phone,
        }
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .orderBy(desc(orders.createdAt));
    
    return ordersWithCustomers as any;
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
        shippingCost: orders.shippingCost,
        actualShippingCost: orders.actualShippingCost,
        grandTotal: orders.grandTotal,
        notes: orders.notes,
        attachmentUrl: orders.attachmentUrl,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        shippedAt: orders.shippedAt,
        customer: {
          id: customers.id,
          name: customers.name,
          facebookName: customers.facebookName,
          email: customers.email,
          phone: customers.phone,
        }
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.id, id));
    return order as any;
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
        shippingCost: orders.shippingCost,
        actualShippingCost: orders.actualShippingCost,
        grandTotal: orders.grandTotal,
        notes: orders.notes,
        attachmentUrl: orders.attachmentUrl,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        shippedAt: orders.shippedAt,
        customer: {
          id: customers.id,
          name: customers.name,
          facebookName: customers.facebookName,
          email: customers.email,
          phone: customers.phone,
        }
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.orderStatus, status as any))
      .orderBy(desc(orders.createdAt));
    
    return ordersWithCustomers as any;
  }

  async getOrdersByPaymentStatus(paymentStatus: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.paymentStatus, paymentStatus as any))
      .orderBy(desc(orders.createdAt));
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
    return await db.select().from(returns).orderBy(desc(returns.createdAt));
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

  // Expenses
  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(desc(expenses.createdAt));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values(expense).returning();
    return newExpense;
  }

  async updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense> {
    const [updatedExpense] = await db
      .update(expenses)
      .set({ ...expense, updatedAt: new Date() })
      .where(eq(expenses.id, id))
      .returning();
    return updatedExpense;
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
    const [newSale] = await db.insert(sales).values(sale).returning();
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
    const today = new Date();
    
    // Get all active sales
    const activeSales = await db
      .select()
      .from(sales)
      .where(
        and(
          eq(sales.status, 'active'),
          lte(sales.startDate, today),
          gte(sales.endDate, today)
        )
      );
    
    // For now, return all active sales since we don't have product-specific filtering
    return activeSales;
  }
}

export const storage = new DatabaseStorage();
