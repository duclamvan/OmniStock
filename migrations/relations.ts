import { relations } from "drizzle-orm/relations";
import { suppliers, supplierFiles, warehouses, warehouseFiles, users, orders, orderItems, products, productVariants } from "./schema";

export const supplierFilesRelations = relations(supplierFiles, ({one}) => ({
	supplier: one(suppliers, {
		fields: [supplierFiles.supplierId],
		references: [suppliers.id]
	}),
}));

export const suppliersRelations = relations(suppliers, ({many}) => ({
	supplierFiles: many(supplierFiles),
	products: many(products),
}));

export const warehouseFilesRelations = relations(warehouseFiles, ({one}) => ({
	warehouse: one(warehouses, {
		fields: [warehouseFiles.warehouseId],
		references: [warehouses.id]
	}),
}));

export const warehousesRelations = relations(warehouses, ({many}) => ({
	warehouseFiles: many(warehouseFiles),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	user: one(users, {
		fields: [orders.billerId],
		references: [users.id]
	}),
	orderItems: many(orderItems),
}));

export const usersRelations = relations(users, ({many}) => ({
	orders: many(orders),
}));

export const orderItemsRelations = relations(orderItems, ({one}) => ({
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id]
	}),
	product: one(products, {
		fields: [orderItems.productId],
		references: [products.id]
	}),
}));

export const productsRelations = relations(products, ({one, many}) => ({
	orderItems: many(orderItems),
	productVariants: many(productVariants),
	supplier: one(suppliers, {
		fields: [products.supplierId],
		references: [suppliers.id]
	}),
}));

export const productVariantsRelations = relations(productVariants, ({one}) => ({
	product: one(products, {
		fields: [productVariants.productId],
		references: [products.id]
	}),
}));