import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import type { Supplier, Product, Purchase, SupplierFile } from "@shared/schema";
import { 
  ArrowLeft, 
  Pencil, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Link as LinkIcon,
  Package,
  Calendar,
  DollarSign,
  FileText,
  ShoppingCart,
  TrendingUp,
  Upload,
  File,
  Trash2,
  Download,
  Search
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/currencyUtils";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { UploadResult } from "@uppy/core";
import { toast } from "@/hooks/use-toast";
import { fuzzySearch } from "@/lib/fuzzySearch";

export default function SupplierDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { t } = useTranslation(['inventory', 'common']);
  const [productSearch, setProductSearch] = useState("");
  const [purchaseSearch, setPurchaseSearch] = useState("");

  const { data: supplier, isLoading } = useQuery<Supplier>({
    queryKey: [`/api/suppliers/${id}`],
    enabled: !!id,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: purchases = [] } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
  });

  const { data: supplierFiles = [] } = useQuery<SupplierFile[]>({
    queryKey: [`/api/suppliers/${id}/files`],
    enabled: !!id,
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return apiRequest('DELETE', `/api/suppliers/${id}/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/suppliers/${id}/files`] });
      toast({
        title: "File deleted",
        description: "The file has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the file.",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest('POST', `/api/suppliers/${id}/files/upload`);
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      for (const file of result.successful) {
        const uploadData = {
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileUrl: file.uploadURL,
          fileSize: file.size,
        };

        await apiRequest('POST', `/api/suppliers/${id}/files`, uploadData);
      }

      queryClient.invalidateQueries({ queryKey: [`/api/suppliers/${id}/files`] });
      toast({
        title: "Upload successful",
        description: `${result.successful.length} file(s) uploaded successfully.`,
      });
    }
  };

  // Filter products by this supplier
  const supplierProducts = products.filter(p => p.supplierId === id && p.isActive);
  
  // Filter purchases by this supplier - only filter when supplier data is loaded
  const supplierPurchases = supplier 
    ? purchases.filter(p => {
        const match = p.supplierName && supplier.name && 
          p.supplierName.toLowerCase().trim() === supplier.name.toLowerCase().trim();
        return match;
      })
    : [];
  
  // Filter products by search term
  const filteredProducts = productSearch
    ? fuzzySearch(supplierProducts, productSearch, {
        fields: ['name', 'sku'],
        threshold: 0.2,
        fuzzy: true,
        vietnameseNormalization: true,
      }).map(r => r.item)
    : supplierProducts;
  
  // Filter purchases by search term
  const filteredPurchases = purchaseSearch
    ? fuzzySearch(supplierPurchases, purchaseSearch, {
        fields: ['productName', 'sku'],
        threshold: 0.2,
        fuzzy: true,
        vietnameseNormalization: true,
      }).map(r => r.item)
    : supplierPurchases;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white dark:bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!supplier) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 truncate">{supplier.name}</h1>
        </div>
        <Button onClick={() => setLocation(`/suppliers/${id}/edit`)} className="shrink-0">
          <Pencil className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{t('inventory:editSupplier')}</span>
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100">{t('inventory:contactInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {supplier.contactPerson && (
                <div>
                  <p className="text-sm text-slate-600 mb-1">{t('inventory:contactPerson')}</p>
                  <p className="font-medium">{supplier.contactPerson}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {supplier.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <a href={`mailto:${supplier.email}`} className="text-blue-600 hover:underline">
                      {supplier.email}
                    </a>
                  </div>
                )}

                {supplier.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <a href={`tel:${supplier.phone}`} className="text-blue-600 hover:underline">
                      {supplier.phone}
                    </a>
                  </div>
                )}
              </div>

              {(supplier.address || supplier.country) && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div className="text-slate-600">
                    {supplier.address && <p>{supplier.address}</p>}
                    {supplier.country && <p className="font-medium">{supplier.country}</p>}
                  </div>
                </div>
              )}

              <Separator />

              {/* Links */}
              <div className="space-y-3">
                {supplier.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-slate-400" />
                    <a
                      href={supplier.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {supplier.website}
                    </a>
                  </div>
                )}

                {supplier.supplierLink && (
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-slate-400" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-600 mb-1">Supplier Catalog</p>
                      <a
                        href={supplier.supplierLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all"
                      >
                        {supplier.supplierLink}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader>
              <div className="space-y-4">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {t('inventory:supplierProducts')} ({filteredProducts.length} of {supplierProducts.length})
                </CardTitle>
                {supplierProducts.length > 0 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search products by name or SKU..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {supplierProducts.length === 0 ? (
                <p className="text-slate-500">No products from this supplier yet.</p>
              ) : filteredProducts.length === 0 ? (
                <p className="text-slate-500">No products match your search.</p>
              ) : (
                <div className="space-y-1">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 cursor-pointer text-sm"
                      onClick={() => setLocation(`/products/${product.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.name}</p>
                        <p className="text-xs text-slate-500">SKU: {product.sku}</p>
                      </div>
                      <div className="text-right ml-2">
                        <p className="font-medium">
                          {product.priceEur && formatCurrency(parseFloat(product.priceEur), 'EUR')}
                        </p>
                        <p className="text-xs text-slate-500">Stock: {product.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Purchase History */}
          <Card>
            <CardHeader>
              <div className="space-y-4">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  {t('inventory:supplierPurchases')} ({filteredPurchases.length} of {supplierPurchases.length})
                </CardTitle>
                {supplierPurchases.length > 0 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search purchases by product name or SKU..."
                      value={purchaseSearch}
                      onChange={(e) => setPurchaseSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {supplierPurchases.length === 0 ? (
                <p className="text-slate-500">No purchase history yet.</p>
              ) : filteredPurchases.length === 0 ? (
                <p className="text-slate-500">No purchases match your search.</p>
              ) : (
                <div className="space-y-2">
                  {filteredPurchases.slice(0, 10).map((purchase) => (
                    <div
                      key={purchase.id}
                      className="p-3 border rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{purchase.productName}</p>
                          <p className="text-sm text-slate-500">
                            SKU: {purchase.sku || 'N/A'} • Qty: {purchase.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(parseFloat(purchase.importPrice), purchase.importCurrency)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {purchase.createdAt ? formatDate(purchase.createdAt) : ''}
                          </p>
                        </div>
                      </div>
                      {purchase.status && (
                        <Badge 
                          variant={purchase.status === 'delivered' ? 'default' : 'secondary'}
                          className="mt-2"
                        >
                          {purchase.status}
                        </Badge>
                      )}
                    </div>
                  ))}
                  {filteredPurchases.length > 10 && (
                    <p className="text-sm text-slate-500 text-center pt-2">
                      Showing latest 10 of {filteredPurchases.length} filtered purchases
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Files & Documents */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Files & Documents ({supplierFiles.length})
                </CardTitle>
                <ObjectUploader
                  maxNumberOfFiles={10}
                  maxFileSize={50 * 1024 * 1024} // 50MB
                  onGetUploadParameters={handleGetUploadParameters}
                  onComplete={handleUploadComplete}
                  buttonClassName="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Files
                </ObjectUploader>
              </div>
            </CardHeader>
            <CardContent>
              {supplierFiles.length === 0 ? (
                <p className="text-slate-500">No files uploaded yet.</p>
              ) : (
                <div className="space-y-2">
                  {supplierFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <File className="h-5 w-5 text-slate-400" />
                        <div>
                          <p className="font-medium">{file.fileName}</p>
                          <p className="text-sm text-slate-500">
                            {file.fileSize ? `${(file.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'} • 
                            {file.createdAt ? formatDate(file.createdAt) : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(file.fileUrl, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteFileMutation.mutate(file.id)}
                          disabled={deleteFileMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Stats & Notes */}
        <div className="space-y-6">
          {/* Purchase Stats */}
          <Card>
            <CardHeader>
              <CardTitle>{t('inventory:totalPurchases')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Purchased</p>
                  <p className="text-xl font-bold">
                    ${supplier.totalPurchased ? parseFloat(supplier.totalPurchased).toLocaleString() : "0"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Last Purchase</p>
                  <p className="font-medium">
                    {supplierPurchases.length > 0 && supplierPurchases[0].createdAt
                      ? formatDate(supplierPurchases[0].createdAt)
                      : supplier.lastPurchaseDate 
                        ? formatDate(supplier.lastPurchaseDate)
                        : "No purchases yet"
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Package className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Active Products</p>
                  <p className="text-xl font-bold">{supplierProducts.length}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Purchases</p>
                  <p className="text-xl font-bold">{supplierPurchases.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {supplier.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{supplier.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-slate-600">Supplier ID</p>
                  <p className="font-mono text-xs">{supplier.id}</p>
                </div>
                <div>
                  <p className="text-slate-600">Created</p>
                  <p>{supplier.createdAt ? formatDate(supplier.createdAt) : ''}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}