import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation } from 'lucide-react';

export function LocationGuidance() {
  return (
    <Card data-testid="card-location-guidance">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location Guidance
        </CardTitle>
        <CardDescription>
          Warehouse navigation helper
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <Navigation className="h-4 w-4 text-blue-500" />
            <span>Current Location: Not Set</span>
          </div>
          <div className="text-sm text-muted-foreground">
            This component will provide:
          </div>
          <ul className="text-sm space-y-2 list-disc list-inside">
            <li>Visual warehouse map</li>
            <li>Optimal pick path calculation</li>
            <li>Distance to next location</li>
            <li>Zone-based grouping</li>
            <li>Alternative location suggestions</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
