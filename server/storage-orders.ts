// Order-related storage methods to be added to storage.ts
import {
  orders,
  orderItems,
  products,
  productVariants,
  customers,
  discounts,
  warehouses,
  suppliers,
  returns,
  returnItems,
  expenses,
  purchases,
  sales,
  userActivities,
  categories,
  bundles,
  bundleItems,
  customerPrices,
  packingMaterials,
  packingMaterialUsage,
  files,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type Product,
  type InsertProduct,
  type ProductVariant,
  type InsertProductVariant,
  type Customer,
  type InsertCustomer,
  type Discount,
  type InsertDiscount,
  type Warehouse,
  type InsertWarehouse,
  type Supplier,
  type InsertSupplier,
  type Return,
  type InsertReturn,
  type ReturnItem,
  type InsertReturnItem,
  type Expense,
  type InsertExpense,
  type Purchase,
  type InsertPurchase,
  type Sale,
  type InsertSale,
  type UserActivity,
  type InsertUserActivity,
  type Category,
  type InsertCategory,
  type Bundle,
  type InsertBundle,
  type BundleItem,
  type InsertBundleItem,
  type CustomerPrice,
  type InsertCustomerPrice,
  type PackingMaterial,
  type InsertPackingMaterial,
  type PackingMaterialUsage,
  type InsertPackingMaterialUsage,
  type File as FileType,
  type InsertFile
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, sql, gte, lte, inArray, ne, asc, isNull, notInArray } from "drizzle-orm";

// These are the order-related methods that need to be added to the existing storage.ts

export interface IOrderStorage {
  // Orders
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
  completePackingOrder(id: string, items: any[]): Promise<Order | undefined>;
  
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
  createProductVariant(variant: InsertProductVariant): Promise<ProductVariant>;
  updateProductVariant(id: string, variant: Partial<InsertProductVariant>): Promise<ProductVariant | undefined>;
  deleteProductVariant(id: string): Promise<boolean>;
  
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
  createReturn(returnData: InsertReturn): Promise<Return>;
  updateReturn(id: string, returnData: Partial<InsertReturn>): Promise<Return | undefined>;
  deleteReturn(id: string): Promise<boolean>;
  
  // Return Items
  getReturnItems(returnId: string): Promise<ReturnItem[]>;
  createReturnItem(item: InsertReturnItem): Promise<ReturnItem>;
  
