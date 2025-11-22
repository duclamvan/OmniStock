const shipping = {
  // Module Name
  shipping: 'Shipping',
  shippingManagement: 'Shipping Management',
  
  // Carriers
  carrier: 'Carrier',
  gls: 'GLS DE',
  ppl: 'PPL CZ',
  dhl: 'DHL DE',
  dpd: 'DPD',
  ups: 'UPS',
  fedex: 'FedEx',
  
  // Shipping Fields
  shippingMethod: 'Shipping Method',
  shippingCost: 'Shipping Cost',
  shippingAddress: 'Shipping Address',
  trackingNumber: 'Tracking Number',
  trackingNumbers: 'Tracking Numbers',
  shippingLabel: 'Shipping Label',
  shipmentLabels: 'Shipment Labels',
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
  active: 'Active',
  cancelled: 'Cancelled',
  
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
  view: 'View',
  viewLabel: 'View Label',
  cancel: 'Cancel',
  clear: 'Clear',
  clearFilters: 'Clear Filters',
  saveAddress: 'Save Address',
  testConnection: 'Test Connection',
  createTestParcel: 'Create Test Parcel',
  
  // Messages
  shipmentCreated: 'Shipment created successfully',
  labelGenerated: 'Shipping label generated successfully',
  trackingUpdated: 'Tracking information updated',
  labelCancelled: 'Label Cancelled',
  labelCancelledSuccess: 'The shipment label has been cancelled successfully.',
  addressSaved: 'Address Saved',
  addressSavedSuccess: 'Default sender address has been saved successfully',
  pplAddressSavedSuccess: 'Default PPL sender address has been saved successfully',
  testParcelCreated: 'Test Parcel Created',
  testParcelCreatedSuccess: 'Test parcel created successfully. Tracking:',
  
  // Errors
  error: 'Error',
  failedToCancelLabel: 'Failed to cancel shipment label',
  failedToSaveAddress: 'Failed to Save Address',
  failedToCreateTestParcel: 'Failed to Create Test Parcel',
  validationError: 'Validation Error',
  fillAllRequiredFields: 'Please fill in all required fields (marked with *)',
  fillRequiredFields: 'Please fill in street, postal code, and city',
  fillIBANAndAccountHolder: 'Please fill in IBAN and Account Holder',
  connectionFailed: 'Connection Failed',
  unableToConnectToPPL: 'Unable to connect to PPL API',
  pplConnectionFailed: 'PPL Connection Failed',
  pplConnectionSuccess: 'PPL Connection Successful',
  pplConnectionError: 'PPL Connection Error',
  errorOccurredWhileTesting: 'An error occurred while testing PPL connection',
  failedToConnect: 'Failed to connect to PPL API',
  successfullyConnected: 'Successfully connected to PPL API',
  
  // Page Descriptions
  manageShippingLabels: 'Manage all shipping labels (PPL CZ, GLS DE, DHL DE) created for orders',
  manageMultiCarrierShipping: 'Manage multi-carrier shipping integrations and test API connections',
  
  // Table & List
  all: 'All',
  labels: 'Labels',
  showing: 'Showing',
  of: 'of',
  search: 'Search...',
  orderAndCustomer: 'Order & Customer',
  created: 'Created',
  actions: 'Actions',
  batchId: 'Batch ID',
  
  // Loading & Empty States
  loadingLabels: 'Loading labels...',
  noShipmentLabelsFound: 'No shipment labels found',
  testingConnection: 'Testing connection...',
  saving: 'Saving...',
  creatingTestParcel: 'Creating test parcel...',
  
  // Dialogs
  cancelShipmentLabel: 'Cancel Shipment Label',
  cancelShipmentConfirmation: 'Are you sure you want to cancel this shipment label? This action cannot be undone and the tracking number will be invalidated.',
  
  // Tabs
  connectionStatus: 'Connection Status',
  connection: 'Connection',
  shippingInformation: 'Shipping Information',
  shippingInfo: 'Shipping Info',
  
  // Connection Status
  connected: 'Connected',
  disconnected: 'Disconnected',
  provider: 'Provider',
  status: 'Status',
  response: 'Response',
  noConnectionTestYet: 'No connection test performed yet. Click the button below to test.',
  unknownError: 'Unknown error occurred',
  
  // Carrier Descriptions
  czechParcelService: 'Czech Parcel Service',
  
  // Address Form Fields
  name: 'Name',
  firstName: 'First Name',
  lastName: 'Last Name',
  company: 'Company',
  companyName: 'Company Name',
  companyName2: 'Company (name2)',
  street: 'Street',
  streetAddress: 'Street Address',
  streetName: 'Street name',
  houseNumber: 'House Number',
  city: 'City',
  zipCode: 'Zip Code',
  postalCode: 'Postal Code',
  country: 'Country',
  contact: 'Contact',
  contactPersonName: 'Contact Person Name',
  phone: 'Phone',
  email: 'Email',
  addressSupplement: 'Address Supplement',
  recipientName: 'Recipient name',
  yourName: 'Your Name',
  
  // PPL Specific
  defaultPPLSenderAddress: 'Default PPL CZ Sender Address',
  setDefaultSenderAddress: 'Set the default sender address (your company) used for all PPL CZ label generation',
  saveDefaultAddress: 'Save Default Address',
  pplShipping: 'PPL CZ Shipping',
  testLabelGenerationAndView: 'Test label generation and view integration details',
  testLabelGeneration: 'Test Label Generation',
  testAddress: 'Test Address',
  
  // GLS Specific
  glsDE: 'GLS DE',
  defaultGLSSenderAddress: 'Default GLS DE Sender Address',
  setGLSDefaultSenderAddress: 'Set the default sender address used for GLS DE label autofill via bookmarklet',
  saveGLSSenderAddress: 'Save GLS Sender Address',
  configureGLSSenderAddress: 'Configure sender address for manual GLS label workflow',
  desktopHowToUseGLS: 'Desktop: How to Use GLS Autofill',
  mobileAndroidSetup: 'Mobile (Android): Tampermonkey Setup for Kiwi Browser',
  glsAutofillExplanation: "GLS Germany doesn't offer a business API for private customer shipping. The bookmarklet approach allows you to automatically fill the GLS web form with order data, avoiding manual typing errors and speeding up your shipping workflow.",
  glsManualWorkflow: 'GLS manual shipping workflow:',
  
  // DHL Specific
  dhlDE: 'DHL DE',
  dhlDefaultSenderAddress: 'Default DHL DE Sender Address',
  saveDHLSenderAddress: 'Save DHL Sender Address',
  dhlBankDetails: 'DHL Bank Details (for COD/Nachnahme)',
  iban: 'IBAN',
  bic: 'BIC',
  accountHolder: 'Account Holder',
  saveBankDetails: 'Save Bank Details',
  howToUseDHLManualShipping: 'How to Use DHL Manual Shipping',
  saveYourSenderAddress: 'Save your sender address and bank details above',
  goToAnyOrder: 'Go to any order in Pick & Pack mode',
  clickShipWithDHL: 'Click "Ship with DHL" to see shipping information',
  copyPrefilledInfo: 'Copy the pre-filled shipping information to DHL\'s website',
  createLabelsManually: 'Create labels manually on DHL\'s shipping portal',
  dhlManualShippingExplanation: 'DHL manual shipping allows you to create labels through DHL\'s official portal while having all shipping information pre-filled in your Pick & Pack interface for quick copy-paste, reducing manual data entry errors.',
  dhlManualWorkflow: 'DHL manual shipping workflow:',
  
  // Features
  features: 'Features',
  whyThisApproach: 'Why This Approach?',
  importantNotes: 'Important Notes',
  manualLabelWorkflow: 'Manual label workflow via website',
  manualLabelWorkflowViaDHL: 'Manual label workflow via DHL website',
  manualLabelWorkflowViaGLS: 'Manual label workflow via GLS website',
  noAPIIntegrationRequired: 'No API integration required',
  bookmarkletAutofill: 'Bookmarklet autofill for desktop',
  tampermonkeyScriptForMobile: 'Tampermonkey script for mobile (Kiwi Browser)',
  affordableRates: 'Affordable rates from €3.29 within Germany',
  prefilledShippingInformation: 'Pre-filled shipping information for copy-paste',
  codSupportWithBankDetails: 'COD (Nachnahme) support with bank details',
  reliableDelivery: 'Reliable delivery across Germany and Europe',
  
  // Workflow Steps
  labelsCreatedViaGLSWebsite: 'Labels created via GLS website',
  labelsCreatedViaDHLWebsite: 'Labels created via DHL website',
  bookmarkletAutoFills: 'Bookmarklet auto-fills recipient data',
  shippingInfoPrefilledForCopyPaste: 'Shipping info pre-filled for copy-paste',
  bankDetailsStoredForCOD: 'Bank details stored for COD support',
  oneTimeSetup: 'One-time bookmarklet setup required',
  bestForGermanDomestic: 'Best for German domestic shipments',
  suitableForDomesticAndInternational: 'Suitable for domestic and international shipping',
  
  // GLS Instructions
  glsDesktopStep1: 'Save your sender address above',
  glsDesktopStep2: 'Go to any order and click "Ship with GLS"',
  glsDesktopStep3: 'Follow the one-time bookmarklet setup instructions',
  glsDesktopStep4: 'Use the bookmarklet to auto-fill the GLS form anytime',
  glsMobileNote: 'Note: The mobile script works the same as the desktop bookmarklet but runs automatically when you visit the GLS website from an order.',
  
} as const;

export default shipping;
