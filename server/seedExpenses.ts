import { storage } from "./storage";
import { nanoid } from "nanoid";

// Comprehensive expenses data
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

async function seedExpenses() {
  try {
    console.log("💰 Starting to seed expenses...");
    
    let successCount = 0;
    let skipCount = 0;
    
    for (const expense of comprehensiveExpenses) {
      try {
        await storage.createExpense(expense);
        successCount++;
        console.log(`✅ Added expense: ${expense.name}`);
      } catch (error: any) {
        if (error?.code === '23505') {
          // Duplicate key error - skip this expense
          skipCount++;
          console.log(`⏭️  Skipped existing expense: ${expense.name}`);
        } else {
          throw error;
        }
      }
    }
    
    console.log(`\n✨ Expense seeding completed!`);
    console.log(`📊 Summary: ${successCount} added, ${skipCount} skipped (already existed)`);
    console.log(`📈 Total expenses in data: ${comprehensiveExpenses.length}`);
    
    return {
      success: true,
      added: successCount,
      skipped: skipCount,
      total: comprehensiveExpenses.length
    };
  } catch (error) {
    console.error("❌ Error seeding expenses:", error);
    throw error;
  }
}

// Run the seeding function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedExpenses()
    .then((result) => {
      console.log("✨ Expenses seeded successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed to seed expenses:", error);
      process.exit(1);
    });
}

export { seedExpenses };