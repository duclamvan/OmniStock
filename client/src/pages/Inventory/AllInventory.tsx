import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { fuzzySearch } from "@/lib/fuzzySearch";
import { formatCurrency, formatCompactNumber } from "@/lib/currencyUtils";
import { isUnauthorizedError } from "@/lib/authUtils";
import { exportToXLSX, exportToPDF, type PDFColumn } from "@/lib/exportUtils";
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, MoreVertical, Archive, SlidersHorizontal, X, FileDown, FileUp, ArrowLeft, Sparkles, TrendingUp, Filter, PackageX, DollarSign, Settings, Check, FileText, Download, Upload, RotateCcw, AlertCircle, CheckCircle2, RefreshCw, Copy } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import * as XLSX from 'xlsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AllInventory() {
  usePageTitle('nav.inventory', 'Inventory');
  const { t } = useTranslation(['inventory', 'common']);
  const { toast } = useToast();
  const { canViewImportCost } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Read category from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const categoryParam = urlParams.get('category');
  const [categoryFilter, setCategoryFilter] = useState(categoryParam || "all");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [orderCounts, setOrderCounts] = useState<{ [productId: string]: number }>({});
  const [showArchive, setShowArchive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  // Import preview states
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  
  // Revert functionality - stores last import session
  const [lastImportedIds, setLastImportedIds] = useState<string[]>([]);
  const [showRevertButton, setShowRevertButton] = useState(false);
  const [isReverting, setIsReverting] = useState(false);

  // Column visibility state with localStorage persistence
  const [columnVisibility, setColumnVisibility] = useState<{ [key: string]: boolean }>(() => {
    const saved = localStorage.getItem('inventoryVisibleColumns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    // Default visible columns
    return {
      name: true,
      categoryId: true,
      quantity: true,
      unitsSold: true,
      priceEur: true,
      status: true,
      actions: true,
      // Default hidden columns
      lowStockAlert: false,
      priceCzk: false,
      importCostUsd: false,
      importCostCzk: false,
      importCostEur: false,
      sku: true,
      barcode: false,
      supplierId: false,
      warehouseId: false,
      createdAt: false,
      updatedAt: false,
    };
  });

  // Save to localStorage whenever visibility changes
  useEffect(() => {
    localStorage.setItem('inventoryVisibleColumns', JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: showArchive ? ['/api/products', 'archive'] : ['/api/products'],
    queryFn: async () => {
      const url = showArchive ? '/api/products?includeInactive=true&includeAvailability=false' : '/api/products?includeAvailability=false';
      const response = await fetch(url, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(t('inventory:failedToFetchProducts'));
      }
      return response.json();
    },
    staleTime: 30000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    staleTime: 60000,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['/api/warehouses'],
    staleTime: 60000,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['/api/suppliers'],
    staleTime: 60000,
  });

  // Fetch over-allocated items (lazy load, only on demand)
  const { data: overAllocatedItems = [] } = useQuery<any[]>({
    queryKey: ['/api/over-allocated-items'],
    staleTime: 60000,
    refetchInterval: 120000,
  });

  // Fetch under-allocated items (lazy load)
  const { data: underAllocatedItems = [] } = useQuery<any[]>({
    queryKey: ['/api/under-allocated-items'],
    staleTime: 60000,
    refetchInterval: 120000,
  });

  // Fetch recently approved receipts (last 7 days)
  const { data: recentReceipts = [] } = useQuery<any[]>({
    queryKey: ['/api/imports/receipts/recent'],
    staleTime: 60000,
  });

  // Error handling
  useEffect(() => {
    if (error) {
      toast({
        title: t('inventory:error'),
        description: t('inventory:loadError'),
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      await apiRequest('PATCH', `/api/products/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: t('inventory:success'),
        description: t('inventory:productUpdatedSuccess'),
      });
    },
    onError: (error) => {
      console.error("Product update error:", error);
      toast({
        title: t('inventory:error'),
        description: t('inventory:updateError'),
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: t('inventory:success'),
        description: t('inventory:productDeletedSuccess'),
      });
    },
    onError: (error: any) => {
      console.error("Product delete error:", error);
      const errorMessage = error.message || t('inventory:deleteError');
      toast({
        title: t('inventory:error'),
        description: errorMessage.includes('referenced') || errorMessage.includes('constraint')
          ? t('inventory:deleteErrorReferenced') 
          : errorMessage,
        variant: "destructive",
      });
    },
  });

  const restoreProductMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('PATCH', `/api/products/${id}`, { isActive: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: t('inventory:success'),
        description: t('inventory:productRestoredSuccess'),
      });
    },
    onError: (error) => {
      console.error("Product restore error:", error);
      toast({
        title: t('inventory:error'),
        description: t('inventory:restoreError'),
        variant: "destructive",
      });
    },
  });

  const archiveProductMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('PATCH', `/api/products/${id}`, { isActive: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: t('inventory:success'),
        description: t('inventory:productArchivedSuccess'),
      });
    },
    onError: (error) => {
      console.error("Product archive error:", error);
      toast({
        title: t('inventory:error'),
        description: t('inventory:archiveError'),
        variant: "destructive",
      });
    },
  });

  // Comprehensive Export to XLSX with all product fields
  const handleExportXLSX = () => {
    if (!filteredProducts || filteredProducts.length === 0) {
      toast({
        title: t('inventory:noDataToExport'),
        description: t('inventory:noProductsToExport'),
        variant: "destructive",
      });
      return;
    }

    try {
      const exportData = filteredProducts.map((product: any) => {
        const category = (categories as any[])?.find((c: any) => String(c.id) === product.categoryId);
        const supplier = (suppliers as any[])?.find((s: any) => s.id === product.supplierId);
        const warehouse = (warehouses as any[])?.find((w: any) => w.id === product.warehouseId);
        
        return {
          'Name': product.name || '',
          'Vietnamese Name': product.vietnameseName || '',
          'SKU': product.sku || '',
          'Barcode': product.barcode || '',
          'Category': category?.name || '',
          'Supplier': supplier?.name || '',
          'Warehouse': warehouse?.name || '',
          'Warehouse Location': product.warehouseLocation || '',
          'Quantity': product.quantity || 0,
          'Low Stock Alert': product.lowStockAlert || 0,
          'Price CZK': product.priceCzk || '',
          'Price EUR': product.priceEur || '',
          'Price USD': product.priceUsd || '',
          'Wholesale Price CZK': product.wholesalePriceCzk || '',
          'Wholesale Price EUR': product.wholesalePriceEur || '',
          'Import Cost USD': product.importCostUsd || '',
          'Import Cost EUR': product.importCostEur || '',
          'Import Cost CZK': product.importCostCzk || '',
          'Weight (kg)': product.weight || '',
          'Length (cm)': product.length || '',
          'Width (cm)': product.width || '',
          'Height (cm)': product.height || '',
          'Description': product.description || '',
          'Shipment Notes': product.shipmentNotes || '',
          'Status': product.isActive ? 'Active' : 'Inactive',
          'Units Sold': product.unitsSold || 0,
        };
      });

      exportToXLSX(exportData, 'products-export', t('inventory:products'));

      toast({
        title: t('inventory:exportSuccessful'),
        description: t('inventory:exportSuccessXLSX', { count: filteredProducts.length }),
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        title: t('inventory:exportFailed'),
        description: error.message || t('inventory:exportFailedXLSX'),
        variant: "destructive",
      });
    }
  };

  // Download template with sample rows
  const handleDownloadTemplate = () => {
    try {
      const templateData = [
        {
          'Name': 'Sample Product 1',
          'Vietnamese Name': 'Sản phẩm mẫu 1',
          'SKU': 'SKU-001',
          'Barcode': '1234567890123',
          'Category': 'General',
          'Supplier': '',
          'Warehouse': '',
          'Warehouse Location': 'A-01-01',
          'Quantity': 100,
          'Low Stock Alert': 10,
          'Price CZK': '250.00',
          'Price EUR': '10.00',
          'Price USD': '11.00',
          'Wholesale Price CZK': '200.00',
          'Wholesale Price EUR': '8.00',
          'Import Cost USD': '5.00',
          'Import Cost EUR': '4.50',
          'Import Cost CZK': '110.00',
          'Weight (kg)': '0.5',
          'Length (cm)': '10',
          'Width (cm)': '5',
          'Height (cm)': '3',
          'Description': 'Sample product description',
          'Shipment Notes': 'Handle with care',
        },
        {
          'Name': 'Sample Product 2',
          'Vietnamese Name': 'Sản phẩm mẫu 2',
          'SKU': 'SKU-002',
          'Barcode': '1234567890124',
          'Category': 'General',
          'Supplier': '',
          'Warehouse': '',
          'Warehouse Location': 'A-01-02',
          'Quantity': 50,
          'Low Stock Alert': 5,
          'Price CZK': '500.00',
          'Price EUR': '20.00',
          'Price USD': '22.00',
          'Wholesale Price CZK': '400.00',
          'Wholesale Price EUR': '16.00',
          'Import Cost USD': '10.00',
          'Import Cost EUR': '9.00',
          'Import Cost CZK': '220.00',
          'Weight (kg)': '1.0',
          'Length (cm)': '15',
          'Width (cm)': '10',
          'Height (cm)': '5',
          'Description': 'Another sample product',
          'Shipment Notes': '',
        },
      ];

      exportToXLSX(templateData, 'products-import-template', 'Products Template');

      toast({
        title: t('inventory:success'),
        description: t('inventory:templateDownloaded'),
      });
    } catch (error: any) {
      console.error("Template download error:", error);
      toast({
        title: t('inventory:error'),
        description: t('inventory:templateDownloadFailed'),
        variant: "destructive",
      });
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (!filteredProducts || filteredProducts.length === 0) {
      toast({
        title: t('inventory:noDataToExport'),
        description: t('inventory:noProductsToExport'),
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare data for export
      const exportData = filteredProducts.map((product: any) => ({
        name: product.name,
        sku: product.sku,
        category: (categories as any[])?.find((c: any) => String(c.id) === product.categoryId)?.name || '',
        quantity: product.quantity,
        unitsSold: product.unitsSold || 0,
        priceEur: formatCurrency(parseFloat(product.priceEur || '0'), 'EUR'),
        priceCzk: formatCurrency(parseFloat(product.priceCzk || '0'), 'CZK'),
        status: product.isActive ? t('inventory:active') : t('inventory:inactive'),
      }));

      // Define columns for PDF
      const columns: PDFColumn[] = [
        { key: 'name', header: t('inventory:name') },
        { key: 'sku', header: t('inventory:sku') },
        { key: 'category', header: t('inventory:category') },
        { key: 'quantity', header: t('inventory:quantity') },
        { key: 'unitsSold', header: t('inventory:unitsSold') },
        { key: 'priceEur', header: t('inventory:priceEur') },
        { key: 'priceCzk', header: t('inventory:priceCzk') },
        { key: 'status', header: t('inventory:status') },
      ];

      exportToPDF(t('inventory:inventoryReport'), exportData, columns, 'inventory');

      toast({
        title: t('inventory:exportSuccessful'),
        description: t('inventory:exportSuccessPDF', { count: filteredProducts.length }),
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        title: t('inventory:exportFailed'),
        description: error.message || t('inventory:exportFailedPDF'),
        variant: "destructive",
      });
    }
  };

  // Bulk Export to XLSX - exports only selected products
  const handleBulkExportXLSX = (selectedProducts: any[]) => {
    if (!selectedProducts || selectedProducts.length === 0) {
      toast({
        title: t('inventory:noDataToExport'),
        description: t('inventory:noProductsSelected'),
        variant: "destructive",
      });
      return;
    }

    try {
      const exportData = selectedProducts.map((product: any) => {
        const category = (categories as any[])?.find((c: any) => String(c.id) === product.categoryId);
        const supplier = (suppliers as any[])?.find((s: any) => s.id === product.supplierId);
        const warehouse = (warehouses as any[])?.find((w: any) => w.id === product.warehouseId);
        
        return {
          'Name': product.name || '',
          'Vietnamese Name': product.vietnameseName || '',
          'SKU': product.sku || '',
          'Barcode': product.barcode || '',
          'Category': category?.name || '',
          'Supplier': supplier?.name || '',
          'Warehouse': warehouse?.name || '',
          'Warehouse Location': product.warehouseLocation || '',
          'Quantity': product.quantity || 0,
          'Low Stock Alert': product.lowStockAlert || 0,
          'Price CZK': product.priceCzk || '',
          'Price EUR': product.priceEur || '',
          'Price USD': product.priceUsd || '',
          'Wholesale Price CZK': product.wholesalePriceCzk || '',
          'Wholesale Price EUR': product.wholesalePriceEur || '',
          'Import Cost USD': product.importCostUsd || '',
          'Import Cost EUR': product.importCostEur || '',
          'Import Cost CZK': product.importCostCzk || '',
          'Import Cost VND': product.importCostVnd || '',
          'Import Cost CNY': product.importCostCny || '',
          'Weight (kg)': product.weight || '',
          'Length (cm)': product.length || '',
          'Width (cm)': product.width || '',
          'Height (cm)': product.height || '',
          'Description': product.description || '',
          'Shipment Notes': product.shipmentNotes || '',
          'Status': product.isActive ? 'Active' : 'Inactive',
          'Units Sold': product.unitsSold || 0,
        };
      });

      exportToXLSX(exportData, 'products-selected-export', t('inventory:selectedProducts'));

      toast({
        title: t('inventory:exportSuccessful'),
        description: t('inventory:exportSuccessXLSX', { count: selectedProducts.length }),
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        title: t('inventory:exportFailed'),
        description: error.message || t('inventory:exportFailedXLSX'),
        variant: "destructive",
      });
    }
  };

  // Bulk Export to PDF - exports only selected products
  const handleBulkExportPDF = (selectedProducts: any[]) => {
    if (!selectedProducts || selectedProducts.length === 0) {
      toast({
        title: t('inventory:noDataToExport'),
        description: t('inventory:noProductsSelected'),
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare data for export
      const exportData = selectedProducts.map((product: any) => ({
        name: product.name,
        sku: product.sku,
        category: (categories as any[])?.find((c: any) => String(c.id) === product.categoryId)?.name || '',
        quantity: product.quantity,
        unitsSold: product.unitsSold || 0,
        priceEur: formatCurrency(parseFloat(product.priceEur || '0'), 'EUR'),
        priceCzk: formatCurrency(parseFloat(product.priceCzk || '0'), 'CZK'),
        status: product.isActive ? t('inventory:active') : t('inventory:inactive'),
      }));

      // Define columns for PDF
      const columns: PDFColumn[] = [
        { key: 'name', header: t('inventory:name') },
        { key: 'sku', header: t('inventory:sku') },
        { key: 'category', header: t('inventory:category') },
        { key: 'quantity', header: t('inventory:quantity') },
        { key: 'unitsSold', header: t('inventory:unitsSold') },
        { key: 'priceEur', header: t('inventory:priceEur') },
        { key: 'priceCzk', header: t('inventory:priceCzk') },
        { key: 'status', header: t('inventory:status') },
      ];

      exportToPDF(t('inventory:selectedProductsReport'), exportData, columns, 'inventory-selected');

      toast({
        title: t('inventory:exportSuccessful'),
        description: t('inventory:exportSuccessPDF', { count: selectedProducts.length }),
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        title: t('inventory:exportFailed'),
        description: error.message || t('inventory:exportFailedPDF'),
        variant: "destructive",
      });
    }
  };

  // Parse Excel file and show preview instead of importing directly
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast({
          title: t('inventory:noDataFound'),
          description: t('inventory:excelFileEmpty'),
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
        
        const productData: any = {
          _rowNumber: rowNum,
          name: row.Name || row.name || '',
          sku: row.SKU || row.sku || '',
          barcode: row.Barcode || row.barcode || null,
          quantity: Number(row.Quantity || row.quantity || 0),
          lowStockAlert: Number(row['Low Stock Alert'] || row.lowStockAlert || 0),
          priceEur: row['Price EUR'] || row.priceEur || '0',
          priceCzk: row['Price CZK'] || row.priceCzk || '0',
          importCostUsd: row['Import Cost USD'] || row.importCostUsd || null,
          importCostEur: row['Import Cost EUR'] || row.importCostEur || null,
          importCostCzk: row['Import Cost CZK'] || row.importCostCzk || null,
          description: row.Description || row.description || '',
          _isValid: true,
          _error: '',
          _isUpdate: false,
        };

        // Validate required fields
        if (!productData.name || !productData.sku) {
          productData._isValid = false;
          productData._error = t('inventory:missingRequiredFields');
          errors.push(`${t('inventory:row')} ${rowNum}: ${t('inventory:missingRequiredFields')}`);
        }

        // Find category by name - store original name for auto-creation
        const categoryName = row.Category || row.category;
        if (categoryName) {
          const category = (categories as any[])?.find(
            (c: any) => c.name.toLowerCase() === categoryName.toLowerCase()
          );
          if (category) {
            productData.categoryId = String(category.id);
            productData._categoryName = category.name;
          } else {
            // Store category name for auto-creation on backend
            productData._categoryName = categoryName;
          }
        }

        // Find warehouse by name
        const warehouseName = row.Warehouse || row.warehouse;
        if (warehouseName) {
          const warehouse = (warehouses as any[])?.find(
            (w: any) => w.name.toLowerCase() === warehouseName.toLowerCase()
          );
          if (warehouse) {
            productData.warehouseId = warehouse.id;
            productData._warehouseName = warehouse.name;
          } else {
            productData._warehouseName = warehouseName;
          }
        }

        // Store supplier name for auto-creation on backend
        const supplierName = row.Supplier || row.supplier;
        if (supplierName) {
          productData.supplierName = supplierName;
        }

        // Check if product exists by SKU
        const existingProduct = products.find((p: any) => p.sku === productData.sku);
        if (existingProduct) {
          productData._isUpdate = true;
          productData._existingId = existingProduct.id;
        }

        previewItems.push(productData);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Close import dialog and show preview
      setShowImportDialog(false);
      setImportPreviewData(previewItems);
      setImportErrors(errors);
      setShowImportPreview(true);

    } catch (error: any) {
      console.error("Import parse error:", error);
      toast({
        title: t('inventory:importFailed'),
        description: error.message || t('inventory:importFailedExcel'),
        variant: "destructive",
      });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Confirm and execute the actual import - uses bulk endpoint for speed
  const confirmImport = async () => {
    setIsImporting(true);

    try {
      // Filter valid items and prepare for bulk import
      const validItems = importPreviewData.filter(item => item._isValid).map(item => ({
        ...item,
        // Include category/supplier names for auto-creation on backend
        categoryName: item._categoryName,
        warehouseName: item._warehouseName,
        supplierName: item.supplierName,
      }));

      if (validItems.length === 0) {
        toast({
          title: t('inventory:importFailed'),
          description: t('inventory:noValidItems'),
          variant: "destructive",
        });
        setIsImporting(false);
        return;
      }

      // Send all items in a single bulk request
      const res = await apiRequest('POST', '/api/products/bulk-import', { items: validItems });
      const response = await res.json();

      // Close preview modal
      setShowImportPreview(false);
      setImportPreviewData([]);
      setImportErrors([]);

      // Refresh products and related data
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });

      // Store imported IDs for revert (only new products, not updates)
      const newProductIds = response.products
        ?.filter((p: any) => p.action === 'created')
        .map((p: any) => p.id) || [];
      
      if (newProductIds.length > 0) {
        setLastImportedIds(newProductIds);
        setShowRevertButton(true);
      }

      // Show result
      const successCount = response.imported || 0;
      const errorCount = response.errors || 0;

      if (errorCount > 0) {
        toast({
          title: t('inventory:importCompletedWithErrors'),
          description: t('inventory:importSuccessWithErrors', { successCount, errorCount }),
          variant: "destructive",
        });
      } else {
        toast({
          title: t('inventory:importSuccessful'),
          description: t('inventory:importSuccess', { count: successCount }),
        });
      }
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: t('inventory:importFailed'),
        description: error.message,
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
    let revertedCount = 0;
    let failedCount = 0;

    try {
      for (const id of lastImportedIds) {
        try {
          await apiRequest('DELETE', `/api/products/${id}`);
          revertedCount++;
        } catch (error) {
          failedCount++;
          console.error(`Failed to revert product ${id}:`, error);
        }
      }

      // Clear revert state
      setLastImportedIds([]);
      setShowRevertButton(false);

      // Refresh products
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });

      toast({
        title: t('inventory:revertSuccessful'),
        description: t('inventory:revertedProducts', { count: revertedCount }),
      });

      if (failedCount > 0) {
        toast({
          title: t('inventory:revertPartial'),
          description: t('inventory:revertFailed', { count: failedCount }),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: t('inventory:revertFailed'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsReverting(false);
    }
  };

  // Filter products based on search query, category, and archive status
  const filteredProducts = products?.filter((product: any) => {
    // Archive filter - only show inactive products in archive mode
    if (showArchive && product.isActive) {
      return false;
    }
    if (!showArchive && !product.isActive) {
      return false;
    }

    // Category filter
    if (categoryFilter !== "all" && String(product.categoryId) !== String(categoryFilter)) {
      return false;
    }

    // Search filter
    if (!searchQuery) return true;
    
    const results = fuzzySearch([product], searchQuery, {
      fields: ['name', 'sku', 'description'],
      threshold: 0.2,
      fuzzy: true,
      vietnameseNormalization: true,
    });
    return results.length > 0;
  });

  const getStockStatus = (quantity: number, lowStockAlert: number, isVirtual?: boolean, availableVirtualStock?: number) => {
    // For virtual SKUs, use the calculated available stock
    const effectiveQuantity = isVirtual ? (availableVirtualStock ?? 0) : quantity;
    
    if (effectiveQuantity <= 0) {
      return <Badge variant="destructive">{t('inventory:outOfStock')}</Badge>;
    } else if (effectiveQuantity <= lowStockAlert) {
      return <Badge variant="destructive">{t('inventory:lowStock')}</Badge>;
    } else if (effectiveQuantity <= lowStockAlert * 2) {
      return <Badge variant="outline" className="text-orange-600 dark:text-orange-400 border-orange-600 dark:border-orange-500">{t('inventory:warning')}</Badge>;
    } else {
      return <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">{t('inventory:inStock')}</Badge>;
    }
  };

  // Helper function to determine product status badge
  const getProductStatusBadge = (product: any) => {
    if (!product.createdAt) return null;
    
    const now = new Date();
    const createdAt = new Date(product.createdAt);
    const updatedAt = product.updatedAt ? new Date(product.updatedAt) : createdAt;
    const daysSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceUpdated = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    // New product (created within last 7 days)
    if (daysSinceCreated <= 7) {
      return (
        <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] px-1.5 py-0 h-4 ml-2">
          <Sparkles className="h-2.5 w-2.5 mr-0.5" />
          {t('inventory:new')}
        </Badge>
      );
    }
    
    // Recently restocked (updated within last 7 days, but created more than 7 days ago)
    if (daysSinceUpdated <= 7 && daysSinceCreated > 7) {
      return (
        <Badge variant="outline" className="bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300 text-[10px] px-1.5 py-0 h-4 ml-2">
          <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
          {t('inventory:restocked')}
        </Badge>
      );
    }
    
    return null;
  };

  // Define table columns
  const columns: DataTableColumn<any>[] = [
    {
      key: "image",
      header: "",
      sortable: false,
      className: "w-[60px]",
      cell: (product) => (
        <div className="flex items-center justify-center">
          {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="w-10 h-10 object-contain rounded flex-shrink-0 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-gray-700"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
          )}
        </div>
      ),
    },
    {
      key: "name",
      header: t('inventory:productColumn'),
      sortable: true,
      className: "min-w-[200px]",
      cell: (product) => (
        <div>
          <Link href={`/inventory/products/${product.id}`}>
            <span className={`font-medium cursor-pointer block ${product.isActive ? 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300' : 'text-gray-400 dark:text-gray-500 line-through'}`}>
              {product.name}
              {product.isVirtual && (
                <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 border-purple-400 text-purple-600 dark:text-purple-400">
                  Virtual
                </Badge>
              )}
              {!product.isActive && <span className="text-amber-600 dark:text-amber-400 font-medium ml-2">({t('inventory:inactive')})</span>}
              {product.isActive && !product.isVirtual && getProductStatusBadge(product)}
            </span>
          </Link>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {t('inventory:sku')}: {product.sku}
            {product.isVirtual && product.masterProductName && (
              <span className="text-purple-500 ml-2">
                → {product.masterProductName}
              </span>
            )}
          </p>
        </div>
      ),
    },
    {
      key: "categoryId",
      header: t('inventory:category'),
      sortable: true,
      cell: (product) => {
        const category = (categories as any[])?.find((c: any) => String(c.id) === product.categoryId);
        return category?.name || '-';
      },
    },
    {
      key: "quantity",
      header: t('inventory:qty'),
      sortable: true,
      className: "text-right w-[100px]",
      cell: (product) => {
        // Virtual SKU: Show calculated available stock from master product
        if (product.isVirtual && product.masterProductId) {
          const availableStock = product.availableVirtualStock ?? 0;
          const masterQty = product.masterProductQuantity ?? 0;
          const ratio = parseFloat(product.inventoryDeductionRatio || '1');
          return (
            <div className="flex flex-col items-end">
              <span className="font-bold text-purple-600 dark:text-purple-400">
                {availableStock}
              </span>
              <span className="text-xs text-gray-400">
                ({masterQty}/{ratio})
              </span>
            </div>
          );
        }
        // Regular product: Show available quantity with allocation info
        const available = product.availableQuantity ?? product.quantity ?? 0;
        const allocated = product.allocatedQuantity ?? 0;
        const total = product.quantity ?? 0;
        const isLow = available <= (product.lowStockAlert || 0);
        return (
          <div className="flex flex-col items-end">
            <span className={isLow ? 'text-red-600 font-medium' : ''}>
              {available}
            </span>
            {allocated > 0 && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                ({allocated} allocated)
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "unitsSold",
      header: t('inventory:unitsSold'),
      sortable: true,
      className: "text-right w-[100px]",
      cell: (product) => {
        const sold = product.unitsSold || 0;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            <span className="font-semibold text-emerald-700">{sold.toLocaleString()}</span>
          </div>
        );
      },
    },
    {
      key: "lowStockAlert",
      header: t('inventory:lowStockAlert'),
      sortable: true,
      className: "text-right",
    },
    {
      key: "priceEur",
      header: t('inventory:priceEur'),
      sortable: true,
      cell: (product) => formatCurrency(parseFloat(product.priceEur || '0'), 'EUR'),
      className: "text-right",
    },
    {
      key: "priceCzk",
      header: t('inventory:priceCzk'),
      sortable: true,
      cell: (product) => formatCurrency(parseFloat(product.priceCzk || '0'), 'CZK'),
      className: "text-right",
    },
    {
      key: "importCostUsd",
      header: t('inventory:importCostUsd'),
      sortable: true,
      cell: (product) => formatCurrency(parseFloat(product.importCostUsd || '0'), 'USD'),
      className: "text-right",
    },
    {
      key: "importCostCzk",
      header: t('inventory:importCostCzk'),
      sortable: true,
      cell: (product) => formatCurrency(parseFloat(product.importCostCzk || '0'), 'CZK'),
      className: "text-right",
    },
    {
      key: "importCostEur",
      header: t('inventory:importCostEur'),
      sortable: true,
      cell: (product) => formatCurrency(parseFloat(product.importCostEur || '0'), 'EUR'),
      className: "text-right",
    },
    {
      key: "sku",
      header: t('inventory:sku'),
      sortable: true,
      cell: (product) => product.sku || '-',
    },
    {
      key: "barcode",
      header: t('inventory:barcode'),
      sortable: true,
      cell: (product) => product.barcode || '-',
    },
    {
      key: "supplierId",
      header: t('inventory:supplier'),
      sortable: true,
      cell: (product) => product.supplier?.name || '-',
    },
    {
      key: "warehouseId",
      header: t('inventory:warehouse'),
      sortable: true,
      cell: (product) => {
        const warehouse = (warehouses as any[])?.find((w: any) => w.id === product.warehouseId);
        return warehouse?.name || '-';
      },
    },
    {
      key: "status",
      header: t('inventory:status'),
      cell: (product) => getStockStatus(product.quantity, product.lowStockAlert, product.isVirtual, product.availableVirtualStock),
    },
    {
      key: "createdAt",
      header: t('common:createdAt'),
      sortable: true,
      className: "text-right whitespace-nowrap",
      cell: (product) => {
        if (!product.createdAt) return '-';
        const date = new Date(product.createdAt);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      },
    },
    {
      key: "updatedAt",
      header: t('common:updatedAt'),
      sortable: true,
      className: "text-right whitespace-nowrap",
      cell: (product) => {
        if (!product.updatedAt) return '-';
        const date = new Date(product.updatedAt);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      },
    },
    {
      key: "actions",
      header: t('inventory:actions'),
      cell: (product) => (
        <div className="flex items-center gap-1">
          {product.isActive ? (
            <>
              <Link href={`/inventory/${product.id}/edit`}>
                <Button size="sm" variant="ghost" data-testid={`button-edit-${product.id}`}>
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={`/inventory/add?duplicateId=${product.id}`}>
                <Button size="sm" variant="ghost" title={t('inventory:duplicate')} data-testid={`button-duplicate-${product.id}`}>
                  <Copy className="h-4 w-4" />
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" data-testid={`button-delete-${product.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('inventory:deleteProductTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('inventory:deleteConfirmation', { name: product.name })}
                    </AlertDialogDescription>
                    <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 mt-4">
                      <div className="text-amber-600 dark:text-amber-400 font-medium">
                        {t('inventory:productWillBeInactive')}
                      </div>
                      <div>{t('inventory:preservesOrderHistory')}</div>
                    </div>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('inventory:cancel')}</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => deleteProductMutation.mutate(product.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {t('inventory:delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <Button 
              size="sm" 
              variant="outline" 
              className="text-green-600 dark:text-green-400 border-green-600 dark:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
              onClick={() => restoreProductMutation.mutate(product.id)}
            >
              {t('inventory:restore')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Filter columns based on visibility and financial data access
  const visibleColumns = columns.filter(col => {
    // Hide financial columns for users without access
    if (!canViewImportCost && ['importCostUsd', 'importCostCzk', 'importCostEur'].includes(col.key)) {
      return false;
    }
    return columnVisibility[col.key] !== false;
  });

  // Toggle column visibility
  const toggleColumnVisibility = (key: string) => {
    // Prevent hiding Image, Product and Actions columns
    if (key === 'image' || key === 'name' || key === 'actions') {
      return;
    }
    setColumnVisibility(prev => {
      // Get current value (if undefined or true, column is shown)
      const currentValue = prev[key] !== false;
      return {
        ...prev,
        [key]: !currentValue // Toggle it
      };
    });
  };

  // Bulk actions
  const bulkActions = showArchive ? [
    {
      type: "button" as const,
      label: t('inventory:restoreSelected'),
      action: async (products: any[]) => {
        const results = await Promise.allSettled(
          products.map(product => 
            restoreProductMutation.mutateAsync(product.id)
          )
        );
        
        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        if (failed > 0) {
          toast({
            title: t('inventory:partialSuccess'),
            description: t('inventory:productsRestoredWithErrors', { succeeded, failed }),
            variant: succeeded > 0 ? "default" : "destructive",
          });
        } else {
          toast({
            title: t('inventory:success'),
            description: t('inventory:allProductsRestored', { succeeded }),
          });
        }
      },
    },
    {
      type: "button" as const,
      label: t('inventory:exportExcel'),
      action: (products: any[]) => {
        handleBulkExportXLSX(products);
      },
    },
    {
      type: "button" as const,
      label: t('inventory:exportPDF'),
      action: (products: any[]) => {
        handleBulkExportPDF(products);
      },
    },
  ] : [
    {
      type: "button" as const,
      label: t('inventory:updateStock'),
      action: (products: any[]) => {
        toast({
          title: t('inventory:bulkUpdate'),
          description: t('inventory:updatingStock', { count: products.length }),
        });
      },
    },
    {
      type: "button" as const,
      label: t('inventory:moveToArchive'),
      variant: "outline" as const,
      action: async (products: any[]) => {
        const results = await Promise.allSettled(
          products.map(product => 
            archiveProductMutation.mutateAsync(product.id)
          )
        );
        
        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        if (failed > 0) {
          toast({
            title: t('inventory:partialSuccess'),
            description: t('inventory:productsArchivedWithErrors', { succeeded, failed }),
            variant: succeeded > 0 ? "default" : "destructive",
          });
        } else {
          toast({
            title: t('inventory:success'),
            description: t('inventory:allProductsArchived', { succeeded }),
          });
        }
      },
    },
    {
      type: "button" as const,
      label: t('inventory:delete'),
      variant: "destructive" as const,
      action: async (products: any[]) => {
        setSelectedProducts(products);
        
        // Fetch order counts for selected products
        try {
          const productIds = products.map(p => p.id);
          const response = await apiRequest('POST', '/api/products/order-counts', { productIds }) as unknown as { [productId: string]: number };
          setOrderCounts(response);
        } catch (error) {
          console.error("Failed to fetch order counts:", error);
          setOrderCounts({});
        }
        
        setShowDeleteDialog(true);
      },
    },
    {
      type: "button" as const,
      label: t('inventory:exportExcel'),
      action: (products: any[]) => {
        handleBulkExportXLSX(products);
      },
    },
    {
      type: "button" as const,
      label: t('inventory:exportPDF'),
      action: (products: any[]) => {
        handleBulkExportPDF(products);
      },
    },
  ];

  const handleDeleteConfirm = async () => {
    const results = await Promise.allSettled(
      selectedProducts.map(product => 
        deleteProductMutation.mutateAsync(product.id)
      )
    );
    
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    if (failed > 0) {
      toast({
        title: t('inventory:partialSuccess'),
        description: t('inventory:productsDeletedWithErrors', { succeeded, failed }),
        variant: succeeded > 0 ? "default" : "destructive",
      });
    } else {
      toast({
        title: t('inventory:success'),
        description: t('inventory:allProductsDeleted', { succeeded }),
      });
    }
    
    setSelectedProducts([]);
    setShowDeleteDialog(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 md:space-y-6 overflow-x-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="h-8 w-40 bg-muted rounded-md animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded-md animate-pulse mt-2" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 bg-muted rounded-md animate-pulse" />
            <div className="h-9 w-9 bg-muted rounded-md animate-pulse" />
            <div className="h-9 w-32 bg-muted rounded-md animate-pulse" />
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
          <div className="p-4 border-b flex items-center gap-4">
            <div className="h-10 flex-1 max-w-md bg-muted rounded-md animate-pulse" />
            <div className="h-10 w-24 bg-muted rounded-md animate-pulse" />
          </div>
          <div className="divide-y">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4" style={{ opacity: 1 - i * 0.06 }}>
                <div className="h-5 w-5 bg-muted rounded-md animate-pulse" />
                <div className="h-12 w-12 bg-muted rounded-md animate-pulse" />
                <div className="h-5 flex-1 bg-muted rounded-md animate-pulse" />
                <div className="h-5 w-20 bg-muted rounded-md animate-pulse" />
                <div className="h-5 w-16 bg-muted rounded-md animate-pulse" />
                <div className="h-5 w-24 bg-muted rounded-md animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 overflow-x-hidden">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {showArchive && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowArchive(false)}
              className="h-9 w-9"
              data-testid="button-back-to-inventory"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {showArchive ? t('inventory:archivedProducts') : t('inventory:inventory')}
            </h1>
            {!showArchive && (
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                {t('inventory:manageProductCatalog')}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          {/* Hidden file input for import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImport}
            className="hidden"
            data-testid="input-file-import"
          />
          
          {/* Archive toggle button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 px-2 sm:px-3"
            onClick={() => setShowArchive(!showArchive)}
            data-testid="button-toggle-archive"
          >
            <Archive className="h-4 w-4" />
          </Button>
          
          {/* Three-dot menu for Import/Export - positioned LEFT of Add Product button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9" data-testid="button-actions-menu">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('inventory:importExport')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowImportDialog(true)} data-testid="menu-import-xlsx">
                <Upload className="h-4 w-4 mr-2" />
                {t('inventory:importFromExcel')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowExportDialog(true)} data-testid="menu-export">
                <Download className="h-4 w-4 mr-2" />
                {t('inventory:export')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Add Product Button - Always Visible */}
          {!showArchive && (
            <Link href="/inventory/add">
              <Button data-testid="button-add-product" className="flex items-center gap-2 h-9">
                <Plus className="h-4 w-4" />
                <span className="hidden xs:inline sm:inline">{t('inventory:addProduct')}</span>
                <span className="inline xs:hidden sm:hidden">{t('common:add')}</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {!showArchive && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {/* Total Products */}
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('inventory:totalProducts')}
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate cursor-help">
                          {formatCompactNumber(filteredProducts?.length || 0)}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-mono">{(filteredProducts?.length || 0).toLocaleString()} {t('inventory:products')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950">
                  <Package className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-cyan-600 dark:text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Low Stock */}
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('inventory:lowStock')}
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-amber-600 dark:text-amber-400 truncate cursor-help">
                          {formatCompactNumber(filteredProducts?.filter((p: any) => p.quantity > 0 && p.quantity <= p.lowStockAlert).length || 0)}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-mono">{(filteredProducts?.filter((p: any) => p.quantity > 0 && p.quantity <= p.lowStockAlert).length || 0).toLocaleString()} {t('inventory:itemsCount')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
                  <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Out of Stock */}
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('inventory:outOfStock')}
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400 truncate cursor-help">
                          {formatCompactNumber(filteredProducts?.filter((p: any) => p.quantity === 0).length || 0)}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-mono">{(filteredProducts?.filter((p: any) => p.quantity === 0).length || 0).toLocaleString()} {t('inventory:itemsCount')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex-shrink-0 p-2 sm:p-2.5 md:p-3 rounded-xl bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950">
                  <PackageX className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Value */}
          <Card className="border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {t('inventory:totalValue')}
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400 truncate cursor-help">
                          {formatCurrency(
                            filteredProducts?.reduce((sum: number, p: any) => 
                              sum + (parseFloat(p.priceEur || '0') * p.quantity), 0) || 0, 
                            'EUR'
                          )}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-mono">
                          {formatCurrency(
                            filteredProducts?.reduce((sum: number, p: any) => 
                              sum + (parseFloat(p.priceEur || '0') * p.quantity), 0) || 0, 
                            'EUR'
                          )}
                        </p>
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
      )}

      {/* Recently Received Goods Banner */}
      {recentReceipts.length > 0 && (
        <Card className="border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg flex-shrink-0">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-green-900 dark:text-green-100 truncate">
                    {t('receiving:recentArrivals', { count: recentReceipts.length })}
                  </h3>
                  <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">
                    {t('receiving:goodsApprovedInLast7Days')}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="border-green-300 dark:border-green-800 text-green-700 dark:text-green-300 bg-white dark:bg-green-950/50 flex-shrink-0">
                {recentReceipts.length} {recentReceipts.length === 1 ? t('common:receipt') : t('common:receipts')}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters & Search */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3 md:pb-4 px-3 md:px-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 md:h-5 md:w-5 text-slate-600 dark:text-slate-400" />
            <CardTitle className="text-base md:text-lg">{t('inventory:filtersSearch')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-3 md:px-6">
          <div className="flex flex-col gap-3 md:grid md:grid-cols-3 md:gap-4">
            {/* Search */}
            <div className="md:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t('inventory:searchProductsPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 border-slate-300 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-500"
                  data-testid="input-search-products"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-10 border-slate-300 dark:border-slate-700" data-testid="select-category-filter">
                  <SelectValue placeholder={t('inventory:filterByCategory')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('inventory:allCategories')}</SelectItem>
                  {(categories as any[])?.map((category: any) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categoryFilter !== "all" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCategoryFilter("all")}
                  className="h-10 w-10"
                  data-testid="button-clear-category-filter"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* Column Visibility Settings - Desktop Only */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10 border-slate-300 dark:border-slate-700" data-testid="button-columns-selector">
                    <Settings className="mr-2 h-4 w-4" />
                    {t('inventory:toggleColumns')}
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{t('inventory:toggleColumnsLabel')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[400px]">
                  {/* Basic Info */}
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{t('inventory:basicInfo')}</div>
                  {[
                    { key: 'name', label: t('inventory:productColumn') },
                    { key: 'sku', label: t('inventory:sku') },
                    { key: 'barcode', label: t('inventory:barcode') },
                    { key: 'categoryId', label: t('inventory:category') },
                  ].map(col => (
                    <DropdownMenuItem
                      key={col.key}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        if (col.key !== 'name') {
                          toggleColumnVisibility(col.key);
                        }
                      }}
                      data-testid={`menuitem-column-${col.key}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{col.label}</span>
                        {columnVisibility[col.key] !== false && col.key !== 'name' && (
                          <Check className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                  
                  <DropdownMenuSeparator />
                  
                  {/* Stock */}
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{t('inventory:stockInfo')}</div>
                  {[
                    { key: 'quantity', label: t('inventory:qty') },
                    { key: 'unitsSold', label: t('inventory:unitsSold') },
                    { key: 'lowStockAlert', label: t('inventory:lowStockAlert') },
                    { key: 'status', label: t('inventory:status') },
                    { key: 'warehouseId', label: t('inventory:warehouse') },
                  ].map(col => (
                    <DropdownMenuItem
                      key={col.key}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleColumnVisibility(col.key);
                      }}
                      data-testid={`menuitem-column-${col.key}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{col.label}</span>
                        {columnVisibility[col.key] !== false && (
                          <Check className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                  
                  <DropdownMenuSeparator />
                  
                  {/* Pricing */}
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{t('inventory:pricingInfo')}</div>
                  {[
                    { key: 'priceEur', label: t('inventory:priceEur') },
                    { key: 'priceCzk', label: t('inventory:priceCzk') },
                    ...(canViewImportCost ? [
                      { key: 'importCostUsd', label: t('inventory:importCostUsd') },
                      { key: 'importCostEur', label: t('inventory:importCostEur') },
                      { key: 'importCostCzk', label: t('inventory:importCostCzk') },
                    ] : []),
                  ].map(col => (
                    <DropdownMenuItem
                      key={col.key}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleColumnVisibility(col.key);
                      }}
                      data-testid={`menuitem-column-${col.key}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{col.label}</span>
                        {columnVisibility[col.key] !== false && (
                          <Check className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                  
                  <DropdownMenuSeparator />
                  
                  {/* Other */}
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{t('inventory:otherInfo')}</div>
                  {[
                    { key: 'supplierId', label: t('inventory:supplier') },
                    { key: 'actions', label: t('inventory:actions') },
                  ].map(col => (
                    <DropdownMenuItem
                      key={col.key}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        if (col.key !== 'actions') {
                          toggleColumnVisibility(col.key);
                        }
                      }}
                      data-testid={`menuitem-column-${col.key}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{col.label}</span>
                        {columnVisibility[col.key] !== false && col.key !== 'actions' && (
                          <Check className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </ScrollArea>
              </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-0 md:p-6">
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3 p-3">
            {filteredProducts?.map((product: any) => {
              const warehouse = (warehouses as any[])?.find((w: any) => w.id === product.warehouseId);
              const unitsSold = product.unitsSold || 0;
              
              return (
                <div key={product.id} className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-100 dark:border-slate-800 p-4">
                  <div className="space-y-3">
                    {/* Top Row - Product, Stock Status, Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarImage src={product.imageUrl} />
                          <AvatarFallback className="text-sm bg-gray-100 dark:bg-gray-800 dark:text-gray-300">{product.name?.charAt(0) || 'P'}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <Link href={`/inventory/products/${product.id}`}>
                            <span className={`font-semibold truncate cursor-pointer block ${product.isActive ? 'text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400' : 'text-gray-400 dark:text-gray-500 line-through'}`}>
                              {product.name}
                              {product.isVirtual && (
                                <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 border-purple-400 text-purple-600 dark:text-purple-400">
                                  Virtual
                                </Badge>
                              )}
                              {product.isActive && !product.isVirtual && getProductStatusBadge(product)}
                            </span>
                          </Link>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t('inventory:sku')}: {product.sku}
                            {product.isVirtual && product.masterProductName && (
                              <span className="text-purple-500 ml-2">→ {product.masterProductName}</span>
                            )}
                            {!product.isActive && <span className="text-amber-600 font-medium ml-2">({t('inventory:inactive')})</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {getStockStatus(product.quantity, product.lowStockAlert, product.isVirtual, product.availableVirtualStock)}
                      </div>
                    </div>
                    
                    {/* Middle Row - Key Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">{t('inventory:category')}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {(categories as any[])?.find((c: any) => String(c.id) === product.categoryId)?.name || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">{t('inventory:quantity')}</p>
                        {product.isVirtual && product.masterProductId ? (
                          <div>
                            <span className="font-bold text-purple-600 dark:text-purple-400">
                              {product.availableVirtualStock ?? 0} {t('common:units')}
                            </span>
                            <span className="text-xs text-gray-400 ml-1">
                              ({product.masterProductQuantity ?? 0}/{parseFloat(product.inventoryDeductionRatio || '1')})
                            </span>
                          </div>
                        ) : (
                          <p className="font-medium text-gray-900 dark:text-gray-100">{product.quantity} {t('common:units')}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">{t('inventory:location')}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {warehouse?.name || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">{t('inventory:unitsSold')}</p>
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                          <p className="font-semibold text-emerald-700">{unitsSold.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Pricing Section */}
                    <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-gray-100 dark:border-gray-800">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('inventory:sellPrice')}</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(parseFloat(product.priceEur || '0'), 'EUR')}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {formatCurrency(parseFloat(product.priceCzk || '0'), 'CZK')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('inventory:importCostLabel')}</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(parseFloat(product.importCostEur || '0'), 'EUR')}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {formatCurrency(parseFloat(product.importCostCzk || '0'), 'CZK')}
                        </p>
                      </div>
                    </div>
                    
                    {/* Action Buttons - Full Width, Touch-Friendly */}
                    <div className="flex items-center gap-2 pt-2">
                      {product.isActive ? (
                        <>
                          <Link href={`/inventory/products/${product.id}`} className="flex-1">
                            <Button variant="outline" className="w-full h-11 touch-target" data-testid={`button-view-details-${product.id}`}>
                              <Package className="h-4 w-4 mr-2" />
                              {t('inventory:viewDetails')}
                            </Button>
                          </Link>
                          <Link href={`/inventory/${product.id}/edit`} className="flex-1">
                            <Button variant="outline" className="w-full h-11 touch-target" data-testid={`button-edit-${product.id}`}>
                              <Edit className="h-4 w-4 mr-2" />
                              {t('inventory:edit')}
                            </Button>
                          </Link>
                          <Link href={`/inventory/add?duplicateId=${product.id}`}>
                            <Button size="icon" variant="ghost" className="h-11 w-11 touch-target flex-shrink-0" title={t('inventory:duplicate')} data-testid={`button-duplicate-${product.id}`}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-11 w-11 touch-target text-red-600 hover:text-red-700 flex-shrink-0" data-testid={`button-delete-${product.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('inventory:deleteProduct')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('inventory:deleteConfirmation', { name: product.name })}
                                </AlertDialogDescription>
                                <div className="space-y-2 text-sm text-muted-foreground mt-4">
                                  <div className="text-amber-600 font-medium">
                                    {t('inventory:productWillBeInactive')}
                                  </div>
                                  <div>{t('inventory:preservesOrderHistory')}</div>
                                </div>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('inventory:cancel')}</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteProductMutation.mutate(product.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  {t('inventory:delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      ) : (
                        <Button 
                          variant="outline" 
                          className="w-full h-11 touch-target text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => restoreProductMutation.mutate(product.id)}
                          data-testid={`button-restore-${product.id}`}
                        >
                          {t('inventory:restore')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <DataTable
              key={visibleColumns.map(col => col.key).join(',')}
              data={filteredProducts}
              columns={visibleColumns}
              bulkActions={bulkActions}
              getRowKey={(product) => product.id}
              itemsPerPageOptions={[10, 20, 50, 100]}
              defaultItemsPerPage={20}
              renderBulkActions={({ selectedRows, selectedItems, bulkActions: actions }) => (
                <div className="px-4 sm:px-0 pb-3 space-y-2">
                  {/* Row 1: Title and Selection Count */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-mobile-lg font-semibold">
                      {showArchive ? `Archived Products (${filteredProducts?.length || 0})` : `Products (${filteredProducts?.length || 0})`}
                    </h2>
                    {selectedRows.size > 0 && (
                      <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/20 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800">
                        <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                          {selectedRows.size} {t('inventory:selected')}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Row 2: Action Buttons (only when items selected) */}
                  {selectedRows.size > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {actions.map((action, index) => {
                        if (action.type === "button") {
                          return (
                            <Button
                              key={index}
                              size="sm"
                              variant={action.variant || "outline"}
                              onClick={() => action.action(selectedItems)}
                              className="h-9 px-4 text-sm"
                            >
                              {action.label}
                            </Button>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
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
            <AlertDialogTitle>{t('inventory:deleteProducts')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('inventory:deleteConfirmationMultiple', { count: selectedProducts.length })}
            </AlertDialogDescription>
            <div className="space-y-3 text-sm text-muted-foreground mt-4">
              {selectedProducts.some(p => orderCounts[p.id] > 0) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="font-medium text-amber-800 mb-2">{t('inventory:productsWithOrderHistory')}</div>
                  <div className="space-y-1">
                    {selectedProducts.filter(p => orderCounts[p.id] > 0).map(product => (
                      <div key={product.id} className="text-amber-700 text-xs">
                        • {product.name}: {orderCounts[product.id]} {t('inventory:ordersCount')}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="text-amber-600 font-medium">
                {t('inventory:productsWillBeInactiveInfo')}
              </div>
              <div>{t('inventory:preservesOrderHistoryPlural')}</div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('inventory:cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              {t('inventory:proceedWithDeletion')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('inventory:importInventoryFromExcel')}</DialogTitle>
            <DialogDescription>
              {t('inventory:uploadExcelBulkUpdate')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">{t('inventory:importantNotes')}</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li dangerouslySetInnerHTML={{ __html: `• ${t('inventory:productsWithExistingSKUUpdated')}` }} />
                <li dangerouslySetInnerHTML={{ __html: `• ${t('inventory:productsWithNewSKUCreated')}` }} />
                <li>• {t('inventory:nameAndSKURequired')}</li>
                <li>• {t('inventory:categoriesWarehousesMustMatch')}</li>
              </ul>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <h4 className="font-semibold text-sm mb-3">{t('inventory:requiredExcelFormat')}</h4>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1">{t('inventory:requiredColumns')}</p>
                  <div className="flex flex-wrap gap-2">
                    <code className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">{t('inventory:name')}</code>
                    <code className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">{t('inventory:sku')}</code>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">{t('inventory:optionalColumns')}</p>
                  <div className="flex flex-wrap gap-2">
                    <code className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">{t('inventory:barcode')}</code>
                    <code className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">{t('inventory:category')}</code>
                    <code className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">{t('inventory:quantity')}</code>
                    <code className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">{t('inventory:lowStockAlert')}</code>
                    <code className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">{t('inventory:priceEur')}</code>
                    <code className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">{t('inventory:priceCzk')}</code>
                    <code className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">{t('inventory:importCostUsd')}</code>
                    <code className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">{t('inventory:importCostEur')}</code>
                    <code className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">{t('inventory:importCostCzk')}</code>
                    <code className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">{t('inventory:warehouse')}</code>
                    <code className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">{t('common:description')}</code>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">{t('inventory:exampleRow')}</h4>
              <div className="overflow-x-auto">
                <table className="text-xs w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">{t('inventory:name')}</th>
                      <th className="text-left p-2">{t('inventory:sku')}</th>
                      <th className="text-left p-2">{t('inventory:category')}</th>
                      <th className="text-left p-2">{t('inventory:quantity')}</th>
                      <th className="text-left p-2">{t('inventory:priceEur')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2">{t('inventory:exampleProductName')}</td>
                      <td className="p-2">{t('inventory:exampleSKU')}</td>
                      <td className="p-2">{t('inventory:exampleCategory')}</td>
                      <td className="p-2">50</td>
                      <td className="p-2">8.50</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleDownloadTemplate}
                  data-testid="button-download-template"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t('inventory:downloadTemplate')}
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-select-import-file"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t('inventory:selectExcelFile')}
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                {t('inventory:tipExportFormat')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              {t('inventory:cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('inventory:exportProducts')}</DialogTitle>
            <DialogDescription>
              {t('inventory:chooseExportFormat')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">
                {t('inventory:exportingCount', { count: filteredProducts?.length || 0 })}
              </p>
              
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-12"
                  onClick={() => {
                    handleExportXLSX();
                    setShowExportDialog(false);
                  }}
                  data-testid="button-export-xlsx"
                >
                  <Download className="mr-3 h-5 w-5 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium">{t('inventory:exportToExcel')}</p>
                    <p className="text-xs text-muted-foreground">{t('inventory:excelFormatDesc')}</p>
                  </div>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-12"
                  onClick={() => {
                    handleExportPDF();
                    setShowExportDialog(false);
                  }}
                  data-testid="button-export-pdf"
                >
                  <FileText className="mr-3 h-5 w-5 text-red-600" />
                  <div className="text-left">
                    <p className="font-medium">{t('inventory:exportToPDF')}</p>
                    <p className="text-xs text-muted-foreground">{t('inventory:pdfFormatDesc')}</p>
                  </div>
                </Button>
              </div>
            </div>
            
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {t('inventory:exportIncludesAllColumns')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              {t('common:cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Preview Modal */}
      <Dialog open={showImportPreview} onOpenChange={setShowImportPreview}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5" />
              {t('inventory:reviewImportData')}
            </DialogTitle>
            <DialogDescription>
              {t('inventory:reviewBeforeImport')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{importPreviewData.length}</p>
                <p className="text-xs text-blue-600/70 dark:text-blue-400/70">{t('inventory:totalRows')}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {importPreviewData.filter(i => i._isValid && !i._isUpdate).length}
                </p>
                <p className="text-xs text-green-600/70 dark:text-green-400/70">{t('inventory:newProducts')}</p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-center">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {importPreviewData.filter(i => i._isUpdate).length}
                </p>
                <p className="text-xs text-amber-600/70 dark:text-amber-400/70">{t('inventory:updates')}</p>
              </div>
            </div>

            {/* Errors Warning */}
            {importErrors.length > 0 && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-red-700 dark:text-red-300">
                    {t('inventory:validationErrors', { count: importErrors.length })}
                  </span>
                </div>
                <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 max-h-20 overflow-y-auto">
                  {importErrors.slice(0, 5).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                  {importErrors.length > 5 && (
                    <li>... {t('inventory:andMore', { count: importErrors.length - 5 })}</li>
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
                    <th className="text-left p-2 font-medium">{t('inventory:status')}</th>
                    <th className="text-left p-2 font-medium">{t('inventory:name')}</th>
                    <th className="text-left p-2 font-medium">{t('inventory:sku')}</th>
                    <th className="text-left p-2 font-medium">{t('inventory:quantity')}</th>
                    <th className="text-left p-2 font-medium">{t('inventory:priceEur')}</th>
                    <th className="text-left p-2 font-medium">{t('inventory:category')}</th>
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
                            {t('inventory:invalid')}
                          </Badge>
                        ) : item._isUpdate ? (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-500">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            {t('inventory:update')}
                          </Badge>
                        ) : (
                          <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {t('inventory:new')}
                          </Badge>
                        )}
                      </td>
                      <td className="p-2 font-medium">{item.name || '-'}</td>
                      <td className="p-2 font-mono text-xs">{item.sku || '-'}</td>
                      <td className="p-2">{item.quantity}</td>
                      <td className="p-2">{item.priceEur}</td>
                      <td className="p-2 text-muted-foreground">{item._categoryName || '-'}</td>
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
              {t('common:cancel')}
            </Button>
            <Button 
              onClick={confirmImport}
              disabled={isImporting || importPreviewData.filter(i => i._isValid).length === 0}
              data-testid="button-confirm-import"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t('inventory:importing')}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t('inventory:confirmImport', { count: importPreviewData.filter(i => i._isValid).length })}
                </>
              )}
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
                {t('inventory:importCompleted')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('inventory:importedProductsCount', { count: lastImportedIds.length })}
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
                <span className="ml-1">{t('inventory:revert')}</span>
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
