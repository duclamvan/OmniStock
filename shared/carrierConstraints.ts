export interface ParcelSizeCategory {
  name: string;
  maxWeightKg: number;
  maxLengthCm: number;
  maxWidthCm: number;
  maxHeightCm: number;
  maxGirthCm?: number;
  costEstimate?: number;
  currency?: string;
}

export interface CarrierConstraints {
  carrierCode: string;
  carrierName: string;
  maxWeightKg: number;
  maxLengthCm: number;
  maxWidthCm: number;
  maxHeightCm: number;
  maxGirthCm?: number;
  parcelSizes?: ParcelSizeCategory[];
}

export const CARRIER_CONSTRAINTS: Record<string, CarrierConstraints> = {
  'DHL DE': {
    carrierCode: 'DHL DE',
    carrierName: 'DHL Germany',
    maxWeightKg: 31.5,
    maxLengthCm: 120,
    maxWidthCm: 60,
    maxHeightCm: 60,
    maxGirthCm: 300,
    parcelSizes: [
      {
        name: 'Paket 2kg',
        maxWeightKg: 2,
        maxLengthCm: 60,
        maxWidthCm: 30,
        maxHeightCm: 15,
        costEstimate: 4.99,
        currency: 'EUR'
      },
      {
        name: 'Paket 5kg',
        maxWeightKg: 5,
        maxLengthCm: 60,
        maxWidthCm: 30,
        maxHeightCm: 15,
        costEstimate: 5.49,
        currency: 'EUR'
      },
      {
        name: 'Paket 10kg',
        maxWeightKg: 10,
        maxLengthCm: 80,
        maxWidthCm: 50,
        maxHeightCm: 35,
        costEstimate: 8.49,
        currency: 'EUR'
      },
      {
        name: 'Paket 20kg',
        maxWeightKg: 20,
        maxLengthCm: 100,
        maxWidthCm: 60,
        maxHeightCm: 50,
        costEstimate: 14.49,
        currency: 'EUR'
      },
      {
        name: 'Paket 31.5kg',
        maxWeightKg: 31.5,
        maxLengthCm: 120,
        maxWidthCm: 60,
        maxHeightCm: 60,
        costEstimate: 16.49,
        currency: 'EUR'
      }
    ]
  },
  'PPL CZ': {
    carrierCode: 'PPL CZ',
    carrierName: 'PPL Czech Republic',
    maxWeightKg: 50,
    maxLengthCm: 200,
    maxWidthCm: 80,
    maxHeightCm: 60,
    maxGirthCm: 300,
    parcelSizes: [
      {
        name: 'XS',
        maxWeightKg: 5,
        maxLengthCm: 45,
        maxWidthCm: 35,
        maxHeightCm: 20,
        costEstimate: 125,
        currency: 'CZK'
      },
      {
        name: 'S',
        maxWeightKg: 10,
        maxLengthCm: 60,
        maxWidthCm: 40,
        maxHeightCm: 30,
        costEstimate: 145,
        currency: 'CZK'
      },
      {
        name: 'M',
        maxWeightKg: 20,
        maxLengthCm: 80,
        maxWidthCm: 50,
        maxHeightCm: 40,
        costEstimate: 175,
        currency: 'CZK'
      },
      {
        name: 'L',
        maxWeightKg: 31.5,
        maxLengthCm: 100,
        maxWidthCm: 60,
        maxHeightCm: 50,
        costEstimate: 215,
        currency: 'CZK'
      },
      {
        name: 'XL',
        maxWeightKg: 50,
        maxLengthCm: 120,
        maxWidthCm: 80,
        maxHeightCm: 60,
        costEstimate: 285,
        currency: 'CZK'
      }
    ]
  },
  'GLS DE': {
    carrierCode: 'GLS DE',
    carrierName: 'GLS Germany',
    maxWeightKg: 40,
    maxLengthCm: 200,
    maxWidthCm: 80,
    maxHeightCm: 60,
    maxGirthCm: 300,
    parcelSizes: [
      {
        name: 'XS',
        maxWeightKg: 3,
        maxLengthCm: 35,
        maxWidthCm: 25,
        maxHeightCm: 10,
        costEstimate: 4.50,
        currency: 'EUR'
      },
      {
        name: 'S',
        maxWeightKg: 5,
        maxLengthCm: 50,
        maxWidthCm: 40,
        maxHeightCm: 20,
        costEstimate: 5.90,
        currency: 'EUR'
      },
      {
        name: 'M',
        maxWeightKg: 10,
        maxLengthCm: 60,
        maxWidthCm: 50,
        maxHeightCm: 35,
        costEstimate: 7.90,
        currency: 'EUR'
      },
      {
        name: 'L',
        maxWeightKg: 20,
        maxLengthCm: 80,
        maxWidthCm: 60,
        maxHeightCm: 50,
        costEstimate: 10.90,
        currency: 'EUR'
      },
      {
        name: 'XL',
        maxWeightKg: 40,
        maxLengthCm: 120,
        maxWidthCm: 80,
        maxHeightCm: 60,
        costEstimate: 14.90,
        currency: 'EUR'
      }
    ]
  }
};

