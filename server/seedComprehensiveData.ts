import { storage } from "./storage";
import { comprehensiveMockData } from "./comprehensiveMockData";
import { nanoid } from "nanoid";

// Orders with proper customer relationships and order items
const comprehensiveOrders = [
  {
    id: "ord-tech-bulk-001",
    orderId: "20250130001",
    customerId: "cust-tech-solutions", // Business customer
    billerId: null,
    currency: "EUR" as const,
    orderStatus: "shipped" as const,
    paymentStatus: "paid" as const,
    priority: "high" as const,
    subtotal: "4200.00",
    discountType: null,
    discountValue: "0.00",
    taxRate: "21.00",
    taxAmount: "882.00",
    shippingCost: "50.00",
    actualShippingCost: "35.00",
    grandTotal: "5132.00",
    notes: "Bulk order for office setup - Tech Solutions s.r.o.",
    attachmentUrl: null,
    createdAt: new Date("2025-01-30T09:00:00Z"),
    updatedAt: new Date("2025-01-30T14:30:00Z"),
    shippedAt: new Date("2025-01-30T14:30:00Z"),
    items: [
      {
        id: nanoid(),
        productName: "Samsung Galaxy S24 Ultra",
        sku: "SAMSUNG-GS24-ULTRA-512",
        quantity: 3,
        price: "1249.00",
        discount: "0.00",
        tax: "0.00",
        total: "3747.00",
      },
      {
        id: nanoid(),
        productName: "Samsung Galaxy Watch 6",
        sku: "SAMSUNG-GW6-44-SLV",
        quantity: 1,
        price: "329.00",
        discount: "0.00",
        tax: "0.00",
        total: "329.00",
      },
      {
        id: nanoid(),
        productName: "Xiaomi Mi Electric Scooter 4",
        sku: "XIAOMI-SCOOT4-BLK",
        quantity: 1,
        price: "399.00",
        discount: "0.00",
        tax: "0.00",
        total: "399.00",
      }
    ]
  },
  {
    id: "ord-pavel-vip-002",
    orderId: "20250131001",
    customerId: "cust-pavel-novak", // VIP customer
    billerId: null,
    currency: "CZK" as const,
    orderStatus: "shipped" as const,
    paymentStatus: "paid" as const,
    priority: "high" as const,
    subtotal: "104000.00",
    discountType: "percentage",
    discountValue: "5.00",
    taxRate: "21.00",
    taxAmount: "20748.00",
    shippingCost: "0.00", // Free shipping for VIP
    actualShippingCost: "0.00",
    grandTotal: "119548.00",
    notes: "VIP customer - Pavel Novák, 5% loyalty discount applied",
    attachmentUrl: null,
    createdAt: new Date("2025-01-31T10:15:00Z"),
    updatedAt: new Date("2025-01-31T16:45:00Z"),
    shippedAt: new Date("2025-01-31T16:45:00Z"),
    items: [
      {
        id: nanoid(),
        productName: "iPhone 15 Pro Max",
        sku: "APPLE-IP15PM-256",
        quantity: 2,
        price: "32000.00",
        discount: "1600.00", // 5% discount
        tax: "0.00",
        total: "62400.00",
      },
      {
        id: nanoid(),
        productName: "MacBook Pro 16\" M3",
        sku: "APPLE-MBP16-M3-512",
        quantity: 1,
        price: "72000.00",
        discount: "3600.00", // 5% discount
        tax: "0.00",
        total: "68400.00",
      },
      {
        id: nanoid(),
        productName: "AirPods Pro (2nd Gen)",
        sku: "APPLE-APP-2GEN-USB",
        quantity: 2,
        price: "7500.00",
        discount: "375.00", // 5% discount
        tax: "0.00",
        total: "14625.00",
      }
    ]
  },
  {
    id: "ord-fashion-boutique-003",
    orderId: "20250201001",
    customerId: "cust-fashion-boutique", // Business customer
    billerId: null,
    currency: "EUR" as const,
    orderStatus: "to_fulfill" as const,
    paymentStatus: "paid" as const,
    priority: "medium" as const,
    subtotal: "890.00",
    discountType: null,
    discountValue: "0.00",
    taxRate: "20.00",
    taxAmount: "178.00",
    shippingCost: "25.00",
    actualShippingCost: "0.00",
    grandTotal: "1093.00",
    notes: "Fashion Boutique Vienna - Spring collection order",
    attachmentUrl: null,
    createdAt: new Date("2025-02-01T08:30:00Z"),
    updatedAt: new Date("2025-02-01T08:30:00Z"),
    shippedAt: null,
    items: [
      {
        id: nanoid(),
        productName: "Zara Structured Blazer",
        sku: "ZARA-BLAZER-M-GRY",
        quantity: 5,
        price: "69.95",
        discount: "0.00",
        tax: "0.00",
        total: "349.75",
      },
      {
        id: nanoid(),
        productName: "Zara High-Waist Straight Jeans",
        sku: "ZARA-JEANS-W30-INDIG",
        quantity: 8,
        price: "45.95",
        discount: "0.00",
        tax: "0.00",
        total: "367.60",
      },
      {
        id: nanoid(),
        productName: "Zara Floral Print Midi Dress",
        sku: "ZARA-DRESS-M-FLOR",
        quantity: 3,
        price: "59.95",
        discount: "0.00",
        tax: "0.00",
        total: "179.85",
      }
    ]
  },
  {
    id: "ord-maria-austria-004",
    orderId: "20250201002",
    customerId: "cust-maria-schmidt", // VIP Austrian customer
    billerId: null,
    currency: "EUR" as const,
    orderStatus: "shipped" as const,
    paymentStatus: "paid" as const,
    priority: "high" as const,
    subtotal: "1548.00",
    discountType: "percentage",
    discountValue: "3.00",
    taxRate: "20.00",
    taxAmount: "301.33",
    shippingCost: "15.00",
    actualShippingCost: "12.50",
    grandTotal: "1864.33",
    notes: "VIP customer from Austria - Maria Schmidt, 3% VIP discount",
    attachmentUrl: null,
    createdAt: new Date("2025-02-01T11:20:00Z"),
    updatedAt: new Date("2025-02-01T17:10:00Z"),
    shippedAt: new Date("2025-02-01T17:10:00Z"),
    items: [
      {
        id: nanoid(),
        productName: "Samsung 65\" QLED 4K TV",
        sku: "SAMSUNG-QN65Q80C",
        quantity: 1,
        price: "1399.00",
        discount: "41.97", // 3% discount
        tax: "0.00",
        total: "1357.03",
      },
      {
        id: nanoid(),
        productName: "Nike Air Max 270",
        sku: "NIKE-AM270-BLK-42",
        quantity: 1,
        price: "119.99",
        discount: "3.60", // 3% discount
        tax: "0.00",
        total: "116.39",
      },
      {
        id: nanoid(),
        productName: "Nike Sportswear Tech Fleece",
        sku: "NIKE-TECH-FLEECE-XL-BLK",
        quantity: 1,
        price: "89.99",
        discount: "2.70", // 3% discount
        tax: "0.00",
        total: "87.29",
      }
    ]
  },
  {
    id: "ord-fitness-gym-005",
    orderId: "20250202001",
    customerId: "cust-fitness-first", // Business gym customer
    billerId: null,
    currency: "CZK" as const,
    orderStatus: "to_fulfill" as const,
    paymentStatus: "paid" as const,
    priority: "medium" as const,
    subtotal: "15500.00",
    discountType: "fixed",
    discountValue: "1000.00",
    taxRate: "21.00",
    taxAmount: "3045.00",
    shippingCost: "200.00",
    actualShippingCost: "0.00",
    grandTotal: "17745.00",
    notes: "Fitness First Praha - Equipment for new branch, bulk discount applied",
    attachmentUrl: null,
    createdAt: new Date("2025-02-02T07:45:00Z"),
    updatedAt: new Date("2025-02-02T07:45:00Z"),
    shippedAt: null,
    items: [
      {
        id: nanoid(),
        productName: "Decathlon Riverside 120",
        sku: "DECATH-RIV120-L-BLU",
        quantity: 2,
        price: "6999.00",
        discount: "500.00", // Bulk discount
        tax: "0.00",
        total: "13498.00",
      },
      {
        id: nanoid(),
        productName: "Decathlon Forclaz 50L Backpack",
        sku: "DECATH-FORC50-GRN",
        quantity: 10,
        price: "1299.00",
        discount: "500.00", // Bulk discount
        tax: "0.00",
        total: "12490.00",
      },
      {
        id: nanoid(),
        productName: "Nike Dri-FIT Training Shirt",
        sku: "NIKE-DF-TRAIN-L-BLU",
        quantity: 25,
        price: "750.00", // Converted to CZK
        discount: "0.00",
        tax: "0.00",
        total: "18750.00",
      }
    ]
  },
  {
    id: "ord-anna-regular-006",
    orderId: "20250202002",
    customerId: "cust-anna-svoboda", // Regular customer
    billerId: null,
    currency: "CZK" as const,
    orderStatus: "pending" as const,
    paymentStatus: "pending" as const,
    priority: "low" as const,
    subtotal: "4240.00",
    discountType: null,
    discountValue: "0.00",
    taxRate: "21.00",
    taxAmount: "890.40",
    shippingCost: "150.00",
    actualShippingCost: "0.00",
    grandTotal: "5280.40",
    notes: "Anna Svobodová - Fashion order, awaiting payment",
    attachmentUrl: null,
    createdAt: new Date("2025-02-02T13:15:00Z"),
    updatedAt: new Date("2025-02-02T13:15:00Z"),
    shippedAt: null,
    items: [
      {
        id: nanoid(),
        productName: "L'Oréal True Match Foundation",
        sku: "LOREAL-TM-FOUND-C3",
        quantity: 3,
        price: "459.00",
        discount: "0.00",
        tax: "0.00",
        total: "1377.00",
      },
      {
        id: nanoid(),
        productName: "L'Oréal Voluminous Lash Paradise",
        sku: "LOREAL-VLP-MASC-BLK",
        quantity: 2,
        price: "349.00",
        discount: "0.00",
        tax: "0.00",
        total: "698.00",
      },
      {
        id: nanoid(),
        productName: "IKEA LINNMON Desk",
        sku: "IKEA-LINNMON-120-WHT",
        quantity: 1,
        price: "1299.00",
        discount: "0.00",
        tax: "0.00",
        total: "1299.00",
      },
      {
        id: nanoid(),
        productName: "IKEA MARKUS Office Chair",
        sku: "IKEA-MARKUS-GRY-ADJ",
        quantity: 1,
        price: "4599.00",
        discount: "0.00",
        tax: "0.00",
        total: "4599.00",
      }
    ]
  },
  {
    id: "ord-electronics-hub-007",
    orderId: "20250203001",
    customerId: "cust-electronics-hub", // German business customer
    billerId: null,
    currency: "EUR" as const,
    orderStatus: "shipped" as const,
    paymentStatus: "paid" as const,
    priority: "high" as const,
    subtotal: "5490.00",
    discountType: "percentage",
    discountValue: "8.00",
    taxRate: "19.00",
    taxAmount: "958.18",
    shippingCost: "75.00",
    actualShippingCost: "65.00",
    grandTotal: "5973.18",
    notes: "Electronics Hub GmbH - Wholesale order, 8% bulk discount",
    attachmentUrl: null,
    createdAt: new Date("2025-02-03T09:00:00Z"),
    updatedAt: new Date("2025-02-03T15:30:00Z"),
    shippedAt: new Date("2025-02-03T15:30:00Z"),
    items: [
      {
        id: nanoid(),
        productName: "Xiaomi 14 Pro",
        sku: "XIAOMI-14PRO-512-BLK",
        quantity: 5,
        price: "899.00",
        discount: "359.60", // 8% discount
        tax: "0.00",
        total: "4135.40",
      },
      {
        id: nanoid(),
        productName: "Samsung Galaxy Watch 6",
        sku: "SAMSUNG-GW6-44-SLV",
        quantity: 3,
        price: "329.00",
        discount: "78.96", // 8% discount
        tax: "0.00",
        total: "908.04",
      }
    ]
  },
  {
    id: "ord-lukas-tech-008",
    orderId: "20250203002",
    customerId: "cust-lukas-krejci", // Regular tech customer
    billerId: null,
    currency: "CZK" as const,
    orderStatus: "to_fulfill" as const,
    paymentStatus: "paid" as const,
    priority: "medium" as const,
    subtotal: "39500.00",
    discountType: null,
    discountValue: "0.00",
    taxRate: "21.00",
    taxAmount: "8295.00",
    shippingCost: "0.00", // Free shipping over certain amount
    actualShippingCost: "0.00",
    grandTotal: "47795.00",
    notes: "Lukáš Krejčí - Tech enthusiast, early adopter package",
    attachmentUrl: null,
    createdAt: new Date("2025-02-03T14:20:00Z"),
    updatedAt: new Date("2025-02-03T14:20:00Z"),
    shippedAt: null,
    items: [
      {
        id: nanoid(),
        productName: "iPhone 15 Pro Max",
        sku: "APPLE-IP15PM-256",
        quantity: 1,
        price: "32000.00",
        discount: "0.00",
        tax: "0.00",
        total: "32000.00",
      },
      {
        id: nanoid(),
        productName: "AirPods Pro (2nd Gen)",
        sku: "APPLE-APP-2GEN-USB",
        quantity: 1,
        price: "7500.00",
        discount: "0.00",
        tax: "0.00",
        total: "7500.00",
      }
    ]
  },
  {
    id: "ord-home-design-009",
    orderId: "20250204001",
    customerId: "cust-home-design", // Slovak business customer
    billerId: null,
    currency: "EUR" as const,
    orderStatus: "shipped" as const,
    paymentStatus: "paid" as const,
    priority: "medium" as const,
    subtotal: "2880.00",
    discountType: "fixed",
    discountValue: "150.00",
    taxRate: "20.00",
    taxAmount: "546.00",
    shippingCost: "40.00",
    actualShippingCost: "35.00",
    grandTotal: "3316.00",
    notes: "Home Design Slovakia - Interior design project furniture",
    attachmentUrl: null,
    createdAt: new Date("2025-02-04T10:00:00Z"),
    updatedAt: new Date("2025-02-04T16:20:00Z"),
    shippedAt: new Date("2025-02-04T16:20:00Z"),
    items: [
      {
        id: nanoid(),
        productName: "IKEA LINNMON Desk",
        sku: "IKEA-LINNMON-120-WHT",
        quantity: 8,
        price: "32.00", // Converted to EUR
        discount: "20.48", // Bulk discount
        tax: "0.00",
        total: "235.52",
      },
      {
        id: nanoid(),
        productName: "IKEA MARKUS Office Chair",
        sku: "IKEA-MARKUS-GRY-ADJ",
        quantity: 6,
        price: "115.00", // Converted to EUR
        discount: "41.40", // Bulk discount
        tax: "0.00",
        total: "648.60",
      }
    ]
  },
  {
    id: "ord-sport-shop-010",
    orderId: "20250204002",
    customerId: "cust-sport-shop", // German sports retailer
    billerId: null,
    currency: "EUR" as const,
    orderStatus: "to_fulfill" as const,
    paymentStatus: "paid" as const,
    priority: "high" as const,
    subtotal: "1890.00",
    discountType: "percentage",
    discountValue: "6.00",
    taxRate: "19.00",
    taxAmount: "337.11",
    shippingCost: "30.00",
    actualShippingCost: "0.00",
    grandTotal: "2104.61",
    notes: "Sport Shop Berlin - Spring sports equipment stock",
    attachmentUrl: null,
    createdAt: new Date("2025-02-04T12:30:00Z"),
    updatedAt: new Date("2025-02-04T12:30:00Z"),
    shippedAt: null,
    items: [
      {
        id: nanoid(),
        productName: "Nike Air Max 270",
        sku: "NIKE-AM270-BLK-42",
        quantity: 8,
        price: "119.99",
        discount: "57.60", // 6% discount
        tax: "0.00",
        total: "902.32",
      },
      {
        id: nanoid(),
        productName: "Nike Dri-FIT Training Shirt",
        sku: "NIKE-DF-TRAIN-L-BLU",
        quantity: 15,
        price: "29.99",
        discount: "27.00", // 6% discount
        tax: "0.00",
        total: "422.85",
      },
      {
        id: nanoid(),
        productName: "Nike Sportswear Tech Fleece",
        sku: "NIKE-TECH-FLEECE-XL-BLK",
        quantity: 6,
        price: "89.99",
        discount: "32.40", // 6% discount
        tax: "0.00",
        total: "507.54",
      }
    ]
  },
];

