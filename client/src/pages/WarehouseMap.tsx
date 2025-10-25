import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Warehouse, Package, Layers, MapPin, Info } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ProductLocation {
  locationCode: string;
  quantity: number;
  productId: string;
  productName: string;
  productSku: string;
  locationType: string;
  isPrimary: boolean;
  notes: string;
}

interface AisleConfig {
  maxRacks: number;
  maxLevels: number;
  maxBins: number;
}

interface WarehouseConfig {
  totalAisles: number;
  maxRacks: number;
  maxLevels: number;
  maxBins: number;
  aisleConfigs?: Record<string, AisleConfig>;
}

interface LocationStats {
  aisle: string;
  rack: string;
  totalQuantity: number;
  productCount: number;
  occupancyPercent: number;
  products: Array<{ name: string; sku: string; quantity: number }>;
}

export default function WarehouseMap() {
  const { toast } = useToast();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [totalAisles, setTotalAisles] = useState(6);
  const [maxRacks, setMaxRacks] = useState(10);
  const [maxLevels, setMaxLevels] = useState(5);
  const [maxBins, setMaxBins] = useState(5);
  const [aisleConfigs, setAisleConfigs] = useState<Record<string, AisleConfig>>({});
  const [selectedLocation, setSelectedLocation] = useState<LocationStats | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [savingAisles, setSavingAisles] = useState<Set<string>>(new Set());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const aisleSaveTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  // Fetch warehouses
  const { data: warehouses, isLoading: warehousesLoading } = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
  });

  // Fetch warehouse configuration
  const { data: warehouseConfig, isLoading: configLoading } = useQuery<WarehouseConfig>({
    queryKey: ['/api/warehouses', selectedWarehouseId, 'map-config'],
    enabled: !!selectedWarehouseId,
  });

  // Fetch product locations for selected warehouse
  const { data: productLocations, isLoading: locationsLoading } = useQuery<ProductLocation[]>({
    queryKey: ['/api/product-locations', selectedWarehouseId],
    enabled: !!selectedWarehouseId,
    queryFn: async () => {
      const response = await fetch(`/api/product-locations?warehouseId=${selectedWarehouseId}`);
      if (!response.ok) throw new Error('Failed to fetch product locations');
      return response.json();
    },
  });

  // Update per-aisle configuration mutation
  const updateAisleConfigMutation = useMutation({
    mutationFn: async ({ aisleId, config }: { aisleId: string; config: AisleConfig }) => {
      const response = await fetch(`/api/warehouses/${selectedWarehouseId}/aisle-config/${aisleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!response.ok) {
        throw new Error('Failed to save aisle configuration');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      setSavingAisles(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.aisleId);
        return newSet;
      });
      queryClient.invalidateQueries({ queryKey: ['/api/warehouses', selectedWarehouseId, 'map-config'] });
    },
    onError: (error, variables) => {
      console.error('Error saving aisle configuration:', error);
      setSavingAisles(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.aisleId);
        return newSet;
      });
      toast({
        title: "Error",
        description: `Failed to save aisle ${variables.aisleId} configuration.`,
        variant: "destructive",
      });
    },
  });

  // Set initial warehouse when warehouses load
  useEffect(() => {
    if (warehouses && warehouses.length > 0 && !selectedWarehouseId) {
      setSelectedWarehouseId(warehouses[0].id);
    }
  }, [warehouses, selectedWarehouseId]);

  // Cancel pending save when warehouse changes (Fix Issue 3)
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, [selectedWarehouseId]);

  // Update local state when config is fetched
  useEffect(() => {
    if (warehouseConfig) {
      setTotalAisles(warehouseConfig.totalAisles);
      setMaxRacks(warehouseConfig.maxRacks);
      setMaxLevels(warehouseConfig.maxLevels);
      setMaxBins(warehouseConfig.maxBins);
      setAisleConfigs(warehouseConfig.aisleConfigs || {});
    }
  }, [warehouseConfig]);

  // Debounced save function for per-aisle configuration
  const debouncedAisleSave = useCallback((aisleId: string, config: AisleConfig) => {
    // Clear existing timeout for this aisle
    if (aisleSaveTimeouts.current[aisleId]) {
      clearTimeout(aisleSaveTimeouts.current[aisleId]);
    }

    // Mark aisle as saving
    setSavingAisles(prev => new Set(prev).add(aisleId));

    // Set new timeout
    const timeout = setTimeout(() => {
      updateAisleConfigMutation.mutate({ aisleId, config });
      delete aisleSaveTimeouts.current[aisleId];
    }, 500);

    aisleSaveTimeouts.current[aisleId] = timeout;
  }, [updateAisleConfigMutation]);

  // Handle aisle configuration changes
  const handleAisleConfigChange = useCallback((aisleId: string, field: keyof AisleConfig, value: number) => {
    setAisleConfigs(prev => {
      const current = prev[aisleId] || { maxRacks, maxLevels, maxBins };
      const updated = { ...current, [field]: value };
      
      // Save with debouncing
      debouncedAisleSave(aisleId, updated);
      
      return { ...prev, [aisleId]: updated };
    });
  }, [maxRacks, maxLevels, maxBins, debouncedAisleSave]);

  // Parse location code to extract aisle and rack (Fix Issue 2)
  const parseLocationCode = (locationCode: string) => {
    // Format examples:
    // - Standard: WH1-A06-R04-L04-B2
    // - With area: WH-CZ-PRG-A01-R02-L03-B1
    // - Pallets: WH1-B03-P05 (zone-based, no aisles/racks)
    // - Office: WH1-C01-P01 (zone-based, no aisles/racks)
    
    const parts = locationCode.split('-');
    
    if (parts.length < 2) {
      console.warn(`Invalid location code format: ${locationCode}`);
      return null;
    }
    
    // Standard format: Find aisle (starts with 'A'), rack (starts with 'R')
    const aislePart = parts.find(p => p.startsWith('A'));
    const rackPart = parts.find(p => p.startsWith('R'));
    
    if (aislePart && rackPart) {
      return {
        aisle: aislePart,
        rack: rackPart,
      };
    }
    
    // Zone-based format: Find zone prefix (B for pallets, C for office, etc.)
    const zonePart = parts.find(p => /^[B-Z]\d{2}/.test(p));
    
    if (zonePart) {
      // Map zone to virtual "aisle" and "rack" for display
      // E.g., B03 → Aisle "B03", Rack "R01"
      // This allows zone-based locations to appear on the map
      return {
        aisle: zonePart,
        rack: 'R01', // Virtual rack for zone-based locations
      };
    }
    
    // Fallback: unparseable location codes
    console.warn(`Could not parse location code: ${locationCode} - location will not be displayed on map`);
    return null;
  };

  // Helper function to get zone label
  const getZoneLabel = (aisleCode: string): string | null => {
    const prefix = aisleCode.charAt(0);
    const zoneLabels: Record<string, string> = {
      'B': 'Zone B - Pallets',
      'C': 'Zone C - Office',
      'D': 'Zone D - Returns',
      'E': 'Zone E - Staging',
      'F': 'Zone F - Special',
    };
    return zoneLabels[prefix] || null;
  };

  // Generate grid data from product locations
  const gridData = useMemo(() => {
    if (!productLocations) return [];

    const locationMap = new Map<string, {
      totalQuantity: number;
      productCount: number;
      products: Array<{ name: string; sku: string; quantity: number }>;
    }>();

    // Aggregate by aisle+rack
    productLocations.forEach((location) => {
      const parsed = parseLocationCode(location.locationCode);
      if (!parsed) return;

      const key = `${parsed.aisle}-${parsed.rack}`;
      const existing = locationMap.get(key) || {
        totalQuantity: 0,
        productCount: 0,
        products: [],
      };

      existing.totalQuantity += location.quantity;
      existing.productCount += 1;
      existing.products.push({
        name: location.productName,
        sku: location.productSku,
        quantity: location.quantity,
      });

      locationMap.set(key, existing);
    });

    // Extract all unique aisle codes from locationMap
    const discoveredAisles = new Set<string>();
    locationMap.forEach((_, key) => {
      const [aisle] = key.split('-');
      discoveredAisles.add(aisle);
    });

    // Build list of configured A-aisles
    const configuredAisles: string[] = [];
    for (let a = 1; a <= totalAisles; a++) {
      configuredAisles.push(`A${String(a).padStart(2, '0')}`);
    }

    // Extract zone aisles (non-A aisles) and sort alphabetically
    const zoneAisles = Array.from(discoveredAisles)
      .filter(aisle => !aisle.startsWith('A'))
      .sort();

    // Combine: configured A-aisles first, then zone aisles
    const allAislesToDisplay = [...configuredAisles, ...zoneAisles];

    // Build grid for all aisles
    const grid: LocationStats[][] = [];
    
    allAislesToDisplay.forEach(aisleCode => {
      const row: LocationStats[] = [];
      
      // Use per-aisle config if available, otherwise use global config
      const aisleConfig = aisleConfigs[aisleCode] || { maxRacks, maxLevels, maxBins };
      
      for (let r = 1; r <= aisleConfig.maxRacks; r++) {
        const rackCode = `R${String(r).padStart(2, '0')}`;
        const key = `${aisleCode}-${rackCode}`;
        const data = locationMap.get(key);

        const maxCapacity = aisleConfig.maxLevels * aisleConfig.maxBins * 100; // Assume 100 units per bin max
        const totalQuantity = data?.totalQuantity || 0;
        const occupancyPercent = maxCapacity > 0 ? (totalQuantity / maxCapacity) * 100 : 0;

        row.push({
          aisle: aisleCode,
          rack: rackCode,
          totalQuantity,
          productCount: data?.productCount || 0,
          occupancyPercent: Math.min(occupancyPercent, 100),
          products: data?.products || [],
        });
      }

      grid.push(row);
    });

    return grid;
  }, [productLocations, totalAisles, maxRacks, maxLevels, maxBins, aisleConfigs]);

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
    const allLocations = gridData.flat();
    const totalLocations = allLocations.length;
    const occupiedLocations = allLocations.filter(loc => loc.totalQuantity > 0).length;
    const totalItems = allLocations.reduce((sum, loc) => sum + loc.totalQuantity, 0);
    const avgOccupancy = totalLocations > 0 
      ? allLocations.reduce((sum, loc) => sum + loc.occupancyPercent, 0) / totalLocations 
      : 0;

    return {
      totalLocations,
      occupiedLocations,
      freeLocations: totalLocations - occupiedLocations,
      totalItems,
      avgOccupancy,
    };
  }, [gridData]);

  const isLoading = warehousesLoading || configLoading || locationsLoading;

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

      {/* Warehouse Selection */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Warehouse className="h-4 w-4 text-amber-600" />
            Warehouse Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          {warehousesLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="max-w-md">
              <Label htmlFor="warehouse-select" className="text-xs mb-2 block">Select Warehouse</Label>
              <Select 
                value={selectedWarehouseId} 
                onValueChange={setSelectedWarehouseId}
                data-testid="select-warehouse"
              >
                <SelectTrigger id="warehouse-select" className="h-10">
                  <SelectValue placeholder="Select a warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses?.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id} data-testid={`warehouse-option-${warehouse.id}`}>
                      {warehouse.name} - {warehouse.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Panel - Per Aisle */}
      {selectedWarehouseId && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-600" />
              Aisle Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            {configLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Generate list of aisles to configure */}
                {Array.from({ length: totalAisles }, (_, i) => {
                  const aisleId = `A${String(i + 1).padStart(2, '0')}`;
                  const config = aisleConfigs[aisleId] || { maxRacks, maxLevels, maxBins };
                  const isSaving = savingAisles.has(aisleId);

                  return (
                    <div key={aisleId} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-900/50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                          Aisle {aisleId}
                        </h4>
                        {isSaving && (
                          <Badge variant="outline" className="text-xs">
                            Saving...
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor={`${aisleId}-racks`} className="text-xs">Racks</Label>
                          <Select 
                            value={config.maxRacks.toString()} 
                            onValueChange={(v) => handleAisleConfigChange(aisleId, 'maxRacks', parseInt(v))}
                            data-testid={`select-${aisleId}-racks`}
                          >
                            <SelectTrigger id={`${aisleId}-racks`} className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[5, 8, 10, 12, 15, 20].map(n => (
                                <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor={`${aisleId}-levels`} className="text-xs">Levels</Label>
                          <Select 
                            value={config.maxLevels.toString()} 
                            onValueChange={(v) => handleAisleConfigChange(aisleId, 'maxLevels', parseInt(v))}
                            data-testid={`select-${aisleId}-levels`}
                          >
                            <SelectTrigger id={`${aisleId}-levels`} className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[3, 4, 5, 6, 8, 10].map(n => (
                                <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor={`${aisleId}-bins`} className="text-xs">Bins</Label>
                          <Select 
                            value={config.maxBins.toString()} 
                            onValueChange={(v) => handleAisleConfigChange(aisleId, 'maxBins', parseInt(v))}
                            data-testid={`select-${aisleId}-bins`}
                          >
                            <SelectTrigger id={`${aisleId}-bins`} className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[2, 3, 4, 5, 6, 8].map(n => (
                                <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      {selectedWarehouseId && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-amber-200 dark:border-amber-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Locations</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-400" data-testid="stat-total-locations">
                      {stats.totalLocations}
                    </p>
                  )}
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
                  {isLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400" data-testid="stat-free-locations">
                      {stats.freeLocations}
                    </p>
                  )}
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
                  {isLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400" data-testid="stat-occupied-locations">
                      {stats.occupiedLocations}
                    </p>
                  )}
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
                  {isLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-400" data-testid="stat-total-items">
                      {stats.totalItems}
                    </p>
                  )}
                </div>
                <Package className="h-8 w-8 text-purple-300 dark:text-purple-700" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Legend */}
      {selectedWarehouseId && (
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
      )}

      {/* Warehouse Grid */}
      {selectedWarehouseId && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-amber-600" />
              {warehouses?.find(w => w.id === selectedWarehouseId)?.name} - Aisle & Rack Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto" data-testid="warehouse-grid">
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
                  {gridData.map((row, aisleIndex) => {
                    const currentAisle = row[0]?.aisle || '';
                    const isZoneAisle = !currentAisle.startsWith('A');
                    const previousAisle = aisleIndex > 0 ? gridData[aisleIndex - 1][0]?.aisle : '';
                    const isFirstZoneAisle = isZoneAisle && previousAisle.startsWith('A');
                    const zoneLabel = getZoneLabel(currentAisle);
                    
                    return (
                      <div key={aisleIndex}>
                        {/* Zone Section Header */}
                        {isFirstZoneAisle && (
                          <div className="flex items-center gap-2 mt-4 mb-3">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-300 dark:via-amber-700 to-transparent" />
                            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 px-3 py-1 bg-amber-50 dark:bg-amber-950 rounded-full border border-amber-200 dark:border-amber-800">
                              {zoneLabel || 'Zone Storage Areas'}
                            </span>
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-300 dark:via-amber-700 to-transparent" />
                          </div>
                        )}
                        
                        {/* Aisle Row */}
                        <div className="flex mb-2">
                          {/* Aisle Label */}
                          <div className="w-16 flex-shrink-0 flex items-center justify-center">
                            <span className={`text-xs font-semibold ${
                              isZoneAisle 
                                ? 'text-purple-700 dark:text-purple-400' 
                                : 'text-amber-700 dark:text-amber-400'
                            }`}>
                              {currentAisle}
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
                                    data-testid={`cell-${location.aisle}-${location.rack}`}
                                  >
                                    <div className="flex flex-col items-center justify-center h-full">
                                      {location.totalQuantity > 0 && (
                                        <>
                                          <span className="text-xs font-bold" data-testid={`quantity-${location.aisle}-${location.rack}`}>
                                            {location.totalQuantity}
                                          </span>
                                          <span className="text-[10px] opacity-70" data-testid={`sku-count-${location.aisle}-${location.rack}`}>
                                            {location.productCount} SKU
                                          </span>
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
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
                  {selectedLocation.products.map((product, index) => (
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
