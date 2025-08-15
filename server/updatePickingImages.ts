import { db } from "./db";
import { products } from "@shared/schema";
import { eq } from "drizzle-orm";

// Array of picking-specific placeholder images
const pickingImages = [
  'https://via.placeholder.com/600x600/FF6B6B/FFFFFF?text=Picking+Zone+A',
  'https://via.placeholder.com/600x600/4ECDC4/FFFFFF?text=Picking+Zone+B',
  'https://via.placeholder.com/600x600/45B7D1/FFFFFF?text=Picking+Zone+C',
  'https://via.placeholder.com/600x600/96CEB4/FFFFFF?text=Picking+Zone+D',
  'https://via.placeholder.com/600x600/FFEAA7/FFFFFF?text=Picking+Zone+E',
  'https://via.placeholder.com/600x600/DDA0DD/FFFFFF?text=Picking+Zone+F',
  'https://via.placeholder.com/600x600/98D8C8/FFFFFF?text=Picking+Zone+G',
  'https://via.placeholder.com/600x600/F7DC6F/FFFFFF?text=Picking+Zone+H',
  'https://via.placeholder.com/600x600/85C1E2/FFFFFF?text=Picking+Zone+I',
  'https://via.placeholder.com/600x600/F8B739/FFFFFF?text=Picking+Zone+J',
];

// Product-specific picking images with warehouse location hints
const productPickingImages: Record<string, string> = {
  'laptop': 'https://via.placeholder.com/600x600/4F46E5/FFFFFF?text=Laptop+A1-B2',
  'phone': 'https://via.placeholder.com/600x600/059669/FFFFFF?text=Phone+C3-D4',
  'tablet': 'https://via.placeholder.com/600x600/DC2626/FFFFFF?text=Tablet+E5-F6',
  'watch': 'https://via.placeholder.com/600x600/EA580C/FFFFFF?text=Watch+G7-H8',
  'headphones': 'https://via.placeholder.com/600x600/9333EA/FFFFFF?text=Headphones+I9-J10',
  'speaker': 'https://via.placeholder.com/600x600/2563EB/FFFFFF?text=Speaker+K11-L12',
  'camera': 'https://via.placeholder.com/600x600/16A34A/FFFFFF?text=Camera+M13-N14',
  'monitor': 'https://via.placeholder.com/600x600/CA8A04/FFFFFF?text=Monitor+O15-P16',
  'keyboard': 'https://via.placeholder.com/600x600/DC2626/FFFFFF?text=Keyboard+Q17-R18',
  'mouse': 'https://via.placeholder.com/600x600/0891B2/FFFFFF?text=Mouse+S19-T20',
  'charger': 'https://via.placeholder.com/600x600/7C3AED/FFFFFF?text=Charger+U21-V22',
  'cable': 'https://via.placeholder.com/600x600/DB2777/FFFFFF?text=Cable+W23-X24',
  'adapter': 'https://via.placeholder.com/600x600/059669/FFFFFF?text=Adapter+Y25-Z26',
  'case': 'https://via.placeholder.com/600x600/DC2626/FFFFFF?text=Case+AA27-BB28',
  'screen': 'https://via.placeholder.com/600x600/EA580C/FFFFFF?text=Screen+CC29-DD30',
};

async function updatePickingImages() {
  console.log('Updating product picking images...');
  
  try {
    // Get all products
    const allProducts = await db.select().from(products);
    console.log(`Found ${allProducts.length} products to update`);
    
    let updateCount = 0;
    
    for (const product of allProducts) {
      // Try to match product name with specific picking image
      let pickingImageUrl = null;
      const productNameLower = product.name.toLowerCase();
      
      // Check if product name contains any of our keywords
      for (const [keyword, imageUrl] of Object.entries(productPickingImages)) {
        if (productNameLower.includes(keyword)) {
          pickingImageUrl = imageUrl;
          break;
        }
      }
      
      // If no specific match, use a zone-based image
      if (!pickingImageUrl) {
        // Use product ID to deterministically select an image
        const index = product.id.charCodeAt(0) % pickingImages.length;
        pickingImageUrl = pickingImages[index];
      }
      
      // Update the product with picking image
      await db
        .update(products)
        .set({ 
          pickingImageUrl,
          updatedAt: new Date()
        })
        .where(eq(products.id, product.id));
      
      updateCount++;
      console.log(`Updated ${product.name} with picking image`);
    }
    
    console.log(`✅ Successfully updated ${updateCount} products with picking images`);
  } catch (error) {
    console.error('Error updating picking images:', error);
    process.exit(1);
  }
}

// Run the update
updatePickingImages()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });