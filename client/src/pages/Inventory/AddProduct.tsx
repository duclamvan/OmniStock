import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Upload, Package, RotateCcw, Plus, Trash2, MoreHorizontal } from "lucide-react";
import { formatCurrency } from "@/lib/currencyUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const addProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  categoryId: z.string().optional(),
  warehouseId: z.string().optional(),
  supplierId: z.string().optional(),
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
});

export default function AddProduct() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [variants, setVariants] = useState<Array<{
    id: string;
    name: string;
    barcode: string;
    quantity: number;
    importCostUsd: string;
    importCostCzk: string;
    importCostEur: string;
  }>>([]);
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  const [seriesInput, setSeriesInput] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newVariant, setNewVariant] = useState({
    name: "",
    barcode: "",
    quantity: 0,
    importCostUsd: "",
    importCostCzk: "",
    importCostEur: "",
  });

  const form = useForm<z.infer<typeof addProductSchema>>({
    resolver: zodResolver(addProductSchema),
    defaultValues: {
      quantity: 0,
      lowStockAlert: 5,
    },
  });

  // Fetch categories, warehouses, and suppliers
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['/api/warehouses'],
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['/api/suppliers'],
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      // Upload image first if one was selected
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
      
      await apiRequest('POST', '/api/products', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Success",
        description: "Product created successfully",
      });
      setLocation('/inventory');
    },
    onError: (error) => {
      console.error("Product creation error:", error);
      toast({
        title: "Error",
        description: "Failed to create product",
        variant: "destructive",
      });
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

  const addVariant = () => {
    if (newVariant.name.trim()) {
      const variantWithId = {
        ...newVariant,
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: newVariant.name.trim(),
      };
      setVariants([...variants, variantWithId]);
      setNewVariant({
        name: "",
        barcode: "",
        quantity: 0,
        importCostUsd: "",
        importCostCzk: "",
        importCostEur: "",
      });
      setIsAddDialogOpen(false);
      toast({
        title: "Success",
        description: "Product variant added successfully",
      });
    }
  };

  const removeVariant = (id: string) => {
    setVariants(variants.filter(v => v.id !== id));
    setSelectedVariants(selectedVariants.filter(selectedId => selectedId !== id));
  };

  const addVariantSeries = () => {
    if (!seriesInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a series pattern",
        variant: "destructive",
      });
      return;
    }

    // Check if input contains pattern like "Product Name <1-100>"
    const match = seriesInput.match(/<(\d+)-(\d+)>/);
    if (match) {
      const start = parseInt(match[1]);
      const end = parseInt(match[2]);
      const baseName = seriesInput.replace(/<\d+-\d+>/, '').trim();
      
      if (end - start > 200) {
        toast({
          title: "Error",
          description: "Series range too large. Maximum 200 variants at once.",
          variant: "destructive",
        });
        return;
      }
      
      const newVariants = [];
      for (let i = start; i <= end; i++) {
        newVariants.push({
          id: `temp-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
          name: `${baseName} ${i}`,
          barcode: "",
          quantity: 0,
          importCostUsd: "",
          importCostCzk: "",
          importCostEur: "",
        });
      }
      
      setVariants([...variants, ...newVariants]);
      setSeriesInput("");
      setIsAddDialogOpen(false);
      toast({
        title: "Success",
        description: `Added ${newVariants.length} variants`,
      });
    } else {
      toast({
        title: "Error",
        description: "Use format like 'Gel Polish <1-100>' to create series",
        variant: "destructive",
      });
    }
  };

  const bulkDeleteVariants = () => {
    if (selectedVariants.length === 0) return;
    setVariants(variants.filter(v => !selectedVariants.includes(v.id)));
    setSelectedVariants([]);
    toast({
      title: "Success",
      description: `Deleted ${selectedVariants.length} variants`,
    });
  };

  const toggleSelectAll = () => {
    if (selectedVariants.length === variants.length) {
      setSelectedVariants([]);
    } else {
      setSelectedVariants(variants.map(v => v.id));
    }
  };

  const updateVariant = (id: string, field: string, value: string | number) => {
    setVariants(variants.map(v => 
      v.id === id ? { ...v, [field]: value } : v
    ));
  };

  const onSubmit = (data: z.infer<typeof addProductSchema>) => {
    // Check if product with same name and SKU exists for quantity update logic
    // This would be handled in the backend according to the requirements
    
    const productData = {
      ...data,
      // Convert empty strings to undefined for optional fields
      categoryId: data.categoryId || undefined,
      warehouseId: data.warehouseId || undefined,
      supplierId: data.supplierId || undefined,
      supplierLink: data.supplierLink || undefined,
      barcode: data.barcode || undefined,
    };

    createProductMutation.mutate(productData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Add New Product</h1>
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
                  {imageFile ? (
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
                      <span>Choose Image</span>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="categoryId">Category</Label>
                <Select value={form.watch('categoryId')} onValueChange={(value) => form.setValue('categoryId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
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
                <Select value={form.watch('warehouseId')} onValueChange={(value) => form.setValue('warehouseId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
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
                <Select value={form.watch('supplierId')} onValueChange={(value) => form.setValue('supplierId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
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
                placeholder="Product description..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Stock Information */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  {...form.register('quantity')}
                />
              </div>

              <div>
                <Label htmlFor="lowStockAlert">Low Stock Alert</Label>
                <Input
                  type="number"
                  min="0"
                  {...form.register('lowStockAlert')}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="barcode">Barcode (EAN-13)</Label>
              <Input
                {...form.register('barcode')}
                placeholder="Enter barcode or scan"
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing Information */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priceCzk">Price CZK</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register('priceCzk')}
                />
              </div>

              <div>
                <Label htmlFor="priceEur">Price EUR</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register('priceEur')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="importCostUsd">Import Cost USD</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register('importCostUsd')}
                />
              </div>

              <div>
                <Label htmlFor="importCostCzk">Import Cost CZK</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register('importCostCzk')}
                />
              </div>

              <div>
                <Label htmlFor="importCostEur">Import Cost EUR</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register('importCostEur')}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="supplierLink">Supplier Link</Label>
              <Input
                type="url"
                {...form.register('supplierLink')}
                placeholder="https://supplier-website.com/product"
              />
            </div>
          </CardContent>
        </Card>

        {/* Product Variants */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Product Variants</CardTitle>
            <div className="flex gap-2">
              {selectedVariants.length > 0 && (
                <Button type="button" variant="destructive" size="sm" onClick={bulkDeleteVariants}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedVariants.length})
                </Button>
              )}
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Variant
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Add Product Variants</DialogTitle>
                    <DialogDescription>
                      Add a single variant or create a series of variants
                    </DialogDescription>
                  </DialogHeader>
                  
                  {/* Series Creation Section */}
                  <div className="space-y-4 border-b pb-4">
                    <div className="space-y-2">
                      <Label htmlFor="series-input">Create Series</Label>
                      <div className="flex gap-2">
                        <Input
                          id="series-input"
                          value={seriesInput}
                          onChange={(e) => setSeriesInput(e.target.value)}
                          placeholder='e.g., "Gel Polish <1-100>"'
                          className="flex-1"
                        />
                        <Button 
                          onClick={addVariantSeries}
                          disabled={!seriesInput}
                          type="button"
                        >
                          Add Series
                        </Button>
                      </div>
                      <p className="text-xs text-slate-500">
                        For series: Use format like "Gel Polish &lt;1-100&gt;" to automatically create 100 variants
                      </p>
                    </div>
                  </div>

                  {/* Single Variant Section */}
                  <div className="space-y-4 pt-4">
                    <div className="text-sm font-medium text-slate-600">Or add a single variant:</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="variant-name">Variant Name</Label>
                        <Input
                          id="variant-name"
                          value={newVariant.name}
                          onChange={(e) =>
                            setNewVariant((prev) => ({ ...prev, name: e.target.value }))
                          }
                          placeholder="e.g., Size XL"
                        />
                      </div>
                      <div>
                        <Label htmlFor="variant-barcode">Barcode</Label>
                        <Input
                          id="variant-barcode"
                          value={newVariant.barcode}
                          onChange={(e) =>
                            setNewVariant((prev) => ({ ...prev, barcode: e.target.value }))
                          }
                          placeholder="123456789012"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="variant-quantity">Quantity</Label>
                      <Input
                        id="variant-quantity"
                        type="number"
                        value={newVariant.quantity}
                        onChange={(e) =>
                          setNewVariant((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))
                        }
                        placeholder="0"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="variant-cost-usd">Import Cost (USD)</Label>
                        <Input
                          id="variant-cost-usd"
                          value={newVariant.importCostUsd}
                          onChange={(e) =>
                            setNewVariant((prev) => ({ ...prev, importCostUsd: e.target.value }))
                          }
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="variant-cost-czk">Import Cost (CZK)</Label>
                        <Input
                          id="variant-cost-czk"
                          value={newVariant.importCostCzk}
                          onChange={(e) =>
                            setNewVariant((prev) => ({ ...prev, importCostCzk: e.target.value }))
                          }
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="variant-cost-eur">Import Cost (EUR)</Label>
                        <Input
                          id="variant-cost-eur"
                          value={newVariant.importCostEur}
                          onChange={(e) =>
                            setNewVariant((prev) => ({ ...prev, importCostEur: e.target.value }))
                          }
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={addVariant}
                      disabled={!newVariant.name.trim()}
                    >
                      Add Variant
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Variants Table */}
            {variants.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedVariants.length === variants.length && variants.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-sm text-slate-600">
                      {selectedVariants.length > 0 ? `${selectedVariants.length} selected` : `${variants.length} variants`}
                    </span>
                  </div>
                  {selectedVariants.length > 0 && (
                    <Button type="button" variant="destructive" size="sm" onClick={bulkDeleteVariants}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete ({selectedVariants.length})
                    </Button>
                  )}
                </div>

                <div className="border rounded-lg overflow-hidden overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedVariants.length === variants.length && variants.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="min-w-[200px]">Product Name</TableHead>
                        <TableHead>Barcode</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Import Cost (USD)</TableHead>
                        <TableHead>Import Cost (CZK)</TableHead>
                        <TableHead>Import Cost (EUR)</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variants.map((variant) => (
                        <TableRow key={variant.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedVariants.includes(variant.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedVariants([...selectedVariants, variant.id]);
                                } else {
                                  setSelectedVariants(selectedVariants.filter(id => id !== variant.id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="min-w-[200px]">
                            <Input
                              value={variant.name}
                              onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                              className="border-0 bg-transparent p-0 focus-visible:ring-0 w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={variant.barcode}
                              onChange={(e) => updateVariant(variant.id, 'barcode', e.target.value)}
                              className="border-0 bg-transparent p-0 focus-visible:ring-0"
                              placeholder="-"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={variant.quantity}
                              onChange={(e) => updateVariant(variant.id, 'quantity', parseInt(e.target.value) || 0)}
                              className="border-0 bg-transparent p-0 focus-visible:ring-0"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={variant.importCostUsd}
                              onChange={(e) => updateVariant(variant.id, 'importCostUsd', e.target.value)}
                              className="border-0 bg-transparent p-0 focus-visible:ring-0"
                              placeholder="$0.00"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={variant.importCostCzk}
                              onChange={(e) => updateVariant(variant.id, 'importCostCzk', e.target.value)}
                              className="border-0 bg-transparent p-0 focus-visible:ring-0"
                              placeholder="0,00 Kč"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={variant.importCostEur}
                              onChange={(e) => updateVariant(variant.id, 'importCostEur', e.target.value)}
                              className="border-0 bg-transparent p-0 focus-visible:ring-0"
                              placeholder="0,00 €"
                            />
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => removeVariant(variant.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => setLocation('/inventory')}>
            Cancel
          </Button>
          <Button type="submit" disabled={createProductMutation.isPending}>
            {createProductMutation.isPending ? 'Creating...' : 'Create Product'}
          </Button>
        </div>
      </form>
    </div>
  );
}
