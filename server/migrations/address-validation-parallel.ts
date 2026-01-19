import { db } from '../db';
import { customers } from '@shared/schema';
import { eq } from 'drizzle-orm';

const PARALLEL_REQUESTS = 10;
const DELAY_BETWEEN_BATCHES = 1200;

const VALID_COUNTRIES = new Set([
  'Deutschland', 'Österreich', 'Česko', 'Slovensko', 'Polska', 'Nederland',
  'België', 'France', 'España', 'Italia', 'Schweiz', 'Magyarország',
  'România', 'United Kingdom', 'United States', 'Eesti', 'Portugal',
  'Danmark', 'Sverige', 'Norge', 'Suomi', 'Hrvatska', 'Slovenija',
  'Việt Nam', 'Indonesia', 'Lietuva', 'Latvija'
]);

interface GeocodingResult {
  address: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    country?: string;
    country_code?: string;
  };
}

async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&addressdetails=1&limit=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'DavieSupply-AddressValidation/1.0' }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data[0] || null;
  } catch {
    return null;
  }
}

function getCountryName(countryCode: string): string {
  const countryMap: Record<string, string> = {
    'de': 'Deutschland', 'at': 'Österreich', 'cz': 'Česko',
    'sk': 'Slovensko', 'pl': 'Polska', 'nl': 'Nederland',
    'be': 'België', 'fr': 'France', 'es': 'España',
    'it': 'Italia', 'ch': 'Schweiz', 'hu': 'Magyarország',
    'ro': 'România', 'gb': 'United Kingdom', 'us': 'United States',
    'ee': 'Eesti', 'pt': 'Portugal', 'dk': 'Danmark',
    'se': 'Sverige', 'no': 'Norge', 'fi': 'Suomi',
    'hr': 'Hrvatska', 'si': 'Slovenija', 'vn': 'Việt Nam',
    'id': 'Indonesia', 'lt': 'Lietuva', 'lv': 'Latvija'
  };
  return countryMap[countryCode.toLowerCase()] || countryCode.toUpperCase();
}

async function processCustomer(customer: any): Promise<{ id: string; updated: boolean; country?: string; city?: string }> {
  const result = await geocodeAddress(customer.address);
  if (!result?.address?.country_code) {
    return { id: customer.id, updated: false };
  }

  const addr = result.address;
  const newCountry = getCountryName(addr.country_code);
  const newCity = addr.city || addr.town || addr.village || addr.municipality || customer.city;

  if (newCountry !== customer.country || (newCity && newCity !== customer.city)) {
    await db.update(customers).set({
      country: newCountry,
      city: newCity || customer.city,
      billingCountry: newCountry,
      billingCity: newCity || customer.city,
      updatedAt: new Date()
    }).where(eq(customers.id, customer.id));
    return { id: customer.id, updated: true, country: newCountry, city: newCity };
  }
  return { id: customer.id, updated: false };
}

async function runParallelValidation() {
  console.log('Starting parallel address validation (skipping already-correct addresses)...');
  
  const allCustomers = await db.select({
    id: customers.id,
    name: customers.name,
    address: customers.address,
    city: customers.city,
    country: customers.country,
  }).from(customers);

  // Only process customers with invalid or missing country names
  const customersToProcess = allCustomers.filter(c => 
    c.address && 
    c.address.trim() !== '' && 
    c.address !== 'no address in db' &&
    !VALID_COUNTRIES.has(c.country || '')
  );

  const alreadyValid = allCustomers.filter(c => VALID_COUNTRIES.has(c.country || '')).length;
  console.log(`Skipping ${alreadyValid} already-correct addresses`);
  console.log(`Processing ${customersToProcess.length} addresses that need validation...`);
  
  if (customersToProcess.length === 0) {
    console.log('All addresses already have valid countries!');
    return;
  }

  let processed = 0;
  let updated = 0;

  for (let i = 0; i < customersToProcess.length; i += PARALLEL_REQUESTS) {
    const batch = customersToProcess.slice(i, i + PARALLEL_REQUESTS);
    const results = await Promise.all(batch.map(c => processCustomer(c)));
    
    processed += batch.length;
    updated += results.filter(r => r.updated).length;
    
    const updatedItems = results.filter(r => r.updated);
    if (updatedItems.length > 0) {
      updatedItems.forEach(r => console.log(`  Updated: ${r.country} - ${r.city}`));
    }
    
    console.log(`Progress: ${processed}/${customersToProcess.length} (${updated} updated)`);
    
    if (i + PARALLEL_REQUESTS < customersToProcess.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }

  console.log(`\nComplete! Processed: ${processed}, Updated: ${updated}`);
}

runParallelValidation().catch(console.error);
