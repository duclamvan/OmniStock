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

  const columns = [
    {
      key: "imageUrl",
      header: "",
      render: (material: PackingMaterial) => (
        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
          {material.imageUrl ? (
            <img 
              src={material.imageUrl} 
              alt={material.name}
              className="w-full h-full object-contain bg-slate-50 dark:bg-slate-900 rounded-lg"
            />
          ) : (
            <Package2 className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
      ),
    },
    {
      key: "name",
      header: "Name",
      render: (material: PackingMaterial) => (
        <div>
          <div className="font-medium">{material.name}</div>
          {material.code && (
            <div className="text-sm text-muted-foreground">Code: {material.code}</div>
          )}
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (material: PackingMaterial) => (
        <Badge variant="secondary">
          {material.type || "General"}
        </Badge>
      ),
    },
    {
      key: "size",
      header: "Size",
      render: (material: PackingMaterial) => material.size || "-",
    },
    {
      key: "stockQuantity",
      header: "Stock",
      render: (material: PackingMaterial) => (
        <div className="flex items-center gap-2">
          <Archive className="h-4 w-4 text-muted-foreground" />
          <span className={(material.stockQuantity || 0) <= (material.minStockLevel || 10) ? "text-red-600 font-medium" : ""}>
            {material.stockQuantity || 0}
          </span>
          {(material.stockQuantity || 0) <= (material.minStockLevel || 10) && (
            <Badge variant="destructive" className="text-xs">Low</Badge>
          )}
        </div>
      ),
    },
    {
      key: "cost",
      header: "Cost",
      render: (material: PackingMaterial) => (
        <div className="flex items-center gap-1">
          <DollarSign className="h-3 w-3 text-muted-foreground" />
          {formatCurrency(parseFloat(material.cost || "0"), material.currency || "CZK")}
        </div>
      ),
    },
    {
      key: "isFragileProtection",
      header: "Protection",
      render: (material: PackingMaterial) => 
        material.isFragileProtection ? (
          <Badge variant="default">Fragile Protection</Badge>
        ) : null,
    },
    {
      key: "actions",
      header: "Actions",
      render: (material: PackingMaterial) => (
        <div className="flex items-center gap-2">
          <Link href={`/packing-materials/edit/${material.id}`}>
            <Button variant="ghost" size="icon">
              <Edit className="h-4 w-4" />
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

      <DataTable
        columns={columns}
        data={materials}
        getRowKey={(material: PackingMaterial) => material.id}
        emptyMessage="No packing materials found"
      />
    </div>
  );
}