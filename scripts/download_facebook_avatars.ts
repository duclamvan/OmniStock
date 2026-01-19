import { db } from '../server/db';
import { customers } from '../shared/schema';
import { eq, isNotNull, like, and, not } from 'drizzle-orm';
import { downloadAndStoreProfilePicture } from '../server/services/avatarService';

async function main() {
  console.log('Fetching customers with Facebook Graph URLs...');
  
  const customersToUpdate = await db.select({
    id: customers.id,
    name: customers.name,
    facebookNumericId: customers.facebookNumericId,
    profilePictureUrl: customers.profilePictureUrl
  })
  .from(customers)
  .where(
    and(
      isNotNull(customers.profilePictureUrl),
      like(customers.profilePictureUrl, 'https://graph.facebook%'),
      not(like(customers.profilePictureUrl, '/uploads/%'))
    )
  );

  console.log(`Found ${customersToUpdate.length} customers with Facebook Graph URLs`);
  
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < customersToUpdate.length; i++) {
    const customer = customersToUpdate[i];
    if (!customer.profilePictureUrl) continue;
    
    try {
      console.log(`[${i+1}/${customersToUpdate.length}] Downloading avatar for: ${customer.name}`);
      
      const result = await downloadAndStoreProfilePicture(customer.profilePictureUrl, customer.id);
      
      if (result && result.localPath) {
        await db.update(customers)
          .set({ profilePictureUrl: result.localPath })
          .where(eq(customers.id, customer.id));
        successCount++;
        console.log(`  ✓ Saved to: ${result.localPath}`);
      } else {
        failCount++;
        console.log(`  ✗ Failed to download`);
      }
    } catch (error) {
      failCount++;
      console.error(`  ✗ Error:`, error);
    }
    
    // Small delay to avoid rate limiting
    if (i > 0 && i % 10 === 0) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log('\n=== COMPLETE ===');
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
}

main().catch(console.error);
