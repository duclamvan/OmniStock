import { 
  MapPin, 
  Package, 
  Layers, 
  Archive,
  Building,
  Store
} from "lucide-react";

export type LocationType = 'display' | 'warehouse' | 'pallet' | 'other';

export interface LocationParts {
  warehouse: string;
  aisle: string;
  rack: string;
  level: string;
}

/**
 * Parse a location code into its component parts
 * Format: WH1-A01-R02-L03
 */
export function parseLocationCode(code: string): LocationParts | null {
  if (!code) return null;
  
  const pattern = /^(WH\d+)-([A-Z]\d{2})-([R]\d{2})-([L]\d{2})$/;
  const match = code.match(pattern);
  
  if (!match) return null;
  
  return {
    warehouse: match[1],
    aisle: match[2],
    rack: match[3],
    level: match[4]
  };
}

/**
 * Validate a location code format
 */
export function validateLocationCode(code: string): boolean {
  const pattern = /^WH\d+-[A-Z]\d{2}-R\d{2}-L\d{2}$/;
  return pattern.test(code);
}

/**
 * Generate a location code from components
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
 * Generate aisle options (A-Z)
 */
export function getAisleOptions(): Array<{ value: string; label: string }> {
  return Array.from({ length: 26 }, (_, i) => {
    const letter = String.fromCharCode(65 + i);
    return Array.from({ length: 10 }, (_, j) => ({
      value: `${letter}${String(j).padStart(2, '0')}`,
      label: `Aisle ${letter}${String(j).padStart(2, '0')}`
    }));
  }).flat().slice(0, 50); // Limit to first 50 aisles
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
 * Check if a location is for pallet storage
 */
export function isPalletLocation(code: string): boolean {
  const parts = parseLocationCode(code);
  return parts?.level === 'L00' || parts?.level === 'L99';
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