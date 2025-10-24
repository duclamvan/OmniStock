import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package,
  Weight,
  Box,
  Info
} from "lucide-react";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

interface ShipmentSummary {
  id: number;
  totalUnits: number;
  totalWeight: string;
  unitType: string;
  consolidationId: number;
  items?: any[];
}

interface CartonDimensionsProps {
  shipmentId: number;
}

const CartonDimensions = ({ shipmentId }: CartonDimensionsProps) => {
  // Fetch shipment summary data
  const { data: shipment, isLoading } = useQuery<ShipmentSummary>({
    queryKey: [`/api/imports/shipments/${shipmentId}`],
    enabled: !!shipmentId
  });

  // Get unit type display text
  const getUnitTypeDisplay = (unitType?: string) => {
    if (!unitType) return 'Units';
    const typeMap: Record<string, string> = {
      'boxes': 'Boxes',
      'pallets': 'Pallets',
      'bags': 'Bags',
      'crates': 'Crates',
      'cartons': 'Cartons',
      '20GP Container': '20GP Container',
      '40GP Container': '40GP Container',
      '40HQ Container': '40HQ Container',
      '45HQ Container': '45HQ Container',
      'LCL Shipment': 'LCL Shipment'
    };
    return typeMap[unitType] || unitType;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Carton Information...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!shipment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Shipment Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Unable to load shipment information
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalWeight = parseFloat(shipment.totalWeight || '0');
  const itemCount = shipment.items?.length || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Carton Summary</CardTitle>
        <CardDescription className="text-xs">
          Shipment packaging and weight information for cost calculations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Compact Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Total Units */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-card">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-lg shrink-0">
              <Package className="h-4 w-4 text-blue-600 dark:text-blue-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground truncate">Total Units</p>
              <p className="text-lg font-bold">{shipment.totalUnits || 0}</p>
            </div>
          </div>

          {/* Total Weight */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-card">
            <div className="p-1.5 bg-green-100 dark:bg-green-900 rounded-lg shrink-0">
              <Weight className="h-4 w-4 text-green-600 dark:text-green-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground truncate">Total Weight</p>
              <p className="text-lg font-bold">{totalWeight.toFixed(2)} kg</p>
            </div>
          </div>

          {/* Unit Type */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-card">
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900 rounded-lg shrink-0">
              <Box className="h-4 w-4 text-purple-600 dark:text-purple-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground truncate">Unit Type</p>
              <p className="text-sm font-bold truncate">{getUnitTypeDisplay(shipment.unitType)}</p>
            </div>
          </div>

          {/* Items Count */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-card">
            <div className="p-1.5 bg-cyan-100 dark:bg-cyan-900 rounded-lg shrink-0">
              <Package className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground truncate">Items</p>
              <p className="text-lg font-bold">{itemCount}</p>
            </div>
          </div>

          {/* Avg Weight per Unit */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-card">
            <div className="p-1.5 bg-amber-100 dark:bg-amber-900 rounded-lg shrink-0">
              <Weight className="h-4 w-4 text-amber-600 dark:text-amber-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground truncate">Avg/Unit</p>
              <p className="text-sm font-bold truncate">
                {shipment.totalUnits > 0 
                  ? (totalWeight / shipment.totalUnits).toFixed(2)
                  : '0'} kg
              </p>
            </div>
          </div>
        </div>

        {/* Compact Info Alert */}
        <Alert className="py-2">
          <Info className="h-3.5 w-3.5" />
          <AlertDescription className="text-xs">
            Actual weight is used for landing cost calculations and allocation across items.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default CartonDimensions;