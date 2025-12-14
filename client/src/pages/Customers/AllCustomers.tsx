import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency, formatDate, formatCompactNumber } from "@/lib/currencyUtils";
import { exportToXLSX, exportToPDF, type PDFColumn } from "@/lib/exportUtils";
import { Plus, Search, Edit, Trash2, User, Mail, Phone, Star, MessageCircle, MapPin, MoreVertical, Ban, Filter, Users, DollarSign, FileDown, FileText, UserCog, FileUp } from "lucide-react";
import { ImportExportMenu } from "@/components/imports/ImportExportMenu";
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

export default function AllCustomers() {
  const { t } = useTranslation(['customers', 'common']);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUpdateTypeDialog, setShowUpdateTypeDialog] = useState(false);
  const [selectedCustomerType, setSelectedCustomerType] = useState<string>("");
  const [selectedCustomers, setSelectedCustomers] = useState<any[]>([]);
  const [isUpdatingType, setIsUpdatingType] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('customersVisibleColumns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {
      name: true,
      country: true,
      lastOrderDate: true,
      orderCount: true,
      totalSpent: true,
    };
  });

  // Toggle column visibility
  const toggleColumnVisibility = (columnKey: string) => {
    const newVisibility = { ...visibleColumns, [columnKey]: !visibleColumns[columnKey] };
    setVisibleColumns(newVisibility);
    localStorage.setItem('customersVisibleColumns', JSON.stringify(newVisibility));
  };

  const { data: customers = [], isLoading, error } = useQuery<any[]>({
    queryKey: searchQuery ? ['/api/customers', { search: searchQuery }] : ['/api/customers'],
    retry: false,
  });

  // Note: Backend API filters customers based on searchQuery parameter
  // filteredCustomers is the same as customers since filtering is done server-side
  const filteredCustomers = customers;

  // Error handling
  useEffect(() => {
    if (error) {
      toast({
        title: t('common:error'),
        description: t('customers:failedToLoadCustomers'),
        variant: "destructive",
      });
    }
  }, [error, toast, t]);

  const deleteCustomerMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest('DELETE', `/api/customers/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: t('common:success'),
        description: t('customers:deletedCustomersSuccess', { count: selectedCustomers.length }),
      });
      setSelectedCustomers([]);
    },
    onError: (error: any) => {
      console.error("Customer delete error:", error);
      const errorMessage = error.message || t('customers:failedToDeleteCustomers');
      toast({
        title: t('common:error'),
        description: errorMessage.includes('referenced') || errorMessage.includes('constraint')
          ? t('customers:cannotDeleteCustomerHasRecords') 
          : errorMessage,
        variant: "destructive",
      });
    },
  });

  const blacklistCustomerMutation = useMutation({
    mutationFn: async ({ id, isBlacklisted }: { id: string; isBlacklisted: boolean }) => {
      return apiRequest('PATCH', `/api/customers/${id}`, {
        isBlacklisted,
        blacklistedAt: isBlacklisted ? new Date().toISOString() : null,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: t('common:success'),
        description: variables.isBlacklisted 
          ? t('customers:customerBlacklisted')
          : t('customers:customerUnblacklisted'),
      });
    },
    onError: () => {
      toast({
        title: t('common:error'),
        description: t('customers:failedToUpdateBlacklist'),
        variant: "destructive",
      });
    },
  });

  const handleUpdateTypeConfirm = async () => {
    if (!selectedCustomerType || selectedCustomers.length === 0) return;
    
    setIsUpdatingType(true);
    try {
      await Promise.all(
        selectedCustomers.map(customer => 
          apiRequest('PATCH', `/api/customers/${customer.id}`, {
            customerType: selectedCustomerType,
          })
        )
      );
      
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: t('common:success'),
        description: t('customers:customerTypeUpdatedSuccess', { count: selectedCustomers.length }),
      });
      setSelectedCustomers([]);
      setShowUpdateTypeDialog(false);
      setSelectedCustomerType("");
    } catch (error: any) {
      console.error("Customer type update error:", error);
      toast({
        title: t('common:error'),
        description: t('customers:failedToUpdateCustomerType'),
        variant: "destructive",
      });
    } finally {
      setIsUpdatingType(false);
    }
  };

  const handleExportSelectedXLSX = (customers: any[]) => {
    try {
      if (!customers || customers.length === 0) {
        toast({
          title: t('common:noData'),
          description: t('customers:noCustomersToExport'),
          variant: "destructive",
        });
        return;
      }

      const exportData = customers.map(customer => ({
        [t('common:name')]: customer.name || '',
        [t('common:email')]: customer.email || '',
        [t('common:phone')]: customer.phone || '',
        [t('common:country')]: customer.country || '',
        [t('customers:lastPurchase')]: customer.lastOrderDate ? formatDate(customer.lastOrderDate) : '',
        [t('customers:totalOrders')]: customer.orderCount || 0,
        [t('customers:totalSpent')]: formatCurrency(parseFloat(customer.totalSpent || '0'), 'EUR'),
      }));

      exportToXLSX(exportData, 'customers-selected', t('customers:customers'));
      
      toast({
        title: t('common:exportSuccessful'),
        description: t('customers:exportedCustomersToXLSX', { count: customers.length }),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('common:exportFailed'),
        description: t('customers:failedToExportCustomersToXLSX'),
        variant: "destructive",
      });
    }
  };

  // Calculate stats
  const totalRevenue = filteredCustomers?.reduce((sum: number, c: any) => 
    sum + parseFloat(c.totalSpent || '0'), 0) || 0;

  // Define table columns
  const columns: DataTableColumn<any>[] = [
    {
      key: "name",
      header: t('customers:customer'),
      sortable: true,
      className: "min-w-[150px]",
      cell: (customer) => (
        <div>
          <Link href={`/customers/${customer.id}`}>
            <div className="font-medium text-xs lg:text-sm text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1 lg:gap-2">
              <span className="truncate max-w-[120px] lg:max-w-none">{customer.name}</span>
              {customer.isNew && (
                <Badge variant="outline" className="text-xs px-1 py-0 h-5 bg-green-50 border-green-300 text-green-700 hidden sm:flex">
                  {t('customers:newBadge')}
                </Badge>
              )}
              {customer.hasPayLaterBadge && (
                <Badge variant="outline" className="text-xs px-1 py-0 h-5 bg-yellow-50 border-yellow-300 text-yellow-700 hidden sm:flex">
                  {t('customers:payLater')}
                </Badge>
              )}
            </div>
          </Link>
          {customer.facebookName && (
            <div className="text-xs text-gray-500 truncate max-w-[120px] lg:max-w-none">{t('customers:fbPrefix')} {customer.facebookName}</div>
          )}
        </div>
      ),
    },
    {
      key: "country",
      header: t('customers:country'),
      sortable: true,
      className: "hidden lg:table-cell",
      cell: (customer) => customer.country ? (
        <div className="flex items-center gap-1 text-xs">
          <MapPin className="h-3 w-3 text-gray-400" />
          {customer.country}
        </div>
      ) : '-',
    },
    {
      key: "lastOrderDate",
      header: t('customers:lastPurchase'),
      sortable: true,
      className: "hidden md:table-cell",
      cell: (customer) => (
        <span className="text-xs">
          {customer.lastOrderDate 
            ? formatDate(customer.lastOrderDate) 
            : '-'}
        </span>
      ),
    },
    {
      key: "orderCount",
      header: t('common:orders'),
      sortable: true,
      className: "text-center",
      cell: (customer) => (
        <div className="text-center text-xs lg:text-sm">{customer.orderCount || 0}</div>
      ),
    },
    {
      key: "totalSpent",
      header: t('common:sales'),
      sortable: true,
      className: "text-right",
      cell: (customer) => (
        <span className="text-xs lg:text-sm font-medium">
          {formatCurrency(parseFloat(customer.totalSpent || '0'), 'EUR')}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-20",
      cell: (customer) => {
        // Extract Facebook ID from URL if available
        const getFacebookId = (fbId: string | null, fbName: string | null) => {
          if (!fbId && !fbName) return null;
          if (fbId) return fbId;
          // If we have a Facebook name but no ID, use the name as ID
          return fbName;
        };
        
        const facebookId = getFacebookId(customer.facebookId, customer.facebookName);
        
        return (
          <div className="flex items-center gap-0.5">
            {facebookId && (
              <a
                href={`https://m.me/${facebookId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="lg:hidden"
              >
                <Button size="icon" variant="ghost" className="h-7 w-7" title={t('customers:openInMessenger')}>
                  <MessageCircle className="h-3 w-3" />
                </Button>
              </a>
            )}
            {facebookId && (
              <a
                href={`https://m.me/${facebookId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden lg:block"
              >
                <Button size="sm" variant="ghost" title={t('customers:openInMessenger')}>
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </a>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7 lg:h-8 lg:w-8 ml-auto">
                  <MoreVertical className="h-3 w-3 lg:h-4 lg:w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/customers/${customer.id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    {t('common:edit')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleBlacklistCustomer(customer)}
                  className="text-destructive"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  {t('customers:blacklistCustomer')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
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
      label: t('common:sendEmail'),
      action: (customers: any[]) => {
        toast({
          title: t('customers:emailServiceNotConfigured'),
          description: t('customers:emailServiceComingSoon'),
        });
      },
    },
    {
      type: "button" as const,
      label: t('customers:updateType'),
      action: (customers: any[]) => {
        setSelectedCustomers(customers);
        setSelectedCustomerType("");
        setShowUpdateTypeDialog(true);
      },
    },
    {
      type: "button" as const,
      label: t('common:delete'),
      variant: "destructive" as const,
      action: (customers: any[]) => {
        setSelectedCustomers(customers);
        setShowDeleteDialog(true);
      },
    },
    {
      type: "button" as const,
      label: t('common:export'),
      action: (customers: any[]) => {
        handleExportSelectedXLSX(customers);
      },
    },
  ];

  const handleDeleteConfirm = () => {
    deleteCustomerMutation.mutate(selectedCustomers.map(customer => customer.id));
    setShowDeleteDialog(false);
  };

  const handleBlacklistCustomer = (customer: any) => {
    const isCurrentlyBlacklisted = customer.isBlacklisted;
    blacklistCustomerMutation.mutate({
      id: customer.id,
      isBlacklisted: !isCurrentlyBlacklisted,
    });
  };

  const handleExportXLSX = () => {
    try {
      if (!filteredCustomers || filteredCustomers.length === 0) {
        toast({
          title: t('common:noData'),
          description: t('customers:noCustomersToExport'),
          variant: "destructive",
        });
        return;
      }

      const exportData = filteredCustomers.map(customer => ({
        [t('common:name')]: customer.name || '',
        [t('common:email')]: customer.email || '',
        [t('common:phone')]: customer.phone || '',
        [t('common:country')]: customer.country || '',
        [t('customers:lastPurchase')]: customer.lastOrderDate ? formatDate(customer.lastOrderDate) : '',
        [t('customers:totalOrders')]: customer.orderCount || 0,
        [t('customers:totalSpent')]: formatCurrency(parseFloat(customer.totalSpent || '0'), 'EUR'),
      }));

      exportToXLSX(exportData, 'customers', t('customers:customers'));
      
      toast({
        title: t('common:exportSuccessful'),
        description: t('customers:exportedCustomersToXLSX', { count: filteredCustomers.length }),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('common:exportFailed'),
        description: t('customers:failedToExportCustomersToXLSX'),
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    try {
      if (!filteredCustomers || filteredCustomers.length === 0) {
        toast({
          title: t('common:noData'),
          description: t('customers:noCustomersToExport'),
          variant: "destructive",
        });
        return;
      }

      const columns: PDFColumn[] = [
        { key: "name", header: t('common:name') },
        { key: "email", header: t('common:email') },
        { key: "phone", header: t('common:phone') },
        { key: "country", header: t('common:country') },
        { key: "lastPurchase", header: t('customers:lastPurchase') },
        { key: "orderCount", header: t('customers:totalOrders') },
        { key: "totalSpent", header: t('customers:totalSpent') },
      ];

      const exportData = filteredCustomers.map(customer => ({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        country: customer.country || '',
        lastPurchase: customer.lastOrderDate ? formatDate(customer.lastOrderDate) : '',
        orderCount: customer.orderCount || 0,
        totalSpent: formatCurrency(parseFloat(customer.totalSpent || '0'), 'EUR'),
      }));

      exportToPDF(t('customers:customersReport'), exportData, columns, 'customers');
      
      toast({
        title: t('common:exportSuccessful'),
        description: t('customers:exportedCustomersToPDF', { count: filteredCustomers.length }),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t('common:exportFailed'),
        description: t('customers:failedToExportCustomersToPDF'),
        variant: "destructive",
      });
    }
  };

  const handleImportXLSX = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: t('common:error'),
        description: t('customers:invalidFileFormat'),
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsImporting(true);
    toast({
      title: t('customers:importingCustomers'),
      description: t('common:pleaseWait'),
    });

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];

      if (jsonData.length === 0) {
        toast({
          title: t('common:error'),
          description: t('customers:noValidRowsToImport'),
          variant: "destructive",
        });
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const mapHeaderToField = (row: Record<string, any>) => {
        const customer: Record<string, any> = { isNew: true };
        
        for (const [key, value] of Object.entries(row)) {
          const lowerKey = key.toLowerCase().trim();
          if (lowerKey === 'name' || lowerKey === 'tên' || lowerKey === 'ten') {
            customer.name = String(value);
          } else if (lowerKey === 'email') {
            customer.email = String(value);
          } else if (lowerKey === 'phone' || lowerKey === 'điện thoại' || lowerKey === 'dien thoai' || lowerKey === 'tel') {
            customer.phone = String(value);
          } else if (lowerKey === 'country' || lowerKey === 'quốc gia' || lowerKey === 'quoc gia') {
            customer.country = String(value);
          } else if (lowerKey === 'address' || lowerKey === 'địa chỉ' || lowerKey === 'dia chi') {
            customer.address = String(value);
          } else if (lowerKey === 'city' || lowerKey === 'thành phố' || lowerKey === 'thanh pho') {
            customer.city = String(value);
          } else if (lowerKey === 'notes' || lowerKey === 'ghi chú' || lowerKey === 'ghi chu') {
            customer.notes = String(value);
          }
        }
        return customer;
      };

      const validCustomers = jsonData
        .map(mapHeaderToField)
        .filter(c => c.name && c.name.trim() !== '');

      if (validCustomers.length === 0) {
        toast({
          title: t('common:error'),
          description: t('customers:noValidRowsToImport'),
          variant: "destructive",
        });
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const customer of validCustomers) {
        try {
          await apiRequest('POST', '/api/customers', customer);
          successCount++;
        } catch (error) {
          console.error('Failed to import customer:', customer.name, error);
          failCount++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });

      if (successCount > 0) {
        toast({
          title: t('customers:importSuccessful'),
          description: t('customers:importedCustomers', { count: successCount }),
        });
      }

      if (failCount > 0) {
        toast({
          title: t('common:warning'),
          description: `${failCount} customer(s) failed to import`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: t('common:error'),
        description: t('customers:failedToImportCustomers'),
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px] bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-cyan-200 dark:border-cyan-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-cyan-600 dark:border-cyan-400 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">{t('customers:loadingCustomers')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 bg-gray-50 dark:bg-slate-900 min-h-screen -m-6 p-2 sm:p-4 md:p-6 overflow-x-hidden">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('customers:customers')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
            {t('customers:monitorCustomerRelationships')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportXLSX}
            accept=".xlsx,.xls"
            className="hidden"
            data-testid="input-import-file"
          />
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            data-testid="button-import-customers"
          >
            <FileUp className="h-4 w-4 mr-2" />
            {isImporting ? t('customers:importingCustomers') : t('customers:importFromXLSX')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto" data-testid="button-export-customers">
                <FileDown className="h-4 w-4 mr-2" />
                {t('common:export')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportXLSX} data-testid="menu-item-export-xlsx">
                <FileDown className="h-4 w-4 mr-2" />
                {t('common:exportToXLSX')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} data-testid="menu-item-export-pdf">
                <FileText className="h-4 w-4 mr-2" />
                {t('common:exportToPDF')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/customers/add" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto" data-testid="button-add-customer">
              <Plus className="h-4 w-4 mr-2" />
              {t('customers:addCustomer')}
            </Button>
          </Link>
          <ImportExportMenu 
            entity="customers" 
            entityLabel="Customers" 
            onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['/api/customers'] })} 
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {/* Total Customers */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('customers:totalCustomers')}
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate">
                  {filteredCustomers?.length || 0}
                </p>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* VIP Customers */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('customers:vipCustomers')}
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate">
                  {filteredCustomers?.filter((c: any) => c.type === 'vip').length || 0}
                </p>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950">
                <Star className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Regular Customers */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('customers:regularCustomers')}
                </p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate">
                  {filteredCustomers?.filter((c: any) => c.type === 'regular').length || 0}
                </p>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950">
                <User className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('common:totalRevenue')}
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 cursor-help truncate">
                        €{formatCompactNumber(totalRevenue)}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{formatCurrency(totalRevenue, 'EUR')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            <CardTitle className="text-lg text-slate-900 dark:text-slate-100">{t('common:filtersAndSearch')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Input
                placeholder={t('common:searchPlaceholder', { item: t('customers:customers').toLowerCase() })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 focus:border-cyan-500 dark:focus:border-cyan-400 bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                data-testid="input-search-customers"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card className="overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800">
        <CardContent className="p-0 sm:p-6">
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3 p-3">
            {filteredCustomers?.map((customer: any) => {
              const getFacebookId = (fbId: string | null, fbName: string | null) => {
                if (!fbId && !fbName) return null;
                if (fbId) return fbId;
                return fbName;
              };
              
              const facebookId = getFacebookId(customer.facebookId, customer.facebookName);
              
              return (
                <div key={customer.id} className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-100 dark:border-slate-800 p-4" data-testid={`card-customer-${customer.id}`}>
                  <div className="space-y-3">
                    {/* Top Row - Avatar, Name, Type Badge, Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarImage src={customer.imageUrl} />
                          <AvatarFallback className="text-sm bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900 dark:to-blue-900 text-cyan-700 dark:text-cyan-300">
                            {customer.name?.charAt(0)?.toUpperCase() || 'C'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <Link href={`/customers/${customer.id}`}>
                            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400" data-testid={`text-customer-name-${customer.id}`}>
                              {customer.name}
                            </p>
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            {customer.isNew && (
                              <Badge variant="outline" className="text-xs px-2 py-0 h-5 bg-green-50 dark:bg-green-900 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300">
                                {t('customers:newBadge')}
                              </Badge>
                            )}
                            {customer.type === 'vip' ? (
                              <Badge variant="default" className="text-xs px-2 py-0 h-5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                                <Star className="h-3 w-3 mr-1" />
                                VIP
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs px-2 py-0 h-5 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                Regular
                              </Badge>
                            )}
                            {customer.hasPayLaterBadge && (
                              <Badge variant="outline" className="text-xs px-2 py-0 h-5 bg-yellow-50 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300">
                                Pay Later
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {facebookId && (
                          <a
                            href={`https://m.me/${facebookId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button size="icon" variant="ghost" className="h-8 w-8" data-testid={`button-messenger-${customer.id}`}>
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                        <Link href={`/customers/${customer.id}/edit`}>
                          <Button size="icon" variant="ghost" className="h-8 w-8" data-testid={`button-edit-${customer.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/customers/${customer.id}`}>
                          <Button size="icon" variant="ghost" className="h-8 w-8" data-testid={`button-view-${customer.id}`}>
                            <User className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                    
                    {/* Middle Row - Contact Details */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="space-y-2">
                        {customer.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-400 truncate text-xs" data-testid={`text-email-${customer.id}`}>
                              {customer.email}
                            </span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-400 truncate text-xs" data-testid={`text-phone-${customer.id}`}>
                              {customer.phone}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        {customer.country && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-400 truncate text-xs" data-testid={`text-country-${customer.id}`}>
                              {customer.country}
                            </span>
                          </div>
                        )}
                        {customer.lastOrderDate && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Last: {formatDate(customer.lastOrderDate)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Bottom Row - Orders & Spending */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-700">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('customers:totalOrders')}</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100" data-testid={`text-order-count-${customer.id}`}>
                          {customer.orderCount || 0}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('customers:lifetimeSpending')}</p>
                        <p className="text-lg font-bold text-cyan-600 dark:text-cyan-400" data-testid={`text-total-spent-${customer.id}`}>
                          {formatCurrency(parseFloat(customer.totalSpent || '0'), 'EUR')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Header & Controls - Always Visible */}
          <div className="flex items-center justify-between gap-3 px-4 sm:px-0 py-4 sm:py-0 sm:pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('customers:customers')}</h2>
              <Badge variant="secondary" className="text-sm">
                {filteredCustomers?.length || 0}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
                <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">{t('common:toggleColumns')}</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.name !== false}
                  onCheckedChange={() => toggleColumnVisibility('name')}
                >
                  {t('customers:customer')}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.country !== false}
                  onCheckedChange={() => toggleColumnVisibility('country')}
                >
                  {t('customers:country')}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.lastOrderDate !== false}
                  onCheckedChange={() => toggleColumnVisibility('lastOrderDate')}
                >
                  {t('customers:lastPurchase')}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.orderCount !== false}
                  onCheckedChange={() => toggleColumnVisibility('orderCount')}
                >
                  {t('common:orders')}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.totalSpent !== false}
                  onCheckedChange={() => toggleColumnVisibility('totalSpent')}
                >
                  {t('common:sales')}
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <div className="overflow-x-auto">
              <DataTable
                data={filteredCustomers}
                columns={visibleColumnsFiltered}
                bulkActions={bulkActions}
                getRowKey={(customer) => customer.id}
                itemsPerPageOptions={[10, 20, 50, 100]}
                defaultItemsPerPage={20}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-lg bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-100">{t('customers:deleteCustomer')}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700 dark:text-gray-300">
              {t('common:deleteConfirmCount', { count: selectedCustomers.length, item: t('customers:customers').toLowerCase() })} {t('common:deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white dark:bg-slate-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800">{t('common:cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800">
              {t('common:delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update Customer Type Dialog */}
      <Dialog open={showUpdateTypeDialog} onOpenChange={setShowUpdateTypeDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-md bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <UserCog className="h-5 w-5" />
              {t('customers:updateType')}
            </DialogTitle>
            <DialogDescription className="text-gray-700 dark:text-gray-300">
              {t('customers:updateTypeDescription', { count: selectedCustomers.length })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customerType" className="text-gray-900 dark:text-gray-100">
                {t('customers:customerType')}
              </Label>
              <Select value={selectedCustomerType} onValueChange={setSelectedCustomerType}>
                <SelectTrigger id="customerType" className="bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100" data-testid="select-customer-type">
                  <SelectValue placeholder={t('customers:selectCustomerType')} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
                  <SelectItem value="retail" data-testid="option-retail">{t('customers:retail')}</SelectItem>
                  <SelectItem value="wholesale" data-testid="option-wholesale">{t('customers:wholesale')}</SelectItem>
                  <SelectItem value="distributor" data-testid="option-distributor">{t('customers:distributor')}</SelectItem>
                  <SelectItem value="vip" data-testid="option-vip">{t('customers:vip')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedCustomers.length > 0 && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('customers:selectedCustomersPreview')}: {selectedCustomers.slice(0, 3).map(c => c.name).join(', ')}
                {selectedCustomers.length > 3 && ` +${selectedCustomers.length - 3} ${t('common:more')}`}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpdateTypeDialog(false)}
              className="bg-white dark:bg-slate-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
              data-testid="button-cancel-update-type"
            >
              {t('common:cancel')}
            </Button>
            <Button
              onClick={handleUpdateTypeConfirm}
              disabled={!selectedCustomerType || isUpdatingType}
              className="bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-800"
              data-testid="button-confirm-update-type"
            >
              {isUpdatingType ? t('common:updating') : t('customers:updateType')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
