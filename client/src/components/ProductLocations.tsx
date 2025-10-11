import { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
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
} from "lucide-react";
import {
  getLocationTypeIcon,
  getLocationTypeTextColor,
  getLocationTypeLabel,
  formatLocationCode,
  calculateTotalQuantity,
  getLocationSummary,
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

export default function ProductLocations({
  productId,
  productName = "Product",
  readOnly = false,
  embedded = false,
}: ProductLocationsProps) {
  const { toast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editLocation, setEditLocation] = useState<ProductLocation | null>(null);
  const [deleteLocation, setDeleteLocation] = useState<ProductLocation | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveFromLocation, setMoveFromLocation] = useState<ProductLocation | null>(null);

  // Form states for add/edit
  const [locationType, setLocationType] = useState<LocationType>("warehouse");
  const [locationCode, setLocationCode] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [notes, setNotes] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  // Move inventory states
  const [moveToLocation, setMoveToLocation] = useState<string>("");
  const [moveQuantity, setMoveQuantity] = useState(0);

  // Fetch product locations
  const { data: locations = [], isLoading } = useQuery<ProductLocation[]>({
    queryKey: ['/api/product-locations', productId],
    enabled: !!productId,
  });

  // Add location mutation
  const addLocationMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/product-locations', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-locations', productId] });
      toast({
        title: "Success",
        description: "Location added successfully",
      });
      setAddDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add location",
        variant: "destructive",
      });
    },
  });

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      return await apiRequest('PATCH', `/api/product-locations/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-locations', productId] });
      toast({
        title: "Success",
        description: "Location updated successfully",
      });
      setEditLocation(null);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update location",
        variant: "destructive",
      });
    },
  });

  // Delete location mutation
  const deleteLocationMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/product-locations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-locations', productId] });
      toast({
        title: "Success",
        description: "Location deleted successfully",
      });
      setDeleteLocation(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete location",
        variant: "destructive",
      });
    },
  });

  // Set primary location mutation
  const setPrimaryMutation = useMutation({
    mutationFn: async (locationId: string) => {
      return await apiRequest('POST', `/api/product-locations/${locationId}/set-primary`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-locations', productId] });
      toast({
        title: "Success",
        description: "Primary location updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to set primary location",
        variant: "destructive",
      });
    },
  });

  // Move inventory mutation
  const moveInventoryMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/product-locations/move', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-locations', productId] });
      toast({
        title: "Success",
        description: "Inventory moved successfully",
      });
      setMoveDialogOpen(false);
      setMoveFromLocation(null);
      setMoveToLocation("");
      setMoveQuantity(0);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to move inventory",
        variant: "destructive",
      });
    },
  });

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
        title: "Error",
        description: "Please fill in all required fields",
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
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (moveQuantity > moveFromLocation.quantity) {
      toast({
        title: "Error",
        description: "Cannot move more than available quantity",
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

  // Handle missing productId (new product creation)
  if (!productId) {
    if (embedded) {
      return (
        <div className="pt-6">
          <div className="border border-slate-200 rounded-lg bg-slate-50 p-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <MapPin className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-1">Warehouse Locations</h4>
                <p className="text-sm text-slate-500">
                  Save the product first to manage warehouse locations and stock distribution
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
          <div className="text-center text-slate-500">
            <MapPin className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p>Save the product first to manage warehouse locations</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    if (embedded) {
      return (
        <div className="pt-6">
          <div className="border border-slate-200 rounded-lg bg-slate-50 p-6">
            <div className="text-center text-slate-500">Loading locations...</div>
          </div>
        </div>
      );
    }
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-slate-500">Loading locations...</div>
        </CardContent>
      </Card>
    );
  }

  // Render header section (title + add button)
  const headerSection = (
    <div className="flex items-center justify-between mb-4">
      <div>
        {!embedded && <h4 className="text-base font-semibold">Warehouse Locations</h4>}
        {embedded && <h4 className="text-sm font-semibold text-slate-700">Warehouse Locations</h4>}
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{locationSummary}</p>
      </div>
      {!readOnly && (
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-location">
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Product Location</DialogTitle>
                  <DialogDescription>
                    Add a new storage location for {productName}
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
                      <Label htmlFor="quantity">Quantity at Location</Label>
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
                          Set as Primary Location
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional notes about this location"
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
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAddLocation}
                    disabled={addLocationMutation.isPending}
                    data-testid="button-save-location"
                  >
                    Add Location
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
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-slate-600 mb-1">
              <Package className="h-4 w-4" />
              <span className="text-xs font-medium">Total Stock</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-total-stock">{totalQuantity}</p>
          </div>

          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-slate-600 mb-1">
              <MapPin className="h-4 w-4" />
              <span className="text-xs font-medium">Locations</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-location-count">{locations.length}</p>
          </div>

          {primaryLocation && (
            <div className="bg-blue-50 rounded-lg p-3 md:col-span-2">
              <div className="flex items-center space-x-2 text-blue-600 mb-1">
                <Star className="h-4 w-4" />
                <span className="text-xs font-medium">Primary Location</span>
              </div>
              <p className="text-lg font-semibold" data-testid="text-primary-location">
                {formatLocationCode(primaryLocation.locationCode)}
              </p>
              <p className="text-sm text-blue-600" data-testid="text-primary-quantity">
                {primaryLocation.quantity} units
              </p>
            </div>
          )}
        </div>

        {/* Locations Table */}
        {locations.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  {!readOnly && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => {
                  const LocationIcon = getLocationTypeIcon(location.locationType);
                  return (
                    <TableRow key={location.id} data-testid={`row-location-${location.id}`}>
                      <TableCell className="font-mono">
                        <div className="flex items-center space-x-2">
                          <LocationIcon className="h-4 w-4 text-slate-500" />
                          <span data-testid={`text-location-code-${location.id}`}>
                            {location.locationCode}
                          </span>
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
                        <span className="font-medium" data-testid={`text-quantity-${location.id}`}>
                          {location.quantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        {location.isPrimary && (
                          <Badge variant="default" className="bg-blue-600">
                            <Star className="h-3 w-3 mr-1" />
                            Primary
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
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
                                Edit Location
                              </DropdownMenuItem>
                              
                              {!location.isPrimary && (
                                <DropdownMenuItem
                                  onClick={() => setPrimaryMutation.mutate(location.id)}
                                  data-testid={`menu-primary-${location.id}`}
                                >
                                  <Star className="h-4 w-4 mr-2" />
                                  Set as Primary
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
                                  Move Inventory
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => setDeleteLocation(location)}
                                className="text-red-600"
                                data-testid={`menu-delete-${location.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Location
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
        ) : (
          <div className="text-center py-8 text-slate-500">
            <MapPin className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p>No locations assigned yet</p>
            {!readOnly && (
              <p className="text-sm mt-1">Click "Add Location" to assign storage locations</p>
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
            <DialogTitle>Edit Location</DialogTitle>
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
                <Label htmlFor="edit-quantity">Quantity at Location</Label>
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
                placeholder="Optional notes about this location"
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
            <DialogTitle>Move Inventory</DialogTitle>
            <DialogDescription>
              Move inventory from {moveFromLocation?.locationCode} to another location
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>From Location</Label>
              <div className="mt-1 p-3 bg-slate-50 rounded-md">
                <p className="font-mono font-medium">{moveFromLocation?.locationCode}</p>
                <p className="text-sm text-slate-600">
                  Available: {moveFromLocation?.quantity} units
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="move-to">To Location</Label>
              <Select
                value={moveToLocation}
                onValueChange={setMoveToLocation}
              >
                <SelectTrigger id="move-to" data-testid="select-move-to">
                  <SelectValue placeholder="Select destination location" />
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
                        {loc.locationCode} ({loc.quantity} units)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="move-quantity">Quantity to Move</Label>
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
              Move Inventory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteLocation} onOpenChange={(open) => !open && setDeleteLocation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete location{" "}
              <span className="font-mono font-semibold">{deleteLocation?.locationCode}</span>?
              {deleteLocation?.quantity && deleteLocation.quantity > 0 && (
                <span className="block mt-2 text-red-600">
                  Warning: This location contains {deleteLocation.quantity} units. Consider moving
                  the inventory first.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteLocation && deleteLocationMutation.mutate(deleteLocation.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Delete Location
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
        <div className="border border-slate-200 rounded-lg bg-slate-50 p-6 space-y-4">
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