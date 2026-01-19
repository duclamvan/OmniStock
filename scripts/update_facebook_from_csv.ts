import { db } from '../server/db';
import { customers } from '../shared/schema';
import { sql, ilike, or } from 'drizzle-orm';
import * as fs from 'fs';

const INPUT_FILE = 'attached_assets/sd_mkkh2jd622swos1so7_1768819945733.csv';

interface FacebookRecord {
  name: string;
  id: string;
  url: string;
  path: string;
}

function extractPath(url: string): string {
  try {
    const urlObj = new URL(url);
    if (urlObj.searchParams.has('id')) {
      return urlObj.searchParams.get('id') || '';
    }
    const pathParts = urlObj.pathname.split('/').filter(p => p);
    return pathParts[pathParts.length - 1] || '';
  } catch {
    const match = url.match(/facebook\.com\/([^\/\?]+)/);
    return match ? match[1] : '';
  }
}

function parseCSV(content: string): FacebookRecord[] {
  const lines = content.split('\n');
  const records: FacebookRecord[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    if (parts.length < 3) continue;
    
    const name = parts[0].trim();
    const id = parts[1].trim();
    const url = parts[2].trim();
    
    if (!name || !id || !url || url.includes('#ERROR')) continue;
    
    const path = extractPath(url);
    records.push({ name, id, url, path });
  }
  
  return records;
}

async function main() {
  console.log('Reading CSV file...');
  const content = fs.readFileSync(INPUT_FILE, 'utf-8');
  const records = parseCSV(content);
  console.log(`Parsed ${records.length} valid records`);

  let matchedCount = 0;
  let notFoundCount = 0;

  for (const record of records) {
    const profilePictureUrl = `https://graph.facebook.com/${record.id}/picture?type=large`;
    
    const result = await db.update(customers)
      .set({
        name: record.name,
        facebookName: record.name,
        facebookNumericId: record.id,
        profilePictureUrl: profilePictureUrl
      })
      .where(
        or(
          ilike(customers.facebookUrl, `%${record.path}%`),
          ilike(customers.facebookUrl, `%${record.id}%`),
          sql`${customers.facebookUrl} ILIKE ${'%profile.php?id=' + record.id + '%'}`
        )
      )
      .returning({ id: customers.id });

    if (result.length > 0) {
      matchedCount += result.length;
      console.log(`✓ Matched ${result.length}: ${record.name} (${record.path})`);
    } else {
      notFoundCount++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Matched & updated: ${matchedCount}`);
  console.log(`Not found: ${notFoundCount}`);

  const finalCounts = await db.select({
    total: sql<number>`COUNT(*)`,
    withName: sql<number>`COUNT(CASE WHEN facebook_name IS NOT NULL AND facebook_name != '' THEN 1 END)`,
    withId: sql<number>`COUNT(CASE WHEN facebook_numeric_id IS NOT NULL AND facebook_numeric_id != '' THEN 1 END)`
  }).from(customers);
  
  console.log(`\nTotal customers: ${finalCounts[0].total}`);
  console.log(`With Facebook name: ${finalCounts[0].withName}`);
  console.log(`With numeric ID: ${finalCounts[0].withId}`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
