import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency, convertCurrency, type Currency } from "@/lib/currencyUtils";
import { useInventoryDefaults } from "@/hooks/useAppSettings";
import { useDefaultWarehouseSelection } from "@/hooks/useDefaultWarehouseSelection";
import { useSettings, DEFAULT_BULK_UNITS } from "@/contexts/SettingsContext";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { 
  Upload, 
  Download,
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
  Ruler,
  Check,
  ChevronsUpDown,
  Weight,
  Edit,
  ListPlus,
  Layers
} from "lucide-react";
import { ImagePlaceholder } from "@/components/ImagePlaceholder";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import PackingInstructionsUploader from "@/components/PackingInstructionsUploader";
import PackingMaterialsSelector from "@/components/PackingMaterialsSelector";
import ProductFiles from "@/components/ProductFiles";
import ProductLocations from "@/components/ProductLocations";
import CostHistoryChart from "@/components/products/CostHistoryChart";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

// Translation must be imported at module level for schema
import { i18n } from '@/i18n';

// Unified schema with all fields from both AddProduct and EditProduct
const productSchema = z.object({
  name: z.string().min(1, i18n.t('products:productNameRequired')),
  vietnameseName: z.string().optional(),
  sku: z.string().min(1, i18n.t('products:skuRequired')),
  categoryId: z.string().optional(),
  warehouseId: z.string().optional(),
  warehouseLocation: z.string().optional(),
  supplierId: z.string().optional(),
  description: z.string().optional(),
  quantity: z.coerce.number().min(0).default(0),
  lowStockAlert: z.coerce.number().min(0).default(45),
  lowStockAlertType: z.enum(['percentage', 'amount']).default('percentage'),
  maxStockLevel: z.coerce.number().min(0).optional(),
  priceCzk: z.coerce.number().min(0).optional(),
  priceEur: z.coerce.number().min(0).optional(),
  wholesalePriceCzk: z.coerce.number().min(0).optional(),
  wholesalePriceEur: z.coerce.number().min(0).optional(),
  importCostUsd: z.coerce.number().min(0).optional(),
  importCostCzk: z.coerce.number().min(0).optional(),
  importCostEur: z.coerce.number().min(0).optional(),
  importCostVnd: z.coerce.number().min(0).optional(),
  importCostCny: z.coerce.number().min(0).optional(),
  barcode: z.string().optional(),
  length: z.coerce.number().min(0).optional(),
  width: z.coerce.number().min(0).optional(),
  height: z.coerce.number().min(0).optional(),
  weight: z.coerce.number().min(0).optional(),
  packingMaterialId: z.string().optional(),
  // Multi-unit fields
  sellingUnitName: z.string().optional().default('piece'),
  bulkUnitName: z.string().optional(),
  bulkUnitQty: z.coerce.number().min(1).optional(),
  bulkPriceCzk: z.coerce.number().min(0).optional(),
  bulkPriceEur: z.coerce.number().min(0).optional(),
  allowBulkSales: z.boolean().optional().default(false),
  unitContentsInfo: z.string().optional(),
});

