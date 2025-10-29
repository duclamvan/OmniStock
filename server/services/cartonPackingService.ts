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

export interface PackingPlan {
  cartons: PackingPlanCarton[];
  totalCartons: number;
  totalWeightKg: number;
  avgUtilization: number;
  suggestions: string[];
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
        totalCartons: 0,
        totalWeightKg: 0,
        avgUtilization: 0,
        suggestions: ['No items to pack']
      };
    }

    if (!packingCartons || packingCartons.length === 0) {
      console.error('No packing cartons available');
      throw new Error('No packing cartons configured. Please add carton types first.');
    }

    const itemsWithDimensions: OrderItemWithDimensions[] = [];

    for (const orderItem of orderItems) {
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
        totalCartons: 0,
        totalWeightKg: 0,
        avgUtilization: 0,
        suggestions: ['No valid items with dimensions found']
      };
    }

    itemsWithDimensions.sort((a, b) => b.volumeCm3 - a.volumeCm3);
    console.log('Items sorted by volume (largest first)');

    const sortedCartons = [...packingCartons].sort((a, b) => {
      const volA = parseFloat(a.innerLengthCm.toString()) * 
                   parseFloat(a.innerWidthCm.toString()) * 
                   parseFloat(a.innerHeightCm.toString());
      const volB = parseFloat(b.innerLengthCm.toString()) * 
                   parseFloat(b.innerWidthCm.toString()) * 
                   parseFloat(b.innerHeightCm.toString());
      return volA - volB;
    });

    const partialCartons: PartialCarton[] = [];
    let cartonCounter = 1;

    for (const item of itemsWithDimensions) {
      let packed = false;
      
      for (const partial of partialCartons) {
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
          console.log(`Packed ${item.quantity}x ${item.productId} into existing carton ${partial.cartonNumber}`);
          break;
        }
      }

      if (!packed) {
        const itemTotalVolume = item.volumeCm3 * item.quantity;
        const itemTotalWeight = item.weightKg * item.quantity;
        
        let suitableCarton: PackingCarton | null = null;
        
        for (const carton of sortedCartons) {
          const cartonVolume = parseFloat(carton.innerLengthCm.toString()) *
                              parseFloat(carton.innerWidthCm.toString()) *
                              parseFloat(carton.innerHeightCm.toString());
          const maxWeight = parseFloat(carton.maxWeightKg.toString());
          
          if (itemTotalVolume <= cartonVolume && itemTotalWeight <= maxWeight) {
            suitableCarton = carton;
            break;
          }
        }

        if (!suitableCarton) {
          suitableCarton = sortedCartons[sortedCartons.length - 1];
          console.warn(`Item ${item.productId} exceeds all carton capacities, using largest carton`);
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
        console.log(`Created new carton ${newPartialCarton.cartonNumber} (${suitableCarton.name}) for ${item.quantity}x ${item.productId}`);
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
    
    const lowUtilizationCartons = cartons.filter(c => c.volumeUtilization < 70);
    if (lowUtilizationCartons.length > 0) {
      suggestions.push(`${lowUtilizationCartons.length} carton(s) have less than 70% utilization`);
      
      const cartonTypeUsage = new Map<string, number>();
      partialCartons.forEach(p => {
        const count = cartonTypeUsage.get(p.carton.id) || 0;
        cartonTypeUsage.set(p.carton.id, count + 1);
      });
      
      if (cartonTypeUsage.size > 1) {
        suggestions.push('Consider consolidating items into fewer carton types for better efficiency');
      }
      
      for (const carton of lowUtilizationCartons) {
        const partial = partialCartons.find(p => p.cartonNumber === carton.cartonNumber);
        if (!partial) continue;
        
        const currentCartonIndex = sortedCartons.findIndex(c => c.id === partial.carton.id);
        
        if (currentCartonIndex > 0) {
          const smallerCarton = sortedCartons[currentCartonIndex - 1];
          const smallerVolume = parseFloat(smallerCarton.innerLengthCm.toString()) *
                               parseFloat(smallerCarton.innerWidthCm.toString()) *
                               parseFloat(smallerCarton.innerHeightCm.toString());
          
          if (partial.totalVolumeCm3 <= smallerVolume && 
              partial.totalWeightKg <= parseFloat(smallerCarton.maxWeightKg.toString())) {
            suggestions.push(`Carton ${carton.cartonNumber} (${partial.carton.name}) could fit in smaller "${smallerCarton.name}"`);
          }
        }
      }
    }

    const overweightCartons = cartons.filter((c, i) => {
      const partial = partialCartons[i];
      const maxWeight = parseFloat(partial.carton.maxWeightKg.toString());
      return partial.totalWeightKg > maxWeight;
    });
    
    if (overweightCartons.length > 0) {
      suggestions.push(`WARNING: ${overweightCartons.length} carton(s) exceed weight limit and need to be redistributed`);
    }

    console.log(`Packing optimization complete: ${totalCartons} cartons, ${totalWeightKg.toFixed(2)}kg total, ${avgUtilization.toFixed(1)}% avg utilization`);

    return {
      cartons,
      totalCartons,
      totalWeightKg: Math.round(totalWeightKg * 100) / 100,
      avgUtilization: Math.round(avgUtilization * 100) / 100,
      suggestions
    };

  } catch (error) {
    console.error('Error optimizing carton packing:', error);
    throw new Error(`Carton packing optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
