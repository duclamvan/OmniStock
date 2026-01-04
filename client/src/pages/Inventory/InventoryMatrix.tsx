import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/use-page-title";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { normalizeVietnamese } from "@/lib/fuzzySearch";
import { ArrowLeft, Save, Search, X, Check, Loader2, RefreshCw, Grid3X3 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Product {
  id: string;
  name: string;
  vietnameseName: string | null;
  sku: string;
  barcode: string | null;
  categoryId: string | null;
  supplierId: string | null;
  warehouseId: string | null;
  warehouseLocation: string | null;
  quantity: number;
  lowStockAlert: number;
  priceCzk: string | null;
  priceEur: string | null;
  priceUsd: string | null;
  wholesalePriceCzk: string | null;
  wholesalePriceEur: string | null;
  importCostUsd: string | null;
  importCostEur: string | null;
  importCostCzk: string | null;
  weight: string | null;
  length: string | null;
  width: string | null;
  height: string | null;
  description: string | null;
  shipmentNotes: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface EditedCell {
  productId: string;
  field: string;
  originalValue: any;
  newValue: any;
}

const EDITABLE_COLUMNS = [
  { key: 'name', label: 'Name', width: 200, type: 'text' },
  { key: 'vietnameseName', label: 'Vietnamese Name', width: 180, type: 'text' },
  { key: 'sku', label: 'SKU', width: 120, type: 'text' },
  { key: 'barcode', label: 'Barcode', width: 120, type: 'text' },
  { key: 'categoryId', label: 'Category', width: 150, type: 'select' },
  { key: 'supplierId', label: 'Supplier', width: 150, type: 'select' },
  { key: 'warehouseLocation', label: 'Location', width: 100, type: 'text' },
  { key: 'quantity', label: 'Qty', width: 70, type: 'number' },
  { key: 'lowStockAlert', label: 'Alert', width: 70, type: 'number' },
  { key: 'priceCzk', label: 'Price CZK', width: 100, type: 'number' },
  { key: 'priceEur', label: 'Price EUR', width: 100, type: 'number' },
  { key: 'priceUsd', label: 'Price USD', width: 100, type: 'number' },
  { key: 'wholesalePriceCzk', label: 'WS CZK', width: 100, type: 'number' },
  { key: 'wholesalePriceEur', label: 'WS EUR', width: 100, type: 'number' },
  { key: 'importCostUsd', label: 'Cost USD', width: 100, type: 'number' },
  { key: 'importCostEur', label: 'Cost EUR', width: 100, type: 'number' },
  { key: 'importCostCzk', label: 'Cost CZK', width: 100, type: 'number' },
  { key: 'weight', label: 'Weight', width: 80, type: 'number' },
  { key: 'shipmentNotes', label: 'Notes', width: 150, type: 'text' },
];

export default function InventoryMatrix() {
  usePageTitle('Inventory Matrix', 'Inventory Matrix');
  const { t } = useTranslation(['inventory', 'common']);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [editedCells, setEditedCells] = useState<Map<string, EditedCell>>(new Map());
  const [editingCell, setEditingCell] = useState<{ productId: string; field: string } | null>(null);
  const [tempValue, setTempValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  const filteredProducts = products?.filter((product) => {
    if (!searchQuery) return true;
    const normalizedSearch = normalizeVietnamese(searchQuery.toLowerCase());
    const searchText = normalizeVietnamese([
      product.name,
      product.vietnameseName || '',
      product.sku,
      product.barcode || '',
    ].join(' ').toLowerCase());
    return searchText.includes(normalizedSearch);
  }) || [];

  const getCellKey = (productId: string, field: string) => `${productId}-${field}`;

  const getDisplayValue = (product: Product, field: string): string => {
    const cellKey = getCellKey(product.id, field);
    if (editedCells.has(cellKey)) {
      return String(editedCells.get(cellKey)!.newValue ?? '');
    }
    const value = (product as any)[field];
    if (value === null || value === undefined) return '';
    return String(value);
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return '';
    return categories?.find(c => c.id === categoryId)?.name || categoryId;
  };

  const getSupplierName = (supplierId: string | null) => {
    if (!supplierId) return '';
    return suppliers?.find(s => s.id === supplierId)?.name || supplierId;
  };

  const handleCellClick = (product: Product, field: string) => {
    const value = getDisplayValue(product, field);
    setEditingCell({ productId: product.id, field });
    setTempValue(value);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const saveCellValue = useCallback((product: Product, field: string, value: string) => {
    const originalValue = (product as any)[field];
    const originalStr = originalValue === null || originalValue === undefined ? '' : String(originalValue);
    
    if (value !== originalStr) {
      const cellKey = getCellKey(product.id, field);
      const column = EDITABLE_COLUMNS.find(c => c.key === field);
      let newValue: any = value;
      
      if (column?.type === 'number') {
        newValue = value === '' ? null : parseFloat(value);
        if (newValue !== null && isNaN(newValue)) {
          newValue = null;
        }
      }
      
      setEditedCells(prev => {
        const next = new Map(prev);
        next.set(cellKey, {
          productId: product.id,
          field,
          originalValue,
          newValue,
        });
        return next;
      });
    }
  }, []);

  const handleCellBlur = (product: Product, field: string) => {
    if (!editingCell) return;
    saveCellValue(product, field, tempValue);
    setEditingCell(null);
    setTempValue("");
  };

  const navigateToCell = useCallback((product: Product, field: string) => {
    const value = getDisplayValue(product, field);
    setEditingCell({ productId: product.id, field });
    setTempValue(value);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [editedCells]);

  const handleKeyDown = (e: React.KeyboardEvent, product: Product, field: string) => {
    if (e.key === 'Enter') {
      saveCellValue(product, field, tempValue);
      setEditingCell(null);
      setTempValue("");
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setTempValue("");
    } else if (e.key === 'Tab') {
      e.preventDefault();
      saveCellValue(product, field, tempValue);
      
      const currentColIndex = EDITABLE_COLUMNS.findIndex(c => c.key === field);
      const currentRowIndex = filteredProducts.findIndex(p => p.id === product.id);
      
      let nextProduct: Product | null = null;
      let nextField: string | null = null;
      
      if (e.shiftKey) {
        if (currentColIndex > 0) {
          nextProduct = product;
          nextField = EDITABLE_COLUMNS[currentColIndex - 1].key;
        } else if (currentRowIndex > 0) {
          nextProduct = filteredProducts[currentRowIndex - 1];
          nextField = EDITABLE_COLUMNS[EDITABLE_COLUMNS.length - 1].key;
        }
      } else {
        if (currentColIndex < EDITABLE_COLUMNS.length - 1) {
          nextProduct = product;
          nextField = EDITABLE_COLUMNS[currentColIndex + 1].key;
        } else if (currentRowIndex < filteredProducts.length - 1) {
          nextProduct = filteredProducts[currentRowIndex + 1];
          nextField = EDITABLE_COLUMNS[0].key;
        }
      }
      
      if (nextProduct && nextField) {
        navigateToCell(nextProduct, nextField);
      } else {
        setEditingCell(null);
        setTempValue("");
      }
    }
  };

  const handleSaveAll = async () => {
    if (editedCells.size === 0) {
      toast({ title: t('common:noChanges'), description: t('common:noChangesToSave') });
      return;
    }

    setIsSaving(true);
    
    const updates: { [productId: string]: any } = {};
    
    editedCells.forEach((cell) => {
      if (!updates[cell.productId]) {
        updates[cell.productId] = { id: cell.productId };
      }
      updates[cell.productId][cell.field] = cell.newValue;
    });

    try {
      let successCount = 0;
      let errorCount = 0;
      
      for (const [productId, data] of Object.entries(updates)) {
        try {
          await apiRequest('PATCH', `/api/products/${productId}`, data);
          successCount++;
        } catch (error) {
          console.error(`Failed to update product ${productId}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['/api/products'] });
        setEditedCells(new Map());
        toast({
          title: t('common:success'),
          description: t('inventory:matrixUpdated', { count: successCount }),
        });
      }
      
      if (errorCount > 0) {
        toast({
          title: t('common:partialError'),
          description: t('inventory:matrixUpdateErrors', { count: errorCount }),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t('common:error'),
        description: t('common:saveFailed'),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setEditedCells(new Map());
    toast({ title: t('common:changesDiscarded') });
  };

  const hasChanges = editedCells.size > 0;

  const renderCell = (product: Product, column: typeof EDITABLE_COLUMNS[0]) => {
    const isEditing = editingCell?.productId === product.id && editingCell?.field === column.key;
    const cellKey = getCellKey(product.id, column.key);
    const isModified = editedCells.has(cellKey);
    const displayValue = getDisplayValue(product, column.key);

    if (isEditing) {
      if (column.key === 'categoryId') {
        return (
          <Select
            value={tempValue || "none"}
            onValueChange={(val) => {
              setTempValue(val === "none" ? "" : val);
              setTimeout(() => handleCellBlur(product, column.key), 0);
            }}
          >
            <SelectTrigger className="h-7 text-xs border-cyan-500 focus:ring-cyan-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-</SelectItem>
              {categories?.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      
      if (column.key === 'supplierId') {
        return (
          <Select
            value={tempValue || "none"}
            onValueChange={(val) => {
              setTempValue(val === "none" ? "" : val);
              setTimeout(() => handleCellBlur(product, column.key), 0);
            }}
          >
            <SelectTrigger className="h-7 text-xs border-cyan-500 focus:ring-cyan-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-</SelectItem>
              {suppliers?.map(sup => (
                <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      return (
        <Input
          ref={inputRef}
          type={column.type === 'number' ? 'number' : 'text'}
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={() => handleCellBlur(product, column.key)}
          onKeyDown={(e) => handleKeyDown(e, product, column.key)}
          className="h-7 text-xs border-cyan-500 focus:ring-cyan-500"
          step={column.type === 'number' ? '0.01' : undefined}
        />
      );
    }

    let displayText = displayValue;
    if (column.key === 'categoryId') {
      displayText = getCategoryName(displayValue) || '-';
    } else if (column.key === 'supplierId') {
      displayText = getSupplierName(displayValue) || '-';
    }

    return (
      <div
        onClick={() => handleCellClick(product, column.key)}
        className={`
          cursor-pointer px-2 py-1 rounded text-xs truncate h-7 flex items-center
          hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-colors
          ${isModified ? 'bg-amber-100 dark:bg-amber-900/30 font-medium' : ''}
        `}
        title={displayText || '-'}
      >
        {displayText || <span className="text-slate-400">-</span>}
      </div>
    );
  };

  if (productsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="p-3 sm:p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/inventory">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Grid3X3 className="h-6 w-6 text-cyan-500" />
                {t('inventory:inventoryMatrix')}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('inventory:matrixDescription')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t('common:search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            {hasChanges && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDiscardChanges}
                  disabled={isSaving}
                  className="h-9"
                >
                  <X className="h-4 w-4 mr-1" />
                  {t('common:discard')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="h-9 bg-cyan-600 hover:bg-cyan-700"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  {t('common:saveChanges')} ({editedCells.size})
                </Button>
              </>
            )}
          </div>
        </div>

        {hasChanges && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800 dark:text-amber-200">
              {t('inventory:unsavedChanges', { count: editedCells.size })}
            </span>
          </div>
        )}

        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="min-w-max">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800">
                    <tr>
                      <th className="text-left text-xs font-semibold text-slate-600 dark:text-slate-300 px-2 py-2 border-b border-slate-200 dark:border-slate-700 w-12">
                        #
                      </th>
                      {EDITABLE_COLUMNS.map((column) => (
                        <th
                          key={column.key}
                          className="text-left text-xs font-semibold text-slate-600 dark:text-slate-300 px-2 py-2 border-b border-slate-200 dark:border-slate-700"
                          style={{ minWidth: column.width, width: column.width }}
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product, index) => (
                      <tr
                        key={product.id}
                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-2 py-1 text-xs text-slate-500">
                          {index + 1}
                        </td>
                        {EDITABLE_COLUMNS.map((column) => (
                          <td
                            key={column.key}
                            className="px-0 py-0.5"
                            style={{ minWidth: column.width, width: column.width }}
                          >
                            {renderCell(product, column)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td
                          colSpan={EDITABLE_COLUMNS.length + 1}
                          className="text-center py-12 text-slate-500"
                        >
                          {searchQuery
                            ? t('common:noResultsFound')
                            : t('inventory:noProducts')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="text-sm text-slate-500 dark:text-slate-400">
          {t('inventory:matrixTip')}
        </div>
      </div>
    </div>
  );
}
