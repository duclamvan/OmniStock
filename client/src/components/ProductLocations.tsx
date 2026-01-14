import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus,
  Edit,
  Trash2,
  Star,
  MoreVertical,
  MapPin,
  Package,
  MoveRight,
  ArrowUpDown,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getLocationTypeIcon,
  getLocationTypeTextColor,
  getLocationTypeLabel,
  formatLocationCode,
  calculateTotalQuantity,
  getLocationSummary,
  parseLocationCodeToSegments,
  LocationType,
} from "@/lib/warehouseHelpers";
import WarehouseLocationSelector from "./WarehouseLocationSelector";

interface ProductLocation {
  id: string;
  productId: string;
  locationType: LocationType;
  locationCode: string;
  quantity: number;
  isPrimary: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProductLocationsProps {
  productId: string;
  productName?: string;
  readOnly?: boolean;
  embedded?: boolean;
}

// Visual location code display component
function LocationCodeDisplay({ code, quantity }: { code: string; quantity?: number }) {
  const segments = parseLocationCodeToSegments(code);
  
  if (segments.length === 0) {
    return <span className="font-mono text-sm">{code}</span>;
  }
  
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {segments.map((segment, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <span className="text-slate-400 dark:text-slate-500 mx-0.5">›</span>}
          <div 
            className={`px-1.5 py-0.5 rounded text-xs font-medium ${segment.bgColor} ${segment.color}`}
            title={segment.tooltip}
          >
            <span className="opacity-60 mr-0.5">{segment.label}:</span>
            <span className="font-semibold">{segment.value}</span>
          </div>
        </div>
      ))}
      {quantity !== undefined && (
        <div className={`ml-1.5 px-2 py-0.5 rounded text-sm font-bold ${
          quantity === 0 
            ? 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200' 
            : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200'
        }`} title="Quantity at this location">
          ×{quantity}
        </div>
      )}
    </div>
  );
}

