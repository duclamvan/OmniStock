import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  showStats?: boolean;
  className?: string;
}

export function TableSkeleton({ 
  rows = 10, 
  columns = 6, 
  showHeader = true,
  showStats = false,
  className = ""
}: TableSkeletonProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {showHeader && (
        <div className="flex items-center justify-between gap-4 mb-4">
          <Skeleton className="h-10 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      )}
      
      <div className="rounded-md border">
        <div className="border-b bg-muted/50">
          <div className="flex items-center gap-4 p-4">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" style={{ maxWidth: i === 0 ? '40px' : undefined }} />
            ))}
          </div>
        </div>
        
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex items-center gap-4 p-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton 
                  key={colIndex} 
                  className="h-5 flex-1" 
                  style={{ 
                    maxWidth: colIndex === 0 ? '40px' : undefined,
                    opacity: 1 - (rowIndex * 0.05)
                  }} 
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function StatsCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
