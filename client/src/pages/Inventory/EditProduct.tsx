import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Save, RotateCcw, Upload, Trash2 } from "lucide-react";
import { Link } from "wouter";
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
import ProductVariants from "@/components/ProductVariants";
import ProductLocations from "@/components/ProductLocations";
import PackingInstructionsUploader from "@/components/PackingInstructionsUploader";
import ProductFiles from "@/components/ProductFiles";
import CostHistoryChart from "@/components/products/CostHistoryChart";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { TrendingUp, Euro } from "lucide-react";

const editProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  englishName: z.string().optional(),
  sku: z.string().min(1, "SKU is required"),
  categoryId: z.string().optional().or(z.literal("")),
  warehouseId: z.string().optional().or(z.literal("")),
  supplierId: z.string().optional().or(z.literal("")),
  description: z.string().optional(),
  quantity: z.coerce.number().min(0).default(0),
  lowStockAlert: z.coerce.number().min(0).default(5),
  priceCzk: z.coerce.number().min(0).optional(),
  priceEur: z.coerce.number().min(0).optional(),
  importCostUsd: z.coerce.number().min(0).optional(),
  importCostCzk: z.coerce.number().min(0).optional(),
  importCostEur: z.coerce.number().min(0).optional(),
  supplierLink: z.string().url().optional().or(z.literal("")),
  barcode: z.string().optional(),
  length: z.coerce.number().min(0).optional(),
  width: z.coerce.number().min(0).optional(),
  height: z.coerce.number().min(0).optional(),
  weight: z.coerce.number().min(0).optional(),
});

