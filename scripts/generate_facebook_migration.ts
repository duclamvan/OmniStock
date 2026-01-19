import * as fs from 'fs';
import * as path from 'path';

const INPUT_FILE = 'attached_assets/sd_mkkh2jd622swos1so7_1768819771751.csv';
const OUTPUT_FILE = 'facebook_migration.sql';

interface FacebookRecord {
  name: string;
  id: string;
  url: string;
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
    
    records.push({ name, id, url });
  }
  
  return records;
}

function extractPathFromUrl(url: string): string {
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

function normalizeUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .toLowerCase();
}

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

function main() {
  console.log('Reading CSV file...');
  const content = fs.readFileSync(INPUT_FILE, 'utf-8');
  const records = parseCSV(content);
  console.log(`Parsed ${records.length} valid records`);

  let sql = `-- Facebook Data Migration Script
-- Generated on ${new Date().toISOString()}
-- Total records: ${records.length}

-- Step 1: Add facebook_numeric_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' AND column_name = 'facebook_numeric_id') THEN
        ALTER TABLE customers ADD COLUMN facebook_numeric_id VARCHAR(50);
    END IF;
END $$;

-- Step 2: Update customers with Facebook data
-- Matching logic: URL contains the path OR path matches numeric ID in profile.php?id= format

`;

  let updateCount = 0;
  for (const record of records) {
    const urlPath = extractPathFromUrl(record.url);
    const normalizedUrl = normalizeUrl(record.url);
    const profilePictureUrl = `https://graph.facebook.com/${record.id}/picture?type=large`;
    
    const escapedName = escapeSQL(record.name);
    const escapedId = escapeSQL(record.id);
    const escapedUrl = escapeSQL(record.url);
    const escapedPictureUrl = escapeSQL(profilePictureUrl);
    const escapedPath = escapeSQL(urlPath);
    
    sql += `-- ${record.name} (ID: ${record.id})
UPDATE customers SET 
    name = '${escapedName}',
    facebook_name = '${escapedName}',
    facebook_numeric_id = '${escapedId}',
    profile_picture_url = '${escapedPictureUrl}'
WHERE (
    LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%${escapedPath}%'
    OR LOWER(REPLACE(REPLACE(facebook_url, 'https://', ''), 'http://', '')) LIKE '%${escapedId}%'
    OR facebook_url LIKE '%profile.php?id=${escapedId}%'
)
AND (facebook_numeric_id IS NULL OR facebook_numeric_id = '');

`;
    updateCount++;
  }

  sql += `
-- Summary: ${updateCount} UPDATE statements generated
-- Run this script on your production database to apply Facebook data

-- Verify results:
-- SELECT COUNT(*) as updated FROM customers WHERE facebook_numeric_id IS NOT NULL AND facebook_numeric_id != '';
`;

  fs.writeFileSync(OUTPUT_FILE, sql, 'utf-8');
  console.log(`\nGenerated SQL file: ${OUTPUT_FILE}`);
  console.log(`Total UPDATE statements: ${updateCount}`);
  console.log('\nTo apply to production, run this SQL file on your production database.');
}

main();
