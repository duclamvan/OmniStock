import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { fuzzySearch } from "@/lib/fuzzySearch";
import { formatCompactNumber } from "@/lib/currencyUtils";
import { Plus, Search, Edit, Trash2, Warehouse, MapPin, Package, Ruler, Building2, User, Settings, Check, MoreVertical, Activity, TrendingUp, Grid3x3, Filter, Eye, Phone } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AllWarehouses() {
  const { t } = useTranslation(['warehouse', 'common']);
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
        title: t('common:error'),
        description: t('common:loadError', { item: t('warehouse:warehouses') }),
        variant: "destructive",
      });
    }
  }, [error, toast, t]);

  const deleteWarehouseMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest('DELETE', `/api/warehouses/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/warehouses'] });
      toast({
        title: t('common:success'),
        description: t('common:deleteSuccess', { count: selectedWarehouses.length, item: t('warehouse:warehouse') }),
      });
      setSelectedWarehouses([]);
    },
    onError: (error: any) => {
      console.error("Warehouse delete error:", error);
      const errorMessage = error.message || t('common:deleteError', { item: t('warehouse:warehouses') });
      toast({
        title: t('common:error'),
        description: errorMessage.includes('referenced') || errorMessage.includes('constraint')
          ? t('common:cannotDeleteInUse', { item: t('warehouse:warehouse') })
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

  // Default sort by createdAt ascending (oldest first, new items at bottom)
  filteredWarehouses = [...filteredWarehouses].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateA - dateB;
  });

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
      header: t('warehouse:warehouse'),
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
      header: t('common:status'),
      sortable: true,
      className: "text-center",
      cell: (warehouse) => {
        const statusConfig = {
          'active': { 
            label: t('common:active'), 
            icon: Activity,
            color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800' 
          },
          'inactive': { 
            label: t('common:inactive'), 
            icon: Activity,
            color: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' 
          },
          'maintenance': { 
            label: t('common:maintenance'), 
            icon: Settings,
            color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800' 
          },
          'rented': { 
            label: t('common:rented'), 
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
      header: t('common:type'),
      sortable: true,
      className: "text-center",
      cell: (warehouse) => {
        const typeConfig = {
          'main': { label: t('warehouse:type.main'), color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' },
          'branch': { label: t('warehouse:type.branch'), color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800' },
          'temporary': { label: t('warehouse:type.temporary'), color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800' },
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
      header: t('common:inventory'),
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
              {t('common:of')} {warehouse.capacity.toLocaleString()} {t('warehouse:capacity')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "floorArea",
      header: t('warehouse:floorArea'),
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
      header: t('warehouse:warehouseManager'),
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
      header: t('warehouse:warehouseCapacity'),
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
      label: t('common:delete'),
      variant: "destructive" as const,
      action: (warehouses: any[]) => {
        setSelectedWarehouses(warehouses);
        setShowDeleteDialog(true);
      },
    },
    {
      type: "button" as const,
      label: t('common:export'),
      action: (warehouses: any[]) => {
        toast({
          title: t('common:export'),
          description: t('common:exportingItems', { count: warehouses.length, item: t('warehouse:warehouses') }),
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
      <div className="flex items-center justify-center min-h-[600px] bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-cyan-200 dark:border-cyan-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-cyan-600 dark:border-cyan-400 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">{t('common:loading', { item: t('warehouse:warehouses') })}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 bg-gray-50 dark:bg-slate-900 min-h-screen -m-6 p-2 sm:p-4 md:p-6 overflow-x-hidden">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('warehouse:warehouseManagement')}
          </h1>
          <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mt-1">
            {t('warehouse:monitorManageFacilities')}
          </p>
        </div>
        <Link href="/warehouses/add" className="w-full sm:w-auto">
          <Button data-testid="button-add-warehouse" className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            {t('warehouse:addWarehouse')}
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
        {/* Total Warehouses */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('warehouse:totalFacilities')}
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate">
                  {warehouses?.length || 0}
                </p>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
                <Warehouse className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Warehouses */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('common:active')}
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400 truncate">
                  {activeWarehouses}
                </p>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Items */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('warehouse:totalInventory')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 cursor-help">
                        {formatCompactNumber(totalItems)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{totalItems.toLocaleString()} {t('common:units')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950">
                <Package className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Floor Area */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('warehouse:totalArea')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 cursor-help">
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
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950">
                <Grid3x3 className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Utilization Rate */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('warehouse:utilization')}
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400 truncate">
                  {utilizationRate}%
                </p>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950 dark:to-sky-950">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-blue-600 dark:text-blue-400" />
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
            <CardTitle className="text-lg">{t('common:filtersSearch')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t('warehouse:searchWarehouses')}
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
                  <SelectValue placeholder={t('common:filterByStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common:allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('common:active')}</SelectItem>
                  <SelectItem value="inactive">{t('common:inactive')}</SelectItem>
                  <SelectItem value="maintenance">{t('common:maintenance')}</SelectItem>
                  <SelectItem value="rented">{t('common:rented')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-10 border-slate-300 dark:border-slate-700">
                  <SelectValue placeholder={t('common:filterByType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common:allTypes')}</SelectItem>
                  <SelectItem value="main">{t('warehouse:type.main')}</SelectItem>
                  <SelectItem value="branch">{t('warehouse:type.branch')}</SelectItem>
                  <SelectItem value="temporary">{t('warehouse:type.temporary')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchQuery || statusFilter !== "all" || typeFilter !== "all") && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <span className="text-sm text-slate-600 dark:text-slate-400">{t('common:activeFilters')}:</span>
              {searchQuery && (
                <Badge variant="secondary" className="text-xs">
                  {t('common:search')}: {searchQuery}
                </Badge>
              )}
              {statusFilter !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  {t('common:status')}: {statusFilter}
                </Badge>
              )}
              {typeFilter !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  {t('common:type')}: {typeFilter}
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
                {t('common:clearAll')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warehouses Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t('warehouse:allWarehouses')} ({filteredWarehouses?.length || 0})</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-slate-300 dark:border-slate-700" data-testid="button-column-settings">
                  <Settings className="h-4 w-4 mr-2" />
                  {t('common:columns')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{t('common:toggleColumns')}</DropdownMenuLabel>
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
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3 p-3">
            {filteredWarehouses?.map((warehouse: any) => {
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

              const status = warehouse.status && statusConfig[warehouse.status as keyof typeof statusConfig] 
                ? statusConfig[warehouse.status as keyof typeof statusConfig]
                : null;
              const StatusIcon = status?.icon;

              return (
                <div key={warehouse.id} className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-100 dark:border-slate-800 p-4">
                  <div className="space-y-3">
                    {/* Top Row - Warehouse Name, Status, Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950 flex-shrink-0">
                          <Warehouse className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link href={`/warehouses/${warehouse.id}`}>
                            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400">
                              {warehouse.name}
                            </p>
                          </Link>
                          {warehouse.location && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {warehouse.city || warehouse.location}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {status && StatusIcon && (
                          <Badge className={`${status.color} font-medium text-xs px-2 py-0.5`} variant="outline">
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Middle Row - Key Details (2 columns) */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Location</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          {warehouse.address || warehouse.city || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Manager</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-gray-400" />
                          {warehouse.manager || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Products Stored</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
                          <Package className="h-3.5 w-3.5 text-gray-400" />
                          {(warehouse.itemCount || 0).toLocaleString()} units
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">Floor Area</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
                          <Ruler className="h-3.5 w-3.5 text-gray-400" />
                          {warehouse.floorArea || warehouse.floor_area ? 
                            `${(warehouse.floorArea || warehouse.floor_area).toLocaleString()} m²` : 'N/A'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Storage Capacity Indicator */}
                    {warehouse.capacity && (
                      <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500 dark:text-gray-400">Storage Capacity</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {((warehouse.itemCount / warehouse.capacity) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(((warehouse.itemCount / warehouse.capacity) * 100), 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {warehouse.itemCount.toLocaleString()} / {warehouse.capacity.toLocaleString()} capacity
                        </p>
                      </div>
                    )}

                    {/* Contact Information */}
                    {warehouse.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{warehouse.phone}</span>
                      </div>
                    )}
                    
                    {/* Bottom Row - Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                      <Link href={`/warehouses/${warehouse.id}`} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full" data-testid={`button-view-${warehouse.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          {t('common:view')}
                        </Button>
                      </Link>
                      <Link href={`/warehouses/${warehouse.id}/edit`} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full" data-testid={`button-edit-mobile-${warehouse.id}`}>
                          <Edit className="h-4 w-4 mr-2" />
                          {t('common:edit')}
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950" data-testid={`button-delete-mobile-${warehouse.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('common:deleteItem', { item: t('warehouse:warehouse') })}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('common:deleteConfirmation', { item: warehouse.name })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteWarehouseMutation.mutate([warehouse.id])}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              {t('common:delete')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <DataTable
              data={filteredWarehouses}
              columns={visibleColumnsFiltered}
              bulkActions={bulkActions}
              getRowKey={(warehouse) => warehouse.id}
              itemsPerPageOptions={[10, 20, 50, 100]}
              defaultItemsPerPage={20}
              renderBulkActions={({ selectedRows, selectedItems, bulkActions: actions }) => (
                selectedRows.size > 0 && (
                  <div className="px-4 sm:px-0 pb-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge className="bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700">
                        {t('common:itemsSelected', { count: selectedRows.size })}
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
                    </div>
                  </div>
                )
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common:deleteItems', { item: t('warehouse:warehouses') })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common:deleteBulkConfirmation', { count: selectedWarehouses.length, item: t('warehouse:warehouses').toLowerCase() })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t('common:deleteItems', { item: t('warehouse:warehouses') })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
