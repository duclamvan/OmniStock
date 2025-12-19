import {
  users,
  employees,
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
  supplierFiles,
  products,
  aiLocationSuggestions,
  productVariants,
  productFiles,
  orderFiles,
  productLocations,
  stockAdjustmentRequests,
  stockAdjustmentHistory,
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
  preOrderReminders,
  packingCartons,
  orderCartonPlans,
  orderCartonItems,
  orderCartons,
  shipmentLabels,
  expenses,
  packingMaterials,
  packingMaterialUsage,
  pmSuppliers,
  discounts,
  tickets,
  ticketComments,
  orderFulfillmentLogs,
  appSettings,
  receipts,
  notifications,
  activityLog,
  invoices,
  warehouseTasks,
  employeeIncidents,
  type User,
  type InsertUser,
  type Invoice,
  type InsertInvoice,
  type ActivityLog,
  type InsertActivityLog,
  type Employee,
  type InsertEmployee,
  type EmployeeIncident,
  type InsertEmployeeIncident,
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
  type SupplierFile,
  type InsertSupplierFile,
  type Product,
  type InsertProduct,
  type AiLocationSuggestion,
  type InsertAiLocationSuggestion,
  type ProductVariant,
  type InsertProductVariant,
  type ProductFile,
  type InsertProductFile,
  type OrderFile,
  type InsertOrderFile,
  type ProductLocation,
  type InsertProductLocation,
  type StockAdjustmentRequest,
  type InsertStockAdjustmentRequest,
  type StockAdjustmentHistory,
  type InsertStockAdjustmentHistory,
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
  type PreOrderReminder,
  type InsertPreOrderReminder,
  type PackingCarton,
  type InsertPackingCarton,
  type OrderCartonPlan,
  type InsertOrderCartonPlan,
  type OrderCartonItem,
  type InsertOrderCartonItem,
  type OrderCarton,
  type InsertOrderCarton,
  type ShipmentLabel,
  type InsertShipmentLabel,
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
  type InsertTicketComment,
  type OrderFulfillmentLog,
  type InsertOrderFulfillmentLog,
  type AppSetting,
  type InsertAppSetting,
  type CustomerBadge,
  type InsertCustomerBadge,
  customerBadges,
  type WarehouseTask,
  type InsertWarehouseTask
} from "@shared/schema";
import { db as database } from "./db";
import { eq, desc, and, or, like, ilike, sql, gte, lte, lt, inArray, ne, asc, isNull, notInArray, not } from "drizzle-orm";
import * as badgeService from './services/badgeService';

// Re-export db for backward compatibility with methods still using global db
const db = database;

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

