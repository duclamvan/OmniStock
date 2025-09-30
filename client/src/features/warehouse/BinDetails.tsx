import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Package, Thermometer, AlertTriangle, Save } from "lucide-react";
import type { WarehouseLocation, InventoryBalance } from "@shared/schema";

interface BinDetailsProps {
  location: WarehouseLocation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updates: Partial<WarehouseLocation>) => void;
}

export function BinDetails({ location, open, onOpenChange, onUpdate }: BinDetailsProps) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    code: location.code,
    pickable: location.pickable,
    putawayAllowed: location.putawayAllowed,
    sortKey: location.sortKey,
    temperature: location.temperature || "",
    hazmat: location.hazmat,
    heightCm: location.heightCm || "",
    widthCm: location.widthCm || "",
    depthCm: location.depthCm || "",
    maxWeight: location.maxWeight || "",
    notes: location.notes || "",
  });

  // Fetch inventory balances for this bin
  const { data: balances, isLoading } = useQuery({
    queryKey: [`/api/locations/${location.id}/balances`],
    enabled: open && location.type === "BIN",
  });

  // Update location mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      return apiRequest("PUT", `/api/locations/${location.id}`, updates);
    },
    onSuccess: () => {
      toast({
        title: "Location updated",
        description: "The location has been updated successfully.",
      });
      setEditMode(false);
      onUpdate(formData);
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update location.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      ...formData,
      heightCm: formData.heightCm ? parseInt(formData.heightCm as any) : null,
      widthCm: formData.widthCm ? parseInt(formData.widthCm as any) : null,
      depthCm: formData.depthCm ? parseInt(formData.depthCm as any) : null,
      maxWeight: formData.maxWeight ? parseInt(formData.maxWeight as any) : null,
      temperature: formData.temperature || null,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {location.address}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Capacity Bar */}
          <div>
            <div className="flex justify-between mb-2">
              <Label>Occupancy</Label>
              <span className="text-sm text-gray-500">{location.currentOccupancy || 0}%</span>
            </div>
            <Progress value={location.currentOccupancy || 0} className="h-2" />
          </div>

          {/* Current Inventory */}
          {!isLoading && balances && balances.length > 0 && (
            <div>
              <Label className="mb-2">Current Inventory</Label>
              <div className="space-y-2">
                {balances.map((balance: InventoryBalance) => (
                  <div key={balance.id} className="p-2 border rounded">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">
                        {balance.variantId || balance.productId}
                      </span>
                      <Badge variant="secondary">{balance.quantity}</Badge>
                    </div>
                    {balance.lotNumber && (
                      <div className="text-xs text-gray-500 mt-1">Lot: {balance.lotNumber}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edit Form */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Location Code</Label>
              {editMode ? (
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-32"
                />
              ) : (
                <span className="font-medium">{location.code}</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="pickable">Pickable</Label>
              <Switch
                id="pickable"
                checked={formData.pickable}
                onCheckedChange={(checked) => setFormData({ ...formData, pickable: checked })}
                disabled={!editMode}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="putaway">Putaway Allowed</Label>
              <Switch
                id="putaway"
                checked={formData.putawayAllowed}
                onCheckedChange={(checked) => setFormData({ ...formData, putawayAllowed: checked })}
                disabled={!editMode}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="sortKey">Sort Key</Label>
              {editMode ? (
                <Input
                  id="sortKey"
                  type="number"
                  value={formData.sortKey}
                  onChange={(e) => setFormData({ ...formData, sortKey: parseInt(e.target.value) })}
                  className="w-24"
                />
              ) : (
                <span>{location.sortKey}</span>
              )}
            </div>

            <div>
              <Label htmlFor="temperature">Temperature</Label>
              <Select
                value={formData.temperature}
                onValueChange={(value) => setFormData({ ...formData, temperature: value })}
                disabled={!editMode}
              >
                <SelectTrigger id="temperature">
                  <SelectValue placeholder="Select temperature" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ambient">Ambient</SelectItem>
                  <SelectItem value="cool">Cool</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="hazmat">Hazmat Area</Label>
              <Switch
                id="hazmat"
                checked={formData.hazmat}
                onCheckedChange={(checked) => setFormData({ ...formData, hazmat: checked })}
                disabled={!editMode}
              />
            </div>

            {/* Dimensions */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={formData.heightCm}
                  onChange={(e) => setFormData({ ...formData, heightCm: e.target.value })}
                  disabled={!editMode}
                />
              </div>
              <div>
                <Label htmlFor="width">Width (cm)</Label>
                <Input
                  id="width"
                  type="number"
                  value={formData.widthCm}
                  onChange={(e) => setFormData({ ...formData, widthCm: e.target.value })}
                  disabled={!editMode}
                />
              </div>
              <div>
                <Label htmlFor="depth">Depth (cm)</Label>
                <Input
                  id="depth"
                  type="number"
                  value={formData.depthCm}
                  onChange={(e) => setFormData({ ...formData, depthCm: e.target.value })}
                  disabled={!editMode}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="maxWeight">Max Weight (kg)</Label>
              <Input
                id="maxWeight"
                type="number"
                value={formData.maxWeight}
                onChange={(e) => setFormData({ ...formData, maxWeight: e.target.value })}
                disabled={!editMode}
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                disabled={!editMode}
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {editMode ? (
              <>
                <Button onClick={handleSave} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditMode(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditMode(true)} className="flex-1">
                Edit Location
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}