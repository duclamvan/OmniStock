import { cn } from "@/lib/utils";

interface BinGridProps {
  bins: any[];
  onBinClick: (bin: any) => void;
  selectedBin?: any;
}

export function BinGrid({ bins, onBinClick, selectedBin }: BinGridProps) {
  if (!bins || bins.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground" data-testid="text-no-bins">
        No bins available
      </div>
    );
  }

  const getBinColor = (bin: any) => {
    if (bin.status === 'inactive') return 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300';
    
    const occupancy = bin.occupancy || 0;
    
    if (occupancy === 0) {
      return 'bg-green-100 dark:bg-green-900/40 hover:bg-green-200 dark:hover:bg-green-900/60 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200';
    } else if (occupancy < 80) {
      return 'bg-yellow-100 dark:bg-yellow-900/40 hover:bg-yellow-200 dark:hover:bg-yellow-900/60 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200';
    } else {
      return 'bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200';
    }
  };
  
  // Get zone-specific border style
  const getZoneBorderStyle = (bin: any) => {
    const zonePrefix = bin.code.charAt(0);
    // Different border styles for different zones
    if (zonePrefix === 'B') {
      // Pallets - dashed border
      return 'border-dashed';
    } else if (zonePrefix === 'C') {
      // Bulk - dotted border
      return 'border-dotted';
    }
    // Shelves (A) and others - solid border (default)
    return 'border-solid';
  };

  const rows = Array.from(new Set(bins.map(b => b.row))).sort();
  const maxColumns = Math.max(...bins.map(b => b.column));

  return (
    <div className="overflow-auto">
      <div className="inline-block min-w-full">
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${maxColumns + 1}, minmax(80px, 1fr))` }}>
          <div className="font-semibold text-center p-2"></div>
          {Array.from({ length: maxColumns }, (_, i) => i + 1).map(col => (
            <div key={col} className="font-semibold text-center p-2" data-testid={`text-column-${col}`}>
              {col}
            </div>
          ))}
          
          {rows.map(row => (
            <>
              <div key={`row-${row}`} className="font-semibold text-center p-2 flex items-center justify-center" data-testid={`text-row-${row}`}>
                {row}
              </div>
              {Array.from({ length: maxColumns }, (_, i) => i + 1).map(col => {
                const bin = bins.find(b => b.row === row && b.column === col);
                
                if (!bin) {
                  return <div key={`${row}-${col}`} className="p-2" />;
                }

                return (
                  <button
                    key={bin.id}
                    onClick={() => onBinClick(bin)}
                    className={cn(
                      "border-2 rounded-lg p-3 transition-all duration-200 cursor-pointer",
                      "flex flex-col items-center justify-center min-h-[80px]",
                      getBinColor(bin),
                      getZoneBorderStyle(bin),
                      selectedBin?.id === bin.id && "ring-2 ring-blue-500 dark:ring-blue-400 ring-offset-2 dark:ring-offset-slate-900"
                    )}
                    data-testid={`bin-${bin.code}`}
                  >
                    <div className="font-bold text-sm">{bin.code}</div>
                    <div className="text-xs mt-1">
                      {bin.occupancy > 0 ? `${Math.round(bin.occupancy)}%` : 'Empty'}
                    </div>
                  </button>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
