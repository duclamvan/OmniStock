import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone } from 'lucide-react';

export function MobileTaskView() {
  return (
    <Card data-testid="card-mobile-task-view">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Mobile Picker View
        </CardTitle>
        <CardDescription>
          Optimized interface for mobile picking tasks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            This component will provide:
          </div>
          <ul className="text-sm space-y-2 list-disc list-inside">
            <li>Large touch-friendly buttons</li>
            <li>Current pick item highlighted</li>
            <li>Quick scan input</li>
            <li>Progress tracker</li>
            <li>Next item preview</li>
          </ul>
          <Button className="w-full" disabled data-testid="button-start-picking">
            Start Picking (Stub)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
