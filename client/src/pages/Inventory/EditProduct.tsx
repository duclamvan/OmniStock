import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCountryFlag, getCountryNameByCode } from "@/lib/countries";
import { ArrowLeft, Save, RotateCcw, Upload, Trash2, Plus, Pencil, Euro, TrendingUp, DollarSign } from "lucide-react";
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
import { format } from "date-fns";

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
  priceUsd: z.coerce.number().min(0).optional(),
  priceVnd: z.coerce.number().min(0).optional(),
  priceCny: z.coerce.number().min(0).optional(),
  importCostUsd: z.coerce.number().min(0).optional(),
  importCostCzk: z.coerce.number().min(0).optional(),
  importCostEur: z.coerce.number().min(0).optional(),
  supplierLink: z.string().url().optional().or(z.literal("")),
  barcode: z.string().optional(),
  length: z.coerce.number().min(0).optional(),
  width: z.coerce.number().min(0).optional(),
  height: z.coerce.number().min(0).optional(),
  weight: z.coerce.number().min(0).optional(),
  warehouseLocation: z.string().optional(),
  packingMaterialId: z.string().optional().or(z.literal("")),
});

const tieredPricingSchema = z.object({
  minQuantity: z.coerce.number().min(1, "Minimum quantity is required"),
  maxQuantity: z.coerce.number().optional(),
  priceCzk: z.coerce.number().min(0).optional(),
  priceEur: z.coerce.number().min(0).optional(),
  priceUsd: z.coerce.number().min(0).optional(),
  priceVnd: z.coerce.number().min(0).optional(),
  priceCny: z.coerce.number().min(0).optional(),
  priceType: z.enum(['tiered', 'wholesale']).default('tiered'),
}).refine((data) => {
  return data.priceCzk || data.priceEur || data.priceUsd || data.priceVnd || data.priceCny;
}, {
  message: "At least one price must be specified",
  path: ["priceCzk"],
});

