import { eq, and, sql, inArray } from 'drizzle-orm';
import { db } from '../db';
import {
  shipments,
  shipmentCosts,
  shipmentCartons,
  customItems,
  consolidationItems,
  costAllocations,
  productCostHistory,
  products,
  receipts,
  receiptItems,
  type Shipment,
  type ShipmentCost,
  type ShipmentCarton,
  type CustomItem,
  type InsertCostAllocation,
  type InsertProductCostHistory
} from '@shared/schema';
import { Decimal } from 'decimal.js';

// Configure Decimal for precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// Base currency for all calculations
const BASE_CURRENCY = 'EUR';

// Standard volumetric divisors by mode
const VOLUMETRIC_DIVISORS = {
  AIR: 6000,
  SEA: 1000000, // 1 CBM = 1000 kg
  COURIER: 5000,
  DEFAULT: 6000
};

// Types for internal use
interface ItemWithCarton extends CustomItem {
  carton?: ShipmentCarton;
}

interface ItemAllocation {
  customItemId: number;
  chargeableWeight: number;
  actualWeight: number;
  volumetricWeight: number;
  unitPrice: number;
  quantity: number;
  totalValue: number;
}

interface AllocationResult {
  customItemId: number;
  amount: Decimal;
}

interface LandingCostBreakdown {
  shipmentId: number;
  totalCosts: {
    freight: Decimal;
    insurance: Decimal;
    brokerage: Decimal;
    packaging: Decimal;
    duty: Decimal;
    other: Decimal;
    total: Decimal;
  };
  itemBreakdowns: Array<{
    customItemId: number;
    sku: string | null;
    name: string;
    quantity: number;
    unitCosts: {
      productCost: Decimal;
      freight: Decimal;
      insurance: Decimal;
      brokerage: Decimal;
      packaging: Decimal;
      duty: Decimal;
      other: Decimal;
      total: Decimal;
    };
    totalCost: Decimal;
    chargeableWeight: number;
    actualWeight: number;
    volumetricWeight: number;
  }>;
  warnings: string[];
  metadata: {
    calculatedAt: Date;
    baseCurrency: string;
    exchangeRates: Record<string, number>;
  };
}

export class LandingCostService {
  /**
   * Core calculation function: Calculate volumetric weight
   */
  calculateVolumetricWeight(
    lengthCm: number,
    widthCm: number,
    heightCm: number,
    divisor: number = VOLUMETRIC_DIVISORS.DEFAULT
  ): number {
    if (lengthCm <= 0 || widthCm <= 0 || heightCm <= 0 || divisor <= 0) {
      console.warn('Invalid dimensions or divisor for volumetric weight calculation', {
        lengthCm,
        widthCm,
        heightCm,
        divisor
      });
      return 0;
    }

    const volumeCm3 = lengthCm * widthCm * heightCm;
    const volumetricWeight = volumeCm3 / divisor;
    
    return Math.round(volumetricWeight * 1000) / 1000; // Round to 3 decimal places
  }

  /**
   * Core calculation function: Calculate chargeable weight (max of actual vs volumetric)
   */
  calculateChargeableWeight(actualKg: number, volumetricKg: number): number {
    const actual = Math.max(0, actualKg);
    const volumetric = Math.max(0, volumetricKg);
    return Math.max(actual, volumetric);
  }

  /**
   * Core calculation function: Convert any amount to base currency
   */
  convertToBaseCurrency(
    amount: number,
    currency: string,
    fxRate?: number
  ): Decimal {
    if (currency === BASE_CURRENCY) {
      return new Decimal(amount);
    }

    if (!fxRate || fxRate <= 0) {
      console.warn(`Invalid or missing FX rate for ${currency} to ${BASE_CURRENCY}`, { amount, currency, fxRate });
      // In production, you might want to fetch current rates from an API
      // For now, we'll use a default rate or throw an error
      throw new Error(`Cannot convert ${currency} to ${BASE_CURRENCY}: Invalid FX rate`);
    }

    return new Decimal(amount).mul(fxRate);
  }

  /**
   * Allocation algorithm: Allocate costs by chargeable weight
   */
  allocateByChargeableWeight(
    items: ItemAllocation[],
    totalCost: Decimal
  ): AllocationResult[] {
    const totalChargeableWeight = items.reduce(
      (sum, item) => sum + item.chargeableWeight * item.quantity,
      0
    );

    if (totalChargeableWeight === 0) {
      console.warn('Total chargeable weight is zero, falling back to equal allocation');
      return this.allocateByUnits(items, totalCost);
    }

    const allocations: AllocationResult[] = items.map(item => ({
      customItemId: item.customItemId,
      amount: totalCost
        .mul(item.chargeableWeight * item.quantity)
        .div(totalChargeableWeight)
    }));

    return this.reconcileRounding(allocations, totalCost);
  }

