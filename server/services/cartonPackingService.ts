import type { PackingCarton } from '@shared/schema';
import { inferProductWeightDimensions } from './aiWeightInferenceService';
import { 
  getCarrierConstraints, 
  findBestParcelSize, 
  validateCartonForCarrier,
  type ParcelSizeCategory,
  type CarrierConstraints
} from '@shared/carrierConstraints';

export interface PackingPlanItem {
  productId: string;
  productName?: string;
  quantity: number;
  weightKg: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  aiEstimated: boolean;
  isBulkWrappable?: boolean;
  // Discount information
  discount?: number;
  discountPercentage?: number;
  appliedDiscountLabel?: string | null;
  appliedDiscountType?: string | null;
  freeItemsCount?: number;
}

export interface PackingPlanCarton {
  cartonId: string;
  cartonNumber: number;
  cartonName?: string;
  items: PackingPlanItem[];
  totalWeightKg: number;
  payloadWeightKg?: number;
  volumeUtilization: number;
  fillingWeightKg: number;
  unusedVolumeCm3: number;
  innerLengthCm?: number;
  innerWidthCm?: number;
  innerHeightCm?: number;
  recommendedParcelSize?: ParcelSizeCategory | null;
  carrierValidation?: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export interface NylonWrapItem {
  productId: string;
  productName: string;
  quantity: number;
  packagingRequirement: string;
}

export interface PackingPlan {
  cartons: PackingPlanCarton[];
  nylonWrapItems: NylonWrapItem[];
  totalCartons: number;
  totalWeightKg: number;
  avgUtilization: number;
  suggestions: string[];
  reasoning: string;
  carrierCode?: string;
  carrierConstraints?: CarrierConstraints | null;
  estimatedShippingCost?: number;
  shippingCurrency?: string;
}

interface OrderItemWithDimensions {
  productId: string;
  productName?: string;
  quantity: number;
  product: any;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  volumeCm3: number;
  aiEstimated: boolean;
  isBulkWrappable?: boolean;
  // Discount information
  discount?: number;
  discountPercentage?: number;
  appliedDiscountLabel?: string | null;
  appliedDiscountType?: string | null;
  freeItemsCount?: number;
  // Origin tracking
  fromBundle?: string;
  isBulkExpanded?: boolean;
  bulkUnitQty?: number;
  isServicePart?: boolean;
}

export interface ShippingRates {
  pplDefaultShippingPrice?: number;
  pplDefaultShippingPriceWithDobirka?: number;
  glsDefaultShippingPrice?: number;
  dhlDefaultShippingPrice?: number;
  // Weight-based rates from settings (JSON parsed)
  pplShippingRates?: any;
  glsShippingRates?: any;
  dhlShippingRates?: any;
}

export interface PackingOptions {
  carrierCode?: string;
  shippingCountry?: string;
  preferBulkWrapping?: boolean;
  shippingRates?: ShippingRates;
}

interface PartialCarton {
  carton: PackingCarton;
  cartonNumber: number;
  items: PackingPlanItem[];
  totalWeightKg: number;
  totalVolumeCm3: number;
}

export function classifyItemsByPackaging(orderItems: any[]): {
  cartonNeededItems: any[];
  nylonWrapItems: NylonWrapItem[];
} {
  const cartonNeededItems: any[] = [];
  const nylonWrapItems: NylonWrapItem[] = [];

  for (const item of orderItems) {
    const product = item.product;
    if (!product) {
      cartonNeededItems.push(item);
      continue;
    }

    const packagingReq = product.packagingRequirement || 'carton';
    
    if (packagingReq === 'nylon_wrap' || packagingReq === 'outer_carton') {
      nylonWrapItems.push({
        productId: product.id,
        productName: product.name || item.productName,
        quantity: item.quantity,
        packagingRequirement: packagingReq
      });
    } else {
      cartonNeededItems.push(item);
    }
  }

  console.log(`Classified items: ${cartonNeededItems.length} need cartons, ${nylonWrapItems.length} nylon wrap only`);
  
  return {
    cartonNeededItems,
    nylonWrapItems
  };
}

function normalizeWeightAndDimensions(
  weightKg: number,
  lengthCm: number,
  widthCm: number,
  heightCm: number,
  productName: string
): { weightKg: number; lengthCm: number; widthCm: number; heightCm: number; wasNormalized: boolean } {
  let wasNormalized = false;
  let normalizedWeight = weightKg;
  let normalizedLength = lengthCm;
  let normalizedWidth = widthCm;
  let normalizedHeight = heightCm;
  
  const volumeCm3 = lengthCm * widthCm * heightCm;
  const isSmallItem = productName.toLowerCase().match(/polish|gel|nail|bottle|15ml|10ml|5ml|brush|file|tip|lamp|led|uv/i);
  
  if (weightKg > 5 && volumeCm3 < 5000 && isSmallItem) {
    normalizedWeight = weightKg / 1000;
    console.log(`⚠️ Weight normalization: ${productName} - converted ${weightKg}kg → ${normalizedWeight}kg (likely entered in grams)`);
    wasNormalized = true;
  }
  
  if (weightKg > 50 && volumeCm3 < 50000) {
    normalizedWeight = weightKg / 1000;
    console.log(`⚠️ Weight normalization: ${productName} - converted ${weightKg}kg → ${normalizedWeight}kg (unrealistic weight for size)`);
    wasNormalized = true;
  }
  
  if (lengthCm > 100 && widthCm > 100 && heightCm > 100 && isSmallItem) {
    normalizedLength = lengthCm / 10;
    normalizedWidth = widthCm / 10;
    normalizedHeight = heightCm / 10;
    console.log(`⚠️ Dimension normalization: ${productName} - converted ${lengthCm}×${widthCm}×${heightCm}cm → ${normalizedLength}×${normalizedWidth}×${normalizedHeight}cm (likely entered in mm)`);
    wasNormalized = true;
  }
  
  if (lengthCm > 200 || widthCm > 200 || heightCm > 200) {
    if (lengthCm > 200) normalizedLength = lengthCm / 10;
    if (widthCm > 200) normalizedWidth = widthCm / 10;
    if (heightCm > 200) normalizedHeight = heightCm / 10;
    console.log(`⚠️ Dimension normalization: ${productName} - dimensions exceed 200cm, likely mm input`);
    wasNormalized = true;
  }
  
  normalizedWeight = Math.max(0.001, Math.min(50, normalizedWeight));
  normalizedLength = Math.max(0.5, Math.min(150, normalizedLength));
  normalizedWidth = Math.max(0.5, Math.min(150, normalizedWidth));
  normalizedHeight = Math.max(0.5, Math.min(150, normalizedHeight));
  
  return {
    weightKg: normalizedWeight,
    lengthCm: normalizedLength,
    widthCm: normalizedWidth,
    heightCm: normalizedHeight,
    wasNormalized
  };
}

const FAST_FALLBACK_DIMENSIONS = {
  weightKg: 0.05,
  lengthCm: 5,
  widthCm: 3,
  heightCm: 8,
};

export async function optimizeCartonPacking(
  orderItems: any[],
  packingCartons: PackingCarton[],
  options: PackingOptions = {}
): Promise<PackingPlan> {
  const startTime = Date.now();
  try {
    const { carrierCode, shippingCountry, preferBulkWrapping = true } = options;
    const carrierConstraints = carrierCode ? getCarrierConstraints(carrierCode) : null;
    const isLargeOrder = orderItems.length > 50;
    
    console.log(`🚀 Starting OPTIMIZED carton packing for ${orderItems.length} items with ${packingCartons.length} carton types`);
    if (carrierCode) {
      console.log(`Carrier: ${carrierCode}, Constraints: ${carrierConstraints ? 'Found' : 'Not found'}`);
    }

    if (!orderItems || orderItems.length === 0) {
      return {
        cartons: [],
        nylonWrapItems: [],
        totalCartons: 0,
        totalWeightKg: 0,
        avgUtilization: 0,
        suggestions: ['No items to pack'],
        reasoning: 'No items to pack'
      };
    }

    if (!packingCartons || packingCartons.length === 0) {
      throw new Error('No packing cartons configured. Please add carton types first.');
    }

    const { cartonNeededItems, nylonWrapItems } = classifyItemsByPackaging(orderItems);

    if (cartonNeededItems.length === 0) {
      return {
        cartons: [],
        nylonWrapItems,
        totalCartons: 0,
        totalWeightKg: 0,
        avgUtilization: 0,
        suggestions: ['All items only need nylon wrap packaging'],
        reasoning: `All ${nylonWrapItems.length} item type(s) have outer packaging and only need nylon wrapping. No cartons required.`
      };
    }

    const dimensionCache = new Map<string, { weightKg: number; lengthCm: number; widthCm: number; heightCm: number; aiEstimated: boolean }>();
    const itemsWithDimensions: OrderItemWithDimensions[] = [];
    let missingDimensionsCount = 0;

    for (const orderItem of cartonNeededItems) {
      const product = orderItem.product;
      if (!product) continue;

      const productId = product.id;
      
      if (dimensionCache.has(productId)) {
        const cached = dimensionCache.get(productId)!;
        itemsWithDimensions.push({
          productId,
          productName: product.name || orderItem.productName,
          quantity: orderItem.quantity,
          product,
          weightKg: cached.weightKg,
          lengthCm: cached.lengthCm,
          widthCm: cached.widthCm,
          heightCm: cached.heightCm,
          volumeCm3: cached.lengthCm * cached.widthCm * cached.heightCm,
          aiEstimated: cached.aiEstimated,
          isBulkWrappable: false,
          discount: orderItem.discount,
          discountPercentage: orderItem.discountPercentage,
          appliedDiscountLabel: orderItem.appliedDiscountLabel,
          appliedDiscountType: orderItem.appliedDiscountType,
          freeItemsCount: orderItem.freeItemsCount,
          fromBundle: orderItem.fromBundle,
          isBulkExpanded: orderItem.isBulkExpanded,
          bulkUnitQty: orderItem.bulkUnitQty,
          isServicePart: orderItem.isServicePart
        });
        continue;
      }

      let weightKg: number;
      let lengthCm: number;
      let widthCm: number;
      let heightCm: number;
      let aiEstimated = false;

      const existingWeight = product.unitWeightKg || product.weight;
      const existingLength = product.unitLengthCm || product.length;
      const existingWidth = product.unitWidthCm || product.width;
      const existingHeight = product.unitHeightCm || product.height;

      if (existingWeight && existingLength && existingWidth && existingHeight) {
        const rawWeight = parseFloat(existingWeight.toString());
        const rawLength = parseFloat(existingLength.toString());
        const rawWidth = parseFloat(existingWidth.toString());
        const rawHeight = parseFloat(existingHeight.toString());
        
        const normalized = normalizeWeightAndDimensions(
          rawWeight, rawLength, rawWidth, rawHeight,
          product.name || orderItem.productName || 'Unknown'
        );
        
        weightKg = normalized.weightKg;
        lengthCm = normalized.lengthCm;
        widthCm = normalized.widthCm;
        heightCm = normalized.heightCm;
        
        if (!isLargeOrder && normalized.wasNormalized) {
          console.log(`Normalized: ${product.id} → ${lengthCm}x${widthCm}x${heightCm}cm, ${weightKg}kg`);
        }
      } else {
        missingDimensionsCount++;
        if (isLargeOrder) {
          weightKg = FAST_FALLBACK_DIMENSIONS.weightKg;
          lengthCm = FAST_FALLBACK_DIMENSIONS.lengthCm;
          widthCm = FAST_FALLBACK_DIMENSIONS.widthCm;
          heightCm = FAST_FALLBACK_DIMENSIONS.heightCm;
          aiEstimated = true;
        } else {
          const inferred = await inferProductWeightDimensions(product);
          weightKg = inferred.weightKg;
          lengthCm = inferred.lengthCm;
          widthCm = inferred.widthCm;
          heightCm = inferred.heightCm;
          aiEstimated = true;
        }
      }

      dimensionCache.set(productId, { weightKg, lengthCm, widthCm, heightCm, aiEstimated });
      const volumeCm3 = lengthCm * widthCm * heightCm;
      
      const isBulkWrappable = preferBulkWrapping && (
        product.bulkUnitName || 
        product.packagingRequirement === 'outer_carton' ||
        (product.name && (
          product.name.toLowerCase().includes('box') ||
          product.name.toLowerCase().includes('carton') ||
          product.name.toLowerCase().includes('case')
        ))
      );

      itemsWithDimensions.push({
        productId: product.id,
        productName: product.name || orderItem.productName,
        quantity: orderItem.quantity,
        product,
        weightKg,
        lengthCm,
        widthCm,
        heightCm,
        volumeCm3,
        aiEstimated,
        isBulkWrappable,
        // Discount information passed from order
        discount: orderItem.discount,
        discountPercentage: orderItem.discountPercentage,
        appliedDiscountLabel: orderItem.appliedDiscountLabel,
        appliedDiscountType: orderItem.appliedDiscountType,
        freeItemsCount: orderItem.freeItemsCount,
        // Origin tracking
        fromBundle: orderItem.fromBundle,
        isBulkExpanded: orderItem.isBulkExpanded,
        bulkUnitQty: orderItem.bulkUnitQty,
        isServicePart: orderItem.isServicePart
      });
    }

    if (itemsWithDimensions.length === 0) {
      console.warn('No valid items with dimensions found');
      return {
        cartons: [],
        nylonWrapItems,
        totalCartons: 0,
        totalWeightKg: 0,
        avgUtilization: 0,
        suggestions: ['No valid items with dimensions found'],
        reasoning: nylonWrapItems.length > 0 
          ? `${nylonWrapItems.length} item type(s) only need nylon wrapping. No items with valid dimensions found for carton packing.`
          : 'No valid items with dimensions found'
      };
    }

    itemsWithDimensions.sort((a, b) => b.volumeCm3 - a.volumeCm3);
    console.log('Items sorted by volume (largest first)');

    // Sort cartons by volume ASCENDING (smallest first) to maximize utilization
    const sortedCartons = [...packingCartons].sort((a, b) => {
      const volA = parseFloat(a.innerLengthCm.toString()) * 
                   parseFloat(a.innerWidthCm.toString()) * 
                   parseFloat(a.innerHeightCm.toString());
      const volB = parseFloat(b.innerLengthCm.toString()) * 
                   parseFloat(b.innerWidthCm.toString()) * 
                   parseFloat(b.innerHeightCm.toString());
      return volA - volB; // ASCENDING - smallest first for maximum utilization
    });
    console.log(`Cartons sorted by volume (smallest first for max utilization): ${sortedCartons.map(c => c.name).join(', ')}`);

    const partialCartons: PartialCarton[] = [];
    let cartonCounter = 1;

    // Calculate total volume and weight of all items
    const totalItemsVolume = itemsWithDimensions.reduce((sum, item) => sum + (item.volumeCm3 * item.quantity), 0);
    const totalItemsWeight = itemsWithDimensions.reduce((sum, item) => sum + (item.weightKg * item.quantity), 0);

    // Try to find the SMALLEST carton that can fit everything (maximum utilization)
    let canFitInOneCarton = false;
    for (const carton of sortedCartons) {
      const cartonVolume = parseFloat(carton.innerLengthCm.toString()) *
                          parseFloat(carton.innerWidthCm.toString()) *
                          parseFloat(carton.innerHeightCm.toString());
      const maxWeight = parseFloat(carton.maxWeightKg.toString());
      
      if (totalItemsVolume <= cartonVolume && totalItemsWeight <= maxWeight) {
        // Everything fits in one carton!
        console.log(`✅ All items fit in ONE ${carton.name} carton (${totalItemsVolume.toFixed(0)}cm³ of ${cartonVolume.toFixed(0)}cm³, ${totalItemsWeight.toFixed(2)}kg of ${maxWeight}kg)`);
        
        const allItems: PackingPlanItem[] = itemsWithDimensions.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          weightKg: item.weightKg * item.quantity,
          lengthCm: item.lengthCm,
          widthCm: item.widthCm,
          heightCm: item.heightCm,
          aiEstimated: item.aiEstimated,
          isBulkWrappable: item.isBulkWrappable,
          discount: item.discount,
          discountPercentage: item.discountPercentage,
          appliedDiscountLabel: item.appliedDiscountLabel,
          appliedDiscountType: item.appliedDiscountType,
          freeItemsCount: item.freeItemsCount
        }));
        
        partialCartons.push({
          carton,
          cartonNumber: 1,
          items: allItems,
          totalWeightKg: totalItemsWeight,
          totalVolumeCm3: totalItemsVolume
        });
        
        canFitInOneCarton = true;
        break;
      }
    }

    // If can't fit in one carton, use improved bin packing
    if (!canFitInOneCarton) {
      console.log(`Items need multiple cartons. Using optimized packing strategy.`);
      
      for (const item of itemsWithDimensions) {
        let packed = false;
        
        // Sort partial cartons by remaining capacity (largest remaining capacity first)
        // This helps consolidate items into fewer cartons
        const sortedPartials = [...partialCartons].sort((a, b) => {
          const aVolume = parseFloat(a.carton.innerLengthCm.toString()) *
                         parseFloat(a.carton.innerWidthCm.toString()) *
                         parseFloat(a.carton.innerHeightCm.toString());
          const bVolume = parseFloat(b.carton.innerLengthCm.toString()) *
                         parseFloat(b.carton.innerWidthCm.toString()) *
                         parseFloat(b.carton.innerHeightCm.toString());
          const aRemaining = aVolume - a.totalVolumeCm3;
          const bRemaining = bVolume - b.totalVolumeCm3;
          return bRemaining - aRemaining; // Largest remaining capacity first
        });
        
        for (const partial of sortedPartials) {
          const cartonVolume = parseFloat(partial.carton.innerLengthCm.toString()) *
                              parseFloat(partial.carton.innerWidthCm.toString()) *
                              parseFloat(partial.carton.innerHeightCm.toString());
          
          const newTotalVolume = partial.totalVolumeCm3 + (item.volumeCm3 * item.quantity);
          const newTotalWeight = partial.totalWeightKg + (item.weightKg * item.quantity);
          const maxWeight = parseFloat(partial.carton.maxWeightKg.toString());

          if (newTotalVolume <= cartonVolume && newTotalWeight <= maxWeight) {
            partial.items.push({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              weightKg: item.weightKg * item.quantity,
              lengthCm: item.lengthCm,
              widthCm: item.widthCm,
              heightCm: item.heightCm,
              aiEstimated: item.aiEstimated,
              isBulkWrappable: item.isBulkWrappable,
              discount: item.discount,
              discountPercentage: item.discountPercentage,
              appliedDiscountLabel: item.appliedDiscountLabel,
              appliedDiscountType: item.appliedDiscountType,
              freeItemsCount: item.freeItemsCount
            });
            partial.totalWeightKg = newTotalWeight;
            partial.totalVolumeCm3 = newTotalVolume;
            packed = true;
            console.log(`✓ Packed ${item.quantity}x ${item.productId} into existing carton ${partial.cartonNumber} (${partial.carton.name})`);
            break;
          }
        }

        if (!packed) {
          const itemTotalVolume = item.volumeCm3 * item.quantity;
          const itemTotalWeight = item.weightKg * item.quantity;
          
          // Find the SMALLEST carton that fits (maximum utilization)
          let suitableCarton: PackingCarton | null = null;
          
          for (const carton of sortedCartons) {
            const cartonVolume = parseFloat(carton.innerLengthCm.toString()) *
                                parseFloat(carton.innerWidthCm.toString()) *
                                parseFloat(carton.innerHeightCm.toString());
            const maxWeight = parseFloat(carton.maxWeightKg.toString());
            
            if (itemTotalVolume <= cartonVolume && itemTotalWeight <= maxWeight) {
              suitableCarton = carton;
              break; // Take first (smallest) that fits for maximum utilization
            }
          }

          if (!suitableCarton) {
            suitableCarton = sortedCartons[sortedCartons.length - 1]; // Use largest carton if item exceeds all
            console.warn(`⚠ Item ${item.productId} exceeds all carton capacities, using largest carton (${suitableCarton.name})`);
          }

          const newPartialCarton: PartialCarton = {
            carton: suitableCarton,
            cartonNumber: cartonCounter++,
            items: [{
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              weightKg: itemTotalWeight,
              lengthCm: item.lengthCm,
              widthCm: item.widthCm,
              heightCm: item.heightCm,
              aiEstimated: item.aiEstimated,
              isBulkWrappable: item.isBulkWrappable,
              discount: item.discount,
              discountPercentage: item.discountPercentage,
              appliedDiscountLabel: item.appliedDiscountLabel,
              appliedDiscountType: item.appliedDiscountType,
              freeItemsCount: item.freeItemsCount
            }],
            totalWeightKg: itemTotalWeight,
            totalVolumeCm3: itemTotalVolume
          };
          
          partialCartons.push(newPartialCarton);
          console.log(`📦 Created new carton ${newPartialCarton.cartonNumber} (${suitableCarton.name}) for ${item.quantity}x ${item.productId}`);
        }
      }
    }

    const cartons: PackingPlanCarton[] = partialCartons.map(partial => {
      const innerLengthCm = parseFloat(partial.carton.innerLengthCm.toString());
      const innerWidthCm = parseFloat(partial.carton.innerWidthCm.toString());
      const innerHeightCm = parseFloat(partial.carton.innerHeightCm.toString());
      const cartonVolume = innerLengthCm * innerWidthCm * innerHeightCm;
      const volumeUtilization = (partial.totalVolumeCm3 / cartonVolume) * 100;
      const tareWeight = parseFloat(partial.carton.tareWeightKg.toString());
      
      const unusedVolumeCm3 = Math.max(0, cartonVolume - partial.totalVolumeCm3);
      const fillingWeightKg = (unusedVolumeCm3 / 1000) * 0.015;
      
      const totalWeightKg = partial.totalWeightKg + tareWeight + fillingWeightKg;
      
      let recommendedParcelSize = null;
      let carrierValidation = undefined;
      
      if (carrierCode) {
        recommendedParcelSize = findBestParcelSize(
          carrierCode,
          totalWeightKg,
          innerLengthCm,
          innerWidthCm,
          innerHeightCm
        );
        
        carrierValidation = validateCartonForCarrier(
          carrierCode,
          totalWeightKg,
          innerLengthCm,
          innerWidthCm,
          innerHeightCm
        );
      }
      
      return {
        cartonId: partial.carton.id,
        cartonNumber: partial.cartonNumber,
        cartonName: partial.carton.name,
        items: partial.items,
        totalWeightKg: Math.round(totalWeightKg * 100) / 100,
        payloadWeightKg: Math.round(partial.totalWeightKg * 100) / 100,
        volumeUtilization: Math.round(volumeUtilization * 100) / 100,
        fillingWeightKg: Math.round(fillingWeightKg * 1000) / 1000,
        unusedVolumeCm3: Math.round(unusedVolumeCm3),
        innerLengthCm,
        innerWidthCm,
        innerHeightCm,
        recommendedParcelSize,
        carrierValidation
      };
    });

    const totalCartons = cartons.length;
    const totalWeightKg = cartons.reduce((sum, c) => sum + c.totalWeightKg, 0);
    const avgUtilization = cartons.reduce((sum, c) => sum + c.volumeUtilization, 0) / totalCartons;

    const suggestions: string[] = [];
    
    if (canFitInOneCarton) {
      suggestions.push('✅ Optimized: All items fit efficiently in one compact carton');
    }
    
    const lowUtilizationCartons = cartons.filter(c => c.volumeUtilization < 60);
    if (lowUtilizationCartons.length > 0) {
      suggestions.push(`${lowUtilizationCartons.length} carton(s) have less than 60% utilization - consider using smaller cartons to maximize efficiency`);
    }
    
    if (cartons.length === 1 && cartons[0].volumeUtilization >= 70) {
      suggestions.push('✅ Excellent packing efficiency - single carton, high utilization');
    } else if (cartons.length <= 2 && avgUtilization >= 70) {
      suggestions.push('✅ Good packing efficiency - minimal cartons with high utilization');
    }

    const overweightCartons = cartons.filter((c, i) => {
      const partial = partialCartons[i];
      const maxWeight = parseFloat(partial.carton.maxWeightKg.toString());
      return partial.totalWeightKg > maxWeight;
    });
    
    if (overweightCartons.length > 0) {
      suggestions.push(`WARNING: ${overweightCartons.length} carton(s) exceed weight limit and need to be redistributed`);
    }
    
    if (carrierCode && carrierConstraints) {
      const invalidCartons = cartons.filter(c => c.carrierValidation && !c.carrierValidation.valid);
      if (invalidCartons.length > 0) {
        suggestions.push(`⚠ ${invalidCartons.length} carton(s) exceed ${carrierConstraints.carrierName} limits`);
      }
      
      const parcelSizes = cartons.map(c => c.recommendedParcelSize?.name).filter(Boolean) as string[];
      if (parcelSizes.length > 0) {
        const uniqueSizes = Array.from(new Set(parcelSizes));
        suggestions.push(`📦 Recommended ${carrierConstraints.carrierName} sizes: ${uniqueSizes.join(', ')}`);
      }
      
      const bulkItems = itemsWithDimensions.filter(item => item.isBulkWrappable);
      if (bulkItems.length > 0) {
        suggestions.push(`💡 ${bulkItems.length} item(s) can be bulk-wrapped together for efficiency`);
      }
    }
    
    let estimatedShippingCost = 0;
    let shippingCurrency = 'EUR';
    
    // Calculate shipping cost using settings rates if available, otherwise fall back to parcel size estimates
    const { shippingRates } = options;
    
    if (shippingRates && carrierCode) {
      // Use settings-based shipping rates
      const normalizedCarrier = carrierCode.toUpperCase().replace(/[-_]/g, ' ');
      
      if (normalizedCarrier.includes('PPL')) {
        // PPL CZ - use default price from settings, currency is CZK
        if (shippingRates.pplDefaultShippingPrice && shippingRates.pplDefaultShippingPrice > 0) {
          estimatedShippingCost = shippingRates.pplDefaultShippingPrice;
          shippingCurrency = 'CZK';
        } else {
          // Fall back to parcel size estimates
          for (const carton of cartons) {
            if (carton.recommendedParcelSize?.costEstimate) {
              estimatedShippingCost += carton.recommendedParcelSize.costEstimate;
              shippingCurrency = carton.recommendedParcelSize.currency || 'CZK';
            }
          }
        }
      } else if (normalizedCarrier.includes('GLS')) {
        // GLS DE - use default price from settings, currency is EUR
        if (shippingRates.glsDefaultShippingPrice && shippingRates.glsDefaultShippingPrice > 0) {
          estimatedShippingCost = shippingRates.glsDefaultShippingPrice;
          shippingCurrency = 'EUR';
        } else {
          // Fall back to parcel size estimates
          for (const carton of cartons) {
            if (carton.recommendedParcelSize?.costEstimate) {
              estimatedShippingCost += carton.recommendedParcelSize.costEstimate;
              shippingCurrency = carton.recommendedParcelSize.currency || 'EUR';
            }
          }
        }
      } else if (normalizedCarrier.includes('DHL')) {
        // DHL DE - use weight-based rates from settings if available
        const dhlRates = shippingRates.dhlShippingRates;
        if (dhlRates && typeof dhlRates === 'object') {
          // Find the appropriate rate tier based on total weight
          const sortedTiers = Object.entries(dhlRates)
            .filter(([key]) => key !== 'nachnahme')
            .map(([key, value]: [string, any]) => ({
              key,
              maxWeight: value.maxWeight || 0,
              price: value.price || 0
            }))
            .sort((a, b) => a.maxWeight - b.maxWeight);
          
          // Find the first tier that can handle the total weight
          const matchingTier = sortedTiers.find(tier => totalWeightKg <= tier.maxWeight);
          if (matchingTier) {
            // Cost = price per carton * number of cartons
            estimatedShippingCost = matchingTier.price * cartons.length;
            shippingCurrency = 'EUR';
          }
        }
        
        // Fall back to default price or parcel estimates
        if (estimatedShippingCost === 0) {
          if (shippingRates.dhlDefaultShippingPrice && shippingRates.dhlDefaultShippingPrice > 0) {
            estimatedShippingCost = shippingRates.dhlDefaultShippingPrice;
            shippingCurrency = 'EUR';
          } else {
            for (const carton of cartons) {
              if (carton.recommendedParcelSize?.costEstimate) {
                estimatedShippingCost += carton.recommendedParcelSize.costEstimate;
                shippingCurrency = carton.recommendedParcelSize.currency || 'EUR';
              }
            }
          }
        }
      }
    } else {
      // No settings rates - use parcel size estimates from carrier constraints
      for (const carton of cartons) {
        if (carton.recommendedParcelSize?.costEstimate) {
          estimatedShippingCost += carton.recommendedParcelSize.costEstimate;
          shippingCurrency = carton.recommendedParcelSize.currency || 'EUR';
        }
      }
    }

    const elapsedMs = Date.now() - startTime;
    console.log(`✅ Packing optimization complete in ${elapsedMs}ms: ${totalCartons} carton(s), ${totalWeightKg.toFixed(2)}kg total, ${avgUtilization.toFixed(1)}% avg utilization`);
    if (missingDimensionsCount > 0) {
      console.log(`⚠️ ${missingDimensionsCount} products used fallback dimensions (missing weight/size data)`);
    }

    const cartonSummary = cartons.map((c, i) => {
      const partial = partialCartons[i];
      return `${partial.carton.name}`;
    }).join(', ');

    const reasoning = canFitInOneCarton 
      ? `✅ Optimized: All ${cartonNeededItems.length} item type(s) fit perfectly in ONE ${cartonSummary} carton (${avgUtilization.toFixed(1)}% utilization) - using the smallest carton for maximum efficiency. ` +
        (nylonWrapItems.length > 0 ? `Additionally, ${nylonWrapItems.length} item type(s) only need nylon wrapping.` : '')
      : `Optimized packing using SMALLEST SUITABLE CARTONS: ${cartonNeededItems.length} item type(s) packed into ${totalCartons} carton(s): ${cartonSummary}. ` +
        `Average utilization: ${avgUtilization.toFixed(1)}%. ` +
        (nylonWrapItems.length > 0 ? `Additionally, ${nylonWrapItems.length} item type(s) only need nylon wrapping.` : '');

    return {
      cartons,
      nylonWrapItems,
      totalCartons,
      totalWeightKg: Math.round(totalWeightKg * 100) / 100,
      avgUtilization: Math.round(avgUtilization * 100) / 100,
      suggestions,
      reasoning,
      carrierCode,
      carrierConstraints,
      estimatedShippingCost: Math.round(estimatedShippingCost * 100) / 100,
      shippingCurrency
    };

  } catch (error) {
    console.error('Error optimizing carton packing:', error);
    throw new Error(`Carton packing optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
