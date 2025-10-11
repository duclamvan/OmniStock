import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency, convertCurrency, type Currency } from "@/lib/currencyUtils";
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
  Info,
  Image as ImageIcon,
  Hand,
  PackageOpen,
  FileType,
  Star,
  X,
  MapPin,
  CheckCircle,
  Mail,
  Phone,
  Globe,
  ExternalLink,
  TrendingUp,
  Pencil,
  Euro,
  Ruler
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
import PackingInstructionsUploader from "@/components/PackingInstructionsUploader";
import ProductFiles from "@/components/ProductFiles";
import ProductLocations from "@/components/ProductLocations";
import CostHistoryChart from "@/components/products/CostHistoryChart";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

// Unified schema with all fields from both AddProduct and EditProduct
const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  englishName: z.string().optional(),
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
  priceUsd: z.coerce.number().min(0).optional(),
  priceVnd: z.coerce.number().min(0).optional(),
  priceCny: z.coerce.number().min(0).optional(),
  importCostUsd: z.coerce.number().min(0).optional(),
  importCostCzk: z.coerce.number().min(0).optional(),
  importCostEur: z.coerce.number().min(0).optional(),
  barcode: z.string().optional(),
  length: z.coerce.number().min(0).optional(),
  width: z.coerce.number().min(0).optional(),
  height: z.coerce.number().min(0).optional(),
  weight: z.coerce.number().min(0).optional(),
  packingMaterialId: z.string().optional(),
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

type ImagePurpose = 'main' | 'in_hand' | 'detail' | 'packaging' | 'label';

interface ProductImage {
  file?: File;
  preview: string;
  url?: string;
  purpose: ImagePurpose;
  isPrimary: boolean;
}

const IMAGE_PURPOSE_CONFIG = {
  main: {
    label: 'Main WMS Image',
    description: 'Primary product image for warehouse management',
    icon: ImageIcon,
    color: 'text-blue-600 bg-blue-50 border-blue-300',
    uploadedColor: 'text-blue-700 bg-blue-100 border-blue-500',
    bgGradient: 'from-blue-50 to-blue-100',
  },
  in_hand: {
    label: 'In Hand (Pick & Pack)',
    description: 'Product held in hand for picking/packing reference',
    icon: Hand,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-300',
    uploadedColor: 'text-emerald-700 bg-emerald-100 border-emerald-500',
    bgGradient: 'from-emerald-50 to-emerald-100',
  },
  detail: {
    label: 'Detail Shot',
    description: 'Close-up details, texture, or features',
    icon: PackageOpen,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-300',
    uploadedColor: 'text-indigo-700 bg-indigo-100 border-indigo-500',
    bgGradient: 'from-indigo-50 to-indigo-100',
  },
  packaging: {
    label: 'Packaging',
    description: 'Product packaging and box',
    icon: Package,
    color: 'text-orange-600 bg-orange-50 border-orange-300',
    uploadedColor: 'text-orange-700 bg-orange-100 border-orange-500',
    bgGradient: 'from-orange-50 to-orange-100',
  },
  label: {
    label: 'Label/Barcode',
    description: 'Product label, barcode, or SKU tag',
    icon: FileType,
    color: 'text-cyan-600 bg-cyan-50 border-cyan-300',
    uploadedColor: 'text-cyan-700 bg-cyan-100 border-cyan-500',
    bgGradient: 'from-cyan-50 to-cyan-100',
  },
};

