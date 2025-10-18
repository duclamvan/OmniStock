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
  customerShippingAddresses,
  customerBillingAddresses,
  suppliers,
  products,
  productVariants,
  productFiles,
  productLocations,
  productTieredPricing,
  productBundles,
  bundleItems,
  dailySequences,
  orders,
  orderItems,
  warehouses,
  warehouseFiles,
  warehouseFinancialContracts,
  warehouseLayouts,
  layoutBins,
  services,
  serviceItems,
  preOrders,
  preOrderItems,
  packingCartons,
  orderCartonPlans,
  orderCartonItems,
  expenses,
  packingMaterials,
  packingMaterialUsage,
  pmSuppliers,
  discounts,
  tickets,
  ticketComments,
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
  type CustomerShippingAddress,
  type InsertCustomerShippingAddress,
  type CustomerBillingAddress,
  type InsertCustomerBillingAddress,
  type Supplier,
  type InsertSupplier,
  type Product,
  type InsertProduct,
  type ProductVariant,
  type InsertProductVariant,
  type ProductFile,
  type InsertProductFile,
  type ProductLocation,
  type InsertProductLocation,
  type ProductTieredPricing,
  type InsertProductTieredPricing,
  type ProductBundle,
  type InsertProductBundle,
  type BundleItem,
  type InsertBundleItem,
  type DailySequence,
  type InsertDailySequence,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type Warehouse,
  type InsertWarehouse,
  type WarehouseFile,
  type InsertWarehouseFile,
  type WarehouseFinancialContract,
  type InsertWarehouseFinancialContract,
  type WarehouseLayout,
  type InsertWarehouseLayout,
  type LayoutBin,
  type InsertLayoutBin,
  type Service,
  type InsertService,
  type ServiceItem,
  type InsertServiceItem,
  type PreOrder,
  type InsertPreOrder,
  type PreOrderItem,
  type InsertPreOrderItem,
  type PackingCarton,
  type InsertPackingCarton,
  type OrderCartonPlan,
  type InsertOrderCartonPlan,
  type OrderCartonItem,
  type InsertOrderCartonItem,
  type PackingMaterial,
  type InsertPackingMaterial,
  type PackingMaterialUsage,
  type InsertPackingMaterialUsage,
  type PmSupplier,
  type InsertPmSupplier,
  type Discount,
  type InsertDiscount,
  type Ticket,
  type InsertTicket,
  type TicketComment,
  type InsertTicketComment
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, ilike, sql, gte, lte, inArray, ne, asc, isNull, notInArray } from "drizzle-orm";