  /**
   * Allocation algorithm: Allocate costs by item value
   */
  allocateByValue(
    items: ItemAllocation[],
    totalCost: Decimal
  ): AllocationResult[] {
    const totalValue = items.reduce(
      (sum, item) => sum.add(new Decimal(item.totalValue)),
      new Decimal(0)
    );

    if (totalValue.eq(0)) {
      console.warn('Total value is zero, falling back to unit allocation');
      return this.allocateByUnits(items, totalCost);
    }

    const allocations: AllocationResult[] = items.map(item => ({
      customItemId: item.customItemId,
      amount: totalCost
        .mul(item.totalValue)
        .div(totalValue)
    }));

    return this.reconcileRounding(allocations, totalCost);
  }

  /**
   * Allocation algorithm: Allocate costs by unit count
   */
  allocateByUnits(
    items: ItemAllocation[],
    totalCost: Decimal
  ): AllocationResult[] {
    const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

    if (totalUnits === 0) {
      console.warn('No units to allocate to');
      return [];
    }

    const allocations: AllocationResult[] = items.map(item => ({
      customItemId: item.customItemId,
      amount: totalCost.mul(item.quantity).div(totalUnits)
    }));

    return this.reconcileRounding(allocations, totalCost);
  }

  /**
   * Allocation algorithm: Per-unit allocation (equal distribution per item)
   * This differs from allocateByUnits as it distributes equally per item regardless of quantity
   */
  allocatePerUnit(
    items: ItemAllocation[],
    totalCost: Decimal
  ): AllocationResult[] {
    const totalItems = items.length;

    if (totalItems === 0) {
      console.warn('No items to allocate to');
      return [];
    }

    const costPerItem = totalCost.div(totalItems);
    const allocations: AllocationResult[] = items.map(item => ({
      customItemId: item.customItemId,
      amount: costPerItem
    }));

    return this.reconcileRounding(allocations, totalCost);
  }

  /**
   * Allocation algorithm: Hybrid allocation (combination of weight + value)
   * @param items - Items to allocate to
   * @param totalCost - Total cost to allocate
   * @param weightRatio - Weight component ratio (0-1), remainder is value ratio
   */
  allocateByHybrid(
    items: ItemAllocation[],
    totalCost: Decimal,
    weightRatio: number = 0.6
  ): AllocationResult[] {
    if (weightRatio < 0 || weightRatio > 1) {
      console.warn('Invalid weight ratio, using default 0.6');
      weightRatio = 0.6;
    }

    const valueRatio = 1 - weightRatio;

    // Calculate total metrics
    const totalChargeableWeight = items.reduce(
      (sum, item) => sum + item.chargeableWeight * item.quantity,
      0
    );
    const totalValue = items.reduce(
      (sum, item) => sum.add(new Decimal(item.totalValue)),
      new Decimal(0)
    );

    // Handle edge cases
    if (totalChargeableWeight === 0 && totalValue.eq(0)) {
      console.warn('Both weight and value are zero, falling back to unit allocation');
      return this.allocateByUnits(items, totalCost);
    }

    if (totalChargeableWeight === 0) {
      console.warn('Weight is zero, using value-only allocation');
      return this.allocateByValue(items, totalCost);
    }

    if (totalValue.eq(0)) {
      console.warn('Value is zero, using weight-only allocation');
      return this.allocateByChargeableWeight(items, totalCost);
    }

    // Calculate hybrid allocations
    const allocations: AllocationResult[] = items.map(item => {
      // Weight component
      const weightComponent = totalCost
        .mul(weightRatio)
        .mul(item.chargeableWeight * item.quantity)
        .div(totalChargeableWeight);

      // Value component
      const valueComponent = totalCost
        .mul(valueRatio)
        .mul(item.totalValue)
        .div(totalValue);

      return {
        customItemId: item.customItemId,
        amount: weightComponent.add(valueComponent)
      };
    });

    return this.reconcileRounding(allocations, totalCost);
  }

  /**
   * Allocation algorithm: Volume-based allocation (for containers)
   */
  allocateByVolume(
    items: ItemAllocation[],
    totalCost: Decimal
  ): AllocationResult[] {
    // Calculate volume for each item
    const itemsWithVolume = items.map(item => {
      // We need to get volume from dimensions
      // For now, we'll use a volume estimation based on volumetric weight
      // In a full implementation, we'd need actual dimensions
      const estimatedVolume = item.volumetricWeight / 166.67; // Reverse of 6000 divisor
      return {
        ...item,
        volume: estimatedVolume * item.quantity
      };
    });

    const totalVolume = itemsWithVolume.reduce((sum, item) => sum + item.volume, 0);

    if (totalVolume === 0) {
      console.warn('Total volume is zero, falling back to unit allocation');
      return this.allocateByUnits(items, totalCost);
    }

    const allocations: AllocationResult[] = itemsWithVolume.map(item => ({
      customItemId: item.customItemId,
      amount: totalCost.mul(item.volume).div(totalVolume)
    }));

    return this.reconcileRounding(allocations, totalCost);
  }