export function getCarrierConstraints(carrierCode: string): CarrierConstraints | null {
  const normalizedCode = normalizeCarrierCode(carrierCode);
  return CARRIER_CONSTRAINTS[normalizedCode] || null;
}

export function normalizeCarrierCode(carrier: string): string {
  // Normalize: trim whitespace, replace hyphens with space, uppercase
  const normalized = carrier.trim().toUpperCase().replace(/[-_]+/g, ' ');
  
  const map: Record<string, string> = {
    // DHL variations
    'PPL': 'PPL CZ',
    'GLS': 'GLS DE',
    'DHL': 'DHL DE',
    'PPL CZ': 'PPL CZ',
    'GLS DE': 'GLS DE',
    'DHL DE': 'DHL DE',
    'DHLDE': 'DHL DE',
    'DHL GERMANY': 'DHL DE',
    'DHL PAKET': 'DHL DE',
    // PPL variations
    'PPLCZ': 'PPL CZ',
    'PPL CZECH': 'PPL CZ',
    // GLS variations
    'GLSDE': 'GLS DE',
    'GLS GERMANY': 'GLS DE',
  };
  return map[normalized] || carrier;
}

export function findBestParcelSize(
  carrierCode: string,
  weightKg: number,
  lengthCm: number,
  widthCm: number,
  heightCm: number
): ParcelSizeCategory | null {
  const constraints = getCarrierConstraints(carrierCode);
  if (!constraints?.parcelSizes) return null;

  const sortedDimensions = [lengthCm, widthCm, heightCm].sort((a, b) => b - a);
  const [maxDim, midDim, minDim] = sortedDimensions;

  for (const size of constraints.parcelSizes) {
    const sizeMaxDims = [size.maxLengthCm, size.maxWidthCm, size.maxHeightCm].sort((a, b) => b - a);
    
    if (
      weightKg <= size.maxWeightKg &&
      maxDim <= sizeMaxDims[0] &&
      midDim <= sizeMaxDims[1] &&
      minDim <= sizeMaxDims[2]
    ) {
      return size;
    }
  }

  return null;
}

export function validateCartonForCarrier(
  carrierCode: string,
  weightKg: number,
  lengthCm: number,
  widthCm: number,
  heightCm: number
): { valid: boolean; errors: string[]; warnings: string[]; recommendedSize?: ParcelSizeCategory } {
  const constraints = getCarrierConstraints(carrierCode);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!constraints) {
    warnings.push(`Unknown carrier: ${carrierCode}. Using default limits.`);
    return { valid: true, errors, warnings };
  }

  if (weightKg > constraints.maxWeightKg) {
    errors.push(`Weight ${weightKg}kg exceeds ${constraints.carrierName} max of ${constraints.maxWeightKg}kg`);
  }
  if (lengthCm > constraints.maxLengthCm) {
    errors.push(`Length ${lengthCm}cm exceeds ${constraints.carrierName} max of ${constraints.maxLengthCm}cm`);
  }
  if (widthCm > constraints.maxWidthCm) {
    errors.push(`Width ${widthCm}cm exceeds ${constraints.carrierName} max of ${constraints.maxWidthCm}cm`);
  }
  if (heightCm > constraints.maxHeightCm) {
    errors.push(`Height ${heightCm}cm exceeds ${constraints.carrierName} max of ${constraints.maxHeightCm}cm`);
  }

  if (constraints.maxGirthCm) {
    const girth = 2 * (widthCm + heightCm) + lengthCm;
    if (girth > constraints.maxGirthCm) {
      errors.push(`Girth ${girth}cm exceeds ${constraints.carrierName} max of ${constraints.maxGirthCm}cm`);
    }
  }

  const recommendedSize = findBestParcelSize(carrierCode, weightKg, lengthCm, widthCm, heightCm);
  
  if (!recommendedSize && errors.length === 0) {
    warnings.push(`No standard parcel size fits. May require special handling.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    recommendedSize
  };
}

export function suggestCartonDimensions(
  carrierCode: string,
  totalWeightKg: number,
  totalVolumeCm3: number
): { lengthCm: number; widthCm: number; heightCm: number; parcelSize: ParcelSizeCategory | null } {
  const constraints = getCarrierConstraints(carrierCode);
  
  if (!constraints?.parcelSizes) {
    const cubeSide = Math.ceil(Math.cbrt(totalVolumeCm3 * 1.2));
    return {
      lengthCm: Math.min(cubeSide * 1.5, 60),
      widthCm: cubeSide,
      heightCm: Math.max(cubeSide * 0.7, 10),
      parcelSize: null
    };
  }

  for (const size of constraints.parcelSizes) {
    if (totalWeightKg <= size.maxWeightKg) {
      const sizeVolume = size.maxLengthCm * size.maxWidthCm * size.maxHeightCm;
      if (totalVolumeCm3 <= sizeVolume * 0.85) {
        return {
          lengthCm: size.maxLengthCm,
          widthCm: size.maxWidthCm,
          heightCm: size.maxHeightCm,
          parcelSize: size
        };
      }
    }
  }

  const largest = constraints.parcelSizes[constraints.parcelSizes.length - 1];
  return {
    lengthCm: largest.maxLengthCm,
    widthCm: largest.maxWidthCm,
    heightCm: largest.maxHeightCm,
    parcelSize: largest
  };
}