export default function EditProduct() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [packingInstructionsText, setPackingInstructionsText] = useState<string>("");
  const [packingInstructionsImage, setPackingInstructionsImage] = useState<string | null>(null);

  // Fetch product details
  const { data: product, isLoading: productLoading } = useQuery<any>({
    queryKey: ['/api/products', id],
    enabled: !!id,
  });

  // Fetch product cost history
  const { data: costHistory, isLoading: costHistoryLoading } = useQuery<any[]>({
    queryKey: [`/api/products/${id}/cost-history`],
    enabled: !!id,
  });

  // Fetch categories, warehouses, and suppliers
  const { data: categories } = useQuery<any[]>({
    queryKey: ['/api/categories'],
  });

  const { data: warehouses } = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
  });

  const { data: suppliers } = useQuery<any[]>({
    queryKey: ['/api/suppliers'],
  });

  const form = useForm<z.infer<typeof editProductSchema>>({
    resolver: zodResolver(editProductSchema),
    defaultValues: {
      quantity: 0,
      lowStockAlert: 5,
    },
  });

  // Update form when product data is loaded
  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name || '',
        englishName: product.englishName || '',
        sku: product.sku || '',
        categoryId: product.categoryId || '',
        warehouseId: product.warehouseId || '',
        supplierId: product.supplierId || '',
        description: product.description || '',
        quantity: product.quantity || 0,
        lowStockAlert: product.lowStockAlert || 5,
        priceCzk: product.priceCzk ? parseFloat(product.priceCzk) : undefined,
        priceEur: product.priceEur ? parseFloat(product.priceEur) : undefined,
        importCostUsd: product.importCostUsd ? parseFloat(product.importCostUsd) : undefined,
        importCostCzk: product.importCostCzk ? parseFloat(product.importCostCzk) : undefined,
        importCostEur: product.importCostEur ? parseFloat(product.importCostEur) : undefined,
        supplierLink: product.supplierLink || '',
        barcode: product.barcode || '',
        length: product.length ? parseFloat(product.length) : undefined,
        width: product.width ? parseFloat(product.width) : undefined,
        height: product.height ? parseFloat(product.height) : undefined,
        weight: product.weight ? parseFloat(product.weight) : undefined,
      });
      // Set packing instructions state
      setPackingInstructionsText(product.packingInstructionsText || "");
      setPackingInstructionsImage(product.packingInstructionsImage || null);
    }
  }, [product, form]);

  const updateProductMutation = useMutation({
    mutationFn: async (data: any) => {
      // Upload new image if one was selected
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image');
        }
        
        const { imageUrl } = await uploadResponse.json();
        data.imageUrl = imageUrl;
      }
      
      // Add packing instructions to the data
      data.packingInstructionsText = packingInstructionsText;
      data.packingInstructionsImage = packingInstructionsImage;
      
      await apiRequest('PATCH', `/api/products/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products', id] });
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      setLocation('/inventory');
    },
    onError: (error) => {
      console.error("Product update error:", error);
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
      setLocation('/inventory');
    },
    onError: (error: any) => {
      console.error("Product delete error:", error);
      // Check for 409 status code or constraint error message
      if (error.status === 409 || error.message?.includes('409') || error.message?.includes('constraint') || error.message?.includes('referenced')) {
        toast({
          title: "Cannot Delete Product",
          description: "This product is being used in existing orders and cannot be deleted.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete product. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const generateSKU = () => {
    const categoryName = categories?.find((c: any) => c.id === form.watch('categoryId'))?.name || 'PRODUCT';
    const productName = form.watch('name') || 'ITEM';
    
    // Create SKU from category and product name
    const categoryPart = categoryName.slice(0, 3).toUpperCase();
    const productPart = productName.slice(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    const baseSKU = `X-${categoryPart}-${productPart}`;
    form.setValue('sku', baseSKU);
  };

  const onSubmit = (data: z.infer<typeof editProductSchema>) => {
    const productData = {
      ...data,
      // Convert empty strings to undefined for optional fields
      categoryId: data.categoryId || undefined,
      warehouseId: data.warehouseId || undefined,
      supplierId: data.supplierId || undefined,
      supplierLink: data.supplierLink || undefined,
      barcode: data.barcode || undefined,
    };

    updateProductMutation.mutate(productData);
  };

  if (productLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Product not found</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Product not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/inventory">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Edit Product</h1>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Product Image Upload */}
            <div>
              <Label htmlFor="image">Product Image</Label>
              <div className="mt-2 flex items-center space-x-4">
                <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : imageFile ? (
                    <img
                      src={URL.createObjectURL(imageFile)}
                      alt="Preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Upload className="h-8 w-8 text-slate-400" />
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload">
                    <Button type="button" variant="outline" asChild>
                      <span>Change Image</span>
                    </Button>
                  </label>
                  <p className="text-sm text-slate-500 mt-1">
                    Images will be automatically compressed
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Product Name</Label>
                <Input
                  {...form.register('name')}
                  placeholder="Enter product name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="englishName">English Name</Label>
                <Input
                  {...form.register('englishName')}
                  placeholder="Enter English name (optional)"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sku">SKU</Label>
                <div className="flex space-x-2">
                  <Input
                    {...form.register('sku')}
                    placeholder="Enter SKU or auto-generate"
                  />
                  <Button type="button" variant="outline" onClick={generateSKU}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
                {form.formState.errors.sku && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.sku.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  {...form.register('barcode')}
                  placeholder="Enter barcode"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="categoryId">Category</Label>
                <Select value={form.watch('categoryId') || 'none'} onValueChange={(value) => form.setValue('categoryId', value === 'none' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories?.map((category: any) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="warehouseId">Warehouse</Label>
                <Select value={form.watch('warehouseId') || 'none'} onValueChange={(value) => form.setValue('warehouseId', value === 'none' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {warehouses?.map((warehouse: any) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="supplierId">Supplier</Label>
                <Select value={form.watch('supplierId') || 'none'} onValueChange={(value) => form.setValue('supplierId', value === 'none' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {suppliers?.map((supplier: any) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                {...form.register('description')}
                placeholder="Enter product description"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Inventory & Stock */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory & Stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Current Stock</Label>
                <Input
                  type="number"
                  {...form.register('quantity')}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="lowStockAlert">Low Stock Alert</Label>
                <Input
                  type="number"
                  {...form.register('lowStockAlert')}
                  placeholder="5"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Landing Costs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Landing Costs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Landing Cost */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg" data-testid="landing-cost-current">
              <div>
                <p className="text-sm text-muted-foreground">Current Landing Cost</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  <Euro className="h-5 w-5" />
                  {product?.latest_landing_cost ? parseFloat(product.latest_landing_cost).toFixed(2) : '0.00'}
                </p>
              </div>
              {product?.latest_landing_cost && product?.priceEur && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Margin</p>
                  <p className={`text-lg font-semibold ${
                    ((parseFloat(product.priceEur) - parseFloat(product.latest_landing_cost)) / parseFloat(product.priceEur) * 100) > 30
                      ? 'text-green-600'
                      : ((parseFloat(product.priceEur) - parseFloat(product.latest_landing_cost)) / parseFloat(product.priceEur) * 100) > 15
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}>
                    {((parseFloat(product.priceEur) - parseFloat(product.latest_landing_cost)) / parseFloat(product.priceEur) * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </div>

            {/* Cost History Chart */}
            {costHistory && costHistory.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3">Cost Trend</h4>
                <CostHistoryChart 
                  data-testid="cost-history-chart"
                  data={costHistory || []} 
                  isLoading={costHistoryLoading}
                  currency="€"
                  height={250}
                />
              </div>
            )}

            {/* Cost History Table */}
            <div>
              <h4 className="text-sm font-medium mb-3">Cost History</h4>
              {costHistoryLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : costHistory && costHistory.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table data-testid="cost-history-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Landing Cost/Unit</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {costHistory.slice(0, 10).map((history: any) => (
                        <TableRow key={history.id}>
                          <TableCell className="text-sm">
                            {format(new Date(history.computedAt), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            €{parseFloat(history.landingCostUnitBase).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-sm">
                            <Badge variant="outline" className="text-xs">
                              {history.method}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {history.source || history.method}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No cost history available</p>
                  <p className="text-sm mt-2">Landing costs will appear here after purchase orders are received</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dimensions & Weight */}
        <Card>
          <CardHeader>
            <CardTitle>Dimensions & Weight</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="length">Length (cm)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('length')}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="width">Width (cm)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('width')}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('height')}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.001"
                  {...form.register('weight')}
                  placeholder="0.000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priceCzk">Selling Price (CZK)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('priceCzk')}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="priceEur">Selling Price (EUR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('priceEur')}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="importCostUsd">Import Cost (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('importCostUsd')}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="importCostCzk">Import Cost (CZK)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('importCostCzk')}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="importCostEur">Import Cost (EUR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register('importCostEur')}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="supplierLink">Supplier Link</Label>
              <Input
                {...form.register('supplierLink')}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Packing Instructions */}
        <PackingInstructionsUploader
          packingInstructionsText={packingInstructionsText}
          packingInstructionsImage={packingInstructionsImage || ""}
          onTextChange={setPackingInstructionsText}
          onImageChange={setPackingInstructionsImage}
          productId={id}
        />

        {/* Product Locations */}
        {id && <ProductLocations productId={id} productName={product?.name} />}

        {/* Product Files */}
        {id && <ProductFiles productId={id} />}

        {/* Product Variants */}
        {id && <ProductVariants productId={id} />}

        {/* Action Buttons */}
        <div className="flex justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Product
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the product
                  "{product?.name}" and remove it from all inventory.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteProductMutation.mutate()}
                  disabled={deleteProductMutation.isPending}
                >
                  {deleteProductMutation.isPending ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <div className="flex space-x-4">
            <Link href="/inventory">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={updateProductMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateProductMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}