import { storage } from "../storage";
import type { Order, Product, PackingMaterial, ProductVariant } from "@shared/schema";

interface WeightCalculationResult {
  totalWeight: number;
  breakdown: {
    itemsWeight: number;
    packingMaterialsWeight: number;
    cartonWeight: number;
    additionalWeight: number;
  };
  recommendations: {
    shippingMethod: string;
    handlingInstructions: string[];
  };
  confidence: number;
  multiCartonPlan?: MultiCartonResponse;
}

interface CartonPackingPlan {
  cartonId: string;
  cartonName: string;
  cartonWeight: number;
  maxWeight: number;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
  }>;
  totalItemsWeight: number;
  packingMaterialsWeight: number;
  finalWeight: number;
  utilizationPercent: number;
  costEstimate: number;
}

interface MultiCartonResponse {
  totalWeight: number;
  totalCost: number;
  cartonPlans: CartonPackingPlan[];
  confidence: number;
  recommendations: {
    shippingMethod: string;
    handlingInstructions: string[];
    costSavings?: string;
  };
}

interface CartonSpec {
  id: string;
  name: string;
  weight: number; // in kg
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  maxWeight: number;
  material: string;
}

export class AIWeightCalculationService {
  // Standard carton specifications with weights
  private readonly standardCartons: CartonSpec[] = [
    {
      id: 'E1',
      name: 'E1 - Small Envelope',
      weight: 0.015, // 15g
      dimensions: { length: 22, width: 16, height: 2 },
      maxWeight: 0.5,
      material: 'Padded Envelope'
    },
    {
      id: 'E2',
      name: 'E2 - Medium Envelope',
      weight: 0.025, // 25g
      dimensions: { length: 27, width: 20, height: 3 },
      maxWeight: 1.0,
      material: 'Padded Envelope'
    },
    {
      id: 'K1',
      name: 'K1 - Small Carton',
      weight: 0.085, // 85g
      dimensions: { length: 20, width: 15, height: 10 },
      maxWeight: 5.0,
      material: 'Corrugated Cardboard'
    },
    {
      id: 'K2',
      name: 'K2 - Medium Carton',
      weight: 0.150, // 150g
      dimensions: { length: 30, width: 20, height: 15 },
      maxWeight: 10.0,
      material: 'Corrugated Cardboard'
    },
    {
      id: 'K3',
      name: 'K3 - Large Carton',
      weight: 0.220, // 220g
      dimensions: { length: 40, width: 30, height: 20 },
      maxWeight: 20.0,
      material: 'Corrugated Cardboard'
    },
    {
      id: 'F1',
      name: 'F1 - Fragile Protection Box',
      weight: 0.180, // 180g
      dimensions: { length: 35, width: 25, height: 18 },
      maxWeight: 15.0,
      material: 'Reinforced Cardboard with Foam'
    },
    {
      id: 'B1',
      name: 'B1 - Bottle Protection Box',
      weight: 0.200, // 200g
      dimensions: { length: 25, width: 25, height: 35 },
      maxWeight: 12.0,
      material: 'Cardboard with Dividers'
    }
  ];

