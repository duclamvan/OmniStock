import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Search, Map, Boxes, Printer, Plus, ScanLine, Package, Thermometer, AlertTriangle, ArrowLeft } from "lucide-react";
import type { WarehouseLocation, InventoryBalance } from "@shared/schema";
import { LocationTree } from "@/features/warehouse/LocationTree";
import { RackGrid } from "@/features/warehouse/RackGrid";
import { BinDetails } from "@/features/warehouse/BinDetails";
import { GenerateLayoutDialog } from "@/features/warehouse/GenerateLayoutDialog";
import { PrintLabelsDialog } from "@/features/warehouse/PrintLabelsDialog";
import { PutawayMini } from "@/features/putaway/PutawayMini";
import { LayoutDesigner } from "@/features/warehouse/LayoutDesigner";
import { AdvancedLayoutDesigner } from "@/features/warehouse/AdvancedLayoutDesigner";
import { Warehouse3DView } from "@/features/warehouse/Warehouse3DView";
import { MockupWarehouseLayout } from "@/features/warehouse/MockupWarehouseLayout";

export default function WarehouseMap() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(id || "WH1");
  const [selectedLocation, setSelectedLocation] = useState<WarehouseLocation | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("mockup");
  const isSubpage = !!id;

  // Fetch warehouses
  const { data: warehouses } = useQuery({
    queryKey: ["/api/warehouses"],
  });

  // Fetch specific warehouse if on subpage
  const { data: currentWarehouse } = useQuery({
    queryKey: [`/api/warehouses/${id}`],
    enabled: !!id,
  });

  // Use warehouse from params or first available
  useEffect(() => {
    if (id) {
      setSelectedWarehouse(id);
    } else if (warehouses && warehouses.length > 0 && !selectedWarehouse) {
      setSelectedWarehouse(warehouses[0].code || warehouses[0].id);
    }
  }, [id, warehouses]);

  // Fetch locations for selected warehouse
  const { data: locations, isLoading } = useQuery({
    queryKey: [`/api/warehouses/${selectedWarehouse}/locations`, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);
      const response = await fetch(`/api/warehouses/${selectedWarehouse}/locations?${params}`);
      if (!response.ok) throw new Error("Failed to fetch locations");
      return response.json();
    },
    enabled: !!selectedWarehouse,
  });

  // Handle location selection
  const handleLocationSelect = (location: WarehouseLocation) => {
    setSelectedLocation(location);
    if (location.type === "BIN") {
      setDetailsOpen(true);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        document.getElementById("location-search")?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, []);

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          {isSubpage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/warehouses/${id}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Map className="h-8 w-8" />
              {isSubpage && currentWarehouse ? `${currentWarehouse.name} - Mapping` : 'Warehouse Mapping'}
            </h1>
            <p className="text-gray-500 mt-1">Interactive warehouse location management</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <GenerateLayoutDialog warehouseCode={selectedWarehouse} />
          <PrintLabelsDialog warehouseCode={selectedWarehouse} locations={locations || []} />
          <Button variant="outline" size="sm">
            <Package className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Warehouse Selector */}
      <div className="mb-4">
        <div className="flex gap-2">
          {warehouses?.map((warehouse: any) => (
            <Button
              key={warehouse.id}
              variant={selectedWarehouse === (warehouse.code || warehouse.id) ? "default" : "outline"}
              onClick={() => setSelectedWarehouse(warehouse.code || warehouse.id)}
              size="sm"
            >
              {warehouse.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          id="location-search"
          placeholder="Search locations (Press / to focus)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="mockup">Sample Layout</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
          <TabsTrigger value="3d">3D View</TabsTrigger>
          <TabsTrigger value="designer">Layout Designer</TabsTrigger>
          <TabsTrigger value="advanced-designer">Advanced Designer</TabsTrigger>
          <TabsTrigger value="putaway">Putaway</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="mockup">
          <MockupWarehouseLayout />
        </TabsContent>

        <TabsContent value="map">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Left: Location Tree */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Zones & Aisles</CardTitle>
                </CardHeader>
                <CardContent>
                  <LocationTree
                    locations={locations || []}
                    onSelect={handleLocationSelect}
                    selectedId={selectedLocation?.id}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Center: Rack Grid */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Rack Layout</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center h-96">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <RackGrid
                      locations={locations || []}
                      onLocationSelect={handleLocationSelect}
                      selectedLocation={selectedLocation}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="3d">
          <Warehouse3DView 
            locations={locations || []} 
            selectedLocation={selectedLocation}
            onLocationSelect={handleLocationSelect}
          />
        </TabsContent>

        <TabsContent value="putaway">
          <PutawayMini />
        </TabsContent>

        <TabsContent value="designer">
          <Card className="p-0">
            <LayoutDesigner warehouseCode={selectedWarehouse} />
          </Card>
        </TabsContent>

        <TabsContent value="advanced-designer">
          <div className="h-[800px]">
            <AdvancedLayoutDesigner warehouseCode={selectedWarehouse} />
          </div>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Inventory by Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {locations?.filter(loc => loc.type === "BIN").map((location) => (
                  <div key={location.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{location.address}</div>
                      <div className="text-sm text-gray-500">
                        Occupancy: {location.currentOccupancy}%
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {location.temperature && (
                        <Badge variant="secondary">
                          <Thermometer className="h-3 w-3 mr-1" />
                          {location.temperature}
                        </Badge>
                      )}
                      {location.hazmat && (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Hazmat
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bin Details Sheet */}
      {selectedLocation && (
        <BinDetails
          location={selectedLocation}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          onUpdate={(updates) => {
            // Update location
            queryClient.invalidateQueries({ queryKey: [`/api/warehouses/${selectedWarehouse}/locations`] });
          }}
        />
      )}
    </div>
  );
}