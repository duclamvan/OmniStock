import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
  Palette,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  FlipHorizontal,
  FlipVertical,
  Group,
  Ungroup,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Hand,
  MousePointer
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
  scaleX: number;
  scaleY: number;
  locked: boolean;
  visible: boolean;
  opacity: number;
  parentId?: string;
  children?: string[];
  metadata?: {
    temperature?: string;
    hazmat?: boolean;
    maxWeight?: number;
    pickable?: boolean;
    putawayAllowed?: boolean;
    notes?: string;
  };
}

interface DesignState {
  elements: DesignElement[];
  selectedIds: string[];
  copiedElements: DesignElement[];
  history: DesignElement[][];
  historyIndex: number;
  groups: Map<string, string[]>;
}

const GRID_SIZE = 10;
const MIN_ELEMENT_SIZE = 20;
const MAX_ELEMENT_SIZE = 500;

const DEFAULT_COLORS = {
  ZONE: "#10b981",
  AISLE: "#3b82f6",
  RACK: "#f59e0b",
  SHELF: "#8b5cf6",
  BIN: "#ec4899"
};

const ELEMENT_PRESETS = {
  ZONE: { width: 200, height: 150 },
  AISLE: { width: 80, height: 200 },
  RACK: { width: 60, height: 120 },
  SHELF: { width: 50, height: 20 },
  BIN: { width: 30, height: 30 }
};

type Tool = "select" | "move" | "create" | "resize";
type CreateType = "ZONE" | "AISLE" | "RACK" | "SHELF" | "BIN";