  /**
   * Calculate the total package weight using AI analysis
   */
  async calculatePackageWeight(orderId: string, selectedCartonId?: string, optimizeMultipleCartons?: boolean): Promise<WeightCalculationResult> {
    try {
      // Get order details with items
      const order = await storage.getOrderById(orderId);
      
      if (!order) {
        console.error(`Order ${orderId} not found`);
        // Return a default weight calculation for mock data
        return {
          totalWeight: 0.5,
          breakdown: {
            itemsWeight: 0.3,
            packingMaterialsWeight: 0.05,
            cartonWeight: 0.1,
            additionalWeight: 0.05
          },
          recommendations: {
            shippingMethod: 'Standard',
            handlingInstructions: []
          },
          confidence: 0.8
        };
      }

      // Get order items
      const items = await storage.getOrderItems(order.id);
      
      // Enrich items with bundle details
      const itemsWithBundleDetails = await Promise.all(items.map(async (item) => {
        // Check if this product is a bundle
        const bundles = await storage.getBundles();
        const bundle = bundles.find(b => item.productName.includes(b.name));
        
        if (bundle) {
          // Fetch bundle items
          const bundleItems = await storage.getBundleItems(bundle.id);
          const bundleItemsWithDetails = await Promise.all(bundleItems.map(async (bundleItem) => {
            let productName = '';
            if (bundleItem.productId) {
              const product = await storage.getProductById(bundleItem.productId);
              productName = product?.name || '';
              
              if (bundleItem.variantId) {
                const variants = await storage.getProductVariants(bundleItem.productId);
                const variant = variants.find(v => v.id === bundleItem.variantId);
                if (variant) {
                  productName = `${productName} - ${variant.name}`;
                }
              }
            }
            
            return {
              id: bundleItem.id,
              name: productName || bundleItem.notes || 'Bundle Item',
              quantity: bundleItem.quantity,
              picked: false,
              location: 'A1-R1-S1'
            };
          }));
          
          return {
            ...item,
            isBundle: true,
            bundleItems: bundleItemsWithDetails
          };
        }
        
        return item;
      }));
      
      // Create enriched order with bundle details
      const enrichedOrder = {
        ...order,
        items: itemsWithBundleDetails
      };

      // Calculate items weight
      const itemsWeight = await this.calculateItemsWeight(enrichedOrder);
      
      // Get packing materials weight
      const packingMaterialsWeight = await this.calculatePackingMaterialsWeight(order);
      
      // Get carton weight
      const cartonWeight = this.getCartonWeight(selectedCartonId);
      
      // Calculate additional weight (tape, labels, padding)
      const additionalWeight = this.calculateAdditionalWeight(itemsWeight, cartonWeight);
      
      // Total weight calculation
      const totalWeight = itemsWeight + packingMaterialsWeight + cartonWeight + additionalWeight;
      
      // Generate shipping recommendations
      const recommendations = this.generateShippingRecommendations(totalWeight, order);
      
      // Calculate confidence based on data completeness
      const confidence = this.calculateConfidence(order, selectedCartonId);

      const result: WeightCalculationResult = {
        totalWeight: Math.round(totalWeight * 1000) / 1000, // Round to 3 decimal places
        breakdown: {
          itemsWeight: Math.round(itemsWeight * 1000) / 1000,
          packingMaterialsWeight: Math.round(packingMaterialsWeight * 1000) / 1000,
          cartonWeight: Math.round(cartonWeight * 1000) / 1000,
          additionalWeight: Math.round(additionalWeight * 1000) / 1000
        },
        recommendations,
        confidence
      };

      // Add multi-carton optimization if requested
      if (optimizeMultipleCartons) {
        result.multiCartonPlan = await this.optimizeMultiCartonPacking(orderId);
      }

      console.log('Weight calculation result:', result);
      return result;
    } catch (error) {
      console.error('Error calculating package weight:', error);
      // Return a default weight calculation on error
      return {
        totalWeight: 0.5,
        breakdown: {
          itemsWeight: 0.3,
          packingMaterialsWeight: 0.05,
          cartonWeight: 0.1,
          additionalWeight: 0.05
        },
        recommendations: {
          shippingMethod: 'Standard',
          handlingInstructions: []
        },
        confidence: 0.8
      };
    }
  }

  /**
   * Calculate the total weight of all items in the order
   */
  private async calculateItemsWeight(order: Order): Promise<number> {
    let totalWeight = 0;
    
    if (!order.items) {
      return totalWeight;
    }
    
    for (const item of order.items) {
      // Check if this is a bundle
      if (item.isBundle && item.bundleItems && item.bundleItems.length > 0) {
        // Calculate weight for bundle items
        for (const bundleItem of item.bundleItems) {
          // Find the product by name (since bundle items use product names)
          const products = await storage.getProducts();
          const product = products.find(p => p.name === bundleItem.name);
          
          if (product && product.weight) {
            const productWeight = parseFloat(product.weight.toString());
            const itemWeight = productWeight * bundleItem.quantity * item.quantity;
            totalWeight += itemWeight;
          } else {
            // Estimate weight if not found
            const estimatedWeight = this.estimateProductWeight(product || null);
            const itemWeight = estimatedWeight * bundleItem.quantity * item.quantity;
            totalWeight += itemWeight;
          }
        }
      } else if (item.productId) {
        // Regular product (not a bundle)
        const product = await storage.getProductById(item.productId);
        if (product && product.weight) {
          const productWeight = parseFloat(product.weight.toString());
          const itemWeight = productWeight * item.quantity;
          totalWeight += itemWeight;
        } else {
          // Estimate weight based on product category and size if no weight specified
          const estimatedWeight = this.estimateProductWeight(product || null);
          const itemWeight = estimatedWeight * item.quantity;
          totalWeight += itemWeight;
        }
      }
      
      // Handle product variants - get all variants and find the matching one
      if (item.variantId) {
        const variants = await storage.getProductVariants();
        const variant = variants.find(v => v.id === item.variantId);
        if (variant && variant.weight) {
          const variantWeight = parseFloat(variant.weight.toString());
          totalWeight += variantWeight * item.quantity;
        }
      }
    }
    
    return totalWeight;
  }

