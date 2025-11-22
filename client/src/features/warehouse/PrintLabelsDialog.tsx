import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Printer, Check, X } from "lucide-react";
import type { WarehouseLocation } from "@shared/schema";
import { useTranslation } from "react-i18next";

interface PrintLabelsDialogProps {
  warehouseCode: string;
  locations: WarehouseLocation[];
}

export function PrintLabelsDialog({ warehouseCode, locations }: PrintLabelsDialogProps) {
  const { t } = useTranslation('warehouse');
  const [open, setOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(["BIN"]));
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());

  const locationsByType = locations.reduce((acc, loc) => {
    if (!acc[loc.type]) acc[loc.type] = [];
    acc[loc.type].push(loc);
    return acc;
  }, {} as Record<string, WarehouseLocation[]>);

  const toggleType = (type: string) => {
    const newTypes = new Set(selectedTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
      // Deselect all locations of this type
      const newLocations = new Set(selectedLocations);
      locationsByType[type]?.forEach(loc => newLocations.delete(loc.id));
      setSelectedLocations(newLocations);
    } else {
      newTypes.add(type);
      // Select all locations of this type
      const newLocations = new Set(selectedLocations);
      locationsByType[type]?.forEach(loc => newLocations.add(loc.id));
      setSelectedLocations(newLocations);
    }
    setSelectedTypes(newTypes);
  };

  const toggleLocation = (locationId: string) => {
    const newLocations = new Set(selectedLocations);
    if (newLocations.has(locationId)) {
      newLocations.delete(locationId);
    } else {
      newLocations.add(locationId);
    }
    setSelectedLocations(newLocations);
  };

  const handlePrint = () => {
    if (selectedLocations.size === 0) {
      toast({
        title: t('noLocationsSelected'),
        description: t('selectLocationsForLabels'),
        variant: "destructive",
      });
      return;
    }

    // Generate print content
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({
        title: t('common:error'),
        description: t('failedToOpenPrintWindow'),
        variant: "destructive",
      });
      return;
    }

    const selectedLocs = locations.filter(loc => selectedLocations.has(loc.id));
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Location Labels - ${warehouseCode}</title>
        <style>
          @page { size: 100mm 50mm; margin: 0; }
          body { margin: 0; font-family: Arial, sans-serif; }
          .label {
            width: 100mm;
            height: 50mm;
            padding: 5mm;
            box-sizing: border-box;
            page-break-after: always;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            border: 1px solid #000;
          }
          .barcode {
            font-family: 'Libre Barcode 128', monospace;
            font-size: 32px;
            margin: 10px 0;
          }
          .address {
            font-size: 18px;
            font-weight: bold;
            margin: 5px 0;
          }
          .details {
            font-size: 12px;
            color: #666;
          }
        </style>
        <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap" rel="stylesheet">
      </head>
      <body>
        ${selectedLocs.map(loc => `
          <div class="label">
            <div class="barcode">${loc.address}</div>
            <div class="address">${loc.address}</div>
            <div class="details">
              ${loc.type} | ${loc.pickable ? "Pickable" : "No Pick"} | ${loc.putawayAllowed ? "Putaway" : "No Putaway"}
            </div>
          </div>
        `).join("")}
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };

    toast({
      title: t('labelsSentToPrinter'),
      description: t('printingLocationLabels', { count: selectedLocations.size }),
    });
    
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Printer className="h-4 w-4 mr-2" />
          {t('printLabels')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('printLocationLabels')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Type Selection */}
          <div>
            <h3 className="text-sm font-medium mb-2">Select Location Types</h3>
            <div className="flex flex-wrap gap-2">
              {Object.keys(locationsByType).map(type => (
                <Badge
                  key={type}
                  variant={selectedTypes.has(type) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleType(type)}
                >
                  {type} ({locationsByType[type].length})
                </Badge>
              ))}
            </div>
          </div>

          {/* Location List */}
          <div>
            <h3 className="text-sm font-medium mb-2">
              Select Locations ({selectedLocations.size} selected)
            </h3>
            <ScrollArea className="h-96 border rounded p-4">
              {Object.entries(locationsByType).map(([type, locs]) => (
                selectedTypes.has(type) && (
                  <div key={type} className="mb-4">
                    <h4 className="font-medium mb-2">{type}</h4>
                    <div className="space-y-2">
                      {locs.map(loc => (
                        <div key={loc.id} className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedLocations.has(loc.id)}
                            onCheckedChange={() => toggleLocation(loc.id)}
                          />
                          <label className="text-sm flex-1 cursor-pointer">
                            {loc.address}
                          </label>
                          <div className="flex gap-1">
                            {loc.pickable ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <X className="h-3 w-3 text-red-500" />
                            )}
                            {loc.putawayAllowed ? (
                              <Check className="h-3 w-3 text-blue-500" />
                            ) : (
                              <X className="h-3 w-3 text-orange-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </ScrollArea>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button onClick={handlePrint} className="flex-1">
            <Printer className="h-4 w-4 mr-2" />
            Print {selectedLocations.size} Labels
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}