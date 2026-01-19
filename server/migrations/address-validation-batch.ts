import { db } from '../db';
import { customers } from '@shared/schema';
import { eq, inArray } from 'drizzle-orm';

interface NominatimResult {
  place_id: number;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

interface AddressComponents {
  street: string;
  streetNumber: string;
  city: string;
  zipCode: string;
  country: string;
  countryCode: string;
}

const BATCH_SIZE = 5;
const DELAY_BETWEEN_BATCHES = 1200;

async function geocodeAddress(address: string): Promise<AddressComponents | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&addressdetails=1&limit=1`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'DavieSupply/1.0 (address-batch-validation)' }
    });
    
    const data: NominatimResult[] = await response.json();
    if (!data || data.length === 0) return null;

    const addr = data[0].address;
    return {
      street: addr.road || '',
      streetNumber: addr.house_number || '',
      city: addr.city || addr.town || addr.village || addr.municipality || '',
      zipCode: addr.postcode || '',
      country: addr.country || '',
      countryCode: addr.country_code?.toUpperCase() || ''
    };
  } catch {
    return null;
  }
}

function cleanAddress(address: string): string {
  return address
    .replace(/[;]/g, ',')
    .replace(/\s+/g, ' ')
    .replace(/Gửi về\s*[,:]?\s*/gi, '')
    .replace(/gửi hàng tới\s*[,:]?\s*/gi, '')
    .replace(/Beauty nails\s*[,:]?\s*/gi, '')
    .replace(/nail[s]?\s*(studio|salon)?\s*[,:]?\s*/gi, '')
    .trim();
}

function buildAddress(customer: any): string {
  const parts: string[] = [];
  if (customer.address && customer.address !== 'no address in db') {
    parts.push(cleanAddress(customer.address));
  }
  if (customer.city) parts.push(customer.city);
  if (customer.zipCode && customer.zipCode.length > 3) parts.push(customer.zipCode);
  if (customer.country) parts.push(customer.country);
  return parts.join(', ');
}

function buildBillingAddress(customer: any): string {
  const parts: string[] = [];
  if (customer.billingStreet) {
    let street = cleanAddress(customer.billingStreet);
    if (customer.billingStreetNumber) street += ' ' + customer.billingStreetNumber;
    parts.push(street);
  }
  if (customer.billingCity) parts.push(customer.billingCity);
  if (customer.billingZipCode && customer.billingZipCode.length > 3) parts.push(customer.billingZipCode);
  if (customer.billingCountry) parts.push(customer.billingCountry);
  return parts.join(', ');
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processCustomer(customer: any): Promise<any | null> {
  const fullAddress = buildAddress(customer);
  if (!fullAddress || fullAddress.length < 5) return null;

  const geocoded = await geocodeAddress(fullAddress);
  if (!geocoded || (!geocoded.city && !geocoded.country)) return null;

  const updates: any = { id: customer.id };
  let hasChanges = false;

  if (geocoded.city && geocoded.city !== customer.city) {
    updates.city = geocoded.city;
    hasChanges = true;
  }
  if (geocoded.zipCode && geocoded.zipCode !== customer.zipCode) {
    updates.zipCode = geocoded.zipCode;
    hasChanges = true;
  }
  if (geocoded.country && geocoded.country !== customer.country) {
    updates.country = geocoded.country;
    hasChanges = true;
  }

  const hasBilling = customer.billingStreet || customer.billingCity;
  if (hasBilling) {
    const billingAddress = buildBillingAddress(customer);
    if (billingAddress) {
      await sleep(250);
      const billingGeocoded = await geocodeAddress(billingAddress);
      if (billingGeocoded) {
        if (billingGeocoded.street && billingGeocoded.street !== customer.billingStreet) {
          updates.billingStreet = billingGeocoded.street;
          hasChanges = true;
        }
        if (billingGeocoded.streetNumber && billingGeocoded.streetNumber !== customer.billingStreetNumber) {
          updates.billingStreetNumber = billingGeocoded.streetNumber;
          hasChanges = true;
        }
        if (billingGeocoded.city && billingGeocoded.city !== customer.billingCity) {
          updates.billingCity = billingGeocoded.city;
          hasChanges = true;
        }
        if (billingGeocoded.zipCode && billingGeocoded.zipCode !== customer.billingZipCode) {
          updates.billingZipCode = billingGeocoded.zipCode;
          hasChanges = true;
        }
        if (billingGeocoded.country && billingGeocoded.country !== customer.billingCountry) {
          updates.billingCountry = billingGeocoded.country;
          hasChanges = true;
        }
      }
    }
  }

  return hasChanges ? updates : null;
}

async function processBatch(batch: any[]): Promise<any[]> {
  const results = await Promise.all(batch.map(c => processCustomer(c)));
  return results.filter(r => r !== null);
}

async function runBatchMigration(): Promise<void> {
  console.log('Starting BATCH address validation migration...');
  console.log(`Batch size: ${BATCH_SIZE}, Delay between batches: ${DELAY_BETWEEN_BATCHES}ms`);
  
  const allCustomers = await db.select({
    id: customers.id,
    name: customers.name,
    address: customers.address,
    city: customers.city,
    zipCode: customers.zipCode,
    country: customers.country,
    billingStreet: customers.billingStreet,
    billingStreetNumber: customers.billingStreetNumber,
    billingCity: customers.billingCity,
    billingZipCode: customers.billingZipCode,
    billingCountry: customers.billingCountry,
    updatedAt: customers.updatedAt,
  }).from(customers);

  // Skip customers already updated today
  const cutoffTime = new Date('2026-01-19T20:40:00Z');
  const customersToProcess = allCustomers.filter(c => 
    c.address && 
    c.address.trim() !== '' && 
    c.address !== 'no address in db' &&
    (!c.updatedAt || new Date(c.updatedAt) < cutoffTime)
  );

  console.log(`Found ${customersToProcess.length} customers to process`);

  let totalUpdated = 0;
  let totalProcessed = 0;
  const startTime = Date.now();

  for (let i = 0; i < customersToProcess.length; i += BATCH_SIZE) {
    const batch = customersToProcess.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(customersToProcess.length / BATCH_SIZE);
    
    console.log(`\nBatch ${batchNum}/${totalBatches} (${i + 1}-${Math.min(i + BATCH_SIZE, customersToProcess.length)})`);
    
    const updates = await processBatch(batch);
    
    for (const update of updates) {
      const { id, ...fields } = update;
      fields.updatedAt = new Date();
      
      try {
        await db.update(customers).set(fields).where(eq(customers.id, id));
        totalUpdated++;
        console.log(`  Updated: ${batch.find(c => c.id === id)?.name}`);
      } catch (err) {
        console.error(`  Failed: ${id}`);
      }
    }
    
    totalProcessed += batch.length;
    
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = totalProcessed / elapsed;
    const remaining = (customersToProcess.length - totalProcessed) / rate;
    
    console.log(`  Progress: ${totalProcessed}/${customersToProcess.length} | Updated: ${totalUpdated} | ETA: ${Math.round(remaining)}s`);
    
    if (i + BATCH_SIZE < customersToProcess.length) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;
  console.log('\n========================================');
  console.log('BATCH Migration Complete');
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Total updated: ${totalUpdated}`);
  console.log(`Time: ${Math.round(totalTime)}s (${(totalProcessed / totalTime).toFixed(1)} customers/sec)`);
  console.log('========================================\n');
}

runBatchMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