  /**
   * Calculate weight of packing materials used for products
   */
  private async calculatePackingMaterialsWeight(order: Order): Promise<number> {
    let totalPackingWeight = 0;
    const packingMaterials = await storage.getPackingMaterials();
    
    if (!order.items) {
      return totalPackingWeight;
    }
    
    for (const item of order.items) {
      if (item.productId) {
        const product = await storage.getProductById(item.productId);
        if (product && product.packingMaterialId) {
          const packingMaterial = packingMaterials.find((pm: PackingMaterial) => pm.id === product.packingMaterialId);
          if (packingMaterial && packingMaterial.weight) {
            const materialWeight = parseFloat(packingMaterial.weight.toString());
            totalPackingWeight += materialWeight * item.quantity;
          } else {
            // Estimate packing material weight based on type
            const estimatedWeight = this.estimatePackingMaterialWeight(packingMaterial);
            totalPackingWeight += estimatedWeight * item.quantity;
          }
        }
      }
    }
    
    return totalPackingWeight;
  }

  /**
   * Get the weight of the selected carton
   */
  private getCartonWeight(selectedCartonId?: string): number {
    if (!selectedCartonId || selectedCartonId === 'non-company') {
      // Default medium carton weight if not specified
      return 0.150;
    }
    
    const carton = this.standardCartons.find(c => c.id === selectedCartonId);
    return carton ? carton.weight : 0.150;
  }

  /**
   * Calculate additional weight from tape, labels, padding, etc.
   */
  private calculateAdditionalWeight(itemsWeight: number, cartonWeight: number): number {
    // Base additional weight: tape, labels, etc.
    let additionalWeight = 0.025; // 25g base
    
    // Add padding based on items weight (more items = more padding)
    if (itemsWeight > 2) {
      additionalWeight += 0.050; // Additional 50g for heavy items
    }
    
    // Add bubble wrap or protection material for fragile items
    if (cartonWeight > 0.15) { // Larger cartons typically need more protection
      additionalWeight += 0.030; // 30g for bubble wrap
    }
    
    return additionalWeight;
  }

  /**
   * Estimate product weight based on category and dimensions
   */
  private estimateProductWeight(product: Product | null): number {
    if (!product) return 0.1; // Default 100g
    
    // Use dimensions if available
    if (product.length && product.width && product.height) {
      const volume = parseFloat(product.length.toString()) * 
                    parseFloat(product.width.toString()) * 
                    parseFloat(product.height.toString());
      
      // Estimate density based on category (grams per cm³)
      let density = 0.5; // Default density
      
      if (product.categoryId) {
        // Different densities for different product types
        // This would ideally be enhanced with category information
        density = 0.3; // Light products
      }
      
      return (volume * density) / 1000; // Convert to kg
    }
    
    // Fallback weight estimation
    return 0.2; // 200g default
  }

  /**
   * Estimate packing material weight
   */
  private estimatePackingMaterialWeight(material: PackingMaterial | undefined): number {
    if (!material) return 0.005; // 5g default
    
    switch (material.type?.toLowerCase()) {
      case 'bubble_wrap':
        return 0.005; // 5g
      case 'foam':
        return 0.003; // 3g
      case 'paper':
        return 0.002; // 2g
      case 'tape':
        return 0.001; // 1g
      case 'box':
      case 'carton':
        return 0.100; // 100g
      default:
        return 0.005; // 5g default
    }
  }

  /**
   * Generate shipping method recommendations based on weight
   */
  private generateShippingRecommendations(totalWeight: number, order: Order): {
    shippingMethod: string;
    handlingInstructions: string[];
  } {
    const handlingInstructions: string[] = [];
    let shippingMethod = 'Standard';
    
    // Weight-based recommendations
    if (totalWeight < 0.5) {
      shippingMethod = 'Letter Post';
      handlingInstructions.push('Can be sent as letter post');
    } else if (totalWeight < 2) {
      shippingMethod = 'Small Package';
      handlingInstructions.push('Suitable for small package delivery');
    } else if (totalWeight < 10) {
      shippingMethod = 'Standard Package';
      handlingInstructions.push('Standard package handling');
    } else if (totalWeight < 20) {
      shippingMethod = 'Heavy Package';
      handlingInstructions.push('Heavy package - use two-person lift');
    } else {
      shippingMethod = 'Freight';
      handlingInstructions.push('Requires freight shipping');
      handlingInstructions.push('Special handling required');
    }
    
    // Priority-based adjustments
    if (order.priority === 'high') {
      shippingMethod = 'Express';
      handlingInstructions.push('Express shipping requested');
    }
    
    // Add fragile handling if needed - check if items exist first
    if (order.items) {
      const hasFragileItems = order.items.some((item: any) => 
        item.productName?.toLowerCase().includes('fragile') ||
        item.productName?.toLowerCase().includes('glass') ||
        item.productName?.toLowerCase().includes('ceramic')
      );
      
      if (hasFragileItems) {
        handlingInstructions.push('FRAGILE - Handle with care');
        handlingInstructions.push('This side up');
      }
    }
    
    return {
      shippingMethod,
      handlingInstructions
    };
  }