export default function ProductForm() {
  const params = useParams();
  const id = params.id;
  const isEditMode = !!id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // State management
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [variants, setVariants] = useState<Array<{
    id: string;
    name: string;
    barcode: string;
    quantity: number;
    importCostUsd: string;
    importCostCzk: string;
    importCostEur: string;
    imageUrl?: string;
  }>>([]);
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  const [variantImageLoading, setVariantImageLoading] = useState<Record<string, boolean>>({});
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
  const [packingInstructionsTexts, setPackingInstructionsTexts] = useState<string[]>([]);
  const [packingInstructionsImages, setPackingInstructionsImages] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<string[]>(["basic"]);
  
  // Edit mode specific state
  const [tieredPricingDialogOpen, setTieredPricingDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<any>(null);
  
  // Auto-conversion refs
  const conversionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const seriesConversionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get categoryId from URL query parameters (for add mode)
  const searchParams = new URLSearchParams(window.location.search);
  const categoryIdFromUrl = searchParams.get('categoryId');

  // Fetch product data if in edit mode
  const { data: product, isLoading: productLoading } = useQuery<any>({
    queryKey: ['/api/products', id],
    enabled: isEditMode,
  });

  // Fetch cost history if in edit mode
  const { data: costHistory, isLoading: costHistoryLoading } = useQuery<any[]>({
    queryKey: [`/api/products/${id}/cost-history`],
    enabled: isEditMode,
  });

  // Fetch tiered pricing if in edit mode
  const { data: tieredPricing = [], isLoading: tieredPricingLoading } = useQuery<any[]>({
    queryKey: ['/api/products', id, 'tiered-pricing'],
    enabled: isEditMode,
  });

  // Fetch common data
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['/api/categories'],
  });

  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
  });

  const { data: suppliers = [] } = useQuery<any[]>({
    queryKey: ['/api/suppliers'],
  });

  const { data: packingMaterials = [] } = useQuery<any[]>({
    queryKey: ['/api/packing-materials'],
  });

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      quantity: 0,
      lowStockAlert: 5,
      categoryId: isEditMode ? undefined : (categoryIdFromUrl || undefined),
    },
  });

  const tierForm = useForm<z.infer<typeof tieredPricingSchema>>({
    resolver: zodResolver(tieredPricingSchema),
    defaultValues: {
      priceType: 'tiered',
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
      const filledFields = [
        importCostUsd ? 'USD' : null,
        importCostCzk ? 'CZK' : null,
        importCostEur ? 'EUR' : null,
      ].filter(Boolean);

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
      const filledFields = [
        seriesImportCostUsd ? 'USD' : null,
        seriesImportCostCzk ? 'CZK' : null,
        seriesImportCostEur ? 'EUR' : null,
      ].filter(Boolean);

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

  // Prefill form when product data is loaded (edit mode)
  useEffect(() => {
    if (isEditMode && product) {
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
        barcode: product.barcode || '',
        length: product.length ? parseFloat(product.length) : undefined,
        width: product.width ? parseFloat(product.width) : undefined,
        height: product.height ? parseFloat(product.height) : undefined,
        weight: product.weight ? parseFloat(product.weight) : undefined,
        warehouseLocation: product.warehouseLocation || '',
        packingMaterialId: product.packingMaterialId || '',
      });
      
      setPackingInstructionsTexts(product.packingInstructionsTexts || []);
      setPackingInstructionsImages(product.packingInstructionsImages || []);
      
      // Map existing product images
      if (product.images && Array.isArray(product.images)) {
        const mappedImages: ProductImage[] = product.images.map((img: any) => ({
          preview: img.url,
          url: img.url,
          purpose: img.purpose || 'main',
          isPrimary: img.isPrimary || false,
        }));
        setProductImages(mappedImages);
      } else if (product.imageUrl) {
        setProductImages([{
          preview: product.imageUrl,
          url: product.imageUrl,
          purpose: 'main',
          isPrimary: true,
        }]);
      }
    }
  }, [product, form, isEditMode]);

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      // Upload all product images
      if (productImages.length > 0) {
        const uploadedImages = [];
        let totalOriginalSize = 0;
        let totalCompressedSize = 0;
        
        for (const img of productImages) {
          if (img.file) {
            const formData = new FormData();
            formData.append('image', img.file);
            
            const uploadResponse = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            });
            
            if (!uploadResponse.ok) {
              throw new Error('Failed to upload image');
            }
            
            const uploadResult = await uploadResponse.json();
            
            uploadedImages.push({
              url: uploadResult.imageUrl,
              purpose: img.purpose,
              isPrimary: img.isPrimary,
            });
            
            if (uploadResult.compressionInfo) {
              totalOriginalSize += uploadResult.compressionInfo.originalSize;
              totalCompressedSize += uploadResult.compressionInfo.compressedSize;
            }
            
            if (img.isPrimary) {
              data.imageUrl = uploadResult.imageUrl;
            }
          } else if (img.url) {
            // Existing image from edit mode
            uploadedImages.push({
              url: img.url,
              purpose: img.purpose,
              isPrimary: img.isPrimary,
            });
            if (img.isPrimary) {
              data.imageUrl = img.url;
            }
          }
        }
        
        data.images = uploadedImages;
        
        if (totalOriginalSize > 0) {
          const originalKB = (totalOriginalSize / 1024).toFixed(2);
          const compressedKB = (totalCompressedSize / 1024).toFixed(2);
          const savedPercent = Math.round(((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100);
          
          toast({
            title: `${productImages.filter(img => img.file).length} Images Compressed`,
            description: `${originalKB} KB → ${compressedKB} KB (${savedPercent}% saved)`,
          });
        }
      }
      
      if (imageFile && productImages.length === 0) {
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

  const updateProductMutation = useMutation({
    mutationFn: async (data: any) => {
      // Upload all product images
      if (productImages.length > 0) {
        const uploadedImages = [];
        let totalOriginalSize = 0;
        let totalCompressedSize = 0;
        
        for (const img of productImages) {
          if (img.file) {
            const formData = new FormData();
            formData.append('image', img.file);
            
            const uploadResponse = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            });
            
            if (!uploadResponse.ok) {
              throw new Error('Failed to upload image');
            }
            
            const uploadResult = await uploadResponse.json();
            
            uploadedImages.push({
              url: uploadResult.imageUrl,
              purpose: img.purpose,
              isPrimary: img.isPrimary,
            });
            
            if (uploadResult.compressionInfo) {
              totalOriginalSize += uploadResult.compressionInfo.originalSize;
              totalCompressedSize += uploadResult.compressionInfo.compressedSize;
            }
            
            if (img.isPrimary) {
              data.imageUrl = uploadResult.imageUrl;
            }
          } else if (img.url) {
            uploadedImages.push({
              url: img.url,
              purpose: img.purpose,
              isPrimary: img.isPrimary,
            });
            if (img.isPrimary) {
              data.imageUrl = img.url;
            }
          }
        }
        
        data.images = uploadedImages;
        
        if (totalOriginalSize > 0) {
          const originalKB = (totalOriginalSize / 1024).toFixed(2);
          const compressedKB = (totalCompressedSize / 1024).toFixed(2);
          const savedPercent = Math.round(((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100);
          
          toast({
            title: `${productImages.filter(img => img.file).length} New Images Compressed`,
            description: `${originalKB} KB → ${compressedKB} KB (${savedPercent}% saved)`,
          });
        }
      }
      
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

  // Tiered pricing mutations (edit mode only)
  const createTieredPricingMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', `/api/products/${id}/tiered-pricing`, data);
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
      toast({
        title: "Error",
        description: "Failed to add tiered pricing",
        variant: "destructive",
      });
    },
  });

  const updateTieredPricingMutation = useMutation({
    mutationFn: async ({ tierId, data }: { tierId: string; data: any }) => {
      return await apiRequest('PATCH', `/api/products/${id}/tiered-pricing/${tierId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', id, 'tiered-pricing'] });
      toast({
        title: "Success",
        description: "Tiered pricing updated successfully",
      });
      setTieredPricingDialogOpen(false);
      tierForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update tiered pricing",
        variant: "destructive",
      });
    },
  });

  const deleteTieredPricingMutation = useMutation({
    mutationFn: async (tierId: string) => {
      return await apiRequest('DELETE', `/api/products/${id}/tiered-pricing/${tierId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', id, 'tiered-pricing'] });
      toast({
        title: "Success",
        description: "Tiered pricing deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete tiered pricing",
        variant: "destructive",
      });
    },
  });

  // Form submission
  const onSubmit = async (data: z.infer<typeof productSchema>) => {
    const productData = {
      ...data,
      packingInstructionsTexts,
      packingInstructionsImages,
      variants: variants.map(v => ({
        ...v,
        importCostUsd: v.importCostUsd ? parseFloat(v.importCostUsd) : undefined,
        importCostCzk: v.importCostCzk ? parseFloat(v.importCostCzk) : undefined,
        importCostEur: v.importCostEur ? parseFloat(v.importCostEur) : undefined,
      })),
      categoryId: data.categoryId || undefined,
      warehouseId: data.warehouseId || undefined,
      supplierId: data.supplierId || undefined,
      barcode: data.barcode || undefined,
      warehouseLocation: data.warehouseLocation || undefined,
      packingMaterialId: data.packingMaterialId || undefined,
    };

    if (isEditMode) {
      updateProductMutation.mutate(productData);
    } else {
      createProductMutation.mutate(productData);
    }
  };

  // Image handling functions
  const handleAddImage = (files: FileList | null, purpose: ImagePurpose = 'main') => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const preview = URL.createObjectURL(file);
    
    const newImage: ProductImage = {
      file,
      preview,
      purpose,
      isPrimary: productImages.length === 0,
    };
    
    setProductImages([...productImages, newImage]);
    
    toast({
      title: "Image Added",
      description: `Added ${IMAGE_PURPOSE_CONFIG[purpose].label}`,
    });
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...productImages];
    if (newImages[index].preview && newImages[index].file) {
      URL.revokeObjectURL(newImages[index].preview);
    }
    newImages.splice(index, 1);
    
    if (newImages.length > 0 && !newImages.some(img => img.isPrimary)) {
      newImages[0].isPrimary = true;
    }
    
    setProductImages(newImages);
  };

  const handleSetPrimary = (index: number) => {
    const newImages = productImages.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }));
    setProductImages(newImages);
    
    toast({
      title: "Primary Image Set",
      description: "This image will be used as the main product image",
    });
  };

  const handleChangePurpose = (index: number, purpose: ImagePurpose) => {
    const newImages = [...productImages];
    newImages[index] = { ...newImages[index], purpose };
    setProductImages(newImages);
  };

  const generateSKU = () => {
    const categoryName = categories?.find((c: any) => c.id === form.watch('categoryId'))?.name || 'PRODUCT';
    const productName = form.watch('name') || 'ITEM';
    
    const categoryPart = categoryName.slice(0, 3).toUpperCase();
    const productPart = productName.slice(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    const baseSKU = `X-${categoryPart}-${productPart}`;
    form.setValue('sku', baseSKU);
  };

  // Variant functions
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

  const getPrimaryProductImage = () => {
    const primaryImage = productImages.find(img => img.isPrimary);
    if (primaryImage) return primaryImage.preview || primaryImage.url;
    if (product?.images && Array.isArray(product.images)) {
      const dbPrimaryImage = product.images.find((img: any) => img.isPrimary);
      if (dbPrimaryImage) return dbPrimaryImage.url;
    }
    return product?.imageUrl || null;
  };

  const handleVariantImageUpload = async (variantId: string, file: File) => {
    setVariantImageLoading(prev => ({ ...prev, [variantId]: true }));
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }
      
      const uploadResult = await uploadResponse.json();
      
      setVariants(prev => prev.map(v => 
        v.id === variantId ? { ...v, imageUrl: uploadResult.imageUrl } : v
      ));
      
      toast({
        title: "Success",
        description: "Variant image uploaded successfully",
      });
    } catch (error) {
      console.error('Variant image upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload variant image",
        variant: "destructive",
      });
    } finally {
      setVariantImageLoading(prev => ({ ...prev, [variantId]: false }));
    }
  };

  const handleVariantImageRemove = (variantId: string) => {
    setVariants(prev => prev.map(v => 
      v.id === variantId ? { ...v, imageUrl: undefined } : v
    ));
  };

  // Tiered pricing functions (edit mode only)
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

  if (isEditMode && productLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Skeleton className="h-8 w-64" />
      </div>
    );
  }

  if (isEditMode && !product) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Product not found</div>
      </div>
    );
  }

  const pageTitle = isEditMode ? "Edit Product" : "Add New Product";
  const pageDescription = isEditMode ? "Update product details and settings" : "Create a new product with details";
  const submitButtonText = isEditMode ? "Update Product" : "Create Product";
  const submitIcon = isEditMode ? Pencil : Plus;
  const isPending = isEditMode ? updateProductMutation.isPending : createProductMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-4 md:py-6 max-w-7xl">
        {/* Header */}
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
                  {isEditMode ? <Pencil className="h-5 w-5 md:h-6 md:w-6 text-blue-600" /> : <Plus className="h-5 w-5 md:h-6 md:w-6 text-emerald-600" />}
                  {pageTitle}
                </h1>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  {pageDescription}
                </p>
              </div>
            </div>
            <Badge variant="outline" className={isEditMode ? "text-blue-600 border-blue-600" : "text-emerald-600 border-emerald-600"}>
              {isEditMode ? <><Pencil className="h-3 w-3 mr-1" />Edit Mode</> : <><Plus className="h-3 w-3 mr-1" />Add Mode</>}
            </Badge>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Summary Card (Edit mode only) */}
          {isEditMode && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg">
                      <ImageIcon className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Images</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100" data-testid="text-image-count">{productImages.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg">
                      <Tag className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Variants</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100" data-testid="text-variant-count">{variants.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg">
                      <BarChart className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Stock</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100" data-testid="text-stock">{product?.quantity || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg">
                      <DollarSign className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Tiered Prices</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100" data-testid="text-tier-count">{tieredPricing.length}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Accordion Sections */}
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
                    <p className="text-xs text-slate-500 dark:text-slate-400">Product name, SKU, category, images</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4 pt-2">
                  {/* Multi-Image Upload with Purpose */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <Label className="text-sm font-medium">Product Images</Label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Upload images with specific purposes for different uses
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {productImages.length} image{productImages.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>

                    {/* Image Grid */}
                    {productImages.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                        {productImages.map((img, index) => {
                          const config = IMAGE_PURPOSE_CONFIG[img.purpose];
                          const Icon = config.icon;
                          
                          return (
                            <Card key={index} className="relative group overflow-hidden" data-testid={`card-image-${index}`}>
                              <div className="aspect-square relative">
                                <img
                                  src={img.preview}
                                  alt={config.label}
                                  className="w-full h-full object-cover"
                                />
                                
                                {img.isPrimary && (
                                  <div className="absolute top-2 left-2">
                                    <Badge className="bg-yellow-500 text-white border-0 shadow-lg">
                                      <Star className="h-3 w-3 mr-1 fill-white" />
                                      Primary
                                    </Badge>
                                  </div>
                                )}
                                
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                  onClick={() => handleRemoveImage(index)}
                                  data-testid={`button-remove-image-${index}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                                
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 p-2 z-0">
                                  {!img.isPrimary && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => handleSetPrimary(index)}
                                      className="text-xs h-7"
                                      data-testid={`button-set-primary-${index}`}
                                    >
                                      <Star className="h-3 w-3 mr-1" />
                                      Set Primary
                                    </Button>
                                  )}
                                </div>
                              </div>
                              
                              <div className="p-2 bg-slate-50 dark:bg-slate-900">
                                <Select value={img.purpose} onValueChange={(value) => handleChangePurpose(index, value as ImagePurpose)}>
                                  <SelectTrigger className="h-8 text-xs border-0" data-testid={`select-purpose-${index}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(IMAGE_PURPOSE_CONFIG).map(([key, cfg]) => {
                                      const PurposeIcon = cfg.icon;
                                      return (
                                        <SelectItem key={key} value={key}>
                                          <div className="flex items-center gap-2">
                                            <PurposeIcon className="h-4 w-4" />
                                            <div>
                                              <div className="font-medium">{cfg.label}</div>
                                              <div className="text-xs text-slate-500">{cfg.description}</div>
                                            </div>
                                          </div>
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}

                    {/* Upload Options */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                      {Object.entries(IMAGE_PURPOSE_CONFIG)
                        .filter(([key]) => !productImages.some(img => img.purpose === key))
                        .map(([key, config]) => {
                        const Icon = config.icon;
                        
                        return (
                          <div key={key} className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleAddImage(e.target.files, key as ImagePurpose)}
                              className="hidden"
                              id={`image-upload-${key}`}
                              data-testid={`input-image-${key}`}
                            />
                            <label htmlFor={`image-upload-${key}`}>
                              <Card className={`h-32 cursor-pointer hover:shadow-lg transition-all border-2 ${config.color} hover:scale-[1.02] relative overflow-hidden`}>
                                <CardContent className="p-3 relative z-10 h-full">
                                  <div className="flex flex-col items-center text-center gap-2 h-full justify-center">
                                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                      <Icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <div className="font-medium text-xs leading-tight">{config.label}</div>
                                      <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">{config.description}</div>
                                    </div>
                                    <Upload className="h-3 w-3 opacity-60" />
                                  </div>
                                </CardContent>
                              </Card>
                            </label>
                          </div>
                        );
                      })}
                    </div>

                    {productImages.length === 0 && (
                      <div className="text-center py-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                        <ImageIcon className="h-10 w-10 mx-auto mb-2 text-slate-400" />
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">No images added yet</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Upload images by clicking the cards above</p>
                      </div>
                    )}

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Images are automatically compressed on upload. First image is primary by default.
                    </p>
                  </div>

                  {/* Product Name & English Name (if edit mode) */}
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

                    {isEditMode && (
                      <div>
                        <Label htmlFor="englishName" className="text-sm font-medium">English Name</Label>
                        <Input
                          {...form.register('englishName')}
                          placeholder="Enter English name (optional)"
                          data-testid="input-english-name"
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>

                  {/* SKU & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  </div>

                  {/* Warehouse & Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <Label htmlFor="warehouseLocation" className="text-sm font-medium">Warehouse Location Code</Label>
                      <Input
                        {...form.register('warehouseLocation')}
                        placeholder="WH1-A01-R02-L03"
                        data-testid="input-location"
                        className="mt-1 font-mono"
                        onBlur={(e) => {
                          const value = e.target.value.trim().toUpperCase();
                          if (value) {
                            form.setValue('warehouseLocation', value);
                          }
                        }}
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Format: Warehouse-Aisle-Rack-Level
                      </p>
                    </div>
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

            {/* Stock & Inventory */}
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
                  
                  {/* Edit mode: Product Locations */}
                  {isEditMode && product && (
                    <div className="pt-2">
                      <ProductLocations productId={id!} />
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Pricing & Costs */}
            <AccordionItem value="pricing" className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                    <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">Pricing & Costs</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Sales prices, import costs</p>
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
                      
                      {isEditMode && (
                        <>
                          <div>
                            <Label htmlFor="priceUsd" className="text-xs text-slate-500">USD</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              {...form.register('priceUsd')}
                              placeholder="0.00"
                              data-testid="input-price-usd"
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="priceVnd" className="text-xs text-slate-500">VND</Label>
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              {...form.register('priceVnd')}
                              placeholder="0"
                              data-testid="input-price-vnd"
                              className="mt-1"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="priceCny" className="text-xs text-slate-500">CNY</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              {...form.register('priceCny')}
                              placeholder="0.00"
                              data-testid="input-price-cny"
                              className="mt-1"
                            />
                          </div>
                        </>
                      )}
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
                  
                  {/* Edit mode: Cost History Chart */}
                  {isEditMode && costHistory && costHistory.length > 0 && (
                    <div className="pt-2">
                      <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-amber-600" />
                        Cost History
                      </Label>
                      <CostHistoryChart costHistory={costHistory} />
                    </div>
                  )}
                  
                  {/* Edit mode: Tiered Pricing */}
                  {isEditMode && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-amber-600" />
                          Tiered Pricing
                        </Label>
                        <Dialog open={tieredPricingDialogOpen} onOpenChange={setTieredPricingDialogOpen}>
                          <DialogTrigger asChild>
                            <Button type="button" size="sm" variant="outline" data-testid="button-add-tier">
                              <Plus className="h-4 w-4 mr-1" />
                              Add Tier
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                              <DialogTitle>{editingTier ? 'Edit' : 'Add'} Tiered Pricing</DialogTitle>
                              <DialogDescription>
                                Set prices for different quantity ranges
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={tierForm.handleSubmit(onTierSubmit)} className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="minQuantity">Min Quantity *</Label>
                                  <Input
                                    type="number"
                                    {...tierForm.register('minQuantity')}
                                    placeholder="1"
                                    data-testid="input-tier-min-qty"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="maxQuantity">Max Quantity</Label>
                                  <Input
                                    type="number"
                                    {...tierForm.register('maxQuantity')}
                                    placeholder="999"
                                    data-testid="input-tier-max-qty"
                                  />
                                </div>
                              </div>
                              
                              <div>
                                <Label htmlFor="priceType">Price Type</Label>
                                <Select value={tierForm.watch('priceType')} onValueChange={(value) => tierForm.setValue('priceType', value as 'tiered' | 'wholesale')}>
                                  <SelectTrigger data-testid="select-tier-type">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="tiered">Tiered (per unit)</SelectItem>
                                    <SelectItem value="wholesale">Wholesale (total)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">CZK</Label>
                                  <Input type="number" step="0.01" {...tierForm.register('priceCzk')} placeholder="0.00" data-testid="input-tier-czk" />
                                </div>
                                <div>
                                  <Label className="text-xs">EUR</Label>
                                  <Input type="number" step="0.01" {...tierForm.register('priceEur')} placeholder="0.00" data-testid="input-tier-eur" />
                                </div>
                                <div>
                                  <Label className="text-xs">USD</Label>
                                  <Input type="number" step="0.01" {...tierForm.register('priceUsd')} placeholder="0.00" data-testid="input-tier-usd" />
                                </div>
                                <div>
                                  <Label className="text-xs">VND</Label>
                                  <Input type="number" {...tierForm.register('priceVnd')} placeholder="0" data-testid="input-tier-vnd" />
                                </div>
                                <div>
                                  <Label className="text-xs">CNY</Label>
                                  <Input type="number" step="0.01" {...tierForm.register('priceCny')} placeholder="0.00" data-testid="input-tier-cny" />
                                </div>
                              </div>
                              
                              <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setTieredPricingDialogOpen(false)} data-testid="button-cancel-tier">
                                  Cancel
                                </Button>
                                <Button type="submit" data-testid="button-save-tier">
                                  {editingTier ? 'Update' : 'Add'} Tier
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                      
                      {tieredPricing.length > 0 ? (
                        <div className="space-y-2">
                          {tieredPricing.map((tier: any) => (
                            <Card key={tier.id} className="p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">{tier.priceType === 'wholesale' ? 'Wholesale' : 'Tiered'}</Badge>
                                    <span className="text-sm font-medium">
                                      {tier.minQuantity}{tier.maxQuantity ? ` - ${tier.maxQuantity}` : '+'} units
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex gap-2 flex-wrap">
                                    {tier.priceCzk && <span>CZK {parseFloat(tier.priceCzk).toFixed(2)}</span>}
                                    {tier.priceEur && <span>EUR {parseFloat(tier.priceEur).toFixed(2)}</span>}
                                    {tier.priceUsd && <span>USD {parseFloat(tier.priceUsd).toFixed(2)}</span>}
                                    {tier.priceVnd && <span>VND {parseFloat(tier.priceVnd).toFixed(0)}</span>}
                                    {tier.priceCny && <span>CNY {parseFloat(tier.priceCny).toFixed(2)}</span>}
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditTierDialog(tier)}
                                    data-testid={`button-edit-tier-${tier.id}`}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        data-testid={`button-delete-tier-${tier.id}`}
                                      >
                                        <Trash2 className="h-4 w-4 text-red-600" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Tiered Pricing</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete this pricing tier?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteTieredPricingMutation.mutate(tier.id)}>
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 text-center py-4">No tiered pricing configured</p>
                      )}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Supplier Information */}
            <AccordionItem value="supplier" className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                    <Building className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">Supplier Information</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Supplier details and contact</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4 pt-2">
                  {/* Supplier Selector */}
                  <div>
                    <Label htmlFor="supplierId" className="text-sm font-medium">Select Supplier</Label>
                    <Select value={form.watch('supplierId')} onValueChange={(value) => form.setValue('supplierId', value)}>
                      <SelectTrigger data-testid="select-supplier" className="mt-1">
                        <SelectValue placeholder="Select a supplier" />
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

                  {/* Selected Supplier Details */}
                  {(() => {
                    if (!selectedSupplier) {
                      return (
                        <div className="text-center py-8 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                          <Building className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-sm text-slate-500 dark:text-slate-400">No supplier selected</p>
                        </div>
                      );
                    }

                    return (
                      <div className="bg-emerald-50 dark:bg-emerald-950 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                        <div className="space-y-3">
                          {/* Supplier Name */}
                          <div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100" data-testid="text-supplier-name">
                              {selectedSupplier.name}
                            </h4>
                          </div>

                          {/* Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                            {/* Contact Person */}
                            {selectedSupplier.contactPerson && (
                              <div className="flex items-start gap-2">
                                <Users className="h-4 w-4 text-slate-600 dark:text-slate-400 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs text-slate-600 dark:text-slate-400">Contact Person</p>
                                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100" data-testid="text-contact-person">
                                    {selectedSupplier.contactPerson}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Email */}
                            {selectedSupplier.email && (
                              <div className="flex items-start gap-2">
                                <Mail className="h-4 w-4 text-slate-600 dark:text-slate-400 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs text-slate-600 dark:text-slate-400">Email</p>
                                  <a 
                                    href={`mailto:${selectedSupplier.email}`}
                                    className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                                    data-testid="link-supplier-email"
                                  >
                                    {selectedSupplier.email}
                                  </a>
                                </div>
                              </div>
                            )}

                            {/* Phone */}
                            {selectedSupplier.phone && (
                              <div className="flex items-start gap-2">
                                <Phone className="h-4 w-4 text-slate-600 dark:text-slate-400 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs text-slate-600 dark:text-slate-400">Phone</p>
                                  <a 
                                    href={`tel:${selectedSupplier.phone}`}
                                    className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                                    data-testid="link-supplier-phone"
                                  >
                                    {selectedSupplier.phone}
                                  </a>
                                </div>
                              </div>
                            )}

                            {/* Country */}
                            {selectedSupplier.country && (
                              <div className="flex items-start gap-2">
                                <Globe className="h-4 w-4 text-slate-600 dark:text-slate-400 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs text-slate-600 dark:text-slate-400">Country</p>
                                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100" data-testid="text-supplier-country">
                                    {selectedSupplier.country}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Website */}
                            {selectedSupplier.website && (
                              <div className="flex items-start gap-2">
                                <LinkIcon className="h-4 w-4 text-slate-600 dark:text-slate-400 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs text-slate-600 dark:text-slate-400">Website</p>
                                  <a 
                                    href={selectedSupplier.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                                    data-testid="link-supplier-website"
                                  >
                                    {selectedSupplier.website}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              </div>
                            )}

                            {/* Supplier Link */}
                            {selectedSupplier.supplierLink && (
                              <div className="flex items-start gap-2">
                                <LinkIcon className="h-4 w-4 text-slate-600 dark:text-slate-400 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs text-slate-600 dark:text-slate-400">Supplier Link</p>
                                  <a 
                                    href={selectedSupplier.supplierLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                                    data-testid="link-supplier-link"
                                  >
                                    View Link
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              </div>
                            )}

                            {/* Address */}
                            {selectedSupplier.address && (
                              <div className="flex items-start gap-2 md:col-span-2">
                                <MapPin className="h-4 w-4 text-slate-600 dark:text-slate-400 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs text-slate-600 dark:text-slate-400">Address</p>
                                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100" data-testid="text-supplier-address">
                                    {selectedSupplier.address}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {form.watch('supplierId') && (
                      <Link href={`/suppliers/${form.watch('supplierId')}`}>
                        <Button type="button" variant="outline" size="sm" data-testid="button-view-supplier">
                          <Building className="h-4 w-4 mr-2" />
                          View Supplier Details
                        </Button>
                      </Link>
                    )}
                    <Link href="/suppliers/new">
                      <Button type="button" variant="outline" size="sm" data-testid="button-add-supplier">
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Supplier
                      </Button>
                    </Link>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Product Variants */}
            <AccordionItem value="variants" className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center gap-4 text-left w-full">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Tag className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">Product Variants</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Manage product variations and barcodes</p>
                  </div>
                  <Badge variant="secondary">{variants.length}</Badge>
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
                          <DialogDescription>Add a single variant or create a series</DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="variant-name">Variant Name</Label>
                            <Input
                              id="variant-name"
                              value={newVariant.name}
                              onChange={(e) => setNewVariant((prev) => ({ ...prev, name: e.target.value }))}
                              placeholder="e.g., Size XL"
                              data-testid="input-variant-name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="variant-barcode">Barcode</Label>
                            <Input
                              id="variant-barcode"
                              value={newVariant.barcode}
                              onChange={(e) => setNewVariant((prev) => ({ ...prev, barcode: e.target.value }))}
                              placeholder="123456789012"
                              data-testid="input-variant-barcode"
                            />
                          </div>
                          <Button onClick={addVariant} disabled={!newVariant.name.trim()} className="w-full" data-testid="button-save-variant">
                            Add Variant
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsBulkScanDialogOpen(true)}
                      disabled={variants.filter(v => !v.barcode).length === 0}
                      data-testid="button-bulk-scan"
                    >
                      <Barcode className="h-4 w-4 mr-2" />
                      Bulk Scan Barcodes
                    </Button>
                    
                    {selectedVariants.length > 0 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" variant="destructive" size="sm" data-testid="button-delete-selected">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Selected ({selectedVariants.length})
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Variants</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {selectedVariants.length} variant(s)?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={bulkDeleteVariants}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>

                  {/* Variants Table */}
                  {variants.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={selectedVariants.length === variants.length && variants.length > 0}
                                onCheckedChange={toggleSelectAll}
                                data-testid="checkbox-select-all"
                              />
                            </TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Barcode</TableHead>
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
                                  data-testid={`checkbox-variant-${variant.id}`}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={variant.name}
                                  onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                                  className="h-8"
                                  data-testid={`input-variant-name-${variant.id}`}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={variant.barcode}
                                  onChange={(e) => updateVariant(variant.id, 'barcode', e.target.value)}
                                  className="h-8 font-mono"
                                  placeholder="Scan or enter"
                                  data-testid={`input-variant-barcode-${variant.id}`}
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeVariant(variant.id)}
                                  data-testid={`button-delete-variant-${variant.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50/50 dark:bg-slate-900/50">
                      <Tag className="h-10 w-10 mx-auto mb-2 text-slate-400" />
                      <p className="text-sm text-slate-600 dark:text-slate-400">No variants added yet</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Click "Add Variant" to create product variations</p>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Packing & Shipping Details */}
            <AccordionItem value="packing" className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <PackageOpen className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">Packing & Shipping Details</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Dimensions, materials, and handling instructions</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-6 pt-2">
                  {/* Physical Specifications */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Ruler className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Physical Specifications</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <Label htmlFor="length" className="text-sm font-medium">Length (cm)</Label>
                        <Input type="number" step="0.1" min="0" {...form.register('length')} placeholder="0.0" data-testid="input-length" className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="width" className="text-sm font-medium">Width (cm)</Label>
                        <Input type="number" step="0.1" min="0" {...form.register('width')} placeholder="0.0" data-testid="input-width" className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="height" className="text-sm font-medium">Height (cm)</Label>
                        <Input type="number" step="0.1" min="0" {...form.register('height')} placeholder="0.0" data-testid="input-height" className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="weight" className="text-sm font-medium">Weight (kg)</Label>
                        <Input type="number" step="0.01" min="0" {...form.register('weight')} placeholder="0.00" data-testid="input-weight" className="mt-1" />
                      </div>
                    </div>
                  </div>

                  {/* Packing Material */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Packing Material</h4>
                    </div>
                    <Select value={form.watch('packingMaterialId')} onValueChange={(value) => form.setValue('packingMaterialId', value)}>
                      <SelectTrigger data-testid="select-packing-material">
                        <SelectValue placeholder="Select packing material" />
                      </SelectTrigger>
                      <SelectContent>
                        {packingMaterials?.map((material: any) => (
                          <SelectItem key={material.id} value={material.id}>
                            {material.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Separator */}
                  <Separator />

                  {/* Handling Instructions */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <PackageOpen className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Handling Instructions</h4>
                    </div>
                    <PackingInstructionsUploader
                      packingInstructionsTexts={packingInstructionsTexts}
                      setPackingInstructionsTexts={setPackingInstructionsTexts}
                      packingInstructionsImages={packingInstructionsImages}
                      setPackingInstructionsImages={setPackingInstructionsImages}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Edit mode: Product Files */}
            {isEditMode && product && (
              <AccordionItem value="files" className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg">
                      <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">Product Files & Documents</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Attached files and documentation</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="pt-2">
                    <ProductFiles productId={id!} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>

          {/* Bottom Action Bar */}
          <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t shadow-lg rounded-t-2xl p-4 z-10">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3">
              <Button 
                type="submit" 
                className="flex-1 h-12" 
                disabled={isPending}
                data-testid="button-save-product"
              >
                <Save className="h-4 w-4 mr-2" />
                {isPending ? (isEditMode ? 'Updating...' : 'Creating...') : submitButtonText}
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
