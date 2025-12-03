import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  Shield,
  FileImage,
  Award,
  Book,
  File,
  Package,
  CheckCircle,
  Info,
  History,
} from 'lucide-react';

interface ProductFile {
  id: string;
  productId: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  description: string | null;
  language: string | null;
  uploadedAt: string;
  isActive: boolean;
}

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
}

interface OrderDocumentSelectorProps {
  orderItems: OrderItem[];
  selectedDocumentIds: string[];
  onDocumentSelectionChange: (ids: string[]) => void;
  customerId?: string;
  existingOrderId?: string; // Flag to prevent auto-selection on existing orders
}

const FILE_TYPE_ICONS: Record<string, typeof FileText> = {
  sds: Shield,
  cpnp: Award,
  flyer: FileImage,
  certificate: Award,
  manual: Book,
  other: File,
};

const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇬🇧',
  de: '🇩🇪',
  cs: '🇨🇿',
  fr: '🇫🇷',
  it: '🇮🇹',
  es: '🇪🇸',
  pl: '🇵🇱',
  sk: '🇸🇰',
  hu: '🇭🇺',
  ro: '🇷🇴',
  bg: '🇧🇬',
  hr: '🇭🇷',
  sl: '🇸🇮',
  sr: '🇷🇸',
  ru: '🇷🇺',
  uk: '🇺🇦',
  zh: '🇨🇳',
  vn: '🇻🇳',
};