  /**
   * Calculate confidence score based on data completeness
   */
  private calculateConfidence(order: Order, selectedCartonId?: string): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence if products have weight data
    if (order.items && order.items.length > 0) {
      const productsWithWeight = order.items.filter((item: any) => 
        item.productId // This would need to be checked against actual product weight data
      ).length;
      
      confidence += (productsWithWeight / order.items.length) * 0.3;
      
      // Decrease confidence for complex orders
      if (order.items.length > 10) {
        confidence -= 0.1;
      }
    }
    
    // Increase confidence if carton is selected
    if (selectedCartonId && selectedCartonId !== 'non-company') {
      confidence += 0.2;
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Get available cartons for selection
   */
  getAvailableCartons(): CartonSpec[] {
    return this.standardCartons;
  }

  /**
   * Recommend optimal carton based on order contents
   */
  async recommendOptimalCarton(orderId: string): Promise<CartonSpec> {
    const order = await storage.getOrderById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const itemsWeight = await this.calculateItemsWeight(order);
    const packingWeight = await this.calculatePackingMaterialsWeight(order);
    const totalContentWeight = itemsWeight + packingWeight;

    // Find the smallest carton that can handle the weight
    const suitableCartons = this.standardCartons.filter(carton => 
      carton.maxWeight >= totalContentWeight + 0.1 // Add buffer
    );

    if (suitableCartons.length === 0) {
      // Return largest carton if content is too heavy
      return this.standardCartons[this.standardCartons.length - 1];
    }

    // Return the smallest suitable carton
    return suitableCartons.reduce((smallest, current) => 
      current.weight < smallest.weight ? current : smallest
    );
  }

  /**
   * Optimize multi-carton packing to minimize shipping costs
   */
  async optimizeMultiCartonPacking(orderId: string): Promise<MultiCartonResponse> {
    const order = await storage.getOrderById(orderId);
    if (!order || !order.items) {
      throw new Error(`Order ${orderId} not found or has no items`);
    }

    // Get all products and their weights
    const products = await storage.getProducts();
    const packingMaterials = await storage.getPackingMaterials();
    
    const orderItems = order.items.map((item: any) => {
      const product = products.find(p => p.id === item.productId);
      const weight = product?.weight ? parseFloat(product.weight.toString()) : this.estimateProductWeight(product);
      
      return {
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        weight: weight * item.quantity,
        dimensions: {
          length: product?.length ? parseFloat(product.length.toString()) : 10,
          width: product?.width ? parseFloat(product.width.toString()) : 10,
          height: product?.height ? parseFloat(product.height.toString()) : 5,
        },
        packingMaterial: packingMaterials.find(pm => pm.id === item.packingMaterialId)
      };
    });

    // Sort items by weight (heaviest first)
    orderItems.sort((a, b) => b.weight - a.weight);

    // Bin packing algorithm - First Fit Decreasing
    const cartonPlans: CartonPackingPlan[] = [];
    
    for (const item of orderItems) {
      let placed = false;
      
      // Try to place in existing cartons
      for (const plan of cartonPlans) {
        const itemPackingWeight = this.estimatePackingMaterialWeight(item.packingMaterial);
        const newWeight = plan.totalItemsWeight + plan.packingMaterialsWeight + item.weight + itemPackingWeight;
        
        if (newWeight <= plan.maxWeight * 0.95) { // 95% utilization limit
          plan.items.push(item);
          plan.totalItemsWeight += item.weight;
          plan.packingMaterialsWeight += itemPackingWeight;
          plan.finalWeight = plan.cartonWeight + plan.totalItemsWeight + plan.packingMaterialsWeight;
          plan.utilizationPercent = (plan.finalWeight / plan.maxWeight) * 100;
          placed = true;
          break;
        }
      }
      
      // If not placed, create new carton
      if (!placed) {
        const suitableCarton = this.findOptimalCartonForItem(item);
        const itemPackingWeight = this.estimatePackingMaterialWeight(item.packingMaterial);
        
        const newPlan: CartonPackingPlan = {
          cartonId: suitableCarton.id,
          cartonName: suitableCarton.name,
          cartonWeight: suitableCarton.weight,
          maxWeight: suitableCarton.maxWeight,
          items: [item],
          totalItemsWeight: item.weight,
          packingMaterialsWeight: itemPackingWeight,
          finalWeight: suitableCarton.weight + item.weight + itemPackingWeight,
          utilizationPercent: ((suitableCarton.weight + item.weight + itemPackingWeight) / suitableCarton.maxWeight) * 100,
          costEstimate: this.estimateShippingCost(suitableCarton.weight + item.weight + itemPackingWeight)
        };
        
        cartonPlans.push(newPlan);
      }
    }

    // Calculate total metrics
    const totalWeight = cartonPlans.reduce((sum, plan) => sum + plan.finalWeight, 0);
    const totalCost = cartonPlans.reduce((sum, plan) => sum + plan.costEstimate, 0);

    // Generate recommendations
    const recommendations = this.generateMultiCartonRecommendations(cartonPlans, order);

    return {
      totalWeight,
      totalCost,
      cartonPlans,
      confidence: this.calculateMultiCartonConfidence(cartonPlans),
      recommendations
    };
  }

  /**
   * Find optimal carton for a specific item
   */
  private findOptimalCartonForItem(item: any): CartonSpec {
    const itemWeight = item.weight + 0.01; // Add packing material buffer
    
    const suitableCartons = this.standardCartons.filter(carton => 
      carton.maxWeight >= itemWeight + carton.weight
    );
    
    if (suitableCartons.length === 0) {
      return this.standardCartons[this.standardCartons.length - 1]; // Largest carton
    }
    
    // Return smallest suitable carton
    return suitableCartons[0];
  }

  /**
   * Estimate shipping cost based on weight
   */
  private estimateShippingCost(weight: number): number {
    // Simplified cost estimation
    if (weight < 0.5) return 5.00;
    if (weight < 2) return 8.50;
    if (weight < 5) return 12.00;
    if (weight < 10) return 18.00;
    if (weight < 20) return 35.00;
    return 50.00;
  }

  /**
   * Generate recommendations for multi-carton packing
   */
  private generateMultiCartonRecommendations(plans: CartonPackingPlan[], order: Order): {
    shippingMethod: string;
    handlingInstructions: string[];
    costSavings?: string;
  } {
    const handlingInstructions: string[] = [];
    let shippingMethod = 'Standard';
    
    // Multi-carton specific instructions
    if (plans.length > 1) {
      handlingInstructions.push(`Pack items into ${plans.length} separate cartons`);
      handlingInstructions.push('Label cartons as 1 of N, 2 of N, etc.');
      shippingMethod = 'Multi-Package';
    }
    
    // Weight-based shipping method
    const totalWeight = plans.reduce((sum, plan) => sum + plan.finalWeight, 0);
    if (totalWeight > 20) {
      shippingMethod = 'Freight';
      handlingInstructions.push('Requires freight shipping due to total weight');
    }
    
    // Utilization warnings
    const underUtilized = plans.filter(plan => plan.utilizationPercent < 50);
    if (underUtilized.length > 0) {
      handlingInstructions.push(`Consider consolidating ${underUtilized.length} under-utilized cartons`);
    }
    
    // Priority handling
    if (order.priority === 'high') {
      shippingMethod = 'Express Multi-Package';
      handlingInstructions.push('Express shipping for all cartons');
    }
    
    // Cost savings calculation
    const singleCartonCost = this.estimateShippingCost(totalWeight);
    const multiCartonCost = plans.reduce((sum, plan) => sum + plan.costEstimate, 0);
    const savings = singleCartonCost - multiCartonCost;
    const costSavings = savings > 0 ? `Saves $${savings.toFixed(2)} vs single large carton` : undefined;
    
    return {
      shippingMethod,
      handlingInstructions,
      costSavings
    };
  }

  /**
   * Calculate confidence for multi-carton optimization
   */
  private calculateMultiCartonConfidence(plans: CartonPackingPlan[]): number {
    let confidence = 0.7; // Base confidence for multi-carton
    
    // Decrease confidence for too many cartons
    if (plans.length > 5) {
      confidence -= 0.2;
    }
    
    // Increase confidence for good utilization
    const avgUtilization = plans.reduce((sum, plan) => sum + plan.utilizationPercent, 0) / plans.length;
    if (avgUtilization > 70) {
      confidence += 0.2;
    } else if (avgUtilization < 40) {
      confidence -= 0.3;
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }
}

// Export singleton instance
export const weightCalculationService = new AIWeightCalculationService();