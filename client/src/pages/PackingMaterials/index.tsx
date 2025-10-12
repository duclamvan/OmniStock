import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Search, Package2, Edit, Trash2, DollarSign, Layers, Archive } from "lucide-react";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PackingMaterial } from "@shared/schema";
import { formatCurrency } from "@/lib/currencyUtils";

export default function PackingMaterials() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: materials = [], isLoading } = useQuery<PackingMaterial[]>({
    queryKey: ["/api/packing-materials", searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      const response = await fetch(`/api/packing-materials?${params}`);
      if (!response.ok) throw new Error("Failed to fetch packing materials");
      return response.json();
    },
  });

  const columns: DataTableColumn<PackingMaterial>[] = [
    {
      key: "imageUrl",
      header: "Image",
      className: "w-24",
      cell: (material) => (
        <div className="w-16 h-16 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden">
          {material.imageUrl ? (
            <img 
              src={material.imageUrl} 
              alt={material.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Package2 className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
      ),
    },
    {
      key: "name",
      header: "Name",
      cell: (material) => (
        <div className="min-w-[200px]">
          <div className="font-semibold text-base">{material.name}</div>
          {material.code && (
            <div className="text-sm text-muted-foreground mt-0.5">Code: {material.code}</div>
          )}
          {material.category && (
            <Badge variant="outline" className="mt-1 text-xs">
              {material.category}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "supplier",
      header: "Supplier",
      className: "min-w-[150px]",
      cell: (material) => (
        material.supplier ? (
          <div className="text-sm">
            <span className="font-medium">{material.supplier}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">No supplier</span>
        )
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      cell: (material) => (
        <div className="flex items-center justify-end gap-2">
          <Link href={`/packing-materials/edit/${material.id}`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  const stats = {
    total: materials.length,
    lowStock: materials.filter(m => (m.stockQuantity || 0) <= (m.minStockLevel || 10)).length,
    fragileProtection: materials.filter(m => m.isFragileProtection).length,
    types: Array.from(new Set(materials.map(m => m.type).filter(Boolean))).length,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Packing Materials</h1>
          <p className="text-muted-foreground">Manage your packing and shipping materials inventory</p>
        </div>
        <Link href="/packing-materials/add">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Material
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Materials</CardTitle>
            <Package2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <Archive className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.lowStock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fragile Protection</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.fragileProtection}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Material Types</CardTitle>
            <Package2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.types}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search materials by name, code, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border">
        <DataTable
          columns={columns}
          data={materials}
          getRowKey={(material: PackingMaterial) => material.id}
          emptyMessage="No packing materials found"
        />
      </div>
    </div>
  );
}