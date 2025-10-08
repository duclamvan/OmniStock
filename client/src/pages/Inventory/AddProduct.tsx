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
  Link as LinkIcon,
  Barcode,
  Tag,
  ChevronDown,
  ChevronUp,
  Box,
  DollarSign,
  Warehouse,
  Info
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  const [expandedSections, setExpandedSections] = useState<string[]>(["basic"]);
  
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-4 md:py-6 max-w-7xl">
        {/* Mobile-Optimized Header */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm mb-4 md:mb-6 p-3 md:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/inventory")}
                data-testid="button-back"
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <Separator orientation="vertical" className="h-8 hidden sm:block" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Package className="h-5 w-5 md:h-6 md:w-6 text-emerald-600" />
                  Add Product
                </h1>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  Create new product with details
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-emerald-600 border-emerald-600 self-start sm:self-center">
              <Plus className="h-3 w-3 mr-1" />
              New
            </Badge>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Product Summary Card - Mobile First */}
          <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg">
                    <Tag className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Variants</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100" data-testid="text-variant-count">{variants.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg">
                    <BarChart className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Total Stock</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100" data-testid="text-total-stock">
                      {variants.reduce((sum, v) => sum + Number(v.quantity || 0), 0)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 col-span-2 md:col-span-2">
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg">
                    <Info className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-600 dark:text-slate-400">Status</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {form.watch('name') ? 'Ready to save' : 'Enter product details'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Accordion-Based Sections for Mobile */}
          <Accordion type="multiple" value={expandedSections} onValueChange={setExpandedSections} className="space-y-3">
            {/* Basic Information */}
            <AccordionItem value="basic" className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                    <Box className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">Basic Information</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Product name, SKU, category</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4 pt-2">
                  {/* Product Image Upload */}
                  <div>
                    <Label htmlFor="image" className="text-sm font-medium">Product Image</Label>
                    <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="w-20 h-20 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                        {imageFile ? (
                          <img
                            src={URL.createObjectURL(imageFile)}
                            alt="Preview"
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          <Upload className="h-6 w-6 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                          className="hidden"
                          id="image-upload"
                          data-testid="input-image"
                        />
                        <label htmlFor="image-upload">
                          <Button type="button" variant="outline" size="sm" asChild data-testid="button-upload-image">
                            <span>
                              <Upload className="h-4 w-4 mr-2" />
                              Choose Image
                            </span>
                          </Button>
                        </label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Auto-compressed on upload
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Product Name & SKU */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium">Product Name *</Label>
                      <Input
                        {...form.register('name')}
                        placeholder="Enter product name"
                        data-testid="input-name"
                        className="mt-1"
                      />
                      {form.formState.errors.name && (
                        <p className="text-xs text-red-600 mt-1">{form.formState.errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="sku" className="text-sm font-medium">SKU *</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          {...form.register('sku')}
                          placeholder="Auto-generate or enter SKU"
                          data-testid="input-sku"
                          className="flex-1"
                        />
                        <Button type="button" variant="outline" size="icon" onClick={generateSKU} data-testid="button-generate-sku">
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                      {form.formState.errors.sku && (
                        <p className="text-xs text-red-600 mt-1">{form.formState.errors.sku.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Category, Warehouse, Supplier */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="categoryId" className="text-sm font-medium">Category</Label>
                      <Select value={form.watch('categoryId')} onValueChange={(value) => form.setValue('categoryId', value)}>
                        <SelectTrigger data-testid="select-category" className="mt-1">
                          <SelectValue placeholder="Select" />
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
                      <Label htmlFor="warehouseId" className="text-sm font-medium">Warehouse</Label>
                      <Select value={form.watch('warehouseId')} onValueChange={(value) => form.setValue('warehouseId', value)}>
                        <SelectTrigger data-testid="select-warehouse" className="mt-1">
                          <SelectValue placeholder="Select" />
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
                      <Label htmlFor="supplierId" className="text-sm font-medium">Supplier</Label>
                      <Select value={form.watch('supplierId')} onValueChange={(value) => form.setValue('supplierId', value)}>
                        <SelectTrigger data-testid="select-supplier" className="mt-1">
                          <SelectValue placeholder="Select" />
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

                  {/* Warehouse Location */}
                  <div>
                    <Label htmlFor="warehouseLocation" className="text-sm font-medium">Warehouse Location Code</Label>
                    <Input
                      {...form.register('warehouseLocation')}
                      placeholder="e.g., A1-B2-C3 or RACK-01-SHELF-05"
                      data-testid="input-location"
                      className="mt-1"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Exact location within warehouse
                    </p>
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                    <Textarea
                      {...form.register('description')}
                      placeholder="Product description..."
                      rows={3}
                      data-testid="input-description"
                      className="mt-1"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Stock Information */}
            <AccordionItem value="stock" className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <BarChart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">Stock & Inventory</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Quantity, alerts, barcode</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="quantity" className="text-sm font-medium">Quantity</Label>
                      <Input
                        type="number"
                        min="0"
                        {...form.register('quantity')}
                        data-testid="input-quantity"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="lowStockAlert" className="text-sm font-medium">Low Stock Alert</Label>
                      <Input
                        type="number"
                        min="0"
                        {...form.register('lowStockAlert')}
                        data-testid="input-low-stock"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="barcode" className="text-sm font-medium">Barcode (EAN-13)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        {...form.register('barcode')}
                        placeholder="Enter or scan barcode"
                        data-testid="input-barcode"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setIsScanning(true);
                          toast({
                            title: "Scanner Ready",
                            description: "Please scan the barcode now",
                          });
                          setTimeout(() => {
                            setIsScanning(false);
                          }, 3000);
                        }}
                        disabled={isScanning}
                        data-testid="button-scan-barcode"
                      >
                        <Barcode className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Pricing */}
            <AccordionItem value="pricing" className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                    <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">Pricing & Costs</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Sales price, import costs</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4 pt-2">
                  {/* Sales Prices */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Sales Prices</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="priceCzk" className="text-xs text-slate-500">CZK</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...form.register('priceCzk')}
                          placeholder="0.00"
                          data-testid="input-price-czk"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="priceEur" className="text-xs text-slate-500">EUR</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...form.register('priceEur')}
                          placeholder="0.00"
                          data-testid="input-price-eur"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Import Costs */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Import Costs</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label htmlFor="importCostUsd" className="text-xs text-slate-500">USD</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...form.register('importCostUsd')}
                          placeholder="0.00"
                          data-testid="input-cost-usd"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="importCostCzk" className="text-xs text-slate-500">CZK</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...form.register('importCostCzk')}
                          placeholder="0.00"
                          data-testid="input-cost-czk"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="importCostEur" className="text-xs text-slate-500">EUR</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...form.register('importCostEur')}
                          placeholder="0.00"
                          data-testid="input-cost-eur"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Enter cost in one currency, others auto-convert
                    </p>
                  </div>

                  {/* Supplier Link */}
                  <div>
                    <Label htmlFor="supplierLink" className="text-sm font-medium">Supplier Link</Label>
                    <Input
                      type="url"
                      {...form.register('supplierLink')}
                      placeholder="https://supplier-website.com/product"
                      data-testid="input-supplier-link"
                      className="mt-1"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Product Variants */}
            <AccordionItem value="variants" className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center gap-3 text-left flex-1">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Tag className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">Product Variants</h3>
                      <Badge variant="secondary" className="ml-2">{variants.length}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Manage product variations</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4 pt-2">
                  {/* Variant Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                      <DialogTrigger asChild>
                        <Button type="button" size="sm" data-testid="button-add-variant">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Variant
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
                                data-testid="input-series"
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
                                  data-testid="input-series-quantity"
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
                                      data-testid="input-series-cost-usd"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="series-cost-czk" className="text-xs text-slate-500">CZK</Label>
                                    <Input
                                      id="series-cost-czk"
                                      value={seriesImportCostCzk}
                                      onChange={(e) => setSeriesImportCostCzk(e.target.value)}
                                      placeholder="0.00"
                                      data-testid="input-series-cost-czk"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="series-cost-eur" className="text-xs text-slate-500">EUR</Label>
                                    <Input
                                      id="series-cost-eur"
                                      value={seriesImportCostEur}
                                      onChange={(e) => setSeriesImportCostEur(e.target.value)}
                                      placeholder="0.00"
                                      data-testid="input-series-cost-eur"
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
                                data-testid="button-add-series"
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
                                data-testid="input-variant-name"
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
                                data-testid="input-variant-barcode"
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
                              data-testid="input-variant-quantity"
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
                                data-testid="input-variant-cost-usd"
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
                                data-testid="input-variant-cost-czk"
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
                                data-testid="input-variant-cost-eur"
                              />
                            </div>
                          </div>
                        </div>

                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsAddDialogOpen(false)}
                            data-testid="button-cancel-variant"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            onClick={addVariant}
                            disabled={!newVariant.name.trim()}
                            data-testid="button-save-variant"
                          >
                            Add Variant
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setIsBulkScanDialogOpen(true)}
                      disabled={variants.length === 0}
                      data-testid="button-bulk-scan"
                    >
                      <Barcode className="h-4 w-4 mr-2" />
                      Bulk Scan
                    </Button>

                    {selectedVariants.length > 0 && (
                      <Button type="button" variant="destructive" size="sm" onClick={bulkDeleteVariants} data-testid="button-delete-selected">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete ({selectedVariants.length})
                      </Button>
                    )}
                  </div>

                  {/* Variants Table/List */}
                  {variants.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedVariants.length === variants.length && variants.length > 0}
                            onCheckedChange={toggleSelectAll}
                            data-testid="checkbox-select-all"
                          />
                          <span className="text-slate-600 dark:text-slate-400">
                            {selectedVariants.length > 0 ? `${selectedVariants.length} selected` : `${variants.length} variants`}
                          </span>
                        </div>
                      </div>

                      {/* Mobile: Card View, Desktop: Table View */}
                      <div className="hidden md:block border rounded-lg overflow-hidden overflow-x-auto">
                        <Table className="min-w-full">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">
                                <Checkbox
                                  checked={selectedVariants.length === variants.length && variants.length > 0}
                                  onCheckedChange={toggleSelectAll}
                                  data-testid="checkbox-select-all-header"
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
                              <TableRow key={variant.id} data-testid={`row-variant-${variant.id}`}>
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
                                    data-testid={`checkbox-variant-${variant.id}`}
                                  />
                                </TableCell>
                                <TableCell className="min-w-[200px]">
                                  <Input
                                    value={variant.name}
                                    onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                                    className="border-0 bg-transparent p-0 focus-visible:ring-0 w-full"
                                    data-testid={`input-variant-name-${variant.id}`}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={variant.barcode}
                                    onChange={(e) => updateVariant(variant.id, 'barcode', e.target.value)}
                                    className="border-0 bg-transparent p-0 focus-visible:ring-0"
                                    placeholder="-"
                                    data-testid={`input-variant-barcode-${variant.id}`}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={variant.quantity}
                                    onChange={(e) => updateVariant(variant.id, 'quantity', parseInt(e.target.value) || 0)}
                                    className="border-0 bg-transparent p-0 focus-visible:ring-0"
                                    data-testid={`input-variant-quantity-${variant.id}`}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={variant.importCostUsd}
                                    onChange={(e) => updateVariant(variant.id, 'importCostUsd', e.target.value)}
                                    className="border-0 bg-transparent p-0 focus-visible:ring-0"
                                    placeholder="$0.00"
                                    data-testid={`input-variant-cost-usd-${variant.id}`}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={variant.importCostCzk}
                                    onChange={(e) => updateVariant(variant.id, 'importCostCzk', e.target.value)}
                                    className="border-0 bg-transparent p-0 focus-visible:ring-0"
                                    placeholder="0,00 Kč"
                                    data-testid={`input-variant-cost-czk-${variant.id}`}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={variant.importCostEur}
                                    onChange={(e) => updateVariant(variant.id, 'importCostEur', e.target.value)}
                                    className="border-0 bg-transparent p-0 focus-visible:ring-0"
                                    placeholder="0,00 €"
                                    data-testid={`input-variant-cost-eur-${variant.id}`}
                                  />
                                </TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" data-testid={`button-variant-menu-${variant.id}`}>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => removeVariant(variant.id)}
                                        className="text-red-600"
                                        data-testid={`button-delete-variant-${variant.id}`}
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

                      {/* Mobile Card View */}
                      <div className="md:hidden space-y-2">
                        {variants.map((variant) => (
                          <Card key={variant.id} className="p-3" data-testid={`card-variant-${variant.id}`}>
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selectedVariants.includes(variant.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedVariants([...selectedVariants, variant.id]);
                                  } else {
                                    setSelectedVariants(selectedVariants.filter(id => id !== variant.id));
                                  }
                                }}
                                className="mt-1"
                                data-testid={`checkbox-variant-mobile-${variant.id}`}
                              />
                              <div className="flex-1 space-y-2">
                                <Input
                                  value={variant.name}
                                  onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                                  className="font-medium"
                                  placeholder="Variant name"
                                  data-testid={`input-variant-name-mobile-${variant.id}`}
                                />
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <Input
                                    value={variant.barcode}
                                    onChange={(e) => updateVariant(variant.id, 'barcode', e.target.value)}
                                    placeholder="Barcode"
                                    data-testid={`input-variant-barcode-mobile-${variant.id}`}
                                  />
                                  <Input
                                    type="number"
                                    value={variant.quantity}
                                    onChange={(e) => updateVariant(variant.id, 'quantity', parseInt(e.target.value) || 0)}
                                    placeholder="Qty"
                                    data-testid={`input-variant-quantity-mobile-${variant.id}`}
                                  />
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeVariant(variant.id)}
                                className="shrink-0 text-red-600"
                                data-testid={`button-delete-variant-mobile-${variant.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {variants.length === 0 && (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <Tag className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No variants added yet</p>
                      <p className="text-xs mt-1">Click "Add Variant" to get started</p>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Packing Instructions */}
            <AccordionItem value="packing" className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                    <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">Packing Instructions</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Special handling notes</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="pt-2">
                  <PackingInstructionsUploader
                    packingInstructionsText={packingInstructionsText}
                    packingInstructionsImage={packingInstructionsImage || ""}
                    onTextChange={setPackingInstructionsText}
                    onImageChange={setPackingInstructionsImage}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Sticky Bottom Action Bar - Mobile Friendly */}
          <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t shadow-lg rounded-t-2xl p-4 z-10">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3">
              <Button 
                type="submit" 
                className="flex-1 h-12" 
                disabled={createProductMutation.isPending}
                data-testid="button-save-product"
              >
                <Save className="h-4 w-4 mr-2" />
                {createProductMutation.isPending ? 'Creating...' : 'Create Product'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="sm:w-32 h-12" 
                onClick={() => setLocation('/inventory')}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>
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
                    data-testid="input-bulk-barcodes"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Enter one barcode per line. Barcodes will be assigned to variants in order.
                  </p>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="text-slate-600 dark:text-slate-400">
                    <span className="font-medium">{variants.filter(v => !v.barcode).length}</span> variants without barcodes
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
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
                    setTimeout(() => {
                      setIsScanning(false);
                    }, 3000);
                  }}
                  disabled={isScanning}
                  data-testid="button-start-scanning"
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
                  data-testid="button-cancel-bulk-scan"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleBulkBarcodeAssign}
                  disabled={!bulkBarcodes.trim() || variants.filter(v => !v.barcode).length === 0}
                  data-testid="button-assign-barcodes"
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