// Define types for missing entities (these should match what the app expects)
export type Return = any;
export type ReturnItem = any;
export type Expense = any;
export type AppService = any;
export type Purchase = any;
export type Sale = any;
export type UserActivity = any;
export type AppCategory = any;
export type Bundle = any;
export type CustomerPrice = any;
export type FileType = any;

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Import Purchases
  getImportPurchases(): Promise<ImportPurchase[]>;
  getImportPurchase(id: number): Promise<ImportPurchase | undefined>;
  getImportPurchasesAtWarehouse(): Promise<any[]>;
  createImportPurchase(purchase: InsertImportPurchase): Promise<ImportPurchase>;
  updateImportPurchase(id: number, purchase: Partial<InsertImportPurchase>): Promise<ImportPurchase | undefined>;
  deleteImportPurchase(id: number): Promise<boolean>;
  unpackPurchaseOrder(purchaseId: number): Promise<any>;
  
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
  getOrdersByPaymentStatus(paymentStatus: string): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrderById(id: string): Promise<Order | undefined>;
  createOrder(order: any): Promise<Order>;
  updateOrder(id: string, order: any): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<boolean>;
  getPickPackOrders(status?: string): Promise<Order[]>;
  startPickingOrder(id: string, employeeId: string): Promise<Order | undefined>;
  completePickingOrder(id: string): Promise<Order | undefined>;
  startPackingOrder(id: string, employeeId: string): Promise<Order | undefined>;
  completePackingOrder(id: string, items: any[]): Promise<Order | undefined>;
  getOrdersByCustomerId(customerId: string): Promise<Order[]>;
  getUnpaidOrders(): Promise<Order[]>;
  getDashboardMetrics(): Promise<any>;
  
  // Order Items
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  createOrderItem(item: any): Promise<OrderItem>;
  updateOrderItem(id: string, item: any): Promise<OrderItem | undefined>;
  deleteOrderItem(id: string): Promise<boolean>;
  deleteOrderItems(orderId: string): Promise<boolean>;
  updateOrderItemPickedQuantity(id: string, quantity: number, timestamp?: Date): Promise<OrderItem | undefined>;
  updateOrderItemPackedQuantity(id: string, quantity: number): Promise<OrderItem | undefined>;
  
  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductById(id: string): Promise<Product | undefined>;
  createProduct(product: any): Promise<Product>;
  updateProduct(id: string, product: any): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  getLowStockProducts(): Promise<Product[]>;
  
  // Product Variants
  getProductVariants(productId: string): Promise<ProductVariant[]>;
  createProductVariant(variant: any): Promise<ProductVariant>;
  updateProductVariant(id: string, variant: any): Promise<ProductVariant | undefined>;
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
  updateProductFile(id: string, data: Partial<InsertProductFile>): Promise<ProductFile | undefined>;
  deleteProductFile(id: string): Promise<boolean>;
  
  // Product Tiered Pricing
  getProductTieredPricing(productId: string): Promise<ProductTieredPricing[]>;
  createProductTieredPricing(data: InsertProductTieredPricing): Promise<ProductTieredPricing>;
  updateProductTieredPricing(id: string, data: Partial<InsertProductTieredPricing>): Promise<ProductTieredPricing | undefined>;
  deleteProductTieredPricing(id: string): Promise<boolean>;
  
  // Product Bundles
  getProductBundles(): Promise<ProductBundle[]>;
  getProductBundle(id: string): Promise<ProductBundle | undefined>;
  createProductBundle(bundle: InsertProductBundle): Promise<ProductBundle>;
  updateProductBundle(id: string, bundle: Partial<InsertProductBundle>): Promise<ProductBundle | undefined>;
  deleteProductBundle(id: string): Promise<boolean>;
  
  // Bundle Items
  getBundleItems(bundleId: string): Promise<BundleItem[]>;
  createBundleItem(item: InsertBundleItem): Promise<BundleItem>;
  deleteBundleItems(bundleId: string): Promise<boolean>;
  
  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerById(id: string): Promise<Customer | undefined>;
  createCustomer(customer: any): Promise<Customer>;
  updateCustomer(id: string, customer: any): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;
  
  // Customer Shipping Addresses
  getCustomerShippingAddresses(customerId: string): Promise<CustomerShippingAddress[]>;
  getCustomerShippingAddress(id: string): Promise<CustomerShippingAddress | undefined>;
  createCustomerShippingAddress(address: InsertCustomerShippingAddress): Promise<CustomerShippingAddress>;
  updateCustomerShippingAddress(id: string, address: Partial<InsertCustomerShippingAddress>): Promise<CustomerShippingAddress | undefined>;
  deleteCustomerShippingAddress(id: string): Promise<boolean>;
  setPrimaryShippingAddress(customerId: string, addressId: string): Promise<void>;
  
  // Customer Billing Addresses
  getCustomerBillingAddresses(customerId: string): Promise<CustomerBillingAddress[]>;
  getCustomerBillingAddress(id: string): Promise<CustomerBillingAddress | undefined>;
  createCustomerBillingAddress(address: InsertCustomerBillingAddress): Promise<CustomerBillingAddress>;
  updateCustomerBillingAddress(id: string, address: Partial<InsertCustomerBillingAddress>): Promise<CustomerBillingAddress | undefined>;
  deleteCustomerBillingAddress(id: string): Promise<boolean>;
  setPrimaryBillingAddress(customerId: string, addressId: string): Promise<void>;
  
  // Discounts
  getDiscounts(): Promise<Discount[]>;
  getDiscount(id: string): Promise<Discount | undefined>;
  createDiscount(discount: any): Promise<Discount>;
  updateDiscount(id: string, discount: any): Promise<Discount | undefined>;
  deleteDiscount(id: string): Promise<boolean>;
  
  // Warehouses
  getWarehouses(): Promise<Warehouse[]>;
  getWarehouse(id: string): Promise<Warehouse | undefined>;
  createWarehouse(warehouse: any): Promise<Warehouse>;
  updateWarehouse(id: string, warehouse: any): Promise<Warehouse | undefined>;
  deleteWarehouse(id: string): Promise<boolean>;
  
  // Warehouse Files
  getWarehouseFiles(warehouseId: string): Promise<WarehouseFile[]>;
  getWarehouseFileById(id: string): Promise<WarehouseFile | undefined>;
  createWarehouseFile(data: InsertWarehouseFile): Promise<WarehouseFile>;
  deleteWarehouseFile(fileId: string): Promise<boolean>;
  
  // Warehouse Financial Contracts
  getWarehouseFinancialContracts(warehouseId: string): Promise<WarehouseFinancialContract[]>;
  getWarehouseFinancialContractById(id: string): Promise<WarehouseFinancialContract | undefined>;
  createWarehouseFinancialContract(data: InsertWarehouseFinancialContract): Promise<WarehouseFinancialContract>;
  updateWarehouseFinancialContract(id: string, data: Partial<InsertWarehouseFinancialContract>): Promise<WarehouseFinancialContract>;
  deleteWarehouseFinancialContract(id: string): Promise<boolean>;
  
  // Warehouse Layouts
  getWarehouseLayout(warehouseId: string): Promise<WarehouseLayout | undefined>;
  createWarehouseLayout(data: InsertWarehouseLayout): Promise<WarehouseLayout>;
  generateBinLayout(warehouseId: string, config: any): Promise<WarehouseLayout>;
  getBinsWithInventory(layoutId: string): Promise<any[]>;
  getBinOccupancy(binId: string): Promise<number>;
  getLayoutStatistics(layoutId: string): Promise<any>;
  getLayoutBins(layoutId: string): Promise<LayoutBin[]>;
  updateLayoutBin(binId: string, data: Partial<InsertLayoutBin>): Promise<LayoutBin | undefined>;
  
  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: any): Promise<Supplier>;
  updateSupplier(id: string, supplier: any): Promise<Supplier | undefined>;
  deleteSupplier(id: string): Promise<boolean>;
  
  // Returns
  getReturns(): Promise<Return[]>;
  getReturn(id: string): Promise<Return | undefined>;
  createReturn(returnData: any): Promise<Return>;
  updateReturn(id: string, returnData: any): Promise<Return | undefined>;
  deleteReturn(id: string): Promise<boolean>;
  
  // Return Items
  getReturnItems(returnId: string): Promise<ReturnItem[]>;
  createReturnItem(item: any): Promise<ReturnItem>;
  
  // Expenses
  getExpenses(): Promise<Expense[]>;
  getExpenseById(id: string): Promise<Expense | undefined>;
  createExpense(expense: any): Promise<Expense>;
  updateExpense(id: string, expense: any): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;
  
  // Services
  getServices(): Promise<Service[]>;
  getServiceById(id: string): Promise<Service | undefined>;
  createService(service: InsertService, items: InsertServiceItem[]): Promise<Service>;
  updateService(id: string, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: string): Promise<void>;
  
  // Service Items
  getServiceItems(serviceId: string): Promise<ServiceItem[]>;
  updateServiceItem(id: string, item: Partial<InsertServiceItem>): Promise<ServiceItem | undefined>;
  deleteServiceItem(id: string): Promise<void>;
  
  // Pre-Orders
  getPreOrders(): Promise<PreOrder[]>;
  getPreOrder(id: string): Promise<PreOrder | undefined>;
  createPreOrder(preOrder: InsertPreOrder): Promise<PreOrder>;
  updatePreOrder(id: string, preOrder: Partial<InsertPreOrder>): Promise<PreOrder>;
  deletePreOrder(id: string): Promise<boolean>;
  getPreOrderItems(preOrderId: string): Promise<PreOrderItem[]>;
  createPreOrderItem(item: InsertPreOrderItem): Promise<PreOrderItem>;
  updatePreOrderItem(id: string, item: Partial<InsertPreOrderItem>): Promise<PreOrderItem>;
  deletePreOrderItem(id: string): Promise<boolean>;
  
  // Purchases
  getPurchases(): Promise<Purchase[]>;
  getPurchase(id: string): Promise<Purchase | undefined>;
  createPurchase(purchase: any): Promise<Purchase>;
  updatePurchase(id: string, purchase: any): Promise<Purchase | undefined>;
  deletePurchase(id: string): Promise<boolean>;
  
  // Sales
  getSales(): Promise<Sale[]>;
  createSale(sale: any): Promise<Sale>;
  
  // User Activities
  getUserActivities(): Promise<UserActivity[]>;
  createUserActivity(activity: any): Promise<UserActivity>;
  createPickPackLog(log: any): Promise<UserActivity>;
  getPickPackLogs(orderId: string): Promise<UserActivity[]>;
  
  // Categories
  getCategories(): Promise<AppCategory[]>;
  getCategoryById(id: string): Promise<AppCategory | undefined>;
  createCategory(category: any): Promise<AppCategory>;
  updateCategory(id: string, category: any): Promise<AppCategory | undefined>;
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
  
  // PM Suppliers
  getPmSuppliers(): Promise<PmSupplier[]>;
  getPmSupplier(id: string): Promise<PmSupplier | undefined>;
  createPmSupplier(supplier: any): Promise<PmSupplier>;
  updatePmSupplier(id: string, supplier: any): Promise<PmSupplier | undefined>;
  deletePmSupplier(id: string): Promise<boolean>;
  searchPmSuppliers(query: string): Promise<PmSupplier[]>;
  
  // Files
  getAllFiles(): Promise<FileType[]>;
  getFilesByType(type: string): Promise<FileType[]>;
  createFile(file: any): Promise<FileType>;
  updateFile(id: string, file: any): Promise<FileType | undefined>;
  deleteFile(id: string): Promise<boolean>;
  
  // Packing Cartons
  getPackingCartons(): Promise<PackingCarton[]>;
  getPackingCarton(id: string): Promise<PackingCarton | undefined>;
  createPackingCarton(carton: InsertPackingCarton): Promise<PackingCarton>;
  updatePackingCarton(id: string, carton: Partial<InsertPackingCarton>): Promise<PackingCarton | undefined>;
  deletePackingCarton(id: string): Promise<boolean>;
  
  // Order Carton Plans
  getOrderCartonPlan(orderId: string): Promise<OrderCartonPlan | undefined>;
  getOrderCartonPlanById(planId: string): Promise<OrderCartonPlan | undefined>;
  createOrderCartonPlan(plan: InsertOrderCartonPlan): Promise<OrderCartonPlan>;
  updateOrderCartonPlan(planId: string, plan: Partial<InsertOrderCartonPlan>): Promise<OrderCartonPlan | undefined>;
  getOrderCartonItems(planId: string): Promise<OrderCartonItem[]>;
  createOrderCartonItem(item: InsertOrderCartonItem): Promise<OrderCartonItem>;
  deleteOrderCartonPlan(planId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, username));
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
      if (filters.seasonalFactor !== undefined) conditions.push(sql`${deliveryHistory.seasonalFactor} = ${filters.seasonalFactor}`);
      
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
        const ordersData = await db.select({
          order: orders,
          customer: customers,
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(eq(orders.customerId, customerId.toString()))
        .orderBy(desc(orders.createdAt));
        
        return ordersData.map(row => ({
          ...row.order,
          customer: row.customer || undefined,
        })) as any;
      } else {
        const ordersData = await db.select({
          order: orders,
          customer: customers,
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .orderBy(desc(orders.createdAt));
        
        return ordersData.map(row => ({
          ...row.order,
          customer: row.customer || undefined,
        })) as any;
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  }

  async getOrdersByStatus(status: string): Promise<Order[]> {
    try {
      const ordersData = await db.select({
        order: orders,
        customer: customers,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.orderStatus, status))
      .orderBy(desc(orders.createdAt));
      
      return ordersData.map(row => ({
        ...row.order,
        customer: row.customer || undefined,
      }));
    } catch (error) {
      console.error('Error fetching orders by status:', error);
      return [];
    }
  }

  async getOrdersByPaymentStatus(paymentStatus: string): Promise<Order[]> {
    try {
      const ordersData = await db.select({
        order: orders,
        customer: customers,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.paymentStatus, paymentStatus))
      .orderBy(desc(orders.createdAt));
      
      return ordersData.map(row => ({
        ...row.order,
        customer: row.customer || undefined,
      }));
    } catch (error) {
      console.error('Error fetching orders by payment status:', error);
      return [];
    }
  }

  async getOrder(id: string): Promise<Order | undefined> {
    try {
      const [result] = await db.select({
        order: orders,
        customer: customers,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.id, id));
      
      if (!result) return undefined;
      
      return {
        ...result.order,
        customer: result.customer || undefined,
      } as any;
    } catch (error) {
      console.error('Error fetching order:', error);
      return undefined;
    }
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const [result] = await db.select({
      order: orders,
      customer: customers,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(eq(orders.id, id));
    
    if (result) {
      const items = await this.getOrderItems(result.order.id);
      return { 
        ...result.order, 
        customer: result.customer || undefined,
        items 
      } as any;
    }
    
    return undefined;
  }

  async generateOrderId(orderType: string = 'ord', date: Date = new Date()): Promise<string> {
    // Generate order ID in format [TYPE]-[YYMMDD]-[XXXX]
    // TYPE is uppercase: POS, ORD, WEB, TEL
    const typeUpper = orderType.toUpperCase();
    
    // Format date as YYMMDD
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // Format date for DB query (YYYY-MM-DD)
    const dbDateStr = date.getFullYear() + '-' + 
                     (date.getMonth() + 1).toString().padStart(2, '0') + '-' + 
                     date.getDate().toString().padStart(2, '0');
    
    try {
      // Check if we have a sequence for this order type and date
      const existingSequence = await db.select()
        .from(dailySequences)
        .where(and(
          eq(dailySequences.orderType, orderType),
          eq(dailySequences.date, dbDateStr)
        ))
        .limit(1);
      
      let sequence: number;
      
      if (existingSequence.length > 0) {
        // Increment existing sequence
        sequence = existingSequence[0].currentSequence + 1;
        
        // Update the sequence
        await db.update(dailySequences)
          .set({ 
            currentSequence: sequence,
            updatedAt: new Date()
          })
          .where(eq(dailySequences.id, existingSequence[0].id));
      } else {
        // Create new sequence with random starting point (1000-5000)
        sequence = Math.floor(Math.random() * 4001) + 1000;
        
        // Insert new sequence
        await db.insert(dailySequences).values({
          orderType,
          date: dbDateStr,
          currentSequence: sequence
        });
      }
      
      // Format sequence as 4-digit string
      const sequenceStr = sequence.toString().padStart(4, '0');
      return `${typeUpper}-${dateStr}-${sequenceStr}`;
    } catch (error) {
      console.error('Error generating order ID:', error);
      // Fallback to timestamp-based ID if query fails
      const timestamp = Date.now().toString().slice(-4);
      return `${typeUpper}-${dateStr}-${timestamp}`;
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

  async updateOrder(id: string, orderUpdates: any): Promise<Order | undefined> {
    try {
      const [updated] = await db
        .update(orders)
        .set({ ...orderUpdates, updatedAt: new Date() })
        .where(eq(orders.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating order:', error);
      return undefined;
    }
  }

  async deleteOrder(id: string): Promise<boolean> {
    try {
      // First delete order items
      await db.delete(orderItems).where(eq(orderItems.orderId, id));
      
      // Then delete the order
      const result = await db.delete(orders).where(eq(orders.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting order:', error);
      return false;
    }
  }
  
  async getOrdersByCustomerId(customerId: string): Promise<Order[]> {
    try {
      const ordersData = await db.select({
        order: orders,
        customer: customers,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt));
      
      return ordersData.map(row => ({
        ...row.order,
        customer: row.customer || undefined,
      }));
    } catch (error) {
      console.error('Error fetching orders by customer ID:', error);
      return [];
    }
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
    try {
      let query = db
        .select({
          order: orders,
          customer: customers,
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id));

      // If status is provided, filter by that status
      // Otherwise, return all orders that need pick/pack processing
      if (status) {
        // Map frontend status to database status/columns
        if (status === 'pending' || status === 'to_fulfill') {
          query = query.where(eq(orders.orderStatus, 'to_fulfill')) as any;
        } else if (status === 'picking') {
          // Orders that are in to_fulfill status AND pick_status is in_progress
          query = query.where(
            and(
              eq(orders.orderStatus, 'to_fulfill'),
              eq(orders.pickStatus, 'in_progress')
            )
          ) as any;
        } else if (status === 'packing') {
          // Orders that are in to_fulfill status AND pack_status is in_progress
          query = query.where(
            and(
              eq(orders.orderStatus, 'to_fulfill'),
              eq(orders.packStatus, 'in_progress')
            )
          ) as any;
        } else if (status === 'ready') {
          query = query.where(eq(orders.orderStatus, 'ready_to_ship')) as any;
        } else {
          query = query.where(eq(orders.orderStatus, status)) as any;
        }
      } else {
        // Default: return all orders that need fulfillment (to_fulfill and ready_to_ship)
        query = query.where(
          or(
            eq(orders.orderStatus, 'to_fulfill'),
            eq(orders.orderStatus, 'ready_to_ship')
          )
        ) as any;
      }

      const results = await query.orderBy(desc(orders.createdAt));

      // Map results to include customer name and format status for frontend
      return results.map((row: any) => ({
        ...row.order,
        customerName: row.customer?.name || 'Unknown Customer',
        // Map database status to frontend status based on pick/pack status
        status: this.getPickPackStatus(row.order),
      }));
    } catch (error) {
      console.error('Error fetching pick/pack orders:', error);
      return [];
    }
  }

  // Helper method to determine the pick/pack status for display
  private getPickPackStatus(order: any): string {
    // If order is ready to ship, it's ready
    if (order.orderStatus === 'ready_to_ship') {
      return 'ready_to_ship';
    }
    
    // If order is to_fulfill, check pick/pack statuses
    if (order.orderStatus === 'to_fulfill') {
      if (order.packStatus === 'completed') {
        return 'ready_to_ship';
      } else if (order.packStatus === 'in_progress') {
        return 'packing';
      } else if (order.pickStatus === 'completed') {
        return 'packing';
      } else if (order.pickStatus === 'in_progress') {
        return 'picking';
      } else {
        return 'to_fulfill';
      }
    }
    
    return order.orderStatus;
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
    return await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(item: any): Promise<OrderItem> {
    const [newItem] = await db.insert(orderItems).values(item).returning();
    return newItem;
  }

  async updateOrderItem(id: string, item: any): Promise<OrderItem | undefined> {
    return { id, ...item };
  }

  async deleteOrderItem(id: string): Promise<boolean> {
    return true;
  }

  async deleteOrderItems(orderId: string): Promise<boolean> {
    try {
      await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
      return true;
    } catch (error) {
      console.error('Error deleting order items:', error);
      return false;
    }
  }

  async updateOrderItemPickedQuantity(id: string, quantity: number, timestamp?: Date): Promise<OrderItem | undefined> {
    try {
      const [updatedItem] = await db
        .update(orderItems)
        .set({ 
          pickedQuantity: quantity,
          pickEndTime: timestamp || new Date()
        })
        .where(eq(orderItems.id, id))
        .returning();
      return updatedItem;
    } catch (error) {
      console.error('Error updating picked quantity:', error);
      return undefined;
    }
  }

  async updateOrderItemPackedQuantity(id: string, quantity: number): Promise<OrderItem | undefined> {
    try {
      const [updatedItem] = await db
        .update(orderItems)
        .set({ 
          packedQuantity: quantity,
          packEndTime: new Date()
        })
        .where(eq(orderItems.id, id))
        .returning();
      return updatedItem;
    } catch (error) {
      console.error('Error updating packed quantity:', error);
      return undefined;
    }
  }

  // Products
  async getProducts(): Promise<Product[]> {
    try {
      const productsData = await db.select({
        product: products,
        supplier: suppliers,
      })
      .from(products)
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .orderBy(desc(products.createdAt));
      
      // Include primary location, supplier, and category for each product
      const productsWithDetails = await Promise.all(
        productsData.map(async (row) => {
          const [primaryLocation] = await db
            .select()
            .from(productLocations)
            .where(
              and(
                eq(productLocations.productId, row.product.id),
                eq(productLocations.isPrimary, true)
              )
            )
            .limit(1);
          
          // Fetch category if categoryId exists
          let category = null;
          if (row.product.categoryId) {
            const categoryId = parseInt(row.product.categoryId);
            if (!isNaN(categoryId)) {
              const [cat] = await db
                .select()
                .from(categories)
                .where(eq(categories.id, categoryId))
                .limit(1);
              category = cat;
            }
          }
          
          return {
            ...row.product,
            categoryName: category?.name || category?.nameEn || 'Uncategorized',
            primaryLocation: primaryLocation || null,
            supplier: row.supplier ? {
              id: row.supplier.id,
              name: row.supplier.name,
              country: row.supplier.country
            } : null
          };
        })
      );
      
      return productsWithDetails;
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }

  async getProduct(id: string): Promise<Product | undefined> {
    try {
      const [productData] = await db.select({
        product: products,
        supplier: suppliers,
      })
      .from(products)
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .where(eq(products.id, id));
      
      if (!productData) {
        return undefined;
      }
      
      // Include all locations for this product
      const locations = await db
        .select()
        .from(productLocations)
        .where(eq(productLocations.productId, id))
        .orderBy(desc(productLocations.isPrimary), productLocations.locationCode);
      
      return {
        ...productData.product,
        locations,
        supplier: productData.supplier ? {
          id: productData.supplier.id,
          name: productData.supplier.name,
          country: productData.supplier.country
        } : null
      } as any;
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
      const [productData] = await db.select({
        product: products,
        supplier: suppliers,
      })
      .from(products)
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .where(eq(products.sku, sku));
      
      if (!productData) {
        return undefined;
      }
      
      return {
        ...productData.product,
        supplier: productData.supplier ? {
          id: productData.supplier.id,
          name: productData.supplier.name,
          country: productData.supplier.country
        } : null
      } as any;
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
    try {
      const variants = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, productId))
        .orderBy(asc(productVariants.name));
      return variants;
    } catch (error) {
      console.error('Error fetching product variants:', error);
      return [];
    }
  }

  async createProductVariant(variant: any): Promise<ProductVariant> {
    try {
      const [newVariant] = await db
        .insert(productVariants)
        .values(variant)
        .returning();
      return newVariant;
    } catch (error) {
      console.error('Error creating product variant:', error);
      throw error;
    }
  }

  async updateProductVariant(id: string, variant: any): Promise<ProductVariant | undefined> {
    try {
      const [updated] = await db
        .update(productVariants)
        .set(variant)
        .where(eq(productVariants.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating product variant:', error);
      return undefined;
    }
  }

  async deleteProductVariant(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(productVariants)
        .where(eq(productVariants.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting product variant:', error);
      return false;
    }
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
        .orderBy(productFiles.fileType);
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

  async updateProductFile(id: string, data: Partial<InsertProductFile>): Promise<ProductFile | undefined> {
    try {
      const [updatedFile] = await db
        .update(productFiles)
        .set(data)
        .where(eq(productFiles.id, id))
        .returning();
      return updatedFile || undefined;
    } catch (error) {
      console.error('Error updating product file:', error);
      return undefined;
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

  async getProductTieredPricing(productId: string): Promise<ProductTieredPricing[]> {
    try {
      const pricing = await db
        .select()
        .from(productTieredPricing)
        .where(eq(productTieredPricing.productId, productId))
        .orderBy(asc(productTieredPricing.minQuantity));
      return pricing;
    } catch (error) {
      console.error('Error fetching product tiered pricing:', error);
      return [];
    }
  }

  async createProductTieredPricing(data: InsertProductTieredPricing): Promise<ProductTieredPricing> {
    try {
      const [newPricing] = await db
        .insert(productTieredPricing)
        .values(data)
        .returning();
      return newPricing;
    } catch (error) {
      console.error('Error creating product tiered pricing:', error);
      throw error;
    }
  }

  async updateProductTieredPricing(id: string, data: Partial<InsertProductTieredPricing>): Promise<ProductTieredPricing | undefined> {
    try {
      const [updated] = await db
        .update(productTieredPricing)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(productTieredPricing.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating product tiered pricing:', error);
      return undefined;
    }
  }

  async deleteProductTieredPricing(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(productTieredPricing)
        .where(eq(productTieredPricing.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting product tiered pricing:', error);
      return false;
    }
  }

  async getProductBundles(): Promise<ProductBundle[]> {
    try {
      const bundles = await db
        .select()
        .from(productBundles)
        .orderBy(desc(productBundles.createdAt));
      return bundles;
    } catch (error) {
      console.error('Error fetching product bundles:', error);
      return [];
    }
  }

  async getProductBundle(id: string): Promise<ProductBundle | undefined> {
    try {
      const [bundle] = await db
        .select()
        .from(productBundles)
        .where(eq(productBundles.id, id));
      return bundle;
    } catch (error) {
      console.error('Error fetching product bundle:', error);
      return undefined;
    }
  }

  async createProductBundle(bundle: InsertProductBundle): Promise<ProductBundle> {
    try {
      // Generate bundleId in BDL-NAME-XXX format
      const namePrefix = bundle.name.substring(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, '');
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const bundleId = `BDL-${namePrefix}-${randomNum}`;

      const [newBundle] = await db
        .insert(productBundles)
        .values({ ...bundle, bundleId })
        .returning();
      return newBundle;
    } catch (error) {
      console.error('Error creating product bundle:', error);
      throw error;
    }
  }

  async updateProductBundle(id: string, bundle: Partial<InsertProductBundle>): Promise<ProductBundle | undefined> {
    try {
      const [updated] = await db
        .update(productBundles)
        .set({ ...bundle, updatedAt: new Date() })
        .where(eq(productBundles.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating product bundle:', error);
      return undefined;
    }
  }

  async deleteProductBundle(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(productBundles)
        .where(eq(productBundles.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting product bundle:', error);
      return false;
    }
  }

  async getBundleItems(bundleId: string): Promise<BundleItem[]> {
    try {
      const items = await db
        .select()
        .from(bundleItems)
        .where(eq(bundleItems.bundleId, bundleId));
      return items;
    } catch (error) {
      console.error('Error fetching bundle items:', error);
      return [];
    }
  }

  async createBundleItem(item: InsertBundleItem): Promise<BundleItem> {
    try {
      const [newItem] = await db
        .insert(bundleItems)
        .values(item)
        .returning();
      return newItem;
    } catch (error) {
      console.error('Error creating bundle item:', error);
      throw error;
    }
  }

  async deleteBundleItems(bundleId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(bundleItems)
        .where(eq(bundleItems.bundleId, bundleId));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting bundle items:', error);
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

  async getCustomer(id: string): Promise<Customer | undefined> {
    try {
      const [customer] = await db.select().from(customers).where(eq(customers.id, id));
      return customer || undefined;
    } catch (error) {
      console.error('Error fetching customer:', error);
      return undefined;
    }
  }

  async getCustomerById(id: string): Promise<Customer | undefined> {
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

  async updateCustomer(id: string, customerData: any): Promise<Customer | undefined> {
    try {
      const [updated] = await db
        .update(customers)
        .set({ ...customerData, updatedAt: new Date() })
        .where(eq(customers.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating customer:', error);
      return undefined;
    }
  }

  async deleteCustomer(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(customers)
        .where(eq(customers.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting customer:', error);
      return false;
    }
  }

  // Customer Shipping Addresses
  async getCustomerShippingAddresses(customerId: string): Promise<CustomerShippingAddress[]> {
    try {
      const addresses = await db
        .select()
        .from(customerShippingAddresses)
        .where(eq(customerShippingAddresses.customerId, customerId))
        .orderBy(desc(customerShippingAddresses.isPrimary), desc(customerShippingAddresses.createdAt));
      return addresses;
    } catch (error) {
      console.error('Error fetching customer shipping addresses:', error);
      return [];
    }
  }

  async getCustomerShippingAddress(id: string): Promise<CustomerShippingAddress | undefined> {
    try {
      const [address] = await db
        .select()
        .from(customerShippingAddresses)
        .where(eq(customerShippingAddresses.id, id));
      return address || undefined;
    } catch (error) {
      console.error('Error fetching customer shipping address:', error);
      return undefined;
    }
  }

  async createCustomerShippingAddress(address: InsertCustomerShippingAddress): Promise<CustomerShippingAddress> {
    try {
      const [newAddress] = await db
        .insert(customerShippingAddresses)
        .values(address)
        .returning();
      return newAddress;
    } catch (error) {
      console.error('Error creating customer shipping address:', error);
      throw error;
    }
  }

  async updateCustomerShippingAddress(id: string, address: Partial<InsertCustomerShippingAddress>): Promise<CustomerShippingAddress | undefined> {
    try {
      const [updated] = await db
        .update(customerShippingAddresses)
        .set({ ...address, updatedAt: new Date() })
        .where(eq(customerShippingAddresses.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating customer shipping address:', error);
      return undefined;
    }
  }

  async deleteCustomerShippingAddress(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(customerShippingAddresses)
        .where(eq(customerShippingAddresses.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting customer shipping address:', error);
      return false;
    }
  }

  async setPrimaryShippingAddress(customerId: string, addressId: string): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        // First, set all addresses for this customer to non-primary
        await tx
          .update(customerShippingAddresses)
          .set({ isPrimary: false, updatedAt: new Date() })
          .where(eq(customerShippingAddresses.customerId, customerId));
        
        // Then, set the specified address to primary
        await tx
          .update(customerShippingAddresses)
          .set({ isPrimary: true, updatedAt: new Date() })
          .where(eq(customerShippingAddresses.id, addressId));
      });
    } catch (error) {
      console.error('Error setting primary shipping address:', error);
      throw error;
    }
  }

  // Customer Billing Addresses
  async getCustomerBillingAddresses(customerId: string): Promise<CustomerBillingAddress[]> {
    try {
      const addresses = await db
        .select()
        .from(customerBillingAddresses)
        .where(eq(customerBillingAddresses.customerId, customerId))
        .orderBy(desc(customerBillingAddresses.isPrimary), desc(customerBillingAddresses.createdAt));
      return addresses;
    } catch (error) {
      console.error('Error fetching customer billing addresses:', error);
      return [];
    }
  }

  async getCustomerBillingAddress(id: string): Promise<CustomerBillingAddress | undefined> {
    try {
      const [address] = await db
        .select()
        .from(customerBillingAddresses)
        .where(eq(customerBillingAddresses.id, id));
      return address || undefined;
    } catch (error) {
      console.error('Error fetching customer billing address:', error);
      return undefined;
    }
  }

  async createCustomerBillingAddress(address: InsertCustomerBillingAddress): Promise<CustomerBillingAddress> {
    try {
      const [newAddress] = await db
        .insert(customerBillingAddresses)
        .values(address)
        .returning();
      return newAddress;
    } catch (error) {
      console.error('Error creating customer billing address:', error);
      throw error;
    }
  }

  async updateCustomerBillingAddress(id: string, address: Partial<InsertCustomerBillingAddress>): Promise<CustomerBillingAddress | undefined> {
    try {
      const [updated] = await db
        .update(customerBillingAddresses)
        .set({ ...address, updatedAt: new Date() })
        .where(eq(customerBillingAddresses.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating customer billing address:', error);
      return undefined;
    }
  }

  async deleteCustomerBillingAddress(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(customerBillingAddresses)
        .where(eq(customerBillingAddresses.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting customer billing address:', error);
      return false;
    }
  }

  async setPrimaryBillingAddress(customerId: string, addressId: string): Promise<void> {
    try {
      await db.transaction(async (tx) => {
        // First, set all addresses for this customer to non-primary
        await tx
          .update(customerBillingAddresses)
          .set({ isPrimary: false, updatedAt: new Date() })
          .where(eq(customerBillingAddresses.customerId, customerId));
        
        // Then, set the specified address to primary
        await tx
          .update(customerBillingAddresses)
          .set({ isPrimary: true, updatedAt: new Date() })
          .where(eq(customerBillingAddresses.id, addressId));
      });
    } catch (error) {
      console.error('Error setting primary billing address:', error);
      throw error;
    }
  }

  // Discounts
  async getDiscounts(): Promise<Discount[]> {
    try {
      const result = await db.select().from(discounts).orderBy(discounts.createdAt);
      return result as Discount[];
    } catch (error) {
      console.error('Error fetching discounts:', error);
      return [];
    }
  }

  async getDiscount(id: string): Promise<Discount | undefined> {
    try {
      const [result] = await db.select().from(discounts).where(eq(discounts.id, parseInt(id)));
      return result as Discount | undefined;
    } catch (error) {
      console.error('Error fetching discount:', error);
      return undefined;
    }
  }

  async createDiscount(discount: any): Promise<Discount> {
    try {
      const [result] = await db.insert(discounts).values(discount).returning();
      return result as Discount;
    } catch (error) {
      console.error('Error creating discount:', error);
      throw error;
    }
  }

  async updateDiscount(id: string, discount: any): Promise<Discount | undefined> {
    try {
      const [result] = await db
        .update(discounts)
        .set({ ...discount, updatedAt: new Date() })
        .where(eq(discounts.id, parseInt(id)))
        .returning();
      return result as Discount | undefined;
    } catch (error) {
      console.error('Error updating discount:', error);
      return undefined;
    }
  }

  async deleteDiscount(id: string): Promise<boolean> {
    try {
      const result = await db.delete(discounts).where(eq(discounts.id, parseInt(id)));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting discount:', error);
      return false;
    }
  }

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
      const updateData: any = {};
      
      if (warehouse.name !== undefined) updateData.name = warehouse.name;
      if (warehouse.location !== undefined) updateData.location = warehouse.location;
      if (warehouse.address !== undefined) updateData.address = warehouse.address;
      if (warehouse.city !== undefined) updateData.city = warehouse.city;
      if (warehouse.country !== undefined) updateData.country = warehouse.country;
      if (warehouse.zip_code !== undefined) updateData.zipCode = warehouse.zip_code;
      if (warehouse.phone !== undefined) updateData.phone = warehouse.phone;
      if (warehouse.email !== undefined) updateData.email = warehouse.email;
      if (warehouse.manager !== undefined) updateData.manager = warehouse.manager;
      if (warehouse.capacity !== undefined) updateData.capacity = warehouse.capacity;
      if (warehouse.type !== undefined) updateData.type = warehouse.type;
      if (warehouse.status !== undefined) updateData.status = warehouse.status;
      if (warehouse.floor_area !== undefined) updateData.floorArea = warehouse.floor_area;
      if (warehouse.notes !== undefined) updateData.notes = warehouse.notes;
      if (warehouse.contact !== undefined) updateData.contact = warehouse.contact;
      if (warehouse.rented_from_date !== undefined) updateData.rentedFromDate = warehouse.rented_from_date;
      if (warehouse.expense_id !== undefined) updateData.expenseId = warehouse.expense_id;
      
      const [updated] = await db
        .update(warehouses)
        .set(updateData)
        .where(eq(warehouses.id, id))
        .returning();
      return updated;
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

  // Warehouse Files
  async getWarehouseFiles(warehouseId: string): Promise<WarehouseFile[]> {
    try {
      const files = await db
        .select()
        .from(warehouseFiles)
        .where(eq(warehouseFiles.warehouseId, warehouseId))
        .orderBy(desc(warehouseFiles.createdAt));
      return files;
    } catch (error) {
      console.error('Error fetching warehouse files:', error);
      return [];
    }
  }

  async getWarehouseFileById(id: string): Promise<WarehouseFile | undefined> {
    try {
      const [file] = await db
        .select()
        .from(warehouseFiles)
        .where(eq(warehouseFiles.id, id));
      return file || undefined;
    } catch (error) {
      console.error('Error fetching warehouse file:', error);
      return undefined;
    }
  }

  async createWarehouseFile(data: InsertWarehouseFile): Promise<WarehouseFile> {
    try {
      const [file] = await db
        .insert(warehouseFiles)
        .values(data)
        .returning();
      return file;
    } catch (error) {
      console.error('Error creating warehouse file:', error);
      throw error;
    }
  }

  async deleteWarehouseFile(fileId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(warehouseFiles)
        .where(eq(warehouseFiles.id, fileId));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting warehouse file:', error);
      return false;
    }
  }

  async getWarehouseFinancialContracts(warehouseId: string): Promise<WarehouseFinancialContract[]> {
    try {
      const contracts = await db
        .select()
        .from(warehouseFinancialContracts)
        .where(eq(warehouseFinancialContracts.warehouseId, warehouseId))
        .orderBy(desc(warehouseFinancialContracts.createdAt));
      return contracts;
    } catch (error) {
      console.error('Error fetching warehouse financial contracts:', error);
      return [];
    }
  }

  async getWarehouseFinancialContractById(id: string): Promise<WarehouseFinancialContract | undefined> {
    try {
      const [contract] = await db
        .select()
        .from(warehouseFinancialContracts)
        .where(eq(warehouseFinancialContracts.id, id));
      return contract || undefined;
    } catch (error) {
      console.error('Error fetching warehouse financial contract:', error);
      return undefined;
    }
  }

  async createWarehouseFinancialContract(data: InsertWarehouseFinancialContract): Promise<WarehouseFinancialContract> {
    try {
      const [contract] = await db
        .insert(warehouseFinancialContracts)
        .values(data)
        .returning();
      return contract;
    } catch (error) {
      console.error('Error creating warehouse financial contract:', error);
      throw error;
    }
  }

  async updateWarehouseFinancialContract(id: string, data: Partial<InsertWarehouseFinancialContract>): Promise<WarehouseFinancialContract> {
    try {
      const [updated] = await db
        .update(warehouseFinancialContracts)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(warehouseFinancialContracts.id, id))
        .returning();
      if (!updated) {
        throw new Error('Contract not found');
      }
      return updated;
    } catch (error) {
      console.error('Error updating warehouse financial contract:', error);
      throw error;
    }
  }

  async deleteWarehouseFinancialContract(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(warehouseFinancialContracts)
        .where(eq(warehouseFinancialContracts.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting warehouse financial contract:', error);
      return false;
    }
  }

  async getWarehouseLayout(warehouseId: string): Promise<WarehouseLayout | undefined> {
    try {
      const [layout] = await db
        .select()
        .from(warehouseLayouts)
        .where(and(
          eq(warehouseLayouts.warehouseId, warehouseId),
          eq(warehouseLayouts.isActive, true)
        ))
        .orderBy(desc(warehouseLayouts.createdAt));
      return layout || undefined;
    } catch (error) {
      console.error('Error fetching warehouse layout:', error);
      return undefined;
    }
  }

  async createWarehouseLayout(data: InsertWarehouseLayout): Promise<WarehouseLayout> {
    try {
      const [layout] = await db
        .insert(warehouseLayouts)
        .values(data)
        .returning();
      return layout;
    } catch (error) {
      console.error('Error creating warehouse layout:', error);
      throw error;
    }
  }

  async generateBinLayout(warehouseId: string, config: any): Promise<WarehouseLayout> {
    try {
      const { generateBinLayout: generateLayout, validateLayoutConfig } = await import('./services/layoutGeneratorService.js');
      
      const sanitizedConfig = {
        name: config.name || 'Auto-generated Layout',
        width: parseFloat(config.width) || 100,
        length: parseFloat(config.length) || 100,
        rows: parseInt(config.rows) || 10,
        columns: parseInt(config.columns) || 10,
        binWidth: parseFloat(config.binWidth) || 1,
        binHeight: parseFloat(config.binHeight) || 1,
        aisleWidth: parseFloat(config.aisleWidth) || 1,
        binCapacity: parseInt(config.binCapacity) || 100
      };

      const validation = validateLayoutConfig(sanitizedConfig);
      if (!validation.valid) {
        throw new Error(`Invalid layout configuration: ${validation.errors.join(', ')}`);
      }

      const existingLayout = await this.getWarehouseLayout(warehouseId);
      if (existingLayout) {
        await db
          .update(warehouseLayouts)
          .set({ isActive: false })
          .where(eq(warehouseLayouts.id, existingLayout.id));
      }

      const [layout] = await db
        .insert(warehouseLayouts)
        .values({
          warehouseId,
          name: sanitizedConfig.name,
          width: sanitizedConfig.width.toString(),
          length: sanitizedConfig.length.toString(),
          coordinateSystem: 'grid',
          isActive: true
        })
        .returning();

      const bins = generateLayout(sanitizedConfig).map(bin => ({
        ...bin,
        layoutId: layout.id,
        x: bin.x.toString(),
        y: bin.y.toString(),
        width: bin.width.toString(),
        height: bin.height.toString()
      }));

      if (bins.length > 0) {
        await db.insert(layoutBins).values(bins);
      }

      return layout;
    } catch (error) {
      console.error('Error generating bin layout:', error);
      throw error;
    }
  }

  async getBinsWithInventory(layoutId: string): Promise<any[]> {
    try {
      const bins = await db
        .select()
        .from(layoutBins)
        .where(eq(layoutBins.layoutId, layoutId))
        .orderBy(asc(layoutBins.row), asc(layoutBins.column));

      const binsWithInventory = await Promise.all(
        bins.map(async (bin) => {
          const occupancy = await this.getBinOccupancy(bin.id);
          const inventoryItems = await db
            .select()
            .from(productLocations)
            .where(like(productLocations.locationCode, `%${bin.code}%`));

          return {
            ...bin,
            occupancy,
            inventoryItems: inventoryItems.length,
            products: inventoryItems
          };
        })
      );

      return binsWithInventory;
    } catch (error) {
      console.error('Error fetching bins with inventory:', error);
      return [];
    }
  }

  async getBinOccupancy(binId: string): Promise<number> {
    try {
      const [bin] = await db
        .select()
        .from(layoutBins)
        .where(eq(layoutBins.id, binId));

      if (!bin) return 0;

      const inventoryItems = await db
        .select()
        .from(productLocations)
        .where(like(productLocations.locationCode, `%${bin.code}%`));

      const totalQuantity = inventoryItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
      return Math.min(100, (totalQuantity / bin.capacity) * 100);
    } catch (error) {
      console.error('Error calculating bin occupancy:', error);
      return 0;
    }
  }

  async getLayoutStatistics(layoutId: string): Promise<any> {
    try {
      const bins = await db
        .select()
        .from(layoutBins)
        .where(eq(layoutBins.layoutId, layoutId));

      const totalBins = bins.length;
      let emptyBins = 0;
      let occupiedBins = 0;
      let totalOccupancy = 0;

      for (const bin of bins) {
        const occupancy = await this.getBinOccupancy(bin.id);
        if (occupancy === 0) {
          emptyBins++;
        } else {
          occupiedBins++;
        }
        totalOccupancy += occupancy;
      }

      const utilizationRate = totalBins > 0 ? (totalOccupancy / totalBins) : 0;

      return {
        totalBins,
        emptyBins,
        occupiedBins,
        utilizationRate: Math.round(utilizationRate * 100) / 100
      };
    } catch (error) {
      console.error('Error calculating layout statistics:', error);
      return {
        totalBins: 0,
        emptyBins: 0,
        occupiedBins: 0,
        utilizationRate: 0
      };
    }
  }

  async getLayoutBins(layoutId: string): Promise<LayoutBin[]> {
    try {
      const bins = await db
        .select()
        .from(layoutBins)
        .where(eq(layoutBins.layoutId, layoutId))
        .orderBy(asc(layoutBins.row), asc(layoutBins.column));
      return bins;
    } catch (error) {
      console.error('Error fetching layout bins:', error);
      return [];
    }
  }

  async updateLayoutBin(binId: string, data: Partial<InsertLayoutBin>): Promise<LayoutBin | undefined> {
    try {
      const [updated] = await db
        .update(layoutBins)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(layoutBins.id, binId))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating layout bin:', error);
      return undefined;
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

  async getReturns(): Promise<Return[]> {
    // Sample returns data with realistic scenarios
    return [
      {
        id: 'ret-001',
        returnId: 'RET-2024-001',
        customerId: 'cust-001',
        customer: {
          id: 'cust-001',
          name: 'Nail Salon Praha',
          fbName: 'NailSalonPraha_Official',
          email: 'info@nailsalonpraha.cz',
          phone: '+420 777 888 999'
        },
        orderId: 'ORD-2024-001',
        returnDate: new Date('2024-10-10T10:00:00Z'),
        returnType: 'exchange',
        status: 'completed',
        notes: 'Customer received wrong color variant - exchanging for correct shade',
        totalAmount: '450.00',
        refundAmount: '0.00',
        restockFee: '0.00',
        createdAt: new Date('2024-10-10T10:00:00Z'),
        updatedAt: new Date('2024-10-12T14:30:00Z')
      },
      {
        id: 'ret-002',
        returnId: 'RET-2024-002',
        customerId: 'cust-002',
        customer: {
          id: 'cust-002',
          name: 'Beauty Studio Berlin',
          fbName: 'BeautyStudioBerlin',
          email: 'orders@beautystudio.de',
          phone: '+49 30 12345678'
        },
        orderId: 'ORD-2024-015',
        returnDate: new Date('2024-10-12T14:00:00Z'),
        returnType: 'refund',
        status: 'processing',
        notes: 'Damaged items during shipping - full refund requested',
        totalAmount: '1250.00',
        refundAmount: '1250.00',
        restockFee: '0.00',
        createdAt: new Date('2024-10-12T14:00:00Z'),
        updatedAt: new Date('2024-10-13T09:15:00Z')
      },
      {
        id: 'ret-003',
        returnId: 'RET-2024-003',
        customerId: 'cust-003',
        customer: {
          id: 'cust-003',
          name: 'Nails & More Vienna',
          fbName: 'NailsMoreVienna',
          email: 'contact@nailsmore.at',
          phone: '+43 1 9876543'
        },
        orderId: 'ORD-2024-022',
        returnDate: new Date('2024-10-08T09:30:00Z'),
        returnType: 'store_credit',
        status: 'completed',
        notes: 'Changed mind on gel polish colors - store credit issued',
        totalAmount: '680.00',
        refundAmount: '680.00',
        restockFee: '0.00',
        createdAt: new Date('2024-10-08T09:30:00Z'),
        updatedAt: new Date('2024-10-09T16:45:00Z')
      },
      {
        id: 'ret-004',
        returnId: 'RET-2024-004',
        customerId: 'cust-004',
        customer: {
          id: 'cust-004',
          name: 'Pro Nails Warsaw',
          fbName: 'ProNailsWarsaw',
          email: 'order@pronails.pl',
          phone: '+48 22 123 4567'
        },
        orderId: 'ORD-2024-033',
        returnDate: new Date('2024-10-14T11:00:00Z'),
        returnType: 'exchange',
        status: 'awaiting',
        notes: 'Ordered wrong drill bit size - waiting for replacement stock',
        totalAmount: '320.00',
        refundAmount: '0.00',
        restockFee: '0.00',
        createdAt: new Date('2024-10-14T11:00:00Z'),
        updatedAt: new Date('2024-10-14T11:00:00Z')
      },
      {
        id: 'ret-005',
        returnId: 'RET-2024-005',
        customerId: 'cust-005',
        customer: {
          id: 'cust-005',
          name: 'Luxury Nails Budapest',
          fbName: 'LuxuryNailsBudapest',
          email: 'admin@luxurynails.hu',
          phone: '+36 1 234 5678'
        },
        orderId: 'ORD-2024-041',
        returnDate: new Date('2024-10-15T16:00:00Z'),
        returnType: 'refund',
        status: 'awaiting',
        notes: 'Duplicate order placed by mistake - requesting full refund',
        totalAmount: '890.00',
        refundAmount: '890.00',
        restockFee: '45.00',
        createdAt: new Date('2024-10-15T16:00:00Z'),
        updatedAt: new Date('2024-10-15T16:00:00Z')
      },
      {
        id: 'ret-006',
        returnId: 'RET-2024-006',
        customerId: 'cust-006',
        customer: {
          id: 'cust-006',
          name: 'Glamour Studio Bratislava',
          fbName: 'GlamourStudioBA',
          email: 'info@glamourstudio.sk',
          phone: '+421 2 5555 1234'
        },
        orderId: 'ORD-2024-028',
        returnDate: new Date('2024-10-05T13:45:00Z'),
        returnType: 'exchange',
        status: 'completed',
        notes: 'UV lamp not working properly - exchanged for new unit',
        totalAmount: '1500.00',
        refundAmount: '0.00',
        restockFee: '0.00',
        createdAt: new Date('2024-10-05T13:45:00Z'),
        updatedAt: new Date('2024-10-07T10:20:00Z')
      },
      {
        id: 'ret-007',
        returnId: 'RET-2024-007',
        customerId: 'cust-007',
        customer: {
          id: 'cust-007',
          name: 'Beauty Clinic Dresden',
          fbName: 'BeautyClinicDD',
          email: 'orders@beautyclinic.de',
          phone: '+49 351 987 6543'
        },
        orderId: 'ORD-2024-019',
        returnDate: new Date('2024-10-11T10:15:00Z'),
        returnType: 'refund',
        status: 'cancelled',
        notes: 'Customer changed mind and decided to keep the items',
        totalAmount: '540.00',
        refundAmount: '0.00',
        restockFee: '0.00',
        createdAt: new Date('2024-10-11T10:15:00Z'),
        updatedAt: new Date('2024-10-11T15:30:00Z')
      },
      {
        id: 'ret-008',
        returnId: 'RET-2024-008',
        customerId: 'cust-008',
        customer: {
          id: 'cust-008',
          name: 'Nail Art Prague',
          fbName: 'NailArtPrague_CZ',
          email: 'shop@nailartprague.cz',
          phone: '+420 733 444 555'
        },
        orderId: 'ORD-2024-037',
        returnDate: new Date('2024-10-13T12:00:00Z'),
        returnType: 'store_credit',
        status: 'processing',
        notes: 'Received expired products - store credit being processed',
        totalAmount: '780.00',
        refundAmount: '780.00',
        restockFee: '0.00',
        createdAt: new Date('2024-10-13T12:00:00Z'),
        updatedAt: new Date('2024-10-14T08:45:00Z')
      }
    ] as Return[];
  }
  async getReturn(id: string): Promise<Return | undefined> { return undefined; }
  async createReturn(returnData: any): Promise<Return> { return { id: Date.now().toString(), ...returnData }; }
  async updateReturn(id: string, returnData: any): Promise<Return | undefined> { return { id, ...returnData }; }
  async deleteReturn(id: string): Promise<boolean> { return true; }

  async getReturnItems(returnId: string): Promise<ReturnItem[]> { return []; }
  async createReturnItem(item: any): Promise<ReturnItem> { return { id: Date.now().toString(), ...item }; }

  async getExpenses(): Promise<Expense[]> {
    const result = await db.select().from(expenses).orderBy(desc(expenses.date));
    return result;
  }

  async getExpenseById(id: string): Promise<Expense | undefined> {
    const result = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
    return result[0];
  }

  async createExpense(expense: any): Promise<Expense> {
    const result = await db.insert(expenses).values(expense).returning();
    return result[0];
  }

  async updateExpense(id: string, expenseData: any): Promise<Expense | undefined> {
    const result = await db.update(expenses).set(expenseData).where(eq(expenses.id, id)).returning();
    return result[0];
  }

  async deleteExpense(id: string): Promise<boolean> {
    await db.delete(expenses).where(eq(expenses.id, id));
    return true;
  }

  // Ticket methods
  async getTickets(): Promise<Ticket[]> {
    const result = await db
      .select({
        id: tickets.id,
        ticketId: tickets.ticketId,
        customerId: tickets.customerId,
        orderId: tickets.orderId,
        title: tickets.title,
        description: tickets.description,
        category: tickets.category,
        status: tickets.status,
        priority: tickets.priority,
        assignedTo: tickets.assignedTo,
        createdBy: tickets.createdBy,
        resolvedAt: tickets.resolvedAt,
        dueDate: tickets.dueDate,
        tags: tickets.tags,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        customer: customers,
        order: orders
      })
      .from(tickets)
      .leftJoin(customers, eq(tickets.customerId, customers.id))
      .leftJoin(orders, eq(tickets.orderId, orders.id))
      .orderBy(desc(tickets.createdAt));
    
    return result.map(row => ({
      ...row,
      customer: row.customer || undefined,
      order: row.order || undefined
    }));
  }

  async getTicketById(id: string): Promise<Ticket | undefined> {
    const [result] = await db
      .select({
        id: tickets.id,
        ticketId: tickets.ticketId,
        customerId: tickets.customerId,
        orderId: tickets.orderId,
        title: tickets.title,
        description: tickets.description,
        category: tickets.category,
        status: tickets.status,
        priority: tickets.priority,
        assignedTo: tickets.assignedTo,
        createdBy: tickets.createdBy,
        resolvedAt: tickets.resolvedAt,
        dueDate: tickets.dueDate,
        tags: tickets.tags,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        customer: customers,
        order: orders
      })
      .from(tickets)
      .leftJoin(customers, eq(tickets.customerId, customers.id))
      .leftJoin(orders, eq(tickets.orderId, orders.id))
      .where(eq(tickets.id, id));
    
    if (!result) return undefined;
    
    return {
      ...result,
      customer: result.customer || undefined,
      order: result.order || undefined
    };
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const result = await db.insert(tickets).values(ticket).returning();
    return result[0];
  }

  async updateTicket(id: string, ticketData: Partial<InsertTicket>): Promise<Ticket | undefined> {
    const updateData = {
      ...ticketData,
      updatedAt: new Date()
    };
    const result = await db.update(tickets).set(updateData).where(eq(tickets.id, id)).returning();
    return result[0];
  }

  async deleteTicket(id: string): Promise<boolean> {
    await db.delete(tickets).where(eq(tickets.id, id));
    return true;
  }

  async getTicketComments(ticketId: string): Promise<TicketComment[]> {
    const result = await db
      .select({
        id: ticketComments.id,
        ticketId: ticketComments.ticketId,
        content: ticketComments.content,
        isInternal: ticketComments.isInternal,
        createdBy: ticketComments.createdBy,
        createdAt: ticketComments.createdAt,
        updatedAt: ticketComments.updatedAt,
        user: users
      })
      .from(ticketComments)
      .leftJoin(users, eq(ticketComments.createdBy, users.id))
      .where(eq(ticketComments.ticketId, ticketId))
      .orderBy(asc(ticketComments.createdAt));
    
    return result.map(row => ({
      ...row,
      user: row.user || undefined
    }));
  }

  async addTicketComment(comment: InsertTicketComment): Promise<TicketComment> {
    const result = await db.insert(ticketComments).values(comment).returning();
    return result[0];
  }

  async getServices(): Promise<Service[]> {
    const result = await db
      .select({
        id: services.id,
        customerId: services.customerId,
        name: services.name,
        description: services.description,
        serviceDate: services.serviceDate,
        serviceCost: services.serviceCost,
        partsCost: services.partsCost,
        totalCost: services.totalCost,
        status: services.status,
        notes: services.notes,
        createdAt: services.createdAt,
        updatedAt: services.updatedAt,
        customer: customers
      })
      .from(services)
      .leftJoin(customers, eq(services.customerId, customers.id))
      .orderBy(desc(services.createdAt));
    
    return result.map(row => ({
      ...row,
      customer: row.customer || undefined
    }));
  }

  async getServiceById(id: string): Promise<Service | undefined> {
    const [result] = await db
      .select({
        id: services.id,
        customerId: services.customerId,
        name: services.name,
        description: services.description,
        serviceDate: services.serviceDate,
        serviceCost: services.serviceCost,
        partsCost: services.partsCost,
        totalCost: services.totalCost,
        status: services.status,
        notes: services.notes,
        createdAt: services.createdAt,
        updatedAt: services.updatedAt,
        customer: customers
      })
      .from(services)
      .leftJoin(customers, eq(services.customerId, customers.id))
      .where(eq(services.id, id));
    
    if (!result) return undefined;
    
    return {
      ...result,
      customer: result.customer || undefined
    };
  }

  async createService(service: InsertService, items: InsertServiceItem[]): Promise<Service> {
    return await db.transaction(async (tx) => {
      // Calculate partsCost from items
      const partsCost = items.reduce((sum, item) => {
        return sum + parseFloat(item.totalPrice as string);
      }, 0);
      
      // Calculate totalCost = serviceCost + partsCost
      const serviceCost = parseFloat(service.serviceCost as string || '0');
      const totalCost = serviceCost + partsCost;
      
      // Insert service with calculated costs
      const [newService] = await tx
        .insert(services)
        .values({
          ...service,
          partsCost: partsCost.toFixed(2),
          totalCost: totalCost.toFixed(2)
        })
        .returning();
      
      // Insert service items
      if (items.length > 0) {
        await tx.insert(serviceItems).values(
          items.map(item => ({
            ...item,
            serviceId: newService.id
          }))
        );
      }
      
      // Fetch the created service with customer info
      const [result] = await tx
        .select({
          id: services.id,
          customerId: services.customerId,
          name: services.name,
          description: services.description,
          serviceDate: services.serviceDate,
          serviceCost: services.serviceCost,
          partsCost: services.partsCost,
          totalCost: services.totalCost,
          status: services.status,
          notes: services.notes,
          createdAt: services.createdAt,
          updatedAt: services.updatedAt,
          customer: customers
        })
        .from(services)
        .leftJoin(customers, eq(services.customerId, customers.id))
        .where(eq(services.id, newService.id));
      
      return {
        ...result,
        customer: result.customer || undefined
      };
    });
  }

  async updateService(id: string, service: Partial<InsertService>): Promise<Service | undefined> {
    const [updated] = await db
      .update(services)
      .set({ ...service, updatedAt: new Date() })
      .where(eq(services.id, id))
      .returning();
    
    if (!updated) return undefined;
    
    // Fetch with customer info
    const [result] = await db
      .select({
        id: services.id,
        customerId: services.customerId,
        name: services.name,
        description: services.description,
        serviceDate: services.serviceDate,
        serviceCost: services.serviceCost,
        partsCost: services.partsCost,
        totalCost: services.totalCost,
        status: services.status,
        notes: services.notes,
        createdAt: services.createdAt,
        updatedAt: services.updatedAt,
        customer: customers
      })
      .from(services)
      .leftJoin(customers, eq(services.customerId, customers.id))
      .where(eq(services.id, id));
    
    return {
      ...result,
      customer: result.customer || undefined
    };
  }

  async deleteService(id: string): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  async getServiceItems(serviceId: string): Promise<ServiceItem[]> {
    const result = await db
      .select({
        id: serviceItems.id,
        serviceId: serviceItems.serviceId,
        productId: serviceItems.productId,
        productName: serviceItems.productName,
        sku: serviceItems.sku,
        quantity: serviceItems.quantity,
        unitPrice: serviceItems.unitPrice,
        totalPrice: serviceItems.totalPrice,
        createdAt: serviceItems.createdAt,
        updatedAt: serviceItems.updatedAt,
        product: products
      })
      .from(serviceItems)
      .leftJoin(products, eq(serviceItems.productId, products.id))
      .where(eq(serviceItems.serviceId, serviceId));
    
    return result.map(row => ({
      ...row,
      product: row.product || undefined
    }));
  }

  async updateServiceItem(id: string, item: Partial<InsertServiceItem>): Promise<ServiceItem | undefined> {
    const [updated] = await db
      .update(serviceItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(serviceItems.id, id))
      .returning();
    
    if (!updated) return undefined;
    
    // Fetch with product info
    const [result] = await db
      .select({
        id: serviceItems.id,
        serviceId: serviceItems.serviceId,
        productId: serviceItems.productId,
        productName: serviceItems.productName,
        sku: serviceItems.sku,
        quantity: serviceItems.quantity,
        unitPrice: serviceItems.unitPrice,
        totalPrice: serviceItems.totalPrice,
        createdAt: serviceItems.createdAt,
        updatedAt: serviceItems.updatedAt,
        product: products
      })
      .from(serviceItems)
      .leftJoin(products, eq(serviceItems.productId, products.id))
      .where(eq(serviceItems.id, id));
    
    return {
      ...result,
      product: result.product || undefined
    };
  }

  async deleteServiceItem(id: string): Promise<void> {
    await db.delete(serviceItems).where(eq(serviceItems.id, id));
  }

  async getPreOrders(): Promise<PreOrder[]> {
    const itemsCount = db
      .select({ 
        preOrderId: preOrderItems.preOrderId,
        count: sql<number>`cast(count(*) as integer)`.as('count')
      })
      .from(preOrderItems)
      .groupBy(preOrderItems.preOrderId)
      .as('items_count');

    return await db
      .select({
        id: preOrders.id,
        customerId: preOrders.customerId,
        status: preOrders.status,
        notes: preOrders.notes,
        expectedDate: preOrders.expectedDate,
        createdAt: preOrders.createdAt,
        updatedAt: preOrders.updatedAt,
        customer: customers,
        itemsCount: sql<number>`coalesce(${itemsCount.count}, 0)`
      })
      .from(preOrders)
      .leftJoin(customers, eq(preOrders.customerId, customers.id))
      .leftJoin(itemsCount, eq(preOrders.id, itemsCount.preOrderId))
      .orderBy(desc(preOrders.createdAt)) as any;
  }

  async getPreOrder(id: string): Promise<PreOrder | undefined> {
    const [preOrder] = await db
      .select({
        id: preOrders.id,
        customerId: preOrders.customerId,
        status: preOrders.status,
        notes: preOrders.notes,
        expectedDate: preOrders.expectedDate,
        createdAt: preOrders.createdAt,
        updatedAt: preOrders.updatedAt,
        customer: customers
      })
      .from(preOrders)
      .leftJoin(customers, eq(preOrders.customerId, customers.id))
      .where(eq(preOrders.id, id)) as any;
    
    if (!preOrder) return undefined;

    const items = await db
      .select()
      .from(preOrderItems)
      .where(eq(preOrderItems.preOrderId, id));

    return { ...preOrder, items } as any;
  }

  async createPreOrder(preOrder: InsertPreOrder): Promise<PreOrder> {
    const [newPreOrder] = await db
      .insert(preOrders)
      .values(preOrder)
      .returning();
    return newPreOrder;
  }

  async updatePreOrder(id: string, preOrder: Partial<InsertPreOrder>): Promise<PreOrder> {
    const [updated] = await db
      .update(preOrders)
      .set({ ...preOrder, updatedAt: new Date() })
      .where(eq(preOrders.id, id))
      .returning();
    return updated;
  }

  async deletePreOrder(id: string): Promise<boolean> {
    try {
      const result = await db.delete(preOrders).where(eq(preOrders.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting pre-order:', error);
      return false;
    }
  }

  async getPreOrderItems(preOrderId: string): Promise<PreOrderItem[]> {
    return await db
      .select()
      .from(preOrderItems)
      .where(eq(preOrderItems.preOrderId, preOrderId));
  }

  async createPreOrderItem(item: InsertPreOrderItem): Promise<PreOrderItem> {
    const [newItem] = await db
      .insert(preOrderItems)
      .values(item)
      .returning();
    return newItem;
  }

  async updatePreOrderItem(id: string, item: Partial<InsertPreOrderItem>): Promise<PreOrderItem> {
    const [updated] = await db
      .update(preOrderItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(preOrderItems.id, id))
      .returning();
    return updated;
  }

  async deletePreOrderItem(id: string): Promise<boolean> {
    try {
      const result = await db.delete(preOrderItems).where(eq(preOrderItems.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting pre-order item:', error);
      return false;
    }
  }

  async getPurchases(): Promise<Purchase[]> { return []; }
  async getPurchase(id: string): Promise<Purchase | undefined> { return undefined; }
  async createPurchase(purchase: any): Promise<Purchase> { return { id: Date.now().toString(), ...purchase }; }
  async updatePurchase(id: string, purchase: any): Promise<Purchase | undefined> { return { id, ...purchase }; }
  async deletePurchase(id: string): Promise<boolean> { return true; }

  async getSales(): Promise<Sale[]> { return []; }
  async createSale(sale: any): Promise<Sale> { return { id: Date.now().toString(), ...sale }; }

  async getUserActivities(): Promise<UserActivity[]> { return []; }
  async createUserActivity(activity: any): Promise<UserActivity> { return { id: Date.now().toString(), ...activity }; }
  
  async createPickPackLog(log: any): Promise<UserActivity> {
    // Convert pick/pack log to user activity format
    const activity = {
      userId: log.userId || "test-user",
      action: log.activityType || 'updated',
      entityType: 'order',
      entityId: log.orderId,
      description: log.notes || `Pick/pack activity: ${log.activityType}`,
    };
    return this.createUserActivity(activity);
  }

  async getPickPackLogs(orderId: string): Promise<UserActivity[]> {
    try {
      // Return empty array as a placeholder for now
      return [];
    } catch (error) {
      console.error('Error getting pick/pack logs:', error);
      return [];
    }
  }

  // Categories - Optimized with proper error handling
  async getCategories(): Promise<AppCategory[]> {
    try {
      // Using raw SQL for now to avoid schema mismatch issues
      // Include product count - cast category.id to text to match products.category_id (varchar)
      const result = await db.execute(sql`
        SELECT 
          c.id::integer as id, 
          c.name, 
          c.name_en, 
          c.name_cz, 
          c.name_vn, 
          c.description, 
          c.created_at, 
          c.updated_at,
          COALESCE(COUNT(p.id), 0)::integer as "productCount"
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id::text
        GROUP BY c.id, c.name, c.name_en, c.name_cz, c.name_vn, c.description, c.created_at, c.updated_at
        ORDER BY c.name
      `);
      return result.rows as AppCategory[];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  async getCategoryById(id: string): Promise<AppCategory | undefined> {
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

  async createCategory(category: InsertCategory): Promise<AppCategory> {
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

  async updateCategory(id: string, updates: Partial<InsertCategory>): Promise<AppCategory | undefined> {
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

  // Legacy bundle methods (delegating to ProductBundle methods)
  async getBundles(): Promise<Bundle[]> { 
    return this.getProductBundles() as Promise<Bundle[]>; 
  }
  
  async getBundleById(id: string): Promise<Bundle | undefined> { 
    return this.getProductBundle(id) as Promise<Bundle | undefined>; 
  }
  
  async createBundle(bundle: any): Promise<Bundle> { 
    return this.createProductBundle(bundle) as Promise<Bundle>; 
  }
  
  async updateBundle(id: string, bundle: any): Promise<Bundle | undefined> { 
    return this.updateProductBundle(id, bundle) as Promise<Bundle | undefined>; 
  }
  
  async deleteBundle(id: string): Promise<boolean> { 
    return this.deleteProductBundle(id); 
  }

  async updateBundleItem(id: string, item: any): Promise<BundleItem | undefined> { 
    return { id, ...item }; 
  }
  
  async deleteBundleItem(id: string): Promise<boolean> { 
    return true; 
  }

  async getCustomerPrices(customerId?: number): Promise<CustomerPrice[]> { return []; }
  async getActiveCustomerPrice(customerId: number, productId: string): Promise<CustomerPrice | undefined> { return undefined; }
  async createCustomerPrice(price: any): Promise<CustomerPrice> { return { id: Date.now().toString(), ...price }; }
  async updateCustomerPrice(id: string, price: any): Promise<CustomerPrice | undefined> { return { id, ...price }; }
  async deleteCustomerPrice(id: string): Promise<boolean> { return true; }

  async getPackingMaterials(): Promise<PackingMaterial[]> {
    try {
      return await db
        .select()
        .from(packingMaterials)
        .orderBy(desc(packingMaterials.category), asc(packingMaterials.name));
    } catch (error) {
      console.error('Error fetching packing materials:', error);
      return [];
    }
  }

  async getPackingMaterial(id: string): Promise<PackingMaterial | undefined> {
    try {
      const [material] = await db
        .select()
        .from(packingMaterials)
        .where(eq(packingMaterials.id, id));
      return material || undefined;
    } catch (error) {
      console.error('Error fetching packing material:', error);
      return undefined;
    }
  }

  async createPackingMaterial(material: InsertPackingMaterial): Promise<PackingMaterial> {
    try {
      const [newMaterial] = await db
        .insert(packingMaterials)
        .values(material)
        .returning();
      return newMaterial;
    } catch (error) {
      console.error('Error creating packing material:', error);
      throw error;
    }
  }

  async updatePackingMaterial(id: string, material: Partial<InsertPackingMaterial>): Promise<PackingMaterial | undefined> {
    try {
      const [updated] = await db
        .update(packingMaterials)
        .set({ ...material, updatedAt: new Date() })
        .where(eq(packingMaterials.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating packing material:', error);
      return undefined;
    }
  }

  async deletePackingMaterial(id: string): Promise<boolean> {
    try {
      await db
        .delete(packingMaterials)
        .where(eq(packingMaterials.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting packing material:', error);
      return false;
    }
  }

  async getPackingMaterialUsage(orderId: string): Promise<PackingMaterialUsage[]> {
    try {
      return await db
        .select()
        .from(packingMaterialUsage)
        .where(eq(packingMaterialUsage.orderId, orderId));
    } catch (error) {
      console.error('Error fetching packing material usage:', error);
      return [];
    }
  }

  async createPackingMaterialUsage(usage: InsertPackingMaterialUsage): Promise<PackingMaterialUsage> {
    try {
      const [newUsage] = await db
        .insert(packingMaterialUsage)
        .values(usage)
        .returning();
      return newUsage;
    } catch (error) {
      console.error('Error creating packing material usage:', error);
      throw error;
    }
  }

  async getPmSuppliers(): Promise<PmSupplier[]> {
    try {
      return await db
        .select()
        .from(pmSuppliers)
        .where(eq(pmSuppliers.isActive, true))
        .orderBy(asc(pmSuppliers.name));
    } catch (error) {
      console.error('Error fetching PM suppliers:', error);
      return [];
    }
  }

  async getPmSupplier(id: string): Promise<PmSupplier | undefined> {
    try {
      const [supplier] = await db
        .select()
        .from(pmSuppliers)
        .where(eq(pmSuppliers.id, id));
      return supplier || undefined;
    } catch (error) {
      console.error('Error fetching PM supplier:', error);
      return undefined;
    }
  }

  async createPmSupplier(supplier: InsertPmSupplier): Promise<PmSupplier> {
    try {
      const [newSupplier] = await db
        .insert(pmSuppliers)
        .values(supplier)
        .returning();
      return newSupplier;
    } catch (error) {
      console.error('Error creating PM supplier:', error);
      throw error;
    }
  }

  async updatePmSupplier(id: string, supplier: Partial<InsertPmSupplier>): Promise<PmSupplier | undefined> {
    try {
      const [updated] = await db
        .update(pmSuppliers)
        .set({ ...supplier, updatedAt: new Date() })
        .where(eq(pmSuppliers.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating PM supplier:', error);
      return undefined;
    }
  }

  async deletePmSupplier(id: string): Promise<boolean> {
    try {
      await db
        .delete(pmSuppliers)
        .where(eq(pmSuppliers.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting PM supplier:', error);
      return false;
    }
  }

  async searchPmSuppliers(query: string): Promise<PmSupplier[]> {
    try {
      return await db
        .select()
        .from(pmSuppliers)
        .where(
          and(
            eq(pmSuppliers.isActive, true),
            ilike(pmSuppliers.name, `%${query}%`)
          )
        )
        .orderBy(asc(pmSuppliers.name));
    } catch (error) {
      console.error('Error searching PM suppliers:', error);
      return [];
    }
  }

  async getAllFiles(): Promise<FileType[]> { return []; }
  async getFilesByType(type: string): Promise<FileType[]> { return []; }
  async createFile(file: any): Promise<FileType> { return { id: Date.now().toString(), ...file }; }
  async updateFile(id: string, file: any): Promise<FileType | undefined> { return { id, ...file }; }
  async deleteFile(id: string): Promise<boolean> { return true; }
  
  async getPackingCartons(): Promise<PackingCarton[]> {
    try {
      return await db
        .select()
        .from(packingCartons)
        .orderBy(desc(packingCartons.createdAt));
    } catch (error) {
      console.error('Error fetching packing cartons:', error);
      return [];
    }
  }

  async getPackingCarton(id: string): Promise<PackingCarton | undefined> {
    try {
      const [carton] = await db
        .select()
        .from(packingCartons)
        .where(eq(packingCartons.id, id));
      return carton || undefined;
    } catch (error) {
      console.error('Error fetching packing carton:', error);
      return undefined;
    }
  }

  async createPackingCarton(carton: InsertPackingCarton): Promise<PackingCarton> {
    try {
      const [newCarton] = await db
        .insert(packingCartons)
        .values(carton)
        .returning();
      return newCarton;
    } catch (error) {
      console.error('Error creating packing carton:', error);
      throw error;
    }
  }

  async updatePackingCarton(id: string, carton: Partial<InsertPackingCarton>): Promise<PackingCarton | undefined> {
    try {
      const [updated] = await db
        .update(packingCartons)
        .set({ ...carton, updatedAt: new Date() })
        .where(eq(packingCartons.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating packing carton:', error);
      return undefined;
    }
  }

  async deletePackingCarton(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(packingCartons)
        .where(eq(packingCartons.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting packing carton:', error);
      return false;
    }
  }

  async getOrderCartonPlan(orderId: string): Promise<OrderCartonPlan | undefined> {
    try {
      const [plan] = await db
        .select()
        .from(orderCartonPlans)
        .where(eq(orderCartonPlans.orderId, orderId))
        .orderBy(desc(orderCartonPlans.createdAt))
        .limit(1);
      return plan || undefined;
    } catch (error) {
      console.error('Error fetching order carton plan:', error);
      return undefined;
    }
  }

  async getOrderCartonPlanById(planId: string): Promise<OrderCartonPlan | undefined> {
    try {
      const [plan] = await db
        .select()
        .from(orderCartonPlans)
        .where(eq(orderCartonPlans.id, planId));
      return plan || undefined;
    } catch (error) {
      console.error('Error fetching order carton plan by ID:', error);
      return undefined;
    }
  }

  async createOrderCartonPlan(plan: InsertOrderCartonPlan): Promise<OrderCartonPlan> {
    try {
      const [newPlan] = await db
        .insert(orderCartonPlans)
        .values(plan)
        .returning();
      return newPlan;
    } catch (error) {
      console.error('Error creating order carton plan:', error);
      throw error;
    }
  }

  async updateOrderCartonPlan(planId: string, plan: Partial<InsertOrderCartonPlan>): Promise<OrderCartonPlan | undefined> {
    try {
      const [updated] = await db
        .update(orderCartonPlans)
        .set({ ...plan, updatedAt: new Date() })
        .where(eq(orderCartonPlans.id, planId))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating order carton plan:', error);
      return undefined;
    }
  }

  async getOrderCartonItems(planId: string): Promise<OrderCartonItem[]> {
    try {
      const items = await db
        .select({
          id: orderCartonItems.id,
          planId: orderCartonItems.planId,
          cartonNumber: orderCartonItems.cartonNumber,
          cartonId: orderCartonItems.cartonId,
          orderItemId: orderCartonItems.orderItemId,
          productId: orderCartonItems.productId,
          quantity: orderCartonItems.quantity,
          itemWeightKg: orderCartonItems.itemWeightKg,
          aiEstimated: orderCartonItems.aiEstimated,
          createdAt: orderCartonItems.createdAt,
          carton: packingCartons
        })
        .from(orderCartonItems)
        .leftJoin(packingCartons, eq(orderCartonItems.cartonId, packingCartons.id))
        .where(eq(orderCartonItems.planId, planId))
        .orderBy(asc(orderCartonItems.cartonNumber));
      
      return items.map(item => ({
        id: item.id,
        planId: item.planId,
        cartonNumber: item.cartonNumber,
        cartonId: item.cartonId,
        orderItemId: item.orderItemId,
        productId: item.productId,
        quantity: item.quantity,
        itemWeightKg: item.itemWeightKg,
        aiEstimated: item.aiEstimated,
        createdAt: item.createdAt,
        carton: item.carton || undefined
      })) as any;
    } catch (error) {
      console.error('Error fetching order carton items:', error);
      return [];
    }
  }

  async createOrderCartonItem(item: InsertOrderCartonItem): Promise<OrderCartonItem> {
    try {
      const [newItem] = await db
        .insert(orderCartonItems)
        .values(item)
        .returning();
      return newItem;
    } catch (error) {
      console.error('Error creating order carton item:', error);
      throw error;
    }
  }

  async deleteOrderCartonPlan(planId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(orderCartonPlans)
        .where(eq(orderCartonPlans.id, planId));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting order carton plan:', error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();