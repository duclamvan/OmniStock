import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { createVietnameseSearchMatcher } from "@/lib/vietnameseSearch";
import { Plus, Search, Edit, Trash2, Warehouse, MapPin, Phone } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AllWarehouses() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedWarehouses, setSelectedWarehouses] = useState<any[]>([]);

  const { data: warehouses = [], isLoading, error } = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
    retry: false,
  });

  // Error handling
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load warehouses",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const deleteWarehouseMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest('DELETE', `/api/warehouses/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/warehouses'] });
      toast({
        title: "Success",
        description: `Deleted ${selectedWarehouses.length} warehouse(s) successfully`,
      });
      setSelectedWarehouses([]);
    },
    onError: (error: any) => {
      console.error("Warehouse delete error:", error);
      const errorMessage = error.message || "Failed to delete warehouses";
      toast({
        title: "Error",
        description: errorMessage.includes('referenced') || errorMessage.includes('constraint')
          ? "Cannot delete warehouse - it's being used in existing records" 
          : errorMessage,
        variant: "destructive",
      });
    },
  });

  // Filter warehouses based on search query
  const filteredWarehouses = warehouses?.filter((warehouse: any) => {
    if (!searchQuery) return true;
    
    const matcher = createVietnameseSearchMatcher(searchQuery);
    return (
      matcher(warehouse.name || '') ||
      matcher(warehouse.location || '') ||
      matcher(warehouse.address || '') ||
      matcher(warehouse.city || '') ||
      matcher(warehouse.manager || '') ||
      matcher(warehouse.notes || '')
    );
  });

  // Define table columns
  const columns: DataTableColumn<any>[] = [
    {
      key: "name",
      header: "Warehouse Name",
      sortable: true,
      cell: (warehouse) => (
        <div className="flex items-center gap-2">
          <Warehouse className="h-5 w-5 text-gray-400" />
          <Link href={`/warehouses/${warehouse.id}`}>
            <span className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
              {warehouse.name}
            </span>
          </Link>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      sortable: true,
      cell: (warehouse) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-400" />
          <div>
            <div>{warehouse.location || warehouse.address}</div>
            <div className="text-xs text-gray-500">{warehouse.city || ''}{warehouse.city && warehouse.country ? ', ' : ''}{warehouse.country || ''}</div>
          </div>
        </div>
      ),
    },
    {
      key: "manager",
      header: "Manager",
      sortable: true,
    },
    {
      key: "phone",
      header: "Phone",
      cell: (warehouse) => warehouse.phone ? (
        <div className="flex items-center gap-1">
          <Phone className="h-4 w-4 text-gray-400" />
          {warehouse.phone}
        </div>
      ) : '-',
    },
    {
      key: "capacity",
      header: "Capacity",
      sortable: true,
      cell: (warehouse) => warehouse.capacity ? `${warehouse.capacity} units` : '-',
      className: "text-right",
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      cell: (warehouse) => {
        const types: Record<string, { label: string; color: string }> = {
          'main': { label: 'Main', color: 'bg-blue-100 text-blue-800' },
          'branch': { label: 'Branch', color: 'bg-green-100 text-green-800' },
          'temporary': { label: 'Temporary', color: 'bg-yellow-100 text-yellow-800' },
        };
        const type = types[warehouse.type] || { label: warehouse.type, color: 'bg-gray-100 text-gray-800' };
        return <Badge className={type.color}>{type.label}</Badge>;
      },
    },
    {
      key: "actions",
      header: "Actions",
      cell: (warehouse) => (
        <div className="flex items-center gap-1">
          <Link href={`/warehouses/${warehouse.id}/edit`}>
            <Button size="sm" variant="ghost">
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  // Bulk actions
  const bulkActions = [
    {
      label: "Delete",
      variant: "destructive" as const,
      action: (warehouses: any[]) => {
        setSelectedWarehouses(warehouses);
        setShowDeleteDialog(true);
      },
    },
    {
      label: "Export",
      action: (warehouses: any[]) => {
        toast({
          title: "Export",
          description: `Exporting ${warehouses.length} warehouses...`,
        });
      },
    },
  ];

  const handleDeleteConfirm = () => {
    deleteWarehouseMutation.mutate(selectedWarehouses.map(warehouse => warehouse.id));
    setShowDeleteDialog(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600">Loading warehouses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Warehouses</h1>
        <Link href="/warehouses/add">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Warehouse
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Warehouse className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Warehouses</p>
                <p className="text-2xl font-bold text-slate-900">{warehouses?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <MapPin className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Main Warehouses</p>
                <p className="text-2xl font-bold text-slate-900">
                  {warehouses?.filter((w: any) => w.type === 'main').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Warehouse className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Capacity</p>
                <p className="text-2xl font-bold text-slate-900">
                  {warehouses?.reduce((sum: number, w: any) => sum + (w.capacity || 0), 0).toLocaleString()} units
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search warehouses by name, address, city, or manager..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Warehouses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Warehouses ({filteredWarehouses?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredWarehouses}
            columns={columns}
            bulkActions={bulkActions}
            getRowKey={(warehouse) => warehouse.id}
            itemsPerPageOptions={[10, 20, 50, 100]}
            defaultItemsPerPage={20}
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Warehouses</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedWarehouses.length} warehouse(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}