import { db } from '../server/db';
import { customers } from '../shared/schema';
import { eq, sql, isNotNull, ne } from 'drizzle-orm';
import * as fs from 'fs';

const INPUT_FILE = 'attached_assets/Pasted---1768784337246_1768784337246.txt';

interface FacebookData {
  name: string | null;
  id: string | null;
}

async function main() {
  console.log('Reading Facebook data file...');
  
  // Read and parse the file
  const content = fs.readFileSync(INPUT_FILE, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  console.log(`Found ${lines.length} lines in file`);
  
  // Parse valid Facebook data entries
  const facebookDataList: FacebookData[] = [];
  for (const line of lines) {
    try {
      const data = JSON.parse(line) as FacebookData;
      facebookDataList.push(data);
    } catch (e) {
      console.error(`Failed to parse line: ${line.substring(0, 50)}...`);
    }
  }
  
  console.log(`Parsed ${facebookDataList.length} entries`);
  
  // Get all customers with Facebook URLs in order
  const allCustomers = await db.select({
    id: customers.id,
    name: customers.name,
    facebookUrl: customers.facebookUrl,
    facebookName: customers.facebookName,
    facebookNumericId: customers.facebookNumericId,
  }).from(customers).where(
    sql`${customers.facebookUrl} IS NOT NULL AND ${customers.facebookUrl} != ''`
  ).orderBy(customers.id);

  console.log(`Found ${allCustomers.length} customers with Facebook URLs`);
  
  if (allCustomers.length !== facebookDataList.length) {
    console.log(`WARNING: Customer count (${allCustomers.length}) doesn't match data count (${facebookDataList.length})`);
    console.log('Will match by position up to the smaller count');
  }
  
  const maxIndex = Math.min(allCustomers.length, facebookDataList.length);
  let successCount = 0;
  let skippedCount = 0;
  let emptyCount = 0;

  for (let i = 0; i < maxIndex; i++) {
    const customer = allCustomers[i];
    const fbData = facebookDataList[i];
    
    // Skip empty entries
    if (!fbData.name && !fbData.id) {
      emptyCount++;
      continue;
    }
    
    // Skip if already has data
    if (customer.facebookName && customer.facebookNumericId) {
      skippedCount++;
      continue;
    }
    
    // Construct profile picture URL
    let profilePictureUrl: string | null = null;
    if (fbData.id && /^\d+$/.test(String(fbData.id))) {
      profilePictureUrl = `https://graph.facebook.com/${fbData.id}/picture?type=large`;
    }
    
    // Update customer
    await db.update(customers)
      .set({
        facebookName: fbData.name || undefined,
        facebookNumericId: fbData.id ? String(fbData.id) : undefined,
        profilePictureUrl: profilePictureUrl || undefined
      })
      .where(eq(customers.id, customer.id));
    
    console.log(`✓ ${i + 1}/${maxIndex}: ${customer.name} → ${fbData.name} (ID: ${fbData.id})`);
    successCount++;
  }

  console.log('\n=== IMPORT COMPLETE ===');
  console.log(`Updated: ${successCount}`);
  console.log(`Skipped (already had data): ${skippedCount}`);
  console.log(`Empty entries: ${emptyCount}`);
  
  // Verify final counts
  const finalCounts = await db.select({
    total: sql<number>`COUNT(*)`,
    withName: sql<number>`COUNT(CASE WHEN facebook_name IS NOT NULL AND facebook_name != '' THEN 1 END)`,
    withId: sql<number>`COUNT(CASE WHEN facebook_numeric_id IS NOT NULL AND facebook_numeric_id != '' THEN 1 END)`,
    withPicture: sql<number>`COUNT(CASE WHEN profile_picture_url IS NOT NULL AND profile_picture_url != '' THEN 1 END)`
  }).from(customers).where(
    sql`${customers.facebookUrl} IS NOT NULL AND ${customers.facebookUrl} != ''`
  );
  
  console.log('\n=== FINAL DATABASE STATE ===');
  console.log(`Total customers with FB URL: ${finalCounts[0].total}`);
  console.log(`With Facebook name: ${finalCounts[0].withName}`);
  console.log(`With numeric ID: ${finalCounts[0].withId}`);
  console.log(`With profile picture URL: ${finalCounts[0].withPicture}`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