export function AdvancedLayoutDesigner({ warehouseCode }: { warehouseCode: string }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [createType, setCreateType] = useState<CreateType>("ZONE");
  const [state, setState] = useState<DesignState>({
    elements: [],
    selectedIds: [],
    copiedElements: [],
    history: [[]],
    historyIndex: 0,
    groups: new Map()
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragMode, setDragMode] = useState<"move" | "resize" | "create" | "select">("move");
  const [resizeHandle, setResizeHandle] = useState<string>("");
  const [tempElement, setTempElement] = useState<Partial<DesignElement> | null>(null);
  
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showProperties, setShowProperties] = useState(true);
  const [showLayers, setShowLayers] = useState(true);

  // Save layout mutation
  const saveLayoutMutation = useMutation({
    mutationFn: async () => {
      const locations = convertElementsToLocations(state.elements);
      const response = await fetch(`/api/warehouses/${warehouseCode}/locations/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locations })
      });
      if (!response.ok) throw new Error("Failed to save layout");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Layout saved successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/warehouses/${warehouseCode}/locations`] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save layout", variant: "destructive" });
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
      pickable: element.metadata?.pickable ?? true,
      putawayAllowed: element.metadata?.putawayAllowed ?? true,
      temperature: element.metadata?.temperature,
      hazmat: element.metadata?.hazmat ?? false,
      maxWeight: element.metadata?.maxWeight,
      notes: element.metadata?.notes
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

  // History management
  const pushHistory = useCallback(() => {
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push([...state.elements]);
    setState(prev => ({
      ...prev,
      history: newHistory.slice(-50), // Keep last 50 states
      historyIndex: Math.min(newHistory.length - 1, 49)
    }));
  }, [state.elements, state.history, state.historyIndex]);

  const undo = useCallback(() => {
    if (state.historyIndex > 0) {
      setState(prev => ({
        ...prev,
        elements: [...prev.history[prev.historyIndex - 1]],
        historyIndex: prev.historyIndex - 1,
        selectedIds: []
      }));
    }
  }, [state.historyIndex]);

  const redo = useCallback(() => {
    if (state.historyIndex < state.history.length - 1) {
      setState(prev => ({
        ...prev,
        elements: [...prev.history[prev.historyIndex + 1]],
        historyIndex: prev.historyIndex + 1,
        selectedIds: []
      }));
    }
  }, [state.historyIndex, state.history.length]);

  // Snap position to grid
  const snapToGridPosition = (value: number) => {
    if (!snapToGrid) return value;
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };

  // Get resize handles for selected element
  const getResizeHandles = (element: DesignElement) => {
    const handles = [];
    const positions = [
      { name: "nw", x: element.x, y: element.y },
      { name: "n", x: element.x + element.width / 2, y: element.y },
      { name: "ne", x: element.x + element.width, y: element.y },
      { name: "e", x: element.x + element.width, y: element.y + element.height / 2 },
      { name: "se", x: element.x + element.width, y: element.y + element.height },
      { name: "s", x: element.x + element.width / 2, y: element.y + element.height },
      { name: "sw", x: element.x, y: element.y + element.height },
      { name: "w", x: element.x, y: element.y + element.height / 2 }
    ];
    return positions;
  };

  // Handle mouse down on canvas
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    
    // Check if clicking on resize handle
    if (state.selectedIds.length === 1) {
      const selected = state.elements.find(el => el.id === state.selectedIds[0]);
      if (selected && !selected.locked) {
        const handles = getResizeHandles(selected);
        const handle = handles.find(h => 
          Math.abs(h.x - x) < 5 && Math.abs(h.y - y) < 5
        );
        if (handle) {
          setIsDragging(true);
          setDragMode("resize");
          setResizeHandle(handle.name);
          setDragStart({ x, y });
          return;
        }
      }
    }
    
    // Check if clicking on an element
    const clickedElement = state.elements.find(el => 
      el.visible &&
      x >= el.x && x <= el.x + el.width &&
      y >= el.y && y <= el.y + el.height
    );
    
    if (tool === "select") {
      if (clickedElement) {
        if (e.shiftKey) {
          // Multi-select
          setState(prev => ({
            ...prev,
            selectedIds: prev.selectedIds.includes(clickedElement.id)
              ? prev.selectedIds.filter(id => id !== clickedElement.id)
              : [...prev.selectedIds, clickedElement.id]
          }));
        } else if (!state.selectedIds.includes(clickedElement.id)) {
          setState(prev => ({ ...prev, selectedIds: [clickedElement.id] }));
        }
        
        if (!clickedElement.locked) {
          setIsDragging(true);
          setDragMode("move");
          setDragStart({ x, y });
        }
      } else {
        // Start selection box
        setState(prev => ({ ...prev, selectedIds: [] }));
        setIsDragging(true);
        setDragMode("select");
        setDragStart({ x, y });
      }
    } else if (tool === "create") {
      // Start creating new element
      setIsDragging(true);
      setDragMode("create");
      setDragStart({ x: snapToGridPosition(x), y: snapToGridPosition(y) });
      setTempElement({
        type: createType,
        x: snapToGridPosition(x),
        y: snapToGridPosition(y),
        width: 0,
        height: 0
      });
    }
  };

  // Handle mouse move
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current || !isDragging) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    
    if (dragMode === "move") {
      const deltaX = snapToGridPosition(x - dragStart.x);
      const deltaY = snapToGridPosition(y - dragStart.y);
      
      setState(prev => ({
        ...prev,
        elements: prev.elements.map(el => 
          prev.selectedIds.includes(el.id) && !el.locked
            ? { ...el, x: el.x + deltaX, y: el.y + deltaY }
            : el
        )
      }));
      
      setDragStart({ x, y });
    } else if (dragMode === "resize") {
      const selected = state.elements.find(el => el.id === state.selectedIds[0]);
      if (selected && !selected.locked) {
        let newProps: Partial<DesignElement> = {};
        
        switch (resizeHandle) {
          case "e":
            newProps.width = Math.max(MIN_ELEMENT_SIZE, snapToGridPosition(x - selected.x));
            break;
          case "w":
            const newX = snapToGridPosition(x);
            newProps.x = newX;
            newProps.width = Math.max(MIN_ELEMENT_SIZE, selected.x + selected.width - newX);
            break;
          case "s":
            newProps.height = Math.max(MIN_ELEMENT_SIZE, snapToGridPosition(y - selected.y));
            break;
          case "n":
            const newY = snapToGridPosition(y);
            newProps.y = newY;
            newProps.height = Math.max(MIN_ELEMENT_SIZE, selected.y + selected.height - newY);
            break;
          case "se":
            newProps.width = Math.max(MIN_ELEMENT_SIZE, snapToGridPosition(x - selected.x));
            newProps.height = Math.max(MIN_ELEMENT_SIZE, snapToGridPosition(y - selected.y));
            break;
          case "nw":
            const nwX = snapToGridPosition(x);
            const nwY = snapToGridPosition(y);
            newProps.x = nwX;
            newProps.y = nwY;
            newProps.width = Math.max(MIN_ELEMENT_SIZE, selected.x + selected.width - nwX);
            newProps.height = Math.max(MIN_ELEMENT_SIZE, selected.y + selected.height - nwY);
            break;
        }
        
        setState(prev => ({
          ...prev,
          elements: prev.elements.map(el => 
            el.id === selected.id ? { ...el, ...newProps } : el
          )
        }));
      }
    } else if (dragMode === "create") {
      setTempElement(prev => ({
        ...prev,
        width: Math.abs(x - dragStart.x),
        height: Math.abs(y - dragStart.y),
        x: Math.min(dragStart.x, x),
        y: Math.min(dragStart.y, y)
      }));
    } else if (dragMode === "select") {
      // Selection box logic would go here
    }
  };

  // Handle mouse up
  const handleCanvasMouseUp = () => {
    if (dragMode === "create" && tempElement && tempElement.width! > 10 && tempElement.height! > 10) {
      const newElement: DesignElement = {
        id: `${createType}-${Date.now()}`,
        type: createType,
        x: snapToGridPosition(tempElement.x!),
        y: snapToGridPosition(tempElement.y!),
        width: snapToGridPosition(tempElement.width!),
        height: snapToGridPosition(tempElement.height!),
        code: `${createType}-${state.elements.filter(e => e.type === createType).length + 1}`,
        color: DEFAULT_COLORS[createType],
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        locked: false,
        visible: true,
        opacity: 1,
        metadata: {}
      };
      
      setState(prev => ({
        ...prev,
        elements: [...prev.elements, newElement],
        selectedIds: [newElement.id]
      }));
      pushHistory();
    }
    
    setIsDragging(false);
    setDragMode("move");
    setTempElement(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "z":
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            e.preventDefault();
            break;
          case "c":
            if (state.selectedIds.length > 0) {
              setState(prev => ({
                ...prev,
                copiedElements: prev.elements.filter(el => prev.selectedIds.includes(el.id))
              }));
            }
            e.preventDefault();
            break;
          case "v":
            if (state.copiedElements.length > 0) {
              const newElements = state.copiedElements.map(el => ({
                ...el,
                id: `${el.type}-${Date.now()}-${Math.random()}`,
                x: el.x + 20,
                y: el.y + 20
              }));
              setState(prev => ({
                ...prev,
                elements: [...prev.elements, ...newElements],
                selectedIds: newElements.map(el => el.id)
              }));
              pushHistory();
            }
            e.preventDefault();
            break;
          case "a":
            setState(prev => ({
              ...prev,
              selectedIds: prev.elements.map(el => el.id)
            }));
            e.preventDefault();
            break;
          case "d":
            if (state.selectedIds.length > 0) {
              const selectedElements = state.elements.filter(el => state.selectedIds.includes(el.id));
              const newElements = selectedElements.map(el => ({
                ...el,
                id: `${el.type}-${Date.now()}-${Math.random()}`,
                x: el.x + 20,
                y: el.y + 20
              }));
              setState(prev => ({
                ...prev,
                elements: [...prev.elements, ...newElements],
                selectedIds: newElements.map(el => el.id)
              }));
              pushHistory();
            }
            e.preventDefault();
            break;
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (state.selectedIds.length > 0) {
          setState(prev => ({
            ...prev,
            elements: prev.elements.filter(el => !prev.selectedIds.includes(el.id)),
            selectedIds: []
          }));
          pushHistory();
        }
      } else if (e.key === "Escape") {
        setState(prev => ({ ...prev, selectedIds: [] }));
        setTool("select");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [state, undo, redo, pushHistory]);

  // Alignment functions
  const alignElements = (alignment: string) => {
    if (state.selectedIds.length < 2) return;
    
    const selectedElements = state.elements.filter(el => state.selectedIds.includes(el.id));
    const bounds = {
      minX: Math.min(...selectedElements.map(el => el.x)),
      maxX: Math.max(...selectedElements.map(el => el.x + el.width)),
      minY: Math.min(...selectedElements.map(el => el.y)),
      maxY: Math.max(...selectedElements.map(el => el.y + el.height)),
      centerX: 0,
      centerY: 0
    };
    
    bounds.centerX = (bounds.minX + bounds.maxX) / 2;
    bounds.centerY = (bounds.minY + bounds.maxY) / 2;
    
    setState(prev => ({
      ...prev,
      elements: prev.elements.map(el => {
        if (!prev.selectedIds.includes(el.id) || el.locked) return el;
        
        switch (alignment) {
          case "left":
            return { ...el, x: bounds.minX };
          case "center":
            return { ...el, x: bounds.centerX - el.width / 2 };
          case "right":
            return { ...el, x: bounds.maxX - el.width };
          case "top":
            return { ...el, y: bounds.minY };
          case "middle":
            return { ...el, y: bounds.centerY - el.height / 2 };
          case "bottom":
            return { ...el, y: bounds.maxY - el.height };
          default:
            return el;
        }
      })
    }));
    pushHistory();
  };

  // Export/Import functions
  const exportLayout = () => {
    const dataStr = JSON.stringify(state.elements, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `warehouse-layout-${warehouseCode}-${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importLayout = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          setState(prev => ({ ...prev, elements: imported, selectedIds: [] }));
          pushHistory();
          toast({ title: "Success", description: "Layout imported successfully" });
        } catch (error) {
          toast({ title: "Error", description: "Invalid layout file", variant: "destructive" });
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Toolbar */}
      <div className="border-b p-2 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Tools */}
          <div className="flex items-center gap-1 border-r pr-2 mr-2">
            <Button
              variant={tool === "select" ? "default" : "outline"}
              size="icon"
              onClick={() => setTool("select")}
              title="Select (V)"
            >
              <MousePointer className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === "move" ? "default" : "outline"}
              size="icon"
              onClick={() => setTool("move")}
              title="Move (M)"
            >
              <Hand className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === "create" ? "default" : "outline"}
              size="icon"
              onClick={() => setTool("create")}
              title="Create"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Create Elements */}
          {tool === "create" && (
            <div className="flex items-center gap-1 border-r pr-2 mr-2">
              {Object.keys(DEFAULT_COLORS).map(type => (
                <Button
                  key={type}
                  variant={createType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCreateType(type as CreateType)}
                >
                  {type}
                </Button>
              ))}
            </div>
          )}

          {/* History */}
          <div className="flex items-center gap-1 border-r pr-2 mr-2">
            <Button
              variant="outline"
              size="icon"
              onClick={undo}
              disabled={state.historyIndex === 0}
              title="Undo (Ctrl+Z)"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={redo}
              disabled={state.historyIndex === state.history.length - 1}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>

          {/* Alignment */}
          {state.selectedIds.length > 1 && (
            <div className="flex items-center gap-1 border-r pr-2 mr-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => alignElements("left")}
                title="Align Left"
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => alignElements("center")}
                title="Align Center"
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => alignElements("right")}
                title="Align Right"
              >
                <AlignRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => alignElements("top")}
                title="Align Top"
              >
                <AlignVerticalJustifyStart className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => alignElements("middle")}
                title="Align Middle"
              >
                <AlignVerticalJustifyCenter className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => alignElements("bottom")}
                title="Align Bottom"
              >
                <AlignVerticalJustifyEnd className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* View Options */}
          <div className="flex items-center gap-2">
            <Switch
              checked={showGrid}
              onCheckedChange={setShowGrid}
              id="grid"
            />
            <Label htmlFor="grid" className="text-sm">Grid</Label>
            
            <Switch
              checked={snapToGrid}
              onCheckedChange={setSnapToGrid}
              id="snap"
            />
            <Label htmlFor="snap" className="text-sm">Snap</Label>
            
            <Switch
              checked={showRulers}
              onCheckedChange={setShowRulers}
              id="rulers"
            />
            <Label htmlFor="rulers" className="text-sm">Rulers</Label>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom(Math.min(3, zoom + 0.25))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 border-l pl-2 ml-2">
            <Button variant="outline" size="sm" onClick={exportLayout}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <label htmlFor="import-layout" className="inline-block">
              <div className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3 cursor-pointer">
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
              onClick={() => saveLayoutMutation.mutate()}
              disabled={saveLayoutMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Layers Panel */}
        {showLayers && (
          <div className="w-64 border-r bg-white p-4 overflow-y-auto">
            <h3 className="font-semibold mb-4">Layers</h3>
            <div className="space-y-1">
              {state.elements.map(element => (
                <div
                  key={element.id}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-100 ${
                    state.selectedIds.includes(element.id) ? "bg-blue-50 border-blue-300 border" : ""
                  }`}
                  onClick={() => setState(prev => ({ ...prev, selectedIds: [element.id] }))}
                >
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        setState(prev => ({
                          ...prev,
                          elements: prev.elements.map(el =>
                            el.id === element.id ? { ...el, visible: !el.visible } : el
                          )
                        }));
                      }}
                    >
                      {element.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        setState(prev => ({
                          ...prev,
                          elements: prev.elements.map(el =>
                            el.id === element.id ? { ...el, locked: !el.locked } : el
                          )
                        }));
                      }}
                    >
                      {element.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    </Button>
                    <span className="text-sm">{element.code}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {element.type}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 bg-gray-50 overflow-hidden relative">
          {/* Rulers */}
          {showRulers && (
            <>
              <div className="absolute top-0 left-0 right-0 h-6 bg-white border-b flex items-center">
                {Array.from({ length: 50 }, (_, i) => (
                  <div key={i} className="flex-shrink-0 w-20 border-r text-xs text-gray-500 text-center">
                    {i * 100}
                  </div>
                ))}
              </div>
              <div className="absolute top-6 left-0 bottom-0 w-6 bg-white border-r flex flex-col items-center">
                {Array.from({ length: 50 }, (_, i) => (
                  <div key={i} className="flex-shrink-0 h-20 border-b text-xs text-gray-500 writing-mode-vertical">
                    {i * 100}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Canvas Area */}
          <div
            ref={canvasRef}
            className="absolute inset-0 overflow-auto"
            style={{
              marginTop: showRulers ? "24px" : 0,
              marginLeft: showRulers ? "24px" : 0,
              cursor: tool === "create" ? "crosshair" : tool === "move" ? "grab" : "default"
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          >
            <div
              className="relative"
              style={{
                width: "3000px",
                height: "2000px",
                transform: `scale(${zoom})`,
                transformOrigin: "0 0",
                backgroundImage: showGrid
                  ? `repeating-linear-gradient(0deg, #e5e7eb 0px, transparent 1px, transparent ${GRID_SIZE}px, #e5e7eb ${GRID_SIZE}px),
                     repeating-linear-gradient(90deg, #e5e7eb 0px, transparent 1px, transparent ${GRID_SIZE}px, #e5e7eb ${GRID_SIZE}px)`
                  : "none",
                backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
              }}
            >
              {/* Render elements */}
              {state.elements.map(element => (
                <div
                  key={element.id}
                  className={`absolute border-2 transition-all ${
                    state.selectedIds.includes(element.id) ? "ring-2 ring-blue-500 ring-offset-1" : ""
                  } ${!element.visible ? "hidden" : ""}`}
                  style={{
                    left: `${element.x}px`,
                    top: `${element.y}px`,
                    width: `${element.width}px`,
                    height: `${element.height}px`,
                    backgroundColor: element.color,
                    opacity: element.opacity,
                    transform: `rotate(${element.rotation}deg) scaleX(${element.scaleX}) scaleY(${element.scaleY})`,
                    borderColor: state.selectedIds.includes(element.id) ? "#3b82f6" : "#6b7280",
                    pointerEvents: element.locked ? "none" : "auto"
                  }}
                >
                  <div className="flex items-center justify-center h-full text-white font-medium">
                    <div className="text-center">
                      <div className="text-xs uppercase opacity-75">{element.type}</div>
                      <div className="text-sm font-bold">{element.code}</div>
                    </div>
                  </div>
                  
                  {/* Resize handles */}
                  {state.selectedIds.includes(element.id) && !element.locked && (
                    <>
                      {getResizeHandles(element).map(handle => (
                        <div
                          key={handle.name}
                          className="absolute w-2 h-2 bg-blue-500 border border-white rounded-full"
                          style={{
                            left: `${handle.x - element.x - 4}px`,
                            top: `${handle.y - element.y - 4}px`,
                            cursor: `${handle.name}-resize`
                          }}
                        />
                      ))}
                    </>
                  )}
                </div>
              ))}

              {/* Temp element while creating */}
              {tempElement && tempElement.width! > 0 && tempElement.height! > 0 && (
                <div
                  className="absolute border-2 border-dashed border-blue-500 bg-blue-100 opacity-50"
                  style={{
                    left: `${tempElement.x}px`,
                    top: `${tempElement.y}px`,
                    width: `${tempElement.width}px`,
                    height: `${tempElement.height}px`
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Properties Panel */}
        {showProperties && state.selectedIds.length > 0 && (
          <div className="w-80 border-l bg-white p-4 overflow-y-auto">
            <h3 className="font-semibold mb-4">Properties</h3>
            {state.selectedIds.length === 1 && (
              <>
                {(() => {
                  const element = state.elements.find(el => el.id === state.selectedIds[0])!;
                  return (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="code">Code</Label>
                        <Input
                          id="code"
                          value={element.code}
                          onChange={(e) => {
                            setState(prev => ({
                              ...prev,
                              elements: prev.elements.map(el =>
                                el.id === element.id ? { ...el, code: e.target.value } : el
                              )
                            }));
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="x">X</Label>
                          <Input
                            id="x"
                            type="number"
                            value={element.x}
                            onChange={(e) => {
                              setState(prev => ({
                                ...prev,
                                elements: prev.elements.map(el =>
                                  el.id === element.id ? { ...el, x: parseInt(e.target.value) || 0 } : el
                                )
                              }));
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor="y">Y</Label>
                          <Input
                            id="y"
                            type="number"
                            value={element.y}
                            onChange={(e) => {
                              setState(prev => ({
                                ...prev,
                                elements: prev.elements.map(el =>
                                  el.id === element.id ? { ...el, y: parseInt(e.target.value) || 0 } : el
                                )
                              }));
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="width">Width</Label>
                          <Input
                            id="width"
                            type="number"
                            value={element.width}
                            onChange={(e) => {
                              setState(prev => ({
                                ...prev,
                                elements: prev.elements.map(el =>
                                  el.id === element.id ? { ...el, width: parseInt(e.target.value) || MIN_ELEMENT_SIZE } : el
                                )
                              }));
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor="height">Height</Label>
                          <Input
                            id="height"
                            type="number"
                            value={element.height}
                            onChange={(e) => {
                              setState(prev => ({
                                ...prev,
                                elements: prev.elements.map(el =>
                                  el.id === element.id ? { ...el, height: parseInt(e.target.value) || MIN_ELEMENT_SIZE } : el
                                )
                              }));
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="rotation">Rotation</Label>
                        <Slider
                          id="rotation"
                          value={[element.rotation]}
                          onValueChange={([value]) => {
                            setState(prev => ({
                              ...prev,
                              elements: prev.elements.map(el =>
                                el.id === element.id ? { ...el, rotation: value } : el
                              )
                            }));
                          }}
                          min={0}
                          max={360}
                          step={15}
                        />
                        <span className="text-sm text-gray-500">{element.rotation}°</span>
                      </div>

                      <div>
                        <Label htmlFor="opacity">Opacity</Label>
                        <Slider
                          id="opacity"
                          value={[element.opacity]}
                          onValueChange={([value]) => {
                            setState(prev => ({
                              ...prev,
                              elements: prev.elements.map(el =>
                                el.id === element.id ? { ...el, opacity: value } : el
                              )
                            }));
                          }}
                          min={0}
                          max={1}
                          step={0.1}
                        />
                        <span className="text-sm text-gray-500">{Math.round(element.opacity * 100)}%</span>
                      </div>

                      <div>
                        <Label htmlFor="color">Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="color"
                            type="color"
                            value={element.color}
                            onChange={(e) => {
                              setState(prev => ({
                                ...prev,
                                elements: prev.elements.map(el =>
                                  el.id === element.id ? { ...el, color: e.target.value } : el
                                )
                              }));
                            }}
                            className="w-20"
                          />
                          <Input
                            value={element.color}
                            onChange={(e) => {
                              setState(prev => ({
                                ...prev,
                                elements: prev.elements.map(el =>
                                  el.id === element.id ? { ...el, color: e.target.value } : el
                                )
                              }));
                            }}
                          />
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-medium mb-2">Metadata</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={element.metadata?.pickable ?? true}
                              onCheckedChange={(checked) => {
                                setState(prev => ({
                                  ...prev,
                                  elements: prev.elements.map(el =>
                                    el.id === element.id
                                      ? { ...el, metadata: { ...el.metadata, pickable: checked } }
                                      : el
                                  )
                                }));
                              }}
                              id="pickable"
                            />
                            <Label htmlFor="pickable">Pickable</Label>
                          </div>

                          <div className="flex items-center gap-2">
                            <Switch
                              checked={element.metadata?.putawayAllowed ?? true}
                              onCheckedChange={(checked) => {
                                setState(prev => ({
                                  ...prev,
                                  elements: prev.elements.map(el =>
                                    el.id === element.id
                                      ? { ...el, metadata: { ...el.metadata, putawayAllowed: checked } }
                                      : el
                                  )
                                }));
                              }}
                              id="putaway"
                            />
                            <Label htmlFor="putaway">Putaway Allowed</Label>
                          </div>

                          <div className="flex items-center gap-2">
                            <Switch
                              checked={element.metadata?.hazmat ?? false}
                              onCheckedChange={(checked) => {
                                setState(prev => ({
                                  ...prev,
                                  elements: prev.elements.map(el =>
                                    el.id === element.id
                                      ? { ...el, metadata: { ...el.metadata, hazmat: checked } }
                                      : el
                                  )
                                }));
                              }}
                              id="hazmat"
                            />
                            <Label htmlFor="hazmat">Hazmat</Label>
                          </div>

                          <div>
                            <Label htmlFor="temperature">Temperature</Label>
                            <Select
                              value={element.metadata?.temperature || "none"}
                              onValueChange={(value) => {
                                setState(prev => ({
                                  ...prev,
                                  elements: prev.elements.map(el =>
                                    el.id === element.id
                                      ? { ...el, metadata: { ...el.metadata, temperature: value === "none" ? undefined : value } }
                                      : el
                                  )
                                }));
                              }}
                            >
                              <SelectTrigger id="temperature">
                                <SelectValue placeholder="None" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="frozen">Frozen</SelectItem>
                                <SelectItem value="cold">Cold</SelectItem>
                                <SelectItem value="cool">Cool</SelectItem>
                                <SelectItem value="ambient">Ambient</SelectItem>
                                <SelectItem value="warm">Warm</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="maxWeight">Max Weight (kg)</Label>
                            <Input
                              id="maxWeight"
                              type="number"
                              value={element.metadata?.maxWeight || ""}
                              onChange={(e) => {
                                setState(prev => ({
                                  ...prev,
                                  elements: prev.elements.map(el =>
                                    el.id === element.id
                                      ? { 
                                          ...el, 
                                          metadata: { 
                                            ...el.metadata, 
                                            maxWeight: e.target.value ? parseFloat(e.target.value) : undefined 
                                          } 
                                        }
                                      : el
                                  )
                                }));
                              }}
                            />
                          </div>

                          <div>
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                              id="notes"
                              value={element.metadata?.notes || ""}
                              onChange={(e) => {
                                setState(prev => ({
                                  ...prev,
                                  elements: prev.elements.map(el =>
                                    el.id === element.id
                                      ? { ...el, metadata: { ...el.metadata, notes: e.target.value } }
                                      : el
                                  )
                                }));
                              }}
                              rows={3}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
            {state.selectedIds.length > 1 && (
              <div className="text-sm text-gray-500">
                {state.selectedIds.length} elements selected
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}