export default function ProductLocations({
  productId,
  productName = "Product",
  readOnly = false,
  embedded = false,
}: ProductLocationsProps) {
  const { toast } = useToast();
  const { t } = useTranslation('common');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editLocation, setEditLocation] = useState<ProductLocation | null>(null);
  const [deleteLocation, setDeleteLocation] = useState<ProductLocation | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveFromLocation, setMoveFromLocation] = useState<ProductLocation | null>(null);
  const [locationsExpanded, setLocationsExpanded] = useState(false);
  
  // Bulk selection state
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Form states for add/edit
  const [locationType, setLocationType] = useState<LocationType>("warehouse");
  const [locationCode, setLocationCode] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [notes, setNotes] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  // Move inventory states
  const [moveToLocation, setMoveToLocation] = useState<string>("");
  const [moveQuantity, setMoveQuantity] = useState(0);

  // Fetch product data to get main quantity
  const { data: product } = useQuery<any>({
    queryKey: [`/api/products`, productId],
    enabled: !!productId,
  });

  // Fetch product locations
  const { data: rawLocations = [], isLoading } = useQuery<ProductLocation[]>({
    queryKey: [`/api/products/${productId}/locations`],
    enabled: !!productId,
  });

  // Fetch product variants to calculate location quantities
  const { data: variants = [] } = useQuery<Array<{
    id: string;
    name: string;
    quantity: number;
    locationCode?: string | null;
  }>>({
    queryKey: [`/api/products/${productId}/variants`],
    enabled: !!productId,
  });

  // Check if product has variants
  const hasVariants = variants.length > 0;

  // Calculate variant quantities per location code
  const variantQuantitiesByLocation = hasVariants 
    ? variants.reduce((acc, variant) => {
        const locCode = variant.locationCode || '';
        if (locCode) {
          acc[locCode] = (acc[locCode] || 0) + (variant.quantity || 0);
        }
        return acc;
      }, {} as Record<string, number>)
    : {};

  // Sort locations alphabetically by locationCode
  const locations = [...rawLocations].sort((a, b) => 
    a.locationCode.localeCompare(b.locationCode, undefined, { numeric: true, sensitivity: 'base' })
  );

  // Get display quantity for a location
  // For variant-specific locations (with variantId), show actual location quantity
  // For aggregate locations without variantId, use variant quantity sum if available
  const getDisplayQuantity = (location: ProductLocation): number => {
    // If this location is tied to a specific variant, use the actual location quantity
    if ((location as any).variantId) {
      return location.quantity;
    }
    // For non-variant-specific locations with variants product, try variant aggregation
    if (hasVariants) {
      const variantQty = variantQuantitiesByLocation[location.locationCode];
      // Use location quantity if it exists, otherwise use variant aggregation
      return location.quantity > 0 ? location.quantity : (variantQty || 0);
    }
    return location.quantity;
  };

  // Add location mutation
  const addLocationMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', `/api/products/${productId}/locations`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/locations`] });
      toast({
        title: t('common:success'),
        description: t('common:locationAddedSuccessfully'),
      });
      setAddDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('common:failedToAddLocation'),
        variant: "destructive",
      });
    },
  });

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      return await apiRequest('PATCH', `/api/products/${productId}/locations/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/locations`] });
      toast({
        title: t('common:success'),
        description: t('common:locationUpdatedSuccessfully'),
      });
      setEditLocation(null);
      resetForm();
    },
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('common:failedToUpdateLocation'),
        variant: "destructive",
      });
    },
  });

  // Delete location mutation
  const deleteLocationMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/products/${productId}/locations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/locations`] });
      toast({
        title: t('common:success'),
        description: t('common:locationDeletedSuccessfully'),
      });
      setDeleteLocation(null);
    },
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('common:failedToDeleteLocation'),
        variant: "destructive",
      });
    },
  });

  // Set primary location mutation
  const setPrimaryMutation = useMutation({
    mutationFn: async (locationId: string) => {
      return await apiRequest('PATCH', `/api/products/${productId}/locations/${locationId}`, { isPrimary: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/locations`] });
      toast({
        title: t('common:success'),
        description: t('common:primaryLocationUpdated'),
      });
    },
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('common:failedToSetPrimaryLocation'),
        variant: "destructive",
      });
    },
  });

  // Move inventory mutation
  const moveInventoryMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', `/api/products/${productId}/locations/move`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/locations`] });
      toast({
        title: t('common:success'),
        description: t('common:inventoryMovedSuccessfully'),
      });
      setMoveDialogOpen(false);
      setMoveFromLocation(null);
      setMoveToLocation("");
      setMoveQuantity(0);
    },
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('common:failedToMoveInventory'),
        variant: "destructive",
      });
    },
  });

  // Bulk delete locations mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      // Use Promise.allSettled to handle partial failures gracefully
      const results = await Promise.allSettled(
        ids.map(id => apiRequest('DELETE', `/api/products/${productId}/locations/${id}`))
      );
      // Count successful and failed deletions
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      return { succeeded, failed, total: ids.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}/locations`] });
      if (result.failed === 0) {
        toast({
          title: t('common:success'),
          description: t('common:locationsDeletedSuccessfully', { count: result.succeeded }),
        });
      } else if (result.succeeded > 0) {
        toast({
          title: t('common:partialSuccess'),
          description: t('common:someLocationsDeleted', { succeeded: result.succeeded, failed: result.failed }),
          variant: "default",
        });
      } else {
        toast({
          title: t('common:error'),
          description: t('common:failedToDeleteLocations'),
          variant: "destructive",
        });
      }
      setSelectedLocations(new Set());
      setBulkDeleteDialogOpen(false);
    },
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('common:failedToDeleteLocations'),
        variant: "destructive",
      });
    },
  });

  // Selection helpers
  const toggleLocationSelection = (id: string) => {
    setSelectedLocations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllLocations = () => {
    setSelectedLocations(new Set(locations.map(l => l.id)));
  };

  const deselectAllLocations = () => {
    setSelectedLocations(new Set());
  };

  const isAllSelected = locations.length > 0 && selectedLocations.size === locations.length;
  const isSomeSelected = selectedLocations.size > 0 && selectedLocations.size < locations.length;

  // Sync selected locations with actual locations to remove stale IDs
  // This runs whenever locations change (e.g., after deletions)
  useEffect(() => {
    if (selectedLocations.size > 0) {
      const locationIds = new Set(locations.map(l => l.id));
      const validSelected = new Set(Array.from(selectedLocations).filter(id => locationIds.has(id)));
      if (validSelected.size !== selectedLocations.size) {
        setSelectedLocations(validSelected);
      }
    }
  }, [locations, selectedLocations]);

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate(Array.from(selectedLocations));
  };

  const resetForm = () => {
    setLocationType("warehouse");
    setLocationCode("");
    setQuantity(0);
    setNotes("");
    setIsPrimary(false);
  };

  const handleAddLocation = () => {
    if (!locationCode || quantity < 0) {
      toast({
        title: t('common:error'),
        description: t('common:fillRequiredFields'),
        variant: "destructive",
      });
      return;
    }

    addLocationMutation.mutate({
      productId,
      locationType,
      locationCode,
      quantity,
      notes,
      isPrimary: isPrimary || locations.length === 0, // First location is always primary
    });
  };

  const handleUpdateLocation = () => {
    if (!editLocation || !locationCode || quantity < 0) return;

    updateLocationMutation.mutate({
      id: editLocation.id,
      updates: {
        locationType,
        locationCode,
        quantity,
        notes,
        isPrimary,
      },
    });
  };

  const handleMoveInventory = () => {
    if (!moveFromLocation || !moveToLocation || moveQuantity <= 0) {
      toast({
        title: t('common:error'),
        description: t('common:fillRequiredFields'),
        variant: "destructive",
      });
      return;
    }

    if (moveQuantity > moveFromLocation.quantity) {
      toast({
        title: t('common:error'),
        description: t('common:cannotMoveMoreThanAvailable'),
        variant: "destructive",
      });
      return;
    }

    moveInventoryMutation.mutate({
      productId,
      fromLocationId: moveFromLocation.id,
      toLocationId: moveToLocation,
      quantity: moveQuantity,
    });
  };

  const openEditDialog = (location: ProductLocation) => {
    setEditLocation(location);
    setLocationType(location.locationType);
    setLocationCode(location.locationCode);
    setQuantity(location.quantity);
    setNotes(location.notes || "");
    setIsPrimary(location.isPrimary);
  };

  const totalQuantity = calculateTotalQuantity(locations);
  const primaryLocation = locations.find((loc) => loc.isPrimary);
  const locationSummary = getLocationSummary(locations);
  
  // Calculate difference between product quantity and warehouse total
  const productQuantity = product?.quantity || 0;
  const stockDifference = productQuantity - totalQuantity;

  // Handle missing productId (new product creation)
  if (!productId) {
    if (embedded) {
      return (
        <div className="pt-6">
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 p-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <MapPin className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('common:warehouseLocations')}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('common:saveProductFirstToManageLocations')}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-slate-500 dark:text-slate-400">
            <MapPin className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p>{t('common:saveProductFirstToManageLocations')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    if (embedded) {
      return (
        <div className="pt-6">
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 p-6">
            <div className="text-center text-slate-500 dark:text-slate-400">{t('common:loadingLocations')}</div>
          </div>
        </div>
      );
    }
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-slate-500 dark:text-slate-400">Loading locations...</div>
        </CardContent>
      </Card>
    );
  }

  // Render header section (title + add button)
  const headerSection = (
    <div className="flex items-center justify-between mb-4">
      <div>
        {!embedded && <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('common:warehouseLocations')}</h4>}
        {embedded && <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('common:warehouseLocations')}</h4>}
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{locationSummary}</p>
      </div>
      {!readOnly && (
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-location">
              <Plus className="h-4 w-4 mr-2" />
              {t('common:addLocation')}
            </Button>
          </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t('common:addProductLocation')}</DialogTitle>
                  <DialogDescription>
                    {t('common:addStorageLocationFor', { productName })}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <WarehouseLocationSelector
                    value={locationCode}
                    onChange={setLocationCode}
                    locationType={locationType}
                    onLocationTypeChange={setLocationType}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quantity">{t('common:quantityAtLocation')}</Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                        min="0"
                        data-testid="input-quantity"
                      />
                    </div>

                    <div className="flex items-end">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isPrimary"
                          checked={isPrimary}
                          onChange={(e) => setIsPrimary(e.target.checked)}
                          disabled={locations.length === 0}
                          className="h-4 w-4"
                          data-testid="checkbox-primary"
                        />
                        <Label htmlFor="isPrimary" className="cursor-pointer">
                          {t('common:setAsPrimaryLocation')}
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">{t('common:notes')}</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t('common:optionalNotesAboutLocation')}
                      rows={2}
                      data-testid="textarea-notes"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    {t('common:cancel')}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAddLocation}
                    disabled={addLocationMutation.isPending}
                    data-testid="button-save-location"
                  >
                    {t('common:addLocation')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
      </div>
    );

  // Main content section
  const contentSection = (
    <>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 mb-1">
              <Package className="h-4 w-4" />
              <span className="text-xs font-medium">{t('common:totalStock')}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="text-total-stock">{totalQuantity}</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 mb-1">
              <MapPin className="h-4 w-4" />
              <span className="text-xs font-medium">{t('common:locations')}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="text-location-count">{locations.length}</p>
          </div>

          <div className={`rounded-lg p-3 ${
            stockDifference === 0 
              ? 'bg-green-50 dark:bg-green-950/30' 
              : stockDifference > 0 
              ? 'bg-amber-50 dark:bg-amber-950/30' 
              : 'bg-red-50 dark:bg-red-950/30'
          }`}>
            <div className={`flex items-center space-x-2 mb-1 ${
              stockDifference === 0 
                ? 'text-green-700 dark:text-green-400' 
                : stockDifference > 0 
                ? 'text-amber-700 dark:text-amber-400' 
                : 'text-red-700 dark:text-red-400'
            }`}>
              <ArrowUpDown className="h-4 w-4" />
              <span className="text-xs font-medium">{t('common:stockDifference')}</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <p className={`text-2xl font-bold ${
                stockDifference === 0 
                  ? 'text-green-700 dark:text-green-400' 
                  : stockDifference > 0 
                  ? 'text-amber-700 dark:text-amber-400' 
                  : 'text-red-700 dark:text-red-400'
              }`} data-testid="text-stock-difference">
                {stockDifference > 0 ? '+' : ''}{stockDifference}
              </p>
              {stockDifference !== 0 && (
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <p className={`text-xs mt-1 ${
              stockDifference === 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-slate-600 dark:text-slate-400'
            }`}>
              {stockDifference === 0 
                ? t('common:quantityMatches') 
                : t('common:productQuantity', { quantity: productQuantity })}
            </p>
          </div>

          {primaryLocation && (
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
              <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 mb-1">
                <Star className="h-4 w-4" />
                <span className="text-xs font-medium">{t('common:primaryLocation')}</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-testid="text-primary-location">
                {formatLocationCode(primaryLocation.locationCode)}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400" data-testid="text-primary-quantity">
                {primaryLocation.quantity} {t('common:units')}
              </p>
            </div>
          )}
        </div>

        {/* Locations - Collapsible section */}
        {locations.length > 0 ? (
          <Collapsible open={locationsExpanded} onOpenChange={setLocationsExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full flex items-center justify-between p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                data-testid="button-toggle-locations"
              >
                <div className="flex items-center gap-2">
                  {locationsExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <MapPin className="h-4 w-4 text-slate-500" />
                  <span className="font-medium">{t('common:allLocations', 'All Locations')}</span>
                  <Badge variant="secondary" className="ml-2">{locations.length}</Badge>
                </div>
                <span className="text-sm text-slate-500">
                  {locationsExpanded ? t('common:clickToCollapse', 'Click to collapse') : t('common:clickToExpand', 'Click to expand')}
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
            {/* Bulk Actions Bar - shows when items are selected */}
            {!readOnly && selectedLocations.size > 0 && (
              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={(checked) => {
                      if (checked) selectAllLocations();
                      else deselectAllLocations();
                    }}
                    data-testid="checkbox-select-all"
                  />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {t('common:selectedCount', { count: selectedLocations.size })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deselectAllLocations}
                    className="text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700"
                    data-testid="button-deselect-all"
                  >
                    <X className="h-4 w-4 mr-1" />
                    {t('common:clearSelection')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setBulkDeleteDialogOpen(true)}
                    data-testid="button-bulk-delete"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t('common:deleteSelected')}
                  </Button>
                </div>
              </div>
            )}

            {/* Select All row when no items selected but list is expanded */}
            {!readOnly && selectedLocations.size === 0 && locations.length > 1 && (
              <div className="mb-3 p-2 flex items-center gap-2">
                <Checkbox
                  checked={false}
                  onCheckedChange={() => selectAllLocations()}
                  data-testid="checkbox-select-all-empty"
                />
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {t('common:selectAll')}
                </span>
              </div>
            )}

            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-3">
              {locations.map((location) => {
                const LocationIcon = getLocationTypeIcon(location.locationType);
                const isSelected = selectedLocations.has(location.id);
                return (
                  <div 
                    key={location.id} 
                    className={`rounded-lg border p-4 bg-white dark:bg-slate-900 ${
                      isSelected 
                        ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/20' 
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                    data-testid={`card-location-${location.id}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {!readOnly && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleLocationSelection(location.id)}
                            data-testid={`checkbox-location-${location.id}`}
                          />
                        )}
                        <LocationIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                        <span className="font-mono font-medium" data-testid={`text-location-code-${location.id}`}>
                          {location.locationCode}
                        </span>
                      </div>
                      {!readOnly && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`button-actions-${location.id}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openEditDialog(location)}
                              data-testid={`menu-edit-${location.id}`}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              {t('common:editLocation')}
                            </DropdownMenuItem>
                            
                            {!location.isPrimary && (
                              <DropdownMenuItem
                                onClick={() => setPrimaryMutation.mutate(location.id)}
                                data-testid={`menu-primary-${location.id}`}
                              >
                                <Star className="h-4 w-4 mr-2" />
                                {t('common:setAsPrimary')}
                              </DropdownMenuItem>
                            )}

                            {location.quantity > 0 && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setMoveFromLocation(location);
                                  setMoveQuantity(location.quantity);
                                  setMoveDialogOpen(true);
                                }}
                                data-testid={`menu-move-${location.id}`}
                              >
                                <MoveRight className="h-4 w-4 mr-2" />
                                {t('common:moveInventory')}
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => setDeleteLocation(location)}
                              className="text-red-600"
                              data-testid={`menu-delete-${location.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('common:deleteLocation')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">{t('common:type')}:</span>
                        <Badge
                          variant="outline"
                          className={`ml-2 ${getLocationTypeTextColor(location.locationType)}`}
                          data-testid={`badge-type-${location.id}`}
                        >
                          {getLocationTypeLabel(location.locationType)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500 dark:text-slate-400">{t('common:quantity')}:</span>
                        <span className="ml-2 font-medium" data-testid={`text-quantity-${location.id}`}>
                          {getDisplayQuantity(location)}
                        </span>
                        {hasVariants && (
                          <span title={t('common:fromVariants', 'From variants')}>
                            <Layers className="h-3 w-3 text-violet-500 ml-1" />
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2">
                      {location.isPrimary && (
                        <Badge variant="default" className="bg-blue-600">
                          <Star className="h-3 w-3 mr-1" />
                          {t('common:primary')}
                        </Badge>
                      )}
                      {location.notes && (
                        <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {location.notes}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Desktop Table Layout */}
            <div className="hidden md:block rounded-md border border-gray-200 dark:border-gray-700">
              <Table>
                <TableHeader>
                  <TableRow>
                    {!readOnly && (
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={(checked) => {
                            if (checked) selectAllLocations();
                            else deselectAllLocations();
                          }}
                          data-testid="checkbox-select-all-table"
                        />
                      </TableHead>
                    )}
                    <TableHead>{t('common:locationCode')}</TableHead>
                    <TableHead>{t('common:type')}</TableHead>
                    <TableHead>{t('common:quantity')}</TableHead>
                    <TableHead>{t('common:status')}</TableHead>
                    <TableHead>{t('common:notes')}</TableHead>
                    {!readOnly && <TableHead className="w-[100px]">{t('common:actions')}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((location) => {
                    const LocationIcon = getLocationTypeIcon(location.locationType);
                    const isSelected = selectedLocations.has(location.id);
                    return (
                      <TableRow 
                        key={location.id} 
                        data-testid={`row-location-${location.id}`}
                        className={isSelected ? 'bg-blue-50 dark:bg-blue-950/20' : ''}
                      >
                        {!readOnly && (
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleLocationSelection(location.id)}
                              data-testid={`checkbox-location-${location.id}`}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center space-x-2" data-testid={`text-location-code-${location.id}`}>
                            <LocationCodeDisplay code={location.locationCode} quantity={getDisplayQuantity(location)} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getLocationTypeTextColor(location.locationType)}
                            data-testid={`badge-type-${location.id}`}
                          >
                            {getLocationTypeLabel(location.locationType)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="font-medium" data-testid={`text-quantity-${location.id}`}>
                              {getDisplayQuantity(location)}
                            </span>
                            {hasVariants && (
                              <span title={t('common:fromVariants', 'From variants')}>
                                <Layers className="h-3 w-3 text-violet-500" />
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {location.isPrimary && (
                            <Badge variant="default" className="bg-blue-600">
                              <Star className="h-3 w-3 mr-1" />
                              {t('common:primary')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                          {location.notes || "-"}
                        </TableCell>
                        {!readOnly && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-testid={`button-actions-${location.id}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => openEditDialog(location)}
                                  data-testid={`menu-edit-${location.id}`}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  {t('common:editLocation')}
                                </DropdownMenuItem>
                                
                                {!location.isPrimary && (
                                  <DropdownMenuItem
                                    onClick={() => setPrimaryMutation.mutate(location.id)}
                                    data-testid={`menu-primary-${location.id}`}
                                  >
                                    <Star className="h-4 w-4 mr-2" />
                                    {t('common:setAsPrimary')}
                                  </DropdownMenuItem>
                                )}

                                {location.quantity > 0 && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setMoveFromLocation(location);
                                      setMoveQuantity(location.quantity);
                                      setMoveDialogOpen(true);
                                    }}
                                    data-testid={`menu-move-${location.id}`}
                                  >
                                    <MoveRight className="h-4 w-4 mr-2" />
                                    {t('common:moveInventory')}
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={() => setDeleteLocation(location)}
                                  className="text-red-600"
                                  data-testid={`menu-delete-${location.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {t('common:deleteLocation')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <MapPin className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p>{t('common:noLocationsAssigned')}</p>
            {!readOnly && (
              <p className="text-sm mt-1">{t('common:addLocationDescription')}</p>
            )}
          </div>
        )}
    </>
  );

  // Dialogs section (always rendered outside of content)
  const dialogsSection = (
    <>
      {/* Edit Location Dialog */}
      <Dialog open={!!editLocation} onOpenChange={(open) => !open && setEditLocation(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('common:editLocation')}</DialogTitle>
            <DialogDescription>
              Update location details for {productName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <WarehouseLocationSelector
              value={locationCode}
              onChange={setLocationCode}
              locationType={locationType}
              onLocationTypeChange={setLocationType}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-quantity">{t('common:quantityAtLocation')}</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  min="0"
                  data-testid="input-edit-quantity"
                />
              </div>

              <div className="flex items-end">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-isPrimary"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="h-4 w-4"
                    data-testid="checkbox-edit-primary"
                  />
                  <Label htmlFor="edit-isPrimary" className="cursor-pointer">
                    Set as Primary Location
                  </Label>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('common:optionalNotesAboutLocation')}
                rows={2}
                data-testid="textarea-edit-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditLocation(null)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpdateLocation}
              disabled={updateLocationMutation.isPending}
              data-testid="button-save-edit"
            >
              Update Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Inventory Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common:moveInventory')}</DialogTitle>
            <DialogDescription>
              Move inventory from {moveFromLocation?.locationCode} to another location
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>{t('common:fromLocation')}</Label>
              <div className="mt-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
                <p className="font-mono font-medium">{moveFromLocation?.locationCode}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Available: {moveFromLocation?.quantity} {t('common:units')}
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="move-to">{t('common:toLocation')}</Label>
              <Select
                value={moveToLocation}
                onValueChange={setMoveToLocation}
              >
                <SelectTrigger id="move-to" data-testid="select-move-to">
                  <SelectValue placeholder={t('common:selectDestinationLocation')} />
                </SelectTrigger>
                <SelectContent>
                  {locations
                    .filter((loc) => loc.id !== moveFromLocation?.id)
                    .map((loc) => (
                      <SelectItem
                        key={loc.id}
                        value={loc.id}
                        data-testid={`option-move-to-${loc.id}`}
                      >
                        {loc.locationCode} ({loc.quantity} {t('common:units')})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="move-quantity">{t('common:quantityToMove')}</Label>
              <Input
                id="move-quantity"
                type="number"
                value={moveQuantity}
                onChange={(e) => setMoveQuantity(parseInt(e.target.value) || 0)}
                min="1"
                max={moveFromLocation?.quantity || 0}
                data-testid="input-move-quantity"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMoveDialogOpen(false)}
              data-testid="button-cancel-move"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleMoveInventory}
              disabled={moveInventoryMutation.isPending}
              data-testid="button-confirm-move"
            >
              {t('common:moveInventory')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteLocation} onOpenChange={(open) => !open && setDeleteLocation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common:deleteLocation')}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete location{" "}
              <span className="font-mono font-semibold">{deleteLocation?.locationCode}</span>?
              {deleteLocation?.quantity && deleteLocation.quantity > 0 && (
                <span className="block mt-2 text-red-600">
                  Warning: This location contains {deleteLocation.quantity} {t('common:units')}. Consider moving
                  the inventory first.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteLocation && deleteLocationMutation.mutate(deleteLocation.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {t('common:deleteLocation')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common:deleteLocations')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common:confirmDeleteMultipleLocations', { count: selectedLocations.size })}
              {(() => {
                const selectedWithInventory = locations
                  .filter(l => selectedLocations.has(l.id) && l.quantity > 0);
                const totalInventory = selectedWithInventory.reduce((sum, l) => sum + l.quantity, 0);
                if (totalInventory > 0) {
                  return (
                    <span className="block mt-2 text-red-600">
                      {t('common:warningLocationsContainInventory', { 
                        locationCount: selectedWithInventory.length,
                        totalUnits: totalInventory 
                      })}
                    </span>
                  );
                }
                return null;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-delete">{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={bulkDeleteMutation.isPending}
              data-testid="button-confirm-bulk-delete"
            >
              {bulkDeleteMutation.isPending ? t('common:deleting') : t('common:deleteLocations')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  // Render based on embedded mode
  if (embedded) {
    return (
      <div className="pt-6">
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 p-6 space-y-4">
          {headerSection}
          {contentSection}
        </div>
        {dialogsSection}
      </div>
    );
  }

  // Default Card layout
  return (
    <Card>
      <CardHeader className="pb-4">
        {headerSection}
      </CardHeader>
      <CardContent>
        {contentSection}
      </CardContent>
      {dialogsSection}
    </Card>
  );
}