const tieredPricingSchema = z.object({
  minQuantity: z.coerce.number().min(1, i18n.t('products:minimumQuantityRequired')),
  maxQuantity: z.coerce.number().optional(),
  priceCzk: z.coerce.number().min(0).optional(),
  priceEur: z.coerce.number().min(0).optional(),
  priceType: z.enum(['tiered', 'wholesale']).default('tiered'),
}).refine((data) => {
  return data.priceCzk || data.priceEur;
}, {
  message: i18n.t('products:atLeastOnePriceRequired'),
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

const getImagePurposeConfig = (t: any) => ({
  main: {
    label: t('products:images.purposes.main'),
    description: t('products:images.purposes.mainDescription'),
    icon: ImageIcon,
    color: 'text-blue-600 bg-blue-50 border-blue-300',
    uploadedColor: 'text-blue-700 bg-blue-100 border-blue-500',
    bgGradient: 'from-blue-50 to-blue-100',
  },
  in_hand: {
    label: t('products:images.purposes.inHand'),
    description: t('products:images.purposes.inHandDescription'),
    icon: Hand,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-300',
    uploadedColor: 'text-emerald-700 bg-emerald-100 border-emerald-500',
    bgGradient: 'from-emerald-50 to-emerald-100',
  },
  detail: {
    label: t('products:images.purposes.detail'),
    description: t('products:images.purposes.detailDescription'),
    icon: PackageOpen,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-300',
    uploadedColor: 'text-indigo-700 bg-indigo-100 border-indigo-500',
    bgGradient: 'from-indigo-50 to-indigo-100',
  },
  packaging: {
    label: t('products:images.purposes.packaging'),
    description: t('products:images.purposes.packagingDescription'),
    icon: Package,
    color: 'text-orange-600 bg-orange-50 border-orange-300',
    uploadedColor: 'text-orange-700 bg-orange-100 border-orange-500',
    bgGradient: 'from-orange-50 to-orange-100',
  },
  label: {
    label: t('products:images.purposes.label'),
    description: t('products:images.purposes.labelDescription'),
    icon: FileType,
    color: 'text-cyan-600 bg-cyan-50 border-cyan-300',
    uploadedColor: 'text-cyan-700 bg-cyan-100 border-cyan-500',
    bgGradient: 'from-cyan-50 to-cyan-100',
  },
});

export default function ProductForm() {
  const { t } = useTranslation(['products', 'inventory', 'common']);
  const IMAGE_PURPOSE_CONFIG = getImagePurposeConfig(t);
  const params = useParams();
  const id = params.id;
  const isEditMode = !!id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { canViewImportCost: canAccessFinancialData } = useAuth();
  const { lowStockThreshold } = useInventoryDefaults();
  const { inventorySettings } = useSettings();
  
  // Use orchestrator hook for default warehouse selection
  const { value: defaultWarehouse } = useDefaultWarehouseSelection({
    initialValue: isEditMode ? undefined : undefined, // Don't apply in edit mode
  });
  
  // State management
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [variants, setVariants] = useState<Array<{
    id: string;
    name: string;
    barcode: string;
    quantity: number;
    priceUsd: string;
    priceCzk: string;
    priceEur: string;
    importCostUsd: string;
    importCostCzk: string;
    importCostEur: string;
    imageUrl?: string;
  }>>([]);
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  const [variantImageLoading, setVariantImageLoading] = useState<Record<string, boolean>>({});
  const [seriesInput, setSeriesInput] = useState("");
  const [seriesQuantity, setSeriesQuantity] = useState(0);
  const [seriesPriceCzk, setSeriesPriceCzk] = useState("");
  const [seriesPriceEur, setSeriesPriceEur] = useState("");
  const [seriesImportCostUsd, setSeriesImportCostUsd] = useState("");
  const [seriesImportCostCzk, setSeriesImportCostCzk] = useState("");
  const [seriesImportCostEur, setSeriesImportCostEur] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSeriesDialogOpen, setIsSeriesDialogOpen] = useState(false);
  const [isBulkScanDialogOpen, setIsBulkScanDialogOpen] = useState(false);
  const [bulkBarcodes, setBulkBarcodes] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [newVariant, setNewVariant] = useState({
    name: "",
    barcode: "",
    quantity: 0,
    priceUsd: "",
    priceCzk: "",
    priceEur: "",
    importCostUsd: "",
    importCostCzk: "",
    importCostEur: "",
  });
  const [newVariantImageFile, setNewVariantImageFile] = useState<File | null>(null);
  const [newVariantImagePreview, setNewVariantImagePreview] = useState<string | null>(null);
  const [newVariantImageUploading, setNewVariantImageUploading] = useState(false);
  const [packingInstructionsTexts, setPackingInstructionsTexts] = useState<string[]>([]);
  const [packingInstructionsImages, setPackingInstructionsImages] = useState<string[]>([]);
  const [packingMaterials, setPackingMaterials] = useState<Array<{id: string, name: string, quantity?: number}>>([]);
  
  // All available sections
  const ALL_SECTIONS = ["images", "basic", "stock", "pricing", "units", "supplier", "variants", "packing", "files"];
  
  // Load expanded sections from localStorage or default to all expanded
  const [expandedSections, setExpandedSections] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('productForm_expandedSections');
      return saved ? JSON.parse(saved) : ALL_SECTIONS;
    } catch {
      return ALL_SECTIONS;
    }
  });
  
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ preview: string; purpose: string } | null>(null);
  
  // Edit mode specific state
  const [tieredPricingDialogOpen, setTieredPricingDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<any>(null);
  
  // Supplier autocomplete state
  const [supplierPopoverOpen, setSupplierPopoverOpen] = useState(false);
  
  // Inline supplier creation dialog state
  const [addSupplierDialogOpen, setAddSupplierDialogOpen] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({
    name: "",
    email: "",
    phone: "",
    country: "",
    contactPerson: "",
    address: "",
    website: "",
  });
  
  // Auto-conversion refs
  const conversionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const seriesConversionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const salesPriceConversionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const variantConversionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const importCostUpdatingRef = useRef<string | null>(null);
  
  // Manual edit tracking refs - prevent auto-conversion when user manually edits both fields
  const salesPriceManualRef = useRef<{czk: boolean, eur: boolean}>({czk: false, eur: false});
  const wholesalePriceManualRef = useRef<{czk: boolean, eur: boolean}>({czk: false, eur: false});
  const tierPriceManualRef = useRef<{czk: boolean, eur: boolean}>({czk: false, eur: false});

  // Get query parameters from URL (for add mode)
  const searchParams = new URLSearchParams(window.location.search);
  const categoryIdFromUrl = searchParams.get('categoryId');
  const nameFromUrl = searchParams.get('name');
  const returnUrl = searchParams.get('returnUrl');

  // Fetch product data if in edit mode
  const { data: product, isLoading: productLoading, isSuccess: productLoaded } = useQuery<any>({
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

  // Fetch product variants if in edit mode
  const { data: productVariants = [], isSuccess: variantsLoaded } = useQuery<any[]>({
    queryKey: [`/api/products/${id}/variants`],
    enabled: isEditMode && !!id,
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

  const { data: availablePackingMaterials = [] } = useQuery<any[]>({
    queryKey: ['/api/packing-materials'],
  });

  // Fetch locations for quantity sync (edit mode only)
  const { data: productLocations, isSuccess: locationsLoaded } = useQuery<any[]>({
    queryKey: [`/api/products/${id}/locations`],
    enabled: isEditMode && !!id,
  });

  // Helper function to build default values for the form
  const buildDefaultValues = useCallback(() => {
    return {
      quantity: 0,
      lowStockAlert: lowStockThreshold || 45,
      lowStockAlertType: 'percentage' as const,
      maxStockLevel: 100,
      categoryId: isEditMode ? undefined : (categoryIdFromUrl || undefined),
      warehouseId: isEditMode ? undefined : (defaultWarehouse || undefined),
      name: isEditMode ? undefined : (nameFromUrl || undefined),
    };
  }, [lowStockThreshold, categoryIdFromUrl, defaultWarehouse, isEditMode, nameFromUrl]);

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: buildDefaultValues(),
  });

  const tierForm = useForm<z.infer<typeof tieredPricingSchema>>({
    resolver: zodResolver(tieredPricingSchema),
    defaultValues: {
      priceType: 'tiered',
    },
  });

  // Track if initial reset has happened
  const hasResetRef = useRef(false);

  // Reset form with proper defaults after settings finish loading (add mode only, once)
  useEffect(() => {
    if (!isEditMode && !hasResetRef.current && lowStockThreshold !== undefined) {
      if (import.meta.env.DEV) {
        console.log('[ProductForm] Settings loaded, resetting form with defaults:', {
          lowStockThreshold,
          defaultWarehouse,
          categoryIdFromUrl,
          nameFromUrl,
        });
      }
      form.reset(buildDefaultValues());
      // Reset manual edit tracking for new products
      salesPriceManualRef.current = {czk: false, eur: false};
      wholesalePriceManualRef.current = {czk: false, eur: false};
      hasResetRef.current = true;
    }
  }, [lowStockThreshold, defaultWarehouse, buildDefaultValues, form, isEditMode]);

  // Watch import cost fields for auto-conversion
  const importCostUsd = form.watch('importCostUsd');
  const importCostCzk = form.watch('importCostCzk');
  const importCostEur = form.watch('importCostEur');
  
  // Watch sales price fields for auto-conversion
  const priceCzk = form.watch('priceCzk');
  const priceEur = form.watch('priceEur');
  
  // Watch select field values to prevent freezing
  const categoryId = form.watch('categoryId');
  const warehouseId = form.watch('warehouseId');
  const supplierId = form.watch('supplierId');
  const packingMaterialId = form.watch('packingMaterialId');
  const productName = form.watch('name');
  const productQuantity = form.watch('quantity');

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

  // Auto-convert sales prices after 1 second (CZK ↔ EUR only)
  useEffect(() => {
    if (salesPriceConversionTimeoutRef.current) {
      clearTimeout(salesPriceConversionTimeoutRef.current);
    }

    salesPriceConversionTimeoutRef.current = setTimeout(() => {
      const filledFields = [
        priceCzk ? 'CZK' : null,
        priceEur ? 'EUR' : null,
      ].filter(Boolean);

      if (filledFields.length === 1) {
        const sourceCurrency = filledFields[0] as Currency;
        let sourceValue = 0;

        switch (sourceCurrency) {
          case 'CZK':
            sourceValue = parseFloat(String(priceCzk)) || 0;
            break;
          case 'EUR':
            sourceValue = parseFloat(String(priceEur)) || 0;
            break;
        }

        if (sourceValue > 0) {
          if (sourceCurrency !== 'CZK' && !priceCzk) {
            const czkValue = convertCurrency(sourceValue, sourceCurrency, 'CZK');
            form.setValue('priceCzk', parseFloat(czkValue.toFixed(2)));
          }
          if (sourceCurrency !== 'EUR' && !priceEur) {
            const eurValue = convertCurrency(sourceValue, sourceCurrency, 'EUR');
            form.setValue('priceEur', parseFloat(eurValue.toFixed(2)));
          }
        }
      }
    }, 1000);

    return () => {
      if (salesPriceConversionTimeoutRef.current) {
        clearTimeout(salesPriceConversionTimeoutRef.current);
      }
    };
  }, [priceCzk, priceEur, form]);

  // Auto-convert variant import costs after 1 second
  useEffect(() => {
    if (variantConversionTimeoutRef.current) {
      clearTimeout(variantConversionTimeoutRef.current);
    }

    variantConversionTimeoutRef.current = setTimeout(() => {
      const filledFields = [
        newVariant.importCostUsd ? 'USD' : null,
        newVariant.importCostCzk ? 'CZK' : null,
        newVariant.importCostEur ? 'EUR' : null,
      ].filter(Boolean);

      if (filledFields.length === 1) {
        const sourceCurrency = filledFields[0] as Currency;
        let sourceValue = 0;

        switch (sourceCurrency) {
          case 'USD':
            sourceValue = parseFloat(newVariant.importCostUsd) || 0;
            break;
          case 'CZK':
            sourceValue = parseFloat(newVariant.importCostCzk) || 0;
            break;
          case 'EUR':
            sourceValue = parseFloat(newVariant.importCostEur) || 0;
            break;
        }

        if (sourceValue > 0) {
          if (sourceCurrency !== 'USD' && !newVariant.importCostUsd) {
            const usdValue = convertCurrency(sourceValue, sourceCurrency, 'USD');
            setNewVariant((prev) => ({ ...prev, importCostUsd: usdValue.toFixed(2) }));
          }
          if (sourceCurrency !== 'CZK' && !newVariant.importCostCzk) {
            const czkValue = convertCurrency(sourceValue, sourceCurrency, 'CZK');
            setNewVariant((prev) => ({ ...prev, importCostCzk: czkValue.toFixed(2) }));
          }
          if (sourceCurrency !== 'EUR' && !newVariant.importCostEur) {
            const eurValue = convertCurrency(sourceValue, sourceCurrency, 'EUR');
            setNewVariant((prev) => ({ ...prev, importCostEur: eurValue.toFixed(2) }));
          }
        }
      }
    }, 1000);

    return () => {
      if (variantConversionTimeoutRef.current) {
        clearTimeout(variantConversionTimeoutRef.current);
      }
    };
  }, [newVariant.importCostUsd, newVariant.importCostCzk, newVariant.importCostEur]);

  // Auto-convert variant price fields after 1 second (CZK ↔ EUR only)
  const variantPriceConversionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (variantPriceConversionTimeoutRef.current) {
      clearTimeout(variantPriceConversionTimeoutRef.current);
    }

    variantPriceConversionTimeoutRef.current = setTimeout(() => {
      const filledFields = [
        newVariant.priceCzk ? 'CZK' : null,
        newVariant.priceEur ? 'EUR' : null,
      ].filter(Boolean);

      if (filledFields.length === 1) {
        const sourceCurrency = filledFields[0] as Currency;
        let sourceValue = 0;

        switch (sourceCurrency) {
          case 'CZK':
            sourceValue = parseFloat(newVariant.priceCzk) || 0;
            break;
          case 'EUR':
            sourceValue = parseFloat(newVariant.priceEur) || 0;
            break;
        }

        if (sourceValue > 0) {
          if (sourceCurrency !== 'CZK' && !newVariant.priceCzk) {
            const czkValue = convertCurrency(sourceValue, sourceCurrency, 'CZK');
            setNewVariant((prev) => ({ ...prev, priceCzk: czkValue.toFixed(2) }));
          }
          if (sourceCurrency !== 'EUR' && !newVariant.priceEur) {
            const eurValue = convertCurrency(sourceValue, sourceCurrency, 'EUR');
            setNewVariant((prev) => ({ ...prev, priceEur: eurValue.toFixed(2) }));
          }
        }
      }
    }, 1000);

    return () => {
      if (variantPriceConversionTimeoutRef.current) {
        clearTimeout(variantPriceConversionTimeoutRef.current);
      }
    };
  }, [newVariant.priceCzk, newVariant.priceEur]);

  // Auto-convert series price fields after 1 second (CZK ↔ EUR only)
  const seriesPriceConversionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (seriesPriceConversionTimeoutRef.current) {
      clearTimeout(seriesPriceConversionTimeoutRef.current);
    }

    seriesPriceConversionTimeoutRef.current = setTimeout(() => {
      const filledFields = [
        seriesPriceCzk ? 'CZK' : null,
        seriesPriceEur ? 'EUR' : null,
      ].filter(Boolean);

      if (filledFields.length === 1) {
        const sourceCurrency = filledFields[0] as Currency;
        let sourceValue = 0;

        switch (sourceCurrency) {
          case 'CZK':
            sourceValue = parseFloat(seriesPriceCzk) || 0;
            break;
          case 'EUR':
            sourceValue = parseFloat(seriesPriceEur) || 0;
            break;
        }

        if (sourceValue > 0) {
          if (sourceCurrency !== 'CZK' && !seriesPriceCzk) {
            const czkValue = convertCurrency(sourceValue, sourceCurrency, 'CZK');
            setSeriesPriceCzk(czkValue.toFixed(2));
          }
          if (sourceCurrency !== 'EUR' && !seriesPriceEur) {
            const eurValue = convertCurrency(sourceValue, sourceCurrency, 'EUR');
            setSeriesPriceEur(eurValue.toFixed(2));
          }
        }
      }
    }, 1000);

    return () => {
      if (seriesPriceConversionTimeoutRef.current) {
        clearTimeout(seriesPriceConversionTimeoutRef.current);
      }
    };
  }, [seriesPriceCzk, seriesPriceEur]);


  // Auto-set low stock alert to 50% of quantity in add mode
  useEffect(() => {
    if (!isEditMode) {
      const quantity = parseInt(String(productQuantity)) || 0;
      if (quantity > 0) {
        const lowStockValue = Math.floor(quantity * 0.5);
        form.setValue('lowStockAlert', lowStockValue);
      }
    }
  }, [productQuantity, isEditMode, form]);

  // Apply default warehouse for new products when it becomes available
  useEffect(() => {
    if (!isEditMode && defaultWarehouse) {
      form.setValue('warehouseId', defaultWarehouse);
    }
  }, [defaultWarehouse, isEditMode, form]);

  // Save expanded sections to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('productForm_expandedSections', JSON.stringify(expandedSections));
    } catch (error) {
      console.error('Failed to save expanded sections:', error);
    }
  }, [expandedSections]);

  // Prefill form when product data is loaded (edit mode)
  useEffect(() => {
    if (isEditMode && product) {
      // Log product data for debugging in development
      if (import.meta.env.DEV) {
        console.log('[ProductForm] Loading product data for edit:', product);
      }
      
      form.reset({
        // Basic info - ensure strings for text fields
        name: product.name || '',
        vietnameseName: product.vietnameseName || '',
        sku: product.sku || '',
        description: product.description || '',
        barcode: product.barcode || '',
        warehouseLocation: product.warehouseLocation || '',
        
        // ID fields - explicitly convert to strings for Select components
        categoryId: product.categoryId ? String(product.categoryId) : '',
        warehouseId: product.warehouseId ? String(product.warehouseId) : '',
        supplierId: product.supplierId ? String(product.supplierId) : '',
        packingMaterialId: product.packingMaterialId ? String(product.packingMaterialId) : '',
        
        // Inventory fields
        quantity: typeof product.quantity === 'number' ? product.quantity : parseInt(product.quantity) || 0,
        lowStockAlert: typeof product.lowStockAlert === 'number' ? product.lowStockAlert : parseInt(product.lowStockAlert) || 45,
        lowStockAlertType: product.lowStockAlertType || 'percentage',
        maxStockLevel: product.maxStockLevel ? (typeof product.maxStockLevel === 'number' ? product.maxStockLevel : parseInt(product.maxStockLevel)) : 100,
        
        // Pricing fields - parse decimals properly
        priceCzk: product.priceCzk ? parseFloat(String(product.priceCzk)) : undefined,
        priceEur: product.priceEur ? parseFloat(String(product.priceEur)) : undefined,
        wholesalePriceCzk: product.wholesalePriceCzk ? parseFloat(String(product.wholesalePriceCzk)) : undefined,
        wholesalePriceEur: product.wholesalePriceEur ? parseFloat(String(product.wholesalePriceEur)) : undefined,
        importCostUsd: product.importCostUsd ? parseFloat(String(product.importCostUsd)) : undefined,
        importCostCzk: product.importCostCzk ? parseFloat(String(product.importCostCzk)) : undefined,
        importCostEur: product.importCostEur ? parseFloat(String(product.importCostEur)) : undefined,
        importCostVnd: product.importCostVnd ? parseFloat(String(product.importCostVnd)) : undefined,
        importCostCny: product.importCostCny ? parseFloat(String(product.importCostCny)) : undefined,
        
        // Physical dimensions - parse decimals properly
        length: product.length ? parseFloat(String(product.length)) : undefined,
        width: product.width ? parseFloat(String(product.width)) : undefined,
        height: product.height ? parseFloat(String(product.height)) : undefined,
        weight: product.weight ? parseFloat(String(product.weight)) : undefined,
        
        // Multi-unit fields
        sellingUnitName: product.sellingUnitName || 'piece',
        bulkUnitName: product.bulkUnitName || '',
        bulkUnitQty: product.bulkUnitQty ? (typeof product.bulkUnitQty === 'number' ? product.bulkUnitQty : parseInt(String(product.bulkUnitQty))) : undefined,
        bulkPriceCzk: product.bulkPriceCzk ? parseFloat(String(product.bulkPriceCzk)) : undefined,
        bulkPriceEur: product.bulkPriceEur ? parseFloat(String(product.bulkPriceEur)) : undefined,
        allowBulkSales: Boolean(product.allowBulkSales),
        unitContentsInfo: product.unitContentsInfo || '',
      });
      
      // Reset manual edit tracking refs - mark existing prices as "already set"
      // This prevents auto-conversion from overwriting existing values
      salesPriceManualRef.current = {
        czk: !!product.priceCzk,
        eur: !!product.priceEur
      };
      wholesalePriceManualRef.current = {
        czk: !!product.wholesalePriceCzk,
        eur: !!product.wholesalePriceEur
      };
      
      // Set packing instructions state
      setPackingInstructionsTexts(Array.isArray(product.packingInstructionsTexts) ? product.packingInstructionsTexts : []);
      setPackingInstructionsImages(Array.isArray(product.packingInstructionsImages) ? product.packingInstructionsImages : []);
      setPackingMaterials(Array.isArray(product.packingMaterials) ? product.packingMaterials : []);
      
      // Clear existing images before setting new ones to avoid stale data
      setProductImages([]);
      
      // Map existing product images with proper type checking
      if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        const mappedImages: ProductImage[] = product.images.map((img: any) => ({
          preview: img.url || '',
          url: img.url || '',
          purpose: (img.purpose as ImagePurpose) || 'main',
          isPrimary: Boolean(img.isPrimary),
        }));
        setProductImages(mappedImages);
      } else if (product.imageUrl) {
        // Fallback to single imageUrl if images array is empty
        setProductImages([{
          preview: product.imageUrl,
          url: product.imageUrl,
          purpose: 'main',
          isPrimary: true,
        }]);
      }
      
      if (import.meta.env.DEV) {
        console.log('[ProductForm] Form reset complete with values:', form.getValues());
      }
    }
  }, [product, form, isEditMode]);

  // Load variants when fetched (edit mode)
  useEffect(() => {
    if (isEditMode && variantsLoaded && productVariants && productVariants.length > 0) {
      const mappedVariants = productVariants.map((v: any) => ({
        id: v.id,
        name: v.name,
        barcode: v.barcode || '',
        quantity: v.quantity || 0,
        priceUsd: v.priceUsd ? String(v.priceUsd) : '',
        priceCzk: v.priceCzk ? String(v.priceCzk) : '',
        priceEur: v.priceEur ? String(v.priceEur) : '',
        importCostUsd: v.importCostUsd ? String(v.importCostUsd) : '',
        importCostCzk: v.importCostCzk ? String(v.importCostCzk) : '',
        importCostEur: v.importCostEur ? String(v.importCostEur) : '',
        imageUrl: v.imageUrl || undefined,
      }));
      setVariants(mappedVariants);
    }
  }, [productVariants, variantsLoaded, isEditMode]);

  // Auto-sync quantity with warehouse locations
  useEffect(() => {
    if (!isEditMode || !id || !productLoaded || !locationsLoaded || !productLocations) return;
    
    const quantity = parseInt(String(productQuantity)) || 0;
    
    // Calculate total from non-TBA locations
    const nonTbaLocations = productLocations.filter(loc => loc.locationCode !== 'TBA');
    const nonTbaTotal = nonTbaLocations.reduce((sum, loc) => sum + (loc.quantity || 0), 0);
    
    // Calculate difference
    const difference = quantity - nonTbaTotal;
    
    // Find existing TBA location
    const tbaLocation = productLocations.find(loc => loc.locationCode === 'TBA');
    
    // Auto-manage TBA location
    const manageTbaLocation = async () => {
      try {
        if (difference > 0) {
          // Need TBA location with difference quantity
          if (tbaLocation) {
            // Update existing TBA if quantity changed
            if (tbaLocation.quantity !== difference) {
              await apiRequest('PATCH', `/api/products/${id}/locations/${tbaLocation.id}`, {
                quantity: difference
              });
              queryClient.invalidateQueries({ queryKey: [`/api/products/${id}/locations`] });
            }
          } else {
            // Create new TBA location
            await apiRequest('POST', `/api/products/${id}/locations`, {
              locationCode: 'TBA',
              locationType: 'warehouse',
              quantity: difference,
              notes: 'To Be Assigned - automatically created'
            });
            queryClient.invalidateQueries({ queryKey: [`/api/products/${id}/locations`] });
          }
        } else if (tbaLocation && difference <= 0) {
          // Delete TBA if it exists and difference is 0 or negative
          await apiRequest('DELETE', `/api/products/${id}/locations/${tbaLocation.id}`);
          queryClient.invalidateQueries({ queryKey: [`/api/products/${id}/locations`] });
        }
      } catch (error) {
        console.error('Error managing TBA location:', error);
      }
    };
    
    // Debounce to avoid too many API calls
    const timer = setTimeout(() => {
      manageTbaLocation();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [productQuantity, productLocations, locationsLoaded, productLoaded, isEditMode, id, queryClient]);

  // CRITICAL: Synchronize warehouseId with defaultWarehouse when settings load asynchronously
  useEffect(() => {
    // Only auto-set for new products (not edit mode)
    if (!isEditMode && defaultWarehouse) {
      const currentWarehouse = form.getValues('warehouseId');
      // Auto-set default warehouse if no warehouse currently selected
      if (!currentWarehouse) {
        form.setValue('warehouseId', defaultWarehouse);
      }
    }
  }, [defaultWarehouse, isEditMode, form]);

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
              throw new Error(t('products:errors.imageUploadFailed'));
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
            title: t('products:toasts.imagesCompressed', { count: productImages.filter(img => img.file).length }),
            description: `${originalKB} KB → ${compressedKB} KB (${savedPercent}% ${t('common:saved')})`,
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
          throw new Error(t('products:errors.imageUploadFailed'));
        }
        
        const uploadResult = await uploadResponse.json();
        data.imageUrl = uploadResult.imageUrl;
      }
      
      const response = await apiRequest('POST', '/api/products', data);
      return response.json();
    },
    onSuccess: async (createdProduct: any) => {
      // Wait for queries to invalidate and refetch before navigating
      await queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      
      toast({
        title: t('common:success'),
        description: t('products:toasts.productCreated'),
      });
      
      // Small delay to ensure refetch completes
      setTimeout(() => {
        if (returnUrl && createdProduct?.id) {
          // Redirect back to the return URL with the new product ID
          const separator = returnUrl.includes('?') ? '&' : '?';
          setLocation(`${returnUrl}${separator}newProductId=${createdProduct.id}`);
        } else {
          setLocation('/inventory');
        }
      }, 100);
    },
    onError: (error) => {
      console.error("Product creation error:", error);
      toast({
        title: t('common:error'),
        description: t('products:toasts.productCreatedError'),
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
              throw new Error(t('products:errors.imageUploadFailed'));
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
            title: t('products:toasts.newImagesCompressed', { count: productImages.filter(img => img.file).length }),
            description: `${originalKB} KB → ${compressedKB} KB (${savedPercent}% ${t('common:saved')})`,
          });
        }
      }
      
      await apiRequest('PATCH', `/api/products/${id}`, data);
    },
    onSuccess: async () => {
      // Wait for queries to invalidate and refetch before navigating
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/products'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/products', id] }),
        queryClient.invalidateQueries({ queryKey: [`/api/products/${id}/variants`] }),
      ]);
      
      toast({
        title: t('common:success'),
        description: t('products:toasts.productUpdated'),
      });
      
      // Small delay to ensure refetch completes
      setTimeout(() => {
        setLocation('/inventory');
      }, 100);
    },
    onError: (error) => {
      console.error("Product update error:", error);
      toast({
        title: t('common:error'),
        description: t('products:toasts.productUpdatedError'),
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
        title: t('common:success'),
        description: t('products:toasts.tieredPricingAdded'),
      });
      setTieredPricingDialogOpen(false);
      tierForm.reset();
    },
    onError: (error) => {
      toast({
        title: t('common:error'),
        description: t('products:toasts.tieredPricingAddedError'),
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
        title: t('common:success'),
        description: t('products:toasts.tieredPricingUpdated'),
      });
      setTieredPricingDialogOpen(false);
      tierForm.reset();
    },
    onError: (error) => {
      toast({
        title: t('common:error'),
        description: t('products:toasts.tieredPricingUpdatedError'),
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
        title: t('common:success'),
        description: t('products:toasts.tieredPricingDeleted'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common:error'),
        description: t('products:toasts.tieredPricingDeletedError'),
        variant: "destructive",
      });
    },
  });

  // Inline supplier creation mutation
  const createSupplierMutation = useMutation({
    mutationFn: async (data: typeof newSupplierData) => {
      const response = await apiRequest('POST', '/api/suppliers', data);
      return response.json();
    },
    onSuccess: async (newSupplier) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      form.setValue('supplierId', newSupplier.id);
      setAddSupplierDialogOpen(false);
      setNewSupplierData({
        name: "",
        email: "",
        phone: "",
        country: "",
        contactPerson: "",
        address: "",
        website: "",
      });
      toast({
        title: t('common:success'),
        description: t('suppliers:createdSuccessfully', 'Supplier created successfully'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common:error'),
        description: t('suppliers:createError', 'Failed to create supplier'),
        variant: "destructive",
      });
    },
  });

  // Form submission
  const onSubmit = async (data: z.infer<typeof productSchema>) => {
    console.log('Form submitted with data:', data);
    console.log('Category ID:', data.categoryId);
    console.log('Current variants state:', variants);
    
    const productData = {
      ...data,
      packingInstructionsTexts,
      packingInstructionsImages,
      packingMaterials,
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

    console.log('Product data to send:', productData);
    console.log('Variants being sent:', productData.variants);

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
      title: t('products:toasts.imageAdded'),
      description: t('products:toasts.imageAddedDescription', { type: IMAGE_PURPOSE_CONFIG[purpose].label }),
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
      title: t('products:toasts.primaryImageSet'),
      description: t('products:toasts.primaryImageSetDescription'),
    });
  };

  const handleDownloadImage = async (index: number) => {
    const img = productImages[index];
    const imageUrl = img.preview || img.url;
    
    if (!imageUrl) return;
    
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${product?.sku || t('products:defaults.productFallback')}-${IMAGE_PURPOSE_CONFIG[img.purpose].label.toLowerCase().replace(/\s+/g, '-')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: t('products:toasts.imageDownloaded'),
        description: t('products:toasts.imageDownloadedDescription', { type: IMAGE_PURPOSE_CONFIG[img.purpose].label }),
      });
    } catch (error) {
      toast({
        title: t('products:toasts.downloadFailed'),
        description: t('products:toasts.downloadFailedDescription'),
        variant: "destructive",
      });
    }
  };

  const handleChangePurpose = (index: number, purpose: ImagePurpose) => {
    const newImages = [...productImages];
    newImages[index] = { ...newImages[index], purpose };
    setProductImages(newImages);
  };

  const generateSKU = () => {
    // Helper function to remove Vietnamese diacritics and clean text
    const cleanText = (text: string): string => {
      return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
    };
    
    // Get form values
    const name = form.watch('name') || '';
    const vietnameseName = form.watch('vietnameseName') || '';
    const priceCzk = form.watch('priceCzk') || 0;
    const priceEur = form.watch('priceEur') || 0;
    const quantity = form.watch('quantity') || 0;
    
    // 1. Category Part (3 chars)
    const categoryName = categories?.find((c: any) => c.id === categoryId)?.name || t('products:defaults.categoryFallback');
    const categoryPart = cleanText(categoryName).slice(0, 3) || t('products:defaults.categoryFallback');
    
    // 2. Supplier Part (2 chars) - optional
    const supplierName = suppliers?.find((s: any) => s.id === supplierId)?.name || '';
    const supplierPart = supplierName ? cleanText(supplierName).slice(0, 2) : '';
    
    // 3. Product Name Part (4-6 chars) - prefer Vietnamese name if available
    const productText = vietnameseName || name || 'ITEM';
    const words = productText.split(/\s+/).filter(w => w.length > 0);
    let productPart = '';
    
    if (words.length === 1) {
      // Single word: take first 6 characters
      productPart = cleanText(words[0]).slice(0, 6);
    } else if (words.length === 2) {
      // Two words: take first 3 chars of each
      productPart = cleanText(words[0]).slice(0, 3) + cleanText(words[1]).slice(0, 3);
    } else {
      // Multiple words: take first 2 chars of first 3 words
      productPart = words.slice(0, 3).map(w => cleanText(w).slice(0, 2)).join('');
    }
    
    // Ensure product part is not empty
    if (!productPart) {
      productPart = t('products:defaults.productPartFallback');
    }
    
    // 4. Price Tier Indicator (optional) - based on CZK price
    let priceTier = '';
    if (priceCzk > 0) {
      if (priceCzk < 100) priceTier = 'B'; // Budget
      else if (priceCzk < 500) priceTier = 'S'; // Standard
      else if (priceCzk < 1000) priceTier = 'P'; // Premium
      else priceTier = 'L'; // Luxury
    }
    
    // 5. Random suffix for uniqueness (3 digits)
    const randomSuffix = Math.floor(100 + Math.random() * 900).toString();
    
    // 6. Quantity indicator (optional) - for stock level
    let qtyIndicator = '';
    if (quantity > 100) qtyIndicator = 'H'; // High stock
    else if (quantity > 20) qtyIndicator = 'M'; // Medium stock
    else if (quantity > 0) qtyIndicator = 'L'; // Low stock
    
    // Construct SKU with available parts
    let skuParts = [categoryPart];
    
    if (supplierPart) {
      skuParts.push(supplierPart);
    }
    
    skuParts.push(productPart);
    
    if (priceTier) {
      skuParts.push(priceTier);
    }
    
    skuParts.push(randomSuffix);
    
    const baseSKU = skuParts.join('-');
    form.setValue('sku', baseSKU);
    
    toast({
      title: t('products:toasts.skuGenerated'),
      description: t('products:toasts.skuGeneratedDescription', { sku: baseSKU }),
    });
  };

  // Variant functions
  const addVariant = async () => {
    if (newVariant.name.trim()) {
      setNewVariantImageUploading(true);
      
      let imageUrl: string | undefined = undefined;
      
      // Upload image if one is selected
      if (newVariantImageFile) {
        try {
          const formData = new FormData();
          formData.append('image', newVariantImageFile);
          
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });
          
          if (!uploadResponse.ok) {
            throw new Error(t('products:errors.imageUploadFailed'));
          }
          
          const uploadResult = await uploadResponse.json();
          imageUrl = uploadResult.imageUrl;
        } catch (error) {
          console.error('Variant image upload error:', error);
          toast({
            title: t('common:warning'),
            description: t('products:toasts.variantAddedImageFailed'),
            variant: "destructive",
          });
        }
      }
      
      const variantWithId = {
        ...newVariant,
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: newVariant.name.trim(),
        imageUrl,
      };
      
      setVariants([...variants, variantWithId]);
      setNewVariant({
        name: "",
        barcode: "",
        quantity: 0,
        priceUsd: "",
        priceCzk: "",
        priceEur: "",
        importCostUsd: "",
        importCostCzk: "",
        importCostEur: "",
      });
      setNewVariantImageFile(null);
      setNewVariantImagePreview(null);
      setNewVariantImageUploading(false);
      setIsAddDialogOpen(false);
      toast({
        title: t('common:success'),
        description: t('products:toasts.variantAdded'),
      });
    }
  };

  const addVariantSeries = () => {
    if (!seriesInput.trim()) {
      toast({
        title: t('common:error'),
        description: t('products:toasts.enterSeriesPattern'),
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
          title: t('common:error'),
          description: t('products:toasts.seriesRangeTooLarge'),
          variant: "destructive",
        });
        return;
      }
      
      const newVariantsArray = [];
      for (let i = start; i <= end; i++) {
        newVariantsArray.push({
          id: `temp-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
          name: `${baseName} ${i}`,
          barcode: "",
          quantity: seriesQuantity,
          priceUsd: "",
          priceCzk: seriesPriceCzk,
          priceEur: seriesPriceEur,
          importCostUsd: seriesImportCostUsd,
          importCostCzk: seriesImportCostCzk,
          importCostEur: seriesImportCostEur,
        });
      }
      
      setVariants([...variants, ...newVariantsArray]);
      setSeriesInput("");
      setSeriesQuantity(0);
      setSeriesPriceCzk("");
      setSeriesPriceEur("");
      setSeriesImportCostUsd("");
      setSeriesImportCostCzk("");
      setSeriesImportCostEur("");
      setIsSeriesDialogOpen(false);
      toast({
        title: t('common:success'),
        description: t('products:toasts.variantsAdded', { count: newVariantsArray.length }),
      });
    } else {
      toast({
        title: t('common:error'),
        description: t('products:toasts.seriesFormatError'),
        variant: "destructive",
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
        title: t('common:error'),
        description: t('products:toasts.enterAtLeastOneBarcode'),
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
      title: t('common:success'),
      description: t('products:toasts.barcodesAssigned', { count: assignedCount }),
    });

    if (barcodes.length > variantsWithoutBarcode.length) {
      toast({
        title: t('common:info'),
        description: t('products:toasts.barcodesNotAssigned', { count: barcodes.length - variantsWithoutBarcode.length }),
      });
    }
  };

  const removeVariant = (id: string) => {
    setVariants(variants.filter(v => v.id !== id));
    setSelectedVariants(selectedVariants.filter(selectedId => selectedId !== id));
  };

  const bulkDeleteVariants = () => {
    if (selectedVariants.length === 0) return;
    setVariants(variants.filter(v => !selectedVariants.includes(v.id)));
    setSelectedVariants([]);
    toast({
      title: t('common:success'),
      description: t('products:toasts.variantsDeleted', { count: selectedVariants.length }),
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
        throw new Error(t('products:errors.imageUploadFailed'));
      }
      
      const uploadResult = await uploadResponse.json();
      
      setVariants(prev => prev.map(v => 
        v.id === variantId ? { ...v, imageUrl: uploadResult.imageUrl } : v
      ));
      
      toast({
        title: t('common:success'),
        description: t('products:toasts.variantImageUploaded'),
      });
    } catch (error) {
      console.error('Variant image upload error:', error);
      toast({
        title: t('common:error'),
        description: t('products:toasts.variantImageUploadError'),
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
    tierPriceManualRef.current = {czk: false, eur: false};
    setTieredPricingDialogOpen(true);
  };

  const openEditTierDialog = (tier: any) => {
    setEditingTier(tier);
    tierForm.reset({
      minQuantity: tier.minQuantity,
      maxQuantity: tier.maxQuantity || undefined,
      priceCzk: tier.priceCzk ? parseFloat(tier.priceCzk) : undefined,
      priceEur: tier.priceEur ? parseFloat(tier.priceEur) : undefined,
      priceType: tier.priceType || 'tiered',
    });
    // If editing an existing tier with both prices, mark both as manually set
    tierPriceManualRef.current = {
      czk: !!tier.priceCzk,
      eur: !!tier.priceEur
    };
    setTieredPricingDialogOpen(true);
  };

  const handleAddTier = (data: z.infer<typeof tieredPricingSchema>) => {
    const tierData = {
      productId: id,
      minQuantity: Number(data.minQuantity),
      maxQuantity: data.maxQuantity ? Number(data.maxQuantity) : undefined,
      priceCzk: data.priceCzk ? parseFloat(data.priceCzk.toString()) : undefined,
      priceEur: data.priceEur ? parseFloat(data.priceEur.toString()) : undefined,
      priceType: data.priceType
    };
    
    const cleanData = Object.fromEntries(
      Object.entries(tierData).filter(([_, v]) => v !== undefined && v !== null)
    );
    
    createTieredPricingMutation.mutate(cleanData);
  };

  const handleUpdateTier = (tierId: string, data: z.infer<typeof tieredPricingSchema>) => {
    const tierData = {
      minQuantity: Number(data.minQuantity),
      maxQuantity: data.maxQuantity ? Number(data.maxQuantity) : undefined,
      priceCzk: data.priceCzk ? parseFloat(data.priceCzk.toString()) : undefined,
      priceEur: data.priceEur ? parseFloat(data.priceEur.toString()) : undefined,
      priceType: data.priceType
    };
    
    const cleanData = Object.fromEntries(
      Object.entries(tierData).filter(([_, v]) => v !== undefined && v !== null)
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

  const selectedSupplier = suppliers?.find((s: any) => s.id === supplierId);

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
        <div className="text-slate-500">{t('products:productNotFound')}</div>
      </div>
    );
  }

  const pageTitle = isEditMode ? t('products:editProduct') : t('products:addNewProduct');
  const pageDescription = isEditMode ? t('products:editProductDescription') : t('products:addNewProductDescription');
  const submitButtonText = isEditMode ? t('products:updateProduct') : t('products:createProduct');
  const submitIcon = isEditMode ? Pencil : Plus;
  const isPending = isEditMode ? updateProductMutation.isPending : createProductMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 overflow-x-hidden">
      <div className="container mx-auto px-2 sm:px-4 py-3 md:py-6 max-w-7xl">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm mb-4 md:mb-6 p-3 md:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
                data-testid="button-back"
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{t('common:back')}</span>
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
              {isEditMode ? <><Pencil className="h-3 w-3 mr-1" />{t('products:editMode')}</> : <><Plus className="h-3 w-3 mr-1" />{t('products:addMode')}</>}
            </Badge>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
          console.error('Product form validation errors:', errors);
          toast({
            title: t('common:formValidationError'),
            description: t('common:formValidationErrorDescription'),
            variant: "destructive",
          });
        })} className="space-y-4">
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
                      <p className="text-xs text-slate-600 dark:text-slate-400">{t('products:images.title')}</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100" data-testid="text-image-count">{productImages.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg">
                      <Tag className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{t('products:variants.title')}</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100" data-testid="text-variant-count">{variants.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg">
                      <BarChart className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{t('inventory:stock')}</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100" data-testid="text-stock">{product?.quantity || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg">
                      <DollarSign className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{t('products:tieredPricing.title')}</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100" data-testid="text-tier-count">{tieredPricing.length}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Product Images Card - Collapsible */}
          <Accordion type="multiple" value={expandedSections} onValueChange={setExpandedSections} className="space-y-3">
            <AccordionItem value="images" className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <ImageIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t('products:images.title')}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t('products:images.uploadMultiple')}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {t('products:images.count', { count: productImages.length })}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4 pt-2">
                  {/* Image Grid */}
                  {productImages.length > 0 && (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-3">
                      {productImages.map((img, index) => {
                        const config = IMAGE_PURPOSE_CONFIG[img.purpose];
                        const Icon = config.icon;
                        
                        return (
                          <Card key={index} className="relative group overflow-hidden" data-testid={`card-image-${index}`}>
                            <div className="aspect-square relative">
                              <img
                                src={img.preview}
                                alt={config.label}
                                className="w-full h-full object-contain bg-slate-50 dark:bg-slate-900 cursor-pointer"
                                onClick={() => {
                                  setSelectedImage({ preview: img.preview, purpose: img.purpose });
                                  setImageViewerOpen(true);
                                }}
                              />
                              
                              {img.isPrimary && (
                                <div className="absolute top-2 left-2">
                                  <Badge className="bg-yellow-500 text-white border-0 shadow-lg">
                                    <Star className="h-3 w-3 mr-1 fill-white" />
                                    {t('products:images.primary')}
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
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleDownloadImage(index)}
                                  className="text-xs h-7"
                                  data-testid={`button-download-image-${index}`}
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  {t('common:download')}
                                </Button>
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
                                    {t('products:images.setPrimary')}
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 min-h-[60px]">
                              <Select value={img.purpose} onValueChange={(value) => handleChangePurpose(index, value as ImagePurpose)}>
                                <SelectTrigger className="h-auto py-2 text-xs border-0 bg-transparent" data-testid={`select-purpose-${index}`}>
                                  <div className="flex items-center gap-2 w-full">
                                    <Icon className="h-4 w-4 shrink-0 text-slate-600 dark:text-slate-400" />
                                    <div className="font-medium text-slate-900 dark:text-slate-100">{config.label}</div>
                                  </div>
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(IMAGE_PURPOSE_CONFIG).map(([key, cfg]) => {
                                    const PurposeIcon = cfg.icon;
                                    return (
                                      <SelectItem key={key} value={key}>
                                        <div className="flex items-center gap-2 py-1">
                                          <PurposeIcon className="h-4 w-4 shrink-0" />
                                          <div className="font-medium text-sm">{cfg.label}</div>
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

                  {/* Upload Options - Now always showing all categories */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {Object.entries(IMAGE_PURPOSE_CONFIG).map(([key, config]) => {
                      const Icon = config.icon;
                      const categoryCount = productImages.filter(img => img.purpose === key).length;
                      
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
                            <Card className={`h-28 cursor-pointer hover:shadow-lg transition-all border-2 ${config.color} hover:scale-[1.02] relative overflow-hidden`}>
                              <CardContent className="p-3 relative z-10 h-full">
                                <div className="flex flex-col items-center text-center gap-2 h-full justify-center">
                                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                                    <Icon className="h-5 w-5" />
                                  </div>
                                  <div className="font-medium text-xs leading-tight">{config.label}</div>
                                  {categoryCount > 0 && (
                                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                                      {categoryCount}
                                    </Badge>
                                  )}
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
                      <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{t('products:images.noImagesYet')}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{t('products:images.uploadInstruction')}</p>
                    </div>
                  )}

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    {t('products:images.autoCompressInfo')}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

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
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t('products:formSections.basicInfo.title')}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('products:formSections.basicInfo.description')}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4 pt-2">
                  {/* Product Name & English Name */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium">{t('products:formLabels.productName')} *</Label>
                      <Input
                        {...form.register('name')}
                        placeholder={t('products:formLabels.productNamePlaceholder')}
                        data-testid="input-name"
                        className="mt-1"
                      />
                      {form.formState.errors.name && (
                        <p className="text-xs text-red-600 mt-1">{form.formState.errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="vietnameseName" className="text-sm font-medium">{t('products:formLabels.vietnameseName')}</Label>
                      <Input
                        {...form.register('vietnameseName')}
                        placeholder={t('products:formLabels.vietnameseNamePlaceholder')}
                        data-testid="input-vietnamese-name"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* SKU & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="sku" className="text-sm font-medium">{t('products:formLabels.sku')} *</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          {...form.register('sku')}
                          placeholder={t('products:formLabels.skuPlaceholder')}
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
                      <Label htmlFor="categoryId" className="text-sm font-medium">{t('products:category')}</Label>
                      <Select value={categoryId} onValueChange={(value) => form.setValue('categoryId', value)}>
                        <SelectTrigger data-testid="select-category" className="mt-1">
                          <SelectValue placeholder={t('common:select')} />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((category: any) => (
                            <SelectItem key={category.id} value={String(category.id)}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="description" className="text-sm font-medium">{t('products:formLabels.descriptionLabel')}</Label>
                    <Textarea
                      {...form.register('description')}
                      placeholder={t('products:formLabels.descriptionPlaceholder')}
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
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t('products:formSections.stockInventory.title')}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('products:formSections.stockInventory.description')}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="quantity" className="text-sm font-medium">{t('products:formLabels.quantity')}</Label>
                      <Input
                        type="number"
                        min="0"
                        {...form.register('quantity')}
                        data-testid="input-quantity"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="maxStockLevel" className="text-sm font-medium">{t('products:formLabels.maxStockLevel')}</Label>
                      <Input
                        type="number"
                        min="0"
                        {...form.register('maxStockLevel')}
                        data-testid="input-max-stock"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Low Stock Alert Section */}
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <Label className="text-sm font-medium text-amber-900 dark:text-amber-100">{t('products:formLabels.lowStockAlertSettings')}</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="lowStockAlertType" className="text-xs text-amber-700 dark:text-amber-300">{t('products:formLabels.alertType')}</Label>
                        <Select
                          value={form.watch('lowStockAlertType') || 'percentage'}
                          onValueChange={(value: 'percentage' | 'amount') => form.setValue('lowStockAlertType', value)}
                        >
                          <SelectTrigger className="mt-1" data-testid="select-alert-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">{t('products:formLabels.alertTypePercentage')}</SelectItem>
                            <SelectItem value="amount">{t('products:formLabels.alertTypeAmount')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="lowStockAlert" className="text-xs text-amber-700 dark:text-amber-300">
                          {form.watch('lowStockAlertType') === 'percentage' 
                            ? t('products:formLabels.alertThresholdPercent', 'Threshold (%)') 
                            : t('products:formLabels.alertThresholdUnits', 'Threshold (Units)')}
                        </Label>
                        <div className="relative mt-1">
                          <Input
                            type="number"
                            min="0"
                            max={form.watch('lowStockAlertType') === 'percentage' ? 100 : undefined}
                            {...form.register('lowStockAlert')}
                            data-testid="input-low-stock"
                          />
                          {form.watch('lowStockAlertType') === 'percentage' ? (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                          ) : (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{t('products:formLabels.units', 'units')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                      {form.watch('lowStockAlertType') === 'percentage' 
                        ? t('products:formLabels.percentageAlertHint', 'Alert when stock falls below this percentage of max stock')
                        : t('products:formLabels.amountAlertHint', 'Alert when stock falls below this number of units')}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="barcode" className="text-sm font-medium">{t('products:formLabels.barcode')}</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        {...form.register('barcode')}
                        placeholder={t('products:formLabels.barcodePlaceholder')}
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
                            title: t('products:toasts.scannerReady'),
                            description: t('products:toasts.scannerReadyDescription'),
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
                  
                  {/* Product Locations */}
                  <div className="pt-2">
                    {isEditMode && product ? (
                      <ProductLocations productId={id!} />
                    ) : (
                      <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-3">
                          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                              {t('products:warehouseLocations.title')}
                            </h4>
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              {t('products:warehouseLocations.infoMessage')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
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
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t('products:formSections.pricing.title')}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('products:formSections.pricing.description')}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4 pt-2">
                  {/* Sales Prices */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">{t('products:formLabels.salesPrices')}</Label>
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
                          onChange={(e) => {
                            salesPriceManualRef.current.czk = true;
                            form.register('priceCzk').onChange(e);
                          }}
                          onBlur={(e) => {
                            const value = parseFloat(e.target.value);
                            if (value && value > 0 && !salesPriceManualRef.current.eur) {
                              form.setValue('priceEur', parseFloat(convertCurrency(value, 'CZK', 'EUR').toFixed(2)));
                            }
                          }}
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
                          onChange={(e) => {
                            salesPriceManualRef.current.eur = true;
                            form.register('priceEur').onChange(e);
                          }}
                          onBlur={(e) => {
                            const value = parseFloat(e.target.value);
                            if (value && value > 0 && !salesPriceManualRef.current.czk) {
                              form.setValue('priceCzk', parseFloat(convertCurrency(value, 'EUR', 'CZK').toFixed(2)));
                            }
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {t('products:formLabels.autoConvertHelper')}
                    </p>
                  </div>

                  {/* Wholesale Prices */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">{t('products:formLabels.wholesalePrices')}</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="wholesalePriceCzk" className="text-xs text-slate-500">CZK</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...form.register('wholesalePriceCzk')}
                          placeholder="0.00"
                          data-testid="input-wholesale-price-czk"
                          className="mt-1"
                          onChange={(e) => {
                            wholesalePriceManualRef.current.czk = true;
                            form.register('wholesalePriceCzk').onChange(e);
                          }}
                          onBlur={(e) => {
                            const value = parseFloat(e.target.value);
                            if (value && value > 0 && !wholesalePriceManualRef.current.eur) {
                              form.setValue('wholesalePriceEur', parseFloat(convertCurrency(value, 'CZK', 'EUR').toFixed(2)));
                            }
                          }}
                        />
                      </div>

                      <div>
                        <Label htmlFor="wholesalePriceEur" className="text-xs text-slate-500">EUR</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...form.register('wholesalePriceEur')}
                          placeholder="0.00"
                          data-testid="input-wholesale-price-eur"
                          className="mt-1"
                          onChange={(e) => {
                            wholesalePriceManualRef.current.eur = true;
                            form.register('wholesalePriceEur').onChange(e);
                          }}
                          onBlur={(e) => {
                            const value = parseFloat(e.target.value);
                            if (value && value > 0 && !wholesalePriceManualRef.current.czk) {
                              form.setValue('wholesalePriceCzk', parseFloat(convertCurrency(value, 'EUR', 'CZK').toFixed(2)));
                            }
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {t('products:formLabels.wholesalePriceHelper')}
                    </p>
                  </div>

                  {/* Import Costs */}
                  {canAccessFinancialData && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">{t('products:formLabels.importCosts')}</Label>
                      <div className="grid grid-cols-5 gap-2">
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
                            onInput={(e) => {
                              if (importCostUpdatingRef.current === 'usd') return;
                              const value = parseFloat((e.target as HTMLInputElement).value);
                              if (value && value > 0) {
                                importCostUpdatingRef.current = 'usd';
                                form.setValue('importCostCzk', parseFloat(convertCurrency(value, 'USD', 'CZK').toFixed(2)));
                                form.setValue('importCostEur', parseFloat(convertCurrency(value, 'USD', 'EUR').toFixed(2)));
                                form.setValue('importCostVnd', parseFloat(convertCurrency(value, 'USD', 'VND').toFixed(0)));
                                form.setValue('importCostCny', parseFloat(convertCurrency(value, 'USD', 'CNY').toFixed(2)));
                                setTimeout(() => { importCostUpdatingRef.current = null; }, 0);
                              }
                            }}
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
                            onInput={(e) => {
                              if (importCostUpdatingRef.current === 'czk') return;
                              const value = parseFloat((e.target as HTMLInputElement).value);
                              if (value && value > 0) {
                                importCostUpdatingRef.current = 'czk';
                                form.setValue('importCostUsd', parseFloat(convertCurrency(value, 'CZK', 'USD').toFixed(2)));
                                form.setValue('importCostEur', parseFloat(convertCurrency(value, 'CZK', 'EUR').toFixed(2)));
                                form.setValue('importCostVnd', parseFloat(convertCurrency(value, 'CZK', 'VND').toFixed(0)));
                                form.setValue('importCostCny', parseFloat(convertCurrency(value, 'CZK', 'CNY').toFixed(2)));
                                setTimeout(() => { importCostUpdatingRef.current = null; }, 0);
                              }
                            }}
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
                            onInput={(e) => {
                              if (importCostUpdatingRef.current === 'eur') return;
                              const value = parseFloat((e.target as HTMLInputElement).value);
                              if (value && value > 0) {
                                importCostUpdatingRef.current = 'eur';
                                form.setValue('importCostUsd', parseFloat(convertCurrency(value, 'EUR', 'USD').toFixed(2)));
                                form.setValue('importCostCzk', parseFloat(convertCurrency(value, 'EUR', 'CZK').toFixed(2)));
                                form.setValue('importCostVnd', parseFloat(convertCurrency(value, 'EUR', 'VND').toFixed(0)));
                                form.setValue('importCostCny', parseFloat(convertCurrency(value, 'EUR', 'CNY').toFixed(2)));
                                setTimeout(() => { importCostUpdatingRef.current = null; }, 0);
                              }
                            }}
                          />
                        </div>

                        <div>
                          <Label htmlFor="importCostVnd" className="text-xs text-slate-500">VND</Label>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            {...form.register('importCostVnd')}
                            placeholder="0"
                            data-testid="input-cost-vnd"
                            className="mt-1"
                            onInput={(e) => {
                              if (importCostUpdatingRef.current === 'vnd') return;
                              const value = parseFloat((e.target as HTMLInputElement).value);
                              if (value && value > 0) {
                                importCostUpdatingRef.current = 'vnd';
                                form.setValue('importCostUsd', parseFloat(convertCurrency(value, 'VND', 'USD').toFixed(2)));
                                form.setValue('importCostCzk', parseFloat(convertCurrency(value, 'VND', 'CZK').toFixed(2)));
                                form.setValue('importCostEur', parseFloat(convertCurrency(value, 'VND', 'EUR').toFixed(2)));
                                form.setValue('importCostCny', parseFloat(convertCurrency(value, 'VND', 'CNY').toFixed(2)));
                                setTimeout(() => { importCostUpdatingRef.current = null; }, 0);
                              }
                            }}
                          />
                        </div>

                        <div>
                          <Label htmlFor="importCostCny" className="text-xs text-slate-500">CNY</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...form.register('importCostCny')}
                            placeholder="0.00"
                            data-testid="input-cost-cny"
                            className="mt-1"
                            onInput={(e) => {
                              if (importCostUpdatingRef.current === 'cny') return;
                              const value = parseFloat((e.target as HTMLInputElement).value);
                              if (value && value > 0) {
                                importCostUpdatingRef.current = 'cny';
                                form.setValue('importCostUsd', parseFloat(convertCurrency(value, 'CNY', 'USD').toFixed(2)));
                                form.setValue('importCostCzk', parseFloat(convertCurrency(value, 'CNY', 'CZK').toFixed(2)));
                                form.setValue('importCostEur', parseFloat(convertCurrency(value, 'CNY', 'EUR').toFixed(2)));
                                form.setValue('importCostVnd', parseFloat(convertCurrency(value, 'CNY', 'VND').toFixed(0)));
                                setTimeout(() => { importCostUpdatingRef.current = null; }, 0);
                              }
                            }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {t('products:formLabels.autoConvertRealtime')}
                      </p>
                    </div>
                  )}
                  
                  {/* Edit mode: Cost History Chart */}
                  {canAccessFinancialData && isEditMode && costHistory && costHistory.length > 0 && (
                    <div className="pt-2">
                      <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-amber-600" />
                        {t('products:costHistory')}
                      </Label>
                      <CostHistoryChart data={costHistory} />
                    </div>
                  )}
                  
                  {/* Tiered Pricing */}
                  <div className="pt-2">
                    {isEditMode ? (
                      <>
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-amber-600" />
                          {t('products:tieredPricing.title')}
                        </Label>
                        <Dialog open={tieredPricingDialogOpen} onOpenChange={setTieredPricingDialogOpen}>
                          <DialogTrigger asChild>
                            <Button type="button" size="sm" variant="outline" data-testid="button-add-tier">
                              <Plus className="h-4 w-4 mr-1" />
                              {t('products:tieredPricing.addTier')}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                              <DialogTitle>{editingTier ? t('common:edit') : t('common:add')} {t('products:tieredPricing.title')}</DialogTitle>
                              <DialogDescription>
                                {t('products:tieredPricing.dialogDescription')}
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={tierForm.handleSubmit(onTierSubmit)} className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="minQuantity">{t('products:tieredPricing.minQuantity')} *</Label>
                                  <Input
                                    type="number"
                                    {...tierForm.register('minQuantity')}
                                    placeholder="1"
                                    data-testid="input-tier-min-qty"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="maxQuantity">{t('products:tieredPricing.maxQuantity')}</Label>
                                  <Input
                                    type="number"
                                    {...tierForm.register('maxQuantity')}
                                    placeholder="999"
                                    data-testid="input-tier-max-qty"
                                  />
                                </div>
                              </div>
                              
                              <div>
                                <Label htmlFor="priceType">{t('products:tieredPricing.priceType')}</Label>
                                <Select value={tierForm.watch('priceType')} onValueChange={(value) => tierForm.setValue('priceType', value as 'tiered' | 'wholesale')}>
                                  <SelectTrigger data-testid="select-tier-type">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="tiered">{t('products:tieredPricing.tiered')}</SelectItem>
                                    <SelectItem value="wholesale">{t('products:tieredPricing.wholesale')}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">{t('products:pricing.czk')}</Label>
                                  <Input 
                                    type="number" 
                                    step="0.01" 
                                    {...tierForm.register('priceCzk')} 
                                    placeholder="0.00" 
                                    data-testid="input-tier-czk"
                                    onChange={(e) => {
                                      tierPriceManualRef.current.czk = true;
                                      tierForm.register('priceCzk').onChange(e);
                                    }}
                                    onBlur={(e) => {
                                      const value = parseFloat(e.target.value);
                                      if (value && value > 0 && !tierPriceManualRef.current.eur) {
                                        tierForm.setValue('priceEur', parseFloat(convertCurrency(value, 'CZK', 'EUR').toFixed(2)));
                                      }
                                    }}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">{t('products:pricing.eur')}</Label>
                                  <Input 
                                    type="number" 
                                    step="0.01" 
                                    {...tierForm.register('priceEur')} 
                                    placeholder="0.00" 
                                    data-testid="input-tier-eur"
                                    onChange={(e) => {
                                      tierPriceManualRef.current.eur = true;
                                      tierForm.register('priceEur').onChange(e);
                                    }}
                                    onBlur={(e) => {
                                      const value = parseFloat(e.target.value);
                                      if (value && value > 0 && !tierPriceManualRef.current.czk) {
                                        tierForm.setValue('priceCzk', parseFloat(convertCurrency(value, 'EUR', 'CZK').toFixed(2)));
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {t('products:pricing.autoConvertHelper')}
                              </p>
                              
                              <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setTieredPricingDialogOpen(false)} data-testid="button-cancel-tier">
                                  {t('common:cancel')}
                                </Button>
                                <Button type="submit" data-testid="button-save-tier">
                                  {editingTier ? t('products:tieredPricing.updateButton') : t('products:tieredPricing.addButton')}
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
                                    <Badge variant="outline">{tier.priceType === 'wholesale' ? t('products:wholesale') : t('products:tiered')}</Badge>
                                    <span className="text-sm font-medium">
                                      {tier.minQuantity}{tier.maxQuantity ? ` - ${tier.maxQuantity}` : '+'} {t('products:tieredPricing.units')}
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex gap-2 flex-wrap">
                                    {tier.priceCzk && <span>{t('products:pricing.czk')} {parseFloat(tier.priceCzk).toFixed(2)}</span>}
                                    {tier.priceEur && <span>{t('products:pricing.eur')} {parseFloat(tier.priceEur).toFixed(2)}</span>}
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
                                        <AlertDialogTitle>{t('products:deleteTieredPrice')}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          {t('common:confirmDelete')}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteTieredPricingMutation.mutate(tier.id)}>
                                          {t('common:delete')}
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
                        <p className="text-xs text-slate-500 text-center py-4">{t('products:noTieredPricing')}</p>
                      )}
                      </>
                    ) : (
                      <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                        <div className="flex items-start gap-3">
                          <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                              {t('products:tieredPricing.title')}
                            </h4>
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                              {t('products:tieredPricing.dialogDescription')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
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
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t('products:supplierSection')}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('products:supplierSectionDesc')}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4 pt-2">
                  {/* Supplier Selector */}
                  <div>
                    <Label htmlFor="supplierId" className="text-sm font-medium">{t('products:selectSupplier')}</Label>
                    <Popover open={supplierPopoverOpen} onOpenChange={setSupplierPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={supplierPopoverOpen}
                          className="w-full justify-between mt-1"
                          data-testid="select-supplier"
                        >
                          {supplierId
                            ? suppliers?.find((supplier: any) => supplier.id === supplierId)?.name
                            : t('selectASupplier')}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder={t('searchSuppliersPlaceholder')} />
                          <CommandEmpty>
                            <div className="p-4 text-center space-y-2">
                              <p className="text-sm text-slate-500">{t('noSupplierFound')}</p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSupplierPopoverOpen(false);
                                  setAddSupplierDialogOpen(true);
                                }}
                                data-testid="button-add-supplier"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                {t('addNewSupplier')}
                              </Button>
                            </div>
                          </CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-auto">
                            {suppliers?.map((supplier: any) => (
                              <CommandItem
                                key={supplier.id}
                                value={supplier.name}
                                onSelect={() => {
                                  form.setValue('supplierId', supplier.id);
                                  setSupplierPopoverOpen(false);
                                }}
                                data-testid={`supplier-option-${supplier.id}`}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    supplierId === supplier.id ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                {supplier.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Selected Supplier Details */}
                  {(() => {
                    if (!selectedSupplier) {
                      return (
                        <div className="text-center py-8 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                          <Building className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-sm text-slate-500 dark:text-slate-400">{t('products:noSupplierSelected')}</p>
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
                                  <p className="text-xs text-slate-600 dark:text-slate-400">{t('products:contactPerson')}</p>
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
                                  <p className="text-xs text-slate-600 dark:text-slate-400">{t('products:supplierDetails.email')}</p>
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
                                  <p className="text-xs text-slate-600 dark:text-slate-400">{t('products:supplierDetails.phone')}</p>
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
                                  <p className="text-xs text-slate-600 dark:text-slate-400">{t('products:supplierDetails.country')}</p>
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
                                  <p className="text-xs text-slate-600 dark:text-slate-400">{t('products:supplierDetails.website')}</p>
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
                                  <p className="text-xs text-slate-600 dark:text-slate-400">{t('products:supplierLink')}</p>
                                  <a 
                                    href={selectedSupplier.supplierLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                                    data-testid="link-supplier-link"
                                  >
                                    {t('products:supplierDetails.viewLink')}
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
                                  <p className="text-xs text-slate-600 dark:text-slate-400">{t('products:supplierDetails.address')}</p>
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
                    {supplierId && (
                      <Link href={`/suppliers/${supplierId}`}>
                        <Button type="button" variant="outline" size="sm" data-testid="button-view-supplier">
                          <Building className="h-4 w-4 mr-2" />
                          {t('products:supplierDetails.viewSupplierDetails')}
                        </Button>
                      </Link>
                    )}
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setAddSupplierDialogOpen(true)}
                      data-testid="button-add-new-supplier"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('products:addNewSupplier')}
                    </Button>
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
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t('products:variantsSection')}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('products:variantsSectionDesc')}</p>
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
                          {t('products:addVariant')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{t('products:addProductVariant')}</DialogTitle>
                          <DialogDescription>{t('products:addNewProductVariation')}</DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="variant-name">{t('products:variantName')} *</Label>
                            <Input
                              id="variant-name"
                              value={newVariant.name}
                              onChange={(e) => setNewVariant((prev) => ({ ...prev, name: e.target.value }))}
                              placeholder={t('products:enterVariantName')}
                              data-testid="input-variant-name"
                            />
                          </div>
                          
                          {/* Image Upload */}
                          <div>
                            <Label>{t('products:variantImage')}</Label>
                            <div className="mt-2">
                              {newVariantImagePreview ? (
                                <div className="relative w-32 h-32 rounded border bg-slate-50 dark:bg-slate-800 overflow-hidden group">
                                  <img
                                    src={newVariantImagePreview}
                                    alt={t('products:variantImage')}
                                    className="w-full h-full object-contain bg-slate-50 dark:bg-slate-900"
                                  />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <label className="cursor-pointer">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            setNewVariantImageFile(file);
                                            setNewVariantImagePreview(URL.createObjectURL(file));
                                          }
                                        }}
                                        data-testid="input-variant-image-dialog"
                                      />
                                      <Edit className="h-4 w-4 text-white" />
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (newVariantImagePreview) {
                                          URL.revokeObjectURL(newVariantImagePreview);
                                        }
                                        setNewVariantImageFile(null);
                                        setNewVariantImagePreview(null);
                                      }}
                                      className="text-white"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <label className="flex items-center justify-center w-32 h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        setNewVariantImageFile(file);
                                        setNewVariantImagePreview(URL.createObjectURL(file));
                                      }
                                    }}
                                    data-testid="input-variant-image-dialog"
                                  />
                                  <div className="text-center">
                                    <ImageIcon className="h-8 w-8 mx-auto text-slate-400" />
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('products:uploadVariantImage')}</p>
                                  </div>
                                </label>
                              )}
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor="variant-barcode">{t('products:barcode')}</Label>
                            <div className="relative">
                              <Input
                                id="variant-barcode"
                                value={newVariant.barcode}
                                onChange={(e) => setNewVariant((prev) => ({ ...prev, barcode: e.target.value }))}
                                placeholder={t('products:enterBarcode')}
                                className="pr-10"
                                data-testid="input-variant-barcode"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full"
                                onClick={() => {
                                  const input = document.getElementById('variant-barcode') as HTMLInputElement;
                                  if (input) {
                                    input.focus();
                                  }
                                }}
                                data-testid="button-scan-variant-barcode"
                              >
                                <Barcode className="h-4 w-4 text-slate-500" />
                              </Button>
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor="variant-quantity">{t('products:variantQuantity')}</Label>
                            <Input
                              id="variant-quantity"
                              type="number"
                              min="0"
                              value={newVariant.quantity}
                              onChange={(e) => setNewVariant((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                              placeholder={t('products:enterQuantity')}
                              data-testid="input-variant-quantity"
                            />
                          </div>
                          
                          <Separator />
                          
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm font-medium">{t('products:variants.variantPriceOptional')}</Label>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {t('products:variants.variantPriceHelper')}
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor="variant-price-czk" className="text-xs">{t('products:variants.priceCzk')}</Label>
                                <Input
                                  id="variant-price-czk"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={newVariant.priceCzk}
                                  onChange={(e) => setNewVariant((prev) => ({ ...prev, priceCzk: e.target.value }))}
                                  placeholder={t('products:variants.optional')}
                                  data-testid="input-variant-price-czk"
                                />
                              </div>
                              <div>
                                <Label htmlFor="variant-price-eur" className="text-xs">{t('products:variants.priceEur')}</Label>
                                <Input
                                  id="variant-price-eur"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={newVariant.priceEur}
                                  onChange={(e) => setNewVariant((prev) => ({ ...prev, priceEur: e.target.value }))}
                                  placeholder={t('products:variants.optional')}
                                  data-testid="input-variant-price-eur"
                                />
                              </div>
                            </div>
                          </div>
                          
                          {canAccessFinancialData && (
                            <>
                              <Separator />
                              
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-sm font-medium">{t('products:variants.variantImportCostOptional')}</Label>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {t('products:variants.variantImportCostHelper')}
                                  </p>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-3">
                                  <div>
                                    <Label htmlFor="variant-cost-usd" className="text-xs">{t('products:variants.importCostUsd')}</Label>
                                    <Input
                                      id="variant-cost-usd"
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={newVariant.importCostUsd}
                                      onChange={(e) => setNewVariant((prev) => ({ ...prev, importCostUsd: e.target.value }))}
                                      placeholder={t('products:variants.optional')}
                                      data-testid="input-variant-cost-usd"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="variant-cost-czk" className="text-xs">{t('products:variants.importCostCzk')}</Label>
                                    <Input
                                      id="variant-cost-czk"
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={newVariant.importCostCzk}
                                      onChange={(e) => setNewVariant((prev) => ({ ...prev, importCostCzk: e.target.value }))}
                                      placeholder={t('products:variants.optional')}
                                      data-testid="input-variant-cost-czk"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="variant-cost-eur" className="text-xs">{t('products:variants.importCostEur')}</Label>
                                    <Input
                                      id="variant-cost-eur"
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={newVariant.importCostEur}
                                      onChange={(e) => setNewVariant((prev) => ({ ...prev, importCostEur: e.target.value }))}
                                      placeholder={t('products:variants.optional')}
                                      data-testid="input-variant-cost-eur"
                                    />
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                          
                          <Button 
                            onClick={addVariant} 
                            disabled={!newVariant.name.trim() || newVariantImageUploading} 
                            className="w-full" 
                            data-testid="button-save-variant"
                          >
                            {newVariantImageUploading ? t('products:variants.uploadingImage') : t('products:variants.addVariantButton')}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Dialog open={isSeriesDialogOpen} onOpenChange={setIsSeriesDialogOpen}>
                      <DialogTrigger asChild>
                        <Button type="button" size="sm" variant="outline" data-testid="button-add-series">
                          <ListPlus className="h-4 w-4 mr-2" />
                          {t('products:variants.addSeriesButton')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>{t('products:variants.addSeriesTitle')}</DialogTitle>
                          <DialogDescription>
                            {t('products:variants.addSeriesDescription')}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="series-pattern">{t('products:variants.seriesPattern')} *</Label>
                            <Input
                              id="series-pattern"
                              value={seriesInput}
                              onChange={(e) => setSeriesInput(e.target.value)}
                              placeholder={t('products:variants.seriesPatternPlaceholder')}
                              data-testid="input-series-pattern"
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {t('products:variants.seriesPatternHelp')}
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="series-quantity">{t('products:variants.quantityPerVariant')}</Label>
                              <Input
                                id="series-quantity"
                                type="number"
                                min="0"
                                value={seriesQuantity}
                                onChange={(e) => setSeriesQuantity(parseInt(e.target.value) || 0)}
                                placeholder={t('products:enterQuantity')}
                                data-testid="input-series-quantity"
                              />
                            </div>
                          </div>
                          
                          <Separator />
                          
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm font-medium">{t('products:variants.variantPriceOptional')}</Label>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {t('products:variants.variantPriceHelper')}
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor="series-price-czk" className="text-xs">{t('products:variants.priceCzk')}</Label>
                                <Input
                                  id="series-price-czk"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={seriesPriceCzk}
                                  onChange={(e) => setSeriesPriceCzk(e.target.value)}
                                  placeholder={t('products:variants.optional')}
                                  data-testid="input-series-price-czk"
                                />
                              </div>
                              <div>
                                <Label htmlFor="series-price-eur" className="text-xs">{t('products:variants.priceEur')}</Label>
                                <Input
                                  id="series-price-eur"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={seriesPriceEur}
                                  onChange={(e) => setSeriesPriceEur(e.target.value)}
                                  placeholder={t('products:variants.optional')}
                                  data-testid="input-series-price-eur"
                                />
                              </div>
                            </div>
                          </div>
                          
                          {canAccessFinancialData && (
                            <>
                              <Separator />
                              
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-sm font-medium">{t('products:variants.variantImportCostOptional')}</Label>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {t('products:variants.variantImportCostHelper')}
                                  </p>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-3">
                                  <div>
                                    <Label htmlFor="series-cost-usd" className="text-xs">{t('products:variants.importCostUsd')}</Label>
                                    <Input
                                      id="series-cost-usd"
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={seriesImportCostUsd}
                                      onChange={(e) => setSeriesImportCostUsd(e.target.value)}
                                      placeholder={t('products:variants.optional')}
                                      data-testid="input-series-cost-usd"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="series-cost-czk" className="text-xs">{t('products:variants.importCostCzk')}</Label>
                                    <Input
                                      id="series-cost-czk"
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={seriesImportCostCzk}
                                      onChange={(e) => setSeriesImportCostCzk(e.target.value)}
                                      placeholder={t('products:variants.optional')}
                                      data-testid="input-series-cost-czk"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="series-cost-eur" className="text-xs">{t('products:variants.importCostEur')}</Label>
                                    <Input
                                      id="series-cost-eur"
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={seriesImportCostEur}
                                      onChange={(e) => setSeriesImportCostEur(e.target.value)}
                                      placeholder={t('products:variants.optional')}
                                      data-testid="input-series-cost-eur"
                                    />
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                          
                          <Button 
                            onClick={addVariantSeries} 
                            disabled={!seriesInput.trim()} 
                            className="w-full"
                            data-testid="button-save-series"
                          >
                            {t('products:variants.addVariantSeriesButton')}
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
                      {t('products:variants.bulkScanBarcodesButton')}
                    </Button>
                    
                    {selectedVariants.length > 0 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" variant="destructive" size="sm" data-testid="button-delete-selected">
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('products:variants.deleteSelected')} ({selectedVariants.length})
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('products:variants.deleteVariantsTitle')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('products:variants.deleteVariantsConfirm', { count: selectedVariants.length })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={bulkDeleteVariants}>{t('common:delete')}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>

                  {/* Variants Table */}
                  {variants.length > 0 ? (
                    <div className="border rounded-lg overflow-x-auto">
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
                            <TableHead className="w-20">{t('products:variants.tableHeaders.image')}</TableHead>
                            <TableHead>{t('products:variants.tableHeaders.name')}</TableHead>
                            <TableHead className="text-right">{t('products:variants.tableHeaders.barcode')}</TableHead>
                            <TableHead className="w-24 text-right">{t('products:variants.tableHeaders.quantity')}</TableHead>
                            <TableHead className="w-28 text-right">{t('products:variants.tableHeaders.priceCzk')}</TableHead>
                            <TableHead className="w-28 text-right">{t('products:variants.tableHeaders.priceEur')}</TableHead>
                            {canAccessFinancialData && <TableHead className="w-28 text-right">{t('products:variants.tableHeaders.importCostUsd')}</TableHead>}
                            {canAccessFinancialData && <TableHead className="w-28 text-right">{t('products:variants.tableHeaders.importCostCzk')}</TableHead>}
                            {canAccessFinancialData && <TableHead className="w-28 text-right">{t('products:variants.tableHeaders.importCostEur')}</TableHead>}
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
                                <div className="relative w-16 h-16 rounded border bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden group">
                                  {variant.imageUrl ? (
                                    <>
                                      <img
                                        src={variant.imageUrl}
                                        alt={variant.name}
                                        className="w-full h-full object-contain bg-slate-50 dark:bg-slate-900"
                                      />
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                        <label className="cursor-pointer">
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) handleVariantImageUpload(variant.id, file);
                                            }}
                                            data-testid={`input-variant-image-${variant.id}`}
                                          />
                                          <Edit className="h-4 w-4 text-white" />
                                        </label>
                                        <button
                                          type="button"
                                          onClick={() => handleVariantImageRemove(variant.id)}
                                          className="text-white"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <label className="cursor-pointer w-full h-full flex items-center justify-center">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleVariantImageUpload(variant.id, file);
                                        }}
                                        data-testid={`input-variant-image-${variant.id}`}
                                      />
                                      {variantImageLoading[variant.id] ? (
                                        <div className="animate-spin">⏳</div>
                                      ) : (
                                        <ImageIcon className="h-6 w-6 text-slate-400" />
                                      )}
                                    </label>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={variant.name}
                                  onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                                  className="h-8 min-w-[150px]"
                                  data-testid={`input-variant-name-${variant.id}`}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  value={variant.barcode}
                                  onChange={(e) => updateVariant(variant.id, 'barcode', e.target.value)}
                                  className="h-8 font-mono min-w-[120px] text-right"
                                  placeholder={t('scanOrEnter')}
                                  data-testid={`input-variant-barcode-${variant.id}`}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  value={variant.quantity}
                                  onChange={(e) => updateVariant(variant.id, 'quantity', parseInt(e.target.value) || 0)}
                                  className="h-8 text-right [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                  style={{ MozAppearance: 'textfield' } as any}
                                  data-testid={`input-variant-quantity-${variant.id}`}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={variant.priceCzk}
                                  onChange={(e) => updateVariant(variant.id, 'priceCzk', e.target.value)}
                                  className="h-8 text-right [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                  style={{ MozAppearance: 'textfield' } as any}
                                  placeholder="0.00"
                                  data-testid={`input-variant-price-czk-${variant.id}`}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={variant.priceEur}
                                  onChange={(e) => updateVariant(variant.id, 'priceEur', e.target.value)}
                                  className="h-8 text-right [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                  style={{ MozAppearance: 'textfield' } as any}
                                  placeholder="0.00"
                                  data-testid={`input-variant-price-eur-${variant.id}`}
                                />
                              </TableCell>
                              {canAccessFinancialData && (
                                <TableCell className="text-right">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={variant.importCostUsd}
                                    onChange={(e) => updateVariant(variant.id, 'importCostUsd', e.target.value)}
                                    className="h-8 text-right [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    style={{ MozAppearance: 'textfield' } as any}
                                    placeholder="0.00"
                                    data-testid={`input-variant-cost-usd-${variant.id}`}
                                  />
                                </TableCell>
                              )}
                              {canAccessFinancialData && (
                                <TableCell className="text-right">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={variant.importCostCzk}
                                    onChange={(e) => updateVariant(variant.id, 'importCostCzk', e.target.value)}
                                    className="h-8 text-right [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    style={{ MozAppearance: 'textfield' } as any}
                                    placeholder="0.00"
                                    data-testid={`input-variant-cost-czk-${variant.id}`}
                                  />
                                </TableCell>
                              )}
                              {canAccessFinancialData && (
                                <TableCell className="text-right">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={variant.importCostEur}
                                    onChange={(e) => updateVariant(variant.id, 'importCostEur', e.target.value)}
                                    className="h-8 text-right [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    style={{ MozAppearance: 'textfield' } as any}
                                    placeholder="0.00"
                                    data-testid={`input-variant-cost-eur-${variant.id}`}
                                  />
                                </TableCell>
                              )}
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
                      <p className="text-sm text-slate-600 dark:text-slate-400">{t('products:variants.noVariants')}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{t('products:variants.noVariantsHelper')}</p>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Packaging & Units - Only show if needed */}
            <AccordionItem value="units" className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
                    <Layers className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t('products:units.title', 'Packaging & Units')}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('products:units.description', 'Configure selling and bulk units for inventory and purchasing')}</p>
                  </div>
                  {form.watch('bulkUnitName') && (
                    <Badge variant="secondary" className="ml-auto bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300">
                      {t('products:units.bulkConfigured', 'Bulk configured')}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-6 pt-2">
                  {/* Selling Unit */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Box className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('products:units.sellingUnit', 'Selling Unit')}</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="sellingUnitName" className="text-sm font-medium">{t('products:units.sellingUnitName', 'Unit Name')}</Label>
                        <Select
                          value={form.watch('sellingUnitName') || 'piece'}
                          onValueChange={(value) => form.setValue('sellingUnitName', value)}
                        >
                          <SelectTrigger className="mt-1" data-testid="select-selling-unit">
                            <SelectValue placeholder={t('products:units.selectUnit', 'Select unit')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="piece">{t('products:units.unitPiece', 'Piece')}</SelectItem>
                            <SelectItem value="box">{t('products:units.unitBox', 'Box')}</SelectItem>
                            <SelectItem value="jar">{t('products:units.unitJar', 'Jar')}</SelectItem>
                            <SelectItem value="bottle">{t('products:units.unitBottle', 'Bottle')}</SelectItem>
                            <SelectItem value="pack">{t('products:units.unitPack', 'Pack')}</SelectItem>
                            <SelectItem value="set">{t('products:units.unitSet', 'Set')}</SelectItem>
                            <SelectItem value="pair">{t('products:units.unitPair', 'Pair')}</SelectItem>
                            <SelectItem value="tube">{t('products:units.unitTube', 'Tube')}</SelectItem>
                            <SelectItem value="bag">{t('products:units.unitBag', 'Bag')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">{t('products:units.sellingUnitHelp', 'The base unit used for inventory tracking and sales')}</p>
                      </div>
                      <div>
                        <Label htmlFor="unitContentsInfo" className="text-sm font-medium">{t('products:units.unitContentsInfo', 'Unit Contents (optional)')}</Label>
                        <Input 
                          {...form.register('unitContentsInfo')} 
                          placeholder={t('products:units.unitContentsPlaceholder', 'e.g., 12 packs of 10 tablets')}
                          className="mt-1"
                          data-testid="input-unit-contents"
                        />
                        <p className="text-xs text-muted-foreground mt-1">{t('products:units.unitContentsHelp', 'Additional info about what the unit contains')}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Bulk Unit (Optional) */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('products:units.bulkUnit', 'Bulk Unit (Optional)')}</h4>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">{t('products:units.bulkUnitHelp', 'Configure a larger unit for purchasing (e.g., cartons containing multiple boxes)')}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="bulkUnitName" className="text-sm font-medium">{t('products:units.bulkUnitName', 'Bulk Unit Name')}</Label>
                        <Select
                          value={form.watch('bulkUnitName') || ''}
                          onValueChange={(value) => form.setValue('bulkUnitName', value === 'none' ? '' : value)}
                        >
                          <SelectTrigger className="mt-1" data-testid="select-bulk-unit">
                            <SelectValue placeholder={t('products:units.noBulkUnit', 'No bulk unit')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t('products:units.noBulkUnit', 'No bulk unit')}</SelectItem>
                            {(inventorySettings?.bulkUnits || DEFAULT_BULK_UNITS)
                              .filter(bu => bu.enabled)
                              .map(bu => (
                                <SelectItem key={bu.value} value={bu.value}>
                                  {t(`products:units.${bu.labelKey}`, bu.value.replace(/_/g, ' '))}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {form.watch('bulkUnitName') && (
                        <>
                          <div>
                            <Label htmlFor="bulkUnitQty" className="text-sm font-medium">{t('products:units.bulkUnitQty', 'Qty per Bulk Unit')}</Label>
                            <Input 
                              type="number"
                              min="1"
                              {...form.register('bulkUnitQty')} 
                              placeholder="50"
                              className="mt-1"
                              data-testid="input-bulk-qty"
                            />
                          </div>
                          <div className="flex items-end">
                            {form.watch('bulkUnitQty') && (
                              <div className="bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-800 rounded-lg px-3 py-2 w-full">
                                <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300">
                                  1 {form.watch('bulkUnitName')} = {form.watch('bulkUnitQty')} {form.watch('sellingUnitName') || 'pieces'}
                                </p>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Bulk Pricing & Sales Options */}
                    {form.watch('bulkUnitName') && form.watch('bulkUnitQty') && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="bulkPriceCzk" className="text-sm font-medium">{t('products:units.bulkPriceCzk', 'Bulk Price (CZK)')}</Label>
                            <div className="relative mt-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{t('common:currencyCzk')}</span>
                              <Input 
                                type="number"
                                step="0.01"
                                min="0"
                                {...form.register('bulkPriceCzk')} 
                                placeholder="0.00"
                                className="pl-10"
                                data-testid="input-bulk-price-czk"
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  form.setValue('bulkPriceCzk', value);
                                  if (!isNaN(value) && value > 0) {
                                    form.setValue('bulkPriceEur', parseFloat(convertCurrency(value, 'CZK', 'EUR').toFixed(2)));
                                  }
                                }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{t('products:units.bulkPriceHelp', 'Optional special price per bulk unit')}</p>
                          </div>
                          <div>
                            <Label htmlFor="bulkPriceEur" className="text-sm font-medium">{t('products:units.bulkPriceEur', 'Bulk Price (EUR)')}</Label>
                            <div className="relative mt-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{t('common:currencyEur')}</span>
                              <Input 
                                type="number"
                                step="0.01"
                                min="0"
                                {...form.register('bulkPriceEur')} 
                                placeholder="0.00"
                                className="pl-8"
                                data-testid="input-bulk-price-eur"
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  form.setValue('bulkPriceEur', value);
                                  if (!isNaN(value) && value > 0) {
                                    form.setValue('bulkPriceCzk', parseFloat(convertCurrency(value, 'EUR', 'CZK').toFixed(2)));
                                  }
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-3 pt-6">
                            <Checkbox 
                              id="allowBulkSales"
                              checked={form.watch('allowBulkSales') || false}
                              onCheckedChange={(checked) => form.setValue('allowBulkSales', !!checked)}
                              data-testid="checkbox-allow-bulk-sales"
                            />
                            <div>
                              <Label htmlFor="allowBulkSales" className="text-sm font-medium cursor-pointer">{t('products:units.allowBulkSales', 'Allow bulk sales')}</Label>
                              <p className="text-xs text-muted-foreground">{t('products:units.allowBulkSalesHelp', 'Enable bulk unit option in orders/POS')}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
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
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t('products:packing.title')}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('products:packing.description')}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-6 pt-2">
                  {/* Physical Specifications */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Ruler className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('products:packing.physicalSpecifications')}</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <Label htmlFor="length" className="text-sm font-medium">{t('products:packing.lengthCm')}</Label>
                        <Input type="number" step="0.1" min="0" {...form.register('length')} placeholder="0.0" data-testid="input-length" className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="width" className="text-sm font-medium">{t('products:packing.widthCm')}</Label>
                        <Input type="number" step="0.1" min="0" {...form.register('width')} placeholder="0.0" data-testid="input-width" className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="height" className="text-sm font-medium">{t('products:packing.heightCm')}</Label>
                        <Input type="number" step="0.1" min="0" {...form.register('height')} placeholder="0.0" data-testid="input-height" className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="weight" className="text-sm font-medium">{t('products:packing.weightKg')}</Label>
                        <Input type="number" step="0.001" min="0" {...form.register('weight')} placeholder="0.000" data-testid="input-weight" className="mt-1" />
                      </div>
                    </div>
                  </div>

                  {/* Packing Materials */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('products:packing.packingMaterials')}</h4>
                    </div>
                    <PackingMaterialsSelector
                      packingMaterials={packingMaterials}
                      onPackingMaterialsChange={setPackingMaterials}
                      availableMaterials={availablePackingMaterials}
                    />
                  </div>

                  {/* Separator */}
                  <Separator />

                  {/* Handling Instructions */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <PackageOpen className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('products:packing.handlingInstructions')}</h4>
                    </div>
                    <PackingInstructionsUploader
                      packingInstructionsTexts={packingInstructionsTexts}
                      onTextsChange={setPackingInstructionsTexts}
                      packingInstructionsImages={packingInstructionsImages}
                      onImagesChange={setPackingInstructionsImages}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Product Files & Documents */}
            <AccordionItem value="files" className="bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg">
                    <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t('products:files.title')}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('products:files.description')}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="pt-2">
                  {isEditMode && product ? (
                    <ProductFiles productId={id!} />
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                            {t('products:files.filesTitle')}
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {t('products:files.filesDescription')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Dev-Only Form Errors Display */}
          {import.meta.env.DEV && Object.keys(form.formState.errors).length > 0 && (
            <div className="max-w-7xl mx-auto px-4 pb-4">
              <Accordion type="single" collapsible>
                <AccordionItem value="form-errors" className="border border-red-200 dark:border-red-800 rounded-lg">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {t('products:formErrors.title')} ({Object.keys(form.formState.errors).length})
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-3">
                    <Alert variant="destructive" className="mb-0">
                      <AlertDescription>
                        <div className="space-y-1 text-xs font-mono">
                          {Object.entries(form.formState.errors).map(([field, error]) => (
                            <div key={field} className="flex gap-2">
                              <span className="font-bold">{field}:</span>
                              <span>{error?.message?.toString() || t('products:formErrors.invalidValue')}</span>
                            </div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}

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
                {isPending ? (isEditMode ? t('products:submit.updating') : t('products:submit.creating')) : submitButtonText}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="sm:w-32 h-12" 
                onClick={() => setLocation('/inventory')}
                data-testid="button-cancel"
              >
                {t('products:submit.cancel')}
              </Button>
            </div>
          </div>

          {/* Bulk Scan Dialog */}
          <Dialog open={isBulkScanDialogOpen} onOpenChange={setIsBulkScanDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{t('products:bulkScan.title')}</DialogTitle>
                <DialogDescription>
                  {t('products:bulkScan.description')}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulk-barcodes">{t('products:bulkScan.scannedBarcodes')}</Label>
                  <Textarea
                    id="bulk-barcodes"
                    value={bulkBarcodes}
                    onChange={(e) => setBulkBarcodes(e.target.value)}
                    placeholder={t('products:bulkScan.placeholder')}
                    rows={10}
                    className="font-mono text-sm"
                    data-testid="input-bulk-barcodes"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    {t('products:bulkScan.helperText')}
                  </p>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="text-slate-600 dark:text-slate-400">
                    <span className="font-medium">{variants.filter(v => !v.barcode).length}</span> {t('products:bulkScan.variantsWithoutBarcodes')}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
                    <span className="font-medium">{bulkBarcodes.split('\n').filter(b => b.trim()).length}</span> {t('products:bulkScan.barcodesEntered')}
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setIsScanning(true);
                    toast({
                      title: t('products:bulkScan.scannerReady'),
                      description: t('products:bulkScan.scannerReadyDescription'),
                    });
                    setTimeout(() => {
                      setIsScanning(false);
                    }, 3000);
                  }}
                  disabled={isScanning}
                  data-testid="button-start-scanning"
                >
                  <Barcode className="h-4 w-4 mr-2" />
                  {isScanning ? t('products:bulkScan.scanning') : t('products:bulkScan.startScanning')}
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
                  {t('common:cancel')}
                </Button>
                <Button
                  type="button"
                  onClick={handleBulkBarcodeAssign}
                  disabled={!bulkBarcodes.trim() || variants.filter(v => !v.barcode).length === 0}
                  data-testid="button-assign-barcodes"
                >
                  {t('products:bulkScan.assignBarcodes')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Inline Supplier Creation Dialog */}
          <Dialog open={addSupplierDialogOpen} onOpenChange={setAddSupplierDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{t('suppliers:addNewSupplier', 'Add New Supplier')}</DialogTitle>
                <DialogDescription>
                  {t('suppliers:createSupplierDescription', 'Create a new supplier and automatically select it.')}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier-name">{t('suppliers:name', 'Supplier Name')} *</Label>
                  <Input
                    id="supplier-name"
                    value={newSupplierData.name}
                    onChange={(e) => setNewSupplierData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={t('suppliers:namePlaceholder', 'Enter supplier name')}
                    data-testid="input-new-supplier-name"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="supplier-email">{t('suppliers:email', 'Email')}</Label>
                    <Input
                      id="supplier-email"
                      type="email"
                      value={newSupplierData.email}
                      onChange={(e) => setNewSupplierData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder={t('suppliers:emailPlaceholder', 'email@example.com')}
                      data-testid="input-new-supplier-email"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="supplier-phone">{t('suppliers:phone', 'Phone')}</Label>
                    <Input
                      id="supplier-phone"
                      value={newSupplierData.phone}
                      onChange={(e) => setNewSupplierData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder={t('suppliers:phonePlaceholder', '+1 234 567 8900')}
                      data-testid="input-new-supplier-phone"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="supplier-contact">{t('suppliers:contactPerson', 'Contact Person')}</Label>
                    <Input
                      id="supplier-contact"
                      value={newSupplierData.contactPerson}
                      onChange={(e) => setNewSupplierData(prev => ({ ...prev, contactPerson: e.target.value }))}
                      placeholder={t('suppliers:contactPersonPlaceholder', 'John Doe')}
                      data-testid="input-new-supplier-contact"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="supplier-country">{t('suppliers:country', 'Country')}</Label>
                    <Input
                      id="supplier-country"
                      value={newSupplierData.country}
                      onChange={(e) => setNewSupplierData(prev => ({ ...prev, country: e.target.value }))}
                      placeholder={t('suppliers:countryPlaceholder', 'Czech Republic')}
                      data-testid="input-new-supplier-country"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="supplier-address">{t('suppliers:address', 'Address')}</Label>
                  <Input
                    id="supplier-address"
                    value={newSupplierData.address}
                    onChange={(e) => setNewSupplierData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder={t('suppliers:addressPlaceholder', 'Street, City, ZIP')}
                    data-testid="input-new-supplier-address"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="supplier-website">{t('suppliers:website', 'Website')}</Label>
                  <Input
                    id="supplier-website"
                    value={newSupplierData.website}
                    onChange={(e) => setNewSupplierData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder={t('suppliers:websitePlaceholder', 'https://example.com')}
                    data-testid="input-new-supplier-website"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddSupplierDialogOpen(false);
                    setNewSupplierData({
                      name: "",
                      email: "",
                      phone: "",
                      country: "",
                      contactPerson: "",
                      address: "",
                      website: "",
                    });
                  }}
                  data-testid="button-cancel-supplier"
                >
                  {t('common:cancel')}
                </Button>
                <Button
                  type="button"
                  onClick={() => createSupplierMutation.mutate(newSupplierData)}
                  disabled={!newSupplierData.name.trim() || createSupplierMutation.isPending}
                  data-testid="button-create-supplier"
                >
                  {createSupplierMutation.isPending ? t('common:creating', 'Creating...') : t('common:create', 'Create')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Image Viewer Dialog */}
          <Dialog open={imageViewerOpen} onOpenChange={setImageViewerOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedImage && IMAGE_PURPOSE_CONFIG[selectedImage.purpose as ImagePurpose]?.label}
                </DialogTitle>
                <DialogDescription>
                  {selectedImage && IMAGE_PURPOSE_CONFIG[selectedImage.purpose as ImagePurpose]?.description}
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-900 rounded-lg p-4">
                {selectedImage && (
                  <img
                    src={selectedImage.preview}
                    alt={t('products:imageViewer.productImageAlt')}
                    className="max-h-[60vh] max-w-full object-contain rounded"
                  />
                )}
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setImageViewerOpen(false)}
                  data-testid="button-close-viewer"
                >
                  {t('products:imageViewer.close')}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (selectedImage) {
                      const link = document.createElement('a');
                      link.href = selectedImage.preview;
                      link.download = `product-${selectedImage.purpose}-image.jpg`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      toast({
                        title: t('products:imageViewer.downloadStarted'),
                        description: t('products:imageViewer.downloadDescription'),
                      });
                    }
                  }}
                  data-testid="button-download-image"
                >
                  <Upload className="h-4 w-4 mr-2 rotate-180" />
                  {t('products:imageViewer.download')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </form>
      </div>
    </div>
  );
}