  /**
   * Allocation algorithm: Mixed allocation strategies
   * Applies different allocation methods based on cost type
   */
  allocateByMixed(
    items: ItemAllocation[],
    totalCost: Decimal,
    costType: string,
    shipmentCharacteristics: {
      unitType?: string;
      totalWeight?: number;
      totalValue?: Decimal;
      itemCount?: number;
    }
  ): AllocationResult[] {
    // Apply different strategies based on cost type and shipment characteristics
    switch (costType) {
      case 'FREIGHT':
        // For freight, consider unit type and weight distribution
        if (shipmentCharacteristics.unitType === 'containers') {
          return this.allocateByVolume(items, totalCost);
        } else if (shipmentCharacteristics.unitType === 'pallets') {
          return this.allocateByUnits(items, totalCost);
        } else {
          // Default to hybrid for mixed shipments
          return this.allocateByHybrid(items, totalCost, 0.7); // Higher weight ratio for freight
        }

      case 'INSURANCE':
        // Insurance should always be value-based
        return this.allocateByValue(items, totalCost);

      case 'DUTY':
        // Duty typically based on value
        return this.allocateByValue(items, totalCost);

      case 'BROKERAGE':
      case 'PACKAGING':
        // Administrative costs - equal per item
        return this.allocatePerUnit(items, totalCost);

      default:
        // For unknown cost types, use hybrid allocation
        return this.allocateByHybrid(items, totalCost);
    }
  }

  /**
   * Reconcile rounding differences to ensure allocations sum to total
   */
  reconcileRounding(
    allocations: AllocationResult[],
    totalCost: Decimal
  ): AllocationResult[] {
    if (allocations.length === 0) return [];

    // Round all allocations to 4 decimal places
    const roundedAllocations = allocations.map(a => ({
      ...a,
      amount: a.amount.toDecimalPlaces(4)
    }));

    // Calculate the difference
    const allocatedSum = roundedAllocations.reduce(
      (sum, a) => sum.add(a.amount),
      new Decimal(0)
    );
    const difference = totalCost.sub(allocatedSum);

    // Apply the difference to the largest allocation
    if (!difference.eq(0) && roundedAllocations.length > 0) {
      const largestAllocation = roundedAllocations.reduce((max, curr) =>
        curr.amount.gt(max.amount) ? curr : max
      );
      largestAllocation.amount = largestAllocation.amount.add(difference);
    }

    return roundedAllocations;
  }

  /**
   * Auto-select allocation method based on shipment characteristics
   * - Boxes/parcels: Weight-based allocation
   * - Pallets: Unit-based allocation  
   * - Containers: Value-based allocation
   * - Mixed shipments: Hybrid allocation
   */
  getAllocationMethod(
    shipment: {
      unitType?: string;
      totalWeight?: number;
      totalValue?: Decimal;
      itemCount?: number;
    },
    costType: string,
    items: ItemAllocation[]
  ): {
    method: string;
    allocate: (items: ItemAllocation[], totalCost: Decimal) => AllocationResult[];
  } {
    const unitType = shipment.unitType?.toLowerCase() || 'items';
    
    // For specific cost types, apply cost-specific logic first
    switch (costType) {
      case 'INSURANCE':
        return {
          method: 'VALUE',
          allocate: (items, totalCost) => this.allocateByValue(items, totalCost)
        };
      
      case 'DUTY':
        return {
          method: 'VALUE',
          allocate: (items, totalCost) => this.allocateByValue(items, totalCost)
        };
        
      case 'BROKERAGE':
      case 'PACKAGING':
        return {
          method: 'PER_UNIT',
          allocate: (items, totalCost) => this.allocatePerUnit(items, totalCost)
        };
    }

    // For other cost types, use shipment-based logic
    switch (unitType) {
      case 'containers':
      case 'container':
        return {
          method: 'VALUE',
          allocate: (items, totalCost) => this.allocateByValue(items, totalCost)
        };
        
      case 'pallets':
      case 'pallet':
        return {
          method: 'UNITS',
          allocate: (items, totalCost) => this.allocateByUnits(items, totalCost)
        };
        
      case 'boxes':
      case 'box':
      case 'parcels':
      case 'parcel':
      case 'packages':
      case 'package':
        return {
          method: 'CHARGEABLE_WEIGHT',
          allocate: (items, totalCost) => this.allocateByChargeableWeight(items, totalCost)
        };
        
      case 'mixed':
      default:
        // For mixed shipments or unknown types, use hybrid allocation
        return {
          method: 'HYBRID',
          allocate: (items, totalCost) => this.allocateByHybrid(items, totalCost)
        };
    }
  }

