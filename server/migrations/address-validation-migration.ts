import { db } from '../db';
import { customers } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface NominatimResult {
  place_id: number;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
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
  formattedAddress: string;
}

async function geocodeAddress(address: string): Promise<AddressComponents | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&addressdetails=1&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DavieSupply/1.0 (address-validation)'
      }
    });
    
    const data: NominatimResult[] = await response.json();

    if (!data || data.length === 0) {
      return null;
    }

    const result = data[0];
    const addr = result.address;

    const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
    
    return {
      street: addr.road || '',
      streetNumber: addr.house_number || '',
      city: city,
      zipCode: addr.postcode || '',
      country: addr.country || '',
      countryCode: addr.country_code?.toUpperCase() || '',
      formattedAddress: result.display_name
    };
  } catch (error) {
    console.error(`  Error geocoding: ${error}`);
    return null;
  }
}

function cleanAddress(address: string): string {
  let cleaned = address
    .replace(/[;]/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
  
  cleaned = cleaned
    .replace(/^[^a-zA-Z0-9]+/, '')
    .replace(/Gửi về\s*[,:]?\s*/gi, '')
    .replace(/gửi hàng tới\s*[,:]?\s*/gi, '')
    .replace(/Beauty nails\s*[,:]?\s*/gi, '')
    .replace(/nail[s]?\s*(studio|salon)?\s*[,:]?\s*/gi, '')
    .replace(/^[A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+\s+/g, '');
  
  return cleaned.trim();
}

function buildFullAddress(customer: any): string {
  const parts: string[] = [];
  
  if (customer.address && customer.address !== 'no address in db') {
    parts.push(cleanAddress(customer.address));
  }
  if (customer.city) {
    parts.push(customer.city);
  }
  if (customer.zipCode && customer.zipCode.length > 3) {
    parts.push(customer.zipCode);
  }
  if (customer.country) {
    parts.push(customer.country);
  }
  
  return parts.join(', ');
}

function buildBillingAddress(customer: any): string {
  const parts: string[] = [];
  
  if (customer.billingStreet) {
    let street = cleanAddress(customer.billingStreet);
    if (customer.billingStreetNumber) {
      street += ' ' + customer.billingStreetNumber;
    }
    parts.push(street);
  }
  if (customer.billingCity) {
    parts.push(customer.billingCity);
  }
  if (customer.billingZipCode && customer.billingZipCode.length > 3) {
    parts.push(customer.billingZipCode);
  }
  if (customer.billingCountry) {
    parts.push(customer.billingCountry);
  }
  
  return parts.join(', ');
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runAddressValidationMigration(): Promise<void> {
  console.log('Starting address validation migration using OpenStreetMap Nominatim...');
  
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
  }).from(customers);

  const customersWithAddress = allCustomers.filter(c => 
    c.address && 
    c.address.trim() !== '' && 
    c.address !== 'no address in db'
  );

  console.log(`Found ${customersWithAddress.length} customers with addresses to validate`);

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < customersWithAddress.length; i++) {
    const customer = customersWithAddress[i];
    console.log(`\n[${i + 1}/${customersWithAddress.length}] Processing: ${customer.name}`);
    
    const fullAddress = buildFullAddress(customer);
    console.log(`  Original: ${fullAddress}`);

    const geocoded = await geocodeAddress(fullAddress);
    
    if (!geocoded || (!geocoded.city && !geocoded.country)) {
      console.log(`  SKIPPED - Could not geocode`);
      skipped++;
      await sleep(1100);
      continue;
    }

    console.log(`  Found: ${geocoded.formattedAddress}`);
    console.log(`  City: ${geocoded.city}, Zip: ${geocoded.zipCode}, Country: ${geocoded.country}`);

    const updates: any = {};
    
    if (geocoded.city && geocoded.city !== customer.city) {
      updates.city = geocoded.city;
    }
    if (geocoded.zipCode && geocoded.zipCode !== customer.zipCode) {
      updates.zipCode = geocoded.zipCode;
    }
    if (geocoded.country && geocoded.country !== customer.country) {
      updates.country = geocoded.country;
    }

    const hasBillingAddress = customer.billingStreet || customer.billingCity;
    
    if (hasBillingAddress) {
      const billingFullAddress = buildBillingAddress(customer);
      
      if (billingFullAddress && billingFullAddress.trim() !== '') {
        console.log(`  Billing: ${billingFullAddress}`);
        
        await sleep(1100);
        const billingGeocoded = await geocodeAddress(billingFullAddress);
        
        if (billingGeocoded && (billingGeocoded.city || billingGeocoded.country)) {
          console.log(`  Billing found: ${billingGeocoded.formattedAddress}`);
          
          if (billingGeocoded.street && billingGeocoded.street !== customer.billingStreet) {
            updates.billingStreet = billingGeocoded.street;
          }
          if (billingGeocoded.streetNumber && billingGeocoded.streetNumber !== customer.billingStreetNumber) {
            updates.billingStreetNumber = billingGeocoded.streetNumber;
          }
          if (billingGeocoded.city && billingGeocoded.city !== customer.billingCity) {
            updates.billingCity = billingGeocoded.city;
          }
          if (billingGeocoded.zipCode && billingGeocoded.zipCode !== customer.billingZipCode) {
            updates.billingZipCode = billingGeocoded.zipCode;
          }
          if (billingGeocoded.country && billingGeocoded.country !== customer.billingCountry) {
            updates.billingCountry = billingGeocoded.country;
          }
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      
      try {
        await db.update(customers)
          .set(updates)
          .where(eq(customers.id, customer.id));
        
        console.log(`  UPDATED: ${JSON.stringify(updates)}`);
        updated++;
      } catch (error) {
        console.error(`  ERROR updating: ${error}`);
        failed++;
      }
    } else {
      console.log(`  NO CHANGES needed`);
      skipped++;
    }

    await sleep(1100);
    
    if ((i + 1) % 50 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${customersWithAddress.length} (${updated} updated, ${failed} failed, ${skipped} skipped) ---\n`);
    }
  }

  console.log('\n========================================');
  console.log('Address Validation Migration Complete');
  console.log(`Total processed: ${customersWithAddress.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped/No changes: ${skipped}`);
  console.log('========================================\n');
}

runAddressValidationMigration()
  .then(() => {
    console.log('Migration finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
