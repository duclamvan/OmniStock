import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Building, Grid3x3 } from 'lucide-react';

interface LocationGuidanceProps {
  locationCode?: string | null;
}

export function LocationGuidance({ locationCode }: LocationGuidanceProps) {
  if (!locationCode) {
    return (
      <Card className="bg-gray-50" data-testid="card-no-location">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>No location assigned</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Parse location code (e.g., "WH1-A06-R04-L04-B2" or simpler formats)
  const parts = locationCode.split('-');
  const warehouse = parts[0] || '';
  const aisle = parts[1] || '';
  const rack = parts[2] || '';
  const level = parts[3] || '';
  const bin = parts[4] || '';

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200" data-testid="card-location-guidance">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Main Location Display */}
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-blue-600" />
            <span className="text-lg font-bold text-blue-900" data-testid="text-location-code">
              {locationCode}
            </span>
          </div>

          {/* Parsed Location Details */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {warehouse && (
              <div className="flex items-center gap-1" data-testid="text-warehouse">
                <Building className="h-4 w-4 text-gray-600" />
                <span className="text-gray-600">Warehouse:</span>
                <Badge variant="secondary">{warehouse}</Badge>
              </div>
            )}

            {aisle && (
              <div className="flex items-center gap-1" data-testid="text-aisle">
                <Grid3x3 className="h-4 w-4 text-gray-600" />
                <span className="text-gray-600">Aisle:</span>
                <Badge variant="secondary">{aisle}</Badge>
              </div>
            )}

            {rack && (
              <div className="flex items-center gap-1" data-testid="text-rack">
                <span className="text-gray-600">Rack:</span>
                <Badge variant="secondary">{rack}</Badge>
              </div>
            )}

            {level && (
              <div className="flex items-center gap-1" data-testid="text-level">
                <span className="text-gray-600">Level:</span>
                <Badge variant="secondary">{level}</Badge>
              </div>
            )}

            {bin && (
              <div className="flex items-center gap-1" data-testid="text-bin">
                <span className="text-gray-600">Bin:</span>
                <Badge variant="secondary">{bin}</Badge>
              </div>
            )}
          </div>

          {/* Simple visual guide */}
          <div className="bg-white rounded p-2 text-xs text-center text-gray-500">
            Navigate to this location to pick the item
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