  /**
   * Enhanced allocation with automatic method selection
   * Uses getAllocationMethod to determine the best allocation strategy
   */
  allocateWithAutoSelection(
    items: ItemAllocation[],
    totalCost: Decimal,
    costType: string,
    shipmentCharacteristics: {
      unitType?: string;
      totalWeight?: number;
      totalValue?: Decimal;
      itemCount?: number;
    }
  ): {
    allocations: AllocationResult[];
    method: string;
    reasoning: string;
  } {
    const { method, allocate } = this.getAllocationMethod(
      shipmentCharacteristics,
      costType,
      items
    );

    const allocations = allocate(items, totalCost);
    
    // Generate reasoning for the allocation choice
    let reasoning = `Selected ${method} allocation for ${costType} cost`;
    
    if (costType === 'INSURANCE' || costType === 'DUTY') {
      reasoning += ` (${costType.toLowerCase()} is always value-based)`;
    } else if (costType === 'BROKERAGE' || costType === 'PACKAGING') {
      reasoning += ` (administrative costs distributed equally per item)`;
    } else {
      const unitType = shipmentCharacteristics.unitType?.toLowerCase() || 'items';
      switch (unitType) {
        case 'containers':
        case 'container':
          reasoning += ` (containers typically use value-based allocation)`;
          break;
        case 'pallets':
        case 'pallet':
          reasoning += ` (pallets typically use unit-based allocation)`;
          break;
        case 'boxes':
        case 'box':
        case 'parcels':
        case 'parcel':
          reasoning += ` (boxes/parcels typically use weight-based allocation)`;
          break;
        default:
          reasoning += ` (mixed/unknown shipment type uses hybrid allocation)`;
      }
    }

    return {
      allocations,
      method,
      reasoning
    };
  }

  /**
   * Helper function: Get shipment metrics
   */
  async getShipmentMetrics(shipmentId: number): Promise<{
    totalWeight: number;
    totalVolumetricWeight: number;
    totalChargeableWeight: number;
    totalValue: Decimal;
    totalUnits: number;
    itemCount: number;
  }> {
    // Get shipment to find consolidationId
    const shipment = await db
      .select({ consolidationId: shipments.consolidationId })
      .from(shipments)
      .where(eq(shipments.id, shipmentId))
      .limit(1);

    if (!shipment.length) {
      throw new Error(`Shipment ${shipmentId} not found`);
    }

    const consolidationId = shipment[0].consolidationId;
    
    if (!consolidationId) {
      return {
        totalWeight: 0,
        totalVolumetricWeight: 0,
        totalChargeableWeight: 0,
        totalValue: new Decimal(0),
        totalUnits: 0,
        itemCount: 0
      };
    }

    // Get all items for this consolidation through consolidationItems (correct relationship)
    const itemsWithCartons = await db
      .select({
        // Custom item fields
        id: customItems.id,
        quantity: customItems.quantity,
        unitPrice: customItems.unitPrice,
        totalPrice: sql<string>`CAST(${customItems.unitPrice} * ${customItems.quantity} AS text)`,
        weight: customItems.weight,
        dimensions: customItems.dimensions,
        // Carton fields (optional)
        cartonGrossWeightKg: shipmentCartons.grossWeightKg,
        cartonLengthCm: shipmentCartons.lengthCm,
        cartonWidthCm: shipmentCartons.widthCm,
        cartonHeightCm: shipmentCartons.heightCm
      })
      .from(consolidationItems)
      .innerJoin(customItems, eq(consolidationItems.itemId, customItems.id))
      .leftJoin(shipmentCartons, and(
        eq(shipmentCartons.customItemId, customItems.id),
        eq(shipmentCartons.shipmentId, shipmentId)
      ))
      .where(eq(consolidationItems.consolidationId, consolidationId));

    let totalWeight = 0;
    let totalVolumetricWeight = 0;
    let totalChargeableWeight = 0;
    let totalValue = new Decimal(0);
    let totalUnits = 0;

    for (const item of itemsWithCartons) {
      const quantity = item.quantity;

      // Calculate weights using carton data if available, otherwise use item data
      let actualWeight = 0;
      let volumetricWeight = 0;

      if (item.cartonGrossWeightKg) {
        actualWeight = Number(item.cartonGrossWeightKg);
      } else if (item.weight) {
        actualWeight = Number(item.weight) * quantity;
      }

      if (item.cartonLengthCm && item.cartonWidthCm && item.cartonHeightCm) {
        volumetricWeight = this.calculateVolumetricWeight(
          Number(item.cartonLengthCm),
          Number(item.cartonWidthCm),
          Number(item.cartonHeightCm)
        );
      } else {
        // Estimate volumetric weight for custom items without dimensions
        volumetricWeight = actualWeight * 0.8; // Conservative estimate
      }

      const chargeableWeight = this.calculateChargeableWeight(actualWeight, volumetricWeight);

      totalWeight += actualWeight;
      totalVolumetricWeight += volumetricWeight;
      totalChargeableWeight += chargeableWeight;
      totalUnits += quantity;

      // Calculate value - use fallback values if prices are missing
      if (item.totalPrice) {
        totalValue = totalValue.add(new Decimal(item.totalPrice.toString()));
      } else if (item.unitPrice) {
        totalValue = totalValue.add(
          new Decimal(item.unitPrice.toString()).mul(quantity)
        );
      } else {
        // Use a small fallback value so allocation still works
        totalValue = totalValue.add(new Decimal(1).mul(quantity));
      }
    }

    return {
      totalWeight,
      totalVolumetricWeight,
      totalChargeableWeight,
      totalValue,
      totalUnits,
      itemCount: itemsWithCartons.length
    };
  }