export default function EditProduct() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [packingInstructionsText, setPackingInstructionsText] = useState<string>("");
  const [packingInstructionsImage, setPackingInstructionsImage] = useState<string | null>(null);
  const [tieredPricingDialogOpen, setTieredPricingDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<any>(null);

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

  // Fetch tiered pricing
  const { data: tieredPricing = [], isLoading: tieredPricingLoading } = useQuery<any[]>({
    queryKey: ['/api/products', id, 'tiered-pricing'],
    enabled: !!id,
  });

  // Fetch categories, warehouses, suppliers, and packing materials
  const { data: categories } = useQuery<any[]>({
    queryKey: ['/api/categories'],
  });

  const { data: warehouses } = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
  });

  const { data: suppliers } = useQuery<any[]>({
    queryKey: ['/api/suppliers'],
  });

  const { data: packingMaterials } = useQuery<any[]>({
    queryKey: ['/api/packing-materials'],
  });

  const form = useForm<z.infer<typeof editProductSchema>>({
    resolver: zodResolver(editProductSchema),
    defaultValues: {
      quantity: 0,
      lowStockAlert: 5,
    },
  });

  const tierForm = useForm<z.infer<typeof tieredPricingSchema>>({
    resolver: zodResolver(tieredPricingSchema),
    defaultValues: {
      priceType: 'tiered',
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
        priceUsd: product.priceUsd ? parseFloat(product.priceUsd) : undefined,
        priceVnd: product.priceVnd ? parseFloat(product.priceVnd) : undefined,
        priceCny: product.priceCny ? parseFloat(product.priceCny) : undefined,
        importCostUsd: product.importCostUsd ? parseFloat(product.importCostUsd) : undefined,
        importCostCzk: product.importCostCzk ? parseFloat(product.importCostCzk) : undefined,
        importCostEur: product.importCostEur ? parseFloat(product.importCostEur) : undefined,
        supplierLink: product.supplierLink || '',
        barcode: product.barcode || '',
        length: product.length ? parseFloat(product.length) : undefined,
        width: product.width ? parseFloat(product.width) : undefined,
        height: product.height ? parseFloat(product.height) : undefined,
        weight: product.weight ? parseFloat(product.weight) : undefined,
        warehouseLocation: product.warehouseLocation || '',
        packingMaterialId: product.packingMaterialId || '',
      });
      setPackingInstructionsText(product.packingInstructionsText || "");
      setPackingInstructionsImage(product.packingInstructionsImage || null);
    }
  }, [product, form]);

  const updateProductMutation = useMutation({
    mutationFn: async (data: any) => {
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

  const createTieredPricingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof tieredPricingSchema>) => {
      await apiRequest('POST', `/api/products/${id}/tiered-pricing`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', id, 'tiered-pricing'] });
      toast({
        title: "Success",
        description: "Tiered pricing added successfully",
      });
      setTieredPricingDialogOpen(false);
      tierForm.reset();
    },
    onError: (error) => {
      console.error("Create tiered pricing error:", error);
      toast({
        title: "Error",
        description: "Failed to add tiered pricing",
        variant: "destructive",
      });
    },
  });

  const updateTieredPricingMutation = useMutation({
    mutationFn: async ({ tierId, data }: { tierId: string; data: z.infer<typeof tieredPricingSchema> }) => {
      await apiRequest('PATCH', `/api/products/tiered-pricing/${tierId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', id, 'tiered-pricing'] });
      toast({
        title: "Success",
        description: "Tiered pricing updated successfully",
      });
      setTieredPricingDialogOpen(false);
      setEditingTier(null);
      tierForm.reset();
    },
    onError: (error) => {
      console.error("Update tiered pricing error:", error);
      toast({
        title: "Error",
        description: "Failed to update tiered pricing",
        variant: "destructive",
      });
    },
  });

  const deleteTieredPricingMutation = useMutation({
    mutationFn: async (tierId: string) => {
      await apiRequest('DELETE', `/api/products/tiered-pricing/${tierId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', id, 'tiered-pricing'] });
      toast({
        title: "Success",
        description: "Tiered pricing deleted successfully",
      });
    },
    onError: (error) => {
      console.error("Delete tiered pricing error:", error);
      toast({
        title: "Error",
        description: "Failed to delete tiered pricing",
        variant: "destructive",
      });
    },
  });

  const generateSKU = () => {
    const categoryName = categories?.find((c: any) => c.id === form.watch('categoryId'))?.name || 'PRODUCT';
    const productName = form.watch('name') || 'ITEM';
    
    const categoryPart = categoryName.slice(0, 3).toUpperCase();
    const productPart = productName.slice(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    const baseSKU = `X-${categoryPart}-${productPart}`;
    form.setValue('sku', baseSKU);
  };

  const onSubmit = (data: z.infer<typeof editProductSchema>) => {
    const productData = {
      ...data,
      quantity: Number(data.quantity),
      lowStockAlert: Number(data.lowStockAlert),
      priceCzk: data.priceCzk ? parseFloat(data.priceCzk.toString()) : undefined,
      priceEur: data.priceEur ? parseFloat(data.priceEur.toString()) : undefined,
      priceUsd: data.priceUsd ? parseFloat(data.priceUsd.toString()) : undefined,
      priceVnd: data.priceVnd ? parseFloat(data.priceVnd.toString()) : undefined,
      priceCny: data.priceCny ? parseFloat(data.priceCny.toString()) : undefined,
      importCostUsd: data.importCostUsd ? parseFloat(data.importCostUsd.toString()) : undefined,
      importCostCzk: data.importCostCzk ? parseFloat(data.importCostCzk.toString()) : undefined,
      importCostEur: data.importCostEur ? parseFloat(data.importCostEur.toString()) : undefined,
      length: data.length ? parseFloat(data.length.toString()) : undefined,
      width: data.width ? parseFloat(data.width.toString()) : undefined,
      height: data.height ? parseFloat(data.height.toString()) : undefined,
      weight: data.weight ? parseFloat(data.weight.toString()) : undefined,
      categoryId: data.categoryId || undefined,
      warehouseId: data.warehouseId || undefined,
      supplierId: data.supplierId || undefined,
      supplierLink: data.supplierLink || undefined,
      barcode: data.barcode || undefined,
      warehouseLocation: data.warehouseLocation || undefined,
      packingMaterialId: data.packingMaterialId || undefined,
    };

    updateProductMutation.mutate(productData);
  };

  const openAddTierDialog = () => {
    setEditingTier(null);
    tierForm.reset({
      priceType: 'tiered',
    });
    setTieredPricingDialogOpen(true);
  };

  const openEditTierDialog = (tier: any) => {
    setEditingTier(tier);
    tierForm.reset({
      minQuantity: tier.minQuantity,
      maxQuantity: tier.maxQuantity || undefined,
      priceCzk: tier.priceCzk ? parseFloat(tier.priceCzk) : undefined,
      priceEur: tier.priceEur ? parseFloat(tier.priceEur) : undefined,
      priceUsd: tier.priceUsd ? parseFloat(tier.priceUsd) : undefined,
      priceVnd: tier.priceVnd ? parseFloat(tier.priceVnd) : undefined,
      priceCny: tier.priceCny ? parseFloat(tier.priceCny) : undefined,
      priceType: tier.priceType || 'tiered',
    });
    setTieredPricingDialogOpen(true);
  };

  const handleAddTier = (data: z.infer<typeof tieredPricingSchema>) => {
    const tierData = {
      productId: id,
      minQuantity: Number(data.minQuantity),
      maxQuantity: data.maxQuantity ? Number(data.maxQuantity) : undefined,
      priceCzk: data.priceCzk ? parseFloat(data.priceCzk.toString()) : undefined,
      priceEur: data.priceEur ? parseFloat(data.priceEur.toString()) : undefined,
      priceUsd: data.priceUsd ? parseFloat(data.priceUsd.toString()) : undefined,
      priceVnd: data.priceVnd ? parseFloat(data.priceVnd.toString()) : undefined,
      priceCny: data.priceCny ? parseFloat(data.priceCny.toString()) : undefined,
      priceType: data.priceType
    };
    
    const cleanData = Object.fromEntries(
      Object.entries(tierData).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    
    createTieredPricingMutation.mutate(cleanData);
  };

  const handleUpdateTier = (tierId: string, data: z.infer<typeof tieredPricingSchema>) => {
    const tierData = {
      minQuantity: Number(data.minQuantity),
      maxQuantity: data.maxQuantity ? Number(data.maxQuantity) : undefined,
      priceCzk: data.priceCzk ? parseFloat(data.priceCzk.toString()) : undefined,
      priceEur: data.priceEur ? parseFloat(data.priceEur.toString()) : undefined,
      priceUsd: data.priceUsd ? parseFloat(data.priceUsd.toString()) : undefined,
      priceVnd: data.priceVnd ? parseFloat(data.priceVnd.toString()) : undefined,
      priceCny: data.priceCny ? parseFloat(data.priceCny.toString()) : undefined,
      priceType: data.priceType
    };
    
    const cleanData = Object.fromEntries(
      Object.entries(tierData).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    
    updateTieredPricingMutation.mutate({ tierId, data: cleanData });
  };

  const onTierSubmit = (data: z.infer<typeof tieredPricingSchema>) => {
    if (editingTier) {
      handleUpdateTier(editingTier.id, data);
    } else {
      handleAddTier(data);
    }
  };

  const selectedSupplier = suppliers?.find((s: any) => s.id === form.watch('supplierId'));

  if (productLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Skeleton className="h-8 w-64" />
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
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Edit Product</h1>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic" data-testid="tab-basic">Basic Info</TabsTrigger>
            <TabsTrigger value="pricing" data-testid="tab-pricing">Pricing</TabsTrigger>
            <TabsTrigger value="supplier" data-testid="tab-supplier">Import & Supplier</TabsTrigger>
            <TabsTrigger value="inventory" data-testid="tab-inventory">Inventory</TabsTrigger>
          </TabsList>

          {/* Tab 1: Basic Info */}
          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Product name, SKU, category, and description</CardDescription>
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
                          data-testid="img-product"
                        />
                      ) : imageFile ? (
                        <img
                          src={URL.createObjectURL(imageFile)}
                          alt="Preview"
                          className="w-full h-full object-cover rounded-lg"
                          data-testid="img-product-preview"
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
                        data-testid="input-image"
                      />
                      <label htmlFor="image-upload">
                        <Button type="button" variant="outline" asChild data-testid="button-change-image">
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
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      {...form.register('name')}
                      placeholder="Enter product name"
                      data-testid="input-name"
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
                      data-testid="input-english-name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sku">SKU *</Label>
                    <div className="flex space-x-2">
                      <Input
                        {...form.register('sku')}
                        placeholder="Enter SKU or auto-generate"
                        data-testid="input-sku"
                      />
                      <Button type="button" variant="outline" onClick={generateSKU} data-testid="button-generate-sku">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                    {form.formState.errors.sku && (
                      <p className="text-sm text-red-600 mt-1">{form.formState.errors.sku.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="categoryId">Category</Label>
                    <Select value={form.watch('categoryId') || 'none'} onValueChange={(value) => form.setValue('categoryId', value === 'none' ? '' : value)}>
                      <SelectTrigger data-testid="select-category">
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
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    {...form.register('description')}
                    placeholder="Enter product description"
                    rows={3}
                    data-testid="textarea-description"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Pricing & Tiered Pricing */}
          <TabsContent value="pricing" className="space-y-4">
            {/* Standard Prices */}
            <Card>
              <CardHeader>
                <CardTitle>Standard Prices</CardTitle>
                <CardDescription>Set regular selling prices for different currencies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priceCzk">Price (CZK)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register('priceCzk')}
                      placeholder="0.00"
                      data-testid="input-price-czk"
                    />
                  </div>

                  <div>
                    <Label htmlFor="priceEur">Price (EUR)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register('priceEur')}
                      placeholder="0.00"
                      data-testid="input-price-eur"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="priceUsd">Price (USD)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register('priceUsd')}
                      placeholder="0.00"
                      data-testid="input-price-usd"
                    />
                  </div>

                  <div>
                    <Label htmlFor="priceVnd">Price (VND)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register('priceVnd')}
                      placeholder="0.00"
                      data-testid="input-price-vnd"
                    />
                  </div>

                  <div>
                    <Label htmlFor="priceCny">Price (CNY)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register('priceCny')}
                      placeholder="0.00"
                      data-testid="input-price-cny"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tiered Pricing */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tiered Pricing</CardTitle>
                    <CardDescription>Set different prices based on order quantity</CardDescription>
                  </div>
                  <Button type="button" onClick={openAddTierDialog} data-testid="button-add-tier">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tier
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {tieredPricingLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : tieredPricing.length > 0 ? (
                  <Table data-testid="table-tiered-pricing">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Min Qty</TableHead>
                        <TableHead>Max Qty</TableHead>
                        <TableHead>Price CZK</TableHead>
                        <TableHead>Price EUR</TableHead>
                        <TableHead>Price USD</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tieredPricing.map((tier: any) => (
                        <TableRow key={tier.id} data-testid={`row-tier-${tier.id}`}>
                          <TableCell>{tier.minQuantity}</TableCell>
                          <TableCell>{tier.maxQuantity || '∞'}</TableCell>
                          <TableCell>{tier.priceCzk ? `${parseFloat(tier.priceCzk).toFixed(2)}` : '-'}</TableCell>
                          <TableCell>{tier.priceEur ? `${parseFloat(tier.priceEur).toFixed(2)}` : '-'}</TableCell>
                          <TableCell>{tier.priceUsd ? `${parseFloat(tier.priceUsd).toFixed(2)}` : '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{tier.priceType}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditTierDialog(tier)}
                                data-testid={`button-edit-tier-${tier.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteTieredPricingMutation.mutate(tier.id)}
                                data-testid={`button-delete-tier-${tier.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No tiered pricing set</p>
                    <p className="text-sm mt-2">Click "Add Tier" to create quantity-based pricing</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Import Cost & Supplier */}
          <TabsContent value="supplier" className="space-y-4">
            {/* Supplier */}
            <Card>
              <CardHeader>
                <CardTitle>Supplier</CardTitle>
                <CardDescription>Select supplier and add supplier link</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="supplierId">Supplier</Label>
                  <Select value={form.watch('supplierId') || 'none'} onValueChange={(value) => form.setValue('supplierId', value === 'none' ? '' : value)}>
                    <SelectTrigger data-testid="select-supplier">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {suppliers?.map((supplier: any) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {getCountryFlag(supplier.country || '')} {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSupplier && (
                    <div className="mt-2 p-3 bg-muted rounded-lg" data-testid="supplier-info">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getCountryFlag(selectedSupplier.country || '')}</span>
                        <div>
                          <p className="font-medium">{selectedSupplier.name}</p>
                          {selectedSupplier.country && (
                            <p className="text-sm text-muted-foreground">
                              {getCountryNameByCode(selectedSupplier.country)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="supplierLink">Supplier Link</Label>
                  <Input
                    {...form.register('supplierLink')}
                    placeholder="https://..."
                    data-testid="input-supplier-link"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Import Costs */}
            <Card>
              <CardHeader>
                <CardTitle>Import Costs</CardTitle>
                <CardDescription>Set import/purchase costs for this product</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="importCostUsd">Import Cost (USD)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register('importCostUsd')}
                      placeholder="0.00"
                      data-testid="input-import-cost-usd"
                    />
                  </div>

                  <div>
                    <Label htmlFor="importCostCzk">Import Cost (CZK)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register('importCostCzk')}
                      placeholder="0.00"
                      data-testid="input-import-cost-czk"
                    />
                  </div>

                  <div>
                    <Label htmlFor="importCostEur">Import Cost (EUR)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register('importCostEur')}
                      placeholder="0.00"
                      data-testid="input-import-cost-eur"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Latest Landing Cost */}
            {product?.latestLandingCost && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Latest Landing Cost
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg" data-testid="landing-cost-current">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Landing Cost</p>
                      <p className="text-2xl font-bold flex items-center gap-1">
                        <Euro className="h-5 w-5" />
                        {parseFloat(product.latestLandingCost).toFixed(2)}
                      </p>
                    </div>
                    {product.priceEur && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Margin</p>
                        <p className={`text-lg font-semibold ${
                          ((parseFloat(product.priceEur) - parseFloat(product.latestLandingCost)) / parseFloat(product.priceEur) * 100) > 30
                            ? 'text-green-600'
                            : ((parseFloat(product.priceEur) - parseFloat(product.latestLandingCost)) / parseFloat(product.priceEur) * 100) > 15
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}>
                          {((parseFloat(product.priceEur) - parseFloat(product.latestLandingCost)) / parseFloat(product.priceEur) * 100).toFixed(1)}%
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab 4: Inventory & Location */}
          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Inventory & Stock</CardTitle>
                <CardDescription>Manage stock levels and warehouse location</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Current Stock</Label>
                    <Input
                      type="number"
                      {...form.register('quantity')}
                      placeholder="0"
                      data-testid="input-quantity"
                    />
                  </div>

                  <div>
                    <Label htmlFor="lowStockAlert">Low Stock Alert</Label>
                    <Input
                      type="number"
                      {...form.register('lowStockAlert')}
                      placeholder="5"
                      data-testid="input-low-stock-alert"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="warehouseId">Warehouse</Label>
                    <Select value={form.watch('warehouseId') || 'none'} onValueChange={(value) => form.setValue('warehouseId', value === 'none' ? '' : value)}>
                      <SelectTrigger data-testid="select-warehouse">
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
                    <Label htmlFor="warehouseLocation">Warehouse Location</Label>
                    <Input
                      {...form.register('warehouseLocation')}
                      placeholder="e.g., A-01-02"
                      data-testid="input-warehouse-location"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input
                    {...form.register('barcode')}
                    placeholder="Enter barcode"
                    data-testid="input-barcode"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Dimensions & Weight */}
            <Card>
              <CardHeader>
                <CardTitle>Dimensions & Weight</CardTitle>
                <CardDescription>Product physical dimensions and weight</CardDescription>
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
                      data-testid="input-length"
                    />
                  </div>

                  <div>
                    <Label htmlFor="width">Width (cm)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register('width')}
                      placeholder="0.00"
                      data-testid="input-width"
                    />
                  </div>

                  <div>
                    <Label htmlFor="height">Height (cm)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...form.register('height')}
                      placeholder="0.00"
                      data-testid="input-height"
                    />
                  </div>

                  <div>
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      {...form.register('weight')}
                      placeholder="0.000"
                      data-testid="input-weight"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Packing Material */}
            <Card>
              <CardHeader>
                <CardTitle>Packing Material</CardTitle>
                <CardDescription>Select default packing material for this product</CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="packingMaterialId">Packing Material</Label>
                  <Select value={form.watch('packingMaterialId') || 'none'} onValueChange={(value) => form.setValue('packingMaterialId', value === 'none' ? '' : value)}>
                    <SelectTrigger data-testid="select-packing-material">
                      <SelectValue placeholder="Select packing material" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {packingMaterials?.map((material: any) => (
                        <SelectItem key={material.id} value={material.id}>
                          {material.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Landing Cost History (Outside Tabs) */}
        {costHistory && costHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Landing Cost History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Cost History Chart */}
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

              {/* Cost History Table */}
              <div>
                <h4 className="text-sm font-medium mb-3">Recent History</h4>
                {costHistoryLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
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
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
              <Button type="button" variant="destructive" data-testid="button-delete-product">
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
              <Button type="button" variant="outline" data-testid="button-cancel">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={updateProductMutation.isPending} data-testid="button-save">
              <Save className="h-4 w-4 mr-2" />
              {updateProductMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>

      {/* Tiered Pricing Dialog */}
      <Dialog open={tieredPricingDialogOpen} onOpenChange={setTieredPricingDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-tiered-pricing">
          <DialogHeader>
            <DialogTitle>{editingTier ? 'Edit' : 'Add'} Tiered Pricing</DialogTitle>
            <DialogDescription>
              Set quantity-based pricing for bulk orders
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={tierForm.handleSubmit(onTierSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minQuantity">Minimum Quantity *</Label>
                <Input
                  type="number"
                  {...tierForm.register('minQuantity')}
                  placeholder="e.g., 10"
                  data-testid="input-tier-min-qty"
                />
                {tierForm.formState.errors.minQuantity && (
                  <p className="text-sm text-red-600 mt-1">{tierForm.formState.errors.minQuantity.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="maxQuantity">Maximum Quantity</Label>
                <Input
                  type="number"
                  {...tierForm.register('maxQuantity')}
                  placeholder="Leave empty for unlimited"
                  data-testid="input-tier-max-qty"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="priceType">Price Type</Label>
              <Select value={tierForm.watch('priceType') || 'tiered'} onValueChange={(value) => tierForm.setValue('priceType', value as 'tiered' | 'wholesale')}>
                <SelectTrigger data-testid="select-tier-price-type">
                  <SelectValue placeholder="Select price type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tiered">Tiered</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prices (At least one required)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priceCzk" className="text-xs">CZK</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...tierForm.register('priceCzk')}
                    placeholder="0.00"
                    data-testid="input-tier-price-czk"
                  />
                </div>

                <div>
                  <Label htmlFor="priceEur" className="text-xs">EUR</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...tierForm.register('priceEur')}
                    placeholder="0.00"
                    data-testid="input-tier-price-eur"
                  />
                </div>

                <div>
                  <Label htmlFor="priceUsd" className="text-xs">USD</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...tierForm.register('priceUsd')}
                    placeholder="0.00"
                    data-testid="input-tier-price-usd"
                  />
                </div>

                <div>
                  <Label htmlFor="priceVnd" className="text-xs">VND</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...tierForm.register('priceVnd')}
                    placeholder="0.00"
                    data-testid="input-tier-price-vnd"
                  />
                </div>

                <div>
                  <Label htmlFor="priceCny" className="text-xs">CNY</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...tierForm.register('priceCny')}
                    placeholder="0.00"
                    data-testid="input-tier-price-cny"
                  />
                </div>
              </div>
              {tierForm.formState.errors.priceCzk && (
                <p className="text-sm text-red-600">{tierForm.formState.errors.priceCzk.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTieredPricingDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTieredPricingMutation.isPending || updateTieredPricingMutation.isPending}
                data-testid="button-save-tier"
              >
                {(createTieredPricingMutation.isPending || updateTieredPricingMutation.isPending) ? 'Saving...' : 'Save Tier'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
