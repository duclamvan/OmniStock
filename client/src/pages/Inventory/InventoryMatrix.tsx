import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/use-page-title";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { normalizeVietnamese } from "@/lib/fuzzySearch";
import { ArrowLeft, Search, Check, Loader2, RefreshCw, Grid3X3, X } from "lucide-react";
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

interface SavingCell {
  productId: string;
  field: string;
  status: 'saving' | 'saved' | 'error';
}

const EDITABLE_COLUMNS = [
  { key: 'name', label: 'Name', width: 200, type: 'text' },
  { key: 'vietnameseName', label: 'Vietnamese Name', width: 180, type: 'text' },
  { key: 'sku', label: 'SKU', width: 120, type: 'text' },
  { key: 'barcode', label: 'Barcode', width: 130, type: 'text' },
  { key: 'categoryId', label: 'Category', width: 150, type: 'select' },
  { key: 'supplierId', label: 'Supplier', width: 150, type: 'select' },
  { key: 'warehouseLocation', label: 'Location', width: 100, type: 'text' },
  { key: 'quantity', label: 'Qty', width: 70, type: 'number' },
  { key: 'lowStockAlert', label: 'Low Stock', width: 85, type: 'number' },
  { key: 'priceCzk', label: 'Price CZK', width: 100, type: 'number' },
  { key: 'priceEur', label: 'Price EUR', width: 100, type: 'number' },
  { key: 'priceUsd', label: 'Price USD', width: 100, type: 'number' },
  { key: 'wholesalePriceCzk', label: 'WS CZK', width: 100, type: 'number' },
  { key: 'wholesalePriceEur', label: 'WS EUR', width: 100, type: 'number' },
  { key: 'importCostUsd', label: 'Cost USD', width: 100, type: 'number' },
  { key: 'importCostEur', label: 'Cost EUR', width: 100, type: 'number' },
  { key: 'importCostCzk', label: 'Cost CZK', width: 100, type: 'number' },
  { key: 'weight', label: 'Weight (kg)', width: 90, type: 'number' },
  { key: 'length', label: 'Length (cm)', width: 90, type: 'number' },
  { key: 'width', label: 'Width (cm)', width: 90, type: 'number' },
  { key: 'height', label: 'Height (cm)', width: 90, type: 'number' },
  { key: 'description', label: 'Description', width: 200, type: 'text' },
  { key: 'shipmentNotes', label: 'Notes', width: 150, type: 'text' },
];

export default function InventoryMatrix() {
  usePageTitle('Inventory Matrix', 'Inventory Matrix');
  const { t } = useTranslation(['inventory', 'common']);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [savingCells, setSavingCells] = useState<Map<string, SavingCell>>(new Map());
  const [editingCell, setEditingCell] = useState<{ productId: string; field: string } | null>(null);
  const [tempValue, setTempValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

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

  const saveCell = useCallback(async (product: Product, field: string, value: string) => {
    const originalValue = (product as any)[field];
    const originalStr = originalValue === null || originalValue === undefined ? '' : String(originalValue);
    
    if (value === originalStr) return;
    
    const cellKey = getCellKey(product.id, field);
    const column = EDITABLE_COLUMNS.find(c => c.key === field);
    let newValue: any = value;
    
    if (column?.type === 'number') {
      newValue = value === '' ? null : parseFloat(value);
      if (newValue !== null && isNaN(newValue)) {
        newValue = null;
      }
    }
    
    setSavingCells(prev => {
      const next = new Map(prev);
      next.set(cellKey, { productId: product.id, field, status: 'saving' });
      return next;
    });
    
    try {
      await apiRequest('PATCH', `/api/products/${product.id}`, { [field]: newValue });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      
      setSavingCells(prev => {
        const next = new Map(prev);
        next.set(cellKey, { productId: product.id, field, status: 'saved' });
        return next;
      });
      
      setTimeout(() => {
        setSavingCells(prev => {
          const next = new Map(prev);
          next.delete(cellKey);
          return next;
        });
      }, 1500);
    } catch (error) {
      console.error(`Failed to update ${field}:`, error);
      setSavingCells(prev => {
        const next = new Map(prev);
        next.set(cellKey, { productId: product.id, field, status: 'error' });
        return next;
      });
      toast({
        title: t('common:error'),
        description: t('common:saveFailed'),
        variant: "destructive",
      });
      
      setTimeout(() => {
        setSavingCells(prev => {
          const next = new Map(prev);
          next.delete(cellKey);
          return next;
        });
      }, 3000);
    }
  }, [t, toast]);

  const handleCellBlur = (product: Product, field: string) => {
    if (!editingCell) return;
    saveCell(product, field, tempValue);
    setEditingCell(null);
    setTempValue("");
  };

  const navigateToCell = useCallback((product: Product, field: string) => {
    const value = getDisplayValue(product, field);
    setEditingCell({ productId: product.id, field });
    setTempValue(value);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent, product: Product, field: string) => {
    if (e.key === 'Enter') {
      saveCell(product, field, tempValue);
      setEditingCell(null);
      setTempValue("");
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setTempValue("");
    } else if (e.key === 'Tab') {
      e.preventDefault();
      saveCell(product, field, tempValue);
      
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

  const renderCell = (product: Product, column: typeof EDITABLE_COLUMNS[0]) => {
    const isEditing = editingCell?.productId === product.id && editingCell?.field === column.key;
    const cellKey = getCellKey(product.id, column.key);
    const cellStatus = savingCells.get(cellKey);
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
          cursor-pointer px-2 py-1 rounded text-xs truncate h-7 flex items-center gap-1
          hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-all
          ${cellStatus?.status === 'saving' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
          ${cellStatus?.status === 'saved' ? 'bg-green-100 dark:bg-green-900/30' : ''}
          ${cellStatus?.status === 'error' ? 'bg-red-100 dark:bg-red-900/30' : ''}
        `}
        title={displayText || '-'}
      >
        {cellStatus?.status === 'saving' && <Loader2 className="h-3 w-3 animate-spin text-blue-500 flex-shrink-0" />}
        {cellStatus?.status === 'saved' && <Check className="h-3 w-3 text-green-500 flex-shrink-0" />}
        <span className="truncate">{displayText || <span className="text-slate-400">-</span>}</span>
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
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/products'] })}
              className="h-9"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              {t('common:refresh')}
            </Button>
          </div>
        </div>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="p-0">
            <div className="h-[calc(100vh-220px)] overflow-auto">
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
            </div>
          </CardContent>
        </Card>

        <div className="text-sm text-slate-500 dark:text-slate-400">
          {t('inventory:matrixTip')}
        </div>
      </div>
    </div>
  );
}
