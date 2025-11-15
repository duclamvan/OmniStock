const inventory = {
  // Module Name
  inventory: 'Inventory',
  stockManagement: 'Stock Management',
  
  // Actions
  receiveStock: 'Receive Stock',
  adjustStock: 'Adjust Stock',
  transferStock: 'Transfer Stock',
  stockCount: 'Stock Count',
  
  // Inventory Fields
  stockLevel: 'Stock Level',
  availableStock: 'Available Stock',
  reservedStock: 'Reserved Stock',
  incomingStock: 'Incoming Stock',
  stockValue: 'Stock Value',
  lowStock: 'Low Stock',
  outOfStock: 'Out of Stock',
  overstock: 'Overstock',
  
  // Warehouse Operations
  receiving: 'Receiving',
  putaway: 'Putaway',
  picking: 'Picking',
  packing: 'Packing',
  shipping: 'Shipping',
  inbound: 'Inbound',
  outbound: 'Outbound',
  
  // Stock Movements
  stockIn: 'Stock In',
  stockOut: 'Stock Out',
  stockAdjustment: 'Stock Adjustment',
  stockTransfer: 'Stock Transfer',
  
  // Reasons
  adjustment: 'Adjustment',
  damaged: 'Damaged',
  lost: 'Lost',
  found: 'Found',
  returned: 'Returned',
  expired: 'Expired',
  sold: 'Sold',
  
  // Location
  warehouse: 'Warehouse',
  location: 'Location',
  bin: 'Bin',
  zone: 'Zone',
  rack: 'Rack',
  shelf: 'Shelf',
  
  // Messages
  stockUpdated: 'Stock updated successfully',
  stockReceived: 'Stock received successfully',
  adjustmentSaved: 'Stock adjustment saved successfully',
  
} as const;

export default inventory;
