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
        <CardHeader className="p-3 border-b">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-teal-600" />
            <CardTitle className="text-sm font-semibold">Product Documents & Files</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
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
        <CardHeader className="p-3 border-b">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-teal-600" />
            <CardTitle className="text-sm font-semibold">Product Documents & Files</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <p className="text-xs text-slate-500">No documents available for selected products</p>
        </CardContent>
      </Card>
    );
  }

  const previouslySent = previouslySentDocuments || new Set<string>();
  const hasHistory = previouslySent.size > 0;

  return (
    <Card className="shadow-sm">
      <CardHeader className="p-3 border-b">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <CardTitle className="text-sm font-semibold">Product Documents & Files</CardTitle>
          </div>
          {localSelectedIds.size > 0 && (
            <Badge variant="default" className="h-5 px-2 text-xs bg-teal-600">
              {localSelectedIds.size}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-3 space-y-3">
        {/* Customer Document History Alert */}
        {hasHistory && (
          <Alert className="py-2 px-3 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <History className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-200 text-xs">
                {previouslySent.size} document(s) previously sent (marked with <CheckCircle className="h-3 w-3 inline text-green-600" />)
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="space-y-3">
          {orderItems.map(item => {
            const productFiles = fileQueries.data?.[item.productId] || [];
            
            if (productFiles.length === 0) {
              return null;
            }
            
            const allSelected = productFiles.every(file => localSelectedIds.has(file.id));
            const selectedCount = productFiles.filter(file => localSelectedIds.has(file.id)).length;
            
            return (
              <div key={item.productId} className="space-y-2">
                {/* Product Header */}
                <div className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Package className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                      {item.productName}
                    </span>
                    <Badge variant="outline" className="text-xs px-1.5 h-5 shrink-0">
                      {item.sku}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs text-slate-500">
                      {selectedCount}/{productFiles.length}
                    </span>
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => handleSelectAll(item.productId)}
                      data-testid={`checkbox-select-all-${item.productId}`}
                    />
                  </div>
                </div>
                
                {/* Document List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {productFiles.map(file => {
                    const Icon = FILE_TYPE_ICONS[file.fileType] || FileText;
                    const flag = LANGUAGE_FLAGS[file.language] || '🌐';
                    const wasSent = previouslySent.has(file.id);
                    const isSelected = localSelectedIds.has(file.id);
                    
                    return (
                      <div
                        key={file.id}
                        className={`flex items-center gap-2 py-2 px-3 rounded-md border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-teal-50 dark:bg-teal-950/30 border-teal-300 dark:border-teal-700' 
                            : 'bg-white dark:bg-slate-900/20 border-slate-200 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-800'
                        }`}
                        onClick={() => handleDocumentToggle(file.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleDocumentToggle(file.id)}
                          data-testid={`checkbox-document-${file.id}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-medium truncate ${isSelected ? 'text-teal-900 dark:text-teal-100' : 'text-slate-900 dark:text-slate-100'}`}>
                              {file.displayName}
                            </span>
                            {wasSent && (
                              <span title="Previously sent to this customer">
                                <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400 shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-slate-500">
                              {flag} {file.language.toUpperCase()}
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
        {localSelectedIds.size > 0 && (
          <div className="flex items-center gap-2 py-2 px-3 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-md mt-3">
            <Info className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="text-xs font-medium text-teal-900 dark:text-teal-100">
              {localSelectedIds.size} document{localSelectedIds.size !== 1 ? 's' : ''} will be included
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
