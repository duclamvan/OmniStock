import { eq, and, sql, inArray } from 'drizzle-orm';
import { db } from '../db';
import {
  shipments,
  shipmentCosts,
  shipmentCartons,
  purchaseItems,
  costAllocations,
  productCostHistory,
  products,
  receipts,
  receiptItems,
  customItems,
  type Shipment,
  type ShipmentCost,
  type ShipmentCarton,
  type PurchaseItem,
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
interface ItemWithCarton extends PurchaseItem {
  carton?: ShipmentCarton;
}

interface ItemAllocation {
  purchaseItemId: number;
  chargeableWeight: number;
  actualWeight: number;
  volumetricWeight: number;
  unitPrice: number;
  quantity: number;
  totalValue: number;
}

interface AllocationResult {
  purchaseItemId: number;
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
    purchaseItemId: number;
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
      purchaseItemId: item.purchaseItemId,
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
      purchaseItemId: item.purchaseItemId,
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
      purchaseItemId: item.purchaseItemId,
      amount: totalCost.mul(item.quantity).div(totalUnits)
    }));

    return this.reconcileRounding(allocations, totalCost);
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

    // Get all purchase items for this consolidation with optional carton data
    const itemsWithCartons = await db
      .select({
        // Purchase item fields
        id: purchaseItems.id,
        quantity: purchaseItems.quantity,
        unitPrice: purchaseItems.unitPrice,
        totalPrice: purchaseItems.totalPrice,
        unitGrossWeightKg: purchaseItems.unitGrossWeightKg,
        unitLengthCm: purchaseItems.unitLengthCm,
        unitWidthCm: purchaseItems.unitWidthCm,
        unitHeightCm: purchaseItems.unitHeightCm,
        // Carton fields (optional)
        cartonGrossWeightKg: shipmentCartons.grossWeightKg,
        cartonLengthCm: shipmentCartons.lengthCm,
        cartonWidthCm: shipmentCartons.widthCm,
        cartonHeightCm: shipmentCartons.heightCm
      })
      .from(purchaseItems)
      .leftJoin(shipmentCartons, and(
        eq(shipmentCartons.purchaseItemId, purchaseItems.id),
        eq(shipmentCartons.shipmentId, shipmentId)
      ))
      .where(eq(purchaseItems.consolidationId, consolidationId));

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
      } else if (item.unitGrossWeightKg) {
        actualWeight = Number(item.unitGrossWeightKg) * quantity;
      }

      if (item.cartonLengthCm && item.cartonWidthCm && item.cartonHeightCm) {
        volumetricWeight = this.calculateVolumetricWeight(
          Number(item.cartonLengthCm),
          Number(item.cartonWidthCm),
          Number(item.cartonHeightCm)
        );
      } else if (item.unitLengthCm && item.unitWidthCm && item.unitHeightCm) {
        volumetricWeight = this.calculateVolumetricWeight(
          Number(item.unitLengthCm),
          Number(item.unitWidthCm),
          Number(item.unitHeightCm)
        ) * quantity;
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
  getFallbackDimensions(item: PurchaseItem): {
    length: number;
    width: number;
    height: number;
    weight: number;
  } {
    // Try to get dimensions from item first
    let length = item.unitLengthCm ? Number(item.unitLengthCm) : 0;
    let width = item.unitWidthCm ? Number(item.unitWidthCm) : 0;
    let height = item.unitHeightCm ? Number(item.unitHeightCm) : 0;
    let weight = item.unitGrossWeightKg ? Number(item.unitGrossWeightKg) : 0;

    // Apply fallback defaults if any dimension is missing
    if (length <= 0 || width <= 0 || height <= 0) {
      // Default small package dimensions (20x15x10 cm)
      length = length > 0 ? length : 20;
      width = width > 0 ? width : 15;
      height = height > 0 ? height : 10;
      
      console.warn(`Using fallback dimensions for item ${item.id}`, {
        itemId: item.id,
        sku: item.sku,
        fallbackDimensions: { length, width, height }
      });
    }

    if (weight <= 0) {
      // Estimate weight based on volume (assuming 200 kg/m³ density)
      const volumeM3 = (length * width * height) / 1000000;
      weight = volumeM3 * 200;
      
      console.warn(`Using estimated weight for item ${item.id}`, {
        itemId: item.id,
        sku: item.sku,
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

        let items: any[] = [];
        let itemIds: number[] = [];
        
        if (cartons.length > 0) {
          // Use cartons for purchase items
          itemIds = cartons.map(c => c.purchaseItemId);
          items = await tx
            .select()
            .from(purchaseItems)
            .where(inArray(purchaseItems.id, itemIds));
        } else {
          // Fallback: Use receipt items for custom items when no cartons exist
          const receiptItemsQuery = await tx
            .select({
              id: receiptItems.itemId,
              name: customItems.name,
              quantity: receiptItems.receivedQuantity,
              unitPrice: customItems.unitPrice,
              weight: customItems.weight,
              dimensions: customItems.dimensions,
              itemType: receiptItems.itemType
            })
            .from(receiptItems)
            .leftJoin(receipts, eq(receiptItems.receiptId, receipts.id))
            .leftJoin(customItems, eq(receiptItems.itemId, customItems.id))
            .where(and(
              eq(receipts.shipmentId, shipmentId),
              eq(receiptItems.itemType, 'custom')
            ));
          
          if (receiptItemsQuery.length === 0) {
            throw new Error(`No items found for shipment ${shipmentId}`);
          }
          
          items = receiptItemsQuery;
          itemIds = receiptItemsQuery.map(item => item.id);
        }

        // Map cartons to items
        const cartonMap = new Map<number, ShipmentCarton>();
        cartons.forEach(carton => {
          cartonMap.set(carton.purchaseItemId, carton);
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
            purchaseItemId: item.id,
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

          // Determine allocation basis
          let allocations: AllocationResult[];
          let basis: string;

          switch (cost.type) {
            case 'FREIGHT':
              allocations = this.allocateByChargeableWeight(itemAllocations, costInBase);
              basis = 'CHARGEABLE_WEIGHT';
              break;
            case 'INSURANCE':
              allocations = this.allocateByValue(itemAllocations, costInBase);
              basis = 'VALUE';
              break;
            case 'BROKERAGE':
            case 'PACKAGING':
            case 'OTHER':
              allocations = this.allocateByUnits(itemAllocations, costInBase);
              basis = 'UNITS';
              break;
            default:
              allocations = this.allocateByUnits(itemAllocations, costInBase);
              basis = 'UNITS';
          }

          // Create allocation records
          for (const allocation of allocations) {
            costAllocationsToInsert.push({
              shipmentId,
              purchaseItemId: allocation.purchaseItemId,
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
          const itemAllocation = itemAllocations.find(a => a.purchaseItemId === item.id);
          if (!itemAllocation) continue;

          // Get all allocations for this item
          const itemCostAllocations = costAllocationsToInsert.filter(
            a => a.purchaseItemId === item.id
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
              purchaseItemId: item.id,
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
            purchaseItemId: item.id,
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
                purchaseItemId: item.id,
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

        // 8. Update purchase_items.landing_cost_unit_base
        for (const breakdown of itemBreakdowns) {
          await tx
            .update(purchaseItems)
            .set({
              landingCostUnitBase: breakdown.unitCosts.total.toString()
            })
            .where(eq(purchaseItems.id, breakdown.purchaseItemId));
        }

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

    const uniqueItems = new Set(allocations.map(a => a.purchaseItemId));

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