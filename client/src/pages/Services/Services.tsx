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
import { Plus, Search, Edit, Wrench, Clock, PlayCircle, CheckCircle2, Filter, Settings, Check, Calendar, FileDown, FileText, Trash2, MoreVertical, Download, Upload, RefreshCw } from "lucide-react";
import { useTranslation } from 'react-i18next';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

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
        title: t('common:error'),
        description: t('common:failedToLoadData'),
        variant: "destructive",
      });
    }
  }, [error, toast, t]);

  const deleteServiceMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest('DELETE', `/api/services/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      toast({
        title: t('common:success'),
        description: t('common:deleteSuccess', { count: selectedServices.length }),
      });
      setSelectedServices([]);
    },
    onError: (error: any) => {
      console.error("Service delete error:", error);
      const errorMessage = error.message || t('common:deleteError');
      toast({
        title: t('common:error'),
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
      header: t('financial:service'),
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
      header: t('orders:customer'),
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
      header: t('financial:serviceFee'),
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
      header: t('financial:cost'),
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
      header: t('financial:totalCost'),
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
      header: t('common:status'),
      sortable: true,
      className: "text-center",
      cell: (service) => {
        const statusConfig = {
          'pending': { 
            label: t('financial:pending'), 
            icon: Clock,
            color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800' 
          },
          'in_progress': { 
            label: t('common:inProgress'), 
            icon: PlayCircle,
            color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800' 
          },
          'completed': { 
            label: t('common:completed'), 
            icon: CheckCircle2,
            color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800' 
          },
          'cancelled': { 
            label: t('orders:cancelled'), 
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
      header: t('common:created'),
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
      label: t('common:delete'),
      variant: "destructive" as const,
      action: (services: any[]) => {
        setSelectedServices(services);
        setShowDeleteDialog(true);
      },
    },
    {
      type: "button" as const,
      label: t('common:export'),
      action: (services: any[]) => {
        toast({
          title: t('common:export'),
          description: t('common:exportingItems', { count: services.length }),
        });
      },
    },
  ];

  const handleDeleteConfirm = () => {
    deleteServiceMutation.mutate(selectedServices.map(service => service.id));
    setShowDeleteDialog(false);
  };

  // Comprehensive Export handler
  const handleExportXLSX = () => {
    try {
      const exportData = filteredServices.map(service => ({
        'Service ID': service.id || '-',
        'Service Name': service.name || '-',
        'Description': service.description || '-',
        'Customer ID': service.customerId || '-',
        'Customer Name': service.customer?.name || '-',
        'Service Date': service.serviceDate ? formatDate(service.serviceDate) : '-',
        'Service Cost': parseFloat(service.serviceCost || '0').toFixed(2),
        'Parts Cost': parseFloat(service.partsCost || '0').toFixed(2),
        'Total Cost': parseFloat(service.totalCost || '0').toFixed(2),
        'Currency': service.currency || 'EUR',
        'Status': service.status || 'pending',
        'Notes': service.notes || '-',
        'Created Date': formatDate(service.createdAt),
        'Updated Date': formatDate(service.updatedAt),
      }));

      exportToXLSX(exportData, `Services_Comprehensive_${format(new Date(), 'yyyy-MM-dd')}`, 'Services');
      
      toast({
        title: t('common:exportSuccessful'),
        description: t('common:exportedToXLSX', { count: exportData.length }),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('common:exportFailed'),
        description: t('common:exportError'),
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
        title: t('common:exportSuccessful'),
        description: t('common:exportedToPDF', { count: exportData.length }),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('common:exportFailed'),
        description: t('common:exportError'),
        variant: "destructive",
      });
    }
  };

  // Download template for import
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Service Name': 'Sample Service 1',
        'Description': 'Repair service for electronics',
        'Customer Name': 'John Doe',
        'Service Date': format(new Date(), 'yyyy-MM-dd'),
        'Service Cost': '50.00',
        'Parts Cost': '25.00',
        'Currency': 'EUR',
        'Status': 'pending',
        'Notes': 'First sample service',
      },
      {
        'Service Name': 'Sample Service 2',
        'Description': 'Maintenance and inspection',
        'Customer Name': 'Jane Smith',
        'Service Date': format(new Date(), 'yyyy-MM-dd'),
        'Service Cost': '100.00',
        'Parts Cost': '50.00',
        'Currency': 'EUR',
        'Status': 'completed',
        'Notes': 'Second sample service',
      },
    ];

    exportToXLSX(templateData, 'Services_Import_Template', 'Services');
    
    toast({
      title: t('financial:templateDownloaded'),
      description: t('financial:templateDownloadedDescription'),
    });
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: t('common:error'),
          description: t('financial:invalidFileType'),
          variant: "destructive",
        });
        return;
      }
      setImportFile(file);
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!importFile) {
      toast({
        title: t('common:error'),
        description: t('financial:noFileSelected'),
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch('/api/services/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t('financial:importFailed'));
      }

      const result = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      
      toast({
        title: t('financial:importSuccessful'),
        description: t('financial:importedServices', { count: result.imported || result.count || 0 }),
      });

      setShowImportDialog(false);
      setImportFile(null);
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: t('financial:importFailed'),
        description: error.message || t('financial:failedToImportServices'),
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
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
          <p className="text-slate-600 dark:text-slate-400 font-medium">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('financial:services')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
            {t('financial:manageYourServices')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10" data-testid="button-more-menu">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('financial:importExport')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowImportDialog(true)} data-testid="menu-import-xlsx">
                <Upload className="h-4 w-4 mr-2" />
                {t('financial:importFromExcel')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportXLSX} data-testid="menu-export-xlsx">
                <FileDown className="h-4 w-4 mr-2" />
                {t('financial:exportToExcel')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} data-testid="menu-export-pdf">
                <FileText className="h-4 w-4 mr-2" />
                {t('common:exportAsPDF')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/services/add" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto" data-testid="button-add-service">
              <Plus className="h-4 w-4 mr-2" />
              {t('financial:addService')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {/* Total Services */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('financial:services')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help">
                        {formatCompactNumber(totalServices)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{totalServices.toLocaleString()} services</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
                <Wrench className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('financial:pending')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-600 dark:text-amber-400 truncate cursor-help">
                        {formatCompactNumber(pendingServices)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{pendingServices.toLocaleString()} pending</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('financial:inProgress')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400 truncate cursor-help">
                        {formatCompactNumber(inProgressServices)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{inProgressServices.toLocaleString()} {t('financial:inProgress').toLowerCase()}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                <PlayCircle className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('common:completed')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400 truncate cursor-help">
                        {formatCompactNumber(completedServices)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{completedServices.toLocaleString()} {t('common:completed').toLowerCase()}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
                <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-emerald-600 dark:text-emerald-400" />
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
            <CardTitle className="text-lg">{t('common:filtersAndSearch')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t('financial:searchServices')}
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
                  <SelectValue placeholder={t('common:filterByStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common:allStatuses')}</SelectItem>
                  <SelectItem value="pending">{t('financial:pending')}</SelectItem>
                  <SelectItem value="in_progress">{t('financial:inProgress')}</SelectItem>
                  <SelectItem value="completed">{t('common:completed')}</SelectItem>
                  <SelectItem value="cancelled">{t('common:cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchQuery || statusFilter !== "all") && (
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
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs ml-auto"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
              >
                {t('common:clearAll')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-0 sm:p-6">
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3 p-3">
            {filteredServices?.map((service) => {
              const statusConfig = {
                'pending': { 
                  label: t('financial:pending'), 
                  icon: Clock,
                  color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800' 
                },
                'in_progress': { 
                  label: t('financial:inProgress'), 
                  icon: PlayCircle,
                  color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800' 
                },
                'completed': { 
                  label: t('common:completed'), 
                  icon: CheckCircle2,
                  color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800' 
                },
                'cancelled': { 
                  label: t('common:cancelled'), 
                  icon: CheckCircle2,
                  color: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' 
                },
              };
              
              const status = statusConfig[service.status as keyof typeof statusConfig];
              const StatusIcon = status?.icon;

              return (
                <div key={service.id} className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                  <div className="space-y-3">
                    {/* Top Row - Service Name, Icon, Status, Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950 flex-shrink-0">
                          <Wrench className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link href={`/services/${service.id}`}>
                            <p className="font-semibold text-slate-900 dark:text-slate-100 truncate cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                              {service.name}
                            </p>
                          </Link>
                          {service.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {status && (
                          <Badge className={`${status.color} font-medium px-2 py-1 text-xs`} variant="outline">
                            {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                            {status.label}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Middle Row - Key Details (grid-cols-2) */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">{t('orders:customer')}</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {service.customer?.name || t('common:na')}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">{t('financial:created')}</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {formatDate(service.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Cost Details (grid-cols-2) */}
                    <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">{t('financial:serviceCost')}</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {formatCurrency(service.serviceCost)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">{t('financial:partsCost')}</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {formatCurrency(service.partsCost)}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Row - Total Cost and Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('financial:totalCost')}</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(service.totalCost)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Link href={`/services/${service.id}`}>
                          <Button size="sm" variant="outline" className="h-8 border-cyan-300 dark:border-cyan-700 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950" data-testid={`button-view-${service.id}`}>
                            {t('common:view')}
                          </Button>
                        </Link>
                        <Link href={`/services/${service.id}/edit`}>
                          <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800" data-testid={`button-edit-${service.id}`}>
                            <Edit className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950" data-testid={`button-delete-${service.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('financial:deleteServiceTitle')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('financial:deleteServiceConfirm').replace('this service', `"${service.name}"`)}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteServiceMutation.mutate([service.id])}
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
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
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
                        {t('financial:serviceRecords')}
                      </h2>
                      <Badge variant="secondary" className="text-xs font-normal">
                        {filteredServices?.length || 0} {filteredServices?.length === 1 ? t('financial:service').toLowerCase() : t('financial:services').toLowerCase()}
                      </Badge>
                      {selectedRows.size > 0 && (
                        <>
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
                          {t('common:columns')}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>{t('common:toggleColumns')}</DropdownMenuLabel>
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
            <AlertDialogTitle>{t('common:deleteItems', { item: t('financial:services') })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common:deleteBulkConfirmation', { count: selectedServices.length, item: t('financial:services').toLowerCase() })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t('common:deleteItems', { item: t('financial:services') })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Services Dialog */}
      <Dialog open={showImportDialog} onOpenChange={(open) => {
        setShowImportDialog(open);
        if (!open) {
          setImportFile(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('financial:importServices')}</DialogTitle>
            <DialogDescription>
              {t('financial:importServicesDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Template Download Section */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <FileDown className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {t('financial:downloadTemplateFirst')}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    {t('financial:serviceTemplateDescription')}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    className="mt-3"
                    data-testid="button-download-template"
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    {t('financial:downloadTemplate')}
                  </Button>
                </div>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="space-y-2">
              <Label htmlFor="import-file">{t('financial:selectFile')}</Label>
              <Input
                id="import-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="cursor-pointer"
                data-testid="input-import-file"
              />
              {importFile && (
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  {importFile.name}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setImportFile(null);
              }}
              data-testid="button-cancel-import"
            >
              {t('common:cancel')}
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importFile || isImporting}
              data-testid="button-confirm-import"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {t('common:processing')}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {t('financial:importServices')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
