import { 
  MapPin, 
  Package, 
  Layers, 
  Archive,
  Building,
  Store
} from "lucide-react";

export type LocationType = 'display' | 'warehouse' | 'pallet' | 'other';
export type AreaType = 'shelves' | 'pallets' | 'office';

export interface LocationParts {
  warehouse: string;
  aisle: string;
  rack: string;
  level: string;
  bin?: string;
}

export interface PalletLocationParts {
  warehouse: string;
  aisle: string;
  rack: string;
  level: string;
  pallet: string;
}

/**
 * Parse a shelf location code into its component parts
 * Format: WH1-A06-R04-L04-B2 (new) or WH1-A-A06-R04-L04-B2 (old with area)
 */
export function parseShelfLocationCode(code: string): LocationParts | null {
  if (!code) return null;
  
  // Try new format first (without area)
  const newPattern = /^(WH\d+)-([A-Z]\d{2})-R(\d{2})-L(\d{2})-B(\d{1,2})$/;
  const newMatch = code.match(newPattern);
  
  if (newMatch) {
    return {
      warehouse: newMatch[1],
      aisle: newMatch[2],
      rack: `R${newMatch[3]}`,
      level: `L${newMatch[4]}`,
      bin: `B${newMatch[5]}`
    };
  }
  
  // Try old format with area for backward compatibility
  const oldPattern = /^(WH\d+)-[A-Z]-([A-Z]\d{2})-R(\d{2})-L(\d{2})-B(\d{1,2})$/;
  const oldMatch = code.match(oldPattern);
  
  if (oldMatch) {
    return {
      warehouse: oldMatch[1],
      aisle: oldMatch[2],
      rack: `R${oldMatch[3]}`,
      level: `L${oldMatch[4]}`,
      bin: `B${oldMatch[5]}`
    };
  }
  
  return null;
}

/**
 * Parse a pallet location code into its component parts
 * Format: WH1-B01-R01-L01-PAL1 (new 5-field format) or WH1-B03-P05 (old 3-field format for backward compatibility)
 */
export function parsePalletLocationCode(code: string): PalletLocationParts | null {
  if (!code) return null;
  
  // Try new 5-field format first: WH1-B01-R01-L01-PAL1
  const newPattern = /^(WH\d+)-([B]\d{2})-R(\d{2})-L(\d{2})-PAL(\d{1,2})$/;
  const newMatch = code.match(newPattern);
  
  if (newMatch) {
    return {
      warehouse: newMatch[1],
      aisle: newMatch[2],
      rack: `R${newMatch[3]}`,
      level: `L${newMatch[4]}`,
      pallet: `PAL${newMatch[5]}`
    };
  }
  
  // Try old 3-field format for backward compatibility: WH1-B03-P05
  const oldPattern = /^(WH\d+)-([B]\d{2})-P(\d{2})$/;
  const oldMatch = code.match(oldPattern);
  
  if (oldMatch) {
    return {
      warehouse: oldMatch[1],
      aisle: oldMatch[2],
      rack: 'R01',
      level: 'L01',
      pallet: `PAL${oldMatch[3]}`
    };
  }
  
  return null;
}

/**
 * Parse a location code (tries both formats, backward compatible with old format)
 * Old format: WH1-A01-R02-L03
 * New shelf format: WH1-A06-R04-L04-B2
 * New pallet format: WH1-B03-P05
 */
export function parseLocationCode(code: string): LocationParts | PalletLocationParts | null {
  if (!code) return null;
  
  // Try new shelf format first
  const shelfMatch = parseShelfLocationCode(code);
  if (shelfMatch) return shelfMatch;
  
  // Try new pallet format
  const palletMatch = parsePalletLocationCode(code);
  if (palletMatch) return palletMatch;
  
  // Try old format for backward compatibility
  const oldPattern = /^(WH\d+)-([A-Z]\d{2})-([R]\d{2})-([L]\d{2})$/;
  const oldMatch = code.match(oldPattern);
  
  if (!oldMatch) return null;
  
  return {
    warehouse: oldMatch[1],
    aisle: oldMatch[2],
    rack: oldMatch[3],
    level: oldMatch[4]
  };
}

/**
 * Validate a shelf location code format
 * Format: WH1-A06-R04-L04-B2 (new) or WH1-A-A06-R04-L04-B2 (old with area)
 */
export function validateShelfLocationCode(code: string): boolean {
  const newPattern = /^WH\d+-[A-Z]\d{2}-R\d{2}-L\d{2}-B\d{1,2}$/;
  const oldPattern = /^WH\d+-[A-Z]-[A-Z]\d{2}-R\d{2}-L\d{2}-B\d{1,2}$/;
  return newPattern.test(code) || oldPattern.test(code);
}

/**
 * Validate a pallet location code format
 * Format: WH1-B01-R01-L01-PAL1 (new 5-field) or WH1-B03-P05 (old 3-field for backward compatibility)
 */
