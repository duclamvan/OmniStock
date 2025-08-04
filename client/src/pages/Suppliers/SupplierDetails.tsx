import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Supplier, Product, Purchase } from "@shared/schema";
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
  TrendingUp
} from "lucide-react";
import { formatCurrency } from "@/lib/currencyUtils";

export default function SupplierDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

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

  // Filter products by this supplier
  const supplierProducts = products.filter(p => p.supplierId === id && p.isActive);
  
  // Filter purchases by this supplier
  const supplierPurchases = purchases.filter(p => 
    p.supplierName?.toLowerCase() === supplier?.name?.toLowerCase()
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!supplier) {
    return <div>Supplier not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/suppliers")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">{supplier.name}</h1>
        </div>
        <Button onClick={() => setLocation(`/suppliers/${id}/edit`)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit Supplier
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {supplier.contactPerson && (
                <div>
                  <p className="text-sm text-slate-600 mb-1">Contact Person</p>
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
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Products from this Supplier ({supplierProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {supplierProducts.length === 0 ? (
                <p className="text-slate-500">No products from this supplier yet.</p>
              ) : (
                <div className="space-y-1">
                  {supplierProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 cursor-pointer text-sm"
                      onClick={() => setLocation(`/inventory/${product.id}`)}
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
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Purchase History ({supplierPurchases.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {supplierPurchases.length === 0 ? (
                <p className="text-slate-500">No purchase history yet.</p>
              ) : (
                <div className="space-y-2">
                  {supplierPurchases.slice(0, 10).map((purchase) => (
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
                            {purchase.createdAt ? new Date(purchase.createdAt).toLocaleDateString() : ''}
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
                  {supplierPurchases.length > 10 && (
                    <p className="text-sm text-slate-500 text-center pt-2">
                      Showing latest 10 of {supplierPurchases.length} purchases
                    </p>
                  )}
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
              <CardTitle>Purchase Statistics</CardTitle>
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
                      ? new Date(supplierPurchases[0].createdAt).toLocaleDateString()
                      : supplier.lastPurchaseDate 
                        ? new Date(supplier.lastPurchaseDate).toLocaleDateString()
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
                  <p>{supplier.createdAt ? new Date(supplier.createdAt).toLocaleString() : ''}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}