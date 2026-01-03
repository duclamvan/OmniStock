import { useState, useMemo, useEffect, useRef, ChangeEvent } from "react";
import { useQuery, useQueries, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Calculator, 
  Package, 
  Search, 
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Calendar,
  Truck,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Box,
  Trash2,
  Download,
  Upload,
  FileSpreadsheet,
  FileUp,
  FileDown,
  X,
  CheckSquare,
  Square,
  RefreshCw,
  Check,
  CheckCircle2,
  RotateCcw
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/currencyUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Shipment {
  id: string;
  consolidationId: string | null;
  carrier: string;
  trackingNumber: string;
  shipmentName?: string;
  shipmentType?: string;
  origin: string;
  destination: string;
  status: string;
  shippingCost: string;
  shippingCostCurrency?: string;
  estimatedDelivery: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: any[];
  itemCount: number;
  totalWeight?: number;
  totalUnits?: number;
}

interface LandingCostSummary {
  status: 'pending' | 'calculated' | 'approved';
  totalCost: number;
  baseCurrency: string;
  lastCalculated?: string;
  itemCount?: number;
}

export default function LandingCostList() {
  const { t } = useTranslation('imports');
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedShipments, setExpandedShipments] = useState<string[]>([]);
  const [selectedShipments, setSelectedShipments] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Import preview state
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  
  // Revert state
  const [lastImportedIds, setLastImportedIds] = useState<string[]>([]);
  const [showRevertButton, setShowRevertButton] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  
  // Export dialog
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  // Import results dialog (for showing validation errors)
  const [showImportResults, setShowImportResults] = useState(false);
  const [importResultData, setImportResultData] = useState<{
    imported: number;
    errors: number;
    errorDetails: string[];
  } | null>(null);

  // Fetch all shipments
  const { data: shipments = [], isLoading } = useQuery<Shipment[]>({
    queryKey: ['/api/imports/shipments']
  });

  // Initialize expandedShipments with all shipment IDs by default
  useEffect(() => {
    if (shipments.length > 0 && expandedShipments.length === 0) {
      const allShipmentIds = shipments.map(s => String(s.id));
      setExpandedShipments(allShipmentIds);
    }
  }, [shipments]);

  // Fetch landing cost summary for each shipment using useQueries (hook-safe)
  const landingCostQueries = useQueries({
    queries: shipments.map(shipment => ({
      queryKey: [`/api/imports/shipments/${shipment.id}/landing-cost-summary`],
      enabled: !!shipment.id
    }))
  });

  // Check if any landing cost queries are still loading
  const isLoadingCosts = landingCostQueries.some(q => q.isLoading);

  // Combine shipments with their landing cost data
  const shipmentsWithCosts = useMemo(() => {
    return shipments.map((shipment, index) => ({
      ...shipment,
      landingCost: landingCostQueries[index]?.data as LandingCostSummary | undefined
    }));
  }, [shipments, landingCostQueries]);

  // Filter and search shipments
  const filteredShipments = shipmentsWithCosts.filter(shipment => {
    const matchesSearch = !searchQuery || 
      shipment.shipmentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.trackingNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.carrier?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'costed' && shipment.landingCost?.status === 'calculated') ||
      (filterStatus === 'pending' && shipment.landingCost?.status === 'pending') ||
      (filterStatus === 'not-costed' && !shipment.landingCost);

    return matchesSearch && matchesStatus;
  });

  const getCostStatusBadge = (landingCost?: LandingCostSummary) => {
    if (!landingCost) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {t('noCosts')}
        </Badge>
      );
    }

    if (landingCost.status === 'calculated' || landingCost.status === 'approved') {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          {t('costed')}
        </Badge>
      );
    }

    return (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        {t('pending')}
      </Badge>
    );
  };

  const getShippingCostDisplay = (shipment: Shipment) => {
    const cost = parseFloat(shipment.shippingCost);
    if (!cost || cost === 0) return '—';
    return formatCurrency(cost, shipment.shippingCostCurrency || 'USD');
  };

  // Selection helpers
  const toggleSelection = (id: string) => {
    setSelectedShipments(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedShipments.size === filteredShipments.length) {
      setSelectedShipments(new Set());
    } else {
      setSelectedShipments(new Set(filteredShipments.map(s => String(s.id))));
    }
  };

  const clearSelection = () => {
    setSelectedShipments(new Set());
  };

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await apiRequest('POST', '/api/imports/shipments/bulk-delete', { ids });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      setSelectedShipments(new Set());
      setShowDeleteDialog(false);
      toast({
        title: t('deleteSuccess'),
        description: t('shipmentsDeletedCount', { count: data.deleted || selectedShipments.size }),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('deleteError'),
        description: error.message || t('failedToDeleteShipments'),
        variant: "destructive",
      });
    },
  });

  // Export to Excel
  const handleExport = async (exportScope: 'all' | 'selected' = 'all') => {
    // If selected scope is requested but nothing is selected, show warning
    if (exportScope === 'selected' && selectedShipments.size === 0) {
      toast({
        title: t('exportError'),
        description: t('noShipmentsSelected'),
        variant: "destructive",
      });
      return;
    }
    
    setIsExporting(true);
    try {
      // Determine which IDs to export based on scope
      let ids: string[];
      if (exportScope === 'selected') {
        ids = Array.from(selectedShipments);
      } else {
        ids = filteredShipments.map(s => String(s.id));
      }
      
      const params = new URLSearchParams();
      ids.forEach(id => params.append('ids', id));
      
      const response = await fetch(`/api/imports/shipments/export?${params.toString()}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `landing-costs-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: t('exportSuccess'),
        description: t('dataExportedSuccessfully'),
      });
    } catch (error: any) {
      toast({
        title: t('exportError'),
        description: error.message || t('failedToExport'),
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Parse Excel file and show preview instead of importing directly
  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast({
          title: t('noDataFound'),
          description: t('excelFileEmpty'),
          variant: "destructive",
        });
        return;
      }

      // Parse and validate data for preview
      const previewItems: any[] = [];
      const errors: string[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] as any;
        const rowNum = i + 2; // Excel row number (1-indexed + header)
        
        const shipmentData: any = {
          _rowNumber: rowNum,
          shipmentName: row['Shipment Name'] || row.shipmentName || '',
          carrier: row['Carrier'] || row.carrier || '',
          trackingNumber: row['Tracking Number'] || row.trackingNumber || '',
          origin: row['Origin'] || row.origin || '',
          destination: row['Destination'] || row.destination || '',
          status: row['Status'] || row.status || 'pending',
          shippingCost: row['Shipping Cost'] || row.shippingCost || '0',
          shippingCostCurrency: row['Shipping Cost Currency'] || row.shippingCostCurrency || 'USD',
          _isValid: true,
          _error: '',
          _isUpdate: false,
        };

        // Validate required fields
        if (!shipmentData.carrier || !shipmentData.trackingNumber) {
          shipmentData._isValid = false;
          shipmentData._error = t('missingRequiredFields');
          errors.push(`${t('row')} ${rowNum}: ${t('missingRequiredFields')}`);
        }

        // Check if shipment exists by tracking number
        const existingShipment = shipments.find((s: any) => s.trackingNumber === shipmentData.trackingNumber);
        if (existingShipment) {
          shipmentData._isUpdate = true;
          shipmentData._existingId = existingShipment.id;
        }

        previewItems.push(shipmentData);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Show preview
      setImportPreviewData(previewItems);
      setImportErrors(errors);
      setShowImportPreview(true);

    } catch (error: any) {
      console.error("Import parse error:", error);
      toast({
        title: t('importError'),
        description: error.message || t('failedToImport'),
        variant: "destructive",
      });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Confirm and execute the actual import
  const confirmImport = async () => {
    setIsImporting(true);

    try {
      const validItems = importPreviewData.filter(item => item._isValid).map(item => ({
        shipmentName: item.shipmentName,
        carrier: item.carrier,
        trackingNumber: item.trackingNumber,
        origin: item.origin,
        destination: item.destination,
        status: item.status,
        shippingCost: item.shippingCost,
        shippingCostCurrency: item.shippingCostCurrency,
        _isUpdate: item._isUpdate,
        _existingId: item._existingId,
      }));

      if (validItems.length === 0) {
        toast({
          title: t('importError'),
          description: t('noValidItems'),
          variant: "destructive",
        });
        setIsImporting(false);
        return;
      }

      const res = await apiRequest('POST', '/api/imports/shipments/bulk-import', { items: validItems });
      
      // Handle non-OK response
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Import failed' }));
        throw new Error(errorData.message || 'Import failed');
      }
      
      const response = await res.json();

      // Close preview modal
      setShowImportPreview(false);
      setImportPreviewData([]);
      setImportErrors([]);

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });

      // Store imported IDs for revert (only new shipments, not updates)
      // Defensive check for shipments array
      const newShipmentIds = Array.isArray(response.shipments) 
        ? response.shipments
            .filter((s: any) => s && s.action === 'created' && s.id)
            .map((s: any) => s.id)
        : [];
      
      if (newShipmentIds.length > 0) {
        setLastImportedIds(newShipmentIds);
        setShowRevertButton(true);
        
        // Auto-hide revert button after 30 seconds
        setTimeout(() => {
          setShowRevertButton(false);
          setLastImportedIds([]);
        }, 30000);
      }

      // Show appropriate toast based on results
      const importedCount = response.imported || 0;
      const errorCount = response.errors || 0;
      const errorDetails = response.errorDetails || [];
      
      if (importedCount > 0 && errorCount > 0) {
        // Partial success - show toast and store details for results dialog
        toast({
          title: t('importSuccess'),
          description: t('importPartialSuccess', { 
            imported: importedCount,
            skipped: errorCount 
          }),
        });
        // Store results for optional viewing
        setImportResultData({ imported: importedCount, errors: errorCount, errorDetails });
        setShowImportResults(true);
      } else if (importedCount === 0 && errorCount > 0) {
        // All items failed validation - show results dialog
        toast({
          title: t('importError'),
          description: t('noValidItems'),
          variant: "destructive",
        });
        setImportResultData({ imported: 0, errors: errorCount, errorDetails });
        setShowImportResults(true);
      } else {
        // Full success
        toast({
          title: t('importSuccess'),
          description: t('shipmentsImportedCount', { 
            imported: importedCount,
            errors: 0 
          }),
        });
      }

    } catch (error: any) {
      toast({
        title: t('importError'),
        description: error.message || t('failedToImport'),
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Revert last import
  const handleRevertImport = async () => {
    if (lastImportedIds.length === 0) return;
    
    setIsReverting(true);
    try {
      await apiRequest('POST', '/api/imports/shipments/bulk-delete', { ids: lastImportedIds });
      
      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });
      
      toast({
        title: t('revertSuccess'),
        description: t('shipmentsRevertedCount', { count: lastImportedIds.length }),
      });
      
      setShowRevertButton(false);
      setLastImportedIds([]);
    } catch (error: any) {
      toast({
        title: t('revertError'),
        description: error.message || t('failedToRevert'),
        variant: "destructive",
      });
    } finally {
      setIsReverting(false);
    }
  };

  // Download template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Shipment Name': 'Example Shipment 1',
        'Carrier': 'DHL',
        'Tracking Number': 'DHL123456789',
        'Origin': 'China',
        'Destination': 'Czech Republic',
        'Status': 'pending',
        'Shipping Cost': '150.00',
        'Shipping Cost Currency': 'USD',
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Shipments');
    XLSX.writeFile(workbook, 'shipments-import-template.xlsx');
    
    toast({
      title: t('templateDownloaded'),
      description: t('useTemplateForImport'),
    });
  };

  if (isLoading || isLoadingCosts) {
    return (
      <div className="container mx-auto p-2 sm:p-4 md:p-6 overflow-x-hidden">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="h-20 bg-gray-100 dark:bg-slate-800 rounded"></div>
            <div className="h-20 bg-gray-100 dark:bg-slate-800 rounded"></div>
            <div className="h-20 bg-gray-100 dark:bg-slate-800 rounded"></div>
            <div className="h-20 bg-gray-100 dark:bg-slate-800 rounded"></div>
          </div>
          <div className="h-64 bg-gray-100 dark:bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 md:p-6 overflow-x-hidden">
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImport}
        accept=".xlsx,.xls"
        className="hidden"
        data-testid="input-import-file"
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteShipmentsWarning', { count: selectedShipments.size })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(Array.from(selectedShipments))}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {bulkDeleteMutation.isPending ? t('deleting') : t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Calculator className="h-7 w-7 text-cyan-600" />
              {t('landingCosts')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('landingCostsDescription')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              data-testid="button-download-template"
            >
              <FileDown className="h-4 w-4 mr-2" />
              {t('template')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-import"
            >
              <Upload className="h-4 w-4 mr-2" />
              {t('import')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportDialog(true)}
              data-testid="button-export"
            >
              <Download className="h-4 w-4 mr-2" />
              {t('export')}
            </Button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedShipments.size > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {t('selectedCount', { count: selectedShipments.size })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                data-testid="button-clear-selection"
              >
                <X className="h-4 w-4 mr-1" />
                {t('clearSelection')}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isExporting}
                data-testid="button-export-selected"
              >
                <Download className="h-4 w-4 mr-2" />
                {t('exportSelected')}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                data-testid="button-bulk-delete"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('deleteSelected')}
              </Button>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{t('totalShipments')}</p>
              </div>
              <p className="text-2xl font-bold">{shipments.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <p className="text-xs text-muted-foreground">{t('costed')}</p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {shipmentsWithCosts.filter(s => s.landingCost?.status === 'calculated').length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <p className="text-xs text-muted-foreground">{t('pending')}</p>
              </div>
              <p className="text-2xl font-bold text-yellow-600">
                {shipmentsWithCosts.filter(s => s.landingCost?.status === 'pending').length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <p className="text-xs text-muted-foreground">{t('noCosts')}</p>
              </div>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {shipmentsWithCosts.filter(s => !s.landingCost).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchShipmentPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-shipments"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
              data-testid="filter-all"
            >
              {t('all')}
            </Button>
            <Button
              variant={filterStatus === 'costed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('costed')}
              data-testid="filter-costed"
            >
              {t('costed')}
            </Button>
            <Button
              variant={filterStatus === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('pending')}
              data-testid="filter-pending"
            >
              {t('pending')}
            </Button>
            <Button
              variant={filterStatus === 'not-costed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('not-costed')}
              data-testid="filter-not-costed"
            >
              {t('noCosts')}
            </Button>
          </div>
        </div>
      </div>

      {/* Select All Row */}
      {filteredShipments.length > 0 && (
        <div className="flex items-center gap-3 mb-3 px-2">
          <Checkbox
            checked={selectedShipments.size === filteredShipments.length && filteredShipments.length > 0}
            onCheckedChange={toggleSelectAll}
            data-testid="checkbox-select-all"
          />
          <span className="text-sm text-muted-foreground">
            {t('selectAll')} ({filteredShipments.length})
          </span>
        </div>
      )}

      {/* Shipments List */}
      {filteredShipments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('noShipmentsFound')}</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || filterStatus !== 'all' 
                ? t('tryAdjustingFilters') 
                : t('createFirstShipment')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredShipments.map(shipment => (
            <Card 
              key={shipment.id} 
              className={`hover:shadow-md transition-shadow ${selectedShipments.has(String(shipment.id)) ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row items-start gap-4">
                  {/* Checkbox */}
                  <div className="shrink-0 pt-1">
                    <Checkbox
                      checked={selectedShipments.has(String(shipment.id))}
                      onCheckedChange={() => toggleSelection(String(shipment.id))}
                      data-testid={`checkbox-shipment-${shipment.id}`}
                    />
                  </div>
                  {/* Left Section */}
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="bg-cyan-100 dark:bg-cyan-900 p-2 rounded-lg shrink-0">
                        <Package className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg truncate">
                            {shipment.shipmentName || `Shipment #${shipment.id}`}
                          </h3>
                          {getCostStatusBadge(shipment.landingCost)}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            {shipment.carrier}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {shipment.itemCount} {t('items')}
                          </span>
                          {shipment.createdAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(shipment.createdAt), 'MMM dd, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cost Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-muted/30 dark:bg-muted/20 rounded-lg p-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">{t('shippingCost')}</p>
                        <p className="font-semibold">{getShippingCostDisplay(shipment)}</p>
                      </div>
                      {shipment.landingCost && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">{t('totalLandedCost')}</p>
                            <p className="font-semibold text-green-600 dark:text-green-400">
                              {formatCurrency(shipment.landingCost.totalCost || 0, shipment.landingCost.baseCurrency || 'EUR')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">{t('itemsAllocated')}</p>
                            <p className="font-semibold">{shipment.landingCost.itemCount || 0}</p>
                          </div>
                          {shipment.landingCost.lastCalculated && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">{t('lastCalculated')}</p>
                              <p className="text-sm">{format(new Date(shipment.landingCost.lastCalculated), 'MMM dd, HH:mm')}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Items List - Collapsible */}
                    {shipment.items && shipment.items.length > 0 && (
                      <Collapsible
                        open={expandedShipments.includes(String(shipment.id))}
                        onOpenChange={(isOpen) => {
                          const shipmentIdStr = String(shipment.id);
                          setExpandedShipments(prev => {
                            if (isOpen) {
                              // Expand: add the ID only if not already present
                              return prev.includes(shipmentIdStr) ? prev : [...prev, shipmentIdStr];
                            } else {
                              // Collapse: remove the ID
                              return prev.filter(id => id !== shipmentIdStr);
                            }
                          });
                        }}
                        className="mt-3"
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-between hover:bg-muted/50"
                            data-testid={`button-toggle-items-${shipment.id}`}
                          >
                            <span className="flex items-center gap-2">
                              <Box className="h-4 w-4" />
                              <span className="font-medium">
                                {expandedShipments.includes(String(shipment.id)) ? t('hide') : t('show')} {t('items')} ({shipment.items.length})
                              </span>
                            </span>
                            {expandedShipments.includes(String(shipment.id)) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-950">
                            {shipment.items.map((item: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex flex-col gap-1 text-sm p-2 bg-muted/30 rounded hover:bg-muted/50 transition-colors"
                                data-testid={`item-${shipment.id}-${idx}`}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <span className="font-medium flex-1">
                                    {item.productName || item.name || `Item ${idx + 1}`}
                                  </span>
                                  <span className="font-semibold shrink-0">
                                    ×{item.quantity || 1}
                                  </span>
                                </div>
                                {(item.sku || item.category) && (
                                  <div className="flex gap-3 text-xs text-muted-foreground">
                                    {item.sku && (
                                      <span>SKU: {item.sku}</span>
                                    )}
                                    {item.category && (
                                      <span>• {item.category}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>

                  {/* Right Section - Actions */}
                  <div className="flex flex-col gap-2 w-full md:w-auto md:shrink-0">
                    <Link href={`/imports/landing-costs/${shipment.id}`}>
                      <Button size="sm" className="w-full sm:w-auto" data-testid={`button-view-costs-${shipment.id}`}>
                        <Calculator className="h-4 w-4 mr-2" />
                        {t('viewCosts')}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Import Preview Modal */}
      <Dialog open={showImportPreview} onOpenChange={setShowImportPreview}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5" />
              {t('reviewImportData')}
            </DialogTitle>
            <DialogDescription>
              {t('reviewBeforeImport')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{importPreviewData.length}</p>
                <p className="text-xs text-blue-600/70 dark:text-blue-400/70">{t('totalRows')}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {importPreviewData.filter(i => i._isValid && !i._isUpdate).length}
                </p>
                <p className="text-xs text-green-600/70 dark:text-green-400/70">{t('newShipments')}</p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-center">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {importPreviewData.filter(i => i._isUpdate).length}
                </p>
                <p className="text-xs text-amber-600/70 dark:text-amber-400/70">{t('updates')}</p>
              </div>
            </div>

            {/* Errors Warning */}
            {importErrors.length > 0 && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-red-700 dark:text-red-300">
                    {t('validationErrors', { count: importErrors.length })}
                  </span>
                </div>
                <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 max-h-20 overflow-y-auto">
                  {importErrors.slice(0, 5).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                  {importErrors.length > 5 && (
                    <li>... {t('andMore', { count: importErrors.length - 5 })}</li>
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
                    <th className="text-left p-2 font-medium">{t('status')}</th>
                    <th className="text-left p-2 font-medium">{t('shipmentName')}</th>
                    <th className="text-left p-2 font-medium">{t('carrier')}</th>
                    <th className="text-left p-2 font-medium">{t('trackingNumber')}</th>
                    <th className="text-left p-2 font-medium">{t('shippingCost')}</th>
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
                            {t('invalid')}
                          </Badge>
                        ) : item._isUpdate ? (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-500">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            {t('update')}
                          </Badge>
                        ) : (
                          <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {t('new')}
                          </Badge>
                        )}
                      </td>
                      <td className="p-2 font-medium">{item.shipmentName || '-'}</td>
                      <td className="p-2">{item.carrier || '-'}</td>
                      <td className="p-2 font-mono text-xs">{item.trackingNumber || '-'}</td>
                      <td className="p-2">{item.shippingCost} {item.shippingCostCurrency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowImportPreview(false);
                setImportPreviewData([]);
                setImportErrors([]);
              }}
            >
              {t('cancel')}
            </Button>
            <Button 
              onClick={confirmImport}
              disabled={isImporting || importPreviewData.filter(i => i._isValid).length === 0}
              data-testid="button-confirm-import"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t('importing')}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t('confirmImport', { count: importPreviewData.filter(i => i._isValid).length })}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              {t('exportShipments')}
            </DialogTitle>
            <DialogDescription>
              {t('selectExportScope')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={async () => {
                setShowExportDialog(false);
                await handleExport('all');
              }}
              disabled={isExporting}
              data-testid="button-export-all"
            >
              <FileSpreadsheet className="mr-3 h-5 w-5 text-green-600" />
              <div className="text-left">
                <p className="font-medium">{t('exportAll')}</p>
                <p className="text-xs text-muted-foreground">{t('exportAllDesc', { count: filteredShipments.length })}</p>
              </div>
            </Button>
            
            {selectedShipments.size > 0 && (
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-3"
                onClick={async () => {
                  setShowExportDialog(false);
                  await handleExport('selected');
                }}
                disabled={isExporting}
                data-testid="button-export-selected-dialog"
              >
                <CheckSquare className="mr-3 h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium">{t('exportSelected')}</p>
                  <p className="text-xs text-muted-foreground">{t('exportSelectedDesc', { count: selectedShipments.size })}</p>
                </div>
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Results Dialog */}
      <Dialog open={showImportResults} onOpenChange={setShowImportResults}>
        <DialogContent className="max-w-lg max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {importResultData && importResultData.imported > 0 ? (
                <CheckCircle className="h-5 w-5 text-amber-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              {importResultData && importResultData.imported > 0 
                ? t('importSuccess') 
                : t('importError')}
            </DialogTitle>
            <DialogDescription>
              {importResultData && t('importResultsSummary', {
                imported: importResultData.imported,
                errors: importResultData.errors
              })}
            </DialogDescription>
          </DialogHeader>
          
          {importResultData && importResultData.errorDetails.length > 0 && (
            <div className="flex-1 overflow-hidden">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                {t('validationErrorsDetails')} ({importResultData.errorDetails.length})
              </h4>
              <ScrollArea className="h-[200px] border rounded-lg p-3 bg-slate-50 dark:bg-slate-900">
                <ul className="space-y-1 text-sm">
                  {importResultData.errorDetails.map((error, i) => (
                    <li key={i} className="text-red-600 dark:text-red-400">
                      {error}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => {
              setShowImportResults(false);
              setImportResultData(null);
            }}>
              {t('close')}
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
                {t('importCompleted')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('importedShipmentsCount', { count: lastImportedIds.length })}
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
                <span className="ml-1">{t('revert')}</span>
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