export function validatePalletLocationCode(code: string): boolean {
  const newPattern = /^WH\d+-[B]\d{2}-R\d{2}-L\d{2}-PAL\d{1,2}$/;
  const oldPattern = /^WH\d+-[B]\d{2}-P\d{2}$/;
  return newPattern.test(code) || oldPattern.test(code);
}

/**
 * Validate a location code format (any format)
 */
export function validateLocationCode(code: string): boolean {
  return validateShelfLocationCode(code) || 
         validatePalletLocationCode(code) ||
         /^WH\d+-[A-Z]\d{2}-R\d{2}-L\d{2}$/.test(code); // Old format
}

/**
 * Generate a shelf location code from components
 * Format: WH1-A06-R04-L04-B2
 */
export function generateShelfLocationCode(
  warehouse: string,
  aisle: string,
  rack: string,
  level: string,
  bin: string
): string {
  const whFormatted = warehouse.startsWith('WH') ? warehouse : `WH${warehouse}`;
  const aisleFormatted = aisle;
  const rackFormatted = rack.replace(/^R/, '').padStart(2, '0');
  const levelFormatted = level.replace(/^L/, '').padStart(2, '0');
  const binFormatted = bin.replace(/^B/, '');
  
  return `${whFormatted}-${aisleFormatted}-R${rackFormatted}-L${levelFormatted}-B${binFormatted}`;
}

/**
 * Generate a pallet location code from components
 * Format: WH1-B01-R01-L01-PAL1
 */
export function generatePalletLocationCode(
  warehouse: string,
  aisle: string,
  rack: string,
  level: string,
  pallet: string
): string {
  const whFormatted = warehouse.startsWith('WH') ? warehouse : `WH${warehouse}`;
  const aisleFormatted = aisle;
  const rackFormatted = rack.replace(/^R/, '').padStart(2, '0');
  const levelFormatted = level.replace(/^L/, '').padStart(2, '0');
  const palletFormatted = pallet.replace(/^PAL/, '');
  
  return `${whFormatted}-${aisleFormatted}-R${rackFormatted}-L${levelFormatted}-PAL${palletFormatted}`;
}

/**
 * Generate a location code from components (backward compatible)
 * Old format: WH1-A01-R02-L03
 */
export function generateLocationCode(
  warehouse: string,
  aisle: string,
  rack: string,
  level: string
): string {
  // Ensure proper formatting
  const whFormatted = warehouse.startsWith('WH') ? warehouse : `WH${warehouse}`;
  const aisleFormatted = aisle.length === 1 ? `${aisle}01` : aisle;
  const rackFormatted = rack.startsWith('R') ? rack : `R${rack.padStart(2, '0')}`;
  const levelFormatted = level.startsWith('L') ? level : `L${level.padStart(2, '0')}`;
  
  return `${whFormatted}-${aisleFormatted}-${rackFormatted}-${levelFormatted}`;
}

/**
 * Get the appropriate icon for a location type
 */
export function getLocationTypeIcon(type: LocationType) {
  switch (type) {
    case 'display':
      return Store;
    case 'warehouse':
      return Archive;
    case 'pallet':
      return Layers;
    case 'other':
      return MapPin;
    default:
      return Package;
  }
}

/**
 * Get the color for location type badges
 */
export function getLocationTypeColor(type: LocationType): string {
  switch (type) {
    case 'display':
      return 'bg-blue-500';
    case 'warehouse':
      return 'bg-green-500';
    case 'pallet':
      return 'bg-orange-500';
    case 'other':
      return 'bg-gray-500';
    default:
      return 'bg-gray-400';
  }
}

/**
 * Get the text color for location type badges
 */