  // Expenses
  getExpenses(): Promise<Expense[]>;
  getExpenseById(id: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;
  
  // Purchases
  getPurchases(): Promise<Purchase[]>;
  getPurchase(id: string): Promise<Purchase | undefined>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  updatePurchase(id: string, purchase: Partial<InsertPurchase>): Promise<Purchase | undefined>;
  deletePurchase(id: string): Promise<boolean>;
  
  // Sales
  getSales(): Promise<Sale[]>;
  createSale(sale: InsertSale): Promise<Sale>;
  
  // User Activities
  getUserActivities(): Promise<UserActivity[]>;
  createUserActivity(activity: InsertUserActivity): Promise<UserActivity>;
  
  // Categories
  getCategories(): Promise<Category[]>;
  getCategoryById(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;
  
  // Bundles
  getBundles(): Promise<Bundle[]>;
  getBundleById(id: string): Promise<Bundle | undefined>;
  createBundle(bundle: InsertBundle): Promise<Bundle>;
  updateBundle(id: string, bundle: Partial<InsertBundle>): Promise<Bundle | undefined>;
  deleteBundle(id: string): Promise<boolean>;
  
  // Bundle Items
  getBundleItems(bundleId: string): Promise<BundleItem[]>;
  createBundleItem(item: InsertBundleItem): Promise<BundleItem>;
  updateBundleItem(id: string, item: Partial<InsertBundleItem>): Promise<BundleItem | undefined>;
  deleteBundleItem(id: string): Promise<boolean>;
  
  // Customer Prices
  getCustomerPrices(customerId?: number): Promise<CustomerPrice[]>;
  getActiveCustomerPrice(customerId: number, productId: string): Promise<CustomerPrice | undefined>;
  createCustomerPrice(price: InsertCustomerPrice): Promise<CustomerPrice>;
  updateCustomerPrice(id: string, price: Partial<InsertCustomerPrice>): Promise<CustomerPrice | undefined>;
  deleteCustomerPrice(id: string): Promise<boolean>;
  
  // Packing Materials
  getPackingMaterials(): Promise<PackingMaterial[]>;
  getPackingMaterial(id: string): Promise<PackingMaterial | undefined>;
  createPackingMaterial(material: InsertPackingMaterial): Promise<PackingMaterial>;
  updatePackingMaterial(id: string, material: Partial<InsertPackingMaterial>): Promise<PackingMaterial | undefined>;
  deletePackingMaterial(id: string): Promise<boolean>;
  
  // Packing Material Usage
  getPackingMaterialUsage(orderId: string): Promise<PackingMaterialUsage[]>;
  createPackingMaterialUsage(usage: InsertPackingMaterialUsage): Promise<PackingMaterialUsage>;
  
  // Files
  getAllFiles(): Promise<FileType[]>;
  getFilesByType(type: string): Promise<FileType[]>;
  createFile(file: InsertFile): Promise<FileType>;
  updateFile(id: string, file: Partial<InsertFile>): Promise<FileType | undefined>;
  deleteFile(id: string): Promise<boolean>;
}

export class OrderDatabaseStorage implements IOrderStorage {
  // Orders
  async getOrders(customerId?: number): Promise<Order[]> {
    let query = db.select().from(orders);
    
    if (customerId) {
      query = query.where(eq(orders.customerId, customerId));
    }
    
    const orderList = await query.orderBy(desc(orders.createdAt));
    
    // Fetch items for each order
    const ordersWithItems = await Promise.all(
      orderList.map(async (order) => {
        const items = await this.getOrderItems(order.id);
        return { ...order, items };
      })
    );
    
    return ordersWithItems;
  }

  async getOrdersByStatus(status: string): Promise<Order[]> {
    const orderList = await db
      .select()
      .from(orders)
      .where(eq(orders.status, status))
      .orderBy(desc(orders.createdAt));
    
    const ordersWithItems = await Promise.all(
      orderList.map(async (order) => {
        const items = await this.getOrderItems(order.id);
        return { ...order, items };
      })
    );
    
    return ordersWithItems;
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.getOrderById(id);
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    
    if (order) {
      const items = await this.getOrderItems(order.id);
      return { ...order, items };
    }
    
    return undefined;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined> {
    const [updated] = await db
      .update(orders)
      .set({ ...order, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    
    if (updated) {
      const items = await this.getOrderItems(updated.id);
      return { ...updated, items };
    }
    
    return undefined;
  }

  async deleteOrder(id: string): Promise<boolean> {
    const result = await db.delete(orders).where(eq(orders.id, id));
    return result.rowCount > 0;
  }

  async getPickPackOrders(status?: string): Promise<Order[]> {
    let query = db.select().from(orders);
    
    if (status) {
      if (status === 'pending') {
        query = query.where(and(
          eq(orders.status, 'pending'),
          isNull(orders.pickStatus)
        ));
      } else if (status === 'picking') {
        query = query.where(eq(orders.pickStatus, 'in_progress'));
      } else if (status === 'packing') {
        query = query.where(eq(orders.packStatus, 'in_progress'));
      } else if (status === 'ready') {
        query = query.where(eq(orders.packStatus, 'completed'));
      }
    }
    
    const orderList = await query.orderBy(desc(orders.createdAt));
    
    const ordersWithItems = await Promise.all(
      orderList.map(async (order) => {
        const items = await this.getOrderItems(order.id);
        return { ...order, items };
      })
    );
    
    return ordersWithItems;
  }

  async startPickingOrder(id: string, employeeId: string): Promise<Order | undefined> {
    const [updated] = await db
      .update(orders)
      .set({
        pickStatus: 'in_progress',
        pickedBy: employeeId,
        pickStartTime: new Date(),
        updatedAt: new Date()
      })
      .where(eq(orders.id, id))
      .returning();
    
    if (updated) {
      const items = await this.getOrderItems(updated.id);
      return { ...updated, items };
    }
    
    return undefined;
  }

  async completePickingOrder(id: string): Promise<Order | undefined> {
    const [updated] = await db
      .update(orders)
      .set({
        pickStatus: 'completed',
        pickEndTime: new Date(),
        updatedAt: new Date()
      })
      .where(eq(orders.id, id))
      .returning();
    
    if (updated) {
      const items = await this.getOrderItems(updated.id);
      return { ...updated, items };
    }
    
    return undefined;
  }

  async startPackingOrder(id: string, employeeId: string): Promise<Order | undefined> {
    const [updated] = await db
      .update(orders)
      .set({
        packStatus: 'in_progress',
        packedBy: employeeId,
        packStartTime: new Date(),
        updatedAt: new Date()
      })
      .where(eq(orders.id, id))
      .returning();
    
    if (updated) {
      const items = await this.getOrderItems(updated.id);
      return { ...updated, items };
    }
    
    return undefined;
  }

  async completePackingOrder(id: string, packingDetails: any[]): Promise<Order | undefined> {
    const [updated] = await db
      .update(orders)
      .set({
        packStatus: 'completed',
        packEndTime: new Date(),
        status: 'ready_to_ship',
        updatedAt: new Date()
      })
      .where(eq(orders.id, id))
      .returning();
    
    if (updated) {
      const items = await this.getOrderItems(updated.id);
      return { ...updated, items };
    }
    
    return undefined;
  }

  // Order Items
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [newItem] = await db.insert(orderItems).values(item).returning();
    return newItem;
  }

  async updateOrderItem(id: string, item: Partial<InsertOrderItem>): Promise<OrderItem | undefined> {
    const [updated] = await db
      .update(orderItems)
      .set(item)
      .where(eq(orderItems.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteOrderItem(id: string): Promise<boolean> {
    const result = await db.delete(orderItems).where(eq(orderItems.id, id));
    return result.rowCount > 0;
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(desc(products.createdAt));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductById(id: string): Promise<Product | undefined> {
    return this.getProduct(id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db
      .update(products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return result.rowCount > 0;
  }

  async getLowStockProducts(): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(lte(products.stock, 10))
      .orderBy(asc(products.stock));
  }

  // Product Variants
  async getProductVariants(productId: string): Promise<ProductVariant[]> {
    return await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, productId));
  }

  async createProductVariant(variant: InsertProductVariant): Promise<ProductVariant> {
    const [newVariant] = await db.insert(productVariants).values(variant).returning();
    return newVariant;
  }

  async updateProductVariant(id: string, variant: Partial<InsertProductVariant>): Promise<ProductVariant | undefined> {
    const [updated] = await db
      .update(productVariants)
      .set(variant)
      .where(eq(productVariants.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProductVariant(id: string): Promise<boolean> {
    const result = await db.delete(productVariants).where(eq(productVariants.id, id));
    return result.rowCount > 0;
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async getCustomerById(id: number): Promise<Customer | undefined> {
    return this.getCustomer(id);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updated] = await db
      .update(customers)
      .set({ ...customer, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCustomer(id: number): Promise<boolean> {
    const result = await db.delete(customers).where(eq(customers.id, id));
    return result.rowCount > 0;
  }

  // All other methods follow similar pattern...
  // [Implementation continues for all other entities]
  
  // Discounts
  async getDiscounts(): Promise<Discount[]> {
    return await db.select().from(discounts).orderBy(desc(discounts.createdAt));
  }

  async getDiscount(id: string): Promise<Discount | undefined> {
    const [discount] = await db.select().from(discounts).where(eq(discounts.id, id));
    return discount || undefined;
  }

  async createDiscount(discount: InsertDiscount): Promise<Discount> {
    const [newDiscount] = await db.insert(discounts).values(discount).returning();
    return newDiscount;
  }

  async updateDiscount(id: string, discount: Partial<InsertDiscount>): Promise<Discount | undefined> {
    const [updated] = await db
      .update(discounts)
      .set({ ...discount, updatedAt: new Date() })
      .where(eq(discounts.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteDiscount(id: string): Promise<boolean> {
    const result = await db.delete(discounts).where(eq(discounts.id, id));
    return result.rowCount > 0;
  }

  // Warehouses
  async getWarehouses(): Promise<Warehouse[]> {
    return await db.select().from(warehouses).orderBy(desc(warehouses.createdAt));
  }

  async getWarehouse(id: string): Promise<Warehouse | undefined> {
    const [warehouse] = await db.select().from(warehouses).where(eq(warehouses.id, id));
    return warehouse || undefined;
  }

  async createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse> {
    const [newWarehouse] = await db.insert(warehouses).values(warehouse).returning();
    return newWarehouse;
  }

  async updateWarehouse(id: string, warehouse: Partial<InsertWarehouse>): Promise<Warehouse | undefined> {
    const [updated] = await db
      .update(warehouses)
      .set({ ...warehouse, updatedAt: new Date() })
      .where(eq(warehouses.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteWarehouse(id: string): Promise<boolean> {
    const result = await db.delete(warehouses).where(eq(warehouses.id, id));
    return result.rowCount > 0;
  }

  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier || undefined;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [newSupplier] = await db.insert(suppliers).values(supplier).returning();
    return newSupplier;
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const [updated] = await db
      .update(suppliers)
      .set({ ...supplier, updatedAt: new Date() })
      .where(eq(suppliers.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteSupplier(id: string): Promise<boolean> {
    const result = await db.delete(suppliers).where(eq(suppliers.id, id));
    return result.rowCount > 0;
  }

  // Returns
  async getReturns(): Promise<Return[]> {
    return await db.select().from(returns).orderBy(desc(returns.createdAt));
  }

  async getReturn(id: string): Promise<Return | undefined> {
    const [returnData] = await db.select().from(returns).where(eq(returns.id, id));
    return returnData || undefined;
  }

  async createReturn(returnData: InsertReturn): Promise<Return> {
    const [newReturn] = await db.insert(returns).values(returnData).returning();
    return newReturn;
  }

  async updateReturn(id: string, returnData: Partial<InsertReturn>): Promise<Return | undefined> {
    const [updated] = await db
      .update(returns)
      .set({ ...returnData, updatedAt: new Date() })
      .where(eq(returns.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteReturn(id: string): Promise<boolean> {
    const result = await db.delete(returns).where(eq(returns.id, id));
    return result.rowCount > 0;
  }

  // Return Items
  async getReturnItems(returnId: string): Promise<ReturnItem[]> {
    return await db
      .select()
      .from(returnItems)
      .where(eq(returnItems.returnId, returnId));
  }

  async createReturnItem(item: InsertReturnItem): Promise<ReturnItem> {
    const [newItem] = await db.insert(returnItems).values(item).returning();
    return newItem;
  }

  // Expenses
  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(desc(expenses.date));
  }

  async getExpenseById(id: string): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense || undefined;
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values(expense).returning();
    return newExpense;
  }

  async updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [updated] = await db
      .update(expenses)
      .set({ ...expense, updatedAt: new Date() })
      .where(eq(expenses.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteExpense(id: string): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id));
    return result.rowCount > 0;
  }

  // Purchases
  async getPurchases(): Promise<Purchase[]> {
    return await db.select().from(purchases).orderBy(desc(purchases.createdAt));
  }

  async getPurchase(id: string): Promise<Purchase | undefined> {
    const [purchase] = await db.select().from(purchases).where(eq(purchases.id, id));
    return purchase || undefined;
  }

  async createPurchase(purchase: InsertPurchase): Promise<Purchase> {
    const [newPurchase] = await db.insert(purchases).values(purchase).returning();
    return newPurchase;
  }

  async updatePurchase(id: string, purchase: Partial<InsertPurchase>): Promise<Purchase | undefined> {
    const [updated] = await db
      .update(purchases)
      .set({ ...purchase, updatedAt: new Date() })
      .where(eq(purchases.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePurchase(id: string): Promise<boolean> {
    const result = await db.delete(purchases).where(eq(purchases.id, id));
    return result.rowCount > 0;
  }

  // Sales
  async getSales(): Promise<Sale[]> {
    return await db.select().from(sales).orderBy(desc(sales.createdAt));
  }

  async createSale(sale: InsertSale): Promise<Sale> {
    const [newSale] = await db.insert(sales).values(sale).returning();
    return newSale;
  }

  // User Activities
  async getUserActivities(): Promise<UserActivity[]> {
    return await db.select().from(userActivities).orderBy(desc(userActivities.createdAt));
  }

  async createUserActivity(activity: InsertUserActivity): Promise<UserActivity> {
    const [newActivity] = await db.insert(userActivities).values(activity).returning();
    return newActivity;
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(asc(categories.name));
  }

  async getCategoryById(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await db
      .update(categories)
      .set({ ...category, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id));
    return result.rowCount > 0;
  }

  // Bundles
  async getBundles(): Promise<Bundle[]> {
    return await db.select().from(bundles).orderBy(desc(bundles.createdAt));
  }

  async getBundleById(id: string): Promise<Bundle | undefined> {
    const [bundle] = await db.select().from(bundles).where(eq(bundles.id, id));
    return bundle || undefined;
  }

  async createBundle(bundle: InsertBundle): Promise<Bundle> {
    const [newBundle] = await db.insert(bundles).values(bundle).returning();
    return newBundle;
  }

  async updateBundle(id: string, bundle: Partial<InsertBundle>): Promise<Bundle | undefined> {
    const [updated] = await db
      .update(bundles)
      .set({ ...bundle, updatedAt: new Date() })
      .where(eq(bundles.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteBundle(id: string): Promise<boolean> {
    const result = await db.delete(bundles).where(eq(bundles.id, id));
    return result.rowCount > 0;
  }

  // Bundle Items
  async getBundleItems(bundleId: string): Promise<BundleItem[]> {
    return await db
      .select()
      .from(bundleItems)
      .where(eq(bundleItems.bundleId, bundleId));
  }

  async createBundleItem(item: InsertBundleItem): Promise<BundleItem> {
    const [newItem] = await db.insert(bundleItems).values(item).returning();
    return newItem;
  }

  async updateBundleItem(id: string, item: Partial<InsertBundleItem>): Promise<BundleItem | undefined> {
    const [updated] = await db
      .update(bundleItems)
      .set(item)
      .where(eq(bundleItems.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteBundleItem(id: string): Promise<boolean> {
    const result = await db.delete(bundleItems).where(eq(bundleItems.id, id));
    return result.rowCount > 0;
  }

  // Customer Prices
  async getCustomerPrices(customerId?: number): Promise<CustomerPrice[]> {
    let query = db.select().from(customerPrices);
    
    if (customerId) {
      query = query.where(eq(customerPrices.customerId, customerId));
    }
    
    return await query.orderBy(desc(customerPrices.createdAt));
  }

  async getActiveCustomerPrice(customerId: number, productId: string): Promise<CustomerPrice | undefined> {
    const now = new Date();
    const [price] = await db
      .select()
      .from(customerPrices)
      .where(and(
        eq(customerPrices.customerId, customerId),
        eq(customerPrices.productId, productId),
        or(
          isNull(customerPrices.validFrom),
          lte(customerPrices.validFrom, now)
        ),
        or(
          isNull(customerPrices.validTo),
          gte(customerPrices.validTo, now)
        )
      ))
      .orderBy(desc(customerPrices.createdAt));
    
    return price || undefined;
  }

  async createCustomerPrice(price: InsertCustomerPrice): Promise<CustomerPrice> {
    const [newPrice] = await db.insert(customerPrices).values(price).returning();
    return newPrice;
  }

  async updateCustomerPrice(id: string, price: Partial<InsertCustomerPrice>): Promise<CustomerPrice | undefined> {
    const [updated] = await db
      .update(customerPrices)
      .set({ ...price, updatedAt: new Date() })
      .where(eq(customerPrices.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCustomerPrice(id: string): Promise<boolean> {
    const result = await db.delete(customerPrices).where(eq(customerPrices.id, id));
    return result.rowCount > 0;
  }

  // Packing Materials
  async getPackingMaterials(): Promise<PackingMaterial[]> {
    return await db.select().from(packingMaterials).orderBy(asc(packingMaterials.name));
  }

  async getPackingMaterial(id: string): Promise<PackingMaterial | undefined> {
    const [material] = await db.select().from(packingMaterials).where(eq(packingMaterials.id, id));
    return material || undefined;
  }

  async createPackingMaterial(material: InsertPackingMaterial): Promise<PackingMaterial> {
    const [newMaterial] = await db.insert(packingMaterials).values(material).returning();
    return newMaterial;
  }

  async updatePackingMaterial(id: string, material: Partial<InsertPackingMaterial>): Promise<PackingMaterial | undefined> {
    const [updated] = await db
      .update(packingMaterials)
      .set({ ...material, updatedAt: new Date() })
      .where(eq(packingMaterials.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePackingMaterial(id: string): Promise<boolean> {
    const result = await db.delete(packingMaterials).where(eq(packingMaterials.id, id));
    return result.rowCount > 0;
  }

  // Packing Material Usage
  async getPackingMaterialUsage(orderId: string): Promise<PackingMaterialUsage[]> {
    return await db
      .select()
      .from(packingMaterialUsage)
      .where(eq(packingMaterialUsage.orderId, orderId));
  }

  async createPackingMaterialUsage(usage: InsertPackingMaterialUsage): Promise<PackingMaterialUsage> {
    const [newUsage] = await db.insert(packingMaterialUsage).values(usage).returning();
    return newUsage;
  }

  // Files
  async getAllFiles(): Promise<FileType[]> {
    return await db.select().from(files).orderBy(desc(files.createdAt));
  }

  async getFilesByType(type: string): Promise<FileType[]> {
    return await db
      .select()
      .from(files)
      .where(eq(files.type, type))
      .orderBy(desc(files.createdAt));
  }

  async createFile(file: InsertFile): Promise<FileType> {
    const [newFile] = await db.insert(files).values(file).returning();
    return newFile;
  }

  async updateFile(id: string, file: Partial<InsertFile>): Promise<FileType | undefined> {
    const [updated] = await db
      .update(files)
      .set({ ...file, updatedAt: new Date() })
      .where(eq(files.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteFile(id: string): Promise<boolean> {
    const result = await db.delete(files).where(eq(files.id, id));
    return result.rowCount > 0;
  }
}