// Additional expenses with comprehensive data
const comprehensiveExpenses = [
  // January 2025 Expenses
  {
    id: nanoid(),
    expenseId: "EXP2501001",
    name: "Prague Main Warehouse Rent - January",
    category: "Rent",
    amount: "45000.00",
    currency: "CZK" as const,
    recurring: "monthly" as const,
    paymentMethod: "bank_transfer",
    status: "paid" as const,
    date: new Date("2025-01-01T09:00:00Z"),
    description: "Monthly warehouse rent for Prague main facility - 1,500 sqm",
  },
  {
    id: nanoid(),
    expenseId: "EXP2501002",
    name: "Staff Salaries - January 2025",
    category: "Salaries",
    amount: "285000.00",
    currency: "CZK" as const,
    recurring: "monthly" as const,
    paymentMethod: "bank_transfer",
    status: "paid" as const,
    date: new Date("2025-01-25T10:00:00Z"),
    description: "Monthly salaries for 12 full-time employees including warehouse staff, admin, and management",
  },
  {
    id: nanoid(),
    expenseId: "EXP2501003",
    name: "DHL Express Shipping Contract",
    category: "Shipping",
    amount: "3200.00",
    currency: "EUR" as const,
    recurring: "monthly" as const,
    paymentMethod: "credit_card",
    status: "paid" as const,
    date: new Date("2025-01-15T11:00:00Z"),
    description: "Monthly bulk shipping contract for European deliveries",
  },
  {
    id: nanoid(),
    expenseId: "EXP2501004",
    name: "Office Supplies Purchase",
    category: "Office Supplies",
    amount: "8500.00",
    currency: "CZK" as const,
    recurring: null,
    paymentMethod: "credit_card",
    status: "paid" as const,
    date: new Date("2025-01-10T14:00:00Z"),
    description: "Printer paper, ink cartridges, stationery, and organizational supplies",
  },
  {
    id: nanoid(),
    expenseId: "EXP2501005",
    name: "Electricity Bill - All Locations",
    category: "Utilities",
    amount: "18750.00",
    currency: "CZK" as const,
    recurring: "monthly" as const,
    paymentMethod: "bank_transfer",
    status: "paid" as const,
    date: new Date("2025-01-20T09:00:00Z"),
    description: "Electricity for Prague warehouse, Berlin warehouse, and office",
  },
  {
    id: nanoid(),
    expenseId: "EXP2501006",
    name: "Internet & Phone Services",
    category: "Utilities",
    amount: "450.00",
    currency: "EUR" as const,
    recurring: "monthly" as const,
    paymentMethod: "bank_transfer",
    status: "paid" as const,
    date: new Date("2025-01-05T10:00:00Z"),
    description: "Business internet fiber connection and VoIP phone system",
  },
  {
    id: nanoid(),
    expenseId: "EXP2501007",
    name: "Forklift Maintenance",
    category: "Equipment",
    amount: "12000.00",
    currency: "CZK" as const,
    recurring: null,
    paymentMethod: "bank_transfer",
    status: "paid" as const,
    date: new Date("2025-01-18T13:00:00Z"),
    description: "Quarterly maintenance and repair for 3 warehouse forklifts",
  },
  {
    id: nanoid(),
    expenseId: "EXP2501008",
    name: "Marketing Campaign - Google Ads",
    category: "Marketing",
    amount: "1500.00",
    currency: "EUR" as const,
    recurring: "monthly" as const,
    paymentMethod: "credit_card",
    status: "paid" as const,
    date: new Date("2025-01-12T10:00:00Z"),
    description: "Google Ads campaign for January - targeting European markets",
  },
  
  // February 2025 Expenses
  {
    id: nanoid(),
    expenseId: "EXP2502001",
    name: "Prague Main Warehouse Rent - February",
    category: "Rent",
    amount: "45000.00",
    currency: "CZK" as const,
    recurring: "monthly" as const,
    paymentMethod: "bank_transfer",
    status: "paid" as const,
    date: new Date("2025-02-01T09:00:00Z"),
    description: "Monthly warehouse rent for Prague main facility - 1,500 sqm",
  },
  {
    id: nanoid(),
    expenseId: "EXP2502002",
    name: "Staff Salaries - February 2025",
    category: "Salaries",
    amount: "285000.00",
    currency: "CZK" as const,
    recurring: "monthly" as const,
    paymentMethod: "bank_transfer",
    status: "paid" as const,
    date: new Date("2025-02-25T10:00:00Z"),
    description: "Monthly salaries for 12 full-time employees including warehouse staff, admin, and management",
  },
  {
    id: nanoid(),
    expenseId: "EXP2502003",
    name: "WMS Software License",
    category: "Software",
    amount: "850.00",
    currency: "EUR" as const,
    recurring: "yearly" as const,
    paymentMethod: "credit_card",
    status: "paid" as const,
    date: new Date("2025-02-04T13:00:00Z"),
    description: "Annual warehouse management system license - Enterprise plan",
  },
  {
    id: nanoid(),
    expenseId: "EXP2502004",
    name: "Vehicle Insurance Premium",
    category: "Insurance",
    amount: "35000.00",
    currency: "CZK" as const,
    recurring: "yearly" as const,
    paymentMethod: "bank_transfer",
    status: "paid" as const,
    date: new Date("2025-02-10T11:00:00Z"),
    description: "Annual insurance for 3 delivery vans and 2 trucks",
  },
  {
    id: nanoid(),
    expenseId: "EXP2502005",
    name: "Business Travel - Trade Fair Berlin",
    category: "Travel",
    amount: "2300.00",
    currency: "EUR" as const,
    recurring: null,
    paymentMethod: "credit_card",
    status: "paid" as const,
    date: new Date("2025-02-15T09:00:00Z"),
    description: "Hotel, flights, and expenses for 3 staff attending Berlin Electronics Trade Fair",
  },
  {
    id: nanoid(),
    expenseId: "EXP2502006",
    name: "Packaging Materials",
    category: "Inventory",
    amount: "18500.00",
    currency: "CZK" as const,
    recurring: null,
    paymentMethod: "bank_transfer",
    status: "pending" as const,
    date: new Date("2025-02-28T14:00:00Z"),
    description: "Bulk purchase of boxes, bubble wrap, tape, and shipping labels",
  },
  {
    id: nanoid(),
    expenseId: "EXP2502007",
    name: "Legal Consultation",
    category: "Legal",
    amount: "500.00",
    currency: "EUR" as const,
    recurring: null,
    paymentMethod: "bank_transfer",
    status: "pending" as const,
    date: new Date("2025-02-20T10:00:00Z"),
    description: "Legal consultation for new EU import regulations",
  },
  {
    id: nanoid(),
    expenseId: "EXP2502008",
    name: "Security System Upgrade",
    category: "Equipment",
    amount: "45000.00",
    currency: "CZK" as const,
    recurring: null,
    paymentMethod: "bank_transfer",
    status: "pending" as const,
    date: new Date("2025-02-22T11:00:00Z"),
    description: "Installation of new CCTV cameras and access control system",
  },
  {
    id: nanoid(),
    expenseId: "EXP2502009",
    name: "Cleaning Services",
    category: "Utilities",
    amount: "8000.00",
    currency: "CZK" as const,
    recurring: "monthly" as const,
    paymentMethod: "bank_transfer",
    status: "paid" as const,
    date: new Date("2025-02-05T09:00:00Z"),
    description: "Monthly professional cleaning for all warehouse and office areas",
  },
  {
    id: nanoid(),
    expenseId: "EXP2502010",
    name: "Accounting Software - QuickBooks",
    category: "Software",
    amount: "89.00",
    currency: "EUR" as const,
    recurring: "monthly" as const,
    paymentMethod: "credit_card",
    status: "paid" as const,
    date: new Date("2025-02-01T10:00:00Z"),
    description: "QuickBooks Online Plus subscription for accounting",
  },
  
  // March 2025 Expenses (Future/Pending)
  {
    id: nanoid(),
    expenseId: "EXP2503001",
    name: "Prague Main Warehouse Rent - March",
    category: "Rent",
    amount: "45000.00",
    currency: "CZK" as const,
    recurring: "monthly" as const,
    paymentMethod: "bank_transfer",
    status: "pending" as const,
    date: new Date("2025-03-01T09:00:00Z"),
    description: "Monthly warehouse rent for Prague main facility - 1,500 sqm",
  },
  {
    id: nanoid(),
    expenseId: "EXP2503002",
    name: "Staff Salaries - March 2025",
    category: "Salaries",
    amount: "285000.00",
    currency: "CZK" as const,
    recurring: "monthly" as const,
    paymentMethod: "bank_transfer",
    status: "pending" as const,
    date: new Date("2025-03-25T10:00:00Z"),
    description: "Monthly salaries for 12 full-time employees",
  },
  {
    id: nanoid(),
    expenseId: "EXP2503003",
    name: "New Warehouse Shelving System",
    category: "Equipment",
    amount: "8500.00",
    currency: "EUR" as const,
    recurring: null,
    paymentMethod: "bank_transfer",
    status: "pending" as const,
    date: new Date("2025-03-10T14:00:00Z"),
    description: "Heavy-duty industrial shelving for expanded storage capacity",
  },
  {
    id: nanoid(),
    expenseId: "EXP2503004",
    name: "Employee Training Program",
    category: "Consulting",
    amount: "1200.00",
    currency: "EUR" as const,
    recurring: null,
    paymentMethod: "bank_transfer",
    status: "pending" as const,
    date: new Date("2025-03-15T09:00:00Z"),
    description: "Professional training on new WMS system and safety procedures",
  },
  {
    id: nanoid(),
    expenseId: "EXP2503005",
    name: "Tax Preparation Services",
    category: "Legal",
    amount: "25000.00",
    currency: "CZK" as const,
    recurring: "yearly" as const,
    paymentMethod: "bank_transfer",
    status: "pending" as const,
    date: new Date("2025-03-20T10:00:00Z"),
    description: "Annual tax preparation and filing services",
  },
];

