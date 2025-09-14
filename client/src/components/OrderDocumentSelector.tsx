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
import {
  FileText,
  Shield,
  FileImage,
  Award,
  Book,
  File,
  Package,
} from 'lucide-react';

interface ProductFile {
  id: string;
  productId: string;
  fileType: string;
  fileName: string;
  language: string;
  displayName: string;
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
      <Card>
        <CardHeader>
          <CardTitle>Product Documents</CardTitle>
          <CardDescription>Loading available documents...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
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
      <Card>
        <CardHeader>
          <CardTitle>Product Documents</CardTitle>
          <CardDescription>No documents available for selected products</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Product Documents</CardTitle>
            <CardDescription>
              Select documents to include with the order
            </CardDescription>
          </div>
          {localSelectedIds.size > 0 && (
            <Badge variant="secondary">
              {localSelectedIds.size} selected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {orderItems.map(item => {
            const productFiles = fileQueries.data?.[item.productId] || [];
            
            if (productFiles.length === 0) {
              return null;
            }
            
            const allSelected = productFiles.every(file => localSelectedIds.has(file.id));
            const someSelected = productFiles.some(file => localSelectedIds.has(file.id));
            
            return (
              <div key={item.productId} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{item.productName}</span>
                    <Badge variant="outline">{item.sku}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {productFiles.length} {productFiles.length === 1 ? 'document' : 'documents'}
                    </span>
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => handleSelectAll(item.productId)}
                      data-testid={`checkbox-select-all-${item.productId}`}
                    />
                    <span className="text-sm">Select All</span>
                  </div>
                </div>
                
                <div className="ml-6 space-y-2">
                  {productFiles.map(file => {
                    const Icon = FILE_TYPE_ICONS[file.fileType] || FileText;
                    const typeLabel = FILE_TYPE_LABELS[file.fileType] || file.fileType;
                    const flag = LANGUAGE_FLAGS[file.language] || '🌐';
                    
                    return (
                      <div
                        key={file.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={localSelectedIds.has(file.id)}
                            onCheckedChange={() => handleDocumentToggle(file.id)}
                            data-testid={`checkbox-document-${file.id}`}
                          />
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {file.displayName}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {typeLabel}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {flag} {file.language.toUpperCase()}
                              </span>
                            </div>
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
      </CardContent>
    </Card>
  );
}