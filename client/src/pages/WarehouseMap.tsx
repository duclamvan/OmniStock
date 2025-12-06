import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Warehouse, Package, Layers, MapPin, Info, X, Plus, Trash2 } from "lucide-react";
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
  storageType?: 'bin' | 'pallet'; // bin = small bins, pallet = pallet positions
}

interface ZoneConfig {
  aisleCount: number;
  defaultStorageType: 'bin' | 'pallet';
}

interface WarehouseConfig {
  totalAisles: number;
  maxRacks: number;
  maxLevels: number;
  maxBins: number;
  aisleConfigs?: Record<string, AisleConfig>;
  zones?: Record<string, ZoneConfig>; // e.g., { 'A': { aisleCount: 6, defaultStorageType: 'bin' }, 'B': { aisleCount: 3, defaultStorageType: 'pallet' } }
}

interface LevelBinData {
  level: string;
  bin: string;
  quantity: number;
  products: Array<{ name: string; sku: string; quantity: number }>;
}

interface LocationStats {
  aisle: string;
  rack: string;
  totalQuantity: number;
  productCount: number;
  occupancyPercent: number;
  products: Array<{ name: string; sku: string; quantity: number; level?: string; bin?: string }>;
  levelBinBreakdown: LevelBinData[];
}

export default function WarehouseMap() {
  const { t } = useTranslation(['warehouse', 'common']);
  const { toast } = useToast();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  // Dynamic zones state: { A: { aisleCount: 6, defaultStorageType: 'bin' }, B: { aisleCount: 3, defaultStorageType: 'pallet' } }
  const [zones, setZones] = useState<Record<string, ZoneConfig>>({
    A: { aisleCount: 6, defaultStorageType: 'bin' }
  });
  const [maxRacks, setMaxRacks] = useState(10);
  const [maxLevels, setMaxLevels] = useState(5);
  const [maxBins, setMaxBins] = useState(5);
  const [aisleConfigs, setAisleConfigs] = useState<Record<string, AisleConfig>>({});
  const [selectedLocation, setSelectedLocation] = useState<LocationStats | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [expandedRack, setExpandedRack] = useState<string | null>(null); // Track which rack is expanded
  const [savingAisles, setSavingAisles] = useState<Set<string>>(new Set());
  const [savingGlobalConfig, setSavingGlobalConfig] = useState(false);
  
  // Compute total aisles from Zone A (for backward compatibility with API)
  const totalAisles = zones.A?.aisleCount || 0;

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

  // Update warehouse-level configuration mutation
  const updateWarehouseConfigMutation = useMutation({
    mutationFn: async (config: { totalAisles: number; maxRacks: number; maxLevels: number; maxBins: number; zones?: Record<string, ZoneConfig> }) => {
      const response = await fetch(`/api/warehouses/${selectedWarehouseId}/map-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!response.ok) {
        throw new Error('Failed to save warehouse configuration');
      }
      return response.json();
    },
    onSuccess: () => {
      setSavingGlobalConfig(false);
      queryClient.invalidateQueries({ queryKey: ['/api/warehouses', selectedWarehouseId, 'map-config'] });
    },
    onError: (error) => {
      console.error('Error saving warehouse configuration:', error);
      setSavingGlobalConfig(false);
      toast({
        title: t('common:error'),
        description: t('warehouse:failedToSaveWarehouseConfig'),
        variant: "destructive",
      });
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
        title: t('common:error'),
        description: t('warehouse:failedToSaveAisleConfig', { aisleId: variables.aisleId }),
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


  // Update local state when config is fetched
  useEffect(() => {
    if (warehouseConfig) {
      // Load zones from config, with fallback to legacy format
      if (warehouseConfig.zones && Object.keys(warehouseConfig.zones).length > 0) {
        setZones(warehouseConfig.zones);
      } else {
        // Legacy format: convert totalAisles to Zone A
        const legacyZones: Record<string, ZoneConfig> = {
          A: { aisleCount: warehouseConfig.totalAisles, defaultStorageType: 'bin' }
        };
        setZones(legacyZones);
      }
      setMaxRacks(warehouseConfig.maxRacks);
      setMaxLevels(warehouseConfig.maxLevels);
      setMaxBins(warehouseConfig.maxBins);
      setAisleConfigs(warehouseConfig.aisleConfigs || {});
    }
  }, [warehouseConfig]);

  // Instant save function for warehouse-level configuration
  const instantGlobalConfigSave = useCallback((config: { 
    totalAisles: number; 
    maxRacks: number; 
    maxLevels: number; 
    maxBins: number;
    zones?: Record<string, ZoneConfig>;
  }) => {
    // Mark as saving and save immediately
    setSavingGlobalConfig(true);
    updateWarehouseConfigMutation.mutate(config);
  }, [updateWarehouseConfigMutation]);

  // Instant save function for per-aisle configuration
  const instantAisleSave = useCallback((aisleId: string, config: AisleConfig) => {
    // Mark aisle as saving and save immediately
    setSavingAisles(prev => new Set(prev).add(aisleId));
    updateAisleConfigMutation.mutate({ aisleId, config });
  }, [updateAisleConfigMutation]);

  // Handle zone configuration changes (aisle count, storage type)
  const handleZoneChange = useCallback((zoneId: string, field: 'aisleCount' | 'defaultStorageType', value: number | string) => {
    setZones(prev => {
      const updated = { 
        ...prev, 
        [zoneId]: { 
          ...prev[zoneId], 
          [field]: value 
        } 
      };
      // Calculate total aisles for Zone A (backward compatibility)
      const totalAislesCount = updated.A?.aisleCount || 0;
      instantGlobalConfigSave({ totalAisles: totalAislesCount, maxRacks, maxLevels, maxBins, zones: updated });
      return updated;
    });
  }, [maxRacks, maxLevels, maxBins, instantGlobalConfigSave]);

  // Add a new zone
  const handleAddZone = useCallback(() => {
    setZones(prev => {
      // Find next available zone letter
      const usedLetters = Object.keys(prev);
      const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      const nextLetter = allLetters.find(l => !usedLetters.includes(l));
      if (!nextLetter) {
        toast({ title: t('common:error'), description: 'Maximum zones reached', variant: 'destructive' });
        return prev;
      }
      const updated = { 
        ...prev, 
        [nextLetter]: { aisleCount: 1, defaultStorageType: 'bin' as const }
      };
      // Calculate total aisles for Zone A (backward compatibility)
      const totalAislesCount = updated.A?.aisleCount || 0;
      instantGlobalConfigSave({ totalAisles: totalAislesCount, maxRacks, maxLevels, maxBins, zones: updated });
      return updated;
    });
  }, [maxRacks, maxLevels, maxBins, instantGlobalConfigSave, toast, t]);

  // Delete a zone
  const handleDeleteZone = useCallback((zoneId: string) => {
    if (zoneId === 'A') {
      toast({ title: t('common:error'), description: 'Cannot delete Zone A', variant: 'destructive' });
      return;
    }
    setZones(prev => {
      const { [zoneId]: removed, ...remaining } = prev;
      // Calculate total aisles for Zone A (backward compatibility)
      const totalAislesCount = remaining.A?.aisleCount || 0;
      instantGlobalConfigSave({ totalAisles: totalAislesCount, maxRacks, maxLevels, maxBins, zones: remaining });
      return remaining;
    });
  }, [maxRacks, maxLevels, maxBins, instantGlobalConfigSave, toast, t]);

  // Handle aisle configuration changes
  const handleAisleConfigChange = useCallback((aisleId: string, field: keyof AisleConfig, value: number | string) => {
    setAisleConfigs(prev => {
      // Get zone letter from aisle ID (e.g., "A01" -> "A", "B02" -> "B")
      const zoneLetter = aisleId.charAt(0);
      // Use zone's default storage type from zones state, fallback to 'bin'
      const zoneDefaultStorageType = zones[zoneLetter]?.defaultStorageType || 'bin';
      const current = prev[aisleId] || { maxRacks, maxLevels, maxBins, storageType: zoneDefaultStorageType };
      const updated = { ...current, [field]: value };
      
      // Save immediately
      instantAisleSave(aisleId, updated);
      
      return { ...prev, [aisleId]: updated };
    });
  }, [maxRacks, maxLevels, maxBins, zones, instantAisleSave]);

  // Parse location code to extract aisle, rack, level, and bin
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
    
    // Standard format: Find aisle (starts with 'A'), rack (starts with 'R'), level (starts with 'L'), bin (starts with 'B')
    const aislePart = parts.find(p => p.startsWith('A'));
    const rackPart = parts.find(p => p.startsWith('R'));
    const levelPart = parts.find(p => p.startsWith('L'));
    const binPart = parts.find(p => p.startsWith('B') && p !== aislePart);
    
    if (aislePart && rackPart) {
      return {
        aisle: aislePart,
        rack: rackPart,
        level: levelPart || 'L01',
        bin: binPart || 'B1',
      };
    }
    
    // Zone-based format: Find zone prefix (B for pallets, C for office, etc.)
    const zonePart = parts.find(p => /^[B-Z]\d{2}/.test(p));
    const palletPart = parts.find(p => p.startsWith('P'));
    
    if (zonePart) {
      // Map zone to virtual "aisle" and "rack" for display
      // E.g., B03 → Aisle "B03", Rack "R01"
      // This allows zone-based locations to appear on the map
      return {
        aisle: zonePart,
        rack: 'R01', // Virtual rack for zone-based locations
        level: palletPart || 'L01',
        bin: 'B1',
      };
    }
    
    // Fallback: unparseable location codes
    console.warn(`Could not parse location code: ${locationCode} - location will not be displayed on map`);
    return null;
  };

  // Helper function to get zone label from dynamic zones
  const getZoneLabel = (aisleCode: string): string | null => {
    const zoneLetter = aisleCode.charAt(0);
    if (zoneLetter === 'A') return null; // Zone A is the default, no special label
    const zoneConfig = zones[zoneLetter];
    if (!zoneConfig) return null;
    const storageType = zoneConfig.defaultStorageType === 'pallet' ? 'Pallets' : 'Bins';
    return `Zone ${zoneLetter} - ${storageType}`;
  };
  
  // Helper function to check if a zone uses pallet storage
  const isZonePalletStorage = (aisleCode: string): boolean => {
    const zoneLetter = aisleCode.charAt(0);
    return zones[zoneLetter]?.defaultStorageType === 'pallet';
  };

  // Generate grid data from product locations
  const gridData = useMemo(() => {
    if (!productLocations) return [];

    const locationMap = new Map<string, {
      totalQuantity: number;
      productCount: number;
      products: Array<{ name: string; sku: string; quantity: number; level?: string; bin?: string }>;
      levelBinMap: Map<string, { quantity: number; products: Array<{ name: string; sku: string; quantity: number }> }>;
    }>();

    // Aggregate by aisle+rack with level/bin breakdown
    productLocations.forEach((location) => {
      const parsed = parseLocationCode(location.locationCode);
      if (!parsed) return;

      const key = `${parsed.aisle}-${parsed.rack}`;
      const existing = locationMap.get(key) || {
        totalQuantity: 0,
        productCount: 0,
        products: [] as Array<{ name: string; sku: string; quantity: number; level?: string; bin?: string }>,
        levelBinMap: new Map<string, { quantity: number; products: Array<{ name: string; sku: string; quantity: number }> }>(),
      };

      existing.totalQuantity += location.quantity;
      existing.productCount += 1;
      existing.products.push({
        name: location.productName,
        sku: location.productSku,
        quantity: location.quantity,
        level: parsed.level,
        bin: parsed.bin,
      });

      // Track level/bin breakdown
      const levelBinKey = `${parsed.level}-${parsed.bin}`;
      const levelBinData = existing.levelBinMap.get(levelBinKey) || { quantity: 0, products: [] };
      levelBinData.quantity += location.quantity;
      levelBinData.products.push({
        name: location.productName,
        sku: location.productSku,
        quantity: location.quantity,
      });
      existing.levelBinMap.set(levelBinKey, levelBinData);

      locationMap.set(key, existing);
    });

    // Extract all unique aisle codes from locationMap
    const discoveredAisles = new Set<string>();
    locationMap.forEach((_, key) => {
      const [aisle] = key.split('-');
      discoveredAisles.add(aisle);
    });

    // Build list of aisles from all configured zones
    const configuredAisles: string[] = [];
    const sortedZoneLetters = Object.keys(zones).sort();
    
    sortedZoneLetters.forEach(zoneLetter => {
      const zoneConfig = zones[zoneLetter];
      for (let a = 1; a <= zoneConfig.aisleCount; a++) {
        configuredAisles.push(`${zoneLetter}${String(a).padStart(2, '0')}`);
      }
    });

    // Extract other zone aisles (not in configured zones) from discovered locations and sort alphabetically
    const configuredZoneLetters = new Set(sortedZoneLetters);
    const otherZoneAisles = Array.from(discoveredAisles)
      .filter(aisle => !configuredZoneLetters.has(aisle.charAt(0)))
      .sort();

    // Combine: configured zone aisles first, then other discovered zone aisles
    const allAislesToDisplay = [...configuredAisles, ...otherZoneAisles];

    // Build grid for all aisles
    const grid: LocationStats[][] = [];
    
    allAislesToDisplay.forEach(aisleCode => {
      const row: LocationStats[] = [];
      
      // Use per-aisle config if available, otherwise use zone defaults
      const zoneLetter = aisleCode.charAt(0);
      const zoneConfig = zones[zoneLetter];
      const isZonePallet = zoneConfig?.defaultStorageType === 'pallet';
      const aisleConfig = aisleConfigs[aisleCode] || { 
        maxRacks, 
        maxLevels: isZonePallet ? 2 : maxLevels, 
        maxBins: isZonePallet ? 2 : maxBins 
      };
      
      for (let r = 1; r <= aisleConfig.maxRacks; r++) {
        const rackCode = `R${String(r).padStart(2, '0')}`;
        const key = `${aisleCode}-${rackCode}`;
        const data = locationMap.get(key);

        const maxCapacity = aisleConfig.maxLevels * aisleConfig.maxBins * 100; // Assume 100 units per bin max
        const totalQuantity = data?.totalQuantity || 0;
        const occupancyPercent = maxCapacity > 0 ? (totalQuantity / maxCapacity) * 100 : 0;

        // Convert level/bin map to array
        const levelBinBreakdown: LevelBinData[] = [];
        if (data?.levelBinMap) {
          data.levelBinMap.forEach((lbData, lbKey) => {
            const [level, bin] = lbKey.split('-');
            levelBinBreakdown.push({
              level,
              bin,
              quantity: lbData.quantity,
              products: lbData.products,
            });
          });
        }

        row.push({
          aisle: aisleCode,
          rack: rackCode,
          totalQuantity,
          productCount: data?.productCount || 0,
          occupancyPercent: Math.min(occupancyPercent, 100),
          products: data?.products || [],
          levelBinBreakdown: levelBinBreakdown.sort((a, b) => {
            if (a.level !== b.level) return a.level.localeCompare(b.level);
            return a.bin.localeCompare(b.bin);
          }),
        });
      }

      grid.push(row);
    });

    return grid;
  }, [productLocations, zones, maxRacks, maxLevels, maxBins, aisleConfigs]);

  // Get color based on occupancy
  const getOccupancyColor = (percent: number) => {
    if (percent === 0) return 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    if (percent < 25) return 'bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-800 text-green-900 dark:text-green-100';
    if (percent < 50) return 'bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-100';
    if (percent < 75) return 'bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100';
    return 'bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-800 text-red-900 dark:text-red-100';
  };

  const handleCellClick = (location: LocationStats) => {
    const rackKey = `${location.aisle}-${location.rack}`;
    // Toggle expansion - if already expanded, collapse; if different or collapsed, expand
    if (expandedRack === rackKey) {
      setExpandedRack(null);
    } else {
      setExpandedRack(rackKey);
      setSelectedLocation(location);
    }
  };

  const handleOpenDetails = (location: LocationStats) => {
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
    <div className="container mx-auto p-3 md:p-4 space-y-3 md:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center shrink-0">
            <Warehouse className="h-5 w-5 md:h-6 md:w-6 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-2xl font-bold text-amber-900 dark:text-amber-100 truncate">{t('warehouse:warehouseSpaceMap')}</h1>
            <p className="text-xs md:text-sm text-muted-foreground">{t('warehouse:warehouseMapSubtitle')}</p>
          </div>
        </div>
      </div>

      {/* Warehouse Selection */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader className="pb-2 md:pb-3 p-3 md:p-6">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <Warehouse className="h-4 w-4 text-amber-600" />
            {t('warehouse:warehouseSelection')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          {warehousesLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="max-w-md">
              <Label htmlFor="warehouse-select" className="text-xs mb-2 block">{t('warehouse:selectWarehouseLabel')}</Label>
              <Select 
                value={selectedWarehouseId} 
                onValueChange={setSelectedWarehouseId}
                data-testid="select-warehouse"
              >
                <SelectTrigger id="warehouse-select" className="h-10">
                  <SelectValue placeholder={t('warehouse:selectWarehousePlaceholder')} />
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
          <CardHeader className="pb-2 md:pb-3 p-3 md:p-6">
            <CardTitle className="text-sm md:text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-600" />
                {t('warehouse:aisleConfiguration')}
              </div>
              {savingGlobalConfig && (
                <Badge variant="outline" className="text-xs">
                  {t('warehouse:saving')}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            {configLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Dynamic Zone Configuration */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      {t('warehouse:zones')}
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddZone}
                      className="h-7 text-xs gap-1"
                      data-testid="btn-add-zone"
                    >
                      <Plus className="h-3 w-3" />
                      {t('warehouse:addZone')}
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(zones).sort(([a], [b]) => a.localeCompare(b)).map(([zoneId, zoneConfig]) => {
                      const isPallet = zoneConfig.defaultStorageType === 'pallet';
                      const borderColor = isPallet 
                        ? 'border-purple-300 dark:border-purple-700' 
                        : 'border-amber-300 dark:border-amber-700';
                      const bgColor = isPallet
                        ? 'bg-purple-50 dark:bg-purple-950/30'
                        : 'bg-amber-50 dark:bg-amber-950/30';
                      const textColor = isPallet
                        ? 'text-purple-900 dark:text-purple-100'
                        : 'text-amber-900 dark:text-amber-100';
                      
                      return (
                        <div 
                          key={zoneId} 
                          className={`border-2 ${borderColor} rounded-lg p-3 ${bgColor}`}
                          data-testid={`zone-card-${zoneId}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{isPallet ? '🛒' : '📦'}</span>
                              <span className={`text-sm font-semibold ${textColor}`}>
                                Zone {zoneId}
                              </span>
                            </div>
                            {zoneId !== 'A' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteZone(zoneId)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
                                data-testid={`btn-delete-zone-${zoneId}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            {/* Storage Type Toggle */}
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground">Type:</Label>
                              <button
                                type="button"
                                onClick={() => handleZoneChange(zoneId, 'defaultStorageType', isPallet ? 'bin' : 'pallet')}
                                className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                                  isPallet 
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' 
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                                }`}
                                data-testid={`toggle-zone-${zoneId}-type`}
                              >
                                {isPallet ? '🛒 Pallet' : '📦 Bin'}
                              </button>
                            </div>
                            
                            {/* Aisle Count */}
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground">{t('warehouse:aisles')}:</Label>
                              <Select 
                                value={zoneConfig.aisleCount.toString()} 
                                onValueChange={(v) => handleZoneChange(zoneId, 'aisleCount', parseInt(v))}
                                data-testid={`select-zone-${zoneId}-aisles`}
                              >
                                <SelectTrigger className="h-8 w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30].map(n => (
                                    <SelectItem key={n} value={n.toString()}>{n === 0 && zoneId !== 'A' ? 'None' : n}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <p className="text-[10px] text-muted-foreground">
                              {zoneId}01, {zoneId}02... for {isPallet ? 'pallet' : 'bin'} storage
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Per-Aisle Configuration - All Zones */}
                {Object.entries(zones).sort(([a], [b]) => a.localeCompare(b)).map(([zoneId, zoneConfig]) => {
                  if (zoneConfig.aisleCount === 0) return null;
                  
                  const isZonePallet = zoneConfig.defaultStorageType === 'pallet';
                  const zoneHeaderColor = isZonePallet 
                    ? 'text-purple-700 dark:text-purple-400' 
                    : 'text-amber-700 dark:text-amber-400';
                  const zoneBorderColor = isZonePallet
                    ? 'border-purple-200 dark:border-purple-700'
                    : 'border-slate-200 dark:border-slate-700';
                  const zoneBgColor = isZonePallet
                    ? 'bg-purple-50 dark:bg-purple-900/30'
                    : 'bg-slate-50 dark:bg-slate-900/50';
                  
                  return (
                    <div key={`zone-aisles-${zoneId}`} className="space-y-2">
                      <h4 className={`text-xs font-semibold ${zoneHeaderColor} flex items-center gap-2`}>
                        {isZonePallet ? '🛒' : '📦'} Zone {zoneId} {t('warehouse:aisles')} ({isZonePallet ? 'Pallets' : 'Bins'})
                      </h4>
                      {Array.from({ length: zoneConfig.aisleCount }, (_, i) => {
                        const aisleId = `${zoneId}${String(i + 1).padStart(2, '0')}`;
                        const config = aisleConfigs[aisleId] || { 
                          maxRacks, 
                          maxLevels: isZonePallet ? 2 : maxLevels, 
                          maxBins: isZonePallet ? 2 : maxBins, 
                          storageType: zoneConfig.defaultStorageType 
                        };
                        const isSaving = savingAisles.has(aisleId);
                        const isPallet = config.storageType === 'pallet';

                        return (
                          <div key={aisleId} className={`border ${zoneBorderColor} rounded-lg p-2 md:p-3 ${zoneBgColor}`}>
                            <div className="flex items-center justify-between mb-2 md:mb-3">
                              <div className="flex items-center gap-2">
                                <h4 className={`text-xs md:text-sm font-semibold ${zoneHeaderColor}`}>
                                  {t('warehouse:aisleLabel', { aisleId })}
                                </h4>
                                {/* Storage Type Toggle */}
                                <button
                                  type="button"
                                  onClick={() => handleAisleConfigChange(aisleId, 'storageType', isPallet ? 'bin' : 'pallet')}
                                  className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                                    isPallet 
                                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' 
                                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                                  }`}
                                  data-testid={`toggle-${aisleId}-storage-type`}
                                >
                                  {isPallet ? '🛒 Pallet' : '📦 Bin'}
                                </button>
                              </div>
                              {isSaving && (
                                <Badge variant="outline" className="text-xs">
                                  {t('warehouse:saving')}
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-2 md:gap-3">
                              <div>
                                <Label htmlFor={`${aisleId}-racks`} className="text-xs">{t('warehouse:racks')}</Label>
                                <Select 
                                  value={config.maxRacks.toString()} 
                                  onValueChange={(v) => handleAisleConfigChange(aisleId, 'maxRacks', parseInt(v))}
                                  data-testid={`select-${aisleId}-racks`}
                                >
                                  <SelectTrigger id={`${aisleId}-racks`} className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 50 }, (_, i) => i + 1).map(n => (
                                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor={`${aisleId}-levels`} className="text-xs">{t('warehouse:levels')}</Label>
                                <Select 
                                  value={config.maxLevels.toString()} 
                                  onValueChange={(v) => handleAisleConfigChange(aisleId, 'maxLevels', parseInt(v))}
                                  data-testid={`select-${aisleId}-levels`}
                                >
                                  <SelectTrigger id={`${aisleId}-levels`} className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label htmlFor={`${aisleId}-bins`} className="text-xs">
                                  {isPallet ? 'Pallets' : t('warehouse:bins')}
                                </Label>
                                <Select 
                                  value={config.maxBins.toString()} 
                                  onValueChange={(v) => handleAisleConfigChange(aisleId, 'maxBins', parseInt(v))}
                                  data-testid={`select-${aisleId}-bins`}
                                >
                                  <SelectTrigger id={`${aisleId}-bins`} className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(isPallet ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).map(n => (
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
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      {selectedWarehouseId && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <Card className="border-amber-200 dark:border-amber-800">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t('warehouse:totalLocations')}</p>
                  {isLoading ? (
                    <Skeleton className="h-6 md:h-8 w-12 md:w-16 mt-1" />
                  ) : (
                    <p className="text-xl md:text-2xl font-bold text-amber-700 dark:text-amber-400 truncate" data-testid="stat-total-locations">
                      {stats.totalLocations}
                    </p>
                  )}
                </div>
                <MapPin className="h-6 w-6 md:h-8 md:w-8 text-amber-300 dark:text-amber-700 shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t('warehouse:freeLocations')}</p>
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
                  <p className="text-xs text-muted-foreground">{t('warehouse:occupied')}</p>
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
                  <p className="text-xs text-muted-foreground">{t('warehouse:totalItems')}</p>
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
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-3 md:gap-6 flex-wrap">
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
          <CardHeader className="pb-2 md:pb-3 p-3 md:p-6">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-amber-600" />
              <span className="truncate">{warehouses?.find(w => w.id === selectedWarehouseId)?.name} - Aisle & Rack Map</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
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
                    const currentZoneLetter = currentAisle.charAt(0);
                    const isPalletZone = isZonePalletStorage(currentAisle);
                    const previousAisle = aisleIndex > 0 ? gridData[aisleIndex - 1][0]?.aisle : '';
                    const previousZoneLetter = previousAisle.charAt(0);
                    const isNewZone = currentZoneLetter !== previousZoneLetter && currentZoneLetter !== 'A';
                    const zoneLabel = getZoneLabel(currentAisle);
                    
                    return (
                      <div key={aisleIndex}>
                        {/* Zone Section Header */}
                        {isNewZone && zoneLabel && (
                          <div className="flex items-center gap-2 mt-4 mb-3">
                            <div className={`h-px flex-1 bg-gradient-to-r from-transparent ${isPalletZone ? 'via-purple-300 dark:via-purple-700' : 'via-amber-300 dark:via-amber-700'} to-transparent`} />
                            <span className={`text-xs font-semibold ${isPalletZone ? 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800' : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800'} px-3 py-1 rounded-full border`}>
                              {zoneLabel}
                            </span>
                            <div className={`h-px flex-1 bg-gradient-to-r from-transparent ${isPalletZone ? 'via-purple-300 dark:via-purple-700' : 'via-amber-300 dark:via-amber-700'} to-transparent`} />
                          </div>
                        )}
                        
                        {/* Aisle Row */}
                        <div className="flex mb-2">
                          {/* Aisle Label */}
                          <div className="w-16 flex-shrink-0 flex items-center justify-center">
                            <span className={`text-xs font-semibold ${
                              isPalletZone 
                                ? 'text-purple-700 dark:text-purple-400' 
                                : 'text-amber-700 dark:text-amber-400'
                            }`}>
                              {currentAisle}
                            </span>
                          </div>

                          {/* Rack Cells */}
                          {row.map((location, rackIndex) => {
                            const rackKey = `${location.aisle}-${location.rack}`;
                            const isExpanded = expandedRack === rackKey;
                            
                            return (
                              <TooltipProvider key={rackIndex}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => handleCellClick(location)}
                                      className={`flex-1 min-w-[60px] h-14 rounded border-2 transition-all ${getOccupancyColor(location.occupancyPercent)} ${
                                        isExpanded 
                                          ? 'ring-2 ring-amber-500 dark:ring-amber-400 ring-offset-2 dark:ring-offset-slate-900' 
                                          : ''
                                      }`}
                                      data-testid={`cell-${location.aisle}-${location.rack}`}
                                    >
                                      <div className="flex flex-col items-center justify-center h-full">
                                        {location.totalQuantity > 0 ? (
                                          <>
                                            <span className="text-xs font-bold" data-testid={`quantity-${location.aisle}-${location.rack}`}>
                                              {location.totalQuantity}
                                            </span>
                                            <span className="text-[10px] opacity-70" data-testid={`sku-count-${location.aisle}-${location.rack}`}>
                                              {location.productCount} SKU
                                            </span>
                                          </>
                                        ) : (
                                          <span className="text-[10px] text-muted-foreground">-</span>
                                        )}
                                      </div>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs">
                                      <p className="font-semibold">{location.aisle}-{location.rack}</p>
                                      <p>{t('warehouse:items')}: {location.totalQuantity}</p>
                                      <p>{t('warehouse:productsSku')}: {location.productCount}</p>
                                      <p>{t('warehouse:occupancy')}: {location.occupancyPercent.toFixed(1)}%</p>
                                      <p className="text-muted-foreground mt-1">{t('warehouse:clickToExpand')}</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })}
                        </div>

                        {/* Expanded Level/Bin Grid (shown inline when a rack in this aisle is expanded) */}
                        {row.map((location, rackIndex) => {
                          const rackKey = `${location.aisle}-${location.rack}`;
                          if (expandedRack !== rackKey) return null;

                          const aisleZoneLetter = location.aisle.charAt(0);
                          const zoneDefaultType = zones[aisleZoneLetter]?.defaultStorageType || 'bin';
                          const isZonePallet = zoneDefaultType === 'pallet';
                          const aisleConfig = aisleConfigs[location.aisle] || { 
                            maxRacks, 
                            maxLevels: isZonePallet ? 2 : maxLevels, 
                            maxBins: isZonePallet ? 2 : maxBins 
                          };
                          const levels = Array.from({ length: aisleConfig.maxLevels }, (_, i) => `L${String(i + 1).padStart(2, '0')}`);
                          const bins = Array.from({ length: aisleConfig.maxBins }, (_, i) => `B${i + 1}`);
                          const dataMap = new Map(location.levelBinBreakdown.map(lb => [`${lb.level}-${lb.bin}`, lb]));

                          return (
                            <div key={`expanded-${rackKey}`} className="ml-16 mb-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-amber-200 dark:border-amber-800 animate-in slide-in-from-top-2 duration-200">
                              {/* Expanded Header */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Layers className="h-4 w-4 text-amber-600" />
                                  <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                                    {location.aisle}-{location.rack} • {t('warehouse:levelBinBreakdown')}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {location.totalQuantity} {t('warehouse:items')} • {location.productCount} SKU
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => handleOpenDetails(location)}
                                    data-testid={`btn-details-${rackKey}`}
                                  >
                                    <Info className="h-3 w-3 mr-1" />
                                    {t('warehouse:viewProducts')}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => setExpandedRack(null)}
                                    data-testid={`btn-close-${rackKey}`}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              {/* Level/Bin Grid */}
                              <div className="space-y-1.5">
                                {/* Bin Headers */}
                                <div className="flex items-center gap-1">
                                  <div className="w-10 text-[10px] text-muted-foreground font-medium text-right pr-1">
                                    {t('warehouse:level')}
                                  </div>
                                  {bins.map(bin => (
                                    <div key={bin} className="flex-1 min-w-[40px] text-center text-[10px] font-medium text-muted-foreground">
                                      {bin}
                                    </div>
                                  ))}
                                </div>
                                
                                {/* Level Rows (reversed so L01 is at bottom like real shelving) */}
                                {[...levels].reverse().map(level => (
                                  <div key={level} className="flex items-center gap-1">
                                    <div className="w-10 text-[10px] font-semibold text-amber-700 dark:text-amber-400 text-right pr-1">
                                      {level}
                                    </div>
                                    {bins.map(bin => {
                                      const data = dataMap.get(`${level}-${bin}`);
                                      const hasItems = data && data.quantity > 0;
                                      return (
                                        <TooltipProvider key={`${level}-${bin}`}>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div 
                                                className={`flex-1 min-w-[40px] h-8 rounded border flex items-center justify-center cursor-pointer transition-colors ${
                                                  hasItems 
                                                    ? 'bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 hover:bg-amber-200 dark:hover:bg-amber-900' 
                                                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                }`}
                                                data-testid={`inline-bin-${location.aisle}-${location.rack}-${level}-${bin}`}
                                              >
                                                {hasItems ? (
                                                  <span className="text-xs font-bold">{data.quantity}</span>
                                                ) : (
                                                  <span className="text-[9px]">-</span>
                                                )}
                                              </div>
                                            </TooltipTrigger>
                                            {hasItems && (
                                              <TooltipContent side="top" className="max-w-xs">
                                                <div className="text-xs space-y-1">
                                                  <p className="font-semibold">{location.aisle}-{location.rack}-{level}-{bin}</p>
                                                  <p>{t('warehouse:items')}: {data.quantity}</p>
                                                  {data.products.slice(0, 3).map((p, i) => (
                                                    <p key={i} className="text-muted-foreground truncate">{p.sku}: {p.quantity}</p>
                                                  ))}
                                                  {data.products.length > 3 && (
                                                    <p className="text-muted-foreground">+{data.products.length - 3} {t('warehouse:more')}</p>
                                                  )}
                                                </div>
                                              </TooltipContent>
                                            )}
                                          </Tooltip>
                                        </TooltipProvider>
                                      );
                                    })}
                                  </div>
                                ))}
                              </div>

                              {/* Quick Legend */}
                              <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-700"></div>
                                  <span>{t('warehouse:hasInventory')}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-3 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"></div>
                                  <span>{t('warehouse:emptyBin')}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
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
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-amber-600" />
              {t('warehouse:locationDetails')}
            </SheetTitle>
          </SheetHeader>

          {selectedLocation && (
            <div className="mt-6 space-y-4">
              {/* Location Info */}
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('warehouse:location')}</span>
                    <Badge variant="outline" className="font-mono text-base px-3 py-1">
                      {selectedLocation.aisle}-{selectedLocation.rack}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('warehouse:totalItems')}</span>
                    <span className="font-semibold">{selectedLocation.totalQuantity}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('warehouse:productCount')}</span>
                    <span className="font-semibold">{selectedLocation.productCount} SKUs</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('warehouse:occupancy')}</span>
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

              {/* Level & Bin Grid Visual */}
              {selectedLocation.levelBinBreakdown.length > 0 && (
                <Card>
                  <CardHeader className="pb-2 p-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Layers className="h-4 w-4 text-amber-600" />
                      {t('warehouse:levelBinBreakdown')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {/* Get unique levels and bins */}
                    {(() => {
                      const levels = Array.from(new Set(selectedLocation.levelBinBreakdown.map(lb => lb.level))).sort();
                      const bins = Array.from(new Set(selectedLocation.levelBinBreakdown.map(lb => lb.bin))).sort();
                      const dataMap = new Map(selectedLocation.levelBinBreakdown.map(lb => [`${lb.level}-${lb.bin}`, lb]));
                      
                      return (
                        <div className="space-y-2">
                          {/* Bin Headers */}
                          <div className="flex items-center gap-1">
                            <div className="w-12 text-xs text-muted-foreground font-medium">{t('warehouse:level')}</div>
                            {bins.map(bin => (
                              <div key={bin} className="flex-1 text-center text-xs font-medium text-muted-foreground">
                                {bin}
                              </div>
                            ))}
                          </div>
                          
                          {/* Level Rows (reversed so L01 is at bottom like real shelving) */}
                          {[...levels].reverse().map(level => (
                            <div key={level} className="flex items-center gap-1">
                              <div className="w-12 text-xs font-semibold text-amber-700 dark:text-amber-400">
                                {level}
                              </div>
                              {bins.map(bin => {
                                const data = dataMap.get(`${level}-${bin}`);
                                const hasItems = data && data.quantity > 0;
                                return (
                                  <TooltipProvider key={`${level}-${bin}`}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div 
                                          className={`flex-1 h-10 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
                                            hasItems 
                                              ? 'bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100' 
                                              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-600'
                                          }`}
                                          data-testid={`bin-${level}-${bin}`}
                                        >
                                          {hasItems ? (
                                            <span className="text-xs font-bold">{data.quantity}</span>
                                          ) : (
                                            <span className="text-[10px]">-</span>
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      {hasItems && (
                                        <TooltipContent side="top" className="max-w-xs">
                                          <div className="text-xs space-y-1">
                                            <p className="font-semibold">{selectedLocation.aisle}-{selectedLocation.rack}-{level}-{bin}</p>
                                            <p>{t('warehouse:items')}: {data.quantity}</p>
                                            {data.products.slice(0, 3).map((p, i) => (
                                              <p key={i} className="text-muted-foreground truncate">{p.sku}: {p.quantity}</p>
                                            ))}
                                            {data.products.length > 3 && (
                                              <p className="text-muted-foreground">+{data.products.length - 3} {t('warehouse:more')}</p>
                                            )}
                                          </div>
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Products in this location */}
              <div>
                <h3 className="text-sm font-semibold mb-3">{t('warehouse:productsStored')}</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedLocation.products.map((product, index) => (
                    <Card key={index}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                            {product.level && product.bin && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                                {product.level}-{product.bin}
                              </p>
                            )}
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
                      <p className="text-sm">{t('warehouse:noProductsStored')}</p>
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
