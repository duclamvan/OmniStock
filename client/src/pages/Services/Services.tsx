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
import { fuzzySearch } from "@/lib/fuzzySearch";
import { formatCompactNumber } from "@/lib/currencyUtils";
import { Plus, Search, Edit, Wrench, Clock, PlayCircle, CheckCircle2, Filter, Settings, Check, Calendar, FileDown, FileText } from "lucide-react";
import { exportToXLSX, exportToPDF, PDFColumn } from "@/lib/exportUtils";
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
import { formatCzechDate } from "@/lib/dateUtils";
import { format } from "date-fns";

interface Service {
  id: string;
  customerId: string | null;
  customer?: {
    id: string;
    name: string;
  } | null;
  name: string;
  description: string | null;
  serviceDate: string | null;
  serviceCost: string;
  partsCost: string;
  totalCost: string;
  currency?: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function Services() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('servicesVisibleColumns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {
      customer: true,
      serviceCost: true,
      partsCost: true,
      status: true,
      createdAt: true,
    };
  });

  // Toggle column visibility
  const toggleColumnVisibility = (columnKey: string) => {
    const newVisibility = { ...visibleColumns, [columnKey]: !visibleColumns[columnKey] };
    setVisibleColumns(newVisibility);
    localStorage.setItem('servicesVisibleColumns', JSON.stringify(newVisibility));
  };

  const { data: services = [], isLoading, error } = useQuery<Service[]>({
    queryKey: ['/api/services'],
    retry: false,
  });

  // Error handling
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load services",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const deleteServiceMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest('DELETE', `/api/services/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      toast({
        title: "Success",
        description: `Deleted ${selectedServices.length} service(s) successfully`,
      });
      setSelectedServices([]);
    },
    onError: (error: any) => {
      console.error("Service delete error:", error);
      const errorMessage = error.message || "Failed to delete services";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Filter services based on search query and filters
  let filteredServices = services || [];

  // Apply search filter
  if (searchQuery) {
    filteredServices = fuzzySearch(filteredServices, searchQuery, {
      fields: ['name', 'customer.name', 'description', 'notes'],
      threshold: 0.2,
      fuzzy: true,
      vietnameseNormalization: true,
    }).map(r => r.item);
  }

  // Apply status filter
  if (statusFilter !== "all") {
    filteredServices = filteredServices.filter(s => s.status === statusFilter);
  }

  // Calculate stats
  const totalServices = services.length;
  const pendingServices = services.filter(s => s.status === 'pending').length;
  const inProgressServices = services.filter(s => s.status === 'in_progress').length;
  const completedServices = services.filter(s => s.status === 'completed').length;

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount || '0');
    return `€${num.toFixed(2)}`;
  };

  const formatDate = (dateString: string | null) => {
    return formatCzechDate(dateString);
  };

  // Define table columns
  const columns: DataTableColumn<Service>[] = [
    {
      key: "name",
      header: "Service",
      sortable: true,
      className: "min-w-[200px]",
      cell: (service) => (
        <Link href={`/services/${service.id}`}>
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950 group-hover:from-cyan-100 group-hover:to-blue-100 dark:group-hover:from-cyan-900 dark:group-hover:to-blue-900 transition-colors">
              <Wrench className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                {service.name}
              </div>
              {service.description && (
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                  {service.description}
                </div>
              )}
            </div>
          </div>
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      sortable: true,
      className: "min-w-[150px]",
      cell: (service) => (
        service.customer?.name ? (
          <span className="text-sm text-slate-700 dark:text-slate-300">
            {service.customer.name}
          </span>
        ) : (
          <span className="text-sm text-slate-400">-</span>
        )
      ),
    },
    {
      key: "serviceCost",
      header: "Service Cost",
      sortable: true,
      className: "text-right",
      cell: (service) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {formatCurrency(service.serviceCost)}
        </span>
      ),
    },
    {
      key: "partsCost",
      header: "Parts Cost",
      sortable: true,
      className: "text-right",
      cell: (service) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {formatCurrency(service.partsCost)}
        </span>
      ),
    },
    {
      key: "totalCost",
      header: "Total Cost",
      sortable: true,
      className: "text-right",
      cell: (service) => (
        <span className="font-bold text-slate-900 dark:text-slate-100">
          {formatCurrency(service.totalCost)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      className: "text-center",
      cell: (service) => {
        const statusConfig = {
          'pending': { 
            label: 'Pending', 
            icon: Clock,
            color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800' 
          },
          'in_progress': { 
            label: 'In Progress', 
            icon: PlayCircle,
            color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800' 
          },
          'completed': { 
            label: 'Completed', 
            icon: CheckCircle2,
            color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800' 
          },
          'cancelled': { 
            label: 'Cancelled', 
            icon: CheckCircle2,
            color: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' 
          },
        };
        
        if (!service.status || !statusConfig[service.status as keyof typeof statusConfig]) {
          return <span className="text-sm text-slate-400">-</span>;
        }
        
        const config = statusConfig[service.status as keyof typeof statusConfig];
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
      key: "createdAt",
      header: "Created",
      sortable: true,
      className: "text-center",
      cell: (service) => (
        <div className="flex items-center justify-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            {formatDate(service.createdAt)}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-16 text-center",
      cell: (service) => (
        <Link href={`/services/${service.id}/edit`}>
          <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-cyan-50 dark:hover:bg-cyan-950" data-testid={`button-edit-${service.id}`}>
            <Edit className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </Button>
        </Link>
      ),
    },
  ];

  // Filter columns based on visibility
  const visibleColumnsFiltered = columns.filter(col => 
    col.key === 'actions' || col.key === 'name' || col.key === 'totalCost' || visibleColumns[col.key] !== false
  );

  // Bulk actions
  const bulkActions = [
    {
      type: "button" as const,
      label: "Delete",
      variant: "destructive" as const,
      action: (services: any[]) => {
        setSelectedServices(services);
        setShowDeleteDialog(true);
      },
    },
    {
      type: "button" as const,
      label: "Export",
      action: (services: any[]) => {
        toast({
          title: "Export",
          description: `Exporting ${services.length} services...`,
        });
      },
    },
  ];

  const handleDeleteConfirm = () => {
    deleteServiceMutation.mutate(selectedServices.map(service => service.id));
    setShowDeleteDialog(false);
  };

  // Export handlers
  const handleExportXLSX = () => {
    try {
      const exportData = filteredServices.map(service => ({
        'Service ID': service.id.substring(0, 8) || '-',
        'Customer': service.customer?.name || '-',
        'Description': service.name || '-',
        'Service Cost': formatCurrency(service.serviceCost),
        'Parts Cost': formatCurrency(service.partsCost),
        'Total Cost': formatCurrency(service.totalCost),
        'Status': service.status === 'pending' ? 'Pending'
          : service.status === 'in_progress' ? 'In Progress'
          : service.status === 'completed' ? 'Completed'
          : service.status === 'cancelled' ? 'Cancelled'
          : service.status || '-',
        'Created Date': formatDate(service.createdAt),
        'Completed Date': service.status === 'completed' ? formatDate(service.updatedAt) : '-',
      }));

      exportToXLSX(exportData, `Services_${format(new Date(), 'yyyy-MM-dd')}`, 'Services');
      
      toast({
        title: "Export Successful",
        description: `Exported ${exportData.length} service(s) to XLSX`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export services to XLSX",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    try {
      const exportData = filteredServices.map(service => ({
        serviceId: service.id.substring(0, 8) || '-',
        customer: service.customer?.name || '-',
        description: service.name || '-',
        serviceCost: formatCurrency(service.serviceCost),
        partsCost: formatCurrency(service.partsCost),
        totalCost: formatCurrency(service.totalCost),
        status: service.status === 'pending' ? 'Pending'
          : service.status === 'in_progress' ? 'In Progress'
          : service.status === 'completed' ? 'Completed'
          : service.status === 'cancelled' ? 'Cancelled'
          : service.status || '-',
        createdDate: formatDate(service.createdAt),
        completedDate: service.status === 'completed' ? formatDate(service.updatedAt) : '-',
      }));

      const columns: PDFColumn[] = [
        { key: 'serviceId', header: 'Service ID' },
        { key: 'customer', header: 'Customer' },
        { key: 'description', header: 'Description' },
        { key: 'serviceCost', header: 'Service Cost' },
        { key: 'partsCost', header: 'Parts Cost' },
        { key: 'totalCost', header: 'Total Cost' },
        { key: 'status', header: 'Status' },
        { key: 'createdDate', header: 'Created Date' },
        { key: 'completedDate', header: 'Completed Date' },
      ];

      exportToPDF('Services Report', exportData, columns, `Services_${format(new Date(), 'yyyy-MM-dd')}`);
      
      toast({
        title: "Export Successful",
        description: `Exported ${exportData.length} service(s) to PDF`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export services to PDF",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-cyan-200 dark:border-cyan-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-cyan-600 dark:border-cyan-400 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading services...</p>
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
            Services
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Track repair services and manage service bills
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-export">
                <FileDown className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportXLSX} data-testid="button-export-xlsx">
                <FileDown className="h-4 w-4 mr-2" />
                Export as XLSX
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} data-testid="button-export-pdf">
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/services/add">
            <Button data-testid="button-add-service">
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Services */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Total Services
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help">
                        {formatCompactNumber(totalServices)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{totalServices.toLocaleString()} services</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
                <Wrench className="h-7 w-7 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Pending
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 truncate cursor-help">
                        {formatCompactNumber(pendingServices)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{pendingServices.toLocaleString()} pending</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950">
                <Clock className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  In Progress
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 truncate cursor-help">
                        {formatCompactNumber(inProgressServices)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{inProgressServices.toLocaleString()} in progress</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                <PlayCircle className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Completed
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 truncate cursor-help">
                        {formatCompactNumber(completedServices)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{completedServices.toLocaleString()} completed</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
                <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 border-slate-300 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-500"
                  data-testid="input-search-services"
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchQuery || statusFilter !== "all") && (
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
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs ml-auto"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
              >
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <DataTable
              data={filteredServices}
              columns={visibleColumnsFiltered}
              bulkActions={bulkActions}
              getRowKey={(service) => service.id}
              itemsPerPageOptions={[10, 20, 50, 100]}
              defaultItemsPerPage={20}
              renderBulkActions={({ selectedRows, selectedItems, bulkActions: actions }) => (
                <div className="px-4 sm:px-0 pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Service Records
                      </h2>
                      <Badge variant="secondary" className="text-xs font-normal">
                        {filteredServices?.length || 0} {filteredServices?.length === 1 ? 'service' : 'services'}
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
                          .filter(col => col.key !== 'actions' && col.key !== 'name' && col.key !== 'totalCost')
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
            <AlertDialogTitle>Delete Services</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedServices.length} service(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Services
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