export default function OrderDocumentSelector({
  orderItems,
  selectedDocumentIds,
  onDocumentSelectionChange,
  customerId,
  existingOrderId,
}: OrderDocumentSelectorProps) {
  const { t } = useTranslation('orders');
  
  // Memoize unique product IDs to prevent query refetches
  // Sort to ensure stable array order for queryKey comparison
  const productIds = useMemo(
    () => Array.from(new Set(orderItems.map(item => item.productId))).sort(),
    [orderItems]
  );

  // Memoize unique products to avoid duplicate displays
  const uniqueProducts = useMemo(
    () => Array.from(new Map(orderItems.map(item => [item.productId, item])).values()),
    [orderItems]
  );

  // Fetch all files in a single query instead of multiple parallel queries
  // This prevents infinite loop issues with useQueries creating new array refs
  const { data: allFilesRaw = [], isLoading: filesLoading } = useQuery<ProductFile[]>({
    queryKey: ['/api/product-files'],
    enabled: productIds.length > 0,
  });

  // Filter files to only include products in this order
  const allFiles = useMemo(() => {
    const productIdSet = new Set(productIds);
    return allFilesRaw.filter(file => productIdSet.has(file.productId));
  }, [allFilesRaw, productIds]);

  // Fetch customer document history
  const { data: customerHistory = [] } = useQuery<string[]>({
    queryKey: ['/api/customers', customerId, 'document-history'],
    enabled: !!customerId,
  });

  // Memoize files grouped by product
  const filesByProduct = useMemo(() => {
    const grouped: Record<string, ProductFile[]> = {};
    allFiles.forEach(file => {
      if (!grouped[file.productId]) {
        grouped[file.productId] = [];
      }
      grouped[file.productId].push(file);
    });
    return grouped;
  }, [allFiles]);

  // Memoize set for fast lookups
  const selectedSet = useMemo(
    () => new Set(selectedDocumentIds),
    [selectedDocumentIds]
  );

  const historySet = useMemo(
    () => new Set(customerHistory),
    [customerHistory]
  );

  // Stable toggle handler
  const handleToggle = useCallback((fileId: string) => {
    const newSet = new Set(selectedDocumentIds);
    if (newSet.has(fileId)) {
      newSet.delete(fileId);
    } else {
      newSet.add(fileId);
    }
    onDocumentSelectionChange(Array.from(newSet));
  }, [selectedDocumentIds, onDocumentSelectionChange]);

  // Stable select all handler
  const handleSelectAll = useCallback((productId: string) => {
    const files = filesByProduct[productId] || [];
    const allSelected = files.every(f => selectedSet.has(f.id));
    
    const newSet = new Set(selectedDocumentIds);
    files.forEach(file => {
      if (allSelected) {
        newSet.delete(file.id);
      } else {
        newSet.add(file.id);
      }
    });
    onDocumentSelectionChange(Array.from(newSet));
  }, [filesByProduct, selectedSet, selectedDocumentIds, onDocumentSelectionChange]);

  if (orderItems.length === 0) {
    return null;
  }

  const totalFiles = allFiles.length;
  const hasHistory = customerHistory.length > 0;

  if (filesLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('orders:productDocuments')}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (totalFiles === 0) {
    return null;
  }

  return (
    <Card className="shadow-sm border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold">
              {t('orders:productDocuments')}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {t('orders:selectDocumentsToInclude')}
            </CardDescription>
          </div>
          {totalFiles > 0 && (
            <Badge variant="secondary" className="text-xs px-2 h-6 shrink-0">
              {totalFiles} {t('orders:available')}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-3 space-y-3">
        {hasHistory && (
          <Alert className="py-2 px-3 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <History className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-200 text-xs">
                {customerHistory.length} {t('orders:documentsPreviouslySent')} <CheckCircle className="h-3 w-3 inline text-green-600" />)
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="space-y-3">
          {uniqueProducts.map((product) => {
            const files = filesByProduct[product.productId] || [];
            
            if (files.length === 0) {
              return null;
            }

            const selectedCount = files.filter(f => selectedSet.has(f.id)).length;
            const allSelected = files.length > 0 && selectedCount === files.length;

            return (
              <div key={product.productId} className="space-y-2">
                {/* Product Header */}
                <div className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Package className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                      {product.productName}
                    </span>
                    <Badge variant="outline" className="text-xs px-1.5 h-5 shrink-0">
                      {product.sku}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {t(selectedCount === 1 ? 'orders:documentSelected' : 'orders:documentsSelected', { count: selectedCount })}/{files.length}
                    </span>
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => handleSelectAll(product.productId)}
                      data-testid={`checkbox-select-all-${product.productId}`}
                    />
                  </div>
                </div>

                {/* Document List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {files.map(file => {
                    const Icon = FILE_TYPE_ICONS[file.fileType] || FileText;
                    const flag = file.language ? (LANGUAGE_FLAGS[file.language] || '🌐') : '🌐';
                    const isSelected = selectedSet.has(file.id);
                    const wasSent = historySet.has(file.id);

                    return (
                      <div
                        key={file.id}
                        className={`flex items-center gap-2 py-2 px-3 rounded-md border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-teal-50 dark:bg-teal-950/30 border-teal-300 dark:border-teal-700'
                            : 'bg-white dark:bg-slate-900/20 border-slate-200 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-800'
                        }`}
                        onClick={() => handleToggle(file.id)}
                        data-testid={`document-row-${file.id}`}
                      >
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggle(file.id)}
                            data-testid={`checkbox-document-${file.id}`}
                          />
                        </div>
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-medium truncate ${isSelected ? 'text-teal-900 dark:text-teal-100' : 'text-slate-900 dark:text-slate-100'}`}>
                              {file.description || file.fileName}
                            </span>
                            {wasSent && (
                              <span title="Previously sent to this customer">
                                <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400 shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {file.language && `${flag} ${file.language.toUpperCase()}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Footer */}
        {selectedDocumentIds.length > 0 && (
          <div className="flex items-center gap-2 py-2 px-3 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-md mt-3">
            <Info className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="text-xs font-medium text-teal-900 dark:text-teal-100">
              {t(selectedDocumentIds.length === 1 ? 'orders:documentWillBeIncluded' : 'orders:documentsWillBeIncluded', { count: selectedDocumentIds.length })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
