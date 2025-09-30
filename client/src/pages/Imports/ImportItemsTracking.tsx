import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/currencyUtils";
import { format } from "date-fns";
import { 
  Package,
  ArrowLeft,
  Search,
  Filter,
  Link2,
  Plus,
  Edit,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Hash,
  Calendar,
  Building2,
  MapPin,
  BarChart3,
  Eye,
  ShoppingCart,
  Archive,
  X
} from "lucide-react";

interface ImportItem {
  id: string;
  importOrderId: string;
  orderNumber: string;
  productName: string;
  sku?: string;
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
  totalCost: number;
  calculatedUnitCost?: number;
  status: string;
  productId?: string;
  inventoryAdded: boolean;
  receivedDate?: string;
  supplier?: string;
  warehouse?: string;
  estimatedArrival?: string;
  notes?: string;
}

export default function ImportItemsTracking() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ImportItem | null>(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [createNewProduct, setCreateNewProduct] = useState(false);
  const [newProductData, setNewProductData] = useState({
    name: "",
    sku: "",
    category: "",
    price: "",
    cost: ""
  });

  // Fetch all import items
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['/api/import-items'],
    queryFn: async () => {
      // This would fetch all import items across all orders
      const response = await fetch('/api/import-items');
      if (!response.ok) throw new Error('Failed to fetch import items');
      return response.json();
    }
  });

  // Fetch products for linking
  const { data: products = [] } = useQuery({
    queryKey: ['/api/products'],
  });

  // Link item to product
  const linkToProductMutation = useMutation({
    mutationFn: async (data: { itemId: string; productId: string }) => {
      return apiRequest('POST', `/api/import-items/${data.itemId}/link-product`, {
        productId: data.productId
      });
    },
    onSuccess: () => {
      toast({
        title: "Product Linked",
        description: "Import item has been linked to inventory product."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/import-items'] });
      setLinkDialogOpen(false);
      setSelectedItem(null);
    }
  });

  // Create new product and link
  const createAndLinkMutation = useMutation({
    mutationFn: async (data: { itemId: string; productData: any }) => {
      return apiRequest('POST', `/api/import-items/${data.itemId}/create-and-link`, {
        productData: data.productData
      });
    },
    onSuccess: () => {
      toast({
        title: "Product Created & Linked",
        description: "New product created and linked to import item."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/import-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setLinkDialogOpen(false);
      setSelectedItem(null);
      setCreateNewProduct(false);
    }
  });

  // Filter items
  const filteredItems = items.filter((item: ImportItem) => {
    const matchesSearch = 
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.orderNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesSupplier = supplierFilter === "all" || item.supplier === supplierFilter;
    
    return matchesSearch && matchesStatus && matchesSupplier;
  });

  // Group items by status
  const pendingItems = filteredItems.filter((i: ImportItem) => i.status === "pending");
  const receivedItems = filteredItems.filter((i: ImportItem) => i.status === "received");
  const partialItems = filteredItems.filter((i: ImportItem) => i.status === "partial");
  const linkedItems = filteredItems.filter((i: ImportItem) => i.productId);

  // Calculate stats
  const totalItems = items.length;
  const totalValue = items.reduce((sum: number, item: ImportItem) => sum + item.totalCost, 0);
  const avgProcessingTime = 7; // Would calculate from actual data
  const linkedPercentage = items.length > 0 ? (linkedItems.length / items.length) * 100 : 0;

  const handleLinkProduct = () => {
    if (selectedItem) {
      if (createNewProduct) {
        createAndLinkMutation.mutate({
          itemId: selectedItem.id,
          productData: {
            ...newProductData,
            name: newProductData.name || selectedItem.productName,
            sku: newProductData.sku || selectedItem.sku,
            cost: selectedItem.calculatedUnitCost || selectedItem.unitCost
          }
        });
      } else if (selectedProductId) {
        linkToProductMutation.mutate({
          itemId: selectedItem.id,
          productId: selectedProductId
        });
      }
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b md:relative md:border-0">
        <div className="flex items-center justify-between p-4 md:p-0">
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/imports">
              <Button variant="ghost" size="icon" className="md:hidden">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" className="hidden md:flex">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Imports
              </Button>
            </Link>
            <div>
              <h1 className="text-lg md:text-2xl font-semibold">Import Items Tracking</h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Track all import items across orders
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 px-4 md:px-0">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total Items</p>
                <p className="text-xl md:text-2xl font-bold">{totalItems}</p>
              </div>
              <Package className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total Value</p>
                <p className="text-xl md:text-2xl font-bold">
                  {formatCurrency(totalValue, 'USD')}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Avg Processing</p>
                <p className="text-xl md:text-2xl font-bold">{avgProcessingTime} days</p>
              </div>
              <Clock className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Linked Items</p>
                <p className="text-xl md:text-2xl font-bold">{linkedPercentage.toFixed(0)}%</p>
              </div>
              <Link2 className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mx-4 md:mx-0">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by product, SKU, or order..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
              </SelectContent>
            </Select>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {/* Add dynamic suppliers */}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="all" className="px-4 md:px-0">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            All ({filteredItems.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingItems.length})
          </TabsTrigger>
          <TabsTrigger value="received">
            Received ({receivedItems.length})
          </TabsTrigger>
          <TabsTrigger value="linked">
            Linked ({linkedItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No import items found</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Mobile View - Cards */}
              <div className="md:hidden space-y-3">
                {filteredItems.map((item: ImportItem) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm line-clamp-2">{item.productName}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.sku && `SKU: ${item.sku} • `}
                              Order: {item.orderNumber}
                            </p>
                          </div>
                          <Badge variant={item.status === 'received' ? 'default' : 'secondary'}>
                            {item.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-muted-foreground">Quantity</p>
                            <p className="font-medium">
                              {item.receivedQuantity}/{item.quantity}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Unit Cost</p>
                            <p className="font-medium">
                              {formatCurrency(item.calculatedUnitCost || item.unitCost, 'USD')}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Total Cost</p>
                            <p className="font-medium">
                              {formatCurrency(item.totalCost, 'USD')}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Inventory</p>
                            <p className="font-medium">
                              {item.productId ? (
                                <Badge variant="outline" className="text-xs">
                                  <Link2 className="h-3 w-3 mr-1" />
                                  Linked
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">Not linked</span>
                              )}
                            </p>
                          </div>
                        </div>

                        {item.estimatedArrival && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            ETA: {format(new Date(item.estimatedArrival), 'MMM d, yyyy')}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              setSelectedItem(item);
                              setLinkDialogOpen(true);
                            }}
                            disabled={!!item.productId}
                          >
                            {item.productId ? 'Already Linked' : 'Link to Product'}
                          </Button>
                          <Link href={`/imports/orders/${item.importOrderId}`}>
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop View - Table */}
              <div className="hidden md:block">
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Order #</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Total Cost</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Inventory</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item: ImportItem) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.productName}</p>
                              {item.sku && (
                                <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Link href={`/imports/orders/${item.importOrderId}`}>
                              <Button variant="link" size="sm" className="p-0 h-auto">
                                {item.orderNumber}
                              </Button>
                            </Link>
                          </TableCell>
                          <TableCell>{item.supplier || '-'}</TableCell>
                          <TableCell className="text-right">
                            {item.receivedQuantity}/{item.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.calculatedUnitCost || item.unitCost, 'USD')}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.totalCost, 'USD')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.status === 'received' ? 'default' : 'secondary'}>
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.productId ? (
                              <Badge variant="outline">
                                <Link2 className="h-3 w-3 mr-1" />
                                Linked
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setLinkDialogOpen(true);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Link
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/imports/orders/${item.importOrderId}`}>
                              <Button size="sm" variant="ghost">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {/* Similar content for pending items */}
        </TabsContent>

        <TabsContent value="received" className="space-y-4">
          {/* Similar content for received items */}
        </TabsContent>

        <TabsContent value="linked" className="space-y-4">
          {/* Similar content for linked items */}
        </TabsContent>
      </Tabs>

      {/* Link to Product Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link to Inventory Product</DialogTitle>
            <DialogDescription>
              Link this import item to an existing product or create a new one
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="font-medium text-sm">{selectedItem.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedItem.sku && `SKU: ${selectedItem.sku}`}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="existing"
                    checked={!createNewProduct}
                    onChange={() => setCreateNewProduct(false)}
                  />
                  <Label htmlFor="existing">Link to existing product</Label>
                </div>

                {!createNewProduct && (
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product: any) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} {product.sku && `(${product.sku})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="new"
                    checked={createNewProduct}
                    onChange={() => setCreateNewProduct(true)}
                  />
                  <Label htmlFor="new">Create new product</Label>
                </div>

                {createNewProduct && (
                  <div className="space-y-3 pl-6">
                    <div>
                      <Label className="text-xs">Product Name</Label>
                      <Input
                        value={newProductData.name}
                        onChange={(e) => setNewProductData({...newProductData, name: e.target.value})}
                        placeholder={selectedItem.productName}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">SKU</Label>
                      <Input
                        value={newProductData.sku}
                        onChange={(e) => setNewProductData({...newProductData, sku: e.target.value})}
                        placeholder={selectedItem.sku || 'Enter SKU'}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Category</Label>
                      <Input
                        value={newProductData.category}
                        onChange={(e) => setNewProductData({...newProductData, category: e.target.value})}
                        placeholder="Enter category"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Selling Price</Label>
                      <Input
                        type="number"
                        value={newProductData.price}
                        onChange={(e) => setNewProductData({...newProductData, price: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setLinkDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleLinkProduct}
                  disabled={(!createNewProduct && !selectedProductId) || 
                    linkToProductMutation.isPending || 
                    createAndLinkMutation.isPending}
                  className="flex-1"
                >
                  {createNewProduct ? 'Create & Link' : 'Link Product'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}