  /**
   * Helper function: Get fallback dimensions for items with missing data
   */
  getFallbackDimensions(item: CustomItem): {
    length: number;
    width: number;
    height: number;
    weight: number;
  } {
    // Parse dimensions from the dimensions string field
    let length = 0;
    let width = 0;
    let height = 0;
    let weight = item.weight ? Number(item.weight) : 0;

    // Try to parse dimensions if available
    if (item.dimensions) {
      try {
        const dimMatch = item.dimensions.match(/(\d+(\.\d+)?)\s*[x×]\s*(\d+(\.\d+)?)\s*[x×]\s*(\d+(\.\d+)?)/i);
        if (dimMatch) {
          length = parseFloat(dimMatch[1]);
          width = parseFloat(dimMatch[3]);
          height = parseFloat(dimMatch[5]);
        }
      } catch (e) {
        console.warn('Failed to parse dimensions', { dimensions: item.dimensions });
      }
    }

    // Apply fallback defaults if any dimension is missing
    if (length <= 0 || width <= 0 || height <= 0) {
      // Default small package dimensions (20x15x10 cm)
      length = length > 0 ? length : 20;
      width = width > 0 ? width : 15;
      height = height > 0 ? height : 10;
      
      console.warn(`Using fallback dimensions for item ${item.id}`, {
        itemId: item.id,
        fallbackDimensions: { length, width, height }
      });
    }

    if (weight <= 0) {
      // Estimate weight based on volume (assuming 200 kg/m³ density)
      const volumeM3 = (length * width * height) / 1000000;
      weight = volumeM3 * 200;
      
      console.warn(`Using estimated weight for item ${item.id}`, {
        itemId: item.id,
        estimatedWeight: weight
      });
    }

    return { length, width, height, weight };
  }

