import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Separator } from '@/components/ui/separator';
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
  fileType: string;
  fileName: string;
  language: string;
  displayName: string;
  category?: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
}

interface OrderDocumentSelectorProps {
  orderItems: OrderItem[];
  selectedDocumentIds: string[];
  onDocumentSelectionChange: (documentIds: string[]) => void;
  customerId?: string;
}

const FILE_TYPE_ICONS: Record<string, any> = {
  sds: Shield,
  cpnp: Award,
  flyer: FileImage,
  certificate: Award,
  manual: Book,
  other: File,
};

const FILE_TYPE_LABELS: Record<string, string> = {
  sds: 'Safety Data Sheet',
  cpnp: 'CPNP Certificate',
  flyer: 'Product Flyer',
  certificate: 'Certificate',
  manual: 'User Manual',
  other: 'Other',
};

const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇬🇧',
  cs: '🇨🇿',
  de: '🇩🇪',
  fr: '🇫🇷',
  es: '🇪🇸',
  zh: '🇨🇳',
  vn: '🇻🇳',
};

export default function OrderDocumentSelector({
  orderItems,
  selectedDocumentIds,
  onDocumentSelectionChange,
  customerId,
}: OrderDocumentSelectorProps) {
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(
    new Set(selectedDocumentIds)
  );

  // Fetch files for all products in the order
  const productIds = [...new Set(orderItems.map(item => item.productId))];
  
  const fileQueries = useQuery({
    queryKey: ['/api/products/files', productIds],
    queryFn: async () => {
      const allFiles: Record<string, ProductFile[]> = {};
      
      for (const productId of productIds) {
        try {
          const response = await fetch(`/api/products/${productId}/files`);
          if (response.ok) {
            const files = await response.json();
            allFiles[productId] = files;
          } else {
            allFiles[productId] = [];
          }
        } catch (error) {
          console.error(`Error fetching files for product ${productId}:`, error);
          allFiles[productId] = [];
        }
      }
      
      return allFiles;
    },
    enabled: productIds.length > 0,
  });

  // Fetch customer's order history to check previously sent documents
  const { data: previouslySentDocuments } = useQuery({
    queryKey: ['/api/customers', customerId, 'document-history'],
    queryFn: async () => {
      if (!customerId) return new Set<string>();
      
      try {
        const response = await fetch(`/api/customers/${customerId}/orders`);
        if (!response.ok) return new Set<string>();
        
        const orders = await response.json();
        const sentDocIds = new Set<string>();
        
        // Extract all document IDs from past orders
        orders.forEach((order: any) => {
          if (order.selectedDocumentIds && Array.isArray(order.selectedDocumentIds)) {
            order.selectedDocumentIds.forEach((id: string) => sentDocIds.add(id));
          }
        });
        
        return sentDocIds;
      } catch (error) {
        console.error('Error fetching customer document history:', error);
        return new Set<string>();
      }
    },
    enabled: !!customerId,
  });

  const handleDocumentToggle = (documentId: string) => {
    const newSelection = new Set(localSelectedIds);
    if (newSelection.has(documentId)) {
      newSelection.delete(documentId);
    } else {
      newSelection.add(documentId);
    }
    setLocalSelectedIds(newSelection);
    onDocumentSelectionChange(Array.from(newSelection));
  };

  const handleSelectAll = (productId: string) => {
    const productFiles = fileQueries.data?.[productId] || [];
    const allSelected = productFiles.every(file => localSelectedIds.has(file.id));
    
    const newSelection = new Set(localSelectedIds);
    productFiles.forEach(file => {
      if (allSelected) {
        newSelection.delete(file.id);
      } else {
        newSelection.add(file.id);
      }
    });
    
    setLocalSelectedIds(newSelection);
    onDocumentSelectionChange(Array.from(newSelection));
  };

  if (orderItems.length === 0) {
    return null;
  }

  if (fileQueries.isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Product Documents & Files</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Loading available documents...</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasAnyDocuments = productIds.some(
    productId => (fileQueries.data?.[productId]?.length || 0) > 0
  );

  if (!hasAnyDocuments) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Product Documents & Files
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            No documents available for selected products
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const previouslySent = previouslySentDocuments || new Set<string>();
  const hasHistory = previouslySent.size > 0;

  return (
    <Card className="shadow-sm">
      <CardHeader className="p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 font-semibold">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
              Product Documents & Files
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              Select documents to include with this order
            </CardDescription>
          </div>
          {localSelectedIds.size > 0 && (
            <Badge variant="default" className="shrink-0 bg-blue-600">
              {localSelectedIds.size} selected
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Customer Document History Alert */}
        {hasHistory && (
          <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <History className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
              This customer has received {previouslySent.size} document(s) in previous orders.
              Previously sent documents are marked with a checkmark icon.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {orderItems.map(item => {
            const productFiles = fileQueries.data?.[item.productId] || [];
            
            if (productFiles.length === 0) {
              return null;
            }
            
            const allSelected = productFiles.every(file => localSelectedIds.has(file.id));
            const selectedCount = productFiles.filter(file => localSelectedIds.has(file.id)).length;
            
            return (
              <div key={item.productId} className="space-y-3">
                {/* Product Header */}
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3 flex-1">
                    <Package className="h-5 w-5 text-slate-600 dark:text-slate-400 shrink-0" />
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 flex-1 min-w-0">
                      <span className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">
                        {item.productName}
                      </span>
                      <Badge variant="outline" className="text-xs shrink-0 w-fit">
                        {item.sku}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <div className="text-right">
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {selectedCount}/{productFiles.length} selected
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={() => handleSelectAll(item.productId)}
                        data-testid={`checkbox-select-all-${item.productId}`}
                      />
                      <span className="text-xs sm:text-sm font-medium hidden sm:inline">Select All</span>
                    </div>
                  </div>
                </div>
                
                {/* Document List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-3 sm:pl-6">
                  {productFiles.map(file => {
                    const Icon = FILE_TYPE_ICONS[file.fileType] || FileText;
                    const typeLabel = FILE_TYPE_LABELS[file.fileType] || file.fileType;
                    const flag = LANGUAGE_FLAGS[file.language] || '🌐';
                    const wasSent = previouslySent.has(file.id);
                    const isSelected = localSelectedIds.has(file.id);
                    
                    return (
                      <div
                        key={file.id}
                        className={`relative flex items-center gap-3 p-3 rounded-lg border transition-all ${
                          isSelected 
                            ? 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700 shadow-sm' 
                            : 'bg-white dark:bg-slate-900/20 border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800'
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleDocumentToggle(file.id)}
                          data-testid={`checkbox-document-${file.id}`}
                        />
                        <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium truncate ${isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-slate-900 dark:text-slate-100'}`}>
                              {file.displayName}
                            </span>
                            {wasSent && (
                              <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" title="Previously sent to this customer" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              {typeLabel}
                            </Badge>
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              {flag} {file.language.toUpperCase()}
                            </span>
                            {file.category && (
                              <Badge variant="outline" className="text-xs">
                                {file.category}
                              </Badge>
                            )}
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
        {localSelectedIds.size > 0 && (
          <>
            <Separator className="my-4" />
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {localSelectedIds.size} document{localSelectedIds.size !== 1 ? 's' : ''} will be included with this order
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
