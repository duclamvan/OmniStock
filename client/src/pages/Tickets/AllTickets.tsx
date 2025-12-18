import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { fuzzySearch } from "@/lib/fuzzySearch";
import { formatCompactNumber } from "@/lib/currencyUtils";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  Ticket as TicketIcon, 
  TrendingUp, 
  Clock,
  Search, 
  Eye,
  AlertCircle,
  CheckCircle2,
  User,
  Calendar,
  Edit,
  Filter,
  MoreVertical,
  MessageSquare,
  FileDown,
  FileText,
  LayoutGrid,
  LayoutList,
  Download,
  Upload,
  Check,
  RefreshCw
} from "lucide-react";
import { exportToXLSX, exportToPDF, PDFColumn } from "@/lib/exportUtils";
import { format } from "date-fns";
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
  DropdownMenuCheckboxItem,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function AllTickets() {
  const { t } = useTranslation('system');
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<any[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => {
    const saved = localStorage.getItem('ticketsViewMode');
    return (saved === 'card' || saved === 'table') ? saved : 'table';
  });

  // Save view mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('ticketsViewMode', viewMode);
  }, [viewMode]);

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('ticketsVisibleColumns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {
      ticketNumber: true,
      customer: true,
      subject: true,
      priority: true,
      status: true,
      createdAt: true,
    };
  });

  // Toggle column visibility
  const toggleColumnVisibility = (columnKey: string) => {
    const newVisibility = { ...visibleColumns, [columnKey]: !visibleColumns[columnKey] };
    setVisibleColumns(newVisibility);
    localStorage.setItem('ticketsVisibleColumns', JSON.stringify(newVisibility));
  };

  const { data: tickets = [], isLoading, error } = useQuery<any[]>({
    queryKey: ['/api/tickets'],
    retry: false,
  });

  // Error handling
  useEffect(() => {
    if (error) {
      toast({
        title: t('error'),
        description: t('failedToLoadTickets'),
        variant: "destructive",
      });
    }
  }, [error, toast, t]);

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest('DELETE', `/api/tickets/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      toast({
        title: t('success'),
        description: t('deletedTicketsSuccess', { count: selectedTickets.length }),
      });
      setSelectedTickets([]);
    },
    onError: (error: any) => {
      console.error("Ticket delete error:", error);
      const errorMessage = error.message || t('failedToDeleteTickets');
      toast({
        title: t('error'),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Filter tickets
  let filteredTickets = tickets || [];

  // Apply status and priority filters
  filteredTickets = filteredTickets.filter(ticket => {
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  // Apply search filter
  if (searchQuery) {
    const results = fuzzySearch(filteredTickets, searchQuery, {
      fields: ['ticketId', 'title', 'description', 'category', 'customer.name'],
      threshold: 0.2,
      fuzzy: true,
      vietnameseNormalization: true,
    });
    filteredTickets = results.map(r => r.item);
  }

  // Calculate stats
  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === 'open').length;
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
  const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "secondary",
      in_progress: "default",
      resolved: "outline",
      closed: "outline"
    };
    
    const labels: Record<string, string> = {
      open: t('open'),
      in_progress: t('inProgress'),
      resolved: t('resolved'),
      closed: t('closed')
    };

    return (
      <Badge variant={variants[status] || "outline"} data-testid={`badge-status-${status}`}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      low: "outline",
      medium: "secondary",
      high: "default",
      urgent: "destructive"
    };

    const labels: Record<string, string> = {
      low: t('low'),
      medium: t('medium'),
      high: t('high'),
      urgent: t('urgent')
    };

    return (
      <Badge variant={variants[priority] || "outline"} data-testid={`badge-priority-${priority}`}>
        {labels[priority] || priority}
      </Badge>
    );
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      return format(date, 'dd/MM/yyyy HH:mm');
    } catch {
      return '-';
    }
  };

  // Define table columns
  const columns: DataTableColumn<any>[] = [
    {
      key: "ticketNumber",
      header: t('ticketId'),
      sortable: true,
      className: "min-w-[120px]",
      cell: (ticket) => (
        <Link href={`/tickets/${ticket.id}`}>
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950 group-hover:from-cyan-100 group-hover:to-blue-100 dark:group-hover:from-cyan-900 dark:group-hover:to-blue-900 transition-colors">
              <TicketIcon className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                {ticket.ticketId || `#${ticket.id.substring(0, 8)}`}
              </div>
            </div>
          </div>
        </Link>
      ),
    },
    {
      key: "customer",
      header: t('customer'),
      sortable: true,
      className: "min-w-[150px]",
      cell: (ticket) => (
        ticket.customer ? (
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
              <User className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
            </div>
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {ticket.customer.name}
            </span>
          </div>
        ) : (
          <span className="text-sm text-slate-400">-</span>
        )
      ),
    },
    {
      key: "subject",
      header: t('subject'),
      sortable: true,
      className: "min-w-[250px]",
      cell: (ticket) => (
        <div className="max-w-md">
          <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
            {ticket.title}
          </div>
          {ticket.description && (
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {ticket.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "priority",
      header: t('priority'),
      sortable: true,
      className: "text-center",
      cell: (ticket) => getPriorityBadge(ticket.priority),
    },
    {
      key: "status",
      header: t('status'),
      sortable: true,
      className: "text-center",
      cell: (ticket) => getStatusBadge(ticket.status),
    },
    {
      key: "createdAt",
      header: t('created'),
      sortable: true,
      className: "text-right",
      cell: (ticket) => (
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
            </span>
          </div>
          <div className="text-xs text-slate-500">
            {format(new Date(ticket.createdAt), 'HH:mm')}
          </div>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-16 text-center",
      cell: (ticket) => (
        <Link href={`/tickets/edit/${ticket.id}`}>
          <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-cyan-50 dark:hover:bg-cyan-950" data-testid={`button-edit-${ticket.id}`}>
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
      label: t('delete'),
      variant: "destructive" as const,
      action: (tickets: any[]) => {
        setSelectedTickets(tickets);
        setShowDeleteDialog(true);
      },
    },
  ];

  const handleDeleteConfirm = () => {
    deleteMutation.mutate(selectedTickets.map(ticket => ticket.id));
    setShowDeleteDialog(false);
  };

  // Export handlers - Comprehensive export with all ticket fields
  const handleExportXLSX = () => {
    try {
      if (!filteredTickets || filteredTickets.length === 0) {
        toast({
          title: t('warning') || 'Warning',
          description: t('noDataToExport') || 'No data to export',
          variant: "destructive",
        });
        return;
      }

      const exportData = filteredTickets.map(ticket => ({
        'Ticket ID': ticket.ticketId || '-',
        'Subject': ticket.title || '-',
        'Description': ticket.description || '-',
        'Status': ticket.status || '-',
        'Priority': ticket.priority || '-',
        'Category': ticket.category || '-',
        'Customer Name': ticket.customer?.name || '-',
        'Customer Email': ticket.customer?.email || '-',
        'Customer Phone': ticket.customer?.phone || '-',
        'Assigned To': ticket.assignedTo || '-',
        'Related Order': ticket.orderId || '-',
        'Due Date': ticket.dueDate ? format(new Date(ticket.dueDate), 'yyyy-MM-dd') : '-',
        'Created Date': ticket.createdAt ? format(new Date(ticket.createdAt), 'yyyy-MM-dd HH:mm') : '-',
        'Updated Date': ticket.updatedAt ? format(new Date(ticket.updatedAt), 'yyyy-MM-dd HH:mm') : '-',
        'Resolved Date': ticket.resolvedAt ? format(new Date(ticket.resolvedAt), 'yyyy-MM-dd HH:mm') : '-',
        'Notes': ticket.notes || '-',
      }));

      exportToXLSX(exportData, `Tickets_${format(new Date(), 'yyyy-MM-dd')}`, t('tickets'));
      
      toast({
        title: t('success'),
        description: t('exportSuccessTickets', { count: exportData.length, format: 'XLSX' }),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('error'),
        description: t('exportFailedTickets', { format: 'XLSX' }),
        variant: "destructive",
      });
    }
  };

  // Download import template - comprehensive matching export format with 2 sample rows
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Ticket ID': 'TKT-001',
        'Subject': 'Product inquiry about nail polish set',
        'Description': 'Customer asking about color options for gel polish set',
        'Status': 'open',
        'Priority': 'medium',
        'Category': 'product_question',
        'Customer Name': 'Jane Smith',
        'Customer Email': 'jane@example.com',
        'Customer Phone': '+420123456789',
        'Assigned To': 'support@company.com',
        'Related Order': 'ORD-251218-0001',
        'Due Date': '2024-12-25',
        'Notes': 'Customer prefers pink and nude colors',
      },
      {
        'Ticket ID': 'TKT-002',
        'Subject': 'Shipping delay complaint',
        'Description': 'Package has not arrived after 10 days. Customer is frustrated.',
        'Status': 'in_progress',
        'Priority': 'high',
        'Category': 'shipping_issue',
        'Customer Name': 'John Doe',
        'Customer Email': 'john@example.com',
        'Customer Phone': '+420987654321',
        'Assigned To': 'logistics@company.com',
        'Related Order': 'ORD-251210-0042',
        'Due Date': '2024-12-20',
        'Notes': 'Check with carrier PPL for tracking update',
      }
    ];
    exportToXLSX(templateData, 'tickets_import_template', t('importTemplate') || 'Import Template');
    toast({
      title: t('success'),
      description: t('templateDownloaded') || 'Template downloaded successfully',
    });
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: t('error'),
          description: t('invalidFileType') || 'Please select an Excel file (.xlsx or .xls)',
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
        title: t('error'),
        description: t('noFileSelected') || 'No file selected',
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch('/api/tickets/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t('importFailed') || 'Import failed');
      }

      const result = await response.json();
      
      toast({
        title: t('success'),
        description: t('ticketsImportSuccess', { count: result.imported || 0 }) || `Successfully imported ${result.imported || 0} ticket(s)`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/tickets'] });
      setShowImportDialog(false);
      setImportFile(null);
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: t('error'),
        description: error.message || t('importFailed') || 'Import failed',
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportPDF = () => {
    try {
      if (!filteredTickets || filteredTickets.length === 0) {
        toast({
          title: t('warning') || 'Warning',
          description: t('noDataToExport') || 'No data to export',
          variant: "destructive",
        });
        return;
      }

      const exportData = filteredTickets.map(ticket => ({
        ticketId: ticket.ticketId || '-',
        subject: ticket.title || '-',
        customer: ticket.customer?.name || '-',
        priority: ticket.priority === 'urgent' ? t('urgent')
          : ticket.priority === 'high' ? t('high')
          : ticket.priority === 'normal' ? t('normal')
          : ticket.priority === 'low' ? t('low')
          : ticket.priority || '-',
        status: ticket.status === 'open' ? t('open')
          : ticket.status === 'in_progress' ? t('inProgress')
          : ticket.status === 'resolved' ? t('resolved')
          : ticket.status === 'closed' ? t('closed')
          : ticket.status || '-',
        category: ticket.category || '-',
        createdDate: ticket.createdAt ? format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm') : '-',
        updatedDate: ticket.updatedAt ? format(new Date(ticket.updatedAt), 'dd/MM/yyyy HH:mm') : '-',
      }));

      const columns: PDFColumn[] = [
        { key: 'ticketId', header: t('ticketId') },
        { key: 'subject', header: t('subject') },
        { key: 'customer', header: t('customer') },
        { key: 'priority', header: t('priority') },
        { key: 'status', header: t('status') },
        { key: 'category', header: t('category') },
        { key: 'createdDate', header: t('createdDate') },
        { key: 'updatedDate', header: t('updatedDate') },
      ];

      exportToPDF(t('ticketsReport'), exportData, columns, `Tickets_${format(new Date(), 'yyyy-MM-dd')}`);
      
      toast({
        title: t('success'),
        description: t('exportSuccessTickets', { count: exportData.length, format: 'PDF' }),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('error'),
        description: t('exportFailedTickets', { format: 'PDF' }),
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
          <p className="text-slate-600 dark:text-slate-400 font-medium">{t('loadingTickets')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-6 overflow-x-hidden">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('supportTickets')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
            {t('trackCustomerSupportTickets')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Import/Export Menu - Three Dot Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                data-testid="button-import-export-menu"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('importExport') || 'Import / Export'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowImportDialog(true)} data-testid="menu-import-xlsx">
                <Upload className="h-4 w-4 mr-2" />
                {t('importFromExcel') || 'Import from Excel'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportXLSX} data-testid="menu-export-xlsx">
                <FileDown className="h-4 w-4 mr-2" />
                {t('exportToExcel') || 'Export to Excel'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} data-testid="menu-export-pdf">
                <FileText className="h-4 w-4 mr-2" />
                {t('exportToPDF') || 'Export to PDF'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Add Ticket Button */}
          <Link href="/tickets/add">
            <Button className="w-full sm:w-auto" data-testid="button-add-ticket">
              <Plus className="h-4 w-4 mr-2" />
              {t('newTicket')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {/* Total Tickets */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('totalTickets')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help" data-testid="stat-total-tickets">
                        {formatCompactNumber(totalTickets)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{totalTickets.toLocaleString()} tickets</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
                <TicketIcon className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Open Tickets */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('open')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-600 dark:text-amber-400 truncate cursor-help" data-testid="stat-open-tickets">
                        {formatCompactNumber(openTickets)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{openTickets.toLocaleString()} open</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950">
                <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* In Progress Tickets */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('inProgress')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400 truncate cursor-help" data-testid="stat-inprogress-tickets">
                        {formatCompactNumber(inProgressTickets)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{inProgressTickets.toLocaleString()} in progress</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resolved Tickets */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('resolved')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400 truncate cursor-help" data-testid="stat-resolved-tickets">
                        {formatCompactNumber(resolvedTickets)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{resolvedTickets.toLocaleString()} resolved</p>
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

      {/* Filters Section */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            <CardTitle className="text-lg">{t('filters')} & {t('search')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('searchTickets')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 border-slate-200 dark:border-slate-800 focus:border-cyan-500"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 border-slate-200 dark:border-slate-800 focus:border-cyan-500" data-testid="select-status-filter">
                <SelectValue placeholder={t('status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all')} {t('status')}</SelectItem>
                <SelectItem value="open">{t('open')}</SelectItem>
                <SelectItem value="in_progress">{t('inProgress')}</SelectItem>
                <SelectItem value="resolved">{t('resolved')}</SelectItem>
                <SelectItem value="closed">{t('closed')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-10 border-slate-200 dark:border-slate-800 focus:border-cyan-500" data-testid="select-priority-filter">
                <SelectValue placeholder={t('priority')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all')} {t('priority')}</SelectItem>
                <SelectItem value="low">{t('low')}</SelectItem>
                <SelectItem value="medium">{t('medium')}</SelectItem>
                <SelectItem value="high">{t('high')}</SelectItem>
                <SelectItem value="urgent">{t('urgent')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets View */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">{t('allTickets')}</CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Showing {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle - Mobile & Desktop */}
              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg p-1 bg-slate-50 dark:bg-slate-900">
                <Button
                  variant={viewMode === 'card' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('card')}
                  className={cn(
                    "h-7 px-3",
                    viewMode === 'card' 
                      ? "shadow-sm" 
                      : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                  data-testid="button-view-card"
                >
                  <LayoutGrid className="h-4 w-4 mr-1.5" />
                  Cards
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className={cn(
                    "h-7 px-3",
                    viewMode === 'table' 
                      ? "shadow-sm" 
                      : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                  data-testid="button-view-table"
                >
                  <LayoutList className="h-4 w-4 mr-1.5" />
                  Table
                </Button>
              </div>
              {/* Column Toggle - only shown for table view on desktop */}
              {viewMode === 'table' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8 hidden sm:flex">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[200px]">
                    <DropdownMenuLabel>{t('filters')}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={visibleColumns.ticketNumber !== false}
                      onCheckedChange={() => toggleColumnVisibility('ticketNumber')}
                    >
                      {t('ticketId')}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={visibleColumns.customer !== false}
                      onCheckedChange={() => toggleColumnVisibility('customer')}
                    >
                      {t('customer')}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={visibleColumns.subject !== false}
                      onCheckedChange={() => toggleColumnVisibility('subject')}
                    >
                      {t('subject')}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={visibleColumns.priority !== false}
                      onCheckedChange={() => toggleColumnVisibility('priority')}
                    >
                      {t('priority')}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={visibleColumns.status !== false}
                      onCheckedChange={() => toggleColumnVisibility('status')}
                    >
                      {t('status')}
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={visibleColumns.createdAt !== false}
                      onCheckedChange={() => toggleColumnVisibility('createdAt')}
                    >
                      {t('created')}
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3 p-3">
            {filteredTickets.length === 0 ? (
              <div className="text-center py-12">
                <TicketIcon className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                <p className="text-slate-500 dark:text-slate-400">{t('noTicketsFound')}</p>
              </div>
            ) : (
              filteredTickets.map((ticket: any) => (
                <div 
                  key={ticket.id} 
                  className="bg-white dark:bg-slate-950 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-4"
                  data-testid={`card-mobile-ticket-${ticket.id}`}
                >
                  <div className="space-y-3">
                    {/* Top Row - Ticket ID, Title, Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950 flex-shrink-0">
                          <TicketIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link href={`/tickets/${ticket.id}`}>
                            <p className="font-semibold text-slate-900 dark:text-slate-100 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer">
                              {ticket.ticketId || `#${ticket.id.substring(0, 8)}`}
                            </p>
                          </Link>
                          <p className="text-sm text-slate-900 dark:text-slate-100 mt-1 line-clamp-2">
                            {ticket.title}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Link href={`/tickets/${ticket.id}`}>
                          <Button size="icon" variant="ghost" className="h-8 w-8" data-testid={`button-view-${ticket.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/tickets/edit/${ticket.id}`}>
                          <Button size="icon" variant="ghost" className="h-8 w-8" data-testid={`button-respond-${ticket.id}`}>
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Middle Row - Key Details in 2 columns */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">{t('customer')}</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {ticket.customer?.name || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">Category</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100 capitalize truncate">
                          {ticket.category?.replace(/_/g, ' ') || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">Created</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">Updated</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {format(new Date(ticket.updatedAt || ticket.createdAt), 'MMM d, HH:mm')}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Row - Status Badges */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(ticket.priority)}
                        {getStatusBadge(ticket.status)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden sm:block">
            {viewMode === 'table' ? (
              <DataTable
                data={filteredTickets}
                columns={visibleColumnsFiltered}
                bulkActions={bulkActions}
                getRowKey={(ticket) => ticket.id}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTickets.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <TicketIcon className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                    <p className="text-slate-500 dark:text-slate-400">{t('noTicketsFound')}</p>
                  </div>
                ) : (
                  filteredTickets.map((ticket: any) => (
                    <Card 
                      key={ticket.id} 
                      className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all hover:border-cyan-300 dark:hover:border-cyan-700 cursor-pointer group"
                      onClick={() => navigate(`/tickets/${ticket.id}`)}
                      data-testid={`card-ticket-${ticket.id}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950 group-hover:from-cyan-100 group-hover:to-blue-100 dark:group-hover:from-cyan-900 dark:group-hover:to-blue-900 transition-colors">
                              <TicketIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                {ticket.ticketId || `#${ticket.id.substring(0, 8)}`}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                          <Link 
                            href={`/tickets/edit/${ticket.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 hover:bg-cyan-50 dark:hover:bg-cyan-950"
                              data-testid={`button-edit-card-${ticket.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-1 line-clamp-2">
                            {ticket.title}
                          </h4>
                          {ticket.description && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                              {ticket.description}
                            </p>
                          )}
                        </div>
                        {ticket.customer && (
                          <div className="flex items-center gap-2 text-sm">
                            <div className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                              <User className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                            </div>
                            <span className="text-slate-700 dark:text-slate-300 truncate">
                              {ticket.customer.name}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            {getPriorityBadge(ticket.priority)}
                            {getStatusBadge(ticket.status)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                ))
              )}
            </div>
          )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedTickets.length} ticket(s). 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} data-testid="button-confirm-delete">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Tickets Dialog */}
      <Dialog open={showImportDialog} onOpenChange={(open) => {
        setShowImportDialog(open);
        if (!open) {
          setImportFile(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('importTickets') || 'Import Tickets'}</DialogTitle>
            <DialogDescription>
              {t('importTicketsDescription') || 'Upload an Excel file to import tickets. Download the template first to ensure correct format.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Template Download Section */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <FileDown className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {t('downloadTemplateFirst') || 'Download the template first'}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    {t('templateDescription') || 'Use this template to ensure your data is formatted correctly for import.'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    className="mt-3"
                    data-testid="button-download-template"
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    {t('downloadTemplate') || 'Download Template'}
                  </Button>
                </div>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="space-y-2">
              <Label htmlFor="import-file">{t('selectFile') || 'Select File'}</Label>
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
              {t('cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importFile || isImporting}
              data-testid="button-confirm-import"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {t('processing') || 'Processing...'}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {t('importTickets') || 'Import Tickets'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
