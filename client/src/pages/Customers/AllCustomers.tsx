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
import { usePageTitle } from "@/hooks/use-page-title";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency, formatDate, formatCompactNumber } from "@/lib/currencyUtils";
import { exportToXLSX, exportToPDF, type PDFColumn } from "@/lib/exportUtils";
import { Plus, Search, Edit, Trash2, User, Mail, Phone, Star, MessageCircle, MapPin, MoreVertical, Ban, Filter, Users, DollarSign, FileDown, FileText, UserCog, FileUp, Download, Upload, AlertCircle, RefreshCw, CheckCircle2, RotateCcw, X, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  usePageTitle('nav.customers', 'Customers');
  const { t } = useTranslation(['customers', 'common']);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUpdateTypeDialog, setShowUpdateTypeDialog] = useState(false);
  const [selectedCustomerType, setSelectedCustomerType] = useState<string>("");
  const [selectedCustomers, setSelectedCustomers] = useState<any[]>([]);
  const [isUpdatingType, setIsUpdatingType] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Import preview states
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  
  // Revert states
  const [lastImportedIds, setLastImportedIds] = useState<string[]>([]);
  const [showRevertButton, setShowRevertButton] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  
  // Export modal state
  const [showExportDialog, setShowExportDialog] = useState(false);

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
    queryKey: searchQuery 
      ? ['/api/customers', { search: searchQuery, includeOrderStats: 'false' }] 
      : ['/api/customers', { includeOrderStats: 'false' }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('includeOrderStats', 'false');
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/customers?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch customers');
      return res.json();
    },
    retry: false,
    staleTime: 30000, // 30 seconds - customers don't change frequently
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

  const handleComprehensiveExportXLSX = () => {
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
        'Name': customer.name || '',
        'Email': customer.email || '',
        'Phone': customer.phone || '',
        'Customer Type': customer.type || 'regular',
        'Address': customer.address || '',
        'City': customer.city || '',
        'Zip Code': customer.zipCode || '',
        'Country': customer.country || '',
        'Facebook ID': customer.facebookId || '',
        'Facebook Name': customer.facebookName || '',
        'Facebook URL': customer.facebookUrl || '',
        'ICO': customer.ico || '',
        'DIC': customer.dic || '',
        'VAT ID': customer.vatId || '',
        'VAT Number': customer.vatNumber || '',
        'Tax ID': customer.taxId || '',
        'Preferred Currency': customer.preferredCurrency || '',
        'Preferred Language': customer.preferredLanguage || '',
        'Notes': customer.notes || '',
        'Total Orders': customer.orderCount || 0,
        'Total Spent': customer.totalSpent || '0',
        'Last Order Date': customer.lastOrderDate ? formatDate(customer.lastOrderDate) : '',
        'Is Blacklisted': customer.isBlacklisted ? 'Yes' : 'No',
        'Created At': customer.createdAt ? formatDate(customer.createdAt) : '',
        // Billing fields
        'Billing First Name': customer.billingFirstName || '',
        'Billing Last Name': customer.billingLastName || '',
        'Billing Company': customer.billingCompany || '',
        'Billing Email': customer.billingEmail || '',
        'Billing Phone': customer.billingTel || '',
        'Billing Street': customer.billingStreet || '',
        'Billing Street Number': customer.billingStreetNumber || '',
        'Billing City': customer.billingCity || '',
        'Billing Zip Code': customer.billingZipCode || '',
        'Billing Country': customer.billingCountry || '',
      }));

      exportToXLSX(exportData, 'customers_comprehensive', t('customers:customers'));
      
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

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Name': 'John Doe',
        'Email': 'john@example.com',
        'Phone': '+420123456789',
        'Customer Type': 'regular',
        'Address': '123 Main Street',
        'City': 'Prague',
        'Zip Code': '11000',
        'Country': 'Czech Republic',
        'Facebook ID': 'john.doe.123456',
        'Facebook Name': 'John Doe',
        'Facebook URL': 'https://facebook.com/john.doe.123456',
        'ICO': '12345678',
        'DIC': 'CZ12345678',
        'VAT ID': '',
        'VAT Number': '',
        'Tax ID': '',
        'Preferred Currency': 'CZK',
        'Preferred Language': 'en',
        'Notes': 'Sample customer notes',
        'Billing First Name': 'John',
        'Billing Last Name': 'Doe',
        'Billing Company': 'ABC Company',
        'Billing Email': 'billing@example.com',
        'Billing Phone': '+420123456789',
        'Billing Street': '123 Main Street',
        'Billing Street Number': '5',
        'Billing City': 'Prague',
        'Billing Zip Code': '11000',
        'Billing Country': 'Czech Republic',
      },
      {
        'Name': 'Jane Smith',
        'Email': 'jane@example.com',
        'Phone': '+420987654321',
        'Customer Type': 'vip',
        'Address': '456 Oak Avenue',
        'City': 'Brno',
        'Zip Code': '60200',
        'Country': 'Czech Republic',
        'Facebook ID': 'jane.smith.5855594',
        'Facebook Name': 'Jane Smith',
        'Facebook URL': 'https://facebook.com/jane.smith.5855594',
        'ICO': '87654321',
        'DIC': 'CZ87654321',
        'VAT ID': 'CZ87654321',
        'VAT Number': '',
        'Tax ID': '',
        'Preferred Currency': 'EUR',
        'Preferred Language': 'cs',
        'Notes': 'VIP customer - priority support',
        'Billing First Name': 'Jane',
        'Billing Last Name': 'Smith',
        'Billing Company': 'XYZ Ltd',
        'Billing Email': 'jane@xyz.cz',
        'Billing Phone': '+420987654321',
        'Billing Street': '456 Oak Avenue',
        'Billing Street Number': '10',
        'Billing City': 'Brno',
        'Billing Zip Code': '60200',
        'Billing Country': 'Czech Republic',
      }
    ];
    exportToXLSX(templateData, 'customers_import_template', t('customers:importTemplate'));
    toast({
      title: t('common:success'),
      description: t('customers:templateDownloaded'),
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: t('common:error'),
          description: t('customers:invalidFileFormat'),
          variant: "destructive",
        });
        return;
      }
      setImportFile(file);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast({
        title: t('common:error'),
        description: t('customers:noFileSelected'),
        variant: "destructive",
      });
      return;
    }

    try {
      const arrayBuffer = await importFile.arrayBuffer();
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
        return;
      }

      const errors: string[] = [];
      const existingCustomers = customers || [];
      
      const previewData = jsonData.map((row, index) => {
        const customer: any = {
          _rowNumber: index + 2,
          _isValid: true,
          _isUpdate: false,
          _validationErrors: [],
        };

        for (const [key, value] of Object.entries(row)) {
          const lowerKey = key.toLowerCase().trim();
          const strValue = value != null ? String(value) : '';
          
          // Basic fields
          if (lowerKey === 'name' || lowerKey === 'tên' || lowerKey === 'ten') {
            customer.name = strValue;
          } else if (lowerKey === 'email') {
            customer.email = strValue;
          } else if (lowerKey === 'phone' || lowerKey === 'điện thoại' || lowerKey === 'dien thoai' || lowerKey === 'tel') {
            customer.phone = strValue;
          } else if (lowerKey === 'country' || lowerKey === 'quốc gia' || lowerKey === 'quoc gia') {
            customer.country = strValue;
          } else if (lowerKey === 'address' || lowerKey === 'địa chỉ' || lowerKey === 'dia chi' || lowerKey === 'street') {
            customer.address = strValue;
          } else if (lowerKey === 'city' || lowerKey === 'thành phố' || lowerKey === 'thanh pho') {
            customer.city = strValue;
          } else if (lowerKey === 'zip code' || lowerKey === 'zipcode' || lowerKey === 'postal code') {
            customer.zipCode = strValue;
          } else if (lowerKey === 'company' || lowerKey === 'công ty' || lowerKey === 'cong ty') {
            customer.company = strValue;
          } else if (lowerKey === 'notes' || lowerKey === 'ghi chú' || lowerKey === 'ghi chu') {
            customer.notes = strValue;
          } else if (lowerKey === 'customer type' || lowerKey === 'type' || lowerKey === 'loại') {
            customer.type = strValue;
          }
          // Facebook fields
          else if (lowerKey === 'facebook id' || lowerKey === 'facebookid') {
            customer.facebookId = strValue;
          } else if (lowerKey === 'facebook name' || lowerKey === 'facebookname') {
            customer.facebookName = strValue;
          } else if (lowerKey === 'facebook url' || lowerKey === 'facebookurl') {
            customer.facebookUrl = strValue;
          }
          // Tax/VAT fields  
          else if (lowerKey === 'ico') {
            customer.ico = strValue;
          } else if (lowerKey === 'dic') {
            customer.dic = strValue;
          } else if (lowerKey === 'vat id' || lowerKey === 'vatid') {
            customer.vatId = strValue;
          } else if (lowerKey === 'vat number') {
            customer.vatNumber = strValue;
          } else if (lowerKey === 'tax id') {
            customer.taxId = strValue;
          }
          // Billing fields
          else if (lowerKey === 'billing first name') {
            customer.billingFirstName = strValue;
          } else if (lowerKey === 'billing last name') {
            customer.billingLastName = strValue;
          } else if (lowerKey === 'billing company') {
            customer.billingCompany = strValue;
          } else if (lowerKey === 'billing email') {
            customer.billingEmail = strValue;
          } else if (lowerKey === 'billing phone') {
            customer.billingTel = strValue;
          } else if (lowerKey === 'billing street') {
            customer.billingStreet = strValue;
          } else if (lowerKey === 'billing street number') {
            customer.billingStreetNumber = strValue;
          } else if (lowerKey === 'billing city') {
            customer.billingCity = strValue;
          } else if (lowerKey === 'billing zip code') {
            customer.billingZipCode = strValue;
          } else if (lowerKey === 'billing country') {
            customer.billingCountry = strValue;
          }
          // Shipping fields
          else if (lowerKey === 'shipping first name') {
            customer.shippingFirstName = strValue;
          } else if (lowerKey === 'shipping last name') {
            customer.shippingLastName = strValue;
          } else if (lowerKey === 'shipping company') {
            customer.shippingCompany = strValue;
          } else if (lowerKey === 'shipping email') {
            customer.shippingEmail = strValue;
          } else if (lowerKey === 'shipping phone') {
            customer.shippingPhone = strValue;
          } else if (lowerKey === 'shipping street') {
            customer.shippingStreet = strValue;
          } else if (lowerKey === 'shipping street number') {
            customer.shippingStreetNumber = strValue;
          } else if (lowerKey === 'shipping city') {
            customer.shippingCity = strValue;
          } else if (lowerKey === 'shipping zip code') {
            customer.shippingZipCode = strValue;
          } else if (lowerKey === 'shipping country') {
            customer.shippingCountry = strValue;
          }
        }

        if (!customer.name || customer.name.trim() === '') {
          customer._isValid = false;
          customer._validationErrors.push(t('customers:missingRequiredFields'));
          errors.push(`${t('customers:row')} ${index + 2}: ${t('customers:missingRequiredFields')} (name)`);
        }

        const existingCustomer = existingCustomers.find((c: any) => 
          c.email && customer.email && c.email.toLowerCase() === customer.email.toLowerCase()
        );
        if (existingCustomer) {
          customer._isUpdate = true;
          customer._existingId = existingCustomer.id;
        }

        return customer;
      });

      setImportPreviewData(previewData);
      setImportErrors(errors);
      setShowImportDialog(false);
      setShowImportPreview(true);
    } catch (error: any) {
      console.error('Import preview error:', error);
      toast({
        title: t('common:error'),
        description: error.message || t('customers:failedToImportCustomers'),
        variant: "destructive",
      });
    }
  };

  const confirmImport = async () => {
    setIsImporting(true);

    try {
      // Filter valid items for bulk import
      const validItems = importPreviewData.filter(item => item._isValid);
      
      if (validItems.length === 0) {
        toast({
          title: t('common:error'),
          description: t('customers:noValidItems'),
          variant: "destructive",
        });
        setIsImporting(false);
        return;
      }

      // Send all items in a single bulk request
      const res = await apiRequest('POST', '/api/customers/bulk-import', { items: validItems });
      const response = await res.json();

      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });

      // Store imported IDs for revert (only new customers, not updates)
      const newCustomerIds = response.customers
        ?.filter((c: any) => c.action === 'created')
        .map((c: any) => c.id) || [];
      
      toast({
        title: t('customers:importCompleted'),
        description: t('customers:importedCustomersCount', { count: response.imported || 0 }),
      });

      if (newCustomerIds.length > 0) {
        setLastImportedIds(newCustomerIds);
        setShowRevertButton(true);
      }
      setShowImportPreview(false);
      setImportPreviewData([]);
      setImportErrors([]);
      setImportFile(null);
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: t('common:error'),
        description: error.message || t('customers:failedToImportCustomers'),
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleRevertImport = async () => {
    if (lastImportedIds.length === 0) return;

    setIsReverting(true);
    let revertedCount = 0;

    try {
      for (const id of lastImportedIds) {
        try {
          await apiRequest('DELETE', `/api/customers/${id}`);
          revertedCount++;
        } catch (error) {
          console.error(`Failed to revert customer ${id}:`, error);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });

      if (revertedCount === lastImportedIds.length) {
        toast({
          title: t('customers:revertSuccessful'),
          description: t('customers:revertedCustomers', { count: revertedCount }),
        });
      } else if (revertedCount > 0) {
        toast({
          title: t('customers:revertPartial'),
          description: t('customers:revertedCustomers', { count: revertedCount }),
        });
      } else {
        toast({
          title: t('customers:revertFailed'),
          description: t('common:error'),
          variant: "destructive",
        });
      }

      setShowRevertButton(false);
      setLastImportedIds([]);
    } catch (error) {
      console.error('Revert error:', error);
      toast({
        title: t('customers:revertFailed'),
        description: t('common:error'),
        variant: "destructive",
      });
    } finally {
      setIsReverting(false);
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
          const strValue = value != null ? String(value) : '';
          
          // Basic fields
          if (lowerKey === 'name' || lowerKey === 'tên' || lowerKey === 'ten') {
            customer.name = strValue;
          } else if (lowerKey === 'email') {
            customer.email = strValue;
          } else if (lowerKey === 'phone' || lowerKey === 'điện thoại' || lowerKey === 'dien thoai' || lowerKey === 'tel') {
            customer.phone = strValue;
          } else if (lowerKey === 'country' || lowerKey === 'quốc gia' || lowerKey === 'quoc gia') {
            customer.country = strValue;
          } else if (lowerKey === 'address' || lowerKey === 'địa chỉ' || lowerKey === 'dia chi' || lowerKey === 'street') {
            customer.address = strValue;
          } else if (lowerKey === 'city' || lowerKey === 'thành phố' || lowerKey === 'thanh pho') {
            customer.city = strValue;
          } else if (lowerKey === 'zip code' || lowerKey === 'zipcode' || lowerKey === 'postal code' || lowerKey === 'postalcode') {
            customer.zipCode = strValue;
          } else if (lowerKey === 'notes' || lowerKey === 'ghi chú' || lowerKey === 'ghi chu') {
            customer.notes = strValue;
          } else if (lowerKey === 'type' || lowerKey === 'customer type') {
            customer.type = strValue;
          } else if (lowerKey === 'preferred language' || lowerKey === 'language') {
            customer.preferredLanguage = strValue;
          } else if (lowerKey === 'preferred currency' || lowerKey === 'currency') {
            customer.preferredCurrency = strValue;
          }
          // Facebook fields
          else if (lowerKey === 'facebook id' || lowerKey === 'facebookid' || lowerKey === 'facebook_id') {
            customer.facebookId = strValue;
          } else if (lowerKey === 'facebook name' || lowerKey === 'facebookname' || lowerKey === 'facebook_name') {
            customer.facebookName = strValue;
          } else if (lowerKey === 'facebook url' || lowerKey === 'facebookurl' || lowerKey === 'facebook_url') {
            customer.facebookUrl = strValue;
          }
          // Tax/VAT fields
          else if (lowerKey === 'ico') {
            customer.ico = strValue;
          } else if (lowerKey === 'dic') {
            customer.dic = strValue;
          } else if (lowerKey === 'vat id' || lowerKey === 'vatid') {
            customer.vatId = strValue;
          } else if (lowerKey === 'vat number' || lowerKey === 'vatnumber') {
            customer.vatNumber = strValue;
          } else if (lowerKey === 'tax id' || lowerKey === 'taxid') {
            customer.taxId = strValue;
          }
          // Billing address fields
          else if (lowerKey === 'billing first name') {
            customer.billingFirstName = strValue;
          } else if (lowerKey === 'billing last name') {
            customer.billingLastName = strValue;
          } else if (lowerKey === 'billing company' || lowerKey === 'company') {
            customer.billingCompany = strValue;
          } else if (lowerKey === 'billing email') {
            customer.billingEmail = strValue;
          } else if (lowerKey === 'billing phone' || lowerKey === 'billing tel') {
            customer.billingTel = strValue;
          } else if (lowerKey === 'billing street') {
            customer.billingStreet = strValue;
          } else if (lowerKey === 'billing street number') {
            customer.billingStreetNumber = strValue;
          } else if (lowerKey === 'billing city') {
            customer.billingCity = strValue;
          } else if (lowerKey === 'billing zip code' || lowerKey === 'billing zipcode') {
            customer.billingZipCode = strValue;
          } else if (lowerKey === 'billing country') {
            customer.billingCountry = strValue;
          }
          // Shipping address fields
          else if (lowerKey === 'shipping first name') {
            customer.shippingFirstName = strValue;
          } else if (lowerKey === 'shipping last name') {
            customer.shippingLastName = strValue;
          } else if (lowerKey === 'shipping company') {
            customer.shippingCompany = strValue;
          } else if (lowerKey === 'shipping email') {
            customer.shippingEmail = strValue;
          } else if (lowerKey === 'shipping phone' || lowerKey === 'shipping tel') {
            customer.shippingPhone = strValue;
          } else if (lowerKey === 'shipping street') {
            customer.shippingStreet = strValue;
          } else if (lowerKey === 'shipping street number') {
            customer.shippingStreetNumber = strValue;
          } else if (lowerKey === 'shipping city') {
            customer.shippingCity = strValue;
          } else if (lowerKey === 'shipping zip code' || lowerKey === 'shipping zipcode') {
            customer.shippingZipCode = strValue;
          } else if (lowerKey === 'shipping country') {
            customer.shippingCountry = strValue;
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
      <div className="space-y-4 sm:space-y-6 bg-gray-50 dark:bg-slate-900 min-h-screen -m-6 p-2 sm:p-4 md:p-6 overflow-x-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="h-8 w-40 bg-muted rounded-md animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded-md animate-pulse mt-2" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 bg-muted rounded-md animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded-md animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-lg p-4 border">
              <div className="h-4 w-20 bg-muted rounded-md animate-pulse mb-2" />
              <div className="h-8 w-24 bg-muted rounded-md animate-pulse" />
            </div>
          ))}
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg border">
          <div className="p-4 border-b">
            <div className="h-10 w-64 bg-muted rounded-md animate-pulse" />
          </div>
          <div className="divide-y">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4" style={{ opacity: 1 - i * 0.08 }}>
                <div className="h-5 w-5 bg-muted rounded-md animate-pulse" />
                <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                <div className="h-5 flex-1 bg-muted rounded-md animate-pulse" />
                <div className="h-5 w-24 bg-muted rounded-md animate-pulse" />
                <div className="h-5 w-20 bg-muted rounded-md animate-pulse" />
                <div className="h-5 w-16 bg-muted rounded-md animate-pulse" />
              </div>
            ))}
          </div>
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
        <div className="flex items-center gap-2">
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
              <DropdownMenuLabel>{t('customers:importExport')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowImportDialog(true)} data-testid="menu-import-xlsx">
                <Upload className="h-4 w-4 mr-2" />
                {t('customers:importFromExcel')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleComprehensiveExportXLSX} data-testid="menu-export-xlsx">
                <Download className="h-4 w-4 mr-2" />
                {t('customers:exportToExcel')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} data-testid="menu-export-pdf">
                <FileText className="h-4 w-4 mr-2" />
                {t('common:exportToPDF')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/customers/add">
            <Button data-testid="button-add-customer" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline">{t('customers:addCustomer')}</span>
              <span className="inline xs:hidden sm:hidden">{t('common:add')}</span>
            </Button>
          </Link>
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

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Upload className="h-5 w-5" />
              {t('customers:importFromExcel')}
            </DialogTitle>
            <DialogDescription className="text-gray-700 dark:text-gray-300">
              {t('customers:importDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
                className="w-full justify-start bg-white dark:bg-slate-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                data-testid="button-download-template"
              >
                <Download className="h-4 w-4 mr-2" />
                {t('customers:downloadTemplate')}
              </Button>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="import-file-input"
                  data-testid="input-import-file"
                />
                <label
                  htmlFor="import-file-input"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <Upload className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {importFile ? importFile.name : t('customers:clickToSelectFile')}
                  </span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setImportFile(null);
              }}
              className="bg-white dark:bg-slate-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
              data-testid="button-cancel-import"
            >
              {t('common:cancel')}
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importFile || isImporting}
              className="bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-800"
              data-testid="button-confirm-import"
            >
              {isImporting ? t('common:importing') : t('customers:import')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Preview Modal */}
      <Dialog open={showImportPreview} onOpenChange={setShowImportPreview}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <FileUp className="h-5 w-5" />
              {t('customers:reviewImportData')}
            </DialogTitle>
            <DialogDescription className="text-gray-700 dark:text-gray-300">
              {t('customers:reviewBeforeImport')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{importPreviewData.length}</p>
                <p className="text-xs text-blue-600/70 dark:text-blue-400/70">{t('customers:totalRows')}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {importPreviewData.filter(i => i._isValid && !i._isUpdate).length}
                </p>
                <p className="text-xs text-green-600/70 dark:text-green-400/70">{t('customers:newCustomers')}</p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-center">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {importPreviewData.filter(i => i._isUpdate).length}
                </p>
                <p className="text-xs text-amber-600/70 dark:text-amber-400/70">{t('customers:updates')}</p>
              </div>
            </div>

            {/* Errors Warning */}
            {importErrors.length > 0 && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-red-700 dark:text-red-300">
                    {t('customers:validationErrors', { count: importErrors.length })}
                  </span>
                </div>
                <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 max-h-20 overflow-y-auto">
                  {importErrors.slice(0, 5).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                  {importErrors.length > 5 && (
                    <li>{t('customers:andMore', { count: importErrors.length - 5 })}</li>
                  )}
                </ul>
              </div>
            )}

            {/* Preview Table */}
            <ScrollArea className="h-[300px] border rounded-lg">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="text-left p-2 font-medium">#</th>
                    <th className="text-left p-2 font-medium">{t('customers:status')}</th>
                    <th className="text-left p-2 font-medium">{t('customers:name')}</th>
                    <th className="text-left p-2 font-medium">{t('customers:phone')}</th>
                    <th className="text-left p-2 font-medium">{t('customers:email')}</th>
                    <th className="text-left p-2 font-medium">{t('customers:address')}</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreviewData.map((item, index) => (
                    <tr 
                      key={index} 
                      className={`border-b ${!item._isValid ? 'bg-red-50 dark:bg-red-950/20' : item._isUpdate ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}
                    >
                      <td className="p-2 text-muted-foreground">{item._rowNumber}</td>
                      <td className="p-2">
                        {!item._isValid ? (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {t('customers:invalidRow')}
                          </Badge>
                        ) : item._isUpdate ? (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-500">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            {t('customers:updateRow')}
                          </Badge>
                        ) : (
                          <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {t('customers:newRow')}
                          </Badge>
                        )}
                      </td>
                      <td className="p-2 font-medium">{item.name || '-'}</td>
                      <td className="p-2 text-xs">{item.phone || '-'}</td>
                      <td className="p-2 text-xs">{item.email || '-'}</td>
                      <td className="p-2 text-xs">{[item.street, item.city, item.country].filter(Boolean).join(', ') || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowImportPreview(false);
                setImportPreviewData([]);
                setImportErrors([]);
              }}
              className="bg-white dark:bg-slate-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
              data-testid="button-cancel-preview"
            >
              {t('common:cancel')}
            </Button>
            <Button 
              onClick={confirmImport}
              disabled={isImporting || importPreviewData.filter(i => i._isValid).length === 0}
              className="bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-800"
              data-testid="button-confirm-import-preview"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t('customers:importing')}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t('customers:confirmImport', { count: importPreviewData.filter(i => i._isValid).length })}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">{t('customers:exportCustomers')}</DialogTitle>
            <DialogDescription className="text-gray-700 dark:text-gray-300">
              {t('customers:chooseExportFormat')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">
                {t('customers:exportingCount', { count: filteredCustomers?.length || 0 })}
              </p>
              
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-12 bg-white dark:bg-slate-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => {
                    handleExportXLSX();
                    setShowExportDialog(false);
                  }}
                  data-testid="button-export-xlsx"
                >
                  <Download className="mr-3 h-5 w-5 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium">{t('customers:exportToExcel')}</p>
                    <p className="text-xs text-muted-foreground">{t('customers:excelFormatDesc')}</p>
                  </div>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-12 bg-white dark:bg-slate-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => {
                    handleExportPDF();
                    setShowExportDialog(false);
                  }}
                  data-testid="button-export-pdf"
                >
                  <FileText className="mr-3 h-5 w-5 text-red-600" />
                  <div className="text-left">
                    <p className="font-medium">{t('common:exportToPDF')}</p>
                    <p className="text-xs text-muted-foreground">{t('customers:pdfFormatDesc')}</p>
                  </div>
                </Button>
              </div>
            </div>
            
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {t('customers:exportIncludesAllColumns')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)} className="bg-white dark:bg-slate-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800">
              {t('common:cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Revert Button */}
      {showRevertButton && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3">
            <div className="text-sm">
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {t('customers:importCompleted')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('customers:importedCustomersCount', { count: lastImportedIds.length })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevertImport}
                disabled={isReverting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                data-testid="button-revert-import"
              >
                {isReverting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                <span className="ml-1">{t('customers:revert')}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowRevertButton(false)}
                className="h-8 w-8"
                data-testid="button-dismiss-revert"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
