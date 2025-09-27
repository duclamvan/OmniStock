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
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Carton Summary</CardTitle>
            <CardDescription>
              Shipment packaging and weight information for cost calculations
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Units */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <Package className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Units</p>
                      <p className="text-2xl font-bold">{shipment.totalUnits || 0}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Weight */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                      <Weight className="h-5 w-5 text-green-600 dark:text-green-300" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Weight</p>
                      <p className="text-2xl font-bold">{totalWeight.toFixed(2)} kg</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unit Type */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <Box className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Unit Type</p>
                      <p className="text-2xl font-bold">{getUnitTypeDisplay(shipment.unitType)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Items in Shipment:</span>
              <Badge variant="secondary">{itemCount}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Avg Weight per Unit:</span>
              <Badge variant="outline">
                {shipment.totalUnits > 0 
                  ? (totalWeight / shipment.totalUnits).toFixed(3)
                  : '0'} kg
              </Badge>
            </div>
          </div>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              The actual weight will be automatically used for landing cost calculations. 
              This simplified view shows the essential information needed for cost allocation across items.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default CartonDimensions;