// Helper to normalize search query
function normalizeSearchQuery(str: string): string {
  const diacriticsMap: Record<string, string> = {
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
    'ě': 'e', 'ň': 'n', 'ř': 'r', 'š': 's', 'ť': 't', 'ů': 'u', 'ž': 'z',
    'ď': 'd', 'č': 'c', 'ĺ': 'l', 'ľ': 'l', 'ŕ': 'r'
  };

  return str.split('').map(char => {
    return diacriticsMap[char.toLowerCase()] || char.toLowerCase();
  }).join('');
}

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
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUserWithPassword(userData: { username: string; passwordHash: string; firstName?: string; lastName?: string; email?: string; role?: string }): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUserCount(): Promise<number>;
  updateUserRole(userId: string, role: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  updateUserProfile(userId: string, updates: Partial<Pick<User, 'firstName' | 'lastName' | 'email'>>): Promise<User | undefined>;

  // Employees
  getEmployees(): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: number): Promise<void>;
  assignUserToEmployee(employeeId: number, userId: string | null): Promise<void>;
  getEmployeeStats(employeeId: number): Promise<{
    totalOrders: number;
    totalTasks: number;
    tasksCompleted: number;
    openIncidents: number;
    totalIncidents: number;
    recentActivityCount: number;
  }>;

  // Employee Incidents
  getEmployeeIncidents(employeeId: number): Promise<EmployeeIncident[]>;
  getEmployeeIncident(id: number): Promise<EmployeeIncident | undefined>;
  createEmployeeIncident(incident: InsertEmployeeIncident): Promise<EmployeeIncident>;
  updateEmployeeIncident(id: number, incident: Partial<InsertEmployeeIncident>): Promise<EmployeeIncident | undefined>;
  deleteEmployeeIncident(id: number): Promise<void>;

  // Activity Logs
  getActivityLogs(options?: { userId?: string; limit?: number; offset?: number }): Promise<ActivityLog[]>;
  getActivityLogsByUserId(userId: string): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  // Order Fulfillment Logs
  getOrderFulfillmentLogsByUserId(userId: string, limit?: number): Promise<OrderFulfillmentLog[]>;

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
  getAllOrderItems(): Promise<OrderItem[]>;
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
  getProductBySku(sku: string): Promise<Product | undefined>;
  createProduct(product: any): Promise<Product>;
  updateProduct(id: string, product: any): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  getLowStockProducts(): Promise<Product[]>;
  calculateProductReorderRate(productId: string): Promise<number>;
  updateProductReorderRate(productId: string, rate: number): Promise<void>;

  // Product Variants
  getProductVariants(productId: string): Promise<ProductVariant[]>;
  getProductVariant(id: string): Promise<ProductVariant | undefined>;
  createProductVariant(variant: any): Promise<ProductVariant>;
  updateProductVariant(id: string, variant: any): Promise<ProductVariant | undefined>;
  deleteProductVariant(id: string): Promise<boolean>;

  // AI Location Suggestions
  getAiLocationSuggestionByProduct(productId: string): Promise<AiLocationSuggestion | undefined>;
  getAiLocationSuggestionByCustomItem(customItemId: number): Promise<AiLocationSuggestion | undefined>;
  createAiLocationSuggestion(suggestion: InsertAiLocationSuggestion): Promise<AiLocationSuggestion>;

  // Product Locations
  getProductLocations(productId: string): Promise<ProductLocation[]>;
  createProductLocation(location: InsertProductLocation): Promise<ProductLocation>;
  updateProductLocation(id: string, location: Partial<InsertProductLocation>): Promise<ProductLocation | undefined>;
  deleteProductLocation(id: string): Promise<boolean>;
  moveInventory(fromLocationId: string, toLocationId: string, quantity: number): Promise<boolean>;

  // Stock Adjustment Requests
  getStockAdjustmentRequests(): Promise<StockAdjustmentRequest[]>;
  getStockAdjustmentRequest(id: string): Promise<StockAdjustmentRequest | undefined>;
  createStockAdjustmentRequest(request: InsertStockAdjustmentRequest): Promise<StockAdjustmentRequest>;
  approveStockAdjustmentRequest(id: string, approvedBy: string): Promise<StockAdjustmentRequest | undefined>;
  rejectStockAdjustmentRequest(id: string, approvedBy: string, reason: string): Promise<StockAdjustmentRequest | undefined>;

  // Stock Adjustment History
  getStockAdjustmentHistory(options?: { productId?: string; startDate?: Date; endDate?: Date; limit?: number; offset?: number }): Promise<StockAdjustmentHistory[]>;
  getStockAdjustmentHistoryCount(options?: { productId?: string; startDate?: Date; endDate?: Date }): Promise<number>;
  createStockAdjustmentHistory(history: InsertStockAdjustmentHistory): Promise<StockAdjustmentHistory>;

  // Over-Allocated Inventory
  getOverAllocatedItems(): Promise<any[]>;

  // Under-Allocated Inventory
  getUnderAllocatedItems(): Promise<any[]>;

  // Product Files
  getProductFiles(productId: string): Promise<ProductFile[]>;
  getProductFile(id: string): Promise<ProductFile | undefined>;
  createProductFile(file: InsertProductFile): Promise<ProductFile>;
  updateProductFile(id: string, data: Partial<InsertProductFile>): Promise<ProductFile | undefined>;
  deleteProductFile(id: string): Promise<boolean>;

  // Order Files
  getOrderFiles(orderId: string): Promise<OrderFile[]>;
  getOrderFile(id: string): Promise<OrderFile | undefined>;
  createOrderFile(file: InsertOrderFile): Promise<OrderFile>;
  deleteOrderFile(id: string): Promise<boolean>;

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
  searchCustomers(query: string): Promise<Customer[]>;
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

  // Customer Badges
  getCustomerBadges(customerId: string): Promise<CustomerBadge[]>;
  refreshCustomerBadges(customerId: string): Promise<void>;
  refreshOrderBadges(orderId: string): Promise<void>;

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
  
  // Supplier Files
  getSupplierFiles(supplierId: string): Promise<SupplierFile[]>;
  createSupplierFile(file: InsertSupplierFile): Promise<SupplierFile>;
  deleteSupplierFile(fileId: string): Promise<boolean>;
  
  // Address Helper (for shipping addresses)
  getAddress(addressId: string): Promise<CustomerShippingAddress | undefined>;
  
  // Product Search
  searchProducts(query: string, includeInactive?: boolean): Promise<Product[]>;
  getProductsOrderCounts(productIds: string[]): Promise<{productId: string, count: number}[]>;

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
  
  // Pre-Order Reminders
  getPreOrderReminders(preOrderId: string): Promise<PreOrderReminder[]>;
  createPreOrderReminder(reminder: InsertPreOrderReminder): Promise<PreOrderReminder>;
  updatePreOrderReminderStatus(id: number, status: string, errorMessage?: string): Promise<PreOrderReminder | undefined>;

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
  createPackingMaterialsBulk(materials: InsertPackingMaterial[]): Promise<PackingMaterial[]>;
  updatePackingMaterial(id: string, material: any): Promise<PackingMaterial | undefined>;
  deletePackingMaterial(id: string): Promise<boolean>;
  decreasePackingMaterialStock(materialId: string, quantity: number): Promise<void>;

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
  getPopularCartons(): Promise<PackingCarton[]>;
  incrementCartonUsage(cartonId: string): Promise<void>;

  // Order Carton Plans
  getOrderCartonPlan(orderId: string): Promise<OrderCartonPlan | undefined>;
  getOrderCartonPlanById(planId: string): Promise<OrderCartonPlan | undefined>;
  createOrderCartonPlan(plan: InsertOrderCartonPlan): Promise<OrderCartonPlan>;
  updateOrderCartonPlan(planId: string, plan: Partial<InsertOrderCartonPlan>): Promise<OrderCartonPlan | undefined>;
  getOrderCartonItems(planId: string): Promise<OrderCartonItem[]>;
  createOrderCartonItem(item: InsertOrderCartonItem): Promise<OrderCartonItem>;
  deleteOrderCartonPlan(planId: string): Promise<boolean>;
  deleteOrderCartonPlansByOrderId(orderId: string): Promise<boolean>;

  // Order Cartons (actual cartons used during packing)
  getOrderCartons(orderId: string): Promise<OrderCarton[]>;
  getOrderCarton(id: string): Promise<OrderCarton | undefined>;
  createOrderCarton(carton: InsertOrderCarton): Promise<OrderCarton>;
  updateOrderCarton(id: string, carton: Partial<InsertOrderCarton>): Promise<OrderCarton | undefined>;
  deleteOrderCarton(id: string): Promise<boolean>;

  // Shipment Labels (PPL, GLS, DHL, etc.)
  getShipmentLabels(): Promise<ShipmentLabel[]>;
  getShipmentLabel(id: string): Promise<ShipmentLabel | undefined>;
  getShipmentLabelsByOrderId(orderId: string): Promise<ShipmentLabel[]>;
  createShipmentLabel(label: InsertShipmentLabel): Promise<ShipmentLabel>;
  updateShipmentLabel(id: string, label: Partial<InsertShipmentLabel>): Promise<ShipmentLabel | undefined>;
  cancelShipmentLabel(id: string, reason?: string): Promise<ShipmentLabel | undefined>;

  // Order Fulfillment Performance Tracking
  logFulfillmentStart(orderId: string, userId: string, activityType: 'pick' | 'pack', itemCount: number, totalQuantity: number): Promise<OrderFulfillmentLog>;
  logFulfillmentComplete(orderId: string, userId: string, activityType: 'pick' | 'pack'): Promise<OrderFulfillmentLog | undefined>;
  getPickPackPredictions(userId: string): Promise<{ pickingTimePerOrder: number; packingTimePerOrder: number; pickingTimePerItem: number; packingTimePerItem: number }>;

  // App Settings
  getAppSettings(): Promise<AppSetting[]>;
  getAppSettingByKey(key: string): Promise<AppSetting | undefined>;
  createAppSetting(data: InsertAppSetting): Promise<AppSetting>;
  updateAppSetting(key: string, data: Partial<InsertAppSetting>): Promise<AppSetting>;
  deleteAppSetting(key: string): Promise<void>;

  // Invoices
  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined>;
  getInvoicesByOrderId(orderId: string): Promise<Invoice[]>;
  createInvoice(data: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, data: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: number): Promise<void>;

  // Analytics & Reports
  getDeadStockProducts(daysSinceLastSale: number): Promise<Product[]>;
  getReorderAlerts(): Promise<Product[]>;
  getColorTrendReport(categoryName: string, startDate?: Date, endDate?: Date): Promise<any[]>;

  // Warehouse Tasks
  getWarehouseTasks(filters?: { status?: string; assignedToUserId?: string; createdByUserId?: string }): Promise<WarehouseTask[]>;
  getWarehouseTaskById(id: number): Promise<WarehouseTask | undefined>;
  createWarehouseTask(task: InsertWarehouseTask): Promise<WarehouseTask>;
  updateWarehouseTask(id: number, updates: Partial<WarehouseTask>): Promise<WarehouseTask | undefined>;
  deleteWarehouseTask(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  private db = database;

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phoneNumber, phone)).limit(1);
    return user;
  }


  async getUserCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    return result[0]?.count || 0;
  }

  async createUserWithPassword(userData: { username: string; passwordHash: string; firstName?: string; lastName?: string; email?: string; role?: string }): Promise<User> {
    const { nanoid } = await import('nanoid');
    try {
      const [user] = await db.insert(users).values({
        id: nanoid(),
        username: userData.username,
        passwordHash: userData.passwordHash,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        email: userData.email || null,
        role: userData.role || null,
      }).returning();
      return user;
    } catch (error: any) {
      if (error.code === '23505') {
        throw new Error('Username already exists');
      }
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserRole(userId: string, role: string): Promise<void> {
    await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async deleteUser(userId: string): Promise<void> {
    // Delete user and all related records in a transaction
    await db.transaction(async (tx) => {
      // Delete notifications (not historically critical)
      await tx.delete(notifications).where(eq(notifications.userId, userId));
      
      // Set user references to null in various tables to preserve historical data
      // Orders - preserve billing history
      await tx.update(orders).set({ billerId: null }).where(eq(orders.billerId, userId));
      
      // Stock adjustment requests - preserve audit trail
      await tx.update(stockAdjustmentRequests).set({ requestedBy: null }).where(eq(stockAdjustmentRequests.requestedBy, userId));
      await tx.update(stockAdjustmentRequests).set({ approvedBy: null }).where(eq(stockAdjustmentRequests.approvedBy, userId));
      
      // Tickets - preserve ticket history
      await tx.update(tickets).set({ assignedTo: null }).where(eq(tickets.assignedTo, userId));
      await tx.update(tickets).set({ createdBy: null }).where(eq(tickets.createdBy, userId));
      
      // Ticket comments - preserve comment history
      await tx.update(ticketComments).set({ createdBy: null }).where(eq(ticketComments.createdBy, userId));
      
      // Order fulfillment logs - preserve performance metrics
      await tx.update(orderFulfillmentLogs).set({ userId: null as any }).where(eq(orderFulfillmentLogs.userId, userId));
      
      // App settings - preserve settings history
      await tx.update(appSettings).set({ updatedBy: null }).where(eq(appSettings.updatedBy, userId));
      
      // Finally, delete the user
      await tx.delete(users).where(eq(users.id, userId));
    });
  }

  async updateUserProfile(userId: string, updates: Partial<Pick<User, 'firstName' | 'lastName' | 'email'>>): Promise<User | undefined> {
    const normalizedUpdates = { ...updates };
    
    if (normalizedUpdates.email) {
      normalizedUpdates.email = normalizedUpdates.email.toLowerCase();
    }
    
    const result = await db
      .update(users)
      .set({ ...normalizedUpdates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    
    return result[0];
  }

  // Employees
  async getEmployees(): Promise<Employee[]> {
    return await db
      .select()
      .from(employees)
      .orderBy(desc(employees.createdAt));
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, id));
    return employee || undefined;
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db
      .insert(employees)
      .values(employee)
      .returning();
    return newEmployee;
  }

  async updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [updated] = await db
      .update(employees)
      .set({ ...employee, updatedAt: new Date() })
      .where(eq(employees.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteEmployee(id: number): Promise<void> {
    await db.delete(employees).where(eq(employees.id, id));
  }

  async assignUserToEmployee(employeeId: number, userId: string | null): Promise<void> {
    await db
      .update(employees)
      .set({ userId, updatedAt: new Date() })
      .where(eq(employees.id, employeeId));
  }

  async getEmployeeStats(employeeId: number): Promise<{
    totalOrders: number;
    totalTasks: number;
    tasksCompleted: number;
    openIncidents: number;
    totalIncidents: number;
    recentActivityCount: number;
  }> {
    const employee = await this.getEmployee(employeeId);
    if (!employee || !employee.userId) {
      return {
        totalOrders: 0,
        totalTasks: 0,
        tasksCompleted: 0,
        openIncidents: 0,
        totalIncidents: 0,
        recentActivityCount: 0,
      };
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [orderStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(activityLog)
      .where(and(
        eq(activityLog.userId, employee.userId),
        eq(activityLog.entityType, 'order'),
        sql`${activityLog.action} IN ('create', 'update', 'fulfill')`
      ));

    const [taskStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(warehouseTasks)
      .where(eq(warehouseTasks.assignedToUserId, employee.userId));

    const [completedTaskStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(warehouseTasks)
      .where(and(
        eq(warehouseTasks.assignedToUserId, employee.userId),
        eq(warehouseTasks.status, 'completed')
      ));

    const [openIncidentStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(employeeIncidents)
      .where(and(
        eq(employeeIncidents.employeeId, employeeId),
        sql`${employeeIncidents.status} IN ('open', 'investigating')`
      ));

    const [totalIncidentStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(employeeIncidents)
      .where(eq(employeeIncidents.employeeId, employeeId));

    const [recentActivityStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(activityLog)
      .where(and(
        eq(activityLog.userId, employee.userId),
        sql`${activityLog.createdAt} >= ${thirtyDaysAgo}`
      ));

    return {
      totalOrders: Number(orderStats?.count || 0),
      totalTasks: Number(taskStats?.count || 0),
      tasksCompleted: Number(completedTaskStats?.count || 0),
      openIncidents: Number(openIncidentStats?.count || 0),
      totalIncidents: Number(totalIncidentStats?.count || 0),
      recentActivityCount: Number(recentActivityStats?.count || 0),
    };
  }

  // Employee Incidents
  async getEmployeeIncidents(employeeId: number): Promise<EmployeeIncident[]> {
    return await db
      .select()
      .from(employeeIncidents)
      .where(eq(employeeIncidents.employeeId, employeeId))
      .orderBy(desc(employeeIncidents.createdAt));
  }

  async getEmployeeIncident(id: number): Promise<EmployeeIncident | undefined> {
    const [incident] = await db
      .select()
      .from(employeeIncidents)
      .where(eq(employeeIncidents.id, id));
    return incident || undefined;
  }

  async createEmployeeIncident(incident: InsertEmployeeIncident): Promise<EmployeeIncident> {
    const [newIncident] = await db
      .insert(employeeIncidents)
      .values(incident)
      .returning();
    return newIncident;
  }

  async updateEmployeeIncident(id: number, incident: Partial<InsertEmployeeIncident>): Promise<EmployeeIncident | undefined> {
    const [updated] = await db
      .update(employeeIncidents)
      .set({ ...incident, updatedAt: new Date() })
      .where(eq(employeeIncidents.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteEmployeeIncident(id: number): Promise<void> {
    await db.delete(employeeIncidents).where(eq(employeeIncidents.id, id));
  }

  // Activity Logs
  async getActivityLogs(options?: { userId?: string; limit?: number; offset?: number }): Promise<ActivityLog[]> {
    let query = db
      .select()
      .from(activityLog)
      .orderBy(desc(activityLog.createdAt));

    // Apply userId filter if provided
    if (options?.userId) {
      query = query.where(eq(activityLog.userId, options.userId)) as any;
    }

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit) as any;
    }
    if (options?.offset) {
      query = query.offset(options.offset) as any;
    }

    return await query;
  }

  async getActivityLogsByUserId(userId: string): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLog)
      .where(eq(activityLog.userId, userId))
      .orderBy(desc(activityLog.createdAt));
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db
      .insert(activityLog)
      .values(log)
      .returning();
    return newLog;
  }

  // Order Fulfillment Logs
  async getOrderFulfillmentLogsByUserId(userId: string, limit?: number): Promise<OrderFulfillmentLog[]> {
    let query = db
      .select()
      .from(orderFulfillmentLogs)
      .where(eq(orderFulfillmentLogs.userId, userId))
      .orderBy(desc(orderFulfillmentLogs.startedAt));

    if (limit) {
      query = query.limit(limit) as any;
    }

    return await query;
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
          biller: users,
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .leftJoin(users, eq(orders.billerId, users.id))
        .where(eq(orders.customerId, customerId.toString()))
        .orderBy(desc(orders.createdAt));

        return ordersData.map(row => ({
          ...row.order,
          customer: row.customer || undefined,
          biller: row.biller || undefined,
        })) as any;
      } else {
        const ordersData = await db.select({
          order: orders,
          customer: customers,
          biller: users,
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .leftJoin(users, eq(orders.billerId, users.id))
        .orderBy(desc(orders.createdAt));

        return ordersData.map(row => ({
          ...row.order,
          customer: row.customer || undefined,
          biller: row.biller || undefined,
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
        biller: users,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(users, eq(orders.billerId, users.id))
      .where(eq(orders.orderStatus, status))
      .orderBy(desc(orders.createdAt));

      return ordersData.map(row => ({
        ...row.order,
        customer: row.customer || undefined,
        biller: row.biller || undefined,
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
        biller: users,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(users, eq(orders.billerId, users.id))
      .where(eq(orders.paymentStatus, paymentStatus))
      .orderBy(desc(orders.createdAt));

      return ordersData.map(row => ({
        ...row.order,
        customer: row.customer || undefined,
        biller: row.biller || undefined,
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
        biller: users,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(users, eq(orders.billerId, users.id))
      .where(eq(orders.id, id));

      if (!result) return undefined;

      return {
        ...result.order,
        customer: result.customer || undefined,
        biller: result.biller || undefined,
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
      shippingAddress: customerShippingAddresses,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .leftJoin(customerShippingAddresses, eq(orders.shippingAddressId, customerShippingAddresses.id))
    .where(eq(orders.id, id));

    if (result) {
      const items = await this.getOrderItems(result.order.id);
      return { 
        ...result.order, 
        customer: result.customer || undefined,
        shippingAddress: result.shippingAddress || undefined,
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
      console.log('Storage.updateOrder - Received updates for order', id, ':', orderUpdates);
      
      // Build dynamic SET clause for raw SQL to avoid Drizzle enum type inference issues
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      // Map of field names to column names (only columns that exist in the database)
      const fieldToColumn: Record<string, string> = {
        customerId: 'customer_id',
        orderType: 'order_type',
        saleType: 'sale_type',
        currency: 'currency',
        priority: 'priority',
        orderStatus: 'order_status',
        paymentStatus: 'payment_status',
        shippingMethod: 'shipping_method',
        paymentMethod: 'payment_method',
        discountType: 'discount_type',
        discountValue: 'discount_value',
        discount: 'discount',
        taxRate: 'tax_rate',
        taxAmount: 'tax_amount',
        tax: 'tax',
        shippingCost: 'shipping_cost',
        actualShippingCost: 'actual_shipping_cost',
        adjustment: 'adjustment',
        codAmount: 'cod_amount',
        codCurrency: 'cod_currency',
        notes: 'notes',
        shippingAddressId: 'shipping_address_id',
        subtotal: 'subtotal',
        grandTotal: 'grand_total',
        totalCost: 'total_cost',
        selectedDocumentIds: 'selected_document_ids',
        trackingNumber: 'tracking_number',
        fulfillmentStage: 'fulfillment_stage',
        pickStatus: 'pick_status',
        packStatus: 'pack_status',
        pickedBy: 'picked_by',
        packedBy: 'packed_by',
        pickStartTime: 'pick_start_time',
        pickEndTime: 'pick_end_time',
        packStartTime: 'pack_start_time',
        packEndTime: 'pack_end_time',
        finalWeight: 'final_weight',
        cartonUsed: 'carton_used',
        modifiedAfterPacking: 'modified_after_packing',
        modificationNotes: 'modification_notes',
        previousPackStatus: 'previous_pack_status',
        pickingStartedAt: 'picking_started_at',
        packingStartedAt: 'packing_started_at',
        pplBatchId: 'ppl_batch_id',
        pplShipmentNumbers: 'ppl_shipment_numbers',
        pplLabelData: 'ppl_label_data',
        pplStatus: 'ppl_status',
        pplCancelledShipments: 'ppl_cancelled_shipments',
        includedDocuments: 'included_documents',
        allocated: 'allocated',
        attachmentUrl: 'attachment_url',
        billerId: 'biller_id',
      };
      
      for (const [field, column] of Object.entries(fieldToColumn)) {
        if (field in orderUpdates && orderUpdates[field] !== undefined) {
          // Handle array types (cast to text[])
          if (field === 'selectedDocumentIds' || field === 'pplShipmentNumbers' || field === 'pplCancelledShipments') {
            setClauses.push(`${column} = $${paramIndex}::text[]`);
          } else if (field === 'pplLabelData' || field === 'includedDocuments') {
            // Handle jsonb types - need to stringify if object
            setClauses.push(`${column} = $${paramIndex}::jsonb`);
            const val = orderUpdates[field];
            values.push(typeof val === 'object' ? JSON.stringify(val) : val);
            paramIndex++;
            continue;
          } else {
            setClauses.push(`${column} = $${paramIndex}`);
          }
          values.push(orderUpdates[field]);
          paramIndex++;
        }
      }
      
      // Always update updated_at
      setClauses.push(`updated_at = NOW()`);
      
      if (setClauses.length === 1) {
        // Only updated_at, nothing to update
        const result = await db.select().from(orders).where(eq(orders.id, id));
        return result[0] || undefined;
      }
      
      values.push(id);
      const query = `UPDATE orders SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      console.log('Storage.updateOrder - Raw SQL query:', query);
      console.log('Storage.updateOrder - Values:', values);
      
      // Use raw pool query to completely bypass Drizzle ORM type inference
      const { pool } = await import('./db.js');
      const result = await pool.query(query, values);
      const rows = result.rows;
      console.log('Storage.updateOrder - Result rowCount:', result.rowCount);
      
      // Map snake_case back to camelCase for the return value
      if (rows && rows.length > 0) {
        const row = rows[0];
        return {
          id: row.id,
          orderId: row.order_id,
          customerId: row.customer_id,
          shippingAddressId: row.shipping_address_id,
          billerId: row.biller_id,
          currency: row.currency,
          orderStatus: row.order_status,
          paymentStatus: row.payment_status,
          priority: row.priority,
          subtotal: row.subtotal,
          discountType: row.discount_type,
          discountValue: row.discount_value,
          discount: row.discount,
          taxRate: row.tax_rate,
          taxAmount: row.tax_amount,
          tax: row.tax,
          totalCost: row.total_cost,
          shippingMethod: row.shipping_method,
          paymentMethod: row.payment_method,
          shippingCost: row.shipping_cost,
          actualShippingCost: row.actual_shipping_cost,
          adjustment: row.adjustment,
          grandTotal: row.grand_total,
          notes: row.notes,
          attachmentUrl: row.attachment_url,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          shippedAt: row.shipped_at,
          pickStatus: row.pick_status,
          packStatus: row.pack_status,
          pickedBy: row.picked_by,
          packedBy: row.packed_by,
          pickStartTime: row.pick_start_time,
          pickEndTime: row.pick_end_time,
          packStartTime: row.pack_start_time,
          packEndTime: row.pack_end_time,
          finalWeight: row.final_weight,
          cartonUsed: row.carton_used,
          modifiedAfterPacking: row.modified_after_packing,
          modificationNotes: row.modification_notes,
          lastModifiedAt: row.last_modified_at,
          previousPackStatus: row.previous_pack_status,
          selectedDocumentIds: row.selected_document_ids,
          trackingNumber: row.tracking_number,
          orderType: row.order_type,
          saleType: row.sale_type,
          includedDocuments: row.included_documents,
          fulfillmentStage: row.fulfillment_stage,
          pickingStartedAt: row.picking_started_at,
          packingStartedAt: row.packing_started_at,
          pplBatchId: row.ppl_batch_id,
          pplShipmentNumbers: row.ppl_shipment_numbers,
          pplLabelData: row.ppl_label_data,
          pplStatus: row.ppl_status,
          codAmount: row.cod_amount,
          codCurrency: row.cod_currency,
          allocated: row.allocated,
        } as Order;
      }
      return undefined;
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
        biller: users,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .leftJoin(users, eq(orders.billerId, users.id))
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt));

      return ordersData.map(row => ({
        ...row.order,
        customer: row.customer || undefined,
        biller: row.biller || undefined,
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
          shippingAddress: customerShippingAddresses,
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .leftJoin(customerShippingAddresses, eq(orders.shippingAddressId, customerShippingAddresses.id));

      // Always get all orders in the pick/pack workflow
      // Status mapping happens in getPickPackStatus for both new and old orders
      query = query.where(
        or(
          eq(orders.orderStatus, 'to_fulfill'),
          eq(orders.orderStatus, 'ready_to_ship')
        )
      ) as any;

      const results = await query.orderBy(desc(orders.createdAt));

      // Map results to include customer name, shipping address, and format status for frontend
      return results.map((row: any) => ({
        ...row.order,
        customerName: row.customer?.name || 'Unknown Customer',
        // Use joined address object if available, otherwise fall back to legacy string address
        // Always ensure shippingAddress is defined (never undefined) to prevent runtime errors
        shippingAddress: row.shippingAddress ?? row.order.shippingAddress ?? null,
        // Map database status to frontend status based on pick/pack status
        status: this.getPickPackStatus(row.order),
        // Explicitly include payment and dobírka fields for COD orders
        paymentMethod: row.order.paymentMethod,
        codAmount: row.order.codAmount,
        codCurrency: row.order.codCurrency,
      }));
    } catch (error) {
      console.error('Error fetching pick/pack orders:', error);
      return [];
    }
  }

  // Helper method to determine the pick/pack status for display
  private getPickPackStatus(order: any): string {
    // If fulfillmentStage is set (new Option 1 architecture), use it
    if (order.fulfillmentStage) {
      if (order.fulfillmentStage === 'picking') return 'picking';
      if (order.fulfillmentStage === 'packing') return 'packing';
      if (order.fulfillmentStage === 'ready') return 'ready_to_ship';
    }

    // Backward compatibility: fall back to old pick/pack status logic
    // For orders that haven't been updated to use fulfillmentStage yet
    if (order.packStatus === 'completed' && order.pickStatus === 'completed') {
      return 'ready_to_ship';
    }
    if (order.packStatus === 'in_progress' || order.orderStatus === 'packing') {
      return 'packing';
    }
    if (order.pickStatus === 'in_progress' || order.orderStatus === 'picking') {
      return 'picking';
    }

    // Default: pending/not started
    return 'to_fulfill';
  }

  async startPickingOrder(id: string, employeeId: string): Promise<Order | undefined> {
    try {
      // Get order items to count
      const items = await this.getOrderItems(id);
      const itemCount = items.length;
      const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

      const [updated] = await db
        .update(orders)
        .set({
          fulfillmentStage: 'picking',
          pickingStartedAt: new Date(),
          pickStatus: 'in_progress',
          pickStartTime: new Date(),
          pickedBy: employeeId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(orders.id, id),
            eq(orders.orderStatus, 'to_fulfill'),
            // Only allow starting picking when not yet started (guard against re-entry)
            or(
              isNull(orders.fulfillmentStage),
              eq(orders.fulfillmentStage, '')
            ),
            or(
              eq(orders.pickStatus, 'not_started'),
              isNull(orders.pickStatus)
            )
          )
        )
        .returning();

      // Log performance tracking
      if (updated) {
        await this.logFulfillmentStart(id, employeeId, 'pick', itemCount, totalQuantity);
      }

      return updated;
    } catch (error) {
      console.error('Error starting picking order:', error);
      return undefined;
    }
  }

  async completePickingOrder(id: string): Promise<Order | undefined> {
    try {
      const [updated] = await db
        .update(orders)
        .set({
          fulfillmentStage: 'packing',
          pickStatus: 'completed',
          pickEndTime: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(orders.id, id),
            eq(orders.fulfillmentStage, 'picking'),
            eq(orders.pickStatus, 'in_progress')
          )
        )
        .returning();

      // Log performance tracking completion
      if (updated && updated.pickedBy) {
        await this.logFulfillmentComplete(id, updated.pickedBy, 'pick');
      }

      return updated;
    } catch (error) {
      console.error('Error completing picking order:', error);
      return undefined;
    }
  }

  async startPackingOrder(id: string, employeeId: string): Promise<Order | undefined> {
    try {
      // Get order items to count
      const items = await this.getOrderItems(id);
      const itemCount = items.length;
      const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

      const [updated] = await db
        .update(orders)
        .set({
          packingStartedAt: new Date(),
          packStatus: 'in_progress',
          packStartTime: new Date(),
          packedBy: employeeId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(orders.id, id),
            eq(orders.orderStatus, 'to_fulfill'),
            // Must be in packing stage (picking completed)
            eq(orders.fulfillmentStage, 'packing'),
            or(
              eq(orders.packStatus, 'not_started'),
              isNull(orders.packStatus)
            ),
            // Allow packing to start when picking is in_progress or completed
            or(
              eq(orders.pickStatus, 'in_progress'),
              eq(orders.pickStatus, 'completed')
            )
          )
        )
        .returning();

      // Log performance tracking
      if (updated) {
        await this.logFulfillmentStart(id, employeeId, 'pack', itemCount, totalQuantity);
      }

      return updated;
    } catch (error) {
      console.error('Error starting packing order:', error);
      return undefined;
    }
  }

  async completePackingOrder(id: string, packingDetails: any[]): Promise<Order | undefined> {
    try {
      const [updated] = await db
        .update(orders)
        .set({
          fulfillmentStage: 'ready',
          orderStatus: 'ready_to_ship', // Advance main status for shipping flow compatibility
          packStatus: 'completed',
          packEndTime: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(orders.id, id),
            eq(orders.orderStatus, 'to_fulfill'),
            eq(orders.fulfillmentStage, 'packing'),
            eq(orders.packStatus, 'in_progress'),
            // Can only complete packing when picking is also completed
            eq(orders.pickStatus, 'completed')
          )
        )
        .returning();

      // Log performance tracking completion
      if (updated && updated.packedBy) {
        await this.logFulfillmentComplete(id, updated.packedBy, 'pack');
      }

      return updated;
    } catch (error) {
      console.error('Error completing packing order:', error);
      return undefined;
    }
  }

  // Order Items
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    try {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      
      // DEBUG: Log what's coming from database
      console.log(`[getOrderItems] Raw items from DB for order ${orderId}:`, items.map(i => ({ 
        id: i.id?.slice(-6), 
        productName: i.productName, 
        bulkUnitQty: i.bulkUnitQty, 
        bulkUnitName: i.bulkUnitName 
      })));
      
      // Enrich items with bulkUnitQty/bulkUnitName from products - ALWAYS check product table
      const enrichedItems = await Promise.all(items.map(async (item) => {
        if (item.productId) {
          try {
            const [product] = await db.select({
              bulkUnitQty: products.bulkUnitQty,
              bulkUnitName: products.bulkUnitName,
              imageUrl: products.imageUrl
            }).from(products).where(eq(products.id, item.productId)).limit(1);
            
            if (product) {
              return {
                ...item,
                bulkUnitQty: product.bulkUnitQty || item.bulkUnitQty,
                bulkUnitName: product.bulkUnitName || item.bulkUnitName,
                image: item.image || product.imageUrl
              };
            }
          } catch (e) {
            console.error(`[getOrderItems] Error enriching item ${item.id}:`, e);
          }
        }
        return item;
      }));
      
      return enrichedItems;
    } catch (error: any) {
      console.error(`[getOrderItems] Error fetching items for order ${orderId}:`, error?.message || error);
      throw error;
    }
  }

  async getAllOrderItems(): Promise<OrderItem[]> {
    return await db.select().from(orderItems);
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
  async getProducts(includeInactive: boolean = false): Promise<Product[]> {
    try {
      let query = db.select({
        product: products,
        supplier: suppliers,
      })
      .from(products)
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id));
      
      // Filter by active status if needed
      const productsData = includeInactive 
        ? await query.orderBy(desc(products.createdAt))
        : await query.where(eq(products.isActive, true)).orderBy(desc(products.createdAt));

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
            const [cat] = await db
              .select()
              .from(categories)
              .where(eq(categories.id, row.product.categoryId))
              .limit(1);
            category = cat;
          }

          return {
            ...row.product,
            image: row.product.imageUrl, // Map imageUrl to image for frontend compatibility
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
        image: productData.product.imageUrl, // Map imageUrl to image for frontend compatibility
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
        image: productData.product.imageUrl, // Map imageUrl to image for frontend compatibility
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
      // Get all active products and filter based on alert type
      const allProducts = await db
        .select()
        .from(products)
        .where(eq(products.isActive, true))
        .orderBy(products.quantity);
      
      // Filter products based on their low stock alert type
      const lowStockProducts = allProducts.filter(p => {
        const quantity = p.quantity || 0;
        const alertType = p.lowStockAlertType || 'percentage';
        const alertValue = p.lowStockAlert || 45;
        
        if (alertType === 'percentage') {
          // Calculate threshold based on percentage of max stock level
          const maxStock = p.maxStockLevel || 100; // Default to 100 if not set
          const threshold = Math.ceil((maxStock * alertValue) / 100);
          return quantity <= threshold;
        } else {
          // Amount-based: use the alert value directly
          return quantity <= alertValue;
        }
      });
      
      return lowStockProducts;
    } catch (error) {
      console.error('Error fetching low stock products:', error);
      return [];
    }
  }

  async calculateProductReorderRate(productId: string): Promise<number> {
    try {
      // Use SQL with CTE to calculate reorder rate
      const result = await db.execute(sql`
        WITH customer_first_orders AS (
          SELECT DISTINCT
            o.customer_id,
            MIN(o.created_at) as first_order_date
          FROM orders o
          INNER JOIN order_items oi ON o.id = oi.order_id
          WHERE oi.product_id = ${productId}
            AND o.order_status IN ('completed', 'shipped', 'delivered')
            AND o.customer_id IS NOT NULL
          GROUP BY o.customer_id
        ),
        customer_reorders AS (
          SELECT DISTINCT
            cfo.customer_id,
            CASE 
              WHEN EXISTS (
                SELECT 1
                FROM orders o2
                INNER JOIN order_items oi2 ON o2.id = oi2.order_id
                WHERE o2.customer_id = cfo.customer_id
                  AND oi2.product_id = ${productId}
                  AND o2.order_status IN ('completed', 'shipped', 'delivered')
                  AND o2.created_at > cfo.first_order_date
                  AND o2.created_at <= cfo.first_order_date + INTERVAL '365 days'
              ) THEN 1
              ELSE 0
            END as reordered
          FROM customer_first_orders cfo
        )
        SELECT 
          COUNT(*) as total_customers,
          SUM(reordered) as customers_who_reordered
        FROM customer_reorders
      `);

      const row = result.rows[0] as any;
      const totalCustomers = parseInt(row.total_customers) || 0;
      const customersWhoReordered = parseInt(row.customers_who_reordered) || 0;

      // Only calculate if there are at least 5 customers
      if (totalCustomers < 5) {
        return -1; // Indicate insufficient data
      }

      const rate = (customersWhoReordered / totalCustomers) * 100;
      return parseFloat(rate.toFixed(2));
    } catch (error) {
      console.error('Error calculating reorder rate:', error);
      return -1;
    }
  }

  async updateProductReorderRate(productId: string, rate: number): Promise<void> {
    try {
      await db
        .update(products)
        .set({ 
          reorderRate: rate >= 0 ? rate.toString() : null,
          updatedAt: new Date()
        })
        .where(eq(products.id, productId));
    } catch (error) {
      console.error('Error updating reorder rate:', error);
      throw error;
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

  async getProductVariant(id: string): Promise<ProductVariant | undefined> {
    try {
      const [variant] = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, id))
        .limit(1);
      return variant;
    } catch (error) {
      console.error('Error fetching product variant:', error);
      return undefined;
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

  // AI Location Suggestions
  async getAiLocationSuggestionByProduct(productId: string): Promise<AiLocationSuggestion | undefined> {
    try {
      const [suggestion] = await db
        .select()
        .from(aiLocationSuggestions)
        .where(eq(aiLocationSuggestions.productId, productId))
        .limit(1);
      return suggestion;
    } catch (error) {
      console.error('Error getting AI location suggestion by product:', error);
      return undefined;
    }
  }

  async getAiLocationSuggestionByCustomItem(customItemId: number): Promise<AiLocationSuggestion | undefined> {
    try {
      const [suggestion] = await db
        .select()
        .from(aiLocationSuggestions)
        .where(eq(aiLocationSuggestions.customItemId, customItemId))
        .limit(1);
      return suggestion;
    } catch (error) {
      console.error('Error getting AI location suggestion by custom item:', error);
      return undefined;
    }
  }

  async createAiLocationSuggestion(suggestion: InsertAiLocationSuggestion): Promise<AiLocationSuggestion> {
    try {
      const [newSuggestion] = await db
        .insert(aiLocationSuggestions)
        .values(suggestion)
        .returning();
      return newSuggestion;
    } catch (error) {
      console.error('Error creating AI location suggestion:', error);
      throw error;
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

  // Order Files
  async getOrderFiles(orderId: string): Promise<OrderFile[]> {
    try {
      const files = await db
        .select()
        .from(orderFiles)
        .where(eq(orderFiles.orderId, orderId))
        .orderBy(orderFiles.uploadedAt);
      return files;
    } catch (error) {
      console.error('Error fetching order files:', error);
      return [];
    }
  }

  async getOrderFile(id: string): Promise<OrderFile | undefined> {
    try {
      const [file] = await db
        .select()
        .from(orderFiles)
        .where(eq(orderFiles.id, id));
      return file || undefined;
    } catch (error) {
      console.error('Error fetching order file:', error);
      return undefined;
    }
  }

  async createOrderFile(file: InsertOrderFile): Promise<OrderFile> {
    try {
      const [newFile] = await db
        .insert(orderFiles)
        .values(file)
        .returning();
      return newFile;
    } catch (error) {
      console.error('Error creating order file:', error);
      throw error;
    }
  }

  async deleteOrderFile(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(orderFiles)
        .where(eq(orderFiles.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting order file:', error);
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

  // Stock Adjustment Requests
  async getStockAdjustmentRequests(): Promise<StockAdjustmentRequest[]> {
    try {
      const requests = await db
        .select()
        .from(stockAdjustmentRequests)
        .orderBy(desc(stockAdjustmentRequests.createdAt));
      return requests;
    } catch (error) {
      console.error('Error fetching stock adjustment requests:', error);
      return [];
    }
  }

  async getStockAdjustmentRequest(id: string): Promise<StockAdjustmentRequest | undefined> {
    try {
      const [request] = await db
        .select()
        .from(stockAdjustmentRequests)
        .where(eq(stockAdjustmentRequests.id, id));
      return request;
    } catch (error) {
      console.error('Error fetching stock adjustment request:', error);
      return undefined;
    }
  }

  async createStockAdjustmentRequest(request: InsertStockAdjustmentRequest): Promise<StockAdjustmentRequest> {
    try {
      const [newRequest] = await db
        .insert(stockAdjustmentRequests)
        .values(request)
        .returning();
      return newRequest;
    } catch (error) {
      console.error('Error creating stock adjustment request:', error);
      throw error;
    }
  }

  async approveStockAdjustmentRequest(id: string, approvedBy: string): Promise<StockAdjustmentRequest | undefined> {
    try {
      return await db.transaction(async (tx) => {
        // Get the request
        const [request] = await tx
          .select()
          .from(stockAdjustmentRequests)
          .where(eq(stockAdjustmentRequests.id, id));

        if (!request) {
          throw new Error('Request not found');
        }

        if (request.status !== 'pending') {
          throw new Error('Request has already been processed');
        }

        // Get the location
        const [location] = await tx
          .select()
          .from(productLocations)
          .where(eq(productLocations.id, request.locationId));

        if (!location) {
          throw new Error('Location not found');
        }

        // Apply the adjustment based on type
        let newQuantity = location.quantity;
        if (request.adjustmentType === 'set') {
          newQuantity = request.requestedQuantity;
        } else if (request.adjustmentType === 'add') {
          newQuantity = location.quantity + request.requestedQuantity;
        } else if (request.adjustmentType === 'remove') {
          newQuantity = location.quantity - request.requestedQuantity;
          if (newQuantity < 0) {
            throw new Error('Adjustment would result in negative quantity');
          }
        }

        // Update the location quantity
        await tx
          .update(productLocations)
          .set({ 
            quantity: newQuantity,
            updatedAt: new Date() 
          })
          .where(eq(productLocations.id, request.locationId));

        // Create stock adjustment history record for reports
        await tx
          .insert(stockAdjustmentHistory)
          .values({
            productId: request.productId,
            locationId: request.locationId,
            adjustmentType: request.adjustmentType,
            previousQuantity: location.quantity,
            adjustedQuantity: request.requestedQuantity,
            newQuantity,
            reason: request.reason,
            source: 'approved_request',
            referenceId: request.id,
            adjustedBy: approvedBy,
          });

        // Mark request as approved
        const [updatedRequest] = await tx
          .update(stockAdjustmentRequests)
          .set({ 
            status: 'approved',
            approvedBy,
            approvedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(stockAdjustmentRequests.id, id))
          .returning();

        return updatedRequest;
      });
    } catch (error) {
      console.error('Error approving stock adjustment request:', error);
      return undefined;
    }
  }

  async rejectStockAdjustmentRequest(id: string, approvedBy: string, reason: string): Promise<StockAdjustmentRequest | undefined> {
    try {
      const [request] = await db
        .select()
        .from(stockAdjustmentRequests)
        .where(eq(stockAdjustmentRequests.id, id));

      if (!request) {
        throw new Error('Request not found');
      }

      if (request.status !== 'pending') {
        throw new Error('Request has already been processed');
      }

      const [updatedRequest] = await db
        .update(stockAdjustmentRequests)
        .set({ 
          status: 'rejected',
          approvedBy,
          approvedAt: new Date(),
          rejectionReason: reason,
          updatedAt: new Date()
        })
        .where(eq(stockAdjustmentRequests.id, id))
        .returning();

      return updatedRequest;
    } catch (error) {
      console.error('Error rejecting stock adjustment request:', error);
      return undefined;
    }
  }

  // Stock Adjustment History Implementation
  async getStockAdjustmentHistory(options?: { 
    productId?: string; 
    startDate?: Date; 
    endDate?: Date; 
    limit?: number; 
    offset?: number 
  }): Promise<StockAdjustmentHistory[]> {
    try {
      const conditions = [];
      
      if (options?.productId) {
        conditions.push(eq(stockAdjustmentHistory.productId, options.productId));
      }
      if (options?.startDate) {
        conditions.push(gte(stockAdjustmentHistory.createdAt, options.startDate));
      }
      if (options?.endDate) {
        conditions.push(lte(stockAdjustmentHistory.createdAt, options.endDate));
      }

      let query = db
        .select()
        .from(stockAdjustmentHistory)
        .orderBy(desc(stockAdjustmentHistory.createdAt));

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      if (options?.limit) {
        query = query.limit(options.limit) as typeof query;
      }
      if (options?.offset) {
        query = query.offset(options.offset) as typeof query;
      }

      const results = await query;
      return results;
    } catch (error) {
      console.error('Error fetching stock adjustment history:', error);
      return [];
    }
  }

  async getStockAdjustmentHistoryCount(options?: { 
    productId?: string; 
    startDate?: Date; 
    endDate?: Date 
  }): Promise<number> {
    try {
      const conditions = [];
      
      if (options?.productId) {
        conditions.push(eq(stockAdjustmentHistory.productId, options.productId));
      }
      if (options?.startDate) {
        conditions.push(gte(stockAdjustmentHistory.createdAt, options.startDate));
      }
      if (options?.endDate) {
        conditions.push(lte(stockAdjustmentHistory.createdAt, options.endDate));
      }

      let query = db
        .select({ count: sql<number>`count(*)::int` })
        .from(stockAdjustmentHistory);

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      const [result] = await query;
      return result?.count || 0;
    } catch (error) {
      console.error('Error counting stock adjustment history:', error);
      return 0;
    }
  }

  async createStockAdjustmentHistory(history: InsertStockAdjustmentHistory): Promise<StockAdjustmentHistory> {
    try {
      const [newHistory] = await db
        .insert(stockAdjustmentHistory)
        .values(history)
        .returning();
      return newHistory;
    } catch (error) {
      console.error('Error creating stock adjustment history:', error);
      throw error;
    }
  }

  async getOverAllocatedItems(): Promise<any[]> {
    try {
      // Use SQL aggregation to calculate ordered quantities per product/variant
      // Only count orders that are active (pending, to_fulfill, ready_to_ship)
      // Exclude shipped and cancelled orders as stock is already allocated or order is void
      const orderedQuantities = await db
        .select({
          productId: orderItems.productId,
          variantId: orderItems.variantId,
          totalOrdered: sql<number>`SUM(${orderItems.quantity})::integer`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orders.id, orderItems.orderId))
        .where(
          and(
            inArray(orders.orderStatus, ['pending', 'to_fulfill', 'ready_to_ship']),
            sql`${orderItems.productId} IS NOT NULL`
          )
        )
        .groupBy(orderItems.productId, orderItems.variantId);

      if (orderedQuantities.length === 0) {
        return [];
      }

      // Get unique product and variant IDs (filter out nulls)
      const productIds = Array.from(new Set(
        orderedQuantities
          .map(oq => oq.productId)
          .filter((id): id is string => id !== null)
      ));
      const variantIds = orderedQuantities
        .filter(oq => oq.variantId !== null)
        .map(oq => oq.variantId as string);

      // Fetch only the needed products and variants in bulk
      const allProducts = await db
        .select()
        .from(products)
        .where(inArray(products.id, productIds));

      const allVariants = variantIds.length > 0
        ? await db
            .select()
            .from(productVariants)
            .where(inArray(productVariants.id, variantIds))
        : [];

      const overAllocated: any[] = [];

      // Check each aggregated result against stock
      for (const ordered of orderedQuantities) {
        if (ordered.variantId) {
          // Check variant stock - use variant's own quantity field
          const variant = allVariants.find(v => v.id === ordered.variantId);

          if (variant && ordered.totalOrdered > (variant.quantity || 0)) {
            const product = allProducts.find(p => p.id === ordered.productId);

            overAllocated.push({
              type: 'variant',
              productId: ordered.productId,
              productName: product?.name || 'Unknown',
              productSku: product?.sku,
              variantId: variant.id,
              variantName: variant.name,
              variantBarcode: variant.barcode,
              availableStock: variant.quantity || 0,
              orderedQuantity: ordered.totalOrdered,
              shortfall: ordered.totalOrdered - (variant.quantity || 0),
              imageUrl: variant.imageUrl || product?.imageUrl
            });
          }
        } else {
          // Check product stock - use product's own quantity field
          const product = allProducts.find(p => p.id === ordered.productId);

          if (product && ordered.totalOrdered > (product.quantity || 0)) {
            overAllocated.push({
              type: 'product',
              productId: product.id,
              productName: product.name,
              productSku: product.sku,
              variantId: null,
              variantName: null,
              variantBarcode: null,
              availableStock: product.quantity || 0,
              orderedQuantity: ordered.totalOrdered,
              shortfall: ordered.totalOrdered - (product.quantity || 0),
              imageUrl: product.imageUrl
            });
          }
        }
      }

      return overAllocated;
    } catch (error) {
      console.error('Error fetching over-allocated items:', error);
      return [];
    }
  }

  async getUnderAllocatedItems(): Promise<any[]> {
    try {
      // Use SQL aggregation to calculate stock location totals per product
      const locationTotalsResult = await db.execute(sql`
        SELECT 
          product_id as "productId",
          COALESCE(SUM(quantity), 0)::integer as "totalQuantity"
        FROM product_locations
        GROUP BY product_id
      `);

      const locationTotals = locationTotalsResult.rows as Array<{
        productId: string;
        totalQuantity: number;
      }>;

      // Get all products to check against
      const allProducts = await db.select().from(products);

      const underAllocated: any[] = [];

      // Check each product
      for (const product of allProducts) {
        const productQty = product.quantity || 0;

        // Find location total for this product
        const locationTotal = locationTotals.find(lt => lt.productId === product.id);
        const locationQuantity = locationTotal?.totalQuantity || 0;

        // Under-allocated if product.quantity > sum of location quantities
        if (productQty > locationQuantity) {
          underAllocated.push({
            type: 'product',
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            variantId: null,
            variantName: null,
            variantBarcode: null,
            recordedQuantity: productQty,
            locationQuantity: locationQuantity,
            discrepancy: productQty - locationQuantity,
            imageUrl: product.imageUrl
          });
        }
      }

      return underAllocated;
    } catch (error) {
      console.error('Error fetching under-allocated items:', error);
      return [];
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

  async searchCustomers(query: string): Promise<Customer[]> {
    try {
      // Vietnamese diacritics normalization function
      const normalizeVietnamese = (str: string): string => {
        const vietnameseMap: Record<string, string> = {
          'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
          'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
          'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
          'đ': 'd',
          'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
          'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
          'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
          'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
          'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
          'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
          'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
          'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
          'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
          'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
          'Ă': 'A', 'Ằ': 'A', 'Ắ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
          'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
          'Đ': 'D',
          'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
          'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
          'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
          'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
          'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
          'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
          'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
          'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
          'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y'
        };
        return str.replace(/[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬĐÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ]/g, (char) => vietnameseMap[char] || char);
      };

      const normalizedQuery = normalizeVietnamese(query.toLowerCase().trim());

      // Fuzzy search scoring function
      const calculateScore = (text: string, query: string): number => {
        const normalizedText = normalizeVietnamese(text.toLowerCase());
        let score = 0;

        // Exact match (highest priority)
        if (normalizedText === query) score += 100;

        // Starts with query
        if (normalizedText.startsWith(query)) score += 50;

        // Contains query
        if (normalizedText.includes(query)) score += 25;

        // Word boundary match (any word starts with query)
        const words = normalizedText.split(/\s+/);
        if (words.some(word => word.startsWith(query))) score += 35;

        // Multi-word bonus (all query words found)
        const queryWords = query.split(/\s+/);
        if (queryWords.length > 1 && queryWords.every(qw => normalizedText.includes(qw))) {
          score += 20;
        }

        return score;
      };

      const allCustomers = await this.getCustomers();

      const scoredCustomers = allCustomers
        .map(customer => {
          const nameScore = calculateScore(customer.name || '', normalizedQuery);
          const emailScore = calculateScore(customer.email || '', normalizedQuery);
          const companyScore = calculateScore(customer.company || '', normalizedQuery);
          const maxScore = Math.max(nameScore, emailScore, companyScore);

          return {
            customer,
            score: maxScore
          };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score);

      return scoredCustomers.map(({ customer }) => customer);
    } catch (error) {
      console.error('Error searching customers:', error);
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

  // Customer Badges
  async getCustomerBadges(customerId: string): Promise<CustomerBadge[]> {
    return await this.db
      .select()
      .from(customerBadges)
      .where(eq(customerBadges.customerId, customerId));
  }

  async refreshCustomerBadges(customerId: string): Promise<void> {
    await badgeService.refreshCustomerBadges(customerId, this.db);
  }

  async refreshOrderBadges(orderId: string): Promise<void> {
    await badgeService.refreshOrderBadges(orderId, this.db);
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
      const [result] = await db.select().from(discounts).where(eq(discounts.id, id));
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
        .where(eq(discounts.id, id))
        .returning();
      return result as Discount | undefined;
    } catch (error) {
      console.error('Error updating discount:', error);
      return undefined;
    }
  }

  async deleteDiscount(id: string): Promise<boolean> {
    try {
      const result = await db.delete(discounts).where(eq(discounts.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting discount:', error);
      return false;
    }
  }

  async syncExpiredDiscountStatuses(): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const result = await db
        .update(discounts)
        .set({ status: 'finished', updatedAt: new Date() })
        .where(
          and(
            eq(discounts.status, 'active'),
            lt(discounts.endDate, today.toISOString().split('T')[0])
          )
        )
        .returning();
      
      if (result.length > 0) {
        console.log(`[Discount Sync] Updated ${result.length} expired discounts to 'finished' status`);
      }
      
      return result.length;
    } catch (error) {
      console.error('Error syncing expired discount statuses:', error);
      return 0;
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
      const [result] = await db.insert(warehouses).values({
        id: warehouse.id || `WH-${Date.now()}`,
        name: warehouse.name,
        location: warehouse.location,
        address: warehouse.address,
        city: warehouse.city,
        country: warehouse.country,
        zipCode: warehouse.zipCode || warehouse.zip_code,
        phone: warehouse.phone,
        email: warehouse.email,
        manager: warehouse.manager,
        capacity: warehouse.capacity,
        type: warehouse.type,
        status: warehouse.status || 'active',
        floorArea: warehouse.floorArea || warehouse.floor_area,
        notes: warehouse.notes,
        contact: warehouse.contact,
        rentedFromDate: warehouse.rentedFromDate || warehouse.rented_from_date,
        expenseId: warehouse.expenseId || warehouse.expense_id,
      }).returning();
      return result;
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
      if (warehouse.totalAisles !== undefined) updateData.totalAisles = warehouse.totalAisles;
      if (warehouse.maxRacks !== undefined) updateData.maxRacks = warehouse.maxRacks;
      if (warehouse.maxLevels !== undefined) updateData.maxLevels = warehouse.maxLevels;
      if (warehouse.maxBins !== undefined) updateData.maxBins = warehouse.maxBins;
      if (warehouse.aisleConfigs !== undefined) updateData.aisleConfigs = warehouse.aisleConfigs;
      if (warehouse.zones !== undefined) updateData.zones = warehouse.zones;

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

  async getSupplierFiles(supplierId: string): Promise<SupplierFile[]> {
    try {
      const files = await db
        .select()
        .from(supplierFiles)
        .where(eq(supplierFiles.supplierId, supplierId));
      return files;
    } catch (error) {
      console.error('Error fetching supplier files:', error);
      return [];
    }
  }

  async createSupplierFile(fileData: InsertSupplierFile): Promise<SupplierFile> {
    try {
      const fileId = `SF-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const [file] = await db
        .insert(supplierFiles)
        .values({ ...fileData, id: fileId })
        .returning();
      return file;
    } catch (error) {
      console.error('Error creating supplier file:', error);
      throw error;
    }
  }

  async deleteSupplierFile(fileId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(supplierFiles)
        .where(eq(supplierFiles.id, fileId));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting supplier file:', error);
      return false;
    }
  }

  async getAddress(addressId: string): Promise<CustomerShippingAddress | undefined> {
    try {
      const [address] = await db
        .select()
        .from(customerShippingAddresses)
        .where(eq(customerShippingAddresses.id, addressId));
      return address || undefined;
    } catch (error) {
      console.error('Error fetching address:', error);
      return undefined;
    }
  }

  async searchProducts(query: string, includeInactive: boolean = false): Promise<Product[]> {
    try {
      const normalizedQuery = normalizeSearchQuery(query);
      const conditions = [
        sql`${normalizeSQLColumn(products.name)} LIKE ${`%${normalizedQuery}%`}`,
        sql`${normalizeSQLColumn(products.vietnameseName)} LIKE ${`%${normalizedQuery}%`}`,
        sql`${normalizeSQLColumn(products.sku)} LIKE ${`%${normalizedQuery}%`}`,
        sql`${normalizeSQLColumn(products.barcode)} LIKE ${`%${normalizedQuery}%`}`
      ];

      // Join with suppliers table and apply filters
      let productsData;
      if (!includeInactive) {
        productsData = await db
          .select({
            product: products,
            supplier: suppliers,
          })
          .from(products)
          .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
          .where(and(eq(products.isActive, true), or(...conditions)))
          .orderBy(products.name);
      } else {
        productsData = await db
          .select({
            product: products,
            supplier: suppliers,
          })
          .from(products)
          .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
          .where(or(...conditions))
          .orderBy(products.name);
      }

      // Include primary location, supplier, and category for each product (matching getProducts)
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
            const [cat] = await db
              .select()
              .from(categories)
              .where(eq(categories.id, row.product.categoryId))
              .limit(1);
            category = cat;
          }

          return {
            ...row.product,
            image: row.product.imageUrl,
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
      console.error('Error searching products:', error);
      return [];
    }
  }

  async getProductsOrderCounts(productIds: string[]): Promise<{productId: string, count: number}[]> {
    try {
      if (productIds.length === 0) {
        return [];
      }

      const result = await db
        .select({
          productId: orderItems.productId,
          count: sql<number>`COUNT(DISTINCT ${orderItems.orderId})`.as('count')
        })
        .from(orderItems)
        .where(inArray(orderItems.productId, productIds))
        .groupBy(orderItems.productId);

      return result.map(r => ({
        productId: r.productId || '',
        count: Number(r.count) || 0
      }));
    } catch (error) {
      console.error('Error getting product order counts:', error);
      return [];
    }
  }

  async getReturns(): Promise<Return[]> {
    // Returns empty array - no mock data, use real database data when implemented
    return [];
  }
  async getReturn(id: string): Promise<Return | undefined> { 
    const returns = await this.getReturns();
    return returns.find(r => r.id === id);
  }

  async createReturn(returnData: any): Promise<Return> { return { id: Date.now().toString(), ...returnData }; }

  async updateReturn(id: string, returnData: any): Promise<Return | undefined> { 
    // For now, return mock updated data since we don't have DB persistence
    const existingReturn = await this.getReturn(id);
    if (!existingReturn) return undefined;
    return { ...existingReturn, ...returnData, updatedAt: new Date() };
  }

  async deleteReturn(id: string): Promise<boolean> { return true; }

  async getReturnItems(returnId: string): Promise<ReturnItem[]> { 
    // Returns empty array - no mock data, use real database data when implemented
    return [];
  }

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

  async getCustomerPendingServices(customerId: string): Promise<Service[]> {
    const result = await db
      .select({
        id: services.id,
        customerId: services.customerId,
        orderId: services.orderId,
        name: services.name,
        description: services.description,
        serviceDate: services.serviceDate,
        serviceCost: services.serviceCost,
        partsCost: services.partsCost,
        totalCost: services.totalCost,
        currency: services.currency,
        status: services.status,
        notes: services.notes,
        createdAt: services.createdAt,
        updatedAt: services.updatedAt,
        customer: customers
      })
      .from(services)
      .leftJoin(customers, eq(services.customerId, customers.id))
      .where(
        and(
          eq(services.customerId, customerId),
          eq(services.status, 'pending'),
          isNull(services.orderId)
        )
      )
      .orderBy(desc(services.createdAt));

    return result.map(row => ({
      ...row,
      customer: row.customer || undefined
    }));
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
        reminderEnabled: preOrders.reminderEnabled,
        reminderChannel: preOrders.reminderChannel,
        reminderPhone: preOrders.reminderPhone,
        reminderEmail: preOrders.reminderEmail,
        priority: preOrders.priority,
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
        reminderEnabled: preOrders.reminderEnabled,
        reminderChannel: preOrders.reminderChannel,
        reminderDaysBefore: preOrders.reminderDaysBefore,
        reminderTimeUtc: preOrders.reminderTimeUtc,
        reminderTimezone: preOrders.reminderTimezone,
        reminderPhone: preOrders.reminderPhone,
        reminderEmail: preOrders.reminderEmail,
        lastReminderSentAt: preOrders.lastReminderSentAt,
        lastReminderStatus: preOrders.lastReminderStatus,
        priority: preOrders.priority,
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

  async getPreOrderReminders(preOrderId: string): Promise<PreOrderReminder[]> {
    return await db
      .select()
      .from(preOrderReminders)
      .where(eq(preOrderReminders.preOrderId, preOrderId))
      .orderBy(desc(preOrderReminders.createdAt));
  }

  async createPreOrderReminder(reminder: InsertPreOrderReminder): Promise<PreOrderReminder> {
    const [newReminder] = await db
      .insert(preOrderReminders)
      .values(reminder)
      .returning();
    return newReminder;
  }

  async updatePreOrderReminderStatus(
    id: number, 
    status: string, 
    errorMessage?: string
  ): Promise<PreOrderReminder | undefined> {
    const [updated] = await db
      .update(preOrderReminders)
      .set({ 
        status, 
        errorMessage: errorMessage || null,
        sentAt: status === 'sent' ? new Date() : null
      })
      .where(eq(preOrderReminders.id, id))
      .returning();
    return updated;
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
      // Include product count - categories.id is varchar (UUID), products.category_id is varchar
      const result = await db.execute(sql`
        SELECT 
          c.id, 
          c.name, 
          c.name_en, 
          c.name_cz, 
          c.name_vn, 
          c.description, 
          c.created_at, 
          c.updated_at,
          COALESCE(COUNT(p.id), 0)::integer as "productCount"
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id
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
        SELECT id, name, name_en, name_cz, name_vn, description, created_at, updated_at 
        FROM categories 
        WHERE id = ${id}
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
        RETURNING id, name, name_en, name_cz, name_vn, description, created_at, updated_at
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
        WHERE id = ${id}
        RETURNING id, name, name_en, name_cz, name_vn, description, created_at, updated_at
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
        DELETE FROM categories WHERE id = ${id}
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

  async createPackingMaterialsBulk(materials: InsertPackingMaterial[]): Promise<PackingMaterial[]> {
    try {
      if (materials.length === 0) {
        return [];
      }
      const newMaterials = await db
        .insert(packingMaterials)
        .values(materials)
        .returning();
      return newMaterials;
    } catch (error) {
      console.error('Error bulk creating packing materials:', error);
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

  async decreasePackingMaterialStock(materialId: string, quantity: number): Promise<void> {
    try {
      const [material] = await db
        .select()
        .from(packingMaterials)
        .where(eq(packingMaterials.id, materialId));

      if (!material) {
        throw new Error(`Packing material with ID ${materialId} not found`);
      }

      const newStockQuantity = Math.max(0, material.stockQuantity - quantity);

      await db
        .update(packingMaterials)
        .set({ 
          stockQuantity: newStockQuantity,
          updatedAt: new Date()
        })
        .where(eq(packingMaterials.id, materialId));

      console.log(`Decreased stock for material ${materialId}: ${material.stockQuantity} → ${newStockQuantity}`);
    } catch (error) {
      console.error('Error decreasing packing material stock:', error);
      throw error;
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

  async getAllFiles(): Promise<FileType[]> {
    try {
      const files = await db
        .select()
        .from(productFiles)
        .orderBy(productFiles.fileType);
      return files;
    } catch (error) {
      console.error('Error fetching all files:', error);
      return [];
    }
  }

  async getFilesByType(type: string): Promise<FileType[]> {
    try {
      const files = await db
        .select()
        .from(productFiles)
        .where(eq(productFiles.fileType, type))
        .orderBy(productFiles.uploadedAt);
      return files;
    } catch (error) {
      console.error('Error fetching files by type:', error);
      return [];
    }
  }

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

  async getPopularCartons(): Promise<PackingCarton[]> {
    try {
      return await db
        .select()
        .from(packingCartons)
        .orderBy(desc(packingCartons.usageCount), desc(packingCartons.lastUsedAt));
    } catch (error) {
      console.error('Error fetching popular cartons:', error);
      return [];
    }
  }

  async incrementCartonUsage(cartonId: string): Promise<void> {
    try {
      await db
        .update(packingCartons)
        .set({
          usageCount: sql`${packingCartons.usageCount} + 1`,
          lastUsedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(packingCartons.id, cartonId));
    } catch (error) {
      console.error('Error incrementing carton usage:', error);
      throw error;
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

  async deleteOrderCartonPlansByOrderId(orderId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(orderCartonPlans)
        .where(eq(orderCartonPlans.orderId, orderId));
      console.log(`Deleted ${result.rowCount ?? 0} existing packing plan(s) for order ${orderId}`);
      return true;
    } catch (error) {
      console.error('Error deleting order carton plans by orderId:', error);
      return false;
    }
  }

  // Order Cartons (actual cartons used during packing)
  async getOrderCartons(orderId: string): Promise<OrderCarton[]> {
    try {
      return await db
        .select()
        .from(orderCartons)
        .where(eq(orderCartons.orderId, orderId))
        .orderBy(asc(orderCartons.cartonNumber));
    } catch (error) {
      console.error('Error fetching order cartons:', error);
      return [];
    }
  }

  async getOrderCarton(id: string): Promise<OrderCarton | undefined> {
    try {
      const [carton] = await db
        .select()
        .from(orderCartons)
        .where(eq(orderCartons.id, id));
      return carton || undefined;
    } catch (error) {
      console.error('Error fetching order carton:', error);
      return undefined;
    }
  }

  async createOrderCarton(carton: InsertOrderCarton): Promise<OrderCarton> {
    try {
      const [newCarton] = await db
        .insert(orderCartons)
        .values(carton)
        .returning();
      return newCarton;
    } catch (error) {
      console.error('Error creating order carton:', error);
      throw error;
    }
  }

  async updateOrderCarton(id: string, carton: Partial<InsertOrderCarton>): Promise<OrderCarton | undefined> {
    try {
      const [updated] = await db
        .update(orderCartons)
        .set({ ...carton, updatedAt: new Date() })
        .where(eq(orderCartons.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating order carton:', error);
      return undefined;
    }
  }

  async deleteOrderCarton(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(orderCartons)
        .where(eq(orderCartons.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting order carton:', error);
      return false;
    }
  }

  // Shipment Labels (PPL, GLS, DHL, etc.)
  async getShipmentLabels(): Promise<ShipmentLabel[]> {
    try {
      const results = await db
        .select({
          id: shipmentLabels.id,
          orderId: shipmentLabels.orderId,
          carrier: shipmentLabels.carrier,
          trackingNumbers: shipmentLabels.trackingNumbers,
          batchId: shipmentLabels.batchId,
          labelBase64: shipmentLabels.labelBase64,
          labelData: shipmentLabels.labelData,
          status: shipmentLabels.status,
          shipmentCount: shipmentLabels.shipmentCount,
          cancelReason: shipmentLabels.cancelReason,
          createdAt: shipmentLabels.createdAt,
          cancelledAt: shipmentLabels.cancelledAt,
          updatedAt: shipmentLabels.updatedAt,
          customOrderId: orders.orderId,
          customerName: customers.name,
        })
        .from(shipmentLabels)
        .leftJoin(orders, eq(shipmentLabels.orderId, orders.id))
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .orderBy(desc(shipmentLabels.createdAt));

      return results as any;
    } catch (error) {
      console.error('Error fetching shipment labels:', error);
      return [];
    }
  }

  async getShipmentLabel(id: string): Promise<ShipmentLabel | undefined> {
    try {
      const [label] = await db
        .select()
        .from(shipmentLabels)
        .where(eq(shipmentLabels.id, id));
      return label || undefined;
    } catch (error) {
      console.error('Error fetching shipment label:', error);
      return undefined;
    }
  }

  async getShipmentLabelsByOrderId(orderId: string): Promise<ShipmentLabel[]> {
    try {
      return await db
        .select()
        .from(shipmentLabels)
        .where(eq(shipmentLabels.orderId, orderId))
        .orderBy(desc(shipmentLabels.createdAt));
    } catch (error) {
      console.error('Error fetching shipment labels by order ID:', error);
      return [];
    }
  }

  async createShipmentLabel(label: InsertShipmentLabel): Promise<ShipmentLabel> {
    try {
      const [newLabel] = await db
        .insert(shipmentLabels)
        .values(label)
        .returning();
      return newLabel;
    } catch (error) {
      console.error('Error creating shipment label:', error);
      throw error;
    }
  }

  async updateShipmentLabel(id: string, label: Partial<InsertShipmentLabel>): Promise<ShipmentLabel | undefined> {
    try {
      const [updated] = await db
        .update(shipmentLabels)
        .set({ ...label, updatedAt: new Date() })
        .where(eq(shipmentLabels.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating shipment label:', error);
      return undefined;
    }
  }

  async cancelShipmentLabel(id: string, reason?: string): Promise<ShipmentLabel | undefined> {
    try {
      const [cancelled] = await db
        .update(shipmentLabels)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: reason || 'Cancelled by user',
          updatedAt: new Date()
        })
        .where(eq(shipmentLabels.id, id))
        .returning();
      return cancelled || undefined;
    } catch (error) {
      console.error('Error cancelling shipment label:', error);
      return undefined;
    }
  }

  // Order Fulfillment Performance Tracking
  async logFulfillmentStart(orderId: string, userId: string, activityType: 'pick' | 'pack', itemCount: number, totalQuantity: number): Promise<OrderFulfillmentLog> {
    try {
      const [log] = await db
        .insert(orderFulfillmentLogs)
        .values({
          orderId,
          userId,
          activityType,
          startedAt: new Date(),
          completedAt: null,
          itemCount,
          totalQuantity,
        })
        .returning();
      return log;
    } catch (error) {
      console.error('Error logging fulfillment start:', error);
      throw error;
    }
  }

  async logFulfillmentComplete(orderId: string, userId: string, activityType: 'pick' | 'pack'): Promise<OrderFulfillmentLog | undefined> {
    try {
      // Find the most recent incomplete log for this order/user/activity
      const [existingLog] = await db
        .select()
        .from(orderFulfillmentLogs)
        .where(
          and(
            eq(orderFulfillmentLogs.orderId, orderId),
            eq(orderFulfillmentLogs.userId, userId),
            eq(orderFulfillmentLogs.activityType, activityType),
            isNull(orderFulfillmentLogs.completedAt)
          )
        )
        .orderBy(desc(orderFulfillmentLogs.startedAt))
        .limit(1);

      if (!existingLog) {
        console.warn(`No incomplete ${activityType} log found for order ${orderId}`);
        return undefined;
      }

      const [updated] = await db
        .update(orderFulfillmentLogs)
        .set({ completedAt: new Date() })
        .where(eq(orderFulfillmentLogs.id, existingLog.id))
        .returning();

      return updated || undefined;
    } catch (error) {
      console.error('Error logging fulfillment complete:', error);
      return undefined;
    }
  }

  async getPickPackPredictions(userId: string): Promise<{ pickingTimePerOrder: number; packingTimePerOrder: number; pickingTimePerItem: number; packingTimePerItem: number }> {
    try {
      // Get completed pick logs for this user
      const pickLogs = await db
        .select()
        .from(orderFulfillmentLogs)
        .where(
          and(
            eq(orderFulfillmentLogs.userId, userId),
            eq(orderFulfillmentLogs.activityType, 'pick'),
            not(isNull(orderFulfillmentLogs.completedAt))
          )
        )
        .orderBy(desc(orderFulfillmentLogs.startedAt))
        .limit(20); // Last 20 completed picks

      // Get completed pack logs for this user
      const packLogs = await db
        .select()
        .from(orderFulfillmentLogs)
        .where(
          and(
            eq(orderFulfillmentLogs.userId, userId),
            eq(orderFulfillmentLogs.activityType, 'pack'),
            not(isNull(orderFulfillmentLogs.completedAt))
          )
        )
        .orderBy(desc(orderFulfillmentLogs.startedAt))
        .limit(20); // Last 20 completed packs

      // Calculate average pick time
      let pickingTimePerOrder = 6; // Default 6 minutes
      let pickingTimePerItem = 1; // Default 1 minute per item

      if (pickLogs.length > 0) {
        const pickTimes = pickLogs
          .filter(log => log.completedAt && log.startedAt)
          .map(log => {
            const duration = (log.completedAt!.getTime() - log.startedAt.getTime()) / 60000; // minutes
            return { duration, itemCount: log.itemCount, totalQuantity: log.totalQuantity };
          });

        if (pickTimes.length > 0) {
          pickingTimePerOrder = pickTimes.reduce((sum, t) => sum + t.duration, 0) / pickTimes.length;
          const totalItems = pickTimes.reduce((sum, t) => sum + t.totalQuantity, 0);
          const totalTime = pickTimes.reduce((sum, t) => sum + t.duration, 0);
          if (totalItems > 0) {
            pickingTimePerItem = totalTime / totalItems;
          }
        }
      }

      // Calculate average pack time
      let packingTimePerOrder = 4; // Default 4 minutes
      let packingTimePerItem = 0.5; // Default 0.5 minutes per item

      if (packLogs.length > 0) {
        const packTimes = packLogs
          .filter(log => log.completedAt && log.startedAt)
          .map(log => {
            const duration = (log.completedAt!.getTime() - log.startedAt.getTime()) / 60000; // minutes
            return { duration, itemCount: log.itemCount, totalQuantity: log.totalQuantity };
          });

        if (packTimes.length > 0) {
          packingTimePerOrder = packTimes.reduce((sum, t) => sum + t.duration, 0) / packTimes.length;
          const totalItems = packTimes.reduce((sum, t) => sum + t.totalQuantity, 0);
          const totalTime = packTimes.reduce((sum, t) => sum + t.duration, 0);
          if (totalItems > 0) {
            packingTimePerItem = totalTime / totalItems;
          }
        }
      }

      return {
        pickingTimePerOrder,
        packingTimePerOrder,
        pickingTimePerItem,
        packingTimePerItem,
      };
    } catch (error) {
      console.error('Error getting pick/pack predictions:', error);
      // Return defaults on error
      return {
        pickingTimePerOrder: 6,
        packingTimePerOrder: 4,
        pickingTimePerItem: 1,
        packingTimePerItem: 0.5,
      };
    }
  }

  // App Settings
  async getAppSettings(): Promise<AppSetting[]> {
    try {
      return await db
        .select()
        .from(appSettings)
        .orderBy(appSettings.category, appSettings.key);
    } catch (error) {
      console.error('Error getting app settings:', error);
      throw new Error('Failed to retrieve app settings');
    }
  }

  async getAppSettingByKey(key: string): Promise<AppSetting | undefined> {
    try {
      const [setting] = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.key, key));
      return setting || undefined;
    } catch (error) {
      console.error(`Error getting app setting with key ${key}:`, error);
      throw new Error(`Failed to retrieve app setting with key: ${key}`);
    }
  }

  async createAppSetting(data: InsertAppSetting): Promise<AppSetting> {
    try {
      const [setting] = await db
        .insert(appSettings)
        .values({ ...data, updatedAt: new Date() })
        .returning();
      return setting;
    } catch (error) {
      console.error('Error creating app setting:', error);
      throw new Error('Failed to create app setting');
    }
  }

  async updateAppSetting(key: string, data: Partial<InsertAppSetting>): Promise<AppSetting> {
    try {
      const [updated] = await db
        .update(appSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(appSettings.key, key))
        .returning();

      if (!updated) {
        throw new Error(`App setting with key ${key} not found`);
      }

      return updated;
    } catch (error) {
      console.error(`Error updating app setting with key ${key}:`, error);
      throw new Error(`Failed to update app setting with key: ${key}`);
    }
  }

  async deleteAppSetting(key: string): Promise<void> {
    try {
      const result = await db
        .delete(appSettings)
        .where(eq(appSettings.key, key));

      if ((result.rowCount ?? 0) === 0) {
        throw new Error(`App setting with key ${key} not found`);
      }
    } catch (error) {
      console.error(`Error deleting app setting with key ${key}:`, error);
      throw new Error(`Failed to delete app setting with key: ${key}`);
    }
  }

  // Invoices
  async getInvoices(): Promise<Invoice[]> {
    try {
      return await db
        .select()
        .from(invoices)
        .orderBy(desc(invoices.createdAt));
    } catch (error) {
      console.error('Error getting invoices:', error);
      throw new Error('Failed to retrieve invoices');
    }
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    try {
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, id));
      return invoice || undefined;
    } catch (error) {
      console.error(`Error getting invoice with id ${id}:`, error);
      throw new Error(`Failed to retrieve invoice with id: ${id}`);
    }
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined> {
    try {
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.invoiceNumber, invoiceNumber));
      return invoice || undefined;
    } catch (error) {
      console.error(`Error getting invoice with number ${invoiceNumber}:`, error);
      throw new Error(`Failed to retrieve invoice with number: ${invoiceNumber}`);
    }
  }

  async getInvoicesByOrderId(orderId: string): Promise<Invoice[]> {
    try {
      return await db
        .select()
        .from(invoices)
        .where(eq(invoices.orderId, orderId))
        .orderBy(desc(invoices.createdAt));
    } catch (error) {
      console.error(`Error getting invoices for order ${orderId}:`, error);
      throw new Error(`Failed to retrieve invoices for order: ${orderId}`);
    }
  }

  async createInvoice(data: InsertInvoice): Promise<Invoice> {
    try {
      const [invoice] = await db
        .insert(invoices)
        .values({ ...data, updatedAt: new Date() })
        .returning();
      return invoice;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw new Error('Failed to create invoice');
    }
  }

  async updateInvoice(id: number, data: Partial<InsertInvoice>): Promise<Invoice> {
    try {
      const [updated] = await db
        .update(invoices)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(invoices.id, id))
        .returning();

      if (!updated) {
        throw new Error(`Invoice with id ${id} not found`);
      }

      return updated;
    } catch (error) {
      console.error(`Error updating invoice with id ${id}:`, error);
      throw new Error(`Failed to update invoice with id: ${id}`);
    }
  }

  async deleteInvoice(id: number): Promise<void> {
    try {
      const result = await db
        .delete(invoices)
        .where(eq(invoices.id, id));

      if ((result.rowCount ?? 0) === 0) {
        throw new Error(`Invoice with id ${id} not found`);
      }
    } catch (error) {
      console.error(`Error deleting invoice with id ${id}:`, error);
      throw new Error(`Failed to delete invoice with id: ${id}`);
    }
  }

  // Analytics & Reports
  async getDeadStockProducts(daysSinceLastSale: number): Promise<Product[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastSale);

      const deadStockProducts = await db
        .select()
        .from(products)
        .where(
          or(
            lt(products.lastSoldAt, cutoffDate),
            and(
              isNull(products.lastSoldAt),
              sql`NOT EXISTS (SELECT 1 FROM ${orderItems} WHERE ${orderItems.productId} = ${products.id})`
            )
          )
        )
        .orderBy(asc(products.lastSoldAt));

      return deadStockProducts;
    } catch (error) {
      console.error('Error getting dead stock products:', error);
      throw new Error('Failed to retrieve dead stock products');
    }
  }

  async getReorderAlerts(): Promise<Product[]> {
    try {
      const reorderAlerts = await db
        .select()
        .from(products)
        .where(
          and(
            not(isNull(products.minStockLevel)),
            sql`${products.quantity} < ${products.minStockLevel}`
          )
        )
        .orderBy(sql`(${products.quantity}::float / ${products.minStockLevel}) ASC`);

      return reorderAlerts;
    } catch (error) {
      console.error('Error getting reorder alerts:', error);
      throw new Error('Failed to retrieve reorder alerts');
    }
  }

  async getColorTrendReport(categoryName: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    try {
      let query = db
        .select({
          variantName: productVariants.name,
          productId: products.id,
          productName: products.name,
          imageUrl: productVariants.imageUrl,
          totalQuantitySold: sql<number>`SUM(${orderItems.quantity})`,
          saleMonth: sql<string>`DATE_TRUNC('month', ${orders.createdAt})`,
        })
        .from(productVariants)
        .innerJoin(products, eq(productVariants.productId, products.id))
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .innerJoin(orderItems, eq(productVariants.id, orderItems.variantId))
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(
          and(
            eq(categories.name, categoryName),
            inArray(orders.orderStatus, ['completed', 'shipped', 'delivered'])
          )
        );

      if (startDate) {
        query = query.where(gte(orders.createdAt, startDate));
      }

      if (endDate) {
        query = query.where(lte(orders.createdAt, endDate));
      }

      const results: any = await query
        .groupBy(
          productVariants.name,
          products.id,
          products.name,
          productVariants.imageUrl,
          sql`DATE_TRUNC('month', ${orders.createdAt})`
        )
        .orderBy(sql`SUM(${orderItems.quantity}) DESC`);

      // Group by variant name and aggregate sales by month
      const trendMap = new Map<string, any>();

      results.forEach((row: any) => {
        const key = row.variantName;
        if (!trendMap.has(key)) {
          trendMap.set(key, {
            variantName: row.variantName,
            productId: row.productId,
            productName: row.productName,
            imageUrl: row.imageUrl,
            totalQuantitySold: 0,
            salesByMonth: [],
          });
        }

        const trend = trendMap.get(key);
        trend.totalQuantitySold += Number(row.totalQuantitySold);
        trend.salesByMonth.push({
          month: row.saleMonth,
          quantity: Number(row.totalQuantitySold),
        });
      });

      return Array.from(trendMap.values()).sort(
        (a, b) => b.totalQuantitySold - a.totalQuantitySold
      );
    } catch (error) {
      console.error('Error getting color trend report:', error);
      throw new Error('Failed to retrieve color trend report');
    }
  }

  // Warehouse Tasks
  async getWarehouseTasks(filters?: { status?: string; assignedToUserId?: string; createdByUserId?: string }): Promise<WarehouseTask[]> {
    try {
      const conditions = [];
      
      if (filters?.status) {
        conditions.push(eq(warehouseTasks.status, filters.status));
      }
      if (filters?.assignedToUserId) {
        conditions.push(eq(warehouseTasks.assignedToUserId, filters.assignedToUserId));
      }
      if (filters?.createdByUserId) {
        conditions.push(eq(warehouseTasks.createdByUserId, filters.createdByUserId));
      }

      if (conditions.length > 0) {
        return await db
          .select()
          .from(warehouseTasks)
          .where(and(...conditions))
          .orderBy(desc(warehouseTasks.createdAt));
      }

      return await db
        .select()
        .from(warehouseTasks)
        .orderBy(desc(warehouseTasks.createdAt));
    } catch (error) {
      console.error('Error getting warehouse tasks:', error);
      throw new Error('Failed to retrieve warehouse tasks');
    }
  }

  async getWarehouseTaskById(id: number): Promise<WarehouseTask | undefined> {
    try {
      const [task] = await db
        .select()
        .from(warehouseTasks)
        .where(eq(warehouseTasks.id, id))
        .limit(1);
      return task;
    } catch (error) {
      console.error('Error getting warehouse task by ID:', error);
      throw new Error('Failed to retrieve warehouse task');
    }
  }

  async createWarehouseTask(task: InsertWarehouseTask): Promise<WarehouseTask> {
    try {
      const [result] = await db
        .insert(warehouseTasks)
        .values(task)
        .returning();
      return result;
    } catch (error) {
      console.error('Error creating warehouse task:', error);
      throw new Error('Failed to create warehouse task');
    }
  }

  async updateWarehouseTask(id: number, updates: Partial<WarehouseTask>): Promise<WarehouseTask | undefined> {
    try {
      const [result] = await db
        .update(warehouseTasks)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(warehouseTasks.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error('Error updating warehouse task:', error);
      throw new Error('Failed to update warehouse task');
    }
  }

  async deleteWarehouseTask(id: number): Promise<boolean> {
    try {
      await db.delete(warehouseTasks).where(eq(warehouseTasks.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting warehouse task:', error);
      throw new Error('Failed to delete warehouse task');
    }
  }
}

export const storage = new DatabaseStorage();