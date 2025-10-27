import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Scale, Printer } from 'lucide-react';

export function StationWorkspace() {
  return (
    <Card data-testid="card-station-workspace">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Packing Station
        </CardTitle>
        <CardDescription>
          Complete packing workspace with all tools
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" disabled data-testid="button-weigh">
              <Scale className="h-4 w-4 mr-1" />
              Weigh
            </Button>
            <Button variant="outline" size="sm" disabled data-testid="button-print-label">
              <Printer className="h-4 w-4 mr-1" />
              Label
            </Button>
            <Button variant="outline" size="sm" disabled data-testid="button-complete">
              <Package className="h-4 w-4 mr-1" />
              Complete
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            This component will provide:
          </div>
          <ul className="text-sm space-y-2 list-disc list-inside">
            <li>Item verification checklist</li>
            <li>Box size recommendations</li>
            <li>Weight capture</li>
            <li>Label printing</li>
            <li>Packing material tracking</li>
            <li>Photo upload for complex packs</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