// Sales/Discount campaigns
const comprehensiveSales = [
  {
    id: nanoid(),
    name: "Spring Electronics Sale 2025",
    description: "Major discount on all electronics for spring season",
    discountType: "percentage" as const,
    discountValue: "15.00",
    minOrderAmount: "500.00",
    maxDiscount: "1000.00",
    currency: "EUR" as const,
    startDate: new Date("2025-03-01T00:00:00Z"),
    endDate: new Date("2025-03-31T23:59:59Z"),
    isActive: true,
    applicableProducts: ["cat-electronics"],
    applicableCustomers: [],
    usageLimit: 1000,
    usageCount: 147,
    createdAt: new Date("2025-02-15T10:00:00Z"),
    updatedAt: new Date("2025-02-15T10:00:00Z"),
  },
  {
    id: nanoid(),
    name: "VIP Customer Loyalty Program",
    description: "Exclusive discounts for VIP customers",
    discountType: "percentage" as const,
    discountValue: "5.00",
    minOrderAmount: "0.00",
    maxDiscount: "2000.00",
    currency: "EUR" as const,
    startDate: new Date("2025-01-01T00:00:00Z"),
    endDate: new Date("2025-12-31T23:59:59Z"),
    isActive: true,
    applicableProducts: [],
    applicableCustomers: ["vip"],
    usageLimit: null,
    usageCount: 89,
    createdAt: new Date("2025-01-01T10:00:00Z"),
    updatedAt: new Date("2025-01-01T10:00:00Z"),
  },
  {
    id: nanoid(),
    name: "Fashion Forward February",
    description: "Fashion and apparel discount for early spring collection",
    discountType: "fixed" as const,
    discountValue: "25.00",
    minOrderAmount: "150.00",
    maxDiscount: "100.00",
    currency: "EUR" as const,
    startDate: new Date("2025-02-01T00:00:00Z"),
    endDate: new Date("2025-02-28T23:59:59Z"),
    isActive: true,
    applicableProducts: ["cat-fashion"],
    applicableCustomers: [],
    usageLimit: 500,
    usageCount: 78,
    createdAt: new Date("2025-01-25T10:00:00Z"),
    updatedAt: new Date("2025-01-25T10:00:00Z"),
  },
  {
    id: nanoid(),
    name: "Business Bulk Discount",
    description: "Special pricing for business customers on large orders",
    discountType: "percentage" as const,
    discountValue: "8.00",
    minOrderAmount: "2000.00",
    maxDiscount: "5000.00",
    currency: "EUR" as const,
    startDate: new Date("2025-01-01T00:00:00Z"),
    endDate: new Date("2025-12-31T23:59:59Z"),
    isActive: true,
    applicableProducts: [],
    applicableCustomers: ["business"],
    usageLimit: null,
    usageCount: 23,
    createdAt: new Date("2025-01-01T10:00:00Z"),
    updatedAt: new Date("2025-01-01T10:00:00Z"),
  },
  {
    id: nanoid(),
    name: "Sports & Outdoor Winter Clearance",
    description: "End of winter clearance for sports equipment",
    discountType: "percentage" as const,
    discountValue: "20.00",
    minOrderAmount: "100.00",
    maxDiscount: "500.00",
    currency: "EUR" as const,
    startDate: new Date("2025-02-15T00:00:00Z"),
    endDate: new Date("2025-03-15T23:59:59Z"),
    isActive: true,
    applicableProducts: ["cat-sports"],
    applicableCustomers: [],
    usageLimit: 200,
    usageCount: 34,
    createdAt: new Date("2025-02-10T10:00:00Z"),
    updatedAt: new Date("2025-02-10T10:00:00Z"),
  },
];

