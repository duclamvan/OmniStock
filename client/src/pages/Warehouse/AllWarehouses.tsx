import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { fuzzySearch } from "@/lib/fuzzySearch";
import { formatCompactNumber } from "@/lib/currencyUtils";
import { Plus, Search, Edit, Trash2, Warehouse, MapPin, Package, Ruler, Building2, User, Settings, Check, MoreVertical, Activity, TrendingUp, Grid3x3, Filter } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AllWarehouses() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedWarehouses, setSelectedWarehouses] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('warehousesVisibleColumns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {
      name: true,
      itemCount: true,
      floorArea: true,
      type: true,
      status: true,
      location: true,
      manager: true,
      capacity: true,
    };
  });

  // Toggle column visibility
  const toggleColumnVisibility = (columnKey: string) => {
    const newVisibility = { ...visibleColumns, [columnKey]: !visibleColumns[columnKey] };
    setVisibleColumns(newVisibility);
    localStorage.setItem('warehousesVisibleColumns', JSON.stringify(newVisibility));
  };

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

  // Filter warehouses based on search query and filters
  let filteredWarehouses = warehouses || [];

  // Apply search filter
  if (searchQuery) {
    filteredWarehouses = fuzzySearch(filteredWarehouses, searchQuery, {
      fields: ['name', 'location', 'address', 'city', 'manager', 'notes'],
      threshold: 0.2,
      fuzzy: true,
      vietnameseNormalization: true,
    }).map(r => r.item);
  }

  // Apply status filter
  if (statusFilter !== "all") {
    filteredWarehouses = filteredWarehouses.filter(w => w.status === statusFilter);
  }

  // Apply type filter
  if (typeFilter !== "all") {
    filteredWarehouses = filteredWarehouses.filter(w => w.type === typeFilter);
  }

  // Calculate stats
  const activeWarehouses = warehouses.filter(w => w.status === 'active').length;
  const totalItems = warehouses.reduce((sum: number, w: any) => sum + (w.itemCount || 0), 0);
  const totalFloorArea = warehouses.reduce((sum: number, w: any) => sum + (w.floorArea || w.floor_area || 0), 0);
  const totalCapacity = warehouses.reduce((sum: number, w: any) => sum + (w.capacity || 0), 0);
  const utilizationRate = totalCapacity > 0 ? ((totalItems / totalCapacity) * 100).toFixed(1) : '0';

  // Define table columns
  const columns: DataTableColumn<any>[] = [
    {
      key: "name",
      header: "Warehouse",
      sortable: true,
      className: "min-w-[200px]",
      cell: (warehouse) => (
        <Link href={`/warehouses/${warehouse.id}`}>
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950 group-hover:from-cyan-100 group-hover:to-blue-100 dark:group-hover:from-cyan-900 dark:group-hover:to-blue-900 transition-colors">
              <Warehouse className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                {warehouse.name}
              </div>
              {warehouse.location && (
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  {warehouse.city || warehouse.location}
                </div>
              )}
            </div>
          </div>
        </Link>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      className: "text-center",
      cell: (warehouse) => {
        const statusConfig = {
          'active': { 
            label: 'Active', 
            icon: Activity,
            color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800' 
          },
          'inactive': { 
            label: 'Inactive', 
            icon: Activity,
            color: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' 
          },
          'maintenance': { 
            label: 'Maintenance', 
            icon: Settings,
            color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800' 
          },
          'rented': { 
            label: 'Rented', 
            icon: Building2,
            color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400 dark:border-indigo-800' 
          },
        };
        
        if (!warehouse.status || !statusConfig[warehouse.status as keyof typeof statusConfig]) {
          return <span className="text-sm text-slate-400">-</span>;
        }
        
        const config = statusConfig[warehouse.status as keyof typeof statusConfig];
        const Icon = config.icon;
        
        return (
          <Badge className={`${config.color} font-medium px-2.5 py-1`} variant="outline">
            <Icon className="h-3 w-3 mr-1.5" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      className: "text-center",
      cell: (warehouse) => {
        const typeConfig = {
          'main': { label: 'Main Facility', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' },
          'branch': { label: 'Branch', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800' },
          'temporary': { label: 'Temporary', color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800' },
        };
        
        if (!warehouse.type || !typeConfig[warehouse.type as keyof typeof typeConfig]) {
          return <span className="text-sm text-slate-400">-</span>;
        }
        
        const config = typeConfig[warehouse.type as keyof typeof typeConfig];
        return (
          <Badge className={`${config.color} font-medium`} variant="outline">
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: "itemCount",
      header: "Inventory",
      sortable: true,
      className: "text-right",
      cell: (warehouse) => (
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-slate-400" />
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {(warehouse.itemCount || 0).toLocaleString()}
            </span>
          </div>
          {warehouse.capacity && (
            <div className="text-xs text-slate-500">
              of {warehouse.capacity.toLocaleString()} capacity
            </div>
          )}
        </div>
      ),
    },
    {
      key: "floorArea",
      header: "Floor Area",
      sortable: true,
      className: "text-right",
      cell: (warehouse) => (
        <div className="flex items-center justify-end gap-2">
          <Ruler className="h-4 w-4 text-slate-400" />
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {warehouse.floorArea || warehouse.floor_area ? 
              `${(warehouse.floorArea || warehouse.floor_area).toLocaleString()} m²` : '-'}
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
            <div className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
              <User className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
            </div>
            <span className="text-sm text-slate-700 dark:text-slate-300">
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
      header: "Max Capacity",
      sortable: true,
      className: "text-right",
      cell: (warehouse) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
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
          <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-cyan-50 dark:hover:bg-cyan-950" data-testid={`button-edit-${warehouse.id}`}>
            <Edit className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </Button>
        </Link>
      ),
    },
  ];

  // Filter columns based on visibility
  const visibleColumnsFiltered = columns.filter(col => 
    col.key === 'actions' || visibleColumns[col.key] !== false
  );

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
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-cyan-200 dark:border-cyan-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-cyan-600 dark:border-cyan-400 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading warehouses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Warehouse Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Monitor and manage your warehouse facilities
          </p>
        </div>
        <Link href="/warehouses/add">
          <Button data-testid="button-add-warehouse">
            <Plus className="h-4 w-4 mr-2" />
            Add Warehouse
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Warehouses */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Total Facilities
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 truncate">
                  {warehouses?.length || 0}
                </p>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
                <Warehouse className="h-7 w-7 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Warehouses */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Active
                </p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 truncate">
                  {activeWarehouses}
                </p>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
                <Activity className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Items */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Total Inventory
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 cursor-help">
                        {formatCompactNumber(totalItems)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{totalItems.toLocaleString()} units</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950">
                <Package className="h-7 w-7 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Floor Area */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Total Area
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 cursor-help">
                        {formatCompactNumber(totalFloorArea)}
                        <span className="text-sm font-normal text-slate-500 ml-1">m²</span>
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{totalFloorArea.toLocaleString()} m²</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950">
                <Grid3x3 className="h-7 w-7 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Utilization Rate */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Utilization
                </p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 truncate">
                  {utilizationRate}%
                </p>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950 dark:to-sky-950">
                <TrendingUp className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            <CardTitle className="text-lg">Filters & Search</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search warehouses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 border-slate-300 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-500"
                  data-testid="input-search-warehouses"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 border-slate-300 dark:border-slate-700">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="rented">Rented</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-10 border-slate-300 dark:border-slate-700">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="main">Main Facility</SelectItem>
                  <SelectItem value="branch">Branch</SelectItem>
                  <SelectItem value="temporary">Temporary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchQuery || statusFilter !== "all" || typeFilter !== "all") && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-600 dark:text-slate-400">Active filters:</span>
              {searchQuery && (
                <Badge variant="secondary" className="text-xs">
                  Search: {searchQuery}
                </Badge>
              )}
              {statusFilter !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  Status: {statusFilter}
                </Badge>
              )}
              {typeFilter !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  Type: {typeFilter}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs ml-auto"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setTypeFilter("all");
                }}
              >
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warehouses Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <DataTable
              data={filteredWarehouses}
              columns={visibleColumnsFiltered}
              bulkActions={bulkActions}
              getRowKey={(warehouse) => warehouse.id}
              itemsPerPageOptions={[10, 20, 50, 100]}
              defaultItemsPerPage={20}
              renderBulkActions={({ selectedRows, selectedItems, bulkActions: actions }) => (
                <div className="px-4 sm:px-0 pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Warehouses
                      </h2>
                      <Badge variant="secondary" className="text-xs font-normal">
                        {filteredWarehouses?.length || 0} {filteredWarehouses?.length === 1 ? 'facility' : 'facilities'}
                      </Badge>
                      {selectedRows.size > 0 && (
                        <>
                          <Badge className="bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700">
                            {selectedRows.size} selected
                          </Badge>
                          {actions.map((action, index) => {
                            if (action.type === "button") {
                              return (
                                <Button
                                  key={index}
                                  size="sm"
                                  variant={action.variant || "ghost"}
                                  onClick={() => action.action(selectedItems)}
                                  className="h-8"
                                  data-testid={`button-${action.label.toLowerCase().replace(' ', '-')}`}
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
                    
                    {/* Column Visibility Settings */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-slate-300 dark:border-slate-700"
                          data-testid="button-column-settings"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Columns
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {columns
                          .filter(col => col.key !== 'actions')
                          .map((column) => (
                            <DropdownMenuItem
                              key={column.key}
                              onClick={(e) => {
                                e.preventDefault();
                                toggleColumnVisibility(column.key);
                              }}
                              className="cursor-pointer"
                              data-testid={`toggle-column-${column.key}`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>{column.header}</span>
                                {visibleColumns[column.key] !== false && (
                                  <Check className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                                )}
                              </div>
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
              Are you sure you want to delete {selectedWarehouses.length} warehouse(s)? This action cannot be undone and may affect existing inventory records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Warehouses
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
