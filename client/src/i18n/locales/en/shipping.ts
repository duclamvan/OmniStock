const shipping = {
  // Module Name
  shipping: 'Shipping',
  shippingManagement: 'Shipping Management',
  
  // Carriers
  carrier: 'Carrier',
  gls: 'GLS',
  ppl: 'PPL',
  dhl: 'DHL',
  dpd: 'DPD',
  ups: 'UPS',
  fedex: 'FedEx',
  
  // Shipping Fields
  shippingMethod: 'Shipping Method',
  shippingCost: 'Shipping Cost',
  shippingAddress: 'Shipping Address',
  trackingNumber: 'Tracking Number',
  shippingLabel: 'Shipping Label',
  estimatedDelivery: 'Estimated Delivery',
  deliveryDate: 'Delivery Date',
  
  // Shipping Status
  pendingShipment: 'Pending Shipment',
  readyToShip: 'Ready to Ship',
  inTransit: 'In Transit',
  outForDelivery: 'Out for Delivery',
  delivered: 'Delivered',
  failed: 'Delivery Failed',
  returned: 'Returned',
  
  // Package Details
  package: 'Package',
  packages: 'Packages',
  packageWeight: 'Package Weight',
  packageDimensions: 'Package Dimensions',
  carton: 'Carton',
  cartons: 'Cartons',
  
  // Actions
  createShipment: 'Create Shipment',
  generateLabel: 'Generate Label',
  printLabel: 'Print Label',
  trackShipment: 'Track Shipment',
  
  // Messages
  shipmentCreated: 'Shipment created successfully',
  labelGenerated: 'Shipping label generated successfully',
  trackingUpdated: 'Tracking information updated',
  
} as const;

export default shipping;
