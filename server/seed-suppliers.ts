import { db } from "./db";
import { suppliers } from "../shared/schema";

async function seedSuppliers() {
  try {
    // Insert mock suppliers
    const mockSuppliers = [
      {
        id: "sup-1",
        name: "TechParts GmbH",
        contactPerson: "Hans Mueller",
        email: "info@techparts.de",
        phone: "+49 30 123456",
        address: "Hauptstraße 123, 10115 Berlin",
        country: "Germany",
        website: "https://techparts.de",
        supplierLink: "https://catalog.techparts.de",
        lastPurchaseDate: new Date("2025-01-15"),
        totalPurchased: "45000",
        notes: "Reliable supplier for electronic components"
      },
      {
        id: "sup-2",
        name: "CzechSupply s.r.o.",
        contactPerson: "Jan Novák",
        email: "sales@czechsupply.cz",
        phone: "+420 234 567 890",
        address: "Pražská 456, 110 00 Praha 1",
        country: "Czech Republic",
        website: "https://czechsupply.cz",
        supplierLink: "https://b2b.czechsupply.cz",
        lastPurchaseDate: new Date("2025-01-20"),
        totalPurchased: "32000",
        notes: "Local supplier with fast delivery"
      },
      {
        id: "sup-3",
        name: "Asia Electronics Ltd",
        contactPerson: "Li Wei",
        email: "export@asiaelec.cn",
        phone: "+86 21 12345678",
        address: "No. 888 Nanjing Road, Shanghai",
        country: "China",
        website: "https://asiaelec.cn",
        supplierLink: "https://catalog.asiaelec.cn/en",
        lastPurchaseDate: new Date("2024-12-28"),
        totalPurchased: "125000",
        notes: "Main supplier for bulk orders, MOQ applies"
      },
      {
        id: "sup-4",
        name: "Euro Components SA",
        contactPerson: "Marie Dubois",
        email: "contact@eurocomponents.fr",
        phone: "+33 1 23 45 67 89",
        address: "15 Rue de la Paix, 75002 Paris",
        country: "France",
        website: "https://eurocomponents.fr",
        supplierLink: "https://shop.eurocomponents.fr",
        lastPurchaseDate: null,
        totalPurchased: "0",
        notes: "New supplier for premium components"
      },
      {
        id: "sup-5",
        name: "Vietnam Tech Co., Ltd",
        contactPerson: "Nguyen Van A",
        email: "sales@vietnamtech.vn",
        phone: "+84 28 3456 7890",
        address: "123 Nguyen Hue, District 1, Ho Chi Minh City",
        country: "Vietnam",
        website: "https://vietnamtech.vn",
        supplierLink: "https://order.vietnamtech.vn",
        lastPurchaseDate: new Date("2025-01-10"),
        totalPurchased: "18500",
        notes: "Good for sourcing Asian market products"
      }
    ];
    
    await db.insert(suppliers).values(mockSuppliers);
    console.log(`✓ Seeded ${mockSuppliers.length} suppliers`);
    
  } catch (error) {
    console.error("Error seeding suppliers:", error);
  }
}

seedSuppliers();