  /**
   * Helper function: Validate cost inputs
   */
  validateCostInputs(costs: ShipmentCost[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const cost of costs) {
      // Check for negative amounts
      if (Number(cost.amountOriginal) < 0) {
        errors.push(`Negative amount for cost type ${cost.type}: ${cost.amountOriginal}`);
      }

      // Check for valid currency
      if (!cost.currency) {
        errors.push(`Missing currency for cost type ${cost.type}`);
      }

      // Check volumetric divisor for freight costs
      if (cost.type === 'FREIGHT' && cost.volumetricDivisor) {
        const divisor = Number(cost.volumetricDivisor);
        if (divisor <= 0) {
          errors.push(`Invalid volumetric divisor for freight: ${divisor}`);
        }
      }

      // Check FX rate if currency is not base currency
      if (cost.currency !== BASE_CURRENCY) {
        const fxRate = cost.fxRateUsed ? Number(cost.fxRateUsed) : 0;
        if (fxRate <= 0) {
          errors.push(`Invalid or missing FX rate for ${cost.currency} to ${BASE_CURRENCY}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Helper function: Format allocation details for audit trail
   */
  formatAllocationDetails(data: any): any {
    return {
      timestamp: new Date().toISOString(),
      calculation: {
        method: data.method,
        basis: data.basis,
        inputs: data.inputs,
        outputs: data.outputs
      },
      metadata: {
        shipmentId: data.shipmentId,
        costType: data.costType,
        totalAllocated: data.totalAllocated?.toString(),
        itemCount: data.itemCount
      }
    };
  }

  /**
   * Main calculation engine: Calculate landing costs for a shipment
   */
  async calculateLandingCosts(shipmentId: number): Promise<LandingCostBreakdown> {
    const warnings: string[] = [];
    const exchangeRates: Record<string, number> = {};

    try {
      // Begin transaction
      return await db.transaction(async (tx) => {
        // 1. Fetch shipment
        const [shipment] = await tx
          .select()
          .from(shipments)
          .where(eq(shipments.id, shipmentId));

        if (!shipment) {
          throw new Error(`Shipment ${shipmentId} not found`);
        }

        // 2. Fetch costs
        const costs = await tx
          .select()
          .from(shipmentCosts)
          .where(eq(shipmentCosts.shipmentId, shipmentId));

        // Validate costs
        const validation = this.validateCostInputs(costs);
        if (!validation.valid) {
          warnings.push(...validation.errors);
        }

        // 3. Fetch items and cartons
        const cartons = await tx
          .select()
          .from(shipmentCartons)
          .where(eq(shipmentCartons.shipmentId, shipmentId));

        // Always get items from consolidation using the correct relationship
        if (!shipment.consolidationId) {
          throw new Error(`No consolidation found for shipment ${shipmentId}`);
        }
        
        // Use consolidationItems to get custom items (correct relationship)
        const consolidationItemsList = await tx
          .select({
            item: customItems
          })
          .from(consolidationItems)
          .innerJoin(customItems, eq(consolidationItems.itemId, customItems.id))
          .where(eq(consolidationItems.consolidationId, shipment.consolidationId));
        
        const items = consolidationItemsList.map(row => row.item);
        
        if (items.length === 0) {
          throw new Error(`No items found for shipment ${shipmentId}`);
        }
        
        const itemIds = items.map(item => item.id);

        // Map cartons to items
        const cartonMap = new Map<number, ShipmentCarton>();
        cartons.forEach(carton => {
          cartonMap.set(carton.customItemId, carton);
        });

        // 4. Prepare item allocations with chargeable weights
        const itemAllocations: ItemAllocation[] = items.map(item => {
          const carton = cartonMap.get(item.id);
          
          // Get dimensions and weight
          let dimensions = this.getFallbackDimensions(item);
          let actualWeight = dimensions.weight * item.quantity;
          let volumetricWeight = 0;

          if (carton) {
            if (carton.grossWeightKg) {
              actualWeight = Number(carton.grossWeightKg);
            }
            if (carton.lengthCm && carton.widthCm && carton.heightCm) {
              dimensions = {
                length: Number(carton.lengthCm),
                width: Number(carton.widthCm),
                height: Number(carton.heightCm),
                weight: actualWeight
              };
            }
          }

          // Find freight cost to get volumetric divisor
          const freightCost = costs.find(c => c.type === 'FREIGHT');
          const divisor = freightCost?.volumetricDivisor 
            ? Number(freightCost.volumetricDivisor)
            : VOLUMETRIC_DIVISORS.DEFAULT;

          volumetricWeight = this.calculateVolumetricWeight(
            dimensions.length,
            dimensions.width,
            dimensions.height,
            divisor
          ) * (carton ? 1 : item.quantity);

          const chargeableWeight = this.calculateChargeableWeight(actualWeight, volumetricWeight);

          // Calculate item value
          let totalValue = 0;
          if (item.totalPrice) {
            totalValue = Number(item.totalPrice);
          } else if (item.unitPrice) {
            totalValue = Number(item.unitPrice) * item.quantity;
          }

          return {
            customItemId: item.id,
            chargeableWeight,
            actualWeight,
            volumetricWeight,
            unitPrice: item.unitPrice ? Number(item.unitPrice) : 0,
            quantity: item.quantity,
            totalValue
          };
        });

        // 5. Allocate each cost type by its basis
        const costAllocationsToInsert: InsertCostAllocation[] = [];
        const costSummary: Record<string, Decimal> = {
          FREIGHT: new Decimal(0),
          INSURANCE: new Decimal(0),
          BROKERAGE: new Decimal(0),
          PACKAGING: new Decimal(0),
          DUTY: new Decimal(0),
          OTHER: new Decimal(0)
        };

        for (const cost of costs) {
          // Convert to base currency
          let costInBase: Decimal;
          try {
            if (cost.currency !== BASE_CURRENCY) {
              exchangeRates[cost.currency] = cost.fxRateUsed ? Number(cost.fxRateUsed) : 1;
            }
            costInBase = cost.currency === BASE_CURRENCY
              ? new Decimal(cost.amountBase.toString())
              : this.convertToBaseCurrency(
                  Number(cost.amountOriginal),
                  cost.currency,
                  Number(cost.fxRateUsed)
                );
          } catch (error) {
            warnings.push(`Failed to convert ${cost.currency} for ${cost.type}: ${error}`);
            costInBase = new Decimal(cost.amountBase?.toString() || '0');
          }

          costSummary[cost.type] = costSummary[cost.type].add(costInBase);

          // Use automatic allocation method selection
          const shipmentCharacteristics = {
            unitType: shipment.unitType || undefined,
            totalWeight: shipment.totalWeight ? Number(shipment.totalWeight) : undefined,
            totalValue: await this.getShipmentMetrics(shipmentId).then(metrics => metrics.totalValue),
            itemCount: itemAllocations.length
          };

          const allocationResult = this.allocateWithAutoSelection(
            itemAllocations,
            costInBase,
            cost.type,
            shipmentCharacteristics
          );

          const allocations = allocationResult.allocations;
          const basis = allocationResult.method;
          
          // Add allocation reasoning to warnings for transparency
          warnings.push(`${cost.type}: ${allocationResult.reasoning}`);

          // Create allocation records
          for (const allocation of allocations) {
            costAllocationsToInsert.push({
              shipmentId,
              customItemId: allocation.customItemId,
              costType: cost.type,
              basis,
              amountAllocatedBase: allocation.amount.toString(),
              detailsJson: this.formatAllocationDetails({
                method: 'proportional',
                basis,
                inputs: {
                  costId: cost.id,
                  originalAmount: cost.amountOriginal,
                  currency: cost.currency,
                  fxRate: cost.fxRateUsed
                },
                outputs: {
                  allocatedAmount: allocation.amount.toString()
                },
                shipmentId,
                costType: cost.type,
                totalAllocated: costInBase,
                itemCount: itemAllocations.length
              })
            });
          }
        }

        // 6. Calculate CIF and Duty for each item
        const itemBreakdowns = [];
        const productCostHistoryToInsert: InsertProductCostHistory[] = [];

        for (const item of items) {
          const itemAllocation = itemAllocations.find(a => a.customItemId === item.id);
          if (!itemAllocation) continue;

          // Get all allocations for this item
          const itemCostAllocations = costAllocationsToInsert.filter(
            a => a.customItemId === item.id
          );

          // Sum up costs by type
          const unitCosts = {
            productCost: new Decimal(itemAllocation.unitPrice),
            freight: new Decimal(0),
            insurance: new Decimal(0),
            brokerage: new Decimal(0),
            packaging: new Decimal(0),
            duty: new Decimal(0),
            other: new Decimal(0),
            total: new Decimal(0)
          };

          for (const allocation of itemCostAllocations) {
            const amount = new Decimal(allocation.amountAllocatedBase);
            const perUnit = amount.div(item.quantity);

            switch (allocation.costType) {
              case 'FREIGHT':
                unitCosts.freight = unitCosts.freight.add(perUnit);
                break;
              case 'INSURANCE':
                unitCosts.insurance = unitCosts.insurance.add(perUnit);
                break;
              case 'BROKERAGE':
                unitCosts.brokerage = unitCosts.brokerage.add(perUnit);
                break;
              case 'PACKAGING':
                unitCosts.packaging = unitCosts.packaging.add(perUnit);
                break;
              case 'OTHER':
                unitCosts.other = unitCosts.other.add(perUnit);
                break;
            }
          }

          // Calculate CIF (Cost + Insurance + Freight)
          const cif = unitCosts.productCost
            .add(unitCosts.freight)
            .add(unitCosts.insurance);

          // Calculate duty if applicable
          if (item.dutyRatePercent) {
            const dutyRate = new Decimal(item.dutyRatePercent.toString()).div(100);
            unitCosts.duty = cif.mul(dutyRate);
          }

          // Calculate total landed cost per unit
          unitCosts.total = unitCosts.productCost
            .add(unitCosts.freight)
            .add(unitCosts.insurance)
            .add(unitCosts.brokerage)
            .add(unitCosts.packaging)
            .add(unitCosts.duty)
            .add(unitCosts.other);

          // Add DUTY allocations if applicable
          if (unitCosts.duty.gt(0)) {
            costAllocationsToInsert.push({
              shipmentId,
              customItemId: item.id,
              costType: 'DUTY',
              basis: 'VALUE',
              amountAllocatedBase: unitCosts.duty.mul(item.quantity).toString(),
              detailsJson: this.formatAllocationDetails({
                method: 'duty_calculation',
                basis: 'VALUE',
                inputs: {
                  cif: cif.toString(),
                  dutyRate: item.dutyRatePercent,
                  hsCode: item.hsCode
                },
                outputs: {
                  dutyPerUnit: unitCosts.duty.toString(),
                  totalDuty: unitCosts.duty.mul(item.quantity).toString()
                },
                shipmentId,
                costType: 'DUTY',
                totalAllocated: unitCosts.duty.mul(item.quantity),
                itemCount: 1
              })
            });
          }

          itemBreakdowns.push({
            customItemId: item.id,
            sku: item.sku,
            name: item.name,
            quantity: item.quantity,
            unitCosts: {
              productCost: unitCosts.productCost,
              freight: unitCosts.freight,
              insurance: unitCosts.insurance,
              brokerage: unitCosts.brokerage,
              packaging: unitCosts.packaging,
              duty: unitCosts.duty,
              other: unitCosts.other,
              total: unitCosts.total
            },
            totalCost: unitCosts.total.mul(item.quantity),
            chargeableWeight: itemAllocation.chargeableWeight,
            actualWeight: itemAllocation.actualWeight,
            volumetricWeight: itemAllocation.volumetricWeight
          });

          // Prepare product cost history if item has SKU
          if (item.sku) {
            // Find product by SKU
            const [product] = await tx
              .select()
              .from(products)
              .where(eq(products.sku, item.sku));

            if (product) {
              productCostHistoryToInsert.push({
                productId: product.id,
                customItemId: item.id,
                landingCostUnitBase: unitCosts.total.toString(),
                method: 'landing_cost_calculation',
                computedAt: new Date()
              });
            }
          }
        }

        // 7. Store allocations in database
        if (costAllocationsToInsert.length > 0) {
          // Delete existing allocations for this shipment
          await tx
            .delete(costAllocations)
            .where(eq(costAllocations.shipmentId, shipmentId));

          // Insert new allocations
          await tx.insert(costAllocations).values(costAllocationsToInsert);
        }

        // 8. Update custom_items.landing_cost_unit_base (if such field exists, otherwise skip)
        // Note: customItems table doesn't have landing_cost_unit_base field, 
        // so we'll skip this step as costs are tracked in product_cost_history

        // 9. Add to product_cost_history
        if (productCostHistoryToInsert.length > 0) {
          await tx.insert(productCostHistory).values(productCostHistoryToInsert);
        }

        // 10. Return detailed breakdown
        const totalCosts = {
          freight: costSummary.FREIGHT || new Decimal(0),
          insurance: costSummary.INSURANCE || new Decimal(0),
          brokerage: costSummary.BROKERAGE || new Decimal(0),
          packaging: costSummary.PACKAGING || new Decimal(0),
          duty: itemBreakdowns.reduce(
            (sum, item) => sum.add(item.unitCosts.duty.mul(item.quantity)),
            new Decimal(0)
          ),
          other: costSummary.OTHER || new Decimal(0),
          total: new Decimal(0)
        };

        totalCosts.total = totalCosts.freight
          .add(totalCosts.insurance)
          .add(totalCosts.brokerage)
          .add(totalCosts.packaging)
          .add(totalCosts.duty)
          .add(totalCosts.other);

        const result: LandingCostBreakdown = {
          shipmentId,
          totalCosts,
          itemBreakdowns,
          warnings,
          metadata: {
            calculatedAt: new Date(),
            baseCurrency: BASE_CURRENCY,
            exchangeRates
          }
        };

        console.log(`Landing cost calculation completed for shipment ${shipmentId}`, {
          totalItems: itemBreakdowns.length,
          totalCost: totalCosts.total.toString(),
          warnings: warnings.length
        });

        return result;
      });
    } catch (error) {
      console.error(`Failed to calculate landing costs for shipment ${shipmentId}:`, error);
      throw error;
    }
  }

  /**
   * Recalculate landing costs for a shipment (idempotent)
   */
  async recalculateLandingCosts(shipmentId: number): Promise<LandingCostBreakdown> {
    console.log(`Recalculating landing costs for shipment ${shipmentId}`);
    return this.calculateLandingCosts(shipmentId);
  }

  /**
   * Get landing cost summary for a shipment
   */
  async getLandingCostSummary(shipmentId: number): Promise<{
    shipmentId: number;
    totalCost: string;
    itemCount: number;
    lastCalculated: Date | null;
    hasAllocations: boolean;
  }> {
    const allocations = await db
      .select()
      .from(costAllocations)
      .where(eq(costAllocations.shipmentId, shipmentId));

    if (allocations.length === 0) {
      return {
        shipmentId,
        totalCost: '0',
        itemCount: 0,
        lastCalculated: null,
        hasAllocations: false
      };
    }

    const totalCost = allocations.reduce(
      (sum, a) => sum.add(new Decimal(a.amountAllocatedBase.toString())),
      new Decimal(0)
    );

    const uniqueItems = new Set(allocations.map(a => a.customItemId));

    return {
      shipmentId,
      totalCost: totalCost.toString(),
      itemCount: uniqueItems.size,
      lastCalculated: allocations[0].createdAt,
      hasAllocations: true
    };
  }

  /**
   * Validate shipment data completeness for landing cost calculation
   */
  async validateShipmentData(shipmentId: number): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if shipment exists
      const [shipment] = await db
        .select()
        .from(shipments)
        .where(eq(shipments.id, shipmentId));

      if (!shipment) {
        errors.push(`Shipment ${shipmentId} not found`);
        return { isValid: false, errors, warnings };
      }

      // Check for costs
      const costs = await db
        .select()
        .from(shipmentCosts)
        .where(eq(shipmentCosts.shipmentId, shipmentId));

      if (costs.length === 0) {
        errors.push('No costs defined for shipment');
      }

      // Check for items
      const cartons = await db
        .select()
        .from(shipmentCartons)
        .where(eq(shipmentCartons.shipmentId, shipmentId));

      if (cartons.length === 0) {
        errors.push('No items/cartons defined for shipment');
      }

      // Check for missing dimensions or weights
      let missingDimensions = 0;
      let missingWeights = 0;

      for (const carton of cartons) {
        if (!carton.lengthCm || !carton.widthCm || !carton.heightCm) {
          missingDimensions++;
        }
        if (!carton.grossWeightKg) {
          missingWeights++;
        }
      }

      if (missingDimensions > 0) {
        warnings.push(`${missingDimensions} cartons missing dimensions (will use fallback values)`);
      }

      if (missingWeights > 0) {
        warnings.push(`${missingWeights} cartons missing weight (will use estimated values)`);
      }

      // Validate cost inputs
      const costValidation = this.validateCostInputs(costs);
      if (!costValidation.valid) {
        errors.push(...costValidation.errors);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error(`Error validating shipment ${shipmentId}:`, error);
      errors.push(`Validation failed: ${error}`);
      return { isValid: false, errors, warnings };
    }
  }
}

// Export singleton instance
export const landingCostService = new LandingCostService();