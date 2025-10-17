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
import { Plus, Search, Edit, Trash2, Warehouse, MapPin, Package, Ruler, Building2, User } from "lucide-react";
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
      className: "min-w-[200px]",
      cell: (warehouse) => (
        <div className="flex items-center gap-2">
          <Warehouse className="h-4 w-4 text-blue-600" />
          <Link href={`/warehouses/${warehouse.id}`}>
            <span className="font-semibold text-sm text-blue-600 hover:text-blue-800 cursor-pointer hover:underline">
              {warehouse.name}
            </span>
          </Link>
        </div>
      ),
    },
    {
      key: "itemCount",
      header: "Count of Items",
      sortable: true,
      className: "text-center",
      cell: (warehouse) => (
        <div className="flex items-center justify-center gap-1">
          <Package className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium">
            {warehouse.itemCount || 0}
          </span>
        </div>
      ),
    },
    {
      key: "floorArea",
      header: "Floor Area (m²)",
      sortable: true,
      className: "text-center",
      cell: (warehouse) => (
        <div className="flex items-center justify-center gap-1">
          <Ruler className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium">
            {warehouse.floorArea || warehouse.floor_area ? 
              `${warehouse.floorArea || warehouse.floor_area} m²` : '-'}
          </span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      className: "text-center",
      cell: (warehouse) => {
        const typeConfig = {
          'main': { label: 'Main', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
          'branch': { label: 'Branch', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
          'temporary': { label: 'Temporary', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
        };
        
        if (!warehouse.type || !typeConfig[warehouse.type as keyof typeof typeConfig]) {
          return <span className="text-sm text-slate-400">-</span>;
        }
        
        const config = typeConfig[warehouse.type as keyof typeof typeConfig];
        return (
          <Badge className={config.color} variant="outline">
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      className: "text-center",
      cell: (warehouse) => {
        const statusConfig = {
          'active': { label: 'Active', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
          'inactive': { label: 'Inactive', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' },
          'maintenance': { label: 'Maintenance', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
          'rented': { label: 'Rented', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
        };
        
        if (!warehouse.status || !statusConfig[warehouse.status as keyof typeof statusConfig]) {
          return <span className="text-sm text-slate-400">-</span>;
        }
        
        const config = statusConfig[warehouse.status as keyof typeof statusConfig];
        return (
          <Badge className={config.color} variant="outline">
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: "location",
      header: "Location",
      sortable: true,
      className: "min-w-[150px]",
      cell: (warehouse) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-slate-400" />
          <span className="text-sm">
            {warehouse.city || warehouse.location || '-'}
          </span>
        </div>
      ),
    },
    {
      key: "manager",
      header: "Manager",
      sortable: true,
      className: "min-w-[120px]",
      cell: (warehouse) => (
        warehouse.manager ? (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-slate-400" />
            <span className="text-sm">
              {warehouse.manager}
            </span>
          </div>
        ) : (
          <span className="text-sm text-slate-400">-</span>
        )
      ),
    },
    {
      key: "capacity",
      header: "Capacity",
      sortable: true,
      className: "text-center",
      cell: (warehouse) => (
        <span className="text-sm font-medium">
          {warehouse.capacity ? warehouse.capacity.toLocaleString() : '-'}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-16 text-center",
      cell: (warehouse) => (
        <Link href={`/warehouses/${warehouse.id}/edit`}>
          <Button size="icon" variant="ghost" className="h-8 w-8" data-testid={`button-edit-${warehouse.id}`}>
            <Edit className="h-4 w-4 text-slate-600" />
          </Button>
        </Link>
      ),
    },
  ];

  // Bulk actions
  const bulkActions = [
    {
      type: "button" as const,
      label: "Delete",
      variant: "destructive" as const,
      action: (warehouses: any[]) => {
        setSelectedWarehouses(warehouses);
        setShowDeleteDialog(true);
      },
    },
    {
      type: "button" as const,
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
          <p className="text-slate-600">No warehouses found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl lg:text-2xl font-bold text-slate-900">Warehouses</h1>
        <Link href="/warehouses/add">
          <Button size="sm" className="lg:size-default">
            <Plus className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Add Warehouse</span>
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <Warehouse className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 mb-2 sm:mb-0" />
              <div className="sm:ml-4">
                <p className="text-xs lg:text-sm font-medium text-slate-600">Total Warehouses</p>
                <p className="text-lg lg:text-2xl font-bold text-slate-900">{warehouses?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <Package className="h-6 w-6 lg:h-8 lg:w-8 text-green-600 mb-2 sm:mb-0" />
              <div className="sm:ml-4">
                <p className="text-xs lg:text-sm font-medium text-slate-600">Total Items</p>
                <p className="text-lg lg:text-2xl font-bold text-slate-900">
                  {warehouses?.reduce((sum: number, w: any) => sum + (w.itemCount || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <Ruler className="h-6 w-6 lg:h-8 lg:w-8 text-orange-600 mb-2 sm:mb-0" />
              <div className="sm:ml-4">
                <p className="text-xs lg:text-sm font-medium text-slate-600">Total Floor Area</p>
                <p className="text-lg lg:text-2xl font-bold text-slate-900">
                  {warehouses?.reduce((sum: number, w: any) => sum + (w.floorArea || w.floor_area || 0), 0).toLocaleString()}
                  <span className="text-xs lg:text-sm font-normal text-slate-600 ml-1">m²</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <Building2 className="h-6 w-6 lg:h-8 lg:w-8 text-purple-600 mb-2 sm:mb-0" />
              <div className="sm:ml-4">
                <p className="text-xs lg:text-sm font-medium text-slate-600">Total Capacity</p>
                <p className="text-lg lg:text-2xl font-bold text-slate-900">
                  {warehouses?.reduce((sum: number, w: any) => sum + (w.capacity || 0), 0).toLocaleString()}
                  <span className="text-xs lg:text-sm font-normal text-slate-600 ml-1">units</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 lg:p-6">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 lg:top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search warehouses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 lg:h-10 text-sm lg:text-base"
            />
          </div>
        </CardContent>
      </Card>

      {/* Warehouses Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <DataTable
              data={filteredWarehouses}
              columns={columns}
              bulkActions={bulkActions}
              getRowKey={(warehouse) => warehouse.id}
              itemsPerPageOptions={[10, 20, 50, 100]}
              defaultItemsPerPage={20}
              renderBulkActions={({ selectedRows, selectedItems, bulkActions: actions }) => (
                <div className="px-4 sm:px-0 pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-mobile-lg font-semibold">Warehouses ({filteredWarehouses?.length || 0})</h2>
                      {selectedRows.size > 0 && (
                        <>
                          <Badge variant="secondary" className="text-xs h-6 px-2">
                            {selectedRows.size}
                          </Badge>
                          {actions.map((action, index) => {
                            if (action.type === "button") {
                              return (
                                <Button
                                  key={index}
                                  size="sm"
                                  variant={action.variant || "ghost"}
                                  onClick={() => action.action(selectedItems)}
                                  className="h-6 px-2 text-xs"
                                >
                                  {action.label}
                                </Button>
                              );
                            }
                            return null;
                          })}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            />
          </div>
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