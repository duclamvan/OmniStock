import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  Move3d,
  Eye,
  EyeOff,
  Maximize2,
  Home
} from "lucide-react";
import type { WarehouseLocation } from "@shared/schema";

interface Warehouse3DViewProps {
  locations: WarehouseLocation[];
  selectedLocation?: WarehouseLocation | null;
  onLocationSelect?: (location: WarehouseLocation) => void;
}

export function Warehouse3DView({ 
  locations, 
  selectedLocation, 
  onLocationSelect 
}: Warehouse3DViewProps) {
  const { t } = useTranslation(['warehouse']);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ x: 30, y: 45 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showLabels, setShowLabels] = useState(true);
  const [viewMode, setViewMode] = useState<"perspective" | "top" | "front" | "side">("perspective");

  // Group locations by type and hierarchy
  const groupedLocations = {
    zones: locations.filter(l => l.type === "ZONE"),
    aisles: locations.filter(l => l.type === "AISLE"),
    racks: locations.filter(l => l.type === "RACK"),
    shelves: locations.filter(l => l.type === "SHELF"),
    bins: locations.filter(l => l.type === "BIN")
  };

  // Calculate 3D positions based on location hierarchy
  const calculate3DPosition = (location: WarehouseLocation) => {
    const baseSize = 100;
    let x = 0, y = 0, z = 0;
    let width = baseSize, height = baseSize, depth = baseSize;

    switch (location.type) {
      case "ZONE":
        const zoneIndex = groupedLocations.zones.findIndex(z => z.id === location.id);
        x = zoneIndex * baseSize * 3;
        width = baseSize * 2.5;
        height = baseSize * 0.1;
        depth = baseSize * 2.5;
        break;
      
      case "AISLE":
        const parentZone = groupedLocations.zones.find(z => z.id === location.parentId);
        const zoneIdx = groupedLocations.zones.findIndex(z => z.id === location.parentId);
        const aisleIndex = groupedLocations.aisles
          .filter(a => a.parentId === location.parentId)
          .findIndex(a => a.id === location.id);
        x = zoneIdx * baseSize * 3 + aisleIndex * baseSize;
        z = baseSize * 0.5;
        width = baseSize * 0.8;
        height = baseSize * 0.05;
        depth = baseSize * 2;
        break;
      
      case "RACK":
        const rackAisle = groupedLocations.aisles.find(a => a.id === location.parentId);
        const rackIndex = groupedLocations.racks
          .filter(r => r.parentId === location.parentId)
          .findIndex(r => r.id === location.id);
        x = rackIndex * baseSize * 0.5;
        y = baseSize * 0.2;
        z = rackIndex * baseSize * 0.3;
        width = baseSize * 0.4;
        height = baseSize * 1.5;
        depth = baseSize * 0.3;
        break;
      
      case "SHELF":
        const shelfIndex = groupedLocations.shelves
          .filter(s => s.parentId === location.parentId)
          .findIndex(s => s.id === location.id);
        y = baseSize * 0.3 + shelfIndex * baseSize * 0.3;
        width = baseSize * 0.35;
        height = baseSize * 0.08;
        depth = baseSize * 0.25;
        break;
      
      case "BIN":
        const binIndex = groupedLocations.bins
          .filter(b => b.parentId === location.parentId)
          .findIndex(b => b.id === location.id);
        x = (binIndex % 3) * baseSize * 0.12;
        z = Math.floor(binIndex / 3) * baseSize * 0.12;
        width = baseSize * 0.1;
        height = baseSize * 0.1;
        depth = baseSize * 0.1;
        break;
    }

    return { x, y, z, width, height, depth };
  };

  // Draw 3D warehouse
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up transformation
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, zoom);

    // Draw grid floor
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let i = -10; i <= 10; i++) {
      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(-500, i * gridSize);
      ctx.lineTo(500, i * gridSize);
      ctx.stroke();
      
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(i * gridSize, -500);
      ctx.lineTo(i * gridSize, 500);
      ctx.stroke();
    }

    // Draw locations
    locations.forEach(location => {
      const pos = calculate3DPosition(location);
      
      // Apply rotation transformation
      const rotX = rotation.x * Math.PI / 180;
      const rotY = rotation.y * Math.PI / 180;
      
      // Simple 3D to 2D projection
      const x2d = pos.x * Math.cos(rotY) - pos.z * Math.sin(rotY);
      const z2d = pos.x * Math.sin(rotY) + pos.z * Math.cos(rotY);
      const y2d = pos.y * Math.cos(rotX) - z2d * Math.sin(rotX);
      
      // Draw the box
      ctx.fillStyle = getLocationColor(location);
      ctx.globalAlpha = location.id === selectedLocation?.id ? 1 : 0.8;
      
      // Draw front face
      ctx.fillRect(x2d - pos.width/2, y2d - pos.height/2, pos.width, pos.height);
      
      // Draw outline
      ctx.strokeStyle = location.id === selectedLocation?.id ? "#3b82f6" : "#6b7280";
      ctx.lineWidth = location.id === selectedLocation?.id ? 3 : 1;
      ctx.strokeRect(x2d - pos.width/2, y2d - pos.height/2, pos.width, pos.height);
      
      // Draw label
      if (showLabels) {
        ctx.fillStyle = "#1f2937";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(location.code, x2d, y2d);
      }
      
      // Draw occupancy indicator for bins
      if (location.type === "BIN" && location.currentOccupancy !== undefined) {
        const occupancyColor = getOccupancyColor(location.currentOccupancy);
        ctx.fillStyle = occupancyColor;
        ctx.beginPath();
        ctx.arc(x2d + pos.width/2 - 5, y2d - pos.height/2 + 5, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.restore();
  }, [locations, rotation, zoom, selectedLocation, showLabels]);

  // Get color based on location type
  const getLocationColor = (location: WarehouseLocation) => {
    const colors: Record<string, string> = {
      ZONE: "#10b98133",
      AISLE: "#3b82f633",
      RACK: "#f59e0b55",
      SHELF: "#8b5cf655",
      BIN: "#ec489955"
    };
    return colors[location.type] || "#94a3b8";
  };

  // Get color based on occupancy
  const getOccupancyColor = (occupancy: number) => {
    if (occupancy >= 90) return "#ef4444";
    if (occupancy >= 70) return "#f59e0b";
    if (occupancy >= 50) return "#eab308";
    return "#10b981";
  };

  // Handle mouse interactions
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    setRotation({
      x: Math.max(-90, Math.min(90, rotation.x + deltaY * 0.5)),
      y: rotation.y + deltaX * 0.5
    });
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle view presets
  const setViewPreset = (preset: string) => {
    switch (preset) {
      case "top":
        setRotation({ x: 90, y: 0 });
        break;
      case "front":
        setRotation({ x: 0, y: 0 });
        break;
      case "side":
        setRotation({ x: 0, y: 90 });
        break;
      case "perspective":
      default:
        setRotation({ x: 30, y: 45 });
        break;
    }
    setViewMode(preset as any);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Move3d className="h-5 w-5" />
            {t('warehouse:warehouse3DView')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={showLabels ? "default" : "outline"}
              size="icon"
              onClick={() => setShowLabels(!showLabels)}
            >
              {showLabels ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom(1)}
            >
              <Home className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* View Controls */}
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant={viewMode === "perspective" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewPreset("perspective")}
          >
            Perspective
          </Button>
          <Button
            variant={viewMode === "top" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewPreset("top")}
          >
            Top
          </Button>
          <Button
            variant={viewMode === "front" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewPreset("front")}
          >
            Front
          </Button>
          <Button
            variant={viewMode === "side" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewPreset("side")}
          >
            Side
          </Button>
          
          <div className="flex-1" />
          
          <div className="flex items-center gap-2">
            <ZoomOut className="h-4 w-4 text-gray-500" />
            <Slider
              value={[zoom]}
              onValueChange={([value]) => setZoom(value)}
              min={0.5}
              max={2}
              step={0.1}
              className="w-32"
            />
            <ZoomIn className="h-4 w-4 text-gray-500" />
          </div>
        </div>

        {/* 3D Canvas */}
        <div className="relative border rounded-lg overflow-hidden bg-gray-50">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          
          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg">
            <div className="text-xs font-medium mb-2">Location Types</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500/20 border border-emerald-500 rounded" />
                <span className="text-xs">Zone</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500/20 border border-blue-500 rounded" />
                <span className="text-xs">Aisle</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500/30 border border-amber-500 rounded" />
                <span className="text-xs">Rack</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500/30 border border-purple-500 rounded" />
                <span className="text-xs">Shelf</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-pink-500/30 border border-pink-500 rounded" />
                <span className="text-xs">Bin</span>
              </div>
            </div>
          </div>
          
          {/* Controls hint */}
          <div className="absolute top-4 right-4 bg-white/90 px-3 py-2 rounded-lg">
            <div className="text-xs text-gray-600">
              <RotateCw className="h-3 w-3 inline mr-1" />
              Drag to rotate
            </div>
          </div>
        </div>

        {/* Selected Location Info */}
        {selectedLocation && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{selectedLocation.address}</div>
                <div className="text-xs text-gray-600">
                  Type: {selectedLocation.type} | Code: {selectedLocation.code}
                </div>
              </div>
              {selectedLocation.currentOccupancy !== undefined && (
                <Badge variant={selectedLocation.currentOccupancy > 80 ? "destructive" : "secondary"}>
                  {selectedLocation.currentOccupancy}% Full
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}