/**
 * Smart Address Parser Utility
 * Handles cases where:
 * - Street name includes village/city name (e.g., "Potůčky 13" where Potůčky is city)
 * - Parses address strings into components
 * - Detects and extracts city from street for small villages
 */

import { removeDiacritics, normalizeCityName, normalizeStreetName, toTitleCase } from './nameNormalizer';

export interface ParsedAddress {
  street: string;
  streetNumber: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  originalInput: string;
}

const czechCityPrefixes = [
  'nad', 'pod', 'u', 'na', 'v', 've', 'pri', 'při', 'za', 'mezi', 'ke', 'k',
  'horni', 'dolni', 'horní', 'dolní', 'mala', 'velka', 'malá', 'velká',
  'nova', 'stara', 'nová', 'stará', 'ceska', 'ceske', 'česká', 'české',
  'moravska', 'moravske', 'moravská', 'moravské',
];

const streetKeywords = [
  'ulice', 'ul.', 'ul', 'trida', 'tř.', 'třída', 'namesti', 'nám.', 'náměstí',
  'street', 'str.', 'strasse', 'straße', 'weg', 'allee', 'platz', 'gasse',
  'avenue', 'ave', 'road', 'rd', 'lane', 'ln', 'drive', 'dr', 'boulevard', 'blvd',
];

export function parseAddressLine(input: string): ParsedAddress {
  if (!input) {
    return {
      street: '',
      streetNumber: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      originalInput: '',
    };
  }

  const originalInput = input.trim();
  let street = '';
  let streetNumber = '';
  let city = '';
  let state = '';
  let zipCode = '';
  let country = '';

  const parts = originalInput.split(',').map(p => p.trim());
  
  if (parts.length >= 3) {
    const firstPart = parts[0];
    const streetMatch = firstPart.match(/^(.+?)\s+(\d+[a-zA-Z]?(?:\/\d+)?)$/);
    if (streetMatch) {
      street = streetMatch[1];
      streetNumber = streetMatch[2];
    } else {
      street = firstPart;
    }
    
    const secondPart = parts[1];
    const zipCityMatch = secondPart.match(/^(\d{3}\s?\d{2})\s+(.+)$/);
    if (zipCityMatch) {
      zipCode = zipCityMatch[1];
      city = zipCityMatch[2];
    } else {
      city = secondPart;
    }
    
    if (parts.length >= 3) {
      const lastPart = parts[parts.length - 1];
      if (/czech|česk|germany|deutschland|austria|österreich/i.test(lastPart)) {
        country = lastPart;
      } else if (parts.length >= 4) {
        state = parts[2];
        country = parts[3];
      }
    }
  } else if (parts.length === 2) {
    const firstPart = parts[0];
    const streetMatch = firstPart.match(/^(.+?)\s+(\d+[a-zA-Z]?(?:\/\d+)?)$/);
    if (streetMatch) {
      street = streetMatch[1];
      streetNumber = streetMatch[2];
    } else {
      street = firstPart;
    }
    
    const secondPart = parts[1];
    const zipCityMatch = secondPart.match(/^(\d{3}\s?\d{2})\s+(.+)$/);
    if (zipCityMatch) {
      zipCode = zipCityMatch[1];
      city = zipCityMatch[2];
    } else {
      city = secondPart;
    }
  } else {
    const singlePart = originalInput;
    
    const streetMatch = singlePart.match(/^(.+?)\s+(\d+[a-zA-Z]?(?:\/\d+)?)$/);
    if (streetMatch) {
      const potentialStreet = streetMatch[1];
      streetNumber = streetMatch[2];
      
      const hasStreetKeyword = streetKeywords.some(kw => 
        potentialStreet.toLowerCase().includes(kw.toLowerCase())
      );
      
      if (!hasStreetKeyword) {
        city = potentialStreet;
        street = potentialStreet;
      } else {
        street = potentialStreet;
      }
    } else {
      street = singlePart;
    }
  }

  return {
    street: normalizeStreetName(street),
    streetNumber: streetNumber.toUpperCase().trim(),
    city: normalizeCityName(city),
    state: state ? toTitleCase(removeDiacritics(state).trim()) : '',
    zipCode: zipCode.trim(),
    country: country ? toTitleCase(removeDiacritics(country).trim()) : '',
    originalInput,
  };
}

export function shouldFetchAddressDetails(parsed: ParsedAddress): boolean {
  return !parsed.city || !parsed.zipCode || !parsed.country;
}

export function extractStreetAndNumber(input: string): { street: string; streetNumber: string } {
  if (!input) return { street: '', streetNumber: '' };
  
  const trimmed = input.trim();
  
  const match = trimmed.match(/^(.+?)\s+(\d+[a-zA-Z]?(?:\/\d+[a-zA-Z]?)?)$/);
  if (match) {
    return {
      street: normalizeStreetName(match[1]),
      streetNumber: match[2].toUpperCase().trim(),
    };
  }
  
  return {
    street: normalizeStreetName(trimmed),
    streetNumber: '',
  };
}

export function formatAddressForGeocoding(parsed: ParsedAddress): string {
  const parts: string[] = [];
  
  if (parsed.street) {
    if (parsed.streetNumber) {
      parts.push(`${parsed.street} ${parsed.streetNumber}`);
    } else {
      parts.push(parsed.street);
    }
  }
  
  if (parsed.city && parsed.city !== parsed.street) {
    parts.push(parsed.city);
  }
  
  if (parsed.zipCode) {
    parts.push(parsed.zipCode);
  }
  
  if (parsed.country) {
    parts.push(parsed.country);
  }
  
  return parts.join(', ');
}

export function mergeAddressData(
  parsed: ParsedAddress,
  geocoded: Partial<ParsedAddress>
): ParsedAddress {
  return {
    street: parsed.street || normalizeStreetName(geocoded.street || ''),
    streetNumber: parsed.streetNumber || (geocoded.streetNumber || '').toUpperCase().trim(),
    city: parsed.city || normalizeCityName(geocoded.city || ''),
    state: parsed.state || (geocoded.state ? toTitleCase(removeDiacritics(geocoded.state).trim()) : ''),
    zipCode: parsed.zipCode || (geocoded.zipCode || '').trim(),
    country: parsed.country || (geocoded.country ? toTitleCase(removeDiacritics(geocoded.country).trim()) : ''),
    originalInput: parsed.originalInput,
  };
}
