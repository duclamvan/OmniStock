import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { formatCurrency, convertCurrency, type Currency } from "@/lib/currencyUtils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Upload, 
  Package, 
  RotateCcw, 
  Plus, 
  Trash2, 
  MoreHorizontal,
  ArrowLeft,
  Save,
  Banknote,
  Hash,
  Building,
  Users,
  BarChart,
  AlertCircle,
  FileText,
  Link,
  Barcode,
  Tag
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PackingInstructionsUploader from "@/components/PackingInstructionsUploader";
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
  warehouseLocation: z.string().optional(),
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
  const [seriesQuantity, setSeriesQuantity] = useState(0);
  const [seriesImportCostUsd, setSeriesImportCostUsd] = useState("");
  const [seriesImportCostCzk, setSeriesImportCostCzk] = useState("");
  const [seriesImportCostEur, setSeriesImportCostEur] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkScanDialogOpen, setIsBulkScanDialogOpen] = useState(false);
  const [bulkBarcodes, setBulkBarcodes] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [newVariant, setNewVariant] = useState({
    name: "",
    barcode: "",
    quantity: 0,
    importCostUsd: "",
    importCostCzk: "",
    importCostEur: "",
  });
  const [packingInstructionsText, setPackingInstructionsText] = useState<string>("");
  const [packingInstructionsImage, setPackingInstructionsImage] = useState<string | null>(null);
  
  // Auto-conversion state
  const conversionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const seriesConversionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get categoryId from URL query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const categoryIdFromUrl = searchParams.get('categoryId');

  const form = useForm<z.infer<typeof addProductSchema>>({
    resolver: zodResolver(addProductSchema),
    defaultValues: {
      quantity: 0,
      lowStockAlert: 5,
      categoryId: categoryIdFromUrl || undefined,
    },
  });

  // Watch import cost fields for auto-conversion
  const importCostUsd = form.watch('importCostUsd');
  const importCostCzk = form.watch('importCostCzk');
  const importCostEur = form.watch('importCostEur');

  // Auto-convert import costs after 1 second
  useEffect(() => {
    if (conversionTimeoutRef.current) {
      clearTimeout(conversionTimeoutRef.current);
    }

    conversionTimeoutRef.current = setTimeout(() => {
      // Count how many fields have values
      const filledFields = [
        importCostUsd ? 'USD' : null,
        importCostCzk ? 'CZK' : null,
        importCostEur ? 'EUR' : null,
      ].filter(Boolean);

      // Only convert if exactly one field has a value
      if (filledFields.length === 1) {
        const sourceCurrency = filledFields[0] as Currency;
        let sourceValue = 0;

        switch (sourceCurrency) {
          case 'USD':
            sourceValue = parseFloat(String(importCostUsd)) || 0;
            break;
          case 'CZK':
            sourceValue = parseFloat(String(importCostCzk)) || 0;
            break;
          case 'EUR':
            sourceValue = parseFloat(String(importCostEur)) || 0;
            break;
        }

        if (sourceValue > 0) {
          // Convert to other currencies
          if (sourceCurrency !== 'USD' && !importCostUsd) {
            const usdValue = convertCurrency(sourceValue, sourceCurrency, 'USD');
            form.setValue('importCostUsd', parseFloat(usdValue.toFixed(2)));
          }
          if (sourceCurrency !== 'CZK' && !importCostCzk) {
            const czkValue = convertCurrency(sourceValue, sourceCurrency, 'CZK');
            form.setValue('importCostCzk', parseFloat(czkValue.toFixed(2)));
          }
          if (sourceCurrency !== 'EUR' && !importCostEur) {
            const eurValue = convertCurrency(sourceValue, sourceCurrency, 'EUR');
            form.setValue('importCostEur', parseFloat(eurValue.toFixed(2)));
          }
        }
      }
    }, 1000);

    return () => {
      if (conversionTimeoutRef.current) {
        clearTimeout(conversionTimeoutRef.current);
      }
    };
  }, [importCostUsd, importCostCzk, importCostEur, form]);

  // Auto-convert series import costs after 1 second
  useEffect(() => {
    if (seriesConversionTimeoutRef.current) {
      clearTimeout(seriesConversionTimeoutRef.current);
    }

    seriesConversionTimeoutRef.current = setTimeout(() => {
      // Count how many fields have values
      const filledFields = [
        seriesImportCostUsd ? 'USD' : null,
        seriesImportCostCzk ? 'CZK' : null,
        seriesImportCostEur ? 'EUR' : null,
      ].filter(Boolean);

      // Only convert if exactly one field has a value
      if (filledFields.length === 1) {
        const sourceCurrency = filledFields[0] as Currency;
        let sourceValue = 0;

        switch (sourceCurrency) {
          case 'USD':
            sourceValue = parseFloat(seriesImportCostUsd) || 0;
            break;
          case 'CZK':
            sourceValue = parseFloat(seriesImportCostCzk) || 0;
            break;
          case 'EUR':
            sourceValue = parseFloat(seriesImportCostEur) || 0;
            break;
        }

        if (sourceValue > 0) {
          // Convert to other currencies
          if (sourceCurrency !== 'USD' && !seriesImportCostUsd) {
            const usdValue = convertCurrency(sourceValue, sourceCurrency, 'USD');
            setSeriesImportCostUsd(usdValue.toFixed(2));
          }
          if (sourceCurrency !== 'CZK' && !seriesImportCostCzk) {
            const czkValue = convertCurrency(sourceValue, sourceCurrency, 'CZK');
            setSeriesImportCostCzk(czkValue.toFixed(2));
          }
          if (sourceCurrency !== 'EUR' && !seriesImportCostEur) {
            const eurValue = convertCurrency(sourceValue, sourceCurrency, 'EUR');
            setSeriesImportCostEur(eurValue.toFixed(2));
          }
        }
      }
    }, 1000);

    return () => {
      if (seriesConversionTimeoutRef.current) {
        clearTimeout(seriesConversionTimeoutRef.current);
      }
    };
  }, [seriesImportCostUsd, seriesImportCostCzk, seriesImportCostEur]);

  // Fetch categories, warehouses, and suppliers
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['/api/categories'],
  });

  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
  });

  const { data: suppliers = [] } = useQuery<any[]>({
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
        
        const uploadResult = await uploadResponse.json();
        data.imageUrl = uploadResult.imageUrl;
        
        // Show compression info if available
        if (uploadResult.compressionInfo) {
          const { originalSize, compressedSize, compressionRatio } = uploadResult.compressionInfo;
          const originalKB = (originalSize / 1024).toFixed(2);
          const compressedKB = (compressedSize / 1024).toFixed(2);
          
          toast({
            title: "Image Compressed",
            description: `Original: ${originalKB} KB → Compressed: ${compressedKB} KB (${compressionRatio} saved)`,
          });
        }
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

  const handleBulkBarcodeAssign = () => {
    const barcodes = bulkBarcodes
      .split('\n')
      .map(b => b.trim())
      .filter(b => b.length > 0);
    
    if (barcodes.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one barcode",
        variant: "destructive",
      });
      return;
    }

    const updatedVariants = [...variants];
    const variantsWithoutBarcode = updatedVariants.filter(v => !v.barcode);
    
    // Assign barcodes to variants without barcodes
    for (let i = 0; i < Math.min(barcodes.length, variantsWithoutBarcode.length); i++) {
      variantsWithoutBarcode[i].barcode = barcodes[i];
    }

    setVariants(updatedVariants);
    setBulkBarcodes("");
    setIsBulkScanDialogOpen(false);
    
    const assignedCount = Math.min(barcodes.length, variantsWithoutBarcode.length);
    toast({
      title: "Success",
      description: `Assigned ${assignedCount} barcode(s) to variants`,
    });

    if (barcodes.length > variantsWithoutBarcode.length) {
      toast({
        title: "Info",
        description: `${barcodes.length - variantsWithoutBarcode.length} barcode(s) were not assigned (no more variants without barcodes)`,
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
          quantity: seriesQuantity,
          importCostUsd: seriesImportCostUsd,
          importCostCzk: seriesImportCostCzk,
          importCostEur: seriesImportCostEur,
        });
      }
      
      setVariants([...variants, ...newVariants]);
      // Reset series fields
      setSeriesInput("");
      setSeriesQuantity(0);
      setSeriesImportCostUsd("");
      setSeriesImportCostCzk("");
      setSeriesImportCostEur("");
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
      packingInstructionsText: packingInstructionsText,
      packingInstructionsImage: packingInstructionsImage,
      supplierLink: data.supplierLink || undefined,
      barcode: data.barcode || undefined,
    };

    createProductMutation.mutate(productData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/inventory")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Inventory
              </Button>
              <div className="h-6 w-px bg-gray-200" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Add New Product</h1>
                <p className="text-sm text-slate-600">Create a new product with variants and pricing</p>
              </div>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-600">
              <Plus className="h-3 w-3 mr-1" />
              New Product
            </Badge>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex gap-6">
            {/* Main Column - Scrollable */}
            <div className="flex-1 space-y-6">
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
              <Label htmlFor="warehouseLocation">Warehouse Location Code</Label>
              <Input
                {...form.register('warehouseLocation')}
                placeholder="e.g., A1-B2-C3 or RACK-01-SHELF-05"
              />
              <p className="text-sm text-slate-500 mt-1">
                Specify the exact location within the warehouse (aisle, rack, shelf, bin, etc.)
              </p>
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
              <div className="flex gap-2">
                <Input
                  {...form.register('barcode')}
                  placeholder="Enter barcode or scan"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsScanning(true);
                    toast({
                      title: "Scanner Ready",
                      description: "Please scan the barcode now",
                    });
                    // Simulate barcode scan - in production, this would connect to a barcode scanner
                    setTimeout(() => {
                      setIsScanning(false);
                    }, 3000);
                  }}
                  disabled={isScanning}
                >
                  <Barcode className="h-4 w-4 mr-2" />
                  {isScanning ? "Scanning..." : "Scan"}
                </Button>
              </div>
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
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsBulkScanDialogOpen(true)}
                disabled={variants.length === 0}
              >
                <Barcode className="h-4 w-4 mr-2" />
                Bulk Scan
              </Button>
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
                      <div className="space-y-3">
                        <Input
                          id="series-input"
                          value={seriesInput}
                          onChange={(e) => setSeriesInput(e.target.value)}
                          placeholder='e.g., "Gel Polish <1-100>"'
                        />
                        <p className="text-xs text-slate-500">
                          Use format like "Gel Polish &lt;1-100&gt;" to automatically create 100 variants
                        </p>
                        
                        <div>
                          <Label htmlFor="series-quantity">Quantity (each variant)</Label>
                          <Input
                            id="series-quantity"
                            type="number"
                            value={seriesQuantity}
                            onChange={(e) => setSeriesQuantity(parseInt(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                        
                        <div>
                          <Label>Import Cost (each variant)</Label>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            <div>
                              <Label htmlFor="series-cost-usd" className="text-xs text-slate-500">USD</Label>
                              <Input
                                id="series-cost-usd"
                                value={seriesImportCostUsd}
                                onChange={(e) => setSeriesImportCostUsd(e.target.value)}
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <Label htmlFor="series-cost-czk" className="text-xs text-slate-500">CZK</Label>
                              <Input
                                id="series-cost-czk"
                                value={seriesImportCostCzk}
                                onChange={(e) => setSeriesImportCostCzk(e.target.value)}
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <Label htmlFor="series-cost-eur" className="text-xs text-slate-500">EUR</Label>
                              <Input
                                id="series-cost-eur"
                                value={seriesImportCostEur}
                                onChange={(e) => setSeriesImportCostEur(e.target.value)}
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Enter cost in one currency, others will auto-convert
                          </p>
                        </div>
                        
                        <Button 
                          onClick={addVariantSeries}
                          disabled={!seriesInput}
                          type="button"
                          className="w-full"
                        >
                          Add Series
                        </Button>
                      </div>
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

        {/* Packing Instructions */}
        <PackingInstructionsUploader
          packingInstructionsText={packingInstructionsText}
          packingInstructionsImage={packingInstructionsImage || ""}
          onTextChange={setPackingInstructionsText}
          onImageChange={setPackingInstructionsImage}
        />
            </div>
            {/* End of Main Column */}

            {/* Right Column - Sticky */}
            <div className="w-full lg:w-96">
              <div className="sticky top-20 space-y-6">
                {/* Quick Actions Card */}
                <Card className="shadow-lg overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-green-600" />
                      Quick Actions
                    </CardTitle>
                    <CardDescription>Save your product or cancel</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    <Button type="submit" className="w-full" size="lg" disabled={createProductMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {createProductMutation.isPending ? 'Creating...' : 'Create Product'}
                    </Button>
                    <Button type="button" variant="outline" className="w-full" onClick={() => setLocation('/inventory')}>
                      Cancel
                    </Button>
                  </CardContent>
                </Card>

                {/* Product Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600">Product Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Tag className="h-4 w-4 text-blue-500" />
                      <span className="text-gray-600">Variants:</span>
                      <span className="font-medium">{variants.length}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <BarChart className="h-4 w-4 text-green-500" />
                      <span className="text-gray-600">Total Stock:</span>
                      <span className="font-medium">
                        {variants.reduce((sum, v) => sum + Number(v.stock), 0)}
                      </span>
                    </div>
                    {variants.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Banknote className="h-4 w-4 text-orange-500" />
                        <span className="text-gray-600">Price Range:</span>
                        <span className="font-medium">
                          {Math.min(...variants.map(v => Number(v.price)))} - {Math.max(...variants.map(v => Number(v.price)))}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Tips */}
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-blue-900">
                      <AlertCircle className="h-4 w-4 inline mr-2" />
                      Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-blue-800 space-y-2">
                    <p>• Add at least one variant for your product</p>
                    <p>• Use clear, descriptive names</p>
                    <p>• Set realistic stock levels</p>
                  </CardContent>
                </Card>
              </div>
            </div>
            {/* End of Right Column */}
          </div>
          
          {/* Bulk Scan Dialog */}
          <Dialog open={isBulkScanDialogOpen} onOpenChange={setIsBulkScanDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Bulk Scan Barcodes</DialogTitle>
                <DialogDescription>
                  Scan barcodes one by one. They will be automatically assigned to variants without barcodes (from first to last).
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulk-barcodes">Scanned Barcodes</Label>
                  <Textarea
                    id="bulk-barcodes"
                    value={bulkBarcodes}
                    onChange={(e) => setBulkBarcodes(e.target.value)}
                    placeholder="Scan or paste barcodes here (one per line)"
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Enter one barcode per line. Barcodes will be assigned to variants in order.
                  </p>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="text-slate-600">
                    <span className="font-medium">{variants.filter(v => !v.barcode).length}</span> variants without barcodes
                  </div>
                  <div className="text-slate-600">
                    <span className="font-medium">{bulkBarcodes.split('\n').filter(b => b.trim()).length}</span> barcodes entered
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setIsScanning(true);
                    toast({
                      title: "Scanner Ready",
                      description: "Start scanning barcodes. Press Enter after each scan.",
                    });
                    // In production, this would interface with a barcode scanner
                    // For now, users can manually paste or type barcodes
                    setTimeout(() => {
                      setIsScanning(false);
                    }, 3000);
                  }}
                  disabled={isScanning}
                >
                  <Barcode className="h-4 w-4 mr-2" />
                  {isScanning ? "Scanning..." : "Start Scanning"}
                </Button>
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setBulkBarcodes("");
                    setIsBulkScanDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleBulkBarcodeAssign}
                  disabled={!bulkBarcodes.trim() || variants.filter(v => !v.barcode).length === 0}
                >
                  Assign Barcodes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </form>
      </div>
    </div>
  );
}
