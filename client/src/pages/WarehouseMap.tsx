import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Warehouse, Package, Layers, MapPin, Info } from "lucide-react";

interface ProductInfo {
  name: string;
  sku: string;
  quantity: number;
}

interface LocationOccupancy {
  locationCode: string;
  totalQuantity: number;
  productCount: number;
  products: ProductInfo[];
}

interface LocationStats {
  aisle: string;
  rack: string;
  level: string;
  totalQuantity: number;
  productCount: number;
  occupancyPercent: number;
}

export default function WarehouseMap() {
  // Configuration state
  const [warehouse] = useState("WH1");
  const [totalAisles, setTotalAisles] = useState(6);
  const [maxRacks, setMaxRacks] = useState(10);
  const [maxLevels, setMaxLevels] = useState(5);
  const [maxBins, setMaxBins] = useState(5);
  const [selectedLocation, setSelectedLocation] = useState<LocationStats | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch product locations from all warehouses
  const { data: productLocations } = useQuery<any[]>({
    queryKey: ['/api/products'],
  });

  // Calculate occupancy for each location
  const locationOccupancy = useMemo(() => {
    if (!productLocations) return new Map<string, LocationOccupancy>();

    const occupancyMap = new Map<string, LocationOccupancy>();

    productLocations.forEach((product) => {
      if (product.locations && Array.isArray(product.locations)) {
        product.locations.forEach((loc: any) => {
          const code = loc.locationCode;
          if (!code || !code.startsWith(warehouse)) return;

          const existing = occupancyMap.get(code) || {
            locationCode: code,
            totalQuantity: 0,
            productCount: 0,
            products: [],
          };

          existing.totalQuantity += loc.quantity || 0;
          existing.productCount += 1;
          existing.products.push({
            name: product.name,
            sku: product.sku || '',
            quantity: loc.quantity || 0,
          });

          occupancyMap.set(code, existing);
        });
      }
    });

    return occupancyMap;
  }, [productLocations, warehouse]);

  // Generate grid data
  const gridData = useMemo(() => {
    const grid: LocationStats[][] = [];

    for (let a = 1; a <= totalAisles; a++) {
      const row: LocationStats[] = [];
      const aisleCode = `A${String(a).padStart(2, '0')}`;

      for (let r = 1; r <= maxRacks; r++) {
        const rackCode = `R${String(r).padStart(2, '0')}`;
        
        // Calculate total items in this aisle-rack combination (across all levels and bins)
        let totalQuantity = 0;
        let productCount = 0;

        for (let l = 1; l <= maxLevels; l++) {
          const levelCode = `L${String(l).padStart(2, '0')}`;
          for (let b = 1; b <= maxBins; b++) {
            const binCode = `B${b}`;
            const locationCode = `${warehouse}-${aisleCode}-${rackCode}-${levelCode}-${binCode}`;
            const occupancy = locationOccupancy.get(locationCode);
            
            if (occupancy) {
              totalQuantity += occupancy.totalQuantity;
              productCount += occupancy.productCount;
            }
          }
        }

        const maxCapacity = maxLevels * maxBins * 100; // Assume 100 units per bin max
        const occupancyPercent = maxCapacity > 0 ? (totalQuantity / maxCapacity) * 100 : 0;

        row.push({
          aisle: aisleCode,
          rack: rackCode,
          level: '',
          totalQuantity,
          productCount,
          occupancyPercent: Math.min(occupancyPercent, 100),
        });
      }

      grid.push(row);
    }

    return grid;
  }, [totalAisles, maxRacks, maxLevels, maxBins, locationOccupancy, warehouse]);

  // Get color based on occupancy
  const getOccupancyColor = (percent: number) => {
    if (percent === 0) return 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    if (percent < 25) return 'bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-800 text-green-900 dark:text-green-100';
    if (percent < 50) return 'bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-100';
    if (percent < 75) return 'bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100';
    return 'bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-800 text-red-900 dark:text-red-100';
  };

  const handleCellClick = (location: LocationStats) => {
    setSelectedLocation(location);
    setDetailsOpen(true);
  };

  // Calculate overall statistics
  const stats = useMemo(() => {
    const totalLocations = totalAisles * maxRacks;
    const occupiedLocations = gridData.flat().filter(loc => loc.totalQuantity > 0).length;
    const totalItems = gridData.flat().reduce((sum, loc) => sum + loc.totalQuantity, 0);
    const avgOccupancy = totalLocations > 0 
      ? gridData.flat().reduce((sum, loc) => sum + loc.occupancyPercent, 0) / totalLocations 
      : 0;

    return {
      totalLocations,
      occupiedLocations,
      freeLocations: totalLocations - occupiedLocations,
      totalItems,
      avgOccupancy,
    };
  }, [gridData, totalAisles, maxRacks]);

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
            <Warehouse className="h-6 w-6 text-amber-700 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-amber-900 dark:text-amber-100">Warehouse Space Map</h1>
            <p className="text-sm text-muted-foreground">Visual overview of storage capacity and occupancy</p>
          </div>
        </div>
      </div>

      {/* Configuration Panel */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-amber-600" />
            Layout Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="aisles" className="text-xs">Total Aisles</Label>
              <Select value={totalAisles.toString()} onValueChange={(v) => setTotalAisles(parseInt(v))}>
                <SelectTrigger id="aisles" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6, 8, 10, 12, 15].map(n => (
                    <SelectItem key={n} value={n.toString()}>{n} aisles</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="racks" className="text-xs">Racks per Aisle</Label>
              <Select value={maxRacks.toString()} onValueChange={(v) => setMaxRacks(parseInt(v))}>
                <SelectTrigger id="racks" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 8, 10, 12, 15, 20].map(n => (
                    <SelectItem key={n} value={n.toString()}>{n} racks</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="levels" className="text-xs">Levels per Rack</Label>
              <Select value={maxLevels.toString()} onValueChange={(v) => setMaxLevels(parseInt(v))}>
                <SelectTrigger id="levels" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6, 8, 10].map(n => (
                    <SelectItem key={n} value={n.toString()}>{n} levels</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bins" className="text-xs">Bins per Level</Label>
              <Select value={maxBins.toString()} onValueChange={(v) => setMaxBins(parseInt(v))}>
                <SelectTrigger id="bins" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6, 8].map(n => (
                    <SelectItem key={n} value={n.toString()}>{n} bins</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Locations</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.totalLocations}</p>
              </div>
              <MapPin className="h-8 w-8 text-amber-300 dark:text-amber-700" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Free Locations</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.freeLocations}</p>
              </div>
              <Package className="h-8 w-8 text-green-300 dark:text-green-700" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Occupied</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.occupiedLocations}</p>
              </div>
              <Layers className="h-8 w-8 text-blue-300 dark:text-blue-700" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats.totalItems}</p>
              </div>
              <Package className="h-8 w-8 text-purple-300 dark:text-purple-700" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
              <span className="text-xs text-muted-foreground">Empty (0%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-green-100 dark:bg-green-950 border border-green-300 dark:border-green-800" />
              <span className="text-xs text-muted-foreground">Low (1-25%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-blue-100 dark:bg-blue-950 border border-blue-300 dark:border-blue-800" />
              <span className="text-xs text-muted-foreground">Medium (25-50%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-800" />
              <span className="text-xs text-muted-foreground">High (50-75%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-800" />
              <span className="text-xs text-muted-foreground">Full (75-100%)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warehouse Grid */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Warehouse className="h-4 w-4 text-amber-600" />
            Warehouse {warehouse} - Aisle & Rack Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Column Headers (Racks) */}
              <div className="flex mb-2">
                <div className="w-16 flex-shrink-0" /> {/* Spacer for aisle labels */}
                {Array.from({ length: maxRacks }, (_, i) => (
                  <div key={i} className="flex-1 min-w-[60px] text-center">
                    <span className="text-xs font-medium text-muted-foreground">
                      R{String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Grid Rows (Aisles) */}
              {gridData.map((row, aisleIndex) => (
                <div key={aisleIndex} className="flex mb-2">
                  {/* Aisle Label */}
                  <div className="w-16 flex-shrink-0 flex items-center justify-center">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      A{String(aisleIndex + 1).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Rack Cells */}
                  {row.map((location, rackIndex) => (
                    <TooltipProvider key={rackIndex}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleCellClick(location)}
                            className={`flex-1 min-w-[60px] h-14 rounded border-2 transition-colors ${getOccupancyColor(location.occupancyPercent)}`}
                          >
                            <div className="flex flex-col items-center justify-center h-full">
                              {location.totalQuantity > 0 && (
                                <>
                                  <span className="text-xs font-bold">{location.totalQuantity}</span>
                                  <span className="text-[10px] opacity-70">{location.productCount} SKU</span>
                                </>
                              )}
                            </div>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">
                            <p className="font-semibold">{location.aisle}-{location.rack}</p>
                            <p>Items: {location.totalQuantity}</p>
                            <p>Products: {location.productCount}</p>
                            <p>Occupancy: {location.occupancyPercent.toFixed(1)}%</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Sheet */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-amber-600" />
              Location Details
            </SheetTitle>
          </SheetHeader>

          {selectedLocation && (
            <div className="mt-6 space-y-4">
              {/* Location Info */}
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Location</span>
                    <Badge variant="outline" className="font-mono">
                      {selectedLocation.aisle}-{selectedLocation.rack}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Items</span>
                    <span className="font-semibold">{selectedLocation.totalQuantity}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Product Count</span>
                    <span className="font-semibold">{selectedLocation.productCount} SKUs</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Occupancy</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-600 transition-all"
                          style={{ width: `${selectedLocation.occupancyPercent}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{selectedLocation.occupancyPercent.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Products in this location */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Products Stored</h3>
                <div className="space-y-2">
                  {Array.from(locationOccupancy.entries())
                    .filter(([code]) => code.startsWith(`${warehouse}-${selectedLocation.aisle}-${selectedLocation.rack}`))
                    .flatMap(([, occupancy]) => occupancy.products)
                    .reduce((acc, product) => {
                      const existing = acc.find(p => p.sku === product.sku);
                      if (existing) {
                        existing.quantity += product.quantity;
                      } else {
                        acc.push({ ...product });
                      }
                      return acc;
                    }, [] as Array<{name: string; sku: string; quantity: number}>)
                    .map((product, index) => (
                      <Card key={index}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{product.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                            </div>
                            <Badge variant="secondary" className="flex-shrink-0">
                              {product.quantity}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  
                  {selectedLocation.totalQuantity === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No products stored in this location</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
