import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WarehouseLocation } from "@shared/schema";

interface RackGridProps {
  locations: WarehouseLocation[];
  onLocationSelect: (location: WarehouseLocation) => void;
  selectedLocation: WarehouseLocation | null;
}

export function RackGrid({ locations, onLocationSelect, selectedLocation }: RackGridProps) {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [selectedAisle, setSelectedAisle] = useState<string | null>(null);
  const [selectedRack, setSelectedRack] = useState<string | null>(null);

  // Get zones
  const zones = locations.filter(l => l.type === "ZONE");
  
  // Get aisles for selected zone
  const aisles = selectedZone 
    ? locations.filter(l => l.type === "AISLE" && l.parentId === selectedZone)
    : [];
  
  // Get racks for selected aisle
  const racks = selectedAisle
    ? locations.filter(l => l.type === "RACK" && l.parentId === selectedAisle)
    : [];
  
  // Get shelves for selected rack
  const shelves = selectedRack
    ? locations.filter(l => l.type === "SHELF" && l.parentId === selectedRack)
    : [];

  // Get bins for each shelf
  const getBinsForShelf = (shelfId: string) => {
    return locations.filter(l => l.type === "BIN" && l.parentId === shelfId);
  };

  const getOccupancyColor = (occupancy: number) => {
    if (occupancy < 30) return "bg-green-100 hover:bg-green-200";
    if (occupancy < 70) return "bg-yellow-100 hover:bg-yellow-200";
    return "bg-red-100 hover:bg-red-200";
  };

  return (
    <div className="space-y-4">
      {/* Zone Selection */}
      <div>
        <h3 className="text-sm font-medium mb-2">Select Zone</h3>
        <div className="flex flex-wrap gap-2">
          {zones.map(zone => (
            <Card
              key={zone.id}
              className={cn(
                "p-3 cursor-pointer transition-all",
                selectedZone === zone.id ? "ring-2 ring-primary" : "hover:shadow-md"
              )}
              onClick={() => {
                setSelectedZone(zone.id);
                setSelectedAisle(null);
                setSelectedRack(null);
              }}
            >
              <div className="font-medium">{zone.code}</div>
              <div className="text-xs text-gray-500 mt-1">Zone</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Aisle Selection */}
      {selectedZone && aisles.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">Select Aisle</h3>
          <div className="flex flex-wrap gap-2">
            {aisles.map(aisle => (
              <Card
                key={aisle.id}
                className={cn(
                  "p-3 cursor-pointer transition-all",
                  selectedAisle === aisle.id ? "ring-2 ring-primary" : "hover:shadow-md"
                )}
                onClick={() => {
                  setSelectedAisle(aisle.id);
                  setSelectedRack(null);
                }}
              >
                <div className="font-medium">{aisle.code}</div>
                <div className="text-xs text-gray-500 mt-1">Aisle</div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Rack Selection */}
      {selectedAisle && racks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">Select Rack</h3>
          <div className="flex flex-wrap gap-2">
            {racks.map(rack => (
              <Card
                key={rack.id}
                className={cn(
                  "p-3 cursor-pointer transition-all",
                  selectedRack === rack.id ? "ring-2 ring-primary" : "hover:shadow-md"
                )}
                onClick={() => setSelectedRack(rack.id)}
              >
                <div className="font-medium">{rack.code}</div>
                <div className="text-xs text-gray-500 mt-1">Rack</div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Shelf and Bin Grid */}
      {selectedRack && shelves.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">Shelves & Bins</h3>
          <div className="space-y-4">
            {shelves.map(shelf => {
              const bins = getBinsForShelf(shelf.id);
              return (
                <Card key={shelf.id} className="p-4">
                  <div className="font-medium mb-3">{shelf.code}</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                    {bins.map(bin => (
                      <div
                        key={bin.id}
                        className={cn(
                          "p-3 rounded cursor-pointer border transition-all",
                          getOccupancyColor(bin.currentOccupancy || 0),
                          selectedLocation?.id === bin.id && "ring-2 ring-primary"
                        )}
                        onClick={() => onLocationSelect(bin)}
                      >
                        <div className="text-xs font-medium">{bin.code}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {bin.currentOccupancy || 0}%
                        </div>
                        <div className="flex gap-1 mt-1">
                          {!bin.pickable && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              NP
                            </Badge>
                          )}
                          {!bin.putawayAllowed && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              NA
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedZone && (
        <div className="text-center py-12 text-gray-500">
          Select a zone to view its layout
        </div>
      )}
    </div>
  );
}