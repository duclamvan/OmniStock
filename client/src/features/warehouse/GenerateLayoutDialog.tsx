import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Boxes } from "lucide-react";
import type { InsertWarehouseLocation } from "@shared/schema";

interface GenerateLayoutDialogProps {
  warehouseCode: string;
}

export function GenerateLayoutDialog({ warehouseCode }: GenerateLayoutDialogProps) {
  const { t } = useTranslation('warehouse');
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    zonesStart: "A",
    zonesEnd: "B",
    aislesPerZone: 4,
    racksPerAisle: 4,
    shelvesPerRack: 4,
    binsPerShelf: 6,
  });
  const [preview, setPreview] = useState<string[]>([]);

  // Generate preview
  const generatePreview = () => {
    const addresses: string[] = [];
    const startChar = formData.zonesStart.charCodeAt(0);
    const endChar = formData.zonesEnd.charCodeAt(0);

    for (let z = startChar; z <= endChar; z++) {
      const zone = String.fromCharCode(z);
      for (let a = 1; a <= formData.aislesPerZone; a++) {
        const aisle = String(a).padStart(2, "0");
        for (let r = 1; r <= formData.racksPerAisle; r++) {
          const rack = String(r).padStart(2, "0");
          for (let s = 1; s <= formData.shelvesPerRack; s++) {
            const shelf = String(s).padStart(2, "0");
            for (let b = 1; b <= formData.binsPerShelf; b++) {
              const bin = String(b).padStart(2, "0");
              addresses.push(`${warehouseCode}-${zone}-A${aisle}-R${rack}-S${shelf}-B${bin}`);
            }
          }
        }
      }
    }

    setPreview(addresses.slice(0, 10)); // Show first 10 as preview
    return addresses;
  };

  // Generate locations mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const locations: InsertWarehouseLocation[] = [];
      const startChar = formData.zonesStart.charCodeAt(0);
      const endChar = formData.zonesEnd.charCodeAt(0);
      let sortKey = 0;

      // Get warehouse ID
      const response = await fetch("/api/warehouses");
      const warehouses = await response.json();
      const warehouse = warehouses.find((w: any) => w.code === warehouseCode || w.id === warehouseCode);
      if (!warehouse) throw new Error("Warehouse not found");

      // Generate zones
      const zoneIds: Record<string, string> = {};
      for (let z = startChar; z <= endChar; z++) {
        const zone = String.fromCharCode(z);
        const zoneId = `zone-${warehouseCode}-${zone}`;
        zoneIds[zone] = zoneId;
        
        locations.push({
          warehouseId: warehouse.id,
          type: "ZONE" as any,
          code: zone,
          address: `${warehouseCode}-${zone}`,
          sortKey,
        });
        sortKey++;
      }

      // Generate aisles
      const aisleIds: Record<string, string> = {};
      for (let z = startChar; z <= endChar; z++) {
        const zone = String.fromCharCode(z);
        for (let a = 1; a <= formData.aislesPerZone; a++) {
          const aisle = String(a).padStart(2, "0");
          const aisleId = `aisle-${warehouseCode}-${zone}-${aisle}`;
          aisleIds[`${zone}-${aisle}`] = aisleId;
          
          locations.push({
            warehouseId: warehouse.id,
            parentId: zoneIds[zone],
            type: "AISLE" as any,
            code: `A${aisle}`,
            address: `${warehouseCode}-${zone}-A${aisle}`,
            sortKey,
          });
          sortKey++;
        }
      }

      // Generate racks
      const rackIds: Record<string, string> = {};
      for (let z = startChar; z <= endChar; z++) {
        const zone = String.fromCharCode(z);
        for (let a = 1; a <= formData.aislesPerZone; a++) {
          const aisle = String(a).padStart(2, "0");
          for (let r = 1; r <= formData.racksPerAisle; r++) {
            const rack = String(r).padStart(2, "0");
            const rackId = `rack-${warehouseCode}-${zone}-${aisle}-${rack}`;
            rackIds[`${zone}-${aisle}-${rack}`] = rackId;
            
            locations.push({
              warehouseId: warehouse.id,
              parentId: aisleIds[`${zone}-${aisle}`],
              type: "RACK" as any,
              code: `R${rack}`,
              address: `${warehouseCode}-${zone}-A${aisle}-R${rack}`,
              sortKey,
            });
            sortKey++;
          }
        }
      }

      // Generate shelves
      const shelfIds: Record<string, string> = {};
      for (let z = startChar; z <= endChar; z++) {
        const zone = String.fromCharCode(z);
        for (let a = 1; a <= formData.aislesPerZone; a++) {
          const aisle = String(a).padStart(2, "0");
          for (let r = 1; r <= formData.racksPerAisle; r++) {
            const rack = String(r).padStart(2, "0");
            for (let s = 1; s <= formData.shelvesPerRack; s++) {
              const shelf = String(s).padStart(2, "0");
              const shelfId = `shelf-${warehouseCode}-${zone}-${aisle}-${rack}-${shelf}`;
              shelfIds[`${zone}-${aisle}-${rack}-${shelf}`] = shelfId;
              
              locations.push({
                warehouseId: warehouse.id,
                parentId: rackIds[`${zone}-${aisle}-${rack}`],
                type: "SHELF" as any,
                code: `S${shelf}`,
                address: `${warehouseCode}-${zone}-A${aisle}-R${rack}-S${shelf}`,
                sortKey,
              });
              sortKey++;
            }
          }
        }
      }

      // Generate bins
      for (let z = startChar; z <= endChar; z++) {
        const zone = String.fromCharCode(z);
        for (let a = 1; a <= formData.aislesPerZone; a++) {
          const aisle = String(a).padStart(2, "0");
          for (let r = 1; r <= formData.racksPerAisle; r++) {
            const rack = String(r).padStart(2, "0");
            for (let s = 1; s <= formData.shelvesPerRack; s++) {
              const shelf = String(s).padStart(2, "0");
              for (let b = 1; b <= formData.binsPerShelf; b++) {
                const bin = String(b).padStart(2, "0");
                
                locations.push({
                  warehouseId: warehouse.id,
                  parentId: shelfIds[`${zone}-${aisle}-${rack}-${shelf}`],
                  type: "BIN" as any,
                  code: `B${bin}`,
                  address: `${warehouseCode}-${zone}-A${aisle}-R${rack}-S${shelf}-B${bin}`,
                  sortKey,
                });
                sortKey++;
              }
            }
          }
        }
      }

      // Create locations in bulk (clear existing locations first)
      return apiRequest("POST", `/api/warehouses/${warehouseCode}/locations/bulk`, { locations, clearExisting: true });
    },
    onSuccess: () => {
      toast({
        title: t('layoutGenerated'),
        description: t('layoutGeneratedSuccess'),
      });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/warehouses/${warehouseCode}/locations`] });
    },
    onError: () => {
      toast({
        title: t('error'),
        description: t('failedToGenerateLayout'),
        variant: "destructive",
      });
    },
  });

  const totalLocations = () => {
    const zones = formData.zonesEnd.charCodeAt(0) - formData.zonesStart.charCodeAt(0) + 1;
    const aisles = zones * formData.aislesPerZone;
    const racks = aisles * formData.racksPerAisle;
    const shelves = racks * formData.shelvesPerRack;
    const bins = shelves * formData.binsPerShelf;
    return zones + aisles + racks + shelves + bins;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t('generateLayout')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('generateWarehouseLayout')}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <Label>{t('zonesRange')}</Label>
            <div className="flex gap-2">
              <Input
                value={formData.zonesStart}
                onChange={(e) => setFormData({ ...formData, zonesStart: e.target.value.toUpperCase() })}
                maxLength={1}
                className="w-16"
              />
              <span className="self-center">{t('to')}</span>
              <Input
                value={formData.zonesEnd}
                onChange={(e) => setFormData({ ...formData, zonesEnd: e.target.value.toUpperCase() })}
                maxLength={1}
                className="w-16"
              />
            </div>
          </div>

          <div>
            <Label>{t('aislesPerZone')}</Label>
            <Input
              type="number"
              value={formData.aislesPerZone}
              onChange={(e) => setFormData({ ...formData, aislesPerZone: parseInt(e.target.value) })}
              min={1}
              max={20}
            />
          </div>

          <div>
            <Label>{t('racksPerAisle')}</Label>
            <Input
              type="number"
              value={formData.racksPerAisle}
              onChange={(e) => setFormData({ ...formData, racksPerAisle: parseInt(e.target.value) })}
              min={1}
              max={10}
            />
          </div>

          <div>
            <Label>{t('shelvesPerRack')}</Label>
            <Input
              type="number"
              value={formData.shelvesPerRack}
              onChange={(e) => setFormData({ ...formData, shelvesPerRack: parseInt(e.target.value) })}
              min={1}
              max={10}
            />
          </div>

          <div>
            <Label>{t('binsPerShelf')}</Label>
            <Input
              type="number"
              value={formData.binsPerShelf}
              onChange={(e) => setFormData({ ...formData, binsPerShelf: parseInt(e.target.value) })}
              min={1}
              max={20}
            />
          </div>

          <div>
            <Label>{t('totalLocations')}</Label>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {totalLocations()}
            </Badge>
          </div>
        </div>

        <div className="mt-4">
          <Button onClick={generatePreview} variant="outline" className="mb-2">
            {t('previewAddresses')}
          </Button>
          
          {preview.length > 0 && (
            <ScrollArea className="h-32 border rounded p-2">
              <div className="text-xs space-y-1">
                {preview.map((addr, i) => (
                  <div key={i}>{addr}</div>
                ))}
                <div className="text-gray-500">{t('andMore', { count: totalLocations() - 10 })}</div>
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button 
            onClick={() => generateMutation.mutate()} 
            disabled={generateMutation.isPending}
            className="flex-1"
          >
            {generateMutation.isPending ? t('generating') : t('generateLayout')}
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}