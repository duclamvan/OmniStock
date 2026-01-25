import { useState, useMemo, useEffect, useRef, ChangeEvent } from "react";
import { useQuery, useQueries, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import * as XLSX from 'xlsx';
import { Card, CardContent } from "@/components/ui/card";
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
  FileDown,
  X,
  CheckSquare,
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
  
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  
  const [lastImportedIds, setLastImportedIds] = useState<string[]>([]);
  const [showRevertButton, setShowRevertButton] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  const [showImportResults, setShowImportResults] = useState(false);
  const [importResultData, setImportResultData] = useState<{
    imported: number;
    errors: number;
    errorDetails: string[];
  } | null>(null);

  const { data: shipments = [], isLoading } = useQuery<Shipment[]>({
    queryKey: ['/api/imports/shipments']
  });

  useEffect(() => {
    if (shipments.length > 0 && expandedShipments.length === 0) {
      const allShipmentIds = shipments.map(s => String(s.id));
      setExpandedShipments(allShipmentIds);
    }
  }, [shipments]);

  const landingCostQueries = useQueries({
    queries: shipments.map(shipment => ({
      queryKey: [`/api/imports/shipments/${shipment.id}/landing-cost-summary`],
      enabled: !!shipment.id
    }))
  });

  const isLoadingCosts = landingCostQueries.some(q => q.isLoading);

  const shipmentsWithCosts = useMemo(() => {
    return shipments.map((shipment, index) => ({
      ...shipment,
      landingCost: landingCostQueries[index]?.data as LandingCostSummary | undefined
    }));
  }, [shipments, landingCostQueries]);

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
        <Badge variant="secondary" className="flex items-center gap-1 text-xs shrink-0">
          <AlertCircle className="h-3 w-3" />
          <span className="hidden sm:inline">{t('noCosts')}</span>
        </Badge>
      );
    }

    if (landingCost.status === 'calculated' || landingCost.status === 'approved') {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1 text-xs shrink-0">
          <CheckCircle className="h-3 w-3" />
          <span className="hidden sm:inline">{t('costed')}</span>
        </Badge>
      );
    }

    return (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 flex items-center gap-1 text-xs shrink-0">
        <AlertTriangle className="h-3 w-3" />
        <span className="hidden sm:inline">{t('pending')}</span>
      </Badge>
    );
  };

  const getShippingCostDisplay = (shipment: Shipment) => {
    const cost = parseFloat(shipment.shippingCost);
    if (!cost || cost === 0) return '—';
    return formatCurrency(cost, shipment.shippingCostCurrency || 'USD');
  };

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

  const handleExport = async (exportScope: 'all' | 'selected' = 'all') => {
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

      const previewItems: any[] = [];
      const errors: string[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] as any;
        const rowNum = i + 2;
        
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

        if (!shipmentData.carrier || !shipmentData.trackingNumber) {
          shipmentData._isValid = false;
          shipmentData._error = t('missingRequiredFields');
          errors.push(`${t('row')} ${rowNum}: ${t('missingRequiredFields')}`);
        }

        const existingShipment = shipments.find((s: any) => s.trackingNumber === shipmentData.trackingNumber);
        if (existingShipment) {
          shipmentData._isUpdate = true;
          shipmentData._existingId = existingShipment.id;
        }

        previewItems.push(shipmentData);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

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
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Import failed' }));
        throw new Error(errorData.message || 'Import failed');
      }
      
      const response = await res.json();

      setShowImportPreview(false);
      setImportPreviewData([]);
      setImportErrors([]);

      queryClient.invalidateQueries({ queryKey: ['/api/imports/shipments'] });

      const newShipmentIds = Array.isArray(response.shipments) 
        ? response.shipments
            .filter((s: any) => s && s.action === 'created' && s.id)
            .map((s: any) => s.id)
        : [];
      
      if (newShipmentIds.length > 0) {
        setLastImportedIds(newShipmentIds);
        setShowRevertButton(true);
        
        setTimeout(() => {
          setShowRevertButton(false);
          setLastImportedIds([]);
        }, 30000);
      }

      const importedCount = response.imported || 0;
      const errorCount = response.errors || 0;
      const errorDetails = response.errorDetails || [];
      
      if (importedCount > 0 && errorCount > 0) {
        toast({
          title: t('importSuccess'),
          description: t('importPartialSuccess', { 
            imported: importedCount,
            skipped: errorCount 
          }),
        });
        setImportResultData({ imported: importedCount, errors: errorCount, errorDetails });
        setShowImportResults(true);
      } else if (importedCount === 0 && errorCount > 0) {
        toast({
          title: t('importError'),
          description: t('noValidItems'),
          variant: "destructive",
        });
        setImportResultData({ imported: 0, errors: errorCount, errorDetails });
        setShowImportResults(true);
      } else {
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
      <div className="w-full max-w-full overflow-x-hidden p-3 sm:p-4 md:p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 sm:h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/2 sm:w-1/3"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <div className="h-16 sm:h-20 bg-gray-100 dark:bg-slate-800 rounded"></div>
            <div className="h-16 sm:h-20 bg-gray-100 dark:bg-slate-800 rounded"></div>
            <div className="h-16 sm:h-20 bg-gray-100 dark:bg-slate-800 rounded"></div>
            <div className="h-16 sm:h-20 bg-gray-100 dark:bg-slate-800 rounded"></div>
          </div>
          <div className="h-48 sm:h-64 bg-gray-100 dark:bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden p-3 sm:p-4 md:p-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImport}
        accept=".xlsx,.xls"
        className="hidden"
        data-testid="input-import-file"
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {t('deleteShipmentsWarning', { count: selectedShipments.size })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto" data-testid="button-cancel-delete">{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(Array.from(selectedShipments))}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {bulkDeleteMutation.isPending ? t('deleting') : t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header - Mobile First */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Calculator className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-cyan-600 shrink-0" />
              <span className="truncate">{t('landingCosts')}</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
              {t('landingCostsDescription')}
            </p>
          </div>
          
          {/* Action Buttons - Horizontal scroll on mobile */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="h-9 min-h-[36px] whitespace-nowrap shrink-0"
              data-testid="button-download-template"
            >
              <FileDown className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">{t('template')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-9 min-h-[36px] whitespace-nowrap shrink-0"
              data-testid="button-import"
            >
              <Upload className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">{t('import')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportDialog(true)}
              className="h-9 min-h-[36px] whitespace-nowrap shrink-0"
              data-testid="button-export"
            >
              <Download className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">{t('export')}</span>
            </Button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedShipments.size > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5 sm:p-3 mb-3 sm:mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300 truncate">
                  {t('selectedCount', { count: selectedShipments.size })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="h-7 px-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 shrink-0"
                  data-testid="button-clear-selection"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  <span className="text-xs">{t('clearSelection')}</span>
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('selected')}
                  disabled={isExporting}
                  className="h-8 flex-1 sm:flex-initial text-xs sm:text-sm"
                  data-testid="button-export-selected"
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  {t('exportSelected')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="h-8 flex-1 sm:flex-initial text-xs sm:text-sm"
                  data-testid="button-bulk-delete"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  {t('deleteSelected')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards - 2x2 grid on mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
          <Card className="overflow-hidden">
            <CardContent className="p-2.5 sm:p-3 md:p-4">
              <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('totalShipments')}</p>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold">{shipments.length}</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-2.5 sm:p-3 md:p-4">
              <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 shrink-0" />
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('costed')}</p>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">
                {shipmentsWithCosts.filter(s => s.landingCost?.status === 'calculated').length}
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-2.5 sm:p-3 md:p-4">
              <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-600 shrink-0" />
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('pending')}</p>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600">
                {shipmentsWithCosts.filter(s => s.landingCost?.status === 'pending').length}
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-2.5 sm:p-3 md:p-4">
              <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-600 dark:text-gray-400 shrink-0" />
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('noCosts')}</p>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-600 dark:text-gray-400">
                {shipmentsWithCosts.filter(s => !s.landingCost).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="space-y-2 sm:space-y-0 sm:flex sm:flex-row sm:gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchShipmentPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 sm:pl-9 h-9 sm:h-10 text-sm"
              data-testid="input-search-shipments"
            />
          </div>
          
          {/* Filter buttons - Horizontal scroll on mobile */}
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1 sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0 shrink-0">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
              className="h-8 sm:h-9 px-2.5 sm:px-3 whitespace-nowrap shrink-0 text-xs sm:text-sm"
              data-testid="filter-all"
            >
              {t('all')}
            </Button>
            <Button
              variant={filterStatus === 'costed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('costed')}
              className="h-8 sm:h-9 px-2.5 sm:px-3 whitespace-nowrap shrink-0 text-xs sm:text-sm"
              data-testid="filter-costed"
            >
              {t('costed')}
            </Button>
            <Button
              variant={filterStatus === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('pending')}
              className="h-8 sm:h-9 px-2.5 sm:px-3 whitespace-nowrap shrink-0 text-xs sm:text-sm"
              data-testid="filter-pending"
            >
              {t('pending')}
            </Button>
            <Button
              variant={filterStatus === 'not-costed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('not-costed')}
              className="h-8 sm:h-9 px-2.5 sm:px-3 whitespace-nowrap shrink-0 text-xs sm:text-sm"
              data-testid="filter-not-costed"
            >
              {t('noCosts')}
            </Button>
          </div>
        </div>
      </div>

      {/* Select All Row */}
      {filteredShipments.length > 0 && (
        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 px-1">
          <Checkbox
            checked={selectedShipments.size === filteredShipments.length && filteredShipments.length > 0}
            onCheckedChange={toggleSelectAll}
            className="h-4 w-4"
            data-testid="checkbox-select-all"
          />
          <span className="text-xs sm:text-sm text-muted-foreground">
            {t('selectAll')} ({filteredShipments.length})
          </span>
        </div>
      )}

      {/* Shipments List */}
      {filteredShipments.length === 0 ? (
        <Card>
          <CardContent className="p-6 sm:p-10 md:p-12 text-center">
            <Package className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium mb-1.5 sm:mb-2">{t('noShipmentsFound')}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {searchQuery || filterStatus !== 'all' 
                ? t('tryAdjustingFilters') 
                : t('createFirstShipment')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {filteredShipments.map(shipment => (
            <Card 
              key={shipment.id} 
              className={`overflow-hidden transition-shadow hover:shadow-md ${selectedShipments.has(String(shipment.id)) ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}
            >
              <CardContent className="p-3 sm:p-4">
                {/* Card Header with Checkbox */}
                <div className="flex items-start gap-2 sm:gap-3 mb-3">
                  <Checkbox
                    checked={selectedShipments.has(String(shipment.id))}
                    onCheckedChange={() => toggleSelection(String(shipment.id))}
                    className="h-4 w-4 mt-0.5 shrink-0"
                    data-testid={`checkbox-shipment-${shipment.id}`}
                  />
                  
                  <div className="flex-1 min-w-0">
                    {/* Title row with badge */}
                    <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                      <div className="bg-cyan-100 dark:bg-cyan-900 p-1.5 sm:p-2 rounded-lg shrink-0">
                        <Package className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <h3 className="font-semibold text-sm sm:text-base md:text-lg truncate">
                          {shipment.shipmentName || `Shipment #${shipment.id}`}
                        </h3>
                        {getCostStatusBadge(shipment.landingCost)}
                      </div>
                    </div>
                    
                    {/* Meta info */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3 shrink-0" />
                        <span className="truncate">{shipment.carrier}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3 shrink-0" />
                        {shipment.itemCount} {t('items')}
                      </span>
                      {shipment.createdAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {format(new Date(shipment.createdAt), 'MMM dd, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cost Details Grid - 2 columns on mobile, 4 on larger screens */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 bg-muted/30 dark:bg-muted/20 rounded-lg p-2.5 sm:p-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">{t('shippingCost')}</p>
                    <p className="text-sm sm:text-base font-semibold truncate">{getShippingCostDisplay(shipment)}</p>
                  </div>
                  {shipment.landingCost && (
                    <>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">{t('totalLandedCost')}</p>
                        <p className="text-sm sm:text-base font-semibold text-green-600 dark:text-green-400 truncate">
                          {formatCurrency(shipment.landingCost.totalCost || 0, shipment.landingCost.baseCurrency || 'EUR')}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">{t('itemsAllocated')}</p>
                        <p className="text-sm sm:text-base font-semibold">{shipment.landingCost.itemCount || 0}</p>
                      </div>
                      {shipment.landingCost.lastCalculated && (
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">{t('lastCalculated')}</p>
                          <p className="text-xs sm:text-sm truncate">{format(new Date(shipment.landingCost.lastCalculated), 'MMM dd, HH:mm')}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Collapsible Items Section */}
                {shipment.items && shipment.items.length > 0 && (
                  <Collapsible
                    open={expandedShipments.includes(String(shipment.id))}
                    onOpenChange={(isOpen) => {
                      const shipmentIdStr = String(shipment.id);
                      setExpandedShipments(prev => {
                        if (isOpen) {
                          return prev.includes(shipmentIdStr) ? prev : [...prev, shipmentIdStr];
                        } else {
                          return prev.filter(id => id !== shipmentIdStr);
                        }
                      });
                    }}
                    className="mb-3"
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between h-8 sm:h-9 hover:bg-muted/50 px-2 sm:px-3"
                        data-testid={`button-toggle-items-${shipment.id}`}
                      >
                        <span className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                          <Box className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span className="font-medium">
                            {expandedShipments.includes(String(shipment.id)) ? t('hide') : t('show')} {t('items')} ({shipment.items.length})
                          </span>
                        </span>
                        {expandedShipments.includes(String(shipment.id)) ? (
                          <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="space-y-1.5 sm:space-y-2 max-h-48 sm:max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 sm:p-3 bg-white dark:bg-gray-950">
                        {shipment.items.map((item: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex flex-col gap-0.5 sm:gap-1 text-xs sm:text-sm p-1.5 sm:p-2 bg-muted/30 rounded hover:bg-muted/50 transition-colors"
                            data-testid={`item-${shipment.id}-${idx}`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-medium flex-1 min-w-0 truncate">
                                {item.productName || item.name || `Item ${idx + 1}`}
                              </span>
                              <span className="font-semibold shrink-0">
                                ×{item.quantity || 1}
                              </span>
                            </div>
                            {(item.sku || item.category) && (
                              <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] sm:text-xs text-muted-foreground">
                                {item.sku && <span className="truncate">SKU: {item.sku}</span>}
                                {item.category && <span className="truncate">{item.category}</span>}
                              </div>
                            )}
                            {item.allocatedCost !== undefined && item.allocatedCost !== null && (
                              <div className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 font-medium">
                                {formatCurrency(item.allocatedCost, shipment.landingCost?.baseCurrency || 'EUR')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Action Button - Full width on mobile */}
                <Link href={`/imports/landing-cost/${shipment.id}`}>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full h-9 sm:h-10 text-xs sm:text-sm"
                    data-testid={`button-view-details-${shipment.id}`}
                  >
                    <Calculator className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    {t('viewLandingCost')}
                    <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-auto" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Import Preview Dialog */}
      <Dialog open={showImportPreview} onOpenChange={setShowImportPreview}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl md:max-w-3xl max-h-[90vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5" />
              {t('reviewImportData')}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t('reviewBeforeImport')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden space-y-3 sm:space-y-4 min-h-0">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center">
                <p className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{importPreviewData.length}</p>
                <p className="text-[10px] sm:text-xs text-blue-600/70 dark:text-blue-400/70">{t('totalRows')}</p>
              </div>
              <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-center">
                <p className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">
                  {importPreviewData.filter(i => i._isValid && !i._isUpdate).length}
                </p>
                <p className="text-[10px] sm:text-xs text-green-600/70 dark:text-green-400/70">{t('newShipments')}</p>
              </div>
              <div className="p-2 sm:p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-center">
                <p className="text-lg sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {importPreviewData.filter(i => i._isUpdate).length}
                </p>
                <p className="text-[10px] sm:text-xs text-amber-600/70 dark:text-amber-400/70">{t('updates')}</p>
              </div>
            </div>

            {/* Errors Warning */}
            {importErrors.length > 0 && (
              <div className="p-2 sm:p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600 shrink-0" />
                  <span className="font-medium text-xs sm:text-sm text-red-700 dark:text-red-300">
                    {t('validationErrors', { count: importErrors.length })}
                  </span>
                </div>
                <ul className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 space-y-0.5 sm:space-y-1 max-h-16 sm:max-h-20 overflow-y-auto">
                  {importErrors.slice(0, 5).map((error, i) => (
                    <li key={i} className="truncate">{error}</li>
                  ))}
                  {importErrors.length > 5 && (
                    <li>... {t('andMore', { count: importErrors.length - 5 })}</li>
                  )}
                </ul>
              </div>
            )}

            {/* Preview Table - Scrollable */}
            <ScrollArea className="flex-1 h-[200px] sm:h-[250px] md:h-[300px] border rounded-lg">
              <div className="min-w-[500px]">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                    <tr>
                      <th className="text-left p-1.5 sm:p-2 font-medium w-10">#</th>
                      <th className="text-left p-1.5 sm:p-2 font-medium w-20">{t('status')}</th>
                      <th className="text-left p-1.5 sm:p-2 font-medium">{t('shipmentName')}</th>
                      <th className="text-left p-1.5 sm:p-2 font-medium">{t('carrier')}</th>
                      <th className="text-left p-1.5 sm:p-2 font-medium">{t('trackingNumber')}</th>
                      <th className="text-left p-1.5 sm:p-2 font-medium">{t('shippingCost')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreviewData.map((item, index) => (
                      <tr 
                        key={index} 
                        className={`border-b ${!item._isValid ? 'bg-red-50 dark:bg-red-950/20' : item._isUpdate ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}
                      >
                        <td className="p-1.5 sm:p-2 text-muted-foreground">{item._rowNumber}</td>
                        <td className="p-1.5 sm:p-2">
                          {!item._isValid ? (
                            <Badge variant="destructive" className="text-[10px] sm:text-xs h-5">
                              <AlertCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                              {t('invalid')}
                            </Badge>
                          ) : item._isUpdate ? (
                            <Badge variant="outline" className="text-[10px] sm:text-xs h-5 text-amber-600 border-amber-500">
                              <RefreshCw className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                              {t('update')}
                            </Badge>
                          ) : (
                            <Badge className="text-[10px] sm:text-xs h-5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                              <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                              {t('new')}
                            </Badge>
                          )}
                        </td>
                        <td className="p-1.5 sm:p-2 font-medium max-w-[120px] truncate">{item.shipmentName || '-'}</td>
                        <td className="p-1.5 sm:p-2">{item.carrier || '-'}</td>
                        <td className="p-1.5 sm:p-2 font-mono text-[10px] sm:text-xs max-w-[100px] truncate">{item.trackingNumber || '-'}</td>
                        <td className="p-1.5 sm:p-2 whitespace-nowrap">{item.shippingCost} {item.shippingCostCurrency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 shrink-0 pt-3 sm:pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowImportPreview(false);
                setImportPreviewData([]);
                setImportErrors([]);
              }}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              {t('cancel')}
            </Button>
            <Button 
              onClick={confirmImport}
              disabled={isImporting || importPreviewData.filter(i => i._isValid).length === 0}
              className="w-full sm:w-auto order-1 sm:order-2"
              data-testid="button-confirm-import"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                  {t('importing')}
                </>
              ) : (
                <>
                  <Check className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {t('confirmImport', { count: importPreviewData.filter(i => i._isValid).length })}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-[90vw] sm:max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Download className="h-4 w-4 sm:h-5 sm:w-5" />
              {t('exportShipments')}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t('selectExportScope')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 sm:space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-2.5 sm:py-3"
              onClick={async () => {
                setShowExportDialog(false);
                await handleExport('all');
              }}
              disabled={isExporting}
              data-testid="button-export-all"
            >
              <FileSpreadsheet className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-green-600 shrink-0" />
              <div className="text-left min-w-0">
                <p className="font-medium text-sm">{t('exportAll')}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('exportAllDesc', { count: filteredShipments.length })}</p>
              </div>
            </Button>
            
            {selectedShipments.size > 0 && (
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-2.5 sm:py-3"
                onClick={async () => {
                  setShowExportDialog(false);
                  await handleExport('selected');
                }}
                disabled={isExporting}
                data-testid="button-export-selected-dialog"
              >
                <CheckSquare className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0" />
                <div className="text-left min-w-0">
                  <p className="font-medium text-sm">{t('exportSelected')}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t('exportSelectedDesc', { count: selectedShipments.size })}</p>
                </div>
              </Button>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setShowExportDialog(false)} className="w-full sm:w-auto">
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Results Dialog */}
      <Dialog open={showImportResults} onOpenChange={setShowImportResults}>
        <DialogContent className="max-w-[90vw] sm:max-w-lg max-h-[80vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              {importResultData && importResultData.imported > 0 ? (
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
              ) : (
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
              )}
              {importResultData && importResultData.imported > 0 
                ? t('importSuccess') 
                : t('importError')}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {importResultData && t('importResultsSummary', {
                imported: importResultData.imported,
                errors: importResultData.errors
              })}
            </DialogDescription>
          </DialogHeader>
          
          {importResultData && importResultData.errorDetails.length > 0 && (
            <div className="flex-1 overflow-hidden min-h-0">
              <h4 className="font-medium mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2 text-sm">
                <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
                {t('validationErrorsDetails')} ({importResultData.errorDetails.length})
              </h4>
              <ScrollArea className="h-[150px] sm:h-[200px] border rounded-lg p-2 sm:p-3 bg-slate-50 dark:bg-slate-900">
                <ul className="space-y-0.5 sm:space-y-1 text-xs sm:text-sm">
                  {importResultData.errorDetails.map((error, i) => (
                    <li key={i} className="text-red-600 dark:text-red-400">
                      {error}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}

          <DialogFooter className="shrink-0 pt-3">
            <Button 
              onClick={() => {
                setShowImportResults(false);
                setImportResultData(null);
              }}
              className="w-full sm:w-auto"
            >
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Revert Button */}
      {showRevertButton && (
        <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-2.5 sm:p-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div className="text-xs sm:text-sm flex-1 min-w-0">
              <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                {t('importCompleted')}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {t('importedShipmentsCount', { count: lastImportedIds.length })}
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevertImport}
                disabled={isReverting}
                className="flex-1 sm:flex-initial h-8 text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                data-testid="button-revert-import"
              >
                {isReverting ? (
                  <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
                <span className="ml-1">{t('revert')}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowRevertButton(false)}
                className="h-8 w-8 shrink-0"
                data-testid="button-dismiss-revert"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
