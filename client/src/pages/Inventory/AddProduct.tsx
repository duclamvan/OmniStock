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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Upload, Package, RotateCcw } from "lucide-react";

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
  const [variants, setVariants] = useState<string[]>([]);
  const [newVariant, setNewVariant] = useState("");

  const form = useForm<z.infer<typeof addProductSchema>>({
    resolver: zodResolver(addProductSchema),
    defaultValues: {
      quantity: 0,
      lowStockAlert: 5,
    },
  });

  // Fetch categories, warehouses, and suppliers
  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
  });

  const { data: warehouses } = useQuery({
    queryKey: ['/api/warehouses'],
  });

  const { data: suppliers } = useQuery({
    queryKey: ['/api/suppliers'],
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
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
    if (newVariant.trim()) {
      setVariants([...variants, newVariant.trim()]);
      setNewVariant("");
    }
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const addVariantSeries = () => {
    const name = form.watch('name');
    if (!name) {
      toast({
        title: "Error",
        description: "Please enter a product name first",
        variant: "destructive",
      });
      return;
    }

    // Check if name contains pattern like "Product Name <1-100>"
    const match = name.match(/<(\d+)-(\d+)>/);
    if (match) {
      const start = parseInt(match[1]);
      const end = parseInt(match[2]);
      const baseName = name.replace(/<\d+-\d+>/, '').trim();
      
      const newVariants = [];
      for (let i = start; i <= end; i++) {
        newVariants.push(`${baseName} ${i}`);
      }
      
      setVariants([...variants, ...newVariants]);
      toast({
        title: "Success",
        description: `Added ${newVariants.length} variants`,
      });
    } else {
      toast({
        title: "Error",
        description: "Product name should contain range pattern like 'Product Name <1-100>'",
        variant: "destructive",
      });
    }
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
          <CardHeader>
            <CardTitle>Product Variants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                value={newVariant}
                onChange={(e) => setNewVariant(e.target.value)}
                placeholder="Enter variant name"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addVariant())}
              />
              <Button type="button" variant="outline" onClick={addVariant}>
                Add Variant
              </Button>
              <Button type="button" variant="outline" onClick={addVariantSeries}>
                Add Series
              </Button>
            </div>

            <div className="text-sm text-slate-600">
              <p>For series: Use format like "Gel Polish &lt;1-100&gt;" to automatically create 100 variants</p>
            </div>

            {variants.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Variants ({variants.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {variants.map((variant, index) => (
                    <div key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                      <span className="text-sm">{variant}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariant(index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
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
