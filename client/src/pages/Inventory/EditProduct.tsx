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
  Euro
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

// Merge schemas - include all fields from both AddProduct and EditProduct
const editProductSchema = z.object({
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

export default function EditProduct() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // All state from AddProduct
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
  
  // Edit-specific state
  const [tieredPricingDialogOpen, setTieredPricingDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<any>(null);
  
  // Auto-conversion state
  const conversionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const seriesConversionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Prefill form when product data is loaded
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
      
      // Map existing product images to productImages state
      if (product.images && Array.isArray(product.images)) {
        const mappedImages: ProductImage[] = product.images.map((img: any) => ({
          preview: img.url,
          url: img.url,
          purpose: img.purpose || 'main',
          isPrimary: img.isPrimary || false,
        }));
        setProductImages(mappedImages);
      } else if (product.imageUrl) {
        // Legacy single image support
        setProductImages([{
          preview: product.imageUrl,
          url: product.imageUrl,
          purpose: 'main',
          isPrimary: true,
        }]);
      }
    }
  }, [product, form]);

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

  const updateProductMutation = useMutation({
    mutationFn: async (data: any) => {
      // Upload all product images
      if (productImages.length > 0) {
        const uploadedImages = [];
        let totalOriginalSize = 0;
        let totalCompressedSize = 0;
        
        for (const img of productImages) {
          if (img.file) {
            // New image - upload it
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
          } else {
            // Existing image - keep it
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
            title: `Images Compressed`,
            description: `${originalKB} KB → ${compressedKB} KB (${savedPercent}% saved)`,
          });
        }
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
                  <Pencil className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                  Edit Product
                </h1>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  Update product details and settings
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-blue-600 border-blue-600 self-start sm:self-center">
              <Pencil className="h-3 w-3 mr-1" />
              Edit Mode
            </Badge>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Product Summary Card */}
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

          {/* Accordion-Based Sections */}
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

                  {/* Product Name & English Name */}
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
                      <Label htmlFor="englishName" className="text-sm font-medium">English Name</Label>
                      <Input
                        {...form.register('englishName')}
                        placeholder="Enter English name (optional)"
                        data-testid="input-english-name"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* SKU & Category */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Stock, Inventory & Locations */}
            <AccordionItem value="stock" className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Warehouse className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">Stock, Inventory & Locations</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Quantity, alerts, barcode, warehouse locations</p>
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

                  <Separator className="my-4" />

                  {/* Product Locations - Embedded */}
                  <ProductLocations productId={id || ''} productName={product?.name} embedded={true} />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Pricing & Tiered Pricing */}
            <AccordionItem value="pricing" className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                    <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">Pricing & Tiered Pricing</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Sales prices, bulk discounts</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4 pt-2">
                  {/* Sales Prices */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Sales Prices</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                          step="0.01"
                          min="0"
                          {...form.register('priceVnd')}
                          placeholder="0.00"
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
                    </div>
                  </div>

                  <Separator />

                  {/* Tiered Pricing Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <Label className="text-sm font-medium">Tiered Pricing</Label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Quantity-based bulk discounts</p>
                      </div>
                      <Button type="button" size="sm" onClick={openAddTierDialog} data-testid="button-add-tier">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Tier
                      </Button>
                    </div>

                    {tieredPricing.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Quantity Range</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Prices</TableHead>
                              <TableHead className="w-12"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tieredPricing.map((tier: any) => (
                              <TableRow key={tier.id}>
                                <TableCell>
                                  {tier.minQuantity} - {tier.maxQuantity || '∞'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{tier.priceType}</Badge>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {tier.priceCzk && `${tier.priceCzk} CZK`}
                                  {tier.priceEur && ` | ${tier.priceEur} EUR`}
                                  {tier.priceUsd && ` | ${tier.priceUsd} USD`}
                                </TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => openEditTierDialog(tier)}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => deleteTieredPricingMutation.mutate(tier.id)}
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
                    ) : (
                      <div className="text-center py-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50/50 dark:bg-slate-900/50">
                        <DollarSign className="h-10 w-10 mx-auto mb-2 text-slate-400" />
                        <p className="text-sm text-slate-600 dark:text-slate-400">No tiered pricing configured</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Click "Add Tier" to create bulk discounts</p>
                      </div>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Import Costs & Cost History */}
            <AccordionItem value="import-costs" className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">Import Costs & History</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Landing costs, cost trends</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4 pt-2">
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

                  {/* Cost History */}
                  {costHistory && costHistory.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-sm font-medium mb-3 block">Cost History</Label>
                        <CostHistoryChart 
                          data-testid="cost-history-chart"
                          data={costHistory || []} 
                          isLoading={costHistoryLoading}
                          currency="€"
                          height={200}
                        />
                      </div>

                      <div className="border rounded-lg overflow-hidden">
                        <Table data-testid="cost-history-table">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Landing Cost/Unit</TableHead>
                              <TableHead>Method</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {costHistory.slice(0, 5).map((history: any) => (
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
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
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

                  {selectedSupplier && (
                    <div className="bg-emerald-50 dark:bg-emerald-950 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100" data-testid="text-supplier-name">
                            {selectedSupplier.name}
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
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
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    {form.watch('supplierId') && (
                      <Link href={`/suppliers/${form.watch('supplierId')}`}>
                        <Button type="button" variant="outline" size="sm" data-testid="button-view-supplier">
                          <Building className="h-4 w-4 mr-2" />
                          View Supplier Details
                        </Button>
                      </Link>
                    )}
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
                    <p className="text-xs text-slate-500 dark:text-slate-400">Manage product variations</p>
                  </div>
                  <div className="flex items-center justify-center">
                    <Badge variant="secondary">{variants.length}</Badge>
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

                      {/* Desktop: Table View */}
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
                    productId={id}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Advanced Settings */}
            <AccordionItem value="advanced" className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <Package className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">Advanced Settings</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Dimensions, packing materials, files, locations</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-6 pt-2">
                  {/* Dimensions & Weight */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Product Dimensions & Weight</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <Label htmlFor="length" className="text-xs text-slate-500">Length (cm)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register('length')}
                          placeholder="0.00"
                          data-testid="input-length"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="width" className="text-xs text-slate-500">Width (cm)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register('width')}
                          placeholder="0.00"
                          data-testid="input-width"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="height" className="text-xs text-slate-500">Height (cm)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register('height')}
                          placeholder="0.00"
                          data-testid="input-height"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="weight" className="text-xs text-slate-500">Weight (kg)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          {...form.register('weight')}
                          placeholder="0.000"
                          data-testid="input-weight"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Packing Material */}
                  <div>
                    <Label htmlFor="packingMaterialId" className="text-sm font-medium">Packing Material</Label>
                    <Select value={form.watch('packingMaterialId') || 'none'} onValueChange={(value) => form.setValue('packingMaterialId', value === 'none' ? '' : value)}>
                      <SelectTrigger data-testid="select-packing-material" className="mt-1">
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

                  <Separator />

                  {/* Product Files */}
                  {id && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Product Files</Label>
                      <ProductFiles productId={id} />
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
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

        {/* Bulk Barcode Dialog */}
        <Dialog open={isBulkScanDialogOpen} onOpenChange={setIsBulkScanDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Barcode Assignment</DialogTitle>
              <DialogDescription>
                Scan or paste multiple barcodes (one per line) to assign them to variants without barcodes
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={bulkBarcodes}
                onChange={(e) => setBulkBarcodes(e.target.value)}
                placeholder="Scan or paste barcodes here&#10;One barcode per line"
                rows={10}
                data-testid="textarea-bulk-barcodes"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsBulkScanDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleBulkBarcodeAssign} data-testid="button-assign-barcodes">
                Assign Barcodes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
    </div>
  );
}
