import { useState } from "react";
import { ChevronRight, ChevronDown, MapPin, Package, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WarehouseLocation } from "@shared/schema";

interface LocationTreeProps {
  locations: WarehouseLocation[];
  onSelect: (location: WarehouseLocation) => void;
  selectedId?: string;
}

export function LocationTree({ locations, onSelect, selectedId }: LocationTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Build tree structure
  const buildTree = () => {
    const tree: Record<string, WarehouseLocation[]> = {};
    const rootItems: WarehouseLocation[] = [];

    locations.forEach(location => {
      if (!location.parentId) {
        rootItems.push(location);
      } else {
        if (!tree[location.parentId]) {
          tree[location.parentId] = [];
        }
        tree[location.parentId].push(location);
      }
    });

    // Sort by sortKey
    rootItems.sort((a, b) => a.sortKey - b.sortKey);
    Object.values(tree).forEach(children => {
      children.sort((a, b) => a.sortKey - b.sortKey);
    });

    return { tree, rootItems };
  };

  const { tree, rootItems } = buildTree();

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "ZONE":
        return <MapPin className="h-4 w-4" />;
      case "AISLE":
        return <Grid3x3 className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const renderLocation = (location: WarehouseLocation, depth = 0) => {
    const hasChildren = tree[location.id] && tree[location.id].length > 0;
    const isExpanded = expanded.has(location.id);
    const isSelected = selectedId === location.id;

    return (
      <div key={location.id}>
        <Button
          variant={isSelected ? "secondary" : "ghost"}
          className="w-full justify-start h-8 px-2"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleExpand(location.id);
            }
            onSelect(location);
          }}
        >
          {hasChildren && (
            <span className="mr-1">
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </span>
          )}
          {!hasChildren && <span className="mr-1 w-3" />}
          {getIcon(location.type)}
          <span className="ml-2 text-sm truncate">{location.code}</span>
        </Button>
        {hasChildren && isExpanded && (
          <div>
            {tree[location.id].map(child => renderLocation(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-1">
        {rootItems.map(location => renderLocation(location))}
      </div>
    </ScrollArea>
  );
}