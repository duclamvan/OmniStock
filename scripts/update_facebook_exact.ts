import { db } from '../server/db';
import { customers } from '../shared/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';

const INPUT_FILE = 'attached_assets/sd_mkkh2jd622swos1so7_1768819945733.csv';

function parseCSV(content: string): Array<{name: string, id: string, url: string}> {
  const lines = content.split('\n');
  const records: Array<{name: string, id: string, url: string}> = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    if (parts.length < 3) continue;
    
    const name = parts[0].trim();
    const id = parts[1].trim();
    const url = parts[2].trim();
    
    if (!name || !id || !url || url.includes('#ERROR')) continue;
    records.push({ name, id, url });
  }
  
  return records;
}

async function main() {
  console.log('Reading CSV file...');
  const content = fs.readFileSync(INPUT_FILE, 'utf-8');
  const records = parseCSV(content);
  console.log(`Parsed ${records.length} valid records`);

  let matchedCount = 0;

  for (const record of records) {
    const profilePictureUrl = `https://graph.facebook.com/${record.id}/picture?type=large`;
    
    const result = await db.update(customers)
      .set({
        name: record.name,
        facebookName: record.name,
        facebookNumericId: record.id,
        profilePictureUrl: profilePictureUrl
      })
      .where(eq(customers.facebookUrl, record.url))
      .returning({ id: customers.id });

    if (result.length > 0) {
      matchedCount++;
      if (matchedCount % 50 === 0) console.log(`Updated ${matchedCount}...`);
    }
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Matched & updated: ${matchedCount} of ${records.length}`);
}

main().catch(console.error);
