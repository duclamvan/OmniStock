import * as fs from 'fs';

const INPUT_FILE = 'attached_assets/sd_mkkh2jd622swos1so7_1768819945733.csv';
const OUTPUT_FILE = 'facebook_production_migration.sql';

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

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

function main() {
  const content = fs.readFileSync(INPUT_FILE, 'utf-8');
  const records = parseCSV(content);

  let sql = `-- Facebook Production Migration
-- Generated: ${new Date().toISOString()}
-- Records: ${records.length}

-- Add facebook_numeric_id column if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'facebook_numeric_id') THEN
    ALTER TABLE customers ADD COLUMN facebook_numeric_id VARCHAR(50);
  END IF;
END $$;

-- Update customers by exact URL match
`;

  for (const r of records) {
    const picUrl = `https://graph.facebook.com/${r.id}/picture?type=large`;
    sql += `UPDATE customers SET name='${escapeSQL(r.name)}', facebook_name='${escapeSQL(r.name)}', facebook_numeric_id='${r.id}', profile_picture_url='${picUrl}' WHERE facebook_url='${escapeSQL(r.url)}';\n`;
  }

  sql += `\n-- Verify: SELECT COUNT(*) FROM customers WHERE facebook_numeric_id IS NOT NULL;\n`;

  fs.writeFileSync(OUTPUT_FILE, sql);
  console.log(`Generated: ${OUTPUT_FILE} with ${records.length} UPDATE statements`);
}

main();