export async function seedComprehensiveData() {
  try {
    console.log("🌱 Starting comprehensive data seeding...");

    // Clear existing data first
    console.log("🧹 Clearing existing mock data...");
    
    // Seed categories
    console.log("📁 Seeding categories...");
    for (const category of comprehensiveMockData.categories) {
      await storage.createCategory(category);
    }
    
    // Seed warehouses
    console.log("🏢 Seeding warehouses...");
    for (const warehouse of comprehensiveMockData.warehouses) {
      await storage.createWarehouse(warehouse);
    }
    
    // Seed suppliers
    console.log("🏭 Seeding suppliers...");
    for (const supplier of comprehensiveMockData.suppliers) {
      await storage.createSupplier(supplier);
    }
    
    // Seed products
    console.log("📦 Seeding products...");
    for (const product of comprehensiveMockData.products) {
      await storage.createProduct(product);
    }
    
    // Seed customers
    console.log("👥 Seeding customers...");
    for (const customer of comprehensiveMockData.customers) {
      await storage.createCustomer(customer);
    }
    
    // Seed orders with items
    console.log("📋 Seeding orders with items...");
    for (const orderData of comprehensiveOrders) {
      const { items, ...order } = orderData;
      
      // Create the order
      const newOrder = await storage.createOrder(order);
      
      // Create order items
      for (const item of items) {
        await storage.createOrderItem({
          ...item,
          orderId: newOrder.id,
          productId: null, // Not linking to actual products for now
        });
      }
    }
    
    // Seed expenses
    console.log("💰 Seeding expenses...");
    for (const expense of comprehensiveExpenses) {
      await storage.createExpense(expense);
    }
    
    // Seed sales campaigns
    console.log("🎯 Seeding sales campaigns...");
    for (const sale of comprehensiveSales) {
      await storage.createSale(sale);
    }
    
    console.log("✅ Comprehensive data seeding completed successfully!");
    console.log(`📊 Data summary:
    - Categories: ${comprehensiveMockData.categories.length}
    - Warehouses: ${comprehensiveMockData.warehouses.length}
    - Suppliers: ${comprehensiveMockData.suppliers.length}
    - Products: ${comprehensiveMockData.products.length}
    - Customers: ${comprehensiveMockData.customers.length}
    - Orders: ${comprehensiveOrders.length}
    - Expenses: ${comprehensiveExpenses.length}
    - Sales Campaigns: ${comprehensiveSales.length}`);
    
    return {
      success: true,
      message: "Comprehensive mock data seeded successfully with proper relationships",
      counts: {
        categories: comprehensiveMockData.categories.length,
        warehouses: comprehensiveMockData.warehouses.length,
        suppliers: comprehensiveMockData.suppliers.length,
        products: comprehensiveMockData.products.length,
        customers: comprehensiveMockData.customers.length,
        orders: comprehensiveOrders.length,
        expenses: comprehensiveExpenses.length,
        sales: comprehensiveSales.length,
      }
    };
  } catch (error) {
    console.error("❌ Error seeding comprehensive data:", error);
    throw error;
  }
}

// Run the seeding function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedComprehensiveData()
    .then(() => {
      console.log("✨ Database seeded successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed to seed database:", error);
      process.exit(1);
    });
}