export function getLocationTypeTextColor(type: LocationType): string {
  switch (type) {
    case 'display':
      return 'text-blue-600 bg-blue-50';
    case 'warehouse':
      return 'text-green-600 bg-green-50';
    case 'pallet':
      return 'text-orange-600 bg-orange-50';
    case 'other':
      return 'text-gray-600 bg-gray-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

/**
 * Format location code for display
 */
export function formatLocationCode(code: string): string {
  const parts = parseLocationCode(code);
  if (!parts) return code;
  
  // Check if it's a pallet location (has 'pallet' field)
  if ('pallet' in parts) {
    return `${parts.warehouse} • ${parts.aisle} • ${parts.rack} • ${parts.level} • ${parts.pallet}`;
  }
  
  // Shelf location
  if ('bin' in parts && parts.bin) {
    return `${parts.warehouse} • ${parts.aisle} • ${parts.rack} • ${parts.level} • ${parts.bin}`;
  }
  
  // Old format or partial
  return `${parts.warehouse} • ${parts.aisle} • ${parts.rack} • ${parts.level}`;
}

/**
 * Get a human-readable location type label
 */
export function getLocationTypeLabel(type: LocationType): string {
  switch (type) {
    case 'display':
      return 'Display Area';
    case 'warehouse':
      return 'Warehouse';
    case 'pallet':
      return 'Pallet Storage';
    case 'other':
      return 'Other Location';
    default:
      return 'Unknown';
  }
}

/**
 * Calculate total quantity across all locations
 */
export function calculateTotalQuantity(locations: Array<{ quantity: number }>): number {
  return locations.reduce((total, loc) => total + (loc.quantity || 0), 0);
}

/**
 * Generate warehouse options
 */
export function getWarehouseOptions(count: number = 5): Array<{ value: string; label: string }> {
  return Array.from({ length: count }, (_, i) => ({
    value: `WH${i + 1}`,
    label: `Warehouse ${i + 1}`
  }));
}

/**
 * Generate aisle options for shelves (A01-A99 only)
 */
export function getAisleOptions(): Array<{ value: string; label: string }> {
  // Only generate A-prefixed aisles for shelves
  return Array.from({ length: 99 }, (_, i) => ({
    value: `A${String(i + 1).padStart(2, '0')}`,
    label: `Aisle A${String(i + 1).padStart(2, '0')}`
  }));
}

/**
 * Generate rack options
 */
export function getRackOptions(count: number = 20): Array<{ value: string; label: string }> {
  return Array.from({ length: count }, (_, i) => ({
    value: `R${String(i + 1).padStart(2, '0')}`,
    label: `Rack ${String(i + 1).padStart(2, '0')}`
  }));
}

/**
 * Generate level options
 */
export function getLevelOptions(count: number = 10): Array<{ value: string; label: string }> {
  const options = Array.from({ length: count }, (_, i) => ({
    value: `L${String(i + 1).padStart(2, '0')}`,
    label: `Level ${i + 1}`
  }));
  
  // Add special options for pallets
  options.push(
    { value: 'L00', label: 'Ground Level (Pallet)' },
    { value: 'L99', label: 'Top Storage' }
  );
  
  return options;
}

/**
 * Get area options (A, B, C, D, etc.)
 */
export function getAreaOptions(count: number = 10): Array<{ value: string; label: string }> {
  return Array.from({ length: count }, (_, i) => {
    const letter = String.fromCharCode(65 + i); // A, B, C, D, ...
    return {
      value: letter,
      label: `Area ${letter}`
    };
  });
}

/**
 * Get bin options (1-20)
 */
export function getBinOptions(count: number = 20): Array<{ value: string; label: string }> {
  return Array.from({ length: count }, (_, i) => ({
    value: `B${i + 1}`,
    label: `Bin ${i + 1}`
  }));
}

/**
 * Get zone options based on storage type
 * - Pallets: B01-B99
 * - Office: C01-C99
 */
export function getZoneOptions(zoneLetter: 'B' | 'C' = 'B'): Array<{ value: string; label: string }> {
  return Array.from({ length: 99 }, (_, i) => {
    const zone = `${zoneLetter}${String(i + 1).padStart(2, '0')}`;
    return {
      value: zone,
      label: `Zone ${zone}`
    };
  });
}

/**
 * Get position options for pallets (P01-P20)
 * @deprecated Use getPalletOptions instead for new 5-field pallet format
 */
export function getPositionOptions(count: number = 20): Array<{ value: string; label: string }> {
  return Array.from({ length: count }, (_, i) => ({
    value: `P${String(i + 1).padStart(2, '0')}`,
    label: `Position ${String(i + 1).padStart(2, '0')}`
  }));
}

/**
 * Get pallet options for new 5-field format (PAL1-PAL99)
 */
export function getPalletOptions(count: number = 99): Array<{ value: string; label: string }> {
  return Array.from({ length: count }, (_, i) => ({
    value: `PAL${i + 1}`,
    label: `Pallet ${i + 1}`
  }));
}

/**
 * Get aisle options for pallet racks (B01-B99)
 */
export function getPalletAisleOptions(): Array<{ value: string; label: string }> {
  return Array.from({ length: 99 }, (_, i) => ({
    value: `B${String(i + 1).padStart(2, '0')}`,
    label: `Aisle B${String(i + 1).padStart(2, '0')}`
  }));
}

/**
 * Check if a location is for pallet storage
 */
export function isPalletLocation(code: string): boolean {
  const parts = parseLocationCode(code);
  if (!parts) return false;
  
  // Check if it's a pallet location by checking for pallet field
  if ('pallet' in parts) return true;
  
  // Old logic for backward compatibility
  return ('level' in parts && (parts.level === 'L00' || parts.level === 'L99'));
}

/**
 * Get location summary text
 */
export function getLocationSummary(locations: Array<{ locationType: LocationType; quantity: number }>): string {
  if (locations.length === 0) return 'No locations assigned';
  
  const summary = locations
    .reduce((acc, loc) => {
      const type = loc.locationType || 'other';
      if (!acc[type]) {
        acc[type] = 0;
      }
      acc[type] += loc.quantity || 0;
      return acc;
    }, {} as Record<LocationType, number>);
  
  const parts = Object.entries(summary)
    .map(([type, qty]) => `${getLocationTypeLabel(type as LocationType)} (${qty})`)
    .join(', ');
  
  return `${locations.length} location${locations.length !== 1 ? 's' : ''}: ${parts}`;
}