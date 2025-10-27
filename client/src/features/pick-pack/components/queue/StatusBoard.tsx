import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function StatusBoard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {['Pending', 'Picking', 'Ready to Pack', 'Packing', 'Complete'].map((status) => (
        <Card key={status} data-testid={`card-status-${status.toLowerCase().replace(/ /g, '-')}`}>
          <CardHeader>
            <CardTitle className="text-sm">{status}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <p className="text-xs text-muted-foreground text-center">
                Status board stub - will show orders in this status
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
