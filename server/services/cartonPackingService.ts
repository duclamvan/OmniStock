import type { PackingCarton } from '@shared/schema';
import { inferProductWeightDimensions } from './aiWeightInferenceService';

export interface PackingPlanItem {
  productId: string;
  quantity: number;
  weightKg: number;
  aiEstimated: boolean;
}

export interface PackingPlanCarton {
  cartonId: string;
  cartonNumber: number;
  items: PackingPlanItem[];
  totalWeightKg: number;
  volumeUtilization: number;
  fillingWeightKg: number;
  unusedVolumeCm3: number;
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
}

interface OrderItemWithDimensions {
  productId: string;
  quantity: number;
  product: any;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  volumeCm3: number;
  aiEstimated: boolean;
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

export async function optimizeCartonPacking(
  orderItems: any[],
  packingCartons: PackingCarton[]
): Promise<PackingPlan> {
  try {
    console.log(`Starting carton packing optimization for ${orderItems.length} items with ${packingCartons.length} carton types`);

    if (!orderItems || orderItems.length === 0) {
      console.warn('No order items provided for packing');
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
      console.error('No packing cartons available');
      throw new Error('No packing cartons configured. Please add carton types first.');
    }

    const { cartonNeededItems, nylonWrapItems } = classifyItemsByPackaging(orderItems);

    if (cartonNeededItems.length === 0) {
      console.log('All items are nylon wrap only, no cartons needed');
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

    const itemsWithDimensions: OrderItemWithDimensions[] = [];

    for (const orderItem of cartonNeededItems) {
      const product = orderItem.product;
      if (!product) {
        console.warn(`Order item ${orderItem.id} has no product information, skipping`);
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
        weightKg = parseFloat(existingWeight.toString());
        lengthCm = parseFloat(existingLength.toString());
        widthCm = parseFloat(existingWidth.toString());
        heightCm = parseFloat(existingHeight.toString());
        console.log(`Using existing dimensions for product ${product.id}: ${lengthCm}x${widthCm}x${heightCm}cm, ${weightKg}kg`);
      } else {
        console.log(`Missing dimensions for product ${product.id}, using AI inference`);
        const inferred = await inferProductWeightDimensions(product);
        weightKg = inferred.weightKg;
        lengthCm = inferred.lengthCm;
        widthCm = inferred.widthCm;
        heightCm = inferred.heightCm;
        aiEstimated = true;
        console.log(`AI inferred dimensions for product ${product.id}: ${lengthCm}x${widthCm}x${heightCm}cm, ${weightKg}kg (confidence: ${inferred.confidence})`);
      }

      const volumeCm3 = lengthCm * widthCm * heightCm;

      itemsWithDimensions.push({
        productId: product.id,
        quantity: orderItem.quantity,
        product,
        weightKg,
        lengthCm,
        widthCm,
        heightCm,
        volumeCm3,
        aiEstimated
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

    // Sort cartons by volume DESCENDING (largest first) to prefer bigger cartons
    const sortedCartons = [...packingCartons].sort((a, b) => {
      const volA = parseFloat(a.innerLengthCm.toString()) * 
                   parseFloat(a.innerWidthCm.toString()) * 
                   parseFloat(a.innerHeightCm.toString());
      const volB = parseFloat(b.innerLengthCm.toString()) * 
                   parseFloat(b.innerWidthCm.toString()) * 
                   parseFloat(b.innerHeightCm.toString());
      return volB - volA; // DESCENDING - biggest first
    });
    console.log(`Cartons sorted by volume (largest first): ${sortedCartons.map(c => c.name).join(', ')}`);

    const partialCartons: PartialCarton[] = [];
    let cartonCounter = 1;

    // Calculate total volume and weight of all items
    const totalItemsVolume = itemsWithDimensions.reduce((sum, item) => sum + (item.volumeCm3 * item.quantity), 0);
    const totalItemsWeight = itemsWithDimensions.reduce((sum, item) => sum + (item.weightKg * item.quantity), 0);

    // Try to find ONE large carton that can fit everything first
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
          quantity: item.quantity,
          weightKg: item.weightKg * item.quantity,
          aiEstimated: item.aiEstimated
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
              quantity: item.quantity,
              weightKg: item.weightKg * item.quantity,
              aiEstimated: item.aiEstimated
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
          
          // Find the FIRST (largest) carton that fits - we already sorted largest first
          let suitableCarton: PackingCarton | null = null;
          
          for (const carton of sortedCartons) {
            const cartonVolume = parseFloat(carton.innerLengthCm.toString()) *
                                parseFloat(carton.innerWidthCm.toString()) *
                                parseFloat(carton.innerHeightCm.toString());
            const maxWeight = parseFloat(carton.maxWeightKg.toString());
            
            if (itemTotalVolume <= cartonVolume && itemTotalWeight <= maxWeight) {
              suitableCarton = carton;
              break; // Take first (largest) that fits
            }
          }

          if (!suitableCarton) {
            suitableCarton = sortedCartons[0]; // Use largest carton if item exceeds all
            console.warn(`⚠ Item ${item.productId} exceeds all carton capacities, using largest carton (${suitableCarton.name})`);
          }

          const newPartialCarton: PartialCarton = {
            carton: suitableCarton,
            cartonNumber: cartonCounter++,
            items: [{
              productId: item.productId,
              quantity: item.quantity,
              weightKg: itemTotalWeight,
              aiEstimated: item.aiEstimated
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
      const cartonVolume = parseFloat(partial.carton.innerLengthCm.toString()) *
                          parseFloat(partial.carton.innerWidthCm.toString()) *
                          parseFloat(partial.carton.innerHeightCm.toString());
      const volumeUtilization = (partial.totalVolumeCm3 / cartonVolume) * 100;
      const tareWeight = parseFloat(partial.carton.tareWeightKg.toString());
      
      // Calculate unused volume and filling weight
      const unusedVolumeCm3 = Math.max(0, cartonVolume - partial.totalVolumeCm3);
      // Filling material density: ~0.015 kg per liter (15g per 1000 cm³)
      // Common materials: bubble wrap, air pillows, paper filling
      const fillingWeightKg = (unusedVolumeCm3 / 1000) * 0.015;
      
      return {
        cartonId: partial.carton.id,
        cartonNumber: partial.cartonNumber,
        items: partial.items,
        totalWeightKg: partial.totalWeightKg + tareWeight + fillingWeightKg,
        volumeUtilization: Math.round(volumeUtilization * 100) / 100,
        fillingWeightKg: Math.round(fillingWeightKg * 1000) / 1000,
        unusedVolumeCm3: Math.round(unusedVolumeCm3)
      };
    });

    const totalCartons = cartons.length;
    const totalWeightKg = cartons.reduce((sum, c) => sum + c.totalWeightKg, 0);
    const avgUtilization = cartons.reduce((sum, c) => sum + c.volumeUtilization, 0) / totalCartons;

    const suggestions: string[] = [];
    
    if (canFitInOneCarton) {
      suggestions.push('✅ Optimized: All items fit efficiently in one large carton');
    }
    
    const lowUtilizationCartons = cartons.filter(c => c.volumeUtilization < 60);
    if (lowUtilizationCartons.length > 0) {
      suggestions.push(`${lowUtilizationCartons.length} carton(s) have less than 60% utilization - using larger cartons minimizes shipping cost`);
    }
    
    if (cartons.length === 1 && cartons[0].volumeUtilization >= 70) {
      suggestions.push('✅ Excellent packing efficiency - single carton, good utilization');
    } else if (cartons.length <= 2 && avgUtilization >= 70) {
      suggestions.push('✅ Good packing efficiency - minimal cartons with solid utilization');
    }

    const overweightCartons = cartons.filter((c, i) => {
      const partial = partialCartons[i];
      const maxWeight = parseFloat(partial.carton.maxWeightKg.toString());
      return partial.totalWeightKg > maxWeight;
    });
    
    if (overweightCartons.length > 0) {
      suggestions.push(`WARNING: ${overweightCartons.length} carton(s) exceed weight limit and need to be redistributed`);
    }

    console.log(`✅ Packing optimization complete: ${totalCartons} carton(s), ${totalWeightKg.toFixed(2)}kg total, ${avgUtilization.toFixed(1)}% avg utilization`);

    const cartonSummary = cartons.map((c, i) => {
      const partial = partialCartons[i];
      return `${partial.carton.name}`;
    }).join(', ');

    const reasoning = canFitInOneCarton 
      ? `✅ Optimized: All ${cartonNeededItems.length} item type(s) fit perfectly in ONE ${cartonSummary} carton (${avgUtilization.toFixed(1)}% utilization). ` +
        (nylonWrapItems.length > 0 ? `Additionally, ${nylonWrapItems.length} item type(s) only need nylon wrapping.` : '')
      : `Optimized packing using LARGEST CARTONS: ${cartonNeededItems.length} item type(s) packed into ${totalCartons} carton(s): ${cartonSummary}. ` +
        `Average utilization: ${avgUtilization.toFixed(1)}%. ` +
        (nylonWrapItems.length > 0 ? `Additionally, ${nylonWrapItems.length} item type(s) only need nylon wrapping.` : '');

    return {
      cartons,
      nylonWrapItems,
      totalCartons,
      totalWeightKg: Math.round(totalWeightKg * 100) / 100,
      avgUtilization: Math.round(avgUtilization * 100) / 100,
      suggestions,
      reasoning
    };

  } catch (error) {
    console.error('Error optimizing carton packing:', error);
    throw new Error(`Carton packing optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
