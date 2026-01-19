import { db } from '../server/db';
import { customers } from '../shared/schema';
import { sql, eq } from 'drizzle-orm';

const BRIGHT_DATA_API_KEY = process.env.BRIGHT_DATA_API_KEY;
// Facebook Profiles - Collect by URL API
const BRIGHT_DATA_DATASET_ID = 'gd_mf0urb782734ik94dz';
const BATCH_SIZE = 10;

async function extractUsername(url: string): Promise<string | null> {
  if (!url) return null;
  const cleanUrl = url.trim();
  
  // Pattern 1: profile.php?id=NUMERIC_ID
  let match = cleanUrl.match(/facebook\.com\/profile\.php\?id=(\d+)/i);
  if (match) return match[1];
  
  // Pattern 2: /people/Name/NUMERIC_ID
  match = cleanUrl.match(/facebook\.com\/people\/[^\/]+\/(\d+)/i);
  if (match) return match[1];
  
  // Pattern 3: Any numeric ID (10+ digits)
  match = cleanUrl.match(/facebook\.com\/.*?(\d{10,})/i);
  if (match) return match[1];
  
  // Pattern 4: Standard username
  match = cleanUrl.match(/facebook\.com\/([a-zA-Z0-9._-]+)\/?(?:\?|$|#)?/i);
  if (match) {
    const username = match[1].toLowerCase();
    const skipPaths = ['people', 'pages', 'groups', 'events', 'watch', 'marketplace', 'gaming', 'live', 'stories', 'reels'];
    if (!skipPaths.includes(username)) {
      return match[1];
    }
  }
  
  return null;
}

function buildFbUrl(username: string): string {
  if (/^\d+$/.test(username)) {
    return `https://www.facebook.com/profile.php?id=${username}`;
  }
  return `https://www.facebook.com/${username}`;
}

async function fetchBatchProfiles(urlsPayload: { url: string; customerId: string; username: string }[]): Promise<Map<string, any>> {
  const results = new Map<string, any>();
  
  try {
    // Trigger Bright Data collection
    const triggerResponse = await fetch(
      `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${BRIGHT_DATA_DATASET_ID}&include_errors=true&format=json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${BRIGHT_DATA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(urlsPayload.map(p => ({ url: p.url })))
      }
    );

    if (!triggerResponse.ok) {
      console.error(`Trigger failed: ${triggerResponse.status} - ${await triggerResponse.text()}`);
      return results;
    }

    const snapshotInfo = await triggerResponse.json();
    const snapshotId = snapshotInfo.snapshot_id;
    console.log(`  Snapshot ID: ${snapshotId}, waiting for results...`);

    // Poll for results (max 120 seconds for batch)
    let profiles: any[] = [];
    for (let attempt = 0; attempt < 120; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(
        `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`,
        { headers: { 'Authorization': `Bearer ${BRIGHT_DATA_API_KEY}` } }
      );

      if (statusResponse.status === 200) {
        profiles = await statusResponse.json();
        if (profiles && profiles.length > 0) {
          console.log(`  Got ${profiles.length} profiles after ${attempt + 1}s`);
          break;
        }
      } else if (statusResponse.status !== 202) {
        console.log(`  Status check returned: ${statusResponse.status}`);
        break;
      }
      
      if (attempt % 15 === 0 && attempt > 0) {
        console.log(`  Still waiting... (${attempt}s)`);
      }
    }

    // Match profiles to customers - Profiles API returns: url, name, id
    for (const payload of urlsPayload) {
      const profile = profiles.find((p: any) => {
        const profileUrl = (p.url || '').toLowerCase();
        return profileUrl.includes(payload.username.toLowerCase());
      });

      if (profile) {
        results.set(payload.customerId, {
          name: profile.name,
          numericId: profile.id
        });
      }
    }

  } catch (error) {
    console.error(`Batch error:`, error);
  }
  
  return results;
}

async function main() {
  if (!BRIGHT_DATA_API_KEY) {
    console.error('ERROR: BRIGHT_DATA_API_KEY not found in environment');
    process.exit(1);
  }

  console.log('Fetching customers with Facebook URLs...');
  
  // Get all customers with Facebook URLs that need updating
  const allCustomers = await db.select({
    id: customers.id,
    name: customers.name,
    facebookUrl: customers.facebookUrl,
    facebookName: customers.facebookName,
    facebookNumericId: customers.facebookNumericId,
    profilePictureUrl: customers.profilePictureUrl
  }).from(customers).where(
    sql`${customers.facebookUrl} IS NOT NULL AND ${customers.facebookUrl} != ''`
  );

  // Filter to only those missing data
  const customersNeedingUpdate = allCustomers.filter(c => 
    !c.facebookName || !c.facebookNumericId || !c.profilePictureUrl
  );

  console.log(`Found ${allCustomers.length} customers with Facebook URLs`);
  console.log(`${customersNeedingUpdate.length} need updating (missing name, ID, or picture)`);

  if (customersNeedingUpdate.length === 0) {
    console.log('All customers already have Facebook data!');
    process.exit(0);
  }

  let successCount = 0;
  let failedCount = 0;

  // Process in batches
  for (let i = 0; i < customersNeedingUpdate.length; i += BATCH_SIZE) {
    const batch = customersNeedingUpdate.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(customersNeedingUpdate.length / BATCH_SIZE);
    
    console.log(`\n[Batch ${batchNum}/${totalBatches}] Processing ${batch.length} customers...`);

    // Build URLs payload
    const urlsPayload: { url: string; customerId: string; username: string }[] = [];
    
    for (const customer of batch) {
      const username = await extractUsername(customer.facebookUrl || '');
      if (username) {
        urlsPayload.push({
          url: buildFbUrl(username),
          customerId: customer.id,
          username
        });
      }
    }

    if (urlsPayload.length === 0) {
      console.log('  No valid Facebook URLs in this batch');
      continue;
    }

    const profilesMap = await fetchBatchProfiles(urlsPayload);

    // Update customers in database
    for (const payload of urlsPayload) {
      const profile = profilesMap.get(payload.customerId);
      
      if (profile) {
        const numericId = profile.numericId;
        const fbName = profile.name;
        
        // Construct profile picture URL using numeric ID
        let pictureUrl: string | null = null;
        if (numericId && /^\d+$/.test(String(numericId))) {
          pictureUrl = `https://graph.facebook.com/${numericId}/picture?type=large`;
        }

        // Update customer in database
        await db.update(customers)
          .set({
            facebookName: fbName || undefined,
            facebookNumericId: numericId ? String(numericId) : undefined,
            profilePictureUrl: pictureUrl || undefined
          })
          .where(eq(customers.id, payload.customerId));

        console.log(`  ✓ ${fbName || 'Unknown'} (ID: ${numericId || 'N/A'})`);
        successCount++;
      } else {
        console.log(`  ✗ No data for ${payload.username}`);
        failedCount++;
      }
    }

    // Delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < customersNeedingUpdate.length) {
      console.log('  Waiting 3s before next batch...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failedCount}`);
  
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
