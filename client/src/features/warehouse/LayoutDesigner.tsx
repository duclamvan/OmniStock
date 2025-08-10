import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Square, 
  Grid3X3, 
  Layers, 
  Package, 
  Save, 
  Trash2, 
  Copy,
  Move,
  Plus,
  Download,
  Upload,
  RotateCw,
  Settings,
  Palette
} from "lucide-react";
import type { WarehouseLocation } from "@shared/schema";

interface DesignElement {
  id: string;
  type: "ZONE" | "AISLE" | "RACK" | "SHELF" | "BIN";
  x: number;
  y: number;
  width: number;
  height: number;
  code: string;
  color: string;
  rotation: number;
  parentId?: string;
  children?: string[];
}

interface DragState {
  isDragging: boolean;
  elementId: string | null;
  offsetX: number;
  offsetY: number;
  isCreating: boolean;
  createType: string | null;
  startX: number;
  startY: number;
}

const GRID_SIZE = 20;
const COLORS = {
  ZONE: "#10b981",
  AISLE: "#3b82f6",
  RACK: "#f59e0b",
  SHELF: "#8b5cf6",
  BIN: "#ec4899"
};

export function LayoutDesigner({ warehouseCode }: { warehouseCode: string }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [elements, setElements] = useState<DesignElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<DesignElement | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    elementId: null,
    offsetX: 0,
    offsetY: 0,
    isCreating: false,
    createType: null,
    startX: 0,
    startY: 0
  });
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [showProperties, setShowProperties] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  // Auto-save with debounce
  useEffect(() => {
    if (!autoSaveEnabled || elements.length === 0) return;
    
    const timeoutId = setTimeout(() => {
      saveLayoutMutation.mutate();
    }, 2000); // Auto-save 2 seconds after last edit

    return () => clearTimeout(timeoutId);
  }, [elements, autoSaveEnabled]);

  // Initialize with sample layout
  useEffect(() => {
    if (elements.length === 0) {
      const sampleElements: DesignElement[] = [
        // Zone A
        {
          id: "zone-a",
          type: "ZONE",
          x: 100,
          y: 100,
          width: 300,
          height: 200,
          code: "A",
          color: COLORS.ZONE,
          rotation: 0,
          children: ["aisle-a1", "aisle-a2"]
        },
        // Aisle A1 in Zone A
        {
          id: "aisle-a1",
          type: "AISLE",
          x: 120,
          y: 120,
          width: 60,
          height: 160,
          code: "A01",
          color: COLORS.AISLE,
          rotation: 0,
          parentId: "zone-a",
          children: ["rack-a1-1", "rack-a1-2"]
        },
        // Rack A1-1
        {
          id: "rack-a1-1",
          type: "RACK",
          x: 130,
          y: 130,
          width: 40,
          height: 60,
          code: "R01",
          color: COLORS.RACK,
          rotation: 0,
          parentId: "aisle-a1",
          children: ["shelf-a1-1-1", "shelf-a1-1-2"]
        },
        // Shelf A1-1-1
        {
          id: "shelf-a1-1-1",
          type: "SHELF",
          x: 135,
          y: 135,
          width: 30,
          height: 15,
          code: "S01",
          color: COLORS.SHELF,
          rotation: 0,
          parentId: "rack-a1-1",
          children: ["bin-a1-1-1-1", "bin-a1-1-1-2"]
        },
        // Bins
        {
          id: "bin-a1-1-1-1",
          type: "BIN",
          x: 140,
          y: 140,
          width: 8,
          height: 8,
          code: "B01",
          color: COLORS.BIN,
          rotation: 0,
          parentId: "shelf-a1-1-1"
        },
        {
          id: "bin-a1-1-1-2",
          type: "BIN",
          x: 152,
          y: 140,
          width: 8,
          height: 8,
          code: "B02",
          color: COLORS.BIN,
          rotation: 0,
          parentId: "shelf-a1-1-1"
        },
        // Zone B
        {
          id: "zone-b",
          type: "ZONE",
          x: 500,
          y: 100,
          width: 250,
          height: 180,
          code: "B",
          color: COLORS.ZONE,
          rotation: 0,
          children: ["aisle-b1"]
        },
        // Aisle B1 in Zone B
        {
          id: "aisle-b1",
          type: "AISLE",
          x: 520,
          y: 120,
          width: 50,
          height: 140,
          code: "B01",
          color: COLORS.AISLE,
          rotation: 0,
          parentId: "zone-b",
          children: ["rack-b1-1"]
        },
        // Rack B1-1
        {
          id: "rack-b1-1",
          type: "RACK",
          x: 530,
          y: 130,
          width: 30,
          height: 80,
          code: "R01",
          color: COLORS.RACK,
          rotation: 0,
          parentId: "aisle-b1"
        }
      ];
      setElements(sampleElements);
    }
  }, []);

  // Save layout mutation
  const saveLayoutMutation = useMutation({
    mutationFn: async () => {
      const locations = convertElementsToLocations(elements);
      const response = await fetch(`/api/warehouses/${warehouseCode}/locations/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ locations })
      });
      if (!response.ok) throw new Error("Failed to save layout");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Layout saved successfully"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/warehouses/${warehouseCode}/locations`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save layout",
        variant: "destructive"
      });
    }
  });

  // Convert design elements to warehouse locations
  const convertElementsToLocations = (elements: DesignElement[]) => {
    return elements.map((element, index) => ({
      warehouseId: warehouseCode,
      parentId: element.parentId || null,
      type: element.type,
      code: element.code,
      address: generateAddress(element, elements),
      sortKey: index + 1,
      pickable: true,
      putawayAllowed: true
    }));
  };

  const generateAddress = (element: DesignElement, allElements: DesignElement[]): string => {
    let address = warehouseCode;
    let current = element;
    const path = [];
    
    while (current) {
      path.unshift(current.code);
      if (current.parentId) {
        current = allElements.find(e => e.id === current.parentId)!;
      } else {
        break;
      }
    }
    
    return `${address}-${path.join("-")}`;
  };

  // Snap position to grid
  const snapToGridPosition = (value: number) => {
    if (!snapToGrid) return value;
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };

  // Handle mouse down on canvas
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    // Check if clicking on an element
    const clickedElement = elements.find(el => 
      x >= el.x && x <= el.x + el.width &&
      y >= el.y && y <= el.y + el.height
    );
    
    if (clickedElement) {
      setSelectedElement(clickedElement);
      setDragState({
        ...dragState,
        isDragging: true,
        elementId: clickedElement.id,
        offsetX: x - clickedElement.x,
        offsetY: y - clickedElement.y
      });
    } else if (dragState.createType) {
      // Start creating new element
      setDragState({
        ...dragState,
        isCreating: true,
        startX: snapToGridPosition(x),
        startY: snapToGridPosition(y)
      });
    } else {
      setSelectedElement(null);
    }
  };

  // Handle mouse move
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    if (dragState.isDragging && dragState.elementId) {
      // Move existing element with instant save trigger
      setElements(prev => {
        const updated = prev.map(el => 
          el.id === dragState.elementId
            ? {
                ...el,
                x: snapToGridPosition(x - dragState.offsetX),
                y: snapToGridPosition(y - dragState.offsetY)
              }
            : el
        );
        return updated;
      });
    } else if (dragState.isCreating && dragState.createType) {
      // Preview new element being created
      const width = Math.abs(x - dragState.startX);
      const height = Math.abs(y - dragState.startY);
      // Visual feedback would be shown here
    }
  };

  // Handle mouse up
  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    if (dragState.isCreating && dragState.createType) {
      // Create new element
      const width = Math.abs(x - dragState.startX);
      const height = Math.abs(y - dragState.startY);
      
      if (width > 10 && height > 10) {
        const newElement: DesignElement = {
          id: `${dragState.createType}-${Date.now()}`,
          type: dragState.createType as any,
          x: Math.min(dragState.startX, x),
          y: Math.min(dragState.startY, y),
          width: snapToGridPosition(width),
          height: snapToGridPosition(height),
          code: `${dragState.createType}-${elements.length + 1}`,
          color: COLORS[dragState.createType as keyof typeof COLORS],
          rotation: 0
        };
        
        setElements([...elements, newElement]);
        setSelectedElement(newElement);
      }
    }
    
    setDragState({
      isDragging: false,
      elementId: null,
      offsetX: 0,
      offsetY: 0,
      isCreating: false,
      createType: dragState.createType,
      startX: 0,
      startY: 0
    });
  };

  // Delete selected element
  const deleteSelectedElement = () => {
    if (selectedElement) {
      setElements(prev => prev.filter(el => el.id !== selectedElement.id));
      setSelectedElement(null);
    }
  };

  // Duplicate selected element
  const duplicateSelectedElement = () => {
    if (selectedElement) {
      const newElement: DesignElement = {
        ...selectedElement,
        id: `${selectedElement.type}-${Date.now()}`,
        x: selectedElement.x + 20,
        y: selectedElement.y + 20,
        code: `${selectedElement.code}-copy`
      };
      setElements([...elements, newElement]);
      setSelectedElement(newElement);
    }
  };

  // Export layout as JSON
  const exportLayout = () => {
    const dataStr = JSON.stringify(elements, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `warehouse-layout-${warehouseCode}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Import layout from JSON
  const importLayout = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          setElements(imported);
          toast({
            title: "Success",
            description: "Layout imported successfully"
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Invalid layout file",
            variant: "destructive"
          });
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="h-full">
      {/* Toolbar */}
      <div className="border-b p-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={dragState.createType === "ZONE" ? "default" : "outline"}
              size="sm"
              onClick={() => setDragState({ ...dragState, createType: "ZONE" })}
            >
              <Square className="h-4 w-4 mr-2" />
              Zone
            </Button>
            <Button
              variant={dragState.createType === "AISLE" ? "default" : "outline"}
              size="sm"
              onClick={() => setDragState({ ...dragState, createType: "AISLE" })}
            >
              <Grid3X3 className="h-4 w-4 mr-2" />
              Aisle
            </Button>
            <Button
              variant={dragState.createType === "RACK" ? "default" : "outline"}
              size="sm"
              onClick={() => setDragState({ ...dragState, createType: "RACK" })}
            >
              <Layers className="h-4 w-4 mr-2" />
              Rack
            </Button>
            <Button
              variant={dragState.createType === "SHELF" ? "default" : "outline"}
              size="sm"
              onClick={() => setDragState({ ...dragState, createType: "SHELF" })}
            >
              <Package className="h-4 w-4 mr-2" />
              Shelf
            </Button>
            <Button
              variant={dragState.createType === "BIN" ? "default" : "outline"}
              size="sm"
              onClick={() => setDragState({ ...dragState, createType: "BIN" })}
            >
              <Package className="h-4 w-4 mr-2" />
              Bin
            </Button>
            
            <div className="border-l mx-2 h-6" />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGrid(!showGrid)}
            >
              Grid
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSnapToGrid(!snapToGrid)}
            >
              Snap
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(zoom === 1 ? 0.75 : zoom === 0.75 ? 1.25 : 1)}
            >
              {Math.round(zoom * 100)}%
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded border">
              <Label htmlFor="auto-save" className="text-xs">Auto-save</Label>
              <input
                id="auto-save"
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                className="w-3 h-3"
              />
              {saveLayoutMutation.isPending && (
                <div className="text-xs text-blue-500">Saving...</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedElement && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={duplicateSelectedElement}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deleteSelectedElement}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProperties(!showProperties)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </>
            )}
            
            <div className="border-l mx-2 h-6" />
            
            <Button
              variant="outline"
              size="sm"
              onClick={exportLayout}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <label htmlFor="import-layout" className="inline-block">
              <div className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </div>
            </label>
            <input
              id="import-layout"
              type="file"
              accept=".json"
              className="hidden"
              onChange={importLayout}
            />
            <Button
              variant="default"
              size="sm"
              onClick={() => saveLayoutMutation.mutate()}
              disabled={saveLayoutMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Layout
            </Button>
          </div>
        </div>
      </div>
      
      {/* Canvas and Properties Panel */}
      <div className="flex h-[calc(100%-4rem)]">
        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-gray-50 p-4">
          <div
            ref={canvasRef}
            className="relative bg-white border-2 border-gray-300 rounded-lg"
            style={{
              width: "2000px",
              height: "1500px",
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              backgroundImage: showGrid
                ? `repeating-linear-gradient(0deg, #f3f4f6 0px, transparent 1px, transparent ${GRID_SIZE}px, #f3f4f6 ${GRID_SIZE}px),
                   repeating-linear-gradient(90deg, #f3f4f6 0px, transparent 1px, transparent ${GRID_SIZE}px, #f3f4f6 ${GRID_SIZE}px)`
                : "none",
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
              cursor: dragState.createType ? "crosshair" : "default"
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
          >
            {/* Render elements */}
            {elements.map(element => (
              <div
                key={element.id}
                className={`absolute border-2 flex items-center justify-center text-white font-medium rounded cursor-move transition-all ${
                  selectedElement?.id === element.id ? "ring-2 ring-blue-500 ring-offset-2" : ""
                }`}
                style={{
                  left: `${element.x}px`,
                  top: `${element.y}px`,
                  width: `${element.width}px`,
                  height: `${element.height}px`,
                  backgroundColor: element.color,
                  opacity: 0.8,
                  transform: `rotate(${element.rotation}deg)`
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedElement(element);
                }}
              >
                <div className="text-center">
                  <div className="text-xs uppercase">{element.type}</div>
                  <div className="text-sm font-bold">{element.code}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Properties Panel */}
        {showProperties && selectedElement && (
          <div className="w-80 bg-white border-l p-4 overflow-y-auto">
            <h3 className="font-semibold mb-4">Properties</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="element-code">Code</Label>
                <Input
                  id="element-code"
                  value={selectedElement.code}
                  onChange={(e) => {
                    const newCode = e.target.value;
                    setElements(prev => prev.map(el =>
                      el.id === selectedElement.id
                        ? { ...el, code: newCode }
                        : el
                    ));
                    setSelectedElement({ ...selectedElement, code: newCode });
                  }}
                />
              </div>
              
              <div>
                <Label htmlFor="element-type">Type</Label>
                <Select
                  value={selectedElement.type}
                  onValueChange={(value) => {
                    setElements(prev => prev.map(el =>
                      el.id === selectedElement.id
                        ? { ...el, type: value as any, color: COLORS[value as keyof typeof COLORS] }
                        : el
                    ));
                    setSelectedElement({ 
                      ...selectedElement, 
                      type: value as any,
                      color: COLORS[value as keyof typeof COLORS]
                    });
                  }}
                >
                  <SelectTrigger id="element-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ZONE">Zone</SelectItem>
                    <SelectItem value="AISLE">Aisle</SelectItem>
                    <SelectItem value="RACK">Rack</SelectItem>
                    <SelectItem value="SHELF">Shelf</SelectItem>
                    <SelectItem value="BIN">Bin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="element-x">X Position</Label>
                  <Input
                    id="element-x"
                    type="number"
                    value={selectedElement.x}
                    onChange={(e) => {
                      const x = parseInt(e.target.value) || 0;
                      setElements(prev => prev.map(el =>
                        el.id === selectedElement.id ? { ...el, x } : el
                      ));
                      setSelectedElement({ ...selectedElement, x });
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="element-y">Y Position</Label>
                  <Input
                    id="element-y"
                    type="number"
                    value={selectedElement.y}
                    onChange={(e) => {
                      const y = parseInt(e.target.value) || 0;
                      setElements(prev => prev.map(el =>
                        el.id === selectedElement.id ? { ...el, y } : el
                      ));
                      setSelectedElement({ ...selectedElement, y });
                    }}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="element-width">Width</Label>
                  <Input
                    id="element-width"
                    type="number"
                    value={selectedElement.width}
                    onChange={(e) => {
                      const width = parseInt(e.target.value) || 0;
                      setElements(prev => prev.map(el =>
                        el.id === selectedElement.id ? { ...el, width } : el
                      ));
                      setSelectedElement({ ...selectedElement, width });
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="element-height">Height</Label>
                  <Input
                    id="element-height"
                    type="number"
                    value={selectedElement.height}
                    onChange={(e) => {
                      const height = parseInt(e.target.value) || 0;
                      setElements(prev => prev.map(el =>
                        el.id === selectedElement.id ? { ...el, height } : el
                      ));
                      setSelectedElement({ ...selectedElement, height });
                    }}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="element-rotation">Rotation (degrees)</Label>
                <Input
                  id="element-rotation"
                  type="number"
                  value={selectedElement.rotation}
                  onChange={(e) => {
                    const rotation = parseInt(e.target.value) || 0;
                    setElements(prev => prev.map(el =>
                      el.id === selectedElement.id ? { ...el, rotation } : el
                    ));
                    setSelectedElement({ ...selectedElement, rotation });
                  }}
                />
              </div>
              
              <div>
                <Label htmlFor="element-color">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="element-color"
                    type="color"
                    value={selectedElement.color}
                    onChange={(e) => {
                      setElements(prev => prev.map(el =>
                        el.id === selectedElement.id
                          ? { ...el, color: e.target.value }
                          : el
                      ));
                      setSelectedElement({ ...selectedElement, color: e.target.value });
                    }}
                    className="w-20"
                  />
                  <Input
                    value={selectedElement.color}
                    onChange={(e) => {
                      setElements(prev => prev.map(el =>
                        el.id === selectedElement.id
                          ? { ...el, color: e.target.value }
                          : el
                      ));
                      setSelectedElement({ ...selectedElement, color: e.target.value });
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}